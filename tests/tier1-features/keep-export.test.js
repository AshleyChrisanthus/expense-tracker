import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatKeepDateHeader,
  formatTransactionForKeep,
  formatTransactionsForKeep,
} from '../../src/utils/keepExport.ts';

const paymentModes = [
  { id: 'bank', name: 'Bank', icon: 'landmark', color: '#3b82f6' },
  { id: 'cash', name: 'Cash', icon: 'banknote', color: '#10b981' },
  { id: 'forex', name: 'Forex', icon: 'credit-card', color: '#8b5cf6' },
];

describe('Tier 1: Google Keep Export Formatter (Issue #27)', () => {
  it('should format date headers with full month name, no leading zero, and no spaces around comma', () => {
    assert.equal(formatKeepDateHeader('2026-11-04'), 'November 4,2026');
    assert.equal(formatKeepDateHeader('2026-01-09'), 'January 9,2026');
    assert.equal(formatKeepDateHeader('2026-12-25'), 'December 25,2026');
  });

  it('should format expenses with 2 decimal places, lowercase mode, and optional bracketed notes without leading space', () => {
    const expense = {
      id: 'tx-1',
      date: '2026-11-04',
      amount: 10.8,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Groceries',
      description: 'coles melbourne cbd',
      createdAt: 1000,
    };
    assert.equal(
      formatTransactionForKeep(expense, paymentModes),
      '10.80$-from bank- coles melbourne cbd'
    );

    const expenseWithNote = {
      ...expense,
      amount: 4,
      paymentModeId: 'Cash',
      notes: 'wash n wait st albans',
      description: 'laundromat dryer',
    };
    // Unknown mode id falls back gracefully; test with 'cash' id
    assert.equal(
      formatTransactionForKeep({ ...expenseWithNote, paymentModeId: 'cash' }, paymentModes),
      '4.00$-from cash- laundromat dryer(wash n wait st albans)'
    );
  });

  it('should format transfers using the expenses template with Transfer tag and optional notes', () => {
    const transfer = {
      id: 'tx-t1',
      date: '2026-11-04',
      amount: 500,
      type: 'transfer',
      paymentModeId: 'bank',
      toPaymentModeId: 'cash',
      category: 'Transfers',
      description: 'withdrawn',
      createdAt: 1000,
    };
    assert.equal(
      formatTransactionForKeep(transfer, paymentModes),
      '500.00$-from bank- withdrawn(Transfer from bank to cash)'
    );

    const transferWithNote = {
      ...transfer,
      notes: 'atm at station',
    };
    assert.equal(
      formatTransactionForKeep(transferWithNote, paymentModes),
      '500.00$-from bank- withdrawn(Transfer from bank to cash)(atm at station)'
    );
  });

  it('should format incomes as description when already formatted, or fallback to paid template', () => {
    const formattedIncome = {
      id: 'tx-i1',
      date: '2026-11-04',
      amount: 609.67,
      type: 'income',
      paymentModeId: 'bank',
      category: 'Salary',
      description: 'paid 609.67$ compass group levy salary to bank account',
      createdAt: 1000,
    };
    assert.equal(
      formatTransactionForKeep(formattedIncome, paymentModes),
      'paid 609.67$ compass group levy salary to bank account'
    );

    const shortIncome = {
      id: 'tx-i2',
      date: '2026-11-04',
      amount: 250,
      type: 'income',
      paymentModeId: 'bank',
      category: 'Salary',
      description: 'freelance project',
      createdAt: 2000,
    };
    assert.equal(
      formatTransactionForKeep(shortIncome, paymentModes),
      'paid 250.00$ freelance project to bank account'
    );
  });

  it('should order days newest-first, same-day transactions oldest-first, and separate days with a single blank line', () => {
    const transactions = [
      // Nov 2
      {
        id: 'nov2-1',
        date: '2026-11-02',
        amount: 60,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Utilities',
        description: 'optus mobile plan',
        createdAt: 100,
      },
      // Nov 3 (logged out of order in input array)
      {
        id: 'nov3-4',
        date: '2026-11-03',
        amount: 13.07,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Groceries',
        description: 'groceries from mrp indian store st albans',
        createdAt: 400,
      },
      {
        id: 'nov3-1',
        date: '2026-11-03',
        amount: 28.3,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Entertainment',
        description: 'HOYTS movie ticket for Avengers Doomsday on 22nd December 2:30PM at HOYTS Watergardens',
        status: 'pending',
        createdAt: 100,
      },
      {
        id: 'nov3-3',
        date: '2026-11-03',
        amount: 57.49,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Health',
        description: 'chemist warehouse St Albans',
        createdAt: 300,
      },
      {
        id: 'nov3-2',
        date: '2026-11-03',
        amount: 4,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Other',
        description: 'laundromat dryer(wash n wait st albans)',
        status: 'cancelled',
        createdAt: 200,
      },
      // Nov 4
      {
        id: 'nov4-2',
        date: '2026-11-04',
        amount: 10.8,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Groceries',
        description: 'coles melbourne cbd',
        createdAt: 200,
      },
      {
        id: 'nov4-1',
        date: '2026-11-04',
        amount: 609.67,
        type: 'income',
        paymentModeId: 'bank',
        category: 'Salary',
        description: 'paid 609.67$ compass group levy salary to bank account',
        createdAt: 100,
      },
    ];

    const expected = [
      'November 4,2026',
      'paid 609.67$ compass group levy salary to bank account',
      '10.80$-from bank- coles melbourne cbd',
      '',
      'November 3,2026',
      '28.30$-from bank- HOYTS movie ticket for Avengers Doomsday on 22nd December 2:30PM at HOYTS Watergardens',
      '4.00$-from bank- laundromat dryer(wash n wait st albans)',
      '57.49$-from bank- chemist warehouse St Albans',
      '13.07$-from bank- groceries from mrp indian store st albans',
      '',
      'November 2,2026',
      '60.00$-from bank- optus mobile plan',
    ].join('\n');

    assert.equal(formatTransactionsForKeep(transactions, paymentModes), expected);
    assert.equal(formatTransactionsForKeep([], paymentModes), '');
  });
});
