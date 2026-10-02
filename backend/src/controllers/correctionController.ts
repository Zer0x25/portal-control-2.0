import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { CorrectionService } from "../services/CorrectionService";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthError, NotFoundError, ValidationError } from "../utils/AppError";
import { toCaughtError } from "../utils/caughtError";

export const getCorrectionRequests = asyncHandler(async (req: Request, res: Response) => {
  const { since, limit, offset, status } = req.query;
  const user = (req as AuthRequest).user;

  const result = await CorrectionService.list(
    {
      since: since as string,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      status: status as string,
    },
    {
      role: user?.role || "Usuario",
      employeeId: user?.employeeId,
    },
  );

  res.json(result);
});

export const createCorrectionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const data = req.body;

  if (!user) {
    throw new AuthError("No autenticado");
  }

  try {
    const request = await CorrectionService.create(data, {
      id: user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId,
    });
    res.status(201).json(request);
  } catch (e: unknown) {
    const caught = toCaughtError(e);
    if (caught.message === "FORBIDDEN_OWNERSHIP") {
      return res.status(403).json({
        message: "Acceso denegado: Solo puede crear solicitudes para su propio registro.",
      });
    }
    throw e;
  }
});

export const updateCorrectionRequestStatus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") throw new ValidationError("ID inválido");

    if (!req.user) {
      throw new AuthError("No autenticado");
    }

    const { status, resolvedBy, rejectionReason } = req.body;

    try {
      const request = await CorrectionService.updateStatus(id, {
        status,
        resolvedBy: resolvedBy || req.user.username,
        rejectionReason,
        actorUsername: req.user.username,
        actorRole: req.user.role,
      });
      res.json(request);
    } catch (e: unknown) {
      const caught = toCaughtError(e);
      if (caught.message === "NOT_FOUND") {
        throw new NotFoundError("Solicitud no encontrada");
      }
      throw e;
    }
  },
);

export const getCorrectionStats = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;

  const result = await CorrectionService.getStats({
    role: user?.role || "Usuario",
    employeeId: user?.employeeId,
  });

  res.json(result);
});

export const getCorrectionRequestHistory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || typeof id !== "string") throw new ValidationError("ID inválido");

  const user = (req as AuthRequest).user;

  try {
    const result = await CorrectionService.getHistory(id, {
      role: user?.role || "Usuario",
      employeeId: user?.employeeId || undefined,
    });

    res.json({ data: result });
  } catch (e: unknown) {
    const caught = toCaughtError(e);
    if (caught.message === "NOT_FOUND") {
      throw new NotFoundError("Solicitud no encontrada");
    }
    throw e;
  }
});
