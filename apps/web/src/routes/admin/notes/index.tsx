import { tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminGate } from "@/components/admin-gate";
import { useAuthRedirect } from "@/components/auth-redirect";
import { errorMessage } from "@/components/field";
import { Pager } from "@/components/posts";
import { requireAccess } from "@/lib/access";
import { pageQuery, validatePageSearch } from "@/lib/page-search";
import { orpc } from "@/utils/orpc";

type AdminNote = {
  id: string;
  title: string;
  displayName: string;
  createdAt: string;
};

const features = tableFeatures({});

const columns: Array<ColumnDef<typeof features, AdminNote>> = [
  {
    accessorKey: "title",
    header: "Title",
    cell: (info) => (
      <Link to="/admin/notes/$noteId" params={{ noteId: info.row.original.id }}>
        {info.getValue<string>()}
      </Link>
    ),
  },
  {
    accessorKey: "displayName",
    header: "Display name",
    cell: (info) => info.getValue<string>(),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: (info) => new Date(info.getValue<string>()).toLocaleString(),
  },
];

export const Route = createFileRoute("/admin/notes/")({
  beforeLoad: requireAccess,
  validateSearch: validatePageSearch,
  component: AdminNotesPage,
});

function AdminNotesPage() {
  const search = Route.useSearch();
  const notes = useQuery(
    orpc.admin.notes.list.queryOptions({
      input: pageQuery(search),
    }),
  );
  useAuthRedirect(notes.error);

  return (
    <AdminGate>
      <main className="px-4 py-8">
        <h1 className="mb-4 text-lg">Notes</h1>
        {notes.isPending ? <p>Loading...</p> : null}
        {notes.error ? <p role="alert">{errorMessage(notes.error)}</p> : null}
        {notes.data ? <NoteTable notes={notes.data} /> : null}
      </main>
    </AdminGate>
  );
}

function NoteTable({
  notes,
}: {
  notes: {
    items: AdminNote[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}) {
  const navigate = Route.useNavigate();
  const table = useTable({
    features,
    columns,
    data: notes.items,
  });

  return (
    <>
      {notes.items.length === 0 ? (
        <p>{notes.total === 0 ? "There are no notes." : "There are no notes on this page."}</p>
      ) : (
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pager
        page={notes.page}
        totalPages={notes.totalPages}
        onPage={(next) => {
          void navigate({ search: { page: next, limit: notes.limit } });
        }}
      />
    </>
  );
}
