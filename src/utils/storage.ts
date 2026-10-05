import { PaymentMode, Transaction, ExpenseDataState } from '../types/expense';

const STORAGE_KEY = 'expense_tracker_state_v1';

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
  'Rent',
  'Groceries',
  'Coffee & Dining',
  'Transport',
  'Education & Fees',
  'Bills & Utilities',
  'Income / Deposit',
  'Transfers',
  'Other'
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    date: '2024-03-31',
    amount: 170.00,
    type: 'expense',
    paymentModeId: 'bank',
    category: 'Rent',
    description: 'room rent',
    status: 'completed',
    createdAt: new Date('2024-03-31T12:00:00').getTime()
  },
  {
    id: 'tx-2',
    date: '2024-03-28',
    amount: 2.03,
    type: 'expense',
    paymentModeId: 'forex',
    category: 'Coffee & Dining',
    description: 'ezymart coffee',
    status: 'completed',
    createdAt: new Date('2024-03-28T09:00:00').getTime()
  },
  {
    id: 'tx-3',
    date: '2024-03-28',
    amount: 4.49,
    type: 'expense',
    paymentModeId: 'forex',
    category: 'Groceries',
    description: 'aldi grocery(City)',
    status: 'completed',
    createdAt: new Date('2024-03-28T14:00:00').getTime()
  },
  {
    id: 'tx-4',
    date: '2024-03-28',
    amount: 24.06,
    type: 'expense',
    paymentModeId: 'forex',
    category: 'Groceries',
    description: 'aldi grocery(Camberwell)',
    status: 'completed',
    createdAt: new Date('2024-03-28T17:30:00').getTime()
  },
  {
    id: 'tx-5',
    date: '2024-03-24',
    amount: 170.00,
    type: 'expense',
    paymentModeId: 'bank',
    category: 'Rent',
    description: 'room rent',
    status: 'completed',
    createdAt: new Date('2024-03-24T10:00:00').getTime()
  },
  {
    id: 'tx-6',
    date: '2024-03-24',
    amount: 56.70,
    type: 'expense',
    paymentModeId: 'forex',
    category: 'Groceries',
    description: 'coles grocery',
    status: 'completed',
    createdAt: new Date('2024-03-24T15:20:00').getTime()
  },
  {
    id: 'tx-7',
    date: '2024-03-24',
    amount: 175.68,
    type: 'expense',
    paymentModeId: 'bank',
    category: 'Education & Fees',
    description: 'rmit s1 services and amenities fee',
    status: 'completed',
    createdAt: new Date('2024-03-24T16:00:00').getTime()
  },
  {
    id: 'tx-8',
    date: '2024-03-21',
    amount: 8.11,
    type: 'expense',
    paymentModeId: 'forex',
    category: 'Groceries',
    description: 'ezymart(grocery near RMIT)',
    status: 'completed',
    createdAt: new Date('2024-03-21T11:15:00').getTime()
  },
  {
    id: 'tx-9',
    date: '2024-03-21',
    amount: 30.72,
    type: 'expense',
    paymentModeId: 'forex',
    category: 'Groceries',
    description: 'coles grocery',
    status: 'completed',
    createdAt: new Date('2024-03-21T16:45:00').getTime()
  },
  {
    id: 'tx-10',
    date: '2024-03-21',
    amount: 50.00,
    type: 'expense',
    paymentModeId: 'bank',
    category: 'Transport',
    description: 'public transport top up',
    status: 'completed',
    createdAt: new Date('2024-03-21T18:00:00').getTime()
  },
  {
    id: 'tx-11',
    date: '2024-03-18',
    amount: 6.95,
    type: 'expense',
    paymentModeId: 'forex',
    category: 'Coffee & Dining',
    description: 'kfc',
    status: 'completed',
    createdAt: new Date('2024-03-18T13:00:00').getTime()
  },
  {
    id: 'tx-12',
    date: '2024-03-17',
    amount: 170.00,
    type: 'expense',
    paymentModeId: 'bank',
    category: 'Rent',
    description: 'room rent',
    status: 'completed',
    createdAt: new Date('2024-03-17T12:00:00').getTime()
  },
  {
    id: 'tx-13',
    date: '2024-03-15',
    amount: 39.70,
    type: 'expense',
    paymentModeId: 'bank',
    category: 'Groceries',
    description: 'wolworths grocery',
    status: 'completed',
    createdAt: new Date('2024-03-15T17:10:00').getTime()
  },
  {
    id: 'tx-14',
    date: '2024-03-14',
    amount: 1000.00,
    type: 'transfer',
    paymentModeId: 'forex',
    toPaymentModeId: 'bank',
    fee: 7.50,
    category: 'Transfers',
    description: 'Transferred 1000$ from forex to bank',
    notes: '+7.5$ transfer charge',
    status: 'completed',
    createdAt: new Date('2024-03-14T09:00:00').getTime()
  },
  {
    id: 'tx-15',
    date: '2024-03-14',
    amount: 4.00,
    type: 'expense',
    paymentModeId: 'bank',
    category: 'Coffee & Dining',
    description: 'lunch at uni',
    status: 'completed',
    createdAt: new Date('2024-03-14T12:30:00').getTime()
  },
  {
    id: 'tx-16',
    date: '2024-03-14',
    amount: 29.73,
    type: 'expense',
    paymentModeId: 'bank',
    category: 'Groceries',
    description: 'coles grocery',
    status: 'completed',
    createdAt: new Date('2024-03-14T18:00:00').getTime()
  },
  {
    id: 'tx-17',
    date: '2024-03-11',
    amount: 83.76,
    type: 'expense',
    paymentModeId: 'forex',
    category: 'Groceries',
    description: 'coles grocery',
    status: 'completed',
    createdAt: new Date('2024-03-11T16:00:00').getTime()
  },
  {
    id: 'tx-18',
    date: '2024-03-10',
    amount: 20.00,
    type: 'expense',
    paymentModeId: 'bank',
    category: 'Transport',
    description: 'public transport top up',
    status: 'completed',
    createdAt: new Date('2024-03-10T09:30:00').getTime()
  },
  {
    id: 'tx-19',
    date: '2024-03-09',
    amount: 170.00,
    type: 'expense',
    paymentModeId: 'cash',
    category: 'Rent',
    description: 'room rent',
    status: 'completed',
    createdAt: new Date('2024-03-09T11:00:00').getTime()
  },
  {
    id: 'tx-20',
    date: '2024-03-07',
    amount: 2.00,
    type: 'expense',
    paymentModeId: 'forex',
    category: 'Coffee & Dining',
    description: '7eleven coffee',
    status: 'completed',
    createdAt: new Date('2024-03-07T08:30:00').getTime()
  },
  {
    id: 'tx-21',
    date: '2024-03-07',
    amount: 14.00,
    type: 'expense',
    paymentModeId: 'bank',
    category: 'Transport',
    description: 'public transport top up',
    status: 'completed',
    createdAt: new Date('2024-03-07T09:15:00').getTime()
  },
  {
    id: 'tx-22',
    date: '2024-03-05',
    amount: 100.00,
    type: 'income',
    paymentModeId: 'bank',
    category: 'Income / Deposit',
    description: 'Put 100$ in bank account',
    status: 'completed',
    createdAt: new Date('2024-03-05T10:00:00').getTime()
  },
  {
    id: 'tx-23',
    date: '2024-03-05',
    amount: 20.00,
    type: 'expense',
    paymentModeId: 'bank',
    category: 'Transport',
    description: 'public transport top up',
    status: 'completed',
    createdAt: new Date('2024-03-05T11:30:00').getTime()
  },
  {
    id: 'tx-24',
    date: '2024-03-02',
    amount: 39.00,
    type: 'expense',
    paymentModeId: 'cash',
    category: 'Bills & Utilities',
    description: 'Sim - To Elvis',
    notes: "Total was 65$ with transport card (he didn't take the money)",
    status: 'cancelled',
    createdAt: new Date('2024-03-02T10:00:00').getTime()
  },
  {
    id: 'tx-25',
    date: '2024-03-02',
    amount: 26.00,
    type: 'expense',
    paymentModeId: 'cash',
    category: 'Transport',
    description: 'Transport card - To Elvis',
    notes: "He didn't take the money",
    status: 'cancelled',
    createdAt: new Date('2024-03-02T10:05:00').getTime()
  }
];

export function loadExpenseData(): ExpenseDataState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.paymentModes)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load expense state from localStorage:', e);
  }

  // Initial state with user's keep sample data
  const defaultState: ExpenseDataState = {
    version: 1,
    paymentModes: DEFAULT_PAYMENT_MODES,
    transactions: INITIAL_TRANSACTIONS,
    categories: DEFAULT_CATEGORIES
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
    // Check if line is a date (e.g. "March 31, 2024" or "March 31")
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

    // Check if line is a transfer (e.g. "Transferred 1000$ from forex to bank(+7.5$ charge)")
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
        notes: fee > 0 ? `+${fee}$ fee` : undefined,
        status: 'completed',
        createdAt: Date.now()
      });
      continue;
    }

    // Check if income / deposit (e.g. "Put 100$ in bank account")
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
        category: 'Income / Deposit',
        description: line,
        status: 'completed',
        createdAt: Date.now()
      });
      continue;
    }

    // Check if standard expense: "170$-from bank- room rent" or "2.03$-from forex- ezymart coffee" or "170$-cash- room rent"
    const expenseMatch = line.match(/^(\d+(?:\.\d+)?)\$?\s*[-–]\s*(?:from\s*)?([a-zA-Z0-9_\s]+)\s*[-–]\s*(.*)$/i);
    if (expenseMatch) {
      const amount = parseFloat(expenseMatch[1]);
      const modeRaw = expenseMatch[2].trim().toLowerCase();
      const desc = expenseMatch[3].trim();
      const mode = currentModes.find(m => m.id.toLowerCase() === modeRaw || m.name.toLowerCase().includes(modeRaw))?.id || 'bank';
      
      let category = 'Other';
      const descLower = desc.toLowerCase();
      if (descLower.includes('rent')) category = 'Rent';
      else if (descLower.includes('grocery') || descLower.includes('aldi') || descLower.includes('coles') || descLower.includes('wolworths')) category = 'Groceries';
      else if (descLower.includes('coffee') || descLower.includes('kfc') || descLower.includes('lunch')) category = 'Coffee & Dining';
      else if (descLower.includes('transport') || descLower.includes('myki')) category = 'Transport';
      else if (descLower.includes('rmit') || descLower.includes('fee') || descLower.includes('amenities')) category = 'Education & Fees';

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

    // Ignore headers like "Total-16$", "Total Expenses=36$"
    if (/total/i.test(line)) {
      continue;
    }
  }

  return results;
}
