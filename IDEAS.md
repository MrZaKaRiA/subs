# Subs Ideas and Roadmap

This document lists possible product and engineering improvements for Subs.

Priority legend:
- P0: high impact and low effort
- P1: high impact and medium effort
- P2: medium impact
- P3: exploratory or long-term

Size legend:
- XS: 0.5 to 1 day
- S: 1 to 3 days
- M: 3 to 7 days
- L: 1 to 3 weeks
- XL: multi-week initiative

## Product Goals

- Make recurring spending instantly understandable.
- Reduce the time needed to add and maintain subscriptions.
- Keep privacy-first defaults for self-hosting and local-first use.
- Improve data quality and reduce accidental mistakes.
- Scale from casual users (5 subscriptions) to heavy users (100+).

## Features By Size

## XS Features (Tiny Improvements)

### 1) Empty State with Quick Add Templates
- Priority: P0
- Why: New users need a faster first success.
- Scope:
  - Show starter template chips (Streaming, Music, Cloud, AI tools).
  - One click pre-fills name, domain, and typical billing cycle.
- UX details:
  - Show only when list is empty.
  - Include "Start from scratch" as first option.

### 2) Inline Currency Symbol Preview
- Priority: P0
- Why: Users can confuse amount scale when switching currencies.
- Scope:
  - Show currency symbol next to price input.
  - Display small helper text with converted estimate in selected summary currency.

### 3) "Last Imported" Metadata
- Priority: P0
- Why: Helps users trust and debug data import behavior.
- Scope:
  - Store last import timestamp.
  - Show in settings/help area.

### 4) Keyboard Shortcut Improvements
- Priority: P1
- Why: Existing keyboard support is good, but can be stronger.
- Scope:
  - Add shortcuts for sort change and billing cycle filter.
  - Add shortcut to focus Add Subscription form first field.

### 5) Safer Delete UX
- Priority: P0
- Why: Avoid accidental deletion while keeping speed.
- Scope:
  - Add optional "Undo" toast for 5 seconds.
  - Delay permanent removal until undo timeout ends.

## S Features (Small, High-Value)

### 6) Upcoming Payments Panel
- Priority: P0
- Why: Total spend is useful, but upcoming charges are more actionable.
- Scope:
  - Add "Next 7 days" and "Next 30 days" sections.
  - Show amount, service, and due date.
  - Add "Mark paid" action that rolls date forward by cycle.
- Data notes:
  - Include only subscriptions with next payment enabled.
  - Reuse existing billing cycle + date utilities.

### 7) Duplicate Detection on Save and Import
- Priority: P0
- Why: Duplicate records are a common source of bad totals.
- Scope:
  - Create duplicate fingerprint using normalized domain + price + currency.
  - Warn during form save and import.
  - Import options: skip, keep both, replace existing.

### 8) Import Validation Report
- Priority: P0
- Why: Current errors are too opaque for non-technical users.
- Scope:
  - Parse and validate each subscription independently.
  - Show row-level errors with reasons.
  - Allow partial import of valid rows.

### 9) Billing Health Warnings
- Priority: P1
- Why: Missing billing data creates hidden risk.
- Scope:
  - Add badges for missing next payment date when cycle is set.
  - Add warning if date is in the past and not rolled forward.

### 10) Category Field (Single Select)
- Priority: P1
- Why: Users often want budget by area.
- Scope:
  - Add optional `category` property with default categories.
  - Add category filter in top controls.
  - Show category chip on card.

## M Features (Medium Scope)

### 11) Spending Insights Page
- Priority: P1
- Why: A static total does not show trend direction.
- Scope:
  - Add dedicated insights route.
  - Show trend for 30, 90, and 365 days.
  - Show highest category and fastest-growing segment.
- Storage notes:
  - Add periodic snapshots of normalized monthly spend.
  - Keep snapshots compact with daily rollup.

### 12) Budget and Overspend Alerts
- Priority: P1
- Why: Users need a target, not only a report.
- Scope:
  - Set global monthly budget in selected display currency.
  - Show percentage consumed and projected month-end total.
  - Trigger warning style when crossing thresholds (80%, 100%).

### 13) Subscription Lifecycle Metadata
- Priority: P2
- Why: Users need context when managing churn.
- Scope:
  - Add trial end date.
  - Add cancellation URL.
  - Add account email and internal notes.
  - Optional "contract end" date for annual plans.

### 14) Saved Views
- Priority: P2
- Why: Power users repeatedly apply the same filters.
- Scope:
  - Save current search, sort, and filter as a named view.
  - Add quick switcher for favorites.
  - Include default views (All, Upcoming, Annual).

### 15) Notification System (Browser)
- Priority: P1
- Why: Prevent surprise charges.
- Scope:
  - Request permission once with clear explanation.
  - Reminder lead times: 1, 3, 7 days.
  - Daily reminder digest mode for users with many subscriptions.
- Fallback:
  - If permission denied, show in-app reminders only.

## L and XL Features (Large Initiatives)

### 16) Team or Family Shared Workspace
- Priority: P3
- Size: L to XL
- Why: Households and teams share subscriptions.
- Scope:
  - Multi-user workspace with invite links.
  - Roles: owner, editor, viewer.
  - Activity history (who changed what and when).

### 17) Storage Backend Abstraction
- Priority: P2
- Size: L
- Why: Current JSON storage is simple but limits advanced use cases.
- Scope:
  - Introduce storage interface layer.
  - Support file and optional database backend.
  - Add migration utility from file to DB.

### 18) Public API and Integrations
- Priority: P3
- Size: L
- Why: Enable automation with external tools.
- Scope:
  - Read-only token-based API first.
  - Webhooks for subscription created/updated/deleted.
  - Integration starter set: Google Sheets, Notion, Slack.

### 19) CSV Statement Assist
- Priority: P3
- Size: XL
- Why: Discovery of forgotten subscriptions is high value.
- Scope:
  - Upload bank CSV.
  - Suggest possible recurring charges.
  - Manual confirmation before add.

## Domain Classification (Cross-Cutting)

## Core UX
- Upcoming payments panel.
- Better empty state and templates.
- Undo delete.
- Saved views.

## Data Quality
- Duplicate detection.
- Row-level import validation.
- Billing health warnings.

## Finance Intelligence
- Insights/trends page.
- Budgets and overspend alerts.
- Category-level analysis.

## Reliability and Safety
- Export reminders.
- Import preview and dry run.
- Optional encrypted backup export.

## Growth and Ecosystem
- Team workspace.
- Public API and webhooks.
- Integrations.

## Engineering and Delivery Tracks

## Testing
- Add unit tests for date roll-forward edge cases:
  - month-end transitions
  - leap year behavior
  - daylight saving boundary cases
- Add E2E flows for:
  - partial import success
  - duplicate warning logic
  - upcoming payments interactions

## Performance
- Memoize derived filtered/sorted lists.
- Add optional virtualization for very large subscription lists.
- Defer heavy chart code to route-level lazy load.

## Accessibility
- Add ARIA labels for icon-only actions.
- Ensure full keyboard path for all dialogs and popovers.
- Add color contrast checks in CI.

## Observability
- Add lightweight telemetry hooks for local diagnostics (disabled by default).
- Add client-side error boundaries with actionable recovery message.

## Suggested Milestones

### Milestone 1 (1 to 2 weeks)
- Upcoming payments panel
- Duplicate detection
- Import validation report
- Undo delete

### Milestone 2 (2 to 3 weeks)
- Categories
- Budget alerts
- Notification settings
- Billing health warnings

### Milestone 3 (3 to 5 weeks)
- Insights page
- Saved views
- Lifecycle metadata

### Milestone 4 (later)
- Team workspace exploration
- Storage abstraction
- API and integrations

## Open Questions

- Should local-first remain the default in all deployment modes?
- Do we want a strict schema version for import/export payloads?
- Should notification support remain browser-only or include optional email/webhook channels?
- Do we optimize first for solo users or small teams?
