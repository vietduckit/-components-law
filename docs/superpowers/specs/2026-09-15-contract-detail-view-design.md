# Contract Detail View — Unified Basic Info Card — Design Spec

Date: 2026-09-15
Status: Implemented

## 1. Overview

The Contract detail page's "Details" tab mixed 3 visually inconsistent UI styles: the native NocoBase auto-generated form for `contracts` (generic label-above-input, "Basic Info" section), and two custom JS Blocks with their own card styling (`ContractServices.js`, `ContractPaymentScheduleDetailBlock.js`). The user asked for one consistent JS-Block-rendered page instead of this "nửa nạc nửa mỡ" (neither-fish-nor-fowl) mix, with field visibility varying by `contractType`.

## 2. Scope decision (reduced from the original ask)

Originally scoped as "merge all 3 sections into one JS Block." Reduced to **Basic Info only** — `ContractServices.js` and `ContractPaymentScheduleDetailBlock.js` stay exactly where the page already places them, untouched — for a concrete technical reason discovered mid-implementation: JS Blocks in this runtime are independent scripts with no cross-file import mechanism. Reusing another block's code requires `ctx.openView(viewUid, ...)` against a popup already configured through the Admin UI Page Designer — no such `viewUid` was available for either block, and none could be created without going through that UI. Duplicating those 2 blocks' non-trivial, already-working logic (service combo pricing; payment schedule + auto-PR-status + create-request modal, itself just extended this same session) into a second copy would be a real regression risk for zero functional gain.

This reduction still solves the actual visual complaint: the two existing custom blocks already share a consistent card style with each other — the native form was the true outlier.

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

1. File: `All Module/Contract/ContractDetailView.js` (new).
2. Manual Admin UI step (Page Designer), not scriptable: remove the native `contracts` form block from the Details tab's "Basic Info" area, add a JS Block in its place running this file's content.
3. `ContractServices.js` and `ContractPaymentScheduleDetailBlock.js` blocks: no change, left in their current positions.
