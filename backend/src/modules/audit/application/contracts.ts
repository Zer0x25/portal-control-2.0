export interface AuditFilters {
  cursor?: string;
  actor?: string;
  action?: string;
  category?: string | string[];
  severity?: string | string[];
  outcome?: string | string[];
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  recordId?: string;
}
export interface AuditQuery extends AuditFilters {
  page?: string | number;
  pageSize?: string | number;
  since?: string;
  format?: string;
}
export interface AuditEntry {
  action: string;
  category: string;
  severity?: string;
  outcome?: string;
  details?: Record<string, unknown>;
}
export interface AuditSink {
  readonly headersSent: boolean;
  readonly writableEnded?: boolean;
  end(): unknown;
}
export interface AuditDependencies<List, Snapshot, Json, Sink extends AuditSink> {
  list(filters: AuditFilters & { page?: number; pageSize?: number }): Promise<List>;
  log(entry: AuditEntry & { actorUsername: string; ipAddress?: string }): Promise<void>;
  cleanup(months: number): Promise<{ count: number; cutoffDate: Date }>;
  snapshot(): Snapshot;
  verify(): Promise<void>;
  exportJson(filters: AuditQuery): Promise<Json>;
  exportStream(sink: Sink, filters: AuditQuery): Promise<void>;
}
