import { Syncable } from "./common";

export type UserRole =
  | "Usuario"
  | "Reloj_Control"
  | "Supervisor"
  | "Administrador"
  | "Supervisor_Elevado"
  | "Fiscalizador"
  | "Archivado";

export interface User extends Syncable {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  employeeId?: string;
  mustChangePassword?: boolean;
  mfaEnabled?: boolean;
}

export type EmployeeStatus = "Activo" | "Archivado";

export interface Employee extends Syncable {
  id: string;
  name: string;
  rut?: string;
  position: string;
  area: string;
  workdayType: string;
  status?: EmployeeStatus;
  email?: string;
  pin?: string;
  pinFailedAttempts?: number;
  isPinBlocked?: boolean;
}
