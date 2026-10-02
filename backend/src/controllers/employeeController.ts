import { Request, Response } from "express";
import { SocketService } from "../services/socketService";
import { requestContext } from "../utils/context";
import { auditService } from "../services/auditService";
import { employeeService } from "../services/EmployeeService";
import { userService } from "../services/UserService";
import { withDirectTransaction } from "../services/db";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError, NotFoundError } from "../utils/AppError";

export const getAllEmployees = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize } = req.query;
  const user = (req as { user?: { role?: string; employeeId?: string } }).user;
  const isPublicKiosk = !user;

  const { rawEmployees, total } = await employeeService.listEmployees(
    req.query,
    user,
    isPublicKiosk,
  );

  // Mapear al formato que espera el frontend y EXCLUIR el PIN por seguridad
  const mappedEmployees = rawEmployees.map((emp) => {
    const { pin, ...empWithoutPin } = emp;
    void pin;

    if (isPublicKiosk) {
      return {
        id: emp.id,
        name: emp.name,
        rut: emp.rut,
        isPinBlocked: emp.isPinBlocked,
        status: emp.status,
        area: emp.area,
      };
    }

    return {
      ...empWithoutPin,
      syncStatus: "synced",
      lastModified: emp.updatedAt.getTime(),
      isDeleted: false,
    };
  });

  const isPaginated = page !== undefined && pageSize !== undefined;
  if (isPaginated && !isPublicKiosk) {
    res.json({
      data: mappedEmployees,
      pagination: {
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    });
  } else {
    // Legacy or Kiosk response (array)
    res.json(mappedEmployees);
  }
});

export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const { createUserAccount, ...employeeData } = req.body;
  const resolvedId = await employeeService.resolveEmployeeId(employeeData.id);
  const actorUsername = (req as { user?: { username?: string } }).user?.username || "SYSTEM";

  const employee = await requestContext.run(
    { ...requestContext.getStore(), skipTrigger: true },
    async () => {
      const createdEmployee = await withDirectTransaction(
        async (tx) => {
          const employee = await employeeService.createEmployee(
            { ...employeeData, id: resolvedId },
            tx,
          );

          if (createUserAccount) {
            await userService.ensureEmployeeUser(
              {
                employeeId: employee.id,
                fullName: employee.name,
              },
              actorUsername,
              tx,
            );
          }

          return employee;
        },
        {
          // Production can be slower than local dev when hashing passwords and checking username collisions.
          timeout: 15000,
          maxWait: 5000,
        },
      );

      await auditService.log({
        actorUsername,
        action: "EMPLEADO_CREADO",
        category: "OPERATIONS",
        severity: "INFO",
        details: {
          employeeId: createdEmployee.id,
          employeeName: createdEmployee.name,
        },
      });

      return createdEmployee;
    },
  );

  if (!employee) throw new AppError("EMPLOYEE_NOT_CREATED", 500, "EMPLOYEE_NOT_CREATED");

  const { pin, ...employeeWithoutPin } = employee;
  void pin;
  res.status(201).json(employeeWithoutPin);

  // Notify real-time
  SocketService.emit("employee:updated", employeeWithoutPin);
});

export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { createUserAccount, ...employeeData } = req.body;

  // Obtener estado anterior para detectar cambios
  const oldEmployee = await employeeService.getEmployeeById(id);
  if (!oldEmployee) throw new NotFoundError("Empleado no encontrado");

  const updatedEmployee = await requestContext.run(
    { ...requestContext.getStore(), skipTrigger: true },
    async () => {
      const result = await employeeService.updateEmployee(id, employeeData);

      // Business Audit Log
      const actorUsername = (req as { user?: { username?: string } }).user?.username || "SYSTEM";

      // Detect specific actions for better audit context
      if (oldEmployee.status !== result.status) {
        await auditService.log({
          actorUsername,
          action: `EMPLEADO_ESTADO_CAMBIADO: ${result.status}`,
          category: "OPERATIONS",
          severity: "WARNING",
          details: {
            employeeId: result.id,
            employeeName: result.name,
            oldStatus: oldEmployee.status,
            newStatus: result.status,
          },
        });
      }

      // Detect PIN reset or change (security critical)
      if (employeeData.pin !== undefined && oldEmployee.pin !== result.pin) {
        await auditService.log({
          actorUsername,
          action: "EMPLEADO_PIN_ACTUALIZADO",
          category: "SEGURIDAD",
          severity: "CRITICAL",
          details: {
            employeeId: result.id,
            employeeName: result.name,
            isReset: employeeData.pin === null || employeeData.pin === undefined,
          },
        });
      }

      await auditService.log({
        actorUsername,
        action: "EMPLEADO_ACTUALIZADO",
        category: "OPERATIONS",
        severity: "INFO",
        details: {
          employeeId: result.id,
          employeeName: result.name,
          changes: employeeData,
        },
      });

      return result;
    },
  );

  if (createUserAccount && updatedEmployee.status !== "Archivado") {
    const actorUsername = (req as { user?: { username?: string } }).user?.username || "SYSTEM";
    await userService.ensureEmployeeUser(
      {
        employeeId: updatedEmployee.id,
        fullName: updatedEmployee.name,
      },
      actorUsername,
    );
  }

  // Lógica de Sincronización con Usuario y Asignaciones
  await employeeService.syncEmployeeStatus(
    id,
    oldEmployee.status,
    updatedEmployee.status,
    updatedEmployee.name,
    updatedEmployee.rut,
  );

  const { pin, ...employeeWithoutPin } = updatedEmployee;
  void pin;
  res.json(employeeWithoutPin);

  // Notify real-time
  SocketService.emit("employee:updated", employeeWithoutPin);
});

export const createBulkEmployees = asyncHandler(async (req: Request, res: Response) => {
  const employees = req.body;
  const actorUsername = (req as { user?: { username?: string } }).user?.username || "SYSTEM";

  const createdCount = await requestContext.run(
    { ...requestContext.getStore(), skipTrigger: true },
    () => employeeService.createBulkEmployees(employees, actorUsername),
  );

  res.json({ success: true, count: createdCount });

  // Batch Update Notify
  SocketService.emit("employee:updated", { count: createdCount });
});

export const exportEmployees = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { search, status, area } = req.query;
    const { streamExportService } = await import("../services/export/StreamExportService");

    return await streamExportService.streamEmployeesToExcel(res, {
      search: search as string,
      status: status as string,
      area: area as string,
    });
  } catch {
    if (!res.headersSent) {
      throw new AppError("Error al exportar empleados", 500, "EMPLOYEE_EXPORT_ERROR");
    } else {
      res.end();
    }
  }
});
