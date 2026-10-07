export interface KpiInput {
  startDate: string;
  endDate?: string;
  endDateExclusive?: string;
  employeeIds?: string[];
  area?: string;
}
export interface KpiDependencies<Summary, Detailed, Overview, Daily> {
  service: {
    summary(input: KpiInput): Promise<Summary>;
    detailed(input: KpiInput): Promise<Detailed>;
    overview(): Promise<Overview>;
    daily(): Promise<Daily>;
  };
  dates: {
    exclusive(start: string, end: string): string;
    compare(start: string, end: string): number;
    duration(start: string, end: string): number;
  };
}
