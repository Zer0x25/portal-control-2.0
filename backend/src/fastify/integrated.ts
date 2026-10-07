import type { FastifyInstance } from "fastify";
import { SocketService } from "../services/socketService";
import { registerFastifyDocs } from "../platform/fastify/docs";

export interface IntegratedJobs {
  start(): Promise<void>;
  stop(): Promise<void>;
}
/** HTTP-only factories stay side-effect free; the executable opts into sockets/jobs. */
export function integrateFastifyRuntime(app: FastifyInstance, jobs: IntegratedJobs) {
  registerFastifyDocs(app);
  let attached = false;
  app.addHook("onReady", async () => {
    SocketService.initialize(app.server);
    attached = true;
    await jobs.start();
  });
  app.addHook("preClose", async () => {
    try {
      await jobs.stop();
    } finally {
      if (attached) await SocketService.close();
    }
  });
  return app;
}
