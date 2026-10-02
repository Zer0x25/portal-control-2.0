import express from "express";
import {
  getShiftPatterns,
  createShiftPattern,
  updateShiftPattern,
  deleteShiftPattern,
  getAssignedShifts,
  assignShift,
  updateAssignedShift,
  deleteAssignedShift,
  createBulkShiftPatterns,
  createBulkAssignedShifts,
  getEmployeeScheduleForDate,
  getScheduledEmployeesOnDate,
  getEmployeeMonthlySchedule,
  getCalendarMatrix,
  validateAssignmentConflicts,
} from "../controllers/shiftController";
import {
  getMonthlyPlan,
  createMonthlyPlan,
  getSuggestedPatternName,
} from "../controllers/monthlyShiftController";
import { authenticateToken, authorizeSupervisor } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  ShiftPatternSchema,
  BulkShiftPatternSchema,
  AssignedShiftSchema,
  BulkAssignedShiftSchema,
  CalendarMatrixRequestSchema,
  MonthlyPlanRequestSchema,
  ConflictValidationSchema,
  ShiftQuerySchema,
} from "../models/schemas/shift.schemas";

const router = express.Router();
router.use(authenticateToken);

/**
 * @openapi
 * tags:
 *   name: Shifts
 *   description: Gestión de turnos, patrones y programación de personal
 */

/**
 * @openapi
 * /api/shifts/patterns:
 *   get:
 *     summary: Obtiene los patrones de turno teóricos
 *     tags: [Shifts]
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *       - in: query
 *         name: showArchived
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de patrones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShiftPattern'
 */
router.get("/patterns", validate({ query: ShiftQuerySchema }), getShiftPatterns);

/**
 * @openapi
 * /api/shifts/patterns:
 *   post:
 *     summary: Crea un nuevo patrón de turno
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftPattern'
 *     responses:
 *       201:
 *         description: Patrón creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftPattern'
 */
router.post("/patterns", authorizeSupervisor, validate(ShiftPatternSchema), createShiftPattern);

/**
 * @openapi
 * /api/shifts/patterns/bulk:
 *   post:
 *     summary: Carga masiva de patrones de turno
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/ShiftPattern'
 *     responses:
 *       201:
 *         description: Resumen de carga
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 */
router.post(
  "/patterns/bulk",
  authorizeSupervisor,
  validate(BulkShiftPatternSchema),
  createBulkShiftPatterns,
);

/**
 * @openapi
 * /api/shifts/patterns/{id}:
 *   put:
 *     summary: Actualiza un patrón existente
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftPattern'
 *     responses:
 *       200:
 *         description: Patrón actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftPattern'
 */
router.put(
  "/patterns/:id",
  authorizeSupervisor,
  validate(ShiftPatternSchema.partial()),
  updateShiftPattern,
);

/**
 * @openapi
 * /api/shifts/patterns/{id}:
 *   delete:
 *     summary: Elimina un patrón de turno
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Patrón eliminado
 */
router.delete("/patterns/:id", authorizeSupervisor, deleteShiftPattern);

/**
 * @openapi
 * /api/shifts/assignments:
 *   get:
 *     summary: Obtiene turnos asignados a empleados
 *     tags: [Shifts]
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
 *       - in: query
 *         name: showArchived
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de asignaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssignedShift'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get("/assignments", validate({ query: ShiftQuerySchema }), getAssignedShifts);

/**
 * @openapi
 * /api/shifts/assignments:
 *   post:
 *     summary: Asigna un turno a un empleado
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignedShift'
 *     responses:
 *       201:
 *         description: Asignación creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssignedShift'
 */
router.post("/assignments", authorizeSupervisor, validate(AssignedShiftSchema), assignShift);

/**
 * @openapi
 * /api/shifts/assignments/bulk:
 *   post:
 *     summary: Asignación masiva de turnos
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/AssignedShift'
 *     responses:
 *       201:
 *         description: Resumen de asignaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 */
router.post(
  "/assignments/bulk",
  authorizeSupervisor,
  validate(BulkAssignedShiftSchema),
  createBulkAssignedShifts,
);

/**
 * @openapi
 * /api/shifts/assignments/{id}:
 *   put:
 *     summary: Actualiza una asignación de turno
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignedShift'
 *     responses:
 *       200:
 *         description: Asignación actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssignedShift'
 */
router.put(
  "/assignments/:id",
  authorizeSupervisor,
  validate(AssignedShiftSchema.partial()),
  updateAssignedShift,
);

/**
 * @openapi
 * /api/shifts/assignments/{id}:
 *   delete:
 *     summary: Elimina una asignación de turno
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Asignación eliminada
 */
router.delete("/assignments/:id", authorizeSupervisor, deleteAssignedShift);

// --- Scheduling Endpoints ---

/**
 * @openapi
 * /api/shifts/schedule/employee/{id}:
 *   get:
 *     summary: Obtiene horario de un empleado para una fecha
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Detalles del horario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleInfo'
 */
router.get("/schedule/employee/:id", getEmployeeScheduleForDate);

/**
 * @openapi
 * /api/shifts/schedule/employees-on-date:
 *   get:
 *     summary: Lista empleados programados en una fecha
 *     tags: [Shifts]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Lista de empleados programados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   employeeId:
 *                     type: string
 *                   employeeName:
 *                     type: string
 *                   shiftPatternName:
 *                     type: string
 *                   startTime:
 *                     type: string
 *                   endTime:
 *                     type: string
 *                   patternColor:
 *                     type: string
 */
router.get("/schedule/employees-on-date", authorizeSupervisor, getScheduledEmployeesOnDate);

/**
 * @openapi
 * /api/shifts/schedule/employee/{id}/month:
 *   get:
 *     summary: Obtiene horario mensual de un empleado
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Calendario mensual
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MonthlyScheduleView'
 */
router.get("/schedule/employee/:id/month", getEmployeeMonthlySchedule);

/**
 * @openapi
 * /api/shifts/schedule/matrix:
 *   post:
 *     summary: Genera matriz de calendario para vista grupal
 *     tags: [Shifts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               employeeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Matriz de horarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 additionalProperties:
 *                   $ref: '#/components/schemas/ScheduleInfo'
 */
router.post("/schedule/matrix", validate(CalendarMatrixRequestSchema), getCalendarMatrix);

/**
 * @openapi
 * /api/shifts/monthly-plan/{employeeId}/{year}/{month}:
 *   get:
 *     summary: Obtiene asistente de planificación mensual
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Planificación mensual actual
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MonthlyScheduleView'
 */
router.get("/monthly-plan/:employeeId/:year/:month", authorizeSupervisor, getMonthlyPlan);

/**
 * @openapi
 * /api/shifts/monthly-plan:
 *   post:
 *     summary: Guarda planificación mensual completa
 *     tags: [Shifts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: string
 *               month:
 *                 type: string
 *               year:
 *                 type: string
 *               patternName:
 *                 type: string
 *               dailySchedules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: integer
 *                     type:
 *                       type: string
 *                       enum: [work, rest]
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *                     hours:
 *                       type: number
 *     responses:
 *       200:
 *         description: Resultado de la operación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post(
  "/monthly-plan",
  authorizeSupervisor,
  validate(MonthlyPlanRequestSchema),
  createMonthlyPlan,
);

/**
 * @openapi
 * /api/shifts/suggest-pattern-name:
 *   get:
 *     summary: Sugiere nombres para nuevos patrones de turno
 *     tags: [Shifts]
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nombre sugerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuggestedPatternName'
 */
router.get("/suggest-pattern-name", authorizeSupervisor, getSuggestedPatternName);

/**
 * @openapi
 * /api/shifts/validate-conflicts:
 *   post:
 *     summary: Valida conflictos de solapamiento de turnos
 *     tags: [Shifts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               excludeAssignmentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resultado de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasConflicts:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 conflicts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssignedShift'
 */
router.post(
  "/validate-conflicts",
  authorizeSupervisor,
  validate(ConflictValidationSchema),
  validateAssignmentConflicts,
);

export default router;
