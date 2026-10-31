import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowRightLeft, 
  ShieldCheck, 
  Scale, 
  SlidersHorizontal, 
  Download, 
  Sparkles, 
  Database,
  Calendar,
  CheckCircle2,
  Landmark
} from 'lucide-react';
import type { Transaction, PaymentMode, Banner } from '../../types/expense';
import type { SyncStatus } from '../../services/sync/types';
import { 
  TimeframePeriod, 
  CustomDateRange, 
  formatMonthYear, 
  getShortMonthName, 
  getPreviousMonthStr, 
  getReferenceMonth, 
  filterTransactionsByTimeframe, 
  computeCashFlowEquilibrium, 
  computeCategoryBreakdown, 
  computeAccountDistribution, 
  extractRecentInternalTransfers 
} from '../../utils/analytics';

interface MobileAnalyticsViewProps {
  transactions: Transaction[];
  paymentModes: PaymentMode[];
  categories: string[];
  banners: Banner[];
  syncStatus?: SyncStatus;
  activeMonthFilter?: string;
  onSelectCategory?: (category: string) => void;
  onSelectMode?: (modeId: string) => void;
  onSelectBanner?: (bannerId: string) => void;
  onExportJson?: () => void;
  onOpenKeepSync?: () => void;
  onOpenCloudSync?: () => void;
}

export const MobileAnalyticsView: React.FC<MobileAnalyticsViewProps> = ({
  transactions,
  paymentModes,
  categories: _categories,
  banners,
  syncStatus,
  activeMonthFilter,
  onSelectCategory,
  onSelectMode,
  onSelectBanner: _onSelectBanner,
  onExportJson,
  onOpenKeepSync,
  onOpenCloudSync
}) => {
  // 1. Timeframe state
  const [timeframe, setTimeframe] = useState<TimeframePeriod>('this_month');
  const [customRange, setCustomRange] = useState<CustomDateRange>({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showCustomRangeInputs, setShowCustomRangeInputs] = useState(false);

  // Sorting state for category breakdown: 'amount' | 'count' | 'name'
  const [categorySortBy, setCategorySortBy] = useState<'amount' | 'count' | 'name'>('amount');

  // Interactive selected/hovered category for Donut inspection
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Reference month determination (e.g. "2026-10")
  const referenceMonth = useMemo(() => {
    return getReferenceMonth(transactions, activeMonthFilter);
  }, [transactions, activeMonthFilter]);

  const previousMonth = useMemo(() => {
    return getPreviousMonthStr(referenceMonth);
  }, [referenceMonth]);

  const thisMonthLabel = useMemo(() => formatMonthYear(referenceMonth), [referenceMonth]);
  const lastMonthLabel = useMemo(() => formatMonthYear(previousMonth), [previousMonth]);
  const prevMonthShort = useMemo(() => getShortMonthName(previousMonth), [previousMonth]);

  // Current period filtered transactions
  const currentPeriodTransactions = useMemo(() => {
    return filterTransactionsByTimeframe(transactions, timeframe, referenceMonth, customRange);
  }, [transactions, timeframe, referenceMonth, customRange]);

  // Previous period transactions for MoM comparison
  const previousPeriodTransactions = useMemo(() => {
    return filterTransactionsByTimeframe(transactions, 'last_month', referenceMonth);
  }, [transactions, referenceMonth]);

  // 2. Cash Flow Equilibrium calculations
  const equilibrium = useMemo(() => {
    return computeCashFlowEquilibrium(
      currentPeriodTransactions,
      previousPeriodTransactions,
      prevMonthShort
    );
  }, [currentPeriodTransactions, previousPeriodTransactions, prevMonthShort]);

  // 3. Category breakdown
  const categoryData = useMemo(() => {
    return computeCategoryBreakdown(
      currentPeriodTransactions,
      _categories,
      banners,
      categorySortBy
    );
  }, [currentPeriodTransactions, _categories, banners, categorySortBy]);

  // 4. Account distribution & Internal Transfers
  const accountDistribution = useMemo(() => {
    return computeAccountDistribution(paymentModes, transactions);
  }, [paymentModes, transactions]);

  const recentTransfers = useMemo(() => {
    return extractRecentInternalTransfers(transactions, paymentModes, 4);
  }, [transactions, paymentModes]);

  // Active slice for center of donut chart
  const activeCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categoryData.categories.find(c => c.id === selectedCategoryId) || null;
  }, [selectedCategoryId, categoryData.categories]);

  // Format currency helper
  const formatMoney = (val: number) => {
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Compute Last Sync text
  const lastSyncLabel = useMemo(() => {
    if (!syncStatus) return '● Local Vault';
    if (syncStatus.state === 'syncing') return '● Syncing...';
    if (syncStatus.lastSyncedAt) {
      const elapsedMin = Math.round((Date.now() - syncStatus.lastSyncedAt.getTime()) / 60000);
      if (elapsedMin < 1) return '● Just now';
      if (elapsedMin < 60) return `● ${elapsedMin}m ago`;
      const elapsedHours = Math.round(elapsedMin / 60);
      return `● ${elapsedHours}h ago`;
    }
    return syncStatus.state === 'synced' ? '● Synced' : '● Local Vault';
  }, [syncStatus]);

  // Donut SVG parameters
  const donutSize = 220;
  const strokeWidth = 26;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Donut slices geometry with rounded look
  const donutSlices = useMemo(() => {
    if (categoryData.totalSpend <= 0 || categoryData.categories.length === 0) return [];
    
    let accumulatedAngle = 0;
    const gapAngle = categoryData.categories.length > 1 ? 4 : 0; // degrees gap
    const totalGapDegrees = gapAngle * categoryData.categories.length;
    const availableDegrees = 360 - totalGapDegrees;

    return categoryData.categories.map(cat => {
      const sliceDegrees = (cat.amount / categoryData.totalSpend) * availableDegrees;
      const strokeLength = (sliceDegrees / 360) * circumference;
      const strokeDashoffset = -((accumulatedAngle / 360) * circumference);
      accumulatedAngle += sliceDegrees + gapAngle;

      return {
        ...cat,
        strokeDasharray: `${strokeLength} ${circumference - strokeLength}`,
        strokeDashoffset
      };
    });
  }, [categoryData, circumference]);

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      
      {/* =========================================================================
          1. FINANCIAL OVERVIEW TIMEFRAME SELECTOR
          ========================================================================= */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
            <span>FINANCIAL OVERVIEW</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Calcs</span>
          </div>
        </div>

        {/* Horizontally scrollable period filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs font-semibold">
          {/* Pill 1: This Month */}
          <button
            type="button"
            onClick={() => {
              setTimeframe('this_month');
              setShowCustomRangeInputs(false);
            }}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              timeframe === 'this_month'
                ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30 border border-transparent font-bold'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>This Month ({thisMonthLabel})</span>
          </button>

          {/* Pill 2: Last Month */}
          <button
            type="button"
            onClick={() => {
              setTimeframe('last_month');
              setShowCustomRangeInputs(false);
            }}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
              timeframe === 'last_month'
                ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30 border border-transparent font-bold'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>Last Month ({lastMonthLabel})</span>
          </button>

          {/* Pill 3: Custom Range */}
          <button
            type="button"
            onClick={() => {
              setTimeframe('custom');
              setShowCustomRangeInputs(prev => !prev);
            }}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              timeframe === 'custom'
                ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30 border border-transparent font-bold'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Custom Range</span>
          </button>

          {/* Pill 4: All Time */}
          <button
            type="button"
            onClick={() => {
              setTimeframe('all');
              setShowCustomRangeInputs(false);
            }}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
              timeframe === 'all'
                ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30 border border-transparent font-bold'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>All Time</span>
          </button>
        </div>

        {/* Expandable Custom Range Date Inputs */}
        {timeframe === 'custom' && showCustomRangeInputs && (
          <div className="p-3 rounded-2xl glass-panel border border-[var(--border-light)] grid grid-cols-2 gap-2 text-xs animate-in fade-in duration-150">
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-1">
                From Date
              </label>
              <input
                type="date"
                value={customRange.startDate}
                onChange={e => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-1">
                To Date
              </label>
              <input
                type="date"
                value={customRange.endDate}
                onChange={e => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          2. CASH FLOW EQUILIBRIUM CARD
          ========================================================================= */}
      <section className="apple-card p-4 space-y-4 bg-gradient-to-br from-[var(--bg-secondary)] to-indigo-950/20 border border-[var(--border-light)] rounded-3xl shadow-xl">
        {/* Card Header with MoM delta badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              Cash Flow Equilibrium
            </h3>
          </div>

          {/* Month-over-Month delta badge */}
          <div 
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              equilibrium.isPositiveDelta
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}
          >
            <span>📈 {equilibrium.momDeltaLabel}</span>
          </div>
        </div>

        {/* 2-Column Comparison Boxes */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Inflow Box */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)]/70 border border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Inflow</span>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold font-mono text-emerald-400 tracking-tight">
                +${formatMoney(equilibrium.totalInflow)}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">
                {equilibrium.inflowCount} deposits
              </p>
            </div>
          </div>

          {/* Total Outflow Box */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)]/70 border border-rose-500/20 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
              <span>Total Outflow</span>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold font-mono text-rose-400 tracking-tight">
                -${formatMoney(equilibrium.totalOutflow)}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">
                {equilibrium.outflowCount} debits
              </p>
            </div>
          </div>
        </div>

        {/* Net Retained Reserve Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">
              Net Retained Reserve
            </span>
            <span 
              className={`font-mono font-bold ${
                equilibrium.isBreakEvenHeld ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {equilibrium.netReserve >= 0 ? '+' : '-'}${formatMoney(Math.abs(equilibrium.netReserve))}{' '}
              <span className="text-[10px] font-semibold opacity-90">
                (Burn: {equilibrium.burnRate.toFixed(1)}%)
              </span>
            </span>
          </div>

          {/* Dual-segment progress bar */}
          <div className="w-full h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden flex p-0.5 border border-white/5 shadow-inner">
            {/* Outflow Burn Segment */}
            <div 
              className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-l-full transition-all duration-500"
              style={{ width: `${equilibrium.visualBurnPercent}%` }}
              title={`Burn Rate: ${equilibrium.burnRate.toFixed(1)}%`}
            />
            {/* Inflow Retained Segment */}
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-r-full transition-all duration-500"
              style={{ width: `${equilibrium.visualRetainedPercent}%` }}
              title={`Retained: ${equilibrium.visualRetainedPercent.toFixed(1)}%`}
            />
          </div>

          {/* Footer Caption */}
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className={`font-semibold flex items-center gap-1 ${
              equilibrium.isBreakEvenHeld ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{equilibrium.statusCaption}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-semibold text-indigo-300">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span>Vault Guarded</span>
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. CATEGORY BREAKDOWN CARD
          ========================================================================= */}
      <section className="apple-card p-4 space-y-4 bg-[var(--bg-secondary)]/80 border border-[var(--border-light)] rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Category Breakdown
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              High frequency & recurring buckets
            </p>
          </div>

          {/* Sort / filter icon button */}
          <button
            type="button"
            onClick={() => {
              setCategorySortBy(prev => prev === 'amount' ? 'count' : prev === 'count' ? 'name' : 'amount');
            }}
            className="w-8 h-8 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-light)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            title={`Sort categories: currently by ${categorySortBy}`}
            aria-label="Toggle Category Sort Order"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive SVG Donut Chart */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative" style={{ width: donutSize, height: donutSize }}>
            <svg
              width={donutSize}
              height={donutSize}
              viewBox={`0 0 ${donutSize} ${donutSize}`}
              className="overflow-visible transform -rotate-90"
            >
              {/* Background ring */}
              <circle
                cx={donutSize / 2}
                cy={donutSize / 2}
                r={radius}
                fill="none"
                stroke="var(--border-light)"
                strokeWidth={strokeWidth}
                className="opacity-40"
              />

              {/* Slices */}
              {donutSlices.map((slice) => {
                const isSelected = selectedCategoryId === slice.id;
                return (
                  <circle
                    key={slice.id}
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-300 cursor-pointer"
                    style={{
                      opacity: selectedCategoryId ? (isSelected ? 1 : 0.4) : 0.95,
                      filter: isSelected ? 'drop-shadow(0 0 8px rgba(255,255,255,0.35))' : 'none'
                    }}
                    onClick={() => {
                      setSelectedCategoryId(prev => prev === slice.id ? null : slice.id);
                    }}
                  />
                );
              })}
            </svg>

            {/* Center Callout Overlay */}
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3"
              style={{ width: donutSize, height: donutSize }}
            >
              {activeCategory ? (
                <div className="space-y-0.5 animate-in fade-in duration-150">
                  <div className="text-lg">{activeCategory.emoji}</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] line-clamp-1">
                    {activeCategory.name}
                  </span>
                  <div className="text-lg font-extrabold font-mono text-[var(--text-primary)]">
                    ${formatMoney(activeCategory.amount)}
                  </div>
                  <span 
                    className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${activeCategory.color}25`, color: activeCategory.color }}
                  >
                    {activeCategory.percent.toFixed(0)}% · {activeCategory.count} tx
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    TOP SPEND
                  </span>
                  <div className="text-xl font-extrabold font-mono text-[var(--text-primary)] tracking-tight">
                    ${formatMoney(categoryData.topSpendAmount || categoryData.totalSpend)}
                  </div>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30">
                    {categoryData.classifiedPercent}% Classified
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ranked Category List Cards */}
        <div className="space-y-2.5">
          {categoryData.categories.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)]/40 border border-dashed border-[var(--border-light)] text-center text-xs text-[var(--text-secondary)]">
              No expenses recorded in this period.
            </div>
          ) : (
            categoryData.categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryId(prev => prev === cat.id ? null : cat.id);
                    if (onSelectCategory) {
                      onSelectCategory(cat.name);
                    }
                  }}
                  className={`p-3 rounded-2xl transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[var(--bg-tertiary)] border-[var(--accent)] shadow-md'
                      : 'bg-[var(--bg-primary)]/70 border-[var(--border-light)] hover:border-[var(--text-secondary)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Tinted Squircle Icon + Title & Subtitle */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-lg border shadow-xs"
                        style={{ 
                          backgroundColor: `${cat.color}20`, 
                          borderColor: `${cat.color}40` 
                        }}
                      >
                        <span>{cat.emoji}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
                          {cat.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate">
                          {cat.subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Percentage */}
                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-mono font-bold text-[var(--text-primary)]">
                        ${formatMoney(cat.amount)}
                      </div>
                      <div 
                        className="text-xs font-mono font-bold"
                        style={{ color: cat.color }}
                      >
                        {cat.percent.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Proportional bottom progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden mt-2.5">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(cat.percent, 100)}%`,
                        backgroundColor: cat.color 
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* =========================================================================
          4. ACCOUNT DISTRIBUTION & INTERNAL TRANSFERS CARD
          ========================================================================= */}
      <section className="apple-card p-4 space-y-4 bg-[var(--bg-secondary)]/80 border border-[var(--border-light)] rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
              <Landmark className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Account Distribution
            </h3>
          </div>

          <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-bg)] border border-[var(--accent)]/30 text-xs font-semibold text-[var(--accent)]">
            {paymentModes.length} Accounts
          </span>
        </div>

        {/* Stacked Horizontal Percentage Bar */}
        <div className="space-y-2">
          <div className="w-full h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden flex gap-0.5 p-0.5 border border-white/5">
            {accountDistribution.accounts.map((acc) => (
              <div
                key={acc.id}
                className="h-full rounded-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${Math.max(acc.percent, 1)}%`,
                  backgroundColor: acc.color
                }}
                title={`${acc.name}: ${acc.percent.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-[var(--text-secondary)]">
            {accountDistribution.accounts.map((acc) => (
              <div 
                key={acc.id} 
                onClick={() => onSelectMode && onSelectMode(acc.id)}
                className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
              >
                <span 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: acc.color }} 
                />
                <span className="text-[var(--text-primary)]">{acc.name}</span>
                <span className="font-mono text-[10px]">({acc.percent.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* INTERNAL TRANSFERS (LAST 48H / RECENT) LIST */}
        <div className="space-y-2.5 pt-2 border-t border-[var(--border-light)]">
          <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            INTERNAL TRANSFERS (LAST 48H / RECENT)
          </div>

          <div className="space-y-2">
            {recentTransfers.length === 0 ? (
              <div className="p-3 text-center rounded-2xl bg-[var(--bg-primary)]/40 border border-dashed border-[var(--border-light)] text-xs text-[var(--text-secondary)]">
                ⇄ No recent internal transfers recorded.
              </div>
            ) : (
              recentTransfers.map((tx) => (
                <div 
                  key={tx.id}
                  className="p-3 rounded-2xl bg-[var(--bg-primary)]/70 border border-[var(--border-light)] flex items-center justify-between gap-3"
                >
                  {/* Left: Icon & Transfer Route */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate flex items-center gap-1">
                        <span>{tx.fromAccountName}</span>
                        <span className="text-[var(--text-secondary)]">→</span>
                        <span>{tx.toAccountName}</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] truncate">
                        {tx.description}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Status Badge */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
                      ${formatMoney(tx.amount)}
                    </div>
                    <div className="mt-0.5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        {tx.statusBadge}
                      </span>
                      {Boolean(tx.fee && tx.fee > 0) && (
                        <span className="text-[9px] text-[var(--text-secondary)] font-mono ml-1">
                          +${formatMoney(tx.fee || 0)} fee
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. DATA VAULT & SYNC CARD
          ========================================================================= */}
      <section className="apple-card p-4 space-y-3.5 bg-gradient-to-br from-[var(--bg-secondary)] via-indigo-950/10 to-[var(--bg-secondary)] border border-indigo-500/25 rounded-3xl shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 text-base">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Data Vault & Sync
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Local IndexedDB • Zero Server Leak
              </p>
            </div>
          </div>

          {/* Last sync pill */}
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-semibold text-emerald-400">
            {lastSyncLabel}
          </span>
        </div>

        {/* 2-Column Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Action 1: Export JSON */}
          <button
            type="button"
            onClick={onExportJson}
            className="apple-btn py-2.5 px-3 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] hover:border-[var(--accent)] flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-primary)] shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Export JSON</span>
          </button>

          {/* Action 2: Keep Sync */}
          <button
            type="button"
            onClick={() => {
              if (onOpenKeepSync) {
                onOpenKeepSync();
              } else if (onOpenCloudSync) {
                onOpenCloudSync();
              }
            }}
            className="apple-btn py-2.5 px-3 rounded-2xl bg-[var(--accent-bg)] hover:bg-[var(--accent)]/20 border border-[var(--accent)]/40 flex items-center justify-center gap-2 text-xs font-bold text-[var(--accent)] shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Keep Sync</span>
          </button>
        </div>
      </section>

    </div>
  );
};
