import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { userService } from "../services/UserService";
import { asyncHandler } from "../middleware/errorHandler";

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const { since, page, pageSize, search, role } = req.query;
  const authReq = req as AuthRequest;
  const requesterRole = authReq.user?.role;
  const requesterId = authReq.user?.id;

  const result = await userService.getAllUsers({
    since: since as string,
    requesterRole,
    requesterId,
    search: search as string,
    role: role as string,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  });

  if (result.isPaginated && requesterRole !== "Usuario") {
    res.json({
      data: result.users,
      pagination: {
        total: result.total,
        page: Number(page),
        totalPages: Math.ceil(result.total / Number(pageSize)),
      },
    });
  } else {
    res.json(result.users);
  }
});

export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const actorUsername = req.user?.username || "System";
  const user = await userService.createUser(req.body, actorUsername);
  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const actorUsername = req.user?.username || "System";
  const user = await userService.updateUser(id, req.body, actorUsername);
  res.json(user);
});

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const actorUsername = req.user?.username || "System";
  await userService.deleteUser(id, actorUsername);
  res.status(204).send();
});
