// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers what pgsql/service_thread_sync.sql adds
// (docs/superpowers/specs/2026-09-29-service-thread-sync-design.md):
//   serviceThreadId on quotationServices / contractServices / projectServices,
//   contractServices.serviceType, projectServices.quantity, and the history
//   collection serviceChangeLogs (read-only; the database writes it).
// The columns / table already exist; without this metadata the API drops
// them and the history cannot be shown.
//
// How to run: AFTER pgsql/service_thread_sync.sql, paste into a temporary
// NocoBase JS Block / Action onClick, or the browser dev console on an admin
// page (ctx in scope). Idempotent — skips what already exists.
// ============================================================
const bigIntField = (name, title) => ({
  name,
  type: "bigInt",
  interface: "integer",
  uiSchema: {
    type: "number",
    "x-component": "InputNumber",
    "x-component-props": { stringMode: true, step: "1" },
    title,
  },
});
const stringField = (name, title) => ({
  name,
  type: "string",
  interface: "input",
  uiSchema: { type: "string", "x-component": "Input", title },
});
const numberField = (name, title) => ({
  name,
  type: "double",
  interface: "number",
  uiSchema: {
    type: "number",
    "x-component": "InputNumber",
    "x-component-props": { stringMode: true, step: "1" },
    title,
  },
});
const textField = (name, title) => ({
  name,
  type: "text",
  interface: "textarea",
  uiSchema: { type: "string", "x-component": "Input.TextArea", title },
});

const LINE_FIELDS = [
  ["quotationServices", bigIntField("serviceThreadId", "Service Thread")],
  ["contractServices", bigIntField("serviceThreadId", "Service Thread")],
  ["projectServices", bigIntField("serviceThreadId", "Service Thread")],
  ["contractServices", stringField("serviceType", "Service Type")],
  ["projectServices", numberField("quantity", "Quantity")],
];

const listFields = async (collectionName) => {
  const res = await ctx.api.request({
    url: `collections/${collectionName}/fields:list`,
    params: { paginate: false },
  });
  return res?.data?.data || [];
};
const registerField = async (collectionName, field) => {
  if ((await listFields(collectionName)).some((f) => f.name === field.name)) {
    console.log(`[skip] ${collectionName}.${field.name} already registered`);
    return;
  }
  await ctx.api.request({
    url: `collections/${collectionName}/fields:create`,
    method: "POST",
    data: field,
  });
  console.log(`[created] ${collectionName}.${field.name}`);
};

for (const [collectionName, field] of LINE_FIELDS) {
  await registerField(collectionName, field);
}

const HISTORY_FIELDS = [
  bigIntField("serviceThreadId", "Service Thread"),
  stringField("action", "Action"),
  stringField("tableName", "Table"),
  bigIntField("recordId", "Line"),
  stringField("documentType", "Document Type"),
  bigIntField("documentId", "Document"),
  stringField("fieldName", "Field"),
  textField("oldValue", "Old Value"),
  textField("newValue", "New Value"),
  bigIntField("originLogId", "Spread From"),
];
const existing = await ctx.api.request({
  url: "collections:list",
  params: { paginate: false, filter: { name: "serviceChangeLogs" } },
});
if ((existing?.data?.data || []).length) {
  console.log("[skip] collection serviceChangeLogs already registered");
  for (const field of HISTORY_FIELDS) {
    await registerField("serviceChangeLogs", field);
  }
} else {
  await ctx.api.request({
    url: "collections:create",
    method: "POST",
    data: {
      name: "serviceChangeLogs",
      title: "Service Change Logs",
      autoGenId: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      updatedBy: false,
      fields: HISTORY_FIELDS,
    },
  });
  console.log("[created] collection serviceChangeLogs");
}
console.log("[done] service thread fields");
