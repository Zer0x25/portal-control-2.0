import { createNoteFlows } from "../modules/notes";
import { NoteService } from "./NoteService";
import { QuickNoteSchema } from "../models/schemas/note.schemas";
export const noteFlows = createNoteFlows({
  list: (params) => NoteService.list(params),
  parse: (value) => QuickNoteSchema.parse(value),
  create: (value) => NoteService.create(value),
  archive: (id) => NoteService.archive(id),
  remove: (id) => NoteService.delete(id),
});
