const assert = require("node:assert/strict");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

const file = path.resolve(__dirname, "../../JsField/JsColumnServiceCompanies.js");
const { idKey, hasCompanyIds, serviceCompanies } = extractMarkedBlock(
  file,
  "// ---- service companies (pure; tested by scripts/tests/js-column-service-companies.test.js) ----",
  "// ---- end service companies ----",
  ["idKey", "hasCompanyIds", "serviceCompanies"],
);

// snowflake ids stay exact strings (number or string input, or {id})
assert.equal(idKey(1789372637809011), "1789372637809011");
assert.equal(idKey("1789372637809011"), "1789372637809011");
assert.equal(idKey({ id: 1789372637809011 }), "1789372637809011");
assert.equal(idKey(null), null);
assert.equal(idKey(""), null);
assert.equal(idKey({}), null);

// the row only has ids (association not appended) → must fetch
assert.equal(hasCompanyIds([1, 2]), false);
assert.equal(hasCompanyIds([{ id: 1 }]), false);
// appended objects carry the foreign key (null is still "known")
assert.equal(hasCompanyIds([{ id: 1, internalCompanyId: 7 }, { id: 2, internalCompanyId: null }]), true);
assert.equal(hasCompanyIds([]), true);
assert.equal(hasCompanyIds(undefined), true);

const companyById = {
  7: { id: 7, name: "Công ty Luật TNHH CBI", shortName: "CBI" },
  8: { id: 8, name: "Samset Law Firm", shortName: "" },
};

// one tag per company, deduped, shortName first, full name kept for the tooltip
assert.deepEqual(
  serviceCompanies(
    [
      { id: 1, internalCompanyId: 7 },
      { id: 2, internalCompanyId: "7" },
      { id: 3, internalCompanyId: 8 },
    ],
    companyById,
  ),
  [
    { key: "7", label: "CBI", fullName: "Công ty Luật TNHH CBI" },
    { key: "8", label: "Samset Law Firm", fullName: "Samset Law Firm" },
  ],
);

// an appended internalCompany object wins over the lookup map
assert.deepEqual(
  serviceCompanies([{ id: 1, internalCompanyId: 9, internalCompany: { id: 9, name: "ABC Legal", shortName: "ABC" } }], companyById),
  [{ key: "9", label: "ABC", fullName: "ABC Legal" }],
);

// no company / unknown (deleted) company → no bare #id tag
assert.deepEqual(serviceCompanies([{ id: 1, internalCompanyId: null }, { id: 2, internalCompanyId: 404 }], companyById), []);
assert.deepEqual(serviceCompanies(null, companyById), []);

console.log("js-column-service-companies: ok");
