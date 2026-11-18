/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Kiosk page.
*/

import React from "react";
import NumericKeypad from "../../../components/ui/NumericKeypad";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import EmptyState from "../../../components/ui/EmptyState";
import Container from "../../../components/ui/Container";
import SimpleConnectionIndicator from "../../../components/ui/SimpleConnectionIndicator";
import {
  LogoutIcon,
  FingerPrintIcon,
  KeyIcon,
  CheckCircleIcon,
  UsersIcon,
  ArrowUturnLeftIcon,
} from "../../../components/ui/icons/index";
import { DailyTimeRecord, Employee, ClockingStatus } from "../../../types/index";
import type { KioskStep } from "../hooks/useKioskData";
import {
  getClockingActionButtonClassName,
  type ClockingActionType,
} from "../../../utils/clockingActionButtonStyles";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { Z } from "../../../constants/zScale";

export interface KioskViewProps {
  step: KioskStep;
  setStep: React.Dispatch<React.SetStateAction<KioskStep>>;
  renderHeader?: () => React.ReactNode;
  renderContent?: () => React.ReactNode;
  selectedEmployee?: Employee | null;
  setSelectedEmployee?: (e: Employee | null) => void;
  searchTerm?: string;
  setSearchTerm?: (s: string) => void;
  pinInput?: string;
  setPinInput?: (s: string) => void;
  pinError?: string;
  setPinError?: (s: string) => void;
  rutInput?: string;
  setRutInput?: (s: string) => void;
  rutError?: string;
  setRutError?: (s: string) => void;
  newPin?: string;
  setNewPin?: (s: string) => void;
  confirmNewPin?: string;
  setConfirmNewPin?: (s: string) => void;
  clockStatus?: ClockingStatus;
  latestOpenRecord?: DailyTimeRecord | null;
  isKioskArmed?: boolean;
  kioskActions?: Array<{
    id: ClockingActionType;
    label: string;
    enabled: boolean;
    actionType: ClockingActionType;
  }>;
  clockStatusConfig?: {
    label: string;
    bg: string;
    text: string;
    description: string;
  };
  isLoadingEmployees?: boolean;
  isErrorEmployees?: boolean;
  refetchKioskEmployees?: () => void;
  isSubmitting?: boolean;
  filteredEmployees?: Employee[];
  formattedRutDisplay?: string;
  handleRutConfirm?: () => void;
  handleEmployeeSelect?: (e: Employee) => void;
  handlePinConfirm?: () => void;
  handleSetNewPin?: () => void;
  handleClockingAction?: (type: ClockingActionType) => void;
  resetState?: () => void;
  onLogout?: () => void;
}

const KioskView: React.FC<KioskViewProps> = (props) => {
  const {
    step,
    setStep,
    selectedEmployee,
    searchTerm,
    setSearchTerm,
    pinInput,
    setPinInput,
    pinError,
    rutInput,
    setRutInput,
    newPin,
    setNewPin,
    confirmNewPin,
    setConfirmNewPin,
    isLoadingEmployees,
    isErrorEmployees,
    refetchKioskEmployees,
    isSubmitting,
    filteredEmployees = [],
    formattedRutDisplay,
    handleRutConfirm,
    handleEmployeeSelect,
    handlePinConfirm,
    handleSetNewPin,
    handleClockingAction,
    resetState,
    onLogout,
    kioskActions = [],
    clockStatusConfig,
    isKioskArmed,
  } = props;

  const internalRenderHeader = () => (
    <header
      className={`w-full max-w-5xl flex justify-between items-center pt-2 pb-4 px-2 relative ${Z.overlay}`}
    >
      <div className="hidden sm:flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-token-accent-brand flex items-center justify-center text-token-text-onAccent shadow-lg shadow-token-accent-brand/20 border border-white/10 relative overflow-hidden group">
          <FingerPrintIcon className={`w-6 h-6 relative ${Z.sticky}`} />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-sm font-black text-token-text-primary uppercase italic tracking-tighter leading-none">
            Portal Empleado
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {step !== "rut_input" && (
          <Button
            variant="none"
            onClick={() => resetState && resetState()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-token-surface-stripe hover:bg-token-surface-active border border-token-border-subtle hover:border-token-border-technical text-xxs font-black text-token-text-secondary hover:text-token-text-primary uppercase tracking-[0.2em] transition-all"
          >
            <ArrowUturnLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300 opacity-70 group-hover:opacity-100" />
            Atrás
          </Button>
        )}

        {(step === "rut_input" || step === "employee_list") && (
          <Button
            variant="none"
            data-testid="kiosk-exit-button"
            onClick={() => onLogout && onLogout()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-token-status-error/10 hover:bg-token-status-error/20 border border-token-status-error/10 hover:border-token-status-error/30 text-[10px] font-black text-token-status-error-text uppercase tracking-widest transition-all shadow-xl shadow-black/40"
          >
            <LogoutIcon className="w-4 h-4" />
            Salir
          </Button>
        )}
      </div>
    </header>
  );

  const renderRutInput = () => (
    <div key="rut" className="flex flex-col items-center">
      <div className="relative mb-5 sm:hidden">
        <div className="ambient-glow ambient-glow-prominent absolute inset-0 animate-pulse" />
        <div
          className={`w-16 h-16 rounded-2xl bg-linear-to-br from-token-accent-brand to-token-accent-brand flex items-center justify-center text-token-text-onAccent relative ${Z.sticky} border border-white/20 shadow-2xl`}
        >
          <FingerPrintIcon className="w-8 h-8" />
        </div>
      </div>
      <h2 className="text-2xl font-black text-token-text-primary uppercase italic tracking-tight mb-1">
        Identificación
      </h2>
      <p className="text-xxs font-black text-token-text-secondary uppercase tracking-[0.3em] mb-4 text-center">
        Ingrese su RUT para comenzar
      </p>

      <div
        data-testid="kiosk-display"
        className="w-full h-14 bg-token-surface-card border border-token-border-technical rounded-2xl mb-2 flex items-center justify-center text-2xl font-black font-mono tracking-widest text-token-accent-brand shadow-inner"
      >
        {formattedRutDisplay || <span className="text-token-text-tertiary">00.000.000-0</span>}
      </div>

      <div className="h-6 mb-4">
        {props.rutError && (
          <p
            data-testid="kiosk-rut-error"
            role="alert"
            aria-live="polite"
            className="text-token-status-error-text text-[10px] font-black uppercase tracking-widest text-center"
          >
            {props.rutError}
          </p>
        )}
      </div>

      <Button
        variant="none"
        onClick={() => setStep && setStep("employee_list")}
        className="mb-4 text-[10px] font-black text-token-accent-brand hover:text-token-text-primary uppercase tracking-[0.3em] transition-colors flex items-center gap-2"
      >
        <UsersIcon className="w-4 h-4" />
        Seleccionar de la lista
      </Button>

      <NumericKeypad
        className="w-full"
        onInput={(val) => {
          if (rutInput === undefined || !setRutInput) return;
          if (rutInput.endsWith("K") || rutInput.length >= 10) return;
          if (val === "K" && (rutInput.length === 0 || rutInput.includes("K"))) return;
          setRutInput(rutInput + val);
        }}
        onDelete={() => setRutInput && setRutInput((rutInput ?? "").slice(0, -1))}
        onConfirm={() => handleRutConfirm && handleRutConfirm()}
      />
    </div>
  );

  const renderEmployeeList = () => (
    <div key="list" className="flex flex-col">
      <h2 className="text-xl font-black text-token-text-primary uppercase italic mb-6">
        Lista de Personal
      </h2>
      <div className="relative mb-6">
        <Input
          type="search"
          placeholder="BUSCAR POR NOMBRE..."
          aria-label="Buscar por nombre en kiosco"
          value={searchTerm as string}
          onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
          className="h-12 rounded-xl px-4 text-xs font-black"
          autoFocus
        />
      </div>

      <div
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="region"
        aria-label="Lista de personal"
        className="space-y-3 max-h-64 overflow-auto focus:outline-hidden"
      >
        {filteredEmployees.map((emp) => (
          <Button
            variant="none"
            key={emp.id}
            onClick={() => handleEmployeeSelect && handleEmployeeSelect(emp)}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-token-surface-card border border-token-border-technical hover:bg-token-surface-active transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-token-accent-brand/10 flex items-center justify-center text-token-accent-brand font-black">
              {emp.name.charAt(0)}
            </div>
            <div className="flex-1 text-left">
              <div className="font-black text-sm text-token-text-primary">{emp.name}</div>
              <div className="text-[11px] text-token-text-secondary">{emp.area}</div>
            </div>
            <div className="text-xs text-token-text-secondary">{emp.workdayType}</div>
          </Button>
        ))}
      </div>
    </div>
  );

  const renderActions = () => (
    <div className="space-y-6" aria-busy={isSubmitting ? "true" : undefined}>
      <h2 className="text-xl font-black text-token-text-primary uppercase italic mb-2">Acciones</h2>
      <p className="text-[10px] text-token-text-secondary">{selectedEmployee?.name}</p>

      {clockStatusConfig && (
        <div className="rounded-2xl border border-token-border-technical bg-token-surface-stripe px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xxs font-black text-token-text-secondary uppercase tracking-[0.25em]">
              Estado actual
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xxs font-black uppercase tracking-[0.2em] ${clockStatusConfig.bg} ${clockStatusConfig.text}`}
            >
              {clockStatusConfig.label}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {kioskActions.map((action) => {
          const isDisabled = !isKioskArmed || !action.enabled || isSubmitting === true;

          return (
            <Button
              key={action.id}
              variant="none"
              onClick={() => handleClockingAction && handleClockingAction(action.actionType)}
              disabled={isDisabled}
              title={
                isSubmitting
                  ? "Registrando..."
                  : !isKioskArmed
                    ? "Preparando..."
                    : !action.enabled
                      ? "No disponible"
                      : ""
              }
              // El fallback de Button (title -> aria-label) dejaría a las 4
              // acciones anunciándose igual ("No disponible"). Etiqueta
              // explícita: el tooltip visual se conserva, el lector oye la acción.
              aria-label={action.label}
              className={`w-full h-16 text-[10px] ${getClockingActionButtonClassName(action.actionType, isDisabled)}`}
            >
              {isSubmitting ? "Registrando..." : action.label}
            </Button>
          );
        })}
      </div>

      <Button
        variant="secondary"
        data-testid="kiosk-change-pin-button"
        disabled={isSubmitting === true}
        onClick={() => setStep?.("change_pin")}
        className="w-full h-11 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
      >
        <KeyIcon className="w-4 h-4" />
        Cambiar mi PIN
      </Button>
    </div>
  );

  const renderSuccess = () => (
    <div key="success" className="text-center py-6">
      <div className="w-20 h-20 bg-token-status-success/20 rounded-[2.5rem] flex items-center justify-center text-token-status-success mx-auto mb-6 border border-token-status-success/30">
        <CheckCircleIcon className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-black text-token-text-primary uppercase italic tracking-tight mb-2">
        ¡Completado!
      </h2>
      <p className="text-[10px] font-black text-token-text-secondary uppercase tracking-[0.3em]">
        Registro procesado con éxito
      </p>
    </div>
  );

  const renderChangePin = () => (
    <div key="change_pin" className="flex flex-col items-center">
      <div className="w-16 h-16 rounded-2xl bg-token-status-warning/10 flex items-center justify-center text-token-status-warning mb-6 border border-token-status-warning/20">
        <KeyIcon className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-token-text-primary uppercase italic tracking-tight mb-2">
        Cambiar PIN
      </h2>
      <p className="text-[10px] font-black text-token-text-secondary uppercase tracking-[0.3em] mb-8 text-center">
        {selectedEmployee?.name}
      </p>

      <div className="w-full mb-6">
        <div
          role="status"
          aria-label={`Nuevo PIN: ${newPin?.length ?? 0} de 4 dígitos ingresados`}
          className="w-full h-16 flex items-center justify-center gap-4 mb-2"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center transition-all ${newPin && newPin.length > i ? "bg-token-accent-brand border-token-accent-brand text-token-text-onAccent" : "bg-token-surface-card border-token-border-technical text-token-text-tertiary"}`}
            >
              {newPin && newPin.length > i ? "●" : "○"}
            </div>
          ))}
        </div>
        <p className="text-xxs font-bold text-token-text-secondary uppercase tracking-widest text-center mb-4">
          Ingrese Nuevo PIN (4 dígitos)
        </p>

        <div
          role="status"
          aria-label={`Confirmar PIN: ${confirmNewPin?.length ?? 0} de 4 dígitos ingresados`}
          className="w-full h-16 flex items-center justify-center gap-4 mb-2"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center transition-all ${confirmNewPin && confirmNewPin.length > i ? "bg-token-accent-brand border-token-accent-brand text-token-text-onAccent" : "bg-token-surface-card border-token-border-technical text-token-text-tertiary"}`}
            >
              {confirmNewPin && confirmNewPin.length > i ? "●" : "○"}
            </div>
          ))}
        </div>
        <p className="text-xxs font-bold text-token-text-secondary uppercase tracking-widest text-center">
          Confirme Nuevo PIN
        </p>
      </div>

      <Button
        variant="none"
        onClick={() => {
          setNewPin?.("");
          setConfirmNewPin?.("");
          setStep?.("actions");
        }}
        className="mb-8 text-[10px] font-black text-token-text-secondary hover:text-token-text-primary uppercase tracking-[0.3em] transition-colors"
      >
        Cancelar
      </Button>

      <NumericKeypad
        className="w-full"
        onInput={(val) => {
          if (val === "K") return;
          if (newPin !== undefined && setNewPin && newPin.length < 4) {
            setNewPin(newPin + val);
          } else if (confirmNewPin !== undefined && setConfirmNewPin && confirmNewPin.length < 4) {
            setConfirmNewPin(confirmNewPin + val);
          }
        }}
        onDelete={() => {
          if (confirmNewPin && confirmNewPin.length > 0 && setConfirmNewPin)
            setConfirmNewPin(confirmNewPin.slice(0, -1));
          else if (newPin && newPin.length > 0 && setNewPin) setNewPin(newPin.slice(0, -1));
        }}
        onConfirm={() => handleSetNewPin && handleSetNewPin()}
      />
    </div>
  );

  if (isLoadingEmployees) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-token-surface-stripe overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen bg-[radial-gradient(circle_at_center,rgba(0,102,204,0.1)_0%,transparent_70%)] ${Z.base}`}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-40"></div>
        </div>

        <div className={`${Z.sticky} text-center relative`}>
          <LoadingSpinner size="lg" variant="onAccent" />
          <p className="font-black uppercase tracking-[0.4em] text-[10px] text-token-accent-brand animate-pulse">
            Sincronizando Biometría
          </p>
        </div>
      </div>
    );
  }

  return (
    <Container
      variant="fluid"
      noPadding
      data-ui-protected
      className="min-h-dvh bg-token-surface-stripe flex flex-col items-center justify-between p-4 relative overflow-y-auto selection:bg-token-accent-brand/30 selection:text-token-text-onAccent"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen bg-[radial-gradient(circle_at_center,rgba(0,102,204,0.08)_0%,transparent_70%)] ${Z.base}`}
        />
        <div
          className={`ambient-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] ${Z.base}`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] opacity-70"></div>
      </div>

      {props.renderHeader ? props.renderHeader() : internalRenderHeader()}

      <main id="main-content" role="main" className="w-full flex justify-center my-auto py-4">
        {isErrorEmployees ? (
          <div className={`relative ${Z.sticky} w-full max-w-sm sm:max-w-[340px]`}>
            <EmptyState
              title="Error al cargar empleados"
              description="No se pudo obtener la lista de personal. Verifique su conexión."
              actionLabel="Reintentar"
              onAction={() => refetchKioskEmployees?.()}
            />
          </div>
        ) : (
          <div
            data-testid="kiosk-step"
            data-step={step}
            className={`relative ${Z.sticky} w-full max-w-sm sm:max-w-[340px] bg-token-surface-card backdrop-blur-2xl rounded-[2.5rem] border border-token-border-technical shadow-4xl p-5 sm:p-6 overflow-hidden`}
          >
            <div className="contents">
              {step === "rut_input" && renderRutInput()}
              {step === "employee_list" && renderEmployeeList()}
              {step === "pin_input" && (
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-2xl bg-token-accent-brand/10 flex items-center justify-center text-token-accent-brand font-black text-2xl">
                      {selectedEmployee?.name?.charAt(0)}
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-token-text-primary uppercase italic tracking-tight mb-2">
                    Ingrese PIN
                  </h2>
                  <p className="text-xxs font-black text-token-text-secondary uppercase tracking-[0.3em] mb-4 text-center">
                    {selectedEmployee?.name}
                  </p>

                  <div
                    role="status"
                    aria-label={`${pinInput?.length ?? 0} de 4 dígitos ingresados`}
                    className="w-full h-16 mb-6 flex items-center justify-center gap-4"
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        aria-hidden="true"
                        className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center transition-all ${pinInput && pinInput.length > i ? "bg-token-accent-brand border-token-accent-brand text-token-text-onAccent" : "bg-token-surface-card border-token-border-technical text-token-text-tertiary"}`}
                      >
                        {pinInput && pinInput.length > i ? "●" : "○"}
                      </div>
                    ))}
                  </div>

                  {pinError && (
                    <p
                      data-testid="kiosk-pin-error"
                      role="alert"
                      aria-live="polite"
                      className="text-token-status-error-text text-[10px] font-black uppercase tracking-widest text-center mb-4"
                    >
                      {pinError}
                    </p>
                  )}

                  <NumericKeypad
                    className="w-full"
                    onInput={(val) => {
                      if (val === "K") return;
                      if (setPinInput && (pinInput || "").length < 4) {
                        setPinInput((pinInput || "") + val);
                      }
                    }}
                    onDelete={() => setPinInput && setPinInput((pinInput || "").slice(0, -1))}
                    onConfirm={() => handlePinConfirm && handlePinConfirm()}
                  />
                </div>
              )}

              {step === "actions" && renderActions()}
              {step === "success" && renderSuccess()}
              {step === "change_pin" && renderChangePin()}
            </div>

            <div className="ambient-glow ambient-glow-subtle absolute -bottom-12 -right-12 w-32 h-32" />
            <div className="ambient-glow ambient-glow-light ambient-glow-subtle absolute -top-12 -left-12 w-32 h-32" />
          </div>
        )}
      </main>

      <div className={`w-full max-w-5xl flex justify-start pt-4 pb-2 px-2 relative ${Z.dropdown}`}>
        <div className="bg-token-surface-card backdrop-blur-xl border border-token-border-subtle px-4 py-2 rounded-full shadow-2xl">
          <SimpleConnectionIndicator />
        </div>
      </div>
    </Container>
  );
};

export default KioskView;
