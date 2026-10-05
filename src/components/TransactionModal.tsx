import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Tag, 
  FileText, 
  ArrowRight
} from 'lucide-react';
import { Transaction, TransactionType, PaymentMode } from '../types/expense';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  modes: PaymentMode[];
  categories: string[];
  initialTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  modes,
  categories,
  initialTransaction
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentModeId, setPaymentModeId] = useState(modes[0]?.id || 'bank');
  const [toPaymentModeId, setToPaymentModeId] = useState(modes[1]?.id || 'forex');
  const [fee, setFee] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Rent');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'completed' | 'cancelled' | 'pending'>('completed');

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toString());
      setDate(initialTransaction.date);
      setPaymentModeId(initialTransaction.paymentModeId);
      setToPaymentModeId(initialTransaction.toPaymentModeId || modes[0]?.id || 'bank');
      setFee(initialTransaction.fee ? initialTransaction.fee.toString() : '');
      if (categories.includes(initialTransaction.category)) {
        setCategory(initialTransaction.category);
        setCustomCategory('');
      } else {
        setCategory('Other');
        setCustomCategory(initialTransaction.category);
      }
      setDescription(initialTransaction.description);
      setNotes(initialTransaction.notes || '');
      setStatus(initialTransaction.status || 'completed');
    } else {
      setType('expense');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentModeId(modes[0]?.id || 'bank');
      setToPaymentModeId(modes[1]?.id || 'forex');
      setFee('');
      setCategory('Rent');
      setCustomCategory('');
      setDescription('');
      setNotes('');
      setStatus('completed');
    }
  }, [initialTransaction, isOpen, modes, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const finalCategory = category === 'Other' && customCategory.trim() 
      ? customCategory.trim() 
      : (type === 'transfer' ? 'Transfers' : category);

    const transaction: Transaction = {
      id: initialTransaction ? initialTransaction.id : 'tx-' + Date.now(),
      date,
      amount: parsedAmount,
      type,
      paymentModeId,
      toPaymentModeId: type === 'transfer' ? toPaymentModeId : undefined,
      fee: type === 'transfer' && fee ? parseFloat(fee) : undefined,
      category: finalCategory,
      description: description.trim() || (type === 'transfer' ? `Transfer to ${modes.find(m => m.id === toPaymentModeId)?.name || 'Account'}` : 'Expense'),
      notes: notes.trim() || undefined,
      status,
      createdAt: initialTransaction ? initialTransaction.createdAt : Date.now()
    };

    onSave(transaction);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="glass-modal w-full max-w-lg rounded-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-light)] mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {initialTransaction ? 'Edit Record' : 'Add New Transaction'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector (Expense / Transfer / Income) */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] mb-4">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              type === 'expense'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Expense
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              type === 'transfer'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              type === 'income'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Income / Deposit
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Amount ($)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
                  <DollarSign className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="apple-input pl-9 text-base font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="apple-input pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Payment Mode Selection */}
          {type === 'transfer' ? (
            <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-3">
              <div className="grid grid-cols-2 gap-2 items-center">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    From Account
                  </label>
                  <select
                    value={paymentModeId}
                    onChange={(e) => setPaymentModeId(e.target.value)}
                    className="apple-input text-xs"
                  >
                    {modes.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 text-purple-400" /> To Account
                  </label>
                  <select
                    value={toPaymentModeId}
                    onChange={(e) => setToPaymentModeId(e.target.value)}
                    className="apple-input text-xs"
                  >
                    {modes.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Transfer Fee / Charge ($) (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="e.g. 7.50"
                  className="apple-input text-xs"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {type === 'income' ? 'Deposit Into Mode' : 'Payment Mode'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {modes.map((m) => {
                  const isSelected = paymentModeId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentModeId(m.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                        isSelected 
                          ? 'border-[var(--accent)] bg-[var(--accent-bg)] shadow-sm' 
                          : 'border-[var(--border-light)] bg-[var(--bg-secondary)] hover:border-[var(--text-secondary)]/30'
                      }`}
                    >
                      <span 
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-full">
                        {m.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category & Description */}
          {type !== 'transfer' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
                    <Tag className="w-4 h-4" />
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="apple-input pl-9 text-xs"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {category === 'Other' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Custom Category Name
                  </label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Gaming, Subscriptions"
                    className="apple-input text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Description / Payee (e.g. room rent, aldi grocery, coles)
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. coles grocery, room rent, ezymart coffee"
              className="apple-input text-xs"
            />
          </div>

          {/* Notes and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Additional Notes
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. near RMIT, split bill..."
                  className="apple-input pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="apple-input text-xs"
              >
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled / Uncollected</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-light)]">
            <button
              type="button"
              onClick={onClose}
              className="apple-btn apple-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="apple-btn apple-btn-primary text-xs"
            >
              {initialTransaction ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
