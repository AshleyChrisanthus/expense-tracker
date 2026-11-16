import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRecurrenceModule } from '../helpers/setup.js';

describe('Tier 1: Recurrence & Due Date Engine', () => {
  it('should compute next due date for daily recurrence', async () => {
    const { computeNextDueDate } = await getRecurrenceModule();
    assert.equal(computeNextDueDate('2026-10-15', 'daily'), '2026-10-16');
    assert.equal(computeNextDueDate('2026-10-31', 'daily'), '2026-11-01');
    assert.equal(computeNextDueDate('2026-12-31', 'daily'), '2027-01-01');
  });

  it('should compute next due date for weekly recurrence with dayOfWeek', async () => {
    const { computeNextDueDate } = await getRecurrenceModule();
    // 2026-10-12 is Monday (1)
    // Target Tuesday (2) -> 2026-10-13
    assert.equal(computeNextDueDate('2026-10-12', 'weekly', 2), '2026-10-13');
    // Target next Monday (1) -> advances full week
    assert.equal(computeNextDueDate('2026-10-12', 'weekly', 1), '2026-10-19');
    // Default weekly without dayOfWeek
    assert.equal(computeNextDueDate('2026-10-12', 'weekly'), '2026-10-19');
  });

  it('should compute next due date for biweekly recurrence', async () => {
    const { computeNextDueDate } = await getRecurrenceModule();
    assert.equal(computeNextDueDate('2026-10-12', 'biweekly'), '2026-10-26');
    // Bi-weekly on Wednesday (3) starting from Wednesday 2026-10-28 -> advances exactly 14 days to 2026-11-11
    assert.equal(computeNextDueDate('2026-10-28', 'biweekly', 3), '2026-11-11');
  });

  it('should compute next due date for monthly recurrence with dayOfMonth clamping', async () => {
    const { computeNextDueDate } = await getRecurrenceModule();
    // Regular month advance
    assert.equal(computeNextDueDate('2026-03-15', 'monthly', undefined, 15), '2026-04-15');

    // 31st to a 30-day month (April has 30 days)
    assert.equal(computeNextDueDate('2026-03-31', 'monthly', undefined, 31), '2026-04-30');

    // January 31 to February non-leap year (2025 has 28 days in Feb)
    assert.equal(computeNextDueDate('2025-01-31', 'monthly', undefined, 31), '2025-02-28');
  });

  it('should compute next due date for yearly recurrence', async () => {
    const { computeNextDueDate } = await getRecurrenceModule();
    assert.equal(computeNextDueDate('2026-05-20', 'yearly', undefined, 20), '2027-05-20');
  });

  it('should calculate initial due date properly for monthly schedules', async () => {
    const { calculateInitialDueDate } = await getRecurrenceModule();
    // On the 5th of the month, target 20th of same month
    assert.equal(calculateInitialDueDate('2026-10-05', 'monthly', undefined, 20), '2026-10-20');

    // On the 25th of the month, target 10th -> moves to next month 10th
    assert.equal(calculateInitialDueDate('2026-10-25', 'monthly', undefined, 10), '2026-11-10');
  });

  it('should forward-project past due dates into the future', async () => {
    const { getNextFutureDueDate } = await getRecurrenceModule();
    // Past date from 2024 monthly
    const future = getNextFutureDueDate('2024-01-01', 'monthly', undefined, 1);
    const today = new Date().toISOString().split('T')[0];
    assert.ok(future >= today);
    assert.ok(future.endsWith('-01'));
  });

  it('should calculate recurrence due info correctly for overdue, today, and soon', async () => {
    const { getRecurrenceDueInfo } = await getRecurrenceModule();
    const today = new Date().toISOString().split('T')[0];

    const todayInfo = getRecurrenceDueInfo(today);
    assert.ok(todayInfo);
    assert.equal(todayInfo.diffDays, 0);
    assert.equal(todayInfo.isDueToday, true);
    assert.equal(todayInfo.isOverdue, false);

    // Past date (overdue)
    const pastInfo = getRecurrenceDueInfo('2020-01-01');
    assert.ok(pastInfo);
    assert.equal(pastInfo.isOverdue, true);
    assert.equal(pastInfo.isDueToday, false);

    // Far future date
    const futureInfo = getRecurrenceDueInfo('2099-01-01');
    assert.ok(futureInfo);
    assert.equal(futureInfo.isOverdue, false);
    assert.equal(futureInfo.isDueSoon, false);
  });

  it('should format recurrence labels with proper English ordinals', async () => {
    const { formatRecurrenceLabel, getOrdinalSuffix } = await getRecurrenceModule();
    assert.equal(getOrdinalSuffix(1), '1st');
    assert.equal(getOrdinalSuffix(2), '2nd');
    assert.equal(getOrdinalSuffix(3), '3rd');
    assert.equal(getOrdinalSuffix(4), '4th');
    assert.equal(getOrdinalSuffix(11), '11th');
    assert.equal(getOrdinalSuffix(12), '12th');
    assert.equal(getOrdinalSuffix(13), '13th');
    assert.equal(getOrdinalSuffix(21), '21st');
    assert.equal(getOrdinalSuffix(22), '22nd');
    assert.equal(getOrdinalSuffix(23), '23rd');
    assert.equal(getOrdinalSuffix(31), '31st');

    assert.equal(formatRecurrenceLabel('daily'), 'Daily');
    assert.equal(formatRecurrenceLabel('weekly', 1), 'Weekly every Monday');
    assert.equal(formatRecurrenceLabel('weekly', 3), 'Weekly every Wednesday');
    assert.equal(formatRecurrenceLabel('biweekly', 5), 'Every 2 weeks on Friday');
    assert.equal(formatRecurrenceLabel('monthly', undefined, 15), 'Monthly on the 15th');
    assert.equal(formatRecurrenceLabel('as_needed'), 'As Needed (No Fixed Schedule)');
    assert.equal(formatRecurrenceLabel('none'), 'Does not repeat');
  });

  it('should handle variable-amount description templates and normalize recurring keys (Issues #16 & #17)', async () => {
    const {
      hasEmbeddedAmountTemplate,
      extractDescriptionTemplate,
      extractAmountFromDescription,
      formatTemplatedDescription,
      normalizeRecurringKey,
      computeNextDueDate
    } = await getRecurrenceModule();

    const sampleDesc = 'paid 783.27$ weekly company salary to bank account';
    assert.equal(hasEmbeddedAmountTemplate(sampleDesc), true);
    assert.equal(hasEmbeddedAmountTemplate('paid to family'), false);

    const tpl = extractDescriptionTemplate(sampleDesc);
    assert.equal(tpl, 'paid {amount}$ weekly company salary to bank account');
    assert.equal(extractAmountFromDescription(sampleDesc), '783.27');

    // Populating template with a new number updates the number section of description
    assert.equal(
      formatTemplatedDescription(tpl, '912.45'),
      'paid 912.45$ weekly company salary to bank account'
    );
    assert.equal(
      formatTemplatedDescription(sampleDesc, 650.8),
      'paid 650.8$ weekly company salary to bank account'
    );
    assert.equal(
      formatTemplatedDescription('paid to family', '1000'),
      'paid to family'
    );

    // Different weekly salary amounts normalize to the exact same recurring group key
    assert.equal(
      normalizeRecurringKey('paid 783.27$ weekly company salary to bank account'),
      normalizeRecurringKey('paid 835.12$ weekly company salary to bank account')
    );

    // as_needed does not advance due dates
    assert.equal(computeNextDueDate('2026-10-28', 'as_needed'), '2026-10-28');
  });

  it('should detect existing recurring payments on target date and reconcile due dates past already-paid dates (Issue #25)', async () => {
    const {
      hasExistingRecurringPaymentOnDate,
      reconcileEffectiveDueDate,
      normalizeRecurringKey
    } = await getRecurrenceModule();

    const rentKey = normalizeRecurringKey('Room Rent');
    const transactions = [
      { id: 'tx-1', date: '2026-11-08', description: 'Room Rent', status: 'completed' },
      { id: 'tx-2', date: '2026-11-15', description: 'Room Rent', status: 'completed' },
      { id: 'tx-3', date: '2026-11-22', description: 'Room Rent', status: 'cancelled' },
      { id: 'tx-4', date: '2026-11-15', description: 'Groceries', status: 'completed' }
    ];

    assert.equal(hasExistingRecurringPaymentOnDate(transactions, rentKey, '2026-11-15'), true);
    assert.equal(hasExistingRecurringPaymentOnDate(transactions, rentKey, '2026-11-22'), false);
    assert.equal(hasExistingRecurringPaymentOnDate(transactions, rentKey, '2026-11-29'), false);

    // If baseDueDate is 2026-11-08 or 2026-11-15 and completed records exist for both,
    // reconcileEffectiveDueDate must advance past both to 2026-11-22 (not show overdue on 11-08/11-15).
    const completedDates = new Set(['2026-11-08', '2026-11-15']);
    assert.equal(
      reconcileEffectiveDueDate('2026-11-08', 'weekly', completedDates, '2026-11-15', 0),
      '2026-11-22'
    );
    assert.equal(
      reconcileEffectiveDueDate('2026-11-15', 'weekly', completedDates, '2026-11-15', 0),
      '2026-11-22'
    );

    // If the ONLY payment for 2026-11-15 was deleted, completedDates only has 2026-11-08,
    // so 2026-11-15 is legitimately unpaid and returned as the effective due date.
    const afterOnlyPaymentDeleted = new Set(['2026-11-08']);
    assert.equal(
      reconcileEffectiveDueDate('2026-11-22', 'weekly', afterOnlyPaymentDeleted, '2026-11-08', 0),
      '2026-11-15'
    );

    // Transactions with undefined status (legacy/imported) count as completed
    assert.equal(
      hasExistingRecurringPaymentOnDate(
        [{ date: '2026-11-15', description: 'Room Rent' }],
        rentKey,
        '2026-11-15'
      ),
      true
    );

    // Stale baseDueDate (2026-11-08) when a payment already exists on 2026-11-15 must advance to 2026-11-22
    assert.equal(
      reconcileEffectiveDueDate('2026-11-08', 'weekly', new Set(['2026-11-15']), '2026-11-15', 0),
      '2026-11-22'
    );
  });

  it('should build repeated transactions for a chosen target date (Issue #26)', async () => {
    const { buildRepeatedTransaction } = await getRecurrenceModule();

    const oneOffTx = {
      id: 'tx-orig-1',
      date: '2026-11-10',
      description: 'Coffee',
      amount: 5.5,
      type: 'expense',
      category: 'Food',
      paymentModeId: 'pm-card',
      recurrence: 'none',
      status: 'completed',
      createdAt: 1000
    };

    const repeatedOneOff = buildRepeatedTransaction(oneOffTx, '2026-11-13', 9999);
    assert.equal(repeatedOneOff.id, 'tx-9999');
    assert.equal(repeatedOneOff.date, '2026-11-13');
    assert.equal(repeatedOneOff.status, 'completed');
    assert.equal(repeatedOneOff.description, 'Coffee');
    assert.equal(repeatedOneOff.amount, 5.5);
    assert.equal(repeatedOneOff.nextDueDate, undefined);
    assert.equal(repeatedOneOff.createdAt, 9999);

    const weeklyTx = {
      id: 'tx-orig-2',
      date: '2026-11-08',
      description: 'Room Rent',
      amount: 200,
      type: 'expense',
      category: 'Housing',
      paymentModeId: 'pm-bank',
      recurrence: 'weekly',
      recurrenceDayOfWeek: 0,
      status: 'completed',
      createdAt: 2000
    };

    // Repeating for 2026-11-15 (Sunday) computes nextDueDate from 2026-11-15 -> 2026-11-22
    const repeatedWeekly = buildRepeatedTransaction(weeklyTx, '2026-11-15', 10001);
    assert.equal(repeatedWeekly.date, '2026-11-15');
    assert.equal(repeatedWeekly.nextDueDate, '2026-11-22');

    // Repeating with an overridden amount preserves plain description and updates amount
    const uberTx = {
      ...oneOffTx,
      id: 'tx-orig-3',
      description: 'Uber ride from work',
      amount: 24.5
    };
    const repeatedUber = buildRepeatedTransaction(uberTx, '2026-11-14', 10002, 27.85);
    assert.equal(repeatedUber.date, '2026-11-14');
    assert.equal(repeatedUber.amount, 27.85);
    assert.equal(repeatedUber.description, 'Uber ride from work');

    // Repeating with an overridden amount updates embedded amount template in description
    const templatedTx = {
      ...oneOffTx,
      id: 'tx-orig-4',
      description: 'Uber ride $24.50 from work',
      amount: 24.5
    };
    const repeatedTemplated = buildRepeatedTransaction(templatedTx, '2026-11-14', 10003, 29.10);
    assert.equal(repeatedTemplated.amount, 29.10);
    assert.equal(repeatedTemplated.description, 'Uber ride $29.1 from work');

    // Repeating with an explicit overridden description uses the new description directly
    const repeatedCustomDesc = buildRepeatedTransaction(
      uberTx,
      '2026-11-14',
      10004,
      31.25,
      'Uber ride to airport'
    );
    assert.equal(repeatedCustomDesc.amount, 31.25);
    assert.equal(repeatedCustomDesc.description, 'Uber ride to airport');
  });
});
