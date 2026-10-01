# Money Flow Unification — Quotation → Contract → Case → Finance — Design Spec

Date: 2026-09-29

Status: design approved section by section in chat (2026-09-29). Schema facts below were
verified on the dev instance with `JsField/DiagnoseMoneyFlowSchema.js` the same day.

Supersedes, where they conflict: `CURRENCY_LOGIC_SRS.md` FR-3/FR-4 (who computes line and
header money) and the column comments in `pgsql/multi_currency_migration.sql` (the
`exchangeRates` shape). INV-1 of `CURRENCY_LOGIC_SRS.md` is kept.

## 1. Problem

Money for a service line is computed in six places (QuotationCreateForm, ContractCreateForm,
CaseCreateForm, QuotationServices, ContractServices, CaseServices), each with its own copy of
the arithmetic, and they disagree:

- The three Services blocks write `subTotal/vatAmount/totalAmount` in **VND** with a frozen
  `exchangeRateToBase`; the three create forms write them in the **line currency** and no rate.
- `exchangeRateToBase` was never persisted anywhere: it is not a registered NocoBase field on
  `quotationServices`, `contractServices` or `projectServices`, so the API drops it silently.
- Header totals are re-converted to VND on every save with the latest rate, so the same service
  can have a different VND value at each step.
- Finance (payment requests, invoices, payments) is VND-only and cannot be traced back to the
  service and currency it came from.

Dev data on 2026-09-29, the 500 latest rows of each line table, non-package foreign-currency lines:

| Table | Foreign lines | native | mismatch (e.g. 10 USD + 8% saved as 11) | VND, no rate on row |
|---|---|---|---|---|
| quotationServices | 2 | 0 | 2 | 0 |
| contractServices | 13 | 2 | 11 | 0 |
| projectServices | 16 | 7 | 4 | 5 |

None follows INV-1 with a rate. The five "VND, no rate" rows match the stored rates exactly
(1000 USD → 26,176,500; 200 SGD → 4,096,094).

## 2. Goals

1. One place computes every stored money number: the database. JS only previews.
2. Every service line keeps its amount in its own currency, the rate it was frozen at, and VND.
3. No rounding drift anywhere: totals are sums of rounded parts; splits never lose or gain a đồng.
4. A service's money can be traced from quotation to contract to case to requested / invoiced /
   paid, in its own currency and in VND, with every difference explained.
5. Existing data is fixed only after the user reviews a read-only preview.

## 3. Decisions (made with the user)

| Question | Decision |
|---|---|
| Finance currency | Always VND. Foreign currency is kept as a trace (service, native amount, rate). |
| Where the rate is frozen | Each document freezes its own: quotation on its date, contract on signing. The contract is the billing basis. A case inherits the contract's rate. A payment records the rate actually received. |
| Tracking output | Correct data plus SQL views and audits. No UI this time. |
| Legacy data | Read-only preview first; backfill only after the user approves it. |
| Architecture | Option C: the database computes (triggers). Columns keep INV-1: `subTotal/vatAmount/totalAmount` are VND; native amounts go in new `*Native` columns. |

## 4. Verified schema (dev, 2026-09-29)

- `currencies`: `code`, `decimalPlaces` (bigInt), `isBaseCurrency`, `roundingMode`, `isActive`,
  `locale`. **No row has `isBaseCurrency = true`; VND has `decimalPlaces = NULL`.** SGD, USD,
  EUR and CNY have 2.
- `exchangeRates` (pair-based, not what `multi_currency_migration.sql` describes): `fromCurrencyId`,
  `toCurrencyId`, `rate`, `effectiveDate` (a timestamp), `status` (NULL today), `isLocked`,
  `source`, `values`, `rawPayload`. Both directions are stored (USD→VND 26,176.5 and VND→USD
  0.0000382…). The earliest rate is 2026-08-18.
- `quotationServices`: `quotationId`, `serviceId`, `caseId`, `basePrice`, `quantity`, `vat`,
  `currencyId`, `subTotal`, `vatAmount`, `totalAmount`, `pricingMode`, `package*`, `status`,
  `comboId`. **No `exchangeRateToBase`.**
- `contractServices`: `contractId`, `projectServiceId`, `quotationServiceId`, `ServiceId`
  (capital S), `projectId`, `basePrice`, `quantity`, `vat`, `currencyId`, `subTotal`,
  `vatAmount`, `totalAmount`, `pricingMode`, `package*`, `lineStatus`, `paymentAllocatedAmount`,
  `paymentTriggerTemplateIds`. **No `exchangeRateToBase`.**
- `projectServices`: `projectId`, `serviceId`, `basePrice`, `vat`, `currencyId`, `subTotal`,
  `vatAmount`, `totalAmount`, `pricingMode`, `package*`, `status`, `billingMode`,
  `paymentAllocatedAmount`, `pricingSnapshot`, `comboId`. **No `quantity`, no
  `quotationServiceId`, no `contractServiceId`, no `exchangeRateToBase`.**
- `quotations`: `currencyId`, `exchangeRateToBase`, `subTotal`, `totalAmount`, `pricingMode`,
  `packageVatRate`, `createdAt`, `sentAt`, `acceptedAt`, `validUntil`. **No `vatAmount`, no
  `packageSubTotal`.**
- `contracts`: `currencyId`, `exchangeRateToBase`, `subTotal`, `vatAmount`, `totalAmount`,
  `fixedAmount`, `signedAt`, `effectiveAt`, `issuedDate`, `contractType`, `billingCycle`,
  `pricingMode`, `packageVatRate`. **The signing date is `signedAt`, not `signedDate`.** No
  `monthlyFee` / `retainerDuration`: retainer money lives in `contractBillingPlans`.
- `projects`: `contractId`, `quotationId`, `defaultCurrencyId` (relation `currencies`),
  `totalAmount`. **No `subTotal`, no `vatAmount`.**
- `paymentRequests`: `requestedAmount`, `currency` (string), `contractId`, `contractServiceId`,
  `projectServiceId`, `contractPaymentScheduleId`, `billingPlanId`, `sourceSnapshot`,
  `paidAmount`, `outstandingAmount`, `status`.
- `paymentRequestServices` (`paymentRequestId`, `contractServiceId`);
  `contractPaymentSchedules` (`contractId`, `installmentNo`, `percentage`, `amount`);
  `contractPaymentScheduleServices` (`contractPaymentScheduleId`, `contractServiceId`).
- `invoices`: `totalAmount`, `vatAmount`, `amountPaid`, `currencyId`, `paymentRequestId`, `contractId`.
- `payments`: `amount`, `currencyId`, `exchangeRateToBase`, `paymentRequestId`, `invoiceId`,
  `contractId`, `paymentStatus`. VND is read through the existing `finance_payment_vnd()`.

## 5. Data model

### 5.1 Service lines (`quotationServices`, `contractServices`, `projectServices`)

| Column | Meaning | Written by |
|---|---|---|
| `basePrice`, `quantity`, `vat`, `currencyId` | Inputs, in the line currency | JS (what the user types) |
| `subTotalNative`, `vatAmountNative`, `totalAmountNative` (new) | Line-currency amounts, rounded to the currency's decimals | DB trigger |
| `exchangeRateToBase` (new on these tables) | VND per 1 unit of the line currency, frozen | DB trigger |
| `exchangeRateDate` (new) | The `effectiveDate` of the rate used (a date) | DB trigger |
| `subTotal`, `vatAmount`, `totalAmount` | VND (INV-1) | DB trigger |

`projectServices` has no `quantity`; it is treated as 1 (as the JS already does).

New link: `projectServices.quotationServiceId` (belongsTo `quotationServices`). CaseCreateForm
already sends it and it is dropped today. Case → contract is already traceable through
`contractServices.projectServiceId`.

Package / combo lines (`pricingMode = 'package'`) keep today's convention: line amounts are 0,
`package*` columns hold the combo's VND amounts, rate = 1. Their `*Native` columns mirror the
`package*` values.

### 5.2 Headers

No new header columns. The DB recomputes only existing ones:
`quotations.subTotal/totalAmount`, `contracts.subTotal/vatAmount/totalAmount`, `projects.totalAmount`.

### 5.3 Currencies data fix

One UPDATE: VND gets `isBaseCurrency = true` and `decimalPlaces = 0`, so the DB and the JS pick
the same base currency by flag rather than by the code "VND". The JS fallback by code stays.

## 6. Computation (triggers)

### 6.1 Rate lookup — `money_rate_to_base(p_currency_id bigint, p_on date) → (rate numeric, rate_date date)`

- The base currency (VND) → rate 1, `rate_date = p_on`.
- Otherwise the latest `exchangeRates` row with `fromCurrencyId = p_currency_id`,
  `toCurrencyId = VND` and `effectiveDate::date <= p_on`, whose `status` is NULL or not one of
  inactive / disabled / archived / cancelled / canceled / draft (the same list as the JS
  `isUsableExchangeRateStatus`).
- No direct pair → the inverse pair (`from = VND`, `to = p_currency_id`), rate = 1 / rate.
- Nothing on or before `p_on` → the earliest usable rate after it (rates only exist from
  2026-08-18, while documents are older).
- No usable rate for the pair at all → `RAISE EXCEPTION 'Missing exchange rate <CODE>→VND for
  service "<name>"'`, and the save fails. This keeps the SRS rule that a save with a missing rate
  is blocked.

### 6.2 Which date freezes the rate

| Line | Date |
|---|---|
| `quotationServices` | the quotation's `createdAt` (local date, Asia/Ho_Chi_Minh, as `finance_local_date`) |
| `contractServices` | the contract's `signedAt`, else its `createdAt` |
| `projectServices` | inherits the rate and `rate_date` of its contract line (`contractServices.projectServiceId = ps.id`), else of its quotation line (`quotationServiceId`), else looks up by the case's own `date` (the Case form's "Open date"), else its `createdAt` |

### 6.3 Line trigger — `BEFORE INSERT OR UPDATE` on the three line tables (non-package lines)

With `d` = `decimalPlaces` of the line currency (NULL → 0 for the base currency, 2 otherwise),
computed in `numeric`:

```
subTotalNative    = round(basePrice × quantity, d)
vatAmountNative   = round(subTotalNative × vat / 100, d)
totalAmountNative = subTotalNative + vatAmountNative
subTotal          = round(subTotalNative × rate, 0)
vatAmount         = round(vatAmountNative × rate, 0)
totalAmount       = subTotal + vatAmount
```

- The rate is (re)frozen only when the row is inserted, its `currencyId` changes, or its rate is
  NULL. Editing price or VAT recomputes the amounts with the frozen rate (INV-2).
- Whatever money values the JS sent are overwritten.
- A VND line has rate 1, so its native and VND columns are equal.

### 6.4 Re-freeze on signing

When `contracts.signedAt` is set or changed, the contract's foreign-currency lines look their rate
up again for the new date, and the inherited case lines follow. This is skipped when the contract
already has a payment request that is active, invoiced or paid, so amounts already requested
never move.

### 6.5 Header totals

- Line-mode documents only (`pricingMode` is not `package`): header = Σ VND of active lines
  (`lineStatus` / `status` not deleted or cancelled). A `BEFORE UPDATE` on the header also
  overrides money the JS sends, and an `AFTER` trigger on the lines refreshes the header when a
  line changes.
- Combo / package documents keep the JS-written totals, which are already VND. The DB cannot
  reliably tell two applications of the same combo apart, because every row of a combo carries
  the whole combo's amount.
- `projects.totalAmount` = Σ of the case's own active services (it is no longer a copy of the
  contract total). A case with any active package service keeps the JS value.
- Retainer contracts (`contractType = 'retainer'`) are left alone; their money comes from
  `contractBillingPlans`.

### 6.6 Installment amounts

`contractPaymentSchedules.amount` for percentage-based rows is derived by the DB from the contract
total using the largest-remainder method (§7.3), so Σ installments = contract total exactly. It
is recomputed when the contract total changes, except for rows whose payment request is already
active, invoiced or paid.

## 7. Consistency rules

1. **One source per number.** Inputs are the line's `basePrice`, `quantity`, `vat`,
   `currencyId` and its frozen rate. Everything else is derived by the DB. The JS displays
   stored values and computes only an unsaved preview.
2. **Round once, then add.** Rounding happens at line level; totals only add rounded parts
   (`total = subTotal + vatAmount`, header = Σ lines). SQL computes in `numeric` and rounds on
   write; columns stay `double`, holding rounded values.
3. **Splits never lose a đồng.** Every split (contract → installments, payment request →
   services, invoice / payment → services) uses the largest-remainder method: floor each share
   to the unit, then hand the remaining units to the shares with the largest fractional parts
   (ties broken by id).
4. **Rate differences are explicit.**
   - Contract → case: equal VND by inheritance.
   - Quotation → contract: explained by `priceChange` and `fxQuoteToContract` in the trail.
   - Payment vs contract rate: `fxOnPayment`.
   - The outstanding amount is always measured in contract VND.
5. **Audit.** `money_consistency_audit.sql` returns one row per violation of:
   - header = Σ lines (line mode);
   - `subTotal + vatAmount = totalAmount` on every line and header;
   - every foreign line has a rate;
   - Σ installments = contract total;
   - Σ case totals of a contract = Σ its contract lines;
   - Σ per-service contract values = contract total;
   - Σ per-service requested / invoiced / paid = the Finance totals.

   Expected result: 0 rows.
6. **Shared test cases.** `scripts/tests/fixtures/money-cases.json` feeds both the JS preview
   tests and the SQL trigger tests, so the preview and the stored value cannot disagree.

## 8. Finance allocation and the money trail

### 8.1 A service's contract value (VND)

Same priority as the existing `by_service_service_amount()`:

1. `paymentAllocatedAmount` when locked;
2. else the line's `totalAmount` (line pricing);
3. else its automatic combo share.

Σ over a contract's services must equal the contract total (audited).

### 8.2 Allocating a payment request to services (first match wins)

1. `projectServiceId` / `contractServiceId` set on the request → 100 % to that service.
2. `paymentRequestServices` rows → those services.
3. `contractPaymentScheduleId` → the services tagged on that installment
   (`contractPaymentScheduleServices`); untagged installment → all active services of the contract.
4. `billingPlanId` (retainer) → no service; the contract's "Retainer" bucket.

Weights are the services' contract values (§8.1), split by largest remainder (§7.3).

### 8.3 Invoices and payments

- They follow the allocation of their payment request.
- Linked only to a contract → split over all of that contract's services.
- Linked to nothing → the "Unallocated" bucket, so it is never missing from totals.

### 8.4 No stored copies

Allocation is computed on read by SQL functions and views, not kept in tables maintained by
triggers (rule 7.1).

### 8.5 View `finance_service_money_trail`

One row per contract service, or per case service when the case has no contract.

| Group | Columns |
|---|---|
| Links | `contractId`, `projectId`, `quotationServiceId`, `contractServiceId`, `projectServiceId`, `serviceName`, `currencyCode` |
| Quoted | native, rate, VND |
| Contracted | native, rate, VND |
| Case | VND (equal to contracted by inheritance) |
| Differences | `priceChange` = (contract native − quoted native) × contract rate; `fxQuoteToContract` = quoted native × (contract rate − quoted rate). Together they equal contracted VND − quoted VND exactly. |
| Finance (VND) | `requested`, `invoiced`, `paid`, `outstanding` = contracted − paid |
| Payment FX | `fxOnPayment` = VND actually received − the same native amount at the contract rate (payments in a foreign currency only) |

Companion views: `finance_contract_retainer_trail` and `finance_unallocated_money`.

## 9. Legacy data

- **`money_flow_backfill_preview.sql` (read-only):** every line whose stored numbers differ from
  the recomputation, with the proposed values. It lists separately the lines of contracts that
  already have an active, invoiced or paid payment request whose VND would change.
- **`money_flow_backfill.sql` (writes, run only after the user approves the preview):**
  - recomputes lines through the triggers (rate frozen by the §6.2 dates), e.g. the "11 USD"
    rows become 10.80 USD;
  - then recomputes headers and installment amounts;
  - does not touch the protected lines listed separately; the user decides those one by one
    (`SELECT * FROM money_backfill_contract(<contract id>)` re-prices one billed contract).
- Until the backfill, a row saved before the triggers (priced, no frozen rate) keeps its
  numbers on any update that changes none of its inputs, and a document holding such a
  row keeps its totals — so a payment or a status change never re-sums old line-currency
  amounts as VND. Only the backfill (`money.backfill = 'on'`) or a real edit of price /
  quantity / VAT / currency re-prices it.

## 10. JS changes (small; the DB is the source)

- `JsField/RegisterMoneyFlowFields.js`: registers `exchangeRateToBase`, `exchangeRateDate`,
  `subTotalNative`, `vatAmountNative`, `totalAmountNative` on the three line tables, and
  `projectServices.quotationServiceId`.
- The three create forms:
  - the unit-price input accepts decimals up to the currency's `decimalPlaces` (today
    QuotationCreateForm's `PriceInput` strips everything but digits, so 120.50 USD cannot be
    typed);
  - foreign amounts always show their full decimals (10.80, not 10.8);
  - the preview looks rates up with the same date as the DB (today for a quotation, `signedAt`
    for a contract).
- The Services blocks and CaseFinanceBlock display stored values; they do not recompute saved
  numbers.
- `localSyncContractHeaderFromServices` and similar sync code stop copying the contract total
  into `projects` (§6.5).

## 11. Files

| File | Kind | Content |
|---|---|---|
| `pgsql/money_flow_foundation.sql` | writes | columns, currencies fix, `money_rate_to_base`, line triggers, header triggers, re-freeze on signing, installment amounts |
| `pgsql/money_flow_trail.sql` | functions / views | allocation functions, `finance_service_money_trail`, retainer and unallocated views |
| `pgsql/money_flow_backfill_preview.sql` | read-only | §9 preview |
| `pgsql/money_flow_backfill.sql` | writes (after approval) | §9 backfill |
| `pgsql/money_consistency_audit.sql` | read-only | §7.5 invariants |
| `pgsql/tests/money_flow_test.sql` | test | triggers, rate lookup, re-freeze, headers, installments |
| `pgsql/tests/money_trail_test.sql` | test | allocation, trail, audit returns 0 rows |
| `pgsql/tests/fixtures/finance_min_schema.sql` | test fixture | extended with the tables and columns above |
| `scripts/tests/fixtures/money-cases.json` | test data | shared JS / SQL cases |
| `JsField/RegisterMoneyFlowFields.js` | setup | §10 field registration |
| JS blocks listed in §10 | changes | §10 |

## 12. Testing

- **Shared cases:**
  - 10 USD + 8 % = 10.80 USD;
  - 120.50 USD + 4 % = 125.32 USD;
  - 1000 USD at 26,176.5;
  - a VND line;
  - 3 installments of 33.33 %;
  - a request split over 3 services;
  - a rate that exists only after the document date;
  - no rate at all (the save fails).
- **SQL tests** run through `scripts/tests/sql/run-local.sh` (BEGIN … ROLLBACK, printing
  `ALL … PASSED`), including the §7.5 audit returning 0 rows after each scenario.
- **Regression:** all existing SQL tests (finance foundation, billing rules, by-case, one-time
  triggers, retainer schedule, members, notifications) and the node suite still pass.

## 13. Deploy order (dev)

1. `pgsql/money_flow_foundation.sql`, then `pgsql/money_flow_trail.sql`.
2. `JsField/RegisterMoneyFlowFields.js`.
3. `pgsql/tests/money_flow_test.sql`, `pgsql/tests/money_trail_test.sql` → `ALL … PASSED`.
4. `pgsql/money_flow_backfill_preview.sql` → the user reviews → `pgsql/money_flow_backfill.sql`.
5. `pgsql/money_consistency_audit.sql` → 0 rows.
6. Re-paste the changed JS blocks.

## 14. Non-goals

- A UI for the money trail (later).
- A daily reconciliation cron (the audit file is run by hand for now).
- Invoicing or collecting in foreign currency (Finance stays VND).
- Changing retainer billing (`contractBillingPlans`).
- Changing column types from `double` to `numeric`.

## 15. Changes from the second whole-plan review (2026-09-29)

- **Installments saved after the lines** (the Contract form saves them last):
  trigger `trg_money_schedule_changed` (AFTER INSERT / DELETE / UPDATE OF
  percentage, contractId on `contractPaymentSchedules`) runs
  `money_refresh_schedule`, so Σ installments = the contract total the DB keeps.
  Items of a pending request share its amount (largest remainder).
- **Forms compute VND line by line** (`convertLinesToBase`, Quotation /
  Contract / Case create forms): Σ round(native × rate) per line, the same
  number the DB stores, not round(Σ native × rate) per currency group.
- **Contract "Total amount"** is read-only while priced service lines set it
  (§6.5: header = Σ lines); installments are split from that total
  (`resolveContractTotal`). A retainer / combo keeps the typed total.
- **Saved lines show stored values** (§10): ContractServices,
  QuotationServices and ContractDetailView display a saved, unedited line's
  stored VND (`storedLinePricing`); only new / edited lines are previewed.
- **Billed contracts**: asking for a re-freeze (rate → NULL) on a billed
  contract's line or its case line keeps the stored rate. A `draft` request
  is not billed.
- **Rates**: two rates on one effective date → the larger id (entered last)
  wins, in SQL and in the 7 JS copies.
- **Combo → line**: a line switched from package pricing freezes a real rate.
- **`projects.date`** is read through `to_jsonb`: a database without it falls
  back to `createdAt`.
- **Backfill preview** actions: `will fix`, `rate only`, `protected: contract
  already billed`, `missing rate`, `currency unknown` (a line with no
  currency on a document in another currency: skipped, decided by hand).
  Case lines are previewed at the rate they will inherit. New view
  `money_backfill_totals_preview` lists the document totals it will write.
- **Trail**: `outstanding` is in contract VND (paid − fx_on_payment);
  new column `allocation_adjustment` (a locked paymentAllocatedAmount against
  the line total), so price_change + fx_quote_to_contract +
  allocation_adjustment = contracted_vnd − quoted_vnd.
- **Typing**: a foreign-currency box reads "120,50" as 120.50 and "1,500" as
  1500; a price switched to VND rounds to whole đồng.
- **Field registration**: `projectServices.quotationService` (belongsTo
  quotationServices, foreign key `quotationServiceId`).

## 16. Currency catalog rules (2026-09-30, `pgsql/currency_catalog.sql`)

- VND is the base currency (confirmed with the user); lines keep their own
  currency as a trace, every total / request / invoice / payment is VND.
- Exchange rates are entered one way only: 1 foreign unit = x VND, rate > 0
  (trigger `trg_money_exchange_rate_guard`). Dev had four VND -> foreign rows
  10,000 times off (1 USD = 2.6 VND); `currency_catalog_fix_run()` deletes
  such rows when the currency has a foreign -> VND rate (keeps and lists
  them otherwise). The lookup still reads older inverse rows.
- `companyServices.currencyId` (NocoBase relation `currency`,
  `JsField/RegisterCompanyServiceCurrency.js`, which also removes the old
  misconfigured hasMany `currencies`): a company price carries its currency.
  Before, the forms read a company price in the service's currency (IRC:
  25,000,000 VND became 25,000,000 USD). The fix fills it: the service's
  currency, unless the price is closer to the catalog price converted to VND
  (without a catalog price or rate: >= 100,000 reads as VND).
- `money_rate_warnings`: a foreign currency with no usable rate or whose
  latest rate is older than 30 days (listed by `money_consistency_audit.sql`).
- VND values stored next to foreign prices (2026-09-30, decided with the user):
  - service lines keep their foreign price and store `basePriceVnd` = the
    unit price at the line's frozen rate (whole đồng), next to the VND
    `subTotal` / `vatAmount` / `totalAmount` they already had;
  - the catalog stores VND at the currency's latest rate, with that rate and
    its date: `services.basePriceVnd`, `companyServices.priceVnd`,
    `serviceComboItems.priceVnd`, `serviceCombos.packageSubTotalVnd` /
    `totalAmountVnd`. A new, edited or removed rate converts the catalog
    again (`trg_money_exchange_rate_changed`); documents keep their frozen
    rates. NULL when the currency has no rate.
  - The seven service pickers show "≈ … VND" (the stored value) under a
    foreign price.
