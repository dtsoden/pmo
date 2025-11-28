-- Migration: Convert existing TimeEntry records to use TimeEntrySession model
-- This allows multiple timer intervals per task per day

BEGIN;

-- Step 1: Create the TimeEntrySession table
CREATE TABLE IF NOT EXISTS "TimeEntrySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timeEntryId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeEntrySession_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 2: Create indexes for TimeEntrySession
CREATE INDEX IF NOT EXISTS "TimeEntrySession_timeEntryId_idx" ON "TimeEntrySession"("timeEntryId");
CREATE INDEX IF NOT EXISTS "TimeEntrySession_startTime_idx" ON "TimeEntrySession"("startTime");

-- Step 3: Create a temporary table to consolidate duplicate entries
CREATE TEMP TABLE "ConsolidatedEntries" AS
SELECT
    MIN("id") as "keepId",
    "userId",
    "taskId",
    "date",
    SUM(COALESCE("hours", 0)) as "totalHours",
    bool_or("isBillable") as "isBillable",
    MIN("createdAt") as "createdAt"
FROM "TimeEntry"
GROUP BY "userId", "taskId", "date";

-- Step 4: Migrate all existing TimeEntry records to sessions (including duplicates)
-- Each old TimeEntry becomes a session in the consolidated entry
INSERT INTO "TimeEntrySession" ("id", "timeEntryId", "startTime", "endTime", "duration", "description", "createdAt")
SELECT
    gen_random_uuid()::text,
    ce."keepId",
    te."startTime",
    COALESCE(te."endTime", te."startTime" + (COALESCE(te."hours", 0) * INTERVAL '1 hour')),
    COALESCE(te."hours", EXTRACT(EPOCH FROM (COALESCE(te."endTime", te."startTime") - te."startTime")) / 3600),
    te."description",
    te."createdAt"
FROM "TimeEntry" te
JOIN "ConsolidatedEntries" ce ON te."userId" = ce."userId"
    AND te."taskId" IS NOT DISTINCT FROM ce."taskId"
    AND te."date" = ce."date"
WHERE te."startTime" IS NOT NULL;

-- Step 5: Delete duplicate entries (keep only the consolidated one)
DELETE FROM "TimeEntry" te
WHERE te."id" NOT IN (SELECT "keepId" FROM "ConsolidatedEntries");

-- Step 6: Update the consolidated entries with total hours
UPDATE "TimeEntry" te
SET "hours" = ce."totalHours"
FROM "ConsolidatedEntries" ce
WHERE te."id" = ce."keepId";

-- Step 7: Drop old columns from TimeEntry (if they exist)
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS "startTime";
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS "endTime";
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS "description";

-- Step 8: Set default value for hours and make it NOT NULL
UPDATE "TimeEntry" SET "hours" = 0 WHERE "hours" IS NULL;
ALTER TABLE "TimeEntry" ALTER COLUMN "hours" SET DEFAULT 0;
ALTER TABLE "TimeEntry" ALTER COLUMN "hours" SET NOT NULL;

-- Step 9: Add unique constraint (userId, taskId, date)
CREATE UNIQUE INDEX IF NOT EXISTS "TimeEntry_userId_taskId_date_key" ON "TimeEntry"("userId", "taskId", "date");

COMMIT;
