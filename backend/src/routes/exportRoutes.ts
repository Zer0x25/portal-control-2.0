import { Router } from "express";
import {
  exportCalendarPDF,
  exportReportPDF,
  exportShiftReportPDF,
  exportReportExcel,
} from "../controllers/exportController";
import { authenticateToken, authorizeSupervisor } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { ExportQuerySchema } from "../models/schemas/time-correction.schemas";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Exports
 *   description: Endpoints para exportación de archivos PDF y Excel
 */

/**
 * @openapi
 * /api/export/calendar-pdf:
 *   get:
 *     summary: Exportar calendario de turnos a PDF
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *       - in: query
 *         name: cargo
 *         schema:
 *           type: string
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: viewMode
 *         schema:
 *           type: string
 *           enum: [month, week, day]
 *           default: month
 *     responses:
 *       200:
 *         description: Archivo PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get(
  "/calendar-pdf",
  authenticateToken,
  validate({ query: ExportQuerySchema }),
  exportCalendarPDF,
);

/**
 * @openapi
 * /api/export/report-pdf:
 *   get:
 *     summary: Exportar reporte detallado de asistencia a PDF
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *       - in: query
 *         name: cargo
 *         schema:
 *           type: string
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get(
  "/report-pdf",
  authenticateToken,
  validate({ query: ExportQuerySchema }),
  exportReportPDF,
);

/**
 * @openapi
 * /api/export/shift-report-pdf/{id}:
 *   get:
 *     summary: Exportar bitácora de turno a PDF
 *     tags: [Exports]
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
 *         description: Archivo PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get("/shift-report-pdf/:id", authenticateToken, authorizeSupervisor, exportShiftReportPDF);

/**
 * @openapi
 * /api/export/report-excel:
 *   get:
 *     summary: Exportar reporte de asistencia a Excel
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         required: true
 *       - in: query
 *         name: area
 *         schema: { type: string }
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: mode
 *         schema: { type: string, enum: [summary, detailed] }
 *     responses:
 *       200:
 *         description: Archivo Excel
 */
router.get(
  "/report-excel",
  authenticateToken,
  validate({ query: ExportQuerySchema }),
  exportReportExcel,
);

export default router;
