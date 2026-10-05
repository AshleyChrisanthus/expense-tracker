import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  CreditCard, 
  Landmark, 
  Banknote, 
  Wallet, 
  Coins, 
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { PaymentMode } from '../types/expense';

interface PaymentModesModalProps {
  isOpen: boolean;
  onClose: () => void;
  modes: PaymentMode[];
  onSaveModes: (modes: PaymentMode[]) => void;
}

const AVAILABLE_ICONS = [
  { id: 'landmark', label: 'Bank', icon: Landmark },
  { id: 'credit-card', label: 'Card', icon: CreditCard },
  { id: 'banknote', label: 'Cash', icon: Banknote },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'coins', label: 'Coins', icon: Coins },
  { id: 'smartphone', label: 'Digital', icon: Smartphone },
];

const PRESET_COLORS = [
  '#0a84ff', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f43f5e', '#64748b'
];

export const PaymentModesModal: React.FC<PaymentModesModalProps> = ({
  isOpen,
  onClose,
  modes,
  onSaveModes
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modeName, setModeName] = useState('');
  const [modeColor, setModeColor] = useState(PRESET_COLORS[0]);
  const [modeIcon, setModeIcon] = useState('credit-card');
  const [isAddingNew, setIsAddingNew] = useState(false);

  if (!isOpen) return null;

  const startEdit = (mode: PaymentMode) => {
    setEditingId(mode.id);
    setModeName(mode.name);
    setModeColor(mode.color);
    setModeIcon(mode.icon);
    setIsAddingNew(false);
  };

  const startCreate = () => {
    setEditingId(null);
    setModeName('');
    setModeColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setModeIcon('credit-card');
    setIsAddingNew(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modeName.trim()) return;

    if (isAddingNew) {
      const newMode: PaymentMode = {
        id: 'mode-' + Date.now(),
        name: modeName.trim(),
        color: modeColor,
        icon: modeIcon,
        isSystem: false
      };
      onSaveModes([...modes, newMode]);
      setIsAddingNew(false);
    } else if (editingId) {
      onSaveModes(
        modes.map(m => m.id === editingId ? { ...m, name: modeName.trim(), color: modeColor, icon: modeIcon } : m)
      );
      setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this payment mode? Existing transactions with this mode will remain preserved.')) {
      onSaveModes(modes.filter(m => m.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const getIconComponent = (iconId: string) => {
    const found = AVAILABLE_ICONS.find(i => i.id === iconId);
    const IconComp = found ? found.icon : CreditCard;
    return <IconComp className="w-4 h-4" />;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="glass-modal w-full max-w-lg rounded-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-light)] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent-bg)] text-[var(--accent)]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Manage Payment Modes</h2>
              <p className="text-xs text-[var(--text-secondary)]">Customize cards, bank accounts, and wallets</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Modes List */}
        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1">
          {modes.map((mode) => (
            <div
              key={mode.id}
              className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]"
            >
              <div className="flex items-center gap-3">
                <span 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: mode.color }}
                >
                  {getIconComponent(mode.icon)}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{mode.name}</span>
                    {mode.isSystem && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent)] flex items-center gap-1 font-mono">
                        <ShieldCheck className="w-3 h-3" /> default
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] font-mono">ID: {mode.id}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(mode)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Edit mode"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {!mode.isSystem && (
                  <button
                    type="button"
                    onClick={() => handleDelete(mode.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors"
                    title="Delete mode"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit Form */}
        {(isAddingNew || editingId) ? (
          <form onSubmit={handleSaveItem} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--accent)] mb-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              {isAddingNew ? 'Add New Payment Mode' : 'Edit Payment Mode'}
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Mode Name (e.g. Travel Forex, CommBank, Cash Wallet)
                </label>
                <input
                  type="text"
                  required
                  value={modeName}
                  onChange={(e) => setModeName(e.target.value)}
                  placeholder="e.g. Up Bank, Wise Forex, Cash"
                  className="apple-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Select Icon
                </label>
                <div className="flex items-center gap-2">
                  {AVAILABLE_ICONS.map((iconItem) => {
                    const IconComp = iconItem.icon;
                    const isSelected = modeIcon === iconItem.id;
                    return (
                      <button
                        key={iconItem.id}
                        type="button"
                        onClick={() => setModeIcon(iconItem.id)}
                        className={`p-2 rounded-lg border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]'
                            : 'border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                        }`}
                        title={iconItem.label}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Badge Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setModeColor(c)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                        modeColor === c ? 'scale-110 ring-2 ring-white/50' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {modeColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={modeColor}
                    onChange={(e) => setModeColor(e.target.value)}
                    className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0 p-0 ml-1"
                    title="Custom Color"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[var(--border-light)]">
              <button
                type="button"
                onClick={() => { setIsAddingNew(false); setEditingId(null); }}
                className="apple-btn apple-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="apple-btn apple-btn-primary text-xs"
              >
                Save Mode
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={startCreate}
            className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] text-[var(--accent)] hover:bg-[var(--accent-bg)] flex items-center justify-center gap-2 text-sm font-medium transition-all mb-4"
          >
            <Plus className="w-4 h-4" /> Add New Payment Mode
          </button>
        )}

        <div className="flex justify-end pt-3 border-t border-[var(--border-light)]">
          <button
            onClick={onClose}
            className="apple-btn apple-btn-secondary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
