// ============================================
// USER & AUTH TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PMO_MANAGER'
  | 'PROJECT_MANAGER'
  | 'RESOURCE_MANAGER'
  | 'TEAM_MEMBER'
  | 'VIEWER';

export interface AuthState {
  token: string | null;
  user: User | null;
  apiUrl: string;
  isAuthenticated: boolean;
}

// ============================================
// TIMER SHORTCUT TYPES
// ============================================

export interface TimerShortcut {
  id: string;
  userId: string;
  taskId?: string;
  task?: {
    id: string;
    title: string;
    projectId: string;
    project: {
      id: string;
      name: string;
      code: string;
    };
  };
  label: string;
  description?: string;
  color: string;
  icon?: string;
  groupName?: string;
  sortOrder: number;
  isPinned: boolean;
  lastUsedAt?: string;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShortcutData {
  taskId?: string;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  groupName?: string;
  isPinned?: boolean;
}

export interface UpdateShortcutData {
  taskId?: string;
  label?: string;
  description?: string;
  color?: string;
  icon?: string;
  groupName?: string;
  sortOrder?: number;
  isPinned?: boolean;
}

// ============================================
// TIMER TYPES
// ============================================

export interface ActiveTimer {
  id: string;
  userId: string;
  taskId?: string;
  task?: {
    id: string;
    title: string;
    projectId: string;
    project: {
      id: string;
      name: string;
      code: string;
    };
  };
  startTime: string;
  description?: string;
  elapsedSeconds: number;
}

export interface TimerState {
  activeTimer: ActiveTimer | null;
  isRunning: boolean;
  elapsedSeconds: number;
}

export interface StartTimerData {
  taskId?: string;
  description?: string;
  shortcutId?: string;
}

// ============================================
// PROJECT & TASK TYPES
// ============================================

export interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  clientId: string;
  client: {
    id: string;
    name: string;
  };
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  project: Project;
  status: string;
  priority: string;
}

// ============================================
// MESSAGE TYPES (for background communication)
// ============================================

export type MessageType =
  | 'INIT'
  | 'GET_AUTH'
  | 'SET_AUTH'
  | 'LOGOUT'
  | 'GET_SHORTCUTS'
  | 'CREATE_SHORTCUT'
  | 'UPDATE_SHORTCUT'
  | 'DELETE_SHORTCUT'
  | 'OPEN_SIDE_PANEL'
  | 'GET_ACTIVE_TIMER'
  | 'START_TIMER'
  | 'STOP_TIMER'
  | 'DISCARD_TIMER'
  | 'TIMER_UPDATED'
  | 'SHORTCUTS_UPDATED';

export interface Message<T = any> {
  type: MessageType;
  data?: T;
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ShortcutsResponse {
  shortcuts: TimerShortcut[];
}

export interface ActiveTimerResponse {
  activeEntry: ActiveTimer | null;
}

export interface InstallResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}
