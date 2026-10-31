import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  mockExpense, 
  mockRecurringWeeklyExpense, 
  mockRecurringMonthlyExpense 
} from '../helpers/fixtures.js';

describe('Tier 1: Banner Line Modes & Multi-Selection Logic', () => {
  const txNonRecurringWithBanner = {
    ...mockExpense,
    id: 'tx-nonrec-banner',
    bannerIds: ['banner-personal']
  };

  const txRecurringWithBanner = mockRecurringWeeklyExpense; // has recurrence: 'weekly', bannerIds: ['banner-personal']
  const txRecurringWithOtherBanner = {
    ...mockRecurringMonthlyExpense,
    bannerIds: ['banner-work']
  };
  const txWithoutBanner = {
    ...mockExpense,
    id: 'tx-no-banner',
    bannerIds: []
  };

  const sampleList = [
    txNonRecurringWithBanner,
    txRecurringWithBanner,
    txRecurringWithOtherBanner,
    txWithoutBanner
  ];

  function getEligibleBannerTxs(txs, mode, customBannerIds = []) {
    return txs.filter(tx => {
      if (!tx.bannerIds || tx.bannerIds.length === 0) return false;
      if (mode === 'off') return false;
      if (mode === 'all') return true;
      if (mode === 'recurring') {
        return !!tx.recurrence && tx.recurrence !== 'none';
      }
      if (mode === 'custom') {
        return tx.bannerIds.some(id => customBannerIds.includes(id));
      }
      return false;
    });
  }

  it('should filter transactions eligible for banner lines in "all" mode', () => {
    const eligible = getEligibleBannerTxs(sampleList, 'all');
    assert.equal(eligible.length, 3);
    assert.ok(eligible.some(t => t.id === 'tx-nonrec-banner'));
    assert.ok(eligible.some(t => t.id === mockRecurringWeeklyExpense.id));
    assert.ok(eligible.some(t => t.id === mockRecurringMonthlyExpense.id));
  });

  it('should filter transactions eligible for banner lines in "recurring" mode', () => {
    const eligible = getEligibleBannerTxs(sampleList, 'recurring');
    assert.equal(eligible.length, 2);
    assert.ok(eligible.every(t => !!t.recurrence && t.recurrence !== 'none'));
  });

  it('should filter transactions eligible for banner lines in "custom" mode', () => {
    const eligible = getEligibleBannerTxs(sampleList, 'custom', ['banner-work']);
    assert.equal(eligible.length, 1);
    assert.equal(eligible[0].id, mockRecurringMonthlyExpense.id);
  });

  it('should return no eligible transactions when banner line mode is "off"', () => {
    const eligible = getEligibleBannerTxs(sampleList, 'off');
    assert.equal(eligible.length, 0);
  });

  it('should manage multi-selection set toggle, select all, and clear operations', () => {
    const selectedIds = new Set();

    // Toggle on item 1
    selectedIds.add('tx-1');
    assert.equal(selectedIds.has('tx-1'), true);

    // Toggle on item 2
    selectedIds.add('tx-2');
    assert.equal(selectedIds.size, 2);

    // Toggle off item 1
    selectedIds.delete('tx-1');
    assert.equal(selectedIds.has('tx-1'), false);
    assert.equal(selectedIds.size, 1);

    // Clear and Select all items from sample list
    selectedIds.clear();
    sampleList.forEach(t => selectedIds.add(t.id));
    assert.equal(selectedIds.size, sampleList.length);

    // Clear all
    selectedIds.clear();
    assert.equal(selectedIds.size, 0);
  });
});
