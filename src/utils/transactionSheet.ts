import type { PaymentMode, Transaction } from '../types/expense';
import { parseGoogleKeepText } from './storage';

/**
 * Stitch 2x4 primary categories with icons and aliases
 */
export interface StitchCategoryDef {
  id: string;
  name: string;
  icon: string;
  aliases: string[];
}

export const PRIMARY_STITCH_CATEGORIES: StitchCategoryDef[] = [
  { id: 'insurance', name: 'Insurance', icon: '🛡️', aliases: ['insurance', 'ovhc', 'bupa', 'medibank', 'allianz'] },
  { id: 'dining', name: 'Dining', icon: '🍴', aliases: ['dining', 'food & dining', 'food', 'restaurant', 'cafe', 'coffee'] },
  { id: 'rent', name: 'Rent', icon: '🏠', aliases: ['rent', 'rent & housing', 'housing'] },
  { id: 'groceries', name: 'Groceries', icon: '🛒', aliases: ['groceries', 'grocery', 'supermarket', 'aldi', 'coles', 'woolworths'] },
  { id: 'transport', name: 'Transport', icon: '🚆', aliases: ['transport', 'myki', 'transit', 'train', 'bus', 'fuel', 'petrol'] },
  { id: 'utilities', name: 'Utilities', icon: '⚡', aliases: ['utilities', 'bills', 'electricity', 'water', 'gas', 'internet', 'optus', 'telstra'] },
  { id: 'salary', name: 'Salary', icon: '💼', aliases: ['salary', 'income', 'wages', 'paycheck', 'payroll'] },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', aliases: ['shopping', 'clothes', 'retail', 'electronics', 'kmart', 'target', 'amazon'] },
];

/**
 * Emoji dictionary for category icons
 */
export const CATEGORY_ICON_MAP: Record<string, string> = {
  'insurance': '🛡️',
  'ovhc': '🛡️',
  'bupa': '🛡️',
  'dining': '🍴',
  'food & dining': '🍴',
  'food': '🍴',
  'rent': '🏠',
  'rent & housing': '🏠',
  'housing': '🏠',
  'groceries': '🛒',
  'grocery': '🛒',
  'transport': '🚆',
  'utilities': '⚡',
  'bills': '⚡',
  'salary': '💼',
  'income': '💼',
  'shopping': '🛍️',
  'health': '🏥',
  'medical': '🏥',
  'entertainment': '🎟️',
  'education': '📚',
  'transfers': '⇄',
  'other': '🏷️'
};

/**
 * Returns an emoji icon for any category name
 */
export function getCategoryIcon(categoryName: string): string {
  if (!categoryName) return '🏷️';
  const clean = categoryName.trim().toLowerCase();
  if (CATEGORY_ICON_MAP[clean]) return CATEGORY_ICON_MAP[clean];
  for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return icon;
    }
  }
  return '🏷️';
}

/**
 * Resolve a primary Stitch category tile to an existing category name if present
 */
export function resolveCategoryName(stitchCategoryName: string, availableCategories: string[]): string {
  if (!availableCategories || availableCategories.length === 0) return stitchCategoryName;

  // Exact case-insensitive match
  const exact = availableCategories.find(c => c.toLowerCase() === stitchCategoryName.toLowerCase());
  if (exact) return exact;

  // Check aliases from definition
  const def = PRIMARY_STITCH_CATEGORIES.find(p => p.name.toLowerCase() === stitchCategoryName.toLowerCase() || p.id === stitchCategoryName.toLowerCase());
  if (def) {
    for (const alias of def.aliases) {
      const match = availableCategories.find(c => c.toLowerCase() === alias.toLowerCase() || c.toLowerCase().includes(alias.toLowerCase()));
      if (match) return match;
    }
  }

  // Fallback to the stitchCategoryName directly
  return stitchCategoryName;
}

/**
 * Returns account emoji based on icon name or mode name
 */
export function getModeEmoji(iconName?: string, modeName?: string): string {
  const i = (iconName || '').toLowerCase();
  const n = (modeName || '').toLowerCase();

  if (i.includes('banknote') || i.includes('cash') || n.includes('cash')) return '💵';
  if (i.includes('card') || i.includes('credit') || n.includes('forex') || n.includes('card')) return '💳';
  if (i.includes('bank') || i.includes('landmark') || n.includes('bank')) return '🏛️';
  if (i.includes('phone') || i.includes('smartphone') || n.includes('pay') || n.includes('mobile')) return '📱';
  if (i.includes('coin') || i.includes('crypto')) return '🪙';
  return '👛';
}

/**
 * Adds an increment to the current amount string and formats with 2 decimal places.
 */
export function applyAmountIncrement(currentAmount: string, delta: number): string {
  const parsed = parseFloat(currentAmount);
  const base = isNaN(parsed) || parsed < 0 ? 0 : parsed;
  const next = Math.max(0, base + delta);
  return next.toFixed(2);
}

/**
 * Rounds the current amount to the nearest whole dollar.
 */
export function roundAmountToWhole(currentAmount: string): string {
  const parsed = parseFloat(currentAmount);
  if (isNaN(parsed) || parsed <= 0) return '0.00';
  return Math.round(parsed).toFixed(2);
}

/**
 * Computes live balances across all payment modes given a transaction list.
 */
export function computeAccountBalances(
  modes: PaymentMode[],
  transactions: Transaction[]
): Record<string, number> {
  const balances: Record<string, number> = {};
  (modes || []).forEach(m => { balances[m.id] = 0; });

  (transactions || []).forEach(tx => {
    if (tx.status === 'cancelled') return;
    if (tx.type === 'income') {
      balances[tx.paymentModeId] = (balances[tx.paymentModeId] || 0) + tx.amount;
    } else if (tx.type === 'expense') {
      balances[tx.paymentModeId] = (balances[tx.paymentModeId] || 0) - tx.amount;
    } else if (tx.type === 'transfer') {
      const fee = tx.fee || 0;
      balances[tx.paymentModeId] = (balances[tx.paymentModeId] || 0) - (tx.amount + fee);
      if (tx.toPaymentModeId) {
        balances[tx.toPaymentModeId] = (balances[tx.toPaymentModeId] || 0) + tx.amount;
      }
    }
  });

  return balances;
}

/**
 * Formats a numerical balance into standard currency display ($1,234.56 or -$12.00).
 */
export function formatCurrencyBalance(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats a YYYY-MM-DD date string into human friendly "Oct 28, 2026"
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return 'Select Date';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return dateStr;
  }
  const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
  return dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Parses Google Keep raw snippet into transaction fields.
 * Handles single lines, multi-line notes with date headers, transfer notations, income lines, etc.
 */
export function parseKeepSnippet(snippet: string, currentModes: PaymentMode[]): Partial<Transaction> | null {
  if (!snippet || !snippet.trim()) return null;
  const text = snippet.trim();

  // 1. First run the standard Google Keep parser
  const parsedList = parseGoogleKeepText(text, currentModes);
  if (parsedList && parsedList.length > 0) {
    const item = parsedList[parsedList.length - 1]; // Pick latest item in note
    // If category is Other, attempt better inference from description
    if (item.category === 'Other' && item.description) {
      item.category = inferCategoryFromDescription(item.description);
    }
    return item;
  }

  // 2. Fallback heuristic parsing for raw single line without strict punctuation
  // e.g. "$59.87 OVHC (Bupa Insurance)" or "OVHC (Bupa Insurance) $59.87"
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/total/i.test(line)) continue;

    // Check for leading amount: "$59.87 OVHC" or "59.87 - OVHC"
    const leadingMatch = line.match(/^\$?(\d+(?:\.\d+)?)\$?\s*(?:[-–:]\s*)?(?:from\s+([a-zA-Z0-9_\s]+)\s*[-–:]\s*)?(.*)$/i);
    if (leadingMatch) {
      const amount = parseFloat(leadingMatch[1]);
      if (!isNaN(amount) && amount > 0) {
        const modeRaw = leadingMatch[2]?.trim().toLowerCase();
        const desc = leadingMatch[3]?.trim() || line;
        const matchedMode = modeRaw 
          ? (currentModes.find(m => m.id.toLowerCase() === modeRaw || m.name.toLowerCase().includes(modeRaw))?.id || currentModes[0]?.id || 'bank')
          : (currentModes[0]?.id || 'bank');

        return {
          date: new Date().toISOString().split('T')[0],
          amount,
          type: 'expense',
          paymentModeId: matchedMode,
          category: inferCategoryFromDescription(desc),
          description: desc,
          status: 'completed',
          createdAt: Date.now()
        };
      }
    }

    // Check for trailing amount: "OVHC (Bupa Insurance) $59.87"
    const trailingMatch = line.match(/^(.*?)\s+(?:[-–:]\s*)?\$?(\d+(?:\.\d+)?)\$?$/i);
    if (trailingMatch) {
      const desc = trailingMatch[1].trim();
      const amount = parseFloat(trailingMatch[2]);
      if (!isNaN(amount) && amount > 0 && desc) {
        return {
          date: new Date().toISOString().split('T')[0],
          amount,
          type: 'expense',
          paymentModeId: currentModes[0]?.id || 'bank',
          category: inferCategoryFromDescription(desc),
          description: desc,
          status: 'completed',
          createdAt: Date.now()
        };
      }
    }
  }

  return null;
}

/**
 * Infer category from description string
 */
export function inferCategoryFromDescription(description: string): string {
  if (!description) return 'Other';
  const descLower = description.toLowerCase();

  if (descLower.includes('insurance') || descLower.includes('bupa') || descLower.includes('ovhc') || descLower.includes('medibank') || descLower.includes('allianz')) {
    return 'Insurance';
  }
  if (descLower.includes('rent') || descLower.includes('housing') || descLower.includes('flat') || descLower.includes('apartment')) {
    return 'Rent & Housing';
  }
  if (descLower.includes('grocery') || descLower.includes('groceries') || descLower.includes('aldi') || descLower.includes('coles') || descLower.includes('woolworths') || descLower.includes('supermarket')) {
    return 'Groceries';
  }
  if (descLower.includes('coffee') || descLower.includes('kfc') || descLower.includes('lunch') || descLower.includes('dinner') || descLower.includes('burger') || descLower.includes('dining') || descLower.includes('restaurant') || descLower.includes('cafe')) {
    return 'Food & Dining';
  }
  if (descLower.includes('transport') || descLower.includes('myki') || descLower.includes('train') || descLower.includes('bus') || descLower.includes('tram') || descLower.includes('uber') || descLower.includes('petrol') || descLower.includes('fuel')) {
    return 'Transport';
  }
  if (descLower.includes('utility') || descLower.includes('utilities') || descLower.includes('electricity') || descLower.includes('gas') || descLower.includes('water') || descLower.includes('optus') || descLower.includes('telstra') || descLower.includes('vodafone') || descLower.includes('bill')) {
    return 'Utilities';
  }
  if (descLower.includes('salary') || descLower.includes('wage') || descLower.includes('payroll') || descLower.includes('paycheck') || descLower.includes('stipend')) {
    return 'Salary';
  }
  if (descLower.includes('shopping') || descLower.includes('kmart') || descLower.includes('target') || descLower.includes('amazon') || descLower.includes('clothes') || descLower.includes('uniqlo') || descLower.includes('zara')) {
    return 'Shopping';
  }

  return 'Other';
}
