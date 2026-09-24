-- ============================================================
-- Payment Request — assignee relation switched from raw `users`
-- (assignedToId) to `lawyers` (assignedLawyerId).
--
-- PREREQUISITE: create the "assignedLawyerId" relation field FIRST through
-- the Nocobase Admin UI (Data sources -> paymentRequests -> Add field ->
-- "Many to one" -> target collection "Lawyers", foreign key name
-- "assignedLawyerId") -- letting Nocobase's own field wizard create the
-- underlying column keeps its relation metadata (appends, API field
-- picker, Workflow variable picker) correctly wired, which a raw
-- `ALTER TABLE` from this script would not set up by itself.
--
-- This script only backfills EXISTING rows so assignments made before the
-- relation switch aren't silently dropped -- new rows created after the
-- app code change (PaymentRequestCreateBlock.js /
-- ContractPaymentScheduleDetailBlock.js) already write assignedLawyerId
-- directly.
--
-- Idempotent: re-running only touches rows still missing
-- assignedLawyerId, never overwrites one already set.
-- ============================================================

UPDATE "paymentRequests" pr
SET "assignedLawyerId" = l.id
FROM lawyers l
WHERE pr."assignedToId" IS NOT NULL
  AND pr."assignedLawyerId" IS NULL
  AND l."userId" = pr."assignedToId";

-- Verification: any row that still has an old assignedToId but no
-- resolved assignedLawyerId means that user has no matching lawyers row
-- (userId) -- worth a manual look, not auto-fixable.
SELECT id, title, "assignedToId", "assignedLawyerId"
FROM "paymentRequests"
WHERE "assignedToId" IS NOT NULL AND "assignedLawyerId" IS NULL;

-- Note: the old "assignedToId" column is intentionally left in place
-- (unused going forward) rather than dropped -- same caution already
-- established in pgsql/contract_payment_status_workflow.sql's rollback
-- notes: avoid a destructive DROP COLUMN on a shared dev database.
