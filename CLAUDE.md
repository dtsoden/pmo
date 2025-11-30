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
1. SUPER_ADMIN - Full system access
2. ADMIN - System administration
3. PMO_MANAGER - PMO oversight, analytics
4. PROJECT_MANAGER - Project management, client access
5. RESOURCE_MANAGER - Resource allocation, capacity planning
6. TEAM_MEMBER - Standard user, time tracking
7. VIEWER - Read-only access

**For complete role permissions and access control, see [docs/PERMISSIONS.md](docs/PERMISSIONS.md)**

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

## Chrome Extension Socket.IO Connectivity (CRITICAL)

### 🚨 TL;DR - READ THIS FIRST 🚨

**If you see `xhr poll error` in the extension console:**
1. The extension is using `transports: ['polling', 'websocket']` - WRONG!
2. Change to `transports: ['websocket']` - service workers don't have XHR API
3. Rebuild extension: `cd chrome-extension && npm run build`
4. Reload extension in Chrome
5. It will work

**This cost 3+ hours of debugging. Don't make the same mistake.**

---

### ⚠️ THE MOST IMPORTANT THING TO REMEMBER ⚠️

**Chrome extension service workers DO NOT have XMLHttpRequest (XHR) API!**

Socket.IO's default configuration tries to use HTTP polling (which uses XHR) before upgrading to WebSocket. This will ALWAYS fail in service workers with the error:

```
❌ WebSocket CONNECTION ERROR: xhr poll error
```

**THE FIX:** Force Socket.IO to use WebSocket-only transport in the extension:

```typescript
// chrome-extension/src/shared/websocket.ts
this.socket = io(this.url, {
  auth: { token },
  transports: ['websocket'],  // CRITICAL: WebSocket only, no polling!
  withCredentials: true,
});
```

**DO NOT use `['polling', 'websocket']` in Chrome extensions - it will fail!**

---

### THE SECOND PROBLEM: Socket.IO Not Attached to Fastify App

**If WebSocket connects but events don't sync:**

Routes try to emit events with `app.io.to(...).emit(...)` but `app.io` is undefined!

**THE FIX:** Attach Socket.IO instance to Fastify app in `backend/src/index.ts`:

```typescript
// After creating Socket.IO server
const io = new Server(httpServer, { /* config */ });
await setupWebSocket(io);

// Create Fastify app
const app = Fastify({ /* config */ });

// CRITICAL: Attach Socket.IO to Fastify app
(app as any).io = io;

// Now routes can use: app.io.to(...).emit(...)
```

**Without this:** Extension connects, but shortcuts/timer events never sync because `app.io` is undefined.

---

### THE THIRD PROBLEM: CORS

Chrome extensions CANNOT connect to Socket.IO if CORS is not properly configured to allow `chrome-extension://` origins.

**Symptoms:**
- Extension console shows connection errors
- Backend logs show NO Socket.IO connection attempts
- Regular API calls work fine (e.g., `/api/extension/shortcuts`)
- Testing with `curl` works, but extension fails

**Root Cause:**
Chrome extensions make requests with `Origin: chrome-extension://<extension-id>` header. If Socket.IO CORS doesn't explicitly allow this origin, the browser blocks the request BEFORE it reaches the server. This is why backend logs show nothing - the request never arrives.

### THE SOLUTION

Socket.IO CORS configuration in `backend/src/index.ts` MUST use a callback function that allows Chrome extension origins:

```typescript
// CORS origin checker - allows configured origins + Chrome extensions
const corsOriginChecker = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // No origin (like curl) - allow
  if (!origin) {
    callback(null, true);
    return;
  }
  // Allow configured origins
  if (corsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  // Allow Chrome extensions
  if (origin.startsWith('chrome-extension://')) {
    callback(null, true);
    return;
  }
  logger.warn(`CORS blocked origin: ${origin}`);
  callback(new Error('Not allowed by CORS'));
};

// Create Socket.IO server with CORS callback
const io = new Server(httpServer, {
  cors: {
    origin: corsOriginChecker,
    credentials: true,
    methods: ['GET', 'POST'],  // REQUIRED for polling
  },
  transports: ['websocket', 'polling'],
  upgradeTimeout: 30000,
  allowEIO3: true,
});
```

**CRITICAL:** The `methods: ['GET', 'POST']` is REQUIRED. Socket.IO polling uses POST requests which need explicit CORS permission.

### HOW TO TEST

1. **Test Socket.IO endpoint is reachable:**
   ```bash
   curl -i "https://pmoservices.cnxlab.us/socket.io/?EIO=4&transport=polling"
   ```
   Should return: `HTTP/1.1 200 OK` with session ID JSON

2. **Test with Chrome extension:**
   - Remove and reload extension from `chrome://extensions`
   - Open extension service worker console
   - Should see: `✅ WebSocket CONNECTED via transport: polling`

3. **Check backend logs:**
   ```bash
   powershell -Command "Get-Content C:\Users\DavidSoden\CNX-PMO\logs\backend.log | Select-String 'Socket.IO connection attempt' -Context 0,5"
   ```
   Should show connection attempts with origin `chrome-extension://...`

### DEBUGGING CHECKLIST

If extension shows `xhr poll error`:

1. ✅ **Verify backend is running:** Check `logs/backend.log` has recent entries
2. ✅ **Test Socket.IO endpoint:** Run curl command above - should get 200 OK
3. ✅ **Check CORS configuration:** Verify `corsOriginChecker` function exists in `backend/src/index.ts`
4. ✅ **Check extension is using correct URL:** Extension logs should show `https://pmoservices.cnxlab.us` (NOT `pmo.cnxlab.us`)
5. ✅ **Restart backend:** After any CORS changes, MUST restart backend
6. ✅ **Reload extension:** After backend restart, remove and reload extension
7. ✅ **Check for CORS warnings in backend logs:** Look for "CORS blocked origin" messages

### COMMON MISTAKES

**DON'T:**
- ❌ **CRITICAL:** Use `transports: ['polling', 'websocket']` in extension - service workers don't have XHR!
- ❌ Use simple string/array for Socket.IO CORS origin - it doesn't support wildcards properly
- ❌ Forget to include `methods: ['GET', 'POST']` in backend CORS config
- ❌ Forget to restart backend after CORS changes
- ❌ Test with web app - web app uses different origin, test with EXTENSION
- ❌ Add `chrome-extension://*` to CORS_ORIGIN env var - it won't work, must use callback
- ❌ Spend 3 hours debugging CORS when the real issue is XHR not existing in service workers

**DO:**
- ✅ **CRITICAL:** Use `transports: ['websocket']` ONLY in Chrome extensions
- ✅ Use callback function for dynamic origin checking
- ✅ Allow both configured origins AND `chrome-extension://` prefix
- ✅ Add comprehensive logging to see what origins are being blocked
- ✅ Test with actual extension, not just curl
- ✅ Check BOTH extension console AND backend logs
- ✅ Remember: Web app can use polling, extension CANNOT

### CLOUDFLARE TUNNEL NOTE

Cloudflare tunnel (`pmoservices.cnxlab.us`) works perfectly with Socket.IO:
- ✅ WebSocket connections work (wss://)
- ✅ HTTP polling works (for web app)
- ✅ The tunnel correctly routes `/socket.io/` requests

**If connection fails:**
- From extension → Check if using WebSocket-only transport
- From web app → Check CORS configuration
- NOT a tunnel issue - the tunnel works fine

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
