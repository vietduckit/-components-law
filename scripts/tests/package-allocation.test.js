const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

const file = path.resolve(__dirname, "../../All Module/Contract/ContractCreateForm.js");
const h = extractMarkedBlock(
  file,
  "// ---- package allocation helpers (pure; tested by scripts/tests/package-allocation.test.js) ----",
  "// ---- end package allocation helpers ----",
  ["suggestPackageAllocation", "allocationStatus", "allocationWarnings", "allocateWithOverrides"],
);

// suggestPackageAllocation — pro-rata by weight, whole units, remainder on the last weighted line
{
  // CT29092026-like: combo lines weighted by their price in the combo, others by catalog price
  const entries = [
    { key: "fdi", weight: 11500000 },
    { key: "extend", weight: 3000000 },
    { key: "wine", weight: 5000000 },
    { key: "tobacco", weight: 5000000 },
    { key: "food", weight: 5000000 },
  ];
  const out = h.suggestPackageAllocation(entries, 16200000);
  assert.equal(Object.values(out).reduce((s, v) => s + v, 0), 16200000, "sums to the pool");
  Object.values(out).forEach((v) => assert.equal(v, Math.round(v), "whole units"));
  assert.equal(out.fdi, Math.round((16200000 * 11500000) / 29500000));
  assert.ok(Math.abs(out.food - (16200000 * 5000000) / 29500000) < 5, "remainder lands on the last line");
}
// zero-weight lines get 0 (no price reference); the rest still sum to the pool
{
  const out = h.suggestPackageAllocation(
    [{ key: "a", weight: 100 }, { key: "b", weight: 0 }, { key: "c", weight: 300 }],
    1000,
  );
  assert.deepEqual(out, { a: 250, b: 0, c: 750 });
}
// no weights at all → equal split, remainder on the last line
assert.deepEqual(
  h.suggestPackageAllocation([{ key: "a", weight: 0 }, { key: "b" }, { key: "c", weight: null }], 1000),
  { a: 333, b: 333, c: 334 },
);
// nothing to split
assert.deepEqual(h.suggestPackageAllocation([{ key: "a", weight: 5 }], 0), { a: 0 });
assert.deepEqual(h.suggestPackageAllocation([], 1000), {});

// allocationStatus — must equal the rounded pool exactly
{
  assert.deepEqual(h.allocationStatus({ a: 600, b: "400" }, ["a", "b"], 1000), { sum: 1000, pool: 1000, diff: 0, ok: true });
  assert.deepEqual(h.allocationStatus({ a: 600, b: 300 }, ["a", "b"], 1000), { sum: 900, pool: 1000, diff: -100, ok: false });
  assert.equal(h.allocationStatus({ a: 1000, zombie: 5 }, ["a"], 1000).ok, true, "only current lines count");
  assert.equal(h.allocationStatus({}, [], 1000).ok, false, "no lines → not ok");
}

// allocationWarnings — no price reference / unusually small (< 0.5% of the pool)
{
  const w = h.allocationWarnings(
    [{ key: "a", weight: 100 }, { key: "b", weight: 0 }, { key: "c", weight: 5 }],
    { a: 16150000, b: 0, c: 50000 },
    16200000,
  );
  assert.deepEqual(w, { b: "noReference", c: "small" });
}

// Review fixes: a hand-entered amount clears "noReference"; a service not in
// the Case (no projectService, so no tasks) is flagged — its amount can never
// be billed automatically.
{
  const w = h.allocationWarnings(
    [
      { key: "a", weight: 0 },
      { key: "b", weight: 0 },
      { key: "c", weight: 100, notInCase: true },
    ],
    { a: 5000000, b: 0, c: 1000000 },
    16200000,
  );
  assert.deepEqual(w, { b: "noReference", c: "notInCase" });
}
// Review fix (per-item): an item with a price reference but amount 0 is
// flagged — no Payment Request will be created for it.
assert.deepEqual(h.allocationWarnings([{ key: "x", weight: 100 }], { x: 0 }, 1000), { x: "zero" });

// Wiring
{
  const src = fs.readFileSync(file, "utf8");
  const submit = src.slice(src.indexOf("const handleSubmit = async () => {"));
  // 2026-09-25 redesign: Combo pricing bills per item (combo / standalone
  // service) through schedule rows — amounts come from the allocation, the
  // same blocking rules apply.
  assert.ok(/allocationPool <= 0/.test(submit), "blocks when there is no Total amount to split");
  assert.ok(/allocationStatus\(/.test(submit), "submit checks the allocation");
  assert.ok(/amount: packageAmounts\[item\.key\] \|\| 0/.test(submit), "each item's schedule row uses its allocated amount");
}

// Per-item redesign: per-service locked amounts are no longer carried to the Case
{
  const caseSrc = fs.readFileSync(path.resolve(__dirname, "../../All Module/Case/CaseCreateForm.js"), "utf8");
  assert.ok(!/_paymentAllocatedAmount/.test(caseSrc), "CaseCreateForm no longer copies per-service amounts");
}

// allocateWithOverrides (2026-09-25): amounts typed by hand stay; the items not
// edited share what's left of the pool (pro-rata by weight, remainder on the
// last) — so editing one item re-balances the others instead of leaving the
// allocation off by the difference.
{
  const entries = [
    { key: "a", weight: 62823600 },
    { key: "b", weight: 15000000 },
    { key: "c", weight: 5000000 },
  ];
  const pool = 84049488;
  // nothing typed → same as the suggestion
  assert.deepEqual(h.allocateWithOverrides(entries, pool, {}), h.suggestPackageAllocation(entries, pool));
  // one typed → the others split the rest by weight, total exact
  const one = h.allocateWithOverrides(entries, pool, { a: "50000000" });
  assert.equal(one.a, 50000000, "typed amount kept");
  assert.equal(one.b + one.c, pool - 50000000, "the rest goes to the untouched items");
  assert.equal(one.b, Math.round(((pool - 50000000) * 15000000) / 20000000));
  assert.equal(one.a + one.b + one.c, pool, "adds up to the Total amount");
  // all but one typed → the last takes exactly the remainder
  const two = h.allocateWithOverrides(entries, pool, { a: "50000000", b: "20000000" });
  assert.equal(two.c, pool - 70000000);
  // typed amounts exceed the pool → the untouched ones get 0 (status shows the overrun)
  const over = h.allocateWithOverrides(entries, pool, { a: "90000000" });
  assert.deepEqual([over.b, over.c], [0, 0]);
  // everything typed → exactly what was typed ("" counts as 0)
  assert.deepEqual(h.allocateWithOverrides(entries, pool, { a: "1", b: "", c: "3" }), { a: 1, b: 0, c: 3 });
  // untouched items without a price reference split the rest equally
  const noRef = h.allocateWithOverrides(
    [{ key: "a", weight: 10 }, { key: "b", weight: 0 }, { key: "c", weight: 0 }],
    1000,
    { a: "400" },
  );
  assert.deepEqual(noRef, { a: 400, b: 300, c: 300 });

  const src = fs.readFileSync(file, "utf8");
  assert.ok(
    /const packageAmounts = allocateWithOverrides\(allocationEntries, allocationPool, allocationOverrides\)/.test(src),
    "the popup amounts re-balance around typed values",
  );
}

console.log("package-allocation: all tests passed");
