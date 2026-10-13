import { Button } from "@honote/ui/components/button";
import { loginInputSchema } from "@honote/api/schemas/auth";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { FormAlert, serverErrors, zodErrors, Field } from "@/components/field";
import { saveSession, sessionKind } from "@/lib/session";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const login = useMutation(orpc.auth.login.mutationOptions());
  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = loginInputSchema.safeParse(value);
        if (parsed.success) return;
        return zodErrors(parsed.error);
      },
    },
    onSubmit: ({ value }) => {
      login.mutate(value, {
        onSuccess: async (result) => {
          saveSession(result.token);
          await navigate({ to: sessionKind() === "password_change" ? "/password" : "/" });
        },
        onError: (error) => {
          form.setErrorMap({ onSubmit: serverErrors(error) });
        },
      });
    },
  });

  return (
    <main className="honote-auth">
      <div className="honote-auth-copy">
        <p className="mb-3 text-xs font-medium tracking-[0.22em] text-primary uppercase">
          Welcome back
        </p>
        <h1>The shelf is still yours.</h1>
        <p>Private notes stay private. Public posts stay on the shelf.</p>
      </div>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="email">
          {(field) => <Field label="Email" type="email" field={field} />}
        </form.Field>
        <form.Field name="password">
          {(field) => <Field label="Password" type="password" field={field} />}
        </form.Field>
        <FormAlert form={form} />
        <Button type="submit" disabled={login.isPending}>
          Log in
        </Button>
      </form>
    </main>
  );
}
