import { dirname } from "node:path";
import { chdir } from "node:process";
import { fileURLToPath } from "node:url";

import { createDb, Note, Post, User } from "@honote/db";
import { hashPassword } from "@honote/api/password";

chdir(dirname(dirname(fileURLToPath(import.meta.url))));

const { ENV } = await import("./env.server");

const PASSWORD = "seed-password-1";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const INTERESTS = [
  "music",
  "cooking",
  "hiking",
  "reading",
  "photography",
  "gaming",
  "travel",
  "film",
];

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomInterests() {
  if (Math.random() < 0.5) return [];
  const pool = [...INTERESTS];
  const count = 1 + Math.floor(Math.random() * 5);
  const chosen: string[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(index, 1)[0]!);
  }
  return chosen;
}

const connection = await createDb(ENV);

await Promise.all([User.deleteMany({}), Note.deleteMany({}), Post.deleteMany({})]);

const passwordHash = await hashPassword(PASSWORD);

const accounts = [
  ...Array.from({ length: 20 }, (_, i) => ({
    email: `user-${pad(i + 1)}@seed.local`,
    displayName: `User ${pad(i + 1)}`,
    role: "user" as const,
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    email: `admin-${pad(i + 1)}@seed.local`,
    displayName: `Admin ${pad(i + 1)}`,
    role: "admin" as const,
  })),
];

const users = await User.insertMany(
  accounts.map((account) => ({
    ...account,
    passwordHash,
    interests: randomInterests(),
    mustChangePassword: false,
    tokenVersion: 0,
  })),
);

const ids = users.map((user) => user._id);

await Promise.all([
  Note.insertMany(
    Array.from({ length: 100 }, (_, i) => ({
      ownerId: pick(ids),
      title: `Note ${pad(i + 1)}`,
      body: `Seeded note ${i + 1}.`,
    })),
  ),
  Post.insertMany(
    Array.from({ length: 100 }, (_, i) => ({
      authorId: pick(ids),
      title: `Post ${pad(i + 1)}`,
      body: `Seeded post ${i + 1}.`,
    })),
  ),
]);

const [userCount, adminCount, noteCount, postCount] = await Promise.all([
  User.countDocuments({ role: "user" }),
  User.countDocuments({ role: "admin" }),
  Note.countDocuments(),
  Post.countDocuments(),
]);

console.log(
  `Seeded ${userCount} users, ${adminCount} admins, ${noteCount} notes, ${postCount} posts. Password: ${PASSWORD}`,
);

await connection.close();
