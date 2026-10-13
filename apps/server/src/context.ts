import type { Context as ApiContext } from "@honote/api/context";
import { getConnInfo } from "hono/bun";
import type { Context as HonoContext } from "hono";

import { ENV } from "./env.server";
import { db } from "./services";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext(options: CreateContextOptions): Promise<ApiContext> {
  return {
    db,
    ip: connectingAddress(options.context),
    authorization: options.context.req.header("authorization"),
    jwtSecret: ENV.JWT_SECRET,
  };
}

function connectingAddress(context: HonoContext) {
  try {
    return getConnInfo(context).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
