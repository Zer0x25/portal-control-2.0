-- Persist the MFA budget per user across challenges, IPs and server processes.
ALTER TABLE "users"
  ADD COLUMN "mfa_failed_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "mfa_failure_window_started_at" TIMESTAMP(3),
  ADD COLUMN "mfa_blocked_until" TIMESTAMP(3);

ALTER TABLE "users" ADD CONSTRAINT "users_mfa_failed_attempts_range"
  CHECK ("mfa_failed_attempts" BETWEEN 0 AND 5);
