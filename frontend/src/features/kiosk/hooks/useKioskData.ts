import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEmployees } from "../../../hooks/useEmployees";
import { useTimeRecordMutations } from "../../../hooks/queries/useTimeRecordsQuery";
import { useToasts } from "../../../hooks/useToasts";
import { useDebounce } from "../../../hooks/useDebounce";
import { AttendanceRecord, Employee, DailyTimeRecord, ClockingStatus } from "../../../types/index";
import { ROUTES } from "../../../constants";
import { isValidChileanRut } from "../../../utils/validation";
import { authService } from "../../../services/authService";
import { timeRecordService } from "../../../services/timeRecordService";
import { ApiHttpError } from "../../../services/apiClient";
import { queryKeys } from "../../../lib/queryKeys";
import { CLOCKING_STATUS_CONFIG, getContractClockingStatus } from "../../../utils/mappings";
import { idbGetAllBy, STORES } from "../../../utils/indexedDB";
import { normalizeString } from "../../../utils/stringUtils";
import type { ClockingActionType } from "../../../utils/clockingActionButtonStyles";
import { getCurrentGeolocation } from "../../../utils/geolocation";
import { logger } from "../../../utils/logger";

export type KioskStep =
  "rut_input" | "employee_list" | "pin_input" | "actions" | "success" | "change_pin";

const normalizeRutForCompare = (rut: string): string => rut.replace(/\./g, "").toUpperCase();

const sha256Hex = async (text: string): Promise<string> => {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const useKioskData = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    activeEmployees,
    isLoadingEmployees,
    isError: isErrorEmployees,
    refetchKioskEmployees,
    updateKioskPin,
  } = useEmployees(true);
  const { punchMutation } = useTimeRecordMutations();
  const { addToast } = useToasts();

  const punch = async (
    id: string,
    source: string,
    type?: string,
    location?: { latitude: number; longitude: number } | null,
  ) => {
    return punchMutation.mutateAsync({
      employeeId: id,
      source,
      forcedType: type,
      authScope: "kiosk",
      suppressErrorToast: true,
      ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
    });
  };

  const [step, setStep] = useState<KioskStep>("rut_input");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [rutInput, setRutInput] = useState("");
  const [rutError, setRutError] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [clockStatus, setClockStatus] = useState<ClockingStatus>("fuera");
  const [latestOpenRecord, setLatestOpenRecord] = useState<DailyTimeRecord | null>(null);
  const [isKioskArmed, setIsKioskArmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enteredRutPrefix, setEnteredRutPrefix] = useState("");
  const isSubmittingRef = useRef(false);
  const isVerifyingPinRef = useRef(false);
  const pinAbortControllerRef = useRef<AbortController | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = "auto";
      clearAllTimers();
      pinAbortControllerRef.current?.abort();
      authService.removeKioskToken();
    };
  }, [clearAllTimers]);

  const filteredEmployees = useMemo(() => {
    if (!debouncedSearchTerm) return activeEmployees;
    const normalizedSearch = normalizeString(debouncedSearchTerm).toLowerCase();
    return activeEmployees.filter((emp) =>
      normalizeString(emp.name).toLowerCase().includes(normalizedSearch),
    );
  }, [debouncedSearchTerm, activeEmployees]);

  const formattedRutDisplay = useMemo(() => {
    if (!rutInput) return "";
    if (rutInput.length <= 1) return rutInput;
    const body = rutInput.slice(0, -1);
    const dv = rutInput.slice(-1);
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formattedBody}-${dv}`;
  }, [rutInput]);

  useEffect(() => {
    if (!selectedEmployee) return;

    const fetchRecords = async () => {
      const dailyRecords = await idbGetAllBy<DailyTimeRecord>(
        STORES.DAILY_TIME_RECORDS,
        "employeeId",
        selectedEmployee.id,
      );
      const todayChile = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
      }).format(new Date());
      const latestRecord = dailyRecords
        .filter((r) => !r.isDeleted && r.date === todayChile)
        .sort((a, b) => (b.entradaTimestamp || 0) - (a.entradaTimestamp || 0))[0];

      const status = getContractClockingStatus(latestRecord as AttendanceRecord, () => "fuera");
      setClockStatus(status);

      if (["fuera", "terminada", "jornada_terminada_anomalia"].includes(status)) {
        setLatestOpenRecord(null);
      } else {
        setLatestOpenRecord(latestRecord);
      }
    };
    fetchRecords();
  }, [selectedEmployee]);

  const resetState = useCallback(
    (goTo: KioskStep = "rut_input") => {
      clearAllTimers();
      pinAbortControllerRef.current?.abort();
      pinAbortControllerRef.current = null;
      isVerifyingPinRef.current = false;
      setStep(goTo);
      setSelectedEmployee(null);
      setSearchTerm("");
      setPinInput("");
      setPinError("");
      setRutInput("");
      setRutError("");
      setNewPin("");
      setConfirmNewPin("");
      setEnteredRutPrefix("");
      setClockStatus("fuera");
      setLatestOpenRecord(null);
      setIsSubmitting(false);
      authService.removeKioskToken();
      setIsKioskArmed(false);
    },
    [clearAllTimers],
  );

  const handlePinConfirm = useCallback(async () => {
    if (!selectedEmployee || isVerifyingPinRef.current) return;
    isVerifyingPinRef.current = true;
    pinAbortControllerRef.current?.abort();
    const controller = new AbortController();
    pinAbortControllerRef.current = controller;

    try {
      const result = await authService.kioskVerifyPin(selectedEmployee.id, pinInput, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      if (result.success) {
        setPinError("");

        try {
          const freshRecords = await timeRecordService.getAll({
            pageSize: 1,
            filters: { employeeId: selectedEmployee.id },
            authScope: "kiosk",
          });
          if (controller.signal.aborted) return;

          const latestRecord = freshRecords.data[0];
          const status = getContractClockingStatus(latestRecord as AttendanceRecord, () => "fuera");

          setClockStatus(status);
          if (!["fuera", "terminada", "jornada_terminada_anomalia"].includes(status)) {
            setLatestOpenRecord(latestRecord);
          } else {
            setLatestOpenRecord(null);
          }
        } catch (fetchError) {
          if (controller.signal.aborted) return;
          logger.error("Error fetching fresh kiosk status:", fetchError);
          addToast("No se pudo verificar el estado de jornada. Intente nuevamente.", "error");
          setPinInput("");
          return;
        }

        if (result.mustChangePin === true) {
          setStep("change_pin");
        } else {
          setStep("actions");
          setIsKioskArmed(false);
          scheduleTimer(() => setIsKioskArmed(true), 800);
        }
      } else if (
        result.status === 403 ||
        result.code === "PIN_BLOCKED" ||
        result.message.includes("bloqueado")
      ) {
        queryClient.invalidateQueries({ queryKey: queryKeys.employeesKiosk() });
        addToast(result.message, "error", 7000);
        resetState();
      } else {
        setPinError(result.message);
        setPinInput("");
        scheduleTimer(() => setPinError(""), 2500);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      logger.error("Error verifying PIN:", error);
      addToast("Error al conectar con el servidor.", "error");
    } finally {
      isVerifyingPinRef.current = false;
    }
  }, [selectedEmployee, pinInput, addToast, resetState, scheduleTimer, queryClient]);

  useEffect(() => {
    if (step === "pin_input" && pinInput.length === 4) {
      handlePinConfirm();
    }
  }, [step, pinInput, handlePinConfirm]);

  const handleEmployeeSelect = useCallback(
    (employee: Employee) => {
      if (employee.isPinBlocked) {
        addToast("PIN bloqueado. Contacte a un administrador para resetearlo.", "error", 5000);
        return;
      }
      setSelectedEmployee(employee);
      setStep("pin_input");
    },
    [addToast],
  );

  const handleRutConfirm = useCallback(async () => {
    if (rutInput.length < 2) {
      setRutError("RUT demasiado corto.");
      scheduleTimer(() => setRutError(""), 2000);
      return;
    }
    const formattedRut = `${rutInput.slice(0, -1)}-${rutInput.slice(-1).toUpperCase()}`;

    if (!isValidChileanRut(formattedRut)) {
      setRutError("RUT no es válido.");
      scheduleTimer(() => setRutError(""), 2000);
      return;
    }

    const normalizedInput = normalizeRutForCompare(formattedRut);
    const inputHash = await sha256Hex(normalizedInput);
    const employee = activeEmployees.find((e) =>
      e.rutHash ? e.rutHash === inputHash : normalizeRutForCompare(e.rut ?? "") === normalizedInput,
    );
    if (employee) {
      setEnteredRutPrefix(rutInput.slice(0, 4));
      handleEmployeeSelect(employee);
    } else {
      setRutError("Empleado no encontrado.");
      scheduleTimer(() => setRutError(""), 2000);
    }
  }, [rutInput, activeEmployees, handleEmployeeSelect, scheduleTimer]);

  const handleSetNewPin = useCallback(async () => {
    if (!/^\d{4}$/.test(newPin)) {
      addToast("El nuevo PIN debe tener 4 dígitos.", "error");
      return;
    }
    if (newPin !== confirmNewPin) {
      addToast("Los PINs no coinciden.", "error");
      setNewPin("");
      setConfirmNewPin("");
      return;
    }
    if (enteredRutPrefix && newPin === enteredRutPrefix) {
      addToast("El nuevo PIN no puede coincidir con los primeros 4 dígitos de tu RUT.", "error");
      setNewPin("");
      setConfirmNewPin("");
      return;
    }
    if (!selectedEmployee) return;

    const success = await updateKioskPin(selectedEmployee.id, newPin);
    if (success) {
      addToast("PIN actualizado con éxito.", "success");
      setNewPin("");
      setConfirmNewPin("");
      setStep("actions");
      setIsKioskArmed(false);
      scheduleTimer(() => setIsKioskArmed(true), 800);
    }
  }, [
    newPin,
    confirmNewPin,
    enteredRutPrefix,
    selectedEmployee,
    updateKioskPin,
    addToast,
    scheduleTimer,
  ]);

  useEffect(() => {
    if (step !== "rut_input" && step !== "pin_input" && step !== "change_pin") {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      const key = e.key;

      if (step === "rut_input") {
        if (/^[0-9]$/.test(key)) {
          e.preventDefault();
          setRutInput((prev) => {
            if (prev.endsWith("K") || prev.length >= 10) return prev;
            return prev + key;
          });
        } else if (key === "k" || key === "K") {
          e.preventDefault();
          setRutInput((prev) => {
            if (prev.length < 1 || prev.includes("K") || prev.length >= 10) return prev;
            return prev + "K";
          });
        } else if (key === "Backspace") {
          e.preventDefault();
          setRutInput((prev) => prev.slice(0, -1));
        } else if (key === "Enter") {
          e.preventDefault();
          void handleRutConfirm();
        }
      } else if (step === "pin_input") {
        if (/^[0-9]$/.test(key)) {
          e.preventDefault();
          setPinInput((prev) => (prev.length < 4 ? prev + key : prev));
        } else if (key === "Backspace") {
          e.preventDefault();
          setPinInput((prev) => prev.slice(0, -1));
        } else if (key === "Enter" && pinInput.length === 4) {
          e.preventDefault();
          void handlePinConfirm();
        }
      } else if (step === "change_pin") {
        if (/^[0-9]$/.test(key)) {
          e.preventDefault();
          if (newPin.length < 4) {
            setNewPin((prev) => prev + key);
          } else if (confirmNewPin.length < 4) {
            setConfirmNewPin((prev) => prev + key);
          }
        } else if (key === "Backspace") {
          e.preventDefault();
          if (confirmNewPin.length > 0) {
            setConfirmNewPin((prev) => prev.slice(0, -1));
          } else {
            setNewPin((prev) => prev.slice(0, -1));
          }
        } else if (key === "Enter" && newPin.length === 4 && confirmNewPin.length === 4) {
          e.preventDefault();
          void handleSetNewPin();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    step,
    pinInput.length,
    newPin.length,
    confirmNewPin.length,
    handleRutConfirm,
    handlePinConfirm,
    handleSetNewPin,
  ]);

  const handleClockingAction = async (type: ClockingActionType) => {
    if (!selectedEmployee || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const geolocation = await getCurrentGeolocation();

      let forcedType: string | undefined;
      switch (type) {
        case "jornada_inicio":
          forcedType = "entrada";
          break;
        case "colacion_inicio":
          forcedType = "inicioColacion";
          break;
        case "colacion_fin":
          forcedType = "finColacion";
          break;
        case "jornada_fin":
          forcedType = "salida";
          break;
      }

      if (type === "jornada_inicio") {
        await punch(selectedEmployee.id, "KIOSK", forcedType, geolocation || undefined);
      } else {
        if (!latestOpenRecord) {
          addToast("No se encontró una jornada activa.", "error");
          return;
        }
        await punch(latestOpenRecord.employeeId, "KIOSK", forcedType, geolocation || undefined);
      }

      addToast("Registro guardado.", "success");
      setStep("success");
      scheduleTimer(() => resetState(), 2500);
    } catch (error) {
      logger.error("Error in clocking action:", error);
      if (error instanceof ApiHttpError && error.status === 401) {
        authService.removeKioskToken();
        resetState("rut_input");
        addToast("Sesión expirada. Ingrese nuevamente.", "error");
        return;
      }
      if (error instanceof ApiHttpError) {
        addToast(error.message || "Error al registrar marcaje. Intente nuevamente.", "error");
        return;
      }
      const backendMessage = error instanceof Error ? error.message : "";
      addToast(backendMessage || "Error al registrar marcaje. Intente nuevamente.", "error");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const kioskActions = useMemo(
    () => [
      {
        id: "jornada_inicio" as const,
        label: "Inicio Jornada",
        enabled: [
          "fuera",
          "terminada",
          "jornada_terminada_anomalia",
          "por_iniciar",
          "no_programado",
          "ausente",
        ].includes(clockStatus),
        actionType: "jornada_inicio" as ClockingActionType,
      },
      {
        id: "colacion_inicio" as const,
        label: "Inicio Colación",
        enabled: clockStatus === "en_jornada",
        actionType: "colacion_inicio" as ClockingActionType,
      },
      {
        id: "colacion_fin" as const,
        label: "Fin Colación",
        enabled: clockStatus === "en_colacion",
        actionType: "colacion_fin" as ClockingActionType,
      },
      {
        id: "jornada_fin" as const,
        label: "Fin Jornada",
        enabled: ["en_jornada", "en_jornada_post_colacion", "en_colacion"].includes(clockStatus),
        actionType: "jornada_fin" as ClockingActionType,
      },
    ],
    [clockStatus],
  );

  const clockStatusConfig = CLOCKING_STATUS_CONFIG[clockStatus];

  return {
    step,
    setStep,
    selectedEmployee,
    setSelectedEmployee,
    searchTerm,
    setSearchTerm,
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    rutInput,
    setRutInput,
    rutError,
    setRutError,
    newPin,
    setNewPin,
    confirmNewPin,
    setConfirmNewPin,
    clockStatus,
    latestOpenRecord,
    isKioskArmed,
    isSubmitting,
    kioskActions,
    clockStatusConfig,
    isLoadingEmployees,
    isErrorEmployees,
    refetchKioskEmployees,
    filteredEmployees,
    formattedRutDisplay,
    handleRutConfirm,
    handleEmployeeSelect,
    handlePinConfirm,
    handleSetNewPin,
    handleClockingAction,
    resetState,
    onLogout: async () => {
      await authService.kioskLogout();
      navigate(ROUTES.LOGIN);
    },
  };
};
