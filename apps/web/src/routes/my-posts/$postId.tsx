import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { errorMessage } from "@/components/field";
import { DeletePostButton, PostForm } from "@/components/posts";
import { accessUserId } from "@/lib/session";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/my-posts/$postId")({
  beforeLoad: () => {
    if (!accessUserId()) throw redirect({ to: "/login" });
  },
  component: EditPostPage,
});

function EditPostPage() {
  const { postId } = Route.useParams();
  const post = useQuery(orpc.posts.get.queryOptions({ input: { id: postId } }));
  const userId = accessUserId();

  if (post.isPending) return <main className="px-4 py-8">Loading...</main>;
  if (post.error || !post.data) {
    return (
      <main className="px-4 py-8">
        <p role="alert">{errorMessage(post.error)}</p>
      </main>
    );
  }

  if (userId !== post.data.authorId) {
    return (
      <main className="px-4 py-8">
        <p role="alert">Forbidden</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-4 text-lg">Edit post</h1>
      <PostForm
        postId={post.data.id}
        title={post.data.title}
        body={post.data.body}
        submitLabel="Save"
      />
      <div className="mt-4">
        <DeletePostButton id={post.data.id} />
      </div>
    </main>
  );
}
