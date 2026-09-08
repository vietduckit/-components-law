// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers contracts.nextRetainerBillingDate and
// contracts.retainerPeriodsBilled (columns created by
// pgsql/retainer_billing_automation.sql) as proper Nocobase fields, so
// they're visible to the API/UI AND selectable inside the Task 6
// Workflow's node field pickers — a raw column invisible to Nocobase's own
// field metadata is invisible inside the Workflow editor too, not just the
// admin UI (the same class of gap the prior payment-status feature's
// outStandingAmount field hit — see that plan's Execution notes).
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console while on any admin page (ctx is in scope there).
// Idempotent — checks for an existing field of the same name before
// creating, skips if already present.
// ============================================================
const nextRetainerBillingDateFieldPayload = () => ({
  name: "nextRetainerBillingDate",
  type: "date",
  interface: "date",
  uiSchema: {
    type: "string",
    "x-component": "DatePicker",
    title: "Next Retainer Billing Date",
  },
});

const retainerPeriodsBilledFieldPayload = () => ({
  name: "retainerPeriodsBilled",
  type: "integer",
  interface: "integer",
  uiSchema: {
    type: "number",
    "x-component": "InputNumber",
    title: "Retainer Periods Billed",
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

await registerField("contracts", nextRetainerBillingDateFieldPayload());
await registerField("contracts", retainerPeriodsBilledFieldPayload());
console.log("Done.");
