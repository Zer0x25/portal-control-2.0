export type EmployeeStatus = "Activo" | "Archivado";
export interface EmployeeRow {
  id: string;
  name: string;
  rut: string;
  email: string | null;
  position: string;
  area: string;
  workdayType: string;
  status: EmployeeStatus;
  pin: string | null;
  isPinBlocked: boolean;
  pinFailedAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface EmployeeCreateInput {
  id?: string;
  name: string;
  rut: string;
  email?: string | null;
  position: string;
  area: string;
  workdayType: string;
  status?: string;
  pin?: string | null;
  createUserAccount?: boolean;
}
export interface EmployeeUpdateInput {
  name?: string;
  email?: string | null;
  position?: string;
  area?: string;
  workdayType?: string;
  status?: string;
  pin?: string | null;
  isPinBlocked?: boolean;
  pinFailedAttempts?: number;
  createUserAccount?: boolean;
}
export type EmployeeBulkInput = EmployeeCreateInput & { id: string };
export type EmployeeQuery = Record<string, unknown>;
export interface EmployeePrincipal {
  role?: string;
  employeeId?: string | null;
}
export interface LinkedUserInput {
  employeeId: string;
  fullName: string;
}
export type PublicEmployee = Omit<EmployeeRow, "pin">;
export interface EmployeeTransaction {
  create(input: EmployeeCreateInput & { id: string }): Promise<EmployeeRow>;
  ensureUser(input: LinkedUserInput, actor: string): Promise<void>;
}
export interface EmployeeFlowDependencies {
  repository: {
    list(
      query: EmployeeQuery,
      user?: EmployeePrincipal,
      kiosk?: boolean,
    ): Promise<{ rawEmployees: EmployeeRow[]; total: number }>;
    resolveId(input?: string): Promise<string>;
    find(id: string): Promise<EmployeeRow | null>;
    update(id: string, input: EmployeeUpdateInput): Promise<EmployeeRow>;
    bulk(input: EmployeeBulkInput[], actor: string): Promise<number>;
  };
  transaction<T>(run: (tx: EmployeeTransaction) => Promise<T>): Promise<T>;
  withoutTriggers<T>(run: () => Promise<T>): Promise<T>;
  ensureUser(input: LinkedUserInput, actor: string): Promise<void>;
  syncStatus(
    id: string,
    oldStatus: EmployeeStatus,
    newStatus: EmployeeStatus,
    name: string,
    rut: string,
  ): Promise<void>;
  audit(entry: {
    actorUsername: string;
    action: string;
    category: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    details: Record<string, unknown>;
  }): Promise<void>;
  emit(payload: PublicEmployee | { count: number }): void;
}
