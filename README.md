![](https://raw.githubusercontent.com/dtsoden/pmo/main/frontend/static/ReverseLogo.png)
# PMO Platform

A comprehensive PMO tracking platform with project management, capacity planning, and real-time time tracking. Built as a modular monolith with Node.js/TypeScript backend and SvelteKit frontend.

**Open source** under AGPL-3.0 license - free for internal use, see [LICENSE](LICENSE) for details.

## 🎯 Features

### ✅ Fully Implemented

- **User Management**: 7-tier role-based access control (SUPER_ADMIN → VIEWER)
- **Client Management**: Full CRUD with contacts and Salesforce placeholder fields
- **Project Management**:
  - Multi-phase projects with milestones and tasks
  - Task dependencies and hierarchy
  - Project assignments and resource allocation
- **Capacity Planning**:
  - **Visual team utilization** with gradient color-coding (orange→yellow→blue→green→red)
  - Real-time utilization tracking with filters (Critical, Low, Moderate, Optimal, Over-allocated)
  - **Paginated views** (5-10 per page) with summary totals
  - Department-level capacity analysis with color-coded visualization
  - Time-off request workflow with approval/rejection and rejection reasons
  - Prominent time-off alerts with upcoming absences
  - Average utilization metrics across teams and departments
- **Time Tracking**:
  - Task-based time entries with sessions
  - Real-time timer with WebSocket sync across all pages
  - Daily/weekly/monthly reports
  - Timer shortcuts for quick start
- **Executive Analytics Dashboard**:
  - **Financial KPIs**: Billable revenue, non-billable opportunity, billability rate
  - **Project Portfolio Health**: Interactive donut chart with status breakdown
  - **Team Capacity Health**: Visual distribution with actionable insights
  - **Skills Gap Analysis**: Real-time demand vs. supply matching
  - **Clickable Burnout Risk Modal**:
    - Shows over-allocated team members (>100% utilization)
    - Recommends who can help (team members with capacity + matching skills)
    - Hiring recommendations for critical skill shortages (<3 people with skill)
    - Department-aware redistribution suggestions
  - **Clickable Available Capacity Modal**:
    - Shows under-utilized team members with available hours
    - Assignment opportunities to active projects needing their skills
    - Training recommendations for high-demand skills
    - Skills color-coded by severity (CRITICAL, HIGH, MEDIUM)
  - **Talent Optimization**:
    - Skills Development Opportunities (40-65% utilization) with project matching
    - Resource Optimization Review (<40% utilization) with strategic options
    - Financial impact analysis (unused capacity × $150/hr average rate)
    - Pagination for large teams (5 per page)
  - Top Contributors leaderboard
  - Department Performance tracking
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
- **Database**: PostgreSQL 16+
- **Cache**: Redis (optional, for multi-instance deployments)
- **Real-time**: Socket.IO with WebSocket transport

---

## 📚 Documentation

### Security & Access Control

- **[Role-Based Permissions](docs/PERMISSIONS.md)** - Complete RBAC reference
  - 7-tier role hierarchy (SUPER_ADMIN → VIEWER)
  - Page and feature access by role
  - API endpoint permissions
  - Implementation details and best practices

### Deployment Guides

Choose your deployment platform:

- **[Windows Deployment](docs/DEPLOY-WINDOWS.md)** - Deploy on Windows Server or Windows 10/11
  - Single-instance setup with NSSM services
  - Enterprise-scale with load balancing
  - Cloudflare Tunnel integration

- **[Linux Deployment](docs/DEPLOY-LINUX.md)** - Deploy on Ubuntu, Debian, CentOS, RHEL
  - systemd service configuration
  - nginx reverse proxy setup
  - Let's Encrypt SSL certificates

- **[Cloud Deployment](docs/DEPLOY-CLOUD.md)** - Deploy to cloud providers
  - AWS (EC2, ECS, RDS, ElastiCache)
  - Azure (VMs, Container Apps, Database for PostgreSQL)
  - Vultr, DigitalOcean, Hostinger VPS
  - Cost estimates and provider comparisons

### Configuration

- **[Environment Variables Guide](docs/ENV-CONFIGURATION.md)** - Complete `.env` configuration reference
  - Root `.env` (backend runtime)
  - Frontend `.env` (build-time)
  - Chrome extension `.env` (build-time)
  - Production deployment scenarios

### Architecture & Scaling

**Single-Instance Deployment** (1-500 concurrent users):
```
[Users] → [Frontend:7620] → [Backend:7600] → [PostgreSQL:7640]
```
- No Redis needed
- Socket.IO uses in-memory rooms
- Perfect for small teams and development

**Multi-Instance Deployment** (500+ concurrent users):
```
[Load Balancer]
    ├── Backend Instance 1
    ├── Backend Instance 2
    └── Backend Instance 3
         ↓
   [Redis] (syncs Socket.IO rooms)
         ↓
   [PostgreSQL]
```
- Redis adapter enabled automatically when `REDIS_URL` is set
- Stateless backend allows horizontal scaling
- JWT-based auth (no server-side sessions)

**What's included:**
- ✅ Redis adapter for Socket.IO (ready to use)
- ✅ Stateless backend architecture
- ✅ WebSocket room sync via Redis pubsub

**What you need to implement:**
- Load balancer (HAProxy, nginx, AWS ALB, Azure App Gateway)
- Managed database and Redis (or self-hosted HA clusters)
- Container orchestration (optional: Docker Swarm, Kubernetes)

---

## 📋 Prerequisites

- **Node.js 20+** and npm 10+
- **Docker** and Docker Compose
- **PostgreSQL 16+** (via Docker or managed service)
- **Git** (optional, for cloning repository)

**Platform-specific requirements:**
- See [Windows Deployment](docs/DEPLOY-WINDOWS.md) for NSSM service manager setup
- See [Linux Deployment](docs/DEPLOY-LINUX.md) for systemd configuration
- See [Cloud Deployment](docs/DEPLOY-CLOUD.md) for cloud provider requirements

---

## 🚀 Quick Start (Development)

**For production deployment, see the [deployment guides](#deployment-guides) above.**

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/pmo-platform.git
cd pmo-platform

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy example files
cp .env.example .env
cp frontend/.env.example frontend/.env
cp chrome-extension/.env.example chrome-extension/.env

# Edit root .env (see docs/ENV-CONFIGURATION.md for details)
# Minimum required:
# - DATABASE_URL=postgresql://pmouser:pmopass@localhost:7640/pmodb
# - JWT_SECRET=<generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
# - CORS_ORIGIN=http://localhost:7620
```

**For detailed configuration, see [Environment Variables Guide](docs/ENV-CONFIGURATION.md).**

### 3. Initialize Database

```bash
# Start database
docker-compose up -d postgres

# Initialize schema
cd backend
npm run setup:fresh

# (Optional) Load demo data
npm run seed:test

cd ..
```

### 4. Start Services

**Windows:**
```cmd
scripts\start.bat
```

**Linux/Mac:**
```bash
./scripts/start.sh
```

**Or manually (two terminals):**
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev -- --port 7620
```

### 5. Access the Application & Login

**Default Login Credentials:**
- **Email**: `admin@pmoplatform.com`
- **Password**: `Admin123!`
- **Role**: SUPER_ADMIN

**⚠️ IMPORTANT:** Change the default password after first login!

**Optional Test Data:**
- To add 50 test users for development: `cd backend && npm run seed:test`
- Test users: `firstname.lastname@testdata.pmo.local` / `TestPass123!`

- **Frontend**: http://localhost:7620
- **Backend API**: http://localhost:7600/health
- **PostgreSQL**: localhost:7640

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

---

## 💡 Development Tips

### Service Management

**Windows (NSSM services):**
- See [Windows Deployment Guide](docs/DEPLOY-WINDOWS.md) for NSSM setup
- Quick commands: `scripts\start.bat`, `scripts\stop.bat`, `scripts\restart.bat`

**Linux/Mac (systemd or manual):**
- See [Linux Deployment Guide](docs/DEPLOY-LINUX.md) for systemd setup
- Quick commands: `./scripts/start.sh`, `./scripts/stop.sh`, `./scripts/restart.sh`

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

---

## 📦 Production Deployment

**For production deployment, see the comprehensive deployment guides:**

- **[Windows Deployment](docs/DEPLOY-WINDOWS.md)** - NSSM services, IIS, Cloudflare Tunnel
- **[Linux Deployment](docs/DEPLOY-LINUX.md)** - systemd, nginx, Let's Encrypt SSL
- **[Cloud Deployment](docs/DEPLOY-CLOUD.md)** - AWS, Azure, Vultr, DigitalOcean

**Production checklist:**
- ✅ Use managed PostgreSQL (not Docker)
- ✅ Enable Redis if deploying multiple backend instances
- ✅ Setup SSL/TLS certificates
- ✅ Configure firewall rules
- ✅ Use strong JWT_SECRET (64+ characters)
- ✅ Restrict CORS_ORIGIN to your actual domains
- ✅ Setup automated database backups
- ✅ Configure logging and monitoring

---

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

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

**What this means:**
- ✅ Free to use for internal business operations
- ✅ Free to modify and customize
- ✅ Must share source code if you distribute modified versions
- ✅ Must share source code if you offer it as a SaaS product
- ❌ Cannot resell as commercial SaaS without releasing your source code under AGPL-3.0

**Need a commercial license?** Contact us for pricing on commercial licensing that allows:
- Using this as part of a proprietary SaaS offering
- Integrating into closed-source products
- Commercial support and dedicated features

See [LICENSE](LICENSE) for full terms.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Before contributing:**
- Read the [code conventions](docs/CODE-CONVENTIONS.md) guide
- Ensure tests pass: `cd backend && npm test`
- Follow existing code style (TypeScript, ESLint)
- Update documentation if needed

---

## 📞 Support

- **Issues**: Open an issue on GitHub
- **Documentation**: See `docs/` folder
- **Discussions**: GitHub Discussions

---

**Built with Node.js, TypeScript, SvelteKit, Fastify, Socket.IO, and PostgreSQL**
