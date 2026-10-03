import prisma from "./db";
import { Prisma } from "../generated/prisma/client";
import { SocketService } from "./socketService";

export interface NoteListParams {
  since?: string;
}

export class NoteService {
  /**
   * Retrieves all quick notes with optional 'since' filter.
   */
  static async list(params: NoteListParams) {
    const { since } = params;
    const where: Prisma.QuickNoteWhereInput = {};

    if (since) {
      const sinceDate = new Date(Number(since));
      if (!isNaN(sinceDate.getTime())) {
        where.updatedAt = { gte: sinceDate };
      }
    }

    const notes = await prisma.quickNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return notes.map((n) => ({
      ...n,
      lastModified: n.updatedAt.getTime(),
      syncStatus: "synced",
      isDeleted: false,
    }));
  }

  /**
   * Creates a new quick note.
   */
  static async create(data: {
    content: string;
    authorUsername: string;
    color?: string;
    reminderEnabled?: boolean;
  }) {
    const note = await prisma.quickNote.create({
      data: {
        content: data.content,
        authorUsername: data.authorUsername,
        color: data.color || "amber",
        reminderEnabled: data.reminderEnabled ?? true,
      },
    });

    const enrichedNote = {
      ...note,
      lastModified: note.updatedAt.getTime(),
      syncStatus: "synced",
      isDeleted: false,
    };

    SocketService.emit("quickNote:created", enrichedNote);
    return enrichedNote;
  }

  /**
   * Logic to "archive" or acknowledge a note.
   */
  static async archive(id: string) {
    const note = await prisma.quickNote.update({
      where: { id },
      data: { isArchived: true },
    });

    SocketService.emit("quickNote:updated", {
      ...note,
      lastModified: note.updatedAt.getTime(),
      syncStatus: "synced",
    });

    return note;
  }

  /**
   * Deletes a quick note by ID.
   */
  static async delete(id: string) {
    await prisma.quickNote.delete({ where: { id } });
    SocketService.emit("quickNote:deleted", { id });
    return true;
  }
}
