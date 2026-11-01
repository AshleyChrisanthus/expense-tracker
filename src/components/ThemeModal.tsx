import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sun, 
  Moon, 
  Palette, 
  RotateCcw, 
  Check, 
  Sparkles,
  Globe,
  Clock
} from 'lucide-react';
import type { ThemeMode, ThemePreset } from '../types/theme';
import { 
  THEME_PRESETS, 
  ACTIVE_PRESET_KEY, 
  CUSTOM_THEME_KEY,
  getActivePreset, 
  applyPresetPaletteForMode,
  applyCustomThemeProperties
} from '../styles/theme';
import {
  COMMON_TIMEZONES,
  getUserTimeZone,
  setUserTimeZone,
  getSystemTimeZone,
  getCachedUserTimeZone,
  formatLocalizedDateTime
} from '../utils/timezone';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: ThemeMode;
  onToggleMode: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onToggleMode
}) => {
  const [activePresetId, setActivePresetId] = useState<string>('default');
  const [customAccent, setCustomAccent] = useState<string>('');
  const [userTimezone, setUserTimezone] = useState<string>(() => getCachedUserTimeZone());
  const [timezoneNotice, setTimezoneNotice] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const active = getActivePreset();
      setActivePresetId(active.id);
      getUserTimeZone().then(tz => setUserTimezone(tz));
      
      const customColorsStr = localStorage.getItem(CUSTOM_THEME_KEY);
      if (customColorsStr) {
        try {
          const parsed = JSON.parse(customColorsStr);
          if (parsed['--accent']) {
            setCustomAccent(parsed['--accent']);
          }
        } catch {}
      }
    } else {
      setTimezoneNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTimezoneChange = async (tz: string) => {
    setUserTimezone(tz);
    await setUserTimeZone(tz);
    setTimezoneNotice({
      success: true,
      message: `Timezone updated to ${tz}. Recalculation updated instantly.`
    });
    setTimeout(() => setTimezoneNotice(null), 3500);
  };

  const handleUseSystemTimezone = async () => {
    const sysTz = getSystemTimeZone();
    setUserTimezone(sysTz);
    await setUserTimeZone(sysTz);
    setTimezoneNotice({
      success: true,
      message: `Reset to system browser timezone (${sysTz}).`
    });
    setTimeout(() => setTimezoneNotice(null), 3500);
  };

  const handleSelectPreset = (preset: ThemePreset) => {
    setActivePresetId(preset.id);
    localStorage.setItem(ACTIVE_PRESET_KEY, preset.id);
    localStorage.removeItem(CUSTOM_THEME_KEY);
    setCustomAccent('');
    applyPresetPaletteForMode(currentMode);
  };

  const handleCustomAccentChange = (color: string) => {
    setCustomAccent(color);
    const overrides = {
      '--accent': color,
      '--accent-hover': color,
      '--accent-bg': `${color}20`,
      '--tag-text': color,
      '--tag-bg': `${color}25`
    };
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(overrides));
    applyCustomThemeProperties(overrides);
  };

  const handleReset = () => {
    localStorage.removeItem(CUSTOM_THEME_KEY);
    localStorage.setItem(ACTIVE_PRESET_KEY, 'default');
    setActivePresetId('default');
    setCustomAccent('');
    applyPresetPaletteForMode(currentMode);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="glass-modal w-full max-w-lg rounded-2xl p-6 relative overflow-hidden text-left max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-light)] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent-bg)] text-[var(--accent)]">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Theme &amp; Localization</h2>
              <p className="text-xs text-[var(--text-secondary)]">Personalize your glassmorphic interface and timezone schedule</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] mb-6">
          <div className="flex items-center gap-3">
            {currentMode === 'dark' ? (
              <Moon className="w-5 h-5 text-[var(--accent)]" />
            ) : (
              <Sun className="w-5 h-5 text-[var(--warning)]" />
            )}
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                {currentMode} Mode
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {currentMode === 'dark' ? 'Deep dark glass and crisp contrast' : 'Soft porcelain glass and light shadows'}
              </p>
            </div>
          </div>
          <button
            onClick={onToggleMode}
            className="apple-btn apple-btn-secondary text-xs px-3.5 py-1.5 font-medium"
          >
            Switch to {currentMode === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* Presets Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Presets ({THEME_PRESETS.length})
            </span>
            <button
              onClick={handleReset}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {THEME_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              const swatches = preset.swatches[currentMode] || preset.swatches.dark;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected 
                      ? 'border-[var(--accent)] bg-[var(--accent-bg)] shadow-sm' 
                      : 'border-[var(--border-light)] bg-[var(--bg-secondary)] hover:border-[var(--text-secondary)]/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[var(--accent)]" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {swatches.map((color, idx) => (
                      <span
                        key={idx}
                        className="w-4 h-4 rounded-full border border-black/10 inline-block"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Accent Color Picker */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">Custom Accent Tint</span>
            </div>
            {customAccent && (
              <span className="text-xs text-[var(--accent)] font-mono">{customAccent}</span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Tweak the highlight colors to match your taste
          </p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customAccent || '#0a84ff'}
              onChange={(e) => handleCustomAccentChange(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0"
            />
            <div className="flex flex-wrap gap-2">
              {['#0a84ff', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'].map((hex) => (
                <button
                  key={hex}
                  onClick={() => handleCustomAccentChange(hex)}
                  className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Timezone & Localization Section (Issue #25) */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">Timezone &amp; Schedule Clock</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30 font-medium">
              Live Local Time
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
            Recurring bills, due date countdowns, and Keep note parsers align with this schedule.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
            <select
              value={userTimezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-medium cursor-pointer"
            >
              <option value={getSystemTimeZone()}>Auto-Detect (System: {getSystemTimeZone()})</option>
              {COMMON_TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleUseSystemTimezone}
              className="apple-btn apple-btn-secondary text-xs px-3 py-2 shrink-0 font-medium cursor-pointer"
              title="Reset to system browser timezone"
            >
              Use System
            </button>
          </div>

          {/* Current Local Date/Time Preview */}
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)]/80 border border-[var(--border-light)]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Current Time:</span>
            </div>
            <span className="font-mono text-[var(--text-primary)] font-medium">
              {formatLocalizedDateTime(Date.now(), userTimezone)}
            </span>
          </div>

          {timezoneNotice && (
            <div className="mt-2.5 p-2 rounded-lg text-xs flex items-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium animate-in fade-in">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{timezoneNotice.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="apple-btn apple-btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
