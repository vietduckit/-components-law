-- ============================================================
-- Money trail (2026-09-29): per-service contract values, Finance money
-- allocated to services, the money trail and the consistency audit.
-- Spec: docs/superpowers/specs/2026-09-29-money-flow-unification-design.md §7.5, §8
-- Requires pgsql/money_flow_foundation.sql and pgsql/finance_foundation.sql.
-- Idempotent; defines only functions and views.
-- ============================================================

-- ---- 1. What each service of a contract is worth (VND); Σ = the contract total
-- Same priority as by_service_service_amount(): a locked
-- paymentAllocatedAmount, else the line's total (line pricing), else its
-- share of what the contract total leaves (combo services split by catalog
-- price when every one has one, otherwise equally; largest remainder).
CREATE OR REPLACE FUNCTION public.money_contract_service_values(p_contract_id bigint)
RETURNS TABLE (contract_service_id bigint, project_service_id bigint, value numeric)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_total numeric := COALESCE(contract_resolved_total(p_contract_id), 0);
  v_fixed numeric := 0;
  v_ids bigint[];
  v_ps bigint[];
  v_w numeric[];
  v_split numeric[];
  r RECORD;
  i integer;
BEGIN
  FOR r IN
    SELECT cs.id,
           cs."projectServiceId" AS ps_id,
           COALESCE(NULLIF(to_jsonb(cs)->>'paymentAllocatedAmount', '')::numeric,
                    NULLIF(to_jsonb(ps)->>'paymentAllocatedAmount', '')::numeric) AS locked,
           lower(COALESCE(cs."pricingMode", '')) = 'package' AS pkg,
           COALESCE(cs."totalAmount", 0)::numeric AS line_total,
           COALESCE(s."basePrice", 0)::numeric AS weight
    FROM "contractServices" cs
    LEFT JOIN "projectServices" ps ON ps.id = cs."projectServiceId"
    LEFT JOIN services s ON s.id = COALESCE(NULLIF(to_jsonb(cs)->>'ServiceId', '')::bigint, ps."serviceId")
    WHERE cs."contractId" = p_contract_id AND money_line_active(cs."lineStatus")
    ORDER BY cs.id
  LOOP
    IF r.locked IS NOT NULL OR NOT r.pkg THEN
      contract_service_id := r.id;
      project_service_id := r.ps_id;
      value := COALESCE(r.locked, r.line_total);
      v_fixed := v_fixed + value;
      RETURN NEXT;
    ELSE
      v_ids := array_append(v_ids, r.id);
      v_ps := array_append(v_ps, r.ps_id);
      v_w := array_append(v_w, r.weight);
    END IF;
  END LOOP;
  IF v_ids IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_w) AS w WHERE w <= 0) THEN
    v_w := array_fill(1::numeric, ARRAY[array_length(v_ids, 1)]);
  END IF;
  v_split := money_split(GREATEST(v_total - v_fixed, 0), v_w, 0);
  FOR i IN 1..array_length(v_ids, 1) LOOP
    contract_service_id := v_ids[i];
    project_service_id := v_ps[i];
    value := v_split[i];
    RETURN NEXT;
  END LOOP;
END;
$f$;

-- ---- 2. A payment request split over services (spec §8.2, first match wins):
-- its own service; else its paymentRequestServices; else its installment's
-- tagged services; else every service of the contract. Weights: the
-- services' contract values. A retainer request (billingPlanId) has none.
CREATE OR REPLACE FUNCTION public.money_payment_request_allocation(p_pr_id bigint)
RETURNS TABLE (contract_service_id bigint, project_service_id bigint, amount numeric)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  pr RECORD;
  v_filter bigint[];
  v_ids bigint[];
  v_ps bigint[];
  v_w numeric[];
  v_split numeric[];
  i integer;
BEGIN
  SELECT p.id, p."contractId", p."contractServiceId", p."projectServiceId", p."contractPaymentScheduleId",
         p."billingPlanId", COALESCE(p."requestedAmount", 0)::numeric AS requested
  INTO pr
  FROM "paymentRequests" p WHERE p.id = p_pr_id;
  IF pr.id IS NULL OR pr."billingPlanId" IS NOT NULL THEN
    RETURN;
  END IF;
  IF pr."contractServiceId" IS NOT NULL OR pr."projectServiceId" IS NOT NULL THEN
    contract_service_id := COALESCE(pr."contractServiceId",
      (SELECT cs.id FROM "contractServices" cs WHERE cs."projectServiceId" = pr."projectServiceId" ORDER BY cs.id LIMIT 1));
    project_service_id := COALESCE(pr."projectServiceId",
      (SELECT cs."projectServiceId" FROM "contractServices" cs WHERE cs.id = pr."contractServiceId"));
    amount := pr.requested;
    RETURN NEXT;
    RETURN;
  END IF;
  IF pr."contractId" IS NULL THEN
    RETURN;
  END IF;
  SELECT array_agg(x."contractServiceId") INTO v_filter
  FROM "paymentRequestServices" x WHERE x."paymentRequestId" = pr.id;
  IF v_filter IS NULL AND pr."contractPaymentScheduleId" IS NOT NULL THEN
    SELECT array_agg(y."contractServiceId") INTO v_filter
    FROM "contractPaymentScheduleServices" y WHERE y."contractPaymentScheduleId" = pr."contractPaymentScheduleId";
  END IF;
  SELECT array_agg(v.contract_service_id ORDER BY v.contract_service_id),
         array_agg(v.project_service_id ORDER BY v.contract_service_id),
         array_agg(v.value ORDER BY v.contract_service_id)
  INTO v_ids, v_ps, v_w
  FROM money_contract_service_values(pr."contractId") v
  WHERE v_filter IS NULL OR v.contract_service_id = ANY (v_filter);
  IF v_ids IS NULL THEN
    RETURN;
  END IF;
  v_split := money_split(pr.requested, v_w, 0);
  FOR i IN 1..array_length(v_ids, 1) LOOP
    contract_service_id := v_ids[i];
    project_service_id := v_ps[i];
    amount := v_split[i];
    RETURN NEXT;
  END LOOP;
END;
$f$;

-- An invoice / payment amount split like its request (or, linked only to a
-- contract, like the contract's services). Nothing -> no rows (unallocated).
CREATE OR REPLACE FUNCTION public.money_allocate_by(p_total numeric, p_pr_id bigint, p_contract_id bigint)
RETURNS TABLE (contract_service_id bigint, project_service_id bigint, amount numeric)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_ids bigint[];
  v_ps bigint[];
  v_w numeric[];
  v_split numeric[];
  i integer;
BEGIN
  IF p_pr_id IS NOT NULL THEN
    SELECT array_agg(a.contract_service_id ORDER BY COALESCE(a.contract_service_id, a.project_service_id)),
           array_agg(a.project_service_id ORDER BY COALESCE(a.contract_service_id, a.project_service_id)),
           array_agg(a.amount ORDER BY COALESCE(a.contract_service_id, a.project_service_id))
    INTO v_ids, v_ps, v_w
    FROM money_payment_request_allocation(p_pr_id) a;
  ELSIF p_contract_id IS NOT NULL THEN
    SELECT array_agg(v.contract_service_id ORDER BY v.contract_service_id),
           array_agg(v.project_service_id ORDER BY v.contract_service_id),
           array_agg(v.value ORDER BY v.contract_service_id)
    INTO v_ids, v_ps, v_w
    FROM money_contract_service_values(p_contract_id) v;
  END IF;
  IF v_w IS NULL THEN
    RETURN;
  END IF;
  v_split := money_split(COALESCE(p_total, 0), v_w, 0);
  FOR i IN 1..array_length(v_w, 1) LOOP
    contract_service_id := v_ids[i];
    project_service_id := v_ps[i];
    amount := v_split[i];
    RETURN NEXT;
  END LOOP;
END;
$f$;

-- ---- 3. Allocation views (computed on read: nothing to keep in sync)
CREATE OR REPLACE VIEW public.money_pr_allocations AS
SELECT pr.id AS payment_request_id, pr."contractId" AS contract_id,
       a.contract_service_id, a.project_service_id, a.amount
FROM "paymentRequests" pr
CROSS JOIN LATERAL money_payment_request_allocation(pr.id) a
WHERE lower(COALESCE(pr.status, '')) NOT IN ('cancelled', 'canceled');

CREATE OR REPLACE VIEW public.money_invoice_allocations AS
SELECT i.id AS invoice_id, COALESCE(i."contractId", pr."contractId") AS contract_id,
       a.contract_service_id, a.project_service_id, a.amount
FROM invoices i
LEFT JOIN "paymentRequests" pr ON pr.id = i."paymentRequestId"
CROSS JOIN LATERAL money_allocate_by(i."totalAmount"::numeric, i."paymentRequestId", COALESCE(i."contractId", pr."contractId")) a
WHERE lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled');

CREATE OR REPLACE VIEW public.money_payment_allocations AS
SELECT p.id AS payment_id, COALESCE(p."contractId", i."contractId") AS contract_id,
       a.contract_service_id, a.project_service_id, a.amount,
       p."currencyId" AS payment_currency_id,
       COALESCE(p.amount, 0)::numeric AS payment_native,
       finance_payment_vnd(to_jsonb(p)) AS payment_vnd
FROM payments p
LEFT JOIN invoices i ON i.id = p."invoiceId"
CROSS JOIN LATERAL money_allocate_by(
  finance_payment_vnd(to_jsonb(p)),
  COALESCE(p."paymentRequestId", i."paymentRequestId"),
  COALESCE(p."contractId", i."contractId")) a
WHERE finance_is_received(p."paymentStatus");

-- ---- 4. The trail: one row per contract service (or per case service of a
-- case without a contract). Differences explained: price_change +
-- fx_quote_to_contract + allocation_adjustment = contracted_vnd - quoted_vnd
-- exactly (allocation_adjustment: a locked paymentAllocatedAmount against the
-- line's own total). outstanding is in contract VND (spec §7.4): money
-- received in the line's currency counts at the contract's rate, the
-- difference is fx_on_payment.
CREATE OR REPLACE VIEW public.finance_service_money_trail AS
WITH base AS (
  SELECT cs."contractId" AS contract_id,
         COALESCE(cs."projectId", ps."projectId") AS project_id,
         COALESCE(cs."quotationServiceId", ps."quotationServiceId") AS quotation_service_id,
         cs.id AS contract_service_id,
         cs."projectServiceId" AS project_service_id,
         COALESCE(cs."serviceName", ps."serviceName") AS service_name,
         cs."currencyId" AS currency_id,
         lower(COALESCE(cs."pricingMode", '')) = 'package' AS is_package,
         cs."totalAmountNative"::numeric AS contracted_native,
         cs."exchangeRateToBase"::numeric AS contracted_rate,
         v.value AS contracted_vnd,
         ps."totalAmount"::numeric AS case_vnd,
         cs."totalAmount"::numeric AS line_vnd
  FROM (SELECT DISTINCT "contractId" FROM "contractServices" WHERE "contractId" IS NOT NULL) c
  CROSS JOIN LATERAL money_contract_service_values(c."contractId") v
  JOIN "contractServices" cs ON cs.id = v.contract_service_id
  LEFT JOIN "projectServices" ps ON ps.id = cs."projectServiceId"
  UNION ALL
  SELECT NULL, ps."projectId", ps."quotationServiceId", NULL, ps.id, ps."serviceName", ps."currencyId",
         lower(COALESCE(ps."pricingMode", '')) = 'package', NULL, NULL, NULL, ps."totalAmount"::numeric, NULL
  FROM "projectServices" ps
  WHERE money_line_active(ps.status)
    AND NOT EXISTS (SELECT 1 FROM "contractServices" cs WHERE cs."projectServiceId" = ps.id)
),
-- Each allocation view is computed once and summed per service; a service is
-- keyed by its contract line, or (a case without a contract) by the negated
-- case-line id. (Per-row subqueries re-ran every allocation for every
-- service: 57 s for 150 contracts.)
req AS MATERIALIZED (
  SELECT COALESCE(a.contract_service_id, -a.project_service_id) AS k, sum(a.amount) AS s
  FROM money_pr_allocations a GROUP BY 1
),
inv AS MATERIALIZED (
  SELECT COALESCE(a.contract_service_id, -a.project_service_id) AS k, sum(a.amount) AS s
  FROM money_invoice_allocations a GROUP BY 1
),
pay AS MATERIALIZED (
  SELECT COALESCE(a.contract_service_id, -a.project_service_id) AS k, a.contract_service_id,
         a.amount, a.payment_currency_id, a.payment_native, a.payment_vnd
  FROM money_payment_allocations a
),
paid AS (
  SELECT k, sum(amount) AS s FROM pay GROUP BY k
),
fx AS (
  SELECT p.contract_service_id AS k,
         sum(p.amount - round(p.amount / p.payment_vnd * p.payment_native * cs."exchangeRateToBase"::numeric, 0)) AS s
  FROM pay p
  JOIN "contractServices" cs ON cs.id = p.contract_service_id
  WHERE p.payment_currency_id IS NOT DISTINCT FROM cs."currencyId"
    AND NOT money_is_base(p.payment_currency_id)
    AND p.payment_vnd > 0 AND money_row_rate_frozen(to_jsonb(cs))
  GROUP BY p.contract_service_id
),
money AS (
  SELECT b.*,
         COALESCE(req.s, 0) AS requested,
         COALESCE(inv.s, 0) AS invoiced,
         COALESCE(paid.s, 0) AS paid,
         COALESCE(fx.s, 0) AS fx_on_payment
  FROM base b
  LEFT JOIN req ON req.k = COALESCE(b.contract_service_id, -b.project_service_id)
  LEFT JOIN inv ON inv.k = COALESCE(b.contract_service_id, -b.project_service_id)
  LEFT JOIN paid ON paid.k = COALESCE(b.contract_service_id, -b.project_service_id)
  LEFT JOIN fx ON fx.k = b.contract_service_id
)
SELECT m.contract_id, m.project_id, m.quotation_service_id, m.contract_service_id, m.project_service_id,
       m.service_name, money_currency_code(m.currency_id) AS currency_code, m.is_package,
       qs."totalAmountNative"::numeric AS quoted_native,
       qs."exchangeRateToBase"::numeric AS quoted_rate,
       qs."totalAmount"::numeric AS quoted_vnd,
       m.contracted_native, m.contracted_rate, m.contracted_vnd, m.case_vnd,
       d.price_change,
       CASE WHEN d.price_change IS NOT NULL
            THEN (COALESCE(m.line_vnd, m.contracted_vnd) - qs."totalAmount"::numeric) - d.price_change END AS fx_quote_to_contract,
       m.requested, m.invoiced, m.paid,
       COALESCE(m.contracted_vnd, m.case_vnd, 0) - (m.paid - m.fx_on_payment) AS outstanding,
       m.fx_on_payment,
       CASE WHEN d.price_change IS NOT NULL
            THEN m.contracted_vnd - COALESCE(m.line_vnd, m.contracted_vnd) END AS allocation_adjustment
FROM money m
LEFT JOIN "quotationServices" qs ON qs.id = m.quotation_service_id
LEFT JOIN LATERAL (
  SELECT CASE
    WHEN NOT m.is_package
     AND lower(COALESCE(qs."pricingMode", '')) <> 'package'
     AND qs."currencyId" IS NOT DISTINCT FROM m.currency_id
     AND qs."totalAmountNative" IS NOT NULL
     AND m.contracted_native IS NOT NULL
     AND m.contracted_rate IS NOT NULL
    THEN round((m.contracted_native - qs."totalAmountNative"::numeric) * m.contracted_rate, 0)
  END AS price_change
) d ON true;

-- ---- 5. Money that belongs to no service
CREATE OR REPLACE VIEW public.finance_contract_retainer_trail AS
SELECT c.id AS contract_id,
  (SELECT COALESCE(sum(pr."requestedAmount"), 0)::numeric FROM "paymentRequests" pr
    WHERE pr."contractId" = c.id AND pr."billingPlanId" IS NOT NULL
      AND lower(COALESCE(pr.status, '')) NOT IN ('cancelled', 'canceled')) AS requested,
  (SELECT COALESCE(sum(i."totalAmount"), 0)::numeric FROM invoices i
    JOIN "paymentRequests" pr ON pr.id = i."paymentRequestId"
    WHERE pr."contractId" = c.id AND pr."billingPlanId" IS NOT NULL
      AND lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled')) AS invoiced,
  (SELECT COALESCE(sum(finance_payment_vnd(to_jsonb(p))), 0) FROM payments p
    LEFT JOIN invoices i ON i.id = p."invoiceId"
    JOIN "paymentRequests" pr ON pr.id = COALESCE(p."paymentRequestId", i."paymentRequestId")
    WHERE pr."contractId" = c.id AND pr."billingPlanId" IS NOT NULL
      AND finance_is_received(p."paymentStatus")) AS paid
FROM contracts c
WHERE c."contractType" = 'retainer'
   OR EXISTS (SELECT 1 FROM "paymentRequests" pr WHERE pr."contractId" = c.id AND pr."billingPlanId" IS NOT NULL);

CREATE OR REPLACE VIEW public.finance_unallocated_money AS
SELECT 'payment_request'::text AS kind, pr.id AS record_id, pr."contractId" AS contract_id,
       COALESCE(pr."requestedAmount", 0)::numeric AS amount_vnd
FROM "paymentRequests" pr
WHERE lower(COALESCE(pr.status, '')) NOT IN ('cancelled', 'canceled')
  AND pr."billingPlanId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM money_pr_allocations a WHERE a.payment_request_id = pr.id)
UNION ALL
SELECT 'invoice', i.id, i."contractId", COALESCE(i."totalAmount", 0)::numeric
FROM invoices i
LEFT JOIN "paymentRequests" pr ON pr.id = i."paymentRequestId"
WHERE lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled')
  AND pr."billingPlanId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM money_invoice_allocations a WHERE a.invoice_id = i.id)
UNION ALL
SELECT 'payment', p.id, p."contractId", finance_payment_vnd(to_jsonb(p))
FROM payments p
LEFT JOIN invoices i ON i.id = p."invoiceId"
LEFT JOIN "paymentRequests" pr ON pr.id = COALESCE(p."paymentRequestId", i."paymentRequestId")
WHERE finance_is_received(p."paymentStatus")
  AND pr."billingPlanId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM money_payment_allocations a WHERE a.payment_id = p.id);

-- ---- 6. Consistency audit (spec §7.5): one row per violation; 0 rows = consistent
CREATE OR REPLACE VIEW public.money_consistency_violations AS
WITH lines AS (
  SELECT 'quotationServices'::text AS table_name, l.id, NULL::bigint AS contract_id, to_jsonb(l) AS j
  FROM "quotationServices" l
  UNION ALL
  SELECT 'contractServices', l.id, l."contractId", to_jsonb(l) FROM "contractServices" l
  UNION ALL
  SELECT 'projectServices', l.id, p."contractId", to_jsonb(l)
  FROM "projectServices" l LEFT JOIN projects p ON p.id = l."projectId"
),
priced AS (
  SELECT table_name, id, contract_id, j,
         NULLIF(j->>'currencyId', '')::bigint AS currency_id,
         CASE WHEN money_row_rate_frozen(j) THEN NULLIF(j->>'exchangeRateToBase', '')::numeric END AS rate,
         NULLIF(j->>'subTotal', '')::numeric AS sub,
         NULLIF(j->>'vatAmount', '')::numeric AS vat,
         NULLIF(j->>'totalAmount', '')::numeric AS total
  FROM lines WHERE money_line_priced(j)
)
SELECT 'line_parts'::text AS rule, table_name, id AS record_id, contract_id,
       format('%s + %s <> %s', sub, vat, total) AS detail
FROM priced
WHERE COALESCE(sub, 0) + COALESCE(vat, 0) <> COALESCE(total, 0)
UNION ALL
SELECT 'missing_rate', table_name, id, contract_id, format('%s line without a frozen rate', money_currency_code(currency_id))
FROM priced
WHERE rate IS NULL
UNION ALL
SELECT 'line_recompute', p.table_name, p.id, p.contract_id, format('stored %s, recomputed %s', p.total, a.total_vnd)
FROM priced p
CROSS JOIN LATERAL money_line_amounts(
  NULLIF(p.j->>'basePrice', '')::numeric, NULLIF(p.j->>'quantity', '')::numeric,
  NULLIF(p.j->>'vat', '')::numeric, money_decimals(p.currency_id), p.rate) a
WHERE p.rate IS NOT NULL AND a.total_vnd IS DISTINCT FROM p.total
UNION ALL
SELECT 'case_line_vs_contract_line', 'projectServices', ps.id, cs."contractId",
       format('case %s, contract %s', ps."totalAmount", cs."totalAmount")
FROM "contractServices" cs
JOIN "projectServices" ps ON ps.id = cs."projectServiceId"
WHERE money_line_priced(to_jsonb(cs)) AND money_line_priced(to_jsonb(ps))
  AND ps."currencyId" IS NOT DISTINCT FROM cs."currencyId"
  AND ps."basePrice" IS NOT DISTINCT FROM cs."basePrice"
  AND ps.vat IS NOT DISTINCT FROM cs.vat
  AND ps."totalAmount" IS DISTINCT FROM cs."totalAmount"
UNION ALL
SELECT 'header_total', 'quotations', q.id, NULL, format('stored %s, lines %s', q."totalAmount", t.total)
FROM quotations q
CROSS JOIN LATERAL money_line_totals('quotationServices', q.id) t
WHERE lower(COALESCE(q."pricingMode", '')) <> 'package' AND t.total IS NOT NULL
  AND q."totalAmount"::numeric IS DISTINCT FROM t.total
UNION ALL
SELECT 'header_total', 'contracts', c.id, c.id, format('stored %s / %s / %s, lines %s / %s / %s',
       c."subTotal", c."vatAmount", c."totalAmount", t.sub, t.vat, t.total)
FROM contracts c
CROSS JOIN LATERAL money_line_totals('contractServices', c.id) t
WHERE COALESCE(c."contractType", '') <> 'retainer' AND lower(COALESCE(c."pricingMode", '')) <> 'package'
  AND t.total IS NOT NULL
  AND (c."totalAmount"::numeric IS DISTINCT FROM t.total
    OR c."subTotal"::numeric IS DISTINCT FROM t.sub
    OR c."vatAmount"::numeric IS DISTINCT FROM t.vat)
UNION ALL
SELECT 'header_total', 'projects', p.id, p."contractId", format('stored %s, services %s', p."totalAmount", t.total)
FROM projects p
CROSS JOIN LATERAL money_line_totals('projectServices', p.id) t
WHERE t.total IS NOT NULL AND p."totalAmount"::numeric IS DISTINCT FROM t.total
UNION ALL
SELECT 'installments_sum', 'contracts', c.id, c.id, format('installments %s, total %s', x.s, contract_resolved_total(c.id))
FROM contracts c
CROSS JOIN LATERAL (
  SELECT sum(s.amount)::numeric AS s, sum(s.percentage)::numeric AS pct
  FROM "contractPaymentSchedules" s WHERE s."contractId" = c.id AND s.percentage > 0
) x
WHERE COALESCE(c."contractType", '') NOT IN ('retainer', 'byService')
  AND x.pct IS NOT NULL AND abs(x.pct - 100) <= 0.01
  AND x.s IS DISTINCT FROM contract_resolved_total(c.id)
UNION ALL
SELECT 'service_values_sum', 'contracts', c.id, c.id, format('services %s, total %s', x.s, contract_resolved_total(c.id))
FROM contracts c
CROSS JOIN LATERAL (SELECT sum(v.value) AS s, count(*) AS n FROM money_contract_service_values(c.id) v) x
WHERE COALESCE(c."contractType", '') <> 'retainer' AND x.n > 0
  AND x.s IS DISTINCT FROM contract_resolved_total(c.id)
UNION ALL
SELECT 'request_split', 'paymentRequests', pr.id, pr."contractId", format('services %s, request %s', a.s, pr."requestedAmount")
FROM "paymentRequests" pr
JOIN (SELECT payment_request_id, sum(amount) AS s FROM money_pr_allocations GROUP BY payment_request_id) a
  ON a.payment_request_id = pr.id
WHERE a.s IS DISTINCT FROM COALESCE(pr."requestedAmount", 0)::numeric
UNION ALL
SELECT 'invoice_split', 'invoices', i.id, a.contract_id, format('services %s, invoice %s', a.s, i."totalAmount")
FROM invoices i
JOIN (SELECT invoice_id, max(contract_id) AS contract_id, sum(amount) AS s FROM money_invoice_allocations GROUP BY invoice_id) a
  ON a.invoice_id = i.id
WHERE a.s IS DISTINCT FROM COALESCE(i."totalAmount", 0)::numeric
UNION ALL
SELECT 'payment_split', 'payments', p.id, a.contract_id, format('services %s, payment %s', a.s, a.vnd)
FROM payments p
JOIN (SELECT payment_id, max(contract_id) AS contract_id, sum(amount) AS s, max(payment_vnd) AS vnd
      FROM money_payment_allocations GROUP BY payment_id) a
  ON a.payment_id = p.id
WHERE a.s IS DISTINCT FROM a.vnd;
