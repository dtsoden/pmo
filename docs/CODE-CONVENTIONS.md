![PMO Platform Logo](https://raw.githubusercontent.com/dtsoden/pmo/main/frontend/static/ReverseLogo.png)

# Code Conventions

**[← Back to README](../README.md)** | **[Environment Config](ENV-CONFIGURATION.md)** | **[Windows Deployment](DEPLOY-WINDOWS.md)** | **[Linux Deployment](DEPLOY-LINUX.md)** | **[Cloud Deployment](DEPLOY-CLOUD.md)**

---

This document outlines the coding standards and conventions used throughout the PMO Platform codebase.

---

## Table of Contents

1. [General Principles](#general-principles)
2. [TypeScript Conventions](#typescript-conventions)
3. [Backend Conventions](#backend-conventions)
4. [Frontend Conventions](#frontend-conventions)
5. [Database Conventions](#database-conventions)
6. [Testing Conventions](#testing-conventions)
7. [Git Commit Messages](#git-commit-messages)

---

## General Principles

### Code Style

- **TypeScript Strict Mode**: Always enabled, no `any` types allowed
- **ESLint**: Follow configured ESLint rules
- **Prettier**: Code formatting (not currently configured, but follow existing style)
- **Line Length**: Aim for 100-120 characters maximum
- **Indentation**: 2 spaces (no tabs)

### Documentation

- **Comments**: Write comments for complex logic, not obvious code
- **JSDoc**: Use for public APIs and exported functions
- **README**: Update documentation when adding features
- **TODO Comments**: Use `// TODO: description` for future improvements

### Security

- **No Secrets**: Never commit API keys, passwords, or secrets
- **Input Validation**: Always validate user input with Zod schemas
- **SQL Injection**: Use Prisma parameterized queries (never raw SQL with user input)
- **XSS Prevention**: Sanitize all user-generated content
- **CSRF**: Backend validates requests, frontend includes credentials

---

## TypeScript Conventions

### Import Statements

**Backend - Use `.js` extensions** (ESM requirement):
```typescript
// Correct
import { login } from './auth.service.js';
import { verifyToken } from '../middleware/auth.js';

// Incorrect
import { login } from './auth.service';
```

**Frontend - No `.js` extensions** (Vite handles this):
```typescript
// Correct
import { Button } from '$components/shared';
import { authStore } from '$lib/stores/auth';
```

### Path Aliases

**Backend (`tsconfig.json`):**
```typescript
import { logger } from '@/core/logger.js';
import { authService } from '@modules/auth/auth.service.js';
```

**Frontend (`svelte.config.js`):**
```typescript
import { Card } from '$components/shared';
import { api } from '$lib/api';
```

### Type Definitions

**Prefer `interface` over `type` for objects:**
```typescript
// Correct
interface User {
  id: string;
  email: string;
  role: UserRole;
}

// Use type for unions/primitives
type UserRole = 'ADMIN' | 'USER' | 'VIEWER';
```

**No `any` types:**
```typescript
// Incorrect
function process(data: any) { }

// Correct
function process(data: unknown) {
  // Type guard before using
  if (typeof data === 'object' && data !== null) {
    // ...
  }
}
```

---

## Backend Conventions

### Module Structure

Each module follows this structure:
```
backend/src/modules/
  ├── auth/
  │   ├── auth.routes.ts    # Fastify route handlers
  │   ├── auth.service.ts   # Business logic
  │   └── auth.schemas.ts   # Zod validation schemas
  ├── users/
  │   ├── users.routes.ts
  │   ├── users.service.ts
  │   └── users.schemas.ts
  └── ...
```

### Route Handlers

**Always use Zod validation:**
```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

app.post('/login', async (request, reply) => {
  // Validate input
  const body = loginSchema.parse(request.body);

  // Call service
  const result = await authService.login(body.email, body.password);

  // Return response
  return reply.send(result);
});
```

**Use consistent HTTP status codes:**
- `200` - Success (GET, PUT)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but no permission)
- `404` - Not Found
- `500` - Internal Server Error

### Service Layer

**Throw errors, let Fastify handle them:**
```typescript
// Correct
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

// Fastify catches errors and returns appropriate response
```

**Always use Prisma `select` to limit fields:**
```typescript
// Avoid fetching passwordHash
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    // Never select passwordHash unless needed for auth
  },
});
```

### WebSocket Events

**Use domain prefixes:**
```typescript
// Correct
socket.emit('time:start', data);
socket.emit('project:updated', data);
socket.emit('notification:new', data);

// Incorrect
socket.emit('startTime', data);
socket.emit('update', data);
```

**Join rooms for scoped broadcasts:**
```typescript
// Join user-specific room
socket.join(`user:${userId}`);

// Broadcast to specific user
io.to(`user:${userId}`).emit('time:synced', timerData);

// Broadcast to project members
io.to(`project:${projectId}`).emit('project:updated', projectData);
```

---

## Frontend Conventions

### Component Structure

**SvelteKit file naming:**
```
frontend/src/routes/
  ├── (app)/              # Authenticated layout group
  │   ├── dashboard/
  │   │   └── +page.svelte
  │   ├── projects/
  │   │   ├── +page.svelte
  │   │   └── [id]/
  │   │       └── +page.svelte
  │   └── +layout.svelte
  ├── login/
  │   └── +page.svelte
  └── +layout.svelte
```

**Component organization:**
```
frontend/src/components/
  ├── shared/           # Reusable UI components
  │   ├── Button.svelte
  │   ├── Card.svelte
  │   └── Input.svelte
  └── domain/           # Domain-specific components
      ├── ProjectCard.svelte
      └── TaskList.svelte
```

### SvelteKit Props (CRITICAL)

**All `+page.svelte` and `+layout.svelte` files MUST declare SvelteKit props:**
```svelte
<script lang="ts">
  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  // Your component logic here
</script>
```

**Why?** SvelteKit internally passes these props. If not declared, you get warnings like:
```
<Page> was created with unknown prop 'params'
```

### API Calls

**Use centralized API client:**
```typescript
// lib/api/index.ts
import { authStore } from '$lib/stores/auth';

export async function apiCall(endpoint: string, options?: RequestInit) {
  const token = authStore.getToken();

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}
```

### State Management

**Use Svelte stores for global state:**
```typescript
// stores/auth.ts
import { writable } from 'svelte/store';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export const authStore = writable<AuthState>({
  user: null,
  token: null,
  isAuthenticated: false,
});
```

**Use component state for local UI:**
```svelte
<script lang="ts">
  let loading = false;
  let error = '';

  async function handleSubmit() {
    loading = true;
    error = '';

    try {
      await api.submitForm(data);
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>
```

---

## Database Conventions

### Schema Design

**Use PascalCase for models:**
```prisma
model User {
  id String @id @default(uuid())
  email String @unique
  createdAt DateTime @default(now())
}
```

**Use camelCase for fields:**
```prisma
model Project {
  id String @id
  projectName String
  startDate DateTime
  isActive Boolean
}
```

**Always include audit fields:**
```prisma
model Task {
  id String @id @default(uuid())

  // ... other fields

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String?
  updatedBy String?
}
```

### Migrations

**Prefer `setup:fresh` for new databases:**
```bash
cd backend
npm run setup:fresh  # Uses schema.sql (fast)
```

**Use migrations for existing databases:**
```bash
cd backend
npm run migrate      # Creates and applies migration
```

**Migration naming:**
```
prisma/migrations/
  ├── 20250101120000_init/
  ├── 20250115140000_add_project_status/
  └── 20250120100000_create_notifications/
```

### Queries

**Always use `select` to limit fields:**
```typescript
// Avoid
const users = await prisma.user.findMany();  // Returns ALL fields including passwordHash!

// Correct
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
  },
});
```

**Use transactions for multi-step operations:**
```typescript
await prisma.$transaction(async (tx) => {
  // Create project
  const project = await tx.project.create({ data: projectData });

  // Assign team members
  await tx.projectAssignment.createMany({
    data: teamMembers.map(userId => ({
      projectId: project.id,
      userId,
    })),
  });
});
```

---

## Testing Conventions

### Test File Naming

```
backend/src/modules/auth/
  ├── auth.routes.ts
  ├── auth.service.ts
  └── auth.test.ts         # Tests for auth module
```

### Test Structure

**Use descriptive test names:**
```typescript
import { describe, it, expect } from 'vitest';

describe('Auth Service', () => {
  describe('login', () => {
    it('should return user and token for valid credentials', async () => {
      const result = await authService.login('user@example.com', 'password123');

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should throw error for invalid password', async () => {
      await expect(
        authService.login('user@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### Running Tests

```bash
# All tests
cd backend && npm test

# Specific file
cd backend && npm test -- auth.test.ts

# Watch mode
cd backend && npm test -- --watch

# Coverage
cd backend && npm test -- --coverage
```

---

## Git Commit Messages

### Format

```
<type>: <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature change)
- `perf`: Performance improvements
- `test`: Add or update tests
- `chore`: Build process, dependencies, tooling

### Examples

```
feat: Add capacity planning module with time-off approval workflow

- Create CapacityPlanning model with Prisma schema
- Add API routes for availability and time-off requests
- Implement approval workflow for managers
- Add frontend pages for capacity calendar

Closes #123
```

```
fix: Resolve WebSocket connection issues in Chrome extension

- Force WebSocket-only transport (service workers don't have XHR)
- Attach Socket.IO instance to Fastify app for event emission
- Update CORS to allow chrome-extension:// origins

This fixes the "xhr poll error" that prevented extension timers from syncing.
```

### Best Practices

- **Use imperative mood**: "Add feature" not "Added feature"
- **First line < 72 chars**: Keep subject concise
- **Explain why, not what**: Code shows what changed, commit explains why
- **Reference issues**: Include "Closes #123" or "Fixes #456"
- **Break up large changes**: Multiple focused commits > one giant commit

---

## Security Best Practices

### Authentication

- Store JWT tokens in `localStorage` (frontend)
- Include `Authorization: Bearer <token>` header
- Validate tokens on every protected route
- Use strong JWT secrets (64+ characters)

### Password Handling

```typescript
// Correct - use bcrypt
import bcrypt from 'bcrypt';

const passwordHash = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, passwordHash);

// Never log or expose passwords
// Never store passwords in plain text
```

### Input Validation

```typescript
// Always validate with Zod
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

// Sanitize user input before displaying
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### CORS Configuration

```typescript
// Never use wildcards in production
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:7620';

// Whitelist specific origins
const allowedOrigins = CORS_ORIGIN.split(',');
```

---

## Performance Best Practices

### Database

- Use indexes on frequently queried fields
- Limit result sets with `take` and `skip`
- Use `select` to fetch only needed fields
- Batch operations with `createMany` / `updateMany`

### API

- Implement pagination for large datasets
- Cache frequently accessed data (Redis)
- Use WebSocket for real-time updates (not polling)
- Compress responses with gzip

### Frontend

- Lazy load routes and components
- Debounce search inputs
- Use virtual scrolling for long lists
- Optimize images (WebP, lazy loading)

---

## Related Documentation

- **[← Back to README](../README.md)** - Main documentation hub
- **[Environment Configuration](ENV-CONFIGURATION.md)** - Complete `.env` configuration guide
- **[Windows Deployment](DEPLOY-WINDOWS.md)** - Deploy on Windows Server or desktop
- **[Linux Deployment](DEPLOY-LINUX.md)** - Deploy on Ubuntu, Debian, CentOS, RHEL
- **[Cloud Deployment](DEPLOY-CLOUD.md)** - AWS, Azure, Vultr, DigitalOcean, Hostinger

**Need help?** Open an issue on GitHub or check the main README.
