# Create forms — UI and money unification (stage C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Case, Contract and Quotation create forms look alike (Case as the reference), show exactly the money the database stores, speak English only, and stop writing onto other documents what the triggers already derive — then apply it to the local copy `nocobase-law` for the user to test.

**Architecture:** Each form stays a self-contained NocoBase JS Block edited in place. New pure helpers live between marker comments so Node tests can extract and run them (`scripts/tests/extract-marked-block.js`); identical helpers are copied verbatim into the forms that need them and a test proves the copies match. Two SQL files get English messages. A Node script (`pg`) writes the repo files into the attached `flowModels` copies of each form on the local database.

**Tech Stack:** NocoBase RunJS blocks (React via `ctx.React`, antd via `ctx.antd`), PostgreSQL 16 plpgsql, Node 18+ (`node:assert`, `@babel/parser`, `pg`).

**Spec:** `docs/superpowers/specs/2026-09-30-create-forms-ui-money-unification-design.md`

## Global Constraints

- Local database only: host `localhost`, port `5432`, database `nocobase-law`, user `postgres` (password from pgpass). Never connect to dev.
- The user commits. No task runs `git commit`/`git push`; each task ends by recording its result in the ledger instead.
- Write scripts with the Write tool; never pass script bodies through `node -e`, heredocs or `sed -i` (they corrupt `\`, `$`, `\uXXXX`, and `sed -i` turns CRLF files into LF).
- `All Module/Case/CaseCreateForm.js` and `All Module/Quotation/QuotationCreateForm.js` are CRLF; `ContractCreateForm.js` is LF. Keep each file's line endings (the Edit tool does).
- All UI text English (labels, buttons, warnings, errors, toasts, confirms, tooltips, guides, generated names). Allowed Vietnamese literals: `"làm mới"`, `"tải lại"` (Refresh-button match strings).
- JS Blocks cannot `import`; every helper is defined inside the block. Do not use `shared-lib/`.
- RunJS sandbox: no `window.matchMedia` / `innerWidth`; `window.removeEventListener` is blocked (existing code already copes).
- Layouts stay responsive: tables keep `overflowX: "auto"`, footers keep `flexWrap: "wrap"`.
- Money rule (spec §4): line = `Unit Price × Qty` + VAT %, rounded to the currency's decimals; each line converted to VND and rounded on its own; totals = Σ converted lines.

## Review Focus

1. A contract with no Signed date — the preview must fall back to today (the database uses `createdAt` = today), not crash or show "Missing rate". Pinned in Task 2.
2. A Case row loaded from a USD contract line whose currency the lawyer then changes to EUR — the source line's frozen rate must no longer apply. Pinned in Task 3.
3. An old line with stored totals but no `basePrice` (legacy data) — the Contract preview must still show its amounts, not 0. Pinned in Task 2.
4. A package-priced quotation linked to a contract — its header total is not recomputed by the database, so the Contract form must keep syncing it. Pinned in Task 4.
5. The deploy meets an orphaned copy (a parent missing up the chain) or a parent loop — it must skip it, and never mutate a model's other options while writing the code. Pinned in Task 8.

## Regression commands (used by every task)

Node suite (from the repo root `components-law/`):

```bash
fail=0; for f in scripts/tests/*.test.js; do node "$f" > /dev/null 2>&1 || { echo "FAIL $f"; node "$f" 2>&1 | tail -5; fail=1; }; done; node scripts/tests/parse-blocks.js 2>&1 | tail -2; for f in "All Module/Case/CaseCreateForm.js" "All Module/Contract/ContractCreateForm.js" "All Module/Quotation/QuotationCreateForm.js"; do node scripts/tests/tdz-check.js "$f" | tail -1; done; echo "node suite fail=$fail"
```

Expected: no `FAIL` lines, `parse-blocks` reports no errors, three `tdz-check: no problems`, `node suite fail=0`.

SQL suite (throwaway Postgres, never the real DB):

```bash
files=$(ls pgsql/tests/*_test.sql | grep -v document_naming); bash scripts/tests/sql/run-local.sh $files 2>&1 | grep -E "PASSED|ERROR|FAIL"
```

Expected: one `PASSED` line per test file, no `ERROR`/`FAIL`.

---

### Task 1: English messages in the service-thread and currency triggers

**Files:**
- Modify: `pgsql/service_thread_sync.sql` (3 `RAISE EXCEPTION` lines, ~311, ~316, ~369)
- Modify: `pgsql/currency_catalog.sql` (2 `RAISE EXCEPTION` lines, ~32, ~36)
- Test: `pgsql/tests/service_thread_test.sql` (~158, ~179, ~203), `pgsql/tests/currency_catalog_test.sql` (~25, ~33), `scripts/tests/service-thread-js.test.js` (~25, ~28)

**Interfaces:**
- Produces: database messages `Service "<name>" belongs to contract <code>, which has payments — it cannot be changed.` / `… it cannot be deleted.` / `Service "<name>" has tasks in progress (<titles>) — finish or remove them first.` / `The exchange rate must be greater than 0.` / `Enter exchange rates from the foreign currency to VND (VND per 1 unit).`

- [ ] **Step 1: Update the tests to expect English**

In `pgsql/tests/service_thread_test.sql` replace the three `LIKE` patterns:

```sql
    IF v_msg NOT LIKE '%ST-3, which has payments — it cannot be changed%' THEN RAISE; END IF;
```
```sql
    IF v_msg NOT LIKE '%which has payments — it cannot be deleted%' THEN RAISE; END IF;
```
```sql
    IF v_msg NOT LIKE '%File the mark%finish or remove them first%' THEN RAISE; END IF;
```

In `pgsql/tests/currency_catalog_test.sql`:

```sql
    IF v_msg NOT LIKE '%foreign currency to VND%' THEN RAISE; END IF;
```
```sql
    IF v_msg NOT LIKE '%greater than 0%' THEN RAISE; END IF;
```

In `scripts/tests/service-thread-js.test.js` replace both occurrences of the Vietnamese message string with:

```js
'Service "A" belongs to contract HĐ-1, which has payments — it cannot be changed.'
```

(`HĐ-1` is a contract code in test data, not UI text; if the Task 7 language test flags it, change it to `CT-1` in both places.)

- [ ] **Step 2: Run the SQL tests and watch them fail**

Run: `bash scripts/tests/sql/run-local.sh pgsql/tests/service_thread_test.sql pgsql/tests/currency_catalog_test.sql 2>&1 | grep -E "PASSED|ERROR"`
Expected: `ERROR` lines (the Vietnamese messages no longer match), no `PASSED` for these two files.

- [ ] **Step 3: Translate the messages**

`pgsql/service_thread_sync.sql`, in `money_thread_before()`:

```sql
        RAISE EXCEPTION 'Service "%" belongs to contract %, which has payments — it cannot be deleted.',
          COALESCE(OLD."serviceName", ''), v_billed;
```
```sql
        RAISE EXCEPTION 'Service "%" has tasks in progress (%) — finish or remove them first.',
          COALESCE(OLD."serviceName", ''), v_task;
```
```sql
        RAISE EXCEPTION 'Service "%" belongs to contract %, which has payments — it cannot be changed.',
          COALESCE(NEW."serviceName", ''), v_billed;
```

`pgsql/currency_catalog.sql`, in `money_exchange_rate_guard()`:

```sql
    RAISE EXCEPTION 'The exchange rate must be greater than 0.';
```
```sql
    RAISE EXCEPTION 'Enter exchange rates from the foreign currency to VND (VND per 1 unit).';
```

(Keep each statement's existing argument list and surrounding `IF`; only the message literal changes. The second currency message currently continues with Vietnamese text in parentheses — replace the whole literal.)

- [ ] **Step 4: Run both suites**

Run the SQL suite and the Node suite (see "Regression commands").
Expected: all SQL files `PASSED`; `node suite fail=0`.

- [ ] **Step 5: Record**

Ledger line: `Task 1: complete (SQL suite N/N, node suite 0 fail)`. No commit.

---

### Task 2: Contract preview — line currency decimals and the Signed-date rate

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js` — amount resolution block (`// ---- amount resolution helpers …`), `buildContractFinancialSummary`, `ManualContractServicesSection`, its render call in `ContractCreateForm`
- Create: `scripts/tests/create-forms-money.test.js`

**Interfaces:**
- Produces (Contract, inside the amount resolution block): `lineAmountsInCurrency(line: object, decimals: number) → { quantity, basePrice, vat, subTotal, vatAmount, totalAmount }` — amounts in the line's own currency.
- Produces (Contract): new markers `// ---- contract summary helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----` / `// ---- end contract summary helpers ----` around `buildContractFinancialSummary`.
- Produces (Contract): `ManualContractServicesSection` prop `pricingDate` (a `YYYY-MM-DD` string or empty).

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/create-forms-money.test.js`:

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// docs/superpowers/specs/2026-09-30-create-forms-ui-money-unification-design.md §4
const root = path.resolve(__dirname, "../..");
const CONTRACT = path.join(root, "All Module/Contract/ContractCreateForm.js");
const cases = JSON.parse(fs.readFileSync(path.join(root, "scripts/tests/fixtures/money-cases.json"), "utf8"));
const numberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const firstNumber = (...values) => {
  for (const v of values) { const p = numberOrNull(v); if (p !== null) return p; }
  return null;
};
const firstNonZeroNumber = (...values) => {
  for (const v of values) { const p = numberOrNull(v); if (p !== null && p !== 0) return p; }
  return 0;
};
const roundAmount = (value) => { const n = Number(value); return Number.isFinite(n) ? Math.round(n) : 0; };
const amounts = extractMarkedBlock(
  CONTRACT,
  "// ---- amount resolution helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
  "// ---- end amount resolution helpers ----",
  ["lineAmountsInCurrency", "resolveServiceAmounts"],
  { firstNonZeroNumber, firstNumber, roundAmount },
);
const pick = (a) => [a.subTotal, a.vatAmount, a.totalAmount];

// ---- the shared money cases: Contract resolves a line like the database ----
for (const c of cases.lines) {
  const a = amounts.lineAmountsInCurrency({ basePrice: c.basePrice, quantity: c.quantity, vat: c.vat }, c.decimals);
  assert.deepEqual(pick(a), c.native, `Contract line: ${c.name}`);
}

// ---- a case line as the API returns it: no decimalPlaces, VND totals, no natives ----
const apiCaseLine = { basePrice: 10, quantity: 1, vat: 8, currencyId: 2, subTotal: 261765, vatAmount: 20941, totalAmount: 282706 };
assert.deepEqual(pick(amounts.lineAmountsInCurrency(apiCaseLine, 2)), [10, 0.8, 10.8], "USD cents kept (not 11 USD)");
// ---- Review Focus 3: a legacy line with totals but no price keeps its totals ----
assert.deepEqual(pick(amounts.lineAmountsInCurrency({ subTotal: 100, vatAmount: 8, totalAmount: 108 }, 0)), [100, 8, 108], "legacy line without a price");

// ---- the footer converts at the pricing date it is given ----
const seen = [];
const { buildContractFinancialSummary } = extractMarkedBlock(
  CONTRACT,
  "// ---- contract summary helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----",
  "// ---- end contract summary helpers ----",
  ["buildContractFinancialSummary"],
  {
    findDefaultCurrency: () => ({ id: 1, code: "VND", decimalPlaces: 0 }),
    resolveServiceAmounts: amounts.resolveServiceAmounts,
    lineAmountsInCurrency: amounts.lineAmountsInCurrency,
    currencyFromRecord: (row) => (row.currencyId === 2 ? { id: 2, code: "USD", decimalPlaces: 2 } : { id: 1, code: "VND", decimalPlaces: 0 }),
    getCurrencyDecimals: (c) => c.decimalPlaces,
    extractCurrencyId: (v) => (v && typeof v === "object" ? v.id : v) || null,
    getCurrencyCode: (c) => c.code,
    isSameCurrency: (a, b) => a.id === b.id,
    pickConversionRate: (rates, from, to, date) => {
      seen.push(date);
      return date === "2026-08-18" ? { rate: 26176.5 } : { rate: 30000 };
    },
    convertLinesToBase: (lines, rate) =>
      lines.reduce((acc, l) => {
        const s = Math.round(l.subTotal * rate); const v = Math.round(l.vatAmount * rate);
        return { subTotal: acc.subTotal + s, vatAmount: acc.vatAmount + v, totalAmount: acc.totalAmount + s + v };
      }, { subTotal: 0, vatAmount: 0, totalAmount: 0 }),
  },
);
const rows = [
  { basePrice: 18000000, quantity: 1, vat: 8, currencyId: 1 },
  { ...apiCaseLine },
];
const summary = buildContractFinancialSummary({ rows, currencies: [], exchangeRates: [], pricingDate: "2026-08-18" });
assert.equal(seen.at(-1), "2026-08-18", "the Signed date reaches the rate lookup");
assert.deepEqual(
  [summary.converted.subTotal, summary.converted.vatAmount, summary.converted.totalAmount],
  [18261765, 1460941, 19722706],
  "the reported contract (18,000,000 VND + 10 USD, both + 8%)",
);

// ---- the services table is wired to the Signed date ----
const src = fs.readFileSync(CONTRACT, "utf8");
const section = src.slice(src.indexOf("const ManualContractServicesSection = ({"), src.indexOf("const PaymentScheduleSection = ({"));
const calls = section.match(/pickConversionRate\([^)]*\)/g) || [];
const tableCalls = calls.filter((c) => !/comboRatesVnd/.test(c));
assert.ok(tableCalls.length >= 2, "row cell and currency modal look rates up");
tableCalls.forEach((c) => assert.match(c, /pricingDate/, `rate lookup without the Signed date: ${c}`));
(section.match(/buildContractFinancialSummary\(\{[\s\S]*?\}\)/g) || []).forEach((c) =>
  assert.match(c, /pricingDate/, "summary without the Signed date"),
);
assert.match(src, /pricingDate: form\.signedDate \|\| todayInput\(\),/, "the form passes its Signed date (today when blank)");
console.log("create-forms-money: all tests passed");
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node scripts/tests/create-forms-money.test.js`
Expected: FAIL — `lineAmountsInCurrency` is not defined (thrown from `extractMarkedBlock`'s factory).

- [ ] **Step 3: Add `lineAmountsInCurrency`**

In `ContractCreateForm.js`, inside the amount resolution block, directly after the closing `};` of `resolveServiceAmounts` (before `const resolvePackageAmounts`), add:

```js
      // A line's amounts in its own currency, rounded to that currency's
      // decimals (lines from the API carry no decimalPlaces: a USD line was
      // rounded to whole dollars, 10.80 -> 11). A priced line is resolved from
      // its inputs — its stored totals are VND, or an older price's; a line
      // without a price keeps its natives / stored totals.
      const lineAmountsInCurrency = (line, decimals) => {
        const source = line || {};
        const priced = hasValue(source.basePrice) && Number(source.basePrice) !== 0;
        const inputs = priced
          ? (({ subTotal, vatAmount, totalAmount, subTotalNative, vatAmountNative, totalAmountNative, basePriceVnd, ...rest }) => rest)(source)
          : source;
        return resolveServiceAmounts({ ...inputs, decimalPlaces: decimals });
      };
```

- [ ] **Step 4: Mark and fix `buildContractFinancialSummary`**

Put `      // ---- contract summary helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----` on the line before `      const buildContractFinancialSummary = ({` and `      // ---- end contract summary helpers ----` on the line after its closing `};`.

Inside its `rows.forEach`, replace

```js
          const amounts = resolveServiceAmounts(row);
          if (!amounts.subTotal && !amounts.vatAmount && !amounts.totalAmount) return;
          const rowCurrency = currencyFromRecord(row, currencies, targetCurrency);
```

with

```js
          const rowCurrency = currencyFromRecord(row, currencies, targetCurrency);
          const amounts = lineAmountsInCurrency(row, getCurrencyDecimals(rowCurrency));
          if (!amounts.subTotal && !amounts.vatAmount && !amounts.totalAmount) return;
```

- [ ] **Step 5: Wire the Signed date through the services table**

In `ManualContractServicesSection`'s props list add `pricingDate = "",` after `onConvertedTotalsChange,`.

In the two `buildContractFinancialSummary({ … })` calls inside that component (`preliminarySummary`, `financialSummary`) add `pricingDate,` after `packageTotals,`, and add `pricingDate` to both `useMemo` dependency arrays.

In `getRowConversion`, change

```js
          const matched = pickConversionRate(
            exchangeRates,
            rowCurrency,
            defaultCurrency,
          );
```

to

```js
          const matched = pickConversionRate(
            exchangeRates,
            rowCurrency,
            defaultCurrency,
            pricingDate,
          );
```

In the currency modal body (`financialSummary.groups.map((group, idx) => {`), change the `pickConversionRate(exchangeRates, group.currency, defaultCurrency,)` call the same way (add `pricingDate` as the 4th argument). Task 5 replaces this modal; the argument must survive into the helper call there.

In the `convertedTotalsKey` array add `pricingDate || "",` so a Signed-date change re-reports the totals to the form.

In `ContractCreateForm`'s `React.createElement(ManualContractServicesSection, { … })` add, after `onConvertedTotalsChange: applyConvertedServiceTotals,`:

```js
                      pricingDate: form.signedDate || todayInput(),
```

- [ ] **Step 6: Run the test**

Run: `node scripts/tests/create-forms-money.test.js`
Expected: `create-forms-money: all tests passed`.

- [ ] **Step 7: Run the Node suite**

Run the Node suite. Expected: `node suite fail=0` (in particular `contract-native-amounts`, `money-rounding`, `money-cases`, `service-totals` stay green).

- [ ] **Step 8: Record**

Ledger line: `Task 2: complete (create-forms-money pass, node suite 0 fail)`. No commit.

---

### Task 3: Case preview — the source line's frozen rate, lines rounded like the database

**Files:**
- Modify: `All Module/Case/CaseCreateForm.js` — new marked block near the base conversion helpers; quotation row mapping (`_qServiceId: s.id,` ~1262); contract row mapping (`_contractServiceId: s.id,` ~1539); `buildServiceFinancialSummary` (~349); `ProjectServicesTable`'s `lineTotals` (~6980), `exchangeBreakdown` (~7090) and `convertAmountsToBaseCurrency`
- Modify: `scripts/tests/create-forms-money.test.js`

**Interfaces:**
- Produces (Case): markers `// ---- source rate helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----` / `// ---- end source rate helpers ----` with `frozenSourceRate(record) → { rate: number, date: string|null } | null` and `rowFrozenRate(row, extractCurrencyId) → { rate, date } | null`.
- Row fields added by the mappings: `_frozenRate` (object or null), `_frozenRateCurrencyId` (string or null).

- [ ] **Step 1: Extend the test**

Append to `scripts/tests/create-forms-money.test.js` (before the final `console.log`):

```js
// ---- Case: a line linked to a contract / quotation line reuses its frozen rate ----
const CASE = path.join(root, "All Module/Case/CaseCreateForm.js");
const extractCurrencyId = (v) => {
  const id = v && typeof v === "object" ? v.id : v;
  const n = parseInt(id, 10);
  return Number.isFinite(n) ? n : null;
};
const rates = extractMarkedBlock(
  CASE,
  "// ---- source rate helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----",
  "// ---- end source rate helpers ----",
  ["frozenSourceRate", "rowFrozenRate"],
  {},
);
assert.deepEqual(rates.frozenSourceRate({ exchangeRateToBase: 26176.5, exchangeRateDate: "2026-08-18" }), { rate: 26176.5, date: "2026-08-18" });
assert.deepEqual(rates.frozenSourceRate({ exchangeRateToBase: 25000 }), { rate: 25000, date: null }, "≠ 1 counts as frozen");
assert.equal(rates.frozenSourceRate({ exchangeRateToBase: 1 }), null, "1 without a date is a legacy placeholder");
assert.equal(rates.frozenSourceRate({ exchangeRateToBase: 0, exchangeRateDate: "2026-08-18" }), null);
assert.equal(rates.frozenSourceRate({}), null);
const frozenRow = { currencyId: "2", _frozenRate: { rate: 26176.5, date: "2026-08-18" }, _frozenRateCurrencyId: "2" };
assert.deepEqual(rates.rowFrozenRate(frozenRow, extractCurrencyId), { rate: 26176.5, date: "2026-08-18" });
// Review Focus 2: the currency was changed after loading — the old rate no longer applies
assert.equal(rates.rowFrozenRate({ ...frozenRow, currencyId: "3" }, extractCurrencyId), null, "currency changed");
assert.equal(rates.rowFrozenRate({ currencyId: "2" }, extractCurrencyId), null, "a row of the Case itself");

const caseSrc = fs.readFileSync(CASE, "utf8");
assert.match(caseSrc, /_contractServiceId: s\.id,\s*\r?\n\s*_frozenRate: frozenSourceRate\(s\),/, "contract rows keep the contract line's rate");
assert.match(caseSrc, /_qServiceId: s\.id,\s*\r?\n\s*_frozenRate: frozenSourceRate\(s\),/, "quotation rows keep the quotation line's rate");
// a row's VND is rounded per part (as money_line_amounts), never total × rate
assert.doesNotMatch(caseSrc, /amounts\.totalAmount \* info\.rate/, "row cell converts the total in one go");
assert.match(caseSrc, /rowFrozenRate\(row, extractCurrencyId\)/, "totals group by frozen rate");
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node scripts/tests/create-forms-money.test.js`
Expected: FAIL — markers not found in `CaseCreateForm.js`.

- [ ] **Step 3: Add the helper block**

In `CaseCreateForm.js`, directly after the line `// ---- end base conversion helpers ----`, add:

```js
// ---- source rate helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----
// A case line linked to a contract / quotation line takes that line's frozen
// rate (money_line_rate in pgsql/money_flow_foundation.sql). Frozen = a
// positive rate with a date, or a rate other than 1 (money_rate_frozen); a
// dateless 1 is a pre-trigger placeholder. null = convert at the Open date.
const frozenSourceRate = (record) => {
  const rate = Number(record?.exchangeRateToBase);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const date = record?.exchangeRateDate ? String(record.exchangeRateDate).slice(0, 10) : null;
  return date || rate !== 1 ? { rate, date } : null;
};
// Only while the row keeps the source line's currency (the database reuses the
// rate only for the same currency).
const rowFrozenRate = (row, extractCurrencyId) =>
  row?._frozenRate &&
  row._frozenRateCurrencyId &&
  String(extractCurrencyId(row.currencyId) || "") === String(row._frozenRateCurrencyId)
    ? row._frozenRate
    : null;
// ---- end source rate helpers ----
```

- [ ] **Step 4: Carry the rate on loaded rows**

After `      _qServiceId: s.id,` add

```js
      _frozenRate: frozenSourceRate(s),
      _frozenRateCurrencyId: rowCurrencyId ? String(rowCurrencyId) : null,
```

After `      _contractServiceId: s.id,` add the same two lines.

(Both mappings already define `rowCurrencyId` above the object literal; confirm by reading the 30 lines above each insertion.)

- [ ] **Step 5: Group and convert by frozen rate in the table**

In `ProjectServicesTable`'s `lineTotals` reducer, replace

```js
          const key =
            extractCurrencyId(row.currencyId) ||
            extractCurrencyId(rowCurrency) ||
            getCurrencyCode(rowCurrency);
          if (!acc.byCurrency[key]) {
            acc.byCurrency[key] = {
              currency: rowCurrency,
```

with

```js
          const frozen = rowFrozenRate(row, extractCurrencyId);
          const key =
            `${extractCurrencyId(row.currencyId) ||
            extractCurrencyId(rowCurrency) ||
            getCurrencyCode(rowCurrency)}${frozen ? `@${frozen.rate}` : ""}`;
          if (!acc.byCurrency[key]) {
            acc.byCurrency[key] = {
              frozenRate: frozen,
              currency: rowCurrency,
```

In `exchangeBreakdown`, replace

```js
        const matched = sameBase
          ? null
          : pickConversionRate(exchangeRates, groupCurrency, baseCurrency, pricingDate);
```

with

```js
        const matched = sameBase
          ? null
          : group.frozenRate
            ? {
                rate: group.frozenRate.rate,
                record: { effectiveDate: group.frozenRate.date, source: "Linked line" },
                direction: "direct",
              }
            : pickConversionRate(exchangeRates, groupCurrency, baseCurrency, pricingDate);
```

Change `convertAmountsToBaseCurrency = (amounts, rowCurrency) =>` to `convertAmountsToBaseCurrency = (amounts, rowCurrency, frozen = null) =>`. Right after its `if (sameCurrency) { … }` block add

```js
    if (frozen?.rate) {
      return {
        canConvert: true,
        sameCurrency: false,
        status: "converted",
        rate: frozen.rate,
        rateRecord: { effectiveDate: frozen.date, source: "Linked line" },
        ...convertLinesToBase([amounts], frozen.rate),
      };
    }
```

and replace its last return's three products

```js
      subTotal: amounts.subTotal * info.rate,
      vatAmount: amounts.vatAmount * info.rate,
      totalAmount: amounts.totalAmount * info.rate,
```

with

```js
      ...convertLinesToBase([amounts], info.rate),
```

At the row cell (`const convertedLineAmount = lineAmount`), change the call to `convertAmountsToBaseCurrency(lineAmount, rowCurrency, rowFrozenRate(r, extractCurrencyId))`.

- [ ] **Step 6: Same grouping in `buildServiceFinancialSummary` (submit)**

Replace

```js
    const key =
      extractCurrencyId(row.currencyId) ||
      extractCurrencyId(rowCurrency) ||
      getCurrencyCode(rowCurrency);

    if (!byCurrency[key]) {
      byCurrency[key] = {
        currency: rowCurrency,
```

with

```js
    const frozen = rowFrozenRate(row, extractCurrencyId);
    const key = `${
      extractCurrencyId(row.currencyId) ||
      extractCurrencyId(rowCurrency) ||
      getCurrencyCode(rowCurrency)
    }${frozen ? `@${frozen.rate}` : ""}`;

    if (!byCurrency[key]) {
      byCurrency[key] = {
        frozenRate: frozen,
        currency: rowCurrency,
```

and in its conversion reducer replace

```js
        : pickConversionRate(exchangeRates, group.currency, targetCurrency, pricingDate);
```

with

```js
        : group.frozenRate
          ? { rate: group.frozenRate.rate, direction: "direct", record: null }
          : pickConversionRate(exchangeRates, group.currency, targetCurrency, pricingDate);
```

- [ ] **Step 7: Run the tests**

Run: `node scripts/tests/create-forms-money.test.js` → `all tests passed`. Then the Node suite → `node suite fail=0` (`money-cases` still proves Case line math).

- [ ] **Step 8: Record**

Ledger line: `Task 3: complete (…)`. No commit.

---

### Task 4: Cross-document writes — send only what the database cannot derive

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js`, `All Module/Case/CaseCreateForm.js`, `All Module/Quotation/QuotationCreateForm.js`
- Create: `scripts/tests/cross-document-writes.test.js`

**Interfaces:**
- Produces (identical block in all three forms): markers `// ---- cross-document payload helpers (pure; tested by scripts/tests/cross-document-writes.test.js) ----` / `// ---- end cross-document payload helpers ----` with `lineWritePayload(payload) → object`, `linkedLineFollowUpPayload(payload) → object`, `apiErrorText(error, fallback) → string`.

The block (paste verbatim, indented to the file's top-level indentation: 6 spaces in Contract, none in Case/Quotation):

```js
// ---- cross-document payload helpers (pure; tested by scripts/tests/cross-document-writes.test.js) ----
// What a form sends to a service line (spec 2026-09-30 §6). The database
// prices a line (trg_money_line_compute) and copies a service's content to
// its linked lines (trg_money_thread_after): line totals are never sent, and
// a follow-up write to a line the save already linked sends no content.
const LINE_TOTAL_KEYS = ["subTotal", "vatAmount", "totalAmount"];
const THREAD_CONTENT_KEYS = [
  "serviceId", "ServiceId", "services", "serviceName", "serviceType",
  "description", "comboId", "serviceCombo", "comboName",
];
const withoutKeys = (payload, keys) => {
  const next = { ...(payload || {}) };
  keys.forEach((key) => delete next[key]);
  return next;
};
const isLinePricedPayload = (payload) =>
  String(payload?.pricingMode || "line").toLowerCase() === "line";
// Own lines, a write that creates a link, or an edit made at its origin:
// content stays (it must win); a priced line drops its totals.
const lineWritePayload = (payload) =>
  isLinePricedPayload(payload) ? withoutKeys(payload, LINE_TOTAL_KEYS) : { ...(payload || {}) };
// A line already linked by an earlier write of the same save: links, status
// and pricing only (pricing is not copied across pricing modes).
const linkedLineFollowUpPayload = (payload) =>
  withoutKeys(lineWritePayload(payload), THREAD_CONTENT_KEYS);
// A request the database refused carries its reason in errors[0].message.
const apiErrorText = (error, fallback) =>
  error?.response?.data?.errors?.[0]?.message || error?.message || fallback;
// ---- end cross-document payload helpers ----
```

Place it: Contract — directly before `      const stripContractServicePayload = (payload = {}) => {`; Case — directly after `// ---- end source rate helpers ----` (Task 3); Quotation — directly after `// ---- end base conversion helpers ----`.

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/cross-document-writes.test.js`:

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// docs/superpowers/specs/2026-09-30-create-forms-ui-money-unification-design.md §6
const root = path.resolve(__dirname, "../..");
const FORMS = {
  Contract: "All Module/Contract/ContractCreateForm.js",
  Case: "All Module/Case/CaseCreateForm.js",
  Quotation: "All Module/Quotation/QuotationCreateForm.js",
};
const START = "// ---- cross-document payload helpers (pure; tested by scripts/tests/cross-document-writes.test.js) ----";
const END = "// ---- end cross-document payload helpers ----";
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
const blockOf = (src) => src.slice(src.indexOf(START), src.indexOf(END)).split("\n").map((l) => l.trim()).join("\n");

const blocks = Object.entries(FORMS).map(([name, rel]) => [name, blockOf(read(rel))]);
blocks.forEach(([name, b]) => assert.ok(b.length > 100, `${name}: helper block missing`));
blocks.slice(1).forEach(([name, b]) => assert.equal(b, blocks[0][1], `${name}: helper block differs from Contract's`));

const h = extractMarkedBlock(path.join(root, FORMS.Contract), START, END, ["lineWritePayload", "linkedLineFollowUpPayload", "apiErrorText"], {});
const line = {
  contractId: 5, projectServiceId: 7, status: "active", pricingMode: "line",
  serviceId: 3, serviceName: "Audit", serviceType: "Tax", description: "d", comboId: 2, comboName: "Pack",
  basePrice: 10, quantity: 1, vat: 8, currencyId: 2, subTotal: 261765, vatAmount: 20941, totalAmount: 282706,
};
const own = h.lineWritePayload(line);
["subTotal", "vatAmount", "totalAmount"].forEach((k) => assert.ok(!(k in own), `own line sends ${k}`));
["serviceName", "basePrice", "currencyId", "projectServiceId"].forEach((k) => assert.ok(k in own, `own line lost ${k}`));
const follow = h.linkedLineFollowUpPayload(line);
["serviceId", "serviceName", "serviceType", "description", "comboId", "comboName", "subTotal"].forEach((k) =>
  assert.ok(!(k in follow), `follow-up sends ${k}`));
["contractId", "projectServiceId", "status", "pricingMode", "basePrice", "quantity", "vat", "currencyId"].forEach((k) =>
  assert.ok(k in follow, `follow-up lost ${k}`));
const pkg = { pricingMode: "package", subTotal: 0, packageSubTotal: 5000000 };
assert.deepEqual(h.lineWritePayload(pkg), pkg, "a package line keeps what it sends");
assert.equal(h.apiErrorText({ response: { data: { errors: [{ message: "refused" }] } } }, "x"), "refused");
assert.equal(h.apiErrorText(new Error("boom"), "x"), "boom");
assert.equal(h.apiErrorText(null, "x"), "x");

// ---- the call sites use them ----
const contract = read(FORMS.Contract);
assert.match(contract, /const cleanPayload = stripContractServicePayload\(lineWritePayload\(payload\)\);/, "C1");
assert.match(contract, /updateProjectServiceLineSafely\(\s*lineProjectServiceId,\s*linkedLineFollowUpPayload\(projectServiceUpdatePayload\),/, "C2");
assert.match(contract, /data: linkedLineFollowUpPayload\(quotationServicePayload\),/, "C3");
assert.match(contract, /if \(!isPackage\) return; \/\/ line pricing: trg_money_quotation_header/, "C4 (Review Focus 4: a package quotation is still synced)");

const kase = read(FORMS.Case);
assert.match(kase, /data: cleanPayload\(lineWritePayload\(payload\)\),/, "K1");
assert.doesNotMatch(kase, /await updateContractHeaderSafely\(/, "K4");
assert.doesNotMatch(kase, /setSubmitStep\("Updating quotation total\.\.\."\)/, "K6");
assert.ok((kase.match(/lineWritePayload\(\{/g) || []).length >= 4, "K2/K5 payloads");

const quotation = read(FORMS.Quotation);
assert.match(quotation, /data: linkedLineFollowUpPayload\(contractServicePayload\),/, "Q3");
assert.doesNotMatch(quotation, /subTotal: totals\.subTotal,\s*vatAmount: totals\.vatAmount,\s*totalAmount: totals\.totalAmount,\s*\};/, "Q5");
assert.match(quotation, /if \(!\(localIsPackage\(contract\) \|\| packageLine\)\) return; \/\/ line pricing: trg_money_contract_header/, "Q4 (retainer and package keep their sync)");
assert.doesNotMatch(quotation, /Missing exchange rate for contract total/, "Q4: the line-pricing header computation is gone");
console.log("cross-document-writes: all tests passed");
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node scripts/tests/cross-document-writes.test.js`
Expected: FAIL — `Contract: helper block missing`.

- [ ] **Step 3: Paste the helper block into the three forms** (positions above).

- [ ] **Step 4: Contract call sites**

C1 — in `createContractServiceLine`, change `const cleanPayload = stripContractServicePayload(payload);` to `const cleanPayload = stripContractServicePayload(lineWritePayload(payload));`. In its innermost `catch (fallbackError)` path keep the minimal retry; wrap that last request so that on failure it throws the **first** error:

```js
              try {
                const res = await ctx.api.request({
                  url: "contractServices:create",
                  method: "POST",
                  data: minimalPayload,
                });
                return res?.data?.data || res?.data || null;
              } catch (minimalError) {
                throw error;
              }
```

C2 — in `handleSubmit`, change

```js
                  await updateProjectServiceLineSafely(
                    lineProjectServiceId,
                    projectServiceUpdatePayload,
                  );
```

to

```js
                  await updateProjectServiceLineSafely(
                    lineProjectServiceId,
                    linkedLineFollowUpPayload(projectServiceUpdatePayload),
                  );
```

C3 — in the `quotationServices:update` request, change `data: quotationServicePayload,` to `data: linkedLineFollowUpPayload(quotationServicePayload),` and in its `catch (error)` add, before the `console.warn`:

```js
                    message.warning(apiErrorText(error, "Could not update the quotation line."));
```

C4 — in `syncQuotationHeaderFromServices`, right after the `const isPackage = …;` statement add:

```js
          if (!isPackage) return; // line pricing: trg_money_quotation_header
```

- [ ] **Step 5: Case call sites**

K1 — in `requestContractService`'s inner `request`, change `data: cleanPayload(payload),` to `data: cleanPayload(lineWritePayload(payload)),`. In its final `catch (minimalError)` replace the `console.warn(…)` call with:

```js
              message.warning(apiErrorText(error, `Could not ${action} the contract line.`));
```

K2 / K5 — wrap each of these payload object literals in `lineWritePayload(…)`: the two `createProjectService({ … })` calls (argument becomes `createProjectService(lineWritePayload({ … }))`), the `quotationServices:update` `data: { … }` (→ `data: lineWritePayload({ … })`), the `quotationServices:create` `data: { … }` (→ `data: lineWritePayload({ … })`). In their `catch (e)` blocks add `message.warning(apiErrorText(e, "Could not save the quotation line."));` before the `console.warn`.

K3 — the `contractServices:update` link write keeps its payload; in its `.catch((error) => {` add `message.warning(apiErrorText(error, "Could not link the contract line to the case."));`.

K4 — delete the whole `if (activeFinancialSourceType === SOURCE_CONTRACT && form.contractId && !activePackageMode) { setSubmitStep("Updating contract total..."); … await updateContractHeaderSafely(…); }` block (the line-pricing branch; read it fully before deleting — it ends where the `updateContractHeaderSafely` call's closing `});` and the `if`'s `}` close). Keep the `updateContractHeaderSafely` function only if another caller remains (`grep -n "updateContractHeaderSafely(" "All Module/Case/CaseCreateForm.js"`); otherwise delete it too.

K6 — delete the `// 3c. Update total if not auto-created …` block: from `if (!activePackageMode) {` + `setSubmitStep("Updating quotation total...");` through the end of its `try { … } catch (error) { … }` and the closing braces of `if (cq)` and `if (!activePackageMode)`.

- [ ] **Step 6: Quotation call sites**

Q1 — own `quotationServices:create` payloads: wrap `data: { … }` / the object passed as `data` in `lineWritePayload(…)` (the first request and the fallback request).

Q2 — the `projectServices:update` with `quotationServiceId`: `data: lineWritePayload({ … })`.

Q3 — change `data: contractServicePayload,` in the `contractServices:update?filterByTk=` request to `data: linkedLineFollowUpPayload(contractServicePayload),`, and in `catch (contractSyncError)` add `message.warning(apiErrorText(contractSyncError, "Could not sync the contract lines."));` before `console.warn`.

Q4 — `localSyncContractHeaderFromServices` (~605). Its `else` branch (not retainer) finds `packageLine` and then tests `if (localIsPackage(contract) || packageLine) {`. Directly before that `if`, add:

```js
      if (!(localIsPackage(contract) || packageLine)) return; // line pricing: trg_money_contract_header
```

A retainer (header not recomputed by the database) and a package contract keep their sync; a line-priced contract's header is the trigger's. The `else` of that `if` (the line-pricing computation) becomes unreachable — delete it together with the `Missing exchange rate for contract total` throw it contains.

Q5 — in `projectUpdateData` delete the three lines `subTotal: totals.subTotal,` `vatAmount: totals.vatAmount,` `totalAmount: totals.totalAmount,`; keep `quotationId`, `currencies`, `currencyId`.

- [ ] **Step 7: Run the tests**

Run: `node scripts/tests/cross-document-writes.test.js` → `all tests passed`. Node suite → `node suite fail=0`.

- [ ] **Step 8: Record**

Ledger line: `Task 4: complete (…)`. No commit.

---

### Task 5: Contract look — Case-style table, currency modal, dead code removed

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js`
- Create: `scripts/tests/create-forms-look.test.js`

**Interfaces:**
- Produces (Contract and, in Task 6, Quotation — identical text): markers `// ---- currency breakdown helpers (pure; tested by scripts/tests/create-forms-look.test.js) ----` / `// ---- end currency breakdown helpers ----` with `currencyBreakdownRows(groups, { isBase, matchOf, codeOf, convert }) → [{ key, currency, currencyCode, lineCount, originalTotal, rate, convertedTotal, effectiveDate, source, status }]`.

The helper block (paste verbatim; Contract indentation 6 spaces, directly after `      // ---- end base conversion helpers ----`):

```js
// ---- currency breakdown helpers (pure; tested by scripts/tests/create-forms-look.test.js) ----
// One row per currency for the "Currency breakdown" modal, the columns of the
// Case form: original total, rate to VND, converted total (each line on its
// own, as the database), rate date and source.
const currencyBreakdownRows = (groups, { isBase, matchOf, codeOf, convert }) =>
  (groups || []).map((group, index) => {
    const base = isBase(group);
    const matched = base ? { rate: 1, record: null, direction: "base" } : matchOf(group);
    const rate = Number(matched?.rate) || 0;
    const converted = rate ? convert(group.lines || [], rate) : null;
    return {
      key: `${codeOf(group.currency)}-${index}`,
      currency: group.currency,
      currencyCode: codeOf(group.currency),
      lineCount: group.lineCount || (group.lines || []).length,
      originalTotal: group.totalAmount,
      rate: rate || null,
      convertedTotal: converted ? converted.totalAmount : null,
      effectiveDate: base ? null : matched?.record?.effectiveDate || null,
      source: base
        ? "Base currency"
        : !rate
          ? "No rate"
          : `${matched?.record?.source || matched?.record?.status || "Manual"}${matched?.direction === "inverse" ? " (inverse)" : ""}`,
      status: base ? "base" : rate ? "converted" : "missing",
    };
  });
// ---- end currency breakdown helpers ----
```

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/create-forms-look.test.js`:

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// docs/superpowers/specs/2026-09-30-create-forms-ui-money-unification-design.md §3
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
const START = "// ---- currency breakdown helpers (pure; tested by scripts/tests/create-forms-look.test.js) ----";
const END = "// ---- end currency breakdown helpers ----";
const FORMS_WITH_HELPER = (process.env.LOOK_FORMS || "Contract").split(",");
const PATHS = {
  Contract: "All Module/Contract/ContractCreateForm.js",
  Quotation: "All Module/Quotation/QuotationCreateForm.js",
  Case: "All Module/Case/CaseCreateForm.js",
};
const convert = (lines, rate) =>
  lines.reduce((acc, l) => {
    const s = Math.round(l.subTotal * rate); const v = Math.round(l.vatAmount * rate);
    return { subTotal: acc.subTotal + s, vatAmount: acc.vatAmount + v, totalAmount: acc.totalAmount + s + v };
  }, { subTotal: 0, vatAmount: 0, totalAmount: 0 });
for (const form of FORMS_WITH_HELPER) {
  const { currencyBreakdownRows } = extractMarkedBlock(path.join(root, PATHS[form]), START, END, ["currencyBreakdownRows"], {});
  const groups = [
    { currency: { code: "VND" }, lineCount: 1, totalAmount: 19440000, lines: [{ subTotal: 18000000, vatAmount: 1440000 }] },
    { currency: { code: "USD" }, lineCount: 2, totalAmount: 21.6, lines: [{ subTotal: 10, vatAmount: 0.8 }, { subTotal: 10, vatAmount: 0.8 }] },
    { currency: { code: "SGD" }, lineCount: 1, totalAmount: 5, lines: [{ subTotal: 5, vatAmount: 0 }] },
  ];
  const rows = currencyBreakdownRows(groups, {
    isBase: (g) => g.currency.code === "VND",
    matchOf: (g) => (g.currency.code === "USD" ? { rate: 26176.5, record: { effectiveDate: "2026-08-18", source: "Vietcombank" }, direction: "inverse" } : null),
    codeOf: (c) => c.code,
    convert,
  });
  assert.deepEqual(rows.map((r) => r.status), ["base", "converted", "missing"], form);
  assert.equal(rows[1].convertedTotal, 2 * 282706, `${form}: lines converted one by one`);
  assert.equal(rows[1].source, "Vietcombank (inverse)", form);
  assert.equal(rows[1].effectiveDate, "2026-08-18", form);
  assert.equal(rows[2].source, "No rate", form);
  assert.equal(rows[0].source, "Base currency", form);
}
if (FORMS_WITH_HELPER.length > 1) {
  const blocks = FORMS_WITH_HELPER.map((f) => { const s = read(PATHS[f]); return s.slice(s.indexOf(START), s.indexOf(END)).split("\n").map((l) => l.trim()).join("\n"); });
  blocks.slice(1).forEach((b, i) => assert.equal(b, blocks[0], `${FORMS_WITH_HELPER[i + 1]}: breakdown helper differs`));
}

// ---- Contract table: the Case columns and cells ----
const contract = read(PATHS.Contract);
const section = contract.slice(contract.indexOf("const ManualContractServicesSection = ({"), contract.indexOf("const PaymentScheduleSection = ({"));
["\"#\"", "\"Service Name & Type\"", "\"Unit Price\"", "\"VAT (%)\"", "\"Total\"", "`Original: ", "`Missing rate to ", "\"Currency breakdown\"", "`View currency breakdown (", "\"Converted total in \"", "\"Rate to \""]
  .forEach((s) => assert.ok(section.includes(s), `Contract services table lacks ${s}`));
["\"Base price\"", "Gốc:", "Thiếu tỷ giá", "Quy đổi", "\"Đóng\""].forEach((s) => assert.ok(!section.includes(s), `Contract services table still has ${s}`));
assert.ok(!contract.includes("const ServiceLinesSection = ("), "ServiceLinesSection removed");
assert.ok(!contract.includes("SERVICE_STATUS_LABELS"), "its status labels removed");
assert.match(section, /currencyBreakdownRows\(financialSummary\.groups,/, "the modal uses the helper");
console.log("create-forms-look: all tests passed");
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node scripts/tests/create-forms-look.test.js`
Expected: FAIL — markers not found.

- [ ] **Step 3: Delete the dead code**

Confirm there is no caller: `grep -n "ServiceLinesSection" "All Module/Contract/ContractCreateForm.js"` shows only its declaration. Delete from `      const ServiceLinesSection = ({` up to (not including) the line `      // ==================== SERVICES TABLE — CASE-STYLE ICON BUTTONS ====================`. Then `grep -n "serviceStatusLabel\|SERVICE_STATUS_LABELS" …`: if only their own declarations remain, delete `const SERVICE_STATUS_LABELS = { … };` and `const serviceStatusLabel = (status) => { … };`.

- [ ] **Step 4: Add the breakdown helper** (block above, after `// ---- end base conversion helpers ----`).

- [ ] **Step 5: Columns and header**

In `ManualContractServicesSection`:

```js
        const columns = `44px minmax(260px, 1.3fr) minmax(200px, 0.9fr) minmax(190px, 0.85fr) 98px minmax(165px, 0.75fr)${actionColumn}`;
```

`{ style: { minWidth: 1015 } }` → `{ style: { minWidth: 1060 } }`.

Header row: insert as the first child `React.createElement("div", { style: { ...headerStyle, textAlign: "center" } }, "#"),`; change the header texts `"Service"` → `"Service Name & Type"`, `"Base price"` → `"Unit Price"`, `"VAT"` → `"VAT (%)"`; the `"Total"` header style gets `textAlign: "right"` instead of `"center"`.

- [ ] **Step 6: Row number cell**

In `rows.map((row, rowIndex) => {`, after `const isComboSectionStart = …;` add:

```js
                      // "#" numbers rows per section (a combo, or a run of
                      // standalone rows), as the Case form does
                      let sectionRowIndex = 1;
                      for (let j = rowIndex - 1; j >= 0; j--) {
                        const prevKey = rows[j]._comboInstanceId || getPersistedComboGroupKey(rows[j]) || null;
                        if (prevKey !== (rowComboGroupKey || null)) break;
                        sectionRowIndex++;
                      }
```

and as the first child of the row element (before the service button cell):

```js
                        React.createElement(
                          "div",
                          { style: { ...cellStyle, justifyContent: "center", color: C.sub, fontSize: 11.5, fontFamily: "monospace" } },
                          sectionRowIndex,
                        ),
```

- [ ] **Step 7: Row total cell**

In the Total cell: `alignItems: "center"` → `alignItems: "flex-end"`, `textAlign: "center"` → `textAlign: "right"`; `` `Gốc: ${formatMoneyByCurrency(amounts.totalAmount, rowCurrency)}` `` → `` `Original: ${formatMoneyByCurrency(amounts.totalAmount, rowCurrency)}` ``; `` `Thiếu tỷ giá → ${getCurrencyCode(defaultCurrency)}` `` → `` `Missing rate to ${getCurrencyCode(defaultCurrency)}` ``.

- [ ] **Step 8: Footer**

`` `Xem quy đổi tiền tệ (${financialSummary.groups.length} loại)` `` → `` `View currency breakdown (${financialSummary.groups.length} currencies)` ``.
`` `Thiếu tỷ giá quy đổi (${formatMissingRatePairs(financialSummary.missing, defaultCurrency)}) — tổng hợp đồng chưa được cập nhật chính xác.` `` → `` `Missing exchange rate (${formatMissingRatePairs(financialSummary.missing, defaultCurrency)}) — the total is not final.` ``.
Labels: `"Combo Subtotal:"` → `"Combo subtotal:"`, `"VAT %:"` → `"VAT (%):"`, `"VAT Amount:"` → `"VAT amount:"`, `"Combo Total:"` → `"Combo total:"`, the array label `"VAT Amount",` → `"VAT amount",`.

- [ ] **Step 9: Currency modal**

Replace the whole `React.createElement(Modal, { title: "Quy đổi tiền tệ dịch vụ", … })` element (from `React.createElement(\n            Modal,\n            {\n              title: "Quy đổi tiền tệ dịch vụ",` to its closing `),` before the component's final `);`) with:

```js
          React.createElement(
            Modal,
            {
              title: "Currency breakdown",
              open: breakdownOpen,
              onCancel: () => setBreakdownOpen(false),
              footer: React.createElement(AntButton, { type: "primary", onClick: () => setBreakdownOpen(false) }, "Close"),
              width: 900,
            },
            breakdownOpen &&
              (() => {
                const breakdown = currencyBreakdownRows(financialSummary.groups, {
                  isBase: (group) => isSameCurrency(group.currency, defaultCurrency),
                  matchOf: (group) => pickConversionRate(exchangeRates, group.currency, defaultCurrency, pricingDate),
                  codeOf: getCurrencyCode,
                  convert: convertLinesToBase,
                });
                const baseCode = getCurrencyCode(defaultCurrency);
                const right = (extra = {}) => modalTdStyle({ textAlign: "right", fontVariantNumeric: "tabular-nums", ...extra });
                return React.createElement(
                  "div",
                  null,
                  React.createElement("div", { style: { marginBottom: 12, color: C.sub, fontSize: 12.5 } }, `Base currency: ${baseCode}. Rates on the Signed date.`),
                  React.createElement(
                    "div",
                    { style: { overflowX: "auto" } },
                    React.createElement(
                      "table",
                      { style: { width: "100%", minWidth: 760, borderCollapse: "collapse" } },
                      React.createElement(
                        "thead",
                        null,
                        React.createElement(
                          "tr",
                          null,
                          ["Currency", "Original total", "Rate to " + baseCode, "Converted total", "Effective date", "Source"].map((label, i) =>
                            React.createElement("th", { key: label, style: modalThStyle({ textAlign: i === 1 || i === 2 || i === 3 ? "right" : "left" }) }, label),
                          ),
                        ),
                      ),
                      React.createElement(
                        "tbody",
                        null,
                        breakdown.map((item) =>
                          React.createElement(
                            "tr",
                            { key: item.key },
                            React.createElement("td", { style: modalTdStyle({ fontWeight: 700 }) }, `${item.currencyCode} (${item.lineCount})`),
                            React.createElement("td", { style: right({ fontWeight: 700 }) }, formatMoneyByCurrency(item.originalTotal, item.currency)),
                            React.createElement(
                              "td",
                              { style: right({ color: item.status === "missing" ? "#d48806" : C.text }) },
                              item.rate ? item.rate.toLocaleString("en-US", { maximumFractionDigits: 6 }) : "Missing",
                            ),
                            React.createElement(
                              "td",
                              { style: right({ fontWeight: 800, color: item.convertedTotal === null ? C.sub : "#389e0d" }) },
                              item.convertedTotal === null ? "—" : formatMoneyByCurrency(item.convertedTotal, defaultCurrency),
                            ),
                            React.createElement("td", { style: modalTdStyle({ color: C.sub, fontSize: 12.5 }) }, item.effectiveDate ? formatDateDisplay(String(item.effectiveDate).slice(0, 10)) : "—"),
                            React.createElement("td", { style: modalTdStyle({ color: C.sub, fontSize: 12.5 }) }, item.source),
                          ),
                        ),
                      ),
                    ),
                  ),
                  financialSummary.converted.canConvert &&
                    React.createElement(
                      "div",
                      { style: { marginTop: 12, padding: "10px 12px", borderRadius: 7, background: "#f6ffed", border: "1px solid #b7eb8f", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" } },
                      React.createElement("span", { style: { fontWeight: 700, color: C.text } }, "Converted total in " + baseCode),
                      React.createElement("span", { style: { fontWeight: 800, color: "#389e0d" } }, formatMoneyByCurrency(financialSummary.converted.totalAmount, defaultCurrency)),
                    ),
                );
              })(),
          ),
```

(`formatDateDisplay` is defined at module level in this file; `modalThStyle`/`modalTdStyle` inside the component. The test looks for the literals `"Converted total in "` and `"Rate to "`, hence the string concatenation.)

- [ ] **Step 10: Run the tests**

Run: `node scripts/tests/create-forms-look.test.js` → `all tests passed`. Node suite → `node suite fail=0`.

- [ ] **Step 11: Record**

Ledger line: `Task 5: complete (…)`. No commit.

---

### Task 6: Quotation and Case look

**Files:**
- Modify: `All Module/Quotation/QuotationCreateForm.js`, `All Module/Case/CaseCreateForm.js`
- Modify: `scripts/tests/create-forms-look.test.js`

**Interfaces:**
- Consumes: `currencyBreakdownRows` text from Task 5 (copied verbatim).

- [ ] **Step 1: Extend the test**

In `scripts/tests/create-forms-look.test.js` change the default of `LOOK_FORMS` to `"Contract,Quotation"` and append before the final `console.log`:

```js
// ---- Quotation: same cells, footer and modal ----
const quotation = read(PATHS.Quotation);
["`Original: ", "`Missing rate to ", "\"Currency breakdown\"", "`View currency breakdown (", "\"Combo subtotal:\"", "\"VAT (%):\"", "\"VAT amount:\"", "\"Combo total:\""]
  .forEach((s) => assert.ok(quotation.includes(s), `Quotation lacks ${s}`));
["Gốc:", "Thiếu tỷ giá", "Quy đổi tiền tệ", "\"Combo Subtotal:\"", "\"VAT Amount:\"", "\"Combo Total:\""].forEach((s) => assert.ok(!quotation.includes(s), `Quotation still has ${s}`));
assert.match(quotation, /currencyBreakdownRows\(financialSummary\.groups,/, "Quotation modal uses the helper");

// ---- Case: footer labels and button ----
const kase = read(PATHS.Case);
["\"VAT amount\"", "\"Combo subtotal:\"", "\"VAT (%):\"", "\"VAT amount:\"", "\"Combo total:\"", "`View currency breakdown ("].forEach((s) => assert.ok(kase.includes(s), `Case lacks ${s}`));
["\"Total VAT\"", "\"Combo Subtotal:\"", "\"VAT Amount:\"", "\"Combo Total:\"", "\"View breakdown\""].forEach((s) => assert.ok(!kase.includes(s), `Case still has ${s}`));
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node scripts/tests/create-forms-look.test.js`
Expected: FAIL — Quotation markers not found.

- [ ] **Step 3: Quotation — helper, cells, footer**

Paste the `currencyBreakdownRows` block (no indentation) directly after `// ---- end base conversion helpers ----`.
Row total cell: `` `Gốc: ${formatMoneyByCurrency(line.totalAmount, rowCurrency)}` `` → `` `Original: ${formatMoneyByCurrency(line.totalAmount, rowCurrency)}` ``; `` `Thiếu tỷ giá → ${getCurrencyCode(baseCurrency)}` `` → `` `Missing rate to ${getCurrencyCode(baseCurrency)}` ``.
Footer: `` `Xem quy đổi tiền tệ (${financialSummary.groups.length} loại)` `` → `` `View currency breakdown (${financialSummary.groups.length} currencies)` ``; `` `Thiếu tỷ giá quy đổi (${formatMissingRatePairs(financialSummary.missing, baseCurrency)}) — tổng báo giá chưa được cập nhật chính xác.` `` → `` `Missing exchange rate (${formatMissingRatePairs(financialSummary.missing, baseCurrency)}) — the total is not final.` ``.
Labels: `"Combo Subtotal:"` → `"Combo subtotal:"`, `"VAT %:"` → `"VAT (%):"`, `"VAT Amount:"` → `"VAT amount:"`, `"Combo Total:"` → `"Combo total:"`, the footer array label `"VAT Amount",` (~6474) → `"VAT amount",`.

- [ ] **Step 4: Quotation — modal**

Replace the `Modal` element titled `"Quy đổi tiền tệ dịch vụ"` (from `React.createElement(\r\n      Modal,\r\n      {\r\n        title: "Quy đổi tiền tệ dịch vụ",` to the `),` that closes it, just before the `compareModal` Modal) with:

```js
    React.createElement(
      Modal,
      {
        title: "Currency breakdown",
        open: breakdownOpen,
        onCancel: () => setBreakdownOpen(false),
        footer: React.createElement(
          AntButton || "button",
          AntButton
            ? { type: "primary", onClick: () => setBreakdownOpen(false) }
            : { onClick: () => setBreakdownOpen(false) },
          "Close",
        ),
        width: 900,
      },
      breakdownOpen &&
        React.createElement(Table, {
          dataSource: currencyBreakdownRows(financialSummary.groups, {
            isBase: (group) => isSameCurrency(group.currency, baseCurrency),
            matchOf: (group) => pickConversionRate(exchangeRates, group.currency, baseCurrency),
            codeOf: getCurrencyCode,
            convert: convertLinesToBase,
          }),
          rowKey: "key",
          pagination: false,
          size: "small",
          bordered: true,
          scroll: { x: 760 },
          columns: [
            { title: "Currency", key: "currency", render: (_, item) => React.createElement("span", { style: { fontWeight: 700 } }, `${item.currencyCode} (${item.lineCount})`) },
            { title: "Original total", key: "originalTotal", align: "right", render: (_, item) => formatMoneyByCurrency(item.originalTotal, item.currency) },
            {
              title: "Rate to " + getCurrencyCode(baseCurrency),
              key: "rate",
              align: "right",
              render: (_, item) =>
                item.rate
                  ? item.rate.toLocaleString("en-US", { maximumFractionDigits: 6 })
                  : React.createElement("span", { style: { color: "#d48806" } }, "Missing"),
            },
            {
              title: "Converted total",
              key: "converted",
              align: "right",
              render: (_, item) =>
                item.convertedTotal === null
                  ? "—"
                  : React.createElement("span", { style: { fontWeight: 700, color: "#389e0d" } }, formatMoneyByCurrency(item.convertedTotal, baseCurrency)),
            },
            { title: "Effective date", key: "effectiveDate", render: (_, item) => (item.effectiveDate ? String(item.effectiveDate).slice(0, 10).split("-").reverse().join("/") : "—") },
            { title: "Source", key: "source", render: (_, item) => item.source },
          ],
        }),
    ),
```

Delete `getBreakdownGroupRate` if no other caller remains (`grep -n "getBreakdownGroupRate" "All Module/Quotation/QuotationCreateForm.js"`).

- [ ] **Step 5: Case — labels and button**

`["Total VAT", formatMoney(displayTotals.vatAmount, totalsCurrency), C.warning, false],` → `["VAT amount", …]` (same row, label only).
`"Combo Subtotal:"` → `"Combo subtotal:"`, `"VAT %:"` → `"VAT (%):"`, `"VAT Amount:"` → `"VAT amount:"`, `"Combo Total:"` → `"Combo total:"` (the footer spans ~7987–8033).
`"View breakdown",` (~7760) → `` `View currency breakdown (${sortedLineTotalsByCurrency.length} currencies)`, ``.

- [ ] **Step 6: Run the tests**

Run: `node scripts/tests/create-forms-look.test.js` → pass. Node suite → `node suite fail=0`.

- [ ] **Step 7: Record**

Ledger line: `Task 6: complete (…)`. No commit.

---

### Task 7: English everywhere on the three forms

**Files:**
- Modify: `All Module/Case/CaseCreateForm.js`, `All Module/Contract/ContractCreateForm.js`, `All Module/Quotation/QuotationCreateForm.js`
- Create: `scripts/tests/create-forms-english.test.js`

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/create-forms-english.test.js`:

```js
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
for (const rel of FORMS) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
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
const contract = fs.readFileSync(path.join(root, FORMS[1]), "utf8");
["\"Fee model\"", "\"Hourly rate\"", "\"Estimated hours\"", "\"Success fee\"", "\"Fixed amount\""].forEach((s) =>
  assert.ok(!contract.includes(s), `Contract still documents ${s}`));
console.log("create-forms-english: all tests passed");
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node scripts/tests/create-forms-english.test.js`
Expected: FAIL listing the Vietnamese strings of the Case form first.

- [ ] **Step 3: Case strings**

| Line (≈) | Now | Becomes |
|---|---|---|
| 5531, 7471 | `` `Tiết kiệm ${…} (${…}%)` `` | `` `Save ${…} (${…}%)` `` (same expressions) |
| 5718, 7465 | `` `Giá lẻ: ${…}` `` | `` `Individual price: ${…}` `` |
| 5720 | `` `Giảm ${…}` `` | `` `Discount ${…}` `` |
| 5722 | `` `Tăng ${…}` `` | `` `Increase ${…}` `` |
| 11024 | `"Không thể lưu currency của hồ sơ do lỗi hệ thống — vui lòng kiểm tra lại sau khi tạo."` | `"Could not save the case currency — check it after the case is created."` |
| 11163 | `` `Không thể lưu currency cho dịch vụ "${data?.serviceName \|\| ""}" do lỗi hệ thống — vui lòng kiểm tra lại sau khi tạo.` `` | `` `Could not save the currency of service "${data?.serviceName || ""}" — check it after the case is created.` `` |
| 11250 | `"Không thể đồng bộ currency của hợp đồng liên kết do lỗi hệ thống — vui lòng kiểm tra lại sau khi tạo."` | `"Could not sync the linked contract's currency — check it after the case is created."` (if Task 4 deleted this block, skip) |
| 12177 | `"Khách hàng"` | `"Customer"` |

- [ ] **Step 4: Contract strings**

Lawyer types (`lawyerTypeLabel`'s `labels`): `lawyer: "Lawyer"`, `suppliant: "Legal assistant"`, `partner: "Partner"`, `managing_partner: "Managing partner"`, `senior_partner: "Senior partner"`, `associate: "Associate"`, `senior_associate: "Senior associate"`, `junior_associate: "Associate"`, `counsel: "Counsel"`, `of_counsel: "Of counsel"`, `consultant: "Consultant"`, `paralegal: "Paralegal"`, `legal_assistant: "Legal assistant"`, `trainee: "Trainee lawyer"`, `intern: "Intern"`, `collaborator: "Collaborator"`, `external: "External"`; in `lawyerLabel`, `typeLabel !== "Luật sư"` → `typeLabel !== "Lawyer"`.

| Line (≈) | Now | Becomes |
|---|---|---|
| 1859 | `"Dịch vụ"` | `"Service"` |
| 5879, 6884 | `` `Tiết kiệm …` `` | `` `Save …` `` |
| 6027, 6878 | `` `Giá lẻ: …` `` | `` `Individual price: …` `` |
| 6029 / 6031 | `` `Giảm …` `` / `` `Tăng …` `` | `` `Discount …` `` / `` `Increase …` `` |
| 10622 | `resolvedContractKind === "appendix" ? "Phụ lục" : "Hợp đồng"` | `… ? "Appendix" : "Contract"` |
| 11122, 12634 | `"Cần giữ lại ít nhất 1 dịch vụ từ Case/Quotation nguồn."` | `"Keep at least one service from the source Case/Quotation."` |
| 11377 | `` `Hợp đồng - ${targetLine.serviceName}` `` | `` `Contract - ${targetLine.serviceName}` `` |
| 11978 | `"Dịch vụ thủ công"` | `"Custom service"` |
| 12225 | `"Không tìm thấy tỷ giá quy đổi từ tiền tệ của combo dịch vụ sang VND — giữ nguyên số tiền gốc, vui lòng kiểm tra lại."` | `"No exchange rate from the combo's currency to VND — the original amount is kept; check the rates."` |
| 12243 | `"Combo dịch vụ này chưa có dịch vụ nào."` | `"This combo has no services yet."` |
| 12348, 12527 | `` `Đã bỏ qua ${n} dịch vụ đã có trên hợp đồng: ${names}` `` | `` `Skipped ${skippedDuplicateNames.length} service(s) already on the contract: ${skippedDuplicateNames.join(", ")}` `` |
| 12425 | `` `Đã áp dụng combo dịch vụ "${combo.comboName}".` `` | `` `Combo "${combo.comboName}" applied.` `` |
| 12607 | `` `Đã áp dụng combo dịch vụ "${comboName}".` `` | `` `Combo "${comboName}" applied.` `` |
| 12733 | `` `Thiếu tỷ giá quy đổi ${getCurrencyCode(rowCurrency)} sang VND — giá dịch vụ này chưa được cộng vào Total, vui lòng kiểm tra tỷ giá.` `` | `` `Missing exchange rate ${getCurrencyCode(rowCurrency)} → VND — this service is not in the total yet; check the rates.` `` |
| 13560 | `"Hợp đồng",` (folder name) | `"Contract",` |
| 14315 | `label: "Thanh toán một lần",` | `label: "One-time payment",` |
| 14752, 14771 | `"Hướng dẫn"` | `"Guide"` |
| 14942 | `"Vui lòng chọn Internal company ở trên để tiếp tục nhập thông tin hợp đồng."` | `"Select the Internal company above to continue."` |
| 15191 | the Retainer "Amount per cycle" tooltip | `"Open-ended retainer (Retainer duration blank): this amount is billed EVERY period until the next period passes End date (for ever without an End date)."` |
| 15197 | `"= tổng các dịch vụ (VND). Sửa giá dịch vụ để đổi tổng hợp đồng."` | `"= the sum of the services (VND). Change a service price to change the contract total."` |
| 15400 | `"Giải thích trường dữ liệu"` | `"Contract guide"` |

Replace the whole `const FIELD_HELP = { … };` object with:

```js
      const FIELD_HELP = {
        "Internal company": "The firm entity that provides the services. The service list is filtered by it.",
        "Payment mode": "Non-recurring: billed by case or by service. Recurring: a retainer billed every period.",
        "Contract type": "By Case: installments for the whole matter. By Service: each service or combo is billed when its trigger tasks are done.",
        Status: "Internal processing status of the contract.",
        "Contract code": "Leave blank to generate CT… (main contract) or PL… (appendix) from the signed month.",
        "Contract name": "Name used to find the contract in lists and search.",
        "Parent contract": "The main contract, when this one is an appendix.",
        "Require approval": "Tick when the contract must be approved before execution.",
        Approver: "The lawyer who approves the contract.",
        Customer: "The client. Quotations are filtered by this customer.",
        Lawyer: "The lawyer in charge.",
        Template: "The document template used to draft or print the contract.",
        Quotation: "The related quotation. Picking one fills customer, company and lawyer; the amounts come from the services below.",
        Case: "The case this contract serves.",
        "Signed date": "The day the contract is signed. Foreign-currency services are converted to VND at this day's rate.",
        "Billing cycle": "One time: a single payment. Multiple payments: enter the installments below.",
        "First payment": "The first payment date (one-time By Case, or the first retainer period).",
        "End date": "The end of the contract. A retainer stops billing after this date.",
        "Total amount": "The contract value. With priced services it is their sum in VND and cannot be edited.",
        "Retainer duration": "Number of periods. Filled: each period bills Total amount ÷ periods. Blank: the amount is billed every period until End date.",
        "Retainer repeat": "The period length: day, week, month or year.",
        "Next payment": "Worked out from First payment and Retainer repeat.",
      };
```

Replace the whole `const TutorialPanel = ({ contractType }) => { … };` with:

```js
      const TutorialPanel = ({ contractType }) => {
        const isRetainer = contractType === "retainer";
        const fromHelp = (keys) => keys.map((key) => [key, FIELD_HELP[key]]);
        const groups = [
          {
            title: "Contract",
            rows: fromHelp(["Internal company", "Payment mode", "Contract type", "Status", "Contract code", "Contract name", "Parent contract", "Require approval", "Approver"]),
          },
          { title: "Related", rows: fromHelp(["Customer", "Lawyer", "Template", "Quotation", "Case"]) },
          {
            title: "Commercial terms",
            rows: fromHelp(
              isRetainer
                ? ["Signed date", "First payment", "End date", "Total amount", "Retainer duration", "Retainer repeat", "Next payment"]
                : ["Signed date", "Billing cycle", "First payment", "End date", "Total amount"],
            ),
          },
          {
            title: "Services and payments",
            rows: [
              ["Services", "Pick from the company's catalog or create one. Line pricing: each service has its own price and VAT. Combo pricing: one price for the whole combo."],
              ["Currencies", "Each service keeps its own currency; totals are in VND at the Signed-date rate. View currency breakdown shows the rates used."],
              ["Payment schedule", "Multiple payments only: percentages add up to 100% and each installment names at least one service."],
              ["Payment triggers", "Tick the tasks whose completion activates a payment."],
            ],
          },
        ];
        return React.createElement(
          "div",
          { style: { border: `1px solid ${C.border}`, borderRadius: 8, background: C.bgSoft, padding: 16 } },
          React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 } }, "Contract fields"),
          React.createElement(
            "div",
            { style: { fontSize: 12.5, color: C.sub, lineHeight: "19px", marginBottom: 14 } },
            "What each field means. Fields you are unsure about can be left blank and filled in later.",
          ),
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", columnGap: 18, rowGap: 12, alignItems: "start" } },
            groups.map((group) =>
              React.createElement(
                "div",
                { key: group.title, style: { borderTop: `1px solid ${C.border}`, paddingTop: 12 } },
                React.createElement("div", { style: { fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 7 } }, group.title),
                group.rows.map(([name, desc]) =>
                  React.createElement(
                    "div",
                    { key: name, style: { marginTop: 8 } },
                    React.createElement("div", { style: { fontSize: 12.5, fontWeight: 700, color: C.label, marginBottom: 2 } }, name),
                    React.createElement("div", { style: { fontSize: 12.5, color: C.sub, lineHeight: "19px" } }, desc),
                  ),
                ),
              ),
            ),
          ),
        );
      };
```

- [ ] **Step 5: Quotation strings**

| Line (≈) | Now | Becomes |
|---|---|---|
| 2924, 2932 | `` `Khách hàng #${c.id}` `` | `` `Customer #${c.id}` `` |
| 4237, 6675 | `` `Tiết kiệm …` `` | `` `Save …` `` |
| 4409, 6669 | `` `Giá lẻ: …` `` | `` `Individual price: …` `` |
| 4411 / 4413 | `` `Giảm …` `` / `` `Tăng …` `` | `` `Discount …` `` / `` `Increase …` `` |
| 6029 | `"So sánh giá trị dịch vụ hiện tại trong form với dữ liệu gốc từ Company Service catalog."` | `"Compare each service in the form with the company service catalog."` |
| 8565 | `"Không tìm thấy tỷ giá quy đổi từ tiền tệ của combo dịch vụ sang VND — giữ nguyên số tiền gốc, vui lòng kiểm tra lại."` | `"No exchange rate from the combo's currency to VND — the original amount is kept; check the rates."` |
| 8575 | `"Gói dịch vụ này chưa có dịch vụ nào."` | `"This combo has no services yet."` |
| 8688, 8873 | `` `Đã bỏ qua ${skippedDuplicateNames.length} dịch vụ đã có trên báo giá: ${skippedDuplicateNames.join(", ")}` `` | `` `Skipped ${skippedDuplicateNames.length} service(s) already on the quotation: ${skippedDuplicateNames.join(", ")}` `` |
| 8740 | `` `Đã gộp ${mergeResult.merged.length} dịch vụ lẻ vào combo "${combo.comboName \|\| ""}": ${mergeResult.merged.map((row) => row.serviceName \|\| "Dịch vụ").join(", ")}` `` | `` `Merged ${mergeResult.merged.length} standalone service(s) into combo "${combo.comboName || ""}": ${mergeResult.merged.map((row) => row.serviceName || "Service").join(", ")}` `` |
| 8921 | same with `comboName` | same English with `"${comboName}"` |
| 8766 / 8960 | `` `Đã áp dụng combo dịch vụ "${…}".` `` | `` `Combo "${…}" applied.` `` |
| 8976 | `` `Đã xoá kèm ${mergedGoing.length} dịch vụ đã gộp vào combo này: ${mergedGoing.map((r) => r.serviceName \|\| "Dịch vụ").join(", ")}` `` | `` `Also removed ${mergedGoing.length} service(s) merged into this combo: ${mergedGoing.map((r) => r.serviceName || "Service").join(", ")}` `` |
| 9148, 9209 | `"Dịch vụ này đã có trên báo giá."` | `"This service is already on the quotation."` |
| 9176 | `` `Thiếu tỷ giá quy đổi ${getCurrencyCode(rowCurrency)} sang VND — …` `` | `` `Missing exchange rate ${getCurrencyCode(rowCurrency)} → VND — this service is not in the total yet; check the rates.` `` |
| 9461 | `` `Báo giá bổ sung${…}` `` | `` `Supplementary quotation${…}` `` (keep the inner `` ` - ${…serviceName}` ``) |
| 9462 | `"Báo giá"` | `"Quotation"` |
| 9959 | `"Hướng dẫn"` | `"Guide"` |

Replace `const FIELD_HELP = { … };` with:

```js
const FIELD_HELP = {
  "Internal Issuing Company": "The firm entity that issues the quotation. Services and templates are filtered by it.",
  "Related Lead": "The lead, when the quotation comes from a sales opportunity that is not a customer yet.",
  "Related Customer": "The customer, when they already have a customer record.",
  "Assigned Lawyer": "The lawyer in charge of the quotation and the services that follow.",
  "Require approval before sending": "Tick when someone must review the quotation before it is sent.",
  Approver: "The person who reviews the quotation.",
  "Payment Terms": "Expected payment terms, e.g. immediate, net 15, net 30.",
  "Quotation Template": "The template used to generate the quotation document.",
  "Valid Until": "The last day the quotation is valid.",
  Address: "The address printed on the quotation, if the template uses one.",
  "Short Description": "A short note about the quotation.",
  "Service List": "The services offered in this quotation.",
  "Service Name": "A service from the internal company's catalog.",
  Description: "The scope of work of each line; edit it for this quotation.",
  "Unit Price": "The price of one unit, before VAT, in the line's currency.",
  "VAT %": "The VAT rate of the line.",
  Subtotal: "The amount before VAT.",
  "VAT amount": "The VAT of the line.",
  Total: "The amount after VAT, in VND.",
};
```

(If a `Field` in the Quotation form is labelled `"VAT Amount"`, rename that label to `"VAT amount"` too; check with `grep -n '"VAT Amount"' "All Module/Quotation/QuotationCreateForm.js"`.)

In `QuotationTutorialPanel`, replace the `const groups = [ … ];` with:

```js
  const fromHelp = (keys) => keys.map((key) => [key, FIELD_HELP[key]]);
  const groups = [
    { title: "Related", rows: fromHelp(["Internal Issuing Company", "Related Lead", "Related Customer", "Assigned Lawyer"]) },
    { title: "Quotation terms", rows: fromHelp(["Payment Terms", "Quotation Template", "Valid Until", "Address"]) },
    { title: "Services", rows: fromHelp(["Service Name", "Description", "Unit Price", "VAT %"]) },
    {
      title: "Totals",
      rows: [
        ...fromHelp(["Subtotal", "VAT amount", "Total"]),
        ["Currencies", "Each service keeps its own currency; totals are in VND at today's rate. View currency breakdown shows the rates used."],
      ],
    },
  ];
```

and its two texts: `"Hướng dẫn tạo báo giá"` → `"Quotation fields"`, the intro `"Phần này giải thích …"` → `"What each field means. The quotation document itself is generated from the template."`.

- [ ] **Step 6: Run the tests**

Run: `node scripts/tests/create-forms-english.test.js` → `all tests passed` (fix any line it still lists with the same rules). Node suite → `node suite fail=0`.

- [ ] **Step 7: Record**

Ledger line: `Task 7: complete (…)`. No commit.

---

### Task 8: Apply to the local copy and hand over

**Files:**
- Create: `scripts/local/deploy-create-forms.js`
- Create: `scripts/tests/deploy-create-forms.test.js`

**Interfaces:**
- Produces: `planTargets(models: [{ uid, options }]) → { targets: [{ uid, form, oldLength }], orphans: [{ uid, form, oldLength }] }`, `withCode(options, code) → options` (deep copy), `FORMS`.

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/deploy-create-forms.test.js`:

```js
const assert = require("node:assert/strict");
const { planTargets, withCode } = require("../local/deploy-create-forms");

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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node scripts/tests/deploy-create-forms.test.js`
Expected: FAIL — `Cannot find module '../local/deploy-create-forms'`.

- [ ] **Step 3: Write the script**

Create `scripts/local/deploy-create-forms.js`:

```js
// Writes the repo's three create forms into the LOCAL NocoBase copy
// (localhost / nocobase-law): every JS block whose code declares the form and
// whose parent chain reaches a root gets the repo file. Orphans (a missing
// parent somewhere up the chain) are listed, not written.
//
//   node scripts/local/deploy-create-forms.js           # dry run
//   node scripts/local/deploy-create-forms.js --apply   # back up + write, one transaction
//
// Password: pgpass / PGPASSWORD. Refuses any host or database other than the local copy.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const FORMS = [
  { name: "Case", file: "All Module/Case/CaseCreateForm.js", marker: "const ProjectCreateForm = () =>" },
  { name: "Contract", file: "All Module/Contract/ContractCreateForm.js", marker: "const ContractCreateForm = () =>" },
  { name: "Quotation", file: "All Module/Quotation/QuotationCreateForm.js", marker: "const QuotationCreateForm = () =>" },
];
const CODE_PATH = ["stepParams", "jsSettings", "runJs", "code"];
const codeOf = (options) => CODE_PATH.reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), options);

const planTargets = (models, forms = FORMS) => {
  const byUid = new Map(models.map((m) => [m.uid, m]));
  const attached = (uid) => {
    const seen = new Set();
    let current = byUid.get(uid);
    while (current) {
      if (seen.has(current.uid)) return false;
      seen.add(current.uid);
      const parentId = current.options && current.options.parentId;
      if (!parentId) return true;
      current = byUid.get(parentId);
    }
    return false;
  };
  const targets = [];
  const orphans = [];
  for (const model of models) {
    const code = codeOf(model.options);
    if (typeof code !== "string") continue;
    const form = forms.find((f) => code.includes(f.marker));
    if (!form) continue;
    (attached(model.uid) ? targets : orphans).push({ uid: model.uid, form: form.name, oldLength: code.length });
  }
  return { targets, orphans };
};

const withCode = (options, code) => {
  const next = JSON.parse(JSON.stringify(options || {}));
  let node = next;
  CODE_PATH.slice(0, -1).forEach((key) => {
    if (!node[key] || typeof node[key] !== "object") node[key] = {};
    node = node[key];
  });
  node[CODE_PATH[CODE_PATH.length - 1]] = code;
  return next;
};

async function main() {
  const apply = process.argv.includes("--apply");
  const config = { host: "localhost", port: 5432, user: "postgres", database: "nocobase-law" };
  const { Client } = require("pg");
  const client = new Client(config);
  await client.connect();
  try {
    const { rows } = await client.query('SELECT uid, options FROM "flowModels"');
    const models = rows.map((r) => ({ uid: r.uid, options: typeof r.options === "string" ? JSON.parse(r.options) : r.options }));
    const { targets, orphans } = planTargets(models);
    const codes = Object.fromEntries(FORMS.map((f) => [f.name, fs.readFileSync(path.join(ROOT, f.file), "utf8")]));
    for (const f of FORMS) {
      if (!codes[f.name].includes(f.marker)) throw new Error(`${f.file} lost its marker "${f.marker}"`);
    }
    console.log(`targets (${targets.length}):`);
    targets.forEach((t) => console.log(`  ${t.form.padEnd(9)} ${t.uid}  ${t.oldLength} -> ${codes[t.form].length}`));
    console.log(`orphans, not written (${orphans.length}):`);
    orphans.forEach((t) => console.log(`  ${t.form.padEnd(9)} ${t.uid}`));
    if (!apply) {
      console.log("dry run — pass --apply to write");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
    const backup = `flowModels_backup_${stamp}`;
    await client.query("BEGIN");
    await client.query(`CREATE TABLE "${backup}" (LIKE "flowModels" INCLUDING ALL)`);
    await client.query(`INSERT INTO "${backup}" SELECT * FROM "flowModels" WHERE uid = ANY($1)`, [targets.map((t) => t.uid)]);
    for (const t of targets) {
      const model = models.find((m) => m.uid === t.uid);
      await client.query('UPDATE "flowModels" SET options = $1::json WHERE uid = $2', [JSON.stringify(withCode(model.options, codes[t.form])), t.uid]);
    }
    await client.query("COMMIT");
    console.log(`written ${targets.length}; backup table "${backup}"`);
    console.log(`restore: UPDATE "flowModels" f SET options = b.options FROM "${backup}" b WHERE f.uid = b.uid;`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = { planTargets, withCode, FORMS };
```

- [ ] **Step 4: Run the test**

Run: `node scripts/tests/deploy-create-forms.test.js` → `all tests passed`.

- [ ] **Step 5: Final regression before touching the database**

Run the Node suite and the SQL suite. Expected: `node suite fail=0`; every SQL file `PASSED`.

- [ ] **Step 6: Back up and apply the SQL to the local copy**

```bash
export PATH="$PATH:/c/Program Files/PostgreSQL/16/bin"
B="$SCRATCH/pre-stage-c-$(date +%Y%m%d%H%M%S).sql"   # $SCRATCH = the session scratchpad directory
pg_dump -h localhost -U postgres -d nocobase-law --schema-only -t '"flowModels"' > /dev/null   # connection check
psql -h localhost -U postgres -d nocobase-law -At -c "SELECT pg_get_functiondef('public.money_thread_before'::regproc), pg_get_functiondef('public.money_exchange_rate_guard'::regproc)" > "$B"
psql -h localhost -U postgres -d nocobase-law -v ON_ERROR_STOP=1 -f pgsql/service_thread_sync.sql
psql -h localhost -U postgres -d nocobase-law -v ON_ERROR_STOP=1 -f pgsql/currency_catalog.sql
psql -h localhost -U postgres -d nocobase-law -At -c "SELECT prosrc LIKE '%which has payments%' FROM pg_proc WHERE proname = 'money_thread_before'"
```

Expected: both files apply without `ERROR`; the last query prints `t`. Record `$B` in the ledger.

- [ ] **Step 7: Dry-run, then apply the JS blocks**

Run: `node scripts/local/deploy-create-forms.js`
Expected: `targets` lists 2 Contract, 14 Case, 27 Quotation (counts may differ if the user edited pages since 2026-09-30 — any change is fine as long as every attached copy is listed); `orphans` lists the Quotation orphans.

Run: `node scripts/local/deploy-create-forms.js --apply`
Expected: `written N; backup table "flowModels_backup_<stamp>"`. Record the table name and the restore statement in the ledger.

Verify: `psql -h localhost -U postgres -d nocobase-law -At -c "SELECT count(*) FROM \"flowModels\" WHERE options::text LIKE '%cross-document payload helpers%'"` → the number written.

- [ ] **Step 8: Field registrations (hand to the user)**

`JsField/RegisterMoneyFlowFields.js`, `JsField/RegisterServiceThreadFields.js`, `JsField/RegisterCompanyServiceCurrency.js` need `ctx` in a logged-in browser. Check whether the local app answers: `curl -s -o /dev/null -w "%{http_code}" http://localhost:13000/api/app:getInfo`. Hand-over tells the user to run them (in that order) in the console of an admin page of the local app, after starting it.

- [ ] **Step 9: Hand-over**

Tell the user (Vietnamese): what changed, the backup table + restore statement, the SQL backup file, the three registration scripts to run, `yarn dev` restart, and the manual test list from spec §7 (10 scenarios). Ledger line `Task 8: complete`.

---

## Self-review notes

- Spec §3 → Tasks 5, 6; §4 → Tasks 2, 3; §5 → Tasks 1, 7; §6 → Task 4; §7 → Task 8; §8 tests → each task's test file.
- Helper names used across tasks: `lineAmountsInCurrency` (T2), `frozenSourceRate` / `rowFrozenRate` (T3), `lineWritePayload` / `linkedLineFollowUpPayload` / `apiErrorText` (T4), `currencyBreakdownRows` (T5, T6), `planTargets` / `withCode` (T8).
- Task 4 places its Case helper block after Task 3's `// ---- end source rate helpers ----` — run Task 3 first.
- Task 5's modal uses `pricingDate` from Task 2 — run Task 2 first.
