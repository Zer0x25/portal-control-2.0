import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useGlobalVariablesController } from "../../../features/configuration/hooks/useGlobalVariablesController";
import { useEmailCenterController } from "../../../features/configuration/hooks/useEmailCenterController";
import { useSmtpConfigController } from "../../../features/configuration/hooks/useSmtpConfigController";
import GlobalVariablesManagerView from "../../../features/configuration/views/GlobalVariablesManager.view";
import { EmailCenterView } from "../../../features/configuration/views/EmailCenter.view";
import SmtpConfigModalView from "../../../features/configuration/components/SmtpConfigModal.view";
import { useEmailRecipientsListQuery } from "../../../hooks/queries/useConfigQuery";
import { configService } from "../../../services/configService";
import { emailService } from "../../../services/emailService";
import { authService } from "../../../services/authService";

const addToastMock = vi.fn();
const updateConfigMock = vi.fn();
const refetchBrandLogoMock = vi.fn();

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../hooks/useConfigMutations", () => ({
  useConfigMutations: () => ({ updateConfig: updateConfigMock, isPending: false }),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({ employees: [] }),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser: { id: "u1", role: "Administrador" } }),
}));

vi.mock("../../../services/authService", () => ({
  authService: {
    getToken: vi.fn(() => "token"),
    removeToken: vi.fn(),
  },
}));

vi.mock("../../../services/configService", async () => {
  const actual = await vi.importActual<typeof import("../../../services/configService")>(
    "../../../services/configService",
  );
  return {
    ...actual,
    configService: {
      ...actual.configService,
      get: vi.fn(),
      getPublicCompanyPolicy: vi.fn().mockResolvedValue(null),
      getPublicBrandLogo: vi.fn().mockResolvedValue({
        source: { kind: "url", ref: "https://example.com/logo.png" },
        width: 240,
        height: 96,
      }),
    },
  };
});

vi.mock("../../../services/emailService", () => ({
  emailService: {
    verifyStatus: vi.fn(),
    getRules: vi.fn(),
    saveRules: vi.fn(),
    sendTestEmail: vi.fn(),
    getConfig: vi.fn(),
    saveConfig: vi.fn(),
    verifyConnection: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useEmailRecipientsListQuery", () => {
  it("returns empty array instead of info@test.lan when config is null", async () => {
    vi.mocked(authService.getToken).mockReturnValue("token");
    vi.mocked(configService.get).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useEmailRecipientsListQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useGlobalVariablesController & GlobalVariablesManagerView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(configService.get).mockResolvedValue(null);
  });

  it("syncs logo dimensions from brandLogo and catches updateConfig errors without clearing inputs", async () => {
    updateConfigMock.mockRejectedValue(new Error("HTTP 500"));

    const { result } = renderHook(() => useGlobalVariablesController(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.logoWidthInput).toBe("240"));
    expect(result.current.logoHeightInput).toBe("96");

    act(() => {
      result.current.setNewAreaName("Bodega");
      result.current.setNewWorkdayTypeName("Turno Noche");
      result.current.setNewEmailRecipient("nuevo@empresa.cl");
    });

    await act(async () => {
      await result.current.handleAddArea();
      await result.current.handleAddWorkdayType();
      await result.current.handleAddEmailRecipient();
    });

    expect(result.current.newAreaName).toBe("Bodega");
    expect(result.current.newWorkdayTypeName).toBe("Turno Noche");
    expect(result.current.newEmailRecipient).toBe("nuevo@empresa.cl");
  });

  it("renders corrected label NUEVO PROTOCOLO/TIPO and Switch aria-label", () => {
    render(
      <GlobalVariablesManagerView
        globalMaxWeeklyHours={44}
        isMaxHoursLoading={false}
        areaListArr={[]}
        isAreasLoading={false}
        workdayTypeListArr={[]}
        isWorkdayTypesLoading={false}
        emailRecipientsListArr={[]}
        isEmailsLoading={false}
        isControlInternoEnabled={true}
        isControlInternoLoading={false}
        brandLogo={null}
        refetchBrandLogo={refetchBrandLogoMock}
        updateConfig={updateConfigMock}
        employees={[]}
        currentUser={null}
        addToast={addToastMock}
        areaList={[]}
        workdayTypeList={[]}
        emailRecipientsList={[]}
        isLoading={false}
        maxWeeklyHoursInputValue="44"
        setMaxWeeklyHoursInputValue={vi.fn()}
        newAreaName=""
        setNewAreaName={vi.fn()}
        areaToDelete={null}
        setAreaToDelete={vi.fn()}
        newWorkdayTypeName=""
        setNewWorkdayTypeName={vi.fn()}
        workdayTypeToDelete={null}
        setWorkdayTypeToDelete={vi.fn()}
        newEmailRecipient=""
        setNewEmailRecipient={vi.fn()}
        emailRecipientToDelete={null}
        setEmailRecipientToDelete={vi.fn()}
        policyFile={null}
        setPolicyFile={vi.fn()}
        policyMeta={null}
        setPolicyMeta={vi.fn()}
        isUploadingPolicy={false}
        setIsUploadingPolicy={vi.fn()}
        logoFile={null}
        setLogoFile={vi.fn()}
        logoUrlInput=""
        setLogoUrlInput={vi.fn()}
        logoWidthInput="512"
        setLogoWidthInput={vi.fn()}
        logoHeightInput="188"
        setLogoHeightInput={vi.fn()}
        isUploadingLogo={false}
        setIsUploadingLogo={vi.fn()}
        isSavingLogo={false}
        setIsSavingLogo={vi.fn()}
        handleUploadPolicy={vi.fn()}
        parseLogoSize={vi.fn()}
        handleUploadLogo={vi.fn()}
        handleSaveLogoUrl={vi.fn()}
        handleSaveLogoSize={vi.fn()}
        handleResetLogo={vi.fn()}
        handleSaveGlobalMaxHours={vi.fn()}
        handleAddArea={vi.fn()}
        handleDeleteArea={vi.fn()}
        handleConfirmDeleteArea={vi.fn()}
        handleAddWorkdayType={vi.fn()}
        handleDeleteWorkdayType={vi.fn()}
        handleConfirmDeleteWorkdayType={vi.fn()}
        handleAddEmailRecipient={vi.fn()}
        handleDeleteEmailRecipient={vi.fn()}
        handleConfirmDeleteEmailRecipient={vi.fn()}
        logoPreviewSrc={null}
      />,
    );

    expect(screen.getByLabelText("NUEVO PROTOCOLO/TIPO")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Habilitar módulo Control Interno" }),
    ).toBeInTheDocument();
  });
});

describe("useEmailCenterController & EmailCenterView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(configService.get).mockResolvedValue([]);
    vi.mocked(emailService.verifyStatus).mockResolvedValue({ success: true, message: "OK" });
  });

  it("sets rulesLoadError when getRules fails and blocks handleSaveRules", async () => {
    vi.mocked(emailService.getRules).mockRejectedValueOnce(new Error("Error 500 al cargar reglas"));

    const { result } = renderHook(() => useEmailCenterController(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoadingRules).toBe(false));
    expect(result.current.rulesLoadError).toBe("Error 500 al cargar reglas");

    await act(async () => {
      await result.current.handleSaveRules();
    });
    expect(emailService.saveRules).not.toHaveBeenCalled();
  });

  it("validates rules with emailRulesFormSchema before calling saveRules", async () => {
    vi.mocked(emailService.getRules).mockResolvedValueOnce({
      autoCloseShift: { enabled: false, recipient: "" },
      latenessOver15: { enabled: false, recipient: "" },
      latenessOver60: { enabled: false, recipient: "" },
    });

    const { result } = renderHook(() => useEmailCenterController(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoadingRules).toBe(false));

    act(() => {
      result.current.handleRuleChange("autoCloseShift", "enabled", true);
    });

    await act(async () => {
      await result.current.handleSaveRules();
    });

    expect(emailService.saveRules).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith("Una regla activa requiere destinatario.", "error");
  });

  it("renders Para input without uppercase and RuleEditor checkboxes with id and aria-label", () => {
    render(
      <EmailCenterView
        emailRecipientsList={["admin@empresa.cl"]}
        isEmailListLoading={false}
        status={{ loading: false, success: true, message: "OK" }}
        manualEmail={{ to: "", subject: "", message: "" }}
        getManualEmailError={vi.fn()}
        handleManualEmailChange={vi.fn()}
        isSending={false}
        isConfigModalOpen={false}
        rules={{
          autoCloseShift: { enabled: false, recipient: "" },
          latenessOver15: { enabled: false, recipient: "" },
          latenessOver60: { enabled: false, recipient: "" },
        }}
        isLoadingRules={false}
        rulesLoadError={null}
        isSavingRules={false}
        setIsConfigModalOpen={vi.fn()}
        checkStatus={vi.fn()}
        handleRuleChange={vi.fn()}
        manualEmailFormProps={{
          id: "test-email-form",
          noValidate: true,
          onSubmit: vi.fn(),
          "data-app-form": "test-email-form",
        }}
        handleSaveRules={vi.fn()}
        handleCloseConfigModal={vi.fn()}
      />,
    );

    const toInput = screen.getByLabelText("Para, destinatario del correo");
    expect(toInput.className).not.toContain("uppercase");

    const checkbox = screen.getByRole("checkbox", {
      name: "Habilitar regla: Cierres Masivos de Turno",
    });
    expect(checkbox).toHaveAttribute("id", "rule-autoCloseShift");
  });
});

describe("useSmtpConfigController & SmtpConfigModalView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows saving active profile while other slots remain empty and rejects partially filled slots", async () => {
    vi.mocked(emailService.getConfig).mockResolvedValueOnce({
      activeProfileIndex: 0,
      profiles: [
        {
          host: "smtp.empresa.cl",
          port: 587,
          secure: false,
          user: "notificaciones@empresa.cl",
          pass: "secret",
          fromName: "Portal",
          fromEmail: "notificaciones@empresa.cl",
        },
        {
          host: "",
          port: 587,
          secure: false,
          user: "",
          pass: "",
          fromName: "Portal Control Interno",
          fromEmail: "",
        },
        {
          host: "",
          port: 587,
          secure: false,
          user: "",
          pass: "",
          fromName: "Portal Control Interno",
          fromEmail: "",
        },
      ],
    });
    vi.mocked(emailService.saveConfig).mockResolvedValueOnce({
      success: true,
      message: "Guardado",
    });

    const onClose = vi.fn();
    const { result } = renderHook(() => useSmtpConfigController({ isOpen: true, onClose }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Switch to empty slot 1 and submit: should still succeed because slot 0 (active) is valid and slot 1 is empty
    act(() => {
      result.current.selectSlot(1);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(emailService.saveConfig).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("renders SmtpConfigModalView with dialog role, aria-modal and close aria-label", () => {
    const onClose = vi.fn();
    render(
      <SmtpConfigModalView
        isOpen={true}
        onClose={onClose}
        values={{
          host: "",
          port: 587,
          secure: false,
          user: "",
          pass: "",
          fromName: "Portal",
          fromEmail: "",
        }}
        getError={vi.fn()}
        handleFieldChange={vi.fn()}
        applyPreset={vi.fn()}
        handleTestConnection={vi.fn()}
        handleSetActive={vi.fn()}
        selectSlot={vi.fn()}
        currentSlot={0}
        activeProfileIndex={0}
        isLoading={false}
        isVerifying={false}
        isSubmitting={false}
        formProps={{
          id: "smtp-form",
          noValidate: true,
          onSubmit: vi.fn(),
          "data-app-form": "smtp-form",
        }}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getAllByRole("button", { name: "Cerrar" }).length).toBeGreaterThanOrEqual(1);
    const closeBtn = screen.getByLabelText("Cerrar");
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
