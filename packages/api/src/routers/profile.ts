import { User } from "@honote/db";

import { conflict, unauthenticated } from "../http-error";
import { authed } from "../middleware";
import { toProfile } from "../profile";
import { profileUpdateSchema } from "../schemas/auth";
import { profileSchema } from "../schemas/profile";

function isDuplicateEmail(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export const profileRouter = {
  get: authed
    .route({ method: "GET", path: "/users/me" })
    .output(profileSchema)
    .handler(({ context }) => {
      const user = context.user;
      if (!user) throw new Error("Missing user");
      return toProfile(user);
    }),
  update: authed
    .route({ method: "PATCH", path: "/users/me" })
    .input(profileUpdateSchema)
    .output(profileSchema)
    .handler(async ({ input, context }) => {
      const user = context.user;
      if (!user) throw new Error("Missing user");
      const patch: { email?: string; displayName?: string; interests?: string[] } = {};
      if (input.email !== undefined) patch.email = input.email;
      if (input.displayName !== undefined) patch.displayName = input.displayName;
      if (input.interests !== undefined) patch.interests = input.interests;
      try {
        const saved = await User.findByIdAndUpdate(
          user._id,
          { $set: patch },
          { returnDocument: "after" },
        );
        if (!saved) throw unauthenticated("Authentication required");
        return toProfile(saved);
      } catch (error) {
        if (isDuplicateEmail(error)) {
          throw conflict(`Email ${input.email} is already registered`, "email");
        }
        throw error;
      }
    }),
};
