# Generic Search/Filter Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `JsField/GenericSearchFilter.js`, a single self-contained Nocobase JS block that implements a CONFIG-driven search/filter engine (status, relation dropdown, free-text search, date range, current-user scope) reusable across modules by editing only the `CONFIG` object.

**Architecture:** One file, two zones — a `CONFIG` object at the top (the only thing a deployer edits) and an "engine" below it, built bottom-up from pure/testable helper functions (id normalization, filter-builders) up to ctx-dependent hooks (data fetching, current-user resolution) up to a presentational `FilterControl` component and the top-level `GenericSearchFilter` component that wires everything together and calls `ctx.render(...)`.

**Tech Stack:** Plain JS (`React.createElement`, no JSX — see Global Constraints), `ctx.antd` (`Select`, `Input`, `Typography`), Nocobase `ctx.api.request` / `ctx.engine.getModel(...).resource.addFilterGroup(...)`.

## Global Constraints

- **Single file, no imports.** Per project memory (`nocobase-single-file-constraint`), this Nocobase JS block must be entirely self-contained in `JsField/GenericSearchFilter.js`. No `require`/`import`, no splitting into helper files. All tasks below append to this one file.
- **No JSX.** Use `React.createElement` throughout (matching `All Module/*/CreateForm.js` files), NOT JSX (unlike `JsField/JsStatusFilter.js`/`JsField/JsProjectFilter.js` which use JSX). This keeps `node --check <file>` usable as a syntax verification step without a JSX transform toolchain — there is no test framework in this repo (confirmed: `package.json` has no jest/mocha/vitest), so `node --check` plus standalone logic scripts are the only available automated verification.
- **Follow established API shapes exactly.** `ctx.api.request({ url, params: { pageSize, filter: JSON.stringify(filterObj), ... } })` and `ctx.engine?.getModel(uid).resource.addFilterGroup(key, filter)` + `.refresh()` — copied from `JsField/JsStatusFilter.js` and `JsField/JsProjectFilter.js`, do not invent a different calling convention.
- **Git identity is not configured in this environment** (`git commit` fails with "Author identity unknown"). Do NOT run `git config` to fix this — that is a user decision. If a commit step fails for this reason, skip it, leave the change staged, and note it; do not treat it as a task failure.
- **Verification ceiling:** there is no real Nocobase runtime available in this session. Pure helper functions (no `ctx` access) get real logic verification via standalone Node scripts in the scratchpad directory (`C:\Users\Viet\AppData\Local\Temp\claude\c--Users-Viet-Desktop-components-law\4f594901-e51d-4512-8380-1bc328b54a10\scratchpad`). Everything that touches `ctx`/`antd`/React rendering can only be verified via `node --check` (syntax) plus manual code review against the spec — this is called out per-task, not glossed over.

---

## Task 1: Scaffold file, CONFIG, and pure id/key helpers

**Files:**
- Create: `JsField/GenericSearchFilter.js`
- Test (scratchpad, not committed): `<scratchpad>/test-task1-id-helpers.js`

**Interfaces:**
- Produces: `CONFIG` (object, shape per spec §"Schema CONFIG"), `extractId(value)`, `normalizeFilterId(value)`, `uniqueFilterIds(values)`, `isEmptyFilter(filter)`, `combineFilters(...filters)`, `getNoRecordFilter()`, `getFilterKey(filterDef)`, `getScopeFilterKey()`, `getCurrentUserFromCtx()`, `getResponseRecord(res)`. All later tasks call these by these exact names.

- [ ] **Step 1: Write the file scaffold with CONFIG and pure id/key helpers**

Create `JsField/GenericSearchFilter.js`:

```js
/**
 * Generic Search/Filter block (Nocobase JS Field/Action block).
 *
 * HOW TO USE THIS FILE:
 * 1. Copy this entire file into a new JS Field/Action block in Nocobase,
 *    attached to the page of the module you want to filter.
 * 2. Edit ONLY the CONFIG object below — set targetBlockUid, tableName, and
 *    the `filters` array for that module.
 * 3. Do not edit anything below the "ENGINE" marker. It is identical across
 *    every module deployment.
 *
 * Supported filter types (set via `filters[].type`):
 *   - 'status'    : buttons/select over an enum field, with per-option counts
 *   - 'relation'  : dropdown sourced from another collection (company, user...)
 *   - 'search'    : free-text search across one or more fields ($iLike)
 *   - 'dateRange' : from/to date range on one field
 *
 * See docs/superpowers/specs/2026-07-08-generic-search-filter-design.md for
 * the full design.
 */

// ===================================================================
// CONFIG — EDIT THIS SECTION PER MODULE. Nothing below this needs editing.
// ===================================================================
const CONFIG = {
  targetBlockUid: '',   // UID of the table/kanban/list block to filter
  tableName: '',          // collection name, e.g. "cases", "contracts"
  extraFilter: {},        // always-applied filter (optional), e.g. {}

  // Example filters array (replace with real config for the target module):
  // filters: [
  //   {
  //     type: 'status',
  //     key: 'status',
  //     field: 'status',
  //     label: 'Trạng thái',
  //     options: [
  //       { value: 'toDo', label: 'Chưa làm' },
  //       { value: 'inProgress', label: 'Đang làm' },
  //       { value: 'done', label: 'Hoàn thành' },
  //     ],
  //     showCounts: true,
  //   },
  //   {
  //     type: 'relation',
  //     key: 'company',
  //     field: 'internalCompanyId',
  //     label: 'Công ty',
  //     placeholder: 'Tất cả',
  //     width: 180,
  //     source: {
  //       collection: 'internalCompany',
  //       labelFields: ['shortName', 'name'],
  //       excludeValues: [],
  //       sort: 'createdAt',
  //     },
  //   },
  //   {
  //     type: 'search',
  //     key: 'search',
  //     label: 'Tìm kiếm',
  //     fields: ['title', 'code', 'description'],
  //     placeholder: 'Tìm theo tên, mã...',
  //   },
  //   {
  //     type: 'dateRange',
  //     key: 'signedDate',
  //     field: 'signedDate',
  //     label: 'Ngày ký',
  //   },
  // ],
  filters: [],

  currentUserScope: {
    enable: false,
    userFields: ['createdById'],
    emptyWhenUnknown: true,
    validateFields: true,
  },
};

// ===================================================================
// ENGINE — KHÔNG SỬA BÊN DƯỚI DÒNG NÀY
// ===================================================================

// ---- id / filter-key helpers (pure, no ctx access) ----
const extractId = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? value._id ?? null;
  return value;
};

const normalizeFilterId = (value) => {
  const id = extractId(value);
  if (id === null || id === undefined || id === '') return null;
  const numeric = Number(id);
  return Number.isFinite(numeric) && String(numeric) === String(id) ? numeric : id;
};

const uniqueFilterIds = (values) => Array.from(new Set(
  (values || []).map(normalizeFilterId).filter((v) => v !== null && v !== undefined).map(String),
)).map((value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && String(numeric) === value ? numeric : value;
});

const isEmptyFilter = (filter) => !filter || Object.keys(filter).length === 0;

const combineFilters = (...filters) => {
  const active = filters.filter((f) => !isEmptyFilter(f));
  if (active.length === 0) return {};
  if (active.length === 1) return active[0];
  return { $and: active };
};

const getNoRecordFilter = () => ({ id: { $eq: -1 } });

const getFilterKey = (filterDef) => `${CONFIG.tableName}-${filterDef.key}-filter`;
const getScopeFilterKey = () => `${CONFIG.tableName}-current-user-scope-filter`;

// ---- ctx-dependent identity helpers (not unit-testable without a real ctx) ----
const getCurrentUserFromCtx = () => {
  try {
    return ctx.currentUser
      || ctx.user
      || ctx.state?.currentUser
      || ctx.app?.currentUser
      || ctx.store?.getState?.()?.currentUser
      || null;
  } catch {
    return null;
  }
};

const getResponseRecord = (res) => {
  const data = res?.data?.data || res?.data || res;
  return data?.user || data || null;
};
```

Note: `getCurrentUserFromCtx`/`getResponseRecord` reference the global `ctx`
which only exists inside the Nocobase runtime — this is expected and matches
`JsField/JsStatusFilter.js`.

- [ ] **Step 2: Write the pure-logic test script**

Create `<scratchpad>/test-task1-id-helpers.js` (adjust the path to your
actual scratchpad directory):

```js
const assert = require('assert');
const fs = require('fs');

// Extract just the pure helpers (everything before the ctx-dependent
// section) by reading the real file and eval-ing only that slice — this
// avoids re-typing the implementation in the test and avoids the ctx
// reference crashing the script.
const src = fs.readFileSync('JsField/GenericSearchFilter.js', 'utf8');
const marker = '// ---- ctx-dependent identity helpers';
const pureSrc = src.slice(0, src.indexOf(marker));
eval(pureSrc);

// extractId
assert.strictEqual(extractId(null), null);
assert.strictEqual(extractId(5), 5);
assert.strictEqual(extractId({ id: 7 }), 7);
assert.strictEqual(extractId({ value: 9 }), 9);

// normalizeFilterId
assert.strictEqual(normalizeFilterId('12'), 12);
assert.strictEqual(normalizeFilterId({ id: '34' }), 34);
assert.strictEqual(normalizeFilterId(''), null);
assert.strictEqual(normalizeFilterId(null), null);
assert.strictEqual(normalizeFilterId('abc-not-numeric'), 'abc-not-numeric');

// uniqueFilterIds
assert.deepStrictEqual(uniqueFilterIds([1, '1', 2, null, '']), [1, 2]);

// isEmptyFilter
assert.strictEqual(isEmptyFilter({}), true);
assert.strictEqual(isEmptyFilter(null), true);
assert.strictEqual(isEmptyFilter({ a: 1 }), false);

// combineFilters
assert.deepStrictEqual(combineFilters({}, {}), {});
assert.deepStrictEqual(combineFilters({ a: 1 }, {}), { a: 1 });
assert.deepStrictEqual(combineFilters({ a: 1 }, { b: 2 }), { $and: [{ a: 1 }, { b: 2 }] });

// getNoRecordFilter
assert.deepStrictEqual(getNoRecordFilter(), { id: { $eq: -1 } });

// getFilterKey / getScopeFilterKey
CONFIG.tableName = 'cases';
assert.strictEqual(getFilterKey({ key: 'status' }), 'cases-status-filter');
assert.strictEqual(getScopeFilterKey(), 'cases-current-user-scope-filter');

console.log('OK: task1 id/key helpers');
```

- [ ] **Step 3: Run the test script**

Run: `node "<scratchpad>/test-task1-id-helpers.js"` (run from the repo root
`c:\Users\Viet\Desktop\components-law` so the relative `JsField/...` read
works)

Expected: `OK: task1 id/key helpers` printed, exit code 0. If any `assert`
fails, fix the corresponding helper in `JsField/GenericSearchFilter.js` and
re-run.

- [ ] **Step 4: Syntax-check the real file**

Run: `node --check "JsField/GenericSearchFilter.js"`

Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add JsField/GenericSearchFilter.js
git commit -m "feat: scaffold GenericSearchFilter block with CONFIG and id helpers"
```

If this fails with "Author identity unknown", skip — see Global Constraints.

---

## Task 2: `buildFilterFor` and `getDisplayOptions`

**Files:**
- Modify: `JsField/GenericSearchFilter.js` (append after Task 1's helpers, still above the `// ---- ctx-dependent identity helpers` marker)
- Test (scratchpad): `<scratchpad>/test-task2-build-filter.js`

**Interfaces:**
- Consumes: nothing new (pure).
- Produces: `buildFilterFor(filterDef, value)`, `getDisplayOptions(filterDef)`. Used by Task 3 (`buildCountFilter`), Task 5 (hooks), Task 7 (main component).

- [ ] **Step 1: Insert `buildFilterFor` and `getDisplayOptions`**

In `JsField/GenericSearchFilter.js`, insert the following immediately after
`getScopeFilterKey` and before the `// ---- ctx-dependent identity helpers`
comment:

```js
// ---- filter-object builders (pure) ----
const buildFilterFor = (filterDef, value) => {
  if (!filterDef || !filterDef.type) return {};
  switch (filterDef.type) {
    case 'status': {
      if (!value || value === 'all') return {};
      return { [filterDef.field]: value };
    }
    case 'relation': {
      const id = normalizeFilterId(value);
      if (id === null) return {};
      return { [filterDef.field]: id };
    }
    case 'search': {
      const q = String(value ?? '').trim();
      if (!q) return {};
      const fields = filterDef.fields || [];
      if (fields.length === 0) return {};
      const like = `%${q}%`;
      const clauses = fields.map((f) => ({ [f]: { $iLike: like } }));
      return clauses.length === 1 ? clauses[0] : { $or: clauses };
    }
    case 'dateRange': {
      const from = value && value.from ? value.from : null;
      const to = value && value.to ? value.to : null;
      if (!from && !to) return {};
      const clauses = [];
      if (from) clauses.push({ [filterDef.field]: { $gte: from } });
      if (to) clauses.push({ [filterDef.field]: { $lte: to } });
      return clauses.length === 1 ? clauses[0] : { $and: clauses };
    }
    default:
      console.warn('[GenericSearchFilter] Unknown filter type:', filterDef.type);
      return {};
  }
};

const getDisplayOptions = (filterDef) => [{ value: 'all', label: 'Tất cả' }, ...(filterDef.options || [])];
```

- [ ] **Step 2: Write the test script**

Create `<scratchpad>/test-task2-build-filter.js`:

```js
const assert = require('assert');
const fs = require('fs');

const src = fs.readFileSync('JsField/GenericSearchFilter.js', 'utf8');
const marker = '// ---- ctx-dependent identity helpers';
const pureSrc = src.slice(0, src.indexOf(marker));
eval(pureSrc);

// status
assert.deepStrictEqual(
  buildFilterFor({ type: 'status', field: 'status' }, 'all'),
  {},
);
assert.deepStrictEqual(
  buildFilterFor({ type: 'status', field: 'status' }, 'inProgress'),
  { status: 'inProgress' },
);

// relation
assert.deepStrictEqual(
  buildFilterFor({ type: 'relation', field: 'internalCompanyId' }, ''),
  {},
);
assert.deepStrictEqual(
  buildFilterFor({ type: 'relation', field: 'internalCompanyId' }, '5'),
  { internalCompanyId: 5 },
);

// search
assert.deepStrictEqual(
  buildFilterFor({ type: 'search', fields: ['title', 'code'] }, '  '),
  {},
);
assert.deepStrictEqual(
  buildFilterFor({ type: 'search', fields: ['title'] }, 'abc'),
  { title: { $iLike: '%abc%' } },
);
assert.deepStrictEqual(
  buildFilterFor({ type: 'search', fields: ['title', 'code'] }, 'abc'),
  { $or: [{ title: { $iLike: '%abc%' } }, { code: { $iLike: '%abc%' } }] },
);

// dateRange
assert.deepStrictEqual(
  buildFilterFor({ type: 'dateRange', field: 'signedDate' }, { from: '', to: '' }),
  {},
);
assert.deepStrictEqual(
  buildFilterFor({ type: 'dateRange', field: 'signedDate' }, { from: '2026-01-01', to: '' }),
  { signedDate: { $gte: '2026-01-01' } },
);
assert.deepStrictEqual(
  buildFilterFor({ type: 'dateRange', field: 'signedDate' }, { from: '2026-01-01', to: '2026-01-31' }),
  { $and: [{ signedDate: { $gte: '2026-01-01' } }, { signedDate: { $lte: '2026-01-31' } }] },
);

// unknown type
assert.deepStrictEqual(buildFilterFor({ type: 'bogus' }, 'x'), {});

// getDisplayOptions
assert.deepStrictEqual(
  getDisplayOptions({ options: [{ value: 'a', label: 'A' }] }),
  [{ value: 'all', label: 'Tất cả' }, { value: 'a', label: 'A' }],
);

console.log('OK: task2 buildFilterFor/getDisplayOptions');
```

- [ ] **Step 3: Run the test script**

Run: `node "<scratchpad>/test-task2-build-filter.js"`

Expected: `OK: task2 buildFilterFor/getDisplayOptions`, exit code 0.

- [ ] **Step 4: Syntax-check**

Run: `node --check "JsField/GenericSearchFilter.js"`

Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add JsField/GenericSearchFilter.js
git commit -m "feat: add buildFilterFor dispatcher for all 4 filter types"
```

---

## Task 3: `buildCurrentUserScopeFilter`, `mapRelationOptions`, `buildCountFilter`

**Files:**
- Modify: `JsField/GenericSearchFilter.js` (append after Task 2's helpers, still above the ctx-dependent marker)
- Test (scratchpad): `<scratchpad>/test-task3-scope-relation-count.js`

**Interfaces:**
- Consumes: `normalizeFilterId`, `uniqueFilterIds`, `getNoRecordFilter`, `buildFilterFor`, `combineFilters` (Tasks 1-2).
- Produces: `buildCurrentUserScopeFilter({ userId, validUserFields, emptyWhenUnknown })`, `mapRelationOptions(records, filterDef)`, `buildCountFilter({ extraFilter, currentUserScopeFilter, filters, activeValues, statusFilterDef, optionValue })`. Used by Task 4 (`useCurrentUserScope`) and Task 5 (`useRelationOptions`, `useStatusCountsAll`).

- [ ] **Step 1: Insert the three pure functions**

Insert after `getDisplayOptions` and before the ctx-dependent marker:

```js
// ---- current-user scope filter (pure) ----
const buildCurrentUserScopeFilter = ({ userId, validUserFields = [], emptyWhenUnknown = true }) => {
  const safeUserId = normalizeFilterId(userId);
  if (!safeUserId) return emptyWhenUnknown ? getNoRecordFilter() : {};
  const clauses = validUserFields.map((field) => ({ [field]: { $eq: safeUserId } }));
  if (clauses.length === 0) return emptyWhenUnknown ? getNoRecordFilter() : {};
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
};

// ---- relation option mapping (pure) ----
const mapRelationOptions = (records, filterDef) => {
  const excludeSet = new Set(
    (filterDef?.source?.excludeValues || []).map((v) => String(normalizeFilterId(v))),
  );
  const labelFields = filterDef?.source?.labelFields?.length ? filterDef.source.labelFields : ['name'];
  return (records || [])
    .filter((record) => !excludeSet.has(String(normalizeFilterId(record?.id))))
    .map((record) => {
      let label = '';
      for (const field of labelFields) {
        if (record?.[field]) { label = String(record[field]); break; }
      }
      return { value: record?.id, label: label || `#${record?.id}` };
    });
};

// ---- status-option count filter (pure) ----
const buildCountFilter = ({ extraFilter, currentUserScopeFilter, filters, activeValues, statusFilterDef, optionValue }) => {
  const otherFilters = filters
    .filter((f) => f.key !== statusFilterDef.key)
    .map((f) => buildFilterFor(f, activeValues[f.key]));
  return combineFilters(
    extraFilter,
    currentUserScopeFilter,
    ...otherFilters,
    buildFilterFor(statusFilterDef, optionValue),
  );
};
```

- [ ] **Step 2: Write the test script**

Create `<scratchpad>/test-task3-scope-relation-count.js`:

```js
const assert = require('assert');
const fs = require('fs');

const src = fs.readFileSync('JsField/GenericSearchFilter.js', 'utf8');
const marker = '// ---- ctx-dependent identity helpers';
const pureSrc = src.slice(0, src.indexOf(marker));
eval(pureSrc);

// buildCurrentUserScopeFilter
assert.deepStrictEqual(
  buildCurrentUserScopeFilter({ userId: null, validUserFields: ['createdById'], emptyWhenUnknown: true }),
  { id: { $eq: -1 } },
);
assert.deepStrictEqual(
  buildCurrentUserScopeFilter({ userId: null, validUserFields: ['createdById'], emptyWhenUnknown: false }),
  {},
);
assert.deepStrictEqual(
  buildCurrentUserScopeFilter({ userId: 3, validUserFields: ['createdById'], emptyWhenUnknown: true }),
  { createdById: { $eq: 3 } },
);
assert.deepStrictEqual(
  buildCurrentUserScopeFilter({ userId: 3, validUserFields: ['createdById', 'ownerId'], emptyWhenUnknown: true }),
  { $or: [{ createdById: { $eq: 3 } }, { ownerId: { $eq: 3 } }] },
);

// mapRelationOptions
const records = [
  { id: 1, shortName: '', name: 'Công ty A' },
  { id: 2, shortName: 'B Co', name: 'Công ty B' },
  { id: 3, shortName: '', name: '' },
];
assert.deepStrictEqual(
  mapRelationOptions(records, { source: { labelFields: ['shortName', 'name'] } }),
  [
    { value: 1, label: 'Công ty A' },
    { value: 2, label: 'B Co' },
    { value: 3, label: '#3' },
  ],
);
assert.deepStrictEqual(
  mapRelationOptions(records, { source: { labelFields: ['shortName', 'name'], excludeValues: [2] } }),
  [
    { value: 1, label: 'Công ty A' },
    { value: 3, label: '#3' },
  ],
);

// buildCountFilter
const statusFilterDef = { type: 'status', key: 'status', field: 'status' };
const companyFilterDef = { type: 'relation', key: 'company', field: 'internalCompanyId' };
const result = buildCountFilter({
  extraFilter: {},
  currentUserScopeFilter: {},
  filters: [statusFilterDef, companyFilterDef],
  activeValues: { status: 'all', company: '7' },
  statusFilterDef,
  optionValue: 'inProgress',
});
assert.deepStrictEqual(result, { $and: [{ internalCompanyId: 7 }, { status: 'inProgress' }] });

console.log('OK: task3 scope/relation/count helpers');
```

- [ ] **Step 3: Run the test script**

Run: `node "<scratchpad>/test-task3-scope-relation-count.js"`

Expected: `OK: task3 scope/relation/count helpers`, exit code 0.

- [ ] **Step 4: Syntax-check**

Run: `node --check "JsField/GenericSearchFilter.js"`

Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add JsField/GenericSearchFilter.js
git commit -m "feat: add current-user-scope, relation-options, and count filter builders"
```

---

## Task 4: `useCurrentUserScope` hook

**Files:**
- Modify: `JsField/GenericSearchFilter.js` (append after `getResponseRecord`, this starts the React/ctx-dependent section)

**Interfaces:**
- Consumes: `ctx.React` (`useState`, `useEffect`), `ctx.api.request`, `getCurrentUserFromCtx`, `getResponseRecord`, `normalizeFilterId`, `buildCurrentUserScopeFilter` (Tasks 1-3).
- Produces: `useCurrentUserScope()` returning `{ loading, userId, filter, signature }`. Used by Task 7 (main component) and Task 5 (`useStatusCountsAll`).

No standalone test is possible for this step (it calls `ctx.api.request` and
React hooks) — verified via `node --check` plus a manual review against the
checklist in Step 3.

- [ ] **Step 1: Add the React/ctx imports and `useCurrentUserScope`**

Append after `getResponseRecord`'s closing brace:

```js
const { React } = ctx;
const { useState, useEffect, useCallback } = React;
const { Select, Input, Typography } = ctx.antd;
const { Text } = Typography;

function useCurrentUserScope() {
  const [scope, setScope] = useState({
    loading: !!CONFIG.currentUserScope.enable,
    userId: null,
    filter: {},
    signature: '{}',
  });

  useEffect(() => {
    if (!CONFIG.currentUserScope.enable) {
      setScope({ loading: false, userId: null, filter: {}, signature: '{}' });
      return;
    }

    let cancelled = false;

    const resolveScope = async () => {
      let currentUser = getCurrentUserFromCtx();
      try {
        const authRes = await ctx.api.request({ url: 'auth:check' });
        currentUser = getResponseRecord(authRes) || currentUser;
      } catch (e) {
        if (!currentUser) console.warn('[GenericSearchFilter] Could not resolve currentUser:', e);
      }

      const userId = normalizeFilterId(currentUser?.id ?? currentUser);
      let validUserFields = CONFIG.currentUserScope.userFields || [];

      if (CONFIG.currentUserScope.validateFields && userId && validUserFields.length) {
        const validated = await Promise.all(
          validUserFields.map(async (field) => {
            try {
              await ctx.api.request({
                url: `${CONFIG.tableName}:list`,
                params: { pageSize: 1, filter: JSON.stringify({ [field]: { $eq: userId } }) },
              });
              return field;
            } catch (e) {
              console.warn(`[GenericSearchFilter] Bỏ qua currentUserScope field không hợp lệ: ${field}`, e);
              return null;
            }
          }),
        );
        validUserFields = validated.filter(Boolean);
      }

      const filter = buildCurrentUserScopeFilter({
        userId,
        validUserFields,
        emptyWhenUnknown: CONFIG.currentUserScope.emptyWhenUnknown !== false,
      });

      if (!cancelled) {
        setScope({ loading: false, userId, filter, signature: JSON.stringify(filter || {}) });
      }
    };

    resolveScope();
    return () => { cancelled = true; };
  }, []);

  return scope;
}
```

- [ ] **Step 2: Syntax-check**

Run: `node --check "JsField/GenericSearchFilter.js"`

Expected: no output, exit code 0.

- [ ] **Step 3: Manual review checklist**

Confirm by reading the code you just wrote:
- [ ] `CONFIG.currentUserScope.enable === false` (the default) short-circuits to `{ loading: false, userId: null, filter: {}, signature: '{}' }` without any `ctx.api.request` call.
- [ ] `validateFields` failures (`catch` block) return `null` and get filtered out by `.filter(Boolean)`, they never throw out of `resolveScope`.
- [ ] The effect's cleanup (`cancelled = true`) prevents a `setScope` call after unmount.

- [ ] **Step 4: Commit**

```bash
git add JsField/GenericSearchFilter.js
git commit -m "feat: add useCurrentUserScope hook"
```

---

## Task 5: `useRelationOptions` and `useStatusCountsAll` hooks

**Files:**
- Modify: `JsField/GenericSearchFilter.js` (append after `useCurrentUserScope`)

**Interfaces:**
- Consumes: `useState`, `useEffect`, `useCallback` (already imported in Task 4), `ctx.api.request`, `mapRelationOptions`, `buildCountFilter`, `CONFIG.filters` (Tasks 1-4).
- Produces: `useRelationOptions(filterDef)` returning `{ options, loading }`; `useStatusCountsAll(activeValues, currentUserScopeFilter, scopeReady)` returning `{ counts, loading, refetch }`. Used by Task 6 (`FilterControl`) and Task 7 (main component).

- [ ] **Step 1: Add both hooks**

Append after `useCurrentUserScope`'s closing brace:

```js
function useRelationOptions(filterDef) {
  const [state, setState] = useState({ options: [], loading: filterDef.type === 'relation' });

  useEffect(() => {
    if (filterDef.type !== 'relation') return;
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    ctx.api.request({
      url: `${filterDef.source.collection}:list`,
      params: { pageSize: 500, sort: filterDef.source.sort || 'createdAt' },
    })
      .then((res) => {
        if (cancelled) return;
        setState({ options: mapRelationOptions(res?.data?.data || [], filterDef), loading: false });
      })
      .catch((e) => {
        console.warn(`[GenericSearchFilter] Could not fetch relation options for ${filterDef.key}:`, e);
        if (!cancelled) setState({ options: [], loading: false });
      });
    return () => { cancelled = true; };
  }, [filterDef.key, filterDef.type]);

  return state;
}

function useStatusCountsAll(activeValues, currentUserScopeFilter, scopeReady) {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);
  const refetch = useCallback(() => setTrigger((p) => p + 1), []);
  const activeValuesSignature = JSON.stringify(activeValues);
  const scopeSignature = JSON.stringify(currentUserScopeFilter || {});

  useEffect(() => {
    if (!scopeReady) { setLoading(true); return; }
    const statusFilters = CONFIG.filters.filter((f) => f.type === 'status' && f.showCounts !== false);
    if (statusFilters.length === 0) { setCounts({}); setLoading(false); return; }

    let cancelled = false;
    const fetchCounts = async () => {
      setLoading(true);
      try {
        const entries = await Promise.all(statusFilters.map(async (statusFilterDef) => {
          const displayOptions = getDisplayOptions(statusFilterDef);
          const optionResults = await Promise.all(displayOptions.map((option) =>
            ctx.api.request({
              url: `${CONFIG.tableName}:list`,
              params: {
                pageSize: 1,
                filter: JSON.stringify(buildCountFilter({
                  extraFilter: CONFIG.extraFilter,
                  currentUserScopeFilter,
                  filters: CONFIG.filters,
                  activeValues,
                  statusFilterDef,
                  optionValue: option.value,
                })),
              },
            }),
          ));
          const byOption = {};
          displayOptions.forEach((option, i) => {
            byOption[option.value] = optionResults[i]?.data?.meta?.count || 0;
          });
          return [statusFilterDef.key, byOption];
        }));
        if (!cancelled) setCounts(Object.fromEntries(entries));
      } catch (e) {
        console.error('[GenericSearchFilter] Lỗi lấy counts:', e);
        if (!cancelled) setCounts({});
      }
      if (!cancelled) setLoading(false);
    };
    fetchCounts();
    return () => { cancelled = true; };
  }, [activeValuesSignature, scopeSignature, scopeReady, trigger]);

  return { counts, loading, refetch };
}
```

- [ ] **Step 2: Syntax-check**

Run: `node --check "JsField/GenericSearchFilter.js"`

Expected: no output, exit code 0.

- [ ] **Step 3: Manual review checklist**

- [ ] `useRelationOptions` for a non-`'relation'` `filterDef` never calls `ctx.api.request` (the effect returns immediately) and keeps `loading: false` from its initial state.
- [ ] `useStatusCountsAll` with zero `status`-type filters in `CONFIG.filters` sets `counts: {}` and `loading: false` without any API calls.
- [ ] `getDisplayOptions` (Task 2) is called so the synthetic `'all'` option is included in the per-status count map.

- [ ] **Step 4: Commit**

```bash
git add JsField/GenericSearchFilter.js
git commit -m "feat: add useRelationOptions and useStatusCountsAll hooks"
```

---

## Task 6: `FilterControl` presentational component

**Files:**
- Modify: `JsField/GenericSearchFilter.js` (append after `useStatusCountsAll`)

**Interfaces:**
- Consumes: `React.createElement`, `Select`/`Input`/`Text` (Task 4), `useRelationOptions` (Task 5), `getDisplayOptions` (Task 2).
- Produces: `FilterControl({ filterDef, value, onChange, counts })` component and shared style objects `barStyle`, `wrapStyle`, `labelStyle`. Used by Task 7 (main component).

- [ ] **Step 1: Add styles and the `FilterControl` component**

Append after `useStatusCountsAll`'s closing brace:

```js
const barStyle = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
  padding: '10px 14px', backgroundColor: '#fff', borderRadius: 8,
  border: '1px solid #f0f0f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
};
const wrapStyle = { display: 'flex', alignItems: 'center', gap: 6 };
const labelStyle = { fontSize: 12, fontWeight: 500, color: '#8c8c8c', whiteSpace: 'nowrap' };

const FilterControl = ({ filterDef, value, onChange, counts }) => {
  const relation = useRelationOptions(filterDef);

  if (filterDef.type === 'status') {
    const displayOptions = getDisplayOptions(filterDef);
    const showCounts = filterDef.showCounts !== false;
    return React.createElement(
      'div', { key: filterDef.key, style: wrapStyle },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Select, {
        value,
        size: 'small',
        style: { width: filterDef.width || 180 },
        onChange: (v) => onChange(v || 'all'),
        options: displayOptions.map((opt) => ({
          value: opt.value,
          label: showCounts
            ? `${opt.label} (${(counts[filterDef.key] || {})[opt.value] ?? 0})`
            : opt.label,
        })),
      }),
    );
  }

  if (filterDef.type === 'relation') {
    return React.createElement(
      'div', { key: filterDef.key, style: wrapStyle },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Select, {
        value: value || undefined,
        placeholder: filterDef.placeholder || 'Tất cả',
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
        loading: relation.loading,
        style: { width: filterDef.width || 180 },
        size: 'small',
        onChange: (v) => onChange(v || ''),
        options: relation.options,
      }),
    );
  }

  if (filterDef.type === 'search') {
    return React.createElement(
      'div', { key: filterDef.key, style: { ...wrapStyle, flex: 1, minWidth: 200 } },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Input.Search, {
        placeholder: filterDef.placeholder || 'Tìm kiếm...',
        allowClear: true,
        enterButton: true,
        size: 'small',
        defaultValue: value,
        onSearch: (v) => onChange((v || '').trim()),
        style: { flex: 1, maxWidth: 380 },
      }),
    );
  }

  if (filterDef.type === 'dateRange') {
    return React.createElement(
      'div', { key: filterDef.key, style: wrapStyle },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Input, {
        type: 'date',
        size: 'small',
        value: value?.from || '',
        style: { width: 130 },
        onChange: (e) => onChange({ ...value, from: e.target.value }),
      }),
      React.createElement(Text, { style: labelStyle }, '-'),
      React.createElement(Input, {
        type: 'date',
        size: 'small',
        value: value?.to || '',
        style: { width: 130 },
        onChange: (e) => onChange({ ...value, to: e.target.value }),
      }),
    );
  }

  console.warn('[GenericSearchFilter] Unknown filter type in render:', filterDef.type);
  return null;
};
```

- [ ] **Step 2: Syntax-check**

Run: `node --check "JsField/GenericSearchFilter.js"`

Expected: no output, exit code 0.

- [ ] **Step 3: Manual review checklist**

- [ ] All 4 values of `filterDef.type` (`status`, `relation`, `search`, `dateRange`) have a matching `if` branch, plus a `console.warn` + `null` fallback for anything else — matches `buildFilterFor`'s `default` branch behavior (both warn-and-no-op on an unknown type, so a typo in `CONFIG.filters[].type` degrades gracefully instead of crashing the whole block).
- [ ] `useRelationOptions(filterDef)` is called unconditionally at the top of `FilterControl` (React rules-of-hooks: must not be inside the `if` branches) — confirm it is called once, before any `if`.

- [ ] **Step 4: Commit**

```bash
git add JsField/GenericSearchFilter.js
git commit -m "feat: add FilterControl presentational component"
```

---

## Task 7: Main `GenericSearchFilter` component and `ctx.render`

**Files:**
- Modify: `JsField/GenericSearchFilter.js` (append after `FilterControl`, this is the final addition to the file)

**Interfaces:**
- Consumes: `useState`, `useEffect`, `useCallback` (Task 4), `useCurrentUserScope` (Task 4), `useStatusCountsAll` (Task 5), `FilterControl`, `barStyle` (Task 6), `buildFilterFor` (Task 2), `getFilterKey`, `getScopeFilterKey` (Task 1).
- Produces: `GenericSearchFilter` component, side-effecting `ctx.render(...)` call at the bottom of the file (this is the last line — no further tasks append after this).

- [ ] **Step 1: Add the main component and render call**

Append after `FilterControl`'s closing brace:

```js
const initialActiveValues = () => {
  const values = {};
  CONFIG.filters.forEach((f) => {
    if (f.type === 'status') values[f.key] = 'all';
    else if (f.type === 'dateRange') values[f.key] = { from: '', to: '' };
    else values[f.key] = '';
  });
  return values;
};

const GenericSearchFilter = () => {
  const [activeValues, setActiveValues] = useState(initialActiveValues);
  const currentUserScope = useCurrentUserScope();
  const { counts, refetch: refetchCounts } = useStatusCountsAll(
    activeValues, currentUserScope.filter, !currentUserScope.loading,
  );

  useEffect(() => {
    const engine = ctx.engine || ctx.app;
    if (!engine) return;
    if (!engine.__nocobaseReloaders) engine.__nocobaseReloaders = new Set();
    engine.__nocobaseReloaders.add(refetchCounts);
    return () => engine.__nocobaseReloaders.delete(refetchCounts);
  }, [refetchCounts]);

  const applyFilterGroup = useCallback(async (filterKey, filter) => {
    try {
      const target = ctx.engine?.getModel(CONFIG.targetBlockUid);
      if (!target) {
        console.warn('[GenericSearchFilter] targetBlockUid không resolve được model:', CONFIG.targetBlockUid);
        return;
      }
      target.resource.addFilterGroup(filterKey, filter);
      await target.resource.refresh();
    } catch (e) {
      console.error('[GenericSearchFilter] Áp filter thất bại:', filterKey, e);
    }
  }, []);

  useEffect(() => {
    if (!CONFIG.currentUserScope.enable || currentUserScope.loading) return;
    applyFilterGroup(getScopeFilterKey(), currentUserScope.filter);
  }, [applyFilterGroup, currentUserScope.loading, currentUserScope.signature]);

  const handleChange = useCallback((filterDef, value) => {
    setActiveValues((prev) => ({ ...prev, [filterDef.key]: value }));
    applyFilterGroup(getFilterKey(filterDef), buildFilterFor(filterDef, value));
  }, [applyFilterGroup]);

  return React.createElement(
    'div',
    { style: barStyle },
    CONFIG.filters.map((filterDef) =>
      React.createElement(FilterControl, {
        key: filterDef.key,
        filterDef,
        value: activeValues[filterDef.key],
        onChange: (v) => handleChange(filterDef, v),
        counts,
      }),
    ),
  );
};

ctx.render(React.createElement(GenericSearchFilter));
```

- [ ] **Step 2: Syntax-check the complete file**

Run: `node --check "JsField/GenericSearchFilter.js"`

Expected: no output, exit code 0.

- [ ] **Step 3: Manual review checklist**

- [ ] `initialActiveValues()` produces one entry per `CONFIG.filters` item, keyed by `filterDef.key`, matching the value shape each `buildFilterFor` branch expects (`'all'` string for status, `{from,to}` object for dateRange, plain string for relation/search).
- [ ] `handleChange` both updates local state (`setActiveValues`) and calls `applyFilterGroup` in the same call — a status/relation/search/dateRange change is reflected in the UI label AND pushed to the target block in one user action.
- [ ] The `useEffect` that applies `currentUserScope.filter` re-runs only on `currentUserScope.loading`/`.signature` changes (not on every render) — its dependency array does not include the filter object itself (which is a new reference every render), only its memoized `signature` string.
- [ ] `ctx.render(React.createElement(GenericSearchFilter))` is the last line of the file.

- [ ] **Step 4: Commit**

```bash
git add JsField/GenericSearchFilter.js
git commit -m "feat: add GenericSearchFilter main component and ctx.render entrypoint"
```

---

## Task 8: Final full-file verification and handoff

**Files:**
- Verify only: `JsField/GenericSearchFilter.js`

**Interfaces:** none (verification task).

- [ ] **Step 1: Run all three scratch test scripts once more against the final file**

Run each of these from the repo root and confirm all three print their `OK:`
line with exit code 0:

```
node "<scratchpad>/test-task1-id-helpers.js"
node "<scratchpad>/test-task2-build-filter.js"
node "<scratchpad>/test-task3-scope-relation-count.js"
```

- [ ] **Step 2: Final syntax check**

Run: `node --check "JsField/GenericSearchFilter.js"`

Expected: no output, exit code 0.

- [ ] **Step 3: Confirm the file is deployable as-is**

Read through `JsField/GenericSearchFilter.js` once top to bottom and confirm:
- [ ] `CONFIG.filters` defaults to `[]` and `CONFIG.targetBlockUid`/`tableName` default to `''` — pasting the file into Nocobase unconfigured renders an empty bar, no crash, no API calls (since `useStatusCountsAll` short-circuits on zero status filters and `useCurrentUserScope` short-circuits on `enable: false`).
- [ ] The commented example `filters` array in `CONFIG` matches the 4 supported `type` values exactly as implemented in `buildFilterFor` (Task 2) and `FilterControl` (Task 6).

- [ ] **Step 4: Report to the user**

Tell the user the file is ready at `JsField/GenericSearchFilter.js`, and that
per the spec's "Kế hoạch xác minh" section, real UI verification (status
select, relation dropdown, search box, date range, "Reload data" button)
requires them to paste it into an actual Nocobase block with a real
`targetBlockUid`/`tableName`/`filters` — this cannot be exercised in this
session. Ask for the first module's `targetBlockUid` + collection + desired
filters to fill in a real `CONFIG` as a worked example.

- [ ] **Step 5: Final commit (if anything is unstaged)**

```bash
git add JsField/GenericSearchFilter.js
git status --short
```

If there are staged changes, commit:

```bash
git commit -m "chore: finalize GenericSearchFilter block"
```
