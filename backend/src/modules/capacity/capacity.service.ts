import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import { AvailabilityType, TimeOffStatus, TimeOffType, Prisma } from '@prisma/client';

// ============================================
// AVAILABILITY OPERATIONS
// ============================================

export interface SetAvailabilityData {
  date: Date;
  availableHours: number;
  type?: AvailabilityType;
  notes?: string;
}

export interface AvailabilityRange {
  startDate: Date;
  endDate: Date;
}

export async function getUserAvailability(userId: string, range: AvailabilityRange) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, defaultWeeklyHours: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Fetch availability overrides and approved time-off requests in parallel
  const [availability, timeOffRequests] = await Promise.all([
    db.userAvailability.findMany({
      where: {
        userId,
        date: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
      orderBy: { date: 'asc' },
    }),
    db.timeOffRequest.findMany({
      where: {
        userId,
        status: TimeOffStatus.APPROVED,
        OR: [
          {
            startDate: { lte: range.endDate },
            endDate: { gte: range.startDate },
          },
        ],
      },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        hours: true,
        reason: true,
      },
    }),
  ]);

  // Build daily availability map
  const dailyAvailability: Array<{
    date: string;
    availableHours: number;
    type: AvailabilityType;
    notes: string | null;
    isOverride: boolean;
    timeOff?: {
      id: string;
      type: TimeOffType;
      hours: number;
      reason: string | null;
    };
  }> = [];

  const defaultDailyHours = user.defaultWeeklyHours / 5; // Assume 5-day week

  // Generate entries for each day in range
  const current = new Date(range.startDate);
  while (current <= range.endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const override = availability.find(
      a => a.date.toISOString().split('T')[0] === dateStr
    );

    // Check if there's approved time-off for this date
    const currentDate = new Date(current);
    const timeOff = timeOffRequests.find(
      t => currentDate >= t.startDate && currentDate <= t.endDate
    );

    if (override) {
      dailyAvailability.push({
        date: dateStr,
        availableHours: override.availableHours,
        type: override.type,
        notes: override.notes,
        isOverride: true,
        timeOff: timeOff ? {
          id: timeOff.id,
          type: timeOff.type,
          hours: timeOff.hours,
          reason: timeOff.reason,
        } : undefined,
      });
    } else {
      dailyAvailability.push({
        date: dateStr,
        availableHours: isWeekend ? 0 : defaultDailyHours,
        type: isWeekend ? AvailabilityType.UNAVAILABLE : AvailabilityType.AVAILABLE,
        notes: null,
        isOverride: false,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    userId,
    defaultWeeklyHours: user.defaultWeeklyHours,
    defaultDailyHours,
    availability: dailyAvailability,
    timeOffRequests, // Include full time-off requests for reference
  };
}

export async function setAvailability(userId: string, data: SetAvailabilityData) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  // Upsert availability for the date
  const availability = await db.userAvailability.upsert({
    where: {
      userId_date: { userId, date: data.date },
    },
    update: {
      availableHours: data.availableHours,
      type: data.type || AvailabilityType.AVAILABLE,
      notes: data.notes,
    },
    create: {
      userId,
      date: data.date,
      availableHours: data.availableHours,
      type: data.type || AvailabilityType.AVAILABLE,
      notes: data.notes,
    },
  });

  logger.info(`Availability set for user ${userId} on ${data.date.toISOString().split('T')[0]}`);

  return availability;
}

export async function bulkSetAvailability(
  userId: string,
  entries: SetAvailabilityData[]
) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const results = await Promise.all(
    entries.map(entry =>
      db.userAvailability.upsert({
        where: {
          userId_date: { userId, date: entry.date },
        },
        update: {
          availableHours: entry.availableHours,
          type: entry.type || AvailabilityType.AVAILABLE,
          notes: entry.notes,
        },
        create: {
          userId,
          date: entry.date,
          availableHours: entry.availableHours,
          type: entry.type || AvailabilityType.AVAILABLE,
          notes: entry.notes,
        },
      })
    )
  );

  logger.info(`Bulk availability set for user ${userId}: ${entries.length} entries`);

  return results;
}

export async function clearAvailabilityOverride(userId: string, date: Date) {
  await db.userAvailability.deleteMany({
    where: {
      userId,
      date,
    },
  });

  return { success: true };
}

// ============================================
// TIME-OFF OPERATIONS
// ============================================

export interface CreateTimeOffData {
  type: TimeOffType;
  startDate: Date;
  endDate: Date;
  hours: number;
  reason?: string;
}

export interface ListTimeOffParams {
  page?: number;
  limit?: number;
  status?: TimeOffStatus;
  type?: TimeOffType;
  startDate?: Date;
  endDate?: Date;
}

const timeOffSelect = {
  id: true,
  userId: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  type: true,
  startDate: true,
  endDate: true,
  hours: true,
  status: true,
  reason: true,
  rejectionReason: true,
  approvedBy: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TimeOffRequestSelect;

export async function listTimeOffRequests(userId: string, params: ListTimeOffParams = {}) {
  const { page = 1, limit = 20, status, type, startDate, endDate } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.TimeOffRequestWhereInput = { userId };

  if (status) where.status = status;
  if (type) where.type = type;

  if (startDate || endDate) {
    where.AND = [];
    if (startDate) {
      where.AND.push({ endDate: { gte: startDate } });
    }
    if (endDate) {
      where.AND.push({ startDate: { lte: endDate } });
    }
  }

  const [data, total] = await Promise.all([
    db.timeOffRequest.findMany({
      where,
      select: timeOffSelect,
      skip,
      take: limit,
      orderBy: { startDate: 'desc' },
    }),
    db.timeOffRequest.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getTimeOffById(id: string) {
  const timeOff = await db.timeOffRequest.findUnique({
    where: { id },
    select: timeOffSelect,
  });

  if (!timeOff) {
    throw new Error('Time-off request not found');
  }

  return timeOff;
}

export async function createTimeOffRequest(userId: string, data: CreateTimeOffData) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  // Check for overlapping requests
  const overlapping = await db.timeOffRequest.findFirst({
    where: {
      userId,
      status: { not: TimeOffStatus.CANCELLED },
      AND: [
        { startDate: { lte: data.endDate } },
        { endDate: { gte: data.startDate } },
      ],
    },
  });

  if (overlapping) {
    throw new Error('Time-off request overlaps with existing request');
  }

  const timeOff = await db.timeOffRequest.create({
    data: {
      userId,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      hours: data.hours,
      reason: data.reason,
      status: TimeOffStatus.PENDING,
    },
    select: timeOffSelect,
  });

  logger.info(`Time-off request created for user ${userId}: ${data.type}`);

  return timeOff;
}

export async function updateTimeOffRequest(id: string, userId: string, data: Partial<CreateTimeOffData>) {
  const existing = await db.timeOffRequest.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error('Time-off request not found');
  }

  // Can only update pending requests
  if (existing.status !== TimeOffStatus.PENDING) {
    throw new Error('Cannot modify non-pending time-off request');
  }

  const timeOff = await db.timeOffRequest.update({
    where: { id },
    data,
    select: timeOffSelect,
  });

  return timeOff;
}

export async function cancelTimeOffRequest(id: string, userId: string) {
  const existing = await db.timeOffRequest.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error('Time-off request not found');
  }

  // Can only cancel pending or approved requests
  if (existing.status === TimeOffStatus.CANCELLED || existing.status === TimeOffStatus.REJECTED) {
    throw new Error('Cannot cancel this time-off request');
  }

  await db.timeOffRequest.update({
    where: { id },
    data: { status: TimeOffStatus.CANCELLED },
  });

  logger.info(`Time-off request cancelled: ${id}`);

  return { success: true };
}

// Admin operations for time-off approval
export async function approveTimeOffRequest(id: string, approverId: string) {
  const request = await db.timeOffRequest.findUnique({ where: { id } });
  if (!request) {
    throw new Error('Time-off request not found');
  }

  if (request.status !== TimeOffStatus.PENDING) {
    throw new Error('Can only approve pending requests');
  }

  const timeOff = await db.timeOffRequest.update({
    where: { id },
    data: {
      status: TimeOffStatus.APPROVED,
      approvedBy: approverId,
      approvedAt: new Date(),
    },
    select: timeOffSelect,
  });

  // Create availability overrides for the approved time-off
  await createAvailabilityForTimeOff(request.userId, request.startDate, request.endDate);

  logger.info(`Time-off request approved: ${id} by ${approverId}`);

  return timeOff;
}

export async function rejectTimeOffRequest(id: string, approverId: string, rejectionReason?: string) {
  const request = await db.timeOffRequest.findUnique({ where: { id } });
  if (!request) {
    throw new Error('Time-off request not found');
  }

  if (request.status !== TimeOffStatus.PENDING) {
    throw new Error('Can only reject pending requests');
  }

  const timeOff = await db.timeOffRequest.update({
    where: { id },
    data: {
      status: TimeOffStatus.REJECTED,
      approvedBy: approverId,
      approvedAt: new Date(),
      rejectionReason: rejectionReason || null,
    },
    select: timeOffSelect,
  });

  logger.info(`Time-off request rejected: ${id} by ${approverId}`);

  return timeOff;
}

// Get pending time-off requests for managers to review
export async function getPendingTimeOffRequests(params: { page?: number; limit?: number }) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.TimeOffRequestWhereInput = {
    status: TimeOffStatus.PENDING,
  };

  const [timeOff, total] = await Promise.all([
    db.timeOffRequest.findMany({
      where,
      select: timeOffSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
    }),
    db.timeOffRequest.count({ where }),
  ]);

  return {
    timeOff,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// List ALL time-off requests for all users (admin view)
export async function listAllTimeOffRequests(params: ListTimeOffParams = {}) {
  const { page = 1, limit = 20, status, type, startDate, endDate } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.TimeOffRequestWhereInput = {};

  if (status) where.status = status;
  if (type) where.type = type;

  if (startDate || endDate) {
    where.AND = [];
    if (startDate) {
      where.AND.push({ endDate: { gte: startDate } });
    }
    if (endDate) {
      where.AND.push({ startDate: { lte: endDate } });
    }
  }

  const [data, total] = await Promise.all([
    db.timeOffRequest.findMany({
      where,
      select: timeOffSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.timeOffRequest.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Helper to create availability overrides for approved time-off
async function createAvailabilityForTimeOff(userId: string, startDate: Date, endDate: Date) {
  const current = new Date(startDate);
  const entries: Array<{ userId: string; date: Date; availableHours: number; type: AvailabilityType; notes: string }> = [];

  while (current <= endDate) {
    entries.push({
      userId,
      date: new Date(current),
      availableHours: 0,
      type: AvailabilityType.UNAVAILABLE,
      notes: 'Approved time-off',
    });
    current.setDate(current.getDate() + 1);
  }

  await Promise.all(
    entries.map(entry =>
      db.userAvailability.upsert({
        where: { userId_date: { userId: entry.userId, date: entry.date } },
        update: entry,
        create: entry,
      })
    )
  );
}

// ============================================
// UTILIZATION CALCULATIONS
// ============================================

export interface UtilizationParams {
  startDate: Date;
  endDate: Date;
  userId?: string;
  departmentFilter?: string;
}

export async function getUtilization(params: UtilizationParams) {
  const { startDate, endDate, userId, departmentFilter } = params;

  // Build user filter
  const userWhere: Prisma.UserWhereInput = { status: 'ACTIVE' };
  if (userId) userWhere.id = userId;
  if (departmentFilter) userWhere.department = departmentFilter;

  const users = await db.user.findMany({
    where: userWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
      defaultWeeklyHours: true,
    },
  });

  // Calculate number of working days in range
  let workingDays = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  // Get data for each user
  const utilization = await Promise.all(
    users.map(async user => {
      // Get time entries in range
      const timeEntries = await db.timeEntry.aggregate({
        where: {
          userId: user.id,
          date: { gte: startDate, lte: endDate },
        },
        _sum: { hours: true },
      });

      // Get availability overrides
      const availability = await db.userAvailability.findMany({
        where: {
          userId: user.id,
          date: { gte: startDate, lte: endDate },
        },
      });

      // Calculate capacity (adjusted for availability overrides)
      const defaultDailyHours = user.defaultWeeklyHours / 5;
      let totalCapacity = workingDays * defaultDailyHours;

      // Adjust for availability overrides
      for (const override of availability) {
        const dayOfWeek = override.date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Working day - adjust capacity
          totalCapacity = totalCapacity - defaultDailyHours + override.availableHours;
        }
      }

      const trackedHours = timeEntries._sum.hours || 0;
      const utilizationPercent = totalCapacity > 0
        ? Math.round((trackedHours / totalCapacity) * 100)
        : 0;

      return {
        userId: user.id,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        availableHours: Math.round(totalCapacity * 100) / 100,
        allocatedHours: 0, // TODO: Get from project assignments if needed
        loggedHours: Math.round(trackedHours * 100) / 100,
        utilization: utilizationPercent,
        // Additional fields for detailed view
        email: user.email,
        department: user.department,
        defaultWeeklyHours: user.defaultWeeklyHours,
      };
    })
  );

  // Calculate totals
  const totalAvailable = utilization.reduce((sum, u) => sum + u.availableHours, 0);
  const totalLogged = utilization.reduce((sum, u) => sum + u.loggedHours, 0);
  const averageUtilization = totalAvailable > 0
    ? Math.round((totalLogged / totalAvailable) * 100)
    : 0;

  return {
    users: utilization,
    summary: {
      totalAvailable: Math.round(totalAvailable * 100) / 100,
      totalAllocated: 0, // TODO: Calculate from project assignments
      totalLogged: Math.round(totalLogged * 100) / 100,
      averageUtilization,
    },
    // Additional data for detailed reports
    period: {
      startDate,
      endDate,
      workingDays,
    },
  };
}
