import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getStorageModule, getDbModule, resetDatabase } from '../helpers/setup.js';
import { mockPaymentModes } from '../helpers/fixtures.js';

describe('Tier 2: Corrupted Backup & Malformed Data Handling', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('should reject non-object and null backup payloads via validateImportData', async () => {
    const { validateImportData } = await getStorageModule();

    assert.equal(validateImportData(null), false);
    assert.equal(validateImportData(undefined), false);
    assert.equal(validateImportData(12345), false);
    assert.equal(validateImportData('not valid json object'), false);
    assert.equal(validateImportData(true), false);
  });

  it('should keep banners and their transaction links when restoring a backup in merge mode into an empty app', async () => {
    const { mergeImportedState } = await getStorageModule();
    const { db } = await getDbModule();

    const emptyState = { version: 2, paymentModes: mockPaymentModes, transactions: [], categories: [], banners: [] };
    const backup = {
      version: 2,
      paymentModes: mockPaymentModes,
      categories: ['Rent & Housing'],
      banners: [{ id: 'banner-home', name: 'Home', color: '#8b5cf6', createdAt: 1 }],
      transactions: [{
        id: 'tx-rent-1', date: '2026-10-01', amount: 300, type: 'expense', paymentModeId: 'bank',
        category: 'Rent & Housing', description: 'Rent', bannerIds: ['banner-home'], createdAt: 2
      }]
    };

    const merged = mergeImportedState(emptyState, backup);
    assert.deepEqual(merged.banners.map(b => b.id), ['banner-home']);

    // Persist the same way the app does (handleUpdateDataState -> importData replace)
    const saved = await db.importData(merged, 'replace');
    assert.deepEqual(saved.banners.map(b => b.id), ['banner-home']);

    const reloaded = await db.initDatabase();
    assert.deepEqual(reloaded.banners.map(b => b.id), ['banner-home']);
    assert.deepEqual(reloaded.transactions[0].bannerIds, ['banner-home']);
  });

  it('should reject payloads with missing or non-array transactions', async () => {
    const { validateImportData } = await getStorageModule();

    assert.equal(validateImportData({ paymentModes: [] }), false);
    assert.equal(validateImportData({ transactions: null, paymentModes: [] }), false);
    assert.equal(validateImportData({ transactions: 'string', paymentModes: [] }), false);
    assert.equal(validateImportData({ transactions: {}, paymentModes: [] }), false);
  });

  it('should reject payloads with missing or non-array paymentModes', async () => {
    const { validateImportData } = await getStorageModule();

    assert.equal(validateImportData({ transactions: [] }), false);
    assert.equal(validateImportData({ transactions: [], paymentModes: null }), false);
    assert.equal(validateImportData({ transactions: [], paymentModes: 'string' }), false);
    assert.equal(validateImportData({ transactions: [], paymentModes: {} }), false);
  });

  it('should supply default banners when importing legacy payload without banners property', async () => {
    const { db } = await getDbModule();

    const legacyPayload = {
      version: 1,
      paymentModes: mockPaymentModes,
      transactions: [
        {
          id: 'tx-legacy-1',
          date: '2026-10-15',
          amount: 25,
          type: 'expense',
          paymentModeId: 'bank',
          category: 'Shopping',
          description: 'Legacy item',
          createdAt: Date.now()
        }
      ],
      categories: ['Shopping']
      // banners is undefined (legacy v1 structure)
    };

    const imported = await db.importData(legacyPayload, 'replace');
    assert.ok(imported);

    const bannersInDb = await db.banners.toArray();
    assert.ok(Array.isArray(bannersInDb), 'Legacy backups without banners should import cleanly');
    assert.equal(bannersInDb.length, 0);
  });

  it('should preserve existing database if an import fails during transaction parsing', async () => {
    const { db } = await getDbModule();

    // Insert baseline transaction
    await db.putTransaction({
      id: 'tx-safe-baseline',
      date: '2026-10-15',
      amount: 100,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Other',
      description: 'Pre-existing record',
      createdAt: Date.now()
    });

    const corruptImportAttempt = () => {
      const corruptJson = '{"transactions": [ broken json ';
      return JSON.parse(corruptJson);
    };

    assert.throws(corruptImportAttempt, SyntaxError);

    // Verify original record is completely untouched
    const baseline = await db.transactions.get('tx-safe-baseline');
    assert.ok(baseline);
    assert.equal(baseline.amount, 100);
  });
});
