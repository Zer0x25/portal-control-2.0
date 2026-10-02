CREATE TABLE "seeding_jobs" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "progress" JSONB NOT NULL,
  "created_by" TEXT NOT NULL,
  "error_summary" TEXT,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "seeding_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seeding_job_logs" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'INFO',
  "message" TEXT NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seeding_job_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "seeding_jobs_type_status_idx" ON "seeding_jobs"("type", "status");
CREATE INDEX "seeding_jobs_created_at_idx" ON "seeding_jobs"("created_at");
CREATE INDEX "seeding_job_logs_job_id_created_at_idx" ON "seeding_job_logs"("job_id", "created_at");

ALTER TABLE "seeding_job_logs"
ADD CONSTRAINT "seeding_job_logs_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "seeding_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
