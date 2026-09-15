// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// WF4 of docs/superpowers/specs/2026-09-15-by-case-payment-request-automation-design.md §5.
// Trigger: Collection event on `paymentRequests`, UPDATE only, fires when
// `dueDate` specifically changes from empty to non-empty AND the request
// is still "pending" AND its trigger condition was already met
// (conditionMet: true) — i.e. this is the "condition happened first, due
// date arrives later" ordering. The opposite ordering ("due date already
// set when the condition happens") is handled inline by
// CreateByCaseScheduledPaymentRequestsWorkflow.js (WF1),
// CreateTaskDoneActivatesPaymentRequestWorkflow.js (WF2), and
// CreateCaseDoneActivatesPaymentRequestWorkflow.js (WF3) — each already
// checks the due date itself at the moment it marks conditionMet, so this
// workflow only needs to cover the remaining case.
//
// Deliberately does NOT fire on `dueDate` changing on an already-active (or
// converted/etc.) request — the `status: pending` clause in the trigger
// condition guards that; this workflow only ever moves a request from
// pending to active, never touches one that's already past that point.
//
// This workflow is generic (not By-Case-specific) — it will apply
// unchanged to the upcoming By Service spec's Payment Requests too, since
// both use the exact same triggerType/conditionMet/status vocabulary.
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Idempotent — deletes any existing workflow with this exact title first,
// then rebuilds fresh.
//
// !!! After running, Admin -> Workflow -> open this workflow -> toggle
// Disabled -> Enabled once, to force the running server to pick it up
// (this project's own documented in-memory-cache gotcha). !!!
// ============================================================

const WORKFLOW_TITLE = "Payment Request - due date set activates an already-qualified request";

const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "collection",
  enabled: true,
  sync: false,
  current: true,
  config: {
    collection: "paymentRequests",
    mode: 2, // UPDATE only
    changed: ["dueDate"],
    condition: {
      $and: [{ status: { $eq: "pending" } }, { conditionMet: { $eq: true } }, { dueDate: { $ne: null } }],
    },
    appends: [],
  },
});

const activatePRNodePayload = () => ({
  type: "update",
  key: "activatePR",
  title: "Activate Payment Request",
  upstreamId: null,
  branchIndex: null,
  config: {
    collection: "paymentRequests",
    params: {
      filterByTk: "{{$context.data.id}}",
      values: { status: "active" },
    },
  },
});

(async () => {
  const existing = await ctx.api.request({
    url: "workflows:list",
    params: { filter: { title: WORKFLOW_TITLE }, paginate: false },
  });
  for (const row of existing?.data?.data || []) {
    await ctx.api.request({ url: "workflows:destroy", method: "POST", params: { filterByTk: row.id } });
    console.log(`[deleted] previous workflow id=${row.id} (rebuilding fresh)`);
  }

  const created = await ctx.api.request({ url: "workflows:create", method: "POST", data: workflowPayload() });
  const workflowId = created?.data?.data?.id;
  if (!workflowId) {
    console.error("[fail] workflow create returned no id", created?.data);
    return;
  }
  console.log(`[created] workflow id=${workflowId}`);

  const node = await ctx.api.request({
    url: `workflows/${workflowId}/nodes:create`,
    method: "POST",
    data: activatePRNodePayload(),
  });
  console.log(`[created] node "${node?.data?.data?.key}" id=${node?.data?.data?.id}`);

  console.log("Done. Next steps:");
  console.log("1. Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
  console.log(
    "2. On a pending Payment Request with conditionMet already true (from WF2/WF3) and no due date, set a due date — confirm it flips to active.",
  );
  console.log(
    "3. Confirm setting a due date on a request that is NOT yet conditionMet, or already active, does nothing.",
  );
})();
