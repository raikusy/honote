import { z } from "zod";

export const pageLimitInputSchema = z.object({
  page: strictInt(1).optional().default(1),
  limit: strictInt(1, 100).optional().default(20),
});

export function totalPages(total: number, limit: number) {
  return total === 0 ? 0 : Math.ceil(total / limit);
}

function strictInt(min: number, max?: number) {
  return z.union([z.number(), z.string()]).transform((value, ctx) => {
    const parsed = readInt(value);
    if (parsed === undefined || parsed < min || (max !== undefined && parsed > max)) {
      ctx.addIssue({ code: "custom", message: "Invalid value" });
      return z.NEVER;
    }
    return parsed;
  });
}

function readInt(value: number | string) {
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : undefined;
  if (!/^-?(?:0|[1-9]\d*)$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
