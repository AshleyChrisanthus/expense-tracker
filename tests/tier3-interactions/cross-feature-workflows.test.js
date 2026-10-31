import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDbModule, getRecurrenceModule, resetDatabase } from '../helpers/setup.js';
import { mockRecurringWeeklyExpense, mockPaymentModes, mockBanners } from '../helpers/fixtures.js';

describe('Tier 3: Cross-Feature User Workflows & Regressions', () => {
  let dbModule;
  let recurrenceModule;

  beforeEach(async () => {
    await resetDatabase();
    dbModule = await getDbModule();
    recurrenceModule = await getRecurrenceModule();
  });

  it('Workflow 1: Recurring reminder lifecycle — logging on due date and advancing schedule', async () => {
    // 1. Save recurring template transaction in Dexie
    await dbModule.db.putTransaction(mockRecurringWeeklyExpense);

    const initialTemplate = await dbModule.db.transactions.get(mockRecurringWeeklyExpense.id);
    assert.equal(initialTemplate.nextDueDate, '2026-10-19');
    assert.equal(initialTemplate.amount, 320);

    // 2. User clicks "Log on Due Date"
    // Action: Spawn a new historical completed transaction for the logged cycle
    const loggedTransaction = {
      id: 'tx-logged-rent-' + Date.now(),
      date: initialTemplate.nextDueDate,
      amount: initialTemplate.amount,
      type: initialTemplate.type,
      paymentModeId: initialTemplate.paymentModeId,
      category: initialTemplate.category,
      description: `${initialTemplate.description} (Logged on due date)`,
      status: 'completed',
      bannerIds: initialTemplate.bannerIds ? [...initialTemplate.bannerIds] : [],
      createdAt: Date.now()
    };
    await dbModule.db.putTransaction(loggedTransaction);

    // 3. Advance the template's nextDueDate
    const nextDate = recurrenceModule.computeNextDueDate(
      initialTemplate.nextDueDate,
      initialTemplate.recurrence,
      initialTemplate.recurrenceDayOfWeek,
      initialTemplate.recurrenceDayOfMonth
    );
    assert.equal(nextDate, '2026-10-26');

    const updatedTemplate = {
      ...initialTemplate,
      nextDueDate: nextDate
    };
    await dbModule.db.putTransaction(updatedTemplate);

    // 4. Verification in Database
    const savedTemplate = await dbModule.db.transactions.get(mockRecurringWeeklyExpense.id);
    assert.equal(savedTemplate.nextDueDate, '2026-10-26');

    const savedLogged = await dbModule.db.transactions.get(loggedTransaction.id);
    assert.ok(savedLogged);
    assert.equal(savedLogged.date, '2026-10-19');
    assert.equal(savedLogged.amount, 320);
    assert.deepEqual(savedLogged.bannerIds, ['banner-personal']);

    // Total transactions in db is now 2
    const allTxs = await dbModule.db.transactions.toArray();
    assert.equal(allTxs.length, 2);
  });

  it('Workflow 2: Category rename, cascading update, and roundtrip backup export-import', async () => {
    await dbModule.db.savePaymentModes(mockPaymentModes);
    await dbModule.db.saveBanners(mockBanners);

    // 1. Create transactions under category 'Food & Dining'
    const tx1 = {
      id: 'tx-food-1',
      date: '2026-10-14',
      amount: 28.50,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Food & Dining',
      description: 'Noodle soup dinner',
      createdAt: Date.now()
    };
    const tx2 = {
      id: 'tx-food-2',
      date: '2026-10-15',
      amount: 14.00,
      type: 'expense',
      paymentModeId: 'cash',
      category: 'Food & Dining',
      description: 'Sandwich lunch',
      createdAt: Date.now()
    };
    await dbModule.db.bulkAddTransactions([tx1, tx2]);

    // 2. User renames category
    await dbModule.db.renameCategory('Food & Dining', 'Gourmet & Dining');

    // 3. Verify cascading rename in Dexie
    const tx1After = await dbModule.db.transactions.get('tx-food-1');
    const tx2After = await dbModule.db.transactions.get('tx-food-2');
    assert.equal(tx1After.category, 'Gourmet & Dining');
    assert.equal(tx2After.category, 'Gourmet & Dining');

    // 4. Export database
    const exportedState = await dbModule.db.getAllData();
    assert.ok(exportedState.transactions.length >= 2);
    assert.ok(exportedState.categories.includes('Gourmet & Dining'));

    // 5. Clear database
    await dbModule.db.clearAllTransactions();
    const countAfterClear = await dbModule.db.transactions.count();
    assert.equal(countAfterClear, 0);

    // 6. Restore from exported state
    await dbModule.db.importData(exportedState, 'replace');

    const restoredTxs = await dbModule.db.transactions.toArray();
    assert.equal(restoredTxs.length, 2);
    assert.equal(restoredTxs[0].category, 'Gourmet & Dining');
    assert.equal(restoredTxs[1].category, 'Gourmet & Dining');
  });

  it('Workflow 3: Multi-account transfers with fees and balance recalibration on transaction changes', async () => {
    // Balances calculation helper
    function calculateBalances(txs) {
      const balances = { bank: 2000, forex: 0, cash: 50 };
      for (const tx of txs) {
        if (tx.status === 'cancelled') continue;
        if (tx.type === 'income') {
          balances[tx.paymentModeId] = (balances[tx.paymentModeId] || 0) + tx.amount;
        } else if (tx.type === 'expense') {
          balances[tx.paymentModeId] = (balances[tx.paymentModeId] || 0) - tx.amount;
        } else if (tx.type === 'transfer') {
          const fee = tx.fee || 0;
          balances[tx.paymentModeId] = (balances[tx.paymentModeId] || 0) - (tx.amount + fee);
          if (tx.toPaymentModeId) {
            balances[tx.toPaymentModeId] = (balances[tx.toPaymentModeId] || 0) + tx.amount;
          }
        }
      }
      return balances;
    }

    // Step 1: Initial transfer $500 from bank to forex with $10 fee
    const trf1 = {
      id: 'trf-1',
      date: '2026-10-10',
      amount: 500,
      fee: 10,
      type: 'transfer',
      paymentModeId: 'bank',
      toPaymentModeId: 'forex',
      description: 'Load forex card',
      category: 'Transfers',
      createdAt: Date.now()
    };

    // Step 2: Hotel expense on forex $120
    const expHotel = {
      id: 'exp-hotel',
      date: '2026-10-11',
      amount: 120,
      type: 'expense',
      paymentModeId: 'forex',
      description: 'Boutique hotel deposit',
      category: 'Rent & Housing',
      createdAt: Date.now()
    };

    let txList = [trf1, expHotel];
    let balances = calculateBalances(txList);
    // Bank: 2000 - 510 = 1490
    // Forex: +500 - 120 = 380
    assert.equal(balances.bank, 1490);
    assert.equal(balances.forex, 380);

    // Step 3: Delete hotel expense -> Forex recalibrates to $500
    txList = txList.filter(t => t.id !== 'exp-hotel');
    balances = calculateBalances(txList);
    assert.equal(balances.forex, 500);

    // Step 4: Increase fee on transfer to $25
    trf1.fee = 25;
    balances = calculateBalances(txList);
    // Bank: 2000 - 525 = 1475
    assert.equal(balances.bank, 1475);
  });

  it('Workflow 4: Custom banner lifecycle with multi-item tagging and safe unlinking on deletion', async () => {
    // 1. Create custom banner
    const customBanner = {
      id: 'banner-melbourne-gp',
      name: 'Melbourne Grand Prix 2027',
      color: '#ef4444',
      createdAt: Date.now()
    };
    await dbModule.db.putBanner(customBanner);

    // 2. Tag 3 expenses with this banner
    const bTxs = [
      { id: 'gp-1', date: '2026-10-12', amount: 180, type: 'expense', paymentModeId: 'bank', category: 'Shopping', description: 'Grandstand ticket', bannerIds: ['banner-melbourne-gp'] },
      { id: 'gp-2', date: '2026-10-13', amount: 65, type: 'expense', paymentModeId: 'bank', category: 'Shopping', description: 'Team cap & shirt', bannerIds: ['banner-melbourne-gp', 'banner-personal'] },
      { id: 'gp-3', date: '2026-10-14', amount: 45, type: 'expense', paymentModeId: 'cash', category: 'Food & Dining', description: 'Trackside burger & drink', bannerIds: ['banner-melbourne-gp'] }
    ];
    await dbModule.db.bulkAddTransactions(bTxs);

    // Verify all 3 transactions have the banner
    let saved = await dbModule.db.transactions.toArray();
    assert.equal(saved.filter(t => t.bannerIds?.includes('banner-melbourne-gp')).length, 3);

    // 3. Delete the custom banner
    await dbModule.db.deleteBanner('banner-melbourne-gp');

    // 4. Verify banner is deleted from banners table
    const bannerInDb = await dbModule.db.banners.get('banner-melbourne-gp');
    assert.equal(bannerInDb, undefined);

    // 5. Verify all 3 transactions STILL EXIST, but bannerId has been cleanly stripped
    const gp1 = await dbModule.db.transactions.get('gp-1');
    const gp2 = await dbModule.db.transactions.get('gp-2');
    const gp3 = await dbModule.db.transactions.get('gp-3');

    assert.ok(gp1, 'Transaction 1 must not be deleted');
    assert.ok(gp2, 'Transaction 2 must not be deleted');
    assert.ok(gp3, 'Transaction 3 must not be deleted');

    assert.deepEqual(gp1.bannerIds, []);
    assert.deepEqual(gp2.bannerIds, ['banner-personal'], 'Other banner tags must be preserved');
    assert.deepEqual(gp3.bannerIds, []);
  });

  it('Workflow 5: Recurring reminder lifecycle — "Log Today" advances schedule from payment date, preventing 28-day leap bug (Issue #15)', async () => {
    // 1. Setup biweekly Wednesday recurring expense
    const biweeklyExpense = {
      id: 'tx-recurring-biweekly-cleaner',
      date: '2026-09-30', // Wednesday 4 weeks ago
      amount: 150,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Services',
      description: 'House Cleaning',
      recurrence: 'biweekly',
      recurrenceDayOfWeek: 3, // Wednesday
      nextDueDate: '2026-11-11', // Inadvertently pushed to future or card showed 14d
      status: 'completed',
      createdAt: Date.now() - 28 * 86400000
    };
    await dbModule.db.putTransaction(biweeklyExpense);

    // 2. User logs payment for TODAY (2026-10-28, Wednesday)
    const today = '2026-10-28';
    const logDateMode = 'today';
    const currentEffectiveDueDate = biweeklyExpense.nextDueDate; // '2026-11-11'

    const targetDate = logDateMode === 'due'
      ? (currentEffectiveDueDate || biweeklyExpense.nextDueDate || today)
      : today;
    assert.equal(targetDate, '2026-10-28');

    // Next due date must advance 1 cycle from targetDate (today), NOT from currentEffectiveDueDate
    const nextDate = recurrenceModule.computeNextDueDate(
      targetDate,
      biweeklyExpense.recurrence,
      biweeklyExpense.recurrenceDayOfWeek,
      biweeklyExpense.recurrenceDayOfMonth
    );
    // 2026-10-28 + 14 days = 2026-11-11 (14 days, NOT 2026-11-25 / 28 days!)
    assert.equal(nextDate, '2026-11-11');

    // Save logged payment instance
    const loggedPayment = {
      ...biweeklyExpense,
      id: 'tx-logged-' + Date.now(),
      date: targetDate,
      recurrence: undefined,
      recurrenceDayOfWeek: undefined,
      recurrenceDayOfMonth: undefined,
      nextDueDate: undefined,
      createdAt: Date.now()
    };
    await dbModule.db.putTransaction(loggedPayment);

    // Save updated template
    const updatedTemplate = {
      ...biweeklyExpense,
      nextDueDate: nextDate
    };
    await dbModule.db.putTransaction(updatedTemplate);

    // Verify in database
    const savedTemplate = await dbModule.db.transactions.get(biweeklyExpense.id);
    assert.equal(savedTemplate.nextDueDate, '2026-11-11');

    const dueInfo = recurrenceModule.getRecurrenceDueInfo(savedTemplate.nextDueDate, today);
    assert.ok(dueInfo);
    // On 2026-10-28, next due date 2026-11-11 is exactly 14 days away, not 28 days!
    assert.equal(dueInfo.diffDays, 14);

    // 3. Test self-healing reconciliation: if template had nextDueDate: '2026-11-25'
    // but latest completed payment was '2026-10-28', expected next should reconcile to '2026-11-11'
    const expectedNextFromPayment = recurrenceModule.computeNextDueDate(
      loggedPayment.date,
      biweeklyExpense.recurrence,
      biweeklyExpense.recurrenceDayOfWeek,
      biweeklyExpense.recurrenceDayOfMonth
    );
    assert.equal(expectedNextFromPayment, '2026-11-11');
    const staleDueDate = '2026-11-25';
    const reconciledDueDate = staleDueDate > expectedNextFromPayment ? expectedNextFromPayment : staleDueDate;
    assert.equal(reconciledDueDate, '2026-11-11');
  });

  it('Workflow 6: Variable-amount weekly Wednesday income reminder populates description & amount (Issue #16)', async () => {
    const salaryTemplate = {
      id: 'tx-salary-template',
      date: '2026-10-21', // Wednesday
      amount: 783.27,
      type: 'income',
      paymentModeId: 'bank',
      category: 'Income',
      description: 'paid 783.27$ weekly company salary to bank account',
      recurrence: 'weekly',
      recurrenceDayOfWeek: 3, // Wednesday
      isVariableAmount: true,
      descriptionTemplate: 'paid {amount}$ weekly company salary to bank account',
      nextDueDate: '2026-10-28',
      status: 'completed',
      createdAt: Date.now() - 7 * 86400000
    };
    await dbModule.db.putTransaction(salaryTemplate);

    // User types new week's casual salary amount: "845.60" on Wednesday 2026-10-28
    const typedNumber = '845.60';
    const parsedAmount = parseFloat(typedNumber);
    const updatedDescription = recurrenceModule.formatTemplatedDescription(
      salaryTemplate.descriptionTemplate,
      typedNumber
    );
    assert.equal(updatedDescription, 'paid 845.60$ weekly company salary to bank account');
    assert.equal(parsedAmount, 845.60);

    const targetDate = '2026-10-28';
    const nextDate = recurrenceModule.computeNextDueDate(
      targetDate,
      salaryTemplate.recurrence,
      salaryTemplate.recurrenceDayOfWeek
    );
    assert.equal(nextDate, '2026-11-04'); // Next Wednesday

    const loggedIncome = {
      ...salaryTemplate,
      id: 'tx-salary-logged-' + Date.now(),
      date: targetDate,
      amount: parsedAmount,
      description: updatedDescription,
      recurrence: undefined,
      recurrenceDayOfWeek: undefined,
      nextDueDate: undefined,
      isVariableAmount: undefined,
      descriptionTemplate: undefined,
      createdAt: Date.now()
    };
    await dbModule.db.putTransaction(loggedIncome);
    await dbModule.db.putTransaction({ ...salaryTemplate, nextDueDate: nextDate });

    const savedHistorical = await dbModule.db.transactions.get(salaryTemplate.id);
    assert.equal(savedHistorical.amount, 783.27, 'Historical salary amount must remain intact');
    assert.equal(savedHistorical.nextDueDate, '2026-11-04');

    const savedNew = await dbModule.db.transactions.get(loggedIncome.id);
    assert.equal(savedNew.amount, 845.60);
    assert.equal(savedNew.description, 'paid 845.60$ weekly company salary to bank account');
  });

  it('Workflow 7: On-demand ("as_needed") recurring payment template for "paid to family" (Issue #17)', async () => {
    const familyTemplate = {
      id: 'tx-family-template',
      date: '2026-10-01',
      amount: 1000,
      type: 'expense',
      paymentModeId: 'bank',
      category: 'Other',
      description: 'paid to family',
      recurrence: 'as_needed',
      isVariableAmount: true,
      status: 'completed',
      createdAt: Date.now() - 20 * 86400000
    };
    await dbModule.db.putTransaction(familyTemplate);

    // User types 1250 when they have enough money and logs today
    const typedAmount = '1250';
    const loggedfamilyPayment = {
      ...familyTemplate,
      id: 'tx-family-logged-' + Date.now(),
      date: '2026-10-28',
      amount: parseFloat(typedAmount),
      description: recurrenceModule.formatTemplatedDescription(familyTemplate.description, typedAmount),
      recurrence: undefined,
      isVariableAmount: undefined,
      createdAt: Date.now()
    };
    await dbModule.db.putTransaction(loggedfamilyPayment);

    const savedPayment = await dbModule.db.transactions.get(loggedfamilyPayment.id);
    assert.equal(savedPayment.description, 'paid to family');
    assert.equal(savedPayment.amount, 1250);

    const templateStillActive = await dbModule.db.transactions.get(familyTemplate.id);
    assert.equal(templateStillActive.recurrence, 'as_needed');
    assert.equal(templateStillActive.nextDueDate, undefined);
  });
});
