import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ClientStatus } from '@prisma/client';
import {
  listClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  listContacts,
  addContact,
  updateContact,
  deleteContact,
  listOpportunities,
  addOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getIndustries,
  type CreateClientData,
  type CreateContactData,
  type CreateOpportunityData,
} from './clients.service.js';

// Validation schemas
const listClientsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(ClientStatus).optional(),
  search: z.string().optional(),
  industry: z.string().optional(),
});

const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  status: z.nativeEnum(ClientStatus).optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  salesforceAccountId: z.string().optional(),
  salesforceAccountName: z.string().optional(),
  salesforceOwnerId: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal('')),
  primaryContactPhone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const updateClientSchema = createClientSchema.partial();

const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  isPrimary: z.boolean().optional(),
  salesforceContactId: z.string().optional(),
  notes: z.string().optional(),
});

const createOpportunitySchema = z.object({
  name: z.string().min(1, 'Opportunity name is required'),
  value: z.number().positive().optional(),
  stage: z.string().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  salesforceOpportunityId: z.string().optional(),
  description: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const contactIdParamSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
});

const opportunityIdParamSchema = z.object({
  id: z.string().uuid(),
  opportunityId: z.string().uuid(),
});

export async function clientRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  // Get all clients
  app.get('/', async (request, reply) => {
    try {
      const query = listClientsQuerySchema.parse(request.query);
      const result = await listClients(query);
      // Transform to expected format: { data, total, totalPages, page, limit }
      return {
        data: result.clients,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        page: result.pagination.page,
        limit: result.pagination.limit,
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list clients' });
    }
  });

  // Get industries list (for filtering)
  app.get('/industries', async (request, reply) => {
    try {
      const industries = await getIndustries();
      return { industries };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get industries' });
    }
  });

  // Get client by ID
  app.get('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const client = await getClientById(id);
      return client;
    } catch (error: any) {
      if (error.message === 'Client not found') {
        return reply.code(404).send({ error: 'Client not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get client' });
    }
  });

  // Create client
  app.post('/', async (request, reply) => {
    try {
      const data = createClientSchema.parse(request.body) as CreateClientData;
      const client = await createClient(data);
      return reply.code(201).send(client);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid client data', details: error.errors });
      }
      if (error.message?.includes('already exists')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to create client' });
    }
  });

  // Update client
  app.put('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = updateClientSchema.parse(request.body);
      const client = await updateClient(id, data);
      return client;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid client data', details: error.errors });
      }
      if (error.message === 'Client not found') {
        return reply.code(404).send({ error: 'Client not found' });
      }
      if (error.message?.includes('already in use')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update client' });
    }
  });

  // Delete client
  app.delete('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      await deleteClient(id);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Client not found') {
        return reply.code(404).send({ error: 'Client not found' });
      }
      if (error.message?.includes('Cannot delete')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete client' });
    }
  });

  // === Contact routes ===

  // List contacts for a client
  app.get('/:id/contacts', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const contacts = await listContacts(id);
      return contacts;
    } catch (error: any) {
      if (error.message === 'Client not found') {
        return reply.code(404).send({ error: 'Client not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list contacts' });
    }
  });

  // Add contact to client
  app.post('/:id/contacts', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = createContactSchema.parse(request.body) as CreateContactData;
      const contact = await addContact(id, data);
      return reply.code(201).send({ contact });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid contact data', details: error.errors });
      }
      if (error.message === 'Client not found') {
        return reply.code(404).send({ error: 'Client not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to add contact' });
    }
  });

  // Update contact
  app.put('/:id/contacts/:contactId', async (request, reply) => {
    try {
      const { contactId } = contactIdParamSchema.parse(request.params);
      const data = createContactSchema.partial().parse(request.body);
      const contact = await updateContact(contactId, data);
      return { contact };
    } catch (error: any) {
      if (error.message === 'Contact not found') {
        return reply.code(404).send({ error: 'Contact not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update contact' });
    }
  });

  // Delete contact
  app.delete('/:id/contacts/:contactId', async (request, reply) => {
    try {
      const { contactId } = contactIdParamSchema.parse(request.params);
      await deleteContact(contactId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Contact not found') {
        return reply.code(404).send({ error: 'Contact not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete contact' });
    }
  });

  // === Opportunity routes ===

  // List opportunities for a client
  app.get('/:id/opportunities', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const opportunities = await listOpportunities(id);
      return opportunities;
    } catch (error: any) {
      if (error.message === 'Client not found') {
        return reply.code(404).send({ error: 'Client not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list opportunities' });
    }
  });

  // Add opportunity to client
  app.post('/:id/opportunities', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = createOpportunitySchema.parse(request.body) as CreateOpportunityData;
      const opportunity = await addOpportunity(id, data);
      return reply.code(201).send({ opportunity });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid opportunity data', details: error.errors });
      }
      if (error.message === 'Client not found') {
        return reply.code(404).send({ error: 'Client not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to add opportunity' });
    }
  });

  // Update opportunity
  app.put('/:id/opportunities/:opportunityId', async (request, reply) => {
    try {
      const { opportunityId } = opportunityIdParamSchema.parse(request.params);
      const data = createOpportunitySchema.partial().parse(request.body);
      const opportunity = await updateOpportunity(opportunityId, data);
      return { opportunity };
    } catch (error: any) {
      if (error.message === 'Opportunity not found') {
        return reply.code(404).send({ error: 'Opportunity not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update opportunity' });
    }
  });

  // Delete opportunity
  app.delete('/:id/opportunities/:opportunityId', async (request, reply) => {
    try {
      const { opportunityId } = opportunityIdParamSchema.parse(request.params);
      await deleteOpportunity(opportunityId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Opportunity not found') {
        return reply.code(404).send({ error: 'Opportunity not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete opportunity' });
    }
  });
}
