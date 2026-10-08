import { QuickNote } from "../types/index";
import { apiClient, Schema } from "./apiClient";

type SDKQuickNote = Schema<"QuickNote">;

const toQuickNote = (note: SDKQuickNote): QuickNote => ({
  id: note.id || "",
  content: note.content,
  authorUsername: note.authorUsername,
  isArchived: !!note.isArchived,
  color: note.color || "amber",
  reminderEnabled: !!note.reminderEnabled,
  createdAt: note.createdAt ? new Date(note.createdAt).getTime() : Date.now(),
  lastModified: note.updatedAt ? new Date(note.updatedAt).getTime() : Date.now(),
  syncStatus: "synced",
  isDeleted: !!note.isDeleted,
});

export const noteService = {
  /**
   * Obtiene todas las notas rápidas, soportando filtro 'since'.
   */
  async getAll(since?: number): Promise<QuickNote[]> {
    const response = await apiClient.get("/api/notes", {
      params: since !== undefined ? { since: String(since) } : undefined,
    });
    const data =
      response &&
      typeof response === "object" &&
      "data" in response &&
      Array.isArray((response as { data?: unknown }).data)
        ? ((response as { data: SDKQuickNote[] }).data ?? [])
        : [];
    return data.map(toQuickNote);
  },

  /**
   * Crea una nueva nota rápida.
   */
  async create(note: QuickNote): Promise<QuickNote> {
    const response = await apiClient.post("/api/notes", {
      body: {
        content: note.content,
        authorUsername: note.authorUsername,
        color: note.color,
        reminderEnabled: note.reminderEnabled,
      } as unknown as never,
    });

    const data =
      response && typeof response === "object" && "data" in response
        ? (response as { data?: SDKQuickNote }).data
        : undefined;
    if (!data) throw new Error("No data returned from createNote");

    return toQuickNote(data);
  },

  /**
   * Archiva una nota rápida.
   */
  async archive(id: string): Promise<QuickNote> {
    const response = await apiClient.put("/api/notes/{id}", {
      path: { id },
      body: {},
    });

    const data =
      response && typeof response === "object" && "data" in response
        ? (response as { data?: SDKQuickNote }).data
        : undefined;
    if (!data) throw new Error("No data returned from archiveNote");
    return toQuickNote(data);
  },

  /**
   * Elimina una nota rápida.
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete("/api/notes/{id}", {
      path: { id },
    });
  },
};
