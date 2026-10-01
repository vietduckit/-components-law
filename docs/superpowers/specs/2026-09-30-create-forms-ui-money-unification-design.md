# Create forms — UI and money unification (stage C) — design

Date: 2026-09-30. Builds on `2026-09-29-money-flow-unification-design.md`
(line triggers, frozen rates, VND totals — INV-1) and
`2026-09-29-service-thread-sync-design.md` (3-way service sync).

Stage C of three (C → B → A, decided with the user):

- **C — create forms** (this spec): `All Module/Case/CaseCreateForm.js`,
  `All Module/Contract/ContractCreateForm.js`,
  `All Module/Quotation/QuotationCreateForm.js`.
- B — service tables (CaseServices, ContractServices, QuotationServices,
  ServiceChangeLog) — later spec.
- A — finance blocks (CaseFinanceBlock, ContractPaymentScheduleDetailBlock,
  Payment/PaymentRequest/Invoice create, PaymentContractDetailBlock) — later
  spec.

## 1. Problem

The three create forms each carry their own copy of the service table and
the money code, and they drifted apart:

- **Money.** The Contract form read the stored `subTotal` of a case line
  (VND since INV-1) as a line-currency amount and converted it again: a
  contract of 18,000,000 VND + 10 USD showed a total of 7,419,693,610 VND
  (fixed 2026-09-30 by `lineCurrencySource`). Two more gaps remain:
  - the Contract services table, row totals and footer convert at **today's**
    rate, while the database freezes a contract line's rate on the contract's
    **Signed date** (`money_line_rate`) and the submit already uses it — a
    back-dated contract shows one total and stores another, and its payment
    schedule preview is split from the wrong one;
  - the Contract footer resolves each case line with `resolveServiceAmounts`
    but case lines carry no `decimalPlaces`, so a USD line is rounded to
    whole dollars (10.80 → 11) before conversion.
- **Look.** Case and Quotation share one table layout
  (`# · Service Name & Type · Description · Unit Price · VAT (%) · Total`);
  Contract has its own grid (`Service · Description · Base price · VAT ·
  Total`), its own row total cell, footer labels and a 5-column Vietnamese
  currency modal (Case: 6 columns, English). Contract also keeps ~650 lines
  of dead code (`ServiceLinesSection`, never rendered).
- **Language.** Labels are English, but warnings, toasts, the currency
  modal, combo price comparisons, field tooltips and the Guide panels are
  Vietnamese (Contract ~159 lines, Quotation ~79, Case ~11). The Contract
  Guide still documents fields removed on 2026-09-22 (Fee model, Fixed
  amount, Hourly rate, Estimated hours, Success fee).
- **Duplicate writes.** Each form writes money and content onto the other
  documents' lines and headers after saving — work the triggers already do
  (`trg_money_line_compute`, `money_line_after` → header recompute,
  `trg_money_thread_after`). Failures of those writes are retried with fewer
  fields and then only logged to the console, hiding the database's own
  reason (e.g. a billed contract).

## 2. Decisions (made with the user)

1. **Approach: edit each form in place** (no shared runtime library;
   `shared-lib/` is not used). Drift is guarded by Node tests that run every
   form's money code over the same fixtures.
2. **Case is the reference** for the look (§3).
3. **One money rule** on every form, identical to the database (§4).
4. **All UI text in English**, including system-generated names written to
   the database (§5). Existing records are not rewritten.
5. **JS writes only what the database cannot derive** (§6).
6. **Applied to the local copy `nocobase-law` only**, then handed to the
   user for manual testing (§7). Dev is not touched.

## 3. Look — Case as the reference

| Element | Standard on all three forms |
|---|---|
| Service table columns | `# · Service Name & Type · Description · Unit Price · VAT (%) · Total · (actions)` |
| Row total cell | VND total (bold); under it, small grey `Original: 10.80 USD` for a foreign line; amber `Missing rate to VND` when no rate |
| Footer (line pricing) | `Subtotal (excl. VAT)` · `VAT amount` · `Total` |
| Footer (combo pricing) | `Combo subtotal` · `VAT (%)` · `VAT amount` · `Combo total` |
| Currency button | `View currency breakdown (N currencies)` |
| Currency modal | Title `Currency breakdown`; columns `Currency · Original total · Rate to VND · Converted total · Effective date · Source`; note `Base currency: VND.`; footer strip `Converted total in VND` |
| Missing rate (footer) | `Missing exchange rate (USD → VND) — the total is not final.` |
| Combo price comparison | `Individual price: …` · `Save … (x%)` · `Discount …` / `Increase …` |

Contract keeps its CSS-grid table (rewriting ~3,000 lines into a `<table>`
is out of proportion) but gets the same columns, headers, cells and footer.
`ServiceLinesSection` and everything only it uses (`SERVICE_STATUS_LABELS`,
`serviceStatusLabel`) are deleted. Form-specific parts stay: Case task
templates, Quotation catalog comparison, Contract Payment Schedule /
Payment Triggers. Tables keep `overflowX: auto`; footers wrap on narrow
screens.

## 4. Money — the form shows what the database stores

Rule (same as `money_line_amounts`):

1. A line = `Unit Price × Qty`, VAT %, rounded to the line currency's
   decimals (USD/EUR/SGD 2, VND 0).
2. Each line is converted to VND on its own at its rate and rounded to whole
   đồng; the footer is the sum of converted lines.
3. A form never reads a stored `subTotal` / `vatAmount` / `totalAmount` as a
   line-currency amount (they are VND). Line amounts come from the inputs,
   or from `*Native` when a line has no inputs.

Rate date — the one the database uses (`money_line_rate`):

| Form | Database | Form preview |
|---|---|---|
| Quotation | quotation `createdAt` (a new one: today) | today — already right |
| Contract | contract Signed date | **Signed date** for rows, footer, currency modal and submit; changing Signed date re-renders |
| Case | a line linked to a contract / quotation line reuses that line's frozen rate; otherwise the Case Open date | a row loaded from a contract / quotation line with a frozen rate (`exchangeRateToBase` with `exchangeRateDate`, or rate ≠ 1) converts at that rate; other rows at Open date (already) |

Contract specifics: rows loaded from a Case / Quotation are resolved with
their currency's decimals; the footer resolves them from inputs
(`pricingInputsOnly` + decimals). "Total amount" stays read-only = Σ lines
for priced lines (`contractTotalFromLines`), and the Payment Schedule splits
that number. Combo (package) rows keep their current math.

## 5. Language

All UI text English: labels, buttons, warnings, errors, toasts, confirm
dialogs, tooltips (`FIELD_HELP`), Guide panels. Also the defaults written to
the database by these forms:

| Now | Becomes |
|---|---|
| `Hợp đồng - …` / `Phụ lục - …` / `Hợp đồng` | `Contract - …` / `Appendix - …` / `Contract` |
| `Báo giá bổ sung - …` / `Báo giá` | `Supplementary quotation - …` / `Quotation` |
| `Thanh toán một lần` | `One-time payment` |
| lawyer types (`Đối tác`, `Luật sư cộng sự`, …) | `Partner`, `Associate`, … |

The Guide panels (`TutorialPanel` in Contract, `QuotationTutorialPanel`) are
rewritten, not translated: short English, current fields only. `FIELD_HELP`
entries for removed fields are deleted.

Kept: `"làm mới"` / `"tải lại"` in `REFRESH_BUTTON_TEXT_VARIANTS` — match
strings used to find NocoBase's Refresh button, never displayed. Comments
are not UI.

Database messages shown by these forms are translated too:
`service_thread_sync.sql` (3) and `currency_catalog.sql` (2):

| Now | Becomes |
|---|---|
| `Dịch vụ "%" thuộc hợp đồng % đã phát sinh thanh toán — không thể sửa.` | `Service "%" belongs to contract %, which has payments — it cannot be changed.` |
| `… — không thể xoá.` | `Service "%" belongs to contract %, which has payments — it cannot be deleted.` |
| `Dịch vụ "%" có công việc đang thực hiện (%) — xử lý các task trước.` | `Service "%" has tasks in progress (%) — finish or remove them first.` |
| `Tỷ giá phải lớn hơn 0.` | `The exchange rate must be greater than 0.` |
| `Tỷ giá phải nhập theo chiều ngoại tệ → VND (…)` | `Enter exchange rates from the foreign currency to VND (VND per 1 unit).` |

Retainer period labels `Kỳ N` (generated by `finance_retainer_schedule.sql`)
become `Period N` in stage A, not here.

## 6. Writes — JS writes only what the database cannot derive

The thread sync copies **content** (`serviceId`, `serviceName`,
`serviceType`, `description`, `comboId`, `comboName`) to every linked line
always, and **pricing inputs** (`basePrice`, `quantity`, `vat`,
`currencyId`) only between lines of the same pricing class. It does not copy
`pricingMode`, `billingMode`, `financialSourceType` or `package*`. When a
write links a line to another thread, the content of that write spreads to
the whole thread. Line changes recompute their document header
(`money_line_after` → `money_touch_header`) for line pricing; package
headers are not recomputed.

| Field group | Own document's lines | A write that creates or changes a link, or edits the service at its origin | A follow-up write to a line already linked by an earlier write |
|---|---|---|---|
| Content | send | send (it must win) | **drop** |
| Pricing inputs, `pricingMode`, `billingMode`, `financialSourceType`, `package*` | send | send | send (not synced across pricing classes) |
| Line `subTotal` / `vatAmount` / `totalAmount` | **drop** | **drop** | **drop** |
| Links and status | send | send | send |

| Header write | Line pricing | Package pricing |
|---|---|---|
| Totals on another document's header | **drop the write** | keep |

Audit of the cross-document writes:

| # | Form · site | Kind | Change |
|---|---|---|---|
| C1 | Contract · `createContractServiceLine` (own lines) | own | drop line totals |
| C2 | Contract · `updateProjectServiceLineSafely` after a contract line is created with `projectServiceId` | follow-up | drop content + line totals; keep links, status, pricing, currency |
| C3 | Contract · `quotationServices:update` after a contract line is created with `quotationServiceId` | follow-up | drop content + line totals |
| C4 | Contract · `syncQuotationHeaderFromServices` | header | call only for a package quotation |
| C5 | Contract · `projects:update {contractId}` | link | keep |
| C6 | Contract · `ServiceLinesSection.handleSave` | dead | deleted |
| K1 | Case · `requestContractService` create / update | origin | drop line totals |
| K2 | Case · `createProjectService` (both branches) | own | drop line totals |
| K3 | Case · `contractServices:update {projectServiceId}` | link | keep |
| K4 | Case · `updateContractHeaderSafely` (line pricing) | header | drop the call |
| K5 | Case · `quotationServices:update` / `:create` | origin | drop line totals |
| K6 | Case · quotation header `quotations:update` (line pricing) | header | drop the call |
| Q1 | Quotation · own `quotationServices:create` | own | drop line totals |
| Q2 | Quotation · `projectServices:update` with `quotationServiceId` | link | keep content; drop line totals |
| Q3 | Quotation · `contractServices:update` loop after Q2 | follow-up | drop content + line totals |
| Q4 | Quotation · `localSyncContractHeaderFromServices` / `contracts:update` totals | header | line pricing: return early; retainer and package keep the sync (the triggers skip both) |
| Q5 | Quotation · `projects:update` (quotationId, currency, totals) | link + header | keep `quotationId` / currency; drop totals |
| Q6 | Quotation · `projectServices:update {serviceId}` backfill | own link | keep |

Errors: a failed cross-document write shows `message.warning(apiErrorText(error, …))`
with the database's reason instead of only `console.warn`. The existing
"retry with fewer fields" fallbacks stay (they cover instances with missing
relation fields) but report the **first** error when every attempt fails.
`apiErrorText` is the helper already in the service tables
(`errors[0].message`).

Payload builders for C2, C3, Q3 and the dropped line totals become pure
helpers between markers (`// ---- cross-document payload helpers …`) so a
test can prove no content or line-total key leaks into a follow-up write.

## 7. Applying to the local copy and hand-over

1. Back up the `flowModels` rows to be written and the trigger functions to
   be replaced (`pg_dump` / `SELECT` into a `.sql` file in the session
   scratchpad, outside the repo).
2. SQL: apply `service_thread_sync.sql` and `currency_catalog.sql` (English
   messages) to `nocobase-law` after the SQL suite (`run-local.sh`) passes.
3. JS: a Node script writes each form's repo file into
   `options.stepParams.jsSettings.runJs.code` of every **attached** copy of
   that form (found by `const <Form> = () =>`; attached = parent chain
   reaches a root with no missing parent). On 2026-09-30: Contract 2, Case
   14, Quotation 27; 8 orphan Quotation copies are listed, not written. The
   script prints uid and code length before / after.
4. Field registrations not yet run on local: `RegisterMoneyFlowFields.js`,
   `RegisterServiceThreadFields.js`, `RegisterCompanyServiceCurrency.js` —
   run in the browser (Playwright) if the local app is up on :13000,
   otherwise by the user in the console.
5. The user restarts `yarn dev` and reloads.

Automated checks before hand-over: all Node tests in `scripts/tests` green,
`parse-blocks.js` and `tdz-check.js` clean, SQL suite green.

Manual test list for the user:

| # | Form | Scenario | Expected |
|---|---|---|---|
| 1 | Quotation | a VND line + a 10 USD line, VAT 8% | USD row shows VND and `Original: 10.80 USD`; footer = saved totals |
| 2 | Contract | from a Case with a USD line (the reported case) | footer 18,261,765 / 1,460,941 / 19,722,706 at the same rate |
| 3 | Contract | Signed date moved to a day with another rate | rows, footer, modal follow the Signed date; after save the DB matches the screen |
| 4 | Contract | By Case, Multiple payments 30/70 | installments split from the footer total |
| 5 | Case | USD line, Open date; and a line from a contract | matches the saved `projectServices` (the contract line's rate for the second) |
| 6 | all | a currency with no rate | `Missing rate to VND`, no wrong total |
| 7 | all | combo pricing | English combo labels and comparison |
| 8 | Contract | created from a Case / Quotation | no duplicate `serviceChangeLogs` rows; case / quotation lines in sync |
| 9 | any | edit a service of a billed contract | the English database message |
| 10 | all | Guide panel and tooltips | English only, no removed fields |

## 8. Tests

- `scripts/tests/fixtures/money-cases.json` run through each form's line
  math and conversion (Case `calcLineAmounts` + `convertLinesToBase`,
  Quotation's equivalent, Contract `resolveServiceAmounts` +
  `convertLinesToBase`) — the SQL suite runs the same fixture.
- Contract: a case line from the API (no `decimalPlaces`) resolves to 10 /
  0.80 / 10.80 USD; the footer converts at the Signed-date rate.
- Case: a row from a contract line with a frozen rate converts at that rate.
- Language: no Vietnamese letters in string literals outside comments, except
  the two refresh match strings.
- Cross-document payload helpers: follow-up payloads carry no content and no
  line totals; link payloads keep their links.
- Existing suite (`catalog-vnd-display`, `contract-native-amounts`,
  `money-*`, `service-*`, `static-checks`, …) stays green; tests asserting
  old Vietnamese strings are updated.

## 9. Out of scope

Stages B and A; `shared-lib/`; rewriting existing records' names or labels;
the dev instance; the billed-contract decisions still pending (303/304/305,
264, 265/267, 269, CT02062026 / CT35092026).
