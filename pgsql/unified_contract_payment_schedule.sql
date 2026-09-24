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
--
-- 2026-09-21 revision (§6h) — By Case installment/service tagging: uses 2
-- new junction collections (created via Admin UI, matching this codebase's
-- existing serviceCombos/serviceComboItems pattern instead of a JSON array
-- or NocoBase's opaque auto-generated M2M through table):
--   - "contractPaymentScheduleServices" (contractPaymentScheduleId,
--     contractServiceId) — written by ContractCreateForm.js's Payment
--     Schedule row editor (multi-select "Service" column, optional).
--   - "paymentRequestServices" (paymentRequestId, contractServiceId) —
--     populated below, by copying each matching
--     contractPaymentScheduleServices row onto the newly created Payment
--     Request. TaskDetailView.js/TaskManagement.js read THIS table (not
--     contractPaymentScheduleServices) to narrow a task's installment
--     picker to its own service. No rows tagged for an installment/PR
--     means "no particular service" — visible to every task, same as
--     before this feature existed.
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
  v_due_date TIMESTAMPTZ;
  v_request_note TEXT;
  v_service_row RECORD;
  v_pr_service_id BIGINT;
  v_service_seq INT := 0;
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

  -- contractPaymentSchedules.dueDate is a one-way seed value — the lawyer's
  -- own explicit due date, when they set one while authoring the schedule,
  -- always wins; only defaults to +7 days when they didn't set one (2026-09-21
  -- revision — every new request should have SOME due date rather than
  -- sitting with none until someone remembers to set it).
  v_due_date := COALESCE(NEW."dueDate", now() + INTERVAL '7 days');
  v_initial_status := CASE WHEN v_condition_met AND v_due_date IS NOT NULL THEN 'active' ELSE 'pending' END;
  v_request_note := 'Yêu cầu thanh toán tự động của đợt "' || COALESCE(NEW.label, '') ||
    '" từ ngày tạo ' || to_char(now(), 'DD/MM/YYYY');

  v_pr_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "paymentRequests" (
    id, title, status, "triggerType", "conditionMet", "installmentNo",
    "contractPaymentScheduleId", "contractId", "customerId", "internalCompanyId",
    "requestedAmount", "dueDate", currency, "requestType", priority, "requestNote", "sourceSnapshot",
    "createdAt", "updatedAt"
  ) VALUES (
    v_pr_id,
    'Đợt ' || COALESCE(NEW."installmentNo"::text, '') || ' - ' || COALESCE(v_contract."contractCode", '') || ' - ' || COALESCE(v_contract."contractName", ''),
    v_initial_status,
    COALESCE(NEW."triggerType", 'on_signed'),
    v_condition_met,
    NEW."installmentNo",
    NEW.id, v_contract.id, v_contract."customerId", v_contract."internalCompanyId",
    NEW.amount, v_due_date, 'VND', 'create_payment', 'high', v_request_note,
    jsonb_build_object('label', NEW.label, 'percentage', NEW.percentage, 'amount', NEW.amount, 'dueDate', v_due_date),
    now(), now()
  );

  -- Copy each service tag from the schedule row onto the newly created
  -- Payment Request, via "paymentRequestServices" — see docs/superpowers/
  -- specs/2026-09-17-unified-contract-payment-data-model-design.md §6h.
  -- No rows here (untagged installment) means the PR is now hidden from
  -- every task's installment picker (§6m, 2026-09-21) — Service is required
  -- at authoring time, so this only happens for pre-§6m data.
  FOR v_service_row IN
    SELECT "contractServiceId" FROM "contractPaymentScheduleServices"
    WHERE "contractPaymentScheduleId" = NEW.id
  LOOP
    v_service_seq := v_service_seq + 1;
    v_pr_service_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT + v_service_seq;
    INSERT INTO "paymentRequestServices" (
      id, "paymentRequestId", "contractServiceId", "createdAt", "updatedAt"
    ) VALUES (
      v_pr_service_id, v_pr_id, v_service_row."contractServiceId", now(), now()
    );
  END LOOP;

  v_item_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "paymentRequestItems" (
    id, "paymentRequestId", "contractId", "lineType", "lineStatus",
    "scheduleItemId", "installmentNo", "lineLabel",
    "plannedPaymentDate", "requestedAmount", "createdAt", "updatedAt"
  ) VALUES (
    v_item_id, v_pr_id, v_contract.id, 'schedule_installment', 'pending',
    NEW.id::text, NEW."installmentNo", NEW.label,
    v_due_date, NEW.amount, now(), now()
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_case_schedule_row_creates_payment_request ON "contractPaymentSchedules";
CREATE TRIGGER trg_by_case_schedule_row_creates_payment_request
  AFTER INSERT ON "contractPaymentSchedules"
  FOR EACH ROW
  EXECUTE FUNCTION public.by_case_schedule_row_creates_payment_request();

-- ---- Shared logic: given one projectServices row, check whether every task
-- ---- tagged isPaymentTrigger for it is done, and if so create that
-- ---- service's Payment Request (idempotent — never creates a second one).
-- Extracted out of the tasks-status trigger below so the SAME check can
-- also run from the projects.contractId catch-up trigger further down —
-- covers a task already being marked done BEFORE the case had a contract
-- linked yet (a real sequence in practice: work starts, contract signed
-- later), which the tasks-status trigger alone could never catch since it
-- only fires at the moment a task's status changes, not later when the
-- contract shows up. Raw column for the "caseService" association is
-- "projectServiceId" — confirmed via
-- JsField/DiagnoseUnifiedPaymentSchemaFields.js, not "caseServiceId" as the
-- association's display name might suggest.
CREATE OR REPLACE FUNCTION public.by_service_check_and_create_payment_request(p_project_service_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_service RECORD;
  v_project RECORD;
  v_contract RECORD;
  v_contract_service_id BIGINT;
  v_pr_id BIGINT;
  v_item_id BIGINT;
  v_task_titles TEXT;
  v_request_note TEXT;
  v_due_date TIMESTAMPTZ;
BEGIN
  IF p_project_service_id IS NULL THEN
    RETURN;
  END IF;

  -- AND logic: every task tagged isPaymentTrigger for this service must be
  -- done. The tasks-status trigger's caller already sees its own row's
  -- committed status by the time it calls in here (AFTER UPDATE), so no
  -- special-casing is needed for the row that just changed.
  IF EXISTS (
    SELECT 1 FROM tasks
    WHERE "projectServiceId" = p_project_service_id
      AND "isPaymentTrigger" = true
      AND status <> 'done'
  ) THEN
    RETURN;
  END IF;

  -- Nothing to do if this service has no isPaymentTrigger tasks at all
  -- (the EXISTS above passes vacuously for an empty set).
  IF NOT EXISTS (
    SELECT 1 FROM tasks
    WHERE "projectServiceId" = p_project_service_id AND "isPaymentTrigger" = true
  ) THEN
    RETURN;
  END IF;

  -- Idempotency: a service's task group can only ever produce one Payment
  -- Request — a task re-opened and re-done later, or a second catch-up
  -- pass, must not create a second one.
  IF EXISTS (SELECT 1 FROM "paymentRequests" WHERE "projectServiceId" = p_project_service_id) THEN
    RETURN;
  END IF;

  SELECT id, "projectId", "serviceName", "totalAmount"
  INTO v_service
  FROM "projectServices"
  WHERE id = p_project_service_id;

  IF v_service.id IS NULL THEN
    RETURN;
  END IF;

  SELECT id, "contractId", "customerId"
  INTO v_project
  FROM projects
  WHERE id = v_service."projectId";

  IF v_project.id IS NULL OR v_project."contractId" IS NULL THEN
    RETURN;
  END IF;

  SELECT id, "contractCode", "contractName", "customerId", "internalCompanyId"
  INTO v_contract
  FROM contracts
  WHERE id = v_project."contractId";

  IF v_contract.id IS NULL THEN
    RETURN;
  END IF;

  -- Nullable — an ad-hoc case service added directly on the case (never
  -- synced from a contract line) has no originating contractServices row.
  SELECT id INTO v_contract_service_id
  FROM "contractServices"
  WHERE "projectServiceId" = v_service.id
  LIMIT 1;

  -- 2026-09-21 revision: priority/dueDate/requestNote set at creation
  -- instead of left blank — conditionMet is already guaranteed true by the
  -- guards above (the whole trigger-task group is done), and dueDate is
  -- now always set too, so this request goes straight to 'active' rather
  -- than sitting in 'pending' waiting for someone to set a due date.
  SELECT string_agg(title, ', ' ORDER BY title)
  INTO v_task_titles
  FROM tasks
  WHERE "projectServiceId" = p_project_service_id AND "isPaymentTrigger" = true;

  v_due_date := now() + INTERVAL '7 days';
  v_request_note := 'Yêu cầu thanh toán tự động của các task: ' || COALESCE(v_task_titles, '') ||
    ' từ ngày tạo ' || to_char(now(), 'DD/MM/YYYY');

  v_pr_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "paymentRequests" (
    id, title, status, "triggerType", "conditionMet",
    "projectServiceId", "contractServiceId", "contractId",
    "customerId", "internalCompanyId",
    "requestedAmount", "dueDate", currency, "requestType", priority, "requestNote", "sourceSnapshot",
    "createdAt", "updatedAt"
  ) VALUES (
    v_pr_id,
    'Dịch vụ ' || COALESCE(v_service."serviceName", '') || ' - ' || COALESCE(v_contract."contractCode", '') || ' - ' || COALESCE(v_contract."contractName", ''),
    'active',
    'on_task_done',
    true,
    v_service.id, v_contract_service_id, v_contract.id,
    COALESCE(v_contract."customerId", v_project."customerId"), v_contract."internalCompanyId",
    v_service."totalAmount", v_due_date, 'VND', 'create_payment', 'high', v_request_note,
    jsonb_build_object('serviceName', v_service."serviceName", 'totalAmount', v_service."totalAmount", 'dueDate', v_due_date),
    now(), now()
  );

  v_item_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "paymentRequestItems" (
    id, "paymentRequestId", "contractId", "lineType", "lineStatus",
    "lineLabel", "plannedPaymentDate", "requestedAmount", "createdAt", "updatedAt"
  ) VALUES (
    v_item_id, v_pr_id, v_contract.id, 'service_completion', 'pending',
    v_service."serviceName", v_due_date, v_service."totalAmount", now(), now()
  );
END;
$function$;

-- ---- Trigger: tasks AFTER UPDATE OF status — By Service: once every task
-- ---- flagged isPaymentTrigger for a case-service line is done, create
-- ---- (not merely activate) that service's Payment Request. Now a thin
-- ---- guard wrapper — the actual check-and-create logic is shared with the
-- ---- catch-up trigger below via by_service_check_and_create_payment_request.
CREATE OR REPLACE FUNCTION public.by_service_task_group_done_creates_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'done'
     AND OLD.status IS DISTINCT FROM 'done'
     AND NEW."isPaymentTrigger" IS TRUE
     AND NEW."projectServiceId" IS NOT NULL
  THEN
    PERFORM public.by_service_check_and_create_payment_request(NEW."projectServiceId");
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_service_task_group_done_creates_payment_request ON tasks;
CREATE TRIGGER trg_by_service_task_group_done_creates_payment_request
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.by_service_task_group_done_creates_payment_request();

-- ---- Trigger: projects AFTER UPDATE OF "contractId" — catch-up pass for
-- ---- tasks that were already marked done BEFORE this case had a contract
-- ---- linked (a real sequence in practice: work starts on a case, the
-- ---- contract is signed/linked afterward). Without this, those
-- ---- already-done tasks would never get re-evaluated, since the tasks
-- ---- trigger above only runs at the moment a task's own status changes.
CREATE OR REPLACE FUNCTION public.by_service_contract_linked_catches_up_done_tasks()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_service_id BIGINT;
BEGIN
  IF NEW."contractId" IS NULL OR OLD."contractId" IS NOT DISTINCT FROM NEW."contractId" THEN
    RETURN NEW;
  END IF;

  -- One pass per distinct service that has at least one isPaymentTrigger
  -- task in this case — by_service_check_and_create_payment_request itself
  -- re-verifies the whole group is done and no Payment Request exists yet,
  -- so this is safe to call even for services that aren't actually ready.
  FOR v_service_id IN
    SELECT DISTINCT "projectServiceId"
    FROM tasks
    WHERE "projectId" = NEW.id
      AND "isPaymentTrigger" = true
      AND "projectServiceId" IS NOT NULL
  LOOP
    PERFORM public.by_service_check_and_create_payment_request(v_service_id);
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_service_contract_linked_catches_up_done_tasks ON projects;
CREATE TRIGGER trg_by_service_contract_linked_catches_up_done_tasks
  AFTER UPDATE OF "contractId" ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.by_service_contract_linked_catches_up_done_tasks();

-- ---- Reused unchanged from by_case_payment_request_automation.sql, kept
-- ---- installed there — NOT redefined here:
--   by_case_task_done_activates_payment_request()  (tasks AFTER UPDATE OF status)
--   by_case_case_done_activates_payment_request()  (projects AFTER UPDATE OF status)
--   by_case_due_date_activates_payment_request()   (paymentRequests AFTER UPDATE OF "dueDate")
-- The due-date trigger is already generic over any paymentRequests row —
-- it activates a By Service request exactly the same way it activates a
-- By Case one, no change needed.
