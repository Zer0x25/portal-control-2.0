import { createNoteFlows } from "../modules/notes";
import { NoteService } from "./NoteService";
import { QuickNoteSchema, QuickNoteQuerySchema } from "../models/schemas/note.schemas";
export const noteFlows = createNoteFlows({
  parseQuery: (value) => QuickNoteQuerySchema.parse(value),
  list: (params) => NoteService.list(params),
  parse: (value) => QuickNoteSchema.parse(value),
  create: (value, actor) => NoteService.create(value, actor),
  archive: (id, actor) => NoteService.archive(id, actor),
  remove: (id, actor) => NoteService.delete(id, actor),
});
