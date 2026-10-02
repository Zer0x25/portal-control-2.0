import { Router } from "express";
import {
  getScheduledReports,
  getScheduledReport,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  toggleReportStatus,
} from "../controllers/scheduledReportController";
import { authenticateToken, authorizeElevated } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { ScheduledReportSchema } from "../models/schemas/report.schemas";

const router = Router();

// All routes require authentication and elevated privileges
router.use(authenticateToken);
router.use(authorizeElevated);

/**
 * @openapi
 * /api/scheduled-reports:
 *   get:
 *     summary: Obtener todos los reportes programados
 *     tags: [ScheduledReports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reportes programados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduledReportListResponse'
 */
router.get("/", getScheduledReports);

/**
 * @openapi
 * /api/scheduled-reports/{id}:
 *   get:
 *     summary: Obtener un reporte programado por ID
 *     tags: [ScheduledReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reporte programado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduledReport'
 */
router.get("/:id", getScheduledReport);

/**
 * @openapi
 * /api/scheduled-reports:
 *   post:
 *     summary: Crear un nuevo reporte programado
 *     tags: [ScheduledReports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduledReport'
 *     responses:
 *       201:
 *         description: Reporte creado
 */
router.post("/", validate(ScheduledReportSchema), createScheduledReport);

/**
 * @openapi
 * /api/scheduled-reports/{id}:
 *   put:
 *     summary: Actualizar un reporte programado
 *     tags: [ScheduledReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduledReport'
 *     responses:
 *       200:
 *         description: Reporte actualizado
 */
router.put("/:id", validate(ScheduledReportSchema.partial()), updateScheduledReport);

/**
 * @openapi
 * /api/scheduled-reports/{id}/toggle:
 *   patch:
 *     summary: Alternar estado activo/inactivo del reporte
 *     tags: [ScheduledReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado alternado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.patch("/:id/toggle", toggleReportStatus);

/**
 * @openapi
 * /api/scheduled-reports/{id}:
 *   delete:
 *     summary: Eliminar un reporte programado
 *     tags: [ScheduledReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reporte eliminado
 */
router.delete("/:id", deleteScheduledReport);

export default router;
