import { randomUUID } from "node:crypto";
import { withDirectTransaction, prismaDirect } from "./db";
import { requestContext } from "../utils/context";
import { AppError, ConflictError } from "../utils/AppError";

type Scope = { id: string; refs: number; done: Promise<void>; finish(): void };
export type WorkLease = { id: string; release(): Promise<void> };

/** Persistent, fail-closed ownership. No expiry can outrun an application motor. */
export class WorkCoordinator {
  readonly owner = randomUUID();
  private closing = false;
  private readonly scopes = new Map<string, Scope>();

  openRuntime(): void {
    if (this.scopes.size) throw new ConflictError("Trabajo aún drenando");
    this.closing = false;
  }
  closeAdmission(): void {
    this.closing = true;
  }
  private current(): Scope | undefined {
    const id = requestContext.getStore()?.runtimeWork?.id;
    return id ? this.scopes.get(id) : undefined;
  }
  async enter(label: string): Promise<WorkLease> {
    if (this.closing) throw new AppError("Runtime cerrando", 503, "RUNTIME_CLOSING");
    const id = randomUUID();
    let finish!: () => void;
    const scope: Scope = {
      id,
      refs: 1,
      done: new Promise<void>((resolve) => {
        finish = resolve;
      }),
      finish: () => finish(),
    };
    this.scopes.set(id, scope);
    try {
      await withDirectTransaction(async (tx) => {
        const gate = await tx.$queryRaw<
          { maintenance_permit: string | null }[]
        >`SELECT maintenance_permit FROM portal_runtime.gate WHERE id = 1 FOR SHARE`;
        if (gate.length !== 1) throw new Error("Runtime gate missing");
        if (gate[0].maintenance_permit)
          throw new AppError("Sistema en mantenimiento", 503, "MAINTENANCE_MODE");
        await tx.$executeRaw`INSERT INTO portal_runtime.permits (id, owner, label) VALUES (${id}::uuid, ${this.owner}::uuid, ${label})`;
      });
    } catch (error) {
      this.scopes.delete(id);
      finish();
      throw error;
    }
    const context = requestContext.getStore();
    if (context)
      context.runtimeWork = { id, run: <T>(task: () => Promise<T>) => this.retain(scope, task) };
    let released = false;
    return {
      id,
      release: async () => {
        if (released) return;
        released = true;
        await this.release(scope);
      },
    };
  }
  private async release(scope: Scope): Promise<void> {
    if (--scope.refs !== 0) return;
    try {
      await prismaDirect.$executeRaw`DELETE FROM portal_runtime.permits WHERE id = ${scope.id}::uuid AND owner = ${this.owner}::uuid AND NOT EXISTS (SELECT 1 FROM portal_runtime.gate WHERE maintenance_permit = ${scope.id}::uuid)`;
    } finally {
      // A failed DELETE leaves persistent ownership and therefore fails closed.
      this.scopes.delete(scope.id);
      scope.finish();
    }
  }
  private async retain<T>(scope: Scope, task: () => Promise<T>): Promise<T> {
    if (!this.scopes.has(scope.id))
      throw new AppError("Permiso de trabajo finalizado", 503, "RUNTIME_CLOSING");
    scope.refs++;
    try {
      return await task();
    } finally {
      await this.release(scope);
    }
  }
  run<T>(label: string, task: () => Promise<T>, independent = false): Promise<T> {
    const current = independent ? undefined : this.current();
    if (current) return this.retain(current, task);
    return requestContext.run(
      { ...requestContext.getStore(), runtimeWork: undefined },
      async () => {
        const lease = await this.enter(label);
        try {
          return await task();
        } finally {
          await lease.release();
        }
      },
    );
  }
  async maintenance(operation: string, waitMs = 10000): Promise<() => Promise<void>> {
    const current = this.current();
    const own = current ? undefined : await this.enter(`maintenance:${operation}`);
    const id = current?.id ?? own?.id;
    if (!id) throw new Error("Missing maintenance admission");
    let claimed = false;
    const release = async () => {
      if (claimed) {
        await prismaDirect.$executeRaw`UPDATE portal_runtime.gate SET maintenance_permit = NULL, operation = NULL WHERE id = 1 AND maintenance_permit = ${id}::uuid`;
        claimed = false;
        // Explicit finish can recover a retained claim after its HTTP frame ended.
        // Live scopes still own their permit until their remaining references settle.
        if (!this.scopes.has(id))
          await prismaDirect.$executeRaw`DELETE FROM portal_runtime.permits WHERE id = ${id}::uuid AND owner = ${this.owner}::uuid`;
      }
      await own?.release();
    };
    try {
      await withDirectTransaction(async (tx) => {
        const rows = await tx.$queryRaw<
          { maintenance_permit: string | null }[]
        >`SELECT maintenance_permit FROM portal_runtime.gate WHERE id = 1 FOR UPDATE`;
        if (rows.length !== 1) throw new Error("Runtime gate missing");
        if (rows[0].maintenance_permit) throw new ConflictError("Operación de sistema en curso");
        await tx.$executeRaw`UPDATE portal_runtime.gate SET maintenance_permit = ${id}::uuid, operation = ${operation} WHERE id = 1`;
      });
      claimed = true;
      const deadline = Date.now() + waitMs;
      for (;;) {
        const rows = await prismaDirect.$queryRaw<
          { busy: boolean }[]
        >`SELECT EXISTS (SELECT 1 FROM portal_runtime.permits WHERE id <> ${id}::uuid) AS busy`;
        if (!rows[0].busy) return release;
        if (Date.now() >= deadline)
          throw new ConflictError(
            "Trabajo activo impide iniciar mantenimiento; reintenta cuando termine",
          );
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    } catch (error) {
      await release();
      throw error;
    }
  }
  async exclusive<T>(
    key: string,
    task: () => Promise<T>,
  ): Promise<{ ran: true; value: T } | { ran: false }> {
    const scope = this.current();
    if (!scope) throw new Error("Exclusive work requires admission");
    const claimed = await prismaDirect.$queryRaw<
      { key: string }[]
    >`INSERT INTO portal_runtime.locks (key, permit_id) VALUES (${key}, ${scope.id}::uuid) ON CONFLICT (key) DO NOTHING RETURNING key`;
    if (claimed.length === 0) return { ran: false };
    try {
      return { ran: true, value: await task() };
    } finally {
      await prismaDirect.$executeRaw`DELETE FROM portal_runtime.locks WHERE key = ${key} AND permit_id = ${scope.id}::uuid`;
    }
  }
  async drain(): Promise<void> {
    this.closeAdmission();
    await Promise.all([...this.scopes.values()].map((scope) => scope.done));
  }
}
export const workCoordinator = new WorkCoordinator();
