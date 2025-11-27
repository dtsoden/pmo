// WebSocket store for real-time updates
import { writable, get } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';
import { api } from '$lib/api/client';
import { auth } from './auth';
import { notifications } from './notifications';

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const initialState: WebSocketState = {
  isConnected: false,
  isConnecting: false,
  error: null,
};

let socket: Socket | null = null;

function createWebSocketStore() {
  const { subscribe, set, update } = writable<WebSocketState>(initialState);

  const eventHandlers = new Map<string, Set<(data: unknown) => void>>();

  function emit(event: string, data: unknown) {
    const handlers = eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  return {
    subscribe,

    connect() {
      if (!browser) return;
      if (socket?.connected) return;

      const token = api.getToken();
      if (!token) {
        update(state => ({ ...state, error: 'No authentication token' }));
        return;
      }

      update(state => ({ ...state, isConnecting: true, error: null }));

      // Connect via same origin - Vite proxy handles /socket.io routing
      socket = io({
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        update(state => ({
          ...state,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));

        // Join user-specific room
        const currentAuth = get(auth);
        if (currentAuth.user) {
          socket?.emit('join:user', currentAuth.user.id);
        }
      });

      socket.on('disconnect', () => {
        update(state => ({ ...state, isConnected: false }));
      });

      socket.on('connect_error', (error) => {
        update(state => ({
          ...state,
          isConnected: false,
          isConnecting: false,
          error: error.message,
        }));
      });

      // Notification events
      socket.on('notification:new', (data) => {
        notifications.addNotification(data);
        emit('notification:new', data);
      });

      // Time tracking events
      socket.on('time:started', (data) => emit('time:started', data));
      socket.on('time:stopped', (data) => emit('time:stopped', data));
      socket.on('time:entry:created', (data) => emit('time:entry:created', data));
      socket.on('time:entry:updated', (data) => emit('time:entry:updated', data));
      socket.on('time:entry:deleted', (data) => emit('time:entry:deleted', data));

      // Project events
      socket.on('project:updated', (data) => emit('project:updated', data));
      socket.on('project:created', (data) => emit('project:created', data));
      socket.on('project:deleted', (data) => emit('project:deleted', data));

      // Task events
      socket.on('task:updated', (data) => emit('task:updated', data));
      socket.on('task:created', (data) => emit('task:created', data));
      socket.on('task:deleted', (data) => emit('task:deleted', data));
      socket.on('task:assigned', (data) => emit('task:assigned', data));
      socket.on('task:unassigned', (data) => emit('task:unassigned', data));
    },

    disconnect() {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      set(initialState);
    },

    // Subscribe to a specific event
    on(event: string, handler: (data: unknown) => void) {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(handler);

      // Return unsubscribe function
      return () => {
        eventHandlers.get(event)?.delete(handler);
      };
    },

    // Join a room
    joinProject(projectId: string) {
      socket?.emit('join:project', projectId);
    },

    leaveProject(projectId: string) {
      socket?.emit('leave:project', projectId);
    },

    joinTask(taskId: string) {
      socket?.emit('join:task', taskId);
    },

    leaveTask(taskId: string) {
      socket?.emit('leave:task', taskId);
    },
  };
}

export const ws = createWebSocketStore();
