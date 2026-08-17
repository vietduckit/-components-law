# Quotation Services Table Design-System Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle and restructure `ServicesTable` in `QuotationCreateForm.js` so it visually and structurally matches `CaseServices.js`'s services table (AntD `Table` + `Table.Summary.Row` + circular icon action buttons + pill badges), without changing any business behavior.

**Architecture:** Add a small, file-local copy of `CaseServices.js`'s design tokens/components to `QuotationCreateForm.js` (Nocobase JS blocks cannot share modules across files), then swap `ServicesTable`'s hand-rolled `<table>` + standalone flex summary bar for `ctx.antd.Table` with column `render` functions and a `Table.Summary.Row`, porting every existing cell's logic and handlers unchanged. The two modals (currency breakdown, catalog comparison) get the same tokens; the breakdown modal's plain `<table>` is also converted to `ctx.antd.Table`.

**Tech Stack:** Nocobase RunJS block (`ctx.React`, `ctx.antd`), no build step, no test framework in this repo.

**Spec:** `docs/superpowers/specs/2026-08-17-quotation-services-table-design-sync.md`

## Global Constraints

- No `fetch()`, no `import`/`require` — this is a single-file RunJS artifact (`All Module/Quotation/QuotationCreateForm.js:67`, file's own AI maintenance manifest).
- Use only `ctx.React`, `ctx.antd`, `React.createElement` — JSX is not used in this file; keep that convention.
- No test framework exists for this file. Verification per task is: (1) `node --check` on the file for syntax validity, and (2) manual QA in the live Nocobase app (open the "Create Quotation" popup and exercise the affected UI), per this repo's CLAUDE.md UI-testing rule. If the engineer has access to the Nocobase Studio code editor's own "lintAndTestJS" action (referenced in the file's own manifest, `:66`) when pasting the change into the live editor, run that too — it is not available outside that editor.
- Do not rename or modify the file's existing `C` token object, `inp()`, `Card`, `CardHeader`, `Grid`, `Field`, `AutoTextarea`, `PriceInput`, `DatePicker`, `LeadDropdown`, `CustomerDropdown`, `LawyerPicker`, `ApprovalSection`, or `ServicePickerModal` — all new tokens/components are additive and separately named.
- Preserve every business behavior listed in the spec's §6 feature-preservation checklist exactly. This is a presentation-only change.
- `ContractCreateForm.js` is out of scope for this plan (Phase 2, deferred).

---

## Task 1: Design tokens, action-button component, and header restyle

**Files:**
- Modify: `All Module/Quotation/QuotationCreateForm.js` (two edits, both inside/around the `ServicesTable` component, currently starting at line 4348)

**Interfaces:**
- Produces (new identifiers, consumed by later tasks): `TABLE_DS` (object: `radius.pill`, `border`, `bg`, `bgSection`, `primary`, `primarySoft`, `danger`), `TABLE_BADGE_STYLE` (style object), `TableSvgDeleteIcon` (component: `{ color, size }`), `TableActionIconButton` (component: `{ title, onClick }`, renders a danger-colored circular icon button wrapped in `Tooltip` when available).

- [ ] **Step 1: Add the design-token/component block above `ServicesTable`**

Open `All Module/Quotation/QuotationCreateForm.js` and find:

```js
// ==================== SERVICES TABLE ====================
const ServicesTable = ({
```

Replace it with:

```js
// ==================== SERVICES TABLE — CASE-STYLE DESIGN TOKENS ====================
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
const ServicesTable = ({
```

- [ ] **Step 2: Restyle the header bar background**

In the same file, find:

```js
    React.createElement(
      "div",
      {
        style: {
          padding: "12px 16px",
          background: "linear-gradient(180deg, #fbfdff 0%, #f5f8fc 100%)",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
      },
```

Replace it with:

```js
    React.createElement(
      "div",
      {
        style: {
          padding: "12px 16px",
          background: TABLE_DS.bgSection,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
      },
```

- [ ] **Step 3: Verify syntax**

Run: `node --check "All Module/Quotation/QuotationCreateForm.js"`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Paste the updated file into the Nocobase "Create Quotation" JS block (or open the live popup if already wired), open "Create Quotation". Confirm:
- The "Service List" header bar shows a flat light-gray background (no diagonal gradient) — everything else (title, "Review Changes"/"Add service" buttons, rows, totals) unchanged.
- No console errors on open.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Quotation/QuotationCreateForm.js"
git commit -m "feat(QuotationCreateForm): add Case-style design tokens, restyle services header"
```

---

## Task 2: Replace the hand-rolled `<table>` with `ctx.antd.Table`

**Files:**
- Modify: `All Module/Quotation/QuotationCreateForm.js` (three edits, all inside `ServicesTable`)

**Interfaces:**
- Consumes: `TABLE_DS`, `TABLE_BADGE_STYLE`, `TableActionIconButton` (Task 1).
- Produces: `Table` (local const, `ctx.antd.Table`, scoped to `ServicesTable`'s body), `quotationServiceColumns` (array, consumed by Task 3's `summary` wiring and structurally required before the component's `return`).

- [ ] **Step 1: Destructure `Table` from `ctx.antd` inside `ServicesTable`**

Find:

```js
}) => {
  const [pickerRowId, setPickerRowId] = useState(null);
```

Replace it with:

```js
}) => {
  const { Table } = ctx.antd;
  const [pickerRowId, setPickerRowId] = useState(null);
```

- [ ] **Step 2: Define `quotationServiceColumns` before the component's `return`**

Find:

```js
  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        opacity: companyId ? 1 : 0.5,
```

Replace it with:

```js
  const quotationServiceColumns = [
    {
      title: "#",
      key: "index",
      width: 50,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Service Name & Type",
      key: "serviceName",
      width: 280,
      render: (_, r) =>
        React.createElement(
          "div",
          {
            onClick: () => setPickerRowId(r._id),
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: `1px solid ${C.border}`,
              borderRadius: 5,
              padding: "5px 10px",
              cursor: "pointer",
              background: "#fff",
              minHeight: 32,
              fontSize: 13.5,
              color: r.serviceId ? C.text : C.textSub,
              lineHeight: "19px",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 3,
                flex: 1,
              },
            },
            React.createElement(
              "span",
              {
                style: {
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                },
              },
              r.serviceName || "— Select service —",
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
                    marginTop: 2,
                  },
                },
                r.serviceType,
              ),
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                color: C.primary,
                marginLeft: 6,
                flexShrink: 0,
              },
            },
            "Select",
          ),
        ),
    },
    {
      title: "Description",
      key: "description",
      width: 320,
      render: (_, r) =>
        React.createElement(AutoTextarea, {
          value: r.description || "",
          onChange: (v) => onUpdate(r._id, "description", v),
          placeholder: "Service scope or row note...",
          minRows: 2,
        }),
    },
    {
      title: "Unit Price",
      key: "basePrice",
      width: 250,
      align: "right",
      render: (_, r) => {
        const rowCurrency =
          findCurrencyById(currencies, r.currencyId) ||
          currencyFromRecord(r, currencies, selectedCurrency);
        if (packageMode) {
          return React.createElement(
            "span",
            {
              style: {
                ...TABLE_BADGE_STYLE,
                background: TABLE_DS.primarySoft,
                color: TABLE_DS.primary,
              },
            },
            "Included in package",
          );
        }
        return React.createElement(
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
              onChange: (e) =>
                onUpdate(r._id, "currencyId", e.target.value || null),
              style: {
                ...inp({ padding: "6px 8px" }),
                cursor: "pointer",
                fontWeight: 700,
                textAlign: "center",
                width: "100%",
              },
              disabled: !currencies.length,
              title: currencySelectLabel(rowCurrency),
            },
            !currencyOptions.some(
              (option) =>
                String(option.value) === String(r.currencyId || ""),
            ) &&
              React.createElement(
                "option",
                { value: "" },
                getCurrencyCode(rowCurrency),
              ),
            ...currencyOptions.map((option) =>
              React.createElement(
                "option",
                { key: option.value, value: option.value },
                option.label,
              ),
            ),
          ),
        );
      },
    },
    {
      title: "VAT %",
      key: "vat",
      width: 88,
      align: "center",
      render: (_, r) => {
        if (packageMode) {
          return React.createElement(
            "span",
            { style: { color: C.textSub, fontSize: 12.5 } },
            "0%",
          );
        }
        return React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 2,
              justifyContent: "center",
            },
          },
          React.createElement("input", {
            type: "number",
            min: 0,
            max: 100,
            step: 1,
            value: r.vat,
            onChange: (e) =>
              onUpdate(r._id, "vat", parseFloat(e.target.value) || 0),
            style: {
              border: `1px solid ${C.border}`,
              borderRadius: 5,
              padding: "5px 4px",
              fontSize: 13.5,
              outline: "none",
              textAlign: "right",
              width: 46,
              fontFamily: FONT,
            },
          }),
          React.createElement(
            "span",
            { style: { fontSize: 12, color: C.textSub } },
            "%",
          ),
        );
      },
    },
    {
      title: "Total",
      key: "total",
      width: 180,
      align: "right",
      render: (_, r) => {
        const rowCurrency =
          findCurrencyById(currencies, r.currencyId) ||
          currencyFromRecord(r, currencies, selectedCurrency);
        const line = packageMode
          ? calcLine(0, 1, 0)
          : calcLine(r.basePrice, 1, r.vat);
        const rowConversion = !packageMode
          ? getRowConversion(rowCurrency, line)
          : null;
        if (packageMode) return "—";
        if (rowConversion?.canConvert) {
          return React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 2,
              },
            },
            React.createElement(
              "span",
              null,
              formatMoneyByCurrency(
                rowConversion.sameCurrency
                  ? line.totalAmount
                  : rowConversion.totalAmount,
                baseCurrency,
              ),
            ),
            !rowConversion.sameCurrency &&
              React.createElement(
                "span",
                {
                  style: {
                    color: C.textSub,
                    fontSize: 10.5,
                    fontWeight: 600,
                  },
                },
                `Gốc: ${formatMoneyByCurrency(line.totalAmount, rowCurrency)}`,
              ),
          );
        }
        return React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 2,
            },
          },
          React.createElement(
            "span",
            null,
            formatMoneyByCurrency(line.totalAmount, rowCurrency),
          ),
          React.createElement(
            "span",
            {
              style: {
                color: "#d48806",
                fontSize: 10.5,
                fontWeight: 700,
              },
            },
            `Thiếu tỷ giá → ${getCurrencyCode(baseCurrency)}`,
          ),
        );
      },
    },
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

  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        opacity: companyId ? 1 : 0.5,
```

- [ ] **Step 3: Replace the `<table>` markup with `ctx.antd.Table`**

Locate the block that starts right after the pricing-mode/currency grid (unique start marker below) and ends right before the blank line + `rows.length > 0 &&` line (unique end marker below) — this is the entire hand-rolled `<table>...</table>` structure (currently `QuotationCreateForm.js:5231-5682`, before this task's earlier edits shifted line numbers).

Start marker:
```js
    React.createElement(
      "div",
      { style: { overflowX: "auto" } },
      React.createElement(
        "table",
        {
          style: {
            width: "100%",
            borderCollapse: "collapse",
            minWidth: packageMode ? 700 : 930,
          },
        },
```

End marker (the closing of that same block, immediately before `rows.length > 0 &&`):
```js
              }),
        ),
      ),
    ),

    rows.length > 0 &&
```

Replace everything from the start marker through the `),\n      ),\n    ),` that closes the `<table>` wrapper (keep the blank line and `rows.length > 0 &&` — those belong to the next block, untouched by this task) with:

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
      }),
    ),

    rows.length > 0 &&
```

- [ ] **Step 4: Verify syntax**

Run: `node --check "All Module/Quotation/QuotationCreateForm.js"`
Expected: no output, exit code 0.

- [ ] **Step 5: Manual verification**

Open "Create Quotation" in the browser. Confirm:
- The service rows render as an AntD table (rounded header cells, striped/hover row background from AntD's default `Table`).
- Clicking the "Service Name & Type" cell still opens the service picker modal and selecting a service still fills the row.
- Typing in Description, Unit Price, VAT % still updates the row (no lost keystrokes/focus jumps while typing).
- Switching currency per row still works.
- Toggling "Package pricing" shows the "Included in package" pill badge in the Unit Price column and "0%" in VAT.
- The Total column still shows the converted amount + "Gốc: ..." secondary line for cross-currency rows, and the "Thiếu tỷ giá → ..." warning for unconvertible rows.
- The delete button is now a circular icon button (danger/red) with a tooltip "Delete row", and still removes the row when clicked.
- The summary bar below the table still renders correctly (it is untouched by this task — Task 3 restyles it).

- [ ] **Step 6: Commit**

```bash
git add "All Module/Quotation/QuotationCreateForm.js"
git commit -m "feat(QuotationCreateForm): rebuild services row table on ctx.antd.Table"
```

---

## Task 3: Replace the standalone summary bar with `Table.Summary.Row`

**Files:**
- Modify: `All Module/Quotation/QuotationCreateForm.js` (two edits, both inside `ServicesTable`)

**Interfaces:**
- Consumes: `Table` (Task 2), `quotationServiceColumns` (Task 2, for column-index alignment: index 0 = `#`+Service Name+Description merged via `colSpan: 3`, index 3 = Unit Price, index 4 = VAT %, index 5 = Total, index 6 = Action).
- Produces: `renderQuotationServicesSummary` (function, wired into the `Table`'s `summary` prop in this same task).

- [ ] **Step 1: Define `renderQuotationServicesSummary` before the component's `return`**

Find:

```js
  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        opacity: companyId ? 1 : 0.5,
```

Replace it with:

```js
  const renderQuotationServicesSummary = () =>
    rows.length > 0
      ? React.createElement(
          Table.Summary.Row,
          null,
          React.createElement(
            Table.Summary.Cell,
            { index: 0, colSpan: 3 },
            !packageMode &&
              (hasMixedCurrencies || needsConversion) &&
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setBreakdownOpen(true),
                  style: {
                    border: `1px solid ${C.borderFocus}`,
                    background: C.bgHighlight,
                    color: C.primary,
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontFamily: FONT,
                    cursor: "pointer",
                  },
                },
                `Xem quy đổi tiền tệ (${financialSummary.groups.length} loại)`,
              ),
            !packageMode &&
              !canShowTotals &&
              React.createElement(
                "div",
                {
                  style: {
                    marginTop: 8,
                    color: "#d48806",
                    background: "#fffbe6",
                    border: "1px solid #ffe58f",
                    borderRadius: 6,
                    padding: "8px 11px",
                    fontSize: 12,
                    fontFamily: FONT,
                    maxWidth: 320,
                  },
                },
                `Thiếu tỷ giá quy đổi (${formatMissingRatePairs(financialSummary.missing, baseCurrency)}) — tổng báo giá chưa được cập nhật chính xác.`,
              ),
          ),
          React.createElement(
            Table.Summary.Cell,
            { index: 3, align: "right" },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: C.textSub,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  marginBottom: 4,
                  fontFamily: FONT,
                },
              },
              packageMode ? "Package Subtotal" : "Subtotal (excl. VAT)",
            ),
            packageMode
              ? React.createElement(PriceInput, {
                  value: packageSubTotal,
                  onChange: (v) => onPackageChange("packageSubTotal", v),
                })
              : React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 14,
                      color: C.text,
                      fontWeight: 700,
                      fontFamily: FONT_MONO,
                    },
                  },
                  canShowTotals
                    ? formatMoneyByCurrency(
                        financialSummary.converted.subTotal,
                        baseCurrency,
                      )
                    : "—",
                ),
          ),
          React.createElement(
            Table.Summary.Cell,
            { index: 4, align: "center" },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: C.textSub,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  marginBottom: 4,
                  fontFamily: FONT,
                },
              },
              "VAT",
            ),
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 14,
                  color: "#d48806",
                  fontWeight: 700,
                  fontFamily: FONT_MONO,
                },
              },
              packageMode
                ? formatMoneyByCurrency(packageTotals.vatAmount, baseCurrency)
                : canShowTotals
                  ? formatMoneyByCurrency(
                      financialSummary.converted.vatAmount,
                      baseCurrency,
                    )
                  : "—",
            ),
            packageMode &&
              React.createElement("input", {
                type: "number",
                min: 0,
                max: 100,
                step: 0.1,
                value: packageVatRate,
                onChange: (e) =>
                  onPackageChange(
                    "packageVatRate",
                    parseFloat(e.target.value) || 0,
                  ),
                style: inp({
                  textAlign: "right",
                  padding: "4px 6px",
                  marginTop: 4,
                  width: 80,
                }),
                onFocus,
                onBlur,
              }),
          ),
          React.createElement(
            Table.Summary.Cell,
            { index: 5, align: "right" },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: C.textSub,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  marginBottom: 4,
                  fontFamily: FONT,
                },
              },
              packageMode ? "Package Total" : "Total",
            ),
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 16,
                  color: "#1d4ed8",
                  fontWeight: 700,
                  fontFamily: FONT_MONO,
                },
              },
              packageMode
                ? formatMoneyByCurrency(
                    packageTotals.totalAmount,
                    baseCurrency,
                  )
                : canShowTotals
                  ? formatMoneyByCurrency(
                      financialSummary.converted.totalAmount,
                      baseCurrency,
                    )
                  : "—",
            ),
          ),
          React.createElement(Table.Summary.Cell, { index: 6 }),
        )
      : null;

  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        opacity: companyId ? 1 : 0.5,
```

- [ ] **Step 2: Wire `summary` into the `Table` call and delete the old flex summary bar**

Find:

```js
      React.createElement(Table, {
        dataSource: rows,
        columns: quotationServiceColumns,
        rowKey: "_id",
        pagination: false,
        size: "middle",
        bordered: false,
        scroll: { x: "max-content" },
        locale: { emptyText: 'No services added - click "Add row"' },
      }),
    ),

    rows.length > 0 &&
      React.createElement(
        "div",
        {
          style: {
            borderTop: `2px solid ${C.border}`,
```

This is the start of the block to change (it continues through the entire old flex summary bar). Replace the `Table` call's props to add `summary`, and delete the old standalone summary block entirely, down to its matching close (immediately before the blank line + `React.createElement(\n      Modal,\n      {\n        title: "Quy đổi tiền tệ dịch vụ",` — leave that `Modal` block untouched, it belongs to Task 4).

New content for this whole region:

```js
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

(i.e., the old `rows.length > 0 && React.createElement("div", { style: { borderTop: ... } }, ...)` flex summary bar — everything that used to follow the table wrapper — is removed, since its content now lives inside `renderQuotationServicesSummary` from Step 1.)

- [ ] **Step 3: Verify syntax**

Run: `node --check "All Module/Quotation/QuotationCreateForm.js"`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Open "Create Quotation", add at least 2 service rows. Confirm:
- A totals row now appears as the table's own footer row (inside the table's border), not a separate box below it.
- Left region of that row shows the "Xem quy đổi tiền tệ (N loại)" button when rows use more than one currency, and the "Thiếu tỷ giá quy đổi (...)" warning when a rate is missing — both behave exactly as before.
- Subtotal / VAT / Total cells show correct values; in package mode, Subtotal and VAT-rate are editable inputs and edits still update `form.packageSubTotal`/`form.packageVatRate` (verify by toggling package mode, typing a new subtotal, and confirming the Total cell updates accordingly).
- Clicking "Xem quy đổi tiền tệ" still opens the breakdown modal with correct data.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Quotation/QuotationCreateForm.js"
git commit -m "feat(QuotationCreateForm): move services totals into Table.Summary.Row"
```

---

## Task 4: Convert the currency-breakdown modal's table to `ctx.antd.Table`

**Files:**
- Modify: `All Module/Quotation/QuotationCreateForm.js` (two edits, both inside `ServicesTable`)

**Interfaces:**
- Consumes: `Table` (Task 2), `isSameCurrency`, `pickConversionRate`, `getCurrencyCode`, `formatMoneyByCurrency` (pre-existing top-level helpers), `baseCurrency`, `exchangeRates`, `financialSummary` (pre-existing `ServicesTable` locals).
- Produces: `getBreakdownGroupRate` (function, local to `ServicesTable`).

- [ ] **Step 1: Add `getBreakdownGroupRate` before the component's `return`**

Find:

```js
  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        opacity: companyId ? 1 : 0.5,
```

Replace it with:

```js
  const getBreakdownGroupRate = (group) => {
    const sameBase = isSameCurrency(group.currency, baseCurrency);
    const matched = sameBase
      ? { rate: 1 }
      : pickConversionRate(exchangeRates, group.currency, baseCurrency);
    return matched?.rate || null;
  };

  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        opacity: companyId ? 1 : 0.5,
```

- [ ] **Step 2: Replace the breakdown modal's `<table>` with `ctx.antd.Table`**

Find (the breakdown modal's table body, starting right after its `Modal` props/footer close):

```js
      breakdownOpen &&
        React.createElement(
          "table",
          { style: { width: "100%", borderCollapse: "collapse" } },
          React.createElement(
            "thead",
```

... this block continues for the full `<thead>`/`<tbody>` down to its matching close:

```js
              );
            }),
          ),
        ),
    ),
```

(the final `),` in that snippet closes the outer `Modal` call — leave it in place; only the `breakdownOpen && React.createElement("table", ...)` part is replaced).

Replace the entire `breakdownOpen && React.createElement("table", ...)` expression (from `breakdownOpen &&` through the `),` that closes that `React.createElement("table", ...)` call, i.e. everything except the final `),` that closes `Modal`) with:

```js
      breakdownOpen &&
        React.createElement(Table, {
          dataSource: financialSummary.groups.map((group, idx) => ({
            ...group,
            _key: idx,
          })),
          rowKey: "_key",
          pagination: false,
          size: "small",
          bordered: true,
          columns: [
            {
              title: "Tiền tệ",
              key: "currency",
              render: (_, group) =>
                React.createElement(
                  "span",
                  { style: { fontWeight: 700 } },
                  getCurrencyCode(group.currency),
                ),
            },
            {
              title: "Số dòng",
              key: "lineCount",
              align: "center",
              render: (_, group) => group.lineCount,
            },
            {
              title: "Tổng gốc",
              key: "originalTotal",
              align: "right",
              render: (_, group) =>
                formatMoneyByCurrency(group.totalAmount, group.currency),
            },
            {
              title: "Tỷ giá",
              key: "rate",
              align: "center",
              render: (_, group) => {
                const rate = getBreakdownGroupRate(group);
                return rate
                  ? rate.toLocaleString("en-US", { maximumFractionDigits: 6 })
                  : React.createElement(
                      "span",
                      { style: { color: C.danger } },
                      "Thiếu",
                    );
              },
            },
            {
              title: "Quy đổi",
              key: "converted",
              align: "right",
              render: (_, group) => {
                const rate = getBreakdownGroupRate(group);
                return rate
                  ? React.createElement(
                      "span",
                      { style: { fontWeight: 700, color: "#1d4ed8" } },
                      formatMoneyByCurrency(
                        group.totalAmount * rate,
                        baseCurrency,
                      ),
                    )
                  : React.createElement(
                      "span",
                      { style: { color: C.danger } },
                      "—",
                    );
              },
            },
          ],
        }),
    ),
```

- [ ] **Step 3: Verify syntax**

Run: `node --check "All Module/Quotation/QuotationCreateForm.js"`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Add rows in 2+ different currencies (e.g. one VND row, one USD row) so the "Xem quy đổi tiền tệ" button appears; click it. Confirm:
- The breakdown modal now renders as a bordered AntD table (rounded header, visible outer border) instead of a plain spreadsheet-style table.
- Rows show currency, line count, original total, rate, and converted total exactly as before.
- A currency with no available exchange rate shows "Thiếu" in the rate column and "—" in the converted column, styled in red — same as before.
- Closing the modal ("Đóng") still works.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Quotation/QuotationCreateForm.js"
git commit -m "feat(QuotationCreateForm): rebuild currency-breakdown modal table on ctx.antd.Table"
```

---

## Task 5: End-to-end manual QA and sign-off

**Files:** none (verification only; fix-forward commits only if QA finds a regression).

- [ ] **Step 1: Full flow QA in the browser**

Open "Create Quotation" (fresh popup) and walk through, per spec §8:
1. Select an Internal Issuing Company, a customer, add 2+ service rows with different currencies.
2. Confirm subtotal/VAT/total conversion and the "Thiếu tỷ giá" banner behave exactly as before this plan's changes (compare against the spec's §3 "Current state" description if in doubt).
3. Toggle "Package pricing" on: confirm the badge, the package Subtotal/VAT-rate/Total summary-cell inputs, and toggling back to "Line pricing" restores the previous per-row prices (via `lineModeBackupRef`).
4. Open the "Xem quy đổi tiền tệ" breakdown modal and the "Review Changes" compare modal (both list and per-row detail view) — confirm both open, show correct data, and close correctly. The compare modal already used `ctx.antd.Table`/`Tag` before this plan and needs no code change — confirm visually it already reads consistently with the rest of the restyled table (same border/radius/font); if it visibly clashes, note it as a follow-up rather than expanding this plan's scope.
5. Delete a row via the new circular delete button.
6. Submit the quotation successfully end-to-end (quotation + quotation services created, no console errors).

- [ ] **Step 2: Visual comparison against `CaseServices.js`**

Open Case → Services tab side by side (or in two tabs) with the Quotation form. Confirm the services table's header, badges, action buttons, and totals row read as the same design language (not pixel-identical, since the two tables have different columns/features — but the same tokens, radius, and component patterns).

- [ ] **Step 3: Record sign-off**

If all checks in Steps 1-2 pass, this plan is complete. If any check fails, fix the specific task's code (do not bundle unrelated changes), re-run that task's `node --check`, retest, and commit the fix with a `fix(QuotationCreateForm): ...` message before continuing.
