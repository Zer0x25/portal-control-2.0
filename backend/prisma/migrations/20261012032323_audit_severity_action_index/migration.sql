-- CreateIndex
CREATE INDEX "assigned_shifts_employee_id_start_date_idx" ON "assigned_shifts"("employee_id", "start_date");

-- CreateIndex
CREATE INDEX "audit_logs_severity_action_idx" ON "audit_logs"("severity", "action");

-- CreateIndex
CREATE INDEX "time_records_employee_id_date_idx" ON "time_records"("employee_id", "date");
