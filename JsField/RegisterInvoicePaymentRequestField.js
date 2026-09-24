// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers invoices.paymentRequestId as a proper Nocobase belongsTo
// ("Many to one") field targeting `paymentRequests`, with foreign key
// column "paymentRequestId" — same pattern as
// JsField/RegisterPaymentRequestLinkFields.js (payments.paymentRequest/
// paymentRequestItem), itself modeled on the already-proven
// RegisterPaymentRequestAssignedLawyerField.js.
//
// Verified via JsField/DiagnoseInvoiceSchema.js (2026-09-23) that this
// field does NOT already exist on invoices — see
// docs/superpowers/specs/2026-09-23-create-invoice-js-block-design.md §2
// for why the pre-existing invoices.paymentRequestItems (hasMany,
// FK on paymentRequestItems) is deliberately NOT used instead: Retainer
// Payment Requests never get a paymentRequestItems row, so that path
// would silently exclude Retainer invoices.
//
// Nocobase's fields:create endpoint creates the underlying
// "paymentRequestId" column itself as part of registering the relation
// — no separate column-create step needed first.
//
// How to run: paste into a temporary Nocobase Action block's onClick,
// or into the browser dev console while on any admin page (ctx is in
// scope there via the Nocobase app).
// Idempotent — checks invoices for an existing field of the same name
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

await registerField("invoices", paymentRequestFieldPayload());
console.log("Done.");
