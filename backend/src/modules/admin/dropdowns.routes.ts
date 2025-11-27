import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getAllDropdowns,
  getDropdown,
  updateDropdown,
  addToDropdown,
  removeFromDropdown,
} from './dropdowns.service.js';

export default async function dropdownsRoutes(app: FastifyInstance) {
  // Get all dropdown lists
  app.get('/', async (request, reply) => {
    try {
      const dropdowns = await getAllDropdowns();
      return dropdowns;
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get dropdowns' });
    }
  });

  // Get a specific dropdown list
  app.get('/:name', async (request, reply) => {
    try {
      const { name } = request.params as { name: string };
      const values = await getDropdown(name);
      return { [name]: values };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message || 'Failed to get dropdown' });
    }
  });

  // Update a dropdown list (replace all values)
  app.put('/:name', async (request, reply) => {
    try {
      const { name } = request.params as { name: string };
      const schema = z.object({
        values: z.array(z.string()),
      });

      const { values } = schema.parse(request.body);
      const user = (request as any).user;
      const updated = await updateDropdown(name, values, user?.id);

      return { [name]: updated };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid request body', details: error.errors });
      }
      return reply.code(400).send({ error: error.message || 'Failed to update dropdown' });
    }
  });

  // Add an item to a dropdown list
  app.post('/:name/items', async (request, reply) => {
    try {
      const { name } = request.params as { name: string };
      const schema = z.object({
        value: z.string().min(1),
      });

      const { value } = schema.parse(request.body);
      const user = (request as any).user;
      const updated = await addToDropdown(name, value, user?.id);

      return { [name]: updated };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid request body', details: error.errors });
      }
      return reply.code(400).send({ error: error.message || 'Failed to add item' });
    }
  });

  // Remove an item from a dropdown list
  app.delete('/:name/items/:value', async (request, reply) => {
    try {
      const { name, value } = request.params as { name: string; value: string };
      const user = (request as any).user;
      const updated = await removeFromDropdown(name, decodeURIComponent(value), user?.id);

      return { [name]: updated };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message || 'Failed to remove item' });
    }
  });
}
