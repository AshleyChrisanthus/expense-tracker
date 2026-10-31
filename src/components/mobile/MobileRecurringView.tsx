import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  CalendarClock, 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Check, 
  Plus, 
  Edit3, 
  Landmark, 
  CreditCard, 
  Banknote, 
  Wallet, 
  Coins, 
  Smartphone, 
  Sparkles
} from 'lucide-react';
import type { Transaction, PaymentMode } from '../../types/expense';
import { 
  WEEKDAYS, 
  hasEmbeddedAmountTemplate, 
  extractDescriptionTemplate, 
  formatTemplatedDescription, 
  formatFrequencyBadge, 
  formatDueCountdown 
} from '../../utils/recurrence';

export { formatFrequencyBadge, formatDueCountdown };

export type RecurringFilterTab = 'all' | 'bills' | 'income' | 'templates';

export interface RecurringItemData {
  item: Transaction;
  effectiveDueDate: string;
  dueInfo: {
    diffDays: number;
    isOverdue: boolean;
    isDueToday: boolean;
    isDueSoon: boolean;
    formattedDueDate: string;
  } | null;
  latestPayment?: { date: string; amount: number; description: string };
}

export interface MobileRecurringViewProps {
  recurringItems: RecurringItemData[];
  paymentModes: PaymentMode[];
  customAmounts?: Record<string, string>;
  onUpdateCustomAmount?: (id: string, amount: string) => void;
  onPayRecurring: (
    tx: Transaction,
    currentEffectiveDueDate?: string,
    logDateMode?: 'today' | 'due',
    overrideAmountStr?: string
  ) => void;
  onEditRecurring: (tx: Transaction) => void;
  onAddNewRecurring: () => void;
}

export const MobileRecurringView: React.FC<MobileRecurringViewProps> = ({
  recurringItems,
  paymentModes,
  customAmounts = {},
  onUpdateCustomAmount,
  onPayRecurring,
  onEditRecurring,
  onAddNewRecurring
}) => {
  const [activeFilter, setActiveFilter] = useState<RecurringFilterTab>('all');
  const [localAmounts, setLocalAmounts] = useState<Record<string, string>>({});

  // Helper to get payment mode details
  const getPaymentMode = (id: string) => {
    return paymentModes.find(m => m.id === id);
  };

  const renderModeIcon = (iconName?: string, sizeClass = "w-3.5 h-3.5") => {
    switch (iconName) {
      case 'landmark': return <Landmark className={sizeClass} />;
      case 'credit-card': return <CreditCard className={sizeClass} />;
      case 'banknote': return <Banknote className={sizeClass} />;
      case 'wallet': return <Wallet className={sizeClass} />;
      case 'coins': return <Coins className={sizeClass} />;
      case 'smartphone': return <Smartphone className={sizeClass} />;
      default: return <CreditCard className={sizeClass} />;
    }
  };

  // Scheduled Outflow & Inflow metrics
  const { scheduledOutflow, scheduledInflow, pendingCount } = useMemo(() => {
    let outflow = 0;
    let inflow = 0;
    let pending = 0;

    recurringItems.forEach(({ item }) => {
      if (item.status === 'cancelled') return;
      if (item.recurrence === 'as_needed') return; // Flexible on-demand templates are excluded from fixed scheduled sum

      const typedStr = customAmounts[item.id] ?? localAmounts[item.id];
      const parsedTyped = typedStr ? parseFloat(typedStr) : NaN;
      const effectiveAmount = !isNaN(parsedTyped) && parsedTyped > 0 ? parsedTyped : item.amount;

      pending++;

      if (item.type === 'expense') {
        outflow += effectiveAmount;
      } else if (item.type === 'income') {
        inflow += effectiveAmount;
      }
    });

    return {
      scheduledOutflow: outflow,
      scheduledInflow: inflow,
      pendingCount: pending
    };
  }, [recurringItems, customAmounts, localAmounts]);

  // Filter tabs counts
  const filterCounts = useMemo(() => {
    const all = recurringItems.length;
    const bills = recurringItems.filter(r => r.item.type === 'expense' && r.item.recurrence !== 'as_needed').length;
    const income = recurringItems.filter(r => r.item.type === 'income').length;
    const templates = recurringItems.filter(r => r.item.recurrence === 'as_needed').length;

    return { all, bills, income, templates };
  }, [recurringItems]);

  // Filtered recurring items
  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case 'bills':
        return recurringItems.filter(r => r.item.type === 'expense' && r.item.recurrence !== 'as_needed');
      case 'income':
        return recurringItems.filter(r => r.item.type === 'income');
      case 'templates':
        return recurringItems.filter(r => r.item.recurrence === 'as_needed');
      case 'all':
      default:
        return recurringItems;
    }
  }, [recurringItems, activeFilter]);

  const handleAmountChange = (id: string, value: string) => {
    setLocalAmounts(prev => ({ ...prev, [id]: value }));
    if (onUpdateCustomAmount) {
      onUpdateCustomAmount(id, value);
    }
  };

  const getCardCurrentAmount = (item: Transaction, fallbackAmount: number) => {
    const custom = customAmounts[item.id] ?? localAmounts[item.id];
    if (custom !== undefined && custom !== '') {
      return custom;
    }
    return fallbackAmount > 0 ? fallbackAmount.toFixed(2) : item.amount.toFixed(2);
  };

  return (
    <div className="space-y-4 pb-28 sm:pb-12 animate-in fade-in duration-200">
      
      {/* 1. Recurring & Due Dates Hero Card */}
      <section className="apple-card p-4 sm:p-5 bg-gradient-to-br from-[var(--bg-secondary)] via-purple-950/20 to-[var(--bg-secondary)] border-purple-500/30 shadow-lg relative overflow-hidden">
        
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 relative z-10 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-xs shrink-0 mt-0.5">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
                  Recurring &amp; Due Dates
                </h2>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  {pendingCount} Pending
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Upcoming scheduled bills, rent, casual income &amp; flexible smart templates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAddNewRecurring}
            className="apple-btn apple-btn-secondary text-xs flex items-center gap-1 font-semibold text-[var(--accent)] shrink-0 py-1.5 px-2.5"
            title="Create new recurring schedule or template"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">New Schedule</span>
          </button>
        </div>

        {/* 2-Column Summary Sub-Cards */}
        <div className="grid grid-cols-2 gap-3 relative z-10 pt-1">
          
          {/* Scheduled Outflow (Coral / Red) */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)]/80 backdrop-blur-md border border-rose-500/20 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-400/90 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4 text-rose-400 stroke-[2.5]" />
                Scheduled Outflow
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-rose-400">
              ${scheduledOutflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {filterCounts.bills} scheduled bills
            </div>
          </div>

          {/* Scheduled Inflow (Emerald Green) */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)]/80 backdrop-blur-md border border-emerald-500/20 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400/90 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                Scheduled Inflow
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-emerald-400">
              +${scheduledInflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {filterCounts.income} scheduled deposit{filterCounts.income !== 1 ? 's' : ''}
            </div>
          </div>

        </div>
      </section>

      {/* 2. Recurring Filter Pills (Horizontally Scrollable) */}
      <section className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar" aria-label="Recurring categories filter">
        
        {/* Pill 1: All */}
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
            activeFilter === 'all'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold shadow-xs'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>All</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeFilter === 'all' ? 'bg-sky-500/30 text-white' : 'bg-[var(--border-light)] text-[var(--text-secondary)]'
          }`}>
            {filterCounts.all}
          </span>
        </button>

        {/* Pill 2: Rent & Bills */}
        <button
          type="button"
          onClick={() => setActiveFilter('bills')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
            activeFilter === 'bills'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold shadow-xs'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>Rent &amp; Bills</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeFilter === 'bills' ? 'bg-sky-500/30 text-white' : 'bg-[var(--border-light)] text-[var(--text-secondary)]'
          }`}>
            {filterCounts.bills}
          </span>
        </button>

        {/* Pill 3: Income */}
        <button
          type="button"
          onClick={() => setActiveFilter('income')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
            activeFilter === 'income'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold shadow-xs'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>Income</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeFilter === 'income' ? 'bg-sky-500/30 text-white' : 'bg-[var(--border-light)] text-[var(--text-secondary)]'
          }`}>
            {filterCounts.income}
          </span>
        </button>

        {/* Pill 4: Templates */}
        <button
          type="button"
          onClick={() => setActiveFilter('templates')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
            activeFilter === 'templates'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold shadow-xs'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>Templates</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeFilter === 'templates' ? 'bg-sky-500/30 text-white' : 'bg-[var(--border-light)] text-[var(--text-secondary)]'
          }`}>
            {filterCounts.templates}
          </span>
        </button>

      </section>

      {/* 3. Recurring Cards Feed */}
      {filteredItems.length === 0 ? (
        <div className="apple-card p-8 text-center space-y-3 border-dashed border-[var(--border-light)]">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              No {activeFilter === 'all' ? 'recurring items' : activeFilter === 'bills' ? 'bills' : activeFilter === 'income' ? 'income schedules' : 'smart templates'} found
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto mt-1">
              Add recurring rent, subscriptions, weekly casual salary or smart payment templates to manage scheduled finances with ease.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddNewRecurring}
            className="apple-btn apple-btn-primary text-xs mx-auto mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Recurring Item</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredItems.map(({ item, effectiveDueDate, dueInfo, latestPayment }) => {
            const isAsNeeded = item.recurrence === 'as_needed';
            const isIncome = item.type === 'income';
            const activeTemplate = item.descriptionTemplate || (hasEmbeddedAmountTemplate(item.description) ? extractDescriptionTemplate(item.description) : undefined);
            const isVariable = Boolean(item.isVariableAmount || isAsNeeded || activeTemplate);

            const fallbackAmt = latestPayment?.amount ?? item.amount;
            const currentAmountStr = getCardCurrentAmount(item, fallbackAmt);

            // Interpolate {amount} in description if templated
            const displayDescription = activeTemplate
              ? formatTemplatedDescription(activeTemplate, currentAmountStr, fallbackAmt)
              : item.description;

            const mode = getPaymentMode(item.paymentModeId);
            const dueCountdown = formatDueCountdown(dueInfo);
            const freqBadge = formatFrequencyBadge(item.recurrence, item.recurrenceDayOfWeek, item.recurrenceDayOfMonth);

            // =========================================================================
            // CARD VARIANT C: As-Needed / Flexible Smart Template Card
            // =========================================================================
            if (isAsNeeded) {
              const isRemittance = /remittance|amma|family|overseas|transfer|wire/i.test(item.description);
              const subtitle = item.notes || (isRemittance ? 'Family remittance template' : 'Flexible smart template');
              const actionLabel = isRemittance ? '➢ Log Remittance Today' : '➢ Log Template Payment Today';

              return (
                <div 
                  key={item.id}
                  className="apple-card p-4 bg-gradient-to-br from-[var(--bg-secondary)] to-amber-950/15 border-amber-500/25 hover:border-amber-500/40 transition-all shadow-sm space-y-3"
                >
                  {/* Header: Title + As Needed (Flexible) Badge + Edit button */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                        {displayDescription}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          As Needed (Flexible)
                        </span>
                        <button
                          type="button"
                          onClick={() => onEditRecurring(item)}
                          className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                          title="Edit recurring template"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {subtitle}
                    </p>
                  </div>

                  {/* Inline Editable Amount Input Box */}
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--bg-primary)]/80 border border-amber-500/20">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm font-bold font-mono text-amber-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={localAmounts[item.id] ?? customAmounts[item.id] ?? (fallbackAmt > 0 ? fallbackAmt.toFixed(2) : '')}
                        onChange={(e) => handleAmountChange(item.id, e.target.value)}
                        placeholder={fallbackAmt.toFixed(2)}
                        aria-label={`Enter amount for ${item.description}`}
                        className="apple-input py-1 px-2 text-sm font-mono font-bold w-full max-w-[140px] text-amber-400 border-amber-500/30 focus:border-amber-400 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] font-medium shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Quick Adjust</span>
                    </div>
                  </div>

                  {/* History Metadata & Account Label */}
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-0.5">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
                      <span>
                        Last: ${latestPayment ? latestPayment.amount.toFixed(2) : item.amount.toFixed(2)} ({latestPayment?.date || item.date})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-light)] font-medium">
                      {renderModeIcon(mode?.icon)}
                      <span>{mode?.name || 'Forex / Wire'}</span>
                    </div>
                  </div>

                  {/* Full-Width Action Button */}
                  <button
                    type="button"
                    onClick={() => onPayRecurring(item, '', 'today', currentAmountStr)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>{actionLabel}</span>
                  </button>
                </div>
              );
            }

            // =========================================================================
            // CARD VARIANT B: Variable / Editable Income Card
            // =========================================================================
            if (isIncome) {
              const scheduleDayLabel = item.recurrenceDayOfWeek !== undefined && WEEKDAYS[item.recurrenceDayOfWeek]
                ? `${WEEKDAYS[item.recurrenceDayOfWeek].label}s`
                : freqBadge;

              const subtitle = item.notes || (activeTemplate ? 'Auto populates to salary ledger' : 'Variable casual income schedule');

              return (
                <div 
                  key={item.id}
                  className="apple-card p-4 bg-gradient-to-br from-[var(--bg-secondary)] to-emerald-950/15 border-emerald-500/25 hover:border-emerald-500/40 transition-all shadow-sm space-y-3"
                >
                  {/* Header: Title + Income Green Pill + Wednesdays Schedule Pill + Edit */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                        {displayDescription}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Income
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-light)]">
                          {scheduleDayLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => onEditRecurring(item)}
                          className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                          title="Edit recurring income schedule"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {subtitle}
                    </p>
                  </div>

                  {/* Inline Editable Amount Box */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--bg-primary)]/80 border border-emerald-500/20">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-sm font-bold font-mono text-emerald-400">+$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={localAmounts[item.id] ?? customAmounts[item.id] ?? (fallbackAmt > 0 ? fallbackAmt.toFixed(2) : '')}
                        onChange={(e) => handleAmountChange(item.id, e.target.value)}
                        placeholder={fallbackAmt.toFixed(2)}
                        aria-label={`Enter amount for ${item.description}`}
                        className="apple-input py-1 px-2 text-sm font-mono font-bold w-full max-w-[140px] text-emerald-400 border-emerald-500/30 focus:border-emerald-400 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium shrink-0">
                      <Edit3 className="w-3 h-3" />
                      <span>Adjust Variable</span>
                    </div>
                  </div>

                  {/* Due Date & Destination Account Row */}
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-0.5">
                    {dueCountdown ? (
                      <div className={`flex items-center gap-1 text-[11px] font-medium ${
                        dueCountdown.status === 'today' ? 'text-amber-400' :
                        dueCountdown.status === 'overdue' ? 'text-rose-400' :
                        'text-sky-400'
                      }`}>
                        <Clock className="w-3 h-3" />
                        <span>{dueCountdown.text}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--text-secondary)]">Schedule Active</span>
                    )}

                    <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-light)] font-medium">
                      {renderModeIcon(mode?.icon)}
                      <span>{mode?.name || 'NAB Payroll Vault'}</span>
                    </div>
                  </div>

                  {/* Dual Action Bar */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-light)]/60">
                    {!dueInfo?.isDueToday && (
                      <button
                        type="button"
                        onClick={() => onPayRecurring(item, effectiveDueDate, 'due', currentAmountStr)}
                        className="apple-btn apple-btn-secondary text-xs flex-1 py-2 flex items-center justify-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title={`Log income on scheduled due date (${dueInfo?.formattedDueDate || effectiveDueDate})`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Log on Due Date</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onPayRecurring(item, effectiveDueDate, 'today', currentAmountStr)}
                      className="apple-btn bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs flex-1 py-2 flex items-center justify-center gap-1 shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
                      title="Log income today with entered amount"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Log Today</span>
                    </button>
                  </div>
                </div>
              );
            }

            // =========================================================================
            // CARD VARIANT A: Standard Fixed Bill Card (e.g. Rent, Mobile, Insurance)
            // =========================================================================
            return (
              <div 
                key={item.id}
                className="apple-card p-4 bg-[var(--bg-secondary)] border-[var(--border-light)] hover:border-purple-500/35 transition-all shadow-sm space-y-3"
              >
                {/* Header: Title + Frequency Badge (Weekly • Sun, Monthly • 2nd, etc.) */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                    {displayDescription}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                      {freqBadge}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditRecurring(item)}
                      className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                      title="Edit recurring bill"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Due Indicator: Clock Icon + Relative Countdown and Date */}
                {dueCountdown && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                      dueCountdown.status === 'today'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : dueCountdown.status === 'overdue'
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    }`}>
                      {dueCountdown.text}
                    </span>
                  </div>
                )}

                {/* Amount & Account Row: Bold Coral Amount on Left, Payment Mode Pill on Right */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  {isVariable ? (
                    <div className="flex items-center gap-1">
                      <span className="text-base font-bold font-mono text-rose-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={localAmounts[item.id] ?? customAmounts[item.id] ?? (fallbackAmt > 0 ? fallbackAmt.toFixed(2) : '')}
                        onChange={(e) => handleAmountChange(item.id, e.target.value)}
                        placeholder={fallbackAmt.toFixed(2)}
                        aria-label={`Enter amount for ${item.description}`}
                        className="apple-input py-1 px-2 text-sm font-mono font-bold w-24 text-rose-400 border-rose-500/30 focus:border-rose-400 bg-[var(--bg-primary)]"
                      />
                      <span className="text-xs font-semibold text-rose-400/80 font-mono">AUD</span>
                    </div>
                  ) : (
                    <div className="text-base font-bold font-mono text-rose-400 tracking-tight">
                      ${item.amount.toFixed(2)} <span className="text-xs font-semibold text-rose-400/80">AUD</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] font-medium text-[var(--text-primary)]">
                    {renderModeIcon(mode?.icon)}
                    <span>{mode?.name || 'ANZ Main'}</span>
                  </div>
                </div>

                {/* Dual Action Bar */}
                <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-light)]/60">
                  {!dueInfo?.isDueToday && (
                    <button
                      type="button"
                      onClick={() => onPayRecurring(item, effectiveDueDate, 'due', currentAmountStr)}
                      className="apple-btn apple-btn-secondary text-xs flex-1 py-2 flex items-center justify-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      title={`Log bill on scheduled due date (${dueInfo?.formattedDueDate || effectiveDueDate})`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Log on Due Date</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onPayRecurring(item, effectiveDueDate, 'today', currentAmountStr)}
                    className="apple-btn apple-btn-primary text-xs flex-1 py-2 flex items-center justify-center gap-1 font-semibold shadow-md shadow-[var(--accent)]/30 transition-all cursor-pointer"
                    title="Log bill today"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Log Today</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
