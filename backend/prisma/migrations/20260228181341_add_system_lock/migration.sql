-- AlterTable
ALTER TABLE "quick_notes" ADD COLUMN     "color" TEXT DEFAULT 'amber',
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "system_locks" (
    "key" TEXT NOT NULL,
    "owner_instance_id" TEXT NOT NULL,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_locks_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "system_locks_expires_at_idx" ON "system_locks"("expires_at");
