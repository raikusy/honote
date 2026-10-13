import { seedResultSchema } from "@honote/api/seed-demo";
import { Button } from "@honote/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { z } from "zod";

import { AdminGate } from "@/components/admin-gate";
import { errorMessage } from "@/components/field";
import { requireAccess } from "@/lib/access";
import { clearSession } from "@/lib/session";
import { orpc, queryClient } from "@/utils/orpc";

type SeedResult = z.infer<typeof seedResultSchema>;

export const Route = createFileRoute("/admin/seed")({
  beforeLoad: requireAccess,
  component: SeedPage,
});

function SeedPage() {
  const [result, setResult] = useState<SeedResult | null>(null);
  if (result) return <Seeded result={result} />;
  return (
    <AdminGate>
      <SeedForm onDone={setResult} />
    </AdminGate>
  );
}

function SeedForm({ onDone }: { onDone: (result: SeedResult) => void }) {
  const seed = useMutation(orpc.admin.seed.mutationOptions());
  const [failure, setFailure] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-lg">Seed</h1>
      <p className="mb-4">Replace every user, note, and post with demo data. This signs you out.</p>
      {failure ? (
        <p className="mb-4" role="alert">
          {failure}
        </p>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        disabled={seed.isPending}
        onClick={() => {
          if (!window.confirm("Replace all users, notes, and posts with demo data?")) return;
          setFailure(null);
          seed.mutate(undefined, {
            onSuccess: (data) => {
              clearSession();
              queryClient.clear();
              onDone(data);
            },
            onError: (error) => setFailure(errorMessage(error)),
          });
        }}
      >
        Seed demo data
      </Button>
    </main>
  );
}

function Seeded({ result }: { result: SeedResult }) {
  const navigate = useNavigate();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-lg">Seeded</h1>
      <p>
        {result.users} users, {result.admins} admins, {result.notes} notes, {result.posts} posts.
        Password: {result.password}
      </p>
      <Button type="button" className="mt-4" onClick={() => void navigate({ to: "/login" })}>
        Log in
      </Button>
    </main>
  );
}
