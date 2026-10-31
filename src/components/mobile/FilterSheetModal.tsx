import React from 'react';
import { X, SlidersHorizontal, RotateCcw, Check } from 'lucide-react';
import type { PaymentMode } from '../../types/expense';

interface FilterSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Available options
  availableMonths: string[];
  categories: string[];
  paymentModes: PaymentMode[];
  // Selected values
  selectedMonthFilter: string;
  onSelectMonth: (month: string) => void;
  selectedCategoryFilter: string;
  onSelectCategory: (category: string) => void;
  selectedTypeFilter: string;
  onSelectType: (type: string) => void;
  selectedModeFilter: string;
  onSelectMode: (modeId: string) => void;
  onResetFilters: () => void;
}

export const FilterSheetModal: React.FC<FilterSheetModalProps> = ({
  isOpen,
  onClose,
  availableMonths,
  categories,
  paymentModes,
  selectedMonthFilter,
  onSelectMonth,
  selectedCategoryFilter,
  onSelectCategory,
  selectedTypeFilter,
  onSelectType,
  selectedModeFilter,
  onSelectMode,
  onResetFilters
}) => {
  if (!isOpen) return null;

  const hasActiveFilters =
    selectedMonthFilter !== 'all' ||
    selectedCategoryFilter !== 'all' ||
    selectedTypeFilter !== 'all' ||
    selectedModeFilter !== 'all';

  const typeOptions = [
    { id: 'all', label: 'All Types' },
    { id: 'expense', label: 'Expenses Only' },
    { id: 'transfer', label: 'Transfers Only' },
    { id: 'income', label: 'Income Only' },
    { id: 'recurring', label: 'Recurring Only' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div
        className="w-full sm:max-w-md max-h-[88vh] rounded-t-3xl sm:rounded-2xl glass-modal border border-[var(--border-light)] p-5 space-y-5 overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Filter Transactions"
      >
        {/* Sheet Grab Handle on mobile */}
        <div className="w-12 h-1.5 rounded-full bg-[var(--text-tertiary)]/40 mx-auto -mt-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--accent-bg)] text-[var(--accent)]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Filter Transactions
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Close filter drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Sections */}
        <div className="space-y-4 flex-1">
          {/* 1. Transaction Type */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Transaction Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {typeOptions.map((opt) => {
                const isSelected = selectedTypeFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectType(opt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Payment Account */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Payment Account
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onSelectMode('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedModeFilter === 'all'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]/30'
                }`}
              >
                All Accounts
              </button>
              {paymentModes.map((mode) => {
                const isSelected = selectedModeFilter === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onSelectMode(isSelected ? 'all' : mode.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'shadow-sm ring-1 ring-white/30 text-white'
                        : 'bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]/30'
                    }`}
                    style={isSelected ? { backgroundColor: mode.color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: isSelected ? '#ffffff' : mode.color }}
                    />
                    <span>{mode.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Category */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Category
            </label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => onSelectCategory(e.target.value)}
              className="apple-input text-xs w-full"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Month */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Month / Date Period
            </label>
            <select
              value={selectedMonthFilter}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="apple-input text-xs w-full"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border-light)]">
          <button
            type="button"
            onClick={onResetFilters}
            disabled={!hasActiveFilters}
            className={`apple-btn apple-btn-secondary text-xs flex items-center gap-1.5 ${
              !hasActiveFilters ? 'opacity-40 cursor-not-allowed' : 'text-rose-400'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="apple-btn apple-btn-primary text-xs flex items-center gap-1.5 flex-1 justify-center"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
};
