# Money Flow Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The database becomes the single place that computes every stored money number of a service line and of its document, with frozen exchange rates, exact splits and a per-service money trail from quotation to payment.

**Architecture:** Postgres triggers on `quotationServices` / `contractServices` / `projectServices` compute native and VND amounts from the line's inputs and a rate frozen per document; header triggers derive document totals from the lines; SQL functions and views allocate Finance money (requests, invoices, payments) to services on read. The JS blocks keep previewing, using the same rules (shared test cases), and get decimal-aware price inputs.

**Tech Stack:** PostgreSQL (plpgsql, run by the user in pgAdmin), NocoBase JS Blocks (single-file, no imports), Node test scripts (`node:assert`), local Postgres harness `scripts/tests/sql/run-local.sh`.

**Spec:** `docs/superpowers/specs/2026-09-29-money-flow-unification-design.md`

## Global Constraints

- `subTotal` / `vatAmount` / `totalAmount` are VND in every table (INV-1). Native amounts go in `subTotalNative` / `vatAmountNative` / `totalAmountNative`.
- VND rounds to whole đồng; a foreign currency to its `decimalPlaces` (NULL → 0 for the base currency, 2 otherwise).
- Business dates are Vietnam dates (`Asia/Ho_Chi_Minh`), in SQL and JS alike.
- Finance (payment requests, invoices, payments) stays in VND; no schema change there.
- Every SQL file is idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP TRIGGER IF EXISTS`) and runs as-is in pgAdmin.
- SQL tests: `BEGIN; … ROLLBACK;`, print `ALL … PASSED`, use their own id range, and the same file must run on dev (`psql -f` / pgAdmin) and locally (`bash scripts/tests/sql/run-local.sh <file>`). Test currencies use made-up codes (XTU, XTS, XTC) so a test never depends on the real rates of the database.
- JS Blocks stay single-file with no `import`/`require`. Pure helpers live between `// ---- <name> helpers (pure; tested by scripts/tests/<file>) ----` / `// ---- end <name> helpers ----` markers and are tested with `scripts/tests/extract-marked-block.js`.
- `All Module/Case/CaseCreateForm.js` uses CRLF line endings — keep them.
- Never write a file whose content contains `$` through an inline `bash -c` / `node -e` string (bash expands `$eq`, `$f$`): use the Write/Edit tools.
- The assistant does not commit. Each task ends with a **Commit (by the user)** step listing the files; the user commits.
- Do not change Task Management code.

## Review Focus

1. **A line saved twice in one request** (NocoBase creates the row, then updates it re-sending the client's own rate and totals) — the frozen rate and the DB totals must survive. Pinned in Task 2 (client-sent rate ignored).
2. **A case line whose currency differs from its contract line** — it must not inherit the contract rate. Pinned in Task 2.
3. **A document mixing priced lines with older unpriced rows (no `basePrice`)** — its header must be left alone, not re-summed without the old rows. Pinned in Task 3.
4. **A rate stamped late in the UTC day** (e.g. `2026-09-01T20:00Z`, which is 2 Sep in Vietnam) — JS and SQL must pick the same rate. Pinned in the shared cases (Task 1 SQL, Task 11 JS).
5. **Removing the last service of a document** — its totals must drop to 0, not keep the old sum. Pinned in Task 3.

## Deviations from the spec (decided while planning — please review)

- **§10 "stop copying the contract total into `projects`":** seven JS call sites write `projects:update` with totals. Instead of editing each, the `projects` header trigger (Task 3) overrides `totalAmount` whenever the case has priced line-mode services, so those writes become harmless. *Cost if wrong: a case with only combo services still shows the JS-copied total.*
- **§10 "Services blocks display stored values":** CaseServices already reads the frozen rate. ContractServices / QuotationServices keep computing, but with the same pricing date (Task 11) and the same rate selection as the DB (Task 11), so they show the same numbers. *Cost if wrong: they differ only after a reference rate is edited retroactively.*
- **Rows without `basePrice`** (older rows, placeholders) are not computed by the trigger, and a document containing any of them keeps its JS totals. *Cost if wrong: such documents keep their old numbers until re-saved with prices.*
- **§7.5 "Σ case totals of a contract = Σ its contract lines"** is audited per line: a case line and its contract line (same currency, same price and VAT) must have the same VND. A case may legitimately hold more services than its contract, so the per-contract sum would give false alarms.
- **§9 backfill** skips *every* line of an already-billed contract (not only the ones whose VND would change); the preview lists them for a manual decision. It also skips lines whose currency has no rate at all (listed as `missing rate`).

---

## File Structure

| File | Responsibility |
|---|---|
| `pgsql/money_flow_foundation.sql` (new) | Columns, base currency, arithmetic (`money_split`, `money_line_amounts`), rate lookup, line triggers, header triggers, re-freeze on signing, installment amounts, legacy preview view and backfill function |
| `pgsql/money_flow_trail.sql` (new) | Per-service contract values, allocation functions, allocation views, `finance_service_money_trail`, retainer / unallocated views, `money_consistency_violations` |
| `pgsql/money_flow_backfill_preview.sql` (new) | `SELECT * FROM money_backfill_preview` (read-only) |
| `pgsql/money_flow_backfill.sql` (new) | `SELECT * FROM money_backfill_run()` (writes; run after the user approves the preview) |
| `pgsql/money_consistency_audit.sql` (new) | `SELECT * FROM money_consistency_violations` (read-only) |
| `pgsql/tests/money_flow_test.sql` (new) | Sections A–E: base currency, line trigger, headers, signing, installments |
| `pgsql/tests/money_cases_test.sql` (new, generated) | Shared cases: line amounts, splits, rates |
| `pgsql/tests/money_trail_test.sql` (new) | Allocation, trail, audit = 0 rows |
| `pgsql/tests/money_backfill_test.sql` (new) | Preview + backfill on legacy rows |
| `pgsql/tests/fixtures/finance_min_schema.sql` (modify) | Tables and columns the new SQL reads |
| `scripts/tests/sql/run-local.sh` (modify) | Load the two new SQL files |
| `scripts/tests/fixtures/money-cases.json` (new) | Shared JS / SQL cases |
| `scripts/tests/sql/gen-money-cases.js` (new) | Generates `money_cases_test.sql` from the JSON |
| `scripts/tests/money-cases.test.js` (new) | JSON ↔ generated SQL in sync; JS preview against the same cases |
| `JsField/RegisterMoneyFlowFields.js` (new) + `scripts/tests/money-flow-fields.test.js` (new) | NocoBase field registration |
| `All Module/Contract/ContractCreateForm.js` (modify) | `splitLargestRemainder`, installments by largest remainder, decimal-aware `MoneyInput`, 2-decimal display, rate lookup |
| `All Module/Quotation/QuotationCreateForm.js` (modify) | Decimal-aware `PriceInput`, 2-decimal display, rate lookup, pricing date = today |
| `All Module/Case/CaseCreateForm.js` (modify) | 2-decimal display, rate lookup |
| `All Module/{Contract/ContractServices,Quotation/QuotationServices,Case/CaseServices,Contract/ContractDetailView}.js` (modify) | Rate lookup; pricing dates |
| `scripts/tests/money-input.test.js`, `scripts/tests/rate-lookup.test.js` (new) | JS checks |
| `CURRENCY_LOGIC_SRS.md` (modify) | Pointer to the new spec |

Run every node test with:
`for f in scripts/tests/*.test.js; do node "$f" || exit 1; done`

---

### Task 1: Harness, shared cases, columns and pure money functions

**Files:**
- Modify: `pgsql/tests/fixtures/finance_min_schema.sql`
- Modify: `scripts/tests/sql/run-local.sh`
- Create: `scripts/tests/fixtures/money-cases.json`
- Create: `scripts/tests/sql/gen-money-cases.js`
- Create: `scripts/tests/money-cases.test.js`
- Create: `pgsql/tests/money_cases_test.sql` (generated)
- Create: `pgsql/tests/money_flow_test.sql` (section A)
- Create: `pgsql/money_flow_foundation.sql` (sections 1–4)
- Create: `pgsql/money_flow_trail.sql` (header only, filled in Task 7)

**Interfaces:**
- Produces (SQL):
  - `money_base_currency_id() → bigint`
  - `money_is_base(bigint) → boolean`
  - `money_decimals(bigint) → integer`
  - `money_currency_code(bigint) → text`
  - `money_local_date(timestamptz) → date`
  - `money_split(p_total numeric, p_weights numeric[], p_decimals integer DEFAULT 0) → numeric[]`
  - `money_line_amounts(p_base_price, p_quantity, p_vat numeric, p_decimals integer, p_rate numeric) → (sub_native, vat_native, total_native, sub_vnd, vat_vnd, total_vnd numeric)`
  - `money_rate_usable(text) → boolean`
  - `money_rate_to_base(p_currency_id bigint, p_on date) → (rate numeric, rate_date date)`
- Produces (Node): `scripts/tests/sql/gen-money-cases.js` exports `{ render(): string, OUTPUT, CASES }`.

- [ ] **Step 1: Extend the fixture** — in `pgsql/tests/fixtures/finance_min_schema.sql`:

  **1a. `contracts` and `projects`:**
  - In `CREATE TABLE contracts (…)`, add `"signedAt" timestamptz,` after `"endDate" timestamptz,`.
  - In `CREATE TABLE projects (…)`, add `"quotationId" bigint, "totalAmount" double precision,` after `"projectName" varchar(255),`.

  **1b. `projectServices` and `contractServices`:** replace their two `CREATE TABLE` statements with:

```sql
CREATE TABLE "projectServices" (
  id bigint PRIMARY KEY, "projectId" bigint, "serviceId" bigint, "serviceName" varchar(255),
  "quotationServiceId" bigint, "basePrice" double precision, vat double precision, "currencyId" bigint,
  "subTotal" double precision, "vatAmount" double precision, "totalAmount" double precision,
  "pricingMode" varchar(255), "packageSubTotal" double precision, "packageVatAmount" double precision,
  "packageTotalAmount" double precision, status varchar(255),
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "contractServices" (
  id bigint PRIMARY KEY, "contractId" bigint, "projectServiceId" bigint, "quotationServiceId" bigint,
  "projectId" bigint, "serviceName" varchar(255), "basePrice" double precision, quantity double precision,
  vat double precision, "currencyId" bigint, "subTotal" double precision, "vatAmount" double precision,
  "totalAmount" double precision, "pricingMode" varchar(255), "packageSubTotal" double precision,
  "packageVatAmount" double precision, "packageTotalAmount" double precision, "lineStatus" varchar(255),
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
```

  **1c. New tables:** append at the end of the file:

```sql
-- Money flow (pgsql/money_flow_foundation.sql): currencies, rates, quotations.
CREATE TABLE currencies (
  id bigint PRIMARY KEY, code varchar(10) UNIQUE, "decimalPlaces" bigint, "isBaseCurrency" boolean
);
CREATE TABLE "exchangeRates" (
  id bigint PRIMARY KEY, "fromCurrencyId" bigint, "toCurrencyId" bigint, rate double precision,
  "effectiveDate" timestamptz, status varchar(255)
);
CREATE TABLE quotations (
  id bigint PRIMARY KEY, "pricingMode" varchar(255), "subTotal" double precision, "totalAmount" double precision,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "quotationServices" (
  id bigint PRIMARY KEY, "quotationId" bigint, "serviceName" varchar(255), "basePrice" double precision,
  quantity double precision, vat double precision, "currencyId" bigint, "subTotal" double precision,
  "vatAmount" double precision, "totalAmount" double precision, "pricingMode" varchar(255),
  "packageSubTotal" double precision, "packageVatAmount" double precision, "packageTotalAmount" double precision,
  status varchar(255), "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
```

- [ ] **Step 2: Wire the new SQL files into the harness** — in `scripts/tests/sql/run-local.sh`, extend the `for f in …` list: after `finance_notifications.sql` add `money_flow_foundation.sql money_flow_trail.sql`. The last list line becomes:

```bash
         retainer_billing_run_due.sql finance_retainer_schedule.sql finance_members.sql finance_notifications.sql \
         money_flow_foundation.sql money_flow_trail.sql; do
```

- [ ] **Step 3: Write the shared cases** — create `scripts/tests/fixtures/money-cases.json`:

```json
{
  "_comment": "Shared by the JS preview tests (scripts/tests/money-cases.test.js) and the database (pgsql/tests/money_cases_test.sql, generated by scripts/tests/sql/gen-money-cases.js). Edit here, then run: node scripts/tests/sql/gen-money-cases.js",
  "lines": [
    { "name": "10 USD + 8%", "basePrice": 10, "quantity": 1, "vat": 8, "decimals": 2, "rate": 26176.5, "native": [10, 0.8, 10.8], "vnd": [261765, 20941, 282706] },
    { "name": "120.50 USD x 2 + 4%", "basePrice": 120.5, "quantity": 2, "vat": 4, "decimals": 2, "rate": 26176.5, "native": [241, 9.64, 250.64], "vnd": [6308537, 252341, 6560878] },
    { "name": "1000 USD + 8%", "basePrice": 1000, "quantity": 1, "vat": 8, "decimals": 2, "rate": 26176.5, "native": [1000, 80, 1080], "vnd": [26176500, 2094120, 28270620] },
    { "name": "VAT under 5%", "basePrice": 10, "quantity": 1, "vat": 4, "decimals": 2, "rate": 26000, "native": [10, 0.4, 10.4], "vnd": [260000, 10400, 270400] },
    { "name": "200 SGD + 10%", "basePrice": 200, "quantity": 1, "vat": 10, "decimals": 2, "rate": 20480.471317, "native": [200, 20, 220], "vnd": [4096094, 409609, 4505703] },
    { "name": "VND line", "basePrice": 1000000, "quantity": 1, "vat": 8, "decimals": 0, "rate": 1, "native": [1000000, 80000, 1080000], "vnd": [1000000, 80000, 1080000] }
  ],
  "splits": [
    { "total": 10000001, "weights": [30, 30, 40], "decimals": 0, "expected": [3000000, 3000000, 4000001] },
    { "total": 10000000, "weights": [33.33, 33.33, 33.34], "decimals": 0, "expected": [3333000, 3333000, 3334000] },
    { "total": 100, "weights": [1, 1, 1], "decimals": 0, "expected": [34, 33, 33] },
    { "total": 0.1, "weights": [1, 1, 1], "decimals": 2, "expected": [0.04, 0.03, 0.03] },
    { "total": 708480, "weights": [336960, 1080000], "decimals": 0, "expected": [168480, 540000] },
    { "total": 4000000, "weights": [30, 40], "decimals": 0, "expected": [1714286, 2285714] },
    { "total": 5, "weights": [0, 0], "decimals": 0, "expected": [3, 2] }
  ],
  "rates": {
    "currencies": {
      "VND": { "decimals": 0, "base": true },
      "XTU": { "decimals": 2 },
      "XTS": { "decimals": 2 },
      "XTC": { "decimals": 2 }
    },
    "rows": [
      { "from": "XTU", "to": "VND", "rate": 26176.5, "effectiveDate": "2026-08-18T09:18:17Z", "status": null },
      { "from": "XTU", "to": "VND", "rate": 25000, "effectiveDate": "2026-09-01T20:00:00Z", "status": null },
      { "from": "XTU", "to": "VND", "rate": 30000, "effectiveDate": "2026-09-05T03:00:00Z", "status": "inactive" },
      { "from": "XTU", "to": "VND", "rate": 26000, "effectiveDate": "2026-09-10T03:00:00Z", "status": null },
      { "from": "VND", "to": "XTS", "rate": 0.00005, "effectiveDate": "2026-08-18T08:57:57Z", "status": null }
    ],
    "queries": [
      { "currency": "XTU", "on": "2026-09-01", "rate": 26176.5, "rateDate": "2026-08-18" },
      { "currency": "XTU", "on": "2026-09-02", "rate": 25000, "rateDate": "2026-09-02" },
      { "currency": "XTU", "on": "2026-09-07", "rate": 25000, "rateDate": "2026-09-02" },
      { "currency": "XTU", "on": "2026-09-15", "rate": 26000, "rateDate": "2026-09-10" },
      { "currency": "XTU", "on": "2026-08-01", "rate": 26176.5, "rateDate": "2026-08-18" },
      { "currency": "XTS", "on": "2026-09-01", "rate": 20000, "rateDate": "2026-08-18" },
      { "currency": "XTC", "on": "2026-09-01", "rate": null, "rateDate": null }
    ]
  }
}
```

- [ ] **Step 4: Write the generator** — create `scripts/tests/sql/gen-money-cases.js`:

```js
// Generates pgsql/tests/money_cases_test.sql from scripts/tests/fixtures/money-cases.json,
// so the database is checked against exactly the cases the JS preview is
// (docs/superpowers/specs/2026-09-29-money-flow-unification-design.md §7.6).
//   node scripts/tests/sql/gen-money-cases.js
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const CASES = "scripts/tests/fixtures/money-cases.json";
const OUTPUT = "pgsql/tests/money_cases_test.sql";
const ID_BASE = 997900000000000n;

const sqlText = (s) => String(s).replace(/'/g, "''");
const msgText = (s) => sqlText(s).replace(/%/g, "%%");
const numArray = (list) => `ARRAY[${list.join(", ")}]::numeric[]`;

function render() {
  const cases = JSON.parse(fs.readFileSync(path.join(ROOT, CASES), "utf8"));
  const currencies = cases.rates.currencies;
  const testCodes = Object.keys(currencies).filter((code) => !currencies[code].base);
  const idOf = (code) =>
    currencies[code] && currencies[code].base
      ? "money_base_currency_id()"
      : String(ID_BASE + BigInt(testCodes.indexOf(code) + 1));
  const out = [];
  out.push(
    "-- GENERATED by scripts/tests/sql/gen-money-cases.js from",
    `-- ${CASES}: do not edit; edit the JSON and re-run the generator.`,
    "-- The JS preview is tested against the same cases (scripts/tests/money-cases.test.js).",
    "--   bash scripts/tests/sql/run-local.sh pgsql/tests/money_cases_test.sql",
    "-- BEGIN ... ROLLBACK; prints \"ALL MONEY CASES PASSED\". Ids 997900000000001+.",
    "BEGIN;",
    "",
    "INSERT INTO currencies (id, code, \"decimalPlaces\", \"isBaseCurrency\")",
    "SELECT 997900000000099, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');",
  );
  testCodes.forEach((code) => {
    out.push(
      `INSERT INTO currencies (id, code, "decimalPlaces") VALUES (${idOf(code)}, '${sqlText(code)}', ${currencies[code].decimals});`,
    );
  });
  cases.rates.rows.forEach((row, index) => {
    out.push(
      `INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status) VALUES (` +
        `${ID_BASE + 100n + BigInt(index)}, ${idOf(row.from)}, ${idOf(row.to)}, ${row.rate}, '${row.effectiveDate}', ` +
        `${row.status === null ? "NULL" : `'${sqlText(row.status)}'`});`,
    );
  });
  out.push("");
  cases.lines.forEach((c) => {
    out.push(
      "DO $$ DECLARE a RECORD; BEGIN",
      `  SELECT * INTO a FROM money_line_amounts(${c.basePrice}, ${c.quantity}, ${c.vat}, ${c.decimals}, ${c.rate});`,
      "  IF (a.sub_native, a.vat_native, a.total_native, a.sub_vnd, a.vat_vnd, a.total_vnd) IS DISTINCT FROM",
      `     (${[...c.native, ...c.vnd].map((n) => `${n}::numeric`).join(", ")}) THEN`,
      `    RAISE EXCEPTION 'FAIL line "${msgText(c.name)}": got %', a;`,
      "  END IF;",
      "END $$;",
    );
  });
  cases.splits.forEach((c) => {
    const call = `money_split(${c.total}, ${numArray(c.weights)}, ${c.decimals})`;
    out.push(
      "DO $$ BEGIN",
      `  IF ${call} IS DISTINCT FROM ${numArray(c.expected)} THEN`,
      `    RAISE EXCEPTION 'FAIL split ${c.total} by ${c.weights.join("/")}: got %', ${call};`,
      "  END IF;",
      "END $$;",
    );
  });
  cases.rates.queries.forEach((q) => {
    const expectRate = q.rate === null ? "r.rate IS NOT NULL" : `r.rate IS DISTINCT FROM ${q.rate}::numeric`;
    const expectDate = q.rateDate === null ? "false" : `r.rate_date IS DISTINCT FROM DATE '${q.rateDate}'`;
    out.push(
      "DO $$ DECLARE r RECORD; BEGIN",
      `  SELECT * INTO r FROM money_rate_to_base(${idOf(q.currency)}, DATE '${q.on}');`,
      `  IF ${expectRate} OR ${expectDate} THEN`,
      `    RAISE EXCEPTION 'FAIL rate ${q.currency} on ${q.on}: got %, %', r.rate, r.rate_date;`,
      "  END IF;",
      "END $$;",
    );
  });
  out.push("", "DO $$ BEGIN RAISE NOTICE 'ALL MONEY CASES PASSED'; END $$;", "ROLLBACK;");
  return `${out.join("\n")}\n`;
}

if (require.main === module) {
  fs.writeFileSync(path.join(ROOT, OUTPUT), render());
  console.log(`wrote ${OUTPUT}`);
}

module.exports = { render, OUTPUT, CASES };
```

- [ ] **Step 5: Write the sync test** — create `scripts/tests/money-cases.test.js`:

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { render, OUTPUT } = require("./sql/gen-money-cases");

// 2026-09-29: one set of money cases for the JS preview and for the database
// (docs/superpowers/specs/2026-09-29-money-flow-unification-design.md §7.6).
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

assert.equal(read(OUTPUT), render(), `${OUTPUT} is stale: run node scripts/tests/sql/gen-money-cases.js`);

console.log("money-cases: all tests passed");
```

- [ ] **Step 6: Generate the SQL cases and watch the sync test pass**

  Run `node scripts/tests/sql/gen-money-cases.js && node scripts/tests/money-cases.test.js`.
  Expected: `wrote pgsql/tests/money_cases_test.sql`, then `money-cases: all tests passed`.

- [ ] **Step 7: Write the base-currency test (section A)** — create `pgsql/tests/money_flow_test.sql`:

```sql
-- ============================================================
-- Self-checking test: the database computes service-line money
-- (pgsql/money_flow_foundation.sql). BEGIN ... ROLLBACK; prints
-- "ALL MONEY FLOW CHECKS PASSED". Ids 998000000000001+.
--   psql ... -f pgsql/tests/money_flow_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/money_flow_test.sql
-- Test currencies use made-up codes (XTU, XTS, XTC), so the test never
-- depends on the real USD / SGD rates of the database it runs on.
-- ============================================================
BEGIN;

INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998000000000001, 'VND', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency") VALUES
  (998000000000002, 'XTU', 2, NULL),
  (998000000000003, 'XTS', 2, NULL),
  (998000000000004, 'XTC', 2, NULL);
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status) VALUES
  (998000000000011, 998000000000002, money_base_currency_id(), 26176.5, '2026-08-18T09:18:17Z', NULL),
  (998000000000012, 998000000000002, money_base_currency_id(), 26000, '2026-09-10T03:00:00Z', NULL),
  (998000000000013, money_base_currency_id(), 998000000000003, 0.00005, '2026-08-18T08:57:57Z', NULL);

-- ---- A. the base currency (VND found by flag, else by code) ----
DO $$
DECLARE v_base bigint := money_base_currency_id();
BEGIN
  IF v_base IS NULL OR (SELECT upper(code) FROM currencies WHERE id = v_base) <> 'VND' THEN
    RAISE EXCEPTION 'FAIL: the base currency is VND';
  END IF;
  IF money_decimals(v_base) <> 0 OR money_decimals(NULL) <> 0 OR money_decimals(998000000000002) <> 2 THEN
    RAISE EXCEPTION 'FAIL: VND rounds to whole dong, XTU to cents';
  END IF;
  IF NOT money_is_base(NULL) OR money_is_base(998000000000002) THEN
    RAISE EXCEPTION 'FAIL: a line without a currency is in VND';
  END IF;
  IF money_currency_code(998000000000002) <> 'XTU' OR money_currency_code(NULL) <> 'VND' THEN
    RAISE EXCEPTION 'FAIL: currency codes';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL MONEY FLOW CHECKS PASSED'; END $$;
ROLLBACK;
```

  Later tasks insert their sections **before** the final `DO $$ BEGIN RAISE NOTICE` line.

- [ ] **Step 8: Run both SQL tests to see them fail**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_cases_test.sql pgsql/tests/money_flow_test.sql`.
  Expected: an error such as `function money_line_amounts(...) does not exist` or `function money_base_currency_id() does not exist`.

- [ ] **Step 9: Write the foundation, sections 1–4** — create `pgsql/money_flow_foundation.sql`:

```sql
-- ============================================================
-- Money flow foundation (2026-09-29)
-- Spec: docs/superpowers/specs/2026-09-29-money-flow-unification-design.md
-- Plan: docs/superpowers/plans/2026-09-29-money-flow-unification.md
--
-- The database computes every stored money number of a service line
-- (quotationServices / contractServices / projectServices) from its inputs
-- (basePrice, quantity, vat, currencyId) and the exchange rate frozen for its
-- document, and derives each document's totals from its lines.
-- subTotal / vatAmount / totalAmount stay VND everywhere (INV-1); the line's
-- own-currency amounts go in *Native columns.
-- Requires pgsql/contract_payment_status_workflow.sql (finance_is_received,
-- contract_resolved_total, contract_recompute_outstanding_for).
-- Idempotent.
-- ============================================================

-- ---- 1. Columns (registered as NocoBase fields by JsField/RegisterMoneyFlowFields.js)
ALTER TABLE "quotationServices"
  ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateDate" date,
  ADD COLUMN IF NOT EXISTS "subTotalNative" double precision,
  ADD COLUMN IF NOT EXISTS "vatAmountNative" double precision,
  ADD COLUMN IF NOT EXISTS "totalAmountNative" double precision;
ALTER TABLE "contractServices"
  ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateDate" date,
  ADD COLUMN IF NOT EXISTS "subTotalNative" double precision,
  ADD COLUMN IF NOT EXISTS "vatAmountNative" double precision,
  ADD COLUMN IF NOT EXISTS "totalAmountNative" double precision;
ALTER TABLE "projectServices"
  ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision,
  ADD COLUMN IF NOT EXISTS "exchangeRateDate" date,
  ADD COLUMN IF NOT EXISTS "subTotalNative" double precision,
  ADD COLUMN IF NOT EXISTS "vatAmountNative" double precision,
  ADD COLUMN IF NOT EXISTS "totalAmountNative" double precision,
  ADD COLUMN IF NOT EXISTS "quotationServiceId" bigint;

-- ---- 2. The base currency: VND, flagged so the database and the JS agree
UPDATE currencies
SET "isBaseCurrency" = true, "decimalPlaces" = COALESCE("decimalPlaces", 0)
WHERE upper(code) = 'VND' AND ("isBaseCurrency" IS NOT TRUE OR "decimalPlaces" IS NULL);

CREATE OR REPLACE FUNCTION public.money_base_currency_id()
RETURNS bigint
LANGUAGE sql
STABLE
AS $f$
  SELECT id FROM currencies
  WHERE "isBaseCurrency" IS TRUE OR upper(code) = 'VND'
  ORDER BY ("isBaseCurrency" IS TRUE) DESC, id
  LIMIT 1;
$f$;

-- A line without a currency is in VND.
CREATE OR REPLACE FUNCTION public.money_is_base(p_currency_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT p_currency_id IS NULL OR p_currency_id = money_base_currency_id();
$f$;

-- VND: whole đồng; another currency: its decimalPlaces, else 2.
CREATE OR REPLACE FUNCTION public.money_decimals(p_currency_id bigint)
RETURNS integer
LANGUAGE sql
STABLE
AS $f$
  SELECT CASE
    WHEN money_is_base(p_currency_id) THEN 0
    ELSE COALESCE((SELECT "decimalPlaces"::integer FROM currencies WHERE id = p_currency_id), 2)
  END;
$f$;

CREATE OR REPLACE FUNCTION public.money_currency_code(p_currency_id bigint)
RETURNS text
LANGUAGE sql
STABLE
AS $f$
  SELECT COALESCE(
    (SELECT upper(code) FROM currencies WHERE id = COALESCE(p_currency_id, money_base_currency_id())),
    'VND');
$f$;

-- Business dates are Vietnam dates.
CREATE OR REPLACE FUNCTION public.money_local_date(p_ts timestamptz)
RETURNS date
LANGUAGE sql
STABLE
AS $f$
  SELECT (p_ts AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
$f$;

-- ---- 3. Arithmetic
-- Splits a total over weights so the parts add up to the total exactly
-- (largest remainder): each part is floored to the unit (1 đồng, or 0.01
-- with p_decimals = 2), then the units left over go to the parts with the
-- largest fractions, ties to the earlier part. All-zero weights split equally.
-- The JS twin is splitLargestRemainder() in ContractCreateForm.js.
CREATE OR REPLACE FUNCTION public.money_split(p_total numeric, p_weights numeric[], p_decimals integer DEFAULT 0)
RETURNS numeric[]
LANGUAGE plpgsql
IMMUTABLE
AS $f$
DECLARE
  n integer := COALESCE(array_length(p_weights, 1), 0);
  v_scale numeric := power(10::numeric, COALESCE(p_decimals, 0));
  v_units numeric := round(COALESCE(p_total, 0) * v_scale);
  v_sign numeric := CASE WHEN COALESCE(p_total, 0) < 0 THEN -1 ELSE 1 END;
  v_wsum numeric := 0;
  v_raw numeric[] := '{}';
  v_out numeric[] := '{}';
  v_left integer;
  r RECORD;
  i integer;
BEGIN
  IF n = 0 THEN
    RETURN v_out;
  END IF;
  v_units := abs(v_units);
  FOR i IN 1..n LOOP
    v_wsum := v_wsum + GREATEST(COALESCE(p_weights[i], 0), 0);
  END LOOP;
  FOR i IN 1..n LOOP
    v_raw[i] := CASE
      WHEN v_wsum > 0 THEN v_units * GREATEST(COALESCE(p_weights[i], 0), 0) / v_wsum
      ELSE v_units / n
    END;
    v_out[i] := floor(v_raw[i]);
  END LOOP;
  v_left := (v_units - (SELECT sum(x) FROM unnest(v_out) AS x))::integer;
  FOR r IN
    SELECT idx FROM generate_series(1, n) AS idx
    ORDER BY v_raw[idx] - v_out[idx] DESC, idx
    LIMIT v_left
  LOOP
    v_out[r.idx] := v_out[r.idx] + 1;
  END LOOP;
  FOR i IN 1..n LOOP
    v_out[i] := v_sign * v_out[i] / v_scale;
  END LOOP;
  RETURN v_out;
END;
$f$;

-- A line's amounts: native ones rounded to the currency's decimals, then VND
-- = native × rate rounded to whole đồng; every total is the sum of its
-- rounded parts. The VND outputs are NULL when p_rate is NULL.
CREATE OR REPLACE FUNCTION public.money_line_amounts(
  p_base_price numeric, p_quantity numeric, p_vat numeric, p_decimals integer, p_rate numeric,
  OUT sub_native numeric, OUT vat_native numeric, OUT total_native numeric,
  OUT sub_vnd numeric, OUT vat_vnd numeric, OUT total_vnd numeric)
LANGUAGE plpgsql
IMMUTABLE
AS $f$
BEGIN
  sub_native := round(COALESCE(p_base_price, 0) * COALESCE(NULLIF(p_quantity, 0), 1), COALESCE(p_decimals, 0));
  vat_native := round(sub_native * COALESCE(p_vat, 0) / 100, COALESCE(p_decimals, 0));
  total_native := sub_native + vat_native;
  IF p_rate IS NULL THEN
    RETURN;
  END IF;
  sub_vnd := round(sub_native * p_rate, 0);
  vat_vnd := round(vat_native * p_rate, 0);
  total_vnd := sub_vnd + vat_vnd;
END;
$f$;

-- ---- 4. Exchange rates (same selection as pickConversionRate() in the JS blocks)
CREATE OR REPLACE FUNCTION public.money_rate_usable(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT lower(btrim(COALESCE(p_status, ''))) NOT IN ('inactive', 'disabled', 'archived', 'cancelled', 'canceled', 'draft');
$f$;

-- VND per 1 unit of p_currency_id on p_on: the latest direct rate on or
-- before that (Vietnam) date, else the latest inverse one (1 / rate); with
-- none on or before it, the earliest direct, then inverse, after it. NULL
-- when the pair has no usable rate at all. Rates carry 15 significant
-- digits (float8 → numeric), exactly as the JS rate15() does.
CREATE OR REPLACE FUNCTION public.money_rate_to_base(p_currency_id bigint, p_on date, OUT rate numeric, OUT rate_date date)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_base bigint := money_base_currency_id();
BEGIN
  IF money_is_base(p_currency_id) THEN
    rate := 1;
    rate_date := p_on;
    RETURN;
  END IF;
  SELECT c.r, c.d INTO rate, rate_date
  FROM (
    SELECT (er.rate::numeric)::double precision::numeric AS r,
           COALESCE(money_local_date(er."effectiveDate"::timestamptz), DATE '1900-01-01') AS d,
           COALESCE(er."effectiveDate"::timestamptz, '-infinity'::timestamptz) AS eff,
           1 AS dir
    FROM "exchangeRates" er
    WHERE er."fromCurrencyId" = p_currency_id AND er."toCurrencyId" = v_base
      AND er.rate > 0 AND money_rate_usable(er.status)
    UNION ALL
    SELECT (1 / er.rate::numeric)::double precision::numeric,
           COALESCE(money_local_date(er."effectiveDate"::timestamptz), DATE '1900-01-01'),
           COALESCE(er."effectiveDate"::timestamptz, '-infinity'::timestamptz),
           2
    FROM "exchangeRates" er
    WHERE er."fromCurrencyId" = v_base AND er."toCurrencyId" = p_currency_id
      AND er.rate > 0 AND money_rate_usable(er.status)
  ) c
  ORDER BY (c.d <= p_on) DESC,
           c.dir,
           CASE WHEN c.d <= p_on THEN c.eff END DESC NULLS LAST,
           c.eff ASC
  LIMIT 1;
END;
$f$;
```

- [ ] **Step 10: Create the trail file header** so the harness can load it — create `pgsql/money_flow_trail.sql`:

```sql
-- ============================================================
-- Money trail (2026-09-29): per-service contract values, Finance money
-- allocated to services, the money trail and the consistency audit.
-- Spec: docs/superpowers/specs/2026-09-29-money-flow-unification-design.md §7.5, §8
-- Requires pgsql/money_flow_foundation.sql and pgsql/finance_foundation.sql.
-- Idempotent; defines only functions and views.
-- ============================================================
```

- [ ] **Step 11: Run the SQL tests to see them pass**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_cases_test.sql pgsql/tests/money_flow_test.sql`.
  Expected: `NOTICE:  ALL MONEY CASES PASSED` and `NOTICE:  ALL MONEY FLOW CHECKS PASSED`.

- [ ] **Step 12: Check that the existing SQL tests still pass with the extended fixture**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/*_test.sql`.
  Expected: every file prints its `ALL … PASSED` notice and nothing fails.

- [ ] **Step 13: Commit (by the user)** — files:
  - `pgsql/tests/fixtures/finance_min_schema.sql`
  - `scripts/tests/sql/run-local.sh`
  - `scripts/tests/fixtures/money-cases.json`
  - `scripts/tests/sql/gen-money-cases.js`
  - `scripts/tests/money-cases.test.js`
  - `pgsql/tests/money_cases_test.sql`
  - `pgsql/tests/money_flow_test.sql`
  - `pgsql/money_flow_foundation.sql`
  - `pgsql/money_flow_trail.sql`

  Message: `feat(pgsql): money flow foundation — columns, base currency, splits, rate lookup`.

---

### Task 2: The line trigger — compute, freeze, inherit

**Files:**
- Modify: `pgsql/money_flow_foundation.sql` (append section 5)
- Modify: `pgsql/tests/money_flow_test.sql` (add section B)

**Interfaces:**
- Consumes: `money_line_amounts`, `money_rate_to_base`, `money_decimals`, `money_currency_code`, `money_local_date`, `money_is_base` (Task 1).
- Produces:
  - `money_line_priced(p_row jsonb) → boolean` — has `basePrice`, not a package line.
  - `money_line_rate(p_table text, p_row jsonb) → (rate numeric, rate_date date)`.
  - Trigger function `money_line_compute()`, as `trg_money_line_compute` (BEFORE INSERT OR UPDATE) on the three line tables.
  - Trigger function `money_line_after()`, as `trg_money_line_after` (AFTER INSERT OR UPDATE OR DELETE) on the three line tables. Task 3 replaces this function.

- [ ] **Step 1: Write section B of the test** — insert before the final `RAISE NOTICE` block of `pgsql/tests/money_flow_test.sql`:

```sql
-- ---- B. service lines: the database computes every amount ----
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES
  (998000000000101, 'line', '2026-09-01T02:00:00Z'),
  (998000000000102, 'package', '2026-09-01T02:00:00Z'),
  (998000000000103, 'line', '2026-09-01T02:00:00Z');
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt")
VALUES (998000000000201, 'MF-1', 'Money flow', 'byCase', 'line', 'draft', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt")
VALUES (998000000000202, 998000000000201, 'in_progress', '2026-09-20T02:00:00Z');

DO $$
DECLARE r RECORD; v_base bigint := money_base_currency_id();
BEGIN
  -- the form sends its own (wrong) amounts: 10 XTU + 8% saved as 11
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId", "subTotal", "vatAmount", "totalAmount")
  VALUES (998000000000111, 998000000000101, 'Foreign line', 10, 1, 8, 998000000000002, 10, 1, 11);
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000111;
  IF (r."subTotalNative", r."vatAmountNative", r."totalAmountNative") IS DISTINCT FROM (10::float8, 0.8::float8, 10.8::float8) THEN
    RAISE EXCEPTION 'FAIL: native 10 / 0.80 / 10.80 (got %, %, %)', r."subTotalNative", r."vatAmountNative", r."totalAmountNative";
  END IF;
  IF r."exchangeRateToBase" <> 26176.5 OR r."exchangeRateDate" <> DATE '2026-08-18' THEN
    RAISE EXCEPTION 'FAIL: the rate of the quotation date (got %, %)', r."exchangeRateToBase", r."exchangeRateDate";
  END IF;
  IF (r."subTotal", r."vatAmount", r."totalAmount") IS DISTINCT FROM (261765::float8, 20941::float8, 282706::float8) THEN
    RAISE EXCEPTION 'FAIL: VND 261765 + 20941 = 282706 (got %, %, %)', r."subTotal", r."vatAmount", r."totalAmount";
  END IF;

  -- the reference rate is corrected afterwards and the client re-sends its
  -- own rate: editing the price keeps the frozen rate
  UPDATE "exchangeRates" SET rate = 99999 WHERE id = 998000000000011;
  UPDATE "quotationServices" SET "basePrice" = 20, "exchangeRateToBase" = 12345 WHERE id = 998000000000111;
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000111;
  IF r."exchangeRateToBase" <> 26176.5 OR r."totalAmount" <> 565412 THEN
    RAISE EXCEPTION 'FAIL: an edit keeps the frozen rate (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;
  UPDATE "exchangeRates" SET rate = 26176.5 WHERE id = 998000000000011;

  -- another currency freezes a new rate (XTS: inverse pair, 1 / 0.00005)
  UPDATE "quotationServices" SET "currencyId" = 998000000000003 WHERE id = 998000000000111;
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000111;
  IF r."exchangeRateToBase" <> 20000 OR r."totalAmount" <> 432000 THEN
    RAISE EXCEPTION 'FAIL: a new currency re-freezes (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;

  -- quantity 2 and 4% VAT
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId")
  VALUES (998000000000112, 998000000000101, 'Translation', 120.5, 2, 4, 998000000000002);
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000112;
  IF (r."totalAmountNative", r."subTotal", r."vatAmount", r."totalAmount")
     IS DISTINCT FROM (250.64::float8, 6308537::float8, 252341::float8, 6560878::float8) THEN
    RAISE EXCEPTION 'FAIL: 120.50 x 2 + 4%% (got %, %, %, %)', r."totalAmountNative", r."subTotal", r."vatAmount", r."totalAmount";
  END IF;

  -- a VND line: rate 1, native = VND
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId")
  VALUES (998000000000113, 998000000000101, 'Local work', 1000000, 1, 8, v_base);
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000113;
  IF r."exchangeRateToBase" <> 1 OR r."totalAmountNative" <> 1080000 OR r."totalAmount" <> 1080000 THEN
    RAISE EXCEPTION 'FAIL: a VND line (got %, %, %)', r."exchangeRateToBase", r."totalAmountNative", r."totalAmount";
  END IF;

  -- a row without a price (older rows) is left as it is
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "totalAmount")
  VALUES (998000000000114, 998000000000103, 'Legacy', 5000);
  IF (SELECT "totalAmount" FROM "quotationServices" WHERE id = 998000000000114) <> 5000 THEN
    RAISE EXCEPTION 'FAIL: an unpriced row is left alone';
  END IF;

  -- a combo (package) line: rate 1, natives mirror the package amounts, line amounts stay 0
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", "pricingMode",
                                   "packageSubTotal", "packageVatAmount", "packageTotalAmount", "totalAmount")
  VALUES (998000000000115, 998000000000102, 'In combo', 0, 'package', 1000000, 80000, 1080000, 0);
  SELECT * INTO r FROM "quotationServices" WHERE id = 998000000000115;
  IF r."exchangeRateToBase" <> 1 OR r."totalAmountNative" <> 1080000 OR r."totalAmount" <> 0 THEN
    RAISE EXCEPTION 'FAIL: a package line (got %, %, %)', r."exchangeRateToBase", r."totalAmountNative", r."totalAmount";
  END IF;

  -- no rate at all for the currency: the save is refused with a clear message
  BEGIN
    INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", vat, "currencyId")
    VALUES (998000000000116, 998000000000101, 'No rate', 5, 0, 998000000000004);
    RAISE EXCEPTION 'FAIL: a line with no rate must not save';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Missing exchange rate XTC->VND for service "No rate"%' THEN
      RAISE;
    END IF;
  END;

  -- a contract line: the rate of the contract date (not signed yet: its creation)
  INSERT INTO "contractServices" (id, "contractId", "serviceName", "basePrice", quantity, vat, "currencyId")
  VALUES (998000000000211, 998000000000201, 'Foreign line', 10, 1, 8, 998000000000002);
  SELECT * INTO r FROM "contractServices" WHERE id = 998000000000211;
  IF r."exchangeRateToBase" <> 26176.5 OR r."totalAmount" <> 282706 THEN
    RAISE EXCEPTION 'FAIL: the rate of the contract date (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;

  -- a case line not linked yet: the rate of the case date
  INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000221, 998000000000202, 'Foreign line', 10, 8, 998000000000002);
  SELECT * INTO r FROM "projectServices" WHERE id = 998000000000221;
  IF r."exchangeRateToBase" <> 26000 OR r."totalAmount" <> 280800 THEN
    RAISE EXCEPTION 'FAIL: the rate of the case date (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;

  -- linked to the contract line: the case line takes its rate, so both have the same VND
  UPDATE "contractServices" SET "projectServiceId" = 998000000000221 WHERE id = 998000000000211;
  SELECT * INTO r FROM "projectServices" WHERE id = 998000000000221;
  IF r."exchangeRateToBase" <> 26176.5 OR r."totalAmount" <> 282706 THEN
    RAISE EXCEPTION 'FAIL: the case line inherits the contract rate (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;

  -- a case line in another currency than its contract line keeps its own rate
  INSERT INTO "contractServices" (id, "contractId", "serviceName", "basePrice", quantity, vat, "currencyId")
  VALUES (998000000000212, 998000000000201, 'Local work', 500000, 1, 8, v_base);
  INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000222, 998000000000202, 'Other currency', 10, 8, 998000000000002);
  UPDATE "contractServices" SET "projectServiceId" = 998000000000222 WHERE id = 998000000000212;
  IF (SELECT "exchangeRateToBase" FROM "projectServices" WHERE id = 998000000000222) <> 26000 THEN
    RAISE EXCEPTION 'FAIL: no inheritance across currencies';
  END IF;
END $$;
```

- [ ] **Step 2: Run the test to see it fail**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_flow_test.sql`.
  Expected: `FAIL: native 10 / 0.80 / 10.80 (got <NULL>, <NULL>, <NULL>)`.

- [ ] **Step 3: Append section 5 to `pgsql/money_flow_foundation.sql`**

```sql
-- ---- 5. Service lines: the rate each line freezes, and its amounts
-- A line is computed here when it has a price and is not a combo (package)
-- line; rows without basePrice (older rows, placeholders) are left alone.
CREATE OR REPLACE FUNCTION public.money_line_priced(p_row jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT p_row IS NOT NULL
     AND NULLIF(p_row->>'basePrice', '') IS NOT NULL
     AND lower(COALESCE(p_row->>'pricingMode', '')) <> 'package';
$f$;

-- The rate a line freezes (spec §6.2):
--   quotation line: the quotation's date;
--   contract line:  the signing date, else the contract's creation date;
--   case line:      its contract line's rate (same currency), else its
--                   quotation line's, else the case's date.
CREATE OR REPLACE FUNCTION public.money_line_rate(p_table text, p_row jsonb, OUT rate numeric, OUT rate_date date)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_currency bigint := NULLIF(p_row->>'currencyId', '')::bigint;
  v_on date;
BEGIN
  IF p_table = 'quotationServices' THEN
    SELECT money_local_date(q."createdAt") INTO v_on
    FROM quotations q WHERE q.id = NULLIF(p_row->>'quotationId', '')::bigint;
  ELSIF p_table = 'contractServices' THEN
    SELECT money_local_date(COALESCE(c."signedAt", c."createdAt")) INTO v_on
    FROM contracts c WHERE c.id = NULLIF(p_row->>'contractId', '')::bigint;
  ELSIF p_table = 'projectServices' THEN
    SELECT cs."exchangeRateToBase", cs."exchangeRateDate" INTO rate, rate_date
    FROM "contractServices" cs
    WHERE cs."projectServiceId" = NULLIF(p_row->>'id', '')::bigint
      AND cs."currencyId" IS NOT DISTINCT FROM v_currency
      AND cs."exchangeRateToBase" IS NOT NULL
    ORDER BY cs.id
    LIMIT 1;
    IF rate IS NULL THEN
      SELECT qs."exchangeRateToBase", qs."exchangeRateDate" INTO rate, rate_date
      FROM "quotationServices" qs
      WHERE qs.id = NULLIF(p_row->>'quotationServiceId', '')::bigint
        AND qs."currencyId" IS NOT DISTINCT FROM v_currency
        AND qs."exchangeRateToBase" IS NOT NULL;
    END IF;
    IF rate IS NOT NULL THEN
      RETURN;
    END IF;
    SELECT money_local_date(p."createdAt") INTO v_on
    FROM projects p WHERE p.id = NULLIF(p_row->>'projectId', '')::bigint;
  END IF;
  v_on := COALESCE(v_on, money_local_date(now()));
  SELECT x.rate, x.rate_date INTO rate, rate_date FROM money_rate_to_base(v_currency, v_on) x;
END;
$f$;

-- BEFORE INSERT / UPDATE on each line table. Whatever money the client sent
-- is overwritten. The rate is (re)frozen only on insert, when the currency
-- changes, or when the rate is empty (set it to NULL to ask for a re-freeze);
-- otherwise the stored rate is kept (INV-2).
CREATE OR REPLACE FUNCTION public.money_line_compute()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE
  v_row jsonb := to_jsonb(NEW);
  v_currency bigint := NULLIF(v_row->>'currencyId', '')::bigint;
  v_rate numeric;
  v_rate_date date;
  a RECORD;
BEGIN
  IF lower(COALESCE(v_row->>'pricingMode', '')) = 'package' THEN
    NEW."exchangeRateToBase" := 1;
    NEW."exchangeRateDate" := COALESCE(NEW."exchangeRateDate", money_local_date(now()));
    NEW."subTotalNative" := NEW."packageSubTotal";
    NEW."vatAmountNative" := NEW."packageVatAmount";
    NEW."totalAmountNative" := NEW."packageTotalAmount";
    RETURN NEW;
  END IF;
  IF NOT money_line_priced(v_row) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT'
     OR NEW."exchangeRateToBase" IS NULL
     OR OLD."exchangeRateToBase" IS NULL
     OR NEW."currencyId" IS DISTINCT FROM OLD."currencyId" THEN
    SELECT x.rate, x.rate_date INTO v_rate, v_rate_date FROM money_line_rate(TG_TABLE_NAME, v_row) x;
    IF v_rate IS NULL THEN
      RAISE EXCEPTION 'Missing exchange rate %->VND for service "%"',
        money_currency_code(v_currency), COALESCE(v_row->>'serviceName', '');
    END IF;
    NEW."exchangeRateToBase" := v_rate;
    NEW."exchangeRateDate" := v_rate_date;
  ELSE
    NEW."exchangeRateToBase" := OLD."exchangeRateToBase";
    NEW."exchangeRateDate" := OLD."exchangeRateDate";
  END IF;

  SELECT * INTO a FROM money_line_amounts(
    NULLIF(v_row->>'basePrice', '')::numeric,
    NULLIF(v_row->>'quantity', '')::numeric,
    NULLIF(v_row->>'vat', '')::numeric,
    money_decimals(v_currency),
    NEW."exchangeRateToBase"::numeric);
  NEW."subTotalNative" := a.sub_native;
  NEW."vatAmountNative" := a.vat_native;
  NEW."totalAmountNative" := a.total_native;
  NEW."subTotal" := a.sub_vnd;
  NEW."vatAmount" := a.vat_vnd;
  NEW."totalAmount" := a.total_vnd;
  RETURN NEW;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_line_compute ON "quotationServices";
CREATE TRIGGER trg_money_line_compute BEFORE INSERT OR UPDATE ON "quotationServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_compute();
DROP TRIGGER IF EXISTS trg_money_line_compute ON "contractServices";
CREATE TRIGGER trg_money_line_compute BEFORE INSERT OR UPDATE ON "contractServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_compute();
DROP TRIGGER IF EXISTS trg_money_line_compute ON "projectServices";
CREATE TRIGGER trg_money_line_compute BEFORE INSERT OR UPDATE ON "projectServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_compute();

-- AFTER a line changes: a case line re-takes the rate of the contract /
-- quotation line it is linked to (setting its rate to NULL re-freezes it
-- through money_line_compute). Extended in section 6 (document totals).
CREATE OR REPLACE FUNCTION public.money_line_after()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE
  v_new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  v_old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
BEGIN
  IF NOT (money_line_priced(v_new) OR money_line_priced(v_old)) THEN
    RETURN NULL;
  END IF;
  IF v_new IS NOT NULL AND (v_old IS NULL
       OR v_new->'exchangeRateToBase' IS DISTINCT FROM v_old->'exchangeRateToBase'
       OR v_new->'currencyId' IS DISTINCT FROM v_old->'currencyId'
       OR v_new->'projectServiceId' IS DISTINCT FROM v_old->'projectServiceId') THEN
    IF TG_TABLE_NAME = 'contractServices' AND NULLIF(v_new->>'projectServiceId', '') IS NOT NULL THEN
      UPDATE "projectServices" SET "exchangeRateToBase" = NULL
      WHERE id = (v_new->>'projectServiceId')::bigint
        AND "currencyId" IS NOT DISTINCT FROM NULLIF(v_new->>'currencyId', '')::bigint;
    ELSIF TG_TABLE_NAME = 'quotationServices' THEN
      UPDATE "projectServices" ps SET "exchangeRateToBase" = NULL
      WHERE ps."quotationServiceId" = (v_new->>'id')::bigint
        AND ps."currencyId" IS NOT DISTINCT FROM NULLIF(v_new->>'currencyId', '')::bigint
        AND NOT EXISTS (SELECT 1 FROM "contractServices" cs WHERE cs."projectServiceId" = ps.id);
    END IF;
  END IF;
  RETURN NULL;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_line_after ON "quotationServices";
CREATE TRIGGER trg_money_line_after AFTER INSERT OR UPDATE OR DELETE ON "quotationServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_after();
DROP TRIGGER IF EXISTS trg_money_line_after ON "contractServices";
CREATE TRIGGER trg_money_line_after AFTER INSERT OR UPDATE OR DELETE ON "contractServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_after();
DROP TRIGGER IF EXISTS trg_money_line_after ON "projectServices";
CREATE TRIGGER trg_money_line_after AFTER INSERT OR UPDATE OR DELETE ON "projectServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_line_after();
```

- [ ] **Step 4: Run the test to see it pass**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_flow_test.sql`.
  Expected: `NOTICE:  ALL MONEY FLOW CHECKS PASSED`.

- [ ] **Step 5: Run the SQL regression**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/*_test.sql`.
  Expected: every file passes. Older tests insert lines without `basePrice`, so the trigger leaves them alone.

- [ ] **Step 6: Commit (by the user)** — files: `pgsql/money_flow_foundation.sql`, `pgsql/tests/money_flow_test.sql`. Message: `feat(pgsql): service lines computed by the database with frozen rates`.

---

### Task 3: Document totals derived from the lines

**Files:**
- Modify: `pgsql/money_flow_foundation.sql` (append section 6; replace `money_line_after`)
- Modify: `pgsql/tests/money_flow_test.sql` (add section C)

**Interfaces:**
- Consumes: `money_line_priced` (Task 2); `contract_recompute_outstanding_for(bigint)` (existing).
- Produces:
  - `money_line_active(text) → boolean`
  - `money_line_totals(p_lines text, p_parent_id bigint) → (sub, vat, total numeric)` — NULL unless every active line is a priced line-mode line.
  - `money_touch_header(p_table text, p_id bigint)`
  - `money_zero_header_if_empty(p_lines text, p_parent_id bigint)`
  - Triggers: `trg_money_quotation_header`, `trg_money_contract_header`, `trg_money_project_header` (BEFORE UPDATE); `trg_money_contract_total_changed` (AFTER UPDATE, when `totalAmount` changes) with function `money_contract_total_changed()`. Task 5 replaces that function.

- [ ] **Step 1: Write section C of the test** — insert before the final `RAISE NOTICE` block:

```sql
-- ---- C. document totals follow their lines ----
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998000000000104, 'line', '2026-09-01T02:00:00Z');
DO $$
DECLARE r RECORD; v_base bigint := money_base_currency_id(); v_events bigint;
BEGIN
  -- quotation 101: 111 (400000 + 32000), 112 (6308537 + 252341), 113 (1000000 + 80000)
  SELECT * INTO r FROM quotations WHERE id = 998000000000101;
  IF (r."subTotal", r."totalAmount") IS DISTINCT FROM (7708537::float8, 8072878::float8) THEN
    RAISE EXCEPTION 'FAIL: quotation = sum of its lines (got %, %)', r."subTotal", r."totalAmount";
  END IF;
  UPDATE quotations SET "totalAmount" = 1 WHERE id = 998000000000101;
  IF (SELECT "totalAmount" FROM quotations WHERE id = 998000000000101) <> 8072878 THEN
    RAISE EXCEPTION 'FAIL: a total written by the form is replaced by the sum of the lines';
  END IF;
  DELETE FROM "quotationServices" WHERE id = 998000000000113;
  SELECT * INTO r FROM quotations WHERE id = 998000000000101;
  IF (r."subTotal", r."totalAmount") IS DISTINCT FROM (6708537::float8, 6992878::float8) THEN
    RAISE EXCEPTION 'FAIL: a deleted line leaves the total (got %, %)', r."subTotal", r."totalAmount";
  END IF;

  -- a combo quotation keeps what the form wrote
  UPDATE quotations SET "totalAmount" = 1234 WHERE id = 998000000000102;
  IF (SELECT "totalAmount" FROM quotations WHERE id = 998000000000102) <> 1234 THEN
    RAISE EXCEPTION 'FAIL: a combo quotation keeps its own total';
  END IF;

  -- a quotation that still has an older unpriced row is left alone
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000117, 998000000000103, 'Priced', 100, 0, v_base);
  UPDATE quotations SET "totalAmount" = 777 WHERE id = 998000000000103;
  IF (SELECT "totalAmount" FROM quotations WHERE id = 998000000000103) <> 777 THEN
    RAISE EXCEPTION 'FAIL: a document with unpriced rows keeps its own total';
  END IF;

  -- removing the last service leaves a zero total
  INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000118, 998000000000104, 'Only one', 100, 0, v_base);
  IF (SELECT "totalAmount" FROM quotations WHERE id = 998000000000104) <> 100 THEN
    RAISE EXCEPTION 'FAIL: a single line makes the total';
  END IF;
  DELETE FROM "quotationServices" WHERE id = 998000000000118;
  IF (SELECT "totalAmount" FROM quotations WHERE id = 998000000000104) <> 0 THEN
    RAISE EXCEPTION 'FAIL: no line left -> total 0';
  END IF;

  -- contract 201: 211 (261765 + 20941), 212 (500000 + 40000); its balance follows (no payment yet)
  SELECT * INTO r FROM contracts WHERE id = 998000000000201;
  IF (r."subTotal", r."vatAmount", r."totalAmount") IS DISTINCT FROM (761765::float8, 60941::float8, 822706::float8) THEN
    RAISE EXCEPTION 'FAIL: contract = sum of its lines (got %, %, %)', r."subTotal", r."vatAmount", r."totalAmount";
  END IF;
  IF r."outStandingAmount" <> 822706 THEN
    RAISE EXCEPTION 'FAIL: the contract balance follows its total (got %)', r."outStandingAmount";
  END IF;
  -- touching the header raises no finance notification
  SELECT count(*) INTO v_events FROM "financeNotificationEvents";
  UPDATE contracts SET "totalAmount" = 1 WHERE id = 998000000000201;
  IF (SELECT "totalAmount" FROM contracts WHERE id = 998000000000201) <> 822706 THEN
    RAISE EXCEPTION 'FAIL: the contract total is the sum of its lines';
  END IF;
  IF (SELECT count(*) FROM "financeNotificationEvents") <> v_events THEN
    RAISE EXCEPTION 'FAIL: recomputing a total queues no notification';
  END IF;

  -- case 202: 221 (282706) + 222 (280800)
  IF (SELECT "totalAmount" FROM projects WHERE id = 998000000000202) <> 563506 THEN
    RAISE EXCEPTION 'FAIL: case = sum of its own services';
  END IF;
  UPDATE projects SET "totalAmount" = 1 WHERE id = 998000000000202;
  IF (SELECT "totalAmount" FROM projects WHERE id = 998000000000202) <> 563506 THEN
    RAISE EXCEPTION 'FAIL: a copied contract total is replaced by the case''s own sum';
  END IF;
END $$;
```

- [ ] **Step 2: Run the test to see it fail**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_flow_test.sql`.
  Expected: `FAIL: quotation = sum of its lines (got <NULL>, <NULL>)`.

- [ ] **Step 3: Append section 6 to `pgsql/money_flow_foundation.sql`**, replacing `money_line_after` (the full function is repeated here):

```sql
-- ---- 6. Document totals = the sum of their lines (line pricing only)
CREATE OR REPLACE FUNCTION public.money_line_active(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT lower(btrim(COALESCE(p_status, ''))) NOT IN ('deleted', 'cancelled', 'canceled');
$f$;

-- Σ of a document's active lines, or NULL when the document is not made of
-- priced line-mode lines only (no lines, a combo line, or an older unpriced
-- row): then the JS-written totals stay.
CREATE OR REPLACE FUNCTION public.money_line_totals(p_lines text, p_parent_id bigint, OUT sub numeric, OUT vat numeric, OUT total numeric)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_priced integer;
  v_other integer;
BEGIN
  IF p_parent_id IS NULL THEN
    RETURN;
  END IF;
  IF p_lines = 'quotationServices' THEN
    SELECT count(*) FILTER (WHERE money_line_priced(to_jsonb(l))),
           count(*) FILTER (WHERE NOT money_line_priced(to_jsonb(l))),
           sum(l."subTotal") FILTER (WHERE money_line_priced(to_jsonb(l))),
           sum(l."vatAmount") FILTER (WHERE money_line_priced(to_jsonb(l))),
           sum(l."totalAmount") FILTER (WHERE money_line_priced(to_jsonb(l)))
    INTO v_priced, v_other, sub, vat, total
    FROM "quotationServices" l
    WHERE l."quotationId" = p_parent_id AND money_line_active(l.status);
  ELSIF p_lines = 'contractServices' THEN
    SELECT count(*) FILTER (WHERE money_line_priced(to_jsonb(l))),
           count(*) FILTER (WHERE NOT money_line_priced(to_jsonb(l))),
           sum(l."subTotal") FILTER (WHERE money_line_priced(to_jsonb(l))),
           sum(l."vatAmount") FILTER (WHERE money_line_priced(to_jsonb(l))),
           sum(l."totalAmount") FILTER (WHERE money_line_priced(to_jsonb(l)))
    INTO v_priced, v_other, sub, vat, total
    FROM "contractServices" l
    WHERE l."contractId" = p_parent_id AND money_line_active(l."lineStatus");
  ELSIF p_lines = 'projectServices' THEN
    SELECT count(*) FILTER (WHERE money_line_priced(to_jsonb(l))),
           count(*) FILTER (WHERE NOT money_line_priced(to_jsonb(l))),
           sum(l."subTotal") FILTER (WHERE money_line_priced(to_jsonb(l))),
           sum(l."vatAmount") FILTER (WHERE money_line_priced(to_jsonb(l))),
           sum(l."totalAmount") FILTER (WHERE money_line_priced(to_jsonb(l)))
    INTO v_priced, v_other, sub, vat, total
    FROM "projectServices" l
    WHERE l."projectId" = p_parent_id AND money_line_active(l.status);
  END IF;
  IF COALESCE(v_priced, 0) = 0 OR COALESCE(v_other, 0) > 0 THEN
    sub := NULL;
    vat := NULL;
    total := NULL;
  END IF;
END;
$f$;

CREATE OR REPLACE FUNCTION public.money_quotation_header()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE t RECORD;
BEGIN
  IF lower(COALESCE(NEW."pricingMode", '')) = 'package' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO t FROM money_line_totals('quotationServices', NEW.id);
  IF t.total IS NOT NULL THEN
    NEW."subTotal" := t.sub;
    NEW."totalAmount" := t.total;
  END IF;
  RETURN NEW;
END;
$f$;

CREATE OR REPLACE FUNCTION public.money_contract_header()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE t RECORD;
BEGIN
  IF COALESCE(NEW."contractType", '') = 'retainer' OR lower(COALESCE(NEW."pricingMode", '')) = 'package' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO t FROM money_line_totals('contractServices', NEW.id);
  IF t.total IS NOT NULL THEN
    NEW."subTotal" := t.sub;
    NEW."vatAmount" := t.vat;
    NEW."totalAmount" := t.total;
  END IF;
  RETURN NEW;
END;
$f$;

-- A case's total is the sum of its own services, not a copy of the contract's.
CREATE OR REPLACE FUNCTION public.money_project_header()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE t RECORD;
BEGIN
  SELECT * INTO t FROM money_line_totals('projectServices', NEW.id);
  IF t.total IS NOT NULL THEN
    NEW."totalAmount" := t.total;
  END IF;
  RETURN NEW;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_quotation_header ON quotations;
CREATE TRIGGER trg_money_quotation_header BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION public.money_quotation_header();
DROP TRIGGER IF EXISTS trg_money_contract_header ON contracts;
CREATE TRIGGER trg_money_contract_header BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION public.money_contract_header();
DROP TRIGGER IF EXISTS trg_money_project_header ON projects;
CREATE TRIGGER trg_money_project_header BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.money_project_header();

-- A contract whose total changed re-derives its balance (and, in section 8,
-- its installment amounts).
CREATE OR REPLACE FUNCTION public.money_contract_total_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  PERFORM contract_recompute_outstanding_for(NEW.id);
  RETURN NULL;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_contract_total_changed ON contracts;
CREATE TRIGGER trg_money_contract_total_changed AFTER UPDATE ON contracts
  FOR EACH ROW WHEN (OLD."totalAmount" IS DISTINCT FROM NEW."totalAmount")
  EXECUTE FUNCTION public.money_contract_total_changed();

-- A same-value update: the header's BEFORE trigger recomputes its totals.
CREATE OR REPLACE FUNCTION public.money_touch_header(p_table text, p_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $f$
BEGIN
  IF p_id IS NULL THEN
    RETURN;
  END IF;
  EXECUTE format('UPDATE %I SET "totalAmount" = "totalAmount" WHERE id = $1', p_table) USING p_id;
END;
$f$;

-- A document whose last service went away totals 0.
CREATE OR REPLACE FUNCTION public.money_zero_header_if_empty(p_lines text, p_parent_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $f$
BEGIN
  IF p_parent_id IS NULL THEN
    RETURN;
  END IF;
  IF p_lines = 'quotationServices' AND NOT EXISTS (
    SELECT 1 FROM "quotationServices" l WHERE l."quotationId" = p_parent_id AND money_line_active(l.status)
  ) THEN
    UPDATE quotations SET "subTotal" = 0, "totalAmount" = 0
    WHERE id = p_parent_id AND lower(COALESCE("pricingMode", '')) <> 'package';
  ELSIF p_lines = 'contractServices' AND NOT EXISTS (
    SELECT 1 FROM "contractServices" l WHERE l."contractId" = p_parent_id AND money_line_active(l."lineStatus")
  ) THEN
    UPDATE contracts SET "subTotal" = 0, "vatAmount" = 0, "totalAmount" = 0
    WHERE id = p_parent_id AND COALESCE("contractType", '') <> 'retainer'
      AND lower(COALESCE("pricingMode", '')) <> 'package';
  ELSIF p_lines = 'projectServices' AND NOT EXISTS (
    SELECT 1 FROM "projectServices" l WHERE l."projectId" = p_parent_id AND money_line_active(l.status)
  ) THEN
    UPDATE projects SET "totalAmount" = 0 WHERE id = p_parent_id;
  END IF;
END;
$f$;

-- AFTER a line changes: (1) a case line re-takes its contract / quotation
-- line's rate, (2) the document totals follow, (3) no line left -> 0.
CREATE OR REPLACE FUNCTION public.money_line_after()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE
  v_new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  v_old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  v_parent_col text := CASE TG_TABLE_NAME
    WHEN 'quotationServices' THEN 'quotationId'
    WHEN 'contractServices' THEN 'contractId'
    ELSE 'projectId' END;
  v_header text := CASE TG_TABLE_NAME
    WHEN 'quotationServices' THEN 'quotations'
    WHEN 'contractServices' THEN 'contracts'
    ELSE 'projects' END;
  v_new_parent bigint := NULLIF(v_new->>v_parent_col, '')::bigint;
  v_old_parent bigint := NULLIF(v_old->>v_parent_col, '')::bigint;
BEGIN
  IF NOT (money_line_priced(v_new) OR money_line_priced(v_old)) THEN
    RETURN NULL;
  END IF;
  IF v_new IS NOT NULL AND (v_old IS NULL
       OR v_new->'exchangeRateToBase' IS DISTINCT FROM v_old->'exchangeRateToBase'
       OR v_new->'currencyId' IS DISTINCT FROM v_old->'currencyId'
       OR v_new->'projectServiceId' IS DISTINCT FROM v_old->'projectServiceId') THEN
    IF TG_TABLE_NAME = 'contractServices' AND NULLIF(v_new->>'projectServiceId', '') IS NOT NULL THEN
      UPDATE "projectServices" SET "exchangeRateToBase" = NULL
      WHERE id = (v_new->>'projectServiceId')::bigint
        AND "currencyId" IS NOT DISTINCT FROM NULLIF(v_new->>'currencyId', '')::bigint;
    ELSIF TG_TABLE_NAME = 'quotationServices' THEN
      UPDATE "projectServices" ps SET "exchangeRateToBase" = NULL
      WHERE ps."quotationServiceId" = (v_new->>'id')::bigint
        AND ps."currencyId" IS NOT DISTINCT FROM NULLIF(v_new->>'currencyId', '')::bigint
        AND NOT EXISTS (SELECT 1 FROM "contractServices" cs WHERE cs."projectServiceId" = ps.id);
    END IF;
  END IF;
  PERFORM money_touch_header(v_header, v_new_parent);
  IF v_old_parent IS DISTINCT FROM v_new_parent THEN
    PERFORM money_touch_header(v_header, v_old_parent);
  END IF;
  IF money_line_priced(v_old) THEN
    PERFORM money_zero_header_if_empty(TG_TABLE_NAME, v_old_parent);
  END IF;
  RETURN NULL;
END;
$f$;
```

- [ ] **Step 4: Run the test to see it pass**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_flow_test.sql`.
  Expected: `NOTICE:  ALL MONEY FLOW CHECKS PASSED`.

- [ ] **Step 5: Run the SQL regression**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/*_test.sql`.
  Expected: every file passes.

- [ ] **Step 6: Commit (by the user)** — files: `pgsql/money_flow_foundation.sql`, `pgsql/tests/money_flow_test.sql`. Message: `feat(pgsql): document totals derived from their service lines`.

---

### Task 4: Re-freeze on signing, unless the contract is billed

**Files:**
- Modify: `pgsql/money_flow_foundation.sql` (append section 7)
- Modify: `pgsql/tests/money_flow_test.sql` (add section D)

**Interfaces:**
- Consumes: `finance_is_received(text)` (existing); the line triggers (Tasks 2–3).
- Produces:
  - `money_payment_request_billed(p_pr_id bigint) → boolean` — status is not pending/cancelled, or it has a live invoice, or a received payment.
  - `money_contract_billing_locked(p_contract_id bigint) → boolean`
  - Trigger `trg_money_contract_signed` (AFTER UPDATE on contracts, when `signedAt` changes) with function `money_contract_signed()`.

- [ ] **Step 1: Write section D of the test** — insert before the final `RAISE NOTICE` block:

```sql
-- ---- D. signing re-freezes the contract's foreign lines, unless it is already billed ----
DO $$
DECLARE r RECORD;
BEGIN
  UPDATE contracts SET "signedAt" = '2026-09-15T02:00:00Z' WHERE id = 998000000000201;
  SELECT * INTO r FROM "contractServices" WHERE id = 998000000000211;
  IF r."exchangeRateToBase" <> 26000 OR r."totalAmount" <> 280800 THEN
    RAISE EXCEPTION 'FAIL: signing freezes the rate of the signing date (got %, %)', r."exchangeRateToBase", r."totalAmount";
  END IF;
  IF (SELECT "totalAmount" FROM "projectServices" WHERE id = 998000000000221) <> 280800 THEN
    RAISE EXCEPTION 'FAIL: the case line follows its contract line';
  END IF;
  IF (SELECT "totalAmount" FROM contracts WHERE id = 998000000000201) <> 820800 THEN
    RAISE EXCEPTION 'FAIL: the contract total follows the re-frozen line';
  END IF;

  -- once a request is active, signing again moves nothing
  INSERT INTO "paymentRequests" (id, "contractId", status, "requestedAmount")
  VALUES (998000000000231, 998000000000201, 'active', 100);
  UPDATE contracts SET "signedAt" = '2026-09-01T02:00:00Z' WHERE id = 998000000000201;
  IF (SELECT "exchangeRateToBase" FROM "contractServices" WHERE id = 998000000000211) <> 26000 THEN
    RAISE EXCEPTION 'FAIL: a billed contract keeps its rates';
  END IF;
  DELETE FROM "paymentRequests" WHERE id = 998000000000231;
END $$;
```

- [ ] **Step 2: Run the test to see it fail**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_flow_test.sql`.
  Expected: `FAIL: signing freezes the rate of the signing date (got 26176.5, 282706)`.

- [ ] **Step 3: Append section 7 to `pgsql/money_flow_foundation.sql`**

```sql
-- ---- 7. Billed? Then its amounts never move
CREATE OR REPLACE FUNCTION public.money_payment_request_billed(p_pr_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT EXISTS (
    SELECT 1 FROM "paymentRequests" pr
    WHERE pr.id = p_pr_id
      AND (lower(COALESCE(pr.status, '')) NOT IN ('pending', 'cancelled', 'canceled')
        OR EXISTS (SELECT 1 FROM invoices i
                   WHERE i."paymentRequestId" = pr.id
                     AND lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled'))
        OR EXISTS (SELECT 1 FROM payments p
                   WHERE p."paymentRequestId" = pr.id AND finance_is_received(p."paymentStatus")))
  );
$f$;

CREATE OR REPLACE FUNCTION public.money_contract_billing_locked(p_contract_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT p_contract_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM "paymentRequests" pr
            WHERE pr."contractId" = p_contract_id AND money_payment_request_billed(pr.id))
    OR EXISTS (SELECT 1 FROM invoices i
               WHERE i."contractId" = p_contract_id
                 AND lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled'))
    OR EXISTS (SELECT 1 FROM payments p
               WHERE p."contractId" = p_contract_id AND finance_is_received(p."paymentStatus")));
$f$;

-- Signing (or re-dating the signature) re-freezes the contract's foreign
-- lines at the signing date; their case lines follow (money_line_after).
CREATE OR REPLACE FUNCTION public.money_contract_signed()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  IF money_contract_billing_locked(NEW.id) THEN
    RETURN NULL;
  END IF;
  UPDATE "contractServices" SET "exchangeRateToBase" = NULL
  WHERE "contractId" = NEW.id
    AND "basePrice" IS NOT NULL
    AND lower(COALESCE("pricingMode", '')) <> 'package'
    AND NOT money_is_base("currencyId");
  RETURN NULL;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_contract_signed ON contracts;
CREATE TRIGGER trg_money_contract_signed AFTER UPDATE ON contracts
  FOR EACH ROW WHEN (OLD."signedAt" IS DISTINCT FROM NEW."signedAt")
  EXECUTE FUNCTION public.money_contract_signed();
```

- [ ] **Step 4: Run the test to see it pass**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_flow_test.sql`.
  Expected: `NOTICE:  ALL MONEY FLOW CHECKS PASSED`.

- [ ] **Step 5: Commit (by the user)** — files: `pgsql/money_flow_foundation.sql`, `pgsql/tests/money_flow_test.sql`. Message: `feat(pgsql): re-freeze contract rates on signing unless billed`.

---

### Task 5: Installment amounts by largest remainder

**Files:**
- Modify: `pgsql/money_flow_foundation.sql` (append section 8; replace `money_contract_total_changed`)
- Modify: `pgsql/tests/money_flow_test.sql` (add section E)

**Interfaces:**
- Consumes: `money_split`, `money_payment_request_billed`, `contract_resolved_total`.
- Produces:
  - `money_schedule_row_locked(p_schedule_id bigint) → boolean`
  - `money_refresh_schedule(p_contract_id bigint) → void`
  - `money_contract_total_changed()` now also calls `money_refresh_schedule`.

- [ ] **Step 1: Write section E of the test** — insert before the final `RAISE NOTICE` block:

```sql
-- ---- E. installments add up to the contract total exactly ----
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt")
VALUES (998000000000301, 'MF-2', 'Installments', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
DO $$
DECLARE v_base bigint := money_base_currency_id(); v_amounts numeric[];
BEGIN
  INSERT INTO "contractServices" (id, "contractId", "serviceName", "basePrice", vat, "currencyId")
  VALUES (998000000000311, 998000000000301, 'Work', 10000001, 0, v_base);
  -- the form saved amounts that miss the total by one đồng
  INSERT INTO "contractPaymentSchedules" (id, "contractId", "installmentNo", label, percentage, amount, "triggerType") VALUES
    (998000000000321, 998000000000301, 1, 'Đợt 1', 30, 3000000, 'on_task_done'),
    (998000000000322, 998000000000301, 2, 'Đợt 2', 30, 3000000, 'on_task_done'),
    (998000000000323, 998000000000301, 3, 'Đợt 3', 40, 4000000, 'on_task_done');
  PERFORM money_refresh_schedule(998000000000301);
  SELECT array_agg(amount::numeric ORDER BY "installmentNo") INTO v_amounts
  FROM "contractPaymentSchedules" WHERE "contractId" = 998000000000301;
  IF v_amounts IS DISTINCT FROM ARRAY[3000000, 3000000, 4000001]::numeric[] THEN
    RAISE EXCEPTION 'FAIL: 30/30/40 of 10000001 (got %)', v_amounts;
  END IF;
  IF (SELECT "requestedAmount" FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 998000000000323) <> 4000001 THEN
    RAISE EXCEPTION 'FAIL: a pending request follows its installment';
  END IF;

  -- the contract total changes: the installments follow
  UPDATE "contractServices" SET "basePrice" = 20000000 WHERE id = 998000000000311;
  SELECT array_agg(amount::numeric ORDER BY "installmentNo") INTO v_amounts
  FROM "contractPaymentSchedules" WHERE "contractId" = 998000000000301;
  IF v_amounts IS DISTINCT FROM ARRAY[6000000, 6000000, 8000000]::numeric[] THEN
    RAISE EXCEPTION 'FAIL: installments follow the contract total (got %)', v_amounts;
  END IF;

  -- a billed installment keeps its amount; the others share what is left
  UPDATE "paymentRequests" SET status = 'active' WHERE "contractPaymentScheduleId" = 998000000000321;
  UPDATE "contractServices" SET "basePrice" = 10000000 WHERE id = 998000000000311;
  SELECT array_agg(amount::numeric ORDER BY "installmentNo") INTO v_amounts
  FROM "contractPaymentSchedules" WHERE "contractId" = 998000000000301;
  IF v_amounts IS DISTINCT FROM ARRAY[6000000, 1714286, 2285714]::numeric[] THEN
    RAISE EXCEPTION 'FAIL: a billed installment is kept, the rest shares 4000000 (got %)', v_amounts;
  END IF;
  IF (SELECT "requestedAmount" FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 998000000000322) <> 1714286 THEN
    RAISE EXCEPTION 'FAIL: the pending request of installment 2 follows';
  END IF;
  IF (SELECT "requestedAmount" FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 998000000000321) <> 6000000 THEN
    RAISE EXCEPTION 'FAIL: the active request keeps its amount';
  END IF;
END $$;
```

- [ ] **Step 2: Run the test to see it fail**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_flow_test.sql`.
  Expected: `function money_refresh_schedule(bigint) does not exist`.

- [ ] **Step 3: Append section 8 to `pgsql/money_flow_foundation.sql`**, replacing `money_contract_total_changed`:

```sql
-- ---- 8. Installment amounts: the contract total split by percentage
CREATE OR REPLACE FUNCTION public.money_schedule_row_locked(p_schedule_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT EXISTS (
    SELECT 1 FROM "paymentRequests" pr
    WHERE pr."contractPaymentScheduleId" = p_schedule_id AND money_payment_request_billed(pr.id)
  );
$f$;

-- When a contract's percentage installments add up to 100%, their amounts
-- are the contract total split by largest remainder (Σ = total exactly).
-- Billed installments keep their amounts; the others share what is left.
-- Pending requests and their items follow their installment. Retainer and
-- By Service rows are not percentage installments and are left alone. The
-- JS twin is allocateInstallmentAmounts() in ContractCreateForm.js.
CREATE OR REPLACE FUNCTION public.money_refresh_schedule(p_contract_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $f$
DECLARE
  v_type text;
  v_total numeric;
  v_pct numeric;
  v_locked numeric;
  v_ids bigint[];
  v_weights numeric[];
  v_split numeric[];
  i integer;
BEGIN
  SELECT c."contractType", contract_resolved_total(c.id) INTO v_type, v_total
  FROM contracts c WHERE c.id = p_contract_id;
  IF v_total IS NULL OR COALESCE(v_type, '') IN ('retainer', 'byService') THEN
    RETURN;
  END IF;
  SELECT sum(s.percentage) INTO v_pct
  FROM "contractPaymentSchedules" s WHERE s."contractId" = p_contract_id AND s.percentage > 0;
  IF v_pct IS NULL OR abs(v_pct - 100) > 0.01 THEN
    RETURN;
  END IF;
  SELECT COALESCE(sum(s.amount), 0) INTO v_locked
  FROM "contractPaymentSchedules" s
  WHERE s."contractId" = p_contract_id AND s.percentage > 0 AND money_schedule_row_locked(s.id);
  SELECT array_agg(s.id ORDER BY s."installmentNo", s.id),
         array_agg(s.percentage::numeric ORDER BY s."installmentNo", s.id)
  INTO v_ids, v_weights
  FROM "contractPaymentSchedules" s
  WHERE s."contractId" = p_contract_id AND s.percentage > 0 AND NOT money_schedule_row_locked(s.id);
  IF v_ids IS NULL THEN
    RETURN;
  END IF;
  v_split := money_split(GREATEST(v_total - v_locked, 0), v_weights, 0);
  FOR i IN 1..array_length(v_ids, 1) LOOP
    UPDATE "contractPaymentSchedules" SET amount = v_split[i]
    WHERE id = v_ids[i] AND amount IS DISTINCT FROM v_split[i];
    UPDATE "paymentRequests" SET "requestedAmount" = v_split[i]
    WHERE "contractPaymentScheduleId" = v_ids[i]
      AND lower(COALESCE(status, '')) = 'pending'
      AND "requestedAmount" IS DISTINCT FROM v_split[i];
    UPDATE "paymentRequestItems" pri SET "requestedAmount" = v_split[i]
    FROM "paymentRequests" pr
    WHERE pri."paymentRequestId" = pr.id
      AND pr."contractPaymentScheduleId" = v_ids[i]
      AND lower(COALESCE(pr.status, '')) = 'pending'
      AND pri."requestedAmount" IS DISTINCT FROM v_split[i];
  END LOOP;
END;
$f$;

CREATE OR REPLACE FUNCTION public.money_contract_total_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  PERFORM contract_recompute_outstanding_for(NEW.id);
  PERFORM money_refresh_schedule(NEW.id);
  RETURN NULL;
END;
$f$;
```

- [ ] **Step 4: Run the test to see it pass**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_flow_test.sql`.
  Expected: `NOTICE:  ALL MONEY FLOW CHECKS PASSED`.

- [ ] **Step 5: Run the SQL regression**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/*_test.sql`.
  Expected: every file passes.

- [ ] **Step 6: Commit (by the user)** — files: `pgsql/money_flow_foundation.sql`, `pgsql/tests/money_flow_test.sql`. Message: `feat(pgsql): installment amounts split by largest remainder`.

---

### Task 6: The JS preview on the shared cases

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js:2536-2557` (installment allocation helpers block)
- Modify: `scripts/tests/money-cases.test.js`

**Interfaces:**
- Consumes: `scripts/tests/fixtures/money-cases.json` (Task 1).
- Produces:
  - `splitLargestRemainder(total, weights, decimals = 0) → number[]`, inside the `installment allocation helpers` block of ContractCreateForm.js.
  - `allocateInstallmentAmounts(rows, baseAmount)` (same signature), now splitting by largest remainder.

- [ ] **Step 1: Add the shared-case checks** — in `scripts/tests/money-cases.test.js`, insert before the final `console.log`:

```js
const { extractMarkedBlock } = require("./extract-marked-block");
const cases = JSON.parse(read("scripts/tests/fixtures/money-cases.json"));
const parseNum = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const decimalsOf = (c) => (c && Number.isFinite(Number(c.decimalPlaces)) ? Number(c.decimalPlaces) : 0);

// ---- line amounts: the preview of the Quotation and Case forms ----
{
  const Q = extractMarkedBlock(
    path.join(root, "All Module/Quotation/QuotationCreateForm.js"),
    "// ---- line amount helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end line amount helpers ----",
    ["calcLine"],
    { parseNum, getCurrencyDecimals: decimalsOf },
  );
  const K = extractMarkedBlock(
    path.join(root, "All Module/Case/CaseCreateForm.js"),
    "// ---- line amount helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end line amount helpers ----",
    ["calcLineAmounts"],
    { parseNum, getCurrencyDecimals: decimalsOf },
  );
  for (const c of cases.lines) {
    const currency = { decimalPlaces: c.decimals };
    const q = Q.calcLine(c.basePrice, c.quantity, c.vat, currency);
    assert.deepEqual([q.subTotal, q.vatAmount, q.totalAmount], c.native, `Quotation preview: ${c.name}`);
    if (c.quantity === 1) {
      const k = K.calcLineAmounts(c.basePrice, c.vat, currency);
      assert.deepEqual([k.subTotal, k.vatAmount, k.totalAmount], c.native, `Case preview: ${c.name}`);
    }
  }
}

// ---- splits: installments in the Contract form ----
{
  const roundAmount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : 0;
  };
  const paymentScheduleRowAmount = (row, baseAmount) => {
    const percent = parseNum(row?.percentage);
    const base = parseNum(baseAmount);
    return percent > 0 && base > 0 ? roundAmount((base * percent) / 100) : parseNum(row?.amount);
  };
  const { splitLargestRemainder, allocateInstallmentAmounts } = extractMarkedBlock(
    path.join(root, "All Module/Contract/ContractCreateForm.js"),
    "// ---- installment allocation helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end installment allocation helpers ----",
    ["splitLargestRemainder", "allocateInstallmentAmounts"],
    { paymentScheduleRowAmount, roundAmount, parseNum },
  );
  for (const c of cases.splits) {
    assert.deepEqual(splitLargestRemainder(c.total, c.weights, c.decimals), c.expected, `split ${c.total} by ${c.weights}`);
  }
  // the form's installments are the same split as the database's
  const rows = [{ percentage: "30" }, { percentage: "30" }, { percentage: "40" }];
  assert.deepEqual(allocateInstallmentAmounts(rows, 10000001), [3000000, 3000000, 4000001]);
  assert.deepEqual(allocateInstallmentAmounts(rows, 20000000), [6000000, 6000000, 8000000]);
}
```

- [ ] **Step 2: Run it to see it fail**

  Run `node scripts/tests/money-cases.test.js`.
  Expected: `splitLargestRemainder is not defined`.

- [ ] **Step 3: Replace the helper block** — in `All Module/Contract/ContractCreateForm.js`, replace the block between the two `installment allocation helpers` markers (keep the markers) with:

```js
      // ---- installment allocation helpers (pure; tested by scripts/tests/money-rounding.test.js) ----
      // Splits a total over weights so the parts add up exactly (largest
      // remainder): floor each part to the unit, then the units left over go
      // to the parts with the largest fractions, ties to the earlier part.
      // Same as money_split() in pgsql/money_flow_foundation.sql — shared
      // cases in scripts/tests/fixtures/money-cases.json.
      const splitLargestRemainder = (total, weights, decimals = 0) => {
        const list = Array.isArray(weights) ? weights : [];
        if (!list.length) return [];
        const scale = 10 ** Math.max(0, decimals);
        let units = Math.round((Number(total) || 0) * scale);
        const sign = units < 0 ? -1 : 1;
        units = Math.abs(units);
        const w = list.map((x) => Math.max(Number(x) || 0, 0));
        const wsum = w.reduce((s, x) => s + x, 0);
        const raw = w.map((x) => (wsum > 0 ? (units * x) / wsum : units / list.length));
        const out = raw.map((x) => Math.floor(x + 1e-9));
        let left = units - out.reduce((s, x) => s + x, 0);
        const order = raw
          .map((x, i) => ({ i, f: x - out[i] }))
          .sort((a, b) => b.f - a.f || a.i - b.i);
        for (let k = 0; k < order.length && left > 0; k += 1, left -= 1) out[order[k].i] += 1;
        return out.map((x) => (sign * x) / scale);
      };
      // Installments from percentages: when they add up to 100% they are the
      // total split by largest remainder — the table shows exactly what the
      // database stores (money_refresh_schedule), and it always adds up.
      const allocateInstallmentAmounts = (rows, baseAmount) => {
        const list = rows || [];
        const amounts = list.map((row) => paymentScheduleRowAmount(row, baseAmount));
        const base = roundAmount(baseAmount);
        const percentSum = list.reduce((sum, row) => sum + parseNum(row?.percentage), 0);
        const pctIndexes = list
          .map((row, index) => (parseNum(row?.percentage) > 0 ? index : -1))
          .filter((index) => index >= 0);
        if (pctIndexes.length > 1 && base > 0 && Math.abs(percentSum - 100) <= 0.01) {
          const split = splitLargestRemainder(base, pctIndexes.map((index) => parseNum(list[index].percentage)), 0);
          pctIndexes.forEach((index, k) => {
            amounts[index] = split[k];
          });
        }
        return amounts;
      };
      // ---- end installment allocation helpers ----
```

- [ ] **Step 4: Run the node tests to see them pass**

  Run `node scripts/tests/money-cases.test.js && node scripts/tests/money-rounding.test.js`.
  Expected: `money-cases: all tests passed`, then the money-rounding pass line. The existing 30/30/40 and blank-row cases still hold.

- [ ] **Step 5: Run the full node suite and the block parser**

  Run `for f in scripts/tests/*.test.js; do node "$f" || exit 1; done && node scripts/tests/parse-blocks.js`.
  Expected: every test passes; `parse-blocks` reports no syntax error.

- [ ] **Step 6: Commit (by the user)** — files: `All Module/Contract/ContractCreateForm.js`, `scripts/tests/money-cases.test.js`. Message: `feat(contract): installments by largest remainder, checked on the shared money cases`.

---

### Task 7: Money trail — allocation, views and consistency audit

**Files:**
- Modify: `pgsql/money_flow_trail.sql`
- Create: `pgsql/money_consistency_audit.sql`
- Create: `pgsql/tests/money_trail_test.sql`

**Interfaces:**
- Consumes:
  - `money_split`, `money_line_priced`, `money_line_active`, `money_line_totals`, `money_line_amounts`, `money_decimals`, `money_currency_code`, `money_is_base` (Tasks 1–3);
  - `contract_resolved_total`, `finance_payment_vnd`, `finance_is_received` (existing).
- Produces:
  - `money_contract_service_values(bigint) → TABLE(contract_service_id, project_service_id bigint, value numeric)`
  - `money_payment_request_allocation(bigint) → TABLE(contract_service_id, project_service_id bigint, amount numeric)`
  - `money_allocate_by(p_total numeric, p_pr_id bigint, p_contract_id bigint) → TABLE(contract_service_id, project_service_id bigint, amount numeric)`
  - Views: `money_pr_allocations`, `money_invoice_allocations`, `money_payment_allocations`, `finance_service_money_trail`, `finance_contract_retainer_trail`, `finance_unallocated_money`, `money_consistency_violations(rule, table_name, record_id, contract_id, detail)`.

- [ ] **Step 1: Write the test** — create `pgsql/tests/money_trail_test.sql`:

```sql
-- ============================================================
-- Self-checking test: the money trail (pgsql/money_flow_trail.sql).
-- BEGIN ... ROLLBACK; prints "ALL MONEY TRAIL CHECKS PASSED". Ids 998100000000001+.
--   psql ... -f pgsql/tests/money_trail_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/money_trail_test.sql
-- ============================================================
BEGIN;

INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998100000000001, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces") VALUES (998100000000002, 'XTU', 2);
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status) VALUES
  (998100000000011, 998100000000002, money_base_currency_id(), 26176.5, '2026-08-18T09:18:17Z', NULL),
  (998100000000012, 998100000000002, money_base_currency_id(), 26000, '2026-09-10T03:00:00Z', NULL);

-- quotation (1 Sep): 10 XTU + 8% and 1,000,000 VND + 8%
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998100000000101, 'line', '2026-09-01T02:00:00Z');
INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId") VALUES
  (998100000000111, 998100000000101, 'Trademark', 10, 1, 8, 998100000000002),
  (998100000000112, 998100000000101, 'Setup', 1000000, 1, 8, money_base_currency_id());
-- contract signed 15 Sep: the trademark price went up to 12 XTU
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "signedAt", "createdAt")
VALUES (998100000000201, 'TR-1', 'Trail', 'byCase', 'line', 'execution', '2026-09-15T02:00:00Z', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt") VALUES (998100000000202, 998100000000201, 'in_progress', '2026-09-20T02:00:00Z');
INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId") VALUES
  (998100000000221, 998100000000202, 'Trademark', 12, 8, 998100000000002),
  (998100000000222, 998100000000202, 'Setup', 1000000, 8, money_base_currency_id());
INSERT INTO "contractServices" (id, "contractId", "projectServiceId", "quotationServiceId", "serviceName", "basePrice", quantity, vat, "currencyId") VALUES
  (998100000000211, 998100000000201, 998100000000221, 998100000000111, 'Trademark', 12, 1, 8, 998100000000002),
  (998100000000212, 998100000000201, 998100000000222, 998100000000112, 'Setup', 1000000, 1, 8, money_base_currency_id());
-- installment 1: 50%, untagged -> spread over both services
INSERT INTO "contractPaymentSchedules" (id, "contractId", "installmentNo", label, percentage, amount, "triggerType")
VALUES (998100000000231, 998100000000201, 1, 'Đợt 1', 50, 708480, 'on_task_done');
-- a request for the trademark alone, and a retainer-period request
INSERT INTO "paymentRequests" (id, "contractId", "contractServiceId", status, "requestedAmount")
VALUES (998100000000241, 998100000000201, 998100000000211, 'active', 336960);
INSERT INTO "paymentRequests" (id, "contractId", "billingPlanId", status, "requestedAmount")
VALUES (998100000000242, 998100000000201, 998100000000299, 'active', 1000);

DO $$
DECLARE v_pr1 bigint; r RECORD; n bigint;
BEGIN
  SELECT id INTO v_pr1 FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 998100000000231;
  INSERT INTO invoices (id, "invoiceNumber", status, "totalAmount", "paymentRequestId", "contractId")
  VALUES (998100000000251, 'INV-TR-1', 'issued', 708480, v_pr1, 998100000000201);
  INSERT INTO payments (id, amount, "paymentStatus", "paymentDate", "contractId", "invoiceId", "currencyId", "exchangeRateToBase") VALUES
    (998100000000261, 708480, 'Received', now(), 998100000000201, 998100000000251, money_base_currency_id(), 1);
  -- 12.96 XTU received at 27,000 (the contract froze 26,000)
  INSERT INTO payments (id, amount, "paymentStatus", "paymentDate", "contractId", "paymentRequestId", "currencyId", "exchangeRateToBase") VALUES
    (998100000000262, 12.96, 'Received', now(), 998100000000201, 998100000000241, 998100000000002, 27000);
  -- money nobody can place
  INSERT INTO payments (id, amount, "paymentStatus", "paymentDate") VALUES (998100000000263, 5000, 'Received', now());

  SELECT * INTO r FROM finance_service_money_trail WHERE contract_service_id = 998100000000211;
  IF (r.quoted_native, r.quoted_rate, r.quoted_vnd) IS DISTINCT FROM (10.8, 26176.5, 282706::numeric) THEN
    RAISE EXCEPTION 'FAIL: quoted 10.80 XTU at 26176.5 = 282706 (got %, %, %)', r.quoted_native, r.quoted_rate, r.quoted_vnd;
  END IF;
  IF (r.contracted_native, r.contracted_rate, r.contracted_vnd, r.case_vnd)
     IS DISTINCT FROM (12.96, 26000::numeric, 336960::numeric, 336960::numeric) THEN
    RAISE EXCEPTION 'FAIL: contracted 12.96 XTU at 26000 = 336960, case the same (got %, %, %, %)',
      r.contracted_native, r.contracted_rate, r.contracted_vnd, r.case_vnd;
  END IF;
  IF (r.price_change, r.fx_quote_to_contract) IS DISTINCT FROM (56160::numeric, -1906::numeric) THEN
    RAISE EXCEPTION 'FAIL: 54254 more = 56160 price + -1906 rate (got %, %)', r.price_change, r.fx_quote_to_contract;
  END IF;
  IF (r.requested, r.invoiced, r.paid, r.outstanding, r.fx_on_payment)
     IS DISTINCT FROM (505440::numeric, 168480::numeric, 518400::numeric, -181440::numeric, 12960::numeric) THEN
    RAISE EXCEPTION 'FAIL: trademark requested/invoiced/paid/outstanding/fx (got %, %, %, %, %)',
      r.requested, r.invoiced, r.paid, r.outstanding, r.fx_on_payment;
  END IF;

  SELECT * INTO r FROM finance_service_money_trail WHERE contract_service_id = 998100000000212;
  IF (r.quoted_vnd, r.contracted_vnd, r.price_change, r.fx_quote_to_contract, r.requested, r.invoiced, r.paid)
     IS DISTINCT FROM (1080000::numeric, 1080000::numeric, 0::numeric, 0::numeric, 540000::numeric, 540000::numeric, 540000::numeric) THEN
    RAISE EXCEPTION 'FAIL: setup line (got %)', r;
  END IF;

  IF (SELECT requested FROM finance_contract_retainer_trail WHERE contract_id = 998100000000201) <> 1000 THEN
    RAISE EXCEPTION 'FAIL: the retainer request is kept apart';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM finance_unallocated_money WHERE kind = 'payment' AND record_id = 998100000000263 AND amount_vnd = 5000) THEN
    RAISE EXCEPTION 'FAIL: a payment linked to nothing is listed as unallocated';
  END IF;

  SELECT count(*) INTO n FROM money_consistency_violations
  WHERE contract_id = 998100000000201 OR record_id BETWEEN 998100000000000 AND 998100999999999;
  IF n <> 0 THEN
    RAISE EXCEPTION 'FAIL: the audit finds nothing wrong (got % rows)', n;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL MONEY TRAIL CHECKS PASSED'; END $$;
ROLLBACK;
```

- [ ] **Step 2: Run it to see it fail**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_trail_test.sql`.
  Expected: `relation "finance_service_money_trail" does not exist`.

- [ ] **Step 3: Write the trail** — append to `pgsql/money_flow_trail.sql`:

```sql
-- ---- 1. What each service of a contract is worth (VND); Σ = the contract total
-- Same priority as by_service_service_amount(): a locked
-- paymentAllocatedAmount, else the line's total (line pricing), else its
-- share of what the contract total leaves (combo services split by catalog
-- price when every one has one, otherwise equally; largest remainder).
CREATE OR REPLACE FUNCTION public.money_contract_service_values(p_contract_id bigint)
RETURNS TABLE (contract_service_id bigint, project_service_id bigint, value numeric)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_total numeric := COALESCE(contract_resolved_total(p_contract_id), 0);
  v_fixed numeric := 0;
  v_ids bigint[];
  v_ps bigint[];
  v_w numeric[];
  v_split numeric[];
  r RECORD;
  i integer;
BEGIN
  FOR r IN
    SELECT cs.id,
           cs."projectServiceId" AS ps_id,
           COALESCE(NULLIF(to_jsonb(cs)->>'paymentAllocatedAmount', '')::numeric,
                    NULLIF(to_jsonb(ps)->>'paymentAllocatedAmount', '')::numeric) AS locked,
           lower(COALESCE(cs."pricingMode", '')) = 'package' AS pkg,
           COALESCE(cs."totalAmount", 0)::numeric AS line_total,
           COALESCE(s."basePrice", 0)::numeric AS weight
    FROM "contractServices" cs
    LEFT JOIN "projectServices" ps ON ps.id = cs."projectServiceId"
    LEFT JOIN services s ON s.id = COALESCE(NULLIF(to_jsonb(cs)->>'ServiceId', '')::bigint, ps."serviceId")
    WHERE cs."contractId" = p_contract_id AND money_line_active(cs."lineStatus")
    ORDER BY cs.id
  LOOP
    IF r.locked IS NOT NULL OR NOT r.pkg THEN
      contract_service_id := r.id;
      project_service_id := r.ps_id;
      value := COALESCE(r.locked, r.line_total);
      v_fixed := v_fixed + value;
      RETURN NEXT;
    ELSE
      v_ids := array_append(v_ids, r.id);
      v_ps := array_append(v_ps, r.ps_id);
      v_w := array_append(v_w, r.weight);
    END IF;
  END LOOP;
  IF v_ids IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_w) AS w WHERE w <= 0) THEN
    v_w := array_fill(1::numeric, ARRAY[array_length(v_ids, 1)]);
  END IF;
  v_split := money_split(GREATEST(v_total - v_fixed, 0), v_w, 0);
  FOR i IN 1..array_length(v_ids, 1) LOOP
    contract_service_id := v_ids[i];
    project_service_id := v_ps[i];
    value := v_split[i];
    RETURN NEXT;
  END LOOP;
END;
$f$;

-- ---- 2. A payment request split over services (spec §8.2, first match wins):
-- its own service; else its paymentRequestServices; else its installment's
-- tagged services; else every service of the contract. Weights: the
-- services' contract values. A retainer request (billingPlanId) has none.
CREATE OR REPLACE FUNCTION public.money_payment_request_allocation(p_pr_id bigint)
RETURNS TABLE (contract_service_id bigint, project_service_id bigint, amount numeric)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  pr RECORD;
  v_filter bigint[];
  v_ids bigint[];
  v_ps bigint[];
  v_w numeric[];
  v_split numeric[];
  i integer;
BEGIN
  SELECT p.id, p."contractId", p."contractServiceId", p."projectServiceId", p."contractPaymentScheduleId",
         p."billingPlanId", COALESCE(p."requestedAmount", 0)::numeric AS requested
  INTO pr
  FROM "paymentRequests" p WHERE p.id = p_pr_id;
  IF pr.id IS NULL OR pr."billingPlanId" IS NOT NULL THEN
    RETURN;
  END IF;
  IF pr."contractServiceId" IS NOT NULL OR pr."projectServiceId" IS NOT NULL THEN
    contract_service_id := COALESCE(pr."contractServiceId",
      (SELECT cs.id FROM "contractServices" cs WHERE cs."projectServiceId" = pr."projectServiceId" ORDER BY cs.id LIMIT 1));
    project_service_id := COALESCE(pr."projectServiceId",
      (SELECT cs."projectServiceId" FROM "contractServices" cs WHERE cs.id = pr."contractServiceId"));
    amount := pr.requested;
    RETURN NEXT;
    RETURN;
  END IF;
  IF pr."contractId" IS NULL THEN
    RETURN;
  END IF;
  SELECT array_agg(x."contractServiceId") INTO v_filter
  FROM "paymentRequestServices" x WHERE x."paymentRequestId" = pr.id;
  IF v_filter IS NULL AND pr."contractPaymentScheduleId" IS NOT NULL THEN
    SELECT array_agg(y."contractServiceId") INTO v_filter
    FROM "contractPaymentScheduleServices" y WHERE y."contractPaymentScheduleId" = pr."contractPaymentScheduleId";
  END IF;
  SELECT array_agg(v.contract_service_id ORDER BY v.contract_service_id),
         array_agg(v.project_service_id ORDER BY v.contract_service_id),
         array_agg(v.value ORDER BY v.contract_service_id)
  INTO v_ids, v_ps, v_w
  FROM money_contract_service_values(pr."contractId") v
  WHERE v_filter IS NULL OR v.contract_service_id = ANY (v_filter);
  IF v_ids IS NULL THEN
    RETURN;
  END IF;
  v_split := money_split(pr.requested, v_w, 0);
  FOR i IN 1..array_length(v_ids, 1) LOOP
    contract_service_id := v_ids[i];
    project_service_id := v_ps[i];
    amount := v_split[i];
    RETURN NEXT;
  END LOOP;
END;
$f$;

-- An invoice / payment amount split like its request (or, linked only to a
-- contract, like the contract's services). Nothing -> no rows (unallocated).
CREATE OR REPLACE FUNCTION public.money_allocate_by(p_total numeric, p_pr_id bigint, p_contract_id bigint)
RETURNS TABLE (contract_service_id bigint, project_service_id bigint, amount numeric)
LANGUAGE plpgsql
STABLE
AS $f$
DECLARE
  v_ids bigint[];
  v_ps bigint[];
  v_w numeric[];
  v_split numeric[];
  i integer;
BEGIN
  IF p_pr_id IS NOT NULL THEN
    SELECT array_agg(a.contract_service_id ORDER BY COALESCE(a.contract_service_id, a.project_service_id)),
           array_agg(a.project_service_id ORDER BY COALESCE(a.contract_service_id, a.project_service_id)),
           array_agg(a.amount ORDER BY COALESCE(a.contract_service_id, a.project_service_id))
    INTO v_ids, v_ps, v_w
    FROM money_payment_request_allocation(p_pr_id) a;
  ELSIF p_contract_id IS NOT NULL THEN
    SELECT array_agg(v.contract_service_id ORDER BY v.contract_service_id),
           array_agg(v.project_service_id ORDER BY v.contract_service_id),
           array_agg(v.value ORDER BY v.contract_service_id)
    INTO v_ids, v_ps, v_w
    FROM money_contract_service_values(p_contract_id) v;
  END IF;
  IF v_w IS NULL THEN
    RETURN;
  END IF;
  v_split := money_split(COALESCE(p_total, 0), v_w, 0);
  FOR i IN 1..array_length(v_w, 1) LOOP
    contract_service_id := v_ids[i];
    project_service_id := v_ps[i];
    amount := v_split[i];
    RETURN NEXT;
  END LOOP;
END;
$f$;

-- ---- 3. Allocation views (computed on read: nothing to keep in sync)
CREATE OR REPLACE VIEW public.money_pr_allocations AS
SELECT pr.id AS payment_request_id, pr."contractId" AS contract_id,
       a.contract_service_id, a.project_service_id, a.amount
FROM "paymentRequests" pr
CROSS JOIN LATERAL money_payment_request_allocation(pr.id) a
WHERE lower(COALESCE(pr.status, '')) NOT IN ('cancelled', 'canceled');

CREATE OR REPLACE VIEW public.money_invoice_allocations AS
SELECT i.id AS invoice_id, COALESCE(i."contractId", pr."contractId") AS contract_id,
       a.contract_service_id, a.project_service_id, a.amount
FROM invoices i
LEFT JOIN "paymentRequests" pr ON pr.id = i."paymentRequestId"
CROSS JOIN LATERAL money_allocate_by(i."totalAmount"::numeric, i."paymentRequestId", COALESCE(i."contractId", pr."contractId")) a
WHERE lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled');

CREATE OR REPLACE VIEW public.money_payment_allocations AS
SELECT p.id AS payment_id, COALESCE(p."contractId", i."contractId") AS contract_id,
       a.contract_service_id, a.project_service_id, a.amount,
       p."currencyId" AS payment_currency_id,
       COALESCE(p.amount, 0)::numeric AS payment_native,
       finance_payment_vnd(to_jsonb(p)) AS payment_vnd
FROM payments p
LEFT JOIN invoices i ON i.id = p."invoiceId"
CROSS JOIN LATERAL money_allocate_by(
  finance_payment_vnd(to_jsonb(p)),
  COALESCE(p."paymentRequestId", i."paymentRequestId"),
  COALESCE(p."contractId", i."contractId")) a
WHERE finance_is_received(p."paymentStatus");

-- ---- 4. The trail: one row per contract service (or per case service of a
-- case without a contract). Differences explained: price_change +
-- fx_quote_to_contract = contracted_vnd - quoted_vnd exactly.
CREATE OR REPLACE VIEW public.finance_service_money_trail AS
WITH base AS (
  SELECT cs."contractId" AS contract_id,
         COALESCE(cs."projectId", ps."projectId") AS project_id,
         COALESCE(cs."quotationServiceId", ps."quotationServiceId") AS quotation_service_id,
         cs.id AS contract_service_id,
         cs."projectServiceId" AS project_service_id,
         COALESCE(cs."serviceName", ps."serviceName") AS service_name,
         cs."currencyId" AS currency_id,
         lower(COALESCE(cs."pricingMode", '')) = 'package' AS is_package,
         cs."totalAmountNative"::numeric AS contracted_native,
         cs."exchangeRateToBase"::numeric AS contracted_rate,
         v.value AS contracted_vnd,
         ps."totalAmount"::numeric AS case_vnd
  FROM (SELECT DISTINCT "contractId" FROM "contractServices" WHERE "contractId" IS NOT NULL) c
  CROSS JOIN LATERAL money_contract_service_values(c."contractId") v
  JOIN "contractServices" cs ON cs.id = v.contract_service_id
  LEFT JOIN "projectServices" ps ON ps.id = cs."projectServiceId"
  UNION ALL
  SELECT NULL, ps."projectId", ps."quotationServiceId", NULL, ps.id, ps."serviceName", ps."currencyId",
         lower(COALESCE(ps."pricingMode", '')) = 'package', NULL, NULL, NULL, ps."totalAmount"::numeric
  FROM "projectServices" ps
  WHERE money_line_active(ps.status)
    AND NOT EXISTS (SELECT 1 FROM "contractServices" cs WHERE cs."projectServiceId" = ps.id)
),
money AS (
  SELECT b.*,
    (SELECT COALESCE(sum(a.amount), 0) FROM money_pr_allocations a
      WHERE (b.contract_service_id IS NOT NULL AND a.contract_service_id = b.contract_service_id)
         OR (b.contract_service_id IS NULL AND a.contract_service_id IS NULL AND a.project_service_id = b.project_service_id)) AS requested,
    (SELECT COALESCE(sum(a.amount), 0) FROM money_invoice_allocations a
      WHERE (b.contract_service_id IS NOT NULL AND a.contract_service_id = b.contract_service_id)
         OR (b.contract_service_id IS NULL AND a.contract_service_id IS NULL AND a.project_service_id = b.project_service_id)) AS invoiced,
    (SELECT COALESCE(sum(a.amount), 0) FROM money_payment_allocations a
      WHERE (b.contract_service_id IS NOT NULL AND a.contract_service_id = b.contract_service_id)
         OR (b.contract_service_id IS NULL AND a.contract_service_id IS NULL AND a.project_service_id = b.project_service_id)) AS paid,
    (SELECT COALESCE(sum(a.amount - round(a.amount / a.payment_vnd * a.payment_native * b.contracted_rate, 0)), 0)
       FROM money_payment_allocations a
      WHERE a.contract_service_id = b.contract_service_id
        AND a.payment_currency_id IS NOT DISTINCT FROM b.currency_id
        AND NOT money_is_base(a.payment_currency_id)
        AND a.payment_vnd > 0 AND b.contracted_rate IS NOT NULL) AS fx_on_payment
  FROM base b
)
SELECT m.contract_id, m.project_id, m.quotation_service_id, m.contract_service_id, m.project_service_id,
       m.service_name, money_currency_code(m.currency_id) AS currency_code, m.is_package,
       qs."totalAmountNative"::numeric AS quoted_native,
       qs."exchangeRateToBase"::numeric AS quoted_rate,
       qs."totalAmount"::numeric AS quoted_vnd,
       m.contracted_native, m.contracted_rate, m.contracted_vnd, m.case_vnd,
       d.price_change,
       CASE WHEN d.price_change IS NOT NULL
            THEN (m.contracted_vnd - qs."totalAmount"::numeric) - d.price_change END AS fx_quote_to_contract,
       m.requested, m.invoiced, m.paid,
       COALESCE(m.contracted_vnd, m.case_vnd, 0) - m.paid AS outstanding,
       m.fx_on_payment
FROM money m
LEFT JOIN "quotationServices" qs ON qs.id = m.quotation_service_id
LEFT JOIN LATERAL (
  SELECT CASE
    WHEN NOT m.is_package
     AND lower(COALESCE(qs."pricingMode", '')) <> 'package'
     AND qs."currencyId" IS NOT DISTINCT FROM m.currency_id
     AND qs."totalAmountNative" IS NOT NULL
     AND m.contracted_native IS NOT NULL
     AND m.contracted_rate IS NOT NULL
    THEN round((m.contracted_native - qs."totalAmountNative"::numeric) * m.contracted_rate, 0)
  END AS price_change
) d ON true;

-- ---- 5. Money that belongs to no service
CREATE OR REPLACE VIEW public.finance_contract_retainer_trail AS
SELECT c.id AS contract_id,
  (SELECT COALESCE(sum(pr."requestedAmount"), 0)::numeric FROM "paymentRequests" pr
    WHERE pr."contractId" = c.id AND pr."billingPlanId" IS NOT NULL
      AND lower(COALESCE(pr.status, '')) NOT IN ('cancelled', 'canceled')) AS requested,
  (SELECT COALESCE(sum(i."totalAmount"), 0)::numeric FROM invoices i
    JOIN "paymentRequests" pr ON pr.id = i."paymentRequestId"
    WHERE pr."contractId" = c.id AND pr."billingPlanId" IS NOT NULL
      AND lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled')) AS invoiced,
  (SELECT COALESCE(sum(finance_payment_vnd(to_jsonb(p))), 0) FROM payments p
    LEFT JOIN invoices i ON i.id = p."invoiceId"
    JOIN "paymentRequests" pr ON pr.id = COALESCE(p."paymentRequestId", i."paymentRequestId")
    WHERE pr."contractId" = c.id AND pr."billingPlanId" IS NOT NULL
      AND finance_is_received(p."paymentStatus")) AS paid
FROM contracts c
WHERE c."contractType" = 'retainer'
   OR EXISTS (SELECT 1 FROM "paymentRequests" pr WHERE pr."contractId" = c.id AND pr."billingPlanId" IS NOT NULL);

CREATE OR REPLACE VIEW public.finance_unallocated_money AS
SELECT 'payment_request'::text AS kind, pr.id AS record_id, pr."contractId" AS contract_id,
       COALESCE(pr."requestedAmount", 0)::numeric AS amount_vnd
FROM "paymentRequests" pr
WHERE lower(COALESCE(pr.status, '')) NOT IN ('cancelled', 'canceled')
  AND pr."billingPlanId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM money_pr_allocations a WHERE a.payment_request_id = pr.id)
UNION ALL
SELECT 'invoice', i.id, i."contractId", COALESCE(i."totalAmount", 0)::numeric
FROM invoices i
LEFT JOIN "paymentRequests" pr ON pr.id = i."paymentRequestId"
WHERE lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled')
  AND pr."billingPlanId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM money_invoice_allocations a WHERE a.invoice_id = i.id)
UNION ALL
SELECT 'payment', p.id, p."contractId", finance_payment_vnd(to_jsonb(p))
FROM payments p
LEFT JOIN invoices i ON i.id = p."invoiceId"
LEFT JOIN "paymentRequests" pr ON pr.id = COALESCE(p."paymentRequestId", i."paymentRequestId")
WHERE finance_is_received(p."paymentStatus")
  AND pr."billingPlanId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM money_payment_allocations a WHERE a.payment_id = p.id);

-- ---- 6. Consistency audit (spec §7.5): one row per violation; 0 rows = consistent
CREATE OR REPLACE VIEW public.money_consistency_violations AS
WITH lines AS (
  SELECT 'quotationServices'::text AS table_name, l.id, NULL::bigint AS contract_id, to_jsonb(l) AS j
  FROM "quotationServices" l
  UNION ALL
  SELECT 'contractServices', l.id, l."contractId", to_jsonb(l) FROM "contractServices" l
  UNION ALL
  SELECT 'projectServices', l.id, p."contractId", to_jsonb(l)
  FROM "projectServices" l LEFT JOIN projects p ON p.id = l."projectId"
),
priced AS (
  SELECT table_name, id, contract_id, j,
         NULLIF(j->>'currencyId', '')::bigint AS currency_id,
         NULLIF(j->>'exchangeRateToBase', '')::numeric AS rate,
         NULLIF(j->>'subTotal', '')::numeric AS sub,
         NULLIF(j->>'vatAmount', '')::numeric AS vat,
         NULLIF(j->>'totalAmount', '')::numeric AS total
  FROM lines WHERE money_line_priced(j)
)
SELECT 'line_parts'::text AS rule, table_name, id AS record_id, contract_id,
       format('%s + %s <> %s', sub, vat, total) AS detail
FROM priced
WHERE COALESCE(sub, 0) + COALESCE(vat, 0) <> COALESCE(total, 0)
UNION ALL
SELECT 'missing_rate', table_name, id, contract_id, format('%s line without a frozen rate', money_currency_code(currency_id))
FROM priced
WHERE rate IS NULL
UNION ALL
SELECT 'line_recompute', p.table_name, p.id, p.contract_id, format('stored %s, recomputed %s', p.total, a.total_vnd)
FROM priced p
CROSS JOIN LATERAL money_line_amounts(
  NULLIF(p.j->>'basePrice', '')::numeric, NULLIF(p.j->>'quantity', '')::numeric,
  NULLIF(p.j->>'vat', '')::numeric, money_decimals(p.currency_id), p.rate) a
WHERE p.rate IS NOT NULL AND a.total_vnd IS DISTINCT FROM p.total
UNION ALL
SELECT 'case_line_vs_contract_line', 'projectServices', ps.id, cs."contractId",
       format('case %s, contract %s', ps."totalAmount", cs."totalAmount")
FROM "contractServices" cs
JOIN "projectServices" ps ON ps.id = cs."projectServiceId"
WHERE money_line_priced(to_jsonb(cs)) AND money_line_priced(to_jsonb(ps))
  AND ps."currencyId" IS NOT DISTINCT FROM cs."currencyId"
  AND ps."basePrice" IS NOT DISTINCT FROM cs."basePrice"
  AND ps.vat IS NOT DISTINCT FROM cs.vat
  AND ps."totalAmount" IS DISTINCT FROM cs."totalAmount"
UNION ALL
SELECT 'header_total', 'quotations', q.id, NULL, format('stored %s, lines %s', q."totalAmount", t.total)
FROM quotations q
CROSS JOIN LATERAL money_line_totals('quotationServices', q.id) t
WHERE lower(COALESCE(q."pricingMode", '')) <> 'package' AND t.total IS NOT NULL
  AND q."totalAmount"::numeric IS DISTINCT FROM t.total
UNION ALL
SELECT 'header_total', 'contracts', c.id, c.id, format('stored %s / %s / %s, lines %s / %s / %s',
       c."subTotal", c."vatAmount", c."totalAmount", t.sub, t.vat, t.total)
FROM contracts c
CROSS JOIN LATERAL money_line_totals('contractServices', c.id) t
WHERE COALESCE(c."contractType", '') <> 'retainer' AND lower(COALESCE(c."pricingMode", '')) <> 'package'
  AND t.total IS NOT NULL
  AND (c."totalAmount"::numeric IS DISTINCT FROM t.total
    OR c."subTotal"::numeric IS DISTINCT FROM t.sub
    OR c."vatAmount"::numeric IS DISTINCT FROM t.vat)
UNION ALL
SELECT 'header_total', 'projects', p.id, p."contractId", format('stored %s, services %s', p."totalAmount", t.total)
FROM projects p
CROSS JOIN LATERAL money_line_totals('projectServices', p.id) t
WHERE t.total IS NOT NULL AND p."totalAmount"::numeric IS DISTINCT FROM t.total
UNION ALL
SELECT 'installments_sum', 'contracts', c.id, c.id, format('installments %s, total %s', x.s, contract_resolved_total(c.id))
FROM contracts c
CROSS JOIN LATERAL (
  SELECT sum(s.amount)::numeric AS s, sum(s.percentage)::numeric AS pct
  FROM "contractPaymentSchedules" s WHERE s."contractId" = c.id AND s.percentage > 0
) x
WHERE COALESCE(c."contractType", '') NOT IN ('retainer', 'byService')
  AND x.pct IS NOT NULL AND abs(x.pct - 100) <= 0.01
  AND x.s IS DISTINCT FROM contract_resolved_total(c.id)
UNION ALL
SELECT 'service_values_sum', 'contracts', c.id, c.id, format('services %s, total %s', x.s, contract_resolved_total(c.id))
FROM contracts c
CROSS JOIN LATERAL (SELECT sum(v.value) AS s, count(*) AS n FROM money_contract_service_values(c.id) v) x
WHERE COALESCE(c."contractType", '') <> 'retainer' AND x.n > 0
  AND x.s IS DISTINCT FROM contract_resolved_total(c.id)
UNION ALL
SELECT 'request_split', 'paymentRequests', pr.id, pr."contractId", format('services %s, request %s', a.s, pr."requestedAmount")
FROM "paymentRequests" pr
JOIN (SELECT payment_request_id, sum(amount) AS s FROM money_pr_allocations GROUP BY payment_request_id) a
  ON a.payment_request_id = pr.id
WHERE a.s IS DISTINCT FROM COALESCE(pr."requestedAmount", 0)::numeric
UNION ALL
SELECT 'invoice_split', 'invoices', i.id, a.contract_id, format('services %s, invoice %s', a.s, i."totalAmount")
FROM invoices i
JOIN (SELECT invoice_id, max(contract_id) AS contract_id, sum(amount) AS s FROM money_invoice_allocations GROUP BY invoice_id) a
  ON a.invoice_id = i.id
WHERE a.s IS DISTINCT FROM COALESCE(i."totalAmount", 0)::numeric
UNION ALL
SELECT 'payment_split', 'payments', p.id, a.contract_id, format('services %s, payment %s', a.s, a.vnd)
FROM payments p
JOIN (SELECT payment_id, max(contract_id) AS contract_id, sum(amount) AS s, max(payment_vnd) AS vnd
      FROM money_payment_allocations GROUP BY payment_id) a
  ON a.payment_id = p.id
WHERE a.s IS DISTINCT FROM a.vnd;
```

- [ ] **Step 4: Write the audit file** — create `pgsql/money_consistency_audit.sql`:

```sql
-- ============================================================
-- Money consistency audit (read-only). Run any time after
-- pgsql/money_flow_trail.sql; expected result: 0 rows.
-- Rules: docs/superpowers/specs/2026-09-29-money-flow-unification-design.md §7.5
-- ============================================================
SELECT rule, table_name, record_id, contract_id, detail
FROM money_consistency_violations
ORDER BY rule, table_name, record_id;
```

- [ ] **Step 5: Run the trail test to see it pass**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_trail_test.sql`.
  Expected: `NOTICE:  ALL MONEY TRAIL CHECKS PASSED`.

- [ ] **Step 6: Run the SQL regression**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/*_test.sql`.
  Expected: every file passes.

- [ ] **Step 7: Commit (by the user)** — files: `pgsql/money_flow_trail.sql`, `pgsql/money_consistency_audit.sql`, `pgsql/tests/money_trail_test.sql`. Message: `feat(pgsql): per-service money trail, allocations and consistency audit`.

---

### Task 8: Legacy data — preview and backfill

**Files:**
- Modify: `pgsql/money_flow_foundation.sql` (append section 9)
- Create: `pgsql/money_flow_backfill_preview.sql`
- Create: `pgsql/money_flow_backfill.sql`
- Create: `pgsql/tests/money_backfill_test.sql`

**Interfaces:**
- Consumes: `money_line_rate`, `money_line_amounts`, `money_decimals`, `money_currency_code`, `money_contract_billing_locked`, `money_line_priced`, `money_refresh_schedule` (Tasks 2–5); `money_consistency_violations` (Task 7).
- Produces:
  - View `money_backfill_preview(table_name, id, service_name, contract_id, currency, base_price, quantity, vat, stored_total, stored_rate, proposed_rate, proposed_rate_date, proposed_total_native, proposed_total, action)`.
  - `money_backfill_run() → TABLE(step text, affected bigint)`.

- [ ] **Step 1: Write the test** — create `pgsql/tests/money_backfill_test.sql`:

```sql
-- ============================================================
-- Self-checking test: fixing rows saved before the money triggers
-- (money_backfill_preview / money_backfill_run in pgsql/money_flow_foundation.sql).
-- BEGIN ... ROLLBACK; prints "ALL MONEY BACKFILL CHECKS PASSED". Ids 998200000000001+.
--   psql ... -f pgsql/tests/money_backfill_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/money_backfill_test.sql
-- On dev it recomputes every unbilled line inside the transaction and rolls
-- it back: it can take a little while.
-- ============================================================
BEGIN;

INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998200000000001, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces") VALUES (998200000000002, 'XTU', 2);
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status)
VALUES (998200000000011, 998200000000002, money_base_currency_id(), 26176.5, '2026-08-18T09:18:17Z', NULL);
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998200000000101, 'line', '2026-09-01T02:00:00Z');
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt") VALUES
  (998200000000201, 'BF-1', 'Unbilled', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z'),
  (998200000000202, 'BF-2', 'Billed', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt") VALUES (998200000000203, 998200000000201, 'in_progress', '2026-09-20T02:00:00Z');

-- rows as the old forms saved them (10 XTU + 8% stored as 11, no rate): written with the triggers off
ALTER TABLE "quotationServices" DISABLE TRIGGER USER;
ALTER TABLE "contractServices" DISABLE TRIGGER USER;
ALTER TABLE "projectServices" DISABLE TRIGGER USER;
INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId", "subTotal", "vatAmount", "totalAmount")
VALUES (998200000000111, 998200000000101, 'Legacy foreign', 10, 1, 8, 998200000000002, 10, 1, 11);
INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId", "subTotal", "vatAmount", "totalAmount")
VALUES (998200000000221, 998200000000203, 'Legacy foreign', 10, 8, 998200000000002, 10, 1, 11);
INSERT INTO "contractServices" (id, "contractId", "projectServiceId", "serviceName", "basePrice", quantity, vat, "currencyId", "subTotal", "vatAmount", "totalAmount") VALUES
  (998200000000211, 998200000000201, 998200000000221, 'Legacy foreign', 10, 1, 8, 998200000000002, 10, 1, 11),
  (998200000000212, 998200000000202, NULL, 'Legacy billed', 10, 1, 8, 998200000000002, 10, 1, 11);
ALTER TABLE "quotationServices" ENABLE TRIGGER USER;
ALTER TABLE "contractServices" ENABLE TRIGGER USER;
ALTER TABLE "projectServices" ENABLE TRIGGER USER;
INSERT INTO "paymentRequests" (id, "contractId", status, "requestedAmount") VALUES (998200000000231, 998200000000202, 'active', 11);

DO $$
DECLARE r RECORD; n bigint;
BEGIN
  SELECT * INTO r FROM money_backfill_preview WHERE table_name = 'quotationServices' AND id = 998200000000111;
  IF r.action <> 'will fix' OR r.proposed_total <> 282706 OR r.proposed_rate <> 26176.5 OR r.stored_total <> 11 THEN
    RAISE EXCEPTION 'FAIL: the preview proposes 282706 at 26176.5 for the "11" line (got %)', r;
  END IF;
  SELECT * INTO r FROM money_backfill_preview WHERE table_name = 'contractServices' AND id = 998200000000212;
  IF r.action <> 'protected: contract already billed' THEN
    RAISE EXCEPTION 'FAIL: a billed contract line is listed as protected (got %)', r.action;
  END IF;

  PERFORM * FROM money_backfill_run();

  SELECT * INTO r FROM "quotationServices" WHERE id = 998200000000111;
  IF (r."totalAmountNative", r."totalAmount", r."exchangeRateToBase") IS DISTINCT FROM (10.8::float8, 282706::float8, 26176.5::float8) THEN
    RAISE EXCEPTION 'FAIL: the quotation line is fixed (got %, %, %)', r."totalAmountNative", r."totalAmount", r."exchangeRateToBase";
  END IF;
  IF (SELECT "totalAmount" FROM "contractServices" WHERE id = 998200000000211) <> 282706
     OR (SELECT "totalAmount" FROM "projectServices" WHERE id = 998200000000221) <> 282706 THEN
    RAISE EXCEPTION 'FAIL: the contract line and its case line are fixed and equal';
  END IF;
  SELECT * INTO r FROM "contractServices" WHERE id = 998200000000212;
  IF r."totalAmount" <> 11 OR r."exchangeRateToBase" IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: the billed contract line is untouched (got %, %)', r."totalAmount", r."exchangeRateToBase";
  END IF;
  IF (SELECT "totalAmount" FROM contracts WHERE id = 998200000000201) <> 282706 THEN
    RAISE EXCEPTION 'FAIL: the contract total is recomputed';
  END IF;

  -- everything fixed is consistent; the billed contract (202) is left for a
  -- decision by hand and shows up in the audit, its line as missing_rate
  SELECT count(*) INTO n FROM money_consistency_violations
  WHERE (record_id BETWEEN 998200000000000 AND 998200999999999 OR contract_id BETWEEN 998200000000000 AND 998200999999999)
    AND contract_id IS DISTINCT FROM 998200000000202
    AND record_id NOT IN (998200000000202, 998200000000212);
  IF n <> 0 THEN
    RAISE EXCEPTION 'FAIL: after the backfill the fixed documents are consistent (got % rows)', n;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM money_consistency_violations WHERE rule = 'missing_rate' AND record_id = 998200000000212) THEN
    RAISE EXCEPTION 'FAIL: the protected line stays visible in the audit';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL MONEY BACKFILL CHECKS PASSED'; END $$;
ROLLBACK;
```

- [ ] **Step 2: Run it to see it fail**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_backfill_test.sql`.
  Expected: `relation "money_backfill_preview" does not exist`.

- [ ] **Step 3: Append section 9 to `pgsql/money_flow_foundation.sql`**

```sql
-- ---- 9. Rows saved before these triggers (spec §9)
-- Read-only: every priced line whose stored numbers differ from the
-- recomputation, with the proposed values. A line keeps a rate it already
-- has; one without gets the rate of its document date. Case lines are shown
-- with the rate they would get now; after the backfill they take their
-- contract line's rate (which the backfill freezes first).
CREATE OR REPLACE VIEW public.money_backfill_preview AS
WITH lines AS (
  SELECT 'quotationServices'::text AS table_name, qs.id, qs."serviceName" AS service_name,
         NULL::bigint AS contract_id, to_jsonb(qs) AS j
  FROM "quotationServices" qs
  UNION ALL
  SELECT 'contractServices', cs.id, cs."serviceName", cs."contractId", to_jsonb(cs) FROM "contractServices" cs
  UNION ALL
  SELECT 'projectServices', ps.id, ps."serviceName", p."contractId", to_jsonb(ps)
  FROM "projectServices" ps LEFT JOIN projects p ON p.id = ps."projectId"
),
priced AS (
  SELECT l.*,
         NULLIF(j->>'currencyId', '')::bigint AS currency_id,
         NULLIF(j->>'basePrice', '')::numeric AS base_price,
         COALESCE(NULLIF(NULLIF(j->>'quantity', '')::numeric, 0), 1) AS quantity,
         COALESCE(NULLIF(j->>'vat', '')::numeric, 0) AS vat,
         NULLIF(j->>'totalAmount', '')::numeric AS stored_total,
         NULLIF(j->>'exchangeRateToBase', '')::numeric AS stored_rate
  FROM lines l
  WHERE money_line_priced(j)
)
SELECT p.table_name, p.id, p.service_name, p.contract_id, money_currency_code(p.currency_id) AS currency,
       p.base_price, p.quantity, p.vat, p.stored_total, p.stored_rate,
       COALESCE(p.stored_rate, r.rate) AS proposed_rate,
       r.rate_date AS proposed_rate_date,
       a.total_native AS proposed_total_native,
       a.total_vnd AS proposed_total,
       CASE
         WHEN COALESCE(p.stored_rate, r.rate) IS NULL THEN 'missing rate'
         WHEN p.contract_id IS NOT NULL AND money_contract_billing_locked(p.contract_id) THEN 'protected: contract already billed'
         ELSE 'will fix'
       END AS action
FROM priced p
CROSS JOIN LATERAL money_line_rate(p.table_name, p.j) r
CROSS JOIN LATERAL money_line_amounts(p.base_price, p.quantity, p.vat, money_decimals(p.currency_id), COALESCE(p.stored_rate, r.rate)) a
WHERE p.stored_rate IS NULL OR a.total_vnd IS DISTINCT FROM p.stored_total;

-- Writes. Re-runs every priced / combo line through the triggers (a same-value
-- update: a stored rate is kept, a missing one is frozen at the document
-- date), then the document totals and the installment amounts. Skips the
-- lines of billed contracts and the lines whose currency has no rate at all:
-- both stay listed by the preview for a decision by hand.
CREATE OR REPLACE FUNCTION public.money_backfill_run()
RETURNS TABLE (step text, affected bigint)
LANGUAGE plpgsql
AS $f$
DECLARE
  n bigint;
BEGIN
  UPDATE "quotationServices" l SET "basePrice" = l."basePrice"
  WHERE (money_line_priced(to_jsonb(l)) OR lower(COALESCE(l."pricingMode", '')) = 'package')
    AND (l."exchangeRateToBase" IS NOT NULL OR (money_line_rate('quotationServices', to_jsonb(l))).rate IS NOT NULL);
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'quotation lines'; affected := n; RETURN NEXT;

  UPDATE "contractServices" l SET "basePrice" = l."basePrice"
  WHERE (money_line_priced(to_jsonb(l)) OR lower(COALESCE(l."pricingMode", '')) = 'package')
    AND NOT money_contract_billing_locked(l."contractId")
    AND (l."exchangeRateToBase" IS NOT NULL OR (money_line_rate('contractServices', to_jsonb(l))).rate IS NOT NULL);
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'contract lines'; affected := n; RETURN NEXT;

  UPDATE "projectServices" l SET "basePrice" = l."basePrice"
  WHERE (money_line_priced(to_jsonb(l)) OR lower(COALESCE(l."pricingMode", '')) = 'package')
    AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = l."projectId" AND money_contract_billing_locked(p."contractId"))
    AND (l."exchangeRateToBase" IS NOT NULL OR (money_line_rate('projectServices', to_jsonb(l))).rate IS NOT NULL);
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'case lines'; affected := n; RETURN NEXT;

  UPDATE quotations q SET "totalAmount" = q."totalAmount"
  WHERE EXISTS (SELECT 1 FROM "quotationServices" l WHERE l."quotationId" = q.id AND money_line_priced(to_jsonb(l)));
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'quotation totals'; affected := n; RETURN NEXT;

  UPDATE contracts c SET "totalAmount" = c."totalAmount"
  WHERE NOT money_contract_billing_locked(c.id)
    AND EXISTS (SELECT 1 FROM "contractServices" l WHERE l."contractId" = c.id AND money_line_priced(to_jsonb(l)));
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'contract totals'; affected := n; RETURN NEXT;

  UPDATE projects p SET "totalAmount" = p."totalAmount"
  WHERE NOT money_contract_billing_locked(p."contractId")
    AND EXISTS (SELECT 1 FROM "projectServices" l WHERE l."projectId" = p.id AND money_line_priced(to_jsonb(l)));
  GET DIAGNOSTICS n = ROW_COUNT;
  step := 'case totals'; affected := n; RETURN NEXT;

  PERFORM money_refresh_schedule(c.id) FROM contracts c WHERE NOT money_contract_billing_locked(c.id);
  step := 'installments'; affected := NULL; RETURN NEXT;
END;
$f$;
```

- [ ] **Step 4: Write the two runner files**

  Create `pgsql/money_flow_backfill_preview.sql`:

```sql
-- ============================================================
-- Money backfill PREVIEW (read-only). Review before running
-- pgsql/money_flow_backfill.sql. Rows:
--   'will fix'                            -> the backfill fixes it;
--   'protected: contract already billed'  -> decide by hand (a request is
--       active / invoiced / paid); to fix one contract anyway, run
--       UPDATE "contractServices" SET "exchangeRateToBase" = NULL WHERE "contractId" = <id>;
--   'missing rate'                        -> add the currency's rate to
--       Exchange Rates first, then run the backfill again.
-- ============================================================
SELECT action, table_name, id, service_name, contract_id, currency, base_price, quantity, vat,
       stored_total, stored_rate, proposed_rate, proposed_rate_date, proposed_total_native, proposed_total
FROM money_backfill_preview
ORDER BY action, table_name, id;
```

  Create `pgsql/money_flow_backfill.sql`:

```sql
-- ============================================================
-- Money BACKFILL (writes). Run only after reviewing
-- pgsql/money_flow_backfill_preview.sql. Then run
-- pgsql/money_consistency_audit.sql: only 'protected' and 'missing rate'
-- lines may remain.
-- ============================================================
BEGIN;
SELECT * FROM money_backfill_run();
COMMIT;
```

- [ ] **Step 5: Run the test to see it pass**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/money_backfill_test.sql`.
  Expected: `NOTICE:  ALL MONEY BACKFILL CHECKS PASSED`.

- [ ] **Step 6: Run the SQL regression**

  Run `bash scripts/tests/sql/run-local.sh pgsql/tests/*_test.sql`.
  Expected: every file passes.

- [ ] **Step 7: Commit (by the user)** — files:
  - `pgsql/money_flow_foundation.sql`
  - `pgsql/money_flow_backfill_preview.sql`
  - `pgsql/money_flow_backfill.sql`
  - `pgsql/tests/money_backfill_test.sql`

  Message: `feat(pgsql): legacy money preview and backfill`.

---

### Task 9: Register the fields in NocoBase

**Files:**
- Create: `JsField/RegisterMoneyFlowFields.js`
- Create: `scripts/tests/money-flow-fields.test.js`

**Interfaces:**
- Consumes: the columns from Task 1 (they must exist before the script runs: it only adds NocoBase metadata).
- Produces: API-visible fields `exchangeRateToBase`, `exchangeRateDate`, `subTotalNative`, `vatAmountNative`, `totalAmountNative` on the three line collections, and `projectServices.quotationServiceId`.

- [ ] **Step 1: Write the static test** — create `scripts/tests/money-flow-fields.test.js`:

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 2026-09-29: the money-flow columns must be NocoBase fields, or the API
// silently drops them (the reason exchangeRateToBase was never saved).
const src = fs.readFileSync(path.resolve(__dirname, "../../JsField/RegisterMoneyFlowFields.js"), "utf8");
for (const name of ["exchangeRateToBase", "exchangeRateDate", "subTotalNative", "vatAmountNative", "totalAmountNative"]) {
  assert.ok(new RegExp(`name: "${name}"`).test(src), `registers ${name}`);
}
for (const collection of ["quotationServices", "contractServices", "projectServices"]) {
  assert.ok(src.includes(`"${collection}"`), `on ${collection}`);
}
assert.ok(/registerField\("projectServices", \{\s*name: "quotationServiceId"/.test(src), "projectServices.quotationServiceId");
assert.ok(/fields:list/.test(src) && /\[skip\]/.test(src), "idempotent: skips existing fields");
console.log("money-flow-fields: all tests passed");
```

- [ ] **Step 2: Run it to see it fail**

  Run `node scripts/tests/money-flow-fields.test.js`.
  Expected: `ENOENT … RegisterMoneyFlowFields.js`.

- [ ] **Step 3: Write the script** — create `JsField/RegisterMoneyFlowFields.js`:

```js
// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers, as NocoBase fields, the columns pgsql/money_flow_foundation.sql
// adds (docs/superpowers/specs/2026-09-29-money-flow-unification-design.md §5):
//   on quotationServices / contractServices / projectServices —
//     exchangeRateToBase, exchangeRateDate, subTotalNative, vatAmountNative,
//     totalAmountNative;
//   on projectServices — quotationServiceId (CaseCreateForm.js already sends it).
// The columns already exist in Postgres; without this metadata the API
// silently drops them (why exchangeRateToBase was never saved before).
//
// How to run: AFTER pgsql/money_flow_foundation.sql, paste into a temporary
// NocoBase JS Block / Action onClick, or the browser dev console on an admin
// page (ctx in scope). Idempotent — skips fields that already exist.
// ============================================================
const numberField = (name, title, step) => ({
  name,
  type: "double",
  interface: "number",
  uiSchema: {
    type: "number",
    "x-component": "InputNumber",
    "x-component-props": { stringMode: true, step },
    title,
  },
});

const MONEY_FLOW_FIELDS = [
  numberField("exchangeRateToBase", "Exchange Rate To VND", "0.000001"),
  {
    name: "exchangeRateDate",
    type: "dateOnly",
    interface: "date",
    uiSchema: {
      type: "string",
      "x-component": "DatePicker",
      "x-component-props": { dateOnly: true },
      title: "Exchange Rate Date",
    },
  },
  numberField("subTotalNative", "Subtotal (line currency)", "0.01"),
  numberField("vatAmountNative", "VAT (line currency)", "0.01"),
  numberField("totalAmountNative", "Total (line currency)", "0.01"),
];

const registerField = async (collectionName, fieldPayload) => {
  const existing = await ctx.api.request({
    url: `collections/${collectionName}/fields:list`,
    params: { paginate: false },
  });
  const already = (existing?.data?.data || []).some((f) => f.name === fieldPayload.name);
  if (already) {
    console.log(`[skip] ${collectionName}.${fieldPayload.name} already registered`);
    return;
  }
  await ctx.api.request({
    url: `collections/${collectionName}/fields:create`,
    method: "POST",
    data: fieldPayload,
  });
  console.log(`[created] ${collectionName}.${fieldPayload.name}`);
};

for (const collection of ["quotationServices", "contractServices", "projectServices"]) {
  for (const field of MONEY_FLOW_FIELDS) {
    await registerField(collection, field);
  }
}
await registerField("projectServices", {
  name: "quotationServiceId",
  type: "bigInt",
  interface: "integer",
  uiSchema: {
    type: "number",
    "x-component": "InputNumber",
    "x-component-props": { stringMode: true, step: "1" },
    title: "Quotation Service Id",
  },
});
console.log("[done] money flow fields");
```

- [ ] **Step 4: Run it to see it pass**

  Run `node scripts/tests/money-flow-fields.test.js`.
  Expected: `money-flow-fields: all tests passed`.

- [ ] **Step 5: Commit (by the user)** — files: `JsField/RegisterMoneyFlowFields.js`, `scripts/tests/money-flow-fields.test.js`. Message: `feat(jsfield): register the money-flow fields`.

---

### Task 10: Decimal price inputs and 2-decimal display

**Files:**
- Modify: `All Module/Quotation/QuotationCreateForm.js` (`PriceInput` at ~2116, its call sites, `formatMoneyAmount` at ~246)
- Modify: `All Module/Contract/ContractCreateForm.js` (`formatMoneyNumber` / `moneyRaw` at ~535, `MoneyInput` at ~3671, `formatMoneyAmountByCurrency` at ~322)
- Modify: `All Module/Case/CaseCreateForm.js` (`formatMoneyAmount` at ~165; CRLF)
- Create: `scripts/tests/money-input.test.js`

**Interfaces:**
- Produces:
  - In QuotationCreateForm.js: `cleanDecimalDraft(value, decimals)`, `moneyDraftShow(value, decimals)`, `moneyDraftValue(draft, decimals)` in a `money draft helpers` marked block; `PriceInput` gains a `currency` prop.
  - In ContractCreateForm.js: `cleanDecimalDraft`, `moneyInputShow(value, decimals)`, `moneyInputRaw(value, decimals)` in a `money draft helpers` marked block that also wraps `formatMoneyNumber` and `moneyRaw`.

- [ ] **Step 1: Write the test** — create `scripts/tests/money-input.test.js`:

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-29: a foreign price can be typed with its decimals (120.50 USD);
// VND stays whole đồng with "." grouping; foreign amounts show all their
// decimals (10.80, not 10.8). Spec §10.
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const START = "// ---- money draft helpers (pure; tested by scripts/tests/money-input.test.js) ----";
const END = "// ---- end money draft helpers ----";

{
  const Q = extractMarkedBlock(path.join(root, "All Module/Quotation/QuotationCreateForm.js"), START, END,
    ["cleanDecimalDraft", "moneyDraftShow", "moneyDraftValue"]);
  assert.equal(Q.cleanDecimalDraft("1,20.505", 2), "120.50");
  assert.equal(Q.cleanDecimalDraft("120.", 2), "120.", "a trailing dot survives while typing");
  assert.equal(Q.moneyDraftShow(1000000, 0), "1.000.000");
  assert.equal(Q.moneyDraftShow(120.5, 2), "120.5");
  assert.equal(Q.moneyDraftValue("120.50", 2), 120.5);
  assert.equal(Q.moneyDraftValue("1.000.000", 0), 1000000);
  assert.equal(Q.moneyDraftValue("", 2), 0);
}
{
  const K = extractMarkedBlock(path.join(root, "All Module/Contract/ContractCreateForm.js"), START, END,
    ["moneyInputShow", "moneyInputRaw"]);
  assert.equal(K.moneyInputShow(1000000, 0), "1.000.000");
  assert.equal(K.moneyInputShow("120.5", 2), "120.5");
  assert.equal(K.moneyInputRaw("120.505", 2), "120.50");
  assert.equal(K.moneyInputRaw("1.000.000", 0), "1000000");
}
// every price input passes its currency; display keeps a currency's decimals
{
  const q = read("All Module/Quotation/QuotationCreateForm.js");
  assert.ok(/const PriceInput = \(\{ value, onChange, prefilled, currency = null \}\)/.test(q), "Quotation PriceInput takes a currency");
  assert.ok(/value: r\.basePrice,\s*onChange: \(v\) => onUpdate\(r\._id, "basePrice", v\),\s*currency: rowCurrency/.test(q), "row price input passes its currency");
  for (const rel of ["All Module/Quotation/QuotationCreateForm.js", "All Module/Case/CaseCreateForm.js", "All Module/Contract/ContractCreateForm.js"]) {
    const src = read(rel);
    assert.ok(!/minimumFractionDigits: (0|decimals > 0 \? 0 : 0),\s*maximumFractionDigits: (decimals|getCurrencyDecimals\(info\))/.test(src), `${rel}: amounts show all their decimals`);
  }
  const k = read("All Module/Contract/ContractCreateForm.js");
  assert.ok(/inputMode: decimals > 0 \? "decimal" : "numeric"/.test(k), "Contract MoneyInput offers a decimal keyboard for foreign currencies");
}
console.log("money-input: all tests passed");
```

- [ ] **Step 2: Run it to see it fail**

  Run `node scripts/tests/money-input.test.js`.
  Expected: `Markers not found in …QuotationCreateForm.js`.

- [ ] **Step 3: Quotation — helpers and `PriceInput`** — in `All Module/Quotation/QuotationCreateForm.js`, replace the whole `const PriceInput = ({ value, onChange, prefilled }) => { … };` (from `// ==================== PRICE INPUT ====================` to the line before `// ==================== UI PRIMITIVES ====================`) with:

```js
// ==================== PRICE INPUT ====================
// ---- money draft helpers (pure; tested by scripts/tests/money-input.test.js) ----
// What a price box shows and hands back, by the currency's decimals:
// VND whole đồng grouped "1.000.000"; USD / EUR / SGD typed as "120.50".
const cleanDecimalDraft = (value, decimals) => {
  const s = String(value ?? "").replace(/,/g, "").replace(/[^\d.]/g, "");
  const [whole, ...rest] = s.split(".");
  if (!rest.length) return whole;
  return `${whole}.${rest.join("").slice(0, Math.max(0, decimals))}`;
};
const moneyDraftShow = (value, decimals) => {
  if (value === undefined || value === null || value === "") return "";
  if (decimals <= 0) {
    const digits = String(value).replace(/[^\d]/g, "");
    return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
  }
  return cleanDecimalDraft(value, decimals);
};
const moneyDraftValue = (draft, decimals) => {
  const cleaned = decimals <= 0 ? String(draft ?? "").replace(/[^\d]/g, "") : cleanDecimalDraft(draft, decimals);
  const n = Number(cleaned);
  return cleaned && Number.isFinite(n) ? n : 0;
};
// ---- end money draft helpers ----

const PriceInput = ({ value, onChange, prefilled, currency = null }) => {
  const decimals = currency ? getCurrencyDecimals(currency) : 0;
  const [draft, setDraft] = useState(() => moneyDraftShow(value, decimals));

  // keep what is being typed ("120.") while it still means the same value
  useEffect(() => {
    setDraft((prev) =>
      moneyDraftValue(prev, decimals) === Number(value || 0) && prev !== ""
        ? prev
        : moneyDraftShow(value, decimals),
    );
  }, [value, decimals]);

  const handleChange = (inputValue) => {
    const next = decimals > 0 ? cleanDecimalDraft(inputValue, decimals) : moneyDraftShow(inputValue, 0);
    setDraft(next);
    onChange(moneyDraftValue(next, decimals));
  };

  const normalizeDraft = () => {
    setDraft(moneyDraftShow(moneyDraftValue(draft, decimals), decimals));
  };

  if (AntInput) {
    return React.createElement(AntInput, {
      value: draft,
      placeholder: "0",
      inputMode: decimals > 0 ? "decimal" : "numeric",
      onChange: (e) => handleChange(e.target.value),
      onBlur: normalizeDraft,
      style: {
        textAlign: "right",
        ...(prefilled
          ? { borderColor: C.borderPre, background: C.bgPre }
          : null),
      },
    });
  }
  return React.createElement("input", {
    type: "text",
    value: draft,
    placeholder: "0",
    inputMode: decimals > 0 ? "decimal" : "numeric",
    onChange: (e) => handleChange(e.target.value),
    style: { ...(prefilled ? inpPre() : inp()), textAlign: "right" },
    onFocus: prefilled ? onFocusP : onFocus,
    onBlur: (e) => {
      normalizeDraft();
      (prefilled ? onBlurP : onBlur)(e);
    },
  });
};
```

- [ ] **Step 4: Quotation — pass each price box its currency** — in `All Module/Quotation/QuotationCreateForm.js`:

  **4a. Service row in edit mode.** Change

```js
                              React.createElement(PriceInput, {
                                value: r.basePrice,
                                onChange: (v) => onUpdate(r._id, "basePrice", v),
                              }),
```

  to

```js
                              React.createElement(PriceInput, {
                                value: r.basePrice,
                                onChange: (v) => onUpdate(r._id, "basePrice", v),
                                currency: rowCurrency,
                              }),
```

  **4b. "Create new service" price box** (the `f.type === "price_currency"` branch). Add a currency prop to its `PriceInput`, after `onChange`:

```js
                                  currency: findCurrencyById(currencies, newSvc.currencyId) || null,
```

  **4c. Combo subtotal.** Change `React.createElement(PriceInput, { value: comboSubTotal, onChange: setComboSubTotal, })` to pass `currency: selectedComboCurrency`.

  The combo item price box already passes `currency: selectedComboCurrency`. The package subtotal and the combo amount stay VND, so they get no currency.

- [ ] **Step 5: Quotation display** — in `formatMoneyAmount` (~line 246), change `minimumFractionDigits: 0,` to `minimumFractionDigits: decimals,`.

- [ ] **Step 6: Case display** — in `All Module/Case/CaseCreateForm.js` `formatMoneyAmount` (~line 165), change `minimumFractionDigits: decimals > 0 ? 0 : 0,` to `minimumFractionDigits: decimals,`.

  Use the Edit tool and keep the CRLF endings. The drafts (`formatMoneyDraft`) stay `0`, because a box being typed in must not pad.

- [ ] **Step 7: Contract — helpers and `MoneyInput`** — in `All Module/Contract/ContractCreateForm.js`:

  **7a. Helpers.** Replace

```js
      const formatMoneyNumber = (value) => {
        const raw = String(value ?? "").replace(/[^\d]/g, "");
        if (!raw) return "";
        return Number(raw).toLocaleString("vi-VN");
      };

      const moneyRaw = (value) => String(value ?? "").replace(/[^\d]/g, "");
```

  with

```js
      // ---- money draft helpers (pure; tested by scripts/tests/money-input.test.js) ----
      const formatMoneyNumber = (value) => {
        const raw = String(value ?? "").replace(/[^\d]/g, "");
        if (!raw) return "";
        return Number(raw).toLocaleString("vi-VN");
      };

      const moneyRaw = (value) => String(value ?? "").replace(/[^\d]/g, "");
      const cleanDecimalDraft = (value, decimals) => {
        const s = String(value ?? "").replace(/,/g, "").replace(/[^\d.]/g, "");
        const [whole, ...rest] = s.split(".");
        if (!rest.length) return whole;
        return `${whole}.${rest.join("").slice(0, Math.max(0, decimals))}`;
      };
      // What a money box shows: VND grouped "1.000.000"; a foreign amount as
      // typed ("120.5", "120."). What it hands back (a string, as before):
      // digits for VND, "120.50" for a foreign currency.
      const moneyInputShow = (value, decimals) =>
        decimals > 0 ? cleanDecimalDraft(value, decimals) : formatMoneyNumber(value);
      const moneyInputRaw = (value, decimals) =>
        decimals > 0 ? cleanDecimalDraft(value, decimals) : moneyRaw(value);
      // ---- end money draft helpers ----
```

  **7b. `MoneyInput`.** At the top of `MoneyInput` (~line 3671), after `const code = …`, add:

```js
        const decimals = currency ? getCurrencyDecimals(currency) : 0;
```

  Then in both branches (the `AntInput` one and the plain `input`) replace:
  - `value: formatMoneyNumber(value),` → `value: moneyInputShow(value, decimals),`
  - `onChange: (e) => onChange(moneyRaw(e.target.value)),` → `onChange: (e) => onChange(moneyInputRaw(e.target.value, decimals)),`
  - `inputMode: "numeric",` → `inputMode: decimals > 0 ? "decimal" : "numeric",`

  Every `MoneyInput` call site already passes `currency`.

- [ ] **Step 8: Contract display** — in `formatMoneyAmountByCurrency` (~line 322), change `minimumFractionDigits: 0,` to `minimumFractionDigits: getCurrencyDecimals(info),`.

- [ ] **Step 9: Run the test to see it pass**

  Run `node scripts/tests/money-input.test.js`.
  Expected: `money-input: all tests passed`.

- [ ] **Step 10: Run the full node suite and the block parser**

  Run `for f in scripts/tests/*.test.js; do node "$f" || exit 1; done && node scripts/tests/parse-blocks.js`.
  Expected: every test passes; no syntax error.

- [ ] **Step 11: Commit (by the user)** — files:
  - `All Module/Quotation/QuotationCreateForm.js`
  - `All Module/Contract/ContractCreateForm.js`
  - `All Module/Case/CaseCreateForm.js`
  - `scripts/tests/money-input.test.js`

  Message: `feat(forms): decimal price inputs and full decimals for foreign amounts`.

---

### Task 11: Same rate selection and pricing dates as the database

**Files:**
- Modify (rate helpers — replace `pickExchangeRate` and `pickConversionRate` in each):
  - `All Module/Quotation/QuotationCreateForm.js:380` (reference copy, marked)
  - `All Module/Case/CaseCreateForm.js:219` (CRLF)
  - `All Module/Contract/ContractCreateForm.js:381` (nested, 6-space indent)
  - `All Module/Contract/ContractServices.js:383`
  - `All Module/Quotation/QuotationServices.js:373`
  - `All Module/Case/CaseServices.js:276` (nested, 4-space indent)
  - `All Module/Contract/ContractDetailView.js:1215`
- Modify (pricing dates):
  - `All Module/Quotation/QuotationCreateForm.js` — 4 `pickConversionRate(…, form.validUntil)` calls;
  - `All Module/Quotation/QuotationServices.js:1614`;
  - `All Module/Contract/ContractServices.js:1813`.
- Modify: `scripts/tests/money-cases.test.js` (rate cases); create `scripts/tests/rate-lookup.test.js`.

**Interfaces:**
- Consumes: `money-cases.json` `rates` (Task 1).
- Produces:
  - `moneyDateKey(value) → "YYYY-MM-DD" | null` (Vietnam date).
  - `rate15(x) → number` (15 significant digits).
  - `pickExchangeRate(rates, from, to, pricingDate, when = "onOrBefore" | "after")`.
  - `pickConversionRate(rates, from, to, pricingDate)` — the same signature as before, in all 7 files.

- [ ] **Step 1: Add the rate checks** — in `scripts/tests/money-cases.test.js`, insert before the final `console.log`:

```js
// ---- rates: the JS lookup picks what money_rate_to_base() picks ----
{
  const parseDateMillis = (value) => {
    if (!value && value !== 0) return null;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  };
  const isUsableExchangeRateStatus = (status) => {
    const value = String(status || "").trim().toLowerCase();
    return !value || !["inactive", "disabled", "archived", "cancelled", "canceled", "draft"].includes(value);
  };
  const exchangeRateMatchesCurrency = (rate, side, currency) => String(rate?.[`${side}CurrencyId`]) === String(currency?.id);
  const R = extractMarkedBlock(
    path.join(root, "All Module/Quotation/QuotationCreateForm.js"),
    "// ---- rate lookup helpers (pure; tested by scripts/tests/money-cases.test.js) ----",
    "// ---- end rate lookup helpers ----",
    ["pickConversionRate", "moneyDateKey"],
    { parseNum, parseDateMillis, isUsableExchangeRateStatus, exchangeRateMatchesCurrency },
  );
  const rows = cases.rates.rows.map((row) => ({
    fromCurrencyId: row.from, toCurrencyId: row.to, rate: row.rate, effectiveDate: row.effectiveDate, status: row.status,
  }));
  for (const q of cases.rates.queries) {
    const matched = R.pickConversionRate(rows, { id: q.currency }, { id: "VND" }, q.on);
    if (q.rate === null) {
      assert.equal(matched, null, `no rate for ${q.currency}`);
    } else {
      assert.equal(matched?.rate, q.rate, `${q.currency} on ${q.on}: rate`);
      assert.equal(R.moneyDateKey(matched.record.effectiveDate), q.rateDate, `${q.currency} on ${q.on}: rate date`);
    }
  }
}
```

- [ ] **Step 2: Write the static test** — create `scripts/tests/rate-lookup.test.js`:

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 2026-09-29: every copy of the rate lookup follows money_rate_to_base()
// (Vietnam dates; direct / inverse on or before the date, then after it),
// and previews price on the same dates as the database (spec §6.2).
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const COPIES = [
  "All Module/Quotation/QuotationCreateForm.js",
  "All Module/Case/CaseCreateForm.js",
  "All Module/Contract/ContractCreateForm.js",
  "All Module/Contract/ContractServices.js",
  "All Module/Quotation/QuotationServices.js",
  "All Module/Case/CaseServices.js",
  "All Module/Contract/ContractDetailView.js",
];
for (const rel of COPIES) {
  const src = read(rel);
  assert.ok(/same order as money_rate_to_base\(\)/.test(src), `${rel}: follows money_rate_to_base()`);
  assert.ok(/const moneyDateKey = /.test(src) && /const rate15 = /.test(src), `${rel}: Vietnam dates, 15 digits`);
  assert.ok(!/effectiveMs <= cutoff/.test(src), `${rel}: the old millisecond cutoff is gone`);
}
const quotation = read("All Module/Quotation/QuotationCreateForm.js");
assert.ok(!/pickConversionRate\([^)]*form\.validUntil\)/.test(quotation), "Quotation form previews at today's rate (the quotation date)");
assert.ok(/const pricingDate = quotation\?\.createdAt;/.test(read("All Module/Quotation/QuotationServices.js")), "QuotationServices: the quotation date");
assert.ok(/const pricingDate = contract\?\.signedAt \|\| contract\?\.createdAt;/.test(read("All Module/Contract/ContractServices.js")), "ContractServices: signing date, else creation");
console.log("rate-lookup: all tests passed");
```

- [ ] **Step 3: Run both to see them fail**

  Run `node scripts/tests/money-cases.test.js; node scripts/tests/rate-lookup.test.js`.
  Expected: `Markers not found … rate lookup helpers` and `follows money_rate_to_base()` failures.

- [ ] **Step 4: Replace the reference copy** — in `All Module/Quotation/QuotationCreateForm.js`, replace the whole `const pickExchangeRate = (…) => {…};` and `const pickConversionRate = (…) => {…};` (from `const pickExchangeRate = (` down to the end of `pickConversionRate`, just before `const buildQuotationFinancialSummary`) with:

```js
// ---- rate lookup helpers (pure; tested by scripts/tests/money-cases.test.js) ----
// Business dates are Vietnam dates, as in the database (money_local_date):
// "2026-09-01" stays as it is; a timestamp is read in Asia/Ho_Chi_Minh.
const moneyDateKey = (value) => {
  if (!value && value !== 0) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const ms = parseDateMillis(value);
  return ms === null ? null : new Date(ms + 7 * 3600 * 1000).toISOString().slice(0, 10);
};
// Rates carry 15 significant digits, as float8 -> numeric does in Postgres.
const rate15 = (value) => Number(Number(value).toPrecision(15));
const pickExchangeRate = (rates = [], fromCurrency, toCurrency, pricingDate, when = "onOrBefore") => {
  const cutoff = moneyDateKey(pricingDate) || moneyDateKey(Date.now());
  const candidates = (rates || [])
    .map((rate) => ({
      record: rate,
      rate: parseNum(rate?.rate),
      effectiveMs: parseDateMillis(rate?.effectiveDate) || 0,
      day: moneyDateKey(rate?.effectiveDate) || "1900-01-01",
    }))
    .filter(
      (item) =>
        item.rate > 0 &&
        isUsableExchangeRateStatus(item.record?.status) &&
        exchangeRateMatchesCurrency(item.record, "from", fromCurrency) &&
        exchangeRateMatchesCurrency(item.record, "to", toCurrency),
    );
  if (when === "after") {
    return candidates.filter((item) => item.day > cutoff).sort((a, b) => a.effectiveMs - b.effectiveMs)[0] || null;
  }
  return candidates.filter((item) => item.day <= cutoff).sort((a, b) => b.effectiveMs - a.effectiveMs)[0] || null;
};
// same order as money_rate_to_base(): the latest direct rate on or before
// the date, else the latest inverse one; only then the earliest after it.
const pickConversionRate = (rates = [], fromCurrency, toCurrency, pricingDate) => {
  for (const when of ["onOrBefore", "after"]) {
    const direct = pickExchangeRate(rates, fromCurrency, toCurrency, pricingDate, when);
    if (direct) return { ...direct, rate: rate15(direct.rate), direction: "direct" };
    const inverse = pickExchangeRate(rates, toCurrency, fromCurrency, pricingDate, when);
    if (inverse) {
      return {
        ...inverse,
        direction: "inverse",
        originalRate: inverse.rate,
        rate: rate15(1 / rate15(inverse.rate)),
      };
    }
  }
  return null;
};
// ---- end rate lookup helpers ----
```

- [ ] **Step 5: Replace the other six copies** — in each of these files, replace its `pickExchangeRate` and `pickConversionRate` definitions with the same code as Step 4:
  - `CaseCreateForm.js` — keep CRLF;
  - `ContractCreateForm.js` — indent 6 spaces;
  - `ContractServices.js`;
  - `QuotationServices.js`;
  - `CaseServices.js` — indent 4 spaces;
  - `ContractDetailView.js`.

  Include the `moneyDateKey` / `rate15` helpers and the `same order as money_rate_to_base()` comment, **without** the marker comments: only the Quotation copy is extracted by the test.

  Each file already defines `parseNum`, `parseDateMillis`, `isUsableExchangeRateStatus` and `exchangeRateMatchesCurrency` in the same scope. Check each with Grep before editing. If one is missing, the `parse-blocks` / `tdz-check` run in Step 8 reports it — define it the way `QuotationCreateForm.js` does.

- [ ] **Step 6: Pricing dates** — three changes:
  - `QuotationCreateForm.js`: in the 4 calls `pickConversionRate(…, form.validUntil)`, replace `form.validUntil` with `null` (a new quotation is dated today, as the DB freezes it).
  - `QuotationServices.js:1614`: `const pricingDate = quotation?.date;` → `const pricingDate = quotation?.createdAt;`
  - `ContractServices.js:1813`: `const pricingDate = contract?.signedAt || contract?.date;` → `const pricingDate = contract?.signedAt || contract?.createdAt;`

- [ ] **Step 7: Run both tests to see them pass**

  Run `node scripts/tests/money-cases.test.js && node scripts/tests/rate-lookup.test.js`.
  Expected: `money-cases: all tests passed`, `rate-lookup: all tests passed`.

- [ ] **Step 8: Run the full node suite and the block checks**

  Run `for f in scripts/tests/*.test.js; do node "$f" || exit 1; done && node scripts/tests/parse-blocks.js && node scripts/tests/tdz-check.js`.
  Expected: every test passes; no syntax / TDZ error.

- [ ] **Step 9: Commit (by the user)** — the 7 JS files, `scripts/tests/money-cases.test.js`, `scripts/tests/rate-lookup.test.js`. Message: `feat(js): rate lookup and pricing dates match the database`.

---

### Task 12: Wrap-up — SRS pointer, full regression, deploy checklist

**Files:**
- Modify: `CURRENCY_LOGIC_SRS.md` (top of file)

- [ ] **Step 1: Point the old SRS at the new spec** — insert after the title line of `CURRENCY_LOGIC_SRS.md`:

```markdown
> **2026-09-29:** who computes line and document money (FR-3, FR-4) and the real
> `exchangeRates` shape are superseded by
> `docs/superpowers/specs/2026-09-29-money-flow-unification-design.md`: the database
> computes every stored amount; the JS only previews with the same rules. INV-1 stands.
```

- [ ] **Step 2: Run everything**

  Run `for f in scripts/tests/*.test.js; do node "$f" || exit 1; done && node scripts/tests/parse-blocks.js && bash scripts/tests/sql/run-local.sh pgsql/tests/*_test.sql`.
  Expected: every node test passes; every SQL test prints its `ALL … PASSED` notice. The new ones are `ALL MONEY CASES PASSED`, `ALL MONEY FLOW CHECKS PASSED`, `ALL MONEY TRAIL CHECKS PASSED` and `ALL MONEY BACKFILL CHECKS PASSED`.

- [ ] **Step 3: Hand the user the dev deploy checklist** (the user runs these on `law306`):

  1. pgAdmin, one file per new query tab:
     - `pgsql/money_flow_foundation.sql`;
     - then `pgsql/money_flow_trail.sql`.
  2. Paste `JsField/RegisterMoneyFlowFields.js` into a temporary JS Block → console shows `[done] money flow fields`.
  3. pgAdmin, each in a new tab — expect `ALL … PASSED`:
     - `pgsql/tests/money_cases_test.sql`
     - `pgsql/tests/money_flow_test.sql`
     - `pgsql/tests/money_trail_test.sql`
     - `pgsql/tests/money_backfill_test.sql`

     If a test currency insert is rejected because the real `currencies` table has another NOT NULL column, add that column to the test's `INSERT INTO currencies`.
  4. `pgsql/money_flow_backfill_preview.sql` → send the result for review.
  5. After approval: `pgsql/money_flow_backfill.sql`.
  6. `pgsql/money_consistency_audit.sql` → expect only `missing_rate` rows of protected lines (or 0 rows).
  7. Re-paste these JS blocks:
     - `QuotationCreateForm.js`, `ContractCreateForm.js`, `CaseCreateForm.js`;
     - `ContractServices.js`, `QuotationServices.js`, `CaseServices.js`;
     - `ContractDetailView.js`.
  8. Check in the UI:
     - a quotation line 120.50 USD + 4% → the table shows 125.32 USD; after saving, `totalAmount` is the VND at the quotation date's rate;
     - a contract signed today shows the same VND in the contract and in its case.
  9. Check that activity logs are not flooded: after saving a document, its activity log gains at most one entry per real change.

- [ ] **Step 4: Commit (by the user)** — file: `CURRENCY_LOGIC_SRS.md`. Message: `docs: point the currency SRS at the money-flow spec`.

---

## Self-review notes

- **Spec coverage:**

  | Spec section | Tasks |
  |---|---|
  | §5.1 columns | 1, 9 |
  | §5.2 headers | 3 |
  | §5.3 currencies fix | 1 |
  | §6.1 rate lookup | 1, 11 |
  | §6.2 freeze dates | 2, 11 |
  | §6.3 line trigger | 2 |
  | §6.4 re-freeze on signing | 4 |
  | §6.5 header totals | 3 |
  | §6.6 installments | 5, 6 |
  | §7.1 one source | 2, 3 |
  | §7.2 round then add | 1–3 |
  | §7.3 splits | 1, 5, 6, 7 |
  | §7.4 FX explained | 7 |
  | §7.5 audit | 7 |
  | §7.6 shared cases | 1, 6, 11 |
  | §8 allocation / trail | 7 |
  | §9 legacy | 8 |
  | §10 JS | 6, 9, 10, 11 |
  | §11 files | all |
  | §12 testing | every task |
  | §13 deploy | 12 |

- **Deviations** are listed at the top for review.
