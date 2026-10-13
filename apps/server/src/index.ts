import { appRouter } from "@honote/api/routers/index";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { encodeErrorBody } from "@honote/api/http-error";
import { loginRetryAfter, registerRetryAfter } from "@honote/api/rate-limit";
import { emailSchema } from "@honote/api/schemas/auth";

import { createContext } from "./context";
import { ENV } from "./env.server";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: ENV.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Retry-After"],
  }),
);

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      docsPath: "/api-reference",
    }),
  ],
  customErrorResponseBodyEncoder: encodeErrorBody,
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/api/v1/*", async (c) => {
  const context = await createContext({ context: c });
  const request = c.req.raw;
  const rpcRequest = request.clone() as typeof request;
  const apiRequest = request.clone() as typeof request;
  const limitRequest = request.clone() as typeof request;

  const rpcResult = await rpcHandler.handle(rpcRequest, {
    prefix: "/api/v1/rpc",
    context,
  });
  if (rpcResult.matched) {
    const retryAfter =
      rpcResult.response.status === 429
        ? await retryAfterSeconds(limitRequest, context.ip)
        : undefined;
    return respond(c, rpcResult.response, retryAfter);
  }

  const apiResult = await apiHandler.handle(apiRequest, {
    prefix: "/api/v1",
    context,
  });
  if (apiResult.matched) {
    const retryAfter =
      apiResult.response.status === 429
        ? await retryAfterSeconds(limitRequest, context.ip)
        : undefined;
    return respond(c, apiResult.response, retryAfter);
  }

  return c.text("Not found", 404);
});

app.get("/", (c) => {
  return c.text("OK");
});

function respond(c: Context, response: globalThis.Response, retryAfter: number | undefined) {
  if (retryAfter !== undefined) response.headers.set("Retry-After", String(retryAfter));
  return c.newResponse(response.body, response);
}

async function retryAfterSeconds(request: { url: string; json(): Promise<unknown> }, ip: string) {
  const url = new URL(request.url);
  if (!url.pathname.endsWith("/auth/login")) return registerRetryAfter(ip);
  const email = await emailFrom(request);
  if (!email) return loginRetryAfter(ip, "");
  return loginRetryAfter(ip, email);
}

async function emailFrom(request: { json(): Promise<unknown> }) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return undefined;
    const record = body as { email?: unknown; json?: { email?: unknown } };
    const email = typeof record.email === "string" ? record.email : record.json?.email;
    if (typeof email !== "string") return undefined;
    const parsed = emailSchema.safeParse(email);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export default app;
