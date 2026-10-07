import request from "supertest";
import type { FastifyInstance } from "fastify";
import expressApp from "../../../src/app";
export function httpClient(
  server: "Express" | "Fastify",
  getFastify: () => FastifyInstance,
  getToken: () => string,
  getHeaders: () => Record<string, string> = () => ({}),
) {
  return async (
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    body?: unknown,
    token: string | null = getToken(),
    binary = false,
  ) => {
    const headers = { ...getHeaders(), ...(token ? { authorization: `Bearer ${token}` } : {}) };
    if (server === "Fastify") {
      const response = await getFastify().inject({
        method,
        url,
        headers,
        ...(body !== undefined
          ? {
              payload: JSON.stringify(body),
              headers: { ...headers, "content-type": "application/json" },
            }
          : {}),
      });
      return {
        status: response.statusCode,
        body: binary ? response.rawPayload : response.body ? response.json() : undefined,
        text: response.body,
        headers: response.headers,
        bytes: response.rawPayload,
      };
    }
    let call = request(expressApp)
      [method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete"](url)
      .set(headers);
    if (body !== undefined) call = call.type("json").send(JSON.stringify(body));
    if (binary)
      call = call.buffer(true).parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => done(null, Buffer.concat(chunks)));
        res.on("error", done);
      });
    const response = await call;
    return {
      status: response.status,
      body: response.body,
      text: response.text,
      headers: response.headers,
      bytes: binary ? (response.body as Buffer) : Buffer.from(response.text || ""),
    };
  };
}
