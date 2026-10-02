import { Router } from "express";
import * as timeRecordController from "../controllers/timeRecordController";
import { authenticateToken, authorizeSupervisor } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  PunchSchema,
  TimeRecordWriteSchema,
  TimeRecordQuerySchema,
  BulkTimeRecordSchema,
  IntegrityVerifyQuerySchema,
  ResolveAnomalySchema,
} from "../models/schemas/time-correction.schemas";

const router = Router();

/**
 * @openapi
 * /api/records/punch:
 *   post:
 *     summary: Registra una nueva marcación (entrada/salida)
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Punch'
 *     responses:
 *       200:
 *         description: Marcaje exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PunchResponse'
 */
router.post("/punch", authenticateToken, validate(PunchSchema), timeRecordController.punch);

/**
 * @openapi
 * /api/records/export:
 *   get:
 *     summary: Exportación masiva de marcaciones para nómina
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, csv, xml, excel] }
 *     responses:
 *       200:
 *         description: Archivo exportado o JSON
 */
router.get(
  "/export",
  authenticateToken,
  validate({ query: TimeRecordQuerySchema }),
  // Security logic moved to controller to allow self-export
  timeRecordController.exportMasterData,
);

/**
 * @openapi
 * /api/records:
 *   get:
 *     summary: Obtiene historial de marcaciones
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: since
 *         schema: { type: string }
 *       - in: query
 *         name: desde
 *         schema: { type: string }
 *       - in: query
 *         name: hasta
 *         schema: { type: string }
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: area
 *         schema: { type: string }
 *       - in: query
 *         name: workdayType
 *         schema: { type: string }
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista paginada de registros
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimeRecordListResponse'
 */
router.get(
  "/",
  authenticateToken,
  validate({ query: TimeRecordQuerySchema }),
  timeRecordController.getAllRecords,
);

// Rutas administrativas restringidas a Supervisor o superior
router.use(authenticateToken, authorizeSupervisor);

/**
 * @openapi
 * /api/records/bulk:
 *   post:
 *     summary: Crea múltiples registros manualmente
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/TimeRecordWrite'
 *     responses:
 *       200:
 *         description: Carga masiva exitosa
 */
router.post("/bulk", validate(BulkTimeRecordSchema), timeRecordController.createBulkRecords);

/**
 * @openapi
 * /api/records:
 *   post:
 *     summary: Crea o actualiza un registro individual
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimeRecordWrite'
 *     responses:
 *       200:
 *         description: Registro guardado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceRecordResponse'
 */
router.post("/", validate(TimeRecordWriteSchema), timeRecordController.createOrUpdateRecord);

/**
 * @openapi
 * /api/records/auto-close:
 *   post:
 *     summary: Dispara proceso de cierre automático de jornadas
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Proceso ejecutado
 */
router.post("/auto-close", timeRecordController.triggerAutoClose);

/**
 * @openapi
 * /api/records/integrity/verify:
 *   get:
 *     summary: Verifica la integridad de la cadena de marcajes
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Resultado de la verificación
 */
router.get(
  "/integrity/verify",
  validate({ query: IntegrityVerifyQuerySchema }),
  timeRecordController.verifyIntegrity,
);

/**
 * @openapi
 * /api/records/{id}/resolve-anomaly:
 *   post:
 *     summary: Resuelve una anomalía (Ausencia, Omitir Salida, Permiso Especial, Día Libre o Vacaciones)
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution:
 *                 type: string
 *                 enum: [ABSENCE_MARK, SHIFT_HOURS_ACK, PERMIT_MARK, DAY_OFF_MARK, VACATION_MARK]
 *     responses:
 *       200:
 *         description: Anomalía resuelta
 */
router.post(
  "/:id/resolve-anomaly",
  validate(ResolveAnomalySchema),
  timeRecordController.resolveAnomaly,
);

/**
 * @openapi
 * /api/records/{id}:
 *   delete:
 *     summary: Elimina un registro de marcación
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Registro eliminado
 */
router.delete("/:id", timeRecordController.deleteRecord);

export default router;
