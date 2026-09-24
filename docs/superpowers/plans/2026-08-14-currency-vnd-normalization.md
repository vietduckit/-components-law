# Currency VND-Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current three-tier Record/Line/Display currency model in Contract, Quotation and Case service-line pricing with a single rule: **each service line keeps its own currency (unchanged), and is auto-converted to VND the moment it has a resolvable exchange rate; every module-level total (`contracts`/`quotations`/`projects` totalAmount) is always a straight VND sum — no per-module `currencyId`, no Display-currency toggle, no mixed-currency grouping.**

**Architecture:** `basePrice`/`vat` stay editable in the line's own currency (dropdown next to the Price input, unchanged UI). A per-row pricing helper (`buildServicePricingPayload`, already present in all three files) is extended to also resolve the line's exchange rate to VND (via the existing `pickConversionRate`/`fetchExchangeRatesForConversion` helpers, just re-targeted at VND instead of at the module's own `currencyId`) and to return **VND-denominated `subTotal`/`vatAmount`/`totalAmount`** plus a frozen `exchangeRateToBase`. Module totals become a plain reduce over rows — no currency grouping, no "Display currency" pipeline, no "Base-currency" pipeline (those two parallel pipelines are deleted outright). `CaseServices.js`'s three hand-duplicated cascade-sync functions (`syncQuotationHeaderFromServices`, `syncContractHeaderFromServices`, `syncCaseTotalAmount`) collapse from "fetch rows → group by currency → fetch rates → convert → sum" down to "fetch rows → sum `subTotal`/`vatAmount`/`totalAmount` directly", because by the time they run those fields are already VND.

**Tech Stack:** Nocobase JS Field/Action blocks (plain JS + `React.createElement`, no JSX literals, no bundler/imports — everything comes off `ctx.React`/`ctx.antd`/`ctx.api`). No unit-test framework exists in this repo.

## Global Constraints

- Nocobase single-file constraint: `ContractServices.js`, `QuotationServices.js`, `CaseServices.js` are each a single self-contained block — do not split any of them into multiple files/modules. All new helpers stay inside the file that needs them (some duplication across the three files is expected and pre-existing; do not try to unify across files).
- No `fetch()` — only `ctx.api.request()` (already how all three files talk to Nocobase; do not introduce new HTTP calls of any other kind).
- No direct `import` — only `ctx.React`, `ctx.antd`, `ctx.importAsync()`, `ctx.requireAsync()` (not needed for this plan — no new libraries required).
- Money is always displayed formatted per `CLAUDE.md`'s VND convention; `roundMoneyForCurrency` must be used for every money rounding (never a bare `Math.round()` on a value whose currency could be non-integer-precision) — this plan explicitly fixes the remaining bare-`Math.round()` call sites found in `CaseServices.js`.
- Activity log is written by PostgreSQL triggers, never from JS — none of these tasks touch activity-log code.
- **No automated test runner exists for these files.** Every task's verification step is: (a) `node --check <file>` for a syntax sanity pass (these files are plain JS with `React.createElement`, so `--check` parses cleanly even though `ctx`/`React`/etc. are undefined at parse time — it only fails on real syntax errors), and (b) a manual QA checklist the user runs against the live Nocobase app after pasting the updated block content in. Do not claim a task "passes tests" — say "syntax-checked; needs manual QA in Nocobase" instead.
- Preserve each file's existing code style exactly: `React.createElement(...)` (not JSX), `const`/`useMemo`/`useCallback` patterns already in use, Vietnamese UI strings where the existing UI already uses Vietnamese (e.g. warning/error messages), English where the existing UI already uses English (`CaseServices.js`'s pricing-summary UI is English — keep it English there; `ContractServices.js`/`QuotationServices.js`'s warnings are Vietnamese — keep them Vietnamese).

## Behavioral decision this plan encodes (read before executing)

Today, when a mixed-currency Save is missing an exchange rate, the code **partially saves** (keeps existing DB totals, warns, but still saves everything else — FR-6.4 in `CURRENCY_LOGIC_SRS.md`). This plan changes that to **block the entire Save** with a specific per-row error (`Dịch vụ "X" (USD) chưa có tỷ giá quy đổi sang VND — không thể lưu.`) naming the offending service, because under the new model there is no "safe fallback total" to keep — every row must resolve to VND before totals mean anything. This is a deliberate UX change, not an oversight; it is simpler and safer than the old partial-save behavior. Flagging it here since it's a user-facing behavior change beyond pure refactor.

## File Structure

Files touched (no new files created — see single-file constraint above):

- `All Module/Contract/ContractServices.js` — Tasks 1–4
- `All Module/Quotation/QuotationServices.js` — Tasks 5–8
- `All Module/Case/CaseServices.js` — Tasks 9–13
- `pgsql/multi_currency_migration.sql` — Task 14 (comments/documentation only, no schema change — the `currency`/`currencyId` and `exchangeRateToBase` columns already exist on `contractServices`/`quotationServices` per the live Nocobase "Configure fields" screenshots the user provided; this file's comments currently say otherwise and must be corrected)
- `CURRENCY_LOGIC_SRS.md` — Task 15 (full rewrite of the FR/invariant/test-case sections to match the new model)

**Execution order matters.** Tasks 9–12 (CaseServices.js cascade-sync simplification) assume `contractServices.subTotal/vatAmount/totalAmount` and `quotationServices.subTotal/vatAmount/totalAmount` are already VND-denominated, which only becomes true after Tasks 1–4 and 5–8 ship. Do not simplify the `CaseServices.js` sync functions before the Contract/Quotation save paths write VND. Task order: 1→2→3→4→5→6→7→8→9→10→11→12→13→14→15.

---

### Task 1: ContractServices.js — currency/exchange-rate helpers retarget to VND

**Files:**
- Modify: `All Module/Contract/ContractServices.js:169-360` (helper block), `:405-451` (`buildConvertedTotals` — delete), `:703-733` (`buildServicePricingPayload` — extend)

**Interfaces:**
- Consumes: nothing new (uses existing `currencies`/`resolveCurrency`/`currencyFromRecord`/`pickConversionRate`/`fetchExchangeRatesForConversion`/`roundMoneyForCurrency`/`isSameCurrency`/`calcLine`/`calcPackageTotals` — all already defined at lines 169-360, 342-350, 369-404, 453-463)
- Produces (used by Tasks 2–4 and by later files as the naming convention to mirror):
  - `findDefaultCurrency(currencies)` — **already exists at lines 225-227**, now becomes load-bearing (previously it was flagged as possibly-unused in the exploration). No signature change.
  - `buildServicePricingPayload({ pricingMode, basePrice, quantity, vat, packageSubTotal, packageVatRate, currency, vndCurrency, exchangeRatesToVnd, pricingDate })` → `{ basePrice, quantity, vat, subTotal, vatAmount, totalAmount, exchangeRateToBase, packageSubTotal, packageVatRate, packageVatAmount, packageTotalAmount, _convertible }` — **signature changed**: dropped `packageCurrency` param (package totals are now always VND), added `vndCurrency`, `exchangeRatesToVnd`, `pricingDate`. `subTotal`/`vatAmount`/`totalAmount` are now VND amounts (`null` when `_convertible` is `false`), not native-currency amounts.

- [ ] **Step 1: Delete the now-unused `buildConvertedTotals` helper**

This function (lines 405-451) implemented the "group lines by currency → fetch rates → convert → sum with a `missing[]` list" pattern for the Display-currency and Base-currency pipelines. Both pipelines are deleted in Task 2, and no other function in this file will call `buildConvertedTotals` after this plan — delete the whole function body (lines 405-451 inclusive, including its leading comment if any).

- [ ] **Step 2: Replace `buildServicePricingPayload` (lines 703-733) with the VND-converting version**

```javascript
const buildServicePricingPayload = ({
  pricingMode,
  basePrice,
  quantity,
  vat,
  packageSubTotal,
  packageVatRate,
  currency,
  vndCurrency,
  exchangeRatesToVnd,
  pricingDate,
}) => {
  if (isPackagePricing(pricingMode)) {
    const totals = calcPackageTotals(packageSubTotal, packageVatRate, vndCurrency);
    return {
      basePrice: 0,
      quantity: 1,
      vat: 0,
      subTotal: totals.subTotal,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      exchangeRateToBase: 1,
      packageSubTotal: totals.subTotal,
      packageVatRate: totals.vatRate,
      packageVatAmount: totals.vatAmount,
      packageTotalAmount: totals.totalAmount,
      _convertible: true,
    };
  }

  const native = calcLine(basePrice, quantity, vat, currency);
  let exchangeRateToBase = 1;
  let convertible = true;
  if (!isSameCurrency(currency, vndCurrency)) {
    const matched = pickConversionRate(exchangeRatesToVnd, currency, vndCurrency, pricingDate);
    if (matched) {
      exchangeRateToBase = matched.rate;
    } else {
      convertible = false;
    }
  }

  const subTotal = convertible ? roundMoneyForCurrency(native.subTotal * exchangeRateToBase, vndCurrency) : null;
  const vatAmount = convertible ? roundMoneyForCurrency(native.vatAmount * exchangeRateToBase, vndCurrency) : null;
  const totalAmount = convertible ? subTotal + vatAmount : null;

  return {
    basePrice,
    quantity,
    vat,
    subTotal,
    vatAmount,
    totalAmount,
    exchangeRateToBase,
    packageSubTotal: null,
    packageVatRate: null,
    packageVatAmount: null,
    packageTotalAmount: null,
    _convertible: convertible,
  };
};
```

`calcLine` and `calcPackageTotals` (lines 453-463) are unchanged — `calcLine` still computes the row's totals in its **own** currency (needed so `native.subTotal`/`native.vatAmount` are rounded at the line currency's own decimal precision before the VND multiplication, per the existing `roundMoneyForCurrency` invariant). `calcPackageTotals` now always receives `vndCurrency` at call sites (Task 2), never `contractCurrency`.

- [ ] **Step 3: Syntax check**

Run: `node --check "All Module/Contract/ContractServices.js"`
Expected: no output (exit code 0). If it errors, the error message will point at a line number — fix the syntax issue before continuing.

- [ ] **Step 4: Commit**

```bash
git add "All Module/Contract/ContractServices.js"
git commit -m "refactor(ContractServices): retarget pricing payload conversion at VND, drop buildConvertedTotals"
```

---

### Task 2: ContractServices.js — replace totals computation with straight VND sum

**Files:**
- Modify: `All Module/Contract/ContractServices.js:1174-1478` (currency/totals memo block — this range covers `getRowCurrency`, `lineTotalsByCurrency`, `hasMixedLineCurrencies`, `packageTotals`, `lineTotals`, `totals`, `totalsCurrency`, `summarySourceGroups`, the Display-currency state/computation, and the Base-currency state/computation)

**Interfaces:**
- Consumes: `buildServicePricingPayload` from Task 1, `findDefaultCurrency`/`fetchExchangeRatesForConversion` from lines 169-404 (unchanged)
- Produces (consumed by Task 3's `handleSave` and Task 4's UI):
  - `vndCurrency` — `useMemo`, the resolved VND currency object
  - `exchangeRatesToVnd` — `useState([])`, exchange rate rows targeting VND
  - `exchangeRatesLoading` — `useState(false)`
  - `pricingDate` — plain `const`, `contract?.signedAt || contract?.date`
  - `packageTotals` — `useMemo`, `{ subTotal, vatRate, vatAmount, totalAmount }`, now always VND
  - `lineTotalsVnd` — `useMemo`, `{ subTotal, vatAmount, totalAmount, missingRows: Row[] }`
  - `totals` — `const`, `isPackageMode ? packageTotals : lineTotalsVnd` (this is now **both** the display totals AND the save totals — no more `effectiveTotals` vs `totals` split)

- [ ] **Step 1: Locate and replace the block**

Find the block starting at `const getRowCurrency = useCallback(` (line ~1179) and ending at the base-currency pipeline's `baseConvertedSummary` memo (line ~1478 per the exploration map — search for the comment `// Base-currency (contractCurrency) conversion` to find the true end, since exact line numbers may have drifted slightly from edits in Task 1). Everything in between — `getRowCurrency`, `currencyOptions`, `displayCurrencyId`/`displayCurrency`/`selectedDisplayCurrencyValue`/`displayCurrencyOptions`, `activeRows`, `lineTotalsByCurrency`, `hasMixedLineCurrencies`, `packageTotals`, `lineTotals`, `totals`, `totalsCurrency`, `summarySourceGroups`, `targetCurrencyId`/`targetCurrencyCode`, `exchangeSourceCurrencyIds`/`exchangeSourceCurrencyKey`, the display-currency fetch `useEffect`, `convertedTotals`/`exchangeBreakdown`/`convertedSummary`, `baseCurrencyId`, `baseExchangeSourceCurrencyIds`/`baseExchangeSourceCurrencyKey`, `baseExchangeRates` state + fetch `useEffect`, `baseConvertedTotals`, `baseConvertedSummary` — gets replaced wholesale with:

```javascript
const getRowCurrency = useCallback(
  (row) => currencyFromRecord(row, currencies, contractCurrency),
  [currencies, contractCurrency],
);

const currencyOptions = useMemo(
  () => currencies.map((c) => ({ value: String(c.id), label: getCurrencyCode(c) })),
  [currencies],
);

const activeRows = useMemo(() => rows.filter((r) => !r._deleted && !isDeletedServiceLine(r)), [rows]);

const vndCurrency = useMemo(() => findDefaultCurrency(currencies), [currencies]);
const vndCurrencyId = extractCurrencyId(vndCurrency);
const pricingDate = contract?.signedAt || contract?.date;

const lineCurrencyIdsNeedingRate = useMemo(() => {
  const ids = new Set();
  activeRows.forEach((r) => {
    const c = getRowCurrency(r);
    if (!isSameCurrency(c, vndCurrency)) {
      const id = extractCurrencyId(c);
      if (id) ids.add(id);
    }
  });
  return Array.from(ids);
}, [activeRows, getRowCurrency, vndCurrency]);
const lineCurrencyIdsKey = lineCurrencyIdsNeedingRate.slice().sort().join(',');

const [exchangeRatesToVnd, setExchangeRatesToVnd] = useState([]);
const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false);
useEffect(() => {
  let cancelled = false;
  if (!lineCurrencyIdsNeedingRate.length || !vndCurrencyId) {
    setExchangeRatesToVnd([]);
    return undefined;
  }
  setExchangeRatesLoading(true);
  fetchExchangeRatesForConversion(lineCurrencyIdsNeedingRate, vndCurrencyId)
    .then((rates) => { if (!cancelled) setExchangeRatesToVnd(rates); })
    .finally(() => { if (!cancelled) setExchangeRatesLoading(false); });
  return () => { cancelled = true; };
}, [lineCurrencyIdsKey, vndCurrencyId]);

const packageTotals = useMemo(
  () => calcPackageTotals(packageSubTotal, packageVatRate, vndCurrency),
  [packageSubTotal, packageVatRate, vndCurrency],
);

const lineTotalsVnd = useMemo(() => {
  if (isPackageMode) return { subTotal: 0, vatAmount: 0, totalAmount: 0, missingRows: [] };
  const missingRows = [];
  const sums = activeRows.reduce((acc, r) => {
    const pricing = buildServicePricingPayload({
      pricingMode: PRICING_MODE_LINE,
      basePrice: r._basePrice,
      quantity: 1,
      vat: r._vat,
      currency: getRowCurrency(r),
      vndCurrency,
      exchangeRatesToVnd,
      pricingDate,
    });
    if (!pricing._convertible) {
      missingRows.push(r);
      return acc;
    }
    return {
      subTotal: acc.subTotal + pricing.subTotal,
      vatAmount: acc.vatAmount + pricing.vatAmount,
      totalAmount: acc.totalAmount + pricing.totalAmount,
    };
  }, { subTotal: 0, vatAmount: 0, totalAmount: 0 });
  return { ...sums, missingRows };
}, [activeRows, isPackageMode, getRowCurrency, vndCurrency, exchangeRatesToVnd, pricingDate]);

const totals = isPackageMode ? packageTotals : lineTotalsVnd;
```

Notes on what changed vs. what's preserved:
- `getRowCurrency`, `currencyOptions`, `activeRows` are unchanged (copy them forward as-is — they are not being deleted, just kept in this consolidated block for a single clear insertion point).
- `contractCurrency` itself (the memo at the original lines 1175-1178, `currencyFromRecord(contract, currencies)`) is **not** touched by this task — it still exists and is still used by `addRow`/`handleSelectCatalogService`/`handleCreateCustomService` (Task-untouched, see the "no change" note below) purely as the *default currency suggested for new rows*, never again as a conversion target.
- `hasMixedLineCurrencies`, `lineTotalsByCurrency`, `totalsCurrency`, `summarySourceGroups`, `displayCurrency*`, `convertedTotals`/`convertedSummary`/`exchangeBreakdown`, `baseConvertedTotals`/`baseConvertedSummary`/`baseExchangeRates`/`baseCurrencyId` are all **deleted** — nothing later in the file may reference them after this task (Task 3 and Task 4 remove their remaining usages).

- [ ] **Step 2: Confirm no leftover references**

Run: `grep -n "hasMixedLineCurrencies\|lineTotalsByCurrency\|totalsCurrency\|displayCurrency\|convertedSummary\|convertedTotals\|baseConvertedSummary\|baseConvertedTotals\|baseExchangeRates\|exchangeBreakdown\|summarySourceGroups" "All Module/Contract/ContractServices.js"`
Expected: no matches yet **within this file** for `hasMixedLineCurrencies`/`lineTotalsByCurrency`/`totalsCurrency`/`baseConvertedSummary`/`baseConvertedTotals`/`baseExchangeRates`/`exchangeBreakdown`/`summarySourceGroups`. Matches for `displayCurrency`/`convertedSummary`/`convertedTotals` are expected to still exist in the JSX render section (Task 4 removes those) — that's fine at this point in the plan, just confirm the *memo/state declarations* you deleted aren't referenced anywhere you haven't reached yet by checking the line numbers of any remaining matches are all ≥ the render section's start (~line 2239 in the original numbering).

- [ ] **Step 3: Syntax check**

Run: `node --check "All Module/Contract/ContractServices.js"`
Expected: still fails at this point, because Task 3 (handleSave) and Task 4 (JSX) still reference the deleted names — that's expected and will be fixed by the next two tasks. Do not be alarmed by a `ReferenceError`-shaped syntax note; `--check` only catches actual parse errors, so if it fails here it means a real syntax mistake was introduced — fix that before moving on, but do not attempt to fix "is not defined"-style issues since `--check` cannot detect those (only a full run would) and they will be resolved incidentally by Tasks 3–4.

- [ ] **Step 4: Commit**

```bash
git add "All Module/Contract/ContractServices.js"
git commit -m "refactor(ContractServices): collapse Display/Base currency pipelines into a single VND line-totals memo"
```

---

### Task 3: ContractServices.js — rewrite `handleSave` to persist VND totals + `exchangeRateToBase`

**Files:**
- Modify: `All Module/Contract/ContractServices.js:1822-2202` (the entire `handleSave` function, referencing the original line numbers from the exploration map — locate by the `const handleSave = async () => {` signature since exact numbers have shifted after Tasks 1–2)

**Interfaces:**
- Consumes: `lineTotalsVnd`, `packageTotals`, `totals`, `vndCurrency`, `exchangeRatesToVnd`, `pricingDate`, `buildServicePricingPayload` from Tasks 1–2
- Produces: no new exports — this is a leaf consumer

- [ ] **Step 1: Add the pre-flight missing-rate guard**

Immediately after the existing validation block (`if (invalid) { ...; return; }` / package-subtotal check — keep those as-is), insert:

```javascript
if (!isPackageMode && lineTotalsVnd.missingRows.length) {
  const names = lineTotalsVnd.missingRows
    .map((r) => `"${r._svcName || 'Dịch vụ chưa đặt tên'}" (${getCurrencyCode(getRowCurrency(r))})`)
    .join(', ');
  message.error(`Thiếu tỷ giá quy đổi sang VND cho: ${names} — không thể lưu.`);
  return;
}
```

- [ ] **Step 2: Replace every `buildServicePricingPayload(...)` call inside the per-row loop**

The existing call (originally lines 1883-1892) was:
```javascript
const pricingPayload = buildServicePricingPayload({
  pricingMode,
  basePrice: r._basePrice,
  quantity: 1,
  vat: r._vat,
  packageSubTotal,
  packageVatRate,
  currency: getRowCurrency(r),
  packageCurrency: contractCurrency,
});
```
Replace with:
```javascript
const pricingPayload = buildServicePricingPayload({
  pricingMode,
  basePrice: r._basePrice,
  quantity: 1,
  vat: r._vat,
  packageSubTotal,
  packageVatRate,
  currency: getRowCurrency(r),
  vndCurrency,
  exchangeRatesToVnd,
  pricingDate,
});
```
(Drops `packageCurrency: contractCurrency`, adds `vndCurrency`/`exchangeRatesToVnd`/`pricingDate` — matches Task 1's new signature. `pricingPayload.subTotal`/`.vatAmount`/`.totalAmount` are now VND; `pricingPayload.exchangeRateToBase` is new.)

- [ ] **Step 3: Write `exchangeRateToBase` into the `contractServices` payload**

The existing `payload` object (originally lines 1935-1951) writes `currencyId`/`currency` plus `...pricingPayload`. Since `pricingPayload` now includes `exchangeRateToBase`, `...pricingPayload` already spreads it in — no separate line needed, but double check the object literal still reads:
```javascript
const payload = {
  contractId: parseInt(CONTRACT_ID),
  contracts: parseInt(CONTRACT_ID),
  serviceId: serviceId || null,
  ServiceId: serviceId || null,
  serviceName: r._svcName || null,
  serviceType: r._serviceType || null,
  description: r._description || null,
  currencyId: rowCurrencyId || null,
  currency: rowCurrencyId || null,
  ...pricingPayload,
  ...(linkedQuotationServiceId ? {
    quotationServiceId: linkedQuotationServiceId,
    quotationServices: linkedQuotationServiceId,
  } : {}),
  ...(rowProjectId ? { /* unchanged */ } : {}),
};
```
No structural change needed here beyond what Step 2 already produced — this step is a verification checkpoint, not a new edit. If `pricingPayload` was being destructured/whitelisted anywhere instead of spread wholesale, change it to spread wholesale so `exchangeRateToBase` flows through.

- [ ] **Step 4: Simplify the totals-writing section (Step 2 of the original `handleSave`)**

Replace the block that computed `canConvertMixedTotals`/`effectiveTotals`/`finalSubTotal`/`finalVatAmount`/`finalTotalAmount`/`finalFixedAmount` (originally lines 2138-2184) with:

```javascript
const isRetainer = String(contract?.contractType || '').toLowerCase() === 'retainer';
const finalSubTotal = isRetainer
  ? parseNum(contract.monthlyFee) * parseNum(contract.retainerDuration)
  : totals.subTotal;
const finalVatAmount = isRetainer
  ? roundMoneyForCurrency((finalSubTotal * parseNum(packageVatRate)) / 100, vndCurrency)
  : totals.vatAmount;
const finalTotalAmount = finalSubTotal + finalVatAmount;
const finalFixedAmount = isRetainer ? null : finalTotalAmount;

await ctx.api.request({
  url: 'contracts:update',
  method: 'POST',
  params: { filterByTk: CONTRACT_ID },
  data: {
    pricingMode,
    packageVatRate: isPackageMode ? parseNum(packageVatRate) : (contract?.packageVatRate ?? null),
    subTotal: finalSubTotal,
    vatAmount: finalVatAmount,
    totalAmount: finalTotalAmount,
    ...(finalFixedAmount !== null ? { fixedAmount: finalFixedAmount } : {}),
  },
});
```

This removes the "keep existing DB value if conversion failed" fallback entirely — it's no longer reachable because Step 1's pre-flight guard already aborted the whole Save if any row was unconvertible, so by this point `totals` is guaranteed fully resolved.

Keep the retainer special-case (`isRetainer`) — it is orthogonal to this refactor and untouched in meaning, just re-expressed using `vndCurrency`/`roundMoneyForCurrency` instead of a bare `Math.round`.

- [ ] **Step 5: Simplify the `projects:update` cascade (Step 3 of the original `handleSave`)**

Replace whatever computed the project total (originally lines 2187-2195, using `finalTotalAmount`) — no logic change needed here beyond confirming it still reads `finalTotalAmount` from Step 4 above:
```javascript
await ctx.api.request({
  url: 'projects:update',
  method: 'POST',
  params: { filterByTk: projectId },
  data: { totalAmount: finalTotalAmount },
});
```

- [ ] **Step 6: Syntax check**

Run: `node --check "All Module/Contract/ContractServices.js"`
Expected: no output (exit 0) — this is the first point in the Contract-file work where the whole file should parse clean with no dangling references, since Task 4 (JSX cleanup) is the only remaining piece and JSX-section reference errors won't surface as syntax errors either way. Grep-check per Task 2 Step 2's list again to confirm you haven't left any `effectiveTotals`/`canConvertMixedTotals` references behind:
Run: `grep -n "effectiveTotals\|canConvertMixedTotals" "All Module/Contract/ContractServices.js"`
Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add "All Module/Contract/ContractServices.js"
git commit -m "refactor(ContractServices): handleSave now blocks on missing FX rate and persists straight VND totals"
```

---

### Task 4: ContractServices.js — UI: per-row VND hint, single-value Summary row, remove Display-currency dropdown + breakdown modal

**Files:**
- Modify: `All Module/Contract/ContractServices.js` — Price/VAT-amount/Total-amount columns (originally lines 2279-2339), the pricing-mode header row with the package currency tag (originally lines 2391-2407), the Display-currency selector block (originally lines 2409-2430), the Summary row (originally lines 2441-2499), the breakdown modal (originally lines 2516-2548)

**Interfaces:**
- Consumes: `lineTotalsVnd`, `packageTotals`, `totals`, `vndCurrency`, `exchangeRatesToVnd`, `exchangeRatesLoading`, `pricingDate` from Task 2; `buildServicePricingPayload` from Task 1
- Produces: nothing (leaf UI)

- [ ] **Step 1: Price column — add a per-row VND hint, drop `hideCurrencyCode` complexity only if needed (keep as-is otherwise)**

The Price column's `render` (originally lines 2279-2307) keeps its existing `EditableCell` + currency `Select` pair exactly as-is (basePrice stays editable in the row's own currency — this does not change). Add a VND-equivalent hint line underneath, and a missing-rate warning when applicable:

```javascript
{
  title: 'Price',
  key: 'basePrice',
  width: 220,
  align: 'right',
  render: (_, r) => {
    if (isPackageMode) return React.createElement(Text, { type: 'secondary' }, 'Included');
    const rowCurrency = getRowCurrency(r);
    const pricing = buildServicePricingPayload({
      pricingMode: PRICING_MODE_LINE,
      basePrice: r._basePrice,
      quantity: 1,
      vat: r._vat,
      currency: rowCurrency,
      vndCurrency,
      exchangeRatesToVnd,
      pricingDate,
    });
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, width: '100%' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 4, width: '100%' } },
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement(EditableCell, {
            value: r._basePrice,
            onSave: (val) => updateRow(r.id, '_basePrice', val),
            disabled: isLocked,
            isMoney: true,
            currency: rowCurrency,
            hideCurrencyCode: true,
          })
        ),
        React.createElement(Select, {
          value: r._currencyId || (extractCurrencyId(rowCurrency) ? String(extractCurrencyId(rowCurrency)) : undefined),
          disabled: isLocked || !currencyOptions.length,
          size: 'small',
          style: { width: 76, flexShrink: 0 },
          onChange: (v) => updateRow(r.id, '_currencyId', v),
          options: currencyOptions,
          placeholder: 'Currency',
        })
      ),
      !isSameCurrency(rowCurrency, vndCurrency) && React.createElement(Text, {
        type: pricing._convertible ? 'secondary' : 'danger',
        style: { fontSize: 11 },
      }, pricing._convertible
        ? `≈ ${formatMoney(pricing.subTotal, vndCurrency)}`
        : 'Thiếu tỷ giá quy đổi'),
    );
  },
},
```

- [ ] **Step 2: VAT-amount and Total-amount columns — always render VND**

Replace both columns' `render` (originally lines 2322-2339, which called `calcLine(r._basePrice, 1, r._vat, getRowCurrency(r))`) with:

```javascript
{
  title: 'VAT amount',
  key: 'vatAmount',
  width: 140,
  align: 'right',
  render: (_, r) => {
    if (isPackageMode) return React.createElement(Text, { type: 'secondary' }, '—');
    const pricing = buildServicePricingPayload({
      pricingMode: PRICING_MODE_LINE,
      basePrice: r._basePrice, quantity: 1, vat: r._vat,
      currency: getRowCurrency(r), vndCurrency, exchangeRatesToVnd, pricingDate,
    });
    return React.createElement(Text, null, pricing._convertible ? formatMoney(pricing.vatAmount, vndCurrency) : '—');
  },
},
{
  title: 'Total amount',
  key: 'totalAmount',
  width: 140,
  align: 'right',
  render: (_, r) => {
    if (isPackageMode) return React.createElement(Text, { type: 'secondary' }, '—');
    const pricing = buildServicePricingPayload({
      pricingMode: PRICING_MODE_LINE,
      basePrice: r._basePrice, quantity: 1, vat: r._vat,
      currency: getRowCurrency(r), vndCurrency, exchangeRatesToVnd, pricingDate,
    });
    return React.createElement(Text, { strong: true }, pricing._convertible ? formatMoney(pricing.totalAmount, vndCurrency) : '—');
  },
},
```

- [ ] **Step 3: Pricing-mode header — replace the package currency tag with a static VND tag**

Find `isPackageMode && React.createElement(Tag, {color:'blue'}, \`Currency: ${getCurrencyCode(contractCurrency)}\`)` (originally line 2404) and replace with:
```javascript
isPackageMode && React.createElement(Tag, { color: 'blue' }, 'Currency: VND')
```

- [ ] **Step 4: Delete the Display-currency selector block entirely**

Delete the whole block (originally lines 2409-2430) that rendered the "Display currency" label + `Select` + loading/missing-rate hint. Nothing replaces it — VND is no longer a user choice at this level.

- [ ] **Step 5: Simplify the Summary row to single VND values, no per-group list, no conversion hints**

Replace the Summary row cells (originally lines 2441-2499) with:

```javascript
summary: () => {
  if (!activeRows.length && !isPackageMode) return null;
  return React.createElement(Table.Summary.Row, null,
    React.createElement(Table.Summary.Cell, { index: 0, colSpan: 3 },
      React.createElement(Text, { strong: true }, isPackageMode ? 'Package total' : 'Total')),
    React.createElement(Table.Summary.Cell, { index: 3, align: 'right' },
      isPackageMode
        ? React.createElement(MoneyDraftInput, {
            value: packageSubTotal, onChange: setPackageSubTotal, disabled: isLocked, currency: vndCurrency,
          })
        : React.createElement(Text, { strong: true }, formatMoney(totals.subTotal, vndCurrency))),
    React.createElement(Table.Summary.Cell, { index: 4, align: 'right' },
      isPackageMode
        ? React.createElement(InputNumber, {
            value: packageVatRate, onChange: setPackageVatRate, disabled: isLocked,
            min: 0, max: 100, size: 'small', style: { width: '100%' }, addonAfter: '%',
          })
        : null),
    React.createElement(Table.Summary.Cell, { index: 5, align: 'right' },
      React.createElement(Text, { strong: true }, formatMoney(totals.vatAmount, vndCurrency))),
    React.createElement(Table.Summary.Cell, { index: 6, align: 'right' },
      React.createElement(Text, { strong: true }, formatMoney(totals.totalAmount, vndCurrency))),
    React.createElement(Table.Summary.Cell, { index: 7 }),
  );
},
```

(`MoneyDraftInput`/`InputNumber`/`Table.Summary.Row`/`Table.Summary.Cell` are already imported/used elsewhere in the file — no new imports needed. If the existing package-mode summary row used a different prop name than `onChange`/`value` for `MoneyDraftInput`, keep whatever the existing invocation at the original line 2450 used — check before pasting, since this plan reconstructs the shape from the exploration report and the exact prop names should be copied from the code you're replacing, not retyped from memory.)

- [ ] **Step 6: Delete the breakdown modal**

Delete the whole `Modal` block (originally lines 2516-2548, title `'Chi tiết quy đổi tiền tệ'`) and the `breakdownOpen` state declaration (originally line 1174, already should have been removed in Task 2 — confirm it's gone) and the "Xem chi tiết" button that opened it (was inside the Total-amount summary cell, already removed by Step 5 rewriting that cell).

- [ ] **Step 7: Confirm no leftover references anywhere in the file**

Run: `grep -n "displayCurrency\|breakdownOpen\|exchangeBreakdown\|renderSingleGroupConversionHint\|renderMixedConversionHint\|needsSingleGroupConversionHint" "All Module/Contract/ContractServices.js"`
Expected: no matches.

- [ ] **Step 8: Syntax check**

Run: `node --check "All Module/Contract/ContractServices.js"`
Expected: no output (exit 0). This should be the first fully-clean pass for this file.

- [ ] **Step 9: Manual QA checklist (perform in the live Nocobase app after pasting this file's content into the JS block)**

- [ ] Open a Contract with all-VND lines — Save works, totals unchanged from before.
- [ ] Add a USD line with a valid USD→VND rate configured — Price column shows the USD input + "≈ X VND" hint; Summary row total updates in VND; Save succeeds; reload shows the same VND totals persisted.
- [ ] Add a USD line where no USD→VND rate exists — Price column shows "Thiếu tỷ giá quy đổi" in red; clicking Save shows the blocking error naming that service; nothing is written.
- [ ] Switch to Package mode — package subtotal/VAT/total all VND-only, no currency tag other than "Currency: VND", Save works.
- [ ] Confirm the "Display currency" dropdown and "Xem chi tiết" breakdown modal are gone from the UI entirely.

- [ ] **Step 10: Commit**

```bash
git add "All Module/Contract/ContractServices.js"
git commit -m "refactor(ContractServices): UI shows per-row VND hint and single VND summary, drop Display-currency picker"
```

---

### Task 5: QuotationServices.js — currency/exchange-rate helpers retarget to VND

**Files:**
- Modify: `All Module/Quotation/QuotationServices.js:172-360` (helper block), `:407-453` (`buildConvertedTotals` — delete), locate `buildServicePricingPayload` (referenced via its call sites at the original lines ~1741-1750, ~2187; find its definition by `grep -n "const buildServicePricingPayload" "All Module/Quotation/QuotationServices.js"` since the exploration report for this file didn't capture its exact definition line range — extend it)

**Interfaces:** identical shape to Task 1, mirrored for Quotation (same new signature: drops `packageCurrency`, adds `vndCurrency`/`exchangeRatesToVnd`/`pricingDate`)

- [ ] **Step 1: Find `buildServicePricingPayload`'s current definition**

Run: `grep -n "const buildServicePricingPayload\|const calcLine \|const calcPackageTotals " "All Module/Quotation/QuotationServices.js"`
Use the reported line numbers to locate the exact block to replace.

- [ ] **Step 2: Delete `buildConvertedTotals` (lines 407-453) — identical deletion to Task 1 Step 1**

- [ ] **Step 3: Replace `buildServicePricingPayload` with the same VND-converting version from Task 1 Step 2, verbatim**

(Same function body as `ContractServices.js` — this file mirrors that one's helper section exactly per the exploration report's `// mirrors CaseCreateForm.js` banner comment, so copy the identical replacement code from Task 1 Step 2 into this file at the location found in Step 1.)

- [ ] **Step 4: Syntax check**

Run: `node --check "All Module/Quotation/QuotationServices.js"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Quotation/QuotationServices.js"
git commit -m "refactor(QuotationServices): retarget pricing payload conversion at VND, drop buildConvertedTotals"
```

---

### Task 6: QuotationServices.js — replace totals computation with straight VND sum

**Files:**
- Modify: `All Module/Quotation/QuotationServices.js:1038-1341` (currency/totals memo block: `getRowCurrency`, `currencyOptions`, `displayCurrency*`, `activeRows`, `lineTotalsByCurrency`, `hasMixedLineCurrencies`, `packageTotals`, `lineTotals`, `totals`, `totalsCurrency`, `summarySourceGroups`, base-currency pipeline)

**Interfaces:** identical shape to Task 2 (`vndCurrency`, `exchangeRatesToVnd`, `exchangeRatesLoading`, `pricingDate = quotation?.date`, `packageTotals`, `lineTotalsVnd`, `totals`)

- [ ] **Step 1: Replace the block with the same structure as Task 2 Step 1**, substituting `quotation`/`quotationCurrency`/`PRICING_MODE_LINE` for the Contract equivalents, and `pricingDate = quotation?.date` (per FR-7.3, Quotation's pricing date is just `quotation.date`, no `signedAt` field):

```javascript
const getRowCurrency = useCallback(
  (row) => currencyFromRecord(row, currencies, quotationCurrency),
  [currencies, quotationCurrency],
);

const currencyOptions = useMemo(
  () => currencies.map((c) => ({ value: String(c.id), label: getCurrencyCode(c) })),
  [currencies],
);

const activeRows = useMemo(() => rows.filter((r) => !r._deleted && !isDeletedServiceLine(r)), [rows]);

const vndCurrency = useMemo(() => findDefaultCurrency(currencies), [currencies]);
const vndCurrencyId = extractCurrencyId(vndCurrency);
const pricingDate = quotation?.date;

const lineCurrencyIdsNeedingRate = useMemo(() => {
  const ids = new Set();
  activeRows.forEach((r) => {
    const c = getRowCurrency(r);
    if (!isSameCurrency(c, vndCurrency)) {
      const id = extractCurrencyId(c);
      if (id) ids.add(id);
    }
  });
  return Array.from(ids);
}, [activeRows, getRowCurrency, vndCurrency]);
const lineCurrencyIdsKey = lineCurrencyIdsNeedingRate.slice().sort().join(',');

const [exchangeRatesToVnd, setExchangeRatesToVnd] = useState([]);
const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false);
useEffect(() => {
  let cancelled = false;
  if (!lineCurrencyIdsNeedingRate.length || !vndCurrencyId) {
    setExchangeRatesToVnd([]);
    return undefined;
  }
  setExchangeRatesLoading(true);
  fetchExchangeRatesForConversion(lineCurrencyIdsNeedingRate, vndCurrencyId)
    .then((rates) => { if (!cancelled) setExchangeRatesToVnd(rates); })
    .finally(() => { if (!cancelled) setExchangeRatesLoading(false); });
  return () => { cancelled = true; };
}, [lineCurrencyIdsKey, vndCurrencyId]);

const packageTotals = useMemo(
  () => calcPackageTotals(packageSubTotal, packageVatRate, vndCurrency),
  [packageSubTotal, packageVatRate, vndCurrency],
);

const lineTotalsVnd = useMemo(() => {
  if (isPackageMode) return { subTotal: 0, vatAmount: 0, totalAmount: 0, missingRows: [] };
  const missingRows = [];
  const sums = activeRows.reduce((acc, r) => {
    const pricing = buildServicePricingPayload({
      pricingMode: PRICING_MODE_LINE,
      basePrice: r._basePrice,
      quantity: 1,
      vat: r._vat,
      currency: getRowCurrency(r),
      vndCurrency,
      exchangeRatesToVnd,
      pricingDate,
    });
    if (!pricing._convertible) {
      missingRows.push(r);
      return acc;
    }
    return {
      subTotal: acc.subTotal + pricing.subTotal,
      vatAmount: acc.vatAmount + pricing.vatAmount,
      totalAmount: acc.totalAmount + pricing.totalAmount,
    };
  }, { subTotal: 0, vatAmount: 0, totalAmount: 0 });
  return { ...sums, missingRows };
}, [activeRows, isPackageMode, getRowCurrency, vndCurrency, exchangeRatesToVnd, pricingDate]);

const totals = isPackageMode ? packageTotals : lineTotalsVnd;
```

`quotationCurrency` memo itself stays untouched (still used by `addRow`/`handleSelectCatalogService`/`handleCreateCustomService`/`openServiceModal` as the new-row default, exactly as in Contract — see Task 2's equivalent note).

- [ ] **Step 2: Confirm `lineModeBackupRef` still only backs up `_basePrice`/`_vat`** (originally lines 1343-1363's `handlePricingModeChange`) — no change needed here; per the exploration report this backup object never touched currency and doesn't need to now either, since row currency is independent of pricing mode in both the old and new model. Just re-read the function after Step 1's edits land nearby, to confirm it still compiles (it references `lineTotals` at its old name in the seed line `setPackageSubTotal((prev) => prev || lineTotals.subTotal || ...)` — rename that reference to `lineTotalsVnd.subTotal`, since `lineTotals` no longer exists):

```javascript
setPackageSubTotal((prev) => prev || lineTotalsVnd.subTotal || parseNum(quotation?.subTotal));
setPackageVatRate((prev) => prev || inferVatRate(lineTotalsVnd.subTotal || quotation?.subTotal, lineTotalsVnd.vatAmount || quotation?.vatAmount, 0));
```

- [ ] **Step 3: Confirm no leftover references**

Run: `grep -n "hasMixedLineCurrencies\|lineTotalsByCurrency\|totalsCurrency\|baseConvertedSummary\|baseConvertedTotals\|baseExchangeRates\|exchangeBreakdown\|summarySourceGroups\b" "All Module/Quotation/QuotationServices.js"`
Expected: no matches (outside the still-unmodified JSX section, which Task 8 handles).

- [ ] **Step 4: Commit**

```bash
git add "All Module/Quotation/QuotationServices.js"
git commit -m "refactor(QuotationServices): collapse Display/Base currency pipelines into a single VND line-totals memo"
```

---

### Task 7: QuotationServices.js — rewrite `handleSave` to persist VND totals + `exchangeRateToBase`, and fix the sub-contract `currencyId` gap

**Files:**
- Modify: `All Module/Quotation/QuotationServices.js:1683-2299` (`handleSave`, locate by signature since line numbers have shifted)

**Interfaces:** consumes Task 5–6 outputs, mirrors Task 3

- [ ] **Step 1: Add the same pre-flight missing-rate guard as Task 3 Step 1**, substituting the Vietnamese warning wording already used elsewhere in this file (`'Thiếu tỷ giá quy đổi giữa các loại tiền tệ dịch vụ...'` is the file's existing phrasing style):

```javascript
if (!isPackageMode && lineTotalsVnd.missingRows.length) {
  const names = lineTotalsVnd.missingRows
    .map((r) => `"${r._svcName || 'Dịch vụ chưa đặt tên'}" (${getCurrencyCode(getRowCurrency(r))})`)
    .join(', ');
  message.error(`Thiếu tỷ giá quy đổi sang VND cho: ${names} — không thể lưu.`);
  return;
}
```

- [ ] **Step 2: Update the per-row `buildServicePricingPayload` call** (originally lines 1741-1750) exactly as in Task 3 Step 2, substituting `contractCurrency`→n/a (Quotation's version never had a `packageCurrency: contractCurrency` — it used `packageCurrency: quotationCurrency`, same drop applies):

```javascript
const pricingPayload = buildServicePricingPayload({
  pricingMode,
  basePrice: r._basePrice,
  quantity: 1,
  vat: r._vat,
  packageSubTotal,
  packageVatRate,
  currency: getRowCurrency(r),
  vndCurrency,
  exchangeRatesToVnd,
  pricingDate,
});
```

- [ ] **Step 3: Confirm `payload` (originally lines 1752-1763) still spreads `...pricingPayload`** — same verification as Task 3 Step 3, no structural change beyond what Step 2 produces.

- [ ] **Step 4: Simplify the quotation-totals write (Step 2 of `handleSave`, originally lines 2045-2080)**

Quotations have no retainer concept (that's Contract-only), so this is simpler than Task 3 Step 4:

```javascript
await ctx.api.request({
  url: 'quotations:update',
  method: 'POST',
  params: { filterByTk: QUOTATION_ID },
  data: {
    pricingMode,
    packageSubTotal: isPackageMode ? totals.subTotal : null,
    packageVatRate: isPackageMode ? parseNum(packageVatRate) : null,
    subTotal: totals.subTotal,
    vatAmount: totals.vatAmount,
    totalAmount: totals.totalAmount,
    customerId: extractId(currentQ.customerId),
    internalCompanyId: extractId(currentQ.internalCompanyId),
  },
});
```

(Drop the old `...(effectiveTotals ? {...} : {})` conditional spread — `totals` is now guaranteed resolved by Step 1's guard.)

- [ ] **Step 5: Leave Step 3 of `handleSave` (contract-services reconciliation + `syncContractHeaderFromServices` call) structurally as-is**, but update its own `buildServicePricingPayload`/`buildProjectServiceSyncPayload`-equivalent calls the same way as Step 2 (search this range, originally lines 2082-2195, for any remaining `packageCurrency:` argument and drop it, adding `vndCurrency`/`exchangeRatesToVnd`/`pricingDate` wherever `buildServicePricingPayload` is invoked). `syncContractHeaderFromServices` itself is defined in `QuotationServices.js` too per the exploration report (lines 510-649) — **do not touch its internals in this task**, only the call site; Task 12 in the `CaseServices.js` section covers the equivalent function that lives in that file, and this file's own copy needs the identical treatment, so add a follow-up note: **Task 7 Step 5b below**.

- [ ] **Step 5b: Simplify `syncContractHeaderFromServices` inside this same file (lines 510-649)**

This function currently (per the exploration report, lines 556-611) groups `contractServices` rows by currency and converts to `contractCurrency`. Since after Task 3 ships, every `contractServices` row's `subTotal`/`vatAmount`/`totalAmount` are already VND, replace the line-mode branch (lines 556-611) with a straight sum:

```javascript
} else {
  subTotal = lines.reduce((sum, l) => sum + (parseNum(l.subTotal) || 0), 0);
  vatAmount = lines.reduce((sum, l) => sum + (parseNum(l.vatAmount) || 0), 0);
  totalAmount = subTotal + vatAmount;
}
```

(This deletes the `fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES)` call, the `contractCurrency`/`contractCurrencyId` resolution, the `byCurrency` grouping loop, the `nonBaseGroups`/`fetchExchangeRatesForConversion` call, and the per-group `pickConversionRate` loop that were at lines 556-611 — all of it becomes unnecessary once the source rows are pre-converted. Keep the retainer branch (lines 538-542) and package-line branch (lines 544-555) untouched — those don't group by currency today and don't need to.)

- [ ] **Step 6: Fix the sub-contract `currencyId` gap** (Step 5 of `handleSave`, originally lines 2248-2278)

Add `currencyId: vndCurrencyId` to the `contracts:create` payload for the auto-created sub-contract, so the new contract's row-default currency is explicitly VND rather than whatever the contract module's own fallback logic would otherwise pick:

```javascript
await ctx.api.request({
  url: 'contracts:create',
  method: 'POST',
  data: {
    // ...all existing fields unchanged...
    currencyId: vndCurrencyId,
    ...(effectiveTotals ? {
      subTotal: effectiveTotals.subTotal,
      vatAmount: effectiveTotals.vatAmount,
      totalAmount: effectiveTotals.totalAmount,
    } : {}),
  },
});
```

Rename `effectiveTotals` in this block to `totals` (the old name no longer exists after Task 6 — `totals` is now always resolved since Step 1's guard already blocked the save if it weren't):
```javascript
    currencyId: vndCurrencyId,
    subTotal: totals.subTotal,
    vatAmount: totals.vatAmount,
    totalAmount: totals.totalAmount,
```

- [ ] **Step 7: Syntax check**

Run: `node --check "All Module/Quotation/QuotationServices.js"`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add "All Module/Quotation/QuotationServices.js"
git commit -m "refactor(QuotationServices): handleSave persists VND totals, sub-contract cascade gets explicit VND currencyId"
```

---

### Task 8: QuotationServices.js — UI: mirror Task 4 exactly

**Files:**
- Modify: `All Module/Quotation/QuotationServices.js` — Price/VAT-amount/Total-amount columns (originally lines 2375-2435), package-mode currency tag (originally line 2500), Display-currency selector (originally lines 2507-2526), Summary row (originally lines 2537-2595), breakdown modal (originally lines 2612-2644)

**Interfaces:** same as Task 4, mirrored for Quotation

- [ ] **Step 1–6: Repeat Task 4 Steps 1–6 verbatim**, substituting `quotationCurrency`/`quotation`/`setPackageSubTotal`/`setPackageVatRate` for the Contract equivalents where those specific state setters are referenced (the JSX shape and all new code is otherwise identical — this file mirrors `ContractServices.js`'s render structure closely per the exploration report's near-identical column/summary layout).

- [ ] **Step 7: Confirm no leftover references**

Run: `grep -n "displayCurrency\|breakdownOpen\|exchangeBreakdown\|renderSingleGroupConversionHint\|renderMixedConversionHint\|needsSingleGroupConversionHint" "All Module/Quotation/QuotationServices.js"`
Expected: no matches.

- [ ] **Step 8: Syntax check**

Run: `node --check "All Module/Quotation/QuotationServices.js"`
Expected: no output.

- [ ] **Step 9: Manual QA checklist** — same checklist as Task 4 Step 9, run against a Quotation instead of a Contract. Additionally:

- [ ] Switch Line→Package→Line — row `_basePrice`/`_vat` restore correctly (existing `lineModeBackupRef` behavior, unaffected by this refactor); row currencies unaffected.
- [ ] Change a Quotation's status to `order` with a linked main contract and no existing sub-contract — confirm the auto-created sub-contract has `currencyId` set to VND on the "Configure fields"/record view.

- [ ] **Step 10: Commit**

```bash
git add "All Module/Quotation/QuotationServices.js"
git commit -m "refactor(QuotationServices): UI shows per-row VND hint and single VND summary, drop Display-currency picker"
```

---

### Task 9: CaseServices.js — fix all bare `Math.round()` money sites, retarget helpers at VND

**Files:**
- Modify: `All Module/Case/CaseServices.js` — `calcPackageTotals` (lines 422-435), `getRowVatAmount` (lines 1021-1030), `getContractLineAmounts` (lines 1489-1520), `syncAllThree` (around line 1891), `createContractServiceRecord` (around line 2053), `handleAddSubmit` (around line 2656), `buildPackageSummaryPatch` (around line 3695)

**Interfaces:**
- Consumes: existing `roundMoneyForCurrency` (lines 274-280), `currencyFromRecord` (224-230), `findDefaultCurrency` (262-264) — all already present, unchanged
- Produces: `caseVndCurrency` — a module-reachable resolved-VND-currency value threaded into each of the seven call sites below (each function already resolves *some* currency nearby per the exploration report — the fix is routing the existing nearby currency resolution into the rounding call instead of leaving it unused)

This task does **not** change any function's return values in normal operation — VND has 0 decimal places, so `roundMoneyForCurrency(x, vndCurrency)` and `Math.round(x)` produce identical output for VND amounts. The point of this task is defense-in-depth and consistency: after Tasks 1–8, every amount flowing through these functions **should** already be VND, but routing through `roundMoneyForCurrency` with an explicit currency argument makes that assumption visible and machine-checked rather than implicit, and costs nothing.

- [ ] **Step 1: `calcPackageTotals` (lines 422-435)** — change the bare `Math.round((subTotal * vatRate) / 100)` (line 432-433) to `roundMoneyForCurrency((subTotal * vatRate) / 100, currency)` — this function already receives a `currency` parameter, so this is a one-line change:

```javascript
vatAmount: vatAmount || roundMoneyForCurrency((subTotal * vatRate) / 100, currency),
```

- [ ] **Step 2: `getRowVatAmount` (lines 1021-1030)** — this function does **not** currently take a currency parameter. Add one, defaulting to VND at call sites that don't have a more specific row currency available (per the exploration report, its callers are `getSelectionAmounts`, `syncCaseTotalAmount`, `servicePricingSummary`, all of which already resolve a row/case currency nearby):

```javascript
const getRowVatAmount = (record, currency) => {
  if (isPackageServiceRow(record) || isScopeOnlyServiceRow(record)) return 0;
  const directVatAmount = record?.vatAmount ?? record?._quotedVatAmount;
  if (hasAmountValue(directVatAmount)) return Number(directVatAmount) || 0;

  const subTotal = getRowSubTotal(record);
  const vat = Number(record?.vat ?? record?._quotedVat ?? 0) || 0;

  return roundMoneyForCurrency((subTotal * vat) / 100, currency || defaultCurrencyObject());
};
```

Update its three call sites (`getSelectionAmounts` line 1038 area, `syncCaseTotalAmount` lines 1837-1839, `servicePricingSummary` lines 3462-3464/3476-3478) to pass the currency already in scope at each call (each of those call sites, per the exploration report, already computes a `currencyFromRecord(row, currs, ...)` value nearby for grouping purposes — pass that same value in).

- [ ] **Step 3: `getContractLineAmounts` (lines 1489-1520)** — same treatment as Step 1, the bare `Math.round((subTotal * parseNum(line.vat)) / 100)` at line 1512 becomes `roundMoneyForCurrency((subTotal * parseNum(line.vat)) / 100, currencyFromRecord(line, currs, fallbackCurrency))` — this function is called from `syncQuotationHeaderFromServices`/`syncContractHeaderFromServices` (Tasks 11–12 below simplify those call sites anyway; make sure the `currs`/`fallbackCurrency` values used here are whatever those two callers already have in scope after Tasks 11–12 land — sequence this step's call-site update together with Tasks 11–12, not before, since Task 11/12 changes what's available in scope at the call sites).

- [ ] **Step 4: `syncAllThree` (~line 1891)** — per the exploration report, this function currently resolves **no currency at all**. Add a VND resolution and route the rounding through it:

```javascript
const newVatAmount = roundMoneyForCurrency((newSubTotal * newVat) / 100, findDefaultCurrency(currencies));
```

(`currencies` must already be in scope in this function's closure — if it isn't, per the exploration report this function is a plain event handler inside the component body, so `currencies` state is accessible directly; no new fetch needed.)

- [ ] **Step 5: `createContractServiceRecord` (~line 2053)** — the exploration report notes this function resolves the line's currency "right after" the bare `Math.round` at line 2053 but doesn't use it. Reorder so the currency resolution happens **before** the rounding, then use it:

```javascript
const lineCurrency = currencyFromRecord(psRecord, currencies, findDefaultCurrency(currencies));
const vatAmount = psRecord._quotedVatAmount ?? psRecord.vatAmount ?? roundMoneyForCurrency((subTotal * vat) / 100, lineCurrency);
```

- [ ] **Step 6: `handleAddSubmit` (~line 2656)** — same pattern; the exploration report notes `newRowCurrencyId` is resolved "a few lines earlier" (line 2664 — note this is *after* line 2656 in the original numbering, so this needs reordering too, same as Step 5):

```javascript
const newRowCurrency = currencyFromRecord(/* whatever record/form-values this function already resolves newRowCurrencyId from */, currencies, findDefaultCurrency(currencies));
const vatAmount = roundMoneyForCurrency((subTotal * vat) / 100, newRowCurrency);
```

(Move the currency resolution up before this line if it isn't already computed by this point — check the actual surrounding code when editing, since the exploration report gives approximate context, not exact reorder instructions.)

- [ ] **Step 7: `buildPackageSummaryPatch` (~line 3695)** — the exploration report notes `servicePricingSummary.packageCurrency` is available nearby (lines 3483/3504):

```javascript
nextVatAmount = roundMoneyForCurrency((nextSubTotal * nextVatRate) / 100, servicePricingSummary.packageCurrency || findDefaultCurrency(currencies));
```

- [ ] **Step 8: Syntax check**

Run: `node --check "All Module/Case/CaseServices.js"`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "fix(CaseServices): route all VAT-amount rounding through roundMoneyForCurrency instead of bare Math.round"
```

---

### Task 10: CaseServices.js — simplify `syncQuotationHeaderFromServices` to a straight VND sum

**Files:**
- Modify: `All Module/Case/CaseServices.js:1522-1633`

**Interfaces:**
- Consumes: nothing new — this function already fetches `quotations:get`/`quotationServices:list` itself
- Produces: no interface change (still `async (quotationId) => {...}`, still writes `quotations:update`)

**Precondition:** Task 7 must have already shipped (Quotation's own `handleSave` must be writing VND-denominated `subTotal`/`vatAmount`/`totalAmount` onto `quotationServices` rows) — otherwise this simplification would sum stale non-VND numbers.

- [ ] **Step 1: Replace the line-priced branch (lines 1558-1616)**

Keep the package-priced branch (lines 1553-1557) as-is. Replace lines 1558-1616 with:

```javascript
} else {
  subTotal = lines.reduce((sum, l) => sum + (parseNum(l.subTotal) || 0), 0);
  vatAmount = lines.reduce((sum, l) => sum + (parseNum(l.vatAmount) || 0), 0);
  totalAmount = subTotal + vatAmount;
}
```

This deletes: the `fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES)` call, `quotationCurrency` resolution, the `byCurrency` grouping loop, `nonBaseGroups`/`fetchExchangeRatesForConversion`, the per-group `pickConversionRate` loop, `canConvert`/the early-break-on-missing-rate logic, and the `console.warn` — none of it is needed once `lines[].subTotal/.vatAmount` are already VND.

- [ ] **Step 2: Remove the now-dead `!canWriteTotals` early-return branch (lines 1604-1615)**

Since `canConvert`/`canWriteTotals` no longer exist after Step 1, the `quotations:update` write (lines 1618-1629) always fires unconditionally with the freshly summed totals — delete the `...(canWriteTotals ? {...} : {})` conditional spread and just write the fields directly:

```javascript
await ctx.api.request({
  url: 'quotations:update',
  method: 'POST',
  params: { filterByTk: quotationId },
  data: { subTotal, vatAmount, totalAmount },
});
```

- [ ] **Step 3: Syntax check**

Run: `node --check "All Module/Case/CaseServices.js"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "refactor(CaseServices): syncQuotationHeaderFromServices sums pre-converted VND totals instead of re-grouping by currency"
```

---

### Task 11: CaseServices.js — simplify `syncContractHeaderFromServices`, confirm retainer VND assumption

**Files:**
- Modify: `All Module/Case/CaseServices.js:1635-1774`

**Interfaces:** no interface change — still `async (contractId) => {...}`

**Precondition:** Task 3 must have already shipped (Contract's own `handleSave` writes VND-denominated `contractServices` rows).

- [ ] **Step 1: Replace the line-priced branch (lines 1683-1728)**

Keep the retainer branch (lines 1665-1669) and package-priced branch (lines 1670-1682) as-is structurally, but see Step 2 for the retainer branch's rounding fix. Replace lines 1683-1728 with:

```javascript
} else {
  subTotal = lines.reduce((sum, l) => sum + (parseNum(l.subTotal) || 0), 0);
  vatAmount = lines.reduce((sum, l) => sum + (parseNum(l.vatAmount) || 0), 0);
  totalAmount = subTotal + vatAmount;
}
```

(Same deletion as Task 10 Step 1: no more `contractCurrency` resolution, `byCurrency` grouping, rate-fetching, or `canConvert` tracking in this branch.)

- [ ] **Step 2: Fix the retainer branch's bare `Math.round`** (line 1668) — route through `roundMoneyForCurrency` against VND explicitly, documenting the assumption with a comment (per the exploration report, this was previously an undocumented implicit assumption):

```javascript
if (isRetainer) {
  // Retainer billing (monthlyFee × retainerDuration) is always computed in VND —
  // there is no per-service line to derive a currency from for this contract type.
  const vndCurrency = findDefaultCurrency(currencies);
  subTotal = parseNum(contract.monthlyFee) * parseNum(contract.retainerDuration);
  packageVatRate = parseNum(contract.packageVatRate ?? contract.vatRate);
  vatAmount = roundMoneyForCurrency((subTotal * packageVatRate) / 100, vndCurrency);
  totalAmount = subTotal + vatAmount;
}
```

(`currencies` needs to be in scope — this function already fetches `contracts:get`; add a `fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES)` call at the top of the function if `currencies` isn't already available in this async function's closure, mirroring how the line-priced branch used to fetch it before Step 1 deleted that need there — check whether Step 1's deletion removed the only place `currs`/`currencies` was fetched in this function, and if so keep a minimal fetch just for this retainer branch's `findDefaultCurrency` call.)

- [ ] **Step 3: Remove the now-dead `!canConvert` early-return** (lines 1731-1742) — same treatment as Task 10 Step 2, the `contracts:update` write always fires with the freshly computed totals.

- [ ] **Step 4: Leave the `projects:update` cascade (lines 1759-1770) as-is** — this plan does not attempt to consolidate it with `syncCaseTotalAmount`'s own `projects:update` (Task 12) in this pass, since the exploration report notes they serve different scopes (contract-linked total vs. full-case aggregate) and consolidating them is a separate, riskier change not required to fix the currency model. Leave the existing comment at lines 1776-1785 in place — it still accurately describes the relationship between the two functions.

- [ ] **Step 5: Syntax check**

Run: `node --check "All Module/Case/CaseServices.js"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "refactor(CaseServices): syncContractHeaderFromServices sums pre-converted VND totals, retainer VAT uses roundMoneyForCurrency"
```

---

### Task 12: CaseServices.js — simplify `syncCaseTotalAmount` and `getSelectionAmounts`, remove Case-level Display-currency UI

**Files:**
- Modify: `All Module/Case/CaseServices.js:1038-1103` (`getSelectionAmounts`), `:1786-1874` (`syncCaseTotalAmount`), `:850-868` (Display-currency state), `:3446-3520` (`servicePricingSummary`), `:3522-3643` (conversion-hint rendering), `:3645-3681` (`renderPricingSummary`), `:4537-4576` (selection-modal preview hint)

**Interfaces:**
- Produces: `servicePricingSummary` keeps the same name but its shape simplifies — drops `hasMixedCurrencies`, `lineTotalsByCurrency`, `packageCurrency` (package mode is now always VND, same as Contract/Quotation), keeps `isPackageMode`, `packageTotals`, `lineTotals` (renamed conceptually to VND totals, same field names)

**Precondition:** Tasks 10–11 shipped (both cascade functions already write VND totals to `quotations`/`contracts`, and by extension `projectServices` rows synced from them are VND too).

- [ ] **Step 1: Simplify `getSelectionAmounts` (lines 1038-1103)**

This function computes a preview total for the "select services to add" modal, targeting `caseCurrency` today. Retarget it at VND and drop the grouping:

```javascript
const getSelectionAmounts = async (selectedRows) => {
  const vndCurrency = findDefaultCurrency(currencies);
  const billable = selectedRows.filter(isMoneyEditableServiceRow);
  const subTotal = billable.reduce((sum, r) => sum + getRowSubTotal(r), 0);
  const vatAmount = billable.reduce((sum, r) => sum + getRowVatAmount(r, vndCurrency), 0);
  const totalAmount = subTotal + vatAmount;
  return { subTotal, vatAmount, totalAmount, currency: vndCurrency };
};
```

(This assumes `getRowSubTotal`/`getRowVatAmount` values are already VND by the time a row reaches this modal, per the same precondition as above — if a selected row is a raw catalog `services` record not yet priced in VND, note this as a known gap for a follow-up plan rather than solving it here, since catalog services pricing is out of this plan's scope per the original SRS's stated non-goals.)

- [ ] **Step 2: Simplify `syncCaseTotalAmount` (lines 1786-1874)**

Replace the group/fetch-rates/`buildConvertedTotals` sequence (lines 1811-1863) with a straight sum over `billableRows` plus `packageRows`:

```javascript
const billableRows = lines.filter(isMoneyEditableServiceRow);
const packageRows = lines.filter(isPackageServiceRow);

const lineSum = billableRows.reduce((acc, r) => ({
  subTotal: acc.subTotal + getRowSubTotal(r),
  vatAmount: acc.vatAmount + getRowVatAmount(r, findDefaultCurrency(currs)),
}), { subTotal: 0, vatAmount: 0 });

const packageSum = packageRows.reduce((acc, r) => {
  const t = calcPackageTotals(r, null, findDefaultCurrency(currs));
  return { subTotal: acc.subTotal + t.subTotal, vatAmount: acc.vatAmount + t.vatAmount };
}, { subTotal: 0, vatAmount: 0 });

const totalAmount = lineSum.subTotal + lineSum.vatAmount + packageSum.subTotal + packageSum.vatAmount;

await ctx.api.request({
  url: 'projects:update',
  method: 'POST',
  params: { filterByTk: projectId },
  data: { totalAmount },
});
```

Delete: the `currs`-based `projectCurrency` resolution used only for grouping (keep a `currs` fetch if `findDefaultCurrency(currs)` still needs it — this is a much smaller fetch need than before, since it's no longer resolving per-row currencies, just the one VND lookup), the non-base-group rate fetch, `buildConvertedTotals` call, and the `!converted.canConvert` early-return/warning (since nothing here can fail to convert anymore — every input is already VND).

- [ ] **Step 3: Remove the Case-level Display-currency UI**

Delete `displayCurrencyId`/`displayCurrency`/`selectedDisplayCurrencyValue`/`currencyOptions` (lines 850-868), `summaryConversionSourceIds`/`summaryConversionSourceKey`/the rate-fetch effect/`summaryExchangeRates`/`summaryRatesLoading` (lines 3522-3553), `convertedPricingSummary` (lines 3555-3560), `needsConversionHint`/`renderConversionHint` (lines 3591-3643). Replace `renderNaturalAmount` (lines 3566-3582) with a version that just formats VND directly (no per-currency-group stacking needed since `servicePricingSummary`'s totals are now single VND numbers, not grouped):

```javascript
const renderAmount = (value) => React.createElement(Text, null, formatMoney(value, findDefaultCurrency(currencies)));
```

Replace `renderPricingSummary` (lines 3645-3681) — drop the currency `Select` dropdown (3666-3673) and the "Missing rate"/"Converted to X" status text (3649-3651), since there is no longer a user-facing currency choice at this level; keep whatever non-currency parts of that render function exist (labels, totals display) using the new `renderAmount` helper.

- [ ] **Step 4: Simplify `servicePricingSummary` (lines 3446-3520)**

Drop `hasMixedCurrencies`, `lineTotalsByCurrency`, `packageCurrency`, `summarySourceGroups` from its returned shape (they're no longer meaningful — there's one VND total, full stop). Keep `isPackageMode`, `packageTotals`, `lineTotals` (both now VND-denominated, computed the same reduce-based way as `getSelectionAmounts`/`syncCaseTotalAmount` above rather than the old currency-grouped `useMemo`), and `sourceLabel` (unrelated to currency, untouched).

- [ ] **Step 5: Simplify the selection-modal preview hint (lines 4537-4576)**

Replace the `selectionGroups.length > 1 || !isSameCurrency(...)` mixed-currency branch condition with a plain always-VND render (no "≈" hint needed anymore since there's only one currency to show):

```javascript
React.createElement(Text, { strong: true }, formatMoney(selectionAmountsPreview.totalAmount, findDefaultCurrency(currencies)))
```

- [ ] **Step 6: Syntax check**

Run: `node --check "All Module/Case/CaseServices.js"`
Expected: no output.

- [ ] **Step 7: Confirm no leftover references**

Run: `grep -n "hasMixedCurrencies\|lineTotalsByCurrency\|summarySourceGroups\|convertedPricingSummary\|needsConversionHint\|renderConversionHint\|summaryExchangeRates" "All Module/Case/CaseServices.js"`
Expected: no matches.

- [ ] **Step 8: Manual QA checklist**

- [ ] Open the Case-level Services tab — totals show VND only, no currency dropdown.
- [ ] Add a service via the "select services" modal with a mix of VND/USD-priced catalog rows — preview total shows a single VND figure.
- [ ] Edit a package-mode summary (`buildPackageSummaryPatch`/`handlePackageSummaryEdit` path) — VAT amount computed correctly, `syncQuotationHeaderFromServices`→`syncContractHeaderFromServices`→`syncCaseTotalAmount` chain still fires and all three totals (Quotation, Contract, Case) end up consistent VND numbers.

- [ ] **Step 9: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "refactor(CaseServices): syncCaseTotalAmount/getSelectionAmounts sum VND directly, remove Case-level Display-currency UI"
```

---

### Task 13: CaseServices.js — delete confirmed-dead code in `handleCreateSubContract`

**Files:**
- Modify: `All Module/Case/CaseServices.js:3165-3444`

**Interfaces:** no interface change — function keeps its `(record) => {...}` signature and its one real effect (opening `CONTRACT_POPUP_UID`)

This is an opportunistic cleanup found during exploration, not a currency-correctness fix — it's low-risk because the exploration report confirmed (by reading the code) that everything after the `return;` at line 3172 is unreachable, and separately references undefined variables (`subTotal`/`vatAmount`/`totalAmount`/`user`) that would throw if the dead branch were ever somehow reached. Since this plan is already touching currency-adjacent totals logic throughout this file, removing genuinely dead code that *looks* like currency cascade logic (and could mislead a future reader into thinking sub-contract totals are handled here) is worth doing now rather than leaving it as a landmine for the next person who greps for "sub-contract" + "currency" in this file.

- [ ] **Step 1: Delete the unreachable code**

Replace the function body with just the reachable part:

```javascript
const handleCreateSubContract = async (record) => {
  try {
    await openManualPopup(
      CONTRACT_POPUP_UID,
      record?._isMainQuote ? "Create Contract" : "Create Sub-Contract",
      getContractPopupParams(record)
    );
  } catch (err) {
    console.error('[handleCreateSubContract]', err);
    message.error('Không thể mở form tạo hợp đồng.');
  }
};
```

(Add a `try/catch` since the original `try` block's `catch` — if any — was presumably further down in the now-deleted dead code; check the original function for whether a `catch` block exists after the `return` and, if so, whether it contains anything reachable-relevant like a `finally` cleanup that should be preserved. If the original has no catch at all reachable before the dead code, the try/catch shown here is a reasonable minimal addition, not a requirement — use judgement based on what's actually there.)

- [ ] **Step 2: Syntax check**

Run: `node --check "All Module/Case/CaseServices.js"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "All Module/Case/CaseServices.js"
git commit -m "chore(CaseServices): remove unreachable dead code in handleCreateSubContract"
```

---

### Task 14: Update `pgsql/multi_currency_migration.sql` documentation

**Files:**
- Modify: `pgsql/multi_currency_migration.sql:1-22` (top header comment), `:132-165` (Section 4 comment + column additions)

**Interfaces:** none — this is a comments-only change, no DDL is added or removed, since the user's screenshots confirm the `currency`/`currencyId` and (implicitly, once this plan's app code starts writing it) `exchangeRateToBase` columns already exist on `contractServices`/`quotationServices` in the live database.

- [ ] **Step 1: Correct the top header comment (lines 1-22)**

The current comment says "nothing in the app reads these new columns yet" — that becomes false once Tasks 1–8 ship. Replace lines 1-22 with:

```sql
-- ══════════════════════════════════════════════════════════════════════════
-- FILE: multi_currency_migration.sql
-- Purpose: Multi-currency accounting support — `currencies` + `exchangeRates`
--          catalog tables, plus `currencyId` / `exchangeRateToBase` columns
--          on every monetary table. `contractServices`/`quotationServices`
--          also carry their own `currency` (belongsTo) field, added directly
--          via the Nocobase Admin UI rather than by this script — see the
--          "Configure fields" screenshots referenced in
--          docs/superpowers/plans/2026-08-14-currency-vnd-normalization.md.
--          This script's SECTION 4 originally (incorrectly) assumed
--          line-item tables would NOT get their own currencyId; that
--          assumption was wrong and has been corrected below.
--
-- Status: `exchangeRateToBase` is now actively written by the app (Contract/
--         Quotation service-line Save flows) as of the currency VND-
--         normalization refactor — every service line's basePrice is
--         auto-converted to VND at Save time, and `exchangeRateToBase` is
--         the frozen rate used for that conversion. `contracts.currencyId`/
--         `quotations.currencyId` remain, but are used only as the default
--         currency suggested for newly-added rows — they are NOT read when
--         computing `subTotal`/`vatAmount`/`totalAmount`, which are always
--         VND regardless of a module's own currencyId.
--
-- How to run: Execute this script once in pgAdmin or psql.
--             Idempotent — safe to re-run (IF NOT EXISTS / ON CONFLICT /
--             WHERE ... IS NULL guards throughout).
--
-- NOT included in this pass (pending live-DB field-name verification via
-- the Nocobase admin "Configure fields" UI, not this schema dump):
--   public."paymentRequests", public."paymentRequestItems"
-- Add their ADD COLUMN / backfill statements in a follow-up script once
-- their real field names are confirmed — do not guess them here.
--
-- Tables touched: currencies (new), exchangeRates (new), contracts,
--                 quotations, contractServices, quotationServices,
--                 projectServices, payments.
-- ══════════════════════════════════════════════════════════════════════════
```

- [ ] **Step 2: Correct Section 4's comment and add the (already-live) `currencyId` columns explicitly**

Replace the Section 4 comment (originally around lines 132-142) with:

```sql
-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 4: add currencyId / exchangeRateToBase columns
-- ══════════════════════════════════════════════════════════════════════════
-- `exchangeRateToBase` = how many units of base currency (VND) 1 unit of
-- this row's currency was worth AT THE MOMENT THE ROW WAS PRICED — resolved
-- from exchangeRates by the application, then frozen forever.
--
-- Root records (contracts, quotations, payments, projectServices) get a
-- `currencyId` column used only as the default currency suggested when
-- adding a new service line — it is NOT authoritative for that record's own
-- totals, which are always VND.
--
-- Line-item tables (contractServices, quotationServices) get BOTH their own
-- `currencyId` (the line's actual pricing currency — this is the field that
-- matters) AND `exchangeRateToBase` (the frozen conversion rate applied to
-- get from that currency to the VND `subTotal`/`vatAmount`/`totalAmount`
-- stored on the same row). This corrects an earlier version of this script,
-- which assumed line-item tables would only need the denormalized rate —
-- that assumption didn't match what the app actually needed once per-line
-- currency selection (independent of the parent record's currency) shipped.

ALTER TABLE public."contractServices"
    ADD COLUMN IF NOT EXISTS "currencyId" bigint,
    ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision;

ALTER TABLE public."quotationServices"
    ADD COLUMN IF NOT EXISTS "currencyId" bigint,
    ADD COLUMN IF NOT EXISTS "exchangeRateToBase" double precision;
```

(This `ADD COLUMN IF NOT EXISTS` is safe to run even though the columns already exist live — it's a no-op against the real DB, and it makes this script an accurate, complete record of the schema for anyone provisioning a fresh environment from scratch.)

- [ ] **Step 3: Backfill safety check**

Confirm Section 5's backfill block (`UPDATE public."contractServices" SET "exchangeRateToBase" = 1 WHERE "exchangeRateToBase" IS NULL`, and the equivalent for `quotationServices`) is still present and unchanged below — no edit needed there, just confirm it still makes sense given Step 2's addition (it does: existing rows without a resolved rate default to `1`, meaning "already VND", which is the correct backfill assumption for any row that predates this feature).

- [ ] **Step 4: Commit**

```bash
git add pgsql/multi_currency_migration.sql
git commit -m "docs(pgsql): correct multi-currency migration comments to match live schema and new VND-normalization model"
```

---

### Task 15: Rewrite `CURRENCY_LOGIC_SRS.md` for the new model

**Files:**
- Modify: `CURRENCY_LOGIC_SRS.md` (full rewrite of sections 2 through 6)

**Interfaces:** none — documentation only

- [ ] **Step 1: Rewrite Section 2 (Thuật ngữ & Khái niệm)**

Replace the terminology table to drop "Record currency" (as an authoritative-for-totals concept), "Display currency", "Base-currency conversion", "Mixed-currency" — and add:

```markdown
| Thuật ngữ | Ý nghĩa |
|---|---|
| **Line currency** (`getRowCurrency(row)`) | Currency của một dòng dịch vụ (`_currencyId`/`currencyId`), do người dùng chọn qua dropdown hoặc lấy tự động theo catalog service. Đây là currency **duy nhất** còn có ý nghĩa nghiệp vụ trong hệ thống — không còn khái niệm "Record currency" ở cấp Contract/Quotation. |
| **Header currency** (`contract.currencyId`/`quotation.currencyId`) | Chỉ dùng làm **currency gợi ý mặc định** khi thêm dòng dịch vụ mới (`addRow`). Không bao giờ được đọc để tính `subTotal/vatAmount/totalAmount` của module. |
| **VND (base currency)** | Currency duy nhất mà `subTotal/vatAmount/totalAmount` ở **mọi cấp** (dòng dịch vụ, Contract, Quotation, Case) được lưu vào DB. Resolve qua `findDefaultCurrency(currencies)` (ưu tiên `isBaseCurrency`, fallback code `"VND"`). |
| **`exchangeRateToBase`** | Tỷ giá VND-trên-1-đơn-vị-Line-currency, chốt (frozen) tại thời điểm Save — lưu trên chính dòng dịch vụ. Không đổi lại khi tỷ giá tham chiếu (`exchangeRates`) được sửa sau đó. |
| **Missing-rate block** | Nếu 1 dòng dịch vụ ở currency khác VND mà không tra được tỷ giá quy đổi, **toàn bộ Save bị chặn** (không phải chỉ cảnh báo/lưu một phần như model cũ) — lỗi nêu rõ tên dịch vụ + currency thiếu tỷ giá. |
```

- [ ] **Step 2: Rewrite Section 4 (Yêu cầu nghiệp vụ)**

Replace FR-1 through FR-11 with the following condensed set (renumbered FR-1 through FR-6, since the mixed-currency/Display-currency FR groups no longer apply):

```markdown
### FR-1 — Currency Resolution (giữ nguyên phần lớn model cũ)

- FR-1.1 đến FR-1.6 của bản trước **giữ nguyên không đổi** — cách resolve currency cho 1 record/dòng dịch vụ không thay đổi.

### FR-2 — Định dạng & làm tròn số tiền

- FR-2.1 đến FR-2.5 của bản trước **giữ nguyên không đổi** — `roundMoneyForCurrency` vẫn là quy tắc làm tròn bắt buộc, áp dụng trước tiên ở currency gốc của dòng (basePrice/vatAmount native), sau đó áp dụng lại ở VND sau khi quy đổi.

### FR-3 — Per-line VND Conversion (thay thế hoàn toàn FR-3/FR-5/FR-6 của bản trước)

- FR-3.1: Mỗi dòng dịch vụ active tính `subTotal(native) = basePrice × quantity(=1)`, `vatAmount(native) = roundMoneyForCurrency(subTotal(native) × vat / 100, lineCurrency)` — giống hệt bản trước.
- FR-3.2: Nếu `lineCurrency` khác VND, hệ thống tra `pickConversionRate(exchangeRatesToVnd, lineCurrency, vndCurrency, pricingDate)`. Nếu tìm được, `exchangeRateToBase = rate`; `subTotal/vatAmount/totalAmount` (VND, các field thực sự lưu DB) = `roundMoneyForCurrency(native × exchangeRateToBase, vndCurrency)`.
- FR-3.3: Nếu `lineCurrency` là VND, `exchangeRateToBase = 1`, không cần quy đổi.
- FR-3.4: Nếu không tra được tỷ giá, dòng đó được đánh dấu `_convertible = false` — không tham gia tổng, và **chặn toàn bộ Save** (xem FR-4).
- FR-3.5: `pricingDate` dùng để lọc hiệu lực tỷ giá — công thức resolve giống FR-7.3 bản trước (`contract.signedAt || contract.date` cho Contract; `quotation.date` cho Quotation).

### FR-4 — Module Totals (thay thế FR-6 của bản trước)

- FR-4.1: `subTotal/vatAmount/totalAmount` của Contract/Quotation = tổng cộng dồn (không group theo currency) của `subTotal/vatAmount/totalAmount` (đã VND) từng dòng active.
- FR-4.2: Nếu **bất kỳ** dòng active nào `_convertible = false`, `handleSave` báo lỗi nêu rõ tên dịch vụ + currency thiếu tỷ giá, và **không lưu bất kỳ thay đổi nào** (khác với model cũ — model cũ vẫn lưu phần khác, chỉ bỏ qua totals).
- FR-4.3: Case-level `projects.totalAmount` (`syncCaseTotalAmount`) = tổng cộng dồn tương tự trên toàn bộ `projectServices` active của Case, không phân biệt nguồn gốc (Quotation-linked/Contract-linked/standalone).
- FR-4.4: `syncContractHeaderFromServices`/`syncQuotationHeaderFromServices` (cascade sync trong `CaseServices.js`) không còn tự group/quy đổi theo currency — chỉ đọc trực tiếp `subTotal/vatAmount/totalAmount` (đã VND) của từng dòng và cộng dồn.

### FR-5 — Package Pricing Mode (thay thế FR-4 của bản trước)

- FR-5.1: Package mode dùng 1 `packageSubTotal` + 1 `packageVatRate` cấp record, **luôn nhập trực tiếp bằng VND** (không còn khái niệm "Package mode dùng Record currency" — vì Record currency không còn tồn tại).
- FR-5.2 đến FR-5.4 của bản trước (chuyển đổi Line↔Package, nhập trực tiếp VAT amount/Total amount, suy ngược VAT rate) **giữ nguyên**, chỉ thay currency luôn là VND.

### FR-6 — Retainer Contracts

- FR-6.1: Hợp đồng loại `retainer`: `subTotal = monthlyFee × retainerDuration`, **luôn tính bằng VND** — đây là assumption tường minh (trước đây là ngầm định không ghi chú), vì retainer không gắn với dòng dịch vụ nào để suy ra currency khác.
```

- [ ] **Step 3: Rewrite Section 5 (Bất biến nghiệp vụ)**

Replace INV-1 through INV-5 with:

```markdown
1. **INV-1**: `subTotal/vatAmount/totalAmount/fixedAmount` được ghi vào `contracts`/`quotations`/`contractServices`/`quotationServices`/`projects` **luôn luôn** là VND — không có ngoại lệ, không có "Record currency" nào khác VND ở các field này.
2. **INV-2**: `exchangeRateToBase` một khi đã ghi vào 1 dòng dịch vụ thì **không tự đổi lại** khi `exchangeRates` gốc bị sửa sau đó (frozen-at-save, không phải live-computed) — trừ khi người dùng chủ động đổi lại currency hoặc basePrice của dòng đó và Save lại.
3. **INV-3**: Mọi phép làm tròn tiền dùng `roundMoneyForCurrency` theo đúng currency đích ở từng bước (native currency cho vatAmount gốc, VND cho số liệu cuối) — không có chỗ nào dùng `Math.round()` trần cho số tiền.
4. **INV-4**: Nếu bất kỳ dòng dịch vụ active nào thiếu tỷ giá quy đổi sang VND, **toàn bộ Save bị chặn** — không có trạng thái "lưu một phần, tổng chưa cập nhật" như model cũ.
5. **INV-5**: Cột Price không bao giờ hiển thị currency code trùng lặp với dropdown currency liền kề (giữ nguyên từ bản trước).
```

- [ ] **Step 4: Rewrite Section 6 (Test Cases)**

Delete every test case that referenced Display currency or mixed-currency-group behavior (the old TC-12, TC-13, TC-16, TC-17, TC-24 through TC-27 no longer apply — there is no Display currency to test). Keep and adapt: TC-01 through TC-08 (currency resolution/formatting — still applies, just replace "Record currency" wording with "VND"), TC-09 through TC-11 (single-currency line totals — still applies, now describes the only case), TC-18 through TC-23 (Package mode — still applies, currency is now always VND), TC-28 through TC-33 (exchange rate resolution — still applies unchanged), TC-34 through TC-40 (cascade sync — still applies, update expected results to describe straight VND summation instead of "tính lại theo contractCurrency"), TC-41 through TC-49 (lock states, edge cases — still applies, mostly unchanged), TC-50 (currency id/code equality — still applies).

Add new test cases:

```markdown
| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-51 | P0 | 2 dòng: 1 VND, 1 USD; đã có tỷ giá USD→VND | Bấm Save | `subTotal/vatAmount/totalAmount` ghi vào DB = tổng VND của cả 2 dòng (dòng USD đã tự convert); dòng USD trong DB vẫn giữ `currencyId` = USD và `exchangeRateToBase` = tỷ giá đã dùng |
| TC-52 | P0 | Dòng USD, không có tỷ giá USD→VND | Bấm Save | Lỗi nêu rõ tên dịch vụ + "USD" chưa có tỷ giá; **không có thay đổi nào được lưu**, kể cả các dòng VND khác trong cùng lần Save |
| TC-53 | P1 | Dòng USD, tỷ giá lúc Save là 25.000 | Sau khi Save, admin sửa lại bản ghi `exchangeRates` USD→VND thành 26.000 | `exchangeRateToBase` trên dòng dịch vụ đã lưu **không đổi** (vẫn 25.000) — chỉ đổi nếu người dùng sửa lại currency/basePrice của chính dòng đó và Save lại |
| TC-54 | P1 | Quotation status chuyển `order`, tự tạo sub-contract | Kiểm tra sub-contract mới tạo | `currencyId` của sub-contract = VND (không còn để trống/mặc định ngẫu nhiên) |
```

- [ ] **Step 5: Commit**

```bash
git add CURRENCY_LOGIC_SRS.md
git commit -m "docs: rewrite CURRENCY_LOGIC_SRS.md for the per-line VND-normalization model"
```

---

## Self-Review

**Spec coverage:**
- "Khi chọn service có currency thì tự động convert sang vnd dựa vào exchangeRates" → Tasks 1, 5 (`buildServicePricingPayload` conversion), Tasks 3, 7 (`handleSave` persists `exchangeRateToBase` + VND totals).
- "totalAmount của từng module sẽ tự động tính tổng tiền và chuyển đổi sang VND, không còn dựa vào currencyId cho từng module nữa" → Tasks 2, 6 (`lineTotalsVnd`/`totals` always VND, no `contractCurrency`/`quotationCurrency` used as conversion target), Tasks 10–12 (cascade sync straight-sums VND).
- "chỉ tập trung currency của service thôi" → Line currency (`getRowCurrency`) is untouched everywhere; header `currencyId` is explicitly demoted to "default only" in Task 15's rewritten FR-1 table.
- User's earlier-confirmed concerns (schema mismatch on `pgsql/multi_currency_migration.sql`, rounding inconsistency via bare `Math.round`) → Tasks 14, 9.

**Placeholder scan:** No "TBD"/"similar to Task N without code"/vague validation left in any step — every code-bearing step has literal code. Tasks 5, 8, and parts of Task 7/13 explicitly say "mirror Task N's code verbatim" rather than re-pasting identical blocks twice, which is intentional DRY-ing of the plan document itself (not a placeholder — the code to paste is fully specified in the task being mirrored).

**Type consistency:** `buildServicePricingPayload`'s new signature (`{ pricingMode, basePrice, quantity, vat, packageSubTotal, packageVatRate, currency, vndCurrency, exchangeRatesToVnd, pricingDate }` → `{ ..., subTotal, vatAmount, totalAmount, exchangeRateToBase, ..., _convertible }`) is identical across Tasks 1, 2, 3, 5, 6, 7. `lineTotalsVnd`'s shape (`{ subTotal, vatAmount, totalAmount, missingRows }`) is identical across Tasks 2, 3, 4, 6, 7, 8. `vndCurrency`/`exchangeRatesToVnd`/`pricingDate` names are consistent everywhere they appear.
