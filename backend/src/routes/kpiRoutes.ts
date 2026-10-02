import express from "express";
import {
  getKpiSummary,
  getDashboardOverview,
  getDetailedReport,
  getDailyPlanningSummary,
} from "../controllers/kpiController";
import { authenticateToken, authorizeSupervisor } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { KpiSummaryRequestSchema } from "../models/schemas/core.schemas";

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeSupervisor); // Todos los KPIs y Reportes detallados requieren rol Supervisor

/**
 * @openapi
 * /api/kpis/summary:
 *   post:
 *     summary: Obtener resumen de KPIs
 *     tags: [KPIs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KpiSummaryRequest'
 *     responses:
 *       200:
 *         description: Resumen de KPIs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.post("/summary", validate(KpiSummaryRequestSchema), getKpiSummary);

/**
 * @openapi
 * /api/kpis/detailed-report:
 *   post:
 *     summary: Generar reporte detallado de KPIs
 *     tags: [KPIs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KpiSummaryRequest'
 *     responses:
 *       200:
 *         description: Reporte detallado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 report: { type: array, items: { type: object } }
 */
router.post("/detailed-report", validate(KpiSummaryRequestSchema), getDetailedReport);

/**
 * @openapi
 * /api/kpis/overview:
 *   get:
 *     summary: Obtener vista general del dashboard
 *     tags: [KPIs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vista general
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardOverview'
 */
router.get("/overview", getDashboardOverview);

/**
 * @openapi
 * /api/kpis/daily-planning:
 *   get:
 *     summary: Obtener resumen de planificación diaria
 *     tags: [KPIs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Planificación diaria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date: { type: string, format: date }
 *                 stats: { type: object }
 */
router.get("/daily-planning", getDailyPlanningSummary);

export default router;
