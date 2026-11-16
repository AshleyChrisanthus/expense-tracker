import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, FileText, RotateCcw, X } from 'lucide-react';
import type { PaymentMode, Transaction } from '../types/expense';
import { formatTransactionsForKeep } from '../utils/keepExport';

interface KeepExportModalProps {
  isOpen: boolean;
  transactions: Transaction[];
  paymentModes: PaymentMode[];
  onClose: () => void;
  onCopied?: (count: number) => void;
}

export const KeepExportModal: React.FC<KeepExportModalProps> = ({
  isOpen,
  transactions,
  paymentModes,
  onClose,
  onCopied,
}) => {
  const generatedText = useMemo(
    () => formatTransactionsForKeep(transactions, paymentModes),
    [transactions, paymentModes]
  );

  const [previewText, setPreviewText] = useState<string>(generatedText);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPreviewText(generatedText);
      setCopied(false);
    }
  }, [isOpen, generatedText]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isModified = previewText !== generatedText;
  const uniqueDayCount = new Set(transactions.map(t => t.date)).size;

  const handleCopy = async () => {
    if (!previewText) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(previewText);
      } else {
        const el = document.createElement('textarea');
        el.value = previewText;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      onCopied?.(transactions.length);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: ignore if clipboard permission denied
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-light)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Google Keep Export Preview
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} across {uniqueDayCount} {uniqueDayCount === 1 ? 'day' : 'days'} — edit freely before copying
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            aria-label="Close Keep export preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Editable Preview Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Preview (Editable)</span>
            {isModified && (
              <button
                type="button"
                onClick={() => setPreviewText(generatedText)}
                className="flex items-center gap-1 text-[var(--accent)] hover:underline font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to generated
              </button>
            )}
          </div>
          <textarea
            value={previewText}
            onChange={e => {
              setPreviewText(e.target.value);
              if (copied) setCopied(false);
            }}
            rows={14}
            spellCheck={false}
            aria-label="Google Keep formatted transactions preview"
            className="w-full rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-y"
            placeholder="No transactions selected."
          />
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-[var(--border-light)] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            disabled={!previewText.trim()}
            onClick={handleCopy}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40 ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-[var(--accent)] text-white hover:opacity-90'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
