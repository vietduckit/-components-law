// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers, as NocoBase fields, the columns pgsql/money_flow_foundation.sql
// adds (docs/superpowers/specs/2026-09-29-money-flow-unification-design.md §5):
//   on quotationServices / contractServices / projectServices —
//     exchangeRateToBase, exchangeRateDate, subTotalNative, vatAmountNative,
//     totalAmountNative;
//   on projectServices — quotationService, a belongsTo relation whose foreign
//     key is quotationServiceId (CaseCreateForm.js already sends it).
// The columns already exist in Postgres; without this metadata the API
// silently drops them (why exchangeRateToBase was never saved before).
//
// How to run: AFTER pgsql/money_flow_foundation.sql, paste into a temporary
// NocoBase JS Block / Action onClick, or the browser dev console on an admin
// page (ctx in scope). Idempotent — skips fields that already exist.
// ============================================================
const numberField = (name, title, step) => ({
  name,
  type: "double",
  interface: "number",
  uiSchema: {
    type: "number",
    "x-component": "InputNumber",
    "x-component-props": { stringMode: true, step },
    title,
  },
});

const MONEY_FLOW_FIELDS = [
  numberField("exchangeRateToBase", "Exchange Rate To VND", "0.000001"),
  {
    name: "exchangeRateDate",
    type: "dateOnly",
    interface: "date",
    uiSchema: {
      type: "string",
      "x-component": "DatePicker",
      "x-component-props": { dateOnly: true },
      title: "Exchange Rate Date",
    },
  },
  numberField("subTotalNative", "Subtotal (line currency)", "0.01"),
  numberField("vatAmountNative", "VAT (line currency)", "0.01"),
  numberField("totalAmountNative", "Total (line currency)", "0.01"),
  // 2026-09-30: the unit price in VND at the line's frozen rate
  numberField("basePriceVnd", "Unit price (VND)", "1"),
];

const registerField = async (collectionName, fieldPayload) => {
  const existing = await ctx.api.request({
    url: `collections/${collectionName}/fields:list`,
    params: { paginate: false },
  });
  const already = (existing?.data?.data || []).some((f) => f.name === fieldPayload.name);
  if (already) {
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

for (const collection of ["quotationServices", "contractServices", "projectServices"]) {
  for (const field of MONEY_FLOW_FIELDS) {
    await registerField(collection, field);
  }
}
// projectServices.quotationServiceId as a many-to-one relation to the
// quotation line (its foreign key; the column already exists): the case line
// can be opened back to the quotation line it came from, and the key is
// still accepted as a plain id on create (CaseCreateForm.js sends it).
// Skipped when some relation already uses that foreign key.
{
  const existing = await ctx.api.request({
    url: "collections/projectServices/fields:list",
    params: { paginate: false },
  });
  const fields = existing?.data?.data || [];
  if (fields.some((f) => f.foreignKey === "quotationServiceId" && f.type === "belongsTo")) {
    console.log("[skip] projectServices -> quotationServices relation already registered");
  } else {
    await registerField("projectServices", {
      name: "quotationService",
      type: "belongsTo",
      interface: "m2o",
      target: "quotationServices",
      foreignKey: "quotationServiceId",
      targetKey: "id",
      onDelete: "SET NULL",
      uiSchema: {
        "x-component": "AssociationField",
        "x-component-props": { multiple: false, fieldNames: { label: "serviceName", value: "id" } },
        title: "Quotation Service",
      },
    });
  }
}
console.log("[done] money flow fields");
