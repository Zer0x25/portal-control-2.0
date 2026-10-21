/**
 * Helpers para los tests de service.
 *
 * Los services usan `apiClient`, que lee `response.headers` y distingue el
 * modo JSON del binario: un mock parcial (`{ ok: true, json: async () => ... }`)
 * rompe el cliente. Estos helpers construyen `Response` reales.
 */

/** Respuesta JSON con `content-type: application/json`. */
export const jsonResponse = (body: unknown, status = 200, headers: HeadersInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

/** Respuesta con cuerpo de texto plano. */
export const textResponse = (body: string, status = 200, headers: HeadersInit = {}): Response =>
  new Response(body, { status, headers: { "content-type": "text/plain", ...headers } });

/** Respuesta binaria (PDF/XLSX). */
export const binaryResponse = (
  body: BodyInit,
  contentType = "application/pdf",
  headers: HeadersInit = {},
): Response =>
  new Response(body, { status: 200, headers: { "content-type": contentType, ...headers } });
