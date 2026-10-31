import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRecurrenceModule } from '../helpers/setup.js';

describe('Tier 2: Recurrence Boundary & Calendar Corner Cases', () => {
  it('should handle leap year transitions (Feb 29) on monthly schedules', async () => {
    const { computeNextDueDate } = await getRecurrenceModule();

    // 2024 is a leap year (has Feb 29)
    // Jan 31 -> Feb 29, 2024
    assert.equal(computeNextDueDate('2024-01-31', 'monthly', undefined, 31), '2024-02-29');

    // Feb 29, 2024 -> March 29, 2024 (or 31 if target is 31)
    assert.equal(computeNextDueDate('2024-02-29', 'monthly', undefined, 29), '2024-03-29');
    assert.equal(computeNextDueDate('2024-02-29', 'monthly', undefined, 31), '2024-03-31');

    // 2025 is not a leap year (Feb 28)
    assert.equal(computeNextDueDate('2025-01-31', 'monthly', undefined, 31), '2025-02-28');
  });

  it('should handle year-end roll-overs across all recurrence rules', async () => {
    const { computeNextDueDate } = await getRecurrenceModule();

    // Daily rollover on Dec 31
    assert.equal(computeNextDueDate('2026-12-31', 'daily'), '2027-01-01');

    // Weekly rollover across year boundary
    // 2026-12-28 is Monday -> next Monday is 2027-01-04
    assert.equal(computeNextDueDate('2026-12-28', 'weekly', 1), '2027-01-04');

    // Monthly rollover Dec -> Jan
    assert.equal(computeNextDueDate('2026-12-15', 'monthly', undefined, 15), '2027-01-15');

    // Yearly rollover
    assert.equal(computeNextDueDate('2026-12-31', 'yearly', undefined, 31), '2027-12-31');
  });

  it('should clamp 31st to 30 days for April, June, September, November', async () => {
    const { computeNextDueDate } = await getRecurrenceModule();

    // March 31 -> April 30
    assert.equal(computeNextDueDate('2026-03-31', 'monthly', undefined, 31), '2026-04-30');
    // May 31 -> June 30
    assert.equal(computeNextDueDate('2026-05-31', 'monthly', undefined, 31), '2026-06-30');
    // August 31 -> September 30
    assert.equal(computeNextDueDate('2026-08-31', 'monthly', undefined, 31), '2026-09-30');
    // October 31 -> November 30
    assert.equal(computeNextDueDate('2026-10-31', 'monthly', undefined, 31), '2026-11-30');
  });

  it('should fallback gracefully when recurrence rule is none or invalid', async () => {
    const { computeNextDueDate, calculateInitialDueDate, formatRecurrenceLabel } = await getRecurrenceModule();

    assert.equal(computeNextDueDate('2026-10-15', 'none'), '2026-10-15');
    assert.equal(computeNextDueDate('2026-10-15', undefined), '2026-10-15');
    assert.equal(calculateInitialDueDate('2026-10-15', 'none'), '2026-10-15');
    assert.equal(formatRecurrenceLabel(undefined), 'Does not repeat');
    assert.equal(formatRecurrenceLabel('none'), 'Does not repeat');
  });
});
