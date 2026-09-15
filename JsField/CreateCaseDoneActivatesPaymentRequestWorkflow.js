// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// WF3 of docs/superpowers/specs/2026-09-15-by-case-payment-request-automation-design.md §5.
// Trigger: Collection event on `projects` (Case), UPDATE only, fires when
// `status` specifically changes AND lands on "done" AND the case has a
// linked contract. Runs independently of, and has no effect on, the
// existing `auto_create_payment_request_on_case_done` SQL trigger
// (pgsql/contract_payment_status_workflow.sql) — both react to the same
// "case became done" event side by side; that SQL trigger's lump-sum
// "outstanding balance" fallback still fires for contracts with no
// scheduled on_case_done installment, unchanged. See design spec §3.
//
// Node graph:
//   1. Query "onCaseDonePR" (multiple) — every "pending" Payment Request
//      for this contract whose triggerType is "on_case_done" (normally at
//      most one, handled as a small result set either way).
//   2. Loop "prLoop" over the query result:
//      a. Update "markConditionMet" — conditionMet: true.
//      b. Condition "hasDueDate" (true branch only continues).
//      c. Update "activatePR" — status: "active".
//
// Same rejectOnFalse: false rule as the other workflows in this folder —
// "no due date yet" is a normal outcome, not an error.
//
// IMPORTANT node-graph detail (see CreateByCaseScheduledPaymentRequestsWorkflow.js's
// header comment for the full explanation, confirmed directly from
// Processor.ts): a Loop's body only runs if its first child node has a
// NON-NULL branchIndex — "markConditionMet" below uses branchIndex: 0 for
// exactly that reason, unlike every other purely-sequential node here.
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

const WORKFLOW_TITLE = "By Case - Case done activates on_case_done Payment Request";

const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "collection",
  enabled: true,
  sync: false,
  current: true,
  config: {
    collection: "projects",
    mode: 2, // UPDATE only
    changed: ["status"],
    condition: {
      $and: [{ status: { $eq: "done" } }, { contractId: { $ne: null } }],
    },
    appends: [],
  },
});

const queryOnCaseDonePRNodePayload = () => ({
  type: "query",
  key: "onCaseDonePR",
  title: "Find pending on_case_done Payment Requests for this contract",
  upstreamId: null,
  branchIndex: null,
  config: {
    collection: "paymentRequests",
    multiple: true,
    failOnEmpty: false,
    params: {
      filter: {
        $and: [
          { contractId: { $eq: "{{$context.data.contractId}}" } },
          { triggerType: { $eq: "on_case_done" } },
          { status: { $eq: "pending" } },
        ],
      },
    },
  },
});

const loopNodePayload = (upstreamId) => ({
  type: "loop",
  key: "prLoop",
  title: "For each matching Payment Request",
  upstreamId,
  branchIndex: null,
  config: {
    target: "{{$jobsMapByNodeKey.onCaseDonePR}}",
  },
});

const markConditionMetNodePayload = (loopId) => ({
  type: "update",
  key: "markConditionMet",
  title: "Mark trigger condition met",
  upstreamId: loopId,
  branchIndex: 0, // loop body's single entry point — must be non-null, see header comment
  config: {
    collection: "paymentRequests",
    params: {
      filterByTk: "{{$scopes.prLoop.item.id}}",
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
    expression: "{{$scopes.prLoop.item.dueDate}} != null",
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
      filterByTk: "{{$scopes.prLoop.item.id}}",
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

  const nQuery = await createNode(queryOnCaseDonePRNodePayload());
  const nLoop = await createNode(loopNodePayload(nQuery.id));
  const nMark = await createNode(markConditionMetNodePayload(nLoop.id));
  const nHasDate = await createNode(hasDueDateConditionNodePayload(nMark.id));
  await createNode(activatePRNodePayload(nHasDate.id));

  console.log("Done. Next steps:");
  console.log("1. Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
  console.log(
    "2. Mark every task in a test case done/cancelled so the case auto-completes (existing SQL trigger) — confirm its on_case_done Payment Request gets conditionMet: true and activates once a due date is present.",
  );
  console.log(
    "3. Confirm the existing lump-sum SQL trigger (auto_create_payment_request_on_case_done) still fires unaffected for a case whose contract has no scheduled on_case_done installment.",
  );
})();
