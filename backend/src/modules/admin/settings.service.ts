import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import { createAuditLog, AuditAction } from './audit.service.js';

// Setting categories
export const SettingCategory = {
  SECURITY: 'security',
  NOTIFICATIONS: 'notifications',
  PLATFORM: 'platform',
  INTEGRATIONS: 'integrations',
} as const;

export type SettingCategoryType = typeof SettingCategory[keyof typeof SettingCategory];

// Default settings by category
export const DEFAULT_SETTINGS: Record<SettingCategoryType, Record<string, { value: any; description: string }>> = {
  security: {
    passwordMinLength: { value: 8, description: 'Minimum password length' },
    passwordRequireUppercase: { value: true, description: 'Require uppercase letter in password' },
    passwordRequireNumber: { value: true, description: 'Require number in password' },
    passwordRequireSpecial: { value: false, description: 'Require special character in password' },
    sessionTimeoutMinutes: { value: 480, description: 'Session timeout in minutes (8 hours default)' },
    maxLoginAttempts: { value: 5, description: 'Maximum failed login attempts before lockout' },
    lockoutDurationMinutes: { value: 30, description: 'Account lockout duration in minutes' },
    requirePasswordChangeOnFirstLogin: { value: false, description: 'Require password change on first login' },
  },
  notifications: {
    emailEnabled: { value: false, description: 'Enable email notifications' },
    emailFromAddress: { value: 'noreply@yourdomain.com', description: 'Email from address' },
    emailFromName: { value: 'PMO Platform', description: 'Email from name' },
    notifyOnUserCreated: { value: true, description: 'Send notification when user is created' },
    notifyOnProjectCreated: { value: true, description: 'Send notification when project is created' },
    notifyOnTaskAssigned: { value: true, description: 'Send notification when task is assigned' },
    notifyOnDeadlineApproaching: { value: true, description: 'Send notification for approaching deadlines' },
  },
  platform: {
    appName: { value: 'PMO Platform', description: 'Application name' },
    defaultTimezone: { value: 'UTC', description: 'Default timezone for new users' },
    defaultWeeklyHours: { value: 40, description: 'Default weekly hours for new users' },
    fiscalYearStartMonth: { value: 1, description: 'Fiscal year start month (1-12)' },
    enableTimeTracking: { value: true, description: 'Enable time tracking feature' },
    enableCapacityPlanning: { value: true, description: 'Enable capacity planning feature' },
    enableGanttChart: { value: true, description: 'Enable Gantt chart view' },
    maintenanceMode: { value: false, description: 'Enable maintenance mode' },
  },
  integrations: {
    salesforceEnabled: { value: false, description: 'Enable Salesforce integration' },
    salesforceLoginUrl: { value: 'https://login.salesforce.com', description: 'Salesforce login URL' },
    slackEnabled: { value: false, description: 'Enable Slack integration' },
    teamsEnabled: { value: false, description: 'Enable Microsoft Teams integration' },
  },
};

export interface SettingUpdate {
  category: SettingCategoryType;
  key: string;
  value: any;
  updatedBy: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Initialize default settings if they don't exist
 */
export async function initializeDefaultSettings() {
  try {
    const existingSettings = await db.systemSetting.count();

    if (existingSettings === 0) {
      logger.info('Initializing default system settings...');

      const settingsToCreate = [];

      for (const [category, settings] of Object.entries(DEFAULT_SETTINGS)) {
        for (const [key, config] of Object.entries(settings)) {
          settingsToCreate.push({
            category,
            key,
            value: config.value,
            description: config.description,
          });
        }
      }

      await db.systemSetting.createMany({
        data: settingsToCreate,
        skipDuplicates: true,
      });

      logger.info(`Created ${settingsToCreate.length} default settings`);
    }
  } catch (error) {
    logger.error('Failed to initialize default settings:', error);
  }
}

/**
 * Get all settings grouped by category
 */
export async function getAllSettings() {
  const settings = await db.systemSetting.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });

  // Group by category
  const grouped: Record<string, Record<string, any>> = {};

  for (const setting of settings) {
    if (!grouped[setting.category]) {
      grouped[setting.category] = {};
    }
    grouped[setting.category][setting.key] = {
      value: setting.value,
      description: setting.description,
      updatedAt: setting.updatedAt,
      updatedBy: setting.updatedBy,
    };
  }

  return grouped;
}

/**
 * Get settings for a specific category
 */
export async function getSettingsByCategory(category: SettingCategoryType) {
  const settings = await db.systemSetting.findMany({
    where: { category },
    orderBy: { key: 'asc' },
  });

  const result: Record<string, any> = {};

  for (const setting of settings) {
    result[setting.key] = {
      value: setting.value,
      description: setting.description,
      updatedAt: setting.updatedAt,
      updatedBy: setting.updatedBy,
    };
  }

  return result;
}

/**
 * Get a single setting value
 */
export async function getSetting(category: SettingCategoryType, key: string) {
  const setting = await db.systemSetting.findUnique({
    where: { category_key: { category, key } },
  });

  if (!setting) {
    // Return default if exists
    const defaults = DEFAULT_SETTINGS[category];
    if (defaults && defaults[key]) {
      return defaults[key].value;
    }
    return null;
  }

  return setting.value;
}

/**
 * Update a setting
 */
export async function updateSetting(input: SettingUpdate) {
  const { category, key, value, updatedBy, ipAddress, userAgent } = input;

  // Validate category
  if (!Object.values(SettingCategory).includes(category as SettingCategoryType)) {
    throw new Error(`Invalid category: ${category}`);
  }

  // Get current value for audit
  const currentSetting = await db.systemSetting.findUnique({
    where: { category_key: { category, key } },
  });

  const oldValue = currentSetting?.value;

  // Upsert the setting
  const setting = await db.systemSetting.upsert({
    where: { category_key: { category, key } },
    create: {
      category,
      key,
      value,
      description: DEFAULT_SETTINGS[category as SettingCategoryType]?.[key]?.description,
      updatedBy,
    },
    update: {
      value,
      updatedBy,
    },
  });

  // Audit log
  await createAuditLog({
    userId: updatedBy,
    action: AuditAction.SETTING_UPDATED,
    entityType: 'SystemSetting',
    entityId: setting.id,
    changes: { key, oldValue, newValue: value },
    metadata: { category },
    ipAddress,
    userAgent,
  });

  logger.info(`Setting updated: ${category}.${key} by ${updatedBy}`);

  return setting;
}

/**
 * Reset a category to default settings
 */
export async function resetCategoryToDefaults(
  category: SettingCategoryType,
  updatedBy: string,
  ipAddress?: string,
  userAgent?: string
) {
  const defaults = DEFAULT_SETTINGS[category];

  if (!defaults) {
    throw new Error(`Invalid category: ${category}`);
  }

  // Get current settings for audit
  const currentSettings = await getSettingsByCategory(category);

  // Delete existing and recreate
  await db.systemSetting.deleteMany({ where: { category } });

  const settingsToCreate = Object.entries(defaults).map(([key, config]) => ({
    category,
    key,
    value: config.value,
    description: config.description,
    updatedBy,
  }));

  await db.systemSetting.createMany({ data: settingsToCreate });

  // Audit log
  await createAuditLog({
    userId: updatedBy,
    action: AuditAction.SETTING_RESET,
    entityType: 'SystemSetting',
    entityId: category,
    changes: { oldSettings: currentSettings, resetToDefaults: true },
    metadata: { category },
    ipAddress,
    userAgent,
  });

  logger.info(`Settings reset to defaults: ${category} by ${updatedBy}`);

  return getSettingsByCategory(category);
}

/**
 * Get security settings specifically (commonly accessed)
 */
export async function getSecuritySettings() {
  const settings = await getSettingsByCategory('security');

  return {
    passwordMinLength: settings.passwordMinLength?.value ?? DEFAULT_SETTINGS.security.passwordMinLength.value,
    passwordRequireUppercase: settings.passwordRequireUppercase?.value ?? DEFAULT_SETTINGS.security.passwordRequireUppercase.value,
    passwordRequireNumber: settings.passwordRequireNumber?.value ?? DEFAULT_SETTINGS.security.passwordRequireNumber.value,
    passwordRequireSpecial: settings.passwordRequireSpecial?.value ?? DEFAULT_SETTINGS.security.passwordRequireSpecial.value,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes?.value ?? DEFAULT_SETTINGS.security.sessionTimeoutMinutes.value,
    maxLoginAttempts: settings.maxLoginAttempts?.value ?? DEFAULT_SETTINGS.security.maxLoginAttempts.value,
    lockoutDurationMinutes: settings.lockoutDurationMinutes?.value ?? DEFAULT_SETTINGS.security.lockoutDurationMinutes.value,
    requirePasswordChangeOnFirstLogin: settings.requirePasswordChangeOnFirstLogin?.value ?? DEFAULT_SETTINGS.security.requirePasswordChangeOnFirstLogin.value,
  };
}

/**
 * Validate password against security settings
 */
export async function validatePassword(password: string): Promise<{ valid: boolean; errors: string[] }> {
  const settings = await getSecuritySettings();
  const errors: string[] = [];

  if (password.length < settings.passwordMinLength) {
    errors.push(`Password must be at least ${settings.passwordMinLength} characters`);
  }

  if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (settings.passwordRequireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (settings.passwordRequireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
