import { beforeEach, describe, expect, it, vi } from "vitest";

import { healthService } from "../../services/healthService";

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock("../../services/apiClient", () => ({
  request: (...args: unknown[]) => requestMock(...args),
  ApiHttpError: class ApiHttpError extends Error {},
}));

/**
 * Reader falso que emite chunks en orden: reproduce el corte de red que hace
 * el backend al mandar NDJSON por partes (un chunk puede terminar a mitad de
 * una linea JSON).
 */
const makeReader = (chunks: string[]) => {
  const encoded = chunks.map((chunk) => new TextEncoder().encode(chunk));
  let index = 0;
  return {
    read: async () => {
      if (index < encoded.length) {
        return { done: false, value: encoded[index++] };
      }
      return { done: true, value: undefined };
    },
  };
};

/** `Response` falsa cuyo cuerpo emite los chunks indicados. */
const makeStreamResponse = (chunks: string[]) =>
  ({
    body: {
      getReader: () => makeReader(chunks),
    },
  }) as unknown as Response;

/**
 * `clearDatabase` consume el stream NDJSON de progreso del reset maestro
 * (`DELETE /api/maintenance/clear-database` responde `sendProgressStream`).
 *
 * Lo que fija esta suite es el bug que rompia el flujo de reset:
 *
 * 1. El endpoint responde varias lineas JSON (progreso + resultado); leer el
 *    cuerpo como un unico JSON falla con "Unexpected non-whitespace character
 *    after JSON at position 91 (line 2 column 1)" y el reset nunca se
 *    confirma (sin recarga posterior).
 * 2. Un chunk puede cortar una linea JSON por la mitad: el buffer `pending`
 *    debe unirla antes de parsear.
 * 3. Si el stream reporta `{"error": "..."}`, el servicio debe lanzar ese
 *    error (el llamante lo muestra y no recarga).
 * 4. Una linea corrupta en medio no tumba el parseo de las demas.
 */
describe("healthService.clearDatabase (stream NDJSON)", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("resuelve sin lanzar cuando el stream confirma el reset", async () => {
    requestMock.mockResolvedValue(
      makeStreamResponse([
        '{"progress": "Iniciando reset..."}\n{"progress": "Limpiando..."}\n',
        '{"success": true}\n',
      ]),
    );

    await expect(healthService.clearDatabase()).resolves.toBeUndefined();
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({ method: "DELETE", responseType: "stream" }),
    );
  });

  it("une una linea JSON cortada por la mitad entre dos chunks", async () => {
    requestMock.mockResolvedValue(
      makeStreamResponse(['{"progress": "Inici', 'ando reset..."}\n{"success": true}\n']),
    );

    await expect(healthService.clearDatabase()).resolves.toBeUndefined();
  });

  it("lanza el error reportado por el stream", async () => {
    requestMock.mockResolvedValue(
      makeStreamResponse(['{"error": "Error critico al limpiar DB"}\n']),
    );

    await expect(healthService.clearDatabase()).rejects.toThrow("Error critico al limpiar DB");
  });

  it("ignora lineas corruptas y confirma con la linea de exito", async () => {
    requestMock.mockResolvedValue(makeStreamResponse(['basura-no-json\n{"success": true}\n']));

    await expect(healthService.clearDatabase()).resolves.toBeUndefined();
  });

  it("resuelve sin cuerpo (sin reader) sin lanzar", async () => {
    requestMock.mockResolvedValue({ body: null } as unknown as Response);

    await expect(healthService.clearDatabase()).resolves.toBeUndefined();
  });
});
