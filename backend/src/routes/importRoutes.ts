import { Router } from "express";
import multer from "multer";
import { previewImport } from "../controllers/ImportController";
import { authenticateToken, authorizeSupervisor } from "../middleware/authMiddleware";

const router = Router();
// Límite de archivo 50mb: conserva el techo histórico de payload de la app
// y acota el memoryStorage contra DoS (spec 002 H-02).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
});

/**
 * @openapi
 * /api/import/preview:
 *   post:
 *     summary: Previsualizar contenido de un archivo Excel
 *     tags: [Import]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               schema:
 *                 type: string
 *                 description: JSON string of the mapping schema
 *     responses:
 *       200:
 *         description: Datos extraídos del archivo
 */
router.post(
  "/preview",
  authenticateToken,
  authorizeSupervisor,
  upload.single("file"),
  previewImport,
);

export default router;
