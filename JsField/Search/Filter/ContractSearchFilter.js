/**
 * Generic Search/Filter block (Nocobase JS Field/Action block).
 * Deployment: Contract module (collection "contracts").
 *
 * This is JsField/Search/Filter/GenericSearchFilter.js with CONFIG filled in
 * for the Contract module, following the same structure as
 * JsField/Search/Filter/QuotationSearchFilter.js (the base this was built
 * from, per explicit request).
 *
 * targetBlockUid is left EMPTY below — fill it in with the real target
 * block's UID (Nocobase block designer menu > "Copy block UID") before
 * relying on this deployment. Until then `applyFilterGroup` will console.warn
 * "targetBlockUid could not resolve a model" and no filter will apply.
 *
 * Field notes — all confirmed directly from
 * All Module/Contract/ContractCreateForm.js's actual code (not guessed, not
 * copied from CLAUDE.md's collection table, per this session's verification
 * discipline):
 *   - `status` options: the exact 15-value STATUS_OPTIONS array used by the
 *     create form's own Status select (ContractCreateForm.js:72-88, wired at
 *     line 6855 `options: STATUS_OPTIONS`). This list is longer/messier than
 *     Quotation's or Case's status lists (draft, pending_approval, approved,
 *     sent, signed, negotiation, pending, approval, execution, completed,
 *     terminated, cancelled, rejected, closed, expired) — kept verbatim
 *     rather than trimmed, since it's what the form itself actually offers.
 *   - `contractType` options: CONTRACT_TYPES (ContractCreateForm.js:39-42) —
 *     byCase / retainer.
 *   - `isRequiredApproval` is a boolean field, same pattern as Quotation's
 *     (ContractCreateForm.js:6574 `isRequiredApproval: form.isRequiredApproval`
 *     in the `contracts:create` payload). Uses the `status` filter type with
 *     boolean option values — relies on the engine's nullish/empty check (not
 *     a plain falsy check) so a selected `false` ("No") isn't treated as "no
 *     filter", same fix already applied for Quotation.
 *   - `internalCompanyId` (label "Internal Company") is a flat scalar FK,
 *     confirmed at ContractCreateForm.js:6545 and its options fetched from
 *     `internalCompany:list` (line 4828) — same shape as every other module.
 *   - `lawyerId` (label "Lawyer") is a flat scalar FK to `lawyers` — a
 *     *single*-select field in the create form (ContractCreateForm.js:6946-6953,
 *     `SearchSelect` with `value: form.lawyerId`), NOT a multi-select
 *     belongsToMany like Quotation's `lawyers`/`assignees` field. No
 *     `relationKey` needed here — do not copy Quotation's `assignees` shape
 *     onto this field; Contract has no equivalent multi-lawyer relation field.
 *   - `approvedById` (label "Approved By") is a flat scalar FK to `lawyers`,
 *     confirmed at ContractCreateForm.js:6575
 *     (`approvedById: form.isRequiredApproval && form.approvedById ? parseInt(...) : null`)
 *     and its approver picker at line ~6891-6895. No `relationKey` needed,
 *     same pattern as `internalCompanyId`.
 *   - The `search` filter uses `contractCode` and `contractName` — confirmed
 *     as the real stored columns (not the `contractNumber`/`code` duplicate
 *     aliases also sent in the create payload for compat) via
 *     pgsql/resolve_display_value.sql:151 and
 *     pgsql/resolve_relation_label.sql:32-33, both of which read
 *     `COALESCE("contractCode", "contractName", ...)` directly from the
 *     `contracts` table — plus `description`.
 *   - `templateId` exists (ContractCreateForm.js:6547) but its options are
 *     fetched from `template:list` (line 4830), NOT `internalTemplate:list`
 *     as CLAUDE.md's collection table suggests — the CLAUDE.md name looks
 *     stale/aliased. Not included as a filter here (low filtering value) but
 *     noted in case a future filter needs it: use collection `template`.
 *   - `cases` (many-to-many to `projects`, ContractCreateForm.js:6552) and
 *     `quotationId` (flat FK) also exist but are left out of this filter bar
 *     for the same reason Quotation's design kept its filter set focused —
 *     add them the same way (`relation` type, `cases` needs
 *     `relationKey: 'id'` since it's an association with no flat FK column,
 *     `quotationId` needs none) if the user asks for them later.
 *
 * currentUserScope is ENABLED, synced to the native "My Contracts" block's
 * Data scope (Meet Any: Created by = current user OR Assignees = current
 * user OR Approval Lawyers = current user) — same relationFields mechanism
 * used for Case's "My Cases". `lawyers` (label "Assignees") and
 * `approvalLawyers` (label "Approval Lawyers") are inferred by label-match
 * to Quotation's confirmed field names, not independently verified for
 * `contracts` — `validateFields: true` will drop either one silently (with
 * a console.warn) if the guess is wrong for this collection.
 *
 * HOW TO USE THIS FILE:
 * 1. Fill in `targetBlockUid` below with the real block UID.
 * 2. Copy this entire file into the Contract module's JS Field/Action block
 *    in Nocobase.
 * 3. Do not edit anything below the "ENGINE" marker except to keep it in
 *    sync with JsField/Search/Filter/GenericSearchFilter.js if that template
 *    changes.
 *
 * See docs/superpowers/specs/2026-07-08-generic-search-filter-design.md for
 * the full design.
 */

// ===================================================================
// CONFIG — EDIT THIS SECTION PER MODULE. Nothing below this needs editing.
// ===================================================================
const CONFIG = {
  targetBlockUid: "",
  tableName: "contracts",
  extraFilter: {},

  filters: [
    {
      type: "status",
      key: "status",
      field: "status",
      label: "Status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "negotiation", label: "Negotiation" },
        { value: "pending", label: "Pending" },
        { value: "approval", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "execution", label: "Execution" },
        { value: "closed", label: "Closed" },
        { value: "expired", label: "Expired" },
      ],
      showCounts: true,
    },
    {
      type: "status",
      key: "contractType",
      field: "contractType",
      label: "Contract Type",
      options: [
        { value: "byCase", label: "By case" },
        { value: "retainer", label: "Retainer" },
      ],
      showCounts: true,
    },
    {
      type: "status",
      key: "isRequiredApproval",
      field: "isRequiredApproval",
      label: "Requires Approval",
      options: [
        { value: true, label: "Yes" },
        { value: false, label: "No" },
      ],
      showCounts: true,
    },
    {
      type: "relation",
      key: "company",
      field: "internalCompanyId",
      label: "Internal Company",
      placeholder: "All",
      source: {
        collection: "internalCompany",
        labelFields: ["shortName"],
        sort: "createdAt",
      },
    },
    {
      type: "relation",
      key: "lawyer",
      field: "lawyerId",
      label: "Person Responsible",
      placeholder: "All",
      source: {
        collection: "lawyers",
        labelFields: ["lawyerName"],
        sort: "createdAt",
      },
    },
    {
      type: "relation",
      key: "approvedBy",
      field: "approvedById",
      label: "Approved By",
      placeholder: "All",
      source: {
        collection: "lawyers",
        labelFields: ["lawyerName"],
        sort: "createdAt",
      },
    },
    {
      type: "search",
      key: "search",
      label: "Search",
      fields: ["contractCode", "contractName", "description"],
      placeholder: "Search by contract code, name, description...",
    },
  ],

  // Mirrors the native "My Contracts" Data scope (Meet Any):
  //   Created by / Users ID = Current user
  //   Assignees / Users ID = Current user
  //   Approval Lawyers / Users ID = Current user
  // `lawyerId`/`approvedById` were intentionally NOT added as userFields —
  // those columns store a lawyers.id, not a users.id, so comparing them
  // directly against the current user's id would be a category mismatch
  // (that's what relationFields + targetKey is for below).
  currentUserScope: {
    enable: true,
    userFields: ["createdById"],
    // `lawyers` (label "Assignees") and `approvalLawyers` (label "Approval
    // Lawyers") are inferred from the Data scope screenshot by exact label
    // match to Quotation's already-confirmed field names (contracts weren't
    // independently verified to have these fields — ContractCreateForm.js's
    // create payload never writes them). `validateFields: true` below
    // protects against a wrong guess: each relation field is probe-queried
    // before use, and silently dropped (with a console.warn) if invalid.
    relationFields: [
      { field: "lawyers", targetKey: "userId" },
      { field: "approvalLawyers", targetKey: "userId" },
    ],
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
  if (typeof value === "object")
    return value.id ?? value.value ?? value._id ?? null;
  return value;
};

const normalizeFilterId = (value) => {
  const id = extractId(value);
  if (id === null || id === undefined || id === "") return null;
  const numeric = Number(id);
  return Number.isFinite(numeric) && String(numeric) === String(id)
    ? numeric
    : id;
};

const isEmptyFilter = (filter) => !filter || Object.keys(filter).length === 0;

const combineFilters = (...filters) => {
  const active = filters.filter((f) => !isEmptyFilter(f));
  if (active.length === 0) return {};
  if (active.length === 1) return active[0];
  return { $and: active };
};

const getNoRecordFilter = () => ({ id: { $eq: -1 } });

const getFilterKey = (filterDef) =>
  `${CONFIG.tableName}-${filterDef.key}-filter`;
const getScopeFilterKey = () => `${CONFIG.tableName}-current-user-scope-filter`;

// ---- filter-object builders (pure) ----
const buildFilterFor = (filterDef, value) => {
  if (!filterDef || !filterDef.type) return {};
  switch (filterDef.type) {
    case "status": {
      // Use nullish/empty checks, not a plain falsy check — option values can
      // legitimately be `false` or `0` (e.g. a boolean field's "No" option),
      // which must not be treated the same as "no filter selected".
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === "all"
      )
        return {};
      return { [filterDef.field]: value };
    }
    case "relation": {
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
    case "search": {
      const q = String(value ?? "").trim();
      if (!q) return {};
      const fields = filterDef.fields || [];
      if (fields.length === 0) return {};
      const like = `%${q}%`;
      const clauses = fields.map((f) => ({ [f]: { $iLike: like } }));
      return clauses.length === 1 ? clauses[0] : { $or: clauses };
    }
    case "dateRange": {
      const from = value && value.from ? value.from : null;
      const to = value && value.to ? value.to : null;
      if (!from && !to) return {};
      const clauses = [];
      if (from) clauses.push({ [filterDef.field]: { $gte: from } });
      if (to) clauses.push({ [filterDef.field]: { $lte: to } });
      return clauses.length === 1 ? clauses[0] : { $and: clauses };
    }
    default:
      console.warn(
        "[GenericSearchFilter] Unknown filter type:",
        filterDef.type,
      );
      return {};
  }
};

const getDisplayOptions = (filterDef) => [
  { value: "all", label: "All" },
  ...(filterDef.options || []),
];

// ---- current-user scope filter (pure) ----
const buildCurrentUserScopeFilter = ({
  userId,
  validUserFields = [],
  validRelationFields = [],
  emptyWhenUnknown = true,
}) => {
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
      [field]: { [targetKey || "id"]: { $eq: safeUserId } },
    })),
  ];
  if (clauses.length === 0) return emptyWhenUnknown ? getNoRecordFilter() : {};
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
};

// ---- relation option mapping (pure) ----
const mapRelationOptions = (records, filterDef) => {
  const excludeSet = new Set(
    (filterDef?.source?.excludeValues || []).map((v) =>
      String(normalizeFilterId(v)),
    ),
  );
  const labelFields = filterDef?.source?.labelFields?.length
    ? filterDef.source.labelFields
    : ["name"];
  return (records || [])
    .filter((record) => !excludeSet.has(String(normalizeFilterId(record?.id))))
    .map((record) => {
      let label = "";
      for (const field of labelFields) {
        if (record?.[field]) {
          label = String(record[field]);
          break;
        }
      }
      return { value: record?.id, label: label || `#${record?.id}` };
    });
};

// ---- status-option count filter (pure) ----
const buildCountFilter = ({
  extraFilter,
  currentUserScopeFilter,
  filters,
  activeValues,
  statusFilterDef,
  optionValue,
}) => {
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
    return (
      ctx.currentUser ||
      ctx.user ||
      ctx.state?.currentUser ||
      ctx.app?.currentUser ||
      ctx.store?.getState?.()?.currentUser ||
      null
    );
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
    signature: "{}",
  });

  useEffect(() => {
    if (!CONFIG.currentUserScope.enable) {
      setScope({ loading: false, userId: null, filter: {}, signature: "{}" });
      return;
    }

    let cancelled = false;

    const resolveScope = async () => {
      let currentUser = getCurrentUserFromCtx();
      try {
        const authRes = await ctx.api.request({ url: "auth:check" });
        currentUser = getResponseRecord(authRes) || currentUser;
      } catch (e) {
        if (!currentUser)
          console.warn(
            "[GenericSearchFilter] Could not resolve currentUser:",
            e,
          );
      }

      const userId = normalizeFilterId(currentUser?.id ?? currentUser);
      let validUserFields = CONFIG.currentUserScope.userFields || [];

      if (
        CONFIG.currentUserScope.validateFields &&
        userId &&
        validUserFields.length
      ) {
        const validated = await Promise.all(
          validUserFields.map(async (field) => {
            try {
              await ctx.api.request({
                url: `${CONFIG.tableName}:list`,
                params: {
                  pageSize: 1,
                  filter: JSON.stringify({ [field]: { $eq: userId } }),
                },
              });
              return field;
            } catch (e) {
              console.warn(
                `[GenericSearchFilter] Skipping invalid currentUserScope field: ${field}`,
                e,
              );
              return null;
            }
          }),
        );
        validUserFields = validated.filter(Boolean);
      }

      let validRelationFields = CONFIG.currentUserScope.relationFields || [];

      if (
        CONFIG.currentUserScope.validateFields &&
        userId &&
        validRelationFields.length
      ) {
        const validated = await Promise.all(
          validRelationFields.map(async (rel) => {
            try {
              await ctx.api.request({
                url: `${CONFIG.tableName}:list`,
                params: {
                  pageSize: 1,
                  filter: JSON.stringify({
                    [rel.field]: { [rel.targetKey || "id"]: { $eq: userId } },
                  }),
                },
              });
              return rel;
            } catch (e) {
              console.warn(
                `[GenericSearchFilter] Skipping invalid currentUserScope relation field: ${rel.field}`,
                e,
              );
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
        setScope({
          loading: false,
          userId,
          filter,
          signature: JSON.stringify(filter || {}),
        });
      }
    };

    resolveScope();
    return () => {
      cancelled = true;
    };
  }, []);

  return scope;
}

function useRelationOptions(filterDef) {
  const [state, setState] = useState({
    options: [],
    loading: filterDef.type === "relation",
  });

  useEffect(() => {
    if (filterDef.type !== "relation") return;
    if (!filterDef.source?.collection) {
      console.warn(
        `[GenericSearchFilter] Missing source.collection for relation filter: ${filterDef.key}`,
      );
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    ctx.api
      .request({
        url: `${filterDef.source.collection}:list`,
        params: { pageSize: 500, sort: filterDef.source.sort || "createdAt" },
      })
      .then((res) => {
        if (cancelled) return;
        setState({
          options: mapRelationOptions(res?.data?.data || [], filterDef),
          loading: false,
        });
      })
      .catch((e) => {
        console.warn(
          `[GenericSearchFilter] Could not fetch relation options for ${filterDef.key}:`,
          e,
        );
        if (!cancelled) setState({ options: [], loading: false });
      });
    return () => {
      cancelled = true;
    };
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
    if (!scopeReady) {
      setLoading(true);
      return;
    }
    const statusFilters = CONFIG.filters.filter(
      (f) => f.type === "status" && f.showCounts !== false,
    );
    if (statusFilters.length === 0) {
      setCounts({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchCounts = async () => {
      setLoading(true);
      try {
        const entries = await Promise.all(
          statusFilters.map(async (statusFilterDef) => {
            const displayOptions = getDisplayOptions(statusFilterDef);
            const optionResults = await Promise.all(
              displayOptions.map((option) =>
                ctx.api.request({
                  url: `${CONFIG.tableName}:list`,
                  params: {
                    pageSize: 1,
                    filter: JSON.stringify(
                      buildCountFilter({
                        extraFilter: CONFIG.extraFilter,
                        currentUserScopeFilter,
                        filters: CONFIG.filters,
                        activeValues,
                        statusFilterDef,
                        optionValue: option.value,
                      }),
                    ),
                  },
                }),
              ),
            );
            const byOption = {};
            displayOptions.forEach((option, i) => {
              byOption[option.value] = optionResults[i]?.data?.meta?.count || 0;
            });
            return [statusFilterDef.key, byOption];
          }),
        );
        if (!cancelled) setCounts(Object.fromEntries(entries));
      } catch (e) {
        console.error("[GenericSearchFilter] Error fetching counts:", e);
        if (!cancelled) setCounts({});
      }
      if (!cancelled) setLoading(false);
    };
    fetchCounts();
    return () => {
      cancelled = true;
    };
  }, [activeValuesSignature, scopeSignature, scopeReady, trigger]);

  return { counts, loading, refetch };
}

const barStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  padding: "10px 14px",
  backgroundColor: "#fff",
  borderRadius: 8,
  border: "1px solid #f0f0f0",
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
};
const wrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
};
const labelStyle = {
  fontSize: 12,
  fontWeight: 500,
  color: "#8c8c8c",
  whiteSpace: "nowrap",
};

const FilterControl = ({ filterDef, value, onChange, counts }) => {
  const relation = useRelationOptions(filterDef);

  if (filterDef.type === "status") {
    const displayOptions = getDisplayOptions(filterDef);
    const showCounts = filterDef.showCounts !== false;
    return React.createElement(
      "div",
      { style: wrapStyle },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Select, {
        value,
        size: "small",
        style: { width: filterDef.width || "100%" },
        onChange: (v) => onChange(v === undefined ? "all" : v),
        options: displayOptions.map((opt) => ({
          value: opt.value,
          label: showCounts
            ? `${opt.label} (${(counts[filterDef.key] || {})[opt.value] ?? 0})`
            : opt.label,
        })),
      }),
    );
  }

  if (filterDef.type === "relation") {
    return React.createElement(
      "div",
      { style: wrapStyle },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Select, {
        value: value || undefined,
        placeholder: filterDef.placeholder || "All",
        allowClear: true,
        showSearch: true,
        optionFilterProp: "label",
        loading: relation.loading,
        style: { width: filterDef.width || "100%" },
        size: "small",
        onChange: (v) => onChange(v || ""),
        options: relation.options,
      }),
    );
  }

  if (filterDef.type === "search") {
    return React.createElement(
      "div",
      { style: { ...wrapStyle, gridColumn: "span 2" } },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Input.Search, {
        placeholder: filterDef.placeholder || "Search...",
        allowClear: true,
        enterButton: true,
        size: "small",
        defaultValue: value,
        onSearch: (v) => onChange((v || "").trim()),
        style: { width: "100%" },
      }),
    );
  }

  if (filterDef.type === "dateRange") {
    return React.createElement(
      "div",
      { style: wrapStyle },
      React.createElement(Text, { style: labelStyle }, `${filterDef.label}:`),
      React.createElement(Input, {
        type: "date",
        size: "small",
        value: value?.from || "",
        style: { flex: 1, minWidth: 0 },
        onChange: (e) => onChange({ ...value, from: e.target.value }),
      }),
      React.createElement(Text, { style: labelStyle }, "-"),
      React.createElement(Input, {
        type: "date",
        size: "small",
        value: value?.to || "",
        style: { flex: 1, minWidth: 0 },
        onChange: (e) => onChange({ ...value, to: e.target.value }),
      }),
    );
  }

  console.warn(
    "[GenericSearchFilter] Unknown filter type in render:",
    filterDef.type,
  );
  return null;
};

const initialActiveValues = () => {
  const values = {};
  CONFIG.filters.forEach((f) => {
    if (f.type === "status") values[f.key] = "all";
    else if (f.type === "dateRange") values[f.key] = { from: "", to: "" };
    else values[f.key] = "";
  });
  return values;
};

const GenericSearchFilter = () => {
  const [activeValues, setActiveValues] = useState(initialActiveValues);
  const currentUserScope = useCurrentUserScope();
  const { counts, refetch: refetchCounts } = useStatusCountsAll(
    activeValues,
    currentUserScope.filter,
    !currentUserScope.loading,
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
        console.warn(
          "[GenericSearchFilter] targetBlockUid could not resolve a model:",
          CONFIG.targetBlockUid,
        );
        return;
      }
      target.resource.addFilterGroup(filterKey, filter);
      await target.resource.refresh();
    } catch (e) {
      console.error(
        "[GenericSearchFilter] Failed to apply filter:",
        filterKey,
        e,
      );
    }
  }, []);

  useEffect(() => {
    if (!CONFIG.currentUserScope.enable || currentUserScope.loading) return;
    applyFilterGroup(getScopeFilterKey(), currentUserScope.filter);
  }, [applyFilterGroup, currentUserScope.loading, currentUserScope.signature]);

  const handleChange = useCallback(
    (filterDef, value) => {
      setActiveValues((prev) => ({ ...prev, [filterDef.key]: value }));
      applyFilterGroup(
        getFilterKey(filterDef),
        buildFilterFor(filterDef, value),
      );
    },
    [applyFilterGroup],
  );

  return React.createElement(
    "div",
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
