import type { Database, UserRecord } from "@honote/db";

export type Context = {
  db: Database;
  ip: string;
  authorization: string | undefined;
  jwtSecret: string;
  user?: UserRecord;
  tokenType?: "access" | "password_change";
};
