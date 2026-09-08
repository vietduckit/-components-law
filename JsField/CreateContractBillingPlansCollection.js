// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Creates the contractBillingPlans collection (all fields in one
// collections:create call, including the belongsTo relation to
// contracts) — see docs/superpowers/specs/
// 2026-09-08-contract-billing-plans-architecture-design.md §6.1/§4.
//
// Verified against Nocobase's own test suite, not guessed:
// packages/plugins/@nocobase/plugin-data-source-main/src/server/
// __tests__/http-api/collections.test.ts shows collections:create
// accepting a full `fields` array (including belongsTo/hasMany/
// belongsToMany relations) in one request — no need to create the
// collection first and add fields one at a time the way this
// project's earlier RegisterXxxFields.js scripts did (those added
// fields to an ALREADY-EXISTING collection; this collection doesn't
// exist yet, so everything is created together).
//
// How to run: paste into a temporary Nocobase Action block's onClick,
// or the browser dev console on any admin page (ctx is in scope
// there). Idempotent — skips creating the collection if one with this
// exact name already exists.
// ============================================================

const COLLECTION_NAME = "contractBillingPlans";

const collectionPayload = () => ({
  name: COLLECTION_NAME,
  timestamps: true,
  fields: [
    {
      name: "contracts",
      type: "belongsTo",
      target: "contracts",
      foreignKey: "contractId",
      uiSchema: {
        type: "number",
        title: "Contract",
        "x-component": "AssociationField",
        "x-component-props": { multiple: false, fieldNames: { label: "contractName", value: "id" } },
      },
    },
    {
      name: "planType",
      type: "string",
      interface: "select",
      uiSchema: {
        type: "string",
        title: "Plan Type",
        "x-component": "Select",
        enum: [
          { label: "Retainer", value: "retainer" },
          { label: "Milestone", value: "milestone" },
          { label: "Fixed one-time", value: "fixed_onetime" },
        ],
      },
    },
    {
      name: "status",
      type: "string",
      interface: "select",
      uiSchema: {
        type: "string",
        title: "Status",
        "x-component": "Select",
        enum: [
          { label: "Active", value: "active" },
          { label: "Completed", value: "completed" },
          { label: "Cancelled", value: "cancelled" },
        ],
      },
      defaultValue: "active",
    },
    {
      name: "totalAmount",
      type: "double",
      interface: "number",
      uiSchema: { type: "number", title: "Total Amount", "x-component": "InputNumber" },
    },
    {
      name: "startDate",
      type: "date",
      interface: "date",
      uiSchema: { type: "string", title: "Start Date", "x-component": "DatePicker" },
    },
    {
      name: "endDate",
      type: "date",
      interface: "date",
      uiSchema: { type: "string", title: "End Date", "x-component": "DatePicker" },
    },
    {
      name: "retainerUnit",
      type: "string",
      interface: "select",
      uiSchema: {
        type: "string",
        title: "Retainer Unit",
        "x-component": "Select",
        enum: [
          { label: "Day", value: "day" },
          { label: "Week", value: "week" },
          { label: "Month", value: "month" },
          { label: "Quarter", value: "quarter" },
          { label: "Year", value: "year" },
        ],
      },
    },
    {
      name: "retainerTotalCycles",
      type: "integer",
      interface: "integer",
      uiSchema: { type: "number", title: "Retainer Total Cycles", "x-component": "InputNumber" },
    },
    {
      name: "retainerCyclesBilled",
      type: "integer",
      interface: "integer",
      uiSchema: { type: "number", title: "Retainer Cycles Billed", "x-component": "InputNumber" },
      defaultValue: 0,
    },
    {
      name: "nextBillingDate",
      type: "date",
      interface: "date",
      uiSchema: { type: "string", title: "Next Billing Date", "x-component": "DatePicker" },
    },
  ],
});

(async () => {
  const existing = await ctx.api.request({
    url: "collections:list",
    params: { filter: { name: COLLECTION_NAME }, paginate: false },
  });
  if ((existing?.data?.data || []).length > 0) {
    console.log(`[skip] Collection "${COLLECTION_NAME}" already exists`);
    return;
  }
  const created = await ctx.api.request({
    url: "collections:create",
    method: "POST",
    data: collectionPayload(),
  });
  console.log(`[created] collection "${COLLECTION_NAME}"`, created?.data?.data?.name);
  console.log("Done. Verify in Admin -> Settings -> Data source -> contractBillingPlans, or via collections:list/fields:list.");
})();
