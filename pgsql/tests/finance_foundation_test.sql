-- ============================================================
-- Self-checking test for pgsql/finance_foundation.sql (+ the payment SQL it
-- changes). Run AFTER deploying:  psql ... -f pgsql/tests/finance_foundation_test.sql
-- Locally: bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql
-- Everything runs inside BEGIN ... ROLLBACK — nothing is left behind.
-- Each check RAISEs "FAIL: ..." on a wrong result; the last line prints
-- "ALL FINANCE FOUNDATION CHECKS PASSED". Test rows use ids 991000000000001+.
-- ============================================================
BEGIN;

-- Finance P2 requires a reason to cancel; the column exists once
-- pgsql/finance_billing_rules.sql is deployed. Added here too (rolled back
-- with everything else) so this test runs before and after P2.
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "cancelReason" text;

INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount")
VALUES (991000000000001, 'FIN-TEST', 'Finance foundation test', 'byCase', 1000);

-- ---- contract outstanding: Received only, VND, insert/update/delete ----
DO $$
DECLARE v double precision;
BEGIN
  INSERT INTO payments (id, amount, "paymentStatus", "contractId") VALUES (991000000000101, 400, 'Received', 991000000000001);
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 991000000000001;
  IF v <> 600 THEN RAISE EXCEPTION 'FAIL: outstanding after 400 received should be 600, got %', v; END IF;

  UPDATE payments SET amount = 700 WHERE id = 991000000000101;
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 991000000000001;
  IF v <> 300 THEN RAISE EXCEPTION 'FAIL: editing the amount must recompute (want 300, got %)', v; END IF;

  INSERT INTO payments (id, amount, "paymentStatus", "contractId") VALUES (991000000000102, 100, 'Partial', 991000000000001);
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 991000000000001;
  IF v <> 300 THEN RAISE EXCEPTION 'FAIL: only Received counts (want 300, got %)', v; END IF;

  -- foreign-currency payment: only where payments."exchangeRateToBase" exists
  -- (pgsql/multi_currency_migration.sql); without the column every payment is VND
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'exchangeRateToBase'
  ) THEN
    EXECUTE $sql$INSERT INTO payments (id, amount, "paymentStatus", "contractId", "exchangeRateToBase")
                 VALUES (991000000000103, 0.01, 'received', 991000000000001, 10000)$sql$;
  ELSE
    INSERT INTO payments (id, amount, "paymentStatus", "contractId") VALUES (991000000000103, 100, 'received', 991000000000001);
  END IF;
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 991000000000001;
  IF v <> 200 THEN RAISE EXCEPTION 'FAIL: foreign payment counts in VND (want 200, got %)', v; END IF;

  DELETE FROM payments WHERE id IN (991000000000101, 991000000000103);
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 991000000000001;
  IF v <> 1000 THEN RAISE EXCEPTION 'FAIL: deleting payments must recompute (want 1000, got %)', v; END IF;
  DELETE FROM payments WHERE id = 991000000000102;
END $$;

-- ---- request derive: outstanding + overdue ----
DO $$
DECLARE r RECORD;
BEGIN
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount", "dueDate")
  VALUES (991000000000201, 'PR overdue', 'active', 991000000000001, 1000, now() - interval '3 days');
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000201;
  IF r."outstandingAmount" <> 1000 OR r."paidAmount" <> 0 THEN RAISE EXCEPTION 'FAIL: new request outstanding = requested (got %/%)', r."outstandingAmount", r."paidAmount"; END IF;
  IF r."overdueSince" IS DISTINCT FROM (finance_local_date(r."dueDate") + 1) THEN RAISE EXCEPTION 'FAIL: overdueSince = due + 1 (got %)', r."overdueSince"; END IF;

  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount", "dueDate")
  VALUES (991000000000202, 'PR pending past due', 'pending', 991000000000001, 500, now() - interval '3 days');
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000202;
  IF r."overdueSince" IS NOT NULL THEN RAISE EXCEPTION 'FAIL: a pending request is never overdue'; END IF;
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount", "dueDate")
  VALUES (991000000000203, 'PR to cancel', 'active', 991000000000001, 500, now() - interval '3 days');
  UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = 'test' WHERE id = 991000000000203;
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000203;
  IF r."overdueSince" IS NOT NULL THEN RAISE EXCEPTION 'FAIL: a cancelled request is never overdue'; END IF;
END $$;

-- ---- roll-up: payments -> request / invoice, both link directions ----
DO $$
DECLARE r RECORD; i RECORD;
BEGIN
  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "paymentRequestId")
  VALUES (991000000000211, 400, 'Received', 991000000000001, 991000000000201);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000201;
  IF r."paidAmount" <> 400 OR r."outstandingAmount" <> 600 THEN RAISE EXCEPTION 'FAIL: request paid 400 / outstanding 600 (got %/%)', r."paidAmount", r."outstandingAmount"; END IF;

  -- invoice with no deadline inherits the request's due date -> overdue
  INSERT INTO invoices (id, "invoiceNumber", status, "totalAmount", "paymentRequestId", "contractId")
  VALUES (991000000000221, 'INV-TEST-1', 'pending', 1000, 991000000000201, 991000000000001);
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF i."amountPaid" <> 400 THEN RAISE EXCEPTION 'FAIL: the request''s payment counts on its single invoice (got %)', i."amountPaid"; END IF;
  IF i.status <> 'overdue' THEN RAISE EXCEPTION 'FAIL: invoice past its request due date is overdue (got %)', i.status; END IF;

  -- a payment made against the invoice only counts for the request too
  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "invoiceId")
  VALUES (991000000000212, 600, 'Received', 991000000000001, 991000000000221);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000201;
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF r."paidAmount" <> 1000 OR r."overdueSince" IS NOT NULL THEN RAISE EXCEPTION 'FAIL: request fully paid via invoice payment, not overdue (got %, %)', r."paidAmount", r."overdueSince"; END IF;
  IF i.status <> 'paid' OR i."outStandingAmount" <> 0 THEN RAISE EXCEPTION 'FAIL: invoice paid (got %, %)', i.status, i."outStandingAmount"; END IF;

  -- overpayment never goes negative
  UPDATE payments SET amount = 900 WHERE id = 991000000000212;
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000201;
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF r."outstandingAmount" <> 0 OR i."outStandingAmount" <> 0 OR i.status <> 'paid' THEN RAISE EXCEPTION 'FAIL: overpayment keeps outstanding at 0 (got %, %, %)', r."outstandingAmount", i."outStandingAmount", i.status; END IF;

  -- cancelling a payment takes it out; partial invoice
  UPDATE payments SET "paymentStatus" = 'Cancelled' WHERE id = 991000000000212;
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF i."amountPaid" <> 400 THEN RAISE EXCEPTION 'FAIL: cancelled payment does not count (got %)', i."amountPaid"; END IF;
  UPDATE invoices SET deadline = now() + interval '5 days' WHERE id = 991000000000221;
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF i.status <> 'partial' OR i."overdueSince" IS NOT NULL THEN RAISE EXCEPTION 'FAIL: own deadline in the future -> partial (got %, %)', i.status, i."overdueSince"; END IF;

  -- deleting the payment recomputes
  DELETE FROM payments WHERE id = 991000000000211;
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF i."amountPaid" <> 0 OR i.status <> 'pending' THEN RAISE EXCEPTION 'FAIL: after delete -> pending, 0 paid (got %, %)', i.status, i."amountPaid"; END IF;

  -- draft and cancelled stay as set by hand
  UPDATE invoices SET status = 'draft' WHERE id = 991000000000221;
  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "invoiceId")
  VALUES (991000000000213, 1000, 'Received', 991000000000001, 991000000000221);
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF i.status <> 'draft' OR i."amountPaid" <> 1000 THEN RAISE EXCEPTION 'FAIL: draft keeps its status but tracks money (got %, %)', i.status, i."amountPaid"; END IF;
  DELETE FROM payments WHERE id IN (991000000000212, 991000000000213);
END $$;

-- ---- one open request per unit; cancelled ones don't count ----
DO $$
DECLARE blocked boolean;
BEGIN
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "contractPaymentScheduleId", "requestedAmount")
  VALUES (991000000000301, 'Unit A #1', 'active', 991000000000001, 991000000000900, 100);
  blocked := false;
  BEGIN
    INSERT INTO "paymentRequests" (id, title, status, "contractId", "contractPaymentScheduleId", "requestedAmount")
    VALUES (991000000000302, 'Unit A #2', 'pending', 991000000000001, 991000000000900, 100);
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: a second open request for one schedule row must be blocked'; END IF;

  UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = 'test' WHERE id = 991000000000301;
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "contractPaymentScheduleId", "requestedAmount")
  VALUES (991000000000303, 'Unit A #3', 'active', 991000000000001, 991000000000900, 100);

  INSERT INTO "paymentRequests" (id, title, status, "contractId", "projectServiceId", "requestedAmount")
  VALUES (991000000000304, 'Service #1', 'active', 991000000000001, 991000000000901, 100);
  blocked := false;
  BEGIN
    INSERT INTO "paymentRequests" (id, title, status, "contractId", "projectServiceId", "requestedAmount")
    VALUES (991000000000305, 'Service #2', 'active', 991000000000001, 991000000000901, 100);
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: a second open request for one case service must be blocked'; END IF;
END $$;

-- ---- By Service: a cancelled request lets the trigger create a new one ----
DO $$
DECLARE n int;
BEGIN
  INSERT INTO projects (id, "contractId", status) VALUES (991000000000401, 991000000000001, 'in_progress');
  UPDATE contracts SET "contractType" = 'byService' WHERE id = 991000000000001;
  INSERT INTO "projectServices" (id, "projectId", "serviceName", "totalAmount", "pricingMode")
  VALUES (991000000000402, 991000000000401, 'Test service', 300, 'line');
  INSERT INTO tasks (id, title, status, "projectId", "projectServiceId", "isPaymentTrigger")
  VALUES (991000000000403, 'Trigger task', 'in_progress', 991000000000401, 991000000000402, true);
  UPDATE tasks SET status = 'done' WHERE id = 991000000000403;
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "projectServiceId" = 991000000000402;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: done trigger task creates the service request (got %)', n; END IF;

  UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = 'test' WHERE "projectServiceId" = 991000000000402;
  UPDATE tasks SET status = 'in_progress' WHERE id = 991000000000403;
  UPDATE tasks SET status = 'done' WHERE id = 991000000000403;
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "projectServiceId" = 991000000000402 AND status <> 'cancelled';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: after cancelling, the trigger creates a new request (got %)', n; END IF;
  UPDATE contracts SET "contractType" = 'byCase' WHERE id = 991000000000001;
END $$;

-- ---- Retainer run: active, due in 7 days, plan + cycle recorded ----
DO $$
DECLARE r RECORD; n int;
BEGIN
  INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles",
                                      "retainerCyclesBilled", "retainerUnit", "startDate", "nextBillingDate")
  VALUES (991000000000501, 991000000000001, 'retainer', 'active', 900, 3, 0, 'month', finance_today() - 1, finance_today() - 1);
  PERFORM * FROM retainer_billing_run_due();
  SELECT * INTO r FROM "paymentRequests" WHERE "billingPlanId" = 991000000000501 AND "cycleNo" = 1;
  IF r.id IS NULL THEN RAISE EXCEPTION 'FAIL: retainer request carries billingPlanId + cycleNo'; END IF;
  IF r.status <> 'active' OR r."dueDate" IS NULL THEN RAISE EXCEPTION 'FAIL: retainer request is active with a due date (got %, %)', r.status, r."dueDate"; END IF;

  -- a request already existing for the cycle is skipped, the plan still advances
  UPDATE "contractBillingPlans" SET "retainerCyclesBilled" = 0, "nextBillingDate" = finance_today() - 1 WHERE id = 991000000000501;
  PERFORM * FROM retainer_billing_run_due();
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "billingPlanId" = 991000000000501 AND "cycleNo" = 1;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: no second request for the same cycle (got %)', n; END IF;
  SELECT "retainerCyclesBilled" INTO n FROM "contractBillingPlans" WHERE id = 991000000000501;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: the plan still advances past a cycle that already had a request (got %)', n; END IF;
END $$;

-- ---- overdue refresh: rows whose due date passed silently ----
DO $$
DECLARE r RECORD; c RECORD;
BEGIN
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount", "dueDate")
  VALUES (991000000000601, 'Silent due', 'active', 991000000000001, 100, now() + interval '2 days');
  -- simulate "the due date passed while nothing touched the row"
  ALTER TABLE "paymentRequests" DISABLE TRIGGER trg_finance_payment_request_derive;
  UPDATE "paymentRequests" SET "dueDate" = now() - interval '2 days' WHERE id = 991000000000601;
  ALTER TABLE "paymentRequests" ENABLE TRIGGER trg_finance_payment_request_derive;

  SELECT * INTO c FROM finance_refresh_overdue();
  IF c.payment_requests_marked < 1 THEN RAISE EXCEPTION 'FAIL: refresh marks the silently overdue request'; END IF;
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000601;
  IF r."overdueSince" IS NULL THEN RAISE EXCEPTION 'FAIL: overdueSince set by the refresh'; END IF;

  SELECT * INTO c FROM finance_refresh_overdue();
  IF c.payment_requests_marked <> 0 THEN RAISE EXCEPTION 'FAIL: a second run marks nothing new (got %)', c.payment_requests_marked; END IF;

  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "paymentRequestId")
  VALUES (991000000000602, 100, 'Received', 991000000000001, 991000000000601);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000601;
  IF r."overdueSince" IS NOT NULL THEN RAISE EXCEPTION 'FAIL: paying clears overdueSince'; END IF;
END $$;

-- ---- (sections appended by later tasks go here) ----

DO $$ BEGIN RAISE NOTICE 'ALL FINANCE FOUNDATION CHECKS PASSED'; END $$;
ROLLBACK;
