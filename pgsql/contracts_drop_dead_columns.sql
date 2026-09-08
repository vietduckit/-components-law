-- ============================================================
-- Contract Billing Plans — drop superseded contracts columns
-- See docs/superpowers/specs/2026-09-08-contract-billing-plans-architecture-design.md §5
--
-- RUN ONLY AFTER Task 9 of docs/superpowers/plans/
-- 2026-09-08-contract-billing-plans-architecture.md is fully verified.
-- These columns are migrated into contractBillingPlans by
-- contract_billing_plans_migration_backfill.sql — confirm that ran
-- successfully and Task 9 Step 7's grep is clean before running this.
--
-- contractType is deliberately NOT dropped here — it still drives the
-- "Type" badge in the native Nocobase "All Contracts" grid, configured
-- through the Admin UI's own list-view metadata, which is not auditable
-- by reading .js files. Left in place pending a dedicated follow-up.
--
-- Idempotent: DROP COLUMN IF EXISTS is safe to run again.
-- ============================================================

ALTER TABLE contracts DROP COLUMN IF EXISTS "retainerPeriod";
ALTER TABLE contracts DROP COLUMN IF EXISTS "monthlyFee";
ALTER TABLE contracts DROP COLUMN IF EXISTS "includedHours";
ALTER TABLE contracts DROP COLUMN IF EXISTS "overageHourlyRate";
ALTER TABLE contracts DROP COLUMN IF EXISTS "retainerDuration";
ALTER TABLE contracts DROP COLUMN IF EXISTS "nextRetainerBillingDate";
ALTER TABLE contracts DROP COLUMN IF EXISTS "retainerPeriodsBilled";
