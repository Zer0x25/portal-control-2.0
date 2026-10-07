import { afterEach, expect, it, vi } from "vitest";
vi.mock("../../services/authService", () => ({
  authService: { getAuthHeader: () => ({ Authorization: "Bearer fixture" }) },
}));
import { importService } from "../../services/importService";
afterEach(() => vi.unstubAllGlobals());
it("serializes the actual employee mapping String constructor and required metadata", async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ rows: [{ id: "001" }], total: 1 }) });
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
