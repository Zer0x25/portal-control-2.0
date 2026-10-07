import { Request, Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { employeeFlows } from "../services/employeeFlows";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError } from "../utils/AppError";

export const getAllEmployees = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await employeeFlows.list(req.query, req.user));
});
export const createEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(201).json(await employeeFlows.create(req.body, req.user?.username || "SYSTEM"));
});
export const updateEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = typeof req.params.id === "string" ? req.params.id : "";
  res.json(await employeeFlows.update(id, req.body, req.user?.username || "SYSTEM"));
});
export const createBulkEmployees = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await employeeFlows.bulk(req.body, req.user?.username || "SYSTEM"));
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
