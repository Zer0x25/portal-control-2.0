export interface ImportMapping {
  prop: string;
  type: string;
}
export interface ImportSheet {
  headers: (string | undefined)[];
  rows: Record<number, unknown>[];
}
export interface ExportActor {
  role?: string;
  employeeId?: string | null;
}
export interface ExportFilters {
  startDate: string;
  endDate: string;
  area?: string;
  cargo?: string;
  employeeId?: string;
  viewMode?: "month" | "week" | "day";
  mode?: "summary" | "compiled_detailed";
}
export interface ExportSink {
  readonly headersSent: boolean;
  end(): unknown;
}
export interface ImportExportDependencies<TSink extends ExportSink, TBytes extends Uint8Array> {
  parseMapping(value: string): Record<string, ImportMapping>;
  readWorkbook(file: Uint8Array): Promise<ImportSheet>;
  parseFilters(value: unknown): ExportFilters;
  pdf(
    kind: "calendar" | "detailed" | "shift_report",
    filters: Partial<ExportFilters> & { shiftReportId?: string },
  ): Promise<TBytes>;
  excel(sink: TSink, filters: ExportFilters): Promise<void>;
}
