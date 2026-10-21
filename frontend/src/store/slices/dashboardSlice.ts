import { StateCreator } from "zustand";
import { AppState } from "../types";
import {
  Employee,
  DailyTimeRecord,
  ShiftReport,
  TimeRecordField,
  UpcomingEmployeeStatus,
} from "../../types/index";
import { formatChileTimeHHmm } from "../../utils/chileClock";

/**
 * Estado de UI puro (spec 032 T5).
 *
 * Las colecciones remotas del dashboard (`dailyRecords`, `recentRecords`)
 * viven en `useDashboardQueries` y los relojes marcan fuera de este archivo:
 * aqui no hay imports de servicios ni escritura a IndexedDB.
 */
export interface DashboardSlice {
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
}

export const createDashboardSlice: StateCreator<AppState, [], [], DashboardSlice> = (set) => ({
  // Initial State
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
        ? formatChileTimeHHmm(new Date(currentValue))
        : formatChileTimeHHmm(new Date());

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
});
