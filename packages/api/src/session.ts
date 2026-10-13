import { sign, verify } from "hono/jwt";

const ACCESS_SECONDS = 60 * 60;
const PASSWORD_CHANGE_SECONDS = 15 * 60;

export function signAccessToken(input: { secret: string; userId: string; tokenVersion: number }) {
  return signToken({ ...input, tokenType: "access", seconds: ACCESS_SECONDS });
}

export function signPasswordChangeToken(input: {
  secret: string;
  userId: string;
  tokenVersion: number;
}) {
  return signToken({ ...input, tokenType: "password_change", seconds: PASSWORD_CHANGE_SECONDS });
}

function signToken(input: {
  secret: string;
  userId: string;
  tokenVersion: number;
  tokenType: "access" | "password_change";
  seconds: number;
}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: input.userId,
      tokenVersion: input.tokenVersion,
      tokenType: input.tokenType,
      iat: issuedAt,
      exp: issuedAt + input.seconds,
    },
    input.secret,
    "HS256",
  );
}

export async function readToken(
  token: string,
  secret: string,
): Promise<
  { sub: string; tokenType: "access" | "password_change"; tokenVersion: number } | undefined
> {
  const payload = await verify(token, secret, "HS256");
  const sub = payload.sub;
  const tokenType = payload.tokenType;
  const tokenVersion = payload.tokenVersion;
  if (typeof sub !== "string" || (tokenType !== "access" && tokenType !== "password_change")) {
    return undefined;
  }
  if (typeof tokenVersion !== "number" || !Number.isInteger(tokenVersion)) return undefined;
  return { sub, tokenType, tokenVersion };
}
