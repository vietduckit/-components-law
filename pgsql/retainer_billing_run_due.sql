-- ============================================================
-- Retainer billing — SQL replacement for the date-field Workflow
-- (2026-09-24, user decision). Supersedes the node graph of
-- JsField/Workflow/CreateContractBillingPlansWorkflow.js: all billing logic
-- now lives here, git-tracked; NocoBase only keeps a tiny cron Workflow
-- (JsField/Workflow/CreateRetainerBillingCronWorkflow.js) that runs
--     SELECT * FROM public.retainer_billing_run_due();
-- every hour and sends the in-app notification for each row returned.
-- Postgres triggers can't fire "when a date arrives", so something has to
-- call this on a schedule; pg_cron was not an option (see
-- docs/superpowers/specs/2026-09-07-retainer-billing-automation-design.md §3).
--
-- Per due plan (planType 'retainer', status 'active', nextBillingDate <=
-- today in Asia/Ho_Chi_Minh), exactly like the old Workflow:
--   1. period amount = totalAmount / retainerTotalCycles in whole đồng, the
--      last cycle taking the remainder so the cycles add up to totalAmount
--      exactly (2026-09-25: 10,000,000 / 3 used to bill 3 x 3,333,333.33 =
--      9,999,999.99), or totalAmount
--      itself when retainerTotalCycles is NULL (open-ended retainer —
--      ContractCreateForm.js labels it "Amount per cycle").
--   2. INSERT one paymentRequests row, status 'active' (2026-09-28: request
--      statuses are pending / active / cancelled), due in 7 days, carrying
--      billingPlanId + cycleNo, same title format as before ("Payment
--      request - {code} - {name} - Retainer period {n}"). A cycle that
--      already has an open request is skipped
--      (ux_payment_requests_plan_cycle_open, pgsql/finance_foundation.sql)
--      but the plan still advances.
--   3. stop when the cycle count is reached (only if there is one) or the
--      next date passes endDate → nextBillingDate NULL, status 'completed';
--      otherwise advance retainerCyclesBilled and nextBillingDate by one
--      retainerUnit. No endDate and no cycle count → bills indefinitely.
-- One period per plan per call: a plan several periods behind catches up one
-- period per run instead of mass-creating backdated requests in one go.
-- FOR UPDATE SKIP LOCKED makes overlapping runs safe (no double billing).
--
-- Returns one row per request created, for the Workflow's notification step.
-- The plan UPDATE touches only retainerCyclesBilled/nextBillingDate/status,
-- so contract_billing_plan_init_retainer_state (BEFORE UPDATE OF
-- retainerTotalCycles/startDate/planType/totalAmount) does not re-fire.
--
-- Idempotent to deploy (CREATE OR REPLACE). Requires contractBillingPlans
-- (JsField/CreateContractBillingPlansCollection.js),
-- pgsql/contract_billing_plans_trigger.sql and, since 2026-09-28,
-- pgsql/finance_foundation.sql (billingPlanId/cycleNo columns and the
-- ux_payment_requests_plan_cycle_open index the ON CONFLICT below names —
-- without it every run fails).
--
-- 2026-09-28 (Finance P2, spec 2026-09-28 §8): skips plans whose auto-billing
-- is stopped (isBillingActive = false), first starts the stopped plans whose
-- resumeOn has come (the toggle trigger shifts their schedule), skips
-- terminated contracts, and takes amounts / dates from retainer_cycle_amount /
-- retainer_step ('quarter' = 3 months). Requires pgsql/finance_billing_rules.sql
-- (deploy it first).
-- ============================================================

CREATE OR REPLACE FUNCTION public.retainer_billing_run_due()
RETURNS TABLE (
  payment_request_id BIGINT,
  title TEXT,
  requested_amount NUMERIC,
  contract_id BIGINT,
  receiver_user_id BIGINT
)
LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_plan RECORD;
  v_contract RECORD;
  v_amount NUMERIC;
  v_period INT;
  v_next_date DATE;
  v_stop BOOLEAN;
  v_pr_id BIGINT;
  v_inserted_id BIGINT;
  v_title TEXT;
BEGIN
  -- stopped plans whose resumeOn has come start again (the toggle trigger in
  -- pgsql/finance_billing_rules.sql shifts their schedule)
  UPDATE "contractBillingPlans"
  SET "isBillingActive" = true, "updatedAt" = now()
  WHERE "isBillingActive" = false AND "resumeOn" IS NOT NULL AND "resumeOn" <= v_today;

  FOR v_plan IN
    SELECT *
    FROM "contractBillingPlans"
    WHERE "planType" = 'retainer'
      AND status = 'active'
      AND "isBillingActive" IS NOT FALSE
      AND "nextBillingDate" IS NOT NULL
      AND "nextBillingDate" <= v_today
    ORDER BY "nextBillingDate", id
    FOR UPDATE SKIP LOCKED
  LOOP
    IF COALESCE(v_plan."totalAmount", 0) <= 0 THEN
      CONTINUE;
    END IF;

    SELECT c.id, c."contractCode", c."contractName", c."customerId",
           c."internalCompanyId", c.status AS contract_status, l."userId" AS lawyer_user_id
    INTO v_contract
    FROM contracts c
    LEFT JOIN lawyers l ON l.id = c."lawyerId"
    WHERE c.id = v_plan."contractId";

    IF v_contract.id IS NULL OR v_contract.contract_status = 'terminated' THEN
      CONTINUE;
    END IF;

    v_period := COALESCE(v_plan."retainerCyclesBilled", 0) + 1;
    -- whole đồng, last cycle takes the remainder; open-ended -> totalAmount per cycle
    v_amount := public.retainer_cycle_amount(v_plan."totalAmount", v_plan."retainerTotalCycles", v_period);
    v_next_date := (v_plan."nextBillingDate" + public.retainer_step(v_plan."retainerUnit"))::date;
    v_stop :=
      (v_plan."retainerTotalCycles" IS NOT NULL AND v_period >= v_plan."retainerTotalCycles")
      OR (v_plan."endDate" IS NOT NULL AND v_next_date > v_plan."endDate");

    v_pr_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;
    v_title := 'Payment request - ' || COALESCE(v_contract."contractCode", '') || ' - ' ||
      COALESCE(v_contract."contractName", '') || ' - Retainer period ' || v_period;

    v_inserted_id := NULL;
    -- 2026-09-29: attached to the period's schedule row (pgsql/finance_retainer_schedule.sql),
    -- when there is one. A period that already has an open request — by plan +
    -- cycle or by schedule row — is skipped: ON CONFLICT without a target covers
    -- both unique indexes.
    INSERT INTO "paymentRequests" (
      id, title, status, "contractId", "customerId", "internalCompanyId",
      "requestedAmount", "dueDate", "billingPlanId", "cycleNo", "contractPaymentScheduleId", "createdAt", "updatedAt"
    ) VALUES (
      v_pr_id, v_title, 'active', v_contract.id, v_contract."customerId",
      v_contract."internalCompanyId", v_amount, now() + INTERVAL '7 days', v_plan.id, v_period,
      (SELECT s.id FROM "contractPaymentSchedules" s
       WHERE s."contractId" = v_contract.id AND s."installmentNo" = v_period AND s."triggerType" = 'retainer_period'
       ORDER BY s.id LIMIT 1),
      now(), now()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_inserted_id;

    IF v_stop THEN
      UPDATE "contractBillingPlans"
      SET "retainerCyclesBilled" = v_period,
          "nextBillingDate" = NULL,
          status = 'completed',
          "updatedAt" = now()
      WHERE id = v_plan.id;
    ELSE
      UPDATE "contractBillingPlans"
      SET "retainerCyclesBilled" = v_period,
          "nextBillingDate" = v_next_date,
          "updatedAt" = now()
      WHERE id = v_plan.id;
    END IF;

    IF v_inserted_id IS NOT NULL THEN
      payment_request_id := v_pr_id;
      title := v_title;
      requested_amount := v_amount;
      contract_id := v_contract.id;
      receiver_user_id := v_contract.lawyer_user_id;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;

-- Preview (read-only): plans that the next run would bill.
-- SELECT id, "contractId", "nextBillingDate", "retainerCyclesBilled", "retainerTotalCycles", "totalAmount", "endDate"
-- FROM "contractBillingPlans"
-- WHERE "planType" = 'retainer' AND status = 'active' AND "nextBillingDate" IS NOT NULL
--   AND "nextBillingDate" <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
