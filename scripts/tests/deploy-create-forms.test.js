const assert = require("node:assert/strict");
const { planTargets, withCode } = require("../local/deploy-create-forms");

// docs/superpowers/specs/2026-09-30-create-forms-ui-money-unification-design.md §7
const js = (code) => ({ stepParams: { jsSettings: { runJs: { code } } } });
const models = [
  { uid: "page", options: {} },
  { uid: "grid", options: { parentId: "page" } },
  { uid: "caseBlock", options: { parentId: "grid", ...js("ctx; const ProjectCreateForm = () => null;") } },
  { uid: "contractBlock", options: { parentId: "page", ...js("const ContractCreateForm = () => null;") } },
  { uid: "orphanQuote", options: { parentId: "gone", ...js("const QuotationCreateForm = () => null;") } },
  { uid: "loop", options: { parentId: "loop", ...js("const QuotationCreateForm = () => null;") } },
  { uid: "other", options: { parentId: "page", ...js("ctx.render(null)") } },
  { uid: "noSteps", options: { parentId: "page" } },
];
const { targets, orphans } = planTargets(models);
assert.deepEqual(targets.map((t) => `${t.uid}:${t.form}`).sort(), ["caseBlock:Case", "contractBlock:Contract"]);
assert.deepEqual(orphans.map((t) => t.uid).sort(), ["loop", "orphanQuote"], "Review Focus 5: orphans are skipped");
const before = js("old");
const after = withCode({ ...before, parentId: "p" }, "new");
assert.equal(after.stepParams.jsSettings.runJs.code, "new");
assert.equal(after.parentId, "p");
assert.equal(before.stepParams.jsSettings.runJs.code, "old", "input not mutated");
console.log("deploy-create-forms: all tests passed");
