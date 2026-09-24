// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Root cause (found via JsField/DiagnosePaymentRequestLinkage.js, 2026-09-23):
// PaymentCreateBlock.js's buildCommonPaymentPayload() has always written
// payload.paymentRequestId / payload.paymentRequest and payload.
// paymentRequestItemId / payload.paymentRequestItem when creating a
// payment — but the "payments" collection never actually had these fields
// registered. NocoBase silently drops unknown keys on :create, so every
// payment ever created through the Payment-Request-driven flow (§6x/§6y)
// has amount/paymentDate/etc. saved correctly, but NO link back to which
// paymentRequests row it was for. This is why PaymentCreateBlock.js's
// picker table kept showing "Received: 0" for an installment that had
// already been paid — paymentRequestPaidAmount() was filtering on a
// column that was never actually there.
//
// Registers 2 proper Nocobase belongsTo ("Many to one") fields on
// "payments", matching the exact pattern RegisterPaymentRequestAssignedLawyerField.js
// used for paymentRequests.assignedLawyer:
//   - paymentRequest -> paymentRequests, foreign key column "paymentRequestId"
//   - paymentRequestItem -> paymentRequestItems, foreign key column "paymentRequestItemId"
// Nocobase's fields:create endpoint creates the underlying FK column
// itself as part of registering the relation — no separate column-create
// step needed first.
//
// After this runs, use pgsql/backfill_payment_request_id_from_source_key.sql
// to recover the link for payments already created before this field
// existed (their sourceKey already encodes the paymentRequests id, e.g.
// "paymentRequest:1790044698085496").
//
// How to run: paste into a temporary Nocobase Action block's onClick,
// or into the browser dev console while on any admin page (ctx is in
// scope there via the Nocobase app).
// Idempotent — checks "payments" for an existing field of the same name
// before creating, skips if already present.
// ============================================================

const paymentRequestFieldPayload = () => ({
  name: "paymentRequest",
  type: "belongsTo",
  interface: "m2o",
  target: "paymentRequests",
  foreignKey: "paymentRequestId",
  targetKey: "id",
  uiSchema: {
    type: "object",
    title: "Payment request",
    "x-component": "AssociationField",
    "x-component-props": { multiple: false },
  },
});

const paymentRequestItemFieldPayload = () => ({
  name: "paymentRequestItem",
  type: "belongsTo",
  interface: "m2o",
  target: "paymentRequestItems",
  foreignKey: "paymentRequestItemId",
  targetKey: "id",
  uiSchema: {
    type: "object",
    title: "Payment request item",
    "x-component": "AssociationField",
    "x-component-props": { multiple: false },
  },
});

const registerField = async (collectionName, fieldPayload) => {
  const fieldName = fieldPayload.name;
  const existing = await ctx.api.request({
    url: `collections/${collectionName}/fields:list`,
    params: { paginate: false },
  });
  const already = (existing?.data?.data || []).some(
    (f) => f.name === fieldName,
  );
  if (already) {
    console.log(`[skip] ${collectionName}.${fieldName} already registered`);
    return;
  }
  await ctx.api.request({
    url: `collections/${collectionName}/fields:create`,
    method: "POST",
    data: fieldPayload,
  });
  console.log(`[created] ${collectionName}.${fieldName}`);
};

await registerField("payments", paymentRequestFieldPayload());
await registerField("payments", paymentRequestItemFieldPayload());
console.log("Done.");
