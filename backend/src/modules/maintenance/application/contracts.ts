export interface MaintenanceActor {
  id: string;
  username: string;
}
export interface MaintenanceOutput {
  start(): void;
  write(value: unknown): void;
  end(): void;
}
export interface SeedOptions {
  employees?: number;
  days?: number;
  basePatternsCount?: number;
  leaveRatio?: number;
  correctionRequestRatio?: number;
  shiftReportsPerDay?: number;
  quickNotesCount?: number;
}
export interface Phase2Options {
  days?: number;
  leaveRatio?: number;
  correctionRequestRatio?: number;
  batchSize?: number;
}
export interface MaintenanceDependencies {
  operations: {
    start(input: {
      type: "reset";
      actorUsername: string;
      maintenanceMode: boolean;
      message: string;
    }): unknown;
    finish(): void;
  };
  clear(options: {
    onProgress: (message: string) => void;
    currentUser?: MaintenanceActor;
  }): Promise<unknown>;
  restart(reason: string): void;
  watchdog(onTimeout: () => void): { start(): void; stop(): void; heartbeat(): void };
  seedScope(run: () => Promise<void>): Promise<void>;
  seedPhase1(
    options: Required<SeedOptions>,
    progress: (message: string) => void,
    heartbeat: () => void,
  ): Promise<void>;
  createStoppedJob(actor: string, options: Required<Phase2Options>): Promise<unknown>;
  reportJobError(error: unknown): void;
  startJob(actor: string, options: Required<Phase2Options>): Promise<unknown>;
  pauseJob(id: string): Promise<unknown>;
  resumeJob(id: string): Promise<unknown>;
  stopJob(id: string): Promise<unknown>;
  status(id?: string): Promise<unknown>;
  logs(id: string, limit: number): Promise<unknown>;
}
