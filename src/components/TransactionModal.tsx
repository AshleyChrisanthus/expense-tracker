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
  ArrowRight,
  Repeat,
  Plus,
  Bookmark
} from 'lucide-react';
import { Transaction, TransactionType, PaymentMode, RecurrenceRule, Banner } from '../types/expense';
import { 
  calculateInitialDueDate, 
  WEEKDAYS, 
  getOrdinalSuffix 
} from '../utils/recurrence';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  modes: PaymentMode[];
  categories: string[];
  banners?: Banner[];
  initialTransaction?: Transaction | null;
  onManageCategories?: () => void;
  onManageBanners?: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  modes,
  categories,
  banners = [],
  initialTransaction,
  onManageCategories,
  onManageBanners
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
  const [recurrence, setRecurrence] = useState<RecurrenceRule>('none');
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState<number>(0);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number>(1);
  const [selectedBannerIds, setSelectedBannerIds] = useState<string[]>([]);

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toString());
      setDate(initialTransaction.date);
      setPaymentModeId(initialTransaction.paymentModeId);
      setToPaymentModeId(initialTransaction.toPaymentModeId || modes[0]?.id || 'bank');
      setFee(initialTransaction.fee ? initialTransaction.fee.toString() : '');
      setSelectedBannerIds(initialTransaction.bannerIds || []);
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
      setRecurrence(initialTransaction.recurrence || 'none');

      // Set initial day of week and day of month
      if (initialTransaction.recurrenceDayOfWeek !== undefined) {
        setRecurrenceDayOfWeek(initialTransaction.recurrenceDayOfWeek);
      } else if (initialTransaction.date) {
        const parts = initialTransaction.date.split('-').map(Number);
        if (parts.length === 3) {
          setRecurrenceDayOfWeek(new Date(parts[0], parts[1] - 1, parts[2]).getDay());
        }
      }

      if (initialTransaction.recurrenceDayOfMonth !== undefined) {
        setRecurrenceDayOfMonth(initialTransaction.recurrenceDayOfMonth);
      } else if (initialTransaction.date) {
        const parts = initialTransaction.date.split('-').map(Number);
        if (parts.length === 3) {
          setRecurrenceDayOfMonth(parts[2]);
        }
      }
    } else {
      setType('expense');
      setAmount('');
      const todayStr = new Date().toISOString().split('T')[0];
      setDate(todayStr);
      setPaymentModeId(modes[0]?.id || 'bank');
      setToPaymentModeId(modes[1]?.id || 'forex');
      setFee('');
      setCategory('Rent');
      setCustomCategory('');
      setDescription('');
      setNotes('');
      setStatus('completed');
      setRecurrence('none');
      setSelectedBannerIds([]);
      
      const now = new Date();
      setRecurrenceDayOfWeek(now.getDay());
      setRecurrenceDayOfMonth(now.getDate());
    }
  }, [initialTransaction, isOpen, modes, categories]);

  if (!isOpen) return null;

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (!initialTransaction) {
      const parts = newDate.split('-').map(Number);
      if (parts.length === 3) {
        const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
        setRecurrenceDayOfWeek(dObj.getDay());
        setRecurrenceDayOfMonth(parts[2]);
      }
    }
  };

  const toggleBanner = (bannerId: string) => {
    setSelectedBannerIds(prev => 
      prev.includes(bannerId) ? prev.filter(id => id !== bannerId) : [...prev, bannerId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const finalCategory = category === 'Other' && customCategory.trim() 
      ? customCategory.trim() 
      : (type === 'transfer' ? 'Transfers' : category);

    const isWeekCycle = recurrence === 'weekly' || recurrence === 'biweekly';
    const isMonthCycle = recurrence === 'monthly';

    const nextDueDate = (recurrence && recurrence !== 'none')
      ? (initialTransaction?.nextDueDate || calculateInitialDueDate(
          date, 
          recurrence, 
          isWeekCycle ? recurrenceDayOfWeek : undefined,
          isMonthCycle ? recurrenceDayOfMonth : undefined
        ))
      : undefined;

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
      recurrence: recurrence !== 'none' ? recurrence : undefined,
      recurrenceDayOfWeek: isWeekCycle ? recurrenceDayOfWeek : undefined,
      recurrenceDayOfMonth: isMonthCycle ? recurrenceDayOfMonth : undefined,
      nextDueDate,
      bannerIds: selectedBannerIds.length > 0 ? selectedBannerIds : undefined,
      createdAt: initialTransaction ? initialTransaction.createdAt : Date.now()
    };

    onSave(transaction);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="glass-modal w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl relative overflow-hidden shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (pinned at top) */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--border-light)] shrink-0">
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

        {/* Form with scrollable body and pinned footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto p-5 space-y-4 flex-1">
            {/* Type Selector (Expense / Transfer / Income) */}
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
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
                  className="apple-input apple-input-with-icon pl-9 text-base font-semibold"
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
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="apple-input apple-input-with-icon pl-9 text-sm"
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Category
                  </label>
                  {onManageCategories && (
                    <button
                      type="button"
                      onClick={onManageCategories}
                      className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Manage
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
                    <Tag className="w-4 h-4" />
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="apple-input apple-input-with-icon pl-9 text-xs"
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

          {/* Recurrence & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-purple-400" /> Recurrence / Repeat
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
                className="apple-input text-xs"
              >
                <option value="none">One-time (Does not repeat)</option>
                <option value="weekly">Weekly (e.g. Every Sunday)</option>
                <option value="biweekly">Every 2 Weeks (Bi-weekly)</option>
                <option value="monthly">Monthly (e.g. 2nd of every month)</option>
                <option value="yearly">Yearly (Annual bills)</option>
                <option value="daily">Daily</option>
              </select>
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

          {/* Weekday Customization for Weekly & Bi-weekly */}
          {(recurrence === 'weekly' || recurrence === 'biweekly') && (
            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-secondary)]">
                  Repeat on specific day of week
                </span>
                <span className="font-semibold text-purple-400">
                  Every {WEEKDAYS.find(w => w.value === recurrenceDayOfWeek)?.label}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map(w => {
                  const isSelected = recurrenceDayOfWeek === w.value;
                  return (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => setRecurrenceDayOfWeek(w.value)}
                      className={`py-1.5 text-xs font-semibold rounded-lg text-center transition-all ${
                        isSelected
                          ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                          : 'border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                      title={w.label}
                    >
                      {w.short}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Expense will repeat {recurrence === 'weekly' ? 'every week' : 'every two weeks'} on <strong className="text-[var(--text-primary)]">{WEEKDAYS.find(w => w.value === recurrenceDayOfWeek)?.label}</strong>.
              </p>
            </div>
          )}

          {/* Day of Month Customization for Monthly */}
          {recurrence === 'monthly' && (
            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-secondary)]">
                  Day of the month
                </span>
                <span className="font-semibold text-purple-400">
                  {getOrdinalSuffix(recurrenceDayOfMonth)} day of every month
                </span>
              </div>
              <select
                value={recurrenceDayOfMonth}
                onChange={(e) => setRecurrenceDayOfMonth(parseInt(e.target.value))}
                className="apple-input text-xs"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(dayNum => (
                  <option key={dayNum} value={dayNum}>
                    {getOrdinalSuffix(dayNum)} day of every month
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Expense will repeat on the <strong className="text-[var(--text-primary)]">{getOrdinalSuffix(recurrenceDayOfMonth)}</strong> day of every month.
              </p>
            </div>
          )}

          {/* Banners / Groups Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-purple-400" />
                Banners / Groups (Optional)
              </label>
              {onManageBanners && (
                <button
                  type="button"
                  onClick={onManageBanners}
                  className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Manage Banners
                </button>
              )}
            </div>

            {banners.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                {banners.map(b => {
                  const isSelected = selectedBannerIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBanner(b.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'text-white shadow-sm ring-1 ring-white/30'
                          : 'border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                      style={isSelected ? { backgroundColor: b.color } : {}}
                    >
                      <span 
                        className={`w-2 h-2 rounded-full inline-block ${isSelected ? 'bg-white' : ''}`}
                        style={!isSelected ? { backgroundColor: b.color } : {}}
                      />
                      <span>{b.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
                <span>No banners created yet.</span>
                {onManageBanners && (
                  <button
                    type="button"
                    onClick={onManageBanners}
                    className="text-[var(--accent)] hover:underline font-medium"
                  >
                    + Create Banner
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Additional Notes (Optional)
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
                className="apple-input apple-input-with-icon pl-9 text-xs"
              />
            </div>
            </div>
          </div>

          {/* Footer Action Buttons (pinned at bottom) */}
          <div className="flex items-center justify-end gap-2 p-4 px-5 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]/80 backdrop-blur-md shrink-0">
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
