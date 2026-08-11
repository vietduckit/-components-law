const CONFIG = {
    targetBlockUid: '5cyaa66tjwi',
    tableName: 'legalReference',
    statusField: 'status',
    startDateField: 'date',
    deadlineField: 'deadline',
    statusFilterKey: 'legalReference-status-filter',
    overdueFilterKey: 'legalReference-overdue-filter',
    searchFilterKey: 'legalReference-search-filter',
    userFilterKey: 'legalReference-user-filter',
    overdueFilter: {
        enable: false,
        label: 'Overdue',
        filterKey: 'legalReference-overdue-filter',
    },
    searchFilter: {
        enable: false,
        label: 'Search',
        placeholder: 'Tìm theo Title, Reference Code, Description...',
        filterKey: 'legalReference-search-filter',
    },
    advancedPanel: {
        enable: true,
        defaultExpanded: true,
        expandLabel: 'Mở rộng',
        collapseLabel: 'Thu gọn',
    },
    extraFilter: {},
    companyFilter: {
        enable: true,
        fieldName: 'internalCompanyId',
        placeholder: 'Công ty',
        dropdownWidth: 150,
        filterKey: 'legalReference-company-filter',
    },
    userFilter: {
        enable: true,
        placeholder: 'Người tạo',
        dropdownWidth: 150,
        userFields: ['createdById'],
        assigneeRelationField: null,
        excludeUserIds: [1, 53],
    },
    currentUserScope: {
        enable: false,
        filterKey: 'legalReference-current-user-scope-filter',
        userFields: ['createdById'],
        assigneeRelationField: null,
        emptyWhenUnknown: true,
        validateFields: true,
    }
};

const { useState, useEffect, useCallback } = ctx.React;
const { Typography, Select, Input, Button } = ctx.antd;
const { Text } = Typography;

const getTodayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const getTomorrowStart = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const getFourDaysLaterStart = () => { const d = new Date(); d.setDate(d.getDate() + 4); d.setHours(0, 0, 0, 0); return d.toISOString(); };

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
    (values || []).map(normalizeFilterId).filter(value => value !== null && value !== undefined).map(value => String(value))
)).map(value => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && String(numeric) === value ? numeric : value;
});

const isEmptyFilter = (filter) => !filter || Object.keys(filter).length === 0;

const combineFilters = (...filters) => {
    const activeFilters = filters.filter(filter => !isEmptyFilter(filter));
    if (activeFilters.length === 0) return {};
    if (activeFilters.length === 1) return activeFilters[0];
    return { $and: activeFilters };
};

const getNoRecordFilter = () => ({ id: { $eq: -1 } });

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

const getApiErrorDetails = (error) => ({
    message: error?.message,
    status: error?.response?.status,
    data: error?.response?.data,
    url: error?.config?.url,
    params: error?.config?.params,
});

const getScalarUserFilters = (fields, userId) => {
    const safeUserId = normalizeFilterId(userId);
    if (!safeUserId) return [];
    return uniqueFilterIds(fields).map(field => ({ [field]: { $eq: safeUserId } }));
};

const getRelatedUserFilter = ({ userId, lawyerIds, userFields, assigneeRelationField }) => {
    const filters = getScalarUserFilters(userFields, userId);
    const safeLawyerIds = uniqueFilterIds(lawyerIds);
    if (assigneeRelationField && safeLawyerIds.length) {
        filters.push({ [assigneeRelationField]: { id: { $in: safeLawyerIds } } });
    }
    if (filters.length === 0) return {};
    if (filters.length === 1) return filters[0];
    return { $or: filters };
};

const getLawyerIdsFromRows = (rows, userId) => {
    const safeUserId = normalizeFilterId(userId);
    if (!safeUserId) return [];
    return uniqueFilterIds((rows || [])
        .filter(row => {
            const linkedUserId = normalizeFilterId(row?.userId) || normalizeFilterId(row?.user);
            const createdById = normalizeFilterId(row?.createdById);
            return String(linkedUserId || createdById || '') === String(safeUserId);
        })
        .map(row => row.id));
};

const fetchLawyerIdsForUser = async (userId) => {
    const safeUserId = normalizeFilterId(userId);
    if (!safeUserId) return [];
    try {
        const res = await ctx.api.request({
            url: 'lawyers:list',
            params: {
                pageSize: 100,
                fields: 'id,lawyerName,userId,createdById',
                filter: JSON.stringify({
                    $or: [
                        { userId: { $eq: safeUserId } },
                        { createdById: { $eq: safeUserId } },
                    ],
                }),
            },
        });
        const ids = getLawyerIdsFromRows(res?.data?.data || [], safeUserId);
        if (ids.length) return ids;
    } catch (e) {
        console.warn('Không resolve được lawyer theo currentUser bằng filter, thử fallback:', e);
    }

    try {
        const res = await ctx.api.request({
            url: 'lawyers:list',
            params: { pageSize: 1000, fields: 'id,lawyerName,userId,createdById' },
        });
        return getLawyerIdsFromRows(res?.data?.data || [], safeUserId);
    } catch (e) {
        console.warn('Không lấy được lawyerIds cho currentUser:', e);
        return [];
    }
};

const getOverdueFilter = (key) => {
    const today = getTodayStart();
    const tomorrow = getTomorrowStart();
    const fourDaysLater = getFourDaysLaterStart();
    const s = CONFIG.startDateField;
    const d = CONFIG.deadlineField;
    switch (key) {
        case 'overdue': return { $and: [{ [d]: { $lt: today } }, { $or: [{ [s]: null }, { [s]: { $lt: tomorrow } }] }] };
        case 'nearlyOverdue': return { $and: [{ [d]: { $gte: today } }, { [d]: { $lt: fourDaysLater } }, { $or: [{ [s]: null }, { [s]: { $lt: tomorrow } }] }] };
        case 'onTime': return { $and: [{ [d]: { $gte: fourDaysLater } }, { $or: [{ [s]: null }, { [s]: { $lt: tomorrow } }] }] };
        case 'notStarted': return { [s]: { $gte: tomorrow } };
        case 'noDeadline': return { [d]: null };
        default: return {};
    }
};

const getStatusFilter = (key) => key === 'all' ? {} : { [CONFIG.statusField]: key };

const getSearchFilter = (query) => {
    if (!query) return {};
    const q = `%${query}%`;
    return { $or: [{ title: { $iLike: q } }, { referenceCode: { $iLike: q } }, { description: { $iLike: q } }] };
};

const getUserFilter = (userId, lawyerIds = []) => {
    if (!userId) return {};
    return getRelatedUserFilter({
        userId,
        lawyerIds,
        userFields: CONFIG.userFilter.userFields || ['createdById'],
        assigneeRelationField: CONFIG.userFilter.assigneeRelationField,
    });
};

const STATUS_ITEMS = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'reviewing', label: 'Reviewing' },
    { key: 'published', label: 'Published' },
    { key: 'archived', label: 'Archived' },
];

const OVERDUE_ITEMS = [
    { key: 'all', label: 'All' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'nearlyOverdue', label: 'Nearly Overdue' },
    { key: 'onTime', label: 'On Time' },
    { key: 'notStarted', label: 'Not Started' },
    { key: 'noDeadline', label: 'No Deadline' }
];

const isOverdueFilterEnabled = () => CONFIG.overdueFilter?.enable !== false;
const isSearchFilterEnabled = () => CONFIG.searchFilter?.enable !== false;
const isAdvancedPanelEnabled = () => CONFIG.advancedPanel?.enable !== false;
const getOverdueFilterKey = () => CONFIG.overdueFilter?.filterKey || CONFIG.overdueFilterKey;
const getSearchFilterKey = () => CONFIG.searchFilter?.filterKey || CONFIG.searchFilterKey;

function useStats(activeStatus, activeOverdue, activeCompany, activeUser, activeUserLawyerIds, searchQuery, currentUserFilter, currentUserScopeReady) {
    const [statusCounts, setStatusCounts] = useState({});
    const [overdueCounts, setOverdueCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [trigger, setTrigger] = useState(0);
    const activeUserLawyerIdsSignature = JSON.stringify(uniqueFilterIds(activeUserLawyerIds));
    const currentUserFilterSignature = JSON.stringify(currentUserFilter || {});
    const refetch = useCallback(() => setTrigger(p => p + 1), []);

    useEffect(() => {
        if (!currentUserScopeReady) {
            setLoading(true);
            return;
        }

        const fetchCounts = async () => {
            setLoading(true);
            try {
                const overdueEnabled = isOverdueFilterEnabled();
                const overdueF = overdueEnabled ? getOverdueFilter(activeOverdue) : {};
                const statusF = getStatusFilter(activeStatus);
                const companyF = activeCompany && CONFIG.companyFilter.enable ? { [CONFIG.companyFilter.fieldName]: activeCompany } : {};
                const userF = getUserFilter(activeUser, activeUserLawyerIds);
                const searchF = isSearchFilterEnabled() ? getSearchFilter(searchQuery) : {};

                const [sResults, oResults] = await Promise.all([
                    Promise.all(STATUS_ITEMS.map(s => ctx.api.request({
                        url: `${CONFIG.tableName}:list`,
                        params: {
                            pageSize: 1,
                            filter: JSON.stringify(combineFilters(
                                CONFIG.extraFilter,
                                currentUserFilter,
                                getStatusFilter(s.key),
                                overdueF,
                                companyF,
                                userF,
                                searchF
                            ))
                        }
                    }))),
                    overdueEnabled ? Promise.all(OVERDUE_ITEMS.map(o => ctx.api.request({
                        url: `${CONFIG.tableName}:list`,
                        params: {
                            pageSize: 1,
                            filter: JSON.stringify(combineFilters(
                                CONFIG.extraFilter,
                                currentUserFilter,
                                getOverdueFilter(o.key),
                                statusF,
                                companyF,
                                userF,
                                searchF
                            ))
                        }
                    }))) : Promise.resolve([])
                ]);

                const sCounts = {};
                STATUS_ITEMS.forEach((s, i) => { sCounts[s.key] = sResults[i]?.data?.meta?.count || 0; });
                setStatusCounts(sCounts);

                const oCounts = {};
                if (overdueEnabled) {
                    OVERDUE_ITEMS.forEach((o, i) => { oCounts[o.key] = oResults[i]?.data?.meta?.count || 0; });
                }
                setOverdueCounts(oCounts);
            } catch (e) {
                console.error('Lỗi lấy counts:', getApiErrorDetails(e), e);
                setStatusCounts({});
                setOverdueCounts({});
            }
            setLoading(false);
        };
        fetchCounts();
    }, [activeStatus, activeOverdue, activeCompany, activeUser, activeUserLawyerIdsSignature, searchQuery, currentUserFilterSignature, currentUserScopeReady, trigger]);

    return { statusCounts, overdueCounts, loading, refetch };
}

function useCurrentUserScope() {
    const [scope, setScope] = useState({
        loading: !!CONFIG.currentUserScope.enable,
        userId: null,
        lawyerIds: [],
        filter: {},
        signature: '{}',
    });

    useEffect(() => {
        if (!CONFIG.currentUserScope.enable) {
            setScope({ loading: false, userId: null, lawyerIds: [], filter: {}, signature: '{}' });
            return;
        }

        let cancelled = false;

        const resolveScope = async () => {
            let currentUser = getCurrentUserFromCtx();
            try {
                const authRes = await ctx.api.request({ url: 'auth:check' });
                currentUser = getResponseRecord(authRes) || currentUser;
            } catch (e) {
                if (!currentUser) console.warn('Không lấy được currentUser cho legalReference data scope:', e);
            }

            const userId = normalizeFilterId(currentUser?.id ?? currentUser);
            let validUserFields = CONFIG.currentUserScope.userFields || [];
            let lawyerIds = [];
            let assigneeRelationField = CONFIG.currentUserScope.assigneeRelationField;

            if (userId && assigneeRelationField) {
                lawyerIds = await fetchLawyerIdsForUser(userId);
            }

            if (CONFIG.currentUserScope.validateFields && userId && validUserFields.length) {
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
                            console.warn(`Bỏ qua legalReference scope field không hợp lệ: ${field}`, e);
                            return null;
                        }
                    })
                );
                validUserFields = validated.filter(Boolean);
            }

            if (CONFIG.currentUserScope.validateFields && assigneeRelationField && lawyerIds.length) {
                try {
                    await ctx.api.request({
                        url: `${CONFIG.tableName}:list`,
                        params: {
                            pageSize: 1,
                            filter: JSON.stringify({ [assigneeRelationField]: { id: { $in: lawyerIds } } }),
                        },
                    });
                } catch (e) {
                    console.warn(`Bỏ qua legalReference assignee relation không hợp lệ: ${assigneeRelationField}`, e);
                    assigneeRelationField = null;
                }
            }

            let filter = getRelatedUserFilter({
                userId,
                lawyerIds,
                userFields: validUserFields,
                assigneeRelationField,
            });

            if (isEmptyFilter(filter) && CONFIG.currentUserScope.emptyWhenUnknown) {
                filter = getNoRecordFilter();
            }

            if (!cancelled) {
                setScope({
                    loading: false,
                    userId,
                    lawyerIds,
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

function useCompanies() {
    const [companies, setCompanies] = useState([]);
    useEffect(() => {
        if (!CONFIG.companyFilter.enable) return;
        ctx.api.request({ url: 'internalCompany:list', params: { pageSize: 500, fields: 'id,name,shortName', sort: 'createdAt' } })
            .then(res => setCompanies(res?.data?.data || []))
            .catch(e => console.error('Lỗi lấy công ty:', e));
    }, []);
    return companies;
}

function useUsers() {
    const [users, setUsers] = useState([]);
    useEffect(() => {
        if (!CONFIG.userFilter.enable) return;
        const resolveLawyers = !!CONFIG.userFilter.assigneeRelationField;
        Promise.all([
            ctx.api.request({ url: 'users:list', params: { pageSize: 500, fields: 'id,nickname,username', sort: 'nickname' } }),
            resolveLawyers
                ? ctx.api.request({ url: 'lawyers:list', params: { pageSize: 1000, fields: 'id,lawyerName,userId,createdById' } }).catch(() => ({ data: { data: [] } }))
                : Promise.resolve({ data: { data: [] } }),
        ]).then(([usersRes, lawyersRes]) => {
            const rows = usersRes?.data?.data || [];
            const lawyerRows = lawyersRes?.data?.data || [];
            const excludedIds = (CONFIG.userFilter.excludeUserIds || []).map(String);
            const lawyerIdsByUserId = new Map();

            lawyerRows.forEach(lawyer => {
                const linkedUserId = normalizeFilterId(lawyer?.userId) || normalizeFilterId(lawyer?.user);
                const createdById = normalizeFilterId(lawyer?.createdById);
                const userIds = uniqueFilterIds([linkedUserId, createdById]);
                userIds.forEach(userId => {
                    const key = String(userId);
                    const current = lawyerIdsByUserId.get(key) || [];
                    lawyerIdsByUserId.set(key, uniqueFilterIds([...current, lawyer.id]));
                });
            });

            const filters = rows.filter(u => !excludedIds.includes(String(u.id)));
            setUsers(filters.map(u => ({
                value: u.id,
                label: u.nickname || u.username,
                lawyerIds: lawyerIdsByUserId.get(String(u.id)) || [],
            })));
        }).catch(e => console.error('Lỗi lấy users:', e));
    }, []);
    return users;
}

const labelStyle = { fontSize: 12, fontWeight: 500, color: '#8c8c8c', whiteSpace: 'nowrap' };
const wrapStyle = { display: 'flex', alignItems: 'center', gap: 4 };

const UnifiedFilterDropdown = () => {
    const [activeStatus, setActiveStatus] = useState('all');
    const [activeOverdue, setActiveOverdue] = useState('all');
    const [activeCompany, setActiveCompany] = useState(undefined);
    const [activeUser, setActiveUser] = useState(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [advancedExpanded, setAdvancedExpanded] = useState(CONFIG.advancedPanel?.defaultExpanded !== false);

    const currentUserScope = useCurrentUserScope();
    const companies = useCompanies();
    const users = useUsers();
    const activeUserOption = users.find(user => String(user.value) === String(activeUser));
    const activeUserLawyerIds = activeUserOption?.lawyerIds || [];
    const overdueEnabled = isOverdueFilterEnabled();
    const searchEnabled = isSearchFilterEnabled();
    const advancedFiltersAvailable = CONFIG.companyFilter.enable || CONFIG.userFilter.enable || searchEnabled;
    const showAdvancedFilters = !isAdvancedPanelEnabled() || advancedExpanded;
    const { statusCounts, overdueCounts, loading, refetch } = useStats(
        activeStatus,
        activeOverdue,
        activeCompany,
        activeUser,
        activeUserLawyerIds,
        searchQuery,
        currentUserScope.filter,
        !currentUserScope.loading
    );

    useEffect(() => {
        const engine = ctx.engine || ctx.app;
        if (!engine) return;
        if (!engine.__nocobaseReloaders) engine.__nocobaseReloaders = new Set();
        engine.__nocobaseReloaders.add(refetch);
        return () => engine.__nocobaseReloaders.delete(refetch);
    }, [refetch]);

    const applyFilter = useCallback(async (key, filter) => {
        try {
            const target = ctx.engine?.getModel(CONFIG.targetBlockUid);
            if (!target) return;
            target.resource.addFilterGroup(key, filter);
            await target.resource.refresh();
        } catch (e) { console.error('Filter error:', e); }
    }, []);

    useEffect(() => {
        if (!CONFIG.currentUserScope.enable || currentUserScope.loading) return;
        applyFilter(CONFIG.currentUserScope.filterKey, currentUserScope.filter);
    }, [applyFilter, currentUserScope.loading, currentUserScope.signature]);

    useEffect(() => {
        if (overdueEnabled) return;
        applyFilter(getOverdueFilterKey(), {});
    }, [applyFilter, overdueEnabled]);

    const handleStatusChange = (v) => { const val = v || 'all'; setActiveStatus(val); applyFilter(CONFIG.statusFilterKey, getStatusFilter(val)); };
    const handleOverdueChange = (v) => { const val = v || 'all'; setActiveOverdue(val); applyFilter(getOverdueFilterKey(), getOverdueFilter(val)); };
    const handleCompanyChange = (v) => { setActiveCompany(v); applyFilter(CONFIG.companyFilter.filterKey, v ? { [CONFIG.companyFilter.fieldName]: v } : {}); };
    const handleUserChange = (v) => {
        setActiveUser(v);
        const userOption = users.find(user => String(user.value) === String(v));
        applyFilter(CONFIG.userFilterKey, getUserFilter(v, userOption?.lawyerIds || []));
    };
    const handleSearch = (v) => { const q = (v || '').trim(); setSearchQuery(q); applyFilter(getSearchFilterKey(), getSearchFilter(q)); };

    return (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '10px 14px', backgroundColor: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>

            {/* Status */}
            <div style={wrapStyle}>
                <Text style={labelStyle}>Status:</Text>
                <Select value={activeStatus} onChange={handleStatusChange} style={{ width: 150 }} size="small"
                    options={STATUS_ITEMS.map(s => ({ value: s.key, label: `${s.label} (${statusCounts[s.key] ?? 0})` }))} />
            </div>

            {/* Overdue */}
            {overdueEnabled && (
                <div style={wrapStyle}>
                    <Text style={labelStyle}>{CONFIG.overdueFilter?.label || 'Overdue'}:</Text>
                    <Select value={activeOverdue} onChange={handleOverdueChange} style={{ width: 150 }} size="small"
                        options={OVERDUE_ITEMS.map(s => ({ value: s.key, label: `${s.label} (${overdueCounts[s.key] ?? 0})` }))} />
                </div>
            )}
            {/* Company */}
            {showAdvancedFilters && CONFIG.companyFilter.enable && (
                <div style={wrapStyle}>
                    <Text style={labelStyle}>Company:</Text>
                    <Select placeholder="All" allowClear value={activeCompany} onChange={handleCompanyChange}
                        style={{ width: CONFIG.companyFilter.dropdownWidth }} size="small"
                        options={companies.map(c => ({ value: c.id, label: c.shortName || c.name || `#${c.id}` }))} />
                </div>
            )}

            {/* User */}
            {showAdvancedFilters && CONFIG.userFilter.enable && (
                <div style={wrapStyle}>
                    <Text style={labelStyle}>Staff:</Text>
                    <Select placeholder="All" allowClear showSearch value={activeUser} onChange={handleUserChange}
                        style={{ width: CONFIG.userFilter.dropdownWidth }} size="small"
                        optionFilterProp="label" options={users} />
                </div>
            )}
            {/* Search */}
            {showAdvancedFilters && searchEnabled && (
                <div style={{ ...wrapStyle, flex: 1, minWidth: 200 }}>
                    <Text style={labelStyle}>{CONFIG.searchFilter?.label || 'Search'}:</Text>
                    <Input.Search
                        placeholder={CONFIG.searchFilter?.placeholder || 'Tìm kiếm...'}
                        allowClear enterButton size="small"
                        onSearch={handleSearch}
                        style={{ flex: 1, maxWidth: 380 }}
                    />
                </div>
            )}

        </div>
    );
};

ctx.render(<UnifiedFilterDropdown />);
