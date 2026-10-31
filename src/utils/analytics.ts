import type { Transaction, PaymentMode, Banner } from '../types/expense';

export type TimeframePeriod = 'this_month' | 'last_month' | 'custom' | 'all';

export interface CustomDateRange {
  startDate: string;
  endDate: string;
}

export const CATEGORY_COLORS = [
  '#0a84ff', // Electric Blue
  '#30d158', // Mint Emerald
  '#ff9f0a', // Warm Amber
  '#bf5af2', // Orchid Purple
  '#ff375f', // Coral Rose
  '#64d2ff', // Sky Cyan
  '#ffd60a', // Bright Yellow
  '#ac8e68', // Warm Umber
  '#ff453a', // Crimson
  '#5e5ce6', // Indigo
  '#32d74b', // Apple Green
  '#98989d'  // Cool Slate
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Returns formatted month title, e.g. "Oct 2026"
 */
export function formatMonthYear(yearMonth: string): string {
  if (!yearMonth || !yearMonth.includes('-')) return yearMonth;
  const [yearStr, monthStr] = yearMonth.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const shortName = MONTH_NAMES_SHORT[monthIdx] || monthStr;
  return `${shortName} ${yearStr}`;
}

/**
 * Returns the short month name, e.g. "Sep"
 */
export function getShortMonthName(yearMonth: string): string {
  if (!yearMonth || !yearMonth.includes('-')) return '';
  const [, monthStr] = yearMonth.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  return MONTH_NAMES_SHORT[monthIdx] || '';
}

/**
 * Returns the previous month in YYYY-MM format given a YYYY-MM string
 */
export function getPreviousMonthStr(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  const prevM = month - 1;
  return `${year}-${prevM < 10 ? '0' : ''}${prevM}`;
}

/**
 * Determines the primary/latest active month from transactions or current date
 */
export function getReferenceMonth(transactions: Transaction[], explicitMonth?: string): string {
  if (explicitMonth && /^\d{4}-\d{2}$/.test(explicitMonth)) {
    return explicitMonth;
  }
  // Find latest transaction month
  let latestMonth = '';
  for (const t of transactions) {
    if (t.status === 'cancelled') continue;
    const ym = t.date?.slice(0, 7);
    if (ym && ym > latestMonth) {
      latestMonth = ym;
    }
  }
  if (latestMonth) return latestMonth;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return `${y}-${m < 10 ? '0' : ''}${m}`;
}

/**
 * Filter transactions based on selected timeframe
 */
export function filterTransactionsByTimeframe(
  transactions: Transaction[],
  timeframe: TimeframePeriod,
  referenceMonth: string,
  customRange?: CustomDateRange
): Transaction[] {
  const previousMonth = getPreviousMonthStr(referenceMonth);

  return transactions.filter(t => {
    if (t.status === 'cancelled') return false;
    const tDate = t.date || '';

    switch (timeframe) {
      case 'this_month':
        return tDate.startsWith(referenceMonth);
      case 'last_month':
        return tDate.startsWith(previousMonth);
      case 'custom':
        if (!customRange || !customRange.startDate || !customRange.endDate) return true;
        return tDate >= customRange.startDate && tDate <= customRange.endDate;
      case 'all':
      default:
        return true;
    }
  });
}

export interface CashFlowEquilibriumMetrics {
  totalInflow: number;
  inflowCount: number;
  totalOutflow: number;
  outflowCount: number;
  netReserve: number;
  burnRate: number; // percentage (0 - 100+)
  visualBurnPercent: number; // clamped 0-100 for progress bar
  visualRetainedPercent: number; // 0-100
  momDeltaPercent: number;
  momDeltaLabel: string;
  isPositiveDelta: boolean;
  statusCaption: string;
  isBreakEvenHeld: boolean;
}

/**
 * Calculates Cash Flow Equilibrium and Month-over-Month Delta
 */
export function computeCashFlowEquilibrium(
  currentPeriodTransactions: Transaction[],
  previousPeriodTransactions: Transaction[],
  prevMonthName: string
): CashFlowEquilibriumMetrics {
  let totalInflow = 0;
  let inflowCount = 0;
  let totalOutflow = 0;
  let outflowCount = 0;

  for (const t of currentPeriodTransactions) {
    if (t.status === 'cancelled') continue;
    if (t.type === 'income') {
      totalInflow += t.amount;
      inflowCount++;
    } else if (t.type === 'expense') {
      totalOutflow += t.amount;
      outflowCount++;
    } else if (t.type === 'transfer' && (t.fee || 0) > 0) {
      totalOutflow += t.fee || 0;
      outflowCount++;
    }
  }

  // Calculate previous period outflow for MoM
  let prevOutflow = 0;
  for (const t of previousPeriodTransactions) {
    if (t.status === 'cancelled') continue;
    if (t.type === 'expense') {
      prevOutflow += t.amount;
    } else if (t.type === 'transfer' && (t.fee || 0) > 0) {
      prevOutflow += t.fee || 0;
    }
  }

  const netReserve = totalInflow - totalOutflow;
  const burnRate = totalInflow > 0 
    ? (totalOutflow / totalInflow) * 100 
    : (totalOutflow > 0 ? 100 : 0);

  const visualBurnPercent = Math.min(Math.max(burnRate, 0), 100);
  const visualRetainedPercent = Math.max(0, 100 - visualBurnPercent);

  // MoM Delta calculation
  let momDeltaPercent = 0;
  let momDeltaLabel = 'Stable';
  let isPositiveDelta = true;

  if (prevOutflow > 0) {
    momDeltaPercent = ((totalOutflow - prevOutflow) / prevOutflow) * 100;
    const sign = momDeltaPercent >= 0 ? '+' : '';
    momDeltaLabel = `${sign}${momDeltaPercent.toFixed(1)}% vs ${prevMonthName || 'Prev'}`;
    isPositiveDelta = momDeltaPercent <= 0; // Less outflow is positive financial delta
  } else if (totalOutflow > 0) {
    momDeltaLabel = `+100% vs ${prevMonthName || 'Prev'}`;
    isPositiveDelta = false;
  } else {
    momDeltaLabel = `Stable vs ${prevMonthName || 'Prev'}`;
  }

  const isBreakEvenHeld = netReserve >= 0;
  const statusCaption = isBreakEvenHeld
    ? 'Break-even line held'
    : `Deficit burn: -$${Math.abs(netReserve).toFixed(2)}`;

  return {
    totalInflow,
    inflowCount,
    totalOutflow,
    outflowCount,
    netReserve,
    burnRate,
    visualBurnPercent,
    visualRetainedPercent,
    momDeltaPercent,
    momDeltaLabel,
    isPositiveDelta,
    statusCaption,
    isBreakEvenHeld
  };
}

/**
 * Returns category emoji / squircle symbol
 */
export function getCategoryEmoji(category: string): string {
  const lower = (category || '').toLowerCase();
  if (lower.includes('rent') || lower.includes('housing') || lower.includes('room') || lower.includes('home') || lower.includes('mortgage')) {
    return '🏠';
  }
  if (lower.includes('grocer') || lower.includes('food') || lower.includes('supermarket') || lower.includes('market') || lower.includes('aldi') || lower.includes('coles') || lower.includes('woolworths')) {
    return '🛒';
  }
  if (lower.includes('util') || lower.includes('repair') || lower.includes('tool') || lower.includes('maintenance') || lower.includes('hardware')) {
    return '🧰';
  }
  if (lower.includes('health') || lower.includes('medic') || lower.includes('doctor') || lower.includes('pharm') || lower.includes('hospital')) {
    return '🏥';
  }
  if (lower.includes('bill') || lower.includes('insur') || lower.includes('subscription') || lower.includes('ovhc') || lower.includes('phone') || lower.includes('optus') || lower.includes('telstra')) {
    return '💳';
  }
  if (lower.includes('shop') || lower.includes('cloth') || lower.includes('retail') || lower.includes('item') || lower.includes('goods')) {
    return '品';
  }
  if (lower.includes('dining') || lower.includes('coffee') || lower.includes('cafe') || lower.includes('restaurant') || lower.includes('drink')) {
    return '☕';
  }
  if (lower.includes('transport') || lower.includes('travel') || lower.includes('fuel') || lower.includes('gas') || lower.includes('car') || lower.includes('uber') || lower.includes('train') || lower.includes('metro')) {
    return '🚗';
  }
  if (lower.includes('entertain') || lower.includes('movie') || lower.includes('cinema') || lower.includes('game') || lower.includes('fun')) {
    return '🎬';
  }
  if (lower.includes('salary') || lower.includes('wage') || lower.includes('income') || lower.includes('deposit')) {
    return '💰';
  }
  return '🏷️';
}

export interface CategoryCardData {
  id: string;
  name: string;
  amount: number;
  count: number;
  percent: number;
  color: string;
  emoji: string;
  subtitle: string;
}

export interface CategoryBreakdownResult {
  categories: CategoryCardData[];
  totalSpend: number;
  topSpendAmount: number;
  classifiedPercent: number;
}

/**
 * Computes ranked category breakdown, top merchant subtitle, and classified spend percentage
 */
export function computeCategoryBreakdown(
  transactions: Transaction[],
  _allCategories: string[] = [],
  banners: Banner[] = [],
  sortBy: 'amount' | 'count' | 'name' = 'amount'
): CategoryBreakdownResult {
  const catSpending: Record<string, number> = {};
  const catCounts: Record<string, number> = {};
  const catDescFrequency: Record<string, Record<string, number>> = {};
  const catBanners: Record<string, Set<string>> = {};

  let totalSpend = 0;
  let classifiedSpend = 0;

  for (const t of transactions) {
    if (t.status === 'cancelled') continue;
    let spend = 0;
    if (t.type === 'expense') {
      spend = t.amount;
    } else if (t.type === 'transfer' && (t.fee || 0) > 0) {
      spend = t.fee || 0;
    }
    if (spend <= 0) continue;

    totalSpend += spend;
    const cat = t.category?.trim() || 'Uncategorized';
    catSpending[cat] = (catSpending[cat] || 0) + spend;
    catCounts[cat] = (catCounts[cat] || 0) + 1;

    // Track description frequency
    if (t.description?.trim()) {
      const d = t.description.trim();
      if (!catDescFrequency[cat]) catDescFrequency[cat] = {};
      catDescFrequency[cat][d] = (catDescFrequency[cat][d] || 0) + 1;
    }

    // Track banners
    if (t.bannerIds && t.bannerIds.length > 0) {
      if (!catBanners[cat]) catBanners[cat] = new Set();
      t.bannerIds.forEach(bId => catBanners[cat].add(bId));
    }

    const isClassified = cat !== 'Uncategorized' && cat.toLowerCase() !== 'other' && cat !== '';
    if (isClassified) {
      classifiedSpend += spend;
    }
  }

  const bannerMap = new Map(banners.map(b => [b.id, b.name]));

  const categoryEntries = Object.entries(catSpending).map(([name, amount], index) => {
    const count = catCounts[name] || 0;
    const percent = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
    const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    const emoji = getCategoryEmoji(name);

    // Pick top description
    let topDesc = '';
    let topDescCount = 0;
    if (catDescFrequency[name]) {
      for (const [desc, freq] of Object.entries(catDescFrequency[name])) {
        if (freq > topDescCount) {
          topDescCount = freq;
          topDesc = desc;
        }
      }
    }

    // Pick top banner if any
    let bannerName = '';
    if (catBanners[name] && catBanners[name].size > 0) {
      const firstBannerId = Array.from(catBanners[name])[0];
      bannerName = bannerMap.get(firstBannerId) || '';
    }

    let subtitle = '';
    if (topDesc && bannerName) {
      subtitle = `${topDesc} / ${bannerName}`;
    } else if (topDesc) {
      subtitle = topDesc;
    } else if (bannerName) {
      subtitle = bannerName;
    } else {
      subtitle = `${count} transactions recorded`;
    }

    return {
      id: name,
      name,
      amount,
      count,
      percent,
      color,
      emoji,
      subtitle
    };
  });

  // Sort
  if (sortBy === 'amount') {
    categoryEntries.sort((a, b) => b.amount - a.amount);
  } else if (sortBy === 'count') {
    categoryEntries.sort((a, b) => b.count - a.count);
  } else {
    categoryEntries.sort((a, b) => a.name.localeCompare(b.name));
  }

  const topSpendAmount = categoryEntries.length > 0 ? categoryEntries[0].amount : 0;
  const classifiedPercent = totalSpend > 0 
    ? Math.round((classifiedSpend / totalSpend) * 100) 
    : 100;

  return {
    categories: categoryEntries,
    totalSpend,
    topSpendAmount,
    classifiedPercent
  };
}

export interface AccountDistributionItem {
  id: string;
  name: string;
  balance: number;
  spending: number;
  percent: number;
  color: string;
  icon: string;
}

/**
 * Computes Account Distribution percentage bar across payment modes
 */
export function computeAccountDistribution(
  paymentModes: PaymentMode[],
  transactions: Transaction[]
): { accounts: AccountDistributionItem[]; totalBalance: number } {
  const balances: Record<string, number> = {};
  const spending: Record<string, number> = {};

  for (const m of paymentModes) {
    balances[m.id] = 0;
    spending[m.id] = 0;
  }

  for (const tx of transactions) {
    if (tx.status === 'cancelled') continue;

    if (tx.type === 'income') {
      balances[tx.paymentModeId] = (balances[tx.paymentModeId] || 0) + tx.amount;
    } else if (tx.type === 'expense') {
      balances[tx.paymentModeId] = (balances[tx.paymentModeId] || 0) - tx.amount;
      spending[tx.paymentModeId] = (spending[tx.paymentModeId] || 0) + tx.amount;
    } else if (tx.type === 'transfer') {
      const fee = tx.fee || 0;
      balances[tx.paymentModeId] = (balances[tx.paymentModeId] || 0) - (tx.amount + fee);
      if (tx.toPaymentModeId) {
        balances[tx.toPaymentModeId] = (balances[tx.toPaymentModeId] || 0) + tx.amount;
      }
      if (fee > 0) {
        spending[tx.paymentModeId] = (spending[tx.paymentModeId] || 0) + fee;
      }
    }
  }

  // Calculate positive balances total
  let positiveTotal = 0;
  let totalSpending = 0;
  for (const m of paymentModes) {
    const bal = balances[m.id] || 0;
    if (bal > 0) positiveTotal += bal;
    totalSpending += spending[m.id] || 0;
  }

  const useBalances = positiveTotal > 0;
  const divisor = useBalances ? positiveTotal : (totalSpending > 0 ? totalSpending : 1);

  const accounts: AccountDistributionItem[] = paymentModes.map((m, idx) => {
    const bal = balances[m.id] || 0;
    const sp = spending[m.id] || 0;
    const value = useBalances ? Math.max(0, bal) : sp;
    const percent = divisor > 0 ? (value / divisor) * 100 : 0;
    const defaultColor = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

    return {
      id: m.id,
      name: m.name,
      balance: bal,
      spending: sp,
      percent,
      color: m.color || defaultColor,
      icon: m.icon || 'credit-card'
    };
  });

  // Sort by share descending
  accounts.sort((a, b) => b.percent - a.percent);

  return {
    accounts,
    totalBalance: positiveTotal
  };
}

export interface InternalTransferItem {
  id: string;
  date: string;
  amount: number;
  fee?: number;
  fromAccountName: string;
  toAccountName: string;
  description: string;
  statusBadge: string;
}

/**
 * Extracts and formats recent account-to-account internal transfers
 */
export function extractRecentInternalTransfers(
  transactions: Transaction[],
  paymentModes: PaymentMode[],
  limit: number = 5
): InternalTransferItem[] {
  const modeMap = new Map(paymentModes.map(m => [m.id, m.name]));

  const transfers = transactions
    .filter(t => t.type === 'transfer' && t.status !== 'cancelled')
    .sort((a, b) => {
      // Sort desc by date, then by createdAt
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.createdAt || 0) - (a.createdAt || 0);
    })
    .slice(0, limit);

  return transfers.map(tx => {
    const fromAccountName = modeMap.get(tx.paymentModeId) || tx.paymentModeId;
    const toAccountName = tx.toPaymentModeId ? (modeMap.get(tx.toPaymentModeId) || tx.toPaymentModeId) : 'Destination';

    const isForex = fromAccountName.toLowerCase().includes('forex') || toAccountName.toLowerCase().includes('forex');
    const statusBadge = isForex ? 'Converted' : 'Settled';

    let description = tx.description?.trim() || tx.notes?.trim() || 'Internal Account Transfer';
    if (!description || description.toLowerCase().includes('transfer')) {
      description = isForex ? 'Forex Currency Transfer' : 'ATM / Account Transfer';
    }

    return {
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      fee: tx.fee,
      fromAccountName,
      toAccountName,
      description,
      statusBadge
    };
  });
}
