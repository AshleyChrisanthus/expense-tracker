/**
 * Standalone Reference Cloudflare Worker for Expense Tracker E2EE Cloud Sync
 * 
 * Provides zero-knowledge storage for encrypted AES-GCM envelopes.
 * The server never sees or stores plaintext data or decryption keys.
 * 
 * Prerequisites in Cloudflare Dashboard:
 * 1. Create a KV Namespace named: EXPENSE_VAULTS (or SYNC_VAULTS)
 * 2. Bind KV Namespace to variable: EXPENSE_VAULTS
 * 3. Deploy this worker script!
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Client',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Client',
      'Content-Type': 'application/json'
    };

    // Health check route: /api/health or /health
    if (url.pathname === '/api/health' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'expense-tracker-sync',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Route: /api/vault/:vaultId
    const match = url.pathname.match(/^\/api\/vault\/([a-zA-Z0-9_-]+)$/);
    if (!match) {
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const vaultId = match[1];
    const kv = env.EXPENSE_VAULTS || env.SYNC_VAULTS;
    if (!kv) {
      return new Response(JSON.stringify({ error: 'KV Namespace EXPENSE_VAULTS not configured' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    try {
      if (request.method === 'GET') {
        const rawEnvelope = await kv.get(`vault:${vaultId}`);
        if (!rawEnvelope) {
          return new Response(JSON.stringify({ error: 'Vault not found' }), {
            status: 404,
            headers: corsHeaders
          });
        }
        return new Response(rawEnvelope, {
          status: 200,
          headers: corsHeaders
        });
      }

      if (request.method === 'PUT') {
        const envelope = await request.json();
        if (!envelope || !envelope.ciphertext || !envelope.iv) {
          return new Response(JSON.stringify({ error: 'Invalid envelope structure' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        // Store encrypted blob in KV with 180-day retention
        await kv.put(`vault:${vaultId}`, JSON.stringify(envelope), {
          expirationTtl: 60 * 60 * 24 * 180
        });

        return new Response(JSON.stringify({ success: true, vaultId, updatedAt: new Date().toISOString() }), {
          status: 200,
          headers: corsHeaders
        });
      }

      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
