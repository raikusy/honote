import { z } from "zod";

import { pageLimitInputSchema } from "./page";

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

export const titleSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1).max(200));

export const bodySchema = z
  .string()
  .min(1)
  .max(10000)
  .refine((value) => value.trim().length > 0, { message: "Body is required" });

export const postFieldsSchema = z.strictObject({
  title: titleSchema,
  body: bodySchema,
});

export const createPostInputSchema = postFieldsSchema;

export const updatePostInputSchema = z
  .strictObject({
    id: objectIdSchema,
    title: titleSchema.optional(),
    body: bodySchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.title === undefined && value.body === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field is required",
        path: ["title"],
      });
    }
  });

export const postIdInputSchema = z.strictObject({
  id: objectIdSchema,
});

export const postsByUserInputSchema = pageLimitInputSchema.extend({
  id: objectIdSchema,
});

export const postSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  displayName: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const postPageSchema = z.object({
  items: z.array(postSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const postsByUserSchema = postPageSchema.extend({
  author: z.object({
    id: z.string(),
    displayName: z.string(),
  }),
});

export type Post = z.infer<typeof postSchema>;
