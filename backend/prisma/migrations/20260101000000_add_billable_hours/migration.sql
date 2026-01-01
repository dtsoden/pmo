-- AlterTable: Add missing columns to TimeEntry
ALTER TABLE "TimeEntry" ADD COLUMN IF NOT EXISTS "billableHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TimeEntry" ADD COLUMN IF NOT EXISTS "isTimerBased" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: TimeEntrySession (for session-based time tracking)
CREATE TABLE IF NOT EXISTS "TimeEntrySession" (
    "id" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntrySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TimeEntrySession_timeEntryId_idx" ON "TimeEntrySession"("timeEntryId");

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TimeEntrySession_timeEntryId_fkey') THEN
        ALTER TABLE "TimeEntrySession" ADD CONSTRAINT "TimeEntrySession_timeEntryId_fkey"
        FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
