export type TransactionType = 'expense' | 'income' | 'transfer';

export interface PaymentMode {
  id: string;
  name: string;
  icon: string; // e.g. 'landmark', 'credit-card', 'banknote', 'wallet', 'coins', 'smartphone'
  color: string; // hex color for badge
  isSystem?: boolean;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TransactionType;
  paymentModeId: string; // Source account
  toPaymentModeId?: string; // Destination account for transfers
  fee?: number; // Fee for transfers (e.g. forex transfer charge)
  category: string;
  description: string;
  notes?: string;
  status?: 'completed' | 'cancelled' | 'pending';
  createdAt: number;
}

export interface ExpenseDataState {
  version: number;
  paymentModes: PaymentMode[];
  transactions: Transaction[];
  categories: string[];
}
