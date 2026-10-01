const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// Finance notifications (2026-09-28): the collection the workflow sends from,
// and the workflow itself (pgsql/finance_notifications.sql queues the events).
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

{
  const src = read("JsField/CreateFinanceNotificationsCollection.js");
  assert.ok(src.includes('name: "financeNotifications"'), "collection name");
  for (const field of ["title", "content", "event", "entity", "entityId", "contractId", "caseLabel", "customerName", "sentAt"]) {
    assert.ok(src.includes(`name: "${field}"`) || src.includes(`text("${field}"`), `field ${field}`);
  }
  assert.ok(/name: "receiver"[\s\S]*type: "belongsTo"[\s\S]*target: "users"[\s\S]*foreignKey: "receiverUserId"/.test(src), "receiver -> users");
  assert.ok(/autoIncrement: true/.test(src), "database-generated id (the SQL inserts rows)");
  assert.ok(!/collections:destroy/.test(src), "never deletes an existing collection");
}
// ---- 2026-09-30: real-time delivery (detectors + senders) ----
// docs/superpowers/specs/2026-09-30-realtime-finance-notifications-design.md
{
  const { extractMarkedBlock } = require("./extract-marked-block");
  const file = path.join(root, "JsField/Workflow/CreateFinanceNotificationsWorkflow.js");
  const P = extractMarkedBlock(
    file,
    "// ---- finance notification payloads (pure; tested by scripts/tests/finance-notifications.test.js) ----",
    "// ---- end finance notification payloads ----",
    [
      "DETECT_SOURCES", "SENDERS", "CRON_TITLES", "resolveChangedFields", "detectorWorkflowPayload",
      "takeNodePayload", "eachNodePayload", "createRowNodePayload", "senderWorkflowPayload",
      "notifyNodePayload", "markSentNodePayload", "tailNodeId", "hasDetectorStep",
    ],
  );

  // detectors: one collection event per source table, update filtered by field
  assert.deepEqual(
    P.DETECT_SOURCES.map((s) => [s.collection, s.mode, s.changed]),
    [
      ["paymentRequests", 3, ["status", "dueDate", "overdueSince"]],
      ["invoices", 3, ["status"]],
      ["payments", 3, ["paymentStatus"]],
      ["tasks", 2, ["status", "linkedPaymentRequestId", "isPaymentTrigger", "projectServiceId"]],
      ["projects", 3, ["status", "contractId"]],
      ["contracts", 3, ["status"]],
      ["contractPaymentSchedules", 1, []],
      ["contractBillingPlans", 2, ["isBillingActive"]],
    ],
  );
  const d = P.detectorWorkflowPayload({ collection: "tasks", mode: 2 }, ["status", "linkedPaymentRequestId"]);
  assert.equal(d.title, "Finance notify · detect · tasks");
  assert.equal(d.type, "collection");
  assert.equal(d.enabled, true);
  assert.equal(d.sync, false);
  assert.deepEqual(d.config, { collection: "tasks", mode: 2, changed: ["status", "linkedPaymentRequestId"], appends: [] });
  assert.deepEqual(d.options, { deleteExecutionOnStatus: [1] }, "a detector run with nothing to send leaves no trace");
  assert.equal("changed" in P.detectorWorkflowPayload({ collection: "x", mode: 1 }, null).config, false, "no changed filter");

  // changed fields resolved against the live metadata (a missing name would
  // make the collection trigger skip every update)
  const fields = [
    { name: "status", type: "string" },
    { name: "linkedPaymentRequestId", type: "belongsTo", foreignKey: "paymentRequestId" },
    { name: "contract", type: "belongsTo", foreignKey: "contractId" },
    { name: "tasks", type: "hasMany", foreignKey: "projectId" },
  ];
  assert.deepEqual(P.resolveChangedFields(["status", "linkedPaymentRequestId"], fields), {
    changed: ["status", "linkedPaymentRequestId"],
    dropped: [],
  });
  assert.deepEqual(
    P.resolveChangedFields(["contractId", "paymentRequestId", "projectId", "nope"], fields),
    { changed: ["contract", "linkedPaymentRequestId"], dropped: ["projectId", "nope"] },
    "foreign key -> its belongsTo field; hasMany keys and unknown names dropped",
  );
  assert.deepEqual(P.resolveChangedFields(["nope"], fields), { changed: null, dropped: ["nope"] }, "nothing left -> no filter");
  assert.deepEqual(P.resolveChangedFields([], fields), { changed: null, dropped: [] });

  // detector steps: take every queued event -> one financeNotifications row per receiver
  assert.deepEqual(P.takeNodePayload(null), {
    type: "sql",
    key: "financeNotifyTake",
    title: "Take queued finance events (SQL)",
    upstreamId: null,
    branchIndex: null,
    config: { dataSource: "main", sql: "SELECT * FROM public.finance_notifications_take(200, NULL)", withMeta: false },
  });
  assert.equal(P.eachNodePayload(7).config.target, "{{$jobsMapByNodeKey.financeNotifyTake}}");
  assert.equal(P.eachNodePayload(7).upstreamId, 7);
  const row = P.createRowNodePayload(9);
  assert.equal(row.type, "create");
  assert.equal(row.upstreamId, 9);
  assert.equal(row.branchIndex, 0, "inside the loop");
  assert.equal(row.config.collection, "financeNotifications");
  assert.deepEqual(row.config.params.values, {
    title: "{{$scopes.financeNotifyEach.item.title}}",
    content: "{{$scopes.financeNotifyEach.item.content}}",
    event: "{{$scopes.financeNotifyEach.item.event}}",
    entity: "{{$scopes.financeNotifyEach.item.entity}}",
    entityId: "{{$scopes.financeNotifyEach.item.entity_id}}",
    contractId: "{{$scopes.financeNotifyEach.item.contract_id}}",
    caseLabel: "{{$scopes.financeNotifyEach.item.case_label}}",
    customerName: "{{$scopes.financeNotifyEach.item.customer_name}}",
    receiver: "{{$scopes.financeNotifyEach.item.receiver_user_id}}",
  });

  // senders: one per record type, on a new financeNotifications row, history kept
  assert.deepEqual(
    P.SENDERS.map((s) => [s.title, s.entities]),
    [
      ["Finance - Payment Request notifications", ["paymentRequests"]],
      ["Finance - Invoice notifications", ["invoices"]],
      ["Finance - Payment notifications", ["payments"]],
      ["Finance - Contract notifications", ["contractBillingPlans", "contracts"]],
    ],
  );
  const sender = P.senderWorkflowPayload(P.SENDERS[3]);
  assert.equal(sender.title, "Finance - Contract notifications");
  assert.equal(sender.type, "collection");
  assert.equal(sender.sync, false);
  assert.deepEqual(sender.config, {
    collection: "financeNotifications",
    mode: 1,
    condition: { $and: [{ entity: { $in: ["contractBillingPlans", "contracts"] } }] },
    appends: [],
  });
  assert.equal(sender.options, undefined, "every sender execution is kept (history)");
  const notify = P.notifyNodePayload();
  assert.equal(notify.type, "notification");
  assert.equal(notify.upstreamId, null);
  assert.deepEqual(notify.config.receivers, ["{{$context.data.receiverUserId}}"]);
  assert.equal(notify.config.title, "{{$context.data.title}}");
  assert.equal(notify.config.content, "{{{$context.data.content}}}", "not HTML-escaped (triple braces)");
  assert.ok(/^\/admin\/.*\/filterbytk\/\{\{\$context\.data\.contractId\}\}$/.test(notify.config.options.url), "opens the contract");
  assert.equal(notify.config.ignoreFail, false, "a failed send shows as a failed execution");
  const mark = P.markSentNodePayload(4);
  assert.equal(mark.type, "update");
  assert.equal(mark.upstreamId, 4);
  assert.deepEqual(mark.config.params, {
    filter: { $and: [{ id: { $eq: "{{$context.data.id}}" } }] },
    values: { sentAt: "{{$system.now}}" },
  });

  // crons: detector steps appended after their last main-chain node
  assert.deepEqual(P.CRON_TITLES, ["Retainer billing - hourly SQL run", "Finance - daily overdue refresh"]);
  assert.equal(
    P.tailNodeId([
      { id: 3, upstreamId: 2, branchIndex: 0, downstreamId: null },
      { id: 1, upstreamId: null, branchIndex: null, downstreamId: 2 },
      { id: 2, upstreamId: 1, branchIndex: null, downstreamId: null },
    ]),
    2,
  );
  assert.equal(P.tailNodeId([]), null);
  assert.equal(P.hasDetectorStep([{ key: "financeRefreshOverdue" }, { key: "financeNotifyTake" }]), true);
  assert.equal(P.hasDetectorStep([{ key: "financeRefreshOverdue" }]), false);

  // wiring
  const src = read("JsField/Workflow/CreateFinanceNotificationsWorkflow.js");
  assert.ok(/url: "workflows:revision"/.test(src) && /filter: \{ key: current\.key \}/.test(src), "executed cron gets a new version");
  assert.ok(/data: \{ enabled: true \}/.test(src), "the new version is enabled (becomes current)");
  assert.ok(/url: "financeNotifications:update"/.test(src) && /sentAt: \{ \$empty: true \}/.test(src), "stamps rows left by the polling design");
  assert.ok(src.includes('"Finance - notifications (every minute)"'), "removes the single combined workflow");
  assert.ok(!/repeat: "\* \* \* \* \*"/.test(src), "no more polling");
  assert.ok(!/OLD_ASSIGNEE_WORKFLOW/.test(src) && !/enabled: false/.test(src), "switches no other workflow off (assignee ones left alone)");
}
{
  const src = read("JsField/Workflow/CreateRetainerBillingCronWorkflow.js");
  assert.ok(!/type: "notification"/.test(src), "retainer run no longer notifies on its own (finance notifications do)");
  assert.ok(src.includes("SELECT * FROM public.retainer_billing_run_due()"), "still runs the retainer billing");
}

console.log("finance-notifications: all checks passed");
