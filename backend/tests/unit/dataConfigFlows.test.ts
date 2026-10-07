import { expect, it, vi } from "vitest";
import { createMeterFlows } from "../../src/modules/meters";
import { createNoteFlows } from "../../src/modules/notes";
import { createConfigFlows } from "../../src/modules/configs";
it("meters preserve optional pagination and parse whole batch before effects", async () => {
  const list = vi.fn(async () => ({
    items: [{ id: "r" }],
    isPaginated: true,
    total: 3,
    page: 2,
    totalPages: 2,
  }));
  const create = vi.fn();
  const parse = vi.fn(() => {
    throw new Error("invalid 51st");
  });
  const flow = createMeterFlows({ list, create, parse });
  expect(await flow.list({ page: "2", pageSize: "2" })).toEqual({
    success: true,
    data: [{ id: "r" }],
    pagination: { total: 3, page: 2, totalPages: 2 },
  });
  await expect(flow.create(Array.from({ length: 51 }, () => ({ value: 1 })))).rejects.toThrow(
    "invalid 51st",
  );
  expect(create).not.toHaveBeenCalled();
});
it("notes project parsed fields, enforce path ID and retain delete response", async () => {
  const create = vi.fn(async (v) => v),
    remove = vi.fn();
  const flow = createNoteFlows({
    list: vi.fn(),
    create,
    archive: vi.fn(),
    remove,
    parse: () => ({
      content: "note",
      authorUsername: "client",
      color: "blue",
      reminderEnabled: false,
      isArchived: true,
    }),
  });
  expect((await flow.create({})).data).toEqual({
    content: "note",
    authorUsername: "client",
    color: "blue",
    reminderEnabled: false,
  });
  await expect(flow.archive(undefined)).rejects.toMatchObject({ statusCode: 400 });
  expect(await flow.remove("n")).toEqual({ success: true, message: "Nota eliminada" });
  expect(remove).toHaveBeenCalledWith("n");
});
function configs() {
  const deps = {
    get: vi.fn(),
    list: vi.fn(),
    set: vi.fn(),
    time: vi.fn(),
    closure: vi.fn(),
    download: vi.fn(),
    removeFile: vi.fn(),
    now: () => "2026-10-06T12:00:00Z",
  };
  return { deps, flow: createConfigFlows(deps) };
}
it("configs preserve forbidden and closure-blocked translations with original failures", async () => {
  const { deps, flow } = configs();
  deps.get.mockRejectedValueOnce(new Error("FORBIDDEN"));
  await expect(flow.get("SMTP_CONFIG", "Usuario")).rejects.toMatchObject({
    statusCode: 403,
    message: "Acceso denegado",
  });
  deps.set.mockRejectedValueOnce(new Error("LOCK_DATE_BLOCKED"));
  await expect(flow.set("accounting_lock_date", "2026-01-01", "admin")).rejects.toMatchObject({
    statusCode: 400,
    code: "LOCK_DATE_BLOCKED",
  });
  const failure = new Error("disk failure");
  deps.set.mockRejectedValueOnce(failure);
  await expect(flow.set("x", 1)).rejects.toBe(failure);
  await expect(flow.closure(undefined)).rejects.toMatchObject({ statusCode: 400 });
});
it("policy persists new metadata before deleting old file and uses injected clock/actor", async () => {
  const { deps, flow } = configs();
  deps.get.mockResolvedValue({ filename: "old.pdf" });
  const file = {
    filename: "new.pdf",
    originalName: "Policy.pdf",
    size: 20,
    mimeType: "application/pdf",
  };
  const response = await flow.upload(file, "admin");
  expect(deps.set).toHaveBeenCalledWith(
    "company_policy_meta",
    { ...file, uploadedAt: "2026-10-06T12:00:00Z", uploadedBy: "admin" },
    "admin",
  );
  expect(deps.set.mock.invocationCallOrder[0]).toBeLessThan(
    deps.removeFile.mock.invocationCallOrder[0],
  );
  expect(deps.removeFile).toHaveBeenCalledWith("old.pdf");
  expect(response.url).toBe("/api/configs/public/company-policy/file");
  deps.set.mockRejectedValueOnce(new Error("db failed"));
  deps.removeFile.mockClear();
  await expect(flow.upload(file, "admin")).rejects.toThrow("db failed");
  expect(deps.removeFile).not.toHaveBeenCalled();
});
