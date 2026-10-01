-- ============================================================
-- Currency catalog rules (2026-09-30)
--
-- VND is the base currency: every document total, request, invoice and
-- payment is in VND, and service lines keep their own currency as a trace
-- (pgsql/money_flow_foundation.sql). This file makes the inputs of that
-- conversion safe:
--   1. an exchange rate is entered one way only — 1 foreign unit = x VND —
--      and is positive (dev had VND -> foreign rows 10,000 times off);
--   2. a company's own price of a catalog service (companyServices.price)
--      carries its currency (dev had none, so a VND company price was read in
--      the service's currency: 25,000,000 VND became 25,000,000 USD);
--   3. money_rate_warnings lists currencies whose rate is missing or older
--      than 30 days.
-- currency_catalog_fix_run() repairs older rows (preview:
-- pgsql/currency_catalog_fix_preview.sql). Requires
-- pgsql/money_flow_foundation.sql. Idempotent.
-- ============================================================

-- ---- 1. Company prices carry their currency
-- (registered as NocoBase field "currency" by JsField/RegisterCompanyServiceCurrency.js)
ALTER TABLE "companyServices" ADD COLUMN IF NOT EXISTS "currencyId" bigint;
CREATE INDEX IF NOT EXISTS "companyServices_currencyId" ON "companyServices" ("currencyId");

-- ---- 2. Exchange rates: 1 foreign unit = x VND, positive
CREATE OR REPLACE FUNCTION public.money_exchange_rate_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  IF NEW.rate IS NULL OR NEW.rate <= 0 THEN
    RAISE EXCEPTION 'The exchange rate must be greater than 0.';
  END IF;
  IF NEW."fromCurrencyId" IS NULL OR NEW."toCurrencyId" IS NULL
     OR money_is_base(NEW."fromCurrencyId") OR NOT money_is_base(NEW."toCurrencyId") THEN
    RAISE EXCEPTION 'Enter exchange rates from the foreign currency to VND (VND per 1 unit), e.g. USD → VND = 26176.5.';
  END IF;
  RETURN NEW;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_exchange_rate_guard ON "exchangeRates";
CREATE TRIGGER trg_money_exchange_rate_guard BEFORE INSERT OR UPDATE ON "exchangeRates"
  FOR EACH ROW EXECUTE FUNCTION public.money_exchange_rate_guard();

-- ---- 3. Rates to check: a foreign currency with no usable foreign -> VND
-- rate, or whose latest one is older than 30 days
CREATE OR REPLACE VIEW public.money_rate_warnings AS
SELECT upper(c.code) AS currency,
       r.last_date,
       (money_local_date(now()) - r.last_date) AS days_old,
       CASE WHEN r.last_date IS NULL THEN 'no ' || upper(c.code) || ' -> VND rate'
            ELSE 'latest ' || upper(c.code) || ' -> VND rate is ' || (money_local_date(now()) - r.last_date) || ' days old' END AS detail
FROM currencies c
LEFT JOIN LATERAL (
  SELECT max(money_local_date(er."effectiveDate"::timestamptz)) AS last_date
  FROM "exchangeRates" er
  WHERE er."fromCurrencyId" = c.id AND money_is_base(er."toCurrencyId")
    AND er.rate > 0 AND money_rate_usable(er.status)
) r ON true
WHERE NOT money_is_base(c.id)
  AND (r.last_date IS NULL OR money_local_date(now()) - r.last_date > 30);

-- ---- 4. The currency of a company price: the service's own currency,
-- unless the price reads as VND — it is closer to the service's catalog
-- price converted to VND than to the catalog price itself (without a
-- catalog price or a rate: 100,000 and more reads as VND).
CREATE OR REPLACE FUNCTION public.money_company_price_currency(p_price numeric, p_service_currency bigint, p_service_price numeric)
RETURNS bigint
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_rate numeric;
BEGIN
  IF money_is_base(p_service_currency) THEN
    RETURN money_base_currency_id();
  END IF;
  IF p_price IS NULL OR p_price <= 0 THEN
    RETURN p_service_currency;
  END IF;
  SELECT x.rate INTO v_rate FROM money_rate_to_base(p_service_currency, money_local_date(now())) x;
  IF COALESCE(p_service_price, 0) > 0 AND v_rate IS NOT NULL THEN
    RETURN CASE WHEN abs(ln(p_price / (p_service_price * v_rate))) < abs(ln(p_price / p_service_price))
                THEN money_base_currency_id() ELSE p_service_currency END;
  END IF;
  RETURN CASE WHEN p_price >= 100000 THEN money_base_currency_id() ELSE p_service_currency END;
END;
$f$;

-- ---- 5. Older rows (writes; returns what it did row by row).
-- pgsql/currency_catalog_fix_preview.sql runs it and rolls back.
CREATE OR REPLACE FUNCTION public.currency_catalog_fix_run()
RETURNS TABLE (step text, table_name text, record_id bigint, detail text)
LANGUAGE plpgsql
AS $f$
DECLARE
  r RECORD;
  n bigint;
BEGIN
  -- wrong-direction rates (VND -> foreign): deleted when the currency has a
  -- foreign -> VND rate; kept and listed when they are its only rate
  FOR r IN
    SELECT er.id, er."toCurrencyId" AS cur, er.rate, er."effectiveDate",
           EXISTS (SELECT 1 FROM "exchangeRates" d
                   WHERE d."fromCurrencyId" = er."toCurrencyId" AND money_is_base(d."toCurrencyId")
                     AND d.rate > 0 AND money_rate_usable(d.status)) AS has_direct
    FROM "exchangeRates" er
    WHERE money_is_base(er."fromCurrencyId") AND NOT money_is_base(er."toCurrencyId")
  LOOP
    table_name := 'exchangeRates';
    record_id := r.id;
    detail := 'VND -> ' || money_currency_code(r.cur) || ' = ' || r.rate || ' (reads as 1 ' || money_currency_code(r.cur)
              || ' = ' || round(1 / r.rate::numeric, 4) || ' VND) on ' || money_local_date(r."effectiveDate"::timestamptz);
    IF r.has_direct THEN
      DELETE FROM "exchangeRates" WHERE id = r.id;
      step := 'rate deleted (wrong direction)';
    ELSE
      step := 'rate kept (wrong direction, the only ' || money_currency_code(r.cur) || ' rate: enter a ' || money_currency_code(r.cur) || ' -> VND rate)';
    END IF;
    RETURN NEXT;
  END LOOP;

  -- company prices without a currency
  FOR r IN
    SELECT cs.id, cs.price, s."currencyId" AS svc_cur, s."basePrice" AS svc_price, s."serviceName" AS svc_name,
           money_company_price_currency(cs.price::numeric, s."currencyId", s."basePrice"::numeric) AS cur
    FROM "companyServices" cs
    LEFT JOIN services s ON s.id = cs."serviceId"
    WHERE cs."currencyId" IS NULL
  LOOP
    UPDATE "companyServices" SET "currencyId" = r.cur WHERE id = r.id;
    step := 'company price currency';
    table_name := 'companyServices';
    record_id := r.id;
    detail := COALESCE(r.svc_name, '-') || ': ' || COALESCE(r.price::text, '-') || ' ' || money_currency_code(r.cur)
              || ' (catalog ' || COALESCE(r.svc_price::text, '-') || ' ' || money_currency_code(r.svc_cur) || ')';
    RETURN NEXT;
  END LOOP;

  -- catalog prices in VND at the latest rates (section 6)
  step := 'catalog VND';
  table_name := NULL;
  record_id := NULL;
  detail := money_catalog_refresh(NULL) || ' catalog rows converted';
  RETURN NEXT;

  -- service lines: their unit price in VND at their frozen rate (older
  -- lines without a frozen rate get it with the money backfill)
  step := 'line unit price VND';
  UPDATE "quotationServices" l SET "basePriceVnd" = round(l."basePrice"::numeric * l."exchangeRateToBase"::numeric, 0)
  WHERE l."basePriceVnd" IS NULL AND l."basePrice" IS NOT NULL AND money_row_rate_frozen(to_jsonb(l));
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'quotationServices'; detail := n || ' lines'; RETURN NEXT;
  UPDATE "contractServices" l SET "basePriceVnd" = round(l."basePrice"::numeric * l."exchangeRateToBase"::numeric, 0)
  WHERE l."basePriceVnd" IS NULL AND l."basePrice" IS NOT NULL AND money_row_rate_frozen(to_jsonb(l));
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'contractServices'; detail := n || ' lines'; RETURN NEXT;
  UPDATE "projectServices" l SET "basePriceVnd" = round(l."basePrice"::numeric * l."exchangeRateToBase"::numeric, 0)
  WHERE l."basePriceVnd" IS NULL AND l."basePrice" IS NOT NULL AND money_row_rate_frozen(to_jsonb(l));
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'projectServices'; detail := n || ' lines'; RETURN NEXT;
END;
$f$;

-- ---- 6. Catalog prices in VND at the latest rate (for queries and display).
-- services.basePrice, companyServices.price, serviceComboItems.price and
-- serviceCombos.packageSubTotal / totalAmount keep their own currency; the
-- *Vnd columns hold them converted at the currency's latest foreign -> VND
-- rate (whole đồng), with that rate and its date. A new, edited or removed
-- rate converts the catalog again; documents keep their frozen rates.
-- NULL when the currency has no rate (money_rate_warnings lists it).
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS "basePriceVnd" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateDate" date;
ALTER TABLE "companyServices"
  ADD COLUMN IF NOT EXISTS "priceVnd" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateDate" date;
ALTER TABLE "serviceComboItems"
  ADD COLUMN IF NOT EXISTS "priceVnd" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateDate" date;
ALTER TABLE "serviceCombos"
  ADD COLUMN IF NOT EXISTS "packageSubTotalVnd" double precision,
  ADD COLUMN IF NOT EXISTS "totalAmountVnd" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateDate" date;

-- The latest usable rate of a currency (VND: 1, today).
CREATE OR REPLACE FUNCTION public.money_latest_rate(p_currency_id bigint, OUT rate numeric, OUT rate_date date)
LANGUAGE plpgsql
STABLE
AS $f$
BEGIN
  IF money_is_base(p_currency_id) THEN
    rate := 1;
    rate_date := money_local_date(now());
    RETURN;
  END IF;
  SELECT x.rate, x.rate_date INTO rate, rate_date FROM money_rate_to_base(p_currency_id, 'infinity'::date) x;
END;
$f$;

-- BEFORE INSERT / UPDATE on the four catalog tables.
CREATE OR REPLACE FUNCTION public.money_catalog_vnd()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE
  v_row jsonb := to_jsonb(NEW);
  x RECORD;
  v_patch jsonb;
BEGIN
  SELECT * INTO x FROM money_latest_rate(NULLIF(v_row->>'currencyId', '')::bigint);
  v_patch := jsonb_build_object('exchangeRateToBase', x.rate, 'exchangeRateDate', x.rate_date);
  IF TG_TABLE_NAME = 'services' THEN
    v_patch := v_patch || jsonb_build_object('basePriceVnd',
      round(NULLIF(v_row->>'basePrice', '')::numeric * x.rate, 0));
  ELSIF TG_TABLE_NAME = 'serviceCombos' THEN
    v_patch := v_patch || jsonb_build_object(
      'packageSubTotalVnd', round(NULLIF(v_row->>'packageSubTotal', '')::numeric * x.rate, 0),
      'totalAmountVnd', round(NULLIF(v_row->>'totalAmount', '')::numeric * x.rate, 0));
  ELSE
    v_patch := v_patch || jsonb_build_object('priceVnd',
      round(NULLIF(v_row->>'price', '')::numeric * x.rate, 0));
  END IF;
  NEW := jsonb_populate_record(NEW, v_patch);
  RETURN NEW;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_catalog_vnd ON services;
CREATE TRIGGER trg_money_catalog_vnd BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION public.money_catalog_vnd();
DROP TRIGGER IF EXISTS trg_money_catalog_vnd ON "companyServices";
CREATE TRIGGER trg_money_catalog_vnd BEFORE INSERT OR UPDATE ON "companyServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_catalog_vnd();
DROP TRIGGER IF EXISTS trg_money_catalog_vnd ON "serviceComboItems";
CREATE TRIGGER trg_money_catalog_vnd BEFORE INSERT OR UPDATE ON "serviceComboItems"
  FOR EACH ROW EXECUTE FUNCTION public.money_catalog_vnd();
DROP TRIGGER IF EXISTS trg_money_catalog_vnd ON "serviceCombos";
CREATE TRIGGER trg_money_catalog_vnd BEFORE INSERT OR UPDATE ON "serviceCombos"
  FOR EACH ROW EXECUTE FUNCTION public.money_catalog_vnd();

-- Converts the catalog of one currency again (NULL: every row). Returns the
-- number of rows touched.
CREATE OR REPLACE FUNCTION public.money_catalog_refresh(p_currency_id bigint)
RETURNS bigint
LANGUAGE plpgsql
AS $f$
DECLARE
  n bigint;
  total bigint := 0;
BEGIN
  UPDATE services SET "currencyId" = "currencyId"
  WHERE p_currency_id IS NULL OR "currencyId" = p_currency_id;
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE "companyServices" SET "currencyId" = "currencyId"
  WHERE p_currency_id IS NULL OR "currencyId" = p_currency_id;
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE "serviceComboItems" SET "currencyId" = "currencyId"
  WHERE p_currency_id IS NULL OR "currencyId" = p_currency_id;
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE "serviceCombos" SET "currencyId" = "currencyId"
  WHERE p_currency_id IS NULL OR "currencyId" = p_currency_id;
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  RETURN total;
END;
$f$;

-- AFTER a rate is added, changed or removed: its currency's catalog follows.
CREATE OR REPLACE FUNCTION public.money_exchange_rate_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  IF TG_OP <> 'INSERT' AND NOT money_is_base(OLD."fromCurrencyId") THEN
    PERFORM money_catalog_refresh(OLD."fromCurrencyId");
  END IF;
  IF TG_OP <> 'DELETE' AND NOT money_is_base(NEW."fromCurrencyId")
     AND (TG_OP = 'INSERT' OR NEW."fromCurrencyId" IS DISTINCT FROM OLD."fromCurrencyId") THEN
    PERFORM money_catalog_refresh(NEW."fromCurrencyId");
  END IF;
  RETURN NULL;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_exchange_rate_changed ON "exchangeRates";
CREATE TRIGGER trg_money_exchange_rate_changed AFTER INSERT OR UPDATE OR DELETE ON "exchangeRates"
  FOR EACH ROW EXECUTE FUNCTION public.money_exchange_rate_changed();
