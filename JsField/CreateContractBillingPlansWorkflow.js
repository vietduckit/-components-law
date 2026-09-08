// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Rebuilds JsField/CreateRetainerBillingWorkflow.js's already-verified
// Workflow against the new contractBillingPlans collection instead of
// contracts. See docs/superpowers/specs/
// 2026-09-08-contract-billing-plans-architecture-design.md §6.3.
//
// Node graph, mathjs or/and fix, epoch-seconds date-comparison fix, and
// the "Execute manually" verification recipe are all UNCHANGED from
// JsField/CreateRetainerBillingWorkflow.js — only field references move:
//   - totalAmount / retainerTotalCycles / retainerCyclesBilled /
//     retainerUnit / nextBillingDate / endDate are now DIRECT on
//     $context.data (the plan record itself), not reached through a
//     contract or a paymentSchedule JSON blob.
//   - contractCode / contractName / customerId / internalCompanyId still
//     live on contracts, reached via $context.data.contracts.* (the
//     belongsTo relation, name "contracts" per the implementation plan's
//     Global Constraints) — needs appends: ["contracts"] on the trigger.
//   - contractId on the created paymentRequests row is
//     $context.data.contractId (the plan's own FK column) — simpler than
//     going through the relation for that one field.
//
// Same in-memory-cache caveat as every other script-created workflow
// this session: after running, toggle Disabled -> Enabled once in
// Admin -> Workflow.
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Idempotent — DELETES any existing workflow with this exact title first,
// then rebuilds fresh (same reasoning as CreateRetainerBillingWorkflow.js:
// a Test run locks the node graph, so delete+recreate beats trying to
// patch an already-executed workflow).
// ============================================================

const WORKFLOW_TITLE = "Retainer billing plans - auto-create next payment request";

const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "schedule",
  enabled: true,
  sync: false,
  current: true,
  config: {
    mode: 1,
    collection: "contractBillingPlans",
    startsOn: { field: "nextBillingDate" },
    appends: ["contracts"],
  },
});

const periodAmountNodePayload = () => ({
  type: "calculation",
  key: "periodAmountCalc",
  title: "Compute period amount",
  upstreamId: null,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression: "{{$context.data.totalAmount}} / {{$context.data.retainerTotalCycles}}",
  },
});

const nextPeriodsBilledNodePayload = (upstreamId) => ({
  type: "calculation",
  key: "nextPeriodsBilledCalc",
  title: "Compute next periods-billed count",
  upstreamId,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression: "{{$context.data.retainerCyclesBilled}} + 1",
  },
});

const createPaymentRequestNodePayload = (upstreamId) => ({
  type: "create",
  key: "createPaymentRequest",
  title: "Create payment request",
  upstreamId,
  branchIndex: null,
  config: {
    collection: "paymentRequests",
    params: {
      values: {
        title:
          "Payment request - {{$context.data.contracts.contractCode}} - {{$context.data.contracts.contractName}} - Retainer period {{$jobsMapByNodeKey.nextPeriodsBilledCalc}}",
        status: "submitted",
        contractId: "{{$context.data.contractId}}",
        customerId: "{{$context.data.contracts.customerId}}",
        internalCompanyId: "{{$context.data.contracts.internalCompanyId}}",
        requestedAmount: "{{$jobsMapByNodeKey.periodAmountCalc}}",
      },
    },
  },
});

const nextDateNodePayload = (upstreamId) => ({
  type: "dateCalculation",
  key: "nextDateCalc",
  title: "Compute next billing date",
  upstreamId,
  branchIndex: null,
  config: {
    input: "{{$context.data.nextBillingDate}}",
    inputType: "date",
    steps: [
      { function: "add", arguments: { number: 1, unit: "{{$context.data.retainerUnit}}" } },
      { function: "format", arguments: { format: "YYYY-MM-DD" } },
    ],
  },
});

const nextDateTsNodePayload = (upstreamId) => ({
  type: "dateCalculation",
  key: "nextDateTsCalc",
  title: "Compute next billing date (as timestamp, for comparison)",
  upstreamId,
  branchIndex: null,
  config: {
    input: "{{$context.data.nextBillingDate}}",
    inputType: "date",
    steps: [
      { function: "add", arguments: { number: 1, unit: "{{$context.data.retainerUnit}}" } },
      { function: "toTimestamp", arguments: { unit: "second" } },
    ],
  },
});

const endDateTsNodePayload = (upstreamId) => ({
  type: "dateCalculation",
  key: "endDateTsCalc",
  title: "Compute end date (as timestamp, for comparison)",
  upstreamId,
  branchIndex: null,
  config: {
    input: "{{$context.data.endDate}}",
    inputType: "date",
    steps: [{ function: "toTimestamp", arguments: { unit: "second" } }],
  },
});

const stopConditionNodePayload = (upstreamId) => ({
  type: "condition",
  key: "stopCondition",
  title: "Cycles exhausted or past end date?",
  upstreamId,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression:
      "{{$jobsMapByNodeKey.nextPeriodsBilledCalc}} >= {{$context.data.retainerTotalCycles}} or ({{$context.data.endDate}} != null and {{$jobsMapByNodeKey.nextDateTsCalc}} > {{$jobsMapByNodeKey.endDateTsCalc}})",
    rejectOnFalse: false,
  },
});

const updateStopNodePayload = (upstreamId) => ({
  type: "update",
  key: "updateStop",
  title: "Stop billing (cycles done or past end date)",
  upstreamId,
  branchIndex: 1,
  config: {
    collection: "contractBillingPlans",
    params: {
      filterByTk: "{{$context.data.id}}",
      values: {
        retainerCyclesBilled: "{{$jobsMapByNodeKey.nextPeriodsBilledCalc}}",
        nextBillingDate: null,
        status: "completed",
      },
    },
  },
});

const updateContinueNodePayload = (upstreamId) => ({
  type: "update",
  key: "updateContinue",
  title: "Advance to next billing cycle",
  upstreamId,
  branchIndex: 0,
  config: {
    collection: "contractBillingPlans",
    params: {
      filterByTk: "{{$context.data.id}}",
      values: {
        retainerCyclesBilled: "{{$jobsMapByNodeKey.nextPeriodsBilledCalc}}",
        nextBillingDate: "{{$jobsMapByNodeKey.nextDateCalc}}",
      },
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

  const n1 = await createNode(periodAmountNodePayload());
  const n2 = await createNode(nextPeriodsBilledNodePayload(n1.id));
  const n3 = await createNode(createPaymentRequestNodePayload(n2.id));
  const n4 = await createNode(nextDateNodePayload(n3.id));
  const n5 = await createNode(nextDateTsNodePayload(n4.id));
  const n6 = await createNode(endDateTsNodePayload(n5.id));
  const n7 = await createNode(stopConditionNodePayload(n6.id));
  await createNode(updateStopNodePayload(n7.id));
  await createNode(updateContinueNodePayload(n7.id));

  console.log("Done. Next steps:");
  console.log("1. Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
  console.log("2. Test-run against the contractBillingPlans row from Task 2 Step 3 before trusting this in production.");
})();
