-- ============================================================
-- Retainer periods as payment schedule rows (2026-09-29).
--
-- A retainer's billing plan (contractBillingPlans, created by the contract
-- form or "New billing plan" on the Case Finance tab) now also has one
-- "contractPaymentSchedules" row per period — "Kỳ 1", "Kỳ 2", … with the
-- period's amount (retainer_cycle_amount: whole đồng, the last period takes
-- the remainder) and billing date — so the contract's payment schedule
-- (ContractPaymentScheduleDetailBlock, ContractDetailView) and the Case
-- Finance tab show the same periods. Each period's request (hourly run, Bill
-- now) is attached to its row (contractPaymentScheduleId), so what the row
-- has received comes from that request.
--
-- Kept in step by retainer_schedule_sync(plan) after every change of the plan:
--   * fixed number of periods -> one row per period;
--   * open-ended              -> the periods billed so far + the next one;
--   * periods not billed yet  -> amount and date follow the plan (a stop /
--     start moves them, like the plan's own dates);
--   * plan completed / contract terminated -> periods never billed are removed.
-- The rows create no request themselves (unified_contract_payment_schedule.sql
-- skips retainer contracts).
--
-- Requires pgsql/finance_billing_rules.sql (retainer_step,
-- retainer_cycle_amount) and pgsql/finance_foundation.sql (finance_today).
-- Deploy after pgsql/unified_contract_payment_schedule.sql and
-- pgsql/retainer_billing_run_due.sql. Idempotent; the last statement brings
-- every existing retainer plan in step.
-- Test: pgsql/tests/finance_retainer_schedule_test.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.retainer_period_date(p_plan "contractBillingPlans", p_period integer)
RETURNS date
LANGUAGE sql
STABLE
AS $function$
  -- periods still to bill run from the next billing date; before any date is
  -- known, from the start date
  SELECT CASE
    WHEN p_plan."nextBillingDate" IS NOT NULL AND p_period > COALESCE(p_plan."retainerCyclesBilled", 0) THEN
      (p_plan."nextBillingDate" + public.retainer_step(p_plan."retainerUnit") * (p_period - COALESCE(p_plan."retainerCyclesBilled", 0) - 1))::date
    WHEN p_plan."startDate" IS NOT NULL THEN
      (p_plan."startDate" + public.retainer_step(p_plan."retainerUnit") * (p_period - 1))::date
  END;
$function$;

-- Brings a retainer plan's schedule rows in step; returns the number of rows.
CREATE OR REPLACE FUNCTION public.retainer_schedule_sync(p_plan_id bigint)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_plan "contractBillingPlans";
  v_cycles integer;
  v_billed integer;
  v_target integer;
  v_period integer;
  v_date date;
  v_due timestamptz;
  v_amount numeric;
  v_row_id bigint;
BEGIN
  SELECT * INTO v_plan FROM "contractBillingPlans" WHERE id = p_plan_id;
  IF v_plan.id IS NULL OR v_plan."planType" IS DISTINCT FROM 'retainer' OR v_plan."contractId" IS NULL THEN
    RETURN 0;
  END IF;
  -- only a retainer contract's rows are its periods
  IF NOT EXISTS (SELECT 1 FROM contracts WHERE id = v_plan."contractId" AND "contractType" = 'retainer') THEN
    RETURN 0;
  END IF;

  v_cycles := NULLIF(v_plan."retainerTotalCycles", 0);
  v_billed := COALESCE(v_plan."retainerCyclesBilled", 0);
  v_target := CASE
    WHEN v_plan.status IS DISTINCT FROM 'active' THEN v_billed
    WHEN v_cycles IS NOT NULL THEN v_cycles
    ELSE v_billed + CASE WHEN v_plan."nextBillingDate" IS NOT NULL THEN 1 ELSE 0 END
  END;

  FOR v_period IN 1..v_target LOOP
    v_date := public.retainer_period_date(v_plan, v_period);
    v_due := CASE WHEN v_date IS NULL THEN NULL ELSE (v_date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') END;
    v_amount := public.retainer_cycle_amount(v_plan."totalAmount", v_cycles, v_period);

    SELECT id INTO v_row_id FROM "contractPaymentSchedules"
    WHERE "contractId" = v_plan."contractId" AND "installmentNo" = v_period
    ORDER BY id LIMIT 1;

    IF v_row_id IS NULL THEN
      v_row_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint * 1000 + (v_period % 1000);
      INSERT INTO "contractPaymentSchedules" (
        id, "contractId", "installmentNo", label, amount, "triggerType", "dueDate", "createdAt", "updatedAt"
      ) VALUES (
        v_row_id, v_plan."contractId", v_period, 'Kỳ ' || v_period, v_amount, 'retainer_period', v_due, now(), now()
      );
    ELSIF v_period > v_billed THEN
      -- not billed yet: follows the plan (a billed period keeps its own values)
      UPDATE "contractPaymentSchedules"
      SET amount = v_amount, "dueDate" = v_due, "triggerType" = 'retainer_period', "updatedAt" = now()
      WHERE id = v_row_id
        AND (amount IS DISTINCT FROM v_amount OR "dueDate" IS DISTINCT FROM v_due
             OR "triggerType" IS DISTINCT FROM 'retainer_period');
    ELSE
      -- an older row of this retainer: marked as a period row (what the run looks for)
      UPDATE "contractPaymentSchedules" SET "triggerType" = 'retainer_period', "updatedAt" = now()
      WHERE id = v_row_id AND "triggerType" IS DISTINCT FROM 'retainer_period';
    END IF;

    -- a period request made before its row existed is attached to it
    UPDATE "paymentRequests"
    SET "contractPaymentScheduleId" = v_row_id, "updatedAt" = now()
    WHERE "billingPlanId" = v_plan.id AND "cycleNo" = v_period
      AND "contractPaymentScheduleId" IS NULL AND status IS DISTINCT FROM 'cancelled';
  END LOOP;

  -- periods past the plan (completed, terminated, fewer periods) that were never billed
  DELETE FROM "contractPaymentSchedules" s
  WHERE s."contractId" = v_plan."contractId" AND s."installmentNo" > v_target
    AND NOT EXISTS (
      SELECT 1 FROM "paymentRequests" r
      WHERE r."contractPaymentScheduleId" = s.id AND r.status IS DISTINCT FROM 'cancelled'
    );

  RETURN v_target;
END;
$function$;

CREATE OR REPLACE FUNCTION public.retainer_schedule_on_plan_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM public.retainer_schedule_sync(NEW.id);
  -- 2026-09-30: the contract is worth fee × periods (contract_retainer_value),
  -- so a new plan, a changed fee / number of periods or one more period
  -- billed (open-ended) moves the contract balance too.
  PERFORM public.contract_recompute_outstanding_for(NEW."contractId");
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_retainer_schedule_on_plan_change ON "contractBillingPlans";
CREATE TRIGGER trg_retainer_schedule_on_plan_change
  AFTER INSERT OR UPDATE ON "contractBillingPlans"
  FOR EACH ROW
  WHEN (NEW."planType" = 'retainer')
  EXECUTE FUNCTION public.retainer_schedule_on_plan_change();

-- Existing retainer plans: rows per period now (safe to repeat). 2026-09-30:
-- also brings periods not billed yet to the per-period fee (billed periods
-- keep their amounts).
SELECT p.id AS plan_id, public.retainer_schedule_sync(p.id) AS schedule_rows
FROM "contractBillingPlans" p
WHERE p."planType" = 'retainer';

-- Existing retainer contracts: balance against fee × periods (safe to repeat).
SELECT c.id AS contract_id, public.contract_recompute_outstanding_for(c.id) AS recomputed
FROM contracts c
WHERE c."contractType" = 'retainer';
