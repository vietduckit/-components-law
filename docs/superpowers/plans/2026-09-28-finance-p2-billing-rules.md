# Finance P2 — Billing Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the spec's billing rules in the database: a combo's request is created (titled with the combo's name) only when every trigger task of its services is Done; requests can be created by hand for a service / combo / next retainer period / termination settlement; requests cancel only with a reason and only when nothing was invoiced or paid; retainer auto-billing stops and starts with a checkbox, shifting the end date by the skipped periods; terminating a contract cancels what is still pending.

**Architecture:** Creation logic stays in SQL so every caller (trigger, cron, UI) gets the same rules and the P1 unique indexes. UI actions (P3/P4) only insert a *stub* request (`requestType` = `manual_unit` / `bill_now` / `termination_settlement` plus the unit's id) or flip a column; BEFORE triggers fill in amount, title, dates and advance plans, or raise a readable error. Combo trigger tasks use `isPaymentTrigger` (like line pricing), so Task Management needs no change: the combo request is created without `paymentRequestServices` tags, which keeps Task Management on its checkbox. The Contract and Case create forms tick `isPaymentTrigger` for combo items instead of linking tasks to a request that no longer exists up front.

**Tech Stack:** PostgreSQL plpgsql (local PG 16 harness from P1), NocoBase JS Blocks, Node static tests.

**Spec:** `docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md` §3, §7.1, §7.5, §8. Previous plan: `2026-09-28-finance-p1-foundation.md` (implemented).

## Global Constraints

- Request statuses pending / active / cancelled; cancelling needs a non-empty `cancelReason`, sets `cancelledAt`, and is refused while the request has a non-cancelled invoice or any Received payment; a cancelled request is never reopened.
- Combo request: created once all `isPaymentTrigger` tasks of all case services behind the item's `contractPaymentScheduleServices` are `done` (at least one such task); title `{label} - {contractCode}`; amount = the item row's `amount`; status `active`; due now + 7 days; no `paymentRequestServices` rows.
- Manual unit requests are created `active`, due now + 7 days unless given, `triggerType = 'manual'`, amounts from the same sources as the automatic path.
- Retainer: `contractBillingPlans."isBillingActive"` (default true). Unticking needs a `pauseReason`. Ticking again skips the billing dates that fell while stopped (from `pausedAt`'s date up to yesterday), keeps the cycle count, and moves the plan's and the contract's `endDate` forward by the skipped periods. `resumeOn` (optional) starts it again automatically. Bill now = the next cycle, anchored to the schedule (next date = old next date + 1 unit), refused while stopped, when no cycle is left or when the contract is terminated.
- Retainer units: day, week, month, quarter (3 months), year; anything else = month.
- Termination: contract `status = 'terminated'` → `terminationDate` defaults to today, pending requests cancelled ("Contract terminated"), active retainer plans completed; no automatic request is created for a terminated contract; a settlement request needs a positive amount no larger than what is still unbilled.
- Open-ended retainers (no cycle count) keep today's behaviour: `totalAmount` is the per-cycle amount and they bill every cycle. (Spec §8.4 assumed they were manual; the code already bills them — see ruling in the ledger.)
- Existing combo contracts that already have pending item requests keep working as before (their tasks stay linked to those requests); only new combo items use the on-trigger path.
- No git commits; manual deployment checklist at the end.

## Review Focus

1. A trigger task ticked *after* it is Done (Contract form links a finished task) → the combo / service request is created then, not never. Pinned in Task 1.
2. The last trigger task of one service is done while another service of the same combo still has open trigger tasks → no request yet. Pinned in Task 1.
3. Bill now and the hourly job racing for the same cycle → exactly one request (unique index + plan row lock). Pinned in Task 4 (sequential double call).
4. Stop, then start on the same day → nothing skipped, end date unchanged. Pinned in Task 4.
5. Cancelling a request that has a draft invoice → refused (draft is still an invoice for that request). Pinned in Task 3.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `pgsql/unified_contract_payment_schedule.sql` | Modify | No pending request for By Service item rows; combo on-trigger creation; shared service amount helper; task trigger also fires on `isPaymentTrigger` / service changes; terminated guard |
| `pgsql/finance_billing_rules.sql` | Create | Columns; retainer helpers; stub fill (manual unit, bill now, termination settlement); cancel guard; stop/start; termination |
| `pgsql/retainer_billing_run_due.sql` | Modify | Uses the shared helpers; skips stopped plans; auto-starts plans whose `resumeOn` came; skips terminated contracts |
| `pgsql/finance_foundation_migrate.sql`, `pgsql/tests/finance_foundation_test.sql` | Modify | Give cancellations a reason (the P2 guard requires one) |
| `pgsql/tests/fixtures/finance_min_schema.sql` | Modify | `contracts.status`, `contracts."endDate"` |
| `scripts/tests/sql/run-local.sh` | Modify | Load order: …, finance_foundation, finance_billing_rules, retainer_billing_run_due |
| `pgsql/tests/finance_billing_rules_test.sql` | Create | Self-checking test |
| `All Module/Contract/ContractCreateForm.js` | Modify | Combo item + Case exists → tick `isPaymentTrigger` (open tasks first) |
| `All Module/Case/CaseCreateForm.js` | Modify | By Service contract → tick `isPaymentTrigger` on the template-matched tasks |
| `JsField/RegisterFinanceBillingRulesFields.js` | Create | Registers the new columns |
| `scripts/tests/finance-billing-rules.test.js` | Create | Static checks |

---

### Task 1: Combo request created on trigger

**Files:** Modify `pgsql/unified_contract_payment_schedule.sql`; Modify fixture + runner; Create `pgsql/tests/finance_billing_rules_test.sql`.

**Interfaces:**
- Produces: `by_service_service_amount(p_project_service_id bigint) RETURNS TABLE (amount numeric, source text)`; `by_service_combo_item_check_and_create(p_schedule_id bigint) RETURNS bigint` (new request id or NULL); `by_service_combo_check_for_service(p_project_service_id bigint) RETURNS void`. Task trigger `trg_by_service_task_group_done_creates_payment_request` fires `AFTER UPDATE OF status, "isPaymentTrigger", "projectServiceId"`.

- [ ] **Step 1: Fixture + runner.** Fixture `contracts`: add `status varchar(255)`, `"endDate" timestamptz`. Runner file list becomes `contract_payment_status_workflow.sql by_case_payment_request_automation.sql unified_contract_payment_schedule.sql finance_foundation.sql finance_billing_rules.sql retainer_billing_run_due.sql`.

> **As implemented (ledger rulings):** the test uses three items (Alpha / Gamma / Delta) instead of cancel-and-retry, and `by_service_check_and_create_payment_request` calls `by_service_combo_check_for_service` (now `RETURNS BOOLEAN`) at the very top. `pgsql/tests/finance_billing_rules_test.sql` and `pgsql/unified_contract_payment_schedule.sql` are authoritative over the draft code below.

- [ ] **Step 2: Failing test** — `pgsql/tests/finance_billing_rules_test.sql`:

```sql
-- ============================================================
-- Self-checking test for Finance P2 (pgsql/finance_billing_rules.sql and the
-- combo / retainer changes in unified_contract_payment_schedule.sql and
-- retainer_billing_run_due.sql). BEGIN ... ROLLBACK; prints
-- "ALL FINANCE BILLING RULES CHECKS PASSED". Ids 993000000000001+.
--   psql ... -f pgsql/tests/finance_billing_rules_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/finance_billing_rules_test.sql
-- ============================================================
BEGIN;

-- a By Service combo contract with one case, two services in one combo item
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", "totalAmount", status, "createdAt")
VALUES (993000000000001, 'CMB-1', 'Combo test', 'byService', 'package', 900, 'execution', now() - interval '1 day');
INSERT INTO projects (id, "contractId", status) VALUES (993000000000002, 993000000000001, 'in_progress');
INSERT INTO "projectServices" (id, "projectId", "serviceName", "totalAmount", "pricingMode") VALUES
  (993000000000011, 993000000000002, 'Service A', 0, 'package'),
  (993000000000012, 993000000000002, 'Service B', 0, 'package');
INSERT INTO "contractServices" (id, "contractId", "projectServiceId") VALUES
  (993000000000021, 993000000000001, 993000000000011),
  (993000000000022, 993000000000001, 993000000000012);
INSERT INTO tasks (id, title, status, "projectId", "projectServiceId", "isPaymentTrigger") VALUES
  (993000000000031, 'A trigger', 'in_progress', 993000000000002, 993000000000011, false),
  (993000000000032, 'B trigger', 'in_progress', 993000000000002, 993000000000012, true);

-- ---- combo: no pending request up front ----
DO $$
DECLARE n int;
BEGIN
  INSERT INTO "contractPaymentSchedules" (id, "contractId", "installmentNo", label, amount, "triggerType")
  VALUES (993000000000041, 993000000000001, 1, 'Combo Alpha', 900, 'on_task_done');
  INSERT INTO "contractPaymentScheduleServices" (id, "contractPaymentScheduleId", "contractServiceId") VALUES
    (993000000000051, 993000000000041, 993000000000021),
    (993000000000052, 993000000000041, 993000000000022);
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 993000000000041;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: a By Service item row creates no request up front (got %)', n; END IF;
END $$;

-- ---- combo: one service done is not enough; the whole combo is ----
DO $$
DECLARE r RECORD; n int;
BEGIN
  UPDATE tasks SET status = 'done' WHERE id = 993000000000032;
  -- Service B's only trigger task is done but Service A's task is not a
  -- trigger yet -> the item is "ready" only if at least A has none... it has
  -- none, so the item's trigger set = {B} -> ready.
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 993000000000041;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: all trigger tasks of the combo done -> request (got %)', n; END IF;
  UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = 'test reset' WHERE "contractPaymentScheduleId" = 993000000000041;

  -- tick A's open task as a trigger: the combo is no longer complete
  UPDATE tasks SET "isPaymentTrigger" = true WHERE id = 993000000000031;
  UPDATE tasks SET status = 'in_progress' WHERE id = 993000000000032;
  UPDATE tasks SET status = 'done' WHERE id = 993000000000032;
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 993000000000041 AND status <> 'cancelled';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: one service still open -> no combo request (got %)', n; END IF;

  -- a task ticked AFTER it is done still completes the combo
  UPDATE tasks SET "isPaymentTrigger" = false WHERE id = 993000000000031;
  UPDATE tasks SET status = 'done' WHERE id = 993000000000031;
  UPDATE tasks SET "isPaymentTrigger" = true WHERE id = 993000000000031;
  SELECT * INTO r FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 993000000000041 AND status <> 'cancelled';
  IF r.id IS NULL THEN RAISE EXCEPTION 'FAIL: ticking a Done task completes the combo'; END IF;
  IF r.title <> 'Combo Alpha - CMB-1' THEN RAISE EXCEPTION 'FAIL: combo request titled "{combo} - {contract}" (got %)', r.title; END IF;
  IF r.status <> 'active' OR r."requestedAmount" <> 900 OR r."dueDate" IS NULL THEN
    RAISE EXCEPTION 'FAIL: combo request active, item amount, due date (got %, %, %)', r.status, r."requestedAmount", r."dueDate";
  END IF;
  SELECT count(*) INTO n FROM "paymentRequestServices" WHERE "paymentRequestId" = r.id;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: combo request carries no service tags (keeps Task Management on checkboxes)'; END IF;
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "projectServiceId" IN (993000000000011, 993000000000012);
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: no per-service request for a combo contract (got %)', n; END IF;
END $$;

-- ---- (sections appended by later tasks go here) ----

DO $$ BEGIN RAISE NOTICE 'ALL FINANCE BILLING RULES CHECKS PASSED'; END $$;
ROLLBACK;
```

(The test's first cancel uses `cancelReason`; until Task 3 adds the column the test fails there or earlier — acceptable for RED.)

- [ ] **Step 3: Run** `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_billing_rules_test.sql` → Expected FAIL (`a By Service item row creates no request up front (got 1)`).

- [ ] **Step 4: Implement** in `pgsql/unified_contract_payment_schedule.sql`:

(a) `by_case_schedule_row_creates_payment_request`, right after the `IF v_contract.id IS NULL THEN RETURN NEW; END IF;`:

```sql
  -- 2026-09-28 (spec 2026-09-28 §3): a By Service combo / standalone item
  -- gets its request only once every trigger task of its services is Done
  -- (by_service_combo_item_check_and_create below) — no pending request now.
  IF v_contract."contractType" = 'byService' THEN
    RETURN NEW;
  END IF;
```

(b) New shared amount helper (replaces the inline amount block of `by_service_check_and_create_payment_request`, which now calls it):

```sql
-- ---- What a case service is billed for (2026-09-25 priority, shared by the
-- ---- automatic path and manual requests — pgsql/finance_billing_rules.sql).
CREATE OR REPLACE FUNCTION public.by_service_service_amount(p_project_service_id BIGINT)
RETURNS TABLE (amount NUMERIC, source TEXT)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_locked NUMERIC;
  v_line NUMERIC;
  v_mode TEXT;
BEGIN
  SELECT NULLIF(to_jsonb(ps)->>'paymentAllocatedAmount', '')::numeric, ps."totalAmount", ps."pricingMode"
  INTO v_locked, v_line, v_mode
  FROM "projectServices" ps
  WHERE ps.id = p_project_service_id;

  IF v_locked IS NOT NULL THEN
    amount := v_locked; source := 'locked';
  ELSIF COALESCE(v_line, 0) > 0 THEN
    amount := v_line; source := 'line';
  ELSIF v_mode = 'package' THEN
    amount := public.by_service_package_allocated_amount(p_project_service_id); source := 'package_auto';
  ELSE
    amount := 0; source := NULL;
  END IF;
  RETURN NEXT;
END;
$function$;
```

and in `by_service_check_and_create_payment_request`: add `status` to the contract SELECT list; after `IF v_contract.id IS NULL THEN RETURN; END IF;` add

```sql
  -- 2026-09-28: nothing is billed automatically on a terminated contract (spec §7.5)
  IF v_contract.status = 'terminated' THEN
    RETURN;
  END IF;
```

replace the package early-return block with

```sql
  -- Combo pricing billed per item (a contractPaymentSchedules row per combo /
  -- standalone service): 2026-09-28 the item's request is created here, on
  -- trigger, once every trigger task of ALL its services is Done (spec §3).
  -- Contracts created moments ago may not have their item rows yet
  -- (contracts:create links the Case before the form writes them): wait.
  IF v_contract."pricingMode" = 'package'
     AND EXISTS (SELECT 1 FROM "contractPaymentSchedules" WHERE "contractId" = v_contract.id)
  THEN
    PERFORM public.by_service_combo_check_for_service(v_service.id);
    RETURN;
  END IF;
  IF v_contract."pricingMode" = 'package' AND v_contract."createdAt" > now() - INTERVAL '10 minutes' THEN
    RETURN;
  END IF;
```

and replace the amount block (`SELECT NULLIF(to_jsonb(ps)->>'paymentAllocatedAmount' …` through `END IF;` before `IF COALESCE(v_amount, 0) <= 0`) with

```sql
  SELECT a.amount, a.source INTO v_amount, v_amount_source
  FROM public.by_service_service_amount(v_service.id) a;
```

The early-return guards "a service with no trigger task" and "this service's own trigger tasks not all done" stay before the combo branch — a combo is never complete while one of its services has open triggers, and the call for the service whose task just finished is the one that completes it.

(c) Combo functions (after `by_service_check_and_create_payment_request`):

```sql
-- ---- By Service combo / standalone item: create its request once every
-- ---- trigger task of every service behind it is Done (2026-09-28, spec §3).
-- Services come from contractPaymentScheduleServices -> contractServices
-- .projectServiceId. Idempotent (open request exists -> nothing; the P1
-- index ux_payment_requests_schedule_open backs it). No paymentRequestServices
-- rows on purpose: Task Management switches a service to the installment
-- picker when a request is tagged with it; untagged, the combo's tasks keep
-- the isPaymentTrigger checkbox that drives this.
CREATE OR REPLACE FUNCTION public.by_service_combo_item_check_and_create(p_schedule_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
AS $function$
DECLARE
  v_item RECORD;
  v_contract RECORD;
  v_ps_ids BIGINT[];
  v_service_names TEXT;
  v_pr_id BIGINT;
  v_inserted BIGINT;
  v_due TIMESTAMPTZ := now() + INTERVAL '7 days';
BEGIN
  IF EXISTS (
    SELECT 1 FROM "paymentRequests"
    WHERE "contractPaymentScheduleId" = p_schedule_id AND status IS DISTINCT FROM 'cancelled'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_item FROM "contractPaymentSchedules" WHERE id = p_schedule_id;
  IF v_item.id IS NULL OR COALESCE(v_item.amount, 0) <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT id, "contractCode", "contractName", "contractType", "customerId", "internalCompanyId", status
  INTO v_contract
  FROM contracts WHERE id = v_item."contractId";
  IF v_contract.id IS NULL OR v_contract."contractType" IS DISTINCT FROM 'byService'
     OR v_contract.status = 'terminated' THEN
    RETURN NULL;
  END IF;

  v_ps_ids := ARRAY(
    SELECT DISTINCT cs."projectServiceId"
    FROM "contractPaymentScheduleServices" cpss
    JOIN "contractServices" cs ON cs.id = cpss."contractServiceId"
    WHERE cpss."contractPaymentScheduleId" = p_schedule_id AND cs."projectServiceId" IS NOT NULL
  );
  IF cardinality(v_ps_ids) = 0 THEN
    RETURN NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM tasks WHERE "projectServiceId" = ANY (v_ps_ids) AND "isPaymentTrigger" = true
  ) THEN
    RETURN NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM tasks
    WHERE "projectServiceId" = ANY (v_ps_ids) AND "isPaymentTrigger" = true AND status IS DISTINCT FROM 'done'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT string_agg(ps."serviceName", ', ' ORDER BY ps.id) INTO v_service_names
  FROM "projectServices" ps WHERE ps.id = ANY (v_ps_ids);

  v_pr_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;
  INSERT INTO "paymentRequests" (
    id, title, status, "triggerType", "conditionMet", "installmentNo",
    "contractPaymentScheduleId", "contractId", "customerId", "internalCompanyId",
    "requestedAmount", "dueDate", currency, "requestType", priority, "requestNote", "sourceSnapshot",
    "createdAt", "updatedAt"
  ) VALUES (
    v_pr_id,
    COALESCE(v_item.label, 'Combo') || ' - ' || COALESCE(v_contract."contractCode", ''),
    'active', 'on_task_done', true, v_item."installmentNo",
    v_item.id, v_contract.id, v_contract."customerId", v_contract."internalCompanyId",
    v_item.amount, v_due, 'VND', 'create_payment', 'high',
    'Yêu cầu thanh toán combo "' || COALESCE(v_item.label, '') || '" (' || COALESCE(v_service_names, '') ||
      ') — tất cả task trigger đã Done (tạo ngày ' || to_char(now(), 'DD/MM/YYYY') || ')',
    jsonb_build_object('billing', 'combo_on_trigger', 'label', v_item.label, 'amount', v_item.amount,
                       'services', v_service_names, 'dueDate', v_due),
    now(), now()
  )
  ON CONFLICT ("contractPaymentScheduleId")
    WHERE "contractPaymentScheduleId" IS NOT NULL AND status IS DISTINCT FROM 'cancelled'
    DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NOT NULL THEN
    INSERT INTO "paymentRequestItems" (
      id, "paymentRequestId", "contractId", "lineType", "lineStatus",
      "scheduleItemId", "installmentNo", "lineLabel", "plannedPaymentDate", "requestedAmount", "createdAt", "updatedAt"
    ) VALUES (
      (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT,
      v_inserted, v_contract.id, 'schedule_installment', 'pending',
      v_item.id::text, v_item."installmentNo", v_item.label, v_due, v_item.amount, now(), now()
    );
  END IF;
  RETURN v_inserted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.by_service_combo_check_for_service(p_project_service_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_schedule_id BIGINT;
BEGIN
  FOR v_schedule_id IN
    SELECT DISTINCT cpss."contractPaymentScheduleId"
    FROM "contractPaymentScheduleServices" cpss
    JOIN "contractServices" cs ON cs.id = cpss."contractServiceId"
    WHERE cs."projectServiceId" = p_project_service_id
  LOOP
    PERFORM public.by_service_combo_item_check_and_create(v_schedule_id);
  END LOOP;
END;
$function$;
```

(d) Task trigger wrapper + trigger:

```sql
-- 2026-09-28: also re-checks when a task is ticked / unticked as a trigger or
-- moved to another service — a task ticked after it was already Done (the
-- Contract form ticks combo tasks of an existing Case) must still complete
-- its service / combo. by_service_check_and_create_payment_request re-verifies
-- the whole group, so extra calls are harmless.
CREATE OR REPLACE FUNCTION public.by_service_task_group_done_creates_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."projectServiceId" IS NOT NULL
     AND (
       (NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' AND NEW."isPaymentTrigger" IS TRUE)
       OR OLD."isPaymentTrigger" IS DISTINCT FROM NEW."isPaymentTrigger"
       OR OLD."projectServiceId" IS DISTINCT FROM NEW."projectServiceId"
     )
  THEN
    PERFORM public.by_service_check_and_create_payment_request(NEW."projectServiceId");
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_service_task_group_done_creates_payment_request ON tasks;
CREATE TRIGGER trg_by_service_task_group_done_creates_payment_request
  AFTER UPDATE OF status, "isPaymentTrigger", "projectServiceId" ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.by_service_task_group_done_creates_payment_request();
```

- [ ] **Step 5: Run** → the combo section passes; the run then fails on `cancelReason` (column added in Task 3) — record and continue; Task 3 turns it green. Expected after Task 3: `ALL FINANCE BILLING RULES CHECKS PASSED`.

---

### Task 2: Manual unit requests (service, combo, termination settlement)

**Files:** Create `pgsql/finance_billing_rules.sql` (columns + stub fill); test section.

**Interfaces:**
- Consumes: `by_service_service_amount` (Task 1), `contract_resolved_total` (existing).
- Produces: a UI inserts `paymentRequests` `{ id, requestType: 'manual_unit', projectServiceId }` or `{ id, requestType: 'manual_unit', contractPaymentScheduleId }` or `{ id, requestType: 'termination_settlement', contractId, requestedAmount }`, optionally `dueDate` / `title`; the row comes back filled (`requestType = 'create_payment'`, `status = 'active'`, `triggerType = 'manual'`). Errors are `RAISE EXCEPTION` with a sentence the UI can show.

- [ ] **Step 1: Failing test** — append:

```sql
-- ---- manual: line service, combo, termination settlement ----
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", "totalAmount", status)
VALUES (993000000000101, 'LN-1', 'Line test', 'byService', 'line', 1000, 'execution');
INSERT INTO projects (id, "contractId", status) VALUES (993000000000102, 993000000000101, 'in_progress');
INSERT INTO "projectServices" (id, "projectId", "serviceName", "totalAmount", "pricingMode")
VALUES (993000000000103, 993000000000102, 'No-trigger service', 400, 'line');
DO $$
DECLARE r RECORD; blocked text;
BEGIN
  INSERT INTO "paymentRequests" (id, "requestType", "projectServiceId") VALUES (993000000000111, 'manual_unit', 993000000000103);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 993000000000111;
  IF r.status <> 'active' OR r."requestedAmount" <> 400 OR r."contractId" <> 993000000000101 OR r."triggerType" <> 'manual'
     OR r."requestType" <> 'create_payment' OR r."dueDate" IS NULL OR r.title NOT LIKE 'Dịch vụ No-trigger service - LN-1%' THEN
    RAISE EXCEPTION 'FAIL: manual service request filled (got %, %, %, %, %)', r.status, r."requestedAmount", r."contractId", r."triggerType", r.title;
  END IF;
  blocked := NULL;
  BEGIN
    INSERT INTO "paymentRequests" (id, "requestType", "projectServiceId") VALUES (993000000000112, 'manual_unit', 993000000000103);
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM;
  END;
  IF blocked IS NULL OR blocked NOT LIKE '%already has a payment request%' THEN RAISE EXCEPTION 'FAIL: second manual request for a billed service refused (got %)', blocked; END IF;

  -- combo by hand (item with no trigger tasks)
  INSERT INTO "contractPaymentSchedules" (id, "contractId", "installmentNo", label, amount, "triggerType")
  VALUES (993000000000121, 993000000000001, 2, 'Combo Beta', 300, 'on_task_done');
  INSERT INTO "paymentRequests" (id, "requestType", "contractPaymentScheduleId") VALUES (993000000000122, 'manual_unit', 993000000000121);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 993000000000122;
  IF r.title <> 'Combo Beta - CMB-1' OR r."requestedAmount" <> 300 OR r.status <> 'active' THEN
    RAISE EXCEPTION 'FAIL: manual combo request (got %, %, %)', r.title, r."requestedAmount", r.status;
  END IF;

  -- settlement only on a terminated contract, within what is unbilled
  blocked := NULL;
  BEGIN
    INSERT INTO "paymentRequests" (id, "requestType", "contractId", "requestedAmount") VALUES (993000000000131, 'termination_settlement', 993000000000101, 100);
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM;
  END;
  IF blocked IS NULL OR blocked NOT LIKE '%terminated%' THEN RAISE EXCEPTION 'FAIL: settlement needs a terminated contract (got %)', blocked; END IF;
END $$;
```

- [ ] **Step 2: Run** → Expected FAIL: manual request not filled (`requestedAmount` NULL).

- [ ] **Step 3: Implement** — create `pgsql/finance_billing_rules.sql`:

```sql
-- ============================================================
-- Finance P2 — billing rules (2026-09-28)
-- Spec: docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §3 §7 §8
-- Plan: docs/superpowers/plans/2026-09-28-finance-p2-billing-rules.md
--
-- UI actions insert a *stub* Payment Request and the database fills it in:
--   { requestType: 'manual_unit', projectServiceId }            a service by hand
--   { requestType: 'manual_unit', contractPaymentScheduleId }    a combo / item by hand
--   { requestType: 'bill_now', billingPlanId }                   next retainer period now
--   { requestType: 'termination_settlement', contractId, requestedAmount }
-- (optional: dueDate, title). Errors are RAISE EXCEPTION sentences for the UI.
-- Also: cancelling needs a reason and nothing invoiced/paid; retainer
-- auto-billing stops/starts with contractBillingPlans."isBillingActive";
-- terminating a contract cancels what is pending.
-- Deploy after pgsql/finance_foundation.sql, before pgsql/retainer_billing_run_due.sql.
-- Idempotent.
-- ============================================================

ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "cancelReason" text;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "cancelledAt" timestamp with time zone;
ALTER TABLE "contractBillingPlans" ADD COLUMN IF NOT EXISTS "isBillingActive" boolean DEFAULT true;
ALTER TABLE "contractBillingPlans" ADD COLUMN IF NOT EXISTS "pausedAt" timestamp with time zone;
ALTER TABLE "contractBillingPlans" ADD COLUMN IF NOT EXISTS "pauseReason" text;
ALTER TABLE "contractBillingPlans" ADD COLUMN IF NOT EXISTS "resumeOn" date;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "terminationDate" date;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "terminationReason" text;
UPDATE "contractBillingPlans" SET "isBillingActive" = true WHERE "isBillingActive" IS NULL;

-- ---- Manual requests for a service / a combo item / a termination settlement
CREATE OR REPLACE FUNCTION public.finance_fill_manual_unit(p_row "paymentRequests")
RETURNS "paymentRequests"
LANGUAGE plpgsql
AS $function$
DECLARE
  v_item RECORD;
  v_service RECORD;
  v_contract RECORD;
  v_amount NUMERIC;
  v_source TEXT;
BEGIN
  IF p_row."contractPaymentScheduleId" IS NOT NULL THEN
    SELECT * INTO v_item FROM "contractPaymentSchedules" WHERE id = p_row."contractPaymentScheduleId";
    SELECT id, "contractCode", "contractName", "contractType", "customerId", "internalCompanyId", status
    INTO v_contract FROM contracts WHERE id = v_item."contractId";
    IF v_item.id IS NULL OR v_contract.id IS NULL THEN
      RAISE EXCEPTION 'This combo no longer exists.';
    END IF;
    IF v_contract."contractType" IS DISTINCT FROM 'byService' THEN
      RAISE EXCEPTION 'Only a By Service combo can be billed by hand here.';
    END IF;
    IF EXISTS (SELECT 1 FROM "paymentRequests" WHERE "contractPaymentScheduleId" = v_item.id AND status IS DISTINCT FROM 'cancelled') THEN
      RAISE EXCEPTION 'This combo already has a payment request.';
    END IF;
    v_amount := v_item.amount;
    p_row.title := COALESCE(NULLIF(btrim(p_row.title), ''), COALESCE(v_item.label, 'Combo') || ' - ' || COALESCE(v_contract."contractCode", ''));
    p_row."installmentNo" := v_item."installmentNo";
    p_row."sourceSnapshot" := jsonb_build_object('billing', 'combo_manual', 'label', v_item.label, 'amount', v_amount);
  ELSIF p_row."projectServiceId" IS NOT NULL THEN
    SELECT ps.id, ps."serviceName", p."contractId" INTO v_service
    FROM "projectServices" ps JOIN projects p ON p.id = ps."projectId"
    WHERE ps.id = p_row."projectServiceId";
    SELECT id, "contractCode", "contractName", "contractType", "pricingMode", "customerId", "internalCompanyId", status
    INTO v_contract FROM contracts WHERE id = v_service."contractId";
    IF v_service.id IS NULL OR v_contract.id IS NULL THEN
      RAISE EXCEPTION 'This service is not linked to a contract.';
    END IF;
    IF v_contract."contractType" IS DISTINCT FROM 'byService' THEN
      RAISE EXCEPTION 'Only a By Service contract bills per service.';
    END IF;
    IF v_contract."pricingMode" = 'package'
       AND EXISTS (SELECT 1 FROM "contractPaymentSchedules" WHERE "contractId" = v_contract.id) THEN
      RAISE EXCEPTION 'This service is billed as part of a combo — bill the combo instead.';
    END IF;
    IF EXISTS (SELECT 1 FROM "paymentRequests" WHERE "projectServiceId" = v_service.id AND status IS DISTINCT FROM 'cancelled') THEN
      RAISE EXCEPTION 'This service already has a payment request.';
    END IF;
    SELECT a.amount, a.source INTO v_amount, v_source FROM public.by_service_service_amount(v_service.id) a;
    p_row."contractServiceId" := (SELECT id FROM "contractServices" WHERE "projectServiceId" = v_service.id LIMIT 1);
    p_row.title := COALESCE(NULLIF(btrim(p_row.title), ''),
      'Dịch vụ ' || COALESCE(v_service."serviceName", '') || ' - ' || COALESCE(v_contract."contractCode", '') ||
      ' - ' || COALESCE(v_contract."contractName", ''));
    p_row."sourceSnapshot" := jsonb_build_object('billing', 'service_manual', 'serviceName', v_service."serviceName",
                                                 'totalAmount', v_amount, 'amountSource', v_source);
  ELSE
    RAISE EXCEPTION 'Choose the service or the combo to bill.';
  END IF;

  IF v_contract.status = 'terminated' THEN
    RAISE EXCEPTION 'The contract is terminated — use a termination settlement instead.';
  END IF;
  IF COALESCE(v_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'There is no amount to bill for this item.';
  END IF;

  p_row."requestedAmount" := v_amount;
  p_row."contractId" := v_contract.id;
  p_row."customerId" := v_contract."customerId";
  p_row."internalCompanyId" := v_contract."internalCompanyId";
  p_row."requestNote" := COALESCE(p_row."requestNote",
    'Yêu cầu thanh toán tạo thủ công (ngày ' || to_char(now(), 'DD/MM/YYYY') || ')');
  RETURN p_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finance_fill_termination_settlement(p_row "paymentRequests")
RETURNS "paymentRequests"
LANGUAGE plpgsql
AS $function$
DECLARE
  v_contract RECORD;
  v_unbilled NUMERIC;
BEGIN
  SELECT id, "contractCode", "customerId", "internalCompanyId", status INTO v_contract
  FROM contracts WHERE id = p_row."contractId";
  IF v_contract.id IS NULL THEN
    RAISE EXCEPTION 'Choose the contract to settle.';
  END IF;
  IF v_contract.status IS DISTINCT FROM 'terminated' THEN
    RAISE EXCEPTION 'A termination settlement is only for a terminated contract.';
  END IF;
  IF COALESCE(p_row."requestedAmount", 0) <= 0 THEN
    RAISE EXCEPTION 'Enter the amount to settle.';
  END IF;
  v_unbilled := COALESCE(contract_resolved_total(v_contract.id), 0) - COALESCE((
    SELECT SUM("requestedAmount") FROM "paymentRequests"
    WHERE "contractId" = v_contract.id AND status IS DISTINCT FROM 'cancelled'
  ), 0);
  IF p_row."requestedAmount" > v_unbilled THEN
    RAISE EXCEPTION 'The settlement (%) is more than what is still unbilled on the contract (%).',
      p_row."requestedAmount", GREATEST(v_unbilled, 0);
  END IF;
  p_row.title := COALESCE(NULLIF(btrim(p_row.title), ''), 'Quyết toán chấm dứt - ' || COALESCE(v_contract."contractCode", ''));
  p_row."customerId" := v_contract."customerId";
  p_row."internalCompanyId" := v_contract."internalCompanyId";
  p_row."sourceSnapshot" := jsonb_build_object('billing', 'termination_settlement', 'unbilledBefore', v_unbilled);
  RETURN p_row;
END;
$function$;

-- Dispatcher: runs before trg_finance_payment_request_derive (triggers fire
-- in name order: "fill" < "payment"), so the derived columns see the amount.
CREATE OR REPLACE FUNCTION public.finance_fill_request_stub()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."requestType" = 'manual_unit' THEN
    NEW := public.finance_fill_manual_unit(NEW);
  ELSIF NEW."requestType" = 'bill_now' THEN
    NEW := public.finance_fill_bill_now(NEW);
  ELSIF NEW."requestType" = 'termination_settlement' THEN
    NEW := public.finance_fill_termination_settlement(NEW);
  ELSE
    RETURN NEW;
  END IF;
  NEW."requestType" := 'create_payment';
  NEW.status := 'active';
  NEW."triggerType" := 'manual';
  NEW."conditionMet" := true;
  NEW.currency := COALESCE(NEW.currency, 'VND');
  NEW.priority := COALESCE(NEW.priority, 'high');
  NEW."dueDate" := COALESCE(NEW."dueDate", now() + INTERVAL '7 days');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_fill_request_stub ON "paymentRequests";
CREATE TRIGGER trg_finance_fill_request_stub
  BEFORE INSERT ON "paymentRequests"
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_fill_request_stub();
```

(`finance_fill_bill_now` is created in Task 4; until then a `bill_now` stub errors with "function does not exist" — no caller exists yet.)

- [ ] **Step 4: Run** → manual section passes (the run may still stop at `cancelReason` in the combo section until Task 3 — Task 2's own section must pass).

---

### Task 3: Cancelling a request

**Files:** Modify `pgsql/finance_billing_rules.sql`; Modify `pgsql/finance_foundation_migrate.sql`, `pgsql/tests/finance_foundation_test.sql`, `pgsql/tests/finance_foundation_migrate_test.sql` (cancellations get a reason); test section.

**Interfaces:** Produces: `UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = …` succeeds only when allowed; `cancelledAt` set by the database.

- [ ] **Step 1: Failing test** — append:

```sql
-- ---- cancelling: reason required, nothing invoiced or paid, never reopened ----
DO $$
DECLARE blocked text; r RECORD;
BEGIN
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount")
  VALUES (993000000000201, 'To cancel', 'active', 993000000000101, 100);

  blocked := NULL;
  BEGIN UPDATE "paymentRequests" SET status = 'cancelled' WHERE id = 993000000000201;
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM; END;
  IF blocked IS NULL OR blocked NOT LIKE '%reason%' THEN RAISE EXCEPTION 'FAIL: cancel needs a reason (got %)', blocked; END IF;

  INSERT INTO invoices (id, "invoiceNumber", status, "totalAmount", "paymentRequestId") VALUES (993000000000202, 'INV-C', 'draft', 100, 993000000000201);
  blocked := NULL;
  BEGIN UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = 'x' WHERE id = 993000000000201;
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM; END;
  IF blocked IS NULL OR blocked NOT LIKE '%invoice%' THEN RAISE EXCEPTION 'FAIL: cancel refused while an invoice (even draft) exists (got %)', blocked; END IF;
  UPDATE invoices SET status = 'cancelled' WHERE id = 993000000000202;

  INSERT INTO payments (id, amount, "paymentStatus", "paymentRequestId") VALUES (993000000000203, 10, 'Received', 993000000000201);
  blocked := NULL;
  BEGIN UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = 'x' WHERE id = 993000000000201;
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM; END;
  IF blocked IS NULL OR blocked NOT LIKE '%payment%' THEN RAISE EXCEPTION 'FAIL: cancel refused while money was received (got %)', blocked; END IF;
  UPDATE payments SET "paymentStatus" = 'Cancelled' WHERE id = 993000000000203;

  UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = 'Client withdrew' WHERE id = 993000000000201;
  SELECT * INTO r FROM "paymentRequests" WHERE id = 993000000000201;
  IF r."cancelledAt" IS NULL THEN RAISE EXCEPTION 'FAIL: cancelledAt set'; END IF;

  blocked := NULL;
  BEGIN UPDATE "paymentRequests" SET status = 'active' WHERE id = 993000000000201;
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM; END;
  IF blocked IS NULL THEN RAISE EXCEPTION 'FAIL: a cancelled request is never reopened'; END IF;
END $$;
```

- [ ] **Step 2: Run** → Expected FAIL `cancel needs a reason (got <NULL>)`.

- [ ] **Step 3: Implement** — append to `pgsql/finance_billing_rules.sql`:

```sql
-- ---- Cancelling a request (spec §7.1): reason required; refused while it has
-- a non-cancelled invoice (draft included) or Received money; terminal.
CREATE OR REPLACE FUNCTION public.finance_payment_request_cancel_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    IF btrim(COALESCE(NEW."cancelReason", '')) = '' THEN
      RAISE EXCEPTION 'Give a reason to cancel this payment request.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM invoices
      WHERE "paymentRequestId" = NEW.id AND lower(btrim(COALESCE(status, ''))) <> 'cancelled'
    ) THEN
      RAISE EXCEPTION 'This request has an invoice — cancel or replace the invoice first.';
    END IF;
    IF public.finance_pr_paid(NEW.id) > 0 THEN
      RAISE EXCEPTION 'Money was received on this request — move or cancel those payments first.';
    END IF;
    NEW."cancelledAt" := now();
  ELSIF OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'A cancelled payment request cannot be reopened — create a new one.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_payment_request_cancel_guard ON "paymentRequests";
CREATE TRIGGER trg_finance_payment_request_cancel_guard
  BEFORE UPDATE OF status ON "paymentRequests"
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_payment_request_cancel_guard();
```

In `pgsql/finance_foundation_migrate.sql` change the `rejected` mapping to
`UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = COALESCE("cancelReason", 'Migrated from status ' || status) WHERE status IN ('rejected', 'canceled');`
and add at the top of the migrate file, after `BEGIN;`: `ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "cancelReason" text;` (so the migrate file works before P2 is deployed too).
In `pgsql/tests/finance_foundation_test.sql`, every `SET status = 'cancelled'` becomes `SET status = 'cancelled', "cancelReason" = 'test'` (four places), and the section that reactivates `991000000000201` instead re-inserts nothing: replace
`UPDATE "paymentRequests" SET status = 'cancelled' WHERE id = 991000000000201; … UPDATE "paymentRequests" SET status = 'active' WHERE id = 991000000000201;`
with a separate request `991000000000203` inserted `active` then cancelled with a reason, checking its `overdueSince` is NULL (the original request stays active).

- [ ] **Step 4: Run** `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_migrate_test.sql pgsql/tests/finance_foundation_test.sql pgsql/tests/finance_billing_rules_test.sql` → Expected: all three PASSED notices.

---

### Task 4: Retainer — stop / start, bill now, shared helpers

**Files:** Modify `pgsql/finance_billing_rules.sql`, `pgsql/retainer_billing_run_due.sql`; test section.

**Interfaces:**
- Produces: `retainer_step(p_unit text) → interval`, `retainer_cycle_amount(p_total double precision, p_cycles integer, p_period integer) → numeric`, `finance_fill_bill_now("paymentRequests") → "paymentRequests"`; trigger `trg_finance_billing_plan_active_toggle` (BEFORE UPDATE OF "isBillingActive").

- [ ] **Step 1: Failing test** — append:

```sql
-- ---- retainer: bill now, stop / start, quarter unit ----
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status, "endDate")
VALUES (993000000000301, 'RT-1', 'Retainer test', 'retainer', 1000, 'execution', '2027-06-30');
INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles",
                                    "retainerCyclesBilled", "retainerUnit", "nextBillingDate", "endDate")
VALUES (993000000000302, 993000000000301, 'retainer', 'active', 1000, 3, 0, 'month', finance_today() + 10, '2027-06-30');
DO $$
DECLARE r RECORD; p RECORD; blocked text;
BEGIN
  -- bill now: cycle 1, anchored schedule
  INSERT INTO "paymentRequests" (id, "requestType", "billingPlanId") VALUES (993000000000311, 'bill_now', 993000000000302);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 993000000000311;
  SELECT * INTO p FROM "contractBillingPlans" WHERE id = 993000000000302;
  IF r."cycleNo" <> 1 OR r."requestedAmount" <> 333 OR r.status <> 'active' OR r.title NOT LIKE '%Retainer period 1' THEN
    RAISE EXCEPTION 'FAIL: bill now = cycle 1 of 333 (got %, %, %, %)', r."cycleNo", r."requestedAmount", r.status, r.title;
  END IF;
  IF p."retainerCyclesBilled" <> 1 OR p."nextBillingDate" <> ((finance_today() + 10) + interval '1 month')::date THEN
    RAISE EXCEPTION 'FAIL: plan advanced one cycle from its own date (got %, %)', p."retainerCyclesBilled", p."nextBillingDate";
  END IF;

  -- stop needs a reason; bill now refused while stopped
  blocked := NULL;
  BEGIN UPDATE "contractBillingPlans" SET "isBillingActive" = false WHERE id = 993000000000302;
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM; END;
  IF blocked IS NULL OR blocked NOT LIKE '%reason%' THEN RAISE EXCEPTION 'FAIL: stopping needs a reason (got %)', blocked; END IF;
  UPDATE "contractBillingPlans" SET "isBillingActive" = false, "pauseReason" = 'Client on hold' WHERE id = 993000000000302;
  blocked := NULL;
  BEGIN INSERT INTO "paymentRequests" (id, "requestType", "billingPlanId") VALUES (993000000000312, 'bill_now', 993000000000302);
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM; END;
  IF blocked IS NULL OR blocked NOT LIKE '%stopped%' THEN RAISE EXCEPTION 'FAIL: bill now refused while stopped (got %)', blocked; END IF;

  -- start the same day: nothing skipped, end dates unchanged
  UPDATE "contractBillingPlans" SET "isBillingActive" = true WHERE id = 993000000000302;
  SELECT * INTO p FROM "contractBillingPlans" WHERE id = 993000000000302;
  IF p."endDate" <> '2027-06-30' OR p."pausedAt" IS NOT NULL THEN RAISE EXCEPTION 'FAIL: same-day start skips nothing (got %, %)', p."endDate", p."pausedAt"; END IF;

  -- stopped for two billing dates -> both skipped, end dates +2 months
  UPDATE "contractBillingPlans" SET "isBillingActive" = false, "pauseReason" = 'Hold' WHERE id = 993000000000302;
  UPDATE "contractBillingPlans" SET "pausedAt" = now() - interval '70 days', "nextBillingDate" = finance_today() - 60 WHERE id = 993000000000302;
  UPDATE "contractBillingPlans" SET "isBillingActive" = true WHERE id = 993000000000302;
  SELECT * INTO p FROM "contractBillingPlans" WHERE id = 993000000000302;
  IF p."nextBillingDate" < finance_today() THEN RAISE EXCEPTION 'FAIL: next billing date moved past today (got %)', p."nextBillingDate"; END IF;
  IF p."endDate" <> '2027-08-30' THEN RAISE EXCEPTION 'FAIL: plan end date +2 months (got %)', p."endDate"; END IF;
  IF (SELECT "endDate"::date FROM contracts WHERE id = 993000000000301) <> '2027-08-30' THEN RAISE EXCEPTION 'FAIL: contract end date +2 months'; END IF;
  IF p."retainerCyclesBilled" <> 1 THEN RAISE EXCEPTION 'FAIL: cycle count unchanged by a stop (got %)', p."retainerCyclesBilled"; END IF;

  -- auto start on resumeOn, via the hourly job
  UPDATE "contractBillingPlans" SET "isBillingActive" = false, "pauseReason" = 'Hold', "resumeOn" = finance_today() WHERE id = 993000000000302;
  PERFORM * FROM retainer_billing_run_due();
  SELECT * INTO p FROM "contractBillingPlans" WHERE id = 993000000000302;
  IF NOT p."isBillingActive" THEN RAISE EXCEPTION 'FAIL: resumeOn starts billing again'; END IF;

  -- quarter = 3 months
  IF retainer_step('quarter') <> interval '3 months' THEN RAISE EXCEPTION 'FAIL: quarter unit is 3 months'; END IF;
END $$;
```

- [ ] **Step 2: Run** → Expected FAIL: `function finance_fill_bill_now(...) does not exist`.

- [ ] **Step 3: Implement** — append to `pgsql/finance_billing_rules.sql`:

```sql
-- ---- Retainer helpers (shared with pgsql/retainer_billing_run_due.sql)
-- 2026-09-28: 'quarter' is 3 months (the run used to fall back to monthly).
CREATE OR REPLACE FUNCTION public.retainer_step(p_unit text)
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE lower(COALESCE(p_unit, 'month'))
    WHEN 'day' THEN interval '1 day'
    WHEN 'week' THEN interval '1 week'
    WHEN 'quarter' THEN interval '3 months'
    WHEN 'year' THEN interval '1 year'
    ELSE interval '1 month'
  END;
$function$;

-- Whole đồng per cycle, the last cycle taking the remainder; open-ended
-- (no cycle count) -> totalAmount is the per-cycle amount.
CREATE OR REPLACE FUNCTION public.retainer_cycle_amount(p_total double precision, p_cycles integer, p_period integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_cycles IS NULL OR p_cycles <= 0 THEN p_total::numeric
    WHEN p_period >= p_cycles THEN p_total::numeric - ROUND(p_total::numeric / p_cycles) * (p_cycles - 1)
    ELSE ROUND(p_total::numeric / p_cycles)
  END;
$function$;

-- ---- Bill the next retainer period now (spec §8.3): anchored to the plan's
-- own schedule; refused while stopped, with no cycle left, or on a terminated
-- contract. The plan row is locked, so the hourly run cannot bill the same
-- cycle concurrently (and ux_payment_requests_plan_cycle_open backs it).
CREATE OR REPLACE FUNCTION public.finance_fill_bill_now(p_row "paymentRequests")
RETURNS "paymentRequests"
LANGUAGE plpgsql
AS $function$
DECLARE
  v_plan RECORD;
  v_contract RECORD;
  v_period INT;
  v_next DATE;
  v_stop BOOLEAN;
BEGIN
  SELECT * INTO v_plan FROM "contractBillingPlans" WHERE id = p_row."billingPlanId" FOR UPDATE;
  IF v_plan.id IS NULL OR v_plan."planType" IS DISTINCT FROM 'retainer' THEN
    RAISE EXCEPTION 'Retainer plan not found.';
  END IF;
  IF v_plan."isBillingActive" IS FALSE THEN
    RAISE EXCEPTION 'Auto-billing is stopped — start it again before billing the next period.';
  END IF;
  IF v_plan.status IS DISTINCT FROM 'active' OR v_plan."nextBillingDate" IS NULL THEN
    RAISE EXCEPTION 'This retainer has no period left to bill.';
  END IF;
  SELECT id, "contractCode", "contractName", "customerId", "internalCompanyId", status
  INTO v_contract FROM contracts WHERE id = v_plan."contractId";
  IF v_contract.status = 'terminated' THEN
    RAISE EXCEPTION 'The contract is terminated.';
  END IF;

  v_period := COALESCE(v_plan."retainerCyclesBilled", 0) + 1;
  p_row."requestedAmount" := public.retainer_cycle_amount(v_plan."totalAmount", v_plan."retainerTotalCycles", v_period);
  IF COALESCE(p_row."requestedAmount", 0) <= 0 THEN
    RAISE EXCEPTION 'This retainer has no amount to bill.';
  END IF;
  v_next := (v_plan."nextBillingDate" + public.retainer_step(v_plan."retainerUnit"))::date;
  v_stop := (v_plan."retainerTotalCycles" IS NOT NULL AND v_period >= v_plan."retainerTotalCycles")
    OR (v_plan."endDate" IS NOT NULL AND v_next > v_plan."endDate");

  p_row."cycleNo" := v_period;
  p_row."contractId" := v_contract.id;
  p_row."customerId" := v_contract."customerId";
  p_row."internalCompanyId" := v_contract."internalCompanyId";
  p_row.title := COALESCE(NULLIF(btrim(p_row.title), ''),
    'Payment request - ' || COALESCE(v_contract."contractCode", '') || ' - ' ||
    COALESCE(v_contract."contractName", '') || ' - Retainer period ' || v_period);
  p_row."requestNote" := COALESCE(p_row."requestNote",
    'Bill next period now — kỳ ' || v_period || ' (lịch ' || to_char(v_plan."nextBillingDate", 'DD/MM/YYYY') ||
    '), lập ngày ' || to_char(now(), 'DD/MM/YYYY'));
  p_row."sourceSnapshot" := jsonb_build_object('billing', 'retainer_bill_now', 'period', v_period,
                                               'scheduledDate', v_plan."nextBillingDate");

  UPDATE "contractBillingPlans"
  SET "retainerCyclesBilled" = v_period,
      "nextBillingDate" = CASE WHEN v_stop THEN NULL ELSE v_next END,
      status = CASE WHEN v_stop THEN 'completed' ELSE status END,
      "updatedAt" = now()
  WHERE id = v_plan.id;
  RETURN p_row;
END;
$function$;

-- ---- Stop / start auto-billing (spec §8.2): contractBillingPlans."isBillingActive"
-- Stopping needs pauseReason. Starting skips the billing dates that fell while
-- stopped (from pausedAt's date up to yesterday) without billing them: the
-- cycle count is unchanged, so they move to the end, and the plan's and the
-- contract's endDate move forward by the same number of periods.
CREATE OR REPLACE FUNCTION public.finance_billing_plan_active_toggle()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_today DATE := public.finance_today();
  v_from DATE;
  v_step INTERVAL;
  v_skipped INT := 0;
BEGIN
  IF OLD."isBillingActive" IS NOT DISTINCT FROM NEW."isBillingActive" THEN
    RETURN NEW;
  END IF;

  IF NEW."isBillingActive" IS FALSE THEN
    IF btrim(COALESCE(NEW."pauseReason", '')) = '' THEN
      RAISE EXCEPTION 'Give a reason to stop auto-billing.';
    END IF;
    NEW."pausedAt" := COALESCE(NEW."pausedAt", now());
    RETURN NEW;
  END IF;

  -- starting again
  v_step := public.retainer_step(NEW."retainerUnit");
  v_from := COALESCE(public.finance_local_date(OLD."pausedAt"), v_today);
  IF NEW."nextBillingDate" IS NOT NULL THEN
    WHILE NEW."nextBillingDate" < v_today AND NEW."nextBillingDate" >= v_from LOOP
      NEW."nextBillingDate" := (NEW."nextBillingDate" + v_step)::date;
      v_skipped := v_skipped + 1;
    END LOOP;
  END IF;
  IF v_skipped > 0 THEN
    IF NEW."endDate" IS NOT NULL THEN
      NEW."endDate" := (NEW."endDate" + v_step * v_skipped)::date;
    END IF;
    UPDATE contracts
    SET "endDate" = "endDate" + v_step * v_skipped, "updatedAt" = now()
    WHERE id = NEW."contractId" AND "endDate" IS NOT NULL;
  END IF;
  NEW."pausedAt" := NULL;
  NEW."pauseReason" := NULL;
  NEW."resumeOn" := NULL;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_billing_plan_active_toggle ON "contractBillingPlans";
CREATE TRIGGER trg_finance_billing_plan_active_toggle
  BEFORE UPDATE OF "isBillingActive" ON "contractBillingPlans"
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_billing_plan_active_toggle();
```

In `pgsql/retainer_billing_run_due.sql`: header gains "2026-09-28: skips plans whose auto-billing is stopped (isBillingActive = false), starts the ones whose resumeOn has come, skips terminated contracts; amounts and dates via retainer_cycle_amount / retainer_step (pgsql/finance_billing_rules.sql — deploy it first)". At the top of the function body (after `BEGIN`):

```sql
  -- stopped plans whose resumeOn has come start again (the toggle trigger in
  -- finance_billing_rules.sql shifts their schedule)
  UPDATE "contractBillingPlans"
  SET "isBillingActive" = true, "updatedAt" = now()
  WHERE "isBillingActive" = false AND "resumeOn" IS NOT NULL AND "resumeOn" <= v_today;
```

The plan loop's WHERE gains `AND "isBillingActive" IS NOT FALSE`; the contract SELECT gains `c.status AS contract_status`; after `IF v_contract.id IS NULL THEN CONTINUE; END IF;` add `IF v_contract.contract_status = 'terminated' THEN CONTINUE; END IF;`. Replace the inline amount CASE with `v_amount := public.retainer_cycle_amount(v_plan."totalAmount", v_plan."retainerTotalCycles", v_period);` and the unit CASE + next date with `v_next_date := (v_plan."nextBillingDate" + public.retainer_step(v_plan."retainerUnit"))::date;` (drop `v_unit`).

- [ ] **Step 4: Run** all three SQL tests → Expected: all PASSED.

---

### Task 5: Contract termination

**Files:** Modify `pgsql/finance_billing_rules.sql`; test section.

- [ ] **Step 1: Failing test** — append:

```sql
-- ---- termination: pending cancelled, active kept, plans completed ----
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status)
VALUES (993000000000401, 'TM-1', 'Termination test', 'byCase', 1000, 'execution');
DO $$
DECLARE r RECORD;
BEGIN
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount") VALUES
    (993000000000411, 'Pending one', 'pending', 993000000000401, 300),
    (993000000000412, 'Active one', 'active', 993000000000401, 300);
  INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "nextBillingDate")
  VALUES (993000000000413, 993000000000401, 'retainer', 'active', 100, finance_today() + 5);

  UPDATE contracts SET status = 'terminated' WHERE id = 993000000000401;
  SELECT * INTO r FROM contracts WHERE id = 993000000000401;
  IF r."terminationDate" IS DISTINCT FROM finance_today() THEN RAISE EXCEPTION 'FAIL: terminationDate defaults to today (got %)', r."terminationDate"; END IF;
  IF (SELECT status FROM "paymentRequests" WHERE id = 993000000000411) <> 'cancelled' THEN RAISE EXCEPTION 'FAIL: pending request cancelled'; END IF;
  IF (SELECT status FROM "paymentRequests" WHERE id = 993000000000412) <> 'active' THEN RAISE EXCEPTION 'FAIL: active request kept'; END IF;
  IF (SELECT status FROM "contractBillingPlans" WHERE id = 993000000000413) <> 'completed' THEN RAISE EXCEPTION 'FAIL: retainer plan completed'; END IF;

  -- settlement within what is unbilled: 1000 - 300 active = 700
  INSERT INTO "paymentRequests" (id, "requestType", "contractId", "requestedAmount") VALUES (993000000000414, 'termination_settlement', 993000000000401, 500);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 993000000000414;
  IF r.status <> 'active' OR r.title <> 'Quyết toán chấm dứt - TM-1' THEN RAISE EXCEPTION 'FAIL: settlement created (got %, %)', r.status, r.title; END IF;
END $$;
```

- [ ] **Step 2: Run** → Expected FAIL `terminationDate defaults to today (got <NULL>)`.

- [ ] **Step 3: Implement** — append:

```sql
-- ---- Terminating a contract (spec §7.5)
CREATE OR REPLACE FUNCTION public.finance_contract_terminating()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'terminated' AND OLD.status IS DISTINCT FROM 'terminated' THEN
    NEW."terminationDate" := COALESCE(NEW."terminationDate", public.finance_today());
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_contract_terminating ON contracts;
CREATE TRIGGER trg_finance_contract_terminating
  BEFORE UPDATE OF status ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_contract_terminating();

CREATE OR REPLACE FUNCTION public.finance_contract_terminated()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'terminated' AND OLD.status IS DISTINCT FROM 'terminated' THEN
    UPDATE "paymentRequests"
    SET status = 'cancelled', "cancelReason" = 'Contract terminated', "updatedAt" = now()
    WHERE "contractId" = NEW.id AND status = 'pending';
    UPDATE "contractBillingPlans"
    SET status = 'completed', "nextBillingDate" = NULL, "updatedAt" = now()
    WHERE "contractId" = NEW.id AND status = 'active';
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_contract_terminated ON contracts;
CREATE TRIGGER trg_finance_contract_terminated
  AFTER UPDATE OF status ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_contract_terminated();
```

- [ ] **Step 4: Run** all SQL tests → Expected: all PASSED.

---

### Task 6: Forms tick combo triggers; field registration; static checks

**Files:** Modify `All Module/Contract/ContractCreateForm.js` (~14157-14201), `All Module/Case/CaseCreateForm.js` (`linkInstallmentTemplateTasks`, ~11239-11319); Create `JsField/RegisterFinanceBillingRulesFields.js`, `scripts/tests/finance-billing-rules.test.js`.

- [ ] **Step 1: Failing test** — `scripts/tests/finance-billing-rules.test.js`:

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// Finance P2 (2026-09-28): combo items are billed on trigger (spec §3) — the
// forms tick isPaymentTrigger on combo tasks instead of linking them to a
// request that no longer exists up front. SQL behaviour: pgsql/tests/finance_billing_rules_test.sql.
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

{
  const src = read("All Module/Contract/ContractCreateForm.js");
  const start = src.indexOf("// Case exists: link the ticked tasks");
  assert.ok(start > 0, "ContractCreateForm: task-linking block found");
  const block = src.slice(start, start + 4000);
  assert.ok(/comboBillingActive[\s\S]*isPaymentTrigger: true/.test(block), "combo items tick isPaymentTrigger");
  assert.ok(/orderLinksOpenFirst\(ticked, installmentTasksById\)[\s\S]*isPaymentTrigger: true/.test(block), "open tasks ticked first");
  assert.ok(/linkedPaymentRequestId: prId/.test(block), "By Case still links to the installment request");
}
{
  const src = read("All Module/Case/CaseCreateForm.js");
  const start = src.indexOf("const linkInstallmentTemplateTasks = async () => {");
  const block = src.slice(start, src.indexOf("const syncCatalogServiceTasks", start));
  assert.ok(/contractType/.test(block) && /isPaymentTrigger: true/.test(block), "By Service contract: template tasks ticked as triggers");
  assert.ok(/linkedPaymentRequestId: pr\.id/.test(block), "By Case still links to the installment request");
}
{
  const sql = read("pgsql/finance_billing_rules.sql");
  for (const name of [
    "trg_finance_fill_request_stub",
    "trg_finance_payment_request_cancel_guard",
    "trg_finance_billing_plan_active_toggle",
    "trg_finance_contract_terminated",
    "finance_fill_bill_now",
    "retainer_cycle_amount",
  ]) {
    assert.ok(sql.includes(name), `finance_billing_rules.sql defines ${name}`);
  }
  const unified = read("pgsql/unified_contract_payment_schedule.sql");
  assert.ok(/by_service_combo_item_check_and_create/.test(unified), "combo on-trigger creation");
  assert.ok(/AFTER UPDATE OF status, "isPaymentTrigger", "projectServiceId" ON tasks/.test(unified), "task trigger re-checks on tick");
  const run = read("pgsql/retainer_billing_run_due.sql");
  assert.ok(/"isBillingActive" IS NOT FALSE/.test(run), "stopped plans are skipped");
  assert.ok(/retainer_cycle_amount\(/.test(run) && /retainer_step\(/.test(run), "run uses the shared helpers");
}
console.log("finance-billing-rules: all checks passed");
```

- [ ] **Step 2: Run** `node scripts/tests/finance-billing-rules.test.js` → Expected FAIL `combo items tick isPaymentTrigger`.

- [ ] **Step 3: Implement.** ContractCreateForm — replace the block from `// Case exists: link the ticked tasks to the Payment Request` through the closing `}` of `if (ticked.length && triggerSource === "case") { … }` with:

```js
                  // Case exists: link the ticked tasks. Open tasks first, Done
                  // ones last, so a partly linked unit never looks complete.
                  //  - By Service combo / standalone item (2026-09-28, spec
                  //    docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §3):
                  //    no request exists yet — tick isPaymentTrigger; the request
                  //    is created once every trigger task of the item's
                  //    services is Done (pgsql/unified_contract_payment_schedule.sql).
                  //  - By Case: link to the installment's Payment Request the
                  //    insert above just created (AFTER INSERT trigger).
                  // Own try/catch: the row already exists here, so a failure
                  // must be reported as unlinked tasks, not as "installment
                  // not created" by the outer catch.
                  if (ticked.length && triggerSource === "case" && comboBillingActive) {
                    for (const taskId of orderLinksOpenFirst(ticked, installmentTasksById)) {
                      try {
                        await ctx.api.request({
                          url: `tasks:update?filterByTk=${taskId}`,
                          method: "POST",
                          data: { isPaymentTrigger: true },
                        });
                      } catch (linkErr) {
                        failedInstallmentLinks += 1;
                        console.warn("[ContractCreateForm] Could not tick trigger task:", taskId, linkErr);
                      }
                    }
                  } else if (ticked.length && triggerSource === "case") {
```

followed by the existing By Case body unchanged (PR lookup + `linkedPaymentRequestId: prId` loop) and its closing brace.

CaseCreateForm `linkInstallmentTemplateTasks` — after `if (!schedules.length) return;` add a contract-type lookup, and inside the schedule loop branch on it:

```js
          // 2026-09-28 (spec §3): a By Service contract's combo / item rows
          // get their request only when all trigger tasks are Done, so there
          // is no request to link to — tick isPaymentTrigger instead.
          const contractRes = await ctx.api.request({
            url: "contracts:get",
            params: { filterByTk: linkedContractId, fields: ["id", "contractType"] },
          });
          const isByServiceContract = contractRes?.data?.data?.contractType === "byService";
```

and at the top of `for (const schedule of schedules) {`:

```js
            if (isByServiceContract) {
              const { taskIds, unresolvedCount } = resolveTemplateTaskLinks({
                templateIds: schedule.triggerTemplateIds,
                rows,
                tasks: caseTasks,
              });
              failedLinks += unresolvedCount;
              for (const taskId of taskIds) {
                try {
                  await ctx.api.request({
                    url: `tasks:update?filterByTk=${taskId}`,
                    method: "POST",
                    data: { isPaymentTrigger: true },
                  });
                } catch (linkError) {
                  failedLinks += 1;
                  console.warn("Could not tick trigger task:", taskId, linkError);
                }
              }
              continue;
            }
```

- [ ] **Step 4: Field registration** — `JsField/RegisterFinanceBillingRulesFields.js` (same pattern as `RegisterFinanceFoundationFields.js`): `paymentRequests`: `cancelReason` (text, `interface: "textarea"`, `type: "text"`), `cancelledAt` (datetime); `contractBillingPlans`: `isBillingActive` (`type: "boolean"`, `interface: "checkbox"`, `defaultValue: true`, uiSchema `Checkbox`, title "Auto-billing (started)"), `pausedAt` (datetime), `pauseReason` (text), `resumeOn` (date); `contracts`: `terminationDate` (date), `terminationReason` (text). Final console line: "Done. Add 'terminated' to contracts.status options if it is missing."

- [ ] **Step 5: Run** `node scripts/tests/finance-billing-rules.test.js`, the whole node suite (`for t in scripts/tests/*.test.js; do node "$t"; done`), and `node --check` on the two forms → Expected: all pass.

---

## Manual deployment checklist (dev) — after P1 is deployed

1. Back up the dev database.
2. `psql … -f pgsql/unified_contract_payment_schedule.sql` (combo on trigger, task trigger re-check).
3. `psql … -f pgsql/finance_billing_rules.sql`
4. `psql … -f pgsql/retainer_billing_run_due.sql` (needs step 3).
5. `psql … -f pgsql/tests/finance_billing_rules_test.sql` → `ALL FINANCE BILLING RULES CHECKS PASSED`; re-run `pgsql/tests/finance_foundation_test.sql` → still passes.
6. Browser console: paste `JsField/RegisterFinanceBillingRulesFields.js`; check `contracts.status` has a `terminated` option (add it in Collection manager if not).
7. Paste the updated `ContractCreateForm.js` and `CaseCreateForm.js` blocks.
8. Smoke test: new By Service contract with Combo pricing on an existing Case, tick trigger tasks in the Payment Triggers popup → Task Management shows those tasks' Trigger checkbox ticked; finish them → one request "{combo} - {contract}" appears. Existing combo contracts (created before today) keep their pending item requests.
