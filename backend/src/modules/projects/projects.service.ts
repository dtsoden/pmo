import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import { ProjectStatus, ProjectPriority, TaskStatus, TaskPriority, Prisma } from '@prisma/client';

// ============================================
// PROJECT OPERATIONS
// ============================================

const projectListSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  status: true,
  priority: true,
  clientId: true,
  client: {
    select: {
      id: true,
      name: true,
    },
  },
  startDate: true,
  endDate: true,
  actualStartDate: true,
  actualEndDate: true,
  budgetHours: true,
  budgetCost: true,
  managerId: true,
  methodology: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      phases: true,
      milestones: true,
      tasks: true,
      assignments: true,
    },
  },
} satisfies Prisma.ProjectSelect;

const projectDetailSelect = {
  ...projectListSelect,
  phases: {
    select: {
      id: true,
      name: true,
      description: true,
      order: true,
      startDate: true,
      endDate: true,
      status: true,
      _count: {
        select: { tasks: true, milestones: true },
      },
    },
    orderBy: { order: 'asc' as const },
  },
  milestones: {
    select: {
      id: true,
      name: true,
      description: true,
      dueDate: true,
      completedDate: true,
      isCompleted: true,
      phaseId: true,
    },
    orderBy: { dueDate: 'asc' as const },
  },
  assignments: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
      role: true,
      allocatedHours: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  },
  teamAssignments: {
    select: {
      id: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          description: true,
          skills: true,
          _count: {
            select: { members: true },
          },
        },
      },
      allocatedHours: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  },
} satisfies Prisma.ProjectSelect;

export interface ListProjectsParams {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  clientId?: string;
  managerId?: string;
  search?: string;
}

export interface CreateProjectData {
  name: string;
  code: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  clientId: string;
  startDate: Date;
  endDate: Date;
  budgetHours?: number;
  budgetCost?: number;
  managerId?: string;
  methodology?: string;
  tags?: string[];
}

export interface UpdateProjectData {
  name?: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  budgetHours?: number;
  budgetCost?: number;
  managerId?: string;
  methodology?: string;
  tags?: string[];
}

export async function listProjects(params: ListProjectsParams = {}) {
  const { page = 1, limit = 20, status, priority, clientId, managerId, search } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.ProjectWhereInput = {};

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (clientId) where.clientId = clientId;
  if (managerId) where.managerId = managerId;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [allProjects, total] = await Promise.all([
    db.project.findMany({
      where,
      select: projectListSelect,
      orderBy: { startDate: 'desc' },
    }),
    db.project.count({ where }),
  ]);

  // Sort by priority (CRITICAL > HIGH > MEDIUM > LOW), then by startDate
  const priorityOrder: Record<ProjectPriority, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const sortedProjects = allProjects.sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // If same priority, sort by startDate descending
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  // Apply pagination after sorting
  const projects = sortedProjects.slice(skip, skip + limit);

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProjectById(id: string) {
  const project = await db.project.findUnique({
    where: { id },
    select: projectDetailSelect,
  });

  if (!project) {
    throw new Error('Project not found');
  }

  return project;
}

export async function createProject(data: CreateProjectData) {
  // Check code uniqueness
  const existingCode = await db.project.findUnique({
    where: { code: data.code },
  });
  if (existingCode) {
    throw new Error('Project code already exists');
  }

  // Validate client exists
  const client = await db.client.findUnique({ where: { id: data.clientId } });
  if (!client) {
    throw new Error('Client not found');
  }

  // Validate manager if provided
  if (data.managerId) {
    const manager = await db.user.findUnique({ where: { id: data.managerId } });
    if (!manager) {
      throw new Error('Manager not found');
    }
  }

  const project = await db.project.create({
    data: {
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description,
      status: data.status || ProjectStatus.PLANNING,
      priority: data.priority || ProjectPriority.MEDIUM,
      clientId: data.clientId,
      startDate: data.startDate,
      endDate: data.endDate,
      budgetHours: data.budgetHours,
      budgetCost: data.budgetCost,
      managerId: data.managerId,
      methodology: data.methodology,
      tags: data.tags || [],
    },
    select: projectListSelect,
  });

  logger.info(`Project created: ${project.name} (${project.code})`);

  return project;
}

export async function updateProject(id: string, data: UpdateProjectData) {
  const existing = await db.project.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Project not found');
  }

  // Check code uniqueness if changing
  if (data.code && data.code !== existing.code) {
    const codeTaken = await db.project.findUnique({ where: { code: data.code } });
    if (codeTaken) {
      throw new Error('Project code already in use');
    }
  }

  // Validate client if changing
  if (data.clientId && data.clientId !== existing.clientId) {
    const client = await db.client.findUnique({ where: { id: data.clientId } });
    if (!client) {
      throw new Error('Client not found');
    }
  }

  const updateData: Prisma.ProjectUpdateInput = { ...data };
  if (data.code) {
    updateData.code = data.code.toUpperCase();
  }

  const project = await db.project.update({
    where: { id },
    data: updateData,
    select: projectListSelect,
  });

  logger.info(`Project updated: ${project.name} (${project.code})`);

  return project;
}

export async function deleteProject(id: string) {
  const project = await db.project.findUnique({ where: { id } });
  if (!project) {
    throw new Error('Project not found');
  }

  // Cascade delete handled by Prisma schema
  await db.project.delete({ where: { id } });

  logger.info(`Project deleted: ${project.name} (${project.code})`);

  return { success: true };
}

// ============================================
// PHASE OPERATIONS
// ============================================

export interface CreatePhaseData {
  name: string;
  description?: string;
  order?: number;
  startDate: Date;
  endDate: Date;
  status?: ProjectStatus;
}

export async function getProjectPhases(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }

  return db.projectPhase.findMany({
    where: { projectId },
    include: {
      _count: {
        select: { tasks: true, milestones: true },
      },
    },
    orderBy: { order: 'asc' },
  });
}

export async function createPhase(projectId: string, data: CreatePhaseData) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }

  // Auto-assign order if not provided
  let order = data.order;
  if (order === undefined) {
    const lastPhase = await db.projectPhase.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
    });
    order = lastPhase ? lastPhase.order + 1 : 1;
  }

  const phase = await db.projectPhase.create({
    data: {
      projectId,
      name: data.name,
      description: data.description,
      order,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || ProjectStatus.PLANNING,
    },
  });

  logger.info(`Phase created: ${phase.name} for project ${projectId}`);

  return phase;
}

export async function updatePhase(phaseId: string, data: Partial<CreatePhaseData>) {
  const phase = await db.projectPhase.findUnique({ where: { id: phaseId } });
  if (!phase) {
    throw new Error('Phase not found');
  }

  return db.projectPhase.update({
    where: { id: phaseId },
    data,
  });
}

export async function deletePhase(phaseId: string) {
  const phase = await db.projectPhase.findUnique({ where: { id: phaseId } });
  if (!phase) {
    throw new Error('Phase not found');
  }

  await db.projectPhase.delete({ where: { id: phaseId } });

  return { success: true };
}

// ============================================
// MILESTONE OPERATIONS
// ============================================

export interface CreateMilestoneData {
  name: string;
  description?: string;
  dueDate: Date;
  phaseId?: string;
}

export async function getProjectMilestones(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }

  return db.milestone.findMany({
    where: { projectId },
    include: {
      phase: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  });
}

export async function createMilestone(projectId: string, data: CreateMilestoneData) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }

  // Validate phase if provided
  if (data.phaseId) {
    const phase = await db.projectPhase.findUnique({ where: { id: data.phaseId } });
    if (!phase || phase.projectId !== projectId) {
      throw new Error('Phase not found or does not belong to this project');
    }
  }

  const milestone = await db.milestone.create({
    data: {
      projectId,
      name: data.name,
      description: data.description,
      dueDate: data.dueDate,
      phaseId: data.phaseId,
    },
  });

  logger.info(`Milestone created: ${milestone.name} for project ${projectId}`);

  return milestone;
}

export async function updateMilestone(milestoneId: string, data: Partial<CreateMilestoneData> & { isCompleted?: boolean }) {
  const milestone = await db.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  const updateData: Prisma.MilestoneUpdateInput = { ...data };

  // Set completedDate if completing
  if (data.isCompleted === true && !milestone.isCompleted) {
    updateData.completedDate = new Date();
  } else if (data.isCompleted === false) {
    updateData.completedDate = null;
  }

  return db.milestone.update({
    where: { id: milestoneId },
    data: updateData,
  });
}

export async function deleteMilestone(milestoneId: string) {
  const milestone = await db.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  await db.milestone.delete({ where: { id: milestoneId } });

  return { success: true };
}

// ============================================
// TASK OPERATIONS
// ============================================

const taskListSelect = {
  id: true,
  projectId: true,
  phaseId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  parentTaskId: true,
  estimatedHours: true,
  actualHours: true,
  startDate: true,
  dueDate: true,
  completedDate: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  assignments: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      isPrimary: true,
    },
  },
  _count: {
    select: {
      subtasks: true,
      timeEntries: true,
    },
  },
} satisfies Prisma.TaskSelect;

export interface ListTasksParams {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  phaseId?: string;
  assigneeId?: string;
  parentTaskId?: string | null;
  search?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  phaseId?: string;
  parentTaskId?: string;
  estimatedHours?: number;
  startDate?: Date;
  dueDate?: Date;
  tags?: string[];
}

export async function getProjectTasks(projectId: string, params: ListTasksParams = {}) {
  const { page = 1, limit = 50, status, priority, phaseId, assigneeId, parentTaskId, search } = params;
  const skip = (page - 1) * limit;

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }

  const where: Prisma.TaskWhereInput = { projectId };

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (phaseId) where.phaseId = phaseId;
  if (parentTaskId !== undefined) where.parentTaskId = parentTaskId;

  if (assigneeId) {
    where.assignments = {
      some: { userId: assigneeId },
    };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [tasks, total] = await Promise.all([
    db.task.findMany({
      where,
      select: taskListSelect,
      skip,
      take: limit,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    }),
    db.task.count({ where }),
  ]);

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTaskById(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      ...taskListSelect,
      phase: {
        select: { id: true, name: true },
      },
      parentTask: {
        select: { id: true, title: true },
      },
      subtasks: {
        select: taskListSelect,
        orderBy: { createdAt: 'asc' },
      },
      blockedBy: {
        select: {
          id: true,
          blockingTask: {
            select: { id: true, title: true, status: true },
          },
          dependencyType: true,
        },
      },
      blocking: {
        select: {
          id: true,
          blockedTask: {
            select: { id: true, title: true, status: true },
          },
          dependencyType: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  return task;
}

export async function createTask(projectId: string, data: CreateTaskData) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }

  // Validate phase if provided
  if (data.phaseId) {
    const phase = await db.projectPhase.findUnique({ where: { id: data.phaseId } });
    if (!phase || phase.projectId !== projectId) {
      throw new Error('Phase not found or does not belong to this project');
    }
  }

  // Validate parent task if provided
  if (data.parentTaskId) {
    const parentTask = await db.task.findUnique({ where: { id: data.parentTaskId } });
    if (!parentTask || parentTask.projectId !== projectId) {
      throw new Error('Parent task not found or does not belong to this project');
    }
  }

  const task = await db.task.create({
    data: {
      projectId,
      title: data.title,
      description: data.description,
      status: data.status || TaskStatus.TODO,
      priority: data.priority || TaskPriority.MEDIUM,
      phaseId: data.phaseId,
      parentTaskId: data.parentTaskId,
      estimatedHours: data.estimatedHours,
      startDate: data.startDate,
      dueDate: data.dueDate,
      tags: data.tags || [],
    },
    select: taskListSelect,
  });

  logger.info(`Task created: ${task.title} for project ${projectId}`);

  return task;
}

export async function updateTask(taskId: string, data: Partial<CreateTaskData> & { actualHours?: number; completedDate?: Date }) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error('Task not found');
  }

  const updateData: Prisma.TaskUpdateInput = { ...data };

  // Auto-set completedDate when status changes to COMPLETED
  if (data.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
    updateData.completedDate = new Date();
  } else if (data.status && data.status !== TaskStatus.COMPLETED && task.status === TaskStatus.COMPLETED) {
    updateData.completedDate = null;
  }

  const updated = await db.task.update({
    where: { id: taskId },
    data: updateData,
    select: taskListSelect,
  });

  logger.info(`Task updated: ${updated.title} (${taskId})`);

  return updated;
}

export async function deleteTask(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error('Task not found');
  }

  await db.task.delete({ where: { id: taskId } });

  logger.info(`Task deleted: ${task.title} (${taskId})`);

  return { success: true };
}

// Task dependencies
export async function addTaskDependency(taskId: string, blockingTaskId: string, dependencyType = 'finish-to-start') {
  const task = await db.task.findUnique({ where: { id: taskId } });
  const blockingTask = await db.task.findUnique({ where: { id: blockingTaskId } });

  if (!task || !blockingTask) {
    throw new Error('Task not found');
  }

  if (task.projectId !== blockingTask.projectId) {
    throw new Error('Tasks must be in the same project');
  }

  if (taskId === blockingTaskId) {
    throw new Error('Task cannot depend on itself');
  }

  const dependency = await db.taskDependency.create({
    data: {
      blockedTaskId: taskId,
      blockingTaskId,
      dependencyType,
    },
  });

  return dependency;
}

export async function removeTaskDependency(dependencyId: string) {
  const dependency = await db.taskDependency.findUnique({ where: { id: dependencyId } });
  if (!dependency) {
    throw new Error('Dependency not found');
  }

  await db.taskDependency.delete({ where: { id: dependencyId } });

  return { success: true };
}

// Task assignments
export async function assignTask(taskId: string, userId: string, isPrimary = false, allocatedHours?: number) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error('Task not found');
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  // Check if already assigned
  const existing = await db.taskAssignment.findUnique({
    where: { taskId_userId: { taskId, userId } },
  });

  if (existing) {
    throw new Error('User already assigned to this task');
  }

  // If setting as primary, unset other primary assignments
  if (isPrimary) {
    await db.taskAssignment.updateMany({
      where: { taskId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const assignment = await db.taskAssignment.create({
    data: {
      taskId,
      userId,
      isPrimary,
      allocatedHours,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  logger.info(`User ${userId} assigned to task ${taskId}`);

  return assignment;
}

export async function unassignTask(taskId: string, userId: string) {
  const assignment = await db.taskAssignment.findUnique({
    where: { taskId_userId: { taskId, userId } },
  });

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  await db.taskAssignment.delete({
    where: { taskId_userId: { taskId, userId } },
  });

  logger.info(`User ${userId} unassigned from task ${taskId}`);

  return { success: true };
}
