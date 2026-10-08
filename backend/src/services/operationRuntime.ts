import { ConflictError } from "../utils/AppError";

/** Tracks application promises even after the HTTP response has ended. */
export class OperationRuntime {
  private closing = false;
  private readonly active = new Set<Promise<unknown>>();

  openRuntime(): void {
    if (this.active.size) throw new ConflictError("Operaciones aún están drenando");
    this.closing = false;
  }

  closeAdmission(): void {
    this.closing = true;
  }

  run<T>(task: () => T | Promise<T>): Promise<T> {
    if (this.closing) return Promise.reject(new ConflictError("Runtime cerrando"));
    const pending = Promise.resolve().then(task);
    this.active.add(pending);
    return pending.finally(() => this.active.delete(pending));
  }

  wrap<A extends unknown[], T>(task: (...args: A) => T | Promise<T>) {
    return (...args: A) => this.run(() => task(...args));
  }

  async drain(): Promise<void> {
    this.closeAdmission();
    await Promise.allSettled(this.active);
  }
}

export const operationRuntime = new OperationRuntime();
