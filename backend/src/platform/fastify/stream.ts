import { PassThrough } from "node:stream";
import type { FastifyReply } from "fastify";
import type { ExcelHttpStream } from "../../utils/httpStream";
/** Reuses Writable exporters without an Express response or whole-file buffering. */
export async function sendHttpStream(
  reply: FastifyReply,
  headers: Record<string, string>,
  exportFile: (sink: ExcelHttpStream) => Promise<void>,
  fallbackMessage: string,
  errorResponse?: (
    error: unknown,
  ) => { statusCode: number; body: unknown } | Promise<{ statusCode: number; body: unknown }>,
) {
  reply.headers(headers);
  const output = new PassThrough();
  // reply.send(stream) captures headers before asynchronous exporters can set them.
  // Keep the native response in sync until the first byte commits the headers.
  const setHeader = (name: string, value: string) => {
    reply.header(name, value);
    if (!reply.raw.headersSent) reply.raw.setHeader(name, value);
  };
  const sink = Object.assign(output, {
    headersSent: false,
    setHeader,
    status: (code: number) => ({
      json: (body: { message: string }) => {
        reply.code(code);
        setHeader("Content-Type", "application/json; charset=utf-8");
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
      const response = await errorResponse?.(error);
      reply.code(response?.statusCode ?? 500);
      setHeader("Content-Type", "application/json; charset=utf-8");
      if (!output.writableEnded)
        output.end(JSON.stringify(response?.body ?? { message: fallbackMessage }));
    } else if (!output.writableEnded) output.end();
    reply.log.error({ err: error }, "HTTP export failed");
  }
  return reply;
}
