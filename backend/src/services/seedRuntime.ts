import { ConflictError } from "../utils/AppError";

/** Owns the real phase-one task, independently of its HTTP response lifetime. */
export class SeedRuntime {
  private closing = false;
  private active: Promise<unknown> | undefined;

  openRuntime(): void {
    if (this.active) throw new ConflictError("Seeder aún está drenando");
    this.closing = false;
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    if (this.closing || this.active) {
      throw new ConflictError("Seeder no disponible: operación en curso o runtime cerrando.");
    }
    const pending = Promise.resolve().then(task);
    this.active = pending;
    return pending.finally(() => {
      if (this.active === pending) this.active = undefined;
    });
  }

  async drain(): Promise<void> {
    this.closing = true;
    await this.active?.catch(() => undefined);
  }
}

export const seedRuntime = new SeedRuntime();
