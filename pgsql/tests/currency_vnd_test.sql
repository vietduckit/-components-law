-- ============================================================
-- Self-checking test: VND values stored next to foreign prices
-- (basePriceVnd on service lines — pgsql/money_flow_foundation.sql; catalog
-- VND at the latest rate — pgsql/currency_catalog.sql).
-- BEGIN ... ROLLBACK; prints "ALL CURRENCY VND CHECKS PASSED". Ids 998600000000001+.
--   bash scripts/tests/sql/run-local.sh pgsql/tests/currency_vnd_test.sql
-- ============================================================
BEGIN;
INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998600000000001, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces") VALUES (998600000000002, 'XTU', 2), (998600000000003, 'XTN', 2);
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate")
VALUES (998600000000011, 998600000000002, money_base_currency_id(), 26176.5, '2026-08-18T09:18:17Z');
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998600000000101, 'line', '2026-09-01T02:00:00Z');

-- ---- A. a service line keeps its foreign price and stores its unit price in VND (frozen rate)
INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId") VALUES
  (998600000000111, 998600000000101, 'Foreign', 10, 2, 8, 998600000000002),
  (998600000000112, 998600000000101, 'Local', 1500000, 1, 8, money_base_currency_id());
DO $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM "quotationServices" WHERE id = 998600000000111;
  IF (r."basePrice", r."basePriceVnd", r."totalAmount") IS DISTINCT FROM (10::float8, 261765::float8, 565412::float8) THEN
    RAISE EXCEPTION 'FAIL A: 10 XTU x 2 + 8%%: unit price 261765 VND stored, total 565412 (got %, %, %)', r."basePrice", r."basePriceVnd", r."totalAmount";
  END IF;
  IF (SELECT "basePriceVnd" FROM "quotationServices" WHERE id = 998600000000112) <> 1500000 THEN
    RAISE EXCEPTION 'FAIL A: a VND line''s unit price in VND is its price';
  END IF;
END $$;

-- ---- B. the catalog stores VND at the latest rate
INSERT INTO services (id, "serviceName", "basePrice", "currencyId") VALUES
  (998600000000201, 'IRC', 10, 998600000000002),
  (998600000000202, 'Local', 2000000, money_base_currency_id()),
  (998600000000203, 'No rate', 5, 998600000000003);
INSERT INTO "companyServices" (id, "serviceId", price, "currencyId") VALUES
  (998600000000301, 998600000000201, 12, 998600000000002),
  (998600000000302, 998600000000201, 25000000, money_base_currency_id());
INSERT INTO "serviceCombos" (id, "comboName", "packageSubTotal", "totalAmount", "currencyId")
VALUES (998600000000401, 'Combo', 100, 108, 998600000000002);
INSERT INTO "serviceComboItems" (id, "comboId", "serviceId", price, "currencyId")
VALUES (998600000000501, 998600000000401, 998600000000201, 20, 998600000000002);
DO $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM services WHERE id = 998600000000201;
  IF (r."basePriceVnd", r."exchangeRateToBase") IS DISTINCT FROM (261765::float8, 26176.5::float8) OR r."exchangeRateDate" IS NULL THEN
    RAISE EXCEPTION 'FAIL B: a 10 XTU service stores 261765 VND and its rate (got %, %, %)', r."basePriceVnd", r."exchangeRateToBase", r."exchangeRateDate";
  END IF;
  IF (SELECT "basePriceVnd" FROM services WHERE id = 998600000000202) <> 2000000 THEN
    RAISE EXCEPTION 'FAIL B: a VND service stores its price';
  END IF;
  IF (SELECT "basePriceVnd" FROM services WHERE id = 998600000000203) IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL B: a currency without a rate stores no VND (the rate warnings list it)';
  END IF;
  IF (SELECT "priceVnd" FROM "companyServices" WHERE id = 998600000000301) <> 314118
     OR (SELECT "priceVnd" FROM "companyServices" WHERE id = 998600000000302) <> 25000000 THEN
    RAISE EXCEPTION 'FAIL B: company prices store VND';
  END IF;
  SELECT * INTO r FROM "serviceCombos" WHERE id = 998600000000401;
  IF (r."packageSubTotalVnd", r."totalAmountVnd") IS DISTINCT FROM (2617650::float8, 2827062::float8) THEN
    RAISE EXCEPTION 'FAIL B: a combo stores its package price and total in VND (got %, %)', r."packageSubTotalVnd", r."totalAmountVnd";
  END IF;
  IF (SELECT "priceVnd" FROM "serviceComboItems" WHERE id = 998600000000501) <> 523530 THEN
    RAISE EXCEPTION 'FAIL B: a combo item stores its price in VND';
  END IF;
  -- a price edit re-converts
  UPDATE services SET "basePrice" = 20 WHERE id = 998600000000201;
  IF (SELECT "basePriceVnd" FROM services WHERE id = 998600000000201) <> 523530 THEN
    RAISE EXCEPTION 'FAIL B: an edited price is converted again';
  END IF;
END $$;

-- ---- C. a new rate re-converts the catalog; documents keep their frozen rate
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate")
VALUES (998600000000012, 998600000000002, money_base_currency_id(), 27000, now());
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate")
VALUES (998600000000013, 998600000000003, money_base_currency_id(), 30000, now());
DO $$
BEGIN
  IF (SELECT "basePriceVnd" FROM services WHERE id = 998600000000201) <> 540000
     OR (SELECT "exchangeRateToBase" FROM services WHERE id = 998600000000201) <> 27000 THEN
    RAISE EXCEPTION 'FAIL C: a new XTU rate re-converts the catalog (got %)', (SELECT "basePriceVnd" FROM services WHERE id = 998600000000201);
  END IF;
  IF (SELECT "priceVnd" FROM "companyServices" WHERE id = 998600000000301) <> 324000
     OR (SELECT "priceVnd" FROM "serviceComboItems" WHERE id = 998600000000501) <> 540000
     OR (SELECT "packageSubTotalVnd" FROM "serviceCombos" WHERE id = 998600000000401) <> 2700000 THEN
    RAISE EXCEPTION 'FAIL C: company prices and combos follow the new rate';
  END IF;
  IF (SELECT "basePriceVnd" FROM services WHERE id = 998600000000203) <> 150000 THEN
    RAISE EXCEPTION 'FAIL C: the first XTN rate converts the XTN service';
  END IF;
  IF (SELECT "basePriceVnd" FROM "quotationServices" WHERE id = 998600000000111) <> 261765 THEN
    RAISE EXCEPTION 'FAIL C: a quotation line keeps its frozen rate';
  END IF;
  -- the rate removed: back to the previous one
  DELETE FROM "exchangeRates" WHERE id = 998600000000012;
  IF (SELECT "basePriceVnd" FROM services WHERE id = 998600000000201) <> 523530 THEN
    RAISE EXCEPTION 'FAIL C: removing the latest rate re-converts at the previous one';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL CURRENCY VND CHECKS PASSED'; END $$;
ROLLBACK;
