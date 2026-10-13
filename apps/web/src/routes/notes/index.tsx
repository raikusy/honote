import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useAuthRedirect } from "@/components/auth-redirect";
import { errorMessage } from "@/components/field";
import { Pager } from "@/components/posts";
import { requireAccess } from "@/lib/access";
import { pageQuery, validatePageSearch } from "@/lib/page-search";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/notes/")({
  beforeLoad: requireAccess,
  validateSearch: validatePageSearch,
  component: NotesPage,
});

function NotesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const notes = useQuery(
    orpc.notes.list.queryOptions({
      input: pageQuery(search),
    }),
  );
  useAuthRedirect(notes.error);

  if (notes.isPending) return <main className="px-4 py-8">Loading...</main>;
  if (notes.error) {
    return (
      <main className="px-4 py-8">
        <p role="alert">{errorMessage(notes.error)}</p>
      </main>
    );
  }

  const data = notes.data;
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-medium tracking-[0.22em] text-primary uppercase">
            Private
          </p>
          <h1>Notes</h1>
        </div>
        <Link to="/notes/new">New note</Link>
      </div>
      {data.items.length === 0 ? (
        <p>{data.total === 0 ? "You have no notes." : "There are no notes on this page."}</p>
      ) : (
        <ul className="grid gap-3">
          {data.items.map((note) => (
            <li key={note.id}>
              <Link to="/notes/$noteId" params={{ noteId: note.id }}>
                {note.title}
              </Link>
              <p>{note.displayName}</p>
              <p>{note.ownerId}</p>
              <p>{new Date(note.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
      <Pager
        page={data.page}
        totalPages={data.totalPages}
        onPage={(next) => {
          void navigate({ search: { page: next, limit: data.limit } });
        }}
      />
    </main>
  );
}
