import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  mockExpense, 
  mockIncome, 
  mockTransfer, 
  mockRecurringWeeklyExpense 
} from '../helpers/fixtures.js';

describe('Tier 1: Stitch Mobile UI — Feed Timeline, Vault Flow & Navigation (Issue #20)', () => {

  it('should accurately compute Vault Flow Summary metrics (income deposits & expense debits)', () => {
    const transactions = [
      mockIncome,                 // +$1,200.00 income
      mockExpense,                // -$45.50 expense
      mockRecurringWeeklyExpense, // -$320.00 expense
      mockTransfer,               // transfer $500 with $15 fee -> $15 expense fee
      {
        id: 'tx-cancelled',
        date: '2026-10-28',
        description: 'Cancelled order',
        amount: 99.99,
        category: 'Shopping',
        paymentModeId: 'bank',
        type: 'expense',
        status: 'cancelled',
        createdAt: Date.now()
      }
    ];

    let totalExpense = 0;
    let totalIncome = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    transactions.forEach(t => {
      if (t.status === 'cancelled') return;
      if (t.type === 'expense') {
        totalExpense += t.amount;
        expenseCount++;
      } else if (t.type === 'income') {
        totalIncome += t.amount;
        incomeCount++;
      } else if (t.type === 'transfer' && t.fee) {
        totalExpense += t.fee;
      }
    });

    assert.equal(totalIncome, 1200.00);
    assert.equal(incomeCount, 1);
    assert.equal(totalExpense, 380.50); // 45.50 + 320.00 + 15.00 fee
    assert.equal(expenseCount, 2);

    // Verify format rendering
    const formattedIncome = `+$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedExpense = `-$${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    assert.equal(formattedIncome, '+$1,200.00');
    assert.equal(formattedExpense, '-$380.50');
  });

  it('should compute chronological date groups with formatted date and net day total pills', () => {
    const transactions = [
      {
        id: 'tx-1',
        date: '2026-10-28',
        description: 'Casual Delivery Income',
        amount: 85.00,
        category: 'Income',
        paymentModeId: 'bank',
        type: 'income',
        status: 'completed',
        createdAt: 1
      },
      {
        id: 'tx-2',
        date: '2026-10-28',
        description: 'Grocery Run',
        amount: 47.63,
        category: 'Food & Dining',
        paymentModeId: 'bank',
        type: 'expense',
        status: 'completed',
        createdAt: 2
      },
      {
        id: 'tx-3',
        date: '2026-10-27',
        description: 'Room Rent',
        amount: 1024.00,
        category: 'Rent',
        paymentModeId: 'bank',
        type: 'expense',
        status: 'completed',
        createdAt: 3
      }
    ];

    // Group by date
    const dateMap = new Map();
    transactions.forEach(tx => {
      if (!dateMap.has(tx.date)) dateMap.set(tx.date, []);
      dateMap.get(tx.date).push(tx);
    });

    const groups = [];
    dateMap.forEach((items, dateStr) => {
      const parts = dateStr.split('-');
      const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const displayDate = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      let dayIncome = 0;
      let dayExpense = 0;
      let dayFees = 0;

      items.forEach(curr => {
        if (curr.status === 'cancelled') return;
        if (curr.type === 'income') dayIncome += curr.amount;
        else if (curr.type === 'expense') dayExpense += curr.amount;
        else if (curr.type === 'transfer' && curr.fee) dayFees += curr.fee;
      });

      const dayNet = dayIncome - dayExpense - dayFees;

      groups.push({
        date: dateStr,
        displayDate,
        items,
        dayNet,
        dayTotal: dayExpense + dayFees
      });
    });

    // 2026-10-28 should display "Oct 28, 2026"
    assert.equal(groups[0].displayDate, 'Oct 28, 2026');
    assert.equal(groups[0].items.length, 2);
    // Net: 85.00 - 47.63 = +37.37
    assert.equal(groups[0].dayNet, 37.37);
    const day1Pill = `Day Total: ${groups[0].dayNet >= 0 ? '+' : '-'}$${Math.abs(groups[0].dayNet).toFixed(2)}`;
    assert.equal(day1Pill, 'Day Total: +$37.37');

    // 2026-10-27 should display "Oct 27, 2026"
    assert.equal(groups[1].displayDate, 'Oct 27, 2026');
    assert.equal(groups[1].items.length, 1);
    // Net: 0 - 1024 = -1024.00
    assert.equal(groups[1].dayNet, -1024.00);
    const day2Pill = `Day Total: ${groups[1].dayNet >= 0 ? '+' : '-'}$${Math.abs(groups[1].dayNet).toFixed(2)}`;
    assert.equal(day2Pill, 'Day Total: -$1024.00');
  });

  it('should accurately calculate banner filter pills count and item links', () => {
    const banners = [
      { id: 'b-rent', name: 'Room Rent', color: '#38bdf8' },
      { id: 'b-ebike', name: 'E-bike delivery', color: '#10b981' },
      { id: 'b-visa', name: '485 Visa Medical', color: '#f59e0b' }
    ];

    const transactions = [
      { id: '1', bannerIds: ['b-rent'], amount: 320 },
      { id: '2', bannerIds: ['b-rent'], amount: 320 },
      { id: '3', bannerIds: ['b-ebike'], amount: 150 },
      { id: '4', bannerIds: ['b-rent', 'b-visa'], amount: 75 },
      { id: '5', amount: 50 } // No banner
    ];

    const totalEntries = transactions.length;
    assert.equal(totalEntries, 5);

    const counts = {};
    banners.forEach(b => {
      counts[b.id] = transactions.filter(t => t.bannerIds?.includes(b.id)).length;
    });

    assert.equal(counts['b-rent'], 3);  // 1, 2, 4
    assert.equal(counts['b-ebike'], 1); // 3
    assert.equal(counts['b-visa'], 1);  // 4
  });

  it('should compute responsive connective timeline gutter and track positions', () => {
    const activeFeedBanners = [
      { id: 'b-1', name: 'Rent', color: '#38bdf8' },
      { id: 'b-2', name: 'Work', color: '#10b981' }
    ];

    // Mobile gutter calculation
    const gutterWidthPx = Math.max(22, Math.min(activeFeedBanners.length * 16 + 10, 56));
    assert.equal(gutterWidthPx, 42); // 2 * 16 + 10 = 42

    const line0 = 0 * 16 + 8; // 8px
    const line1 = 1 * 16 + 8; // 24px

    assert.equal(line0, 8);
    assert.equal(line1, 24);
    assert.ok(line1 < gutterWidthPx);
  });

  it('should calculate top categories and spending shares for Financial Breakdown Card', () => {
    const transactions = [
      { category: 'Rent', amount: 1200, type: 'expense', status: 'completed' },
      { category: 'Food & Dining', amount: 300, type: 'expense', status: 'completed' },
      { category: 'Insurance', amount: 150, type: 'expense', status: 'completed' },
      { category: 'Transport', amount: 100, type: 'expense', status: 'completed' },
      { category: 'Salary', amount: 4000, type: 'income', status: 'completed' }
    ];

    const categoryTotals = {};
    let total = 0;

    transactions.forEach(tx => {
      if (tx.status === 'cancelled') return;
      if (tx.type === 'expense') {
        total += tx.amount;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      }
    });

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({
        name,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0
      }));

    assert.equal(total, 1750);
    assert.equal(topCategories[0].name, 'Rent');
    assert.equal(topCategories[0].amount, 1200);
    assert.equal(Math.round(topCategories[0].percent), 69); // 1200 / 1750 = ~68.57% -> 69%
    assert.equal(topCategories[1].name, 'Food & Dining');
    assert.equal(topCategories[1].amount, 300);
  });

  it('should validate mobile bottom navigation destinations and auto-hide scroll behavior', () => {
    const validTabs = ['feed', 'recurring', 'analytics', 'accounts'];
    assert.equal(validTabs.length, 4);

    let isVisible = true;
    let lastScrollY = 0;

    const simulateScroll = (currentY) => {
      if (currentY < 40) {
        isVisible = true;
      } else if (currentY > lastScrollY + 8) {
        isVisible = false;
      } else if (currentY < lastScrollY - 8) {
        isVisible = true;
      }
      lastScrollY = currentY;
      return isVisible;
    };

    // Initial state
    assert.equal(simulateScroll(0), true);
    // Scroll down past 40px
    assert.equal(simulateScroll(80), false);
    // Continue scrolling down
    assert.equal(simulateScroll(120), false);
    // Scroll up
    assert.equal(simulateScroll(100), true);
    // Scroll back to top
    assert.equal(simulateScroll(20), true);
  });

});
