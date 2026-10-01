# Finance P4b — Receipts, Credit, Advances, Invoice Replace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cover money that does not arrive one-payment-per-invoice (spec §6) and invoices that must be cancelled or replaced (§7.2): one transfer paying several requests, overpayment kept as customer credit, refunds, advances received before a request exists (optionally with an advance invoice), and replacing an invoice without losing its payments.

**Architecture:** Payments stay immutable. Every row has a `paymentKind`: `normal` (default), `advance`, `credit` (money in, not yet tied to a request), `advance_apply` / `credit_apply` (use part of an advance / credit for a request — money already counted, so it only moves), `refund` (money back out of a credit / advance). A source's balance = its amount − its Received apply/refund rows. The paid-amount functions from P1 become kind-aware (read via `to_jsonb` so they work before the columns exist). BEFORE-INSERT triggers validate apply/refund rows (balance, same contract) and fill them in; an AFTER-INSERT trigger on requests applies waiting advances of that unit; an AFTER-INSERT trigger on advance payments issues the advance invoice when asked; invoices can be cancelled only when no money sits on them, and an invoice inserted with `replacesInvoiceId` takes over the old one's payments and cancels it — all in the database. The Finance tab gets "Record receipt", "Record advance", a credits panel (Apply / Refund), and invoice Cancel / Replace.

**Tech Stack:** PostgreSQL plpgsql (local harness), NocoBase JS Block, Node tests, scratch SSR smoke render.

**Spec:** `docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md` §6.1–§6.3, §7.2. Foreign-currency invoices (§9.1) are P4c.

## Global Constraints

- Contract received = Received `normal` + `advance` + `credit` − Received `refund` (VND). Apply rows never change it.
- Request paid = Received rows linked to the request of kind `normal` / `advance_apply` / `credit_apply`, plus `normal` rows linked only to one of its live invoices.
- Invoice paid = Received rows linked to the invoice of kind `normal` / `advance`, plus (when it is the request's single live invoice) rows linked only to its request of kind `normal` / `credit_apply`, and `advance_apply` whose advance had no advance invoice (an advance that was invoiced is already on its own invoice; the main invoice is issued for what is left).
- An apply row needs a request (`paymentRequestId`; an `invoiceId` is resolved to its request), the same contract as its source, and an amount ≤ the source balance; its kind must match the source (`advance` → `advance_apply`, `credit` → `credit_apply`). A refund row needs a source and an amount ≤ its balance.
- A source (advance / credit) with Received apply/refund rows cannot be cancelled.
- An advance may target a unit: `advanceScheduleId` (installment / combo item), `advanceProjectServiceId` (line service) or `advanceBillingPlanId` + `advanceCycleNo` (retainer period). When that unit's request is created, the advance is applied automatically (oldest first, up to the request amount); what is left stays as the advance's balance, usable anywhere (apply) or refundable.
- `issueAdvanceInvoice = true` on an advance → the database creates an invoice (`isAdvanceInvoice = true`, name `Tạm ứng - {contractCode}`, amount = the advance in VND, issued today, no request) and links the advance to it.
- Invoice cancel: refused while Received `normal` / `advance` rows are linked to it. Replace: insert an invoice with `replacesInvoiceId` → payments move to it, the old one is cancelled, the new one inherits the old request when none is given.
- Receipts across several requests are N `normal` rows sharing a `receiptGroupId`; overflow becomes one `credit` row in the same group (created by the tab, one call per row; a failed call is reported with what was saved).
- No git commits; manual checklist at the end.

## Review Focus

1. An apply larger than the balance, or from another contract's credit → refused with a sentence. Task 2.
2. An advance for a unit whose request is later cancelled and re-created → the advance is applied once, to the open request only. Task 3.
3. Cancelling a credit already partly used → refused; cancelling its apply row first then the credit → allowed. Task 2.
4. An invoice with payments cannot be cancelled; replacing it keeps request/invoice paid amounts unchanged. Task 4.
5. A refund lowers the contract received and the credit balance, never a request's paid amount. Task 2.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `pgsql/contract_payment_status_workflow.sql` | Modify | Contract received by kind (to_jsonb) |
| `pgsql/finance_foundation.sql` | Modify | `finance_payment_kind`, kind-aware `finance_pr_paid` / `finance_invoice_paid` |
| `pgsql/finance_payments_extra.sql` | Create | Columns; source balance; apply/refund fill; source cancel guard; advance auto-apply; advance invoice; invoice cancel guard; invoice replace |
| `pgsql/tests/finance_payments_extra_test.sql` | Create | Self-checking test |
| `scripts/tests/sql/run-local.sh` | Modify | Load `finance_payments_extra.sql` after `finance_billing_rules.sql` |
| `JsField/RegisterFinancePaymentsExtraFields.js` | Create | Registers the new columns |
| `All Module/Case/CaseFinanceBlock.js` | Modify | Helpers (`paymentKind`, `sourceBalances`, `allocateReceipt`), credit tile, credits panel, receipt / advance / apply / refund / invoice cancel / replace dialogs |
| `scripts/tests/case-finance-block.test.js` | Modify | Helper tests + static checks |

---

### Task 1: Kind-aware sums

- [ ] **Step 1: Failing test** — `pgsql/tests/finance_payments_extra_test.sql` first section:

```sql
-- ============================================================
-- Self-checking test for Finance P4b (pgsql/finance_payments_extra.sql and the
-- kind-aware sums in finance_foundation.sql / contract_payment_status_workflow.sql).
-- BEGIN ... ROLLBACK; prints "ALL FINANCE PAYMENTS EXTRA CHECKS PASSED". Ids 994000000000001+.
-- ============================================================
BEGIN;
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status)
VALUES (994000000000001, 'PX-1', 'Payments extra', 'byCase', 1000, 'execution');
INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount", "dueDate")
VALUES (994000000000011, 'Đợt 1 - PX-1', 'active', 994000000000001, 600, now() + interval '7 days');

-- ---- sums by kind ----
DO $$
DECLARE v double precision; r RECORD;
BEGIN
  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "paymentKind")
  VALUES (994000000000101, 300, 'Received', 994000000000001, 'credit');
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 994000000000001;
  IF v <> 700 THEN RAISE EXCEPTION 'FAIL: a credit is money in (want 700, got %)', v; END IF;

  INSERT INTO payments (id, amount, "paymentKind", "sourcePaymentId", "paymentRequestId")
  VALUES (994000000000102, 200, 'credit_apply', 994000000000101, 994000000000011);
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 994000000000001;
  IF v <> 700 THEN RAISE EXCEPTION 'FAIL: applying a credit does not change the contract received (got %)', v; END IF;
  SELECT * INTO r FROM "paymentRequests" WHERE id = 994000000000011;
  IF r."paidAmount" <> 200 THEN RAISE EXCEPTION 'FAIL: applied credit pays the request (got %)', r."paidAmount"; END IF;
  IF finance_source_balance(994000000000101) <> 100 THEN RAISE EXCEPTION 'FAIL: credit balance 300 - 200 = 100 (got %)', finance_source_balance(994000000000101); END IF;
END $$;

-- ---- (sections appended by later tasks go here) ----

DO $$ BEGIN RAISE NOTICE 'ALL FINANCE PAYMENTS EXTRA CHECKS PASSED'; END $$;
ROLLBACK;
```

- [ ] **Step 2: Run** `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_payments_extra_test.sql` → FAIL (`column "paymentKind" … does not exist`).

- [ ] **Step 3: Implement.**
  - `pgsql/contract_payment_status_workflow.sql`, `contract_recompute_outstanding_for`: received becomes
    ```sql
      SELECT COALESCE(SUM(
               CASE finance_payment_kind_of(to_jsonb(p))
                 WHEN 'refund' THEN -finance_payment_base_amount(p.amount, p."exchangeRateToBase")
                 WHEN 'normal' THEN finance_payment_base_amount(p.amount, p."exchangeRateToBase")
                 WHEN 'advance' THEN finance_payment_base_amount(p.amount, p."exchangeRateToBase")
                 WHEN 'credit' THEN finance_payment_base_amount(p.amount, p."exchangeRateToBase")
                 ELSE 0
               END), 0)
      INTO v_received
      FROM payments p
      WHERE p."contractId" = p_contract_id AND finance_is_received(p."paymentStatus");
    ```
    with, above it in the same file,
    ```sql
    -- 2026-09-28 (Finance P4b): a payment's kind — normal (default), advance,
    -- credit, advance_apply, credit_apply, refund. Read from jsonb so the money
    -- functions keep working before pgsql/finance_payments_extra.sql adds the column.
    CREATE OR REPLACE FUNCTION public.finance_payment_kind_of(p_row jsonb)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    AS $function$
      SELECT COALESCE(NULLIF(lower(btrim(p_row->>'paymentKind')), ''), 'normal');
    $function$;
    ```
    and the file's final backfill uses the same CASE.
  - `pgsql/finance_foundation.sql`: `finance_pr_paid` / `finance_invoice_paid` become kind-aware exactly as in Global Constraints (see the implementation for the SQL; `sourcePaymentId` is read via `(to_jsonb(p)->>'sourcePaymentId')::bigint`).
  - `pgsql/finance_payments_extra.sql` (new): header, columns (`payments."paymentKind"` varchar default 'normal', `"receiptGroupId"` varchar(64), `"sourcePaymentId"` bigint, `"advanceScheduleId"` bigint, `"advanceProjectServiceId"` bigint, `"advanceBillingPlanId"` bigint, `"advanceCycleNo"` integer, `"issueAdvanceInvoice"` boolean default false; `invoices."isAdvanceInvoice"` boolean default false, `"replacesInvoiceId"` bigint), `finance_source_balance(p_source_id bigint) → numeric`.

- [ ] **Step 4: Run** → PASSED (plus the P1/P2 tests still pass).

### Task 2: Apply / refund rows, source cancel guard

- [ ] **Step 1: Failing test** — append: apply above balance refused ("Only … is left"); apply from another contract's credit refused; refund lowers contract received and the balance, not the request's paid; cancelling a used credit refused, then allowed after cancelling its apply row.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `finance_payment_fill()` (BEFORE INSERT on payments) and `finance_payment_source_cancel_guard()` (BEFORE UPDATE OF "paymentStatus").
- [ ] **Step 4: Run** → PASSED.

### Task 3: Advances — auto-apply and advance invoice

- [ ] **Step 1: Failing test** — append: an advance targeting a schedule row, then the row's request created → an `advance_apply` of min(advance, request) exists and the request's paid equals it; a second request for the same unit after cancelling the first (with its apply rows cancelled) → applied once to the open request; `issueAdvanceInvoice` → an `isAdvanceInvoice` invoice exists, paid, and the advance is linked to it; the unit's main invoice created afterwards does not count the invoiced advance.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `finance_apply_advances_to_request()` (AFTER INSERT on paymentRequests) and `finance_issue_advance_invoice()` (AFTER INSERT on payments).
- [ ] **Step 4: Run** → PASSED.

### Task 4: Invoice cancel / replace

- [ ] **Step 1: Failing test** — append: cancelling an invoice with a Received payment refused; replacing it moves the payment, cancels the old one, the request's paid and the new invoice's paid equal the old values.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `finance_invoice_cancel_guard()` (BEFORE UPDATE OF status on invoices; named so it runs before `trg_finance_invoice_derive`), `finance_invoice_replace_fill()` (BEFORE INSERT: validate + inherit request/contract) and `finance_invoice_replaces()` (AFTER INSERT: move payments, cancel the old invoice).
- [ ] **Step 4: Run** all SQL tests → PASSED.

### Task 5: Finance tab — receipts, advances, credits, invoice cancel / replace

- [ ] **Step 1: Failing tests** — helper tests in `case-finance-block.test.js`: `paymentKind(p)`, `sourceBalances(payments)` (balance per advance/credit, total), `allocateReceipt(total, targets)` (oldest due first, overflow returned), `summarizeFinance` counts credit/advance as received and refunds as money out; static checks: `paymentKind: "credit_apply"`, `paymentKind: "advance"`, `issueAdvanceInvoice`, `replacesInvoiceId`, `receiptGroupId`, "Customer credit".
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** helpers + credit tile + `CreditsPanel` + `ReceiptDialog` / `AdvanceDialog` / `ApplyDialog` / `RefundDialog` / `CancelInvoiceDialog` / `ReplaceInvoiceDialog` + table actions (Payments: "Cancel payment"; Invoices: "Cancel", "Replace").
- [ ] **Step 4: Run** block tests, static checks, node suite, SSR smoke (views + every dialog) → all pass.
- [ ] **Step 5: Field registration** — `JsField/RegisterFinancePaymentsExtraFields.js`.

## Manual deployment checklist (dev) — after P4a

1. Back up; `psql -f pgsql/contract_payment_status_workflow.sql`, `pgsql/finance_foundation.sql`, `pgsql/finance_payments_extra.sql`; `psql -f pgsql/tests/finance_payments_extra_test.sql` (and the P1/P2 tests) → PASSED.
2. Browser console: `JsField/RegisterFinancePaymentsExtraFields.js`.
3. Re-paste `All Module/Case/CaseFinanceBlock.js`.
4. Record a receipt larger than two open requests → two payments + a credit in one group; apply part of the credit to a third request; refund the rest.
5. Record an advance for a combo item with "Issue an advance invoice" → advance invoice paid; finish the combo's trigger tasks → its request shows the advance applied; create its invoice → amount = what is left.
6. Try to cancel an invoice with a payment → refused; replace it → the new invoice carries the payment, the old one is cancelled.
