// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Creates the Workflow that notifies a Payment Request's assignee on the
// "payment" in-app channel when the request is created:
//   Trigger: Collection event on paymentRequests, "after record created".
//   Node:    Notification -> channel "payment", receiver resolved from
//            assignedLawyer.user, content following this project's
//            established convention (title + customer short name).
//
// Payload shapes below are taken directly from Nocobase's own source
// (not guessed): packages/plugins/@nocobase/plugin-workflow's
// CollectionTrigger.ts (trigger config: collection/mode/appends) and
// common/collections/workflows.ts + flow_nodes.ts (required columns),
// and plugin-notification-in-app-message's MessageConfigForm.tsx /
// configFormCommonFieldset.ts (node config: channelName/receivers/
// title/content). mode: 1 = create-only (see MODE_BITMAP in
// CollectionTrigger.ts — 1=create, 2=update, 4=destroy, combine by OR'ing
// for more than one).
//
// receivers[0] uses the workflow's own "{{$context.data...}}" variable
// syntax (resolved by the workflow engine itself before the notification
// is sent) — it MUST end in ".user.id" (a plain user id), not just
// ".user" (the full nested user object), because
// plugin-notification-manager's parseUserSelectionConfig treats any
// object-typed receiver entry as a DB filter query, not a user id — see
// packages/plugins/@nocobase/plugin-notification-manager/src/server/
// utils/parseUserSelectionConfig.ts.
//
// content/title use plain Handlebars-style "{{field}}" (NOT the
// "{{$context.data.field}}" workflow syntax) — confirmed from
// plugin-notification-manager/src/server/utils/compile.ts, which runs a
// SEPARATE Handlebars compile pass against the trigger's raw record data
// after the workflow engine's own variable resolution has already run.
// This matches this project's established notification-content
// convention (see project memory: human-readable, never a bare #id —
// "{{title}} (KH: {{customers.shortName}})", `customers` relation name
// confirmed plural for paymentRequests specifically, unlike `projects`
// which uses singular `customer`).
//
// !!! KNOWN PROJECT-SPECIFIC RISK !!!
// A prior session already lost a full Notification-workflow
// implementation because Nocobase's running server keeps workflows in an
// in-memory cache that does not reliably reload just because a row was
// inserted via the API (see docs/superpowers/plans/
// 2026-09-05-contract-payment-status-workflow.md's own architecture
// notes for this exact gotcha). After running this script:
//   1. Create a real Payment Request through the app UI (assign a lawyer
//      that has a real linked user account) and confirm the notification
//      actually arrives on the "payment" channel.
//   2. If it does NOT fire, restart the Nocobase server process (or use
//      Admin UI -> Workflow -> open this workflow -> toggle it off/on,
//      which forces a cache refresh) before assuming the config itself
//      is wrong.
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Idempotent — skips creating the workflow if one with this exact title
// already exists.
// ============================================================

const WORKFLOW_TITLE = "Payment Request created - notify assignee";
const CHANNEL_NAME = "payment"; // Channel name column from Notification manager, confirmed in screenshot

const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "collection",
  enabled: true,
  sync: false,
  current: true,
  config: {
    collection: "paymentRequests",
    mode: 1, // CREATE only
    condition: null,
    appends: ["assignedLawyer", "assignedLawyer.user", "customers"],
  },
});

const notificationNodePayload = () => ({
  type: "notification",
  title: "Notify assignee",
  upstreamId: null,
  branchIndex: null,
  config: {
    channelName: CHANNEL_NAME,
    receivers: ["{{$context.data.assignedLawyer.user.id}}"],
    title: "Yêu cầu thanh toán mới",
    content: "{{title}} (KH: {{customers.shortName}})",
    options: {},
    ignoreFail: false,
  },
});

(async () => {
  const existing = await ctx.api.request({
    url: "workflows:list",
    params: { filter: { title: WORKFLOW_TITLE }, paginate: false },
  });
  if ((existing?.data?.data || []).length > 0) {
    console.log(`[skip] Workflow "${WORKFLOW_TITLE}" already exists (id=${existing.data.data[0].id})`);
    return;
  }

  const created = await ctx.api.request({
    url: "workflows:create",
    method: "POST",
    data: workflowPayload(),
  });
  const workflowId = created?.data?.data?.id;
  if (!workflowId) {
    console.error("[fail] workflow create returned no id", created?.data);
    return;
  }
  console.log(`[created] workflow id=${workflowId}`);

  const node = await ctx.api.request({
    url: `workflows/${workflowId}/nodes:create`,
    method: "POST",
    data: notificationNodePayload(),
  });
  console.log(`[created] notification node id=${node?.data?.data?.id}`);
  console.log("Done. Now test by creating a real Payment Request in the app (see comment header for verification steps).");
})();
