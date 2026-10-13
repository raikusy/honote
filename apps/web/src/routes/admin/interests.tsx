import type { Profile } from "@honote/api/schemas/profile";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table";

import { AdminGate } from "@/components/admin-gate";
import { useAuthRedirect } from "@/components/auth-redirect";
import { errorMessage } from "@/components/field";
import { Pager } from "@/components/posts";
import { requireAccess } from "@/lib/access";
import { pageQuery, validatePageSearch } from "@/lib/page-search";
import { orpc } from "@/utils/orpc";

type Membership = {
  interest: string;
  user: Profile;
};

const features = tableFeatures({});

const columns: ColumnDef<typeof features, Membership>[] = [
  {
    accessorKey: "interest",
    header: "Interest",
    cell: (info) => info.getValue<string>(),
  },
  {
    id: "displayName",
    accessorFn: (row) => row.user.displayName,
    header: "Display name",
    cell: ({ row }) => (
      <Link to="/admin/users/$userId" params={{ userId: row.original.user.id }}>
        {row.original.user.displayName}
      </Link>
    ),
  },
  {
    id: "email",
    accessorFn: (row) => row.user.email,
    header: "Email",
    cell: (info) => info.getValue<string>(),
  },
];

export const Route = createFileRoute("/admin/interests")({
  beforeLoad: requireAccess,
  validateSearch: validatePageSearch,
  component: InterestsPage,
});

function InterestsPage() {
  return (
    <AdminGate>
      <Memberships />
    </AdminGate>
  );
}

function Memberships() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const memberships = useQuery(
    orpc.admin.users.byInterest.queryOptions({
      input: pageQuery(search),
    }),
  );
  useAuthRedirect(memberships.error);
  const table = useTable({
    features,
    columns,
    data: memberships.data?.items ?? [],
  });

  if (memberships.isPending) return <main className="px-4 py-8">Loading...</main>;
  if (memberships.error) {
    return (
      <main className="px-4 py-8">
        <p role="alert">{errorMessage(memberships.error)}</p>
      </main>
    );
  }

  const data = memberships.data;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-lg">Interests</h1>
      {data.items.length === 0 ? (
        <p>
          {data.total === 0
            ? "There are no interest memberships."
            : "There are no interest memberships on this page."}
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="border-b py-2 pr-4 font-medium">
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
                  <td key={cell.id} className="border-b py-2 pr-4">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pager
        page={data.page}
        totalPages={data.totalPages}
        onPage={(next) => {
          void navigate({
            search: { ...pageQuery(search), page: next },
          });
        }}
      />
    </main>
  );
}
