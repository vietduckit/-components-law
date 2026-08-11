const CONFIG = {
    targetBlockUid: 'f0d8c610d00', // Block UID of the table/kanban/list to apply filters on
    tableName: 'legalReference',          // Collection name (e.g. legalReference, tasks, lawyers)
    statusField: 'status',          // Field name for status (e.g. status, lawyerType)
    statusFilterKey: 'legalReference-status-filter', // Filter group name for status filter

    // Status options to filter by (buttons)
    statuses: [
        { key: 'toDo', label: 'Chưa thực hiện', color: '#8c8c8c' },
        { key: 'inProgress', label: 'Đang xử lý', color: '#fa8c16' },
        { key: 'done', label: 'Hoàn thành', color: '#52c41a' },
        { key: 'cancelled', label: 'Đã hủy', color: '#ff4d4f' }
    ],

    // Company filter configuration (optional)
    companyFilter: {
        enable: true,
        fieldName: 'internalCompanyId',       // Field in the target collection that references the company
        placeholder: 'Lọc theo Công ty',      // Placeholder text for the Select dropdown
        dropdownWidth: 220,                    // Width in pixels of the dropdown
        filterKey: 'legalReference-company-filter', // Filter group name for company filter
    },

    titleFilter: {
        enable: true,
        fields: ['title'],
        placeholder: 'Lọc theo reference',
        filterKey: 'legalReference-title-filter',
    },

    userFilter: {
        enable: true,
        placeholder: 'Lọc theo nhân sự',
        dropdownWidth: 220,
        filterKey: 'legalReference-user-filter',
        userFields: ['managerId'],
        excludeUserIds: [1, 53],
    },

    currentUserScope: {
        enable: true,
        filterKey: 'legalReference-current-user-scope-filter',
        userFields: ['createdById', 'managerId'],
        emptyWhenUnknown: true,
        validateFields: true,
    }
};

const { useState, useEffect, useCallback } = ctx.React;
const { Badge, Spin, Typography, Select, Input } = ctx.antd;
const { Text } = Typography;

// ==================== Config Buttons & Colors ====================
const STATS = [
    { key: 'all', label: 'Tất cả', color: '#1890ff', filter: {} },
    ...CONFIG.statuses.map(s => ({
        key: s.key,
        label: s.label,
        color: s.color,
        filter: { [CONFIG.statusField]: s.key }
    }))
];

const isEmptyFilter = (filter) => !filter || Object.keys(filter).length === 0;

const extractId = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value.id ?? value.value ?? value._id ?? null;
    return value;
};

const uniqueValues = (values) => Array.from(new Set((values || []).map(extractId).filter(Boolean).map(String)));

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

const combineFilters = (...filters) => {
    const activeFilters = filters.filter(filter => !isEmptyFilter(filter));
    if (activeFilters.length === 0) return {};
    if (activeFilters.length === 1) return activeFilters[0];
    return { $and: activeFilters };
};

const getNoRecordFilter = () => ({ id: { $eq: -1 } });

const getAnyFieldFilter = (fields, value) => {
    const safeValue = extractId(value);
    if (!safeValue) return {};
    const filters = uniqueValues(fields).map(field => ({ [field]: { $eq: safeValue } }));
    if (filters.length === 0) return {};
    if (filters.length === 1) return filters[0];
    return { $or: filters };
};

const getCompanyFilter = (companyId) => {
    if (!companyId || !CONFIG.companyFilter.enable) return {};
    return { [CONFIG.companyFilter.fieldName]: companyId };
};

const getTitleFilter = (query) => {
    const value = (query || '').trim();
    if (!value || !CONFIG.titleFilter.enable) return {};
    const keyword = `%${value}%`;
    const fields = CONFIG.titleFilter.fields?.length ? CONFIG.titleFilter.fields : ['projectName'];
    return {
        $or: fields.map(field => ({ [field]: { $iLike: keyword } }))
    };
};

const getUserFilter = (userId) => {
    if (!userId || !CONFIG.userFilter.enable) return {};
    return getAnyFieldFilter(CONFIG.userFilter.userFields || ['managerId'], userId);
};

const getCurrentUserScopeFilter = ({ userId, validUserFields }) => {
    if (!CONFIG.currentUserScope.enable) return {};
    if (!userId) return CONFIG.currentUserScope.emptyWhenUnknown ? getNoRecordFilter() : {};
    const fields = Array.isArray(validUserFields) ? validUserFields : CONFIG.currentUserScope.userFields;
    const filter = getAnyFieldFilter(fields, userId);
    return isEmptyFilter(filter) && CONFIG.currentUserScope.emptyWhenUnknown ? getNoRecordFilter() : filter;
};

// ==================== Tinh chỉnh Style ====================
const styles = {
    filterItem: (isActive, color) => ({
        padding: '4px 12px',
        background: isActive ? `${color}10` : '#fafafa',
        border: `1px solid ${isActive ? color : '#f0f0f0'}`,
        borderRadius: '20px', // Kiểu viên thuốc hiện đại
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: '32px',
    }),
    dot: (color, isActive) => ({
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: color,
        opacity: isActive ? 1 : 0.5,
    }),
    badgeSmall: (isActive, color) => ({
        backgroundColor: isActive ? color : '#e8e8e8',
        color: isActive ? '#fff' : '#8c8c8c',
        fontSize: '10px',
        height: '18px',
        minWidth: '18px',
        lineHeight: '18px',
        padding: '0 6px',
        boxShadow: 'none',
    })
};

// ==================== Data Hook ====================
function useStats(selectedCompany, selectedUser, titleQuery, currentUserFilter, currentUserScopeReady) {
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [trigger, setTrigger] = useState(0);
    const currentUserFilterSignature = JSON.stringify(currentUserFilter || {});

    const refetch = useCallback(() => {
        setTrigger(prev => prev + 1);
    }, []);

    useEffect(() => {
        if (!currentUserScopeReady) {
            setLoading(true);
            return;
        }

        const fetch = async () => {
            setLoading(true);
            try {
                const results = await Promise.all(
                    STATS.map(s => {
                        const filter = combineFilters(
                            currentUserFilter,
                            s.filter,
                            getCompanyFilter(selectedCompany),
                            getUserFilter(selectedUser),
                            getTitleFilter(titleQuery)
                        );
                        return ctx.api.request({
                            url: `${CONFIG.tableName}:list`,
                            params: {
                                pageSize: 1,
                                filter: JSON.stringify(filter)
                            },
                        });
                    })
                );
                const c = {};
                STATS.forEach((s, i) => {
                    c[s.key] = results[i]?.data?.meta?.count || 0;
                });
                setCounts(c);
            } catch (e) {
                console.error('Lỗi lấy count:', e);
                setCounts({});
            }
            setLoading(false);
        };
        fetch();
    }, [selectedCompany, selectedUser, titleQuery, currentUserFilterSignature, currentUserScopeReady, trigger]);

    return { counts, loading, refetch };
}

// ==================== Current User Scope Hook ====================
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
                if (!currentUser) console.warn('Không lấy được currentUser cho data scope:', e);
            }

            const userId = extractId(currentUser?.id ?? currentUser);
            let validUserFields = CONFIG.currentUserScope.userFields || [];

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
                            console.warn(`Bỏ qua field scope không hợp lệ: ${field}`, e);
                            return null;
                        }
                    })
                );
                validUserFields = validated.filter(Boolean);
            }

            const filter = getCurrentUserScopeFilter({ userId, validUserFields });
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

// ==================== Company Fetch Hook ====================
function useCompanies() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!CONFIG.companyFilter.enable) return;
        const fetchCompanies = async () => {
            setLoading(true);
            try {
                const res = await ctx.api.request({
                    url: 'internalCompany:list',
                    params: {
                        pageSize: 500,
                        fields: 'id,name,shortName',
                        sort: 'createdAt'
                    }
                });
                setCompanies(res?.data?.data || []);
            } catch (e) {
                console.error('Lỗi lấy danh sách công ty:', e);
            }
            setLoading(false);
        };
        fetchCompanies();
    }, []);

    return { companies, loading };
}

// ==================== User Fetch Hook ====================
function useUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!CONFIG.userFilter.enable) return;
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const res = await ctx.api.request({
                    url: 'users:list',
                    params: {
                        pageSize: 500,
                        fields: 'id,nickname,username,email',
                        sort: 'nickname'
                    }
                });
                const excludedIds = (CONFIG.userFilter.excludeUserIds || []).map(String);
                const rows = (res?.data?.data || []).filter(u => !excludedIds.includes(String(u.id)));
                setUsers(rows.map(u => ({
                    value: u.id,
                    label: u.nickname || u.username || u.email || `User #${u.id}`
                })));
            } catch (e) {
                console.error('Lấy danh sách nhân sự thất bại:', e);
            }
            setLoading(false);
        };
        fetchUsers();
    }, []);

    return { users, loading };
}

// ==================== Main Component ====================
const StatsFilter = () => {
    const [selectedCompany, setSelectedCompany] = useState(undefined);
    const [selectedUser, setSelectedUser] = useState(undefined);
    const [titleDraft, setTitleDraft] = useState('');
    const [titleQuery, setTitleQuery] = useState('');
    const currentUserScope = useCurrentUserScope();
    const { counts, loading: countsLoading, refetch: refetchCounts } = useStats(
        selectedCompany,
        selectedUser,
        titleQuery,
        currentUserScope.filter,
        !currentUserScope.loading
    );
    const { companies, loading: companiesLoading } = useCompanies();
    const { users, loading: usersLoading } = useUsers();
    const [active, setActive] = useState('all');

    // Register refresh reloader under the unified set
    useEffect(() => {
        const engine = ctx.engine || ctx.app;
        if (!engine) return;

        if (!engine.__nocobaseReloaders) {
            engine.__nocobaseReloaders = new Set();
        }

        engine.__nocobaseReloaders.add(refetchCounts);

        return () => {
            engine.__nocobaseReloaders.delete(refetchCounts);
        };
    }, [refetchCounts]);

    const applyFilterGroup = useCallback(async (filterKey, filter) => {
        const target = ctx.engine?.getModel(CONFIG.targetBlockUid);
        if (!target) return;
        target.resource.addFilterGroup(filterKey, filter);
        await target.resource.refresh();
    }, []);

    useEffect(() => {
        if (!CONFIG.currentUserScope.enable || currentUserScope.loading) return;
        applyFilterGroup(CONFIG.currentUserScope.filterKey, currentUserScope.filter).catch((e) => {
            console.error('Áp dụng data scope currentUser thất bại:', e);
        });
    }, [applyFilterGroup, currentUserScope.loading, currentUserScope.signature]);

    const handleStatusClick = async (stat) => {
        setActive(stat.key);
        try {
            await applyFilterGroup(CONFIG.statusFilterKey, stat.filter);
        } catch (e) {
            console.error('Lọc status thất bại:', e);
        }
    };

    const handleCompanyChange = async (value) => {
        setSelectedCompany(value);
        try {
            await applyFilterGroup(CONFIG.companyFilter.filterKey, getCompanyFilter(value));
        } catch (e) {
            console.error('Lọc công ty thất bại:', e);
        }
    };

    const handleUserChange = async (value) => {
        setSelectedUser(value);
        try {
            await applyFilterGroup(CONFIG.userFilter.filterKey, getUserFilter(value));
        } catch (e) {
            console.error('Lọc nhân sự thất bại:', e);
        }
    };

    const handleTitleSearch = async (value) => {
        const query = (value || '').trim();
        setTitleQuery(query);
        try {
            await applyFilterGroup(CONFIG.titleFilter.filterKey, getTitleFilter(query));
        } catch (e) {
            console.error('Lọc title thất bại:', e);
        }
    };

    const handleTitleChange = (event) => {
        const value = event?.target?.value || '';
        setTitleDraft(value);
        if (!value) {
            handleTitleSearch('');
        }
    };

    if ((currentUserScope.loading || countsLoading) && active === 'all' && !selectedCompany && !selectedUser && !titleQuery) {
        return <Spin size="small" />;
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '16px',
            padding: '16px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #f0f0f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            marginBottom: '16px'
        }}>
            {/* Hàng 1: Bộ lọc Trạng thái sử dụng CSS Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '8px'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '10px'
                }}>
                    {STATS.map(s => {
                        const isActive = active === s.key;
                        return (
                            <div
                                key={s.key}
                                style={{
                                    ...styles.filterItem(isActive, s.color),
                                    justifyContent: 'space-between', // Đẩy badge sang góc phải pill
                                    padding: '6px 14px',
                                    height: '36px'
                                }}
                                onClick={() => handleStatusClick(s)}
                                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = s.color; }}
                                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = '#f0f0f0'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                    <div style={styles.dot(s.color, isActive)} />
                                    <Text style={{
                                        fontSize: '13px',
                                        fontWeight: isActive ? 600 : 400,
                                        color: isActive ? s.color : '#595959',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {s.label}
                                    </Text>
                                </div>
                                <Badge
                                    count={counts[s.key] ?? 0}
                                    style={styles.badgeSmall(isActive, s.color)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hàng 2: Bộ lọc chi tiết */}
            {(CONFIG.titleFilter.enable || CONFIG.companyFilter.enable || CONFIG.userFilter.enable) && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    alignItems: 'end',
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: '1px dashed #f0f0f0'
                }}>
                    {CONFIG.titleFilter.enable && (
                        <div style={{ display: 'grid', gap: '6px' }}>
                            <Text style={{ fontSize: '13px', fontWeight: 500, color: '#595959', whiteSpace: 'nowrap' }}>
                                Reference:
                            </Text>
                            <Input.Search
                                placeholder={CONFIG.titleFilter.placeholder}
                                allowClear
                                enterButton
                                value={titleDraft}
                                onChange={handleTitleChange}
                                onSearch={handleTitleSearch}
                                style={{ width: '100%' }}
                            />
                        </div>
                    )}

                    {CONFIG.companyFilter.enable && (
                        <div style={{ display: 'grid', gap: '6px' }}>
                            <Text style={{ fontSize: '13px', fontWeight: 500, color: '#595959', whiteSpace: 'nowrap' }}>
                                Công ty:
                            </Text>
                            <Select
                                placeholder={CONFIG.companyFilter.placeholder}
                                style={{ width: '100%' }}
                                allowClear
                                value={selectedCompany}
                                onChange={handleCompanyChange}
                                loading={companiesLoading}
                                options={companies.map(c => ({
                                    value: c.id,
                                    label: c.shortName || c.name || c.legalName || `Company #${c.id}`
                                }))}
                            />
                        </div>
                    )}

                    {CONFIG.userFilter.enable && (
                        <div style={{ display: 'grid', gap: '6px' }}>
                            <Text style={{ fontSize: '13px', fontWeight: 500, color: '#595959', whiteSpace: 'nowrap' }}>
                                Nhân sự:
                            </Text>
                            <Select
                                placeholder={CONFIG.userFilter.placeholder}
                                style={{ width: '100%' }}
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                value={selectedUser}
                                onChange={handleUserChange}
                                loading={usersLoading}
                                options={users}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

ctx.render(<StatsFilter />);
