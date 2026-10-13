import { Input } from "@honote/ui/components/input";
import { Label } from "@honote/ui/components/label";
import { ORPCError } from "@orpc/client";
import type { ReactNode } from "react";
import type { z } from "zod";

const FORM_KEYS = new Set(["form", "input"]);
const GENERIC_MESSAGES = new Set(["Input validation failed", "Invalid input"]);

export type FormMessages = {
  form?: string;
  fields: Record<string, string>;
};

type IssueLike = {
  code?: string;
  message?: string;
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
  keys?: readonly string[];
  errors?: IssueLike[][];
};

export function zodErrors(error: z.ZodError): FormMessages {
  return messagesFrom(error.issues);
}

export function errorMessage(error: unknown) {
  if (error instanceof ORPCError || error instanceof Error) return error.message;
  return "Something went wrong";
}

export function serverErrors(error: unknown): FormMessages {
  const message = errorMessage(error);
  const fields: Record<string, string> = {};
  const formParts: string[] = [];

  if (error instanceof ORPCError && error.data && typeof error.data === "object") {
    const data = error.data as { fields?: unknown; field?: unknown; issues?: unknown };
    assignFieldMap(fields, data.fields);
    if (typeof data.field === "string" && data.field) append(fields, data.field, message);
    if (Array.isArray(data.issues)) {
      const parsed = messagesFrom(data.issues as IssueLike[]);
      merge(fields, parsed.fields);
      if (parsed.form) formParts.push(parsed.form);
    }
  }

  if (!GENERIC_MESSAGES.has(message)) formParts.unshift(message);
  else if (formParts.length === 0 && Object.keys(fields).length === 0) formParts.push(message);

  const form = join(formParts);
  return { form: form || undefined, fields };
}

export function errorText(error: unknown) {
  if (typeof error === "string") return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "";
}

export function FormAlert({
  form,
}: {
  form: {
    Subscribe: (props: {
      selector: (state: { errors: unknown[] }) => unknown[];
      children: (errors: unknown[]) => ReactNode;
    }) => ReactNode | Promise<ReactNode>;
  };
}) {
  return (
    <form.Subscribe selector={(state) => state.errors}>
      {(errors) => {
        const message = join(errors.map(errorText));
        return message ? <p role="alert">{message}</p> : null;
      }}
    </form.Subscribe>
  );
}

type TextControl = {
  name: string;
  state: { value: string; meta: { errors: unknown[] } };
  handleBlur: () => void;
  handleChange: (value: string) => void;
};

export function Field({
  label,
  type = "text",
  autoComplete,
  field,
  children,
}: {
  label: string;
  type?: string;
  autoComplete?: string;
  field: TextControl;
  children?: ReactNode;
}) {
  const message = join(field.state.meta.errors.map(errorText));
  return (
    <div className="grid gap-1">
      <Label htmlFor={field.name}>{label}</Label>
      {children ?? (
        <Input
          id={field.name}
          name={field.name}
          type={type}
          autoComplete={autoComplete}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
        />
      )}
      {message ? <p role="alert">{message}</p> : null}
    </div>
  );
}

function messagesFrom(issues: IssueLike[]): FormMessages {
  const fields: Record<string, string> = {};
  const formParts: string[] = [];
  for (const issue of flattenIssues(issues)) {
    const message = issue.message ?? "Invalid value";
    const keys = issueKeys(issue);
    if (keys.every((key) => FORM_KEYS.has(key))) {
      formParts.push(message);
      continue;
    }
    for (const key of keys) {
      if (FORM_KEYS.has(key)) formParts.push(message);
      else append(fields, key, message);
    }
  }
  const form = join(formParts);
  if (!form && Object.keys(fields).length === 0) return { form: "Invalid input", fields };
  return { form: form || undefined, fields };
}

function flattenIssues(issues: IssueLike[]): IssueLike[] {
  const flat: IssueLike[] = [];
  for (const issue of issues) {
    if (issue.code === "invalid_union" && issue.errors && issue.errors.length > 0) {
      const branches = [...issue.errors].sort(
        (left, right) => unrecognizedCount(left) - unrecognizedCount(right),
      );
      flat.push(...flattenIssues(branches[0] ?? []));
      continue;
    }
    flat.push(issue);
  }
  return flat;
}

function unrecognizedCount(issues: IssueLike[]) {
  return issues.filter((issue) => issue.code === "unrecognized_keys").length;
}

function issueKeys(issue: IssueLike) {
  if (issue.keys && issue.keys.length > 0) return [...issue.keys];
  const first = issue.path?.[0];
  if (first && typeof first === "object" && "key" in first) return [String(first.key)];
  if (typeof first === "string" || typeof first === "number") return [String(first)];
  return [];
}

function assignFieldMap(fields: Record<string, string>, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (Array.isArray(entry)) append(fields, key, entry.map(String).join(" "));
    else if (typeof entry === "string") append(fields, key, entry);
  }
}

function merge(target: Record<string, string>, extra: Record<string, string>) {
  for (const [key, value] of Object.entries(extra)) append(target, key, value);
}

function append(fields: Record<string, string>, key: string, message: string) {
  if (!message) return;
  fields[key] = fields[key] ? `${fields[key]} ${message}` : message;
}

function join(parts: string[]) {
  return [...new Set(parts.filter(Boolean))].join(" ");
}
