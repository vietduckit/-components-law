# Create Invoice JS Block — Design Spec

Date: 2026-09-23

Status: Approved design, not yet implemented. Companion to `docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md` (the unified Payment/Payment Request architecture this reuses directly).

## 1. Problem

There is currently no way to create an `invoices` record from within the app. `InvoiceGenerator.js` is a pure `.docx` renderer — it reads an existing `invoices` row (plus its linked contract/quotation/services) and produces a Word document; it never writes data. `PaymentCreateBlock.js`'s "By invoice" mode lets a user pick an *existing* invoice to record a payment against, but nothing creates that invoice in the first place. Invoices today can only be created via NocoBase's own generic add-record form, with no business logic connecting them to the Payment/Payment Request data model built out this session.

User asked for a new JS Block, "Create Invoice", covering two real workflows:
1. Billing a customer for a specific Payment Request (an invoice as a bill, issued before or independent of payment).
2. Turning one or more Payments already recorded into a customer-facing invoice/receipt (an invoice as a summary of money already received).

## 2. Schema findings (verified via `JsField/DiagnoseInvoiceSchema.js`, not assumed)

Running the diagnostic against the live `invoices` collection surfaced the real, current schema — several things worth calling out because they contradict what a naive reading of `InvoiceGenerator.js` would suggest:

- **`invoices.paymentRequestId` does not exist.** No field, in any form, links an invoice to a Payment Request today. This must be added.
- **`payments.invoiceId` already exists and works** — a `belongsTo` field (registered relation name `invoices`, plural; the raw FK column is `invoiceId` — the same "association display name ≠ raw column" pattern seen throughout this session). `PaymentCreateBlock.js`'s "By invoice" mode already writes it. This means "one invoice, many payments" is **already a supported relationship** — no new field or junction table needed for that direction; the new block only needs to `payments:update` the selected rows' `invoiceId` once the invoice exists.
- **`invoices.paymentRequestItems` already exists** (`hasMany`, target `paymentRequestItems`, FK `invoiceId` living on `paymentRequestItems`) — a pre-existing, unused path that *could* have linked an invoice to a Payment Request indirectly through its line-item row. **Deliberately not used**: Retainer's Payment Requests never get a `paymentRequestItems` row (§6x of the unified-payment-data-model spec — `CreateContractBillingPlansWorkflow.js`'s create node only inserts into `paymentRequests`), so relying on this path would silently exclude Retainer, repeating the exact class of gap already found and fixed for `payments` this session. A direct `invoices.paymentRequestId` field, mirroring `payments.paymentRequestId`, works uniformly for all 3 contract types.
- **`invoices.invoiceNumber` is `type: sequence`** — Nocobase auto-generates it (e.g. `INV-20260630-001`). The create form must not include it.
- **`invoices.amountPaid`/`outStandingAmount` exist but are not trustworthy.** The one live sample row has `totalAmount: 19440000` alongside `amountPaid: 0` and `outStandingAmount: 0` — internally inconsistent for a non-draft invoice, suggesting these columns are not kept in sync by any active trigger (same symptom pattern as the `payments.paymentRequestId` gap: a column exists but nothing reliably populates it). Out of scope to fix here — the create form leaves them at their schema defaults and does not attempt to compute them.
- **`invoices.accounting`/`accountingId` targets a collection literally named `accounting`** — distinct from `payments.accountingId`, which targets `users`. Its purpose is unknown to the user; **excluded from the form** rather than guessed at.
- `invoices.description` is `interface: richText` (stored as HTML, e.g. `"<p>...</p>"`) — the form uses a plain multi-line text input and does not attempt real rich-text editing; this is an intentional scope cut for a first version, not an oversight.

## 3. Data model change

One new field, registered the same way as `payments.paymentRequestId` (`JsField/RegisterPaymentRequestLinkFields.js`, itself modeled on the already-proven `RegisterPaymentRequestAssignedLawyerField.js`):

```js
{
  name: "paymentRequest",
  type: "belongsTo",
  interface: "m2o",
  target: "paymentRequests",
  foreignKey: "paymentRequestId",
  targetKey: "id",
  uiSchema: { type: "object", title: "Payment request", "x-component": "AssociationField", "x-component-props": { multiple: false } },
}
```

Delivered as `JsField/RegisterInvoicePaymentRequestField.js`, registered on `"invoices"`. Idempotent (checks `fields:list` first, skips if already present) — same as its predecessor.

## 4. UI structure — one block, a Mode switch

Single new file, `All Module/Invoice/InvoiceCreateBlock.js`, following `PaymentCreateBlock.js`'s established shape (helpers, `useState`-based form, `buildPaymentPayload`-equivalent, `Section`/`FieldRow`/responsive patterns from the two saved memory entries: `js_block_responsive_layout.md`, `js_block_internal_admin_layout_pattern.md`).

A `Select` "Mode" with two values:

### Mode: "From Payment Request"
Reuses the exact `activePaymentRequest` mechanism built for `PaymentCreateBlock.js` (§6x/§6y): if opened with a seeded Payment Request context (deep link from a Payment Request's own detail page), auto-loads it directly; otherwise, picking a Contract shows the same real-`paymentRequests`-backed picker table (§6y) to choose one. Once a request is active:
- `contractId`, `customerId`, `internalCompanyId` auto-resolved from the contract/request (read-only display, matching Payment's own pattern).
- `totalAmount` defaults to the request's `requestedAmount`, editable.
- Submit creates one `invoices` row with `paymentRequestId` set to the active request's id.

### Mode: "From Payment(s)"
- Pick a Contract (reuses the same contract `Select` already built).
- Below it, a table of that contract's `payments` rows **where `invoiceId` is null** (not yet invoiced) — checkbox multi-select, genuinely multiple this time since the underlying relationship is a real one-to-many (§2), unlike the Payment Request case where multi-select was considered and declined for lack of schema support.
- `totalAmount` defaults to the sum of the selected payments' `amount`, editable.
- A small summary line lists the selected payments (code + amount) so the user can double check before submitting.
- Submit creates the `invoices` row first (no `paymentRequestId` in this mode), then issues one `payments:update` per selected payment, setting `invoiceId` to the new invoice's id. If any individual update fails, the invoice itself is not rolled back — the failure is surfaced per row (message + which payments still need manual linking), matching this codebase's existing tolerance for partial failure in multi-step submits (e.g. `ContractCreateForm.js`'s schedule-row loop already warns per-row rather than aborting the whole contract).

## 5. Field list

**Auto-resolved, not directly editable as raw ids** (same convention as `PaymentCreateBlock.js`): `contractId`, `customerId`, `internalCompanyId`, `paymentRequestId` (mode 1 only).

**User-entered:**
- `invoiceName` (text, required)
- `invoiceType` (`Select`: advance / milestone / final)
- `status` (`Select`: draft / pending / partial / paid / overdue / cancelled — default `draft`)
- `issuedDate` (datetime, defaults to now — same `nowDateTimeInput()` helper pattern as Payment's `paymentDate`)
- `deadline` (datetime, optional)
- `totalAmount` (money input, auto-filled per mode above, always editable — same "manual entry always wins" convention established for `ContractCreateForm.js`'s Total amount, §6t)
- `vat` (number, percentage entered as a plain number 0–100, e.g. `10` for 10% — matches how the sample row's `vat: 0` reads) and `vatAmount` (money, auto-computed as `totalAmount × vat / 100` whenever `vat` or `totalAmount` changes, but independently editable afterward — mirrors no existing pattern exactly, closest analogue is the retired Fee Model's derived-then-overridable fields)
- `description` (multi-line text; saved as-is, not wrapped in `<p>` tags — acceptable since Nocobase's richText interface renders plain text fine, and forcing HTML wrapping would be guessing at a rendering contract not verified)
- `assignees` (person responsible, optional single-select `Select` from lawyers — same field/target as `contracts.lawyerId`/`assignees`, `multiple: false`)

**Excluded (explicit scope cuts, not oversights):** `accounting`/`accountingId` (unknown purpose, confirmed with user), `amountPaid`/`outStandingAmount` (unmaintained columns, §2), `invoiceNumber` (sequence, auto).

## 6. Responsive / layout pattern

Follows both saved memory patterns exactly:
- Field-list rows (auto-resolved context, Mode + Contract selectors) use the flexbox `FieldRow`/`InfoLine`-with-`minWidth` pattern (content-sized, not equal CSS Grid columns) — `js_block_internal_admin_layout_pattern.md`.
- The Payment(s) picker table and any KPI-style summary reuse the same responsive column-width tightening + `scroll.x` approach already applied to `PaymentCreateBlock.js`'s and `PaymentContractDetailBlock.js`'s tables.
- Mode/Contract selectors, submit/cancel buttons: same `flexWrap: "wrap"` treatment as `PaymentCreateBlock.js` — `js_block_responsive_layout.md`.

## 7. Deployment order

1. Run `JsField/RegisterInvoicePaymentRequestField.js` (idempotent) — must happen before the new block is used, since it depends on `invoices.paymentRequestId` existing.
2. Add `All Module/Invoice/InvoiceCreateBlock.js` as a new JS Block in the Admin UI (new file, no migration of existing content).
3. No backfill needed — this is new functionality with no prior data to reconcile (unlike `payments.paymentRequestId`, which needed `pgsql/backfill_payment_request_id_from_source_key.sql` because code had already been writing — and failing to persist — that field for a while).

## 8. Out of scope for this pass

- Fixing `invoices.amountPaid`/`outStandingAmount` to actually stay in sync with linked payments (would need a SQL trigger analogous to `contract_recompute_outstanding()`) — flagged, not built.
- Any UI for the pre-existing, unused `invoices.paymentRequestItems` relation.
- Editing/voiding an already-created invoice, or un-linking a payment from one — this block only creates.
- Generating the actual `.docx` file — that remains `InvoiceGenerator.js`'s job, unchanged, reading whatever this new block creates.
