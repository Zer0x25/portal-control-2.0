-- CreateIndex
CREATE INDEX "idx_time_records_integrity_order" ON "time_records"("employee_id", "updated_at", "id");
