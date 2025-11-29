# PMO Platform - Feature Enhancements & Bug Fixes
**Session Started**: 2025-11-29
**Status**: In Progress

---

## 📊 Progress Overview
- **Total Items**: 17
- **FULLY Complete** (Backend + Frontend): 0 items ❌
- **Backend Complete, Frontend Pending**: 12 items (1, 2, 3, 4, 7, 8, 9, 10, 13, 15, 16, 17) 🔄
- **Backend Partial, Frontend Pending**: 2 items (5, 14) 🔄
- **Frontend Only Work**: 3 items (6, 11, 12) ⚠️

### Reality Check:
**Backend Work Done**: ~85% complete ✅
**Frontend Work Done**: ~0% complete ⚠️
**Overall Progress**: ~42% complete

### What's Actually Usable Right Now:
❌ None of the features are user-facing yet - all backend only!

---

## 🧑 People Module (4 items)

### 🔄 1. Add team assignment from people page
**Status**: In Progress (50% - Backend done, Frontend pending)
**Description**: No way to assign a person to a team from the people interface

**Backend Tasks:**
- [x] Add API endpoint `POST /api/users/:id/teams`
- [x] Add API endpoint `DELETE /api/users/:id/teams/:teamId`
- [x] Validate team exists and user not already member

**Frontend Tasks:**
- [ ] Add "Assign to Team" button on people detail page
- [ ] Create team selection modal/dropdown
- [ ] Show success/error messages
- [ ] Update UI in real-time after assignment

### 🔄 2. Show team memberships on people detail page
**Status**: In Progress (50% - Backend done, Frontend pending)
**Description**: No team assignment observations - what teams does person xxx belong to

**Backend Tasks:**
- [x] Update `getUserById()` to include `teamMemberships[]`
- [x] Include team details (name, description, role, joinedAt)

**Frontend Tasks:**
- [ ] Create "Teams" section on people detail page
- [ ] Display team badges/cards with role
- [ ] Add "Remove from Team" button for each team
- [ ] Add click to navigate to team detail page

### 🔄 3. Add project assignment from people page
**Status**: In Progress (50% - Backend done, Frontend pending)
**Description**: No way to assign people to projects from people interface

**Backend Tasks:**
- [x] Add API endpoint `POST /api/users/:id/projects`
- [x] Add API endpoint `DELETE /api/users/:id/projects/:projectId`
- [x] Update `getUserById()` to include `projectAssignments[]`
- [x] Validate project exists and user not already assigned

**Frontend Tasks:**
- [ ] Add "Assign to Project" button on people detail page
- [ ] Create project assignment form (project, role, hours, dates)
- [ ] Display "Projects" section showing current assignments
- [ ] Add "Remove from Project" button for each assignment
- [ ] Show allocation timeline/calendar view

### 🔄 4. Implement soft delete for people
**Status**: In Progress (75% - Backend done, Frontend partial)
**Description**: Cannot delete people - need soft delete to preserve data

**Backend Tasks:**
- [x] Add `deletedAt` field to User schema
- [x] Update all queries to filter out soft-deleted users
- [x] Add `DELETE /api/users/:id` (sets deletedAt)
- [x] Add `POST /api/users/:id/restore` endpoint

**Frontend Tasks:**
- [ ] Add "Delete User" button on people detail page
- [ ] Create confirmation dialog with warning
- [ ] Update user list to exclude deleted users
- [ ] Show "Deleted" badge if viewing deleted user

---

## 👥 Teams Module (1 item)

### ❌ 5. Add team assignment to existing projects
**Status**: Pending (Backend exists, Frontend needed)
**Description**: No way to assign a team to an existing project from teams page

**Backend Tasks:**
- [x] Backend already has `assignTeamToProject()` in teams.service.ts
- [x] API endpoint `POST /api/teams/:id/projects` exists
- [x] API endpoint `DELETE /api/teams/:id/projects/:assignmentId` exists

**Frontend Tasks:**
- [ ] Add "Assign to Project" button on teams detail page
- [ ] Create project assignment form (project, role, start/end dates)
- [ ] Display "Projects" section showing current team assignments
- [ ] Add "Remove from Project" button for each assignment

---

## 🏢 Clients Module (3 items)

### ❌ 6. Add ability to add/assign projects from clients page
**Status**: Pending (100% Frontend work)
**Description**: Cannot add or assign projects from client interface

**Backend Tasks:**
- [x] Project creation API already exists: `POST /api/projects`
- [x] Projects already linked to clients via `clientId` field

**Frontend Tasks:**
- [ ] Add "New Project" button on client detail page
- [ ] Create project creation form with clientId pre-filled
- [ ] Display "Projects" section on client detail page
- [ ] Show project list filtered by client
- [ ] Add click to navigate to project detail

### 🔄 7. Implement CRUD for client contacts
**Status**: In Progress (75% - Backend exists, Frontend needed)
**Description**: Cannot CRUD contacts for clients

**Backend Tasks:**
- [x] ClientContact schema exists in Prisma
- [x] API endpoints exist in clients.routes.ts:
  - `GET /api/clients/:id/contacts`
  - `POST /api/clients/:id/contacts`
  - `PUT /api/clients/:id/contacts/:contactId`
  - `DELETE /api/clients/:id/contacts/:contactId`

**Frontend Tasks:**
- [ ] Add "Contacts" section to client detail page
- [ ] Add "Add Contact" button
- [ ] Create contact create/edit modal form
- [ ] Display contact list with edit/delete buttons
- [ ] Add primary contact indicator

### 🔄 8. Ensure client delete is soft delete
**Status**: In Progress (75% - Backend done, Frontend pending)
**Description**: Ensure delete is a soft delete to preserve data

**Backend Tasks:**
- [x] Add `deletedAt` field to Client schema
- [x] Update all queries to filter out soft-deleted clients
- [x] Add `DELETE /api/clients/:id` (sets deletedAt)
- [x] Add `POST /api/clients/:id/restore` endpoint

**Frontend Tasks:**
- [ ] Add "Delete Client" button on client detail page
- [ ] Create confirmation dialog with warning
- [ ] Update client list to exclude deleted clients
- [ ] Show "Deleted" badge if viewing deleted client

---

## 📁 Projects Module (8 items)

### 🔄 9. Add team assignment to projects
**Status**: In Progress (Backend COMPLETE, Frontend needed)
**Description**: No way to assign teams to a project from projects page

**Backend Tasks:**
- [x] TeamProjectAssignment schema exists
- [x] API endpoint exists: `POST /api/teams/:id/projects` (from teams side)
- [x] Add reverse endpoint: `POST /api/projects/:id/teams` (from projects side)
- [x] Add DELETE endpoint: `DELETE /api/projects/:id/teams/:assignmentId`

**Frontend Tasks:**
- [ ] Add "Assign Team" button on project detail page
- [ ] Create team assignment form (team, role, dates)
- [ ] Display "Teams" section showing assigned teams
- [ ] Add "Remove Team" button for each assignment

### 🔄 10. Add people assignment to projects
**Status**: In Progress (Backend COMPLETE, Frontend needed)
**Description**: No way to assign people to a project from projects page

**Backend Tasks:**
- [x] ProjectAssignment schema exists
- [x] API endpoint exists: `POST /api/users/:id/projects` (from users side)
- [x] Add reverse endpoint: `POST /api/projects/:id/people` (from projects side)
- [x] Add DELETE endpoint: `DELETE /api/projects/:id/people/:userId`

**Frontend Tasks:**
- [ ] Add "Assign Person" button on project detail page
- [ ] Create person assignment form (person, role, hours, dates)
- [ ] Display "Team Members" section showing assigned people
- [ ] Add "Remove Person" button for each assignment
- [ ] Show resource allocation chart/timeline

### ❌ 11. Fix project budget field
**Status**: Pending (100% Frontend debugging)
**Description**: Budget for existing project is greyed out and cannot be set

**Backend Tasks:**
- [x] Budget fields exist in schema: `budgetHours`, `budgetCost`
- [x] Update endpoint accepts budget fields: `PUT /api/projects/:id`

**Frontend Tasks:**
- [ ] Investigate why budget fields are disabled in edit form
- [ ] Fix field state management/validation
- [ ] Enable budget fields for editing
- [ ] Test budget update functionality

### ❌ 12. Add project type pills and filters
**Status**: Pending (Backend ready, Frontend needed)
**Description**: Project type missing from display - show as pills on cards/rows and make filterable

**Backend Tasks:**
- [x] Project `type` field exists in schema
- [x] API returns type in project list/detail

**Frontend Tasks:**
- [ ] Create project type pill component (styled badge)
- [ ] Add pills to project cards on dashboard
- [ ] Add pills to project list rows
- [ ] Add project type filter dropdown to projects list page
- [ ] Add color coding for different types

### 🔄 13. Ensure project delete is soft delete
**Status**: In Progress (75% - Backend done, Frontend pending)
**Description**: Ensure delete is a soft delete to preserve data

**Backend Tasks:**
- [x] Add `deletedAt` field to Project schema
- [x] Update all queries to filter out soft-deleted projects
- [x] Add `DELETE /api/projects/:id` (sets deletedAt)
- [x] Add `POST /api/projects/:id/restore` endpoint

**Frontend Tasks:**
- [ ] Add "Delete Project" button on project detail page
- [ ] Create confirmation dialog with warning (check for tasks, etc.)
- [ ] Update project list to exclude deleted projects
- [ ] Show "Deleted" badge if viewing deleted project

### ❌ 14. Implement Milestones/Phases CRUD UI
**Status**: Pending (Backend exists, Frontend needed)
**Description**: Milestones/Phases feature fully missing from UI

**Backend Tasks:**
- [x] Milestone and ProjectPhase schemas exist
- [x] Full CRUD endpoints exist in projects.routes.ts:
  - GET/POST/PUT/DELETE for phases
  - GET/POST/PUT/DELETE for milestones

**Frontend Tasks:**
- [ ] Add "Milestones" tab/section to project detail page
- [ ] Add "Phases" tab/section to project detail page
- [ ] Create milestone create/edit modal form
- [ ] Create phase create/edit modal form
- [ ] Display milestone list with dates and status
- [ ] Add milestone timeline/Gantt visualization
- [ ] Add phase progress indicators

### 🔄 15. Enable edit and delete for tasks
**Status**: In Progress (75% - Backend done, Frontend pending)
**Description**: Tasks cannot be deleted or edited in UI

**Backend Tasks:**
- [x] Task update endpoint exists: `PUT /api/projects/:id/tasks/:taskId`
- [x] Task delete endpoint exists: `DELETE /api/projects/:id/tasks/:taskId` (soft delete)

**Frontend Tasks:**
- [ ] Add "Edit" button to task rows/cards
- [ ] Add "Delete" button to task rows/cards
- [ ] Create task edit modal form (reuse create form)
- [ ] Add delete confirmation dialog
- [ ] Update task list after edit/delete

### 🔄 16. Make tasks assignable to milestones
**Status**: In Progress (Backend COMPLETE, Frontend needed)
**Description**: Tasks should be assignable to one or more milestones

**Backend Tasks:**
- [x] Task schema has `milestoneId` field
- [x] Update `createTask` to accept milestoneId (includes validation)
- [x] Update `updateTask` to accept milestoneId
- [x] Add `milestoneId` to Zod validation schema

**Frontend Tasks:**
- [ ] Add milestone dropdown to task create form
- [ ] Add milestone dropdown to task edit form
- [ ] Display milestone badge on task cards/rows
- [ ] Add filter by milestone on tasks view

---

## ⚙️ Admin Module (1 item)

### 🔄 17. Add admin facility to recover soft deleted data
**Status**: In Progress (Backend COMPLETE, Frontend needed)
**Description**: Facility to recover ALL soft deleted data across all data objects

**Backend Tasks:**
- [x] Restore endpoints exist for all entities:
  - `POST /api/users/:id/restore`
  - `POST /api/clients/:id/restore`
  - `POST /api/projects/:id/restore`
  - `POST /api/projects/:id/tasks/:taskId/restore`
- [x] Add endpoints to LIST soft-deleted items:
  - `GET /api/admin/deleted/users`
  - `GET /api/admin/deleted/clients`
  - `GET /api/admin/deleted/projects`
  - `GET /api/admin/deleted/tasks` (supports projectId filter)

**Frontend Tasks:**
- [ ] Create admin "Deleted Items" page (route: `/admin/deleted`)
- [ ] Add tabs for different entity types (Users, Clients, Projects, Tasks)
- [ ] Display deleted items with deletion date and deletedBy user
- [ ] Add "Restore" button for each item
- [ ] Add bulk select and bulk restore functionality
- [ ] Add search/filter within deleted items
- [ ] Show confirmation on successful restore

---

## 📝 Notes

### Recommended Implementation Order:
1. **Soft Deletes** (items 4, 8, 13, 15) - Schema changes first
2. **People Module** (items 1, 2, 3) - Foundation for assignments
3. **Teams Module** (item 5) - Builds on people
4. **Projects Module** (items 9, 10, 11, 12, 14, 16) - Most complex
5. **Clients Module** (items 6, 7) - Quick wins
6. **Admin Module** (item 17) - Final recovery tool

### Schema Changes Required:
- [x] User: Add `deletedAt` DateTime? ✅ COMPLETE
- [x] Client: Add `deletedAt` DateTime? ✅ COMPLETE
- [x] Project: Add `deletedAt` DateTime? ✅ COMPLETE
- [x] Task: Add `deletedAt` DateTime?, Add milestone relation ✅ COMPLETE
- [ ] Verify TeamMember, ProjectAssignment, Contact schemas exist

---

## 🔧 Current Work

**Working On**: People Module - Team & Project Assignments
**Last Updated**: 2025-11-29 16:30

### ✅ Completed This Session:

**Items 4, 8, 13, 15 - Soft Delete Implementation (Backend Complete)**
- Added `deletedAt` timestamp field to User, Client, Project, Task models
- Created and applied database migration
- Updated all list/get queries to filter out soft-deleted items
- Implemented `deleteX()` functions to set `deletedAt` instead of hard delete
- Implemented `restoreX()` functions to clear `deletedAt` and restore items
- Added API endpoints for all restore operations:
  - `POST /api/users/:id/restore` - Restore deleted user
  - `POST /api/clients/:id/restore` - Restore deleted client
  - `POST /api/projects/:id/restore` - Restore deleted project
  - `POST /api/projects/:id/tasks/:taskId/restore` - Restore deleted task

**Items 1, 2, 3 - People Module (Backend Complete)**
- Enhanced `getUserById()` to include team memberships and project assignments
- Added team membership management:
  - `POST /api/users/:id/teams` - Add user to team
  - `DELETE /api/users/:id/teams/:teamId` - Remove user from team
- Added project assignment management:
  - `POST /api/users/:id/projects` - Assign user to project
  - `DELETE /api/users/:id/projects/:projectId` - Remove user from project
- User details now include:
  - `teamMemberships[]` - All teams user belongs to with role and team details
  - `projectAssignments[]` - All projects user is assigned to with allocation and project details

**Item 16 - Task-Milestone Relation (Partial)**
- Added `milestoneId` field to Task schema
- Added foreign key constraint and relation
- Backend can now accept milestone ID when creating/updating tasks
- Remaining: Frontend UI to select milestone

### 🎯 Ready for Testing:

**Team Assignments** (GET returns teams, POST/DELETE for management):
- `GET /api/users/{id}` - Now includes `teamMemberships` array
- `POST /api/users/{id}/teams` - Body: `{ "teamId": "uuid", "role": "MEMBER|SENIOR|LEAD" }`
- `DELETE /api/users/{id}/teams/{teamId}` - Remove from team

**Project Assignments** (GET returns projects, POST/DELETE for management):
- `GET /api/users/{id}` - Now includes `projectAssignments` array
- `POST /api/users/{id}/projects` - Body: `{ "projectId": "uuid", "role": "Developer", "allocatedHours": 40, "startDate": "2025-01-01" }`
- `DELETE /api/users/{id}/projects/{projectId}` - Remove from project

### 📋 Recommended Next Steps:

**Option A: Complete Backend First (finish all APIs)**
- Item 9: Add `POST /api/projects/:id/teams` endpoint
- Item 10: Add `POST /api/projects/:id/people` endpoint
- Item 16: Update createTask/updateTask to accept milestoneId
- Item 17: Add LIST endpoints for deleted items

**Option B: Start Frontend Work (make features usable)**
- Pick ONE module (People, Clients, or Projects)
- Implement all frontend UI for that module's features
- Get it fully working end-to-end
- Then move to next module

**Recommendation**: Option B - Start frontend work to make features usable!
Most backend APIs are done. Users can't see/use anything until we build the UI.

---

**Note**: This file will be deleted when all tasks are complete.
