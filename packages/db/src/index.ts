import mongoose, { Types } from "mongoose";

import type { DatabaseConfig } from "./config";
import "./user";
import "./note";
import "./post";

export async function createDb(env: DatabaseConfig) {
  await mongoose.connect(env.DATABASE_URL);
  return mongoose.connection;
}

export type Database = Awaited<ReturnType<typeof createDb>>;

export { Note, type NoteRecord } from "./note";
export { User, type UserRecord, type UserRole } from "./user";
export { Post, type PostRecord } from "./post";

export function objectId(id: string) {
  return new Types.ObjectId(id);
}
