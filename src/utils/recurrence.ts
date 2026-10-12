import { RecurrenceRule } from '../types/expense';

export function computeNextDueDate(baseDateStr: string, rule: RecurrenceRule): string {
  if (!rule || rule === 'none') return baseDateStr;

  const [year, month, day] = baseDateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);

  switch (rule) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return baseDateStr;
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

export function getNextFutureDueDate(baseDateStr: string, rule: RecurrenceRule): string {
  if (!rule || rule === 'none') return baseDateStr;
  const todayStr = new Date().toISOString().split('T')[0];
  let cur = baseDateStr;
  // Advance up to at most 100 cycles to avoid infinite loop
  let count = 0;
  while (cur < todayStr && count < 100) {
    const next = computeNextDueDate(cur, rule);
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

export function formatRecurrenceLabel(rule?: RecurrenceRule): string {
  switch (rule) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'biweekly': return 'Every 2 Weeks';
    case 'monthly': return 'Monthly';
    case 'yearly': return 'Yearly';
    default: return 'Does not repeat';
  }
}
