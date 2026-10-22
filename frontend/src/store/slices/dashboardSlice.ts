import { StateCreator } from "zustand";
import { AppState } from "../types";
import {
  Employee,
  DailyTimeRecord,
  ShiftReport,
  TimeRecordField,
  UpcomingEmployeeStatus,
} from "../../types/index";

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
  // El store solo dice **que marcaje** se esta editando; el borrador de hora
  // (su valor inicial y su estado) vive en el formulario del hook
  // `useTimestampEditor` (spec 036 T12c), no aqui.
  openEditTimestampModal: (record, field) => {
    set({
      isEditTimestampModalOpen: true,
      editingRecordInfo: { record, field },
    });
  },
  closeEditTimestampModal: () => {
    set({
      isEditTimestampModalOpen: false,
      editingRecordInfo: null,
    });
  },
});
