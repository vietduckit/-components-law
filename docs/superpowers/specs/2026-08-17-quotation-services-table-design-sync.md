# QuotationCreateForm.js — Services Table Design-System Sync (Case-style)

Date: 2026-08-17
Status: Approved for planning

## 1. Motivation

`CaseServices.js` (Case module) renders its services table with a polished,
consistent design language: AntD `Table` with column `render` functions,
shared `C`/`DS` design tokens (colors, radius, card/header/section spacing,
button styles), pill-style status badges, circular `ActionIconButton` icon
buttons, and an AntD `Table.Summary.Row` totals row.

`QuotationCreateForm.js`'s `ServicesTable` component implements equivalent
business functionality (service rows, per-row currency, package pricing,
multi-currency totals, catalog comparison) but with its own hand-rolled
`<table>`, its own `C` token object with a different palette, a hand-drawn
SVG delete icon, and a standalone flex-based summary bar outside the table.
Visually it reads as a different application from the Case module.

This spec covers bringing `QuotationCreateForm.js`'s services table to the
same visual language as `CaseServices.js`, without changing any of its
business behavior. `ContractCreateForm.js`'s equivalent
(`ManualContractServicesSection`) is deliberately deferred to a follow-up
spec/plan (Phase 2), to be started only after this Quotation change has
shipped and been reviewed live — it carries extra complexity (retainer
billing) not present here.

## 2. Scope

**In scope:**
- Rewrite the render layer of `ServicesTable` in `QuotationCreateForm.js`
  (`All Module/Quotation/QuotationCreateForm.js`, component currently at
  lines ~4348–6186) to visually match `CaseServices.js`'s services table.
- Add a small, `QuotationCreateForm.js`-local copy of the design tokens and
  sub-components needed (see §4). Files in this repo cannot share modules
  (Nocobase single-file constraint), so these are new literal copies, not
  imports.
- Switch row rendering from a hand-rolled `<table>` to `ctx.antd.Table` with
  column `render` functions, and the totals bar to
  `Table.Summary.Row`/`Table.Summary.Cell`, matching `CaseServices.js`'s
  pattern.
- Restyle the "Quy đổi tiền tệ" (exchange-rate breakdown) modal and the
  "Review Changes" (catalog comparison) modal to the same visual tokens.
  Their content/logic is unchanged.

**Out of scope (explicitly deferred):**
- `ContractCreateForm.js` / `ManualContractServicesSection` — Phase 2, own
  spec later.
- Any other part of `QuotationCreateForm.js`: header fields, lead/customer
  dropdowns, lawyer picker, approval section, template picker, submit
  transaction, `ServicePickerModal`'s own visual style (only the tokens it
  incidentally inherits, if any, change — its structure does not).
- `CaseServices.js` itself — read-only reference for this work.
- Any backend, schema, or API change.

## 3. Current state (baseline being replaced)

`ServicesTable` (`QuotationCreateForm.js:4348`) currently renders:

- A header bar: "Service List" title + "Review Changes" / "Add service"
  buttons.
- A pricing-mode + currency control row: `Segmented` ("Line pricing" /
  "Package pricing") and a currency `<select>`.
- A hand-rolled `<table>` with columns: `#`, "Service Name & Type",
  "Description", "Unit Price", "VAT %", "Total", and a delete-icon column.
  - Service Name cell: a clickable div that opens `ServicePickerModal`, plus
    a service-type chip.
  - Description cell: `AutoTextarea`.
  - Unit Price cell: `PriceInput` + a per-row currency `<select>` (package
    mode shows "Included in package" text instead).
  - VAT cell: a raw `<input type="number">` (package mode shows "0%" text).
  - Total cell: computed via `calcLine` + per-row currency conversion
    (`getRowConversion`); shows the converted total with a secondary "Gốc:
    ..." line, or a "Thiếu tỷ giá → ..." warning when unconvertible.
  - Delete cell: a hand-drawn SVG trash icon inside a hover-highlighted div.
- A summary bar (a flex row rendered *after* the table, not part of it):
  Subtotal / VAT / Total cards; package mode makes the Subtotal/VAT-rate/
  Total cards editable via `PriceInput`/number inputs; a "Xem quy đổi tiền
  tệ (N loại)" button appears when rows span multiple currencies; a
  missing-rate warning banner appears when `!canShowTotals`.
- "Quy đổi tiền tệ dịch vụ" breakdown `Modal`: a plain `<table>` of currency
  groups (currency, line count, original total, rate, converted total).
- "Review Changes" compare `Modal`: already uses `ctx.antd.Table` + `Tag`
  for both the summary list and the per-row detail view against the service
  catalog.

## 4. Design tokens & shared kit (ported into `QuotationCreateForm.js`)

`QuotationCreateForm.js` already has its own `C` token object and primitives
(`inp()`, `Card`, `CardHeader`, `Grid`, `Field`, `AutoTextarea`, `PriceInput`,
`DatePicker`, `LeadDropdown`, `CustomerDropdown`, `LawyerPicker`,
`ApprovalSection`, `ServicePickerModal`) used across dozens of call sites in
the file. This spec does **not** touch or rename that existing `C` object or
any of those primitives — doing so would risk regressing unrelated parts of
the form.

Instead, add net-new, separately-named pieces, values copied literally from
`CaseServices.js` (no cross-file import):

- A new token object (e.g. `TABLE_DS`) holding only what the rewritten
  `ServicesTable` needs: border radius scale, card/header/section padding,
  primary/secondary button styles, and the specific color values
  `CaseServices.js`'s `DS`/`C` use for its table chrome (header background,
  border, accent blue, warning amber, danger red) — copied as literal hex
  values.
- A new `ActionIconButton` + `SvgActionIcon` component pair, ported from
  `CaseServices.js`, trimmed to only the `delete` icon path needed here
  (danger variant, circular, small).
- A small pill/badge style helper matching `CaseServices.js`'s package-badge
  look (padding, border-radius, font-size/weight), reused for the "Included
  in package" indicator.

Naming is scoped/prefixed to avoid any collision with the file's existing
identifiers (confirmed via grep: no existing `ActionIconButton`,
`SvgActionIcon`, `TABLE_DS`, or badge helper in `QuotationCreateForm.js`
today).

## 5. New `ServicesTable` structure (AntD `Table`-based)

- Root container: swap the current header/border chrome for a Case-like
  card look (border, radius, header background/border) using `TABLE_DS`,
  keeping the same header content (title + button group) and the same
  pricing-mode + currency row beneath it — same fields/handlers, restyled
  spacing only.
- Replace the `<table>`/`<thead>`/`<tbody>` markup with:
  ```js
  React.createElement(Table, {
    dataSource: rows,
    columns,
    rowKey: "_id",
    pagination: false,
    size: "middle",
    bordered: false,
    scroll: { x: "max-content" },
    summary: () => /* Table.Summary.Row, see below */,
  })
  ```
  mirroring `CaseServices.js`'s usage of `ctx.antd.Table`.
- Columns (every `render` function carries over the **exact current cell
  logic and handlers unchanged** — only markup/styling changes):
  1. `#` — row index, width 50, centered.
  2. "Service Name & Type" — same clickable picker-trigger div + service-type
     chip; same `onClick` opens `ServicePickerModal`.
  3. "Description" — same `AutoTextarea`.
  4. "Unit Price" — same `PriceInput` + per-row currency `<select>` (or
     "Included in package" text in package mode) — logic unchanged.
  5. "VAT %" — same number input (or "0%" text in package mode) — unchanged.
  6. "Total" — same conversion computation/display (converted total + "Gốc:"
     secondary line, or "Thiếu tỷ giá" warning), restyled to match Case's
     total-column look (bold, colored, tabular-nums font).
  7. Action — delete row, rendered via the new `ActionIconButton` (danger
     variant, trash icon), replacing the hand-drawn SVG div; same `onDelete`
     handler.
- Totals: a `Table.Summary.Row`/`Table.Summary.Cell` block replaces the
  standalone flex summary bar, showing the same information (Subtotal / VAT
  amount + package-mode rate input / Total), restyled to Case's summary-cell
  look (bold colored amounts; `InputNumber` for package-mode editable
  fields). Same values and handlers are preserved: `onPackageChange`,
  `canShowTotals` gating, the missing-rate warning banner, and the "Xem quy
  đổi tiền tệ" trigger button — only their position/styling moves from a
  separate flex bar to inside/adjacent to the summary row.
- Package-mode badge ("Included in package"): restyled with the new pill
  helper from §4; same condition and text.
- Breakdown Modal and Compare Modal: `Modal` usage and all logic/content
  stay as-is; only inner typography/spacing/borders are aligned to the new
  tokens. The Compare Modal already uses `ctx.antd.Table`/`Tag`, so this is
  a token-alignment pass there, not a structural change.

## 6. Feature-preservation checklist (must not change)

The rewrite is presentation-layer only. The following must behave
identically before and after:

- Line ↔ Package pricing-mode toggle (`handlePricingModeChange`), including
  the line-mode backup/restore (`lineModeBackupRef`).
- Per-row currency selection + `PriceInput` editing, and per-row VAT %.
- Multi-currency subtotal/VAT/total aggregation
  (`buildQuotationFinancialSummary`) and exchange-rate lookup
  (`fetchExchangeRatesForConversion` / `pickConversionRate`).
- Missing-rate detection and its warning banner (`canShowTotals`,
  `financialSummary.missing`, `formatMissingRatePairs`) — the *submit-time*
  blocking validation in `handleSubmit` is untouched (it lives outside
  `ServicesTable`).
- "Xem quy đổi tiền tệ" breakdown modal contents and per-group rate/convert
  math.
- "Review Changes" compare modal: both the summary list and per-row detail
  view, including catalog matching (`getCatalog`) and changed-field
  detection (`getCmpRows`).
- `ServicePickerModal` wiring: `onSelect`/`onAddNewService` payload shapes
  passed into `onUpdate(pickerRowId, "__service__", …)`.
- Row lifecycle handlers: `addRow`, `deleteRow`, `updateRow`.
- `markDirty`/`isDirtyRef` triggering on every edit (unsaved-changes guard
  for the popup close confirmation).
- Package-mode field editing (`packageSubTotal`, `packageVatRate` via
  `onPackageChange`).

## 7. Risks / trade-offs

- AntD `Table`'s re-render behavior can differ from a hand-rolled table for
  cells containing live-editing inputs (`PriceInput`, `AutoTextarea`,
  `<select>`); need to confirm during manual QA that typing in a cell does
  not lose focus/cursor position on each keystroke. Mitigation: keep
  `rowKey: "_id"` stable (already the case) and avoid introducing new
  per-render function/object identities in `columns` that would force
  column-level remounts beyond what already happens today.
- `Table`'s default cell padding/vertical-align may compress today's
  two-line cells (name + type chip; price + currency select; total + "Gốc:"
  line) — each `render` needs its own wrapper `div` reproducing the current
  layout; verify visually.
- No automated test coverage exists for this file (no test framework in the
  repo). Verification is manual QA in the live Nocobase app, per CLAUDE.md's
  UI-testing rule.

## 8. Testing / acceptance

- `node --check` on `QuotationCreateForm.js` after each edit.
- Manual QA in the browser: open "Create Quotation", add 2+ service rows in
  different currencies, confirm subtotal/VAT/total conversion and the
  "Thiếu tỷ giá" banner behave exactly as before; toggle package mode and
  edit the package fields; open both modals (breakdown, compare); delete a
  row; submit successfully end-to-end.
- Visual check: the table's borders, header, badges, buttons, and summary
  row visibly match `CaseServices.js`'s services table look.

## 9. Open questions

None blocking. Phase 2 (`ContractCreateForm.js`) gets its own follow-up spec
once this ships and is reviewed, accounting for its added retainer-billing
complexity.
