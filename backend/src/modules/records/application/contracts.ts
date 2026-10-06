export type AnomalyResolution =
  "ABSENCE_MARK" | "SHIFT_HOURS_ACK" | "PERMIT_MARK" | "DAY_OFF_MARK" | "VACATION_MARK";
export interface RecordPrincipal {
  id: string;
  username: string;
  role: string;
  employeeId?: string | null;
}
export interface PunchInput {
  employeeId?: string;
  source?: string;
  forcedType?: string;
  latitude?: number;
  longitude?: number;
}
export interface RecordInput {
  id?: string;
  employeeId: string;
  employeeName: string;
  employeePosition?: string | null;
  employeeArea?: string | null;
  employeeWorkdayType?: string | null;
  date: string;
  entrada?: string | null;
  inicioColacion?: string | null;
  finColacion?: string | null;
  salida?: string | null;
  status?: string | null;
  source?: string | null;
  justification?: unknown;
}
export interface RecordQuery {
  page?: string | number;
  pageSize?: string | number;
  desde?: string;
  hasta?: string;
  name?: string;
  area?: string;
  workdayType?: string;
  status?: string;
  since?: string | number;
  employeeId?: string;
  showAnomalies?: string | boolean;
}
export interface ExportFilters {
  startDate: string;
  endDate: string;
  employeeId?: string;
  area?: string;
  cargo?: string;
}
export interface IntegrityFilters {
  employeeId?: string;
  from?: string;
  to?: string;
  limit?: number;
}
export interface IntegrityResult {
  checkedCount: number;
  brokenCount: number;
  broken: unknown[];
}
/** Infrastructure payloads remain inferred; application does not depend on Prisma DTOs. */
export interface RecordFlowDependencies<
  Row,
  View,
  List,
  Punch extends object,
  Verify extends IntegrityResult,
  Export,
> {
  service: {
    isLocked(date: string): Promise<boolean>;
    lastPunch(id: string): Promise<{ updatedAt: Date } | null>;
    linkedEmployee(id: string): Promise<{ employeeId: string | null } | null>;
    punch(
      user: RecordPrincipal,
      employeeId: string,
      source?: string,
      forcedType?: string,
      latitude?: number,
      longitude?: number,
    ): Promise<Punch>;
    list(query: RecordQuery, user?: RecordPrincipal): Promise<List>;
    save(input: RecordInput, actor: string): Promise<Row>;
    enrich(row: Row): Promise<View>;
    bulk(input: RecordInput[], actor: string): Promise<number>;
    delete(id: string, actor: string): Promise<void>;
    autoClose(): Promise<number>;
    verify(filters: IntegrityFilters): Promise<Verify>;
    resolve(id: string, resolution: AnomalyResolution, actor: string): Promise<View>;
    export(filters: ExportFilters): Promise<Export>;
  };
  now(): Date;
  businessDate(now: Date): string;
  withoutTriggers<T>(run: () => Promise<T>): Promise<T>;
  audit(entry: {
    actorUsername: string;
    action: string;
    category: string;
    severity: "INFO";
    details: Record<string, unknown>;
  }): Promise<void>;
  emit(event: string, payload: unknown): void;
}
