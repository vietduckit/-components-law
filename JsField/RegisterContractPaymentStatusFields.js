// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers contracts.paymentStatus and projects.paymentStatus as proper
// Nocobase `select` fields (matching contracts.status's existing
// uiSchema shape) so they render as a colored status pill in the admin
// UI, are filterable, and appear in "Add field" pickers.
//
// The underlying columns already exist in Postgres — created by
// pgsql/contract_payment_status_workflow.sql — this script only adds
// Nocobase's own field metadata on top, which a raw ALTER TABLE does
// not create by itself.
//
// How to run: paste into a temporary Nocobase Action block's onClick,
// or into the browser dev console while on any admin page (ctx is in
// scope there via the Nocobase app, or replace ctx.api.request with an
// authenticated fetch to the same URLs if running outside ctx).
// Idempotent — checks each field/collection for an existing field of
// the same name before creating, skips if already present.
// ============================================================
const PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid", label: "Unpaid", color: "volcano" },
  { value: "partial", label: "Partial", color: "gold" },
  { value: "paid", label: "Paid", color: "green" },
];

const buildFieldPayload = (title) => ({
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
    title,
  },
  defaultValue: "unpaid",
});

const registerField = async (collectionName, title) => {
  const existing = await ctx.api.request({
    url: `collections/${collectionName}/fields:list`,
    params: { paginate: false },
  });
  const already = (existing?.data?.data || []).some(
    (f) => f.name === "paymentStatus",
  );
  if (already) {
    console.log(`[skip] ${collectionName}.paymentStatus already registered`);
    return;
  }
  await ctx.api.request({
    url: `collections/${collectionName}/fields:create`,
    method: "POST",
    data: buildFieldPayload(title),
  });
  console.log(`[created] ${collectionName}.paymentStatus`);
};

await registerField("contracts", "Payment Status");
await registerField("projects", "Payment Status");
console.log("Done.");
