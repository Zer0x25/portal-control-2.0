import { Router } from "express";
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  createBulkEmployees,
  exportEmployees,
} from "../controllers/employeeController";
import { authenticateToken, authorizeSupervisor } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  EmployeeSchema,
  EmployeeQuerySchema,
  BulkEmployeeSchema,
} from "../models/schemas/employee.schemas";

const router = Router();

/**
 * @openapi
 * /api/employees/kiosk:
 *   get:
 *     summary: Obtiene lista de empleados para modo Kiosko
 *     tags: [Employees]
 */
router.get("/kiosk", getAllEmployees);

/**
 * @openapi
 * /api/employees:
 *   get:
 *     summary: Obtiene todos los empleados
 *     tags: [Employees]
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 */
router.get("/", authenticateToken, validate({ query: EmployeeQuerySchema }), getAllEmployees);

/**
 * @openapi
 * /api/employees:
 *   post:
 *     summary: Crea un nuevo empleado
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Empleado creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 */
router.post("/", authenticateToken, authorizeSupervisor, validate(EmployeeSchema), createEmployee);

/**
 * @openapi
 * /api/employees/bulk:
 *   post:
 *     summary: Importación masiva de empleados
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Empleados creados exitosamente
 */
router.post(
  "/bulk",
  authenticateToken,
  authorizeSupervisor,
  validate(BulkEmployeeSchema),
  createBulkEmployees,
);

/**
 * @openapi
 * /api/employees/{id}:
 *   put:
 *     summary: Actualiza un empleado existente
 *     tags: [Employees]
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
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       200:
 *         description: Empleado actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 */
router.put(
  "/:id",
  authenticateToken,
  authorizeSupervisor,
  validate(EmployeeSchema.partial()),
  updateEmployee,
);

/**
 * @openapi
 * /api/employees/export:
 *   get:
 *     summary: Exportar empleados en formato Excel/CSV
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Activo, Archivado]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo generado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get(
  "/export",
  authenticateToken,
  authorizeSupervisor,
  validate({ query: EmployeeQuerySchema }),
  exportEmployees,
);

export default router;
