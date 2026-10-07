import { Router } from "express";
import * as userController from "../controllers/userController";
import { authenticateToken, authorizeAdmin } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserQuerySchema,
} from "../models/schemas/auth-user.schemas";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Users
 *   description: Gestión de usuarios y permisos
 */

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Lista todos los usuarios (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Timestamp para consulta delta
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Cantidad de items por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda (nombre o username)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filtro por rol
 *     responses:
 *       200:
 *         description: Lista de usuarios o respuesta paginada
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 */
router.get(
  "/",
  authenticateToken,
  authorizeAdmin,
  validate({ query: UserQuerySchema }),
  userController.getAllUsers,
);

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Crea un nuevo usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, role]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               employeeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post(
  "/",
  authenticateToken,
  authorizeAdmin,
  validate(CreateUserSchema),
  userController.createUser,
);

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     summary: Actualiza un usuario existente
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUser'
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  validate(UpdateUserSchema),
  userController.updateUser,
);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     summary: Elimina un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Usuario eliminado
 */
router.delete("/:id", authenticateToken, authorizeAdmin, userController.deleteUser);

export default router;
