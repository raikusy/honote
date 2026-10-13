import { authed } from "../middleware";
import { createNote, deleteNote, getNote, listNotes, updateNote } from "../note";
import {
  noteCreateSchema,
  noteIdSchema,
  noteListSchema,
  noteSchema,
  noteUpdateSchema,
} from "../schemas/note";
import { pageLimitInputSchema } from "../schemas/page";

export const notesRouter = {
  list: authed
    .route({ method: "GET", path: "/notes" })
    .input(pageLimitInputSchema)
    .output(noteListSchema)
    .handler(({ input, context }) => {
      const user = context.user;
      if (!user) throw new Error("Missing user");
      return listNotes(user, input.page, input.limit);
    }),
  create: authed
    .route({ method: "POST", path: "/notes", successStatus: 201 })
    .input(noteCreateSchema)
    .output(noteSchema)
    .handler(({ input, context }) => {
      const user = context.user;
      if (!user) throw new Error("Missing user");
      return createNote(user, input);
    }),
  get: authed
    .route({ method: "GET", path: "/notes/{id}" })
    .input(noteIdSchema)
    .output(noteSchema)
    .handler(({ input, context }) => {
      const user = context.user;
      if (!user) throw new Error("Missing user");
      return getNote(user, input.id);
    }),
  update: authed
    .route({ method: "PATCH", path: "/notes/{id}" })
    .input(noteUpdateSchema)
    .output(noteSchema)
    .handler(({ input, context }) => {
      const user = context.user;
      if (!user) throw new Error("Missing user");
      return updateNote(user, input);
    }),
  delete: authed
    .route({ method: "DELETE", path: "/notes/{id}", successStatus: 204 })
    .input(noteIdSchema)
    .handler(({ input, context }) => {
      const user = context.user;
      if (!user) throw new Error("Missing user");
      return deleteNote(user, input.id);
    }),
};
