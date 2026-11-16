import { db } from '../db';

export const AUTO_BACKUP_SETTINGS_KEY = 'auto_backup_settings';

export type ScheduleFrequency = 'daily' | 'weekly' | 'custom';
export type CustomIntervalUnit = 'hours' | 'days';

export interface AutoBackupSettings {
  // Scheduled backup
  scheduledEnabled: boolean;
  scheduleFrequency: ScheduleFrequency;
  scheduleTime: string; // "HH:MM" 24h local time
  scheduleWeeklyDay: number; // 0 (Sunday) - 6 (Saturday)
  customIntervalValue: number;
  customIntervalUnit: CustomIntervalUnit;

  // Dynamic (transaction-count) backup
  countEnabled: boolean;
  countThreshold: number;

  // Auto-cleanup / retention
  cleanupEnabled: boolean;
  cleanupRetentionCount: number;

  // Shared state across manual, scheduled, and dynamic backups
  lastBackupAt: string | null;
  transactionsSinceLastBackup: number;
}

export const DEFAULT_AUTO_BACKUP_SETTINGS: AutoBackupSettings = {
  scheduledEnabled: false,
  scheduleFrequency: 'daily',
  scheduleTime: '21:00',
  scheduleWeeklyDay: 0,
  customIntervalValue: 12,
  customIntervalUnit: 'hours',
  countEnabled: false,
  countThreshold: 10,
  cleanupEnabled: false,
  cleanupRetentionCount: 10,
  lastBackupAt: null,
  transactionsSinceLastBackup: 0
};

/**
 * Load auto-backup settings from Dexie, merged with defaults.
 */
export async function getAutoBackupSettings(): Promise<AutoBackupSettings> {
  try {
    const setting = await db.settings.get(AUTO_BACKUP_SETTINGS_KEY);
    if (setting?.value && typeof setting.value === 'object') {
      return {
        ...DEFAULT_AUTO_BACKUP_SETTINGS,
        ...setting.value
      };
    }
  } catch (err) {
    console.warn('Failed to load auto-backup settings:', err);
  }
  return { ...DEFAULT_AUTO_BACKUP_SETTINGS };
}

/**
 * Persist auto-backup settings to Dexie.
 */
export async function saveAutoBackupSettings(settings: AutoBackupSettings): Promise<AutoBackupSettings> {
  const sanitized: AutoBackupSettings = {
    ...DEFAULT_AUTO_BACKUP_SETTINGS,
    ...settings,
    customIntervalValue: Math.max(1, Math.floor(settings.customIntervalValue || 1)),
    countThreshold: Math.max(1, Math.floor(settings.countThreshold || 1)),
    cleanupRetentionCount: Math.max(1, Math.floor(settings.cleanupRetentionCount || 1)),
    transactionsSinceLastBackup: Math.max(0, Math.floor(settings.transactionsSinceLastBackup || 0))
  };
  await db.settings.put({ key: AUTO_BACKUP_SETTINGS_KEY, value: sanitized });
  return sanitized;
}

/**
 * Parse "HH:MM" into hours & minutes with safe fallback.
 */
function parseTimeHHMM(timeStr: string): { hours: number; minutes: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec((timeStr || '').trim());
  if (!match) return { hours: 21, minutes: 0 };
  const hours = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return { hours, minutes };
}

/**
 * Compute the most recent scheduled slot at or before `now` for daily/weekly schedules.
 */
export function getMostRecentScheduledSlot(settings: AutoBackupSettings, now: Date): Date {
  const { hours, minutes } = parseTimeHHMM(settings.scheduleTime);
  const candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);

  if (settings.scheduleFrequency === 'daily') {
    if (candidate.getTime() > now.getTime()) {
      candidate.setDate(candidate.getDate() - 1);
    }
    return candidate;
  }

  // Weekly: find the most recent target weekday at HH:MM <= now
  const targetDay = Math.min(6, Math.max(0, Math.floor(settings.scheduleWeeklyDay || 0)));
  const currentDay = candidate.getDay();
  let daysAgo = (currentDay - targetDay + 7) % 7;
  if (daysAgo === 0 && candidate.getTime() > now.getTime()) {
    daysAgo = 7;
  }
  candidate.setDate(candidate.getDate() - daysAgo);
  return candidate;
}

/**
 * Determine whether a scheduled backup is currently due.
 */
export function isScheduledBackupDue(settings: AutoBackupSettings, now = new Date()): boolean {
  if (!settings.scheduledEnabled) return false;

  const lastBackupMs = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : null;

  if (settings.scheduleFrequency === 'custom') {
    if (lastBackupMs === null || Number.isNaN(lastBackupMs)) return true;
    const val = Math.max(1, settings.customIntervalValue || 1);
    const unitMs = settings.customIntervalUnit === 'days'
      ? 24 * 60 * 60 * 1000
      : 60 * 60 * 1000;
    return now.getTime() - lastBackupMs >= val * unitMs;
  }

  const recentSlot = getMostRecentScheduledSlot(settings, now);
  if (lastBackupMs === null || Number.isNaN(lastBackupMs)) return true;
  return lastBackupMs < recentSlot.getTime();
}

/**
 * Determine whether the dynamic transaction-count threshold has been reached.
 */
export function isCountBackupDue(settings: AutoBackupSettings): boolean {
  if (!settings.countEnabled) return false;
  const threshold = Math.max(1, Math.floor(settings.countThreshold || 1));
  return settings.transactionsSinceLastBackup >= threshold;
}

/**
 * Record a successful backup (manual, scheduled, or dynamic):
 * updates `lastBackupAt` and resets `transactionsSinceLastBackup` to 0.
 */
export async function recordBackupSuccess(
  settings: AutoBackupSettings,
  at = new Date()
): Promise<AutoBackupSettings> {
  return saveAutoBackupSettings({
    ...settings,
    lastBackupAt: at.toISOString(),
    transactionsSinceLastBackup: 0
  });
}

/**
 * Increment the transaction counter by `delta` (default 1) and persist.
 */
export async function incrementTransactionCounter(
  settings: AutoBackupSettings,
  delta = 1
): Promise<AutoBackupSettings> {
  return saveAutoBackupSettings({
    ...settings,
    transactionsSinceLastBackup: Math.max(0, settings.transactionsSinceLastBackup + delta)
  });
}
