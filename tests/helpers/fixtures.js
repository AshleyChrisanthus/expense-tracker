export const mockPaymentModes = [
  { id: 'bank', name: 'Bank Account', icon: 'landmark', color: '#0a84ff', isSystem: true },
  { id: 'forex', name: 'Forex Card', icon: 'credit-card', color: '#8b5cf6', isSystem: true },
  { id: 'cash', name: 'Cash', icon: 'banknote', color: '#10b981', isSystem: true },
  { id: 'mode-savings', name: 'Emergency Fund', icon: 'wallet', color: '#f59e0b', isSystem: false }
];

export const mockBanners = [
  { id: 'banner-personal', name: 'Personal Room Rent', color: '#8b5cf6', createdAt: 1704067200000 },
  { id: 'banner-work', name: 'work', color: '#0ea5e9', createdAt: 1704067201000 },
  { id: 'banner-vacation', name: 'vacation', color: '#f59e0b', createdAt: 1704067202000 },
  { id: 'banner-holiday', name: 'Sydney Holiday Trip', color: '#ec4899', createdAt: 1704067203000 }
];

export const mockCategories = [
  'Rent & Housing',
  'Groceries',
  'Food & Dining',
  'Transport',
  'Shopping',
  'Income',
  'Transfers',
  'Other',
  'Entertainment'
];

export const mockExpense = {
  id: 'tx-test-exp-1',
  date: '2026-10-15',
  amount: 45.50,
  type: 'expense',
  paymentModeId: 'bank',
  category: 'Groceries',
  description: 'Coles supermarket groceries',
  status: 'completed',
  createdAt: 1791162000001
};

export const mockIncome = {
  id: 'tx-test-inc-1',
  date: '2026-10-14',
  amount: 1200.00,
  type: 'income',
  paymentModeId: 'bank',
  category: 'Income',
  description: 'Biweekly salary payout',
  status: 'completed',
  createdAt: 1791162000002
};

export const mockTransfer = {
  id: 'tx-test-trf-1',
  date: '2026-10-13',
  amount: 500.00,
  type: 'transfer',
  paymentModeId: 'bank',
  toPaymentModeId: 'forex',
  fee: 15.00,
  category: 'Transfers',
  description: 'Transfer AUD from Bank to Forex Card',
  status: 'completed',
  createdAt: 1791162000003
};

export const mockRecurringWeeklyExpense = {
  id: 'tx-test-rec-weekly',
  date: '2026-10-12',
  amount: 320.00,
  type: 'expense',
  paymentModeId: 'bank',
  category: 'Rent & Housing',
  description: 'Weekly student room rent',
  recurrence: 'weekly',
  recurrenceDayOfWeek: 1, // Monday
  nextDueDate: '2026-10-19',
  bannerIds: ['banner-personal'],
  status: 'completed',
  createdAt: 1791162000004
};

export const mockRecurringMonthlyExpense = {
  id: 'tx-test-rec-monthly',
  date: '2026-10-01',
  amount: 79.99,
  type: 'expense',
  paymentModeId: 'forex',
  category: 'Other',
  description: 'Monthly broadband internet',
  recurrence: 'monthly',
  recurrenceDayOfMonth: 1,
  nextDueDate: '2026-11-01',
  bannerIds: ['banner-personal'],
  status: 'completed',
  createdAt: 1791162000005
};

export const mockSampleKeepNotesText = `
October 10, 2026
35.50$ - Bank - Woolworths groceries
12$ - Cash - KFC lunch burger
put 250$ in Bank
transferred 100$ from Bank to Forex (+2$ fee)
total for day: 147.50

October 11, 2026
320$ - Bank - Room rent payment
8.50$ - Forex - Public transport train ticket
`;

export const mockValidBackupPayload = {
  version: 2,
  paymentModes: mockPaymentModes,
  transactions: [
    mockExpense,
    mockIncome,
    mockTransfer,
    mockRecurringWeeklyExpense,
    mockRecurringMonthlyExpense
  ],
  categories: mockCategories,
  banners: mockBanners
};
