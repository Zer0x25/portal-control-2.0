import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useToolsLogic } from "../../../features/dashboard/hooks/useToolsLogic";

// Mock de react-router
const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock de store
const mockHandleOpenQuickNotes = vi.fn();
vi.mock("../../../store/useStore", () => ({
  useStore: (selector: any) =>
    selector({
      handleOpenQuickNotes: mockHandleOpenQuickNotes,
      hasUnreadNotes: true,
    }),
}));

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

vi.mock("../../../services/configService", () => ({
  configService: {
    getPublicCompanyPolicy: vi.fn().mockResolvedValue(null),
  },
}));

describe("useToolsLogic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return correct tools configuration", () => {
    const { result } = renderHook(() => useToolsLogic());

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
    const { result } = renderHook(() => useToolsLogic());

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
      hasNotification: true,
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
    const { result } = renderHook(() => useToolsLogic());

    expect(result.current.colorClasses).toEqual({
      orange: "bg-orange-600/10 text-orange-600",
      emerald: "bg-emerald-600/10 text-emerald-600",
      indigo: "bg-indigo-600/10 text-indigo-600",
      violet: "bg-violet-600/10 text-violet-600",
    });
  });

  it("should return correct CSS classes", () => {
    const { result } = renderHook(() => useToolsLogic());

    expect(result.current.itemClass).toBe(
      "group relative p-3.5 h-[90px] rounded-sm flex flex-col items-center justify-center text-center bg-token-surface-stripe border border-token-border-technical shadow-sm transition-all duration-150 hover:border-sap-blue/40 hover:bg-token-surface-active active:scale-[0.98]",
    );

    expect(result.current.iconBoxClass).toBe(
      "w-8 h-8 rounded-sm flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 border border-token-border-technical/50",
    );
  });

  it("should call navigate for communications tool", () => {
    const { result } = renderHook(() => useToolsLogic());

    const communicationsTool = result.current.tools.find((t) => t.id === "communications");
    expect(communicationsTool).toBeDefined();

    if (communicationsTool && communicationsTool.type === "button") {
      (communicationsTool.action as () => void)();
      expect(mockNavigate).toHaveBeenCalledWith("/communications");
    }
  });

  it("should call handleOpenQuickNotes for notes tool", () => {
    const { result } = renderHook(() => useToolsLogic());

    const notesTool = result.current.tools.find((t) => t.id === "notes");
    expect(notesTool).toBeDefined();

    if (notesTool && notesTool.type === "button") {
      (notesTool.action as () => void)();
      expect(mockHandleOpenQuickNotes).toHaveBeenCalledTimes(1);
    }
  });

  it("should return PDF path for reglamento tool", () => {
    const { result } = renderHook(() => useToolsLogic());

    const reglamentoTool = result.current.tools.find((t) => t.id === "reglamento");
    expect(reglamentoTool).toBeDefined();

    if (reglamentoTool && reglamentoTool.type === "link") {
      expect(reglamentoTool.action).toBe("/api/configs/public/company-policy/file");
    }
  });

  it("should call navigate for meters tool", () => {
    const { result } = renderHook(() => useToolsLogic());

    const metersTool = result.current.tools.find((t) => t.id === "meters");
    expect(metersTool).toBeDefined();

    if (metersTool && metersTool.type === "button") {
      (metersTool.action as () => void)();
      expect(mockNavigate).toHaveBeenCalledWith("/meters");
    }
  });

  it("should handle unread notes state", () => {
    // Test with unread notes
    const { result } = renderHook(() => useToolsLogic());

    const notesTool = result.current.tools.find((t) => t.id === "notes");
    expect(notesTool?.hasNotification).toBe(true);
  });
});
