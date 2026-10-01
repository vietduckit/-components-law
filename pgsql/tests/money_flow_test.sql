-- ============================================================
-- Self-checking test: the database computes service-line money
-- (pgsql/money_flow_foundation.sql). BEGIN ... ROLLBACK; prints
-- "ALL MONEY FLOW CHECKS PASSED". Ids 998000000000001+.
--   psql ... -f pgsql/tests/money_flow_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/money_flow_test.sql
-- Test currencies use made-up codes (XTU, XTS, XTC), so the test never
-- depends on the real USD / SGD rates of the database it runs on.
-- ============================================================
BEGIN;

INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998000000000001, 'VND', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency") VALUES
  (998000000000002, 'XTU', 2, NULL),
  (998000000000003, 'XTS', 2, NULL),
  (998000000000004, 'XTC', 2, NULL);
-- XTS only has an older VND -> XTS row (new ones are refused by
-- pgsql/currency_catalog.sql; the lookup still reads the old ones)
ALTER TABLE "exchangeRates" DISABLE TRIGGER USER;
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status) VALUES
  (998000000000011, 998000000000002, money_base_currency_id(), 26176.5, '2026-08-18T09:18:17Z', NULL),
  (998000000000012, 998000000000002, money_base_currency_id(), 26000, '2026-09-10T03:00:00Z', NULL),
  (998000000000013, money_base_currency_id(), 998000000000003, 0.00005, '2026-08-18T08:57:57Z', NULL);
ALTER TABLE "exchangeRates" ENABLE TRIGGER USER;

-- ---- A. the base currency (VND found by flag, else by code) ----
DO $$
DECLARE v_base bigint := money_base_currency_id();
BEGIN
  IF v_base IS NULL OR (SELECT upper(code) FROM currencies WHERE id = v_base) <> 'VND' THEN
    RAISE EXCEPTION 'FAIL: the base currency is VND';
  END IF;
  IF money_decimals(v_base) <> 0 OR money_decimals(NULL) <> 0 OR money_decimals(998000000000002) <> 2 THEN
    RAISE EXCEPTION 'FAIL: VND rounds to whole dong, XTU to cents';
  END IF;
  IF NOT money_is_base(NULL) OR money_is_base(998000000000002) THEN
    RAISE EXCEPTION 'FAIL: a line without a currency is in VND';
  END IF;
  IF money_currency_code(998000000000002) <> 'XTU' OR money_currency_code(NULL) <> 'VND' THEN
    RAISE EXCEPTION 'FAIL: currency codes';
  END IF;
END $$;

-- ---- B. service lines: the database computes every amount ----
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES
  (998000000000101, 'line', '2026-09-01T02:00:00Z'),
  (998000000000102, 'package', '2026-09-01T02:00:00Z'),
  (998000000000103, 'line', '2026-09-01T02:00:00Z');
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt")
VALUES (998000000000201, 'MF-1', 'Money flow', 'byCase', 'line', 'draft', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt")
VALUES (998000000000202, 998000000000201, 'in_progress', '2026-09-20T02:00:00Z');

DO $$
DECLARE r RECORD; v_base bigint := money_base_currency_id();
BEGIN
  -- the form sends its own (wrong) amounts: 10 XTU + 8% saved as 11
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId", "subTotal", "vatAmount", "totalAmount")
  VALUES (998000000000111, 998000000000101, 'Foreign line', 10, 1, 8, 998000000000002, 10, 1, 11);
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000111;
  IF (r."subTotalNative", r."vatAmountNative", r."totalAmountNative") IS DISTINCT FROM (10::float8, 0.8::float8, 10.8::float8) THEN
    RAISE EXCEPTION 'FAIL: native 10 / 0.80 / 10.80 (got %, %, %)', r."subTotalNative", r."vatAmountNative", r."totalAmountNative";
  END IF;
  IF r."exchangeRateToBase" <> 26176.5 OR r."exchangeRateDate" <> DATE '2026-08-18' THEN
    RAISE EXCEPTION 'FAIL: the rate of the quotation date (got %, %)', r."exchangeRateToBase", r."exchangeRateDate";
  END IF;
  IF (r."subTotal", r."vatAmount", r."totalAmount") IS DISTINCT FROM (261765::float8, 20941::float8, 282706::float8) THEN
    RAISE EXCEPTION 'FAIL: VND 261765 + 20941 = 282706 (got %, %, %)', r."subTotal", r."vatAmount", r."totalAmount";
  END IF;

  -- the reference rate is corrected afterwards and the client re-sends its
  -- own rate: editing the price keeps the frozen rate
  UPDATE "exchangeRates" SET rate = 99999 WHERE id = 998000000000011;
  UPDATE "quotationServices" SET "basePrice" = 20, "exchangeRateToBase" = 12345 WHERE id = 998000000000111;
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000111;
  IF r."exchangeRateToBase" <> 26176.5 OR r."totalAmount" <> 565412 THEN
    RAISE EXCEPTION 'FAIL: an edit keeps the frozen rate (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;
  UPDATE "exchangeRates" SET rate = 26176.5 WHERE id = 998000000000011;

  -- another currency freezes a new rate (XTS: inverse pair, 1 / 0.00005)
  UPDATE "quotationServices" SET "currencyId" = 998000000000003 WHERE id = 998000000000111;
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000111;
  IF r."exchangeRateToBase" <> 20000 OR r."totalAmount" <> 432000 THEN
    RAISE EXCEPTION 'FAIL: a new currency re-freezes (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;

  -- quantity 2 and 4% VAT
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId")
  VALUES (998000000000112, 998000000000101, 'Translation', 120.5, 2, 4, 998000000000002);
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000112;
  IF (r."totalAmountNative", r."subTotal", r."vatAmount", r."totalAmount")
     IS DISTINCT FROM (250.64::float8, 6308537::float8, 252341::float8, 6560878::float8) THEN
    RAISE EXCEPTION 'FAIL: 120.50 x 2 + 4%% (got %, %, %, %)', r."totalAmountNative", r."subTotal", r."vatAmount", r."totalAmount";
  END IF;

  -- a VND line: rate 1, native = VND
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId")
  VALUES (998000000000113, 998000000000101, 'Local work', 1000000, 1, 8, v_base);
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000113;
  IF r."exchangeRateToBase" <> 1 OR r."totalAmountNative" <> 1080000 OR r."totalAmount" <> 1080000 THEN
    RAISE EXCEPTION 'FAIL: a VND line (got %, %, %)', r."exchangeRateToBase", r."totalAmountNative", r."totalAmount";
  END IF;

  -- a row without a price (older rows) is left as it is
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "totalAmount")
  VALUES (998000000000114, 998000000000103, 'Legacy', 5000);
  IF (SELECT "totalAmount" FROM "quotationServices" WHERE id = 998000000000114) <> 5000 THEN
    RAISE EXCEPTION 'FAIL: an unpriced row is left alone';
  END IF;

  -- a combo (package) line: rate 1, natives mirror the package amounts, line amounts stay 0
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", "pricingMode",
                                   "packageSubTotal", "packageVatAmount", "packageTotalAmount", "totalAmount")
  VALUES (998000000000115, 998000000000102, 'In combo', 0, 'package', 1000000, 80000, 1080000, 0);
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000115;
  IF r."exchangeRateToBase" <> 1 OR r."totalAmountNative" <> 1080000 OR r."totalAmount" <> 0 THEN
    RAISE EXCEPTION 'FAIL: a package line (got %, %, %)', r."exchangeRateToBase", r."totalAmountNative", r."totalAmount";
  END IF;

  -- no rate at all for the currency: the save is refused with a clear message
  BEGIN
    INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", vat, "currencyId")
    VALUES (998000000000116, 998000000000101, 'No rate', 5, 0, 998000000000004);
    RAISE EXCEPTION 'FAIL: a line with no rate must not save';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Missing exchange rate XTC->VND for service "No rate"%' THEN
      RAISE;
    END IF;
  END;

  -- a contract line: the rate of the contract date (not signed yet: its creation)
  INSERT INTO "contractServices" (id, "contractId", "serviceName", "basePrice", quantity, vat, "currencyId")
  VALUES (998000000000211, 998000000000201, 'Foreign line', 10, 1, 8, 998000000000002);
  SELECT * INTO r FROM "contractServices" WHERE id = 998000000000211;
  IF r."exchangeRateToBase" <> 26176.5 OR r."totalAmount" <> 282706 THEN
    RAISE EXCEPTION 'FAIL: the rate of the contract date (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;

  -- a case line not linked yet: the rate of the case date
  INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000221, 998000000000202, 'Foreign line', 10, 8, 998000000000002);
  SELECT * INTO r FROM "projectServices" WHERE id = 998000000000221;
  IF r."exchangeRateToBase" <> 26000 OR r."totalAmount" <> 280800 THEN
    RAISE EXCEPTION 'FAIL: the rate of the case date (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;

  -- linked to the contract line: the case line takes its rate, so both have the same VND
  UPDATE "contractServices" SET "projectServiceId" = 998000000000221 WHERE id = 998000000000211;
  SELECT * INTO r FROM "projectServices" WHERE id = 998000000000221;
  IF r."exchangeRateToBase" <> 26176.5 OR r."totalAmount" <> 282706 THEN
    RAISE EXCEPTION 'FAIL: the case line inherits the contract rate (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;

  -- linking a case line to a contract line in another currency: since the
  -- service threads (pgsql/service_thread_sync.sql) they are one service, the
  -- case line takes the contract line's content, currency included
  INSERT INTO "contractServices" (id, "contractId", "serviceName", "basePrice", quantity, vat, "currencyId")
  VALUES (998000000000212, 998000000000201, 'Local work', 500000, 1, 8, v_base);
  INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000222, 998000000000202, 'Other currency', 10, 8, 998000000000002);
  UPDATE "contractServices" SET "projectServiceId" = 998000000000222 WHERE id = 998000000000212;
  SELECT * INTO r FROM "projectServices" WHERE id = 998000000000222;
  IF NOT money_is_base(r."currencyId") OR r."totalAmount" <> 540000 THEN
    RAISE EXCEPTION 'FAIL: a linked case line takes its contract line''s content (got %, %)', r."currencyId", r."totalAmount";
  END IF;
END $$;

-- ---- C. document totals follow their lines ----
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998000000000104, 'line', '2026-09-01T02:00:00Z');
DO $$
DECLARE r RECORD; v_base bigint := money_base_currency_id(); v_events bigint;
BEGIN
  -- quotation 101: 111 (400000 + 32000), 112 (6308537 + 252341), 113 (1000000 + 80000)
  SELECT * INTO r FROM quotations WHERE id = 998000000000101;
  IF (r."subTotal", r."totalAmount") IS DISTINCT FROM (7708537::float8, 8072878::float8) THEN
    RAISE EXCEPTION 'FAIL: quotation = sum of its lines (got %, %)', r."subTotal", r."totalAmount";
  END IF;
  UPDATE quotations SET "totalAmount" = 1 WHERE id = 998000000000101;
  IF (SELECT "totalAmount" FROM quotations WHERE id = 998000000000101) <> 8072878 THEN
    RAISE EXCEPTION 'FAIL: a total written by the form is replaced by the sum of the lines';
  END IF;
  DELETE FROM "quotationServices" WHERE id = 998000000000113;
  SELECT * INTO r FROM quotations WHERE id = 998000000000101;
  IF (r."subTotal", r."totalAmount") IS DISTINCT FROM (6708537::float8, 6992878::float8) THEN
    RAISE EXCEPTION 'FAIL: a deleted line leaves the total (got %, %)', r."subTotal", r."totalAmount";
  END IF;

  -- a combo quotation keeps what the form wrote
  UPDATE quotations SET "totalAmount" = 1234 WHERE id = 998000000000102;
  IF (SELECT "totalAmount" FROM quotations WHERE id = 998000000000102) <> 1234 THEN
    RAISE EXCEPTION 'FAIL: a combo quotation keeps its own total';
  END IF;

  -- a quotation that still has an older unpriced row is left alone
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000117, 998000000000103, 'Priced', 100, 0, v_base);
  UPDATE quotations SET "totalAmount" = 777 WHERE id = 998000000000103;
  IF (SELECT "totalAmount" FROM quotations WHERE id = 998000000000103) <> 777 THEN
    RAISE EXCEPTION 'FAIL: a document with unpriced rows keeps its own total';
  END IF;

  -- removing the last service leaves a zero total
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000118, 998000000000104, 'Only one', 100, 0, v_base);
  IF (SELECT "totalAmount" FROM quotations WHERE id = 998000000000104) <> 100 THEN
    RAISE EXCEPTION 'FAIL: a single line makes the total';
  END IF;
  DELETE FROM "quotationServices" WHERE id = 998000000000118;
  IF (SELECT "totalAmount" FROM quotations WHERE id = 998000000000104) <> 0 THEN
    RAISE EXCEPTION 'FAIL: no line left -> total 0';
  END IF;

  -- contract 201: 211 (261765 + 20941), 212 (500000 + 40000); its balance follows (no payment yet)
  SELECT * INTO r FROM contracts WHERE id = 998000000000201;
  IF (r."subTotal", r."vatAmount", r."totalAmount") IS DISTINCT FROM (761765::float8, 60941::float8, 822706::float8) THEN
    RAISE EXCEPTION 'FAIL: contract = sum of its lines (got %, %, %)', r."subTotal", r."vatAmount", r."totalAmount";
  END IF;
  IF r."outStandingAmount" <> 822706 THEN
    RAISE EXCEPTION 'FAIL: the contract balance follows its total (got %)', r."outStandingAmount";
  END IF;
  -- touching the header raises no finance notification
  SELECT count(*) INTO v_events FROM "financeNotificationEvents";
  UPDATE contracts SET "totalAmount" = 1 WHERE id = 998000000000201;
  IF (SELECT "totalAmount" FROM contracts WHERE id = 998000000000201) <> 822706 THEN
    RAISE EXCEPTION 'FAIL: the contract total is the sum of its lines';
  END IF;
  IF (SELECT count(*) FROM "financeNotificationEvents") <> v_events THEN
    RAISE EXCEPTION 'FAIL: recomputing a total queues no notification';
  END IF;

  -- case 202: 221 (282706) + 222 (540000, the content of its contract line 212)
  IF (SELECT "totalAmount" FROM projects WHERE id = 998000000000202) <> 822706 THEN
    RAISE EXCEPTION 'FAIL: case = sum of its own services';
  END IF;
  UPDATE projects SET "totalAmount" = 1 WHERE id = 998000000000202;
  IF (SELECT "totalAmount" FROM projects WHERE id = 998000000000202) <> 822706 THEN
    RAISE EXCEPTION 'FAIL: a copied contract total is replaced by the case''s own sum';
  END IF;
END $$;

-- ---- D. signing re-freezes the contract's foreign lines, unless it is already billed ----
DO $$
DECLARE r RECORD;
BEGIN
  UPDATE contracts SET "signedAt" = '2026-09-15T02:00:00Z' WHERE id = 998000000000201;
  SELECT * INTO r FROM "contractServices" WHERE id = 998000000000211;
  IF r."exchangeRateToBase" <> 26000 OR r."totalAmount" <> 280800 THEN
    RAISE EXCEPTION 'FAIL: signing freezes the rate of the signing date (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;
  IF (SELECT "totalAmount" FROM "projectServices" WHERE id = 998000000000221) <> 280800 THEN
    RAISE EXCEPTION 'FAIL: the case line follows its contract line';
  END IF;
  IF (SELECT "totalAmount" FROM contracts WHERE id = 998000000000201) <> 820800 THEN
    RAISE EXCEPTION 'FAIL: the contract total follows the re-frozen line';
  END IF;

  -- once a request is active, signing again moves nothing
  INSERT INTO "paymentRequests" (id, "contractId", status, "requestedAmount")
  VALUES (998000000000231, 998000000000201, 'active', 100);
  UPDATE contracts SET "signedAt" = '2026-09-01T02:00:00Z' WHERE id = 998000000000201;
  IF (SELECT "exchangeRateToBase" FROM "contractServices" WHERE id = 998000000000211) <> 26000 THEN
    RAISE EXCEPTION 'FAIL: a billed contract keeps its rates';
  END IF;
  DELETE FROM "paymentRequests" WHERE id = 998000000000231;
END $$;

-- ---- E. installments add up to the contract total exactly ----
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt")
VALUES (998000000000301, 'MF-2', 'Installments', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
DO $$
DECLARE v_base bigint := money_base_currency_id(); v_amounts numeric[];
BEGIN
  INSERT INTO "contractServices" (id, "contractId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000311, 998000000000301, 'Work', 10000001, 0, v_base);
  -- the form saved amounts that miss the total by one đồng
  INSERT INTO "contractPaymentSchedules" (id, "contractId", "installmentNo", label, percentage, amount, "triggerType") VALUES
    (998000000000321, 998000000000301, 1, 'Đợt 1', 30, 3000000, 'on_task_done'),
    (998000000000322, 998000000000301, 2, 'Đợt 2', 30, 3000000, 'on_task_done'),
    (998000000000323, 998000000000301, 3, 'Đợt 3', 40, 4000000, 'on_task_done');
  PERFORM money_refresh_schedule(998000000000301);
  SELECT array_agg(amount::numeric ORDER BY "installmentNo") INTO v_amounts
  FROM "contractPaymentSchedules" WHERE "contractId" = 998000000000301;
  IF v_amounts IS DISTINCT FROM ARRAY[3000000, 3000000, 4000001]::numeric[] THEN
    RAISE EXCEPTION 'FAIL: 30/30/40 of 10000001 (got %)', v_amounts;
  END IF;
  IF (SELECT "requestedAmount" FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 998000000000323) <> 4000001 THEN
    RAISE EXCEPTION 'FAIL: a pending request follows its installment';
  END IF;

  -- the contract total changes: the installments follow
  UPDATE "contractServices" SET "basePrice" = 20000000 WHERE id = 998000000000311;
  SELECT array_agg(amount::numeric ORDER BY "installmentNo") INTO v_amounts
  FROM "contractPaymentSchedules" WHERE "contractId" = 998000000000301;
  IF v_amounts IS DISTINCT FROM ARRAY[6000000, 6000000, 8000000]::numeric[] THEN
    RAISE EXCEPTION 'FAIL: installments follow the contract total (got %)', v_amounts;
  END IF;

  -- a billed installment keeps its amount; the others share what is left
  UPDATE "paymentRequests" SET status = 'active' WHERE "contractPaymentScheduleId" = 998000000000321;
  -- a billed contract's services are locked (pgsql/service_thread_sync.sql):
  -- this stands for a correction made by an administrator in the database
  PERFORM set_config('money.thread_sync', 'on', true);
  UPDATE "contractServices" SET "basePrice" = 10000000 WHERE id = 998000000000311;
  PERFORM set_config('money.thread_sync', 'off', true);
  SELECT array_agg(amount::numeric ORDER BY "installmentNo") INTO v_amounts
  FROM "contractPaymentSchedules" WHERE "contractId" = 998000000000301;
  IF v_amounts IS DISTINCT FROM ARRAY[6000000, 1714286, 2285714]::numeric[] THEN
    RAISE EXCEPTION 'FAIL: a billed installment is kept, the rest shares 4000000 (got %)', v_amounts;
  END IF;
  IF (SELECT "requestedAmount" FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 998000000000322) <> 1714286 THEN
    RAISE EXCEPTION 'FAIL: the pending request of installment 2 follows';
  END IF;
  IF (SELECT "requestedAmount" FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 998000000000321) <> 6000000 THEN
    RAISE EXCEPTION 'FAIL: the active request keeps its amount';
  END IF;
END $$;

-- ---- F. review fixes ----
-- I1: the contract total Finance reads (contract_resolved_total falls back to
-- fixedAmount) follows the lines too, down to 0 when the last one goes
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "fixedAmount", "createdAt")
VALUES (998000000000401, 'MF-3', 'Fixed amount', 'byCase', 'line', 'execution', 1080000, '2026-09-01T02:00:00Z');
-- I4: a case line not linked to a contract is priced on the case's own date (the form's "Open date")
INSERT INTO projects (id, status, date, "createdAt")
VALUES (998000000000402, 'in_progress', '2026-09-05T02:00:00Z', '2026-09-20T02:00:00Z');
DO $$
DECLARE v_base bigint := money_base_currency_id();
BEGIN
  INSERT INTO "contractServices" (id, "contractId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000411, 998000000000401, 'Only one', 1000000, 8, v_base);
  IF (SELECT "fixedAmount" FROM contracts WHERE id = 998000000000401) <> 1080000 THEN
    RAISE EXCEPTION 'FAIL: fixedAmount follows the lines';
  END IF;
  UPDATE "contractServices" SET "basePrice" = 2000000 WHERE id = 998000000000411;
  IF contract_resolved_total(998000000000401) <> 2160000 THEN
    RAISE EXCEPTION 'FAIL: the resolved total follows an edited line (got %)', contract_resolved_total(998000000000401);
  END IF;
  DELETE FROM "contractServices" WHERE id = 998000000000411;
  IF contract_resolved_total(998000000000401) <> 0 THEN
    RAISE EXCEPTION 'FAIL: no service left -> the contract Finance reads is 0 (got %)', contract_resolved_total(998000000000401);
  END IF;

  INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000421, 998000000000402, 'Open-dated', 10, 8, 998000000000002);
  IF (SELECT "exchangeRateToBase" FROM "projectServices" WHERE id = 998000000000421) <> 26176.5 THEN
    RAISE EXCEPTION 'FAIL: the rate of the case''s own date, 5 Sep (got %)',
      (SELECT "exchangeRateToBase" FROM "projectServices" WHERE id = 998000000000421);
  END IF;
END $$;

-- ---- G. second review fixes ----
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt") VALUES
  (998000000000501, 'MF-4', 'Typed total', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z'),
  (998000000000601, 'MF-5', 'Billed', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt")
VALUES (998000000000602, 998000000000601, 'in_progress', '2026-09-20T02:00:00Z');
DO $$
DECLARE r RECORD; v_base bigint := money_base_currency_id(); v_amounts numeric[]; v_pr bigint;
BEGIN
  -- installments saved after the lines, split by the form from a typed
  -- 9,000,000: the database splits its own 10,000,000 once they add up to 100%
  INSERT INTO "contractServices" (id, "contractId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000511, 998000000000501, 'Work', 10000000, 0, v_base);
  INSERT INTO "contractPaymentSchedules" (id, "contractId", "installmentNo", label, percentage, amount, "triggerType") VALUES
    (998000000000521, 998000000000501, 1, 'Đợt 1', 30, 2700000, 'on_task_done'),
    (998000000000522, 998000000000501, 2, 'Đợt 2', 30, 2700000, 'on_task_done'),
    (998000000000523, 998000000000501, 3, 'Đợt 3', 40, 3600000, 'on_task_done');
  SELECT array_agg(amount::numeric ORDER BY "installmentNo") INTO v_amounts
  FROM "contractPaymentSchedules" WHERE "contractId" = 998000000000501;
  IF v_amounts IS DISTINCT FROM ARRAY[3000000, 3000000, 4000000]::numeric[] THEN
    RAISE EXCEPTION 'FAIL: installments saved after the lines split the contract total (got %)', v_amounts;
  END IF;
  SELECT id INTO v_pr FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 998000000000523;
  IF (SELECT "requestedAmount" FROM "paymentRequests" WHERE id = v_pr) <> 4000000
     OR (SELECT sum("requestedAmount") FROM "paymentRequestItems" WHERE "paymentRequestId" = v_pr) <> 4000000 THEN
    RAISE EXCEPTION 'FAIL: the pending request of a new installment follows it';
  END IF;

  -- a pending request of two items: the items share its amount, not each get it
  INSERT INTO "paymentRequestItems" (id, "paymentRequestId", "contractId", "lineType", "requestedAmount")
  VALUES (998000000000531, v_pr, 998000000000501, 'schedule_installment', 0);
  UPDATE "paymentRequestItems" SET "requestedAmount" = 1000000 WHERE "paymentRequestId" = v_pr;
  UPDATE "contractServices" SET "basePrice" = 20000000 WHERE id = 998000000000511;
  SELECT array_agg("requestedAmount"::numeric ORDER BY id) INTO v_amounts
  FROM "paymentRequestItems" WHERE "paymentRequestId" = v_pr;
  IF v_amounts IS DISTINCT FROM ARRAY[4000000, 4000000]::numeric[] THEN
    RAISE EXCEPTION 'FAIL: two items share their request''s 8000000 (got %)', v_amounts;
  END IF;

  -- a draft request has billed nothing: installments still follow
  UPDATE "paymentRequests" SET status = 'draft' WHERE "contractPaymentScheduleId" = 998000000000521;
  IF money_contract_billing_locked(998000000000501) THEN
    RAISE EXCEPTION 'FAIL: a draft request does not lock the contract';
  END IF;

  -- a billed contract: asking for a re-freeze (rate -> NULL) keeps its rate,
  -- and so does its case line
  INSERT INTO "contractServices" (id, "contractId", "serviceName", "basePrice", vat, "currencyId", "projectServiceId")
  VALUES (998000000000611, 998000000000601, 'Billed line', 10, 8, 998000000000002, 998000000000621);
  INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000621, 998000000000602, 'Billed line', 10, 8, 998000000000002);
  UPDATE "contractServices" SET "projectServiceId" = 998000000000621 WHERE id = 998000000000611;
  INSERT INTO "paymentRequests" (id, "contractId", status, "requestedAmount")
  VALUES (998000000000631, 998000000000601, 'active', 100);
END $$;
DO $$
DECLARE r RECORD;
BEGIN
  -- a newer rate would be picked by a re-freeze
  INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status)
  VALUES (998000000000641, 998000000000002, money_base_currency_id(), 20000, '2026-08-20T03:00:00Z', NULL);
  UPDATE "contractServices" SET "exchangeRateToBase" = NULL WHERE id = 998000000000611;
  IF (SELECT "exchangeRateToBase" FROM "contractServices" WHERE id = 998000000000611) <> 26176.5 THEN
    RAISE EXCEPTION 'FAIL: a billed contract line keeps its rate (got %)',
      (SELECT "exchangeRateToBase" FROM "contractServices" WHERE id = 998000000000611);
  END IF;
  UPDATE "projectServices" SET "exchangeRateToBase" = NULL WHERE id = 998000000000621;
  IF (SELECT "exchangeRateToBase" FROM "projectServices" WHERE id = 998000000000621) <> 26176.5 THEN
    RAISE EXCEPTION 'FAIL: a billed contract''s case line keeps its rate';
  END IF;
  DELETE FROM "exchangeRates" WHERE id = 998000000000641;

  -- a combo line switched to line pricing freezes a real rate (not the combo's 1)
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", vat, "currencyId", "pricingMode")
  VALUES (998000000000651, 998000000000103, 'Was combo', 10, 8, 998000000000002, 'package');
  UPDATE "quotationServices" SET "pricingMode" = 'line' WHERE id = 998000000000651;
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000651;
  IF r."exchangeRateToBase" <> 26176.5 OR r."totalAmount" <> 282706 THEN
    RAISE EXCEPTION 'FAIL: package -> line re-freezes (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;
END $$;
-- a database whose projects have no "date" column still prices case lines
ALTER TABLE projects RENAME COLUMN date TO date_renamed;
DO $$
BEGIN
  INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000661, 998000000000402, 'No date column', 10, 8, 998000000000002);
  IF (SELECT "exchangeRateToBase" FROM "projectServices" WHERE id = 998000000000661) <> 26000 THEN
    RAISE EXCEPTION 'FAIL: without projects.date the case''s createdAt (20 Sep) prices it';
  END IF;
END $$;
ALTER TABLE projects RENAME COLUMN date_renamed TO date;

DO $$ BEGIN RAISE NOTICE 'ALL MONEY FLOW CHECKS PASSED'; END $$;
ROLLBACK;
