export interface AdminActor {
  id?: string;
  username?: string;
}
export interface OperationPort {
  start(input: {
    type: "backup" | "restore" | "reset";
    actorUsername: string;
    maintenanceMode: boolean;
    message: string;
  }): unknown;
  finish(): void;
}
export interface AdminDependencies {
  stats(): Promise<unknown>;
  diagnosis(): Promise<unknown>;
  insights(): Promise<unknown>;
  snapshot(): unknown;
  autoClose(): Promise<number>;
  accountingClose(
    actor: string,
  ): Promise<{ applied: boolean; closureCandidate: string; currentLockDate: string | null }>;
  audit(entry: {
    actorUsername: string;
    action: string;
    category: string;
    severity: string;
    details: Record<string, unknown>;
  }): Promise<void>;
  resetPassword(username: string, password: string, actor: string): Promise<void>;
  purge(input: {
    username?: string;
    currentUserId?: string;
    actorUsername: string;
  }): Promise<{ deletedCount: number; target: string }>;
  operations: OperationPort;
  backup(): Promise<string>;
  backupSuccess(): void;
  backups(): unknown;
  restore(filename: string): Promise<void>;
  invalidate(input: {
    actorUsername: string;
    reason: string;
    restartRecommended: boolean;
  }): Promise<{ deletedCount: number }>;
  restart(reason: string): void;
}
export interface AdminResponse {
  success: boolean;
  data: Record<string, unknown>;
}
export type AdminRespond = (body: AdminResponse) => void;
