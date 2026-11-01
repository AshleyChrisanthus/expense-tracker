import type { ExpenseDataState } from '../../types/expense';
import { db } from '../../db/index';
import type {
  SyncConfig,
  SyncStatus,
  SyncStatusState,
  SyncTombstone,
  DecryptedSyncPayload,
  SyncProviderType
} from './types';
import {
  generateSecretKey,
  generateVaultId,
  encryptPayload,
  decryptPayload
} from './crypto';
import { mergeSyncPayload, pruneTombstones } from './merger';
import {
  createLockerAdapter,
  DEFAULT_CLOUDFLARE_WORKER_URL,
  probeEndpoint,
  type EndpointProbeResult
} from './backend';

const CONFIG_STORAGE_KEY = 'expense_tracker_sync_config_v1';
const TOMBSTONES_STORAGE_KEY = 'expense_tracker_sync_tombstones_v1';
const DEVICE_ID_KEY = 'expense_tracker_device_id_v1';

export const CANONICAL_HOSTED_URL = 'https://waxen-acorn-7854.here.now';

export class SyncManager {
  private config: SyncConfig | null = null;
  private status: SyncStatus = {
    state: 'disconnected',
    lastSyncedAt: null
  };
  private statusListeners: Array<(status: SyncStatus) => void> = [];
  private stateChangeListeners: Array<(newState: ExpenseDataState) => void> = [];
  private debounceTimer: any = null;
  private isSyncing = false;
  private currentLocalStateProvider: (() => ExpenseDataState) | null = null;

  constructor() {
    this.loadConfig();
    this.setupLifecycleListeners();
  }

  // Device ID
  getDeviceId(): string {
    if (typeof localStorage === 'undefined') return 'dev_test';
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  // Set provider for current in-memory / React state
  setStateProvider(provider: () => ExpenseDataState): void {
    this.currentLocalStateProvider = provider;
  }

  onStateChange(fn: (newState: ExpenseDataState) => void): () => void {
    this.stateChangeListeners.push(fn);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== fn);
    };
  }

  // Config Persistence
  loadConfig(): SyncConfig | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (raw) {
        this.config = JSON.parse(raw);
        if (this.config) {
          // Automatic migration: if pointing to undeployed expense-tracker-sync, update to active app-directory-sync
          if (this.config.customEndpoint?.includes('expense-tracker-sync.ashleychrisanthus.workers.dev')) {
            this.config.customEndpoint = DEFAULT_CLOUDFLARE_WORKER_URL;
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
          }
          if (this.config.enabled) {
            this.setStatus('synced', this.config.lastSyncedAt ? new Date(this.config.lastSyncedAt) : null);
          } else {
            this.setStatus('disconnected', null);
          }
          return this.config;
        }
      }
    } catch (_) {}
    this.config = null;
    this.setStatus('disconnected', null);
    return null;
  }

  saveConfig(newConfig: SyncConfig | null): void {
    this.config = newConfig;
    if (typeof localStorage === 'undefined') return;
    if (newConfig) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
      this.setStatus('synced', newConfig.lastSyncedAt ? new Date(newConfig.lastSyncedAt) : null);
    } else {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
      this.setStatus('disconnected', null);
    }
  }

  getConfig(): SyncConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return !!(this.config && this.config.enabled && this.config.vaultId && this.config.secretKey);
  }

  // Status Management
  getStatus(): SyncStatus {
    return { ...this.status, vaultId: this.config?.vaultId };
  }

  onStatusChange(fn: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(fn);
    fn(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== fn);
    };
  }

  private setStatus(state: SyncStatusState, lastSyncedAt: Date | null, errorMessage?: string): void {
    const currentState = this.getLocalState();
    this.status = {
      state,
      lastSyncedAt,
      errorMessage,
      vaultId: this.config?.vaultId,
      itemCount: state === 'synced' && currentState ? currentState.transactions.length : undefined
    };
    for (const listener of this.statusListeners) {
      try {
        listener(this.getStatus());
      } catch (_) {}
    }
  }

  // Tombstones
  getLocalTombstones(): SyncTombstone[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(TOMBSTONES_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return pruneTombstones(list);
        }
      }
    } catch (_) {}
    return [];
  }

  saveLocalTombstones(tombstones: SyncTombstone[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(pruneTombstones(tombstones)));
    } catch (_) {}
  }

  recordDeletion(id: string, type: 'transaction' | 'paymentMode' | 'category' | 'banner'): void {
    const tombstones = this.getLocalTombstones();
    tombstones.push({
      id,
      type,
      deletedAt: new Date().toISOString()
    });
    this.saveLocalTombstones(tombstones);

    if (this.isConfigured()) {
      this.schedulePush();
    }
  }

  // Get current local state
  getLocalState(): ExpenseDataState {
    if (this.currentLocalStateProvider) {
      return this.currentLocalStateProvider();
    }
    return {
      version: 1,
      transactions: [],
      paymentModes: [],
      categories: [],
      banners: []
    };
  }

  // Pairing & URLs
  getCanonicalUrl(): string {
    if (typeof window === 'undefined' || !window.location || !window.location.origin) {
      return CANONICAL_HOSTED_URL;
    }
    const origin = window.location.origin;
    if (origin.startsWith('http') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin;
    }
    return CANONICAL_HOSTED_URL;
  }

  generatePairingUrl(vaultId: string, secretKey: string, provider: SyncProviderType = 'custom', endpoint?: string): string {
    const canonical = this.getCanonicalUrl();
    let url = `${canonical}/#sync=v1:${encodeURIComponent(vaultId)}:${encodeURIComponent(secretKey)}:${provider}`;
    if (endpoint && endpoint !== DEFAULT_CLOUDFLARE_WORKER_URL) {
      url += `:${encodeURIComponent(endpoint)}`;
    }
    return url;
  }

  getDefaultEndpoint(): string {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('expense_tracker_sync_endpoint_override');
      if (stored && !stored.includes('expense-tracker-sync.ashleychrisanthus.workers.dev')) {
        return stored;
      }
    }
    return DEFAULT_CLOUDFLARE_WORKER_URL;
  }

  async createNewVault(provider: SyncProviderType = 'custom', endpoint?: string): Promise<SyncConfig> {
    const vaultId = generateVaultId();
    const secretKey = await generateSecretKey();
    const deviceId = this.getDeviceId();

    const config: SyncConfig = {
      enabled: true,
      vaultId,
      secretKey,
      provider,
      customEndpoint: endpoint || this.getDefaultEndpoint(),
      autoSync: true,
      deviceId
    };

    this.saveConfig(config);

    // Initial push (Local-First: do not throw or fail vault creation if remote endpoint is offline/undeployed)
    try {
      await this.syncNow();
    } catch (pushErr: any) {
      console.warn('[Sync] Vault created locally; initial remote sync pending:', pushErr.message);
      this.setStatus(
        'offline',
        null,
        'Vault created locally. Remote sync endpoint unreachable (Cloudflare Worker not deployed yet or offline).'
      );
    }
    return config;
  }

  updateEndpoint(newEndpoint: string): void {
    const cleanEndpoint = newEndpoint.trim();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('expense_tracker_sync_endpoint_override', cleanEndpoint);
    }
    if (!this.config) return;
    this.config.customEndpoint = cleanEndpoint;
    this.saveConfig(this.config);
    this.schedulePush();
  }

  async testEndpointConnection(customUrl?: string): Promise<EndpointProbeResult> {
    const target = customUrl || this.config?.customEndpoint || this.getDefaultEndpoint();
    return probeEndpoint(target);
  }

  joinVault(vaultId: string, secretKey: string, provider: SyncProviderType = 'custom', endpoint?: string): SyncConfig {
    const deviceId = this.getDeviceId();
    const config: SyncConfig = {
      enabled: true,
      vaultId,
      secretKey,
      provider,
      customEndpoint: endpoint || DEFAULT_CLOUDFLARE_WORKER_URL,
      autoSync: true,
      deviceId
    };
    this.saveConfig(config);
    return config;
  }

  disconnectVault(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.saveConfig(null);
    this.setStatus('disconnected', null);
  }

  checkUrlHashForPairing(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const hash = window.location.hash;
      if (!hash || !hash.includes('sync=v1:')) return false;

      const match = hash.match(/sync=v1:([^:]+):([^:]+)(?::([^:]+))?(?::([^:]+))?/);
      if (match) {
        const vaultId = decodeURIComponent(match[1]);
        const secretKey = decodeURIComponent(match[2]);
        const provider = (match[3] as SyncProviderType) || 'custom';
        const customEndpoint = match[4] ? decodeURIComponent(match[4]) : DEFAULT_CLOUDFLARE_WORKER_URL;

        // Security: immediately scrub hash from URL address bar so key is not leaked
        window.history.replaceState(null, '', window.location.pathname + window.location.search);

        this.joinVault(vaultId, secretKey, provider, customEndpoint);
        this.syncNow().catch((err) => {
          console.warn('[Sync] Initial sync on pairing error:', err);
        });
        return true;
      }
    } catch (_) {}
    return false;
  }

  // Bi-directional E2EE Sync Cycle
  async syncNow(): Promise<void> {
    if (!this.isConfigured() || !this.config) return;
    if (this.isSyncing) return;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setStatus('offline', this.config.lastSyncedAt ? new Date(this.config.lastSyncedAt) : null);
      return;
    }

    this.isSyncing = true;
    this.setStatus('syncing', this.config.lastSyncedAt ? new Date(this.config.lastSyncedAt) : null);

    try {
      const adapter = createLockerAdapter(this.config);
      const remoteEnvelope = await adapter.get(this.config.vaultId);

      let remotePayload: DecryptedSyncPayload | null = null;
      if (remoteEnvelope) {
        try {
          remotePayload = await decryptPayload(remoteEnvelope, this.config.secretKey);
        } catch (decryptErr: any) {
          throw new Error(`Decryption failed: Incorrect secret key or corrupted data. (${decryptErr.message})`);
        }
      }

      const localState = this.getLocalState();
      const localTombstones = this.getLocalTombstones();

      let mergedTx = localState.transactions;
      let mergedModes = localState.paymentModes;
      let mergedCategories = localState.categories;
      let mergedBanners = localState.banners || [];
      let mergedTombstones = localTombstones;

      if (remotePayload) {
        const mergeResult = mergeSyncPayload(
          localState.transactions,
          localState.paymentModes,
          localState.categories,
          localState.banners || [],
          localTombstones,
          remotePayload
        );

        mergedTx = mergeResult.mergedTransactions;
        mergedModes = mergeResult.mergedPaymentModes;
        mergedCategories = mergeResult.mergedCategories;
        mergedBanners = mergeResult.mergedBanners;
        mergedTombstones = mergeResult.mergedTombstones;

        if (mergeResult.hasChanges) {
          const updatedState: ExpenseDataState = {
            version: 1,
            transactions: mergedTx,
            paymentModes: mergedModes,
            categories: mergedCategories,
            banners: mergedBanners
          };

          // Save to Dexie IndexedDB
          await db.importData(updatedState, 'replace');
          this.saveLocalTombstones(mergedTombstones);

          // Notify React components
          for (const listener of this.stateChangeListeners) {
            try {
              listener(updatedState);
            } catch (_) {}
          }
        }
      }

      // Package and encrypt current merged state for cloud upload
      const newPayload: DecryptedSyncPayload = {
        version: 1,
        updatedAt: new Date().toISOString(),
        deviceId: this.config.deviceId,
        transactions: mergedTx,
        paymentModes: mergedModes,
        categories: mergedCategories,
        banners: mergedBanners,
        tombstones: mergedTombstones
      };

      const encryptedEnvelope = await encryptPayload(
        newPayload,
        this.config.secretKey,
        this.config.deviceId
      );

      await adapter.put(this.config.vaultId, encryptedEnvelope);

      const now = new Date();
      this.config.lastSyncedAt = now.toISOString();
      this.saveConfig(this.config);
      this.setStatus('synced', now);
    } catch (err: any) {
      console.warn('[Sync] Sync failed:', err);
      let userMessage = err.message || 'Sync error';
      if (err.message === 'Failed to fetch' || err.message?.includes('fetch failed')) {
        if (this.config.customEndpoint?.includes('workers.dev')) {
          userMessage = 'Cloudflare Worker not deployed yet ("Failed to fetch"). Run "npm run deploy:worker" to deploy.';
        } else {
          userMessage = 'Could not reach sync endpoint (Network or CORS error).';
        }
      }
      this.setStatus(
        'error',
        this.config.lastSyncedAt ? new Date(this.config.lastSyncedAt) : null,
        userMessage
      );
      throw err;
    } finally {
      this.isSyncing = false;
    }
  }

  schedulePush(): void {
    if (!this.isConfigured()) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.syncNow().catch((err) => {
        console.warn('[Sync] Scheduled push failed:', err);
      });
    }, 1500);
  }

  private setupLifecycleListeners(): void {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

    window.addEventListener('online', () => {
      if (this.isConfigured()) {
        this.syncNow().catch(() => {});
      }
    });

    window.addEventListener('offline', () => {
      if (this.isConfigured()) {
        this.setStatus('offline', this.config?.lastSyncedAt ? new Date(this.config.lastSyncedAt) : null);
      }
    });

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isConfigured()) {
          this.syncNow().catch(() => {});
        }
      });
    }

    // Periodic heartbeat sync every 3 minutes while tab is active in foreground
    if (typeof window !== 'undefined' && typeof window.setInterval === 'function') {
      const timer = window.setInterval(() => {
        if (this.isConfigured() && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          this.syncNow().catch(() => {});
        }
      }, 3 * 60 * 1000);
      if (timer && typeof (timer as any).unref === 'function') {
        (timer as any).unref();
      }
    }
  }
}

export const syncManager = new SyncManager();
