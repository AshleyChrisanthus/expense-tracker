import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Tag, 
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { Transaction } from '../types/expense';
import { DEFAULT_CATEGORIES } from '../utils/storage';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  transactions: Transaction[];
  onSaveCategories: (categories: string[]) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
}

export const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  transactions,
  onSaveCategories,
  onRenameCategory
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Category "${trimmed}" already exists.`);
      return;
    }

    setErrorMessage(null);
    onSaveCategories([...categories, trimmed]);
    setNewCategoryName('');
  };

  const startEdit = (index: number, name: string) => {
    setEditingIndex(index);
    setEditingName(name);
    setErrorMessage(null);
  };

  const handleSaveEdit = (index: number) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    const oldName = categories[index];
    if (oldName === trimmed) {
      setEditingIndex(null);
      return;
    }

    if (categories.some((c, i) => i !== index && c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Category "${trimmed}" already exists.`);
      return;
    }

    setErrorMessage(null);
    onRenameCategory(oldName, trimmed);
    setEditingIndex(null);
  };

  const handleDelete = (categoryName: string) => {
    if (categories.length <= 1) {
      alert('You must have at least one category.');
      return;
    }

    const usageCount = transactions.filter(t => t.category === categoryName).length;
    const confirmMessage = usageCount > 0
      ? `"${categoryName}" is currently used in ${usageCount} transaction${usageCount === 1 ? '' : 's'}. Are you sure you want to remove it from the list? (Existing transactions will retain their record)`
      : `Are you sure you want to delete "${categoryName}"?`;

    if (confirm(confirmMessage)) {
      setErrorMessage(null);
      onSaveCategories(categories.filter(c => c !== categoryName));
      if (editingIndex !== null) setEditingIndex(null);
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm('Restore the default categories list? Custom categories you created will be merged.')) {
      const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]));
      onSaveCategories(merged);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="glass-modal w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl relative overflow-hidden shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (pinned at top) */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--border-light)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Manage Categories</h2>
              <p className="text-xs text-[var(--text-secondary)]">Add, edit, and remove transaction categories</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name (e.g. Gym, Subscriptions)"
                className="apple-input apple-input-with-icon pl-9 text-xs py-2"
              />
            </div>
            <button
              type="submit"
              className="apple-btn apple-btn-primary text-xs py-2 px-3 shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          {/* Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
              <span className="font-medium uppercase tracking-wider text-[11px]">Active Categories ({categories.length})</span>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1"
                title="Restore default category presets"
              >
                <RotateCcw className="w-3 h-3" /> Reset Defaults
              </button>
            </div>

            <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
              {categories.map((cat, index) => {
                const count = transactions.filter(t => t.category === cat).length;
                const isEditing = editingIndex === index;

                return (
                  <div
                    key={cat + '-' + index}
                    className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] hover:border-[var(--text-secondary)]/30 transition-all"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(index);
                            } else if (e.key === 'Escape') {
                              setEditingIndex(null);
                            }
                          }}
                          className="apple-input text-xs py-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(index)}
                          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                          title="Save category name"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {cat}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] font-mono shrink-0">
                            {count} tx{count === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(index, cat)}
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            title="Rename category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors"
                            title="Delete category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer (pinned at bottom) */}
        <div className="flex justify-end p-4 px-5 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]/60 backdrop-blur-md shrink-0">
          <button
            onClick={onClose}
            className="apple-btn apple-btn-secondary text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
