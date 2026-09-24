# Apply Combo in *Services.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user apply a brand-new combo (from the `serviceCombos` catalog, or a hand-built ad-hoc combo) directly inside `CaseServices.js`, `ContractServices.js`, and `QuotationServices.js` — today this is only possible at record-creation time in the `*CreateForm.js` files.

**Architecture:** One shared UI pattern (Individual Service tab unchanged + new Apply Combo tab with "Select from catalog" / "Create ad-hoc" sub-tabs), two different persistence paths per the pre-existing architecture of each file: `CaseServices.js` creates `projectServices` rows immediately via API (extract the existing single-service creation logic into a reusable function, call it once per combo item); `ContractServices.js`/`QuotationServices.js` push local rows into their existing `rows` draft state (nothing hits the API until the user's existing "Save & Update" button). All three files also gain a `comboName`-fallback grouping key, because ad-hoc combos never get a real `comboId` (matches `*CreateForm.js`'s own established behavior) and would otherwise lose their section grouping on reload.

**Tech Stack:** Nocobase JS Field/Action blocks (single self-contained file per block, `ctx.React`/`ctx.antd`, no imports — see `CLAUDE.md`). No test runner exists in this codebase; verification is `node --check <file>` for syntax plus a manual QA pass in the browser (this plan's "tests" reflect that reality, not a fictional test framework).

**Spec:** `docs/superpowers/specs/2026-08-26-services-apply-combo-design.md`

## Global Constraints

- Never use `fetch()` — only `ctx.api.request()`.
- No ES imports — only `ctx.React`, `ctx.antd`, module-scope helpers duplicated per file (see `nocobase-docs` / memory `nocobase_single_file_constraint`).
- Every new/changed money amount is VND (case/contract/quotation-level totals are always VND; only per-line `basePrice` may be foreign-currency).
- Combo pricing is additive to the ONE existing combined package total per record — never a separate per-combo total (already-established rule from prior work in this same session).
- Ad-hoc combos contribute **0** to the package subtotal at apply time — the user adjusts the subtotal by hand afterward via the existing totals panel. Do not build an upfront price-entry step for ad-hoc combos (deliberately simpler than `*CreateForm.js`'s ad-hoc flow).
- Every task ends with `node --check <file>` passing before commit.

---

## Task 1: Case — comboName-fallback grouping key

**Files:**
- Modify: `All Module/Case/CaseServices.js:3805-3837` (the `comboGroups`/`displayRows` construction block, and its `_displayIndex` loop)
- Modify: `All Module/Case/CaseServices.js` — `handleRemoveCombo` (search `const handleRemoveCombo = async (comboId)`) and the "Remove combo" `onConfirm` call site inside `renderComboHeaderBar`

**Interfaces:**
- Produces: `getComboGroupKey(row)` — `(row) => string | null`. Returns `"id:<n>"` when the row has a real `comboId`/`serviceCombo`, `"name:<comboName>"` when it has no id but a non-empty `comboName`, `null` otherwise (ungrouped row).
- Produces: header pseudo-rows now carry `_groupKey` (the value used for matching) in addition to the existing `comboId` (which stays the REAL nullable id — never the group key string — because it's also used to tag rows added via the per-combo "+ Add service" button).
- Consumes: `extractId` (already defined in this component).

- [ ] **Step 1: Add `getComboGroupKey` and rewrite the grouping loop**

Locate the existing block (currently reads, at `CaseServices.js:3805-3837`):

```js
      const comboGroups = new Map();
      for (const row of services) {
        const comboIdVal = extractId(row.comboId) || extractId(row.serviceCombo);
        if (!comboIdVal) continue;
        if (!comboGroups.has(comboIdVal)) comboGroups.set(comboIdVal, []);
        comboGroups.get(comboIdVal).push(row);
      }
      const emittedCombos = new Set();
      const displayRows = [];
      let displaySeq = 0;
      for (const row of services) {
        const comboIdVal = extractId(row.comboId) || extractId(row.serviceCombo);
        if (!comboIdVal) {
          displaySeq += 1;
          displayRows.push({ ...row, _displayIndex: displaySeq });
          continue;
        }
        if (emittedCombos.has(comboIdVal)) continue;
        emittedCombos.add(comboIdVal);
        const groupRows = comboGroups.get(comboIdVal);
        const activeCount = groupRows.filter((r) => !isDeletedServiceLine(r)).length;
        displayRows.push({
          id: `combo-header-${comboIdVal}`,
          _isComboHeader: true,
          comboId: comboIdVal,
          comboName: row.comboName || "Combo",
          _comboCount: activeCount,
        });
        for (const r of groupRows) {
          displaySeq += 1;
          displayRows.push({ ...r, _displayIndex: displaySeq });
        }
      }
```

Replace it with:

```js
      // Real catalog combos group by comboId (a numeric FK). Ad-hoc combos
      // never get a real comboId (matches *CreateForm.js's own behavior —
      // its _comboCatalogId stays null for ad-hoc combos too), so they fall
      // back to grouping by comboName. Two independently-applied ad-hoc
      // combos that happen to share the exact same name will visually merge
      // into one section — an accepted, documented limitation (see spec).
      const getComboGroupKey = (row) => {
        const comboIdVal = extractId(row.comboId) || extractId(row.serviceCombo);
        if (comboIdVal) return `id:${comboIdVal}`;
        const name = String(row.comboName || "").trim();
        return name ? `name:${name}` : null;
      };

      const comboGroups = new Map();
      for (const row of services) {
        const key = getComboGroupKey(row);
        if (!key) continue;
        if (!comboGroups.has(key)) comboGroups.set(key, []);
        comboGroups.get(key).push(row);
      }
      const emittedCombos = new Set();
      const displayRows = [];
      let displaySeq = 0;
      for (const row of services) {
        const key = getComboGroupKey(row);
        if (!key) {
          displaySeq += 1;
          displayRows.push({ ...row, _displayIndex: displaySeq });
          continue;
        }
        if (emittedCombos.has(key)) continue;
        emittedCombos.add(key);
        const groupRows = comboGroups.get(key);
        const activeCount = groupRows.filter((r) => !isDeletedServiceLine(r)).length;
        displayRows.push({
          id: `combo-header-${key}`,
          _isComboHeader: true,
          _groupKey: key,
          comboId: extractId(row.comboId) || extractId(row.serviceCombo) || null,
          comboName: row.comboName || "Combo",
          _comboCount: activeCount,
        });
        for (const r of groupRows) {
          displaySeq += 1;
          displayRows.push({ ...r, _displayIndex: displaySeq });
        }
      }
```

- [ ] **Step 2: Update `handleRemoveCombo` to match on the group key, not a numeric comboId**

Find `const handleRemoveCombo = async (comboId) => {` and its body's `groupRows` filter:

```js
      const groupRows = services.filter(
        (row) => !isDeletedServiceLine(row) && String(extractId(row.comboId) || extractId(row.serviceCombo) || "") === String(comboId),
      );
```

Replace the whole function's signature and that filter line with:

```js
      const handleRemoveCombo = async (groupKey) => {
        const groupRows = services.filter(
          (row) => !isDeletedServiceLine(row) && getComboGroupKey(row) === groupKey,
        );
```

(leave the rest of the function body unchanged).

- [ ] **Step 3: Update the "Remove combo" button's call site**

In `renderComboHeaderBar`, find:

```js
          onConfirm: () => handleRemoveCombo(record.comboId),
```

Replace with:

```js
          onConfirm: () => handleRemoveCombo(record._groupKey),
```

- [ ] **Step 4: Syntax check**

Run: `node --check "All Module/Case/CaseServices.js"`
Expected: no output (success).

- [ ] **Step 5: Manual QA**

Open a Case that has an existing catalog combo section. Confirm it still renders grouped with the correct name/count (regression check — real combos are unaffected by this change since `getComboGroupKey` returns the same `id:<n>` shape they always matched on). Click "Remove combo" on it, confirm it still removes the whole section.

- [ ] **Step 6: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "feat(case-services): group combo-less rows by comboName as a fallback"
```

---

## Task 2: Case — combo catalog fetch

**Files:**
- Modify: `All Module/Case/CaseServices.js` — add state near `const [serviceCatalog, setServiceCatalog] = useState([]);` (around line 873)
- Modify: `All Module/Case/CaseServices.js:2528-2548` (`loadData`'s existing `services:list` catalog fetch block) — add a sibling fetch right after it

**Interfaces:**
- Produces: `comboCatalog` (state, array of `serviceCombos` rows, each with a nested `.serviceComboItems` array of `{ quantity, services: { id, serviceName, serviceType, description } }`).
- Consumes: `extractId`, `ctx.api.request`.

- [ ] **Step 1: Add the state declaration**

Find:

```js
      const [serviceCatalog, setServiceCatalog] = useState([]);
```

Add immediately after it:

```js
      const [comboCatalog, setComboCatalog] = useState([]);
```

- [ ] **Step 2: Fetch combos alongside the existing service-catalog fetch**

Find (in `loadData`, right after the existing `services:list` try/catch that calls `setServiceCatalog`):

```js
          try {
            const catRes = await ctx.api.request({
              url: "services:list",
              params: {
                pageSize: 500,
              },
            });
            const allSvcs = catRes?.data?.data || [];
            const internalCompanyId = extractId(info.internalCompanyId) || info.internalCompanyId;
            const filteredSvcs = info.internalCompanyId
              ? allSvcs.filter(
                (s) =>
                  !s.internalCompanyId ||
                  String(extractId(s.internalCompanyId) || s.internalCompanyId) === String(internalCompanyId)
              )
              : allSvcs;
            setServiceCatalog(filteredSvcs);
          } catch (catalogErr) {
            console.warn("Could not fetch service catalog for comparison", catalogErr);
            setServiceCatalog([]);
          }
```

Add right after this block (still inside the same outer `try`, before the outer `catch (err)`):

```js
          try {
            const comboRes = await ctx.api.request({
              url: "serviceCombos:list",
              params: {
                filter: JSON.stringify({ isActive: { $eq: true } }),
                appends: ["serviceComboItems.services"],
                pageSize: 100,
              },
            });
            const comboList = comboRes?.data?.data || [];
            setComboCatalog(comboList.filter((c) => (c.serviceComboItems || []).length > 0));
          } catch (comboErr) {
            console.warn("Could not fetch service combo catalog", comboErr);
            setComboCatalog([]);
          }
```

- [ ] **Step 3: Syntax check**

Run: `node --check "All Module/Case/CaseServices.js"`
Expected: no output (success).

- [ ] **Step 4: Manual QA**

Add a temporary `console.log(comboCatalog)` right after the `setComboCatalog` call inside the new `try`, reload the Services block in the browser, confirm the console shows the case's available combos with `serviceComboItems` populated, then remove the temporary log.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "feat(case-services): fetch the serviceCombos catalog on load"
```

---

## Task 3: Case — extract single-service creation into a reusable function

**Files:**
- Modify: `All Module/Case/CaseServices.js:2627-2831` (the entire `handleAddSubmit` function body)

**Interfaces:**
- Produces: `createOneCaseService(item, options)` — async function.
  - `item`: `{ serviceId: number|null, serviceName: string, serviceType: string, description: string, basePrice: number, vat: number, currencyId: number|null, comboTarget: { comboId: number|null, comboName: string } | null }`
  - `options`: `{ skipReload?: boolean }` — when `true`, skips the final `loadData()` call (the bulk combo-apply caller does one `loadData()` after all items are created, not once per item).
  - Returns: `{ id: number | null }` — the created `projectServices` row id (or `null` if creation failed and the caller's own try/catch already reported the error).
  - Throws on failure (existing `handleAddSubmit` behavior — the caller's try/catch handles the message).
- Consumes: everything `handleAddSubmit` already uses in its body (`currentId`, `services`, `servicePricingSummary`, `caseCurrency`, `currencies`, `caseInfo`, `getWritableLinePricing`, `stripProjectServiceSyncFields`, `extractId`, `syncCaseTotalAmount`, `CASE_DOCUMENT_SCOPE`).

This task is a pure **extract, don't rewrite** — the goal is to make the existing single-service creation logic (folder creation, pricing, everything currently inside `handleAddSubmit`) callable once per combo item without duplicating it. Behavior for the existing single-service form must be byte-for-byte identical after this refactor.

- [ ] **Step 1: Read the current function in full**

Run: read `All Module/Case/CaseServices.js` lines 2627-2831 (the full current `handleAddSubmit`). Note every place it reads from `values` (the AntD form values object) — these become the new function's `item` parameter instead.

- [ ] **Step 2: Rename and adapt the parameter source**

Replace the function's opening:

```js
      const handleAddSubmit = async (values) => {
        if (!currentId) return;
        setSubmitting(true);
        try {
          const checkName = (values.serviceName || "").toLowerCase().trim();
          const isDuplicate = services.some(s =>
            (s.serviceName || s.services?.serviceName || s.name || "").toLowerCase().trim() === checkName
          );
          if (isDuplicate) {
            message.error("This service already exists in the case. Please choose or enter a different name!");
            setSubmitting(false);
            return;
          }

          // 1. Create projectServices
          const addAsPackage = servicePricingSummary.isPackageMode;
          const price = addAsPackage ? 0 : Number(values.basePrice) || 0;
          const vat = addAsPackage ? 0 : Number(values.vat) || 0;
          const selectedCatalogService = values.serviceId
            ? serviceCatalog.find((s) => String(s.id) === String(values.serviceId))
            : null;
          const explicitCurrency = values.currencyId ? resolveCurrency(values.currencyId, currencies) : null;
```

with:

```js
      // The shared "create one service" core, used by both the single-add
      // form (handleAddSubmit) and the bulk Apply Combo handler (one call
      // per combo item). `skipReload` lets the bulk caller defer loadData()
      // to a single call after every item is created, instead of once per
      // item.
      const createOneCaseService = async (item, { skipReload = false } = {}) => {
        if (!currentId) return { id: null };
        const checkName = (item.serviceName || "").toLowerCase().trim();
        const isDuplicate = services.some(s =>
          (s.serviceName || s.services?.serviceName || s.name || "").toLowerCase().trim() === checkName
        );
        if (isDuplicate) {
          message.error(`"${item.serviceName}" already exists in the case.`);
          return { id: null };
        }

        // 1. Create projectServices
        const addAsPackage = servicePricingSummary.isPackageMode || !!item.comboTarget;
        const price = addAsPackage ? 0 : Number(item.basePrice) || 0;
        const vat = addAsPackage ? 0 : Number(item.vat) || 0;
        const selectedCatalogService = item.serviceId
          ? serviceCatalog.find((s) => String(s.id) === String(item.serviceId))
          : null;
        const explicitCurrency = item.currencyId ? resolveCurrency(item.currencyId, currencies) : null;
```

- [ ] **Step 3: Replace every remaining `values.X` reference with `item.X` inside the moved body**

The body (lines that were 2649-2830 in the original) references `values.serviceId`, `values.serviceName`, `values.serviceType`, `values.description`, `values.currencyId` several more times (in `newRowCurrency`, `getWritableLinePricing`'s params, `createData`, and the folder-creation block's `serviceCatalogId`/folder `name`). Replace each `values.` with `item.` (mechanical rename — grep the block for `values.` after Step 2 and rename every remaining hit; there is no other use of a variable literally named `values` left in the function once this is done).

Also replace the `comboAddTarget` reads inside `createData`:

```js
            comboId: comboAddTarget?.comboId || null,
            serviceCombo: comboAddTarget?.comboId || null,
            comboName: comboAddTarget?.comboName || null,
```

with:

```js
            comboId: item.comboTarget?.comboId || null,
            serviceCombo: item.comboTarget?.comboId || null,
            comboName: item.comboTarget?.comboName || null,
```

- [ ] **Step 4: Fix indentation and the tail of the function**

The whole body was originally indented one level deeper inside a `try { ... } catch (err) { ... } finally { ... }` wrapped around `setSubmitting(true)`/`setSubmitting(false)`. Since `createOneCaseService` is now the shared core (the submitting-state toggling belongs to the two *callers*, not the shared function), remove the outer `try`/`catch`/`finally` and the `setSubmitting` calls from inside this function — callers handle those around their own call site(s). Concretely, the function's tail currently reads:

```js
          await syncCaseTotalAmount(currentId);

          message.success("Service saved. You can add a quotation or contract for it later.");
          closeAddModal();
          loadData();
        } catch (err) {
          console.error(err);
          message.error("Error: " + (err.message || ""));
        } finally {
          setSubmitting(false);
        }
      };
```

Replace it with:

```js
        await syncCaseTotalAmount(currentId);
        if (!skipReload) {
          message.success("Service saved. You can add a quotation or contract for it later.");
          closeAddModal();
          await loadData();
        }
        return { id: psId };
      };
```

(remove the now-unindented function body's stray extra indentation level introduced by dropping the `try`; a consistent re-indent is cosmetic and not required for correctness, but keep it readable.)

- [ ] **Step 5: Add a thin wrapper that the existing form still calls**

Immediately after the new `createOneCaseService` function, add:

```js
      const handleAddSubmit = async (values) => {
        setSubmitting(true);
        try {
          await createOneCaseService({
            serviceId: values.serviceId || null,
            serviceName: values.serviceName?.trim(),
            serviceType: values.serviceType?.trim(),
            description: values.description?.trim(),
            basePrice: values.basePrice,
            vat: values.vat,
            currencyId: values.currencyId || null,
            comboTarget: comboAddTarget,
          });
        } catch (err) {
          console.error(err);
          message.error("Error: " + (err.message || ""));
        } finally {
          setSubmitting(false);
        }
      };
```

This is the AntD `Form`'s existing `onFinish={handleAddSubmit}` handler — its signature (`(values) => void`, called by `Form`) is unchanged, so nothing else in the file needs to change.

- [ ] **Step 6: Syntax check**

Run: `node --check "All Module/Case/CaseServices.js"`
Expected: no output (success).

- [ ] **Step 7: Manual QA (regression check)**

In the browser: open the Add Service modal (global "+ Add Service" button, not a per-combo one), pick a catalog service, submit. Confirm it's created exactly as before (folder created, task templates seeded, success message, modal closes, list refreshes). Then repeat via a combo's own "+ Add service" button (`comboAddTarget` set) and confirm the created row is tagged into that combo section as before.

- [ ] **Step 8: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "refactor(case-services): extract createOneCaseService for reuse by Apply Combo"
```

---

## Task 4: Case — Apply Combo tab (catalog select) in the Add modal

**Files:**
- Modify: `All Module/Case/CaseServices.js` — state near `comboAddTarget` (around line 900)
- Modify: `All Module/Case/CaseServices.js` — the "ADD MODAL" `React.createElement(Modal, {...})` block (search `// ADD MODAL`)
- Modify: `All Module/Case/CaseServices.js` — the antd destructure at the top of the file (add `Segmented`, `Empty` if not already present)

**Interfaces:**
- Produces: `addModalTab` (state: `"individual" | "combo"`), `comboSubTab` (state: `"select" | "adhoc"`), `comboSearch` (state), `applyComboFromCatalog(combo)` (async handler).
- Consumes: `comboCatalog` (Task 2), `createOneCaseService` (Task 3), `applyPackageSummaryPatch`, `buildPackageSummaryPatch`, `servicePricingSummary.allPackageRows`, `vndCurrency`, `currencies`, `exchangeRates`, `fetchExchangeRatesForConversion`, `buildServicePricingPayload`, `casePricingDate`, `currencyFromRecord`, `extractCurrencyId`, `getCurrencyCode`, `formatMoney`.

- [ ] **Step 1: Check/add `Segmented` and `Empty` to the antd destructure**

Near the top of the file, find the line destructuring `ctx.antd` (search `= ctx.antd;`). Confirm `Segmented` and `Empty` are present; if not, add them to that destructure list.

- [ ] **Step 2: Add the new state**

Find `const [comboAddTarget, setComboAddTarget] = useState(null);` and add right after it:

```js
      // Apply-Combo modal state (the global "+ Add Service" button's Apply
      // Combo tab — NOT the per-combo-section "+ Add service" button, which
      // still uses comboAddTarget + the Individual Service tab directly).
      const [addModalTab, setAddModalTab] = useState("individual");
      const [comboSubTab, setComboSubTab] = useState("select");
      const [comboSearch, setComboSearch] = useState("");
      const [applyingCombo, setApplyingCombo] = useState(false);
```

- [ ] **Step 3: Reset the new state when the Add modal opens/closes**

Find `openAddModal`/`closeAddModal`:

```js
      const openAddModal = (comboTarget = null) => {
        form.setFieldsValue({ currencyId: getCurrencySelectValue(caseCurrency) });
        setComboAddTarget(comboTarget);
        setAddModal(true);
      };

      const closeAddModal = () => {
        setAddModal(false);
        setComboAddTarget(null);
        form.resetFields();
      };
```

Replace with:

```js
      const openAddModal = (comboTarget = null) => {
        form.setFieldsValue({ currencyId: getCurrencySelectValue(caseCurrency) });
        setComboAddTarget(comboTarget);
        // A per-combo-section "+ Add service" click always goes straight to
        // the Individual Service tab (comboTarget already picks the target
        // combo) — the Apply Combo tab is only reachable from the global
        // "+ Add Service" button, where comboTarget is null.
        setAddModalTab("individual");
        setComboSubTab("select");
        setComboSearch("");
        setAddModal(true);
      };

      const closeAddModal = () => {
        setAddModal(false);
        setComboAddTarget(null);
        setAddModalTab("individual");
        form.resetFields();
      };
```

- [ ] **Step 4: Add the VND-conversion helper for a combo's catalog price**

Add this near `createOneCaseService` (after it, before the Add modal JSX):

```js
      // Converts a combo's own packageSubTotal (which may be quoted in a
      // non-VND currency on the serviceCombos record) into VND, reusing the
      // same buildServicePricingPayload math every per-row price conversion
      // in this file already goes through — treats the flat amount as a
      // single line item (quantity 1, vat 0) purely to borrow its currency
      // conversion, not its line-pricing semantics.
      const convertComboSubTotalToVnd = async (subTotal, comboRecord) => {
        const amt = parseNum(subTotal);
        if (!amt) return 0;
        const comboCurrency = currencyFromRecord(comboRecord, currencies, vndCurrency);
        const comboCurrencyId = extractCurrencyId(comboCurrency);
        const vndCurrencyId = extractCurrencyId(vndCurrency);
        if (!comboCurrencyId || !vndCurrencyId || comboCurrencyId === vndCurrencyId) return amt;
        const freshRates = await fetchExchangeRatesForConversion([comboCurrencyId], vndCurrencyId);
        const mergedRates = mergeExchangeRates(exchangeRates, freshRates);
        const pricing = buildServicePricingPayload({
          pricingMode: PRICING_MODE_LINE,
          basePrice: amt,
          quantity: 1,
          vat: 0,
          currency: comboCurrency,
          vndCurrency,
          exchangeRatesToVnd: mergedRates,
          pricingDate: casePricingDate,
        });
        if (!pricing._convertible) {
          message.error(`Thiếu tỷ giá quy đổi sang VND cho combo (${getCurrencyCode(comboCurrency)}).`);
          return null;
        }
        return pricing.subTotal;
      };
```

- [ ] **Step 5: Add `applyComboFromCatalog`**

Add right after `convertComboSubTotalToVnd`:

```js
      const applyComboFromCatalog = async (combo) => {
        const items = combo.serviceComboItems || [];
        if (!items.length) {
          message.warning("This combo has no services.");
          return;
        }
        setApplyingCombo(true);
        try {
          const comboIdVal = extractId(combo.id);
          const comboSubTotalVnd = await convertComboSubTotalToVnd(combo.packageSubTotal, combo);
          if (comboSubTotalVnd === null) return; // conversion failed, already messaged

          const createdIds = [];
          for (const item of items) {
            const svc = item.services || {};
            const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
            for (let i = 0; i < unitCount; i++) {
              const { id } = await createOneCaseService({
                serviceId: svc.id || null,
                serviceName: svc.serviceName || "",
                serviceType: svc.serviceType || "",
                description: svc.description || "",
                basePrice: 0,
                vat: 0,
                currencyId: extractCurrencyId(vndCurrency),
                comboTarget: { comboId: comboIdVal, comboName: combo.comboName || "Combo" },
              }, { skipReload: true });
              if (id) createdIds.push(id);
            }
          }
          if (!createdIds.length) {
            message.error("Could not create any services for this combo.");
            return;
          }

          // Fold the combo's own price into the case's single combined
          // package total (never a separate per-combo total) — same rule
          // the case-wide footer already enforces.
          const currentSubTotal = servicePricingSummary.packageTotals.subTotal;
          const patch = buildPackageSummaryPatch("packageSubTotal", currentSubTotal + comboSubTotalVnd);
          const newRowStubs = createdIds.map((id) => ({ id }));
          await applyPackageSummaryPatch([...servicePricingSummary.allPackageRows, ...newRowStubs], patch);

          message.success(`Applied combo "${combo.comboName}".`);
          closeAddModal();
        } catch (err) {
          console.error(err);
          message.error("Error applying combo: " + (err.message || ""));
        } finally {
          setApplyingCombo(false);
        }
      };
```

- [ ] **Step 6: Wrap the existing modal body in tabs, add the catalog-select sub-tab**

Find the ADD MODAL's `React.createElement(Modal, {...}, ...)` call (search `// ADD MODAL`). Its current children start with the info box (`React.createElement("div", { style: { ...DS.infoBox, ... } }, ...)`) followed directly by the `React.createElement(Form, {...`. Wrap those two existing children in a conditional, and add the Apply Combo tab's content as the alternative branch. Concretely, change:

```js
        React.createElement(Modal, {
          title: comboAddTarget
            ? `Add service to combo: ${comboAddTarget.comboName || "Combo"}`
            : "Add service to case",
          open: addModal,
          onCancel: closeAddModal,
          onOk: () => form.submit(),
          confirmLoading: submitting,
          okText: "Save service",
          cancelText: "Cancel",
          width: 650,
          okButtonProps: { style: DS.primaryButton },
          cancelButtonProps: { style: DS.secondaryButton }
        },
          React.createElement("div", { style: { ...DS.infoBox, marginBottom: 16 } },
```

to:

```js
        React.createElement(Modal, {
          title: comboAddTarget
            ? `Add service to combo: ${comboAddTarget.comboName || "Combo"}`
            : "Add service to case",
          open: addModal,
          onCancel: closeAddModal,
          onOk: addModalTab === "individual" ? (() => form.submit()) : undefined,
          confirmLoading: submitting,
          okText: "Save service",
          cancelText: "Cancel",
          footer: addModalTab === "individual" ? undefined : null,
          width: 650,
          okButtonProps: { style: DS.primaryButton },
          cancelButtonProps: { style: DS.secondaryButton }
        },
          // The per-combo-section "+ Add service" button always opens
          // straight into the Individual Service tab with comboAddTarget
          // already set, so the Apply Combo tab only makes sense (and is
          // only shown) for the global "+ Add Service" entry point.
          !comboAddTarget && React.createElement(Segmented, {
            block: true,
            value: addModalTab,
            onChange: (v) => setAddModalTab(v),
            options: [
              { label: "Individual Service", value: "individual" },
              { label: "Apply Combo", value: "combo" },
            ],
            style: { marginBottom: 16 },
          }),
          addModalTab === "combo" && !comboAddTarget
            ? React.createElement(React.Fragment, null,
              React.createElement(Segmented, {
                value: comboSubTab,
                onChange: (v) => setComboSubTab(v),
                options: [
                  { label: "Select from catalog", value: "select" },
                  { label: "Create ad-hoc", value: "adhoc" },
                ],
                style: { marginBottom: 16 },
              }),
              comboSubTab === "select"
                ? React.createElement(React.Fragment, null,
                  React.createElement(Input, {
                    placeholder: "Search combo name...",
                    value: comboSearch,
                    onChange: (e) => setComboSearch(e.target.value),
                    style: { marginBottom: 12, borderRadius: DS.radius.sm },
                    allowClear: true,
                  }),
                  React.createElement("div", { style: { maxHeight: 360, overflowY: "auto" } },
                    comboCatalog.length === 0
                      ? React.createElement(Empty, { description: "No combos available" })
                      : comboCatalog
                        .filter((c) => normalizeLookupText(c.comboName || "").includes(normalizeLookupText(comboSearch)))
                        .map((c) => React.createElement("div", {
                          key: c.id,
                          style: {
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: DS.radius.sm, marginBottom: 8,
                          },
                        },
                          React.createElement("div", null,
                            React.createElement("div", { style: { fontWeight: 600 } }, c.comboName || `Combo #${c.id}`),
                            React.createElement("div", { style: { fontSize: 12, color: C.textSub } },
                              `${(c.serviceComboItems || []).length} service(s) Â· ${formatMoney(c.packageSubTotal, currencyFromRecord(c, currencies, vndCurrency))}`)
                          ),
                          React.createElement(Button, {
                            size: "small", type: "primary", loading: applyingCombo,
                            onClick: () => applyComboFromCatalog(c),
                          }, "Apply")
                        ))
                  )
                )
                : renderAdhocComboTab()
            )
            : React.createElement(React.Fragment, null,
              React.createElement("div", { style: { ...DS.infoBox, marginBottom: 16 } },
```

(the rest of the original `Form` block continues unchanged after this point — it now sits inside the trailing `React.createElement(React.Fragment, null, ...)` opened above; make sure the JSX's closing parens still balance after this wrap. `renderAdhocComboTab` is defined in Task 5.)

- [ ] **Step 7: Syntax check**

Run: `node --check "All Module/Case/CaseServices.js"`
Expected: FAIL — `renderAdhocComboTab is not defined` only shows at runtime, not at parse time, so this step should actually pass `node --check` (it's a reference, not a syntax error) as long as parens balance. If it fails with a syntax error, fix bracket balancing before proceeding to Task 5.

- [ ] **Step 8: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "feat(case-services): add Apply Combo catalog-select tab to the Add modal"
```

---

## Task 5: Case — ad-hoc combo sub-tab

**Files:**
- Modify: `All Module/Case/CaseServices.js` — state near the Task 4 state block
- Modify: `All Module/Case/CaseServices.js` — add `renderAdhocComboTab` and `applyAdhocCombo` near `applyComboFromCatalog`

**Interfaces:**
- Produces: `adhocComboName` (state), `adhocServiceIds` (state, array), `renderAdhocComboTab()` (returns a React element, referenced by Task 4 Step 6), `applyAdhocCombo()` (async handler).
- Consumes: `serviceCatalog` (existing), `createOneCaseService`, `applyPackageSummaryPatch`, `buildPackageSummaryPatch`, `servicePricingSummary`.

- [ ] **Step 1: Add ad-hoc state**

Add right after the Task 4 state block (`applyingCombo`):

```js
      const [adhocComboName, setAdhocComboName] = useState("");
      const [adhocServiceIds, setAdhocServiceIds] = useState([]);
```

Reset them in `closeAddModal` (add two lines to the function from Task 4 Step 3):

```js
      const closeAddModal = () => {
        setAddModal(false);
        setComboAddTarget(null);
        setAddModalTab("individual");
        setAdhocComboName("");
        setAdhocServiceIds([]);
        form.resetFields();
      };
```

- [ ] **Step 2: Add `applyAdhocCombo`**

Add right after `applyComboFromCatalog` (Task 4 Step 5):

```js
      // Ad-hoc combos never get a real comboId — they group post-reload via
      // getComboGroupKey's comboName fallback (Task 1). They contribute 0 to
      // the package subtotal; the user adjusts it by hand afterward via the
      // totals panel, same as the existing single-add flow already expects.
      const applyAdhocCombo = async () => {
        const name = adhocComboName.trim();
        if (!name) {
          message.warning("Please enter a combo name.");
          return;
        }
        if (!adhocServiceIds.length) {
          message.warning("Please select at least one service.");
          return;
        }
        setApplyingCombo(true);
        try {
          const createdIds = [];
          for (const svcId of adhocServiceIds) {
            const svc = serviceCatalog.find((s) => String(s.id) === String(svcId));
            if (!svc) continue;
            const { id } = await createOneCaseService({
              serviceId: svc.id,
              serviceName: svc.serviceName || svc.name || "",
              serviceType: svc.serviceType || "",
              description: svc.description || "",
              basePrice: 0,
              vat: 0,
              currencyId: extractCurrencyId(vndCurrency),
              comboTarget: { comboId: null, comboName: name },
            }, { skipReload: true });
            if (id) createdIds.push(id);
          }
          if (!createdIds.length) {
            message.error("Could not create any services for this combo.");
            return;
          }
          const newRowStubs = createdIds.map((id) => ({ id }));
          await loadData();
          message.success(`Created ad-hoc combo "${name}".`);
          closeAddModal();
          void newRowStubs; // no price to fold in — see task doc
        } catch (err) {
          console.error(err);
          message.error("Error creating combo: " + (err.message || ""));
        } finally {
          setApplyingCombo(false);
        }
      };
```

- [ ] **Step 3: Add `renderAdhocComboTab`**

Add right after `applyAdhocCombo`:

```js
      const renderAdhocComboTab = () => React.createElement(React.Fragment, null,
        React.createElement("div", { style: { marginBottom: 12 } },
          React.createElement("div", { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, "Combo name"),
          React.createElement(Input, {
            value: adhocComboName,
            onChange: (e) => setAdhocComboName(e.target.value),
            placeholder: "E.g. Business incorporation consulting package...",
            style: { borderRadius: DS.radius.sm },
          })
        ),
        React.createElement("div", { style: { marginBottom: 16 } },
          React.createElement("div", { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, "Services in this combo"),
          React.createElement(Select, {
            mode: "multiple",
            value: adhocServiceIds,
            onChange: (v) => setAdhocServiceIds(v),
            showSearch: true,
            optionFilterProp: "children",
            style: { width: "100%" },
            placeholder: "Select services to bundle...",
          }, serviceCatalog.map((s) => React.createElement(Select.Option, {
            key: s.id, value: s.id,
          }, s.serviceName || s.name || `Service #${s.id}`)))
        ),
        React.createElement(Button, {
          type: "primary", loading: applyingCombo, onClick: applyAdhocCombo, style: DS.primaryButton,
        }, "Create combo")
      );
```

- [ ] **Step 4: Syntax check**

Run: `node --check "All Module/Case/CaseServices.js"`
Expected: no output (success).

- [ ] **Step 5: Manual QA**

Open a case with no existing combos. Click "+ Add Service" -> Apply Combo -> Select from catalog -> pick a combo with 2+ items -> Apply. Confirm: a new "COMBO" section appears with the right item count; the case's Package subtotal (footer panel) increased by the combo's own price; reload the page and confirm the section is still grouped. Repeat with Create ad-hoc: name a combo, pick 2 services, Create; confirm the section appears (Package subtotal unchanged, since ad-hoc contributes 0); reload and confirm the section is STILL grouped (this specifically exercises the Task 1 comboName fallback).

- [ ] **Step 6: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "feat(case-services): add ad-hoc combo builder to the Apply Combo tab"
```

---

## Task 6: Contract — comboName-fallback grouping key

**Files:**
- Modify: `All Module/Contract/ContractServices.js` (the `comboGroups`/`groupedActiveRows` construction block added in the prior combo port, and `removeCombo`/the "Remove combo" call site)

**Interfaces:**
- Produces: `getComboGroupKey(row)` (module-level or component-level; same contract as Task 1).
- Header pseudo-rows gain `_groupKey`; `comboId` on the header stays the real nullable id.

- [ ] **Step 1: Locate and rewrite the grouping block**

Find the block that currently reads (added in the earlier combo port to this file):

```js
  const comboGroups = new Map();
  for (const row of activeRows) {
    const comboIdVal = extractId(row.comboId) || extractId(row.serviceCombo);
    if (!comboIdVal) continue;
    if (!comboGroups.has(comboIdVal)) comboGroups.set(comboIdVal, []);
    comboGroups.get(comboIdVal).push(row);
  }
  const emittedCombos = new Set();
  const groupedActiveRows = [];
  let displaySeq = 0;
  for (const row of activeRows) {
    const comboIdVal = extractId(row.comboId) || extractId(row.serviceCombo);
    if (!comboIdVal) {
      displaySeq += 1;
      groupedActiveRows.push({ ...row, _displayIndex: displaySeq });
      continue;
    }
    if (emittedCombos.has(comboIdVal)) continue;
    emittedCombos.add(comboIdVal);
    const groupRows = comboGroups.get(comboIdVal);
    groupedActiveRows.push({
      id: `combo-header-${comboIdVal}`,
      _isComboHeader: true,
      comboId: comboIdVal,
      comboName: row.comboName || 'Combo',
      _comboCount: groupRows.length,
    });
    for (const r of groupRows) {
      displaySeq += 1;
      groupedActiveRows.push({ ...r, _displayIndex: displaySeq });
    }
  }
```

Replace with:

```js
  // Real catalog combos group by comboId. Ad-hoc combos never get a real
  // comboId (matches *CreateForm.js's own behavior), so they fall back to
  // grouping by comboName. Two independently-applied ad-hoc combos sharing
  // the exact same name will visually merge into one section â€” an accepted,
  // documented limitation (see spec).
  const getComboGroupKey = (row) => {
    const comboIdVal = extractId(row.comboId) || extractId(row.serviceCombo);
    if (comboIdVal) return `id:${comboIdVal}`;
    const name = String(row.comboName || '').trim();
    return name ? `name:${name}` : null;
  };

  const comboGroups = new Map();
  for (const row of activeRows) {
    const key = getComboGroupKey(row);
    if (!key) continue;
    if (!comboGroups.has(key)) comboGroups.set(key, []);
    comboGroups.get(key).push(row);
  }
  const emittedCombos = new Set();
  const groupedActiveRows = [];
  let displaySeq = 0;
  for (const row of activeRows) {
    const key = getComboGroupKey(row);
    if (!key) {
      displaySeq += 1;
      groupedActiveRows.push({ ...row, _displayIndex: displaySeq });
      continue;
    }
    if (emittedCombos.has(key)) continue;
    emittedCombos.add(key);
    const groupRows = comboGroups.get(key);
    groupedActiveRows.push({
      id: `combo-header-${key}`,
      _isComboHeader: true,
      _groupKey: key,
      comboId: extractId(row.comboId) || extractId(row.serviceCombo) || null,
      comboName: row.comboName || 'Combo',
      _comboCount: groupRows.length,
    });
    for (const r of groupRows) {
      displaySeq += 1;
      groupedActiveRows.push({ ...r, _displayIndex: displaySeq });
    }
  }
```

- [ ] **Step 2: Update `removeCombo` to match on the group key**

Find:

```js
  const removeCombo = (comboId) => {
    if (isLocked) { message.warning('ðŸ”’ Há»£p Ä‘á»“ng Ä‘Ã£ Ä‘Æ°á»£c kÃ½ hoáº·c Ä‘ang thá»±c hiá»‡n â€” khÃ´ng thá»ƒ xoÃ¡ dá»‹ch vá»¥'); return; }
    setRows(prev => prev
      .map((r) => {
        const rComboId = extractId(r.comboId) || extractId(r.serviceCombo);
        if (String(rComboId || '') !== String(comboId)) return r;
        return r._isNew ? null : { ...r, _deleted: true };
      })
      .filter(Boolean));
    setDirty(true);
  };
```

Replace with:

```js
  const removeCombo = (groupKey) => {
    if (isLocked) { message.warning('ðŸ”’ Há»£p Ä‘á»“ng Ä‘Ã£ Ä‘Æ°á»£c kÃ½ hoáº·c Ä‘ang thá»±c hiá»‡n â€” khÃ´ng thá»ƒ xoÃ¡ dá»‹ch vá»¥'); return; }
    setRows(prev => prev
      .map((r) => {
        if (getComboGroupKey(r) !== groupKey) return r;
        return r._isNew ? null : { ...r, _deleted: true };
      })
      .filter(Boolean));
    setDirty(true);
  };
```

- [ ] **Step 3: Update the "Remove combo" button's call site**

In `renderComboHeaderBar`, find `onConfirm: () => removeCombo(record.comboId),` and replace with `onConfirm: () => removeCombo(record._groupKey),`.

- [ ] **Step 4: Syntax check**

Run: `node --check "All Module/Contract/ContractServices.js"`
Expected: no output (success).

- [ ] **Step 5: Manual QA**

Open a Contract with an existing combo section, confirm it still renders/removes correctly (regression check).

- [ ] **Step 6: Commit**

```bash
git add "All Module/Contract/ContractServices.js"
git commit -m "feat(contract-services): group combo-less rows by comboName as a fallback"
```

---

## Task 7: Contract — combo catalog fetch

**Files:**
- Modify: `All Module/Contract/ContractServices.js` — add state near `const [svcOpts, setSvcOpts] = useState([]);`
- Modify: `All Module/Contract/ContractServices.js` — `reload()` (fetch alongside `fetchCSvcs`/`fetchSvcOptions`)

**Interfaces:**
- Produces: `comboCatalog` (state, same shape as Task 2).

- [ ] **Step 1: Add state**

Find `const [svcOpts, setSvcOpts] = useState([]);` and add right after it:

```js
  const [comboCatalog, setComboCatalog] = useState([]);
```

- [ ] **Step 2: Fetch combos in `reload()`**

Find, inside `reload`:

```js
    const [svcs, opts, currentContract, currs] = await Promise.all([
      fetchCSvcs(),
      fetchSvcOptions(),
      fetchContract(),
      fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
    ]);
```

Replace with:

```js
    const [svcs, opts, currentContract, currs, comboList] = await Promise.all([
      fetchCSvcs(),
      fetchSvcOptions(),
      fetchContract(),
      fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
      fetchComboCatalog(),
    ]);
    setComboCatalog(comboList);
```

- [ ] **Step 3: Add the `fetchComboCatalog` module-level function**

Find `async function fetchCSvcs() {` (module scope, before the component). Add a sibling function right after it (after `fetchCSvcs`'s closing `}`):

```js
async function fetchComboCatalog() {
  try {
    const res = await ctx.api.request({
      url: 'serviceCombos:list',
      params: {
        filter: JSON.stringify({ isActive: { $eq: true } }),
        appends: ['serviceComboItems.services'],
        pageSize: 100,
      },
    });
    const list = res?.data?.data || [];
    return list.filter((c) => (c.serviceComboItems || []).length > 0);
  } catch { return []; }
}
```

- [ ] **Step 4: Syntax check**

Run: `node --check "All Module/Contract/ContractServices.js"`
Expected: no output (success).

- [ ] **Step 5: Manual QA**

Temporarily log `comboCatalog` after `setComboCatalog(comboList)`, reload the block in the browser, confirm combos with items appear in the console, remove the log.

- [ ] **Step 6: Commit**

```bash
git add "All Module/Contract/ContractServices.js"
git commit -m "feat(contract-services): fetch the serviceCombos catalog on load"
```

---

## Task 8: Contract — Apply Combo modal (catalog select + ad-hoc), local apply handlers

**Files:**
- Modify: `All Module/Contract/ContractServices.js` — antd destructure (add `Segmented` if missing — it's already imported; add `Empty`)
- Modify: `All Module/Contract/ContractServices.js` — state near `showSvcModal`
- Modify: `All Module/Contract/ContractServices.js` — add a new `React.createElement(Modal, {...})` for Apply Combo, and a toolbar button to open it

**Interfaces:**
- Produces: `showComboModal` (state), `comboSubTab`, `comboSearch`, `adhocComboName`, `adhocServiceIds`, `applyingCombo` (state), `applyComboFromCatalog(combo)`, `applyAdhocCombo()` (local-row versions — no API calls until the existing Save button).
- Consumes: `comboCatalog` (Task 7), `getComboGroupKey` (Task 6, for consistency though not directly called here), `fetchExchangeRatesForConversion`, `buildServicePricingPayload`, `currencyFromRecord`, `extractCurrencyId`, `vndCurrency`, `exchangeRates`, `pricingDate`, `contractCurrency`, `PRICING_MODE_PACKAGE`, `svcOpts`, `setRows`, `setPricingMode`, `setPackageSubTotal`, `setDirty`.

- [ ] **Step 1: Confirm/add `Empty` to the antd destructure**

Find `const { Spin, Typography, message, Modal, Table, Tag, Button, Tooltip, Card, Space, Segmented, theme, Popconfirm } = ctx.antd;` (already updated by the earlier combo port) and add `Empty`:

```js
const { Spin, Typography, message, Modal, Table, Tag, Button, Tooltip, Card, Space, Segmented, theme, Popconfirm, Empty } = ctx.antd;
```

- [ ] **Step 2: Add state**

Find `const [showSvcModal, setShowSvcModal] = useState(false);` and add after it:

```js
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboSubTab, setComboSubTab] = useState('select');
  const [comboSearch, setComboSearch] = useState('');
  const [adhocComboName, setAdhocComboName] = useState('');
  const [adhocServiceIds, setAdhocServiceIds] = useState([]);
  const [applyingCombo, setApplyingCombo] = useState(false);

  const openComboModal = () => {
    if (isLocked) { message.warning('ðŸ”’ Há»£p Ä‘á»“ng Ä‘Ã£ Ä‘Æ°á»£c kÃ½ hoáº·c Ä‘ang thá»±c hiá»‡n â€” khÃ´ng thá»ƒ thÃªm dá»‹ch vá»¥'); return; }
    setComboSubTab('select');
    setComboSearch('');
    setAdhocComboName('');
    setAdhocServiceIds([]);
    setShowComboModal(true);
  };
```

- [ ] **Step 3: Add the VND-conversion helper**

Add right after `openComboModal` (same file already has `fetchExchangeRatesForConversion` module-level and `exchangeRates`/`vndCurrency`/`pricingDate` in scope from the existing per-row conversion logic):

```js
  const convertComboSubTotalToVnd = async (subTotal, comboRecord) => {
    const amt = parseNum(subTotal);
    if (!amt) return 0;
    const comboCurrency = currencyFromRecord(comboRecord, currencies, vndCurrency);
    const comboCurrencyId = extractCurrencyId(comboCurrency);
    const vndCurrencyId = extractCurrencyId(vndCurrency);
    if (!comboCurrencyId || !vndCurrencyId || comboCurrencyId === vndCurrencyId) return amt;
    const freshRates = await fetchExchangeRatesForConversion([comboCurrencyId], vndCurrencyId);
    const mergedRates = [...exchangeRates, ...freshRates];
    const pricing = buildServicePricingPayload({
      pricingMode: PRICING_MODE_LINE,
      basePrice: amt,
      quantity: 1,
      vat: 0,
      currency: comboCurrency,
      vndCurrency,
      exchangeRatesToVnd: mergedRates,
      pricingDate,
    });
    if (!pricing._convertible) {
      message.error(`Thiáº¿u tá»· giÃ¡ quy Ä‘á»•i sang VND cho combo (${getCurrencyCode(comboCurrency)}).`);
      return null;
    }
    return pricing.subTotal;
  };
```

- [ ] **Step 4: Add the local-row apply handlers**

Add right after `convertComboSubTotalToVnd`:

```js
  // Local-only: pushes rows into `rows` and bumps `packageSubTotal` state,
  // exactly like addRow already does for a single service â€” nothing hits
  // the API until the existing "Save & Update contract" button.
  const applyComboFromCatalog = async (combo) => {
    const items = combo.serviceComboItems || [];
    if (!items.length) { message.warning('This combo has no services.'); return; }
    setApplyingCombo(true);
    try {
      const comboIdVal = extractId(combo.id);
      const comboSubTotalVnd = await convertComboSubTotalToVnd(combo.packageSubTotal, combo);
      if (comboSubTotalVnd === null) return;

      const vndCurrencyId = extractCurrencyId(vndCurrency);
      const newRows = [];
      items.forEach((item) => {
        const svc = item.services || {};
        const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
        for (let i = 0; i < unitCount; i++) {
          newRows.push({
            id: Date.now() + Math.random(),
            serviceId: svc.id || null,
            _basePrice: 0, _quantity: 1, _vat: 0,
            _svcName: svc.serviceName || '', _serviceType: svc.serviceType || '', _description: svc.description || '',
            currencyId: vndCurrencyId || null, _currencyId: vndCurrencyId ? String(vndCurrencyId) : '',
            _isNew: true, _deleted: false, _isCustom: !svc.id,
            comboId: comboIdVal, serviceCombo: comboIdVal, comboName: combo.comboName || 'Combo',
          });
        }
      });

      setRows(prev => {
        const base = isPackageMode ? prev : prev.map(r => ({ ...r, _basePrice: 0, _vat: 0 }));
        return [...base, ...newRows];
      });
      if (!isPackageMode) setPricingMode(PRICING_MODE_PACKAGE);
      setPackageSubTotal(prev => parseNum(prev) + comboSubTotalVnd);
      setDirty(true);
      message.success(`Applied combo "${combo.comboName}". Click "Save & Update contract" to persist.`);
      setShowComboModal(false);
    } catch (err) {
      console.error(err);
      message.error('Error applying combo: ' + (err.message || ''));
    } finally {
      setApplyingCombo(false);
    }
  };

  // Ad-hoc combos contribute 0 to packageSubTotal â€” the user adjusts it by
  // hand afterward via the totals panel.
  const applyAdhocCombo = () => {
    const name = adhocComboName.trim();
    if (!name) { message.warning('Please enter a combo name.'); return; }
    if (!adhocServiceIds.length) { message.warning('Please select at least one service.'); return; }
    const vndCurrencyId = extractCurrencyId(vndCurrency);
    const newRows = adhocServiceIds.map((svcId) => {
      const svc = svcOpts.find((o) => String(o.id) === String(svcId));
      return {
        id: Date.now() + Math.random(),
        serviceId: svc?.id || null,
        _basePrice: 0, _quantity: 1, _vat: 0,
        _svcName: svc?.serviceName || svc?.name || '', _serviceType: svc?.serviceType || '', _description: svc?.description || '',
        currencyId: vndCurrencyId || null, _currencyId: vndCurrencyId ? String(vndCurrencyId) : '',
        _isNew: true, _deleted: false, _isCustom: !svc?.id,
        comboId: null, serviceCombo: null, comboName: name,
      };
    });
    setRows(prev => {
      const base = isPackageMode ? prev : prev.map(r => ({ ...r, _basePrice: 0, _vat: 0 }));
      return [...base, ...newRows];
    });
    if (!isPackageMode) setPricingMode(PRICING_MODE_PACKAGE);
    setDirty(true);
    message.success(`Created ad-hoc combo "${name}". Click "Save & Update contract" to persist.`);
    setShowComboModal(false);
  };
```

- [ ] **Step 5: Add the toolbar button**

Find (in the `Card`'s `extra:` `Space`, next to the existing "Add service" button):

```js
      !isLocked && React.createElement(Button, {
        size: 'small',
        type: 'primary',
        onClick: () => addRow(),
      }, 'Add service'),
```

Add right after it:

```js
      !isLocked && React.createElement(Button, {
        size: 'small',
        onClick: openComboModal,
      }, 'Apply Combo'),
```

- [ ] **Step 6: Add the modal JSX**

Add a new top-level `React.createElement(Modal, {...})` as a sibling of the existing "SERVICE SELECTION" modal (find `React.createElement(Modal, { title: null, open: showSvcModal, ...` and add this new modal right after that modal's closing `),`):

```js
    React.createElement(Modal, {
      title: 'Apply Combo',
      open: showComboModal,
      onCancel: () => setShowComboModal(false),
      footer: null,
      width: 700,
    },
      React.createElement(Segmented, {
        value: comboSubTab,
        onChange: (v) => setComboSubTab(v),
        options: [
          { label: 'Select from catalog', value: 'select' },
          { label: 'Create ad-hoc', value: 'adhoc' },
        ],
        style: { marginBottom: 16 },
      }),
      comboSubTab === 'select'
        ? React.createElement(React.Fragment, null,
          React.createElement(Input, {
            placeholder: 'Search combo name...',
            value: comboSearch,
            onChange: (e) => setComboSearch(e.target.value),
            style: { marginBottom: 12, borderRadius: DS.radius.sm },
            allowClear: true,
          }),
          React.createElement('div', { style: { maxHeight: 380, overflowY: 'auto' } },
            comboCatalog.length === 0
              ? React.createElement(Empty, { description: 'No combos available' })
              : comboCatalog
                .filter((c) => normalizeLookupText(c.comboName || '').includes(normalizeLookupText(comboSearch)))
                .map((c) => React.createElement('div', {
                  key: c.id,
                  style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: DS.radius.sm, marginBottom: 8,
                  },
                },
                  React.createElement('div', null,
                    React.createElement('div', { style: { fontWeight: 600 } }, c.comboName || `Combo #${c.id}`),
                    React.createElement('div', { style: { fontSize: 12, color: C.textSub } },
                      `${(c.serviceComboItems || []).length} service(s) Â· ${formatMoney(c.packageSubTotal, currencyFromRecord(c, currencies, vndCurrency))}`)
                  ),
                  React.createElement(Button, {
                    size: 'small', type: 'primary', loading: applyingCombo,
                    onClick: () => applyComboFromCatalog(c),
                  }, 'Apply')
                ))
          )
        )
        : React.createElement(React.Fragment, null,
          React.createElement('div', { style: { marginBottom: 12 } },
            React.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Combo name'),
            React.createElement(Input, {
              value: adhocComboName,
              onChange: (e) => setAdhocComboName(e.target.value),
              placeholder: 'E.g. Business incorporation consulting package...',
              style: { borderRadius: DS.radius.sm },
            })
          ),
          React.createElement('div', { style: { marginBottom: 16 } },
            React.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Services in this combo'),
            React.createElement(Select, {
              mode: 'multiple',
              value: adhocServiceIds,
              onChange: (v) => setAdhocServiceIds(v),
              showSearch: true,
              optionFilterProp: 'children',
              style: { width: '100%' },
              placeholder: 'Select services to bundle...',
            }, svcOpts.map((s) => React.createElement(Select.Option, {
              key: s.id, value: s.id,
            }, s.serviceName || s.name || `Service #${s.id}`)))
          ),
          React.createElement(Button, {
            type: 'primary', onClick: applyAdhocCombo, style: DS.primaryButton,
          }, 'Create combo')
        )
    ),
```

- [ ] **Step 7: Syntax check**

Run: `node --check "All Module/Contract/ContractServices.js"`
Expected: no output (success).

- [ ] **Step 8: Manual QA**

Open a Contract with no combos. Click "Apply Combo" -> Select from catalog -> pick a combo -> Apply. Confirm: a new "COMBO" section appears in the table with an "Unsaved" tag on the Card title (the existing `dirty` indicator), the totals panel's Package subtotal increased by the combo's price. Click "Save & Update contract" and confirm it persists (reload the page, section still there with correct comboId). Repeat for Create ad-hoc, confirm it persists and stays grouped after reload (comboName fallback).

- [ ] **Step 9: Commit**

```bash
git add "All Module/Contract/ContractServices.js"
git commit -m "feat(contract-services): add Apply Combo modal (catalog select + ad-hoc)"
```

---

## Task 9: Quotation — comboName-fallback grouping key

**Files:**
- Modify: `All Module/Quotation/QuotationServices.js` (same block shape as Task 6, `QuotationServices.js` equivalents)

Repeat Task 6 verbatim against `All Module/Quotation/QuotationServices.js` — the block added during the earlier combo port to this file is structurally identical (`comboGroups`/`groupedActiveRows`/`removeCombo`/`renderComboHeaderBar`'s `onConfirm: () => removeCombo(record.comboId)`). Apply the same three replacements (grouping block, `removeCombo` signature + filter, the "Remove combo" call site), using `activeRows` as the source array (same variable name as Contract).

- [ ] **Step 1-3: Apply the Task 6 Steps 1-3 edits verbatim to `QuotationServices.js`**
- [ ] **Step 4: Syntax check** — Run: `node --check "All Module/Quotation/QuotationServices.js"`
- [ ] **Step 5: Manual QA** — same as Task 6 Step 5, on a Quotation with an existing combo.
- [ ] **Step 6: Commit**

```bash
git add "All Module/Quotation/QuotationServices.js"
git commit -m "feat(quotation-services): group combo-less rows by comboName as a fallback"
```

---

## Task 10: Quotation — combo catalog fetch

**Files:**
- Modify: `All Module/Quotation/QuotationServices.js` — state near `const [svcOpts, setSvcOpts] = useState([]);`
- Modify: `All Module/Quotation/QuotationServices.js` — `reload()` and a new module-level `fetchComboCatalog`

**Interfaces:**
- Produces: `comboCatalog` (state, same shape as Task 2/7).

- [ ] **Step 1: Add state**

Find `const [svcOpts, setSvcOpts] = useState([]);` in the component, add after it:

```js
  const [comboCatalog, setComboCatalog] = useState([]);
```

- [ ] **Step 2: Fetch combos in `reload()`**

Find, inside `reload`:

```js
    const [svcs, opts, quote, currs] = await Promise.all([
      fetchQSvcs(),
      fetchSvcOptions(),
      fetchQuotation(),
      fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
    ]);
```

Replace with:

```js
    const [svcs, opts, quote, currs, comboList] = await Promise.all([
      fetchQSvcs(),
      fetchSvcOptions(),
      fetchQuotation(),
      fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
      fetchComboCatalog(),
    ]);
    setComboCatalog(comboList);
```

- [ ] **Step 3: Add `fetchComboCatalog` (module scope)**

Find `async function fetchQSvcs() {` and add a sibling function right after its closing `}`:

```js
async function fetchComboCatalog() {
  try {
    const res = await ctx.api.request({
      url: 'serviceCombos:list',
      params: {
        filter: JSON.stringify({ isActive: { $eq: true } }),
        appends: ['serviceComboItems.services'],
        pageSize: 100,
      },
    });
    const list = res?.data?.data || [];
    return list.filter((c) => (c.serviceComboItems || []).length > 0);
  } catch { return []; }
}
```

- [ ] **Step 4: Syntax check** — Run: `node --check "All Module/Quotation/QuotationServices.js"`
- [ ] **Step 5: Manual QA** — same as Task 7 Step 5.
- [ ] **Step 6: Commit**

```bash
git add "All Module/Quotation/QuotationServices.js"
git commit -m "feat(quotation-services): fetch the serviceCombos catalog on load"
```

---

## Task 11: Quotation — Apply Combo modal (catalog select + ad-hoc), local apply handlers

**Files:**
- Modify: `All Module/Quotation/QuotationServices.js` — antd destructure (add `Empty`)
- Modify: `All Module/Quotation/QuotationServices.js` — state near `showSvcModal`
- Modify: `All Module/Quotation/QuotationServices.js` — toolbar button + new Modal JSX

Repeat Task 8 against `All Module/Quotation/QuotationServices.js` with these substitutions throughout the Task 8 code blocks: `contractCurrency` → `quotationCurrency`, `isLocked`'s warning text → `'ðŸ”’ BÃ¡o giÃ¡ Ä‘Ã£ Ä‘Æ°á»£c Ä‘áº·t hÃ ng â€” khÃ´ng thá»ƒ thÃªm dá»‹ch vá»¥ má»›i'` (matches this file's existing `addRow` message), `'Save & Update contract'` → `'Save & Update quotation'` in the two success messages, `PRICING_MODE_LINE`/`PRICING_MODE_PACKAGE`/`buildServicePricingPayload`/`fetchExchangeRatesForConversion`/`currencyFromRecord`/`extractCurrencyId`/`getCurrencyCode`/`parseNum`/`extractId`/`normalizeLookupText`/`formatMoney` are the same names already present in this file (confirmed identical module-level helper set to Contract).

- [ ] **Step 1: Add `Empty` to the antd destructure**

Find `const { Spin, Typography, message, Modal, Table, Tag, Button, Tooltip, Card, Space, Segmented, theme, Popconfirm } = ctx.antd;` and add `Empty`:

```js
const { Spin, Typography, message, Modal, Table, Tag, Button, Tooltip, Card, Space, Segmented, theme, Popconfirm, Empty } = ctx.antd;
```

- [ ] **Step 2: Add state and `openComboModal`**

Find `const [showSvcModal, setShowSvcModal] = useState(false);`, add after it:

```js
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboSubTab, setComboSubTab] = useState('select');
  const [comboSearch, setComboSearch] = useState('');
  const [adhocComboName, setAdhocComboName] = useState('');
  const [adhocServiceIds, setAdhocServiceIds] = useState([]);
  const [applyingCombo, setApplyingCombo] = useState(false);

  const openComboModal = () => {
    if (isLocked) { message.warning('ðŸ”’ BÃ¡o giÃ¡ Ä‘Ã£ Ä‘Æ°á»£c Ä‘áº·t hÃ ng â€” khÃ´ng thá»ƒ thÃªm dá»‹ch vá»¥ má»›i'); return; }
    setComboSubTab('select');
    setComboSearch('');
    setAdhocComboName('');
    setAdhocServiceIds([]);
    setShowComboModal(true);
  };
```

- [ ] **Step 3: Add `convertComboSubTotalToVnd`, `applyComboFromCatalog`, `applyAdhocCombo`**

Add right after `openComboModal`, using the exact same three function bodies as Task 8 Steps 3-4, with `contractCurrency` → `quotationCurrency`, and the two success messages changed to say `'Save & Update quotation'`:

```js
  const convertComboSubTotalToVnd = async (subTotal, comboRecord) => {
    const amt = parseNum(subTotal);
    if (!amt) return 0;
    const comboCurrency = currencyFromRecord(comboRecord, currencies, vndCurrency);
    const comboCurrencyId = extractCurrencyId(comboCurrency);
    const vndCurrencyId = extractCurrencyId(vndCurrency);
    if (!comboCurrencyId || !vndCurrencyId || comboCurrencyId === vndCurrencyId) return amt;
    const freshRates = await fetchExchangeRatesForConversion([comboCurrencyId], vndCurrencyId);
    const mergedRates = [...exchangeRates, ...freshRates];
    const pricing = buildServicePricingPayload({
      pricingMode: PRICING_MODE_LINE,
      basePrice: amt,
      quantity: 1,
      vat: 0,
      currency: comboCurrency,
      vndCurrency,
      exchangeRatesToVnd: mergedRates,
      pricingDate,
    });
    if (!pricing._convertible) {
      message.error(`Thiáº¿u tá»· giÃ¡ quy Ä‘á»•i sang VND cho combo (${getCurrencyCode(comboCurrency)}).`);
      return null;
    }
    return pricing.subTotal;
  };

  const applyComboFromCatalog = async (combo) => {
    const items = combo.serviceComboItems || [];
    if (!items.length) { message.warning('This combo has no services.'); return; }
    setApplyingCombo(true);
    try {
      const comboIdVal = extractId(combo.id);
      const comboSubTotalVnd = await convertComboSubTotalToVnd(combo.packageSubTotal, combo);
      if (comboSubTotalVnd === null) return;

      const vndCurrencyId = extractCurrencyId(vndCurrency);
      const newRows = [];
      items.forEach((item) => {
        const svc = item.services || {};
        const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
        for (let i = 0; i < unitCount; i++) {
          newRows.push({
            id: Date.now() + Math.random(),
            serviceId: svc.id || null,
            _basePrice: 0, _quantity: 1, _vat: 0,
            _svcName: svc.serviceName || '', _serviceType: svc.serviceType || '', _description: svc.description || '',
            currencyId: vndCurrencyId || null, _currencyId: vndCurrencyId ? String(vndCurrencyId) : '',
            _isNew: true, _deleted: false, _isCustom: !svc.id,
            comboId: comboIdVal, serviceCombo: comboIdVal, comboName: combo.comboName || 'Combo',
          });
        }
      });

      setRows(prev => {
        const base = isPackageMode ? prev : prev.map(r => ({ ...r, _basePrice: 0, _vat: 0 }));
        return [...base, ...newRows];
      });
      if (!isPackageMode) setPricingMode(PRICING_MODE_PACKAGE);
      setPackageSubTotal(prev => parseNum(prev) + comboSubTotalVnd);
      setDirty(true);
      message.success(`Applied combo "${combo.comboName}". Click "Save & Update quotation" to persist.`);
      setShowComboModal(false);
    } catch (err) {
      console.error(err);
      message.error('Error applying combo: ' + (err.message || ''));
    } finally {
      setApplyingCombo(false);
    }
  };

  const applyAdhocCombo = () => {
    const name = adhocComboName.trim();
    if (!name) { message.warning('Please enter a combo name.'); return; }
    if (!adhocServiceIds.length) { message.warning('Please select at least one service.'); return; }
    const vndCurrencyId = extractCurrencyId(vndCurrency);
    const newRows = adhocServiceIds.map((svcId) => {
      const svc = svcOpts.find((o) => String(o.id) === String(svcId));
      return {
        id: Date.now() + Math.random(),
        serviceId: svc?.id || null,
        _basePrice: 0, _quantity: 1, _vat: 0,
        _svcName: svc?.serviceName || svc?.name || '', _serviceType: svc?.serviceType || '', _description: svc?.description || '',
        currencyId: vndCurrencyId || null, _currencyId: vndCurrencyId ? String(vndCurrencyId) : '',
        _isNew: true, _deleted: false, _isCustom: !svc?.id,
        comboId: null, serviceCombo: null, comboName: name,
      };
    });
    setRows(prev => {
      const base = isPackageMode ? prev : prev.map(r => ({ ...r, _basePrice: 0, _vat: 0 }));
      return [...base, ...newRows];
    });
    if (!isPackageMode) setPricingMode(PRICING_MODE_PACKAGE);
    setDirty(true);
    message.success(`Created ad-hoc combo "${name}". Click "Save & Update quotation" to persist.`);
    setShowComboModal(false);
  };
```

- [ ] **Step 4: Add the toolbar button**

Find:

```js
      !isLocked && React.createElement(Button, {
        size: 'small',
        type: 'primary',
        onClick: () => addRow(),
      }, 'Add service'),
```

Add right after it:

```js
      !isLocked && React.createElement(Button, {
        size: 'small',
        onClick: openComboModal,
      }, 'Apply Combo'),
```

- [ ] **Step 5: Add the modal JSX**

Add the identical Modal block from Task 8 Step 6, unchanged (it doesn't reference `contractCurrency`/`isLocked` text directly â€” those live in the handlers already adapted in Step 3), as a sibling of the existing `showSvcModal` Modal.

- [ ] **Step 6: Syntax check** — Run: `node --check "All Module/Quotation/QuotationServices.js"`
- [ ] **Step 7: Manual QA** — same as Task 8 Step 8, on a Quotation.
- [ ] **Step 8: Commit**

```bash
git add "All Module/Quotation/QuotationServices.js"
git commit -m "feat(quotation-services): add Apply Combo modal (catalog select + ad-hoc)"
```

---

## Task 12: Cross-file manual QA pass

**Files:** none (verification only)

- [ ] **Step 1: Run `node --check` on all three files**

```bash
node --check "All Module/Case/CaseServices.js"
node --check "All Module/Contract/ContractServices.js"
node --check "All Module/Quotation/QuotationServices.js"
```

Expected: no output from any of the three.

- [ ] **Step 2: Full-flow QA checklist (repeat once per file, in the browser)**

- [ ] Apply a catalog combo with 2+ items → new section appears, correct item count, correct combined package subtotal.
- [ ] Apply a second, different catalog combo → both sections coexist, subtotal is the sum of both.
- [ ] Apply the SAME catalog combo a second time → two sections both under that combo's real `comboId` merge into one section (existing, accepted behavior — not new to this plan).
- [ ] Create an ad-hoc combo → new section appears, package subtotal unchanged (0 contribution).
- [ ] Reload the page after all of the above → every section, including the ad-hoc one, is still grouped correctly.
- [ ] Use a combo section's own "+ Add service" button (pre-existing feature) → still targets that exact section, unaffected by this plan's changes.
- [ ] Remove a combo section (both a catalog one and the ad-hoc one) → all its rows disappear/soft-delete correctly.
- [ ] For Contract/Quotation only: apply a combo, then click "Cancel changes" (not Save) → the applied combo's rows and the package subtotal bump both revert (confirms nothing leaked to the API before Save).

- [ ] **Step 3: Final commit (if the checklist surfaced no code changes, this is a no-op — skip)**

If Step 2 required fixes, commit them individually per the usual convention; otherwise this task produces no commit.

---

## Self-Review Notes (for the plan author, not a task)

- **Spec coverage:** modal structure (Individual unchanged + Apply Combo tab) — Tasks 4, 8, 11. Catalog select sub-tab — Tasks 4, 8, 11. Ad-hoc sub-tab — Tasks 5, 8, 11. comboName-fallback grouping — Tasks 1, 6, 9. Additive combo pricing to the single combined total — Tasks 4, 8, 11 (`applyPackageSummaryPatch` for Case; `setPackageSubTotal(prev => prev + ...)` for Contract/Quotation). Two persistence models — documented in the plan header and reflected in Task 3-5 (Case) vs Task 8/11 (Contract/Quotation, no API calls until Save). All spec sections have a task.
- **Type/name consistency:** `getComboGroupKey` name and return shape (`"id:<n>"` / `"name:<name>"` / `null`) is identical across Tasks 1, 6, 9. `comboCatalog` state name and shape identical across Tasks 2, 7, 10. `applyComboFromCatalog`/`applyAdhocCombo` signatures consistent within each file's own persistence model.
- **Known deviation from the spec's literal wording, called out explicitly:** for Contract/Quotation, "Apply Combo" is a **separate modal** opened by its own toolbar button, not a tab merged into the existing per-row service-picker modal (which is tightly coupled to `activeRowId` and would require a much larger, riskier restructure to merge). This still delivers the spec's actual intent — one place to add either an individual service or a combo — without touching the already-working per-row picker. Case's modal (a single flexible form, not row-scoped) *does* get the literal tabbed merge as specced.
