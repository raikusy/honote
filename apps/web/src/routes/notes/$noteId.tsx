import { noteCreateSchema } from "@honote/api/schemas/note";
import { Button } from "@honote/ui/components/button";
import { Textarea } from "@honote/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useAuthRedirect } from "@/components/auth-redirect";
import { errorMessage, FormAlert, serverErrors, zodErrors, Field } from "@/components/field";
import { requireAccess } from "@/lib/access";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/notes/$noteId")({
  beforeLoad: requireAccess,
  component: NotePage,
});

function NotePage() {
  const { noteId } = Route.useParams();
  const note = useQuery(orpc.notes.get.queryOptions({ input: { id: noteId } }));
  useAuthRedirect(note.error);

  if (note.isPending) return <main className="px-4 py-8">Loading...</main>;
  if (note.error) {
    return (
      <main className="px-4 py-8">
        <p role="alert">{errorMessage(note.error)}</p>
      </main>
    );
  }

  return <NoteEditor note={note.data} />;
}

function NoteEditor({
  note,
}: {
  note: {
    id: string;
    ownerId: string;
    displayName: string;
    title: string;
    body: string;
    createdAt: string;
    updatedAt: string;
  };
}) {
  const navigate = useNavigate();
  const [_failure, setFailure] = useState<string | null>(null);
  const [current, setCurrent] = useState(note);
  const update = useMutation(orpc.notes.update.mutationOptions());
  const remove = useMutation(orpc.notes.delete.mutationOptions());
  const form = useForm({
    defaultValues: { title: note.title, body: note.body },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = noteCreateSchema.safeParse(value);
        if (parsed.success) return;
        return zodErrors(parsed.error);
      },
    },
    onSubmit: ({ value }) => {
      setFailure(null);
      const parsed = noteCreateSchema.safeParse(value);
      if (!parsed.success) return;
      update.mutate(
        { id: note.id, title: parsed.data.title, body: parsed.data.body },
        {
          onSuccess: async (saved) => {
            setCurrent(saved);
            await queryClient.invalidateQueries();
          },
          onError: (error) => form.setErrorMap({ onSubmit: serverErrors(error) }),
        },
      );
    },
  });

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-4 text-lg">{current.title}</h1>
      <dl className="mb-4 grid gap-2 text-sm">
        <Row label="Id" value={current.id} />
        <Row label="Owner id" value={current.ownerId} />
        <Row label="Display name" value={current.displayName} />
        <Row label="Created" value={new Date(current.createdAt).toLocaleString()} />
        <Row label="Updated" value={new Date(current.updatedAt).toLocaleString()} />
      </dl>
      <p className="mb-4 whitespace-pre-wrap">{current.body}</p>
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
        <Button type="submit" disabled={update.isPending}>
          Save
        </Button>
      </form>
      <Button
        type="button"
        variant="destructive"
        className="mt-3"
        disabled={remove.isPending}
        onClick={() => {
          if (!window.confirm("Delete this note?")) return;
          setFailure(null);
          remove.mutate(
            { id: note.id },
            {
              onSuccess: async () => {
                await queryClient.invalidateQueries();
                await navigate({ to: "/notes" });
              },
              onError: (error) => setFailure(serverErrors(error).form ?? errorMessage(error)),
            },
          );
        }}
      >
        Delete
      </Button>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
