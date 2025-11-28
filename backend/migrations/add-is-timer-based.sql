-- Add isTimerBased field to TimeEntry
-- This distinguishes manual entries from timer-based entries

ALTER TABLE "TimeEntry"
ADD COLUMN "isTimerBased" BOOLEAN NOT NULL DEFAULT false;

-- Set existing entries with sessions as timer-based
UPDATE "TimeEntry"
SET "isTimerBased" = true
WHERE id IN (
  SELECT DISTINCT "timeEntryId"
  FROM "TimeEntrySession"
);

-- Add comment
COMMENT ON COLUMN "TimeEntry"."isTimerBased" IS 'True if created from timer, false if manual entry';
