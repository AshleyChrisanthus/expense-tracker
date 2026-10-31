import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSyncModules, mockFetch, restoreFetch } from '../helpers/setup.js';

describe('Tier 1: End-to-End Encrypted (E2EE) Cloud Sync & QR Pairing (Issue #19)', () => {
  it('should generate valid 256-bit AES-GCM keys and roundtrip Base64URL encoding', async () => {
    const { generateSecretKey, base64UrlToBytes, bytesToBase64Url } = await getSyncModules();
    const key = await generateSecretKey();
    assert.equal(typeof key, 'string');
    assert.ok(key.length >= 42, 'Base64URL 32-byte key length');

    const bytes = base64UrlToBytes(key);
    assert.equal(bytes.length, 32, 'Must be 32 bytes (256 bits)');

    const reEncoded = bytesToBase64Url(bytes);
    assert.equal(reEncoded, key, 'Base64URL must roundtrip identically');
  });

  it('should generate valid vault identifiers', async () => {
    const { generateVaultId } = await getSyncModules();
    const vaultId = generateVaultId();
    assert.equal(typeof vaultId, 'string');
    assert.ok(vaultId.length >= 16, 'Vault ID must be at least 16 hex characters');
  });

  it('should derive deterministic AES keys from passphrases via PBKDF2', async () => {
    const { deriveKeyFromPassphrase } = await getSyncModules();
    const passphrase = 'correct horse battery staple';
    const salt = new Uint8Array(16).fill(42);

    const derived1 = await deriveKeyFromPassphrase(passphrase, salt);
    const derived2 = await deriveKeyFromPassphrase(passphrase, salt);

    assert.equal(derived1.secretKey, derived2.secretKey, 'Identical passphrase and salt must yield identical keys');
  });

  it('should encrypt and decrypt payloads with AES-GCM 256-bit authenticated encryption', async () => {
    const { generateSecretKey, encryptPayload, decryptPayload } = await getSyncModules();
    const secretKey = await generateSecretKey();
    const deviceId = 'test-device-1';

    const samplePayload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      deviceId,
      transactions: [
        {
          id: 'tx-sync-1',
          date: '2026-10-31',
          amount: 85.50,
          type: 'expense',
          paymentModeId: 'bank',
          category: 'Dining',
          description: 'Obsidian Cafe',
          createdAt: 1700000000000,
          updatedAt: 1700000001000
        }
      ],
      paymentModes: [
        { id: 'bank', name: 'Everyday Bank', icon: 'landmark', color: '#10b981', updatedAt: 1700000000000 }
      ],
      categories: ['Dining', 'Groceries'],
      banners: [
        { id: 'b-trip', name: 'Tokyo Trip', color: '#6366f1', createdAt: 1700000000000, updatedAt: 1700000000000 }
      ],
      tombstones: []
    };

    // Encrypt
    const envelope = await encryptPayload(samplePayload, secretKey, deviceId);
    assert.equal(envelope.v, 1);
    assert.ok(envelope.iv, 'Must contain IV');
    assert.ok(envelope.ciphertext, 'Must contain ciphertext');
    assert.equal(envelope.deviceId, deviceId);

    // Decrypt
    const decrypted = await decryptPayload(envelope, secretKey);
    assert.deepEqual(decrypted.transactions, samplePayload.transactions);
    assert.deepEqual(decrypted.paymentModes, samplePayload.paymentModes);
    assert.deepEqual(decrypted.categories, samplePayload.categories);
    assert.deepEqual(decrypted.banners, samplePayload.banners);
  });

  it('should reject decryption when ciphertext is tampered or key is wrong', async () => {
    const { generateSecretKey, encryptPayload, decryptPayload } = await getSyncModules();
    const secretKey1 = await generateSecretKey();
    const secretKey2 = await generateSecretKey();

    const samplePayload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      deviceId: 'dev',
      transactions: [],
      paymentModes: [],
      categories: [],
      banners: [],
      tombstones: []
    };

    const envelope = await encryptPayload(samplePayload, secretKey1, 'dev');

    // Wrong key
    await assert.rejects(
      async () => {
        await decryptPayload(envelope, secretKey2);
      },
      /operation failed|tag mismatch|decrypt/i
    );

    // Tampered ciphertext
    const tampered = { ...envelope, ciphertext: envelope.ciphertext.slice(0, -4) + 'AAAA' };
    await assert.rejects(
      async () => {
        await decryptPayload(tampered, secretKey1);
      },
      /operation failed|tag mismatch|decrypt/i
    );
  });

  it('should use fresh random IVs on every encryption call', async () => {
    const { generateSecretKey, encryptPayload } = await getSyncModules();
    const secretKey = await generateSecretKey();
    const samplePayload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      deviceId: 'dev',
      transactions: [],
      paymentModes: [],
      categories: [],
      banners: [],
      tombstones: []
    };

    const env1 = await encryptPayload(samplePayload, secretKey, 'dev');
    const env2 = await encryptPayload(samplePayload, secretKey, 'dev');

    assert.notEqual(env1.iv, env2.iv, 'IVs must be fresh and unique');
    assert.notEqual(env1.ciphertext, env2.ciphertext, 'Ciphertexts must differ due to unique IV');
  });

  it('should merge entities using Last-Write-Wins (LWW) and respect tombstones', async () => {
    const { mergeSyncPayload } = await getSyncModules();
    const now = Date.now();
    const localTx = [
      {
        id: 'tx-1',
        date: '2026-10-01',
        amount: 50,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Food',
        description: 'Local Version',
        createdAt: now - 10000,
        updatedAt: now - 8000
      },
      {
        id: 'tx-deleted-locally',
        date: '2026-10-02',
        amount: 20,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Food',
        description: 'Should be deleted',
        createdAt: now - 10000,
        updatedAt: now - 5000
      }
    ];

    const remoteTx = [
      {
        id: 'tx-1',
        date: '2026-10-01',
        amount: 65,
        type: 'expense',
        paymentModeId: 'bank',
        category: 'Food',
        description: 'Remote Winner',
        createdAt: now - 10000,
        updatedAt: now - 2000
      },
      {
        id: 'tx-new-from-remote',
        date: '2026-10-03',
        amount: 100,
        type: 'income',
        paymentModeId: 'bank',
        category: 'Salary',
        description: 'Remote Income',
        createdAt: now - 3000,
        updatedAt: now - 3000
      }
    ];

    const localTombstones = [
      {
        id: 'tx-deleted-locally',
        type: 'transaction',
        deletedAt: new Date(now - 1000).toISOString()
      }
    ];

    const remotePayload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      deviceId: 'remote-phone',
      transactions: remoteTx,
      paymentModes: [],
      categories: ['Food', 'Salary'],
      banners: [],
      tombstones: []
    };

    const result = mergeSyncPayload(
      localTx,
      [],
      ['Food'],
      [],
      localTombstones,
      remotePayload
    );

    assert.equal(result.hasChanges, true);
    assert.equal(result.mergedTransactions.some(t => t.id === 'tx-deleted-locally'), false);

    const tx1 = result.mergedTransactions.find(t => t.id === 'tx-1');
    assert.ok(tx1);
    assert.equal(tx1.amount, 65);
    assert.equal(tx1.description, 'Remote Winner');

    const newTx = result.mergedTransactions.find(t => t.id === 'tx-new-from-remote');
    assert.ok(newTx);
    assert.equal(newTx.amount, 100);
  });

  it('should prune tombstones older than 30 days', async () => {
    const { pruneTombstones } = await getSyncModules();
    const now = Date.now();
    const freshTombstone = {
      id: 'tx-fresh',
      type: 'transaction',
      deletedAt: new Date(now - 5 * 86400000).toISOString()
    };
    const staleTombstone = {
      id: 'tx-stale',
      type: 'transaction',
      deletedAt: new Date(now - 35 * 86400000).toISOString()
    };

    const pruned = pruneTombstones([freshTombstone, staleTombstone]);
    assert.equal(pruned.length, 1);
    assert.equal(pruned[0].id, 'tx-fresh');
  });

  it('should generate valid QR code matrices and SVG elements without external dependencies', async () => {
    const { generateQrMatrix, generateQrSvg } = await getSyncModules();
    const pairingUrl = 'https://expense-tracker-vault.here.now/#sync=v1:vault123:secret456';
    const matrix = generateQrMatrix(pairingUrl);

    assert.ok(Array.isArray(matrix));
    assert.ok(matrix.length >= 21, 'QR matrix dimension at least version 1 (21x21)');
    assert.equal(matrix.length, matrix[0].length, 'QR matrix must be square');

    const svg = generateQrSvg(pairingUrl, { color: '#ffffff', background: '#0b0f17' });
    assert.ok(svg.includes('<svg'), 'SVG must include root tag');
    assert.ok(svg.includes('<rect'), 'SVG must include background rect');
    assert.ok(svg.includes('<path'), 'SVG must include module path');
  });

  it('should construct secure pairing URLs targeting canonical hosted URL', async () => {
    const { SyncManager, CANONICAL_HOSTED_URL } = await getSyncModules();
    const manager = new SyncManager();
    const url = manager.generatePairingUrl('vault_abc', 'key_xyz');

    assert.ok(url.startsWith(CANONICAL_HOSTED_URL) || url.startsWith('http'));
    assert.ok(url.includes('#sync=v1:vault_abc:key_xyz'));
  });

  it('should create vault locally with offline status when cloud endpoint returns 404 (local-first resilience, Issue #24)', async () => {
    const { SyncManager } = await getSyncModules();
    const manager = new SyncManager();

    // Mock fetch returning HTML 404 (simulating undeployed worker or network error)
    mockFetch(async (url, init) => {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'Content-Type': 'text/html' }),
        text: async () => '<!DOCTYPE html><title>Page not found</title>',
        json: async () => { throw new Error('Not JSON'); }
      };
    });

    try {
      const config = await manager.createNewVault('custom', 'https://offline-test.workers.dev');
      assert.ok(config, 'Config must be returned');
      assert.ok(config.vaultId, 'Must generate vault ID');
      assert.ok(config.secretKey, 'Must generate AES-GCM secret key');
      assert.equal(config.enabled, true);

      const status = manager.getStatus();
      assert.equal(status.state, 'offline', 'Status must be set to offline instead of throwing');
      assert.ok(status.errorMessage?.includes('Vault created locally'), 'Informative offline error message set');
    } finally {
      restoreFetch();
    }
  });

  it('should probe sync endpoints and distinguish active worker JSON from undeployed HTML 404 (Issue #24)', async () => {
    const { probeEndpoint } = await getSyncModules();

    // Probe 1: Undeployed Cloudflare domain returning HTML 404
    mockFetch(async () => {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'Content-Type': 'text/html' }),
        text: async () => 'Page not found',
        json: async () => { throw new Error('Not JSON'); }
      };
    });

    const undeployedResult = await probeEndpoint('https://undeployed.workers.dev');
    assert.equal(undeployedResult.ok, false);
    assert.equal(undeployedResult.status, 404);
    assert.equal(undeployedResult.isCloudflareUndeployed, true);
    assert.ok(undeployedResult.message.includes('npm run deploy:worker'));

    // Probe 2: Active Worker returning 200 JSON
    mockFetch(async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: async () => JSON.stringify({ status: 'ok', service: 'expense-tracker-sync' }),
        json: async () => ({ status: 'ok', service: 'expense-tracker-sync' })
      };
    });

    const activeResult = await probeEndpoint('https://active-worker.workers.dev');
    assert.equal(activeResult.ok, true);
    assert.equal(activeResult.status, 200);
    assert.ok(activeResult.message.includes('online and active'));

    restoreFetch();
  });

  it('should update custom endpoint and persist to storage (Issue #24)', async () => {
    const { SyncManager } = await getSyncModules();
    const manager = new SyncManager();

    mockFetch(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      text: async () => JSON.stringify({}),
      json: async () => ({})
    }));

    try {
      await manager.createNewVault();
      manager.updateEndpoint('https://custom-sync-proxy.mycompany.com');
      assert.equal(manager.getConfig()?.customEndpoint, 'https://custom-sync-proxy.mycompany.com');
    } finally {
      manager.disconnectVault();
      restoreFetch();
    }
  });
});
