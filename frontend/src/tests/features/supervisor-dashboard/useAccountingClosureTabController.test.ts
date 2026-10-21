import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "../../../services/authToken";
import { useAccountingClosureTabController } from "../../../features/supervisor-dashboard/hooks/useAccountingClosureTabController";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";

const {
  useTimeRecordsMock,
  useAuthMock,
  useToastsMock,
  useEmployeesMock,
  useAccountingLockDateQueryMock,
  useConfigMutationsMock,
  useNavigateMock,
  addToastMock,
} = vi.hoisted(() => ({
  useTimeRecordsMock: vi.fn(),
  useAuthMock: vi.fn(),
  useToastsMock: vi.fn(),
  useEmployeesMock: vi.fn(),
  useAccountingLockDateQueryMock: vi.fn(),
  useConfigMutationsMock: vi.fn(),
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

vi.mock("react-router", () => ({
  useNavigate: () => useNavigateMock,
}));

describe("useAccountingClosureTabController", () => {
  beforeEach(() => {
    authTokenStore.setToken("fixture");
    useTimeRecordsMock.mockReturnValue({ timeRecordsPage: [] });
    useAuthMock.mockReturnValue({ currentUser: { id: "u1" } });
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    useEmployeesMock.mockReturnValue({ activeEmployees: [] });
    useAccountingLockDateQueryMock.mockReturnValue({ data: "2026-03-01" });
    useConfigMutationsMock.mockReturnValue({ updateConfig: vi.fn() });
    server.use(
      http.get("http://localhost:4000/api/configs/validate-closure", () =>
        HttpResponse.json({ allowed: true }),
      ),
    );
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("validates successfully for allowed closure period", async () => {
    const { result } = renderHook(() => useAccountingClosureTabController());

    act(() => {
      result.current.setEndDate("2026-03-04");
    });

    await act(async () => {
      result.current.handleValidation();
      await Promise.resolve();
    });

    expect(result.current.validationResult.status).toBe("success");
  });

  it("navigates to requests tab from correction handler", () => {
    const { result } = renderHook(() => useAccountingClosureTabController());

    act(() => {
      result.current.handleNavigateToCorrections("requests");
    });

    expect(useNavigateMock).toHaveBeenCalled();
  });
});
