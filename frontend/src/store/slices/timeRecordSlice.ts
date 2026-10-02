import { StateCreator } from "zustand";
import { AppState } from "../types";
import { DailyTimeRecord, LeaveRecord } from "../../types/index";
import { timeRecordService } from "../../services/timeRecordService";
import type { TimeRecordQueryParams } from "../../services/timeRecordService";

export interface TimeRecordSlice {
  timeRecordsPage: DailyTimeRecord[];
  allRecordsInDateRange: DailyTimeRecord[];
  isLoadingRecords: boolean;
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  recentRecords: DailyTimeRecord[];
  dailyRecords: DailyTimeRecord[];

  loadTimeRecordsPage: (params?: TimeRecordQueryParams) => Promise<void>;
  loadRecentTimeRecords: () => Promise<void>;
  loadRecordsByDateRange: (start: string, end: string, employeeId?: string) => Promise<void>;
  justifyRecordsForLeave: (
    employeeId: string,
    startDate: string,
    endDate: string,
    leaveInfo: { type: LeaveRecord["type"]; leaveId: string },
  ) => Promise<boolean>;
}

export const createTimeRecordSlice: StateCreator<AppState, [], [], TimeRecordSlice> = (
  set,
  get,
) => ({
  timeRecordsPage: [],
  allRecordsInDateRange: [],
  isLoadingRecords: false,
  totalRecords: 0,
  totalPages: 0,
  currentPage: 1,
  recentRecords: [],
  dailyRecords: [],

  loadTimeRecordsPage: async (params = {}) => {
    set({ isLoadingRecords: true });
    try {
      const response = await timeRecordService.getAll(params);
      set({
        timeRecordsPage: response.data,
        totalRecords: response.total,
        totalPages: response.totalPages,
        currentPage: params.page || 1,
      });
    } catch (error) {
      console.error("Error loading time records:", error);
      get().addToast("Error al cargar registros horarios", "error");
    } finally {
      set({ isLoadingRecords: false });
    }
  },

  loadRecentTimeRecords: async () => {
    try {
      const response = await timeRecordService.getAll({
        pageSize: 50,
        page: 1,
      });
      set({ recentRecords: response.data, dailyRecords: response.data });
    } catch (error) {
      console.error("Error loading recent records:", error);
    }
  },

  loadRecordsByDateRange: async (start, end, employeeId) => {
    set({ isLoadingRecords: true });
    try {
      const response = await timeRecordService.getAll({
        pageSize: 2000,
        filters: { desde: start, hasta: end, employeeId },
      });
      set({ allRecordsInDateRange: response.data });
    } catch (error) {
      console.error("Error loading records by range:", error);
    } finally {
      set({ isLoadingRecords: false });
    }
  },

  justifyRecordsForLeave: async (employeeId, startDate, endDate, leaveInfo) => {
    try {
      // 1. Fetch records in range for this employee
      const response = await timeRecordService.getAll({
        pageSize: 2000,
        filters: { desde: startDate, hasta: endDate, employeeId },
      });

      const records = response.data;
      if (records.length === 0) return true;

      // 2. Map and update
      const updated = records.map((r) => ({
        ...r,
        status: leaveInfo.type,
        justification: {
          type: leaveInfo.type,
          notes: "Justificado por Licencia/Vacación",
          leaveId: leaveInfo.leaveId,
        },
      }));

      // 3. Save
      await timeRecordService.bulkSave(updated);
      await get().loadRecentTimeRecords();
      return true;
    } catch (error) {
      console.error("Error justifying records:", error);
      get().addToast("Error al justificar registros", "error");
      return false;
    }
  },
});
