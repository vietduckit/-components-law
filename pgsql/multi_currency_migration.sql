-- ══════════════════════════════════════════════════════════════════════════
-- FILE: multi_currency_migration.sql
-- Purpose: Phase 1 foundation for multi-currency accounting support —
--          new `currencies` + `exchangeRates` catalog tables, plus
--          `currencyId` / `exchangeRateToBase` columns (with VND=1 backfill)
--          on every monetary table. Fully additive and backward compatible:
--          nothing in the app reads these new columns yet.
--
-- How to run: Execute this script once in pgAdmin or psql.
--             Idempotent — safe to re-run (IF NOT EXISTS / ON CONFLICT /
--             WHERE ... IS NULL guards throughout).
--
-- NOT included in this pass (pending live-DB field-name verification via
-- the Nocobase admin "Configure fields" UI, not this schema dump):
--   public."paymentRequests", public."paymentRequestItems"
-- Add their ADD COLUMN / backfill statements in a follow-up script once
-- their real field names are confirmed — do not guess them here.
--
-- Tables touched: currencies (new), exchangeRates (new), contracts,
--                 quotations, contractServices, quotationServices,
--                 projectServices, payments.
-- ══════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 1: currencies (admin-managed catalog)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.currencies (
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    id bigint NOT NULL,
    "createdById" bigint,
    "updatedById" bigint,
    code character varying(3) NOT NULL,
    name character varying(255),
    symbol character varying(10),
    "decimalPlaces" smallint DEFAULT 0,
    "isBaseCurrency" boolean DEFAULT false,
    sort bigint,
    CONSTRAINT currencies_pkey PRIMARY KEY (id),
    CONSTRAINT currencies_code_unique UNIQUE (code)
);

CREATE SEQUENCE IF NOT EXISTS public.currencies_id_seq
    AS bigint
    OWNED BY public.currencies.id;

ALTER TABLE ONLY public.currencies
    ALTER COLUMN id SET DEFAULT nextval('public.currencies_id_seq'::regclass);

-- ── Enforce "exactly one isBaseCurrency = true" ──────────────────────────
-- Several downstream calculations (the FX workflow, every toBase()/
-- fromBase() helper) silently depend on there being exactly one base
-- currency row. Rather than leave this as an app-layer-only convention
-- (which fails silently if ever violated), unset any other row when a new
-- one is marked as base — same idiom as this repo's other protective
-- triggers (see ProtectRelationalFields.sql).
CREATE OR REPLACE FUNCTION public.enforce_single_base_currency()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
BEGIN
    IF NEW."isBaseCurrency" IS TRUE THEN
        UPDATE public.currencies
        SET "isBaseCurrency" = false
        WHERE id <> NEW.id
          AND "isBaseCurrency" IS TRUE;
    END IF;
    RETURN NEW;
END;
$BODY$;

ALTER FUNCTION public.enforce_single_base_currency()
    OWNER TO nocobase;

DROP TRIGGER IF EXISTS trg_enforce_single_base_currency ON public.currencies;

CREATE TRIGGER trg_enforce_single_base_currency
    AFTER INSERT OR UPDATE
    ON public.currencies
    FOR EACH ROW
    WHEN (NEW."isBaseCurrency" IS TRUE)
    EXECUTE FUNCTION public.enforce_single_base_currency();


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 2: exchangeRates (time-series reference table)
-- ══════════════════════════════════════════════════════════════════════════
-- NOTE: this is the admin/reference rate history — NOT the frozen rate that
-- gets copied onto each transactional record at creation time (see Section 4
-- comment). Rows here can be corrected retroactively; frozen per-record
-- rates never change once written.

CREATE TABLE IF NOT EXISTS public."exchangeRates" (
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    id bigint NOT NULL,
    "createdById" bigint,
    "updatedById" bigint,
    "currencyId" bigint NOT NULL,
    "rateToBase" double precision NOT NULL,
    "effectiveDate" date NOT NULL,
    source character varying(255),
    "createdVia" character varying(50),
    CONSTRAINT "exchangeRates_pkey" PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public."exchangeRates_id_seq"
    AS bigint
    OWNED BY public."exchangeRates".id;

ALTER TABLE ONLY public."exchangeRates"
    ALTER COLUMN id SET DEFAULT nextval('public."exchangeRates_id_seq"'::regclass);


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 3: seed currencies (VND base + USD, EUR, SGD)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO public.currencies (code, name, symbol, "decimalPlaces", "isBaseCurrency", sort)
VALUES
    ('VND', 'Vietnamese Dong', '₫', 0, true, 1),
    ('USD', 'US Dollar', '$', 2, false, 2),
    ('EUR', 'Euro', '€', 2, false, 3),
    ('SGD', 'Singapore Dollar', 'S$', 2, false, 4)
ON CONFLICT (code) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 4: add currencyId / exchangeRateToBase columns
-- ══════════════════════════════════════════════════════════════════════════
-- `exchangeRateToBase` = how many units of base currency (VND) 1 unit of
-- this record's currency was worth AT THE MOMENT THE RECORD WAS CREATED —
-- copied once from exchangeRates by the application, then frozen forever.
-- Root records (contracts, quotations, payments, projectServices) get a
-- real `currencyId` FK-style column since each can independently choose a
-- currency. Line-item tables owned by exactly one parent (contractServices,
-- quotationServices) get ONLY the denormalized rate, not a separate
-- currencyId, to avoid every dashboard summation site needing a parent join.

ALTER TABLE public.contracts
    ADD COLUMN IF NOT EXISTS "currencyId" bigint,
    ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision;

ALTER TABLE public.quotations
    ADD COLUMN IF NOT EXISTS "currencyId" bigint,
    ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision;

ALTER TABLE public."projectServices"
    ADD COLUMN IF NOT EXISTS "currencyId" bigint,
    ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision;

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS "currencyId" bigint,
    ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision;

ALTER TABLE public."contractServices"
    ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision;

ALTER TABLE public."quotationServices"
    ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 5: backfill existing rows to VND / rate = 1
-- ══════════════════════════════════════════════════════════════════════════
-- Review row counts (the SELECT below) before running the UPDATE block in
-- production — same convention as compact_document_share_activity.sql.

-- Preview: how many rows will be touched per table.
-- SELECT
--     (SELECT count(*) FROM public.contracts WHERE "currencyId" IS NULL) AS contracts_to_backfill,
--     (SELECT count(*) FROM public.quotations WHERE "currencyId" IS NULL) AS quotations_to_backfill,
--     (SELECT count(*) FROM public."projectServices" WHERE "currencyId" IS NULL) AS project_services_to_backfill,
--     (SELECT count(*) FROM public.payments WHERE "currencyId" IS NULL) AS payments_to_backfill,
--     (SELECT count(*) FROM public."contractServices" WHERE "exchangeRateToBase" IS NULL) AS contract_services_to_backfill,
--     (SELECT count(*) FROM public."quotationServices" WHERE "exchangeRateToBase" IS NULL) AS quotation_services_to_backfill;

DO $$
DECLARE
    vnd_id bigint;
BEGIN
    SELECT id INTO vnd_id FROM public.currencies WHERE code = 'VND';

    UPDATE public.contracts
    SET "currencyId" = vnd_id, "exchangeRateToBase" = 1
    WHERE "currencyId" IS NULL;

    UPDATE public.quotations
    SET "currencyId" = vnd_id, "exchangeRateToBase" = 1
    WHERE "currencyId" IS NULL;

    UPDATE public."projectServices"
    SET "currencyId" = vnd_id, "exchangeRateToBase" = 1
    WHERE "currencyId" IS NULL;

    UPDATE public.payments
    SET "currencyId" = vnd_id, "exchangeRateToBase" = 1
    WHERE "currencyId" IS NULL;

    UPDATE public."contractServices"
    SET "exchangeRateToBase" = 1
    WHERE "exchangeRateToBase" IS NULL;

    UPDATE public."quotationServices"
    SET "exchangeRateToBase" = 1
    WHERE "exchangeRateToBase" IS NULL;
END $$;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 6: default exchangeRateToBase = 1 for future inserts
-- ══════════════════════════════════════════════════════════════════════════
-- Ensures any record created before the JS-block UI changes ship (Phase 3)
-- still defaults correctly instead of landing NULL.

ALTER TABLE public.contracts ALTER COLUMN "exchangeRateToBase" SET DEFAULT 1;
ALTER TABLE public.quotations ALTER COLUMN "exchangeRateToBase" SET DEFAULT 1;
ALTER TABLE public."projectServices" ALTER COLUMN "exchangeRateToBase" SET DEFAULT 1;
ALTER TABLE public.payments ALTER COLUMN "exchangeRateToBase" SET DEFAULT 1;
ALTER TABLE public."contractServices" ALTER COLUMN "exchangeRateToBase" SET DEFAULT 1;
ALTER TABLE public."quotationServices" ALTER COLUMN "exchangeRateToBase" SET DEFAULT 1;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 7: verification queries (run after the script, not part of it)
-- ══════════════════════════════════════════════════════════════════════════
-- SELECT * FROM public.currencies ORDER BY sort;
-- SELECT code, "isBaseCurrency" FROM public.currencies WHERE "isBaseCurrency" IS TRUE;  -- must return exactly 1 row (VND)
-- SELECT count(*) FROM public.contracts WHERE "currencyId" IS NULL;   -- must be 0
-- SELECT count(*) FROM public.quotations WHERE "currencyId" IS NULL;  -- must be 0
-- SELECT count(*) FROM public.payments WHERE "currencyId" IS NULL;    -- must be 0
-- SELECT count(*) FROM public."projectServices" WHERE "currencyId" IS NULL;      -- must be 0
-- SELECT count(*) FROM public."contractServices" WHERE "exchangeRateToBase" IS NULL;  -- must be 0
-- SELECT count(*) FROM public."quotationServices" WHERE "exchangeRateToBase" IS NULL; -- must be 0
-- -- Trigger check: this should silently move isBaseCurrency to USD and unset VND's flag.
-- -- UPDATE public.currencies SET "isBaseCurrency" = true WHERE code = 'USD';
-- -- SELECT code, "isBaseCurrency" FROM public.currencies ORDER BY sort;  -- only USD should be true; revert manually after testing.
