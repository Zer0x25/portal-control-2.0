import { Router } from "express";
import * as authController from "../controllers/authController";
import { validate } from "../middleware/validate";
import {
  LoginSchema,
  KioskLoginSchema,
  MFAVerifySchema,
  MFAValidateSchema,
} from "../models/schemas/auth-user.schemas";

import { authenticateToken } from "../middleware/authMiddleware";
import { loginRateLimiter } from "../middleware/loginLimiter";

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Inicia sesión de usuario (Soporta MFA)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Login'
 *     responses:
 *       200:
 *         description: Login exitoso o requerimiento de MFA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 token: { type: string }
 *                 requiresMFA: { type: boolean }
 *                 mustChangePassword: { type: boolean }
 *       401:
 *         description: Credenciales inválidas
 */
router.post("/login", loginRateLimiter, validate(LoginSchema), authController.login);

/**
 * @openapi
 * /api/auth/mfa/setup:
 *   post:
 *     summary: Genera secreto MFA y QR
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Secreto generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCode: { type: string }
 *                 secret: { type: string }
 */
router.post("/mfa/setup", authenticateToken, authController.setupMFA);

/**
 * @openapi
 * /api/auth/mfa/verify:
 *   post:
 *     summary: Habilita MFA tras verificar primer código
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: MFA habilitado
 */
router.post(
  "/mfa/verify",
  authenticateToken,
  validate(MFAVerifySchema),
  authController.verifyMFASetup,
);

/**
 * @openapi
 * /api/auth/mfa/validate:
 *   post:
 *     summary: Valida código MFA durante login
 *     tags: [Auth]
 *     responses:
 *       401:
 *         description: Código o desafío inválido, expirado o MFA deshabilitado
 *       403:
 *         description: Cuenta archivada entre factores
 *       429:
 *         description: Cinco códigos incorrectos bloquean MFA durante cinco minutos
 *         headers:
 *           Retry-After:
 *             description: Segundos hasta que se permita otro intento
 *             schema:
 *               type: integer
 *               minimum: 1
 *       200:
 *         description: Autenticación de dos pasos exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 mustChangePassword: { type: boolean }
 */
router.post("/mfa/validate", validate(MFAValidateSchema), authController.validateMFA);

/**
 * @openapi
 * /api/auth/kiosk-login:
 *   post:
 *     summary: Inicia sesión modo Kiosko (Reloj Control)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KioskLogin'
 *     responses:
 *       200:
 *         description: Login de Kiosko exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 employee: { $ref: '#/components/schemas/Employee' }
 */
router.post(
  "/kiosk-login",
  loginRateLimiter,
  validate(KioskLoginSchema),
  authController.kioskLogin,
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Cierra sesión del usuario
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Sesión cerrada
 */
router.post("/logout", authController.logout);

export default router;
