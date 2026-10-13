import { ORPCError } from "@orpc/server";

type Issue = {
  message?: string;
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
  keys?: readonly string[];
};

export function validationError(message: string, fields: Record<string, string[]>) {
  return new ORPCError("VALIDATION_ERROR", {
    status: 400,
    message,
    data: { fields },
  });
}

export function unauthenticated(message: string) {
  return new ORPCError("UNAUTHENTICATED", {
    status: 401,
    message,
    data: {},
  });
}

export function notFound(message: string) {
  return new ORPCError("NOT_FOUND", {
    status: 404,
    message,
    data: {},
  });
}

export function forbidden(message: string) {
  return new ORPCError("FORBIDDEN", {
    status: 403,
    message,
    data: {},
  });
}

export function conflict(message: string, field: string) {
  return new ORPCError("CONFLICT", {
    status: 409,
    message,
    data: { field },
  });
}

export function conflictState(message: string) {
  return new ORPCError("CONFLICT", {
    status: 409,
    message,
    data: {},
  });
}

export function rateLimited() {
  return new ORPCError("RATE_LIMITED", {
    status: 429,
    message: "Too many requests",
    data: {},
  });
}

export function encodeErrorBody(error: ORPCError<string, unknown>) {
  const code =
    error.code === "BAD_REQUEST" || error.code === "VALIDATION_ERROR"
      ? "VALIDATION_ERROR"
      : error.code === "INTERNAL_SERVER_ERROR"
        ? "INTERNAL_ERROR"
        : error.code;
  return {
    error: {
      code,
      message: error.message,
      details: detailsFrom(error.data, code),
    },
  };
}

function detailsFrom(data: unknown, code: string) {
  const issues = issuesFrom(data);
  if (issues) return { fields: fieldsFromIssues(issues) };
  if (isFieldDetails(data)) return { fields: data.fields };
  if (code === "VALIDATION_ERROR") return { fields: {} };
  if (data && typeof data === "object") return data;
  return {};
}

function isFieldDetails(data: unknown): data is { fields: Record<string, string[]> } {
  if (!data || typeof data !== "object" || !("fields" in data)) return false;
  const fields = data.fields;
  return Boolean(fields) && typeof fields === "object" && !Array.isArray(fields);
}

function issuesFrom(data: unknown): Issue[] | undefined {
  if (!data || typeof data !== "object" || !("issues" in data)) return undefined;
  const issues = data.issues;
  return Array.isArray(issues) ? (issues as Issue[]) : undefined;
}

function fieldsFromIssues(issues: Issue[]) {
  const fields: Record<string, string[]> = {};
  for (const issue of issues) {
    const message = issue.message ?? "Invalid value";
    for (const name of fieldNames(issue)) {
      const messages = fields[name] ?? [];
      messages.push(message);
      fields[name] = messages;
    }
  }
  return fields;
}

function fieldNames(issue: Issue) {
  if (issue.keys && issue.keys.length > 0) return [...issue.keys];
  const first = issue.path?.[0];
  if (first && typeof first === "object" && "key" in first) return [String(first.key)];
  if (typeof first === "string" || typeof first === "number") return [String(first)];
  return ["input"];
}
