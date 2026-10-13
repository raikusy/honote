import { User } from "@honote/db";
import { hashPassword } from "@honote/api/password";
import { displayNameSchema, emailSchema, passwordSchema } from "@honote/api/schemas/auth";

export async function seedAdmin(input: { email: string; displayName: string; password: string }) {
  const email = emailSchema.safeParse(input.email);
  const displayName = displayNameSchema.safeParse(input.displayName);
  const password = passwordSchema.safeParse(input.password);
  if (!email.success || !displayName.success || !password.success) {
    throw new Error("Admin seed configuration is invalid");
  }

  const existing = await User.findOne({ email: email.data });
  if (existing) {
    if (existing.role !== "admin") {
      throw new Error("Admin seed failed: configured email belongs to a non-admin");
    }
    return;
  }

  await User.create({
    email: email.data,
    displayName: displayName.data,
    passwordHash: await hashPassword(password.data),
    role: "admin",
    interests: [],
    mustChangePassword: false,
    tokenVersion: 0,
  });
}
