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
const docEventListeners = new Map();
const winEventListeners = new Map();

globalThis.document = {
  visibilityState: 'visible',
  hidden: false,
  addEventListener: (event, handler) => {
    if (!docEventListeners.has(event)) docEventListeners.set(event, new Set());
    docEventListeners.get(event).add(handler);
  },
  removeEventListener: (event, handler) => {
    if (docEventListeners.has(event)) docEventListeners.get(event).delete(handler);
  },
  dispatchEvent: (event) => {
    const type = typeof event === 'string' ? event : event.type;
    const handlers = docEventListeners.get(type);
    if (handlers) handlers.forEach(fn => fn(event));
  },
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
if (!globalThis.addEventListener) {
  globalThis.addEventListener = (event, handler) => {
    if (!winEventListeners.has(event)) winEventListeners.set(event, new Set());
    winEventListeners.get(event).add(handler);
  };
}
if (!globalThis.removeEventListener) {
  globalThis.removeEventListener = (event, handler) => {
    if (winEventListeners.has(event)) winEventListeners.get(event).delete(handler);
  };
}
if (!globalThis.dispatchEvent) {
  globalThis.dispatchEvent = (event) => {
    const type = typeof event === 'string' ? event : event.type;
    const handlers = winEventListeners.get(type);
    if (handlers) handlers.forEach(fn => fn(event));
  };
}
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

export async function getTransactionSheetModule() {
  const tsPath = path.resolve(process.cwd(), 'src/utils/transactionSheet.ts');
  if (fs.existsSync(tsPath)) {
    return await import('../../src/utils/transactionSheet.ts');
  }
  return await import('../../src/utils/transactionSheet.js');
}

export async function getAnalyticsModule() {
  const tsPath = path.resolve(process.cwd(), 'src/utils/analytics.ts');
  if (fs.existsSync(tsPath)) {
    return await import('../../src/utils/analytics.ts');
  }
  return await import('../../src/utils/analytics.js');
}

export async function getTimezoneModule() {
  const tsPath = path.resolve(process.cwd(), 'src/utils/timezone.ts');
  if (fs.existsSync(tsPath)) {
    return await import('../../src/utils/timezone.ts');
  }
  return await import('../../src/utils/timezone.js');
}

export async function getLiveTickerModule() {
  const tsPath = path.resolve(process.cwd(), 'src/hooks/useLiveTicker.ts');
  if (fs.existsSync(tsPath)) {
    return await import('../../src/hooks/useLiveTicker.ts');
  }
  return await import('../../src/hooks/useLiveTicker.js');
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
  try {
    const liveTicker = await getLiveTickerModule();
    if (liveTicker.stopTicker) {
      liveTicker.stopTicker();
    }
  } catch {}
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
