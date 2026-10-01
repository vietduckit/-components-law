-- ============================================================
-- Self-checking test: fixing rows saved before the money triggers
-- (money_backfill_preview / money_backfill_run in pgsql/money_flow_foundation.sql).
-- BEGIN ... ROLLBACK; prints "ALL MONEY BACKFILL CHECKS PASSED". Ids 998200000000001+.
--   psql ... -f pgsql/tests/money_backfill_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/money_backfill_test.sql
-- On dev it recomputes every unbilled line inside the transaction and rolls
-- it back: it can take a little while.
-- ============================================================
BEGIN;

INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998200000000001, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces") VALUES (998200000000002, 'XTU', 2), (998200000000003, 'XTC', 2);
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status)
VALUES (998200000000011, 998200000000002, money_base_currency_id(), 26176.5, '2026-08-18T09:18:17Z', NULL),
       -- the case's date (20 Sep) has another rate than its contract's (1 Sep)
       (998200000000012, 998200000000002, money_base_currency_id(), 26000, '2026-09-10T03:00:00Z', NULL);
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998200000000101, 'line', '2026-09-01T02:00:00Z');
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "totalAmount", "createdAt", "currencyId") VALUES
  (998200000000201, 'BF-1', 'Unbilled', 'byCase', 'line', 'execution', NULL, '2026-09-01T02:00:00Z', NULL),
  (998200000000202, 'BF-2', 'Billed', 'byCase', 'line', 'execution', 282706, '2026-09-01T02:00:00Z', NULL),
  (998200000000204, 'BF-3', 'Foreign document', 'byCase', 'line', 'execution', 1080, '2026-09-01T02:00:00Z', 998200000000002),
  (998200000000205, 'BF-4', 'Rate 1 by default', 'byCase', 'line', 'execution', 282706, '2026-09-01T02:00:00Z', NULL);
INSERT INTO projects (id, "contractId", status, "createdAt") VALUES (998200000000203, 998200000000201, 'in_progress', '2026-09-20T02:00:00Z');

-- rows as the old forms saved them (10 XTU + 8% stored as 11, no rate): written with the triggers off
ALTER TABLE "quotationServices" DISABLE TRIGGER USER;
ALTER TABLE "contractServices" DISABLE TRIGGER USER;
ALTER TABLE "projectServices" DISABLE TRIGGER USER;
INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId", "subTotal", "vatAmount", "totalAmount") VALUES
  (998200000000111, 998200000000101, 'Legacy foreign', 10, 1, 8, 998200000000002, 10, 1, 11),
  (998200000000112, 998200000000101, 'Legacy no rate', 5, 1, 0, 998200000000003, 5, 0, 5),
  (998200000000113, 998200000000101, 'Legacy VND, right', 1000000, 1, 8, money_base_currency_id(), 1000000, 80000, 1080000);
INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId", "subTotal", "vatAmount", "totalAmount")
VALUES (998200000000221, 998200000000203, 'Legacy foreign', 10, 8, 998200000000002, 10, 1, 11);
INSERT INTO "contractServices" (id, "contractId", "projectServiceId", "serviceName", "basePrice", quantity, vat, "currencyId", "subTotal", "vatAmount", "totalAmount") VALUES
  (998200000000211, 998200000000201, 998200000000221, 'Legacy foreign', 10, 1, 8, 998200000000002, 10, 1, 11),
  (998200000000212, 998200000000202, NULL, 'Legacy billed', 10, 1, 8, 998200000000002, 10, 1, 11),
  -- no currency on the line, the contract is in XTU: VND or XTU? decided by hand
  (998200000000213, 998200000000204, NULL, 'Legacy no currency', 1000, 1, 8, NULL, 1000, 80, 1080);
-- dev (2026-09-29): older foreign lines carry exchangeRateToBase = 1 (the
-- column's old default) and no exchangeRateDate: 1 is not a frozen rate
INSERT INTO "contractServices" (id, "contractId", "projectServiceId", "serviceName", "basePrice", quantity, vat, "currencyId", "subTotal", "vatAmount", "totalAmount", "exchangeRateToBase") VALUES
  (998200000000214, 998200000000205, NULL, 'Legacy rate 1', 10, 1, 8, 998200000000002, 10, 0.8, 10.8, 1);
-- VND lines of the billed contract BF-2: one whose stored amounts are right
-- (only its rate is missing), one whose stored total is wrong
INSERT INTO "contractServices" (id, "contractId", "serviceName", "basePrice", quantity, vat, "currencyId", "subTotal", "vatAmount", "totalAmount") VALUES
  (998200000000215, 998200000000202, 'Billed VND, right', 1000000, 1, 8, money_base_currency_id(), 1000000, 80000, 1080000),
  (998200000000216, 998200000000202, 'Billed VND, wrong', 20000000, 1, 0, money_base_currency_id(), 2, 0, 2);
ALTER TABLE "quotationServices" ENABLE TRIGGER USER;
ALTER TABLE "contractServices" ENABLE TRIGGER USER;
ALTER TABLE "projectServices" ENABLE TRIGGER USER;
INSERT INTO "paymentRequests" (id, "contractId", status, "requestedAmount") VALUES (998200000000231, 998200000000202, 'active', 11);

-- until the backfill, older rows and the documents holding them keep their numbers
DO $$
DECLARE r RECORD;
BEGIN
  -- a payment re-derives the contract's balance: its total must not become the sum of old "11"s
  INSERT INTO payments (id, amount, "paymentStatus", "paymentDate", "contractId")
  VALUES (998200000000241, 100000, 'Received', now(), 998200000000202);
  SELECT * INTO r FROM contracts WHERE id = 998200000000202;
  IF r."totalAmount" <> 282706 OR r."paymentStatus" <> 'partial' THEN
    RAISE EXCEPTION 'FAIL: a payment leaves an older contract''s total alone (got %, %)', r."totalAmount", r."paymentStatus";
  END IF;
  -- a status change on an older line leaves it as it is
  UPDATE "contractServices" SET "lineStatus" = 'pending' WHERE id = 998200000000212;
  SELECT * INTO r FROM "contractServices" WHERE id = 998200000000212;
  IF r."totalAmount" <> 11 OR r."exchangeRateToBase" IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: a status change leaves an older line alone (got %, %)', r."totalAmount", r."exchangeRateToBase";
  END IF;
  -- ... even when its currency has no rate at all (no "Missing exchange rate" on a status change)
  UPDATE "quotationServices" SET status = 'sent' WHERE id = 998200000000112;
  -- a foreign line with the default rate 1: a status change leaves it, and its
  -- contract's total is not re-summed as 1 XTU = 1 VND
  UPDATE "contractServices" SET "lineStatus" = 'pending' WHERE id = 998200000000214;
  SELECT * INTO r FROM "contractServices" WHERE id = 998200000000214;
  IF r."totalAmount" <> 10.8 THEN
    RAISE EXCEPTION 'FAIL: a status change leaves a rate-1 foreign line alone (got %)', r."totalAmount";
  END IF;
  UPDATE contracts SET status = 'execution' WHERE id = 998200000000205;
  IF (SELECT "totalAmount" FROM contracts WHERE id = 998200000000205) <> 282706 THEN
    RAISE EXCEPTION 'FAIL: a contract with a rate-1 foreign line keeps its total (got %)',
      (SELECT "totalAmount" FROM contracts WHERE id = 998200000000205);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM money_consistency_violations WHERE rule = 'missing_rate' AND record_id = 998200000000214) THEN
    RAISE EXCEPTION 'FAIL: the audit lists a rate-1 foreign line as missing its rate';
  END IF;
END $$;

DO $$
DECLARE r RECORD; n bigint;
BEGIN
  SELECT * INTO r FROM money_backfill_preview WHERE table_name = 'quotationServices' AND id = 998200000000111;
  IF r.action <> 'will fix' OR r.proposed_total <> 282706 OR r.proposed_rate <> 26176.5 OR r.stored_total <> 11 THEN
    RAISE EXCEPTION 'FAIL: the preview proposes 282706 at 26176.5 for the "11" line (got %)', r;
  END IF;
  SELECT * INTO r FROM money_backfill_preview WHERE table_name = 'contractServices' AND id = 998200000000212;
  IF r.action <> 'protected: contract already billed' THEN
    RAISE EXCEPTION 'FAIL: a billed contract line is listed as protected (got %)', r.action;
  END IF;
  SELECT * INTO r FROM money_backfill_preview WHERE table_name = 'contractServices' AND id = 998200000000213;
  IF r.action <> 'currency unknown' THEN
    RAISE EXCEPTION 'FAIL: a line without currency on an XTU contract is left for a decision (got %)', r.action;
  END IF;
  SELECT * INTO r FROM money_backfill_preview WHERE table_name = 'quotationServices' AND id = 998200000000113;
  IF r.action <> 'rate only' THEN
    RAISE EXCEPTION 'FAIL: a line whose amounts stay is listed as rate only (got %)', r.action;
  END IF;
  -- the case line is shown with the rate it will take: its contract line's (1 Sep), not the case's (20 Sep)
  SELECT * INTO r FROM money_backfill_preview WHERE table_name = 'projectServices' AND id = 998200000000221;
  IF r.proposed_rate <> 26176.5 OR r.proposed_total <> 282706 THEN
    RAISE EXCEPTION 'FAIL: the preview shows the case line at its contract line''s rate (got %, %)', r.proposed_rate, r.proposed_total;
  END IF;
  -- document totals the backfill will write
  SELECT * INTO r FROM money_backfill_totals_preview WHERE doc_table = 'contracts' AND id = 998200000000201;
  IF r.current_total IS NOT NULL OR r.proposed_total <> 282706 THEN
    RAISE EXCEPTION 'FAIL: the totals preview shows contract BF-1 going to 282706 (got %)', r;
  END IF;
  IF EXISTS (SELECT 1 FROM money_backfill_totals_preview WHERE doc_table = 'contracts' AND id IN (998200000000202, 998200000000204)) THEN
    RAISE EXCEPTION 'FAIL: a billed contract / one with a skipped line keeps its total';
  END IF;

  IF (SELECT action FROM money_backfill_preview WHERE table_name = 'contractServices' AND id = 998200000000215) <> 'rate only'
     OR (SELECT action FROM money_backfill_preview WHERE table_name = 'contractServices' AND id = 998200000000216) <> 'protected: contract already billed' THEN
    RAISE EXCEPTION 'FAIL: the preview shows a billed right VND line as rate only, a wrong one as protected';
  END IF;
  SELECT * INTO r FROM money_backfill_preview WHERE table_name = 'contractServices' AND id = 998200000000214;
  IF r.action <> 'will fix' OR r.proposed_rate <> 26176.5 OR r.proposed_total <> 282706 THEN
    RAISE EXCEPTION 'FAIL: the preview re-prices a rate-1 foreign line at 26176.5 (got %)', r;
  END IF;

  PERFORM * FROM money_backfill_run();

  -- a billed contract's VND line whose amounts are right gets its rate (1),
  -- nothing else moves; one whose stored total is wrong is left for a decision
  SELECT * INTO r FROM "contractServices" WHERE id = 998200000000215;
  IF r."exchangeRateToBase" IS DISTINCT FROM 1::float8 OR r."exchangeRateDate" IS NULL OR r."totalAmount" <> 1080000 THEN
    RAISE EXCEPTION 'FAIL: a billed contract''s right VND line gets rate 1 (got %, %, %)', r."exchangeRateToBase", r."exchangeRateDate", r."totalAmount";
  END IF;
  SELECT * INTO r FROM "contractServices" WHERE id = 998200000000216;
  IF r."exchangeRateToBase" IS NOT NULL OR r."totalAmount" <> 2 THEN
    RAISE EXCEPTION 'FAIL: a billed contract''s wrong VND line is untouched (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;

  SELECT * INTO r FROM "contractServices" WHERE id = 998200000000214;
  IF r."exchangeRateToBase" <> 26176.5 OR r."totalAmount" <> 282706 OR r."exchangeRateDate" IS NULL THEN
    RAISE EXCEPTION 'FAIL: the backfill fixes a rate-1 foreign line (got %, %, %)', r."exchangeRateToBase", r."totalAmount", r."exchangeRateDate";
  END IF;

  SELECT * INTO r FROM "contractServices" WHERE id = 998200000000213;
  IF r."exchangeRateToBase" IS NOT NULL OR r."totalAmount" <> 1080 THEN
    RAISE EXCEPTION 'FAIL: the backfill skips a line of unknown currency (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;
  IF (SELECT "totalAmount" FROM contracts WHERE id = 998200000000204) <> 1080 THEN
    RAISE EXCEPTION 'FAIL: its contract keeps its total';
  END IF;

  SELECT * INTO r FROM "quotationServices" WHERE id = 998200000000111;
  IF (r."totalAmountNative", r."totalAmount", r."exchangeRateToBase") IS DISTINCT FROM (10.8::float8, 282706::float8, 26176.5::float8) THEN
    RAISE EXCEPTION 'FAIL: the quotation line is fixed (got %, %, %)', r."totalAmountNative", r."totalAmount", r."exchangeRateToBase";
  END IF;
  IF (SELECT "totalAmount" FROM "contractServices" WHERE id = 998200000000211) <> 282706
     OR (SELECT "totalAmount" FROM "projectServices" WHERE id = 998200000000221) <> 282706 THEN
    RAISE EXCEPTION 'FAIL: the contract line and its case line are fixed and equal';
  END IF;
  SELECT * INTO r FROM "contractServices" WHERE id = 998200000000212;
  IF r."totalAmount" <> 11 OR r."exchangeRateToBase" IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: the billed contract line is untouched (got %, %)', r."totalAmount", r."exchangeRateToBase";
  END IF;
  IF (SELECT "totalAmount" FROM contracts WHERE id = 998200000000201) <> 282706 THEN
    RAISE EXCEPTION 'FAIL: the contract total is recomputed';
  END IF;

  -- everything fixed is consistent; the billed contract (202) is left for a
  -- decision by hand and shows up in the audit, its line as missing_rate
  SELECT count(*) INTO n FROM money_consistency_violations
  WHERE (record_id BETWEEN 998200000000000 AND 998200999999999 OR contract_id BETWEEN 998200000000000 AND 998200999999999)
    AND contract_id IS DISTINCT FROM 998200000000202
    AND contract_id IS DISTINCT FROM 998200000000204
    AND record_id NOT IN (998200000000202, 998200000000212, 998200000000112, 998200000000204, 998200000000213);
  IF n <> 0 THEN
    RAISE EXCEPTION 'FAIL: after the backfill the fixed documents are consistent (got % rows)', n;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM money_consistency_violations WHERE rule = 'missing_rate' AND record_id = 998200000000212) THEN
    RAISE EXCEPTION 'FAIL: the protected line stays visible in the audit';
  END IF;
  IF (SELECT action FROM money_backfill_preview WHERE table_name = 'quotationServices' AND id = 998200000000112) <> 'missing rate' THEN
    RAISE EXCEPTION 'FAIL: a line whose currency has no rate is listed as missing rate';
  END IF;

  -- the billed contract, fixed by hand once decided
  PERFORM * FROM money_backfill_contract(998200000000202);
  SELECT * INTO r FROM "contractServices" WHERE id = 998200000000212;
  IF r."totalAmount" <> 282706 OR r."exchangeRateToBase" <> 26176.5 THEN
    RAISE EXCEPTION 'FAIL: money_backfill_contract fixes a protected contract (got %, %)', r."totalAmount", r."exchangeRateToBase";
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL MONEY BACKFILL CHECKS PASSED'; END $$;
ROLLBACK;
