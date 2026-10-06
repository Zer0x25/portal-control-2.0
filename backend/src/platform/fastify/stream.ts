import { PassThrough } from "node:stream";
import type { FastifyReply } from "fastify";
import type { ExcelHttpStream } from "../../utils/httpStream";
/** Reuses Writable exporters without an Express response or whole-file buffering. */
export async function sendHttpStream(
  reply: FastifyReply,
  headers: Record<string, string>,
  exportFile: (sink: ExcelHttpStream) => Promise<void>,
  fallbackMessage: string,
) {
  reply.headers(headers);
  const output = new PassThrough();
  const sink = Object.assign(output, {
    headersSent: false,
    setHeader: (name: string, value: string) => reply.header(name, value),
    status: (code: number) => ({
      json: (body: { message: string }) => {
        reply.code(code);
        if (!output.writableEnded) output.end(JSON.stringify(body));
      },
    }),
  });
  Object.defineProperty(sink, "headersSent", { get: () => reply.raw.headersSent });
  const exporting = exportFile(sink);
  reply.send(output);
  try {
    await exporting;
  } catch (error) {
    if (!reply.raw.headersSent) {
      reply.code(500);
      if (!output.writableEnded) output.end(JSON.stringify({ message: fallbackMessage }));
    } else if (!output.writableEnded) output.end();
    reply.log.error({ err: error }, "HTTP export failed");
  }
  return reply;
}
