import { Router } from "express";
import * as meterController from "../controllers/meterController";
import { authenticateToken, authorizeSupervisor } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { MeterReadingQuerySchema, BulkMeterReadingSchema } from "../models/schemas/meter.schemas";

const router = Router();

/**
 * @openapi
 * /api/meters:
 *   get:
 *     summary: Obtiene lecturas de medidores (soporta paginación)
 *     tags: [Meters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000000
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-(0[1-9]|1[0-2])$'
 *         description: Mes de Chile, excluyente con startDate/endDate
 *       - in: query
 *         name: meterId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Timestamp para consulta delta
 *     responses:
 *       200:
 *         description: Lista de lecturas
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/PaginatedMeterReadingResponse'
 *                 - $ref: '#/components/schemas/MeterReadingListResponse'
 */
router.get(
  "/",
  authenticateToken,
  authorizeSupervisor,
  validate({ query: MeterReadingQuerySchema }),
  meterController.getMeterReadings,
);

/**
 * @openapi
 * /api/meters/bulk:
 *   post:
 *     summary: Registra lecturas de medidores en lote
 *     tags: [Meters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/MeterReading'
 *     responses:
 *       201:
 *         description: Lecturas registradas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeterReadingListResponse'
 */
router.post(
  "/bulk",
  authenticateToken,
  authorizeSupervisor,
  validate(BulkMeterReadingSchema),
  meterController.createMeterReading,
);

export default router;
