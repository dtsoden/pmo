// Notifications store for PMO Platform
import { writable, derived } from 'svelte/store';
import { api, type Notification } from '$lib/api/client';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

function createNotificationsStore() {
  const { subscribe, set, update } = writable<NotificationsState>(initialState);

  return {
    subscribe,

    async load() {
      update(state => ({ ...state, isLoading: true }));

      try {
        const [response, countResponse] = await Promise.all([
          api.notifications.list({ limit: 20 }),
          api.notifications.unreadCount(),
        ]);

        update(state => ({
          ...state,
          notifications: response.data,
          unreadCount: countResponse.count,
          isLoading: false,
          error: null,
        }));
      } catch (err) {
        update(state => ({
          ...state,
          isLoading: false,
          error: (err as { message?: string })?.message || 'Failed to load notifications',
        }));
      }
    },

    async markRead(id: string) {
      try {
        await api.notifications.markRead(id);
        update(state => ({
          ...state,
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      } catch {
        // Silently fail for now
      }
    },

    async markAllRead() {
      try {
        await api.notifications.markAllRead();
        update(state => ({
          ...state,
          notifications: state.notifications.map(n => ({
            ...n,
            isRead: true,
            readAt: new Date().toISOString(),
          })),
          unreadCount: 0,
        }));
      } catch {
        // Silently fail for now
      }
    },

    async delete(id: string) {
      try {
        await api.notifications.delete(id);
        update(state => {
          const notification = state.notifications.find(n => n.id === id);
          const wasUnread = notification && !notification.isRead;
          return {
            ...state,
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      } catch {
        // Silently fail for now
      }
    },

    addNotification(notification: Notification) {
      update(state => ({
        ...state,
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      }));
    },

    reset() {
      set(initialState);
    },
  };
}

export const notifications = createNotificationsStore();

export const unreadNotifications = derived(
  notifications,
  $notifications => $notifications.notifications.filter(n => !n.isRead)
);

export const hasUnread = derived(
  notifications,
  $notifications => $notifications.unreadCount > 0
);
