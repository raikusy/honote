import { replacementPasswordSchema } from "@honote/api/schemas/auth";
import { Button } from "@honote/ui/components/button";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { FormAlert, serverErrors, zodErrors, Field } from "@/components/field";
import { saveSession, sessionKind } from "@/lib/session";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/password")({
  beforeLoad: () => {
    const kind = sessionKind();
    if (kind === "access") throw redirect({ to: "/profile" });
    if (kind !== "password_change") throw redirect({ to: "/login" });
  },
  component: PasswordPage,
});

function PasswordPage() {
  const navigate = useNavigate();
  const changePassword = useMutation(orpc.auth.changePassword.mutationOptions());
  const form = useForm({
    defaultValues: { newPassword: "" },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = replacementPasswordSchema.safeParse(value);
        if (parsed.success) return;
        return zodErrors(parsed.error);
      },
    },
    onSubmit: ({ value }) => {
      changePassword.mutate(value, {
        onSuccess: async (result) => {
          saveSession(result.token);
          await navigate({ to: "/" });
        },
        onError: (error) => {
          form.setErrorMap({ onSubmit: serverErrors(error) });
        },
      });
    },
  });

  return (
    <main className="mx-auto max-w-sm px-4 py-8">
      <h1 className="mb-4 text-lg">Replace your password</h1>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="newPassword">
          {(field) => (
            <Field label="New password" type="password" autoComplete="new-password" field={field} />
          )}
        </form.Field>
        <FormAlert form={form} />
        <Button type="submit" disabled={changePassword.isPending}>
          Replace password
        </Button>
      </form>
    </main>
  );
}
