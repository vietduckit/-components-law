const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

const file = path.resolve(__dirname, "../../All Module/Contract/ContractCreateForm.js");
const h = extractMarkedBlock(
  file,
  "// ---- combo billing helpers (pure; tested by scripts/tests/combo-billing.test.js) ----",
  "// ---- end combo billing helpers ----",
  ["comboGroupKeyOf", "comboBillingItems"],
);

// comboGroupKeyOf — applied combo instance > catalog combo id > combo name > standalone line
assert.equal(h.comboGroupKeyOf({ key: "r1", _comboInstanceId: "inst-9", _comboCatalogId: "5" }), "inst:inst-9");
assert.equal(h.comboGroupKeyOf({ key: "11", comboId: 5 }), "combo:5");
assert.equal(h.comboGroupKeyOf({ key: "12", comboName: "Combo testing 2" }), "comboname:Combo testing 2");
assert.equal(h.comboGroupKeyOf({ key: "13" }), "svc:13");
// Review fix 1: a row added into a persisted combo section (Case/Quotation
// combo) carries _comboInstanceId "persisted-id-X" / "persisted-name-X" — it
// must join that combo's item, not form a second one.
assert.equal(h.comboGroupKeyOf({ key: "r9", _comboInstanceId: "persisted-id-5" }), "combo:5");
assert.equal(h.comboGroupKeyOf({ key: "r9", _comboInstanceId: "persisted-name-Licences" }), "comboname:Licences");
{
  const items = h.comboBillingItems([
    { key: "11", name: "Wine", comboId: 5, comboName: "Licences", weight: 0, comboWeight: 30000000 },
    { key: "r9", name: "Extra", _comboInstanceId: "persisted-id-5", _comboName: "Licences", weight: 0, comboWeight: 0 },
  ]);
  assert.deepEqual(items.map((it) => [it.key, it.serviceKeys, it.weight]), [["combo:5", ["11", "r9"], 30000000]]);
}

// comboBillingItems — one item per combo + one per standalone service, in first-seen order
{
  const lines = [
    { key: "11", name: "Wine licence", comboId: 5, comboName: "Licences", weight: 200, comboWeight: 30000000 },
    { key: "fdi", name: "FDI company", weight: 11500000 },
    { key: "12", name: "Tobacco", comboId: 5, comboName: "Licences", weight: 500, comboWeight: 30000000 },
    { key: "r1", name: "A", _comboInstanceId: "inst-9", _comboName: "Combo B", weight: 0, comboWeight: 40000000 },
    { key: "r2", name: "B", _comboInstanceId: "inst-9", _comboName: "Combo B", weight: 0, comboWeight: 0 },
  ];
  const items = h.comboBillingItems(lines);
  assert.deepEqual(
    items.map((it) => [it.key, it.name, it.serviceKeys, it.weight, it.isCombo]),
    [
      ["combo:5", "Licences", ["11", "12"], 30000000, true],
      ["svc:fdi", "FDI company", ["fdi"], 11500000, false],
      ["inst:inst-9", "Combo B", ["r1", "r2"], 40000000, true],
    ],
  );
}
// combo without its own price → sum of its services' reference prices
{
  const items = h.comboBillingItems([
    { key: "a", name: "A", comboName: "X", weight: 100, comboWeight: 0 },
    { key: "b", name: "B", comboName: "X", weight: 300 },
  ]);
  assert.deepEqual(items.map((it) => [it.key, it.weight]), [["comboname:X", 400]]);
}
assert.deepEqual(h.comboBillingItems([]), []);

// Wiring
{
  const src = fs.readFileSync(file, "utf8");
  assert.ok(/comboBillingActive/.test(src), "combo billing mode exists");
  const submit = src.slice(src.indexOf("const handleSubmit = async () => {"));
  assert.ok(/comboInstallments/.test(submit), "submit builds one schedule row per combo/standalone item");
  assert.ok(!/writeLockedAmountsToCase\(/.test(submit), "per-service locked amounts replaced by per-item billing");
}

console.log("combo-billing: all tests passed");
