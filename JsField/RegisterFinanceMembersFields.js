// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Finance members (2026-09-28): who handles and is notified about the money.
//   projects.financeMembers        — the case's Finance members (Info Case)
//   paymentRequests.financeMembers — people assigned to one Payment Request
//   invoices.financeMembers        — people assigned to one Invoice
//   payments.financeMembers        — people assigned to one Payment
// All many-to-many -> lawyers. NocoBase creates each through table itself
// (<through>(<fk>, lawyerId)). pgsql/finance_members.sql then fills the
// records' default people (Finance members + Manager of the contract's cases)
// and needs these tables — run this script FIRST.
// Replaces contracts.financeLawyers (Finance P3), which is no longer read.
//
// How to run: paste into the browser dev console on any admin page (ctx in
// scope) or a temporary Action block's onClick. Idempotent — skips fields
// that are already registered.
// ============================================================

const FIELDS = [
  // [collection, through table, foreign key to the collection]
  ["projects", "projectFinanceMembers", "projectId"],
  ["paymentRequests", "paymentRequestFinanceMembers", "paymentRequestId"],
  ["invoices", "invoiceFinanceMembers", "invoiceId"],
  ["payments", "paymentFinanceMembers", "paymentId"],
];

const fieldPayload = (through, foreignKey) => ({
  name: "financeMembers",
  type: "belongsToMany",
  interface: "m2m",
  target: "lawyers",
  through,
  foreignKey,
  otherKey: "lawyerId",
  sourceKey: "id",
  targetKey: "id",
  uiSchema: {
    type: "array",
    title: "Finance members",
    "x-component": "AssociationField",
    "x-component-props": { multiple: true },
  },
});

(async () => {
  for (const [collection, through, foreignKey] of FIELDS) {
    const existing = await ctx.api.request({
      url: `collections/${collection}/fields:list`,
      params: { paginate: false },
    });
    if ((existing?.data?.data || []).some((f) => f.name === "financeMembers")) {
      console.log(`[skip] ${collection}.financeMembers already registered`);
      continue;
    }
    await ctx.api.request({
      url: `collections/${collection}/fields:create`,
      method: "POST",
      data: fieldPayload(through, foreignKey),
    });
    console.log(`[created] ${collection}.financeMembers (through ${through})`);
  }
  console.log("Next: run pgsql/finance_members.sql, then add 'Finance members' to the Info Case details and edit form.");
})();
