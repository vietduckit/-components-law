// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Finance P1 (2026-09-28). Registers the columns created by
// pgsql/finance_foundation.sql as NocoBase fields, so the API, the UI and
// workflow node pickers can see them (NocoBase silently drops unknown keys —
// see the payments.paymentRequestId incident, spec 2026-09-17 §6z).
//
// Run pgsql/finance_foundation.sql FIRST (the columns must exist).
// How to run: paste into the browser dev console on any admin page (ctx in
// scope) or a temporary Action block's onClick. Idempotent — skips fields
// that are already registered.
// ============================================================

const numberField = (name, title, type = "double") => ({
  name,
  type,
  interface: type === "integer" || type === "bigInt" ? "integer" : "number",
  uiSchema: { type: "number", "x-component": "InputNumber", "x-read-pretty": true, title },
});

const dateField = (name, title) => ({
  name,
  type: "date",
  interface: "date",
  uiSchema: { type: "string", "x-component": "DatePicker", "x-read-pretty": true, title },
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
  paymentRequests: [
    numberField("paidAmount", "Paid amount"),
    numberField("outstandingAmount", "Outstanding amount"),
    dateField("overdueSince", "Overdue since"),
    datetimeField("overdueNotifiedAt", "Overdue notified at"),
    numberField("billingPlanId", "Billing plan ID", "bigInt"),
    numberField("cycleNo", "Retainer cycle", "integer"),
  ],
  invoices: [
    dateField("overdueSince", "Overdue since"),
    datetimeField("overdueNotifiedAt", "Overdue notified at"),
  ],
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
    "Done. Then set the paymentRequests.status options to pending / active / cancelled and payments.paymentStatus to Received / Cancelled in Collection manager.",
  );
})();
