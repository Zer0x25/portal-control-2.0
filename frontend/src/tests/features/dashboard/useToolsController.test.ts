import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "../../../services/authToken";
import { useToolsController } from "../../../features/dashboard/hooks/useToolsController";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";
import { recordRequests, type RequestRecorder } from "../../mocks/requests";

// Mock de react-router
const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const mockHandleOpenQuickNotes = vi.fn();

const renderToolsLogic = () => renderHook(() => useToolsController(mockHandleOpenQuickNotes, true));

// Mock de constantes
vi.mock("../../../constants", () => ({
  ROUTES: {
    COMMUNICATIONS: "/communications",
    METER_READINGS: "/meters",
  },
}));

// Mock de iconos
vi.mock("../../../components/ui/icons/index", () => ({
  ClipboardIcon: () => "ClipboardIcon",
  ChatBubbleLeftRightIcon: () => "ChatBubbleLeftRightIcon",
  DocumentTextIcon: () => "DocumentTextIcon",
  CalculatorIcon: () => "CalculatorIcon",
}));

describe("useToolsController", () => {
  let recorder: RequestRecorder;

  beforeEach(() => {
    authTokenStore.setToken("fixture");
    vi.clearAllMocks();
    sessionStorage.clear();
    recorder = recordRequests();
    server.use(
      http.get("http://localhost:4000/api/configs/public/company-policy", () =>
        HttpResponse.json(null),
      ),
    );
  });

  afterEach(() => {
    recorder.stop();
    authTokenStore.removeToken();
    server.resetHandlers();
    vi.unstubAllEnvs();
  });

  it("should return correct tools configuration", () => {
    const { result } = renderToolsLogic();

    expect(result.current.tools).toHaveLength(4);
    expect(result.current.tools[0]).toEqual({
      id: "communications",
      label: "Comunicados",
      icon: expect.any(Function),
      action: expect.any(Function),
      color: "orange",
      type: "button",
      hasNotification: undefined,
    });
  });

  it("should return tools with correct properties", () => {
    const { result } = renderToolsLogic();

    expect(result.current.tools[0]).toMatchObject({
      id: "communications",
      label: "Comunicados",
      color: "orange",
      type: "button",
    });

    expect(result.current.tools[1]).toMatchObject({
      id: "notes",
      label: "Notas",
      color: "emerald",
      type: "button",
    });

    expect(result.current.tools[2]).toMatchObject({
      id: "reglamento",
      label: "Reglamento",
      color: "indigo",
      type: "link",
    });

    expect(result.current.tools[3]).toMatchObject({
      id: "meters",
      label: "Medidores",
      color: "violet",
      type: "button",
    });
  });

  it("should return correct color classes", () => {
    const { result } = renderToolsLogic();

    expect(result.current.colorClasses).toEqual({
      orange: "bg-orange-600/10 text-orange-600",
      emerald: "bg-emerald-600/10 text-emerald-600",
      indigo: "bg-indigo-600/10 text-indigo-600",
      violet: "bg-violet-600/10 text-violet-600",
    });
  });

  it("should return correct CSS classes", () => {
    const { result } = renderToolsLogic();

    expect(result.current.itemClass).toBe(
      "group relative p-3.5 h-[90px] rounded-sm flex flex-col items-center justify-center text-center bg-token-surface-stripe border border-token-border-technical shadow-sm transition-all duration-150 hover:border-token-accent-brand/40 hover:bg-token-surface-active active:scale-[0.98]",
    );

    expect(result.current.iconBoxClass).toBe(
      "w-8 h-8 rounded-sm flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 border border-token-border-technical/50",
    );
  });

  it("should call navigate for communications tool", () => {
    const { result } = renderToolsLogic();

    const communicationsTool = result.current.tools.find((t) => t.id === "communications");
    expect(communicationsTool).toBeDefined();

    if (communicationsTool && communicationsTool.type === "button") {
      (communicationsTool.action as () => void)();
      expect(mockNavigate).toHaveBeenCalledWith("/communications");
    }
  });

  it("should call handleOpenQuickNotes for notes tool", () => {
    const { result } = renderToolsLogic();

    const notesTool = result.current.tools.find((t) => t.id === "notes");
    expect(notesTool).toBeDefined();

    if (notesTool && notesTool.type === "button") {
      (notesTool.action as () => void)();
      expect(mockHandleOpenQuickNotes).toHaveBeenCalledTimes(1);
    }
  });

  it("should return PDF path for reglamento tool", () => {
    const { result } = renderToolsLogic();

    const reglamentoTool = result.current.tools.find((t) => t.id === "reglamento");
    expect(reglamentoTool).toBeDefined();

    if (reglamentoTool && reglamentoTool.type === "link") {
      expect(reglamentoTool.action).toBe("/api/configs/public/company-policy/file");
    }
  });

  it("uses the configured company policy URL when present", () => {
    vi.stubEnv("VITE_COMPANY_POLICY_URL", "https://example.test/company-policy.pdf");
    const { result } = renderToolsLogic();

    expect(result.current.tools.find((tool) => tool.id === "reglamento")?.action).toBe(
      "https://example.test/company-policy.pdf",
    );
  });

  it("should call navigate for meters tool", () => {
    const { result } = renderToolsLogic();

    const metersTool = result.current.tools.find((t) => t.id === "meters");
    expect(metersTool).toBeDefined();

    if (metersTool && metersTool.type === "button") {
      (metersTool.action as () => void)();
      expect(mockNavigate).toHaveBeenCalledWith("/meters");
    }
  });

  it("should handle unread notes state", () => {
    const { result } = renderToolsLogic();

    const notesTool = result.current.tools.find((t) => t.id === "notes");
    expect(notesTool?.hasNotification).toBe(true);
  });

  it("does not fetch fixed company policy metadata on Dashboard startup", async () => {
    const { result } = renderToolsLogic();
    await act(async () => {});

    expect(recorder.countOf("GET", "/api/configs/public/company-policy")).toBe(0);
    expect(result.current.tools.find((tool) => tool.id === "reglamento")?.action).toBe(
      "/api/configs/public/company-policy/file",
    );
  });
});
