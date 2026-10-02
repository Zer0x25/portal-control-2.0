import { Router } from "express";
import * as correctionController from "../controllers/correctionController";
import { authenticateToken, authorizeCorrectionResolver } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  UpdateCorrectionStatusSchema,
  CorrectionRequestSchema,
} from "../models/schemas/time-correction.schemas";

const router = Router();

/**
 * @openapi
 * /api/corrections:
 *   get:
 *     summary: Obtener solicitudes de corrección
 *     tags: [Corrections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CorrectionRequestListResponse'
 */
router.get("/", authenticateToken, correctionController.getCorrectionRequests);
/**
 * @openapi
 * /api/corrections/stats:
 *   get:
 *     summary: Obtener estadísticas de solicitudes de corrección
 *     tags: [Corrections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas agregadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 */
router.get("/stats", authenticateToken, correctionController.getCorrectionStats);

/**
 * @openapi
 * /api/corrections/{id}/history:
 *   get:
 *     summary: Obtener historial de una solicitud de corrección
 *     tags: [Corrections]
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
 *         description: Historial de la solicitud
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 */
router.get("/:id/history", authenticateToken, correctionController.getCorrectionRequestHistory);

/**
 * @openapi
 * /api/corrections:
 *   post:
 *     summary: Crear una nueva solicitud de corrección
 *     tags: [Corrections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorrectionRequest'
 *     responses:
 *       201:
 *         description: Solicitud creada
 */
router.post(
  "/",
  authenticateToken,
  validate(CorrectionRequestSchema),
  correctionController.createCorrectionRequest,
);

/**
 * @openapi
 * /api/corrections/{id}/status:
 *   patch:
 *     summary: Actualizar estado de una solicitud de corrección
 *     tags: [Corrections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCorrectionStatus'
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.patch(
  "/:id/status",
  authenticateToken,
  authorizeCorrectionResolver,
  validate(UpdateCorrectionStatusSchema),
  correctionController.updateCorrectionRequestStatus,
);

export default router;
