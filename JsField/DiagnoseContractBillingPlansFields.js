// ============================================================
// ONE-TIME DIAGNOSTIC SCRIPT — NOT a reusable field/action block.
//
// Checks Nocobase's own field metadata for contractBillingPlans directly
// via the API, bypassing the Admin UI's "Configure fields" list (which a
// screenshot showed missing `id` and the `contracts` belongsTo field —
// this script settles whether that's a real gap or just a UI display
// issue).
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Read-only — makes no changes.
// ============================================================

(async () => {
  const res = await ctx.api.request({
    url: "collections/contractBillingPlans/fields:list",
    params: { paginate: false },
  });
  const fields = res?.data?.data || [];
  console.log(`Total fields registered: ${fields.length}`);
  fields.forEach((f) => console.log(`- ${f.name} (${f.type})${f.target ? ` -> ${f.target}` : ""}`));

  const hasContracts = fields.some((f) => f.name === "contracts");
  console.log(hasContracts ? "[OK] 'contracts' relation field IS registered." : "[MISSING] 'contracts' relation field is NOT in the field registry.");
})();
