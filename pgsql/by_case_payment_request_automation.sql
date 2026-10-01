-- ============================================================
-- By Case Payment Request Automation
-- See docs/superpowers/specs/2026-09-15-by-case-payment-request-automation-design.md
--
-- Supersedes the 4 NocoBase Workflows in JsField/Workflow/
-- (CreateByCaseScheduledPaymentRequestsWorkflow.js,
-- CreateTaskDoneActivatesPaymentRequestWorkflow.js,
-- CreateCaseDoneActivatesPaymentRequestWorkflow.js,
-- CreatePaymentRequestDueDateActivationWorkflow.js) — user's explicit
-- decision to switch from Workflow (Admin-UI-visible, but must be rebuilt
-- by hand per environment and is lost on a DB restore, per this project's
-- own documented incident) to a plain SQL trigger file (git-tracked,
-- idempotent, survives a restore, deploys with one script run), matching
-- the convention already used for contract_payment_status_workflow.sql
-- and retainer_billing_automation.sql.
--
-- !!! Before running this file, DELETE the 4 Workflows above via Admin ->
-- Workflow (or they will double-fire alongside these triggers, creating
-- duplicate Payment Requests / double-processing task and case done
-- events). The 4 JsField/Workflow/*.js scripts are kept for history, each
-- now marked SUPERSEDED in its own header comment. !!!
--
-- Idempotent: every statement in this file is safe to run again on a
-- database that already has some or all of it applied.
-- ============================================================

-- ---- Trigger: contracts AFTER INSERT — create one Payment Request per
-- ---- installment for By Case contracts ------------------------------
CREATE OR REPLACE FUNCTION public.by_case_create_scheduled_payment_requests()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  installment jsonb;
  v_pr_id BIGINT;
  v_item_id BIGINT;
  v_trigger_type TEXT;
  v_condition_met BOOLEAN;
  v_due_date TIMESTAMPTZ;
  v_amount NUMERIC;
  v_installment_no INT;
BEGIN
  IF NEW."contractType" IS DISTINCT FROM 'byCase' OR NEW."paymentSchedule" IS NULL THEN
    RETURN NEW;
  END IF;

  FOR installment IN
    SELECT * FROM jsonb_array_elements(COALESCE(NEW."paymentSchedule" -> 'installments', '[]'::jsonb))
  LOOP
    -- Default to 'on_signed' for any installment saved before this
    -- feature existed (no triggerType key in its JSON yet) — matches
    -- ContractCreateForm.js's own newPaymentScheduleRow() default.
    v_trigger_type := COALESCE(NULLIF(installment->>'triggerType', ''), 'on_signed');
    v_condition_met := (v_trigger_type = 'on_signed');
    v_due_date := NULLIF(installment->>'paymentDate', '')::timestamptz;
    v_amount := COALESCE((installment->>'amount')::numeric, 0);
    v_installment_no := NULLIF(installment->>'installmentNo', '')::int;

    -- "paymentRequests".id has no DB-side default (Nocobase snowflake id,
    -- normally assigned by the app) — same id-generation convention
    -- already used by pgsql/AutoCreateTaskFromTemplate.sql and
    -- pgsql/contract_payment_status_workflow.sql for the same situation.
    v_pr_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

    INSERT INTO "paymentRequests" (
      id, title, status, "triggerType", "conditionMet", "installmentNo",
      "contractId", "customerId", "internalCompanyId",
      "requestedAmount", "dueDate", currency, "requestType",
      "createdAt", "updatedAt"
    ) VALUES (
      v_pr_id,
      'Đợt ' || COALESCE(v_installment_no::text, '') || ' - ' || COALESCE(NEW."contractCode", '') || ' - ' || COALESCE(NEW."contractName", ''),
      CASE WHEN v_condition_met AND v_due_date IS NOT NULL THEN 'active' ELSE 'pending' END,
      v_trigger_type,
      v_condition_met,
      v_installment_no,
      NEW.id, NEW."customerId", NEW."internalCompanyId",
      v_amount, v_due_date, 'VND', 'create_payment',
      now(), now()
    );

    v_item_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

    -- Mirrors the shape the existing manual "Create payment request" flow
    -- already produces (ContractPaymentScheduleDetailBlock.js), so these
    -- rows render identically wherever paymentRequestItems is displayed.
    INSERT INTO "paymentRequestItems" (
      id, "paymentRequestId", "contractId", "lineType", "lineStatus",
      "scheduleItemId", "installmentNo", "lineLabel", description,
      "plannedPaymentDate", "requestedAmount", "createdAt", "updatedAt"
    ) VALUES (
      v_item_id, v_pr_id, NEW.id, 'schedule_installment', 'pending',
      installment->>'id', v_installment_no,
      installment->>'label', installment->>'content',
      v_due_date, v_amount, now(), now()
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- SUPERSEDED 2026-09-17 by pgsql/unified_contract_payment_schedule.sql —
-- a By Case contract's schedule now lives as real
-- "contractPaymentSchedules" rows, not contracts.paymentSchedule JSON, so
-- nothing should fire off a bare contract insert anymore. The function
-- above is kept for history/rollback reference only. The trigger itself
-- is intentionally NOT recreated here (only dropped, idempotently) so
-- re-running this file can never resurrect it regardless of run order
-- relative to unified_contract_payment_schedule.sql.
DROP TRIGGER IF EXISTS trg_by_case_create_scheduled_payment_requests ON contracts;

-- ---- Shared logic: activate a By Case Payment Request if it's still
-- ---- 'pending' — extracted so both orderings of (task done, task linked
-- ---- to a PR) can share one implementation. Raw column is
-- ---- "paymentRequestId" (the tasks.linkedPaymentRequestId belongsTo
-- ---- association's own foreignKey) — confirmed directly against this
-- ---- database's `fields` metadata table, since the Admin UI's field
-- ---- editor shows the association name ("linkedPaymentRequestId"), not
-- ---- the underlying SQL column.
-- ---- 2026-09-29: By Case "One time" with trigger tasks. Its single payment
-- ---- (by_case_one_time_ensure_payment_request) waits for the Case to be
-- ---- Done; once tasks are linked to it (contract form's Payment Triggers,
-- ---- Case creation, Task Management) it waits for ALL of them instead —
-- ---- triggerType 'on_task_done', so the Case-done trigger leaves it alone.
-- ---- With no task linked any more it waits for the Case again. Only a
-- ---- pending One time payment is switched; installments keep their type.
CREATE OR REPLACE FUNCTION public.by_case_one_time_sync_trigger_mode(p_payment_request_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pr RECORD;
  v_mode TEXT;
BEGIN
  SELECT pr.id, pr.status, pr."triggerType", pr."contractPaymentScheduleId"
  INTO v_pr
  FROM "paymentRequests" pr
  JOIN contracts c ON c.id = pr."contractId"
  WHERE pr.id = p_payment_request_id
    AND c."contractType" = 'byCase'
    AND COALESCE(c."billingCycle", 'one_time') <> 'multiple_payments';
  IF v_pr.id IS NULL OR v_pr.status IS DISTINCT FROM 'pending'
     OR v_pr."triggerType" NOT IN ('on_case_done', 'on_task_done') THEN
    RETURN;
  END IF;

  v_mode := CASE WHEN EXISTS (SELECT 1 FROM tasks WHERE "paymentRequestId" = v_pr.id)
                 THEN 'on_task_done' ELSE 'on_case_done' END;
  IF v_mode IS DISTINCT FROM v_pr."triggerType" THEN
    UPDATE "paymentRequests" SET "triggerType" = v_mode, "updatedAt" = now() WHERE id = v_pr.id;
    UPDATE "contractPaymentSchedules" SET "triggerType" = v_mode, "updatedAt" = now()
    WHERE id = v_pr."contractPaymentScheduleId" AND "triggerType" IS DISTINCT FROM v_mode;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.by_case_activate_payment_request_if_ready(p_payment_request_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pr RECORD;
BEGIN
  IF p_payment_request_id IS NULL THEN
    RETURN;
  END IF;

  -- a One time payment follows its trigger tasks when it has some (above)
  PERFORM public.by_case_one_time_sync_trigger_mode(p_payment_request_id);

  SELECT id, status, "dueDate" INTO v_pr FROM "paymentRequests" WHERE id = p_payment_request_id;
  IF v_pr.id IS NULL OR v_pr.status <> 'pending' THEN
    RETURN;
  END IF;

  -- 2026-09-24 fix: AND logic across every task linked to this installment
  -- (same rule as By Service's trigger tasks). Previously the FIRST linked
  -- task reaching 'done' activated the request even when other tasks linked
  -- to the same installment (e.g. A and B both on installment 1) were still
  -- open. Now: at least one linked task, and none of them not 'done'.
  IF NOT EXISTS (SELECT 1 FROM tasks WHERE "paymentRequestId" = v_pr.id)
     OR EXISTS (
       SELECT 1 FROM tasks
       WHERE "paymentRequestId" = v_pr.id
         AND status IS DISTINCT FROM 'done'
     )
  THEN
    RETURN;
  END IF;

  -- 2026-09-25: a request with no due date yet (By Service + Combo pricing
  -- billing items are created without one) gets it now — +7 days from
  -- activation — instead of staying pending. By Case installments always
  -- carry a due date already, so this doesn't change them.
  UPDATE "paymentRequests"
  SET "conditionMet" = true,
      status = 'active',
      "dueDate" = COALESCE(v_pr."dueDate", now() + INTERVAL '7 days'),
      "updatedAt" = now()
  WHERE id = v_pr.id;

  -- A due date set just now (it had none) also goes onto the request's line
  -- item and snapshot, which views such as ContractDetailView read.
  IF v_pr."dueDate" IS NULL THEN
    UPDATE "paymentRequestItems"
    SET "plannedPaymentDate" = COALESCE("plannedPaymentDate", now() + INTERVAL '7 days'),
        "updatedAt" = now()
    WHERE "paymentRequestId" = v_pr.id;

    UPDATE "paymentRequests"
    SET "sourceSnapshot" = COALESCE("sourceSnapshot"::jsonb, '{}'::jsonb)
          || jsonb_build_object('dueDate', "dueDate")
    WHERE id = v_pr.id;
  END IF;
END;
$function$;

-- ---- Trigger: tasks AFTER UPDATE OF status — a linked Task's completion
-- ---- marks its Payment Request's trigger condition met. Now a thin guard
-- ---- wrapper around the shared function above.
CREATE OR REPLACE FUNCTION public.by_case_task_done_activates_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'done'
     AND OLD.status IS DISTINCT FROM 'done'
     AND NEW."paymentRequestId" IS NOT NULL
  THEN
    PERFORM public.by_case_activate_payment_request_if_ready(NEW."paymentRequestId");
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_case_task_done_activates_payment_request ON tasks;
CREATE TRIGGER trg_by_case_task_done_activates_payment_request
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.by_case_task_done_activates_payment_request();

-- ---- Trigger: tasks AFTER UPDATE OF "paymentRequestId" — 2026-09-21 fix
-- ---- for the opposite ordering: a task is already 'done' BEFORE it gets
-- ---- linked to an installment's Payment Request. This is a real sequence
-- ---- in practice — a case can exist and have work completed before its
-- ---- By Case contract (and hence its installments) is linked at all, so
-- ---- the "Đợt thanh toán sẽ kích hoạt khi Done" selector has nothing to
-- ---- offer yet. Without this, linking the task to its PR afterward (a
-- ---- change to "paymentRequestId", not to "status") never fired the
-- ---- status-based trigger above, silently leaving that installment stuck
-- ---- unactivated forever. See
-- ---- docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md.
CREATE OR REPLACE FUNCTION public.by_case_task_linked_activates_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- 2026-09-29: a One time payment starts following its tasks as soon as one
  -- is linked, done or not (by_case_one_time_sync_trigger_mode)
  IF NEW."paymentRequestId" IS NOT NULL
     AND OLD."paymentRequestId" IS DISTINCT FROM NEW."paymentRequestId"
  THEN
    PERFORM public.by_case_one_time_sync_trigger_mode(NEW."paymentRequestId");
  END IF;

  IF NEW."paymentRequestId" IS NOT NULL
     AND OLD."paymentRequestId" IS DISTINCT FROM NEW."paymentRequestId"
     AND NEW.status = 'done'
  THEN
    PERFORM public.by_case_activate_payment_request_if_ready(NEW."paymentRequestId");
  END IF;

  -- 2026-09-24: with AND logic, unlinking (or moving away) the last open
  -- task can leave the previous installment's remaining tasks all done —
  -- re-check it so it isn't stuck pending.
  IF OLD."paymentRequestId" IS NOT NULL
     AND OLD."paymentRequestId" IS DISTINCT FROM NEW."paymentRequestId"
  THEN
    PERFORM public.by_case_activate_payment_request_if_ready(OLD."paymentRequestId");
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_case_task_linked_activates_payment_request ON tasks;
CREATE TRIGGER trg_by_case_task_linked_activates_payment_request
  AFTER UPDATE OF "paymentRequestId" ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.by_case_task_linked_activates_payment_request();

-- ---- Trigger: tasks AFTER DELETE — 2026-09-24, completes the AND fix:
-- ---- deleting the last open task linked to an installment is an unlink
-- ---- too; without this, remaining tasks could all be done while the
-- ---- installment stays pending forever (A done + B open on installment 1,
-- ---- B deleted → nothing re-checked).
CREATE OR REPLACE FUNCTION public.by_case_task_deleted_rechecks_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD."paymentRequestId" IS NOT NULL THEN
    PERFORM public.by_case_activate_payment_request_if_ready(OLD."paymentRequestId");
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_case_task_deleted_rechecks_payment_request ON tasks;
CREATE TRIGGER trg_by_case_task_deleted_rechecks_payment_request
  AFTER DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.by_case_task_deleted_rechecks_payment_request();

-- ---- Trigger: projects AFTER UPDATE OF status — a Case becoming done
-- ---- marks its on_case_done Payment Request's trigger condition met ----
-- Since 2026-09-24 this is the ONLY case-done payment mechanism: the legacy
-- lump-sum trigger trg_case_done_payment_request
-- (contract_payment_status_workflow.sql) is dropped, and By Case "One time"
-- contracts get a single 100% on_case_done installment when a Case is
-- linked (by_case_one_time_ensure_payment_request,
-- unified_contract_payment_schedule.sql), which this trigger activates.
CREATE OR REPLACE FUNCTION public.by_case_case_done_activates_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status <> 'done'
     OR OLD.status IS NOT DISTINCT FROM 'done'
     OR NEW."contractId" IS NULL
  THEN
    RETURN NEW;
  END IF;

  UPDATE "paymentRequests"
  SET "conditionMet" = true,
      status = CASE WHEN "dueDate" IS NOT NULL THEN 'active' ELSE 'pending' END,
      "updatedAt" = now()
  WHERE "contractId" = NEW."contractId"
    AND "triggerType" = 'on_case_done'
    AND status = 'pending';

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_case_case_done_activates_payment_request ON projects;
CREATE TRIGGER trg_by_case_case_done_activates_payment_request
  AFTER UPDATE OF status ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.by_case_case_done_activates_payment_request();

-- ---- Trigger: paymentRequests AFTER UPDATE OF dueDate — activate a
-- ---- request whose trigger condition was already met earlier ----------
-- Handles the "condition happened first, due date arrives later"
-- ordering. The opposite ordering (due date already set when the
-- condition happens) is handled inline by the two triggers above and by
-- by_case_create_scheduled_payment_requests itself.
CREATE OR REPLACE FUNCTION public.by_case_due_date_activates_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."dueDate" IS NOT NULL
     AND OLD."dueDate" IS NULL
     AND NEW.status = 'pending'
     AND NEW."conditionMet" = true
  THEN
    UPDATE "paymentRequests" SET status = 'active', "updatedAt" = now() WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_case_due_date_activates_payment_request ON "paymentRequests";
CREATE TRIGGER trg_by_case_due_date_activates_payment_request
  AFTER UPDATE OF "dueDate" ON "paymentRequests"
  FOR EACH ROW
  EXECUTE FUNCTION public.by_case_due_date_activates_payment_request();
