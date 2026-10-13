import mongoose, { type Model } from "mongoose";

export type NoteRecord = {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

const noteSchema = new mongoose.Schema<NoteRecord>(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: true },
);

noteSchema.index({ ownerId: 1, createdAt: -1, _id: -1 });
noteSchema.index({ createdAt: -1, _id: -1 });

export const Note: Model<NoteRecord> =
  (mongoose.models.Note as Model<NoteRecord> | undefined) ??
  mongoose.model<NoteRecord>("Note", noteSchema);
