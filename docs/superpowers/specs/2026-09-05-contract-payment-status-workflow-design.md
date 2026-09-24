# Contract & Case Payment Status Workflow — Design Spec

Date: 2026-09-05
Status: Approved by user, ready for implementation planning

## 1. Overview

Rebuild — from a clean dev database — the "case payment based on contract" business flow: track how much of a contract has actually been collected, surface that as a simple status on the Case so a lawyer can see at a glance whether a completed matter still has money outstanding, and automatically hand the follow-up to accounting instead of relying on someone remembering to check.

This is a rebuild, not a patch: the previous implementation of this exact feature (built as ad-hoc NocoBase Workflows directly in a now-restored-over database) had two problems discovered earlier this session:

1. Its "how much is this contract worth" calculation read only the raw `totalAmount` column with no fallback — correct for fixed-fee contracts, silently `NULL` forever for retainer contracts (`monthlyFee × retainerDuration`, no `totalAmount` set). This duplicated (a 4th time, with no fallback) logic that already exists correctly in `PaymentCreateBlock.js` / `PaymentContractDetailBlock.js` / `PaymentRequestCreateBlock.js`'s `contractTotalAmount()`.
2. It lived entirely as NocoBase Workflow rows in the database, edited live via UI/API. It was silently lost the moment the dev database was restored from an older backup — and separately, edits made to a workflow node via the API don't take effect until the workflow is toggled disabled→enabled, because the running server caches workflow definitions in memory. Neither of those failure modes is acceptable for something that needs to be deployed to other dev environments repeatably.

This rebuild fixes both: one single-source-of-truth SQL function for "contract total" (fallback-aware), and the whole feature implemented as plain Postgres functions/triggers, shipped as one idempotent `.sql` file that can be run against any environment's database and produces the same end state whether the feature was never installed, partially installed, or already installed.

## 2. Goals

- A contract always has a correct `paymentStatus` (`unpaid` / `partial` / `paid`), computed from real payments received, regardless of fee model (fixed / package / line-items / retainer).
- A Case (`projects`) mirrors its linked contract's `paymentStatus`, so "is this matter's money collected" is visible without opening the contract.
- When a Case is marked `done` and its contract is not yet `paid`, a Payment Request is created automatically and lands in accounting's queue — no one has to remember to chase it.
- The whole feature (schema + logic) is deployable via script to a fresh/different dev database with no manual UI steps and no conflict if re-run or partially applied.

## 3. Non-goals (explicitly out of scope for this iteration)

- Hourly-billing fee model — confirmed out of scope in an earlier session; the fallback chain still has an hourly branch in the JS side only, unchanged.
- Dunning cadence (recurring/escalating reminders if accounting doesn't act on the auto-created Payment Request). Standard practice in commercial AR tooling (Clio, MyCase, etc. — see research notes below) but not asked for here. The single auto-created Payment Request is the entire "nudge" — YAGNI beyond that.
- Case-level payment status aggregated across *multiple* contracts. Checked against real data: `projects.contractId` → `contracts.id` is 1-to-1 in practice (no contract is currently linked from more than one case), so "the case's payment status" is simply "its one linked contract's payment status" — no fan-out/aggregation logic needed. If a case is ever legitimately linked to more than one contract in the future, this needs revisiting.
- Any new `contracts.status` value (e.g. a `closed` lifecycle state). The field already defines a `closed` option in its `enum`, unused today — out of scope; "hợp đồng đã đóng" in this feature means `paymentStatus = 'paid'`, confirmed with the user, not a `status` transition.
- Editing the 3 existing JS Blocks. Their `contractTotalAmount()` / `contractMoneyInfo()` fallback chains keep working exactly as they do today for the UI. This spec adds a parallel, server-side, single-source-of-truth version of the same formula for the parts of the system (triggers) that need it — it does not ask the JS Blocks to start reading it. (Unifying those 4 implementations into 1 was "Approach B" from the earlier discussion; the user's ask this round is the payment-status workflow specifically, not that consolidation.)

## 4. Schema changes

All additive, all guarded (`ADD COLUMN IF NOT EXISTS`), safe to run on a database that already has some or all of these.

### `contracts` (2 new columns)

| Column | Type | Default | Notes |
|---|---|---|---|
| `outStandingAmount` | double precision | `0` | Same field name/shape as the (already-working, already-shipped) `invoices.outStandingAmount`, for consistency. Recomputed by trigger, never written by the app. |
| `paymentStatus` | varchar(255) | `'unpaid'` | `unpaid` \| `partial` \| `paid`. Recomputed by trigger, never written by the app. |

### `projects` (1 new column)

| Column | Type | Default | Notes |
|---|---|---|---|
| `paymentStatus` | varchar(255) | `'unpaid'` | Mirrors the linked contract's `paymentStatus` (via `projects.contractId`). `NULL`/no-contract cases stay at the default; there is nothing to collect yet. |

Both new `paymentStatus` columns are registered in NocoBase as a `select` field with the same 3-option enum, mirroring the existing `contracts.status` field's `uiSchema` shape (`{value, label, color}` options: `unpaid`→red, `partial`→gold, `paid`→green) so they render as a normal colored status pill in the UI. `contracts.outStandingAmount` is likewise registered as a plain `number` field, mirroring `invoices.outStandingAmount`'s existing shape — a column can hold correct values in Postgres while remaining completely invisible to the Nocobase API/UI until it's registered as a field on top of it; this was caught during end-to-end verification and is not optional.

## 5. Single source of truth: `contract_resolved_total(contract_id)`

Already built and verified this session (kept as-is): a `STABLE SQL` function encapsulating the exact fallback chain the JS side already uses, restricted to the fields that actually exist as columns on `contracts`:

```sql
COALESCE(
  NULLIF(totalAmount, 0),
  NULLIF(fixedAmount, 0),
  NULLIF(subTotal, 0) + COALESCE(vatAmount, 0),
  NULLIF(monthlyFee, 0) * NULLIF(retainerDuration, 0),
  0
)
```

This is the only place this formula is allowed to live server-side. Every trigger below calls it rather than re-deriving it.

## 6. Trigger design (pure Postgres — no NocoBase Workflow)

Four triggers, in the order money actually flows:

### 6.1 `contracts` — on INSERT: initialize
Sets the new row's `outStandingAmount = contract_resolved_total(NEW.id)` and `paymentStatus = 'unpaid'` (a brand-new contract has by definition collected nothing yet).

### 6.2 `payments` — on INSERT or UPDATE OF `paymentStatus`: recompute the contract
Mirrors the already-working `invoices` pattern (`Check Amount (Payment) -> Update Invoice`), same trigger condition (only fires when `paymentStatus` is the column that changed, so touching an unrelated field like `internalNote` doesn't cause pointless recomputation — this is also the exact gotcha hit this session repairing old test data).

For the affected `contractId`:
```
outStandingAmount = contract_resolved_total(contractId) - SUM(amount) WHERE paymentStatus = 'received'
paymentStatus =
  CASE
    WHEN outStandingAmount <= 0 THEN 'paid'
    WHEN SUM(received) > 0        THEN 'partial'
    ELSE                                'unpaid'
  END
```

### 6.3 `contracts` — on UPDATE OF `paymentStatus`: cascade to the linked Case
```sql
UPDATE projects SET "paymentStatus" = NEW."paymentStatus" WHERE "contractId" = NEW.id;
```
No-op (0 rows) if no case currently links this contract — that's fine, nothing to update.

### 6.4 `projects` — on UPDATE OF `status` (fires only when it becomes `'done'`): auto-create the Payment Request
```
IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' AND NEW."contractId" IS NOT NULL THEN
  look up the linked contract
  IF contract.paymentStatus <> 'paid' THEN
    INSERT INTO "paymentRequests" (
      title, status, "contractId", "customerId", "internalCompanyId",
      "requestedAmount", "createdAt", "updatedAt"
    ) VALUES (
      'Auto: Case hoàn thành - ' || contract.contractCode || ' - ' || contract.contractName,
      'submitted',
      contract.id, contract.customerId, contract.internalCompanyId,
      contract.outStandingAmount,
      now(), now()
    );
  END IF;
END IF;
```
- `assignedToId` deliberately left `NULL` — checked the 3 existing `paymentRequests` rows in the restored data: there is no default-assignment convention today, it's always hand-picked at creation time. Auto-created requests land unassigned in the shared accounting queue rather than guessing an owner.
- Guarded by `OLD.status IS DISTINCT FROM 'done'` so re-saving an already-`done` case doesn't create a duplicate request every time; still means a case that flips `done → in-progress → done` again would create a second request if the first is still unpaid. Acceptable — accounting sees two requests for the same outstanding balance rather than none.

## 7. Where "Case done but unpaid" surfaces to accounting/lawyers

No new field or trigger needed beyond §4/§6 — this is a view concern:

- The **"All Outstanding Cases"** menu (already exists in the UI today, currently an empty/unfiltered placeholder — confirmed while researching this) gets its filter set to `status = 'done' AND paymentStatus <> 'paid'`.
- Case Dashboard / Case Detail show `projects.paymentStatus` as a colored pill (same rendering NocoBase already gives `contracts.status` today) so a lawyer sees it without needing the accounting view.

## 8. Deployment: one idempotent SQL file + one small idempotent field-registration step

Two files, run in sequence, produce the same end state no matter how many times they're run or what subset of this feature already exists on the target database:

1. **`pgsql/contract_payment_status_workflow.sql`** — pure DDL/PLpgSQL:
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` for all 3 new columns.
   - `CREATE OR REPLACE FUNCTION` for `contract_resolved_total` and each trigger function.
   - `DROP TRIGGER IF EXISTS <name> ON <table>; CREATE TRIGGER <name> ...` for each of the 4 triggers (drop-then-create, not `CREATE OR REPLACE TRIGGER`, since Postgres versions before 14 don't support replacing triggers directly — dropping first is the portable idempotent form).
   - A one-time backfill statement so existing contracts/cases created before this migration get a correct initial value instead of sitting at the column default until their next payment: `UPDATE contracts SET "outStandingAmount" = contract_resolved_total(id), "paymentStatus" = ...` (same CASE as §6.2, computed from existing `payments` rows), followed by the same cascade to `projects`.
   - Running this file twice back-to-back is a no-op the second time (every statement is create-if-missing or an idempotent recompute).

2. **`scripts/register-payment-status-fields.js`** (or similar, run once per environment after the SQL) — talks to the NocoBase HTTP API only to register the 2 `paymentStatus` columns as proper NocoBase fields (`interface: select`, the 3-option enum) and set the "All Outstanding Cases" view's filter, because NocoBase's field/view metadata lives in its own tables, not something a raw `ALTER TABLE` makes the UI aware of. Checks whether each field/filter already exists before creating (skip, don't error, don't duplicate) — same "safe to re-run" guarantee as the SQL file, just necessarily over the API rather than in SQL since this is NocoBase-metadata, not app-data.

No NocoBase Workflow rows are created by this feature at all — sidesteps the cache-doesn't-reload-on-API-edit problem entirely, since a plain Postgres trigger takes effect the instant the `CREATE TRIGGER` statement commits.

## 9. Testing / verification plan

Repeat the same checks already proven this session on the (now-lost) first implementation, this time against the rebuilt trigger-based version:

1. Create a **retainer** contract (`monthlyFee` × `retainerDuration`, no `totalAmount`) → `outStandingAmount` initializes correctly (non-null, non-zero), `paymentStatus = 'unpaid'`.
2. Record a partial payment → `paymentStatus = 'partial'`, `outStandingAmount` decreases by the payment amount.
3. Record the remaining payment → `paymentStatus = 'paid'`, `outStandingAmount = 0`.
4. Confirm the linked case's `paymentStatus` mirrors each of the 3 transitions above with no manual step.
5. Mark a case `done` while its contract is still `unpaid`/`partial` → a `paymentRequests` row appears automatically, correct `contractId`/`requestedAmount`, `assignedToId` null, `status = 'submitted'`.
6. Mark a case `done` while its contract is already `paid` → no Payment Request is created.
7. Re-save an already-`done` case with no status change → no duplicate Payment Request.
8. Regression: run against the full existing `contracts` table (as done this session) comparing old raw `totalAmount` vs. `contract_resolved_total()` — expect differences only where `totalAmount` was genuinely unset (retainer contracts), not on any fixed-fee contract.
9. Run the deploy SQL file twice in a row on the same database → second run changes nothing (verify via row counts / trigger list, not just "it didn't error").

## 10. Rollback

Everything in §8's SQL file is additive (new columns, new functions, new triggers) — nothing it touches is read by existing app logic today (the JS Blocks compute their own totals independently; NocoBase doesn't know about a column until it's registered in step 2). If needed: `DROP TRIGGER` the 4 triggers, `DROP FUNCTION` the 5 functions, leave the added columns in place (unused, harmless) rather than risk a destructive `DROP COLUMN` on a shared dev database.

## Appendix: market research notes (informed §2/§7, not §6)

Checked how established legal practice management tools (Clio, MyCase, CARET Legal, PracticePanther) and general AR tooling handle this:

- Clio: closing a matter is a manual, unblocked action — bill reminders/payment plans keep running independently afterward if there's an outstanding balance. Matches this design's choice to not block `status = 'done'` on payment.
- MyCase: "Outstanding Balance Summary" is exactly a status-filtered view (`Sent` + has balance) — matches the "All Outstanding Cases" filtered-view approach in §7 rather than inventing a new UI surface.
- Standard AR invoice-status modeling: `unpaid` / `partially_paid` / `paid` (sometimes `+ overdue`) is the near-universal 3/4-state shape — matches `paymentStatus` here exactly.
- Dunning (repeated, escalating reminders) is the standard AR practice this design deliberately does *not* implement (§3) — noted as a clean future extension point (e.g. a scheduled job re-checking `paymentRequests.status = 'submitted'` past some age) if the business ever asks for it.

## 11. Revision (2026-09-22) — `contract_recompute_outstanding()` now counts "Partial" payments too

Found while walking a user through the full Payment Request → Payment → outstanding-balance flow again (this session's Finance work): `contract_recompute_outstanding()` (the trigger backing this whole design) summed `payments.amount` only where `paymentStatus = 'received'` exactly. But `All Module/Payment/PaymentCreateBlock.js` — the actual form that creates a `payments` row — treats `'partial'` as equally real, already-in-hand money via its own `ACTUAL_PAYMENT_STATUSES = ["received", "paid", "completed", "partial"]`, using `deriveActualPaymentStatus()` to assign `'Partial'` specifically when a customer pays *some* but not all of what's currently owed on a request.

Net effect before this fix: a genuine partial payment (real money, just short of settling that one request) never reduced `contracts.outStandingAmount` or moved `contracts.paymentStatus` off `'unpaid'` — the contract-level rollup silently disagreed with what `PaymentCreateBlock.js`'s own on-screen running balance already showed, until/unless that same payment row was later bumped to exactly `'received'`.

Fixed both places in `pgsql/contract_payment_status_workflow.sql` that filtered on payment status — the live trigger (`contract_recompute_outstanding()`) and its own one-time backfill query — to match `PaymentCreateBlock.js`'s `ACTUAL_PAYMENT_STATUSES` list exactly: `LOWER("paymentStatus") IN ('received', 'paid', 'completed', 'partial')`. Confirmed with the user before changing (2 options offered — count partial or leave as `'received'`-only) since this changes live financial-reporting numbers, not a visual-only fix.

**Also confirmed, not part of this fix**: `InvoiceGenerator.js` (repo root) is a pure document/PDF renderer — it reads an existing Payment/Payment Request to produce a printable invoice for the client and writes nothing back to `payments`/`contracts`/`projects`. It plays no role in the outstanding-balance calculation described in this spec.
