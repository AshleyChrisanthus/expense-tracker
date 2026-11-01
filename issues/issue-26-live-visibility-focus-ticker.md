# Feature: Live Recalculation Engine — Visibility, Focus & Heartbeat Ticker (Issue #26)

## 📌 Summary
When users leave the Expense Tracker open in a browser tab or installed Progressive Web App (PWA) on desktop or mobile, recurring due date countdowns (e.g. `In 1d`, `Due Today`, `Overdue`) remain static. If the app is left open across midnight or backgrounded and returned to hours later, countdown badges show stale values until a manual page refresh or transaction mutation occurs.

Following the pattern used by Cloud Sync (`src/services/sync/sync-manager.ts`) and BingeLog (`clever-noether`):
1. **Instant Recalculation on Tab Switch / App Resume:** Recalculate countdowns as soon as the browser tab or PWA comes back into focus (`visibilitychange`, `window.onfocus`, `pageshow`).
2. **Foreground Heartbeat Ticker:** While visible, tick periodically on a 1-minute interval (`setInterval`), updating due indicators seamlessly as minutes/days roll over without requiring a page refresh.
3. **Zero Resource Overhead:** Pauses ticking completely when the tab or window is hidden (`document.hidden`), guaranteeing 0% CPU consumption and zero battery drain while the user is away.

---

## 🔍 Root Cause Analysis
1. **Memoized Calculations Without Time Dependency:**
   In `src/App.tsx`, `recurringItemsWithDue` is wrapped in `useMemo(..., [dataState.transactions])`. Since `Date.now()` is not in the dependency array, React caches the due calculations indefinitely until transactions are added, edited, or deleted.
2. **No Window/Tab Lifecycle Listeners for UI State:**
   While `SyncManager` listens for `visibilitychange` to synchronize vault data with the cloud, the React application UI lacked a subscriber hook to re-evaluate time-dependent calculations when the tab gains focus.

---

## 🛠️ Implementation Plan
1. **Shared Live Ticker Hook (`src/hooks/useLiveTicker.ts`):**
   - Singleton subscriber architecture managing a single shared interval.
   - Listens to `visibilitychange` (`document.visibilityState === 'visible'`), `window.onfocus`, and `window.onpageshow`.
   - Pauses when `document.hidden` is true (zero background battery / CPU drain).
   - Exports `useLiveTicker()` returning timestamp `number`, and `triggerLiveTick()` for manual triggers.
2. **Application State Integration (`src/App.tsx`):**
   - Consume `const liveTick = useLiveTicker();`.
   - Add `liveTick` into `recurringItemsWithDue` dependency array.
   - Re-evaluate recurring items and feed due indicators dynamically whenever the tab is focused or a minute ticks.
3. **Automated Testing:**
   - Create comprehensive unit and integration tests in `tests/tier1-features/live-countdown-ticker-and-timezone.test.js` covering:
     - Visibilitychange event simulation waking the ticker.
     - Window focus and pageshow listeners.
     - Background pause behavior when `document.hidden` is true.
     - Dynamic due date status transitions across simulated timestamps.
