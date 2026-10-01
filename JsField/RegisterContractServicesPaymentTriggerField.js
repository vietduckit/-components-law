// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers contractServices.paymentTriggerTemplateIds (JSON array of
// projectTemplates.id strings) — the sample tasks a lawyer ticked as
// payment triggers in ContractCreateForm.js for a By Service contract
// created before its Case exists. CaseCreateForm.js reads it to pre-tick
// Sample Tasks when a Case is created from that contract. See
// docs/superpowers/specs/2026-09-24-by-service-payment-trigger-config-design.md.
//
// Also registers contractPaymentSchedules.triggerTemplateIds (same shape):
// the sample tasks ticked per By Case installment on a contract created
// before its Case; CaseCreateForm.js links the matching real tasks to that
// installment's Payment Request when the Case is created. See
// docs/superpowers/specs/2026-09-24-by-case-installment-trigger-tasks-design.md.
//
// Unlike RegisterContractPaymentStatusFields.js, no pre-existing column:
// fields:create adds the Postgres column itself.
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx in scope). Idempotent —
// skips if the field already exists. Run BEFORE deploying the updated
// ContractCreateForm.js / CaseCreateForm.js.
// ============================================================
const paymentTriggerTemplateIdsFieldPayload = () => ({
  name: "paymentTriggerTemplateIds",
  type: "json",
  interface: "json",
  uiSchema: {
    type: "object",
    "x-component": "Input.JSON",
    "x-component-props": { autoSize: { minRows: 2 } },
    title: "Payment Trigger Template IDs",
  },
  defaultValue: null,
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

await registerField("contractServices", paymentTriggerTemplateIdsFieldPayload());
// 2026-09-25: the locked Payment Request amount per service for By Service
// + Combo pricing (ContractCreateForm.js Payment Triggers popup), copied to
// the Case's projectServices; the By Service SQL trigger bills it. See
// docs/superpowers/specs/2026-09-25-by-service-package-allocation-ui-design.md.
const paymentAllocatedAmountFieldPayload = () => ({
  name: "paymentAllocatedAmount",
  type: "double",
  interface: "number",
  uiSchema: {
    type: "number",
    "x-component": "InputNumber",
    "x-component-props": { stringMode: true, step: "1" },
    title: "Payment Allocated Amount",
  },
  defaultValue: null,
});
await registerField("contractServices", paymentAllocatedAmountFieldPayload());
await registerField("projectServices", paymentAllocatedAmountFieldPayload());
await registerField("contractPaymentSchedules", {
  ...paymentTriggerTemplateIdsFieldPayload(),
  name: "triggerTemplateIds",
  uiSchema: {
    ...paymentTriggerTemplateIdsFieldPayload().uiSchema,
    title: "Trigger Template IDs",
  },
});
console.log("Done.");
