-- Fix: Add unique constraint to TimeEntry to prevent duplicates
-- First, consolidate any existing duplicates

-- Step 1: Find and consolidate duplicate entries
WITH duplicates AS (
  SELECT
    "userId",
    "taskId",
    "date",
    MIN(id) as keep_id,
    ARRAY_AGG(id ORDER BY "createdAt") as all_ids
  FROM "TimeEntry"
  GROUP BY "userId", "taskId", "date"
  HAVING COUNT(*) > 1
)
-- Move sessions from duplicate entries to the one we're keeping
UPDATE "TimeEntrySession"
SET "timeEntryId" = d.keep_id
FROM duplicates d
WHERE "TimeEntrySession"."timeEntryId" = ANY(d.all_ids)
  AND "TimeEntrySession"."timeEntryId" != d.keep_id;

-- Step 2: Recalculate hours for consolidated entries
UPDATE "TimeEntry" te
SET hours = (
  SELECT COALESCE(SUM(duration), 0)
  FROM "TimeEntrySession"
  WHERE "timeEntryId" = te.id
)
WHERE te.id IN (
  SELECT MIN(id)
  FROM "TimeEntry"
  GROUP BY "userId", "taskId", "date"
  HAVING COUNT(*) > 1
);

-- Step 3: Delete the duplicate entries (sessions already moved)
DELETE FROM "TimeEntry"
WHERE id IN (
  SELECT unnest(all_ids)
  FROM (
    SELECT
      MIN(id) as keep_id,
      ARRAY_AGG(id ORDER BY "createdAt") as all_ids
    FROM "TimeEntry"
    GROUP BY "userId", "taskId", "date"
    HAVING COUNT(*) > 1
  ) dup
  WHERE unnest(all_ids) != keep_id
);

-- Step 4: Create the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "TimeEntry_userId_taskId_date_key"
ON "TimeEntry" ("userId", "taskId", "date");

-- Add constraint
ALTER TABLE "TimeEntry"
ADD CONSTRAINT "TimeEntry_userId_taskId_date_key"
UNIQUE USING INDEX "TimeEntry_userId_taskId_date_key";
