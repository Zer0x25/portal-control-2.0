import jwt from "jsonwebtoken";
import { AuthError } from "../../../utils/AppError";
import type { AuthUser } from "../application/authenticate";

export function verifyAccessToken(token: string, secret: string): AuthUser {
  const value: unknown = jwt.verify(token, secret);
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    !("username" in value) ||
    !("role" in value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.username !== "string" ||
    !value.username ||
    typeof value.role !== "string" ||
    !value.role ||
    ("employeeId" in value &&
      value.employeeId !== undefined &&
      value.employeeId !== null &&
      typeof value.employeeId !== "string")
  )
    throw new AuthError("Token inválido o malformado");
  return {
    id: value.id,
    username: value.username,
    role: value.role,
    employeeId:
      "employeeId" in value && typeof value.employeeId === "string" ? value.employeeId : null,
  };
}

export function resolveAccessToken(
  authorization: string | undefined,
  queryToken: unknown,
): string | undefined {
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : authorization?.split(" ")[1];
  return token || (typeof queryToken === "string" ? queryToken : undefined);
}
