-- ============================================================
-- Self-checking test: exchange-rate rules and company price currencies
-- (pgsql/currency_catalog.sql).
-- BEGIN ... ROLLBACK; prints "ALL CURRENCY CATALOG CHECKS PASSED". Ids 998500000000001+.
--   psql ... -f pgsql/tests/currency_catalog_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/currency_catalog_test.sql
-- ============================================================
BEGIN;
INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998500000000001, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces") VALUES (998500000000002, 'XTU', 2), (998500000000003, 'XTS', 2);

-- ---- A. rates are entered as 1 foreign unit = x VND, and positive
DO $$
DECLARE v_msg text;
BEGIN
  INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate")
  VALUES (998500000000011, 998500000000002, money_base_currency_id(), 26176.5, now() - interval '5 days');
  BEGIN
    INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate")
    VALUES (998500000000012, money_base_currency_id(), 998500000000002, 0.0000382, now());
    RAISE EXCEPTION 'FAIL A: a VND -> foreign rate must be refused';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg NOT LIKE '%foreign currency to VND%' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate")
    VALUES (998500000000013, 998500000000002, money_base_currency_id(), 0, now());
    RAISE EXCEPTION 'FAIL A: a rate of 0 must be refused';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg NOT LIKE '%greater than 0%' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate")
    VALUES (998500000000014, 998500000000002, 998500000000003, 1.3, now());
    RAISE EXCEPTION 'FAIL A: a foreign -> foreign rate must be refused';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg LIKE 'FAIL%' THEN RAISE; END IF;
  END;
END $$;

-- ---- B. the fix: wrong-direction rates go (when a right one exists), company prices get their currency
-- older rows, written with the guard off
ALTER TABLE "exchangeRates" DISABLE TRIGGER USER;
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate") VALUES
  -- 1 XTU = 2.6 VND: the inverse row of dev, 10,000 times off
  (998500000000021, money_base_currency_id(), 998500000000002, 0.3820220426718622, now() - interval '5 days'),
  -- XTS has only an inverse row: kept and listed
  (998500000000022, money_base_currency_id(), 998500000000003, 0.00005, now() - interval '60 days');
ALTER TABLE "exchangeRates" ENABLE TRIGGER USER;
INSERT INTO services (id, "serviceName", "basePrice", "currencyId") VALUES
  (998500000000101, 'IRC', 950, 998500000000002),
  (998500000000102, 'Local', 2000000, money_base_currency_id()),
  (998500000000103, 'No catalog price', 0, 998500000000002);
INSERT INTO "companyServices" (id, "serviceId", price) VALUES
  (998500000000201, 998500000000101, 25000000),  -- a VND price for an XTU service
  (998500000000202, 998500000000101, 1000),      -- an XTU price
  (998500000000203, 998500000000102, 2500000),   -- a VND service
  (998500000000204, 998500000000103, 150000),    -- no catalog price: large -> VND
  (998500000000205, 998500000000103, 80);        -- no catalog price: small -> XTU

CREATE TEMP TABLE cc_result AS SELECT * FROM currency_catalog_fix_run();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "exchangeRates" WHERE id = 998500000000021) THEN
    RAISE EXCEPTION 'FAIL B: a wrong-direction rate with a right-direction one is deleted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "exchangeRates" WHERE id = 998500000000022)
     OR NOT EXISTS (SELECT 1 FROM cc_result WHERE record_id = 998500000000022 AND step LIKE '%kept%') THEN
    RAISE EXCEPTION 'FAIL B: an inverse rate that is the only rate is kept and listed';
  END IF;
  IF (SELECT "currencyId" FROM "companyServices" WHERE id = 998500000000201) IS DISTINCT FROM money_base_currency_id()
     OR (SELECT "currencyId" FROM "companyServices" WHERE id = 998500000000202) <> 998500000000002
     OR (SELECT "currencyId" FROM "companyServices" WHERE id = 998500000000203) IS DISTINCT FROM money_base_currency_id()
     OR (SELECT "currencyId" FROM "companyServices" WHERE id = 998500000000204) IS DISTINCT FROM money_base_currency_id()
     OR (SELECT "currencyId" FROM "companyServices" WHERE id = 998500000000205) <> 998500000000002 THEN
    RAISE EXCEPTION 'FAIL B: company prices get their currency (got %)',
      (SELECT string_agg(id || '=' || COALESCE(money_currency_code("currencyId"), 'NULL'), ', ' ORDER BY id)
       FROM "companyServices" WHERE id BETWEEN 998500000000201 AND 998500000000205);
  END IF;
  -- only this test's rows: on a real database the fix also lists real company prices
  IF (SELECT count(*) FROM cc_result WHERE step = 'company price currency'
        AND record_id BETWEEN 998500000000201 AND 998500000000205) <> 5 THEN
    RAISE EXCEPTION 'FAIL B: each filled company price is listed';
  END IF;
END $$;

-- ---- C. a rate older than 30 days (or none at all) is warned about
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM money_rate_warnings WHERE currency = 'XTS') THEN
    RAISE EXCEPTION 'FAIL C: XTS (no usable XTS -> VND rate) is warned about';
  END IF;
  IF EXISTS (SELECT 1 FROM money_rate_warnings WHERE currency = 'XTU') THEN
    RAISE EXCEPTION 'FAIL C: XTU (a 5-day-old rate) is fine';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL CURRENCY CATALOG CHECKS PASSED'; END $$;
ROLLBACK;
