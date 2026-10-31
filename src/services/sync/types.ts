import type { Transaction, PaymentMode, Banner } from '../../types/expense';

export type SyncProviderType = 'relay' | 'custom' | 'supabase';

export interface SyncConfig {
  enabled: boolean;
  vaultId: string;
  secretKey: string; // Base64URL-encoded 256-bit AES key
  provider: SyncProviderType;
  customEndpoint?: string;
  customAuthHeader?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  deviceId: string;
}

export interface EncryptedVaultEnvelope {
  v: number; // schema version (1)
  iv: string; // Base64 12-byte IV for AES-GCM
  salt?: string; // Optional salt if derived
  ciphertext: string; // Base64 encrypted payload
  updatedAt: string; // ISO 8601 string
  deviceId: string; // Device that wrote this update
}

export interface SyncTombstone {
  id: string;
  type: 'transaction' | 'paymentMode' | 'category' | 'banner';
  deletedAt: string; // ISO 8601 string
}

export interface DecryptedSyncPayload {
  version: number;
  updatedAt: string;
  deviceId: string;
  transactions: Transaction[];
  paymentModes: PaymentMode[];
  categories: string[];
  banners: Banner[];
  tombstones: SyncTombstone[];
}

export type SyncStatusState = 'disconnected' | 'syncing' | 'synced' | 'error' | 'offline';

export interface SyncStatus {
  state: SyncStatusState;
  lastSyncedAt: Date | null;
  errorMessage?: string;
  itemCount?: number;
  vaultId?: string;
}
