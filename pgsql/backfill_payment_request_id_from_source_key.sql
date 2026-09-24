-- ============================================================
-- ONE-TIME BACKFILL — payments."paymentRequestId" / "paymentRequestItemId"
--
-- Root cause (found via JsField/DiagnosePaymentRequestLinkage.js, 2026-09-23):
-- PaymentCreateBlock.js has always tried to write payload.paymentRequestId
-- on create, but the "payments" collection never had that field registered
-- — Nocobase silently drops unknown keys, so every payment ever created
-- through the Payment-Request-driven flow (§6x/§6y of
-- docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md)
-- saved fine but with no link back to which paymentRequests row it was for.
--
-- REQUIRED FIRST: run JsField/RegisterPaymentRequestLinkFields.js so the
-- "paymentRequestId"/"paymentRequestItemId" columns actually exist —
-- this script will fail with "column does not exist" otherwise.
--
-- Recovery is possible because "sourceKey" already encodes the exact
-- paymentRequests id for every payment created via that flow, e.g.
-- "paymentRequest:1790044698085496" (base) or
-- "paymentRequest:1790044698085496:actual:<reference>" (a later payment
-- against the same request, once the first already has an actual amount/
-- date/method filled in — see basePaymentRequestSourceKey/
-- actualPaymentRequestSourceKey in PaymentCreateBlock.js). Both forms
-- carry the request id as the 2nd ':'-delimited segment.
--
-- Scope: only touches rows with "paymentRequestId" IS NULL and a
-- "sourceKey" starting with 'paymentRequest:' — payments created via any
-- other mode (By invoice, Manual, the old JSON-schedule Table) are
-- untouched, since their sourceKey never had this prefix and there is no
-- reliable way to recover the link for them (same id-space mismatch
-- documented in §6x).
--
-- Idempotent — safe to re-run; WHERE clause only ever matches rows still
-- missing the value.
-- ============================================================

UPDATE payments
SET "paymentRequestId" = split_part("sourceKey", ':', 2)::bigint
WHERE "paymentRequestId" IS NULL
  AND "sourceKey" LIKE 'paymentRequest:%';

-- Verification query — run after, expect 0 rows missing the link for any
-- payment whose sourceKey has the prefix.
-- SELECT id, "sourceKey", "paymentRequestId" FROM payments
-- WHERE "sourceKey" LIKE 'paymentRequest:%' AND "paymentRequestId" IS NULL;
