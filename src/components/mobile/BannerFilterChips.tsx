import React from 'react';
import { Plus } from 'lucide-react';
import type { Banner, Transaction } from '../../types/expense';

interface BannerFilterChipsProps {
  banners: Banner[];
  selectedBannerFilter: string;
  onSelectBanner: (bannerId: string) => void;
  transactions: Transaction[];
  onManageBanners?: () => void;
}

export const BannerFilterChips: React.FC<BannerFilterChipsProps> = ({
  banners,
  selectedBannerFilter,
  onSelectBanner,
  transactions,
  onManageBanners
}) => {
  const totalCount = transactions.length;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
      {/* "All Banners" pill */}
      <button
        type="button"
        onClick={() => onSelectBanner('all')}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
          selectedBannerFilter === 'all'
            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 ring-1 ring-sky-400'
            : 'glass-subtle text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/40'
        }`}
      >
        <span>All Banners</span>
        <span className={`text-[11px] font-mono px-1 rounded-full ${
          selectedBannerFilter === 'all' ? 'bg-white/20 text-white' : 'opacity-70'
        }`}>
          {totalCount}
        </span>
      </button>

      {/* Individual Banners */}
      {banners.map((banner) => {
        const count = transactions.filter((t) => t.bannerIds?.includes(banner.id)).length;
        const isSelected = selectedBannerFilter === banner.id;

        return (
          <button
            key={banner.id}
            type="button"
            onClick={() => onSelectBanner(isSelected ? 'all' : banner.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              isSelected
                ? 'shadow-md ring-1 ring-white/30 text-white font-semibold'
                : 'glass-subtle text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/40'
            }`}
            style={isSelected ? { backgroundColor: banner.color } : {}}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-white' : ''}`}
              style={!isSelected ? { backgroundColor: banner.color } : {}}
            />
            <span className="truncate max-w-[140px]">{banner.name}</span>
            <span className={`text-[11px] font-mono ${isSelected ? 'text-white/90' : 'opacity-70 font-semibold'}`}>
              {count}
            </span>
          </button>
        );
      })}

      {onManageBanners && (
        <button
          type="button"
          onClick={onManageBanners}
          className="px-2.5 py-1.5 rounded-full border border-dashed border-[var(--border-light)] hover:border-[var(--accent)] text-xs text-[var(--accent)] flex items-center gap-1 shrink-0 cursor-pointer"
          title="Manage Banners"
        >
          <Plus className="w-3 h-3" />
          <span>Edit</span>
        </button>
      )}
    </div>
  );
};
