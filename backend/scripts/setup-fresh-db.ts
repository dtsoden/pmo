/**
 * Fresh Database Setup Script
 *
 * Creates the entire database schema in one shot using the consolidated schema.sql
 * This is MUCH faster than running 11 migrations sequentially.
 *
 * Use this for:
 * - Fresh installations
 * - Development environment setup
 * - CI/CD pipelines
 *
 * For existing databases with data, use: npm run migrate
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const prisma = new PrismaClient();

async function setupFreshDatabase() {
  console.log('Setting up fresh database with consolidated schema...\n');

  try {
    // Read the consolidated schema SQL
    const schemaSQL = readFileSync(join(__dirname, '..', 'prisma', 'schema.sql'), 'utf-8');

    console.log('Executing schema.sql...');

    // Execute the entire schema in one transaction
    await prisma.$executeRawUnsafe(schemaSQL);

    console.log('✓ Database schema created successfully!\n');

    // Mark all migrations as applied (so Prisma doesn't try to re-run them)
    console.log('Marking migrations as applied...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT PRIMARY KEY,
        "checksum" TEXT NOT NULL,
        "finished_at" TIMESTAMP,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMP,
        "started_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )
    `;

    // Get all migration names from the migrations folder
    const { readdirSync } = await import('fs');
    const migrationsDir = join(__dirname, '..', 'prisma', 'migrations');
    const migrationFolders = readdirSync(migrationsDir).filter(f => f.match(/^\d{14}_/));

    // Insert migration records so Prisma thinks they're already applied
    for (const folder of migrationFolders) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
        VALUES (
          gen_random_uuid()::text,
          '',
          '${folder}',
          NOW(),
          NOW(),
          1
        )
        ON CONFLICT DO NOTHING
      `);
    }

    console.log(`✓ Marked ${migrationFolders.length} migrations as applied\n`);

    // Create default admin user
    console.log('Creating default admin user...');
    const defaultPassword = 'Admin123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.create({
      data: {
        email: 'admin@pmoplatform.com',
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        timezone: 'America/New_York',
      },
    });

    console.log('✓ Default admin user created\n');

    console.log('========================================');
    console.log('FRESH DATABASE SETUP COMPLETE!');
    console.log('========================================');
    console.log('Database is ready to use.\n');
    console.log('DEFAULT LOGIN CREDENTIALS:');
    console.log('  Email:    admin@pmoplatform.com');
    console.log('  Password: Admin123!');
    console.log('  Role:     SUPER_ADMIN\n');
    console.log('IMPORTANT: Change the default password after first login!\n');
    console.log('Next steps:');
    console.log('  1. Run: npm run dev (start the application)');
    console.log('  2. Login with credentials above');
    console.log('  3. OPTIONAL: Run "npm run seed:test" for demo data (50 test users)');
    console.log('========================================\n');

  } catch (error) {
    console.error('Failed to setup database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupFreshDatabase();
