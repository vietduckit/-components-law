-- ============================================================
-- Money flow foundation (2026-09-29)
-- Spec: docs/superpowers/specs/2026-09-29-money-flow-unification-design.md
-- Plan: docs/superpowers/plans/2026-09-29-money-flow-unification.md
--
-- The database computes every stored money number of a service line
-- (quotationServices / contractServices / projectServices) from its inputs
-- (basePrice, quantity, vat, currencyId) and the exchange rate frozen for its
-- document, and derives each document's totals from its lines.
-- subTotal / vatAmount / totalAmount stay VND everywhere (INV-1); the line's
-- own-currency amounts go in *Native columns.
-- Requires pgsql/contract_payment_status_workflow.sql (finance_is_received,
-- contract_resolved_total, contract_recompute_outstanding_for).
-- Idempotent.
-- ============================================================

-- ---- 1. Columns (registered as NocoBase fields by JsField/RegisterMoneyFlowFields.js)
ALTER TABLE "quotationServices"
  ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateDate" date,
  ADD COLUMN IF NOT EXISTS "subTotalNative" double precision,
  ADD COLUMN IF NOT EXISTS "vatAmountNative" double precision,
  ADD COLUMN IF NOT EXISTS "totalAmountNative" double precision,
  ADD COLUMN IF NOT EXISTS "basePriceVnd" double precision;
ALTER TABLE "contractServices"
  ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateDate" date,
  ADD COLUMN IF NOT EXISTS "subTotalNative" double precision,
  ADD COLUMN IF NOT EXISTS "vatAmountNative" double precision,
  ADD COLUMN IF NOT EXISTS "totalAmountNative" double precision,
  ADD COLUMN IF NOT EXISTS "basePriceVnd" double precision;
ALTER TABLE "projectServices"
  ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateDate" date,
  ADD COLUMN IF NOT EXISTS "subTotalNative" double precision,
  ADD COLUMN IF NOT EXISTS "vatAmountNative" double precision,
  ADD COLUMN IF NOT EXISTS "totalAmountNative" double precision,
  ADD COLUMN IF NOT EXISTS "basePriceVnd" double precision,
  ADD COLUMN IF NOT EXISTS "quotationServiceId" bigint;

-- ---- 2. The base currency: VND, flagged so the database and the JS agree
UPDATE currencies
SET "isBaseCurrency" = true, "decimalPlaces" = COALESCE("decimalPlaces", 0)
WHERE upper(code) = 'VND' AND ("isBaseCurrency" IS NOT TRUE OR "decimalPlaces" IS NULL);

CREATE OR REPLACE FUNCTION public.money_base_currency_id()
RETURNS bigint
LANGUAGE sql
STABLE
AS $f$
  SELECT id FROM currencies
  WHERE "isBaseCurrency" IS TRUE OR upper(code) = 'VND'
  ORDER BY ("isBaseCurrency" IS TRUE) DESC, id
  LIMIT 1;
$f$;

-- A line without a currency is in VND.
CREATE OR REPLACE FUNCTION public.money_is_base(p_currency_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT p_currency_id IS NULL OR p_currency_id = money_base_currency_id();
$f$;

-- VND: whole đồng; another currency: its decimalPlaces, else 2.
CREATE OR REPLACE FUNCTION public.money_decimals(p_currency_id bigint)
RETURNS integer
LANGUAGE sql
STABLE
AS $f$
  SELECT CASE
    WHEN money_is_base(p_currency_id) THEN 0
    ELSE COALESCE((SELECT "decimalPlaces"::integer FROM currencies WHERE id = p_currency_id), 2)
  END;
$f$;

CREATE OR REPLACE FUNCTION public.money_currency_code(p_currency_id bigint)
RETURNS text
LANGUAGE sql
STABLE
AS $f$
  SELECT COALESCE(
    (SELECT upper(code) FROM currencies WHERE id = COALESCE(p_currency_id, money_base_currency_id())),
    'VND');
$f$;

-- Business dates are Vietnam dates.
CREATE OR REPLACE FUNCTION public.money_local_date(p_ts timestamptz)
RETURNS date
LANGUAGE sql
STABLE
AS $f$
  SELECT (p_ts AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
$f$;

-- ---- 3. Arithmetic
-- Splits a total over weights so the parts add up to the total exactly
-- (largest remainder): each part is floored to the unit (1 đồng, or 0.01
-- with p_decimals = 2), then the units left over go to the parts with the
-- largest fractions, ties to the earlier part. All-zero weights split equally.
-- The JS twin is splitLargestRemainder() in ContractCreateForm.js.
CREATE OR REPLACE FUNCTION public.money_split(p_total numeric, p_weights numeric[], p_decimals integer DEFAULT 0)
RETURNS numeric[]
LANGUAGE plpgsql
IMMUTABLE
AS $f$
DECLARE
  n integer := COALESCE(array_length(p_weights, 1), 0);
  v_scale numeric := power(10::numeric, COALESCE(p_decimals, 0));
  v_units numeric := round(COALESCE(p_total, 0) * v_scale);
  v_sign numeric := CASE WHEN COALESCE(p_total, 0) < 0 THEN -1 ELSE 1 END;
  v_wsum numeric := 0;
  v_raw numeric[] := '{}';
  v_out numeric[] := '{}';
  v_left integer;
  r RECORD;
  i integer;
BEGIN
  IF n = 0 THEN
    RETURN v_out;
  END IF;
  v_units := abs(v_units);
  FOR i IN 1..n LOOP
    v_wsum := v_wsum + GREATEST(COALESCE(p_weights[i], 0), 0);
  END LOOP;
  FOR i IN 1..n LOOP
    v_raw[i] := CASE
      WHEN v_wsum > 0 THEN v_units * GREATEST(COALESCE(p_weights[i], 0), 0) / v_wsum
      ELSE v_units / n
    END;
    v_out[i] := floor(v_raw[i]);
  END LOOP;
  v_left := (v_units - (SELECT sum(x) FROM unnest(v_out) AS x))::integer;
  FOR r IN
    SELECT idx FROM generate_series(1, n) AS idx
    ORDER BY v_raw[idx] - v_out[idx] DESC, idx
    LIMIT v_left
  LOOP
    v_out[r.idx] := v_out[r.idx] + 1;
  END LOOP;
  FOR i IN 1..n LOOP
    v_out[i] := v_sign * v_out[i] / v_scale;
  END LOOP;
  RETURN v_out;
END;
$f$;

-- A line's amounts: native ones rounded to the currency's decimals, then VND
-- = native × rate rounded to whole đồng; every total is the sum of its
-- rounded parts. The VND outputs are NULL when p_rate is NULL.
CREATE OR REPLACE FUNCTION public.money_line_amounts(
  p_base_price numeric, p_quantity numeric, p_vat numeric, p_decimals integer, p_rate numeric,
  OUT sub_native numeric, OUT vat_native numeric, OUT total_native numeric,
  OUT sub_vnd numeric, OUT vat_vnd numeric, OUT total_vnd numeric)
LANGUAGE plpgsql
IMMUTABLE
AS $f$
BEGIN
  sub_native := round(COALESCE(p_base_price, 0) * COALESCE(NULLIF(p_quantity, 0), 1), COALESCE(p_decimals, 0));
  vat_native := round(sub_native * COALESCE(p_vat, 0) / 100, COALESCE(p_decimals, 0));
  total_native := sub_native + vat_native;
  IF p_rate IS NULL THEN
    RETURN;
  END IF;
  sub_vnd := round(sub_native * p_rate, 0);
  vat_vnd := round(vat_native * p_rate, 0);
  total_vnd := sub_vnd + vat_vnd;
END;
$f$;

-- ---- 4. Exchange rates (same selection as pickConversionRate() in the JS blocks)
CREATE OR REPLACE FUNCTION public.money_rate_usable(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT lower(btrim(COALESCE(p_status, ''))) NOT IN ('inactive', 'disabled', 'archived', 'cancelled', 'canceled', 'draft');
$f$;

-- VND per 1 unit of p_currency_id on p_on: the latest direct rate on or
-- before that (Vietnam) date, else the latest inverse one (1 / rate); with
-- none on or before it, the earliest direct, then inverse, after it. NULL
-- when the pair has no usable rate at all. Two rates of one date: the one
-- entered last (larger id) wins. Rates carry 15 significant digits
-- (float8 → numeric), exactly as the JS rate15() does.
CREATE OR REPLACE FUNCTION public.money_rate_to_base(p_currency_id bigint, p_on date, OUT rate numeric, OUT rate_date date)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_base bigint := money_base_currency_id();
BEGIN
  IF money_is_base(p_currency_id) THEN
    rate := 1;
    rate_date := p_on;
    RETURN;
  END IF;
  SELECT c.r, c.d INTO rate, rate_date
  FROM (
    SELECT (er.rate::numeric)::double precision::numeric AS r,
           COALESCE(money_local_date(er."effectiveDate"::timestamptz), DATE '1900-01-01') AS d,
           COALESCE(er."effectiveDate"::timestamptz, '-infinity'::timestamptz) AS eff,
           1 AS dir,
           er.id AS rid
    FROM "exchangeRates" er
    WHERE er."fromCurrencyId" = p_currency_id AND er."toCurrencyId" = v_base
      AND er.rate > 0 AND money_rate_usable(er.status)
    UNION ALL
    SELECT (1 / er.rate::numeric)::double precision::numeric,
           COALESCE(money_local_date(er."effectiveDate"::timestamptz), DATE '1900-01-01'),
           COALESCE(er."effectiveDate"::timestamptz, '-infinity'::timestamptz),
           2,
           er.id
    FROM "exchangeRates" er
    WHERE er."fromCurrencyId" = v_base AND er."toCurrencyId" = p_currency_id
      AND er.rate > 0 AND money_rate_usable(er.status)
  ) c
  ORDER BY (c.d <= p_on) DESC,
           c.dir,
           CASE WHEN c.d <= p_on THEN c.eff END DESC NULLS LAST,
           c.eff ASC,
           c.rid DESC
  LIMIT 1;
END;
$f$;

-- ---- 5. Service lines: the rate each line freezes, and its amounts
-- A stored rate the database froze. Older rows on dev carry
-- exchangeRateToBase = 1 (the column's old default) with no exchangeRateDate:
-- on a foreign line that 1 is not a rate (1 USD is not 1 VND). A real older
-- rate (not 1) and any VND 1 still count; every rate the triggers freeze has
-- a date.
CREATE OR REPLACE FUNCTION public.money_rate_frozen(p_rate numeric, p_rate_date date, p_currency_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT p_rate IS NOT NULL AND p_rate > 0
     AND (p_rate_date IS NOT NULL OR p_rate <> 1 OR money_is_base(p_currency_id));
$f$;

CREATE OR REPLACE FUNCTION public.money_row_rate_frozen(p_row jsonb)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT money_rate_frozen(NULLIF(p_row->>'exchangeRateToBase', '')::numeric,
                           NULLIF(p_row->>'exchangeRateDate', '')::date,
                           NULLIF(p_row->>'currencyId', '')::bigint);
$f$;

-- A line is computed here when it has a price and is not a combo (package)
-- line; rows without basePrice (older rows, placeholders) are left alone.
CREATE OR REPLACE FUNCTION public.money_line_priced(p_row jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT p_row IS NOT NULL
     AND NULLIF(p_row->>'basePrice', '') IS NOT NULL
     AND lower(COALESCE(p_row->>'pricingMode', '')) <> 'package';
$f$;

-- The rate a line freezes (spec §6.2):
--   quotation line: the quotation's date;
--   contract line:  the signing date, else the contract's creation date;
--   case line:      its contract line's rate (same currency), else its
--                   quotation line's, else the case's date.
CREATE OR REPLACE FUNCTION public.money_line_rate(p_table text, p_row jsonb, OUT rate numeric, OUT rate_date date)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_currency bigint := NULLIF(p_row->>'currencyId', '')::bigint;
  v_on date;
BEGIN
  IF p_table = 'quotationServices' THEN
    SELECT money_local_date(q."createdAt") INTO v_on
    FROM quotations q WHERE q.id = NULLIF(p_row->>'quotationId', '')::bigint;
  ELSIF p_table = 'contractServices' THEN
    SELECT money_local_date(COALESCE(c."signedAt", c."createdAt")) INTO v_on
    FROM contracts c WHERE c.id = NULLIF(p_row->>'contractId', '')::bigint;
  ELSIF p_table = 'projectServices' THEN
    SELECT cs."exchangeRateToBase", cs."exchangeRateDate" INTO rate, rate_date
    FROM "contractServices" cs
    WHERE cs."projectServiceId" = NULLIF(p_row->>'id', '')::bigint
      AND cs."currencyId" IS NOT DISTINCT FROM v_currency
      AND money_rate_frozen(cs."exchangeRateToBase"::numeric, cs."exchangeRateDate", cs."currencyId")
    ORDER BY cs.id
    LIMIT 1;
    IF rate IS NULL THEN
      SELECT qs."exchangeRateToBase", qs."exchangeRateDate" INTO rate, rate_date
      FROM "quotationServices" qs
      WHERE qs.id = NULLIF(p_row->>'quotationServiceId', '')::bigint
        AND qs."currencyId" IS NOT DISTINCT FROM v_currency
        AND money_rate_frozen(qs."exchangeRateToBase"::numeric, qs."exchangeRateDate", qs."currencyId");
    END IF;
    IF rate IS NOT NULL THEN
      RETURN;
    END IF;
    -- the case's own date ("Open date" in the Case form), as the form
    -- previews it; read through to_jsonb so a database without that column
    -- falls back to createdAt instead of failing every save
    SELECT money_local_date(COALESCE(NULLIF(to_jsonb(p)->>'date', '')::timestamptz, p."createdAt")) INTO v_on
    FROM projects p WHERE p.id = NULLIF(p_row->>'projectId', '')::bigint;
  END IF;
  v_on := COALESCE(v_on, money_local_date(now()));
  SELECT x.rate, x.rate_date INTO rate, rate_date FROM money_rate_to_base(v_currency, v_on) x;
END;
$f$;

-- The contract a contract / case line bills through (NULL for a quotation line).
CREATE OR REPLACE FUNCTION public.money_line_contract_id(p_table text, p_row jsonb)
RETURNS bigint
LANGUAGE sql
STABLE
AS $f$
  SELECT CASE p_table
    WHEN 'contractServices' THEN NULLIF(p_row->>'contractId', '')::bigint
    WHEN 'projectServices' THEN (SELECT p."contractId" FROM projects p WHERE p.id = NULLIF(p_row->>'projectId', '')::bigint)
  END;
$f$;

-- BEFORE INSERT / UPDATE on each line table. Whatever money the client sent
-- is overwritten. The rate is (re)frozen only on insert, when the currency
-- changes, or when the rate is empty (set it to NULL to ask for a re-freeze);
-- otherwise the stored rate is kept (INV-2).
CREATE OR REPLACE FUNCTION public.money_line_compute()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE
  v_row jsonb := to_jsonb(NEW);
  v_currency bigint := NULLIF(v_row->>'currencyId', '')::bigint;
  v_rate numeric;
  v_rate_date date;
  a RECORD;
BEGIN
  IF lower(COALESCE(v_row->>'pricingMode', '')) = 'package' THEN
    NEW."exchangeRateToBase" := 1;
    NEW."exchangeRateDate" := COALESCE(NEW."exchangeRateDate", money_local_date(now()));
    NEW."subTotalNative" := NEW."packageSubTotal";
    NEW."vatAmountNative" := NEW."packageVatAmount";
    NEW."totalAmountNative" := NEW."packageTotalAmount";
    NEW."basePriceVnd" := NEW."basePrice";
    RETURN NEW;
  END IF;
  IF NOT money_line_priced(v_row) THEN
    RETURN NEW;
  END IF;

  -- A row saved before these triggers (no frozen rate) keeps its numbers on
  -- an update that changes none of its inputs (a status change, a payment
  -- touching its document…): its stored amounts may still be in the line
  -- currency, and only the reviewed backfill (money.backfill = 'on') or a
  -- real edit of price / quantity / VAT / currency may re-price it.
  IF TG_OP = 'UPDATE' AND NOT money_row_rate_frozen(to_jsonb(OLD))
     AND COALESCE(current_setting('money.backfill', true), '') <> 'on'
     AND NEW."basePrice" IS NOT DISTINCT FROM OLD."basePrice"
     AND NEW.vat IS NOT DISTINCT FROM OLD.vat
     AND NEW."currencyId" IS NOT DISTINCT FROM OLD."currencyId"
     AND v_row->'quantity' IS NOT DISTINCT FROM to_jsonb(OLD)->'quantity' THEN
    NEW."exchangeRateToBase" := OLD."exchangeRateToBase";
    NEW."exchangeRateDate" := OLD."exchangeRateDate";
    NEW."subTotalNative" := OLD."subTotalNative";
    NEW."vatAmountNative" := OLD."vatAmountNative";
    NEW."totalAmountNative" := OLD."totalAmountNative";
    NEW."subTotal" := OLD."subTotal";
    NEW."vatAmount" := OLD."vatAmount";
    NEW."totalAmount" := OLD."totalAmount";
    NEW."basePriceVnd" := OLD."basePriceVnd";
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW."exchangeRateToBase" IS NULL
     AND money_row_rate_frozen(to_jsonb(OLD))
     AND NEW."currencyId" IS NOT DISTINCT FROM OLD."currencyId"
     AND lower(COALESCE(to_jsonb(OLD)->>'pricingMode', '')) <> 'package'
     AND money_contract_billing_locked(money_line_contract_id(TG_TABLE_NAME, v_row)) THEN
    -- a re-freeze asked for on a billed contract's line (signing again, a
    -- quotation line's rate change, a hand edit): billed amounts never move
    NEW."exchangeRateToBase" := OLD."exchangeRateToBase";
    NEW."exchangeRateDate" := OLD."exchangeRateDate";
  ELSIF TG_OP = 'INSERT'
     OR NEW."exchangeRateToBase" IS NULL
     OR NOT money_row_rate_frozen(to_jsonb(OLD))
     OR NEW."currencyId" IS DISTINCT FROM OLD."currencyId"
     -- a combo line (rate 1) switched to line pricing
     OR lower(COALESCE(to_jsonb(OLD)->>'pricingMode', '')) = 'package' THEN
    SELECT x.rate, x.rate_date INTO v_rate, v_rate_date FROM money_line_rate(TG_TABLE_NAME, v_row) x;
    IF v_rate IS NULL THEN
      RAISE EXCEPTION 'Missing exchange rate %->VND for service "%"',
        money_currency_code(v_currency), COALESCE(v_row->>'serviceName', '');
    END IF;
    NEW."exchangeRateToBase" := v_rate;
    NEW."exchangeRateDate" := v_rate_date;
  ELSE
    NEW."exchangeRateToBase" := OLD."exchangeRateToBase";
    NEW."exchangeRateDate" := OLD."exchangeRateDate";
  END IF;

  SELECT * INTO a FROM money_line_amounts(
    NULLIF(v_row->>'basePrice', '')::numeric,
    NULLIF(v_row->>'quantity', '')::numeric,
    NULLIF(v_row->>'vat', '')::numeric,
    money_decimals(v_currency),
    NEW."exchangeRateToBase"::numeric);
  NEW."subTotalNative" := a.sub_native;
  NEW."vatAmountNative" := a.vat_native;
  NEW."totalAmountNative" := a.total_native;
  NEW."subTotal" := a.sub_vnd;
  NEW."vatAmount" := a.vat_vnd;
  NEW."totalAmount" := a.total_vnd;
  -- the unit price in VND at the frozen rate (whole đồng), for queries and display
  NEW."basePriceVnd" := round(NULLIF(v_row->>'basePrice', '')::numeric * NEW."exchangeRateToBase"::numeric, 0);
  RETURN NEW;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_line_compute ON "quotationServices";
CREATE TRIGGER trg_money_line_compute BEFORE INSERT OR UPDATE ON "quotationServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_compute();
DROP TRIGGER IF EXISTS trg_money_line_compute ON "contractServices";
CREATE TRIGGER trg_money_line_compute BEFORE INSERT OR UPDATE ON "contractServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_compute();
DROP TRIGGER IF EXISTS trg_money_line_compute ON "projectServices";
CREATE TRIGGER trg_money_line_compute BEFORE INSERT OR UPDATE ON "projectServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_compute();

-- AFTER a line changes: a case line re-takes the rate of the contract /
-- quotation line it is linked to (setting its rate to NULL re-freezes it
-- through money_line_compute). Extended in section 6 (document totals).
CREATE OR REPLACE FUNCTION public.money_line_after()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE
  v_new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  v_old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
BEGIN
  IF NOT (money_line_priced(v_new) OR money_line_priced(v_old)) THEN
    RETURN NULL;
  END IF;
  IF v_new IS NOT NULL AND (v_old IS NULL
       OR v_new->'exchangeRateToBase' IS DISTINCT FROM v_old->'exchangeRateToBase'
       OR v_new->'currencyId' IS DISTINCT FROM v_old->'currencyId'
       OR v_new->'projectServiceId' IS DISTINCT FROM v_old->'projectServiceId') THEN
    IF TG_TABLE_NAME = 'contractServices' AND NULLIF(v_new->>'projectServiceId', '') IS NOT NULL THEN
      UPDATE "projectServices" SET "exchangeRateToBase" = NULL
      WHERE id = (v_new->>'projectServiceId')::bigint
        AND "currencyId" IS NOT DISTINCT FROM NULLIF(v_new->>'currencyId', '')::bigint;
    ELSIF TG_TABLE_NAME = 'quotationServices' THEN
      UPDATE "projectServices" ps SET "exchangeRateToBase" = NULL
      WHERE ps."quotationServiceId" = (v_new->>'id')::bigint
        AND ps."currencyId" IS NOT DISTINCT FROM NULLIF(v_new->>'currencyId', '')::bigint
        AND NOT EXISTS (SELECT 1 FROM "contractServices" cs WHERE cs."projectServiceId" = ps.id);
    END IF;
  END IF;
  RETURN NULL;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_line_after ON "quotationServices";
CREATE TRIGGER trg_money_line_after AFTER INSERT OR UPDATE OR DELETE ON "quotationServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_after();
DROP TRIGGER IF EXISTS trg_money_line_after ON "contractServices";
CREATE TRIGGER trg_money_line_after AFTER INSERT OR UPDATE OR DELETE ON "contractServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_after();
DROP TRIGGER IF EXISTS trg_money_line_after ON "projectServices";
CREATE TRIGGER trg_money_line_after AFTER INSERT OR UPDATE OR DELETE ON "projectServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_after();

-- ---- 6. Document totals = the sum of their lines (line pricing only)
CREATE OR REPLACE FUNCTION public.money_line_active(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT lower(btrim(COALESCE(p_status, ''))) NOT IN ('deleted', 'cancelled', 'canceled');
$f$;

-- A priced line whose amounts the database computed (it has a frozen rate).
-- A priced row saved before these triggers has none until the backfill: its
-- amounts may still be in the line currency, so it is not summed.
CREATE OR REPLACE FUNCTION public.money_line_settled(p_row jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT money_line_priced(p_row) AND money_row_rate_frozen(p_row);
$f$;

-- Σ of a document's active lines, or NULL when the document is not made of
-- settled line-mode lines only (no lines, a combo line, an older unpriced
-- row, or an older priced row not backfilled yet): then its totals stay.
CREATE OR REPLACE FUNCTION public.money_line_totals(p_lines text, p_parent_id bigint, OUT sub numeric, OUT vat numeric, OUT total numeric)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_priced integer;
  v_other integer;
BEGIN
  IF p_parent_id IS NULL THEN
    RETURN;
  END IF;
  IF p_lines = 'quotationServices' THEN
    SELECT count(*) FILTER (WHERE money_line_settled(to_jsonb(l))),
           count(*) FILTER (WHERE NOT money_line_settled(to_jsonb(l))),
           sum(l."subTotal") FILTER (WHERE money_line_settled(to_jsonb(l))),
           sum(l."vatAmount") FILTER (WHERE money_line_settled(to_jsonb(l))),
           sum(l."totalAmount") FILTER (WHERE money_line_settled(to_jsonb(l)))
    INTO v_priced, v_other, sub, vat, total
    FROM "quotationServices" l
    WHERE l."quotationId" = p_parent_id AND money_line_active(l.status);
  ELSIF p_lines = 'contractServices' THEN
    SELECT count(*) FILTER (WHERE money_line_settled(to_jsonb(l))),
           count(*) FILTER (WHERE NOT money_line_settled(to_jsonb(l))),
           sum(l."subTotal") FILTER (WHERE money_line_settled(to_jsonb(l))),
           sum(l."vatAmount") FILTER (WHERE money_line_settled(to_jsonb(l))),
           sum(l."totalAmount") FILTER (WHERE money_line_settled(to_jsonb(l)))
    INTO v_priced, v_other, sub, vat, total
    FROM "contractServices" l
    WHERE l."contractId" = p_parent_id AND money_line_active(l."lineStatus");
  ELSIF p_lines = 'projectServices' THEN
    SELECT count(*) FILTER (WHERE money_line_settled(to_jsonb(l))),
           count(*) FILTER (WHERE NOT money_line_settled(to_jsonb(l))),
           sum(l."subTotal") FILTER (WHERE money_line_settled(to_jsonb(l))),
           sum(l."vatAmount") FILTER (WHERE money_line_settled(to_jsonb(l))),
           sum(l."totalAmount") FILTER (WHERE money_line_settled(to_jsonb(l)))
    INTO v_priced, v_other, sub, vat, total
    FROM "projectServices" l
    WHERE l."projectId" = p_parent_id AND money_line_active(l.status);
  END IF;
  IF COALESCE(v_priced, 0) = 0 OR COALESCE(v_other, 0) > 0 THEN
    sub := NULL;
    vat := NULL;
    total := NULL;
  END IF;
END;
$f$;

CREATE OR REPLACE FUNCTION public.money_quotation_header()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE t RECORD;
BEGIN
  IF lower(COALESCE(NEW."pricingMode", '')) = 'package' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO t FROM money_line_totals('quotationServices', NEW.id);
  IF t.total IS NOT NULL THEN
    NEW."subTotal" := t.sub;
    NEW."totalAmount" := t.total;
  END IF;
  RETURN NEW;
END;
$f$;

CREATE OR REPLACE FUNCTION public.money_contract_header()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE t RECORD;
BEGIN
  IF COALESCE(NEW."contractType", '') = 'retainer' OR lower(COALESCE(NEW."pricingMode", '')) = 'package' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO t FROM money_line_totals('contractServices', NEW.id);
  IF t.total IS NOT NULL THEN
    NEW."subTotal" := t.sub;
    NEW."vatAmount" := t.vat;
    NEW."totalAmount" := t.total;
    -- contract_resolved_total() falls back to fixedAmount when totalAmount
    -- is 0: it must be the same number, or Finance reads a stale total
    NEW."fixedAmount" := t.total;
  END IF;
  RETURN NEW;
END;
$f$;

-- A case's total is the sum of its own services, not a copy of the contract's.
CREATE OR REPLACE FUNCTION public.money_project_header()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE t RECORD;
BEGIN
  SELECT * INTO t FROM money_line_totals('projectServices', NEW.id);
  IF t.total IS NOT NULL THEN
    NEW."totalAmount" := t.total;
  END IF;
  RETURN NEW;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_quotation_header ON quotations;
CREATE TRIGGER trg_money_quotation_header BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION public.money_quotation_header();
DROP TRIGGER IF EXISTS trg_money_contract_header ON contracts;
CREATE TRIGGER trg_money_contract_header BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION public.money_contract_header();
DROP TRIGGER IF EXISTS trg_money_project_header ON projects;
CREATE TRIGGER trg_money_project_header BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.money_project_header();

-- A contract whose total changed re-derives its balance (and, in section 8,
-- its installment amounts).
CREATE OR REPLACE FUNCTION public.money_contract_total_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  PERFORM contract_recompute_outstanding_for(NEW.id);
  RETURN NULL;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_contract_total_changed ON contracts;
CREATE TRIGGER trg_money_contract_total_changed AFTER UPDATE ON contracts
  FOR EACH ROW WHEN (OLD."totalAmount" IS DISTINCT FROM NEW."totalAmount")
  EXECUTE FUNCTION public.money_contract_total_changed();

-- A same-value update: the header's BEFORE trigger recomputes its totals.
CREATE OR REPLACE FUNCTION public.money_touch_header(p_table text, p_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $f$
BEGIN
  IF p_id IS NULL THEN
    RETURN;
  END IF;
  EXECUTE format('UPDATE %I SET "totalAmount" = "totalAmount" WHERE id = $1', p_table) USING p_id;
END;
$f$;

-- A document whose last service went away totals 0.
CREATE OR REPLACE FUNCTION public.money_zero_header_if_empty(p_lines text, p_parent_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $f$
BEGIN
  IF p_parent_id IS NULL THEN
    RETURN;
  END IF;
  IF p_lines = 'quotationServices' AND NOT EXISTS (
    SELECT 1 FROM "quotationServices" l WHERE l."quotationId" = p_parent_id AND money_line_active(l.status)
  ) THEN
    UPDATE quotations SET "subTotal" = 0, "totalAmount" = 0
    WHERE id = p_parent_id AND lower(COALESCE("pricingMode", '')) <> 'package';
  ELSIF p_lines = 'contractServices' AND NOT EXISTS (
    SELECT 1 FROM "contractServices" l WHERE l."contractId" = p_parent_id AND money_line_active(l."lineStatus")
  ) THEN
    UPDATE contracts SET "subTotal" = 0, "vatAmount" = 0, "totalAmount" = 0, "fixedAmount" = 0
    WHERE id = p_parent_id AND COALESCE("contractType", '') <> 'retainer'
      AND lower(COALESCE("pricingMode", '')) <> 'package';
  ELSIF p_lines = 'projectServices' AND NOT EXISTS (
    SELECT 1 FROM "projectServices" l WHERE l."projectId" = p_parent_id AND money_line_active(l.status)
  ) THEN
    UPDATE projects SET "totalAmount" = 0 WHERE id = p_parent_id;
  END IF;
END;
$f$;

-- AFTER a line changes: (1) a case line re-takes its contract / quotation
-- line's rate, (2) the document totals follow, (3) no line left -> 0.
CREATE OR REPLACE FUNCTION public.money_line_after()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE
  v_new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  v_old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  v_parent_col text := CASE TG_TABLE_NAME
    WHEN 'quotationServices' THEN 'quotationId'
    WHEN 'contractServices' THEN 'contractId'
    ELSE 'projectId' END;
  v_header text := CASE TG_TABLE_NAME
    WHEN 'quotationServices' THEN 'quotations'
    WHEN 'contractServices' THEN 'contracts'
    ELSE 'projects' END;
  v_new_parent bigint := NULLIF(v_new->>v_parent_col, '')::bigint;
  v_old_parent bigint := NULLIF(v_old->>v_parent_col, '')::bigint;
BEGIN
  IF NOT (money_line_priced(v_new) OR money_line_priced(v_old)) THEN
    RETURN NULL;
  END IF;
  IF v_new IS NOT NULL AND (v_old IS NULL
       OR v_new->'exchangeRateToBase' IS DISTINCT FROM v_old->'exchangeRateToBase'
       OR v_new->'currencyId' IS DISTINCT FROM v_old->'currencyId'
       OR v_new->'projectServiceId' IS DISTINCT FROM v_old->'projectServiceId') THEN
    IF TG_TABLE_NAME = 'contractServices' AND NULLIF(v_new->>'projectServiceId', '') IS NOT NULL THEN
      UPDATE "projectServices" SET "exchangeRateToBase" = NULL
      WHERE id = (v_new->>'projectServiceId')::bigint
        AND "currencyId" IS NOT DISTINCT FROM NULLIF(v_new->>'currencyId', '')::bigint;
    ELSIF TG_TABLE_NAME = 'quotationServices' THEN
      UPDATE "projectServices" ps SET "exchangeRateToBase" = NULL
      WHERE ps."quotationServiceId" = (v_new->>'id')::bigint
        AND ps."currencyId" IS NOT DISTINCT FROM NULLIF(v_new->>'currencyId', '')::bigint
        AND NOT EXISTS (SELECT 1 FROM "contractServices" cs WHERE cs."projectServiceId" = ps.id);
    END IF;
  END IF;
  PERFORM money_touch_header(v_header, v_new_parent);
  IF v_old_parent IS DISTINCT FROM v_new_parent THEN
    PERFORM money_touch_header(v_header, v_old_parent);
  END IF;
  IF money_line_priced(v_old) THEN
    PERFORM money_zero_header_if_empty(TG_TABLE_NAME, v_old_parent);
  END IF;
  RETURN NULL;
END;
$f$;

-- ---- 7. Billed? Then its amounts never move
CREATE OR REPLACE FUNCTION public.money_payment_request_billed(p_pr_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT EXISTS (
    SELECT 1 FROM "paymentRequests" pr
    WHERE pr.id = p_pr_id
      AND (lower(COALESCE(pr.status, '')) NOT IN ('pending', 'draft', 'cancelled', 'canceled')
        OR EXISTS (SELECT 1 FROM invoices i
                   WHERE i."paymentRequestId" = pr.id
                     AND lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled'))
        OR EXISTS (SELECT 1 FROM payments p
                   WHERE p."paymentRequestId" = pr.id AND finance_is_received(p."paymentStatus")))
  );
$f$;

CREATE OR REPLACE FUNCTION public.money_contract_billing_locked(p_contract_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT p_contract_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM "paymentRequests" pr
            WHERE pr."contractId" = p_contract_id AND money_payment_request_billed(pr.id))
    OR EXISTS (SELECT 1 FROM invoices i
               WHERE i."contractId" = p_contract_id
                 AND lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled'))
    OR EXISTS (SELECT 1 FROM payments p
               WHERE p."contractId" = p_contract_id AND finance_is_received(p."paymentStatus")));
$f$;

-- Signing (or re-dating the signature) re-freezes the contract's foreign
-- lines at the signing date; their case lines follow (money_line_after).
CREATE OR REPLACE FUNCTION public.money_contract_signed()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  IF money_contract_billing_locked(NEW.id) THEN
    RETURN NULL;
  END IF;
  UPDATE "contractServices" SET "exchangeRateToBase" = NULL
  WHERE "contractId" = NEW.id
    AND "basePrice" IS NOT NULL
    AND lower(COALESCE("pricingMode", '')) <> 'package'
    AND NOT money_is_base("currencyId");
  RETURN NULL;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_contract_signed ON contracts;
CREATE TRIGGER trg_money_contract_signed AFTER UPDATE ON contracts
  FOR EACH ROW WHEN (OLD."signedAt" IS DISTINCT FROM NEW."signedAt")
  EXECUTE FUNCTION public.money_contract_signed();

-- ---- 8. Installment amounts: the contract total split by percentage
CREATE OR REPLACE FUNCTION public.money_schedule_row_locked(p_schedule_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT EXISTS (
    SELECT 1 FROM "paymentRequests" pr
    WHERE pr."contractPaymentScheduleId" = p_schedule_id AND money_payment_request_billed(pr.id)
  );
$f$;

-- When a contract's percentage installments add up to 100%, their amounts
-- are the contract total split by largest remainder (Σ = total exactly).
-- Billed installments keep their amounts; the others share what is left.
-- Pending requests and their items follow their installment. Retainer and
-- By Service rows are not percentage installments and are left alone. The
-- JS twin is allocateInstallmentAmounts() in ContractCreateForm.js.
CREATE OR REPLACE FUNCTION public.money_refresh_schedule(p_contract_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $f$
DECLARE
  v_type text;
  v_total numeric;
  v_pct numeric;
  v_locked numeric;
  v_ids bigint[];
  v_weights numeric[];
  v_split numeric[];
  v_pr bigint;
  v_item_ids bigint[];
  v_item_split numeric[];
  i integer;
  k integer;
BEGIN
  SELECT c."contractType", contract_resolved_total(c.id) INTO v_type, v_total
  FROM contracts c WHERE c.id = p_contract_id;
  IF v_total IS NULL OR COALESCE(v_type, '') IN ('retainer', 'byService') THEN
    RETURN;
  END IF;
  SELECT sum(s.percentage) INTO v_pct
  FROM "contractPaymentSchedules" s WHERE s."contractId" = p_contract_id AND s.percentage > 0;
  IF v_pct IS NULL OR abs(v_pct - 100) > 0.01 THEN
    RETURN;
  END IF;
  SELECT COALESCE(sum(s.amount), 0) INTO v_locked
  FROM "contractPaymentSchedules" s
  WHERE s."contractId" = p_contract_id AND s.percentage > 0 AND money_schedule_row_locked(s.id);
  SELECT array_agg(s.id ORDER BY s."installmentNo", s.id),
         array_agg(s.percentage::numeric ORDER BY s."installmentNo", s.id)
  INTO v_ids, v_weights
  FROM "contractPaymentSchedules" s
  WHERE s."contractId" = p_contract_id AND s.percentage > 0 AND NOT money_schedule_row_locked(s.id);
  IF v_ids IS NULL THEN
    RETURN;
  END IF;
  v_split := money_split(GREATEST(v_total - v_locked, 0), v_weights, 0);
  FOR i IN 1..array_length(v_ids, 1) LOOP
    UPDATE "contractPaymentSchedules" SET amount = v_split[i]
    WHERE id = v_ids[i] AND amount IS DISTINCT FROM v_split[i];
    UPDATE "paymentRequests" SET "requestedAmount" = v_split[i]
    WHERE "contractPaymentScheduleId" = v_ids[i]
      AND lower(COALESCE(status, '')) = 'pending'
      AND "requestedAmount" IS DISTINCT FROM v_split[i];
    -- its items share the request's amount (largest remainder, by their
    -- current amounts; equally when they are all 0)
    FOR v_pr IN
      SELECT pr.id FROM "paymentRequests" pr
      WHERE pr."contractPaymentScheduleId" = v_ids[i] AND lower(COALESCE(pr.status, '')) = 'pending'
    LOOP
      SELECT array_agg(pri.id ORDER BY pri.id),
             money_split(v_split[i], array_agg(COALESCE(pri."requestedAmount", 0)::numeric ORDER BY pri.id), 0)
      INTO v_item_ids, v_item_split
      FROM "paymentRequestItems" pri WHERE pri."paymentRequestId" = v_pr;
      IF v_item_ids IS NOT NULL THEN
        FOR k IN 1..array_length(v_item_ids, 1) LOOP
          UPDATE "paymentRequestItems" SET "requestedAmount" = v_item_split[k]
          WHERE id = v_item_ids[k] AND "requestedAmount" IS DISTINCT FROM v_item_split[k];
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END;
$f$;

CREATE OR REPLACE FUNCTION public.money_contract_total_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  PERFORM contract_recompute_outstanding_for(NEW.id);
  PERFORM money_refresh_schedule(NEW.id);
  RETURN NULL;
END;
$f$;

-- Installments saved after the lines (the Contract form saves them last, with
-- amounts split in the browser): once they add up to 100%, the database
-- splits its own contract total. Fires after
-- trg_by_case_schedule_row_creates_payment_request (name order), so the
-- pending request just created follows too. money_refresh_schedule only
-- writes amount, which is not in the column list: no recursion.
CREATE OR REPLACE FUNCTION public.money_schedule_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM money_refresh_schedule(NEW."contractId");
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM money_refresh_schedule(OLD."contractId");
  ELSE
    PERFORM money_refresh_schedule(NEW."contractId");
    IF OLD."contractId" IS DISTINCT FROM NEW."contractId" THEN
      PERFORM money_refresh_schedule(OLD."contractId");
    END IF;
  END IF;
  RETURN NULL;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_schedule_changed ON "contractPaymentSchedules";
CREATE TRIGGER trg_money_schedule_changed
  AFTER INSERT OR DELETE OR UPDATE OF percentage, "contractId" ON "contractPaymentSchedules"
  FOR EACH ROW EXECUTE FUNCTION public.money_schedule_changed();

-- ---- 9. Rows saved before these triggers (spec §9)
-- The currency of a line's document (read through to_jsonb: a database
-- without the column gives NULL).
CREATE OR REPLACE FUNCTION public.money_line_doc_currency(p_table text, p_row jsonb)
RETURNS bigint
LANGUAGE sql
STABLE
AS $f$
  SELECT NULLIF(CASE p_table
    WHEN 'quotationServices' THEN (SELECT to_jsonb(q)->>'currencyId' FROM quotations q WHERE q.id = NULLIF(p_row->>'quotationId', '')::bigint)
    WHEN 'contractServices' THEN (SELECT to_jsonb(c)->>'currencyId' FROM contracts c WHERE c.id = NULLIF(p_row->>'contractId', '')::bigint)
    WHEN 'projectServices' THEN (SELECT to_jsonb(p)->>'currencyId' FROM projects p WHERE p.id = NULLIF(p_row->>'projectId', '')::bigint)
  END, '')::bigint;
$f$;

-- An older line with no currency on a document in another currency: the
-- database would read it as VND, the JS blocks as the document's currency.
-- Which one it was is decided by hand, never by the backfill.
CREATE OR REPLACE FUNCTION public.money_line_currency_unknown(p_table text, p_row jsonb)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT NULLIF(p_row->>'currencyId', '') IS NULL
     AND money_line_doc_currency(p_table, p_row) IS NOT NULL
     AND NOT money_is_base(money_line_doc_currency(p_table, p_row));
$f$;

-- The rate the backfill will give a line: its own stored rate if any; a case
-- line the rate of its contract (else quotation) line, stored or about to be
-- frozen by the backfill's earlier steps; otherwise money_line_rate().
CREATE OR REPLACE FUNCTION public.money_backfill_line_rate(p_table text, p_row jsonb, OUT rate numeric, OUT rate_date date)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_currency bigint := NULLIF(p_row->>'currencyId', '')::bigint;
BEGIN
  IF money_row_rate_frozen(p_row) THEN
    rate := (p_row->>'exchangeRateToBase')::numeric;
    rate_date := NULLIF(p_row->>'exchangeRateDate', '')::date;
    RETURN;
  END IF;
  IF p_table = 'projectServices' THEN
    SELECT CASE WHEN money_row_rate_frozen(to_jsonb(cs)) THEN cs."exchangeRateToBase"::numeric ELSE x.rate END,
           CASE WHEN money_row_rate_frozen(to_jsonb(cs)) THEN cs."exchangeRateDate" ELSE x.rate_date END
    INTO rate, rate_date
    FROM "contractServices" cs
    CROSS JOIN LATERAL money_line_rate('contractServices', to_jsonb(cs)) x
    WHERE cs."projectServiceId" = NULLIF(p_row->>'id', '')::bigint
      AND cs."currencyId" IS NOT DISTINCT FROM v_currency
      AND money_line_priced(to_jsonb(cs))
    ORDER BY cs.id
    LIMIT 1;
    IF rate IS NULL THEN
      SELECT CASE WHEN money_row_rate_frozen(to_jsonb(qs)) THEN qs."exchangeRateToBase"::numeric ELSE x.rate END,
             CASE WHEN money_row_rate_frozen(to_jsonb(qs)) THEN qs."exchangeRateDate" ELSE x.rate_date END
      INTO rate, rate_date
      FROM "quotationServices" qs
      CROSS JOIN LATERAL money_line_rate('quotationServices', to_jsonb(qs)) x
      WHERE qs.id = NULLIF(p_row->>'quotationServiceId', '')::bigint
        AND qs."currencyId" IS NOT DISTINCT FROM v_currency
        AND money_line_priced(to_jsonb(qs));
    END IF;
    IF rate IS NOT NULL THEN
      RETURN;
    END IF;
  END IF;
  SELECT x.rate, x.rate_date INTO rate, rate_date FROM money_line_rate(p_table, p_row) x;
END;
$f$;

-- Read-only: every priced line the backfill would touch, with the proposed
-- values and what happens to it:
--   'will fix'          its amounts change;
--   'rate only'         it gets its rate / own-currency amounts, VND unchanged;
--   'protected: contract already billed', 'missing rate', 'currency unknown'
--                       skipped by the backfill, decided by hand.
-- Its column list only grows (CREATE OR REPLACE VIEW).
CREATE OR REPLACE VIEW public.money_backfill_preview AS
WITH lines AS (
  SELECT 'quotationServices'::text AS table_name, qs.id, qs."serviceName" AS service_name,
         NULL::bigint AS contract_id, to_jsonb(qs) AS j
  FROM "quotationServices" qs
  UNION ALL
  SELECT 'contractServices', cs.id, cs."serviceName", cs."contractId", to_jsonb(cs) FROM "contractServices" cs
  UNION ALL
  SELECT 'projectServices', ps.id, ps."serviceName", p."contractId", to_jsonb(ps)
  FROM "projectServices" ps LEFT JOIN projects p ON p.id = ps."projectId"
),
priced AS (
  SELECT l.*,
         NULLIF(j->>'currencyId', '')::bigint AS currency_id,
         NULLIF(j->>'basePrice', '')::numeric AS base_price,
         COALESCE(NULLIF(NULLIF(j->>'quantity', '')::numeric, 0), 1) AS quantity,
         COALESCE(NULLIF(j->>'vat', '')::numeric, 0) AS vat,
         NULLIF(j->>'totalAmount', '')::numeric AS stored_total,
         CASE WHEN money_row_rate_frozen(j) THEN NULLIF(j->>'exchangeRateToBase', '')::numeric END AS stored_rate
  FROM lines l
  WHERE money_line_priced(j)
)
SELECT p.table_name, p.id, p.service_name, p.contract_id, money_currency_code(p.currency_id) AS currency,
       p.base_price, p.quantity, p.vat, p.stored_total, p.stored_rate,
       r.rate AS proposed_rate,
       r.rate_date AS proposed_rate_date,
       a.total_native AS proposed_total_native,
       a.total_vnd AS proposed_total,
       CASE
         WHEN money_line_currency_unknown(p.table_name, p.j) THEN 'currency unknown'
         WHEN r.rate IS NULL THEN 'missing rate'
         -- a billed contract's VND line whose amounts are already right only gets its rate
         WHEN p.contract_id IS NOT NULL AND money_contract_billing_locked(p.contract_id)
              AND NOT (money_is_base(p.currency_id) AND a.total_vnd IS NOT DISTINCT FROM p.stored_total)
           THEN 'protected: contract already billed'
         WHEN a.total_vnd IS NOT DISTINCT FROM p.stored_total THEN 'rate only'
         ELSE 'will fix'
       END AS action,
       money_currency_code(money_line_doc_currency(p.table_name, p.j)) AS document_currency
FROM priced p
CROSS JOIN LATERAL money_backfill_line_rate(p.table_name, p.j) r
CROSS JOIN LATERAL money_line_amounts(p.base_price, p.quantity, p.vat, money_decimals(p.currency_id), r.rate) a
WHERE p.stored_rate IS NULL OR a.total_vnd IS DISTINCT FROM p.stored_total;

-- Read-only: the document totals the backfill will write (only those that
-- change). A document keeps its total when any of its active lines is a
-- combo / unpriced line or one the backfill skips; billed contracts and their
-- cases are skipped. Installments of a listed contract follow its new total
-- (money_refresh_schedule), billed ones excepted.
CREATE OR REPLACE VIEW public.money_backfill_totals_preview AS
WITH docs AS (
  SELECT 'quotations'::text AS doc_table, q.id, q."totalAmount"::numeric AS current_total,
         lower(COALESCE(q."pricingMode", '')) = 'package' AS keeps_total, NULL::bigint AS contract_id
  FROM quotations q
  UNION ALL
  SELECT 'contracts', c.id, c."totalAmount"::numeric,
         COALESCE(c."contractType", '') = 'retainer' OR lower(COALESCE(c."pricingMode", '')) = 'package', c.id
  FROM contracts c
  UNION ALL
  SELECT 'projects', p.id, p."totalAmount"::numeric, false, p."contractId" FROM projects p
),
lines AS (
  SELECT 'quotations'::text AS doc_table, l."quotationId" AS doc_id, 'quotationServices'::text AS table_name, l.id, to_jsonb(l) AS j
  FROM "quotationServices" l WHERE money_line_active(l.status)
  UNION ALL
  SELECT 'contracts', l."contractId", 'contractServices', l.id, to_jsonb(l)
  FROM "contractServices" l WHERE money_line_active(l."lineStatus")
  UNION ALL
  SELECT 'projects', l."projectId", 'projectServices', l.id, to_jsonb(l)
  FROM "projectServices" l WHERE money_line_active(l.status)
),
totals AS (
  SELECT d.doc_table, d.id, d.current_total,
         CASE WHEN bool_and(
                money_line_priced(l.j)
                AND CASE WHEN bp.id IS NULL THEN money_line_settled(l.j)
                         ELSE bp.action IN ('will fix', 'rate only') END)
              THEN sum(COALESCE(bp.proposed_total, NULLIF(l.j->>'totalAmount', '')::numeric)) END AS proposed_total
  FROM docs d
  JOIN lines l ON l.doc_table = d.doc_table AND l.doc_id = d.id
  LEFT JOIN money_backfill_preview bp ON bp.table_name = l.table_name AND bp.id = l.id
  WHERE NOT d.keeps_total AND NOT money_contract_billing_locked(d.contract_id)
  GROUP BY d.doc_table, d.id, d.current_total
)
SELECT doc_table, id, current_total, proposed_total
FROM totals
WHERE proposed_total IS NOT NULL AND proposed_total IS DISTINCT FROM current_total;

-- Writes. Re-runs every priced / combo line through the triggers (a same-value
-- update: a stored rate is kept, a missing one is frozen at the document
-- date), then the document totals and the installment amounts. Skips the
-- lines of billed contracts and the lines whose currency has no rate at all:
-- both stay listed by the preview for a decision by hand.
CREATE OR REPLACE FUNCTION public.money_backfill_run()
RETURNS TABLE (step text, affected bigint)
LANGUAGE plpgsql
AS $f$
DECLARE
  n bigint;
BEGIN
  -- lets money_line_compute re-price rows saved before these triggers
  PERFORM set_config('money.backfill', 'on', true);
  UPDATE "quotationServices" l SET "basePrice" = l."basePrice"
  WHERE (money_line_priced(to_jsonb(l)) OR lower(COALESCE(l."pricingMode", '')) = 'package')
    AND NOT money_line_currency_unknown('quotationServices', to_jsonb(l))
    AND (money_row_rate_frozen(to_jsonb(l)) OR (money_line_rate('quotationServices', to_jsonb(l))).rate IS NOT NULL);
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'quotation lines'; affected := n; RETURN NEXT;

  UPDATE "contractServices" l SET "basePrice" = l."basePrice"
  WHERE (money_line_priced(to_jsonb(l)) OR lower(COALESCE(l."pricingMode", '')) = 'package')
    AND NOT money_contract_billing_locked(l."contractId")
    AND NOT money_line_currency_unknown('contractServices', to_jsonb(l))
    AND (money_row_rate_frozen(to_jsonb(l)) OR (money_line_rate('contractServices', to_jsonb(l))).rate IS NOT NULL);
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'contract lines'; affected := n; RETURN NEXT;

  -- billed contracts (and their cases): a VND line whose stored amounts are
  -- already what the database computes only gets its rate (1) — no amount
  -- moves; any other line of theirs stays for a decision by hand
  UPDATE "contractServices" l SET "basePrice" = l."basePrice"
  WHERE money_contract_billing_locked(l."contractId")
    AND money_line_priced(to_jsonb(l)) AND money_is_base(l."currencyId")
    AND NOT money_row_rate_frozen(to_jsonb(l))
    AND (SELECT (a.sub_vnd, a.vat_vnd, a.total_vnd)
         FROM money_line_amounts(l."basePrice"::numeric, NULLIF(to_jsonb(l)->>'quantity', '')::numeric, l.vat::numeric, 0, 1) a)
        IS NOT DISTINCT FROM (l."subTotal"::numeric, l."vatAmount"::numeric, l."totalAmount"::numeric);
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'billed contracts: VND lines (rate only)'; affected := n; RETURN NEXT;
  UPDATE "projectServices" l SET "basePrice" = l."basePrice"
  WHERE EXISTS (SELECT 1 FROM projects p WHERE p.id = l."projectId" AND money_contract_billing_locked(p."contractId"))
    AND money_line_priced(to_jsonb(l)) AND money_is_base(l."currencyId")
    AND NOT money_row_rate_frozen(to_jsonb(l))
    AND (SELECT (a.sub_vnd, a.vat_vnd, a.total_vnd)
         FROM money_line_amounts(l."basePrice"::numeric, NULLIF(to_jsonb(l)->>'quantity', '')::numeric, l.vat::numeric, 0, 1) a)
        IS NOT DISTINCT FROM (l."subTotal"::numeric, l."vatAmount"::numeric, l."totalAmount"::numeric);
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'billed cases: VND lines (rate only)'; affected := n; RETURN NEXT;

  UPDATE "projectServices" l SET "basePrice" = l."basePrice"
  WHERE (money_line_priced(to_jsonb(l)) OR lower(COALESCE(l."pricingMode", '')) = 'package')
    AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = l."projectId" AND money_contract_billing_locked(p."contractId"))
    AND NOT money_line_currency_unknown('projectServices', to_jsonb(l))
    AND (money_row_rate_frozen(to_jsonb(l)) OR (money_line_rate('projectServices', to_jsonb(l))).rate IS NOT NULL);
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'case lines'; affected := n; RETURN NEXT;

  UPDATE quotations q SET "totalAmount" = q."totalAmount"
  WHERE EXISTS (SELECT 1 FROM "quotationServices" l WHERE l."quotationId" = q.id AND money_line_priced(to_jsonb(l)));
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'quotation totals'; affected := n; RETURN NEXT;

  UPDATE contracts c SET "totalAmount" = c."totalAmount"
  WHERE NOT money_contract_billing_locked(c.id)
    AND EXISTS (SELECT 1 FROM "contractServices" l WHERE l."contractId" = c.id AND money_line_priced(to_jsonb(l)));
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'contract totals'; affected := n; RETURN NEXT;

  UPDATE projects p SET "totalAmount" = p."totalAmount"
  WHERE NOT money_contract_billing_locked(p."contractId")
    AND EXISTS (SELECT 1 FROM "projectServices" l WHERE l."projectId" = p.id AND money_line_priced(to_jsonb(l)));
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'case totals'; affected := n; RETURN NEXT;

  PERFORM money_refresh_schedule(c.id) FROM contracts c WHERE NOT money_contract_billing_locked(c.id);
  step := 'installments'; affected := NULL; RETURN NEXT;
  PERFORM set_config('money.backfill', 'off', true);
END;
$f$;

-- Writes, for one contract the preview lists as 'protected' (already
-- billed), once the user has decided to re-price it anyway: its lines, its
-- cases' lines, their totals. Its installments are not re-split (billed ones
-- keep their amounts; money_refresh_schedule runs if its total changes).
CREATE OR REPLACE FUNCTION public.money_backfill_contract(p_contract_id bigint)
RETURNS TABLE (step text, affected bigint)
LANGUAGE plpgsql
AS $f$
DECLARE
  n bigint;
BEGIN
  PERFORM set_config('money.backfill', 'on', true);
  UPDATE "contractServices" l SET "basePrice" = l."basePrice"
  WHERE l."contractId" = p_contract_id
    AND (money_line_priced(to_jsonb(l)) OR lower(COALESCE(l."pricingMode", '')) = 'package')
    AND NOT money_line_currency_unknown('contractServices', to_jsonb(l))
    AND (money_row_rate_frozen(to_jsonb(l)) OR (money_line_rate('contractServices', to_jsonb(l))).rate IS NOT NULL);
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'contract lines'; affected := n; RETURN NEXT;

  UPDATE "projectServices" l SET "basePrice" = l."basePrice"
  WHERE l."projectId" IN (SELECT p.id FROM projects p WHERE p."contractId" = p_contract_id)
    AND (money_line_priced(to_jsonb(l)) OR lower(COALESCE(l."pricingMode", '')) = 'package')
    AND NOT money_line_currency_unknown('projectServices', to_jsonb(l))
    AND (money_row_rate_frozen(to_jsonb(l)) OR (money_line_rate('projectServices', to_jsonb(l))).rate IS NOT NULL);
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'case lines'; affected := n; RETURN NEXT;

  PERFORM money_touch_header('contracts', p_contract_id);
  PERFORM money_touch_header('projects', p.id) FROM projects p WHERE p."contractId" = p_contract_id;
  step := 'totals'; affected := NULL; RETURN NEXT;
  PERFORM set_config('money.backfill', 'off', true);
END;
$f$;
