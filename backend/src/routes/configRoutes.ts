import { Router } from "express";
import * as configController from "../controllers/configController";
import { authenticateToken, authorizeAdmin } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";
import { ValidationError } from "../utils/AppError";

const router = Router();
const companyPolicyDir = path.resolve(process.cwd(), "uploads", "company-policy");

if (!fs.existsSync(companyPolicyDir)) {
  fs.mkdirSync(companyPolicyDir, { recursive: true });
}

const companyPolicyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, companyPolicyDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".pdf");
    const safeExt = ext.toLowerCase() === ".pdf" ? ".pdf" : ".pdf";
    cb(null, `company-policy-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const uploadCompanyPolicyMiddleware = multer({
  storage: companyPolicyStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new ValidationError("Solo se permiten archivos PDF"));
      return;
    }
    cb(null, true);
  },
});

/**
 * @openapi
 * /api/configs/public/company-policy:
 *   get:
 *     summary: Obtener la politica corporativa publica
 *     tags: [Configs]
 *     responses:
 *       200:
 *         description: Politica corporativa vigente
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
router.get("/public/company-policy", configController.getPublicCompanyPolicy);

/**
 * @openapi
 * /api/configs/public/company-policy/file:
 *   get:
 *     summary: Descargar el PDF de la politica corporativa
 *     tags: [Configs]
 *     responses:
 *       200:
 *         description: Archivo PDF de la politica corporativa
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get("/public/company-policy/file", configController.downloadPublicCompanyPolicy);

/**
 * @openapi
 * /api/configs/company-policy:
 *   post:
 *     summary: Subcribir la politica corporativa en PDF
 *     tags: [Configs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Politica corporativa actualizada
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
router.post(
  "/company-policy",
  authenticateToken,
  authorizeAdmin,
  uploadCompanyPolicyMiddleware.single("file"),
  configController.uploadCompanyPolicy,
);

/**
 * @openapi
 * /api/configs/server-time:
 *   get:
 *     summary: Obtener hora actual del servidor
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hora del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerTime'
 */
router.get("/server-time", authenticateToken, configController.getServerTime);
/**
 * @openapi
 * /api/configs/validate-closure:
 *   get:
 *     summary: Validar si una fecha puede cerrar el periodo contable
 *     tags: [Configs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Resultado de la validacion de cierre
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
router.get(
  "/validate-closure",
  authenticateToken,
  authorizeAdmin,
  configController.validateClosure,
);

/**
 * @openapi
 * /api/configs:
 *   get:
 *     summary: Listar configuraciones del sistema
 *     tags: [Configs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de configuraciones
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
 *                     $ref: '#/components/schemas/ConfigEntry'
 */
router.get("/", authenticateToken, configController.listConfigs);

/**
 * @openapi
 * /api/configs/{key}:
 *   get:
 *     summary: Obtener una configuración por llave
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Entrada de configuración
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConfigEntry'
 */
router.get("/:key", authenticateToken, configController.getConfig);

/**
 * @openapi
 * /api/configs/{key}:
 *   post:
 *     summary: Establecer una configuración por llave
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: key
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
 *             type: object
 *             properties:
 *               value:
 *                 type: any
 *     responses:
 *       200:
 *         description: Configuración guardada
 */
router.post(
  "/:key",
  authenticateToken,
  authorizeAdmin,
  validate(z.object({ value: z.unknown() })),
  configController.setConfig,
);

export default router;
