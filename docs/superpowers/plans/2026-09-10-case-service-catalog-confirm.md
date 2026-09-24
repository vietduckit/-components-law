# Case Service Draft Table + "Save to Catalog?" Confirm — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit `All Module/Case/CaseServices.js` from its current "every add/edit/delete hits the API immediately" model to a `ContractServices.js`-style draft/batch table, and add a one-time "Save to catalog?" confirm for any typed (non-catalog) service names created in that draft session.

**Architecture:** Extend the existing enriched row objects (`services` state) with new `_`-prefixed draft fields (`_svcName`, `_serviceType`, `_description`, `_basePrice`, `_vat`, `_currencyId`, `_isNew`, `_deleted`, `_isCustom`) that mirror `ContractServices.js`'s row shape. A new picker modal (Select catalog / Create custom) replaces the old immediately-saving "Add Service" form for identity edits. All per-row mutations become local `setServices` calls; nothing hits the API until "Save". `handleSave` reuses three already-verified functions per row branch — `createOneCaseService` (create), `softDeleteOneService` (delete), and `syncAllThree` (update, called once per field) — instead of re-deriving their cascade-to-quotationServices/contractServices/header-totals logic from scratch. A "Save to catalog?" modal (checkbox list, `SaveTaskToTemplateModal`-style) appears after Save only when the loop created at least one new custom-named row.

**Tech Stack:** Plain React via `ctx.React`/`ctx.antd` inside a NocoBase JS Block (no build step, no test runner). Verification in this codebase is `node --check <file>` for syntax plus manual browser QA — there is no Jest/pytest here, so every task below substitutes a manual verification checklist for the "write a failing test" step the process normally uses.

**Spec:** `docs/superpowers/specs/2026-09-09-case-service-catalog-confirm-design.md` — read both together; this plan corrects three gaps found in the spec's illustrative code while implementing it (documented inline at each task, and summarized in **Deviations from the spec's illustrative code** below).

## Global Constraints

- Never change the persisted `pricingMode`/`billingMode` string values (`"line"`, `"package"`, `"lineBillable"`, `"packageIncluded"`, `"scopeOnly"`) or any DB column name — only add new local `_`-prefixed draft fields.
- Keep the state variable named `services` (do **not** rename to `rows`) — see **Deviations** below.
- Every new/changed function must follow this file's own existing conventions: `ctx.api.request({ url, method: "POST", params: { filterByTk }, data })` for update/destroy (not the URL-embedded `resource:update?filterByTk=` style used in other files this session).
- After every edit in every task: run `node --check "All Module/Case/CaseServices.js"` and fix any syntax error before moving to the next step.
- No `git push` — commit locally only, per task, using `git commit` (not `--amend`).

## Deviations from the spec's illustrative code

The spec's §4.5/§4.1 code blocks are correct in spirit but were written as illustrations for approval, not final code. Three gaps surfaced while mapping them onto the actual file (all confirmed by reading the full 5192-line file, not guessed):

1. **Delete must keep cascading.** The spec's `handleSave` deletes an existing row with one bare `projectServices:update`. The real file's current delete path (`handleDelete` → `softDeleteOneService`, `CaseServices.js:3247-3305`) also soft-deletes the linked `contractServices`/`quotationServices` row and resyncs their header totals. Task 3 reuses `softDeleteOneService` unchanged instead of the spec's bare snippet, so this cascade isn't silently dropped.
2. **Update must keep cascading too.** Today, editing any field on an existing row goes through `handleInlineEdit` → `syncAllThree` (`CaseServices.js:1900-1984`), which pushes the same change into any linked `quotationServices`/`contractServices` row and resyncs quotation/contract/case header totals. The spec's `handleSave` update-branch is a single flat `projectServices:update` with no such cascade. Task 3 instead calls `syncAllThree` once per identity field plus one combined pricing call, reusing the existing, already-correct cascade instead of re-deriving it (see Task 3, Step 6, for why a naive per-field loop for `basePrice`/`vat` would silently undo itself).
3. **`services` stays `services`.** The spec's row shape prose says "matching `ContractServices.js`'s row shape" and uses `_svcName` etc., which this plan follows — but it does **not** require renaming the state variable itself from `services` to `rows`. That rename would touch 50+ call sites for a purely cosmetic reason and isn't what the spec's Goals/Non-goals actually ask for.

Two more decisions, not gaps in the spec but genuine judgment calls made while translating "port Contract's architecture" into code — flagged here so they're visible before implementation, not discovered after:

4. **"Remove combo" also becomes deferred.** The spec doesn't mention `handleRemoveCombo` (the combo-section header's bulk-remove button). Today it soft-deletes every row in the group immediately and calls `loadData()`, which would silently discard any *other* unsaved draft edits sitting in the same table — a real risk once drafting becomes the primary interaction model. Task 3 changes it to mark every row in the group `_deleted: true` locally (via `deleteRow`), deferred to the next Save, instead of firing immediately.
5. **"Restore" stays immediate.** Restoring an already-deleted row is left as today's immediate `handleRestore` call (which does call `loadData()`, and *would* discard unrelated unsaved drafts elsewhere in the table). This is deliberately **not** changed, matching `ContractServices.js`'s own "Refresh" button, which has exactly the same "immediate action discards the draft" characteristic with no guard — an accepted, pre-existing tradeoff in the reference architecture, not a new one introduced here.

If either 4 or 5 should be handled differently, flag it before Task 3 — everything after Task 2 depends on this file being in a known state.

---

### Task 1: Row shape — add draft fields + `dirty` state

**Files:**
- Modify: `All Module/Case/CaseServices.js:865-926` (state declarations)
- Modify: `All Module/Case/CaseServices.js:2481-2556` (`enrichedServices.push({...})` inside `loadData`)

**Interfaces:**
- Produces: every object in `services` state now also carries `_svcName`, `_serviceType`, `_description`, `_basePrice`, `_vat`, `_currencyId`, `_isNew: false`, `_deleted: false`, `_isCustom` (all consumed by Tasks 2-4). Produces `dirty`/`setDirty` (consumed by Task 3's Save bar).
- Consumes: nothing new — reads the same `ps`/`qSvc` variables already in scope inside `loadData`.

This task is purely additive: it does not change what's rendered or how existing handlers behave, since nothing reads the new fields yet. That's what makes it independently testable — the Services tab must look and behave *identically* to today after this task.

- [ ] **Step 1: Add `dirty` state**

In `CaseServices.js`, find the modal-state block starting at line 896 (`const [addModal, setAddModal] = useState(false);`). Add a new line right after the `packageDraft` state declaration (currently line 915, `const [packageDraft, setPackageDraft] = useState(null);`):

```js
      // True whenever the draft table (services state) has any local edit
      // not yet persisted via handleSave — drives the "Cancel changes/Save"
      // bar. Distinct from packageDraft, which is its own older, narrower
      // draft mechanism for just the 4 package-footer fields.
      const [dirty, setDirty] = useState(false);
```

- [ ] **Step 2: Extend the enriched row object with draft fields**

Find the `enrichedServices.push({` call inside `loadData` (`CaseServices.js:2481`). Its closing brace is at line 2556 (`});`, right before `_qCode: qCode`'s trailing comma). Add the new fields right before that closing brace — after the existing `_qCode: qCode` line, add a comma and:

```js
              _qCode: qCode,
              // New draft-table fields (all rows loaded from the server start
              // as non-new, non-deleted, non-custom — _isCustom only becomes
              // true via the picker's "Create new service" path in Task 2).
              _svcName: ps.serviceName || "",
              _serviceType: ps.serviceType || "",
              _description: ps.description || "",
              _basePrice: ps.basePrice || 0,
              _vat: ps.vat || 0,
              _currencyId: ps.currencyId ? String(extractId(ps.currencyId) || ps.currencyId) : "",
              _isNew: false,
              _deleted: false,
              _isCustom: !(extractId(ps.serviceId) || extractId(ps.services)),
```

(The existing object literal already spreads `...ps` at its top, at line 2481-2482 — that's where the plain `serviceName`/`serviceType`/`description`/`basePrice`/`vat`/`currencyId` fields this diffs against come from. Don't touch that spread.)

- [ ] **Step 3: Verify syntax**

Run: `node --check "All Module/Case/CaseServices.js"`
Expected: no output (success).

- [ ] **Step 4: Manual verification**

Reload the Case detail page's Services tab in the browser. Confirm it looks and behaves exactly as before this change — same columns, same inline edits save immediately, same Add Service modal. (Nothing should be different yet — this task only adds unused fields.)

- [ ] **Step 5: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "feat(case-services): add draft-row fields and dirty state (no behavior change yet)"
```

---

### Task 2: Draft picker modal — replace immediate-save identity editing

**Files:**
- Modify: `All Module/Case/CaseServices.js` (multiple regions — state, new handlers, columns array, top-level buttons, combo-header-bar button, modal JSX)

**Interfaces:**
- Produces: `addRow(comboTarget)`, `openServiceModal(rowId)`, `closeServiceModal()`, `handleSelectCatalogService(svc)`, `handleCreateCustomService()`, `updateRow(id, field, value)`, `deleteRow(id)` — all local-state-only, no API calls.
- Consumes: `services`/`setServices`, `caseCurrency`, `getCurrencySelectValue`, `extractCurrencyId`, `getRecordCurrencyId`, `currencyOptions` — all already exist in this file.

This is the core UI swap. It cannot be tested in smaller pieces — the new columns reference `openServiceModal`, the new modal's "Select"/"Create" calls need `activeRowId`, and the top button needs `addRow` — so this task's steps build all of it together and verify once at the end.

- [ ] **Step 1: Add picker modal state, remove retired state**

Replace the block from `CaseServices.js:896` (`const [addModal, setAddModal] = useState(false);`) through line 910 (`const [applyingCombo, setApplyingCombo] = useState(false);`) — i.e. everything from `addModal` through `applyingCombo` inclusive — with:

```js
      // Draft picker modal (Select existing catalog service / Create custom
      // name) — the only way to set or change a row's identity (serviceId/
      // serviceName/serviceType/description/basePrice/vat/currencyId). Used
      // both for a brand-new row (via addRow) and for editing an existing
      // row's identity (via the "Service & Type" button-cell).
      const [svcModalOpen, setSvcModalOpen] = useState(false);
      const [modalView, setModalView] = useState("select"); // "select" | "create"
      const [activeRowId, setActiveRowId] = useState(null);
      const [svcSearch, setSvcSearch] = useState("");
      const [newSvcName, setNewSvcName] = useState("");
      const [newSvcType, setNewSvcType] = useState("");
      const [newSvcDescription, setNewSvcDescription] = useState("");
      const [newUnitPrice, setNewUnitPrice] = useState(0);
      const [newSvcCurrencyId, setNewSvcCurrencyId] = useState("");
      // Apply Combo modal — entirely unchanged content (applyComboFromCatalog/
      // applyAdhocCombo/renderAdhocComboTab below), just now its own modal
      // with its own open/close state instead of a tab inside the old
      // addModal. comboSubTab/comboSearch/adhocComboName/adhocServiceIds/
      // applyingCombo are unchanged from today.
      const [comboModalOpen, setComboModalOpen] = useState(false);
      const [comboSubTab, setComboSubTab] = useState("select");
      const [comboSearch, setComboSearch] = useState("");
      const [applyingCombo, setApplyingCombo] = useState(false);
      const [adhocComboName, setAdhocComboName] = useState("");
      const [adhocServiceIds, setAdhocServiceIds] = useState([]);
```

Note what's gone: `addModal`, `comboAddTarget`, `addModalTab`. `comboAddTarget` is replaced by passing `comboTarget` directly into `addRow(comboTarget)` (Step 2) — no state needed since the row is pushed immediately. `addModalTab`'s Segmented Line/Combo toggle is gone because "New service" and "Apply Combo" become two separate top-level buttons (Step 5), matching `ContractServices.js`.

- [ ] **Step 2: Add the draft mutation handlers**

Immediately after the state block from Step 1 (before `const [form] = Form.useForm();` at what is currently line 927), add:

```js
      const addRow = (comboTarget = null) => {
        const newId = Date.now() + Math.random();
        const defaultCurrencyId = extractCurrencyId(caseCurrency);
        setServices((prev) => [...prev, {
          id: newId,
          serviceId: null,
          _svcName: "",
          _serviceType: "",
          _description: "",
          _basePrice: 0,
          _vat: 0,
          currencyId: defaultCurrencyId || null,
          _currencyId: defaultCurrencyId ? String(defaultCurrencyId) : "",
          _isNew: true,
          _deleted: false,
          _isCustom: false,
          comboId: comboTarget?.comboId || null,
          serviceCombo: comboTarget?.comboId || null,
          comboName: comboTarget?.comboName || null,
        }]);
        setDirty(true);
        openServiceModal(newId);
      };

      const openServiceModal = (rowId) => {
        const row = services.find((r) => r.id === rowId);
        setActiveRowId(rowId);
        setModalView("select");
        setSvcSearch("");
        setNewSvcName("");
        setNewSvcType("");
        setNewSvcDescription("");
        setNewUnitPrice(0);
        setNewSvcCurrencyId((row && row._currencyId) || getCurrencySelectValue(caseCurrency));
        setSvcModalOpen(true);
      };

      const closeServiceModal = () => setSvcModalOpen(false);

      // Matches today's handleServiceChange field-fill exactly (basePrice/vat
      // fallback to 0, not Contract's wider unitPrice/price/vatRate chain) —
      // if this row is package/combo-tagged, handleSave zeroes basePrice/vat
      // at save time anyway (mirrors createOneCaseService's addAsPackage
      // check), so no extra gating is needed here.
      const handleSelectCatalogService = (svc) => {
        setServices((prev) => prev.map((r) => {
          if (r.id !== activeRowId) return r;
          const svcCurrencyId = getRecordCurrencyId(svc);
          const nextCurrencyId = svcCurrencyId || extractCurrencyId(r._currencyId) || extractCurrencyId(caseCurrency);
          return {
            ...r,
            serviceId: svc.id,
            _svcName: svc.serviceName || svc.name || "",
            _serviceType: svc.serviceType || svc.type || "",
            _description: svc.description || "",
            _basePrice: svc.basePrice || 0,
            _vat: svc.vat || 0,
            currencyId: nextCurrencyId || null,
            _currencyId: nextCurrencyId ? String(nextCurrencyId) : "",
            _isCustom: false,
          };
        }));
        setDirty(true);
        closeServiceModal();
      };

      // Duplicate check against the DRAFT (services, including this
      // session's own not-yet-saved rows), not the last-loaded server
      // snapshot — same idiom as today's createOneCaseService/handleInlineEdit
      // checks (.toLowerCase().trim()), just moved earlier (modal-time
      // instead of submit-time) since submit is now deferred.
      const handleCreateCustomService = () => {
        const name = newSvcName.trim();
        if (!name) {
          message.warning("Please enter a service name");
          return;
        }
        const checkName = name.toLowerCase();
        const isDuplicate = services.some((r) =>
          r.id !== activeRowId && !r._deleted && (r._svcName || "").toLowerCase().trim() === checkName,
        );
        if (isDuplicate) {
          message.error(`"${name}" already exists in the case.`);
          return;
        }
        const nextCurrencyId = extractCurrencyId(newSvcCurrencyId) || extractCurrencyId(caseCurrency);
        setServices((prev) => prev.map((r) => {
          if (r.id !== activeRowId) return r;
          return {
            ...r,
            serviceId: null,
            _svcName: name,
            _serviceType: newSvcType.trim() || "",
            _description: newSvcDescription.trim() || "",
            _basePrice: parseNum(newUnitPrice),
            _vat: 0,
            currencyId: nextCurrencyId || null,
            _currencyId: nextCurrencyId ? String(nextCurrencyId) : "",
            _isCustom: true,
          };
        }));
        setDirty(true);
        closeServiceModal();
      };

      const updateRow = (id, field, value) => {
        setServices((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
        setDirty(true);
      };

      // Always just flags _deleted, for both new and existing rows — a new,
      // never-saved row simply never matches any handleSave branch (see
      // Task 3) and is silently skipped, no special-casing needed here.
      // Matches ContractServices.js:deleteRow exactly.
      const deleteRow = (id) => {
        setServices((prev) => prev.map((r) => (r.id === id ? { ...r, _deleted: true } : r)));
        setDirty(true);
      };
```

- [ ] **Step 3: Retire the old individual-add handlers and Form state**

Delete `handleServiceChange` entirely (`CaseServices.js:2632-2645`, the whole `const handleServiceChange = (svcId) => { ... };` block) — replaced by `handleSelectCatalogService` from Step 2.

Delete `handleAddSubmit` entirely (`CaseServices.js:2935-2954`, the whole `const handleAddSubmit = async (values) => { ... };` block) — its job is now split between `handleCreateCustomService`/`handleSelectCatalogService` (identity) and the new `handleSave` (Task 3, persistence).

Delete `openAddModal` (`CaseServices.js:2610-2622`) and `closeAddModal` (`CaseServices.js:2623-2630`) entirely — replaced by `addRow`/`openServiceModal`/`closeServiceModal`.

Delete `const [form] = Form.useForm();` (currently line 927) — nothing references `form` once the old Add Service `<Form>` JSX is removed in Step 6.

- [ ] **Step 4: Rewrite the columns array**

Replace the two separate "Service Type" (`CaseServices.js:3793-3805`) and "Service" (`CaseServices.js:3806-3857`) column definitions with one combined button-cell column, matching `ContractServices.js:2312-2335`'s pattern but keeping Case's existing sub-quotation badge/subtext:

```js
        {
          title: "Service & Type",
          key: "service",
          width: 280,
          render: (_, record) => {
            const mainQuoteTitle = caseInfo?._mainQuote?.title || "Original quotation";
            const subtext = record._isMainQuote
              ? mainQuoteTitle
              : (record._qCode
                ? `Supplemental quotation #${record._qCode}`
                : (record._qTitle || `Supplemental quotation #${record._quotationId || "..."}`));
            return React.createElement(
              "div",
              null,
              React.createElement(Button, {
                block: true,
                type: "dashed",
                onClick: () => openServiceModal(record.id),
                style: { height: "auto", padding: 8, whiteSpace: "normal", textAlign: "left" },
              },
                !record._svcName
                  ? React.createElement(Text, { type: "secondary", italic: true }, "Select service")
                  : React.createElement(
                    "div",
                    { style: { display: "flex", flexDirection: "column", gap: 2, width: "100%" } },
                    React.createElement(
                      "div",
                      { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 } },
                      React.createElement(Text, { strong: true, style: { whiteSpace: "normal" } }, record._svcName),
                      record._isMainQuote
                        ? React.createElement(Tag, { color: "blue", style: { margin: 0, fontSize: 10, lineHeight: "16px" } }, "Main")
                        : (record._quotationId
                          ? React.createElement(Tag, { color: "green", style: { margin: 0, fontSize: 10, lineHeight: "16px" } }, "Sub")
                          : null),
                    ),
                    record._serviceType && React.createElement(Tag, { color: "blue", style: { marginInlineEnd: 0, width: "fit-content" } }, record._serviceType),
                  ),
              ),
              (record._quotationId || record._isMainQuote) && React.createElement("div", {
                style: { fontSize: 11, color: C.textSub, marginTop: 2, paddingLeft: 8, display: "flex", alignItems: "center", gap: 4 },
              },
                React.createElement("span", { style: { opacity: 0.6 } }, "↳"),
                subtext,
              ),
            );
          },
        },
```

Replace the "Description" column's `render` (`CaseServices.js:3863-3870`) — change `value: text` to `value: record._description`, and `onSave` from `handleInlineEdit` to `updateRow`:

```js
          render: (_, record) => {
            return React.createElement(EditableCell, {
              value: record._description,
              onSave: (val) => updateRow(record.id, "_description", val),
              isTextArea: true,
            });
          },
```

(`isServiceEditLocked`/`disabled` is dropped here — that lock existed to protect an *immediately-persisted* edit on a locked quotation; a draft edit that only commits on Save doesn't need it. `ENFORCE_SERVICE_EDIT_LOCKS` is already `false` in this file today, so this removes no active behavior.)

Replace the "Subtotal" column (`CaseServices.js:3872-3924`) — same package/scope-only branches stay, but the editable branch switches to draft fields and gains an inline currency `Select` next to the price, matching `ContractServices.js:2378-2387`:

```js
        {
          title: "Subtotal",
          key: "basePrice",
          width: 200,
          render: (_, record) => {
            const packageRow = isPackageServiceRow(record);
            const scopeOnly = isScopeOnlyServiceRow(record);
            if (packageRow) {
              const individual = getComboLineIndividualPrice(record);
              return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" } },
                individual
                  ? React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: C.text } }, formatMoney(individual.price, individual.currency))
                  : React.createElement("span", { style: { color: C.textSub, fontSize: 12 } }, "—"),
                React.createElement("span", { style: { fontSize: 10.5, color: C.primary, fontWeight: 600 } }, "Included in combo"),
              );
            }
            if (scopeOnly) {
              return React.createElement("span", {
                style: { display: "inline-block", padding: "4px 8px", borderRadius: 10, background: "#f5f5f5", color: C.textSub, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
              }, "Scope only");
            }
            const rowCurrency = resolveCurrency(record._currencyId, currencies) || caseCurrency;
            return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2 } },
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4 } },
                React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                  React.createElement(EditableCell, {
                    value: record._basePrice,
                    isMoney: true,
                    currency: rowCurrency,
                    onSave: (val) => updateRow(record.id, "_basePrice", val),
                  }),
                ),
                React.createElement(Select, {
                  value: record._currencyId || undefined,
                  size: "small",
                  style: { width: 76, flexShrink: 0 },
                  disabled: !currencyOptions.length,
                  onChange: (v) => updateRow(record.id, "_currencyId", v),
                  options: currencyOptions.map((opt) => ({ value: opt.value, label: getCurrencyCode(resolveCurrency(opt.value, currencies)) })),
                }),
              ),
            );
          },
        },
```

Replace the "VAT (%)" column's `render` (`CaseServices.js:3930-3942`):

```js
          render: (_, record) => {
            if (isPackageServiceRow(record)) return null;
            if (!isMoneyEditableServiceRow(record)) {
              return React.createElement("span", { style: { color: C.textSub, fontSize: 12 } }, "0%");
            }
            return React.createElement(EditableCell, {
              value: record._vat,
              isNumber: true,
              suffix: "%",
              onSave: (val) => updateRow(record.id, "_vat", val),
            });
          },
```

Leave "VAT amount" and "Total amount" (`CaseServices.js:3944-3989`) as-is for now — Step 5 explains why.

Replace the Action column's `render` (`CaseServices.js:4016-4095`) — buttons other than Compare-when-not-new/Delete-or-Restore stay conditioned on the SAME variables (`svcStatus`, `quotationDetailId`, etc.), just now also gated on `!record._isNew`, and the delete/restore Popconfirm's `onConfirm` changes:

```js
          render: (_, record) => {
            const isMain = record._isMainQuote;
            const svcStatus = record.status || "pending_quote";
            const isDeleted = isDeletedServiceLine(record);
            const quotationDetailId = getRowQuotationId(record);
            const contractDetailId = getRowContractId(record);

            if (record._isNew) {
              return React.createElement("div", { style: { display: "flex", justifyContent: "center" } },
                React.createElement(ActionIconButton, {
                  title: "Remove this draft row",
                  icon: "delete",
                  danger: true,
                  onClick: () => deleteRow(record.id),
                }),
              );
            }

            return React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" } },
              React.createElement(ActionIconButton, {
                title: "Compare data",
                icon: "compare",
                onClick: () => setCompareModal({ open: true, data: record }),
                color: "#475569",
              }),

              quotationDetailId && React.createElement(ActionIconButton, {
                title: "View quotation detail",
                icon: "detail",
                onClick: () => openRecordDetail("quotation", quotationDetailId, "Quotation detail"),
                color: "#0891b2",
              }),

              contractDetailId && React.createElement(ActionIconButton, {
                title: "View contract detail",
                icon: "detail",
                onClick: () => openRecordDetail("contract", contractDetailId, "Contract detail"),
                color: "#7c3aed",
              }),

              svcStatus === "pending_quote" && React.createElement(ActionIconButton, {
                title: caseInfo?.quotationId ? "Create supplemental quotation (select services)" : "Create quotation (select services)",
                icon: "quote",
                onClick: () => openQuotationWithServiceSelect(record),
                primary: true,
                color: "#1677ff",
              }),

              !contractDetailId && !["contracted", "contract_pending_signature", "active", "completed", "cancelled", "deleted"].includes(svcStatus) && React.createElement(ActionIconButton, {
                title: isMain ? "Create contract (select services)" : "Create appendix (select services)",
                icon: "contract",
                onClick: () => openContractWithServiceSelect(record),
                primary: true,
                color: "#d46b08",
              }),

              isDeleted
                ? React.createElement(Popconfirm, {
                  title: "Restore this service?",
                  description: "The service will become active again and its tasks will be unlocked.",
                  onConfirm: () => handleRestore(record),
                  okText: "Restore",
                  cancelText: "Cancel",
                  okButtonProps: { style: { background: "#16a34a", borderColor: "#16a34a" } },
                }, React.createElement(ActionIconButton, {
                  title: "Restore service",
                  icon: "restore",
                  color: "#16a34a",
                  tooltip: false,
                }))
                : React.createElement(Popconfirm, {
                  title: "Delete this service?",
                  description: "The service will be marked as Deleted. Its tasks will switch to read-only mode and can no longer be worked on.",
                  onConfirm: () => deleteRow(record.id),
                  okText: "Delete",
                  cancelText: "Cancel",
                  okButtonProps: { danger: true },
                }, React.createElement(ActionIconButton, {
                  title: "Delete service",
                  icon: "delete",
                  danger: true,
                  tooltip: false,
                })),
            );
          },
```

Note what changed from today: the Popconfirm's `onConfirm` for an existing row is now `() => deleteRow(record.id)` (local flag, deferred) instead of `() => handleDelete(record)` (immediate API call) — the cascade `handleDelete` used to run immediately now runs inside `handleSave` in Task 3. Restore's `onConfirm` is unchanged (`handleRestore(record)`, still immediate — see **Deviations**, point 5).

- [ ] **Step 5: Point VAT amount / Total amount / duplicate-check-in-dropdown / package hiding at the draft fields**

The "VAT amount" and "Total amount" columns (`CaseServices.js:3944-3989`) and `PRICE_COLUMN_KEYS`/`hasLinePricedRows` (`CaseServices.js:4225-4232`) all call `getRowPricing(record)` / `isMoneyEditableServiceRow(record)`, which read the **plain** `record.basePrice`/`record.vat`/`record.currencyId` — not the new `_basePrice`/`_vat`/`_currencyId` draft fields. Since editing now happens on the draft fields only, these display columns would go stale (showing the last-saved amount, not what's being typed).

Add one small helper right after `getRowPricing` (`CaseServices.js:1167`, after its closing `};`) that mirrors the row exactly like Contract does, then use it everywhere pricing is *displayed* for the columns changed in this task:

```js
      // The Subtotal/VAT/VAT amount/Total amount columns must react live to
      // the draft fields being typed, not the last-saved plain fields —
      // getRowPricing/isMoneyEditableServiceRow only know the plain fields,
      // so build a throwaway record that overlays the draft on top before
      // calling them, rather than modifying those two shared helpers (which
      // other call sites — e.g. syncCaseTotalAmount, servicePricingSummary —
      // still correctly want to read from the plain/last-saved fields).
      const getDraftPricingRecord = (record) => ({
        ...record,
        basePrice: record._basePrice,
        vat: record._vat,
        currencyId: extractCurrencyId(record._currencyId) || record.currencyId,
      });
```

In the "VAT amount" column's `render` (`CaseServices.js:3950-3965`), change `const pricing = getRowPricing(record);` to `const pricing = getRowPricing(getDraftPricingRecord(record));`.

In the "Total amount" column's `render` (`CaseServices.js:3973-3988`), same change: `const pricing = getRowPricing(getDraftPricingRecord(record));`.

Leave `PRICE_COLUMN_KEYS`/`hasLinePricedRows`/`servicePricingSummary` (`CaseServices.js:3601-3657`, `4225-4234`) reading the plain fields as-is — these decide package-mode column *hiding*, which only matters for already-saved rows (a brand-new `_isNew` row with no `serviceId`/mode set yet doesn't need to hide columns for itself).

In the Add-Service dropdown's duplicate check (`CaseServices.js:5119-5128`, inside the now-being-replaced Form — see Step 6) this logic moves into the new picker's catalog list instead; when writing that list in Step 6, use `services.some(es => !es._deleted && ((String(es.serviceId) === String(s.id) && es.serviceId) || (es._svcName || "").toLowerCase().trim() === catName))` — same idiom, `_deleted` rows excluded this time because a row the user just flagged for deletion *in this draft* freeing up its name for reuse is more useful UX than blocking it, and nothing in the spec's non-goals requires matching the old immediate-delete file's behavior byte-for-byte on this one point. (The three checks the spec explicitly protects — §3's non-goal 5 — are the ones inside `createOneCaseService`/`handleInlineEdit`/this dropdown; `createOneCaseService`'s own check, reused unchanged in Task 3, still runs at Save time regardless.)

- [ ] **Step 6: Replace the Add Service modal's content**

The Add Service modal is `CaseServices.js:4987-5187` (the `React.createElement(Modal, { title: comboAddTarget ? ... : "Add service to case", open: addModal, ... })` block). Replace its entire content — keep the outer `Modal` props pattern but retarget them to the new state, and replace the Segmented tab + Form body with the picker's Select/Create pair, adapted from `ContractServices.js:2735-2901` to this file's existing `DS`/`C`/`FONT` tokens:

```js
        // SERVICE PICKER MODAL — Select existing catalog service, or create
        // a custom (non-catalog) one. Purely local state; no API call here.
        React.createElement(Modal, {
          title: null,
          open: svcModalOpen,
          onCancel: closeServiceModal,
          footer: null,
          width: 800,
          bodyStyle: { padding: "24px 24px 16px" },
        },
          modalView === "select"
            ? React.createElement("div", null,
              React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 } },
                React.createElement("span", { style: { fontSize: 18, fontWeight: 700, color: C.text, fontFamily: FONT } }, "Select Service"),
                React.createElement("span", { onClick: closeServiceModal, style: { cursor: "pointer", color: C.textSub, fontSize: 15, fontFamily: FONT, fontWeight: 500 } }, "Close"),
              ),
              React.createElement("div", { style: { ...DS.infoBox, marginBottom: 16 } },
                React.createElement("div", { style: { fontWeight: 600, marginBottom: 4 } }, "📌 Two ways to add a service:"),
                React.createElement("ul", { style: { margin: 0, paddingLeft: 18 } },
                  React.createElement("li", null, React.createElement("b", null, "From the standard catalog: "), "Pick a service below — the system will auto-fill its info."),
                  React.createElement("li", null, React.createElement("b", null, "Manual (not yet standardized): "), "Skip the catalog step and type the service name directly."),
                ),
              ),
              React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 16 } },
                React.createElement(Input, {
                  placeholder: "Search service name...",
                  value: svcSearch,
                  onChange: (e) => setSvcSearch(e.target.value),
                  style: { flex: 1, borderRadius: DS.radius.sm, height: 38 },
                }),
                React.createElement(Button, {
                  type: "primary",
                  onClick: () => setModalView("create"),
                  style: { height: 38, borderRadius: DS.radius.sm, fontWeight: 600 },
                }, "Create new"),
              ),
              React.createElement("div", { style: { maxHeight: 380, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: DS.radius.md, marginBottom: 16 } },
                React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: FONT } },
                  React.createElement("thead", null,
                    React.createElement("tr", null,
                      React.createElement("th", { style: { padding: "9px 12px", fontSize: 11.5, fontWeight: 600, color: C.textSub, background: C.bgSection, textAlign: "left" } }, "Service Name"),
                      React.createElement("th", { style: { padding: "9px 12px", fontSize: 11.5, fontWeight: 600, color: C.textSub, background: C.bgSection, width: 150, textAlign: "left" } }, "Type"),
                      React.createElement("th", { style: { padding: "9px 12px", fontSize: 11.5, fontWeight: 600, color: C.textSub, background: C.bgSection, width: 140, textAlign: "right" } }, "Unit Price"),
                      React.createElement("th", { style: { padding: "9px 12px", fontSize: 11.5, fontWeight: 600, color: C.textSub, background: C.bgSection, width: 90, textAlign: "center" } }, ""),
                    )),
                  React.createElement("tbody", null,
                    serviceCatalog
                      .filter((s) => normalizeLookupText(s.serviceName || s.name || "").includes(normalizeLookupText(svcSearch)))
                      .map((s) => {
                        const catName = (s.serviceName || s.name || "").toLowerCase().trim();
                        const isDuplicate = services.some((es) => !es._deleted && es.id !== activeRowId &&
                          ((String(es.serviceId) === String(s.id) && es.serviceId) || (es._svcName || "").toLowerCase().trim() === catName));
                        return React.createElement("tr", { key: s.id, style: { borderBottom: `1px solid ${C.border}` } },
                          React.createElement("td", { style: { padding: "8px 10px" } },
                            React.createElement("div", { style: { fontWeight: 600, color: C.text, fontSize: 14 } }, s.serviceName || s.name),
                          ),
                          React.createElement("td", { style: { padding: "8px 10px" } },
                            s.serviceType && React.createElement(Tag, { color: "blue", style: { fontSize: 11 } }, s.serviceType),
                          ),
                          React.createElement("td", { style: { padding: "8px 10px", textAlign: "right", fontWeight: 500 } }, formatMoney(s.basePrice || 0, currencyFromRecord(s, currencies, caseCurrency))),
                          React.createElement("td", { style: { padding: "8px 10px", textAlign: "center" } },
                            React.createElement(Button, {
                              size: "small",
                              type: "primary",
                              disabled: isDuplicate,
                              onClick: () => handleSelectCatalogService(s),
                            }, isDuplicate ? "In case" : "Select"),
                          ),
                        );
                      }),
                  ),
                ),
              ),
              React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", borderTop: `1px solid ${C.border}`, paddingTop: 14 } },
                React.createElement(Button, { onClick: closeServiceModal, style: { ...DS.secondaryButton, width: 100 } }, "Close"),
              ),
            )
            : React.createElement("div", null,
              React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 } },
                React.createElement("span", { onClick: () => setModalView("select"), style: { cursor: "pointer", color: C.info, fontSize: 14, fontWeight: 600 } }, "← Back"),
                React.createElement("span", { style: { fontSize: 18, fontWeight: 700, color: C.text, fontFamily: FONT } }, "Create New Service"),
                React.createElement("span", { onClick: closeServiceModal, style: { cursor: "pointer", color: C.textSub, fontSize: 15, fontWeight: 500 } }, "Close"),
              ),
              React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 } },
                React.createElement("div", null,
                  React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, "Service Name *"),
                  React.createElement(Input, { placeholder: "Enter the service name...", value: newSvcName, onChange: (e) => setNewSvcName(e.target.value), style: { borderRadius: DS.radius.sm, height: 38 } }),
                ),
                React.createElement("div", null,
                  React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, "Service Type (optional)"),
                  React.createElement(Input, { placeholder: "E.g. Legal consultation", value: newSvcType, onChange: (e) => setNewSvcType(e.target.value), style: { borderRadius: DS.radius.sm, height: 38 } }),
                ),
                React.createElement("div", { style: { display: "flex", gap: 12 } },
                  React.createElement("div", { style: { width: 130, flexShrink: 0 } },
                    React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, "Currency"),
                    React.createElement(Select, {
                      value: newSvcCurrencyId || undefined,
                      onChange: setNewSvcCurrencyId,
                      disabled: !currencies.length,
                      style: { width: "100%" },
                      options: currencyOptions,
                    }),
                  ),
                  React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                    React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, `Unit Price (${getCurrencyCode(resolveCurrency(newSvcCurrencyId, currencies) || caseCurrency)})`),
                    React.createElement(AddServiceMoneyInput, { value: newUnitPrice, onChange: setNewUnitPrice, currency: resolveCurrency(newSvcCurrencyId, currencies) || caseCurrency }),
                  ),
                ),
                React.createElement("div", null,
                  React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, "Description (optional)"),
                  React.createElement(Input.TextArea, { rows: 4, placeholder: "Enter the service description...", value: newSvcDescription, onChange: (e) => setNewSvcDescription(e.target.value), style: { borderRadius: DS.radius.sm } }),
                ),
              ),
              React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 14 } },
                React.createElement(Button, { onClick: () => setModalView("select"), style: { ...DS.secondaryButton, width: 100 } }, "Cancel"),
                React.createElement(Button, { type: "primary", onClick: handleCreateCustomService, style: { ...DS.primaryButton, width: 140 } }, "Save & Select"),
              ),
            ),
        ),

        // APPLY COMBO MODAL — same content as today's addModal combo tab
        // (Segmented select/adhoc, catalog list, applyComboFromCatalog,
        // renderAdhocComboTab), now its own modal.
        React.createElement(Modal, {
          title: "Apply Combo",
          open: comboModalOpen,
          onCancel: () => setComboModalOpen(false),
          footer: null,
          width: 650,
        },
          React.createElement(Segmented, {
            block: true,
            value: comboSubTab,
            onChange: setComboSubTab,
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
                      style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: DS.radius.sm, marginBottom: 8 },
                    },
                      React.createElement("div", null,
                        React.createElement("div", { style: { fontWeight: 600 } }, c.comboName || `Combo #${c.id}`),
                        React.createElement("div", { style: { fontSize: 12, color: C.textSub } }, `${(c.serviceComboItems || []).length} service(s)`),
                      ),
                      React.createElement(Button, {
                        size: "small", type: "primary", loading: applyingCombo,
                        onClick: () => applyComboFromCatalog(c),
                      }, "Apply"),
                    )),
              ),
            )
            : renderAdhocComboTab(),
        ),
```

Delete the old Add Service modal block (`CaseServices.js:4987-5187`) and everything inside it — the Segmented Line/Combo toggle, both branches, the whole `<Form>`.

Inside `renderAdhocComboTab` (`CaseServices.js:3091-3118`) and `applyComboFromCatalog`'s success path (`CaseServices.js:3034-3035`) and `applyAdhocCombo`'s success path (`CaseServices.js:3081-3082`), the `closeAddModal()` calls need to become `setComboModalOpen(false)` — these are the only 3 call sites.

- [ ] **Step 7: Point the top-level buttons and combo-header-bar at the new state**

In the Card's `extra` (`CaseServices.js:4707-4727`), change the "New service" button's `onClick` from `() => openAddModal()` to `() => addRow()`, and add a new "Apply Combo" button right after it:

```js
          React.createElement(Button, {
            size: "small",
            type: "primary",
            onClick: () => addRow(),
          }, "New service"),
          React.createElement(Button, {
            size: "small",
            onClick: () => setComboModalOpen(true),
          }, "Apply Combo"),
```

(Leave the duplicate hidden `display: "none"` block at `CaseServices.js:4731-4761` — it's already unreachable/dead markup unrelated to this task; don't touch it.)

In `renderComboHeaderBar` (`CaseServices.js:4178-4218`), change the "+ Add service" button's `onClick` from `() => openAddModal({ comboId: record.comboId, comboName: record.comboName })` to `() => addRow({ comboId: record.comboId, comboName: record.comboName })`.

In the same function, change the "Remove combo" `Popconfirm`'s `onConfirm` from `() => handleRemoveCombo(record._groupKey)` to a new inline deferred version (see **Deviations**, point 4):

```js
            onConfirm: () => {
              services
                .filter((row) => !row._deleted && getComboGroupKey(row) === record._groupKey)
                .forEach((row) => deleteRow(row.id));
            },
```

`handleRemoveCombo` (`CaseServices.js:3339-3367`) becomes unused after this — leave its definition in place for now (Task 3 doesn't need it removed, and deleting a whole unused function is a separate, lower-priority cleanup not required for this feature to work correctly).

- [ ] **Step 8: Verify syntax**

Run: `node --check "All Module/Case/CaseServices.js"`
Fix any error before continuing — this step touches the most code in the whole plan.

- [ ] **Step 9: Manual verification**

Reload the Services tab in the browser and check, without clicking Save yet:
1. Click "New service" → the picker modal opens (not the old form). Search works. Pick a catalog service → row appears in the table showing that service's name/type, Subtotal editable inline, with a currency dropdown next to it.
2. Open the browser Network tab, confirm **no** `projectServices:create` request fired from step 1.
3. Click "New service" again → "Create new" → type a name that already exists in the case (from step 1) → confirm the modal blocks with an error and does not close.
4. Type a genuinely new name instead → "Save & Select" → row appears, tagged as custom.
5. Click the "Service & Type" cell of an **existing** (already-saved) row → picker opens, pick a different catalog service → row's name/type update instantly, no network call.
6. Click the trash icon on one of the brand-new draft rows from step 1 or 4 → it disappears from the table with no confirm dialog and no network call.
7. Click the trash icon on an existing row → the same Popconfirm as before still appears; confirming it removes the row from view but — check Network tab — no `projectServices:update` fires yet (deferred to Task 3's Save).
8. Click "Apply Combo" → confirm the combo modal (catalog select + ad-hoc tabs) still works exactly as before, and applying a combo still immediately persists (unaffected by this task, per the spec's non-goals).

- [ ] **Step 10: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "feat(case-services): replace immediate-save identity editing with a draft picker modal"
```

---

### Task 3: `handleSave` — batched persistence with cascade preserved

**Files:**
- Modify: `All Module/Case/CaseServices.js` (new `handleSave`, new "Cancel changes/Save" bar)

**Interfaces:**
- Consumes: `createOneCaseService` (`CaseServices.js:2691-2933`, unchanged), `softDeleteOneService` (`CaseServices.js:3247-3305`, unchanged), `syncAllThree` (`CaseServices.js:1900-1984`, unchanged), `syncCaseTotalAmount` (unchanged), `services`/`setDirty`/`setSubmitting` (Tasks 1-2).
- Produces: `handleSave()`, called by the new Save button in this task and consumed by Task 4's catalog-prompt tail.

- [ ] **Step 1: Add `handleSave`**

Add this new function right after `handleRemoveCombo`'s closing `};` (`CaseServices.js:3367`, right before the `// ── Open the service-select modal for a contract ──` comment):

```js
      // Batched Save for the draft table. Reuses three already-verified
      // functions per row instead of re-deriving their cascade logic:
      //   - createOneCaseService (unchanged) for new rows — same duplicate
      //     check, pricing, folder provisioning it already had.
      //   - softDeleteOneService (unchanged) for existing rows marked
      //     _deleted — keeps soft-deleting linked contractServices/
      //     quotationServices and resyncing their header totals, exactly
      //     like handleDelete already does today.
      //   - syncAllThree (unchanged), called once per identity field plus
      //     one combined pricing call, for existing rows' edits — keeps
      //     pushing the same change into linked quotationServices/
      //     contractServices and resyncing quotation/contract/case totals,
      //     exactly like handleInlineEdit already does today.
      // Every existing (!_isNew, !_deleted) row runs its sync pass
      // unconditionally, even if nothing actually changed — serviceId has
      // no separate "as loaded" baseline to diff against (handleSelectCatalogService/
      // handleCreateCustomService mutate it directly, not a _-prefixed
      // draft copy), so reliable per-field no-op detection isn't cheap to
      // get right. A few redundant no-op API calls per unchanged row is a
      // safe tradeoff given a case typically has a handful of services, not
      // hundreds — mirrors syncCaseTotalAmount's own "recompute from
      // scratch every time" philosophy.
      const handleSave = async () => {
        const invalid = services.find((r) => !r._deleted && !(r._svcName || "").trim());
        if (invalid) {
          message.warning("Please enter a name for every service.");
          return;
        }
        setSubmitting(true);
        const syncWarnings = [];
        try {
          const createdCustomRows = [];
          for (const r of services) {
            if (r._deleted && r._isNew) {
              continue; // never persisted — nothing to do
            } else if (r._deleted && !r._isNew) {
              await softDeleteOneService(r, syncWarnings);
            } else if (!r._deleted && r._isNew) {
              const addAsPackage = servicePricingSummary.isPackageMode || !!(r.comboId || r.comboName);
              const { id: psId } = await createOneCaseService({
                serviceId: r.serviceId,
                serviceName: r._svcName,
                serviceType: r._serviceType,
                description: r._description,
                basePrice: addAsPackage ? 0 : r._basePrice,
                vat: addAsPackage ? 0 : r._vat,
                currencyId: r._currencyId || null,
                comboTarget: (r.comboId || r.comboName) ? { comboId: r.comboId, comboName: r.comboName } : null,
              }, { skipReload: true });
              if (psId && r._isCustom) createdCustomRows.push({ ...r, id: psId });
            } else {
              await syncAllThree(r, "serviceName", r._svcName);
              await syncAllThree(r, "serviceType", r._serviceType);
              await syncAllThree(r, "description", r._description);
              await syncAllThree(r, "serviceId", r.serviceId);
              // basePrice + vat + currencyId must be applied together in ONE
              // syncAllThree call: its basePrice branch reads record.vat as
              // the fallback for "the field not being set right now", and
              // record.vat is the frozen as-loaded value — two separate
              // sequential calls (one for basePrice, one for vat) would each
              // silently overwrite the other's change back to its old value.
              // Pre-patching vat/currencyId onto the record passed in avoids
              // that without touching syncAllThree itself.
              const pricingRecord = { ...r, vat: r._vat, currencyId: extractCurrencyId(r._currencyId) || r.currencyId };
              await syncAllThree(pricingRecord, "basePrice", r._basePrice);
            }
          }
          await syncCaseTotalAmount(currentId);

          if (syncWarnings.length > 0) {
            message.warning(`Services saved. Could not sync: ${syncWarnings.join(", ")}.`);
          }

          const customRowsAwaitingCatalogDecision = createdCustomRows.filter((r) => r._svcName?.trim());
          if (customRowsAwaitingCatalogDecision.length > 0) {
            openCatalogPrompt(customRowsAwaitingCatalogDecision);
          } else {
            await finishSaveFlow();
          }
        } catch (err) {
          console.error(err);
          message.error("Failed to save: " + (err?.message || ""));
        } finally {
          setSubmitting(false);
        }
      };

      // Shared tail for both "nothing to prompt about" and the catalog
      // prompt's own Save-selected/Skip buttons (Task 4).
      const finishSaveFlow = async () => {
        message.success("Services saved.");
        setDirty(false);
        await loadData();
      };
```

(`openCatalogPrompt` is defined in Task 4 — this task will not compile-clean/run correctly in isolation until Task 4 also lands; that's expected and called out in Task 4's own header. If you need Task 3 to be independently runnable, temporarily stub `const openCatalogPrompt = async () => { await finishSaveFlow(); };` above `handleSave` and delete the stub in Task 4 — optional, not required by this plan's sequencing since both tasks land in the same PR-equivalent before the feature is used.)

- [ ] **Step 2: Add the "Cancel changes / Save" bar**

In the Card's children, right after `servicesSummaryPanel(),` (`CaseServices.js:4783`), add:

```js
        dirty && React.createElement("div", { style: { ...ui.section, display: "flex", justifyContent: "flex-end", gap: 8 } },
          React.createElement(Button, { onClick: () => { setDirty(false); loadData(); } }, "Cancel changes"),
          React.createElement(Button, {
            type: "primary",
            loading: submitting,
            onClick: submitting ? undefined : handleSave,
          }, "Save"),
        ),
```

- [ ] **Step 3: Verify syntax**

Run: `node --check "All Module/Case/CaseServices.js"`

- [ ] **Step 4: Manual verification (do this together with Task 4 — see Task 4's own verification step for the full end-to-end pass)**

For now, confirm: making any edit (add a row, edit a price, delete a row) makes the new "Cancel changes / Save" bar appear at the bottom of the table; clicking "Cancel changes" reverts to the last-saved state (reloads from server) and hides the bar.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "feat(case-services): batch persistence into a single Save action"
```

---

### Task 4: "Save to catalog?" confirm modal

**Files:**
- Modify: `All Module/Case/CaseServices.js` (new state, new helpers, new modal, wire into Task 3's `handleSave`)

**Interfaces:**
- Consumes: `caseInfo` (for `internalCompanyId`), `serviceCatalog` (for the already-in-catalog exclusion check), `finishSaveFlow` (Task 3).
- Produces: `openCatalogPrompt(rows)` (called by Task 3's `handleSave`), `toggleCatalogPromptRow`, `handleSaveSelectedToCatalog`, `handleSkipCatalogPrompt`.

- [ ] **Step 1: Add the diacritic-insensitive name-matching helpers**

These are copied verbatim from `ContractCreateForm.js:3248-3252` and `5595-5596` (already used this session for `TaskManagement.js`'s Save-as-template feature) — same reasoning: two names that differ only by Vietnamese diacritics or extra whitespace should still count as the same service. Add near the top of the file, right after `normalizeMoneyDraft`/before the `CaseServices` component (i.e., alongside the other free functions around `CaseServices.js:444-451`, next to `isDeletedServiceLine`):

```js
    const normalizeSearch = (value) =>
      String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const serviceNameKey = (value) =>
      normalizeSearch(value).replace(/\s+/g, " ").trim();
```

- [ ] **Step 2: Add catalog-prompt state and handlers**

Add alongside the other modal state (near `svcModalOpen` from Task 2):

```js
      const [catalogPromptRows, setCatalogPromptRows] = useState([]);
      const [showCatalogPrompt, setShowCatalogPrompt] = useState(false);
      const [catalogPromptChecked, setCatalogPromptChecked] = useState({});
      const [catalogSaving, setCatalogSaving] = useState(false);

      // Rows already present in the catalog (by normalized name) are shown
      // but not checkable — avoids creating a duplicate catalog row for a
      // typed name that happens to already be standardized under a
      // slightly different-looking (but same-normalized) spelling.
      const openCatalogPrompt = (rows) => {
        const enriched = rows.map((r) => ({
          ...r,
          _alreadyInCatalog: serviceCatalog.some(
            (s) => serviceNameKey(s.serviceName || s.name) === serviceNameKey(r._svcName),
          ),
        }));
        setCatalogPromptRows(enriched);
        setCatalogPromptChecked(
          Object.fromEntries(enriched.filter((r) => !r._alreadyInCatalog).map((r) => [r.id, false])),
        );
        setShowCatalogPrompt(true);
      };

      const toggleCatalogPromptRow = (id) => {
        setCatalogPromptChecked((prev) => ({ ...prev, [id]: !prev[id] }));
      };

      const handleSaveSelectedToCatalog = async () => {
        const rowsToSave = catalogPromptRows.filter((r) => catalogPromptChecked[r.id]);
        const internalCompanyId = extractId(caseInfo?.internalCompanyId) || extractId(caseInfo?.internalCompany);
        setCatalogSaving(true);
        try {
          for (const r of rowsToSave) {
            await ctx.api.request({
              url: "services:create",
              method: "POST",
              data: {
                serviceName: r._svcName,
                serviceType: r._serviceType || null,
                description: r._description || null,
                basePrice: r._basePrice || 0,
                internalCompanyId: internalCompanyId || null,
              },
            });
          }
        } catch (err) {
          console.error(err);
          message.warning("Some services could not be saved to the catalog: " + (err?.message || ""));
        }
        setCatalogSaving(false);
        setShowCatalogPrompt(false);
        await finishSaveFlow();
      };

      const handleSkipCatalogPrompt = async () => {
        setShowCatalogPrompt(false);
        await finishSaveFlow();
      };
```

If Task 3 was implemented with the temporary `openCatalogPrompt` stub, delete that stub now — this step's real `openCatalogPrompt` replaces it.

- [ ] **Step 3: Add the modal JSX**

Add right after the Apply Combo modal from Task 2, Step 6:

```js
        // SAVE TO CATALOG? — appears once after Save, only if this session
        // created at least one custom-named (non-catalog) row.
        React.createElement(Modal, {
          title: "Save to catalog?",
          open: showCatalogPrompt,
          onCancel: handleSkipCatalogPrompt,
          maskClosable: false,
          footer: React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
            React.createElement(Button, { onClick: handleSkipCatalogPrompt }, "Skip"),
            React.createElement(Button, {
              type: "primary",
              loading: catalogSaving,
              onClick: handleSaveSelectedToCatalog,
            }, "Save selected"),
          ),
          width: 640,
        },
          React.createElement("div", { style: { marginBottom: 12, color: C.textSub, fontSize: 13 } },
            "These services were typed manually and aren't in the standardized services catalog yet. Check any you'd like to add, so future cases can pick them from the catalog instead of retyping them.",
          ),
          React.createElement("div", { style: { display: "grid", gap: 8 } },
            catalogPromptRows.map((r) => React.createElement("div", {
              key: r.id,
              style: { display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: DS.radius.sm, background: r._alreadyInCatalog ? C.bgSection : "#fff" },
            },
              r._alreadyInCatalog
                ? React.createElement("div", { style: { width: 16 } })
                : React.createElement("input", {
                  type: "checkbox",
                  checked: !!catalogPromptChecked[r.id],
                  onChange: () => toggleCatalogPromptRow(r.id),
                  style: { marginTop: 3 },
                }),
              React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontWeight: 600, color: C.text } }, r._svcName),
                React.createElement("div", { style: { fontSize: 12, color: C.textSub } },
                  [r._serviceType, formatMoney(r._basePrice || 0, resolveCurrency(r._currencyId, currencies) || caseCurrency)].filter(Boolean).join(" · "),
                ),
              ),
              r._alreadyInCatalog && React.createElement(Tag, { color: "default" }, "Already in the catalog"),
            )),
          ),
        ),
```

- [ ] **Step 4: Verify syntax**

Run: `node --check "All Module/Case/CaseServices.js"`

- [ ] **Step 5: Full end-to-end manual verification**

Reload the Services tab and run through the spec's own testing plan (§5), which this step folds in and extends with the three cascade-specific checks from **Deviations**:

1. "New service" → pick a catalog service → row shows fields, no Save yet (confirm no `projectServices` row was created by querying the collection directly, or just checking the Network tab shows nothing fired).
2. "New service" again → "Create new" → typed name → confirm `_isCustom` (no direct visual cue needed — just proceed to step 5 and confirm it's offered there).
3. Add one more typed-name row using a name that **already exists in the catalog**, and one more catalog-picked row. Edit a price/description inline on one row. Delete a different freshly-added draft row via its own delete icon — confirm it disappears with no network call.
4. Click "Save". Confirm: the expected `projectServices:create`/`:update` calls fire (matching the non-deleted draft rows), `syncCaseTotalAmount` runs once, and the "Save to catalog?" dialog appears listing the genuinely-new custom row as checkable and the catalog-colliding one as "Already in the catalog" (not checkable).
5. Check the checkable box, click "Save selected". Confirm exactly one new `services` row was created, with the case's own `internalCompanyId`, and it does not show up for a different company's cases' catalog picker.
6. Confirm the case's own service rows from step 4 are correct regardless of what was chosen in step 5.
7. Repeat steps 1-4 for a service already added to the case in an earlier session (an existing row) — edit its price and name, click Save, and confirm the end state matches what today's immediate-save behavior would have produced.
8. **Cascade check (existing row, price edit):** on a row that already has a linked quotation (its "Sub"/"Main" badge shows), change its price via the draft table and Save. Open that quotation and confirm its total updated — this exercises the `syncAllThree` reuse from Task 3.
9. **Cascade check (existing row, delete):** on a row that already has a linked contract, delete it via the draft table and Save. Confirm the linked `contractServices` row is soft-deleted and the contract's total recomputed — this exercises the `softDeleteOneService` reuse from Task 3.
10. **Combo removal check:** with at least one other unsaved draft edit sitting in the table, click "Remove combo" on a combo section. Confirm the combo's rows disappear from view *without* an immediate network call and *without* discarding your other unsaved edit — only clicking Save afterward should persist both.
11. Confirm package/combo mode: apply a catalog combo via "Apply Combo", confirm it's completely unaffected (still applies immediately, independent of the draft table and the catalog-confirm step).
12. Confirm the 3 duplicate-name checks still work: typing a name colliding with another **draft** row is blocked in the picker; typing a name colliding with an existing **catalog** entry is still selectable as a case service, but excluded (not checkable) from the catalog-confirm step.

- [ ] **Step 6: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "feat(case-services): add Save-to-catalog confirm for newly typed service names"
```

---

### Task 5: Cleanup pass (optional, low-risk)

**Files:**
- Modify: `All Module/Case/CaseServices.js`

This task is separable from the feature working correctly — it removes now-dead code for readability. Skip it if time is short; nothing in Tasks 1-4 depends on it.

- [ ] **Step 1: Confirm and remove dead code**

Grep the file for `Form\.` and `Segmented` usage. If `Form`/`Segmented` (the destructured `ctx.antd` components, `CaseServices.js:2`) are no longer referenced anywhere after Task 2's edits, remove them from that destructuring line. Grep for `handleRemoveCombo` and `handleDelete` — if `handleDelete` has no remaining callers (it shouldn't, after Task 2 Step 4), consider whether to delete it or leave it (matches this session's established precedent of leaving small dead helpers in place when the surrounding file is large and interleaved — see `TaskManagement.js`'s dead `PreviewModal` cluster left in place for the same reason). If left in place, no action needed.

- [ ] **Step 2: Verify syntax and commit**

```bash
node --check "All Module/Case/CaseServices.js"
git add "All Module/Case/CaseServices.js"
git commit -m "chore(case-services): remove dead Form/Segmented imports after draft-table retrofit"
```

## Self-review notes

- Spec coverage: §4.1 (row shape) → Task 1. §4.2 (columns) → Task 2 Steps 4-5. §4.3 (draft add/edit/delete) → Task 2 Steps 1-3, 7. §4.4 (picker duplicate checks) → Task 2 Step 2/6. §4.5 (handleSave) → Task 3, with the two cascade gaps fixed (see **Deviations**). §4.6 (catalog confirm) → Task 4. §4.7 (what stays untouched) → verified by name against the actual file for every item during research (package-mode hiding untouched in Task 2 Step 5; folder provisioning untouched, reused via `createOneCaseService`; Status/Action column behavior for `!_isNew` rows unchanged in Task 2 Step 4; combo/ad-hoc flows untouched, only their modal wrapper moved in Task 2 Step 6).
- Every file:line citation in this plan was verified against the current file content directly (not copied from the spec unchecked) — one spec citation (`CaseServices.js:1382-1436`/`1397-1436` for the Status/Action column) turned out to be stale; the real location (`CaseServices.js:4016-4095`) is what this plan uses throughout.
- Type/name consistency check: `_svcName`/`_serviceType`/`_description`/`_basePrice`/`_vat`/`_currencyId` are used with those exact names in every task that touches them (Tasks 1, 2, 3). `services`/`setServices` (not `rows`) used throughout, per **Deviations** point 3.
