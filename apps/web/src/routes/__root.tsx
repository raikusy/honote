import { HeadContent, Outlet, createRootRouteWithContext, redirect } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { errorMessage } from "@/components/field";
import { isPublicPostPath } from "@/lib/access";
import { clearExpiredSession, sessionKind } from "@/lib/session";
import type { orpc } from "@/utils/orpc";

import "../index.css";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  beforeLoad: ({ location }) => {
    if (typeof localStorage === "undefined") return;
    clearExpiredSession();
    if (
      sessionKind() === "password_change" &&
      location.pathname !== "/password" &&
      !isPublicPostPath(location.pathname)
    ) {
      throw redirect({ to: "/password" });
    }
  },
  errorComponent: ({ error }) => (
    <main className="px-4 py-8">
      <p role="alert">{errorMessage(error)}</p>
    </main>
  ),
  component: RootComponent,
  head: () => ({
    meta: [{ title: "Honote" }, { name: "description", content: "Notes and public posts" }],
    links: [{ rel: "icon", href: "/favicon.ico" }],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <div className="honote-app grid min-h-svh grid-rows-[auto_1fr]">
          <Header />
          <Outlet />
        </div>
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
