import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTimeRecordTableController } from "../../../features/time-control/hooks/useTimeRecordTableController";
import { AugmentedTimeRecord } from "../../../types";

const {
  useToastsMock,
  useAuditLogsInfiniteMock,
  useCorrectionRequestsMock,
  exportToPDFMock,
  addToastMock,
  onExportStreamingMock,
} = vi.hoisted(() => ({
  useToastsMock: vi.fn(),
  useAuditLogsInfiniteMock: vi.fn(),
  useCorrectionRequestsMock: vi.fn(),
  exportToPDFMock: vi.fn(),
  addToastMock: vi.fn(),
  onExportStreamingMock: vi.fn(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => useToastsMock(),
}));

vi.mock("../../../hooks/queries/useAuditLogsInfinite", () => ({
  useAuditLogsInfinite: (...args: unknown[]) => useAuditLogsInfiniteMock(...args),
}));

vi.mock("../../../hooks/useCorrectionRequests", () => ({
  useCorrectionRequests: (...args: unknown[]) => useCorrectionRequestsMock(...args),
}));

vi.mock("../../../utils/export/index", () => ({
  exportToPDF: (...args: unknown[]) => exportToPDFMock(...args),
}));

describe("useTimeRecordTableController", () => {
  it("builds pendingRequestsMap and editsMapAll from external data", () => {
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    useAuditLogsInfiniteMock.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              {
                action: "Time Record Edited",
                details: { recordId: "r1" },
              },
            ],
          },
        ],
      },
    });
    useCorrectionRequestsMock.mockReturnValue({
      requests: [
        { timeRecordId: "r1", status: "pending" },
        { timeRecordId: "r2", status: "approved" },
      ],
    });

    const { result } = renderHook(() =>
      useTimeRecordTableController({
        records: [],
        onExportStreaming: onExportStreamingMock,
      }),
    );

    expect(result.current.editsMapAll.get("r1")).toHaveLength(1);
    expect(result.current.pendingRequestsMap.has("r1")).toBe(true);
    expect(result.current.pendingRequestsMap.has("r2")).toBe(false);
    expect(useCorrectionRequestsMock).toHaveBeenCalledWith(
      undefined,
      undefined,
      "correction-requests",
    );
  });

  it("exports csv through streaming callback", async () => {
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    useAuditLogsInfiniteMock.mockReturnValue({ data: { pages: [{ data: [] }] } });
    useCorrectionRequestsMock.mockReturnValue({ requests: [] });

    const { result } = renderHook(() =>
      useTimeRecordTableController({
        records: [
          {
            id: "r1",
            employeeArea: "A1",
            employeeName: "Ana",
            employeePosition: "Operador",
            date: "2026-03-05",
          } as unknown as AugmentedTimeRecord,
        ],
        onExportStreaming: onExportStreamingMock,
      }),
    );

    await act(async () => {
      await result.current.handleExport("csv");
    });

    expect(onExportStreamingMock).toHaveBeenCalledWith("csv");
    expect(addToastMock).toHaveBeenCalledWith("Registros exportados a CSV.", "success");
  });
});
