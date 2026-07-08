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
var CONFIG = {
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
var extractId = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? value._id ?? null;
  return value;
};

var normalizeFilterId = (value) => {
  const id = extractId(value);
  if (id === null || id === undefined || id === '') return null;
  const numeric = Number(id);
  return Number.isFinite(numeric) && String(numeric) === String(id) ? numeric : id;
};

var uniqueFilterIds = (values) => Array.from(new Set(
  (values || []).map(normalizeFilterId).filter((v) => v !== null && v !== undefined).map(String),
)).map((value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && String(numeric) === value ? numeric : value;
});

var isEmptyFilter = (filter) => !filter || Object.keys(filter).length === 0;

var combineFilters = (...filters) => {
  const active = filters.filter((f) => !isEmptyFilter(f));
  if (active.length === 0) return {};
  if (active.length === 1) return active[0];
  return { $and: active };
};

var getNoRecordFilter = () => ({ id: { $eq: -1 } });

var getFilterKey = (filterDef) => `${CONFIG.tableName}-${filterDef.key}-filter`;
var getScopeFilterKey = () => `${CONFIG.tableName}-current-user-scope-filter`;

// ---- ctx-dependent identity helpers (not unit-testable without a real ctx) ----
var getCurrentUserFromCtx = () => {
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

var getResponseRecord = (res) => {
  const data = res?.data?.data || res?.data || res;
  return data?.user || data || null;
};
