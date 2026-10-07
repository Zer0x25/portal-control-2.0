export interface LeavePrincipal {
  role?: string;
  employeeId?: string | null;
}
export interface LeaveQuery {
  page?: string;
  pageSize?: string;
  since?: string;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  showArchived?: string;
}
export interface LeaveInput {
  id?: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  notes?: string | null;
}
export interface LeaveListParams {
  page: number;
  pageSize: number;
  since?: string;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  showArchived: boolean;
}
export interface LeaveListResult<Item> {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface LeaveFlowDependencies<Row, Item> {
  service: {
    list(
      params: LeaveListParams,
      user: { role: string; employeeId?: string },
    ): Promise<LeaveListResult<Item>>;
    upsert(data: LeaveInput): Promise<Row>;
    delete(id: string): Promise<void>;
  };
}
