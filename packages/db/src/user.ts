import mongoose, { type Model } from "mongoose";

export type UserRole = "user" | "admin";

export type UserRecord = {
  _id: mongoose.Types.ObjectId;
  email: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  interests: string[];
  mustChangePassword: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new mongoose.Schema<UserRecord>(
  {
    email: { type: String, required: true },
    displayName: { type: String, required: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ["user", "admin"] },
    interests: { type: [String], required: true, default: [] },
    mustChangePassword: { type: Boolean, required: true, default: false, select: false },
    tokenVersion: { type: Number, required: true, default: 0, select: false },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: -1, _id: -1 });

export const User: Model<UserRecord> =
  (mongoose.models.User as Model<UserRecord> | undefined) ??
  mongoose.model<UserRecord>("User", userSchema);
