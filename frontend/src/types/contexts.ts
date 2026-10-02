import { Syncable } from "./common";
import { User, Employee } from "./user";
import {
  LeaveRecord,
  Holiday,
  TheoreticalShiftPattern,
  DayInCycleSchedule,
  AssignedShift,
} from "./scheduling";
import { DailyTimeRecord, CorrectionRequest } from "./time";
import { QuickNote, MeterReadingItem, MeterConfig } from "./dashboard";
import { AuditLog } from "./audit";
import { Theme } from "./config";
import { SyncState, ToastMessage, ToastType } from "./ui";
import {
  ScheduledEmployeeDetail,
  EmployeeWithShiftDetails,
  MonthlyDayScheduleView,
  EmployeeDailyScheduleInfo,
} from "./derived";

export interface EmployeeContextType {
  employees: Employee[];
  activeEmployees: Employee[];
  isLoadingEmployees: boolean;
  addEmployee: (
    employeeData: Omit<Employee, "id" | "isActive" | keyof Syncable>,
  ) => Promise<Employee | null>;
  updateEmployee: (employeeData: Employee) => Promise<boolean>;
  toggleEmployeeStatus: (employeeId: string) => Promise<boolean>;
  softDeleteEmployee: (employeeId: string, actorUsername: string) => Promise<boolean>;
  getEmployeeById: (employeeId: string) => Employee | undefined;
  getNextEmployeeId: () => Promise<string>;
}

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: "light" | "dark";
  toggleTheme: () => void;
}

export interface LogContextType {
  logs: AuditLog[];
  isLoadingLogs: boolean;
  clearAllLogs: () => Promise<void>;
  loadLogs: () => Promise<void>;
}

export interface UserContextType {
  users: User[];
  isLoadingUsers: boolean;
  addUser: (
    userData: Omit<User, "id" | keyof Syncable>,
    actorUsername: string,
  ) => Promise<User | null>;
  updateUser: (
    userId: string,
    data: Partial<Omit<User, "id" | keyof Syncable>>,
    actorUsername: string,
  ) => Promise<boolean>;
  deleteUser: (userId: string, actorUsername: string) => Promise<boolean>;
  getUserById: (userId: string) => User | undefined;
  getUserByUsername: (username: string) => User | undefined;
}

export interface SchedulingContextType {
  isLoadingSchedulingData: boolean;
  globalMaxWeeklyHours: number;
  areaList: string[];
  meterConfigs: MeterConfig[];
  workdayTypeList: string[];
  emailRecipientsList: string[];
  shiftPatterns: TheoreticalShiftPattern[];
  assignedShifts: AssignedShift[];
  holidays: Holiday[];
  addShiftPattern: (
    patternData: Omit<TheoreticalShiftPattern, "id" | "dailySchedules" | keyof Syncable> & {
      dailySchedules: Omit<DayInCycleSchedule, "hours">[];
    },
    actorUsername: string,
  ) => Promise<TheoreticalShiftPattern | null>;
  updateShiftPattern: (
    patternData: Omit<TheoreticalShiftPattern, "dailySchedules" | keyof Syncable> & {
      dailySchedules: Omit<DayInCycleSchedule, "hours">[];
    },
    actorUsername: string,
  ) => Promise<boolean>;
  deleteShiftPattern: (patternId: string, actorUsername: string) => Promise<boolean>;
  getShiftPatternById: (patternId: string) => TheoreticalShiftPattern | undefined;
  assignShiftToEmployee: (
    assignmentData: Omit<
      AssignedShift,
      "id" | "employeeName" | "shiftPatternName" | keyof Syncable
    >,
    actorUsername: string,
  ) => Promise<AssignedShift | null>;
  updateAssignedShift: (
    assignmentData: Omit<AssignedShift, "employeeName" | "shiftPatternName" | keyof Syncable>,
    actorUsername: string,
  ) => Promise<boolean>;
  deleteAssignedShift: (assignmentId: string, actorUsername: string) => Promise<boolean>;
  getAssignedShiftsByEmployee: (employeeId: string) => AssignedShift[];
  addHoliday: (
    holidayData: Omit<Holiday, "id" | keyof Syncable>,
    actorUsername: string,
  ) => Promise<Holiday | null>;
  updateHoliday: (
    holidayData: Omit<Holiday, keyof Syncable>,
    actorUsername: string,
  ) => Promise<boolean>;
  deleteHoliday: (holidayId: string, actorUsername: string) => Promise<boolean>;
  calculateAverageWeeklyHoursForEmployee: (
    employeeId: string,
    newAssignment?: Omit<
      AssignedShift,
      "id" | "employeeName" | "shiftPatternName" | keyof Syncable
    >,
    assignmentToExcludeId?: string,
  ) => number;
  isEmployeeScheduledOnDate: (
    employeeId: string,
    targetDate: Date,
  ) => {
    scheduled: boolean;
    shiftPatternName?: string;
    startTime?: string;
    endTime?: string;
    patternColor?: string;
  };
  getScheduledEmployeesDetailsOnDate: (targetDate: Date) => ScheduledEmployeeDetail[];
  getEmployeesWithAssignedShifts: () => EmployeeWithShiftDetails[];
  calculateHoursBetween: (startTime?: string, endTime?: string, breakMinutes?: number) => number;
  getEmployeeScheduleForMonth: (
    employeeId: string,
    year: number,
    month: number,
  ) => MonthlyDayScheduleView[];
  getEmployeeDailyScheduleInfo: (
    employeeId: string,
    targetDate: Date,
  ) => EmployeeDailyScheduleInfo | null;
  updateGlobalMaxWeeklyHours: (newMaxHours: number, actorUsername: string) => Promise<void>;
  updateAreaList: (newAreas: string[], actorUsername: string) => Promise<void>;
  updateMeterConfigs: (newConfigs: MeterConfig[], actorUsername: string) => Promise<void>;
  updateWorkdayTypeList: (newTypes: string[], actorUsername: string) => Promise<void>;
  updateEmailRecipientsList: (newEmails: string[], actorUsername: string) => Promise<void>;
  leaves: LeaveRecord[];
  addLeave: (
    leaveData: Omit<LeaveRecord, "id" | keyof Syncable>,
    actorUsername: string,
  ) => Promise<LeaveRecord | null>;
  updateLeave: (
    leaveData: Omit<LeaveRecord, keyof Syncable>,
    actorUsername: string,
  ) => Promise<boolean>;
  deleteLeave: (leaveId: string, actorUsername: string) => Promise<boolean>;
  requests: CorrectionRequest[];
  addCorrectionRequest: (
    data: Omit<CorrectionRequest, "id" | "createdAt" | "status" | keyof Syncable>,
  ) => Promise<boolean>;
  updateRequestStatus: (
    requestId: string,
    status: "approved" | "rejected",
    actorUsername: string,
    rejectionReason?: string,
  ) => Promise<boolean>;
  getRequestsForEmployee: (employeeId: string) => CorrectionRequest[];
}

export interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export interface SyncContextType {
  syncState: SyncState;
  lastSyncTime: number | null;
  /** Conflict entries are produced by the sync worker and not yet consumed by
   * any caller, so their concrete shape is still open. */
  conflicts: unknown[];
  runSync: () => Promise<void>;
  runBootstrap: () => Promise<void>;
}

export interface QuickNotesContextType {
  notes: QuickNote[];
  isLoadingNotes: boolean;
  addNote: (content: string) => Promise<QuickNote | null>;
  deleteNote: (noteId: string) => Promise<boolean>;
  isModalOpen: boolean;
  handleOpenQuickNotes: () => void;
  handleCloseQuickNotes: () => void;
  hasUnreadNotes: boolean;
}

export interface MeterReadingsContextType {
  readings: MeterReadingItem[];
  isLoadingReadings: boolean;
  addReading: (newReadings: { meterConfigId: string; value: string }[]) => Promise<boolean>;
}

export interface TimeRecordContextType {
  dailyRecords: DailyTimeRecord[];
  isLoadingRecords: boolean;
  addOrUpdateRecord: (record: DailyTimeRecord) => Promise<boolean>;
  deleteRecordById: (recordId: string) => Promise<boolean>;
  findOrCreateRecordForDate: (employeeId: string, date: string) => Promise<DailyTimeRecord | null>;
}

export interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}
