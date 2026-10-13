const KEY = "honote.session";

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeSession(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

type Claims = { exp: number; tokenType: string; sub: string };

export function clearExpiredSession() {
  const token = localStorage.getItem(KEY);
  if (!token) return;
  const claims = readClaims(token);
  if (!claims || claims.exp * 1000 <= Date.now()) {
    localStorage.removeItem(KEY);
    emit();
  }
}

export function saveSession(token: string) {
  localStorage.setItem(KEY, token);
  emit();
}

export function clearSession() {
  localStorage.removeItem(KEY);
  emit();
}

export function sessionToken() {
  clearExpiredSession();
  return localStorage.getItem(KEY);
}

export function accessUserId() {
  if (typeof localStorage === "undefined") return null;
  const token = sessionToken();
  if (!token) return null;
  const claims = readClaims(token);
  if (!claims || claims.tokenType !== "access") return null;
  return claims.sub;
}

export function sessionKind(): "access" | "password_change" | null {
  const token = sessionToken();
  if (!token) return null;
  return kindOf(token);
}

export function sessionKindSnapshot(): "access" | "password_change" | null {
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem(KEY);
  if (!token) return null;
  const claims = readClaims(token);
  if (!claims || claims.exp * 1000 <= Date.now()) return null;
  return kindFrom(claims.tokenType);
}

function kindOf(token: string) {
  const claims = readClaims(token);
  if (!claims || claims.exp * 1000 <= Date.now()) return null;
  return kindFrom(claims.tokenType);
}

function kindFrom(tokenType: string): "access" | "password_change" | null {
  if (tokenType === "access" || tokenType === "password_change") return tokenType;
  return null;
}

function readClaims(token: string): Claims | undefined {
  const part = token.split(".")[1];
  if (!part) return undefined;
  try {
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: unknown;
      tokenType?: unknown;
      sub?: unknown;
    };
    if (
      typeof json.exp !== "number" ||
      typeof json.tokenType !== "string" ||
      typeof json.sub !== "string"
    ) {
      return undefined;
    }
    return { exp: json.exp, tokenType: json.tokenType, sub: json.sub };
  } catch {
    return undefined;
  }
}
