import { afterEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { importService } from "../../services/importService";

afterEach(() => {
  vi.restoreAllMocks();
});

it("serializes the actual employee mapping String constructor and required metadata (MSW real network)", async () => {
  let capturedBodyText: string | null = null;

  server.use(
    http.post("*/api/import/preview", async ({ request }) => {
      capturedBodyText = await request.text();
      return HttpResponse.json({ rows: [{ id: "001" }], total: 1 });
    }),
  );

  const result = await importService.previewImport(new File(["fixture"], "employees.xlsx"), {
    ID: { prop: "id", type: String, required: true },
  });

  expect(capturedBodyText).not.toBeNull();
  expect(capturedBodyText).toContain('"prop":"id"');
  expect(capturedBodyText).toContain('"type":"String"');
  expect(capturedBodyText).toContain('"required":true');
  expect(result.rows[0].id).toBe("001");
});
