import { numericString, syncAuditFields, userRoleEnum, z } from "./common";

export const CreateUserSchema = z
  .object({
    username: z.string().min(3),
    password: z.string().min(6),
    role: userRoleEnum,
    employeeId: z.string().optional(),
  })
  .openapi("CreateUser");

export const UpdateUserSchema = z
  .object({
    username: z.string().min(3).optional(),
    password: z.string().min(6).optional(),
    role: userRoleEnum.optional(),
    employeeId: z.string().optional(),
  })
  .openapi("UpdateUser");

export const UserSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    role: z.enum([...userRoleEnum.options, "Archivado", "Reloj Control", "Supervisor Elevado"]),
    employeeId: z.string().nullable().optional(),
    mustChangePassword: z.boolean().optional(),
    mfaEnabled: z.boolean().optional(),
    lastLogin: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    ...syncAuditFields,
  })
  .strict()
  .openapi("User");

export const UserQuerySchema = z.object({
  page: numericString.optional(),
  pageSize: numericString.optional(),
  since: numericString.optional(),
  search: z.string().optional(),
  role: z.string().optional(),
});

export const LoginSchema = z
  .object({
    username: z.string(),
    password: z.string(),
  })
  .openapi("Login");

export const MFAVerifySchema = z
  .object({
    token: z.string().min(1, "Token es requerido"),
  })
  .openapi("MFAVerify");

export const MFALoginSchema = LoginSchema.extend({
  mfaToken: z.string().optional(),
}).openapi("MFALogin");

export const MFAValidateSchema = z
  .object({
    mfaToken: z.string().min(1, "MFA token es requerido"),
    code: z.string().min(6, "Código MFA es requerido").max(6),
  })
  .openapi("MFAValidate");

export const KioskLoginSchema = z
  .object({
    employeeId: z.string(),
    pin: z.string(),
  })
  .openapi("KioskLogin");

export const PurgeSessionsSchema = z
  .object({
    username: z.string().min(1).optional(),
  })
  .openapi("PurgeSessions");

export const ResetPasswordSchema = z
  .object({
    username: z.string().min(1),
    newPassword: z.string().min(6),
  })
  .openapi("ResetPassword");
