-- AlterTable: Add billableHours column to TimeEntry
ALTER TABLE "TimeEntry" ADD COLUMN IF NOT EXISTS "billableHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
