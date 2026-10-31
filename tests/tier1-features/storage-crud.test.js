import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDbModule, resetDatabase } from '../helpers/setup.js';
import { 
  mockExpense, 
  mockIncome, 
  mockTransfer, 
  mockPaymentModes, 
  mockBanners, 
  mockCategories 
} from '../helpers/fixtures.js';

describe('Tier 1: Dexie Storage & Schema CRUD Operations', () => {
  let dbModule;

  beforeEach(async () => {
    await resetDatabase();
    dbModule = await getDbModule();
  });

  it('should initialize database with seed data on fresh start', async () => {
    const initData = await dbModule.db.initDatabase();
    assert.ok(initData);
    assert.ok(Array.isArray(initData.transactions));
    assert.equal(initData.transactions.length, 0);
    assert.ok(initData.paymentModes.length >= 3);
    assert.ok(initData.banners.length >= 3);
    assert.ok(initData.categories.length >= 5);
  });

  it('should save a new expense transaction and retrieve it by ID', async () => {
    await dbModule.db.putTransaction(mockExpense);

    const retrieved = await dbModule.db.transactions.get(mockExpense.id);
    assert.ok(retrieved);
    assert.equal(retrieved.id, mockExpense.id);
    assert.equal(retrieved.amount, 45.50);
    assert.equal(retrieved.type, 'expense');
    assert.equal(retrieved.category, 'Groceries');
    assert.equal(retrieved.paymentModeId, 'bank');
  });

  it('should automatically ensure category exists in categories store when saving transaction', async () => {
    const customTx = {
      ...mockExpense,
      id: 'tx-custom-cat',
      category: 'Gadgets & Tech'
    };
    await dbModule.db.putTransaction(customTx);

    const cat = await dbModule.db.categories.get('Gadgets & Tech');
    assert.ok(cat);
    assert.equal(cat.name, 'Gadgets & Tech');
  });

  it('should delete a transaction by ID', async () => {
    await dbModule.db.putTransaction(mockExpense);
    const before = await dbModule.db.transactions.get(mockExpense.id);
    assert.ok(before);

    await dbModule.db.deleteTransaction(mockExpense.id);
    const after = await dbModule.db.transactions.get(mockExpense.id);
    assert.equal(after, undefined);
  });

  it('should bulk add multiple transactions at once', async () => {
    await dbModule.db.bulkAddTransactions([mockExpense, mockIncome, mockTransfer]);
    const count = await dbModule.db.transactions.count();
    assert.equal(count, 3);
  });

  it('should save and retrieve payment modes', async () => {
    await dbModule.db.savePaymentModes(mockPaymentModes);
    const modes = await dbModule.db.paymentModes.toArray();
    assert.equal(modes.length, mockPaymentModes.length);
    assert.ok(modes.some(m => m.id === 'mode-savings'));
  });

  it('should save banners and cascade delete banner references from transactions', async () => {
    await dbModule.db.saveBanners(mockBanners);

    const txWithBanner = {
      ...mockExpense,
      id: 'tx-banner-test',
      bannerIds: ['banner-personal', 'banner-holiday']
    };
    await dbModule.db.putTransaction(txWithBanner);

    // Verify initial banner association
    let tx = await dbModule.db.transactions.get('tx-banner-test');
    assert.deepEqual(tx.bannerIds, ['banner-personal', 'banner-holiday']);

    // Delete banner-holiday
    await dbModule.db.deleteBanner('banner-holiday');

    // Verify banner is removed from banners store
    const banner = await dbModule.db.banners.get('banner-holiday');
    assert.equal(banner, undefined);

    // Verify bannerId was cleanly unlinked from transaction
    tx = await dbModule.db.transactions.get('tx-banner-test');
    assert.ok(tx);
    assert.deepEqual(tx.bannerIds, ['banner-personal']);
  });

  it('should rename category and cascade update all matching transactions', async () => {
    await dbModule.db.saveCategories(mockCategories);
    const tx1 = { ...mockExpense, id: 'tx-cat-1', category: 'Shopping' };
    const tx2 = { ...mockExpense, id: 'tx-cat-2', category: 'Shopping' };
    const tx3 = { ...mockExpense, id: 'tx-cat-3', category: 'Groceries' };
    await dbModule.db.bulkAddTransactions([tx1, tx2, tx3]);

    // Rename Shopping -> Retail Shopping
    await dbModule.db.renameCategory('Shopping', 'Retail Shopping');

    // Check category store
    const oldCat = await dbModule.db.categories.get('Shopping');
    assert.equal(oldCat, undefined);
    const newCat = await dbModule.db.categories.get('Retail Shopping');
    assert.ok(newCat);

    // Check transactions
    const updated1 = await dbModule.db.transactions.get('tx-cat-1');
    const updated2 = await dbModule.db.transactions.get('tx-cat-2');
    const untouched3 = await dbModule.db.transactions.get('tx-cat-3');

    assert.equal(updated1.category, 'Retail Shopping');
    assert.equal(updated2.category, 'Retail Shopping');
    assert.equal(untouched3.category, 'Groceries');
  });

  it('should reset database to sample data', async () => {
    await dbModule.db.putTransaction({ ...mockExpense, id: 'temporary-tx' });
    const resetResult = await dbModule.db.resetToSampleData();

    assert.ok(resetResult);
    assert.ok(Array.isArray(resetResult.transactions));
    const tempTx = await dbModule.db.transactions.get('temporary-tx');
    assert.equal(tempTx, undefined);
  });

  it('should handle importData in replace mode', async () => {
    await dbModule.db.putTransaction({ ...mockExpense, id: 'old-tx' });
    const importPayload = {
      version: 2,
      paymentModes: mockPaymentModes,
      transactions: [mockExpense, mockIncome],
      categories: ['Food', 'Salary'],
      banners: mockBanners
    };

    await dbModule.db.importData(importPayload, 'replace');

    const txs = await dbModule.db.transactions.toArray();
    assert.equal(txs.length, 2);
    assert.equal(await dbModule.db.transactions.get('old-tx'), undefined);
    assert.ok(await dbModule.db.transactions.get(mockExpense.id));
  });

  it('should handle importData in merge mode', async () => {
    await dbModule.db.putTransaction({ ...mockExpense, id: 'existing-tx' });
    const importPayload = {
      version: 2,
      paymentModes: mockPaymentModes,
      transactions: [mockIncome],
      categories: ['Extra'],
      banners: mockBanners
    };

    await dbModule.db.importData(importPayload, 'merge');

    const txs = await dbModule.db.transactions.toArray();
    assert.equal(txs.length, 2);
    assert.ok(await dbModule.db.transactions.get('existing-tx'));
    assert.ok(await dbModule.db.transactions.get(mockIncome.id));
  });
});
