import { Note, Post, User, type UserRecord } from "@honote/db";
import type { ClientSession, HydratedDocument } from "mongoose";
import { z } from "zod";

import { conflict, conflictState, notFound } from "../http-error";
import { usersByInterest } from "../memberships";
import { admin } from "../middleware";
import { hashPassword, oneTimePassword } from "../password";
import { toProfile } from "../profile";
import {
  adminCreateInputSchema,
  adminUserUpdateInputSchema,
  provisionSchema,
} from "../schemas/auth";
import { membershipPageSchema } from "../schemas/membership";
import { objectIdSchema } from "../schemas/note";
import { pageLimitInputSchema, totalPages } from "../schemas/page";
import { profilePageSchema, profileSchema } from "../schemas/profile";

const MISSING = "User not found";
const SELF_DEMOTION = "An Admin cannot demote themselves";
const SELF_DELETE = "An Admin cannot delete themselves";
const LAST_ADMIN = "Demoting the last Admin is not allowed";
const LAST_ADMIN_DELETE = "Deleting the last Admin is not allowed";
const adminUserIdSchema = z.strictObject({ id: objectIdSchema });

export const adminUsers = {
  list: admin
    .route({ method: "GET", path: "/admin/users" })
    .input(pageLimitInputSchema)
    .output(profilePageSchema)
    .handler(({ input }) => listUsers(input.page, input.limit)),
  create: admin
    .route({ method: "POST", path: "/admin/users", successStatus: 201 })
    .input(adminCreateInputSchema)
    .output(provisionSchema)
    .handler(async ({ input }) => {
      const password = oneTimePassword();
      try {
        const user = await User.create({
          email: input.email,
          displayName: input.displayName,
          passwordHash: await hashPassword(password),
          role: input.role,
          interests: input.interests ?? [],
          mustChangePassword: true,
          tokenVersion: 0,
        });
        return { oneTimePassword: password, profile: toProfile(user) };
      } catch (error) {
        if (isDuplicateEmail(error)) {
          throw conflict(`Email ${input.email} is already registered`, "email");
        }
        throw error;
      }
    }),
  byInterest: admin
    .route({ method: "GET", path: "/admin/users/by-interest" })
    .input(pageLimitInputSchema)
    .output(membershipPageSchema)
    .handler(({ input }) => usersByInterest(input)),
  get: admin
    .route({ method: "GET", path: "/admin/users/{id}" })
    .input(adminUserIdSchema)
    .output(profileSchema)
    .handler(async ({ input }) => {
      const user = await User.findById(input.id);
      if (!user) throw notFound(MISSING);
      return toProfile(user);
    }),
  update: admin
    .route({ method: "PATCH", path: "/admin/users/{id}" })
    .input(adminUserUpdateInputSchema)
    .output(profileSchema)
    .handler(({ input, context }) => {
      const actor = context.user;
      if (!actor) throw new Error("Missing user");
      return updateUser(actor, input);
    }),
  delete: admin
    .route({ method: "DELETE", path: "/admin/users/{id}", successStatus: 204 })
    .input(adminUserIdSchema)
    .handler(({ input, context }) => {
      const actor = context.user;
      if (!actor) throw new Error("Missing user");
      return removeUser(actor, input.id);
    }),
  resetPassword: admin
    .route({ method: "POST", path: "/admin/users/{id}/reset-password" })
    .input(adminUserIdSchema)
    .output(provisionSchema)
    .handler(async ({ input }) => {
      const user = await User.findById(input.id).select(
        "+passwordHash +tokenVersion +mustChangePassword",
      );
      if (!user) throw notFound(MISSING);
      const password = oneTimePassword();
      user.passwordHash = await hashPassword(password);
      user.mustChangePassword = true;
      user.tokenVersion += 1;
      await user.save();
      return { oneTimePassword: password, profile: toProfile(user) };
    }),
};

async function listUsers(page: number, limit: number) {
  const total = await User.countDocuments();
  const offset = (page - 1) * limit;
  const users =
    total === 0 || !Number.isSafeInteger(offset) || offset >= total
      ? []
      : await User.find().sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit);
  return {
    items: users.map((user) => toProfile(user)),
    page,
    limit,
    total,
    totalPages: totalPages(total, limit),
  };
}

type UserDoc = HydratedDocument<UserRecord>;

type UserUpdate = {
  id: string;
  email?: string;
  displayName?: string;
  interests?: string[];
  role?: "user" | "admin";
};

async function removeUser(actor: UserRecord, id: string) {
  await removeWithTransaction(actor, id);
}

async function removeWithTransaction(actor: UserRecord, id: string) {
  const session = await User.startSession();
  try {
    await session.withTransaction(async () => {
      await removeInSession(actor, id, session);
    });
  } finally {
    await session.endSession();
  }
}

async function removeInSession(actor: UserRecord, id: string, session: ClientSession) {
  const user = await User.findById(id).session(session);
  if (!user) throw notFound(MISSING);
  if (user._id.equals(actor._id)) throw conflictState(SELF_DELETE);
  if (user.role === "admin") {
    const others = await User.countDocuments({ role: "admin", _id: { $ne: user._id } }).session(
      session,
    );
    if (others < 1) throw conflictState(LAST_ADMIN_DELETE);
    await User.collection.updateMany({ role: "admin" }, { $inc: { __v: 1 } }, { session });
    const still = await User.countDocuments({ role: "admin", _id: { $ne: user._id } }).session(
      session,
    );
    if (still < 1) throw conflictState(LAST_ADMIN_DELETE);
    const fresh = await User.findById(user._id).session(session);
    if (!fresh || fresh.role !== "admin") throw conflictState(LAST_ADMIN_DELETE);
  }
  const ownerId = user._id;
  await Note.deleteMany({ ownerId }, { session });
  await Post.deleteMany({ authorId: ownerId }, { session });
  await User.deleteOne({ _id: ownerId }, { session });
}

async function updateUser(actor: UserRecord, input: UserUpdate) {
  const existing = await User.findById(input.id).select("+tokenVersion");
  if (!existing) throw notFound(MISSING);
  const nextRole = input.role ?? existing.role;
  const demoting = existing.role === "admin" && nextRole === "user";
  if (!demoting) return saveUser(existing, input);
  return demoteWithTransaction(actor, input);
}

async function demoteWithTransaction(actor: UserRecord, input: UserUpdate) {
  const session = await User.startSession();
  try {
    let profile: ReturnType<typeof toProfile> | undefined;
    await session.withTransaction(async () => {
      profile = await demote(actor, input, session);
    });
    if (!profile) throw new Error("User update did not complete");
    return profile;
  } finally {
    await session.endSession();
  }
}

async function demote(actor: UserRecord, input: UserUpdate, session: ClientSession) {
  const user = await User.findById(input.id).select("+tokenVersion").session(session);
  if (!user) throw notFound(MISSING);
  const nextRole = input.role ?? user.role;
  if (user.role !== "admin" || nextRole !== "user") return saveUser(user, input, session);
  if (user._id.equals(actor._id)) throw conflictState(SELF_DEMOTION);
  const others = await User.countDocuments({ role: "admin", _id: { $ne: user._id } }).session(
    session,
  );
  if (others < 1) throw conflictState(LAST_ADMIN);
  await User.collection.updateMany({ role: "admin" }, { $inc: { __v: 1 } }, { session });
  const still = await User.countDocuments({ role: "admin", _id: { $ne: user._id } }).session(
    session,
  );
  if (still < 1) throw conflictState(LAST_ADMIN);
  const fresh = await User.findById(user._id).select("+tokenVersion").session(session);
  if (!fresh || fresh.role !== "admin") throw conflictState(LAST_ADMIN);
  return saveUser(fresh, input, session);
}

async function saveUser(user: UserDoc, input: UserUpdate, session?: ClientSession) {
  if (input.email !== undefined) user.email = input.email;
  if (input.displayName !== undefined) user.displayName = input.displayName;
  if (input.interests !== undefined) user.interests = input.interests;
  const nextRole = input.role ?? user.role;
  if (nextRole !== user.role) {
    user.role = nextRole;
    user.tokenVersion += 1;
  }
  try {
    await user.save(session ? { session } : undefined);
  } catch (error) {
    if (isDuplicateEmail(error))
      throw conflict(`Email ${input.email} is already registered`, "email");
    throw error;
  }
  return toProfile(user);
}

function isDuplicateEmail(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
