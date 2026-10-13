import { User } from "@honote/db";

import type { Context } from "./context";
import { forbidden, unauthenticated } from "./http-error";
import { o } from "./index";
import { readToken } from "./session";

export const withSession = o.use(async ({ context, next }) => {
  const session = await requireSession(context);
  return next({ context: { user: session.user, tokenType: session.tokenType } });
});

export const authed = withSession.use(async ({ context, next }) => {
  if (context.tokenType === "password_change" || context.user?.mustChangePassword) {
    throw forbidden("Password change required");
  }
  return next();
});

export const admin = authed.use(async ({ context, next }) => {
  if (context.user?.role !== "admin") throw forbidden("Admin access required");
  return next();
});

async function requireSession(context: Context) {
  const header = context.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthenticated("Authentication required");
  const token = header.slice("Bearer ".length).trim();
  let claims: Awaited<ReturnType<typeof readToken>>;
  try {
    claims = await readToken(token, context.jwtSecret);
  } catch {
    throw unauthenticated("Authentication required");
  }
  if (!claims || !/^[a-f0-9]{24}$/i.test(claims.sub))
    throw unauthenticated("Authentication required");
  const user = await User.findById(claims.sub).select("+tokenVersion +mustChangePassword");
  if (!user || user.tokenVersion !== claims.tokenVersion) {
    throw unauthenticated("Authentication required");
  }
  return { user, tokenType: claims.tokenType };
}
