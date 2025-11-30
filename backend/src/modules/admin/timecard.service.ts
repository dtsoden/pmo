// Time Card API Service
// Handles API key management for external payroll integrations

import { db } from '../../core/database/client.js';
import crypto from 'crypto';

/**
 * Generate a secure random API key
 * Format: pmo_live_[40 random hex characters]
 */
function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(20); // 20 bytes = 40 hex characters
  return `pmo_live_${randomBytes.toString('hex')}`;
}

/**
 * Hash an API key using SHA-256
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Get the current API key (if exists)
 */
export async function getApiKey() {
  const apiKey = await db.apiKey.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      keyHash: true,
      description: true,
      isActive: true,
      createdBy: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });

  if (!apiKey) {
    throw new Error('No active API key found');
  }

  return apiKey;
}

/**
 * Create a new API key
 * Ensures only one active key exists at a time
 */
export async function createApiKey(userId: string, description?: string) {
  // Check if an active key already exists
  const existing = await db.apiKey.findFirst({
    where: { isActive: true },
  });

  if (existing) {
    throw new Error('An active API key already exists. Revoke it first or use regenerate.');
  }

  // Generate new key
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);

  // Store hashed key in database
  const keyData = await db.apiKey.create({
    data: {
      keyHash,
      description: description || 'Time Card API Key',
      isActive: true,
      createdBy: userId,
    },
    select: {
      id: true,
      keyHash: true,
      description: true,
      isActive: true,
      createdBy: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });

  // Return both the plain API key (only time it's visible) and the key data
  return {
    apiKey, // Plain text - only shown once
    keyData,
  };
}

/**
 * Regenerate the existing API key
 * Deletes old key and creates a new one
 */
export async function regenerateApiKey(userId: string) {
  // Delete existing active key
  await db.apiKey.deleteMany({
    where: { isActive: true },
  });

  // Create new key
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);

  const keyData = await db.apiKey.create({
    data: {
      keyHash,
      description: 'Time Card API Key',
      isActive: true,
      createdBy: userId,
    },
    select: {
      id: true,
      keyHash: true,
      description: true,
      isActive: true,
      createdBy: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });

  return {
    apiKey, // Plain text - only shown once
    keyData,
  };
}

/**
 * Revoke (delete) the current API key
 */
export async function revokeApiKey() {
  const deleted = await db.apiKey.deleteMany({
    where: { isActive: true },
  });

  if (deleted.count === 0) {
    throw new Error('No active API key to revoke');
  }

  return { success: true };
}

/**
 * Verify an API key and update lastUsedAt
 * Used by the time card export endpoint
 */
export async function verifyApiKey(apiKey: string): Promise<boolean> {
  const keyHash = hashApiKey(apiKey);

  const key = await db.apiKey.findFirst({
    where: {
      keyHash,
      isActive: true,
    },
  });

  if (!key) {
    return false;
  }

  // Update last used timestamp
  await db.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return true;
}
