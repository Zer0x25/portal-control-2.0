import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../utils/AppError";
import { requestContext } from "../utils/context";
import { authenticateAccessToken } from "../services/authentication";
import { resolveAccessToken, type AuthUser } from "../modules/auth";

export interface AuthRequest extends Request {
  user?: AuthUser;
}
export type JwtPayload = AuthUser;

export const authenticateToken = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  try {
    const user = await authenticateAccessToken(
      resolveAccessToken(Array.isArray(header) ? header[0] : header, req.query.token),
    );
    req.user = user;
    return requestContext.run({ username: user.username }, () => next());
  } catch (error) {
    return next(error);
  }
};

export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "Administrador") {
    throw new ForbiddenError("Acceso denegado: Se requieren permisos de Administrador");
  }
  next();
};

export const authorizeElevated = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role !== "Administrador" && role !== "Supervisor_Elevado") {
    throw new ForbiddenError(
      "Acceso denegado: Se requieren permisos de nivel superior (Administrador o Supervisor Elevado)",
    );
  }
  next();
};

// Read-only access to audit logs for auditors (Fiscalizador) and elevated roles.
export const authorizeAuditViewer = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  const allowedRoles = ["Administrador", "Supervisor_Elevado", "Fiscalizador"];
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenError("Acceso denegado: Se requieren permisos de auditoría");
  }
  next();
};

export const authorizeSupervisor = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  const allowedRoles = ["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"];
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenError("Acceso denegado: Se requieren permisos de Supervisor o superior");
  }
  next();
};

export const authorizeCorrectionResolver = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const role = req.user?.role;
  const allowedRoles = ["Administrador", "Supervisor_Elevado", "Supervisor"];
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenError(
      "Acceso denegado: Solo Supervisor, Supervisor Elevado o Administrador pueden resolver correcciones",
    );
  }
  next();
};

export const authorizeMasterDataExporter = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const role = req.user?.role;
  const allowedRoles = ["Administrador", "Fiscalizador"];
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenError(
      "Acceso denegado: Se requieren permisos de Administrador o Fiscalizador",
    );
  }
  next();
};

export const authorizeKiosk = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  const allowedRoles = ["Administrador", "Supervisor_Elevado", "Supervisor", "Kiosk_Employee"];
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenError("Acceso denegado: Acción reservada para Kiosko o Supervisores");
  }
  next();
};
