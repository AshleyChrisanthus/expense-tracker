import { RecurrenceRule } from '../types/expense';

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
  if (!rule || rule === 'none') return baseDateStr;

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
  if (!rule || rule === 'none') return baseDateStr;

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
  if (!rule || rule === 'none') return baseDateStr;
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

export function getRecurrenceDueInfo(dueDateStr?: string) {
  if (!dueDateStr) return null;

  const todayStr = new Date().toISOString().split('T')[0];
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
    default:
      return 'Does not repeat';
  }
}
