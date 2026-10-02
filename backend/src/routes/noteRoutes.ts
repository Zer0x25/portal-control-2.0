import { Router } from "express";
import * as noteController from "../controllers/noteController";
import { authenticateToken, authorizeSupervisor } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { QuickNoteSchema, QuickNoteQuerySchema } from "../models/schemas/note.schemas";

const router = Router();

/**
 * @openapi
 * /api/notes:
 *   get:
 *     summary: Obtener notas rápidas
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Timestamp para obtener notas desde una fecha
 *     responses:
 *       200:
 *         description: Lista de notas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuickNoteListResponse'
 */
router.get(
  "/",
  authenticateToken,
  authorizeSupervisor,
  validate({ query: QuickNoteQuerySchema }),
  noteController.getQuickNotes,
);

/**
 * @openapi
 * /api/notes:
 *   post:
 *     summary: Crear una nueva nota rápida
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuickNote'
 *     responses:
 *       201:
 *         description: Nota creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuickNoteResponse'
 */
router.post(
  "/",
  authenticateToken,
  authorizeSupervisor,
  validate(QuickNoteSchema),
  noteController.createQuickNote,
);

/**
 * @openapi
 * /api/notes/{id}:
 *   put:
 *     summary: Archivar/Marcar nota como leída
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nota archivada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuickNoteResponse'
 */
router.put("/:id", authenticateToken, authorizeSupervisor, noteController.archiveQuickNote);

/**
 * @openapi
 * /api/notes/{id}:
 *   delete:
 *     summary: Eliminar una nota rápida
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nota eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.delete("/:id", authenticateToken, authorizeSupervisor, noteController.deleteQuickNote);

export default router;
