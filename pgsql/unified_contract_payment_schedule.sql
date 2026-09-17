-- ============================================================
-- Unified Contract Payment Data Model — By Case (row-based schedule) +
-- By Service (task-group-completion trigger)
-- See docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md
--
-- Schema confirmed live via JsField/DiagnoseUnifiedPaymentSchemaFields.js
-- on 2026-09-17:
--   - "contractPaymentSchedules" (id, contractId, installmentNo, label,
--     percentage, amount, triggerType) — real table name confirmed.
--   - "paymentRequests" gained contractPaymentScheduleId, projectServiceId,
--     contractServiceId, installmentNo, sourceSnapshot (json).
--   - "tasks" gained isPaymentTrigger (boolean); its existing "caseService"
--     association's raw column is "projectServiceId" (not "caseServiceId" —
--     same association-name-vs-column gotcha already hit once with
--     linkedPaymentRequestId -> paymentRequestId).
--   - "projectServices" has no direct contractId column; the join path to
--     contracts is projectServices.projectId -> projects.id ->
--     projects.contractId -> contracts.id. Its originating contractServices
--     row (if any — ad-hoc case services may have none) is found via the
--     reverse link contractServices.projectServiceId = projectServices.id.
--
-- Supersedes by_case_create_scheduled_payment_requests() from
-- pgsql/by_case_payment_request_automation.sql (that file's other 3
-- triggers — task-done, case-done, due-date activation — are unchanged
-- and reused as-is; this file does not redefine them, so both files must
-- remain installed together. by_case_payment_request_automation.sql's own
-- create-on-contracts-insert trigger is dropped below since a contract's
-- schedule now lives in "contractPaymentSchedules" rows, not
-- contracts.paymentSchedule JSON).
--
-- Idempotent: every statement in this file is safe to run again on a
-- database that already has some or all of it applied.
-- ============================================================

-- ---- Drop the superseded contracts-insert trigger from
-- ---- by_case_payment_request_automation.sql — a contract's schedule is no
-- ---- longer stored as contracts.paymentSchedule JSON, so nothing should
-- ---- fire off a bare contract insert anymore. The function itself is left
-- ---- in place (not dropped) purely for history/rollback reference.
DROP TRIGGER IF EXISTS trg_by_case_create_scheduled_payment_requests ON contracts;

-- ---- Trigger: contractPaymentSchedules AFTER INSERT — create the
-- ---- installment's Payment Request directly, no JSON parsing -----------
CREATE OR REPLACE FUNCTION public.by_case_schedule_row_creates_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_contract RECORD;
  v_pr_id BIGINT;
  v_item_id BIGINT;
  v_condition_met BOOLEAN;
  v_initial_status TEXT;
BEGIN
  SELECT id, "contractCode", "contractName", "customerId", "internalCompanyId"
  INTO v_contract
  FROM contracts
  WHERE id = NEW."contractId";

  IF v_contract.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Matches by_case_payment_request_automation.sql's own default: an
  -- installment with no triggerType yet behaves like 'on_signed'.
  v_condition_met := (COALESCE(NEW."triggerType", 'on_signed') = 'on_signed');

  -- contractPaymentSchedules.dueDate (added after this trigger's first
  -- version) is a one-way seed value only — copied onto the new
  -- paymentRequests row at creation so an 'on_signed' installment filled
  -- in at signing can still activate immediately, same as the old
  -- JSON-based flow. After this INSERT, only paymentRequests.dueDate
  -- matters; editing it later never writes back to the schedule row, and
  -- editing the schedule row's dueDate after its request already exists
  -- has no effect (the trigger only fires on INSERT).
  v_initial_status := CASE WHEN v_condition_met AND NEW."dueDate" IS NOT NULL THEN 'active' ELSE 'pending' END;

  v_pr_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "paymentRequests" (
    id, title, status, "triggerType", "conditionMet", "installmentNo",
    "contractPaymentScheduleId", "contractId", "customerId", "internalCompanyId",
    "requestedAmount", "dueDate", currency, "requestType", "sourceSnapshot",
    "createdAt", "updatedAt"
  ) VALUES (
    v_pr_id,
    'Đợt ' || COALESCE(NEW."installmentNo"::text, '') || ' - ' || COALESCE(v_contract."contractCode", '') || ' - ' || COALESCE(v_contract."contractName", ''),
    v_initial_status,
    COALESCE(NEW."triggerType", 'on_signed'),
    v_condition_met,
    NEW."installmentNo",
    NEW.id, v_contract.id, v_contract."customerId", v_contract."internalCompanyId",
    NEW.amount, NEW."dueDate", 'VND', 'create_payment',
    jsonb_build_object('label', NEW.label, 'percentage', NEW.percentage, 'amount', NEW.amount, 'dueDate', NEW."dueDate"),
    now(), now()
  );

  v_item_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "paymentRequestItems" (
    id, "paymentRequestId", "contractId", "lineType", "lineStatus",
    "scheduleItemId", "installmentNo", "lineLabel",
    "plannedPaymentDate", "requestedAmount", "createdAt", "updatedAt"
  ) VALUES (
    v_item_id, v_pr_id, v_contract.id, 'schedule_installment', 'pending',
    NEW.id::text, NEW."installmentNo", NEW.label,
    NEW."dueDate", NEW.amount, now(), now()
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_case_schedule_row_creates_payment_request ON "contractPaymentSchedules";
CREATE TRIGGER trg_by_case_schedule_row_creates_payment_request
  AFTER INSERT ON "contractPaymentSchedules"
  FOR EACH ROW
  EXECUTE FUNCTION public.by_case_schedule_row_creates_payment_request();

-- ---- Trigger: tasks AFTER UPDATE OF status — By Service: once every task
-- ---- flagged isPaymentTrigger for a case-service line is done, create
-- ---- (not merely activate) that service's Payment Request -------------
-- Raw column for the "caseService" association is "projectServiceId" —
-- confirmed via JsField/DiagnoseUnifiedPaymentSchemaFields.js, not
-- "caseServiceId" as the association's display name might suggest.
CREATE OR REPLACE FUNCTION public.by_service_task_group_done_creates_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_service RECORD;
  v_project RECORD;
  v_contract RECORD;
  v_contract_service_id BIGINT;
  v_pr_id BIGINT;
  v_item_id BIGINT;
BEGIN
  IF NEW.status <> 'done'
     OR OLD.status IS NOT DISTINCT FROM 'done'
     OR NEW."isPaymentTrigger" IS NOT TRUE
     OR NEW."projectServiceId" IS NULL
  THEN
    RETURN NEW;
  END IF;

  -- AND logic: every task tagged isPaymentTrigger for this service must be
  -- done, not just this one. AFTER UPDATE already sees NEW's own committed
  -- status, so this correctly counts NEW itself as done too.
  IF EXISTS (
    SELECT 1 FROM tasks
    WHERE "projectServiceId" = NEW."projectServiceId"
      AND "isPaymentTrigger" = true
      AND status <> 'done'
  ) THEN
    RETURN NEW;
  END IF;

  -- Idempotency: a service's task group can only ever produce one Payment
  -- Request — a task re-opened and re-done later must not create a second.
  IF EXISTS (SELECT 1 FROM "paymentRequests" WHERE "projectServiceId" = NEW."projectServiceId") THEN
    RETURN NEW;
  END IF;

  SELECT id, "projectId", "serviceName", "totalAmount"
  INTO v_service
  FROM "projectServices"
  WHERE id = NEW."projectServiceId";

  IF v_service.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, "contractId", "customerId"
  INTO v_project
  FROM projects
  WHERE id = v_service."projectId";

  IF v_project.id IS NULL OR v_project."contractId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, "contractCode", "contractName", "customerId", "internalCompanyId"
  INTO v_contract
  FROM contracts
  WHERE id = v_project."contractId";

  IF v_contract.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Nullable — an ad-hoc case service added directly on the case (never
  -- synced from a contract line) has no originating contractServices row.
  SELECT id INTO v_contract_service_id
  FROM "contractServices"
  WHERE "projectServiceId" = v_service.id
  LIMIT 1;

  v_pr_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "paymentRequests" (
    id, title, status, "triggerType", "conditionMet",
    "projectServiceId", "contractServiceId", "contractId",
    "customerId", "internalCompanyId",
    "requestedAmount", currency, "requestType", "sourceSnapshot",
    "createdAt", "updatedAt"
  ) VALUES (
    v_pr_id,
    'Dịch vụ ' || COALESCE(v_service."serviceName", '') || ' - ' || COALESCE(v_contract."contractCode", '') || ' - ' || COALESCE(v_contract."contractName", ''),
    'pending',
    'on_task_done',
    true,
    v_service.id, v_contract_service_id, v_contract.id,
    COALESCE(v_contract."customerId", v_project."customerId"), v_contract."internalCompanyId",
    v_service."totalAmount", 'VND', 'create_payment',
    jsonb_build_object('serviceName', v_service."serviceName", 'totalAmount', v_service."totalAmount"),
    now(), now()
  );

  v_item_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "paymentRequestItems" (
    id, "paymentRequestId", "contractId", "lineType", "lineStatus",
    "lineLabel", "requestedAmount", "createdAt", "updatedAt"
  ) VALUES (
    v_item_id, v_pr_id, v_contract.id, 'service_completion', 'pending',
    v_service."serviceName", v_service."totalAmount", now(), now()
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_service_task_group_done_creates_payment_request ON tasks;
CREATE TRIGGER trg_by_service_task_group_done_creates_payment_request
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.by_service_task_group_done_creates_payment_request();

-- ---- Reused unchanged from by_case_payment_request_automation.sql, kept
-- ---- installed there — NOT redefined here:
--   by_case_task_done_activates_payment_request()  (tasks AFTER UPDATE OF status)
--   by_case_case_done_activates_payment_request()  (projects AFTER UPDATE OF status)
--   by_case_due_date_activates_payment_request()   (paymentRequests AFTER UPDATE OF "dueDate")
-- The due-date trigger is already generic over any paymentRequests row —
-- it activates a By Service request exactly the same way it activates a
-- By Case one, no change needed.
