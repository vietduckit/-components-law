// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// WF1 of docs/superpowers/specs/2026-09-15-by-case-payment-request-automation-design.md §5.
// Trigger: Collection event on `contracts`, CREATE only, condition
// contractType == "byCase". For every row in paymentSchedule.installments,
// creates one `paymentRequests` (+ matching `paymentRequestItems`) at
// status "pending" — active immediately only if the installment's
// triggerType is "on_signed" AND it already has a paymentDate.
//
// SIMPLIFICATION vs the design spec: fires on CREATE only, not also on
// UPDATE OF paymentSchedule. The spec's UPDATE case exists to also cover a
// schedule added/edited after initial contract creation, but doing that
// safely needs an "does a Payment Request already exist for this exact
// installment" check inside the loop — an object-vs-null comparison this
// project has no proven working example of in a math.js expression, so it
// isn't safe to ship blind. Ship this CREATE-only version first, verify it
// end-to-end, then add the UPDATE case as a deliberate follow-up once that
// comparison is confirmed to behave as expected.
//
// Node graph (Loop body, once per installment):
//   1. Calculation "conditionMetCalc" — true only when triggerType ==
//      "on_signed" (the only trigger already satisfied the instant the
//      contract exists; on_task_done/on_case_done wait for WF2/WF3).
//   2. Create "createPR" (paymentRequests) — always starts "pending".
//   3. Create "createPRItem" (paymentRequestItems) — mirrors the shape the
//      existing manual "Create payment request" flow already produces
//      (ContractPaymentScheduleDetailBlock.js), so these rows render
//      identically wherever paymentRequestItems is already displayed.
//   4. Condition "activateNow" — conditionMetCalc AND a due date is
//      already set on this installment.
//      -> true (branchIndex 1): Update "activatePR" — flips the
//         just-created request straight to "active".
//      -> false: nothing — stays "pending" until WF2 (task done) or WF4
//         (due date added later) activates it.
//
// All boolean logic uses math.js (`engine: "math.js"`), following this
// project's own established pattern (see CreateContractBillingPlansWorkflow.js),
// not the alternative logicCalculate `{calculator, operands}` format this
// project has never actually shipped. Confirmed directly against
// @nocobase/evaluators' substitution mechanism
// (packages/core/evaluators/src/utils/index.ts): every `{{path}}` token is
// replaced with a scope-bound variable holding the REAL typed value (not
// string-interpolated text), so string equality
// (`{{...}} == "on_signed"`) evaluates correctly in math.js.
//
// IMPORTANT node-graph detail, confirmed by reading Processor.ts directly
// (not assumed from the two existing example scripts, which never use a
// Loop node): a Loop's own body only runs at all if its first child node
// has a NON-NULL branchIndex (Processor.getBranches filters out
// branchIndex === null, and LoopInstruction takes the first result) — so
// the loop body's entry node below uses branchIndex: 0, unlike every other
// purely-sequential node in this file which keeps branchIndex: null.
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Idempotent — deletes any existing workflow with this exact title first,
// then rebuilds fresh (same convention as CreateContractBillingPlansWorkflow.js;
// a Test run locks the node graph, so delete+recreate beats patching).
//
// !!! After running, Admin -> Workflow -> open this workflow -> toggle
// Disabled -> Enabled once, to force the running server to pick it up
// (this project's own documented in-memory-cache gotcha — see
// docs/superpowers/specs/2026-09-05-contract-payment-status-workflow-design.md §1). !!!
// ============================================================

const WORKFLOW_TITLE = "By Case - create scheduled Payment Requests on contract save";

const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "collection",
  enabled: true,
  sync: false,
  current: true,
  config: {
    collection: "contracts",
    mode: 1, // CREATE only — see header comment
    condition: { contractType: { $eq: "byCase" } },
    appends: [],
  },
});

const loopNodePayload = () => ({
  type: "loop",
  key: "installmentsLoop",
  title: "For each installment in paymentSchedule",
  upstreamId: null,
  branchIndex: null,
  config: {
    target: "{{$context.data.paymentSchedule.installments}}",
  },
});

const conditionMetCalcNodePayload = (loopId) => ({
  type: "calculation",
  key: "conditionMetCalc",
  title: "Is this installment's trigger already satisfied? (on_signed only)",
  upstreamId: loopId,
  branchIndex: 0, // loop body's single entry point — must be non-null, see header comment
  config: {
    engine: "math.js",
    expression: '{{$scopes.installmentsLoop.item.triggerType}} == "on_signed"',
  },
});

const createPRNodePayload = (upstreamId) => ({
  type: "create",
  key: "createPR",
  title: "Create Payment Request (pending)",
  upstreamId,
  branchIndex: null,
  config: {
    collection: "paymentRequests",
    params: {
      values: {
        title:
          "Đợt {{$scopes.installmentsLoop.item.installmentNo}} - {{$context.data.contractCode}} - {{$context.data.contractName}}",
        status: "pending",
        triggerType: "{{$scopes.installmentsLoop.item.triggerType}}",
        conditionMet: "{{$jobsMapByNodeKey.conditionMetCalc}}",
        installmentNo: "{{$scopes.installmentsLoop.item.installmentNo}}",
        contractId: "{{$context.data.id}}",
        customerId: "{{$context.data.customerId}}",
        internalCompanyId: "{{$context.data.internalCompanyId}}",
        requestedAmount: "{{$scopes.installmentsLoop.item.amount}}",
        dueDate: "{{$scopes.installmentsLoop.item.paymentDate}}",
        currency: "VND",
        requestType: "create_payment",
      },
    },
  },
});

const createPRItemNodePayload = (upstreamId) => ({
  type: "create",
  key: "createPRItem",
  title: "Create Payment Request Item",
  upstreamId,
  branchIndex: null,
  config: {
    collection: "paymentRequestItems",
    params: {
      values: {
        paymentRequestId: "{{$jobsMapByNodeKey.createPR.id}}",
        contractId: "{{$context.data.id}}",
        lineType: "schedule_installment",
        lineStatus: "pending",
        scheduleItemId: "{{$scopes.installmentsLoop.item.id}}",
        installmentNo: "{{$scopes.installmentsLoop.item.installmentNo}}",
        lineLabel: "{{$scopes.installmentsLoop.item.label}}",
        description: "{{$scopes.installmentsLoop.item.content}}",
        plannedPaymentDate: "{{$scopes.installmentsLoop.item.paymentDate}}",
        requestedAmount: "{{$scopes.installmentsLoop.item.amount}}",
      },
    },
  },
});

const activateNowConditionNodePayload = (upstreamId) => ({
  type: "condition",
  key: "activateNow",
  title: "Condition already met AND due date already set?",
  upstreamId,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression:
      '{{$jobsMapByNodeKey.conditionMetCalc}} == true and {{$scopes.installmentsLoop.item.paymentDate}} != null',
    rejectOnFalse: false, // false = leave pending, not an error — never reject a normal "not yet" outcome
  },
});

const activatePRNodePayload = (upstreamId) => ({
  type: "update",
  key: "activatePR",
  title: "Activate Payment Request immediately",
  upstreamId,
  branchIndex: 1, // ON_TRUE
  config: {
    collection: "paymentRequests",
    params: {
      filterByTk: "{{$jobsMapByNodeKey.createPR.id}}",
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

  const nLoop = await createNode(loopNodePayload());
  const nCalc = await createNode(conditionMetCalcNodePayload(nLoop.id));
  const nCreatePR = await createNode(createPRNodePayload(nCalc.id));
  const nCreateItem = await createNode(createPRItemNodePayload(nCreatePR.id));
  const nActivateCond = await createNode(activateNowConditionNodePayload(nCreateItem.id));
  await createNode(activatePRNodePayload(nActivateCond.id));

  console.log("Done. Next steps:");
  console.log("1. Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
  console.log(
    "2. Create a test By Case contract with a 3-installment schedule (one of each triggerType, mixed paymentDate presence) and confirm 3 paymentRequests + 3 paymentRequestItems rows appear with the expected status/conditionMet per §7 of the design spec.",
  );
})();
