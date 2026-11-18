export interface ShiftReportQuery {
  since?: string | number;
  page?: string | number;
  pageSize?: string | number;
  status?: string;
  search?: string;
  date?: string;
}
export interface LogEntry {
  id: string;
  time: string;
  annotation: string;
  timestamp: number;
  recordId?: string;
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
  removedLogEntryIds?: string[];
  supplierEntries?: string | SupplierEntry[];
}
export interface ShiftReportFlowDependencies<Row, List> {
  service: {
    list(query: ShiftReportQuery): Promise<List>;
    save(input: ShiftReportInput, actor: string): Promise<Row>;
    update?(id: string, input: Partial<ShiftReportInput>, actor: string): Promise<Row>;
    delete?(id: string, actor: string): Promise<void>;
    addAttendanceNovelty?(
      id: string,
      input: { recordId: string; annotation: string; time: string },
      actor: string,
    ): Promise<unknown>;
  };
}
