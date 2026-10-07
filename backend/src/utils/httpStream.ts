import type { Writable } from "node:stream";
/** Minimal Excel output port. Native Fastify streams implement it. */
export type ExcelHttpStream = Writable & {
  readonly headersSent: boolean;
  setHeader(name: string, value: string): unknown;
  status(code: number): { json(body: { message: string }): unknown };
};
