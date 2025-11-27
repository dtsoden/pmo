import type { ActiveTimer } from './types';

/**
 * Calculate elapsed seconds from start time
 */
export function calculateElapsed(startTime: string): number {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
}

/**
 * Format seconds as HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs]
    .map((val) => val.toString().padStart(2, '0'))
    .join(':');
}

/**
 * Format seconds as human-readable (e.g., "2h 15m")
 */
export function formatDurationHuman(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours === 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '0m';
}

/**
 * Get elapsed seconds for active timer
 */
export function getTimerElapsed(timer: ActiveTimer | null): number {
  if (!timer) return 0;
  return calculateElapsed(timer.startTime);
}

/**
 * Format active timer duration
 */
export function formatTimerDuration(timer: ActiveTimer | null): string {
  return formatDuration(getTimerElapsed(timer));
}

/**
 * Get task display name
 */
export function getTaskDisplayName(timer: ActiveTimer): string {
  if (!timer.task) return 'No task';
  return `${timer.task.project.code} - ${timer.task.title}`;
}

/**
 * Get project display name
 */
export function getProjectDisplayName(timer: ActiveTimer): string {
  if (!timer.task) return '';
  return timer.task.project.name;
}
