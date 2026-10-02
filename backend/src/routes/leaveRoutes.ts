import { Router } from "express";
import * as leaveController from "../controllers/leaveController";
import { authenticateToken, authorizeSupervisor } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { LeaveRecordSchema, LeaveQuerySchema } from "../models/schemas/leave.schemas";

const router = Router();

/**
 * @openapi
 * /api/leaves:
 *   get:
 *     summary: Obtiene lista de ausencias/permisos
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Timestamp para obtener ausencias desde una fecha (ms)
 *       - in: query
 *         name: showArchived
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de ausencias obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedLeaveResponse'
 */
router.get(
  "/",
  authenticateToken,
  authorizeSupervisor,
  validate({ query: LeaveQuerySchema }),
  leaveController.getLeaves,
);

/**
 * @openapi
 * /api/leaves:
 *   post:
 *     summary: Registra una nueva ausencia o permiso
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaveRecord'
 *     responses:
 *       201:
 *         description: Ausencia registrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaveResponse'
 */
router.post(
  "/",
  authenticateToken,
  authorizeSupervisor,
  validate(LeaveRecordSchema),
  leaveController.createLeave,
);

/**
 * @openapi
 * /api/leaves/{id}:
 *   delete:
 *     summary: Elimina un registro de ausencia
 *     tags: [Leaves]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ausencia eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.delete("/:id", authenticateToken, authorizeSupervisor, leaveController.deleteLeave);

export default router;
