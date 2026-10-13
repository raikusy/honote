import type { RouterClient } from "@orpc/server";

import { adminNotes } from "./admin-notes";
import { adminSeed } from "./admin-seed";
import { adminUsers } from "./admin-users";
import { authRouter } from "./auth";
import { notesRouter } from "./notes";
import { postsRouter } from "./posts";
import { profileRouter } from "./profile";

export const appRouter = {
  auth: authRouter,
  posts: postsRouter,
  profile: profileRouter,
  notes: notesRouter,
  admin: {
    users: adminUsers,
    notes: adminNotes,
    seed: adminSeed,
  },
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
