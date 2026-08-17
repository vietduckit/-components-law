# Services Table Case-CreateForm Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `QuotationCreateForm.js`'s `ServicesTable` so its row table, edit interaction, and add-service flow match `CaseCreateForm.js`'s pattern exactly (hand-rolled `<table>`, per-row read-only/edit-toggle via a pencil icon, picker used only to add new rows), reverting the AntD-`Table`-based structure from the superseded spec's Tasks 2-3.

**Architecture:** `ServicesTable` gets a per-row `editingRows` boolean map (toggle via pencil icon) driving read-only-vs-input cell rendering inside a hand-rolled `<table>`; a single `pickerOpen` boolean (not per-row) gates the service picker, which now only *adds* rows (never edits an existing one's service); the totals bar reverts to a standalone flex block below the table.

**Tech Stack:** Nocobase RunJS block (`ctx.React`, `ctx.antd`), no build step, no test framework in this repo.

**Spec:** `docs/superpowers/specs/2026-08-17-services-table-case-createform-parity-design.md`

## Global Constraints

- No `fetch()`, no `import`/`require` — single-file RunJS artifact
  (`All Module/Quotation/QuotationCreateForm.js:67`).
- Use only `ctx.React`, `ctx.antd`, `React.createElement` — no JSX in this file.
- No test framework exists for this file. Verification per task is: (1) `node --check` for
  syntax validity, and (2) manual QA in the live Nocobase app.
- Do not touch the file's existing `C` token object, `inp()`, `Card`, `CardHeader`, `Grid`,
  `Field`, `AutoTextarea`, `PriceInput`, `DatePicker`, `LeadDropdown`, `CustomerDropdown`,
  `LawyerPicker`, `ApprovalSection` — unrelated to this change.
- Preserve every item in the spec's §7 feature-preservation checklist exactly (financial/
  currency-conversion logic is untouched — this plan only changes presentation/interaction).
- `ContractCreateForm.js` is out of scope for this plan (Phase B, deferred per the spec).
- The three explicit behavior changes in the spec's §5 (no per-row service re-pick; "Add
  service" opens the picker directly instead of adding a blank row; rows start read-only) are
  intentional — do not "fix" them back to the old behavior.
- Per the spec's §6, do NOT port `CaseCreateForm.js`'s task-template/"Sample tasks" editor, its
  "Sample Task Overview" section, or its "N from quotation/contract" provenance badges —
  Quotation has no task-template domain concept. None of these are part of any task below.

---

## Task 1: Icon-button and read-only-text helpers; remove superseded pill-button tokens

**Files:**
- Modify: `All Module/Quotation/QuotationCreateForm.js` (inside/around `ServicesTable`,
  currently starting at line 4438)

**Interfaces:**
- Removes: `TABLE_DS`, `TABLE_BADGE_STYLE`, `TableSvgDeleteIcon`, `TableActionIconButton` (all
  from the superseded spec, now unused after this plan's Task 3 removes their only call sites).
- Produces (new, consumed by Task 3): `iconButtonStyle(color, active)`, `RowEditIcon({ active })`,
  `TrashIcon()`, `ExpandableText({ text, limit })`. Produces (restored, consumed by Task 3):
  `th(ex)`, `td(ex)` style helpers, scoped inside `ServicesTable` as before.

- [ ] **Step 1: Replace the design-token block with icon-button/read-only helpers**

Find:

```js
// Local copy of CaseServices.js's design tokens/components, scoped to
// ServicesTable + its two modals only. Files in this repo cannot share
// modules (Nocobase single-file constraint), so these are literal copies,
// not imports. Do NOT rename or touch the file's existing `C` object or
// other shared primitives (inp, Card, Field, ...) used elsewhere in this
// file — this is a separate, additive token set.
const TABLE_DS = {
  radius: { xs: 4, sm: 6, md: 8, pill: 999 },
  border: "#d9d9d9",
  bg: "#ffffff",
  bgSection: "#fafafa",
  primary: "#1677ff",
  primarySoft: "#e6f4ff",
  danger: "#ff4d4f",
};

const TABLE_BADGE_STYLE = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const TableSvgDeleteIcon = ({ color = "currentColor", size = 15 }) =>
  React.createElement(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: color,
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    React.createElement("path", { d: "M3 6h18" }),
    React.createElement("path", {
      d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    }),
    React.createElement("path", {
      d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
    }),
    React.createElement("path", { d: "M10 11v6" }),
    React.createElement("path", { d: "M14 11v6" }),
  );

// Danger-only icon button, matching CaseServices.js's ActionIconButton look
// (circular, bordered, small) — used for the "delete row" action.
const TableActionIconButton = ({ title, onClick }) => {
  const button = React.createElement(
    "button",
    {
      type: "button",
      onClick,
      title,
      "aria-label": title,
      style: {
        width: 30,
        height: 30,
        minWidth: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: TABLE_DS.bg,
        border: "1px solid #fecdd3",
        borderRadius: TABLE_DS.radius.pill,
        color: TABLE_DS.danger,
        cursor: "pointer",
      },
    },
    React.createElement(TableSvgDeleteIcon, { color: TABLE_DS.danger }),
  );
  return Tooltip
    ? React.createElement(
        Tooltip,
        { title },
        React.createElement(
          "span",
          { style: { display: "inline-flex" } },
          button,
        ),
      )
    : button;
};

// ==================== SERVICES TABLE ====================
```

Replace it with:

```js
// Ported from CaseCreateForm.js's services table (see
// docs/superpowers/specs/2026-08-17-services-table-case-createform-parity-design.md §3.5) —
// square, bordered icon buttons for the per-row edit-toggle and delete actions, and a minimal
// truncate/expand text component for read-only descriptions. Files in this repo cannot share
// modules, so these are literal copies scoped to ServicesTable, not imports.
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

const RowEditIcon = ({ active }) =>
  React.createElement(
    "svg",
    {
      width: 15,
      height: 15,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    active
      ? React.createElement("path", { d: "M20 6 9 17l-5-5" })
      : [
          React.createElement("path", { key: "p1", d: "M12 20h9" }),
          React.createElement("path", {
            key: "p2",
            d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
          }),
        ],
  );

const TrashIcon = () =>
  React.createElement(
    "svg",
    {
      width: 15,
      height: 15,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    React.createElement("path", { d: "M3 6h18" }),
    React.createElement("path", { d: "M8 6V4h8v2" }),
    React.createElement("path", { d: "M19 6l-1 14H6L5 6" }),
    React.createElement("path", { d: "M10 11v6" }),
    React.createElement("path", { d: "M14 11v6" }),
  );

// Minimal truncate/expand for read-only description cells — matches
// CaseCreateForm.js's ExpandableText behavior without importing its code.
const ExpandableText = ({ text, limit = 100 }) => {
  const [expanded, setExpanded] = useState(false);
  const value = text || "";
  if (!value) {
    return React.createElement(
      "span",
      { style: { fontSize: 12, color: "#d1d5db", fontStyle: "italic" } },
      "No description",
    );
  }
  if (value.length <= limit) {
    return React.createElement(
      "span",
      { style: { whiteSpace: "pre-wrap", wordBreak: "break-word" } },
      value,
    );
  }
  return React.createElement(
    "span",
    { style: { whiteSpace: "pre-wrap", wordBreak: "break-word" } },
    expanded ? value : `${value.slice(0, limit)}…`,
    React.createElement(
      "span",
      {
        onClick: (e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        },
        style: {
          color: C.primary,
          cursor: "pointer",
          fontSize: 11.5,
          fontWeight: 600,
          marginLeft: 6,
          whiteSpace: "nowrap",
        },
      },
      expanded ? "Show less" : "Show more",
    ),
  );
};

// ==================== SERVICES TABLE ====================
```

- [ ] **Step 2: Restore the `th()`/`td()` style helpers inside `ServicesTable`**

Find:

```js
  const selectedIds = useMemo(
    () =>
      rows
        .map((r) =>
          firstId(r.serviceId, r.service, r.services, r.catalogServiceId),
        )
        .filter(Boolean)
        .map(String),
    [rows],
  );

  const quotationServiceColumns = [
```

Replace it with:

```js
  const selectedIds = useMemo(
    () =>
      rows
        .map((r) =>
          firstId(r.serviceId, r.service, r.services, r.catalogServiceId),
        )
        .filter(Boolean)
        .map(String),
    [rows],
  );

  const th = (ex = {}) => ({
    padding: "9px 12px",
    fontSize: 11.5,
    fontWeight: 600,
    color: C.textSub,
    background: C.bgSection,
    borderBottom: `2px solid ${C.border}`,
    whiteSpace: "normal",
    textAlign: "left",
    fontFamily: FONT,
    ...ex,
  });
  const td = (ex = {}) => ({
    padding: "8px 10px",
    fontSize: 13,
    borderBottom: `1px solid #f3f4f6`,
    verticalAlign: "top",
    fontFamily: FONT,
    ...ex,
  });

  const quotationServiceColumns = [
```

(`quotationServiceColumns` and everything through the closing `];` of that array is deleted in
Task 3 — this step only restores the two helpers it will need.)

- [ ] **Step 3: Verify syntax**

Run: `node --check "All Module/Quotation/QuotationCreateForm.js"`
Expected: no output, exit code 0. (`quotationServiceColumns` still exists at this point — Task 1
only adds/removes helpers, it doesn't touch the columns array or its call sites yet.)

- [ ] **Step 4: Commit**

```bash
git add "All Module/Quotation/QuotationCreateForm.js"
git commit -m "feat(QuotationCreateForm): add Case-style icon-button/read-only helpers"
```

---

## Task 2: Rewire the add-service flow (picker adds rows; no per-row re-pick)

**Files:**
- Modify: `All Module/Quotation/QuotationCreateForm.js` (one edit in `QuotationCreateForm`, two
  edits in `ServicesTable`)

**Interfaces:**
- Consumes: nothing new from Task 1.
- Produces: `addRowFromService(value)` (in `QuotationCreateForm`, replaces `addRow`; passed to
  `ServicesTable` as the new `onAddFromService` prop). Inside `ServicesTable`: `pickerOpen`
  (boolean state, replaces `pickerRowId`), `editingRows`/`toggleRowEdit` (new state, consumed by
  Task 3's table body).

- [ ] **Step 1: Replace `addRow` with `addRowFromService` in `QuotationCreateForm`**

Find:

```js
  const addRow = () => {
    markDirty();
    setRows((p) => [
      ...p,
      {
        _id: Date.now(),
        projectServiceId: null,
        serviceId: null,
        serviceName: "",
        description: "",
        quantity: 1,
        currencyId: extractCurrencyId(selectedCurrency)
          ? String(extractCurrencyId(selectedCurrency))
          : null,
        currency: selectedCurrency,
        basePrice: 0,
        vat: isPackagePricing(form.pricingMode) ? 0 : VAT_DEFAULT,
      },
    ]);
  };
```

Replace it with:

```js
  // Mirrors CaseCreateForm.js's onAddFromService: the picker only ever adds a brand-new row
  // (never edits an existing row's service — see the parity design spec §5.1). `value` carries
  // the exact same field shape the old __service__-merge branch of updateRow used to consume.
  const addRowFromService = (value) => {
    markDirty();
    setRows((p) => [
      ...p,
      {
        _id: Date.now(),
        projectServiceId: value.projectServiceId || null,
        serviceId: value.serviceId,
        basePrice: value.basePrice,
        currencyId: value.currencyId ? String(value.currencyId) : null,
        currency: value.currency || null,
        vat: value.vat ?? 0,
        serviceName: value.serviceName,
        serviceType: value.serviceType || "",
        description: value.description || "",
        catalogService: value.catalogService || null,
        catalogServiceId: value.catalogServiceId || value.serviceId || null,
        catalogBasePrice: value.catalogBasePrice ?? value.basePrice ?? null,
      },
    ]);
  };
```

- [ ] **Step 2: Update the `<ServicesTable>` prop from `onAdd` to `onAddFromService`**

Find:

```js
      React.createElement(ServicesTable, {
        rows,
        svcOpts,
        companyId: form.internalCompanyId,
        onUpdate: updateRow,
        onAdd: addRow,
        onDelete: deleteRow,
```

Replace it with:

```js
      React.createElement(ServicesTable, {
        rows,
        svcOpts,
        companyId: form.internalCompanyId,
        onUpdate: updateRow,
        onAddFromService: addRowFromService,
        onDelete: deleteRow,
```

- [ ] **Step 3: Replace `pickerRowId` with `pickerOpen` + add `editingRows` state in `ServicesTable`**

Find:

```js
}) => {
  const { Table } = ctx.antd;
  const [pickerRowId, setPickerRowId] = useState(null);
  const [compareModal, setCompareModal] = useState({ open: false, data: null });
```

Replace it with:

```js
}) => {
  const { Table } = ctx.antd;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingRows, setEditingRows] = useState({});
  const toggleRowEdit = (rowId) =>
    setEditingRows((p) => ({ ...p, [rowId]: !p[rowId] }));
  const [compareModal, setCompareModal] = useState({ open: false, data: null });
```

Also update the destructured prop list: find

```js
const ServicesTable = ({
  rows,
  svcOpts,
  onUpdate,
  onAdd,
  onDelete,
```

and replace with

```js
const ServicesTable = ({
  rows,
  svcOpts,
  onUpdate,
  onAddFromService,
  onDelete,
```

- [ ] **Step 4: Rewire the `ServicePickerModal` invocation to add rows and close the shared picker**

Find:

```js
    pickerRowId !== null &&
      React.createElement(ServicePickerModal, {
        svcOpts,
        selectedIds,
        companyId,
        currencies,
        currencyOptions,
        defaultCurrencyId: extractCurrencyId(selectedCurrency),
        onSelect: (svc) => {
          onUpdate(pickerRowId, "__service__", {
            serviceId: svc.id,
            basePrice: packageMode ? 0 : svc.basePrice,
            currencyId: svc.currencyId || extractCurrencyId(selectedCurrency),
            currency: svc.currency || selectedCurrency,
            serviceName: svc.serviceName,
            description: svc.description,
            serviceType: svc.serviceType || "",
            catalogService: svc.catalogService || null,
            catalogServiceId: svc.catalogServiceId || svc.id,
            catalogBasePrice: svc.catalogBasePrice ?? svc.basePrice,
            vat: packageMode ? 0 : (svc.vat ?? svc.vatRate ?? 0),
          });
          setPickerRowId(null);
        },
        onClose: () => setPickerRowId(null),
        onAddNewService: (data) => {
          onAddNewService(data).then((s) => {
            onUpdate(pickerRowId, "__service__", {
              serviceId: s.id,
              basePrice: packageMode ? 0 : s.basePrice,
              currencyId: s.currencyId || extractCurrencyId(selectedCurrency),
              currency: s.currency || selectedCurrency,
              serviceName: s.serviceName,
              description: s.description,
              serviceType: s.serviceType || "",
              catalogService: s.catalogService || null,
              catalogServiceId: s.catalogServiceId || s.id,
              catalogBasePrice: s.catalogBasePrice ?? s.basePrice,
              vat: packageMode ? 0 : undefined,
            });
            setPickerRowId(null);
          });
        },
      }),
```

Replace it with:

```js
    pickerOpen &&
      React.createElement(ServicePickerModal, {
        svcOpts,
        selectedIds,
        companyId,
        currencies,
        currencyOptions,
        defaultCurrencyId: extractCurrencyId(selectedCurrency),
        onSelect: (svc) => {
          onAddFromService({
            serviceId: svc.id,
            basePrice: packageMode ? 0 : svc.basePrice,
            currencyId: svc.currencyId || extractCurrencyId(selectedCurrency),
            currency: svc.currency || selectedCurrency,
            serviceName: svc.serviceName,
            description: svc.description,
            serviceType: svc.serviceType || "",
            catalogService: svc.catalogService || null,
            catalogServiceId: svc.catalogServiceId || svc.id,
            catalogBasePrice: svc.catalogBasePrice ?? svc.basePrice,
            vat: packageMode ? 0 : (svc.vat ?? svc.vatRate ?? 0),
          });
          setPickerOpen(false);
        },
        onClose: () => setPickerOpen(false),
        onAddNewService: (data) => {
          onAddNewService(data).then((s) => {
            onAddFromService({
              serviceId: s.id,
              basePrice: packageMode ? 0 : s.basePrice,
              currencyId: s.currencyId || extractCurrencyId(selectedCurrency),
              currency: s.currency || selectedCurrency,
              serviceName: s.serviceName,
              description: s.description,
              serviceType: s.serviceType || "",
              catalogService: s.catalogService || null,
              catalogServiceId: s.catalogServiceId || s.id,
              catalogBasePrice: s.catalogBasePrice ?? s.basePrice,
              vat: packageMode ? 0 : undefined,
            });
            setPickerOpen(false);
          });
        },
      }),
```

- [ ] **Step 5: Point the "Add service" button at `setPickerOpen(true)`**

Find (both branches of the `AntButton ? ... : ...` ternary reference `onAdd` — replace both):

```js
        AntButton
          ? React.createElement(
              AntButton,
              {
                size: "small",
                onClick: onAdd,
                style: { borderStyle: "dashed" },
              },
              "Add service",
            )
          : React.createElement(
              "div",
              {
                onClick: onAdd,
                style: {
                  padding: "5px 14px",
                  borderRadius: 6,
                  border: `1px dashed ${C.primary}`,
                  color: C.primary,
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: FONT,
                },
              },
              "Add row",
            ),
```

Replace it with:

```js
        AntButton
          ? React.createElement(
              AntButton,
              {
                size: "small",
                onClick: () => setPickerOpen(true),
                style: { borderStyle: "dashed" },
              },
              "Add service",
            )
          : React.createElement(
              "div",
              {
                onClick: () => setPickerOpen(true),
                style: {
                  padding: "5px 14px",
                  borderRadius: 6,
                  border: `1px dashed ${C.primary}`,
                  color: C.primary,
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: FONT,
                },
              },
              "Add row",
            ),
```

- [ ] **Step 6: Verify syntax**

Run: `node --check "All Module/Quotation/QuotationCreateForm.js"`
Expected: no output, exit code 0.

(Note: at this point `quotationServiceColumns` still references the now-removed `setPickerRowId`
inside its "Service Name & Type" column — that whole array is deleted in Task 3, so this
intermediate state will fail `node --check` if Task 3 isn't done in the same sitting. Do Task 2
and Task 3 back-to-back before verifying, or verify after Task 3's Step 1 instead.)

- [ ] **Step 7: Commit** (after Task 3 makes the file valid again — see note above; or combine
  Task 2 and Task 3's commits into one if working through them without a checkpoint in between)

```bash
git add "All Module/Quotation/QuotationCreateForm.js"
git commit -m "feat(QuotationCreateForm): rewire add-service flow to picker-adds-rows model"
```

---

## Task 3: Rewrite the table body and totals bar (hand-rolled `<table>` + per-row edit-toggle)

**Files:**
- Modify: `All Module/Quotation/QuotationCreateForm.js` (removes `quotationServiceColumns` and
  the AntD `Table` wrapper; adds a hand-rolled `<table>` and a standalone totals `<div>`)

**Interfaces:**
- Consumes: `iconButtonStyle`, `RowEditIcon`, `TrashIcon`, `ExpandableText`, `th`, `td` (Task 1);
  `editingRows`/`toggleRowEdit`, `pickerOpen` (Task 2, unrelated to this task but coexist in the
  same component).
- Removes: `quotationServiceColumns`, `renderQuotationServicesSummary`'s `Table.Summary.Row`-based
  body (replaced by an equivalent flex-div version further down), the `ctx.antd.Table` element
  used for the row table.
- `getBreakdownGroupRate` and the breakdown-modal `Table` usage (added in the superseded spec's
  Task 4) are untouched — `const { Table } = ctx.antd` stays because the breakdown modal still
  uses it.

- [ ] **Step 1: Delete `quotationServiceColumns` entirely**

Find the block starting at:

```js
  const quotationServiceColumns = [
    {
      title: "#",
```

and ending at its closing:

```js
    {
      title: "",
      key: "action",
      width: 60,
      align: "center",
      render: (_, r) =>
        React.createElement(TableActionIconButton, {
          title: "Delete row",
          onClick: () => onDelete(r._id),
        }),
    },
  ];
```

Delete the whole array (from `const quotationServiceColumns = [` through the closing `];`) —
nothing replaces it at this exact spot; the next step rewrites the JSX that used to reference it.

- [ ] **Step 2: Replace `renderQuotationServicesSummary`'s container from `Table.Summary.Row` to
  a plain flex `<div>` (values/handlers unchanged)**

Find:

```js
  const renderQuotationServicesSummary = () =>
    rows.length > 0
      ? React.createElement(
          Table.Summary.Row,
          null,
          React.createElement(
            Table.Summary.Cell,
            { index: 0, colSpan: 3 },
```

Replace the opening with:

```js
  const renderQuotationServicesSummary = () =>
    rows.length > 0
      ? React.createElement(
          "div",
          {
            style: {
              borderTop: `2px solid ${C.border}`,
              padding: "14px 20px",
              background: C.bgSection,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            },
          },
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 } },
```

Then find the matching `Table.Summary.Cell` closes for the first cell and the three value cells,
and the trailing blank cell + closing. Specifically, find:

```js
              `Thiếu tỷ giá quy đổi (${formatMissingRatePairs(financialSummary.missing, baseCurrency)}) — tổng báo giá chưa được cập nhật chính xác.`,
              ),
          ),
          React.createElement(
            Table.Summary.Cell,
            { index: 3, align: "right" },
```

Replace it with:

```js
              `Thiếu tỷ giá quy đổi (${formatMissingRatePairs(financialSummary.missing, baseCurrency)}) — tổng báo giá chưa được cập nhật chính xác.`,
              ),
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(140px, 1fr))",
                gap: 12,
                width: "min(100%, 560px)",
              },
            },
          React.createElement(
            "div",
            { style: { background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", minWidth: 0 } },
```

Find:

```js
          React.createElement(
            Table.Summary.Cell,
            { index: 4, align: "center" },
```

Replace with:

```js
          React.createElement(
            "div",
            { style: { background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 8, padding: "9px 12px", minWidth: 0 } },
```

Find:

```js
          React.createElement(
            Table.Summary.Cell,
            { index: 5, align: "right" },
```

Replace with:

```js
          React.createElement(
            "div",
            { style: { background: "#eef4ff", border: `1px solid ${C.borderHighlight}`, borderRadius: 8, padding: "9px 12px", minWidth: 0 } },
```

Find the trailing blank cell and the two closing parens that end the whole `renderQuotationServicesSummary`
ternary:

```js
          React.createElement(Table.Summary.Cell, { index: 6 }),
        )
      : null;
```

Replace with:

```js
          ),
        ),
      )
      : null;
```

(This closes: the 3-card grid `<div>`, the outer flex `<div>`, and the ternary. The result is the
exact same visual card layout the original flex summary bar used before the superseded spec's
Task 3, just built from the content that already exists inside `renderQuotationServicesSummary`
today — no card content changes, only the wrapping elements.)

- [ ] **Step 3: Replace the `<Table>` row-table wrapper with a hand-rolled `<table>`**

Find:

```js
    React.createElement(
      "div",
      { style: { overflowX: "auto" } },
      React.createElement(Table, {
        dataSource: rows,
        columns: quotationServiceColumns,
        rowKey: "_id",
        pagination: false,
        size: "middle",
        bordered: false,
        scroll: { x: "max-content" },
        locale: { emptyText: 'No services added - click "Add row"' },
        summary: renderQuotationServicesSummary,
      }),
    ),
```

Replace it with:

```js
    React.createElement(
      "div",
      { style: { overflowX: "auto" } },
      React.createElement(
        "table",
        { style: { width: "100%", borderCollapse: "collapse", minWidth: 930 } },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement("th", { style: th({ width: 36, textAlign: "center" }) }, "#"),
            React.createElement("th", { style: th({ minWidth: 280 }) }, "Service Name & Type"),
            React.createElement("th", { style: th({ minWidth: 320 }) }, "Description"),
            React.createElement("th", { style: th({ width: 180, textAlign: "right" }) }, "Unit Price"),
            React.createElement("th", { style: th({ width: 80, textAlign: "center" }) }, "VAT (%)"),
            React.createElement("th", { style: th({ width: 160, textAlign: "right", color: "#1d4ed8" }) }, "Total"),
            React.createElement("th", { style: th({ width: 84 }) }, ""),
          ),
        ),
        React.createElement(
          "tbody",
          null,
          rows.length === 0
            ? React.createElement(
                "tr",
                null,
                React.createElement(
                  "td",
                  { colSpan: 7, style: td({ textAlign: "center", color: "#9ca3af", padding: "32px 0" }) },
                  'No services added — click "Add service"',
                ),
              )
            : rows.map((r) => {
                const isRowEdit = !!editingRows[r._id];
                const rowCurrency =
                  findCurrencyById(currencies, r.currencyId) ||
                  currencyFromRecord(r, currencies, selectedCurrency);
                const line = packageMode
                  ? calcLine(0, 1, 0)
                  : calcLine(r.basePrice, 1, r.vat);
                const rowConversion = !packageMode ? getRowConversion(rowCurrency, line) : null;

                return React.createElement(
                  "tr",
                  { key: r._id },
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "center", color: C.textSub, fontSize: 12, fontWeight: 600 }) },
                    r._id,
                  ),
                  React.createElement(
                    "td",
                    { style: td() },
                    isRowEdit
                      ? React.createElement(
                          "div",
                          { style: { display: "grid", gap: 6 } },
                          React.createElement("input", {
                            value: r.serviceName || "",
                            onChange: (e) => onUpdate(r._id, "serviceName", e.target.value),
                            placeholder: "Service name...",
                            style: inp({ fontSize: 13.5, padding: "6px 9px" }),
                          }),
                          React.createElement("input", {
                            value: r.serviceType || "",
                            onChange: (e) => onUpdate(r._id, "serviceType", e.target.value),
                            placeholder: "Service type...",
                            style: inp({ fontSize: 12.5, padding: "5px 9px" }),
                          }),
                        )
                      : React.createElement(
                          "div",
                          { style: { display: "flex", flexDirection: "column", gap: 4 } },
                          React.createElement(
                            "span",
                            { style: { fontWeight: 600, color: r.serviceId ? C.text : C.textSub, whiteSpace: "normal", overflowWrap: "anywhere" } },
                            r.serviceName || "—",
                          ),
                          r.serviceType &&
                            React.createElement(
                              "span",
                              {
                                style: {
                                  alignSelf: "flex-start",
                                  fontSize: 10,
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  fontWeight: 500,
                                  lineHeight: "14px",
                                },
                              },
                              r.serviceType,
                            ),
                        ),
                  ),
                  React.createElement(
                    "td",
                    { style: td() },
                    isRowEdit
                      ? React.createElement(AutoTextarea, {
                          value: r.description || "",
                          onChange: (v) => onUpdate(r._id, "description", v),
                          placeholder: "Service scope or row note...",
                          minRows: 2,
                        })
                      : React.createElement(ExpandableText, { text: r.description, limit: 100 }),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "right" }) },
                    packageMode
                      ? React.createElement(
                          "span",
                          { style: { display: "inline-block", padding: "4px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "#e6f4ff", color: C.primary } },
                          "Included in package",
                        )
                      : isRowEdit
                        ? React.createElement(
                            "div",
                            { style: { display: "grid", gap: 6 } },
                            React.createElement(PriceInput, {
                              value: r.basePrice,
                              onChange: (v) => onUpdate(r._id, "basePrice", v),
                            }),
                            React.createElement(
                              "select",
                              {
                                value: r.currencyId || "",
                                onChange: (e) => onUpdate(r._id, "currencyId", e.target.value || null),
                                style: { ...inp({ padding: "6px 8px" }), cursor: "pointer", fontWeight: 700, textAlign: "center", width: "100%" },
                                disabled: !currencies.length,
                                title: currencySelectLabel(rowCurrency),
                              },
                              !currencyOptions.some((option) => String(option.value) === String(r.currencyId || "")) &&
                                React.createElement("option", { value: "" }, getCurrencyCode(rowCurrency)),
                              ...currencyOptions.map((option) =>
                                React.createElement("option", { key: option.value, value: option.value }, option.label),
                              ),
                            ),
                          )
                        : React.createElement(
                            "span",
                            { style: { fontWeight: 700, color: C.text } },
                            formatMoneyByCurrency(r.basePrice || 0, rowCurrency),
                          ),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "center" }) },
                    packageMode
                      ? React.createElement("span", { style: { color: C.textSub, fontSize: 12.5 } }, "0%")
                      : isRowEdit
                        ? React.createElement(
                            "div",
                            { style: { display: "flex", alignItems: "center", gap: 2, justifyContent: "center" } },
                            React.createElement("input", {
                              type: "number",
                              min: 0,
                              max: 100,
                              step: 1,
                              value: r.vat,
                              onChange: (e) => onUpdate(r._id, "vat", parseFloat(e.target.value) || 0),
                              style: { border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 4px", fontSize: 13.5, outline: "none", textAlign: "right", width: 46, fontFamily: FONT },
                            }),
                            React.createElement("span", { style: { fontSize: 12, color: C.textSub } }, "%"),
                          )
                        : React.createElement("span", { style: { fontSize: 12.5, color: C.text } }, `${r.vat || 0}%`),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "right", fontWeight: 700, color: "#1d4ed8", fontSize: 14, fontVariantNumeric: "tabular-nums" }) },
                    packageMode
                      ? "—"
                      : rowConversion?.canConvert
                        ? React.createElement(
                            "div",
                            { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 } },
                            React.createElement(
                              "span",
                              null,
                              formatMoneyByCurrency(
                                rowConversion.sameCurrency ? line.totalAmount : rowConversion.totalAmount,
                                baseCurrency,
                              ),
                            ),
                            !rowConversion.sameCurrency &&
                              React.createElement(
                                "span",
                                { style: { color: C.textSub, fontSize: 10.5, fontWeight: 600 } },
                                `Gốc: ${formatMoneyByCurrency(line.totalAmount, rowCurrency)}`,
                              ),
                          )
                        : React.createElement(
                            "div",
                            { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 } },
                            React.createElement("span", null, formatMoneyByCurrency(line.totalAmount, rowCurrency)),
                            React.createElement(
                              "span",
                              { style: { color: "#d48806", fontSize: 10.5, fontWeight: 700 } },
                              `Thiếu tỷ giá → ${getCurrencyCode(baseCurrency)}`,
                            ),
                          ),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "center" }) },
                    React.createElement(
                      "div",
                      { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6 } },
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          title: isRowEdit ? "Done editing" : "Edit service",
                          onClick: () => toggleRowEdit(r._id),
                          style: iconButtonStyle(C.primary, isRowEdit),
                        },
                        React.createElement(RowEditIcon, { active: isRowEdit }),
                      ),
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          title: "Delete service",
                          onClick: () => onDelete(r._id),
                          style: iconButtonStyle(C.danger),
                        },
                        React.createElement(TrashIcon),
                      ),
                    ),
                  ),
                );
              }),
        ),
      ),
    ),
    renderQuotationServicesSummary(),
```

- [ ] **Step 4: Verify syntax**

Run: `node --check "All Module/Quotation/QuotationCreateForm.js"`
Expected: no output, exit code 0. This is the first point since Task 2 where the file is fully
consistent again (no dangling references to `Table.Summary.*`, `pickerRowId`, or
`quotationServiceColumns`) — if Task 2 wasn't committed separately, commit both now.

- [ ] **Step 5: Manual verification**

Open "Create Quotation". Confirm:
- Row table renders as a plain HTML table (Case's exact look: header row background, thin
  borders), not an AntD-styled table.
- Click "Add service" → the picker opens **immediately** (no blank row appears first). Pick a
  service → a fully-populated, **read-only** row appears.
- Click the pencil icon on that row → fields become editable (text inputs for name/type,
  textarea for description, PriceInput+currency select, VAT number input). Edit values, click the
  pencil again (now shows a checkmark while active) → row locks back to read-only with the new
  values reflected.
- Long descriptions truncate with a "Show more" link in read-only mode; empty descriptions show
  italic gray "No description".
- Package mode: Unit Price shows the "Included in package" badge regardless of edit state; VAT
  shows "0%".
- Total column is never directly editable in either state and still shows the "Gốc: ..." /
  "Thiếu tỷ giá" secondary line exactly as before.
- Delete button (trash icon) removes the row.
- Totals bar renders below the table as a bordered flex block with the same 3 cards
  (Subtotal/VAT/Total) and, in package mode, the same editable inputs; the "Xem quy đổi tiền tệ"
  button and missing-rate banner still appear/behave correctly.

- [ ] **Step 6: Commit** (if not already combined with Task 2's commit)

```bash
git add "All Module/Quotation/QuotationCreateForm.js"
git commit -m "feat(QuotationCreateForm): rebuild services table as hand-rolled table with per-row edit toggle"
```

---

## Task 4: `ServicePickerModal` header — tabs instead of a "← Back" link

**Files:**
- Modify: `All Module/Quotation/QuotationCreateForm.js` (inside `ServicePickerModal`, currently
  starting at line 3663)

**Interfaces:** none new — purely a header-chrome change inside an existing component; `showAdd`/
`setShowAdd` state is reused unchanged (only how it's toggled/labeled in the header changes).

- [ ] **Step 1: Replace the "← Back" link with a 2-tab header, matching `CaseCreateForm.js`'s
  `ServicePickerModal`**

Find:

```js
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 10 } },
          showAdd &&
            React.createElement(
              "span",
              {
                onClick: () => {
                  setShowAdd(false);
                  setErrors({});
                },
                style: {
                  cursor: "pointer",
                  color: C.primary,
                  fontSize: 13,
                  padding: "3px 10px",
                  borderRadius: 4,
                  background: C.bgHighlight,
                  fontFamily: FONT,
                },
              },
              "← Back",
            ),
          React.createElement(
            "span",
            {
              style: {
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 15,
                color: C.text,
              },
            },
            showAdd ? "Create New Service" : "Select Service",
          ),
        ),
```

Replace it with:

```js
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 4 } },
          [
            [false, "Select from list"],
            [true, "Create new service"],
          ].map(([tabIsAdd, label]) =>
            React.createElement(
              "button",
              {
                key: label,
                type: "button",
                onClick: () => {
                  setShowAdd(tabIsAdd);
                  setErrors({});
                },
                style: {
                  border: "none",
                  background: showAdd === tabIsAdd ? C.bgHighlight : "transparent",
                  color: showAdd === tabIsAdd ? C.primary : C.textSub,
                  fontWeight: showAdd === tabIsAdd ? 700 : 500,
                  fontSize: 13,
                  padding: "6px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: FONT,
                },
              },
              label,
            ),
          ),
        ),
```

- [ ] **Step 2: Verify syntax**

Run: `node --check "All Module/Quotation/QuotationCreateForm.js"`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual verification**

Open the service picker ("Add service"). Confirm: two tab buttons ("Select from list" / "Create
new service") replace the old title+"← Back" pattern; clicking each switches views exactly as
before (state/validation/behavior unchanged, only the header control changed); the active tab is
visually highlighted.

- [ ] **Step 4: Commit**

```bash
git add "All Module/Quotation/QuotationCreateForm.js"
git commit -m "feat(QuotationCreateForm): tab-style ServicePickerModal header matching Case"
```

---

## Task 5: End-to-end manual QA and sign-off

**Files:** none (verification only; fix-forward commits only if QA finds a regression).

- [ ] **Step 1: Full flow QA in the browser**

Open "Create Quotation" fresh and walk through, per the spec's §9:
1. Add 2+ services via "Add service" (picker opens directly each time); confirm rows land
   read-only immediately.
2. Toggle edit on a row, change price/VAT/currency/description/name/type, toggle off — confirm
   values persist and the Total/summary numbers update correctly, including cross-currency rows
   (check the "Gốc: ..." / "Thiếu tỷ giá" lines).
3. Toggle "Package pricing" on/off — confirm the package badge, package-mode summary inputs, and
   that turning package mode back off restores the previous per-row prices
   (`lineModeBackupRef` — unchanged by this plan, verify it still works with the new table).
4. Delete a row.
5. Open "Xem quy đổi tiền tệ" and "Review Changes" — confirm both still work (untouched by this
   plan).
6. Create a brand-new service via the picker's "Create new service" tab — confirm it both creates
   the catalog record and adds a populated read-only row.
7. Submit a quotation end-to-end successfully.

- [ ] **Step 2: Visual comparison against `CaseCreateForm.js`**

Open Case's own "Create Case" services section side by side with Quotation. Confirm: same table
chrome, same square icon-button shape/color for edit/delete, same read-only-by-default/
edit-toggle behavior, same "Add service opens picker directly" flow.

- [ ] **Step 3: Record sign-off**

If all checks pass, this plan is complete. If any check fails, fix the specific task's code (no
unrelated bundled changes), re-run that task's `node --check`, retest, and commit the fix with a
`fix(QuotationCreateForm): ...` message before continuing.
