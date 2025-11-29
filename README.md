# PMO Platform

A comprehensive PMO tracking platform with project management, capacity planning, and real-time time tracking. Built as a modular monolith with Node.js/TypeScript backend and SvelteKit frontend, deployed to Azure Container Apps.

## 🎯 Features

### ✅ Fully Implemented

- **User Management**: 7-tier role-based access control (SUPER_ADMIN → VIEWER)
- **Client Management**: Full CRUD with contacts and Salesforce placeholder fields
- **Project Management**:
  - Multi-phase projects with milestones and tasks
  - Task dependencies and hierarchy
  - Project assignments and resource allocation
- **Capacity Planning**:
  - User availability tracking
  - Time-off request workflow with approval/rejection
  - Rejection reasons visible to employees
  - Prominent time-off alerts on people pages
- **Time Tracking**:
  - Task-based time entries with sessions
  - Real-time timer with WebSocket sync across all pages
  - Daily/weekly/monthly reports
  - Timer shortcuts for quick start
- **Analytics & Dashboards**:
  - Personal dashboard with active timer
  - Team utilization reports
  - Project summaries and capacity overviews
- **Real-time Updates**:
  - WebSocket-powered live sync for timers, notifications, and shortcuts
  - Instant updates across web app and Chrome extension

### 🚧 Needs Implementation

- **Chrome Extension**: Structure complete, timer sync working, but needs UI refinement
- **Gantt Chart**: Visualization planned but not implemented
- **File Upload/Storage**: Framework in place, needs implementation
- **Email Notifications**: Configuration ready, sending logic needed

### Technical Stack

- **Backend**: Node.js 20+ • TypeScript • Fastify • Socket.IO • Prisma ORM
- **Frontend**: SvelteKit • TailwindCSS • TypeScript
- **Database**: PostgreSQL 16+ (Docker)
- **Cache**: Redis (configured, not currently used)
- **Real-time**: Socket.IO with WebSocket transport
- **Platform**: Windows (NSSM service management)
- **Deployment**: Azure Container Apps with Cloudflare Tunnel

## 📋 Prerequisites

- **Windows 10/11** (NSSM service manager)
- **Node.js 20+** and npm 10+
- **PostgreSQL 16+** (via Docker)
- **Docker Desktop** (for PostgreSQL + Redis)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Navigate to the project directory
cd CNX-PMO

# Install all workspace dependencies
npm install
```

### 2. Environment Setup

```bash
# Windows
copy .env.example .env

# Edit .env with your configuration
# Required:
# - DATABASE_URL=postgresql://pmouser:pmopass@localhost:7640/pmodb
# - JWT_SECRET=<minimum-32-character-secret>
# - CORS_ORIGIN=http://localhost:7620
# - PORT=7600
```

**Domain Configuration** (for production deployment):

1. **Root `.env`**: Update backend and frontend URLs
   ```bash
   BACKEND_URL=https://api.yourdomain.com
   BACKEND_WS_URL=wss://api.yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   CORS_ORIGIN=http://localhost:7620,https://yourdomain.com
   ```

2. **Chrome Extension** (`chrome-extension/.env`): Update extension URLs
   ```bash
   VITE_EXTENSION_BACKEND_URL=https://api.yourdomain.com
   VITE_EXTENSION_FRONTEND_URL=https://yourdomain.com
   ```

3. **Rebuild frontend** after changing domain:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

4. **Restart services** to apply changes:
   ```bash
   scripts\restart.bat
   ```

> **Note**: Frontend uses build-time variables (VITE_*), so you must rebuild after changing domains.

### 3. Database Setup

**Option A: Fresh Installation** (recommended for new setups)
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Set up database (fast - single SQL script)
cd backend
npm run setup:fresh

# (Optional) Load demo data
npm run seed:test

# (Optional) View database
npm run studio -- --port 7680
```

**Option B: Existing Database** (preserves data)
```bash
cd backend
npm run migrate
```

### 4. Start Services

**Windows Service Management (Recommended)**

One-time setup (run as administrator):
```cmd
scripts\setup-nssm.bat
```

Then use desktop shortcuts (auto-elevate):
- `restart.bat.lnk` - Restart backend + frontend
- `start.bat.lnk` - Start all services
- `stop.bat.lnk` - Stop everything

**Manual Start**
```bash
# Terminal 1: Backend
cd backend
set PORT=7600
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev -- --port 7620
```

### 5. Access the Application

- **Frontend**: http://localhost:7620
- **Backend API**: http://localhost:7600/health
- **PostgreSQL**: localhost:7640
- **Redis**: localhost:7660
- **Prisma Studio**: http://localhost:7680

**Default Login**: Your configured admin account

## 🗄️ Database

### Fresh Install vs Migrations

**Fresh Installations**: Use `npm run setup:fresh`
- Executes consolidated `schema.sql` (entire database in one transaction)
- Much faster than sequential migrations
- Includes default dropdown lists (industries, departments, regions, etc.)

**Production Updates**: Use `npm run migrate`
- Sequential migrations preserve existing data
- Safe for databases with live data

### Making Schema Changes

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

## 📁 Architecture

### Modular Monolith

Backend organized into self-contained modules:

| Module | Purpose | Status |
|--------|---------|--------|
| `auth` | JWT authentication, login/register | ✅ Complete |
| `users` | User CRUD, roles, password management | ✅ Complete |
| `clients` | Clients, contacts, Salesforce placeholders | ✅ Complete |
| `projects` | Projects, phases, milestones, tasks | ✅ Complete |
| `resources` | Project assignments, allocations | ✅ Complete |
| `capacity` | Availability, time-off approval workflow | ✅ Complete |
| `timetracking` | Time entries, active timer, reports | ✅ Complete |
| `analytics` | Dashboard, summaries, utilization | ✅ Complete |
| `notifications` | Real-time notification system | ✅ Complete |
| `extension` | Chrome extension API & shortcuts | ✅ Complete |

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

**Room Patterns**:
- `user:{userId}` - Personal updates (timer, shortcuts, notifications)
- `project:{projectId}` - Project-specific events
- `task:{taskId}` - Task-specific events

### Database Schema

**Key Relationships**:
- Users have hierarchical manager relationships (self-referential)
- Clients → Projects → Phases/Milestones/Tasks
- ProjectAssignment vs TaskAssignment (project-level vs task-level)
- ActiveTimeEntry (singleton per user) vs TimeEntry (historical)
- Task dependencies via TaskDependency join table
- TimeOffRequest with approval workflow and rejection reasons

**Role Hierarchy** (highest to lowest):
1. `SUPER_ADMIN` - Full system access
2. `ADMIN` - Administrative functions
3. `PMO_MANAGER` - PMO oversight
4. `PROJECT_MANAGER` - Project management
5. `RESOURCE_MANAGER` - Resource allocation
6. `TEAM_MEMBER` - Standard user
7. `VIEWER` - Read-only access

## 🔧 Development

### Backend Commands

```bash
cd backend

npm run dev              # Start with hot reload
npm run build            # Compile TypeScript
npm start                # Run compiled code

npm run migrate          # Create and apply migration
npm run migrate:deploy   # Deploy migrations (production)
npm run generate         # Regenerate Prisma client

npm run setup:fresh      # Fresh database setup (schema.sql)
npm run seed:test        # Install demo data
npm run seed:clear       # Clear demo data (warns about orphaned shortcuts)

npm run studio -- --port 7680  # Prisma Studio

npm test                 # Run tests (vitest)
npm run lint             # ESLint
```

### Frontend Commands

```bash
cd frontend

npm run dev -- --port 7620  # Start dev server
npm run build               # Production build
npm run check               # Svelte type checking
npm run lint                # ESLint
```

### Chrome Extension Commands

```bash
cd chrome-extension

npm run build    # Build extension (output: dist/)
npm run dev      # Build in watch mode
```

After building, load unpacked extension from `chrome-extension/dist` in Chrome.

## 🪟 Windows Service Management

### NSSM (Non-Sucking Service Manager)

Services run in the background, preventing accidental window closure.

**Setup** (one-time, run as admin):
```cmd
scripts\setup-nssm.bat
```

**Desktop Shortcuts** (auto-elevate to admin):
- `restart.bat.lnk` - Most commonly used
- `start.bat.lnk` - Start all services + Docker
- `stop.bat.lnk` - Stop everything

**Manual Commands**:
```cmd
# Restart services (most common)
scripts\restart.bat

# Restart everything including Docker
scripts\restart.bat --docker

# Start all services
scripts\start.bat

# Stop all services
scripts\stop.bat

# Individual service control
nssm start pmo-backend
nssm stop pmo-frontend
nssm restart pmo-backend
nssm status pmo-backend
```

**Service Logs**: `logs/backend.log`, `logs/frontend.log`

## 🌐 Port Assignments

**CRITICAL**: All services use port 7600 as base, incrementing by 20.

| Service | Port | URL |
|---------|------|-----|
| Backend API | **7600** | http://localhost:7600 |
| Frontend | **7620** | http://localhost:7620 |
| PostgreSQL | **7640** | localhost:7640 |
| Redis | **7660** | localhost:7660 |
| Prisma Studio | **7680** | http://localhost:7680 |

**Never use**: 3000, 5173, 5432, 6379, or any default ports.

## 🔐 Security

- **JWT-based authentication** with configurable expiration
- **Password hashing** with bcrypt (10 rounds)
- **Rate limiting** on authentication endpoints
- **CORS protection** with configurable origins
- **Security headers** via Helmet
- **Input validation** with Zod schemas
- **SQL injection protection** via Prisma (parameterized queries)

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Capacity & Time-Off
- `GET /api/capacity/availability` - Get availability
- `GET /api/capacity/availability/:userId` - Get user availability
- `PUT /api/capacity/availability/:userId` - Update availability
- `GET /api/capacity/time-off` - List user's time-off requests
- `GET /api/capacity/time-off/all` - List all requests (managers)
- `POST /api/capacity/time-off` - Create time-off request
- `POST /api/capacity/time-off/:id/approve` - Approve request
- `POST /api/capacity/time-off/:id/reject` - Reject with reason
- `DELETE /api/capacity/time-off/:id` - Cancel request

### Time Tracking
- `GET /api/timetracking/entries` - Get time entries
- `POST /api/timetracking/start` - Start timer
- `POST /api/timetracking/stop` - Stop timer
- `GET /api/timetracking/active` - Get active timer
- `GET /api/timetracking/reports/daily` - Daily report
- `GET /api/timetracking/reports/weekly` - Weekly report
- `GET /api/timetracking/reports/monthly` - Monthly report

### Extension API
- `GET /api/extension/shortcuts` - Get timer shortcuts
- `POST /api/extension/shortcuts` - Create shortcut
- `PUT /api/extension/shortcuts/:id` - Update shortcut
- `DELETE /api/extension/shortcuts/:id` - Delete shortcut

## 🔌 WebSocket Events

### Timer Events
- `time:started` - Timer started (broadcast to user)
- `time:stopped` - Timer stopped (broadcast to user)
- `time:updated` - Timer updated (broadcast to user)
- `time:entry:created` - Time entry created
- `time:entry:updated` - Time entry updated
- `time:entry:deleted` - Time entry deleted

### Shortcut Events
- `shortcuts:updated` - Shortcuts changed (broadcast to user)

### Project/Task Events
- `project:updated`, `project:created`, `project:deleted`
- `task:updated`, `task:created`, `task:deleted`
- `task:assigned`, `task:unassigned`

### Notification Events
- `notification:new` - New notification (broadcast to user)

## 🐳 Docker

### Development
```bash
# Start PostgreSQL + Redis
docker-compose up -d postgres redis

# View logs
docker-compose logs -f postgres

# Stop services
docker-compose down

# Restart database
scripts\docker-restart.bat
```

### Database Access
```bash
# PostgreSQL CLI
docker exec -it pmo-postgres psql -U pmouser -d pmodb

# Execute SQL file
docker exec -i pmo-postgres psql -U pmouser -d pmodb < script.sql
```

## 🚧 Known Issues & Limitations

### Chrome Extension
- Extension structure complete, WebSocket sync working
- Timer shortcuts sync in real-time with web app
- UI needs refinement for production use

### WebSocket via Cloudflare Tunnel
- WebSocket connections may show errors in console
- Socket.IO automatically falls back to HTTP polling (works fine)
- Cloudflare tunnel doesn't support WebSocket upgrades by default

### Data Seeding
- Clearing test data will orphan timer shortcuts (warns user)
- Shortcuts point to specific task UUIDs (regenerated on re-seed)
- Script detects and cleans orphaned shortcuts automatically

## 📊 Production Deployment

### Azure Container Apps

**Prerequisites**:
- Azure CLI installed and authenticated
- Container Registry (ACR) set up
- Azure PostgreSQL Flexible Server

**Environment Variables** (required):
```bash
DATABASE_URL=postgresql://user:pass@host:5432/pmodb
JWT_SECRET=<32-char-minimum-secret>
CORS_ORIGIN=https://yourdomain.com
PORT=7600
NODE_ENV=production
```

**Deployment**:
```bash
# Build and push images
docker build -t <registry>/pmo-backend:latest ./backend
docker build -t <registry>/pmo-frontend:latest ./frontend
docker push <registry>/pmo-backend:latest
docker push <registry>/pmo-frontend:latest

# Deploy via Azure CLI or CI/CD pipeline
```

### Cloudflare Tunnel (or any reverse proxy)

Configure your tunnel/proxy to route:
- **Frontend** (port 7620): `https://yourdomain.com` → `http://localhost:7620`
- **Backend API** (port 7600): `https://api.yourdomain.com` → `http://localhost:7600`

After configuring DNS and tunnel, update your `.env` files (see "Domain Configuration" above) and rebuild the frontend.

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Run specific test file
npm test -- path/to/file.test.ts

# Run tests matching pattern
npm test -- -t "pattern"

# Frontend tests
cd frontend
npm test
```

## 📝 Code Conventions

- **TypeScript**: Strict mode, no `any` types
- **Imports**: Use `.js` extension (ESM requirement)
- **Database**: Always use Prisma with `select` to limit fields
- **Errors**: Throw in services, Fastify catches them
- **WebSocket**: Prefix events with domain (`time:`, `project:`)
- **Validation**: Zod schemas for all API inputs

## 🆘 Troubleshooting

### Database Connection Failed
- Verify PostgreSQL is running: `docker ps`
- Check DATABASE_URL in `.env`
- Test connection: `docker exec pmo-postgres psql -U pmouser -d pmodb -c "SELECT 1"`

### Frontend Can't Reach Backend
- Check CORS_ORIGIN in backend `.env`
- Verify backend is running on port 7600: `netstat -ano | findstr 7600`
- Check browser console for CORS errors

### WebSocket Connection Issues
- Check browser console - Socket.IO may fall back to polling (normal)
- Verify JWT token is being sent
- Check backend logs for connection attempts

### Services Won't Start
- Verify ports are not in use
- Check service logs: `logs/backend.log`, `logs/frontend.log`
- Restart services as administrator

### Timer Shortcuts Not Syncing
- Check WebSocket connection in extension console
- Verify shortcuts were created via web app (not database)
- Reload extension in `chrome://extensions`

## 📞 Support

For issues and questions, contact the development team.

---

Built with Node.js, TypeScript, SvelteKit, and PostgreSQL
