/**
 * Clear Test Data Script
 *
 * Removes ALL data except:
 * - Your personal Gmail super admin account
 * - Dropdown lists (SystemSetting table)
 *
 * Run: cd backend && npm run seed:clear
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') }); // Go up 2 levels: scripts/ -> backend/ -> root/

const prisma = new PrismaClient();

// Your personal admin account - will be preserved
const PRESERVE_EMAIL = 'sysadmin@pmoplatform.com';

async function clearTestData() {
  console.log('Starting data cleanup...\n');

  // Find the admin user to preserve
  const adminUser = await prisma.user.findUnique({
    where: { email: PRESERVE_EMAIL },
    select: { id: true, email: true }
  });

  if (!adminUser) {
    console.error(`ERROR: Could not find admin user ${PRESERVE_EMAIL}`);
    console.error('Aborting cleanup to prevent data loss.');
    return;
  }

  console.log(`✓ Preserving admin account: ${adminUser.email}\n`);

  // ============================================
  // DETECT ORPHANED TIMER SHORTCUTS
  // ============================================
  // Find all timer shortcuts that reference tasks
  // (these will become orphaned when we delete test data)
  const allShortcutsWithTasks = await prisma.timerShortcut.findMany({
    where: { taskId: { not: null } },
    include: {
      user: { select: { email: true } },
      task: {
        select: {
          title: true,
          project: { select: { name: true } }
        }
      }
    }
  });

  if (allShortcutsWithTasks.length > 0) {
    console.log('\n⚠️  WARNING: ORPHANED TIMER SHORTCUTS DETECTED');
    console.log('════════════════════════════════════════════════');
    console.log(`Found ${allShortcutsWithTasks.length} timer shortcut(s) that reference tasks.`);
    console.log('These shortcuts will be DELETED because their tasks are being removed.\n');

    console.log('Shortcuts that will be deleted:');
    for (const shortcut of allShortcutsWithTasks) {
      const taskInfo = shortcut.task
        ? `${shortcut.task.project.name} - ${shortcut.task.title}`
        : 'Unknown task';
      console.log(`  • ${shortcut.label} (${shortcut.user.email}) → ${taskInfo}`);
    }

    console.log('\nThis prevents shortcuts from pointing to non-existent tasks,');
    console.log('which causes "No task assigned" errors and sync issues.');
    console.log('════════════════════════════════════════════════\n');

    // Wait 3 seconds to let user read the warning
    console.log('Continuing in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log();
  }

  // Delete in proper order to respect foreign key constraints
  // Most dependent tables first

  console.log('Removing time tracking data...');

  // Delete timer shortcuts first (they reference tasks)
  const timerShortcuts = await prisma.timerShortcut.deleteMany({
    where: {
      OR: [
        // Delete shortcuts that reference tasks (will be orphaned)
        { taskId: { not: null } },
        // Also delete shortcuts belonging to test users
        { userId: { not: adminUser.id } }
      ]
    }
  });
  console.log(`  Deleted ${timerShortcuts.count} timer shortcuts`);
  const activeTimeEntries = await prisma.activeTimeEntry.deleteMany({
    where: { userId: { not: adminUser.id } }
  });
  console.log(`  Deleted ${activeTimeEntries.count} active time entries`);

  // Delete time entry sessions first (child of time entries)
  const sessions = await prisma.timeEntrySession.deleteMany({});
  console.log(`  Deleted ${sessions.count} time entry sessions`);

  const timeEntries = await prisma.timeEntry.deleteMany({
    where: { userId: { not: adminUser.id } }
  });
  console.log(`  Deleted ${timeEntries.count} time entries`);

  console.log('\nRemoving capacity data...');
  const availability = await prisma.userAvailability.deleteMany({
    where: { userId: { not: adminUser.id } }
  });
  console.log(`  Deleted ${availability.count} availability records`);

  const timeOff = await prisma.timeOffRequest.deleteMany({
    where: { userId: { not: adminUser.id } }
  });
  console.log(`  Deleted ${timeOff.count} time off requests`);

  console.log('\nRemoving notifications and sessions...');
  const notifications = await prisma.notification.deleteMany({
    where: { userId: { not: adminUser.id } }
  });
  console.log(`  Deleted ${notifications.count} notifications`);

  const userSessions = await prisma.userSession.deleteMany({
    where: { userId: { not: adminUser.id } }
  });
  console.log(`  Deleted ${userSessions.count} sessions`);

  const auditLogs = await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { userId: { not: adminUser.id } },
        { userId: null }
      ]
    }
  });
  console.log(`  Deleted ${auditLogs.count} audit logs`);

  const loginAttempts = await prisma.loginAttempt.deleteMany({});
  console.log(`  Deleted ${loginAttempts.count} login attempts`);

  console.log('\nRemoving assignment data...');
  const taskAssignments = await prisma.taskAssignment.deleteMany({
    where: { userId: { not: adminUser.id } }
  });
  console.log(`  Deleted ${taskAssignments.count} task assignments`);

  const projectAssignments = await prisma.projectAssignment.deleteMany({
    where: { userId: { not: adminUser.id } }
  });
  console.log(`  Deleted ${projectAssignments.count} project assignments`);

  console.log('\nRemoving team data...');
  const teamMembers = await prisma.teamMember.deleteMany({
    where: { userId: { not: adminUser.id } }
  });
  console.log(`  Deleted ${teamMembers.count} team memberships`);

  const teamProjectAssignments = await prisma.teamProjectAssignment.deleteMany({});
  console.log(`  Deleted ${teamProjectAssignments.count} team project assignments`);

  const teams = await prisma.team.deleteMany({});
  console.log(`  Deleted ${teams.count} teams`);

  console.log('\nRemoving project data...');
  const taskDeps = await prisma.taskDependency.deleteMany({});
  console.log(`  Deleted ${taskDeps.count} task dependencies`);

  const tasks = await prisma.task.deleteMany({});
  console.log(`  Deleted ${tasks.count} tasks`);

  const milestones = await prisma.milestone.deleteMany({});
  console.log(`  Deleted ${milestones.count} milestones`);

  const phases = await prisma.projectPhase.deleteMany({});
  console.log(`  Deleted ${phases.count} project phases`);

  const projects = await prisma.project.deleteMany({});
  console.log(`  Deleted ${projects.count} projects`);

  console.log('\nRemoving client data...');
  const clientContacts = await prisma.clientContact.deleteMany({});
  console.log(`  Deleted ${clientContacts.count} client contacts`);

  const clientOpportunities = await prisma.clientOpportunity.deleteMany({});
  console.log(`  Deleted ${clientOpportunities.count} client opportunities`);

  const clients = await prisma.client.deleteMany({});
  console.log(`  Deleted ${clients.count} clients`);

  console.log('\nRemoving other users...');
  // Clear manager references first
  await prisma.user.updateMany({
    where: { managerId: { not: null } },
    data: { managerId: null }
  });

  const users = await prisma.user.deleteMany({
    where: { id: { not: adminUser.id } }
  });
  console.log(`  Deleted ${users.count} users`);

  // Update system setting to mark test data as not installed
  await prisma.systemSetting.upsert({
    where: {
      category_key: {
        category: 'platform',
        key: 'testDataInstalled'
      }
    },
    update: {
      value: false
    },
    create: {
      category: 'platform',
      key: 'testDataInstalled',
      value: false,
      description: 'Indicates whether test data is currently installed'
    }
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n========================================');
  console.log('DATA CLEANUP COMPLETE');
  console.log('========================================');
  console.log(`Preserved: ${PRESERVE_EMAIL}`);
  console.log('Preserved: Dropdown lists (SystemSetting)');
  console.log('Removed: All other data');
  if (timerShortcuts.count > 0) {
    console.log(`         ${timerShortcuts.count} timer shortcuts (orphaned by deleted tasks)`);
  }
  console.log('========================================\n');
}

// ============================================
// RUN
// ============================================

clearTestData()
  .catch((e) => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
