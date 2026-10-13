import { changePasswordInputSchema, profileUpdateSchema } from "@honote/api/schemas/auth";
import type { Profile } from "@honote/api/schemas/profile";
import { Button } from "@honote/ui/components/button";
import { ORPCError } from "@orpc/client";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Field, FormAlert, serverErrors, zodErrors } from "@/components/field";
import { clearSession, saveSession, sessionToken } from "@/lib/session";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    if (!sessionToken()) throw redirect({ to: "/login" });
  },
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const profile = useQuery(orpc.profile.get.queryOptions());

  useEffect(() => {
    if (!profile.error) return;
    if (profile.error instanceof ORPCError && profile.error.status === 401) {
      clearSession();
      void navigate({ to: "/login" });
    }
  }, [navigate, profile.error]);

  if (profile.isPending) return <main className="px-4 py-8">Loading...</main>;

  if (profile.error) {
    const message =
      profile.error instanceof ORPCError || profile.error instanceof Error
        ? profile.error.message
        : "Something went wrong";
    return (
      <main className="px-4 py-8">
        <p role="alert">{message}</p>
      </main>
    );
  }

  return <ProfileEditor key={profile.data.updatedAt} profile={profile.data} />;
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const update = useMutation(orpc.profile.update.mutationOptions());
  const form = useForm({
    defaultValues: {
      email: profile.email,
      displayName: profile.displayName,
      interests: profile.interests.join(", "),
    },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = profileUpdateSchema.safeParse(toProfileUpdate(value));
        if (parsed.success) return;
        return zodErrors(parsed.error);
      },
    },
    onSubmit: ({ value }) => {
      update.mutate(toProfileUpdate(value), {
        onSuccess: (saved) => {
          queryClient.setQueryData(orpc.profile.get.queryOptions().queryKey, saved);
        },
        onError: (error) => {
          if (error instanceof ORPCError && error.status === 401) {
            clearSession();
            void navigate({ to: "/login" });
            return;
          }
          form.setErrorMap({ onSubmit: serverErrors(error) });
        },
      });
    },
  });

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-4 text-lg">Profile</h1>
      <dl className="mb-6 grid gap-2 text-sm">
        <Row label="Id" value={profile.id} />
        <Row label="Role" value={profile.role} />
        <Row label="Created" value={new Date(profile.createdAt).toLocaleString()} />
        <Row label="Updated" value={new Date(profile.updatedAt).toLocaleString()} />
      </dl>
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
        <form.Field name="interests">
          {(field) => <Field label="Interests" field={field} />}
        </form.Field>
        <FormAlert form={form} />
        <Button type="submit" disabled={update.isPending}>
          Save
        </Button>
      </form>
      <ChangePassword />
    </main>
  );
}

function ChangePassword() {
  const navigate = useNavigate();
  const changePassword = useMutation(orpc.auth.changePassword.mutationOptions());
  const form = useForm({
    defaultValues: { currentPassword: "", newPassword: "" },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = changePasswordInputSchema.safeParse(value);
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
          if (error instanceof ORPCError && error.status === 401) {
            clearSession();
            void navigate({ to: "/login" });
            return;
          }
          form.setErrorMap({ onSubmit: serverErrors(error) });
        },
      });
    },
  });

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg">Change password</h2>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="currentPassword">
          {(field) => (
            <Field
              label="Current password"
              type="password"
              autoComplete="current-password"
              field={field}
            />
          )}
        </form.Field>
        <form.Field name="newPassword">
          {(field) => (
            <Field label="New password" type="password" autoComplete="new-password" field={field} />
          )}
        </form.Field>
        <FormAlert form={form} />
        <Button type="submit" disabled={changePassword.isPending}>
          Change password
        </Button>
      </form>
    </section>
  );
}

function toProfileUpdate(value: { email: string; displayName: string; interests: string }) {
  return {
    email: value.email,
    displayName: value.displayName,
    interests: value.interests.trim() === "" ? [] : value.interests.split(","),
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
