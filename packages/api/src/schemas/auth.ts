import { z } from "zod";

import { objectIdSchema } from "./note";
import { profileSchema } from "./profile";

export const emailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email());

export const displayNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1).max(100));

export const passwordSchema = z.string().min(12).max(128);

export const interestsSchema = z
  .array(z.string())
  .max(20)
  .superRefine((values, ctx) => {
    const seen = new Set<string>();
    values.forEach((raw, index) => {
      const interest = raw.trim().toLowerCase();
      if (interest.length < 1 || interest.length > 50) {
        ctx.addIssue({
          code: "custom",
          message: "Interest must be 1–50 characters",
          path: [index],
        });
        return;
      }
      if (seen.has(interest)) {
        ctx.addIssue({
          code: "custom",
          message: "Duplicate interest",
          path: [index],
        });
        return;
      }
      seen.add(interest);
    });
  })
  .transform((values) => values.map((value) => value.trim().toLowerCase()));

export const registerInputSchema = z.strictObject({
  email: emailSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
  interests: interestsSchema.optional(),
});

export const loginInputSchema = z.strictObject({
  email: emailSchema,
  password: z.string(),
});

export const changePasswordInputSchema = z.union([
  z.strictObject({
    currentPassword: z.string(),
    newPassword: passwordSchema,
  }),
  z.strictObject({
    newPassword: passwordSchema,
  }),
]);

export const replacementPasswordSchema = z.strictObject({
  newPassword: passwordSchema,
});

export const adminCreateInputSchema = z.strictObject({
  email: emailSchema,
  displayName: displayNameSchema,
  role: z.enum(["user", "admin"]),
  interests: interestsSchema.optional(),
});

export const provisionSchema = z.object({
  oneTimePassword: z.string().length(20),
  profile: profileSchema,
});

export const adminUserUpdateInputSchema = z
  .strictObject({
    id: objectIdSchema,
    email: emailSchema.optional(),
    displayName: displayNameSchema.optional(),
    interests: interestsSchema.optional(),
    role: z.enum(["user", "admin"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.email === undefined &&
      value.displayName === undefined &&
      value.interests === undefined &&
      value.role === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field is required",
        path: ["input"],
      });
    }
  });

export const profileUpdateSchema = z
  .strictObject({
    email: emailSchema.optional(),
    displayName: displayNameSchema.optional(),
    interests: interestsSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.email === undefined &&
      value.displayName === undefined &&
      value.interests === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field is required",
        path: ["input"],
      });
    }
  });

export const sessionSchema = z.object({
  token: z.string(),
  profile: profileSchema,
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
