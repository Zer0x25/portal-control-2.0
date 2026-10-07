import type { FastifyInstance } from "fastify";
export function httpClient(
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
  };
}
