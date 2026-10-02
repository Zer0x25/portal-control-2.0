import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTimeRecordTableController } from "../../../features/time-control/hooks/useTimeRecordTableController";
import { AugmentedTimeRecord } from "../../../types";

const {
  useToastsMock,
  useLogsMock,
  useCorrectionRequestsMock,
  exportToPDFMock,
  addToastMock,
  onExportStreamingMock,
} = vi.hoisted(() => ({
  useToastsMock: vi.fn(),
  useLogsMock: vi.fn(),
  useCorrectionRequestsMock: vi.fn(),
  exportToPDFMock: vi.fn(),
  addToastMock: vi.fn(),
  onExportStreamingMock: vi.fn(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => useToastsMock(),
}));

vi.mock("../../../hooks/useLogs", () => ({
  useLogs: () => useLogsMock(),
}));

vi.mock("../../../hooks/useCorrectionRequests", () => ({
  useCorrectionRequests: () => useCorrectionRequestsMock(),
}));

vi.mock("../../../utils/export/index", () => ({
  exportToPDF: (...args: unknown[]) => exportToPDFMock(...args),
}));

describe("useTimeRecordTableController", () => {
  it("builds pendingRequestsMap and editsMapAll from external data", () => {
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    useLogsMock.mockReturnValue({
      logsPage: {
        data: [
          {
            action: "Time Record Edited",
            details: { recordId: "r1" },
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
  });

  it("exports csv through streaming callback", async () => {
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    useLogsMock.mockReturnValue({ logsPage: { data: [] } });
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
