import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface VaultFooterBadgeProps {
  totalEntries: number;
  onClickVault?: () => void;
}

export const VaultFooterBadge: React.FC<VaultFooterBadgeProps> = ({
  totalEntries,
  onClickVault
}) => {
  return (
    <div className="pt-6 pb-20 flex flex-col items-center justify-center text-center">
      <button
        type="button"
        onClick={onClickVault}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl glass-subtle border border-[var(--border-light)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40 transition-all cursor-pointer shadow-xs"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="font-medium">
          All <strong className="text-[var(--text-primary)] font-mono">{totalEntries}</strong> entries loaded • Encrypted in browser storage
        </span>
      </button>
      <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
        Zero tracking • Local-first SQLite/IndexedDB • E2EE Cloud Sync ready
      </p>
    </div>
  );
};
