import type { UserRecord } from "@honote/db";

import type { Profile } from "./schemas/profile";

export function toProfile(user: UserRecord): Profile {
  return {
    id: user._id.toHexString(),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    interests: user.interests,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
