import { StateCreator } from "zustand";
import { AppState } from "../types";
import {
  Employee,
  DailyTimeRecord,
  ShiftReport,
  TimeRecordField,
  UpcomingEmployeeStatus,
} from "../../types/index";
import { formatDateToTimeLocal } from "../../utils/formatters";
import { toCaughtError } from "../../utils/caughtError";
import { timeRecordService } from "../../services/timeRecordService";

export interface DashboardSlice {
  // State
  isLoadingDashboardData: boolean;
  dailyRecords: DailyTimeRecord[];
  recentRecords: DailyTimeRecord[];

  // Modals State
  showReportDetailsModal: ShiftReport | null;
  employeeToClockIn: UpcomingEmployeeStatus | null;
  employeeToConfirmClockOut: Employee | null;
  showResponsibleUserClockOutConfirmation: boolean;
  isAnomaliesModalOpen: boolean;
  isPresentModalOpen: boolean;
  quickActionRecord: DailyTimeRecord | null;
  isEditTimestampModalOpen: boolean;
  editingRecordInfo: { record: DailyTimeRecord; field: TimeRecordField } | null;
  newTimestampValue: string;

  // Actions
  updateDashboardData: () => Promise<void>;

  // Modal Actions
  openReportDetailsModal: (report: ShiftReport) => void;
  closeReportDetailsModal: () => void;
  openClockInConfirmation: (employeeStatus: UpcomingEmployeeStatus) => void;
  closeClockInConfirmation: () => void;
  openAnomaliesModal: () => void;
  closeAnomaliesModal: () => void;
  openPresentModal: () => void;
  closePresentModal: () => void;
  openQuickActionModal: (record: DailyTimeRecord) => void;
  closeQuickActionModal: () => void;
  openResponsibleUserClockOutConfirmation: (employee: Employee) => void;
  closeResponsibleClockOutConfirmation: () => void;
  openEditTimestampModal: (record: DailyTimeRecord, field: TimeRecordField) => void;
  closeEditTimestampModal: () => void;
  setNewTimestampValue: (value: string) => void;

  // Logic Actions
  confirmClockIn: () => Promise<void>;
  confirmResponsibleClockOut: () => Promise<boolean>;
}

export const createDashboardSlice: StateCreator<AppState, [], [], DashboardSlice> = (set, get) => ({
  // Initial State
  isLoadingDashboardData: true,
  welcomeName: "Invitado",
  userClockingStatus: { status: "unknown" },
  dailyRecords: [],
  recentRecords: [],
  showReportDetailsModal: null,
  employeeToClockIn: null,
  employeeToConfirmClockOut: null,
  showResponsibleUserClockOutConfirmation: false,
  isAnomaliesModalOpen: false,
  isPresentModalOpen: false,
  quickActionRecord: null,
  isEditTimestampModalOpen: false,
  editingRecordInfo: null,
  newTimestampValue: "",

  // Actions

  updateDashboardData: async () => {
    try {
      // Fetch recent records for the recent activity widget
      const recentResponse = await timeRecordService.getAll({
        pageSize: 50,
        page: 1,
      });
      const recentRecords = recentResponse.data;
      set({ dailyRecords: recentRecords, recentRecords });
    } catch (error) {
      console.error("Error updating dashboard data:", error);
    } finally {
      set({ isLoadingDashboardData: false });
    }
  },

  // Modal Actions
  openReportDetailsModal: (report) => set({ showReportDetailsModal: report }),
  closeReportDetailsModal: () => set({ showReportDetailsModal: null }),
  openClockInConfirmation: (employeeStatus) => set({ employeeToClockIn: employeeStatus }),
  closeClockInConfirmation: () => set({ employeeToClockIn: null }),
  openAnomaliesModal: () => set({ isAnomaliesModalOpen: true }),
  closeAnomaliesModal: () => set({ isAnomaliesModalOpen: false }),
  openPresentModal: () => set({ isPresentModalOpen: true }),
  closePresentModal: () => set({ isPresentModalOpen: false }),
  openQuickActionModal: (record) => set({ quickActionRecord: record }),
  closeQuickActionModal: () => set({ quickActionRecord: null }),
  openResponsibleUserClockOutConfirmation: (employee) =>
    set({
      employeeToConfirmClockOut: employee,
      showResponsibleUserClockOutConfirmation: true,
    }),
  closeResponsibleClockOutConfirmation: () =>
    set({
      showResponsibleUserClockOutConfirmation: false,
      employeeToConfirmClockOut: null,
    }),
  openEditTimestampModal: (record, field) => {
    const currentValue = record[field];
    const initialValue =
      currentValue && currentValue !== "SIN REGISTRO"
        ? formatDateToTimeLocal(new Date(currentValue))
        : formatDateToTimeLocal(new Date());

    set({
      isEditTimestampModalOpen: true,
      editingRecordInfo: { record, field },
      newTimestampValue: initialValue,
    });
  },
  closeEditTimestampModal: () => {
    set({
      isEditTimestampModalOpen: false,
      editingRecordInfo: null,
      newTimestampValue: "",
    });
  },
  setNewTimestampValue: (value) => {
    set({ newTimestampValue: value });
  },

  // Logic Actions
  confirmClockIn: async () => {
    const { employeeToClockIn, updateDashboardData, addToast } = get();
    if (!employeeToClockIn) return;
    try {
      await timeRecordService.punch(employeeToClockIn.employee.id, "OPERATOR");
      set({ employeeToClockIn: null });
      await updateDashboardData();
      addToast("Entrada registrada con éxito", "success");
    } catch (error: unknown) {
      addToast(toCaughtError(error).message || "Error al registrar entrada", "error");
    }
  },

  confirmResponsibleClockOut: async () => {
    const { employeeToConfirmClockOut, updateDashboardData, addToast } = get();
    if (!employeeToConfirmClockOut) return false;
    try {
      // Clock out the responsible user which triggers automatic shift closure on backend
      await timeRecordService.punch(employeeToConfirmClockOut.id, "WEB", "salida");
      set({
        showResponsibleUserClockOutConfirmation: false,
        employeeToConfirmClockOut: null,
      });
      await updateDashboardData();
      addToast("Turno cerrado y salida registrada correctamente", "success");
      return true;
    } catch (error: unknown) {
      addToast(toCaughtError(error).message || "Error al cerrar turno", "error");
      return false;
    }
  },
});
