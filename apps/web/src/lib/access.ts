import { redirect } from "@tanstack/react-router";

import { sessionKind } from "@/lib/session";

export function isPublicPostPath(pathname: string) {
  return (
    pathname === "/" ||
    /^\/posts\/[^/]+$/.test(pathname) ||
    /^\/users\/[^/]+\/posts$/.test(pathname)
  );
}

export function requireAccess() {
  const kind = sessionKind();
  if (kind === "password_change") throw redirect({ to: "/password" });
  if (kind !== "access") throw redirect({ to: "/login" });
}
