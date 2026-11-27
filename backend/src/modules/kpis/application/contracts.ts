export interface KpiInput {
  startDate: string;
  endDate?: string;
  endDateExclusive?: string;
  employeeId?: string;
  employeeIds?: string[];
  area?: string;
  departmentId?: string;
  cargo?: string;
  workdayType?: string;
}
export interface KpiDependencies<Summary, Detailed, Overview, Daily, Anomalies> {
  service: {
    summary(input: KpiInput): Promise<Summary>;
    detailed(input: KpiInput): Promise<Detailed>;
    overview(): Promise<Overview>;
    daily(): Promise<Daily>;
    anomalies(): Promise<Anomalies>;
  };
  dates: {
    exclusive(start: string, end: string): string;
    compare(start: string, end: string): number;
    duration(start: string, end: string): number;
  };
}
