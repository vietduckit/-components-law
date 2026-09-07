# Retainer Billing Automation — Design Spec

Date: 2026-09-07
Status: Approved by user, ready for implementation planning

## 1. Overview

Today, a Retainer contract's periodic Payment Request is 100% manual — the lawyer has to remember to open the contract and click "Create payment request" every billing cycle. Every legal-billing platform researched (Clio, LawPay, PracticePanther — see Appendix) treats this as table-stakes automation ("evergreen retainer"): the system itself creates the next period's request when it comes due, and a human only has to review/approve, not remember to initiate.

This spec adds that automation on top of the trigger-based architecture already shipped for [2026-09-05-contract-payment-status-workflow-design.md](2026-09-05-contract-payment-status-workflow-design.md) — reusing its `paymentRequests` → `payments` → `contracts.paymentStatus` → `projects.paymentStatus` chain unchanged. It also fixes two real, previously-undiscovered bugs in the existing Retainer data path, found while researching this feature against `ContractCreateForm.js`'s actual field list (not just the files that *read* the data):

1. **`contracts.monthlyFee` is dead.** `ContractCreateForm.js` hardcodes `monthlyFee: null` on every submit (line 11463) — there is no "fee per period" input anywhere in the Retainer UI. The per-period amount was never actually stored; every downstream file that assumed `monthlyFee` was populated (including the `contract_resolved_total` fallback `monthlyFee × retainerDuration` from the prior spec) has been silently dead code for real Retainer contracts. The real per-period amount must be derived as `totalAmount ÷ retainerDuration`.
2. **`retainerRule.interval` is populated from the wrong field.** The "Retainer duration" form field is explicitly labeled *"Number of billing cycles"* with hint *"Leave blank for open-ended retainer"* — i.e. it is a **total cycle count**, confirmed by the user's own business-process description. But `buildPaymentSchedulePayload` (line 1884) does `const interval = parseNum(form.retainerDuration) || 1`, feeding that total-count value directly into `retainerRule.interval`, which every consumer (`calcRetainerNextPaymentDate` in this file and its near-duplicates in `ContractPaymentScheduleDetailBlock.js` / `PaymentRequestCreateBlock.js`) treats as "add this many units to get the next payment date." A 6-cycle monthly retainer computes its "next payment" as +6 months instead of +1, and its `displayText` reads "Every 6 months" instead of "Every month, 6 cycles total." This is not a hypothesis — it is confirmed by reading the field label/hint against the code that consumes the value.

## 2. Goals

- A fixed-term Retainer contract (has a set "Retainer duration") automatically gets a new `paymentRequests` row created for each billing cycle as it comes due — no one has to remember to click a button.
- The per-cycle amount (`totalAmount ÷ retainerDuration`) is derived, not hand-typed, so it can never drift from the contract's own total.
- Automation stops on its own once the contract's total cycle count is reached, or its `endDate` (if set) is passed — whichever comes first.
- The "next payment date" bug (§1.2) is fixed at its source and at both places it's redisplayed, so the number shown to a lawyer creating or viewing a Retainer contract is finally correct.
- Ships as an idempotent, re-runnable artifact matching this project's existing deployment convention (`pgsql/*.sql` + a small Nocobase field-registration step), the same shape as the prior payment-status-workflow spec.

## 3. Non-goals (explicitly out of scope for this iteration)

- **Open-ended Retainer contracts** (Retainer duration left blank). There is no per-period amount to derive without a duration to divide `totalAmount` by, and no other field in `ContractCreateForm.js` captures one. These contracts keep today's fully-manual flow, unchanged — not a regression, just not automated yet. If the business later wants open-ended retainers auto-billed, that needs a real "fee per period" input added to the create form first — a separate, larger change than this spec.
- **By-case (fixed-fee, milestone) contracts.** Already handled by the `contract_balance` fallback line shipped in `ContractPaymentScheduleDetailBlock.js` this session — untouched here.
- **pg_cron.** The user is unsure whether `CREATE EXTENSION pg_cron` is permitted on `db.dev.samset.net`, so the scheduled part of this feature is built as a Nocobase Workflow (Schedule trigger) instead of a pure-SQL scheduled job. §6.3 documents the pg_cron swap-in as a future option that needs *zero* schema changes if permission is ever granted — only the "who runs the check" mechanism changes.
- **Auto-approving the generated Payment Request.** It lands as `status: 'submitted'`, same as every other request — a human still reviews/approves before money or an invoice moves. Matches this project's existing "no NocoBase Workflow row is trusted to reload from an API-applied edit" caution (§6.3) but does *not* extend to skipping human review, which was never asked for.
- **Trust/escrow ledger accounting** (the US "IOLTA" pattern from the research — client funds legally segregated from firm operating funds). Not applicable: Vietnamese "tạm ứng" (advance) is a deferred-invoice concept, not a legally segregated trust account (see Appendix). No new ledger/account concept is introduced.
- **Catch-up backfill for contracts whose first `nextRetainerBillingDate` is already in the past** when this ships. Left as an explicit manual step in the implementation plan (run the init trigger's logic once by hand per existing Retainer contract, review each one before the Schedule Workflow's first real run) rather than an automatic "create N missed periods at once" — silently mass-creating potentially-months of backdated requests on first deploy is exactly the kind of surprise this system's existing conventions (e.g. `payment_request_assigned_lawyer_backfill.sql`'s explicit review-query) avoid.

## 4. Bug fix: `retainerRule.interval`

**Current (wrong) shape**, written by `ContractCreateForm.js` and re-derived identically by the two reader files:

```js
const unit = form.retainerRepeatUnit || "month";
const interval = parseNum(form.retainerDuration) || 1;      // WRONG — this is the total cycle count
...
displayText: `Every ${interval} ${retainerDurationSuffix(unit, interval)}`   // "Every 6 months"
nextPaymentDate: calcRetainerNextPaymentDate(firstPaymentDate, form.retainerDuration, unit)  // jumps 6 months, not 1
```

**Fixed shape** — `interval` is always `1` (this system never exposes a "bill every N units" concept beyond a single unit; the unit itself, via "Retainer repeat", already carries the cadence). `retainerDuration` keeps its one meaning: total cycle count, used only for the stop condition (§6.2), never for date math.

```js
const unit = form.retainerRepeatUnit || "month";
const interval = 1;
const totalCycles = nullableNum(form.retainerDuration); // null = open-ended, unchanged meaning
...
displayText: totalCycles
  ? `Every ${unit} · ${totalCycles} ${retainerDurationSuffix(unit, totalCycles)} total`
  : `Every ${unit} · open-ended`,
nextPaymentDate: calcRetainerNextPaymentDate(firstPaymentDate, interval, unit)  // always +1 unit
```

**Files touched (3, all reading/writing the same JSON shape independently per this repo's single-file JS Block convention):**
- `All Module/Contract/ContractCreateForm.js` — `buildPaymentSchedulePayload` (source of truth at contract creation/edit time).
- `All Module/Contract/ContractPaymentScheduleDetailBlock.js` — `normalizeSchedule`'s `retainerRule` construction and `resolveRetainerNextPaymentDate`/`calcRetainerNextPaymentDate`.
- `All Module/Payment/PaymentRequestCreateBlock.js` — its own `normalizeSchedule` equivalent.

No data migration needed: `nextPaymentDate` is computed fresh every render from `firstPaymentDate` + `interval` + `unit`, never stored — fixing the function fixes every existing contract's displayed value immediately, no backfill.

## 5. Schema changes

All additive, all guarded (`ADD COLUMN IF NOT EXISTS`), safe on a database with some or all of this already applied — same convention as the prior spec.

### `contracts` (2 new columns)

| Column | Type | Default | Notes |
|---|---|---|---|
| `nextRetainerBillingDate` | date | `NULL` | The next date a Retainer payment request should be auto-created. `NULL` means "not eligible for auto-billing" — covers non-Retainer contracts, open-ended Retainers (§3), and fixed-term Retainers whose cycles are exhausted. |
| `retainerPeriodsBilled` | integer | `0` | How many cycles the automation has created a request for so far. Compared against `retainerDuration` to know when to stop. |

No new column for "amount per period" — it's a pure function of two already-stored values (`totalAmount ÷ retainerDuration`), computed on demand wherever needed. Storing it would be a second source of truth that could drift from `totalAmount` if the contract is ever amended.

Both columns registered as plain Nocobase fields (`nextRetainerBillingDate` as a `date` field, `retainerPeriodsBilled` as a read-only `number`) via the same field-registration script pattern as the prior spec — otherwise invisible to the API/UI despite holding correct values in Postgres (the exact gap §8's testing plan in the prior spec exists to catch).

## 6. Mechanism

### 6.1 Trigger: `contracts` on INSERT or UPDATE OF `paymentSchedule` — initialize billing state

```sql
CREATE OR REPLACE FUNCTION public.contract_init_retainer_billing_state()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE
  v_retainer_rule jsonb;
  v_enabled boolean;
  v_duration numeric;
  v_first_payment date;
BEGIN
  v_retainer_rule := NEW."paymentSchedule" -> 'retainerRule';
  v_enabled := COALESCE((v_retainer_rule ->> 'enabled')::boolean, false);
  v_duration := NULLIF(NEW."retainerDuration", 0);

  -- Not a fixed-term retainer (not retainer at all, OR open-ended/no duration
  -- set — see §3): explicitly opt out of auto-billing.
  IF NOT v_enabled OR v_duration IS NULL THEN
    NEW."nextRetainerBillingDate" := NULL;
    RETURN NEW;
  END IF;

  -- Only (re)initialize a contract that hasn't started billing yet — an
  -- unrelated edit to an in-progress retainer must not reset its progress.
  IF COALESCE(NEW."retainerPeriodsBilled", 0) = 0 THEN
    v_first_payment := (NEW."paymentSchedule" ->> 'firstPaymentDate')::date;
    NEW."nextRetainerBillingDate" := v_first_payment;
    NEW."retainerPeriodsBilled" := 0;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contract_init_retainer_billing_state ON contracts;
CREATE TRIGGER trg_contract_init_retainer_billing_state
  BEFORE INSERT OR UPDATE OF "paymentSchedule", "retainerDuration" ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.contract_init_retainer_billing_state();
```

Fires on either column changing, not just `paymentSchedule` — `retainerDuration` is a separate top-level column, so a contract edited from open-ended to fixed-term (or vice versa) without the `paymentSchedule` JSON itself being touched in the same save must still re-evaluate eligibility. Caught in this spec's own self-review, not from a real bug report.

### 6.2 Nocobase Workflow (Schedule trigger, daily) — the automation engine

Built through the Admin UI (never scripted via raw API — see the prior spec's §6/§8 for why a Workflow row created outside the UI risks the server's in-memory cache never picking it up). Node graph:

1. **Trigger**: Schedule, daily (e.g. 01:00).
2. **Query record** (`contracts`): filter `nextRetainerBillingDate <= today`.
3. **Loop** over the query result, per contract:
   a. **Calculation**: `periodAmount = totalAmount / retainerDuration`.
   b. **Create record** (`paymentRequests`): `title` (human-readable, per this project's existing notification-content convention — never a bare id), `status: 'submitted'`, `contractId`, `customerId`, `internalCompanyId` (all copied from the queried contract row), `requestedAmount: periodAmount`.
   c. **Calculation**: `nextPeriodsBilled = retainerPeriodsBilled + 1`; `nextDate = nextRetainerBillingDate + 1 <unit>` (date-math branches on `paymentSchedule.retainerRule.unit` — day/week/month/quarter/year).
   d. **Condition**: `nextPeriodsBilled >= retainerDuration` OR (`endDate` is set AND `nextDate > endDate`) →
      - **true**: **Update record** (same contract) — `retainerPeriodsBilled: nextPeriodsBilled`, `nextRetainerBillingDate: NULL` (stop — cycles exhausted or term ended).
      - **false**: **Update record** (same contract) — `retainerPeriodsBilled: nextPeriodsBilled`, `nextRetainerBillingDate: nextDate` (continue to the next cycle).

Everything downstream of the Payment Request's creation (approval → `payments` row → `contracts.paymentStatus` recompute → `projects.paymentStatus` cascade) is the existing chain from the prior spec — no changes needed there.

### 6.3 Future option: swap in `pg_cron` (no schema change)

If `pg_cron` permission is ever granted, §6.2's Query/Loop/Create/Update node graph collapses into one `SECURITY DEFINER` PL/pgSQL function doing the same 4 steps in a single `FOR ... LOOP`, scheduled via `SELECT cron.schedule(...)`. Both `nextRetainerBillingDate` and `retainerPeriodsBilled` (§5) are read/written identically either way — this is purely a "who runs the check" swap, not a redesign.

## 7. Testing / verification plan

1. Create a fixed-term Retainer contract (`totalAmount` set, `retainerDuration = 3`, `retainerRepeatUnit = 'month'`) → confirm `nextRetainerBillingDate = firstPaymentDate`, `retainerPeriodsBilled = 0` immediately on save.
2. Create an open-ended Retainer (`retainerDuration` left blank) → confirm `nextRetainerBillingDate` stays `NULL` (never becomes auto-billing-eligible).
3. Confirm the "Next payment" preview shown in `ContractCreateForm.js` / `ContractPaymentScheduleDetailBlock.js` for a `retainerDuration > 1` contract now reads `firstPaymentDate + 1 unit`, not `+ N units` — this is the concrete, visible proof the §4 bug fix landed.
4. Manually set a test contract's `nextRetainerBillingDate` to today (or run the Schedule Workflow's node graph via its "Test run" against one contract) → confirm exactly one `paymentRequests` row is created, `requestedAmount = totalAmount ÷ retainerDuration`, and the contract's own `retainerPeriodsBilled`/`nextRetainerBillingDate` advance correctly.
5. Repeat step 4 until `retainerPeriodsBilled = retainerDuration` → confirm `nextRetainerBillingDate` becomes `NULL` and the next scheduled run creates nothing further for that contract.
6. Set a contract's `endDate` earlier than its natural `retainerDuration`-based end → confirm billing stops at `endDate`, not at the cycle count.
7. Re-run the SQL file (§5/§6.1) a second time → no errors, no duplicate triggers, no reset of an in-progress contract's `retainerPeriodsBilled`.

## 8. Rollback

Same posture as the prior spec: everything here is additive (2 new columns, 1 new trigger, 1 new Workflow) and nothing pre-existing reads the new columns. If needed: disable/delete the Nocobase Workflow via its own UI, `DROP TRIGGER trg_contract_init_retainer_billing_state ON contracts; DROP FUNCTION public.contract_init_retainer_billing_state();`, leave the 2 columns in place unused. The §4 bug fix is a separate, independently-valuable change (correct date math) — no reason to roll it back even if the automation itself is reverted.

## Appendix: research notes

- Clio / LawPay / PracticePanther all implement "evergreen retainer" as: track a running balance, auto-generate the next bill/reminder when a threshold or period is reached, human approves. This spec's period-based (not balance-threshold) trigger was chosen over a balance-threshold trigger specifically because this project's data model has no separately-tracked "trust balance" concept to threshold against — `totalAmount ÷ retainerDuration` per calendar period is the closest match achievable without inventing a new ledger concept, which §3 explicitly declines to add.
- Vietnamese tax regulation: an advance/deposit ("tạm ứng") collected to secure performance of a service contract (accounting/audit/financial-tax consulting — legal services fall in the same regulatory bucket) is explicitly **not** required to be invoiced (VAT invoice) at the time of receipt; the invoice issuance point is service completion, regardless of when payment was received. This validates the existing `paymentRequests.requestType` design (`create_payment` / `create_invoice` / `create_invoice_and_payment` / `check_payment` as independent options) — Payment and Invoice are already modeled as separable events, which is the correct shape for Retainer's "receive now, invoice per completed period" reality. No schema change needed for this — noted here so the *why* behind that existing 4-value enum is on record.

Sources checked (informs this appendix only, not §5/§6):
- [A Guide to Evergreen Retainers for Law Firms — Clio](https://www.clio.com/blog/evergreen-retainers-law-firms/)
- [Evergreen Retainers for Law Firms Explained — LawPay](https://www.lawpay.com/about/blog/evergreen-retainers-for-law-firms-explained/)
- [How to Implement Evergreen Retainers — PracticePanther](https://www.practicepanther.com/blog/evergreen-retainers-for-law-firms/)
- [Hóa đơn điện tử: 11 điều cần biết — LuatVietnam](https://luatvietnam.vn/thue-phi-le-phi/hoa-don-dien-tu-565-90782-article.html)
- [Tạm ứng có phải xuất hóa đơn không? — MeInvoice](https://www.meinvoice.vn/tin-tuc/44259/tam-ung-co-phai-xuat-hoa-don-khong/)
