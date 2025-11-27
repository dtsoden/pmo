import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import { ClientStatus, Prisma } from '@prisma/client';

// Client select with relationships
const clientSelect = {
  id: true,
  name: true,
  status: true,
  industry: true,
  website: true,
  salesforceAccountId: true,
  salesforceAccountName: true,
  salesforceOwnerId: true,
  primaryContactName: true,
  primaryContactEmail: true,
  primaryContactPhone: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  stateProvince: true,
  postalCode: true,
  country: true,
  description: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      projects: true,
      contacts: true,
      opportunities: true,
    },
  },
} satisfies Prisma.ClientSelect;

const clientDetailSelect = {
  ...clientSelect,
  projects: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      startDate: true,
      endDate: true,
    },
    orderBy: { startDate: 'desc' as const },
  },
  contacts: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      jobTitle: true,
      isPrimary: true,
      salesforceContactId: true,
    },
    orderBy: { isPrimary: 'desc' as const },
  },
  opportunities: {
    select: {
      id: true,
      name: true,
      value: true,
      stage: true,
      probability: true,
      expectedCloseDate: true,
      salesforceOpportunityId: true,
    },
    orderBy: { expectedCloseDate: 'asc' as const },
  },
} satisfies Prisma.ClientSelect;

export interface ListClientsParams {
  page?: number;
  limit?: number;
  status?: ClientStatus;
  search?: string;
  industry?: string;
}

export interface CreateClientData {
  name: string;
  status?: ClientStatus;
  industry?: string;
  website?: string;
  salesforceAccountId?: string;
  salesforceAccountName?: string;
  salesforceOwnerId?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  description?: string;
  notes?: string;
}

export interface UpdateClientData {
  name?: string;
  status?: ClientStatus;
  industry?: string;
  website?: string;
  salesforceAccountId?: string;
  salesforceAccountName?: string;
  salesforceOwnerId?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  description?: string;
  notes?: string;
}

export interface CreateContactData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  isPrimary?: boolean;
  salesforceContactId?: string;
  notes?: string;
}

export interface CreateOpportunityData {
  name: string;
  value?: number;
  stage?: string;
  probability?: number;
  expectedCloseDate?: Date;
  salesforceOpportunityId?: string;
  description?: string;
}

export async function listClients(params: ListClientsParams = {}) {
  const { page = 1, limit = 20, status, search, industry } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.ClientWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (industry) {
    where.industry = industry;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { salesforceAccountName: { contains: search, mode: 'insensitive' } },
      { primaryContactName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [clients, total] = await Promise.all([
    db.client.findMany({
      where,
      select: clientSelect,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    db.client.count({ where }),
  ]);

  return {
    clients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getClientById(id: string) {
  const client = await db.client.findUnique({
    where: { id },
    select: clientDetailSelect,
  });

  if (!client) {
    throw new Error('Client not found');
  }

  return client;
}

export async function createClient(data: CreateClientData) {
  // Check Salesforce ID uniqueness if provided
  if (data.salesforceAccountId) {
    const existing = await db.client.findUnique({
      where: { salesforceAccountId: data.salesforceAccountId },
    });
    if (existing) {
      throw new Error('Client with this Salesforce Account ID already exists');
    }
  }

  const client = await db.client.create({
    data: {
      name: data.name,
      status: data.status || ClientStatus.ACTIVE,
      industry: data.industry,
      website: data.website,
      salesforceAccountId: data.salesforceAccountId,
      salesforceAccountName: data.salesforceAccountName,
      salesforceOwnerId: data.salesforceOwnerId,
      primaryContactName: data.primaryContactName,
      primaryContactEmail: data.primaryContactEmail,
      primaryContactPhone: data.primaryContactPhone,
      description: data.description,
      notes: data.notes,
    },
    select: clientSelect,
  });

  logger.info(`Client created: ${client.name} (${client.id})`);

  return client;
}

export async function updateClient(id: string, data: UpdateClientData) {
  const existing = await db.client.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Client not found');
  }

  // Check Salesforce ID uniqueness if changing
  if (data.salesforceAccountId && data.salesforceAccountId !== existing.salesforceAccountId) {
    const taken = await db.client.findUnique({
      where: { salesforceAccountId: data.salesforceAccountId },
    });
    if (taken) {
      throw new Error('Salesforce Account ID already in use');
    }
  }

  const client = await db.client.update({
    where: { id },
    data,
    select: clientSelect,
  });

  logger.info(`Client updated: ${client.name} (${client.id})`);

  return client;
}

export async function deleteClient(id: string) {
  const client = await db.client.findUnique({
    where: { id },
    include: { _count: { select: { projects: true } } },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  if (client._count.projects > 0) {
    throw new Error('Cannot delete client with associated projects');
  }

  await db.client.delete({ where: { id } });

  logger.info(`Client deleted: ${client.name} (${client.id})`);

  return { success: true };
}

// Contact operations
export async function listContacts(clientId: string) {
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw new Error('Client not found');
  }

  return db.clientContact.findMany({
    where: { clientId },
    orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
  });
}

export async function addContact(clientId: string, data: CreateContactData) {
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw new Error('Client not found');
  }

  // If setting as primary, unset other primary contacts
  if (data.isPrimary) {
    await db.clientContact.updateMany({
      where: { clientId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const contact = await db.clientContact.create({
    data: {
      clientId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      jobTitle: data.jobTitle,
      isPrimary: data.isPrimary || false,
      salesforceContactId: data.salesforceContactId,
      notes: data.notes,
    },
  });

  logger.info(`Contact added to client ${clientId}: ${contact.firstName} ${contact.lastName}`);

  return contact;
}

export async function updateContact(contactId: string, data: Partial<CreateContactData>) {
  const contact = await db.clientContact.findUnique({ where: { id: contactId } });
  if (!contact) {
    throw new Error('Contact not found');
  }

  // If setting as primary, unset other primary contacts
  if (data.isPrimary) {
    await db.clientContact.updateMany({
      where: { clientId: contact.clientId, isPrimary: true, id: { not: contactId } },
      data: { isPrimary: false },
    });
  }

  return db.clientContact.update({
    where: { id: contactId },
    data,
  });
}

export async function deleteContact(contactId: string) {
  const contact = await db.clientContact.findUnique({ where: { id: contactId } });
  if (!contact) {
    throw new Error('Contact not found');
  }

  await db.clientContact.delete({ where: { id: contactId } });

  return { success: true };
}

// Opportunity operations
export async function listOpportunities(clientId: string) {
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw new Error('Client not found');
  }

  return db.clientOpportunity.findMany({
    where: { clientId },
    orderBy: { expectedCloseDate: 'asc' },
  });
}

export async function addOpportunity(clientId: string, data: CreateOpportunityData) {
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw new Error('Client not found');
  }

  const opportunity = await db.clientOpportunity.create({
    data: {
      clientId,
      name: data.name,
      value: data.value,
      stage: data.stage,
      probability: data.probability,
      expectedCloseDate: data.expectedCloseDate,
      salesforceOpportunityId: data.salesforceOpportunityId,
      description: data.description,
    },
  });

  logger.info(`Opportunity added to client ${clientId}: ${opportunity.name}`);

  return opportunity;
}

export async function updateOpportunity(opportunityId: string, data: Partial<CreateOpportunityData>) {
  const opportunity = await db.clientOpportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  return db.clientOpportunity.update({
    where: { id: opportunityId },
    data,
  });
}

export async function deleteOpportunity(opportunityId: string) {
  const opportunity = await db.clientOpportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  await db.clientOpportunity.delete({ where: { id: opportunityId } });

  return { success: true };
}

// Get industries from dropdown config
export async function getIndustries() {
  // Try to get from DropdownLists config table
  const config = await db.dropdownLists.findUnique({ where: { id: 'default' } });

  if (config?.industries) {
    try {
      return JSON.parse(config.industries);
    } catch {
      // Fall through to defaults
    }
  }

  // Return defaults if config not found
  return [
    'Technology',
    'Healthcare',
    'Finance',
    'Manufacturing',
    'Retail',
    'Education',
    'Government',
    'Non-profit',
    'Other',
  ];
}
