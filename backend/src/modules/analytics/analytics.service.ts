import { db } from '../../core/database/client.js';
import { ProjectStatus, TaskStatus, AssignmentStatus } from '@prisma/client';

// ============================================
// DASHBOARD
// ============================================

export async function getDashboard(userId: string, userRole: string) {
  // Team stats only for true admin roles (not project/resource managers)
  const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'PMO_MANAGER'].includes(userRole);

  // Get user's active timer
  const activeTimer = await db.activeTimeEntry.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      taskId: true,
      description: true,
      startTime: true,
      createdAt: true,
    },
  });

  // Get user's time logged today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEntries = await db.timeEntry.aggregate({
    where: {
      userId,
      date: { gte: today },
    },
    _sum: { hours: true },
  });

  // Get user's active assignments
  const myAssignments = await db.projectAssignment.findMany({
    where: {
      userId,
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },
    },
    take: 5,
    orderBy: { startDate: 'desc' },
  });

  // Get user's assigned tasks
  const myTasks = await db.taskAssignment.findMany({
    where: {
      userId,
      task: {
        status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
      },
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          project: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
    take: 10,
    orderBy: { task: { dueDate: 'asc' } },
  });

  // Get upcoming milestones (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const upcomingMilestones = await db.milestone.findMany({
    where: {
      isCompleted: false,
      dueDate: { lte: thirtyDaysFromNow },
      ...(isAdmin ? {} : {
        project: {
          assignments: { some: { userId } },
        },
      }),
    },
    include: {
      project: {
        select: { id: true, name: true, code: true },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 5,
  });

  // Admin-only stats
  let teamStats = null;
  if (isAdmin) {
    const [
      totalProjects,
      activeProjects,
      totalUsers,
      activeUsers,
      pendingTimeOff,
    ] = await Promise.all([
      db.project.count(),
      db.project.count({ where: { status: ProjectStatus.ACTIVE } }),
      db.user.count(),
      db.user.count({ where: { status: 'ACTIVE' } }),
      db.timeOffRequest.count({ where: { status: 'PENDING' } }),
    ]);

    teamStats = {
      totalProjects,
      activeProjects,
      totalUsers,
      activeUsers,
      pendingTimeOff,
    };
  }

  // Get task details if activeTimer has a taskId
  let task = null;
  if (activeTimer?.taskId) {
    task = await db.task.findUnique({
      where: { id: activeTimer.taskId },
      select: {
        id: true,
        title: true,
        project: {
          select: { id: true, code: true, name: true },
        },
      },
    });
  }

  return {
    user: {
      activeTimer: activeTimer ? {
        startTime: activeTimer.startTime,
        taskId: activeTimer.taskId,
        description: activeTimer.description,
        task,
        elapsedSeconds: Math.floor((Date.now() - activeTimer.startTime.getTime()) / 1000),
      } : null,
      hoursLoggedToday: todayEntries._sum.hours || 0,
    },
    myAssignments: myAssignments.map(a => ({
      id: a.id,
      project: a.project,
      role: a.role,
      allocatedHours: a.allocatedHours,
    })),
    myTasks: myTasks.map(ta => ({
      id: ta.task.id,
      title: ta.task.title,
      status: ta.task.status,
      priority: ta.task.priority,
      dueDate: ta.task.dueDate,
      project: ta.task.project,
    })),
    upcomingMilestones,
    teamStats,
  };
}

// ============================================
// PROJECT SUMMARY
// ============================================

export async function getProjectsSummary() {
  // Total project count
  const total = await db.project.count();

  // Project counts by status
  const statusCounts = await db.project.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  // Project counts by priority
  const priorityCounts = await db.project.groupBy({
    by: ['priority'],
    _count: { priority: true },
  });

  // Projects with budget tracking
  const projectsWithBudget = await db.project.findMany({
    where: {
      status: { in: [ProjectStatus.ACTIVE, ProjectStatus.PLANNING] },
      budgetHours: { not: null },
    },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      budgetHours: true,
      startDate: true,
      endDate: true,
      tasks: {
        select: {
          actualHours: true,
          estimatedHours: true,
        },
      },
    },
  });

  const budgetTracking = projectsWithBudget.map(p => {
    const actualHours = p.tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    const estimatedHours = p.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const budgetHours = p.budgetHours || 0;

    return {
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status,
      budgetHours,
      actualHours: Math.round(actualHours * 100) / 100,
      estimatedHours: Math.round(estimatedHours * 100) / 100,
      budgetUsedPercent: budgetHours > 0 ? Math.round((actualHours / budgetHours) * 100) : 0,
      startDate: p.startDate,
      endDate: p.endDate,
    };
  });

  // Overdue milestones
  const overdueMilestones = await db.milestone.findMany({
    where: {
      isCompleted: false,
      dueDate: { lt: new Date() },
    },
    include: {
      project: {
        select: { id: true, name: true, code: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  // Task completion rate
  const [completedTasks, totalTasks] = await Promise.all([
    db.task.count({ where: { status: TaskStatus.COMPLETED } }),
    db.task.count(),
  ]);

  return {
    total,
    byStatus: statusCounts.reduce((acc, s) => {
      acc[s.status] = s._count.status;
      return acc;
    }, {} as Record<string, number>),
    byPriority: priorityCounts.reduce((acc, p) => {
      acc[p.priority] = p._count.priority;
      return acc;
    }, {} as Record<string, number>),
    budgetTracking,
    overdueMilestones,
    taskCompletion: {
      completed: completedTasks,
      total: totalTasks,
      rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
  };
}

// ============================================
// CAPACITY OVERVIEW
// ============================================

export async function getCapacityOverview() {
  const activeUsers = await db.user.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      defaultWeeklyHours: true,
      projectAssignments: {
        where: {
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        },
        select: {
          allocatedHours: true,
          project: {
            select: { name: true, code: true },
          },
        },
      },
    },
  });

  const resourceUtilization = activeUsers.map(user => {
    const totalAllocated = user.projectAssignments.reduce(
      (sum, a) => sum + a.allocatedHours,
      0
    );
    const utilizationPercent = user.defaultWeeklyHours > 0
      ? Math.round((totalAllocated / user.defaultWeeklyHours) * 100)
      : 0;

    return {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      department: user.department,
      defaultWeeklyHours: user.defaultWeeklyHours,
      allocatedHours: totalAllocated,
      utilizationPercent,
      status: utilizationPercent < 50 ? 'underutilized' :
              utilizationPercent > 100 ? 'overallocated' :
              utilizationPercent >= 80 ? 'optimal' : 'available',
      projectCount: user.projectAssignments.length,
    };
  });

  // Summary stats
  const underutilized = resourceUtilization.filter(r => r.status === 'underutilized').length;
  const optimal = resourceUtilization.filter(r => r.status === 'optimal').length;
  const available = resourceUtilization.filter(r => r.status === 'available').length;
  const overallocated = resourceUtilization.filter(r => r.status === 'overallocated').length;

  // Department breakdown with capacity and allocation
  const deptMap = new Map<string, { capacity: number; allocated: number; count: number }>();
  for (const r of resourceUtilization) {
    const dept = r.department || 'Unassigned';
    const existing = deptMap.get(dept);
    if (existing) {
      existing.capacity += r.defaultWeeklyHours || 40;
      existing.allocated += r.allocatedHours;
      existing.count++;
    } else {
      deptMap.set(dept, {
        capacity: r.defaultWeeklyHours || 40,
        allocated: r.allocatedHours,
        count: 1,
      });
    }
  }

  const byDepartment = Array.from(deptMap.entries()).map(([department, data]) => ({
    department,
    capacity: data.capacity,
    allocated: data.allocated,
    utilization: data.capacity > 0 ? Math.round((data.allocated / data.capacity) * 100) : 0,
  }));

  // Calculate totals
  const totalCapacity = resourceUtilization.reduce((sum, r) => sum + (r.defaultWeeklyHours || 40), 0);
  const totalAllocated = resourceUtilization.reduce((sum, r) => sum + r.allocatedHours, 0);
  const utilizationRate = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;

  return {
    totalCapacity,
    totalAllocated,
    utilizationRate,
    byDepartment,
    // Additional data for detailed views
    summary: {
      totalUsers: resourceUtilization.length,
      underutilized,
      available,
      optimal,
      overallocated,
    },
    resources: resourceUtilization.sort((a, b) => b.utilizationPercent - a.utilizationPercent),
  };
}

// ============================================
// TIME SUMMARY
// ============================================

export interface TimeSummaryParams {
  startDate: Date;
  endDate: Date;
  groupBy?: 'day' | 'week' | 'month' | 'project' | 'user';
}

export async function getTimeSummary(params: TimeSummaryParams) {
  const { startDate, endDate, groupBy = 'day' } = params;

  // Get all time entries in range
  const entries = await db.timeEntry.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, department: true },
      },
      task: {
        select: {
          id: true,
          title: true,
          projectId: true,
          project: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const billableHours = entries.reduce((sum, e) => sum + (e.billableHours || 0), 0);

  // Aggregate by project
  const projectMap = new Map<string, { projectId: string; projectName: string; hours: number }>();
  for (const entry of entries) {
    const projectId = entry.task?.project?.id || 'unassigned';
    const projectName = entry.task?.project?.name || 'Unassigned';
    const existing = projectMap.get(projectId);
    if (existing) {
      existing.hours += entry.hours || 0;
    } else {
      projectMap.set(projectId, { projectId, projectName, hours: entry.hours || 0 });
    }
  }
  const byProject = Array.from(projectMap.values())
    .map(p => ({ ...p, hours: Math.round(p.hours * 100) / 100 }))
    .sort((a, b) => b.hours - a.hours);

  // Aggregate by user
  const userMap = new Map<string, { userId: string; userName: string; hours: number }>();
  for (const entry of entries) {
    const userId = entry.user.id;
    const userName = `${entry.user.firstName} ${entry.user.lastName}`;
    const existing = userMap.get(userId);
    if (existing) {
      existing.hours += entry.hours || 0;
    } else {
      userMap.set(userId, { userId, userName, hours: entry.hours || 0 });
    }
  }
  const byUser = Array.from(userMap.values())
    .map(u => ({ ...u, hours: Math.round(u.hours * 100) / 100 }))
    .sort((a, b) => b.hours - a.hours);

  // Group data based on groupBy parameter
  let grouped: Record<string, { label: string; hours: number; billableHours: number; entries: number }> = {};

  for (const entry of entries) {
    let key: string;
    let label: string;

    switch (groupBy) {
      case 'day':
        key = entry.date.toISOString().split('T')[0];
        label = key;
        break;
      case 'week':
        const weekStart = new Date(entry.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toISOString().split('T')[0];
        label = `Week of ${key}`;
        break;
      case 'month':
        key = `${entry.date.getFullYear()}-${String(entry.date.getMonth() + 1).padStart(2, '0')}`;
        label = key;
        break;
      case 'project':
        key = entry.task?.project?.id || 'unassigned';
        label = entry.task?.project?.name || 'Unassigned';
        break;
      case 'user':
        key = entry.user.id;
        label = `${entry.user.firstName} ${entry.user.lastName}`;
        break;
      default:
        key = entry.date.toISOString().split('T')[0];
        label = key;
    }

    if (!grouped[key]) {
      grouped[key] = { label, hours: 0, billableHours: 0, entries: 0 };
    }
    grouped[key].hours += entry.hours || 0;
    grouped[key].billableHours += entry.billableHours || 0;
    grouped[key].entries++;
  }

  // Convert to sorted array
  const data = Object.entries(grouped)
    .map(([key, value]) => ({
      key,
      ...value,
      hours: Math.round(value.hours * 100) / 100,
      billableHours: Math.round(value.billableHours * 100) / 100,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    billableHours: Math.round(billableHours * 100) / 100,
    nonBillableHours: Math.round((totalHours - billableHours) * 100) / 100,
    byProject,
    byUser,
    // Additional data for detailed reports
    period: { startDate, endDate },
    billablePercent: totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0,
    entryCount: entries.length,
    groupedBy: groupBy,
    data,
  };
}

// ============================================
// USER UTILIZATION
// ============================================

export interface UserUtilizationParams {
  startDate: Date;
  endDate: Date;
  departmentFilter?: string;
}

export async function getUsersUtilization(params: UserUtilizationParams) {
  const { startDate, endDate, departmentFilter } = params;

  const userWhere: any = { status: 'ACTIVE' };
  if (departmentFilter) {
    userWhere.department = departmentFilter;
  }

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

  // Calculate working days in range
  let workingDays = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  const utilization = await Promise.all(
    users.map(async user => {
      // Get time entries
      const timeResult = await db.timeEntry.aggregate({
        where: {
          userId: user.id,
          date: { gte: startDate, lte: endDate },
        },
        _sum: { hours: true },
        _count: { id: true },
      });

      // Calculate expected hours (capacity)
      const expectedHours = (user.defaultWeeklyHours / 5) * workingDays;
      const loggedHours = timeResult._sum.hours || 0;
      const utilizationPercent = expectedHours > 0
        ? Math.round((loggedHours / expectedHours) * 100)
        : 0;

      return {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        department: user.department,
        defaultWeeklyHours: user.defaultWeeklyHours,
        expectedHours: Math.round(expectedHours * 100) / 100,
        loggedHours: Math.round(loggedHours * 100) / 100,
        entryCount: timeResult._count.id,
        utilizationPercent,
      };
    })
  );

  // Sort by utilization (lowest first to highlight underperformers)
  utilization.sort((a, b) => a.utilizationPercent - b.utilizationPercent);

  // Summary
  const totalExpected = utilization.reduce((sum, u) => sum + u.expectedHours, 0);
  const totalLogged = utilization.reduce((sum, u) => sum + u.loggedHours, 0);

  return {
    period: { startDate, endDate, workingDays },
    summary: {
      userCount: utilization.length,
      totalExpectedHours: Math.round(totalExpected * 100) / 100,
      totalLoggedHours: Math.round(totalLogged * 100) / 100,
      avgUtilization: totalExpected > 0
        ? Math.round((totalLogged / totalExpected) * 100)
        : 0,
    },
    users: utilization,
  };
}
