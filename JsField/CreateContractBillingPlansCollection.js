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
// there). Idempotent, but NOT "skip if exists" — DELETES any existing
// collection with this exact name first, then rebuilds it fresh. This
// makes re-running safe after a field-definition mistake (exactly what
// happened on the first run of this script: startDate/endDate/
// nextBillingDate were created as `timestamp with time zone` instead of
// plain `date`, because Nocobase's field type for a date-only column is
// `dateOnly`, not `date` — `date` maps to Sequelize's DATE(3), a
// timestamptz; confirmed by reading packages/core/database/src/fields/
// date-field.ts vs date-only-field.ts in the nocobase reference repo.
// Safe to delete-and-recreate because nothing referenced this brand new,
// still-empty collection yet at the point this fix was needed.
// ============================================================

const COLLECTION_NAME = "contractBillingPlans";

const collectionPayload = () => ({
  name: COLLECTION_NAME,
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
      type: "dateOnly",
      interface: "date",
      uiSchema: { type: "string", title: "Start Date", "x-component": "DatePicker" },
    },
    {
      name: "endDate",
      type: "dateOnly",
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
      type: "dateOnly",
      interface: "date",
      uiSchema: { type: "string", title: "Next Billing Date", "x-component": "DatePicker" },
    },
    {
      name: "createdAt",
      type: "date",
      interface: "createdAt",
      uiSchema: {
        type: "datetime",
        title: "Created At",
        "x-component": "DatePicker",
        "x-component-props": { showTime: true },
      },
    },
    {
      name: "updatedAt",
      type: "date",
      interface: "updatedAt",
      uiSchema: {
        type: "datetime",
        title: "Updated At",
        "x-component": "DatePicker",
        "x-component-props": { showTime: true },
      },
    },
  ],
});

(async () => {
  const existing = await ctx.api.request({
    url: "collections:list",
    params: { filter: { name: COLLECTION_NAME }, paginate: false },
  });
  for (const row of existing?.data?.data || []) {
    await ctx.api.request({ url: "collections:destroy", method: "POST", params: { filterByTk: row.name } });
    console.log(`[deleted] previous collection "${row.name}" (rebuilding fresh)`);
  }

  const created = await ctx.api.request({
    url: "collections:create",
    method: "POST",
    data: collectionPayload(),
  });
  console.log(`[created] collection "${COLLECTION_NAME}"`, created?.data?.data?.name);
  console.log("Done. Verify in Admin -> Settings -> Data source -> contractBillingPlans, or via collections:list/fields:list.");
})();
