import { admin } from "../middleware";
import { getAnyNote, listAllNotes } from "../note";
import { noteIdSchema, noteListSchema, noteSchema } from "../schemas/note";
import { pageLimitInputSchema } from "../schemas/page";

export const adminNotes = {
  list: admin
    .route({ method: "GET", path: "/admin/notes" })
    .input(pageLimitInputSchema)
    .output(noteListSchema)
    .handler(({ input }) => listAllNotes(input.page, input.limit)),
  get: admin
    .route({ method: "GET", path: "/admin/notes/{id}" })
    .input(noteIdSchema)
    .output(noteSchema)
    .handler(({ input }) => getAnyNote(input.id)),
};
