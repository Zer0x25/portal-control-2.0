export interface RuntimeTimers {
  after(ms: number, task: () => void): () => void;
  every(ms: number, task: () => void): () => void;
  runTask?(task: () => Promise<unknown>): Promise<unknown>;
  reportError(error: unknown): void;
}

/** Owns timers and asynchronous work; no server, environment or global clock. */
export function createRuntimeLifecycle(ports: RuntimeTimers) {
  const cancel = new Set<() => void>();
  const active = new Set<Promise<void>>();
  let started = false;
  let stopping = false;
  let closing: Promise<void> | undefined;
  const run = (task: () => Promise<unknown>): Promise<void> => {
    if (stopping) return Promise.resolve();
    const pending = Promise.resolve()
      .then(() => (ports.runTask ? ports.runTask(task) : task()))
      .then(() => {}, ports.reportError);
    active.add(pending);
    void pending.finally(() => active.delete(pending));
    return pending;
  };
  const schedule = (ms: number, task: () => Promise<unknown>, repeat: boolean) => {
    if (stopping) return;
    let busy = false;
    const callback = () => {
      if (stopping || busy) return;
      busy = true;
      void run(task).finally(() => {
        busy = false;
      });
    };
    cancel.add((repeat ? ports.every : ports.after)(ms, callback));
  };
  return {
    run,
    after: (ms: number, task: () => Promise<unknown>) => schedule(ms, task, false),
    every: (ms: number, task: () => Promise<unknown>) => schedule(ms, task, true),
    wait(ms: number): Promise<boolean> {
      if (stopping) return Promise.resolve(false);
      return new Promise((resolve) => {
        const timer = ports.after(ms, () => {
          cancel.delete(stop);
          resolve(true);
        });
        const stop = () => {
          timer();
          resolve(false);
        };
        cancel.add(stop);
      });
    },
    start(setup: () => void) {
      if (started || stopping) return;
      started = true;
      setup();
    },
    stop(close: () => Promise<void>): Promise<void> {
      if (!closing) {
        stopping = true;
        for (const stop of cancel) stop();
        cancel.clear();
        closing = (async () => {
          await Promise.all(active);
          await close();
        })();
      }
      return closing;
    },
  };
}
