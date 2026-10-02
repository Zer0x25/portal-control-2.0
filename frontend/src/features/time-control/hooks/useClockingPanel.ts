import { useState, useEffect, useRef, useCallback } from "react";
import { ClockingStatus, Employee } from "../../../types/index";
import { useEmployees } from "../../../hooks/useEmployees";
import { useTimeRecords } from "../../../hooks/useTimeRecords";
import { useTimeRecordMutations } from "../../../hooks/queries/useTimeRecordsQuery";
import { useToasts } from "../../../hooks/useToasts";
import { useAuth } from "../../../hooks/useAuth";
import { normalizeString } from "../../../utils/stringUtils";
import { getContractClockingStatus } from "../../../utils/mappings";
import { useMediaQuery } from "../../../hooks/useMediaQuery";

export interface ClockingPanelState {
  searchTerm: string;
  selectedEmployeeId: string | null;
  selectedEmployee: Employee | null;
  clockStatus: ClockingStatus;
  isSubmitting: boolean;
  filteredEmployees: Employee[];
  statusLabels: Record<ClockingStatus, string>;
  isLoadingRecords: boolean;
}

export interface ClockingPanelActions {
  setSearchTerm: (term: string) => void;
  setSelectedEmployeeId: (id: string | null) => void;
  handleFocus: () => void;
  performActionAndReset: (
    type: "jornada_inicio" | "colacion_inicio" | "colacion_fin" | "jornada_fin",
  ) => Promise<void>;
}

export const useClockingPanel = (): ClockingPanelState & ClockingPanelActions => {
  const { activeEmployees } = useEmployees();
  const { punchMutation } = useTimeRecordMutations();
  const { addToast } = useToasts();
  const { currentUser } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const containerRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeId, _setSelectedEmployeeId] = useState<string | null>(null);
  const setSelectedEmployeeId = useCallback(
    (id: string | null) => {
      _setSelectedEmployeeId(id);
      if (!id) {
        setSearchTerm("");
        return;
      }
      const employee = activeEmployees.find((e) => e.id === id);
      if (employee) {
        setSearchTerm(employee.name);
      }
    },
    [activeEmployees],
  );
  const [clockStatus, setClockStatus] = useState<ClockingStatus>("fuera");
  const isSubmittingRef = useRef(false);

  // Query for the selected employee's latest record
  const { timeRecordsPage: employeeRecordsData, isLoadingRecords } = useTimeRecords({
    page: 1,
    pageSize: 5,
    filters: {
      desde: "",
      hasta: "",
      employeeId: selectedEmployeeId || undefined,
    },
  });

  // Update clock status when employee or records change
  useEffect(() => {
    if (!selectedEmployeeId || !employeeRecordsData) {
      if (!selectedEmployeeId) {
        setClockStatus("fuera");
      }
      return;
    }

    const latestRecord = employeeRecordsData[0];
    if (!latestRecord) {
      setClockStatus("fuera");
      return;
    }

    const status = getContractClockingStatus(latestRecord, () => "fuera");
    setClockStatus(status);
  }, [selectedEmployeeId, employeeRecordsData]);

  const selectedEmployee = activeEmployees.find((e) => e.id === selectedEmployeeId) || null;

  const handleSearchTermChange = useCallback(
    (term: string) => {
      setSearchTerm(term);

      if (!selectedEmployeeId) return;

      const currentSelected = activeEmployees.find((e) => e.id === selectedEmployeeId);
      if (!currentSelected) {
        _setSelectedEmployeeId(null);
        return;
      }

      if (!term.trim()) {
        _setSelectedEmployeeId(null);
        setClockStatus("fuera");
        return;
      }

      const isSameAsSelected =
        normalizeString(currentSelected.name).toLowerCase() === normalizeString(term).toLowerCase();

      if (!isSameAsSelected) {
        _setSelectedEmployeeId(null);
      }
    },
    [activeEmployees, selectedEmployeeId],
  );

  const handleFocus = () => {
    if (isMobile && containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  };

  const handleRecordAction = async (
    type: "jornada_inicio" | "colacion_inicio" | "colacion_fin" | "jornada_fin",
  ): Promise<boolean> => {
    if (!selectedEmployeeId) {
      addToast("Por favor, seleccione un empleado.", "warning");
      return false;
    }
    const employee = activeEmployees.find((e) => e.id === selectedEmployeeId);
    if (!employee || !currentUser) {
      addToast("Empleado o usuario actual no encontrado.", "error");
      return false;
    }

    let backendAction: "entrada" | "inicio_colacion" | "fin_colacion" | "salida" | undefined;
    switch (type) {
      case "jornada_inicio":
        backendAction = "entrada";
        break;
      case "colacion_inicio":
        backendAction = "inicio_colacion";
        break;
      case "colacion_fin":
        backendAction = "fin_colacion";
        break;
      case "jornada_fin":
        backendAction = "salida";
        break;
    }

    try {
      const result = await punchMutation.mutateAsync({
        employeeId: employee.id,
        source: "OPERATOR",
        forcedType: backendAction,
      });

      if (result.success) {
        addToast(`Acción registrada exitosamente: ${result.action}`, "success");
        return true;
      }
      return true;
    } catch (error: unknown) {
      console.error("Clocking error:", error);
      return false;
    }
  };

  const performActionAndReset = async (
    type: "jornada_inicio" | "colacion_inicio" | "colacion_fin" | "jornada_fin",
  ) => {
    if (!selectedEmployeeId || isSubmittingRef.current) {
      if (!selectedEmployeeId) addToast("Por favor, seleccione un empleado.", "warning");
      return;
    }

    isSubmittingRef.current = true;
    const success = await handleRecordAction(type);
    isSubmittingRef.current = false;
    if (success) {
      setSearchTerm("");
      setSelectedEmployeeId(null);
      setClockStatus("fuera");
    }
  };

  const filteredEmployees = activeEmployees
    .filter((e) =>
      normalizeString(e.name).toLowerCase().includes(normalizeString(searchTerm).toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const statusLabels: Record<ClockingStatus, string> = {
    fuera: "Fuera de Jornada",
    en_jornada: "En Jornada",
    en_jornada_post_colacion: "En Jornada (Post-Colación)",
    en_colacion: "En Colación",
    terminada: "Jornada Terminada",
    jornada_terminada_anomalia: "Jornada Cerrada (Anomalía)",
    por_iniciar: "Por Iniciar",
    no_programado: "No Programado",
    ausente: "Ausente",
  };

  return {
    // State
    searchTerm,
    selectedEmployeeId,
    selectedEmployee,
    clockStatus,
    isSubmitting: isSubmittingRef.current,
    filteredEmployees,
    statusLabels,
    isLoadingRecords,

    // Actions
    setSearchTerm: handleSearchTermChange,
    setSelectedEmployeeId,
    handleFocus,
    performActionAndReset,
  };
};
