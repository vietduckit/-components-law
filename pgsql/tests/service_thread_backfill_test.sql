-- ============================================================
-- Self-checking test: fixing older lines for the service threads
-- (service_thread_backfill_run in pgsql/service_thread_sync.sql).
-- BEGIN ... ROLLBACK; prints "ALL SERVICE THREAD BACKFILL CHECKS PASSED". Ids 998400000000001+.
--   bash scripts/tests/sql/run-local.sh pgsql/tests/service_thread_backfill_test.sql
-- On a real database it runs the whole backfill inside the transaction and
-- rolls it back: run it outside working hours.
-- ============================================================
BEGIN;
INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998400000000001, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces") VALUES (998400000000002, 'XTS', 2);
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status)
VALUES (998400000000011, 998400000000002, money_base_currency_id(), 20480.471317, '2026-08-18T09:18:17Z', NULL);
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998400000000101, 'line', '2026-09-01T02:00:00Z');
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt") VALUES
  (998400000000201, 'BT-1', 'Lost currency', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z'),
  (998400000000202, 'BT-2', 'Billed', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt") VALUES
  (998400000000301, 998400000000201, 'in_progress', '2026-09-20T02:00:00Z'),
  (998400000000302, 998400000000202, 'in_progress', '2026-09-20T02:00:00Z');

-- older rows, written with the triggers off (no threads)
ALTER TABLE "quotationServices" DISABLE TRIGGER USER;
ALTER TABLE "contractServices" DISABLE TRIGGER USER;
ALTER TABLE "projectServices" DISABLE TRIGGER USER;
INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId", status) VALUES
  (998400000000111, 998400000000101, 'Liquor licence', 200, 1, 10, money_base_currency_id(), NULL),
  (998400000000112, 998400000000101, 'Dropped', 100, 1, 0, money_base_currency_id(), 'deleted');
INSERT INTO "projectServices" (id, "projectId", "serviceName", "serviceType", "basePrice", vat, "currencyId") VALUES
  (998400000000311, 998400000000301, 'Liquor licence', 'Licence', 200, 10, 998400000000002),
  (998400000000312, 998400000000302, 'Billed licence', NULL, 200, 10, 998400000000002),
  -- a second case made from the same quotation line (a second case line in the thread)
  (998400000000313, 998400000000301, 'Liquor licence', 'Licence', 200, 10, 998400000000002);
UPDATE "projectServices" SET "quotationServiceId" = 998400000000111 WHERE id = 998400000000313;
INSERT INTO "contractServices" (id, "contractId", "projectServiceId", "quotationServiceId", "serviceName", "basePrice", quantity, vat, "currencyId", "lineStatus") VALUES
  (998400000000211, 998400000000201, 998400000000311, 998400000000111, 'Liquor licence', 200, 3, 10, money_base_currency_id(), NULL),
  (998400000000212, 998400000000202, 998400000000312, NULL, 'Billed licence', 200, 1, 10, money_base_currency_id(), NULL),
  (998400000000213, 998400000000201, NULL, NULL, 'Cancelled, worked on', 100, 1, 0, money_base_currency_id(), 'cancelled');
ALTER TABLE "quotationServices" ENABLE TRIGGER USER;
ALTER TABLE "contractServices" ENABLE TRIGGER USER;
ALTER TABLE "projectServices" ENABLE TRIGGER USER;
INSERT INTO "paymentRequests" (id, "contractId", status, "requestedAmount") VALUES (998400000000501, 998400000000202, 'active', 100);
INSERT INTO tasks (id, title, status, "projectId", "quotationServiceId") VALUES (998400000000601, 'Template task', 'toDo', 998400000000301, 998400000000112);
INSERT INTO tasks (id, title, status, "projectId", "contractServiceId") VALUES (998400000000602, 'Started', 'inProgress', 998400000000301, 998400000000213);

CREATE TEMP TABLE bt_result AS SELECT * FROM service_thread_backfill_run();

DO $$
DECLARE r RECORD; v_thread bigint;
BEGIN
  SELECT "serviceThreadId" INTO v_thread FROM "contractServices" WHERE id = 998400000000211;
  IF v_thread IS NULL OR (SELECT count(*) FROM money_thread_lines(v_thread)) <> 4 THEN
    RAISE EXCEPTION 'FAIL: the quotation, contract and both case lines form one thread';
  END IF;
  IF (SELECT "quotationServiceId" FROM "projectServices" WHERE id = 998400000000311) <> 998400000000111 THEN
    RAISE EXCEPTION 'FAIL: the case line links its quotation line';
  END IF;
  -- currency lost on the contract / quotation line: back to the case line's
  IF (SELECT "currencyId" FROM "contractServices" WHERE id = 998400000000211) <> 998400000000002
     OR (SELECT "currencyId" FROM "quotationServices" WHERE id = 998400000000111) <> 998400000000002 THEN
    RAISE EXCEPTION 'FAIL: the contract and quotation lines take the case line''s currency';
  END IF;
  -- content filled from the thread (no value is wiped)
  SELECT * INTO r FROM "projectServices" WHERE id = 998400000000311;
  IF r.quantity <> 3 OR (SELECT "serviceType" FROM "contractServices" WHERE id = 998400000000211) <> 'Licence' THEN
    RAISE EXCEPTION 'FAIL: quantity and service type are filled from the thread (got %, %)', r.quantity,
      (SELECT "serviceType" FROM "contractServices" WHERE id = 998400000000211);
  END IF;
  IF r."totalAmount" IS DISTINCT FROM (SELECT "totalAmount" FROM "contractServices" WHERE id = 998400000000211) THEN
    RAISE EXCEPTION 'FAIL: the case and contract lines end with the same amount (% vs %)', r."totalAmount",
      (SELECT "totalAmount" FROM "contractServices" WHERE id = 998400000000211);
  END IF;
  -- billed: listed, not changed
  IF NOT money_is_base((SELECT "currencyId" FROM "contractServices" WHERE id = 998400000000212))
     OR NOT EXISTS (SELECT 1 FROM bt_result WHERE record_id = 998400000000212 AND step LIKE '%billed%') THEN
    RAISE EXCEPTION 'FAIL: a billed contract''s line is listed, not changed';
  END IF;
  -- deleted / cancelled lines: destroyed unless worked on
  IF EXISTS (SELECT 1 FROM "quotationServices" WHERE id = 998400000000112) OR EXISTS (SELECT 1 FROM tasks WHERE id = 998400000000601) THEN
    RAISE EXCEPTION 'FAIL: a deleted line with an untouched task is destroyed with it';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "contractServices" WHERE id = 998400000000213)
     OR NOT EXISTS (SELECT 1 FROM bt_result WHERE record_id = 998400000000213 AND step LIKE '%kept%') THEN
    RAISE EXCEPTION 'FAIL: a cancelled line with a task in progress is kept and listed';
  END IF;
  IF EXISTS (SELECT 1 FROM service_thread_violations
             WHERE record_id IN (998400000000111, 998400000000211, 998400000000311)) THEN
    RAISE EXCEPTION 'FAIL: the fixed thread is consistent';
  END IF;
  -- one row per line, even when a thread has two case lines
  IF EXISTS (SELECT 1 FROM bt_result WHERE step LIKE 'currency%' GROUP BY table_name, record_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'FAIL: a line is listed once per step';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL SERVICE THREAD BACKFILL CHECKS PASSED'; END $$;
ROLLBACK;
