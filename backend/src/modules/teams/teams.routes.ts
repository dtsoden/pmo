import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TeamMemberRole, AssignmentStatus } from '@prisma/client';
import {
  listTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  getTeamMembers,
  assignTeamToProject,
  updateTeamProjectAssignment,
  removeTeamFromProject,
  getTeamProjectAssignments,
  getTeamCapacity,
} from './teams.service.js';

// Validation schemas
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  skills: z.array(z.string()).optional(),
  leadId: z.string().uuid().optional(),
});

const updateTeamSchema = createTeamSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(TeamMemberRole).optional(),
});

const updateMemberSchema = z.object({
  role: z.nativeEnum(TeamMemberRole),
});

const assignToProjectSchema = z.object({
  projectId: z.string().uuid(),
  allocatedHours: z.number().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

const updateAssignmentSchema = z.object({
  allocatedHours: z.number().positive().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
  status: z.nativeEnum(AssignmentStatus).optional(),
});

export async function teamRoutes(app: FastifyInstance) {
  // All team routes require authentication
  app.addHook('onRequest', app.authenticate);

  // ============================================
  // TEAM CRUD
  // ============================================

  /**
   * GET /api/teams
   * List all teams
   */
  app.get('/', async (request, reply) => {
    try {
      const query = paginationSchema.parse(request.query);
      const result = await listTeams(query);
      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list teams' });
    }
  });

  /**
   * GET /api/teams/:id
   * Get team by ID with members and project assignments
   */
  app.get('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const team = await getTeamById(id);
      return team;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid team ID' });
      }
      if (error.message === 'Team not found') {
        return reply.code(404).send({ error: 'Team not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get team' });
    }
  });

  /**
   * POST /api/teams
   * Create a new team
   */
  app.post('/', async (request, reply) => {
    try {
      const data = createTeamSchema.parse(request.body) as { name: string; description?: string; skills?: string[]; leadId?: string };
      const team = await createTeam(data);
      return reply.code(201).send(team);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid team data', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to create team' });
    }
  });

  /**
   * PUT /api/teams/:id
   * Update a team
   */
  app.put('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = updateTeamSchema.parse(request.body);
      const team = await updateTeam(id, data);
      return team;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid team data', details: error.errors });
      }
      if (error.code === 'P2025') {
        return reply.code(404).send({ error: 'Team not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update team' });
    }
  });

  /**
   * DELETE /api/teams/:id
   * Delete a team
   */
  app.delete('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      await deleteTeam(id);
      return reply.code(204).send();
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid team ID' });
      }
      if (error.code === 'P2025') {
        return reply.code(404).send({ error: 'Team not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete team' });
    }
  });

  // ============================================
  // TEAM MEMBERS
  // ============================================

  /**
   * GET /api/teams/:id/members
   * Get all members of a team
   */
  app.get('/:id/members', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const members = await getTeamMembers(id);
      return { members };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid team ID' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get team members' });
    }
  });

  /**
   * POST /api/teams/:id/members
   * Add a member to a team
   */
  app.post('/:id/members', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = addMemberSchema.parse(request.body);
      const member = await addTeamMember(id, data.userId, data.role);
      return reply.code(201).send(member);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid data', details: error.errors });
      }
      if (error.message === 'User is already a member of this team') {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to add team member' });
    }
  });

  /**
   * PUT /api/teams/:id/members/:userId
   * Update a team member's role
   */
  app.put('/:id/members/:userId', async (request, reply) => {
    try {
      const params = z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
      }).parse(request.params);
      const data = updateMemberSchema.parse(request.body);
      const member = await updateTeamMember(params.id, params.userId, data.role);
      return member;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid data', details: error.errors });
      }
      if (error.code === 'P2025') {
        return reply.code(404).send({ error: 'Team member not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update team member' });
    }
  });

  /**
   * DELETE /api/teams/:id/members/:userId
   * Remove a member from a team
   */
  app.delete('/:id/members/:userId', async (request, reply) => {
    try {
      const params = z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
      }).parse(request.params);
      await removeTeamMember(params.id, params.userId);
      return reply.code(204).send();
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid data' });
      }
      if (error.code === 'P2025') {
        return reply.code(404).send({ error: 'Team member not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to remove team member' });
    }
  });

  // ============================================
  // TEAM PROJECT ASSIGNMENTS
  // ============================================

  /**
   * GET /api/teams/:id/projects
   * Get all project assignments for a team
   */
  app.get('/:id/projects', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const assignments = await getTeamProjectAssignments(id);
      return { assignments };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid team ID' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get team projects' });
    }
  });

  /**
   * POST /api/teams/:id/projects
   * Assign team to a project
   */
  app.post('/:id/projects', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = assignToProjectSchema.parse(request.body) as { projectId: string; allocatedHours: number; startDate: Date; endDate?: Date };
      const assignment = await assignTeamToProject({
        teamId: id,
        ...data,
      });
      return reply.code(201).send(assignment);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid data', details: error.errors });
      }
      if (error.message === 'Team is already assigned to this project') {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to assign team to project' });
    }
  });

  /**
   * PUT /api/teams/:id/projects/:assignmentId
   * Update a team project assignment
   */
  app.put('/:id/projects/:assignmentId', async (request, reply) => {
    try {
      const params = z.object({
        id: z.string().uuid(),
        assignmentId: z.string().uuid(),
      }).parse(request.params);
      const data = updateAssignmentSchema.parse(request.body);
      const assignment = await updateTeamProjectAssignment(params.assignmentId, data);
      return assignment;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid data', details: error.errors });
      }
      if (error.code === 'P2025') {
        return reply.code(404).send({ error: 'Assignment not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update assignment' });
    }
  });

  /**
   * DELETE /api/teams/:id/projects/:assignmentId
   * Remove team from a project
   */
  app.delete('/:id/projects/:assignmentId', async (request, reply) => {
    try {
      const params = z.object({
        id: z.string().uuid(),
        assignmentId: z.string().uuid(),
      }).parse(request.params);
      await removeTeamFromProject(params.assignmentId);
      return reply.code(204).send();
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid data' });
      }
      if (error.code === 'P2025') {
        return reply.code(404).send({ error: 'Assignment not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to remove assignment' });
    }
  });

  // ============================================
  // TEAM CAPACITY
  // ============================================

  /**
   * GET /api/teams/:id/capacity
   * Get team capacity and utilization
   */
  app.get('/:id/capacity', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const capacity = await getTeamCapacity(id);
      return capacity;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid team ID' });
      }
      if (error.message === 'Team not found') {
        return reply.code(404).send({ error: 'Team not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get team capacity' });
    }
  });
}
