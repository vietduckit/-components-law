-- ============================================================
-- Finance foundation (2026-09-28)
-- Spec:  docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §2 §4 §5
-- Plan:  docs/superpowers/plans/2026-09-28-finance-p1-foundation.md
--
-- The database derives, for every Payment Request and Invoice, how much has
-- been paid, what is still owed and since when it is overdue, from Received
-- payments only (in VND), whenever a payment, request or invoice changes.
-- A daily NocoBase cron workflow (JsField/Workflow/CreateFinanceOverdueCronWorkflow.js)
-- calls finance_refresh_overdue() so rows turn overdue on the day after
-- their due date even when nothing else touches them.
--
-- Deploy order (see the plan's checklist):
--   1. pgsql/contract_payment_status_workflow.sql  (helpers used below)
--   2. pgsql/finance_foundation_audit.sql          (read-only; resolve duplicates)
--   3. this file
--   4. pgsql/finance_foundation_migrate.sql        (one-time data changes)
-- Requires payments."paymentRequestId" (JsField/RegisterPaymentRequestLinkFields.js),
-- invoices."paymentRequestId" (JsField/RegisterInvoicePaymentRequestField.js).
-- payments."exchangeRateToBase" (pgsql/multi_currency_migration.sql) is optional:
-- amounts are read through finance_payment_vnd(to_jsonb(p)), rate 1 when absent.
-- Idempotent.
-- ============================================================

-- ---- Columns (registered as NocoBase fields by JsField/RegisterFinanceFoundationFields.js)
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "paidAmount" double precision DEFAULT 0;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "outstandingAmount" double precision;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "overdueSince" date;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "overdueNotifiedAt" timestamp with time zone;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "billingPlanId" bigint;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "cycleNo" integer;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "overdueSince" date;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "overdueNotifiedAt" timestamp with time zone;

-- ---- Dates are business dates in Vietnam
CREATE OR REPLACE FUNCTION public.finance_today()
RETURNS date
LANGUAGE sql
STABLE
AS $function$
  SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
$function$;

CREATE OR REPLACE FUNCTION public.finance_local_date(p_ts timestamptz)
RETURNS date
LANGUAGE sql
STABLE
AS $function$
  SELECT (p_ts AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
$function$;

-- ---- What has been received against a request / an invoice (VND)
-- A request counts payments linked to it, plus payments linked only to one
-- of its (non-cancelled) invoices.
CREATE OR REPLACE FUNCTION public.finance_pr_paid(p_pr_id bigint)
RETURNS numeric
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(SUM(finance_payment_vnd(to_jsonb(p))), 0)
  FROM payments p
  WHERE finance_is_received(p."paymentStatus")
    AND (
      p."paymentRequestId" = p_pr_id
      OR (
        p."paymentRequestId" IS NULL
        AND p."invoiceId" IN (
          SELECT i.id FROM invoices i
          WHERE i."paymentRequestId" = p_pr_id
            AND lower(btrim(COALESCE(i.status, ''))) <> 'cancelled'
        )
      )
    );
$function$;

-- An invoice counts payments linked to it, plus payments linked only to its
-- request when it is that request's single non-cancelled invoice.
CREATE OR REPLACE FUNCTION public.finance_invoice_paid(p_invoice_id bigint)
RETURNS numeric
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(SUM(finance_payment_vnd(to_jsonb(p))), 0)
  FROM payments p
  JOIN invoices i ON i.id = p_invoice_id
  WHERE finance_is_received(p."paymentStatus")
    AND (
      p."invoiceId" = i.id
      OR (
        p."invoiceId" IS NULL
        AND i."paymentRequestId" IS NOT NULL
        AND p."paymentRequestId" = i."paymentRequestId"
        AND (
          SELECT count(*) FROM invoices i2
          WHERE i2."paymentRequestId" = i."paymentRequestId"
            AND lower(btrim(COALESCE(i2.status, ''))) <> 'cancelled'
        ) = 1
      )
    );
$function$;

-- ---- Request: outstanding + overdue, derived on every write
-- overdueNotifiedAt is cleared whenever the request stops being overdue, so a
-- request that becomes overdue again is announced again (plan 5).
CREATE OR REPLACE FUNCTION public.finance_payment_request_derive()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_due date;
BEGIN
  NEW."paidAmount" := COALESCE(NEW."paidAmount", 0);
  NEW."outstandingAmount" := GREATEST(COALESCE(NEW."requestedAmount", 0) - NEW."paidAmount", 0);
  v_due := finance_local_date(NEW."dueDate");
  IF NEW.status = 'active' AND v_due IS NOT NULL AND v_due < finance_today() AND NEW."outstandingAmount" > 0 THEN
    NEW."overdueSince" := v_due + 1;
  ELSE
    NEW."overdueSince" := NULL;
    NEW."overdueNotifiedAt" := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_payment_request_derive ON "paymentRequests";
CREATE TRIGGER trg_finance_payment_request_derive
  BEFORE INSERT OR UPDATE ON "paymentRequests"
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_payment_request_derive();

-- ---- Invoice: outstanding + status + overdue, derived on every write
-- draft / cancelled are set by hand and kept; otherwise paid > overdue >
-- partial > pending. Due date = the invoice's own deadline, else its request's.
CREATE OR REPLACE FUNCTION public.finance_invoice_derive()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_total numeric;
  v_paid numeric;
  v_due date;
BEGIN
  v_total := COALESCE(NEW."totalAmount", 0);
  v_paid := COALESCE(NEW."amountPaid", 0);
  NEW."amountPaid" := v_paid;
  NEW."outStandingAmount" := GREATEST(v_total - v_paid, 0);

  IF lower(btrim(COALESCE(NEW.status, ''))) IN ('draft', 'cancelled') THEN
    NEW."overdueSince" := NULL;
    NEW."overdueNotifiedAt" := NULL;
    RETURN NEW;
  END IF;

  v_due := finance_local_date(COALESCE(
    NEW.deadline,
    (SELECT pr."dueDate" FROM "paymentRequests" pr WHERE pr.id = NEW."paymentRequestId")
  ));

  NEW.status := CASE
    WHEN v_total > 0 AND v_paid >= v_total THEN 'paid'
    WHEN v_due IS NOT NULL AND v_due < finance_today() AND v_total > v_paid THEN 'overdue'
    WHEN v_paid > 0 THEN 'partial'
    ELSE 'pending'
  END;

  IF NEW.status = 'overdue' THEN
    NEW."overdueSince" := v_due + 1;
  ELSE
    NEW."overdueSince" := NULL;
    NEW."overdueNotifiedAt" := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_invoice_derive ON invoices;
CREATE TRIGGER trg_finance_invoice_derive
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_invoice_derive();

-- ---- Payments roll up into their request(s) and invoice(s)
CREATE OR REPLACE FUNCTION public.finance_payment_rollup()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pr_ids bigint[] := ARRAY[]::bigint[];
  v_inv_ids bigint[] := ARRAY[]::bigint[];
  v_id bigint;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_pr_ids := v_pr_ids || NEW."paymentRequestId";
    v_inv_ids := v_inv_ids || NEW."invoiceId";
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_pr_ids := v_pr_ids || OLD."paymentRequestId";
    v_inv_ids := v_inv_ids || OLD."invoiceId";
  END IF;

  -- an invoice's request counts payments made on the invoice, and a request's
  -- single invoice counts payments made on the request
  v_pr_ids := v_pr_ids || ARRAY(
    SELECT "paymentRequestId" FROM invoices WHERE id = ANY (v_inv_ids) AND "paymentRequestId" IS NOT NULL
  );
  v_inv_ids := v_inv_ids || ARRAY(
    SELECT id FROM invoices WHERE "paymentRequestId" = ANY (v_pr_ids)
  );

  FOR v_id IN SELECT DISTINCT x FROM unnest(v_inv_ids) AS x WHERE x IS NOT NULL LOOP
    UPDATE invoices SET "amountPaid" = finance_invoice_paid(v_id) WHERE id = v_id;
  END LOOP;
  FOR v_id IN SELECT DISTINCT x FROM unnest(v_pr_ids) AS x WHERE x IS NOT NULL LOOP
    UPDATE "paymentRequests" SET "paidAmount" = finance_pr_paid(v_id) WHERE id = v_id;
  END LOOP;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_payment_rollup ON payments;
CREATE TRIGGER trg_finance_payment_rollup
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_payment_rollup();

-- ---- An invoice created / linked / cancelled changes what both sides count.
-- The inner UPDATEs set only amountPaid / paidAmount, which are not in the
-- OF-list below, so this does not re-fire itself.
CREATE OR REPLACE FUNCTION public.finance_invoice_link_rollup()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_id bigint;
BEGIN
  IF TG_OP <> 'DELETE' THEN
    UPDATE invoices SET "amountPaid" = finance_invoice_paid(NEW.id) WHERE id = NEW.id;
  END IF;
  FOR v_id IN
    SELECT DISTINCT x FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'DELETE' THEN NEW."paymentRequestId" END,
      CASE WHEN TG_OP <> 'INSERT' THEN OLD."paymentRequestId" END
    ]) AS x
    WHERE x IS NOT NULL
  LOOP
    UPDATE "paymentRequests" SET "paidAmount" = finance_pr_paid(v_id) WHERE id = v_id;
  END LOOP;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_invoice_link_rollup ON invoices;
CREATE TRIGGER trg_finance_invoice_link_rollup
  AFTER INSERT OR DELETE OR UPDATE OF "paymentRequestId", status, "totalAmount" ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_invoice_link_rollup();

-- ---- One open request per billing unit (spec §2). Cancelled requests don't
-- count, so a unit can be billed again after its request is cancelled.
-- pgsql/deploy/precheck_unique_indexes.sql lists the rows that would block these.
-- The column is listed twice on purpose: NocoBase's collection sync drops every
-- single-column unique index it does not know (sync-runner.ts handleUniqueIndex,
-- run whenever a paymentRequests field is created or edited) and reads the
-- columns from pg_index.indkey, so ("x", "x") counts as two and is kept. Same
-- uniqueness as ("x"); ON CONFLICT ("x") still uses it. Dropped and created
-- again so an older single-column copy is replaced.
DROP INDEX IF EXISTS ux_payment_requests_schedule_open;
CREATE UNIQUE INDEX ux_payment_requests_schedule_open
  ON "paymentRequests" ("contractPaymentScheduleId", "contractPaymentScheduleId")
  WHERE "contractPaymentScheduleId" IS NOT NULL AND status IS DISTINCT FROM 'cancelled';

DROP INDEX IF EXISTS ux_payment_requests_project_service_open;
CREATE UNIQUE INDEX ux_payment_requests_project_service_open
  ON "paymentRequests" ("projectServiceId", "projectServiceId")
  WHERE "projectServiceId" IS NOT NULL AND "contractPaymentScheduleId" IS NULL
    AND status IS DISTINCT FROM 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_requests_plan_cycle_open
  ON "paymentRequests" ("billingPlanId", "cycleNo")
  WHERE "billingPlanId" IS NOT NULL AND "cycleNo" IS NOT NULL AND status IS DISTINCT FROM 'cancelled';

-- ---- Daily: turn rows overdue on the day after their due date even when no
-- payment/request/invoice write touched them. A no-op UPDATE lets the BEFORE
-- triggers above re-derive. Called by the "Finance - daily overdue refresh"
-- workflow (JsField/Workflow/CreateFinanceOverdueCronWorkflow.js).
CREATE OR REPLACE FUNCTION public.finance_refresh_overdue()
RETURNS TABLE (payment_requests_marked integer, invoices_marked integer)
LANGUAGE plpgsql
AS $function$
BEGIN
  WITH touched AS (
    UPDATE "paymentRequests"
    SET "updatedAt" = "updatedAt"
    WHERE status = 'active'
      AND "overdueSince" IS NULL
      AND "dueDate" IS NOT NULL
      AND finance_local_date("dueDate") < finance_today()
      AND COALESCE("requestedAmount", 0) > COALESCE("paidAmount", 0)
    RETURNING "overdueSince"
  )
  SELECT count(*) FILTER (WHERE "overdueSince" IS NOT NULL)::integer INTO payment_requests_marked FROM touched;

  WITH touched AS (
    UPDATE invoices
    SET "updatedAt" = "updatedAt"
    WHERE lower(btrim(COALESCE(status, ''))) IN ('pending', 'partial')
    RETURNING status
  )
  SELECT count(*) FILTER (WHERE status = 'overdue')::integer INTO invoices_marked FROM touched;

  RETURN NEXT;
END;
$function$;
