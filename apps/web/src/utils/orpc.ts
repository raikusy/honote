import type { AppRouterClient } from "@honote/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/react-query";

import { sessionToken } from "../lib/session";
import { ENV } from "../env";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

export const queryClient = createQueryClient();

function getServerUrl(url: string) {
  const processEnv = typeof process === "undefined" ? undefined : process.env;
  if (typeof window === "undefined" && processEnv?.SERVER_URL) {
    return processEnv.SERVER_URL.endsWith("/")
      ? processEnv.SERVER_URL.slice(0, -1)
      : processEnv.SERVER_URL;
  }

  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export const link = new RPCLink({
  url: `${getServerUrl(ENV.VITE_SERVER_URL)}/api/v1/rpc`,
  headers: () => {
    const token = typeof localStorage === "undefined" ? null : sessionToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
