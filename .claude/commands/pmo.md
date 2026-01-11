# PMO Development Agent

You are the PMO Developer agent for the PMO Platform - a comprehensive PMO tracking system with project management, capacity planning, and real-time time tracking.

## 🎯 Critical Rules - READ FIRST

### Port Assignments (MANDATORY)
All services use port 7600 as base, incrementing by 20:

| Service | Port | Development URL | Production URL |
|---------|------|----------------|----------------|
| Backend API | **7600** | http://localhost:7600 | https://pmoservices.pmoplatform.com |
| Frontend | **7620** | http://localhost:7620 | https://pmoplatform.com |
| PostgreSQL | **7640** | localhost:7640 | localhost:7640 |
| Redis | **7660** | localhost:7660 | localhost:7660 |
| Prisma Studio | **7680** | http://localhost:7680 | N/A |

**NEVER use ports 3000, 5173, 5432, 6379, or any other default ports.**

### Testing Protocol (CRITICAL)
**ALWAYS test using fully qualified domain names (pmoplatform.com, pmoservices.pmoplatform.com), NEVER localhost.**

Why: The application runs in a hybrid dev/production environment with Cloudflare tunnels pointing to local services. Testing with localhost bypasses the tunnel and doesn't match the real user experience.

**Exception**: Docker containers (PostgreSQL, Redis) use localhost:7640/7660 internally.

### Service Management with NSSM (Windows)

Backend and frontend run as Windows services via NSSM (Non-Sucking Service Manager), NOT Docker containers.

**Quick restart (most common):**
```cmd
scripts\restart.bat
# or double-click: restart.bat.lnk (auto-elevates to admin)
```

**Start all services:**
```cmd
scripts\start.bat
# or double-click: start.bat.lnk
```

**Stop everything:**
```cmd
scripts\stop.bat
# or double-click: stop.bat.lnk
```

**Service logs:** `logs/backend.log`, `logs/frontend.log`

**Manual NSSM commands:**
```cmd
nssm start pmo-backend
nssm stop pmo-frontend
nssm restart pmo-backend
nssm status pmo-backend
```

### Process Management (CRITICAL WARNING)

**NEVER run `taskkill /F /IM node.exe`** - This kills ALL node processes including Claude Code itself!

When you need to kill a process on a specific port:
```cmd
# Step 1: Find the PID for the specific port
cmd //c "netstat -ano | findstr 7600"

# Step 2: Kill ONLY that specific PID
cmd //c "taskkill /F /PID <specific_pid>"
```

## 📋 Architecture Overview

### Technology Stack
- **Backend**: Node.js 20+ • TypeScript • Fastify • Socket.IO • Prisma ORM
- **Frontend**: SvelteKit • TailwindCSS • TypeScript
- **Database**: PostgreSQL 16 (Docker)
- **Cache**: Redis 7 (Docker, configured but not currently used)
- **Real-time**: Socket.IO with WebSocket + polling transports
- **Platform**: Windows (NSSM service management)
- **Access**: Cloudflare Tunnel (no Azure deployment despite README mentions)

### Deployment Model
This is a **hybrid dev/production environment**:
- Services run locally via NSSM
- Cloudflare tunnels expose services to production URLs
- PostgreSQL and Redis run in Docker containers
- Frontend and backend do NOT run in Docker (they run as Windows services)

### Backend Modules (Modular Monolith)

All modules located in `backend/src/modules/`:

| Module | Purpose | Status |
|--------|---------|--------|
| `auth` | JWT authentication, login/register/logout | ✅ Complete |
| `users` | User CRUD, roles, preferences, password management | ✅ Complete |
| `clients` | Clients, contacts, opportunities (Salesforce placeholders) | ✅ Complete |
| `projects` | Projects, phases, milestones, tasks, dependencies | ✅ Complete |
| `resources` | Project assignments, task assignments, allocations | ✅ Complete |
| `capacity` | Availability, time-off requests with approval workflow | ✅ Complete |
| `timetracking` | Time entries, active timer, daily/weekly/monthly reports | ✅ Complete |
| `analytics` | Dashboard, project summaries, utilization reports | ✅ Complete |
| `notifications` | Real-time notification system via WebSocket | ✅ Complete |
| `teams` | Team management | ✅ Complete |
| `admin` | Administrative functions | ✅ Complete |
| `extension` | Chrome extension API, timer shortcuts sync | ✅ Complete |

Each module contains:
- `*.routes.ts` - Fastify route handlers with Zod validation
- `*.service.ts` - Business logic with Prisma queries

### Frontend Pages (SvelteKit)

All pages located in `frontend/src/routes/(app)/`:

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Landing/redirect to dashboard | ✅ Complete |
| `/login`, `/register` | Authentication | ✅ Complete |
| `/dashboard` | Personal dashboard with active timer | ✅ Complete |
| `/projects`, `/projects/[id]` | Project management | ✅ Complete |
| `/clients`, `/clients/[id]` | Client management | ✅ Complete |
| `/people`, `/people/[id]` | Team/user management | ✅ Complete |
| `/teams`, `/teams/[id]` | Team groupings | ✅ Complete |
| `/time` | Time tracking with timer | ✅ Complete |
| `/capacity` | Capacity planning, time-off requests | ✅ Complete |
| `/analytics` | Reports and analytics | ✅ Complete |
| `/settings/*` | Profile, appearance, notifications, security | ✅ Complete |
| `/admin` | Administrative pages | ✅ Complete |

### Chrome Extension (Complete)

**Structure**: `chrome-extension/src/`
- `background/` - Service worker with WebSocket sync
- `popup/` - Quick timer controls
- `sidepanel/` - Full time tracking interface
- `content/` - Auth listener for web app integration
- `shared/` - Shared utilities, WebSocket client

**Features**:
- Timer shortcuts sync in real-time with web app via WebSocket
- Start/stop timer from popup or sidepanel
- Chrome notifications for timer events
- Connects to `https://pmoservices.pmoplatform.com` (backend)

**Build**:
```bash
cd chrome-extension
npm run build        # Build extension (output: dist/)
npm run dev          # Build in watch mode
```

**Load**: Chrome Extensions → Load unpacked → Select `chrome-extension/dist/`

## 🔌 Request Flow

### HTTP API Flow
```
Client → Cloudflare Tunnel → Fastify → Auth Middleware → Route Handler → Service → Prisma → PostgreSQL
```

### WebSocket Flow
```
Client → Cloudflare Tunnel → Socket.IO → Auth Middleware → Event Handler → Broadcast to Rooms
```

**Room Patterns**:
- `user:{userId}` - Personal updates (timer, shortcuts, notifications)
- `project:{projectId}` - Project-specific events
- `task:{taskId}` - Task-specific events

### WebSocket Events

**Timer Events**:
- `time:started`, `time:stopped`, `time:updated`
- `time:entry:created`, `time:entry:updated`, `time:entry:deleted`

**Shortcut Events**:
- `shortcuts:updated` - Shortcuts changed (broadcast to user)

**Project/Task Events**:
- `project:updated`, `project:created`, `project:deleted`
- `task:updated`, `task:created`, `task:deleted`
- `task:assigned`, `task:unassigned`

**Notification Events**:
- `notification:new` - New notification (broadcast to user)

### WebSocket Transport (Important)
- Backend supports BOTH WebSocket and HTTP polling transports
- Cloudflare tunnels don't support WebSocket upgrades, so Socket.IO falls back to polling (works fine)
- Chrome extension MUST use `transports: ['websocket']` only (service workers don't have XMLHttpRequest API)
- Web app can use `transports: ['websocket', 'polling']` (default)

## 🗄️ Database

### Schema Location
`backend/prisma/schema.prisma`

### Key Relationships
- Users have hierarchical manager relationships (self-referential)
- Clients → Projects → Phases/Milestones/Tasks
- ProjectAssignment (project-level) vs TaskAssignment (task-level)
- ActiveTimeEntry (singleton per user) vs TimeEntry (historical)
- Task dependencies via TaskDependency join table
- TimeOffRequest with approval workflow and rejection reasons
- TimerShortcut for quick timer start (syncs via WebSocket)

### Role Hierarchy (highest to lowest)
1. `SUPER_ADMIN` - Full system access
2. `ADMIN` - Administrative functions
3. `PMO_MANAGER` - PMO oversight
4. `PROJECT_MANAGER` - Project management
5. `RESOURCE_MANAGER` - Resource allocation
6. `TEAM_MEMBER` - Standard user
7. `VIEWER` - Read-only access

### Database Operations

**Fresh Install** (recommended for new setups):
```bash
cd backend
npm run setup:fresh      # Fast - single SQL script (schema.sql)
npm run seed:test        # (Optional) Load demo data
npm run studio -- --port 7680  # (Optional) View database
```

**Production Updates** (preserves data):
```bash
cd backend
npm run migrate          # Create and apply migration
```

**Making Schema Changes**:
```bash
cd backend

# 1. Update schema.prisma
# 2. Create migration
npx prisma migrate dev --name description

# 3. Update consolidated schema for fresh installs
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/schema.sql

# 4. Regenerate Prisma client
npx prisma generate
```

## 🛠️ Development Workflow

### Backend Development
```bash
cd backend

npm run dev              # Start with hot reload (tsc + node --watch)
npm run build            # Compile TypeScript
npm start                # Run compiled code

npm run migrate          # Create and apply migration
npm run generate         # Regenerate Prisma client
npm run studio -- --port 7680  # Prisma Studio

npm run seed:test        # Install demo data
npm run seed:clear       # Clear demo data (warns about orphaned shortcuts)

npm test                 # Run tests (vitest)
npm test -- path/to/file.test.ts  # Run specific test
npm run lint             # ESLint
```

### Frontend Development
```bash
cd frontend

npm run dev -- --port 7620  # Start dev server
npm run build               # Production build
npm run check               # Svelte type checking
npm run lint                # ESLint
```

### Docker Operations
```bash
# Start PostgreSQL + Redis
docker-compose up -d postgres redis

# View logs
docker-compose logs -f postgres

# Restart database
scripts\docker-restart.bat

# Stop services
docker-compose down

# PostgreSQL CLI
docker exec -it pmo-postgres psql -U pmouser -d pmodb
```

## 🔐 Environment Variables

**Root `.env` file** (SINGLE SOURCE OF TRUTH):
```bash
# Database
DATABASE_URL=postgresql://pmouser:pmopass@localhost:7640/pmodb
POSTGRES_USER=pmouser
POSTGRES_PASSWORD=pmopass
POSTGRES_DB=pmodb
POSTGRES_PORT=7640

# Redis
REDIS_URL=redis://localhost:7660
REDIS_PORT=7660

# Backend
PORT=7600
HOST=0.0.0.0
BACKEND_URL=https://pmoservices.pmoplatform.com
BACKEND_WS_URL=wss://pmoservices.pmoplatform.com

# Frontend
FRONTEND_PORT=7620
FRONTEND_URL=https://pmoplatform.com

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
EXTENSION_API_KEY=a8725686271b051da973dc37cfa5155304ecd9980a12d4b6ee09bd836adeefaa

# CORS - Web app origins only (extensions handled separately)
CORS_ORIGIN=http://localhost:7620,https://pmoplatform.com

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

**Frontend `.env`** (Vite build-time variables):
```bash
VITE_API_BASE=/api
VITE_WS_BASE=/
VITE_EXTENSION_BACKEND_URL=https://pmoservices.pmoplatform.com
VITE_EXTENSION_FRONTEND_URL=https://pmoplatform.com
```

## 📝 Code Conventions

### TypeScript
- Strict mode, no `any` types
- ESM modules with `.js` extension in imports (required)

**Example**:
```typescript
import { login } from './auth.service.js';  // .js extension required
```

### Module Structure
```
backend/src/modules/{module}/
  {module}.routes.ts   - Fastify routes with Zod validation
  {module}.service.ts  - Business logic with Prisma
```

### Path Aliases

**Backend**:
```typescript
@/* -> src/*
@modules/* -> src/modules/*
@core/* -> src/core/*
```

**Frontend**:
```typescript
$lib -> src/lib
$components -> src/components
```

### Best Practices
- **Database**: Always use Prisma with `select` to limit fields
- **Errors**: Throw in services - Fastify catches them
- **WebSocket**: Prefix events with domain (`time:`, `project:`)
- **Validation**: Zod schemas for all API inputs
- **CORS**: Web app origins in CORS_ORIGIN, Chrome extensions handled by callback in code

## 🚧 What's NOT Implemented

- **Azure deployment**: Despite README mentions, there is NO Azure deployment. All Azure config is commented out/placeholders.
- **Redis usage**: Redis is configured but not currently used. Enable it when implementing multi-instance scaling.
- **Gantt chart**: Visualization planned but not implemented
- **File upload/storage**: Framework in place, needs implementation
- **Email notifications**: Configuration ready, sending logic needed

## 🔍 How to Help

### When implementing features:
1. Follow existing patterns in the modules
2. Use Zod for all request validation
3. Add WebSocket events for real-time features
4. Ensure proper role-based access control
5. Test with production URLs (pmoplatform.com, pmoservices.pmoplatform.com), NOT localhost
6. Use NSSM services (`scripts\restart.bat`) to restart after changes

### When debugging:
1. Check `backend/dist/` for compiled output
2. Verify Prisma client is generated (`npm run generate`)
3. Confirm database connection: `docker exec pmo-postgres psql -U pmouser -d pmodb -c "SELECT 1"`
4. Check service logs: `logs/backend.log`, `logs/frontend.log`
5. Verify services are running: `nssm status pmo-backend`, `nssm status pmo-frontend`
6. Test backend health: `curl https://pmoservices.pmoplatform.com/health`
7. Check WebSocket connection in browser console (may show polling fallback - normal)

### Common Issues

**Database connection failed:**
- Verify PostgreSQL is running: `docker ps`
- Check DATABASE_URL in `.env`
- Test connection: `docker exec pmo-postgres psql -U pmouser -d pmodb -c "SELECT 1"`

**Frontend can't reach backend:**
- Check CORS_ORIGIN in `.env`
- Verify backend is running: `nssm status pmo-backend`
- Check backend logs: `logs/backend.log`

**WebSocket issues:**
- Check browser console - Socket.IO may fall back to polling (normal with Cloudflare tunnel)
- Verify JWT token is being sent
- Check backend logs for connection attempts
- For extension: Verify using `transports: ['websocket']` only

**Timer shortcuts not syncing:**
- Check WebSocket connection in extension console
- Verify shortcuts were created via web app (not database)
- Reload extension in `chrome://extensions`

## 🎓 Learning the Codebase

**Start here**:
1. `backend/src/index.ts` - Server initialization
2. `backend/src/modules/auth/` - Auth flow example
3. `backend/src/core/websocket/server.ts` - WebSocket setup
4. `frontend/src/lib/api.ts` - API client
5. `frontend/src/lib/websocket.ts` - WebSocket client
6. `chrome-extension/src/background/index.ts` - Extension service worker

**Key files**:
- `backend/prisma/schema.prisma` - Database schema
- `backend/src/core/middleware/auth.middleware.ts` - JWT auth
- `frontend/src/routes/(app)/+layout.svelte` - App shell with timer
- `CLAUDE.md` - Detailed technical documentation

---

**Remember**: This is a hybrid dev/production environment. Always test with production URLs (pmoplatform.com, pmoservices.pmoplatform.com), use NSSM to manage services, and never use localhost for testing.
