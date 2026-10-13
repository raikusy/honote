import { dirname } from "node:path";
import { chdir } from "node:process";
import { fileURLToPath } from "node:url";

import { seedDemo } from "@honote/api/seed-demo";
import { createDb } from "@honote/db";

chdir(dirname(dirname(fileURLToPath(import.meta.url))));

const { ENV } = await import("./env.server");

const connection = await createDb(ENV);
const result = await seedDemo();

console.log(
  `Seeded ${result.users} users, ${result.admins} admins, ${result.notes} notes, ${result.posts} posts. Password: ${result.password}`,
);

await connection.close();
