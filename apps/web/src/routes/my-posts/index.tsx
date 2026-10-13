import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { errorMessage } from "@/components/field";
import { Pager } from "@/components/posts";
import { requireAccess } from "@/lib/access";
import { validatePageSearch } from "@/lib/page-search";
import { accessUserId } from "@/lib/session";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/my-posts/")({
  validateSearch: validatePageSearch,
  beforeLoad: requireAccess,
  component: MyPostsPage,
});

function MyPostsPage() {
  const userId = accessUserId();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const posts = useQuery({
    ...orpc.posts.byUser.queryOptions({
      input: {
        id: userId ?? "0".repeat(24),
        ...(search.page === undefined ? {} : { page: search.page }),
      },
    }),
    enabled: Boolean(userId),
  });

  if (!userId || posts.isPending) return <main className="px-4 py-8">Loading...</main>;
  if (posts.error) {
    return (
      <main className="px-4 py-8">
        <p role="alert">{errorMessage(posts.error)}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-lg">My posts</h1>
      <p className="mb-4">
        <Link to="/my-posts/new">New post</Link>
      </p>
      {posts.data.items.length === 0 ? (
        <p>There are no posts.</p>
      ) : (
        <ul className="grid gap-4">
          {posts.data.items.map((post) => (
            <li key={post.id}>
              <Link to="/my-posts/$postId" params={{ postId: post.id }}>
                {post.title}
              </Link>
              <p>{new Date(post.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
      <Pager
        page={posts.data.page}
        totalPages={posts.data.totalPages}
        onPage={(next) => {
          void navigate({ to: "/my-posts", search: { page: next } });
        }}
      />
    </main>
  );
}
