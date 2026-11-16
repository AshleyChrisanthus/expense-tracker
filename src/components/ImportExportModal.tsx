import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileJson, 
  Sparkles, 
  RotateCcw, 
  Check, 
  AlertTriangle,
  Copy,
  PlusCircle,
  FolderSync,
  FolderCheck,
  FolderX,
  History,
  FileCheck2,
  Clock,
  Activity,
  Trash2
} from 'lucide-react';
import { ExpenseDataState, Transaction } from '../types/expense';
import { 
  exportToJsonFile, 
  validateImportData, 
  parseGoogleKeepText,
  mergeImportedState,
  DEFAULT_PAYMENT_MODES,
  DEFAULT_CATEGORIES
} from '../utils/storage';
import { 
  saveExportToLocal, 
  linkBackupDirectory, 
  getLinkedDirectoryHandle, 
  unlinkBackupDirectory, 
  getLocalExportsList, 
  readLinkedExportFile,
  ExportFileInfo,
  isFileSystemAccessSupported,
  isAutoBackupFilename
} from '../services/exportService';
import {
  AutoBackupSettings,
  DEFAULT_AUTO_BACKUP_SETTINGS,
  getAutoBackupSettings,
  saveAutoBackupSettings,
  ScheduleFrequency
} from '../services/autoBackupService';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: ExpenseDataState;
  onUpdateState: (newState: ExpenseDataState) => void;
  initialTab?: 'json' | 'keep' | 'danger';
  initialKeepText?: string;
  autoBackupSettings?: AutoBackupSettings;
  onUpdateAutoBackupSettings?: (settings: AutoBackupSettings) => void;
  onManualBackupSuccess?: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onUpdateState,
  initialTab,
  initialKeepText,
  autoBackupSettings: propAutoSettings,
  onUpdateAutoBackupSettings,
  onManualBackupSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'json' | 'keep' | 'danger'>(initialTab || 'json');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [keepText, setKeepText] = useState(initialKeepText || '');
  const [parsedPreview, setParsedPreview] = useState<Partial<Transaction>[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Linked exports folder state
  const [linkedFolderName, setLinkedFolderName] = useState<string | null>(null);
  const [exportsList, setExportsList] = useState<ExportFileInfo[]>([]);
  const [isSavingExport, setIsSavingExport] = useState(false);

  // Automated backup settings
  const [localAutoSettings, setLocalAutoSettings] = useState<AutoBackupSettings>(
    propAutoSettings || DEFAULT_AUTO_BACKUP_SETTINGS
  );

  useEffect(() => {
    if (propAutoSettings) {
      setLocalAutoSettings(propAutoSettings);
    }
  }, [propAutoSettings]);

  const updateAutoSetting = async (patch: Partial<AutoBackupSettings>) => {
    const next = { ...localAutoSettings, ...patch };
    setLocalAutoSettings(next);
    const saved = await saveAutoBackupSettings(next);
    setLocalAutoSettings(saved);
    onUpdateAutoBackupSettings?.(saved);
  };

  useEffect(() => {
    if (isOpen) {
      loadLinkedFolderStatus();
      if (!propAutoSettings) {
        getAutoBackupSettings().then(setLocalAutoSettings);
      }
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (initialKeepText) {
        handleParseKeep(initialKeepText);
      }
    }
  }, [isOpen, initialTab, initialKeepText]);

  const loadLinkedFolderStatus = async () => {
    try {
      const handle = await getLinkedDirectoryHandle();
      if (handle) {
        setLinkedFolderName(handle.name);
      } else {
        setLinkedFolderName(null);
      }
      const files = await getLocalExportsList();
      setExportsList(files);
    } catch (err) {
      console.warn('Could not read linked directory:', err);
    }
  };

  if (!isOpen) return null;

  const handleLinkDirectory = async () => {
    try {
      const handle = await linkBackupDirectory();
      setLinkedFolderName(handle.name);
      setImportStatus(`Successfully linked to folder: "${handle.name}". Permission saved!`);
      const files = await getLocalExportsList();
      setExportsList(files);
    } catch (err: any) {
      setImportStatus(err.message || 'Failed to link directory.');
    }
  };

  const handleUnlinkDirectory = async () => {
    await unlinkBackupDirectory();
    setLinkedFolderName(null);
    setExportsList([]);
    setImportStatus('Exports folder unlinked.');
  };

  const handleAutoExport = async () => {
    setIsSavingExport(true);
    try {
      const res = await saveExportToLocal(currentState);
      if (res.success) {
        setImportStatus(`Backup successfully saved: ${res.filename} (${res.method === 'linked_folder' ? 'Saved to exports/ folder' : res.method})`);
        onManualBackupSuccess?.();
        const files = await getLocalExportsList();
        setExportsList(files);
      } else {
        setImportStatus('Export failed: ' + (res.error || 'Unknown error'));
      }
    } catch (err: any) {
      setImportStatus('Export error: ' + (err.message || 'Cancelled'));
    } finally {
      setIsSavingExport(false);
    }
  };

  // Merge an imported backup into the current state (transactions, modes, categories AND banners)
  const buildMergedState = (incoming: ExpenseDataState): ExpenseDataState =>
    mergeImportedState(currentState, incoming);

  const handleRestoreFromLinkedFile = async (filename: string) => {
    if (!confirm(`Restore transactions from ${filename}? Mode: ${importMode === 'replace' ? 'Replace All' : 'Merge'}`)) {
      return;
    }

    try {
      const data = await readLinkedExportFile(filename);
      if (validateImportData(data)) {
        if (importMode === 'replace') {
          onUpdateState({ ...data, banners: data.banners || [] });
        } else {
          onUpdateState(buildMergedState(data));
        }
        setImportStatus(`Successfully restored ${data.transactions.length} records from ${filename}!`);
      }
    } catch (err: any) {
      setImportStatus('Error restoring file: ' + err.message);
    }
  };

  const handleStandardDownload = () => {
    exportToJsonFile(currentState);
    onManualBackupSuccess?.();
    setImportStatus('Backup JSON downloaded successfully!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (validateImportData(parsed)) {
          if (importMode === 'replace') {
            onUpdateState({ ...parsed, banners: parsed.banners || [] });
          } else {
            onUpdateState(buildMergedState(parsed));
          }
          setImportStatus(`Successfully imported ${parsed.transactions.length} transactions!`);
        } else {
          setImportStatus('Invalid JSON structure: Must match Expense Tracker format.');
        }
      } catch (err) {
        setImportStatus('Error parsing JSON file: Invalid syntax.');
      }
    };
    reader.readAsText(file);
  };

  const handleParseKeep = (text: string) => {
    setKeepText(text);
    if (!text.trim()) {
      setParsedPreview([]);
      return;
    }
    const parsed = parseGoogleKeepText(text, currentState.paymentModes);
    setParsedPreview(parsed);
  };

  const handleImportKeepRecords = () => {
    if (parsedPreview.length === 0) return;
    const newItems: Transaction[] = parsedPreview.map(p => ({
      id: p.id || 'keep-' + Math.random().toString(36).substring(2, 9),
      date: p.date || new Date().toISOString().split('T')[0],
      amount: p.amount || 0,
      type: p.type || 'expense',
      paymentModeId: p.paymentModeId || 'bank',
      toPaymentModeId: p.toPaymentModeId,
      fee: p.fee,
      category: p.category || 'Other',
      description: p.description || 'Imported expense',
      notes: p.notes,
      status: p.status || 'completed',
      createdAt: p.createdAt || Date.now()
    }));

    onUpdateState({
      ...currentState,
      transactions: [...newItems, ...currentState.transactions]
    });

    setKeepText('');
    setParsedPreview([]);
    setImportStatus(`Successfully imported ${newItems.length} transactions from Keep notes!`);
  };

  const handleResetToKeepSample = () => {
    if (confirm('Load sample transactions to preview the app?')) {
      const demoTransactions: Transaction[] = [
        {
          id: 'demo-exp-1',
          date: new Date().toISOString().split('T')[0],
          amount: 14.50,
          type: 'expense',
          paymentModeId: 'bank',
          category: 'Food & Dining',
          description: 'Cafe lunch & coffee',
          status: 'completed',
          createdAt: Date.now() - 3600000
        },
        {
          id: 'demo-exp-2',
          date: new Date().toISOString().split('T')[0],
          amount: 54.20,
          type: 'expense',
          paymentModeId: 'bank',
          category: 'Groceries',
          description: 'Weekly supermarket groceries',
          status: 'completed',
          createdAt: Date.now() - 7200000
        }
      ];
      onUpdateState({
        version: 1,
        paymentModes: DEFAULT_PAYMENT_MODES,
        transactions: demoTransactions,
        categories: DEFAULT_CATEGORIES,
        banners: currentState.banners || []
      });
      setImportStatus('Loaded generic demo transactions.');
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete ALL transactions? This cannot be undone.')) {
      onUpdateState({
        ...currentState,
        transactions: []
      });
      setImportStatus('All transactions cleared.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="glass-modal w-full max-w-xl rounded-2xl p-6 relative overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-light)] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent-bg)] text-[var(--accent)]">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data Management</h2>
              <p className="text-xs text-[var(--text-secondary)]">Auto-exports folder, JSON backups & Google Keep parser</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-5 border-b border-[var(--border-light)] pb-2">
          <button
            onClick={() => { setActiveTab('json'); setImportStatus(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'json'
                ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Exports Folder & JSON
          </button>
          <button
            onClick={() => { setActiveTab('keep'); setImportStatus(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'keep'
                ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Keep Note Importer
          </button>
          <button
            onClick={() => { setActiveTab('danger'); setImportStatus(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'danger'
                ? 'bg-red-500/10 text-red-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Reset & Clear
          </button>
        </div>

        {/* Status notification */}
        {importStatus && (
          <div className="p-3 mb-4 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent)]/30 text-xs text-[var(--accent)] flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Tab 1: Exports Folder & JSON */}
        {activeTab === 'json' && (
          <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
            {/* Auto-Export to Folder Card */}
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <FolderSync className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">Auto-Export to Project Folder</h4>
                    <p className="text-xs text-[var(--text-secondary)]">Save JSON backups directly into the `exports/` folder</p>
                  </div>
                </div>

                {linkedFolderName ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                    <FolderCheck className="w-3 h-3" /> Linked: {linkedFolderName}
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    Folder Not Linked
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {isFileSystemAccessSupported() && !linkedFolderName && (
                  <button
                    onClick={handleLinkDirectory}
                    className="apple-btn apple-btn-secondary text-xs"
                  >
                    <FolderSync className="w-3.5 h-3.5 text-[var(--accent)]" /> Link `exports/` Folder (One-Time)
                  </button>
                )}

                <button
                  onClick={handleAutoExport}
                  disabled={isSavingExport}
                  className="apple-btn apple-btn-primary text-xs"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  {isSavingExport ? 'Saving...' : 'Auto-Save Backup Now'}
                </button>

                {linkedFolderName && (
                  <button
                    onClick={handleUnlinkDirectory}
                    className="apple-btn apple-btn-secondary text-xs text-rose-400 hover:text-rose-500"
                    title="Unlink folder"
                  >
                    <FolderX className="w-3.5 h-3.5" /> Unlink
                  </button>
                )}

                <button
                  onClick={handleStandardDownload}
                  className="apple-btn apple-btn-secondary text-xs"
                  title="Download copy to browser downloads folder"
                >
                  <Download className="w-3.5 h-3.5" /> Download .json
                </button>
              </div>

              {/* Linked Folder Recent Backups List */}
              {exportsList.length > 0 && (
                <div className="pt-2 border-t border-[var(--border-light)] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold flex items-center gap-1">
                      <History className="w-3 h-3" /> Backups in `exports/` folder ({exportsList.length})
                    </span>
                    <span className="text-[10px]">Click restore to load</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                    {exportsList.slice(0, 5).map(f => (
                      <div key={f.filename} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)]/60 text-xs border border-[var(--border-light)]/50">
                        <div className="truncate mr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[var(--text-primary)] font-mono text-[11px] truncate">{f.filename}</span>
                            {isAutoBackupFilename(f.filename) && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-bg)] text-[var(--accent)] font-semibold uppercase shrink-0">
                                Auto
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            {new Date(f.modifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {(f.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <button
                          onClick={() => handleRestoreFromLinkedFile(f.filename)}
                          className="apple-btn apple-btn-secondary text-[11px] py-1 px-2.5 shrink-0"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Automated Backup Settings Card */}
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Automated Backups</h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Last backup:{' '}
                    <span className="text-[var(--text-primary)] font-medium">
                      {localAutoSettings.lastBackupAt
                        ? new Date(localAutoSettings.lastBackupAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Never'}
                    </span>
                    {' • '}
                    <span>{localAutoSettings.transactionsSinceLastBackup} tx since last backup</span>
                  </p>
                </div>
              </div>

              {/* 1. Scheduled Backup Switch */}
              <div className="p-3 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border-light)]/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--accent)]" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">Scheduled Backup</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">Automatically back up on a recurring schedule</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={localAutoSettings.scheduledEnabled}
                    onClick={() => updateAutoSetting({ scheduledEnabled: !localAutoSettings.scheduledEnabled })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      localAutoSettings.scheduledEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border-light)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        localAutoSettings.scheduledEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {localAutoSettings.scheduledEnabled && (
                  <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                    <select
                      value={localAutoSettings.scheduleFrequency}
                      onChange={(e) => updateAutoSetting({ scheduleFrequency: e.target.value as ScheduleFrequency })}
                      className="apple-input py-1 px-2 text-xs w-auto"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom interval</option>
                    </select>

                    {localAutoSettings.scheduleFrequency === 'weekly' && (
                      <select
                        value={localAutoSettings.scheduleWeeklyDay}
                        onChange={(e) => updateAutoSetting({ scheduleWeeklyDay: Number(e.target.value) })}
                        className="apple-input py-1 px-2 text-xs w-auto"
                      >
                        <option value={0}>Sunday</option>
                        <option value={1}>Monday</option>
                        <option value={2}>Tuesday</option>
                        <option value={3}>Wednesday</option>
                        <option value={4}>Thursday</option>
                        <option value={5}>Friday</option>
                        <option value={6}>Saturday</option>
                      </select>
                    )}

                    {(localAutoSettings.scheduleFrequency === 'daily' || localAutoSettings.scheduleFrequency === 'weekly') && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[var(--text-secondary)]">at</span>
                        <input
                          type="time"
                          value={localAutoSettings.scheduleTime}
                          onChange={(e) => updateAutoSetting({ scheduleTime: e.target.value })}
                          className="apple-input py-1 px-2 text-xs w-auto"
                        />
                      </div>
                    )}

                    {localAutoSettings.scheduleFrequency === 'custom' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[var(--text-secondary)]">every</span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={localAutoSettings.customIntervalValue}
                          onChange={(e) => updateAutoSetting({ customIntervalValue: Math.max(1, Number(e.target.value) || 1) })}
                          className="apple-input py-1 px-2 text-xs w-16"
                        />
                        <select
                          value={localAutoSettings.customIntervalUnit}
                          onChange={(e) => updateAutoSetting({ customIntervalUnit: e.target.value as 'hours' | 'days' })}
                          className="apple-input py-1 px-2 text-xs w-auto"
                        >
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Dynamic Transaction-Count Backup Switch */}
              <div className="p-3 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border-light)]/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">Dynamic Activity Backup</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">Back up automatically after a set number of transactions</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={localAutoSettings.countEnabled}
                    onClick={() => updateAutoSetting({ countEnabled: !localAutoSettings.countEnabled })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      localAutoSettings.countEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border-light)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        localAutoSettings.countEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {localAutoSettings.countEnabled && (
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[var(--text-secondary)]">Back up every</span>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={localAutoSettings.countThreshold}
                        onChange={(e) => updateAutoSetting({ countThreshold: Math.max(1, Number(e.target.value) || 1) })}
                        className="apple-input py-1 px-2 text-xs w-16"
                      />
                      <span className="text-[11px] text-[var(--text-secondary)]">transactions</span>
                    </div>
                    <span className="text-[11px] text-[var(--accent)] font-medium">
                      {localAutoSettings.transactionsSinceLastBackup} / {localAutoSettings.countThreshold}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Auto-Cleanup / Retention Switch */}
              <div className="p-3 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border-light)]/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">Auto-Cleanup Old Auto-Backups</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">Safely prune old `-auto` files without touching manual backups</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={localAutoSettings.cleanupEnabled}
                    onClick={() => updateAutoSetting({ cleanupEnabled: !localAutoSettings.cleanupEnabled })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      localAutoSettings.cleanupEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border-light)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        localAutoSettings.cleanupEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {localAutoSettings.cleanupEnabled && (
                  <div className="flex items-center gap-1.5 pt-1 text-xs">
                    <span className="text-[11px] text-[var(--text-secondary)]">Keep only the last</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={localAutoSettings.cleanupRetentionCount}
                      onChange={(e) => updateAutoSetting({ cleanupRetentionCount: Math.max(1, Number(e.target.value) || 1) })}
                      className="apple-input py-1 px-2 text-xs w-16"
                    />
                    <span className="text-[11px] text-[var(--text-secondary)]">auto-backups</span>
                  </div>
                )}
              </div>
            </div>

            {/* Import Backup File */}
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Import JSON File</h4>
                <p className="text-xs text-[var(--text-secondary)]">Load an existing backup JSON file from your computer</p>
              </div>

              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="accent-[var(--accent)]"
                  />
                  <span>Merge with existing</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="accent-[var(--accent)]"
                  />
                  <span>Replace current data</span>
                </label>
              </div>

              <label className="w-full py-4 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--accent)] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-[var(--bg-primary)]/40">
                <Upload className="w-5 h-5 text-[var(--accent)]" />
                <span className="text-xs font-medium text-[var(--text-primary)]">Click to select .json file</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 2: Keep Note Importer */}
        {activeTab === 'keep' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-primary)]">
                Paste Google Keep Text Format:
              </label>
              <button
                type="button"
                onClick={() => handleParseKeep(`January 15, 2025\n250$-from bank- monthly rent\n\nJanuary 14, 2025\n4.50$-from cash- morning coffee\n32.40$-from bank- weekly groceries\n\nJanuary 10, 2025\nTransferred 500$ from forex to bank(+5$ fee)`)}
                className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Paste example
              </button>
            </div>

            <textarea
              rows={4}
              value={keepText}
              onChange={(e) => handleParseKeep(e.target.value)}
              placeholder="e.g.&#10;January 15, 2025&#10;250$-from bank- monthly rent&#10;4.50$-from cash- morning coffee&#10;Transferred 500$ from forex to bank(+5$ fee)"
              className="apple-input font-mono text-xs"
            />

            {parsedPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Detected {parsedPreview.length} items:
                  </span>
                  <button
                    onClick={handleImportKeepRecords}
                    className="apple-btn apple-btn-primary text-xs py-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Import These Items
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                  {parsedPreview.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-[var(--bg-primary)]/50">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[var(--text-secondary)]">{item.date}</span>
                        <span className="font-medium text-[var(--text-primary)] truncate max-w-[200px]">{item.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent)]">{item.paymentModeId}</span>
                        <span className="font-semibold text-rose-400 font-mono">${item.amount?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Danger / Reset */}
        {activeTab === 'danger' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Load Demo Data</h4>
                <p className="text-xs text-[var(--text-secondary)]">Load a couple of generic demo transactions to try out features</p>
              </div>
              <button
                onClick={handleResetToKeepSample}
                className="apple-btn apple-btn-secondary text-xs"
              >
                <RotateCcw className="w-4 h-4" /> Load Demo
              </button>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Clear All Transactions
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">Delete all recorded transactions from browser database</p>
              </div>
              <button
                onClick={handleClearAll}
                className="apple-btn bg-red-600 hover:bg-red-700 text-white text-xs"
              >
                Delete All
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-[var(--border-light)] mt-4">
          <button
            onClick={onClose}
            className="apple-btn apple-btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
