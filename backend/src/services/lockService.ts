import { workCoordinator } from "./workCoordinator";

/** Distributed ownership retained until the actual task finishes; never expires. */
export const LockService = {
  async withLock<T>(
    key: string,
    task: () => Promise<T>,
  ): Promise<{ ran: true; result: T } | { ran: false; reason: "LOCKED" }> {
    return workCoordinator.run(`locked:${key}`, async () => {
      const result = await workCoordinator.exclusive(key, task);
      return result.ran ? { ran: true, result: result.value } : { ran: false, reason: "LOCKED" };
    });
  },
};
