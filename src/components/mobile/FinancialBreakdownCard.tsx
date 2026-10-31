import React, { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import type { Transaction } from '../../types/expense';

interface FinancialBreakdownCardProps {
  transactions: Transaction[];
  onViewAnalytics: () => void;
}

export const FinancialBreakdownCard: React.FC<FinancialBreakdownCardProps> = ({
  transactions,
  onViewAnalytics
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Compute category spending snapshot
  const topCategories = React.useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let total = 0;

    transactions.forEach((tx) => {
      if (tx.status === 'cancelled') return;
      if (tx.type === 'expense') {
        total += tx.amount;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      }
    });

    return Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0
      }));
  }, [transactions]);

  return (
    <div className="apple-card p-3.5 glass-panel transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon Badge + Title + Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shrink-0 shadow-xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
              Financial Breakdown
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              Categories & monthly flow trends
            </p>
          </div>
        </div>

        {/* Right: Insights ⌄ action */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="apple-btn apple-btn-secondary text-xs px-2.5 py-1.5 font-semibold text-[var(--accent)] hover:border-[var(--accent)] flex items-center gap-1 shrink-0"
        >
          <span>Insights</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Inline Insights Drawer */}
      {isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-[var(--border-light)] space-y-3 animate-in fade-in duration-150">
          <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Top Spending Categories
          </div>

          <div className="space-y-2">
            {topCategories.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] italic">No expenses recorded yet.</p>
            ) : (
              topCategories.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)] truncate">{cat.name}</span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      ${cat.amount.toFixed(2)}{' '}
                      <span className="text-[10px] text-[var(--accent)] font-semibold">
                        ({cat.percent.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent)] to-indigo-500 rounded-full"
                      style={{ width: `${Math.min(cat.percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={onViewAnalytics}
            className="w-full mt-2 apple-btn apple-btn-secondary text-xs py-2 text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] transition-all flex items-center justify-center gap-1.5 font-semibold"
          >
            <span>Open Full Visual Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
