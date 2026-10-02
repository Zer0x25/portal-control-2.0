import { Syncable } from "./common";

export type AuditLogCategory =
  | "AUTH"
  | "USER_MGMT"
  | "SECURITY"
  | "SYSTEM"
  | "API"
  | "DATA"
  | "CONFIG"
  | "CTRL_HOURS"
  | "OPERATIONS";
export type AuditLogSeverity = "CRITICAL" | "HIGH" | "WARNING" | "INFO" | "LOW";
export type AuditLogOutcome = "SUCCESS" | "FAILURE" | "BLOCKED" | "ERROR";

export interface AuditLog extends Syncable {
  id: string;
  timestamp: string;
  actorUsername: string;
  action: string;
  details?: Record<string, unknown>;
  category?: AuditLogCategory;
  severity?: AuditLogSeverity;
  outcome?: AuditLogOutcome;
  ipAddress?: string;
  targetResource?: string;
}
