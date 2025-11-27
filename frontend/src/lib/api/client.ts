// API Client for PMO Platform
// Handles all HTTP requests to the backend with JWT authentication

// Use relative path - Vite proxy handles routing to backend
const API_BASE = '/api';

interface ApiError {
  message: string;
  statusCode: number;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      ...options.headers,
    };

    // Only set Content-Type for requests with a body
    if (options.body) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'An error occurred',
        statusCode: response.status,
      }));

      // Handle session termination/expiration - force logout
      if (response.status === 401 && token) {
        this.setToken(null);
        // Redirect to login page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login?reason=session_expired';
        }
      }

      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth endpoints
  auth = {
    login: (email: string, password: string) =>
      this.request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (data: RegisterData) =>
      this.request<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: () => this.request<User>('/auth/me'),
  };

  // Users endpoints
  users = {
    list: (params?: ListParams) =>
      this.request<PaginatedResponse<User>>(`/users${buildQuery(params)}`),

    get: async (id: string) => {
      const res = await this.request<{ user: User }>(`/users/${id}`);
      return res.user;
    },

    create: async (data: CreateUserData) => {
      const res = await this.request<{ user: User }>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.user;
    },

    update: async (id: string, data: UpdateUserData) => {
      const res = await this.request<{ user: User }>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return res.user;
    },

    delete: (id: string) =>
      this.request<void>(`/users/${id}`, { method: 'DELETE' }),

    getByRole: (role: string) =>
      this.request<User[]>(`/users/role/${role}`),

    getManagers: async () => {
      const res = await this.request<{ managers: User[] }>('/users/managers');
      return res.managers;
    },

    // User preferences
    getPreferences: async () => {
      const res = await this.request<{ preferences: UserPreferences }>('/users/me/preferences');
      return res.preferences;
    },

    updatePreferences: async (data: Partial<UserPreferences>) => {
      const res = await this.request<{ preferences: UserPreferences }>('/users/me/preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return res.preferences;
    },

    // Password change
    changePassword: (currentPassword: string, newPassword: string) =>
      this.request<{ success: boolean; message: string }>('/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),

    // Get dropdown lists (available to all authenticated users)
    getDropdowns: () =>
      this.request<DropdownLists>('/users/dropdowns'),
  };

  // Clients endpoints
  clients = {
    list: (params?: ListParams) =>
      this.request<PaginatedResponse<Client>>(`/clients${buildQuery(params)}`),

    get: (id: string) => this.request<Client>(`/clients/${id}`),

    create: (data: CreateClientData) =>
      this.request<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateClientData) =>
      this.request<Client>(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.request<void>(`/clients/${id}`, { method: 'DELETE' }),

    getIndustries: () => this.request<string[]>('/clients/industries'),

    // Contacts
    contacts: {
      list: (clientId: string) =>
        this.request<ClientContact[]>(`/clients/${clientId}/contacts`),

      create: (clientId: string, data: CreateContactData) =>
        this.request<ClientContact>(`/clients/${clientId}/contacts`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      update: (clientId: string, contactId: string, data: UpdateContactData) =>
        this.request<ClientContact>(`/clients/${clientId}/contacts/${contactId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),

      delete: (clientId: string, contactId: string) =>
        this.request<void>(`/clients/${clientId}/contacts/${contactId}`, {
          method: 'DELETE',
        }),
    },

    // Opportunities
    opportunities: {
      list: (clientId: string) =>
        this.request<ClientOpportunity[]>(`/clients/${clientId}/opportunities`),

      create: (clientId: string, data: CreateOpportunityData) =>
        this.request<ClientOpportunity>(`/clients/${clientId}/opportunities`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      update: (clientId: string, oppId: string, data: UpdateOpportunityData) =>
        this.request<ClientOpportunity>(`/clients/${clientId}/opportunities/${oppId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),

      delete: (clientId: string, oppId: string) =>
        this.request<void>(`/clients/${clientId}/opportunities/${oppId}`, {
          method: 'DELETE',
        }),
    },
  };

  // Projects endpoints
  projects = {
    list: (params?: ProjectListParams) =>
      this.request<PaginatedResponse<Project>>(`/projects${buildQuery(params)}`),

    get: (id: string) => this.request<ProjectDetail>(`/projects/${id}`),

    create: (data: CreateProjectData) =>
      this.request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateProjectData) =>
      this.request<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.request<void>(`/projects/${id}`, { method: 'DELETE' }),

    // Phases
    phases: {
      list: (projectId: string) =>
        this.request<Phase[]>(`/projects/${projectId}/phases`),

      create: (projectId: string, data: CreatePhaseData) =>
        this.request<Phase>(`/projects/${projectId}/phases`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      update: (projectId: string, phaseId: string, data: UpdatePhaseData) =>
        this.request<Phase>(`/projects/${projectId}/phases/${phaseId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),

      delete: (projectId: string, phaseId: string) =>
        this.request<void>(`/projects/${projectId}/phases/${phaseId}`, {
          method: 'DELETE',
        }),
    },

    // Milestones
    milestones: {
      list: (projectId: string) =>
        this.request<Milestone[]>(`/projects/${projectId}/milestones`),

      create: (projectId: string, data: CreateMilestoneData) =>
        this.request<Milestone>(`/projects/${projectId}/milestones`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      update: (projectId: string, milestoneId: string, data: UpdateMilestoneData) =>
        this.request<Milestone>(`/projects/${projectId}/milestones/${milestoneId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),

      delete: (projectId: string, milestoneId: string) =>
        this.request<void>(`/projects/${projectId}/milestones/${milestoneId}`, {
          method: 'DELETE',
        }),
    },

    // Tasks
    tasks: {
      list: (projectId: string, params?: TaskListParams) =>
        this.request<Task[]>(`/projects/${projectId}/tasks${buildQuery(params)}`),

      get: (projectId: string, taskId: string) =>
        this.request<TaskDetail>(`/projects/${projectId}/tasks/${taskId}`),

      create: (projectId: string, data: CreateTaskData) =>
        this.request<Task>(`/projects/${projectId}/tasks`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      update: (projectId: string, taskId: string, data: UpdateTaskData) =>
        this.request<Task>(`/projects/${projectId}/tasks/${taskId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),

      delete: (projectId: string, taskId: string) =>
        this.request<void>(`/projects/${projectId}/tasks/${taskId}`, {
          method: 'DELETE',
        }),
    },

    // Assignments
    assignments: {
      list: (projectId: string) =>
        this.request<ProjectAssignment[]>(`/projects/${projectId}/assignments`),

      create: (projectId: string, data: CreateAssignmentData) =>
        this.request<ProjectAssignment>(`/projects/${projectId}/assignments`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      update: (projectId: string, assignmentId: string, data: UpdateAssignmentData) =>
        this.request<ProjectAssignment>(`/projects/${projectId}/assignments/${assignmentId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),

      delete: (projectId: string, assignmentId: string) =>
        this.request<void>(`/projects/${projectId}/assignments/${assignmentId}`, {
          method: 'DELETE',
        }),
    },
  };

  // Resources endpoints
  resources = {
    allocations: (params?: AllocationParams) =>
      this.request<AllocationOverview>(`/resources/allocations${buildQuery(params)}`),

    getByProject: (projectId: string) =>
      this.request<ResourceAllocation[]>(`/resources/projects/${projectId}`),

    getByUser: (userId: string) =>
      this.request<ResourceAllocation[]>(`/resources/users/${userId}`),

    getRoles: () => this.request<string[]>('/resources/roles'),
  };

  // Capacity endpoints
  capacity = {
    availability: {
      list: (params?: AvailabilityParams) =>
        this.request<UserAvailability[]>(`/capacity/availability${buildQuery(params)}`),

      get: (userId: string) =>
        this.request<UserAvailability>(`/capacity/availability/${userId}`),

      update: (userId: string, data: UpdateAvailabilityData) =>
        this.request<UserAvailability>(`/capacity/availability/${userId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
    },

    timeOff: {
      list: (params?: TimeOffParams) =>
        this.request<PaginatedResponse<TimeOffRequest>>(`/capacity/time-off${buildQuery(params)}`),

      create: async (data: CreateTimeOffData) => {
        const res = await this.request<{ timeOff: TimeOffRequest }>('/capacity/time-off', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.timeOff;
      },

      approve: async (id: string) => {
        const res = await this.request<{ timeOff: TimeOffRequest }>(`/capacity/time-off/${id}/approve`, {
          method: 'POST',
        });
        return res.timeOff;
      },

      reject: async (id: string) => {
        const res = await this.request<{ timeOff: TimeOffRequest }>(`/capacity/time-off/${id}/reject`, {
          method: 'POST',
        });
        return res.timeOff;
      },

      cancel: (id: string) =>
        this.request<{ success: boolean }>(`/capacity/time-off/${id}`, {
          method: 'DELETE',
        }),

      delete: (id: string) =>
        this.request<{ success: boolean }>(`/capacity/time-off/${id}`, { method: 'DELETE' }),
    },

    utilization: async (params?: UtilizationParams) => {
      const res = await this.request<{ utilization: UtilizationReport }>(`/capacity/utilization${buildQuery(params)}`);
      return res.utilization;
    },
  };

  // Time tracking endpoints
  timetracking = {
    entries: {
      list: (params?: TimeEntryParams) =>
        this.request<PaginatedResponse<TimeEntry>>(`/timetracking/entries${buildQuery(params)}`),

      get: async (id: string) => {
        const res = await this.request<{ entry: TimeEntry }>(`/timetracking/entries/${id}`);
        return res.entry;
      },

      create: async (data: CreateTimeEntryData) => {
        const res = await this.request<{ entry: TimeEntry }>('/timetracking/entries', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.entry;
      },

      update: async (id: string, data: UpdateTimeEntryData) => {
        const res = await this.request<{ entry: TimeEntry }>(`/timetracking/entries/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return res.entry;
      },

      delete: (id: string) =>
        this.request<void>(`/timetracking/entries/${id}`, { method: 'DELETE' }),

      addSession: async (entryId: string, data: { startTime: string; endTime: string; description?: string; isBillable?: boolean }) => {
        const res = await this.request<{ entry: TimeEntry }>(`/timetracking/entries/${entryId}/sessions`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.entry;
      },
    },

    sessions: {
      update: async (sessionId: string, data: { startTime: string; endTime: string; description?: string; isBillable?: boolean }) => {
        const res = await this.request<{ entry: TimeEntry }>(`/timetracking/sessions/${sessionId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return res.entry;
      },

      delete: async (sessionId: string) => {
        const res = await this.request<{ entry: TimeEntry }>(`/timetracking/sessions/${sessionId}`, {
          method: 'DELETE',
        });
        return res.entry;
      },
    },

    timer: {
      active: async () => {
        const res = await this.request<{ activeEntry: ActiveTimer | null }>('/timetracking/active');
        return res.activeEntry;
      },

      start: async (data: StartTimerData) => {
        const res = await this.request<{ activeEntry: ActiveTimer }>('/timetracking/start', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.activeEntry;
      },

      stop: async () => {
        const res = await this.request<{ entry: TimeEntry }>('/timetracking/stop', {
          method: 'POST',
        });
        return res.entry;
      },

      update: async (data: { taskId?: string | null; description?: string | null }) => {
        const res = await this.request<{ activeEntry: ActiveTimer }>('/timetracking/active', {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return res.activeEntry;
      },

      discard: () =>
        this.request<{ success: boolean }>('/timetracking/active', { method: 'DELETE' }),
    },

    reports: {
      daily: (date: string, userId?: string) =>
        this.request<DailyReport>(`/timetracking/reports/daily${buildQuery({ date, userId })}`),

      weekly: (startDate: string, userId?: string) =>
        this.request<WeeklyReport>(`/timetracking/reports/weekly${buildQuery({ startDate, userId })}`),

      monthly: (year: number, month: number, userId?: string) =>
        this.request<MonthlyReport>(`/timetracking/reports/monthly${buildQuery({ year, month, userId })}`),
    },
  };

  // Analytics endpoints (backend wraps responses in {dashboard:...}, {summary:...}, etc.)
  analytics = {
    dashboard: async () => {
      const res = await this.request<{ dashboard: DashboardData }>('/analytics/dashboard');
      return res.dashboard;
    },

    projectsSummary: async (params?: AnalyticsParams) => {
      const res = await this.request<{ summary: ProjectsSummary }>(`/analytics/projects/summary${buildQuery(params)}`);
      return res.summary;
    },

    capacityOverview: async (params?: AnalyticsParams) => {
      const res = await this.request<{ overview: CapacityAnalytics }>(`/analytics/capacity/overview${buildQuery(params)}`);
      return res.overview;
    },

    timeSummary: async (params?: TimeAnalyticsParams) => {
      const res = await this.request<{ summary: TimeSummary }>(`/analytics/time/summary${buildQuery(params)}`);
      return res.summary;
    },

    utilization: async (params?: AnalyticsParams) => {
      const res = await this.request<{ utilization: UtilizationAnalytics }>(`/analytics/users/utilization${buildQuery(params)}`);
      return res.utilization;
    },
  };

  // Notifications endpoints
  notifications = {
    list: (params?: NotificationParams) =>
      this.request<PaginatedResponse<Notification>>(`/notifications${buildQuery(params)}`),

    get: (id: string) =>
      this.request<Notification>(`/notifications/${id}`),

    markRead: (id: string) =>
      this.request<Notification>(`/notifications/${id}/read`, { method: 'PUT' }),

    markAllRead: () =>
      this.request<void>('/notifications/read-all', { method: 'PUT' }),

    delete: (id: string) =>
      this.request<void>(`/notifications/${id}`, { method: 'DELETE' }),

    unreadCount: () =>
      this.request<{ count: number }>('/notifications/unread-count'),
  };

  // Admin endpoints
  admin = {
    dashboard: () =>
      this.request<AdminDashboardStats>('/admin/dashboard'),

    health: () =>
      this.request<SystemHealth>('/admin/health'),

    // Audit logs
    auditLogs: {
      list: (params?: AuditLogParams) =>
        this.request<AuditLogResponse>(`/admin/audit-logs${buildQuery(params)}`),

      get: (id: string) =>
        this.request<{ log: AuditLog }>(`/admin/audit-logs/${id}`),

      stats: (params?: { startDate?: string; endDate?: string }) =>
        this.request<AuditLogStats>(`/admin/audit-logs/stats${buildQuery(params)}`),
    },

    // Login attempts
    loginAttempts: {
      list: (params?: LoginAttemptParams) =>
        this.request<LoginAttemptResponse>(`/admin/login-attempts${buildQuery(params)}`),

      stats: (hours?: number) =>
        this.request<LoginAttemptStats>(`/admin/login-attempts/stats${buildQuery({ hours })}`),
    },

    // Settings
    settings: {
      getAll: () =>
        this.request<{ settings: AdminSettings }>('/admin/settings'),

      getByCategory: (category: SettingCategory) =>
        this.request<{ category: string; settings: CategorySettings }>(`/admin/settings/${category}`),

      update: (category: SettingCategory, key: string, value: unknown) =>
        this.request<{ setting: SystemSetting }>(`/admin/settings/${category}/${key}`, {
          method: 'PUT',
          body: JSON.stringify({ value }),
        }),

      resetCategory: (category: SettingCategory) =>
        this.request<{ category: string; settings: CategorySettings; message: string }>(`/admin/settings/${category}/reset`, {
          method: 'POST',
        }),
    },

    // Sessions
    sessions: {
      list: (params?: SessionParams) =>
        this.request<SessionResponse>(`/admin/sessions${buildQuery(params)}`),

      getUserSessions: (userId: string) =>
        this.request<{ sessions: UserSession[] }>(`/admin/sessions/user/${userId}`),

      terminate: (sessionId: string) =>
        this.request<{ success: boolean; message: string }>(`/admin/sessions/${sessionId}`, {
          method: 'DELETE',
        }),

      terminateAllUserSessions: (userId: string) =>
        this.request<{ success: boolean; terminatedCount: number }>(`/admin/sessions/user/${userId}`, {
          method: 'DELETE',
        }),
    },

    // User management (admin-specific actions)
    users: {
      unlock: (userId: string) =>
        this.request<{ success: boolean; email: string }>(`/admin/users/${userId}/unlock`, {
          method: 'POST',
        }),

      resetPassword: (userId: string, newPassword: string) =>
        this.request<{ success: boolean; message: string }>(`/admin/users/${userId}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ newPassword }),
        }),
    },

    // Dropdown lists management
    dropdowns: {
      getAll: () =>
        this.request<DropdownLists>('/admin/dropdowns'),

      get: (name: string) =>
        this.request<Record<string, string[]>>(`/admin/dropdowns/${name}`),

      update: (name: string, values: string[]) =>
        this.request<Record<string, string[]>>(`/admin/dropdowns/${name}`, {
          method: 'PUT',
          body: JSON.stringify({ values }),
        }),

      addItem: (name: string, value: string) =>
        this.request<Record<string, string[]>>(`/admin/dropdowns/${name}/items`, {
          method: 'POST',
          body: JSON.stringify({ value }),
        }),

      removeItem: (name: string, value: string) =>
        this.request<Record<string, string[]>>(`/admin/dropdowns/${name}/items/${encodeURIComponent(value)}`, {
          method: 'DELETE',
        }),
    },

    // Test data management (SUPER_ADMIN only)
    testData: {
      toggle: (enabled: boolean) =>
        this.request<{ success: boolean; message: string; output?: string }>('/admin/test-data', {
          method: 'POST',
          body: JSON.stringify({ enabled }),
        }),
    },
  };

  // Teams endpoints
  teams = {
    list: (params?: TeamListParams) =>
      this.request<TeamListResponse>(`/teams${buildQuery(params)}`),

    get: (id: string) =>
      this.request<TeamDetail>(`/teams/${id}`),

    create: (data: CreateTeamData) =>
      this.request<Team>('/teams', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateTeamData) =>
      this.request<Team>(`/teams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.request<void>(`/teams/${id}`, { method: 'DELETE' }),

    // Team members
    members: {
      list: async (teamId: string) => {
        const res = await this.request<{ members: TeamMember[] }>(`/teams/${teamId}/members`);
        return res.members;
      },

      add: (teamId: string, userId: string, role?: TeamMemberRole) =>
        this.request<TeamMember>(`/teams/${teamId}/members`, {
          method: 'POST',
          body: JSON.stringify({ userId, role }),
        }),

      updateRole: (teamId: string, userId: string, role: TeamMemberRole) =>
        this.request<TeamMember>(`/teams/${teamId}/members/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({ role }),
        }),

      remove: (teamId: string, userId: string) =>
        this.request<void>(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
    },

    // Team project assignments
    projects: {
      list: async (teamId: string) => {
        const res = await this.request<{ assignments: TeamProjectAssignment[] }>(`/teams/${teamId}/projects`);
        return res.assignments;
      },

      assign: (teamId: string, data: AssignTeamToProjectData) =>
        this.request<TeamProjectAssignment>(`/teams/${teamId}/projects`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      update: (teamId: string, assignmentId: string, data: UpdateTeamAssignmentData) =>
        this.request<TeamProjectAssignment>(`/teams/${teamId}/projects/${assignmentId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),

      remove: (teamId: string, assignmentId: string) =>
        this.request<void>(`/teams/${teamId}/projects/${assignmentId}`, { method: 'DELETE' }),
    },

    // Team capacity
    capacity: (teamId: string) =>
      this.request<TeamCapacity>(`/teams/${teamId}/capacity`),
  };
}

// Helper to build query strings
function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

// Export singleton instance
export const api = new ApiClient();

// Type definitions
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'PMO_MANAGER' | 'PROJECT_MANAGER' | 'RESOURCE_MANAGER' | 'TEAM_MEMBER' | 'VIEWER';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  jobTitle?: string;
  department?: string;
  phone?: string;
  avatarUrl?: string;
  managerId?: string;
  manager?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  // Geographic and employment
  country?: string;
  region?: string;
  employmentType?: EmploymentType;
  // Capacity
  defaultWeeklyHours?: number;
  maxWeeklyHours?: number;
  timezone?: string;
  // Skills and rates
  skills?: string[];
  hourlyRate?: number;
  billableRate?: number;
  // Meta
  preferences?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
  status?: UserStatus;
  jobTitle?: string;
  department?: string;
  phone?: string;
  managerId?: string;
  // Geographic and employment
  country?: string;
  region?: string;
  employmentType?: EmploymentType;
  // Capacity
  defaultWeeklyHours?: number;
  maxWeeklyHours?: number;
  timezone?: string;
  // Skills and rates
  skills?: string[];
  hourlyRate?: number;
  billableRate?: number;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  status?: UserStatus;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  phone?: string | null;
  managerId?: string | null;
  // Geographic and employment
  country?: string | null;
  region?: string | null;
  employmentType?: EmploymentType;
  // Capacity
  defaultWeeklyHours?: number;
  maxWeeklyHours?: number;
  timezone?: string;
  // Skills and rates
  skills?: string[];
  hourlyRate?: number | null;
  billableRate?: number | null;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    emailNotifications?: boolean;
    projectUpdates?: boolean;
    taskAssignments?: boolean;
    timeReminders?: boolean;
    weeklyDigest?: boolean;
  };
}

export interface Client {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  notes?: string;
  salesforceAccountId?: string;
  salesforceAccountName?: string;
  salesforceOwnerId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    projects: number;
    contacts: number;
  };
}

export interface CreateClientData {
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  notes?: string;
  salesforceAccountId?: string;
  salesforceAccountName?: string;
  salesforceOwnerId?: string;
}

export interface UpdateClientData extends Partial<CreateClientData> {
  isActive?: boolean;
}

export interface ClientContact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  isPrimary: boolean;
  salesforceContactId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  isPrimary?: boolean;
  salesforceContactId?: string;
}

export interface UpdateContactData extends Partial<CreateContactData> {}

export interface ClientOpportunity {
  id: string;
  clientId: string;
  name: string;
  value?: number;
  stage: string;
  closeDate?: string;
  probability?: number;
  salesforceOpportunityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityData {
  name: string;
  value?: number;
  stage: string;
  closeDate?: string;
  probability?: number;
  salesforceOpportunityId?: string;
}

export interface UpdateOpportunityData extends Partial<CreateOpportunityData> {}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate?: string;
  endDate?: string;
  budget?: number;
  clientId: string;
  client?: Pick<Client, 'id' | 'name'>;
  managerId?: string;
  manager?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  createdAt: string;
  updatedAt: string;
  _count?: {
    phases: number;
    tasks: number;
    assignments: number;
  };
}

export interface ProjectDetail extends Project {
  phases: Phase[];
  milestones: Milestone[];
  assignments: ProjectAssignment[];
  teamAssignments?: TeamProjectAssignment[];
}

export interface CreateProjectData {
  name: string;
  code: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string;
  endDate?: string;
  budget?: number;
  clientId: string;
  managerId?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  order: number;
  startDate?: string;
  endDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhaseData {
  name: string;
  description?: string;
  order?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface UpdatePhaseData extends Partial<CreatePhaseData> {}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilestoneData {
  name: string;
  description?: string;
  dueDate: string;
}

export interface UpdateMilestoneData extends Partial<CreateMilestoneData> {
  isCompleted?: boolean;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  projectId: string;
  phaseId?: string;
  milestoneId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  phase?: Pick<Phase, 'id' | 'name'>;
  milestone?: Pick<Milestone, 'id' | 'name'>;
  _count?: {
    assignments: number;
    timeEntries: number;
  };
}

export interface TaskDetail extends Task {
  assignments: TaskAssignment[];
  dependencies: TaskDependency[];
}

export interface CreateTaskData {
  title: string;
  description?: string;
  phaseId?: string;
  milestoneId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  estimatedHours?: number;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {}

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  role?: string;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnId: string;
  type: string;
  dependsOn: Pick<Task, 'id' | 'title' | 'status'>;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  userId: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl' | 'title'>;
  role: string;
  allocation: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentData {
  userId: string;
  role: string;
  allocation?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateAssignmentData extends Partial<CreateAssignmentData> {}

export interface ResourceAllocation {
  userId: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'title'>;
  projects: {
    projectId: string;
    projectName: string;
    role: string;
    allocation: number;
  }[];
  totalAllocation: number;
}

export interface AllocationOverview {
  users: ResourceAllocation[];
  summary: {
    totalUsers: number;
    overAllocated: number;
    underAllocated: number;
    optimal: number;
  };
}

export interface UserAvailability {
  userId: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName'>;
  weeklyHours: number;
  effectiveDate: string;
  overrides: AvailabilityOverride[];
}

export interface AvailabilityOverride {
  id: string;
  date: string;
  hours: number;
  reason?: string;
}

export interface UpdateAvailabilityData {
  weeklyHours?: number;
  overrides?: {
    date: string;
    hours: number;
    reason?: string;
  }[];
}

export type TimeOffStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type TimeOffType = 'VACATION' | 'SICK' | 'PERSONAL' | 'OTHER';

export interface TimeOffRequest {
  id: string;
  userId: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName'>;
  type: TimeOffType;
  startDate: string;
  endDate: string;
  hours: number;
  status: TimeOffStatus;
  reason?: string;
  approvedById?: string;
  approvedBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeOffData {
  type: TimeOffType;
  startDate: string;
  endDate: string;
  hours: number;
  reason?: string;
}

export interface ApproveTimeOffData {
  comment?: string;
}

export interface RejectTimeOffData {
  reason: string;
}

export interface UtilizationReport {
  users: {
    userId: string;
    user: Pick<User, 'id' | 'firstName' | 'lastName'>;
    availableHours: number;
    allocatedHours: number;
    loggedHours: number;
    utilization: number;
  }[];
  summary: {
    totalAvailable: number;
    totalAllocated: number;
    totalLogged: number;
    averageUtilization: number;
  };
}

export interface CapacityOverview {
  startDate: string;
  endDate: string;
  users: {
    userId: string;
    user: Pick<User, 'id' | 'firstName' | 'lastName'>;
    capacity: number;
    allocated: number;
    available: number;
    timeOff: number;
  }[];
}

export interface TimeEntrySession {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  isBillable: boolean;
  description?: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  taskId: string;
  task?: Pick<Task, 'id' | 'title' | 'projectId'> & { project?: Pick<Project, 'id' | 'name' | 'code'> };
  date: string;
  hours: number;
  billableHours: number;
  isTimerBased: boolean; // True if created from timer, false if manual
  sessions?: TimeEntrySession[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeEntryData {
  taskId: string;
  date: string;
  hours: number;
  description?: string;
  isBillable?: boolean;
}

export interface UpdateTimeEntryData {
  taskId?: string; // Allow changing task for manual entries
  hours?: number; // For manual entries only
}

export interface ActiveTimer {
  id: string;
  userId: string;
  taskId: string;
  task: Pick<Task, 'id' | 'name'> & { project: Pick<Project, 'id' | 'name'> };
  startTime: string;
  description?: string;
  elapsedSeconds?: number;
}

export interface StartTimerData {
  taskId: string;
  description?: string;
}

export interface DailyReport {
  date: string;
  entries: TimeEntry[];
  totalHours: number;
  billableHours: number;
}

export interface WeeklyReport {
  startDate: string;
  endDate: string;
  days: DailyReport[];
  totalHours: number;
  billableHours: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  weeks: WeeklyReport[];
  totalHours: number;
  billableHours: number;
  byProject: {
    projectId: string;
    projectName: string;
    hours: number;
    billableHours: number;
  }[];
}

export interface DashboardData {
  user: {
    activeTimer: {
      startTime: string;
      taskId: string | null;
      description: string | null;
      elapsedSeconds: number;
    } | null;
    hoursLoggedToday: number;
  };
  myAssignments: {
    id: string;
    project: Pick<Project, 'id' | 'name' | 'code' | 'status'>;
    role: string;
    allocatedHours: number;
  }[];
  myTasks: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
    project: Pick<Project, 'id' | 'name' | 'code'>;
  }[];
  upcomingMilestones: {
    id: string;
    name: string;
    dueDate: string | null;
    isCompleted: boolean;
    project: Pick<Project, 'id' | 'name' | 'code'>;
  }[];
  teamStats: {
    totalProjects: number;
    activeProjects: number;
    totalUsers: number;
    activeUsers: number;
    pendingTimeOff: number;
  } | null;
}

export interface ProjectsSummary {
  total: number;
  byStatus: Record<ProjectStatus, number>;
  byPriority: Record<ProjectPriority, number>;
  recentlyUpdated: Project[];
}

export interface CapacityAnalytics {
  totalCapacity: number;
  totalAllocated: number;
  utilizationRate: number;
  byDepartment: {
    department: string;
    capacity: number;
    allocated: number;
    utilization: number;
  }[];
}

export interface TimeSummary {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  byProject: {
    projectId: string;
    projectName: string;
    hours: number;
  }[];
  byUser: {
    userId: string;
    userName: string;
    hours: number;
  }[];
}

export interface UtilizationAnalytics {
  averageUtilization: number;
  byUser: {
    userId: string;
    userName: string;
    utilization: number;
  }[];
  trend: {
    period: string;
    utilization: number;
  }[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// Query parameter types
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProjectListParams extends ListParams {
  status?: ProjectStatus;
  priority?: ProjectPriority;
  clientId?: string;
  managerId?: string;
}

export interface TaskListParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  phaseId?: string;
  assigneeId?: string;
}

export interface AllocationParams {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}

export interface AvailabilityParams {
  startDate?: string;
  endDate?: string;
}

export interface TimeOffParams extends ListParams {
  status?: TimeOffStatus;
  type?: TimeOffType;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface UtilizationParams {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}

export interface OverviewParams {
  startDate: string;
  endDate: string;
}

export interface TimeEntryParams extends ListParams {
  userId?: string;
  taskId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  isBillable?: boolean;
}

export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
}

export interface TimeAnalyticsParams extends AnalyticsParams {
  projectId?: string;
  userId?: string;
}

export interface NotificationParams extends ListParams {
  isRead?: boolean;
  type?: string;
}

// Admin types
export type SettingCategory = 'security' | 'notifications' | 'platform' | 'integrations';
export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type AuditStatus = 'SUCCESS' | 'FAILURE';

export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    newThisWeek: number;
    byRole: { role: Role; count: number }[];
  };
  sessions: {
    active: number;
  };
  audit: AuditLogStats;
  logins: LoginAttemptStats;
  recentActivity: {
    id: string;
    action: string;
    entityType: string | null;
    severity: string;
    status: string;
    createdAt: string;
    user: { id: string; firstName: string; lastName: string; email: string } | null;
  }[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded';
  checks: Record<string, { status: 'ok' | 'error'; message?: string }>;
  timestamp: string;
}

export interface DropdownLists {
  industries: string[];
  projectTypes: string[];
  skillCategories: string[];
  departments: string[];
  regions: string[];
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  severity: AuditSeverity;
  status: AuditStatus;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  errorDetail: string | null;
  createdAt: string;
  user: { id: string; email: string; firstName: string; lastName: string } | null;
}

export interface AuditLogParams extends ListParams {
  userId?: string;
  action?: string;
  entityType?: string;
  severity?: AuditSeverity;
  status?: AuditStatus;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogStats {
  total: number;
  byAction: { action: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export interface LoginAttempt {
  id: string;
  email: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  failReason: string | null;
  createdAt: string;
}

export interface LoginAttemptParams extends ListParams {
  email?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface LoginAttemptResponse {
  attempts: LoginAttempt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginAttemptStats {
  total: number;
  successful: number;
  failed: number;
  topFailedEmails: { email: string; count: number }[];
}

export interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: unknown;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface SettingValue {
  value: unknown;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface CategorySettings {
  [key: string]: SettingValue;
}

export interface AdminSettings {
  security: CategorySettings;
  notifications: CategorySettings;
  platform: CategorySettings;
  integrations: CategorySettings;
}

export interface UserSession {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActive: string;
  expiresAt: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  };
}

export interface SessionParams extends ListParams {
  userId?: string;
}

export interface SessionResponse {
  sessions: UserSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Team types
export type TeamMemberRole = 'LEAD' | 'SENIOR' | 'MEMBER';
export type TeamAssignmentStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Team {
  id: string;
  name: string;
  description?: string;
  skills: string[];
  isActive: boolean;
  leadId?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    projectAssignments: number;
  };
}

export interface TeamMember {
  id: string;
  role: TeamMemberRole;
  joinedAt: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl' | 'jobTitle'> & {
    skills?: string[];
    maxWeeklyHours?: number;
  };
}

export interface TeamProjectAssignment {
  id: string;
  allocatedHours: number;
  startDate: string;
  endDate?: string;
  status: TeamAssignmentStatus;
  team?: Pick<Team, 'id' | 'name' | 'skills'> & { _count?: { members: number } };
  project?: Pick<Project, 'id' | 'name' | 'code' | 'status'> & {
    client?: Pick<Client, 'id' | 'name'>;
  };
}

export interface TeamDetail extends Team {
  members: TeamMember[];
  projectAssignments: TeamProjectAssignment[];
}

export interface TeamListParams extends ListParams {
  isActive?: boolean;
}

export interface TeamListResponse {
  data: Team[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateTeamData {
  name: string;
  description?: string;
  skills?: string[];
  leadId?: string;
}

export interface UpdateTeamData extends Partial<CreateTeamData> {
  isActive?: boolean;
}

export interface AssignTeamToProjectData {
  projectId: string;
  allocatedHours: number;
  startDate: string;
  endDate?: string;
}

export interface UpdateTeamAssignmentData {
  allocatedHours?: number;
  startDate?: string;
  endDate?: string | null;
  status?: TeamAssignmentStatus;
}

export interface TeamCapacity {
  team: Pick<Team, 'id' | 'name'>;
  memberCount: number;
  totalCapacity: number;
  totalAllocated: number;
  availableCapacity: number;
  utilizationPercent: number;
  isOverAllocated: boolean;
  projectBreakdown: {
    project: Pick<Project, 'id' | 'name'>;
    allocatedHours: number;
  }[];
}
