-- ============================================================
-- Self-checking test for Finance P2 (pgsql/finance_billing_rules.sql and the
-- combo / retainer changes in unified_contract_payment_schedule.sql and
-- retainer_billing_run_due.sql). BEGIN ... ROLLBACK; prints
-- "ALL FINANCE BILLING RULES CHECKS PASSED". Ids 993000000000001+.
--   psql ... -f pgsql/tests/finance_billing_rules_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/finance_billing_rules_test.sql
-- ============================================================
BEGIN;

-- A By Service contract with Combo pricing and one case. Three items:
--   Alpha = services A (no trigger task) + B (one trigger task)
--   Gamma = services C + D (one trigger task each)
--   Delta = service E (one Done task, not yet a trigger)
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", "totalAmount", status, "createdAt")
VALUES (993000000000001, 'CMB-1', 'Combo test', 'byService', 'package', 1500, 'execution', now() - interval '1 day');
INSERT INTO projects (id, "contractId", status) VALUES (993000000000002, 993000000000001, 'in_progress');
INSERT INTO "projectServices" (id, "projectId", "serviceName", "totalAmount", "pricingMode") VALUES
  (993000000000011, 993000000000002, 'Service A', 0, 'package'),
  (993000000000012, 993000000000002, 'Service B', 0, 'package'),
  (993000000000013, 993000000000002, 'Service C', 0, 'package'),
  (993000000000014, 993000000000002, 'Service D', 0, 'package'),
  (993000000000015, 993000000000002, 'Service E', 0, 'package');
INSERT INTO "contractServices" (id, "contractId", "projectServiceId") VALUES
  (993000000000021, 993000000000001, 993000000000011),
  (993000000000022, 993000000000001, 993000000000012),
  (993000000000023, 993000000000001, 993000000000013),
  (993000000000024, 993000000000001, 993000000000014),
  (993000000000025, 993000000000001, 993000000000015);
INSERT INTO tasks (id, title, status, "projectId", "projectServiceId", "isPaymentTrigger") VALUES
  (993000000000031, 'A work', 'in_progress', 993000000000002, 993000000000011, false),
  (993000000000032, 'B trigger', 'in_progress', 993000000000002, 993000000000012, true),
  (993000000000033, 'C trigger', 'in_progress', 993000000000002, 993000000000013, true),
  (993000000000034, 'D trigger', 'in_progress', 993000000000002, 993000000000014, true),
  (993000000000035, 'E finished', 'done', 993000000000002, 993000000000015, false);

-- ---- combo: no pending request up front ----
DO $$
DECLARE n int;
BEGIN
  INSERT INTO "contractPaymentSchedules" (id, "contractId", "installmentNo", label, amount, "triggerType") VALUES
    (993000000000041, 993000000000001, 1, 'Combo Alpha', 900, 'on_task_done'),
    (993000000000042, 993000000000001, 2, 'Combo Gamma', 500, 'on_task_done'),
    (993000000000043, 993000000000001, 3, 'Combo Delta', 100, 'on_task_done');
  INSERT INTO "contractPaymentScheduleServices" (id, "contractPaymentScheduleId", "contractServiceId") VALUES
    (993000000000051, 993000000000041, 993000000000021),
    (993000000000052, 993000000000041, 993000000000022),
    (993000000000053, 993000000000042, 993000000000023),
    (993000000000054, 993000000000042, 993000000000024),
    (993000000000055, 993000000000043, 993000000000025);
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "contractId" = 993000000000001;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: By Service item rows create no request up front (got %)', n; END IF;
END $$;

-- ---- combo: created once every trigger task of every service is Done ----
DO $$
DECLARE r RECORD; n int;
BEGIN
  -- Alpha: its only trigger task (B) done -> request
  UPDATE tasks SET status = 'done' WHERE id = 993000000000032;
  SELECT * INTO r FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 993000000000041;
  IF r.id IS NULL THEN RAISE EXCEPTION 'FAIL: all trigger tasks of the combo done -> request'; END IF;
  IF r.title <> 'Combo Alpha - CMB-1' THEN RAISE EXCEPTION 'FAIL: combo request titled "{combo} - {contract}" (got %)', r.title; END IF;
  IF r.status <> 'active' OR r."requestedAmount" <> 900 OR r."dueDate" IS NULL THEN
    RAISE EXCEPTION 'FAIL: combo request active, item amount, due date (got %, %, %)', r.status, r."requestedAmount", r."dueDate";
  END IF;
  SELECT count(*) INTO n FROM "paymentRequestServices" WHERE "paymentRequestId" = r.id;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: combo request carries no service tags (keeps Task Management on checkboxes)'; END IF;

  -- Gamma: C done while D is still open -> nothing yet
  UPDATE tasks SET status = 'done' WHERE id = 993000000000033;
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 993000000000042;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: one service still open -> no combo request (got %)', n; END IF;
  UPDATE tasks SET status = 'done' WHERE id = 993000000000034;
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 993000000000042;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: last open service done -> combo request (got %)', n; END IF;

  -- Delta: a task ticked AFTER it is Done still completes the combo
  UPDATE tasks SET "isPaymentTrigger" = true WHERE id = 993000000000035;
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 993000000000043;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: ticking a Done task completes the combo (got %)', n; END IF;

  -- never a per-service request on a combo contract
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "projectServiceId" BETWEEN 993000000000011 AND 993000000000015;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: no per-service request for a combo contract (got %)', n; END IF;
END $$;

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

  -- a service inside a combo is billed with its combo
  blocked := NULL;
  BEGIN
    INSERT INTO "paymentRequests" (id, "requestType", "projectServiceId") VALUES (993000000000113, 'manual_unit', 993000000000011);
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM;
  END;
  IF blocked IS NULL OR blocked NOT LIKE '%combo%' THEN RAISE EXCEPTION 'FAIL: a combo service is billed with its combo (got %)', blocked; END IF;

  -- combo by hand (item with no trigger tasks)
  INSERT INTO "contractPaymentSchedules" (id, "contractId", "installmentNo", label, amount, "triggerType")
  VALUES (993000000000121, 993000000000001, 4, 'Combo Beta', 300, 'on_task_done');
  INSERT INTO "paymentRequests" (id, "requestType", "contractPaymentScheduleId") VALUES (993000000000122, 'manual_unit', 993000000000121);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 993000000000122;
  IF r.title <> 'Combo Beta - CMB-1' OR r."requestedAmount" <> 300 OR r.status <> 'active' THEN
    RAISE EXCEPTION 'FAIL: manual combo request (got %, %, %)', r.title, r."requestedAmount", r.status;
  END IF;
  blocked := NULL;
  BEGIN
    INSERT INTO "paymentRequests" (id, "requestType", "contractPaymentScheduleId") VALUES (993000000000123, 'manual_unit', 993000000000121);
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM;
  END;
  IF blocked IS NULL OR blocked NOT LIKE '%already has a payment request%' THEN RAISE EXCEPTION 'FAIL: combo billed once (got %)', blocked; END IF;

  -- settlement only on a terminated contract
  blocked := NULL;
  BEGIN
    INSERT INTO "paymentRequests" (id, "requestType", "contractId", "requestedAmount") VALUES (993000000000131, 'termination_settlement', 993000000000101, 100);
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM;
  END;
  IF blocked IS NULL OR blocked NOT LIKE '%terminated%' THEN RAISE EXCEPTION 'FAIL: settlement needs a terminated contract (got %)', blocked; END IF;
END $$;

-- ---- By Case installment by hand (its request was cancelled) ----
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status)
VALUES (993000000000141, 'BC-1', 'By case test', 'byCase', 1000, 'execution');
INSERT INTO "contractPaymentSchedules" (id, "contractId", "installmentNo", label, amount, "triggerType")
VALUES (993000000000142, 993000000000141, 2, 'Đợt 2', 500, 'on_task_done');
DO $$
DECLARE r RECORD; blocked text;
BEGIN
  UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = 'Re-issue by hand'
  WHERE "contractPaymentScheduleId" = 993000000000142 AND status IS DISTINCT FROM 'cancelled';
  INSERT INTO "paymentRequests" (id, "requestType", "contractPaymentScheduleId") VALUES (993000000000143, 'manual_unit', 993000000000142);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 993000000000143;
  IF r.title <> 'Đợt 2 - BC-1 - By case test' OR r."requestedAmount" <> 500 OR r.status <> 'active' OR r."contractId" <> 993000000000141 THEN
    RAISE EXCEPTION 'FAIL: manual By Case installment request (got %, %, %)', r.title, r."requestedAmount", r.status;
  END IF;
  blocked := NULL;
  BEGIN
    INSERT INTO "paymentRequests" (id, "requestType", "contractPaymentScheduleId") VALUES (993000000000144, 'manual_unit', 993000000000142);
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM;
  END;
  IF blocked IS NULL OR blocked NOT LIKE '%already has a payment request%' THEN RAISE EXCEPTION 'FAIL: installment billed once (got %)', blocked; END IF;
END $$;

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
  IF blocked IS NULL OR blocked NOT LIKE '%received%' THEN RAISE EXCEPTION 'FAIL: cancel refused while money was received (got %)', blocked; END IF;
  UPDATE payments SET "paymentStatus" = 'Cancelled' WHERE id = 993000000000203;

  UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = 'Client withdrew' WHERE id = 993000000000201;
  SELECT * INTO r FROM "paymentRequests" WHERE id = 993000000000201;
  IF r."cancelledAt" IS NULL THEN RAISE EXCEPTION 'FAIL: cancelledAt set'; END IF;

  blocked := NULL;
  BEGIN UPDATE "paymentRequests" SET status = 'active' WHERE id = 993000000000201;
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM; END;
  IF blocked IS NULL THEN RAISE EXCEPTION 'FAIL: a cancelled request is never reopened'; END IF;
END $$;

-- ---- retainer: bill now, stop / start, quarter unit ----
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status, "endDate")
VALUES (993000000000301, 'RT-1', 'Retainer test', 'retainer', 1000, 'execution', '2027-06-30');
INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles",
                                    "retainerCyclesBilled", "retainerUnit", "startDate", "nextBillingDate", "endDate")
VALUES (993000000000302, 993000000000301, 'retainer', 'active', 1000, 3, 0, 'month', finance_today() + 10, finance_today() + 10, '2027-06-30');
DO $$
DECLARE r RECORD; p RECORD; blocked text;
BEGIN
  -- bill now: cycle 1, anchored schedule
  INSERT INTO "paymentRequests" (id, "requestType", "billingPlanId") VALUES (993000000000311, 'bill_now', 993000000000302);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 993000000000311;
  SELECT * INTO p FROM "contractBillingPlans" WHERE id = 993000000000302;
  IF r."cycleNo" <> 1 OR r."requestedAmount" <> 1000 OR r.status <> 'active' OR r.title NOT LIKE '%Retainer period 1' THEN
    RAISE EXCEPTION 'FAIL: bill now = cycle 1 of 1000, the per-period fee (got %, %, %, %)', r."cycleNo", r."requestedAmount", r.status, r.title;
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

  -- stopped over two billing dates -> both skipped, end dates +2 months
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

  -- after a bill-now, the hourly run bills the NEXT cycle, never cycle 1 again
  UPDATE "contractBillingPlans" SET "nextBillingDate" = finance_today() - 1 WHERE id = 993000000000302;
  PERFORM * FROM retainer_billing_run_due();
  IF (SELECT count(*) FROM "paymentRequests" WHERE "billingPlanId" = 993000000000302 AND "cycleNo" = 1) <> 1
     OR (SELECT count(*) FROM "paymentRequests" WHERE "billingPlanId" = 993000000000302 AND "cycleNo" = 2) <> 1 THEN
    RAISE EXCEPTION 'FAIL: run after bill-now bills cycle 2 once, cycle 1 stays single';
  END IF;

  -- quarter = 3 months
  IF retainer_step('quarter') <> interval '3 months' THEN RAISE EXCEPTION 'FAIL: quarter unit is 3 months'; END IF;
END $$;

-- ---- termination: pending cancelled, active kept, plans completed ----
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status)
VALUES (993000000000401, 'TM-1', 'Termination test', 'byCase', 1000, 'execution');
DO $$
DECLARE r RECORD; blocked text;
BEGIN
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount") VALUES
    (993000000000411, 'Pending one', 'pending', 993000000000401, 300),
    (993000000000412, 'Active one', 'active', 993000000000401, 300);
  INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "startDate", "nextBillingDate")
  VALUES (993000000000413, 993000000000401, 'retainer', 'active', 100, finance_today() + 5, finance_today() + 5);

  UPDATE contracts SET status = 'terminated' WHERE id = 993000000000401;
  SELECT * INTO r FROM contracts WHERE id = 993000000000401;
  IF r."terminationDate" IS DISTINCT FROM finance_today() THEN RAISE EXCEPTION 'FAIL: terminationDate defaults to today (got %)', r."terminationDate"; END IF;
  IF (SELECT status FROM "paymentRequests" WHERE id = 993000000000411) <> 'cancelled' THEN RAISE EXCEPTION 'FAIL: pending request cancelled'; END IF;
  IF (SELECT "cancelReason" FROM "paymentRequests" WHERE id = 993000000000411) <> 'Contract terminated' THEN RAISE EXCEPTION 'FAIL: cancel reason recorded'; END IF;
  IF (SELECT status FROM "paymentRequests" WHERE id = 993000000000412) <> 'active' THEN RAISE EXCEPTION 'FAIL: active request kept'; END IF;
  IF (SELECT status FROM "contractBillingPlans" WHERE id = 993000000000413) <> 'completed' THEN RAISE EXCEPTION 'FAIL: retainer plan completed'; END IF;

  -- settlement within what is unbilled: 1000 - 300 active = 700
  INSERT INTO "paymentRequests" (id, "requestType", "contractId", "requestedAmount") VALUES (993000000000414, 'termination_settlement', 993000000000401, 500);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 993000000000414;
  IF r.status <> 'active' OR r.title <> 'Quyết toán chấm dứt - TM-1' THEN RAISE EXCEPTION 'FAIL: settlement created (got %, %)', r.status, r.title; END IF;
  blocked := NULL;
  BEGIN
    INSERT INTO "paymentRequests" (id, "requestType", "contractId", "requestedAmount") VALUES (993000000000415, 'termination_settlement', 993000000000401, 300);
  EXCEPTION WHEN raise_exception THEN blocked := SQLERRM;
  END;
  IF blocked IS NULL OR blocked NOT LIKE '%unbilled%' THEN RAISE EXCEPTION 'FAIL: settlement capped at what is unbilled (got %)', blocked; END IF;
END $$;

-- ---- (sections appended by later tasks go here) ----

DO $$ BEGIN RAISE NOTICE 'ALL FINANCE BILLING RULES CHECKS PASSED'; END $$;
ROLLBACK;
