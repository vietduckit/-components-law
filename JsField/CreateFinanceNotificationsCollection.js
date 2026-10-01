// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Finance notifications (2026-09-28): the collection "financeNotifications",
// one row per person to notify. pgsql/finance_notifications.sql
// (finance_notifications_prepare) fills it from the queued finance events;
// the "Finance - notifications (every minute)" workflow
// (JsField/Workflow/CreateFinanceNotificationsWorkflow.js) queries the unsent
// rows, sends each and stamps sentAt. Being a real collection, its fields
// (title, content, caseLabel, customerName, contractId, …) are offered in the
// workflow's variable picker, and the rows are a log of what was sent.
//
// The id is a database sequence (autoIncrement) because SQL inserts the rows.
// How to run: paste into a temporary NocoBase Action block's onClick, or the
// browser dev console on any admin page (ctx in scope). Skips when the
// collection already exists (never deletes it).
// ============================================================

const COLLECTION_NAME = "financeNotifications";

const text = (name, title, type = "string", iface = "input") => ({
  name,
  type,
  interface: iface,
  uiSchema: { type: "string", title, "x-component": iface === "textarea" ? "Input.TextArea" : "Input" },
});

const collectionPayload = () => ({
  name: "financeNotifications",
  title: "Finance notifications",
  autoGenId: false,
  fields: [
    {
      name: "id",
      type: "bigInt",
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
      interface: "integer",
      uiSchema: { type: "number", title: "ID", "x-component": "InputNumber", "x-read-pretty": true },
    },
    text("title", "Title"),
    text("content", "Content", "text", "textarea"),
    text("event", "Event"),
    text("entity", "Record type"),
    {
      name: "entityId",
      type: "bigInt",
      interface: "integer",
      uiSchema: { type: "number", title: "Record ID", "x-component": "InputNumber" },
    },
    {
      name: "contractId",
      type: "bigInt",
      interface: "integer",
      uiSchema: { type: "number", title: "Contract ID", "x-component": "InputNumber" },
    },
    text("caseLabel", "Case"),
    text("customerName", "Customer"),
    {
      name: "receiver",
      type: "belongsTo",
      interface: "m2o",
      target: "users",
      foreignKey: "receiverUserId",
      targetKey: "id",
      uiSchema: {
        type: "object",
        title: "Receiver",
        "x-component": "AssociationField",
        "x-component-props": { multiple: false, fieldNames: { label: "nickname", value: "id" } },
      },
    },
    {
      name: "sentAt",
      type: "date",
      interface: "datetime",
      uiSchema: { type: "string", title: "Sent at", "x-component": "DatePicker", "x-component-props": { showTime: true } },
    },
    {
      name: "createdAt",
      type: "date",
      interface: "createdAt",
      field: "createdAt",
      uiSchema: { type: "datetime", title: "Created at", "x-component": "DatePicker", "x-component-props": { showTime: true }, "x-read-pretty": true },
    },
    {
      name: "updatedAt",
      type: "date",
      interface: "updatedAt",
      field: "updatedAt",
      uiSchema: { type: "datetime", title: "Updated at", "x-component": "DatePicker", "x-component-props": { showTime: true }, "x-read-pretty": true },
    },
  ],
});

(async () => {
  const existing = await ctx.api.request({
    url: "collections:list",
    params: { filter: { name: COLLECTION_NAME }, paginate: false },
  });
  if ((existing?.data?.data || []).length) {
    console.log(`[skip] collection "${COLLECTION_NAME}" already exists`);
    return;
  }
  const created = await ctx.api.request({ url: "collections:create", method: "POST", data: collectionPayload() });
  console.log(`[created] collection "${COLLECTION_NAME}"`, created?.data?.data?.name);
  console.log("Next: run pgsql/finance_notifications.sql, then JsField/Workflow/CreateFinanceNotificationsWorkflow.js.");
})();
