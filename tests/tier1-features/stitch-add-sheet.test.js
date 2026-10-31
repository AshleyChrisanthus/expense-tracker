import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getTransactionSheetModule } from '../helpers/setup.js';
import { mockPaymentModes } from '../helpers/fixtures.js';

describe('Tier 1: Stitch Mobile UI — Slide-Up Add Transaction Sheet (Issue #22)', () => {

  it('should accurately calculate quick increment amount chips (+5, +10, +50, +100)', async () => {
    const { applyAmountIncrement } = await getTransactionSheetModule();

    // Basic increments from issue example $59.87
    assert.equal(applyAmountIncrement('59.87', 5), '64.87');
    assert.equal(applyAmountIncrement('59.87', 10), '69.87');
    assert.equal(applyAmountIncrement('59.87', 50), '109.87');
    assert.equal(applyAmountIncrement('59.87', 100), '159.87');

    // From empty or 0
    assert.equal(applyAmountIncrement('', 5), '5.00');
    assert.equal(applyAmountIncrement('0', 10), '10.00');
    assert.equal(applyAmountIncrement('100.5', 5), '105.50');
  });

  it('should round amount to nearest whole dollar via Round .00 chip', async () => {
    const { roundAmountToWhole } = await getTransactionSheetModule();

    // 59.87 rounds to 60.00
    assert.equal(roundAmountToWhole('59.87'), '60.00');
    // 42.49 rounds down to 42.00
    assert.equal(roundAmountToWhole('42.49'), '42.00');
    // 42.50 rounds up to 43.00
    assert.equal(roundAmountToWhole('42.50'), '43.00');
    // 0 and empty
    assert.equal(roundAmountToWhole('0'), '0.00');
    assert.equal(roundAmountToWhole(''), '0.00');
    assert.equal(roundAmountToWhole('120.00'), '120.00');
  });

  it('should accurately compute live calculated per-account balances across payment modes', async () => {
    const { computeAccountBalances, formatCurrencyBalance } = await getTransactionSheetModule();

    const modes = [
      { id: 'bank', name: 'Bank Account', icon: 'landmark', color: '#3b82f6', isSystem: true },
      { id: 'cash', name: 'Cash', icon: 'banknote', color: '#10b981', isSystem: true },
      { id: 'forex', name: 'Forex Card', icon: 'credit-card', color: '#8b5cf6', isSystem: true }
    ];

    const transactions = [
      // Bank receives income $55,000
      { id: 'tx-inc', date: '2026-10-01', amount: 55000.00, type: 'income', paymentModeId: 'bank', category: 'Income', status: 'completed' },
      // Bank expense $3,931.89 (leaving 51,068.11)
      { id: 'tx-exp-1', date: '2026-10-05', amount: 3931.89, type: 'expense', paymentModeId: 'bank', category: 'Rent', status: 'completed' },
      // Cash receives $500 income, spends $35.75 (leaving 464.25)
      { id: 'tx-inc-cash', date: '2026-10-02', amount: 500.00, type: 'income', paymentModeId: 'cash', category: 'Income', status: 'completed' },
      { id: 'tx-exp-cash', date: '2026-10-06', amount: 35.75, type: 'expense', paymentModeId: 'cash', category: 'Food', status: 'completed' },
      // Forex receives $750, spends $50.19 (leaving 699.81)
      { id: 'tx-inc-forex', date: '2026-10-03', amount: 750.00, type: 'income', paymentModeId: 'forex', category: 'Income', status: 'completed' },
      { id: 'tx-exp-forex', date: '2026-10-07', amount: 50.19, type: 'expense', paymentModeId: 'forex', category: 'Shopping', status: 'completed' },
      // Cancelled transaction (must be ignored)
      { id: 'tx-cancelled', date: '2026-10-08', amount: 1000.00, type: 'expense', paymentModeId: 'bank', category: 'Rent', status: 'cancelled' }
    ];

    const balances = computeAccountBalances(modes, transactions);

    assert.equal(balances['bank'], 51068.11);
    assert.equal(balances['cash'], 464.25);
    assert.equal(balances['forex'], 699.81);

    // Verify currency formatting
    assert.equal(formatCurrencyBalance(balances['bank']), '$51,068.11');
    assert.equal(formatCurrencyBalance(balances['cash']), '$464.25');
    assert.equal(formatCurrencyBalance(balances['forex']), '$699.81');
    assert.equal(formatCurrencyBalance(-150.50), '-$150.50');
  });

  it('should account for transfer deductions and fees on from-account and addition on to-account', async () => {
    const { computeAccountBalances } = await getTransactionSheetModule();

    const modes = [
      { id: 'bank', name: 'Bank Account', icon: 'landmark', color: '#3b82f6', isSystem: true },
      { id: 'forex', name: 'Forex Card', icon: 'credit-card', color: '#8b5cf6', isSystem: true }
    ];

    const transactions = [
      { id: 't1', date: '2026-10-01', amount: 2000.00, type: 'income', paymentModeId: 'bank', category: 'Income', status: 'completed' },
      { id: 't2', date: '2026-10-02', amount: 500.00, fee: 7.50, type: 'transfer', paymentModeId: 'bank', toPaymentModeId: 'forex', category: 'Transfers', status: 'completed' }
    ];

    const balances = computeAccountBalances(modes, transactions);
    // Bank had 2000, transferred 500 + 7.50 fee = 1492.50
    assert.equal(balances['bank'], 1492.50);
    // Forex received 500
    assert.equal(balances['forex'], 500.00);
  });

  it('should render correct 2×4 touch icon grid with all 8 primary categories and aliases', async () => {
    const { PRIMARY_STITCH_CATEGORIES, resolveCategoryName, getCategoryIcon } = await getTransactionSheetModule();

    assert.equal(PRIMARY_STITCH_CATEGORIES.length, 8);

    const expected = [
      { name: 'Insurance', icon: '🛡️' },
      { name: 'Dining', icon: '🍴' },
      { name: 'Rent', icon: '🏠' },
      { name: 'Groceries', icon: '🛒' },
      { name: 'Transport', icon: '🚆' },
      { name: 'Utilities', icon: '⚡' },
      { name: 'Salary', icon: '💼' },
      { name: 'Shopping', icon: '🛍️' }
    ];

    expected.forEach((exp, idx) => {
      assert.equal(PRIMARY_STITCH_CATEGORIES[idx].name, exp.name);
      assert.equal(PRIMARY_STITCH_CATEGORIES[idx].icon, exp.icon);
    });

    // Test alias resolution against existing categories
    const availableCategories = ['Rent & Housing', 'Groceries', 'Food & Dining', 'Transport', 'Shopping', 'Income', 'Transfers', 'Other'];
    assert.equal(resolveCategoryName('Rent', availableCategories), 'Rent & Housing');
    assert.equal(resolveCategoryName('Dining', availableCategories), 'Food & Dining');
    assert.equal(resolveCategoryName('Salary', availableCategories), 'Income');
    assert.equal(resolveCategoryName('Insurance', availableCategories), 'Insurance');

    // Test getCategoryIcon
    assert.equal(getCategoryIcon('Rent & Housing'), '🏠');
    assert.equal(getCategoryIcon('Groceries'), '🛒');
    assert.equal(getCategoryIcon('Food & Dining'), '🍴');
    assert.equal(getCategoryIcon('Transport'), '🚆');
    assert.equal(getCategoryIcon('Insurance'), '🛡️');
  });

  it('should parse single-line Google Keep snippet into transaction fields (OVHC Bupa)', async () => {
    const { parseKeepSnippet } = await getTransactionSheetModule();

    const rawSnippet = '59.87$ - from bank - OVHC (Bupa Insurance)';
    const parsed = parseKeepSnippet(rawSnippet, mockPaymentModes);

    assert.ok(parsed);
    assert.equal(parsed.amount, 59.87);
    assert.equal(parsed.type, 'expense');
    assert.equal(parsed.paymentModeId, 'bank');
    assert.equal(parsed.description, 'OVHC (Bupa Insurance)');
    assert.equal(parsed.category, 'Insurance');
  });

  it('should parse transfer Google Keep line into transfer type, modes, and fee', async () => {
    const { parseKeepSnippet } = await getTransactionSheetModule();

    const rawTransfer = 'Transferred 1000$ from forex to bank(+7.5$ charge)';
    const parsed = parseKeepSnippet(rawTransfer, mockPaymentModes);

    assert.ok(parsed);
    assert.equal(parsed.amount, 1000);
    assert.equal(parsed.type, 'transfer');
    assert.equal(parsed.paymentModeId, 'forex');
    assert.equal(parsed.toPaymentModeId, 'bank');
    assert.equal(parsed.fee, 7.5);
    assert.equal(parsed.category, 'Transfers');
  });

  it('should parse income Google Keep line into income type and payment mode', async () => {
    const { parseKeepSnippet } = await getTransactionSheetModule();

    const rawIncome = 'put 500$ in bank';
    const parsed = parseKeepSnippet(rawIncome, mockPaymentModes);

    assert.ok(parsed);
    assert.equal(parsed.amount, 500);
    assert.equal(parsed.type, 'income');
    assert.equal(parsed.paymentModeId, 'bank');
  });

  it('should parse raw informal Keep lines like "$59.87 OVHC (Bupa Insurance)"', async () => {
    const { parseKeepSnippet } = await getTransactionSheetModule();

    const rawInformal = '$59.87 OVHC (Bupa Insurance)';
    const parsed = parseKeepSnippet(rawInformal, mockPaymentModes);

    assert.ok(parsed);
    assert.equal(parsed.amount, 59.87);
    assert.equal(parsed.type, 'expense');
    assert.equal(parsed.description, 'OVHC (Bupa Insurance)');
    assert.equal(parsed.category, 'Insurance');
  });

  it('should format calendar date display into human-friendly format', async () => {
    const { formatDateDisplay } = await getTransactionSheetModule();

    assert.equal(formatDateDisplay('2026-10-28'), 'Oct 28, 2026');
    assert.equal(formatDateDisplay('2026-03-31'), 'Mar 31, 2026');
  });

  it('should return appropriate account icon emojis', async () => {
    const { getModeEmoji } = await getTransactionSheetModule();

    assert.equal(getModeEmoji('landmark', 'Bank Account'), '🏛️');
    assert.equal(getModeEmoji('banknote', 'Cash In Hand'), '💵');
    assert.equal(getModeEmoji('credit-card', 'Forex Card'), '💳');
  });
});
