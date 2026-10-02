import { Router } from "express";
import * as auditLogController from "../controllers/auditLogController";
import {
  authenticateToken,
  authorizeAuditViewer,
  authorizeElevated,
} from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { AuditLogQuerySchema, AuditLogCleanupSchema } from "../models/schemas/audit.schemas";
import { AuditLogSchema } from "../models/schemas/core.schemas";

const router = Router();

/**
 * @openapi
 * /api/audit-logs/export:
 *   get:
 *     summary: Exportar logs de auditoría
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archivo de auditoría generado
 */
router.get("/export", authenticateToken, authorizeAuditViewer, auditLogController.exportAuditLogs);

/**
 * @openapi
 * /api/audit-logs:
 *   get:
 *     summary: Obtener logs de auditoría paginados
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de logs de auditoría
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditLogListResponse'
 */
router.get(
  "/",
  authenticateToken,
  authorizeAuditViewer,
  validate({ query: AuditLogQuerySchema }),
  auditLogController.getAuditLogs,
);

/**
 * @openapi
 * /api/audit-logs/integrity-status:
 *   get:
 *     summary: Obtener estado de integridad de la auditoría
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reporte de integridad
 */
router.get(
  "/integrity-status",
  authenticateToken,
  authorizeAuditViewer,
  auditLogController.getIntegrityStatus,
);

/**
 * @openapi
 * /api/audit-logs/verify-integrity:
 *   get:
 *     summary: Verificar integridad de la auditoría (Elevado)
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verificación iniciada
 */
router.get(
  "/verify-integrity",
  authenticateToken,
  authorizeElevated,
  auditLogController.verifyIntegrity,
);

/**
 * @openapi
 * /api/audit-logs/cleanup:
 *   post:
 *     summary: Limpiar logs de auditoría antiguos
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Limpieza realizada
 */
router.post(
  "/cleanup",
  authenticateToken,
  authorizeElevated,
  validate(AuditLogCleanupSchema),
  auditLogController.cleanupAuditLogs,
);

/**
 * @openapi
 * /api/audit-logs:
 *   post:
 *     summary: Crear log de auditoría manual
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuditLog'
 *     responses:
 *       201:
 *         description: Log creado
 */
router.post("/", authenticateToken, validate(AuditLogSchema), auditLogController.createAuditLog);

export default router;
