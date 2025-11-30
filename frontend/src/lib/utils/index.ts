// Utility functions for PMO Platform
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// Tailwind class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities (browser timezone - for dates without times)
export function formatDate(date: string | Date | null | undefined, formatStr = 'MMM d, yyyy'): string {
  if (!date) return '-';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  return format(parsed, formatStr);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'MMM d, yyyy h:mm a');
}

export function formatDateShort(date: string | Date | null | undefined): string {
  return formatDate(date, 'MM/dd/yyyy');
}

export function formatTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  return formatDistanceToNow(parsed, { addSuffix: true });
}

// Timezone-aware date/time formatting (for timestamps with user timezone)
export function formatDateInTimezone(
  date: string | Date | null | undefined,
  timezone: string,
  formatStr = 'MMM d, yyyy'
): string {
  if (!date) return '-';
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsed)) return '-';
    return formatInTimeZone(parsed, timezone, formatStr);
  } catch (e) {
    console.error('Timezone formatting error:', e);
    return formatDate(date, formatStr); // Fallback to browser timezone
  }
}

export function formatDateTimeInTimezone(
  date: string | Date | null | undefined,
  timezone: string
): string {
  return formatDateInTimezone(date, timezone, 'MMM d, yyyy h:mm a');
}

export function formatTimeInTimezone(
  date: string | Date | null | undefined,
  timezone: string
): string {
  return formatDateInTimezone(date, timezone, 'h:mm a');
}

// Convert UTC date to user's timezone as a Date object (for editing forms)
export function toUserTimezone(date: string | Date | null | undefined, timezone: string): Date | null {
  if (!date) return null;
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsed)) return null;
    return toZonedTime(parsed, timezone);
  } catch (e) {
    console.error('Timezone conversion error:', e);
    return parsed; // Fallback
  }
}

// Number formatting utilities
export function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercent(num: number | null | undefined, decimals = 0): string {
  if (num === null || num === undefined) return '-';
  return `${num.toFixed(decimals)}%`;
}

export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// String utilities
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function initials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
}

export function fullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
}

// Status utilities
export type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export function getProjectStatusVariant(status: string): StatusVariant {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'ACTIVE':
      return 'info';
    case 'ON_HOLD':
      return 'warning';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
}

export function getTaskStatusVariant(status: string): StatusVariant {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
    case 'IN_REVIEW':
      return 'info';
    case 'BLOCKED':
      return 'error';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
}

export function getPriorityVariant(priority: string): StatusVariant {
  switch (priority) {
    case 'CRITICAL':
    case 'URGENT':
      return 'error';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'info';
    default:
      return 'default';
  }
}

export function getTimeOffStatusVariant(status: string): StatusVariant {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REJECTED':
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
}

// Label mappings
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
  URGENT: 'Urgent',
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  PMO_MANAGER: 'PMO Manager',
  PROJECT_MANAGER: 'Project Manager',
  RESOURCE_MANAGER: 'Resource Manager',
  TEAM_MEMBER: 'Team Member',
  VIEWER: 'Viewer',
};

export const TIME_OFF_TYPE_LABELS: Record<string, string> = {
  VACATION: 'Vacation',
  SICK: 'Sick Leave',
  PERSONAL: 'Personal',
  OTHER: 'Other',
};

export const TIME_OFF_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

// Debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Utilization color utilities
/**
 * Color stops for utilization percentage gradient:
 * - 0-25%: Bright orange (critical warning)
 * - 25-50%: Iridescent yellow (low)
 * - 50-80%: PMO Blue (moderate)
 * - 80-100%: Green (optimal)
 * - >100%: Red (over-allocated)
 */
const UTILIZATION_COLOR_STOPS = [
  { percent: 0, rgb: { r: 255, g: 140, b: 0 } },      // Bright orange (#ff8c00)
  { percent: 25, rgb: { r: 255, g: 234, b: 0 } },     // Iridescent yellow (#ffea00)
  { percent: 50, rgb: { r: 37, g: 99, b: 235 } },     // PMO Blue (#2563eb)
  { percent: 80, rgb: { r: 34, g: 197, b: 94 } },     // Green (#22c55e)
  { percent: 100, rgb: { r: 34, g: 197, b: 94 } },    // Green (#22c55e)
];

// Red color for over-allocation (>100%)
const OVER_ALLOCATED_COLOR = { r: 239, g: 68, b: 68 };  // Red (#ef4444)

/**
 * Interpolate between two RGB colors
 */
function interpolateColor(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  factor: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(color1.r + factor * (color2.r - color1.r)),
    g: Math.round(color1.g + factor * (color2.g - color1.g)),
    b: Math.round(color1.b + factor * (color2.b - color1.b)),
  };
}

/**
 * Get RGB color for a utilization percentage with gradient between stops
 */
export function getUtilizationRgb(utilizationPercent: number): { r: number; g: number; b: number } {
  // Handle over-allocation (>100%) - always red
  if (utilizationPercent > 100) return OVER_ALLOCATED_COLOR;

  // Handle edge cases
  if (utilizationPercent <= 0) return UTILIZATION_COLOR_STOPS[0].rgb;
  if (utilizationPercent === 100) return UTILIZATION_COLOR_STOPS[UTILIZATION_COLOR_STOPS.length - 1].rgb;

  // Find the two color stops this percentage falls between
  for (let i = 0; i < UTILIZATION_COLOR_STOPS.length - 1; i++) {
    const currentStop = UTILIZATION_COLOR_STOPS[i];
    const nextStop = UTILIZATION_COLOR_STOPS[i + 1];

    if (utilizationPercent >= currentStop.percent && utilizationPercent <= nextStop.percent) {
      // Calculate interpolation factor (0 to 1)
      const range = nextStop.percent - currentStop.percent;
      const position = utilizationPercent - currentStop.percent;
      const factor = range > 0 ? position / range : 0;

      return interpolateColor(currentStop.rgb, nextStop.rgb, factor);
    }
  }

  // Fallback (should never reach here)
  return UTILIZATION_COLOR_STOPS[0].rgb;
}

/**
 * Get hex color for a utilization percentage
 */
export function getUtilizationColor(utilizationPercent: number): string {
  const rgb = getUtilizationRgb(utilizationPercent);
  return `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
}

/**
 * Get inline style for utilization background color
 */
export function getUtilizationBgStyle(utilizationPercent: number): string {
  return `background-color: ${getUtilizationColor(utilizationPercent)}`;
}

/**
 * Get utilization category label
 */
export function getUtilizationCategory(utilizationPercent: number): string {
  if (utilizationPercent > 100) return 'Over-allocated';
  if (utilizationPercent >= 80) return 'Optimal (80-100%)';
  if (utilizationPercent >= 50) return 'Moderate (50-79%)';
  if (utilizationPercent >= 25) return 'Low (25-49%)';
  return 'Critical (0-24%)';
}

// Get clean timezone abbreviation (consistent 3-4 letter format)
export function getTimezoneAbbreviation(timezone?: string): string {
  if (!timezone) return 'UTC';

  // Manual mapping for consistent abbreviations
  const timezoneMap: Record<string, string> = {
    // UTC
    'UTC': 'UTC',

    // Americas - North America
    'America/New_York': 'EST',
    'America/Chicago': 'CST',
    'America/Denver': 'MST',
    'America/Phoenix': 'MST',
    'America/Los_Angeles': 'PST',
    'America/Anchorage': 'AKST',
    'Pacific/Honolulu': 'HST',

    // Americas - Central & Caribbean
    'America/Costa_Rica': 'CST',
    'America/Panama': 'EST',
    'America/Havana': 'CST',

    // Americas - South America
    'America/Sao_Paulo': 'BRT',
    'America/Buenos_Aires': 'ART',
    'America/Santiago': 'CLT',
    'America/Lima': 'PET',
    'America/Caracas': 'VET',

    // Europe - Western
    'Europe/London': 'GMT',
    'Europe/Dublin': 'GMT',

    // Europe - Central
    'Europe/Paris': 'CET',
    'Europe/Berlin': 'CET',
    'Europe/Zurich': 'CET',
    'Europe/Prague': 'CET',
    'Europe/Warsaw': 'CET',
    'Europe/Madrid': 'CET',
    'Europe/Rome': 'CET',
    'Europe/Amsterdam': 'CET',
    'Europe/Brussels': 'CET',
    'Europe/Vienna': 'CET',
    'Europe/Budapest': 'CET',
    'Europe/Stockholm': 'CET',

    // Europe - Eastern
    'Europe/Athens': 'EET',
    'Europe/Bucharest': 'EET',
    'Europe/Helsinki': 'EET',
    'Europe/Istanbul': 'TRT',
    'Europe/Moscow': 'MSK',

    // Africa
    'Africa/Cairo': 'EET',
    'Africa/Johannesburg': 'SAST',
    'Africa/Lagos': 'WAT',
    'Africa/Nairobi': 'EAT',
    'Africa/Casablanca': 'WET',
    'Africa/Kinshasa': 'WAT',
    'Africa/Addis_Ababa': 'EAT',

    // Middle East
    'Asia/Dubai': 'GST',
    'Asia/Riyadh': 'AST',
    'Asia/Tel_Aviv': 'IST',
    'Asia/Tehran': 'IRST',
    'Asia/Jerusalem': 'IST',
    'Asia/Abu_Dhabi': 'GST',

    // Asia - South
    'Asia/Kolkata': 'IST',
    'Asia/Karachi': 'PKT',
    'Asia/Dhaka': 'BST',
    'Asia/Mumbai': 'IST',
    'Asia/Delhi': 'IST',
    'Asia/Bangalore': 'IST',

    // Asia - Southeast
    'Asia/Bangkok': 'ICT',
    'Asia/Singapore': 'SGT',
    'Asia/Manila': 'PHT',
    'Asia/Jakarta': 'WIB',
    'Asia/Kuala_Lumpur': 'MYT',
    'Asia/Hanoi': 'ICT',

    // Asia - East
    'Asia/Shanghai': 'CST',
    'Asia/Tokyo': 'JST',
    'Asia/Taipei': 'CST',
    'Asia/Hong_Kong': 'HKT',
    'Asia/Beijing': 'CST',
    'Asia/Seoul': 'KST',

    // Oceania
    'Australia/Perth': 'AWST',
    'Australia/Adelaide': 'ACST',
    'Australia/Sydney': 'AEST',
    'Australia/Melbourne': 'AEST',
    'Australia/Brisbane': 'AEST',
    'Pacific/Auckland': 'NZST',
    'Pacific/Wellington': 'NZST',
    'Pacific/Fiji': 'FJT',
  };

  // Return mapped abbreviation or fallback to last part of timezone name
  return timezoneMap[timezone] || timezone.split('/').pop()?.replace(/_/g, ' ')?.substring(0, 4).toUpperCase() || 'UTC';
}
