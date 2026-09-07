# Retainer Billing Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-create a Payment Request for each billing cycle of a fixed-term Retainer contract as it comes due, and fix the pre-existing `retainerRule.interval` bug (total-cycle-count value wrongly used as the date-step size) at its source and both places that redisplay it.

**Architecture:** Same split as the prior payment-status-workflow feature — a pure-Postgres trigger (`BEFORE INSERT OR UPDATE`, touches only `NEW.*`, no self-select) handles the event-driven half (initializing a contract's billing state), and a Nocobase Workflow with a **Schedule** trigger (built through the Admin UI, never scripted via raw API — a workflow row created outside the UI has previously not been picked up by the running server's in-memory cache) handles the time-driven half (creating the next request when it's due). The 3 JS Block bug-fix tasks are independent of the schema/automation tasks and can be done in either order.

**Tech Stack:** Postgres 14+ PL/pgSQL (functions, triggers) applied via pgAdmin's Query Tool against `db.dev.samset.net` (this project's demonstrated DB-access path this session — no direct psql/terminal access to that database has been used or confirmed available); Nocobase field registration via `ctx.api.request()` pasted into a temporary Action block or the browser console (same pattern as `JsField/RegisterContractPaymentStatusFields.js`); Nocobase Workflow Admin UI (Schedule trigger, Query/Loop/Create/Update/Calculation/Condition nodes — all standard node types, no custom code node required).

**Spec:** [docs/superpowers/specs/2026-09-07-retainer-billing-automation-design.md](../specs/2026-09-07-retainer-billing-automation-design.md)

## Global Constraints

- Every DDL/DML statement in the migration file must be safe to run twice in a row: `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` immediately before every `CREATE TRIGGER`.
- `DROP TRIGGER IF EXISTS <name> ON <table>;` on its own line right before `CREATE TRIGGER <name> ...` — never rely on `CREATE OR REPLACE TRIGGER` (not reliably supported on the Postgres versions this project targets).
- The new Postgres trigger only reads `NEW.*` fields directly — no `SELECT ... FROM contracts WHERE id = NEW.id` inside it — so it is safe as `BEFORE INSERT`. (The prior payment-status feature hit exactly this bug — `contract_resolved_total(NEW.id)` returning `NULL` from a `BEFORE INSERT` trigger — because a self-select can't see a row that isn't committed yet. This plan's function never does that.)
- No NocoBase Workflow row is created via script/API in this plan — Task 6 is a manual, UI-only task for exactly the reason in Architecture above.
- Automation applies only to **fixed-term** Retainer contracts (`retainerDuration` is set, non-null, non-zero). Open-ended Retainers (`retainerDuration` left blank) are explicitly untouched — no per-period amount can be derived for them (`totalAmount ÷ retainerDuration` is undefined when `retainerDuration` is null).
- Money/date conventions match the rest of this codebase: dates as `YYYY-MM-DD`, no currency conversion logic added (a Retainer contract's `totalAmount` is already in its settled currency by the time this feature reads it — unchanged from today).

---

## Task 1: Bug fix — `retainerRule.interval` in `ContractCreateForm.js`

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js:1877-1928` (`buildPaymentSchedulePayload`)

**Interfaces:**
- Produces: `paymentSchedule.retainerRule.interval` is now always `1` for every contract saved from here on (both new contracts and re-saves of existing ones) — Task 4's trigger and Tasks 2-3's display fixes both assume this going forward, though neither actually reads `interval` (Task 4 reads only `enabled`/`firstPaymentDate`; Tasks 2-3 stop reading `interval` entirely, see their own Interfaces).

- [ ] **Step 1: Read the current function to confirm nothing has drifted**

Open `All Module/Contract/ContractCreateForm.js` and confirm lines 1877-1928 still read exactly:

```js
  const buildPaymentSchedulePayload = ({ form, isRetainer, currency = null }) => {
    const baseAmount = parseNum(form?.totalAmount);
    const cleanRows = cleanPaymentScheduleRows(form?.paymentSchedule, baseAmount);
    const totalAmount =
      baseAmount || cleanRows.reduce((sum, row) => sum + row.amount, 0);
    const enabledRetainerRule = !!isRetainer;
    const unit = form.retainerRepeatUnit || "month";
    const interval = parseNum(form.retainerDuration) || 1;
    const anchorType = unit;
    const anchorValue = 1;
    const firstPaymentDate = enabledRetainerRule
      ? form.paymentDate || null
      : cleanRows[0]?.paymentDate || null;
    const nextPaymentDate = enabledRetainerRule
      ? calcRetainerNextPaymentDate(firstPaymentDate, form.retainerDuration, unit)
      : null;
    const hasScheduleData =
      cleanRows.length ||
      enabledRetainerRule ||
      form.billingCycle === "multiple_payments" ||
      firstPaymentDate;

    if (!hasScheduleData) {
      return null;
    }

    return {
      version: 1,
      mode: enabledRetainerRule
        ? "recurring"
        : form.billingCycle === "multiple_payments"
          ? "multiple_payments"
          : form.billingCycle || "one_time",
      currencyId:
        getRecordCurrencyId(form) || extractCurrencyId(currency) || null,
      currency:
        getRecordCurrencyCode(form) ||
        getCurrencyCode(currency || defaultCurrencyObject()),
      baseAmount,
      firstPaymentDate,
      totalAmount: totalAmount || nullableNum(form.totalAmount),
      retainerRule: {
        enabled: enabledRetainerRule,
        anchorType,
        anchorValue,
        interval,
        unit,
        nextPaymentDate,
        displayText: enabledRetainerRule
          ? `Every ${interval} ${retainerDurationSuffix(unit, interval)}`
          : "",
      },
```

If it differs, stop and reconcile before continuing — the Step 2 replacement below assumes this exact text.

- [ ] **Step 2: Fix the interval/displayText computation**

Find:
```js
    const unit = form.retainerRepeatUnit || "month";
    const interval = parseNum(form.retainerDuration) || 1;
    const anchorType = unit;
    const anchorValue = 1;
    const firstPaymentDate = enabledRetainerRule
      ? form.paymentDate || null
      : cleanRows[0]?.paymentDate || null;
    const nextPaymentDate = enabledRetainerRule
      ? calcRetainerNextPaymentDate(firstPaymentDate, form.retainerDuration, unit)
      : null;
```

Replace with:
```js
    const unit = form.retainerRepeatUnit || "month";
    // Always exactly 1 — this system has no "bill every N units" concept
    // beyond a single unit. "Retainer duration" (form label; hint "Leave
    // blank for open-ended retainer"; placeholder "Number of billing
    // cycles") is a TOTAL CYCLE COUNT, never a step size. This used to feed
    // that count in here directly, so a 6-cycle monthly retainer's "next
    // payment" jumped +6 months instead of +1.
    const interval = 1;
    const totalCycles = nullableNum(form.retainerDuration);
    const anchorType = unit;
    const anchorValue = 1;
    const firstPaymentDate = enabledRetainerRule
      ? form.paymentDate || null
      : cleanRows[0]?.paymentDate || null;
    const nextPaymentDate = enabledRetainerRule
      ? calcRetainerNextPaymentDate(firstPaymentDate, interval, unit)
      : null;
```

- [ ] **Step 3: Fix the displayText string**

Find:
```js
        displayText: enabledRetainerRule
          ? `Every ${interval} ${retainerDurationSuffix(unit, interval)}`
          : "",
```

Replace with:
```js
        displayText: enabledRetainerRule
          ? totalCycles
            ? `Every ${unit} · ${totalCycles} ${retainerDurationSuffix(unit, totalCycles)} total`
            : `Every ${unit} · open-ended`
          : "",
```

- [ ] **Step 4: Verify syntax**

Run: `node --check "All Module/Contract/ContractCreateForm.js"`
Expected: no output, exit code 0.

- [ ] **Step 5: Manual verification in the app**

Open the Contract creation form, pick a customer/service so the total amount is non-zero, set Contract type to Retainer, set "Retainer duration" = `6`, "Retainer repeat" = `month`, set a "First payment" date. Confirm:
- The "Next payment" preview shows exactly **1 month** after "First payment" (not 6 months).
- No console errors.

- [ ] **Step 6: Commit**

```bash
git add "All Module/Contract/ContractCreateForm.js"
git commit -m "fix(ContractCreateForm): retainerRule.interval was sourced from the total-cycle-count field instead of always being 1"
```

---

## Task 2: Bug fix — `retainerRule` display in `ContractPaymentScheduleDetailBlock.js`

**Files:**
- Modify: `All Module/Contract/ContractPaymentScheduleDetailBlock.js:296-316`

**Interfaces:**
- Consumes: `calcRetainerNextPaymentDate(paymentDate, retainerDuration, repeatUnit)` (pre-existing, unchanged signature, this file's own copy at line 296).
- Produces: `resolveRetainerNextPaymentDate(record, schedule, rule)` now **always** recomputes live from `firstPaymentDate` + a fixed 1-unit step — it no longer trusts a stored `rule.nextPaymentDate` (which, for contracts saved before Task 1 shipped, holds an already-wrong value baked in at save time — trusting it would keep showing the bug for every pre-existing contract even after Task 1 fixes new saves). This is what makes the fix apply retroactively to already-saved contracts with no data migration, per the spec's §4 claim.

- [ ] **Step 1: Read the current function to confirm nothing has drifted**

Confirm `All Module/Contract/ContractPaymentScheduleDetailBlock.js:308-316` reads exactly:

```js
const resolveRetainerNextPaymentDate = (record, schedule, rule) => {
  const storedDate = normalizeDateInput(rule?.nextPaymentDate);
  if (storedDate) return storedDate;
  return calcRetainerNextPaymentDate(
    schedule?.firstPaymentDate || record?.paymentDate,
    rule?.interval || record?.retainerDuration,
    rule?.unit || record?.retainerRepeatUnit || record?.retainerPeriod,
  );
};
```

- [ ] **Step 2: Replace it with an always-live computation**

Find the block from Step 1. Replace with:

```js
const resolveRetainerNextPaymentDate = (record, schedule, rule) =>
  calcRetainerNextPaymentDate(
    schedule?.firstPaymentDate || record?.paymentDate,
    1,
    rule?.unit || record?.retainerRepeatUnit || record?.retainerPeriod,
  );
```

- [ ] **Step 3: Verify syntax**

Run: `node --check "All Module/Contract/ContractPaymentScheduleDetailBlock.js"`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification against a real pre-existing contract**

Open the "Create payment request" card (from Task 1's earlier work this session) on any Retainer contract that already existed before this fix, with `retainerDuration > 1`. Confirm the `RetainerRule` box's displayed next-payment date is now `firstPaymentDate + 1 <unit>`, not `+ N <unit>`. This is a contract whose stored `paymentSchedule.retainerRule.nextPaymentDate` is the OLD wrong value — confirming this now shows correctly proves the fix no longer trusts that stored value.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Contract/ContractPaymentScheduleDetailBlock.js"
git commit -m "fix(ContractPaymentScheduleDetailBlock): resolveRetainerNextPaymentDate now always recomputes from a fixed 1-unit step instead of trusting a possibly-stale stored interval"
```

---

## Task 3: Bug fix — `retainerRule` display in `PaymentRequestCreateBlock.js`

**Files:**
- Modify: `All Module/Payment/PaymentRequestCreateBlock.js:603-614`

**Interfaces:**
- Consumes: `calcRetainerNextPaymentDate` (this file's own copy, line 228, unchanged).
- Produces: same as Task 2 — this file's `normalizeSchedule` now builds `retainerRule.nextPaymentDate` by always recomputing live, matching Task 2's fix exactly (same bug, same fix, duplicated per this repo's single-file JS Block convention).

- [ ] **Step 1: Read the current block to confirm nothing has drifted**

Confirm `All Module/Payment/PaymentRequestCreateBlock.js:603-614` reads exactly:

```js
  const retainerRule = schedule?.retainerRule
    ? {
        ...schedule.retainerRule,
        nextPaymentDate:
          normalizeDateInput(schedule.retainerRule.nextPaymentDate) ||
          calcRetainerNextPaymentDate(
            schedule.firstPaymentDate || contract?.paymentDate,
            schedule.retainerRule.interval || contract?.retainerDuration,
            schedule.retainerRule.unit || contract?.retainerRepeatUnit || contract?.retainerPeriod,
          ),
      }
    : null;
```

- [ ] **Step 2: Replace it with an always-live computation**

Find the block from Step 1. Replace with:

```js
  const retainerRule = schedule?.retainerRule
    ? {
        ...schedule.retainerRule,
        nextPaymentDate: calcRetainerNextPaymentDate(
          schedule.firstPaymentDate || contract?.paymentDate,
          1,
          schedule.retainerRule.unit || contract?.retainerRepeatUnit || contract?.retainerPeriod,
        ),
      }
    : null;
```

- [ ] **Step 3: Verify syntax**

Run: `node --check "All Module/Payment/PaymentRequestCreateBlock.js"`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Open "My Request > Add new", select the same pre-existing Retainer contract used in Task 2 Step 4. Confirm any next-payment-date shown here matches Task 2's corrected value.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Payment/PaymentRequestCreateBlock.js"
git commit -m "fix(PaymentRequestCreateBlock): normalizeSchedule's retainerRule.nextPaymentDate now always recomputes from a fixed 1-unit step"
```

---

## Task 4: Schema + init trigger

**Files:**
- Create: `pgsql/retainer_billing_automation.sql`

**Interfaces:**
- Produces: `contracts."nextRetainerBillingDate"` (date, nullable), `contracts."retainerPeriodsBilled"` (integer, default 0), `public.contract_init_retainer_billing_state()` trigger function, `trg_contract_init_retainer_billing_state` trigger — Task 6's Workflow reads/writes both columns directly by name.

- [ ] **Step 1: Write the migration file**

Create `pgsql/retainer_billing_automation.sql`:

```sql
-- ============================================================
-- Retainer Billing Automation
-- See docs/superpowers/specs/2026-09-07-retainer-billing-automation-design.md
--
-- Idempotent: every statement in this file is safe to run again on a
-- database that already has some or all of it applied.
-- ============================================================

-- ---- Schema: additive columns -------------------------------------------
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "nextRetainerBillingDate" date;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "retainerPeriodsBilled" integer DEFAULT 0;

-- ---- Trigger: initialize/reset a contract's retainer billing state ------
-- Only reads NEW.* directly (no self-SELECT), so BEFORE INSERT is safe —
-- see this plan's Global Constraints for why that distinction matters.
CREATE OR REPLACE FUNCTION public.contract_init_retainer_billing_state()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_retainer_rule jsonb;
  v_enabled boolean;
  v_duration numeric;
  v_first_payment date;
BEGIN
  v_retainer_rule := NEW."paymentSchedule" -> 'retainerRule';
  v_enabled := COALESCE((v_retainer_rule ->> 'enabled')::boolean, false);
  v_duration := NULLIF(NEW."retainerDuration", 0);

  -- Not a fixed-term retainer (not retainer at all, OR open-ended/no
  -- duration set): explicitly opt out of auto-billing.
  IF NOT v_enabled OR v_duration IS NULL THEN
    NEW."nextRetainerBillingDate" := NULL;
    RETURN NEW;
  END IF;

  -- Only (re)initialize a contract that hasn't started billing yet — an
  -- unrelated edit to an in-progress retainer must not reset its progress.
  IF COALESCE(NEW."retainerPeriodsBilled", 0) = 0 THEN
    v_first_payment := NULLIF(NEW."paymentSchedule" ->> 'firstPaymentDate', '')::date;
    NEW."nextRetainerBillingDate" := v_first_payment;
    NEW."retainerPeriodsBilled" := 0;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fires on either column changing, not just paymentSchedule —
-- retainerDuration is a separate top-level column, so a contract edited
-- from open-ended to fixed-term (or vice versa) without paymentSchedule
-- itself being touched in the same save must still re-evaluate eligibility.
DROP TRIGGER IF EXISTS trg_contract_init_retainer_billing_state ON contracts;
CREATE TRIGGER trg_contract_init_retainer_billing_state
  BEFORE INSERT OR UPDATE OF "paymentSchedule", "retainerDuration" ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.contract_init_retainer_billing_state();
```

- [ ] **Step 2: Apply it in pgAdmin and verify the columns exist**

Paste the file's contents into pgAdmin's Query Tool (connected to `db.dev.samset.net`, database `law306` — same connection used throughout this session) and execute.

Then run:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'contracts'
  AND column_name IN ('nextRetainerBillingDate', 'retainerPeriodsBilled');
```
Expected: 2 rows — `nextRetainerBillingDate` (type `date`), `retainerPeriodsBilled` (type `integer`, default `0`).

- [ ] **Step 3: Verify the trigger against a fresh fixed-term retainer insert**

```sql
INSERT INTO contracts (
  "contractName", "contractType", "totalAmount", "retainerDuration",
  "paymentSchedule", "createdAt", "updatedAt"
) VALUES (
  'plan-verify-retainer-fixed',
  'retainer',
  18000000,
  6,
  '{"retainerRule": {"enabled": true}, "firstPaymentDate": "2026-10-01"}'::jsonb,
  now(), now()
)
RETURNING id, "nextRetainerBillingDate", "retainerPeriodsBilled";
```
Expected: `nextRetainerBillingDate = 2026-10-01`, `retainerPeriodsBilled = 0`. Note the returned `id` — reused in Step 5.

- [ ] **Step 4: Verify an open-ended retainer does NOT get auto-billing eligibility**

```sql
INSERT INTO contracts (
  "contractName", "contractType", "totalAmount", "retainerDuration",
  "paymentSchedule", "createdAt", "updatedAt"
) VALUES (
  'plan-verify-retainer-openended',
  'retainer',
  18000000,
  NULL,
  '{"retainerRule": {"enabled": true}, "firstPaymentDate": "2026-10-01"}'::jsonb,
  now(), now()
)
RETURNING id, "nextRetainerBillingDate", "retainerPeriodsBilled";
```
Expected: `nextRetainerBillingDate = NULL` (no `retainerDuration` means there's no way to derive a per-period amount, so this contract is correctly excluded — per this plan's Global Constraints).

- [ ] **Step 5: Verify editing `retainerDuration` alone re-triggers evaluation**

Using the Step 4 contract's id (`<open_ended_id>`):
```sql
UPDATE contracts SET "retainerDuration" = 4 WHERE id = <open_ended_id>;
SELECT "nextRetainerBillingDate", "retainerPeriodsBilled" FROM contracts WHERE id = <open_ended_id>;
```
Expected: `nextRetainerBillingDate = 2026-10-01` now (picked up the existing `firstPaymentDate` from `paymentSchedule` even though only `retainerDuration` changed, not `paymentSchedule` itself) — this is the exact gap this plan's Global Constraints called out fixing.

- [ ] **Step 6: Verify re-saving an in-progress contract does not reset its progress**

Using the Step 3 contract's id (`<fixed_term_id>`):
```sql
UPDATE contracts SET "retainerPeriodsBilled" = 2, "nextRetainerBillingDate" = '2026-12-01' WHERE id = <fixed_term_id>;
UPDATE contracts SET "paymentSchedule" = "paymentSchedule" || '{"scopeNote": "unrelated edit"}'::jsonb WHERE id = <fixed_term_id>;
SELECT "nextRetainerBillingDate", "retainerPeriodsBilled" FROM contracts WHERE id = <fixed_term_id>;
```
Expected: still `nextRetainerBillingDate = 2026-12-01`, `retainerPeriodsBilled = 2` — unchanged, because the trigger's `IF COALESCE(NEW."retainerPeriodsBilled", 0) = 0` guard only (re)initializes a contract that hasn't started billing.

- [ ] **Step 7: Run the file a second time to confirm idempotency**

Paste and run the full file again. Expected: no errors (`ADD COLUMN IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION` are no-ops the second time; `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` recreates the same trigger cleanly).

- [ ] **Step 8: Leave the 2 verification contracts in place**

Task 6's manual "Test run" verification reuses `plan-verify-retainer-fixed` — do not delete it yet. Task 7 (end-to-end) cleans up both `plan-verify-*` rows at the end.

- [ ] **Step 9: Commit**

```bash
git add pgsql/retainer_billing_automation.sql
git commit -m "feat(pgsql): retainer billing automation schema + init trigger"
```

---

## Task 5: Register the 2 new fields in Nocobase

**Files:**
- Create: `JsField/RegisterRetainerBillingFields.js`

**Interfaces:**
- Consumes: `ctx.api.request()` (same pattern as `JsField/RegisterContractPaymentStatusFields.js`).
- Produces: nothing consumed by later tasks — makes the 2 columns from Task 4 visible/usable as normal fields in the Nocobase admin UI and, critically, as filterable/settable fields inside the Task 6 Workflow's Query/Create/Update nodes (a Workflow node's field pickers only offer fields Nocobase knows about — a raw column invisible to the API is also invisible inside the Workflow editor).

- [ ] **Step 1: Write the idempotent registration script**

Create `JsField/RegisterRetainerBillingFields.js`:

```js
// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers contracts.nextRetainerBillingDate and
// contracts.retainerPeriodsBilled (columns created by
// pgsql/retainer_billing_automation.sql) as proper Nocobase fields, so
// they're visible to the API/UI AND selectable inside the Task 6
// Workflow's node field pickers — a raw column invisible to Nocobase's own
// field metadata is invisible inside the Workflow editor too, not just the
// admin UI (the same class of gap the prior payment-status feature's
// outStandingAmount field hit — see that plan's Execution notes).
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console while on any admin page (ctx is in scope there).
// Idempotent — checks for an existing field of the same name before
// creating, skips if already present.
// ============================================================
const nextRetainerBillingDateFieldPayload = () => ({
  name: "nextRetainerBillingDate",
  type: "date",
  interface: "date",
  uiSchema: {
    type: "string",
    "x-component": "DatePicker",
    title: "Next Retainer Billing Date",
  },
});

const retainerPeriodsBilledFieldPayload = () => ({
  name: "retainerPeriodsBilled",
  type: "integer",
  interface: "integer",
  uiSchema: {
    type: "number",
    "x-component": "InputNumber",
    title: "Retainer Periods Billed",
  },
  defaultValue: 0,
});

const registerField = async (collectionName, fieldPayload) => {
  const fieldName = fieldPayload.name;
  const existing = await ctx.api.request({
    url: `collections/${collectionName}/fields:list`,
    params: { paginate: false },
  });
  const already = (existing?.data?.data || []).some(
    (f) => f.name === fieldName,
  );
  if (already) {
    console.log(`[skip] ${collectionName}.${fieldName} already registered`);
    return;
  }
  await ctx.api.request({
    url: `collections/${collectionName}/fields:create`,
    method: "POST",
    data: fieldPayload,
  });
  console.log(`[created] ${collectionName}.${fieldName}`);
};

await registerField("contracts", nextRetainerBillingDateFieldPayload());
await registerField("contracts", retainerPeriodsBilledFieldPayload());
console.log("Done.");
```

- [ ] **Step 2: Verify syntax**

Run: `node --check "JsField/RegisterRetainerBillingFields.js"`
Expected: no output, exit code 0.

- [ ] **Step 3: Run it and verify field registration**

Paste the script's contents into a temporary Nocobase Action block's onClick handler (or the browser console on an admin page) and execute it once. Expected console output: two `[created] contracts.<name>` lines.

Then open Admin → Data sources → `contracts` collection → Fields list. Confirm `nextRetainerBillingDate` and `retainerPeriodsBilled` both appear.

**If `interface: "date"` does not render as a working date picker** (Nocobase's exact interface name for a plain date field was not independently confirmed against this project's live instance before writing this plan): open the field's edit dialog in the Admin UI, note what interface a manually-created "Date" field actually uses there, and adjust `nextRetainerBillingDateFieldPayload()`'s `interface`/`uiSchema` to match, then delete and re-run this script. This is the one genuinely unverified detail in this plan — flagged here rather than guessed silently.

- [ ] **Step 4: Run the script a second time to confirm idempotency**

Paste and run again. Expected console output: both lines read `[skip] ...already registered`.

- [ ] **Step 5: Commit**

```bash
git add "JsField/RegisterRetainerBillingFields.js"
git commit -m "feat(nocobase): register nextRetainerBillingDate/retainerPeriodsBilled fields on contracts"
```

---

## Task 6: Build the Nocobase Workflow (manual, no code)

**Files:** none — Nocobase Admin UI configuration only, for the reasons in this plan's Architecture/Global Constraints (a Workflow row created via script/API has previously not been picked up by the running server's in-memory cache; building it through the normal UI editor is the proven-safe path, verified working earlier this session for the "Payment Request created — notify assignee" workflow).

**Interfaces:**
- Consumes: `contracts.nextRetainerBillingDate`, `contracts.retainerPeriodsBilled`, `contracts.retainerDuration`, `contracts.totalAmount`, `contracts.customerId`, `contracts.internalCompanyId`, `contracts.contractCode`, `contracts.contractName`, `contracts.endDate`, `contracts.paymentSchedule` (for `retainerRule.unit`) — all from Task 4/5.
- Produces: new `paymentRequests` rows with `status: 'submitted'` — the existing `trg_payment_recompute_contract` → `trg_contract_cascade_case_status` chain (already shipped, prior spec) takes it from there with no further changes needed.

- [ ] **Step 1: Create the workflow and its Schedule trigger**

Admin → Workflow → Add new:
- Title: `Retainer billing — auto-create next payment request`
- Trigger type: **Schedule**
- Trigger mode: repeating, daily, time `01:00` (any off-peak time is fine — this only needs to run once per day, not at a specific business-sensitive moment)
- Save.

- [ ] **Step 2: Add the Query node**

Add a **Query record** node, collection `contracts`, filter:
- `nextRetainerBillingDate` is set (not empty)
- `nextRetainerBillingDate` ≤ today (use the "Date variable: Now" / current-date system variable Nocobase's filter UI offers for date fields — exact widget label may differ by version; the goal is "on or before today", not a hardcoded date)

- [ ] **Step 3: Add a Loop node over the Query result**

Add a **Loop** node, source: the Query node's result set from Step 2. Everything in Steps 4-7 goes **inside** this loop, executing once per matched contract.

- [ ] **Step 4: Compute the per-period amount**

Add a **Calculation** node (inside the loop): `periodAmount = {{loop item}}.totalAmount / {{loop item}}.retainerDuration`.

- [ ] **Step 5: Create the Payment Request**

Add a **Create record** node, collection `paymentRequests`:
- `title`: `Retainer: {{loop item.contractCode}} - {{loop item.contractName}} - Kỳ {{loop item.retainerPeriodsBilled + 1}}` (human-readable per this project's established notification-content convention — never a bare id; adjust the exact concatenation to whatever field-reference syntax this Nocobase version's Create-record title input actually accepts, following the same variable-picker pattern already used successfully this session for the payment-request notification workflow's content field).
- `status`: `submitted`
- `contractId`: `{{loop item.id}}`
- `customerId`: `{{loop item.customerId}}`
- `internalCompanyId`: `{{loop item.internalCompanyId}}`
- `requestedAmount`: `{{periodAmount}}` (Step 4's result)

- [ ] **Step 6: Compute the next cycle's state**

Add a **Calculation** node (inside the loop, after Step 5):
- `nextPeriodsBilled = {{loop item}}.retainerPeriodsBilled + 1`
- `nextDate`: `{{loop item}}.nextRetainerBillingDate` advanced by 1 unit, where the unit comes from `{{loop item}}.paymentSchedule.retainerRule.unit` (`day` / `week` / `month` / `quarter` / `year`). If this Nocobase version's Calculation node doesn't expose a date-add-by-unit function directly usable per-row, use a **Condition** node branching on the unit value first, each branch doing a fixed date-add (`+1 day`, `+7 days`, `+1 month`, `+3 months`, `+1 year`) via whatever date-math the Calculation node supports — the destination value is the same either way, just the node-graph shape differs slightly by version.

- [ ] **Step 7: Decide whether to continue or stop, then update the contract**

Add a **Condition** node (inside the loop, after Step 6): true when `nextPeriodsBilled >= {{loop item}}.retainerDuration` OR (`{{loop item}}.endDate` is set AND `nextDate > {{loop item}}.endDate`).
- **True branch** → **Update record** node, target `{{loop item.id}}` on `contracts`: `retainerPeriodsBilled: {{nextPeriodsBilled}}`, `nextRetainerBillingDate: null` (stop — cycles exhausted or term ended).
- **False branch** → **Update record** node, same target: `retainerPeriodsBilled: {{nextPeriodsBilled}}`, `nextRetainerBillingDate: {{nextDate}}` (continue to the next cycle).

- [ ] **Step 8: Test run against the Task 4 verification contract**

Use the Workflow editor's **Test run** feature (or temporarily set `plan-verify-retainer-fixed`'s `nextRetainerBillingDate` to today via pgAdmin if Test run doesn't support Schedule triggers in this Nocobase version) against the `plan-verify-retainer-fixed` contract from Task 4 Step 3 (`totalAmount = 18000000`, `retainerDuration = 6`).

In pgAdmin, confirm:
```sql
SELECT title, status, "requestedAmount" FROM "paymentRequests"
WHERE "contractId" = <fixed_term_id_from_task_4>;
```
Expected: exactly 1 row, `status = 'submitted'`, `requestedAmount = 3000000` (18,000,000 ÷ 6).

```sql
SELECT "nextRetainerBillingDate", "retainerPeriodsBilled" FROM contracts WHERE id = <fixed_term_id_from_task_4>;
```
Expected: `retainerPeriodsBilled = 1`, `nextRetainerBillingDate = 2026-11-01` (one month after the `2026-10-01` set in Task 4 Step 3).

- [ ] **Step 9: Run the test 5 more times to confirm the stop condition**

Repeat Step 8's test-run trigger 5 more times (6 total). Confirm:
- After the 6th run: `retainerPeriodsBilled = 6`, `nextRetainerBillingDate = NULL`.
- `paymentRequests` now has exactly 6 rows for this `contractId`.
- A 7th test run creates nothing further (the Query node in Step 2 no longer matches this contract, since `nextRetainerBillingDate` is `NULL`).

- [ ] **Step 10: Test the `endDate` stop condition independently of cycle count**

Create a second verification contract where `endDate` would be reached *before* `retainerDuration` cycles complete:

```sql
INSERT INTO contracts (
  "contractName", "contractType", "totalAmount", "retainerDuration", "endDate",
  "paymentSchedule", "createdAt", "updatedAt"
) VALUES (
  'plan-verify-retainer-enddate',
  'retainer',
  12000000,
  12,
  '2026-12-15',
  '{"retainerRule": {"enabled": true}, "firstPaymentDate": "2026-10-01"}'::jsonb,
  now(), now()
)
RETURNING id, "nextRetainerBillingDate", "retainerPeriodsBilled";
```
Expected: `nextRetainerBillingDate = 2026-10-01`, `retainerPeriodsBilled = 0` (Task 4's init trigger doesn't look at `endDate` at all — only Task 6's Condition node does, which is exactly what this step tests).

Run the Workflow (Test run, or set `nextRetainerBillingDate` to today) twice:
- After run 1: `nextRetainerBillingDate = 2026-11-01`, `retainerPeriodsBilled = 1` (11-01 is still before the 12-15 `endDate`, so the false branch fired — continue).
- After run 2: `nextRetainerBillingDate = NULL`, `retainerPeriodsBilled = 2` (the *next* candidate date would be `2026-12-01`, and Step 7's Calculation already computed `nextDate = 2026-12-01` for the comparison — but note the Condition in Task 6 Step 7 checks whether **`nextDate` itself** exceeds `endDate`, and `2026-12-01` is still before `2026-12-15`, so this should actually still continue to a 3rd cycle, not stop at run 2).

  Correct the expectation: run 2 should produce `nextRetainerBillingDate = 2026-12-01`, `retainerPeriodsBilled = 2` (still before `endDate`). Run a 3rd time: the next candidate date would be `2027-01-01`, which **is** past `2026-12-15` → this 3rd run's Condition node's true branch fires → `nextRetainerBillingDate = NULL`, `retainerPeriodsBilled = 3`, and `paymentRequests` still only has 3 rows total for this contract (the 3rd run does create a request for the `2026-12-01` cycle itself — Step 5 creates the request for the *current* due date before Step 6/7 compute and check the *next* one — only the request for the cycle *after* that gets skipped).

  Confirm via:
  ```sql
  SELECT COUNT(*) FROM "paymentRequests" WHERE "contractId" = <enddate_id>;
  SELECT "nextRetainerBillingDate", "retainerPeriodsBilled" FROM contracts WHERE id = <enddate_id>;
  ```
  Expected: `COUNT = 3`, `nextRetainerBillingDate = NULL`, `retainerPeriodsBilled = 3` — stopped because of `endDate`, not because `retainerDuration` (12) was reached.

- [ ] **Step 11: Enable the workflow**

Toggle the workflow to **Enabled** in the Admin UI (it must be explicitly saved/enabled through the same editor used to build it — this is the proven-safe path per this plan's Architecture note).

---

## Task 7: End-to-end verification and cleanup

**Files:** None — verification only.

**Interfaces:** None produced — acceptance test for the whole plan.

- [ ] **Step 1: Clean up plan-verification rows from Tasks 4 and 6**

```sql
DELETE FROM "paymentRequests" WHERE "contractId" IN (
  SELECT id FROM contracts WHERE "contractName" LIKE 'plan-verify-retainer-%'
);
DELETE FROM contracts WHERE "contractName" LIKE 'plan-verify-retainer-%';
```

- [ ] **Step 2: Run the full flow once, fresh, through the real app**

1. Create a new fixed-term Retainer contract through `ContractCreateForm.js` as a real user would (real customer, `totalAmount` from real services, `retainerDuration = 3`, `retainerRepeatUnit = month`, a real "First payment" date).
2. Confirm `nextRetainerBillingDate` and `retainerPeriodsBilled = 0` are set correctly immediately after creation (pgAdmin query, as in Task 4 Step 3's shape).
3. Set that contract's `nextRetainerBillingDate` to today (pgAdmin `UPDATE`) and either wait for the next scheduled Workflow run or use Test run.
4. Confirm exactly one new `paymentRequests` row appears in the app's "All Request" list, correct amount, `status = Submitted`.
5. Approve it and record the corresponding `Payment` through the existing UI flow.
6. Confirm the contract's `paymentStatus`/`outStandingAmount` update via the already-shipped prior-spec trigger chain — no new code involved in this step, just confirms the two features connect correctly end to end.

- [ ] **Step 3: Confirm the migration file re-applies cleanly on top of itself one more time**

Paste `pgsql/retainer_billing_automation.sql` into pgAdmin once more. Expected: no errors.

- [ ] **Step 4: Final commit (only if Step 2's walkthrough surfaced a fix)**

If everything matched expectations with no code changes needed, there is nothing to commit here. If the walkthrough surfaced a bug, fix it in the relevant file, re-run this task's Step 2, then:
```bash
git add <changed files>
git commit -m "fix: <describe what the end-to-end walkthrough caught>"
```
