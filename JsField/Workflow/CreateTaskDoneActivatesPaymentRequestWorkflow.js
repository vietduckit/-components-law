// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// WF2 of docs/superpowers/specs/2026-09-15-by-case-payment-request-automation-design.md §5.
// Trigger: Collection event on `tasks`, UPDATE only, fires when `status`
// specifically changes AND lands on "done" AND the task has a
// `linkedPaymentRequestId` set (the lawyer's own explicit choice of which
// pending on_task_done Payment Request this Task should activate — see
// TaskManagement.js/TaskDetailView.js UI change in the same spec §6).
//
// Node graph:
//   1. Query "linkedPR" — load the linked paymentRequests row.
//   2. Condition "isPending" (true branch only continues) — guard against
//      touching a request that's already active/converted/etc. (e.g. a
//      Task re-opened and re-done after its request was already handled).
//   3. Update "markConditionMet" — conditionMet: true.
//   4. Condition "hasDueDate" (true branch only continues) — the request
//      might not have a due date yet.
//   5. Update "activatePR" — status: "active", only reached if both 2 and
//      4 were true.
//
// Neither Condition below uses rejectOnFalse: a "not ready yet" outcome is
// normal, not an error — using rejectOnFalse would mark the workflow
// execution FAILED in the Admin UI's history for a completely routine
// case, which would be misleading.
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Idempotent — deletes any existing workflow with this exact title first,
// then rebuilds fresh (same convention as the other workflow-creation
// scripts in this folder).
//
// !!! After running, Admin -> Workflow -> open this workflow -> toggle
// Disabled -> Enabled once, to force the running server to pick it up
// (this project's own documented in-memory-cache gotcha). !!!
// ============================================================

const WORKFLOW_TITLE = "By Case - Task done activates linked Payment Request";

const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "collection",
  enabled: true,
  sync: false,
  current: true,
  config: {
    collection: "tasks",
    mode: 2, // UPDATE only
    changed: ["status"],
    condition: {
      $and: [{ status: { $eq: "done" } }, { linkedPaymentRequestId: { $ne: null } }],
    },
    appends: [],
  },
});

const queryLinkedPRNodePayload = () => ({
  type: "query",
  key: "linkedPR",
  title: "Load the linked Payment Request",
  upstreamId: null,
  branchIndex: null,
  config: {
    collection: "paymentRequests",
    multiple: false,
    failOnEmpty: false,
    params: {
      filterByTk: "{{$context.data.linkedPaymentRequestId}}",
    },
  },
});

const isPendingConditionNodePayload = (upstreamId) => ({
  type: "condition",
  key: "isPending",
  title: "Is the linked request still pending?",
  upstreamId,
  branchIndex: null,
  config: {
    // NOT math.js — confirmed (against the real installed mathjs package,
    // and against a live failed execution of
    // CreateByCaseScheduledPaymentRequestsWorkflow.js, error "Cannot
    // convert \"pending\" to a number") that mathjs's == / equal() in this
    // project's bundled version always tries to coerce both operands to
    // numbers and throws for any non-numeric string. `calculation` here
    // uses logicCalculate.ts's plain `a == b` instead, which handles
    // strings correctly. See CreateByCaseScheduledPaymentRequestsWorkflow.js's
    // header comment for the full writeup.
    calculation: {
      calculator: "equal",
      operands: ["{{$jobsMapByNodeKey.linkedPR.status}}", "pending"],
    },
    rejectOnFalse: false, // already active/converted/etc — nothing to do, not an error
  },
});

const markConditionMetNodePayload = (upstreamId) => ({
  type: "update",
  key: "markConditionMet",
  title: "Mark trigger condition met",
  upstreamId,
  branchIndex: 1, // ON_TRUE of isPending
  config: {
    collection: "paymentRequests",
    params: {
      filterByTk: "{{$context.data.linkedPaymentRequestId}}",
      values: { conditionMet: true },
    },
  },
});

const hasDueDateConditionNodePayload = (upstreamId) => ({
  type: "condition",
  key: "hasDueDate",
  title: "Does it already have a due date?",
  upstreamId,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression: "{{$jobsMapByNodeKey.linkedPR.dueDate}} != null",
    rejectOnFalse: false,
  },
});

const activatePRNodePayload = (upstreamId) => ({
  type: "update",
  key: "activatePR",
  title: "Activate Payment Request",
  upstreamId,
  branchIndex: 1, // ON_TRUE of hasDueDate
  config: {
    collection: "paymentRequests",
    params: {
      filterByTk: "{{$context.data.linkedPaymentRequestId}}",
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

  const createNode = async (payload) => {
    const res = await ctx.api.request({ url: `workflows/${workflowId}/nodes:create`, method: "POST", data: payload });
    const node = res?.data?.data;
    console.log(`[created] node "${node?.key}" id=${node?.id}`);
    return node;
  };

  const nQuery = await createNode(queryLinkedPRNodePayload());
  const nIsPending = await createNode(isPendingConditionNodePayload(nQuery.id));
  const nMark = await createNode(markConditionMetNodePayload(nIsPending.id));
  const nHasDate = await createNode(hasDueDateConditionNodePayload(nMark.id));
  await createNode(activatePRNodePayload(nHasDate.id));

  console.log("Done. Next steps:");
  console.log("1. Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
  console.log(
    "2. On a test on_task_done Payment Request with no due date, link a Task to it and mark it done — confirm conditionMet flips true but status stays pending; then set a due date and confirm it flips to active (via WF4, not this workflow).",
  );
  console.log(
    "3. Repeat with the due date already set before the Task is marked done — confirm this workflow activates it directly in one pass.",
  );
})();
