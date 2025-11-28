-- Move isBillable from TimeEntry to TimeEntrySession
-- This allows each session to have its own billable status

-- Step 1: Add billableHours to TimeEntry
ALTER TABLE "TimeEntry"
ADD COLUMN "billableHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Step 2: Add isBillable to TimeEntrySession
ALTER TABLE "TimeEntrySession"
ADD COLUMN "isBillable" BOOLEAN NOT NULL DEFAULT true;

-- Step 3: Copy isBillable from TimeEntry to all its sessions
UPDATE "TimeEntrySession" tes
SET "isBillable" = te."isBillable"
FROM "TimeEntry" te
WHERE tes."timeEntryId" = te.id;

-- Step 4: Calculate billableHours for each entry
UPDATE "TimeEntry" te
SET "billableHours" = (
  SELECT COALESCE(SUM(tes.duration), 0)
  FROM "TimeEntrySession" tes
  WHERE tes."timeEntryId" = te.id
    AND tes."isBillable" = true
);

-- Step 5: Drop isBillable from TimeEntry
ALTER TABLE "TimeEntry"
DROP COLUMN "isBillable";
