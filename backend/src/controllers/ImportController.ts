import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { importExportFlows } from "../services/importExportFlows";
export const previewImport = asyncHandler(async (req: Request, res: Response) => {
  res.json(await importExportFlows.preview(req.file?.buffer, req.body?.schema));
});
