import { admin } from "../middleware";
import { seedDemo, seedResultSchema } from "../seed-demo";

export const adminSeed = admin
  .route({ method: "POST", path: "/admin/seed" })
  .output(seedResultSchema)
  .handler(() => seedDemo());
