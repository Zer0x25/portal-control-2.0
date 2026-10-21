import { afterEach, expect, it, vi } from "vitest";
vi.mock("../../services/authService", () => ({
  authService: { getAuthHeader: () => ({ Authorization: "Bearer fixture" }) },
}));
import { importService } from "../../services/importService";
afterEach(() => vi.unstubAllGlobals());
it("serializes the actual employee mapping String constructor and required metadata", async () => {
  const request = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ rows: [{ id: "001" }], total: 1 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", request);
  const result = await importService.previewImport(new File(["fixture"], "employees.xlsx"), {
    ID: { prop: "id", type: String, required: true },
  });
  const body = request.mock.calls[0][1].body as FormData;
  expect(JSON.parse(body.get("schema") as string)).toEqual({
    ID: { prop: "id", type: "String", required: true },
  });
  expect(result.rows[0].id).toBe("001");
});

it("envia el archivo como multipart sin Content-Type manual (spec 034 T2)", async () => {
  const request = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ rows: [], total: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", request);

  await importService.previewImport(new File(["fixture"], "employees.xlsx"));

  const init = request.mock.calls[0][1] as RequestInit;
  expect(init.body).toBeInstanceOf(FormData);
  // El boundary lo fija el navegador: enviarlo a mano rompe el upload.
  expect(new Headers(init.headers).get("content-type")).toBeNull();
});
