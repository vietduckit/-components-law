// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Finance P3 (2026-09-28, spec
// docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §10.1):
// contracts.financeLawyers — the contract's Finance members (many-to-many ->
// lawyers). Together with the case's Manager (projects.managerId) they see
// and operate the Case Finance tab and receive finance notifications
// (Finance P5).
//
// NocoBase creates the through table "contractFinanceLawyers"
// (contractId, lawyerId) itself. Idempotent — skips if already registered.
// How to run: paste into the browser dev console on any admin page (ctx in
// scope) or a temporary Action block's onClick.
// ============================================================

const fieldPayload = () => ({
  name: "financeLawyers",
  type: "belongsToMany",
  interface: "m2m",
  target: "lawyers",
  through: "contractFinanceLawyers",
  foreignKey: "contractId",
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
  const existing = await ctx.api.request({
    url: "collections/contracts/fields:list",
    params: { paginate: false },
  });
  if ((existing?.data?.data || []).some((f) => f.name === "financeLawyers")) {
    console.log("[skip] contracts.financeLawyers already registered");
    return;
  }
  await ctx.api.request({ url: "collections/contracts/fields:create", method: "POST", data: fieldPayload() });
  console.log("[created] contracts.financeLawyers (through contractFinanceLawyers)");
  console.log("Next: add 'Finance members' to the Contract edit form so it can be filled in.");
})();
