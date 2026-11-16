import type { PaymentMode, Transaction } from '../types/expense';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Formats a YYYY-MM-DD date string as "Month D,YYYY" (e.g. "November 4,2026")
 * without timezone shifting.
 */
export function formatKeepDateHeader(dateStr: string): string {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateStr.trim());
  if (!match) return dateStr;

  const year = match[1];
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const monthName = MONTH_NAMES[monthIndex];
  if (!monthName || Number.isNaN(day) || day < 1 || day > 31) {
    return dateStr;
  }

  return `${monthName} ${day},${year}`;
}

function getModeNameLower(paymentModes: PaymentMode[], modeId?: string): string {
  if (!modeId) return 'unknown';
  const mode = paymentModes.find(m => m.id === modeId);
  return mode?.name?.trim().toLowerCase() || 'unknown';
}

function buildNoteSuffix(description: string, notes?: string): string {
  const trimmedNote = notes?.trim();
  if (!trimmedNote) return '';
  const bracketed = `(${trimmedNote})`;
  if (description.endsWith(bracketed)) return '';
  return bracketed;
}

/**
 * Formats a single transaction into its Google Keep line representation.
 */
export function formatTransactionForKeep(
  tx: Transaction,
  paymentModes: PaymentMode[]
): string {
  const amountStr = Number(tx.amount || 0).toFixed(2);
  const fromMode = getModeNameLower(paymentModes, tx.paymentModeId);
  const desc = (tx.description || '').trim();
  const noteSuffix = buildNoteSuffix(desc, tx.notes);

  if (tx.type === 'income') {
    // If description already looks like a full Keep income entry (contains '$'), use it as-is
    const isAlreadyFormatted = desc.includes('$') || /^paid\s+\d/i.test(desc);
    if (isAlreadyFormatted) {
      return `${desc}${noteSuffix}`;
    }
    const label = desc || tx.category?.trim() || 'income';
    return `paid ${amountStr}$ ${label} to ${fromMode} account${noteSuffix}`;
  }

  if (tx.type === 'transfer') {
    const toMode = getModeNameLower(paymentModes, tx.toPaymentModeId);
    const transferTag = `(Transfer from ${fromMode} to ${toMode})`;
    if (!desc) {
      return `${amountStr}$-from ${fromMode}- Transfer from ${fromMode} to ${toMode}${noteSuffix}`;
    }
    const hasTransferTag = desc.toLowerCase().includes(transferTag.toLowerCase());
    return `${amountStr}$-from ${fromMode}- ${desc}${hasTransferTag ? '' : transferTag}${noteSuffix}`;
  }

  // Expense (default)
  return `${amountStr}$-from ${fromMode}- ${desc}${noteSuffix}`;
}

/**
 * Formats a list of selected transactions into Google Keep text:
 * - Date groups ordered newest-first (bottom-up)
 * - Same-day transactions ordered oldest-first (createdAt ascending)
 * - No blank line between same-day transactions; one blank line between different days
 */
export function formatTransactionsForKeep(
  transactions: Transaction[],
  paymentModes: PaymentMode[]
): string {
  if (!transactions || transactions.length === 0) return '';

  const byDate = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = tx.date || '';
    const list = byDate.get(key);
    if (list) {
      list.push(tx);
    } else {
      byDate.set(key, [tx]);
    }
  }

  // Sort dates descending (newest at top, oldest at bottom)
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  const dayBlocks = sortedDates.map(dateKey => {
    const dayTxs = byDate.get(dateKey)!;
    // Within the same day: earliest logged at the top, latest at the bottom
    const sortedDayTxs = [...dayTxs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const lines = sortedDayTxs.map(tx => formatTransactionForKeep(tx, paymentModes));
    return `${formatKeepDateHeader(dateKey)}\n${lines.join('\n')}`;
  });

  return dayBlocks.join('\n\n');
}
