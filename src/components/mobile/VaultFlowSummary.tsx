import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface VaultFlowSummaryProps {
  totalIncome: number;
  incomeCount: number;
  totalExpense: number;
  expenseCount: number;
  syncState?: string;
}

export const VaultFlowSummary: React.FC<VaultFlowSummaryProps> = ({
  totalIncome,
  incomeCount,
  totalExpense,
  expenseCount,
  syncState = 'synced'
}) => {
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <section className="space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          <Wallet className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>VAULT FLOW SUMMARY</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{syncState === 'synced' ? 'Local Sync Live' : syncState === 'syncing' ? 'Syncing...' : 'Local Vault'}</span>
        </div>
      </div>

      {/* 2-Column Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Income Card */}
        <div className="apple-card p-3.5 bg-gradient-to-br from-[var(--bg-secondary)] to-emerald-950/20 border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Total Income
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 tracking-tight">
              +${formatAmount(totalIncome)}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">
              {incomeCount} deposits logged
            </p>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="apple-card p-3.5 bg-gradient-to-br from-[var(--bg-secondary)] to-rose-950/20 border-rose-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-400 tracking-tight">
              -${formatAmount(totalExpense)}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">
              {expenseCount} debits tracked
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
