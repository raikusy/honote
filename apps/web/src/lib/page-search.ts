import { pageLimitInputSchema } from "@honote/api/schemas/page";

export type PageSearch = {
  page?: string | number;
  limit?: string | number;
};

export function validatePageSearch(search: Record<string, unknown>): PageSearch {
  const result: PageSearch = {};
  if ("page" in search) {
    if (!acceptedInteger(search.page, 1)) throw new Error("Invalid page");
    result.page = search.page;
  }
  if ("limit" in search) {
    if (!acceptedInteger(search.limit, 1, 100)) throw new Error("Invalid limit");
    result.limit = search.limit;
  }
  return result;
}

export function pageQuery(search: PageSearch) {
  return {
    ...(search.page === undefined ? {} : { page: search.page }),
    ...(search.limit === undefined ? {} : { limit: search.limit }),
  };
}

function acceptedInteger(value: unknown, min: number, max?: number): value is string | number {
  if (!plainInteger(value)) return false;
  const parsed = pageLimitInputSchema.safeParse(
    max === undefined ? { page: value } : { limit: value },
  );
  if (!parsed.success) return false;
  const number = max === undefined ? parsed.data.page : parsed.data.limit;
  return number >= min && (max === undefined || number <= max);
}

function plainInteger(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isSafeInteger(value);
  return typeof value === "string" && /^(?:0|[1-9]\d*)$/.test(value);
}
