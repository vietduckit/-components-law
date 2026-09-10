# CaseCreateForm.js — Save to Catalog Confirm — Design

Date: 2026-09-10
Status: Approved by user, implementing directly (no separate plan doc — user requested spec-then-code)

## 1. Overview

`CaseServices.js` (add-service-to-an-existing-case screen) already offers a one-time "Save to catalog?" confirm after Save, for any service the user typed instead of picking from the catalog. The user's original request was about the **create forms** (`CaseCreateForm.js`/`ContractCreateForm.js`/`QuotationCreateForm.js`) — none of which have this feature yet (verified: zero `services:create` calls in any of the three). This spec covers `CaseCreateForm.js` — the first of the three, per the established Case → Contract → Quotation sequence. It reuses the already-approved modal pattern (see the confirmed "Service Catalog Pattern" artifact) as-is, adapted for this form's own submit flow.

## 2. Architecture discovery: `services` vs `companyServices`

Two distinct catalog-adjacent collections exist:

- **`services`** — the global service catalog. Has its own `internalCompanyId` column. `CaseServices.js`'s picker reads this table directly, filtered client-side by `internalCompanyId`.
- **`companyServices`** — a company↔service **pricing join table** (confirmed both by its own field shape in `CaseCreateForm.js:8446-8474`, `s.price ?? s.basePrice`, `getInternalCompanyId(s)`, and independently by an earlier spec's research: *"companyServices (an unrelated company↔service pricing join table..."*, `docs/superpowers/specs/2026-09-09-service-template-standardization-design.md:101`). `SRS_LawFirm_NocoBase.md` documents it as a business rule: **BR-DATA-02 — "Service picker chỉ lấy `companyServices` khớp internal company hiện tại."**

`CaseCreateForm.js`'s own `ServicePickerModal` ("Select from Catalog" tab) reads `svcOpts`, which is sourced from `companyServices:list` (`fetchCompanyServices`, `CaseCreateForm.js:491-511`) — **not** `services` directly. This means a `services:create`-only "save to catalog" (the approach already shipped in `CaseServices.js`) would leave the new service invisible to `CaseCreateForm.js`'s own picker (and to `ContractCreateForm.js`/`QuotationCreateForm.js`'s, which use the same `companyServices`-based pattern) until someone manually adds a `companyServices` link via NocoBase's native admin.

**Decision (confirmed with user):** create both. `services:create` first (the catalog definition), then `companyServices:create` linking it to the current `internalCompanyId` with the price/currency the user entered on that row — so the new service is immediately selectable everywhere, not just a pending draft. No existing code in this repo writes to `companyServices` (`companyServices:create` — zero matches repo-wide), so this is new ground; the create call gets defensive error-handling (warn and continue, don't block) rather than the fallback-retry cascade used for collections whose write shape is already proven correct.

**Follow-up (not part of this spec's own testing plan, done as a small mechanical addition once this ships):** `CaseServices.js:handleSaveSelectedToCatalog` currently only does `services:create` — it gets the same `companyServices:create` addition for consistency, once this file's version is proven working.

## 3. Mechanism

### 3.1 Trigger point

`handleSubmit`'s success tail (`CaseCreateForm.js:11001-11006`) currently reads:

```js
message.success("Case created successfully!");
isDirtyRef.current = false;
setSubmittingState(false);
setSubmitStep("");
await closePopupAfterSubmit();
return;
```

`closePopupAfterSubmit()` unmounts the whole form (`CaseCreateForm.js:875-878`, `closeCurrentPopup()` tries `ctx.view.close`/`ctx.popup.close`/etc.) — so any new modal must render and be interacted with **before** that call. Changed to:

```js
message.success("Case created successfully!");
isDirtyRef.current = false;
setSubmitStep("");

const customRows = rows.filter((r) => !r.serviceId && r.serviceName?.trim());
if (customRows.length > 0) {
  openCatalogPrompt(customRows);
  setSubmittingState(false);
  return; // popup stays open — closePopupAfterSubmit runs from Skip/Save Selected instead
}

setSubmittingState(false);
await closePopupAfterSubmit();
return;
```

`rows` (the form's own service-line state) already has combo-derived rows flattened in alongside individually-added ones by the time `handleSubmit` runs (`applyAdhocCombo`/`applyCombo` push straight into `rows`) — both a plain custom row and a custom combo-item row end up with `serviceId: null`, so one filter covers both without special-casing combos.

### 3.2 Catalog state and handlers

New state in `ProjectCreateForm` (verify no name collision against the component's existing state before adding — it's a large component):

```js
const [showCatalogPrompt, setShowCatalogPrompt] = useState(false);
const [catalogPromptRows, setCatalogPromptRows] = useState([]);
const [catalogPromptChecked, setCatalogPromptChecked] = useState({});
const [catalogSaving, setCatalogSaving] = useState(false);
```

```js
const openCatalogPrompt = (candidateRows) => {
  const enriched = candidateRows.map((r) => ({
    ...r,
    _alreadyInCatalog: svcOpts.some(
      (s) => serviceNameKey(s.serviceName) === serviceNameKey(r.serviceName),
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
  setCatalogSaving(true);
  for (const r of rowsToSave) {
    try {
      const svcRes = await ctx.api.request({
        url: "services:create",
        method: "POST",
        data: {
          serviceName: r.serviceName,
          serviceType: r.serviceType || null,
          description: r.description || null,
          basePrice: r.basePrice || 0,
          currencyId: r.currencyId || null,
          internalCompanyId: parseInt(form.internalCompanyId),
        },
      });
      const newServiceId = svcRes?.data?.data?.id;
      if (newServiceId) {
        try {
          await ctx.api.request({
            url: "companyServices:create",
            method: "POST",
            data: {
              internalCompanyId: parseInt(form.internalCompanyId),
              serviceId: newServiceId,
              price: r.basePrice || 0,
              basePrice: r.basePrice || 0,
              currencyId: r.currencyId || null,
            },
          });
        } catch (linkErr) {
          console.warn("Could not link new service to company catalog:", linkErr);
          message.warning(`"${r.serviceName}" đã lưu vào catalog nhưng chưa gán được giá riêng cho company — cần thêm thủ công trong companyServices.`);
        }
      }
    } catch (err) {
      console.error(err);
      message.warning(`Could not save "${r.serviceName}" to the catalog: ` + (err?.message || ""));
    }
  }
  setCatalogSaving(false);
  setShowCatalogPrompt(false);
  await closePopupAfterSubmit();
};

const handleSkipCatalogPrompt = async () => {
  setShowCatalogPrompt(false);
  await closePopupAfterSubmit();
};
```

Dedup check reuses `svcOpts` (already loaded/company-scoped in this component's own state — no extra fetch) and `serviceNameKey` (`CaseCreateForm.js:3248-3252`/`5595-5596`, already used by `ServicePickerModal`'s own duplicate handling). A row whose name already matches an `svcOpts` entry is shown but not checkable, same as `CaseServices.js`.

### 3.3 Modal JSX

Identical markup/styling to `CaseServices.js`'s already-shipped "Save to catalog?" modal (the confirmed pattern) — title, one-line explanation, checkbox list (checked services show name/type/price, excluded ones show a static "Already in catalog" tag instead of a checkbox), footer `Skip` / `Save Selected (N)`. Rendered as a sibling in `ProjectCreateForm`'s own top-level return, gated on `open: showCatalogPrompt`.

## 4. Non-goals

- `ContractCreateForm.js`/`QuotationCreateForm.js` — same feature, separate follow-up, not touched here.
- `CaseServices.js`'s own `companyServices:create` gap — fixed as a small follow-up once this ships (§2), not part of this spec's testing plan.
- No new schema/columns. Fully additive: only new rows in already-existing `services`/`companyServices` tables.
- No change to how `rows` itself is built, validated, or submitted for the case's own `projectServices` rows — this only adds a step after that already-proven flow succeeds.

## 5. Testing / verification plan

1. Create a case with only catalog-picked services (no typed names) → submit → confirm popup closes immediately, same as today, no catalog modal appears.
2. Create a case with one typed (non-catalog) service → submit → confirm the case is created successfully (query `projects`/`projectServices` directly if needed), *then* the "Save to catalog?" modal appears listing that one service, checkable.
3. Check it, click "Save Selected" → confirm a new `services` row exists with the right `internalCompanyId`, *and* a new `companyServices` row links it with the entered price — then confirm the popup closes.
4. Repeat with "Skip" instead → confirm no `services`/`companyServices` row was created, and the popup still closes correctly.
5. Type a service name that already exists in the catalog → submit → confirm that row appears in the modal marked "Already in catalog", not checkable.
6. Build a combo in the combo builder with one ad-hoc/custom item (not catalog-picked) → submit → confirm that custom combo item also shows up in the catalog-confirm modal, same as a plain custom row.
7. Force the `companyServices:create` call to fail (e.g., temporarily rename the field in a test payload) → confirm the `services` row still exists, the case's own creation is unaffected, and the warning message appears — proving the fallback doesn't block or roll back anything already saved.

## 6. Rollback

Fully additive — no schema changes. Rollback is data-level (delete any mistakenly-created `services`/`companyServices` rows) or code-level (revert `CaseCreateForm.js`'s `handleSubmit` tail and the new modal block).
