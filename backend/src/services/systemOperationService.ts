import { workCoordinator } from "./workCoordinator";
import { ConflictError } from "../utils/AppError";
import { SocketService } from "./socketService";

export type MaintenanceOperationType = "backup" | "restore" | "reset" | "seed";

type OperationState = {
  type: MaintenanceOperationType;
  actorUsername: string;
  maintenanceMode: boolean;
  message: string;
  startedAt: string;
};

class SystemOperationService {
  private finishing: Promise<void> | undefined;
  private releaseMaintenance: (() => Promise<void>) | undefined;
  private currentOperation: OperationState | null = null;

  async start(params: {
    type: MaintenanceOperationType;
    actorUsername: string;
    maintenanceMode: boolean;
    message: string;
  }): Promise<OperationState> {
    if (this.currentOperation) {
      throw new ConflictError(
        `Ya existe una operacion en curso: ${this.currentOperation.type}. Espera a que finalice antes de continuar.`,
      );
    }

    this.currentOperation = {
      ...params,
      startedAt: new Date().toISOString(),
    };

    try {
      this.releaseMaintenance = await workCoordinator.maintenance(params.type);
    } catch (error) {
      this.currentOperation = null;
      throw error;
    }

    SocketService.emitToAll("system:maintenance", {
      active: params.maintenanceMode,
      operation: params.type,
      message: params.message,
      startedAt: this.currentOperation.startedAt,
    });

    return this.currentOperation;
  }

  finish(): Promise<void> {
    if (this.finishing) return this.finishing;
    const previous = this.currentOperation;
    const release = this.releaseMaintenance;
    if (!previous) return Promise.resolve();
    this.finishing = (async () => {
      await release?.();
      this.releaseMaintenance = undefined;
      this.currentOperation = null;
      SocketService.emitToAll("system:maintenance", {
        active: false,
        operation: previous.type,
        message: `${previous.type} completed`,
        startedAt: previous.startedAt,
        finishedAt: new Date().toISOString(),
      });
    })().finally(() => {
      this.finishing = undefined;
    });
    return this.finishing;
  }

  getSnapshot(): OperationState | null {
    return this.currentOperation;
  }

  isMaintenanceModeActive(): boolean {
    return this.currentOperation?.maintenanceMode === true;
  }
}

export const systemOperationService = new SystemOperationService();
