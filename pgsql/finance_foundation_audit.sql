-- ============================================================
-- Finance P1 — READ-ONLY audit. Run BEFORE pgsql/finance_foundation.sql.
-- Plan: docs/superpowers/plans/2026-09-28-finance-p1-foundation.md
-- 1. Duplicate open requests per billing unit: finance_foundation.sql's
--    unique indexes cannot be created while any row is listed here. Cancel
--    (status = 'cancelled') or merge the extras first.
-- 2. Statuses in use: everything outside the new vocabulary is listed so
--    you know what finance_foundation_migrate.sql will map and what it leaves.
-- 3. Invoices whose status will change once it is derived from payments.
-- ============================================================

-- 1. duplicates
SELECT 'schedule row' AS unit, "contractPaymentScheduleId" AS unit_id, count(*) AS open_requests,
       array_agg(id ORDER BY id) AS request_ids
FROM "paymentRequests"
WHERE "contractPaymentScheduleId" IS NOT NULL
  AND status IS DISTINCT FROM 'cancelled' AND status IS DISTINCT FROM 'rejected'
GROUP BY "contractPaymentScheduleId" HAVING count(*) > 1
UNION ALL
SELECT 'case service', "projectServiceId", count(*), array_agg(id ORDER BY id)
FROM "paymentRequests"
WHERE "projectServiceId" IS NOT NULL AND "contractPaymentScheduleId" IS NULL
  AND status IS DISTINCT FROM 'cancelled' AND status IS DISTINCT FROM 'rejected'
GROUP BY "projectServiceId" HAVING count(*) > 1;

-- 2. statuses in use
SELECT 'paymentRequests.status' AS field, status AS value, count(*) FROM "paymentRequests" GROUP BY status
UNION ALL
SELECT 'payments.paymentStatus', "paymentStatus", count(*) FROM payments GROUP BY "paymentStatus"
UNION ALL
SELECT 'invoices.status', status, count(*) FROM invoices GROUP BY status
ORDER BY 1, 2;

-- 3. invoices whose status will change (paid amount = Received-like payments
--    linked to the invoice; draft/cancelled are kept)
WITH paid AS (
  SELECT i.id, i."invoiceNumber", i.status, COALESCE(i."totalAmount", 0) AS total,
         COALESCE((
           SELECT SUM(finance_payment_vnd(to_jsonb(p)))
           FROM payments p
           WHERE p."invoiceId" = i.id
             AND lower(btrim(COALESCE(p."paymentStatus", ''))) IN ('received', 'paid', 'completed', 'partial')
         ), 0) AS received,
         (COALESCE(i.deadline, (SELECT pr."dueDate" FROM "paymentRequests" pr WHERE pr.id = i."paymentRequestId"))
            AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS due
  FROM invoices i
  WHERE lower(btrim(COALESCE(i.status, ''))) NOT IN ('draft', 'cancelled')
), derived AS (
  SELECT *,
         CASE
           WHEN total > 0 AND received >= total THEN 'paid'
           WHEN due IS NOT NULL AND due < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND total > received THEN 'overdue'
           WHEN received > 0 THEN 'partial'
           ELSE 'pending'
         END AS derived_status
  FROM paid
)
SELECT id, "invoiceNumber", status AS current_status, derived_status, total, received
FROM derived
WHERE lower(btrim(COALESCE(status, ''))) IS DISTINCT FROM derived_status
ORDER BY id;
