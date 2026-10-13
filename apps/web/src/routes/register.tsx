import { Button } from "@honote/ui/components/button";
import { registerInputSchema } from "@honote/api/schemas/auth";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { FormAlert, serverErrors, zodErrors, Field } from "@/components/field";
import { saveSession } from "@/lib/session";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

type FormValues = {
  email: string;
  displayName: string;
  password: string;
  interests: string;
};

function RegisterPage() {
  const navigate = useNavigate();
  const register = useMutation(orpc.auth.register.mutationOptions());
  const form = useForm({
    defaultValues: { email: "", displayName: "", password: "", interests: "" } as FormValues,
    validators: {
      onSubmit: ({ value }) => {
        const parsed = registerInputSchema.safeParse(toRegisterInput(value));
        if (parsed.success) return;
        return zodErrors(parsed.error);
      },
    },
    onSubmit: ({ value }) => {
      register.mutate(toRegisterInput(value), {
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
    <main className="honote-auth">
      <div className="honote-auth-copy">
        <p className="mb-3 text-xs font-medium tracking-[0.22em] text-primary uppercase">
          Start a shelf
        </p>
        <h1>Write under your own name.</h1>
        <p>A display name, a password, and the subjects you want nearby.</p>
      </div>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="email">
          {(field) => <Field label="Email" field={field} type="email" />}
        </form.Field>
        <form.Field name="displayName">
          {(field) => <Field label="Display name" field={field} />}
        </form.Field>
        <form.Field name="password">
          {(field) => <Field label="Password" field={field} type="password" />}
        </form.Field>
        <form.Field name="interests">
          {(field) => <Field label="Interests" field={field} />}
        </form.Field>
        <FormAlert form={form} />
        <Button type="submit" disabled={register.isPending}>
          Register
        </Button>
      </form>
    </main>
  );
}

function toRegisterInput(value: FormValues) {
  const body = {
    email: value.email,
    displayName: value.displayName,
    password: value.password,
  };
  if (!value.interests.trim()) return body;
  return { ...body, interests: value.interests.split(",") };
}
