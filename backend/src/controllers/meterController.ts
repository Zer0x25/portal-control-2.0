import { Request, Response, NextFunction } from "express";
import { MeterReadingSchema } from "../models/schemas/meter.schemas";
import { MeterService } from "../services/MeterService";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";

/**
 * Obtiene lecturas de medidores con soporte de filtros y paginación.
 */
export const getMeterReadings = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { since, page, pageSize, meterId, startDate, endDate } = req.query;

    const result = await MeterService.list({
      since: since as string,
      page: page as string,
      pageSize: pageSize as string,
      meterId: meterId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    if (result.isPaginated) {
      res.json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      });
    } else {
      res.json({
        success: true,
        data: result.items,
      });
    }
  },
);

/**
 * Registra lecturas de medidores en lote con validación Zod.
 */
export const createMeterReading = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    // Validación estricta con Zod para el array de lecturas
    const BulkMeterReadingSchema = z.array(MeterReadingSchema);
    const validatedReadings = BulkMeterReadingSchema.parse(req.body);

    const enriched = await MeterService.bulkCreate(validatedReadings);

    res.status(201).json({
      success: true,
      data: enriched,
    });
  },
);
