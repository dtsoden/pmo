-- Fix: Add unique constraint to TimeEntry
-- Step 1: Consolidate duplicates - keep oldest, delete others

-- Create temp table with entries to keep
CREATE TEMP TABLE entries_to_keep AS
SELECT DISTINCT ON ("userId", "taskId", "date")
  id as keep_id,
  "userId",
  "taskId",
  "date"
FROM "TimeEntry"
ORDER BY "userId", "taskId", "date", "createdAt" ASC;

-- Move all sessions to the entry we're keeping
UPDATE "TimeEntrySession" ses
SET "timeEntryId" = etk.keep_id
FROM entries_to_keep etk
INNER JOIN "TimeEntry" te ON te."userId" = etk."userId"
  AND te."taskId" = etk."taskId"
  AND te."date" = etk."date"
WHERE ses."timeEntryId" = te.id
  AND ses."timeEntryId" != etk.keep_id;

-- Recalculate hours for consolidated entries
UPDATE "TimeEntry" te
SET hours = (
  SELECT COALESCE(SUM(duration), 0)
  FROM "TimeEntrySession"
  WHERE "timeEntryId" = te.id
)
WHERE EXISTS (
  SELECT 1 FROM entries_to_keep etk WHERE etk.keep_id = te.id
);

-- Delete duplicate entries
DELETE FROM "TimeEntry" te
WHERE NOT EXISTS (
  SELECT 1 FROM entries_to_keep etk WHERE etk.keep_id = te.id
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "TimeEntry_userId_taskId_date_key"
ON "TimeEntry" ("userId", "taskId", "date");
