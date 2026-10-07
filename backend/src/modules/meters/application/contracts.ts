export interface MeterListParams {
  since?: string;
  page?: string | number;
  pageSize?: string | number;
  meterId?: string;
  startDate?: string;
  endDate?: string;
}
export interface MeterInput {
  meterConfigId: string;
  authorUsername: string;
  value: number;
  isRecharge?: boolean;
  notes?: string | null;
}
export interface MeterDependencies<Reading> {
  list(params: MeterListParams): Promise<{
    items: Reading[];
    total: number;
    isPaginated: boolean;
    page: number;
    totalPages: number;
  }>;
  parse(value: unknown): MeterInput[];
  create(readings: MeterInput[]): Promise<Reading[]>;
}
