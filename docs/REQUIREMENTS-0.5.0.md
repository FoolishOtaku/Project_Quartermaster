# Project Quartermaster — Requirements (v0.5.0)

Scope and acceptance criteria for **Version 0.5.0 — Reports**, building on the
v0.4.1 interactive UI and the v0.4.0 borrowing system. Maps to Design.md §18 and
§29.

## 1. Goal

> Logistics assistant can generate useful inventory reports.

Provide read-only **text reports** in Telegram and a **CSV export** for each,
driven by both slash commands and the interactive button menu. No schema or
database changes — every report is derived from existing data.

## 2. In scope (v0.5.0)

Report kinds:

| Kind               | Command                       | What it shows                                            |
| ------------------ | ----------------------------- | -------------------------------------------------------- |
| `inventory`        | `/report inventory`           | Totals + health snapshot (counts).                       |
| `borrowed`         | `/report borrowed`            | All records currently out on loan.                       |
| `damaged`          | `/report damaged`             | Condition NEEDS_REPAIR / BROKEN, or availability MAINTENANCE. |
| `lost`             | `/report lost`                | Condition LOST, or availability MISSING.                 |
| `unknown_location` | `/report unknown_location`    | Active items with no recorded location.                  |
| `ownership`        | `/report ownership`           | Count by owner / source.                                 |
| `low_stock`        | `/report low_stock`           | Bulk/consumable at or below minimum stock.               |
| `warranty`         | `/report warranty`            | Warranty expired or expiring within 30 days.             |
| `maintenance_due`  | `/report maintenance_due`     | Items whose `nextCheckDue` is today or past.             |

Commands:

- `/report` — list the available report kinds (with tappable buttons).
- `/report <kind>` — render the text report, with a **⬇️ Download CSV** button.
- `/export_report <kind>` — send the report as a `.csv` document.

Interactive menu:

- The main menu shows a **📊 Reports** entry for report-capable roles.
- The Reports submenu lists every report as a button; tapping one renders it and
  offers a CSV download.

## 3. Access control

Reports are limited to the logistics / management roles: **Admin, Coordinator,
Assistant**. Trusted members and viewers do not see the Reports menu entry, and
the `/report` and `/export_report` commands are role-gated by `RolesGuard`.

## 4. Out of scope (later)

- Excel and PDF export (Design.md §18.10 — CSV first).
- Activity Log report (depends on the v0.6.0 AuditLog model).
- A `MaintenanceLog`-backed maintenance report (the maintenance report currently
  uses the `Item.nextCheckDue` field only).

## 5. Acceptance criteria

1. Each report kind returns a readable text report via `/report <kind>` and via
   its menu button. ✅
2. Empty reports show a friendly empty-state message rather than an error. ✅
3. `/export_report <kind>` (and the **Download CSV** button) returns a valid CSV
   document with a header row and a dated filename
   (`report_<kind>_YYYY-MM-DD.csv`). ✅
4. CSV fields containing commas/quotes/newlines are escaped (RFC 4180). ✅
5. The inventory summary reports totals, available, borrowed, damaged, lost,
   unknown-location, member-owned, and low-stock counts. ✅
6. Reports are restricted to Admin / Coordinator / Assistant. ✅
7. All slash commands continue to work; the menu just triggers the same actions. ✅

## 6. Verification

- `npm run build` — clean (tsc type-check).
- `npm test` — **8 suites / 57 tests** pass, including
  `src/reports/reports.service.spec.ts` (text rendering, empty states, CSV
  header/escaping, and coverage of every declared report kind).

No migration is required for this release.
