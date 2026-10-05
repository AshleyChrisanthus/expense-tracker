import type { ThemeTokens, ThemePreset, ThemeMode, RgbColor } from '../types/theme';

export const THEME_KEY = 'app_theme';
export const ACTIVE_PRESET_KEY = 'app_active_preset';
export const CUSTOM_THEME_KEY = 'app_custom_colors';
export const TAG_COLORS_KEY = 'app_tag_colors';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Modern Apple',
    desc: 'Clean porcelain slate & sleek dark glassmorphism',
    dark: {
      '--bg-primary': '#0d0d0f',
      '--bg-secondary': '#1c1c1e',
      '--bg-tertiary': '#2c2c2e',
      '--card-bg': '#1c1c1e',
      '--card-border': '#2c2c2e',
      '--bg-hover': '#3a3a3c',
      '--text-primary': '#f5f5f7',
      '--text-secondary': '#a1a1a6',
      '--border-light': '#2c2c2e',
      '--accent': '#0a84ff',
      '--accent-hover': '#409cff',
      '--accent-bg': 'rgba(10,132,255,0.12)',
      '--tag-bg': 'rgba(10,132,255,0.15)',
      '--tag-text': '#0a84ff'
    },
    light: {
      '--bg-primary': '#f5f5f7',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#f0f0f2',
      '--card-bg': '#ffffff',
      '--card-border': '#e5e5ea',
      '--bg-hover': '#e8e8ec',
      '--text-primary': '#1d1d1f',
      '--text-secondary': '#6e6e73',
      '--border-light': '#e5e5ea',
      '--accent': '#0071e3',
      '--accent-hover': '#0077ed',
      '--accent-bg': 'rgba(0,113,227,0.08)',
      '--tag-bg': 'rgba(0,113,227,0.1)',
      '--tag-text': '#0071e3'
    },
    swatches: {
      dark: ['#0d0d0f', '#1c1c1e', '#0a84ff', '#f5f5f7'],
      light: ['#f5f5f7', '#ffffff', '#0071e3', '#1d1d1f']
    }
  },
  {
    id: 'midnight-sapphire',
    name: 'Ocean Sapphire',
    desc: 'Deep navy obsidian & crisp polar azure',
    dark: {
      '--bg-primary': '#0b1329',
      '--bg-secondary': '#111c44',
      '--bg-tertiary': '#152259',
      '--card-bg': '#152259',
      '--card-border': '#1e2f75',
      '--bg-hover': '#1e2f75',
      '--text-primary': '#f0f9ff',
      '--text-secondary': '#94a3b8',
      '--border-light': '#1e293b',
      '--accent': '#38bdf8',
      '--accent-hover': '#7dd3fc',
      '--accent-bg': 'rgba(56,189,248,0.12)',
      '--tag-bg': 'rgba(56,189,248,0.15)',
      '--tag-text': '#38bdf8'
    },
    light: {
      '--bg-primary': '#f0f7ff',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#e0f0fe',
      '--card-bg': '#ffffff',
      '--card-border': '#d0e5f9',
      '--bg-hover': '#e0f0fe',
      '--text-primary': '#0c2744',
      '--text-secondary': '#486581',
      '--border-light': '#d0e5f9',
      '--accent': '#0284c7',
      '--accent-hover': '#0369a1',
      '--accent-bg': 'rgba(2,132,199,0.08)',
      '--tag-bg': 'rgba(2,132,199,0.12)',
      '--tag-text': '#0284c7'
    },
    swatches: {
      dark: ['#0b1329', '#152259', '#38bdf8', '#f0f9ff'],
      light: ['#f0f7ff', '#ffffff', '#0284c7', '#0c2744']
    }
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    desc: 'Onyx night & vivid fuchsia / magenta',
    dark: {
      '--bg-primary': '#09090b',
      '--bg-secondary': '#18181b',
      '--bg-tertiary': '#27272a',
      '--card-bg': '#18181b',
      '--card-border': '#27272a',
      '--bg-hover': '#27272a',
      '--text-primary': '#fafafa',
      '--text-secondary': '#a1a1aa',
      '--border-light': '#27272a',
      '--accent': '#ec4899',
      '--accent-hover': '#f472b6',
      '--accent-bg': 'rgba(236,72,153,0.12)',
      '--tag-bg': 'rgba(236,72,153,0.18)',
      '--tag-text': '#f472b6'
    },
    light: {
      '--bg-primary': '#fdf4f8',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#fce7f3',
      '--card-bg': '#ffffff',
      '--card-border': '#fbcfe8',
      '--bg-hover': '#fce7f3',
      '--text-primary': '#3f0c2c',
      '--text-secondary': '#831843',
      '--border-light': '#fbcfe8',
      '--accent': '#db2777',
      '--accent-hover': '#be185d',
      '--accent-bg': 'rgba(219,39,119,0.08)',
      '--tag-bg': 'rgba(219,39,119,0.12)',
      '--tag-text': '#db2777'
    },
    swatches: {
      dark: ['#09090b', '#18181b', '#ec4899', '#fafafa'],
      light: ['#fdf4f8', '#ffffff', '#db2777', '#3f0c2c']
    }
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    desc: 'Deep pine woods & fresh botanical sage',
    dark: {
      '--bg-primary': '#041c14',
      '--bg-secondary': '#062c20',
      '--bg-tertiary': '#0b3b2c',
      '--card-bg': '#0b3b2c',
      '--card-border': '#124e3c',
      '--bg-hover': '#124e3c',
      '--text-primary': '#ecfdf5',
      '--text-secondary': '#a7f3d0',
      '--border-light': '#064e3b',
      '--accent': '#10b981',
      '--accent-hover': '#34d399',
      '--accent-bg': 'rgba(16,185,129,0.12)',
      '--tag-bg': 'rgba(16,185,129,0.18)',
      '--tag-text': '#34d399'
    },
    light: {
      '--bg-primary': '#f0fdf4',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#dcfce7',
      '--card-bg': '#ffffff',
      '--card-border': '#bbf7d0',
      '--bg-hover': '#dcfce7',
      '--text-primary': '#064e3b',
      '--text-secondary': '#047857',
      '--border-light': '#bbf7d0',
      '--accent': '#059669',
      '--accent-hover': '#047857',
      '--accent-bg': 'rgba(5,150,105,0.08)',
      '--tag-bg': 'rgba(5,150,105,0.12)',
      '--tag-text': '#059669'
    },
    swatches: {
      dark: ['#041c14', '#0b3b2c', '#10b981', '#ecfdf5'],
      light: ['#f0fdf4', '#ffffff', '#059669', '#064e3b']
    }
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    desc: 'Volcanic charcoal & warm coral sand',
    dark: {
      '--bg-primary': '#1c1917',
      '--bg-secondary': '#292524',
      '--bg-tertiary': '#44403c',
      '--card-bg': '#292524',
      '--card-border': '#44403c',
      '--bg-hover': '#44403c',
      '--text-primary': '#fafaf9',
      '--text-secondary': '#a8a29e',
      '--border-light': '#44403c',
      '--accent': '#f97316',
      '--accent-hover': '#fb923c',
      '--accent-bg': 'rgba(249,115,22,0.12)',
      '--tag-bg': 'rgba(249,115,22,0.18)',
      '--tag-text': '#fb923c'
    },
    light: {
      '--bg-primary': '#fff7ed',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#ffedd5',
      '--card-bg': '#ffffff',
      '--card-border': '#fed7aa',
      '--bg-hover': '#ffedd5',
      '--text-primary': '#431407',
      '--text-secondary': '#9a3412',
      '--border-light': '#fed7aa',
      '--accent': '#ea580c',
      '--accent-hover': '#c2410c',
      '--accent-bg': 'rgba(234,88,12,0.08)',
      '--tag-bg': 'rgba(234,88,12,0.12)',
      '--tag-text': '#ea580c'
    },
    swatches: {
      dark: ['#1c1917', '#292524', '#f97316', '#fafaf9'],
      light: ['#fff7ed', '#ffffff', '#ea580c', '#431407']
    }
  },
  {
    id: 'rose-velvet',
    name: 'Rose Velvet',
    desc: 'Plum midnight & delicate blush rosé',
    dark: {
      '--bg-primary': '#1a101f',
      '--bg-secondary': '#291830',
      '--bg-tertiary': '#3d2348',
      '--card-bg': '#291830',
      '--card-border': '#4c1d35',
      '--bg-hover': '#3d2348',
      '--text-primary': '#fff1f2',
      '--text-secondary': '#fda4af',
      '--border-light': '#4c1d35',
      '--accent': '#f43f5e',
      '--accent-hover': '#fb7185',
      '--accent-bg': 'rgba(244,63,94,0.12)',
      '--tag-bg': 'rgba(244,63,94,0.18)',
      '--tag-text': '#fb7185'
    },
    light: {
      '--bg-primary': '#fff1f2',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#ffe4e6',
      '--card-bg': '#ffffff',
      '--card-border': '#fecdd3',
      '--bg-hover': '#ffe4e6',
      '--text-primary': '#4c0519',
      '--text-secondary': '#9f1239',
      '--border-light': '#fecdd3',
      '--accent': '#e11d48',
      '--accent-hover': '#be123c',
      '--accent-bg': 'rgba(225,29,72,0.08)',
      '--tag-bg': 'rgba(225,29,72,0.12)',
      '--tag-text': '#e11d48'
    },
    swatches: {
      dark: ['#1a101f', '#291830', '#f43f5e', '#fff1f2'],
      light: ['#fff1f2', '#ffffff', '#e11d48', '#4c0519']
    }
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    desc: 'Polar slate & icy Scandinavian breeze',
    dark: {
      '--bg-primary': '#242933',
      '--bg-secondary': '#2e3440',
      '--bg-tertiary': '#3b4252',
      '--card-bg': '#2e3440',
      '--card-border': '#3b4252',
      '--bg-hover': '#3b4252',
      '--text-primary': '#eceff4',
      '--text-secondary': '#d8dee9',
      '--border-light': '#3b4252',
      '--accent': '#88c0d0',
      '--accent-hover': '#81a1c1',
      '--accent-bg': 'rgba(136,192,208,0.12)',
      '--tag-bg': 'rgba(136,192,208,0.18)',
      '--tag-text': '#88c0d0'
    },
    light: {
      '--bg-primary': '#f4f6f9',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#e5e9f0',
      '--card-bg': '#ffffff',
      '--card-border': '#d8dee9',
      '--bg-hover': '#e5e9f0',
      '--text-primary': '#2e3440',
      '--text-secondary': '#4c566a',
      '--border-light': '#d8dee9',
      '--accent': '#5e81ac',
      '--accent-hover': '#81a1c1',
      '--accent-bg': 'rgba(94,129,172,0.08)',
      '--tag-bg': 'rgba(94,129,172,0.12)',
      '--tag-text': '#5e81ac'
    },
    swatches: {
      dark: ['#242933', '#2e3440', '#88c0d0', '#eceff4'],
      light: ['#f4f6f9', '#ffffff', '#5e81ac', '#2e3440']
    }
  }
];

export function hexToRgb(hex?: string | null): RgbColor | null {
  if (!hex) return null;
  let clean = hex.replace('#', '');
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function getActivePreset(): ThemePreset {
  const id = localStorage.getItem(ACTIVE_PRESET_KEY) || 'default';
  return THEME_PRESETS.find(p => p.id === id) || THEME_PRESETS[0];
}

export function applyCustomThemeProperties(colorsObj?: Partial<ThemeTokens> | Record<string, string | undefined> | null): void {
  if (!colorsObj) return;
  const root = document.documentElement;
  Object.entries(colorsObj).forEach(([prop, val]) => {
    if (val) root.style.setProperty(prop, val);
  });
}

export function applyPresetPaletteForMode(mode: ThemeMode = 'dark'): void {
  const preset = getActivePreset();
  const colors = preset[mode] || preset.dark;
  const root = document.documentElement;
  Object.entries(colors).forEach(([prop, val]) => {
    if (val) root.style.setProperty(prop, val);
  });
  
  // Apply saved custom overrides if any
  try {
    const custom = localStorage.getItem(CUSTOM_THEME_KEY);
    if (custom) applyCustomThemeProperties(JSON.parse(custom));
  } catch {}
}

export function initTheme(): ThemeMode {
  const savedMode = (localStorage.getItem(THEME_KEY) as ThemeMode) || 'dark';
  document.documentElement.setAttribute('data-theme', savedMode);
  applyPresetPaletteForMode(savedMode);
  return savedMode;
}

export function toggleThemeMode(): ThemeMode {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  applyPresetPaletteForMode(next);
  return next;
}
