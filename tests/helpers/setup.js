import 'fake-indexeddb/auto';
import { register } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

// Register module hook for import.meta.env & .ts/.js extension resolution
try {
  register(new URL('./loader-hook.mjs', import.meta.url));
} catch (e) {
  // Ignore if already registered
}

// Initialize global importMetaEnv
globalThis.importMetaEnv = globalThis.importMetaEnv || {};

// Polyfill in-memory localStorage
const localStorageStore = new Map();
globalThis.localStorage = {
  getItem: (key) => localStorageStore.get(key) || null,
  setItem: (key, val) => localStorageStore.set(key, String(val)),
  removeItem: (key) => localStorageStore.delete(key),
  clear: () => localStorageStore.clear(),
  get length() { return localStorageStore.size; },
  key: (i) => Array.from(localStorageStore.keys())[i] || null
};

// Polyfill minimal document / DOM
const domAttributes = new Map();
const domStyles = new Map();
globalThis.document = {
  documentElement: {
    setAttribute: (k, v) => domAttributes.set(k, String(v)),
    getAttribute: (k) => domAttributes.get(k) || null,
    removeAttribute: (k) => domAttributes.delete(k),
    style: {
      setProperty: (k, v) => domStyles.set(k, String(v)),
      removeProperty: (k) => domStyles.delete(k),
      getPropertyValue: (k) => domStyles.get(k) || ''
    }
  },
  createElement: (tag) => {
    return {
      tagName: tag.toUpperCase(),
      href: '',
      download: '',
      click: () => {},
      remove: () => {},
      setAttribute: () => {},
      style: {}
    };
  },
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

// Polyfill window
globalThis.window = globalThis;
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => 'blob:mock-url-' + Math.random().toString(36).slice(2);
  globalThis.URL.revokeObjectURL = () => {};
}

// Dynamic module import helpers
export async function getDbModule() {
  const tsPath = path.resolve(process.cwd(), 'src/db/index.ts');
  if (fs.existsSync(tsPath)) {
    return await import('../../src/db/index.ts');
  }
  return await import('../../src/db/index.js');
}

export async function getRecurrenceModule() {
  const tsPath = path.resolve(process.cwd(), 'src/utils/recurrence.ts');
  if (fs.existsSync(tsPath)) {
    return await import('../../src/utils/recurrence.ts');
  }
  return await import('../../src/utils/recurrence.js');
}

export async function getExportServiceModule() {
  const tsPath = path.resolve(process.cwd(), 'src/services/exportService.ts');
  if (fs.existsSync(tsPath)) {
    return await import('../../src/services/exportService.ts');
  }
  return await import('../../src/services/exportService.js');
}

export async function getThemeModule() {
  const tsPath = path.resolve(process.cwd(), 'src/styles/theme.ts');
  if (fs.existsSync(tsPath)) {
    return await import('../../src/styles/theme.ts');
  }
  return await import('../../src/styles/theme.js');
}

export async function getStorageModule() {
  const tsPath = path.resolve(process.cwd(), 'src/utils/storage.ts');
  if (fs.existsSync(tsPath)) {
    return await import('../../src/utils/storage.ts');
  }
  return await import('../../src/utils/storage.js');
}

export async function getSyncModules() {
  const crypto = await import('../../src/services/sync/crypto.ts');
  const merger = await import('../../src/services/sync/merger.ts');
  const qr = await import('../../src/services/sync/qr.ts');
  const backend = await import('../../src/services/sync/backend.ts');
  const syncManager = await import('../../src/services/sync/sync-manager.ts');
  return { ...crypto, ...merger, ...qr, ...backend, ...syncManager };
}

// Reset database tables and state between tests
export async function resetDatabase() {
  const { db } = await getDbModule();
  if (db && db.isOpen()) {
    await db.transactions.clear();
    await db.paymentModes.clear();
    await db.categories.clear();
    if (db.banners) {
      await db.banners.clear();
    }
    if (db.settings) {
      await db.settings.clear();
    }
  }
  localStorageStore.clear();
  domAttributes.clear();
  domStyles.clear();
  globalThis.importMetaEnv = {};
}

// Mock Fetch Helper for deterministic unit/e2e testing
let originalFetch = globalThis.fetch;

export function mockFetch(handler) {
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    return handler(url, init);
  };
}

export function restoreFetch() {
  globalThis.fetch = originalFetch;
}
