import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AdminGate } from "@/components/admin-gate";
import { useAuthRedirect } from "@/components/auth-redirect";
import { errorMessage } from "@/components/field";
import { requireAccess } from "@/lib/access";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/notes/$noteId")({
  beforeLoad: requireAccess,
  component: AdminNotePage,
});

function AdminNotePage() {
  const { noteId } = Route.useParams();
  const note = useQuery(orpc.admin.notes.get.queryOptions({ input: { id: noteId } }));
  useAuthRedirect(note.error);

  return (
    <AdminGate>
      <main className="mx-auto max-w-xl px-4 py-8">
        {note.isPending ? <p>Loading...</p> : null}
        {note.error ? <p role="alert">{errorMessage(note.error)}</p> : null}
        {note.data ? (
          <>
            <h1 className="mb-4 text-lg">{note.data.title}</h1>
            <dl className="mb-4 grid gap-2 text-sm">
              <Row label="Owner id" value={note.data.ownerId} />
              <Row label="Display name" value={note.data.displayName} />
              <Row label="Created" value={new Date(note.data.createdAt).toLocaleString()} />
            </dl>
            <p className="whitespace-pre-wrap">{note.data.body}</p>
          </>
        ) : null}
      </main>
    </AdminGate>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
