-- ============================================================
-- Money backfill REVIEW (read-only): for every document whose total the
-- backfill would change by more than 1 đồng, each of its service lines —
-- stored vs proposed — so the change can be explained before running
-- pgsql/money_flow_backfill.sql. Biggest changes first.
-- line_action: the backfill preview's action; 'kept' = the line is already
-- priced by the database and does not change.
-- ============================================================
WITH changed AS (
  SELECT doc_table, id AS doc_id, current_total, proposed_total,
         proposed_total - COALESCE(current_total, 0) AS change
  FROM money_backfill_totals_preview
  WHERE abs(proposed_total - COALESCE(current_total, 0)) > 1
),
doc_lines AS (
  SELECT 'quotations'::text AS doc_table, l."quotationId" AS doc_id, 'quotationServices'::text AS table_name,
         l.id, l."serviceName", l."currencyId", l."basePrice", to_jsonb(l)->>'quantity' AS quantity, l.vat,
         l."totalAmount", l."exchangeRateToBase", l."exchangeRateDate", l.status AS line_status, l."pricingMode"
  FROM "quotationServices" l
  UNION ALL
  SELECT 'contracts', l."contractId", 'contractServices', l.id, l."serviceName", l."currencyId", l."basePrice",
         to_jsonb(l)->>'quantity', l.vat, l."totalAmount", l."exchangeRateToBase", l."exchangeRateDate",
         l."lineStatus", l."pricingMode"
  FROM "contractServices" l
  UNION ALL
  SELECT 'projects', l."projectId", 'projectServices', l.id, l."serviceName", l."currencyId", l."basePrice",
         to_jsonb(l)->>'quantity', l.vat, l."totalAmount", l."exchangeRateToBase", l."exchangeRateDate",
         l.status, l."pricingMode"
  FROM "projectServices" l
)
SELECT c.doc_table, c.doc_id, c.current_total, c.proposed_total, c.change,
       d.table_name, d.id AS line_id, d."serviceName" AS service_name, money_currency_code(d."currencyId") AS currency,
       d."basePrice" AS base_price, d.quantity, d.vat, d.line_status, d."pricingMode" AS pricing_mode,
       d."totalAmount" AS stored_total, d."exchangeRateToBase" AS stored_rate, d."exchangeRateDate" AS stored_rate_date,
       p.proposed_rate, p.proposed_rate_date, p.proposed_total AS line_proposed_total,
       COALESCE(p.action, 'kept') AS line_action
FROM changed c
JOIN doc_lines d ON d.doc_table = c.doc_table AND d.doc_id = c.doc_id
LEFT JOIN money_backfill_preview p ON p.table_name = d.table_name AND p.id = d.id
ORDER BY abs(c.change) DESC, c.doc_table, c.doc_id, d.id;
