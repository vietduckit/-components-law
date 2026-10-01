const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

const file = path.resolve(__dirname, "../../All Module/Task/TaskManagement.js");
const { servicePaymentBadge } = extractMarkedBlock(
  file,
  "// ---- service payment badge (pure; tested by scripts/tests/service-payment-badge.test.js) ----",
  "// ---- end service payment badge ----",
  ["servicePaymentBadge"],
);

const fmt = (n) => `${n}d`;

// already created → actual request amount + status
assert.deepEqual(
  servicePaymentBadge({ allocated: 3037367, lineTotal: 0, pricingMode: "package", request: { requestedAmount: 3037367, status: "active" } }, fmt),
  { text: "Payment Request: 3037367d · active", tone: "created" },
);
// locked amount (Combo pricing) → planned
assert.deepEqual(
  servicePaymentBadge({ allocated: 3037367, lineTotal: 0, pricingMode: "package", request: null }, fmt),
  { text: "Payment Request: 3037367d", tone: "planned" },
);
// line pricing → line total
assert.deepEqual(
  servicePaymentBadge({ allocated: null, lineTotal: 5000000, pricingMode: "line", request: null }, fmt),
  { text: "Payment Request: 5000000d", tone: "planned" },
);
// Combo pricing without a locked amount (older contract) → auto-split note
assert.deepEqual(
  servicePaymentBadge({ allocated: null, lineTotal: 0, pricingMode: "package", request: null }, fmt),
  { text: "Payment Request: share of the package, computed when created", tone: "warn" },
);
// Review fix: a planned amount with no trigger task will never be billed — say so
assert.deepEqual(
  servicePaymentBadge({ allocated: 3037367, lineTotal: 0, pricingMode: "package", request: null, hasTrigger: false }, fmt),
  { text: "Payment Request: 3037367d · no trigger task yet", tone: "warn" },
);
// Combo pricing contract billed per item, service in no item → not billed
assert.deepEqual(servicePaymentBadge({ notBilled: true }, fmt), {
  text: "Not part of any Payment Request item — not billed",
  tone: "warn",
});
// nothing known
assert.equal(servicePaymentBadge({ allocated: 0, lineTotal: 0, pricingMode: "line", request: null }, fmt), null);
assert.equal(servicePaymentBadge(null, fmt), null);

// Combo pricing billing items: a service is "covered" when some Payment
// Request carries its contractService in paymentRequestServices (one request
// per combo / standalone service), and that request is the one to show.
{
  const { itemPaymentRequestFor } = extractMarkedBlock(
    file,
    "// ---- item payment request lookup (pure; tested by scripts/tests/service-payment-badge.test.js) ----",
    "// ---- end item payment request lookup ----",
    ["itemPaymentRequestFor"],
  );
  const maps = {
    contractServiceIdByProjectServiceId: { 11: 501, 12: 502, 13: 503 },
    paymentRequestServiceIdsByPrId: { 900: [501, 502], 901: [999] },
    linkablePaymentRequests: [
      { id: 900, title: "Combo A - CT1", requestedAmount: 21428571, status: "pending" },
      { id: 901, title: "Other", requestedAmount: 1, status: "pending" },
    ],
  };
  assert.equal(itemPaymentRequestFor(11, maps).id, 900);
  assert.equal(itemPaymentRequestFor("12", maps).id, 900);
  assert.equal(itemPaymentRequestFor(13, maps), null, "service not in any item");
  assert.equal(itemPaymentRequestFor(null, maps), null);
  assert.equal(itemPaymentRequestFor(11, {}), null);
}

// Wiring
{
  const src = fs.readFileSync(file, "utf8");
  assert.ok(/const coveredByItem =/.test(src), "TriggerCell switches to the item picker for covered services");
  assert.ok(/const paymentBadge = servicePaymentBadge\(/.test(src), "ServiceSection renders the badge");
  assert.ok(/itemPaymentRequestFor\(extractId\(ps\?\.id\)/.test(src), "badge prefers the item's request (Combo pricing)");
  assert.ok(/paymentInfo: servicePaymentInfoByPsId\?\.\[/.test(src), "ListView passes paymentInfo per service");
  assert.ok(/"paymentAllocatedAmount"/.test(src), "loads paymentAllocatedAmount");
}

console.log("service-payment-badge: all tests passed");
