import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { updateCacheBusting } from './cache_bust.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function getApiKey() {
  if (process.env.HERENOW_API_KEY) return process.env.HERENOW_API_KEY.trim();
  const credPath = path.join(os.homedir(), '.herenow', 'credentials');
  if (fs.existsSync(credPath)) {
    return fs.readFileSync(credPath, 'utf8').trim();
  }
  return null;
}

export async function deploy(requestedSlug) {
  const rootDir = path.resolve(__dirname, '..');
  const siteConfigPath = path.resolve(rootDir, '.herenow-site.json');
  
  let targetSlug = requestedSlug;
  if (!targetSlug && fs.existsSync(siteConfigPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'));
      if (saved && saved.slug) targetSlug = saved.slug;
    } catch (_) {}
  }

  // Ensure cache busting is updated
  updateCacheBusting(rootDir);

  const apiKey = getApiKey();
  const fileDefs = [
    { path: 'index.html', contentType: 'text/html; charset=utf-8' },
    { path: 'manifest.webmanifest', contentType: 'application/manifest+json; charset=utf-8' },
    { path: 'sw.js', contentType: 'text/javascript; charset=utf-8' },
    { path: 'icons/icon-192.png', contentType: 'image/png' },
    { path: 'icons/icon-512.png', contentType: 'image/png' },
    { path: 'icons/icon-512-maskable.png', contentType: 'image/png' },
    { path: 'icons/apple-touch-icon.png', contentType: 'image/png' },
    { path: 'favicon-32.png', contentType: 'image/png' },
    { path: 'icons/favicon-32.png', contentType: 'image/png' }
  ];

  const filesPayload = [];
  const fileBuffers = {};

  for (const def of fileDefs) {
    let filePath = path.resolve(rootDir, def.path);
    if (!fs.existsSync(filePath)) {
      const publicPath = path.resolve(rootDir, 'public', def.path);
      if (fs.existsSync(publicPath)) {
        filePath = publicPath;
      } else {
        // Skip optional favicon at root if in icons/
        if (def.path === 'favicon-32.png') continue;
        throw new Error(`Deployment asset missing: ${def.path}`);
      }
    }
    const buffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    fileBuffers[def.path] = buffer;
    filesPayload.push({
      path: def.path,
      size: buffer.length,
      contentType: def.contentType,
      hash
    });
  }

  const headers = {
    'content-type': 'application/json',
    'X-HereNow-Client': 'antigravity/deploy-agent'
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  let initRes;
  if (targetSlug) {
    console.log(`Checking existing site on here.now: ${targetSlug}...`);
    initRes = await fetch(`https://here.now/api/v1/publish/${targetSlug}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        files: filesPayload,
        displayName: 'Glassmorphic Expense Tracker',
        displayDescription: 'Personal finance tracker with offline PWA & E2EE zero-knowledge cloud sync'
      })
    });
  }

  if (!initRes || initRes.status === 404) {
    console.log('Creating new site on here.now...');
    initRes = await fetch('https://here.now/api/v1/publish', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        files: filesPayload,
        displayName: 'Glassmorphic Expense Tracker',
        displayDescription: 'Personal finance tracker with offline PWA & E2EE zero-knowledge cloud sync'
      })
    });
  }

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Init publish failed (${initRes.status}): ${errText}`);
  }

  const initData = await initRes.json();
  console.log(`Target Slug: ${initData.slug}`);
  console.log(`Live Site URL: ${initData.siteUrl}`);

  const uploadPlan = initData.upload;
  if (!uploadPlan) {
    throw new Error('No upload plan returned from here.now');
  }

  const uploads = uploadPlan.uploads || [];
  const skipped = uploadPlan.skipped || [];

  if (skipped.length > 0) {
    console.log(`Skipped unchanged files: ${skipped.join(', ')}`);
  }

  if (uploads.length > 0) {
    console.log(`Uploading ${uploads.length} changed file(s)...`);
    for (const item of uploads) {
      console.log(`Uploading ${item.path}...`);
      const buffer = fileBuffers[item.path];
      const upRes = await fetch(item.url, {
        method: item.method || 'PUT',
        headers: item.headers || { 'Content-Type': 'application/octet-stream' },
        body: buffer
      });

      if (!upRes.ok) {
        const upErr = await upRes.text();
        throw new Error(`Failed uploading ${item.path}: ${upErr}`);
      }
    }
  } else {
    console.log('All files are identical; nothing new to upload.');
  }

  console.log('Finalizing deployment...');
  const finalizeRes = await fetch(uploadPlan.finalizeUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      versionId: uploadPlan.versionId
    })
  });

  if (!finalizeRes.ok) {
    const finErr = await finalizeRes.text();
    throw new Error(`Finalize failed: ${finErr}`);
  }

  // Save site info for future updates
  fs.writeFileSync(siteConfigPath, JSON.stringify({
    slug: initData.slug,
    siteUrl: initData.siteUrl,
    versionId: uploadPlan.versionId,
    deployedAt: new Date().toISOString()
  }, null, 2), 'utf8');

  console.log('\n=============================================');
  console.log('🚀 LIVE PWA DEPLOYED SUCCESSFULLY!');
  console.log(`🔗 Live URL: ${initData.siteUrl}`);
  console.log(`📦 Version: ${uploadPlan.versionId}`);
  console.log('=============================================\n');
  return initData;
}

if (process.argv[1] && process.argv[1].endsWith('deploy_herenow.js')) {
  const targetSlug = process.argv[2] || process.env.HERENOW_SLUG;
  deploy(targetSlug).catch(err => {
    console.error('Deployment error:', err.message);
    process.exit(1);
  });
}
