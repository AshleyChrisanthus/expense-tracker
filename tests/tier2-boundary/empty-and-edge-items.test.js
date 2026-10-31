import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDbModule, resetDatabase } from '../helpers/setup.js';

describe('Tier 2: Empty & Edge Value Cases', () => {
  let dbModule;

  beforeEach(async () => {
    await resetDatabase();
    dbModule = await getDbModule();
  });

  it('should handle zero, fractional cents, and large transactions safely', async () => {
    const zeroTx = {
      id: 'tx-zero',
      date: '2026-10-15',
      amount: 0,
      type: 'expense',
      paymentModeId: 'cash',
      category: 'Other',
      description: 'Zero amount coupon item',
      createdAt: Date.now()
    };

    const fractionalTx = {
      id: 'tx-fractional',
      date: '2026-10-15',
      amount: 0.005,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Other',
      description: 'Micro transaction fee',
      createdAt: Date.now()
    };

    const largeTx = {
      id: 'tx-large',
      date: '2026-10-15',
      amount: 10000000.50,
      type: 'income',
      paymentModeId: 'bank',
      category: 'Income',
      description: 'Major institutional liquidity transfer',
      createdAt: Date.now()
    };

    await dbModule.db.putTransaction(zeroTx);
    await dbModule.db.putTransaction(fractionalTx);
    await dbModule.db.putTransaction(largeTx);

    assert.equal((await dbModule.db.transactions.get('tx-zero')).amount, 0);
    assert.equal((await dbModule.db.transactions.get('tx-fractional')).amount, 0.005);
    assert.equal((await dbModule.db.transactions.get('tx-large')).amount, 10000000.50);
  });

  it('should handle transactions with empty description or missing optional fields', async () => {
    const minimalTx = {
      id: 'tx-minimal',
      date: '2026-10-15',
      amount: 10,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Other',
      description: '',
      createdAt: Date.now()
    };

    await dbModule.db.putTransaction(minimalTx);
    const retrieved = await dbModule.db.transactions.get('tx-minimal');
    assert.ok(retrieved);
    assert.equal(retrieved.description, '');
    assert.equal(retrieved.notes, undefined);
    assert.equal(retrieved.toPaymentModeId, undefined);
    assert.equal(retrieved.fee, undefined);
    assert.equal(retrieved.recurrence, undefined);
  });

  it('should handle transfer with zero fee or unspecified destination gracefully', async () => {
    const transferNoFee = {
      id: 'trf-no-fee',
      date: '2026-10-15',
      amount: 100,
      type: 'transfer',
      paymentModeId: 'bank',
      toPaymentModeId: 'cash',
      category: 'Transfers',
      description: 'ATM withdrawal',
      fee: 0,
      createdAt: Date.now()
    };

    await dbModule.db.putTransaction(transferNoFee);
    const saved = await dbModule.db.transactions.get('trf-no-fee');
    assert.equal(saved.fee, 0);
    assert.equal(saved.toPaymentModeId, 'cash');
  });

  it('should handle unlisted or non-existent payment mode references without crashing', async () => {
    const orphanTx = {
      id: 'tx-orphan',
      date: '2026-10-15',
      amount: 50,
      type: 'expense',
      paymentModeId: 'deleted-crypto-mode',
      category: 'Unlisted Category',
      description: 'Item with legacy mode ID',
      createdAt: Date.now()
    };

    await dbModule.db.putTransaction(orphanTx);
    const saved = await dbModule.db.transactions.get('tx-orphan');
    assert.ok(saved);
    assert.equal(saved.paymentModeId, 'deleted-crypto-mode');
  });
});
