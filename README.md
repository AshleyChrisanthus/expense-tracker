# Glassmorphic Expense Tracker

A sleek, Apple-inspired glassmorphism expense tracking web app built with React, TypeScript, Tailwind CSS, and browser LocalStorage. Designed to effortlessly transition expense notes from Google Keep into structured financial insights.

![Glassmorphic Expense Tracker Banner](https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80)

---

## ✨ Features

- 📦 **Single-File Serverless Standalone HTML**:
  - Compiled using `vite-plugin-singlefile` directly into one self-contained `dist/index.html`.
  - Zero external CDN dependencies or servers: runnable instantly by double-clicking or loading via `file://`.
- 💾 **Local-First Dexie (IndexedDB) Architecture**:
  - Full client-side persistent database powered by Dexie.js (IndexedDB) with localStorage fallback synchronization.
- 🎨 **Tailwind CSS v4 & Glassmorphic Theme System**:
  - Powered by `@tailwindcss/vite` and Tailwind v4.
  - 7 curated presets (*Modern Apple, Ocean Sapphire, Cyberpunk Neon, Emerald Forest, Sunset Amber, Rose Velvet, Nordic Frost*).
  - Dark / Light mode switching with zero flash on reload.
  - Granular custom accent color picker.
- 💳 **Dynamic Payment Modes & Accounts**:
  - Bank Account, Forex Card, and Cash accounts pre-configured.
  - Add, edit, rename, recolor, and customize payment modes with custom icons and color swatches.
  - Filter transactions and view real-time spending breakdowns by payment mode.
- 🔄 **Transfers & Income Support**:
  - Record account transfers (e.g. from Forex Card to Bank Account) with transfer fees tracking (e.g. $7.50 fee).
  - Income and deposit tracking.
  - Expense status support (Completed vs Cancelled / Memo like uncollected amounts).
- 📅 **Google Keep Inspired Expense Feed**:
  - Automatically groups transactions by date with daily totals.
  - Pre-seeded with March 2024 expenses from Google Keep notes.
  - Instant search across descriptions, categories, amounts, and notes.
- 📥 **JSON Export & Import & Google Keep Parser**:
  - 1-click JSON backup export (`expenses-backup-YYYY-MM-DD.json`).
  - JSON file import with Merge or Replace options.
  - **Live Google Keep Text Parser**: Paste raw Keep note text directly to automatically parse dates, amounts, accounts, and descriptions.

---

## 🚀 Tech Stack

- **Framework**: React 18
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Database**: Dexie.js 4 (IndexedDB) + LocalStorage cache
- **Bundler**: Vite 6 + `vite-plugin-singlefile`
- **Icons**: Lucide React

---

## 🛠️ Getting Started

```bash
# Clone the repository
git clone https://github.com/AshleyChrisanthus/expense-tracker.git
cd expense-tracker

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📄 License

MIT
