// Time Card Export Service
// Generates time card data for external payroll systems

import { db } from '../../core/database/client.js';

interface DaySummary {
  date: string; // YYYY-MM-DD
  totalHours: number;
  billableHours: number;
}

interface DayDetail {
  date: string; // YYYY-MM-DD
  sessions: Array<{
    client: {
      id: string;
      name: string;
      salesforceAccountId: string | null;
    } | null;
    project: {
      id: string;
      name: string;
      code: string;
    } | null;
    task: {
      id: string;
      title: string;
    } | null;
    startTime: string;
    endTime: string;
    duration: number; // hours
    isBillable: boolean;
    description: string | null;
  }>;
}

interface UserTimeCard {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
    timezone: string; // IANA timezone (e.g., "America/New_York", "Europe/London")
  };
  summary: DaySummary[];
  details: DayDetail[];
}

/**
 * Export time card data for a date range
 * Returns data for all users who have time entries in the range
 */
export async function exportTimeCards(startDate: Date, endDate: Date): Promise<UserTimeCard[]> {
  // Normalize dates to start/end of day
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get all time entries in date range with user, task, project, and client info
  const timeEntries = await db.timeEntry.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true, // Using phone field as employeeId placeholder
          timezone: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          project: {
            select: {
              id: true,
              name: true,
              code: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  salesforceAccountId: true,
                },
              },
            },
          },
        },
      },
      sessions: {
        orderBy: {
          startTime: 'asc',
        },
      },
    },
    orderBy: [
      { userId: 'asc' },
      { date: 'asc' },
    ],
  });

  // Group by user
  const userTimeCards = new Map<string, UserTimeCard>();

  for (const entry of timeEntries) {
    let userCard = userTimeCards.get(entry.userId);

    if (!userCard) {
      userCard = {
        user: {
          id: entry.user.id,
          email: entry.user.email,
          firstName: entry.user.firstName,
          lastName: entry.user.lastName,
          employeeId: entry.user.phone, // Using phone as employeeId placeholder
          timezone: entry.user.timezone,
        },
        summary: [],
        details: [],
      };
      userTimeCards.set(entry.userId, userCard);
    }

    const dateStr = entry.date.toISOString().split('T')[0];

    // Add to summary
    const existingSummary = userCard.summary.find(s => s.date === dateStr);
    if (existingSummary) {
      existingSummary.totalHours += entry.hours;
      existingSummary.billableHours += entry.billableHours;
    } else {
      userCard.summary.push({
        date: dateStr,
        totalHours: entry.hours,
        billableHours: entry.billableHours,
      });
    }

    // Add to details
    let dayDetail = userCard.details.find(d => d.date === dateStr);
    if (!dayDetail) {
      dayDetail = {
        date: dateStr,
        sessions: [],
      };
      userCard.details.push(dayDetail);
    }

    // Add all sessions for this entry
    for (const session of entry.sessions) {
      dayDetail.sessions.push({
        client: entry.task?.project?.client || null,
        project: entry.task
          ? {
              id: entry.task.project.id,
              name: entry.task.project.name,
              code: entry.task.project.code,
            }
          : null,
        task: entry.task
          ? {
              id: entry.task.id,
              title: entry.task.title,
            }
          : null,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
        duration: session.duration,
        isBillable: session.isBillable,
        description: session.description,
      });
    }
  }

  // Convert map to array
  return Array.from(userTimeCards.values());
}
