import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAnalyticsModule } from '../helpers/setup.js';

describe('Tier 1: Stitch Mobile UI — Analytics Breakdown, Cash Flow Equilibrium & Vault Dashboard (Issue #23)', () => {

  const mockPaymentModes = [
    { id: 'bank', name: 'Bank Account', icon: 'landmark', color: '#0a84ff' },
    { id: 'forex', name: 'Forex Card', icon: 'credit-card', color: '#30d158' },
    { id: 'cash', name: 'Cash Wallet', icon: 'wallet', color: '#ff9f0a' }
  ];

  const mockBanners = [
    { id: 'b-deposit', name: 'Kingsbury & Deposit', color: '#bf5af2', createdAt: 1 }
  ];

  const mockTransactions = [
    // Income deposits
    {
      id: 'tx-inc-1',
      date: '2026-10-05',
      amount: 4000.00,
      type: 'income',
      paymentModeId: 'bank',
      category: 'Salary',
      description: 'Monthly Engineering Salary',
      status: 'completed',
      createdAt: 100
    },
    {
      id: 'tx-inc-2',
      date: '2026-10-18',
      amount: 273.21,
      type: 'income',
      paymentModeId: 'bank',
      category: 'Freelance',
      description: 'Consulting payout',
      status: 'completed',
      createdAt: 101
    },

    // Expenses (October 2026)
    {
      id: 'tx-exp-rent',
      date: '2026-10-02',
      amount: 3240.00,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Housing & Room Rent',
      description: 'Kingsbury & Deposit',
      bannerIds: ['b-deposit'],
      status: 'completed',
      createdAt: 102
    },
    {
      id: 'tx-exp-groc',
      date: '2026-10-10',
      amount: 540.00,
      type: 'expense',
      paymentModeId: 'forex',
      category: 'Groceries & Supplies',
      description: 'Aldi and Coles weekly run',
      status: 'completed',
      createdAt: 103
    },
    {
      id: 'tx-exp-ovhc',
      date: '2026-10-15',
      amount: 59.87,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Health Insurance',
      description: 'OVHC Bupa Insurance',
      status: 'completed',
      createdAt: 104
    },
    {
      id: 'tx-exp-cancelled',
      date: '2026-10-20',
      amount: 250.00,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Shopping',
      description: 'Cancelled Jacket',
      status: 'cancelled',
      createdAt: 105
    },

    // Transfers with fee
    {
      id: 'tx-transfer-atm',
      date: '2026-10-22',
      amount: 400.00,
      fee: 2.50,
      type: 'transfer',
      paymentModeId: 'bank',
      toPaymentModeId: 'cash',
      category: 'Transfers',
      description: 'ATM Withdrawal',
      status: 'completed',
      createdAt: 106
    },
    {
      id: 'tx-transfer-forex',
      date: '2026-10-25',
      amount: 300.00,
      fee: 5.00,
      type: 'transfer',
      paymentModeId: 'bank',
      toPaymentModeId: 'forex',
      category: 'Transfers',
      description: 'Forex conversion top-up',
      status: 'completed',
      createdAt: 107
    },

    // September 2026 Previous Month Inflow & Expenses
    {
      id: 'tx-sep-inc1',
      date: '2026-09-01',
      amount: 20000.00,
      type: 'income',
      paymentModeId: 'bank',
      category: 'Salary',
      description: 'September Salary & Savings',
      status: 'completed',
      createdAt: 48
    },
    {
      id: 'tx-sep-tr1',
      date: '2026-09-01',
      amount: 1000.00,
      type: 'transfer',
      paymentModeId: 'bank',
      toPaymentModeId: 'forex',
      category: 'Transfers',
      description: 'Initial Forex Load',
      status: 'completed',
      createdAt: 49
    },
    {
      id: 'tx-sep-exp1',
      date: '2026-09-02',
      amount: 3000.00,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Housing & Room Rent',
      description: 'September Rent',
      status: 'completed',
      createdAt: 50
    },
    {
      id: 'tx-sep-exp2',
      date: '2026-09-15',
      amount: 400.00,
      type: 'expense',
      paymentModeId: 'forex',
      category: 'Groceries & Supplies',
      description: 'September Groceries',
      status: 'completed',
      createdAt: 51
    }
  ];

  it('should format month labels and calculate previous months correctly', async () => {
    const { formatMonthYear, getShortMonthName, getPreviousMonthStr } = await getAnalyticsModule();

    assert.equal(formatMonthYear('2026-10'), 'Oct 2026');
    assert.equal(formatMonthYear('2026-01'), 'Jan 2026');
    assert.equal(getShortMonthName('2026-09'), 'Sep');
    assert.equal(getPreviousMonthStr('2026-10'), '2026-09');
    assert.equal(getPreviousMonthStr('2026-01'), '2025-12');
  });

  it('should filter transactions by timeframe (this_month, last_month, custom, all)', async () => {
    const { filterTransactionsByTimeframe } = await getAnalyticsModule();
    const referenceMonth = '2026-10';

    // This Month
    const thisMonth = filterTransactionsByTimeframe(mockTransactions, 'this_month', referenceMonth);
    assert.equal(thisMonth.length, 7); // 2 incomes + 3 valid expenses + 2 transfers (cancelled excluded)
    assert.ok(thisMonth.every(t => t.date.startsWith('2026-10')));

    // Last Month
    const lastMonth = filterTransactionsByTimeframe(mockTransactions, 'last_month', referenceMonth);
    assert.equal(lastMonth.length, 4);
    assert.ok(lastMonth.every(t => t.date.startsWith('2026-09')));

    // Custom Date Range
    const custom = filterTransactionsByTimeframe(mockTransactions, 'custom', referenceMonth, {
      startDate: '2026-10-10',
      endDate: '2026-10-22'
    });
    assert.equal(custom.length, 4); // tx-inc-2, tx-exp-groc, tx-exp-ovhc, tx-transfer-atm

    // All Time
    const all = filterTransactionsByTimeframe(mockTransactions, 'all', referenceMonth);
    assert.equal(all.length, 11); // all non-cancelled
  });

  it('should calculate Cash Flow Equilibrium, Burn Rate, and Month-over-Month Delta', async () => {
    const { filterTransactionsByTimeframe, computeCashFlowEquilibrium } = await getAnalyticsModule();
    const currTxs = filterTransactionsByTimeframe(mockTransactions, 'this_month', '2026-10');
    const prevTxs = filterTransactionsByTimeframe(mockTransactions, 'last_month', '2026-10');

    const result = computeCashFlowEquilibrium(currTxs, prevTxs, 'Sep');

    // Inflow: 4000.00 + 273.21 = 4273.21
    assert.equal(result.totalInflow, 4273.21);
    assert.equal(result.inflowCount, 2);

    // Outflow: 3240.00 + 540.00 + 59.87 + transfer fees (2.50 + 5.00) = 3847.37
    assert.equal(result.totalOutflow, 3847.37);
    assert.equal(result.outflowCount, 5); // 3 expenses + 2 transfer fees

    // Net reserve = 4273.21 - 3847.37 = 425.84
    assert.equal(Math.round(result.netReserve * 100) / 100, 425.84);
    assert.equal(result.isBreakEvenHeld, true);
    assert.equal(result.statusCaption, 'Break-even line held');

    // Burn rate = (3847.37 / 4273.21) * 100 = ~90.03%
    assert.equal(result.burnRate.toFixed(1), '90.0');
    assert.equal(result.visualBurnPercent.toFixed(1), '90.0');
    assert.equal(result.visualRetainedPercent.toFixed(1), '10.0');

    // Previous outflow = 3000 + 400 = 3400
    // MoM change = ((3847.37 - 3400) / 3400) * 100 = +13.15% -> +13.2% vs Sep
    assert.equal(result.momDeltaLabel, '+13.2% vs Sep');
  });

  it('should handle zero inflow and deficit burn in Cash Flow Equilibrium', async () => {
    const { computeCashFlowEquilibrium } = await getAnalyticsModule();
    const deficitTxs = [
      { id: '1', date: '2026-10-01', amount: 500, type: 'expense', status: 'completed' }
    ];
    const prevTxs = [
      { id: '2', date: '2026-09-01', amount: 400, type: 'expense', status: 'completed' }
    ];

    const result = computeCashFlowEquilibrium(deficitTxs, prevTxs, 'Sep');
    assert.equal(result.totalInflow, 0);
    assert.equal(result.totalOutflow, 500);
    assert.equal(result.netReserve, -500);
    assert.equal(result.burnRate, 100);
    assert.equal(result.isBreakEvenHeld, false);
    assert.equal(result.statusCaption, 'Deficit burn: -$500.00');
  });

  it('should compute Category Breakdown with squircle emojis, top merchant subtitles and classified %', async () => {
    const { filterTransactionsByTimeframe, computeCategoryBreakdown } = await getAnalyticsModule();
    const currTxs = filterTransactionsByTimeframe(mockTransactions, 'this_month', '2026-10');
    const breakdown = computeCategoryBreakdown(currTxs, [], mockBanners, 'amount');

    assert.equal(breakdown.categories.length, 4); // Housing, Groceries, Health Insurance, Transfers fee
    const topCat = breakdown.categories[0];

    assert.equal(topCat.name, 'Housing & Room Rent');
    assert.equal(topCat.amount, 3240.00);
    assert.equal(topCat.emoji, '🏠');
    // Top merchant subtitle incorporates description / banner
    assert.ok(topCat.subtitle.includes('Kingsbury & Deposit'));
    assert.equal(Math.round(topCat.percent), 84); // 3240 / 3847.37 = ~84.2%

    // Check grocery emoji
    const grocCat = breakdown.categories.find(c => c.name.includes('Groceries'));
    assert.ok(grocCat);
    assert.equal(grocCat.emoji, '🛒');

    // Check health emoji
    const healthCat = breakdown.categories.find(c => c.name.includes('Health'));
    assert.ok(healthCat);
    assert.equal(healthCat.emoji, '🏥');

    assert.equal(breakdown.topSpendAmount, 3240.00);
    assert.equal(breakdown.classifiedPercent, 100);
  });

  it('should assign correct emojis for diverse category categories via getCategoryEmoji', async () => {
    const { getCategoryEmoji } = await getAnalyticsModule();
    assert.equal(getCategoryEmoji('Room rent'), '🏠');
    assert.equal(getCategoryEmoji('Supermarket & Grocery'), '🛒');
    assert.equal(getCategoryEmoji('Tool Repairs & Utilities'), '🧰');
    assert.equal(getCategoryEmoji('Monthly Bills & Subscriptions'), '💳');
    assert.equal(getCategoryEmoji('Shopping Mall'), '品');
    assert.equal(getCategoryEmoji('Cafe Coffee Dining'), '☕');
    assert.equal(getCategoryEmoji('Car Fuel & Transport'), '🚗');
    assert.equal(getCategoryEmoji('Medical Doctor'), '🏥');
    assert.equal(getCategoryEmoji('Cinema Movies'), '🎬');
    assert.equal(getCategoryEmoji('Salary & Wages'), '💰');
    assert.equal(getCategoryEmoji('Miscellaneous'), '🏷️');
  });

  it('should compute Account Distribution stacked bar shares across payment modes', async () => {
    const { computeAccountDistribution } = await getAnalyticsModule();
    const dist = computeAccountDistribution(mockPaymentModes, mockTransactions);

    assert.equal(dist.accounts.length, 3);
    const bank = dist.accounts.find(a => a.id === 'bank');
    const forex = dist.accounts.find(a => a.id === 'forex');
    const cash = dist.accounts.find(a => a.id === 'cash');

    assert.ok(bank);
    assert.ok(forex);
    assert.ok(cash);

    // Bank received $4,273.21 income and paid expenses & transfers
    // Balances are positive, Bank holds the vast majority of funds
    assert.ok(bank.percent > 70);
    const sumPercent = dist.accounts.reduce((sum, a) => sum + a.percent, 0);
    assert.ok(Math.abs(sumPercent - 100) < 0.1);
  });

  it('should extract recent Internal Transfers with resolved mode names, fee, and status', async () => {
    const { extractRecentInternalTransfers } = await getAnalyticsModule();
    const transfers = extractRecentInternalTransfers(mockTransactions, mockPaymentModes, 5);

    assert.equal(transfers.length, 3);
    const forexTransfer = transfers[0]; // 2026-10-25
    assert.equal(forexTransfer.fromAccountName, 'Bank Account');
    assert.equal(forexTransfer.toAccountName, 'Forex Card');
    assert.equal(forexTransfer.amount, 300.00);
    assert.equal(forexTransfer.fee, 5.00);
    assert.equal(forexTransfer.statusBadge, 'Converted');

    const atmTransfer = transfers[1]; // 2026-10-22
    assert.equal(atmTransfer.fromAccountName, 'Bank Account');
    assert.equal(atmTransfer.toAccountName, 'Cash Wallet');
    assert.equal(atmTransfer.amount, 400.00);
    assert.equal(atmTransfer.fee, 2.50);
    assert.equal(atmTransfer.statusBadge, 'Settled');
    assert.equal(atmTransfer.description, 'ATM Withdrawal');
  });

});
