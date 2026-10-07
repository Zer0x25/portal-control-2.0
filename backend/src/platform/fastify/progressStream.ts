import { PassThrough } from "node:stream";
import type { FastifyReply } from "fastify";
import type { MaintenanceOutput } from "../../modules/maintenance";
export async function sendProgressStream(
  reply: FastifyReply,
  run: (out: MaintenanceOutput) => Promise<void>,
) {
  const stream = new PassThrough();
  const out: MaintenanceOutput = {
    start() {
      reply
        .headers({
          "Content-Type": "application/json",
          "Transfer-Encoding": "chunked",
          "X-No-Compression": "true",
        })
        .send(stream);
    },
    write(value) {
      stream.write(JSON.stringify(value) + "\n");
    },
    end() {
      stream.end();
    },
  };
  try {
    await run(out);
  } catch (error) {
    stream.destroy();
    throw error;
  }
  return reply;
}
