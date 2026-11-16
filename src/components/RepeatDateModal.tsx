import React, { useEffect, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Transaction } from '../types/expense';

interface RepeatDateModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  todayStr: string;
  onClose: () => void;
  onConfirm: (tx: Transaction, targetDate: string, amount: number, description: string) => void;
}

/** Shifts a YYYY-MM-DD date string by `deltaDays` using UTC to avoid DST drift. */
function shiftDateStr(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

export const RepeatDateModal: React.FC<RepeatDateModalProps> = ({
  isOpen,
  transaction,
  todayStr,
  onClose,
  onConfirm
}) => {
  const yesterdayStr = shiftDateStr(todayStr, -1);
  const twoDaysAgoStr = shiftDateStr(todayStr, -2);

  const [selectedDate, setSelectedDate] = useState<string>(yesterdayStr);
  const [amountInput, setAmountInput] = useState<string>('');
  const [descriptionInput, setDescriptionInput] = useState<string>('');

  useEffect(() => {
    if (isOpen && transaction) {
      setSelectedDate(shiftDateStr(todayStr, -1));
      setAmountInput(transaction.amount.toFixed(2));
      setDescriptionInput(transaction.description);
    }
  }, [isOpen, transaction, todayStr]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transaction) return null;

  const quickDates = [
    { label: '2 days ago', value: twoDaysAgoStr },
    { label: 'Yesterday', value: yesterdayStr },
    { label: 'Today', value: todayStr }
  ];

  const parsedAmount = parseFloat(amountInput);
  const isAmountValid = amountInput.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const trimmedDescription = descriptionInput.trim();
  const isFormValid = Boolean(selectedDate) && isAmountValid && trimmedDescription.length > 0;

  const handleStepDate = (deltaDays: number) => {
    const base = selectedDate || todayStr;
    setSelectedDate(shiftDateStr(base, deltaDays));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    onConfirm(transaction, selectedDate, parsedAmount, trimmedDescription);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="apple-card w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-scale-up border border-[var(--border-light)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="repeat-date-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-light)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="repeat-date-modal-title"
                className="text-base sm:text-lg font-semibold text-[var(--text-primary)]"
              >
                Repeat on Date
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Choose the date to log this transaction
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Transaction Preview */}
          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                {transaction.description}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {transaction.category} &middot; Originally {transaction.date}
              </div>
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)] shrink-0">
              ${transaction.amount.toFixed(2)}
            </div>
          </div>

          {/* Quick-Pick Date Pills */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--text-secondary)] block">
              Quick Select
            </span>
            <div className="grid grid-cols-3 gap-2">
              {quickDates.map((item) => {
                const isActive = selectedDate === item.value;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSelectedDate(item.value)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="repeat-target-description"
              className="text-xs font-medium text-[var(--text-secondary)] block"
            >
              Description
            </label>
            <input
              id="repeat-target-description"
              type="text"
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/60"
            />
          </div>

          {/* Target Date Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="repeat-target-date"
              className="text-xs font-medium text-[var(--text-secondary)] block"
            >
              Target Date
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStepDate(-1)}
                className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-purple-500/40 transition-colors cursor-pointer shrink-0"
                title="Previous day"
                aria-label="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                id="repeat-target-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/60"
              />
              <button
                type="button"
                onClick={() => handleStepDate(1)}
                className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-purple-500/40 transition-colors cursor-pointer shrink-0"
                title="Next day"
                aria-label="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="repeat-target-amount"
              className="text-xs font-medium text-[var(--text-secondary)] block"
            >
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)] pointer-events-none">
                $
              </span>
              <input
                id="repeat-target-amount"
                type="number"
                step="0.01"
                min="0"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                required
                className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/60"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors cursor-pointer"
            >
              Repeat for {selectedDate || '...'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
