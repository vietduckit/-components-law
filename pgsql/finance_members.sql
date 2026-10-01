-- ============================================================
-- Finance members (2026-09-28): who handles and is notified about the money
-- of a case. Each case has Finance members (projects.financeMembers ->
-- lawyers); every Payment Request, Invoice and Payment carries its own list
-- (financeMembers), set when it is created and editable afterwards.
--
-- Default people, whoever creates the record (Finance tab, another block, a
-- trigger such as the combo / retainer / By Case automation):
--   * Payment Request -> Finance members + Manager of every case that uses
--     its contract (finance_default_member_ids);
--   * Invoice -> the people of its Payment Request (else the default people);
--   * Payment -> the people of its invoice's / its own Payment Request (else
--     the default people).
-- When the UI sends financeMembers, NocoBase replaces this default list with
-- its own right after the insert (belongsToMany "set"), so what the person
-- picked in the dialog wins.
--
-- Requires the through tables NocoBase creates when
-- JsField/RegisterFinanceMembersFields.js runs — run that script FIRST:
--   "projectFinanceMembers" (projectId, lawyerId)
--   "paymentRequestFinanceMembers" (paymentRequestId, lawyerId)
--   "invoiceFinanceMembers" (invoiceId, lawyerId)
--   "paymentFinanceMembers" (paymentId, lawyerId)
-- Idempotent: re-running only adds people to records that have none.
-- Test: pgsql/tests/finance_members_test.sql
-- ============================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projectFinanceMembers', 'paymentRequestFinanceMembers', 'invoiceFinanceMembers', 'paymentFinanceMembers'] LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE EXCEPTION 'Table "%" is missing — run JsField/RegisterFinanceMembersFields.js in NocoBase first.', t;
    END IF;
  END LOOP;
END $$;

-- Adds the people not linked yet to one record; returns how many were added.
-- Works whatever shape NocoBase gave the through table: an id with or
-- without a default, createdAt/updatedAt or not.
CREATE OR REPLACE FUNCTION public.finance_link_members(p_table text, p_fk text, p_id bigint, p_lawyer_ids bigint[])
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_needs_id boolean;
  v_has_ts boolean;
  v_lawyer bigint;
  v_exists boolean;
  v_added integer := 0;
  v_try integer;
BEGIN
  IF p_id IS NULL OR p_lawyer_ids IS NULL THEN
    RETURN 0;
  END IF;
  SELECT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'id' AND column_default IS NULL
         ),
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'createdAt'
         )
  INTO v_needs_id, v_has_ts;

  FOREACH v_lawyer IN ARRAY p_lawyer_ids LOOP
    CONTINUE WHEN v_lawyer IS NULL;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE %I = $1 AND "lawyerId" = $2)', p_table, p_fk)
      INTO v_exists USING p_id, v_lawyer;
    CONTINUE WHEN v_exists;
    FOR v_try IN 1..5 LOOP
      BEGIN
        EXECUTE format(
          'INSERT INTO %I (%s%I, "lawyerId"%s) VALUES (%s$1, $2%s)',
          p_table,
          CASE WHEN v_needs_id THEN 'id, ' ELSE '' END,
          p_fk,
          CASE WHEN v_has_ts THEN ', "createdAt", "updatedAt"' ELSE '' END,
          CASE WHEN v_needs_id THEN '$3, ' ELSE '' END,
          CASE WHEN v_has_ts THEN ', now(), now()' ELSE '' END
        ) USING p_id, v_lawyer,
          -- same id scheme as the rest of the payment SQL (stays below 2^53 for the browser)
          (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint * 1000 + (random() * 999)::int;
        v_added := v_added + 1;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_try = 5 THEN RAISE; END IF;
      END;
    END LOOP;
  END LOOP;
  RETURN v_added;
END;
$function$;

-- Finance members + Manager of every case that uses the contract, each once.
CREATE OR REPLACE FUNCTION public.finance_default_member_ids(p_contract_id bigint)
RETURNS bigint[]
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(array_agg(DISTINCT x.id ORDER BY x.id), '{}'::bigint[])
  FROM (
    SELECT fm."lawyerId" AS id
    FROM "projectFinanceMembers" fm
    JOIN projects p ON p.id = fm."projectId"
    WHERE p."contractId" = p_contract_id
    UNION
    SELECT p."managerId"
    FROM projects p
    WHERE p."contractId" = p_contract_id
  ) x
  WHERE x.id IS NOT NULL;
$function$;

-- The people of a Payment Request (empty when it has none).
CREATE OR REPLACE FUNCTION public.finance_request_member_ids(p_request_id bigint)
RETURNS bigint[]
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(array_agg(DISTINCT "lawyerId" ORDER BY "lawyerId"), '{}'::bigint[])
  FROM "paymentRequestFinanceMembers"
  WHERE "paymentRequestId" = p_request_id AND "lawyerId" IS NOT NULL;
$function$;

-- The contract of a record whose own contractId may be empty.
CREATE OR REPLACE FUNCTION public.finance_request_contract_id(p_request_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
AS $function$
  SELECT "contractId" FROM "paymentRequests" WHERE id = p_request_id;
$function$;

CREATE OR REPLACE FUNCTION public.finance_members_on_request_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."contractId" IS NOT NULL THEN
    PERFORM public.finance_link_members('paymentRequestFinanceMembers', 'paymentRequestId', NEW.id,
      public.finance_default_member_ids(NEW."contractId"));
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_members_on_request_insert ON "paymentRequests";
CREATE TRIGGER trg_finance_members_on_request_insert
  AFTER INSERT ON "paymentRequests"
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_members_on_request_insert();

-- Invoice: its request's people, else the contract's default people.
CREATE OR REPLACE FUNCTION public.finance_invoice_member_ids(p_request_id bigint, p_contract_id bigint)
RETURNS bigint[]
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_ids bigint[] := public.finance_request_member_ids(p_request_id);
BEGIN
  IF cardinality(v_ids) > 0 THEN
    RETURN v_ids;
  END IF;
  RETURN public.finance_default_member_ids(COALESCE(p_contract_id, public.finance_request_contract_id(p_request_id)));
END;
$function$;

CREATE OR REPLACE FUNCTION public.finance_members_on_invoice_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM public.finance_link_members('invoiceFinanceMembers', 'invoiceId', NEW.id,
    public.finance_invoice_member_ids(NEW."paymentRequestId", NEW."contractId"));
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_members_on_invoice_insert ON invoices;
CREATE TRIGGER trg_finance_members_on_invoice_insert
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_members_on_invoice_insert();

-- Payment: the people of its invoice's request, or its own request, else the
-- contract's default people.
CREATE OR REPLACE FUNCTION public.finance_payment_member_ids(p_invoice_id bigint, p_request_id bigint, p_contract_id bigint)
RETURNS bigint[]
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_request bigint := COALESCE(p_request_id, (SELECT "paymentRequestId" FROM invoices WHERE id = p_invoice_id));
BEGIN
  RETURN public.finance_invoice_member_ids(v_request, p_contract_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.finance_members_on_payment_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM public.finance_link_members('paymentFinanceMembers', 'paymentId', NEW.id,
    public.finance_payment_member_ids(NEW."invoiceId", NEW."paymentRequestId", NEW."contractId"));
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_members_on_payment_insert ON payments;
CREATE TRIGGER trg_finance_members_on_payment_insert
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_members_on_payment_insert();

-- One-time (and safe to repeat): records created before today get their
-- default people; records that already have people are left alone.
CREATE OR REPLACE FUNCTION public.finance_members_backfill()
RETURNS TABLE (payment_requests integer, invoices integer, payments integer)
LANGUAGE plpgsql
AS $function$
DECLARE
  r RECORD;
BEGIN
  payment_requests := 0;
  invoices := 0;
  payments := 0;
  FOR r IN
    SELECT pr.id, pr."contractId" FROM "paymentRequests" pr
    WHERE pr."contractId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "paymentRequestFinanceMembers" m WHERE m."paymentRequestId" = pr.id)
  LOOP
    IF public.finance_link_members('paymentRequestFinanceMembers', 'paymentRequestId', r.id,
         public.finance_default_member_ids(r."contractId")) > 0 THEN
      payment_requests := payment_requests + 1;
    END IF;
  END LOOP;
  FOR r IN
    SELECT i.id, i."paymentRequestId", i."contractId" FROM invoices i
    WHERE NOT EXISTS (SELECT 1 FROM "invoiceFinanceMembers" m WHERE m."invoiceId" = i.id)
  LOOP
    IF public.finance_link_members('invoiceFinanceMembers', 'invoiceId', r.id,
         public.finance_invoice_member_ids(r."paymentRequestId", r."contractId")) > 0 THEN
      invoices := invoices + 1;
    END IF;
  END LOOP;
  FOR r IN
    SELECT p.id, p."invoiceId", p."paymentRequestId", p."contractId" FROM payments p
    WHERE NOT EXISTS (SELECT 1 FROM "paymentFinanceMembers" m WHERE m."paymentId" = p.id)
  LOOP
    IF public.finance_link_members('paymentFinanceMembers', 'paymentId', r.id,
         public.finance_payment_member_ids(r."invoiceId", r."paymentRequestId", r."contractId")) > 0 THEN
      payments := payments + 1;
    END IF;
  END LOOP;
  RETURN NEXT;
END;
$function$;

-- Existing records: how many got people now.
SELECT * FROM public.finance_members_backfill();
