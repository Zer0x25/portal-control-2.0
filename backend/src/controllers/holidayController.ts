import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { holidayService } from "../services/HolidayService";
import { asyncHandler } from "../middleware/errorHandler";
import { ValidationError } from "../utils/AppError";

export const getHolidays = asyncHandler(async (req: Request, res: Response) => {
  const since = req.query.since as string | undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;
  const search = req.query.search as string | undefined;
  const showArchived = req.query.showArchived === "true";
  const holidays = await holidayService.getHolidays({
    since,
    page,
    pageSize,
    search,
    showArchived,
  });
  res.json(holidays);
});

export const syncExternalHolidays = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = req.body.year ? Number(req.body.year) : undefined;
  const actorUsername = req.user?.username || "System";
  const result = await holidayService.syncExternalHolidays(year, actorUsername);
  res.json(result);
});

export const createHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const actorUsername = req.user?.username || "System";
  const holiday = await holidayService.upsertHoliday(req.body, actorUsername);
  res.status(201).json(holiday);
});

export const deleteHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!id || typeof id !== "string") throw new ValidationError("ID inválido");

  const actorUsername = req.user?.username || "System";
  await holidayService.deleteHoliday(id, actorUsername);
  res.status(204).send();
});

export const createBulkHolidays = asyncHandler(async (req: AuthRequest, res: Response) => {
  const actorUsername = req.user?.username || "System";
  const count = await holidayService.bulkUpsertHolidays(req.body, actorUsername);
  res.status(201).json({ count });
});
