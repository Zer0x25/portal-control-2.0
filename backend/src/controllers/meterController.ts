import type { AuthRequest } from "../middleware/authMiddleware";
import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { meterFlows as flows } from "../services/meterFlows";
export const getMeterReadings = asyncHandler(async (req: Request, res: Response) => {
  const { since, page, pageSize, meterId, startDate, endDate } = req.query;
  res.json(
    await flows.list({
      since: since as string,
      page: page as string,
      pageSize: pageSize as string,
      meterId: meterId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    }),
  );
});
export const createMeterReading = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(201).json(await flows.create(req.body, req.user?.username || ""));
});
