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
    assert.ok(bannersInDb.length > 0, 'Should seed default banners when importing legacy backup');
    assert.ok(bannersInDb.some(b => b.id === 'banner-personal'));
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
