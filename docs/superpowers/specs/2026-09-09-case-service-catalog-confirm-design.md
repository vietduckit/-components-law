# Case Service Draft Table + "Save to Catalog?" Confirm — Design

Date: 2026-09-09
Status: Approved by user, ready for implementation planning
Sub-project 1 of 3 (Case → Contract → Quotation), each spec'd and planned separately.

## 1. Overview

Today, across Case/Contract/Quotation, typing a service name that isn't in the standardized `services` catalog just saves that name into the record's own service line-item — there is no path back into the catalog, and nothing distinguishes a "one-off custom name" from a "real standardized service" anywhere in the data. This spec adds that path for **Case** first: when the user saves the case's service list, if any line was a typed (non-catalog) name, show one confirmation listing those names and letting the user choose which ones — if any — to also create as new `services` catalog entries (scoped to the case's own company), for reuse in future cases.

**Location decision (from brainstorming):** the confirm fires once, at Save time, batched — not per-row at the moment a name is typed. This is the natural fit for `ContractServices.js`/`QuotationServices.js`, which already batch every add/edit into a local draft and only touch the API on one "Save" click. `CaseServices.js` has no such batching today — every "Add Service" immediately calls the API (`createOneCaseService`, `CaseServices.js:2691`) and every inline edit immediately calls the API (`handleInlineEdit`, `CaseServices.js:2647`). Making the confirm-at-Save model possible in Case means **first retrofitting `CaseServices.js` with the same draft/batch architecture `ContractServices.js` already has** — confirmed as in-scope by the user, not a lighter per-row alternative.

## 2. Goals

- Replace `CaseServices.js`'s current "Add Service" modal (which saves immediately on submit) with a draft-rows table matching `ContractServices.js`'s architecture: rows live in local state (`_isNew`/`_deleted`/`_isCustom` flags), inline-editable cells for description/price/currency/VAT, a per-row "Service & Type" button that opens the existing catalog-or-custom picker, and nothing hits the API until a single "Save" action.
- On Save, if any row is both `_isNew` and `_isCustom` (a typed name, not picked from the catalog), show one confirmation dialog listing those rows with a checkbox each: "Also add to the standardized services catalog?"
- For every checked row, create one new `services` catalog row (`serviceName`/`serviceType`/`description`/`basePrice` from that row) with `internalCompanyId` set from the case's own company — making it available to future cases for that company.
- Whether or not any row is promoted to the catalog, the case's own service rows save exactly as they would have without this feature — the catalog step is additive, never blocks or alters the case-side save.
- Preserve every existing Case-specific behavior that has no equivalent in `ContractServices.js`: the 3 existing name-based duplicate checks (§4.6), the mixed-mode-aware package-pricing column hiding (§4.7), per-service upload-folder provisioning, and `syncCaseTotalAmount`.

## 3. Non-goals (explicitly out of scope)

- **Contract and Quotation are separate sub-projects**, spec'd and planned after this one ships. Nothing in `ContractServices.js`/`ContractCreateForm.js`/`QuotationServices.js`/`QuotationCreateForm.js` changes here.
- **No retroactive catalog offer** for services already saved to existing cases before this ships — the confirm only ever sees rows added in the current draft session.
- **No per-row confirm-to-catalog timing** — confirmed by the user as batched-at-Save only, not immediate-per-add.
- **No new persisted "standardized" flag/column.** The signal that a case's own service row is "custom" stays exactly what it already is everywhere else in this codebase: `serviceId == null`. This feature's only schema-level effect is that it can now create NEW rows in the existing `services` catalog table — no new columns anywhere.
- **`CaseCreateForm.js` is not touched by this spec.** It already has its own `ServicePickerModal`/`addRowFromService` draft-list mechanism (case-creation time, not `CaseServices.js`'s post-creation "add a service later" flow) that is architecturally closer to Contract/Quotation's `*CreateForm.js` pattern already. Adding the same confirm-to-catalog step there is a natural follow-up but is not part of this sub-project's scope — this spec only touches `CaseServices.js`.
- **No changes to the combo/package-pricing apply-catalog-combo or ad-hoc-combo flows** (`applyComboFromCatalog`, `renderAdhocComboTab`, `CaseServices.js` ~5016-5093) — these bypass the `Form`/`handleAddSubmit` path entirely today and continue to do so; they are not part of the new draft table.
- **No change to the 3 existing duplicate-name checks' logic** — they get relocated (client-side, against the draft `rows` array instead of the saved `services` array, and against `handleSave` instead of per-action) but keep the exact same `.toLowerCase().trim()` comparison idiom already used in this file (`CaseServices.js:2693-2700`, `2658-2667`, `5119-5128`).

## 4. Mechanism

### 4.1 New draft-row shape

One row = one pending `projectServices` line, matching `ContractServices.js`'s row shape (`ContractServices.js:404-421`) with Case-specific fields added:

```js
{
  id: <temp Date.now()+random, or the real projectServices.id for an existing row>,
  serviceId: null,          // catalog FK, or null for a custom-named row
  _svcName: "",
  _serviceType: "",
  _description: "",
  _basePrice: 0,
  _vat: 0,
  currencyId: null,
  _currencyId: "",
  _isNew: true,
  _deleted: false,
  _isCustom: false,         // true only via the "Create new service" modal path
  comboId: null,            // Case-specific: preserved from today's comboTarget concept
  comboName: null,
}
```

Existing (already-saved) rows are loaded into this same shape on mount (mapping `projectServices` fields → the `_`-prefixed draft fields), with `_isNew: false`.

### 4.2 Table rendering

Replace the current `columns` array (`CaseServices.js:3785-4096`, read-only except for the 5 `EditableCell` sites in §4.6) with a draft-aware version:

- **# / Service & Type / Description / Subtotal / VAT / VAT amount / Total amount / Action** — same 8 columns Case already has, same visual style (`EditableCell` for Description/Subtotal/VAT, matching `ContractServices.js`'s "Service & Type" button-cell pattern for the name/type/serviceId group instead of Case's current always-editable inline cells for `serviceType`/`serviceName`).
- **Service & Type column becomes a button**, matching `ContractServices.js:2311-2320`'s exact pattern: `React.createElement(Button, { block: true, type: 'dashed', onClick: () => openServiceModal(r.id) }, ...)`. This is a deliberate behavior change from today's Case UI (where `serviceType`/`serviceName` are directly-editable `EditableCell`s, `CaseServices.js:3799-3804`/`3824-3828`) — bringing Case in line with Contract's "identity fields only change through the picker modal" model, since that's the natural place to also track `_isCustom` going forward.
- **Status and quotation/contract-linked action buttons** (`CaseServices.js:1382-1436`) apply only to already-saved rows (`!_isNew`) — a brand-new draft row has no status/linked-record yet, so these render blank/disabled for `_isNew` rows, matching how `ContractServices.js` has no equivalent column at all (Case's Status/Action column is Case-specific and stays, just gated).
- **Package-mode column hiding** (`CaseServices.js:4225-4254`, `PRICE_COLUMN_KEYS` + `hasLinePricedRows`) is preserved as-is, evaluated against the draft `rows` instead of the saved `services` array.

### 4.3 Add / edit / delete become draft-only

- **"New service" button** → `addRow(comboTarget)`, mirroring `ContractServices.js:1835-1859`: pushes a blank draft row and immediately opens the service picker modal on it (`openServiceModal(newId)`), not the old `addModal`/`Form` flow. `handleAddSubmit` (`CaseServices.js:2935-2954`) is removed — its two responsibilities split: field-value handling moves into the picker modal's own catalog/custom handlers (§4.4), and the actual persistence moves into the new `handleSave` (§4.5).
- **Existing service-picker modal** (`CaseServices.js:4987-5187`) is repurposed as `ContractServices.js`'s "Select Service" / "Create New Service" modal pair: `handleServiceChange`'s catalog-autofill logic (`CaseServices.js:2632-2645`) becomes the new `handleSelectCatalogService(svc)` (patches the active draft row, `serviceId` set, `_isCustom: false`); a new `handleCreateCustomService()` (typed name path) patches the active row with `serviceId: null`, `_isCustom: true`. Both close the modal and mark the draft dirty — no API call.
- **Inline edits** (`_description`/`_basePrice`/`_currencyId`/`_vat`) use the SAME `EditableCell` component already in this file, but `onSave` now calls a new `updateRow(id, field, value)` (patches local `rows` state + `setDirty(true)`) instead of `handleInlineEdit`'s immediate `syncAllThree` + `loadData()` (`CaseServices.js:2647-2684`) — deferred like `ContractServices.js:updateRow`.
- **Delete** marks `_deleted: true` on the row (soft, reversible until Save) instead of immediately calling the existing `handleDelete`/`Popconfirm` flow (`CaseServices.js:1421-1433`) for `_isNew` rows; an already-saved row being deleted still shows the same `Popconfirm` copy ("Delete this service? The service will be marked as Deleted...") but now sets `_deleted: true` locally instead of firing the API immediately, and the actual soft-delete happens in `handleSave`.
- The combo/package-catalog-apply and ad-hoc-combo tabs (§3 non-goals) are unaffected — they already write their own rows into local state separately from the individual-line `Form` flow and are left exactly as they are today.

### 4.4 Service picker modal — catalog vs. custom

Structurally identical to `ContractServices.js`'s `handleSelectCatalogService`/`handleCreateCustomService` (`ContractServices.js:1341-1385`), reusing Case's own existing duplicate-detection idiom instead of Contract's (which has none) — a row's typed name is checked against **other rows currently in the draft** (not the saved `services` list, since that's now stale until Save) using the same `.toLowerCase().trim()` comparison already established in this file. A collision blocks selecting/creating that name in the modal, exactly like today's `createOneCaseService`/`handleInlineEdit` duplicate checks (`CaseServices.js:2693-2700`, `2658-2667`), just evaluated against `rows` instead of `services`.

### 4.5 `handleSave` — batched persistence (deliberately simpler than Contract's)

`ContractServices.js:handleSave` (`ContractServices.js:1883-2264`) cascades writes across `contractServices`/`projectServices`/`quotationServices` because a contract's own service rows are *downstream* of a case's `projectServices` — a contract service links back to (and must keep in sync) a `projectServices` row that may already exist from an originating quotation. **Case's own rows ARE `projectServices` directly** — there is no downstream collection to cascade into. The new `CaseServices.js:handleSave` is therefore a single loop, not a 3-collection sync:

```js
const handleSave = async () => {
  const invalid = rows.find((r) => !r._deleted && !r._svcName?.trim());
  if (invalid) {
    message.warning("Please enter a name for every service.");
    return;
  }
  setSaving(true);
  try {
    const createdRows = [];
    for (const r of rows) {
      if (r._deleted && !r._isNew) {
        await ctx.api.request({
          url: "projectServices:update",
          method: "POST",
          params: { filterByTk: r.id },
          data: { status: "deleted" },
        });
      } else if (!r._deleted && r._isNew) {
        const { id: psId } = await createOneCaseService(
          {
            serviceId: r.serviceId,
            serviceName: r._svcName,
            serviceType: r._serviceType,
            description: r._description,
            basePrice: r._basePrice,
            vat: r._vat,
            currencyId: r.currencyId,
            comboTarget: r.comboId ? { comboId: r.comboId, comboName: r.comboName } : null,
          },
          { skipReload: true },
        );
        if (psId && r._isCustom) createdRows.push({ ...r, _newServiceId: psId });
      } else if (!r._deleted && !r._isNew) {
        await ctx.api.request({
          url: "projectServices:update",
          method: "POST",
          params: { filterByTk: r.id },
          data: {
            serviceId: r.serviceId,
            serviceName: r._svcName,
            serviceType: r._serviceType,
            description: r._description,
            basePrice: r._basePrice,
            vat: r._vat,
            currencyId: r.currencyId,
          },
        });
      }
    }
    await syncCaseTotalAmount(currentId);

    const customRowsAwaitingCatalogDecision = createdRows.filter((r) => r._isCustom);
    if (customRowsAwaitingCatalogDecision.length > 0) {
      setCatalogPromptRows(customRowsAwaitingCatalogDecision);
      setShowCatalogPrompt(true);
    } else {
      message.success("Services saved.");
      setDirty(false);
      await loadData();
    }
  } catch (err) {
    console.error(err);
    message.error("Failed to save: " + (err?.message || ""));
  }
  setSaving(false);
};
```

`createOneCaseService` is reused as-is (its existing `{skipReload}` option, `CaseServices.js:2691`, already exists for exactly this kind of batch-safe calling — it still runs its own duplicate check, pricing computation, `projectServices:create` with its existing 2-level payload fallback, and per-row folder provisioning, `CaseServices.js:2794-2924`, unchanged). `syncCaseTotalAmount` moves from once-per-row (today, inside `createOneCaseService`) to once-after-the-loop — a minor efficiency cleanup, not a behavior change (the function recomputes the case's total from scratch each call, so calling it once with the final state is equivalent to N redundant calls converging on the same result).

### 4.6 "Save to catalog?" confirm

Shown only when `handleSave`'s loop produced at least one newly-created row that was `_isCustom` (i.e., typed, not catalog-picked). Modal pattern matches `SaveTaskToTemplateModal`'s already-shipped list-with-checkboxes shape (`All Module/Task/TaskManagement.js`), adapted for services:

- Title: "Save to catalog?"
- One row per custom service just created, each with a checkbox (default unchecked) and its name/type/price for context.
- A row is **excluded** (not shown as checkable, with a note "already in the catalog") if its normalized name (`normalizeSearch`/`serviceNameKey`, reused verbatim from `ContractCreateForm.js:3248-3252`/`5595-5596`) matches an existing `services` catalog entry — avoiding a duplicate catalog row.
- "Save selected" button: for each checked row, `services:create` with `{ serviceName, serviceType, description, basePrice, internalCompanyId }` — `internalCompanyId` resolved the same way `CaseServices.js` already resolves it elsewhere in this file (`caseInfo?.internalCompanyId` / `caseInfo?.internalCompany`, e.g. `CaseServices.js:2848-2851`).
- "Skip" / closing the dialog without checking anything: no catalog writes: the case's own services are already saved at this point regardless (§4.5 already completed), so skipping only means no catalog promotion happened.
- Either way, closing this dialog (Save selected or Skip) finishes with `message.success(...)`, `setDirty(false)`, `await loadData()` — the same finishing steps `handleSave` itself would have done directly if there had been nothing to prompt about.

### 4.7 What stays untouched

- Package-mode column-hiding (`PRICE_COLUMN_KEYS`/`hasLinePricedRows` mixed-mode logic, `CaseServices.js:4225-4254`) — same logic, now reading from `rows` instead of `services`.
- Per-service upload-folder provisioning inside `createOneCaseService` (`CaseServices.js:2794-2924`) — unchanged, still runs per created row.
- The Status/Action column's quotation/contract linking, restore, and the existing `Popconfirm` copy for already-saved rows (`CaseServices.js:1397-1436`) — unchanged for `!_isNew` rows.
- Combo/package-apply and ad-hoc-combo tabs (§3).

## 5. Testing / verification plan

1. Open a case's Services tab. Confirm the table now shows a "New service" button (no more standalone "Add Service" modal reachable independently of a row).
2. Click "New service" → picker modal opens on a fresh draft row. Pick a catalog service → row shows that service's name/type, price fields editable inline, no Save has happened yet (confirm via a direct query — no new `projectServices` row exists).
3. Click "New service" again → "Create new service" (typed name) path → row shows `_isCustom` state (verify by proceeding to Save and confirming the catalog-prompt step offers it).
4. Add 2 more draft rows: one more typed-name (a name that already exists in the catalog) and one more catalog-picked. Edit a price/description inline on one row, delete a different (freshly-added) draft row via the row's own delete — confirm the row disappears from the table without any API call yet.
5. Click "Save". Confirm: exactly the expected `projectServices:create`/`:update` calls fire (matching the non-deleted draft rows), `syncCaseTotalAmount` runs once, and the "Save to catalog?" dialog appears listing only the genuinely-new custom rows — the row whose name already existed in the catalog should be shown as excluded/already-present, not checkable.
6. Check one box, leave the other unchecked, click "Save selected". Confirm exactly one new `services` catalog row was created, with the case's own `internalCompanyId`, and that it does NOT appear for a different company's cases' catalog picker.
7. Confirm the case's own service rows (from step 5) are correct regardless of what was chosen in step 6 — the catalog step must not have altered anything about the already-saved `projectServices` rows.
8. Repeat steps 1-5 for a service already added to the case in an EARLIER session (an existing, not-`_isNew` row) — confirm editing and deleting it through the new draft table produces the same end state as today's immediate-save behavior did, just deferred to the Save click.
9. Confirm package/combo-mode: apply a catalog combo via the existing combo tab, confirm it's completely unaffected (still applies immediately, doesn't interact with the new draft table or the catalog-confirm step).
10. Confirm the 3 duplicate-name checks still work: typing a name that collides with another row already in the draft is blocked in the picker modal; typing a name that collides with an existing catalog entry is still selectable as a case service (that check is about in-case duplicates, not catalog collisions) but gets excluded from the catalog-confirm step per §4.6.

## 6. Rollback

Fully additive at the schema level — no new columns, no new collections; the only new data this can produce is new rows in the existing `services` table (each traceable by `internalCompanyId` + creation time) and the usual `projectServices` rows the old flow already created. Rollback is data-level: delete any mistakenly-created `services` catalog rows by hand. Because the UI itself changes (modal → draft table), a code-level rollback (reverting `CaseServices.js` to its previous version) is the practical undo path if the new interaction model itself needs to be reverted, not just its data output.

## Appendix: research citations

- `ContractServices.js` full draft-table architecture (row shape `1835-1859`, `EditableCell` `991-1148`, `serviceTableColumns` `2304-2459`, `handleSelectCatalogService`/`handleCreateCustomService` `1341-1385`, `toggleCustom` `1574-1588` confirmed dead/unreferenced, `handleSave` `1883-2264`) — read in full via a dedicated research pass, not summarized from memory.
- `CaseServices.js` current architecture (`createOneCaseService` `2691-2933` including its existing `{skipReload}` option and folder-provisioning side effect, `handleAddSubmit` `2935-2954`, `handleInlineEdit` `2647-2684`, existing "Add Service" modal's full 7-field list `4987-5187`, `handleServiceChange` `2632-2645`, existing `columns` array `3785-4096`, package-mode column-hiding `4225-4254`, `closeAddModal`/`loadData` `2623-2630`/`2166`, all 3 duplicate-name checks `2693-2700`/`2658-2667`/`5119-5128`) — same, read in full.
- `services` catalog collection's `internalCompanyId` scoping precedent: `CaseServices.js:2569-2577` (catalog-fetch filtering by `internalCompanyId` when populating the existing picker's options) and `CaseServices.js:2848-2851` (resolving a case's own `internalCompanyId` for folder provisioning) — same resolution pattern reused for the new catalog-create payload.
- `normalizeSearch`/`serviceNameKey` name-collision pattern: `ContractCreateForm.js:3248-3252`/`5595-5604`, already reused this session for `TaskManagement.js`'s Save-as-template feature.
- `SaveTaskToTemplateModal` (`TaskManagement.js`) — precedent UI shape for a checkbox-list confirm dialog, already shipped this session for the equivalent task-template feature.
