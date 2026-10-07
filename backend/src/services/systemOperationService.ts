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
  private currentOperation: OperationState | null = null;

  start(params: {
    type: MaintenanceOperationType;
    actorUsername: string;
    maintenanceMode: boolean;
    message: string;
  }): OperationState {
    if (this.currentOperation) {
      throw new ConflictError(
        `Ya existe una operacion en curso: ${this.currentOperation.type}. Espera a que finalice antes de continuar.`,
      );
    }

    this.currentOperation = {
      ...params,
      startedAt: new Date().toISOString(),
    };

    SocketService.emitToAll("system:maintenance", {
      active: params.maintenanceMode,
      operation: params.type,
      message: params.message,
      startedAt: this.currentOperation.startedAt,
    });

    return this.currentOperation;
  }

  finish(): void {
    const previous = this.currentOperation;
    this.currentOperation = null;

    if (!previous) return;

    SocketService.emitToAll("system:maintenance", {
      active: false,
      operation: previous.type,
      message: `${previous.type} completed`,
      startedAt: previous.startedAt,
      finishedAt: new Date().toISOString(),
    });
  }

  getSnapshot(): OperationState | null {
    return this.currentOperation;
  }

  isMaintenanceModeActive(): boolean {
    return this.currentOperation?.maintenanceMode === true;
  }
}

export const systemOperationService = new SystemOperationService();
