import { Router } from "express";
import { health, readiness } from "../controllers/healthController";

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Verificar estado de salud del servidor
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor saludable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       500:
 *         description: Error en el servidor o base de datos
 */
router.get("/", health);

/**
 * @openapi
 * /api/health/ready:
 *   get:
 *     summary: Verificar si el servidor está listo (Readiness Probe)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor listo
 */
router.get("/ready", readiness);

export default router;
