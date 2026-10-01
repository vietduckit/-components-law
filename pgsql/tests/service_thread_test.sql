-- ============================================================
-- Self-checking test: service thread sync (pgsql/service_thread_sync.sql).
-- BEGIN ... ROLLBACK; prints "ALL SERVICE THREAD CHECKS PASSED". Ids 998300000000001+.
--   psql ... -f pgsql/tests/service_thread_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/service_thread_test.sql
-- ============================================================
BEGIN;
INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998300000000001, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces") VALUES (998300000000002, 'XTU', 2);
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status)
VALUES (998300000000011, 998300000000002, money_base_currency_id(), 26176.5, '2026-08-18T09:18:17Z', NULL);
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998300000000101, 'line', '2026-09-01T02:00:00Z');
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt") VALUES
  (998300000000201, 'ST-1', 'Thread 1', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z'),
  (998300000000202, 'ST-2', 'Thread 2', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z'),
  (998300000000203, 'ST-3', 'Thread 3', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt") VALUES (998300000000301, 998300000000201, 'in_progress', '2026-09-20T02:00:00Z');

-- ---- A. one quotation line made into three contracts and a case: one thread
INSERT INTO "quotationServices" (id, "quotationId", "serviceId", "serviceName", "serviceType", description, "basePrice", quantity, vat, "currencyId")
VALUES (998300000000111, 998300000000101, 5, 'Trademark', 'IP', 'desc', 10, 1, 8, 998300000000002);
INSERT INTO "contractServices" (id, "contractId", "quotationServiceId", "ServiceId", "serviceName", "serviceType", description, "basePrice", quantity, vat, "currencyId") VALUES
  (998300000000211, 998300000000201, 998300000000111, 5, 'Trademark', 'IP', 'desc', 10, 1, 8, 998300000000002),
  (998300000000212, 998300000000202, 998300000000111, 5, 'Trademark', 'IP', 'desc', 10, 1, 8, 998300000000002),
  (998300000000213, 998300000000203, 998300000000111, 5, 'Trademark', 'IP', 'desc', 10, 1, 8, 998300000000002);
INSERT INTO "projectServices" (id, "projectId", "serviceId", "serviceName", "serviceType", description, "basePrice", vat, "currencyId")
VALUES (998300000000311, 998300000000301, 5, 'Trademark', 'IP', 'desc', 10, 8, 998300000000002);
UPDATE "contractServices" SET "projectServiceId" = 998300000000311 WHERE id = 998300000000211;
DO $$
DECLARE n integer; v_thread bigint;
BEGIN
  SELECT "serviceThreadId" INTO v_thread FROM "projectServices" WHERE id = 998300000000311;
  SELECT count(*) INTO n FROM money_thread_lines(v_thread);
  IF n <> 5 THEN
    RAISE EXCEPTION 'FAIL A: the quotation line, three contract lines and the case line share one thread (got % lines)', n;
  END IF;
  IF (SELECT "projectId" FROM "contractServices" WHERE id = 998300000000211) <> 998300000000301 THEN
    RAISE EXCEPTION 'FAIL A: a contract line takes its case from its case line';
  END IF;
  IF (SELECT "serviceThreadId" FROM "quotationServices" WHERE id = 998300000000111) IS DISTINCT FROM v_thread THEN
    RAISE EXCEPTION 'FAIL A: linking merges the whole thread';
  END IF;
END $$;

-- ---- B. a change on any line reaches every line, and is logged
DO $$
DECLARE v_thread bigint; n integer; v_origin bigint; r RECORD;
BEGIN
  SELECT "serviceThreadId" INTO v_thread FROM "projectServices" WHERE id = 998300000000311;
  UPDATE "quotationServices" SET "serviceName" = 'Trademark filing', "updatedById" = 7 WHERE id = 998300000000111;
  SELECT count(*) INTO n FROM money_thread_lines(v_thread) l WHERE l.j->>'serviceName' = 'Trademark filing';
  IF n <> 5 THEN RAISE EXCEPTION 'FAIL B: a quotation name change reaches all 5 lines (got %)', n; END IF;
  SELECT id INTO v_origin FROM "serviceChangeLogs"
  WHERE "recordId" = 998300000000111 AND "fieldName" = 'serviceName' AND "originLogId" IS NULL;
  IF v_origin IS NULL OR (SELECT count(*) FROM "serviceChangeLogs" WHERE "originLogId" = v_origin) <> 4
     OR (SELECT "createdById" FROM "serviceChangeLogs" WHERE id = v_origin) <> 7 THEN
    RAISE EXCEPTION 'FAIL B: one origin row by user 7 and four spread rows';
  END IF;

  UPDATE "projectServices" SET "basePrice" = 12 WHERE id = 998300000000311;
  SELECT count(*) INTO n FROM money_thread_lines(v_thread) l WHERE (l.j->>'basePrice')::numeric = 12;
  IF n <> 5 THEN RAISE EXCEPTION 'FAIL B: a case price change reaches all lines (got %)', n; END IF;
  IF (SELECT "totalAmount" FROM "projectServices" WHERE id = 998300000000311)
     <> (SELECT "totalAmount" FROM "contractServices" WHERE id = 998300000000211) THEN
    RAISE EXCEPTION 'FAIL B: the case line keeps its contract line''s amount';
  END IF;

  UPDATE "contractServices" SET description = 'new scope', vat = 10, "ServiceId" = 6 WHERE id = 998300000000212;
  SELECT * INTO r FROM "quotationServices" WHERE id = 998300000000111;
  IF r.description <> 'new scope' OR r.vat <> 10 OR r."serviceId" <> 6 THEN
    RAISE EXCEPTION 'FAIL B: a contract edit reaches the quotation (got %, %, %)', r.description, r.vat, r."serviceId";
  END IF;
  IF (SELECT "serviceId" FROM "projectServices" WHERE id = 998300000000311) <> 6 THEN
    RAISE EXCEPTION 'FAIL B: ServiceId maps to the case line''s serviceId';
  END IF;

  UPDATE "quotationServices" SET quantity = 2 WHERE id = 998300000000111;
  IF (SELECT quantity FROM "projectServices" WHERE id = 998300000000311) <> 2
     OR (SELECT "totalAmount" FROM "projectServices" WHERE id = 998300000000311)
        <> (SELECT "totalAmount" FROM "contractServices" WHERE id = 998300000000211) THEN
    RAISE EXCEPTION 'FAIL B: quantity reaches the case line, amounts stay equal';
  END IF;

  UPDATE "contractServices" SET "currencyId" = money_base_currency_id() WHERE id = 998300000000213;
  SELECT count(*) INTO n FROM money_thread_lines(v_thread) l WHERE money_is_base((l.j->>'currencyId')::bigint);
  IF n <> 5 OR (SELECT "totalAmount" FROM "contractServices" WHERE id = 998300000000211) <> 26 THEN
    RAISE EXCEPTION 'FAIL B: a currency change reaches all lines and re-prices them (got %, %)', n,
      (SELECT "totalAmount" FROM "contractServices" WHERE id = 998300000000211);
  END IF;
END $$;

-- ---- C. re-saving the same values is no change
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "serviceChangeLogs";
  UPDATE "contractServices" SET description = '  new scope  ', "serviceName" = "serviceName" WHERE id = 998300000000211;
  UPDATE "projectServices" SET description = E'new scope\n' WHERE id = 998300000000311;
  UPDATE "projectServices" SET quantity = quantity WHERE id = 998300000000311;
  IF (SELECT count(*) FROM "serviceChangeLogs") <> n THEN
    RAISE EXCEPTION 'FAIL C: a re-save with the same (trimmed) values logs nothing';
  END IF;
END $$;

-- ---- D. a combo quotation line and a line-priced contract line: names spread, prices do not
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998300000000102, 'package', '2026-09-01T02:00:00Z');
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt")
VALUES (998300000000204, 'ST-4', 'Combo quote', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", vat, "pricingMode")
VALUES (998300000000112, 998300000000102, 'Setup', 0, 0, 'package');
INSERT INTO "contractServices" (id, "contractId", "quotationServiceId", "serviceName", "basePrice", vat, "currencyId", "pricingMode")
VALUES (998300000000214, 998300000000204, 998300000000112, 'Setup', 5000000, 8, money_base_currency_id(), 'line');
DO $$
BEGIN
  UPDATE "quotationServices" SET "serviceName" = 'Setup (company)', "basePrice" = 0 WHERE id = 998300000000112;
  IF (SELECT "serviceName" FROM "contractServices" WHERE id = 998300000000214) <> 'Setup (company)' THEN
    RAISE EXCEPTION 'FAIL D: the name spreads to the line-priced contract line';
  END IF;
  IF (SELECT "basePrice" FROM "contractServices" WHERE id = 998300000000214) <> 5000000 THEN
    RAISE EXCEPTION 'FAIL D: a combo line''s price never reaches a line-priced line';
  END IF;
  UPDATE "contractServices" SET "basePrice" = 6000000 WHERE id = 998300000000214;
  IF (SELECT "basePrice" FROM "quotationServices" WHERE id = 998300000000112) <> 0 THEN
    RAISE EXCEPTION 'FAIL D: a line price does not reach a combo line';
  END IF;
END $$;

-- ---- F. a new line joining a thread takes what it was created without, and spreads what it brings
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt")
VALUES (998300000000205, 'ST-5', 'Late contract', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO "contractServices" (id, "contractId", "quotationServiceId", "basePrice", vat, "currencyId")
VALUES (998300000000215, 998300000000205, 998300000000111, 10, 10, money_base_currency_id());
DO $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM "contractServices" WHERE id = 998300000000215;
  IF r."serviceName" <> 'Trademark filing' OR r.quantity <> 2 OR r."ServiceId" <> 6 THEN
    RAISE EXCEPTION 'FAIL F: a new line takes name / quantity / service from its thread (got %, %, %)', r."serviceName", r.quantity, r."ServiceId";
  END IF;
  -- it brought price 10 (the thread has 12): the thread takes 10
  IF EXISTS (SELECT 1 FROM money_thread_lines(r."serviceThreadId") l
             WHERE NOT money_thread_is_package(l.j) AND (l.j->>'basePrice')::numeric <> 10) THEN
    RAISE EXCEPTION 'FAIL F: the price a new line brings reaches its thread';
  END IF;
END $$;

-- ---- E. a thread that touches a billed contract is locked, for every field
INSERT INTO "paymentRequests" (id, "contractId", status, "requestedAmount") VALUES (998300000000501, 998300000000203, 'active', 100);
DO $$
DECLARE v_msg text;
BEGIN
  BEGIN
    UPDATE "quotationServices" SET description = 'late edit' WHERE id = 998300000000111;
    RAISE EXCEPTION 'FAIL E: an edit of a thread with a billed contract must be refused';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg NOT LIKE '%ST-3, which has payments — it cannot be changed%' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE "contractServices" SET "serviceName" = 'x' WHERE id = 998300000000211;
    RAISE EXCEPTION 'FAIL E: an unbilled contract of a billed thread is locked too';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg LIKE 'FAIL%' THEN RAISE; END IF;
  END;
  -- not content: allowed
  UPDATE "contractServices" SET "lineStatus" = 'contracted' WHERE id = 998300000000213;
  -- the same values: allowed
  UPDATE "quotationServices" SET "serviceName" = "serviceName" WHERE id = 998300000000111;
  IF (SELECT description FROM "quotationServices" WHERE id = 998300000000111) <> 'new scope' THEN
    RAISE EXCEPTION 'FAIL E: a refused edit changed nothing';
  END IF;
  BEGIN
    DELETE FROM "projectServices" WHERE id = 998300000000311;
    RAISE EXCEPTION 'FAIL E: destroying a line of a billed thread must be refused';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg NOT LIKE '%which has payments — it cannot be deleted%' THEN RAISE; END IF;
  END;
END $$;
DELETE FROM "paymentRequests" WHERE id = 998300000000501;

-- ---- G. destroying a line destroys its thread and what hangs on it
INSERT INTO tasks (id, title, status, "projectId", "projectServiceId", "createdAt")
VALUES (998300000000601, 'File the mark', 'inProgress', 998300000000301, 998300000000311, now() - interval '1 day');
INSERT INTO documents (id, "taskId", "createdAt") VALUES (998300000000611, 998300000000601, now() - interval '1 day');
INSERT INTO folders (id, "taskId") VALUES (998300000000621, 998300000000601);
INSERT INTO "paymentRequests" (id, "contractId", "contractServiceId", status, "requestedAmount")
VALUES (998300000000631, 998300000000202, 998300000000212, 'pending', 100);
INSERT INTO "paymentRequestItems" (id, "paymentRequestId", "requestedAmount") VALUES (998300000000632, 998300000000631, 100);
INSERT INTO "contractPaymentScheduleServices" (id, "contractPaymentScheduleId", "contractServiceId") VALUES (998300000000641, 1, 998300000000212);
INSERT INTO "paymentRequestServices" (id, "paymentRequestId", "contractServiceId") VALUES (998300000000642, 1, 998300000000212);
DO $$
DECLARE v_msg text; v_thread bigint;
BEGIN
  SELECT "serviceThreadId" INTO v_thread FROM "quotationServices" WHERE id = 998300000000111;
  BEGIN
    DELETE FROM "quotationServices" WHERE id = 998300000000111;
    RAISE EXCEPTION 'FAIL G: a thread with a task in progress must not be destroyed';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg NOT LIKE '%File the mark%finish or remove them first%' THEN RAISE; END IF;
  END;
  UPDATE tasks SET status = 'toDo' WHERE id = 998300000000601;
  INSERT INTO timesheets (id, "taskId") VALUES (998300000000651, 998300000000601);
  BEGIN
    DELETE FROM "projectServices" WHERE id = 998300000000311;
    RAISE EXCEPTION 'FAIL G: a timesheet is progress';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg LIKE 'FAIL%' THEN RAISE; END IF;
  END;
  DELETE FROM timesheets WHERE id = 998300000000651;

  DELETE FROM "projectServices" WHERE id = 998300000000311;
  IF EXISTS (SELECT 1 FROM money_thread_lines(v_thread)) THEN
    RAISE EXCEPTION 'FAIL G: the whole thread is destroyed';
  END IF;
  IF EXISTS (SELECT 1 FROM tasks WHERE id = 998300000000601) OR EXISTS (SELECT 1 FROM documents WHERE id = 998300000000611)
     OR EXISTS (SELECT 1 FROM folders WHERE id = 998300000000621) THEN
    RAISE EXCEPTION 'FAIL G: the untouched task goes with its template file and folder';
  END IF;
  IF EXISTS (SELECT 1 FROM "paymentRequests" WHERE id = 998300000000631) OR EXISTS (SELECT 1 FROM "paymentRequestItems" WHERE id = 998300000000632)
     OR EXISTS (SELECT 1 FROM "contractPaymentScheduleServices" WHERE id = 998300000000641)
     OR EXISTS (SELECT 1 FROM "paymentRequestServices" WHERE id = 998300000000642) THEN
    RAISE EXCEPTION 'FAIL G: the pending request and the service tags go too';
  END IF;
  IF (SELECT count(*) FROM "serviceChangeLogs" WHERE "serviceThreadId" = v_thread AND action = 'delete') <> 6 THEN
    RAISE EXCEPTION 'FAIL G: one delete row per destroyed line (got %)',
      (SELECT count(*) FROM "serviceChangeLogs" WHERE "serviceThreadId" = v_thread AND action = 'delete');
  END IF;
  -- the documents' totals follow: contract ST-1 has no service left
  IF (SELECT "totalAmount" FROM contracts WHERE id = 998300000000201) <> 0 THEN
    RAISE EXCEPTION 'FAIL G: a contract whose only service was destroyed totals 0';
  END IF;
END $$;

-- ---- H. a By Service pending request follows its service's amount
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt")
VALUES (998300000000206, 'ST-6', 'By service', 'byService', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt") VALUES (998300000000302, 998300000000206, 'in_progress', '2026-09-20T02:00:00Z');
INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId")
VALUES (998300000000321, 998300000000302, 'Audit', 1000000, 8, money_base_currency_id());
INSERT INTO "contractServices" (id, "contractId", "projectServiceId", "serviceName", "basePrice", vat, "currencyId")
VALUES (998300000000221, 998300000000206, 998300000000321, 'Audit', 1000000, 8, money_base_currency_id());
INSERT INTO "paymentRequests" (id, "contractId", "contractServiceId", "projectServiceId", status, "requestedAmount")
VALUES (998300000000701, 998300000000206, 998300000000221, 998300000000321, 'pending', 1080000);
INSERT INTO "paymentRequestItems" (id, "paymentRequestId", "requestedAmount") VALUES (998300000000702, 998300000000701, 1080000);
DO $$
BEGIN
  UPDATE "projectServices" SET "basePrice" = 2000000 WHERE id = 998300000000321;
  IF (SELECT "requestedAmount" FROM "paymentRequests" WHERE id = 998300000000701) <> 2160000
     OR (SELECT "requestedAmount" FROM "paymentRequestItems" WHERE id = 998300000000702) <> 2160000 THEN
    RAISE EXCEPTION 'FAIL H: the pending By Service request and its item follow the service (got %)',
      (SELECT "requestedAmount" FROM "paymentRequests" WHERE id = 998300000000701);
  END IF;
END $$;

-- ---- I. after all of it, every thread of this test is consistent
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM service_thread_violations WHERE record_id BETWEEN 998300000000000 AND 998300999999999;
  IF n <> 0 THEN
    RAISE EXCEPTION 'FAIL I: the threads are consistent (got % rows: %)', n,
      (SELECT string_agg(rule || ' ' || record_id || ' ' || detail, ' | ') FROM service_thread_violations
       WHERE record_id BETWEEN 998300000000000 AND 998300999999999);
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL SERVICE THREAD CHECKS PASSED'; END $$;
ROLLBACK;
