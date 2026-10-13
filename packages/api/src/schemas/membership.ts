import { z } from "zod";

import { profileSchema } from "./profile";

export const membershipSchema = z.object({
  interest: z.string(),
  user: profileSchema,
});

export const membershipPageSchema = z.object({
  items: z.array(membershipSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});
