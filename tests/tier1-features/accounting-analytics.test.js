import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  mockExpense, 
  mockIncome, 
  mockTransfer, 
  mockRecurringWeeklyExpense 
} from '../helpers/fixtures.js';

describe('Tier 1: Accounting, Balances & Analytics Calculations', () => {
  it('should calculate account balances correctly across income, expense, and transfers with fees', () => {
    // Scenario:
    // Initial balances: bank: 0, forex: 0
    // 1. Income: +$1,200 into bank
    // 2. Transfer: $500 from bank to forex with $15 fee (bank loses 515, forex gains 500)
    // 3. Expense: -$45.50 from bank
    // 4. Recurring weekly expense: -$320.00 from bank
    const transactions = [
      mockIncome,                 // +1200 bank
      mockTransfer,               // -515 bank, +500 forex
      mockExpense,                // -45.50 bank
      mockRecurringWeeklyExpense  // -320.00 bank
    ];

    const balances = { bank: 0, forex: 0, cash: 0 };

    for (const tx of transactions) {
      if (tx.status === 'cancelled') continue;

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
    }

    // Bank: 1200 - 515 - 45.50 - 320 = 319.50
    assert.equal(balances.bank, 319.50);
    // Forex: 500
    assert.equal(balances.forex, 500.00);
    // Cash: 0
    assert.equal(balances.cash, 0);
  });

  it('should aggregate categorical expense totals accurately', () => {
    const transactions = [
      { id: '1', amount: 50, type: 'expense', category: 'Groceries' },
      { id: '2', amount: 30, type: 'expense', category: 'Groceries' },
      { id: '3', amount: 100, type: 'expense', category: 'Rent & Housing' },
      { id: '4', amount: 200, type: 'income', category: 'Income' }, // Ignored in expense totals
      { id: '5', amount: 40, type: 'expense', category: 'Shopping' }
    ];

    const categoryTotals = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    }

    assert.equal(categoryTotals['Groceries'], 80);
    assert.equal(categoryTotals['Rent & Housing'], 100);
    assert.equal(categoryTotals['Shopping'], 40);
    assert.equal(categoryTotals['Income'], undefined);
  });

  it('should compute monthly spending aggregates', () => {
    const transactions = [
      { id: '1', date: '2026-09-10', amount: 120, type: 'expense' },
      { id: '2', date: '2026-09-25', amount: 80, type: 'expense' },
      { id: '3', date: '2026-10-02', amount: 250, type: 'expense' },
      { id: '4', date: '2026-10-15', amount: 150, type: 'expense' }
    ];

    const monthlyTotals = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const monthKey = tx.date.slice(0, 7); // YYYY-MM
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + tx.amount;
    }

    assert.equal(monthlyTotals['2026-09'], 200);
    assert.equal(monthlyTotals['2026-10'], 400);
  });

  it('should compute spending aggregates per banner tag', () => {
    const transactions = [
      { id: '1', amount: 300, type: 'expense', bannerIds: ['banner-personal'] },
      { id: '2', amount: 150, type: 'expense', bannerIds: ['banner-personal', 'banner-work'] },
      { id: '3', amount: 80, type: 'expense', bannerIds: ['banner-work'] },
      { id: '4', amount: 45, type: 'expense' } // No banner
    ];

    const bannerTotals = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense' || !tx.bannerIds) continue;
      for (const bId of tx.bannerIds) {
        bannerTotals[bId] = (bannerTotals[bId] || 0) + tx.amount;
      }
    }

    // personal has tx 1 ($300) and tx 2 ($150) = $450
    assert.equal(bannerTotals['banner-personal'], 450);
    // work has tx 2 ($150) and tx 3 ($80) = $230
    assert.equal(bannerTotals['banner-work'], 230);
  });
});
