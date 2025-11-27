# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## CRITICAL DIRECTIVES - READ FIRST

### Port Assignments (MANDATORY)
All services use port 7600 as the base, incrementing by 20:

| Service | Port | URL |
|---------|------|-----|
| Backend API | **7600** | http://localhost:7600 |
| Frontend | **7620** | http://localhost:7620 |
| PostgreSQL (Docker) | **7640** | localhost:7640 |
| Redis (Docker) | **7660** | localhost:7660 |
| Prisma Studio | **7680** | http://localhost:7680 |

**NEVER use ports 3000, 5173, 5432, 6379, or any other default ports.**

### Process Management (CRITICAL)

**NEVER run `taskkill /F /IM node.exe`** - This kills ALL node processes including Claude Code itself!

When you need to kill a process on a specific port:
```cmd
# Step 1: Find the PID for the specific port
cmd //c "netstat -ano | findstr 7600"

# Step 2: Kill ONLY that specific PID
cmd //c "taskkill /F /PID <specific_pid>"
```

### Service Management with NSSM (Windows)

Backend and frontend run as Windows services via NSSM (Non-Sucking Service Manager). This prevents accidental closure of floating command windows.

**One-time setup (RUN AS ADMINISTRATOR):**
```cmd
scripts\setup-nssm.bat
```

**Quick access (root folder shortcuts - run as admin automatically):**
- `restart.bat.lnk` - Restart backend + frontend (MOST COMMON)
- `start.bat.lnk` - Start all services + Docker
- `stop.bat.lnk` - Stop everything

**From command line:**
```cmd
scripts\restart.bat              # Restart backend + frontend (most common)
scripts\restart.bat --docker     # Restart everything including DB
scripts\start.bat                # Start all services + Docker
scripts\stop.bat                 # Stop everything
scripts\docker-restart.bat       # Restart only PostgreSQL + Redis
```

**Manual NSSM commands:**
```cmd
nssm start pmo-backend
nssm stop pmo-frontend
nssm restart pmo-backend
```

**Service logs:** `logs/backend.log`, `logs/frontend.log`

### Starting Services (Manual - without NSSM)
```cmd
# Backend (from project root)
cd backend && set PORT=7600 && npm run dev

# Frontend (from project root)
cd frontend && npm run dev -- --port 7620

# Docker (PostgreSQL + Redis)
docker-compose up -d postgres redis
```

---

## Project Overview

PMO Platform is a custom PMO tracking system with project management, capacity planning, and real-time time tracking. Built as a **modular monolith** with Node.js/TypeScript backend (Fastify + Socket.IO) and SvelteKit frontend, deployed to Azure Container Apps.

Key characteristics:
- Manual user management with 7-tier RBAC (no SSO)
- Salesforce integration via placeholder fields (not live API)
- Real-time updates via WebSockets for time tracking and notifications
- Multi-project resource allocation with capacity planning
- Task-based time tracking with Chrome extension support

---

## Development Commands

### Quick Start
```bash
npm install                          # Install all workspace dependencies
copy .env.example .env               # Windows
docker-compose up -d postgres redis  # Start database and cache

cd backend && npm run migrate        # Run Prisma migrations
cd backend && set PORT=7600 && npm run dev    # Start backend
cd frontend && npm run dev -- --port 7620     # Start frontend (separate terminal)
```

### Backend Commands
```bash
cd backend
npm run dev                    # Start with hot reload (tsc + node --watch)
npm run build                  # Compile TypeScript
npm start                      # Run compiled code
npm run migrate                # Create and apply migration
npm run migrate:deploy         # Deploy migrations (production)
npm run studio -- --port 7680  # Prisma Studio on port 7680
npm run generate               # Regenerate Prisma client
npm test                       # Run tests (vitest)
npm run lint                   # ESLint
```

### Frontend Commands
```bash
cd frontend
npm run dev -- --port 7620     # Start dev server
npm run build                  # Production build
npm run check                  # Svelte type checking
npm run lint                   # ESLint
```

### Run Single Test
```bash
cd backend
npm test -- path/to/file.test.ts     # Run specific test file
npm test -- -t "pattern"             # Run tests matching pattern
```

### Docker Operations
```bash
docker-compose up -d postgres redis  # Start DB and cache only
docker-compose up                    # Start all services
docker-compose down                  # Stop all services
docker-compose logs -f backend       # Follow backend logs
```

---

## Architecture

### Modular Monolith Pattern

Backend organized into self-contained modules under `backend/src/modules/`:

| Module | Purpose | Status |
|--------|---------|--------|
| auth | JWT authentication, login/register | Complete |
| users | User CRUD, roles, preferences, password | Complete |
| clients | Clients, contacts, opportunities (Salesforce placeholders) | Complete |
| projects | Projects, phases, milestones, tasks, dependencies | Complete |
| resources | Project assignments, allocations | Complete |
| capacity | Availability, time-off requests with approval workflow | Complete |
| timetracking | Time entries, active timer, daily/weekly/monthly reports | Complete |
| analytics | Dashboard, project summaries, utilization reports | Complete |
| notifications | Real-time notification system | Complete |

Each module contains:
- `*.routes.ts` - Fastify route handlers with Zod validation
- `*.service.ts` - Business logic with Prisma queries

### Request Flow
```
HTTP Request → Fastify → Auth Middleware → Route Handler → Service → Prisma → PostgreSQL
```

### WebSocket Flow
```
Client → Socket.IO → Auth Middleware → Event Handler → Broadcast to Rooms
```

WebSocket room patterns:
- `user:{userId}` - Personal updates (timer sync)
- `project:{projectId}` - Project-specific events
- `task:{taskId}` - Task-specific events

### TypeScript Path Aliases (backend)
```typescript
@/* -> src/*
@modules/* -> src/modules/*
@core/* -> src/core/*
```

### Frontend Path Aliases
```typescript
$lib -> src/lib
$components -> src/components
```

---

## Database Schema

**Prisma Schema**: `backend/prisma/schema.prisma`

Key relationships:
- Users have hierarchical manager relationships (self-referential)
- Clients → Projects → Phases/Milestones/Tasks
- ProjectAssignment (project-level) vs TaskAssignment (task-level)
- ActiveTimeEntry (singleton per user) vs TimeEntry (historical)
- Task dependencies via TaskDependency join table

**Role Hierarchy** (highest to lowest):
1. SUPER_ADMIN
2. ADMIN
3. PMO_MANAGER
4. PROJECT_MANAGER
5. RESOURCE_MANAGER
6. TEAM_MEMBER
7. VIEWER

---

## Current Implementation Status

### Backend API - COMPLETE
All modules have full CRUD operations with proper validation:
- Authentication with JWT
- User management with role-based access
- Client management with contacts and opportunities
- Project management with phases, milestones, tasks
- Task dependencies and assignments
- Time tracking with real-time timer
- Capacity planning with time-off approval workflow
- Analytics dashboards and reports

### Frontend UI - COMPLETE
Working pages with full functionality:
- `/` - Landing/redirect
- `/login`, `/register` - Authentication
- `/dashboard` - Personal dashboard with active timer
- `/projects`, `/projects/[id]` - Project management
- `/clients`, `/clients/[id]` - Client management
- `/team`, `/team/[id]` - Team/user management
- `/time` - Time tracking with timer
- `/capacity` - Capacity planning
- `/analytics` - Reports and analytics
- `/settings/*` - Profile, appearance, notifications, security

### Needs Implementation
- Chrome extension functionality (structure exists, logic needed)
- Gantt chart visualization
- File upload/storage
- Email notifications

### Future: Redis Integration
Redis (port 7660) is configured but not currently used. Enable it when implementing Chrome extension timers:

**Why Redis is needed:**
- Sync timer state across multiple clients (extension + web app)
- Socket.IO adapter for scaling across backend instances
- Fast active timer lookups without PostgreSQL hits
- Rate limiting for extension API calls

**To enable:**
```typescript
// backend/src/core/websocket/server.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

**Start Redis:**
```bash
docker-compose up -d redis
```

---

## Environment Variables

Required in `.env`:
```
DATABASE_URL=postgresql://user:pass@localhost:7640/pmodb
JWT_SECRET=minimum-32-character-secret-here
CORS_ORIGIN=http://localhost:7620
PORT=7600
```

---

## Important Conventions

**Module Imports**: Use `.js` extension in TypeScript imports (ESM requirement)
```typescript
import { login } from './auth.service.js';
```

**Database Queries**: Always use Prisma with `select` to limit fields

**Error Handling**: Throw errors in services - Fastify catches them

**WebSocket Events**: Prefix with domain (`time:start`, `project:updated`)

**TypeScript**: Strict mode, no `any` types

---

## SvelteKit Props (CRITICAL - DO NOT REMOVE)

All `+layout.svelte` and `+page.svelte` files MUST declare SvelteKit's internal props to avoid console warnings. This is a known SvelteKit issue documented in [GitHub Issue #5980](https://github.com/sveltejs/kit/issues/5980).

**Required exports in every layout and page:**
```svelte
<script lang="ts">
  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  // ... rest of component
</script>
```

**Why this is needed:**
- SvelteKit internally passes `data`, `form`, and `params` as props to page/layout components
- If these props are not declared with `export let`, Svelte shows warnings: `<Page> was created with unknown prop 'params'`
- These are dev-only warnings but clutter the console and mask real issues

**DO NOT:**
- Remove these exports thinking they're unused
- Set values to `undefined` (use `null` or `{}` instead)
- Try to "fix" these warnings by other means - they are the official workaround
