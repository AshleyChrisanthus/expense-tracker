import React from 'react';
import { Search, User } from 'lucide-react';
import type { SyncStatus } from '../../services/sync/types';

interface MobileHeaderProps {
  title?: string;
  syncStatus: SyncStatus;
  onSearchToggle: () => void;
  onOpenSync: () => void;
  isSearchActive?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title = 'Feed Timeline',
  syncStatus,
  onSearchToggle,
  onOpenSync,
  isSearchActive = false
}) => {
  const getStatusColor = () => {
    switch (syncStatus.state) {
      case 'synced':
        return { dot: 'bg-emerald-500', ping: 'bg-emerald-400', label: 'Synced' };
      case 'syncing':
        return { dot: 'bg-amber-500', ping: 'bg-amber-400', label: 'Syncing...' };
      case 'error':
        return { dot: 'bg-rose-500', ping: 'bg-rose-400', label: 'Sync Error' };
      default:
        return { dot: 'bg-gray-400', ping: 'bg-gray-300', label: 'Local Only' };
    }
  };

  const status = getStatusColor();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-[var(--border-light)] px-4 py-3 md:hidden">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Glowing status dot + View Title + Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
            {syncStatus.state !== 'offline' && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.ping}`} />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.dot} shadow-xs shadow-current`} />
          </div>

          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-[var(--text-primary)] truncate flex items-center gap-1.5">
              {title}
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate flex items-center gap-1">
              <span>☁️</span>
              <span>Local Vault • {status.label}</span>
            </p>
          </div>
        </div>

        {/* Right: Quick search toggle + User/vault settings avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSearchToggle}
            className={`p-2 rounded-xl transition-all border ${
              isSearchActive
                ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--accent)]'
                : 'bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle Search"
            aria-label="Toggle Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSync}
            className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-indigo-500 p-[1.5px] shadow-sm hover:scale-105 active:scale-95 transition-transform"
            title="Vault Settings & Sync"
            aria-label="Vault Settings & Sync"
          >
            <div className="w-full h-full bg-[var(--bg-primary)] rounded-[10px] flex items-center justify-center text-[var(--text-primary)] hover:bg-transparent hover:text-white transition-colors">
              <User className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
