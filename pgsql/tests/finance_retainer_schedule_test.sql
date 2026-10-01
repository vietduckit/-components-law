-- ============================================================
-- Self-checking test for pgsql/finance_retainer_schedule.sql (retainer periods
-- as payment schedule rows). Run AFTER deploying it:
--   psql ... -f pgsql/tests/finance_retainer_schedule_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/finance_retainer_schedule_test.sql
-- BEGIN ... ROLLBACK; prints "ALL RETAINER SCHEDULE CHECKS PASSED". Ids 996000000000001+.
-- ============================================================
BEGIN;

-- rows of a contract as "no:amount:date:label"
CREATE OR REPLACE FUNCTION pg_temp.rows_of(p_contract bigint) RETURNS text LANGUAGE sql AS $$
  SELECT string_agg("installmentNo" || ':' || round(amount)::bigint || ':' ||
                    to_char(public.finance_local_date("dueDate"), 'YYYY-MM-DD') || ':' || label, ',' ORDER BY "installmentNo")
  FROM "contractPaymentSchedules" WHERE "contractId" = p_contract;
$$;
CREATE OR REPLACE FUNCTION pg_temp.d(p_date date, p_months int) RETURNS text LANGUAGE sql AS $$
  SELECT to_char((p_date + make_interval(months => p_months))::date, 'YYYY-MM-DD');
$$;

INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status)
VALUES (996000000000001, 'RS-1', 'Retainer schedule', 'retainer', 1000, 'execution');
INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles",
                                    "retainerCyclesBilled", "retainerUnit", "startDate", "nextBillingDate")
VALUES (996000000000011, 996000000000001, 'retainer', 'active', 1000, 3, 0, 'month', finance_today() + 10, finance_today() + 10);

DO $$
DECLARE got text; want text; r RECORD; s0 date := finance_today() + 10; row1 bigint; row2 bigint;
BEGIN
  -- a plan with 3 periods -> 3 schedule rows, each billing the plan's amount
  -- (2026-09-30: Total amount is the fee of EVERY period, not split), no request yet
  got := pg_temp.rows_of(996000000000001);
  want := format('1:1000:%s:Kỳ 1,2:1000:%s:Kỳ 2,3:1000:%s:Kỳ 3', pg_temp.d(s0, 0), pg_temp.d(s0, 1), pg_temp.d(s0, 2));
  IF got IS DISTINCT FROM want THEN RAISE EXCEPTION 'FAIL: one schedule row per period (got %, want %)', got, want; END IF;
  IF EXISTS (SELECT 1 FROM "paymentRequests" WHERE "contractId" = 996000000000001) THEN
    RAISE EXCEPTION 'FAIL: retainer schedule rows create no request by themselves';
  END IF;
  SELECT id INTO row1 FROM "contractPaymentSchedules" WHERE "contractId" = 996000000000001 AND "installmentNo" = 1;
  SELECT id INTO row2 FROM "contractPaymentSchedules" WHERE "contractId" = 996000000000001 AND "installmentNo" = 2;

  -- the hourly run bills period 1 on its row; the rows still due follow the plan's dates
  UPDATE "contractBillingPlans" SET "nextBillingDate" = finance_today() - 1 WHERE id = 996000000000011;
  PERFORM * FROM retainer_billing_run_due();
  SELECT * INTO r FROM "paymentRequests" WHERE "billingPlanId" = 996000000000011 AND "cycleNo" = 1;
  IF r."contractPaymentScheduleId" IS DISTINCT FROM row1 THEN RAISE EXCEPTION 'FAIL: period 1 request on its schedule row (got %)', r."contractPaymentScheduleId"; END IF;
  got := pg_temp.rows_of(996000000000001);
  want := format('1:1000:%s:Kỳ 1,2:1000:%s:Kỳ 2,3:1000:%s:Kỳ 3',
                 pg_temp.d(finance_today() - 1, 0), pg_temp.d(finance_today() - 1, 1), pg_temp.d(finance_today() - 1, 2));
  IF got IS DISTINCT FROM want THEN RAISE EXCEPTION 'FAIL: rows follow the plan dates (got %, want %)', got, want; END IF;

  -- Bill now: period 2 on its row
  INSERT INTO "paymentRequests" (id, "requestType", "billingPlanId") VALUES (996000000000101, 'bill_now', 996000000000011);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 996000000000101;
  IF r."cycleNo" <> 2 OR r."contractPaymentScheduleId" IS DISTINCT FROM row2 THEN
    RAISE EXCEPTION 'FAIL: bill now = period 2 on its schedule row (got %, %)', r."cycleNo", r."contractPaymentScheduleId";
  END IF;

  -- terminated: the plan completes, the period never billed goes away
  UPDATE contracts SET status = 'terminated' WHERE id = 996000000000001;
  IF (SELECT count(*) FROM "contractPaymentSchedules" WHERE "contractId" = 996000000000001) <> 2 THEN
    RAISE EXCEPTION 'FAIL: unbilled period removed on termination (got %)', pg_temp.rows_of(996000000000001);
  END IF;
END $$;

-- open-ended: the rows billed so far + the next one
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status)
VALUES (996000000000002, 'RS-2', 'Open retainer', 'retainer', 500, 'execution');
INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles",
                                    "retainerCyclesBilled", "retainerUnit", "startDate", "nextBillingDate")
VALUES (996000000000012, 996000000000002, 'retainer', 'active', 500, NULL, 0, 'month', finance_today() + 5, finance_today() + 5);
DO $$
DECLARE got text;
BEGIN
  got := pg_temp.rows_of(996000000000002);
  IF got IS DISTINCT FROM format('1:500:%s:Kỳ 1', pg_temp.d(finance_today() + 5, 0)) THEN
    RAISE EXCEPTION 'FAIL: open-ended starts with the next period only (got %)', got;
  END IF;
  INSERT INTO "paymentRequests" (id, "requestType", "billingPlanId") VALUES (996000000000102, 'bill_now', 996000000000012);
  got := pg_temp.rows_of(996000000000002);
  IF got IS DISTINCT FROM format('1:500:%s:Kỳ 1,2:500:%s:Kỳ 2', pg_temp.d(finance_today() + 5, 0), pg_temp.d(finance_today() + 5, 1)) THEN
    RAISE EXCEPTION 'FAIL: billing a period adds the next one (got %)', got;
  END IF;
END $$;

-- stop over two billing dates, start again: the remaining rows move with the plan
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status)
VALUES (996000000000003, 'RS-3', 'Paused retainer', 'retainer', 300, 'execution');
INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles",
                                    "retainerCyclesBilled", "retainerUnit", "startDate", "nextBillingDate")
VALUES (996000000000013, 996000000000003, 'retainer', 'active', 300, 3, 0, 'month', finance_today() + 3, finance_today() + 3);
DO $$
DECLARE p RECORD; first_row date;
BEGIN
  UPDATE "contractBillingPlans" SET "isBillingActive" = false, "pauseReason" = 'Hold' WHERE id = 996000000000013;
  UPDATE "contractBillingPlans" SET "pausedAt" = now() - interval '70 days', "nextBillingDate" = finance_today() - 60 WHERE id = 996000000000013;
  UPDATE "contractBillingPlans" SET "isBillingActive" = true WHERE id = 996000000000013;
  SELECT * INTO p FROM "contractBillingPlans" WHERE id = 996000000000013;
  SELECT public.finance_local_date("dueDate") INTO first_row FROM "contractPaymentSchedules"
  WHERE "contractId" = 996000000000003 AND "installmentNo" = 1;
  IF first_row IS DISTINCT FROM p."nextBillingDate" THEN
    RAISE EXCEPTION 'FAIL: first unbilled row follows the next billing date (got %, want %)', first_row, p."nextBillingDate";
  END IF;
END $$;

-- a period request made before the rows existed is linked to its row
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status)
VALUES (996000000000004, 'RS-4', 'Linked retainer', 'retainer', 200, 'execution');
INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles",
                                    "retainerCyclesBilled", "retainerUnit", "startDate", "nextBillingDate")
VALUES (996000000000014, 996000000000004, 'retainer', 'active', 200, 2, 0, 'month', finance_today() + 20, finance_today() + 20);
DO $$
DECLARE linked bigint;
BEGIN
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount", "billingPlanId", "cycleNo")
  VALUES (996000000000103, 'Old period 1', 'active', 996000000000004, 100, 996000000000014, 1);
  UPDATE "paymentRequests" SET "contractPaymentScheduleId" = NULL WHERE id = 996000000000103;
  PERFORM public.retainer_schedule_sync(996000000000014);
  SELECT "contractPaymentScheduleId" INTO linked FROM "paymentRequests" WHERE id = 996000000000103;
  IF linked IS DISTINCT FROM (SELECT id FROM "contractPaymentSchedules" WHERE "contractId" = 996000000000004 AND "installmentNo" = 1) THEN
    RAISE EXCEPTION 'FAIL: an older period request is linked to its row (got %)', linked;
  END IF;
END $$;

-- 2026-09-30: the contract is worth fee × periods — its balance / Paid status
-- follow that, not the single fee
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status)
VALUES (996000000000005, 'RS-5', 'Valued retainer', 'retainer', 400, 'execution');
INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles",
                                    "retainerCyclesBilled", "retainerUnit", "startDate", "nextBillingDate")
VALUES (996000000000015, 996000000000005, 'retainer', 'active', 400, 3, 0, 'month', finance_today() + 3, finance_today() + 3);
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status)
VALUES (996000000000006, 'RS-6', 'Open valued retainer', 'retainer', 250, 'execution');
INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles",
                                    "retainerCyclesBilled", "retainerUnit", "startDate", "nextBillingDate")
VALUES (996000000000016, 996000000000006, 'retainer', 'active', 250, NULL, 0, 'month', finance_today() + 3, finance_today() + 3);
DO $$
DECLARE c RECORD;
BEGIN
  IF contract_resolved_total(996000000000005) <> 1200 THEN
    RAISE EXCEPTION 'FAIL: fixed retainer worth fee × periods (got %)', contract_resolved_total(996000000000005);
  END IF;
  SELECT * INTO c FROM contracts WHERE id = 996000000000005;
  IF c."outStandingAmount" <> 1200 OR c."paymentStatus" <> 'unpaid' THEN
    RAISE EXCEPTION 'FAIL: a new plan sets the balance to fee × periods (got %, %)', c."outStandingAmount", c."paymentStatus";
  END IF;
  -- one period paid: still owed two
  INSERT INTO payments (id, amount, "paymentStatus", "contractId") VALUES (996000000000201, 400, 'received', 996000000000005);
  SELECT * INTO c FROM contracts WHERE id = 996000000000005;
  IF c."outStandingAmount" <> 800 OR c."paymentStatus" <> 'partial' THEN
    RAISE EXCEPTION 'FAIL: one period paid is partial, not paid (got %, %)', c."outStandingAmount", c."paymentStatus";
  END IF;

  -- open-ended: one period before any bill, then the periods billed so far
  IF contract_resolved_total(996000000000006) <> 250 THEN
    RAISE EXCEPTION 'FAIL: open-ended worth one period before billing (got %)', contract_resolved_total(996000000000006);
  END IF;
  UPDATE "contractBillingPlans" SET "retainerCyclesBilled" = 3 WHERE id = 996000000000016;
  SELECT * INTO c FROM contracts WHERE id = 996000000000006;
  IF contract_resolved_total(996000000000006) <> 750 OR c."outStandingAmount" <> 750 THEN
    RAISE EXCEPTION 'FAIL: open-ended worth the periods billed (got %, balance %)', contract_resolved_total(996000000000006), c."outStandingAmount";
  END IF;

  -- not a retainer: the contract's own total, unchanged
  IF contract_resolved_total(996000000000001) IS DISTINCT FROM 1000 * 3::numeric THEN
    RAISE EXCEPTION 'FAIL: RS-1 (3 periods of 1000) worth 3000 (got %)', contract_resolved_total(996000000000001);
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL RETAINER SCHEDULE CHECKS PASSED'; END $$;
ROLLBACK;
