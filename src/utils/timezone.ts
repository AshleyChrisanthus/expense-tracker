import { getSetting, setSetting } from '../db';
import { triggerLiveTick } from '../hooks/useLiveTicker';

export interface TimeZoneOption {
  value: string;
  label: string;
  region: string;
}

export const COMMON_TIMEZONES: TimeZoneOption[] = [
  // Australia & New Zealand
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne, Canberra (AEST/AEDT)', region: 'Australia' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST, No DST)', region: 'Australia' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)', region: 'Australia' },
  { value: 'Australia/Perth', label: 'Perth (AWST)', region: 'Australia' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)', region: 'Australia' },
  { value: 'Pacific/Auckland', label: 'Auckland, Wellington (NZST/NZDT)', region: 'Pacific' },

  // Americas
  { value: 'America/New_York', label: 'New York, Toronto, Miami (Eastern Time)', region: 'North America' },
  { value: 'America/Chicago', label: 'Chicago, Dallas, Houston (Central Time)', region: 'North America' },
  { value: 'America/Denver', label: 'Denver, Phoenix, Calgary (Mountain Time)', region: 'North America' },
  { value: 'America/Los_Angeles', label: 'Los Angeles, Vancouver, Seattle (Pacific Time)', region: 'North America' },
  { value: 'America/Anchorage', label: 'Anchorage (Alaska Time)', region: 'North America' },
  { value: 'Pacific/Honolulu', label: 'Honolulu (Hawaii Time)', region: 'North America' },
  { value: 'America/Sao_Paulo', label: 'São Paulo, Rio de Janeiro (BRT)', region: 'South America' },

  // Europe & UK
  { value: 'Europe/London', label: 'London, Dublin, Edinburgh (GMT/BST)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris, Berlin, Rome, Madrid, Amsterdam (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens, Helsinki, Bucharest (EET/EEST)', region: 'Europe' },

  // Asia
  { value: 'Asia/Tokyo', label: 'Tokyo, Osaka (JST)', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore, Kuala Lumpur (SGT)', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'Mumbai, New Delhi, Kolkata (IST)', region: 'Asia' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', region: 'Asia' }
];

export const USER_TIMEZONE_STORAGE_KEY = 'app_user_timezone';
let cachedUserTimezone: string | null = null;

/**
 * Get the system detected browser timezone.
 */
export function getSystemTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Synchronous read of currently active timezone (memory -> localStorage -> system).
 */
export function getCachedUserTimeZone(): string {
  if (cachedUserTimezone && cachedUserTimezone.trim()) {
    return cachedUserTimezone;
  }
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(USER_TIMEZONE_STORAGE_KEY);
    if (stored && stored.trim()) {
      cachedUserTimezone = stored.trim();
      return cachedUserTimezone;
    }
  }
  return getSystemTimeZone();
}

/**
 * Get active user timezone from Dexie IndexedDB or fallback to cached / browser timezone.
 */
export async function getUserTimeZone(): Promise<string> {
  try {
    const saved = await getSetting<string>('user_timezone', '');
    if (saved && saved.trim()) {
      cachedUserTimezone = saved.trim();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(USER_TIMEZONE_STORAGE_KEY, cachedUserTimezone);
      }
      return cachedUserTimezone;
    }
  } catch {}
  return getCachedUserTimeZone();
}

/**
 * Set and persist user preferred timezone across Dexie, LocalStorage, and memory.
 * Immediately notifies live ticker subscribers to refresh dates without reloading.
 */
export async function setUserTimeZone(tz: string): Promise<void> {
  const normalized = (tz || '').trim();
  cachedUserTimezone = normalized || null;
  if (typeof localStorage !== 'undefined') {
    if (normalized) {
      localStorage.setItem(USER_TIMEZONE_STORAGE_KEY, normalized);
    } else {
      localStorage.removeItem(USER_TIMEZONE_STORAGE_KEY);
    }
  }
  await setSetting('user_timezone', normalized);
  triggerLiveTick();
}

/**
 * Format a Date or timestamp as 'YYYY-MM-DD' in the active or specified timezone.
 * Uses 'en-CA' which standardizes ISO date output (YYYY-MM-DD) across all JS runtimes.
 */
export function getLocalDateString(dateInput?: Date | number, tz?: string): string {
  const d = dateInput instanceof Date 
    ? dateInput 
    : typeof dateInput === 'number' 
    ? new Date(dateInput) 
    : new Date();

  const targetTz = tz || getCachedUserTimeZone();

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: targetTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

/**
 * Format a Date or timestamp into a localized human-readable string.
 */
export function formatLocalizedDateTime(
  dateInput?: Date | number, 
  tz?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = dateInput instanceof Date 
    ? dateInput 
    : typeof dateInput === 'number' 
    ? new Date(dateInput) 
    : new Date();

  const targetTz = tz || getCachedUserTimeZone();

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: targetTz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...options
  };

  try {
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
  } catch {
    return d.toLocaleString();
  }
}
