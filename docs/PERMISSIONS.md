# Role-Based Access Control (RBAC)

This document defines the 7-tier role hierarchy and access permissions for all features in the PMO Platform.

---

## Role Hierarchy

Roles are hierarchical - higher roles inherit all permissions of lower roles.

| Level | Role | Description |
|-------|------|-------------|
| 7 | `SUPER_ADMIN` | Full system access, all permissions |
| 6 | `ADMIN` | System administration, user management |
| 5 | `PMO_MANAGER` | PMO oversight, analytics, reports |
| 4 | `PROJECT_MANAGER` | Project management, client access |
| 3 | `RESOURCE_MANAGER` | Resource allocation, capacity planning |
| 2 | `TEAM_MEMBER` | Standard user, time tracking, projects |
| 1 | `VIEWER` | Read-only access |

**Permission Checking**:
- `hasRole('PROJECT_MANAGER')` returns `true` for PROJECT_MANAGER and all higher roles
- `hasAnyRole('ADMIN', 'SUPER_ADMIN')` returns `true` only for exact role matches

---

## Page & Feature Access

### 🏠 Dashboard
**Path**: `/dashboard`
**Required Role**: Any authenticated user
**Access**: All roles (VIEWER and above)

**Features**:
- View personal dashboard
- See active timer
- View assigned tasks
- Quick stats overview

---

### 📊 Projects
**Path**: `/projects`, `/projects/:id`
**Required Role**: Any authenticated user
**Access**: All roles (VIEWER and above)

**Features by Role**:

| Feature | VIEWER | TEAM_MEMBER | RESOURCE_MANAGER | PROJECT_MANAGER | PMO_MANAGER | ADMIN | SUPER_ADMIN |
|---------|--------|-------------|------------------|-----------------|-------------|-------|-------------|
| View projects | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create projects | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Edit projects | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Delete projects | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Assign resources | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### 🏢 Clients
**Path**: `/clients`, `/clients/:id`
**Required Role**: `PROJECT_MANAGER`
**Access**: PROJECT_MANAGER and above

**Features**:
- View client list and details
- Create new clients
- Edit client information
- Manage client contacts
- View client opportunities (Salesforce placeholders)

---

### 👥 Teams
**Path**: `/teams`
**Required Role**: `RESOURCE_MANAGER`
**Access**: RESOURCE_MANAGER and above

**Features**:
- View team organization
- See team structure
- View team capacity

---

### 👤 People
**Path**: `/people`, `/people/:id`
**Required Role**: `RESOURCE_MANAGER`
**Access**: RESOURCE_MANAGER and above

**Features**:
- View all users in the organization
- See user details and profiles
- View user assignments
- See upcoming time-off (prominent alerts)
- Access user capacity information

**Note**: All users can view their own profile via `/settings/profile`

---

### ⏱️ Time Tracking
**Path**: `/time`, `/time/reports`
**Required Role**: Any authenticated user
**Access**: All roles (VIEWER and above)

**Features by Role**:

| Feature | VIEWER | TEAM_MEMBER | RESOURCE_MANAGER | PROJECT_MANAGER | PMO_MANAGER | ADMIN | SUPER_ADMIN |
|---------|--------|-------------|------------------|-----------------|-------------|-------|-------------|
| View own time entries | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Start/stop timer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create time entries | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own entries | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own entries | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View team reports | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create timer shortcuts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Real-time Features**:
- Timer syncs across all devices via WebSocket
- Shortcuts sync between web app and Chrome extension
- Live timer updates

---

### 📅 Capacity Planning
**Path**: `/capacity`
**Required Role**: `RESOURCE_MANAGER`
**Access**: RESOURCE_MANAGER and above

**Features**:
- **Team Utilization**
  - View team member utilization percentages
  - Color-coded capacity levels (critical, low, moderate, optimal, over-allocated)
  - Filter by utilization category
  - Paginated view (10 per page)
  - Summary totals (hours logged, hours available, average utilization)

- **Capacity by Department**
  - View department-level capacity
  - Color-coded department utilization
  - Filter by utilization category
  - Paginated view (10 per page)
  - Summary totals (capacity, allocated, average utilization)

- **Recent Time-Off Requests**
  - View all users' time-off requests
  - See approval status
  - Quick overview of upcoming absences

**Access Levels**:
- RESOURCE_MANAGER: View and manage capacity for direct reports
- PROJECT_MANAGER: View capacity for project team members
- PMO_MANAGER: View organization-wide capacity
- ADMIN/SUPER_ADMIN: Full access to all capacity data

---

### 🏖️ Leave Requests (Time-Off Management)
**Path**: `/capacity/time-off`
**Required Role**: `RESOURCE_MANAGER`
**Access**: RESOURCE_MANAGER and above

**Features**:
- View all team time-off requests
- Approve time-off requests
- Reject requests with rejection reason
- View approval history
- See upcoming time-off calendar

**Personal Time-Off**:
- All users can request time-off via `/settings` or API
- All users can view their own requests via API (`/api/capacity/time-off`)
- Rejection reasons are visible to employees

---

### 📈 Analytics
**Path**: `/analytics`
**Required Role**: `PMO_MANAGER`
**Access**: PMO_MANAGER and above

**Features**:
- Organization-wide dashboards
- Project performance metrics
- Team utilization reports
- Resource allocation analysis
- Capacity planning overview
- Historical trend analysis

---

### ⚙️ Settings
**Path**: `/settings/*`
**Required Role**: Any authenticated user
**Access**: All roles (VIEWER and above)

**Sub-pages**:
- `/settings/profile` - Edit personal profile
- `/settings/appearance` - Theme and display preferences
- `/settings/notifications` - Notification settings
- `/settings/security` - Change password, 2FA

---

## 🛡️ Administration Section

**Required Role**: `ADMIN` or `SUPER_ADMIN` (system administration level)
**Access**: ADMIN and SUPER_ADMIN only

All administration pages are restricted to system administrators (not project-level managers).

### Admin Dashboard
**Path**: `/admin`
**Features**:
- System overview
- User statistics
- Platform health metrics

### User Management
**Path**: `/admin/users`
**Features**:
- Create/edit/delete users
- Assign roles
- Reset passwords
- Deactivate accounts

### Dropdown Lists
**Path**: `/admin/dropdowns`
**Features**:
- Manage system dropdown values
- Edit industries, departments, regions
- Control project types, statuses
- Customize task priorities

### Deleted Items
**Path**: `/admin/deleted-items`
**Features**:
- View soft-deleted records
- Restore deleted items
- Permanently delete records

### Audit Logs
**Path**: `/admin/audit-logs`
**Features**:
- View system audit trail
- Track user actions
- Review security events

### Sessions
**Path**: `/admin/sessions`
**Features**:
- View active user sessions
- Terminate sessions
- Session history

### Platform Settings
**Path**: `/admin/settings`
**Features**:
- Configure system-wide settings
- Email configuration
- Integration settings

---

## API Endpoint Permissions

### Authentication Endpoints
**Path**: `/api/auth/*`
**Access**: Public (no authentication required)

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user
- `POST /api/auth/refresh` - Refresh JWT token

---

### User Management
**Path**: `/api/users/*`

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/api/users` | GET | Any | List users |
| `/api/users/:id` | GET | Any | Get user by ID |
| `/api/users` | POST | ADMIN | Create user |
| `/api/users/:id` | PUT | ADMIN or Self | Update user |
| `/api/users/:id` | DELETE | ADMIN | Delete user |
| `/api/users/:id/password` | PUT | Self | Change own password |

---

### Capacity & Time-Off
**Path**: `/api/capacity/*`

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/api/capacity/utilization` | GET | RESOURCE_MANAGER | Get utilization report |
| `/api/capacity/time-off` | GET | Any | Get own time-off requests |
| `/api/capacity/time-off/all` | GET | RESOURCE_MANAGER | Get all time-off requests |
| `/api/capacity/time-off` | POST | Any | Create time-off request |
| `/api/capacity/time-off/:id/approve` | POST | RESOURCE_MANAGER | Approve request |
| `/api/capacity/time-off/:id/reject` | POST | RESOURCE_MANAGER | Reject request |
| `/api/capacity/time-off/:id` | DELETE | Self | Cancel own request |

---

### Analytics
**Path**: `/api/analytics/*`

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/api/analytics/dashboard` | GET | PMO_MANAGER | Dashboard metrics |
| `/api/analytics/capacity-overview` | GET | RESOURCE_MANAGER | Capacity analytics |
| `/api/analytics/project-summary` | GET | PROJECT_MANAGER | Project metrics |
| `/api/analytics/utilization` | GET | RESOURCE_MANAGER | Utilization reports |

---

### Time Tracking
**Path**: `/api/timetracking/*`

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/api/timetracking/entries` | GET | Any | Get own time entries |
| `/api/timetracking/start` | POST | Any | Start timer |
| `/api/timetracking/stop` | POST | Any | Stop timer |
| `/api/timetracking/active` | GET | Any | Get active timer |
| `/api/timetracking/reports/team` | GET | RESOURCE_MANAGER | Team reports |

---

### Extension API
**Path**: `/api/extension/*`

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/api/extension/shortcuts` | GET | Any | Get timer shortcuts |
| `/api/extension/shortcuts` | POST | Any | Create shortcut |
| `/api/extension/shortcuts/:id` | PUT | Any | Update shortcut |
| `/api/extension/shortcuts/:id` | DELETE | Any | Delete shortcut |

---

## Implementation Details

### Frontend Protection

**Sidebar Menu** (`frontend/src/components/layout/Sidebar.svelte`):
- Items with `minRole` only appear if user meets requirement
- Admin section only visible to ADMIN/SUPER_ADMIN
- Uses `canAccess(item)` function to check permissions

**Page Guards** (SvelteKit `+page.ts` files):
- `/capacity/+page.ts` - Requires RESOURCE_MANAGER
- `/analytics/+page.ts` - Requires PMO_MANAGER
- `/admin/+layout.ts` - Requires ADMIN or SUPER_ADMIN
- `/capacity/time-off/+page.ts` - Requires RESOURCE_MANAGER

**Store Functions** (`frontend/src/lib/stores/auth.ts`):
```typescript
hasRole('PROJECT_MANAGER')      // Hierarchical check
hasAnyRole('ADMIN', 'SUPER_ADMIN')  // Exact match check
```

### Backend Protection

**Route Middleware** (`backend/src/modules/*/routes.ts`):
- All routes require `app.authenticate` hook
- Manager routes check role before processing
- Throws 403 error if unauthorized

**Service Layer** (`backend/src/modules/*/service.ts`):
- Business logic assumes authorization already checked
- May perform additional ownership checks (e.g., can only edit own entries)

---

## Default Admin Account

**Created on fresh install**:
- Email: `admin@pmoplatform.com`
- Password: `Admin123!`
- Role: `SUPER_ADMIN`

**⚠️ CRITICAL**: Change the default password immediately after first login!

---

## Best Practices

1. **Principle of Least Privilege**: Assign the lowest role that provides necessary access
2. **Regular Audits**: Review user roles periodically via Admin > User Management
3. **Manager Assignment**: Ensure users have correct manager for approval workflows
4. **Role Changes**: Use Admin > User Management to promote/demote users
5. **Deactivation**: Use status = 'INACTIVE' instead of deleting users to preserve audit trail

---

## Permission Errors

**Frontend**:
- Unauthorized pages redirect to `/dashboard`
- Menu items hidden if insufficient permissions
- No error message shown (silent redirect)

**Backend**:
- Returns `403 Forbidden` for insufficient permissions
- Returns `401 Unauthorized` for missing/invalid JWT token
- Error messages indicate required role when applicable

---

## Future Enhancements

Potential permission improvements:

- [ ] Department-level permissions (e.g., can only manage own department)
- [ ] Project-level permissions (e.g., can only view assigned projects)
- [ ] Custom permission sets beyond the 7 roles
- [ ] Two-factor authentication for ADMIN/SUPER_ADMIN
- [ ] IP whitelisting for admin section
- [ ] Audit log for permission changes

---

**Last Updated**: 2025-11-30
**Version**: 1.0
