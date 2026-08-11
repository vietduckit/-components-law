      // ============================================================
      // Case Matter Dashboard - NocoBase Custom JS Block
      // Purpose: dashboard/table/charts for customer case matters.
      // Data collections: projects/cases, tasks, projectServices,
      // customers, lawyers, contracts.
      // ============================================================
      const { React, antd } = ctx;
      const { useCallback, useEffect, useMemo, useRef, useState } = React;
      const {
        Button,
        Checkbox,
        DatePicker,
        Empty,
        Input,
        Popover,
        Progress,
        Select,
        Segmented,
        Spin,
        Tag,
        Typography,
      } = antd;
      const { Text } = Typography;
      const { RangePicker } = DatePicker;

      const TOKENS = {
        bg: "#eef1f5",
        surface: "#ffffff",
        surfaceMuted: "#f7f9fc",
        border: "#e6e9ee",
        borderSoft: "#eef1f5",
        text: "#1b2430",
        muted: "#8892a0",
        quiet: "#9aa4b2",
        accent: "#2f6bd8",
        accentSoft: "#eaf1fd",
        green: "#2f9e6b",
        amber: "#e0a94b",
        red: "#dc2626",
        radius: 8,
      };

      const STATUS_META = {
        moi: {
          label: "New",
          text: "#475569",
          bg: "#eef1f5",
          chart: "#94a3b8",
        },
        dangXuLy: {
          label: "In progress",
          text: "#1d4ed8",
          bg: "#e8f0ff",
          chart: "#2f6bd8",
        },
        choPhanHoi: {
          label: "Waiting response",
          text: "#b45309",
          bg: "#fdf3e3",
          chart: "#e0a94b",
        },
        hoanThanh: {
          label: "Completed",
          text: "#15803d",
          bg: "#e7f4ec",
          chart: "#2f9e6b",
        },
      };

      const OVERDUE_META = {
        label: "Overdue",
        text: "#b91c1c",
        bg: "#fdeceb",
        chart: "#dc2626",
      };

      const PRIORITY_META = {
        cao: { label: "High", color: "#b91c1c", weight: 3 },
        trungBinh: { label: "Medium", color: "#b45309", weight: 2 },
        thap: { label: "Low", color: "#64748b", weight: 1 },
      };

      const COLUMN_DEFS = [
        { key: "caseInfo", label: "Case" },
        { key: "customer", label: "Client" },
        { key: "projectManager", label: "Case Manager" },
        { key: "internalCompany", label: "Internal Company" },
        { key: "services", label: "Services" },
        { key: "status", label: "Status" },
        { key: "priority", label: "Priority" },
        { key: "date", label: "Start Date" },
        { key: "deadline", label: "Deadline" },
        { key: "closedDate", label: "Closed Date" },
        { key: "contract", label: "Contract" },
        { key: "taskProgress", label: "Task Progress" },
        { key: "revenue", label: "Revenue" },
      ];

      const CONFIGURABLE_COLUMN_DEFS = COLUMN_DEFS.filter(
        (column) => !["status", "priority"].includes(column.key),
      );

      const DEFAULT_VISIBLE_COLUMNS = {
        caseInfo: true,
        customer: true,
        projectManager: true,
        internalCompany: false,
        services: true,
        status: true,
        priority: true,
        date: false,
        deadline: true,
        closedDate: false,
        contract: false,
        taskProgress: true,
        revenue: true,
      };

      const MIN_COLUMN_WIDTH = 96;
      const DEFAULT_COLUMN_WIDTHS = {
        caseInfo: 360,
        customer: 180,
        projectManager: 170,
        internalCompany: 170,
        services: 220,
        status: 140,
        priority: 120,
        date: 140,
        deadline: 155,
        closedDate: 140,
        contract: 220,
        taskProgress: 160,
        revenue: 150,
      };

      const GROUP_OPTIONS = [
        { value: "none", label: "No grouping" },
        { value: "status", label: "Status" },
        { value: "projectManager", label: "Case Manager" },
        { value: "customer", label: "Client" },
        { value: "services", label: "Services" },
        { value: "internalCompany", label: "Internal Company" },
        { value: "priority", label: "Priority" },
      ];

      const SORT_OPTIONS = [
        { value: "deadline", label: "Nearest deadline" },
        { value: "taskProgress", label: "Lowest progress first" },
        { value: "priority", label: "Highest priority first" },
        { value: "createdAt", label: "Recently updated" },
        { value: "revenue", label: "Highest revenue first" },
      ];

      const CHART_DIMENSION_OPTIONS = [
        { value: "case", label: "Case" },
        { value: "status", label: "Status" },
        { value: "priority", label: "Priority" },
        { value: "customer", label: "Client" },
        { value: "projectManager", label: "Case Manager" },
        { value: "services", label: "Services" },
        { value: "internalCompany", label: "Internal Company" },
        { value: "month", label: "Month" },
      ];

      const CHART_METRIC_OPTIONS = [
        { value: "count", label: "Case count" },
        { value: "revenue", label: "Revenue" },
        { value: "avgProgress", label: "Average progress" },
        { value: "overdue", label: "Overdue cases" },
      ];

    const CHART_TYPE_OPTIONS = [
      { value: "bar", label: "Horizontal bar" },
      { value: "column", label: "Column" },
      { value: "donut", label: "Donut" },
      { value: "line", label: "Line" },
      ];

      const DEFAULT_CHART_A = {
        type: "column",
        dimension: "status",
        metric: "count",
      };
      const ROWS_PER_PAGE = 8;
      const TODAY = new Date();
      TODAY.setHours(0, 0, 0, 0);

      const PROJECT_FIELDS =
        "id,caseCode,projectName,status,priority,date,deadline,closedDate,createdAt,customerId,internalCompanyId,projectManagerId,contractId";
      const TASK_FIELDS = "id,status,projectId";
      const PROJECT_SERVICE_FIELDS =
        "id,projectId,serviceId,serviceName,serviceType,status,basePrice,subTotal,vatAmount,totalAmount,packageSubTotal,packageVatAmount,packageTotalAmount";
      const CUSTOMER_FIELDS = "id,customerName,shortName";
      const CONTRACT_FIELDS =
        "id,contractCode,contractName,customerId,status,totalAmount";

    const CASE_RESOURCES = [
      "projects:list",
      "cases:list",
      "Cases:list",
      "project:list",
      "case:list",
    ];

    const CHART_PALETTE = [
      "#2f6bd8",
      "#2f9e6b",
      "#e0a94b",
      "#dc2626",
      "#6d5bd0",
      "#13a8a8",
      "#8b5cf6",
      "#0f766e",
      "#ea580c",
      "#475569",
    ];

    let chartJsLoadPromise = null;

    function loadChartJs() {
      if (chartJsLoadPromise) return chartJsLoadPromise;
      if (typeof ctx.requireAsync !== "function") {
        return Promise.reject(new Error("ctx.requireAsync is not available"));
      }
      chartJsLoadPromise = ctx
        .requireAsync(
          "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
        )
        .then((lib) => {
          const ChartJS =
            typeof lib === "function" ? lib : lib?.Chart || lib?.default || lib;
          if (!ChartJS) throw new Error("Chart.js constructor not found");
          try {
            ChartJS.defaults.font.family =
              '"Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ChartJS.defaults.font.size = 11;
            ChartJS.defaults.color = "#697386";
          } catch {}
          return ChartJS;
        });
      return chartJsLoadPromise;
    }

      const styles = `
      .cmd-root {
        --cmd-bg: ${TOKENS.bg};
        --cmd-surface: ${TOKENS.surface};
        --cmd-muted-surface: ${TOKENS.surfaceMuted};
        --cmd-border: ${TOKENS.border};
        --cmd-soft-border: ${TOKENS.borderSoft};
        --cmd-text: ${TOKENS.text};
        --cmd-muted: ${TOKENS.muted};
        --cmd-quiet: ${TOKENS.quiet};
        --cmd-accent: ${TOKENS.accent};
        --cmd-accent-soft: ${TOKENS.accentSoft};
        --cmd-radius: ${TOKENS.radius}px;
        min-height: 100%;
        padding: 16px;
        background: var(--cmd-bg);
        color: var(--cmd-text);
        font-family: "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
      }
      .cmd-shell {
        max-width: 1680px;
        margin: 0 auto;
        display: grid;
        gap: 14px;
      }
      .cmd-card {
        background: var(--cmd-surface);
        border: 1px solid var(--cmd-border);
        border-radius: var(--cmd-radius);
        box-shadow: 0 1px 2px rgba(20, 30, 45, .04);
      }
      .cmd-header {
        position: sticky;
        top: 0;
        z-index: 8;
        min-height: 64px;
        padding: 14px 16px;
      }
      .cmd-header-inner,
      .cmd-toolbar,
      .cmd-config-head,
      .cmd-chart-head,
      .cmd-pagination,
      .cmd-kpi-title,
      .cmd-row-main {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .cmd-header-inner {
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .cmd-brand {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
      }
      .cmd-logo {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 8px;
        background: var(--cmd-accent);
        color: #fff;
        font-weight: 700;
        letter-spacing: .2px;
      }
      .cmd-title {
        margin: 0;
        color: var(--cmd-text);
        font-size: 18px;
        line-height: 1.25;
        font-weight: 700;
      }
      .cmd-subtitle {
        margin-top: 3px;
        color: var(--cmd-muted);
        font-size: 12px;
      }
      .cmd-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
      }
      .cmd-updated {
        color: var(--cmd-muted);
        font-size: 12px;
        white-space: nowrap;
      }
      .cmd-kpi-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 10px;
      }
      .cmd-kpi {
        position: relative;
        min-height: 96px;
        overflow: hidden;
        padding: 13px 12px 12px;
      }
      .cmd-kpi::before {
        position: absolute;
        top: 0;
        right: 0;
        left: 0;
        height: 3px;
        content: "";
        background: var(--kpi-color, var(--cmd-accent));
      }
      .cmd-kpi-label {
        color: var(--cmd-muted);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }
      .cmd-kpi-value {
        margin-top: 8px;
        color: var(--cmd-text);
        font-size: 24px;
        line-height: 1;
        font-weight: 700;
      }
      .cmd-kpi-note {
        margin-top: 7px;
        color: var(--kpi-color, var(--cmd-muted));
        font-size: 11px;
      }
      .cmd-body {
        display: block;
      }
      .cmd-config-title,
      .cmd-section-title {
        color: var(--cmd-text);
        font-size: 13px;
        font-weight: 700;
      }
      .cmd-config-subtitle {
        margin-top: 2px;
        color: var(--cmd-muted);
        font-size: 11.5px;
      }
      .cmd-section {
        padding-top: 14px;
        margin-top: 14px;
        border-top: 1px solid var(--cmd-soft-border);
      }
      .cmd-check-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(170px, 1fr));
        gap: 10px 18px;
        margin-top: 10px;
      }
      .cmd-settings-popover {
        z-index: 9999;
      }
      .cmd-settings-popover .ant-popover-inner {
        padding: 0;
        border-radius: 10px;
        box-shadow: 0 18px 45px rgba(20, 30, 45, .16);
      }
      .cmd-settings-popover .ant-popover-inner-content {
        padding: 0;
      }
      .cmd-config-panel {
        width: min(520px, calc(100vw - 32px));
        max-height: min(680px, calc(100vh - 96px));
        overflow: auto;
        padding: 18px;
        background: #fff;
      }
      .cmd-config-panel .cmd-section:first-child {
        margin-top: 0;
        padding-top: 0;
        border-top: 0;
      }
      .cmd-config-panel .ant-checkbox-wrapper {
        min-width: 0;
        white-space: nowrap;
      }
      .cmd-width-list {
        display: grid;
        gap: 10px;
        max-height: none;
        overflow: visible;
        padding-right: 0;
        margin-top: 12px;
      }
      .cmd-width-row {
        display: grid;
        grid-template-columns: minmax(170px, 1fr) 30px 64px 30px;
        gap: 8px;
        align-items: center;
        color: var(--cmd-text);
        font-size: 12px;
      }
      .cmd-width-row > span:first-child {
        overflow: visible;
        line-height: 1.25;
        white-space: normal;
      }
      .cmd-width-value {
        width: 64px;
        color: var(--cmd-muted);
        text-align: right;
      }
      .cmd-chip-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-top: 10px;
      }
      .cmd-chip {
        min-height: 30px;
        padding: 5px 10px;
        border: 1px solid var(--cmd-border);
        border-radius: 999px;
        background: #fff;
        color: var(--cmd-muted);
        font-size: 12px;
        cursor: pointer;
        transition: .16s ease;
      }
      .cmd-chip.is-active {
        border-color: var(--chip-color, var(--cmd-accent));
        background: var(--chip-bg, var(--cmd-accent-soft));
        color: var(--chip-color, var(--cmd-accent));
        font-weight: 600;
      }
      .cmd-toggle-danger.is-active {
        border-color: ${OVERDUE_META.chart};
        background: ${OVERDUE_META.bg};
        color: ${OVERDUE_META.text};
      }
      .cmd-main {
        min-width: 0;
        display: grid;
        gap: 12px;
      }
      .cmd-toolbar {
        padding: 12px;
        flex-wrap: wrap;
      }
      .cmd-toolbar-left {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        min-width: 0;
        flex: 1 1 680px;
      }
      .cmd-search {
        min-width: 260px;
        max-width: 420px;
        flex: 1 1 320px;
      }
      .cmd-count {
        color: var(--cmd-muted);
        font-size: 12px;
        white-space: nowrap;
      }
      .cmd-table-card {
        position: relative;
        overflow: hidden;
      }
      .cmd-table-head {
        min-height: 54px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        border-bottom: 1px solid var(--cmd-soft-border);
      }
      .cmd-table-title {
        color: var(--cmd-text);
        font-size: 14px;
        font-weight: 700;
      }
      .cmd-settings-button {
        min-width: 34px;
        padding-left: 9px;
        padding-right: 9px;
      }
      .cmd-settings-icon {
        display: inline-block;
        font-size: 15px;
        line-height: 1;
      }
      .cmd-table-wrap {
        overflow-x: auto;
        min-height: 220px;
      }
      .cmd-table {
        width: max-content;
        min-width: 1120px;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
      }
      .cmd-table th {
        position: relative;
        height: 43px;
        padding: 0 16px 0 12px;
        border-bottom: 1px solid var(--cmd-border);
        background: #fafbfc;
        color: #687384;
        font-size: 11px;
        font-weight: 700;
        text-align: left;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .cmd-th-content {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cmd-col-resizer {
        position: absolute;
        top: 7px;
        right: 0;
        width: 8px;
        height: calc(100% - 14px);
        border-radius: 4px;
        background: #e5e7eb;
        cursor: col-resize;
        touch-action: none;
      }
      .cmd-col-resizer:hover {
        background: #cbd5e1;
      }
      .cmd-table td {
        padding: 11px 12px;
        border-bottom: 1px solid var(--cmd-soft-border);
        color: var(--cmd-text);
        vertical-align: middle;
        overflow: hidden;
      }
      .cmd-cell {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cmd-table tr:hover td {
        background: #fbfdff;
      }
      .cmd-group-row td {
        padding: 10px 12px;
        background: #f4f7fb;
        color: var(--cmd-text);
        font-weight: 700;
      }
      .cmd-code {
        display: block;
        min-width: 0;
        overflow: hidden;
        color: var(--cmd-accent);
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cmd-title-cell {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }
      .cmd-title-text {
        overflow: hidden;
        color: var(--cmd-text);
        font-weight: 600;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cmd-title-sub {
        margin-top: 3px;
        overflow: hidden;
        color: var(--cmd-muted);
        font-size: 11.5px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cmd-case-name {
        margin-top: 4px;
        overflow: hidden;
        color: var(--cmd-text);
        font-size: 12.5px;
        font-weight: 600;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cmd-owner {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        max-width: 100%;
        min-width: 0;
        white-space: nowrap;
      }
      .cmd-owner-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cmd-avatar {
        width: 26px;
        height: 26px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 12px;
        font-weight: 700;
      }
      .cmd-status {
        display: inline-flex;
        align-items: center;
        min-height: 26px;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--status-bg);
        color: var(--status-text);
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }
      .cmd-priority {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: var(--priority-color);
        font-weight: 600;
        white-space: nowrap;
      }
      .cmd-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }
      .cmd-progress {
        width: 100%;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .cmd-progress-track {
        position: relative;
        height: 7px;
        flex: 1;
        overflow: hidden;
        border-radius: 999px;
        background: #edf1f6;
      }
      .cmd-progress-fill {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        border-radius: 999px;
        background: var(--progress-color);
      }
      .cmd-progress-value {
        width: 36px;
        color: var(--cmd-muted);
        font-size: 12px;
        text-align: right;
      }
      .cmd-date-main {
        color: var(--cmd-text);
        white-space: nowrap;
      }
      .cmd-date-sub {
        margin-top: 3px;
        color: var(--deadline-color, var(--cmd-muted));
        font-size: 11.5px;
        white-space: nowrap;
      }
      .cmd-money {
        color: var(--cmd-text);
        font-weight: 700;
        white-space: nowrap;
      }
      .cmd-pagination {
        min-height: 60px;
        display: grid;
        grid-template-columns: 130px minmax(0, 1fr) 130px;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-top: 1px solid var(--cmd-soft-border);
        background: #fff;
      }
      .cmd-page-side {
        display: flex;
        justify-content: flex-start;
      }
      .cmd-page-side-right {
        justify-content: flex-end;
      }
      .cmd-page-center {
        min-width: 0;
        color: var(--cmd-muted);
        text-align: center;
      }
      .cmd-page-status {
        color: var(--cmd-text);
        font-size: 12px;
        font-weight: 700;
      }
      .cmd-page-range {
        margin-top: 2px;
        font-size: 11.5px;
      }
      .cmd-charts-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
      }
      .cmd-chart {
        min-height: 380px;
        padding: 14px;
      }
      .cmd-chart-toolbar {
        padding: 12px;
        display: grid;
        grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
        gap: 10px;
        align-items: start;
      }
      .cmd-chart-configs {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
      }
      .cmd-chart-config {
        display: grid;
        grid-template-columns: repeat(3, minmax(120px, 1fr));
        gap: 8px;
      }
      .cmd-config-label {
        color: var(--cmd-muted);
        font-size: 11.5px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .cmd-chart-title {
        color: var(--cmd-text);
        font-size: 14px;
        font-weight: 700;
      }
    .cmd-chart-subtitle {
      margin-top: 2px;
      color: var(--cmd-muted);
      font-size: 11.5px;
    }
    .cmd-chart-canvas-shell {
      margin-top: 14px;
      padding: 14px 14px 10px;
      border: 1px solid var(--cmd-soft-border);
      border-radius: var(--cmd-radius);
      background: #fff;
    }
    .cmd-chart-canvas-loading {
      min-height: 340px;
      display: grid;
      place-items: center;
    }
    .cmd-chart-loading-overlay {
      position: absolute;
      inset: 0;
      z-index: 2;
      min-height: 0;
      border-radius: var(--cmd-radius);
      background: rgba(255, 255, 255, .72);
    }
    .cmd-chart-note {
      margin-top: 10px;
      color: var(--cmd-muted);
      font-size: 11.5px;
    }
    .cmd-chart-summary {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--cmd-soft-border);
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 8px 14px;
    }
    .cmd-chart-summary-row {
      min-width: 0;
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      color: var(--cmd-muted);
      font-size: 12px;
    }
    .cmd-chart-summary-index {
      color: var(--cmd-quiet);
      font-size: 11px;
      text-align: right;
    }
    .cmd-chart-summary-label {
      min-width: 0;
      color: var(--cmd-text);
      font-weight: 600;
      line-height: 1.35;
      white-space: normal;
    }
    .cmd-chart-summary-value {
      color: var(--cmd-text);
      font-weight: 700;
      white-space: nowrap;
    }
    .cmd-donut-layout {
        display: grid;
        grid-template-columns: 190px minmax(0, 1fr);
        gap: 20px;
        align-items: center;
        min-height: 245px;
      }
      .cmd-donut {
        position: relative;
        width: 178px;
        height: 178px;
        border-radius: 50%;
        background: var(--donut-bg);
      }
      .cmd-donut::after {
        position: absolute;
        inset: 34px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #fff;
        content: "";
      }
      .cmd-donut-center {
        position: absolute;
        inset: 0;
        z-index: 1;
        display: grid;
        place-items: center;
        text-align: center;
      }
      .cmd-donut-number {
        color: var(--cmd-text);
        font-size: 26px;
        font-weight: 700;
      }
      .cmd-donut-label {
        color: var(--cmd-muted);
        font-size: 11.5px;
      }
      .cmd-legend {
        display: grid;
        gap: 10px;
      }
      .cmd-legend-row {
        display: grid;
        grid-template-columns: 10px minmax(0, 1fr) auto auto;
        gap: 8px;
        align-items: center;
        color: var(--cmd-muted);
        font-size: 12px;
      }
      .cmd-legend-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--legend-color);
      }
      .cmd-legend-label {
        color: var(--cmd-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cmd-svg {
        width: 100%;
        height: 320px;
        margin-top: 14px;
        overflow: visible;
      }
      .cmd-svg text {
        font-family: "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .cmd-axis-line {
        stroke: #d8dee8;
        stroke-width: 1.2;
      }
      .cmd-axis-grid {
        stroke: #eef1f5;
        stroke-width: 1;
      }
      .cmd-axis-label {
        fill: #697386;
        font-size: 10.5px;
        font-weight: 600;
      }
      .cmd-axis-title {
        fill: #475569;
        font-size: 11px;
        font-weight: 700;
      }
      .cmd-chart-value-label {
        fill: var(--cmd-text);
        font-size: 10.5px;
        font-weight: 700;
      }
      .cmd-chart-line {
        fill: none;
        stroke: var(--cmd-accent);
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2.2;
        vector-effect: non-scaling-stroke;
      }
      .cmd-chart-column {
        fill: url(#cmdColumnGradient);
      }
      .cmd-bars {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
        gap: 12px;
        align-items: end;
        min-height: 248px;
        padding-top: 18px;
      }
      .cmd-hbars {
        display: grid;
        gap: 12px;
        margin-top: 18px;
      }
      .cmd-hbar-row {
        display: grid;
        grid-template-columns: 140px minmax(0, 1fr) 78px;
        gap: 10px;
        align-items: center;
      }
      .cmd-hbar-label {
        overflow: hidden;
        color: var(--cmd-text);
        font-size: 12px;
        font-weight: 600;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cmd-hbar-track {
        height: 14px;
        overflow: hidden;
        border-radius: 999px;
        background: #edf1f6;
      }
      .cmd-hbar-fill {
        height: 100%;
        min-width: 3px;
        border-radius: 999px;
        background: var(--cmd-accent);
      }
      .cmd-hbar-value {
        color: var(--cmd-muted);
        font-size: 12px;
        text-align: right;
      }
      .cmd-bar-item {
        display: grid;
        gap: 8px;
        align-items: end;
        text-align: center;
      }
      .cmd-bar-track {
        position: relative;
        height: 180px;
        display: flex;
        align-items: end;
        justify-content: center;
        border-bottom: 1px solid var(--cmd-soft-border);
      }
      .cmd-bar-fill {
        width: min(42px, 70%);
        min-height: 4px;
        border-radius: 8px 8px 0 0;
        background: linear-gradient(180deg, #5c89e7 0%, var(--cmd-accent) 100%);
      }
      .cmd-bar-value {
        color: var(--cmd-text);
        font-size: 11.5px;
        font-weight: 700;
      }
      .cmd-bar-label {
        overflow: hidden;
        color: var(--cmd-muted);
        font-size: 11.5px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cmd-stack-list {
        display: grid;
        gap: 14px;
        margin-top: 18px;
      }
      .cmd-stack-row {
        display: grid;
        grid-template-columns: 128px minmax(0, 1fr) 36px;
        gap: 10px;
        align-items: center;
      }
      .cmd-stack-name {
        overflow: hidden;
        color: var(--cmd-text);
        font-size: 12px;
        font-weight: 600;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cmd-stack-track {
        height: 16px;
        display: flex;
        overflow: hidden;
        border-radius: 999px;
        background: #edf1f6;
      }
      .cmd-stack-segment {
        min-width: 2px;
        background: var(--segment-color);
      }
      .cmd-stack-total {
        color: var(--cmd-muted);
        font-size: 12px;
        text-align: right;
      }
      .cmd-empty {
        min-height: 260px;
        display: grid;
        place-items: center;
      }
      .cmd-loading {
        min-height: 420px;
        display: grid;
        place-items: center;
      }
      @media (max-width: 1380px) {
        .cmd-kpi-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (max-width: 1180px) {
        .cmd-charts-grid {
          grid-template-columns: 1fr;
        }
        .cmd-chart-toolbar,
        .cmd-chart-configs {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 760px) {
        .cmd-root {
          padding: 10px;
        }
        .cmd-kpi-grid {
          grid-template-columns: 1fr;
        }
        .cmd-donut-layout {
          grid-template-columns: 1fr;
          justify-items: center;
        }
        .cmd-toolbar-left,
        .cmd-search,
        .cmd-toolbar .ant-select,
        .cmd-chart-config {
          width: 100%;
          min-width: 0;
          grid-template-columns: 1fr;
        }
        .cmd-config-panel {
          width: min(520px, calc(100vw - 32px));
          max-height: min(680px, calc(100vh - 96px));
        }
        .cmd-pagination {
          grid-template-columns: 1fr;
        }
        .cmd-page-side,
        .cmd-page-side-right {
          justify-content: center;
        }
        .cmd-check-list {
          grid-template-columns: 1fr;
        }
      }
      `;

      function extractId(value) {
        if (value === null || value === undefined || value === "") return null;
        if (Array.isArray(value)) return value.length ? extractId(value[0]) : null;
        if (typeof value === "object") {
          if (value.id !== undefined && value.id !== null) return extractId(value.id);
          if (value.value !== undefined && value.value !== null)
            return extractId(value.value);
          return null;
        }
        const parsed = parseInt(String(value), 10);
        return Number.isNaN(parsed) ? null : parsed;
      }

      function parseMoney(value) {
        if (value === null || value === undefined || value === "") return 0;
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        const normalized = String(value).replace(/[^\d.-]/g, "");
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
      }

      function asArray(value) {
        if (value === null || value === undefined || value === "") return [];
        return Array.isArray(value) ? value : [value];
      }

      function relationRecord(value) {
        if (!value) return null;
        if (Array.isArray(value))
          return value.find((item) => item && typeof item === "object") || null;
        return typeof value === "object" ? value : null;
      }

      function relationList(value) {
        return asArray(value).filter((item) => item && typeof item === "object");
      }

      function firstPresent(record, keys) {
        for (const key of keys) {
          const value = record?.[key];
          if (value !== undefined && value !== null && value !== "") return value;
        }
        return "";
      }

      function labelFromRecord(record, keys, fallback = "") {
        const rel = relationRecord(record);
        if (!rel) return fallback;
        return firstPresent(rel, keys) || fallback;
      }

      function collectIds(value) {
        const ids = [];
        asArray(value).forEach((item) => {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            const id = extractId(item.id ?? item.value);
            if (id) ids.push(id);
            return;
          }
          const id = extractId(item);
          if (id) ids.push(id);
        });
        return Array.from(new Set(ids));
      }

      function serviceRowTotal(record) {
        const direct = parseMoney(record?.totalAmount);
        if (direct) return direct;
        const packageTotal = parseMoney(record?.packageTotalAmount);
        if (packageTotal) return packageTotal;
        const subTotal =
          parseMoney(record?.packageSubTotal) ||
          parseMoney(record?.subTotal) ||
          parseMoney(record?.basePrice) * (parseMoney(record?.quantity) || 1);
        return subTotal + parseMoney(record?.vatAmount || record?.packageVatAmount);
      }

      function toDate(value) {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
      }

      function startOfDay(value) {
        const date = toDate(value);
        if (!date) return null;
        date.setHours(0, 0, 0, 0);
        return date;
      }

      function fmtDate(value) {
        const date = toDate(value);
        if (!date) return "-";
        return date.toLocaleDateString("vi-VN");
      }

      function fmtNumber(value) {
        return Number(value || 0).toLocaleString("en-US");
      }

      function fmtMoney(value) {
        const number = Number(value || 0);
        if (number >= 1000000000) {
          return `${(number / 1000000000).toLocaleString("en-US", {
            maximumFractionDigits: 1,
          })}B VND`;
        }
        if (number >= 1000000) {
          return `${(number / 1000000).toLocaleString("en-US", {
            maximumFractionDigits: 1,
          })}M VND`;
        }
        return `${number.toLocaleString("en-US")} VND`;
      }

      function normalizeText(value) {
        return String(value || "")
          .toLowerCase()
          .replace(/đ/g, "d")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      }

      function normalizeStatus(raw) {
        const value = normalizeText(raw).replace(/[^a-z0-9]/g, "");
        if (
          !value ||
          value === "todo" ||
          value === "toDo".toLowerCase() ||
          value === "new" ||
          value === "pending" ||
          value === "moi"
        ) {
          return "moi";
        }
        if (
          value.includes("progress") ||
          value.includes("active") ||
          value.includes("dangxuly") ||
          value.includes("processing")
        ) {
          return "dangXuLy";
        }
        if (
          value.includes("waiting") ||
          value.includes("blocked") ||
          value.includes("chophanhoi") ||
          value.includes("hold")
        ) {
          return "choPhanHoi";
        }
        if (
          value.includes("done") ||
          value.includes("complete") ||
          value.includes("finish") ||
          value.includes("closed") ||
          value.includes("cancel")
        ) {
          return "hoanThanh";
        }
        return "moi";
      }

      function normalizePriority(raw) {
        const value = normalizeText(raw).replace(/[^a-z0-9]/g, "");
        if (value.includes("high") || value.includes("cao") || value === "3")
          return "cao";
        if (value.includes("low") || value.includes("thap") || value === "1")
          return "thap";
        return "trungBinh";
      }

      function isCompleted(record) {
        return record.statusKey === "hoanThanh";
      }

      function deadlineMeta(deadline, statusKey) {
        if (statusKey === "hoanThanh") {
          return {
            label: "Closed",
            color: STATUS_META.hoanThanh.text,
            isOverdue: false,
            isUpcoming: false,
          };
        }

        const day = startOfDay(deadline);
        if (!day) {
          return {
            label: "No deadline",
            color: TOKENS.muted,
            isOverdue: false,
            isUpcoming: false,
          };
        }

        const diff = Math.round((day.getTime() - TODAY.getTime()) / 86400000);
        if (diff < 0) {
          return {
            label: `${Math.abs(diff)} days overdue`,
            color: OVERDUE_META.text,
            isOverdue: true,
            isUpcoming: false,
            days: diff,
          };
        }
        if (diff <= 7) {
          return {
            label: diff === 0 ? "Due today" : `${diff} days left`,
            color: PRIORITY_META.trungBinh.color,
            isOverdue: false,
            isUpcoming: true,
            days: diff,
          };
        }
        return {
          label: `${diff} days left`,
          color: TOKENS.muted,
          isOverdue: false,
          isUpcoming: false,
          days: diff,
        };
      }

      function initials(name) {
        const words = String(name || "NA")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        if (!words.length) return "NA";
        if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
        return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
      }

      function progressColor(value) {
        if (value >= 100) return STATUS_META.hoanThanh.chart;
        if (value >= 50) return TOKENS.accent;
        return TOKENS.amber;
      }

      function extractRowsFromPayload(payload) {
        const shapes = [
          payload?.data?.data,
          payload?.data?.rows,
          payload?.data?.list,
          payload?.data?.records,
          payload?.data,
          payload?.rows,
          payload?.records,
        ];
        const rows = shapes.find((item) => Array.isArray(item));
        return rows || [];
      }

      async function fetchListViaApi(resource, params = {}) {
        if (!ctx?.api?.request) throw new Error("ctx.api.request is not available");
        const response = await ctx.api.request({
          url: resource,
          method: "GET",
          params: { page: 1, pageSize: 2000, ...params },
        });
        return extractRowsFromPayload(response);
      }

      async function fetchListViaWindow(resource, params = {}) {
        const requestUrl = new URL(`/api/${resource}`, window.location.origin);
        Object.entries({ page: 1, pageSize: 2000, ...params }).forEach(
          ([key, value]) => {
            if (value === undefined || value === null || value === "") return;
            requestUrl.searchParams.set(key, String(value));
          },
        );

        const response = await window.fetch(requestUrl.toString(), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.error || payload?.errors) {
          throw new Error(payload?.error?.message || `${resource} request failed`);
        }
        return extractRowsFromPayload(payload);
      }

      async function fetchListOnce(resource, params = {}) {
        try {
          const apiRows = await fetchListViaApi(resource, params);
          if (apiRows.length) return apiRows;
          const fetchRows = await fetchListViaWindow(resource, params).catch(
            () => [],
          );
          return fetchRows.length ? fetchRows : apiRows;
        } catch (apiError) {
          return fetchListViaWindow(resource, params);
        }
      }

      async function fetchList(resource, params = {}) {
        const attempts = [params];
        if (params.appends) {
          const { appends, ...withoutAppends } = params;
          attempts.push(withoutAppends);
        }
        if (params.fields || params.appends) {
          const { fields, appends, ...minimalParams } = params;
          attempts.push(minimalParams);
        }

        const seen = new Set();
        for (const attempt of attempts) {
          const key = JSON.stringify(attempt);
          if (seen.has(key)) continue;
          seen.add(key);
          try {
            return await fetchListOnce(resource, attempt);
          } catch (error) {
            // Try the next less strict shape.
          }
        }

        return [];
      }

      async function fetchListCandidates(resources, params = {}) {
        for (const resource of resources) {
          const rows = await fetchList(resource, params);
          if (rows.length) return rows;
        }
        return fetchList(resources[0], params);
      }

      async function fetchOptionalListCandidates(resources, params = {}) {
        for (const resource of resources) {
          try {
            const rows = await fetchListViaWindow(resource, params);
            if (rows.length) return rows;
          } catch {
            // Optional lookup only. Keep the main dashboard quiet if this resource is unavailable.
          }
        }
        return [];
      }

      function statusChipValue(record) {
        if (record.isOverdue) return "overdue";
        return record.statusKey;
      }

      function statusLabel(key) {
        if (key === "overdue") return OVERDUE_META.label;
        return STATUS_META[key]?.label || "New";
      }

      function statusColorMeta(key) {
        if (key === "overdue") return OVERDUE_META;
        return STATUS_META[key] || STATUS_META.moi;
      }

      function groupLabel(groupBy, record) {
        if (groupBy === "status") return statusLabel(statusChipValue(record));
        if (groupBy === "projectManager")
          return record.projectManagerName || "Unassigned";
        if (groupBy === "customer")
          return record.customerName || "No client";
        if (groupBy === "services") return record.serviceName || "No service";
        if (groupBy === "internalCompany")
          return record.internalCompanyName || "Unspecified";
        if (groupBy === "priority")
          return PRIORITY_META[record.priorityKey]?.label || "Medium";
        return "All cases";
      }

      function compareRecords(sortKey) {
        return (a, b) => {
          if (sortKey === "taskProgress") return a.taskProgress - b.taskProgress;
          if (sortKey === "priority") {
            return (
              (PRIORITY_META[b.priorityKey]?.weight || 0) -
              (PRIORITY_META[a.priorityKey]?.weight || 0)
            );
          }
          if (sortKey === "revenue") return b.revenue - a.revenue;
          if (sortKey === "createdAt") {
            return (
              (toDate(b.createdAt)?.getTime() || 0) -
              (toDate(a.createdAt)?.getTime() || 0)
            );
          }
          const aTime = toDate(a.deadline)?.getTime() || Number.MAX_SAFE_INTEGER;
          const bTime = toDate(b.deadline)?.getTime() || Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        };
      }

      function buildGroups(records, groupBy) {
        if (groupBy === "none") return [];
        const map = new Map();
        records.forEach((record) => {
          const label = groupLabel(groupBy, record);
          if (!map.has(label)) map.set(label, []);
          map.get(label).push(record);
        });
        return Array.from(map.entries())
          .map(([label, rows]) => ({ label, rows }))
          .sort(
            (a, b) => b.rows.length - a.rows.length || a.label.localeCompare(b.label),
          );
      }

      function getMonthBuckets(size = 8) {
        const base = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
        return Array.from({ length: size }, (_, index) => {
          const date = new Date(
            base.getFullYear(),
            base.getMonth() - (size - 1 - index),
            1,
          );
          return {
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
            label: `T${date.getMonth() + 1}`,
            created: 0,
            completed: 0,
          };
        });
      }

      function monthKey(value) {
        const date = toDate(value);
        if (!date) return "";
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      function aggregateBy(records, key, valueSelector) {
        const map = new Map();
        records.forEach((record) => {
          const label = typeof key === "function" ? key(record) : record[key];
          const normalized = label || "No data";
          map.set(normalized, (map.get(normalized) || 0) + valueSelector(record));
        });
        return Array.from(map.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);
      }

      function normalizeColumnWidths(value) {
        const source = value && typeof value === "object" ? value : {};
        return COLUMN_DEFS.reduce((acc, column) => {
          const width = Number(source[column.key]);
          acc[column.key] = Number.isFinite(width)
            ? Math.max(MIN_COLUMN_WIDTH, Math.round(width))
            : DEFAULT_COLUMN_WIDTHS[column.key] || 140;
          return acc;
        }, {});
      }

      function dateLikeToDate(value) {
        if (!value) return null;
        if (typeof value?.toDate === "function") return value.toDate();
        return toDate(value);
      }

      function isRecordInDateRange(record, range) {
        if (!Array.isArray(range) || range.length !== 2 || !range[0] || !range[1])
          return true;
        const start = dateLikeToDate(range[0]);
        const end = dateLikeToDate(range[1]);
        const value = toDate(record.createdAt || record.date || record.deadline);
        if (!start || !end || !value) return true;
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return value >= start && value <= end;
      }

    function dimensionLabel(record, dimension) {
      if (dimension === "case") {
        return [record.caseCode, record.projectName].filter(Boolean).join(" - ");
      }
      if (dimension === "status") return statusLabel(statusChipValue(record));
        if (dimension === "priority")
          return PRIORITY_META[record.priorityKey]?.label || "Medium";
        if (dimension === "customer")
          return record.customerName || "No client";
        if (dimension === "projectManager")
          return record.projectManagerName || "Unassigned";
        if (dimension === "services") return record.serviceName || "No service";
        if (dimension === "internalCompany")
          return record.internalCompanyName || "Unspecified";
        if (dimension === "month") {
          const date = toDate(record.createdAt || record.date || record.deadline);
          return date
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            : "No date";
        }
        return "No data";
      }

      function metricValue(record, metric) {
        if (metric === "revenue") return record.revenue || 0;
        if (metric === "avgProgress") return record.taskProgress || 0;
        if (metric === "overdue") return record.isOverdue ? 1 : 0;
        return 1;
      }

      function buildChartData(records, config) {
        const map = new Map();
        records.forEach((record) => {
          const label = dimensionLabel(record, config.dimension);
          if (!map.has(label)) map.set(label, { label, value: 0, count: 0 });
          const item = map.get(label);
          item.value += metricValue(record, config.metric);
          item.count += 1;
        });
        return Array.from(map.values())
          .map((item) => ({
            ...item,
            value:
              config.metric === "avgProgress"
                ? Math.round(item.value / Math.max(1, item.count))
                : item.value,
          }))
          .sort((a, b) => {
            if (config.dimension === "month") return a.label.localeCompare(b.label);
            if (config.dimension === "status") {
              const order = Object.values(STATUS_META).map((item) => item.label);
              return order.indexOf(a.label) - order.indexOf(b.label);
            }
            if (config.dimension === "priority") {
              const order = ["High", "Medium", "Low"];
              return order.indexOf(a.label) - order.indexOf(b.label);
            }
            return b.value - a.value;
          })
          .slice(0, config.dimension === "month" ? 12 : 10);
      }

      function formatChartValue(value, metric) {
        if (metric === "revenue") return fmtMoney(value);
        if (metric === "avgProgress") return `${Math.round(value || 0)}%`;
        return fmtNumber(value);
      }

      function optionLabel(options, value, fallback = "") {
        return options.find((item) => item.value === value)?.label || fallback;
      }

      function chartMetricLabel(metric) {
        if (metric === "count") return "Case count";
        if (metric === "revenue") return "Revenue";
        if (metric === "avgProgress") return "Average progress";
        if (metric === "overdue") return "Overdue cases";
        return optionLabel(CHART_METRIC_OPTIONS, metric, "Metric");
      }

      function chartMetricAxisLabel(metric) {
        if (metric === "count") return "Number of cases";
        if (metric === "revenue") return "Revenue (VND)";
        if (metric === "avgProgress") return "Average task progress (%)";
        if (metric === "overdue") return "Number of overdue cases";
        return chartMetricLabel(metric);
      }

      function chartDimensionLabel(dimension) {
        return optionLabel(CHART_DIMENSION_OPTIONS, dimension, "Dimension");
      }

      function chartTitleFromConfig(config) {
        return `${chartMetricLabel(config.metric)} by ${chartDimensionLabel(
          config.dimension,
        )}`;
      }

      function chartSubtitleFromConfig(config) {
        if (config.type === "donut") {
          return `${chartMetricLabel(config.metric)} distribution by ${chartDimensionLabel(
            config.dimension,
          )}`;
        }
        return `X-axis: ${chartDimensionLabel(
          config.dimension,
        )} · Y-axis: ${chartMetricAxisLabel(config.metric)}`;
      }

      function compactAxisLabel(value, dimension, maxLength = 18) {
        const text = String(value || "No data");
        if (dimension === "month" && /^\d{4}-\d{2}$/.test(text)) {
          return `${text.slice(5)}/${text.slice(2, 4)}`;
        }
        if (text.length <= maxLength) return text;
        return `${text.slice(0, Math.max(1, maxLength - 3))}...`;
      }

      function axisMaxFor(value, metric) {
        if (metric === "avgProgress") return 100;
        const raw = Math.max(1, Number(value || 0));
        if (raw <= 5) return Math.ceil(raw);
        const magnitude = 10 ** Math.floor(Math.log10(raw));
        const normalized = raw / magnitude;
        const multiplier =
          normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
        return multiplier * magnitude;
      }

      function axisTicks(axisMax, steps = 4) {
        return Array.from({ length: steps + 1 }, (_, index) =>
          Math.round((axisMax / steps) * index),
        );
      }

    function formatAxisTick(value, metric) {
      if (metric === "revenue") {
        const number = Number(value || 0);
          if (number >= 1000000000) return `${(number / 1000000000).toFixed(1)}B`;
          if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
          if (number >= 1000) return `${Math.round(number / 1000)}K`;
          return fmtNumber(number);
        }
      if (metric === "avgProgress") return `${Math.round(value || 0)}%`;
      return fmtNumber(value);
    }

    function wrapChartLabel(value, maxChars = 18, maxLines = 3) {
      const text = String(value || "No data").trim();
      if (!text) return ["No data"];
      const words = text.split(/\s+/);
      const lines = [];
      let current = "";
      words.forEach((word) => {
        const next = current ? `${current} ${word}` : word;
        if (next.length <= maxChars) {
          current = next;
          return;
        }
        if (current) lines.push(current);
        if (word.length > maxChars) {
          lines.push(`${word.slice(0, Math.max(1, maxChars - 1))}...`);
          current = "";
        } else {
          current = word;
        }
      });
      if (current) lines.push(current);
      if (lines.length <= maxLines) return lines;
      const visible = lines.slice(0, maxLines);
      visible[maxLines - 1] = `${visible[maxLines - 1].slice(
        0,
        Math.max(1, maxChars - 3),
      )}...`;
      return visible;
    }

    function isLongLabelDimension(dimension) {
      return ["case", "services", "customer", "projectManager", "internalCompany"].includes(
        dimension,
      );
    }

    function chartJsType(config) {
      if (config.type === "donut") return "doughnut";
      return config.type === "line" ? "line" : "bar";
    }

    function chartJsHeight(config, data) {
      if (config.type === "bar") return Math.max(360, 132 + data.length * 54);
      if (config.type === "donut") return 360;
      return isLongLabelDimension(config.dimension) ? 460 : 400;
    }

    function chartKindNote(config) {
      if (config.type === "donut") {
        return "Donut charts use legend and tooltip instead of X/Y axes.";
      }
      if (config.type === "bar") {
        return "Horizontal bar is recommended for long case, client, lawyer, company, and service names.";
      }
      if (config.type === "line" && config.dimension !== "month") {
        return "Line charts work best with Month. For long category names, use Bar to read labels more comfortably.";
      }
      return "Hover a point or bar to view the full label and exact value.";
    }

    function buildChartJsSpec(data, config) {
      const labels = data.map((item) => item.label);
      const values = data.map((item) => item.value);
      const metricLabel = chartMetricLabel(config.metric);
      const dimensionLabelText = chartDimensionLabel(config.dimension);
      const metricAxisLabel = chartMetricAxisLabel(config.metric);
      const horizontal = config.type === "bar";
      const chartType = chartJsType(config);
      const isDonut = config.type === "donut";
      const labelWrap = horizontal ? 28 : isLongLabelDimension(config.dimension) ? 16 : 14;
      const labelLines = horizontal ? 3 : isLongLabelDimension(config.dimension) ? 3 : 2;

      const datasetBase = {
        label: metricLabel,
        data: values,
        borderWidth: config.type === "line" ? 2.5 : 0,
      };

      const dataset =
        config.type === "line"
          ? {
              ...datasetBase,
              borderColor: TOKENS.accent,
              backgroundColor: "rgba(47, 107, 216, 0.1)",
              pointBackgroundColor: TOKENS.accent,
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: false,
              tension: config.dimension === "month" ? 0.28 : 0.12,
            }
          : {
              ...datasetBase,
              backgroundColor: isDonut
                ? data.map((_, index) => CHART_PALETTE[index % CHART_PALETTE.length])
                : TOKENS.accent,
              borderColor: isDonut ? "#fff" : TOKENS.accent,
              borderWidth: isDonut ? 2 : 0,
              borderRadius: isDonut ? 0 : 6,
              maxBarThickness: horizontal ? 24 : 46,
            };

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: isDonut
            ? { top: 10, right: 12, bottom: 10, left: 12 }
            : { top: 14, right: 18, bottom: 8, left: 8 },
        },
        plugins: {
          legend: {
            display: isDonut,
            position: "right",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              padding: 14,
            },
          },
          tooltip: {
            callbacks: {
              title(items) {
                const item = items?.[0];
                return item ? labels[item.dataIndex] || "" : "";
              },
              label(context) {
                const parsed = context.parsed || {};
                const value = isDonut
                  ? context.raw
                  : horizontal
                    ? parsed.x
                    : parsed.y;
                return `${metricLabel}: ${formatChartValue(value, config.metric)}`;
              },
            },
          },
        },
      };

      if (!isDonut) {
        options.indexAxis = horizontal ? "y" : "x";
        options.scales = horizontal
          ? {
              x: {
                beginAtZero: true,
                suggestedMax: axisMaxFor(Math.max(1, ...values), config.metric),
                title: {
                  display: true,
                  text: metricAxisLabel,
                  color: "#475569",
                  font: { weight: 700 },
                },
                grid: { color: "#eef1f5" },
                ticks: {
                  precision: config.metric === "revenue" ? undefined : 0,
                  callback(value) {
                    return formatAxisTick(value, config.metric);
                  },
                },
              },
              y: {
                title: {
                  display: true,
                  text: dimensionLabelText,
                  color: "#475569",
                  font: { weight: 700 },
                },
                grid: { display: false },
                ticks: {
                  autoSkip: false,
                  callback(value, index) {
                    return wrapChartLabel(labels[index], labelWrap, labelLines);
                  },
                },
              },
            }
          : {
              x: {
                title: {
                  display: true,
                  text: dimensionLabelText,
                  color: "#475569",
                  font: { weight: 700 },
                },
                grid: { display: false },
                ticks: {
                  autoSkip: false,
                  maxRotation: 0,
                  minRotation: 0,
                  callback(value, index) {
                    return wrapChartLabel(labels[index], labelWrap, labelLines);
                  },
                },
              },
              y: {
                beginAtZero: true,
                suggestedMax: axisMaxFor(Math.max(1, ...values), config.metric),
                title: {
                  display: true,
                  text: metricAxisLabel,
                  color: "#475569",
                  font: { weight: 700 },
                },
                grid: { color: "#eef1f5" },
                ticks: {
                  precision: config.metric === "revenue" ? undefined : 0,
                  callback(value) {
                    return formatAxisTick(value, config.metric);
                  },
                },
              },
            };
      }

      return {
        type: chartType,
        data: { labels, datasets: [dataset] },
        options,
        height: chartJsHeight(config, data),
        key: [
          chartType,
          config.type,
          config.dimension,
          config.metric,
          labels.join("|"),
          values.join("|"),
        ].join("::"),
      };
    }

    function ChartCanvas({ type, data, options, height }) {
      const canvasRef = useRef(null);
      const chartRef = useRef(null);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(false);

      useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        loadChartJs()
          .then((ChartJS) => {
            if (cancelled || !canvasRef.current) return;
            if (chartRef.current) {
              chartRef.current.destroy();
              chartRef.current = null;
            }
            chartRef.current = new ChartJS(canvasRef.current, {
              type,
              data,
              options: {
                responsive: true,
                maintainAspectRatio: false,
                ...(options || {}),
              },
            });
            if (!cancelled) setLoading(false);
          })
          .catch(() => {
            if (!cancelled) {
              setLoading(false);
              setError(true);
            }
          });
        return () => {
          cancelled = true;
          if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
          }
        };
      }, [type, data, options]);

      useEffect(
        () => () => {
          if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
          }
        },
        [],
      );

      if (error) {
        return (
          <div className="cmd-chart-canvas-loading">
            <Empty description="Chart.js could not be loaded in this NocoBase environment" />
          </div>
        );
      }

      return (
        <div style={{ position: "relative", height, width: "100%" }}>
          {loading && (
            <div className="cmd-chart-canvas-loading cmd-chart-loading-overlay">
              <Spin />
            </div>
          )}
          <canvas ref={canvasRef} />
        </div>
      );
    }

    function ChartDataSummary({ data, config }) {
      return (
        <div className="cmd-chart-summary">
          {data.map((item, index) => (
            <div className="cmd-chart-summary-row" key={`${item.label}-${index}`}>
              <span className="cmd-chart-summary-index">{index + 1}</span>
              <span className="cmd-chart-summary-label" title={item.label}>
                {item.label}
              </span>
              <span className="cmd-chart-summary-value">
                {formatChartValue(item.value, config.metric)}
              </span>
            </div>
          ))}
        </div>
      );
    }

      function useCaseMatterData() {
        const [loading, setLoading] = useState(true);
        const [projects, setProjects] = useState([]);
        const [tasks, setTasks] = useState([]);
        const [projectServices, setProjectServices] = useState([]);
        const [customers, setCustomers] = useState([]);
        const [lawyers, setLawyers] = useState([]);
        const [users, setUsers] = useState([]);
        const [contracts, setContracts] = useState([]);
        const [internalCompanies, setInternalCompanies] = useState([]);

        const reload = useCallback(async () => {
          setLoading(true);
          const [
            projectRows,
            taskRows,
            projectServiceRows,
            customerRows,
            lawyerRows,
            userRows,
            contractRows,
            companyRows,
          ] = await Promise.all([
            fetchListCandidates(CASE_RESOURCES, {
              fields: PROJECT_FIELDS,
              appends: "customer,projectManager,internalCompany,contracts",
            }),
            fetchList("tasks:list", { fields: TASK_FIELDS }),
            fetchListCandidates(
              ["projectServices:list", "caseServices:list", "CaseServices:list"],
              {
                fields: PROJECT_SERVICE_FIELDS,
              },
            ),
            fetchList("customers:list", { fields: CUSTOMER_FIELDS }),
            fetchList("lawyers:list"),
            fetchOptionalListCandidates(["users:list"], {
              fields: "id,nickname,username,name",
            }),
            fetchList("contracts:list", { fields: CONTRACT_FIELDS }),
            fetchOptionalListCandidates([
              "internalCompany:list",
              "internalCompanies:list",
              "companies:list",
              "company:list",
            ]),
          ]);

          setProjects(projectRows);
          setTasks(taskRows);
          setProjectServices(projectServiceRows);
          setCustomers(customerRows);
          setLawyers(lawyerRows);
          setUsers(userRows);
          setContracts(contractRows);
          setInternalCompanies(companyRows);
          setLoading(false);
        }, []);

        useEffect(() => {
          reload();
        }, [reload]);

        const customerMap = useMemo(() => {
          const map = {};
          customers.forEach((customer) => {
            const id = extractId(customer.id);
            if (!id) return;
            map[String(id)] =
              customer.shortName || customer.customerName || `Client #${id}`;
          });
          return map;
        }, [customers]);

        const lawyerMap = useMemo(() => {
          const map = {};
          lawyers.forEach((lawyer) => {
            const id = extractId(lawyer.id);
            const label =
              lawyer.lawyerName ||
              lawyer.fullName ||
              lawyer.name ||
              lawyer.nickname ||
              lawyer.username ||
              "";
            if (!label) return;
            [id, extractId(lawyer.userId), extractId(lawyer.user), extractId(lawyer.users)]
              .filter(Boolean)
              .forEach((value) => {
                map[String(value)] = label;
              });
          });
          users.forEach((user) => {
            const id = extractId(user.id);
            if (!id || map[String(id)]) return;
            map[String(id)] = user.nickname || user.name || user.username || `User #${id}`;
          });
          return map;
        }, [lawyers, users]);

        const internalCompanyMap = useMemo(() => {
          const map = {};
          internalCompanies.forEach((company) => {
            const id = extractId(company.id);
            if (!id) return;
            map[String(id)] =
              company.shortName ||
              company.companyName ||
              company.internalCompanyName ||
              company.name ||
              company.companyCode ||
              "";
          });
          return map;
        }, [internalCompanies]);

        const contractMap = useMemo(() => {
          const map = {};
          contracts.forEach((contract) => {
            const id = extractId(contract.id);
            if (!id) return;
            const label = [contract.contractCode, contract.contractName]
              .filter(Boolean)
              .join(" - ");
            map[String(id)] = label || `Contract #${id}`;
          });
          return map;
        }, [contracts]);

        const taskStatsByProject = useMemo(() => {
          const map = {};
          tasks.forEach((task) => {
            const projectId =
              extractId(task.projectId) ||
              extractId(task.projects) ||
              extractId(task.cases);
            if (!projectId) return;
            const key = String(projectId);
            if (!map[key]) map[key] = { total: 0, done: 0 };
            map[key].total += 1;
            const status = normalizeStatus(task.status);
            if (status === "hoanThanh") map[key].done += 1;
          });
          return map;
        }, [tasks]);

        const serviceByProject = useMemo(() => {
          const map = {};

          const addLabel = (projectId, label) => {
            if (!projectId || !label) return;
            const key = String(projectId);
            if (!map[key]) map[key] = [];
            if (!map[key].includes(label)) map[key].push(label);
          };

          projects.forEach((project) => {
            const projectId = extractId(project.id);
            collectIds(project.serviceId).forEach((serviceId) => {
              addLabel(projectId, `Service #${serviceId}`);
            });
            relationList(project.services).forEach((service) => {
              addLabel(
                projectId,
                labelFromRecord(service, ["serviceName", "name"], ""),
              );
            });
            relationList(project.caseServices || project.projectServices).forEach(
              (service) => {
                addLabel(
                  projectId,
                  firstPresent(service, ["serviceName", "serviceType"]) ||
                    labelFromRecord(service.services, ["serviceName", "name"], ""),
                );
              },
            );
          });

          projectServices.forEach((service) => {
            const projectId =
              extractId(service.projectId) ||
              extractId(service.cases) ||
              extractId(service.projects);
            if (!projectId) return;
            const serviceId =
              extractId(service.serviceId) || extractId(service.services);
            const label =
              firstPresent(service, ["serviceName", "serviceType"]) ||
              labelFromRecord(service.services, ["serviceName", "name"], "") ||
              (serviceId ? `Service #${serviceId}` : "Service");
            addLabel(projectId, label);
          });
          return map;
        }, [projects, projectServices]);

        const revenueByProject = useMemo(() => {
          const totalsByProject = {};

          projectServices.forEach((service) => {
            const projectId =
              extractId(service.projectId) ||
              extractId(service.cases) ||
              extractId(service.projects);
            if (!projectId) return;
            const key = String(projectId);
            totalsByProject[key] =
              (totalsByProject[key] || 0) + serviceRowTotal(service);
          });

          return projects.reduce((acc, project) => {
            const projectId = String(project.id);
            acc[projectId] =
              totalsByProject[projectId] ||
              parseMoney(project.totalAmount || project.packageTotalAmount);
            return acc;
          }, {});
        }, [projects, projectServices]);

        const records = useMemo(() => {
          return projects.map((project) => {
            const projectId = String(project.id);
            const statusKey = normalizeStatus(project.status);
            const priorityKey = normalizePriority(project.priority);
            const customerRelation = relationRecord(
              project.customer || project.customers,
            );
            const managerRelation = relationRecord(
              project.projectManager || project.manager || project.lawyer,
            );
            const companyRelation = relationRecord(project.internalCompany);
            const contractRelation = relationRecord(
              project.contracts || project.contract,
            );
            const managerId =
              extractId(project.projectManagerId) || extractId(managerRelation);
            const customerId =
              extractId(project.customerId) || extractId(customerRelation);
            const internalCompanyId =
              extractId(project.internalCompanyId) || extractId(companyRelation);
            const contractId =
              extractId(project.contractId) || extractId(contractRelation);
            const taskStats = taskStatsByProject[projectId] || { total: 0, done: 0 };
            const taskProgress = taskStats.total
              ? Math.round((taskStats.done / taskStats.total) * 100)
              : statusKey === "hoanThanh"
                ? 100
                : 0;
            const deadline = project.deadline || project.closedDate;
            const meta = deadlineMeta(deadline, statusKey);
            const services = serviceByProject[projectId] || [];
            const customerName =
              labelFromRecord(
                customerRelation,
                ["shortName", "customerName", "name"],
                "",
              ) ||
              customerMap[String(customerId)] ||
              (customerId ? `Client #${customerId}` : "No client");
            const projectManagerName =
              labelFromRecord(
                managerRelation,
                ["lawyerName", "nickname", "username", "name"],
                "",
              ) ||
              lawyerMap[String(managerId)] ||
              (managerId ? `Lawyer #${managerId}` : "Unassigned");
            const internalCompanyName =
              labelFromRecord(
                companyRelation,
                ["shortName", "companyName", "internalCompanyName", "name"],
                "",
              ) ||
              internalCompanyMap[String(internalCompanyId)] ||
              "Unspecified";
            const contractName =
              labelFromRecord(
                contractRelation,
                ["contractCode", "contractName", "name"],
                "",
              ) ||
              contractMap[String(contractId)] ||
              (contractId ? `Contract #${contractId}` : "-");
            const serviceName = services.slice(0, 2).join(", ") || "No service";
            const serviceFullName = services.join(", ") || "No service";

            return {
              id: project.id,
              caseCode: project.caseCode || `HS-${project.id}`,
              projectName:
                project.projectName || project.caseCode || `Case #${project.id}`,
              customerId,
              customerName,
              projectManagerId: managerId,
              projectManagerName,
              internalCompanyId,
              internalCompanyName,
              serviceId: collectIds(project.serviceId),
              serviceName,
              serviceFullName,
              contractId,
              contractName,
              quotationId:
                extractId(project.quotationId) || extractId(project.quotations),
              legalReferenceId:
                extractId(project.legalReferenceId) ||
                extractId(project.legalReference),
              stakeholdersId:
                extractId(project.stakeholdersId) || extractId(project.stakeholders),
              status: project.status || "toDo",
              statusKey,
              priority: project.priority || "medium",
              priorityKey,
              taskProgress,
              deadline,
              date: project.date,
              createdAt: project.date || project.createdAt,
              closedAt: project.closedDate,
              closedDate: project.closedDate,
              revenue: revenueByProject[projectId] || 0,
              deadlineText: meta.label,
              deadlineColor: meta.color,
              isOverdue: meta.isOverdue,
              isUpcoming: meta.isUpcoming,
              code: project.caseCode || `HS-${project.id}`,
              title:
                project.projectName || project.caseCode || `Case #${project.id}`,
              customer: customerName,
              service: serviceName,
              serviceFull: serviceFullName,
              owner: projectManagerName,
              progress: taskProgress,
              internalCompany: internalCompanyName,
            };
          });
        }, [
          projects,
          taskStatsByProject,
          customerMap,
          lawyerMap,
          internalCompanyMap,
          serviceByProject,
          revenueByProject,
          contractMap,
        ]);

        return { loading, records, reload };
      }

      function KpiCard({ label, value, note, color }) {
        return (
          <div className="cmd-card cmd-kpi" style={{ "--kpi-color": color }}>
            <div className="cmd-kpi-title">
              <div className="cmd-kpi-label">{label}</div>
            </div>
            <div className="cmd-kpi-value">{value}</div>
            <div className="cmd-kpi-note">{note}</div>
          </div>
        );
      }

      function Header({ viewMode, setViewMode, reload, loading }) {
        return (
          <header className="cmd-card cmd-header">
            <div className="cmd-header-inner">
              <div className="cmd-brand">
                {/* <div className="cmd-logo">HS</div>
                <div>
                  <h2 className="cmd-title">Matter Management Dashboard</h2>
                  <div className="cmd-subtitle">Overview of matters, work progress, and contract revenue</div>
                </div> */}
              </div>
              <div className="cmd-actions">
                <Segmented
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { label: "Table", value: "table" },
                    { label: "Charts", value: "charts" },
                  ]}
                />
                <Button onClick={reload} loading={loading}>
                  Refresh
                </Button>
              </div>
            </div>
          </header>
        );
      }

      function ConfigPanel({
        visibleColumns,
        setVisibleColumns,
        columnWidths,
        setColumnWidths,
      }) {
        const adjustWidth = (key, delta) => {
          setColumnWidths((current) => ({
            ...current,
            [key]: Math.max(
              MIN_COLUMN_WIDTH,
              (current[key] || DEFAULT_COLUMN_WIDTHS[key] || 140) + delta,
            ),
          }));
        };

        return (
          <div className="cmd-config-panel">
            <section
              className="cmd-section"
              style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}
            >
              <div className="cmd-section-title">Visible Columns</div>
              <div className="cmd-check-list">
                {CONFIGURABLE_COLUMN_DEFS.map((column) => (
                  <Checkbox
                    key={column.key}
                    checked={!!visibleColumns[column.key]}
                    onChange={(event) =>
                      setVisibleColumns((current) => ({
                        ...current,
                        [column.key]: event.target.checked,
                      }))
                    }
                  >
                    {column.label}
                  </Checkbox>
                ))}
              </div>
            </section>

            <section className="cmd-section">
              <div className="cmd-section-title">Column Width</div>
              <div className="cmd-width-list">
                {CONFIGURABLE_COLUMN_DEFS.filter((column) => visibleColumns[column.key]).map(
                  (column) => (
                    <div className="cmd-width-row" key={column.key}>
                      <span>{column.label}</span>
                      <Button
                        size="small"
                        onClick={() => adjustWidth(column.key, -24)}
                      >
                        -
                      </Button>
                      <span className="cmd-width-value">
                        {columnWidths[column.key] ||
                          DEFAULT_COLUMN_WIDTHS[column.key]}
                        px
                      </span>
                      <Button
                        size="small"
                        onClick={() => adjustWidth(column.key, 24)}
                      >
                        +
                      </Button>
                    </div>
                  ),
                )}
              </div>
              <Button
                block
                style={{ marginTop: 10 }}
                onClick={() => setColumnWidths(DEFAULT_COLUMN_WIDTHS)}
              >
                Reset column width
              </Button>
            </section>
          </div>
        );
      }

      function Toolbar({
        search,
        setSearch,
        groupBy,
        setGroupBy,
        sortBy,
        setSortBy,
        filteredCount,
        totalCount,
      }) {
        return (
          <div className="cmd-card cmd-toolbar">
            <div className="cmd-toolbar-left">
              <Input.Search
                className="cmd-search"
                allowClear
                placeholder="Search case code, title, client, lawyer..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select
                value={groupBy}
                options={GROUP_OPTIONS}
                onChange={setGroupBy}
                style={{ minWidth: 190 }}
              />
              <Select
                value={sortBy}
                options={SORT_OPTIONS}
                onChange={setSortBy}
                style={{ minWidth: 210 }}
              />
            </div>
            <div className="cmd-count">
              {fmtNumber(filteredCount)} / {fmtNumber(totalCount)} cases
            </div>
          </div>
        );
      }

      function StatusBadge({ record }) {
        const key = statusChipValue(record);
        const meta = statusColorMeta(key);
        return (
          <span
            className="cmd-status"
            style={{
              "--status-bg": meta.bg,
              "--status-text": meta.text,
            }}
          >
            {meta.label}
          </span>
        );
      }

      function PriorityPill({ value }) {
        const meta = PRIORITY_META[value] || PRIORITY_META.trungBinh;
        return (
          <span className="cmd-priority" style={{ "--priority-color": meta.color }}>
            <span className="cmd-dot" />
            {meta.label}
          </span>
        );
      }

      function ProgressCell({ value }) {
        return (
          <div className="cmd-progress">
            <div className="cmd-progress-track">
              <span
                className="cmd-progress-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, value))}%`,
                  "--progress-color": progressColor(value),
                }}
              />
            </div>
            <span className="cmd-progress-value">{value}%</span>
          </div>
        );
      }

      function OwnerCell({ name }) {
        return (
          <span className="cmd-owner">
            <span className="cmd-avatar">{initials(name)}</span>
            <span className="cmd-owner-name">{name}</span>
          </span>
        );
      }

      function DeadlineCell({ record }) {
        return (
          <div>
            <div className="cmd-date-main">{fmtDate(record.deadline)}</div>
            <div
              className="cmd-date-sub"
              style={{ "--deadline-color": record.deadlineColor }}
            >
              {record.deadlineText}
            </div>
          </div>
        );
      }

      function renderCell(columnKey, record) {
        if (columnKey === "caseInfo") {
          return (
            <div className="cmd-cell cmd-title-cell">
              <div className="cmd-code">{record.caseCode}</div>
              <div className="cmd-case-name">{record.projectName}</div>
            </div>
          );
        }
        if (columnKey === "caseCode")
          return <span className="cmd-cell cmd-code">{record.caseCode}</span>;
        if (columnKey === "projectName") {
          return (
            <div className="cmd-cell cmd-title-cell">
              <div className="cmd-title-text">{record.projectName}</div>
              <div className="cmd-title-sub">{record.caseCode}</div>
            </div>
          );
        }
        if (columnKey === "customer")
          return <span className="cmd-cell">{record.customerName}</span>;
        if (columnKey === "projectManager") {
          return (
            <span className="cmd-cell">
              <OwnerCell name={record.projectManagerName} />
            </span>
          );
        }
        if (columnKey === "internalCompany")
          return <span className="cmd-cell">{record.internalCompanyName}</span>;
        if (columnKey === "services") {
          return (
            <div className="cmd-cell cmd-title-cell">
              <div className="cmd-title-text">{record.serviceName}</div>
              <div className="cmd-title-sub">{record.serviceFullName}</div>
            </div>
          );
        }
        if (columnKey === "status") {
          return (
            <span className="cmd-cell">
              <StatusBadge record={record} />
            </span>
          );
        }
        if (columnKey === "priority") {
          return (
            <span className="cmd-cell">
              <PriorityPill value={record.priorityKey} />
            </span>
          );
        }
        if (columnKey === "date")
          return (
            <span className="cmd-cell cmd-date-main">{fmtDate(record.date)}</span>
          );
        if (columnKey === "deadline") {
          return (
            <div className="cmd-cell">
              <DeadlineCell record={record} />
            </div>
          );
        }
        if (columnKey === "closedDate")
          return (
            <span className="cmd-cell cmd-date-main">
              {fmtDate(record.closedDate)}
            </span>
          );
        if (columnKey === "contract")
          return <span className="cmd-cell">{record.contractName}</span>;
        if (columnKey === "taskProgress") {
          return (
            <div className="cmd-cell">
              <ProgressCell value={record.taskProgress} />
            </div>
          );
        }
        if (columnKey === "revenue")
          return (
            <span className="cmd-cell cmd-money">{fmtMoney(record.revenue)}</span>
          );
        return "-";
      }

      function CaseTable({
        rows,
        groupBy,
        visibleColumns,
        columnWidths,
        setColumnWidths,
        configContent,
        page,
        setPage,
      }) {
        const columns = COLUMN_DEFS.filter((column) => visibleColumns[column.key]);
        if (!columns.length) columns.push(COLUMN_DEFS[0]);
        const groups = useMemo(() => buildGroups(rows, groupBy), [rows, groupBy]);
        const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
        const start = (page - 1) * ROWS_PER_PAGE;
        const pageStart = rows.length ? start + 1 : 0;
        const pageEnd = Math.min(start + ROWS_PER_PAGE, rows.length);
        const pageRows =
          groupBy === "none" ? rows.slice(start, start + ROWS_PER_PAGE) : rows;
        const tableWidth = columns.reduce(
          (sum, column) =>
            sum +
            (columnWidths[column.key] || DEFAULT_COLUMN_WIDTHS[column.key] || 140),
          0,
        );

        useEffect(() => {
          if (page > totalPages) setPage(totalPages);
        }, [page, totalPages, setPage]);

        const startColumnResize = (field, event) => {
          if (!field || !event) return;
          event.preventDefault();
          event.stopPropagation();
          const ownerWindow = event.view || document.defaultView || window;
          const bodyStyle = ownerWindow?.document?.body?.style;
          const previousCursor = bodyStyle?.cursor;
          const previousUserSelect = bodyStyle?.userSelect;
          if (bodyStyle) {
            bodyStyle.cursor = "col-resize";
            bodyStyle.userSelect = "none";
          }
          const startX = event.clientX || 0;
          const startWidth = Number(
            columnWidths[field] || DEFAULT_COLUMN_WIDTHS[field] || MIN_COLUMN_WIDTH,
          );
          let latestWidth = startWidth;
          const handleMove = (moveEvent) => {
            latestWidth = Math.max(
              MIN_COLUMN_WIDTH,
              Math.round(startWidth + (moveEvent.clientX || 0) - startX),
            );
            setColumnWidths((current) => ({ ...current, [field]: latestWidth }));
          };
          const handleUp = () => {
            setColumnWidths((current) => ({ ...current, [field]: latestWidth }));
            if (bodyStyle) {
              bodyStyle.cursor = previousCursor || "";
              bodyStyle.userSelect = previousUserSelect || "";
            }
            ownerWindow.removeEventListener("pointermove", handleMove);
            ownerWindow.removeEventListener("pointerup", handleUp);
            ownerWindow.removeEventListener("pointercancel", handleUp);
          };
          ownerWindow.addEventListener("pointermove", handleMove);
          ownerWindow.addEventListener("pointerup", handleUp);
          ownerWindow.addEventListener("pointercancel", handleUp);
        };

        return (
          <div className="cmd-card cmd-table-card">
            <div className="cmd-table-head">
              <div>
                <div className="cmd-table-title">Case List</div>
              </div>
              <Popover
                trigger="click"
                placement="bottomRight"
                content={configContent}
                overlayClassName="cmd-settings-popover"
                rootClassName="cmd-settings-popover"
              >
                <Button className="cmd-settings-button" title="Display settings">
                  <span className="cmd-settings-icon">⚙</span>
                </Button>
              </Popover>
            </div>
            {!rows.length ? (
              <div className="cmd-empty">
                <Empty description="No cases match the current filters" />
              </div>
            ) : (
              <>
                <div className="cmd-table-wrap">
                  <table className="cmd-table" style={{ minWidth: tableWidth }}>
                    <colgroup>
                      {columns.map((column) => (
                        <col
                          key={column.key}
                          style={{
                            width:
                              columnWidths[column.key] ||
                              DEFAULT_COLUMN_WIDTHS[column.key],
                          }}
                        />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        {columns.map((column) => (
                          <th key={column.key}>
                            <div className="cmd-th-content">{column.label}</div>
                            <span
                              className="cmd-col-resizer"
                              onPointerDown={(event) =>
                                startColumnResize(column.key, event)
                              }
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupBy !== "none"
                        ? groups.map((group) => (
                            <React.Fragment key={group.label}>
                              <tr className="cmd-group-row">
                                <td colSpan={columns.length}>
                                  {group.label}{" "}
                                  <Text type="secondary">({group.rows.length})</Text>
                                </td>
                              </tr>
                              {group.rows.map((record) => (
                                <tr key={record.id}>
                                  {columns.map((column) => (
                                    <td key={column.key}>
                                      {renderCell(column.key, record)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </React.Fragment>
                          ))
                        : pageRows.map((record) => (
                            <tr key={record.id}>
                              {columns.map((column) => (
                                <td key={column.key}>
                                  {renderCell(column.key, record)}
                                </td>
                              ))}
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
                {groupBy === "none" && (
                  <div className="cmd-pagination">
                    <div className="cmd-page-side">
                      <Button
                        disabled={page <= 1}
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                      >
                        Previous
                      </Button>
                    </div>
                    <div className="cmd-page-center">
                      <div className="cmd-page-status">
                        Page {page} / {totalPages}
                      </div>
                      <div className="cmd-page-range">
                        {fmtNumber(pageStart)} - {fmtNumber(pageEnd)} /{" "}
                        {fmtNumber(rows.length)} cases
                      </div>
                    </div>
                    <div className="cmd-page-side cmd-page-side-right">
                      <Button
                        disabled={page >= totalPages}
                        onClick={() =>
                          setPage((value) => Math.min(totalPages, value + 1))
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      function ChartCard({ title, subtitle, children }) {
        return (
          <section className="cmd-card cmd-chart">
            <div className="cmd-chart-head">
              <div>
                <div className="cmd-chart-title">{title}</div>
                {subtitle && <div className="cmd-chart-subtitle">{subtitle}</div>}
              </div>
            </div>
            {children}
          </section>
        );
      }

      function DonutChart({ records }) {
        const total = records.length;
        const data = Object.keys(STATUS_META).map((key) => ({
          key,
          label: STATUS_META[key].label,
          value: records.filter((record) => record.statusKey === key).length,
          color: STATUS_META[key].chart,
        }));

        let cursor = 0;
        const gradient = total
          ? data
              .map((item) => {
                const start = cursor;
                const size = (item.value / total) * 360;
                cursor += size;
                return `${item.color} ${start}deg ${cursor}deg`;
              })
              .join(", ")
          : "#edf1f6 0deg 360deg";

        return (
          <ChartCard
            title="Cases by Status"
            subtitle="Based on the current filters"
          >
            <div className="cmd-donut-layout">
              <div
                className="cmd-donut"
                style={{ "--donut-bg": `conic-gradient(${gradient})` }}
              >
                <div className="cmd-donut-center">
                  <div>
                    <div className="cmd-donut-number">{fmtNumber(total)}</div>
                    <div className="cmd-donut-label">cases</div>
                  </div>
                </div>
              </div>
              <div className="cmd-legend">
                {data.map((item) => (
                  <div className="cmd-legend-row" key={item.key}>
                    <span
                      className="cmd-legend-dot"
                      style={{ "--legend-color": item.color }}
                    />
                    <span className="cmd-legend-label">{item.label}</span>
                    <strong>{fmtNumber(item.value)}</strong>
                    <span>{total ? Math.round((item.value / total) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        );
      }

      function LineChart({ records }) {
        const buckets = getMonthBuckets(8);
        const bucketMap = buckets.reduce((acc, bucket) => {
          acc[bucket.key] = bucket;
          return acc;
        }, {});

        records.forEach((record) => {
          const createdKey = monthKey(record.createdAt);
          if (bucketMap[createdKey]) bucketMap[createdKey].created += 1;
          const completedDate = isCompleted(record)
            ? record.closedAt || record.deadline || record.createdAt
            : null;
          const completedKey = monthKey(completedDate);
          if (bucketMap[completedKey]) bucketMap[completedKey].completed += 1;
        });

        const max = Math.max(
          1,
          ...buckets.map((bucket) => Math.max(bucket.created, bucket.completed)),
        );
        const width = 560;
        const height = 180;
        const padX = 32;
        const padY = 20;
        const innerWidth = width - padX * 2;
        const innerHeight = height - padY * 2;
        const pointFor = (value, index) => {
          const x = padX + (innerWidth / Math.max(1, buckets.length - 1)) * index;
          const y = padY + innerHeight - (value / max) * innerHeight;
          return [x, y];
        };
        const linePath = (key) =>
          buckets
            .map((bucket, index) => pointFor(bucket[key], index).join(","))
            .join(" ");

        return (
          <ChartCard
            title="Intake and Completion Trend"
            subtitle="Last 8 months"
          >
            <svg className="cmd-svg" viewBox={`0 0 ${width} ${height}`} role="img">
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const y = padY + innerHeight * tick;
                return (
                  <line
                    key={tick}
                    x1={padX}
                    x2={width - padX}
                    y1={y}
                    y2={y}
                    stroke="#eef1f5"
                    strokeWidth="1"
                  />
                );
              })}
              <polyline
                points={linePath("created")}
                fill="none"
                stroke={TOKENS.accent}
                strokeWidth="2"
              />
              <polyline
                points={linePath("completed")}
                fill="none"
                stroke={TOKENS.green}
                strokeWidth="2"
              />
              {buckets.map((bucket, index) => {
                const created = pointFor(bucket.created, index);
                const completed = pointFor(bucket.completed, index);
                return (
                  <React.Fragment key={bucket.key}>
                    <circle
                      cx={created[0]}
                      cy={created[1]}
                      r="3"
                      fill={TOKENS.accent}
                    />
                    <circle
                      cx={completed[0]}
                      cy={completed[1]}
                      r="3"
                      fill={TOKENS.green}
                    />
                    <text
                      x={created[0]}
                      y={height - 4}
                      textAnchor="middle"
                      fill="#8892a0"
                      fontSize="11"
                    >
                      {bucket.label}
                    </text>
                  </React.Fragment>
                );
              })}
              <text x={padX} y="14" fill="#8892a0" fontSize="11">
                Intake
              </text>
              <text x={padX + 72} y="14" fill="#8892a0" fontSize="11">
                Completed
              </text>
            </svg>
          </ChartCard>
        );
      }

      function RevenueBarChart({ records }) {
        const data = aggregateBy(
          records,
          "customerName",
          (record) => record.revenue,
        ).slice(0, 8);
        const max = Math.max(1, ...data.map((item) => item.value));

        return (
          <ChartCard
            title="Revenue by Client"
            subtitle="Total value from services/contracts"
          >
            {data.length ? (
              <div className="cmd-bars">
                {data.map((item) => (
                  <div className="cmd-bar-item" key={item.label}>
                    <div className="cmd-bar-value">{fmtMoney(item.value)}</div>
                    <div className="cmd-bar-track">
                      <div
                        className="cmd-bar-fill"
                        style={{
                          height: `${Math.max(3, (item.value / max) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="cmd-bar-label" title={item.label}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cmd-empty">
                <Empty description="No revenue data available" />
              </div>
            )}
          </ChartCard>
        );
      }

      function OwnerStackedChart({ records }) {
        const byOwner = new Map();
        records.forEach((record) => {
          const owner = record.projectManagerName || "Unassigned";
          if (!byOwner.has(owner)) {
            byOwner.set(owner, {
              owner,
              total: 0,
              moi: 0,
              dangXuLy: 0,
              choPhanHoi: 0,
              hoanThanh: 0,
            });
          }
          const row = byOwner.get(owner);
          row.total += 1;
          row[record.statusKey] += 1;
        });
        const rows = Array.from(byOwner.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 6);
        const max = Math.max(1, ...rows.map((row) => row.total));

        return (
          <ChartCard
            title="Workload by Owner"
            subtitle="Top 6 lawyers by case count"
          >
            {rows.length ? (
              <>
                <div className="cmd-stack-list">
                  {rows.map((row) => (
                    <div className="cmd-stack-row" key={row.owner}>
                      <div className="cmd-stack-name" title={row.owner}>
                        {row.owner}
                      </div>
                      <div
                        className="cmd-stack-track"
                        style={{
                          maxWidth: `${Math.max(12, (row.total / max) * 100)}%`,
                        }}
                      >
                        {Object.keys(STATUS_META).map((statusKey) => (
                          <span
                            key={statusKey}
                            className="cmd-stack-segment"
                            title={`${STATUS_META[statusKey].label}: ${row[statusKey]}`}
                            style={{
                              "--segment-color": STATUS_META[statusKey].chart,
                              width: `${row.total ? (row[statusKey] / row.total) * 100 : 0}%`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="cmd-stack-total">{row.total}</div>
                    </div>
                  ))}
                </div>
                <div className="cmd-legend" style={{ marginTop: 18 }}>
                  {Object.keys(STATUS_META).map((key) => (
                    <div className="cmd-legend-row" key={key}>
                      <span
                        className="cmd-legend-dot"
                        style={{ "--legend-color": STATUS_META[key].chart }}
                      />
                      <span className="cmd-legend-label">
                        {STATUS_META[key].label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="cmd-empty">
                <Empty description="No owner data available" />
              </div>
            )}
          </ChartCard>
        );
      }

      function ChartToolbar({
        dateRange,
        setDateRange,
        chart,
        setChart,
        recordCount,
      }) {
        const updateChart = (setter, key, value) => {
          setter((current) => ({ ...current, [key]: value }));
        };

        const renderChartConfig = (title, config, setter) => (
          <div>
            <div className="cmd-config-label">{title}</div>
            <div className="cmd-chart-config" style={{ marginTop: 6 }}>
              <Select
                value={config.type}
                options={CHART_TYPE_OPTIONS}
                onChange={(value) => updateChart(setter, "type", value)}
              />
              <Select
                value={config.dimension}
                options={CHART_DIMENSION_OPTIONS}
                onChange={(value) => updateChart(setter, "dimension", value)}
              />
              <Select
                value={config.metric}
                options={CHART_METRIC_OPTIONS}
                onChange={(value) => updateChart(setter, "metric", value)}
              />
            </div>
          </div>
        );

        return (
          <div className="cmd-card cmd-chart-toolbar">
            <div>
              <div className="cmd-config-label">Date Range</div>
              <RangePicker
                style={{ width: "100%", marginTop: 6 }}
                value={dateRange && dateRange.length ? dateRange : null}
                onChange={(value) => setDateRange(value || [])}
                format="DD/MM/YYYY"
                allowClear
              />
              <div className="cmd-count" style={{ marginTop: 8 }}>
                {fmtNumber(recordCount)} cases in chart
              </div>
            </div>
            <div className="cmd-chart-configs">
              {renderChartConfig("Chart Configuration", chart, setChart)}
            </div>
          </div>
        );
      }

      function GenericChart({ records, config }) {
        const data = useMemo(() => buildChartData(records, config), [records, config]);
        const chartTitle = chartTitleFromConfig(config);
        const chartSubtitle = chartSubtitleFromConfig(config);
        const metricLabel = chartMetricLabel(config.metric);
        const dimensionLabelText = chartDimensionLabel(config.dimension);
        const metricAxisLabel = chartMetricAxisLabel(config.metric);
        const max = Math.max(1, ...data.map((item) => item.value));
        const axisMax = axisMaxFor(max, config.metric);
        const ticks = axisTicks(axisMax);
        const chartSpec = useMemo(() => buildChartJsSpec(data, config), [data, config]);

        if (!data.length) {
          return (
            <ChartCard title={chartTitle} subtitle={chartSubtitle}>
              <div className="cmd-empty">
                <Empty description="No chart data available" />
              </div>
            </ChartCard>
          );
        }

        return (
          <ChartCard title={chartTitle} subtitle={chartSubtitle}>
            <div className="cmd-chart-canvas-shell">
              <ChartCanvas
                key={chartSpec.key}
                type={chartSpec.type}
                data={chartSpec.data}
                options={chartSpec.options}
                height={chartSpec.height}
              />
            </div>
            <div className="cmd-chart-note">{chartKindNote(config)}</div>
            <ChartDataSummary data={data} config={config} />
          </ChartCard>
        );

        if (!data.length) {
          return (
            <ChartCard title={chartTitle} subtitle={chartSubtitle}>
              <div className="cmd-empty">
                <Empty description="No chart data available" />
              </div>
            </ChartCard>
          );
        }

        if (config.type === "donut") {
          let cursor = 0;
          const total = data.reduce((sum, item) => sum + item.value, 0);
          const gradient = data
            .map((item, index) => {
              const start = cursor;
              const size = (item.value / Math.max(1, total)) * 360;
              cursor += size;
              return `${["#2f6bd8", "#2f9e6b", "#e0a94b", "#dc2626", "#6d5bd0", "#13a8a8"][index % 6]} ${start}deg ${cursor}deg`;
            })
            .join(", ");
          return (
            <ChartCard title={chartTitle} subtitle={chartSubtitle}>
              <div className="cmd-donut-layout">
                <div
                  className="cmd-donut"
                  style={{ "--donut-bg": `conic-gradient(${gradient})` }}
                >
                  <div className="cmd-donut-center">
                    <div>
                      <div className="cmd-donut-number">
                        {formatChartValue(total, config.metric)}
                      </div>
                      <div className="cmd-donut-label">{metricLabel}</div>
                    </div>
                  </div>
                </div>
                <div className="cmd-legend">
                  {data.map((item, index) => (
                    <div className="cmd-legend-row" key={item.label}>
                      <span
                        className="cmd-legend-dot"
                        style={{
                          "--legend-color": [
                            "#2f6bd8",
                            "#2f9e6b",
                            "#e0a94b",
                            "#dc2626",
                            "#6d5bd0",
                            "#13a8a8",
                          ][index % 6],
                        }}
                      />
                      <span className="cmd-legend-label" title={item.label}>
                        {item.label}
                      </span>
                      <strong>{formatChartValue(item.value, config.metric)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          );
        }

        if (config.type === "line") {
          const width = 760;
          const height = 320;
          const pad = { left: 82, right: 32, top: 34, bottom: 76 };
          const plotRight = width - pad.right;
          const plotBottom = height - pad.bottom;
          const innerWidth = plotRight - pad.left;
          const innerHeight = plotBottom - pad.top;
          const pointFor = (value, index) => {
            const x =
              data.length === 1
                ? pad.left + innerWidth / 2
                : pad.left + (innerWidth / Math.max(1, data.length - 1)) * index;
            const y = pad.top + innerHeight - (value / axisMax) * innerHeight;
            return [x, y];
          };
          const points = data
            .map((item, index) => pointFor(item.value, index).join(","))
            .join(" ");
          return (
            <ChartCard title={chartTitle} subtitle={chartSubtitle}>
              <svg className="cmd-svg" viewBox={`0 0 ${width} ${height}`} role="img">
                {ticks.map((tick) => {
                  const y = pad.top + innerHeight - (tick / axisMax) * innerHeight;
                  return (
                    <React.Fragment key={tick}>
                      <line
                        className="cmd-axis-grid"
                        x1={pad.left}
                        x2={plotRight}
                        y1={y}
                        y2={y}
                      />
                      <text
                        className="cmd-axis-label"
                        x={pad.left - 10}
                        y={y + 4}
                        textAnchor="end"
                      >
                        {formatAxisTick(tick, config.metric)}
                      </text>
                    </React.Fragment>
                  );
                })}
                <line
                  className="cmd-axis-line"
                  x1={pad.left}
                  x2={pad.left}
                  y1={pad.top}
                  y2={plotBottom}
                />
                <line
                  className="cmd-axis-line"
                  x1={pad.left}
                  x2={plotRight}
                  y1={plotBottom}
                  y2={plotBottom}
                />
                <text
                  className="cmd-axis-title"
                  x={(pad.left + plotRight) / 2}
                  y={height - 12}
                  textAnchor="middle"
                >
                  {dimensionLabelText}
                </text>
                <text
                  className="cmd-axis-title"
                  transform={`translate(18 ${(pad.top + plotBottom) / 2}) rotate(-90)`}
                  textAnchor="middle"
                >
                  {metricAxisLabel}
                </text>
                <polyline
                  className="cmd-chart-line"
                  points={points}
                />
                {data.map((item, index) => {
                  const point = pointFor(item.value, index);
                  const labelStep = Math.max(1, Math.ceil(data.length / 8));
                  const showLabel =
                    data.length <= 8 || index % labelStep === 0 || index === data.length - 1;
                  return (
                    <React.Fragment key={item.label}>
                      <circle
                        cx={point[0]}
                        cy={point[1]}
                        r="3"
                        fill={TOKENS.accent}
                      />
                      <text
                        className="cmd-chart-value-label"
                        x={point[0]}
                        y={Math.max(12, point[1] - 9)}
                        textAnchor="middle"
                      >
                        {formatAxisTick(item.value, config.metric)}
                      </text>
                      {showLabel && (
                        <text
                          className="cmd-axis-label"
                          x={point[0]}
                          y={plotBottom + 20}
                          textAnchor="middle"
                        >
                          {compactAxisLabel(item.label, config.dimension, 15)}
                        </text>
                      )}
                      {showLabel && String(item.label).length > 15 && (
                        <title>{item.label}</title>
                      )}
                    </React.Fragment>
                  );
                })}
              </svg>
            </ChartCard>
          );
        }

        if (config.type === "bar") {
          const width = 760;
          const height = Math.max(300, 92 + data.length * 34);
          const pad = { left: 170, right: 90, top: 26, bottom: 58 };
          const plotRight = width - pad.right;
          const plotBottom = height - pad.bottom;
          const innerWidth = plotRight - pad.left;
          const innerHeight = plotBottom - pad.top;
          const rowHeight = innerHeight / Math.max(1, data.length);
          return (
            <ChartCard title={chartTitle} subtitle={chartSubtitle}>
              <svg
                className="cmd-svg"
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                style={{ height }}
              >
                {ticks.map((tick) => {
                  const x = pad.left + (tick / axisMax) * innerWidth;
                  return (
                    <React.Fragment key={tick}>
                      <line
                        className="cmd-axis-grid"
                        x1={x}
                        x2={x}
                        y1={pad.top}
                        y2={plotBottom}
                      />
                      <text
                        className="cmd-axis-label"
                        x={x}
                        y={plotBottom + 18}
                        textAnchor="middle"
                      >
                        {formatAxisTick(tick, config.metric)}
                      </text>
                    </React.Fragment>
                  );
                })}
                <line
                  className="cmd-axis-line"
                  x1={pad.left}
                  x2={pad.left}
                  y1={pad.top}
                  y2={plotBottom}
                />
                <line
                  className="cmd-axis-line"
                  x1={pad.left}
                  x2={plotRight}
                  y1={plotBottom}
                  y2={plotBottom}
                />
                {data.map((item, index) => {
                  const barHeight = Math.min(18, rowHeight * 0.58);
                  const y = pad.top + rowHeight * index + (rowHeight - barHeight) / 2;
                  const barWidth = Math.max(4, (item.value / axisMax) * innerWidth);
                  return (
                    <React.Fragment key={item.label}>
                      <text
                        className="cmd-axis-label"
                        x={pad.left - 10}
                        y={y + barHeight / 2 + 4}
                        textAnchor="end"
                      >
                        {compactAxisLabel(item.label, config.dimension, 20)}
                      </text>
                      <rect
                        x={pad.left}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="7"
                        fill={TOKENS.accent}
                      />
                      <text
                        className="cmd-chart-value-label"
                        x={Math.min(plotRight - 4, pad.left + barWidth + 8)}
                        y={y + barHeight / 2 + 4}
                      >
                        {formatChartValue(item.value, config.metric)}
                      </text>
                      <title>{`${item.label}: ${formatChartValue(
                        item.value,
                        config.metric,
                      )}`}</title>
                    </React.Fragment>
                  );
                })}
                <text
                  className="cmd-axis-title"
                  x={(pad.left + plotRight) / 2}
                  y={height - 10}
                  textAnchor="middle"
                >
                  {metricAxisLabel}
                </text>
                <text
                  className="cmd-axis-title"
                  transform={`translate(16 ${(pad.top + plotBottom) / 2}) rotate(-90)`}
                  textAnchor="middle"
                >
                  {dimensionLabelText}
                </text>
              </svg>
            </ChartCard>
          );
        }

        const width = 760;
        const height = 320;
        const pad = { left: 82, right: 32, top: 34, bottom: 78 };
        const plotRight = width - pad.right;
        const plotBottom = height - pad.bottom;
        const innerWidth = plotRight - pad.left;
        const innerHeight = plotBottom - pad.top;
        const slotWidth = innerWidth / Math.max(1, data.length);
        const barWidth = Math.min(52, slotWidth * 0.58);

        return (
          <ChartCard title={chartTitle} subtitle={chartSubtitle}>
            <svg className="cmd-svg" viewBox={`0 0 ${width} ${height}`} role="img">
              <defs>
                <linearGradient id="cmdColumnGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5c89e7" />
                  <stop offset="100%" stopColor={TOKENS.accent} />
                </linearGradient>
              </defs>
              {ticks.map((tick) => {
                const y = pad.top + innerHeight - (tick / axisMax) * innerHeight;
                return (
                  <React.Fragment key={tick}>
                    <line
                      className="cmd-axis-grid"
                      x1={pad.left}
                      x2={plotRight}
                      y1={y}
                      y2={y}
                    />
                    <text
                      className="cmd-axis-label"
                      x={pad.left - 10}
                      y={y + 4}
                      textAnchor="end"
                    >
                      {formatAxisTick(tick, config.metric)}
                    </text>
                  </React.Fragment>
                );
              })}
              <line
                className="cmd-axis-line"
                x1={pad.left}
                x2={pad.left}
                y1={pad.top}
                y2={plotBottom}
              />
              <line
                className="cmd-axis-line"
                x1={pad.left}
                x2={plotRight}
                y1={plotBottom}
                y2={plotBottom}
              />
              {data.map((item, index) => {
                const barHeight = Math.max(4, (item.value / axisMax) * innerHeight);
                const x = pad.left + slotWidth * index + (slotWidth - barWidth) / 2;
                const y = plotBottom - barHeight;
                return (
                  <React.Fragment key={item.label}>
                    <rect
                      className="cmd-chart-column"
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="5"
                    />
                    <text
                      className="cmd-chart-value-label"
                      x={x + barWidth / 2}
                      y={Math.max(12, y - 8)}
                      textAnchor="middle"
                    >
                      {formatAxisTick(item.value, config.metric)}
                    </text>
                    <text
                      className="cmd-axis-label"
                      x={x + barWidth / 2}
                      y={plotBottom + 20}
                      textAnchor="middle"
                    >
                      {compactAxisLabel(item.label, config.dimension, 14)}
                    </text>
                    <title>{`${item.label}: ${formatChartValue(
                      item.value,
                      config.metric,
                    )}`}</title>
                  </React.Fragment>
                );
              })}
              <text
                className="cmd-axis-title"
                x={(pad.left + plotRight) / 2}
                y={height - 12}
                textAnchor="middle"
              >
                {dimensionLabelText}
              </text>
              <text
                className="cmd-axis-title"
                transform={`translate(18 ${(pad.top + plotBottom) / 2}) rotate(-90)`}
                textAnchor="middle"
              >
                {metricAxisLabel}
              </text>
            </svg>
          </ChartCard>
        );
      }

      function ChartsView({ records, chart }) {
        return (
          <div className="cmd-charts-grid">
            <GenericChart records={records} config={chart} />
          </div>
        );
      }

      function CaseMatterDashboardBlock() {
        const { loading, records, reload } = useCaseMatterData();
        const [viewMode, setViewMode] = useState("table");
        const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
        const [columnWidths, setColumnWidths] = useState(() =>
          normalizeColumnWidths(DEFAULT_COLUMN_WIDTHS),
        );
        const [search, setSearch] = useState("");
        const [groupBy, setGroupBy] = useState("none");
        const [sortBy, setSortBy] = useState("deadline");
        const [page, setPage] = useState(1);
        const [chartDateRange, setChartDateRange] = useState([]);
        const [chartA, setChartA] = useState(DEFAULT_CHART_A);

        useEffect(() => {
          setPage(1);
        }, [search, groupBy, sortBy]);

        const filteredRecords = useMemo(() => {
          const keyword = normalizeText(search);
          return records
            .filter((record) => {
              if (!keyword) return true;
              const haystack = normalizeText(
                [
                  record.caseCode,
                  record.projectName,
                  record.customerName,
                  record.serviceName,
                  record.serviceFullName,
                  record.projectManagerName,
                  record.internalCompanyName,
                  record.contractName,
                  record.customerId,
                  record.projectManagerId,
                  record.contractId,
                  STATUS_META[record.statusKey]?.label,
                  PRIORITY_META[record.priorityKey]?.label,
                ].join(" "),
              );
              return haystack.includes(keyword);
            })
            .sort(compareRecords(sortBy));
        }, [records, search, sortBy]);

        const chartRecords = useMemo(
          () =>
            records.filter((record) => isRecordInDateRange(record, chartDateRange)),
          [records, chartDateRange],
        );

        const kpi = useMemo(() => {
          const total = records.length;
          const active = records.filter((record) =>
            ["dangXuLy", "choPhanHoi"].includes(record.statusKey),
          ).length;
          const done = records.filter(
            (record) => record.statusKey === "hoanThanh",
          ).length;
          const overdue = records.filter((record) => record.isOverdue).length;
          const upcoming = records.filter((record) => record.isUpcoming).length;
          const revenue = records.reduce((sum, record) => sum + record.revenue, 0);
          const percent = (value) => (total ? Math.round((value / total) * 100) : 0);
          return { total, active, done, overdue, upcoming, revenue, percent };
        }, [records]);

        const configContent = (
          <ConfigPanel
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            columnWidths={columnWidths}
            setColumnWidths={setColumnWidths}
          />
        );

        return (
          <div className="cmd-root">
            <style>{styles}</style>
            <div className="cmd-shell">
              <Header
                viewMode={viewMode}
                setViewMode={setViewMode}
                reload={reload}
                loading={loading}
              />

              <div className="cmd-kpi-grid">
                <KpiCard
                  label="Total Cases"
                  value={fmtNumber(kpi.total)}
                  note="All case matters"
                  color={TOKENS.accent}
                />
                <KpiCard
                  label="In Progress"
                  value={fmtNumber(kpi.active)}
                  note={`${kpi.percent(kpi.active)}% of total cases`}
                  color={TOKENS.accent}
                />
                <KpiCard
                  label="Overdue"
                  value={fmtNumber(kpi.overdue)}
                  note="Needs priority attention"
                  color={OVERDUE_META.chart}
                />
                <KpiCard
                  label="Due Soon"
                  value={fmtNumber(kpi.upcoming)}
                  note="Within the next 7 days"
                  color={TOKENS.amber}
                />
                <KpiCard
                  label="Completed"
                  value={fmtNumber(kpi.done)}
                  note={`${kpi.percent(kpi.done)}% of total cases`}
                  color={TOKENS.green}
                />
                <KpiCard
                  label="Contract Revenue"
                  value={fmtMoney(kpi.revenue)}
                  note="From services and contracts"
                  color="#6d5bd0"
                />
              </div>

              <div className="cmd-body">
                <main className="cmd-main">
                  {viewMode === "table" ? (
                    <Toolbar
                      search={search}
                      setSearch={setSearch}
                      groupBy={groupBy}
                      setGroupBy={setGroupBy}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      filteredCount={filteredRecords.length}
                      totalCount={records.length}
                    />
                  ) : (
                    <ChartToolbar
                      dateRange={chartDateRange}
                      setDateRange={setChartDateRange}
                      chart={chartA}
                      setChart={setChartA}
                      recordCount={chartRecords.length}
                    />
                  )}

                  {loading ? (
                    <div className="cmd-card cmd-loading">
                      <Spin tip="Loading case data..." />
                    </div>
                  ) : viewMode === "table" ? (
                    <CaseTable
                      rows={filteredRecords}
                      groupBy={groupBy}
                      visibleColumns={visibleColumns}
                      columnWidths={columnWidths}
                      setColumnWidths={setColumnWidths}
                      configContent={configContent}
                      page={page}
                      setPage={setPage}
                    />
                  ) : chartRecords.length ? (
                    <ChartsView records={chartRecords} chart={chartA} />
                  ) : (
                    <div className="cmd-card cmd-empty">
                      <Empty description="No data available for chart display" />
                    </div>
                  )}
                </main>
              </div>
            </div>
          </div>
        );
      }

      ctx.render(<CaseMatterDashboardBlock />);
