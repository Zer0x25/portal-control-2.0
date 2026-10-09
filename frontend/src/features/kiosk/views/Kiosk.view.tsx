/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Kiosk page.
*/

import React from "react";
import NumericKeypad from "../../../components/ui/NumericKeypad";
import Button from "../../../components/ui/Button";
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
    id: string;
    label: string;
    color: "green" | "yellow" | "blue" | "red";
    enabled: boolean;
    actionType: "jornada_inicio" | "colacion_inicio" | "colacion_fin" | "jornada_fin";
  }>;
  clockStatusConfig?: {
    label: string;
    bg: string;
    text: string;
    description: string;
  };
  isLoadingEmployees?: boolean;
  filteredEmployees?: Employee[];
  formattedRutDisplay?: string;
  handleRutConfirm?: () => void;
  handleEmployeeSelect?: (e: Employee) => void;
  handlePinConfirm?: () => void;
  handleSetNewPin?: () => void;
  handleClockingAction?: (
    type: "jornada_inicio" | "colacion_inicio" | "colacion_fin" | "jornada_fin",
  ) => void;
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
    <div className="absolute top-4 left-6 right-6 flex justify-between items-center z-50">
      <div className="hidden sm:flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-sap-blue flex items-center justify-center text-white shadow-lg shadow-sap-blue/20 border border-white/10 relative overflow-hidden group">
          <FingerPrintIcon className="w-6 h-6 relative z-10" />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-sm font-black text-white uppercase italic tracking-tighter leading-none">
            Portal Empleado
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {step !== "rut_input" && (
          <button
            onClick={() => resetState && resetState()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-token-surface-stripe hover:bg-token-surface-active border border-token-border-subtle hover:border-token-border-technical text-[9px] font-black text-token-text-tertiary hover:text-token-text-primary uppercase tracking-[0.2em] transition-all"
          >
            <ArrowUturnLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300 opacity-70 group-hover:opacity-100" />
            Atrás
          </button>
        )}

        {(step === "rut_input" || step === "employee_list") && (
          <button
            onClick={() => onLogout && onLogout()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sap-error/10 hover:bg-sap-error/20 border border-sap-error/10 hover:border-sap-error/30 text-[10px] font-black text-sap-error uppercase tracking-widest transition-all shadow-xl shadow-black/40"
          >
            <LogoutIcon className="w-4 h-4" />
            Salir
          </button>
        )}
      </div>
    </div>
  );

  const renderRutInput = () => (
    <div key="rut" className="flex flex-col items-center">
      <div className="relative mb-5 sm:hidden">
        <div className="absolute inset-0 bg-sap-blue/40 rounded-2xl blur-2xl animate-pulse" />
        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-sap-blue via-indigo-600 to-sap-blue flex items-center justify-center text-white relative z-10 border border-white/20 shadow-2xl">
          <FingerPrintIcon className="w-8 h-8" />
        </div>
      </div>
      <h2 className="text-2xl font-black text-token-text-primary uppercase italic tracking-tight mb-1">
        Identificación
      </h2>
      <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-[0.3em] mb-4 text-center">
        Ingrese su RUT para comenzar
      </p>

      <div className="w-full h-14 bg-token-surface-card border border-token-border-technical rounded-2xl mb-2 flex items-center justify-center text-2xl font-black font-mono tracking-widest text-sap-blue shadow-inner">
        {formattedRutDisplay || <span className="opacity-20">00.000.000-0</span>}
      </div>

      <div className="h-6 mb-4">
        {props.rutError && (
          <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
            {props.rutError}
          </p>
        )}
      </div>

      <button
        onClick={() => setStep && setStep("employee_list")}
        className="mb-4 text-[10px] font-black text-sap-blue hover:text-white uppercase tracking-[0.3em] transition-colors flex items-center gap-2"
      >
        <UsersIcon className="w-4 h-4" />
        Seleccionar de la lista
      </button>

      <NumericKeypad
        className="w-full"
        onInput={(val) => {
          if (rutInput !== undefined && setRutInput && (rutInput as string).length < 9)
            setRutInput((rutInput as string) + val);
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
        <input
          type="search"
          placeholder="BUSCAR POR NOMBRE..."
          value={searchTerm as string}
          onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
          className="w-full h-12 bg-token-surface-card border border-token-border-technical rounded-xl px-4 text-xs font-black text-token-text-primary placeholder:text-token-text-tertiary focus:bg-token-surface-active focus:border-sap-blue/50 outline-none transition-all"
          autoFocus
        />
      </div>

      <div className="space-y-3 max-h-64 overflow-auto">
        {filteredEmployees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => handleEmployeeSelect && handleEmployeeSelect(emp)}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-token-surface-card border border-token-border-technical hover:bg-token-surface-active transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-sap-blue/10 flex items-center justify-center text-sap-blue font-black">
              {emp.name.charAt(0)}
            </div>
            <div className="flex-1 text-left">
              <div className="font-black text-sm text-token-text-primary">{emp.name}</div>
              <div className="text-[11px] text-token-text-tertiary">{emp.area}</div>
            </div>
            <div className="text-xs text-token-text-tertiary">{emp.workdayType}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderActions = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-token-text-primary uppercase italic mb-2">Acciones</h2>
      <p className="text-[10px] text-token-text-tertiary">{selectedEmployee?.name}</p>

      {clockStatusConfig && (
        <div className="rounded-2xl border border-token-border-technical bg-token-surface-stripe px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] font-black text-token-text-tertiary uppercase tracking-[0.25em]">
              Estado actual
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${clockStatusConfig.bg} ${clockStatusConfig.text}`}
            >
              {clockStatusConfig.label}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {kioskActions.map((action) => {
          const isDisabled = !isKioskArmed || !action.enabled;
          const colorClass =
            action.color === "green"
              ? isDisabled
                ? "bg-green-500/10 text-green-700/40 border border-green-500/20 shadow-none"
                : "bg-green-600 text-white border border-green-500 shadow-md hover:bg-green-700"
              : action.color === "yellow"
                ? isDisabled
                  ? "bg-amber-500/10 text-amber-700/40 border border-amber-500/20 shadow-none"
                  : "bg-amber-600 text-white border border-amber-500 shadow-md hover:bg-amber-700"
                : action.color === "blue"
                  ? isDisabled
                    ? "bg-sky-500/10 text-sky-700/40 border border-sky-500/20 shadow-none"
                    : "bg-sky-600 text-white border border-sky-500 shadow-md hover:bg-sky-700"
                  : isDisabled
                    ? "bg-rose-500/10 text-rose-700/40 border border-rose-500/20 shadow-none"
                    : "bg-rose-600 text-white border border-rose-500 shadow-md hover:bg-rose-700";

          return (
            <Button
              key={action.id}
              variant="none"
              onClick={() => handleClockingAction && handleClockingAction(action.actionType)}
              disabled={isDisabled}
              title={!isKioskArmed ? "Preparando..." : !action.enabled ? "No disponible" : ""}
              className={`w-full h-16 text-[10px] ${colorClass}`}
            >
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div key="success" className="text-center py-6">
      <div className="w-20 h-20 bg-green-500/20 rounded-[2.5rem] flex items-center justify-center text-green-500 mx-auto mb-6 border border-green-500/30">
        <CheckCircleIcon className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-black text-token-text-primary uppercase italic tracking-tight mb-2">
        ¡Completado!
      </h2>
      <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.3em]">
        Registro procesado con éxito
      </p>
    </div>
  );

  const renderChangePin = () => (
    <div key="change_pin" className="flex flex-col items-center">
      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-6 border border-orange-500/20">
        <KeyIcon className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-token-text-primary uppercase italic tracking-tight mb-2">
        Cambiar PIN
      </h2>
      <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.3em] mb-8 text-center">
        {selectedEmployee?.name}
      </p>

      <div className="w-full mb-6">
        <div className="w-full h-16 flex items-center justify-center gap-4 mb-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center transition-all ${newPin && newPin.length > i ? "bg-sap-blue border-sap-blue text-token-text-primary" : "bg-token-surface-card border-token-border-technical text-token-text-tertiary"}`}
            >
              {newPin && newPin.length > i ? "●" : "○"}
            </div>
          ))}
        </div>
        <p className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-widest text-center mb-4">
          Ingrese Nuevo PIN (4 dígitos)
        </p>

        <div className="w-full h-16 flex items-center justify-center gap-4 mb-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center transition-all ${confirmNewPin && confirmNewPin.length > i ? "bg-sap-blue border-sap-blue text-token-text-primary" : "bg-token-surface-card border-token-border-technical text-token-text-tertiary"}`}
            >
              {confirmNewPin && confirmNewPin.length > i ? "●" : "○"}
            </div>
          ))}
        </div>
        <p className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-widest text-center">
          Confirme Nuevo PIN
        </p>
      </div>

      <button
        onClick={() => {
          setNewPin?.("");
          setConfirmNewPin?.("");
          setStep?.("actions");
        }}
        className="mb-8 text-[10px] font-black text-token-text-tertiary hover:text-token-text-primary uppercase tracking-[0.3em] transition-colors"
      >
        Cancelar
      </button>

      <NumericKeypad
        className="w-full"
        onInput={(val) => {
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

  if (isLoadingEmployees || false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-token-surface-stripe overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen bg-[radial-gradient(circle_at_center,rgba(0,102,204,0.1)_0%,transparent_70%)] z-0" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-40"></div>
        </div>

        <div className="z-10 text-center relative">
          <div className="w-12 h-12 border-[3px] border-white/5 border-t-sap-blue rounded-full animate-spin mb-6 mx-auto" />
          <p className="font-black uppercase tracking-[0.4em] text-[10px] text-sap-blue animate-pulse">
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
      className="min-h-dvh lg:min-h-screen bg-token-surface-stripe flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-sap-blue/30 selection:text-white"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen bg-[radial-gradient(circle_at_center,rgba(0,102,204,0.08)_0%,transparent_70%)] z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sap-blue/10 rounded-full blur-[120px] z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] opacity-70"></div>
      </div>

      {props.renderHeader ? props.renderHeader() : internalRenderHeader()}

      <div className="relative z-10 w-full max-w-sm sm:max-w-[340px] bg-token-surface-card backdrop-blur-2xl rounded-[2.5rem] border border-token-border-technical shadow-4xl p-5 sm:p-6 overflow-hidden">
        <div className="contents">
          {step === "rut_input" && renderRutInput()}
          {step === "employee_list" && renderEmployeeList()}
          {step === "pin_input" && (
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-2xl bg-sap-blue/10 flex items-center justify-center text-sap-blue font-black text-2xl">
                  {selectedEmployee?.name?.charAt(0)}
                </div>
              </div>
              <h2 className="text-2xl font-black text-token-text-primary uppercase italic tracking-tight mb-2">
                Ingrese PIN
              </h2>
              <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-[0.3em] mb-4 text-center">
                {selectedEmployee?.name}
              </p>

              <div className="w-full h-16 mb-6 flex items-center justify-center gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center transition-all ${pinInput && pinInput.length > i ? "bg-sap-blue border-sap-blue text-token-text-primary" : "bg-token-surface-card border-token-border-technical text-token-text-tertiary"}`}
                  >
                    {pinInput && pinInput.length > i ? "●" : "○"}
                  </div>
                ))}
              </div>

              {pinError && (
                <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center mb-4">
                  {pinError}
                </p>
              )}

              <NumericKeypad
                className="w-full"
                onInput={(val) => setPinInput && setPinInput((pinInput || "") + val)}
                onDelete={() => setPinInput && setPinInput((pinInput || "").slice(0, -1))}
                onConfirm={() => handlePinConfirm && handlePinConfirm()}
              />
            </div>
          )}

          {step === "actions" && renderActions()}
          {step === "success" && renderSuccess()}
          {step === "change_pin" && renderChangePin()}
        </div>

        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-sap-blue/5 rounded-full blur-3xl" />
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="fixed bottom-6 left-6 z-20">
        <div className="bg-token-surface-card backdrop-blur-xl border border-token-border-subtle px-4 py-2 rounded-full shadow-2xl">
          <SimpleConnectionIndicator />
        </div>
      </div>
    </Container>
  );
};

export default KioskView;
