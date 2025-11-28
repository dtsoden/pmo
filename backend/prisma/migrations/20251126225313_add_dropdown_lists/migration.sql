-- CreateTable
CREATE TABLE "DropdownLists" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "industries" TEXT NOT NULL DEFAULT '[]',
    "projectTypes" TEXT NOT NULL DEFAULT '[]',
    "skillCategories" TEXT NOT NULL DEFAULT '[]',
    "departments" TEXT NOT NULL DEFAULT '[]',
    "regions" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "DropdownLists_pkey" PRIMARY KEY ("id")
);
