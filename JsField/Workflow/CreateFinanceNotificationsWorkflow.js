// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Finance notifications, real-time delivery (2026-09-30).
// Spec: docs/superpowers/specs/2026-09-30-realtime-finance-notifications-design.md
//
// pgsql/finance_notifications.sql queues one event per thing that happens to
// the money — whatever made the change, SQL included (unchanged). Until now
// four Schedule workflows polled that queue every minute: up to a minute
// late, ~1,440 runs a day each, and every successful run deleted, so there
// was no history. Now nothing polls:
//
//   Detectors — "Finance notify · detect · <collection>", one Collection
//   event per table whose change can queue an event (update only when a
//   listed field changed), plus the same steps appended to the two existing
//   crons ("Retainer billing - hourly SQL run", "Finance - daily overdue
//   refresh"):
//     → SQL:    SELECT * FROM public.finance_notifications_take(200, NULL)
//               (every queued event -> one row per person to notify)
//     → Loop over the rows
//         → Create record "financeNotifications" (one per person)
//   A run with nothing to send is not kept (deleteExecutionOnStatus [1]);
//   a failed run is.
//
//   Senders — the four "Finance - … notifications" workflows, now a
//   Collection event on a NEW financeNotifications row of their own record
//   types:
//     → Notification ("payment" in-app channel) to the row's receiver,
//       title / content from the row, link to the contract
//     → Update: stamp the row's sentAt
//   Every execution is kept: one per notification sent = the history.
//   Switching one off stops its record type only.
//
// A detector run takes every record type, so events left by SQL run by hand
// go out with the next change on any watched table. Events older than a day
// are still dropped (finance_notifications_take).
//
// The two crons are locked once they have executions ("Node could not be
// created in executed workflow"): the steps go into a new version
// (workflows:revision), which is then enabled and becomes current — the old
// version and its history stay. Re-running CreateRetainerBillingCronWorkflow.js
// or CreateFinanceOverdueCronWorkflow.js rebuilds those crons WITHOUT the
// steps: run this script again after them.
//
// Leaves "Payment Request created - notify assignee" and "Noti assign
// payment" alone (user decision, 2026-09-30).
//
// Run JsField/CreateFinanceNotificationsCollection.js and
// pgsql/finance_notifications.sql FIRST. After running this script:
// Admin -> Workflow -> toggle each new workflow Disabled -> Enabled once if
// it does not fire (same in-memory-cache caveat as every script-created
// workflow in this project).
//
// How to run: paste into a temporary NocoBase Action block's onClick, or the
// browser dev console on any admin page (ctx in scope). Idempotent — deletes
// the workflows it owns by title and rebuilds them; a cron already carrying
// the steps is skipped.
// ============================================================

// ---- finance notification payloads (pure; tested by scripts/tests/finance-notifications.test.js) ----
// Tables whose change can queue a finance event (directly, or through the SQL
// it sets off) — mode: 1 create, 2 update, 3 both; changed: fields an update
// must touch to run the detector.
const DETECT_SOURCES = [
  { collection: "paymentRequests", mode: 3, changed: ["status", "dueDate", "overdueSince"] },
  { collection: "invoices", mode: 3, changed: ["status"] },
  { collection: "payments", mode: 3, changed: ["paymentStatus"] },
  { collection: "tasks", mode: 2, changed: ["status", "linkedPaymentRequestId", "isPaymentTrigger", "projectServiceId"] },
  { collection: "projects", mode: 3, changed: ["status", "contractId"] },
  { collection: "contracts", mode: 3, changed: ["status"] },
  { collection: "contractPaymentSchedules", mode: 1, changed: [] },
  { collection: "contractBillingPlans", mode: 2, changed: ["isBillingActive"] },
];

const SENDERS = [
  { title: "Finance - Payment Request notifications", entities: ["paymentRequests"] },
  { title: "Finance - Invoice notifications", entities: ["invoices"] },
  { title: "Finance - Payment notifications", entities: ["payments"] },
  { title: "Finance - Contract notifications", entities: ["contractBillingPlans", "contracts"] },
];

const CRON_TITLES = ["Retainer billing - hourly SQL run", "Finance - daily overdue refresh"];

// Contract detail page — the same view as CONTRACT_DETAIL_PATH in
// All Module/Case/CaseFinanceBlock.js.
const CONTRACT_URL = "/admin/xosxz5frfxb/view/869cc2fcc6b/filterbytk/{{$context.data.contractId}}";

// The collection trigger skips an update when none of its `changed` names
// changed — a name that is not a field of the collection never changes, so a
// wrong name silences the detector. Each name is kept when a field has it,
// mapped to the belongsTo field whose foreignKey it is, dropped otherwise.
// changed: null = nothing usable left (the detector then runs on every update).
const resolveChangedFields = (wanted, fields) => {
  const list = fields || [];
  const changed = [];
  const dropped = [];
  (wanted || []).forEach((name) => {
    const own = list.find((f) => f.name === name);
    const byKey = list.find((f) => f.type === "belongsTo" && f.foreignKey === name);
    const resolved = own ? own.name : byKey ? byKey.name : null;
    if (resolved) {
      if (!changed.includes(resolved)) changed.push(resolved);
    } else {
      dropped.push(name);
    }
  });
  return { changed: changed.length ? changed : null, dropped };
};

const detectorWorkflowPayload = (source, changed) => ({
  title: `Finance notify · detect · ${source.collection}`,
  type: "collection",
  enabled: true,
  sync: false,
  current: true,
  options: { deleteExecutionOnStatus: [1] },
  config: {
    collection: source.collection,
    mode: source.mode,
    ...(changed && changed.length ? { changed } : {}),
    appends: [],
  },
});

const takeNodePayload = (upstreamId) => ({
  type: "sql",
  key: "financeNotifyTake",
  title: "Take queued finance events (SQL)",
  upstreamId,
  branchIndex: null,
  config: {
    dataSource: "main",
    sql: "SELECT * FROM public.finance_notifications_take(200, NULL)",
    withMeta: false,
  },
});

const eachNodePayload = (upstreamId) => ({
  type: "loop",
  key: "financeNotifyEach",
  title: "For each person to notify",
  upstreamId,
  branchIndex: null,
  config: {
    target: "{{$jobsMapByNodeKey.financeNotifyTake}}",
  },
});

const ITEM = "$scopes.financeNotifyEach.item";
const createRowNodePayload = (loopNodeId) => ({
  type: "create",
  key: "financeNotifyRow",
  title: "Create the notification row",
  upstreamId: loopNodeId,
  branchIndex: 0,
  config: {
    collection: "financeNotifications",
    params: {
      values: {
        title: `{{${ITEM}.title}}`,
        content: `{{${ITEM}.content}}`,
        event: `{{${ITEM}.event}}`,
        entity: `{{${ITEM}.entity}}`,
        entityId: `{{${ITEM}.entity_id}}`,
        contractId: `{{${ITEM}.contract_id}}`,
        caseLabel: `{{${ITEM}.case_label}}`,
        customerName: `{{${ITEM}.customer_name}}`,
        receiver: `{{${ITEM}.receiver_user_id}}`,
      },
    },
  },
});

// No deleteExecutionOnStatus: every sender execution is kept (history).
const senderWorkflowPayload = (sender) => ({
  title: sender.title,
  type: "collection",
  enabled: true,
  sync: false,
  current: true,
  config: {
    collection: "financeNotifications",
    mode: 1,
    condition: { $and: [{ entity: { $in: sender.entities } }] },
    appends: [],
  },
});

// Content uses triple braces {{{ }}}: the notification renders it with
// Handlebars, and {{ }} would HTML-escape "&" and quotes. ignoreFail false: a
// failed send shows as a failed execution and the row keeps sentAt empty.
const notifyNodePayload = () => ({
  type: "notification",
  key: "financeNotifySend",
  title: "Notify",
  upstreamId: null,
  branchIndex: null,
  config: {
    channelName: "payment",
    receivers: ["{{$context.data.receiverUserId}}"],
    title: "{{$context.data.title}}",
    content: "{{{$context.data.content}}}",
    options: {
      url: CONTRACT_URL,
      duration: 5,
    },
    ignoreFail: false,
  },
});

const markSentNodePayload = (upstreamId) => ({
  type: "update",
  key: "financeNotifyMarkSent",
  title: "Mark as sent",
  upstreamId,
  branchIndex: null,
  config: {
    collection: "financeNotifications",
    params: {
      filter: { $and: [{ id: { $eq: "{{$context.data.id}}" } }] },
      values: { sentAt: "{{$system.now}}" },
    },
  },
});

// Last node of a workflow's main chain (branches hang off it and are skipped).
const tailNodeId = (nodes) => {
  const list = nodes || [];
  const byId = new Map(list.map((n) => [n.id, n]));
  let node = list.find((n) => n.upstreamId === null || n.upstreamId === undefined);
  while (node && node.downstreamId && byId.has(node.downstreamId)) node = byId.get(node.downstreamId);
  return node ? node.id : null;
};

const hasDetectorStep = (nodes) => (nodes || []).some((n) => n.key === "financeNotifyTake");
// ---- end finance notification payloads ----

const REMOVED_TITLES = ["Finance - notifications (every minute)"];

const destroyByTitle = async (title) => {
  const existing = await ctx.api.request({ url: "workflows:list", params: { filter: { title }, paginate: false } });
  for (const row of existing?.data?.data || []) {
    await ctx.api.request({ url: "workflows:destroy", method: "POST", params: { filterByTk: row.id } });
    console.log(`[deleted] workflow "${title}" id=${row.id}`);
  }
};

const createWorkflow = async (payload) => {
  const created = await ctx.api.request({ url: "workflows:create", method: "POST", data: payload });
  return created?.data?.data?.id || null;
};

const nodeCreator = (workflowId) => async (payload) => {
  const res = await ctx.api.request({ url: `workflows/${workflowId}/nodes:create`, method: "POST", data: payload });
  return res?.data?.data;
};

// Detector steps after `upstreamId` (null = first node).
const addDetectorSteps = async (workflowId, upstreamId) => {
  const createNode = nodeCreator(workflowId);
  const take = await createNode(takeNodePayload(upstreamId));
  const each = await createNode(eachNodePayload(take.id));
  await createNode(createRowNodePayload(each.id));
};

// Rows the polling workflows queued but never sent: closed, so they are not
// mixed with the new ones.
const closeOldRows = async () => {
  try {
    await ctx.api.request({
      url: "financeNotifications:update",
      method: "POST",
      params: { filter: { sentAt: { $empty: true } } },
      data: { sentAt: new Date().toISOString() },
    });
    console.log("[closed] unsent financeNotifications rows from the polling design");
  } catch (error) {
    console.warn("[warn] could not close old financeNotifications rows", error);
  }
};

const buildSender = async (sender) => {
  await destroyByTitle(sender.title);
  const workflowId = await createWorkflow(senderWorkflowPayload(sender));
  if (!workflowId) {
    console.error(`[fail] "${sender.title}": workflow create returned no id`);
    return;
  }
  const createNode = nodeCreator(workflowId);
  const notify = await createNode(notifyNodePayload());
  await createNode(markSentNodePayload(notify.id));
  console.log(`[created] sender "${sender.title}" id=${workflowId} (${sender.entities.join(", ")})`);
};

const fieldsOf = async (collection) => {
  const res = await ctx.api.request({
    url: "collections:get",
    params: { filterByTk: collection, appends: ["fields"] },
  });
  return res?.data?.data ? res.data.data.fields || [] : null;
};

const buildDetector = async (source) => {
  const title = detectorWorkflowPayload(source, null).title;
  await destroyByTitle(title);
  const fields = await fieldsOf(source.collection).catch(() => null);
  if (!fields) {
    console.warn(`[skip] "${title}": collection "${source.collection}" not found`);
    return;
  }
  let changed = null;
  if (source.changed.length) {
    const resolved = resolveChangedFields(source.changed, fields);
    changed = resolved.changed;
    if (resolved.dropped.length) {
      console.warn(`[warn] "${title}": no field ${resolved.dropped.join(", ")} on ${source.collection} — not watched`);
    }
    if (!changed) console.warn(`[warn] "${title}": no watched field left — runs on every update`);
  }
  const workflowId = await createWorkflow(detectorWorkflowPayload(source, changed));
  if (!workflowId) {
    console.error(`[fail] "${title}": workflow create returned no id`);
    return;
  }
  await addDetectorSteps(workflowId, null);
  console.log(`[created] detector "${title}" id=${workflowId}${changed ? ` (on ${changed.join(", ")})` : ""}`);
};

const getWorkflow = async (id) => {
  const res = await ctx.api.request({
    url: "workflows:get",
    params: { filterByTk: id, appends: ["nodes", "versionStats"] },
  });
  return res?.data?.data || null;
};

const appendToCron = async (title) => {
  const list = await ctx.api.request({
    url: "workflows:list",
    params: { filter: { title, current: true }, paginate: false },
  });
  const row = (list?.data?.data || [])[0];
  if (!row) {
    console.warn(`[skip] cron "${title}" not found — run its setup script, then this one again`);
    return;
  }
  const current = await getWorkflow(row.id);
  if (hasDetectorStep(current.nodes)) {
    console.log(`[skip] cron "${title}" already sends notifications`);
    return;
  }
  let target = current;
  if ((current.versionStats?.executed || 0) > 0) {
    const revised = await ctx.api.request({
      url: "workflows:revision",
      method: "POST",
      params: { filterByTk: current.id, filter: { key: current.key } },
    });
    target = await getWorkflow(revised?.data?.data?.id);
    if (!target) {
      console.error(`[fail] cron "${title}": revision returned no workflow`);
      return;
    }
  }
  await addDetectorSteps(target.id, tailNodeId(target.nodes));
  if (target.id !== current.id || !current.enabled) {
    await ctx.api.request({
      url: "workflows:update",
      method: "POST",
      params: { filterByTk: target.id },
      data: { enabled: true },
    });
  }
  console.log(
    `[updated] cron "${title}" id=${target.id}${target.id !== current.id ? ` (new version of id=${current.id})` : ""}`,
  );
};

(async () => {
  await closeOldRows();
  for (const title of REMOVED_TITLES) await destroyByTitle(title);
  for (const sender of SENDERS) await buildSender(sender);
  for (const source of DETECT_SOURCES) await buildDetector(source);
  for (const title of CRON_TITLES) await appendToCron(title);
  console.log("Done. If a new workflow does not fire: Admin -> Workflow -> toggle it Disabled then Enabled once (cache refresh).");
})();
