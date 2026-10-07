import { AuthError, ValidationError } from "../../../utils/AppError";
import type { NoteDependencies, NoteListParams } from "./contracts";
export function createNoteFlows<Note, Archived>(deps: NoteDependencies<Note, Archived>) {
  const actor = (username: string) => {
    if (!username?.trim()) throw new AuthError();
    return username;
  };
  const idValue = (id: unknown) => {
    if (!id || typeof id !== "string") throw new ValidationError("ID inválido");
    return id;
  };
  return {
    list: async (params: NoteListParams) => ({
      success: true,
      data: await deps.list(deps.parseQuery(params)),
    }),
    create: async (value: unknown, actorUsername: string) => {
      const username = actor(actorUsername);
      const { content, color, reminderEnabled } = deps.parse(value);
      return {
        success: true,
        data: await deps.create(
          { content, authorUsername: username, color, reminderEnabled },
          username,
        ),
      };
    },
    archive: async (id: unknown, actorUsername: string) => ({
      success: true,
      data: await deps.archive(idValue(id), actor(actorUsername)),
    }),
    remove: async (id: unknown, actorUsername: string) => {
      await deps.remove(idValue(id), actor(actorUsername));
      return { success: true, message: "Nota eliminada" };
    },
  };
}
export type NoteFlows = ReturnType<typeof createNoteFlows>;
