import { Request, Response, NextFunction } from "express";
import { QuickNoteSchema } from "../models/schemas/note.schemas";
import { NoteService } from "../services/NoteService";
import { asyncHandler } from "../middleware/errorHandler";
import { ValidationError } from "../utils/AppError";

/**
 * Obtiene todas las notas rápidas, con soporte de filtrado por 'since'.
 */
export const getQuickNotes = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const since = req.query.since as string;
    const notes = await NoteService.list({ since });

    res.json({
      success: true,
      data: notes,
    });
  },
);

/**
 * Crea una nueva nota rápida con validación Zod.
 */
export const createQuickNote = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    // Validación estricta con Zod
    const validatedData = QuickNoteSchema.parse(req.body);
    const enrichedNote = await NoteService.create({
      content: validatedData.content as string,
      authorUsername: validatedData.authorUsername as string,
      color: validatedData.color as string | undefined,
      reminderEnabled: validatedData.reminderEnabled as boolean | undefined,
    });

    res.status(201).json({
      success: true,
      data: enrichedNote,
    });
  },
);

/**
 * Archiva una nota rápida (la marca como leída/completada).
 */
export const archiveQuickNote = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const id = req.params.id;
    if (!id || typeof id !== "string") {
      throw new ValidationError("ID inválido");
    }

    const note = await NoteService.archive(id);

    res.status(200).json({
      success: true,
      data: note,
    });
  },
);

/**
 * Elimina una nota rápida.
 */
export const deleteQuickNote = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const id = req.params.id;
    if (!id || typeof id !== "string") {
      throw new ValidationError("ID inválido");
    }

    await NoteService.delete(id);

    res.status(200).json({
      success: true,
      message: "Nota eliminada",
    });
  },
);
