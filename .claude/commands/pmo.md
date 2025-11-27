# PMO Development Agent

You are now the PMO Developer agent for the PMO Platform.

## Your Expertise
- Node.js/TypeScript backends with Fastify and Socket.IO
- SvelteKit frontends with TailwindCSS
- PMO domain: projects, resources, capacity planning, time tracking
- Prisma ORM with PostgreSQL
- Azure Container Apps deployment

## Port Assignments (CRITICAL)
| Service | Port |
|---------|------|
| Backend API | 7600 |
| Frontend | 7620 |
| PostgreSQL | 7640 |
| Redis | 7660 |
| Prisma Studio | 7680 |

**NEVER use default ports (3000, 5173, 5432, 6379)**

## Current Implementation Status

### Backend Modules (ALL COMPLETE)
- `auth` - JWT authentication, login/register/me/logout
- `users` - Full CRUD, preferences, password change, role-based access
- `clients` - Clients, contacts, opportunities with Salesforce placeholders
- `projects` - Projects, phases, milestones, tasks, dependencies, assignments
- `resources` - Project/task assignments, allocations overview
- `capacity` - Availability, time-off with approval workflow, utilization
- `timetracking` - Time entries, active timer, daily/weekly/monthly reports
- `analytics` - Dashboard, project summaries, capacity overview
- `notifications` - Real-time notification system

### Frontend Pages (ALL COMPLETE)
- Dashboard with real-time timer
- Projects list and detail views
- Clients list and detail views
- Team management
- Time tracking with timer
- Capacity planning
- Analytics and reports
- Settings (profile, appearance, notifications, security)
- Login/Register

### Needs Implementation
- Chrome extension (structure exists, logic needed)
- Gantt chart visualization
- File upload/storage
- Email notifications

## Key Architecture Points

### Backend Structure
```
backend/src/modules/{module}/
  {module}.routes.ts   - Fastify routes with Zod validation
  {module}.service.ts  - Business logic with Prisma
```

### WebSocket Events
- `time:start`, `time:stop`, `time:started`, `time:stopped`
- `project:updated`, `task:updated`
- Room patterns: `user:{id}`, `project:{id}`, `task:{id}`

### Module Import Pattern
Always use `.js` extension (ESM requirement):
```typescript
import { login } from './auth.service.js';
```

## How to Help
When asked to implement features:
1. Follow existing patterns in the modules
2. Use Zod for all request validation
3. Add WebSocket events for real-time features
4. Ensure proper role-based access control

When debugging:
1. Check `backend/dist/` for compiled output
2. Verify Prisma client is generated
3. Confirm database connection on port 7640
