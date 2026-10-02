import { employeeStatusEnum, isoDateSchema, numericString, syncAuditFields, z } from "./common";

export const EmployeeSchema = z
  .object({
    id: z.string().optional(),
    rut: z.string().min(8),
    name: z.string().min(2),
    position: z.string().optional(),
    department: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    emergencyContact: z.string().optional(),
    status: employeeStatusEnum.optional(),
    contractType: z.string().optional(),
    shiftPatternId: z.string().optional(),
    hireDate: isoDateSchema().optional(),
    terminationDate: z.string().nullable().optional(),
    address: z.string().optional(),
    commune: z.string().optional(),
    region: z.string().optional(),
    birthDate: isoDateSchema().optional(),
    gender: z.string().optional(),
    bankName: z.string().optional(),
    accountType: z.string().optional(),
    accountNumber: z.string().optional(),
    createUserAccount: z.boolean().optional(),
    ...syncAuditFields,
  })
  .openapi("Employee");

export const BulkEmployeeSchema = z.array(EmployeeSchema).openapi("BulkEmployee");

export const DepartmentSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(2),
    code: z.string().optional(),
    budget: z.number().optional(),
    managerId: z.string().optional(),
    isDeleted: z.boolean().optional(),
    syncStatus: z.string().optional(),
    lastModified: z.number().optional(),
  })
  .openapi("Department");

export const EmployeeQuerySchema = z.object({
  page: numericString.optional(),
  pageSize: numericString.optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  area: z.string().optional(),
  since: z.string().optional(),
});
