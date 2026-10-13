import { createFileRoute, redirect } from "@tanstack/react-router";

import { PostForm } from "@/components/posts";
import { accessUserId } from "@/lib/session";

export const Route = createFileRoute("/my-posts/new")({
  beforeLoad: () => {
    if (!accessUserId()) throw redirect({ to: "/login" });
  },
  component: NewPostPage,
});

function NewPostPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-4 text-lg">New post</h1>
      <PostForm title="" body="" submitLabel="Publish" />
    </main>
  );
}
