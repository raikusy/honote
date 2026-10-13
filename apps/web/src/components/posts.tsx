import { ORPCError } from "@orpc/client";
import { Button } from "@honote/ui/components/button";
import { Textarea } from "@honote/ui/components/textarea";
import { postFieldsSchema } from "@honote/api/schemas/post";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { errorMessage, FormAlert, serverErrors, zodErrors, Field } from "@/components/field";
import { clearSession } from "@/lib/session";
import { orpc } from "@/utils/orpc";

export function unauthorized(error: unknown) {
  return error instanceof ORPCError && error.status === 401;
}

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav className="mt-4 flex items-center gap-3 text-sm">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={totalPages === 0 || page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

export function PostForm({
  postId,
  title,
  body,
  submitLabel,
}: {
  postId?: string;
  title: string;
  body: string;
  submitLabel: string;
}) {
  const navigate = useNavigate();
  const create = useMutation(orpc.posts.create.mutationOptions());
  const update = useMutation(orpc.posts.update.mutationOptions());
  const form = useForm({
    defaultValues: { title, body },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = postFieldsSchema.safeParse(value);
        if (parsed.success) return;
        return zodErrors(parsed.error);
      },
    },
    onSubmit: ({ value }) => {
      const onError = (error: unknown) => {
        if (unauthorized(error)) {
          clearSession();
          void navigate({ to: "/login" });
          return;
        }
        form.setErrorMap({ onSubmit: serverErrors(error) });
      };
      if (postId) {
        update.mutate({ id: postId, title: value.title, body: value.body }, { onError });
        return;
      }
      create.mutate(
        { title: value.title, body: value.body },
        {
          onSuccess: (post) => {
            void navigate({ to: "/my-posts/$postId", params: { postId: post.id } });
          },
          onError,
        },
      );
    },
  });

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="title">{(field) => <Field label="Title" field={field} />}</form.Field>
      <form.Field name="body">
        {(field) => (
          <Field label="Body" field={field}>
            <Textarea
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </Field>
        )}
      </form.Field>
      <FormAlert form={form} />
      <Button type="submit" disabled={create.isPending || update.isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function DeletePostButton({ id }: { id: string }) {
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);
  const remove = useMutation(orpc.posts.delete.mutationOptions());

  return (
    <div className="grid gap-2">
      {failure ? <p role="alert">{failure}</p> : null}
      <Button
        type="button"
        variant="destructive"
        disabled={remove.isPending}
        onClick={() => {
          if (!window.confirm("Delete this post?")) return;
          remove.mutate(
            { id },
            {
              onSuccess: () => {
                void navigate({ to: "/my-posts" });
              },
              onError: (error) => {
                if (unauthorized(error)) {
                  clearSession();
                  void navigate({ to: "/login" });
                  return;
                }
                setFailure(serverErrors(error).form ?? errorMessage(error));
              },
            },
          );
        }}
      >
        Delete
      </Button>
    </div>
  );
}
