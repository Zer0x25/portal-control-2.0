import { Router } from "express";
import * as shiftReportController from "../controllers/shiftReportController";
import { authenticateToken, authorizeSupervisor } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { ShiftReportSchema } from "../models/schemas/report.schemas";

const router = Router();

/**
 * @openapi
 * /api/shift-reports:
 *   get:
 *     summary: Obtener todas las bitácoras de turno
 *     tags: [ShiftReports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de bitácoras
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftReportListResponse'
 */
router.get("/", authenticateToken, authorizeSupervisor, shiftReportController.getAllShiftReports);

/**
 * @openapi
 * /api/shift-reports:
 *   post:
 *     summary: Crear o actualizar una bitácora de turno
 *     tags: [ShiftReports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftReport'
 *     responses:
 *       200:
 *         description: Bitácora guardada
 */
router.post(
  "/",
  authenticateToken,
  authorizeSupervisor,
  validate(ShiftReportSchema),
  shiftReportController.createOrUpdateShiftReport,
);

/**
 * @openapi
 * /api/shift-reports/export/{id}:
 *   get:
 *     summary: Exportar bitácora de turno a Excel
 *     tags: [ShiftReports]
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
 *         description: Archivo Excel
 */
router.get(
  "/export/:id",
  authenticateToken,
  authorizeSupervisor,
  shiftReportController.exportShiftReportExcel,
);

export default router;
