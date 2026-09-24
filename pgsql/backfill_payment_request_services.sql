-- ============================================================
-- ONE-TIME BACKFILL — not part of the trigger, run once after re-deploying
-- pgsql/unified_contract_payment_schedule.sql.
--
-- Root cause (found via JsField/DiagnosePaymentScheduleDataPipeline.js,
-- 2026-09-22): by_case_schedule_row_creates_payment_request()'s
-- "paymentRequestServices" copy loop (§6h) was added to the SQL file, but
-- any contractPaymentSchedules row inserted BEFORE that updated trigger was
-- actually deployed already created its Payment Request with zero tags —
-- the trigger only fires once, at insert time, so those PRs never got a
-- second chance to pick up their tags. Confirmed on contract #256: its 3
-- installments each have 1-2 real contractPaymentScheduleServices rows, but
-- all 3 resulting paymentRequests have 0 paymentRequestServices rows.
--
-- Combined with §6m (removing the "untagged = visible to everyone"
-- fallback), those PRs are now invisible to EVERY task's installment picker
-- until this backfill runs — this is urgent, not cosmetic.
--
-- Idempotent — the NOT EXISTS guard means running this twice does nothing
-- the second time.
-- ============================================================

INSERT INTO "paymentRequestServices" (
  id, "paymentRequestId", "contractServiceId", "createdAt", "updatedAt"
)
SELECT
  (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000
    + (random() * 999)::INT
    + ROW_NUMBER() OVER (),
  pr.id,
  cpss."contractServiceId",
  now(),
  now()
FROM "paymentRequests" pr
JOIN "contractPaymentScheduleServices" cpss
  ON cpss."contractPaymentScheduleId" = pr."contractPaymentScheduleId"
WHERE pr."contractPaymentScheduleId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "paymentRequestServices" prs
    WHERE prs."paymentRequestId" = pr.id
      AND prs."contractServiceId" = cpss."contractServiceId"
  );
