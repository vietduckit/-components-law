// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers paymentRequests.assignedLawyer as a proper Nocobase belongsTo
// ("Many to one") field targeting `lawyers`, with foreign key column
// "assignedLawyerId" — this is what PaymentRequestCreateBlock.js and
// ContractPaymentScheduleDetailBlock.js now write to instead of the old
// assignedToId (a direct users relation).
//
// Unlike pgsql/contract_payment_status_workflow.sql's paymentStatus/
// outStandingAmount fields (which registered Nocobase metadata on TOP of a
// column already created by raw SQL), a belongsTo field's underlying
// column does NOT need to be created separately first — Nocobase's own
// fields:create endpoint creates the "assignedLawyerId" column itself as
// part of registering the relation (same as clicking "Add field -> Many
// to one" in the Admin UI; this script does exactly that, scriptable).
//
// After this runs, use pgsql/payment_request_assigned_lawyer_backfill.sql
// to migrate any pre-existing assignedToId values across to the new
// relation.
//
// How to run: paste into a temporary Nocobase Action block's onClick,
// or into the browser dev console while on any admin page (ctx is in
// scope there via the Nocobase app).
// Idempotent — checks paymentRequests for an existing field of the same
// name before creating, skips if already present.
// ============================================================
const assignedLawyerFieldPayload = () => ({
  name: "assignedLawyer",
  type: "belongsTo",
  interface: "m2o",
  target: "lawyers",
  foreignKey: "assignedLawyerId",
  targetKey: "id",
  uiSchema: {
    type: "object",
    title: "Assignee",
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

await registerField("paymentRequests", assignedLawyerFieldPayload());
console.log("Done.");
