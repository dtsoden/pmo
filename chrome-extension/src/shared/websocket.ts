import { io, Socket } from 'socket.io-client';
import type { ActiveTimer } from './types';

type EventHandler = (data: any) => void;

export class WebSocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;
  private url: string;
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor(url: string = 'http://localhost:7600') {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    this.token = token;

    this.socket = io(this.url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Register event handlers
    this.setupEventHandlers();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Register event handler
   */
  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);

    // If socket already exists, register handler immediately
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  /**
   * Remove event handler
   */
  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      // Remove all handlers for this event
      this.handlers.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    } else {
      // Remove specific handler
      const handlers = this.handlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        if (this.socket) {
          this.socket.off(event, handler);
        }
      }
    }
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn('Cannot emit event: WebSocket not connected');
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Setup event handlers for timer events
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Re-register all stored handlers
    for (const [event, handlers] of this.handlers.entries()) {
      for (const handler of handlers) {
        this.socket.on(event, handler);
      }
    }
  }

  /**
   * Update URL and reconnect if needed
   */
  setUrl(url: string): void {
    if (this.url !== url) {
      const wasConnected = this.isConnected();
      this.disconnect();
      this.url = url;
      if (wasConnected && this.token) {
        this.connect(this.token);
      }
    }
  }
}

// Create singleton instance
export const websocket = new WebSocketClient();

// ============================================
// TIMER EVENT TYPES
// ============================================

export interface TimerStartedEvent {
  activeEntry: ActiveTimer;
}

export interface TimerStoppedEvent {
  entry: any; // TimeEntry
}

export interface TimerDiscardedEvent {}

// ============================================
// CONVENIENCE METHODS
// ============================================

export function onTimerStarted(handler: (event: TimerStartedEvent) => void): void {
  websocket.on('time:started', handler);
}

export function onTimerStopped(handler: (event: TimerStoppedEvent) => void): void {
  websocket.on('time:stopped', handler);
}

export function onTimerDiscarded(handler: (event: TimerDiscardedEvent) => void): void {
  websocket.on('time:discarded', handler);
}

export function onShortcutsUpdated(handler: (event: any) => void): void {
  websocket.on('shortcuts:updated', handler);
}

export function onTimerUpdated(handler: (event: { activeEntry: ActiveTimer }) => void): void {
  websocket.on('time:updated', handler);
}
