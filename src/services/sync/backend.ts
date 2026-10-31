import type { EncryptedVaultEnvelope, SyncConfig } from './types';

export interface CloudLockerAdapter {
  get(vaultId: string): Promise<EncryptedVaultEnvelope | null>;
  put(vaultId: string, envelope: EncryptedVaultEnvelope): Promise<boolean>;
}

export const DEFAULT_CLOUDFLARE_WORKER_URL = 'https://app-directory-sync.ashleychrisanthus.workers.dev';

/**
 * Default Public Zero-Knowledge REST Relay
 * Uses public REST storage endpoint for zero-configuration testing and syncing.
 * Note: Data is 100% client-side encrypted with AES-GCM (256-bit).
 */
export class RestfulApiRelayLocker implements CloudLockerAdapter {
  private endpoint = 'https://api.restful-api.dev/objects';

  async get(vaultId: string): Promise<EncryptedVaultEnvelope | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${this.endpoint}/${encodeURIComponent(vaultId)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`Cloud relay returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json && json.data) {
        return json.data as EncryptedVaultEnvelope;
      }
      return null;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Cloud sync request timed out (10s)');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async put(vaultId: string, envelope: EncryptedVaultEnvelope): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const putRes = await fetch(`${this.endpoint}/${encodeURIComponent(vaultId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `expense_tracker_vault_${vaultId.slice(0, 8)}`,
          data: envelope
        }),
        signal: controller.signal
      });

      if (putRes.ok) return true;

      if (putRes.status === 404) {
        const postRes = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `expense_tracker_vault_${vaultId.slice(0, 8)}`,
            data: envelope
          }),
          signal: controller.signal
        });
        if (postRes.ok) return true;
      }

      throw new Error(`Cloud relay write failed (HTTP ${putRes.status})`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Cloud sync upload timed out (10s)');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Custom Serverless / Cloudflare Worker Locker
 * Follows REST convention:
 *   GET  <endpoint>/api/vault/:vaultId
 *   PUT  <endpoint>/api/vault/:vaultId
 */
export class CustomWorkerLocker implements CloudLockerAdapter {
  private endpoint: string;
  private authHeader?: string;

  constructor(endpoint: string, authHeader?: string) {
    this.endpoint = endpoint.replace(/\/+$/, '');
    this.authHeader = authHeader;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-App-Client': 'ExpenseTracker-E2EE-v1'
    };
    if (this.authHeader) {
      headers['Authorization'] = this.authHeader.startsWith('Bearer ')
        ? this.authHeader
        : `Bearer ${this.authHeader}`;
    }
    return headers;
  }

  async get(vaultId: string): Promise<EncryptedVaultEnvelope | null> {
    const url = `${this.endpoint}/api/vault/${encodeURIComponent(vaultId)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });

      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error(`Cloud locker returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      return data as EncryptedVaultEnvelope;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Cloud sync request timed out (10s)');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async put(vaultId: string, envelope: EncryptedVaultEnvelope): Promise<boolean> {
    const url = `${this.endpoint}/api/vault/${encodeURIComponent(vaultId)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(envelope),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`Cloud locker update failed (HTTP ${res.status}): ${res.statusText}`);
      }
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Cloud sync upload timed out (10s)');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Supabase Locker Adapter
 * Uses standard PostgREST table:
 *   create table sync_vaults (
 *     vault_id text primary key,
 *     envelope jsonb not null,
 *     updated_at timestamptz default now()
 *   );
 */
export class SupabaseLocker implements CloudLockerAdapter {
  private url: string;
  private anonKey: string;

  constructor(supabaseUrl: string, anonKey: string) {
    this.url = supabaseUrl.replace(/\/+$/, '');
    this.anonKey = anonKey;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      apikey: this.anonKey,
      Authorization: `Bearer ${this.anonKey}`,
      Prefer: 'return=representation'
    };
  }

  async get(vaultId: string): Promise<EncryptedVaultEnvelope | null> {
    const endpoint = `${this.url}/rest/v1/sync_vaults?vault_id=eq.${encodeURIComponent(vaultId)}&select=envelope`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!res.ok) {
      throw new Error(`Supabase query failed: HTTP ${res.status}`);
    }

    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0].envelope) {
      return rows[0].envelope as EncryptedVaultEnvelope;
    }
    return null;
  }

  async put(vaultId: string, envelope: EncryptedVaultEnvelope): Promise<boolean> {
    const endpoint = `${this.url}/rest/v1/sync_vaults`;
    const headers = {
      ...this.getHeaders(),
      Prefer: 'resolution=merge-duplicates'
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vault_id: vaultId,
        envelope,
        updated_at: new Date().toISOString()
      })
    });

    if (!res.ok) {
      throw new Error(`Supabase upsert failed: HTTP ${res.status}`);
    }
    return true;
  }
}

/**
 * Factory to instantiate the appropriate adapter based on config.
 */
export function createLockerAdapter(config: SyncConfig): CloudLockerAdapter {
  if (config.provider === 'supabase' && config.supabaseUrl && config.supabaseAnonKey) {
    return new SupabaseLocker(config.supabaseUrl, config.supabaseAnonKey);
  }
  if (config.provider === 'relay') {
    return new RestfulApiRelayLocker();
  }

  const endpoint = config.customEndpoint || DEFAULT_CLOUDFLARE_WORKER_URL;
  return new CustomWorkerLocker(endpoint, config.customAuthHeader);
}

export interface EndpointProbeResult {
  ok: boolean;
  status?: number;
  message: string;
  isCloudflareUndeployed?: boolean;
}

/**
 * Probes a Cloudflare Worker or serverless sync endpoint to check deployment and connectivity.
 */
export async function probeEndpoint(endpointUrl: string): Promise<EndpointProbeResult> {
  const base = (endpointUrl || '').trim().replace(/\/+$/, '');
  if (!base) {
    return { ok: false, message: 'Endpoint URL cannot be empty.' };
  }

  const healthUrl = `${base}/api/health`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    const contentType = res.headers.get('content-type') || '';

    if (res.ok) {
      return {
        ok: true,
        status: res.status,
        message: 'Cloudflare Worker is online and active (HTTP 200 OK).'
      };
    }

    if (res.status === 404) {
      if (contentType.includes('application/json')) {
        return {
          ok: true,
          status: 404,
          message: 'Cloudflare Worker is online and responding to API requests.'
        };
      }
      return {
        ok: false,
        status: 404,
        isCloudflareUndeployed: true,
        message: 'Cloudflare subdomain reachable, but worker is not deployed yet (HTTP 404 HTML). Run "npm run deploy:worker".'
      };
    }

    return {
      ok: false,
      status: res.status,
      message: `Endpoint returned HTTP ${res.status}: ${res.statusText || 'Unexpected response'}`
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        ok: false,
        message: 'Connection timed out (8s). Check your internet or endpoint URL.'
      };
    }
    const isWorkersDev = base.includes('workers.dev');
    return {
      ok: false,
      isCloudflareUndeployed: isWorkersDev,
      message: isWorkersDev
        ? 'Could not reach worker ("Failed to fetch"). The worker has not been deployed to your Cloudflare account yet. Run "npx wrangler login" and "npm run deploy:worker".'
        : `Connection failed: ${err.message || 'Network error or CORS restriction.'}`
    };
  } finally {
    clearTimeout(timer);
  }
}
