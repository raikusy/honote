import type { Profile } from "@honote/api/schemas/profile";
import { useQuery } from "@tanstack/react-query";
import { tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminGate } from "@/components/admin-gate";
import { useAuthRedirect } from "@/components/auth-redirect";
import { errorMessage } from "@/components/field";
import { Pager } from "@/components/posts";
import { requireAccess } from "@/lib/access";
import { pageQuery, validatePageSearch } from "@/lib/page-search";
import { orpc } from "@/utils/orpc";

const features = tableFeatures({});

const columns: Array<ColumnDef<typeof features, Profile>> = [
  {
    accessorKey: "displayName",
    header: "Display name",
    cell: (info) => (
      <Link to="/admin/users/$userId" params={{ userId: info.row.original.id }}>
        {info.getValue<string>()}
      </Link>
    ),
  },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "role", header: "Role" },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: (info) => new Date(info.getValue<string>()).toLocaleString(),
  },
];

export const Route = createFileRoute("/admin/users/")({
  beforeLoad: requireAccess,
  validateSearch: validatePageSearch,
  component: UsersPage,
});

function UsersPage() {
  return (
    <AdminGate>
      <UsersList />
    </AdminGate>
  );
}

function UsersList() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const users = useQuery(
    orpc.admin.users.list.queryOptions({
      input: pageQuery(search),
    }),
  );
  useAuthRedirect(users.error);

  if (users.isPending) return <main className="px-4 py-8">Loading...</main>;
  if (users.error) {
    return (
      <main className="px-4 py-8">
        <p role="alert">{errorMessage(users.error)}</p>
      </main>
    );
  }

  const data = users.data;
  return (
    <main className="px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg">Users</h1>
        <Link to="/admin/users/new">Create a User</Link>
      </div>
      {data.items.length === 0 ? (
        <p>{data.total === 0 ? "There are no Users." : "There are no Users on this page."}</p>
      ) : (
        <UsersTable items={data.items} />
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

function UsersTable({ items }: { items: Profile[] }) {
  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (row) => row.id,
  });

  return (
    <table className="w-full text-left text-sm">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="py-2 pr-4 font-medium">
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
              <td key={cell.id} className="py-2 pr-4">
                <table.FlexRender cell={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
