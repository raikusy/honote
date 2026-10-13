import { adminCreateInputSchema } from "@honote/api/schemas/auth";
import { Button } from "@honote/ui/components/button";
import { Label } from "@honote/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AdminGate } from "@/components/admin-gate";
import { FormAlert, serverErrors, zodErrors, Field } from "@/components/field";
import { requireAccess } from "@/lib/access";
import { orpc } from "@/utils/orpc";

import "@/lib/history";

export const Route = createFileRoute("/admin/users/new")({
  beforeLoad: requireAccess,
  component: NewUserPage,
});

function NewUserPage() {
  return (
    <AdminGate>
      <CreateUser />
    </AdminGate>
  );
}

function CreateUser() {
  const navigate = useNavigate();
  const create = useMutation(orpc.admin.users.create.mutationOptions());
  const form = useForm({
    defaultValues: {
      email: "",
      displayName: "",
      role: "user" as "user" | "admin",
      interests: "",
    },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = adminCreateInputSchema.safeParse(toInput(value));
        if (parsed.success) return;
        return zodErrors(parsed.error);
      },
    },
    onSubmit: ({ value }) => {
      create.mutate(toInput(value), {
        onSuccess: async (result) => {
          await navigate({
            to: "/admin/users/$userId",
            params: { userId: result.profile.id },
            state: { oneTimePassword: result.oneTimePassword, provisionedProfile: result.profile },
          });
        },
        onError: (error) => {
          form.setErrorMap({ onSubmit: serverErrors(error) });
        },
      });
    },
  });

  return (
    <main className="mx-auto max-w-sm px-4 py-8">
      <h1 className="mb-4 text-lg">Create a User</h1>
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
        <form.Field name="displayName">
          {(field) => <Field label="Display name" field={field} />}
        </form.Field>
        <form.Field name="role">
          {(field) => (
            <div className="grid gap-1">
              <Label htmlFor={field.name}>Role</Label>
              <select
                id={field.name}
                name={field.name}
                className="h-8 w-full border border-input bg-transparent px-2.5 text-xs"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value as "user" | "admin")}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
        </form.Field>
        <form.Field name="interests">
          {(field) => <Field label="Interests" field={field} />}
        </form.Field>
        <FormAlert form={form} />
        <Button type="submit" disabled={create.isPending}>
          Create
        </Button>
      </form>
    </main>
  );
}

function toInput(value: {
  email: string;
  displayName: string;
  role: "user" | "admin";
  interests: string;
}) {
  const interests = value.interests.trim() === "" ? undefined : value.interests.split(",");
  return {
    email: value.email,
    displayName: value.displayName,
    role: value.role,
    ...(interests ? { interests } : {}),
  };
}
