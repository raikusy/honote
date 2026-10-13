import { User } from "@honote/db";

import { conflict, rateLimited, unauthenticated, validationError } from "../http-error";
import { publicProcedure } from "../index";
import { withSession } from "../middleware";
import { hashPassword } from "../password";
import { toProfile } from "../profile";
import { consumeLogin, consumeRegister } from "../rate-limit";
import {
  changePasswordInputSchema,
  loginInputSchema,
  registerInputSchema,
  sessionSchema,
} from "../schemas/auth";
import { signAccessToken, signPasswordChangeToken } from "../session";

const INVALID_LOGIN = "Invalid email or password";

function isDuplicateEmail(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export const authRouter = {
  register: publicProcedure
    .route({ method: "POST", path: "/auth/register", successStatus: 201 })
    .input(registerInputSchema)
    .output(sessionSchema)
    .handler(async ({ input, context }) => {
      if (!consumeRegister(context.ip)) throw rateLimited();
      const passwordHash = await hashPassword(input.password);
      try {
        const user = await User.create({
          email: input.email,
          displayName: input.displayName,
          passwordHash,
          role: "user",
          interests: input.interests ?? [],
          mustChangePassword: false,
          tokenVersion: 0,
        });
        const token = await signAccessToken({
          secret: context.jwtSecret,
          userId: user._id.toHexString(),
          tokenVersion: user.tokenVersion,
        });
        return { token, profile: toProfile(user) };
      } catch (error) {
        if (isDuplicateEmail(error)) {
          throw conflict(`Email ${input.email} is already registered`, "email");
        }
        throw error;
      }
    }),
  login: publicProcedure
    .route({ method: "POST", path: "/auth/login" })
    .input(loginInputSchema)
    .output(sessionSchema)
    .handler(async ({ input, context }) => {
      if (!consumeLogin(context.ip, input.email)) throw rateLimited();
      const user = await User.findOne({ email: input.email }).select(
        "+passwordHash +tokenVersion +mustChangePassword",
      );
      const matches = user ? await Bun.password.verify(input.password, user.passwordHash) : false;
      if (!user || !matches) throw unauthenticated(INVALID_LOGIN);
      const token = user.mustChangePassword
        ? await signPasswordChangeToken({
            secret: context.jwtSecret,
            userId: user._id.toHexString(),
            tokenVersion: user.tokenVersion,
          })
        : await signAccessToken({
            secret: context.jwtSecret,
            userId: user._id.toHexString(),
            tokenVersion: user.tokenVersion,
          });
      return { token, profile: toProfile(user) };
    }),
  changePassword: withSession
    .route({ method: "POST", path: "/auth/password/change" })
    .input(changePasswordInputSchema)
    .output(sessionSchema)
    .handler(async ({ input, context }) => {
      const current = context.user;
      if (!current) throw new Error("Missing user");
      const user = await User.findById(current._id).select(
        "+passwordHash +tokenVersion +mustChangePassword",
      );
      if (!user) throw unauthenticated("Authentication required");
      if (context.tokenType === "password_change") {
        if ("currentPassword" in input) {
          throw validationError("Send only a new password", {
            currentPassword: ["Send only a new password"],
          });
        }
      } else if (!("currentPassword" in input)) {
        throw validationError("Current password is required", {
          currentPassword: ["Current password is required"],
        });
      } else {
        const matches = await Bun.password.verify(input.currentPassword, user.passwordHash);
        if (!matches) {
          throw validationError("Current password is wrong", {
            currentPassword: ["Current password is wrong"],
          });
        }
      }
      user.passwordHash = await hashPassword(input.newPassword);
      user.mustChangePassword = false;
      user.tokenVersion += 1;
      await user.save();
      const token = await signAccessToken({
        secret: context.jwtSecret,
        userId: user._id.toHexString(),
        tokenVersion: user.tokenVersion,
      });
      return { token, profile: toProfile(user) };
    }),
};
