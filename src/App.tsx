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
  Sparkles,
  Repeat,
  Bell,
  Check,
  Clock,
  Tag,
  Bookmark,
  CheckSquare,
  GitCommit,
  ChevronDown,
  BarChart3
} from 'lucide-react';

import { ThemeMode } from './types/theme';
import { toggleThemeMode } from './styles/theme';
import { ThemeModal } from './components/ThemeModal';
import { Transaction, PaymentMode, ExpenseDataState, Banner } from './types/expense';
import { loadExpenseData, saveExpenseData } from './utils/storage';
import { TransactionModal } from './components/TransactionModal';
import { PaymentModesModal } from './components/PaymentModesModal';
import { CategoriesModal } from './components/CategoriesModal';
import { BannersModal } from './components/BannersModal';
import { ImportExportModal } from './components/ImportExportModal';
import { VisualAnalytics } from './components/VisualAnalytics';
import { db } from './db';
import { 
  getRecurrenceDueInfo, 
  formatRecurrenceLabel, 
  computeNextDueDate, 
  getNextFutureDueDate 
} from './utils/recurrence';

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
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isBannersModalOpen, setIsBannersModalOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedBannerFilter, setSelectedBannerFilter] = useState<string>('all');

  // Multi-selection & Connective line states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  // Banner Line Mode: 'all' | 'recurring' | 'custom' | 'off'
  const [bannerLineMode, setBannerLineMode] = useState<'all' | 'recurring' | 'custom' | 'off'>('all');
  const [customBannerLineIds, setCustomBannerLineIds] = useState<string[]>([]);
  const [isBannerModeDropdownOpen, setIsBannerModeDropdownOpen] = useState(false);

  // Load from Dexie on mount
  useEffect(() => {
    db.initDatabase().then(initResult => {
      setDataState({
        version: 1,
        transactions: initResult.transactions,
        paymentModes: initResult.paymentModes,
        categories: initResult.categories,
        banners: initResult.banners
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

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1-Click Repeat transaction for today
  const handleRepeatTransaction = async (tx: Transaction) => {
    const today = new Date().toISOString().split('T')[0];
    const isWeek = tx.recurrence === 'weekly' || tx.recurrence === 'biweekly';
    const isMonth = tx.recurrence === 'monthly';

    const newTx: Transaction = {
      ...tx,
      id: 'tx-' + Date.now(),
      date: today,
      status: 'completed',
      nextDueDate: tx.recurrence && tx.recurrence !== 'none'
        ? computeNextDueDate(
            today, 
            tx.recurrence, 
            isWeek ? tx.recurrenceDayOfWeek : undefined, 
            isMonth ? tx.recurrenceDayOfMonth : undefined
          )
        : undefined,
      createdAt: Date.now()
    };

    await handleSaveTransaction(newTx);
    setToastMessage(`Repeated "${tx.description}" ($${tx.amount.toFixed(2)}) for today!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Log and advance a recurring expense from reminder banner
  const handlePayRecurring = async (
    tx: Transaction, 
    currentEffectiveDueDate?: string, 
    logDateMode: 'today' | 'due' = 'today'
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const baseDate = currentEffectiveDueDate || tx.nextDueDate || today;
    const isWeek = tx.recurrence === 'weekly' || tx.recurrence === 'biweekly';
    const isMonth = tx.recurrence === 'monthly';

    const nextDate = computeNextDueDate(
      baseDate, 
      tx.recurrence || 'weekly',
      isWeek ? tx.recurrenceDayOfWeek : undefined,
      isMonth ? tx.recurrenceDayOfMonth : undefined
    );

    const targetDate = logDateMode === 'due' ? baseDate : today;

    // 1. Log payment instance for targetDate
    const newTx: Transaction = {
      ...tx,
      id: 'tx-' + Date.now(),
      date: targetDate,
      status: 'completed',
      recurrence: undefined,
      recurrenceDayOfWeek: undefined,
      recurrenceDayOfMonth: undefined,
      nextDueDate: undefined,
      createdAt: Date.now()
    };
    await handleSaveTransaction(newTx);

    // 2. Advance template transaction's nextDueDate
    const updatedTemplate: Transaction = {
      ...tx,
      nextDueDate: nextDate
    };
    await handleSaveTransaction(updatedTemplate);

    const dateNotice = targetDate === today ? 'today' : `due date (${targetDate})`;
    setToastMessage(`Logged "${tx.description}" ($${tx.amount.toFixed(2)}) for ${dateNotice}! Next due: ${nextDate}`);
    setTimeout(() => setToastMessage(null), 3500);
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

  const handleSaveCategories = async (newCategories: string[]) => {
    try {
      await db.saveCategories(newCategories);
    } catch (e) {
      console.error('Dexie save categories failed:', e);
    }

    setDataState(prev => ({
      ...prev,
      categories: newCategories
    }));
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    try {
      await db.renameCategory(oldName, newName);
    } catch (e) {
      console.error('Dexie rename category failed:', e);
    }

    setDataState(prev => {
      const updatedCategories = prev.categories.map(c => c === oldName ? newName : c);
      const updatedTransactions = prev.transactions.map(t => t.category === oldName ? { ...t, category: newName } : t);
      return {
        ...prev,
        categories: updatedCategories,
        transactions: updatedTransactions
      };
    });
  };

  // Banner CRUD handlers
  const handleSaveBanners = async (banners: Banner[]) => {
    try {
      await db.saveBanners(banners);
    } catch (e) {
      console.error('Dexie save banners failed:', e);
    }

    setDataState(prev => ({
      ...prev,
      banners
    }));
  };

  const handleDeleteBanner = async (bannerId: string) => {
    try {
      await db.deleteBanner(bannerId);
    } catch (e) {
      console.error('Dexie delete banner failed:', e);
    }

    setDataState(prev => ({
      ...prev,
      banners: (prev.banners || []).filter(b => b.id !== bannerId),
      transactions: prev.transactions.map(t => 
        t.bannerIds && t.bannerIds.includes(bannerId)
          ? { ...t, bannerIds: t.bannerIds.filter(id => id !== bannerId) }
          : t
      )
    }));

    if (selectedBannerFilter === bannerId) {
      setSelectedBannerFilter('all');
    }
  };

  // Selection mode & Batch banner assignment handlers
  const handleToggleTxSelection = (id: string) => {
    setSelectedTxIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedTxIds.size === filteredTransactions.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleBatchAssignBanner = async (bannerId: string) => {
    if (selectedTxIds.size === 0) return;

    const bannerObj = (dataState.banners || []).find(b => b.id === bannerId);
    const updatedTransactions = dataState.transactions.map(tx => {
      if (selectedTxIds.has(tx.id)) {
        const existingBanners = tx.bannerIds || [];
        if (!existingBanners.includes(bannerId)) {
          return {
            ...tx,
            bannerIds: [...existingBanners, bannerId]
          };
        }
      }
      return tx;
    });

    try {
      for (const tx of updatedTransactions) {
        if (selectedTxIds.has(tx.id)) {
          await db.putTransaction(tx);
        }
      }
    } catch (e) {
      console.error('Dexie batch assign banner failed:', e);
    }

    setDataState(prev => ({
      ...prev,
      transactions: updatedTransactions
    }));

    setToastMessage(`Added ${selectedTxIds.size} transaction(s) to "${bannerObj?.name || 'Banner'}"`);
    setTimeout(() => setToastMessage(null), 3000);
    setSelectedTxIds(new Set());
  };

  const handleBatchRemoveBanner = async (bannerId: string) => {
    if (selectedTxIds.size === 0) return;

    const bannerObj = (dataState.banners || []).find(b => b.id === bannerId);
    const updatedTransactions = dataState.transactions.map(tx => {
      if (selectedTxIds.has(tx.id) && tx.bannerIds) {
        return {
          ...tx,
          bannerIds: tx.bannerIds.filter(id => id !== bannerId)
        };
      }
      return tx;
    });

    try {
      for (const tx of updatedTransactions) {
        if (selectedTxIds.has(tx.id)) {
          await db.putTransaction(tx);
        }
      }
    } catch (e) {
      console.error('Dexie batch remove banner failed:', e);
    }

    setDataState(prev => ({
      ...prev,
      transactions: updatedTransactions
    }));

    setToastMessage(`Removed ${selectedTxIds.size} transaction(s) from "${bannerObj?.name || 'Banner'}"`);
    setTimeout(() => setToastMessage(null), 3000);
    setSelectedTxIds(new Set());
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
      if (selectedTypeFilter !== 'all') {
        if (selectedTypeFilter === 'recurring') {
          if (!tx.recurrence || tx.recurrence === 'none') {
            return false;
          }
        } else if (tx.type !== selectedTypeFilter) {
          return false;
        }
      }

      // Category filter
      if (selectedCategoryFilter !== 'all' && tx.category !== selectedCategoryFilter) {
        return false;
      }

      // Month filter
      if (selectedMonthFilter !== 'all' && !tx.date.startsWith(selectedMonthFilter)) {
        return false;
      }

      // Banner filter
      if (selectedBannerFilter !== 'all') {
        if (!tx.bannerIds || !tx.bannerIds.includes(selectedBannerFilter)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt);
  }, [dataState.transactions, searchQuery, selectedModeFilter, selectedTypeFilter, selectedCategoryFilter, selectedMonthFilter, selectedBannerFilter]);

  // Upcoming recurring expenses for notifications & reminders
  const upcomingRecurring = useMemo(() => {
    const recurringMap = new Map<string, Transaction>();
    dataState.transactions.forEach(t => {
      if (t.recurrence && t.recurrence !== 'none' && t.status !== 'cancelled') {
        const key = t.description.trim().toLowerCase();
        const existing = recurringMap.get(key);
        if (!existing || t.date > existing.date) {
          recurringMap.set(key, t);
        }
      }
    });

    return Array.from(recurringMap.values()).map(item => {
      const isWeek = item.recurrence === 'weekly' || item.recurrence === 'biweekly';
      const isMonth = item.recurrence === 'monthly';
      const effectiveDueDate = item.nextDueDate || getNextFutureDueDate(
        item.date, 
        item.recurrence!,
        isWeek ? item.recurrenceDayOfWeek : undefined,
        isMonth ? item.recurrenceDayOfMonth : undefined
      );
      const dueInfo = getRecurrenceDueInfo(effectiveDueDate);
      return {
        item,
        effectiveDueDate,
        dueInfo
      };
    }).sort((a, b) => a.effectiveDueDate.localeCompare(b.effectiveDueDate));
  }, [dataState.transactions]);

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

      // Day total calculates completed expenses and transfer fees
      const dayTotal = items.reduce((acc, curr) => {
        if (curr.status === 'cancelled') return acc;
        if (curr.type === 'expense') {
          return acc + curr.amount;
        }
        if (curr.type === 'transfer' && curr.fee) {
          return acc + curr.fee;
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

  // Unique banners present in the current filtered feed (for multi-track vertical lines)
  const activeFeedBanners = useMemo(() => {
    if (bannerLineMode === 'off') return [];

    const allBanners = dataState.banners || [];

    // Recurring mode: only show banners linked to active recurring transactions
    if (bannerLineMode === 'recurring') {
      const recurringBannerSet = new Set<string>();
      dataState.transactions.forEach(tx => {
        if (tx.recurrence && tx.recurrence !== 'none' && tx.status !== 'cancelled') {
          tx.bannerIds?.forEach(id => recurringBannerSet.add(id));
        }
      });
      return allBanners.filter(b => recurringBannerSet.has(b.id));
    }

    // Custom mode: only show user-selected banners
    if (bannerLineMode === 'custom') {
      return allBanners.filter(b => customBannerLineIds.includes(b.id));
    }

    // 'all' mode: show banners present in current filtered transactions
    const bannerSet = new Set<string>();
    filteredTransactions.forEach(tx => {
      tx.bannerIds?.forEach(id => bannerSet.add(id));
    });

    if (selectedBannerFilter !== 'all') {
      return allBanners.filter(b => b.id === selectedBannerFilter);
    }
    return allBanners.filter(b => bannerSet.has(b.id));
  }, [filteredTransactions, dataState.banners, dataState.transactions, selectedBannerFilter, bannerLineMode, customBannerLineIds]);

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
        if (t.fee) {
          transferFees += t.fee;
          totalExpense += t.fee;
          if (modeSpending[t.paymentModeId] !== undefined) {
            modeSpending[t.paymentModeId] += t.fee;
          }
        }
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
              onClick={() => setIsCategoriesModalOpen(true)}
              className="apple-btn apple-btn-secondary text-xs sm:text-sm font-medium"
              title="Manage Categories"
            >
              <Tag className="w-4 h-4 text-purple-400" />
              <span className="hidden md:inline">Categories</span>
            </button>

            <button
              onClick={() => setShowAnalytics(prev => !prev)}
              className={`apple-btn text-xs sm:text-sm font-medium transition-all ${
                showAnalytics
                  ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)] shadow-sm'
                  : 'apple-btn-secondary'
              }`}
              title={showAnalytics ? "Hide Visual Analytics" : "Show Visual Analytics & Charts"}
            >
              <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
              <span className="hidden md:inline">{showAnalytics ? 'Hide Charts' : 'Analytics'}</span>
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

        {/* Quick Banners / Groups Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5 text-purple-400" />
            Banners:
          </span>
          <button
            onClick={() => setSelectedBannerFilter('all')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shrink-0 ${
              selectedBannerFilter === 'all'
                ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--text-primary)] shadow-sm'
                : 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]/30'
            }`}
          >
            All Banners
          </button>
          {(dataState.banners || []).map(banner => {
            const count = dataState.transactions.filter(t => t.bannerIds?.includes(banner.id)).length;
            const isSelected = selectedBannerFilter === banner.id;
            return (
              <button
                key={banner.id}
                onClick={() => setSelectedBannerFilter(isSelected ? 'all' : banner.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all shrink-0 ${
                  isSelected
                    ? 'shadow-sm ring-1 ring-white/30 text-white'
                    : 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]/30'
                }`}
                style={isSelected ? { backgroundColor: banner.color } : {}}
              >
                <span 
                  className={`w-2.5 h-2.5 rounded-full inline-block ${isSelected ? 'bg-white' : ''}`}
                  style={!isSelected ? { backgroundColor: banner.color } : {}}
                />
                <span className="font-medium">{banner.name}</span>
                <span className="font-mono text-[11px] opacity-80 font-bold">({count})</span>
              </button>
            );
          })}
          <button
            onClick={() => setIsBannersModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl border border-dashed border-[var(--border-light)] hover:border-[var(--accent)] text-xs text-[var(--accent)] flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Manage Banners
          </button>
        </div>

        {/* Optional Visual Analytics & Financial Visualizations */}
        {showAnalytics ? (
          <VisualAnalytics
            transactions={dataState.transactions}
            paymentModes={dataState.paymentModes}
            categories={dataState.categories}
            banners={dataState.banners || []}
            filteredTransactions={filteredTransactions}
            activeMonthFilter={selectedMonthFilter}
            onSelectMonth={(m) => setSelectedMonthFilter(m)}
            onSelectCategory={(c) => setSelectedCategoryFilter(c)}
            onSelectMode={(m) => setSelectedModeFilter(m)}
            onSelectBanner={(b) => setSelectedBannerFilter(b)}
            onClose={() => setShowAnalytics(false)}
          />
        ) : (
          <div className="flex items-center justify-between p-3.5 rounded-2xl glass-panel border border-[var(--border-light)] hover:border-[var(--accent)]/40 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--accent-bg)] text-[var(--accent)]">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Visual Financial Analytics & Spending Breakdown
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Interactive charts for Categories, Payment Accounts, Custom Banners, and Monthly Trends
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAnalytics(true)}
              className="apple-btn apple-btn-secondary text-xs py-1.5 px-3 font-semibold hover:border-[var(--accent)] text-[var(--accent)] flex items-center gap-1.5 shrink-0"
              title="Reveal visual analytics charts"
            >
              <span>Reveal Analytics</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <section className="apple-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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
                className="apple-input apple-input-with-icon pl-9 text-xs"
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
                <option value="recurring">Recurring Expenses Only</option>
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

            {/* Filter by Banner */}
            <div>
              <select
                value={selectedBannerFilter}
                onChange={(e) => setSelectedBannerFilter(e.target.value)}
                className="apple-input text-xs"
              >
                <option value="all">All Banners / Groups</option>
                {(dataState.banners || []).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
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
          {(selectedTypeFilter !== 'all' || selectedModeFilter !== 'all' || selectedCategoryFilter !== 'all' || selectedMonthFilter !== 'all' || selectedBannerFilter !== 'all' || searchQuery.trim()) && (
            <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-light)] text-xs text-[var(--text-secondary)] flex-wrap">
              <span>Active filters:</span>
              {selectedTypeFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-medium">
                  Type: {selectedTypeFilter === 'recurring' ? 'Recurring' : selectedTypeFilter}
                </span>
              )}
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
              {selectedBannerFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-medium flex items-center gap-1">
                  Banner: {(dataState.banners || []).find(b => b.id === selectedBannerFilter)?.name}
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
                  setSelectedTypeFilter('all');
                  setSelectedModeFilter('all');
                  setSelectedCategoryFilter('all');
                  setSelectedMonthFilter('all');
                  setSelectedBannerFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs text-rose-400 hover:underline ml-2"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>

        {/* Recurring Expense Due Reminders Banner */}
        {upcomingRecurring.length > 0 && (
          <section className="apple-card p-4 border-l-4 border-l-purple-500 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    Recurring Reminders & Due Dates
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-medium font-mono">
                      {upcomingRecurring.length}
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Upcoming scheduled bills, rent, and subscriptions
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {upcomingRecurring.map(({ item, effectiveDueDate, dueInfo }) => {
                return (
                  <div 
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] flex flex-col justify-between gap-3 hover:border-purple-500/30 transition-all shadow-sm"
                  >
                    {/* Header: Description & Recurrence badge */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate" title={item.description}>
                        {item.description}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium shrink-0">
                        {formatRecurrenceLabel(item.recurrence, item.recurrenceDayOfWeek, item.recurrenceDayOfMonth)}
                      </span>
                    </div>

                    {/* Middle: Amount & Due status */}
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-rose-400">
                        ${item.amount.toFixed(2)}
                      </span>
                      {dueInfo?.isDueToday ? (
                        <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1 shrink-0">
                          <Bell className="w-3 h-3" /> Due Today
                        </span>
                      ) : dueInfo?.isOverdue ? (
                        <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" /> Overdue ({Math.abs(dueInfo.diffDays)}d) · {dueInfo?.formattedDueDate}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" /> In {dueInfo?.diffDays}d · {dueInfo?.formattedDueDate}
                        </span>
                      )}
                    </div>

                    {/* Footer: Action Buttons */}
                    <div className="pt-2 border-t border-[var(--border-light)] flex items-center gap-2">
                      {!dueInfo?.isDueToday && (
                        <button
                          onClick={() => handlePayRecurring(item, effectiveDueDate, 'due')}
                          className="apple-btn apple-btn-secondary text-xs py-1.5 px-2 flex-1 flex items-center justify-center gap-1 hover:border-purple-500/40 transition-colors"
                          title={`Log payment on scheduled due date (${dueInfo?.formattedDueDate || effectiveDueDate}) and advance due date`}
                        >
                          <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate">Log on Due Date</span>
                        </button>
                      )}
                      <button
                        onClick={() => handlePayRecurring(item, effectiveDueDate, 'today')}
                        className="apple-btn apple-btn-primary text-xs py-1.5 px-2 flex-1 flex items-center justify-center gap-1 transition-colors"
                        title="Log payment for today and advance due date"
                      >
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Log Today</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Transactions List Grouped by Date (Google Keep style) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--accent)]" />
              Expense Feed
              <span className="text-xs font-normal text-[var(--text-secondary)] font-mono">
                ({filteredTransactions.length} items)
              </span>
            </h2>

            {/* Selection Mode & Connecting Line Toolbar Controls */}
            <div className="flex items-center gap-2 flex-wrap relative">
              {/* 4-Mode Banner Line Selector (All, Recurring, Custom, Off) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsBannerModeDropdownOpen(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                    bannerLineMode !== 'off'
                      ? 'border-purple-500/40 bg-purple-500/10 text-purple-300 shadow-sm'
                      : 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Configure banner tracks visualization mode"
                >
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>
                    Banner Lines:{' '}
                    <strong className="capitalize">
                      {bannerLineMode === 'all' ? 'All Banners' : bannerLineMode === 'recurring' ? 'Recurring Only' : bannerLineMode === 'custom' ? `Custom (${customBannerLineIds.length})` : 'Off'}
                    </strong>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBannerModeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu for Modes */}
                {isBannerModeDropdownOpen && (
                  <div 
                    className="absolute right-0 top-full mt-1.5 w-64 p-2 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] shadow-2xl z-30 space-y-1.5 animate-scale-up backdrop-blur-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-2 py-1">
                      Banner Line Modes
                    </div>

                    {/* Mode: All */}
                    <button
                      type="button"
                      onClick={() => { setBannerLineMode('all'); setIsBannerModeDropdownOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        bannerLineMode === 'all'
                          ? 'bg-purple-500/20 text-purple-300 font-semibold'
                          : 'hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                      }`}
                    >
                      <span>All Banners (Show All Tracks)</span>
                      {bannerLineMode === 'all' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* Mode: Recurring Only */}
                    <button
                      type="button"
                      onClick={() => { setBannerLineMode('recurring'); setIsBannerModeDropdownOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        bannerLineMode === 'recurring'
                          ? 'bg-purple-500/20 text-purple-300 font-semibold'
                          : 'hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                      }`}
                    >
                      <span>Recurring Only (Active Subscriptions)</span>
                      {bannerLineMode === 'recurring' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* Mode: Custom */}
                    <button
                      type="button"
                      onClick={() => setBannerLineMode('custom')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        bannerLineMode === 'custom'
                          ? 'bg-purple-500/20 text-purple-300 font-semibold'
                          : 'hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                      }`}
                    >
                      <span>Custom Selection (Pick Banners)</span>
                      {bannerLineMode === 'custom' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* Custom Banner Sub-Selector (when custom is active) */}
                    {bannerLineMode === 'custom' && (
                      <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-1.5 mt-1">
                        <div className="text-[10px] text-[var(--text-secondary)] font-medium">
                          Select banners to display:
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1">
                          {(dataState.banners || []).map(b => {
                            const isChecked = customBannerLineIds.includes(b.id);
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setCustomBannerLineIds(prev =>
                                    prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id]
                                  );
                                }}
                                className={`w-full text-left px-2 py-1 rounded-lg text-[11px] flex items-center gap-2 transition-colors ${
                                  isChecked ? 'bg-black/20 text-white font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                                <span className="truncate flex-1">{b.name}</span>
                                {isChecked && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Mode: Off */}
                    <button
                      type="button"
                      onClick={() => { setBannerLineMode('off'); setIsBannerModeDropdownOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        bannerLineMode === 'off'
                          ? 'bg-rose-500/20 text-rose-300 font-semibold'
                          : 'hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                      }`}
                    >
                      <span>Off (Hide Banner Lines)</span>
                      {bannerLineMode === 'off' && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Toggle Selection Mode */}
              <button
                type="button"
                onClick={() => {
                  setIsSelectionMode(prev => {
                    if (prev) setSelectedTxIds(new Set());
                    return !prev;
                  });
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
                  isSelectionMode
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm'
                    : 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                {isSelectionMode ? 'Exit Select Mode' : 'Select Mode'}
              </button>
            </div>
          </div>

          {/* Batch Actions Bar (when in selection mode) */}
          {isSelectionMode && (
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--accent)] shadow-lg space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                    Selected: <span className="font-mono text-purple-400 font-bold">{selectedTxIds.size}</span> of {filteredTransactions.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="text-xs text-[var(--accent)] hover:underline ml-2 font-medium"
                  >
                    {selectedTxIds.size === filteredTransactions.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="text-[11px] text-[var(--text-secondary)]">
                  Pick a banner below to assign or remove selected transactions
                </div>
              </div>

              {/* Banner assignment buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[var(--border-light)]">
                <span className="text-xs font-medium text-[var(--text-secondary)] mr-1">
                  Assign to:
                </span>
                {(dataState.banners || []).map(banner => (
                  <button
                    key={banner.id}
                    type="button"
                    disabled={selectedTxIds.size === 0}
                    onClick={() => handleBatchAssignBanner(banner.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
                    style={{ backgroundColor: banner.color }}
                  >
                    <Plus className="w-3 h-3" />
                    {banner.name}
                  </button>
                ))}

                {(dataState.banners || []).length > 0 && selectedTxIds.size > 0 && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-[var(--text-secondary)]">Remove:</span>
                    {(dataState.banners || []).map(banner => (
                      <button
                        key={banner.id}
                        type="button"
                        onClick={() => handleBatchRemoveBanner(banner.id)}
                        className="px-2 py-0.5 rounded text-[11px] font-medium border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title={`Remove "${banner.name}" from selected`}
                      >
                        ✕ {banner.name}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsBannersModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg border border-dashed border-[var(--border-light)] hover:border-[var(--accent)] text-xs text-[var(--accent)] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> New Banner
                </button>
              </div>
            </div>
          )}

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
                  setSelectedBannerFilter('all');
                  setSearchQuery('');
                }}
                className="apple-btn apple-btn-secondary text-xs"
              >
                Clear Filters
              </button>
            </div>
          ) : (() => {
            const showMultiTrack = bannerLineMode !== 'off' && activeFeedBanners.length > 0;
            const gutterWidthPx = showMultiTrack ? Math.max(28, activeFeedBanners.length * 18 + 14) : 0;

            return (
              <div className="relative flex items-stretch">
                {/* Continuous Multi-Track Metro/Git Vertical Lines in OUTER Left Gutter (Left of Date Headers & Cards) */}
                {showMultiTrack && (
                  <div 
                    className="relative shrink-0 select-none hidden sm:block"
                    style={{ width: `${gutterWidthPx}px` }}
                  >
                    {/* Continuous Vertical Lines running down the entire height of the feed */}
                    {activeFeedBanners.map((banner, bIdx) => {
                      const lineLeftPx = bIdx * 18 + 10;
                      return (
                        <div 
                          key={banner.id}
                          className="absolute inset-y-0 w-[2.5px] -translate-x-1/2 rounded-full transition-all opacity-80"
                          style={{ 
                            left: `${lineLeftPx}px`,
                            backgroundColor: banner.color 
                          }}
                          title={`Banner Track: ${banner.name}`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Right side: Date Headers and Transaction Cards */}
                <div className="flex-1 min-w-0 space-y-6">
                  {groupedTransactions.map((group) => (
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
                      <div className="space-y-3 relative">
                        {group.items.map((tx) => {
                          const mode = dataState.paymentModes.find(m => m.id === tx.paymentModeId);
                          const toMode = tx.toPaymentModeId ? dataState.paymentModes.find(m => m.id === tx.toPaymentModeId) : null;
                          const isCancelled = tx.status === 'cancelled';
                          const isSelected = selectedTxIds.has(tx.id);

                          // Resolved banner objects for this transaction
                          const txBanners = (tx.bannerIds || [])
                            .map(bId => (dataState.banners || []).find(b => b.id === bId))
                            .filter((b): b is Banner => Boolean(b));

                          // Filter banners that are currently active in multi-track
                          const activeTxBanners = txBanners.filter(b => activeFeedBanners.some(ab => ab.id === b.id));

                          // Build multi-color gradient style for left edge stripe
                          const leftEdgeStyle: React.CSSProperties = {};
                          if (txBanners.length === 1) {
                            leftEdgeStyle.backgroundColor = txBanners[0].color;
                          } else if (txBanners.length > 1) {
                            const stepPercent = 100 / txBanners.length;
                            const stops = txBanners.map((b, idx) => {
                              const start = (idx * stepPercent).toFixed(1);
                              const end = ((idx + 1) * stepPercent).toFixed(1);
                              return `${b.color} ${start}%, ${b.color} ${end}%`;
                            }).join(', ');
                            leftEdgeStyle.background = `linear-gradient(to bottom, ${stops})`;
                          }

                          return (
                            <div key={tx.id} className="relative flex items-stretch">
                              {/* Horizontal Branch Connectors from the Outer Left Gutter into Card */}
                              {showMultiTrack && (
                                <div 
                                  className="absolute select-none pointer-events-none hidden sm:block z-10"
                                  style={{ 
                                    left: `-${gutterWidthPx}px`, 
                                    width: `${gutterWidthPx}px`,
                                    top: 0,
                                    bottom: 0
                                  }}
                                >
                                  {activeFeedBanners.map((banner, bIdx) => {
                                    const isLinked = activeTxBanners.some(b => b.id === banner.id);
                                    if (!isLinked) return null;

                                    const lineLeftPx = bIdx * 18 + 10;
                                    const linkedIndex = activeTxBanners.findIndex(b => b.id === banner.id);
                                    const totalLinked = activeTxBanners.length;
                                    const topOffsetPercent = totalLinked === 1 ? 50 : Math.round(((linkedIndex + 1) / (totalLinked + 1)) * 100);
                                    const connectorWidthPx = gutterWidthPx - lineLeftPx;

                                    return (
                                      <div 
                                        key={banner.id}
                                        className="absolute -translate-y-1/2 flex items-center pointer-events-auto"
                                        style={{ 
                                          left: `${lineLeftPx}px`,
                                          top: `${topOffsetPercent}%` 
                                        }}
                                      >
                                        {/* Connector bullet node on the vertical track */}
                                        <div 
                                          className="w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] shadow-md -translate-x-1/2 shrink-0 transition-transform hover:scale-125 cursor-pointer"
                                          style={{ backgroundColor: banner.color }}
                                          title={`Linked to: ${banner.name}`}
                                        />
                                        {/* Horizontal branch line connecting into the card */}
                                        <div 
                                          className="h-[2px] transition-all"
                                          style={{ 
                                            width: `${connectorWidthPx}px`, 
                                            backgroundColor: banner.color,
                                            marginLeft: '-1px'
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Transaction Card */}
                              <div
                                className={`apple-card apple-card-interactive p-4 flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-3 relative transition-all overflow-hidden ${
                                  isCancelled ? 'opacity-55' : ''
                                } ${
                                  isSelected ? 'ring-2 ring-[var(--accent)] bg-[var(--accent-bg)]/30' : ''
                                }`}
                                onClick={isSelectionMode ? () => handleToggleTxSelection(tx.id) : undefined}
                              >
                                {/* Left Accent Stripe: Divided equally among all associated banners */}
                                {bannerLineMode !== 'off' && txBanners.length > 0 && (
                                  <div 
                                    className="absolute left-0 top-0 bottom-0 w-2 transition-all shadow-xs"
                                    style={leftEdgeStyle}
                                    title={`Linked to: ${txBanners.map(b => b.name).join(', ')}`}
                                  />
                                )}

                                {/* Left: Checkbox (in selection mode), Indicator, Mode badge, Description, and Details */}
                                <div className={`flex items-start sm:items-center gap-3.5 min-w-0 ${bannerLineMode !== 'off' && txBanners.length > 0 ? 'pl-1' : ''}`}>
                                  {/* Radio / Checkbox Tick in Selection Mode */}
                                  {isSelectionMode && (
                                    <div 
                                      onClick={(e) => { e.stopPropagation(); handleToggleTxSelection(tx.id); }}
                                      className="shrink-0 cursor-pointer pt-0.5 sm:pt-0"
                                    >
                                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                        isSelected 
                                          ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm scale-110' 
                                          : 'border-[var(--text-secondary)]/50 bg-[var(--bg-secondary)] hover:border-[var(--accent)]'
                                      }`}>
                                        {isSelected ? (
                                          <Check className="w-3 h-3 stroke-[3]" />
                                        ) : (
                                          <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
                                        )}
                                      </div>
                                    </div>
                                  )}

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
                                  <div className="space-y-1 min-w-0">
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

                                      {/* Banner Badges */}
                                      {txBanners.map(banner => (
                                        <span
                                          key={banner.id}
                                          className="text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 text-white shadow-xs"
                                          style={{ backgroundColor: banner.color }}
                                          title={`Linked to banner: ${banner.name}`}
                                        >
                                          <Bookmark className="w-2.5 h-2.5" />
                                          {banner.name}
                                        </span>
                                      ))}

                                      {/* Recurrence & Due Date badges */}
                                      {tx.recurrence && tx.recurrence !== 'none' && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium flex items-center gap-1">
                                          <Repeat className="w-2.5 h-2.5" />
                                          {formatRecurrenceLabel(tx.recurrence, tx.recurrenceDayOfWeek, tx.recurrenceDayOfMonth)}
                                        </span>
                                      )}

                                      {tx.recurrence && tx.recurrence !== 'none' && (() => {
                                        const dueInfo = getRecurrenceDueInfo(tx.nextDueDate);
                                        if (!dueInfo) return null;
                                        if (dueInfo.isOverdue) {
                                          return (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-medium flex items-center gap-1">
                                              <Clock className="w-2.5 h-2.5" /> Overdue ({Math.abs(dueInfo.diffDays)}d)
                                            </span>
                                          );
                                        }
                                        if (dueInfo.isDueToday) {
                                          return (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium flex items-center gap-1">
                                              <Bell className="w-2.5 h-2.5" /> Due Today
                                            </span>
                                          );
                                        }
                                        if (dueInfo.isDueSoon) {
                                          return (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium flex items-center gap-1">
                                              <Clock className="w-2.5 h-2.5" /> In {dueInfo.diffDays}d
                                            </span>
                                          );
                                        }
                                        return (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-light)] font-medium">
                                            Next: {dueInfo.formattedDueDate}
                                          </span>
                                        );
                                      })()}

                                      {/* Cancelled badge */}
                                      {isCancelled && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                          Not Deducted
                                        </span>
                                      )}
                                    </div>

                                    {/* Additional notes */}
                                    {tx.notes && !/^\+?[\d.]+\$?\s*(transfer\s*)?(fee|charge)$/i.test(tx.notes.trim()) && (
                                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] flex-wrap">
                                        <span className="italic">Note: "{tx.notes}"</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Amount and Action Buttons */}
                                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-11 sm:pl-0">
                                  <div className="text-right flex flex-col items-end">
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
                                    {tx.type === 'transfer' && tx.fee !== undefined && tx.fee > 0 && (
                                      <span 
                                        className={`text-xs font-semibold font-mono text-rose-400 ${
                                          isCancelled ? 'line-through opacity-60' : ''
                                        }`}
                                      >
                                        -${tx.fee.toFixed(2)} fee
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleRepeatTransaction(tx)}
                                      className="p-1.5 rounded-lg hover:bg-purple-500/10 text-[var(--text-secondary)] hover:text-purple-400 transition-colors"
                                      title="Repeat this expense for today"
                                    >
                                      <Repeat className="w-4 h-4" />
                                    </button>
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
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
        banners={dataState.banners}
        initialTransaction={editingTx}
        onManageCategories={() => setIsCategoriesModalOpen(true)}
        onManageBanners={() => setIsBannersModalOpen(true)}
      />

      <PaymentModesModal
        isOpen={isModesModalOpen}
        onClose={() => setIsModesModalOpen(false)}
        modes={dataState.paymentModes}
        onSaveModes={handleSavePaymentModes}
      />

      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={dataState.categories}
        transactions={dataState.transactions}
        onSaveCategories={handleSaveCategories}
        onRenameCategory={handleRenameCategory}
      />

      <BannersModal
        isOpen={isBannersModalOpen}
        onClose={() => setIsBannersModalOpen(false)}
        banners={dataState.banners || []}
        transactions={dataState.transactions}
        onSaveBanners={handleSaveBanners}
        onDeleteBanner={handleDeleteBanner}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        currentState={dataState}
        onUpdateState={handleUpdateDataState}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl glass-panel border border-emerald-500/40 text-xs font-semibold text-emerald-400 flex items-center gap-2 shadow-2xl backdrop-blur-md">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
