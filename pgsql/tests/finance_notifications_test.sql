-- ============================================================
-- Self-checking test for pgsql/finance_notifications.sql. Run AFTER deploying it:
--   psql ... -f pgsql/tests/finance_notifications_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/finance_notifications_test.sql
-- BEGIN ... ROLLBACK; prints "ALL FINANCE NOTIFICATIONS CHECKS PASSED".
-- Ids 995000000000001+. Events already queued on the database before the
-- test are marked sent inside the transaction and restored by the ROLLBACK.
-- ============================================================
BEGIN;

UPDATE "financeNotificationEvents" SET "sentAt" = now() WHERE "sentAt" IS NULL;

INSERT INTO customers (id, "shortName") VALUES (995000000000001, 'ACME');
INSERT INTO lawyers (id, "userId") VALUES
  (995000000000701, 995000000000901),   -- case manager
  (995000000000702, 995000000000902),   -- finance member
  (995000000000703, NULL);              -- lawyer without an account: skipped
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status, "customerId")
VALUES (995000000000011, 'NT-1', 'Notify test', 'byCase', 1000, 'execution', 995000000000001);
INSERT INTO projects (id, "contractId", status, "managerId", "caseCode", "projectName")
VALUES (995000000000021, 995000000000011, 'in_progress', 995000000000701, 'C-NT1', 'Notify case');
SELECT public.finance_link_members('projectFinanceMembers', 'projectId', 995000000000021,
  ARRAY[995000000000702, 995000000000703]::bigint[]);

-- the rows one take returns, as "event:user" (sorted)
CREATE TEMP TABLE taken ON COMMIT DROP AS
SELECT * FROM public.finance_notifications_take() WHERE false;

DO $$
DECLARE got text; r RECORD;
BEGIN
  -- an Active request: its people are told once each, with readable text
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "customerId", "requestedAmount", "dueDate")
  VALUES (995000000000101, 'Đợt 1 - NT-1 - Notify test', 'active', 995000000000011, 995000000000001, 1500000, '2026-10-05T00:00:00+07');
  INSERT INTO taken SELECT * FROM public.finance_notifications_take();
  SELECT string_agg(event || ':' || receiver_user_id, ',' ORDER BY receiver_user_id) INTO got FROM taken;
  IF got IS DISTINCT FROM 'request_ready:995000000000901,request_ready:995000000000902' THEN
    RAISE EXCEPTION 'FAIL: new active request -> its people (got %)', got;
  END IF;
  SELECT * INTO r FROM taken LIMIT 1;
  IF r.title <> 'Yêu cầu thanh toán mới'
     OR r.content NOT LIKE 'Đợt 1 - NT-1 - Notify test · 1.500.000 VND · hạn 05/10/2026 · Case C-NT1 - Notify case (KH: ACME)'
     OR r.contract_id <> 995000000000011 OR r.case_label <> 'C-NT1 - Notify case' OR r.customer_name <> 'ACME' THEN
    RAISE EXCEPTION 'FAIL: readable request message with its case and customer (got %, %, %, %)', r.title, r.content, r.case_label, r.customer_name;
  END IF;

  -- taken once: a second take has nothing
  IF EXISTS (SELECT 1 FROM public.finance_notifications_take()) THEN RAISE EXCEPTION 'FAIL: an event is sent only once'; END IF;

  -- pending -> active, and cancelled
  DELETE FROM taken;
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount")
  VALUES (995000000000102, 'Đợt 2 - NT-1', 'pending', 995000000000011, 500);
  IF EXISTS (SELECT 1 FROM public.finance_notifications_take()) THEN RAISE EXCEPTION 'FAIL: a pending request is not announced'; END IF;
  UPDATE "paymentRequests" SET status = 'active' WHERE id = 995000000000102;
  UPDATE "paymentRequests" SET status = 'cancelled', "cancelReason" = 'Khách đổi đợt' WHERE id = 995000000000101;
  INSERT INTO taken SELECT * FROM public.finance_notifications_take();
  SELECT string_agg(DISTINCT event, ',' ORDER BY event) INTO got FROM taken;
  IF got IS DISTINCT FROM 'request_cancelled,request_ready' THEN RAISE EXCEPTION 'FAIL: activated + cancelled (got %)', got; END IF;
  IF NOT EXISTS (SELECT 1 FROM taken WHERE event = 'request_cancelled' AND content LIKE '%Lý do: Khách đổi đợt%') THEN
    RAISE EXCEPTION 'FAIL: cancel reason in the message';
  END IF;

  -- invoice, payment, overdue: the people of that record
  DELETE FROM taken;
  DELETE FROM "paymentRequestFinanceMembers" WHERE "paymentRequestId" = 995000000000102 AND "lawyerId" = 995000000000701;
  INSERT INTO invoices (id, "invoiceNumber", status, "totalAmount", "paymentRequestId", "contractId")
  VALUES (995000000000201, 'INV-NT', 'pending', 500, 995000000000102, 995000000000011);
  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "invoiceId", "paymentRequestId")
  VALUES (995000000000301, 200, 'Received', 995000000000011, 995000000000201, 995000000000102);
  INSERT INTO taken SELECT * FROM public.finance_notifications_take();
  SELECT string_agg(event || ':' || receiver_user_id, ',' ORDER BY event, receiver_user_id) INTO got FROM taken;
  IF got IS DISTINCT FROM 'invoice_created:995000000000902,payment_received:995000000000902' THEN
    RAISE EXCEPTION 'FAIL: invoice + payment -> the request''s people (got %)', got;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM taken WHERE event = 'payment_received' AND content LIKE '200 VND%còn nợ 300 VND%') THEN
    RAISE EXCEPTION 'FAIL: payment message shows what is still owed (got %)', (SELECT content FROM taken WHERE event = 'payment_received' LIMIT 1);
  END IF;

  DELETE FROM taken;
  ALTER TABLE "paymentRequests" DISABLE TRIGGER trg_finance_payment_request_derive;
  UPDATE "paymentRequests" SET "dueDate" = now() - interval '3 days' WHERE id = 995000000000102;
  ALTER TABLE "paymentRequests" ENABLE TRIGGER trg_finance_payment_request_derive;
  PERFORM public.finance_refresh_overdue();
  INSERT INTO taken SELECT * FROM public.finance_notifications_take();
  IF NOT EXISTS (SELECT 1 FROM taken WHERE event = 'request_overdue' AND title = 'Yêu cầu thanh toán quá hạn') THEN
    RAISE EXCEPTION 'FAIL: overdue announced (got %)', (SELECT string_agg(event, ',') FROM taken);
  END IF;
  PERFORM public.finance_refresh_overdue();
  IF EXISTS (SELECT 1 FROM public.finance_notifications_take() WHERE event = 'request_overdue') THEN
    RAISE EXCEPTION 'FAIL: overdue announced once';
  END IF;

  -- payment cancelled
  DELETE FROM taken;
  UPDATE payments SET "paymentStatus" = 'Cancelled' WHERE id = 995000000000301;
  INSERT INTO taken SELECT * FROM public.finance_notifications_take();
  IF NOT EXISTS (SELECT 1 FROM taken WHERE event = 'payment_cancelled') THEN RAISE EXCEPTION 'FAIL: payment cancelled announced'; END IF;

  -- retainer stop / start and termination -> Finance members + Manager of the contract's cases
  DELETE FROM taken;
  INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles",
                                      "retainerCyclesBilled", "retainerUnit", "startDate", "nextBillingDate")
  VALUES (995000000000401, 995000000000011, 'retainer', 'active', 900, 3, 0, 'month', finance_today() + 5, finance_today() + 5);
  UPDATE "contractBillingPlans" SET "isBillingActive" = false, "pauseReason" = 'Khách tạm dừng' WHERE id = 995000000000401;
  UPDATE contracts SET status = 'terminated' WHERE id = 995000000000011;
  INSERT INTO taken SELECT * FROM public.finance_notifications_take();
  SELECT string_agg(event || ':' || receiver_user_id, ',' ORDER BY event, receiver_user_id) INTO got FROM taken
  WHERE event IN ('retainer_stopped', 'contract_terminated');
  IF got IS DISTINCT FROM 'contract_terminated:995000000000901,contract_terminated:995000000000902,retainer_stopped:995000000000901,retainer_stopped:995000000000902' THEN
    RAISE EXCEPTION 'FAIL: retainer stop + termination -> contract people (got %)', got;
  END IF;

  -- a record nobody handles: the event is used up, nothing is sent
  INSERT INTO "paymentRequests" (id, title, status, "requestedAmount") VALUES (995000000000103, 'No contract', 'active', 10);
  IF EXISTS (SELECT 1 FROM public.finance_notifications_take()) THEN RAISE EXCEPTION 'FAIL: no people -> nothing sent'; END IF;
  IF EXISTS (SELECT 1 FROM "financeNotificationEvents" WHERE "sentAt" IS NULL) THEN RAISE EXCEPTION 'FAIL: events without people are closed'; END IF;
END $$;

-- prepare: the workflow's first step turns queued events into rows of the
-- financeNotifications collection, one per person, not sent yet
DO $$
DECLARE n int;
BEGIN
  UPDATE "financeNotifications" SET "sentAt" = now() WHERE "sentAt" IS NULL;
  INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status, "customerId")
  VALUES (995000000000012, 'NT-2', 'Prepare test', 'byCase', 1000, 'execution', 995000000000001);
  INSERT INTO projects (id, "contractId", status, "managerId", "caseCode", "projectName")
  VALUES (995000000000022, 995000000000012, 'in_progress', 995000000000701, 'C-NT2', 'Prepare case');
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount")
  VALUES (995000000000111, 'Đợt 1 - NT-2', 'active', 995000000000012, 100);
  n := public.finance_notifications_prepare();
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: prepare adds one row per person (got %)', n; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "financeNotifications"
    WHERE "sentAt" IS NULL AND "receiverUserId" = 995000000000901 AND title = 'Yêu cầu thanh toán mới'
      AND content LIKE 'Đợt 1 - NT-2 · 100 VND%Case C-NT2 - Prepare case (KH: ACME)'
      AND "contractId" = 995000000000012 AND "caseLabel" = 'C-NT2 - Prepare case' AND "customerName" = 'ACME'
      AND event = 'request_ready' AND entity = 'paymentRequests' AND "entityId" = 995000000000111
      AND "createdAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'FAIL: prepared row carries the message and its context';
  END IF;
  IF public.finance_notifications_prepare() <> 0 THEN RAISE EXCEPTION 'FAIL: prepare takes each event once'; END IF;
END $$;

-- one workflow per record type: each takes only its own events
DO $$
DECLARE n int;
BEGIN
  UPDATE "financeNotificationEvents" SET "sentAt" = now() WHERE "sentAt" IS NULL;
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount")
  VALUES (995000000000112, 'Đợt 2 - NT-2', 'active', 995000000000012, 50);
  INSERT INTO invoices (id, "invoiceNumber", status, "totalAmount", "paymentRequestId", "contractId")
  VALUES (995000000000211, 'INV-NT2', 'pending', 50, 995000000000112, 995000000000012);
  n := public.finance_notifications_prepare(ARRAY['invoices']);
  IF n <> 1 OR NOT EXISTS (SELECT 1 FROM "financeNotifications" WHERE "sentAt" IS NULL AND entity = 'invoices' AND "entityId" = 995000000000211) THEN
    RAISE EXCEPTION 'FAIL: the invoice workflow takes the invoice event only (got %)', n;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "financeNotificationEvents" WHERE "sentAt" IS NULL AND entity = 'paymentRequests' AND "entityId" = 995000000000112) THEN
    RAISE EXCEPTION 'FAIL: the request event waits for the request workflow';
  END IF;
  n := public.finance_notifications_prepare(ARRAY['paymentRequests']);
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: the request workflow takes its event (got %)', n; END IF;

  -- a type whose workflow is off: its events are dropped after a day, never sent late
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount")
  VALUES (995000000000113, 'Đợt 3 - NT-2', 'active', 995000000000012, 50);
  UPDATE "financeNotificationEvents" SET "createdAt" = now() - interval '2 days' WHERE "entityId" = 995000000000113;
  IF public.finance_notifications_prepare(ARRAY['paymentRequests']) <> 0 THEN RAISE EXCEPTION 'FAIL: an event older than a day is not sent'; END IF;
  IF EXISTS (SELECT 1 FROM "financeNotificationEvents" WHERE "sentAt" IS NULL AND "entityId" = 995000000000113) THEN
    RAISE EXCEPTION 'FAIL: the old event is closed';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL FINANCE NOTIFICATIONS CHECKS PASSED'; END $$;
ROLLBACK;
