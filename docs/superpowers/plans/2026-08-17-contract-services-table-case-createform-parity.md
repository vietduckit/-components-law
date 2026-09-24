# Contract Services Table — Case-CreateForm Parity (Phase B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `ContractCreateForm.js`'s `ManualContractServicesSection` to the same
visual/interaction pattern as `CaseCreateForm.js` and (now-completed) `QuotationCreateForm.js`:
hand-rolled `<table>`, STT row numbering, per-row pencil edit-toggle, square icon-action-buttons,
"Add service" opens the picker directly and always appends a new row, and a 2-tab picker header.

**Architecture:** Same recipe as the Quotation plan
(`docs/superpowers/plans/2026-08-17-services-table-case-createform-parity.md`), applied to
`All Module/Contract/ContractCreateForm.js`'s `ManualContractServicesSection` (currently
lines 4627-6452) and its parent wiring in `ContractCreateForm`. One behavioral difference from
Quotation, confirmed with the user: when a contract's services are linked 1:1 from a Case
(`readOnlyServices=true`), the **entire row becomes display-only** — no pencil button renders at
all, and the now-unused `updateCaseServiceLineRow` update path is removed. This is a deliberate
behavior change (previously price/VAT/description/currency stayed editable even when
`readOnlyServices` was true); the user chose this explicitly after being told it narrows existing
capability.

**Tech Stack:** Nocobase RunJS (`React.createElement`, `ctx.antd`), no JSX, no imports — same
single-file constraint as every other file in this repo.

**Spec:** `docs/superpowers/specs/2026-08-17-services-table-case-createform-parity-design.md`
(§10 anticipated this Phase B follow-up; its §3-§7 design principles — table structure, edit-toggle
mechanics, icon-button style — apply here unchanged). No separate Phase-B spec file was written;
the two behavioral deltas from Quotation (readOnlyServices → fully-locked rows; price+currency
merged into one row, same as the Quotation QA fix) were confirmed directly with the user in chat
before this plan was written.

## Global Constraints

- `RetainerScheduleSection` (line 6689) and `PaymentScheduleSection` (line 6453) are separate,
  unrelated components — do not touch them. `ManualContractServicesSection` renders
  unconditionally regardless of `contractType`; retainer-specific logic lives entirely in those
  other two sections.
- `ServiceLinesSection` (line 4001) is defined but never rendered anywhere in the file (confirmed
  via grep) — dead code, not in scope, leave it alone.
- Contract has no "Review Changes"/catalog-compare modal (unlike Quotation) — nothing to add or
  touch there.
- Preserve the `readOnlyServices` / `showAddRow` / `allowDelete` prop contract from the parent
  call site unchanged in shape (same prop names), only their wiring/semantics inside the
  component changes.
- Preserve `syncManualLineTotals` being called after every row mutation (add/update/delete) when
  not in package mode — this recalculates the contract's `subTotal`/`vatAmount`/`totalAmount`/
  `fixedAmount` from `manualServiceRows`.
- Reuse existing icons (`EditIcon`, `CheckIcon`, `TrashIcon`, already defined at lines 3904-3975)
  instead of adding new ones — Contract already has a pencil/check icon pair that Quotation had to
  build from scratch.
- Reuse existing input primitives (`TextInput`, `MoneyInput`, `PercentInput`, `TextArea`,
  `inputStyle`) instead of Quotation's `AutoTextarea`/`PriceInput`/`inp()` — this file already has
  its own equivalents.

---

## Task 1: Add `iconButtonStyle` + `ExpandableText` helpers

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js` (insert before line 4627, i.e. immediately
  before `const ManualContractServicesSection = ({`)

**Interfaces:**
- Produces: `iconButtonStyle(color, active = false)` → style object for a 28x28 square icon
  button. `ExpandableText({ text, limit = 100 })` → component for truncated read-only description
  cells.
- Consumes: `C.border`, `C.primary` (existing tokens).

- [ ] **Step 1: Insert the two helpers**

Find (exact start of the component to insert before):

```js
const ManualContractServicesSection = ({
```

Insert immediately before it:

```js
// ==================== SERVICES TABLE — CASE-STYLE ICON BUTTONS ====================
// Ported from CaseCreateForm.js's services table (see
// docs/superpowers/specs/2026-08-17-services-table-case-createform-parity-design.md) — square,
// bordered icon buttons for the per-row edit-toggle and delete actions, and a minimal
// truncate/expand text component for read-only descriptions. Reuses this file's own
// EditIcon/CheckIcon/TrashIcon (already defined above) rather than adding new icon components.
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

const ManualContractServicesSection = ({
```

- [ ] **Step 2: Verify syntax**

Run: `node --check "All Module/Contract/ContractCreateForm.js"`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add "All Module/Contract/ContractCreateForm.js"
git commit -m "feat(ContractCreateForm): add Case-style icon-button/expandable-text helpers"
```

---

## Task 2: Parent-level row-add functions — append-only, remove dead read-only update path

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js`:
  - Delete `updateCaseServiceLineRow` (currently lines 8349-8378)
  - Delete `addManualServiceRow` (currently lines 8979-8989)
  - Replace `selectManualService` (currently lines 9009-9099) with `addManualServiceRowFromCatalog`
  - Replace `createManualContractServiceDraft` (currently lines 9101-9169) with
    `addManualServiceRowFromDraft`
  - Update the `ManualContractServicesSection` call site (currently lines 10449-10483)

**Interfaces:**
- Produces: `addManualServiceRowFromCatalog(serviceId, serviceOverride = null)` → returns
  `true`/`false`, appends a new row to `manualServiceRows` on success. `addManualServiceRowFromDraft(data)`
  → same shape, for ad-hoc "Create new service" data.
- Consumes (Task 3): these two functions become the new `onSelectService`/`onCreateManualService`
  props — Task 3 rewires `ManualContractServicesSection` to call them with `(serviceId, service)` /
  `(data)` instead of `(rowId, serviceId, service)` / `(rowId, data)`.

- [ ] **Step 1: Delete `updateCaseServiceLineRow`**

Find:

```js
  const updateCaseServiceLineRow = (rowId, field, value) => {
    let nextLines = [];
    setServiceLines((prev) => {
      nextLines = prev.map((line) => {
        if (String(line.projectServiceId) !== String(rowId)) return line;
        const next = { ...line, [field]: value };
        if (field === "basePrice" || field === "vat") {
          const basePrice =
            field === "basePrice" ? parseNum(value) : parseNum(line.basePrice);
          const vat = field === "vat" ? parseNum(value) : parseNum(line.vat);
          const amounts = resolveServiceAmounts({
            basePrice,
            quantity: line.quantity || 1,
            vat,
          });
          return {
            ...next,
            basePrice: amounts.basePrice,
            vat: amounts.vat,
            subTotal: amounts.subTotal,
            vatAmount: amounts.vatAmount,
            totalAmount: amounts.totalAmount,
          };
        }
        return next;
      });
      return nextLines;
    });
    setTimeout(() => applyServiceSelection(selectedServiceIds, nextLines), 0);
  };

  const removeCaseServiceLineRow = (rowId) => {
```

Replace with:

```js
  const removeCaseServiceLineRow = (rowId) => {
```

- [ ] **Step 2: Replace `addManualServiceRow` + `selectManualService` with `addManualServiceRowFromCatalog`**

Find:

```js
  const addManualServiceRow = () => {
    setManualServiceRows((prev) => [
      ...prev,
      {
        ...newManualServiceRow(),
        currencyId: extractCurrencyId(selectedCurrency)
          ? String(extractCurrencyId(selectedCurrency))
          : "",
      },
    ]);
  };

  const deleteManualServiceRow = (rowId) => {
    setManualServiceRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
  };

  const updateManualServiceRow = (rowId, field, value) => {
    setManualServiceRows((prev) => {
      const next = prev.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row,
      );
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
  };

  const selectManualService = (rowId, serviceId, serviceOverride = null) => {
    const service =
      serviceOverride ||
      filteredServiceOptions.find(
        (item) => String(serviceOptionServiceId(item)) === String(serviceId),
      );
    if (serviceId && !service) {
      message.warning("Selected service was not found in catalog.");
      return;
    }
    if (
      serviceId &&
      manualServiceRows.some(
        (row) =>
          row.id !== rowId && String(row.serviceId) === String(serviceId),
      )
    ) {
      message.warning("This service is already selected in another row.");
      return;
    }
    setManualServiceRows((prev) => {
      const next = prev.map((row) => {
        if (row.id !== rowId) return row;
        if (!serviceId) {
          return {
            ...row,
            serviceId: "",
            serviceName: "",
            serviceType: "",
            description: "",
            currencyId: extractCurrencyId(selectedCurrency)
              ? String(extractCurrencyId(selectedCurrency))
              : "",
            basePrice: "",
          };
        }
        const serviceCurrency = currencyFromRecord(
          service,
          currencies,
          selectedCurrency,
        );
        const serviceCurrencyId =
          extractCurrencyId(serviceCurrency) ||
          getRecordCurrencyId(service) ||
          extractCurrencyId(selectedCurrency);
        if (
          !extractCurrencyId(serviceCurrency) &&
          !getRecordCurrencyId(service)
        ) {
          console.warn(
            "[ContractCreateForm] Could not resolve a real currencyId for this service (falling back to contract currency). Raw service fields:",
            {
              serviceId: extractId(service?.id),
              serviceKeys: Object.keys(service || {}),
              currency: service?.currency,
              currencies: service?.currencies,
              currencyId: service?.currencyId,
              currencyCode: service?.currencyCode,
              defaultCurrencyId: service?.defaultCurrencyId,
              defaultCurrency: service?.defaultCurrency,
              basePrice: service?.basePrice,
              price: service?.price,
              unitPrice: service?.unitPrice,
              resolvedServiceCurrency: serviceCurrency,
              availableCurrencies: (currencies || []).map((c) => ({
                id: c?.id,
                code: getCurrencyCode(c),
              })),
            },
          );
        }
        return {
          ...row,
          serviceId: String(serviceId),
          serviceName: serviceCatalogName(service),
          serviceType: serviceCatalogType(service),
          description: row.description || serviceCatalogDescription(service),
          currencyId: serviceCurrencyId
            ? String(serviceCurrencyId)
            : row.currencyId,
          basePrice:
            form.pricingMode === "package"
              ? ""
              : String(serviceCatalogPrice(service) || ""),
          vat: form.pricingMode === "package" ? "0" : row.vat || "8",
        };
      });
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
  };
```

Replace with:

```js
  const deleteManualServiceRow = (rowId) => {
    setManualServiceRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
  };

  const updateManualServiceRow = (rowId, field, value) => {
    setManualServiceRows((prev) => {
      const next = prev.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row,
      );
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
  };

  // Mirrors QuotationCreateForm.js's addRowFromService: the picker only ever adds a
  // brand-new row (never re-picks an existing row's service).
  const addManualServiceRowFromCatalog = (serviceId, serviceOverride = null) => {
    const service =
      serviceOverride ||
      filteredServiceOptions.find(
        (item) => String(serviceOptionServiceId(item)) === String(serviceId),
      );
    if (serviceId && !service) {
      message.warning("Selected service was not found in catalog.");
      return false;
    }
    if (
      serviceId &&
      manualServiceRows.some(
        (row) => String(row.serviceId) === String(serviceId),
      )
    ) {
      message.warning("This service is already selected in another row.");
      return false;
    }
    const serviceCurrency = currencyFromRecord(
      service,
      currencies,
      selectedCurrency,
    );
    const serviceCurrencyId =
      extractCurrencyId(serviceCurrency) ||
      getRecordCurrencyId(service) ||
      extractCurrencyId(selectedCurrency);
    if (!extractCurrencyId(serviceCurrency) && !getRecordCurrencyId(service)) {
      console.warn(
        "[ContractCreateForm] Could not resolve a real currencyId for this service (falling back to contract currency). Raw service fields:",
        {
          serviceId: extractId(service?.id),
          serviceKeys: Object.keys(service || {}),
          currency: service?.currency,
          currencies: service?.currencies,
          currencyId: service?.currencyId,
          currencyCode: service?.currencyCode,
          defaultCurrencyId: service?.defaultCurrencyId,
          defaultCurrency: service?.defaultCurrency,
          basePrice: service?.basePrice,
          price: service?.price,
          unitPrice: service?.unitPrice,
          resolvedServiceCurrency: serviceCurrency,
          availableCurrencies: (currencies || []).map((c) => ({
            id: c?.id,
            code: getCurrencyCode(c),
          })),
        },
      );
    }
    const newRow = {
      ...newManualServiceRow(),
      serviceId: String(serviceId),
      serviceName: serviceCatalogName(service),
      serviceType: serviceCatalogType(service),
      description: serviceCatalogDescription(service),
      currencyId: serviceCurrencyId ? String(serviceCurrencyId) : "",
      basePrice:
        form.pricingMode === "package"
          ? ""
          : String(serviceCatalogPrice(service) || ""),
      vat: form.pricingMode === "package" ? "0" : "8",
    };
    setManualServiceRows((prev) => {
      const next = [...prev, newRow];
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
    return true;
  };
```

- [ ] **Step 3: Replace `createManualContractServiceDraft` with `addManualServiceRowFromDraft`**

Find:

```js
  const createManualContractServiceDraft = (rowId, data) => {
    const serviceName = String(data?.serviceName || "").trim();
    if (!serviceName) {
      message.warning("Please enter service name.");
      return null;
    }
    const existsInCatalog = filteredServiceOptions.find(
      (item) =>
        normalizeSearch(serviceCatalogName(item)) ===
        normalizeSearch(serviceName),
    );
    if (existsInCatalog) {
      message.warning(
        "This service already exists in the catalog. Please select it instead.",
      );
      return null;
    }
    const existsInRows = manualServiceRows.find(
      (row) =>
        row.id !== rowId &&
        normalizeSearch(row.serviceName) === normalizeSearch(serviceName),
    );
    if (existsInRows) {
      message.warning("This service is already added in another row.");
      return null;
    }
    if (parseNum(data?.basePrice) <= 0) {
      message.warning("Please enter unit price greater than 0.");
      return null;
    }
    if (currencyOptions.length && !extractCurrencyId(data?.currencyId)) {
      message.warning("Please select service currency.");
      return null;
    }

    const draft = {
      serviceName,
      serviceType: String(data?.serviceType || "").trim() || null,
      currencyId:
        getRecordCurrencyId(data) ||
        extractCurrencyId(selectedCurrency) ||
        null,
      basePrice: String(parseNum(data?.basePrice) || ""),
      description: String(data?.description || "").trim(),
    };

    setManualServiceRows((prev) => {
      const next = prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          serviceId: "",
          serviceName: draft.serviceName,
          serviceType: draft.serviceType || "",
          description: draft.description,
          currencyId: draft.currencyId
            ? String(draft.currencyId)
            : row.currencyId,
          basePrice: draft.basePrice,
          quantity: row.quantity || "1",
          vat: row.vat || "8",
        };
      });
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
    message.success("Service row added.");
    return draft;
  };
```

Replace with:

```js
  const addManualServiceRowFromDraft = (data) => {
    const serviceName = String(data?.serviceName || "").trim();
    if (!serviceName) {
      message.warning("Please enter service name.");
      return false;
    }
    const existsInCatalog = filteredServiceOptions.find(
      (item) =>
        normalizeSearch(serviceCatalogName(item)) ===
        normalizeSearch(serviceName),
    );
    if (existsInCatalog) {
      message.warning(
        "This service already exists in the catalog. Please select it instead.",
      );
      return false;
    }
    const existsInRows = manualServiceRows.find(
      (row) => normalizeSearch(row.serviceName) === normalizeSearch(serviceName),
    );
    if (existsInRows) {
      message.warning("This service is already added in another row.");
      return false;
    }
    if (parseNum(data?.basePrice) <= 0) {
      message.warning("Please enter unit price greater than 0.");
      return false;
    }
    if (currencyOptions.length && !extractCurrencyId(data?.currencyId)) {
      message.warning("Please select service currency.");
      return false;
    }

    const draft = {
      serviceName,
      serviceType: String(data?.serviceType || "").trim() || null,
      currencyId:
        getRecordCurrencyId(data) ||
        extractCurrencyId(selectedCurrency) ||
        null,
      basePrice: String(parseNum(data?.basePrice) || ""),
      description: String(data?.description || "").trim(),
    };
    const newRow = {
      ...newManualServiceRow(),
      serviceId: "",
      serviceName: draft.serviceName,
      serviceType: draft.serviceType || "",
      description: draft.description,
      currencyId: draft.currencyId ? String(draft.currencyId) : "",
      basePrice: draft.basePrice,
      quantity: "1",
      vat: "8",
    };
    setManualServiceRows((prev) => {
      const next = [...prev, newRow];
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
    message.success("Service row added.");
    return true;
  };
```

- [ ] **Step 4: Update the `ManualContractServicesSection` call site**

Find:

```js
              React.createElement(ManualContractServicesSection, {
                rows: serviceLines.length
                  ? caseServiceEditorRows
                  : manualServiceRows,
                services: filteredServiceOptions,
                pricingMode: form.pricingMode,
                packageVatRate: form.packageVatRate,
                packageTotals,
                currencies: currencies,
                currencyOptions: currencyOptions,
                selectedCurrency: selectedCurrency,
                readOnlyServices: !!serviceLines.length,
                showAddRow: !serviceLines.length,
                allowDelete:
                  !serviceLines.length || selectedServiceIds.length > 1,
                onPricingModeChange: handleManualPricingModeChange,
                onPackageSubTotalChange: (value) =>
                  syncPackageTotals(value, form.packageVatRate),
                onPackageVatRateChange: (value) =>
                  syncPackageTotals(form.subTotal || form.fixedAmount, value),
                onAddRow: serviceLines.length ? undefined : addManualServiceRow,
                onDeleteRow: serviceLines.length
                  ? removeCaseServiceLineRow
                  : deleteManualServiceRow,
                onUpdateRow: serviceLines.length
                  ? updateCaseServiceLineRow
                  : updateManualServiceRow,
                onSelectService: serviceLines.length
                  ? undefined
                  : selectManualService,
                onCreateManualService: serviceLines.length
                  ? undefined
                  : createManualContractServiceDraft,
                onCurrencyChange: (value) => setF("currencyId", value || null),
              }),
```

Replace with:

```js
              React.createElement(ManualContractServicesSection, {
                rows: serviceLines.length
                  ? caseServiceEditorRows
                  : manualServiceRows,
                services: filteredServiceOptions,
                pricingMode: form.pricingMode,
                packageVatRate: form.packageVatRate,
                packageTotals,
                currencies: currencies,
                currencyOptions: currencyOptions,
                selectedCurrency: selectedCurrency,
                readOnlyServices: !!serviceLines.length,
                showAddRow: !serviceLines.length,
                allowDelete:
                  !serviceLines.length || selectedServiceIds.length > 1,
                onPricingModeChange: handleManualPricingModeChange,
                onPackageSubTotalChange: (value) =>
                  syncPackageTotals(value, form.packageVatRate),
                onPackageVatRateChange: (value) =>
                  syncPackageTotals(form.subTotal || form.fixedAmount, value),
                onDeleteRow: serviceLines.length
                  ? removeCaseServiceLineRow
                  : deleteManualServiceRow,
                onUpdateRow: serviceLines.length ? undefined : updateManualServiceRow,
                onSelectService: serviceLines.length
                  ? undefined
                  : addManualServiceRowFromCatalog,
                onCreateManualService: serviceLines.length
                  ? undefined
                  : addManualServiceRowFromDraft,
                onCurrencyChange: (value) => setF("currencyId", value || null),
              }),
```

- [ ] **Step 5: Verify syntax**

Run: `node --check "All Module/Contract/ContractCreateForm.js"`
Expected: no output, exit code 0. Note: at this point `ManualContractServicesSection` itself still
references the old `pickerRowId`/`currentRow`/`onAddRow` internally — this is expected, syntax is
still valid JS, just not yet functionally consistent. Task 3 fixes this. Do not manually test in
the browser until Task 4 is also done — do not commit yet either (fold this into Task 3's commit).

---

## Task 3: `ManualContractServicesSection` — picker state, add-only handlers, simplified catalog list

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js` (inside `ManualContractServicesSection`,
  currently lines 4627-6452)

**Interfaces:**
- Consumes: `onSelectService(serviceId, service)`, `onCreateManualService(data)` from Task 2 (no
  more leading `rowId` argument).
- Produces: local `pickerOpen`/`setPickerOpen`, `editingRows`/`setEditingRows`/`toggleRowEdit` —
  Task 4's table markup reads these.

- [ ] **Step 1: Replace `pickerRowId` state with `pickerOpen` + `editingRows`, drop `currentRow`**

Find:

```js
  const [pickerRowId, setPickerRowId] = useState(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState({
    serviceName: "",
    serviceType: "",
    currencyId: "",
    basePrice: "",
    description: "",
  });
  const [createError, setCreateError] = useState("");
  const packageMode = pricingMode === "package";
  const actionColumn = allowDelete ? " 52px" : "";
  const columns = `minmax(260px, 1.2fr) minmax(300px, 1.45fr) minmax(190px, 0.85fr) 98px minmax(165px, 0.75fr)${actionColumn}`;
  const selectedServiceIds = rows
    .map((row) => String(row.serviceId || ""))
    .filter(Boolean);
  const currentRow = rows.find((row) => row.id === pickerRowId) || null;
```

Replace with:

```js
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingRows, setEditingRows] = useState({});
  const toggleRowEdit = (rowId) =>
    setEditingRows((p) => ({ ...p, [rowId]: !p[rowId] }));
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState({
    serviceName: "",
    serviceType: "",
    currencyId: "",
    basePrice: "",
    description: "",
  });
  const [createError, setCreateError] = useState("");
  const packageMode = pricingMode === "package";
  // A row needs an action cell if it can be deleted OR edited; readOnlyServices rows never
  // show the pencil, so the column only needs to exist when allowDelete or rows are editable.
  const showActionColumn = allowDelete || !readOnlyServices;
  const selectedServiceIds = rows
    .map((row) => String(row.serviceId || ""))
    .filter(Boolean);
```

- [ ] **Step 2: Simplify the duplicate-name check (no more excluding "the row being edited")**

Find:

```js
  const duplicateManualRow =
    normalizedNewServiceName &&
    rows.find(
      (row) =>
        row.id !== pickerRowId &&
        serviceNameKey(row.serviceName) === normalizedNewServiceName,
    );
```

Replace with:

```js
  const duplicateManualRow =
    normalizedNewServiceName &&
    rows.find(
      (row) => serviceNameKey(row.serviceName) === normalizedNewServiceName,
    );
```

- [ ] **Step 3: Rewrite `openPicker`/`closePicker`/`selectService`/`handleCreateService`**

Find:

```js
  const openPicker = (rowId) => {
    setPickerRowId(rowId);
    setSearch("");
    resetCreateForm();
  };

  const closePicker = () => {
    setPickerRowId(null);
    setSearch("");
    resetCreateForm();
  };

  const selectService = (service) => {
    if (!currentRow || !service) return;
    const serviceId = String(serviceOptionServiceId(service));
    const isUsed = rows.some(
      (row) => row.id !== currentRow.id && String(row.serviceId) === serviceId,
    );
    if (isUsed) {
      message.warning("This service is already selected in another row.");
      return;
    }
    onSelectService(currentRow.id, serviceId, service);
    closePicker();
  };

  const handleCreateService = async () => {
    if (!newService.serviceName.trim()) {
      setCreateError("Please enter service name.");
      return;
    }
    if (parseNum(newService.basePrice) <= 0) {
      setCreateError("Please enter unit price greater than 0.");
      return;
    }
    if (currencyOptions.length && !extractCurrencyId(newService.currencyId)) {
      setCreateError("Please select currency.");
      return;
    }
    if (duplicateNewService) {
      setCreateError(
        duplicateCatalogService
          ? "This service already exists in the catalog. Please select it instead."
          : "This service is already added in another row.",
      );
      return;
    }
    if (!currentRow) return;
    const created = onCreateManualService?.(currentRow.id, newService);
    if (created) {
      closePicker();
    }
  };
```

Replace with:

```js
  const openPicker = () => {
    setPickerOpen(true);
    setSearch("");
    resetCreateForm();
  };

  const closePicker = () => {
    setPickerOpen(false);
    setSearch("");
    resetCreateForm();
  };

  const selectService = (service) => {
    if (!service) return;
    const serviceId = String(serviceOptionServiceId(service));
    const isUsed = rows.some((row) => String(row.serviceId) === serviceId);
    if (isUsed) {
      message.warning("This service is already selected in another row.");
      return;
    }
    onSelectService(serviceId, service);
    closePicker();
  };

  const handleCreateService = () => {
    if (!newService.serviceName.trim()) {
      setCreateError("Please enter service name.");
      return;
    }
    if (parseNum(newService.basePrice) <= 0) {
      setCreateError("Please enter unit price greater than 0.");
      return;
    }
    if (currencyOptions.length && !extractCurrencyId(newService.currencyId)) {
      setCreateError("Please select currency.");
      return;
    }
    if (duplicateNewService) {
      setCreateError(
        duplicateCatalogService
          ? "This service already exists in the catalog. Please select it instead."
          : "This service is already added in another row.",
      );
      return;
    }
    const created = onCreateManualService?.(newService);
    if (created) {
      closePicker();
    }
  };
```

- [ ] **Step 4: Simplify `renderSelectedServiceButton` to the read-only-lock display only**

The clickable "open picker to re-pick this row's service" branch is removed — Task 4 stops using
this function for manually-added rows entirely (those get a plain read-only span + inline text
inputs instead, matching Case/Quotation). This function is now only called for `readOnlyServices`
rows, so it always renders the locked look.

Find:

```js
  const renderSelectedServiceButton = (row) => {
    const typeLabel = row.serviceType || "";
    if (readOnlyServices) {
      return React.createElement(
        "div",
        {
          style: {
            width: "100%",
            minHeight: 54,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            background: C.bgSoft,
            padding: "8px 11px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            textAlign: "left",
            fontFamily: FONT,
            boxSizing: "border-box",
          },
        },
        React.createElement(
          "span",
          { style: { color: C.primary, flexShrink: 0 } },
          TagIcon,
        ),
        React.createElement(
          "span",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "span",
            {
              style: {
                display: "block",
                color: C.text,
                fontSize: 14,
                fontWeight: 700,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              },
            },
            row.serviceName || "Service",
          ),
          typeLabel &&
            React.createElement(
              "span",
              {
                style: {
                  display: "block",
                  marginTop: 2,
                  color: C.sub,
                  fontSize: 12,
                  lineHeight: "16px",
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                },
              },
              typeLabel,
            ),
        ),
      );
    }
    return React.createElement(
      "button",
      {
        type: "button",
        onClick: () => openPicker(row.id),
        style: {
          width: "100%",
          minHeight: 54,
          border: `1px solid ${C.border}`,
          borderRadius: 7,
          background: "#fff",
          padding: "8px 11px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: FONT,
        },
      },
      React.createElement(
        "span",
        {
          style: { color: row.serviceName ? C.primary : C.sub, flexShrink: 0 },
        },
        row.serviceName ? TagIcon : SearchIcon,
      ),
      React.createElement(
        "span",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "span",
          {
            style: {
              display: "block",
              color: row.serviceName ? C.text : C.sub,
              fontSize: 14,
              fontWeight: row.serviceName ? 600 : 500,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            },
          },
          row.serviceName || "Select service",
        ),
        typeLabel &&
          React.createElement(
            "span",
            {
              style: {
                display: "block",
                marginTop: 2,
                color: C.sub,
                fontSize: 12,
                lineHeight: "16px",
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              },
            },
            typeLabel,
          ),
      ),
      React.createElement(
        "span",
        { style: { color: C.sub, flexShrink: 0 } },
        ChevronDownIcon,
      ),
    );
  };
```

Replace with:

```js
  const renderSelectedServiceButton = (row) => {
    const typeLabel = row.serviceType || "";
    return React.createElement(
      "div",
      {
        style: {
          width: "100%",
          minHeight: 54,
          border: `1px solid ${C.border}`,
          borderRadius: 7,
          background: C.bgSoft,
          padding: "8px 11px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          textAlign: "left",
          fontFamily: FONT,
          boxSizing: "border-box",
        },
      },
      React.createElement(
        "span",
        { style: { color: C.primary, flexShrink: 0 } },
        TagIcon,
      ),
      React.createElement(
        "span",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "span",
          {
            style: {
              display: "block",
              color: C.text,
              fontSize: 14,
              fontWeight: 700,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            },
          },
          row.serviceName || "Service",
        ),
        typeLabel &&
          React.createElement(
            "span",
            {
              style: {
                display: "block",
                marginTop: 2,
                color: C.sub,
                fontSize: 12,
                lineHeight: "16px",
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              },
            },
            typeLabel,
          ),
      ),
    );
  };
```

- [ ] **Step 5: Simplify the catalog table's `isUsed`/`isCurrent` logic (no more "row being edited")**

Find:

```js
                    filteredServices.length
                      ? filteredServices.map((service, index) => {
                          const serviceId = String(
                            serviceOptionServiceId(service),
                          );
                          const serviceName = serviceCatalogName(service);
                          const serviceType = serviceCatalogType(service);
                          const description =
                            serviceCatalogDescription(service);
                          const price = serviceCatalogPrice(service);
                          const serviceCurrency = serviceCatalogCurrency(
                            service,
                            currencies,
                            defaultCurrency,
                          );
                          const isUsed =
                            selectedServiceIds.includes(serviceId);
                          return React.createElement(
                            "tr",
                            {
                              key: serviceId || index,
                              onClick: () => !isUsed && selectService(service),
                              style: {
                                background:
                                  index % 2 === 0 ? "#fff" : "#fafafa",
                                cursor: isUsed ? "not-allowed" : "pointer",
                                opacity: isUsed ? 0.5 : 1,
                              },
                            },
```

- [ ] **Step 6: Simplify the "Select"/checkmark cell (no more `isCurrent` branch)**

Find:

```js
                            React.createElement(
                              "td",
                              { style: modalTdStyle({ textAlign: "center" }) },
                              isCurrent
                                ? React.createElement(
                                    "span",
                                    {
                                      title: "Selected",
                                      style: {
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 28,
                                        height: 28,
                                        borderRadius: "50%",
                                        background: C.bgSoft,
                                        border: "1px solid #bbf7d0",
                                        color: "#15803d",
                                      },
                                    },
                                    CheckIcon,
                                  )
                                : isUsed
                                  ? React.createElement(
                                      "span",
                                      {
                                        style: {
                                          color: C.sub,
                                          fontSize: 12,
                                          fontWeight: 700,
                                        },
                                      },
                                      "Used",
                                    )
                                  : React.createElement(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: (e) => {
                                          e.stopPropagation();
                                          selectService(service);
                                        },
                                        style: modalButtonStyle,
                                      },
                                      "Select",
                                    ),
                            ),
```

Replace with:

```js
                            React.createElement(
                              "td",
                              { style: modalTdStyle({ textAlign: "center" }) },
                              isUsed
                                ? React.createElement(
                                    "span",
                                    {
                                      style: {
                                        color: C.sub,
                                        fontSize: 12,
                                        fontWeight: 700,
                                      },
                                    },
                                    "Used",
                                  )
                                : React.createElement(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: (e) => {
                                        e.stopPropagation();
                                        selectService(service);
                                      },
                                      style: modalButtonStyle,
                                    },
                                    "Select",
                                  ),
                            ),
```

- [ ] **Step 7: Wire `pickerModal`'s guard and the "Add service" button to the new local state**

Find:

```js
  const pickerModal =
    pickerRowId &&
    React.createElement(
```

Replace with:

```js
  const pickerModal =
    pickerOpen &&
    React.createElement(
```

Find:

```js
          showAddRow &&
            (AntButton
              ? React.createElement(
                  AntButton,
                  { type: "dashed", onClick: onAddRow },
                  PlusIcon,
                  " Add service",
                )
              : React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: onAddRow,
                    style: {
                      border: `1px dashed ${C.primary}`,
                      background: "#fff",
                      color: C.primary,
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: FONT,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    },
                  },
                  PlusIcon,
                  "Add row",
                )),
```

Replace with:

```js
          showAddRow &&
            (AntButton
              ? React.createElement(
                  AntButton,
                  { type: "dashed", onClick: openPicker },
                  PlusIcon,
                  " Add service",
                )
              : React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: openPicker,
                    style: {
                      border: `1px dashed ${C.primary}`,
                      background: "#fff",
                      color: C.primary,
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: FONT,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    },
                  },
                  PlusIcon,
                  "Add row",
                )),
```

- [ ] **Step 8: Verify syntax**

Run: `node --check "All Module/Contract/ContractCreateForm.js"`
Expected: no output, exit code 0. The file is still not fully consistent yet — the row-table
markup (Task 4) still references the now-removed `columns`/`actionColumn`/`headerStyle`/
`cellStyle` variables you're about to delete in Task 4 Step 1, and `openPicker`/`selectService`
now take different arguments than the still-untouched row-table's callers expect in a few places.
Continue directly to Task 4 — do not stop to test or commit here.

---

## Task 4: Row table — CSS-grid divs → hand-rolled `<table>` with STT and edit-toggle

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js` (inside `ManualContractServicesSection`)

**Interfaces:**
- Consumes: `iconButtonStyle`/`ExpandableText` (Task 1), `pickerOpen`/`editingRows`/`toggleRowEdit`/
  `openPicker` (Task 3), `EditIcon`/`CheckIcon`/`TrashIcon` (pre-existing, lines 3904-3975),
  `TextInput`/`MoneyInput`/`PercentInput`/`TextArea`/`inputStyle` (pre-existing).
- Produces: none new — this is the last piece; after this task the component is fully consistent.

- [ ] **Step 1: Replace `headerStyle`/`cellStyle` with `th`/`td` helpers**

Find:

```js
  const headerStyle = {
    padding: "11px 14px",
    background: "#fbfcfd",
    color: C.sub,
    fontSize: 12,
    fontWeight: 600,
    borderBottom: `1px solid ${C.border}`,
  };
  const cellStyle = {
    padding: "12px 14px",
    minWidth: 0,
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    minHeight: packageMode ? 76 : 84,
    boxSizing: "border-box",
  };
```

Replace with:

```js
  const th = (ex = {}) => ({
    padding: "9px 12px",
    fontSize: 11.5,
    fontWeight: 600,
    color: C.sub,
    background: "#fbfcfd",
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: "normal",
    textAlign: "left",
    fontFamily: FONT,
    ...ex,
  });
  const td = (ex = {}) => ({
    padding: "10px 12px",
    fontSize: 13,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: "top",
    fontFamily: FONT,
    ...ex,
  });
```

- [ ] **Step 2: Replace the header-grid + row-grid + empty-state block with a hand-rolled `<table>`**

Find:

```js
      React.createElement(
        "div",
        { style: { overflowX: "auto" } },
        React.createElement(
          "div",
          { style: { minWidth: 1015 } },
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: columns } },
            React.createElement("div", { style: headerStyle }, "Service"),
            React.createElement("div", { style: headerStyle }, "Description"),
            React.createElement(
              "div",
              { style: { ...headerStyle, textAlign: "center" } },
              "Base price",
            ),
            React.createElement(
              "div",
              { style: { ...headerStyle, textAlign: "center" } },
              "VAT",
            ),
            React.createElement(
              "div",
              {
                style: {
                  ...headerStyle,
                  textAlign: "center",
                  color: "#1d4ed8",
                  background: "#eef4ff",
                },
              },
              "Total",
            ),
            allowDelete &&
              React.createElement("div", { style: headerStyle }, ""),
          ),
          rows.length
            ? rows.map((row, rowIndex) => {
                const amounts = manualServiceLineAmounts(row, packageMode);
                const rowCurrency = currencyFromRecord(
                  row,
                  currencies,
                  selectedCurrency || defaultCurrency,
                );
                const rowConversion = !packageMode
                  ? getRowConversion(rowCurrency, amounts)
                  : null;
                return React.createElement(
                  "div",
                  {
                    key: row.id,
                    style: {
                      display: "grid",
                      gridTemplateColumns: columns,
                      alignItems: "stretch",
                      background: rowIndex % 2 === 0 ? "#fff" : "#fafafa",
                      transition: "background 0.12s",
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.background = "#e6f4ff";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.background =
                        rowIndex % 2 === 0 ? "#fff" : "#fafafa";
                    },
                  },
                  React.createElement(
                    "div",
                    { style: cellStyle },
                    renderSelectedServiceButton(row),
                  ),
                  React.createElement(
                    "div",
                    { style: cellStyle },
                    React.createElement(TextArea, {
                      value: row.description || "",
                      onChange: (value) =>
                        onUpdateRow(row.id, "description", value),
                      placeholder: "Service scope or note",
                      rows: 2,
                    }),
                  ),
                  React.createElement(
                    "div",
                    { style: cellStyle },
                    packageMode
                      ? React.createElement(
                          "span",
                          {
                            style: {
                              color: C.primary,
                              fontWeight: 700,
                              fontSize: 13,
                            },
                          },
                          "Included in package",
                        )
                      : React.createElement(
                          "div",
                          { style: { display: "grid", gap: 8, width: "100%" } },
                          React.createElement(MoneyInput, {
                            value: row.basePrice,
                            onChange: (value) =>
                              onUpdateRow(row.id, "basePrice", value),
                            currency: rowCurrency,
                          }),
                          currencyOptions.length > 0 &&
                            React.createElement(
                              "select",
                              {
                                value:
                                  (extractCurrencyId(row.currencyId) &&
                                    String(
                                      extractCurrencyId(row.currencyId),
                                    )) ||
                                  (extractCurrencyId(rowCurrency)
                                    ? String(extractCurrencyId(rowCurrency))
                                    : ""),
                                onChange: (event) =>
                                  onUpdateRow(
                                    row.id,
                                    "currencyId",
                                    event.target.value,
                                  ),
                                style: {
                                  ...inputStyle,
                                  height: 34,
                                  padding: "0 8px",
                                  fontWeight: 700,
                                  width: "100%",
                                },
                                title: "Line currency",
                              },
                              currencyOptions.map((option) =>
                                React.createElement(
                                  "option",
                                  { key: option.value, value: option.value },
                                  getCurrencyCode(
                                    resolveCurrency(option.value, currencies) ||
                                      option.label,
                                  ),
                                ),
                              ),
                            ),
                        ),
                  ),
                  React.createElement(
                    "div",
                    { style: cellStyle },
                    packageMode
                      ? React.createElement(
                          "span",
                          { style: { color: C.sub, fontSize: 13 } },
                          "0%",
                        )
                      : React.createElement(PercentInput, {
                          value: row.vat,
                          onChange: (value) =>
                            onUpdateRow(row.id, "vat", value),
                        }),
                  ),
                  React.createElement(
                    "div",
                    {
                      style: {
                        ...cellStyle,
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#1d4ed8",
                        background: "#f5f9ff",
                        gap: 2,
                      },
                    },
                    packageMode
                      ? React.createElement(
                          "span",
                          {
                            style: {
                              color: C.sub,
                              fontWeight: 500,
                              fontSize: 13,
                            },
                          },
                          "—",
                        )
                      : rowConversion?.canConvert
                        ? React.createElement(
                            React.Fragment,
                            null,
                            React.createElement(
                              "span",
                              null,
                              formatMoneyByCurrency(
                                rowConversion.sameCurrency
                                  ? amounts.totalAmount
                                  : rowConversion.totalAmount,
                                defaultCurrency,
                              ),
                            ),
                            !rowConversion.sameCurrency &&
                              React.createElement(
                                "span",
                                {
                                  style: {
                                    color: C.sub,
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                  },
                                },
                                `Gốc: ${formatMoneyByCurrency(amounts.totalAmount, rowCurrency)}`,
                              ),
                          )
                        : React.createElement(
                            React.Fragment,
                            null,
                            React.createElement(
                              "span",
                              null,
                              formatMoneyByCurrency(
                                amounts.totalAmount,
                                rowCurrency,
                              ),
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
                              `Thiếu tỷ giá → ${getCurrencyCode(defaultCurrency)}`,
                            ),
                          ),
                  ),
                  allowDelete &&
                    React.createElement(
                      "div",
                      { style: { ...cellStyle, textAlign: "center" } },
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: () => onDeleteRow(row.id),
                          style: {
                            border: `1px solid ${C.border}`,
                            background: "#fff",
                            color: C.danger,
                            borderRadius: 6,
                            width: 30,
                            height: 30,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontWeight: 800,
                          },
                        },
                        TrashIcon,
                      ),
                    ),
                );
              })
            : React.createElement(
                "div",
                {
                  style: {
                    padding: "30px 12px",
                    textAlign: "center",
                    color: C.sub,
                    fontSize: 13,
                    borderTop: `1px solid ${C.border}`,
                  },
                },
                'No services added. Click "Add row" to add contract services.',
              ),
```

Replace with (note the `showActionColumn` const declared right before the table — a row needs an
action cell if it can be deleted OR edited; `readOnlyServices` rows never show the pencil, so the
column only needs to exist when `allowDelete` or when rows are editable at all):

```js
      React.createElement(
          "div",
          { style: { overflowX: "auto" } },
          React.createElement(
            "table",
            {
              style: { width: "100%", borderCollapse: "collapse", minWidth: 1015 },
            },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                React.createElement(
                  "th",
                  { style: th({ width: 36, textAlign: "center" }) },
                  "#",
                ),
                React.createElement("th", { style: th({ minWidth: 240 }) }, "Service"),
                React.createElement(
                  "th",
                  { style: th({ minWidth: 280 }) },
                  "Description",
                ),
                React.createElement(
                  "th",
                  { style: th({ width: 210, textAlign: "center" }) },
                  "Base price",
                ),
                React.createElement(
                  "th",
                  { style: th({ width: 90, textAlign: "center" }) },
                  "VAT",
                ),
                React.createElement(
                  "th",
                  {
                    style: th({
                      width: 160,
                      textAlign: "center",
                      color: "#1d4ed8",
                      background: "#eef4ff",
                    }),
                  },
                  "Total",
                ),
                showActionColumn &&
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
                      {
                        colSpan: showActionColumn ? 7 : 6,
                        style: td({
                          textAlign: "center",
                          color: C.sub,
                          padding: "30px 12px",
                        }),
                      },
                      'No services added. Click "Add row" to add contract services.',
                    ),
                  )
                : rows.map((row, idx) => {
                    const amounts = manualServiceLineAmounts(row, packageMode);
                    const rowCurrency = currencyFromRecord(
                      row,
                      currencies,
                      selectedCurrency || defaultCurrency,
                    );
                    const rowConversion = !packageMode
                      ? getRowConversion(rowCurrency, amounts)
                      : null;
                    const isRowEdit = !readOnlyServices && !!editingRows[row.id];
                    const rowBg = idx % 2 === 0 ? "#fff" : "#fafafa";
                    return React.createElement(
                      "tr",
                      {
                        key: row.id,
                        style: { background: rowBg, transition: "background 0.12s" },
                        onMouseEnter: (e) => {
                          e.currentTarget.style.background = "#e6f4ff";
                        },
                        onMouseLeave: (e) => {
                          e.currentTarget.style.background = rowBg;
                        },
                      },
                      React.createElement(
                        "td",
                        {
                          style: td({
                            textAlign: "center",
                            color: C.sub,
                            fontSize: 12,
                            fontWeight: 600,
                          }),
                        },
                        idx + 1,
                      ),
                      React.createElement(
                        "td",
                        { style: td() },
                        readOnlyServices
                          ? renderSelectedServiceButton(row)
                          : isRowEdit
                            ? React.createElement(
                                "div",
                                { style: { display: "grid", gap: 6 } },
                                React.createElement(TextInput, {
                                  value: row.serviceName || "",
                                  onChange: (value) =>
                                    onUpdateRow(row.id, "serviceName", value),
                                  placeholder: "Service name...",
                                }),
                                React.createElement(TextInput, {
                                  value: row.serviceType || "",
                                  onChange: (value) =>
                                    onUpdateRow(row.id, "serviceType", value),
                                  placeholder: "Service type...",
                                }),
                              )
                            : React.createElement(
                                "div",
                                {
                                  style: {
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 4,
                                  },
                                },
                                React.createElement(
                                  "span",
                                  {
                                    style: {
                                      fontWeight: 600,
                                      color: row.serviceName ? C.text : C.sub,
                                      whiteSpace: "normal",
                                      overflowWrap: "anywhere",
                                    },
                                  },
                                  row.serviceName || "—",
                                ),
                                row.serviceType &&
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
                                    row.serviceType,
                                  ),
                              ),
                      ),
                      React.createElement(
                        "td",
                        { style: td() },
                        isRowEdit
                          ? React.createElement(TextArea, {
                              value: row.description || "",
                              onChange: (value) =>
                                onUpdateRow(row.id, "description", value),
                              placeholder: "Service scope or note",
                              rows: 2,
                            })
                          : React.createElement(ExpandableText, {
                              text: row.description,
                              limit: 100,
                            }),
                      ),
                      React.createElement(
                        "td",
                        { style: td({ textAlign: "right" }) },
                        packageMode
                          ? React.createElement(
                              "span",
                              {
                                style: {
                                  display: "inline-block",
                                  padding: "4px 8px",
                                  borderRadius: 10,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  background: "#e6f4ff",
                                  color: C.primary,
                                },
                              },
                              "Included in package",
                            )
                          : isRowEdit
                            ? React.createElement(
                                "div",
                                { style: { display: "flex", gap: 6 } },
                                React.createElement(
                                  "div",
                                  { style: { flex: 1, minWidth: 0 } },
                                  React.createElement(MoneyInput, {
                                    value: row.basePrice,
                                    onChange: (value) =>
                                      onUpdateRow(row.id, "basePrice", value),
                                    currency: rowCurrency,
                                  }),
                                ),
                                currencyOptions.length > 0 &&
                                  React.createElement(
                                    "select",
                                    {
                                      value:
                                        (extractCurrencyId(row.currencyId) &&
                                          String(
                                            extractCurrencyId(row.currencyId),
                                          )) ||
                                        (extractCurrencyId(rowCurrency)
                                          ? String(extractCurrencyId(rowCurrency))
                                          : ""),
                                      onChange: (event) =>
                                        onUpdateRow(
                                          row.id,
                                          "currencyId",
                                          event.target.value,
                                        ),
                                      style: {
                                        ...inputStyle,
                                        height: 34,
                                        padding: "0 6px",
                                        fontWeight: 700,
                                        width: 84,
                                        flexShrink: 0,
                                      },
                                      title: "Line currency",
                                    },
                                    currencyOptions.map((option) =>
                                      React.createElement(
                                        "option",
                                        { key: option.value, value: option.value },
                                        getCurrencyCode(
                                          resolveCurrency(option.value, currencies) ||
                                            option.label,
                                        ),
                                      ),
                                    ),
                                  ),
                              )
                            : React.createElement(
                                "span",
                                { style: { fontWeight: 700, color: C.text } },
                                formatMoneyByCurrency(row.basePrice || 0, rowCurrency),
                              ),
                      ),
                      React.createElement(
                        "td",
                        { style: td({ textAlign: "center" }) },
                        packageMode
                          ? React.createElement(
                              "span",
                              { style: { color: C.sub, fontSize: 12.5 } },
                              "0%",
                            )
                          : isRowEdit
                            ? React.createElement(PercentInput, {
                                value: row.vat,
                                onChange: (value) =>
                                  onUpdateRow(row.id, "vat", value),
                              })
                            : React.createElement(
                                "span",
                                { style: { fontSize: 12.5, color: C.text } },
                                `${row.vat || 0}%`,
                              ),
                      ),
                      React.createElement(
                        "td",
                        {
                          style: td({
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#1d4ed8",
                            fontSize: 14,
                            fontVariantNumeric: "tabular-nums",
                          }),
                        },
                        packageMode
                          ? "—"
                          : rowConversion?.canConvert
                            ? React.createElement(
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
                                      ? amounts.totalAmount
                                      : rowConversion.totalAmount,
                                    defaultCurrency,
                                  ),
                                ),
                                !rowConversion.sameCurrency &&
                                  React.createElement(
                                    "span",
                                    {
                                      style: {
                                        color: C.sub,
                                        fontSize: 10.5,
                                        fontWeight: 600,
                                      },
                                    },
                                    `Gốc: ${formatMoneyByCurrency(amounts.totalAmount, rowCurrency)}`,
                                  ),
                              )
                            : React.createElement(
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
                                  formatMoneyByCurrency(amounts.totalAmount, rowCurrency),
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
                                  `Thiếu tỷ giá → ${getCurrencyCode(defaultCurrency)}`,
                                ),
                              ),
                      ),
                      showActionColumn &&
                        React.createElement(
                          "td",
                          { style: td({ textAlign: "center" }) },
                          React.createElement(
                            "div",
                            {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                              },
                            },
                            !readOnlyServices &&
                              React.createElement(
                                "button",
                                {
                                  type: "button",
                                  title: isRowEdit ? "Done editing" : "Edit service",
                                  onClick: () => toggleRowEdit(row.id),
                                  style: iconButtonStyle(C.primary, isRowEdit),
                                },
                                isRowEdit ? CheckIcon : EditIcon,
                              ),
                            allowDelete &&
                              React.createElement(
                                "button",
                                {
                                  type: "button",
                                  title: "Delete service",
                                  onClick: () => onDeleteRow(row.id),
                                  style: iconButtonStyle(C.danger),
                                },
                                TrashIcon,
                              ),
                          ),
                        ),
                    );
                  }),
            ),
          ),
        ),
```

- [ ] **Step 3: Verify syntax**

Run: `node --check "All Module/Contract/ContractCreateForm.js"`
Expected: no output, exit code 0. This is the first point since Task 2 where the file is fully
consistent again — `columns`/`actionColumn`/`headerStyle`/`cellStyle` are gone and nothing
references them; `pickerRowId`/`currentRow` are gone and nothing references them;
`onSelectService`/`onCreateManualService`/`onUpdateRow` call shapes match on both sides.

- [ ] **Step 4: Manual verification**

Open a Contract create form with **no** linked Case (manual services path). Confirm:
- Row table renders as a plain HTML table (thin borders, `#`/Service/Description/Base price/VAT/
  Total/action columns), not CSS-grid divs.
- Click "Add service" → the picker opens **immediately** (no blank row appears first). Pick a
  service → a fully-populated, **read-only** row appears at the bottom of the table.
- Click the pencil icon on that row → Service/Type become text inputs, Description becomes a
  textarea, Base price becomes an input with a currency `<select>` **beside it in the same row**
  (not stacked), VAT becomes a percent input. Toggle the pencil again (shows a checkmark while
  active) → row locks back to read-only with the new values reflected.
- Package mode: Base price shows "Included in package" and VAT shows "0%" regardless of edit
  state; the pencil can still toggle Service/Type/Description editing.
- Total column is never directly editable and still shows the "Gốc: ..." / "Thiếu tỷ giá"
  secondary line exactly as before.
- Delete (trash icon) removes the row.
- Create a service via the picker's "Create new" flow (still says "< Back", fixed in Task 5) →
  confirm it appends a new populated read-only row the same way.

Then open a Contract create form that **is** linked to a Case (services come from the Case's
service lines, `readOnlyServices=true`). Confirm:
- No "Add service" button, no pencil icon on any row (whole row is display-only, per the
  confirmed behavior change) — only the delete icon appears, and only when more than one service
  is selected.
- Every field (service name/type, description, price, VAT) is plain read-only text — nothing is
  clickable or editable.

- [ ] **Step 5: Commit** (covers Tasks 2, 3, and 4 together — the file was inconsistent between them)

```bash
git add "All Module/Contract/ContractCreateForm.js"
git commit -m "feat(ContractCreateForm): rebuild services table as hand-rolled table with per-row edit toggle"
```

---

## Task 5: Picker modal header — "< Back" link → tabs, matching Case/Quotation

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js` (inside the `pickerModal` local variable of
  `ManualContractServicesSection`)

**Interfaces:** none new — `showAdd`/`setShowAdd` state is reused unchanged, only how it's
toggled/labeled in the header changes.

- [ ] **Step 1: Replace the "< Back" button + title span with a 2-tab header**

Find:

```js
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
              },
            },
            showAdd &&
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setShowAdd(false);
                    setCreateError("");
                  },
                  style: {
                    border: "none",
                    borderRadius: 6,
                    background: C.bgSoft,
                    color: C.primary,
                    padding: "6px 10px",
                    fontSize: 13,
                    fontFamily: FONT,
                    cursor: "pointer",
                  },
                },
                "< Back",
              ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 18,
                  fontWeight: 500,
                  color: C.text,
                  fontFamily: FONT,
                },
              },
              showAdd ? "Create New Service" : "Select Service",
            ),
          ),
```

Replace with:

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
                    setCreateError("");
                  },
                  style: {
                    border: "none",
                    background: showAdd === tabIsAdd ? C.bgSoft : "transparent",
                    color: showAdd === tabIsAdd ? C.primary : C.sub,
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

Run: `node --check "All Module/Contract/ContractCreateForm.js"`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual verification**

Open the service picker ("Add service", manual/non-linked contract). Confirm: two tab buttons
("Select from list" / "Create new service") replace the old title+"< Back" pattern; clicking each
switches views exactly as before (state/validation/behavior unchanged, only the header control
changed); the active tab is visually highlighted.

- [ ] **Step 4: Commit**

```bash
git add "All Module/Contract/ContractCreateForm.js"
git commit -m "feat(ContractCreateForm): tab-style service picker header matching Case/Quotation"
```

---

## Task 6: End-to-end manual QA and sign-off

**Files:** none (verification only; fix-forward commits only if QA finds a regression).

- [ ] **Step 1: Full flow QA in the browser — manual (non-linked) contract**

Open "Create Contract" fresh (no Case selected) and walk through:
1. Add 2+ services via "Add service" (picker opens directly each time); confirm rows land
   read-only immediately.
2. Toggle edit on a row, change name/type/description/price/currency/VAT, toggle off — confirm
   values persist and the Total/summary numbers update correctly, including cross-currency rows
   (check the "Gốc: ..." / "Thiếu tỷ giá" lines).
3. Toggle "Package pricing" on/off — confirm the package badge, package-mode summary inputs, and
   that switching back restores per-row prices correctly.
4. Delete a row.
5. Open "Xem quy đổi tiền tệ" if it appears (multi-currency rows) — confirm it still works
   (untouched by this plan).
6. Create a brand-new service via the picker's "Create new service" tab — confirm it appends a
   populated read-only row.
7. Submit a contract end-to-end successfully.

- [ ] **Step 2: Full flow QA in the browser — Case-linked contract**

Open "Create Contract" from a Case with existing service lines (`readOnlyServices=true` path).
Confirm:
1. No "Add service" button; no pencil icon on any row.
2. Delete icon only appears when more than one service is linked (per `allowDelete`'s existing
   `selectedServiceIds.length > 1` rule).
3. All fields (service name/type, description, price, VAT) render as plain read-only text —
   nothing is clickable, no picker opens, no input renders.
4. Totals/summary bar still computes and displays correctly from these read-only rows.
5. Submit a Case-linked contract end-to-end successfully.

- [ ] **Step 3: Visual comparison against `CaseCreateForm.js` and `QuotationCreateForm.js`**

Open Case's and Quotation's own services sections side by side with Contract's manual (non-linked)
path. Confirm: same table chrome, same square icon-button shape/color for edit/delete, same
read-only-by-default/edit-toggle behavior, same "Add service opens picker directly" flow, same
merged price+currency single-row layout.

- [ ] **Step 4: Record sign-off**

If all checks pass, this plan is complete — Phase B (Contract) is done, closing out the
Case-CreateForm parity effort across Case (reference), Quotation, and Contract. If any check
fails, fix the specific task's code (no unrelated bundled changes), re-run that task's
`node --check`, retest, and commit the fix with a `fix(ContractCreateForm): ...` message before
continuing.
                            ),