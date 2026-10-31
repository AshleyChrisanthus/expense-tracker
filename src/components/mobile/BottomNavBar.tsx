import React from 'react';
import { Newspaper, CalendarClock, Plus, CircleDot, Wallet } from 'lucide-react';

export type MobileTab = 'feed' | 'recurring' | 'analytics' | 'accounts';

interface BottomNavBarProps {
  activeTab: MobileTab;
  onChangeTab: (tab: MobileTab) => void;
  onOpenAddTransaction: () => void;
  recurringDueCount?: number;
  isVisible?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddTransaction,
  recurringDueCount = 0,
  isVisible = true
}) => {
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-28 opacity-0 pointer-events-none'
      }`}
      aria-label="Mobile Navigation"
    >
      <div className="relative max-w-lg mx-auto px-4 pb-3">
        {/* Glass bar container */}
        <div className="relative flex items-center justify-around h-16 rounded-2xl glass-panel border border-[var(--border-light)] shadow-2xl backdrop-blur-2xl bg-[var(--card-bg)]/90 px-2">
          
          {/* Tab 1: Feed */}
          <button
            type="button"
            onClick={() => onChangeTab('feed')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-all cursor-pointer ${
              activeTab === 'feed'
                ? 'text-[var(--accent)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Newspaper className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Feed</span>
          </button>

          {/* Tab 2: Recurring */}
          <button
            type="button"
            onClick={() => onChangeTab('recurring')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 relative transition-all cursor-pointer ${
              activeTab === 'recurring'
                ? 'text-[var(--accent)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="relative">
              <CalendarClock className="w-5 h-5" />
              {recurringDueCount > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1 min-w-[15px] h-3.5 rounded-full bg-purple-500 text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {recurringDueCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Recurring</span>
          </button>

          {/* Center Floating Action Button (+ FAB) */}
          <div className="flex-1 flex justify-center -mt-6">
            <button
              type="button"
              onClick={onOpenAddTransaction}
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-[var(--accent)] to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-[var(--accent)]/45 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-[var(--bg-primary)] border border-white/20"
              title="Add Transaction"
              aria-label="Add Transaction"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Tab 3: Analytics */}
          <button
            type="button"
            onClick={() => onChangeTab('analytics')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'text-[var(--accent)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CircleDot className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Analytics</span>
          </button>

          {/* Tab 4: Accounts */}
          <button
            type="button"
            onClick={() => onChangeTab('accounts')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-all cursor-pointer ${
              activeTab === 'accounts'
                ? 'text-[var(--accent)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Accounts</span>
          </button>

        </div>
      </div>
    </nav>
  );
};
