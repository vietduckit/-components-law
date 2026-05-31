-- ══════════════════════════════════════════════════════════════════════════
-- FILE: ProtectRelationalFields.sql
-- Purpose: Database-level triggers to prevent customerId and
--          internalCompanyId from being nullified on quotations and contracts.
--
-- How to run: Execute this script once in pgAdmin or psql.
--             Safe to re-run (uses CREATE OR REPLACE + DROP IF EXISTS).
--
-- Tables protected: public.quotations, public.contracts
-- ══════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 1: QUOTATIONS
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.protect_quotation_relational_fields()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
DECLARE
    parent_customer_id      BIGINT;
    parent_internal_company BIGINT;
BEGIN
    -- ── Layer 1: Preserve existing customerId ────────────────────────────
    -- If the UPDATE tries to set customerId to NULL but the row already had
    -- a value → silently restore the old value. No exception thrown.
    IF NEW."customerId" IS NULL AND OLD."customerId" IS NOT NULL THEN
        NEW."customerId" := OLD."customerId";
    END IF;

    -- ── Layer 1: Preserve existing internalCompanyId ─────────────────────
    IF NEW."internalCompanyId" IS NULL AND OLD."internalCompanyId" IS NOT NULL THEN
        NEW."internalCompanyId" := OLD."internalCompanyId";
    END IF;

    -- ── Layer 2: Inherit from parent quotation (sub-quotation case) ───────
    -- If the record is a sub-quotation (parentId IS NOT NULL) and still has
    -- no customerId after Layer 1 → pull the value from the parent quotation.
    IF NEW."customerId" IS NULL AND NEW."parentId" IS NOT NULL THEN
        SELECT q."customerId", q."internalCompanyId"
        INTO   parent_customer_id, parent_internal_company
        FROM   public.quotations q
        WHERE  q.id = NEW."parentId";

        IF parent_customer_id IS NOT NULL THEN
            NEW."customerId" := parent_customer_id;
        END IF;

        IF NEW."internalCompanyId" IS NULL AND parent_internal_company IS NOT NULL THEN
            NEW."internalCompanyId" := parent_internal_company;
        END IF;
    END IF;

    RETURN NEW;
END;
$BODY$;

ALTER FUNCTION public.protect_quotation_relational_fields()
    OWNER TO nocobase;

-- Attach trigger (drop first to allow safe re-run)
DROP TRIGGER IF EXISTS trg_protect_quotation_customer ON public.quotations;

CREATE TRIGGER trg_protect_quotation_customer
    BEFORE UPDATE
    ON public.quotations
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_quotation_relational_fields();


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 2: CONTRACTS
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.protect_contract_relational_fields()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
DECLARE
    parent_customer_id      BIGINT;
    parent_internal_company BIGINT;
BEGIN
    -- ── Layer 1: Preserve existing customerId ────────────────────────────
    IF NEW."customerId" IS NULL AND OLD."customerId" IS NOT NULL THEN
        NEW."customerId" := OLD."customerId";
    END IF;

    -- ── Layer 1: Preserve existing internalCompanyId ─────────────────────
    IF NEW."internalCompanyId" IS NULL AND OLD."internalCompanyId" IS NOT NULL THEN
        NEW."internalCompanyId" := OLD."internalCompanyId";
    END IF;

    -- ── Layer 2: Inherit from parent contract ─────────────────────────────
    IF NEW."customerId" IS NULL AND NEW."parentId" IS NOT NULL THEN
        SELECT c."customerId", c."internalCompanyId"
        INTO   parent_customer_id, parent_internal_company
        FROM   public.contracts c
        WHERE  c.id = NEW."parentId";

        IF parent_customer_id IS NOT NULL THEN
            NEW."customerId" := parent_customer_id;
        END IF;

        IF NEW."internalCompanyId" IS NULL AND parent_internal_company IS NOT NULL THEN
            NEW."internalCompanyId" := parent_internal_company;
        END IF;
    END IF;

    RETURN NEW;
END;
$BODY$;

ALTER FUNCTION public.protect_contract_relational_fields()
    OWNER TO nocobase;

-- Attach trigger (drop first to allow safe re-run)
DROP TRIGGER IF EXISTS trg_protect_contract_customer ON public.contracts;

CREATE TRIGGER trg_protect_contract_customer
    BEFORE UPDATE
    ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_contract_relational_fields();


-- ══════════════════════════════════════════════════════════════════════════
-- VERIFICATION: Run after applying to confirm triggers are active
-- ══════════════════════════════════════════════════════════════════════════
-- SELECT trigger_name, event_manipulation, action_timing, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name IN (
--     'trg_protect_quotation_customer',
--     'trg_protect_contract_customer'
-- );
