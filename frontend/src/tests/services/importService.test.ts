import { afterEach, beforeEach, expect, it } from "vitest";
import { authTokenStore } from "../../services/authToken";
import { importService } from "../../services/importService";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("importService sobre apiClient (spec 034 T2)", () => {
  beforeEach(() => {
    authTokenStore.setToken("fixture");
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("serializa el mapeo real de empleados y la metadata requerida", async () => {
    let capturedText = "";
    server.use(
      http.post("http://localhost:4000/api/import/preview", async ({ request }) => {
        capturedText = await request.text();
        return HttpResponse.json({ rows: [{ id: "001" }], total: 1 });
      }),
    );

    const result = await importService.previewImport(new File(["fixture"], "employees.xlsx"), {
      ID: { prop: "id", type: String, required: true },
    });

    expect(capturedText).toContain('"type":"String"');
    expect(capturedText).toContain("filename");
    expect(result.rows[0].id).toBe("001");
  });

  it("envia el archivo como multipart sin Content-Type manual (spec 034 T2)", async () => {
    let capturedContentType: string | null = null;
    server.use(
      http.post("http://localhost:4000/api/import/preview", async ({ request }) => {
        capturedContentType = request.headers.get("content-type");
        return HttpResponse.json({ rows: [], total: 0 });
      }),
    );

    await importService.previewImport(new File(["fixture"], "employees.xlsx"));

    // El boundary lo fija el transporte (no el cliente): enviarlo a mano rompe el upload.
    expect(capturedContentType).toMatch(/boundary=/);
  });
});
