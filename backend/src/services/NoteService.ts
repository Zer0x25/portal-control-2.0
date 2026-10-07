import prisma, { withDirectTransaction } from "./db";
import { AuthError } from "../utils/AppError";
import { Prisma } from "../generated/prisma/client";
import { SocketService } from "./socketService";

export interface NoteListParams {
  since?: string | number;
}

export class NoteService {
  private static async mutate<T extends { id: string }>(
    operation: "create" | "update" | "delete",
    actorUsername: string,
    write: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!actorUsername?.trim()) throw new AuthError();
    const result = await withDirectTransaction(async (tx) => {
      const note = await write(tx);
      const audit = await tx.auditLog.create({
        data: {
          actorUsername,
          action: `QUICKNOTE_${operation.toUpperCase()}`,
          category: "DATA",
          severity: "INFO",
          outcome: "SUCCESS",
          details: { model: "QuickNote", operation, id: note.id },
        },
      });
      return { note, audit };
    });
    SocketService.emitToAll("auditLog:created", result.audit);
    return result.note;
  }
  /**
   * Retrieves all quick notes with optional 'since' filter.
   */
  static async list(params: NoteListParams) {
    const { since } = params;
    const where: Prisma.QuickNoteWhereInput = {};

    if (since !== undefined) {
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
  static async create(
    data: {
      content: string;
      authorUsername: string;
      color?: string;
      reminderEnabled?: boolean;
    },
    actorUsername: string,
  ) {
    const note = await this.mutate("create", actorUsername, (tx) =>
      tx.quickNote.create({
        data: {
          content: data.content,
          authorUsername: actorUsername,
          color: data.color || "amber",
          reminderEnabled: data.reminderEnabled ?? true,
        },
      }),
    );

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
  static async archive(id: string, actorUsername: string) {
    const note = await this.mutate("update", actorUsername, (tx) =>
      tx.quickNote.update({
        where: { id },
        data: { isArchived: true },
      }),
    );

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
  static async delete(id: string, actorUsername: string) {
    await this.mutate("delete", actorUsername, (tx) => tx.quickNote.delete({ where: { id } }));
    SocketService.emit("quickNote:deleted", { id });
    return true;
  }
}
