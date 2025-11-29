import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProjectStatus, ProjectPriority, TaskStatus, TaskPriority } from '@prisma/client';
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  restoreProject,
  getProjectPhases,
  createPhase,
  updatePhase,
  deletePhase,
  getProjectMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getProjectTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  restoreTask,
  addTaskDependency,
  removeTaskDependency,
  assignTask,
  unassignTask,
  assignTeamToProject,
  removeTeamFromProject,
  assignPersonToProject,
  removePersonFromProject,
  type CreateProjectData,
  type CreatePhaseData,
  type CreateMilestoneData,
  type CreateTaskData,
} from './projects.service.js';

// Validation schemas
const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(ProjectPriority).optional(),
  clientId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  search: z.string().optional(),
});

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  code: z.string().min(2, 'Project code must be at least 2 characters').max(20),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(ProjectPriority).optional(),
  clientId: z.string().uuid('Valid client ID required'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  budgetHours: z.number().positive().optional(),
  budgetCost: z.number().positive().optional(),
  managerId: z.string().uuid().optional(),
  methodology: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(2).max(20).optional(),
  description: z.string().nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(ProjectPriority).optional(),
  clientId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  actualStartDate: z.coerce.date().nullable().optional(),
  actualEndDate: z.coerce.date().nullable().optional(),
  budgetHours: z.number().positive().nullable().optional(),
  budgetCost: z.number().positive().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  methodology: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const createPhaseSchema = z.object({
  name: z.string().min(1, 'Phase name is required'),
  description: z.string().optional(),
  order: z.number().int().positive().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

const createMilestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required'),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
  phaseId: z.string().uuid().optional(),
});

const updateMilestoneSchema = createMilestoneSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});

const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  phaseId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  search: z.string().optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  phaseId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  estimatedHours: z.number().positive().optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  actualHours: z.number().min(0).optional(),
});

const addDependencySchema = z.object({
  blockingTaskId: z.string().uuid(),
  dependencyType: z.string().optional(),
});

const assignTaskSchema = z.object({
  userId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
  allocatedHours: z.number().positive().optional(),
});

const assignTeamSchema = z.object({
  teamId: z.string().uuid('Valid team ID required'),
  allocatedHours: z.number().min(0, 'Allocated hours must be positive'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

const assignPersonSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
  role: z.string().min(1, 'Role is required'),
  allocatedHours: z.number().min(0, 'Allocated hours must be positive'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const phaseIdParamSchema = z.object({
  id: z.string().uuid(),
  phaseId: z.string().uuid(),
});

const milestoneIdParamSchema = z.object({
  id: z.string().uuid(),
  milestoneId: z.string().uuid(),
});

const taskIdParamSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
});

export async function projectRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  // ========== PROJECT ROUTES ==========

  // Get all projects
  app.get('/', async (request, reply) => {
    try {
      const query = listProjectsQuerySchema.parse(request.query);
      const result = await listProjects(query);
      // Transform to expected format: { data, total, totalPages, page, limit }
      return {
        data: result.projects,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        page: result.pagination.page,
        limit: result.pagination.limit,
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list projects' });
    }
  });

  // Get project by ID
  app.get('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const project = await getProjectById(id);
      return project;
    } catch (error: any) {
      if (error.message === 'Project not found') {
        return reply.code(404).send({ error: 'Project not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get project' });
    }
  });

  // Create project
  app.post('/', async (request, reply) => {
    try {
      const data = createProjectSchema.parse(request.body) as CreateProjectData;
      const project = await createProject(data);
      return reply.code(201).send({ project });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid project data', details: error.errors });
      }
      if (error.message?.includes('already exists') || error.message?.includes('not found')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to create project' });
    }
  });

  // Update project
  app.put('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = updateProjectSchema.parse(request.body);
      const project = await updateProject(id, data);
      return { project };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid project data', details: error.errors });
      }
      if (error.message === 'Project not found') {
        return reply.code(404).send({ error: 'Project not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update project' });
    }
  });

  // Delete (soft delete) project
  app.delete('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      await deleteProject(id);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Project not found') {
        return reply.code(404).send({ error: 'Project not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete project' });
    }
  });

  // Restore soft-deleted project
  app.post('/:id/restore', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      await restoreProject(id);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Deleted project not found') {
        return reply.code(404).send({ error: 'Deleted project not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to restore project' });
    }
  });

  // ========== PHASE ROUTES ==========

  // Get project phases
  app.get('/:id/phases', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const phases = await getProjectPhases(id);
      return { phases };
    } catch (error: any) {
      if (error.message === 'Project not found') {
        return reply.code(404).send({ error: 'Project not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get phases' });
    }
  });

  // Create phase
  app.post('/:id/phases', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = createPhaseSchema.parse(request.body) as CreatePhaseData;
      const phase = await createPhase(id, data);
      return reply.code(201).send({ phase });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid phase data', details: error.errors });
      }
      if (error.message === 'Project not found') {
        return reply.code(404).send({ error: 'Project not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to create phase' });
    }
  });

  // Update phase
  app.put('/:id/phases/:phaseId', async (request, reply) => {
    try {
      const { phaseId } = phaseIdParamSchema.parse(request.params);
      const data = createPhaseSchema.partial().parse(request.body);
      const phase = await updatePhase(phaseId, data);
      return { phase };
    } catch (error: any) {
      if (error.message === 'Phase not found') {
        return reply.code(404).send({ error: 'Phase not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update phase' });
    }
  });

  // Delete phase
  app.delete('/:id/phases/:phaseId', async (request, reply) => {
    try {
      const { phaseId } = phaseIdParamSchema.parse(request.params);
      await deletePhase(phaseId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Phase not found') {
        return reply.code(404).send({ error: 'Phase not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete phase' });
    }
  });

  // ========== MILESTONE ROUTES ==========

  // Get project milestones
  app.get('/:id/milestones', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const milestones = await getProjectMilestones(id);
      return { milestones };
    } catch (error: any) {
      if (error.message === 'Project not found') {
        return reply.code(404).send({ error: 'Project not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get milestones' });
    }
  });

  // Create milestone
  app.post('/:id/milestones', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = createMilestoneSchema.parse(request.body) as CreateMilestoneData;
      const milestone = await createMilestone(id, data);
      return reply.code(201).send({ milestone });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid milestone data', details: error.errors });
      }
      if (error.message?.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to create milestone' });
    }
  });

  // Update milestone
  app.put('/:id/milestones/:milestoneId', async (request, reply) => {
    try {
      const { milestoneId } = milestoneIdParamSchema.parse(request.params);
      const data = updateMilestoneSchema.parse(request.body);
      const milestone = await updateMilestone(milestoneId, data);
      return { milestone };
    } catch (error: any) {
      if (error.message === 'Milestone not found') {
        return reply.code(404).send({ error: 'Milestone not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update milestone' });
    }
  });

  // Delete milestone
  app.delete('/:id/milestones/:milestoneId', async (request, reply) => {
    try {
      const { milestoneId } = milestoneIdParamSchema.parse(request.params);
      await deleteMilestone(milestoneId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Milestone not found') {
        return reply.code(404).send({ error: 'Milestone not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete milestone' });
    }
  });

  // ========== TASK ROUTES ==========

  // Get project tasks
  app.get('/:id/tasks', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const query = listTasksQuerySchema.parse(request.query);
      const result = await getProjectTasks(id, query);
      // Frontend expects Task[] array directly
      return result.tasks;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      if (error.message === 'Project not found') {
        return reply.code(404).send({ error: 'Project not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get tasks' });
    }
  });

  // Get task by ID
  app.get('/:id/tasks/:taskId', async (request, reply) => {
    try {
      const { taskId } = taskIdParamSchema.parse(request.params);
      const task = await getTaskById(taskId);
      return { task };
    } catch (error: any) {
      if (error.message === 'Task not found') {
        return reply.code(404).send({ error: 'Task not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get task' });
    }
  });

  // Create task
  app.post('/:id/tasks', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = createTaskSchema.parse(request.body) as CreateTaskData;
      const task = await createTask(id, data);
      return reply.code(201).send({ task });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid task data', details: error.errors });
      }
      if (error.message?.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to create task' });
    }
  });

  // Update task
  app.put('/:id/tasks/:taskId', async (request, reply) => {
    try {
      const { taskId } = taskIdParamSchema.parse(request.params);
      const data = updateTaskSchema.parse(request.body);
      const task = await updateTask(taskId, data);
      return { task };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid task data', details: error.errors });
      }
      if (error.message === 'Task not found') {
        return reply.code(404).send({ error: 'Task not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update task' });
    }
  });

  // Delete (soft delete) task
  app.delete('/:id/tasks/:taskId', async (request, reply) => {
    try {
      const { taskId } = taskIdParamSchema.parse(request.params);
      await deleteTask(taskId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Task not found') {
        return reply.code(404).send({ error: 'Task not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete task' });
    }
  });

  // Restore soft-deleted task
  app.post('/:id/tasks/:taskId/restore', async (request, reply) => {
    try {
      const { taskId } = taskIdParamSchema.parse(request.params);
      await restoreTask(taskId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Deleted task not found') {
        return reply.code(404).send({ error: 'Deleted task not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to restore task' });
    }
  });

  // Add task dependency
  app.post('/:id/tasks/:taskId/dependencies', async (request, reply) => {
    try {
      const { taskId } = taskIdParamSchema.parse(request.params);
      const { blockingTaskId, dependencyType } = addDependencySchema.parse(request.body);
      const dependency = await addTaskDependency(taskId, blockingTaskId, dependencyType);
      return reply.code(201).send({ dependency });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid dependency data', details: error.errors });
      }
      return reply.code(400).send({ error: error.message || 'Failed to add dependency' });
    }
  });

  // Remove task dependency
  app.delete('/:id/tasks/:taskId/dependencies/:dependencyId', async (request, reply) => {
    try {
      const params = z.object({
        id: z.string().uuid(),
        taskId: z.string().uuid(),
        dependencyId: z.string().uuid(),
      }).parse(request.params);
      await removeTaskDependency(params.dependencyId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Dependency not found') {
        return reply.code(404).send({ error: 'Dependency not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to remove dependency' });
    }
  });

  // Assign user to task
  app.post('/:id/tasks/:taskId/assignments', async (request, reply) => {
    try {
      const { taskId } = taskIdParamSchema.parse(request.params);
      const { userId, isPrimary, allocatedHours } = assignTaskSchema.parse(request.body);
      const assignment = await assignTask(taskId, userId, isPrimary, allocatedHours);
      return reply.code(201).send({ assignment });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid assignment data', details: error.errors });
      }
      if (error.message?.includes('already assigned')) {
        return reply.code(409).send({ error: error.message });
      }
      if (error.message?.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to assign task' });
    }
  });

  // Unassign user from task
  app.delete('/:id/tasks/:taskId/assignments/:userId', async (request, reply) => {
    try {
      const params = z.object({
        id: z.string().uuid(),
        taskId: z.string().uuid(),
        userId: z.string().uuid(),
      }).parse(request.params);
      await unassignTask(params.taskId, params.userId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Assignment not found') {
        return reply.code(404).send({ error: 'Assignment not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to unassign task' });
    }
  });

  // ========== TEAM ASSIGNMENT ROUTES ==========

  // Assign team to project
  app.post('/:id/teams', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const { teamId, allocatedHours, startDate, endDate } = assignTeamSchema.parse(request.body);
      const assignment = await assignTeamToProject(id, { teamId, allocatedHours, startDate, endDate });
      return reply.code(201).send({ assignment });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid data', details: error.errors });
      }
      if (error.message === 'Project not found' || error.message === 'Team not found') {
        return reply.code(404).send({ error: error.message });
      }
      if (error.message?.includes('already')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to assign team' });
    }
  });

  // Remove team from project
  app.delete('/:id/teams/:assignmentId', async (request, reply) => {
    try {
      const params = z.object({
        id: z.string().uuid(),
        assignmentId: z.string().uuid(),
      }).parse(request.params);
      await removeTeamFromProject(params.id, params.assignmentId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Project not found' || error.message === 'Assignment not found') {
        return reply.code(404).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to remove team' });
    }
  });

  // ========== PEOPLE ASSIGNMENT ROUTES ==========

  // Assign person to project
  app.post('/:id/people', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const { userId, role, allocatedHours, startDate, endDate } = assignPersonSchema.parse(request.body);
      const assignment = await assignPersonToProject(id, { userId, role, allocatedHours, startDate, endDate });
      return reply.code(201).send({ assignment });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid data', details: error.errors });
      }
      if (error.message === 'Project not found' || error.message === 'User not found') {
        return reply.code(404).send({ error: error.message });
      }
      if (error.message?.includes('already')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to assign person' });
    }
  });

  // Remove person from project
  app.delete('/:id/people/:userId', async (request, reply) => {
    try {
      const params = z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
      }).parse(request.params);
      await removePersonFromProject(params.id, params.userId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Project not found' || error.message?.includes('not assigned')) {
        return reply.code(404).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to remove person' });
    }
  });
}
