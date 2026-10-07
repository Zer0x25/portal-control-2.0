import express from "express";
import {
  verifyConfig,
  saveConfig,
  getConfig,
  getRules,
  saveRules,
  sendTestEmail,
} from "../controllers/EmailController";
import { authenticateToken, authorizeElevated } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  EmailConfigSchema,
  EmailRulesSchema,
  SendTestEmailSchema,
} from "../models/schemas/email.schemas";

const router = express.Router();

// All email routes require authentication
router.use(authenticateToken, authorizeElevated);

/**
 * @openapi
 * /api/email/verify:
 *   post:
 *     summary: Verificar configuración de correo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailVerify'
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración verificada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailOperationResult'
 */
router.post("/verify", verifyConfig);

/**
 * @openapi
 * /api/email/config:
 *   get:
 *     summary: Obtener configuración de correo
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración de correo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailConfig'
 */
router.get("/config", getConfig);

/**
 * @openapi
 * /api/email/config:
 *   post:
 *     summary: Guardar configuración de correo
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailConfig'
 *     responses:
 *       200:
 *         description: Configuración guardada exitosamente
 */
router.post("/config", validate(EmailConfigSchema), saveConfig);

/**
 * @openapi
 * /api/email/rules:
 *   get:
 *     summary: Obtener reglas de notificación por correo
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reglas de notificación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailRules'
 */
router.get("/rules", getRules);

/**
 * @openapi
 * /api/email/rules:
 *   post:
 *     summary: Guardar reglas de notificación por correo
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailRules'
 *     responses:
 *       200:
 *         description: Reglas guardadas exitosamente
 */
router.post("/rules", validate(EmailRulesSchema), saveRules);

/**
 * @openapi
 * /api/email/send-test:
 *   post:
 *     summary: Enviar correo de prueba
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendTestEmail'
 *     responses:
 *       200:
 *         description: Correo de prueba enviado exitosamente
 */
router.post("/send-test", validate(SendTestEmailSchema), sendTestEmail);

export default router;
