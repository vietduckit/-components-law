# Service Combo — Design Spec

Date: 2026-08-24
Status: Approved by user, ready for implementation planning

## 1. Overview

Add a reusable "combo dịch vụ" (service bundle) template that lawyers can pick when creating a Case, Quotation, or Contract, as an alternative to manually adding individual ("lẻ") services. Applying a combo:

- Sets the record's pricing to a single package price (subtotal + VAT), no per-service discount.
- Snapshots the combo's service list into the record's own service line-item collection (`projectServices` / `quotationServices` / `contractServices`), following the same snapshot pattern those collections already use for manually-added services.

This is intentionally a thin layer on top of existing infrastructure: the `pricingMode: "package"` mechanism, `buildServicePricingPayload()` / `calcPackageTotals()` helpers, and the existing Quotation → Contract → Case sync already handle nearly everything a combo needs. Net-new work is: 2 new collections (already configured by the user in Nocobase), 2 computed fields via Nocobase linkage rules (no code), and a "combo vs. individual services" selection step added to the three creation forms.

## 2. Goals

- Lawyer can define a named, reusable combo (fixed package price + VAT + a list of services with quantities) via native Nocobase admin screens — no custom code needed for combo template management.
- Lawyer can pick a combo at Case/Quotation/Contract creation time as an alternative to picking individual services, auto-filling package pricing and snapshotting the combo's services onto the new record.
- Package price shown by the combo is editable at the moment of application (per-client negotiation), not locked.
- Existing package-mode behavior, sync logic, and printed documents are unaffected — combo-derived service rows are indistinguishable from manually-added package-mode rows.

## 3. Non-goals (explicitly out of scope for this iteration)

- No visual grouping/labeling of combo-derived lines in the UI, printed Quotation/Contract docx, or any "which combo did this line come from" tag on individual service rows.
- No `sourceComboId` traceability field on the Case/Quotation/Contract record itself (which combo was used to create this record). Can be added later if reporting needs it.
- No per-line discount inside a combo — combo pricing is a single package subtotal + VAT rate, full stop.
- No support for applying/adding a combo to an *existing* record after creation (post-creation "add from combo" action) — this iteration only covers combo selection during the creation flow. Can be extended later using the same building blocks.
- No change to how Case/Quotation/Contract line items are displayed, edited, or deleted after creation — combo is purely a creation-time fast-fill.

## 4. Data model (already configured in Nocobase by the user)

### `serviceCombos` (collection #62 "Service Combo")

| Field | Type | Notes |
|---|---|---|
| id | snowflakeId | PK |
| comboName | string | Title field |
| comboCode | sequence | Auto-generated code |
| description | text | |
| packageSubTotal | double | Admin-entered package price (before VAT) |
| packageVatRate | double | Admin-entered VAT % |
| packageVatAmount | double | **Computed** — see §5 |
| totalAmount | double | **Computed** — see §5 |
| isActive | boolean | Only `true` combos are selectable at creation time |
| serviceComboItems | hasMany → Service Combo Items | |
| createdAt/createdBy/updatedAt/updatedBy | standard | |

### `serviceComboItems` (collection #63 "Service Combo Items")

| Field | Type | Notes |
|---|---|---|
| id | snowflakeId | PK |
| serviceCombos | belongsTo → serviceCombos | Parent combo |
| services | belongsTo → services (catalog) | The specific catalog service this line represents — a catalog service can belong to many combo items across many combos |
| quantity | double (Number) | Default should be set to `1` in the field config so new rows don't require manual entry |
| serviceId / comboId | bigInt | Redundant raw FK columns left over from initial config; not used by app logic. Safe to leave, no action needed. |
| createdAt/createdBy/updatedAt/updatedBy | standard | |

No further schema changes required — this matches the corrected relation (belongsTo, not hasMany) confirmed with the user.

## 5. Computed fields on `serviceCombos` — no custom code

Configure via Nocobase Linkage Rule (or formula field) on the `serviceCombos` form:

```
packageVatAmount = packageSubTotal * packageVatRate / 100
totalAmount = packageSubTotal + packageVatAmount
```

This mirrors `calcPackageTotals()` already implemented in `CaseServices.js` / `QuotationServices.js` / `ContractServices.js` — same formula, just expressed as a Nocobase linkage rule instead of JS, since the combo template management screen is native Nocobase blocks (no custom JS block for this screen).

## 6. Business logic — combo selection at creation time

Applies identically (same pattern, 3 separate implementations) to `CaseCreateForm.js`, `QuotationCreateForm.js`, `ContractCreateForm.js`.

### 6.1 UI addition

Add a service-source selector near the top of the services section of each create form:

- **Radio/Segmented**: "Dịch vụ lẻ" (default, current behavior) | "Combo gói"

When **"Combo gói"** is selected:

1. Show a `Select` populated from `serviceCombos:list` filtered to `isActive: { $eq: true }`, sorted by `comboName`. Exclude combos with zero `serviceComboItems` (empty combos aren't selectable — filter client-side after fetch, or via a `filter` on the hasMany count if the API supports it; client-side filtering is simplest and consistent with other patterns in this codebase).
2. On combo selection, fetch the combo with `appends: ["serviceComboItems.services"]` to resolve each item's catalog service (name, code, default price if needed for reference) and `quantity`.
3. Auto-fill the form's pricing fields:
   - `pricingMode = "package"`
   - `packageSubTotal = combo.packageSubTotal`
   - `packageVatRate = combo.packageVatRate`
   - These fields remain editable by the lawyer after auto-fill (per user decision — combo price is a starting point, not locked).
4. Render a read-only preview table below the pricing fields: service name + quantity, sourced from the fetched `serviceComboItems`. Purely informational — no editing here, no per-row price.

When **"Dịch vụ lẻ"** is selected (default): existing behavior, completely unchanged.

### 6.2 On form submit (combo path only)

1. Create the parent record (`projects` / `quotations` / `contracts`) using the existing package-mode payload construction (`buildServicePricingPayload()` with `pricingMode: "package"`, `packageSubTotal`, `packageVatRate` — reuse verbatim, do not reimplement totals math).
2. For each `serviceComboItems` row fetched in §6.1 step 2, create one row in the corresponding line-item collection (`projectServices` / `quotationServices` / `contractServices`) using the **existing** "add a service under package mode" code path already present in each `*Services.js` file, with:
   - `serviceId`: the linked catalog service's id
   - `serviceName`: snapshot of the catalog service's name (same snapshot pattern already used for manually-added services — see `QuotationServices.js` lines ~1630/1766/1997)
   - `quantity`: from the combo item
   - `basePrice: 0`, `pricingMode: "package"` (package mode already zeroes individual line prices via `buildServicePricingPayload`)
3. No new "create combo-derived line" function should be written — this must call the same function(s) that "add 1 service" already calls today for package-mode documents, once per combo item, to guarantee combo-derived rows are indistinguishable from manually-added ones (per §3 non-goals).

## 7. Propagation through existing Quotation → Contract → Case sync

The existing `isPackagePricing()` branches in `CaseServices.js` (approx. lines 1656, 1721/1726, 2405–2422) already carry `pricingMode: "package"` and package totals across the Quotation → Contract and Contract/Quotation → Case sync paths. Since a combo-created Quotation is just a package-mode Quotation with snapshot line rows, no new sync code is expected to be required.

**Verification task for implementation** (not assumed, must be checked against actual behavior before considering this done): confirm whether these existing sync branches copy the *individual line rows* (service name + quantity per line) when propagating a package-mode Quotation into a Contract/Case, or whether they only copy the package totals and leave the destination's line items empty/unsynced. If line-level copying is missing today, extend the existing sync function to also copy line rows — do not add combo-specific sync logic; the fix (if needed) belongs to the general package-mode sync path, since it would affect any package-mode document, not just combo-created ones.

## 8. Testing considerations

- Combo with 1 service, quantity 1 — smoke test the full create → snapshot → totals flow for all 3 modules.
- Combo with multiple services, mixed quantities — verify all rows created with correct snapshot values and `basePrice: 0`.
- Editing `packageSubTotal`/`packageVatRate` after auto-fill, before submit — confirm the edited values (not the combo's original values) are what gets saved.
- Combo selected, then user switches back to "Dịch vụ lẻ" before submit — confirm no stale combo state leaks into the individual-services path.
- `isActive: false` combos do not appear in the selection dropdown.
- Empty combo (0 items) does not appear in the selection dropdown.
- A single catalog service used by two different combos — confirm both combos list it correctly (validates the belongsTo relation fix).
- Quotation created via combo, then converted/synced to Contract and Case — confirm package totals AND line items both arrive correctly (this is the §7 verification task, promoted to a test case).

## 9. Summary of net-new code

- `CaseCreateForm.js`, `QuotationCreateForm.js`, `ContractCreateForm.js`: add service-source selector, combo fetch/preview, and combo-items-to-line-rows loop on submit (§6).
- Possible fix to existing package-mode sync in `CaseServices.js` if §7's verification finds line-level copying is missing.
- No new collections, no new computed-value code (handled by Nocobase Linkage Rules), no changes to `QuotationServices.js` / `ContractServices.js` / `CaseServices.js` editing UI, no docx generator changes.
