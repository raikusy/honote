import { ORPCError } from "@orpc/client";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { clearSession } from "@/lib/session";

export function useAuthRedirect(error: unknown) {
  const navigate = useNavigate();
  useEffect(() => {
    if (error instanceof ORPCError && error.status === 401) {
      clearSession();
      void navigate({ to: "/login" });
    }
  }, [error, navigate]);
}
