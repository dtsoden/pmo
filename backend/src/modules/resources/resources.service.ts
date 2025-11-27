import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import { AssignmentStatus, Prisma } from '@prisma/client';

// ============================================
// PROJECT ASSIGNMENT OPERATIONS
// ============================================

const assignmentSelect = {
  id: true,
  projectId: true,
  project: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      startDate: true,
      endDate: true,
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  userId: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      role: true,
      department: true,
      jobTitle: true,
    },
  },
  role: true,
  allocatedHours: true,
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectAssignmentSelect;

export interface ListAssignmentsParams {
  page?: number;
  limit?: number;
  projectId?: string;
  userId?: string;
  status?: AssignmentStatus;
  role?: string;
}

export interface CreateAssignmentData {
  projectId: string;
  userId: string;
  role: string;
  allocatedHours: number;
  startDate: Date;
  endDate?: Date;
  status?: AssignmentStatus;
}

export interface UpdateAssignmentData {
  role?: string;
  allocatedHours?: number;
  startDate?: Date;
  endDate?: Date;
  status?: AssignmentStatus;
}

export async function listAssignments(params: ListAssignmentsParams = {}) {
  const { page = 1, limit = 50, projectId, userId, status, role } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.ProjectAssignmentWhereInput = {};

  if (projectId) where.projectId = projectId;
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (role) where.role = { contains: role, mode: 'insensitive' };

  const [assignments, total] = await Promise.all([
    db.projectAssignment.findMany({
      where,
      select: assignmentSelect,
      skip,
      take: limit,
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    }),
    db.projectAssignment.count({ where }),
  ]);

  return {
    assignments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAssignmentById(id: string) {
  const assignment = await db.projectAssignment.findUnique({
    where: { id },
    select: assignmentSelect,
  });

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  return assignment;
}

export async function createAssignment(data: CreateAssignmentData) {
  // Validate project exists
  const project = await db.project.findUnique({ where: { id: data.projectId } });
  if (!project) {
    throw new Error('Project not found');
  }

  // Validate user exists
  const user = await db.user.findUnique({ where: { id: data.userId } });
  if (!user) {
    throw new Error('User not found');
  }

  // Check for existing assignment
  const existing = await db.projectAssignment.findUnique({
    where: { projectId_userId: { projectId: data.projectId, userId: data.userId } },
  });
  if (existing) {
    throw new Error('User already assigned to this project');
  }

  const assignment = await db.projectAssignment.create({
    data: {
      projectId: data.projectId,
      userId: data.userId,
      role: data.role,
      allocatedHours: data.allocatedHours,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || AssignmentStatus.PLANNED,
    },
    select: assignmentSelect,
  });

  logger.info(`User ${data.userId} assigned to project ${data.projectId} as ${data.role}`);

  return assignment;
}

export async function updateAssignment(id: string, data: UpdateAssignmentData) {
  const existing = await db.projectAssignment.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Assignment not found');
  }

  const assignment = await db.projectAssignment.update({
    where: { id },
    data,
    select: assignmentSelect,
  });

  logger.info(`Assignment ${id} updated`);

  return assignment;
}

export async function deleteAssignment(id: string) {
  const assignment = await db.projectAssignment.findUnique({ where: { id } });
  if (!assignment) {
    throw new Error('Assignment not found');
  }

  await db.projectAssignment.delete({ where: { id } });

  logger.info(`Assignment ${id} deleted`);

  return { success: true };
}

// ============================================
// RESOURCE OVERVIEW & ALLOCATION
// ============================================

export interface ResourceAllocation {
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    department: string | null;
    defaultWeeklyHours: number;
  };
  totalAllocatedHours: number;
  assignments: Array<{
    id: string;
    projectId: string;
    projectName: string;
    projectCode: string;
    role: string;
    allocatedHours: number;
    status: AssignmentStatus;
  }>;
  utilizationPercent: number;
}

export async function getResourceAllocations(params: {
  startDate?: Date;
  endDate?: Date;
  departmentFilter?: string;
}): Promise<ResourceAllocation[]> {
  const { startDate, endDate, departmentFilter } = params;

  // Get active users
  const userWhere: Prisma.UserWhereInput = { status: 'ACTIVE' };
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
      avatarUrl: true,
      department: true,
      defaultWeeklyHours: true,
      projectAssignments: {
        where: {
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
          ...(startDate && { startDate: { lte: endDate || new Date() } }),
          ...(endDate && {
            OR: [
              { endDate: null },
              { endDate: { gte: startDate || new Date() } },
            ],
          }),
        },
        select: {
          id: true,
          projectId: true,
          project: {
            select: {
              name: true,
              code: true,
            },
          },
          role: true,
          allocatedHours: true,
          status: true,
        },
      },
    },
    orderBy: { lastName: 'asc' },
  });

  return users.map(user => {
    const totalAllocated = user.projectAssignments.reduce(
      (sum, a) => sum + a.allocatedHours,
      0
    );

    return {
      userId: user.id,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        department: user.department,
        defaultWeeklyHours: user.defaultWeeklyHours,
      },
      totalAllocatedHours: totalAllocated,
      assignments: user.projectAssignments.map(a => ({
        id: a.id,
        projectId: a.projectId,
        projectName: a.project.name,
        projectCode: a.project.code,
        role: a.role,
        allocatedHours: a.allocatedHours,
        status: a.status,
      })),
      utilizationPercent: user.defaultWeeklyHours > 0
        ? Math.round((totalAllocated / user.defaultWeeklyHours) * 100)
        : 0,
    };
  });
}

export async function getProjectResources(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }

  const assignments = await db.projectAssignment.findMany({
    where: { projectId },
    select: assignmentSelect,
    orderBy: [{ role: 'asc' }, { user: { lastName: 'asc' } }],
  });

  const totalAllocatedHours = assignments.reduce((sum, a) => sum + a.allocatedHours, 0);

  return {
    projectId,
    projectName: project.name,
    totalAllocatedHours,
    headcount: assignments.length,
    assignments,
  };
}

export async function getUserAssignments(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const assignments = await db.projectAssignment.findMany({
    where: { userId },
    select: assignmentSelect,
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
  });

  const totalAllocatedHours = assignments
    .filter(a => a.status === AssignmentStatus.ACTIVE || a.status === AssignmentStatus.PLANNED)
    .reduce((sum, a) => sum + a.allocatedHours, 0);

  return {
    userId,
    userName: `${user.firstName} ${user.lastName}`,
    defaultWeeklyHours: user.defaultWeeklyHours,
    totalAllocatedHours,
    utilizationPercent: user.defaultWeeklyHours > 0
      ? Math.round((totalAllocatedHours / user.defaultWeeklyHours) * 100)
      : 0,
    assignments,
  };
}

// Common roles for dropdown
export function getCommonRoles(): string[] {
  return [
    'Project Manager',
    'Technical Lead',
    'Developer',
    'Senior Developer',
    'Designer',
    'UX Designer',
    'QA Engineer',
    'Business Analyst',
    'Scrum Master',
    'DevOps Engineer',
    'Architect',
    'Data Analyst',
    'Consultant',
    'Support',
  ];
}
