import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAccountingClosureTabController } from "../../../features/supervisor-dashboard/hooks/useAccountingClosureTabController";

const {
  useTimeRecordsMock,
  useAuthMock,
  useToastsMock,
  useEmployeesMock,
  useAccountingLockDateQueryMock,
  useConfigMutationsMock,
  validateClosureMock,
  useNavigateMock,
  addToastMock,
} = vi.hoisted(() => ({
  useTimeRecordsMock: vi.fn(),
  useAuthMock: vi.fn(),
  useToastsMock: vi.fn(),
  useEmployeesMock: vi.fn(),
  useAccountingLockDateQueryMock: vi.fn(),
  useConfigMutationsMock: vi.fn(),
  validateClosureMock: vi.fn(),
  useNavigateMock: vi.fn(),
  addToastMock: vi.fn(),
}));

vi.mock("../../../hooks/useTimeRecords", () => ({
  useTimeRecords: () => useTimeRecordsMock(),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => useToastsMock(),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => useEmployeesMock(),
}));

vi.mock("../../../hooks/queries/useConfigQuery", () => ({
  useAccountingLockDateQuery: () => useAccountingLockDateQueryMock(),
}));

vi.mock("../../../hooks/useConfigMutations", () => ({
  useConfigMutations: () => useConfigMutationsMock(),
}));

vi.mock("../../../services/configService", () => ({
  configService: {
    validateClosure: (...args: unknown[]) => validateClosureMock(...args),
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => useNavigateMock,
}));

describe("useAccountingClosureTabController", () => {
  it("validates successfully for allowed closure period", async () => {
    useTimeRecordsMock.mockReturnValue({ timeRecordsPage: [] });
    useAuthMock.mockReturnValue({ currentUser: { id: "u1" } });
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    useEmployeesMock.mockReturnValue({ activeEmployees: [] });
    useAccountingLockDateQueryMock.mockReturnValue({ data: "2026-03-01" });
    useConfigMutationsMock.mockReturnValue({ updateConfig: vi.fn() });
    validateClosureMock.mockResolvedValue({ allowed: true });

    const { result } = renderHook(() => useAccountingClosureTabController());

    act(() => {
      result.current.setEndDate("2026-03-04");
    });

    await act(async () => {
      result.current.handleValidation();
      await Promise.resolve();
    });

    expect(validateClosureMock).toHaveBeenCalledWith("2026-03-04");
    expect(result.current.validationResult.status).toBe("success");
  });

  it("navigates to requests tab from correction handler", () => {
    useTimeRecordsMock.mockReturnValue({ timeRecordsPage: [] });
    useAuthMock.mockReturnValue({ currentUser: { id: "u1" } });
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    useEmployeesMock.mockReturnValue({ activeEmployees: [] });
    useAccountingLockDateQueryMock.mockReturnValue({ data: "2026-03-01" });
    useConfigMutationsMock.mockReturnValue({ updateConfig: vi.fn() });

    const { result } = renderHook(() => useAccountingClosureTabController());

    act(() => {
      result.current.handleNavigateToCorrections("requests");
    });

    expect(useNavigateMock).toHaveBeenCalled();
  });
});
