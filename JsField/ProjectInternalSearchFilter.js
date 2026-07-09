/**
 * Generic Search/Filter block (Nocobase JS Field/Action block).
 * Deployment: Project Internal module (collection "projectInternal").
 *
 * This is JsField/GenericSearchFilter.js with CONFIG filled in for the
 * Project Internal module. Field names confirmed from two sources:
 *   - pgsql/log_activity_project_internal.sql's header comment, which
 *     documents "Exact Project Internal fields from the collection
 *     settings" verbatim (not the SQL logic itself, just that comment).
 *   - All Module/Task/ProjectInternalTask.js's actual field usage.
 *
 * STILL NEEDED before this is deployable — see the TODOs below:
 *   1. `targetBlockUid` is empty — fill it in from the block's designer menu.
 *   2. `status` and `priority` options are placeholders. The SQL trigger's
 *      generic value-display mapping (resolve_project_internal_activity_value
 *      in that same file) lists a broad set of possible status/priority
 *      strings shared across multiple modules — it is NOT a declaration of
 *      this field's actual configured Select options, so those values are
 *      NOT used here. Open "Project Internal - Configure fields" > Status /
 *      Priority > Edit field and share the real Option value/label list
 *      (same as done for Lead/Case).
 *   3. `projectAssignees` (relation, per the SQL comment's field list) is
 *      ASSUMED to target `lawyers` — by strong precedent (every other
 *      "assignees"-style field in this app — Lead's Assignees, Quotation's
 *      lawyers/approvalLawyers, Case's assignees — targets `lawyers`), but
 *      this was NOT directly confirmed in JS code for this specific field
 *      (unlike Case's `assignees`, which had a direct payload reference).
 *      Verify once deployed.
 *
 * Field notes (confirmed):
 *   - `projectCode`, `projectName`, `description`, `internalCompanyId` are
 *     real fields (confirmed via
 *     All Module/Document/ProjectDocument.js:2076's
 *     `fields: ["id", "projectCode", "projectName", "description", "internalCompanyId"]`
 *     and the SQL trigger comment).
 *   - `projectManagerId` is a flat FK, but — unlike `projects.projectManagerId`
 *     (which targets `users`, see JsField/CaseSearchFilter.js) —
 *     `projectInternal.projectManagerId` targets `lawyers`. Confirmed by
 *     ProjectInternalTask.js:13403-13404, which compares
 *     `projectManagerId === myLawyer.id` where `myLawyer` is resolved from
 *     `lawyers.find(l => l.userId === currentUser.id)` — a direct lawyer-id
 *     comparison, not a user-id one. Do not copy Case's `users` target here.
 *
 * HOW TO USE THIS FILE:
 * 1. Fill in the 3 TODOs above.
 * 2. Copy this entire file into the Project Internal module's JS
 *    Field/Action block in Nocobase.
 * 3. Do not edit anything below the "ENGINE" marker except to keep it in
 *    sync with JsField/GenericSearchFilter.js if that template changes.
 *
 * See docs/superpowers/specs/2026-07-08-generic-search-filter-design.md for
 * the full design.
 */

// ===================================================================
// CONFIG — EDIT THIS SECTION PER MODULE. Nothing below this needs editing.
// ===================================================================
const CONFIG = {
  targetBlockUid: '', // TODO: fill in — see file header note 1
  tableName: 'projectInternal',
  extraFilter: {},

  filters: [
    {
      type: 'status',
      key: 'status',
      field: 'status',
      label: 'Status',
      options: [
        // TODO: fill in real Option value/label pairs — see file header note 2
      ],
      showCounts: true,
    },
    {
      type: 'status',
      key: 'priority',
      field: 'priority',
      label: 'Priority',
      options: [
        // TODO: fill in real Option value/label pairs — see file header note 2
        // (do NOT assume this matches projects.priority's low/medium/high)
      ],
      showCounts: true,
    },
    {
      type: 'relation',
      key: 'company',
      field: 'internalCompanyId',
      label: 'Internal Company',
      placeholder: 'All',
      source: {
        collection: 'internalCompany',
        labelFields: ['shortName', 'name'],
        sort: 'createdAt',
      },
    },
    {
      type: 'relation',
      key: 'projectManager',
      field: 'projectManagerId',
      label: 'Project Manager',
      placeholder: 'All',
      source: {
        collection: 'lawyers', // confirmed — see file header note on projectManagerId
        labelFields: ['lawyerName'],
        sort: 'createdAt',
      },
    },
    {
      type: 'relation',
      key: 'assignees',
      field: 'projectAssignees',
      relationKey: 'id', // assumed no flat FK column, only the association — see file header note 3
      label: 'Members',
      placeholder: 'All',
      source: {
        collection: 'lawyers', // ASSUMED target — verify, see file header note 3
        labelFields: ['lawyerName'],
        sort: 'createdAt',
      },
    },
    {
      type: 'search',
      key: 'search',
      label: 'Search',
      fields: ['projectCode', 'projectName', 'description'],
      placeholder: 'Search by project code, name, description...',
    },
  ],

  currentUserScope: {
    enable: false,
    userFields: ['createdById'],
    emptyWhenUnknown: true,
    validateFields: true,
  },
};

// ===================================================================
// ENGINE — DO NOT EDIT BELOW THIS LINE
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

// ---- filter-object builders (pure) ----
const buildFilterFor = (filterDef, value) => {
  if (!filterDef || !filterDef.type) return {};
  switch (filterDef.type) {
    case 'status': {
      // Use nullish/empty checks, not a plain falsy check — option values can
      // legitimately be `false` or `0` (e.g. a boolean field's "No" option),
      // which must not be treated the same as "no filter selected".
      if (value === undefined || value === null || value === '' || value === 'all') return {};
      return { [filterDef.field]: value };
    }
    case 'relation': {
      const id = normalizeFilterId(value);
      if (id === null) return {};
      // Most belongsTo relations expose a flat scalar FK column (e.g.
      // internalCompanyId) that can be filtered directly. Some associations
      // (e.g. Nocobase relations with no separate raw FK field) only accept
      // a nested filter on the target's key — set `relationKey` (usually
      // 'id') to opt into that shape: { [field]: { [relationKey]: id } }.
      return filterDef.relationKey
        ? { [filterDef.field]: { [filterDef.relationKey]: id } }
        : { [filterDef.field]: id };
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

const getDisplayOptions = (filterDef) => [{ value: 'all', label: 'All' }, ...(filterDef.options || [])];

// ---- current-user scope filter (pure) ----
const buildCurrentUserScopeFilter = ({ userId, validUserFields = [], validRelationFields = [], emptyWhenUnknown = true }) => {
  const safeUserId = normalizeFilterId(userId);
  if (!safeUserId) return emptyWhenUnknown ? getNoRecordFilter() : {};
  // Scalar fields compare a flat FK-to-users column directly (e.g.
  // createdById). Relation fields compare through an association that has
  // no flat FK column (e.g. assignees -> lawyers, matched via lawyers'
  // own userId field) — set targetKey to the field on the related record
  // to compare against the current user's id (defaults to 'id').
  const clauses = [
    ...validUserFields.map((field) => ({ [field]: { $eq: safeUserId } })),
    ...validRelationFields.map(({ field, targetKey }) => ({
      [field]: { [targetKey || 'id']: { $eq: safeUserId } },
    })),
  ];
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
              console.warn(`[GenericSearchFilter] Skipping invalid currentUserScope field: ${field}`, e);
              return null;
            }
          }),
        );
        validUserFields = validated.filter(Boolean);
      }

      let validRelationFields = CONFIG.currentUserScope.relationFields || [];

      if (CONFIG.currentUserScope.validateFields && userId && validRelationFields.length) {
        const validated = await Promise.all(
          validRelationFields.map(async (rel) => {
            try {
              await ctx.api.request({
                url: `${CONFIG.tableName}:list`,
                params: {
                  pageSize: 1,
                  filter: JSON.stringify({ [rel.field]: { [rel.targetKey || 'id']: { $eq: userId } } }),
                },
              });
              return rel;
            } catch (e) {
              console.warn(`[GenericSearchFilter] Skipping invalid currentUserScope relation field: ${rel.field}`, e);
              return null;
            }
          }),
        );
        validRelationFields = validated.filter(Boolean);
      }

      const filter = buildCurrentUserScopeFilter({
        userId,
        validUserFields,
        validRelationFields,
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

function useRelationOptions(filterDef) {
  const [state, setState] = useState({ options: [], loading: filterDef.type === 'relation' });

  useEffect(() => {
    if (filterDef.type !== 'relation') return;
    if (!filterDef.source?.collection) {
      console.warn(`[GenericSearchFilter] Missing source.collection for relation filter: ${filterDef.key}`);
      return;
    }
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
        console.error('[GenericSearchFilter] Error fetching counts:', e);
        if (!cancelled) setCounts({});
      }
      if (!cancelled) setLoading(false);
    };
    fetchCounts();
    return () => { cancelled = true; };
  }, [activeValuesSignature, scopeSignature, scopeReady, trigger]);

  return { counts, loading, refetch };
}

const barStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12,
  padding: '10px 14px', backgroundColor: '#fff', borderRadius: 8,
  border: '1px solid #f0f0f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
};
const wrapStyle = { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 };
const labelStyle = { fontSize: 12, fontWeight: 500, color: '#8c8c8c', whiteSpace: 'nowrap' };

const FilterControl = ({ filterDef, value, onChange, counts }) => {
  const relation = useRelationOptions(filterDef);

  if (filterDef.type === 'status') {
    const displayOptions = getDisplayOptions(filterDef);
    const showCounts = filterDef.showCounts !== false;
    return React.createElement(
      'div', { style: wrapStyle },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Select, {
        value,
        size: 'small',
        style: { width: filterDef.width || '100%' },
        onChange: (v) => onChange(v === undefined ? 'all' : v),
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
      'div', { style: wrapStyle },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Select, {
        value: value || undefined,
        placeholder: filterDef.placeholder || 'All',
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
        loading: relation.loading,
        style: { width: filterDef.width || '100%' },
        size: 'small',
        onChange: (v) => onChange(v || ''),
        options: relation.options,
      }),
    );
  }

  if (filterDef.type === 'search') {
    return React.createElement(
      'div', { style: { ...wrapStyle, gridColumn: 'span 2' } },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Input.Search, {
        placeholder: filterDef.placeholder || 'Search...',
        allowClear: true,
        enterButton: true,
        size: 'small',
        defaultValue: value,
        onSearch: (v) => onChange((v || '').trim()),
        style: { width: '100%' },
      }),
    );
  }

  if (filterDef.type === 'dateRange') {
    return React.createElement(
      'div', { style: wrapStyle },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Input, {
        type: 'date',
        size: 'small',
        value: value?.from || '',
        style: { flex: 1, minWidth: 0 },
        onChange: (e) => onChange({ ...value, from: e.target.value }),
      }),
      React.createElement(Text, { style: labelStyle }, '-'),
      React.createElement(Input, {
        type: 'date',
        size: 'small',
        value: value?.to || '',
        style: { flex: 1, minWidth: 0 },
        onChange: (e) => onChange({ ...value, to: e.target.value }),
      }),
    );
  }

  console.warn('[GenericSearchFilter] Unknown filter type in render:', filterDef.type);
  return null;
};

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
        console.warn('[GenericSearchFilter] targetBlockUid could not resolve a model:', CONFIG.targetBlockUid);
        return;
      }
      target.resource.addFilterGroup(filterKey, filter);
      await target.resource.refresh();
    } catch (e) {
      console.error('[GenericSearchFilter] Failed to apply filter:', filterKey, e);
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
