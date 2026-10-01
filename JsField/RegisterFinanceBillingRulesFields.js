// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Finance P2 (2026-09-28). Registers the columns created by
// pgsql/finance_billing_rules.sql as NocoBase fields (NocoBase silently
// drops unknown keys, so a UI that writes cancelReason / isBillingActive /
// pauseReason / resumeOn / terminationDate needs these first).
//
// Run pgsql/finance_billing_rules.sql FIRST (the columns must exist).
// How to run: paste into the browser dev console on any admin page (ctx in
// scope) or a temporary Action block's onClick. Idempotent — skips fields
// that are already registered.
// ============================================================

const textField = (name, title) => ({
  name,
  type: "text",
  interface: "textarea",
  uiSchema: { type: "string", "x-component": "Input.TextArea", title },
});

const dateField = (name, title) => ({
  name,
  type: "date",
  interface: "date",
  uiSchema: { type: "string", "x-component": "DatePicker", title },
});

const datetimeField = (name, title) => ({
  name,
  type: "date",
  interface: "datetime",
  uiSchema: {
    type: "string",
    "x-component": "DatePicker",
    "x-component-props": { showTime: true },
    "x-read-pretty": true,
    title,
  },
});

const FIELDS = {
  paymentRequests: [textField("cancelReason", "Cancel reason"), datetimeField("cancelledAt", "Cancelled at")],
  contractBillingPlans: [
    {
      name: "isBillingActive",
      type: "boolean",
      interface: "checkbox",
      defaultValue: true,
      uiSchema: { type: "boolean", "x-component": "Checkbox", title: "Auto-billing (started)" },
    },
    datetimeField("pausedAt", "Stopped at"),
    textField("pauseReason", "Stop reason"),
    dateField("resumeOn", "Start again on"),
  ],
  contracts: [dateField("terminationDate", "Termination date"), textField("terminationReason", "Termination reason")],
};

const registerField = async (collectionName, fieldPayload) => {
  const existing = await ctx.api.request({
    url: `collections/${collectionName}/fields:list`,
    params: { paginate: false },
  });
  if ((existing?.data?.data || []).some((f) => f.name === fieldPayload.name)) {
    console.log(`[skip] ${collectionName}.${fieldPayload.name} already registered`);
    return;
  }
  await ctx.api.request({
    url: `collections/${collectionName}/fields:create`,
    method: "POST",
    data: fieldPayload,
  });
  console.log(`[created] ${collectionName}.${fieldPayload.name}`);
};

(async () => {
  for (const [collectionName, fields] of Object.entries(FIELDS)) {
    for (const field of fields) await registerField(collectionName, field);
  }
  console.log(
    "Done. Add 'terminated' to contracts.status options if it is missing, and add Cancel reason to the Payment Request edit form (cancelling without it is refused).",
  );
})();
