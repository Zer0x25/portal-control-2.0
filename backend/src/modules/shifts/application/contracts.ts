export interface ShiftPrincipal {
  role?: string;
  employeeId?: string | null;
  username?: string;
}
export interface ShiftQuery {
  since?: string;
  showArchived?: string;
  page?: string;
  pageSize?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  date?: string;
  year?: string;
  month?: string;
}
export interface PatternDay {
  dayIndex: number;
  startTime?: string | null;
  endTime?: string | null;
  isOffDay: boolean;
  hasColacion: boolean;
  colacionMinutes?: number | null;
  hours?: number | null;
}
export interface PatternInput {
  id?: string;
  name: string;
  cycleLengthDays: number;
  startDayOfWeek: number;
  dailySchedules: PatternDay[];
  color: string;
  maxHoursPattern: number;
  worksOnHolidays?: boolean;
}
export interface AssignmentInput {
  id?: string;
  employeeId: string;
  shiftPatternId: string;
  startDate: string;
  endDate: string | null;
}
export interface PatternQuery {
  since?: string;
  showArchived?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
}
export interface AssignmentQuery {
  page?: number;
  pageSize?: number;
  since?: string;
  startDate?: string;
  endDate?: string;
  employeeId?: string | null;
  role?: string;
  showArchived?: boolean;
}
export interface MatrixInput {
  startDate: string;
  endDate: string;
  employeeIds: string[];
}
export interface ConflictInput {
  employeeId: string;
  startDate: string;
  endDate: string | null;
  excludeAssignmentId?: string;
}
export interface MonthlyDayInput {
  day: number;
  type: "work" | "off" | "rest";
  startTime?: string | null;
  endTime?: string | null;
  hours?: number;
}
export interface MonthlyPlanInput {
  employeeId: string;
  month: string;
  year: string;
  dailySchedules: MonthlyDayInput[];
  patternName?: string;
}
export interface ShiftFlowDependencies<
  Pattern,
  Patterns,
  Assignment,
  Assignments,
  Schedule,
  Month,
  Matrix,
  Conflict,
  Scheduled,
> {
  service: {
    patterns(query: PatternQuery): Promise<Patterns>;
    createPattern(input: PatternInput): Promise<Pattern>;
    updatePattern(id: string, input: Partial<PatternInput>): Promise<Pattern>;
    deletePattern(id: string): Promise<void>;
    bulkPatterns(input: PatternInput[]): Promise<number>;
    assignments(query: AssignmentQuery): Promise<Assignments>;
    assign(input: AssignmentInput, actor: string): Promise<Assignment>;
    updateAssignment(
      id: string,
      input: Partial<AssignmentInput>,
      actor: string,
    ): Promise<Assignment>;
    deleteAssignment(id: string, actor: string): Promise<void>;
    bulkAssignments(input: AssignmentInput[]): Promise<number>;
    daily(id: string, date: Date): Promise<Schedule | null>;
    scheduled(date: Date): Promise<Scheduled[]>;
    month(id: string, year: number, month: number): Promise<Month>;
    matrix(start: string, end: string, ids: string[]): Promise<Matrix>;
    conflicts(id: string, start: string, end: string | null, exclude?: string): Promise<Conflict[]>;
    monthlyPlan(id: string, year: number, month: number): Promise<Month>;
    saveMonthlyPlan(
      input: Omit<MonthlyPlanInput, "month" | "year"> & { month: number; year: number },
    ): Promise<void>;
    suggest(id: string, year: string, month: string): Promise<string>;
  };
  parseDate(value: string): Date;
}
