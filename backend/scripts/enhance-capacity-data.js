"use strict";
/**
 * Enhance Capacity Planning Data
 *
 * Adds time entries for the current month to create a realistic distribution
 * of utilization levels for marketing screenshots.
 *
 * DOES NOT DELETE EXISTING DATA - only adds new time entries.
 *
 * Target Distribution:
 * - 5-10% Critical (0-24% utilization) - bright orange
 * - 10-15% Low (25-49% utilization) - yellow
 * - 30-35% Moderate (50-79% utilization) - PMO blue
 * - 35-40% Optimal (80-100% utilization) - green
 * - 5-10% Over-allocated (>100% utilization) - red
 *
 * Run: cd backend && npx tsx scripts/enhance-capacity-data.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const url_1 = require("url");
const path_1 = require("path");
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
dotenv_1.default.config({ path: (0, path_1.join)(__dirname, '..', '..', '.env') });
const prisma = new client_1.PrismaClient();
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
async function enhanceCapacityData() {
    console.log('Enhancing capacity planning data for current month...\n');
    // Get current month boundaries
    const now = new Date();
    const monthStart = (0, date_fns_1.startOfMonth)(now);
    const monthEnd = (0, date_fns_1.endOfMonth)(now);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    console.log(`Month: ${(0, date_fns_1.format)(monthStart, 'MMMM yyyy')}`);
    console.log(`Range: ${(0, date_fns_1.format)(monthStart, 'MMM d')} - ${(0, date_fns_1.format)(today, 'MMM d')}\n`);
    // Get all work days in the current month up to today
    const allDays = (0, date_fns_1.eachDayOfInterval)({ start: monthStart, end: today });
    const workDays = allDays.filter(day => !(0, date_fns_1.isWeekend)(day));
    console.log(`Work days to fill: ${workDays.length}\n`);
    // Get active users
    const users = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            timezone: true,
            defaultWeeklyHours: true,
        }
    });
    console.log(`Found ${users.length} active users\n`);
    // Get all tasks for assigning time entries
    const tasks = await prisma.task.findMany({
        where: {
            status: { in: ['IN_PROGRESS', 'IN_REVIEW', 'TODO'] }
        },
        select: { id: true }
    });
    if (tasks.length === 0) {
        console.error('No active tasks found. Cannot create time entries.');
        return;
    }
    console.log(`Found ${tasks.length} tasks for time entries\n`);
    // Define target utilization levels for each user
    // This creates a realistic marketing-worthy distribution
    const targetUtilizations = [];
    // 5-10% Critical (0-24%)
    const criticalCount = Math.floor(users.length * 0.075);
    for (let i = 0; i < criticalCount; i++) {
        targetUtilizations.push(randomInt(5, 24));
    }
    // 10-15% Low (25-49%)
    const lowCount = Math.floor(users.length * 0.125);
    for (let i = 0; i < lowCount; i++) {
        targetUtilizations.push(randomInt(25, 49));
    }
    // 30-35% Moderate (50-79%)
    const moderateCount = Math.floor(users.length * 0.325);
    for (let i = 0; i < moderateCount; i++) {
        targetUtilizations.push(randomInt(50, 79));
    }
    // 35-40% Optimal (80-100%)
    const optimalCount = Math.floor(users.length * 0.375);
    for (let i = 0; i < optimalCount; i++) {
        targetUtilizations.push(randomInt(80, 100));
    }
    // 5-10% Over-allocated (101-130%)
    const overCount = users.length - (criticalCount + lowCount + moderateCount + optimalCount);
    for (let i = 0; i < overCount; i++) {
        targetUtilizations.push(randomInt(101, 130));
    }
    // Shuffle to randomize distribution
    targetUtilizations.sort(() => Math.random() - 0.5);
    console.log('Target Distribution:');
    console.log(`  Critical (0-24%):    ${criticalCount} users`);
    console.log(`  Low (25-49%):        ${lowCount} users`);
    console.log(`  Moderate (50-79%):   ${moderateCount} users`);
    console.log(`  Optimal (80-100%):   ${optimalCount} users`);
    console.log(`  Over-allocated (>100%): ${overCount} users\n`);
    let totalEntriesCreated = 0;
    let totalHoursAdded = 0;
    // For each user, create time entries to reach target utilization
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const targetUtil = targetUtilizations[i];
        // Calculate target hours for the month
        const weeklyHours = user.defaultWeeklyHours || 40;
        const dailyHours = weeklyHours / 5; // Mon-Fri
        const targetMonthHours = dailyHours * workDays.length;
        const targetHoursToLog = (targetMonthHours * targetUtil) / 100;
        console.log(`${user.firstName} ${user.lastName}: Target ${targetUtil}% = ${targetHoursToLog.toFixed(1)}h`);
        // Check existing time entries for this user this month
        const existingEntries = await prisma.timeEntry.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: monthStart,
                    lte: today
                }
            },
            select: { hours: true }
        });
        const existingHours = existingEntries.reduce((sum, e) => sum + e.hours, 0);
        const hoursToAdd = Math.max(0, targetHoursToLog - existingHours);
        if (hoursToAdd < 1) {
            console.log(`  Already has ${existingHours.toFixed(1)}h - skipping\n`);
            continue;
        }
        console.log(`  Existing: ${existingHours.toFixed(1)}h, Adding: ${hoursToAdd.toFixed(1)}h`);
        // Distribute hours across work days
        let remainingHours = hoursToAdd;
        let entriesCreated = 0;
        for (const workDay of workDays) {
            if (remainingHours < 0.5)
                break;
            // Skip days that already have entries
            const hasEntry = existingEntries.some(e => {
                const entryDate = new Date(e.date);
                return entryDate.toDateString() === workDay.toDateString();
            });
            if (hasEntry)
                continue;
            // Log 4-8 hours per day (varied for realism)
            const hoursThisDay = Math.min(randomInt(4, 8) + (Math.random() * 2), // 4-10 hours with decimal
            remainingHours, dailyHours * 1.3 // Max 30% over daily capacity
            );
            if (hoursThisDay < 0.5)
                continue;
            // Create time entry with session
            const task = randomElement(tasks);
            const isBillable = Math.random() > 0.15;
            // Create time in user's local timezone
            const localStart = new Date(workDay);
            localStart.setHours(9, randomInt(0, 59), 0, 0);
            const localEnd = new Date(workDay);
            const endHour = 9 + Math.floor(hoursThisDay);
            const endMinute = (hoursThisDay % 1) * 60;
            localEnd.setHours(endHour, endMinute, 0, 0);
            // Convert to UTC for database
            const startTime = (0, date_fns_tz_1.fromZonedTime)(localStart, user.timezone || 'UTC');
            const endTime = (0, date_fns_tz_1.fromZonedTime)(localEnd, user.timezone || 'UTC');
            await prisma.timeEntry.create({
                data: {
                    userId: user.id,
                    taskId: task.id,
                    date: workDay,
                    hours: hoursThisDay,
                    billableHours: isBillable ? hoursThisDay : 0,
                    isTimerBased: false,
                    sessions: {
                        create: {
                            startTime,
                            endTime,
                            duration: hoursThisDay,
                            isBillable,
                            description: randomElement([
                                'Working on assigned tasks',
                                'Code review and implementation',
                                'Testing and debugging',
                                'Documentation updates',
                                'Team collaboration',
                                'Feature development',
                                'Bug fixes',
                                null,
                            ]),
                        }
                    }
                }
            });
            remainingHours -= hoursThisDay;
            entriesCreated++;
            totalHoursAdded += hoursThisDay;
        }
        totalEntriesCreated += entriesCreated;
        console.log(`  Created ${entriesCreated} entries\n`);
    }
    console.log('\n========================================');
    console.log('CAPACITY DATA ENHANCEMENT COMPLETE');
    console.log('========================================');
    console.log(`Total entries created: ${totalEntriesCreated}`);
    console.log(`Total hours added: ${totalHoursAdded.toFixed(1)}h`);
    console.log('\nCapacity planning page now has realistic marketing data!');
    console.log('========================================\n');
}
enhanceCapacityData()
    .catch((e) => {
    console.error('Enhancement failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
