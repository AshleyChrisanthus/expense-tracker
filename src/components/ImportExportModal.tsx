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
  FileCheck2
} from 'lucide-react';
import { ExpenseDataState, PaymentMode, Transaction } from '../types/expense';
import { 
  exportToJsonFile, 
  validateImportData, 
  parseGoogleKeepText,
  INITIAL_TRANSACTIONS,
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
  isFileSystemAccessSupported
} from '../services/exportService';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: ExpenseDataState;
  onUpdateState: (newState: ExpenseDataState) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onUpdateState
}) => {
  const [activeTab, setActiveTab] = useState<'json' | 'keep' | 'danger'>('json');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [keepText, setKeepText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Partial<Transaction>[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Linked exports folder state
  const [linkedFolderName, setLinkedFolderName] = useState<string | null>(null);
  const [exportsList, setExportsList] = useState<ExportFileInfo[]>([]);
  const [isSavingExport, setIsSavingExport] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLinkedFolderStatus();
    }
  }, [isOpen]);

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

  const handleRestoreFromLinkedFile = async (filename: string) => {
    if (!confirm(`Restore transactions from ${filename}? Mode: ${importMode === 'replace' ? 'Replace All' : 'Merge'}`)) {
      return;
    }

    try {
      const data = await readLinkedExportFile(filename);
      if (validateImportData(data)) {
        if (importMode === 'replace') {
          onUpdateState(data);
        } else {
          // Merge
          const existingIds = new Set(currentState.transactions.map(t => t.id));
          const newTransactions = data.transactions.filter(t => !existingIds.has(t.id));
          const modeMap = new Map<string, PaymentMode>();
          currentState.paymentModes.forEach(m => modeMap.set(m.id, m));
          data.paymentModes.forEach(m => modeMap.set(m.id, m));

          onUpdateState({
            version: 1,
            paymentModes: Array.from(modeMap.values()),
            transactions: [...newTransactions, ...currentState.transactions],
            categories: Array.from(new Set([...currentState.categories, ...data.categories]))
          });
        }
        setImportStatus(`Successfully restored ${data.transactions.length} records from ${filename}!`);
      }
    } catch (err: any) {
      setImportStatus('Error restoring file: ' + err.message);
    }
  };

  const handleStandardDownload = () => {
    exportToJsonFile(currentState);
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
            onUpdateState(parsed);
          } else {
            // Merge
            const existingIds = new Set(currentState.transactions.map(t => t.id));
            const newTransactions = parsed.transactions.filter(t => !existingIds.has(t.id));
            
            const modeMap = new Map<string, PaymentMode>();
            currentState.paymentModes.forEach(m => modeMap.set(m.id, m));
            parsed.paymentModes.forEach(m => modeMap.set(m.id, m));

            onUpdateState({
              version: 1,
              paymentModes: Array.from(modeMap.values()),
              transactions: [...newTransactions, ...currentState.transactions],
              categories: Array.from(new Set([...currentState.categories, ...parsed.categories]))
            });
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
    if (confirm('Reset transactions to the March 2024 Google Keep sample dataset?')) {
      onUpdateState({
        version: 1,
        paymentModes: DEFAULT_PAYMENT_MODES,
        transactions: INITIAL_TRANSACTIONS,
        categories: DEFAULT_CATEGORIES
      });
      setImportStatus('Reset to March 2024 Google Keep sample data.');
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
                          <span className="font-medium text-[var(--text-primary)] font-mono text-[11px] block truncate">{f.filename}</span>
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
                onClick={() => handleParseKeep(`March 31, 2024\n170$-from bank- room rent\n\nMarch 28, 2024\n2.03$-from forex- ezymart coffee\n4.49$-from forex- aldi grocery(City)\n\nMarch 14, 2024\nTransferred 1000$ from forex to bank(+7.5$ charge)`)}
                className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Paste example
              </button>
            </div>

            <textarea
              rows={4}
              value={keepText}
              onChange={(e) => handleParseKeep(e.target.value)}
              placeholder="e.g.&#10;March 31, 2024&#10;170$-from bank- room rent&#10;2.03$-from forex- ezymart coffee&#10;Transferred 1000$ from forex to bank(+7.5$ charge)"
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
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Restore Sample Keep Data</h4>
                <p className="text-xs text-[var(--text-secondary)]">Reset transactions back to your March 2024 Google Keep records</p>
              </div>
              <button
                onClick={handleResetToKeepSample}
                className="apple-btn apple-btn-secondary text-xs"
              >
                <RotateCcw className="w-4 h-4" /> Reset Sample
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
