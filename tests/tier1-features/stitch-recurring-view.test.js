import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRecurrenceModule } from '../helpers/setup.js';

describe('Tier 1: Stitch Mobile UI — Dedicated Recurring Bills & Smart Templates View (Issue #21)', () => {

  // Test recurring sample items matching the issue requirements
  const getTestItems = (getRecurrenceDueInfo) => [
    // Variant A: Fixed Bills (4 items totaling $308.36)
    {
      item: {
        id: 'rec-rent',
        date: '2026-10-25',
        amount: 180.00,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Rent & Housing',
        description: 'Room rent paid to S Ahuja',
        recurrence: 'weekly',
        recurrenceDayOfWeek: 0, // Sunday
        nextDueDate: '2026-11-01',
        status: 'completed',
        createdAt: 100
      },
      effectiveDueDate: '2026-11-01',
      dueInfo: getRecurrenceDueInfo('2026-11-01', '2026-10-28'), // In 4d
      latestPayment: { date: '2026-10-25', amount: 180.00, description: 'Room rent paid to S Ahuja' }
    },
    {
      item: {
        id: 'rec-optus',
        date: '2026-10-02',
        amount: 49.00,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Bills',
        description: 'Optus mobile plan',
        recurrence: 'monthly',
        recurrenceDayOfMonth: 2,
        nextDueDate: '2026-11-02',
        status: 'completed',
        createdAt: 101
      },
      effectiveDueDate: '2026-11-02',
      dueInfo: getRecurrenceDueInfo('2026-11-02', '2026-10-28'),
      latestPayment: { date: '2026-10-02', amount: 49.00, description: 'Optus mobile plan' }
    },
    {
      item: {
        id: 'rec-bupa',
        date: '2026-10-14',
        amount: 49.36,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Insurance',
        description: 'OVHC Bupa Insurance',
        recurrence: 'biweekly',
        recurrenceDayOfWeek: 3, // Wednesday
        nextDueDate: '2026-11-11',
        status: 'completed',
        createdAt: 102
      },
      effectiveDueDate: '2026-11-11',
      dueInfo: getRecurrenceDueInfo('2026-11-11', '2026-10-28'),
      latestPayment: { date: '2026-10-28', amount: 49.36, description: 'OVHC Bupa Insurance' }
    },
    {
      item: {
        id: 'rec-google',
        date: '2026-10-12',
        amount: 30.00,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Subscriptions',
        description: 'Google AI Pro subscription',
        recurrence: 'monthly',
        recurrenceDayOfMonth: 12,
        nextDueDate: '2026-11-12',
        status: 'completed',
        createdAt: 103
      },
      effectiveDueDate: '2026-11-12',
      dueInfo: getRecurrenceDueInfo('2026-11-12', '2026-10-28'),
      latestPayment: { date: '2026-10-12', amount: 30.00, description: 'Google AI Pro subscription' }
    },

    // Variant B: Variable Income (1 item: +$858.84)
    {
      item: {
        id: 'rec-salary',
        date: '2026-10-28',
        amount: 858.84,
        type: 'income',
        paymentModeId: 'bank',
        category: 'Income',
        description: 'paid 858.84$ weekly Compass Group levy salary to NAB Payroll Vault',
        descriptionTemplate: 'paid {amount}$ weekly Compass Group levy salary to NAB Payroll Vault',
        recurrence: 'weekly',
        recurrenceDayOfWeek: 3, // Wednesday
        isVariableAmount: true,
        nextDueDate: '2026-11-04',
        status: 'completed',
        createdAt: 104
      },
      effectiveDueDate: '2026-11-04',
      dueInfo: getRecurrenceDueInfo('2026-11-04', '2026-10-28'),
      latestPayment: { date: '2026-10-28', amount: 858.84, description: 'paid 858.84$ weekly Compass Group levy salary to NAB Payroll Vault' }
    },

    // Variant C: As-Needed Flexible Template (1 item: $1020.00)
    {
      item: {
        id: 'rec-amma',
        date: '2026-10-26',
        amount: 1020.00,
        type: 'expense',
        paymentModeId: 'forex',
        category: 'Other',
        description: 'Paid to Amma',
        recurrence: 'as_needed',
        isVariableAmount: true,
        notes: 'Family remittance template',
        status: 'completed',
        createdAt: 105
      },
      effectiveDueDate: '',
      dueInfo: null,
      latestPayment: { date: '2026-10-26', amount: 1000.00, description: 'Paid to Amma' }
    }
  ];

  it('should accurately compute Hero Card Scheduled Outflow and Scheduled Inflow metrics', async () => {
    const { getRecurrenceDueInfo } = await getRecurrenceModule();
    const testItems = getTestItems(getRecurrenceDueInfo);

    let scheduledOutflow = 0;
    let scheduledInflow = 0;
    let pendingCount = 0;

    testItems.forEach(({ item }) => {
      if (item.status === 'cancelled') return;
      if (item.recurrence === 'as_needed') return; // Excluded from fixed scheduled sum

      pendingCount++;
      if (item.type === 'expense') {
        scheduledOutflow += item.amount;
      } else if (item.type === 'income') {
        scheduledInflow += item.amount;
      }
    });

    // 180.00 + 49.00 + 49.36 + 30.00 = 308.36
    assert.equal(scheduledOutflow, 308.36);
    assert.equal(scheduledInflow, 858.84);
    assert.equal(pendingCount, 5); // 4 fixed bills + 1 scheduled income

    const formattedOutflow = `$${scheduledOutflow.toFixed(2)}`;
    const formattedInflow = `+$${scheduledInflow.toFixed(2)}`;

    assert.equal(formattedOutflow, '$308.36');
    assert.equal(formattedInflow, '+$858.84');
  });

  it('should handle custom typed amount overrides in scheduled metrics calculation', async () => {
    const { getRecurrenceDueInfo } = await getRecurrenceModule();
    const testItems = getTestItems(getRecurrenceDueInfo);
    const customAmounts = {
      'rec-salary': '925.50' // User adjusts casual salary for next cycle
    };

    let scheduledInflow = 0;
    testItems.forEach(({ item }) => {
      if (item.recurrence === 'as_needed') return;
      if (item.type === 'income') {
        const custom = customAmounts[item.id];
        const amt = custom ? parseFloat(custom) : item.amount;
        scheduledInflow += amt;
      }
    });

    assert.equal(scheduledInflow, 925.50);
  });

  it('should correctly calculate filter pills counts and partition items', async () => {
    const { getRecurrenceDueInfo } = await getRecurrenceModule();
    const testItems = getTestItems(getRecurrenceDueInfo);

    const all = testItems.length;
    const bills = testItems.filter(r => r.item.type === 'expense' && r.item.recurrence !== 'as_needed').length;
    const income = testItems.filter(r => r.item.type === 'income').length;
    const templates = testItems.filter(r => r.item.recurrence === 'as_needed').length;

    assert.equal(all, 6);
    assert.equal(bills, 4);
    assert.equal(income, 1);
    assert.equal(templates, 1);

    // Verify partitioning
    const billsItems = testItems.filter(r => r.item.type === 'expense' && r.item.recurrence !== 'as_needed');
    assert.deepEqual(billsItems.map(r => r.item.id), ['rec-rent', 'rec-optus', 'rec-bupa', 'rec-google']);

    const incomeItems = testItems.filter(r => r.item.type === 'income');
    assert.deepEqual(incomeItems.map(r => r.item.id), ['rec-salary']);

    const templateItems = testItems.filter(r => r.item.recurrence === 'as_needed');
    assert.deepEqual(templateItems.map(r => r.item.id), ['rec-amma']);
  });

  it('should format frequency badges accurately for all card variants', async () => {
    const { formatFrequencyBadge } = await getRecurrenceModule();

    // Room rent: Weekly • Sun
    assert.equal(formatFrequencyBadge('weekly', 0), 'Weekly • Sun');
    // Optus: Monthly • 2nd
    assert.equal(formatFrequencyBadge('monthly', undefined, 2), 'Monthly • 2nd');
    // Bupa: Bi-weekly • Wed
    assert.equal(formatFrequencyBadge('biweekly', 3), 'Bi-weekly • Wed');
    // Google AI Pro: Monthly • 12th
    assert.equal(formatFrequencyBadge('monthly', undefined, 12), 'Monthly • 12th');
    // 1st, 3rd, 21st, 22nd, 23rd
    assert.equal(formatFrequencyBadge('monthly', undefined, 1), 'Monthly • 1st');
    assert.equal(formatFrequencyBadge('monthly', undefined, 3), 'Monthly • 3rd');
    assert.equal(formatFrequencyBadge('monthly', undefined, 21), 'Monthly • 21st');
    assert.equal(formatFrequencyBadge('monthly', undefined, 22), 'Monthly • 22nd');
    assert.equal(formatFrequencyBadge('monthly', undefined, 23), 'Monthly • 23rd');
    // Daily & As-Needed
    assert.equal(formatFrequencyBadge('daily'), 'Daily');
    assert.equal(formatFrequencyBadge('as_needed'), 'As Needed');
  });

  it('should format relative due date countdown badges accurately', async () => {
    const { getRecurrenceDueInfo, formatDueCountdown } = await getRecurrenceModule();

    // In 4d • Nov 1, 2026
    const rentDueInfo = getRecurrenceDueInfo('2026-11-01', '2026-10-28');
    const rentCountdown = formatDueCountdown(rentDueInfo);
    assert.ok(rentCountdown);
    assert.equal(rentCountdown.text, 'In 4d • Nov 1, 2026');
    assert.equal(rentCountdown.status, 'soon');

    // Due Today • Oct 28, 2026
    const todayDueInfo = getRecurrenceDueInfo('2026-10-28', '2026-10-28');
    const todayCountdown = formatDueCountdown(todayDueInfo);
    assert.ok(todayCountdown);
    assert.equal(todayCountdown.text, 'Due Today • Oct 28, 2026');
    assert.equal(todayCountdown.status, 'today');

    // Overdue (3d) • Oct 25, 2026
    const overdueInfo = getRecurrenceDueInfo('2026-10-25', '2026-10-28');
    const overdueCountdown = formatDueCountdown(overdueInfo);
    assert.ok(overdueCountdown);
    assert.equal(overdueCountdown.text, 'Overdue (3d) • Oct 25, 2026');
    assert.equal(overdueCountdown.status, 'overdue');

    // Null for as-needed templates
    assert.equal(formatDueCountdown(null), null);
  });

  it('should advance recurring schedule properly when logging on due date vs today', async () => {
    const { getRecurrenceDueInfo, computeNextDueDate } = await getRecurrenceModule();
    const testItems = getTestItems(getRecurrenceDueInfo);
    const rentItem = testItems[0].item;
    assert.equal(rentItem.nextDueDate, '2026-11-01');

    // Logging for due date advances 1 week from 2026-11-01 -> 2026-11-08
    const nextFromDue = computeNextDueDate(
      '2026-11-01',
      rentItem.recurrence,
      rentItem.recurrenceDayOfWeek
    );
    assert.equal(nextFromDue, '2026-11-08');

    // Logging today (2026-10-28) advances 1 cycle from 2026-10-28 (Wednesday) to next Sunday (2026-11-01)
    const nextFromToday = computeNextDueDate(
      '2026-10-28',
      rentItem.recurrence,
      rentItem.recurrenceDayOfWeek
    );
    assert.equal(nextFromToday, '2026-11-01');
  });

  it('should format templated description when user enters custom variable amount', async () => {
    const { getRecurrenceDueInfo, formatTemplatedDescription } = await getRecurrenceModule();
    const testItems = getTestItems(getRecurrenceDueInfo);
    const salaryItem = testItems[4].item;
    const template = salaryItem.descriptionTemplate;
    assert.ok(template);

    const formatted = formatTemplatedDescription(template, '912.45');
    assert.equal(formatted, 'paid 912.45$ weekly Compass Group levy salary to NAB Payroll Vault');
  });

});
