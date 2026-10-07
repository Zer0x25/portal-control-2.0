import { describe, it, expect, vi } from "vitest";
import { createImportExportFlows } from "../../src/modules/importExport";
function fixture() {
  const deps = {
    parseMapping: JSON.parse,
    readWorkbook: vi.fn(async () => ({
      headers: [undefined, "Name", "Value"],
      rows: [
        { 1: "Ada", 2: 0 },
        { 1: "Bob", 2: null },
      ],
    })),
    parseFilters: vi.fn((value: unknown) => ({
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      ...(value as object),
    })),
    pdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
    excel: vi.fn(async () => {}),
  };
  return { deps, flows: createImportExportFlows(deps) };
}
describe("Spec021 pure flows", () => {
  it("maps all rows and zero/null cells; missing file precedes JSON parsing and decoder effects", async () => {
    const { deps, flows } = fixture();
    await expect(flows.preview(undefined, "broken")).rejects.toMatchObject({ statusCode: 400 });
    expect(deps.readWorkbook).not.toHaveBeenCalled();
    expect(
      await flows.preview(
        new Uint8Array([1]),
        '{"Value":{"prop":"value","type":"String"},"Absent":{"prop":"absent","type":"String"}}',
      ),
    ).toEqual({ rows: [{ value: "0" }, { value: null }], total: 2 });
    expect(await flows.preview(new Uint8Array([1]))).toEqual({
      rows: [
        { Name: "Ada", Value: 0 },
        { Name: "Bob", Value: null },
      ],
      total: 2,
    });
  });
  it("scopes Usuario calendar/report but preserves detailed message-only denial and filename", async () => {
    const { deps, flows } = fixture();
    await expect(
      flows.pdf("calendar", {}, { role: "Usuario", employeeId: "self" }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(await flows.pdf("detailed", {}, { role: "Usuario", employeeId: "self" })).toEqual({
      denied: true,
      message: "Acceso denegado: Solo puede exportar su propio reporte de asistencia",
    });
    expect(deps.pdf).not.toHaveBeenCalled();
    const result = await flows.pdf(
      "detailed",
      { employeeId: "self", area: "other", cargo: "other", mode: "summary" },
      { role: "Usuario", employeeId: "self" },
    );
    expect(result).toMatchObject({ filename: "Reporte_Asistencia_2026-01-01_to_2026-01-02.pdf" });
    expect(deps.pdf).toHaveBeenCalledWith(
      "detailed",
      expect.objectContaining({
        employeeId: "self",
        area: undefined,
        cargo: undefined,
        mode: undefined,
      }),
    );
  });
  it("preserves Excel validation/access 500, original area and partial response end", async () => {
    const { deps, flows } = fixture();
    await expect(
      flows.prepareExcel({}, { role: "Usuario", employeeId: "self" }),
    ).rejects.toMatchObject({ statusCode: 500, code: "EXPORT_REPORT_EXCEL_ERROR" });
    const filters = await flows.prepareExcel(
      { employeeId: "self", area: "other" },
      { role: "Usuario", employeeId: "self" },
    );
    expect(filters.area).toBe("other");
    deps.excel.mockRejectedValue(new Error("write failed"));
    const sink = { headersSent: false, end: vi.fn() };
    await expect(flows.excel(sink, filters)).rejects.toMatchObject({
      statusCode: 500,
      code: "EXPORT_REPORT_EXCEL_ERROR",
    });
    sink.headersSent = true;
    await flows.excel(sink, filters);
    expect(sink.end).toHaveBeenCalledOnce();
  });
  it("rejects empty report ID and preserves PDF dependency error identity", async () => {
    const { deps, flows } = fixture();
    await expect(flows.shiftPdf("")).rejects.toMatchObject({ statusCode: 400 });
    const failure = new Error("PDF failure");
    deps.pdf.mockRejectedValue(failure);
    await expect(flows.shiftPdf("folio")).rejects.toBe(failure);
  });
});
