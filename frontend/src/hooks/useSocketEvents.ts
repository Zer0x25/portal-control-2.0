import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "../store/useStore";

/**
 * A global hook to listen for WebSocket events and trigger Query invalidations.
 * This bridges the gap between Push events and the TanStack Query cache.
 */
export const useSocketEvents = () => {
  const queryClient = useQueryClient();
  const userId = useStore((state) => state.currentUser?.id);
  const authenticated = useStore((state) => state.isAuthenticated);
  const debounceTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Helper to debounce invalidations (prevents spamming refetches)
  const debouncedInvalidate = useCallback(
    (key: string, queryKey: string[], delay = 500) => {
      if (debounceTimeouts.current[key]) {
        clearTimeout(debounceTimeouts.current[key]);
      }
      debounceTimeouts.current[key] = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
        delete debounceTimeouts.current[key];
      }, delay);
    },
    [queryClient],
  );

  useEffect(() => {
    if (!authenticated || !userId) return;
    let disconnect: (() => void) | undefined;
    let mounted = true;
    let activeSocket: {
      on: (event: string, listener: (...args: unknown[]) => void) => void;
      off: (event: string, listener?: (...args: unknown[]) => void) => void;
    } | null = null;

    const setupSocket = async () => {
      const { socketService } = await import("../services/socketService");
      if (!mounted) return;
      disconnect = () => socketService.disconnect();

      const socket = socketService.connect();
      activeSocket = socket;

      socket.on("connect", () => {
        // Quiet connect
      });

      socket.on("connect_error", (err: unknown) => {
        const message = err instanceof Error ? err.message : "Unknown socket error";
        console.warn("🔌 ❌ Real-time connection error:", message);
      });

      // -- Time Record Events --
      const handleTimeRecordUpdate = () => {
        debouncedInvalidate("timeRecords", ["timeRecords"]);
        debouncedInvalidate("dashboard", ["dashboard"]);
      };

      socket.on("timeRecord:created", handleTimeRecordUpdate);
      socket.on("timeRecord:updated", handleTimeRecordUpdate);
      socket.on("timeRecord:deleted", handleTimeRecordUpdate);
      socket.on("timeRecord:batch_created", handleTimeRecordUpdate);

      // -- Employee Events --
      const handleEmployeeUpdate = () => {
        debouncedInvalidate("employees", ["employees"]);
      };

      socket.on("employee:updated", handleEmployeeUpdate);

      // -- Shift Events --
      const handleShiftUpdate = () => {
        debouncedInvalidate("shiftPatterns", ["shiftPatterns"]);
        debouncedInvalidate("assignedShifts", ["assignedShifts"]);
        debouncedInvalidate("calendar", ["calendar"]);
      };

      socket.on("shiftPattern:updated", handleShiftUpdate);
      socket.on("assignedShift:updated", handleShiftUpdate);

      // -- Global Config Events --
      const handleConfigUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ["config"] });
      };
      socket.on("config:updated", handleConfigUpdate);

      // -- Shift Report Events --
      const handleShiftReportUpdate = () => {
        debouncedInvalidate("reports", ["reports"]);
      };
      socket.on("shiftReport:created", handleShiftReportUpdate);
      socket.on("shiftReport:updated", handleShiftReportUpdate);
      socket.on("shiftReport:deleted", handleShiftReportUpdate);

      // -- Audit Log Events --
      const handleAuditLogCreated = () => {
        debouncedInvalidate("auditLogs", ["auditLogs"], 1000);
      };
      socket.on("auditLog:created", handleAuditLogCreated);

      // -- Quick Note Events --
      const handleQuickNoteUpdate = (data: unknown) => {
        useStore.getState().handleQuickNoteSocketEvent(data);
        debouncedInvalidate("notes", ["notes"]);
      };
      socket.on("quickNote:created", handleQuickNoteUpdate);
      socket.on("quickNote:deleted", handleQuickNoteUpdate);

      // -- Correction Request Events --
      const handleCorrectionUpdate = (data: unknown) => {
        useStore.getState().handleCorrectionRequestSocketEvent(data);
        useStore.getState().loadNotifications();
        debouncedInvalidate("correctionRequests", ["correctionRequests"]);
      };
      socket.on("correctionRequest:created", handleCorrectionUpdate);
      socket.on("correctionRequest:updated", handleCorrectionUpdate);
      socket.on("correctionRequest:deleted", handleCorrectionUpdate);

      // -- User Events --
      const handleUserUpdate = () => {
        debouncedInvalidate("users", ["users"]);
        useStore.getState().loadUsers();
      };
      socket.on("user:updated", handleUserUpdate);

      // -- Holiday Events --
      const handleHolidayUpdate = () => {
        debouncedInvalidate("holidays", ["holidays"]);
      };
      socket.on("holiday:updated", handleHolidayUpdate);

      // -- Leave Events --
      const handleLeaveUpdate = () => {
        debouncedInvalidate("leaves", ["leaves"]);
      };
      socket.on("leave:updated", handleLeaveUpdate);

      // -- Meter Events --
      const handleMeterUpdate = () => {
        debouncedInvalidate("meters", ["meters"]);
      };
      socket.on("meter:updated", handleMeterUpdate);

      const handleForcedLogout = (data: unknown) => {
        const detail =
          typeof data === "object" && data !== null
            ? (data as { reason?: string; restartRecommended?: boolean })
            : {};

        useStore
          .getState()
          .addToast(
            detail.reason === "DATABASE_RESTORE"
              ? "La base fue restaurada. Debes iniciar sesión nuevamente."
              : "Se cerró tu sesión por una operación crítica del sistema.",
            "warning",
            5000,
          );

        window.dispatchEvent(new CustomEvent("unauthorized"));
      };
      socket.on("auth:force_logout", handleForcedLogout);

      const handleMaintenanceState = (data: unknown) => {
        const detail =
          typeof data === "object" && data !== null
            ? (data as { active?: boolean; operation?: string })
            : {};

        if (detail.active) {
          useStore
            .getState()
            .addToast(
              `Mantenimiento crítico en curso${detail.operation ? `: ${detail.operation}` : ""}.`,
              "info",
              4000,
            );
        }
      };
      socket.on("system:maintenance", handleMaintenanceState);

      return () => {
        socket.off("connect");
        socket.off("connect_error");
        socket.off("server:ready");
        socket.off("timeRecord:created", handleTimeRecordUpdate);
        socket.off("timeRecord:updated", handleTimeRecordUpdate);
        socket.off("timeRecord:deleted", handleTimeRecordUpdate);
        socket.off("timeRecord:batch_created", handleTimeRecordUpdate);
        socket.off("employee:updated", handleEmployeeUpdate);
        socket.off("shiftPattern:updated", handleShiftUpdate);
        socket.off("assignedShift:updated", handleShiftUpdate);
        socket.off("config:updated", handleConfigUpdate);
        socket.off("shiftReport:created", handleShiftReportUpdate);
        socket.off("shiftReport:updated", handleShiftReportUpdate);
        socket.off("shiftReport:deleted", handleShiftReportUpdate);
        socket.off("auditLog:created", handleAuditLogCreated);
        socket.off("quickNote:created", handleQuickNoteUpdate);
        socket.off("quickNote:deleted", handleQuickNoteUpdate);
        socket.off("correctionRequest:created", handleCorrectionUpdate);
        socket.off("correctionRequest:updated", handleCorrectionUpdate);
        socket.off("correctionRequest:deleted", handleCorrectionUpdate);
        socket.off("user:updated", handleUserUpdate);
        socket.off("holiday:updated", handleHolidayUpdate);
        socket.off("leave:updated", handleLeaveUpdate);
        socket.off("meter:updated", handleMeterUpdate);
        socket.off("auth:force_logout", handleForcedLogout);
        socket.off("system:maintenance", handleMaintenanceState);
      };
    };

    let cleanupSocketListeners: (() => void) | undefined;
    void setupSocket().then((cleanup) => {
      cleanupSocketListeners = cleanup;
    });

    return () => {
      mounted = false;
      Object.values(debounceTimeouts.current).forEach(clearTimeout);
      cleanupSocketListeners?.();
      activeSocket?.off("connect");
      activeSocket?.off("connect_error");
      disconnect?.();
    };
  }, [queryClient, debouncedInvalidate, authenticated, userId]);
};
