import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReportsQuery } from "../../../hooks/queries/useReportsQuery";
import { ShiftReport, LogbookEntryItem } from "../../../types/index";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { STORAGE_KEYS, ROUTES } from "../../../constants";
import { useEmployees } from "../../../hooks/useEmployees";
import { useUsers } from "../../../hooks/useUsers";
import { formatTime } from "../../../utils/formatters";
import { useShiftManager } from "../../../hooks/useShiftManager";
import { useTimeRecords } from "../../../hooks/useTimeRecords";
import { idFactory } from "../../../utils/idFactory";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { shiftReportService } from "../../../services/shiftReportService";

export const useLogbookData = () => {
  const { currentUser, logout } = useAuth();
  const { addToast } = useToasts();
  const { getEmployeeById } = useEmployees();
  const { users } = useUsers();
  const { startNewShift } = useShiftManager();
  const { punch } = useTimeRecords();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const navigate = useNavigate();

  const {
    data: shiftReports = [],
    refetch: loadShiftReports,
    isLoading: isLoadingReports,
  } = useReportsQuery({ status: "open" });

  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [isStartingShift, setIsStartingShift] = useState(false);
  const [showLogoutCountdownModal, setShowLogoutCountdownModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showCloseShiftConfirmation, setShowCloseShiftConfirmation] = useState(false);
  const [showShiftHistoryModal, setShowShiftHistoryModal] = useState(false);
  const [showLogEntryModal, setShowLogEntryModal] = useState(false);
  const [showSupplierEntryModal, setShowSupplierEntryModal] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedReport, setSelectedReport] = useState<ShiftReport | null>(null);

  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    if (!showLogoutCountdownModal) return;
    setCountdown(5);
    const timer = setInterval(
      () =>
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            logoutRef.current();
            window.location.reload();
            return 0;
          }
          return prev - 1;
        }),
      1000,
    );
    return () => clearInterval(timer);
  }, [showLogoutCountdownModal]);

  useEffect(() => {
    const openShift = shiftReports.find((s) => s.status === "open");
    if (openShift) setActiveShiftId(openShift.id);
    else setActiveShiftId(null);
  }, [shiftReports]);

  useEffect(() => {
    const reportId = searchParams.get("id");
    if (reportId && !selectedReport) {
      shiftReportService.getAll({ pageSize: 1, status: undefined }).then((res) => {
        const found = res.data.find((r) => r.id === reportId);
        if (found) {
          setSelectedReport(found);
        }
      });
    }
  }, [searchParams, selectedReport]);

  const handleCloseReportDetails = () => {
    setSelectedReport(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("id");
    setSearchParams(newParams);
  };

  const activeShift = useMemo(
    () => shiftReports.find((s) => s.id === activeShiftId),
    [shiftReports, activeShiftId],
  );

  const getResponsibleDisplayName = useCallback(
    (username: string): string =>
      users.find((u) => u.username === username)?.employeeId
        ? getEmployeeById(users.find((u) => u.username === username)!.employeeId!)?.name || username
        : username,
    [users, getEmployeeById],
  );

  const canCurrentUserCloseActiveShift = useMemo(() => {
    if (!currentUser || !activeShift) return false;
    return true;
  }, [currentUser, activeShift]);

  const executeCloseShift = useCallback(async () => {
    if (!activeShiftId || !activeShift || !currentUser) return;
    const now = new Date();
    const closingEntry: LogbookEntryItem = {
      id: idFactory.ulid(),
      time: formatTime(now),
      annotation: "Cierre de Turno, con Novedades Mencionadas",
      timestamp: now.getTime(),
    };
    const updatedShift: ShiftReport = {
      ...activeShift,
      logEntries: [...activeShift.logEntries, closingEntry].sort(
        (a, b) => a.timestamp - b.timestamp,
      ),
      status: "closed",
      endTime: now.toISOString(),
      lastModified: now.getTime(),
      syncStatus: "pending",
    };

    try {
      await shiftReportService.save(updatedShift);
      await loadShiftReports();

      addToast(`Turno ${updatedShift.folio} cerrado.`, "success");
      setShowCloseShiftConfirmation(false);
      if (updatedShift.responsibleUser === currentUser.username) {
        if (currentUser.employeeId) {
          try {
            await punch(currentUser.employeeId, "out");
            addToast("Marcación de salida registrada automáticamente.", "success");
          } catch (error) {
            console.error("Auto clock-out failed:", error);
            addToast("No se pudo registrar la salida automática del personal.", "warning");
          }
        }
        setShowLogoutCountdownModal(true);
      } else {
        navigate(ROUTES.DASHBOARD);
      }
    } catch (error) {
      console.error("Error closing shift:", error);
      addToast("Error al cerrar el turno.", "error");
      setShowCloseShiftConfirmation(false);
    }
  }, [activeShift, activeShiftId, addToast, currentUser, loadShiftReports, navigate, punch]);

  useEffect(() => {
    const autoClose = sessionStorage.getItem(STORAGE_KEYS.TRIGGER_AUTO_CLOSE_SHIFT);
    if (autoClose === "true" && activeShift) {
      sessionStorage.removeItem(STORAGE_KEYS.TRIGGER_AUTO_CLOSE_SHIFT);
      executeCloseShift();
    }
  }, [activeShift, executeCloseShift]);

  const handleStartShift = async () => {
    setIsStartingShift(true);
    await startNewShift();
    setIsStartingShift(false);
  };

  const handleUpdateShift = async (updatedShift: ShiftReport) => {
    try {
      await shiftReportService.save(updatedShift);
      await loadShiftReports();
    } catch (error) {
      console.error("Error updating shift report:", error);
      addToast("Error al actualizar el reporte de turno.", "error");
    }
  };

  const handleOpenReportDetails = (report: ShiftReport) => {
    setSelectedReport(report);
  };

  const handleNavigateDashboard = () => {
    navigate(ROUTES.DASHBOARD);
  };

  const onDownloadPDF = async (report: ShiftReport) => {
    try {
      await shiftReportService.downloadShiftReportPDF(report.id);
      addToast("Descarga iniciada", "success");
    } catch (error) {
      console.error("Download error:", error);
      addToast("Error al descargar el PDF", "error");
    }
  };

  const onExportExcel = async (report: ShiftReport) => {
    try {
      await shiftReportService.downloadShiftReportExcel(report.id);
      addToast("Exportación Excel iniciada", "success");
    } catch (error) {
      console.error("Export error:", error);
      addToast("Error al exportar a Excel", "error");
    }
  };

  return {
    isLoadingReports,
    activeShift,
    isMobile,
    isStartingShift,
    showShiftHistoryModal,
    showLogEntryModal,
    showSupplierEntryModal,
    showFabMenu,
    selectedReport,
    showLogoutCountdownModal,
    countdown,
    showCloseShiftConfirmation,
    canCurrentUserCloseActiveShift,
    setShowShiftHistoryModal,
    setShowLogEntryModal,
    setShowSupplierEntryModal,
    setShowFabMenu,
    setShowCloseShiftConfirmation,
    getResponsibleDisplayName,
    executeCloseShift,
    handleStartShift,
    handleUpdateShift,
    handleOpenReportDetails,
    handleCloseReportDetails,
    handleNavigateDashboard,
    onDownloadPDF,
    onExportExcel,
  };
};
