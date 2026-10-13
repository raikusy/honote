import { z } from "zod";

export const profileSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: z.enum(["user", "admin"]),
  interests: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const profilePageSchema = z.object({
  items: z.array(profileSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export type Profile = z.infer<typeof profileSchema>;
