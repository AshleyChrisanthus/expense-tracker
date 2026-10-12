import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  CreditCard, 
  Tag, 
  Bookmark, 
  X, 
  Layers, 
  Wallet, 
  Landmark, 
  Banknote, 
  Coins, 
  Smartphone
} from 'lucide-react';
import { Transaction, PaymentMode, Banner } from '../types/expense';

interface VisualAnalyticsProps {
  transactions: Transaction[];
  paymentModes: PaymentMode[];
  categories: string[];
  banners: Banner[];
  filteredTransactions: Transaction[];
  activeMonthFilter: string;
  onSelectMonth: (month: string) => void;
  onSelectCategory: (category: string) => void;
  onSelectMode: (modeId: string) => void;
  onSelectBanner: (bannerId: string) => void;
  onClose: () => void;
}

// Curated vibrant accessible palette for categories
const CATEGORY_COLORS = [
  '#0a84ff', // Electric Blue
  '#30d158', // Mint Emerald
  '#ff9f0a', // Warm Amber
  '#bf5af2', // Orchid Purple
  '#ff375f', // Coral Rose
  '#64d2ff', // Sky Cyan
  '#ffd60a', // Bright Yellow
  '#ac8e68', // Warm Umber
  '#ff453a', // Crimson
  '#5e5ce6', // Indigo
  '#32d74b', // Apple Green
  '#98989d'  // Cool Slate
];

interface DonutSliceItem {
  id: string;
  name: string;
  value: number;
  color: string;
  count: number;
  percent: number;
  icon?: string;
}

// Helper to compute SVG arc path
function describeDonutSlice(
  cx: number, 
  cy: number, 
  outerR: number, 
  innerR: number, 
  startAngleRad: number, 
  endAngleRad: number
): string {
  // Rotate so 0 radians is top (-pi/2)
  const a1 = startAngleRad - Math.PI / 2;
  const a2 = endAngleRad - Math.PI / 2;

  const x1 = cx + outerR * Math.cos(a1);
  const y1 = cy + outerR * Math.sin(a1);
  const x2 = cx + outerR * Math.cos(a2);
  const y2 = cy + outerR * Math.sin(a2);

  const x3 = cx + innerR * Math.cos(a2);
  const y3 = cy + innerR * Math.sin(a2);
  const x4 = cx + innerR * Math.cos(a1);
  const y4 = cy + innerR * Math.sin(a1);

  const largeArcFlag = (endAngleRad - startAngleRad) > Math.PI ? 1 : 0;

  return [
    `M ${x1.toFixed(3)} ${y1.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`,
    `L ${x3.toFixed(3)} ${y3.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4.toFixed(3)} ${y4.toFixed(3)}`,
    'Z'
  ].join(' ');
}

// Interactive Donut Chart Component
const InteractiveDonut: React.FC<{
  items: DonutSliceItem[];
  totalValue: number;
  title: string;
  subtitle?: string;
  onItemClick?: (id: string) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  size?: number;
}> = ({ items, totalValue, title, subtitle, onItemClick, hoveredId, setHoveredId, size = 220 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.28;

  // Active slice for center display
  const activeItem = hoveredId ? items.find(it => it.id === hoveredId) : null;

  // Slices geometry
  const slices = useMemo(() => {
    if (totalValue <= 0 || items.length === 0) return [];

    let currentAngle = 0;
    return items.map(item => {
      const sliceAngle = (item.value / totalValue) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      // Handle full circle
      const isFullCircle = items.length === 1 || item.value >= totalValue * 0.9999;
      let pathData = '';
      if (isFullCircle) {
        pathData = [
          `M ${cx} ${cy - outerR}`,
          `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy + outerR}`,
          `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy - outerR}`,
          `M ${cx} ${cy - innerR}`,
          `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy + innerR}`,
          `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}`,
          'Z'
        ].join(' ');
      } else {
        pathData = describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle);
      }

      return {
        ...item,
        pathData,
        startAngle,
        endAngle,
        isFullCircle
      };
    });
  }, [items, totalValue, cx, cy, outerR, innerR]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg 
          width={size} 
          height={size} 
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          {totalValue <= 0 ? (
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke="var(--border-light)"
              strokeWidth={outerR - innerR}
              strokeDasharray="4 4"
            />
          ) : (
            slices.map(slice => {
              const isHovered = hoveredId === slice.id;
              return (
                <path
                  key={slice.id}
                  d={slice.pathData}
                  fill={slice.color}
                  fillRule={slice.isFullCircle ? 'evenodd' : undefined}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    opacity: hoveredId ? (isHovered ? 1 : 0.45) : 0.92,
                    filter: isHovered ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))' : 'none',
                    transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                    transformOrigin: `${cx}px ${cy}px`
                  }}
                  onMouseEnter={() => setHoveredId(slice.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onItemClick && onItemClick(slice.id)}
                />
              );
            })
          )}
        </svg>

        {/* Center Callout */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4"
          style={{ width: size, height: size }}
        >
          {activeItem ? (
            <div className="animate-fade-in max-w-[130px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] line-clamp-1">
                {activeItem.name}
              </span>
              <div className="text-sm font-extrabold font-mono text-[var(--text-primary)] leading-tight">
                ${activeItem.value.toFixed(2)}
              </div>
              <div className="text-[10px] font-semibold text-[var(--accent)]">
                {activeItem.percent.toFixed(1)}% · {activeItem.count} tx
              </div>
            </div>
          ) : (
            <div className="max-w-[130px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                {title}
              </span>
              <div className="text-sm font-extrabold font-mono text-[var(--text-primary)] leading-tight">
                ${totalValue.toFixed(2)}
              </div>
              {subtitle && (
                <div className="text-[9px] text-[var(--text-secondary)] opacity-80">
                  {subtitle}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const VisualAnalytics: React.FC<VisualAnalyticsProps> = ({
  transactions,
  paymentModes,
  categories: _categories,
  banners,
  filteredTransactions,
  activeMonthFilter,
  onSelectMonth,
  onSelectCategory,
  onSelectMode,
  onSelectBanner,
  onClose
}) => {
  // Visual Analytics Active Tab: 'overview' | 'categories' | 'modes' | 'banners' | 'trends'
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'modes' | 'banners' | 'trends'>('overview');

  // Time scope filter: 'all' | 'feed' | 'year' | '6months' | '3months'
  const [timeScope, setTimeScope] = useState<'all' | 'feed' | 'year' | '6months' | '3months'>('all');

  // Hover states for donuts
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const [hoveredBanner, setHoveredBanner] = useState<string | null>(null);

  // Hover state for monthly bar chart
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Mode icon helper
  const renderModeIcon = (iconName: string, sizeClass = "w-3.5 h-3.5") => {
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

  // 1. Filtered dataset based on analytics scope
  const targetTransactions = useMemo(() => {
    if (timeScope === 'feed') {
      return filteredTransactions;
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const cutoffDate = new Date();

    if (timeScope === 'year') {
      cutoffDate.setFullYear(currentYear, 0, 1);
    } else if (timeScope === '6months') {
      cutoffDate.setMonth(today.getMonth() - 6);
    } else if (timeScope === '3months') {
      cutoffDate.setMonth(today.getMonth() - 3);
    }

    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    return transactions.filter(t => {
      if (t.status === 'cancelled') return false;
      if (timeScope !== 'all' && t.date < cutoffStr) return false;
      return true;
    });
  }, [transactions, filteredTransactions, timeScope]);

  // Spending transactions (expenses + transfer fees)
  const expenseTransactions = useMemo(() => {
    return targetTransactions.filter(t => t.type === 'expense' || (t.type === 'transfer' && (t.fee || 0) > 0));
  }, [targetTransactions]);

  // 2. High-level Metrics for Selected Scope
  const summaryMetrics = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    let totalTransfers = 0;

    targetTransactions.forEach(t => {
      if (t.type === 'expense') {
        totalExpense += t.amount;
      } else if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'transfer') {
        totalTransfers += t.amount;
        if (t.fee) totalExpense += t.fee;
      }
    });

    const netSavings = totalIncome - totalExpense;

    return {
      totalExpense,
      totalIncome,
      totalTransfers,
      netSavings,
      count: targetTransactions.length
    };
  }, [targetTransactions]);

  // 3. Category Breakdown Data
  const categoryData = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>();
    let total = 0;

    expenseTransactions.forEach(t => {
      const amt = t.type === 'expense' ? t.amount : (t.fee || 0);
      const cat = t.category || 'Uncategorized';
      total += amt;

      const current = map.get(cat) || { value: 0, count: 0 };
      map.set(cat, {
        value: current.value + amt,
        count: current.count + 1
      });
    });

    const sorted = Array.from(map.entries())
      .map(([name, data], idx) => ({
        id: name,
        name,
        value: data.value,
        count: data.count,
        percent: total > 0 ? (data.value / total) * 100 : 0,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);

    return {
      items: sorted,
      total
    };
  }, [expenseTransactions]);

  // 4. Payment Modes / Accounts Breakdown Data
  const modeData = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>();
    let total = 0;

    expenseTransactions.forEach(t => {
      const amt = t.type === 'expense' ? t.amount : (t.fee || 0);
      const modeId = t.paymentModeId || 'other';
      total += amt;

      const current = map.get(modeId) || { value: 0, count: 0 };
      map.set(modeId, {
        value: current.value + amt,
        count: current.count + 1
      });
    });

    const modeMap = new Map(paymentModes.map(m => [m.id, m]));

    const items: DonutSliceItem[] = Array.from(map.entries())
      .map(([id, data]) => {
        const mode = modeMap.get(id);
        return {
          id,
          name: mode ? mode.name : id,
          value: data.value,
          count: data.count,
          percent: total > 0 ? (data.value / total) * 100 : 0,
          color: mode?.color || '#0a84ff',
          icon: mode?.icon
        };
      })
      .sort((a, b) => b.value - a.value);

    return {
      items,
      total
    };
  }, [expenseTransactions, paymentModes]);

  // 5. Banners / Groups Breakdown Data (Special User Requirement)
  const bannerData = useMemo(() => {
    const bannerSpendMap = new Map<string, { value: number; count: number }>();
    let untaggedValue = 0;
    let untaggedCount = 0;
    let totalExpense = 0;

    banners.forEach(b => {
      bannerSpendMap.set(b.id, { value: 0, count: 0 });
    });

    expenseTransactions.forEach(t => {
      const amt = t.type === 'expense' ? t.amount : (t.fee || 0);
      totalExpense += amt;

      if (!t.bannerIds || t.bannerIds.length === 0) {
        untaggedValue += amt;
        untaggedCount += 1;
      } else {
        t.bannerIds.forEach(bId => {
          const curr = bannerSpendMap.get(bId) || { value: 0, count: 0 };
          bannerSpendMap.set(bId, {
            value: curr.value + amt,
            count: curr.count + 1
          });
        });
      }
    });

    const bannerObjMap = new Map(banners.map(b => [b.id, b]));
    const items: DonutSliceItem[] = [];

    bannerSpendMap.forEach((data, id) => {
      const bObj = bannerObjMap.get(id);
      if (bObj && (data.value > 0 || data.count > 0)) {
        items.push({
          id,
          name: bObj.name,
          value: data.value,
          count: data.count,
          percent: totalExpense > 0 ? (data.value / totalExpense) * 100 : 0,
          color: bObj.color
        });
      }
    });

    // Add untagged segment if there is any untagged spending
    if (untaggedValue > 0) {
      items.push({
        id: 'untagged',
        name: 'Untagged / No Banner',
        value: untaggedValue,
        count: untaggedCount,
        percent: totalExpense > 0 ? (untaggedValue / totalExpense) * 100 : 0,
        color: '#64748b'
      });
    }

    items.sort((a, b) => b.value - a.value);

    return {
      items,
      total: totalExpense,
      taggedCount: expenseTransactions.filter(t => t.bannerIds && t.bannerIds.length > 0).length,
      untaggedCount
    };
  }, [expenseTransactions, banners]);

  // 6. Monthly Spending Trends Bar Chart Data
  const monthlyTrendsData = useMemo(() => {
    const monthMap = new Map<string, { expense: number; income: number; transfers: number; count: number }>();

    transactions.forEach(t => {
      if (t.status === 'cancelled') return;
      const monthKey = t.date ? t.date.substring(0, 7) : 'Unknown';
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { expense: 0, income: 0, transfers: 0, count: 0 });
      }
      const m = monthMap.get(monthKey)!;
      m.count += 1;

      if (t.type === 'expense') {
        m.expense += t.amount;
      } else if (t.type === 'income') {
        m.income += t.amount;
      } else if (t.type === 'transfer') {
        m.transfers += t.amount;
        if (t.fee) m.expense += t.fee;
      }
    });

    // Sort chronologically ascending
    const sortedMonths = Array.from(monthMap.keys()).sort();

    // Display last 12 or available months
    const displayedMonths = sortedMonths.slice(-12);

    let maxExpense = 0;
    let maxIncome = 0;
    let sumExpense = 0;

    const list = displayedMonths.map(mKey => {
      const data = monthMap.get(mKey)!;
      if (data.expense > maxExpense) maxExpense = data.expense;
      if (data.income > maxIncome) maxIncome = data.income;
      sumExpense += data.expense;

      // Format display label e.g. "Apr 24"
      const [yearStr, monthStr] = mKey.split('-');
      const dObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
      const label = dObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const fullLabel = dObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      return {
        key: mKey,
        label,
        fullLabel,
        expense: data.expense,
        income: data.income,
        transfers: data.transfers,
        count: data.count,
        net: data.income - data.expense
      };
    });

    const maxValue = Math.max(maxExpense, maxIncome, 100);
    const avgExpense = list.length > 0 ? sumExpense / list.length : 0;

    return {
      months: list,
      maxValue,
      avgExpense
    };
  }, [transactions]);

  return (
    <section className="apple-card p-5 space-y-6 relative overflow-hidden border border-[var(--accent)]/30 shadow-xl bg-gradient-to-b from-[var(--bg-secondary)]/90 to-[var(--bg-primary)]/90 backdrop-blur-2xl">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-light)] relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-purple-600 text-white shadow-md shadow-[var(--accent)]/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                Visual Analytics & Insights
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/20">
                  Interactive
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Financial visualisations for categories, payment accounts, custom banners, and monthly trends
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Scope */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scope Selector */}
          <div className="flex items-center bg-[var(--bg-tertiary)] p-0.5 rounded-xl border border-[var(--border-light)] text-xs">
            <button
              onClick={() => setTimeScope('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                timeScope === 'all'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeScope('year')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                timeScope === 'year'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              This Year
            </button>
            <button
              onClick={() => setTimeScope('6months')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                timeScope === '6months'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setTimeScope('feed')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                timeScope === 'feed'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Apply active filters from search, category, mode, or banner filters"
            >
              Feed Filters
            </button>
          </div>

          {/* Close / Hide Button */}
          <button
            onClick={onClose}
            className="apple-btn apple-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Hide visual analytics section"
          >
            <X className="w-3.5 h-3.5" />
            <span>Hide Charts</span>
          </button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[var(--border-light)]/60 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Overview (All Visualizations)</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'categories'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <Tag className="w-3.5 h-3.5 text-purple-400" />
          <span>Categories Breakdown</span>
          <span className="opacity-75 font-mono text-[11px]">({categoryData.items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('modes')}
          className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'modes'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-blue-400" />
          <span>Accounts & Payment Modes</span>
          <span className="opacity-75 font-mono text-[11px]">({modeData.items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('banners')}
          className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'banners'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          <span>Custom Banners Breakdown</span>
          <span className="opacity-75 font-mono text-[11px]">({bannerData.items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('trends')}
          className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'trends'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>Monthly Trends</span>
          <span className="opacity-75 font-mono text-[11px]">({monthlyTrendsData.months.length} mos)</span>
        </button>
      </div>

      {/* Period Quick Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
          <div className="text-[10px] uppercase font-semibold text-[var(--text-secondary)]">Scope Expenses</div>
          <div className="text-lg font-bold font-mono text-rose-400">
            ${summaryMetrics.totalExpense.toFixed(2)}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {expenseTransactions.length} transactions
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
          <div className="text-[10px] uppercase font-semibold text-[var(--text-secondary)]">Top Category</div>
          <div className="text-sm font-bold text-[var(--text-primary)] truncate mt-0.5">
            {categoryData.items[0]?.name || 'N/A'}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] font-mono">
            ${(categoryData.items[0]?.value || 0).toFixed(2)} ({categoryData.items[0]?.percent.toFixed(0) || 0}%)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
          <div className="text-[10px] uppercase font-semibold text-[var(--text-secondary)]">Top Account</div>
          <div className="text-sm font-bold text-[var(--text-primary)] truncate mt-0.5">
            {modeData.items[0]?.name || 'N/A'}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] font-mono">
            ${(modeData.items[0]?.value || 0).toFixed(2)} ({modeData.items[0]?.percent.toFixed(0) || 0}%)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
          <div className="text-[10px] uppercase font-semibold text-[var(--text-secondary)]">Top Banner Tag</div>
          <div className="text-sm font-bold text-[var(--text-primary)] truncate mt-0.5">
            {bannerData.items.find(b => b.id !== 'untagged')?.name || 'None'}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] font-mono">
            ${(bannerData.items.find(b => b.id !== 'untagged')?.value || 0).toFixed(2)} tagged
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ALL CHARTS */}
      {(activeTab === 'overview' || activeTab === 'trends') && (
        <div className="apple-card p-4 space-y-3 bg-[var(--bg-secondary)]/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Monthly Spending & Income Trends
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Hover over bars to inspect details. Click a month to filter the feed.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                Expenses
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Income
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                Avg: ${monthlyTrendsData.avgExpense.toFixed(0)}/mo
              </span>
            </div>
          </div>

          {/* SVG Bar Chart */}
          <div className="relative pt-4 pb-2">
            {monthlyTrendsData.months.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-[var(--text-secondary)]">
                No monthly data available
              </div>
            ) : (
              <div className="w-full overflow-x-auto scrollbar-none">
                <div className="min-w-[500px]">
                  <svg 
                    viewBox={`0 0 600 200`} 
                    className="w-full h-52 overflow-visible select-none"
                  >
                    {/* Y-axis Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                      const y = 160 - pct * 140;
                      const val = monthlyTrendsData.maxValue * pct;
                      return (
                        <g key={idx}>
                          <line 
                            x1="35" 
                            y1={y} 
                            x2="595" 
                            y2={y} 
                            stroke="var(--border-light)" 
                            strokeDasharray="3 3"
                            opacity={0.6}
                          />
                          <text 
                            x="30" 
                            y={y + 3} 
                            textAnchor="end" 
                            fill="var(--text-secondary)" 
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Average Expense Benchmark Line */}
                    {monthlyTrendsData.avgExpense > 0 && (
                      <g>
                        <line
                          x1="35"
                          y1={160 - (monthlyTrendsData.avgExpense / monthlyTrendsData.maxValue) * 140}
                          x2="595"
                          y2={160 - (monthlyTrendsData.avgExpense / monthlyTrendsData.maxValue) * 140}
                          stroke="#f59e0b"
                          strokeDasharray="4 2"
                          strokeWidth="1.5"
                          opacity={0.8}
                        />
                      </g>
                    )}

                    {/* Bars for Each Month */}
                    {monthlyTrendsData.months.map((m, idx) => {
                      const totalMonths = monthlyTrendsData.months.length;
                      const groupWidth = (560) / totalMonths;
                      const barWidth = Math.min(groupWidth * 0.35, 16);
                      const groupX = 40 + idx * groupWidth;

                      const expH = (m.expense / monthlyTrendsData.maxValue) * 140;
                      const incH = (m.income / monthlyTrendsData.maxValue) * 140;

                      const expY = 160 - expH;
                      const incY = 160 - incH;

                      const isSelected = activeMonthFilter === m.key;
                      const isHovered = hoveredBarIndex === idx;

                      return (
                        <g 
                          key={m.key} 
                          className="cursor-pointer group"
                          onMouseEnter={() => setHoveredBarIndex(idx)}
                          onMouseLeave={() => setHoveredBarIndex(null)}
                          onClick={() => onSelectMonth(isSelected ? 'all' : m.key)}
                        >
                          {/* Hover highlight background column */}
                          <rect
                            x={groupX}
                            y={15}
                            width={groupWidth}
                            height={150}
                            fill={isSelected ? 'var(--accent)' : 'var(--text-secondary)'}
                            opacity={isSelected ? 0.12 : isHovered ? 0.06 : 0}
                            rx="6"
                            className="transition-opacity"
                          />

                          {/* Expense Bar */}
                          <rect
                            x={groupX + groupWidth / 2 - barWidth - 1}
                            y={expY}
                            width={barWidth}
                            height={Math.max(expH, 2)}
                            rx="3"
                            fill="#f43f5e"
                            className="transition-all"
                            style={{
                              opacity: isHovered || isSelected ? 1 : 0.85,
                              filter: isHovered ? 'drop-shadow(0 2px 6px rgba(244,63,94,0.4))' : 'none'
                            }}
                          />

                          {/* Income Bar */}
                          <rect
                            x={groupX + groupWidth / 2 + 1}
                            y={incY}
                            width={barWidth}
                            height={Math.max(incH, 2)}
                            rx="3"
                            fill="#10b981"
                            className="transition-all"
                            style={{
                              opacity: isHovered || isSelected ? 1 : 0.85,
                              filter: isHovered ? 'drop-shadow(0 2px 6px rgba(16,185,129,0.4))' : 'none'
                            }}
                          />

                          {/* Month Label */}
                          <text
                            x={groupX + groupWidth / 2}
                            y={178}
                            textAnchor="middle"
                            fill={isSelected ? 'var(--accent)' : 'var(--text-secondary)'}
                            fontSize="9"
                            fontWeight={isSelected || isHovered ? '700' : '500'}
                          >
                            {m.label}
                          </text>

                          {/* Indicator dot if selected */}
                          {isSelected && (
                            <circle
                              cx={groupX + groupWidth / 2}
                              cy={188}
                              r="2"
                              fill="var(--accent)"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Interactive Floating Hover Popover */}
                  {hoveredBarIndex !== null && monthlyTrendsData.months[hoveredBarIndex] && (
                    <div className="mt-2 p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-light)] shadow-lg flex items-center justify-between gap-4 text-xs animate-fade-in">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span className="font-bold text-[var(--text-primary)]">
                          {monthlyTrendsData.months[hoveredBarIndex].fullLabel}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          ({monthlyTrendsData.months[hoveredBarIndex].count} transactions)
                        </span>
                      </div>
                      <div className="flex items-center gap-4 font-mono">
                        <span className="text-rose-400 font-semibold">
                          Expenses: -${monthlyTrendsData.months[hoveredBarIndex].expense.toFixed(2)}
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          Income: +${monthlyTrendsData.months[hoveredBarIndex].income.toFixed(2)}
                        </span>
                        <span className={`font-semibold ${
                          monthlyTrendsData.months[hoveredBarIndex].net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          Net: {monthlyTrendsData.months[hoveredBarIndex].net >= 0 ? '+' : ''}${monthlyTrendsData.months[hoveredBarIndex].net.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={() => onSelectMonth(monthlyTrendsData.months[hoveredBarIndex].key)}
                        className="apple-btn apple-btn-primary text-[10px] py-1 px-2 shrink-0"
                      >
                        Filter Feed
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* THREE BREAKDOWN COLUMNS: CATEGORIES, PAYMENT MODES, BANNERS */}
      {(activeTab === 'overview' || activeTab === 'categories' || activeTab === 'modes' || activeTab === 'banners') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* COLUMN 1: CATEGORY BREAKDOWN */}
          {(activeTab === 'overview' || activeTab === 'categories') && (
            <div className={`apple-card p-4 space-y-4 bg-[var(--bg-secondary)]/70 ${activeTab === 'categories' ? 'lg:col-span-3' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Spending by Category
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-semibold text-rose-400">
                  ${categoryData.total.toFixed(2)}
                </span>
              </div>

              {/* Donut */}
              <InteractiveDonut
                items={categoryData.items}
                totalValue={categoryData.total}
                title="Category Total"
                subtitle={`${categoryData.items.length} categories`}
                hoveredId={hoveredCategory}
                setHoveredId={setHoveredCategory}
                onItemClick={(cat) => onSelectCategory(cat)}
                size={activeTab === 'categories' ? 240 : 200}
              />

              {/* Ranked Category List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {categoryData.items.map(item => {
                  const isHovered = hoveredCategory === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isHovered 
                          ? 'bg-[var(--bg-tertiary)] border-[var(--accent)]' 
                          : 'bg-[var(--bg-secondary)] border-[var(--border-light)] hover:border-[var(--text-secondary)]/40'
                      }`}
                      onMouseEnter={() => setHoveredCategory(item.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => onSelectCategory(item.name)}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-[var(--text-primary)] truncate">{item.name}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] shrink-0 font-mono">({item.count} tx)</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[var(--text-primary)]">${item.value.toFixed(2)}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] ml-1 font-mono">({item.percent.toFixed(1)}%)</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(item.percent, 100)}%`, 
                            backgroundColor: item.color 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COLUMN 2: PAYMENT MODES / ACCOUNTS BREAKDOWN */}
          {(activeTab === 'overview' || activeTab === 'modes') && (
            <div className={`apple-card p-4 space-y-4 bg-[var(--bg-secondary)]/70 ${activeTab === 'modes' ? 'lg:col-span-3' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Paid via Accounts
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-semibold text-[var(--accent)]">
                  ${modeData.total.toFixed(2)}
                </span>
              </div>

              {/* Donut */}
              <InteractiveDonut
                items={modeData.items}
                totalValue={modeData.total}
                title="Accounts Total"
                subtitle={`${modeData.items.length} payment modes`}
                hoveredId={hoveredMode}
                setHoveredId={setHoveredMode}
                onItemClick={(mId) => onSelectMode(mId)}
                size={activeTab === 'modes' ? 240 : 200}
              />

              {/* Ranked Accounts List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {modeData.items.map(item => {
                  const isHovered = hoveredMode === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isHovered 
                          ? 'bg-[var(--bg-tertiary)] border-[var(--accent)]' 
                          : 'bg-[var(--bg-secondary)] border-[var(--border-light)] hover:border-[var(--text-secondary)]/40'
                      }`}
                      onMouseEnter={() => setHoveredMode(item.id)}
                      onMouseLeave={() => setHoveredMode(null)}
                      onClick={() => onSelectMode(item.id)}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="p-1 rounded-md text-white shrink-0"
                            style={{ backgroundColor: item.color }}
                          >
                            {renderModeIcon(item.icon || 'credit-card', "w-3 h-3")}
                          </span>
                          <span className="font-medium text-[var(--text-primary)] truncate">{item.name}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] shrink-0 font-mono">({item.count} tx)</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[var(--text-primary)]">${item.value.toFixed(2)}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] ml-1 font-mono">({item.percent.toFixed(1)}%)</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(item.percent, 100)}%`, 
                            backgroundColor: item.color 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COLUMN 3: BANNERS / GROUPS BREAKDOWN (NEW USER FEATURE) */}
          {(activeTab === 'overview' || activeTab === 'banners') && (
            <div className={`apple-card p-4 space-y-4 bg-[var(--bg-secondary)]/70 ${activeTab === 'banners' ? 'lg:col-span-3' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Spending by Banner Tag
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-semibold text-amber-400">
                  ${bannerData.total.toFixed(2)}
                </span>
              </div>

              {/* Donut */}
              <InteractiveDonut
                items={bannerData.items}
                totalValue={bannerData.total}
                title="Banners Breakdown"
                subtitle={`${bannerData.items.length} groups`}
                hoveredId={hoveredBanner}
                setHoveredId={setHoveredBanner}
                onItemClick={(bId) => {
                  if (bId !== 'untagged') onSelectBanner(bId);
                }}
                size={activeTab === 'banners' ? 240 : 200}
              />

              {/* Ranked Banners List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {bannerData.items.map(item => {
                  const isHovered = hoveredBanner === item.id;
                  const isUntagged = item.id === 'untagged';
                  return (
                    <div
                      key={item.id}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isHovered 
                          ? 'bg-[var(--bg-tertiary)] border-[var(--accent)]' 
                          : 'bg-[var(--bg-secondary)] border-[var(--border-light)] hover:border-[var(--text-secondary)]/40'
                      }`}
                      onMouseEnter={() => setHoveredBanner(item.id)}
                      onMouseLeave={() => setHoveredBanner(null)}
                      onClick={() => {
                        if (!isUntagged) onSelectBanner(item.id);
                      }}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: item.color }} 
                          />
                          <span className={`font-medium truncate ${isUntagged ? 'text-[var(--text-secondary)] italic' : 'text-[var(--text-primary)]'}`}>
                            {item.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)] shrink-0 font-mono">({item.count} tx)</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[var(--text-primary)]">${item.value.toFixed(2)}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] ml-1 font-mono">({item.percent.toFixed(1)}%)</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(item.percent, 100)}%`, 
                            backgroundColor: item.color 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </section>
  );
};
