const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { parse } = require("@babel/parser");

// docs/superpowers/specs/2026-09-30-create-forms-ui-money-unification-design.md §5:
// every string on the create forms is English; comments are not UI.
const root = path.resolve(__dirname, "../..");
const VN = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const ALLOWED = new Set(["làm mới", "tải lại"]); // Refresh-button match strings, never displayed
const FORMS = [
  "All Module/Case/CaseCreateForm.js",
  "All Module/Contract/ContractCreateForm.js",
  "All Module/Quotation/QuotationCreateForm.js",
];
// 2026-10-01: labels are tr("English") with a VI dictionary (i18n-blocks.test.js);
// the dictionary is the one place Vietnamese text may appear (blanked, lines kept).
const { MARK_START, MARK_END } = require("../i18n/ui-strings");
const withoutDictionary = (src) => {
  const a = src.indexOf(MARK_START);
  const b = src.indexOf(MARK_END);
  if (a < 0 || b < a) return src;
  return src.slice(0, a) + src.slice(a, b).replace(/[^\n]/g, " ") + src.slice(b);
};
for (const rel of FORMS) {
  const src = withoutDictionary(fs.readFileSync(path.join(root, rel), "utf8"));
  const ast = parse(src, { sourceType: "script", allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true, plugins: ["jsx"], errorRecovery: true });
  const bad = [];
  const visit = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "StringLiteral" && VN.test(node.value) && !ALLOWED.has(node.value)) bad.push(`${node.loc.start.line}: ${node.value.slice(0, 60)}`);
    if (node.type === "TemplateElement" && VN.test(node.value.cooked || "")) bad.push(`${node.loc.start.line}: \`${(node.value.cooked || "").slice(0, 60)}`);
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "leadingComments" || key === "trailingComments" || key === "innerComments") continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === "string") visit(v);
    }
  };
  visit(ast.program);
  assert.deepEqual(bad, [], `${rel}: Vietnamese UI text\n${bad.join("\n")}`);
}
// the Contract guide documents current fields only
// (the help object and the guide panel; comments elsewhere may name old fields)
const contract = fs.readFileSync(path.join(root, FORMS[1]), "utf8");
const guide = contract.slice(contract.indexOf("const FIELD_HELP = {"), contract.indexOf("const focus = (e) =>")) +
  contract.slice(contract.indexOf("const TutorialPanel = ("), contract.indexOf("const makeIcon = ("));
assert.ok(guide.length > 1000, "Contract help and guide found");
["Fee model", "Hourly rate", "Estimated hours", "Success fee", "Fixed amount"].forEach((s) =>
  assert.ok(!guide.includes(s), `Contract still documents ${s}`));
console.log("create-forms-english: all tests passed");
