import { describe, it, expect, vi } from "vitest";
import { createAuditFlows } from "../../src/modules/audit/application/flows";
const fixture = () => ({
  list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  log: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn().mockResolvedValue({ count: 2, cutoffDate: new Date("2020-01-01Z") }),
  snapshot: vi.fn().mockReturnValue({ status: "ok" }),
  verify: vi.fn().mockResolvedValue(undefined),
  exportJson: vi.fn().mockResolvedValue([{ id: "a" }]),
  exportStream: vi.fn().mockResolvedValue(undefined),
});
describe("audit flows", () => {
  it("delegates list and snapshot without altering filters", async () => {
    const deps = fixture(),
      flows = createAuditFlows(deps);
    expect(
      await flows.list({ page: "2", pageSize: "10", since: "9", category: ["A", "B"] }),
    ).toEqual({ success: true, data: { items: [], total: 0 } });
    expect(deps.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 10, category: ["A", "B"] }),
    );
    expect(deps.list.mock.calls[0][0]).not.toHaveProperty("since");
    expect(await flows.status()).toEqual({ success: true, data: { status: "ok" } });
  });
  it("uses authenticated actor and request IP instead of client attribution", async () => {
    const deps = fixture(),
      flows = createAuditFlows(deps);
    expect(
      await flows.create(
        { action: "MANUAL", category: "TEST", actorUsername: "spoof", metadata: { secret: true } },
        { username: "alice", ip: "192.0.2.1" },
      ),
    ).toEqual({ success: true, message: "Log creado exitosamente" });
    expect(deps.log).toHaveBeenCalledWith({
      actorUsername: "alice",
      ipAddress: "192.0.2.1",
      action: "MANUAL",
      category: "TEST",
      severity: undefined,
      outcome: undefined,
      details: undefined,
    });
    await flows.create({ action: "A", category: "B" }, {});
    expect(deps.log).toHaveBeenLastCalledWith(expect.objectContaining({ actorUsername: "SYSTEM" }));
  });
  it("retains retention defaults and waits for integrity verification", async () => {
    const deps = fixture(),
      flows = createAuditFlows(deps);
    expect(await flows.cleanup({})).toEqual({
      success: true,
      data: {
        count: 2,
        cutoffDate: new Date("2020-01-01Z"),
        message: "Se han eliminado 2 registros anteriores a 2020-01-01T00:00:00.000Z",
      },
    });
    expect(deps.cleanup).toHaveBeenCalledWith(6);
    expect(await flows.verify()).toEqual({
      success: true,
      data: {
        message:
          "Auditoría criptográfica completada. Los resultados se han registrado en la bitácora.",
      },
    });
    expect(deps.verify).toHaveBeenCalledOnce();
  });
  it("uses JSON for unknown formats and preserves export failure boundaries", async () => {
    const deps = fixture(),
      flows = createAuditFlows(deps),
      sink = { headersSent: false, end: vi.fn() };
    expect(await flows.exportJson({ format: "other", actor: "alice" })).toEqual([{ id: "a" }]);
    deps.exportJson.mockRejectedValueOnce(new Error("database"));
    await expect(flows.exportJson({})).rejects.toMatchObject({
      statusCode: 500,
      code: "AUDIT_EXPORT_ERROR",
    });
    deps.exportStream.mockRejectedValue(new Error("stream"));
    await expect(flows.exportStream(sink, { format: "csv" })).rejects.toMatchObject({
      statusCode: 500,
      code: "AUDIT_EXPORT_ERROR",
    });
    await flows.exportStream({ ...sink, headersSent: true }, { format: "xml" });
    expect(sink.end).toHaveBeenCalledOnce();
    await flows.exportStream({ ...sink, writableEnded: true }, { format: "csv" });
    expect(sink.end).toHaveBeenCalledTimes(2);
  });
});
