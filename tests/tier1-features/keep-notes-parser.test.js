import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getStorageModule } from '../helpers/setup.js';
import { mockPaymentModes, mockSampleKeepNotesText, mockValidBackupPayload } from '../helpers/fixtures.js';

describe('Tier 1: Google Keep Notes Parser & Validation', () => {
  it('should parse dates, expenses, transfers, and incomes from Keep note format', async () => {
    const { parseGoogleKeepText } = await getStorageModule();
    const parsed = parseGoogleKeepText(mockSampleKeepNotesText, mockPaymentModes);

    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, 6);

    // 1. Woolworths groceries (Expense on 2026-10-10)
    const exp1 = parsed[0];
    assert.equal(exp1.date, '2026-10-10');
    assert.equal(exp1.amount, 35.50);
    assert.equal(exp1.type, 'expense');
    assert.equal(exp1.paymentModeId, 'bank');
    assert.equal(exp1.category, 'Groceries');

    // 2. KFC lunch (Expense on 2026-10-10)
    const exp2 = parsed[1];
    assert.equal(exp2.amount, 12);
    assert.equal(exp2.type, 'expense');
    assert.equal(exp2.paymentModeId, 'cash');
    assert.equal(exp2.category, 'Food & Dining');

    // 3. Income: put 250$ in Bank
    const inc = parsed[2];
    assert.equal(inc.amount, 250);
    assert.equal(inc.type, 'income');
    assert.equal(inc.paymentModeId, 'bank');

    // 4. Transfer: 100$ from Bank to Forex (+2$ fee)
    const trf = parsed[3];
    assert.equal(trf.amount, 100);
    assert.equal(trf.type, 'transfer');
    assert.equal(trf.paymentModeId, 'bank');
    assert.equal(trf.toPaymentModeId, 'forex');
    assert.equal(trf.fee, 2);
    assert.equal(trf.category, 'Transfers');

    // 5. Room rent payment (Expense on 2026-10-11)
    const rent = parsed[4];
    assert.equal(rent.date, '2026-10-11');
    assert.equal(rent.amount, 320);
    assert.equal(rent.category, 'Rent & Housing');

    // 6. Public transport ticket (Expense on 2026-10-11)
    const transport = parsed[5];
    assert.equal(transport.amount, 8.50);
    assert.equal(transport.paymentModeId, 'forex');
    assert.equal(transport.category, 'Transport');
  });

  it('should ignore summary or total lines from Keep notes', async () => {
    const { parseGoogleKeepText } = await getStorageModule();
    const textWithTotals = `
October 15, 2026
20$ - Bank - Coffee and breakfast
Total: 20$
total for day = 20
grand total spent: 20
`;
    const parsed = parseGoogleKeepText(textWithTotals, mockPaymentModes);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].amount, 20);
  });

  it('should validate valid backup data payloads correctly', async () => {
    const { validateImportData } = await getStorageModule();
    assert.equal(validateImportData(mockValidBackupPayload), true);
    assert.equal(validateImportData(null), false);
    assert.equal(validateImportData(undefined), false);
    assert.equal(validateImportData('invalid string'), false);
    assert.equal(validateImportData({ transactions: 'not an array', paymentModes: [] }), false);
    assert.equal(validateImportData({ transactions: [] }), false);
  });
});
