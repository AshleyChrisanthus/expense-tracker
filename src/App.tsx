import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Palette, 
  Sun, 
  Moon, 
  CreditCard, 
  FileJson, 
  Search, 
  TrendingDown, 
  TrendingUp, 
  ArrowRightLeft, 
  Calendar, 
  Trash2, 
  Edit3, 
  Wallet, 
  Landmark, 
  Banknote, 
  Coins, 
  Smartphone, 
  Sparkles 
} from 'lucide-react';

import { ThemeMode } from './types/theme';
import { toggleThemeMode } from './styles/theme';
import { ThemeModal } from './components/ThemeModal';
import { Transaction, PaymentMode, ExpenseDataState } from './types/expense';
import { loadExpenseData, saveExpenseData } from './utils/storage';
import { TransactionModal } from './components/TransactionModal';
import { PaymentModesModal } from './components/PaymentModesModal';
import { ImportExportModal } from './components/ImportExportModal';
import { db } from './db';

export const App: React.FC = () => {
  // Theme state
  const [currentMode, setCurrentMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('app_theme') as ThemeMode) || 'dark';
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // App data state (stored in Dexie IndexedDB + localStorage sync)
  const [dataState, setDataState] = useState<ExpenseDataState>(() => loadExpenseData());

  // Modal states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isModesModalOpen, setIsModesModalOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

  // Load from Dexie on mount
  useEffect(() => {
    db.initDatabase().then(initResult => {
      setDataState({
        version: 1,
        transactions: initResult.transactions,
        paymentModes: initResult.paymentModes,
        categories: initResult.categories
      });
    }).catch(err => {
      console.warn('Dexie IndexedDB initialization fallback:', err);
    });
  }, []);

  // Save changes to localStorage cache
  useEffect(() => {
    saveExpenseData(dataState);
  }, [dataState]);

  // Handle Theme Toggle
  const handleToggleTheme = () => {
    const next = toggleThemeMode();
    setCurrentMode(next);
  };

  // Payment mode icon helper
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

  // Transaction CRUD handlers
  const handleSaveTransaction = async (transaction: Transaction) => {
    try {
      await db.putTransaction(transaction);
    } catch (e) {
      console.error('Dexie save transaction failed:', e);
    }

    setDataState(prev => {
      const exists = prev.transactions.some(t => t.id === transaction.id);
      const newTransactions = exists
        ? prev.transactions.map(t => t.id === transaction.id ? transaction : t)
        : [transaction, ...prev.transactions];

      const newCategories = transaction.category && !prev.categories.includes(transaction.category)
        ? [...prev.categories, transaction.category]
        : prev.categories;

      return {
        ...prev,
        transactions: newTransactions,
        categories: newCategories
      };
    });
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Delete this transaction?')) {
      try {
        await db.deleteTransaction(id);
      } catch (e) {
        console.error('Dexie delete transaction failed:', e);
      }

      setDataState(prev => ({
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id)
      }));
    }
  };

  const handleSavePaymentModes = async (modes: PaymentMode[]) => {
    try {
      await db.savePaymentModes(modes);
    } catch (e) {
      console.error('Dexie save modes failed:', e);
    }

    setDataState(prev => ({
      ...prev,
      paymentModes: modes
    }));
  };

  const handleUpdateDataState = async (newState: ExpenseDataState) => {
    try {
      await db.importData(newState, 'replace');
    } catch (e) {
      console.error('Dexie import failed:', e);
    }
    setDataState(newState);
  };

  // Available months from data for filter dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    dataState.transactions.forEach(t => {
      if (t.date) {
        months.add(t.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort().reverse();
  }, [dataState.transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return dataState.transactions.filter(tx => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(q);
        const matchesCategory = tx.category.toLowerCase().includes(q);
        const matchesNotes = tx.notes ? tx.notes.toLowerCase().includes(q) : false;
        const matchesAmount = tx.amount.toString().includes(q);
        if (!matchesDesc && !matchesCategory && !matchesNotes && !matchesAmount) {
          return false;
        }
      }

      // Mode filter
      if (selectedModeFilter !== 'all') {
        if (tx.paymentModeId !== selectedModeFilter && tx.toPaymentModeId !== selectedModeFilter) {
          return false;
        }
      }

      // Type filter
      if (selectedTypeFilter !== 'all' && tx.type !== selectedTypeFilter) {
        return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'all' && tx.category !== selectedCategoryFilter) {
        return false;
      }

      // Month filter
      if (selectedMonthFilter !== 'all' && !tx.date.startsWith(selectedMonthFilter)) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt);
  }, [dataState.transactions, searchQuery, selectedModeFilter, selectedTypeFilter, selectedCategoryFilter, selectedMonthFilter]);

  // Group transactions by Date (like Google Keep notes format)
  const groupedTransactions = useMemo(() => {
    const groups: { date: string; displayDate: string; items: Transaction[]; dayTotal: number }[] = [];
    const dateMap = new Map<string, Transaction[]>();

    filteredTransactions.forEach(tx => {
      const d = tx.date;
      if (!dateMap.has(d)) {
        dateMap.set(d, []);
      }
      dateMap.get(d)!.push(tx);
    });

    dateMap.forEach((items, dateStr) => {
      // format display date e.g. "March 31, 2024"
      const parts = dateStr.split('-');
      let displayDate = dateStr;
      if (parts.length === 3) {
        const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        displayDate = dObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }

      // Day total only calculates completed expenses
      const dayTotal = items.reduce((acc, curr) => {
        if (curr.type === 'expense' && curr.status !== 'cancelled') {
          return acc + curr.amount;
        }
        return acc;
      }, 0);

      groups.push({
        date: dateStr,
        displayDate,
        items,
        dayTotal
      });
    });

    return groups;
  }, [filteredTransactions]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    let totalTransfers = 0;
    let transferFees = 0;

    const modeSpending: Record<string, number> = {};
    dataState.paymentModes.forEach(m => {
      modeSpending[m.id] = 0;
    });

    dataState.transactions.forEach(t => {
      if (t.status === 'cancelled') return;

      if (t.type === 'expense') {
        totalExpense += t.amount;
        if (modeSpending[t.paymentModeId] !== undefined) {
          modeSpending[t.paymentModeId] += t.amount;
        }
      } else if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'transfer') {
        totalTransfers += t.amount;
        if (t.fee) transferFees += t.fee;
      }
    });

    return {
      totalExpense,
      totalIncome,
      totalTransfers,
      transferFees,
      modeSpending
    };
  }, [dataState]);

  return (
    <div className="min-h-screen pb-16">
      {/* Top Glass Header */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-[var(--border-light)] px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-indigo-500 flex items-center justify-center text-white shadow-md shadow-[var(--accent)]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                Expense Tracker
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30">
                  Glassmorphism
                </span>
              </h1>
              <p className="text-xs text-[var(--text-secondary)] hidden sm:block">
                Browser local storage & Keep notes companion
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingTx(null); setIsTxModalOpen(true); }}
              className="apple-btn apple-btn-primary text-xs sm:text-sm font-semibold shadow-sm"
              title="Add New Transaction"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Transaction</span>
            </button>

            <button
              onClick={() => setIsModesModalOpen(true)}
              className="apple-btn apple-btn-secondary text-xs sm:text-sm font-medium"
              title="Manage Payment Modes"
            >
              <CreditCard className="w-4 h-4 text-[var(--accent)]" />
              <span className="hidden md:inline">Payment Modes</span>
            </button>

            <button
              onClick={() => setIsImportExportOpen(true)}
              className="apple-btn apple-btn-secondary text-xs sm:text-sm font-medium"
              title="Export or Import JSON Data"
            >
              <FileJson className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline">JSON & Backup</span>
            </button>

            <button
              onClick={() => setIsThemeModalOpen(true)}
              className="apple-btn apple-btn-secondary text-xs sm:text-sm font-medium p-2"
              title="Theme Customizer"
            >
              <Palette className="w-4 h-4 text-[var(--accent)]" />
            </button>

            <button
              onClick={handleToggleTheme}
              className="apple-btn apple-btn-secondary text-xs sm:text-sm font-medium p-2"
              title={`Switch to ${currentMode === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {currentMode === 'dark' ? (
                <Moon className="w-4 h-4 text-[var(--accent)]" />
              ) : (
                <Sun className="w-4 h-4 text-[var(--warning)]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        
        {/* Metric Cards Banner */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Total Income */}
          <div className="apple-card p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Total Income</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
              +${metrics.totalIncome.toFixed(2)}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              {dataState.transactions.filter(t => t.type === 'income' && t.status !== 'cancelled').length} income deposits
            </p>
          </div>

          {/* Total Expense */}
          <div className="apple-card p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Total Expenses</span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-400 font-mono">
              -${metrics.totalExpense.toFixed(2)}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              {dataState.transactions.filter(t => t.type === 'expense' && t.status !== 'cancelled').length} recorded expenses
            </p>
          </div>

          {/* Mode Breakdown - Bank */}
          <div className="apple-card p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Paid via Bank</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Landmark className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-mono">
              ${(metrics.modeSpending['bank'] || 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Direct bank debit
            </p>
          </div>

          {/* Mode Breakdown - Forex */}
          <div className="apple-card p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Paid via Forex</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-mono">
              ${(metrics.modeSpending['forex'] || 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Forex card spend
            </p>
          </div>

          {/* Transfers & Cash */}
          <div className="apple-card p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Cash & Transfers</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-mono">
              ${(metrics.modeSpending['cash'] || 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              +${metrics.totalTransfers.toFixed(0)} transfers
            </p>
          </div>
        </section>

        {/* Quick Payment Modes Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider shrink-0 mr-1">
            Accounts:
          </span>
          {dataState.paymentModes.map(mode => {
            const spent = metrics.modeSpending[mode.id] || 0;
            const isSelected = selectedModeFilter === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedModeFilter(isSelected ? 'all' : mode.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all shrink-0 ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--text-primary)] shadow-sm'
                    : 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]/30'
                }`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: mode.color }}
                />
                <span className="font-medium">{mode.name}</span>
                <span className="font-mono text-[11px] opacity-75">${spent.toFixed(2)}</span>
              </button>
            );
          })}
          <button
            onClick={() => setIsModesModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl border border-dashed border-[var(--border-light)] hover:border-[var(--accent)] text-xs text-[var(--accent)] flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Edit Modes
          </button>
        </div>

        {/* Filters and Search Bar */}
        <section className="apple-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rent, grocery..."
                className="apple-input pl-9 text-xs"
              />
            </div>

            {/* Filter by Type */}
            <div>
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="apple-input text-xs"
              >
                <option value="all">All Types (Expenses, Transfers, Income)</option>
                <option value="expense">Expenses Only</option>
                <option value="transfer">Transfers Only</option>
                <option value="income">Income / Deposits Only</option>
              </select>
            </div>

            {/* Filter by Mode */}
            <div>
              <select
                value={selectedModeFilter}
                onChange={(e) => setSelectedModeFilter(e.target.value)}
                className="apple-input text-xs"
              >
                <option value="all">All Payment Modes</option>
                {dataState.paymentModes.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Filter by Category */}
            <div>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="apple-input text-xs"
              >
                <option value="all">All Categories</option>
                {dataState.categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter by Month */}
            <div>
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="apple-input text-xs"
              >
                <option value="all">All Months</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Tags */}
          {(selectedModeFilter !== 'all' || selectedCategoryFilter !== 'all' || selectedMonthFilter !== 'all' || searchQuery.trim()) && (
            <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-light)] text-xs text-[var(--text-secondary)] flex-wrap">
              <span>Active filters:</span>
              {selectedModeFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-medium">
                  Mode: {dataState.paymentModes.find(m => m.id === selectedModeFilter)?.name}
                </span>
              )}
              {selectedCategoryFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-medium">
                  Category: {selectedCategoryFilter}
                </span>
              )}
              {selectedMonthFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-medium">
                  Month: {selectedMonthFilter}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-medium">
                  Query: "{searchQuery}"
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedModeFilter('all');
                  setSelectedCategoryFilter('all');
                  setSelectedMonthFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs text-rose-400 hover:underline ml-2"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>

        {/* Transactions List Grouped by Date (Google Keep style) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--accent)]" />
              Expense Feed
              <span className="text-xs font-normal text-[var(--text-secondary)] font-mono">
                ({filteredTransactions.length} items)
              </span>
            </h2>
          </div>

          {groupedTransactions.length === 0 ? (
            <div className="apple-card p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-bg)] text-[var(--accent)] flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-medium text-[var(--text-primary)]">No transactions found</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                No records match your active search or filters. You can clear filters or add a new transaction.
              </p>
              <button
                onClick={() => {
                  setSelectedModeFilter('all');
                  setSelectedCategoryFilter('all');
                  setSelectedMonthFilter('all');
                  setSearchQuery('');
                }}
                className="apple-btn apple-btn-secondary text-xs"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            groupedTransactions.map((group) => (
              <div key={group.date} className="space-y-2.5">
                {/* Date Header Group with Day Total */}
                <div className="flex items-center justify-between px-2 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {group.displayDate}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                      ({group.items.length} {group.items.length === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                  {group.dayTotal > 0 && (
                    <div className="text-xs font-semibold text-[var(--text-secondary)] font-mono">
                      Day Total: <span className="text-[var(--text-primary)] font-bold">${group.dayTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Items in Day */}
                <div className="space-y-2">
                  {group.items.map((tx) => {
                    const mode = dataState.paymentModes.find(m => m.id === tx.paymentModeId);
                    const toMode = tx.toPaymentModeId ? dataState.paymentModes.find(m => m.id === tx.toPaymentModeId) : null;
                    const isCancelled = tx.status === 'cancelled';

                    return (
                      <div
                        key={tx.id}
                        className={`apple-card apple-card-interactive p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCancelled ? 'opacity-55' : ''
                        }`}
                      >
                        {/* Left: Indicator, Mode badge, Description, and Details */}
                        <div className="flex items-start sm:items-center gap-3.5">
                          {/* Type icon avatar */}
                          <div 
                            className={`p-2.5 rounded-xl shrink-0 mt-0.5 sm:mt-0 ${
                              tx.type === 'expense'
                                ? 'bg-rose-500/10 text-rose-400'
                                : tx.type === 'income'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-purple-500/10 text-purple-400'
                            }`}
                          >
                            {tx.type === 'expense' && <TrendingDown className="w-4 h-4" />}
                            {tx.type === 'income' && <TrendingUp className="w-4 h-4" />}
                            {tx.type === 'transfer' && <ArrowRightLeft className="w-4 h-4" />}
                          </div>

                          {/* Info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${isCancelled ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                                {tx.description}
                              </span>

                              {/* Mode badge */}
                              {mode && (
                                <span 
                                  className="text-[11px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 border border-black/10 text-white"
                                  style={{ backgroundColor: mode.color }}
                                >
                                  {renderModeIcon(mode.icon, "w-3 h-3")}
                                  {mode.name}
                                </span>
                              )}

                              {/* Transfer Destination Mode */}
                              {toMode && (
                                <span 
                                  className="text-[11px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 border border-black/10 text-white"
                                  style={{ backgroundColor: toMode.color }}
                                >
                                  → {toMode.name}
                                </span>
                              )}

                              {/* Category tag */}
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)] font-medium">
                                {tx.category}
                              </span>

                              {/* Cancelled badge */}
                              {isCancelled && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                  Not Deducted
                                </span>
                              )}
                            </div>

                            {/* Additional notes & transfer fees */}
                            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] flex-wrap">
                              {tx.notes && (
                                <span className="italic">Note: "{tx.notes}"</span>
                              )}
                              {tx.fee !== undefined && tx.fee > 0 && (
                                <span className="text-purple-400 font-mono font-medium">
                                  (+${tx.fee.toFixed(2)} transfer fee)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount and Action Buttons */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-11 sm:pl-0">
                          <div className="text-right">
                            <span 
                              className={`text-base sm:text-lg font-bold font-mono ${
                                isCancelled 
                                  ? 'text-[var(--text-secondary)] line-through' 
                                  : tx.type === 'expense' 
                                  ? 'text-rose-400' 
                                  : tx.type === 'income' 
                                  ? 'text-emerald-400' 
                                  : 'text-purple-400'
                              }`}
                            >
                              {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}${tx.amount.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditingTx(tx); setIsTxModalOpen(true); }}
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              title="Edit transaction"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* Modals */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentMode={currentMode}
        onToggleMode={handleToggleTheme}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => { setIsTxModalOpen(false); setEditingTx(null); }}
        onSave={handleSaveTransaction}
        modes={dataState.paymentModes}
        categories={dataState.categories}
        initialTransaction={editingTx}
      />

      <PaymentModesModal
        isOpen={isModesModalOpen}
        onClose={() => setIsModesModalOpen(false)}
        modes={dataState.paymentModes}
        onSaveModes={handleSavePaymentModes}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        currentState={dataState}
        onUpdateState={handleUpdateDataState}
      />
    </div>
  );
};

export default App;
