import { adminUserUpdateInputSchema } from "@honote/api/schemas/auth";
import type { Profile } from "@honote/api/schemas/profile";
import { Button } from "@honote/ui/components/button";
import { Label } from "@honote/ui/components/label";
import { ORPCError } from "@orpc/client";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AdminGate } from "@/components/admin-gate";
import { useAuthRedirect } from "@/components/auth-redirect";
import { errorMessage, FormAlert, serverErrors, zodErrors, Field } from "@/components/field";
import { requireAccess } from "@/lib/access";
import { clearSession } from "@/lib/session";
import { orpc } from "@/utils/orpc";

import "@/lib/history";

export const Route = createFileRoute("/admin/users/$userId")({
  beforeLoad: requireAccess,
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const router = useRouter();
  const location = useLocation();
  const navigate = Route.useNavigate();
  const [oneTimePassword, setOneTimePassword] = useState(() => {
    if (location.state.provisionedProfile?.id !== userId) return undefined;
    return location.state.oneTimePassword;
  });
  const revealed =
    location.state.provisionedProfile?.id === userId &&
    location.state.oneTimePassword === undefined;
  const user = useQuery(orpc.admin.users.get.queryOptions({ input: { id: userId } }));
  useAuthRedirect(user.error);

  useEffect(() => {
    if (!location.state.oneTimePassword) return;
    router.history.replace(location.href, { ...location.state, oneTimePassword: undefined });
  }, [location.href, location.state, router]);

  return (
    <AdminGate>
      <main className="mx-auto max-w-sm px-4 py-8">
        {user.isPending ? <p>Loading...</p> : null}
        {user.error ? <p role="alert">{errorMessage(user.error)}</p> : null}
        {user.data ? (
          <UserEditor
            key={user.data.updatedAt}
            profile={user.data}
            oneTimePassword={oneTimePassword}
            revealed={revealed && !oneTimePassword}
            onPassword={(password) => setOneTimePassword(password)}
            onFailureAuth={() => {
              clearSession();
              void navigate({ to: "/login" });
            }}
          />
        ) : null}
      </main>
    </AdminGate>
  );
}

function UserEditor({
  profile,
  oneTimePassword,
  revealed,
  onPassword,
  onFailureAuth,
}: {
  profile: Profile;
  oneTimePassword: string | undefined;
  revealed: boolean;
  onPassword: (password: string) => void;
  onFailureAuth: () => void;
}) {
  const queryClient = useQueryClient();
  const [_failure, setFailure] = useState<string | null>(null);
  const navigate = Route.useNavigate();
  const update = useMutation(orpc.admin.users.update.mutationOptions());
  const reset = useMutation(orpc.admin.users.resetPassword.mutationOptions());
  const remove = useMutation(orpc.admin.users.delete.mutationOptions());
  const form = useForm({
    defaultValues: {
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      interests: profile.interests.join(", "),
    },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = adminUserUpdateInputSchema.safeParse({ ...toInput(value), id: profile.id });
        if (parsed.success) return;
        return zodErrors(parsed.error);
      },
    },
    onSubmit: ({ value }) => {
      setFailure(null);
      update.mutate(
        { ...toInput(value), id: profile.id },
        {
          onSuccess: (saved) => {
            queryClient.setQueryData(
              orpc.admin.users.get.queryOptions({ input: { id: profile.id } }).queryKey,
              saved,
            );
          },
          onError: (error) => {
            if (error instanceof ORPCError && error.status === 401) {
              onFailureAuth();
              return;
            }
            form.setErrorMap({ onSubmit: serverErrors(error) });
          },
        },
      );
    },
  });

  return (
    <>
      <h1 className="mb-4 text-lg">{profile.displayName}</h1>
      <p className="mb-4 text-sm">{new Date(profile.createdAt).toLocaleString()}</p>
      {oneTimePassword ? (
        <p className="mb-4 text-sm">One-time password: {oneTimePassword}</p>
      ) : null}
      {revealed ? <p className="mb-4 text-sm">The one-time password was already shown.</p> : null}
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
        <Button type="submit" disabled={update.isPending}>
          Save
        </Button>
      </form>
      <Button
        type="button"
        className="mt-4"
        disabled={reset.isPending}
        onClick={() => {
          if (!window.confirm("Reset this User's password?")) return;
          setFailure(null);
          reset.mutate(
            { id: profile.id },
            {
              onSuccess: (result) => onPassword(result.oneTimePassword),
              onError: (error) => {
                if (error instanceof ORPCError && error.status === 401) {
                  onFailureAuth();
                  return;
                }
                setFailure(serverErrors(error).form ?? errorMessage(error));
              },
            },
          );
        }}
      >
        Reset password
      </Button>
      <Button
        type="button"
        variant="destructive"
        className="mt-3"
        disabled={remove.isPending}
        onClick={() => {
          if (!window.confirm("Delete this User?")) return;
          setFailure(null);
          remove.mutate(
            { id: profile.id },
            {
              onSuccess: async () => {
                await queryClient.invalidateQueries();
                await navigate({ to: "/admin/users" });
              },
              onError: (error) => {
                if (error instanceof ORPCError && error.status === 401) {
                  onFailureAuth();
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
    </>
  );
}

function toInput(value: {
  email: string;
  displayName: string;
  role: "user" | "admin";
  interests: string;
}) {
  return {
    email: value.email,
    displayName: value.displayName,
    role: value.role,
    interests: value.interests.trim() === "" ? [] : value.interests.split(","),
  };
}
