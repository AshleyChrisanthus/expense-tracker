import Dexie, { type Table } from 'dexie';
import { Transaction, PaymentMode, ExpenseDataState } from '../types/expense';
import { 
  DEFAULT_PAYMENT_MODES, 
  DEFAULT_CATEGORIES, 
  INITIAL_TRANSACTIONS 
} from '../utils/storage';

export interface SettingItem {
  key: string;
  value: any;
}

export interface CategoryItem {
  id: string;
  name: string;
}

export class ExpenseDB extends Dexie {
  transactions!: Table<Transaction, string>;
  paymentModes!: Table<PaymentMode, string>;
  categories!: Table<CategoryItem, string>;
  settings!: Table<SettingItem, string>;

  constructor() {
    super('GlassExpenseTrackerDB');
    this.version(1).stores({
      transactions: 'id, date, type, paymentModeId, toPaymentModeId, category, status, createdAt',
      paymentModes: 'id, name, isSystem',
      categories: 'id, name',
      settings: 'key'
    });
  }

  // Prepopulate with Google Keep seed data or migrate from localStorage if present
  async initDatabase(): Promise<{
    transactions: Transaction[];
    paymentModes: PaymentMode[];
    categories: string[];
  }> {
    const txCount = await this.transactions.count();
    const modeCount = await this.paymentModes.count();

    if (txCount === 0 || modeCount === 0) {
      // Check if existing localStorage state exists
      let seedTx = INITIAL_TRANSACTIONS;
      let seedModes = DEFAULT_PAYMENT_MODES;
      let seedCats = DEFAULT_CATEGORIES;

      try {
        const local = localStorage.getItem('expense_tracker_state_v1');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
            seedTx = parsed.transactions;
          }
          if (Array.isArray(parsed.paymentModes) && parsed.paymentModes.length > 0) {
            seedModes = parsed.paymentModes;
          }
          if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
            seedCats = parsed.categories;
          }
        }
      } catch (e) {
        console.warn('Could not read legacy localStorage:', e);
      }

      await this.transaction('rw', this.transactions, this.paymentModes, this.categories, async () => {
        if (modeCount === 0) {
          await this.paymentModes.bulkPut(seedModes);
        }
        if (txCount === 0) {
          await this.transactions.bulkPut(seedTx);
        }
        const existingCats = await this.categories.count();
        if (existingCats === 0) {
          await this.categories.bulkPut(seedCats.map(c => ({ id: c, name: c })));
        }
      });
    }

    const transactions = await this.transactions.orderBy('date').reverse().toArray();
    const paymentModes = await this.paymentModes.toArray();
    const catItems = await this.categories.toArray();
    const categories = catItems.length > 0 ? catItems.map(c => c.name) : DEFAULT_CATEGORIES;

    return {
      transactions,
      paymentModes,
      categories
    };
  }

  async getAllData(): Promise<ExpenseDataState> {
    const transactions = await this.transactions.orderBy('date').reverse().toArray();
    const paymentModes = await this.paymentModes.toArray();
    const catItems = await this.categories.toArray();
    return {
      version: 1,
      transactions,
      paymentModes,
      categories: catItems.map(c => c.name)
    };
  }

  async putTransaction(tx: Transaction): Promise<void> {
    await this.transactions.put(tx);
    // Ensure category exists
    if (tx.category) {
      await this.categories.put({ id: tx.category, name: tx.category });
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.transactions.delete(id);
  }

  async savePaymentModes(modes: PaymentMode[]): Promise<void> {
    await this.transaction('rw', this.paymentModes, async () => {
      await this.paymentModes.clear();
      await this.paymentModes.bulkPut(modes);
    });
  }

  async bulkAddTransactions(items: Transaction[]): Promise<void> {
    await this.transactions.bulkPut(items);
  }

  async resetToSampleData(): Promise<ExpenseDataState> {
    await this.transaction('rw', this.transactions, this.paymentModes, this.categories, async () => {
      await this.transactions.clear();
      await this.paymentModes.clear();
      await this.categories.clear();

      await this.paymentModes.bulkPut(DEFAULT_PAYMENT_MODES);
      await this.transactions.bulkPut(INITIAL_TRANSACTIONS);
      await this.categories.bulkPut(DEFAULT_CATEGORIES.map(c => ({ id: c, name: c })));
    });

    return {
      version: 1,
      paymentModes: DEFAULT_PAYMENT_MODES,
      transactions: INITIAL_TRANSACTIONS,
      categories: DEFAULT_CATEGORIES
    };
  }

  async clearAllTransactions(): Promise<void> {
    await this.transactions.clear();
  }

  async importData(data: ExpenseDataState, mode: 'merge' | 'replace'): Promise<ExpenseDataState> {
    if (mode === 'replace') {
      await this.transaction('rw', this.transactions, this.paymentModes, this.categories, async () => {
        await this.transactions.clear();
        await this.paymentModes.clear();
        await this.categories.clear();

        await this.paymentModes.bulkPut(data.paymentModes);
        await this.transactions.bulkPut(data.transactions);
        await this.categories.bulkPut(data.categories.map(c => ({ id: c, name: c })));
      });
      return data;
    } else {
      // Merge
      await this.transaction('rw', this.transactions, this.paymentModes, this.categories, async () => {
        await this.transactions.bulkPut(data.transactions);
        await this.paymentModes.bulkPut(data.paymentModes);
        await this.categories.bulkPut(data.categories.map(c => ({ id: c, name: c })));
      });
      return this.getAllData();
    }
  }
}

export const db = new ExpenseDB();
