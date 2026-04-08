# Refactoring Plan

Codebase: `subs` — a Remix + React + Zustand subscription tracker  
Based on: Vercel React Best Practices (v1.0.0) + full codebase analysis

---

## Code Smells Found

### 1. State explosion in `_index.tsx` (14 `useState` calls)

`app/routes/_index.tsx` is 601 lines with 14 separate `useState` calls for:

- Modal open/close state (`isModalOpen`, `isAddPopoverOpen`, `isKeyboardShortcutsOpen`, `isOnboardingOpen`, `isImportReportOpen`)
- Editing context (`editingSubscription`, `pendingTemplate`)
- Filter/sort UI (`searchQuery`, `sortBy`, `billingCycleFilter`, `categoryFilter`)
- Multi-step import flow state machine (`importReport`, `importDuplicates`, `pendingImportSubscriptions`)

Violates: **5.1 Calculate Derived State During Rendering**, **5.9 Split Combined Hook Computations**

### 2. Expensive derived state recalculated on every render

- `filteredSubscriptions` — a `.filter().sort()` chain with `new Date()` creation — runs on every render with no `useMemo`
- `calculateTotalsInUSD()` — iterates all subscriptions on every render, called inline in JSX
- `byCategory`, `byCycle`, `totalMonthly` in `insights.tsx` — recomputed every render
- `selectedTemplates`, `totalMonthly` in `OnboardingDialog.tsx` — same issue

Violates: **5.6 Extract to Memoized Components**, **5.1 Calculate Derived State During Rendering**

### 3. Components defined inside components

`TrendBadge` is defined inside the `Insights` component function (`insights.tsx:93–107`). This creates a new component identity on every parent render, causing React to unmount/remount the component rather than reconcile it.

Violates: **5.4 Don't Define Components Inside Components**

### 4. Keyboard bindings array recreated every render

The keyboard shortcuts array in `_index.tsx` (lines 336–428) is constructed fresh on every render. `useKeyboard` receives a new array reference each time, causing its `useEffect` to re-register the `keydown` listener on every single render.

Violates: **5.7 Narrow Effect Dependencies**, **8.3 Store Event Handlers in Refs**

### 5. Duplicate utility functions across 3 files

| Function | Locations | Should be |
|---|---|---|
| `getCurrencySymbol()` | `AddSubscriptionPopover`, `EditSubscriptionModal`, `manage.tsx` | `lib/utils.ts` |
| `formatDateForDisplay()` | `AddSubscriptionPopover`, `EditSubscriptionModal`, `manage.tsx` | `lib/utils.ts` |
| `sanitizeDomain()` | `SubscriptionCard`, `manage.tsx` | `lib/utils.ts` |
| `subscriptionSchema` (Zod) | `AddSubscriptionPopover`, `EditSubscriptionModal` | `lib/schemas.ts` |
| `convertCurrency()` inline math | `AddSubscriptionPopover`, `EditSubscriptionModal` | already in `lib/utils.ts`, just not used |

### 6. `AddSubscriptionPopover` and `EditSubscriptionModal` are near-duplicates

Both components have identical Zod schemas, 7 identical form fields, identical billing cycle toggle + calendar, and the same icon input. ~250 lines of code are duplicated between them.

### 7. `useLoaderData` called inside child components

`Summary.tsx` and `EditSubscriptionModal.tsx` both call `useLoaderData<typeof loader>()` directly. This tightly couples these components to `_index.tsx`'s specific loader shape — they cannot be used in any other route without also having the same loader.

### 8. `window.confirm()` used for duplicate warning (`_index.tsx:158`)

A browser-native blocking dialog is used inconsistently with the rest of the UI (which uses shadcn AlertDialogs / Radix UI). Inaccessible on some mobile browsers; breaks visual consistency.

### 9. `isDirty` in `manage.tsx` uses `JSON.stringify` per subscription per render

`isDirty()` (line 321) does `JSON.stringify(draft) !== JSON.stringify(original)` and is called inside the array of per-subscription rows, then again in `dirtyCount` — meaning it serializes every subscription object twice per render.

Violates: **7.4 Cache Repeated Function Calls**

### 10. `SubscriptionCard` calls `calculateNextPaymentDate()` twice with the same args

Lines 67 and 81 both compute the same value. One variable should hold the result.

### 11. `SubscriptionCard` and `SubscriptionRow` (manage.tsx) have no `React.memo`

With potentially many cards on screen, any state change in the parent causes all cards to re-render.

Violates: **5.6 Extract to Memoized Components**

### 12. `stale closure` bug in `insights.tsx` suppressed with eslint-disable

Line 51 uses `// eslint-disable-line react-hooks/exhaustive-deps` to suppress a warning about `spendingSnapshots` and `addSpendingSnapshot` being missing from the effect's dependency array. This is a real stale-closure bug.

Violates: **5.7 Narrow Effect Dependencies**

### 13. `categoryTabs` and `regionTabs` in `OnboardingDialog` created every render

Static arrays built fresh inside the component function body. Should be module-level constants.

Violates: **6.3 Hoist Static JSX Elements**

### 14. `createCustomStorage()` in `subscriptionStore.ts` called per rehydration

The storage object passed to `createJSONStorage` is freshly instantiated on every Zustand rehydration cycle. Should be created once at module level.

### 15. Import alias inconsistency: `@/` vs `~/`

`AddSubscriptionPopover.tsx` and `IconFinder.tsx` use `@/components/ui/...` while every other file uses `~/components/ui/...`.

### 16. Dead code

- `app/components/DeleteConfirmationDialog.tsx` — not imported anywhere (app uses undo-toast pattern instead)
- `app/utils/query.client.ts` — creates a `QueryClient` that is never imported; the real one lives in `root.tsx`
- `useSubscriptionNotifications` hook — exported but never called from any component

### 17. `useKeyboardShortcuts()` is a hook returning a static array

It doesn't use any React features. It should be a plain exported constant, not a hook.

### 18. Budget progress bar logic duplicated in `Summary.tsx` and `insights.tsx`

`isOverBudget`, `isWarning`, and the progress bar JSX are verbatim copies across both files.

### 19. Unused package dependencies

These packages are in `package.json` but are not imported anywhere in the source:
`jotai`, `dayjs`, `date-fns`, `croner`, `qss`, `embla-carousel-react`, `@tanstack/query-sync-storage-persister`, `@tanstack/react-query-persist-client`

### 20. Two store directories: `store/` and `stores/`

`subscriptionStore.ts` lives in `app/store/`, preferences in `app/stores/`. No reason for the split.

---

## Refactoring Plan

Tasks are ordered by priority. Each item references which Vercel rule it addresses.

---

### Phase 1 — Critical: State & Performance

#### 1.1 Extract import flow into `useImportFlow` hook
**File:** new `app/hooks/useImportFlow.ts`  
**Replaces:** 4 `useState` calls in `_index.tsx` for `importReport`, `isImportReportOpen`, `importDuplicates`, `pendingImportSubscriptions`  
**Pattern:** `useReducer` with states: `idle → validating → duplicates → importing → done`  
**Rules:** `rerender-split-combined-hooks`, `rerender-derived-state-no-effect`

#### 1.2 Extract modal state into `useSubscriptionModal` hook
**File:** new `app/hooks/useSubscriptionModal.ts`  
**Replaces:** `isModalOpen`, `editingSubscription`, `pendingTemplate` `useState` calls  
**Returns:** `{ open, editingSubscription, pendingTemplate, openNew, openEdit, openWithTemplate, close }`  
**Rules:** `rerender-split-combined-hooks`

#### 1.3 Extract filter/sort state into `useSubscriptionFilters` hook
**File:** new `app/hooks/useSubscriptionFilters.ts`  
**Replaces:** `searchQuery`, `sortBy`, `billingCycleFilter`, `categoryFilter` `useState` calls  
**Returns derived `filteredSubscriptions` with `useMemo` internally  
**Rules:** `rerender-split-combined-hooks`, `rerender-derived-state-no-effect`

#### 1.4 Memoize `calculateTotalsInUSD` in `_index.tsx`
**File:** `app/routes/_index.tsx`  
**Change:** Wrap in `useMemo([subscriptions, rates])`  
**Rules:** `rerender-memo`

#### 1.5 Stabilize keyboard bindings in `_index.tsx`
**File:** `app/routes/_index.tsx`  
**Change:** Wrap handler callbacks in `useCallback`, move the `KEYBOARD_SHORTCUTS` metadata to a constant, fix `useKeyboard` to not re-register on every render  
**Rules:** `rerender-dependencies`, `rerender-use-ref-transient-values`

---

### Phase 2 — High: DRY / Code Duplication

#### 2.1 Consolidate utility functions into `lib/utils.ts`
**Add to `app/lib/utils.ts`:**
- `getCurrencySymbol(currency: string): string`
- `formatDateForDisplay(date: string | Date): string`
- `sanitizeDomain(name: string): string`

**Remove from:** `AddSubscriptionPopover.tsx`, `EditSubscriptionModal.tsx`, `manage.tsx`, `SubscriptionCard.tsx`

#### 2.2 Create shared `lib/schemas.ts` for the subscription Zod schema
**File:** new `app/lib/schemas.ts`  
**Exports:** `subscriptionSchema`, `SubscriptionFormValues` type  
**Remove duplicates from:** `AddSubscriptionPopover.tsx`, `EditSubscriptionModal.tsx`

#### 2.3 Create shared `SubscriptionForm` component
**File:** new `app/components/SubscriptionForm.tsx`  
**Props:** `form: UseFormReturn<...>`, `rates`, `currencies`, `onIconSelect`  
**Renders:** all 7 form fields (name, price, currency, billing cycle, next payment date, category, icon/URL)  
**Consumed by:** `AddSubscriptionPopover.tsx` and `EditSubscriptionModal.tsx`  
**Eliminates:** ~250 lines of duplication

#### 2.4 Replace `window.confirm()` with a proper dialog
**File:** `app/routes/_index.tsx`  
**Change:** Show `AlertDialog` (already used elsewhere) for the duplicate-save warning  
**Rules:** accessibility, UI consistency

#### 2.5 Pass `rates` as props instead of calling `useLoaderData` in child components
**Files:** `app/components/Summary.tsx`, `app/components/EditSubscriptionModal.tsx`  
**Change:** Accept `rates` as a prop; call `useLoaderData` only at the route level  
**Benefit:** Decouples components from route loader shape; makes them reusable

#### 2.6 Extract budget progress bar into `BudgetProgress` component
**File:** new `app/components/BudgetProgress.tsx`  
**Props:** `monthlyTotal: number`, `budget: number`, `currency: string`  
**Remove duplicates from:** `Summary.tsx`, `insights.tsx`

---

### Phase 3 — Medium: Rendering & Correctness

#### 3.1 Move `TrendBadge` out of `Insights` to module level
**File:** `app/routes/insights.tsx`  
**Change:** Define `TrendBadge` above the `Insights` function (or extract to `app/components/TrendBadge.tsx`)  
**Rules:** `rerender-no-inline-components`

#### 3.2 Wrap `SubscriptionCard` with `React.memo`
**File:** `app/components/SubscriptionCard.tsx`  
**Change:** `export default React.memo(SubscriptionCard)`  
**Rules:** `rerender-memo`

#### 3.3 Wrap `SubscriptionRow` in `manage.tsx` with `React.memo`
**File:** `app/routes/manage.tsx`  
**Change:** `const SubscriptionRow = React.memo(function SubscriptionRow(...) { ... })`  
**Rules:** `rerender-memo`

#### 3.4 Fix `calculateNextPaymentDate` double-call in `SubscriptionCard`
**File:** `app/components/SubscriptionCard.tsx`  
**Change:** Call once, store in `const nextPayment = calculateNextPaymentDate(...)`

#### 3.5 Fix stale closure bug in `insights.tsx` useEffect
**File:** `app/routes/insights.tsx`  
**Change:** Replace the eslint-disable suppression with a `useRef` date guard to prevent re-adding the same day's snapshot

#### 3.6 Replace `isDirty` JSON.stringify in `manage.tsx`
**File:** `app/routes/manage.tsx`  
**Change:** Field-by-field comparison OR track dirtiness as a `Set<string>` updated in `updateDraft`  
**Rules:** `js-cache-function-results`

#### 3.7 Move `createCustomStorage()` to module level in `subscriptionStore.ts`
**File:** `app/store/subscriptionStore.ts`  
**Change:** `const customStorage = createCustomStorage()` at top of module, reuse in `createJSONStorage(() => customStorage)`

#### 3.8 Memoize expensive derivations in `insights.tsx`
**File:** `app/routes/insights.tsx`  
**Change:** Wrap `byCategory`, `byCycle`, `sortedCategories`, `monthlyCosts` in `useMemo`  
**Rules:** `rerender-memo`

#### 3.9 Hoist `categoryTabs`/`regionTabs` in `OnboardingDialog.tsx` to module level
**File:** `app/components/OnboardingDialog.tsx`  
**Change:** Move static arrays above the component function  
**Rules:** `rendering-hoist-jsx`

#### 3.10 Memoize `OnboardingDialog.TemplateCard` with `React.memo`
**File:** `app/components/OnboardingDialog.tsx`  
**Change:** Wrap `TemplateCard` with `React.memo`; 100+ instances can render at once  
**Rules:** `rerender-memo`

---

### Phase 4 — Low: Housekeeping

#### 4.1 Fix import alias inconsistency `@/` → `~/`
**Files:** `app/components/AddSubscriptionPopover.tsx`, `app/components/IconFinder.tsx`  
**Change:** Replace all `@/` with `~/`

#### 4.2 Delete dead code
- `app/components/DeleteConfirmationDialog.tsx` — unused
- `app/utils/query.client.ts` — unused

#### 4.3 Merge `store/` and `stores/` into `app/store/`
**Move:** `app/stores/preferences.ts` → `app/store/preferences.ts`  
**Update:** all imports

#### 4.4 Convert `useKeyboardShortcuts()` hook to a plain constant
**File:** `app/hooks/useKeyboard.ts`  
**Change:** `export const KEYBOARD_SHORTCUTS = [...]` instead of a hook

#### 4.5 Wire up `useSubscriptionNotifications`
**File:** `app/root.tsx` or `app/routes/_index.tsx`  
**Change:** Call the hook so notifications are actually triggered

#### 4.6 Replace `isValidSubscription` in `subscriptionStore.ts` with `validateImportData`
**File:** `app/store/subscriptionStore.ts`  
**Change:** Reuse the import validator instead of maintaining a parallel type guard

#### 4.7 Remove unused package dependencies
Remove from `package.json`:
- `jotai`
- `dayjs`
- `date-fns`
- `croner`
- `qss`
- `embla-carousel-react`
- `@tanstack/query-sync-storage-persister`
- `@tanstack/react-query-persist-client`

#### 4.8 Remove unused `useMediaQuery` from `lib/utils.ts`
Either delete it or move it to a dedicated `app/hooks/useMediaQuery.ts` if it will be used.

---

## Summary of New Files to Create

| File | Purpose |
|---|---|
| `app/hooks/useImportFlow.ts` | Import flow state machine (replaces 4 useState) |
| `app/hooks/useSubscriptionModal.ts` | Modal open/close + editing context (replaces 3 useState) |
| `app/hooks/useSubscriptionFilters.ts` | Filter/sort state + `filteredSubscriptions` memoization (replaces 4 useState) |
| `app/lib/schemas.ts` | Shared Zod schema for subscription form |
| `app/components/SubscriptionForm.tsx` | Shared form fields used by Add + Edit |
| `app/components/BudgetProgress.tsx` | Budget bar extracted from Summary + insights |

## Summary of Files to Delete

| File | Reason |
|---|---|
| `app/components/DeleteConfirmationDialog.tsx` | Dead code — not imported anywhere |
| `app/utils/query.client.ts` | Dead code — never imported |

## Files Most Impacted by Refactor

| File | Changes |
|---|---|
| `app/routes/_index.tsx` | 14 useState → 3 custom hooks; memoize totals; stabilize keyboard bindings |
| `app/components/AddSubscriptionPopover.tsx` | Use shared schema + SubscriptionForm; fix alias |
| `app/components/EditSubscriptionModal.tsx` | Use shared schema + SubscriptionForm; accept rates as prop |
| `app/routes/insights.tsx` | Move TrendBadge out; memoize derivations; fix stale-closure bug |
| `app/routes/manage.tsx` | Memo SubscriptionRow; fix isDirty; consolidate utils |
| `app/components/SubscriptionCard.tsx` | React.memo; single nextPaymentDate call; use shared sanitizeDomain |
| `app/lib/utils.ts` | Add getCurrencySymbol, formatDateForDisplay, sanitizeDomain |
| `app/store/subscriptionStore.ts` | Module-level storage; unify with importValidation |
