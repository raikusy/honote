import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { errorMessage } from "@/components/field";
import { Pager } from "@/components/posts";
import { validatePageSearch } from "@/lib/page-search";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  validateSearch: validatePageSearch,
  component: PostsPage,
});

function PostsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const posts = useQuery(
    orpc.posts.list.queryOptions({
      input: search.page === undefined ? {} : { page: search.page },
    }),
  );

  return (
    <main>
      <p className="mb-3 text-xs font-medium tracking-[0.22em] text-primary uppercase">
        Public shelf
      </p>
      <h1 className="max-w-3xl">Posts written in the open.</h1>
      {posts.isPending ? <p>Loading...</p> : null}
      {posts.error ? <p role="alert">{errorMessage(posts.error)}</p> : null}
      {posts.data ? (
        <>
          {posts.data.items.length === 0 ? (
            <p>There are no posts.</p>
          ) : (
            <ul className="grid gap-4">
              {posts.data.items.map((post) => (
                <li key={post.id}>
                  <Link to="/posts/$postId" params={{ postId: post.id }}>
                    {post.title}
                  </Link>
                  <p>
                    <Link to="/users/$userId/posts" params={{ userId: post.authorId }}>
                      {post.displayName}
                    </Link>
                  </p>
                  <p>{post.authorId}</p>
                  <p>{new Date(post.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
          <Pager
            page={posts.data.page}
            totalPages={posts.data.totalPages}
            onPage={(next) => {
              void navigate({ to: "/", search: { page: next } });
            }}
          />
        </>
      ) : null}
    </main>
  );
}
