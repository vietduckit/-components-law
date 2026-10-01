const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// Retainer contract form (2026-09-29): the billing plan must exist after the
// contract is created — its periods become the payment schedule
// (pgsql/finance_retainer_schedule.sql) shown on the Case Finance tab. NocoBase
// drops the nested billingPlans silently without contracts.billingPlans, so
// the form checks and creates the plan itself when it is missing.
const root = path.resolve(__dirname, "../..");
const src = fs.readFileSync(path.join(root, "All Module/Contract/ContractCreateForm.js"), "utf8");

const create = src.indexOf('url: "contracts:create"');
const ensure = src.indexOf("await ensureRetainerBillingPlan(contractId");
assert.ok(create > 0 && ensure > create, "the plan is checked right after the contract is created");
assert.ok(/if \(isRetainer && payload\.billingPlans\?\.length\)/.test(src), "retainer contracts only");
const helper = src.slice(src.indexOf("const ensureRetainerBillingPlan"), src.indexOf("const ensureRetainerBillingPlan") + 1500);
assert.ok(helper.includes('url: "contractBillingPlans:list"'), "looks for the contract's plan");
assert.ok(helper.includes('url: "contractBillingPlans:create"'), "creates it when missing");
assert.ok(/contractId,\s*\n?\s*contracts: contractId/.test(helper), "linked to the contract");

console.log("retainer-form: all checks passed");
