const { useState, useEffect } = ctx.React;

function JsColumnOverdue() {
    const [trigger, setTrigger] = useState(0);
    const record = ctx.record || {};
    const startDate = record.startDate;
    const deadline = record.deadline;

    // Register refresh reloader under the unified set to force re-render when table reloads
    useEffect(() => {
        const engine = ctx.engine || ctx.app;
        if (!engine) return;

        if (!engine.__nocobaseReloaders) {
            engine.__nocobaseReloaders = new Set();
        }

        const reloadFn = () => {
            setTrigger(prev => prev + 1);
        };

        engine.__nocobaseReloaders.add(reloadFn);

        return () => {
            engine.__nocobaseReloaders.delete(reloadFn);
        };
    }, []);

    if (!deadline) {
        return (
            <span style={{ color: '#8c8c8c', fontStyle: 'italic', fontSize: '13px' }}>
                No Deadline
            </span>
        );
    }

    const now = new Date();
    const endDate = new Date(deadline);
    const start = startDate ? new Date(startDate) : null;

    // Chuẩn hoá thời gian về 0h00
    now.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    if (start) start.setHours(0, 0, 0, 0);

    // Tính khoảng cách
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let config = {};

    // 1. Trạng thái: CHƯA BẮT ĐẦU
    if (start && now < start) {
        config = {
            text: 'Not Started',
            bg: '#f5f5f5',
            color: '#595959',
            border: '#d9d9d9',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="10" y1="15" x2="10" y2="9" />
                    <line x1="14" y1="15" x2="14" y2="9" />
                </svg>
            )
        };
    }
    // 2. Trạng thái: QUÁ HẠN
    else if (diffDays < 0) {
        config = {
            text: 'Overdue',
            bg: '#fff1f0',
            color: '#cf1322',
            border: '#ffa39e',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            )
        };
    }
    // 3. Trạng thái: SẮP HẾT HẠN (Còn <= 3 ngày)
    else if (diffDays <= 4) {
        config = {
            text: 'Nearly Overdue',
            bg: '#fff7e6',
            color: '#d46b08',
            border: '#ffd591',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            )
        };
    }
    // 4. Trạng thái: TRONG HẠN
    else {
        config = {
            text: 'On Time',
            bg: '#f6ffed',
            color: '#389e0d',
            border: '#b7eb8f',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            )
        };
    }

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            border: `1px solid ${config.border}`,
            backgroundColor: config.bg,
            color: config.color,
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'nowrap'
        }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>{config.icon}</span>
            <span>{config.text}</span>
        </div>
    );
}

ctx.render(<JsColumnOverdue />);
