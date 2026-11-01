# Feature: Localized Timezone System (Issue #25)

## 📌 Summary
Users in timezones ahead of UTC (e.g. Australia/Sydney AEDT at UTC+11) experienced an 11-hour lag across midnight where scheduled recurrence calculations and relative countdowns (such as "Due in 1 day" vs "Due Today") displayed incorrect status. When rent is due on November 1st, the app calculated "In 1d" throughout the morning because the system evaluated the current date using raw UTC `new Date().toISOString().split('T')[0]`, where it was still October 31st.

To resolve this issue and match the time architecture of BingeLog (`clever-noether`):
1. **Curated Timezone Support:** Provide curated timezones (`COMMON_TIMEZONES`) across Australia, New Zealand, Americas, Europe, and Asia with user-friendly city labels.
2. **Automatic System Detection with Override:** Auto-detect the browser's system timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` with persistent user customization in Dexie and LocalStorage.
3. **Timezone-Aware Local Date Formatting:** Implement `getLocalDateString(dateInput, timezone)` and localized helpers to reliably produce `YYYY-MM-DD` matching the user's localized date.
4. **Clean Integration:** Replace fragile `new Date().toISOString().split('T')[0]` calls across recurrence engine, modals, and transaction logging.
5. **Timezone Settings UI:** Provide a sleek glassmorphic Timezone & Localization configuration control in Settings/Theme modal with instant live preview.

---

## 🔍 Root Cause Analysis
1. `getRecurrenceDueInfo()` in `src/utils/recurrence.ts` defaulted its reference date to `new Date().toISOString().split('T')[0]`.
2. `Date.prototype.toISOString()` strictly converts dates to UTC (GMT / 00:00Z).
3. In timezones east of UTC (like AEDT / UTC+11), 11 hours of each local day fall into the previous UTC date, causing countdowns to be off by 1 day every morning until 11:00 AM local time.
4. Default transaction creation in `TransactionModal.tsx`, `App.tsx`, and `storage.ts` also used `toISOString().split('T')[0]`, causing new transactions to record the wrong calendar date during morning hours.

---

## 🛠️ Implementation Plan
1. **Timezone Utility (`src/utils/timezone.ts`):**
   - Curated `COMMON_TIMEZONES` list with regional grouping.
   - `getSystemTimeZone()`: Fallback-safe detection via `Intl`.
   - `getUserTimeZone()` & `setUserTimeZone(tz)`: Async Dexie storage paired with synchronous LocalStorage caching (`app_user_timezone`) for zero startup delay.
   - `getLocalDateString(dateInput?: Date | number, tz?: string): string`: Produces ISO `YYYY-MM-DD` strictly in the target timezone using `Intl.DateTimeFormat('en-CA', ...)`.
   - `formatLocalizedDate()`: Clean locale-aware formatting.
2. **Recurrence Engine Integration (`src/utils/recurrence.ts`):**
   - Update `getRecurrenceDueInfo` and `getNextFutureDueDate` to use `getLocalDateString()` instead of `toISOString()`.
   - Support optional `nowTime` argument for deterministic testing and live clock updates.
3. **Transaction Creation & Default Dates:**
   - Update `TransactionModal.tsx` and `App.tsx` to default transaction dates to `getLocalDateString()`.
4. **Timezone UI (`src/components/ThemeModal.tsx`):**
   - Add glassmorphic "Timezone & Localization" card with auto-detect, custom selection dropdown, "Use System" button, and live local date/time preview.
