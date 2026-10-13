import { Note, User, type NoteRecord, type UserRecord } from "@honote/db";

import { notFound } from "./http-error";
import { totalPages } from "./schemas/page";
import type { Note as NoteJson } from "./schemas/note";

const MISSING = "Note not found";

export function toNote(note: NoteRecord, displayName: string): NoteJson {
  return {
    id: note._id.toHexString(),
    ownerId: note.ownerId.toHexString(),
    displayName,
    title: note.title,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export async function createNote(user: UserRecord, input: { title: string; body: string }) {
  const note = await Note.create({
    ownerId: user._id,
    title: input.title,
    body: input.body,
  });
  return toNote(note, user.displayName);
}

export async function listNotes(user: UserRecord, page: number, limit: number) {
  const filter = { ownerId: user._id };
  const total = await Note.countDocuments(filter);
  const offset = (page - 1) * limit;
  const notes =
    total === 0 || !Number.isSafeInteger(offset) || offset >= total
      ? []
      : await Note.find(filter).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit);
  return {
    items: notes.map((note) => toNote(note, user.displayName)),
    page,
    limit,
    total,
    totalPages: totalPages(total, limit),
  };
}

export async function getNote(user: UserRecord, id: string) {
  const note = await Note.findOne({ _id: id, ownerId: user._id });
  if (!note) throw notFound(MISSING);
  return toNote(note, user.displayName);
}

export async function updateNote(
  user: UserRecord,
  input: { id: string; title?: string; body?: string },
) {
  const note = await Note.findOne({ _id: input.id, ownerId: user._id });
  if (!note) throw notFound(MISSING);
  if (input.title !== undefined) note.title = input.title;
  if (input.body !== undefined) note.body = input.body;
  await note.save();
  return toNote(note, user.displayName);
}

export async function deleteNote(user: UserRecord, id: string) {
  const result = await Note.deleteOne({ _id: id, ownerId: user._id });
  if (result.deletedCount === 0) throw notFound(MISSING);
}

export async function listAllNotes(page: number, limit: number) {
  const total = await Note.countDocuments();
  const offset = (page - 1) * limit;
  const notes =
    total === 0 || !Number.isSafeInteger(offset) || offset >= total
      ? []
      : await Note.find().sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit);
  const names = await displayNames(notes);
  return {
    items: notes.map((note) => toNote(note, names.get(note.ownerId.toHexString()) ?? "")),
    page,
    limit,
    total,
    totalPages: totalPages(total, limit),
  };
}

export async function getAnyNote(id: string) {
  const note = await Note.findById(id);
  if (!note) throw notFound(MISSING);
  const names = await displayNames([note]);
  return toNote(note, names.get(note.ownerId.toHexString()) ?? "");
}

async function displayNames(notes: NoteRecord[]) {
  const owners = await User.find({ _id: { $in: notes.map((note) => note.ownerId) } });
  return new Map(owners.map((owner) => [owner._id.toHexString(), owner.displayName]));
}
