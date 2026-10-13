import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { errorMessage } from "@/components/field";
import { DeletePostButton } from "@/components/posts";
import { accessUserId } from "@/lib/session";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/posts/$postId")({
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  const post = useQuery(orpc.posts.get.queryOptions({ input: { id: postId } }));
  const isAuthor = accessUserId() === post.data?.authorId;

  if (post.isPending) return <main className="px-4 py-8">Loading...</main>;
  if (post.error || !post.data) {
    return (
      <main className="px-4 py-8">
        <p role="alert">{errorMessage(post.error)}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-lg">{post.data.title}</h1>
      <p className="whitespace-pre-wrap">{post.data.body}</p>
      <p className="mt-4">
        <Link to="/users/$userId/posts" params={{ userId: post.data.authorId }}>
          {post.data.displayName}
        </Link>
      </p>
      <p>{post.data.authorId}</p>
      <p>{new Date(post.data.createdAt).toLocaleString()}</p>
      {isAuthor ? (
        <div className="mt-4 grid max-w-xs gap-3">
          <Link to="/my-posts/$postId" params={{ postId: post.data.id }}>
            Edit
          </Link>
          <DeletePostButton id={post.data.id} />
        </div>
      ) : null}
    </main>
  );
}
