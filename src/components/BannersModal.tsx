import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Bookmark, 
  AlertCircle
} from 'lucide-react';
import { Banner, Transaction } from '../types/expense';

interface BannersModalProps {
  isOpen: boolean;
  onClose: () => void;
  banners: Banner[];
  transactions: Transaction[];
  onSaveBanners: (banners: Banner[]) => void;
  onDeleteBanner: (bannerId: string) => void;
}

const PRESET_BANNER_COLORS = [
  '#8b5cf6', // Purple / Violet
  '#0ea5e9', // Sky blue
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#a855f7', // Violet
  '#3b82f6', // Blue
  '#64748b'  // Slate
];

export const BannersModal: React.FC<BannersModalProps> = ({
  isOpen,
  onClose,
  banners,
  transactions,
  onSaveBanners,
  onDeleteBanner
}) => {
  const [newBannerName, setNewBannerName] = useState('');
  const [newBannerColor, setNewBannerColor] = useState(PRESET_BANNER_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState(PRESET_BANNER_COLORS[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBannerName.trim();
    if (!trimmed) return;

    if (banners.some(b => b.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Banner "${trimmed}" already exists.`);
      return;
    }

    setErrorMessage(null);
    const newBanner: Banner = {
      id: 'banner-' + Date.now(),
      name: trimmed,
      color: newBannerColor,
      createdAt: Date.now()
    };
    onSaveBanners([...banners, newBanner]);
    setNewBannerName('');
  };

  const startEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setEditingName(banner.name);
    setEditingColor(banner.color);
    setErrorMessage(null);
  };

  const handleSaveEdit = (bannerId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setErrorMessage('Banner name cannot be empty.');
      return;
    }

    if (banners.some(b => b.id !== bannerId && b.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Another banner named "${trimmed}" already exists.`);
      return;
    }

    setErrorMessage(null);
    const updated = banners.map(b => b.id === bannerId ? { ...b, name: trimmed, color: editingColor } : b);
    onSaveBanners(updated);
    setEditingId(null);
  };

  const handleDelete = (banner: Banner) => {
    const count = transactions.filter(t => t.bannerIds?.includes(banner.id)).length;
    const confirmText = count > 0
      ? `Delete banner "${banner.name}"? It is linked to ${count} transaction(s). They will be unlinked from this banner.`
      : `Delete banner "${banner.name}"?`;

    if (confirm(confirmText)) {
      onDeleteBanner(banner.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="apple-card w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-up border border-[var(--border-light)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-light)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                Manage Banners / Groups
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Group transactions under custom banners (e.g. Room Rent, Locations)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 min-h-0">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Add New Banner Form */}
          <form onSubmit={handleAddBanner} className="space-y-3 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
            <span className="text-xs font-semibold text-[var(--text-primary)] block">
              Create New Banner
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Room Rent in Gardiner, Essendon..."
                value={newBannerName}
                onChange={(e) => {
                  setNewBannerName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="apple-input text-xs flex-1"
                maxLength={40}
              />
              <button
                type="submit"
                disabled={!newBannerName.trim()}
                className="apple-btn apple-btn-primary text-xs shrink-0 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Color Selector */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-[var(--text-secondary)] mr-1">Color:</span>
              {PRESET_BANNER_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewBannerColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    newBannerColor === c ? 'scale-125 ring-2 ring-white shadow-sm' : 'hover:scale-110 opacity-75'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </form>

          {/* Existing Banners List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Active Banners ({banners.length})</span>
              <span>Linked Items</span>
            </div>

            {banners.length === 0 ? (
              <div className="text-center py-6 text-xs text-[var(--text-secondary)]">
                No banners yet. Create your first banner above!
              </div>
            ) : (
              <div className="space-y-2">
                {banners.map((banner) => {
                  const usageCount = transactions.filter(t => t.bannerIds?.includes(banner.id)).length;
                  const isEditing = editingId === banner.id;

                  if (isEditing) {
                    return (
                      <div 
                        key={banner.id}
                        className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--accent)] space-y-2.5 animate-fade-in"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="apple-input text-xs flex-1"
                            maxLength={40}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(banner.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(banner.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Edit Color Palette */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[11px] text-[var(--text-secondary)] mr-1">Color:</span>
                          {PRESET_BANNER_COLORS.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditingColor(c)}
                              className={`w-4 h-4 rounded-full transition-transform ${
                                editingColor === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110 opacity-75'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={banner.id}
                      className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] hover:border-[var(--text-secondary)]/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: banner.color }}
                        />
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {banner.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] font-mono font-medium">
                          {usageCount} {usageCount === 1 ? 'item' : 'items'}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startEdit(banner)}
                            className="p-1 rounded-md hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            title="Edit banner"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(banner)}
                            className="p-1 rounded-md hover:bg-rose-500/10 text-rose-400 transition-colors"
                            title="Delete banner"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--border-light)] flex justify-end shrink-0 bg-[var(--bg-primary)]">
          <button
            onClick={onClose}
            className="apple-btn apple-btn-secondary text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
