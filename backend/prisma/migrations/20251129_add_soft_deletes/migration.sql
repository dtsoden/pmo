-- Add soft delete columns and task-milestone relation
-- Migration created: 2025-11-29

-- Add deletedAt to User
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- Add deletedAt to Client
ALTER TABLE "Client" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Client_deletedAt_idx" ON "Client"("deletedAt");

-- Add deletedAt to Project
ALTER TABLE "Project" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- Add milestoneId to Task (for task-to-milestone assignment)
ALTER TABLE "Task" ADD COLUMN "milestoneId" TEXT;

-- Add deletedAt to Task
ALTER TABLE "Task" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Add foreign key constraint for Task.milestoneId
ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey"
  FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "Task_milestoneId_idx" ON "Task"("milestoneId");
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");
