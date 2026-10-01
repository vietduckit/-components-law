// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// A company's own price of a catalog service (companyServices.price) now
// carries its currency: pgsql/currency_catalog.sql adds the column
// companyServices.currencyId. This script:
//   - registers it as the relation companyServices.currency
//     (belongsTo currencies, foreign key currencyId), so the API saves the
//     currencyId the forms already send, and the create forms read it before
//     the service's own currency;
//   - removes the old field companyServices.currencies — a hasMany that wrote
//     a "currencyId" into the currencies table itself, not a currency of the
//     price.
// Also registers the catalog VND columns (basePriceVnd / priceVnd / …).
// How to run: AFTER pgsql/currency_catalog.sql, and after
// pgsql/currency_catalog_fix.sql has filled the currencies. Paste into a
// temporary JS Block / the browser console on an admin page (ctx in scope).
// Idempotent.
// ============================================================
const listFields = async () => {
  const res = await ctx.api.request({
    url: "collections/companyServices/fields:list",
    params: { paginate: false },
  });
  return res?.data?.data || [];
};

let fields = await listFields();
if (fields.some((f) => f.name === "currency")) {
  console.log("[skip] companyServices.currency already registered");
} else {
  await ctx.api.request({
    url: "collections/companyServices/fields:create",
    method: "POST",
    data: {
      name: "currency",
      type: "belongsTo",
      interface: "m2o",
      target: "currencies",
      foreignKey: "currencyId",
      targetKey: "id",
      onDelete: "SET NULL",
      uiSchema: {
        "x-component": "AssociationField",
        "x-component-props": { multiple: false, fieldNames: { label: "code", value: "id" } },
        title: "Currency",
      },
    },
  });
  console.log("[created] companyServices.currency");
}

// Catalog prices in VND at the latest rate (pgsql/currency_catalog.sql §6) —
// read-only, the database fills them.
const numberField = (name, title) => ({
  name,
  type: "double",
  interface: "number",
  uiSchema: {
    type: "number",
    "x-component": "InputNumber",
    "x-component-props": { stringMode: true, step: "1" },
    "x-read-pretty": true,
    title,
  },
});
const dateField = (name, title) => ({
  name,
  type: "dateOnly",
  interface: "date",
  uiSchema: { type: "string", "x-component": "DatePicker", "x-component-props": { dateOnly: true }, "x-read-pretty": true, title },
});
const CATALOG_VND_FIELDS = [
  ["services", numberField("basePriceVnd", "Base price (VND)")],
  ["services", numberField("exchangeRateToBase", "Exchange rate to VND")],
  ["services", dateField("exchangeRateDate", "Exchange rate date")],
  ["companyServices", numberField("priceVnd", "Price (VND)")],
  ["companyServices", numberField("exchangeRateToBase", "Exchange rate to VND")],
  ["companyServices", dateField("exchangeRateDate", "Exchange rate date")],
  ["serviceComboItems", numberField("priceVnd", "Price (VND)")],
  ["serviceComboItems", numberField("exchangeRateToBase", "Exchange rate to VND")],
  ["serviceComboItems", dateField("exchangeRateDate", "Exchange rate date")],
  ["serviceCombos", numberField("packageSubTotalVnd", "Package subtotal (VND)")],
  ["serviceCombos", numberField("totalAmountVnd", "Total (VND)")],
  ["serviceCombos", numberField("exchangeRateToBase", "Exchange rate to VND")],
  ["serviceCombos", dateField("exchangeRateDate", "Exchange rate date")],
];
for (const [collectionName, field] of CATALOG_VND_FIELDS) {
  const res = await ctx.api.request({ url: `collections/${collectionName}/fields:list`, params: { paginate: false } });
  if ((res?.data?.data || []).some((f) => f.name === field.name)) {
    console.log(`[skip] ${collectionName}.${field.name} already registered`);
    continue;
  }
  await ctx.api.request({ url: `collections/${collectionName}/fields:create`, method: "POST", data: field });
  console.log(`[created] ${collectionName}.${field.name}`);
}

fields = await listFields();
const old = fields.find((f) => f.name === "currencies" && f.type === "hasMany");
if (!old) {
  console.log("[skip] companyServices.currencies (hasMany) not found");
} else {
  await ctx.api.request({
    url: "collections/companyServices/fields:destroy",
    method: "POST",
    params: { filterByTk: "currencies" },
  });
  console.log("[removed] companyServices.currencies (hasMany)");
}
console.log("[done] company service currency");
