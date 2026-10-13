import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const titleSchema = z.string().trim().min(1).max(200);

export const bodySchema = z
  .string()
  .min(1)
  .max(10_000)
  .refine((value) => value.trim().length > 0, "Body is empty");

export const noteSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  displayName: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const noteCreateSchema = z.strictObject({
  title: titleSchema,
  body: bodySchema,
});

export const noteUpdateSchema = z
  .strictObject({
    id: objectIdSchema,
    title: titleSchema.optional(),
    body: bodySchema.optional(),
  })
  .refine((value) => value.title !== undefined || value.body !== undefined, {
    message: "At least one field is required",
  });

export const noteIdSchema = z.strictObject({
  id: objectIdSchema,
});

export const noteListSchema = z.object({
  items: z.array(noteSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export type Note = z.infer<typeof noteSchema>;
