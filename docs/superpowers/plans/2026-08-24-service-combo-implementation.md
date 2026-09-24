# Service Combo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a lawyer pick a reusable "combo dịch vụ" template when creating a Case, Quotation, or Contract, auto-filling package pricing (subtotal + VAT) and snapshotting the combo's services onto the new record — as a fast alternative to adding services one by one.

**Architecture:** Each of the 3 create-form files already implements a "line pricing / package pricing" toggle with its own state, row-add function, and submit payload builder. This plan adds a "combo" data-fetch + a Select control + an `applyCombo` function to each file's existing package-mode UI, reusing the existing row-add and package-total-set functions already in each file — no new submit-payload code, no new collections (already configured in Nocobase), no changes to `*Services.js` edit screens or docx generators.

**Tech Stack:** Nocobase JS blocks (React via `ctx.React`, AntD via `ctx.antd`, `ctx.api.request()` for all data access). No bundler, no test framework in this repo — verification is manual, through the Nocobase UI.

**Spec:** [docs/superpowers/specs/2026-08-24-service-combo-design.md](../specs/2026-08-24-service-combo-design.md)

## Global Constraints

- Each file listed under "Files" below is a single self-contained Nocobase JS block. Do not extract shared code into a separate file/module — duplicate the combo logic in each of the 3 files (per project convention, see `CLAUDE.md` and the "Nocobase single-file constraint" project rule).
- Never use `fetch()` directly — use `ctx.api.request({ url, params/data })` for every API call, matching every existing call site in these files.
- JSX is not used in these 3 files today (they use `React.createElement` throughout) — new code must match, using `React.createElement`, not JSX.
- All money amounts are VND; no currency-formatting changes are needed for this feature (combo `packageSubTotal`/`packageVatRate` route through each file's existing package-mode money inputs, which already handle VND formatting).
- Do not modify `handleSubmit` in any of the 3 files — the whole point of this feature is that combo-derived rows are indistinguishable from manually-added package-mode rows by the time `handleSubmit` runs, so `handleSubmit` needs zero changes.
- `services` on `Service Combo Items` is a `belongsTo` relation (one catalog service per combo-item row) — confirmed already configured correctly by the user in Nocobase. `quantity` on `Service Combo Items` is a plain number field.

---

## Background: why "duplicate the row N times" instead of "set quantity"

All 3 create forms hardcode `quantity: 1` on every row they create while in package-pricing mode, regardless of any quantity value on the row itself:

- `CaseCreateForm.js`: `projectServices:create` payload sends literal `quantity: 1` (both submit-loop branches).
- `QuotationCreateForm.js`: row objects have no `quantity` field at all; `buildServicePricingPayload()` returns `quantity: 1` unconditionally for package mode.
- `ContractCreateForm.js`: `packagePricingPayload()` returns `quantity: 1` unconditionally.

Since this plan deliberately avoids touching any of those submit-time functions (Global Constraints above), a combo item with `quantity: 2` is represented by pushing **2 duplicate rows** into the create form's row state (one row = one unit), not by setting a `quantity` field that the submit code would ignore anyway. This is called out again inline in each task below.

---

## Task 1: Configure computed totals on the Service Combo template (Nocobase admin, no code)

**Files:** None (Nocobase admin UI configuration only — the `serviceCombos`/`serviceComboItems` collections are already created).

**Interfaces:**
- Produces: `packageVatAmount` and `totalAmount` auto-computed on every `serviceCombos` record whenever `packageSubTotal`/`packageVatRate` change — consumed by nothing in code (informational only for whoever browses combo templates), but must be correct before Task 2-4 read `combo.packageSubTotal`/`combo.packageVatRate` (those two raw fields are what the later tasks actually use — `packageVatAmount`/`totalAmount` are display-only on the template).

- [ ] **Step 1: Open the Service Combo collection's form/linkage configuration**

  In Nocobase admin: go to the block/page where `Service Combo` records are created or edited (the same screen shown in the earlier screenshots — Data sources → the `Service Combo` collection's associated UI, or wherever the combo-template management screen lives). Open the record form's design/configuration mode.

- [ ] **Step 2: Add a Linkage Rule for `packageVatAmount`**

  On the form, add a Linkage Rule (or equivalent computed-field rule) with:
  - Trigger fields: `packageSubTotal`, `packageVatRate`
  - Action: set `packageVatAmount` to the expression `packageSubTotal * packageVatRate / 100`

- [ ] **Step 3: Add a Linkage Rule for `totalAmount`**

  - Trigger fields: `packageSubTotal`, `packageVatRate` (or `packageSubTotal`, `packageVatAmount` if the rule engine supports chaining off the previous rule's output)
  - Action: set `totalAmount` to the expression `packageSubTotal + packageVatAmount` (equivalently `packageSubTotal + packageSubTotal * packageVatRate / 100`)

- [ ] **Step 4: Manually verify**

  Create a test combo record with `packageSubTotal = 10000000` and `packageVatRate = 8`. Confirm the form shows `packageVatAmount = 800000` and `totalAmount = 10800000` before saving. Save it, reload the record, confirm the values persisted correctly. Delete this test record when done (or set `isActive = false` and rename it `"__test - delete me"` if deletion isn't convenient from this screen).

- [ ] **Step 5: Commit**

  No code changed in this task — nothing to commit. Note in your task-tracking that the Linkage Rule config is complete before starting Task 2.

---

## Task 2: Case — combo fetch, picker UI, and apply logic in `CaseCreateForm.js`

**Files:**
- Modify: `All Module/Case/CaseCreateForm.js`

**Interfaces:**
- Consumes: `ctx.api.request()`, `message` (from `ctx.antd`, already in scope), `Select` (from `ctx.antd`, already in scope — used at line 6183 for the Currency dropdown in this same component), the existing `addRowFromService(svc, isCreate = false)` function (lines 7713-7817) and `handlePackageSummaryChange(field, value)` function (lines 7845-7868).
- Produces: `combos` state (array of `serviceCombos` records with nested `serviceComboItems.services`), `applyCombo(comboId)` function — used only within this file, nothing downstream depends on these names.

- [ ] **Step 1: Add `combos` state**

  In `ProjectCreateForm`, immediately after the existing state declarations at lines 7023-7024:

  ```js
  const [rows, setRows] = useState([]);
  const [internalCompanies, setInternalCompanies] = useState([]);
  const [combos, setCombos] = useState([]);
  ```

- [ ] **Step 2: Fetch active, non-empty combos on mount**

  Add a new standalone `useEffect` right after the state block above (before any other logic in `ProjectCreateForm`):

  ```js
  useEffect(() => {
    ctx.api
      .request({
        url: "serviceCombos:list",
        params: {
          filter: JSON.stringify({ isActive: { $eq: true } }),
          appends: ["serviceComboItems.services"],
          pageSize: 100,
        },
      })
      .then((res) => {
        const list = res?.data?.data || [];
        setCombos(list.filter((c) => (c.serviceComboItems || []).length > 0));
      })
      .catch((error) => {
        console.warn("[CaseCreateForm] Could not fetch service combos:", error);
      });
  }, []);
  ```

- [ ] **Step 3: Add `applyCombo`, placed after `handlePackageSummaryChange` ends (after line 7868), before `handleServicePricingModeChange` starts (line 7871)**

  This ordering matters: `applyCombo` references `handlePackageSummaryChange` in its `useCallback` dependency array, so it must be declared textually after `handlePackageSummaryChange` to avoid a temporal-dead-zone `ReferenceError`.

  ```js
  const applyCombo = useCallback(
    async (comboId) => {
      const combo = combos.find((c) => String(c.id) === String(comboId));
      if (!combo) return;
      const items = combo.serviceComboItems || [];
      if (!items.length) {
        message.warning("Combo này chưa có dịch vụ nào.");
        return;
      }
      // Package-mode projectServices:create payloads in handleSubmit always
      // send quantity: 1 (both submit-loop branches), so a combo item with
      // quantity > 1 is represented as that many duplicate rows here.
      //
      // basePrice is explicitly 0 for every pushed row: addRowFromService's
      // internal addToPackageTotal(svc.basePrice) call would otherwise ADD
      // the service's own catalog price on top of form.packageSubTotal —
      // passing 0 makes that a no-op, so the combo's own packageSubTotal
      // (set below, after all rows are pushed) is the only value that ends
      // up in form.packageSubTotal.
      for (const item of items) {
        const svc = item.services || {};
        const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
        for (let i = 0; i < unitCount; i++) {
          await addRowFromService(
            {
              id: svc.id,
              serviceName: svc.serviceName || "",
              serviceType: svc.serviceType || "",
              description: svc.description || "",
              basePrice: 0,
            },
            false,
          );
        }
      }
      handlePackageSummaryChange("packageSubTotal", combo.packageSubTotal || 0);
      handlePackageSummaryChange("packageVatRate", combo.packageVatRate || 0);
      message.success(`Đã áp dụng combo "${combo.comboName}".`);
    },
    [combos, addRowFromService, handlePackageSummaryChange],
  );
  ```

- [ ] **Step 4: Pass `combos` and `applyCombo` down to `ProjectServicesTable`**

  In the `ProjectServicesTable` destructured props at lines 4795-4813, add two new props:

  ```js
  const ProjectServicesTable = ({
    rows,
    svcOpts,
    onUpdate,
    onDelete,
    onAddFromService,
    internalCompanyId,
    quotationId,
    pricingMode,
    financialSourceType,
    packageSummary,
    onPricingModeChange,
    onPackageChange,
    onCurrencyChange,
    taskTemplates,
    currency,
    currencies = [],
    pricingDate,
    combos = [],
    onApplyCombo,
  }) => {
  ```

  At the `ProjectServicesTable` invocation (lines 9913-9936), add matching entries:

  ```js
        onCurrencyChange: (value) => setF("currencyId", value || null),
        taskTemplates,
        combos,
        onApplyCombo: applyCombo,
      }),
  ```

- [ ] **Step 5: Add the combo picker to the package-mode UI**

  Immediately before the `packageMode &&` block that starts at line 6214 (the "Package Subtotal / VAT %" grid), insert a new sibling element, still gated by `packageMode`:

  ```js
        packageMode &&
        React.createElement(
          "div",
          { style: { minWidth: 0, maxWidth: 330 } },
          React.createElement(
            "div",
            { style: { fontSize: 11.5, color: C.textSub, marginBottom: 3, fontFamily: FONT } },
            "Áp dụng combo dịch vụ (tuỳ chọn)",
          ),
          Select
            ? React.createElement(Select, {
              allowClear: false,
              showSearch: true,
              value: undefined,
              placeholder: combos.length ? "Chọn combo..." : "Chưa có combo nào",
              optionFilterProp: "label",
              style: { width: "100%" },
              disabled: !combos.length,
              onSelect: (value) => onApplyCombo?.(value),
              options: combos.map((c) => ({
                value: String(c.id),
                label: `${c.comboCode ? c.comboCode + " - " : ""}${c.comboName}`,
              })),
            })
            : null,
        ),
        packageMode &&
        React.createElement(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 10,
              minWidth: 0,
              alignItems: "end",
            },
          },
          // ... existing Package Subtotal / VAT % / totals grid unchanged from here
  ```

  (The `packageMode && React.createElement("div", { style: { display: "grid", ...` block and everything nested inside it, lines 6214-onward, stays exactly as-is — you're only inserting a new sibling before it, using the same `packageMode &&` guard pattern already used throughout this section.)

- [ ] **Step 6: Manual verification**

  Start the app (see the `run` skill / project dev-server instructions). Open the Case creation form. Switch Pricing Mode to "Package pricing" — confirm the new "Áp dụng combo dịch vụ" dropdown appears above the Package Subtotal field, listing only combos that are `isActive: true` and have ≥ 1 item (create one via Task 1's screen first if none exist). Select a combo with 2 services (one with `quantity: 1`, one with `quantity: 2`) — confirm 3 rows appear in the services table (1 + 2), and `packageSubTotal`/`VAT %` auto-fill from the combo's values. Manually edit `packageSubTotal` afterward — confirm it accepts the edit (not locked). Submit the form, then open the created Case's Services tab and confirm 3 `projectServices` rows exist with the correct `serviceName`s and `pricingMode: "package"`, `basePrice: 0`.

- [ ] **Step 7: Commit**

  ```bash
  git add "All Module/Case/CaseCreateForm.js"
  git commit -m "$(cat <<'EOF'
  feat(CaseCreateForm): add combo dịch vụ picker under package pricing

  Selecting a combo auto-fills packageSubTotal/packageVatRate and
  snapshots the combo's services as new rows, reusing the existing
  addRowFromService/handlePackageSummaryChange functions.
  EOF
  )"
  ```

---

## Task 3: Quotation — combo fetch, picker UI, and apply logic in `QuotationCreateForm.js`

**Files:**
- Modify: `All Module/Quotation/QuotationCreateForm.js`

**Interfaces:**
- Consumes: `ctx.api.request()`, `message`, `ctx.antd.Select`, the existing `setRows` setter, and `setPackageField(key, value)` (lines 6963-6964).
- Produces: `combos` state, `applyCombo(comboId)` function.

- [ ] **Step 1: Add `combos` state**

  Immediately after line 6169-6170:

  ```js
  const [rows, setRows] = useState([]);
  const lineModeBackupRef = useRef({});
  const [combos, setCombos] = useState([]);
  ```

- [ ] **Step 2: Fetch active, non-empty combos on mount**

  Add a new standalone `useEffect`, same shape as Task 2 Step 2, right after the state block:

  ```js
  useEffect(() => {
    ctx.api
      .request({
        url: "serviceCombos:list",
        params: {
          filter: JSON.stringify({ isActive: { $eq: true } }),
          appends: ["serviceComboItems.services"],
          pageSize: 100,
        },
      })
      .then((res) => {
        const list = res?.data?.data || [];
        setCombos(list.filter((c) => (c.serviceComboItems || []).length > 0));
      })
      .catch((error) => {
        console.warn("[QuotationCreateForm] Could not fetch service combos:", error);
      });
  }, []);
  ```

- [ ] **Step 3: Add `applyCombo`, placed immediately after `setPackageField` (after line 6964), before `handleSubmit` starts (line 7170)**

  Unlike `CaseCreateForm.js`'s `addRowFromService`, this file's `addRowFromService(value)` has no side effect on `form.packageSubTotal` — so rows can be pushed and the package fields set in either order. This file also has no per-row `quantity` field at all (confirmed: row shape has no `quantity` key, and `buildServicePricingPayload` hardcodes `quantity: 1` for package mode), so the same "duplicate the row N times" approach from Task 2 applies here too.

  ```js
  const applyCombo = (comboId) => {
    const combo = combos.find((c) => String(c.id) === String(comboId));
    if (!combo) return;
    const items = combo.serviceComboItems || [];
    if (!items.length) {
      message.warning("Combo này chưa có dịch vụ nào.");
      return;
    }
    const newRows = [];
    items.forEach((item) => {
      const svc = item.services || {};
      const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
      for (let i = 0; i < unitCount; i++) {
        newRows.push({
          _id: Date.now() + Math.random(),
          projectServiceId: null,
          serviceId: svc.id,
          basePrice: 0,
          currencyId: null,
          currency: null,
          vat: 0,
          serviceName: svc.serviceName || "",
          serviceType: svc.serviceType || "",
          description: svc.description || "",
          catalogService: svc,
          catalogServiceId: svc.id || null,
          catalogBasePrice: svc.basePrice ?? null,
        });
      }
    });
    setRows((p) => [...p, ...newRows]);
    setPackageField("packageSubTotal", combo.packageSubTotal || 0);
    setPackageField("packageVatRate", combo.packageVatRate || 0);
    message.success(`Đã áp dụng combo "${combo.comboName}".`);
  };
  ```

- [ ] **Step 4: Pass `combos` and `applyCombo` down to `ServicesTable`**

  In the `ServicesTable` destructured props at lines 4478-4496, add:

  ```js
  const ServicesTable = ({
    rows,
    svcOpts,
    onUpdate,
    onAddFromService,
    onDelete,
    companyId,
    onAddNewService,
    pricingMode,
    currencies = [],
    currencyOptions = [],
    selectedCurrency = null,
    packageSubTotal,
    packageVatRate,
    packageTotals,
    onPricingModeChange,
    onPackageChange,
    onCurrencyChange,
    combos = [],
    onApplyCombo,
  }) => {
  ```

  At the `ServicesTable` invocation (lines 7890-7908), add:

  ```js
        onCurrencyChange: (value) => setF("currencyId", value || null),
        combos,
        onApplyCombo: applyCombo,
      }),
  ```

- [ ] **Step 5: Add the combo picker to the package-mode UI**

  Insert a new `packageMode &&`-gated block immediately before the summary grid that starts at line 5071 (`React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(140px, 1fr))", ...`):

  ```js
          packageMode &&
            React.createElement(
              "div",
              { style: { width: "min(100%, 560px)" } },
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
                "Áp dụng combo dịch vụ (tuỳ chọn)",
              ),
              ctx.antd.Select
                ? React.createElement(ctx.antd.Select, {
                    allowClear: false,
                    showSearch: true,
                    value: undefined,
                    placeholder: combos.length ? "Chọn combo..." : "Chưa có combo nào",
                    optionFilterProp: "label",
                    style: { width: "100%" },
                    disabled: !combos.length,
                    onSelect: (value) => onApplyCombo?.(value),
                    options: combos.map((c) => ({
                      value: String(c.id),
                      label: `${c.comboCode ? c.comboCode + " - " : ""}${c.comboName}`,
                    })),
                  })
                : null,
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
            // ... existing Package Subtotal / VAT / Total cards unchanged from here
  ```

  (Everything from the original line 5071 onward stays as-is — this only inserts a new sibling block before it.)

- [ ] **Step 6: Manual verification**

  Open the Quotation creation form. Switch to Package pricing. Confirm the combo picker appears above the Subtotal/VAT/Total summary cards. Select the same 2-service test combo used in Task 2 — confirm 3 rows appear (1 + 2 duplicated) in the services table, and `packageSubTotal`/`packageVatRate` auto-fill. Submit, then open the created Quotation's services list and confirm 3 `quotationServices` rows with correct `serviceName`, `pricingMode: "package"`, `basePrice: 0`.

- [ ] **Step 7: Commit**

  ```bash
  git add "All Module/Quotation/QuotationCreateForm.js"
  git commit -m "$(cat <<'EOF'
  feat(QuotationCreateForm): add combo dịch vụ picker under package pricing

  Selecting a combo auto-fills packageSubTotal/packageVatRate and
  snapshots the combo's services as new rows, reusing the existing
  addRowFromService/setPackageField functions.
  EOF
  )"
  ```

---

## Task 4: Contract — combo fetch, picker UI, and apply logic in `ContractCreateForm.js`

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js`

**Interfaces:**
- Consumes: `ctx.api.request()`, `message`, `ctx.antd.Select`, the existing `setManualServiceRows` setter, and `syncPackageTotals(subTotalValue, vatRateValue)` (lines 8943-8957).
- Produces: `combos` state, `applyCombo(comboId)` function.

- [ ] **Step 1: Add `combos` state**

  Immediately after the `manualServiceRows` state declaration (line 6845):

  ```js
    const [manualServiceRows, setManualServiceRows] = useState([]);
    const [combos, setCombos] = useState([]);
  ```

- [ ] **Step 2: Fetch active, non-empty combos on mount**

  Add a new standalone `useEffect`, same shape as Tasks 2 and 3:

  ```js
  useEffect(() => {
    ctx.api
      .request({
        url: "serviceCombos:list",
        params: {
          filter: JSON.stringify({ isActive: { $eq: true } }),
          appends: ["serviceComboItems.services"],
          pageSize: 100,
        },
      })
      .then((res) => {
        const list = res?.data?.data || [];
        setCombos(list.filter((c) => (c.serviceComboItems || []).length > 0));
      })
      .catch((error) => {
        console.warn("[ContractCreateForm] Could not fetch service combos:", error);
      });
  }, []);
  ```

- [ ] **Step 3: Add `applyCombo`, placed immediately after `syncPackageTotals` ends (after line 8957), before `handleManualPricingModeChange` starts (line 8959)**

  Row objects here follow `newManualServiceRow()`'s shape (line 1732), which uses **string-typed** numeric fields (`quantity: "1"`, `vat: "8"`) — match that convention. `packagePricingPayload()` (used at submit time) hardcodes `quantity: 1` regardless of the row's `quantity` field, so — same as Tasks 2 and 3 — a combo item's `quantity > 1` is represented as duplicate rows, not a quantity value.

  ```js
  const applyCombo = (comboId) => {
    const combo = combos.find((c) => String(c.id) === String(comboId));
    if (!combo) return;
    const items = combo.serviceComboItems || [];
    if (!items.length) {
      message.warning("Combo này chưa có dịch vụ nào.");
      return;
    }
    const newRows = [];
    items.forEach((item) => {
      const svc = item.services || {};
      const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
      for (let i = 0; i < unitCount; i++) {
        newRows.push({
          id: `combo-${comboId}-${svc.id}-${i}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          serviceId: svc.id ? String(svc.id) : "",
          serviceName: svc.serviceName || "",
          serviceType: svc.serviceType || "",
          description: svc.description || "",
          quantity: "1",
          currencyId: "",
          basePrice: "",
          vat: "0",
        });
      }
    });
    setManualServiceRows((prev) => [...prev, ...newRows]);
    syncPackageTotals(combo.packageSubTotal || 0, combo.packageVatRate || 0);
    message.success(`Đã áp dụng combo "${combo.comboName}".`);
  };
  ```

  Note: `setManualServiceRows` is called directly here (not via `addManualServiceRow`/`updateManualServiceRow`), which is intentional and safe — both of those helpers only call `syncManualLineTotals` `if (form.pricingMode !== "package")`, i.e. they're already no-ops for totals-syncing while in package mode, and `syncPackageTotals` (called explicitly above) is the correct/only function that should set `form.subTotal`/`form.vatAmount`/`form.totalAmount`/`form.packageVatRate` in package mode.

- [ ] **Step 4: Pass `combos` and `applyCombo` down to `ManualContractServicesSection`**

  In the destructured props at lines 4689-4710, add:

  ```js
  const ManualContractServicesSection = ({
    rows,
    services,
    pricingMode,
    packageVatRate,
    packageTotals,
    currencies = [],
    currencyOptions = [],
    selectedCurrency = null,
    readOnlyServices = false,
    showAddRow = true,
    allowDelete = true,
    onPricingModeChange,
    onPackageSubTotalChange,
    onPackageVatRateChange,
    onAddRow,
    onDeleteRow,
    onUpdateRow,
    onSelectService,
    onCreateManualService,
    onCurrencyChange,
    combos = [],
    onApplyCombo,
  }) => {
  ```

  At the `ManualContractServicesSection` invocation (lines 10480-10501), add:

  ```js
                onAddRow: serviceLines.length ? undefined : addManualServiceRow,
                onDeleteRow: serviceLines.length
                  ? undefined
                  : deleteManualServiceRow,
                combos,
                onApplyCombo: applyCombo,
  ```

  (Insert `combos`/`onApplyCombo` anywhere in the object literal passed to `React.createElement(ManualContractServicesSection, { ... })` — exact position among the other props doesn't matter, this is a plain object.)

- [ ] **Step 5: Add the combo picker to the "Services" section header**

  Insert a new sibling immediately after the pricing-mode toggle buttons block closes (after line 5886's `),`), before the next sibling div starts (line 5887), gated on `pricingMode === "package"`:

  ```js
          pricingMode === "package" &&
            React.createElement(
              "div",
              { style: { width: 220, minWidth: 0 } },
              React.createElement(
                "div",
                { style: { fontSize: 11.5, color: C.sub, marginBottom: 3, fontFamily: FONT } },
                "Áp dụng combo dịch vụ",
              ),
              ctx.antd.Select
                ? React.createElement(ctx.antd.Select, {
                    allowClear: false,
                    showSearch: true,
                    value: undefined,
                    placeholder: combos.length ? "Chọn combo..." : "Chưa có combo nào",
                    optionFilterProp: "label",
                    style: { width: "100%" },
                    disabled: !combos.length,
                    onSelect: (value) => onApplyCombo?.(value),
                    options: combos.map((c) => ({
                      value: String(c.id),
                      label: `${c.comboCode ? c.comboCode + " - " : ""}${c.comboName}`,
                    })),
                  })
                : null,
            ),
  ```

- [ ] **Step 6: Manual verification**

  Open the Contract creation form. Switch to Package pricing. Confirm the combo picker appears in the Services section header, next to the Line/Package toggle buttons. Select the same test combo — confirm 3 manual service rows appear, and `form.subTotal`/`form.packageVatRate` (surfaced via `packageTotals`) auto-fill. Submit, then open the created Contract's services list and confirm 3 `contractServices` rows exist with correct `serviceName`, `pricingMode: "package"`.

- [ ] **Step 7: Commit**

  ```bash
  git add "All Module/Contract/ContractCreateForm.js"
  git commit -m "$(cat <<'EOF'
  feat(ContractCreateForm): add combo dịch vụ picker under package pricing

  Selecting a combo auto-fills package pricing and snapshots the
  combo's services as new manual rows, reusing the existing
  setManualServiceRows/syncPackageTotals functions.
  EOF
  )"
  ```

---

## Task 5: End-to-end manual verification and edge cases

**Files:** None (manual testing only — no code changes expected unless a bug is found, in which case fix it in the relevant file from Tasks 2-4 and re-run this task's checklist).

**Interfaces:**
- Consumes: everything built in Tasks 1-4.
- Produces: confidence the feature works as specified before considering this plan done.

- [ ] **Step 1: Set up test data**

  Via the Service Combo admin screen (Task 1), create 2 test combos:
  - Combo A: `isActive: true`, `packageSubTotal: 15000000`, `packageVatRate: 8`, 2 items (service X qty 1, service Y qty 2).
  - Combo B: `isActive: false` (inactive), 1 item — used to verify inactive combos are excluded.
  - Combo C: `isActive: true`, 0 items (no `serviceComboItems` rows) — used to verify empty combos are excluded.

- [ ] **Step 2: Verify combo B and C never appear**

  In all 3 create forms (Case, Quotation, Contract), switch to Package pricing and open the combo dropdown. Confirm only Combo A is listed — Combo B (inactive) and Combo C (empty) must not appear.

- [ ] **Step 3: Verify Combo A's quantity-2 item duplicates correctly**

  In each of the 3 create forms, select Combo A. Confirm exactly 3 service rows appear (service X ×1, service Y ×2 as two separate rows), and `packageSubTotal = 15,000,000` / VAT `= 8%` are pre-filled.

- [ ] **Step 4: Verify the pre-filled package price is editable**

  After selecting Combo A in each form, manually change the subtotal field to a different value (e.g. `12000000`) before submitting. Submit. Open the created record and confirm the SAVED value is `12,000,000`, not the combo's original `15,000,000` — proving the auto-fill is a starting point, not a lock.

- [ ] **Step 5: Verify switching to "Dịch vụ lẻ" (Line pricing) after picking a combo doesn't leave stale state**

  In each form: select Combo A (package mode, rows populate), then switch the pricing-mode toggle back to "Line pricing". Confirm the combo-derived rows either get cleared or their prices become editable again per that file's existing line/package toggle behavior (this is pre-existing behavior being exercised by combo-added rows, not new behavior — just confirm nothing crashes and no leftover `packageSubTotal`/`packageVatRate` values silently persist into a line-priced submission).

- [ ] **Step 6: Verify snapshot correctness after catalog service is later renamed**

  After creating a Case/Quotation/Contract via Combo A, go to the `services` catalog and rename service X. Reload the previously-created record's services list — confirm the OLD name is still shown (proving the snapshot, not a live join, is what's displayed) — this is pre-existing snapshot behavior (per spec §1/finding #2), not new code from this plan, but it's the behavior this whole feature depends on, so it's worth confirming it still holds for combo-created rows specifically.

- [ ] **Step 7: Verify Quotation → Contract/Case propagation of a combo-created Quotation**

  This exercises pre-existing sync code this plan does NOT modify (spec §7) — it's a verification step, not a code task, unless it fails.

  Create a Quotation via Combo A (package mode, 3 rows, as in Step 3). From that Quotation, use the app's existing "create Contract from this Quotation" / "create Case from this Quotation" flow (whichever entry points already exist in the app today — not part of this plan). Confirm the resulting Contract/Case both end up `pricingMode: "package"` with the same `packageSubTotal`/`packageVatRate`, AND confirm whether the 3 individual service line items (not just the totals) were copied across.

  If the totals sync but the individual line items do NOT (i.e., the destination Contract/Case ends up with correct package pricing but an empty or incomplete services list), this is a pre-existing gap in the general package-mode sync path (`isPackagePricing()` branches in `CaseServices.js`, referenced in spec §7) — it applies to ANY package-mode Quotation, not something specific to combo-created ones. Do not fix it as part of this plan; instead, note it down and raise it with the user as a separate follow-up (a new spec/plan), since fixing it is outside this plan's stated scope (spec §3 non-goals / §7).

- [ ] **Step 8: If any step above fails**

  Identify which of Task 2 / 3 / 4's code is responsible, fix it in that file, re-commit with a `fix:` prefixed message, and re-run the failing step until it passes. Do not proceed to calling this plan complete until all steps above pass in all 3 modules (Step 7's line-item-copying sub-check is exempt from this — per that step, it's reported as a follow-up rather than fixed here if it fails).
