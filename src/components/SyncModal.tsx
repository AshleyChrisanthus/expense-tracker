import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  QrCode, 
  RefreshCw, 
  Copy, 
  Check, 
  Camera, 
  ShieldCheck, 
  Key, 
  X, 
  AlertCircle,
  Unlink,
  CheckCircle2,
  Server,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { syncManager } from '../services/sync/sync-manager';
import { generateQrSvg } from '../services/sync/qr';
import { QrCameraScanner } from '../services/sync/scanner';
import { DEFAULT_CLOUDFLARE_WORKER_URL } from '../services/sync/backend';
import type { SyncStatus, SyncConfig } from '../services/sync/types';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'create' | 'join'>('status');
  const [status, setStatus] = useState<SyncStatus>(syncManager.getStatus());
  const [config, setConfig] = useState<SyncConfig | null>(syncManager.getConfig());
  
  // Create state
  const [qrSvg, setQrSvg] = useState<string>('');
  const [pairingUrl, setPairingUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Endpoint Settings state
  const [showEndpointSettings, setShowEndpointSettings] = useState(false);
  const [endpointInput, setEndpointInput] = useState<string>(
    syncManager.getConfig()?.customEndpoint || syncManager.getDefaultEndpoint()
  );
  const [isTestingEndpoint, setIsTestingEndpoint] = useState(false);
  const [endpointTestResult, setEndpointTestResult] = useState<{
    ok: boolean;
    message: string;
    isCloudflareUndeployed?: boolean;
  } | null>(null);

  // Join state
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrCameraScanner | null>(null);

  // Subscribe to sync manager status
  useEffect(() => {
    const unsub = syncManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
      const latestConfig = syncManager.getConfig();
      setConfig(latestConfig);
      if (latestConfig?.customEndpoint) {
        setEndpointInput(latestConfig.customEndpoint);
      }
    });
    return unsub;
  }, []);

  // Set default tab on open
  useEffect(() => {
    if (isOpen) {
      const cfg = syncManager.getConfig();
      setConfig(cfg);
      if (cfg?.customEndpoint) {
        setEndpointInput(cfg.customEndpoint);
      }
      if (cfg && cfg.enabled) {
        setActiveTab('status');
        updateQrCode(cfg.vaultId, cfg.secretKey);
      } else {
        setActiveTab('create');
      }
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // Clean up camera on unmount or tab switch
  useEffect(() => {
    if (activeTab !== 'join') {
      stopCamera();
    }
  }, [activeTab]);

  const updateQrCode = (vaultId: string, secretKey: string) => {
    const url = syncManager.generatePairingUrl(vaultId, secretKey);
    setPairingUrl(url);
    try {
      const svg = generateQrSvg(url, {
        size: 260,
        color: '#ffffff',
        background: '#090d16',
        padding: 2
      });
      setQrSvg(svg);
    } catch (err) {
      console.warn('QR code generation failed:', err);
    }
  };

  const handleCreateVault = async () => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const newConfig = await syncManager.createNewVault('custom', endpointInput);
      setConfig(newConfig);
      updateQrCode(newConfig.vaultId, newConfig.secretKey);
      setActiveTab('create');
    } catch (err: any) {
      console.error('Failed to create vault:', err);
      setCreateError(err.message || 'Failed to create vault.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTestEndpoint = async () => {
    setIsTestingEndpoint(true);
    setEndpointTestResult(null);
    try {
      const result = await syncManager.testEndpointConnection(endpointInput);
      setEndpointTestResult(result);
    } catch (err: any) {
      setEndpointTestResult({
        ok: false,
        message: err.message || 'Connection test failed.'
      });
    } finally {
      setIsTestingEndpoint(false);
    }
  };

  const handleSaveEndpoint = () => {
    syncManager.updateEndpoint(endpointInput);
    setEndpointTestResult({
      ok: true,
      message: 'Sync endpoint successfully saved.'
    });
  };

  const handleResetEndpoint = () => {
    const def = DEFAULT_CLOUDFLARE_WORKER_URL;
    setEndpointInput(def);
    syncManager.updateEndpoint(def);
    setEndpointTestResult({
      ok: true,
      message: 'Reset to default Cloudflare worker endpoint.'
    });
  };

  const handleManualJoin = async () => {
    setJoinError(null);
    const input = joinInput.trim();
    if (!input) {
      setJoinError('Please paste a pairing link, QR code text, or vaultId:secretKey');
      return;
    }

    setIsJoining(true);
    try {
      let vaultId = '';
      let secretKey = '';

      if (input.includes('sync=v1:')) {
        const match = input.match(/sync=v1:([^:]+):([^:]+)/);
        if (match) {
          vaultId = decodeURIComponent(match[1]);
          secretKey = decodeURIComponent(match[2]);
        }
      } else if (input.includes(':')) {
        const parts = input.split(':');
        vaultId = parts[0].trim();
        secretKey = parts[1].trim();
      }

      if (!vaultId || !secretKey) {
        throw new Error('Invalid format. Expected pairing link or "vaultId:secretKey"');
      }

      syncManager.joinVault(vaultId, secretKey);
      await syncManager.syncNow();
      setJoinInput('');
      stopCamera();
      setActiveTab('status');
    } catch (err: any) {
      setJoinError(err.message || 'Could not join vault. Check credentials and network.');
    } finally {
      setIsJoining(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!videoRef.current) return;

    if (!scannerRef.current) {
      scannerRef.current = new QrCameraScanner();
    }

    setIsScanning(true);
    const success = await scannerRef.current.start(videoRef.current, {
      onDetected: async (scannedText) => {
        setIsScanning(false);
        setJoinInput(scannedText);
        // Process directly
        try {
          let vaultId = '';
          let secretKey = '';
          if (scannedText.includes('sync=v1:')) {
            const match = scannedText.match(/sync=v1:([^:]+):([^:]+)/);
            if (match) {
              vaultId = decodeURIComponent(match[1]);
              secretKey = decodeURIComponent(match[2]);
            }
          }
          if (vaultId && secretKey) {
            syncManager.joinVault(vaultId, secretKey);
            await syncManager.syncNow();
            setActiveTab('status');
          }
        } catch (e: any) {
          setJoinError(e.message || 'Error processing scanned QR code');
        }
      },
      onError: (errMsg) => {
        setIsScanning(false);
        setCameraError(errMsg);
      }
    });

    if (!success) {
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
    }
    setIsScanning(false);
  };

  const handleCopy = (text: string, type: 'link' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleSyncNow = async () => {
    try {
      await syncManager.syncNow();
    } catch (_) {}
  };

  const handleDisconnect = () => {
    if (confirm('Disconnect from this cloud sync vault? Your local expenses will remain on this device.')) {
      syncManager.disconnectVault();
      setConfig(null);
      setActiveTab('create');
    }
  };

  if (!isOpen) return null;

  const isConfigured = !!(config && config.enabled);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div 
        className="w-full max-w-lg rounded-2xl glass-panel border border-[var(--border-subtle)] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        style={{ background: 'var(--bg-glass)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                End-to-End Encrypted Cloud Sync
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 uppercase">
                  Zero Knowledge
                </span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">AES-GCM (256-bit) • 1-Second QR Device Pairing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 pb-1 border-b border-[var(--border-subtle)] flex gap-2 shrink-0">
          {isConfigured && (
            <button
              onClick={() => { setActiveTab('status'); stopCamera(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'status'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" /> Vault Status
            </button>
          )}
          <button
            onClick={() => {
              setActiveTab('create');
              stopCamera();
              if (config) updateQrCode(config.vaultId, config.secretKey);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" /> {isConfigured ? 'QR Pairing Code' : 'Create Vault'}
          </button>
          <button
            onClick={() => { setActiveTab('join'); setJoinError(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'join'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Join / Scan Vault
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* TAB 1: STATUS */}
          {activeTab === 'status' && isConfigured && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full animate-pulse ${
                    status.state === 'synced' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]' :
                    status.state === 'syncing' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]' :
                    status.state === 'offline' ? 'bg-gray-400' : 'bg-rose-400'
                  }`} />
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                      {status.state === 'synced' ? 'Vault Synced' :
                       status.state === 'syncing' ? 'Syncing...' :
                       status.state === 'offline' ? 'Offline' : 'Sync Attention Needed'}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {status.lastSyncedAt
                        ? `Last synced: ${status.lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                        : 'Never synced'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSyncNow}
                  disabled={status.state === 'syncing'}
                  className="px-3 py-1.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:border-cyan-500/40 transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${status.state === 'syncing' ? 'animate-spin text-cyan-400' : ''}`} />
                  Sync Now
                </button>
              </div>

              {/* Vault Identifiers */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-secondary)] font-mono">Vault ID</span>
                  <span className="text-[var(--text-primary)] font-mono select-all truncate max-w-[200px]">
                    {config?.vaultId}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-secondary)] font-mono">Device ID</span>
                  <span className="text-[var(--text-primary)] font-mono">{config?.deviceId}</span>
                </div>
              </div>

              {status.errorMessage && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-1">
                    <p className="font-medium">{status.errorMessage}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Your local vault is active and offline-ready. Once your worker is deployed or online, click "Sync Now".
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => { setActiveTab('create'); updateQrCode(config!.vaultId, config!.secretKey); }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" /> Show QR Pairing Code
                </button>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
                >
                  <Unlink className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE / QR PAIRING */}
          {activeTab === 'create' && (
            <div className="space-y-4">
              {!isConfigured ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-[var(--text-primary)]">Initialize Encrypted Cloud Vault</h4>
                    <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1">
                      Your expenses are encrypted client-side with AES-GCM (256-bit). The cloud locker never sees your transactions or secret key.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateVault}
                    disabled={isCreating}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 mx-auto"
                  >
                    {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Generate New Encrypted Vault
                  </button>

                  {createError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 flex items-center gap-2 max-w-sm mx-auto">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{createError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Scan with your mobile camera to pair your phone with this vault in 1 second:
                  </p>

                  {/* QR SVG */}
                  {qrSvg && (
                    <div 
                      className="w-56 h-56 mx-auto p-2.5 rounded-2xl bg-[#090d16] border border-cyan-500/30 shadow-2xl flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  )}

                  {/* Actions */}
                  <div className="flex justify-center gap-3 pt-1">
                    <button
                      onClick={() => handleCopy(pairingUrl, 'link')}
                      className="px-3.5 py-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:border-cyan-500/40 transition flex items-center gap-1.5 shadow-sm"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? 'Link Copied!' : 'Copy Pairing Link'}
                    </button>
                    <button
                      onClick={() => handleCopy(`${config?.vaultId}:${config?.secretKey}`, 'key')}
                      className="px-3.5 py-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:border-cyan-500/40 transition flex items-center gap-1.5 shadow-sm"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Key className="w-3.5 h-3.5" />}
                      {copiedKey ? 'Key Copied!' : 'Copy Vault Key'}
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)] italic">
                    Note: The secret key is stored in the URL fragment (#hash) and never sent across the network.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: JOIN / SCAN VAULT */}
          {activeTab === 'join' && (
            <div className="space-y-4">
              {/* Camera Scanner View */}
              <div className="relative rounded-2xl border border-[var(--border-subtle)] bg-black/40 overflow-hidden flex flex-col items-center justify-center min-h-[180px]">
                {isScanning ? (
                  <div className="w-full relative aspect-video max-h-56 bg-black flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <div className="absolute inset-0 border-2 border-cyan-400/50 pointer-events-none rounded-xl m-6 animate-pulse" />
                    <button
                      onClick={stopCamera}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 text-xs text-white border border-white/20"
                    >
                      Close Camera
                    </button>
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-2">
                    <Camera className="w-8 h-8 mx-auto text-[var(--text-secondary)]" />
                    <p className="text-xs text-[var(--text-secondary)]">Scan QR code displayed on desktop or another device</p>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30 text-xs font-medium transition flex items-center gap-1.5 mx-auto"
                    >
                      <Camera className="w-3.5 h-3.5" /> Start Camera Scanner
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Manual Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-primary)] block">
                  Or paste Pairing Link / Vault Key (vaultId:secretKey):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="https://...#sync=v1:... or vaultId:secretKey"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-cyan-500 transition"
                  />
                  <button
                    onClick={handleManualJoin}
                    disabled={isJoining || !joinInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {isJoining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Join Vault
                  </button>
                </div>
              </div>

              {joinError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync Endpoint & Cloudflare Settings Accordion */}
        <div className="border-t border-[var(--border-subtle)] bg-black/10 shrink-0">
          <button
            onClick={() => setShowEndpointSettings(!showEndpointSettings)}
            className="w-full px-6 py-2.5 flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition"
          >
            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium">Cloudflare Worker & Sync Endpoint Settings</span>
            </div>
            {showEndpointSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showEndpointSettings && (
            <div className="px-6 py-3 space-y-3 bg-black/20 border-t border-[var(--border-subtle)] animate-in fade-in duration-150">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                  <span className="font-medium">Worker Endpoint URL:</span>
                  <button
                    onClick={handleResetEndpoint}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Reset to Default
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={endpointInput}
                    onChange={(e) => setEndpointInput(e.target.value)}
                    placeholder="https://...workers.dev"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono placeholder-[var(--text-secondary)] focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleTestEndpoint}
                    disabled={isTestingEndpoint || !endpointInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:border-cyan-500/40 text-xs font-medium text-[var(--text-primary)] transition flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingEndpoint ? 'animate-spin text-cyan-400' : ''}`} />
                    Test
                  </button>
                  <button
                    onClick={handleSaveEndpoint}
                    disabled={!endpointInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-medium transition shrink-0"
                  >
                    Save
                  </button>
                </div>
              </div>

              {endpointTestResult && (
                <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                  endpointTestResult.ok
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  {endpointTestResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  )}
                  <div className="space-y-0.5">
                    <p>{endpointTestResult.message}</p>
                    {endpointTestResult.isCloudflareUndeployed && (
                      <p className="font-mono text-[11px] text-[var(--text-secondary)] mt-1">
                        To deploy: open terminal and run <code>npm run deploy:worker</code>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
