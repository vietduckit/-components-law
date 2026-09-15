# Contract Detail View — Unified Basic Info Card — Design Spec

Date: 2026-09-15
Status: Implemented (full merge — see §2 revision)

## 1. Overview

The Contract detail page's "Details" tab mixed 3 visually inconsistent UI styles: the native NocoBase auto-generated form for `contracts` (generic label-above-input, "Basic Info" section), and two custom JS Blocks with their own card styling (`ContractServices.js`, `ContractPaymentScheduleDetailBlock.js`). The user asked for one consistent JS-Block-rendered page instead of this "nửa nạc nửa mỡ" (neither-fish-nor-fowl) mix, with field visibility varying by `contractType`.

## 2. Scope decision — revised twice

**First pass**: scoped down to Basic Info only (`ContractServices.js`/`ContractPaymentScheduleDetailBlock.js` left untouched), because JS Blocks in this runtime have no cross-file import mechanism — reusing another block's code needs `ctx.openView(viewUid, ...)` against a popup already configured in the Admin UI Page Designer, and no such `viewUid` existed or could be created this session.

**Second pass (current, at the user's explicit request — "gộp toàn bộ luôn nhé", confirmed again with "tiếp tục" after being shown the concrete scale)**: all 3 sections are merged, via a **mechanical wrap, not a rewrite** — each source file's full, unmodified content is embedded verbatim inside its own IIFE in `ContractDetailView.js`, which returns the file's top-level component instead of the file's own `ctx.render(...)` call:

```js
const ContractServicesModule = (() => {
  // ...every line of ContractServices.js, unchanged, minus its own ctx.render(...)...
  return ContractServicesBlock;
})();
```

Each of the 3 IIFEs is its own closure, so the 3 originally-independent files' top-level identifiers (all 3 declare their own `C`, `extractId`, `parseNum`, `formatMoney`, etc. — sometimes with real behavioral differences, e.g. `ContractServices.js`'s `formatMoney` is currency-aware, `ContractPaymentScheduleDetailBlock.js`'s always appends "VND") never collide or get deduplicated into one, possibly-wrong shared version. This was a deliberate choice over hand-porting: `ContractServices.js` alone (3790 lines) implements multi-currency exchange-rate conversion, line-vs-package pricing modes, a service-combo builder/catalog, and cascading syncs to `contracts`/`projects`/`quotations` — re-deriving that by hand risked silently mis-pricing a real contract, with no live browser available this session to catch it.

**Consequence — a real, ongoing maintenance cost**: the merge was done once, via a shell `head`/`cat` concatenation (see `ContractDetailView.js`'s own header comment), not a live import. `ContractServices.js` and `ContractPaymentScheduleDetailBlock.js` remain the source of truth for their own logic and are NOT deleted — but a future edit to either one does not automatically reach the merged page. Whoever edits Contract Services or Payment Schedule logic going forward must either edit the source file AND re-run the same wrap into `ContractDetailView.js`, or (simpler, recommended for any future change) edit the wrapped copy inside `ContractDetailView.js` directly and backport the change into the standalone source file to keep the two from silently drifting apart. This is the accepted trade-off for "one page, one file" over "always in sync automatically."

## 3. Permission model (new requirement — confirmed not to exist anywhere in this codebase before this)

```
canEdit = (contract.lawyers.user.id === currentUser.id)   -- "Person Responsible"
          OR (contract.createdById === currentUser.id)     -- record creator
```

No admin-role override — not asked for, not confirmed. Everyone else sees a fully read-only card (Edit button hidden) — **view access itself is not blocked**, only editing, since other roles (accounting, other lawyers) plausibly still need to read a contract they didn't create and aren't responsible for.

## 4. Editable vs. read-only field split

Only administrative/reference fields are inline-editable (toggled via an "Edit" button that switches the same card into input fields, saved via a single `contracts:update` call — no separate popup, sidestepping the same cross-block-reuse limitation from §2):

- **Editable**: `contractName`, `lawyers` (Person Responsible), `template`, `customers`, `internalCompany`, `currencies`, `issuedDate`, `signedAt`, `effectiveAt`, `language`, `scopeNote`, `description`.
- **Always read-only, even to a user who canEdit**: `contractCode` (sequence, server-generated), `contractType` (changing type post-creation is out of scope — too structural), `status` (already owned by the separate "Status Progress" stepper block on the same page), `billingCycle`/`feeModel`/`totalAmount`/`subTotal`/`vatAmount`/`endDate`/`paymentStatus`/`outStandingAmount` (By Case only — these interact with the `paymentSchedule` JSON structure that only `ContractCreateForm.js` knows how to safely rebuild), and the entire Retainer Billing Plan section (derived/automation-owned, no edit UI exists for it anywhere yet).

## 5. Per-`contractType` sections

Config-driven by a plain `if (isByCase) ... if (isRetainer) ...` branch in the component (not a generic lookup table — only 2 real branches exist today, a lookup table would be premature abstraction for 2 cases) — but structured so adding a third (`byService`, not yet built — see the By Case spec's own follow-up) is a single new branch, not a rewrite:

- **Common** (both types): Contract Code, Contract Name, Person Responsible, Template, Customer, Internal Company, Currency, Issued/Signed/Effective dates, Language, Scope Note, Description.
- **By Case only**: Billing Cycle, Fee Model, Total/Sub Total/VAT Amount, End Date, Payment Status, Outstanding Amount.
- **Retainer only**: the active `contractBillingPlans` row's Plan Type, Status, Total Amount, Retainer Unit, Cycles Billed/Total, Next Billing Date, Start/End Date — fetched via the `billingPlans` relation (confirmed live: retainer-specific fields were migrated OFF `contracts` onto this separate collection by the 2026-09-08 contract-billing-plans-architecture spec; they no longer exist as columns on `contracts` at all).

## 6. Data fetching

One `contracts:get` call with `appends: ["lawyers", "lawyers.user", "customers", "internalCompany", "template", "currencies", "billingPlans"]` — `lawyers.user` specifically needed for the permission check (`lawyers.userId`, the lawyer's own scalar FK to `users`, confirmed via this database's own schema, not assumed). Dropdown options for edit mode (lawyers/templates/customers/companies/currencies) are fetched lazily, only when Edit is actually clicked — not on every page load.

## 7. Deployment

1. File: `All Module/Contract/ContractDetailView.js` — now the full merged page (6161 lines: Basic Info + Contract Services + Payment Schedule).
2. Manual Admin UI step (Page Designer), not scriptable: remove **all 3** existing blocks from the Details tab (the native `contracts` "Basic Info" form, the `ContractServices.js` block, and the `ContractPaymentScheduleDetailBlock.js` block) and replace them with a single JS Block running `ContractDetailView.js`'s content.
3. `ContractServices.js` and `ContractPaymentScheduleDetailBlock.js` as standalone files: kept in the repo (each now marked SUPERSEDED as a *page block* in its own header comment) as the source of truth to edit going forward — see §2's maintenance-cost note.
