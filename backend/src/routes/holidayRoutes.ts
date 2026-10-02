import { Router } from "express";
import {
  getHolidays,
  createHoliday,
  deleteHoliday,
  createBulkHolidays,
  syncExternalHolidays,
} from "../controllers/holidayController";
import { authenticateToken, authorizeSupervisor } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  HolidaySchema,
  BulkHolidaySchema,
  HolidayQuerySchema,
} from "../models/schemas/holiday.schemas";
import { z } from "zod";

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * tags:
 *   name: Holidays
 *   description: Gestión de feriados nacionales y regionales
 */

/**
 * @openapi
 * /api/holidays:
 *   get:
 *     summary: Obtiene la lista de feriados registrados
 *     tags: [Holidays]
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Timestamp para consulta delta
 *     responses:
 *       200:
 *         description: Lista de feriados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Holiday'
 */
router.get("/", validate({ query: HolidayQuerySchema }), getHolidays);

/**
 * @openapi
 * /api/holidays/sync:
 *   post:
 *     summary: Sincroniza feriados con una API externa (Boostr)
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               year:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Resultado de la sincronización
 */
router.post(
  "/sync",
  authorizeSupervisor,
  validate(z.object({ year: z.number().int().min(2000).max(2100) })),
  syncExternalHolidays,
);

/**
 * @openapi
 * /api/holidays:
 *   post:
 *     summary: Crea un feriado manualmente
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Holiday'
 *     responses:
 *       201:
 *         description: Feriado creado
 */
router.post("/", authorizeSupervisor, validate(HolidaySchema), createHoliday);

/**
 * @openapi
 * /api/holidays/bulk:
 *   post:
 *     summary: Carga masiva de feriados
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Holiday'
 *     responses:
 *       201:
 *         description: Feriados creados
 */
router.post("/bulk", authorizeSupervisor, validate(BulkHolidaySchema), createBulkHolidays);

/**
 * @openapi
 * /api/holidays/{id}:
 *   delete:
 *     summary: Elimina un feriado
 *     tags: [Holidays]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Feriado eliminado
 */
router.delete("/:id", authorizeSupervisor, deleteHoliday);

export default router;
