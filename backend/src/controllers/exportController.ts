import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { asyncHandler } from "../middleware/errorHandler";
import { importExportFlows } from "../services/importExportFlows";
function sendPdf(res: Response, file: { bytes: Buffer; filename: string }) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${file.filename}`);
  res.setHeader("Content-Length", file.bytes.length);
  res.send(file.bytes);
}
export const exportCalendarPDF = asyncHandler(async (req: AuthRequest, res: Response) => {
  const file = await importExportFlows.pdf("calendar", req.query, req.user);
  if (file.denied === false) sendPdf(res, file);
});
export const exportReportPDF = asyncHandler(async (req: AuthRequest, res: Response) => {
  const file = await importExportFlows.pdf("detailed", req.query, req.user);
  if (file.denied === true) return res.status(403).json({ message: file.message });
  sendPdf(res, file);
});
export const exportShiftReportPDF = asyncHandler(async (req: Request, res: Response) => {
  sendPdf(res, await importExportFlows.shiftPdf(req.params.id as string));
});
export const exportReportExcel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filters = await importExportFlows.prepareExcel(req.query, req.user);
  await importExportFlows.excel(res, filters);
});
