import { db } from '../../core/database/client.js';
import { hashPassword } from '../auth/auth.service.js';
import { logger } from '../../core/utils/logger.js';
import { UserRole, UserStatus, Prisma } from '@prisma/client';

// User select fields (exclude sensitive data)
const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  avatarUrl: true,
  department: true,
  jobTitle: true,
  phone: true,
  managerId: true,
  // Geographic and employment
  country: true,
  region: true,
  employmentType: true,
  // Capacity
  defaultWeeklyHours: true,
  maxWeeklyHours: true,
  timezone: true,
  // Skills and rates
  skills: true,
  hourlyRate: true,
  billableRate: true,
  // Meta
  preferences: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

// Extended select with manager info
const userWithManagerSelect = {
  ...userSelect,
  manager: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} satisfies Prisma.UserSelect;

// Extended select with team memberships and project assignments
const userDetailSelect = {
  ...userWithManagerSelect,
  teamMemberships: {
    select: {
      id: true,
      role: true,
      joinedAt: true,
      team: {
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
        },
      },
    },
  },
  projectAssignments: {
    select: {
      id: true,
      role: true,
      allocatedHours: true,
      startDate: true,
      endDate: true,
      status: true,
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          priority: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export interface ListUsersParams {
  page?: number;
  limit?: number;
  status?: UserStatus;
  role?: UserRole;
  search?: string;
  managerId?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  status?: UserStatus;
  department?: string;
  jobTitle?: string;
  phone?: string;
  managerId?: string;
  // Geographic and employment
  country?: string;
  region?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';
  // Capacity
  defaultWeeklyHours?: number;
  maxWeeklyHours?: number;
  timezone?: string;
  // Skills and rates
  skills?: string[];
  hourlyRate?: number;
  billableRate?: number;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  avatarUrl?: string;
  department?: string;
  jobTitle?: string;
  phone?: string;
  managerId?: string;
  // Geographic and employment
  country?: string;
  region?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';
  // Capacity
  defaultWeeklyHours?: number;
  maxWeeklyHours?: number;
  timezone?: string;
  // Skills and rates
  skills?: string[];
  hourlyRate?: number;
  billableRate?: number;
}

export async function listUsers(params: ListUsersParams = {}) {
  const { page = 1, limit = 20, status, role, search, managerId } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    deletedAt: null, // Exclude soft-deleted users
  };

  if (status) {
    where.status = status;
  }

  if (role) {
    where.role = role;
  }

  if (managerId) {
    where.managerId = managerId;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: userWithManagerSelect,
      skip,
      take: limit,
      orderBy: { lastName: 'asc' },
    }),
    db.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(id: string) {
  const user = await db.user.findFirst({
    where: {
      id,
      deletedAt: null, // Exclude soft-deleted users
    },
    select: {
      ...userDetailSelect,
      employees: {
        where: { deletedAt: null }, // Exclude soft-deleted employees
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

export async function createUser(data: CreateUserData) {
  // Check for existing user
  const existing = await db.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existing) {
    throw new Error('User with this email already exists');
  }

  // Validate manager if provided
  if (data.managerId) {
    const manager = await db.user.findUnique({
      where: { id: data.managerId },
    });
    if (!manager) {
      throw new Error('Manager not found');
    }
  }

  const passwordHash = await hashPassword(data.password);

  const user = await db.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || UserRole.TEAM_MEMBER,
      status: data.status || UserStatus.ACTIVE,
      department: data.department,
      jobTitle: data.jobTitle,
      phone: data.phone,
      managerId: data.managerId,
      // Geographic and employment
      country: data.country,
      region: data.region,
      employmentType: data.employmentType,
      // Capacity
      defaultWeeklyHours: data.defaultWeeklyHours ?? 40,
      maxWeeklyHours: data.maxWeeklyHours ?? 40,
      timezone: data.timezone || 'UTC',
      // Skills and rates
      skills: data.skills || [],
      hourlyRate: data.hourlyRate,
      billableRate: data.billableRate,
    },
    select: userWithManagerSelect,
  });

  logger.info(`User created: ${user.email} (${user.id})`);

  return user;
}

export async function updateUser(id: string, data: UpdateUserData) {
  // Check user exists
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('User not found');
  }

  // Check email uniqueness if changing
  if (data.email && data.email.toLowerCase() !== existing.email) {
    const emailTaken = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (emailTaken) {
      throw new Error('Email already in use');
    }
  }

  // Validate manager if provided
  if (data.managerId) {
    if (data.managerId === id) {
      throw new Error('User cannot be their own manager');
    }
    const manager = await db.user.findUnique({
      where: { id: data.managerId },
    });
    if (!manager) {
      throw new Error('Manager not found');
    }
  }

  // Build update data
  const updateData: Prisma.UserUpdateInput = {};

  if (data.email) updateData.email = data.email.toLowerCase();
  if (data.firstName) updateData.firstName = data.firstName;
  if (data.lastName) updateData.lastName = data.lastName;
  if (data.role) updateData.role = data.role;
  if (data.status) updateData.status = data.status;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.department !== undefined) updateData.department = data.department;
  if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.managerId !== undefined) {
    updateData.manager = data.managerId
      ? { connect: { id: data.managerId } }
      : { disconnect: true };
  }
  // Geographic and employment
  if (data.country !== undefined) updateData.country = data.country;
  if (data.region !== undefined) updateData.region = data.region;
  if (data.employmentType !== undefined) updateData.employmentType = data.employmentType;
  // Capacity
  if (data.defaultWeeklyHours !== undefined) updateData.defaultWeeklyHours = data.defaultWeeklyHours;
  if (data.maxWeeklyHours !== undefined) updateData.maxWeeklyHours = data.maxWeeklyHours;
  if (data.timezone) updateData.timezone = data.timezone;
  // Skills and rates
  if (data.skills !== undefined) updateData.skills = data.skills;
  if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate;
  if (data.billableRate !== undefined) updateData.billableRate = data.billableRate;

  // Handle password change
  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
  }

  const user = await db.user.update({
    where: { id },
    data: updateData,
    select: userWithManagerSelect,
  });

  logger.info(`User updated: ${user.email} (${user.id})`);

  return user;
}

export async function deleteUser(id: string) {
  const user = await db.user.findFirst({
    where: { id, deletedAt: null },
  });
  if (!user) {
    throw new Error('User not found');
  }

  // Soft delete by setting deletedAt timestamp
  await db.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  logger.info(`User soft deleted: ${user.email} (${user.id})`);

  return { success: true };
}

export async function restoreUser(id: string) {
  const user = await db.user.findFirst({
    where: { id, deletedAt: { not: null } },
  });
  if (!user) {
    throw new Error('Deleted user not found');
  }

  // Restore by clearing deletedAt timestamp
  await db.user.update({
    where: { id },
    data: { deletedAt: null },
  });

  logger.info(`User restored: ${user.email} (${user.id})`);

  return { success: true };
}

export async function getUsersByRole(role: UserRole) {
  return db.user.findMany({
    where: {
      role,
      status: UserStatus.ACTIVE,
      deletedAt: null, // Exclude soft-deleted users
    },
    select: userSelect,
    orderBy: { lastName: 'asc' },
  });
}

export async function getManagers() {
  return db.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      deletedAt: null, // Exclude soft-deleted users
      role: {
        in: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.PMO_MANAGER,
          UserRole.PROJECT_MANAGER,
          UserRole.RESOURCE_MANAGER,
        ],
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
    orderBy: { lastName: 'asc' },
  });
}

// User preferences interface
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    emailNotifications?: boolean;
    projectUpdates?: boolean;
    taskAssignments?: boolean;
    timeReminders?: boolean;
    weeklyDigest?: boolean;
  };
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return (user.preferences as UserPreferences) || {};
}

export async function updateUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Merge with existing preferences
  const currentPrefs = (user.preferences as UserPreferences) || {};
  const updatedPrefs = {
    ...currentPrefs,
    ...preferences,
    // Deep merge notifications if provided
    notifications: preferences.notifications
      ? { ...currentPrefs.notifications, ...preferences.notifications }
      : currentPrefs.notifications,
  };

  const updated = await db.user.update({
    where: { id: userId },
    data: { preferences: updatedPrefs },
    select: { preferences: true },
  });

  logger.info(`User preferences updated: ${userId}`);

  return updated.preferences as UserPreferences;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, email: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const { comparePassword } = await import('../auth/auth.service.js');
  const isValid = await comparePassword(currentPassword, user.passwordHash);

  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash and update new password
  const newPasswordHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  logger.info(`Password changed for user: ${user.email} (${userId})`);

  return { success: true };
}

// ============================================
// TEAM MEMBERSHIPS
// ============================================

export async function addUserToTeam(userId: string, teamId: string, role: 'LEAD' | 'SENIOR' | 'MEMBER' = 'MEMBER') {
  // Verify user exists and not deleted
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) {
    throw new Error('User not found');
  }

  // Import and call teams service
  const { addTeamMember } = await import('../teams/teams.service.js');
  return addTeamMember(teamId, userId, role);
}

export async function removeUserFromTeam(userId: string, teamId: string) {
  // Verify user exists
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) {
    throw new Error('User not found');
  }

  // Import and call teams service
  const { removeTeamMember } = await import('../teams/teams.service.js');
  return removeTeamMember(teamId, userId);
}

// ============================================
// PROJECT ASSIGNMENTS
// ============================================

export async function assignUserToProject(
  userId: string,
  projectId: string,
  data: {
    role: string;
    allocatedHours: number;
    startDate: Date;
    endDate?: Date;
  }
) {
  // Verify user exists and not deleted
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) {
    throw new Error('User not found');
  }

  // Verify project exists and not deleted
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
  });
  if (!project) {
    throw new Error('Project not found');
  }

  // Check if already assigned
  const existing = await db.projectAssignment.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (existing) {
    throw new Error('User is already assigned to this project');
  }

  const assignment = await db.projectAssignment.create({
    data: {
      userId,
      projectId,
      role: data.role,
      allocatedHours: data.allocatedHours,
      startDate: data.startDate,
      endDate: data.endDate,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  logger.info(`User ${user.email} assigned to project ${project.name}`);

  return assignment;
}

export async function removeUserFromProject(userId: string, projectId: string) {
  // Verify user exists
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) {
    throw new Error('User not found');
  }

  const assignment = await db.projectAssignment.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (!assignment) {
    throw new Error('User is not assigned to this project');
  }

  await db.projectAssignment.delete({
    where: { id: assignment.id },
  });

  logger.info(`User ${user.email} removed from project ${projectId}`);

  return { success: true };
}
