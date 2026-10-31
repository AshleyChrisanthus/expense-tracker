import type { Transaction, PaymentMode, Banner } from '../../types/expense';
import type { DecryptedSyncPayload, SyncTombstone } from './types';

const TOMBSTONE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function pruneTombstones(tombstones: SyncTombstone[]): SyncTombstone[] {
  const cutoff = Date.now() - TOMBSTONE_MAX_AGE_MS;
  return tombstones.filter((t) => {
    const time = new Date(t.deletedAt).getTime();
    return !isNaN(time) && time > cutoff;
  });
}

export function mergeSyncPayload(
  localTransactions: Transaction[],
  localPaymentModes: PaymentMode[],
  localCategories: string[],
  localBanners: Banner[],
  localTombstones: SyncTombstone[],
  remotePayload: DecryptedSyncPayload
): {
  mergedTransactions: Transaction[];
  mergedPaymentModes: PaymentMode[];
  mergedCategories: string[];
  mergedBanners: Banner[];
  mergedTombstones: SyncTombstone[];
  hasChanges: boolean;
} {
  // 1. Merge and prune tombstones
  const tombstoneMap = new Map<string, SyncTombstone>();

  for (const t of [...localTombstones, ...(remotePayload.tombstones || [])]) {
    if (!t || !t.id) continue;
    const existing = tombstoneMap.get(t.id);
    if (!existing) {
      tombstoneMap.set(t.id, t);
    } else {
      const existingTime = new Date(existing.deletedAt).getTime();
      const newTime = new Date(t.deletedAt).getTime();
      if (newTime > existingTime) {
        tombstoneMap.set(t.id, t);
      }
    }
  }

  const mergedTombstones = pruneTombstones(Array.from(tombstoneMap.values()));
  const activeTombstoneLookup = new Map<string, number>();
  for (const t of mergedTombstones) {
    activeTombstoneLookup.set(t.id, new Date(t.deletedAt).getTime());
  }

  // 2. Merge Transactions (LWW with updatedAt / createdAt)
  const txMap = new Map<string, Transaction>();

  const processTx = (tx: Transaction) => {
    if (!tx || !tx.id) return;
    const txTime = tx.updatedAt || tx.createdAt || (tx.date ? new Date(tx.date).getTime() : 0);
    const deletedTime = activeTombstoneLookup.get(tx.id);

    if (deletedTime && deletedTime >= txTime) {
      return;
    }

    if (!txMap.has(tx.id)) {
      txMap.set(tx.id, tx);
    } else {
      const current = txMap.get(tx.id)!;
      const currentTime = current.updatedAt || current.createdAt || (current.date ? new Date(current.date).getTime() : 0);
      if (txTime >= currentTime) {
        txMap.set(tx.id, tx);
      }
    }
  };

  for (const tx of localTransactions) processTx(tx);
  for (const tx of remotePayload.transactions || []) processTx(tx);

  const mergedTransactions = Array.from(txMap.values());

  // 3. Merge Payment Modes
  const modeMap = new Map<string, PaymentMode>();

  const processMode = (mode: PaymentMode) => {
    if (!mode || !mode.id) return;
    const modeTime = mode.updatedAt || 0;
    const deletedTime = activeTombstoneLookup.get(mode.id);

    if (deletedTime && deletedTime >= modeTime && !mode.isSystem) {
      return;
    }

    if (!modeMap.has(mode.id)) {
      modeMap.set(mode.id, mode);
    } else {
      const current = modeMap.get(mode.id)!;
      const currentTime = current.updatedAt || 0;
      if (modeTime >= currentTime) {
        modeMap.set(mode.id, { ...current, ...mode });
      }
    }
  };

  for (const m of localPaymentModes) processMode(m);
  for (const m of remotePayload.paymentModes || []) processMode(m);

  const mergedPaymentModes = Array.from(modeMap.values());

  // 4. Merge Categories
  const categorySet = new Set<string>();
  const addCategory = (cat: string) => {
    if (!cat || !cat.trim()) return;
    const trimmed = cat.trim();
    if (activeTombstoneLookup.has(trimmed.toLowerCase())) return;
    categorySet.add(trimmed);
  };

  for (const c of localCategories) addCategory(c);
  for (const c of remotePayload.categories || []) addCategory(c);
  // Also ensure categories used by transactions are included
  for (const tx of mergedTransactions) {
    if (tx.category) addCategory(tx.category);
  }

  const mergedCategories = Array.from(categorySet);

  // 5. Merge Banners
  const bannerMap = new Map<string, Banner>();

  const processBanner = (b: Banner) => {
    if (!b || !b.id) return;
    const bTime = b.updatedAt || b.createdAt || 0;
    const deletedTime = activeTombstoneLookup.get(b.id);

    if (deletedTime && deletedTime >= bTime) {
      return;
    }

    if (!bannerMap.has(b.id)) {
      bannerMap.set(b.id, b);
    } else {
      const current = bannerMap.get(b.id)!;
      const currentTime = current.updatedAt || current.createdAt || 0;
      if (bTime >= currentTime) {
        bannerMap.set(b.id, { ...current, ...b });
      }
    }
  };

  for (const b of localBanners) processBanner(b);
  for (const b of remotePayload.banners || []) processBanner(b);

  const mergedBanners = Array.from(bannerMap.values());

  // 6. Detect changes against local
  const hasTxChanged =
    mergedTransactions.length !== localTransactions.length ||
    mergedTransactions.some((t, i) => {
      const loc = localTransactions[i];
      if (!loc) return true;
      return (
        loc.id !== t.id ||
        loc.amount !== t.amount ||
        loc.date !== t.date ||
        loc.type !== t.type ||
        loc.paymentModeId !== t.paymentModeId ||
        loc.toPaymentModeId !== t.toPaymentModeId ||
        loc.description !== t.description ||
        loc.nextDueDate !== t.nextDueDate ||
        loc.updatedAt !== t.updatedAt
      );
    });

  const hasModesChanged =
    mergedPaymentModes.length !== localPaymentModes.length ||
    mergedPaymentModes.some((m, i) => {
      const loc = localPaymentModes[i];
      if (!loc) return true;
      return loc.id !== m.id || loc.name !== m.name || loc.icon !== m.icon || loc.color !== m.color;
    });

  const hasBannersChanged =
    mergedBanners.length !== localBanners.length ||
    mergedBanners.some((b, i) => {
      const loc = localBanners[i];
      if (!loc) return true;
      return loc.id !== b.id || loc.name !== b.name || loc.color !== b.color;
    });

  const hasCategoriesChanged = mergedCategories.length !== localCategories.length;
  const hasTombstonesChanged = mergedTombstones.length !== localTombstones.length;

  return {
    mergedTransactions,
    mergedPaymentModes,
    mergedCategories,
    mergedBanners,
    mergedTombstones,
    hasChanges:
      hasTxChanged ||
      hasModesChanged ||
      hasCategoriesChanged ||
      hasBannersChanged ||
      hasTombstonesChanged
  };
}
