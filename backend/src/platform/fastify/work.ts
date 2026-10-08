import { AppError } from "../../utils/AppError";

type Scope = {
  refs: number;
  ended: boolean;
  done: Promise<void>;
  finish(): void;
  release?: () => Promise<void>;
  admission?: Promise<void>;
  admitted?: boolean;
};
/** Response completion/abort releases only transport ownership, never active work. */
export class HttpWork {
  private closing = false;
  private readonly scopes = new WeakMap<object, Scope>();
  private readonly active = new Set<Scope>();
  async enter(request: object, acquire: () => Promise<() => Promise<void>>): Promise<void> {
    if (this.closing) throw new AppError("Runtime cerrando", 503, "RUNTIME_CLOSING");
    let finish!: () => void;
    const scope: Scope = {
      refs: 1,
      ended: false,
      done: new Promise<void>((resolve) => {
        finish = resolve;
      }),
      finish: () => finish(),
    };
    this.scopes.set(request, scope);
    this.active.add(scope);
    try {
      await this.run(request, async () => {
        scope.release = await acquire();
      });
    } catch (error) {
      await this.end(request);
      throw error;
    }
  }
  attach(request: object, acquire: () => Promise<() => Promise<void>>): Promise<void> {
    const scope = this.scopes.get(request);
    if (!scope) return Promise.reject(new AppError("Runtime cerrando", 503, "RUNTIME_CLOSING"));
    return (scope.admission ??= this.run(request, async () => {
      scope.release = await acquire();
      scope.admitted = true;
    }));
  }
  admitted(request: object): boolean {
    return this.scopes.get(request)?.admitted === true;
  }
  has(request: object): boolean {
    return this.scopes.has(request);
  }
  async run<T>(request: object, task: () => T | Promise<T>): Promise<T> {
    const scope = this.scopes.get(request);
    if (!scope || !this.active.has(scope))
      throw new AppError("Runtime cerrando", 503, "RUNTIME_CLOSING");
    scope.refs++;
    try {
      return await task();
    } finally {
      await this.release(scope);
    }
  }
  private async release(scope: Scope): Promise<void> {
    if (--scope.refs !== 0) return;
    try {
      await scope.release?.();
    } finally {
      this.active.delete(scope);
      scope.finish();
    }
  }
  async end(request: object): Promise<void> {
    const scope = this.scopes.get(request);
    if (!scope || scope.ended) return;
    scope.ended = true;
    await this.release(scope);
  }
  closeAdmission(): void {
    this.closing = true;
  }
  async drain(): Promise<void> {
    this.closeAdmission();
    await Promise.all([...this.active].map((scope) => scope.done));
  }
}
