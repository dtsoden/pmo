import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import { Prisma, TeamMemberRole, AssignmentStatus } from '@prisma/client';

// ============================================
// TEAM CRUD
// ============================================

const teamSelect = {
  id: true,
  name: true,
  description: true,
  skills: true,
  isActive: true,
  leadId: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      members: true,
      projectAssignments: true,
    },
  },
};

const teamDetailSelect = {
  ...teamSelect,
  members: {
    select: {
      id: true,
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          jobTitle: true,
          skills: true,
        },
      },
    },
    orderBy: [
      { role: 'asc' as const },
      { joinedAt: 'asc' as const },
    ],
  },
  projectAssignments: {
    select: {
      id: true,
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
        },
      },
    },
    where: {
      status: { not: AssignmentStatus.CANCELLED },
    },
  },
};

export async function listTeams(query: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
} = {}) {
  const { page = 1, limit = 50, search, isActive } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.TeamWhereInput = {};

  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [teams, total] = await Promise.all([
    db.team.findMany({
      where,
      select: teamSelect,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    db.team.count({ where }),
  ]);

  return {
    data: teams,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTeamById(id: string) {
  const team = await db.team.findUnique({
    where: { id },
    select: teamDetailSelect,
  });

  if (!team) {
    throw new Error('Team not found');
  }

  return team;
}

export async function createTeam(data: {
  name: string;
  description?: string;
  skills?: string[];
  leadId?: string;
}) {
  const team = await db.team.create({
    data: {
      name: data.name,
      description: data.description,
      skills: data.skills || [],
      leadId: data.leadId,
    },
    select: teamSelect,
  });

  logger.info(`Team created: ${team.name} (${team.id})`);
  return team;
}

export async function updateTeam(
  id: string,
  data: {
    name?: string;
    description?: string;
    skills?: string[];
    leadId?: string | null;
    isActive?: boolean;
  }
) {
  const team = await db.team.update({
    where: { id },
    data,
    select: teamSelect,
  });

  logger.info(`Team updated: ${team.name} (${team.id})`);
  return team;
}

export async function deleteTeam(id: string) {
  await db.team.delete({ where: { id } });
  logger.info(`Team deleted: ${id}`);
}

// ============================================
// TEAM MEMBERS
// ============================================

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: TeamMemberRole = TeamMemberRole.MEMBER
) {
  // Check if already a member
  const existing = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });

  if (existing) {
    throw new Error('User is already a member of this team');
  }

  const member = await db.teamMember.create({
    data: {
      teamId,
      userId,
      role,
    },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          jobTitle: true,
        },
      },
    },
  });

  logger.info(`User ${userId} added to team ${teamId} as ${role}`);
  return member;
}

export async function updateTeamMember(
  teamId: string,
  userId: string,
  role: TeamMemberRole
) {
  const member = await db.teamMember.update({
    where: { teamId_userId: { teamId, userId } },
    data: { role },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          jobTitle: true,
        },
      },
    },
  });

  logger.info(`Team member ${userId} role updated to ${role} in team ${teamId}`);
  return member;
}

export async function removeTeamMember(teamId: string, userId: string) {
  await db.teamMember.delete({
    where: { teamId_userId: { teamId, userId } },
  });

  logger.info(`User ${userId} removed from team ${teamId}`);
}

export async function getTeamMembers(teamId: string) {
  const members = await db.teamMember.findMany({
    where: { teamId },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          jobTitle: true,
          skills: true,
          maxWeeklyHours: true,
        },
      },
    },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  });

  return members;
}

// ============================================
// TEAM PROJECT ASSIGNMENTS
// ============================================

export async function assignTeamToProject(data: {
  teamId: string;
  projectId: string;
  allocatedHours: number;
  startDate: Date;
  endDate?: Date;
}) {
  // Check if already assigned
  const existing = await db.teamProjectAssignment.findUnique({
    where: { teamId_projectId: { teamId: data.teamId, projectId: data.projectId } },
  });

  if (existing) {
    throw new Error('Team is already assigned to this project');
  }

  const assignment = await db.teamProjectAssignment.create({
    data: {
      teamId: data.teamId,
      projectId: data.projectId,
      allocatedHours: data.allocatedHours,
      startDate: data.startDate,
      endDate: data.endDate,
      status: AssignmentStatus.PLANNED,
    },
    select: {
      id: true,
      allocatedHours: true,
      startDate: true,
      endDate: true,
      status: true,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  logger.info(`Team ${data.teamId} assigned to project ${data.projectId}`);
  return assignment;
}

export async function updateTeamProjectAssignment(
  id: string,
  data: {
    allocatedHours?: number;
    startDate?: Date;
    endDate?: Date | null;
    status?: AssignmentStatus;
  }
) {
  const assignment = await db.teamProjectAssignment.update({
    where: { id },
    data,
    select: {
      id: true,
      allocatedHours: true,
      startDate: true,
      endDate: true,
      status: true,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  logger.info(`Team project assignment ${id} updated`);
  return assignment;
}

export async function removeTeamFromProject(id: string) {
  await db.teamProjectAssignment.delete({ where: { id } });
  logger.info(`Team project assignment ${id} deleted`);
}

export async function getTeamProjectAssignments(teamId: string) {
  return db.teamProjectAssignment.findMany({
    where: { teamId },
    select: {
      id: true,
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
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { startDate: 'desc' },
  });
}

export async function getProjectTeamAssignments(projectId: string) {
  return db.teamProjectAssignment.findMany({
    where: { projectId },
    select: {
      id: true,
      allocatedHours: true,
      startDate: true,
      endDate: true,
      status: true,
      team: {
        select: {
          id: true,
          name: true,
          skills: true,
          _count: {
            select: { members: true },
          },
        },
      },
    },
    orderBy: { startDate: 'asc' },
  });
}

// ============================================
// TEAM CAPACITY
// ============================================

export async function getTeamCapacity(teamId: string) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      members: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              maxWeeklyHours: true,
              defaultWeeklyHours: true,
            },
          },
        },
      },
      projectAssignments: {
        where: {
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        },
        select: {
          allocatedHours: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  // Calculate total capacity
  const totalCapacity = team.members.reduce(
    (sum, m) => sum + m.user.maxWeeklyHours,
    0
  );

  // Calculate total allocated
  const totalAllocated = team.projectAssignments.reduce(
    (sum, a) => sum + a.allocatedHours,
    0
  );

  return {
    team: { id: team.id, name: team.name },
    memberCount: team.members.length,
    totalCapacity,
    totalAllocated,
    availableCapacity: totalCapacity - totalAllocated,
    utilizationPercent: totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0,
    isOverAllocated: totalAllocated > totalCapacity,
    projectBreakdown: team.projectAssignments.map((a) => ({
      project: a.project,
      allocatedHours: a.allocatedHours,
    })),
  };
}
