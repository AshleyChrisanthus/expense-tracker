import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDbModule, resetDatabase } from '../helpers/setup.js';
import { mockPaymentModes, mockBanners, mockCategories } from '../helpers/fixtures.js';

describe('Tier 4: Realistic Data Workload & Scaled Imports', () => {
  let dbModule;

  beforeEach(async () => {
    await resetDatabase();
    dbModule = await getDbModule();
  });

  it('should import and query a full year realistic dataset (100+ transactions) with zero degradation', async () => {
    // Generate 120 realistic transactions across 12 months
    const realisticTransactions = [];
    const categories = ['Rent & Housing', 'Groceries', 'Food & Dining', 'Transport', 'Shopping', 'Other'];
    const modes = ['bank', 'forex', 'cash'];

    for (let i = 1; i <= 120; i++) {
      const month = String(Math.floor((i - 1) / 10) + 1).padStart(2, '0');
      const day = String(((i * 2) % 28) + 1).padStart(2, '0');
      const category = categories[i % categories.length];
      const mode = modes[i % modes.length];
      const amount = (i * 7.75) % 350 + 5.50;

      realisticTransactions.push({
        id: `tx-workload-${i}`,
        date: `2026-${month}-${day}`,
        amount: Math.round(amount * 100) / 100,
        type: i % 15 === 0 ? 'income' : (i % 25 === 0 ? 'transfer' : 'expense'),
        paymentModeId: mode,
        toPaymentModeId: i % 25 === 0 ? 'forex' : undefined,
        fee: i % 25 === 0 ? 2.50 : 0,
        category: i % 15 === 0 ? 'Income' : (i % 25 === 0 ? 'Transfers' : category),
        description: `Realistic workload item #${i} in ${category}`,
        bannerIds: i % 4 === 0 ? ['banner-personal'] : (i % 7 === 0 ? ['banner-work'] : []),
        status: 'completed',
        createdAt: 1791162000000 + i * 1000
      });
    }

    const payload = {
      version: 2,
      paymentModes: mockPaymentModes,
      transactions: realisticTransactions,
      categories: mockCategories,
      banners: mockBanners
    };

    const startTime = Date.now();
    await dbModule.db.importData(payload, 'replace');
    const importDuration = Date.now() - startTime;

    // Verify import completed smoothly
    const totalCount = await dbModule.db.transactions.count();
    assert.equal(totalCount, 120);
    assert.ok(importDuration < 2000, `Import took ${importDuration}ms, expected under 2000ms`);

    // Verify ordering and querying
    const ordered = await dbModule.db.transactions.orderBy('date').reverse().toArray();
    assert.equal(ordered.length, 120);
    assert.ok(ordered[0].date >= ordered[ordered.length - 1].date);

    // Filter by banner-personal
    const personalTxs = ordered.filter(t => t.bannerIds?.includes('banner-personal'));
    assert.ok(personalTxs.length >= 25);
  });

  it('should support incremental merging of updates over an existing dataset without duplicating records', async () => {
    // Initial 20 records
    const initialTxs = Array.from({ length: 20 }, (_, idx) => ({
      id: `tx-merge-${idx}`,
      date: '2026-10-01',
      amount: 10 + idx,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Groceries',
      description: `Original transaction ${idx}`,
      createdAt: Date.now()
    }));

    await dbModule.db.bulkAddTransactions(initialTxs);
    assert.equal(await dbModule.db.transactions.count(), 20);

    // Merge payload containing:
    // 10 updated transactions (same IDs, new description)
    // 15 brand new transactions
    const updatedBatch = initialTxs.slice(0, 10).map(t => ({
      ...t,
      description: t.description + ' (Updated)'
    }));

    const newBatch = Array.from({ length: 15 }, (_, idx) => ({
      id: `tx-merge-new-${idx}`,
      date: '2026-10-02',
      amount: 50 + idx,
      type: 'expense',
      paymentModeId: 'cash',
      category: 'Transport',
      description: `New batch transaction ${idx}`,
      createdAt: Date.now()
    }));

    const mergePayload = {
      version: 2,
      paymentModes: mockPaymentModes,
      transactions: [...updatedBatch, ...newBatch],
      categories: mockCategories,
      banners: mockBanners
    };

    await dbModule.db.importData(mergePayload, 'merge');

    // Total count should be 20 + 15 = 35 (no duplicates!)
    const totalAfterMerge = await dbModule.db.transactions.count();
    assert.equal(totalAfterMerge, 35);

    // Verify existing updated record
    const updatedRecord = await dbModule.db.transactions.get('tx-merge-0');
    assert.ok(updatedRecord.description.includes('(Updated)'));
  });
});
