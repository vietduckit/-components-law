// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers, as proper Nocobase fields, the columns added by
// pgsql/contract_payment_status_workflow.sql:
//   - contracts.paymentStatus (select, matches contracts.status's shape)
//   - projects.paymentStatus  (select, same shape, mirrors the contract)
//   - contracts.outStandingAmount (number, matches invoices.outStandingAmount's
//     shape) — added after catching, during end-to-end verification, that a
//     column can exist and hold correct values in Postgres while still being
//     completely invisible to the Nocobase API/UI until it's registered here.
//
// The underlying columns already exist in Postgres — this script only adds
// Nocobase's own field metadata on top, which a raw ALTER TABLE does not
// create by itself.
//
// How to run: paste into a temporary Nocobase Action block's onClick,
// or into the browser dev console while on any admin page (ctx is in
// scope there via the Nocobase app, or replace ctx.api.request with an
// authenticated fetch to the same URLs if running outside ctx).
// Idempotent — checks each collection for an existing field of the same
// name before creating, skips if already present.
// ============================================================
const PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid", label: "Unpaid", color: "volcano" },
  { value: "partial", label: "Partial", color: "gold" },
  { value: "paid", label: "Paid", color: "green" },
];

const paymentStatusFieldPayload = () => ({
  name: "paymentStatus",
  type: "string",
  interface: "select",
  uiSchema: {
    type: "string",
    "x-component": "Select",
    enum: PAYMENT_STATUS_OPTIONS.map((opt, index) => ({
      __DO_NOT_USE_THIS_PROPERTY_index__: index,
      ...opt,
    })),
    title: "Payment Status",
  },
  defaultValue: "unpaid",
});

const outStandingAmountFieldPayload = () => ({
  name: "outStandingAmount",
  type: "double",
  interface: "number",
  uiSchema: {
    type: "number",
    "x-component": "InputNumber",
    "x-component-props": { stringMode: true, step: "1" },
    title: "Outstanding Amount",
  },
  defaultValue: 0,
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

await registerField("contracts", paymentStatusFieldPayload());
await registerField("projects", paymentStatusFieldPayload());
await registerField("contracts", outStandingAmountFieldPayload());
console.log("Done.");
