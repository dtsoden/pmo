# PMO Platform

A custom streamlined PMO tracking platform with comprehensive project management, capacity planning, and real-time time tracking capabilities.

## 🎯 Features

### Core Capabilities
- **User Management**: Manual user management with role-based access control (no SSO)
- **Client Management**: Full client lifecycle with Salesforce integration placeholders
- **Project Management**:
  - Multi-phase projects with milestones
  - Gantt chart visualization
  - Task dependencies and hierarchy
  - Agile and traditional methodologies
- **Resource Management**:
  - Multi-project resource allocation
  - Capacity planning and availability tracking
  - Team member scheduling
- **Time Tracking**:
  - Task-based time entries
  - Real-time tracking with WebSocket support
  - Chrome extension for quick clock in/out
  - Comprehensive reporting
- **Dashboards**:
  - Admin dashboard with analytics
  - User-focused views with assignments
  - Real-time updates and notifications

### Technical Highlights
- **Backend**: Node.js with TypeScript, Fastify, Socket.IO
- **Frontend**: SvelteKit with TailwindCSS
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSockets for live updates
- **Deployment**: Containerized for Azure Container Apps
- **Performance**: Optimized for speed and responsiveness

## 📋 Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 16+
- Docker and Docker Compose (for containerized development)
- Azure CLI (for deployment)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Navigate to the project directory
cd pmo

# Install all dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

cd ..
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# At minimum, update:
# - DATABASE_URL
# - JWT_SECRET
# - CORS_ORIGIN
```

### 3. Database Setup

```bash
# Start PostgreSQL (via Docker)
docker-compose up -d postgres

# Run database migrations
cd backend
npm run migrate

# (Optional) Open Prisma Studio to view database
npm run studio
```

### 4. Start Development Servers

#### Option A: Using Docker Compose (Recommended)
```bash
# Start all services
docker-compose up

# Access:
# - Frontend: http://localhost:7620
# - Backend API: http://localhost:7600
# - PostgreSQL: localhost:7640
# - Redis: localhost:7660
```

#### Option B: Manual Start
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:7620
- **Backend API**: http://localhost:7600
- **API Health Check**: http://localhost:7600/health
- **Prisma Studio**: Run `npm run studio -- --port 7680` in backend directory

## 📁 Project Structure

```
pmo/
├── backend/                 # Node.js/TypeScript API
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   │   ├── auth/       # Authentication
│   │   │   ├── users/      # User management
│   │   │   ├── clients/    # Client management
│   │   │   ├── projects/   # Project management
│   │   │   ├── resources/  # Resource allocation
│   │   │   ├── capacity/   # Capacity planning
│   │   │   ├── timetracking/ # Time tracking
│   │   │   ├── analytics/  # Analytics & reporting
│   │   │   └── notifications/ # Notifications
│   │   ├── core/           # Core utilities
│   │   │   ├── database/   # Prisma client
│   │   │   ├── websocket/  # Socket.IO setup
│   │   │   ├── middleware/ # Auth & other middleware
│   │   │   └── utils/      # Shared utilities
│   │   └── index.ts        # Application entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── Dockerfile
│   └── package.json
│
├── frontend/               # SvelteKit application
│   ├── src/
│   │   ├── routes/        # SvelteKit routes
│   │   ├── components/    # Svelte components
│   │   │   ├── admin/    # Admin-specific components
│   │   │   ├── user/     # User-specific components
│   │   │   └── shared/   # Shared components
│   │   ├── lib/          # Libraries and utilities
│   │   │   ├── api/      # API client
│   │   │   ├── stores/   # Svelte stores
│   │   │   └── utils/    # Utilities
│   │   ├── app.css       # Global styles
│   │   └── app.html      # HTML template
│   ├── Dockerfile
│   └── package.json
│
├── chrome-extension/      # Time tracking Chrome extension
│   ├── src/
│   ├── public/
│   └── manifest/
│
├── shared/               # Shared types and utilities
│
├── infra/               # Azure deployment configs
│
├── docker-compose.yml   # Docker Compose configuration
├── .env.example        # Environment template
└── README.md           # This file
```

## 🗄️ Database Schema

The platform uses PostgreSQL with Prisma ORM. Key entities include:

- **Users**: User accounts with roles and hierarchy
- **Clients**: Client organizations with Salesforce placeholders
- **Projects**: Projects with phases, milestones, and tasks
- **Tasks**: Hierarchical tasks with dependencies
- **Assignments**: Project and task assignments
- **Availability**: User availability and time-off
- **Time Entries**: Task-based time tracking
- **Notifications**: System notifications

### Database Migrations

```bash
# Create a new migration
cd backend
npx prisma migrate dev --name migration_name

# Deploy migrations to production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## 🔐 Authentication & Security

- **JWT-based authentication** with configurable expiration
- **Role-based access control (RBAC)** with 7 role levels:
  - SUPER_ADMIN
  - ADMIN
  - PMO_MANAGER
  - PROJECT_MANAGER
  - RESOURCE_MANAGER
  - TEAM_MEMBER
  - VIEWER
- **Password hashing** with bcrypt
- **Rate limiting** on API endpoints
- **CORS protection**
- **Security headers** with Helmet

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Clients
- `GET /api/clients` - List clients
- `GET /api/clients/:id` - Get client
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client

### Projects
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project
- `POST /api/projects` - Create project
- `GET /api/projects/:id/phases` - Get project phases
- `GET /api/projects/:id/milestones` - Get milestones
- `GET /api/projects/:id/tasks` - Get project tasks

### Time Tracking
- `GET /api/time-tracking/entries` - Get time entries
- `POST /api/time-tracking/start` - Start timer
- `POST /api/time-tracking/stop` - Stop timer
- `GET /api/time-tracking/active` - Get active timer
- `GET /api/time-tracking/reports/*` - Time reports

### Capacity & Resources
- `GET /api/capacity/availability` - Get availability
- `GET /api/capacity/utilization` - Get utilization
- `GET /api/resources/assignments` - Get assignments

### Analytics
- `GET /api/analytics/dashboard` - Dashboard data
- `GET /api/analytics/projects/summary` - Project summary
- `GET /api/analytics/capacity/overview` - Capacity overview

## 🔌 WebSocket Events

### Time Tracking
- `time:start` - User started tracking time
- `time:stop` - User stopped tracking time
- `time:started` - Broadcast to user's sessions
- `time:stopped` - Broadcast to user's sessions

### Project Updates
- `project:join` - Join project room
- `project:leave` - Leave project room
- `project:updated` - Project was updated

### Task Updates
- `task:join` - Join task room
- `task:leave` - Leave task room
- `task:updated` - Task was updated

## 🐳 Docker Deployment

### Development
```bash
# Start all services
docker-compose up

# Rebuild containers
docker-compose up --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

### Production Build
```bash
# Build production images
docker-compose -f docker-compose.yml build

# Start in production mode
NODE_ENV=production docker-compose up -d
```

## ☁️ Azure Deployment

### Prerequisites
- Azure CLI installed and logged in
- Azure Container Registry (ACR)
- Azure Container Apps environment

### Deployment Steps

1. **Build and push images to ACR**:
```bash
# Login to Azure
az login

# Create resource group
az group create --name pmo-rg --location eastus

# Create container registry
az acr create --resource-group pmo-rg --name pmoacr --sku Basic

# Login to ACR
az acr login --name pmoacr

# Build and push images
docker build -t pmoacr.azurecr.io/pmo-backend:latest ./backend
docker build -t pmoacr.azurecr.io/pmo-frontend:latest ./frontend

docker push pmoacr.azurecr.io/pmo-backend:latest
docker push pmoacr.azurecr.io/pmo-frontend:latest
```

2. **Create Azure Container Apps**:
```bash
# Create Container Apps environment
az containerapp env create \
  --name pmo-env \
  --resource-group pmo-rg \
  --location eastus

# Deploy backend
az containerapp create \
  --name pmo-backend \
  --resource-group pmo-rg \
  --environment pmo-env \
  --image pmoacr.azurecr.io/pmo-backend:latest \
  --target-port 7600 \
  --ingress external \
  --env-vars \
    NODE_ENV=production \
    DATABASE_URL=<your-postgres-url> \
    JWT_SECRET=<your-jwt-secret>

# Deploy frontend
az containerapp create \
  --name pmo-frontend \
  --resource-group pmo-rg \
  --environment pmo-env \
  --image pmoacr.azurecr.io/pmo-frontend:latest \
  --target-port 7620 \
  --ingress external \
  --env-vars \
    PUBLIC_API_URL=<backend-url>
```

3. **Set up Azure PostgreSQL**:
```bash
# Create PostgreSQL server
az postgres flexible-server create \
  --name pmo-postgres \
  --resource-group pmo-rg \
  --location eastus \
  --admin-user pmoadmin \
  --admin-password <secure-password> \
  --sku-name Standard_B1ms \
  --version 16

# Create database
az postgres flexible-server db create \
  --resource-group pmo-rg \
  --server-name pmo-postgres \
  --database-name pmodb
```

## 🔧 Development Workflow

### Adding a New Module

1. Create module directory in `backend/src/modules/`
2. Create service file with business logic
3. Create routes file with API endpoints
4. Register routes in `backend/src/index.ts`
5. Create corresponding frontend components

### Database Changes

1. Update `backend/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Update TypeScript types if needed
4. Regenerate Prisma client: `npx prisma generate`

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

## 📊 Monitoring & Logging

- **Backend**: Pino logger with pretty printing in development
- **Database**: Prisma query logging in development
- **WebSocket**: Connection and event logging
- **Errors**: Structured error logging with context

## 🚧 Roadmap & Next Steps

### Phase 1: Foundation (Current)
- [x] Project structure and configuration
- [x] Database schema design
- [x] Authentication system
- [x] Real-time WebSocket setup
- [ ] Complete all API endpoints
- [ ] Build core UI components

### Phase 2: Core Features
- [ ] User management UI
- [ ] Client management with Salesforce placeholders
- [ ] Project creation and management
- [ ] Resource allocation interface
- [ ] Capacity planning dashboard

### Phase 3: Time Tracking
- [ ] Time entry UI
- [ ] Active timer with WebSocket sync
- [ ] Chrome extension development
- [ ] Time reporting and analytics

### Phase 4: Advanced Features
- [ ] Gantt chart visualization
- [ ] Advanced analytics dashboard
- [ ] Notification system
- [ ] File attachments
- [ ] Activity feed

### Phase 5: Polish & Production
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Azure deployment automation

## 🤝 Contributing

This is a private project for internal use. If you're part of the development team:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit for review
5. Deploy to staging first

## 📝 License

Proprietary - Internal Use Only

## 🆘 Troubleshooting

### Database connection failed
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify network connectivity

### Frontend can't reach backend
- Check CORS_ORIGIN in backend .env
- Verify PUBLIC_API_URL in frontend
- Ensure backend is running on correct port

### WebSocket connection issues
- Check firewall settings
- Verify JWT token is being sent
- Check browser console for errors

## 📞 Support

For issues and questions, contact the development team.

---

Built with Node.js, TypeScript, SvelteKit, and PostgreSQL
