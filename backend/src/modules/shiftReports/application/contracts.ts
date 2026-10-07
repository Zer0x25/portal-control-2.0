export interface ShiftReportQuery {
  since?: string;
  page?: string;
  pageSize?: string;
  status?: string;
}
export interface LogEntry {
  id: string;
  time: string;
  annotation: string;
  timestamp: number;
}
export interface SupplierEntry {
  id: string;
  company: string;
  licensePlate: string;
  driverName: string;
  paxCount: number;
  reason: string;
  time: string;
  timestamp: number;
}
export interface ShiftReportInput {
  id?: string;
  folio?: string;
  shiftName: string;
  responsibleUser: string;
  startTime: string;
  endTime?: string | null;
  status?: string;
  date: string;
  logEntries?: string | LogEntry[];
  supplierEntries?: string | SupplierEntry[];
}
export interface ShiftReportFlowDependencies<Row, List> {
  service: {
    list(query: ShiftReportQuery): Promise<List>;
    save(input: ShiftReportInput, actor: string): Promise<Row>;
  };
}
