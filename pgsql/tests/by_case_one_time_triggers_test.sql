-- ============================================================
-- Self-checking test: By Case "One time" payment activated by several
-- trigger tasks (2026-09-29). Run AFTER deploying
-- pgsql/by_case_payment_request_automation.sql:
--   psql ... -f pgsql/tests/by_case_one_time_triggers_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/by_case_one_time_triggers_test.sql
-- BEGIN ... ROLLBACK; prints "ALL ONE-TIME TRIGGER CHECKS PASSED". Ids 997000000000001+.
-- ============================================================
BEGIN;

INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "billingCycle", "totalAmount", status)
VALUES (997000000000001, 'OT-1', 'One time test', 'byCase', 'one_time', 1000, 'execution');
-- linking the Case creates the one-time payment (pending, waits for the Case)
INSERT INTO projects (id, "contractId", status) VALUES (997000000000011, 997000000000001, 'in_progress');
INSERT INTO tasks (id, title, status, "projectId") VALUES
  (997000000000021, 'Task A', 'in_progress', 997000000000011),
  (997000000000022, 'Task B', 'in_progress', 997000000000011);

DO $$
DECLARE pr RECORD; row_type text;
BEGIN
  SELECT * INTO pr FROM "paymentRequests" WHERE "contractId" = 997000000000001;
  IF pr.id IS NULL OR pr.status <> 'pending' OR pr."triggerType" <> 'on_case_done' THEN
    RAISE EXCEPTION 'FAIL: one-time payment waits for the Case (got %, %)', pr.status, pr."triggerType";
  END IF;

  -- two trigger tasks: the payment now waits for both, not for the Case
  UPDATE tasks SET "paymentRequestId" = pr.id WHERE id IN (997000000000021, 997000000000022);
  SELECT * INTO pr FROM "paymentRequests" WHERE id = pr.id;
  SELECT "triggerType" INTO row_type FROM "contractPaymentSchedules" WHERE id = pr."contractPaymentScheduleId";
  IF pr."triggerType" <> 'on_task_done' OR row_type <> 'on_task_done' THEN
    RAISE EXCEPTION 'FAIL: with trigger tasks the one-time payment follows them (got %, %)', pr."triggerType", row_type;
  END IF;

  UPDATE projects SET status = 'done' WHERE id = 997000000000011;
  IF (SELECT status FROM "paymentRequests" WHERE id = pr.id) <> 'pending' THEN
    RAISE EXCEPTION 'FAIL: the Case done does not activate a payment driven by tasks';
  END IF;
  UPDATE tasks SET status = 'done' WHERE id = 997000000000021;
  IF (SELECT status FROM "paymentRequests" WHERE id = pr.id) <> 'pending' THEN
    RAISE EXCEPTION 'FAIL: one task of two done -> still pending';
  END IF;
  UPDATE tasks SET status = 'done' WHERE id = 997000000000022;
  IF (SELECT status FROM "paymentRequests" WHERE id = pr.id) <> 'active' THEN
    RAISE EXCEPTION 'FAIL: all trigger tasks done -> active';
  END IF;
END $$;

-- all trigger tasks removed again: the payment waits for the Case once more
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "billingCycle", "totalAmount", status)
VALUES (997000000000002, 'OT-2', 'One time back', 'byCase', 'one_time', 500, 'execution');
INSERT INTO projects (id, "contractId", status) VALUES (997000000000012, 997000000000002, 'in_progress');
INSERT INTO tasks (id, title, status, "projectId") VALUES (997000000000023, 'Task C', 'in_progress', 997000000000012);
DO $$
DECLARE pr RECORD;
BEGIN
  SELECT * INTO pr FROM "paymentRequests" WHERE "contractId" = 997000000000002;
  UPDATE tasks SET "paymentRequestId" = pr.id WHERE id = 997000000000023;
  UPDATE tasks SET "paymentRequestId" = NULL WHERE id = 997000000000023;
  IF (SELECT "triggerType" FROM "paymentRequests" WHERE id = pr.id) <> 'on_case_done' THEN
    RAISE EXCEPTION 'FAIL: no trigger task left -> waits for the Case again';
  END IF;
  UPDATE projects SET status = 'done' WHERE id = 997000000000012;
  IF (SELECT status FROM "paymentRequests" WHERE id = pr.id) <> 'active' THEN
    RAISE EXCEPTION 'FAIL: then the Case done activates it';
  END IF;
END $$;

-- a Multiple payments installment keeps its own trigger type
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "billingCycle", "totalAmount", status)
VALUES (997000000000003, 'OT-3', 'Installments', 'byCase', 'multiple_payments', 1000, 'execution');
INSERT INTO "contractPaymentSchedules" (id, "contractId", "installmentNo", label, percentage, amount, "triggerType")
VALUES (997000000000031, 997000000000003, 1, 'Đợt 1', 100, 1000, 'on_case_done');
INSERT INTO projects (id, "contractId", status) VALUES (997000000000013, 997000000000003, 'in_progress');
INSERT INTO tasks (id, title, status, "projectId") VALUES (997000000000024, 'Task D', 'in_progress', 997000000000013);
DO $$
DECLARE pr RECORD;
BEGIN
  SELECT * INTO pr FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 997000000000031;
  UPDATE tasks SET "paymentRequestId" = pr.id WHERE id = 997000000000024;
  IF (SELECT "triggerType" FROM "paymentRequests" WHERE id = pr.id) <> 'on_case_done' THEN
    RAISE EXCEPTION 'FAIL: only a One time payment switches to its tasks';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL ONE-TIME TRIGGER CHECKS PASSED'; END $$;
ROLLBACK;
