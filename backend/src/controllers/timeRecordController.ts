import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { recordFlows } from "../services/recordFlows";
import { asyncHandler } from "../middleware/errorHandler";
const actor = (req: AuthRequest) => req.user?.username || "SYSTEM";
const id = (req: AuthRequest) => (typeof req.params.id === "string" ? req.params.id : "");
export const punch = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await recordFlows.punch(req.body, req.user));
});
export const getAllRecords = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await recordFlows.list(req.query, req.user));
});
export const createOrUpdateRecord = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await recordFlows.save(req.body, actor(req)));
});
export const createBulkRecords = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await recordFlows.bulk(req.body, actor(req)));
});
export const deleteRecord = asyncHandler(async (req: AuthRequest, res: Response) => {
  await recordFlows.delete(id(req), actor(req));
  res.status(204).send();
});
export const triggerAutoClose = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json(await recordFlows.autoClose());
});
export const verifyIntegrity = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(
    await recordFlows.verify({
      employeeId: req.query.employeeId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }),
  );
});
export const resolveAnomaly = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await recordFlows.resolve(id(req), req.body.resolution, actor(req)));
});
export const exportMasterData = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { format, filters } = await recordFlows.prepareExport(req.query, req.user);
    if (format === "csv" || format === "xml" || format === "excel") {
      const { streamExportService } = await import("../services/export/StreamExportService");
      if (format === "csv") return await streamExportService.streamToCSV(res, filters);
      if (format === "xml") return await streamExportService.streamToXML(res, filters);
      return await streamExportService.streamToExcel(res, filters);
    }
    res.json(await recordFlows.exportJson(filters));
  } catch (error) {
    if (!res.headersSent) throw error;
    res.end();
  }
});
