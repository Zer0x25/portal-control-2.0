import { beforeEach, describe, expect, it, vi } from "vitest";

import { seedPhase1 } from "../../services/seedingService";
import type { SeedingOptions } from "../../schemas/forms/seed";

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock("../../services/apiClient", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

/** Opciones validas del formulario de simulacion (siete numeros). */
const OPTIONS: SeedingOptions = {
  employees: 42,
  days: 30,
  basePatternsCount: 3,
  leaveRatio: 5,
  correctionRequestRatio: 3,
  shiftReportsPerDay: 1,
  quickNotesCount: 10,
};

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
 * Spec 036 T10b: `seedPhase1` lee el stream NDJSON de la fase 1 por chunks.
 *
 * Lo que fija esta suite es el parser de lineas, lo mas facil de romper en el
 * refactor del servicio:
 *
 * 1. Un chunk puede cortar una linea JSON por la mitad: el buffer `pending`
 *    debe unirla antes de parsear.
 * 2. La linea `{"success": true}` del final confirmar la fase; sin ella el
 *    servicio retorna error (no inventa exito).
 * 3. Si el stream termina sin exito, el error retornado es el ultimo
 *    `{"error": "..."}` recibido.
 * 4. Una linea corrupta en medio no tumba el parseo de las demas.
 */
describe("seedPhase1 (parser NDJSON)", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("emite el progreso de una linea cortada por la mitad entre dos chunks", async () => {
    requestMock.mockResolvedValue(
      makeStreamResponse(['{"progress": "Pa', 'rt 1"}\n{"success": true}\n']),
    );
    const onProgress = vi.fn();

    const result = await seedPhase1(OPTIONS, onProgress);

    expect(result).toEqual({ success: true });
    expect(onProgress).toHaveBeenCalledWith("Part 1");
    expect(onProgress).toHaveBeenCalledWith("Fase 1 completada en servidor.");
  });

  it("resuelve con success cuando la ultima linea lo confirma", async () => {
    requestMock.mockResolvedValue(
      makeStreamResponse(['{"progress": "Paso A"}\n', '{"success": true}\n']),
    );
    const onProgress = vi.fn();

    const result = await seedPhase1(OPTIONS, onProgress);

    expect(result).toEqual({ success: true });
    expect(onProgress).toHaveBeenCalledWith("Conectando con el servidor (Fase 1)...");
    expect(requestMock).toHaveBeenCalledWith({
      method: "POST",
      url: "/api/maintenance/seed/phase1",
      body: OPTIONS,
      responseType: "stream",
    });
  });

  it("retorna el ultimo error del stream cuando termina sin success", async () => {
    requestMock.mockResolvedValue(
      makeStreamResponse(['{"progress": "Paso A"}\n', '{"error": "Fallo X"}\n']),
    );
    const onProgress = vi.fn();

    const result = await seedPhase1(OPTIONS, onProgress);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Fallo X");
    expect(onProgress).toHaveBeenCalledWith("ERROR: Fallo X");
  });

  it("retorna el error generico cuando no hay success ni error en el stream", async () => {
    requestMock.mockResolvedValue(makeStreamResponse(['{"progress": "Paso A"}\n']));
    const onProgress = vi.fn();

    const result = await seedPhase1(OPTIONS, onProgress);

    expect(result.success).toBe(false);
    expect(result.error).toBe("El servidor no confirmó la finalización de Fase 1.");
  });

  it("una linea corrupta no rompe el parseo de las demas", async () => {
    requestMock.mockResolvedValue(
      makeStreamResponse([
        '{"progress": "Antes"}\n',
        '{"progress": "corr,upta<<<\n',
        '{"progress": "Despues"}\n',
        '{"success": true}\n',
      ]),
    );
    const onProgress = vi.fn();

    const result = await seedPhase1(OPTIONS, onProgress);

    expect(result).toEqual({ success: true });
    expect(onProgress).toHaveBeenCalledWith("Antes");
    expect(onProgress).toHaveBeenCalledWith("Despues");
    expect(onProgress).not.toHaveBeenCalledWith("corr,upta<<<");
  });

  it("retorna error cuando la respuesta no trae reader de flujo", async () => {
    requestMock.mockResolvedValue({ body: undefined } as unknown as Response);
    const onProgress = vi.fn();

    const result = await seedPhase1(OPTIONS, onProgress);

    expect(result.success).toBe(false);
    expect(onProgress).toHaveBeenCalledWith("ERROR: No se pudo inicializar el lector de flujo.");
  });

  it("retorna error de red sin lanzar", async () => {
    requestMock.mockRejectedValue(new Error("network down"));
    const onProgress = vi.fn();

    const result = await seedPhase1(OPTIONS, onProgress);

    expect(result.success).toBe(false);
    expect(result.error).toBe("network down");
    expect(onProgress).toHaveBeenCalledWith("ERROR: network down");
  });
});
