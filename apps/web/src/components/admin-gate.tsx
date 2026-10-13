import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuthRedirect } from "@/components/auth-redirect";
import { errorMessage } from "@/components/field";
import { orpc } from "@/utils/orpc";

export function AdminGate({ children }: { children: ReactNode }) {
  const profile = useQuery(orpc.profile.get.queryOptions());
  useAuthRedirect(profile.error);
  if (profile.isPending) return <main className="px-4 py-8">Loading...</main>;
  if (profile.error) {
    return (
      <main className="px-4 py-8">
        <p role="alert">{errorMessage(profile.error)}</p>
      </main>
    );
  }
  if (profile.data.role !== "admin") {
    return (
      <main className="px-4 py-8">
        <p role="alert">Forbidden</p>
      </main>
    );
  }
  return children;
}
