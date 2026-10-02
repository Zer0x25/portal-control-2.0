/*
  Warnings:

  - The `details` column on the `audit_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `metadata` column on the `audit_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "assigned_shifts" ADD COLUMN     "employee_name" TEXT,
ADD COLUMN     "shift_pattern_name" TEXT;

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "details",
ADD COLUMN     "details" JSONB,
DROP COLUMN "metadata",
ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_category_idx" ON "audit_logs"("category");

-- CreateIndex
CREATE INDEX "audit_logs_actor_username_idx" ON "audit_logs"("actor_username");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
