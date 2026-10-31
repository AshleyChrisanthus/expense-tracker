import React from 'react';
import { 
  CreditCard, 
  Landmark, 
  Banknote, 
  Wallet, 
  Coins, 
  Smartphone, 
  Plus, 
  Cloud, 
  Tag, 
  Bookmark, 
  FileJson, 
  Palette, 
  ArrowRightLeft
} from 'lucide-react';
import type { PaymentMode, Transaction, Banner } from '../../types/expense';
import type { SyncStatus } from '../../services/sync/types';

interface AccountsViewProps {
  paymentModes: PaymentMode[];
  transactions: Transaction[];
  banners: Banner[];
  syncStatus: SyncStatus;
  modeSpending: Record<string, number>;
  totalTransfers: number;
  transferFees: number;
  onOpenModesModal: () => void;
  onOpenCategoriesModal: () => void;
  onOpenBannersModal: () => void;
  onOpenImportExportModal: () => void;
  onOpenSyncModal: () => void;
  onOpenThemeModal: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  paymentModes,
  transactions,
  banners,
  syncStatus,
  modeSpending,
  totalTransfers,
  transferFees,
  onOpenModesModal,
  onOpenCategoriesModal,
  onOpenBannersModal,
  onOpenImportExportModal,
  onOpenSyncModal,
  onOpenThemeModal
}) => {
  const renderModeIcon = (iconName: string, sizeClass = "w-4 h-4") => {
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

  // Compute live balances per mode
  const balances = React.useMemo(() => {
    const bal: Record<string, number> = {};
    paymentModes.forEach(m => { bal[m.id] = 0; });

    transactions.forEach(tx => {
      if (tx.status === 'cancelled') return;
      if (tx.type === 'income') {
        bal[tx.paymentModeId] = (bal[tx.paymentModeId] || 0) + tx.amount;
      } else if (tx.type === 'expense') {
        bal[tx.paymentModeId] = (bal[tx.paymentModeId] || 0) - tx.amount;
      } else if (tx.type === 'transfer') {
        const fee = tx.fee || 0;
        bal[tx.paymentModeId] = (bal[tx.paymentModeId] || 0) - (tx.amount + fee);
        if (tx.toPaymentModeId) {
          bal[tx.toPaymentModeId] = (bal[tx.toPaymentModeId] || 0) + tx.amount;
        }
      }
    });
    return bal;
  }, [paymentModes, transactions]);

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Header Summary */}
      <div className="apple-card p-4 bg-gradient-to-br from-[var(--bg-secondary)] to-indigo-950/20 border-indigo-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--accent-bg)] text-[var(--accent)]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Accounts & Payment Modes
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {paymentModes.length} configured wallets & banks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenModesModal}
            className="apple-btn apple-btn-secondary text-xs flex items-center gap-1 font-semibold text-[var(--accent)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage</span>
          </button>
        </div>
      </div>

      {/* Payment Modes Cards */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1">
          Active Accounts
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {paymentModes.map(mode => {
            const balance = balances[mode.id] || 0;
            const spent = modeSpending[mode.id] || 0;

            return (
              <div
                key={mode.id}
                className="apple-card p-4 flex flex-col justify-between gap-3 relative overflow-hidden"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: mode.color }}
                />
                <div className="flex items-center justify-between pl-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: mode.color }}
                    >
                      {renderModeIcon(mode.icon, "w-4 h-4")}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        {mode.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        Spent: ${spent.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                      Net Flow
                    </div>
                    <div className={`text-base font-mono font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {balance >= 0 ? '+' : ''}${balance.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transfers Summary */}
      <div className="apple-card p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              Internal Transfers & Cash Flow
            </div>
            <div className="text-[11px] text-[var(--text-secondary)]">
              ${totalTransfers.toFixed(2)} transferred • ${transferFees.toFixed(2)} fees
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Vault & Settings Grid */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1">
          Vault & System Tools
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* E2EE Cloud Sync */}
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="apple-card p-3 text-left hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
                <Cloud className="w-4 h-4" />
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                syncStatus.state === 'synced' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
              }`}>
                {syncStatus.state}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">E2EE Cloud Sync</div>
              <div className="text-[10px] text-[var(--text-secondary)]">QR Pairing & Vaults</div>
            </div>
          </button>

          {/* Categories */}
          <button
            type="button"
            onClick={onOpenCategoriesModal}
            className="apple-card p-3 text-left hover:border-purple-500/40 transition-all flex flex-col justify-between gap-2"
          >
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 w-fit">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Categories</div>
              <div className="text-[10px] text-[var(--text-secondary)]">Manage tags & rules</div>
            </div>
          </button>

          {/* Banners */}
          <button
            type="button"
            onClick={onOpenBannersModal}
            className="apple-card p-3 text-left hover:border-blue-500/40 transition-all flex flex-col justify-between gap-2"
          >
            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 w-fit">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Banners & Projects</div>
              <div className="text-[10px] text-[var(--text-secondary)]">{banners.length} custom tags</div>
            </div>
          </button>

          {/* JSON Backup & Keep Notes */}
          <button
            type="button"
            onClick={onOpenImportExportModal}
            className="apple-card p-3 text-left hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-2"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 w-fit">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Backup & Keep</div>
              <div className="text-[10px] text-[var(--text-secondary)]">Export / Import data</div>
            </div>
          </button>

          {/* Theme Customizer */}
          <button
            type="button"
            onClick={onOpenThemeModal}
            className="apple-card p-3 text-left hover:border-[var(--accent)]/40 transition-all flex flex-col justify-between gap-2 col-span-2"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--accent-bg)] text-[var(--accent)]">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">Glassmorphic Theme Customizer</div>
                <div className="text-[10px] text-[var(--text-secondary)]">Presets, dark/light modes & glass tokens</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
