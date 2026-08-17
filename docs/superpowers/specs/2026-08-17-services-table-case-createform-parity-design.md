# Services Table UI/UX Parity with CaseCreateForm.js — Design

Date: 2026-08-17
Status: Approved for planning
Supersedes: `docs/superpowers/specs/2026-08-17-quotation-services-table-design-sync.md` (that
spec referenced `CaseServices.js` — the *existing*-case service tab. This spec replaces that
reference with `CaseCreateForm.js` — the case *creation* form, which is the correct structural
sibling of `QuotationCreateForm.js`/`ContractCreateForm.js`, all three being "create a record
with dynamic service line items" forms. The AntD-`Table`-based work already shipped against the
old spec (4 commits in `QuotationCreateForm.js`) is reverted by this spec's Phase A.)

## 1. Motivation

A visual comparison of the Case creation form and the (already-once-restyled) Quotation
creation form showed they still read as two different applications. Investigation found the
earlier sync effort had picked the wrong reference: `CaseServices.js` is a *different* screen
(managing an already-created case's services, read/sync-oriented, AntD `Table` +
click-to-edit-cell), not the form that actually created the case. `CaseCreateForm.js` — the
true sibling — has its own distinct, hand-rolled pattern: a plain `<table>`, rows that are
read-only by default and become editable only when explicitly toggled per-row via a pencil
icon, and a service picker used exclusively at row-creation time (never to swap an existing
row's service).

This spec documents that reference pattern in full and defines how `QuotationCreateForm.js`
(Phase A, this pass) and later `ContractCreateForm.js` (Phase B, follow-up) adopt it.

## 2. Scope

**In scope (Phase A, this spec's implementation target):**
- Revert `QuotationCreateForm.js`'s `ServicesTable` row/column rendering from `ctx.antd.Table`
  back to a hand-rolled `<table>`, matching `CaseCreateForm.js`'s DOM structure.
- Add per-row edit-toggle state (`editingRows`), replacing "always-editable inputs" with
  "read-only by default, pencil-icon toggles edit mode for that row."
- Replace the pill-shaped `TableActionIconButton` (delete) introduced in the reverted spec with
  the square, `borderRadius: 6` icon-button style `CaseCreateForm.js` uses for both its edit-toggle
  and delete actions.
- Move the totals bar back out of the table (`Table.Summary.Row` → a standalone flex block below
  the table, matching Case), while **keeping** all of Quotation's existing multi-currency
  financial logic and JSX content built in the reverted spec's Task 3 — only the container
  changes, not the values, currency-conversion math, missing-rate banner, or the "Xem quy đổi
  tiền tệ" breakdown modal.
- Change the "Add service" flow to open the service picker directly (no blank placeholder row),
  matching Case's `pickerOpen` (single, not per-row) model — see §5 for the explicit behavior
  change this implies.
- Restyle `ServicePickerModal`'s shell (search bar, results table, "Create new" toggle) to Case's
  visual structure, **excluding** the task-template/sample-tasks sub-feature (§6 — no equivalent
  concept in Quotation).

**Out of scope (deferred to Phase B, a follow-up spec/plan):**
- `ContractCreateForm.js` / `ManualContractServicesSection`. It carries additional complexity
  (retainer billing: monthly fee, duration, repeat unit) with no equivalent in Quotation or in
  `CaseCreateForm.js`'s own pattern, so it needs its own pass once Phase A has shipped and been
  reviewed live.
- Any change to `CaseCreateForm.js` itself (read-only reference).
- Any change to the underlying financial/currency computation functions
  (`buildQuotationFinancialSummary`, `pickConversionRate`, `fetchExchangeRatesForConversion`,
  etc.) — Phase A is a presentation/interaction-layer change on top of logic that already works
  correctly.

## 3. Reference design: `CaseCreateForm.js`'s services table UI/UX

This section is the canonical description of the pattern being adopted, distilled from
`All Module/Case/CaseCreateForm.js` (line numbers as of this writing; the file will shift as
edits land, but the pattern is what matters).

### 3.1 Structure
Plain `<table>` (not `ctx.antd.Table`), columns: `#`, "Service Name & Type", "Description",
"Unit Price", "VAT (%)", "Total", and a trailing unlabeled action column (`CaseCreateForm.js:6325-6355`).
Header cells use a shared `th(ex)` style helper (padding, `fontSize: 11.5`, `fontWeight: 600`,
`color: C.textSub`, `background: C.bgSection`, `borderBottom: 2px solid C.border`); body cells use
a shared `td(ex)` helper. Both already exist in `QuotationCreateForm.js` in equivalent form (they
were the ones deleted when Quotation moved to `ctx.antd.Table` — Phase A restores them).

### 3.2 Per-row edit toggle (the core interaction difference)
- State: `const [editingRows, setEditingRows] = useState({})` — a plain object keyed by row id
  (`CaseCreateForm.js:4808`).
- Toggle: `const toggleRowEdit = (rowId) => setEditingRows((p) => ({ ...p, [rowId]: !p[rowId] }))`
  (`:4894-4896`).
- Per row: `const isRowEdit = !!editingRows[r._id]`. Every editable cell branches on this: when
  `false`, render a formatted read-only view; when `true`, render the actual input control
  (`:6402`, and each cell's ternary, e.g. `:6593`, `:6696`).
- New rows are **not** auto-opened into edit mode. `editingRows` starts empty and nothing seeds
  an entry for a freshly-added row — the user must click the pencil icon to adjust anything after
  the row is created from the picker. Phase A replicates this exactly (no special-casing new
  rows into edit mode).

### 3.3 Read-only cell rendering (when `isRowEdit` is false)
- **Service Name & Type**: name text + a small type badge chip if present (`background:
  "#eff6ff"`, `color: "#1d4ed8"`, pill-ish `borderRadius: 4`) — this exact chip style is already
  shared verbatim across `CaseServices.js`, `CaseCreateForm.js`, and current `QuotationCreateForm.js`,
  so it is unchanged by this spec.
- **Description**: truncated via an `ExpandableText` helper (show first ~100 chars + a "show
  more" affordance) instead of an always-visible textarea; empty state shows italic gray "No
  description" (`:6572-6587`).
- **Unit Price**: right-aligned bold formatted money (`formatMoney(r.basePrice, rowCurrency)`),
  or "Included in package" / "Scope only" text depending on billing mode (`:6664-6672`).
- **VAT (%)**: plain right-aligned text (not an input).
- **Total**: computed, right-aligned, bold, with a secondary "Original: <amount>" line when a
  currency conversion applied, or a "Missing rate to <CODE>" warning line when it can't convert
  (`:6760-6786`) — this is functionally identical to what Quotation's `ServicesTable` already
  computes (`getRowConversion`); only the *display* needs to match this read-only/no-input shape
  when not editing.

### 3.4 Editable cell rendering (when `isRowEdit` is true)
- **Service Name & Type**: two plain `<input>` text fields (name, type) — **not** a re-trigger of
  the service picker (`:6462-6479`).
- **Description**: a `<textarea>`.
- **Unit Price**: `PriceInput` + a currency `<select>`/AntD `Select`, exactly like Quotation's
  current (pre-Phase-A) always-visible price row (`:6593-6639`) — this part of Quotation's
  existing cell JSX is reused as-is, just moved inside the `isRowEdit` branch.
- **VAT (%)**: a number `<input>`.

### 3.5 Action buttons (icon-button style — replaces the pill `ActionIconButton`)
```js
const iconButtonStyle = (color, active = false) => ({
  width: 28,
  height: 28,
  borderRadius: 6,
  border: active ? `1px solid ${color}` : `1px solid ${C.border}`,
  background: active ? "#eff6ff" : "#fff",
  color,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
});
```
Two buttons per row, side by side, centered in the action column:
1. **Edit toggle** — `iconButtonStyle(C.primary, isRowEdit)`, icon is a pencil when inactive and
   a checkmark when active (`RowEditIcon`, `:5140-5166`), `title`: "Edit service" / "Done editing".
2. **Delete** — `iconButtonStyle(C.danger)`, trash icon (`TrashIcon`, `:5167-5186`), `title`:
   "Delete service", always enabled regardless of edit state.

This square, `borderRadius: 6` shape replaces the circular (`borderRadius: 999`) icon buttons
Phase A's predecessor spec introduced.

### 3.6 Totals bar
A standalone flex `<div>` **after** the table (not inside it), right-aligned, on
`borderTop: 2px solid C.border` / `background: C.bgSection` (`:6830-6843`). Quotation's existing
totals content (subtotal/VAT/total cards, package-mode editable fields, the "Xem quy đổi tiền
tệ" trigger, the missing-rate banner) is preserved verbatim — Phase A only changes its container
from `Table.Summary.Row`/`Table.Summary.Cell` back to this kind of flex block.

### 3.7 Add-service flow
A single `pickerOpen` boolean (not per-row) gates the picker modal. The "Add service" button sets
`pickerOpen = true`; `onSelect` always calls an *add* handler (`onAddFromService`) and closes the
picker (`:4807, 5944-5960, 6043-6052`). **There is no per-row "re-open picker to swap service"
affordance anywhere in `CaseCreateForm.js`** — once a row exists, the only way to change *which*
catalog service it represents is to edit the name/type/price text directly (§3.4) or delete the
row and add a new one.

### 3.8 `ServicePickerModal` shell
Search input + results `<table>` (service name, type, price, a per-row "use this" action) +
a "Create new" button that swaps the modal into an inline add-service form
(`CaseCreateForm.js:3731` on). Layout/spacing/typography match the rest of Case's design tokens.
Separately, this modal also contains a "Sample tasks for custom service" editor tied to Case's
task-template system — see §6, this part is explicitly not ported.

## 4. Target design for `QuotationCreateForm.js` (Phase A)

Apply §3 to `ServicesTable`/`ServicePickerModal` in `QuotationCreateForm.js`, with these mappings
to what already exists there:

- **Row table**: replace the `ctx.antd.Table` + `quotationServiceColumns` (added by the
  superseded spec's Task 2) with a hand-rolled `<table>`/`<thead>`/`<tbody>` using restored
  `th()`/`td()` helpers, one `<tr>` per row built from a per-row `isRowEdit` flag.
- **Edit toggle**: add `editingRows` state + `toggleRowEdit`, exactly as §3.2.
- **Cell content when editing**: reuse Quotation's existing PriceInput/currency-select/VAT-input/
  AutoTextarea JSX (already correct) — just gate each behind `isRowEdit` instead of showing it
  unconditionally.
- **Cell content when read-only**: new — formatted money via the existing `formatMoneyByCurrency`,
  the existing `getRowConversion`-based "Original: ..." / "Thiếu tỷ giá" secondary line, and an
  `ExpandableText`-equivalent for description (port a minimal version: full text under some
  length, else truncate with a "show more" toggle — no new dependency needed, plain
  `useState`-backed component matching `CaseCreateForm.js`'s behavior).
- **Action buttons**: replace `TableActionIconButton`/`TableSvgDeleteIcon` (pill-shaped, from the
  superseded spec) with `iconButtonStyle` + `RowEditIcon` + `TrashIcon` (square, per §3.5), ported
  verbatim into `QuotationCreateForm.js`.
- **Totals bar**: revert `renderQuotationServicesSummary`'s container from
  `Table.Summary.Row`/`Table.Summary.Cell` to a flex `<div>` matching §3.6, keeping every value/
  handler it currently computes.
- **Breakdown modal** (`ctx.antd.Table`-based, from the superseded spec's Task 4): keep as-is —
  it is a standalone comparison table, not part of the row-editing interaction this spec is about,
  and `CaseCreateForm.js` has its own equivalent (`renderExchangeBreakdownModal`) that is
  structurally similar (a small reference table in a modal). No changes needed here.
- **Compare/"Review Changes" modal**: unchanged (already `ctx.antd.Table`/`Tag`-based, already
  reviewed as consistent in the superseded spec's Task 5 QA note).
- **Add-service flow**: change `addRow` (blank-row-then-pick) to a `pickerOpen`-gated flow that
  opens `ServicePickerModal` directly from the "Add service" button and only creates a row once a
  service is chosen or a new one is created, per §3.7.
- **`ServicePickerModal`**: restyle its shell to §3.8's layout/spacing, keeping Quotation's
  existing "add new service" fields (name, type, currency, price, description) — no task-template
  section is added (§6).

## 5. Explicit behavior changes (not just visual)

These are real capability changes, called out so they don't surprise anyone during review:

1. **No more per-row "Select" to swap an existing row's service.** Today, `QuotationCreateForm.js`
   lets a user click the Service Name cell of *any* row (filled or not) to reopen the picker and
   change which catalog service it represents. Matching `CaseCreateForm.js` exactly drops this —
   after a row is created, its name/type can only be hand-edited as text (via the edit toggle),
   not re-picked from the catalog. To change the underlying service, the user deletes the row and
   adds a new one.
2. **"Add service" no longer creates a blank row first.** Today it calls `addRow()` (an empty row
   appears immediately, then the user clicks "Select" on it). After this change, "Add service"
   opens the picker immediately; a row only appears once a service is chosen/created. No blank
   "— Select service —" row state exists anymore.
3. **Rows are read-only immediately after creation**, requiring an explicit pencil-click to adjust
   price/VAT/description/name/type — today those fields are always live inputs.

## 6. What does NOT transfer (Case-domain-specific)

`CaseCreateForm.js`'s services feature is entangled with Case's task-template system, which has
no equivalent in Quotation or Contract (quotations/contracts don't spawn work-item tasks):

- The "Sample tasks for custom service" editor inside `ServicePickerModal`'s add-new-service tab
  (`taskTemplates`, `addCustomTask`/`updateCustomTask`/`removeCustomTask`, `createCustomTaskDraft`).
- The "Sample Task Overview" section below the table (`renderEditableTaskOverview`).
- Provenance badges like "N from quotation" / "N from contract" / "N included in package" shown
  in Case's table header (`fromQuotationCount`, `fromContractCount`) — these describe *where a
  Case's service line came from*, a concept that doesn't apply inside a Quotation/Contract's own
  service list.

None of the above are added to `QuotationCreateForm.js`.

## 7. Feature-preservation checklist (must not change)

Everything in the superseded spec's §6 still applies unchanged — this is still a
presentation/interaction-layer change over the same financial logic:

- Line ↔ Package pricing-mode toggle, including line-mode backup/restore.
- Multi-currency subtotal/VAT/total aggregation and exchange-rate lookup.
- Missing-rate detection, its warning banner, and the submit-time blocking validation in
  `handleSubmit` (untouched, lives outside `ServicesTable`).
- "Xem quy đổi tiền tệ" breakdown modal contents and math.
- "Review Changes" compare modal (list + detail views), including catalog matching and
  changed-field detection.
- `onAddNewService` payload shape and the catalog-service enrichment fields
  (`catalogService`, `catalogServiceId`, `catalogBasePrice`) rows already carry.
- `markDirty`/`isDirtyRef` triggering on every edit.
- Package-mode field editing (`packageSubTotal`, `packageVatRate`).

## 8. Risks / trade-offs

- This reverts real, already-committed work (the superseded spec's Tasks 2-4 row/summary
  structure). The breakdown modal (Task 4) and design tokens added in Task 1 are the only pieces
  of that work still directly reused (icon-button *shape* changes, but the token *palette* —
  colors, `bgSection`, etc. — stays valid since Case uses the same `C` values).
- Dropping the per-row "re-pick service" capability (§5.1) is a real UX regression risk if any
  user relies on it today to fix a wrong service choice without deleting the row. Since it matches
  Case's own established pattern exactly, this is treated as intentional parity, not an oversight
  — flag it in Phase A's QA pass so it can be reconsidered if it turns out to matter in practice.
- `ExpandableText` needs a new small implementation in `QuotationCreateForm.js` (Case's version is
  not directly portable cross-file per the Nocobase single-file constraint) — keep it minimal
  (character-limit truncation + toggle), matching Case's visible behavior, not its exact code.
- No automated test coverage exists for this file. Verification is `node --check` plus manual QA
  in the live Nocobase app, per CLAUDE.md's UI-testing rule.

## 9. Testing / acceptance

- `node --check` on `QuotationCreateForm.js` after each edit.
- Manual QA in the browser: click "Add service" → picker opens directly (no blank row first);
  choose a service → row appears read-only; click the pencil → fields become editable; edit
  price/VAT/description/currency → click pencil again (now a checkmark) → row locks back to
  read-only with updated values; click trash → row removed.
- Multi-currency: add rows in 2+ currencies, confirm the read-only Total cell shows the
  "Original: ..." secondary line or "Missing rate to ..." warning exactly as before.
- Package mode toggle still works; totals bar (now outside the table) still shows/edits correctly
  and the "Xem quy đổi tiền tệ" button still opens the breakdown modal.
- Submit a quotation end-to-end successfully.
- Visual check: side-by-side with `CaseCreateForm.js`'s own services table — same table chrome,
  same icon-button shape/color, same read-only/edit-toggle behavior.

## 10. Phase B note (follow-up, not this spec's implementation target)

Once Phase A ships and is reviewed live, a follow-up spec applies the same §3 pattern to
`ContractCreateForm.js`'s `ManualContractServicesSection`, additionally deciding how retainer
billing fields (monthly fee, duration, repeat unit — which have no equivalent in `CaseCreateForm.js`
or Quotation) fit into the read-only/edit-toggle row model. That decision is deferred to Phase B's
own spec rather than guessed here.
