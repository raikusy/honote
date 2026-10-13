import { createDb } from "@honote/db";

import { ENV } from "./env.server";
import { seedAdmin } from "./seed-admin";

export const db = await createDb(ENV);

await seedAdmin({
  email: ENV.ADMIN_EMAIL,
  displayName: ENV.ADMIN_DISPLAY_NAME,
  password: ENV.ADMIN_PASSWORD,
});
