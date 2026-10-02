ALTER TABLE "time_records"
ADD COLUMN "integrity_hash" TEXT,
ADD COLUMN "integrity_prev_hash" TEXT,
ADD COLUMN "integrity_algo" TEXT NOT NULL DEFAULT 'SHA256',
ADD COLUMN "integrity_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "integrity_checked_at" TIMESTAMP(3);

CREATE INDEX "time_records_integrity_hash_idx" ON "time_records"("integrity_hash");
