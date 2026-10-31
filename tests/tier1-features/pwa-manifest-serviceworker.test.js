import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { updateCacheBusting, computeFileHash } from '../../scripts/cache_bust.js';

describe('Tier 1: PWA Installation, Service Worker & Web Share Target (Issue #18)', () => {
  const rootDir = process.cwd();

  it('should have a valid manifest.webmanifest with standalone mode and share_target', () => {
    const manifestPath = path.resolve(rootDir, 'manifest.webmanifest');
    assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.theme_color, '#0b0f17');
    assert.equal(manifest.background_color, '#0b0f17');
    assert.ok(Array.isArray(manifest.icons), 'icons must be an array');
    assert.ok(manifest.icons.length >= 3, 'at least 3 icons defined');

    // Verify share_target
    assert.ok(manifest.share_target, 'share_target must be configured');
    assert.equal(manifest.share_target.action, '/');
    assert.equal(manifest.share_target.params.text, 'share_text');
    assert.equal(manifest.share_target.params.title, 'share_title');
    assert.equal(manifest.share_target.params.url, 'share_url');
  });

  it('should generate all required PWA icons with correct dimensions and PNG headers', () => {
    const requiredIcons = [
      'icon-192.png',
      'icon-512.png',
      'icon-512-maskable.png',
      'apple-touch-icon.png',
      'favicon-32.png'
    ];

    for (const icon of requiredIcons) {
      const rootPath = path.resolve(rootDir, 'icons', icon);
      const publicPath = path.resolve(rootDir, 'public/icons', icon);
      assert.ok(fs.existsSync(rootPath), `icons/${icon} must exist`);
      assert.ok(fs.existsSync(publicPath), `public/icons/${icon} must exist`);

      const buf = fs.readFileSync(rootPath);
      assert.ok(buf.length > 500, `${icon} must have non-trivial size`);
      // PNG 8-byte magic header: 137 80 78 71 13 10 26 10
      assert.equal(buf[0], 0x89);
      assert.equal(buf[1], 0x50); // 'P'
      assert.equal(buf[2], 0x4e); // 'N'
      assert.equal(buf[3], 0x47); // 'G'
    }
  });

  it('should have a valid sw.js offline service worker with navigation fallback and precaching', () => {
    const swPath = path.resolve(rootDir, 'sw.js');
    assert.ok(fs.existsSync(swPath), 'sw.js must exist');

    const content = fs.readFileSync(swPath, 'utf8');
    assert.ok(content.includes('CACHE_NAME'), 'sw.js must define CACHE_NAME');
    assert.ok(content.includes('PRECACHE_ASSETS'), 'sw.js must define PRECACHE_ASSETS');
    assert.ok(content.includes('/manifest.webmanifest'), 'sw.js must precache manifest');
    assert.ok(content.includes('mode === \'navigate\''), 'sw.js must handle navigation fallback');
  });

  it('should run cache_bust.js and deterministically update sw.js CACHE_NAME with hash', () => {
    const res = updateCacheBusting(rootDir);
    assert.ok(res.htmlHash, 'cache bust should return a html hash');
    assert.ok(res.newCacheName.startsWith('expense-tracker-vault-'), 'cache name prefix must match');

    const swContent = fs.readFileSync(path.resolve(rootDir, 'sw.js'), 'utf8');
    assert.ok(swContent.includes(res.newCacheName), 'sw.js must contain the updated cache name');
  });

  it('should have iOS and PWA meta tags in index.dev.html and index.html', () => {
    const devHtml = fs.readFileSync(path.resolve(rootDir, 'index.dev.html'), 'utf8');
    assert.ok(devHtml.includes('rel="manifest"'), 'must link to manifest');
    assert.ok(devHtml.includes('name="apple-mobile-web-app-capable" content="yes"'), 'apple-mobile-web-app-capable must be set');
    assert.ok(devHtml.includes('apple-mobile-web-app-status-bar-style'), 'status bar style must be set');
    assert.ok(devHtml.includes('viewport-fit=cover'), 'viewport-fit=cover must be set');
  });
});
