const { useState, useEffect, useCallback } = ctx.React;
const { Progress, Spin, Tooltip } = ctx.antd;

// ==================== CSS Animation ====================
const SpinStyle = () => (
    <style dangerouslySetInnerHTML={{ __html: `
        @keyframes caseProgressSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .case-progress-refresh-spin {
            animation: caseProgressSpin 0.8s linear infinite;
        }
    `}} />
);

// ==================== Minimalist SVG Icons ====================
const DoneIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52c41a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

const InProgressIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fa8c16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
        <circle cx="12" cy="12" r="10" strokeDasharray="38 9" />
    </svg>
);

const ToDoIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1890ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
        <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
    </svg>
);

const CancelledIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
);

const OtherIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#722ed1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

const InfoIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#bfbfbf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

const RefreshIcon = ({ onClick, spinning }) => (
    <svg 
        width="12" 
        height="12" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#8c8c8c" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
        className={spinning ? 'case-progress-refresh-spin' : ''}
        style={{ 
            cursor: 'pointer', 
            display: 'inline-block',
            verticalAlign: 'middle',
            marginLeft: 8,
            transition: 'stroke 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.setAttribute('stroke', '#1890ff')}
        onMouseLeave={(e) => e.currentTarget.setAttribute('stroke', '#8c8c8c')}
    >
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
);

function JsColumnCaseProgress() {
    const record = ctx.record; // The current project/case record
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ==================== Data Loader ====================
    const loadData = useCallback(async (silent = false) => {
        if (!record?.id) {
            setLoading(false);
            return;
        }
        if (!silent) {
            setRefreshing(true);
        }
        try {
            const res = await ctx.api.request({
                url: 'tasks:list',
                params: {
                    filter: JSON.stringify({
                        projectId: record.id
                    }),
                    fields: 'id,status',
                    pageSize: 500
                }
            });
            setTasks(res?.data?.data || []);
        } catch (e) {
            console.error('Lỗi lấy danh sách task:', e);
        }
        setLoading(false);
        setRefreshing(false);
    }, [record?.id]);

    // Initial load on mount
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Register reload function on the shared engine/app context for global reload
    useEffect(() => {
        const engine = ctx.engine || ctx.app;
        if (!engine) return;

        if (!engine.__nocobaseReloaders) {
            engine.__nocobaseReloaders = new Set();
        }

        const reloadFn = () => {
            loadData(true); // Silent reload
        };

        engine.__nocobaseReloaders.add(reloadFn);

        return () => {
            engine.__nocobaseReloaders.delete(reloadFn);
        };
    }, [loadData]);

    if (loading) {
        return <Spin size="small" />;
    }

    if (!tasks || tasks.length === 0) {
        return (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <SpinStyle />
                <Tooltip title="Chưa có công việc được tạo cho case này">
                    <span style={{ fontSize: '12px', color: '#bfbfbf', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center' }}>
                        <InfoIcon /> Không có công việc
                    </span>
                </Tooltip>
                <RefreshIcon onClick={() => loadData(false)} spinning={refreshing} />
            </div>
        );
    }

    const doneCount = tasks.filter(t => t.status === 'done').length;
    const cancelledCount = tasks.filter(t => t.status === 'cancelled').length;
    const inProgressCount = tasks.filter(t => t.status === 'inProgress').length;
    const toDoCount = tasks.filter(t => t.status === 'toDo').length;
    const otherCount = tasks.filter(t => !['done', 'cancelled', 'inProgress', 'toDo'].includes(t.status)).length;

    const activeCount = tasks.length - cancelledCount;
    const percent = activeCount > 0 ? Math.round((doneCount / activeCount) * 100) : 0;

    const percentColor = percent === 100 ? '#52c41a' : percent > 50 ? '#1890ff' : '#fa8c16';

    const tooltipContent = (
        <div style={{ padding: '4px' }}>
            <div style={{ fontWeight: 600, marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}>
                Tiến độ công việc: {percent}%
            </div>
            <div style={{ fontSize: '11px', lineHeight: '2.0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <DoneIcon /> <span>Hoàn thành: <strong>{doneCount}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <InProgressIcon /> <span>Đang xử lý: <strong>{inProgressCount}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ToDoIcon /> <span>Chưa thực hiện: <strong>{toDoCount}</strong></span>
                </div>
                {otherCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <OtherIcon /> <span>Khác: <strong>{otherCount}</strong></span>
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', color: '#8c8c8c', borderTop: '1px dashed #f0f0f0', marginTop: 4, paddingTop: 4 }}>
                    <CancelledIcon /> <span>Đã hủy: <strong>{cancelledCount}</strong> (không tính vào tiến độ)</span>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <SpinStyle />
            <Tooltip title={tooltipContent}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' }} onClick={() => loadData(false)}>
                    <Progress 
                        percent={percent} 
                        showInfo={false}
                        strokeColor={percentColor}
                        size="small"
                        style={{ flex: 1, minWidth: 60, margin: 0 }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: percentColor, whiteSpace: 'nowrap' }}>
                        {percent}% ({doneCount}/{activeCount})
                    </span>
                </div>
            </Tooltip>
            <RefreshIcon onClick={() => loadData(false)} spinning={refreshing} />
        </div>
    );
}

ctx.render(<JsColumnCaseProgress />);
