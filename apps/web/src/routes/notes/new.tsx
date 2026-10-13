import { noteCreateSchema } from "@honote/api/schemas/note";
import { Button } from "@honote/ui/components/button";
import { Textarea } from "@honote/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { FormAlert, serverErrors, zodErrors, Field } from "@/components/field";
import { requireAccess } from "@/lib/access";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/notes/new")({
  beforeLoad: requireAccess,
  component: NewNotePage,
});

function NewNotePage() {
  const navigate = useNavigate();
  const create = useMutation(orpc.notes.create.mutationOptions());
  const form = useForm({
    defaultValues: { title: "", body: "" },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = noteCreateSchema.safeParse(value);
        if (parsed.success) return;
        return zodErrors(parsed.error);
      },
    },
    onSubmit: ({ value }) => {
      const parsed = noteCreateSchema.safeParse(value);
      if (!parsed.success) return;
      create.mutate(parsed.data, {
        onSuccess: async (note) => {
          await navigate({ to: "/notes/$noteId", params: { noteId: note.id } });
        },
        onError: (error) => {
          form.setErrorMap({ onSubmit: serverErrors(error) });
        },
      });
    },
  });

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-4 text-lg">New note</h1>
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
        <Button type="submit" disabled={create.isPending}>
          Create note
        </Button>
      </form>
    </main>
  );
}
