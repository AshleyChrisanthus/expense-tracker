import type { RecurrenceRule } from '../types/expense';

export const WEEKDAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

export function computeNextDueDate(
  baseDateStr: string, 
  rule: RecurrenceRule, 
  dayOfWeek?: number, 
  dayOfMonth?: number
): string {
  if (!rule || rule === 'none' || rule === 'as_needed') return baseDateStr;

  const [year, month, day] = baseDateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);

  switch (rule) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      return formatDate(d);

    case 'weekly': {
      if (dayOfWeek !== undefined && dayOfWeek >= 0 && dayOfWeek <= 6) {
        const curDay = d.getDay();
        let add = (dayOfWeek - curDay + 7) % 7;
        if (add === 0) add = 7;
        d.setDate(d.getDate() + add);
      } else {
        d.setDate(d.getDate() + 7);
      }
      return formatDate(d);
    }

    case 'biweekly': {
      if (dayOfWeek !== undefined && dayOfWeek >= 0 && dayOfWeek <= 6) {
        const curDay = d.getDay();
        let add = (dayOfWeek - curDay + 7) % 7;
        if (add === 0) add = 14;
        else add += 7;
        d.setDate(d.getDate() + add);
      } else {
        d.setDate(d.getDate() + 14);
      }
      return formatDate(d);
    }

    case 'monthly': {
      const targetDay = dayOfMonth !== undefined ? dayOfMonth : day;
      const nextMonth0Indexed = d.getMonth() + 1;
      const targetYear = d.getFullYear() + Math.floor(nextMonth0Indexed / 12);
      const targetMonth = nextMonth0Indexed % 12;
      const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
      const clampedDay = Math.min(targetDay, maxDays);
      return formatDate(new Date(targetYear, targetMonth, clampedDay));
    }

    case 'yearly': {
      const targetYear = d.getFullYear() + 1;
      const targetMonth = d.getMonth();
      const targetDay = dayOfMonth !== undefined ? dayOfMonth : day;
      const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
      const clampedDay = Math.min(targetDay, maxDays);
      return formatDate(new Date(targetYear, targetMonth, clampedDay));
    }

    default:
      return baseDateStr;
  }
}

export function calculateInitialDueDate(
  baseDateStr: string,
  rule: RecurrenceRule,
  dayOfWeek?: number,
  dayOfMonth?: number
): string {
  if (!rule || rule === 'none' || rule === 'as_needed') return baseDateStr;

  const [year, month, day] = baseDateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);

  if (rule === 'weekly' && dayOfWeek !== undefined) {
    const curDay = d.getDay();
    let add = (dayOfWeek - curDay + 7) % 7;
    if (add === 0) add = 7;
    d.setDate(d.getDate() + add);
    return formatDate(d);
  }

  if (rule === 'biweekly' && dayOfWeek !== undefined) {
    const curDay = d.getDay();
    let add = (dayOfWeek - curDay + 7) % 7;
    if (add === 0) add = 14;
    d.setDate(d.getDate() + add);
    return formatDate(d);
  }

  if (rule === 'monthly' && dayOfMonth !== undefined) {
    if (day < dayOfMonth) {
      // Due in the current month on dayOfMonth
      const maxDays = new Date(year, month, 0).getDate();
      const clampedDay = Math.min(dayOfMonth, maxDays);
      return formatDate(new Date(year, month - 1, clampedDay));
    } else {
      // Due in next month on dayOfMonth
      return computeNextDueDate(baseDateStr, 'monthly', undefined, dayOfMonth);
    }
  }

  return computeNextDueDate(baseDateStr, rule, dayOfWeek, dayOfMonth);
}

export function getNextFutureDueDate(
  baseDateStr: string, 
  rule: RecurrenceRule, 
  dayOfWeek?: number, 
  dayOfMonth?: number
): string {
  if (!rule || rule === 'none' || rule === 'as_needed') return baseDateStr;
  const todayStr = new Date().toISOString().split('T')[0];
  let cur = baseDateStr;
  let count = 0;
  while (cur < todayStr && count < 100) {
    const next = computeNextDueDate(cur, rule, dayOfWeek, dayOfMonth);
    if (next <= cur) break;
    cur = next;
    count++;
  }
  return cur;
}

export function getRecurrenceDueInfo(dueDateStr?: string, referenceDateStr?: string) {
  if (!dueDateStr) return null;

  const todayStr = referenceDateStr || new Date().toISOString().split('T')[0];
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const [dY, dM, dD] = dueDateStr.split('-').map(Number);

  const today = new Date(tY, tM - 1, tD);
  const due = new Date(dY, dM - 1, dD);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return {
    diffDays,
    isOverdue: diffDays < 0,
    isDueToday: diffDays === 0,
    isDueSoon: diffDays > 0 && diffDays <= 7,
    formattedDueDate: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  };
}

export function formatRecurrenceLabel(
  rule?: RecurrenceRule, 
  dayOfWeek?: number, 
  dayOfMonth?: number
): string {
  switch (rule) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return dayOfWeek !== undefined && WEEKDAYS[dayOfWeek] 
        ? `Weekly every ${WEEKDAYS[dayOfWeek].label}` 
        : 'Weekly';
    case 'biweekly':
      return dayOfWeek !== undefined && WEEKDAYS[dayOfWeek] 
        ? `Every 2 weeks on ${WEEKDAYS[dayOfWeek].label}` 
        : 'Every 2 Weeks';
    case 'monthly':
      return dayOfMonth !== undefined 
        ? `Monthly on the ${getOrdinalSuffix(dayOfMonth)}` 
        : 'Monthly';
    case 'yearly':
      return dayOfMonth !== undefined
        ? `Yearly on ${getOrdinalSuffix(dayOfMonth)}`
        : 'Yearly';
    case 'as_needed':
      return 'As Needed (No Fixed Schedule)';
    default:
      return 'Does not repeat';
  }
}

/**
 * Checks whether a description or template contains an embedded amount placeholder ({amount})
 * or dollar amount pattern (e.g. "paid 783.27$ weekly salary to bank account").
 */
export function hasEmbeddedAmountTemplate(text?: string): boolean {
  if (!text) return false;
  if (text.includes('{amount}')) return true;
  return /(?:^|\s)\d+(?:\.\d+)?\$|\$\d+(?:\.\d+)?(?:\s|$)/i.test(text);
}

/**
 * Converts a description with an embedded dollar amount into a reusable {amount} template.
 * e.g. "paid 783.27$ weekly salary to bank account"
 *   -> "paid {amount}$ weekly salary to bank account"
 */
export function extractDescriptionTemplate(description: string): string | undefined {
  if (!description) return undefined;
  if (description.includes('{amount}')) return description;
  if (/(?:^|\s)\d+(?:\.\d+)?\$/i.test(description)) {
    return description.replace(/(\d+(?:\.\d+)?)(\$)/, '{amount}$2');
  }
  if (/\$\d+(?:\.\d+)?/i.test(description)) {
    return description.replace(/(\$)(\d+(?:\.\d+)?)/, '$1{amount}');
  }
  return undefined;
}

/**
 * Extracts a numeric amount string from a description containing a dollar figure.
 * e.g. "paid 783.27$ weekly salary to bank account" -> "783.27"
 */
export function extractAmountFromDescription(description: string): string | null {
  if (!description) return null;
  const matchAfter = description.match(/(?:^|\s)(\d+(?:\.\d+)?)\$/);
  if (matchAfter) return matchAfter[1];
  const matchBefore = description.match(/\$(\d+(?:\.\d+)?)(?:\s|$)/);
  if (matchBefore) return matchBefore[1];
  return null;
}

/**
 * Populates a templated description (or description with an embedded dollar figure)
 * with the provided amount. Leaves non-templated descriptions (e.g. "paid to friend") untouched.
 */
export function formatTemplatedDescription(
  templateOrDescription: string,
  amountInput: string | number,
  fallbackAmount?: number | string
): string {
  if (!templateOrDescription) return '';
  const rawInput = typeof amountInput === 'number' ? String(amountInput) : amountInput.trim();
  const replacement = rawInput !== ''
    ? rawInput
    : (fallbackAmount !== undefined && fallbackAmount !== '' ? String(fallbackAmount) : '{amount}');

  if (templateOrDescription.includes('{amount}')) {
    return templateOrDescription.replace(/\{amount\}/g, replacement);
  }

  if (/(?:^|\s)\d+(?:\.\d+)?\$/i.test(templateOrDescription)) {
    return templateOrDescription.replace(/(\d+(?:\.\d+)?)(\$)/, `${replacement}$2`);
  }

  if (/\$\d+(?:\.\d+)?/i.test(templateOrDescription)) {
    return templateOrDescription.replace(/(\$)(\d+(?:\.\d+)?)/, `$1${replacement}`);
  }

  return templateOrDescription;
}

/**
 * Normalizes a transaction description/template into a stable group key for recurring matching
 * so variable-amount entries (e.g. "paid 783.27$ weekly salary..." and "paid 835.12$ weekly salary...")
 * map to the same recurring series.
 */
export function normalizeRecurringKey(description: string, descriptionTemplate?: string): string {
  const source = (descriptionTemplate || description || '').trim();
  if (!source) return '';
  const templated = extractDescriptionTemplate(source) || source;
  return templated.trim().toLowerCase();
}
