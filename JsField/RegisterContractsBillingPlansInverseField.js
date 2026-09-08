// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Fixes a gap in JsField/CreateContractBillingPlansCollection.js: that
// script created contractBillingPlans.contracts (belongsTo -> contracts),
// but Nocobase does not auto-create the inverse side of a relation. Without
// contracts.billingPlans (hasMany -> contractBillingPlans), the `contracts`
// collection has no field named "billingPlans" at all, so:
//   - ContractCreateForm.js's nested `billingPlans: [...]` in a
//     contracts:create payload is silently dropped (no error, no plan row
//     created) -- confirmed live: a real Retainer contract was created
//     through the UI and contractBillingPlans had zero matching rows.
//   - appends: ["billingPlans"] in ContractPaymentScheduleDetailBlock.js /
//     PaymentRequestCreateBlock.js would equally do nothing.
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Idempotent — skips if the field already exists.
// ============================================================

const fieldPayload = () => ({
  name: "billingPlans",
  type: "hasMany",
  target: "contractBillingPlans",
  foreignKey: "contractId",
  sourceKey: "id",
  uiSchema: {
    type: "array",
    title: "Billing Plans",
    "x-component": "AssociationField",
    "x-component-props": { multiple: true },
  },
});

(async () => {
  const existing = await ctx.api.request({
    url: "collections/contracts/fields:list",
    params: { filter: { name: "billingPlans" }, paginate: false },
  });
  if ((existing?.data?.data || []).length > 0) {
    console.log('[skip] contracts.billingPlans already exists');
    return;
  }
  const created = await ctx.api.request({
    url: "collections/contracts/fields:create",
    method: "POST",
    data: fieldPayload(),
  });
  console.log('[created] contracts.billingPlans', created?.data?.data?.name);
  console.log("Done. Retry creating a fresh Retainer contract through the UI to confirm the fix.");
})();
