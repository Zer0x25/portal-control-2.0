import {
  numericString,
  pageSizeString,
  positiveIntString,
  syncAuditFields,
  userRoleEnum,
  z,
} from "./common";

export const CreateUserSchema = z
  .object({
    username: z.string().min(3),
    password: z
      .string()
      .min(6)
      .refine((password) => password.trim().length > 0, {
        message: "La contraseña es requerida",
      }),
    role: userRoleEnum,
    employeeId: z.string().optional(),
  })
  .openapi("CreateUser");

export const UpdateUserSchema = z
  .object({
    username: z.string().trim().min(3).optional(),
    password: z.string().min(6).optional(),
    role: z.enum([...userRoleEnum.options, "Archivado"]).optional(),
    employeeId: z.string().nullable().optional(),
    mustChangePassword: z.boolean().optional(),
  })
  .openapi("UpdateUser");

export const UserSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    role: z.enum([...userRoleEnum.options, "Archivado"]),
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
  page: positiveIntString.optional(),
  pageSize: pageSizeString.optional(),
  since: numericString.optional(),
  search: z.string().optional(),
  role: z.string().optional(),
});

export const LoginSchema = z
  .object({
    username: z
      .string()
      .min(1, "El usuario es requerido")
      .refine((value) => value.trim().length > 0, {
        message: "El usuario es requerido",
      }),
    password: z.string().min(1, "La contraseña es requerida"),
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
    employeeId: z
      .string()
      .min(1, "El empleado es requerido")
      .refine((value) => value.trim().length > 0, {
        message: "El empleado es requerido",
      }),
    pin: z.string().regex(/^\d{4}$/, "El PIN debe contener exactamente 4 dígitos numéricos"),
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
