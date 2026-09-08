# Contract Billing Plans — Architecture Redesign

Date: 2026-09-08
Status: Approved by user, ready for implementation planning
Supersedes: [2026-09-07-retainer-billing-automation-design.md](2026-09-07-retainer-billing-automation-design.md)'s §5 (Schema) and §6.1 (Trigger) — the automation *mechanism* (DateFieldScheduleTrigger, stop conditions, per-period amount formula) is unchanged and carries over; only *where the data lives* changes.

## 1. Overview

The 2026-09-07 spec shipped Retainer billing automation directly on `contracts`: two new columns (`nextRetainerBillingDate`, `retainerPeriodsBilled`) alongside the pre-existing `retainerDuration` column and a `paymentSchedule.retainerRule` JSON sub-object holding the rest (`unit`, `enabled`, `nextPaymentDate`, `displayText`). The first real contract created through the actual UI after that automation went live (`contracts.id = 225`) surfaced three problems at once:

1. **A second dead column**, `retainerPeriod` (distinct from `retainerRepeatUnit`/`paymentSchedule.retainerRule.unit`, which is the one actually used) — hardcoded to `null` on every submit (`ContractCreateForm.js:11484`), exactly like the already-known-dead `monthlyFee` (`:11472`). Two columns claiming to mean "the retainer's repeat unit," only one ever populated.
2. **Split storage caused a real, visible inconsistency.** The "Retainer rule: Every 3 months" text in `ContractPaymentScheduleDetailBlock.js` reads a value cached inside `paymentSchedule.retainerRule` at contract-save time (and, on this particular contract, is showing a pre-existing display bug from a stale-deployed JS Block — a separate, already-diagnosed issue). Meanwhile `nextRetainerBillingDate` — the column the *live automation* actually reads and writes — is a completely independent value that the display panel has no knowledge of at all. Once automation has advanced a contract past its first cycle, these two numbers necessarily diverge, and nothing reconciles them.
3. **The retainer-logic duplication this session already paid for twice** (`retainerRule.interval` bug, `resolveRetainerNextPaymentDate` staleness bug — both fixed independently in `ContractCreateForm.js`, `ContractPaymentScheduleDetailBlock.js`, and `PaymentRequestCreateBlock.js`) is structural, not incidental: as long as retainer state is split across real columns and a JSON blob with three independent readers, every future fix risks the same 3x-repeat/miss pattern.

This spec introduces `contractBillingPlans`, a new collection that owns "how this contract bills over time" as a single, coherent record — ending the column/JSON split, giving Retainer exactly one source of truth, and reserving room (via a `planType` discriminator) for By-case/milestone billing to move in later without another schema migration.

This is sub-project 1 of a 4-part decomposition of the user's broader "redesign the whole Contract-Finance architecture" request:
1. **Retainer billing — data model, shared logic, UI consistency** (this spec)
2. By-case (fixed-fee/milestone) — same audit treatment
3. Combo/package pricing — integration review
4. Invoice/Payment chain — consistency audit given Retainer's new automated entry point into `paymentRequests`

Only (1) is in scope here. (2)-(4) are explicitly future work.

## 2. Goals

- Every piece of a Retainer contract's billing state (unit, total cycles, cycles billed, next billing date, start/end date, total amount) lives in exactly one place — no column/JSON split, no field that can silently disagree with another field meaning the same thing.
- Confirmed-dead columns removed from `contracts`: `retainerPeriod`, `monthlyFee`, `includedHours`, `overageHourlyRate`.
- `contracts.contractType` removed — a contract's type (Retainer/By-case) is derived from its active billing plan's `planType`, never stored twice. (Confirmed with the user: `contractType` is not used anywhere outside billing display/schedule logic.)
- The "Next payment" UI display and the live automation state can never visibly disagree again, because both read the same field on the same record.
- Retainer calculation logic (`calcRetainerNextPaymentDate`, `retainerDurationSuffix`, next-payment resolution) exists in exactly one file, loaded by all three consumer blocks — extending this project's existing `shared-lib` pattern (already proven with `CaseDashboard.js`) rather than inventing a new one.
- The new collection and its fields are created via script, not manually through the Admin UI field editor — faster to stand up, and reviewable as code like every other schema change this session.
- Ships as an idempotent SQL migration + idempotent collection-creation script, matching this project's established convention.

## 3. Non-goals

- **By-case/milestone billing itself.** `contractBillingPlans.planType` reserves `'milestone'` and `'fixed_onetime'` as future values; this spec implements `'retainer'` only. By-case contracts keep using today's `paymentSchedule` JSON path (`ContractPaymentScheduleDetailBlock.js`'s `contract_balance` fallback, etc.), untouched.
- **Combo/package pricing integration** (`getComboHeaderPriceComparison` and friends in `ContractCreateForm.js`) — not read or touched by this spec at all.
- **Invoice/Payment chain audit** — the existing `trg_payment_recompute_contract` → `trg_contract_cascade_case_status` chain (prior spec) is consumed as-is; this spec only changes what creates rows in `paymentRequests`, not what happens after.
- **Open-ended Retainer automation** (`retainerTotalCycles` left blank). Restated from the prior spec, unchanged by this redesign: there is still no per-period amount derivable without a cycle count to divide `totalAmount` by. `contract_billing_plan_init_retainer_state()` (§6.2) explicitly keeps `nextBillingDate = NULL` for these plans, so they never enter the Workflow at all — not a regression, the same manual-only posture as before, just enforced on the new collection instead of the old one.
- **Multiple simultaneously-active billing plans per contract.** The schema's `contractId` relation is `hasMany` (one contract *can* have multiple plan rows over time — e.g. a cancelled plan replaced by a new one), but this spec's application logic only ever creates and reads exactly one `status='active'` plan per contract. Enforcing "at most one active plan" is a create-time application check, not a database constraint — a DB-level partial-unique-index would be over-engineering for a scenario with no current business need (no contract amendment/re-negotiation flow exists yet to actually produce a second plan).
- **Fixing the stale-deployed JS Block on dev/localhost.** Separate, purely operational step (paste updated file into the Admin UI's JS Block editor) — tracked as a prerequisite for testing this spec's UI changes, not part of the architecture itself.
- **Removing the Hourly fee model** (`hourlyRate`/`estimatedHours`/`Fee Model` UI). The user has previously noted the business doesn't use hourly billing, but that's a separate Fee-Model-axis decision from this spec's Retainer/By-case timing-axis scope — only the two *always-null, never-wired* columns (`includedHours`, `overageHourlyRate`) are removed here, not the Hourly model itself.

## 4. Schema: `contractBillingPlans` (new collection)

| Field | Type | Notes |
|---|---|---|
| `id` | auto | |
| `contractId` | belongsTo → `contracts` | required |
| `planType` | string (enum) | `'retainer'` \| `'milestone'` \| `'fixed_onetime'` — only `'retainer'` implemented/written by this spec; the other two are reserved values for sub-project 2, never written here |
| `status` | string (enum) | `'active'` \| `'completed'` \| `'cancelled'` — explicit lifecycle instead of inferring "done" from `nextBillingDate IS NULL` |
| `totalAmount` | numeric | total value this plan bills against |
| `currencyId` | integer, nullable | mirrors `contracts.currencyId` pattern |
| `currency` | string, nullable | mirrors `contracts.currency` pattern |
| `startDate` | date | replaces `paymentSchedule.firstPaymentDate`; generic name (not retainer-specific) so future plan types reuse it |
| `endDate` | date, nullable | optional hard stop |
| `retainerUnit` | string (enum), nullable | `'day'` \| `'week'` \| `'month'` \| `'quarter'` \| `'year'` — populated only when `planType='retainer'`. Replaces **both** `contracts.retainerRepeatUnit` (form-local var) and the dead `contracts.retainerPeriod` column with one field. |
| `retainerTotalCycles` | integer, nullable | replaces `contracts.retainerDuration`; `null` = open-ended |
| `retainerCyclesBilled` | integer, default 0 | replaces `contracts.retainerPeriodsBilled` |
| `nextBillingDate` | date, nullable | replaces `contracts.nextRetainerBillingDate`; the field the Schedule trigger watches |
| `createdAt` / `updatedAt` | auto | |

No column is added for "amount per period" — same reasoning as the prior spec: it is a pure function (`totalAmount ÷ retainerTotalCycles`), computed on demand, never stored, so it can never drift from `totalAmount`.

## 5. Schema changes: `contracts`

**Removed** (no longer written by `ContractCreateForm.js`, dropped from the table):
- `retainerPeriod` — confirmed dead (`null` on every submit, `ContractCreateForm.js:11484`).
- `monthlyFee` — confirmed dead (`null` on every submit, `:11472`), documented in the prior spec's §1.
- `includedHours`, `overageHourlyRate` — confirmed dead (`null` on every submit regardless of Fee Model, `:11488-11489`).
- `retainerDuration`, `nextRetainerBillingDate`, `retainerPeriodsBilled` — migrate to `contractBillingPlans` (§4).
- `contractType` — derived from the active plan's `planType` going forward; confirmed with the user this column has no use outside billing/schedule display.

**Unchanged, boundaries clarified** (not touched by this spec, documented here so the next reader doesn't re-diagnose the same "overlap" that turned out not to be one):
- `Fee Model` (Fixed/Hourly/Success) — an independent axis ("how was the total amount determined"), orthogonal to billing timing. Out of scope.
- `Billing Cycle` (`one_time`/`multiple_payments`) — meaningful only for non-Retainer contracts; for Retainer, `paymentSchedule.mode` is unconditionally forced to `"recurring"` regardless of this field's value, so showing/editing it on a Retainer contract is misleading (this is what produced "Billing Cycle: multiple_payments" on contract 225). **UI change** (not a schema change): hide the Billing Cycle field on `ContractCreateForm.js` when the selected plan type is Retainer.
- `paymentSchedule` (JSON column) — stays; still used for By-case `installments`/multiple-payment rows. Only its `retainerRule` sub-key stops being written for new contracts.

## 6. Mechanism

### 6.1 Collection creation (scripted, not manual UI)

Verified against Nocobase's own test suite (`packages/plugins/@nocobase/plugin-data-source-main/src/server/__tests__/http-api/collections.test.ts`), not guessed: a single `collections:create` call accepts the collection's own options **and** its full `fields` array — including relation fields (`belongsTo`/`hasMany`/`belongsToMany`) — in one request:

```js
await ctx.api.request({
  url: "collections:create",
  method: "POST",
  data: {
    name: "contractBillingPlans",
    fields: [
      { name: "contract", type: "belongsTo", target: "contracts", foreignKey: "contractId" },
      { name: "planType", type: "string", ... },
      // ...every field from §4 in one payload
    ],
  },
});
```

This is faster than this session's earlier `RegisterXxxFields.js` pattern (which added fields one at a time to an *already-existing* collection) because the collection doesn't exist yet — everything is created together. The actual script is written in the implementation plan, following this project's idempotent/skip-if-exists convention (check `collections:list` first).

### 6.2 SQL trigger (moved, and simplified by the move)

`contract_init_retainer_billing_state()` (prior spec) moves from firing on `contracts` to firing on `contractBillingPlans`. It gets **simpler**, not just relocated: the prior version had to reach into JSON (`NEW."paymentSchedule" -> 'retainerRule' ->> 'enabled'`); the new version reads real typed columns directly (`NEW."retainerTotalCycles"`, `NEW."startDate"`), because there's no JSON to parse anymore.

```sql
CREATE OR REPLACE FUNCTION public.contract_billing_plan_init_retainer_state()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  -- Open-ended retainers (no retainerTotalCycles) stay out of automation —
  -- unchanged from the prior spec's Non-goals: periodAmount is defined as
  -- totalAmount ÷ retainerTotalCycles, which is undefined (NULL) with no
  -- cycle count to divide by. Letting this row schedule anyway would let
  -- the Workflow's Calculation node silently divide by NULL (mathjs turns
  -- NaN/Infinity results into `null`, per its own wrapper — see
  -- packages/core/evaluators/src/utils/mathjs.ts) and create a
  -- paymentRequests row with requestedAmount = NULL. This guard is the
  -- only thing preventing that.
  IF NEW."planType" <> 'retainer' OR NEW."retainerTotalCycles" IS NULL THEN
    NEW."nextBillingDate" := NULL;
    RETURN NEW;
  END IF;

  IF COALESCE(NEW."retainerCyclesBilled", 0) = 0 THEN
    NEW."nextBillingDate" := NEW."startDate";
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contract_billing_plan_init_retainer_state ON "contractBillingPlans";
CREATE TRIGGER trg_contract_billing_plan_init_retainer_state
  BEFORE INSERT OR UPDATE OF "retainerTotalCycles", "startDate", "planType" ON "contractBillingPlans"
  FOR EACH ROW
  EXECUTE FUNCTION public.contract_billing_plan_init_retainer_state();
```

The `planType <> 'retainer'` half of the guard is defensive (in practice every row in this collection is retainer-only until sub-project 2 adds other plan types that write here too) — the `retainerTotalCycles IS NULL` half is the one doing real work today, and is load-bearing: it is what keeps this spec's posture on open-ended retainers identical to the prior spec's (§3 Non-goals, restated below).

### 6.3 Workflow (re-pointed at the new collection)

`CreateRetainerBillingWorkflow.js`'s trigger config changes:

```js
config: {
  mode: 1,
  collection: "contractBillingPlans",   // was "contracts"
  startsOn: { field: "nextBillingDate" }, // was "nextRetainerBillingDate"
  appends: ["contract"],                  // new — see below
},
```

`$context.data` is now the **plan** row, not the **contract** row. This changes which fields are direct vs. relation-traversed:

- **Now direct on `$context.data`** (were previously reached via the contract): `totalAmount`, `retainerTotalCycles` (was `retainerDuration`), `retainerCyclesBilled` (was `retainerPeriodsBilled`), `retainerUnit` (was `paymentSchedule.retainerRule.unit`), `nextBillingDate`, `endDate`. The Calculation/dateCalculation node expressions actually get *shorter* — e.g. `{{$context.data.totalAmount}} / {{$context.data.retainerTotalCycles}}` instead of the old `{{$context.data.totalAmount}} / {{$context.data.retainerDuration}}` (same shape, just no JSON path).
- **Now reached via `$context.data.contract.*`** (needs the new `appends: ["contract"]`): `contractCode`, `contractName`, `customerId`, `internalCompanyId` — these live on `contracts`, not on the plan, and are only needed for the `Create payment request` node's `title`/`contractId`/`customerId`/`internalCompanyId` fields. `contractId` on the created `paymentRequests` row becomes `{{$context.data.contract.id}}` (or equivalently `{{$context.data.contractId}}`, the plan's own FK column — either resolves to the same value; the FK column is simpler and doesn't need the `appends` at all for that one field).
- The two Update nodes (`updateStop`/`updateContinue`) target `contractBillingPlans` now, not `contracts` — `filterByTk: "{{$context.data.id}}"` still means "this record," just a plan record instead of a contract record.

Node graph shape (Calculation → Calculation → Create → dateCalculation ×3 → Condition → Update ×2) is otherwise identical to the already-verified 2026-09-07 design — the same mathjs `or`/`and`-not-`||`/`&&` fix and epoch-seconds date-comparison fix from this session's Task 6 debugging still apply unchanged, since that was about mathjs itself, not about which collection the trigger watches.

### 6.4 Migration for existing rows

Given there are few or no real Retainer contracts today, a single idempotent backfill: for every `contracts` row with `contractType = 'retainer'` (or, after this ships, any row whose `paymentSchedule.retainerRule.enabled = true` — covering rows saved by not-yet-redeployed JS Block code), create one corresponding `contractBillingPlans` row from its current `retainerDuration`/`nextRetainerBillingDate`/`retainerPeriodsBilled`/`paymentSchedule.retainerRule.unit`/`paymentSchedule.firstPaymentDate`/`totalAmount`/`endDate`, with `status='active'`. Runs once; safe to re-run (skips contracts that already have a plan).

**Ordering constraint, load-bearing for the implementation plan's task order:** this backfill reads the very `contracts` columns §5 removes (`retainerDuration`, `nextRetainerBillingDate`, `contractType`, etc.) — it must run, and be verified, **before** those columns are dropped. §10 (Rollback) already establishes this as two separate migrations for exactly this reason; the plan must sequence §6.1-§6.4 (create collection, migrate, verify) as earlier tasks and the `contracts` column drops (§5) as a distinctly later task, not bundle them into one SQL file the way the prior spec's single-file migrations did.

## 7. Shared-lib extraction

New file `shared-lib/law-billing.js` (separate from `law-shared.js` — this is domain/business logic, not a generic formatting utility like `fmtVND`), following the exact versioned-URL deploy pattern already established and proven with `CaseDashboard.js` (see `shared-lib/README.md`).

Moves in:
- `calcRetainerNextPaymentDate(startDate, interval, unit)` — unchanged signature, now defined once.
- `retainerDurationSuffix(unit, count)` — unchanged, now defined once.
- A new `resolveActiveBillingPlanDisplay(plan)` replacing the old `resolveRetainerNextPaymentDate` — reads `plan.nextBillingDate`/`plan.retainerCyclesBilled`/`plan.retainerTotalCycles` **directly** (no recomputation, no "always +1 unit from start" approximation) once a plan exists, since the plan's own `nextBillingDate` *is* the live, correct answer by construction. Only falls back to computing "would-be first cycle" from `startDate`/`retainerUnit` for a plan that hasn't been initialized yet (`retainerCyclesBilled = 0` and `nextBillingDate` already equals `startDate` — same value either way, so this is a display nicety, not a divergent code path).

All three consumers (`ContractCreateForm.js`, `ContractPaymentScheduleDetailBlock.js`, `PaymentRequestCreateBlock.js`) load this the same way `CaseDashboard.js` already does: `const Shared = await ctx.importAsync(SHARED_LIB_URL); const { calcRetainerNextPaymentDate, retainerDurationSuffix, resolveActiveBillingPlanDisplay } = Shared;` — one fix, applied everywhere, by construction.

## 8. UI changes

- **`ContractCreateForm.js`**: on submit, when the selected type is Retainer, create the `contracts` row and its `contractBillingPlans` row together — Nocobase supports nested-create through a `hasMany` relation in a single `contracts:create` call (`{ ...contractFields, billingPlans: [{ planType: 'retainer', ... }] }`), so this doesn't need two sequential API calls. Verified against `packages/core/database/src/__tests__/update-associations.test.ts`'s `hasMany` describe block (`User.repository.create({ values: { name: 'u1', posts: [{ name: 'u1t1' }] } })`) — real test code, not assumed from general Sequelize/NocoBase familiarity. The `Retainer duration`/`Retainer repeat` inputs now write directly into the nested plan payload instead of into `paymentSchedule.retainerRule`. Billing Cycle field hidden when type is Retainer (§5).
- **`ContractPaymentScheduleDetailBlock.js`**: `RetainerRule` component now takes the plan record (via `appends: ["billingPlans"]` on the contract fetch) instead of `schedule.retainerRule`, and renders `resolveActiveBillingPlanDisplay(plan)` — "Next payment" is now *always* the same value as `contractBillingPlans.nextBillingDate`, because it's the same read, not a parallel computation.
- **`PaymentRequestCreateBlock.js`**: same relation-based read instead of parsing `paymentSchedule.retainerRule`, for whatever retainer-aware logic it still needs (e.g. showing the current plan's status when building a manual payment request for a Retainer contract).

## 9. Testing / verification plan

1. Run the collection-creation script → confirm `contractBillingPlans` exists with all §4 fields via `collections:list`/`fields:list`.
2. Apply the SQL migration (§6.2) → confirm the trigger fires correctly: insert a test plan row (`planType='retainer'`, `retainerTotalCycles=6`, `startDate` set) → confirm `nextBillingDate = startDate`, `retainerCyclesBilled = 0`.
3. Re-run `CreateRetainerBillingWorkflow.js` (updated per §6.3) → confirm it deletes any old `contracts`-pointed workflow and rebuilds against `contractBillingPlans`.
4. Repeat the exact Task 6 verification this session already did (cycle-count stop + endDate-independent stop), this time against a `contractBillingPlans` test row instead of a `contracts` test row — same expected numbers, same mechanism, different table.
5. Run the migration backfill (§6.4) against any existing retainer `contracts` rows (including `id=225` from this session) → confirm each gets exactly one `contractBillingPlans` row with values matching its current `retainerDuration`/`nextRetainerBillingDate`/etc.
6. Deploy the updated `ContractCreateForm.js`/`ContractPaymentScheduleDetailBlock.js`/`PaymentRequestCreateBlock.js` + `shared-lib/law-billing.js` to dev/staging (manual paste, per this project's CLAUDE.md deploy step) → create a fresh real Retainer contract through the UI → confirm the nested plan row is created correctly, and that "Next payment" on the detail panel exactly matches `contractBillingPlans.nextBillingDate` in the database, both before and after the automation has run at least one cycle (the specific staleness this spec exists to fix).
7. Confirm the removed `contracts` columns (§5) are actually gone and nothing in any of the (many) other `All Module/Contract/*.js` / `All Module/Payment/*.js` files still references them (grep for `retainerPeriod`, `monthlyFee`, `includedHours`, `overageHourlyRate`, `retainerDuration`, `nextRetainerBillingDate`, `retainerPeriodsBilled`, `contractType` across the repo before dropping the columns, not just the 3 files this spec explicitly touches).
8. Re-run both the SQL migration and the collection-creation script a second time → no errors, no duplicate collection/trigger, no reset of an in-progress plan's `retainerCyclesBilled`.

## 10. Rollback

Same additive-first posture as the prior spec, with one added wrinkle since this spec *removes* columns: the `contracts` column drops (§5) are the only non-trivially-reversible part. Mitigate by not dropping them in the same migration run that creates `contractBillingPlans` — apply the new collection + migration + automation first, verify end-to-end (§9), and only drop the old `contracts` columns in a **separate**, later migration once the new path is confirmed working in production. If something is wrong with `contractBillingPlans` before that final drop, rollback is: disable/delete the new Workflow, `DROP TRIGGER`/`DROP FUNCTION` for §6.2, `DROP TABLE "contractBillingPlans"` — the old `contracts` columns are still sitting there untouched, so the 2026-09-07 automation still works exactly as it did before this spec.

## Appendix: research notes

- Collection-creation API (`collections:create` with embedded `fields`, including relations, in one call) verified against `packages/plugins/@nocobase/plugin-data-source-main/src/server/__tests__/http-api/collections.test.ts` in the `nocobase` reference repo — real test code, not documentation or guesswork.
- All Workflow node `type`/`config` shapes (schedule/calculation/dateCalculation/condition/create/update) and the mathjs operator/comparison fixes referenced in §6.3 are unchanged from what this session already verified end-to-end for the 2026-09-07 spec's Task 6 (see that plan's Task 6 section and `JsField/CreateRetainerBillingWorkflow.js`'s own header comment for the full citation trail) — not re-derived here.
