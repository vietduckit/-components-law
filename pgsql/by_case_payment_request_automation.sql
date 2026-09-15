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

DROP TRIGGER IF EXISTS trg_by_case_create_scheduled_payment_requests ON contracts;
CREATE TRIGGER trg_by_case_create_scheduled_payment_requests
  AFTER INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.by_case_create_scheduled_payment_requests();

-- ---- Trigger: tasks AFTER UPDATE OF status — a linked Task's completion
-- ---- marks its Payment Request's trigger condition met -----------------
-- Raw column is "paymentRequestId" (the tasks.linkedPaymentRequestId
-- belongsTo association's own foreignKey) — confirmed directly against
-- this database's `fields` metadata table before writing this, since the
-- Admin UI's field editor shows the association name
-- ("linkedPaymentRequestId"), not the underlying SQL column.
CREATE OR REPLACE FUNCTION public.by_case_task_done_activates_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pr RECORD;
BEGIN
  IF NEW.status <> 'done'
     OR OLD.status IS NOT DISTINCT FROM 'done'
     OR NEW."paymentRequestId" IS NULL
  THEN
    RETURN NEW;
  END IF;

  SELECT id, status, "dueDate" INTO v_pr FROM "paymentRequests" WHERE id = NEW."paymentRequestId";
  IF v_pr.id IS NULL OR v_pr.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  UPDATE "paymentRequests"
  SET "conditionMet" = true,
      status = CASE WHEN v_pr."dueDate" IS NOT NULL THEN 'active' ELSE 'pending' END,
      "updatedAt" = now()
  WHERE id = v_pr.id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_case_task_done_activates_payment_request ON tasks;
CREATE TRIGGER trg_by_case_task_done_activates_payment_request
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.by_case_task_done_activates_payment_request();

-- ---- Trigger: projects AFTER UPDATE OF status — a Case becoming done
-- ---- marks its on_case_done Payment Request's trigger condition met ----
-- Runs independently of, and has no effect on, the existing
-- auto_create_payment_request_on_case_done trigger
-- (contract_payment_status_workflow.sql) — both react to the same "case
-- became done" event side by side; that trigger's lump-sum
-- "outstanding balance" fallback still fires for contracts with no
-- scheduled on_case_done installment, unchanged.
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
