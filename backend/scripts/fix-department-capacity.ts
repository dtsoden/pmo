/**
 * Fix Department Capacity Data
 *
 * Adjusts project assignments to create a realistic distribution of department
 * utilization levels for marketing screenshots.
 *
 * DOES NOT DELETE EXISTING DATA - only adjusts allocation percentages.
 *
 * Target Distribution:
 * - 5-10% Critical (0-24% utilization) - bright orange
 * - 10-15% Low (25-49% utilization) - yellow
 * - 30-35% Moderate (50-79% utilization) - PMO blue
 * - 35-40% Optimal (80-100% utilization) - green
 * - 5-10% Over-allocated (>100% utilization) - red
 *
 * Run: cd backend && npx tsx scripts/fix-department-capacity.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

const prisma = new PrismaClient();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function fixDepartmentCapacity() {
  console.log('Fixing department capacity data for current month...\n');

  // Get current month boundaries
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Get all work days in the current month up to today
  const allDays = eachDayOfInterval({ start: monthStart, end: today });
  const workDays = allDays.filter(day => !isWeekend(day));

  console.log(`Month: ${monthStart.toLocaleString('default', { month: 'long', year: 'numeric' })}`);
  console.log(`Work days: ${workDays.length}\n`);

  // Get all departments with their users
  const departments = await prisma.user.groupBy({
    by: ['department'],
    where: {
      status: 'ACTIVE',
      department: { not: null }
    },
    _count: {
      id: true
    }
  });

  if (departments.length === 0) {
    console.error('No departments found with active users.');
    return;
  }

  console.log(`Found ${departments.length} departments\n`);

  // Define target utilization levels for each department
  const targetUtilizations: number[] = [];

  // 5-10% Critical (0-24%)
  const criticalCount = Math.floor(departments.length * 0.075);
  for (let i = 0; i < criticalCount; i++) {
    targetUtilizations.push(randomInt(5, 24));
  }

  // 10-15% Low (25-49%)
  const lowCount = Math.floor(departments.length * 0.125);
  for (let i = 0; i < lowCount; i++) {
    targetUtilizations.push(randomInt(25, 49));
  }

  // 30-35% Moderate (50-79%)
  const moderateCount = Math.floor(departments.length * 0.325);
  for (let i = 0; i < moderateCount; i++) {
    targetUtilizations.push(randomInt(50, 79));
  }

  // 35-40% Optimal (80-100%)
  const optimalCount = Math.floor(departments.length * 0.375);
  for (let i = 0; i < optimalCount; i++) {
    targetUtilizations.push(randomInt(80, 100));
  }

  // 5-10% Over-allocated (101-130%)
  const overCount = departments.length - (criticalCount + lowCount + moderateCount + optimalCount);
  for (let i = 0; i < overCount; i++) {
    targetUtilizations.push(randomInt(101, 130));
  }

  // Shuffle to randomize distribution
  targetUtilizations.sort(() => Math.random() - 0.5);

  console.log('Target Distribution:');
  console.log(`  Critical (0-24%):      ${criticalCount} departments`);
  console.log(`  Low (25-49%):          ${lowCount} departments`);
  console.log(`  Moderate (50-79%):     ${moderateCount} departments`);
  console.log(`  Optimal (80-100%):     ${optimalCount} departments`);
  console.log(`  Over-allocated (>100%): ${overCount} departments\n`);

  let adjustedCount = 0;

  // For each department, adjust project assignments to reach target utilization
  for (let i = 0; i < departments.length; i++) {
    const dept = departments[i];
    const targetUtil = targetUtilizations[i];

    if (!dept.department) continue;

    // Get department users with their capacity
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        department: dept.department
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        defaultWeeklyHours: true
      }
    });

    if (users.length === 0) continue;

    // Calculate department capacity (sum of all user capacities for the month)
    const deptCapacity = users.reduce((sum, user) => {
      const weeklyHours = user.defaultWeeklyHours || 40;
      const dailyHours = weeklyHours / 5;
      return sum + (dailyHours * workDays.length);
    }, 0);

    // Calculate target allocated hours
    const targetAllocated = (deptCapacity * targetUtil) / 100;

    console.log(`${dept.department}: Target ${targetUtil}% = ${targetAllocated.toFixed(1)}h / ${deptCapacity.toFixed(1)}h capacity`);

    // Get all active project assignments for users in this department
    const assignments = await prisma.projectAssignment.findMany({
      where: {
        userId: { in: users.map(u => u.id) },
        project: {
          status: { in: ['ACTIVE', 'PLANNING'] }
        }
      },
      include: {
        project: true
      }
    });

    if (assignments.length === 0) {
      console.log(`  No active project assignments - skipping\n`);
      continue;
    }

    // Current allocated hours (sum of weekly allocated hours converted to monthly)
    // allocatedHours is weekly, so multiply by number of weeks in month
    const weeksInMonth = workDays.length / 5;
    const currentAllocated = assignments.reduce((sum, assignment) => {
      return sum + (assignment.allocatedHours * weeksInMonth);
    }, 0);

    if (currentAllocated === 0) {
      console.log(`  No hours allocated - skipping\n`);
      continue;
    }

    console.log(`  Current: ${currentAllocated.toFixed(1)}h (${((currentAllocated / deptCapacity) * 100).toFixed(0)}%)`);

    // Calculate adjustment factor
    const adjustmentFactor = targetAllocated / currentAllocated;

    // Adjust all assignments proportionally
    for (const assignment of assignments) {
      const user = users.find(u => u.id === assignment.userId);
      if (!user) continue;

      const weeklyHours = user.defaultWeeklyHours || 40;
      const newWeeklyAllocation = Math.min(weeklyHours, Math.max(0, assignment.allocatedHours * adjustmentFactor));

      await prisma.projectAssignment.update({
        where: { id: assignment.id },
        data: { allocatedHours: newWeeklyAllocation }
      });
    }

    adjustedCount++;
    console.log(`  Adjusted ${assignments.length} assignments by factor ${adjustmentFactor.toFixed(2)}\n`);
  }

  console.log('========================================');
  console.log('DEPARTMENT CAPACITY FIX COMPLETE');
  console.log('========================================');
  console.log(`Departments adjusted: ${adjustedCount}`);
  console.log('Department capacity now has realistic marketing data!');
  console.log('========================================\n');
}

fixDepartmentCapacity()
  .catch((e) => {
    console.error('Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
