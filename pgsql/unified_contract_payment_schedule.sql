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
  SELECT id, "contractCode", "contractName", "customerId", "internalCompanyId", "contractType"
  INTO v_contract
  FROM contracts
  WHERE id = NEW."contractId";

  IF v_contract.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 2026-09-28 (spec docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §3):
  -- a By Service combo / standalone item gets its request only once every
  -- trigger task of its services is Done (by_service_combo_item_check_and_create
  -- below) — no pending request now.
  IF v_contract."contractType" = 'byService' THEN
    RETURN NEW;
  END IF;
  -- 2026-09-29: a retainer's rows are its periods (pgsql/finance_retainer_schedule.sql);
  -- their requests come from the retainer run / Bill now, never from the row.
  IF v_contract."contractType" = 'retainer' THEN
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
  -- 2026-09-25: By Service + Combo pricing billing items (one row per combo
  -- / standalone service, ContractCreateForm.js) get NO default due date —
  -- by_case_activate_payment_request_if_ready sets it (+7 days) when the
  -- request activates, so it isn't already overdue by then.
  v_due_date := CASE
    WHEN v_contract."contractType" = 'byService' THEN NEW."dueDate"
    ELSE COALESCE(NEW."dueDate", now() + INTERVAL '7 days')
  END;
  v_initial_status := CASE WHEN v_condition_met AND v_due_date IS NOT NULL THEN 'active' ELSE 'pending' END;
  -- on_case_done (By Case "One time", created when a Case is linked — see
  -- by_case_one_time_ensure_payment_request below) says so explicitly: it
  -- stays pending until the Case is Done.
  v_request_note := CASE
    WHEN NEW."triggerType" = 'on_case_done' THEN
      'Yêu cầu thanh toán tự động khi Case hoàn thành — sẽ kích hoạt khi Case chuyển trạng thái Done (tạo ngày ' ||
      to_char(now(), 'DD/MM/YYYY') || ')'
    WHEN v_contract."contractType" = 'byService' THEN
      'Yêu cầu thanh toán tự động cho "' || COALESCE(NEW.label, '') ||
      '" — sẽ kích hoạt khi tất cả task trigger Done (tạo ngày ' || to_char(now(), 'DD/MM/YYYY') || ')'
    ELSE
      'Yêu cầu thanh toán tự động của đợt "' || COALESCE(NEW.label, '') ||
      '" từ ngày tạo ' || to_char(now(), 'DD/MM/YYYY')
  END;

  v_pr_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "paymentRequests" (
    id, title, status, "triggerType", "conditionMet", "installmentNo",
    "contractPaymentScheduleId", "contractId", "customerId", "internalCompanyId",
    "requestedAmount", "dueDate", currency, "requestType", priority, "requestNote", "sourceSnapshot",
    "createdAt", "updatedAt"
  ) VALUES (
    v_pr_id,
    CASE
      WHEN NEW."triggerType" = 'on_case_done' THEN 'Thanh toán khi Case hoàn thành - '
      WHEN v_contract."contractType" = 'byService' THEN COALESCE(NEW.label, 'Combo') || ' - '
      ELSE 'Đợt ' || COALESCE(NEW."installmentNo"::text, '') || ' - '
    END || COALESCE(v_contract."contractCode", '') || ' - ' || COALESCE(v_contract."contractName", ''),
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

-- ---- Trigger: contractPaymentScheduleServices AFTER INSERT — copy a
-- ---- service tag onto the Payment Request its installment already created.
-- 2026-09-24 root-cause fix. The copy loop in
-- by_case_schedule_row_creates_payment_request() above can never see a
-- tag written by the UI: ContractCreateForm.js must create the
-- contractPaymentSchedules row FIRST (the junction row needs its id), and
-- that insert fires the trigger above — creating the Payment Request —
-- before any contractPaymentScheduleServices row exists. The tags arrive in
-- separate, later requests, so every UI-created By Case Payment Request
-- ended up with zero paymentRequestServices rows and, since §6m, was
-- invisible to every task's installment picker ("No payment installment
-- matches this task's service"). Copying at tag-insert time makes the
-- result independent of write order. NOT EXISTS keeps it idempotent with
-- the loop above and with pgsql/backfill_payment_request_services.sql.
CREATE OR REPLACE FUNCTION public.by_case_schedule_tag_copies_to_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."contractPaymentScheduleId" IS NULL OR NEW."contractServiceId" IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO "paymentRequestServices" (
    id, "paymentRequestId", "contractServiceId", "createdAt", "updatedAt"
  )
  SELECT
    (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000
      + (random() * 999)::INT
      + ROW_NUMBER() OVER (),
    pr.id,
    NEW."contractServiceId",
    now(),
    now()
  FROM "paymentRequests" pr
  WHERE pr."contractPaymentScheduleId" = NEW."contractPaymentScheduleId"
    AND NOT EXISTS (
      SELECT 1 FROM "paymentRequestServices" prs
      WHERE prs."paymentRequestId" = pr.id
        AND prs."contractServiceId" = NEW."contractServiceId"
    );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_case_schedule_tag_copies_to_payment_request ON "contractPaymentScheduleServices";
CREATE TRIGGER trg_by_case_schedule_tag_copies_to_payment_request
  AFTER INSERT ON "contractPaymentScheduleServices"
  FOR EACH ROW
  EXECUTE FUNCTION public.by_case_schedule_tag_copies_to_payment_request();

-- ---- By Case "One time": create its Payment Request when a Case is linked
-- 2026-09-24 (user decision). Replaces the dropped legacy lump-sum trigger
-- trg_case_done_payment_request (contract_payment_status_workflow.sql).
-- A One time contract (byCase, billingCycle not 'multiple_payments') has no
-- Payment Schedule in the UI. As soon as a Case is linked to it — Case
-- created from/with the contract, or the contract linked to an existing Case
-- (contracts:create's own `cases` hasMany does this) — insert ONE 100%
-- on_case_done contractPaymentSchedules row; the AFTER INSERT trigger above
-- turns it into a pending Payment Request ("Thanh toán khi Case hoàn thành"),
-- and by_case_case_done_activates_payment_request
-- (by_case_payment_request_automation.sql) activates it when the Case is Done.
-- Once per contract: skipped if the contract already has any schedule row or
-- any Payment Request (e.g. an old lump-sum "Auto: Case hoàn thành" one).
-- If the Case is already Done when linked, the request is activated at once.
-- Depends on contract_resolved_total() (contract_payment_status_workflow.sql).
CREATE OR REPLACE FUNCTION public.by_case_one_time_ensure_payment_request(
  p_contract_id BIGINT,
  p_case_status TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_contract RECORD;
  v_amount NUMERIC;
  v_schedule_id BIGINT;
BEGIN
  SELECT id, "contractType", "billingCycle", "paymentDate", "paymentStatus"
  INTO v_contract
  FROM contracts
  WHERE id = p_contract_id;

  IF v_contract.id IS NULL
     OR v_contract."contractType" IS DISTINCT FROM 'byCase'
     OR COALESCE(v_contract."billingCycle", 'one_time') = 'multiple_payments'
     OR v_contract."paymentStatus" = 'paid'
  THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM "contractPaymentSchedules" WHERE "contractId" = p_contract_id)
     OR EXISTS (
       SELECT 1 FROM "paymentRequests"
       WHERE "contractId" = p_contract_id AND status IS DISTINCT FROM 'cancelled'
     )
  THEN
    RETURN;
  END IF;

  v_amount := contract_resolved_total(p_contract_id);
  IF COALESCE(v_amount, 0) <= 0 THEN
    RETURN;
  END IF;

  v_schedule_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "contractPaymentSchedules" (
    id, "contractId", "installmentNo", label, percentage, amount,
    "triggerType", "dueDate", "createdAt", "updatedAt"
  ) VALUES (
    v_schedule_id, p_contract_id, 1, 'Thanh toán khi Case hoàn thành', 100, v_amount,
    'on_case_done', v_contract."paymentDate", now(), now()
  );

  -- trg_by_case_schedule_row_creates_payment_request has just created the
  -- pending request; a Case that is already Done activates it right away.
  IF p_case_status = 'done' THEN
    UPDATE "paymentRequests"
    SET "conditionMet" = true,
        status = CASE WHEN "dueDate" IS NOT NULL THEN 'active' ELSE 'pending' END,
        "updatedAt" = now()
    WHERE "contractPaymentScheduleId" = v_schedule_id
      AND status = 'pending';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.by_case_one_time_case_linked_creates_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."contractId" IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."contractId" IS NOT DISTINCT FROM NEW."contractId" THEN
    RETURN NEW;
  END IF;

  PERFORM public.by_case_one_time_ensure_payment_request(NEW."contractId", NEW.status);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_by_case_one_time_case_linked_creates_payment_request ON projects;
CREATE TRIGGER trg_by_case_one_time_case_linked_creates_payment_request
  AFTER INSERT OR UPDATE OF "contractId" ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.by_case_one_time_case_linked_creates_payment_request();

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
-- ---- By Service + Combo pricing: this service's share of the contract total
-- 2026-09-25 (user decision: split the package price per service). In
-- "Combo pricing" the WHOLE contract is one package: every service line —
-- combo or not — is stored with totalAmount 0 and pricingMode 'package',
-- and packageTotalAmount is not a reliable per-group figure (usually the
-- contract total, sometimes an ad-hoc combo's own amount — confirmed on real
-- rows, e.g. CT29092026 / CT05092026). So the pool is the signed contract
-- total (contract_resolved_total), split across every package-mode service
-- of the Case: pro-rata by catalog price (services.basePrice) when every one
-- of them has one, otherwise equally. Rounded to whole units; the last line
-- (by id) takes the rounding remainder so the shares sum to the contract
-- total. Returns 0 when there is nothing to split.
-- Depends on contract_resolved_total() (contract_payment_status_workflow.sql).
CREATE OR REPLACE FUNCTION public.by_service_package_allocated_amount(p_project_service_id BIGINT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_project_id BIGINT;
  v_contract_id BIGINT;
  v_pool NUMERIC;
  v_count INT;
  v_weight_sum NUMERIC;
  v_all_weighted BOOLEAN;
  v_row RECORD;
  v_allocated NUMERIC := 0;
  v_share NUMERIC;
  v_index INT := 0;
BEGIN
  SELECT ps."projectId", p."contractId"
  INTO v_project_id, v_contract_id
  FROM "projectServices" ps
  JOIN projects p ON p.id = ps."projectId"
  WHERE ps.id = p_project_service_id;

  IF v_contract_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Legacy fallback only: once any service of this Case has a locked amount
  -- (Contract form, 2026-09-25), the contract total has already been split
  -- by hand — auto-splitting it again for another line (e.g. a service added
  -- to the Case later) would bill more than the contract.
  IF EXISTS (
    SELECT 1 FROM "projectServices" ps
    WHERE ps."projectId" = v_project_id
      AND NULLIF(to_jsonb(ps)->>'paymentAllocatedAmount', '') IS NOT NULL
  ) THEN
    RETURN 0;
  END IF;

  v_pool := COALESCE(contract_resolved_total(v_contract_id), 0);
  IF v_pool <= 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*),
         COALESCE(SUM(COALESCE(s."basePrice", 0)), 0),
         BOOL_AND(COALESCE(s."basePrice", 0) > 0)
  INTO v_count, v_weight_sum, v_all_weighted
  FROM "projectServices" ps
  LEFT JOIN services s ON s.id = ps."serviceId"
  WHERE ps."projectId" = v_project_id
    AND ps."pricingMode" = 'package'
    AND COALESCE(ps."totalAmount", 0) = 0;

  IF COALESCE(v_count, 0) = 0 THEN
    RETURN 0;
  END IF;

  FOR v_row IN
    SELECT ps.id, COALESCE(s."basePrice", 0) AS weight
    FROM "projectServices" ps
    LEFT JOIN services s ON s.id = ps."serviceId"
    WHERE ps."projectId" = v_project_id
      AND ps."pricingMode" = 'package'
      AND COALESCE(ps."totalAmount", 0) = 0
    ORDER BY ps.id
  LOOP
    v_index := v_index + 1;
    IF v_index = v_count THEN
      v_share := v_pool - v_allocated;
    ELSIF v_all_weighted AND v_weight_sum > 0 THEN
      v_share := ROUND(v_pool * v_row.weight / v_weight_sum);
    ELSE
      v_share := ROUND(v_pool / v_count);
    END IF;
    v_allocated := v_allocated + v_share;
    IF v_row.id = p_project_service_id THEN
      RETURN v_share;
    END IF;
  END LOOP;

  RETURN 0;
END;
$function$;

-- ---- What a case service is billed for (2026-09-25 priority, shared by the
-- ---- automatic path below and manual requests — pgsql/finance_billing_rules.sql):
--   1. paymentAllocatedAmount (locked in the Contract form; read via to_jsonb so
--      an instance without the field registered keeps working) — final, even 0;
--   2. the line's own totalAmount (Line pricing);
--   3. Combo pricing without a locked amount (older contracts): its share of
--      the contract total (by_service_package_allocated_amount).
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
    amount := v_locked;
    source := 'locked';
  ELSIF COALESCE(v_line, 0) > 0 THEN
    amount := v_line;
    source := 'line';
  ELSIF v_mode = 'package' THEN
    amount := public.by_service_package_allocated_amount(p_project_service_id);
    source := 'package_auto';
  ELSE
    amount := 0;
    source := NULL;
  END IF;
  RETURN NEXT;
END;
$function$;

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
  v_amount NUMERIC;
  v_amount_source TEXT;
BEGIN
  IF p_project_service_id IS NULL THEN
    RETURN;
  END IF;

  -- 2026-09-28 (spec §3): a service inside a By Service combo / item is billed
  -- with its item, never on its own — checked FIRST, because unticking the
  -- last open trigger task of one service can complete the whole combo while
  -- that service itself has no trigger task left (the guards below would
  -- return before ever looking at the combo).
  IF public.by_service_combo_check_for_service(p_project_service_id) THEN
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
  -- 2026-09-28: a cancelled request no longer counts (spec §7.1) — the unit
  -- can be billed again; ux_payment_requests_project_service_open enforces it.
  IF EXISTS (
    SELECT 1 FROM "paymentRequests"
    WHERE "projectServiceId" = p_project_service_id AND status IS DISTINCT FROM 'cancelled'
  ) THEN
    RETURN;
  END IF;

  SELECT id, "projectId", "serviceName", "totalAmount", "pricingMode"
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

  SELECT id, "contractCode", "contractName", "customerId", "internalCompanyId", "pricingMode", "createdAt", status
  INTO v_contract
  FROM contracts
  WHERE id = v_project."contractId";

  IF v_contract.id IS NULL THEN
    RETURN;
  END IF;

  -- 2026-09-28: nothing is billed automatically on a terminated contract (spec §7.5)
  IF v_contract.status = 'terminated' THEN
    RETURN;
  END IF;

  -- 2026-09-25: a Combo pricing contract bills per item (a contractPaymentSchedules
  -- row per combo / standalone service, ContractCreateForm.js), never per
  -- service here — since 2026-09-28 the item's request is created on trigger
  -- by by_service_combo_check_for_service (called at the top). Still skipped
  -- here: a Combo pricing contract with item rows whose service is in none of
  -- them ("Not billed"), and one created moments ago — contracts:create links
  -- the Case, firing the catch-up pass that calls this, BEFORE the form writes
  -- the item rows. Older Combo pricing contracts (created before per-item
  -- billing, no rows) keep the per-service path via by_service_package_allocated_amount.
  IF v_contract."pricingMode" = 'package'
     AND (
       EXISTS (SELECT 1 FROM "contractPaymentSchedules" WHERE "contractId" = v_contract.id)
       OR v_contract."createdAt" > now() - INTERVAL '10 minutes'
     )
  THEN
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

  -- 2026-09-25: amount priority —
  --   1. paymentAllocatedAmount: locked (and possibly hand-edited) in the
  --      Contract form's Payment Triggers popup, copied to projectServices
  --      (docs/superpowers/specs/2026-09-25-by-service-package-allocation-ui-design.md).
  --      Read through to_jsonb so this keeps working on an instance where
  --      the field isn't registered yet (a missing column must never break
  --      task status updates, which fire this).
  --   2. the line's own totalAmount (Line pricing);
  --   3. Combo pricing without a locked amount (older contracts): its share
  --      of the contract total (by_service_package_allocated_amount).
  -- Never create a 0 request.
  -- A locked amount is FINAL, including 0 (e.g. a line with no price
  -- reference left at 0): never fall through to the auto-split for it —
  -- the auto-split divides the WHOLE contract total again and would bill
  -- more than the contract (2026-09-25 review fix).
  -- (2026-09-28: the priority lives in by_service_service_amount, shared with
  -- manual requests — pgsql/finance_billing_rules.sql.)
  SELECT a.amount, a.source INTO v_amount, v_amount_source
  FROM public.by_service_service_amount(v_service.id) a;
  IF COALESCE(v_amount, 0) <= 0 THEN
    RETURN;
  END IF;

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
    v_amount, v_due_date, 'VND', 'create_payment', 'high', v_request_note,
    jsonb_build_object(
      'serviceName', v_service."serviceName",
      'totalAmount', v_amount,
      'lineTotalAmount', v_service."totalAmount",
      'amountSource', v_amount_source,
      'dueDate', v_due_date
    ),
    now(), now()
  );

  v_item_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "paymentRequestItems" (
    id, "paymentRequestId", "contractId", "lineType", "lineStatus",
    "lineLabel", "plannedPaymentDate", "requestedAmount", "createdAt", "updatedAt"
  ) VALUES (
    v_item_id, v_pr_id, v_contract.id, 'service_completion', 'pending',
    v_service."serviceName", v_due_date, v_amount, now(), now()
  );
END;
$function$;

-- ---- By Service combo / standalone item: create its request once every
-- ---- trigger task of every service behind it is Done (2026-09-28, spec §3).
-- Services come from contractPaymentScheduleServices -> contractServices
-- .projectServiceId. Idempotent (an open request exists -> nothing; the P1
-- index ux_payment_requests_schedule_open, pgsql/finance_foundation.sql,
-- backs it). Deliberately NO paymentRequestServices rows: Task Management
-- switches a service to the installment picker when a request is tagged with
-- it; untagged, the combo's tasks keep the isPaymentTrigger checkbox that
-- drives this. Items created before 2026-09-28 already have a pending
-- request (tasks linked to it) and are skipped by the first check.
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

-- TRUE when the case service belongs to at least one By Service item (it is
-- then billed with that item, never on its own); checks each such item.
CREATE OR REPLACE FUNCTION public.by_service_combo_check_for_service(p_project_service_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $function$
DECLARE
  v_schedule_id BIGINT;
  v_found BOOLEAN := false;
BEGIN
  FOR v_schedule_id IN
    SELECT DISTINCT cpss."contractPaymentScheduleId"
    FROM "contractPaymentScheduleServices" cpss
    JOIN "contractServices" cs ON cs.id = cpss."contractServiceId"
    JOIN "contractPaymentSchedules" cps ON cps.id = cpss."contractPaymentScheduleId"
    JOIN contracts c ON c.id = cps."contractId"
    WHERE cs."projectServiceId" = p_project_service_id
      AND c."contractType" = 'byService'
  LOOP
    v_found := true;
    PERFORM public.by_service_combo_item_check_and_create(v_schedule_id);
  END LOOP;
  RETURN v_found;
END;
$function$;

-- ---- Trigger: tasks AFTER UPDATE OF status / "isPaymentTrigger" /
-- ---- "projectServiceId" — By Service: once every task flagged
-- ---- isPaymentTrigger for a case-service line (or, for a combo, for all the
-- ---- item's services) is done, create that service's / item's Payment
-- ---- Request. A thin guard wrapper — the check-and-create logic is shared
-- ---- with the catch-up trigger below via by_service_check_and_create_payment_request.
-- 2026-09-28: also re-checks when a task is ticked / unticked as a trigger or
-- moved to another service — a task ticked after it was already Done (the
-- Contract form ticks combo tasks of an existing Case) must still complete
-- its service / combo; the check re-verifies the whole group, so extra calls
-- are harmless.
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
