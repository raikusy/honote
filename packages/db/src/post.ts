import mongoose, { type Model } from "mongoose";

export type PostRecord = {
  _id: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

const postSchema = new mongoose.Schema<PostRecord>(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: true, collection: "posts" },
);

postSchema.index({ authorId: 1, createdAt: -1, _id: -1 });
postSchema.index({ createdAt: -1, _id: -1 });

export const Post: Model<PostRecord> =
  (mongoose.models.Post as Model<PostRecord> | undefined) ??
  mongoose.model<PostRecord>("Post", postSchema);
