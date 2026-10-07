import { ValidationError } from "../../../utils/AppError";
import type { NoteDependencies, NoteListParams } from "./contracts";
export function createNoteFlows<Note, Archived>(deps: NoteDependencies<Note, Archived>) {
  const idValue = (id: unknown) => {
    if (!id || typeof id !== "string") throw new ValidationError("ID inválido");
    return id;
  };
  return {
    list: async (params: NoteListParams) => ({ success: true, data: await deps.list(params) }),
    create: async (value: unknown) => {
      const { content, authorUsername, color, reminderEnabled } = deps.parse(value);
      return {
        success: true,
        data: await deps.create({ content, authorUsername, color, reminderEnabled }),
      };
    },
    archive: async (id: unknown) => ({ success: true, data: await deps.archive(idValue(id)) }),
    remove: async (id: unknown) => {
      await deps.remove(idValue(id));
      return { success: true, message: "Nota eliminada" };
    },
  };
}
export type NoteFlows = ReturnType<typeof createNoteFlows>;
