import { PaymentMode, Transaction, ExpenseDataState, Banner } from '../types/expense';

const STORAGE_KEY = 'expense_tracker_state_v2';

export const DEFAULT_BANNERS: Banner[] = [
  { id: 'banner-personal', name: 'Personal', color: '#8b5cf6', createdAt: 1704067200000 },
  { id: 'banner-work', name: 'Work', color: '#0ea5e9', createdAt: 1704067201000 },
  { id: 'banner-vacation', name: 'Vacation', color: '#f59e0b', createdAt: 1704067202000 },
];

export const DEFAULT_PAYMENT_MODES: PaymentMode[] = [
  {
    id: 'bank',
    name: 'Bank Account',
    icon: 'landmark',
    color: '#0a84ff',
    isSystem: true
  },
  {
    id: 'forex',
    name: 'Forex Card',
    icon: 'credit-card',
    color: '#8b5cf6',
    isSystem: true
  },
  {
    id: 'cash',
    name: 'Cash',
    icon: 'banknote',
    color: '#10b981',
    isSystem: true
  }
];

export const DEFAULT_CATEGORIES = [
  'Rent & Housing',
  'Groceries',
  'Food & Dining',
  'Transport',
  'Shopping',
  'Income',
  'Transfers',
  'Other'
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export function ensureDefaultRecurringTemplates(_transactions: Transaction[]): Transaction[] {
  return [];
}

export function loadExpenseData(): ExpenseDataState {
  try {
    // Purge legacy storage cache from earlier v1/v2 builds
    if (typeof localStorage !== 'undefined' && localStorage.getItem('expense_tracker_v3_clean') !== 'true') {
      localStorage.removeItem('expense_tracker_state_v1');
      localStorage.removeItem('expense_tracker_state_v2');
      localStorage.removeItem('expense_data_version');
      localStorage.setItem('expense_tracker_v3_clean', 'true');
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.paymentModes)) {
        const modified = ensureDefaultRecurringTemplates(parsed.transactions);
        if (modified.length > 0) {
          saveExpenseData(parsed);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load expense state from localStorage:', e);
  }

  const defaultState: ExpenseDataState = {
    version: 2,
    paymentModes: DEFAULT_PAYMENT_MODES,
    transactions: INITIAL_TRANSACTIONS,
    categories: DEFAULT_CATEGORIES,
    banners: DEFAULT_BANNERS
  };
  saveExpenseData(defaultState);
  return defaultState;
}

export function saveExpenseData(state: ExpenseDataState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save expense state to localStorage:', e);
  }
}

export function exportToJsonFile(state: ExpenseDataState): void {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `expenses-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function validateImportData(data: any): data is ExpenseDataState {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.transactions) || !Array.isArray(data.paymentModes)) return false;
  return true;
}

// Google Keep text parser to easily paste from Keep notes!
export function parseGoogleKeepText(text: string, currentModes: PaymentMode[]): Partial<Transaction>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results: Partial<Transaction>[] = [];
  let currentDate = new Date().toISOString().split('T')[0];

  const monthNames: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
  };

  for (const line of lines) {
    const dateMatch = line.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
    if (dateMatch) {
      const monthStr = dateMatch[1].toLowerCase();
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || '2024';
      if (monthNames[monthStr]) {
        currentDate = `${year}-${monthNames[monthStr]}-${day}`;
        continue;
      }
    }

    const transferMatch = line.match(/transfer(?:red)?\s*(\d+(?:\.\d+)?)\$?\s*from\s*([a-zA-Z0-9_\s]+)\s*to\s*([a-zA-Z0-9_\s]+)(?:\(\+?(\d+(?:\.\d+)?)\$?\s*(?:charge|fee)?\))?/i);
    if (transferMatch) {
      const amount = parseFloat(transferMatch[1]);
      const fromModeRaw = transferMatch[2].trim().toLowerCase();
      const toModeRaw = transferMatch[3].trim().toLowerCase();
      const fee = transferMatch[4] ? parseFloat(transferMatch[4]) : 0;
      
      const fromMode = currentModes.find(m => m.id.toLowerCase() === fromModeRaw || m.name.toLowerCase().includes(fromModeRaw))?.id || 'bank';
      const toMode = currentModes.find(m => m.id.toLowerCase() === toModeRaw || m.name.toLowerCase().includes(toModeRaw))?.id || 'bank';

      results.push({
        id: 'imported-' + Math.random().toString(36).substring(2, 9),
        date: currentDate,
        amount,
        type: 'transfer',
        paymentModeId: fromMode,
        toPaymentModeId: toMode,
        fee,
        category: 'Transfers',
        description: line,
        status: 'completed',
        createdAt: Date.now()
      });
      continue;
    }

    const incomeMatch = line.match(/put\s*(\d+(?:\.\d+)?)\$?\s*in\s*([a-zA-Z0-9_\s]+)/i);
    if (incomeMatch) {
      const amount = parseFloat(incomeMatch[1]);
      const modeRaw = incomeMatch[2].trim().toLowerCase();
      const mode = currentModes.find(m => m.id.toLowerCase() === modeRaw || m.name.toLowerCase().includes(modeRaw))?.id || 'bank';
      results.push({
        id: 'imported-' + Math.random().toString(36).substring(2, 9),
        date: currentDate,
        amount,
        type: 'income',
        paymentModeId: mode,
        category: 'Income',
        description: line,
        status: 'completed',
        createdAt: Date.now()
      });
      continue;
    }

    const expenseMatch = line.match(/^(\d+(?:\.\d+)?)\$?\s*[-–]\s*(?:from\s*)?([a-zA-Z0-9_\s]+)\s*[-–]\s*(.*)$/i);
    if (expenseMatch) {
      const amount = parseFloat(expenseMatch[1]);
      const modeRaw = expenseMatch[2].trim().toLowerCase();
      const desc = expenseMatch[3].trim();
      const mode = currentModes.find(m => m.id.toLowerCase() === modeRaw || m.name.toLowerCase().includes(modeRaw))?.id || 'bank';
      
      let category = 'Other';
      const descLower = desc.toLowerCase();
      if (descLower.includes('rent')) category = 'Rent & Housing';
      else if (descLower.includes('grocery') || descLower.includes('aldi') || descLower.includes('coles') || descLower.includes('woolworths') || descLower.includes('wolworths')) category = 'Groceries';
      else if (descLower.includes('coffee') || descLower.includes('kfc') || descLower.includes('lunch') || descLower.includes('burger')) category = 'Food & Dining';
      else if (descLower.includes('transport') || descLower.includes('myki')) category = 'Transport';

      results.push({
        id: 'imported-' + Math.random().toString(36).substring(2, 9),
        date: currentDate,
        amount,
        type: 'expense',
        paymentModeId: mode,
        category,
        description: desc,
        status: 'completed',
        createdAt: Date.now()
      });
      continue;
    }

    if (/total/i.test(line)) {
      continue;
    }
  }

  return results;
}
