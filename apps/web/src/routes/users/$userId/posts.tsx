import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { errorMessage } from "@/components/field";
import { Pager } from "@/components/posts";
import { validatePageSearch } from "@/lib/page-search";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/users/$userId/posts")({
  validateSearch: validatePageSearch,
  component: UserPostsPage,
});

function UserPostsPage() {
  const { userId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const posts = useQuery(
    orpc.posts.byUser.queryOptions({
      input: { id: userId, ...(search.page === undefined ? {} : { page: search.page }) },
    }),
  );

  if (posts.isPending) return <main className="px-4 py-8">Loading...</main>;
  if (posts.error) {
    return (
      <main className="px-4 py-8">
        <p role="alert">{errorMessage(posts.error)}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-lg">{posts.data.author.displayName}</h1>
      <p>{posts.data.author.id}</p>
      {posts.data.items.length === 0 ? (
        <p>There are no posts.</p>
      ) : (
        <ul className="grid gap-4">
          {posts.data.items.map((post) => (
            <li key={post.id}>
              <Link to="/posts/$postId" params={{ postId: post.id }}>
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
          void navigate({
            to: "/users/$userId/posts",
            params: { userId },
            search: { page: next },
          });
        }}
      />
    </main>
  );
}
