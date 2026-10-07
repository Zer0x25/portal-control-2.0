export interface CorrectionPrincipal {
  id: string;
  username: string;
  role: string;
  employeeId?: string | null;
}
export interface CorrectionQuery {
  since?: string;
  limit?: string;
  offset?: string;
  status?: string;
}
export interface CorrectionInput {
  id?: string;
  employeeId?: string;
  timeRecordId?: string;
  recordField?: string;
  originalValue?: string;
  requestedValue?: string;
  reason?: string;
}
export interface CorrectionStatusInput {
  status: string;
  resolvedBy?: string;
  rejectionReason?: string;
}
export interface CorrectionScope {
  role: string;
  employeeId?: string;
}
export interface CorrectionFlowDependencies<Row, List, Stats, History> {
  service: {
    list(
      params: { since?: string; limit?: number; offset?: number; status?: string },
      user: CorrectionScope,
    ): Promise<List>;
    create(
      data: CorrectionInput,
      user: CorrectionScope & { id: string; username: string },
    ): Promise<Row>;
    updateStatus(
      id: string,
      data: CorrectionStatusInput & { actorUsername: string; actorRole: string },
    ): Promise<Row>;
    stats(user: CorrectionScope): Promise<Stats>;
    history(id: string, user: CorrectionScope): Promise<History>;
  };
}
