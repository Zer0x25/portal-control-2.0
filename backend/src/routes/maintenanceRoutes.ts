import { Router } from "express";
import * as maintenanceController from "../controllers/maintenanceController";
import * as seedingController from "../controllers/seedingController";
import { authenticateToken, authorizeAdmin } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  SeedOptionsSchema,
  SeedPhase2StartSchema,
  SeedPhase2JobSchema,
} from "../models/schemas/core.schemas";

const router = Router();

/**
 * @openapi
 * /api/maintenance/clear-database:
 *   delete:
 *     summary: Limpiar toda la base de datos (Admin)
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Base de datos limpiada
 */
router.delete(
  "/clear-database",
  authenticateToken,
  authorizeAdmin,
  maintenanceController.clearDatabase,
);

/**
 * @openapi
 * /api/maintenance/seed:
 *   post:
 *     summary: Sembrar base de datos completa
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SeedOptions'
 *     responses:
 *       200:
 *         description: Siembra completada
 */
router.post(
  "/seed",
  authenticateToken,
  authorizeAdmin,
  validate(SeedOptionsSchema),
  seedingController.seedDatabase,
);

/**
 * @openapi
 * /api/maintenance/seed/phase1:
 *   post:
 *     summary: Ejecutar Fase 1 de siembra (Maestros)
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fase 1 completada
 */
router.post(
  "/seed/phase1",
  authenticateToken,
  authorizeAdmin,
  validate(SeedOptionsSchema),
  seedingController.seedPhase1,
);

/**
 * @openapi
 * /api/maintenance/seed/phase2/start:
 *   post:
 *     summary: Iniciar Fase 2 de siembra (Transaccional)
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Proceso iniciado
 */
router.post(
  "/seed/phase2/start",
  authenticateToken,
  authorizeAdmin,
  validate(SeedPhase2StartSchema),
  seedingController.startSeedPhase2,
);

/**
 * @openapi
 * /api/maintenance/seed/phase2/pause:
 *   post:
 *     summary: Pausar siembra Fase 2
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Pausado
 */
router.post(
  "/seed/phase2/pause",
  authenticateToken,
  authorizeAdmin,
  validate(SeedPhase2JobSchema),
  seedingController.pauseSeedPhase2,
);

/**
 * @openapi
 * /api/maintenance/seed/phase2/resume:
 *   post:
 *     summary: Reanudar siembra Fase 2
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Reanudado
 */
router.post(
  "/seed/phase2/resume",
  authenticateToken,
  authorizeAdmin,
  validate(SeedPhase2JobSchema),
  seedingController.resumeSeedPhase2,
);

/**
 * @openapi
 * /api/maintenance/seed/phase2/stop:
 *   post:
 *     summary: Detener siembra Fase 2
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Detenido
 */
router.post(
  "/seed/phase2/stop",
  authenticateToken,
  authorizeAdmin,
  validate(SeedPhase2JobSchema),
  seedingController.stopSeedPhase2,
);

/**
 * @openapi
 * /api/maintenance/seed/phase2/status:
 *   get:
 *     summary: Obtener estado de siembra Fase 2
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Estado actual
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SeedStatus'
 */
router.get(
  "/seed/phase2/status",
  authenticateToken,
  authorizeAdmin,
  seedingController.getSeedPhase2Status,
);

/**
 * @openapi
 * /api/maintenance/seed/phase2/logs:
 *   get:
 *     summary: Obtener logs de siembra Fase 2
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Lista de logs
 */
router.get(
  "/seed/phase2/logs",
  authenticateToken,
  authorizeAdmin,
  seedingController.getSeedPhase2Logs,
);

export default router;
