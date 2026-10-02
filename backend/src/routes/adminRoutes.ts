import { Router } from "express";
import * as adminController from "../controllers/adminController";
import { authenticateToken, authorizeAdmin } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { z } from "zod";
import { RestoreBackupSchema } from "../models/schemas/core.schemas";

const router = Router();

// Apply global protection
router.use(authenticateToken, authorizeAdmin);

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     summary: Obtener estadísticas del sistema
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del sistema
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemStats'
 */
router.get("/stats", adminController.getSystemStats);

/**
 * @openapi
 * /api/admin/diagnose-autoclose:
 *   get:
 *     summary: Diagnosticar cierre automático de turnos
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reporte de diagnóstico
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: number }
 *                 anomalies: { type: array, items: { type: object } }
 */
router.get("/diagnose-autoclose", adminController.diagnoseAutoClose);

/**
 * @openapi
 * /api/admin/trigger-autoclose:
 *   post:
 *     summary: Disparar cierre automático de turnos manualmente
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cierre ejecutado
 */
router.post("/trigger-autoclose", adminController.triggerAutoClose);

/**
 * @openapi
 * /api/admin/trigger-accounting-autoclose:
 *   post:
 *     summary: Disparar cierre contable automático manualmente
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cierre contable ejecutado
 */
router.post("/trigger-accounting-autoclose", adminController.triggerAccountingAutoClosure);

/**
 * @openapi
 * /api/admin/security-insights:
 *   get:
 *     summary: Obtener insights de seguridad
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Análisis de seguridad
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SecurityInsights'
 */
router.get("/security-insights", adminController.getSecurityInsights);

/**
 * @openapi
 * /api/admin/integrity-status:
 *   get:
 *     summary: Obtener estado de integridad de datos
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado de integridad
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 status: { type: object }
 */
router.get("/integrity-status", adminController.getIntegrityStatus);

/**
 * @openapi
 * /api/admin/trigger-backup:
 *   post:
 *     summary: Disparar respaldo de base de datos
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Respaldo iniciado
 */
router.post("/trigger-backup", adminController.triggerBackup);

/**
 * @openapi
 * /api/admin/purge-sessions:
 *   post:
 *     summary: Purgar sesiones de usuario
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurgeSessions'
 *     responses:
 *       200:
 *         description: Sesiones purgadas
 */
router.post(
  "/purge-sessions",
  validate(
    z.object({
      username: z.string().min(1).optional(),
    }),
  ),
  adminController.purgeSessions,
);

/**
 * @openapi
 * /api/admin/reset-password:
 *   post:
 *     summary: Restablecer contraseña de usuario
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPassword'
 *     responses:
 *       200:
 *         description: Contraseña restablecida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post(
  "/reset-password",
  validate(
    z.object({
      username: z.string().min(1),
      newPassword: z.string().min(6),
    }),
  ),
  adminController.resetUserPassword,
);

/**
 * @openapi
 * /api/admin/backups:
 *   get:
 *     summary: Obtener lista de respaldos
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de archivos de respaldo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   filename: { type: string }
 *                   size: { type: number }
 *                   createdAt: { type: string, format: date-time }
 */
router.get("/backups", adminController.getBackups);

/**
 * @openapi
 * /api/admin/restore:
 *   post:
 *     summary: Restaurar base de datos desde backup
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename: { type: string }
 *     responses:
 *       200:
 *         description: Restauración exitosa
 *       500:
 *         description: Error crítico en restauración
 */
router.post("/restore", validate(RestoreBackupSchema), adminController.restoreBackup);
/**
 * @openapi
 * /api/admin/restart:
 *   post:
 *     summary: Reiniciar el proceso del backend
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reinicio solicitado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: No se pudo reiniciar el backend
 */
router.post("/restart", adminController.restartBackend);

export default router;
