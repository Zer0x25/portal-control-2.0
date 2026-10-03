import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useEmployees } from "../../../hooks/useEmployees";
import { useTimeRecordMutations } from "../../../hooks/queries/useTimeRecordsQuery";
import { useToasts } from "../../../hooks/useToasts";
import { useDebounce } from "../../../hooks/useDebounce";
import { AttendanceRecord, Employee, DailyTimeRecord, ClockingStatus } from "../../../types/index";
import { ROUTES } from "../../../constants";
import { isValidChileanRut } from "../../../utils/validation";
import { authService } from "../../../services/authService";
import { timeRecordService } from "../../../services/timeRecordService";
import { CLOCKING_STATUS_CONFIG, getContractClockingStatus } from "../../../utils/mappings";
import { idbGetAllBy, STORES } from "../../../utils/indexedDB";
import { normalizeString } from "../../../utils/stringUtils";
import { getCurrentGeolocation } from "../../../utils/geolocation";

export type KioskStep =
  | "rut_input"
  | "employee_list"
  | "pin_input"
  | "set_new_pin"
  | "actions"
  | "success"
  | "change_pin";

type KioskActionType = "jornada_inicio" | "colacion_inicio" | "colacion_fin" | "jornada_fin";

export const useKioskData = () => {
  const navigate = useNavigate();
  const { activeEmployees, isLoadingEmployees, updateEmployee } = useEmployees(true);
  const { punchMutation } = useTimeRecordMutations();
  const { addToast } = useToasts();

  const punch = async (id: string, source: string, type?: string, _location?: unknown) => {
    return punchMutation.mutateAsync({ employeeId: id, source, forcedType: type });
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
  const isSubmittingRef = useRef(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.overscrollBehavior = "auto";
    };
  }, []);

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
      const latestRecord = dailyRecords.sort(
        (a, b) => (b.entradaTimestamp || 0) - (a.entradaTimestamp || 0),
      )[0];

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

  const resetState = useCallback((goTo: KioskStep = "rut_input") => {
    setStep(goTo);
    setSelectedEmployee(null);
    setSearchTerm("");
    setPinInput("");
    setPinError("");
    setRutInput("");
    setRutError("");
    setNewPin("");
    setConfirmNewPin("");
    authService.removeToken();
    setIsKioskArmed(false);
  }, []);

  const handlePinConfirm = useCallback(async () => {
    if (!selectedEmployee) return;

    try {
      const result = await authService.kioskVerifyPin(selectedEmployee.id, pinInput);

      if (result.success) {
        setPinError("");

        try {
          const freshRecords = await timeRecordService.getAll({
            pageSize: 1,
            filters: { employeeId: selectedEmployee.id },
          });
          const latestRecord = freshRecords.data[0];
          const status = getContractClockingStatus(latestRecord as AttendanceRecord, () => "fuera");

          setClockStatus(status);
          if (!["fuera", "terminada", "jornada_terminada_anomalia"].includes(status)) {
            setLatestOpenRecord(latestRecord);
          } else {
            setLatestOpenRecord(null);
          }
        } catch (fetchError) {
          console.error("Error fetching fresh kiosk status:", fetchError);
        }

        setStep("actions");
        setIsKioskArmed(false);
        setTimeout(() => setIsKioskArmed(true), 800);
      } else if (result.message.includes("bloqueado")) {
        addToast(result.message, "error", 7000);
        resetState();
      } else {
        setPinError(result.message);
        setPinInput("");
        setTimeout(() => setPinError(""), 2500);
      }
    } catch (error) {
      console.error("Error verifying PIN:", error);
      addToast("Error al conectar con el servidor.", "error");
    }
  }, [selectedEmployee, pinInput, addToast, resetState]);

  useEffect(() => {
    if (step === "pin_input" && pinInput.length === 4) {
      handlePinConfirm();
    }
  }, [step, pinInput, handlePinConfirm]);

  const handleEmployeeSelect = (employee: Employee) => {
    if (employee.isPinBlocked) {
      addToast("PIN bloqueado. Contacte a un administrador para resetearlo.", "error", 5000);
      return;
    }
    if (!employee.rut) {
      addToast("Este empleado no tiene RUT configurado para verificación.", "error");
      return;
    }
    setSelectedEmployee(employee);
    setStep("pin_input");
  };

  const handleRutConfirm = () => {
    if (rutInput.length < 2) {
      setRutError("RUT demasiado corto.");
      setTimeout(() => setRutError(""), 2000);
      return;
    }
    const formattedRut = `${rutInput.slice(0, -1)}-${rutInput.slice(-1).toUpperCase()}`;

    if (!isValidChileanRut(formattedRut)) {
      setRutError("RUT no es válido.");
      setTimeout(() => setRutError(""), 2000);
      return;
    }

    const employee = activeEmployees.find((e) => e.rut === formattedRut);
    if (employee) handleEmployeeSelect(employee);
    else {
      setRutError("Empleado no encontrado.");
      setTimeout(() => setRutError(""), 2000);
    }
  };

  const handleSetNewPin = async () => {
    if (newPin.length !== 4) {
      addToast("El nuevo PIN debe tener 4 dígitos.", "error");
      return;
    }
    if (newPin !== confirmNewPin) {
      addToast("Los PINs no coinciden.", "error");
      setNewPin("");
      setConfirmNewPin("");
      return;
    }
    if (!selectedEmployee) return;

    const success = await updateEmployee({ ...selectedEmployee, pin: newPin });
    if (success) {
      addToast("PIN actualizado con éxito.", "success");
      setSelectedEmployee({ ...selectedEmployee, pin: newPin });
      setStep("actions");
      setIsKioskArmed(false);
      setTimeout(() => setIsKioskArmed(true), 800);
    } else addToast("Error al actualizar el PIN.", "error");
  };

  const handleClockingAction = async (type: KioskActionType) => {
    if (!selectedEmployee || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      const geolocation = await getCurrentGeolocation();

      let forcedType: string | undefined;
      switch (type) {
        case "jornada_inicio":
          forcedType = "entrada";
          break;
        case "colacion_inicio":
          forcedType = "inicio_colacion";
          break;
        case "colacion_fin":
          forcedType = "fin_colacion";
          break;
        case "jornada_fin":
          forcedType = "salida";
          break;
      }

      if (type === "jornada_inicio") {
        await punch(selectedEmployee.id, "SELF_SERVICE", forcedType, geolocation || undefined);
      } else {
        if (!latestOpenRecord) {
          addToast("No se encontró una jornada activa.", "error");
          return;
        }
        await punch(
          latestOpenRecord.employeeId,
          "SELF_SERVICE",
          forcedType,
          geolocation || undefined,
        );
      }

      addToast("Registro guardado.", "success");
      setStep("success");
      setTimeout(() => resetState(), 2500);
    } catch (error) {
      console.error("Error in clocking action:", error);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const kioskActions = useMemo(
    () => [
      {
        id: "jornada_inicio" as const,
        label: "Inicio Jornada",
        color: "green" as const,
        enabled: ["fuera", "terminada", "jornada_terminada_anomalia"].includes(clockStatus),
        actionType: "jornada_inicio" as KioskActionType,
      },
      {
        id: "colacion_inicio" as const,
        label: "Inicio Colación",
        color: "yellow" as const,
        enabled: clockStatus === "en_jornada",
        actionType: "colacion_inicio" as KioskActionType,
      },
      {
        id: "colacion_fin" as const,
        label: "Fin Colación",
        color: "blue" as const,
        enabled: clockStatus === "en_colacion",
        actionType: "colacion_fin" as KioskActionType,
      },
      {
        id: "jornada_fin" as const,
        label: "Fin Jornada",
        color: "red" as const,
        enabled: ["en_jornada", "en_jornada_post_colacion", "en_colacion"].includes(clockStatus),
        actionType: "jornada_fin" as KioskActionType,
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
    kioskActions,
    clockStatusConfig,
    isLoadingEmployees,
    filteredEmployees,
    formattedRutDisplay,
    handleRutConfirm,
    handleEmployeeSelect,
    handlePinConfirm,
    handleSetNewPin,
    handleClockingAction,
    resetState,
    onLogout: () => navigate(ROUTES.LOGIN),
  };
};
