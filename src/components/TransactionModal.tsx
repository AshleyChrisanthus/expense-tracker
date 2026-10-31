import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  ArrowLeft,
  ArrowRightLeft, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  Repeat,
  Sparkles,
  Check,
  ChevronDown,
  Save
} from 'lucide-react';
import { Transaction, TransactionType, PaymentMode, RecurrenceRule, Banner } from '../types/expense';
import { 
  calculateInitialDueDate, 
  WEEKDAYS, 
  getOrdinalSuffix,
  hasEmbeddedAmountTemplate,
  extractDescriptionTemplate,
  extractAmountFromDescription,
  formatTemplatedDescription
} from '../utils/recurrence';
import {
  PRIMARY_STITCH_CATEGORIES,
  getCategoryIcon,
  resolveCategoryName,
  getModeEmoji,
  applyAmountIncrement,
  roundAmountToWhole,
  computeAccountBalances,
  formatCurrencyBalance,
  formatDateDisplay,
  parseKeepSnippet
} from '../utils/transactionSheet';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  modes: PaymentMode[];
  categories: string[];
  banners?: Banner[];
  transactions?: Transaction[];
  initialTransaction?: Transaction | null;
  onManageCategories?: () => void;
  onManageBanners?: () => void;
  onManageModes?: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  modes,
  categories,
  banners = [],
  transactions = [],
  initialTransaction,
  onManageCategories,
  onManageBanners,
  onManageModes
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
  const [isVariableAmount, setIsVariableAmount] = useState<boolean>(false);
  const [descriptionTemplate, setDescriptionTemplate] = useState<string>('');
  const [selectedBannerIds, setSelectedBannerIds] = useState<string[]>([]);

  // UI state for Stitch sheet
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const [isKeepDrawerOpen, setIsKeepDrawerOpen] = useState(false);
  const [keepSnippetInput, setKeepSnippetInput] = useState('');
  const [keepParsedNotice, setKeepParsedNotice] = useState<string | null>(null);
  const [isRecurrencePickerOpen, setIsRecurrencePickerOpen] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Compute live account balances across modes
  const accountBalances = useMemo(() => {
    return computeAccountBalances(modes, transactions);
  }, [modes, transactions]);

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toString());
      setDate(initialTransaction.date);
      setPaymentModeId(initialTransaction.paymentModeId);
      setToPaymentModeId(initialTransaction.toPaymentModeId || modes[1]?.id || modes[0]?.id || 'forex');
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
      const inferredTemplate = initialTransaction.descriptionTemplate || extractDescriptionTemplate(initialTransaction.description) || '';
      setDescriptionTemplate(inferredTemplate);
      setIsVariableAmount(
        Boolean(initialTransaction.isVariableAmount) ||
        initialTransaction.recurrence === 'as_needed' ||
        Boolean(inferredTemplate)
      );

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
      setCategory(categories.find(c => c.toLowerCase().includes('rent')) || categories[0] || 'Rent & Housing');
      setCustomCategory('');
      setDescription('');
      setNotes('');
      setStatus('completed');
      setRecurrence('none');
      setIsVariableAmount(false);
      setDescriptionTemplate('');
      setSelectedBannerIds([]);
      
      const now = new Date();
      setRecurrenceDayOfWeek(now.getDay());
      setRecurrenceDayOfMonth(now.getDate());
    }
    setIsAllCategoriesOpen(false);
    setIsKeepDrawerOpen(false);
    setKeepParsedNotice(null);
    setIsRecurrencePickerOpen(false);
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

  // Sync amount -> templated description when amount changes
  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount);
    const activeTemplate = descriptionTemplate || (hasEmbeddedAmountTemplate(description) ? extractDescriptionTemplate(description) : undefined);
    if (activeTemplate) {
      if (!descriptionTemplate) {
        setDescriptionTemplate(activeTemplate);
      }
      setDescription(formatTemplatedDescription(activeTemplate, newAmount));
    }
  };

  // Quick increment buttons (+5, +10, +50, +100)
  const handleQuickIncrement = (delta: number) => {
    const updated = applyAmountIncrement(amount, delta);
    handleAmountChange(updated);
  };

  // Round .00 button
  const handleRoundToWhole = () => {
    const updated = roundAmountToWhole(amount);
    handleAmountChange(updated);
  };

  // Sync description -> amount & template when description contains embedded $ figure or {amount}
  const handleDescriptionChange = (newDesc: string) => {
    setDescription(newDesc);
    if (newDesc.includes('{amount}')) {
      setDescriptionTemplate(newDesc);
      setIsVariableAmount(true);
    } else if (hasEmbeddedAmountTemplate(newDesc)) {
      const tpl = extractDescriptionTemplate(newDesc);
      if (tpl) setDescriptionTemplate(tpl);
      const extractedAmt = extractAmountFromDescription(newDesc);
      if (extractedAmt !== null) {
        setAmount(extractedAmt);
      }
    } else {
      setDescriptionTemplate('');
    }
  };

  // Select a category from 2x4 grid
  const handleSelectStitchCategory = (stitchCatName: string) => {
    const resolved = resolveCategoryName(stitchCatName, categories);
    setCategory(resolved);
    setCustomCategory('');
  };

  // Check if a 2x4 stitch tile matches current category
  const isStitchCategoryActive = (stitchCatName: string) => {
    const cleanCurrent = category.toLowerCase();
    const cleanStitch = stitchCatName.toLowerCase();
    if (cleanCurrent === cleanStitch) return true;
    const def = PRIMARY_STITCH_CATEGORIES.find(p => p.name.toLowerCase() === cleanStitch);
    if (def && def.aliases.some(a => cleanCurrent.includes(a) || a.includes(cleanCurrent))) {
      return true;
    }
    return false;
  };

  // Apply parsed keep transaction
  const applyParsedKeep = (parsed: Partial<Transaction>) => {
    if (parsed.amount !== undefined) {
      handleAmountChange(parsed.amount.toString());
    }
    if (parsed.type) {
      setType(parsed.type);
    }
    if (parsed.paymentModeId) {
      setPaymentModeId(parsed.paymentModeId);
    }
    if (parsed.toPaymentModeId) {
      setToPaymentModeId(parsed.toPaymentModeId);
    }
    if (parsed.fee !== undefined) {
      setFee(parsed.fee.toString());
    }
    if (parsed.description) {
      setDescription(parsed.description);
    }
    if (parsed.date) {
      handleDateChange(parsed.date);
    }
    if (parsed.category) {
      const matched = categories.find(c => c.toLowerCase() === parsed.category!.toLowerCase());
      if (matched) {
        setCategory(matched);
        setCustomCategory('');
      } else {
        setCategory(parsed.category);
      }
    }
    setKeepParsedNotice(`✓ Parsed from Keep: $${parsed.amount ?? ''} • ${parsed.description || ''}`);
    setIsKeepDrawerOpen(false);
    setKeepSnippetInput('');
    setTimeout(() => setKeepParsedNotice(null), 4000);
  };

  // Inline Keep Quick-Parse action
  const handleQuickKeepParse = async () => {
    // 1. If description contains Keep format, parse directly from description
    const descText = description.trim();
    if (descText && (descText.includes('$') || descText.toLowerCase().includes('from') || descText.toLowerCase().includes('put') || descText.toLowerCase().includes('transfer'))) {
      const parsed = parseKeepSnippet(descText, modes);
      if (parsed) {
        applyParsedKeep(parsed);
        return;
      }
    }

    // 2. Try clipboard if available
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          const parsed = parseKeepSnippet(clipText, modes);
          if (parsed) {
            applyParsedKeep(parsed);
            return;
          }
        }
      }
    } catch {
      // Clipboard denied or unavailable
    }

    // 3. Fallback: open inline Keep snippet input drawer
    setIsKeepDrawerOpen(true);
  };

  const handleApplyKeepDrawer = () => {
    if (!keepSnippetInput.trim()) return;
    const parsed = parseKeepSnippet(keepSnippetInput, modes);
    if (parsed) {
      applyParsedKeep(parsed);
    } else {
      setKeepParsedNotice('Could not parse Google Keep format. Try: 59.87$ - from bank - OVHC (Bupa Insurance)');
      setTimeout(() => setKeepParsedNotice(null), 4500);
    }
  };

  const applyPresetTemplate = (preset: 'weekly_salary' | 'on_demand_expense') => {
    if (preset === 'weekly_salary') {
      const tpl = 'paid {amount}$ weekly salary to bank account';
      setType('income');
      setPaymentModeId('bank');
      setCategory(categories.includes('Income') ? 'Income' : categories[0] || 'Income');
      setRecurrence('weekly');
      setRecurrenceDayOfWeek(3); // Wednesday
      setIsVariableAmount(true);
      setDescriptionTemplate(tpl);
      setDescription(formatTemplatedDescription(tpl, amount));
    } else if (preset === 'on_demand_expense') {
      setType('expense');
      setPaymentModeId('bank');
      setCategory(categories.includes('Other') ? 'Other' : categories[0] || 'Other');
      setRecurrence('as_needed');
      setIsVariableAmount(true);
      setDescriptionTemplate('');
      setDescription('flexible payment as needed');
    }
  };

  // Toggle recurring switch (iOS style)
  const handleToggleRecurringSwitch = () => {
    if (recurrence === 'none') {
      setRecurrence('monthly');
      setIsRecurrencePickerOpen(true);
    } else {
      setRecurrence('none');
      setIsRecurrencePickerOpen(false);
    }
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
    const isScheduledRecurrence = recurrence && recurrence !== 'none' && recurrence !== 'as_needed';

    const nextDueDate = isScheduledRecurrence
      ? (initialTransaction?.nextDueDate || calculateInitialDueDate(
          date, 
          recurrence, 
          isWeekCycle ? recurrenceDayOfWeek : undefined,
          isMonthCycle ? recurrenceDayOfMonth : undefined
        ))
      : undefined;

    const activeTemplate = descriptionTemplate || (hasEmbeddedAmountTemplate(description) ? extractDescriptionTemplate(description) : undefined);
    const resolvedDescription = activeTemplate
      ? formatTemplatedDescription(activeTemplate, amount, parsedAmount)
      : (description.trim() || (type === 'transfer' ? `Transfer to ${modes.find(m => m.id === toPaymentModeId)?.name || 'Account'}` : 'Expense'));

    const transaction: Transaction = {
      id: initialTransaction ? initialTransaction.id : 'tx-' + Date.now(),
      date,
      amount: parsedAmount,
      type,
      paymentModeId,
      toPaymentModeId: type === 'transfer' ? toPaymentModeId : undefined,
      fee: type === 'transfer' && fee ? parseFloat(fee) : undefined,
      category: finalCategory,
      description: resolvedDescription,
      notes: notes.trim() || undefined,
      status,
      recurrence: recurrence !== 'none' ? recurrence : undefined,
      recurrenceDayOfWeek: isWeekCycle ? recurrenceDayOfWeek : undefined,
      recurrenceDayOfMonth: isMonthCycle ? recurrenceDayOfMonth : undefined,
      nextDueDate,
      isVariableAmount: recurrence !== 'none' ? (isVariableAmount || recurrence === 'as_needed' || Boolean(activeTemplate)) : undefined,
      descriptionTemplate: activeTemplate || undefined,
      bannerIds: selectedBannerIds.length > 0 ? selectedBannerIds : undefined,
      createdAt: initialTransaction ? initialTransaction.createdAt : Date.now()
    };

    onSave(transaction);
    onClose();
  };

  // Amount color matching transaction type
  const amountColorClass = type === 'expense' 
    ? 'text-rose-400' 
    : type === 'income' 
    ? 'text-emerald-400' 
    : 'text-sky-400';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg max-h-[94vh] sm:max-h-[92vh] flex flex-col rounded-t-[28px] sm:rounded-2xl relative overflow-hidden shadow-2xl bg-[var(--modal-bg)] border-t sm:border border-[var(--border-light)] animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div 
          className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mt-2.5 mb-1 sm:hidden cursor-pointer active:bg-white/40"
          onClick={onClose}
          aria-label="Close sheet"
        />

        {/* 1. Slide-Up Sheet Top Navigation Header & Sheet Header */}
        <div className="px-5 pt-2 pb-3 border-b border-[var(--border-light)] shrink-0 space-y-2">
          {/* Top navigation row: Back arrow + Profile avatar */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>
                {initialTransaction 
                  ? 'Edit Transaction' 
                  : type === 'expense' 
                  ? 'Add Expense' 
                  : type === 'income' 
                  ? 'Add Income' 
                  : 'Add Transfer'}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <div 
                className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shadow-xs ring-1 ring-white/20"
                title="Profile"
              >
                AC
              </div>
            </div>
          </div>

          {/* Sheet title row: ⊕ Add Transaction + ✕ close button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <span className="text-[var(--accent)] font-mono text-lg">{initialTransaction ? '✏️' : '⊕'}</span>
                {initialTransaction ? 'Edit Transaction' : 'Add Transaction'}
              </span>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3-way pill segmented control */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/40'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" /> ↗ Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/40'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> ↙ Income
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'transfer'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/40'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> ⇄ Transfer
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto px-5 py-3 space-y-4 flex-1">
            
            {/* Parsed feedback notice */}
            {keepParsedNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between animate-in fade-in">
                <span>{keepParsedNotice}</span>
                <button 
                  type="button" 
                  onClick={() => setKeepParsedNotice(null)}
                  className="text-emerald-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 2. Hero Amount Input & Quick Increment Chips */}
            <div className="py-2 flex flex-col items-center justify-center text-center">
              <div className={`flex items-baseline justify-center gap-1 font-mono tracking-tight font-extrabold text-4xl sm:text-5xl ${amountColorClass}`}>
                <span className="opacity-70 text-3xl sm:text-4xl">$</span>
                <input
                  ref={amountInputRef}
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-center outline-none font-bold tracking-tight w-44 sm:w-56 placeholder-neutral-600 focus:placeholder-transparent"
                  aria-label="Transaction Amount"
                />
              </div>

              {/* Quick-add increment pill row underneath */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleQuickIncrement(5)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer active:scale-95"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickIncrement(10)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer active:scale-95"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickIncrement(50)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer active:scale-95"
                >
                  +50
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickIncrement(100)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer active:scale-95"
                >
                  +100
                </button>
                <button
                  type="button"
                  onClick={handleRoundToWhole}
                  className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] text-amber-400 hover:border-amber-400 hover:bg-amber-400/10 transition-all cursor-pointer active:scale-95"
                  title="Round to nearest whole dollar"
                >
                  Round .00
                </button>
              </div>
            </div>

            {/* 3. Description & Notes with Inline Keep Quick-Parse Button */}
            <div className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Description & Notes
                </label>
                <button
                  type="button"
                  onClick={handleQuickKeepParse}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                  title="Parse Google Keep format directly into form fields"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>🪄 Keep</span>
                </button>
              </div>

              <input
                type="text"
                required
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="OVHC (Bupa Insurance)"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent)] outline-none"
              />

              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes (optional)"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-secondary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent)] outline-none"
              />

              {/* Template shortcuts & dynamic notice */}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('weekly_salary')}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors font-medium"
                    title="Fill template: paid {amount}$ weekly salary to bank account"
                  >
                    + Weekly Salary
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('on_demand_expense')}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition-colors font-medium"
                    title="Fill template: flexible payment as needed"
                  >
                    + Flexible Template
                  </button>
                </div>
              </div>

              {(descriptionTemplate || hasEmbeddedAmountTemplate(description)) && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
                  <span>✦ Dynamic amount template active: typing Amount automatically updates Description.</span>
                </p>
              )}

              {/* Inline Keep Drawer / Fallback Modal */}
              {isKeepDrawerOpen && (
                <div className="p-3 mt-2 rounded-xl bg-[var(--bg-primary)] border border-amber-500/40 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Paste Google Keep Raw Text
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsKeepDrawerOpen(false)}
                      className="text-neutral-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={keepSnippetInput}
                    onChange={(e) => setKeepSnippetInput(e.target.value)}
                    placeholder="e.g. 59.87$ - from bank - OVHC (Bupa Insurance)&#10;or Transferred 1000$ from forex to bank(+7.5$ charge)"
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-2 text-xs text-[var(--text-primary)] placeholder-neutral-500 outline-none focus:border-amber-400"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setKeepSnippetInput('59.87$ - from bank - OVHC (Bupa Insurance)')}
                        className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                      >
                        Sample OVHC
                      </button>
                      <button
                        type="button"
                        onClick={() => setKeepSnippetInput('170$-from bank- room rent')}
                        className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                      >
                        Sample Rent
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyKeepDrawer}
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs cursor-pointer shadow-sm"
                    >
                      Parse & Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Payment Mode Horizontal Account Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {type === 'transfer' ? 'From Account' : 'Payment Mode'}
                </span>
                {onManageModes && (
                  <button
                    type="button"
                    onClick={onManageModes}
                    className="text-xs text-[var(--accent)] hover:underline font-medium cursor-pointer"
                  >
                    Manage
                  </button>
                )}
              </div>

              {/* Horizontally scrollable account cards */}
              <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-none">
                {modes.map((m) => {
                  const isSelected = paymentModeId === m.id;
                  const bal = accountBalances[m.id] ?? 0;
                  const formattedBal = formatCurrencyBalance(bal);
                  const modeEmoji = getModeEmoji(m.icon, m.name);

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentModeId(m.id)}
                      className={`relative min-w-[125px] flex-shrink-0 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-bg)] shadow-md ring-1 ring-[var(--accent)]/40'
                          : 'border-[var(--border-light)] bg-[var(--bg-secondary)] hover:border-[var(--text-secondary)]/30'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xl">{modeEmoji}</span>
                        <span 
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: m.color }}
                        />
                      </div>
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[110px]">
                        {m.name}
                      </div>
                      <div className={`text-[11px] font-mono mt-0.5 ${bal < 0 ? 'text-rose-400 font-semibold' : 'text-[var(--text-secondary)]'}`}>
                        {formattedBal}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Destination Account & Fee for Transfer Type */}
              {type === 'transfer' && (
                <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-sky-500/30 space-y-3 mt-2 animate-in fade-in">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Destination Account
                  </div>

                  <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                    {modes.map((m) => {
                      const isSelected = toPaymentModeId === m.id;
                      const bal = accountBalances[m.id] ?? 0;
                      const formattedBal = formatCurrencyBalance(bal);
                      const modeEmoji = getModeEmoji(m.icon, m.name);

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setToPaymentModeId(m.id)}
                          className={`relative min-w-[120px] flex-shrink-0 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-sky-400 bg-sky-500/15 shadow-md ring-1 ring-sky-400/40'
                              : 'border-[var(--border-light)] bg-[var(--bg-primary)] hover:border-[var(--text-secondary)]/30'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-sky-400 text-neutral-950 text-[9px] font-bold flex items-center justify-center">
                              <Check className="w-2 h-2" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-lg">{modeEmoji}</span>
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {m.name}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[var(--text-secondary)]">
                            {formattedBal}
                          </div>
                        </button>
                      );
                    })}
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
              )}
            </div>

            {/* 5. Category 2×4 Touch Icon Grid */}
            {type !== 'transfer' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Category
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAllCategoriesOpen(!isAllCategoriesOpen)}
                      className="text-xs text-[var(--accent)] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>All ({categories.length})</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAllCategoriesOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {onManageCategories && (
                      <button
                        type="button"
                        onClick={onManageCategories}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                      >
                        + Manage
                      </button>
                    )}
                  </div>
                </div>

                {/* 2×4 touch icon grid */}
                <div className="grid grid-cols-4 gap-2">
                  {PRIMARY_STITCH_CATEGORIES.map((catDef) => {
                    const isActive = isStitchCategoryActive(catDef.name);

                    return (
                      <button
                        key={catDef.id}
                        type="button"
                        onClick={() => handleSelectStitchCategory(catDef.name)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          isActive
                            ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)] shadow-md ring-1 ring-[var(--accent)]/30 font-bold scale-[1.02]'
                            : 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]/30 hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="text-2xl mb-1">{catDef.icon}</span>
                        <span className="text-[11px] font-medium leading-tight truncate max-w-full">
                          {catDef.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* All categories overflow tray */}
                {isAllCategoriesOpen && (
                  <div className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-2 animate-in fade-in">
                    <div className="text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      All Registered Categories:
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {categories.map((c) => {
                        const isSelected = category.toLowerCase() === c.toLowerCase();
                        const cIcon = getCategoryIcon(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCategory(c);
                              setCustomCategory('');
                            }}
                            className={`text-xs px-2.5 py-1 rounded-xl font-medium transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--accent)] text-white shadow-xs'
                                : 'bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <span>{cIcon}</span>
                            <span>{c}</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          setCategory('Other');
                        }}
                        className={`text-xs px-2.5 py-1 rounded-xl font-medium transition-all flex items-center gap-1 cursor-pointer ${
                          category === 'Other'
                            ? 'bg-[var(--accent)] text-white shadow-xs'
                            : 'bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span>🏷️</span>
                        <span>Custom...</span>
                      </button>
                    </div>

                    {category === 'Other' && (
                      <div className="pt-2">
                        <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                          Enter Custom Category Name:
                        </label>
                        <input
                          type="text"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          placeholder="e.g. Subscriptions, Gaming"
                          className="apple-input text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 6. Banner Tracker Tag Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Banner Tracker Tag
                  </span>
                  <span className="w-8 h-1 rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 inline-block opacity-70" title="Timeline line indicator" />
                </div>
                {onManageBanners && (
                  <button
                    type="button"
                    onClick={onManageBanners}
                    className="text-xs text-[var(--accent)] hover:underline font-medium cursor-pointer"
                  >
                    + Manage
                  </button>
                )}
              </div>

              {banners.length > 0 ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                  {banners.map(b => {
                    const isSelected = selectedBannerIds.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBanner(b.id)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                          isSelected
                            ? 'text-white shadow-md ring-1 ring-white/30'
                            : 'border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        style={isSelected ? { backgroundColor: b.color } : {}}
                      >
                        <span 
                          className={`w-2.5 h-2.5 rounded-full inline-block ${isSelected ? 'bg-white' : ''}`}
                          style={!isSelected ? { backgroundColor: b.color } : {}}
                        />
                        <span>{b.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
                  <span>No banner tags created yet.</span>
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

            {/* 7. Date & Recurrence Split Row */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Left Card: DATE */}
                <div className="relative p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] flex flex-col justify-between cursor-pointer hover:border-[var(--text-secondary)]/30 transition-all">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-sky-400" /> Date
                    </span>
                    <span className="text-[10px] text-sky-400 font-mono">⌄</span>
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    {formatDateDisplay(date)}
                  </div>
                  {/* Invisible native date picker over the card */}
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    aria-label="Pick Date"
                  />
                </div>

                {/* Right Card: RECURRING with iOS-style green toggle switch */}
                <div className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span 
                      onClick={() => setIsRecurrencePickerOpen(!isRecurrencePickerOpen)}
                      className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]"
                    >
                      <Repeat className="w-3.5 h-3.5 text-purple-400" /> Recurring
                    </span>
                    {/* iOS-style green toggle switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={recurrence !== 'none'}
                      onClick={handleToggleRecurringSwitch}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        recurrence !== 'none' ? 'bg-emerald-500' : 'bg-neutral-700/60'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          recurrence !== 'none' ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <div 
                    onClick={() => setIsRecurrencePickerOpen(!isRecurrencePickerOpen)}
                    className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between cursor-pointer"
                  >
                    <span>
                      {recurrence === 'none' ? 'Off' :
                       recurrence === 'daily' ? 'Daily' :
                       recurrence === 'weekly' ? 'Weekly' :
                       recurrence === 'biweekly' ? 'Bi-weekly' :
                       recurrence === 'monthly' ? 'Monthly' :
                       recurrence === 'yearly' ? 'Yearly' : 'As Needed'}
                    </span>
                    {recurrence !== 'none' && <span className="text-[10px] text-purple-400 font-mono">⌄</span>}
                  </div>
                </div>
              </div>

              {/* Recurrence Sub-Options Drawer */}
              {(recurrence !== 'none' || isRecurrencePickerOpen) && (
                <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-purple-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-300">
                      Recurrence Frequency Rule
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRecurrencePickerOpen(false)}
                      className="text-neutral-400 hover:text-white"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'daily', label: 'Daily' },
                      { id: 'weekly', label: 'Weekly' },
                      { id: 'biweekly', label: 'Bi-weekly' },
                      { id: 'monthly', label: 'Monthly' },
                      { id: 'yearly', label: 'Yearly' },
                      { id: 'as_needed', label: 'As Needed' }
                    ].map(rule => (
                      <button
                        key={rule.id}
                        type="button"
                        onClick={() => {
                          setRecurrence(rule.id as RecurrenceRule);
                          if (rule.id === 'as_needed') setIsVariableAmount(true);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          recurrence === rule.id
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {rule.label}
                      </button>
                    ))}
                  </div>

                  {/* Weekday selection for weekly & bi-weekly */}
                  {(recurrence === 'weekly' || recurrence === 'biweekly') && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                        Repeat on every <strong className="text-purple-300">{WEEKDAYS.find(w => w.value === recurrenceDayOfWeek)?.label}</strong>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {WEEKDAYS.map(w => (
                          <button
                            key={w.value}
                            type="button"
                            onClick={() => setRecurrenceDayOfWeek(w.value)}
                            className={`py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              recurrenceDayOfWeek === w.value
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {w.short}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Day of month selection for monthly */}
                  {recurrence === 'monthly' && (
                    <div className="space-y-1 pt-1">
                      <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                        Day of month: <strong className="text-purple-300">{getOrdinalSuffix(recurrenceDayOfMonth)}</strong>
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
                    </div>
                  )}

                  {/* Variable amount toggle */}
                  <label className="flex items-center justify-between gap-2 cursor-pointer text-xs pt-1">
                    <span className="text-[var(--text-primary)]">
                      Variable amount (enter amount on reminder)
                    </span>
                    <input
                      type="checkbox"
                      checked={isVariableAmount || recurrence === 'as_needed' || Boolean(descriptionTemplate)}
                      onChange={(e) => setIsVariableAmount(e.target.checked)}
                      className="rounded accent-purple-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>

          </div>

          {/* 8. Primary Save Action CTA */}
          <div className="p-4 px-5 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]/90 backdrop-blur-md shrink-0">
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-sky-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{initialTransaction ? 'Update Transaction' : 'Save Transaction'}</span>
            </button>
            <p className="text-[11px] text-center text-[var(--text-tertiary)] mt-2 font-medium">
              Synced to LocalStorage & Keep Notes Companion
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
