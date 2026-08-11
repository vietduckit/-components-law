// ============================================================
// Dashboard Management System - NocoBase Custom JS Block
// Default admin view. Data is loaded from core collections.
// View modes: Dashboard, Table, Charts.
// ============================================================
const { React, antd } = ctx;
const { useCallback, useEffect, useMemo, useState } = React;
const {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Input,
  Popover,
  Progress,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} = antd;
const { Text, Title } = Typography;

const STORAGE_KEY = "dms_admin_default_view_v1";

const DEFAULT_CONFIG = {
  mode: "dashboard",
  showConfig: false,
  configTab: "fields",
  sortBy: "createdAt",
  sortDir: "desc",
  groupBy: "none",
  tableConfig: {
    density: "middle",
    pageSize: 10,
    showSelection: true,
    showSummary: true,
  },
  chartA: {
    type: "column",
    dimension: "status",
    metric: "count",
    limit: 8,
  },
  chartB: {
    type: "donut",
    dimension: "category",
    metric: "revenue",
    limit: 8,
  },
  activeWidgets: {
    summary: true,
    chart: true,
    table: true,
  },
  visibleFields: {
    code: true,
    name: true,
    customer: true,
    status: true,
    owner: true,
    category: true,
    progress: true,
    value: true,
    createdAt: true,
  },
};

const ModeOptions = [
  { label: "Dashboard", value: "dashboard" },
  { label: "Table", value: "table" },
  { label: "Charts", value: "charts" },
];

const FieldDefs = [
  { key: "code", label: "Case code", type: "Sequence field" },
  { key: "name", label: "Record name", type: "Text, pinned left" },
  { key: "customer", label: "Customer", type: "Customer short name" },
  { key: "status", label: "Status", type: "Status badge" },
  { key: "owner", label: "Owner", type: "User field" },
  { key: "category", label: "Internal company", type: "Grouping field" },
  { key: "progress", label: "Progress", type: "Progress field" },
  { key: "value", label: "Revenue", type: "Contract service value" },
  { key: "createdAt", label: "Created date", type: "Date field" },
  { key: "deadline", label: "Deadline", type: "Date field" },
];

const DimensionOptions = [
  { value: "status", label: "Status" },
  { value: "customer", label: "Customer" },
  { value: "category", label: "Internal company" },
  { value: "owner", label: "Case manager" },
  { value: "createdMonth", label: "Created month" },
  { value: "progressBand", label: "Progress band" },
  { value: "revenueBand", label: "Revenue band" },
];

const MetricOptions = [
  { value: "count", label: "Case count" },
  { value: "revenue", label: "Revenue" },
  { value: "avgProgress", label: "Average progress" },
  { value: "completed", label: "Completed cases" },
  { value: "pending", label: "Pending cases" },
  { value: "overdue", label: "Overdue cases" },
];

const ChartTypeOptions = [
  { value: "column", label: "Column" },
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "donut", label: "Donut" },
  { value: "pie", label: "Pie" },
  { value: "stackedBar", label: "Stacked bar" },
  { value: "radar", label: "Radar" },
  { value: "funnel", label: "Funnel" },
  { value: "treemap", label: "Treemap" },
  { value: "scatter", label: "Scatter" },
  { value: "kpi", label: "Number" },
];

const TableDensityOptions = [
  { value: "small", label: "Compact" },
  { value: "middle", label: "Comfortable" },
  { value: "large", label: "Spacious" },
];

const STATUS_META = {
  toDo: { label: "Pending", color: "warning" },
  todo: { label: "Pending", color: "warning" },
  pending: { label: "Pending", color: "warning" },
  inProgress: { label: "Active", color: "processing" },
  in_progress: { label: "Active", color: "processing" },
  active: { label: "Active", color: "processing" },
  done: { label: "Completed", color: "success" },
  completed: { label: "Completed", color: "success" },
  cancelled: { label: "Archived", color: "default" },
  canceled: { label: "Archived", color: "default" },
  archived: { label: "Archived", color: "default" },
  blocked: { label: "Blocked", color: "error" },
};

const statusColor = {
  Active: "processing",
  Pending: "warning",
  Completed: "success",
  Archived: "default",
  Blocked: "error",
};

const styles = `
.dms-root {
  --dms-bg: #f6f7f9;
  --dms-surface: #ffffff;
  --dms-muted-surface: #fafafa;
  --dms-border: #e5e7eb;
  --dms-soft-border: #eef0f3;
  --dms-text: #1f2937;
  --dms-muted: #6b7280;
  --dms-quiet: #9ca3af;
  --dms-primary: #1677ff;
  --dms-primary-100: #e6f4ff;
  --dms-radius: 8px;
  --dms-shadow: 0 1px 2px rgba(15, 23, 42, .04);
  min-height: 100%;
  padding: 16px;
  background: var(--dms-bg);
  color: var(--dms-text);
  font-size: 13px;
}
.dms-shell {
  max-width: 1680px;
  margin: 0 auto;
  display: grid;
  gap: 14px;
}
.dms-card {
  border: 1px solid var(--dms-border);
  border-radius: var(--dms-radius);
  box-shadow: var(--dms-shadow);
  background: var(--dms-surface);
}
.dms-header {
  padding: 16px;
}
.dms-header-row,
.dms-toolbar-row,
.dms-widget-head,
.dms-config-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.dms-header-row {
  align-items: flex-start;
  flex-wrap: wrap;
}
.dms-breadcrumb {
  color: var(--dms-muted);
  font-size: 12px;
  margin-bottom: 4px;
}
.dms-title-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.dms-title-line .ant-typography {
  margin: 0;
}
.dms-header-subtitle {
  color: var(--dms-muted);
  font-size: 12px;
  margin-top: 4px;
}
.dms-toolbar {
  padding: 12px;
  display: grid;
  gap: 12px;
}
.dms-toolbar-row {
  flex-wrap: wrap;
}
.dms-filter-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(4, minmax(140px, 1fr));
  gap: 8px;
}
.dms-chip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.dms-chip {
  display: inline-flex;
  align-items: center;
  height: 26px;
  border: 1px solid var(--dms-border);
  border-radius: 999px;
  padding: 0 10px;
  background: var(--dms-surface);
  color: var(--dms-muted);
  font-size: 12px;
}
.dms-chip-active {
  color: #0958d9;
  border-color: #91caff;
  background: var(--dms-primary-100);
}
.dms-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.dms-metric {
  padding: 14px;
  min-height: 112px;
}
.dms-metric-label {
  color: var(--dms-muted);
  font-size: 12px;
  margin-bottom: 8px;
}
.dms-metric-value {
  font-size: 24px;
  font-weight: 750;
  letter-spacing: -.02em;
  margin-bottom: 8px;
}
.dms-metric-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--dms-muted);
  font-size: 12px;
}
.dms-trend {
  color: #15803d;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  padding: 1px 8px;
  font-weight: 650;
}
.dms-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 352px;
  gap: 14px;
  align-items: start;
}
.dms-workspace-full {
  grid-template-columns: minmax(0, 1fr);
}
.dms-canvas {
  display: grid;
  gap: 14px;
  min-width: 0;
}
.dms-widget-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 12px;
}
.dms-span-4 { grid-column: span 4; }
.dms-span-5 { grid-column: span 5; }
.dms-span-6 { grid-column: span 6; }
.dms-span-7 { grid-column: span 7; }
.dms-span-12 { grid-column: span 12; }
.dms-widget {
  overflow: hidden;
}
.dms-widget-head,
.dms-config-head {
  padding: 12px 14px;
  border-bottom: 1px solid var(--dms-soft-border);
}
.dms-widget-title,
.dms-config-title {
  font-weight: 700;
  font-size: 13px;
}
.dms-subtitle {
  color: var(--dms-muted);
  font-size: 12px;
  margin-top: 2px;
}
.dms-widget-body {
  padding: 14px;
}
.dms-chart {
  height: 230px;
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 10px;
  align-items: end;
}
.dms-chart-axis {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--dms-quiet);
  font-size: 11px;
  text-align: right;
  padding-bottom: 24px;
}
.dms-bars {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 10px;
  align-items: end;
  border-left: 1px solid var(--dms-soft-border);
  border-bottom: 1px solid var(--dms-soft-border);
  padding: 0 10px 24px;
}
.dms-bar-group {
  display: flex;
  align-items: end;
  justify-content: center;
  gap: 4px;
  height: 100%;
  position: relative;
}
.dms-bar {
  width: 12px;
  border-radius: 4px 4px 0 0;
  background: var(--dms-primary);
}
.dms-bar-secondary {
  background: #8b5cf6;
}
.dms-bar-label {
  position: absolute;
  bottom: -20px;
  color: var(--dms-quiet);
  font-size: 11px;
  white-space: nowrap;
}
.dms-donut-wrap {
  display: grid;
  grid-template-columns: 148px 1fr;
  gap: 18px;
  align-items: center;
  min-height: 230px;
}
.dms-donut {
  width: 136px;
  height: 136px;
  border-radius: 50%;
  background: var(--dms-donut-bg, conic-gradient(#d9d9d9 0 100%));
  position: relative;
  margin: auto;
}
.dms-donut::after {
  content: "";
  position: absolute;
  inset: 28px;
  background: var(--dms-surface);
  border-radius: 50%;
  border: 1px solid var(--dms-soft-border);
}
.dms-legend {
  display: grid;
  gap: 8px;
}
.dms-legend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--dms-muted);
}
.dms-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
  background: var(--dms-primary);
}
.dms-config {
  position: sticky;
  top: 12px;
  overflow: hidden;
}
.dms-config-body {
  padding: 12px;
  display: grid;
  gap: 14px;
}
.dms-config .dms-chart-config-row {
  grid-template-columns: 1fr;
}
.dms-section-title {
  color: var(--dms-quiet);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: 8px;
}
.dms-config-list {
  display: grid;
  gap: 8px;
}
.dms-config-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--dms-border);
  border-radius: 7px;
  padding: 9px 10px;
  background: var(--dms-surface);
}
.dms-drag {
  color: var(--dms-quiet);
  letter-spacing: -2px;
  cursor: grab;
}
.dms-switch {
  width: 32px;
  height: 18px;
  border-radius: 999px;
  background: var(--dms-primary);
  position: relative;
}
.dms-switch::after {
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 2px;
  right: 2px;
}
.dms-switch-off {
  background: #d1d5db;
}
.dms-switch-off::after {
  right: auto;
  left: 2px;
}
.dms-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.dms-rule-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 6px;
  align-items: center;
}
.dms-table-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.dms-icon-button {
  width: 34px;
  height: 32px;
  padding: 0;
}
.dms-settings-icon {
  width: 16px;
  height: 16px;
  display: inline-grid;
  gap: 3px;
}
.dms-settings-icon::before,
.dms-settings-icon::after,
.dms-settings-icon span {
  content: "";
  display: block;
  height: 2px;
  border-radius: 999px;
  background: #4b5563;
}
.dms-settings-menu {
  width: 360px;
  max-width: calc(100vw - 48px);
  display: grid;
  gap: 14px;
}
.dms-control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.dms-field-checks {
  max-height: 210px;
  overflow: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-right: 4px;
}
.dms-chart-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.dms-chart-layout .dms-span-6 {
  grid-column: auto;
}
.dms-chart-config {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}
.dms-chart-config-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.dms-chart-stage {
  min-height: 280px;
  border: 1px solid var(--dms-soft-border);
  border-radius: var(--dms-radius);
  background: linear-gradient(180deg, #fff, #fbfcfe);
  padding: 12px;
  overflow: hidden;
}
.dms-generic-chart {
  height: 248px;
  width: 100%;
  position: relative;
}
.dms-axis-chart {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 10px;
}
.dms-generic-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--dms-quiet);
  font-size: 11px;
  text-align: right;
  padding-bottom: 28px;
}
.dms-column-grid {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(34px, 1fr);
  gap: 10px;
  align-items: end;
  border-left: 1px solid var(--dms-soft-border);
  border-bottom: 1px solid var(--dms-soft-border);
  padding: 0 10px 28px;
  overflow-x: auto;
}
.dms-column-item,
.dms-bar-item,
.dms-stack-item,
.dms-funnel-item {
  position: relative;
}
.dms-column {
  display: block;
  min-height: 4px;
  border-radius: 5px 5px 0 0;
  background: var(--dms-primary);
}
.dms-chart-label {
  position: absolute;
  color: var(--dms-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dms-column-item .dms-chart-label {
  left: 50%;
  bottom: -23px;
  max-width: 86px;
  transform: translateX(-50%);
}
.dms-bar-grid,
.dms-stack-grid,
.dms-funnel-grid {
  display: grid;
  gap: 10px;
  align-content: center;
  height: 100%;
}
.dms-bar-track,
.dms-stack-track {
  height: 22px;
  border-radius: 999px;
  background: #eef2f7;
  overflow: hidden;
}
.dms-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--dms-primary);
}
.dms-stack-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--dms-primary), #13c2c2);
}
.dms-bar-label-row {
  display: grid;
  grid-template-columns: minmax(92px, 160px) 1fr auto;
  gap: 10px;
  align-items: center;
  color: var(--dms-muted);
  font-size: 12px;
}
.dms-chart-svg {
  width: 100%;
  height: 100%;
}
.dms-line-path {
  fill: none;
  stroke: var(--dms-primary);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.dms-area-path {
  fill: rgba(22, 119, 255, .14);
  stroke: var(--dms-primary);
  stroke-width: 2;
}
.dms-pie-wrap {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  height: 100%;
}
.dms-pie {
  width: 154px;
  height: 154px;
  border-radius: 50%;
  background: var(--dms-pie-bg, conic-gradient(#d9d9d9 0 100%));
  margin: auto;
  position: relative;
}
.dms-pie.dms-donut-hole::after {
  content: "";
  position: absolute;
  inset: 34px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid var(--dms-soft-border);
}
.dms-funnel-bar {
  height: 28px;
  margin: 0 auto;
  border-radius: 6px;
  background: linear-gradient(90deg, #1677ff, #13c2c2);
}
.dms-treemap {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 70px;
  gap: 8px;
  height: 100%;
}
.dms-treemap-cell {
  border-radius: 7px;
  background: #e6f4ff;
  border: 1px solid #91caff;
  padding: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}
.dms-scatter {
  height: 100%;
  border-left: 1px solid var(--dms-soft-border);
  border-bottom: 1px solid var(--dms-soft-border);
  position: relative;
  margin: 0 8px 20px 34px;
}
.dms-scatter-point {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dms-primary);
  box-shadow: 0 0 0 4px rgba(22, 119, 255, .12);
}
.dms-radar-label {
  fill: #6b7280;
  font-size: 11px;
}
.dms-kpi-chart {
  height: 100%;
  display: grid;
  place-items: center;
  text-align: center;
}
.dms-kpi-value {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -.03em;
}
@media (max-width: 1180px) {
  .dms-workspace,
  .dms-workspace-full {
    grid-template-columns: 1fr;
  }
  .dms-config {
    position: static;
  }
  .dms-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dms-chart-layout {
    grid-template-columns: 1fr;
  }
  .dms-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .dms-root {
    padding: 12px;
  }
  .dms-header-row,
  .dms-toolbar-row,
  .dms-widget-head,
  .dms-config-head {
    align-items: stretch;
    flex-direction: column;
  }
  .dms-header-row .ant-space,
  .dms-toolbar-row .ant-space,
  .dms-header-row .ant-select,
  .dms-toolbar-row .ant-btn,
  .dms-toolbar-row .ant-segmented,
  .dms-filter-grid .ant-input,
  .dms-filter-grid .ant-select {
    width: 100% !important;
  }
  .dms-summary-grid,
  .dms-filter-grid,
  .dms-donut-wrap,
  .dms-form-grid,
  .dms-rule-row,
  .dms-control-grid,
  .dms-chart-config-row,
  .dms-pie-wrap {
    grid-template-columns: 1fr;
  }
  .dms-field-checks {
    grid-template-columns: 1fr;
  }
  .dms-bar-label-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .dms-widget-grid {
    grid-template-columns: 1fr;
  }
  .dms-span-4,
  .dms-span-5,
  .dms-span-6,
  .dms-span-7,
  .dms-span-12 {
    grid-column: auto;
  }
  .dms-chart {
    grid-template-columns: 34px 1fr;
  }
  .dms-bars {
    gap: 6px;
    padding-left: 8px;
    padding-right: 8px;
  }
}
`;

const extractId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length ? extractId(value[0]) : null;
  if (typeof value === "object") return value.id ? parseInt(value.id, 10) : null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseNum = (value) =>
  parseFloat(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;

const fmtNumber = (value) => Number(value || 0).toLocaleString("vi-VN");

const fmtCompact = (value) => {
  const n = Number(value || 0);
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}B`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}M`;
  return n.toLocaleString("vi-VN");
};

const fmtDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN");
};

const projectBaseDate = (project) => project.date || project.createdAt;

const isDeletedServiceRecord = (record) =>
  !!record?.isDeleted ||
  String(record?.status || record?.lineStatus || "")
    .toLowerCase()
    .trim() === "deleted";

const serviceRowTotal = (record) => {
  const total = parseNum(record?.totalAmount);
  if (total) return total;
  const packageTotal = parseNum(record?.packageTotalAmount);
  if (packageTotal) return packageTotal;
  const sub =
    parseNum(record?.packageSubTotal) ||
    parseNum(record?.subTotal) ||
    parseNum(record?.basePrice) * (parseNum(record?.quantity) || 1);
  return sub + parseNum(record?.vatAmount || record?.packageVatAmount);
};

async function fetchListOnce(url, params = {}) {
  try {
    const requestUrl = new URL(`/api/${url}`, window.location.origin);
    Object.entries({ pageSize: 2000, page: 1, ...params }).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      requestUrl.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
    });

    const response = await window.fetch(requestUrl.toString(), {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.errors || payload?.error) return null;
    return payload?.data?.data || payload?.data || [];
  } catch (error) {
    return null;
  }
}

async function fetchList(url, params = {}) {
  const primary = await fetchListOnce(url, params);
  if (Array.isArray(primary)) return primary;

  if (params?.fields) {
    const { fields, ...fallbackParams } = params;
    const fallback = await fetchListOnce(url, fallbackParams);
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
}

const PROJECT_SAFE_FIELDS =
  "id,caseCode,projectName,status,date,deadline,closedDate,createdAt,customerId,internalCompanyId,projectManagerId,contractId";
const TASK_SAFE_FIELDS = "id,status,projectId";
const PROJECT_SERVICE_SAFE_FIELDS = "id,projectId,totalAmount";
const CONTRACT_SERVICE_SAFE_FIELDS = "id,projectId,contractId,totalAmount";
const LAWYER_SAFE_FIELDS = "id,lawyerName";
const CUSTOMER_SAFE_FIELDS = "id,customerName,shortName";

async function fetchProjects() {
  return fetchList("projects:list", { fields: PROJECT_SAFE_FIELDS });
}

function loadSavedConfig() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw), showConfig: false };
  } catch {
    return DEFAULT_CONFIG;
  }
}

const palette = ["#1677ff", "#13c2c2", "#faad14", "#722ed1", "#52c41a", "#eb2f96", "#fa541c", "#2f54eb"];

const optionLabel = (options, value) =>
  options.find((item) => item.value === value)?.label || value;

const metricLabel = (metric) => optionLabel(MetricOptions, metric);

const formatMetricValue = (value, metric) => {
  if (metric === "revenue") return `${fmtCompact(value)} VND`;
  if (metric === "avgProgress") return `${Math.round(value || 0)}%`;
  return fmtNumber(value);
};

const createdMonthLabel = (record) => {
  const date = new Date(record.createdAt);
  if (Number.isNaN(date.getTime())) return "No date";
  return `M${date.getMonth() + 1}/${date.getFullYear()}`;
};

const progressBand = (value) => {
  const progress = Number(value || 0);
  if (progress >= 80) return "80-100%";
  if (progress >= 50) return "50-79%";
  if (progress >= 20) return "20-49%";
  return "0-19%";
};

const revenueBand = (value) => {
  const revenue = Number(value || 0);
  if (revenue >= 1000000000) return ">= 1B";
  if (revenue >= 300000000) return "300M-1B";
  if (revenue >= 100000000) return "100M-300M";
  if (revenue > 0) return "< 100M";
  return "No revenue";
};

const dimensionValue = (record, dimension) => {
  if (dimension === "createdMonth") return createdMonthLabel(record);
  if (dimension === "progressBand") return progressBand(record.progress);
  if (dimension === "revenueBand") return revenueBand(record.value);
  return record[dimension] || "Unknown";
};

const metricValue = (record, metric) => {
  if (metric === "revenue") return Number(record.value || 0);
  if (metric === "avgProgress") return Number(record.progress || 0);
  if (metric === "completed") return record.status === "Completed" ? 1 : 0;
  if (metric === "pending") return record.status === "Pending" ? 1 : 0;
  if (metric === "overdue") return record.isOverdue ? 1 : 0;
  return 1;
};

const buildChartData = (records, config) => {
  const buckets = {};
  records.forEach((record) => {
    const label = dimensionValue(record, config.dimension);
    if (!buckets[label]) buckets[label] = { label, value: 0, count: 0, raw: [] };
    buckets[label].value += metricValue(record, config.metric);
    buckets[label].count += 1;
    buckets[label].raw.push(record);
  });

  const rows = Object.values(buckets).map((item) => ({
    ...item,
    value: config.metric === "avgProgress" ? item.value / Math.max(1, item.count) : item.value,
  }));

  const sorted =
    config.dimension === "createdMonth"
      ? rows.sort((a, b) => String(a.label).localeCompare(String(b.label), "vi"))
      : rows.sort((a, b) => b.value - a.value);

  return sorted.slice(0, config.limit || 8);
};

const chartMax = (data) => Math.max(1, ...data.map((item) => Number(item.value || 0)));

const normalizeStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return STATUS_META.pending.label;
  return STATUS_META[raw]?.label || STATUS_META[raw.toLowerCase()]?.label || raw;
};

function MetricCard({ label, value, trend, note, status }) {
  return (
    <div className="dms-card dms-metric">
      <div className="dms-metric-label">{label}</div>
      <div className="dms-metric-value">{value}</div>
      <div className="dms-metric-foot">
        {status ? <Tag color={status.color}>{status.label}</Tag> : <span className="dms-trend">{trend}</span>}
        <span>{note}</span>
      </div>
    </div>
  );
}

function ChartLegend({ data, metric }) {
  return (
    <div className="dms-legend">
      {data.slice(0, 6).map((item, index) => (
        <div className="dms-legend-item" key={item.label}>
          <span><span className="dms-dot" style={{ background: palette[index % palette.length] }} />{item.label}</span>
          <strong>{formatMetricValue(item.value, metric)}</strong>
        </div>
      ))}
    </div>
  );
}

function AxisLabels({ maxValue }) {
  return (
    <div className="dms-generic-axis">
      <span>{fmtCompact(maxValue)}</span>
      <span>{fmtCompact(maxValue * 0.75)}</span>
      <span>{fmtCompact(maxValue * 0.5)}</span>
      <span>{fmtCompact(maxValue * 0.25)}</span>
      <span>0</span>
    </div>
  );
}

function ColumnChart({ data, metric }) {
  const maxValue = chartMax(data);
  return (
    <div className="dms-generic-chart dms-axis-chart">
      <AxisLabels maxValue={maxValue} />
      <div className="dms-column-grid">
        {data.map((item, index) => (
          <div className="dms-column-item" key={item.label} title={`${item.label}: ${formatMetricValue(item.value, metric)}`}>
            <span
              className="dms-column"
              style={{
                height: `${Math.max(4, (item.value / maxValue) * 100)}%`,
                background: palette[index % palette.length],
              }}
            />
            <span className="dms-chart-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data, metric, stacked = false }) {
  const maxValue = chartMax(data);
  return (
    <div className={`dms-generic-chart ${stacked ? "dms-stack-grid" : "dms-bar-grid"}`}>
      {data.map((item, index) => (
        <div className={stacked ? "dms-stack-item" : "dms-bar-item"} key={item.label}>
          <div className="dms-bar-label-row">
            <Text ellipsis>{item.label}</Text>
            <div className={stacked ? "dms-stack-track" : "dms-bar-track"}>
              <div
                className={stacked ? "dms-stack-fill" : "dms-bar-fill"}
                style={{
                  width: `${Math.max(2, (item.value / maxValue) * 100)}%`,
                  background: stacked ? undefined : palette[index % palette.length],
                }}
              />
            </div>
            <Text type="secondary">{formatMetricValue(item.value, metric)}</Text>
          </div>
        </div>
      ))}
    </div>
  );
}

function LineAreaChart({ data, metric, area = false }) {
  const maxValue = chartMax(data);
  const points = data.map((item, index) => {
    const x = data.length <= 1 ? 500 : 48 + (index * 904) / (data.length - 1);
    const y = 214 - (Number(item.value || 0) / maxValue) * 178;
    return { x, y, item };
  });
  const pointText = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = points.length
    ? `M ${points[0].x},220 L ${pointText.split(" ").join(" L ")} L ${points[points.length - 1].x},220 Z`
    : "";

  return (
    <div className="dms-generic-chart">
      <svg className="dms-chart-svg" viewBox="0 0 1000 250" preserveAspectRatio="none">
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1="44" x2="972" y1={36 + line * 46} y2={36 + line * 46} stroke="#eef0f3" />
        ))}
        {area && <path className="dms-area-path" d={areaPath} />}
        {!area && <polyline className="dms-line-path" points={pointText} />}
        {points.map((point, index) => (
          <circle key={point.item.label} cx={point.x} cy={point.y} r="6" fill={palette[index % palette.length]}>
            <title>{`${point.item.label}: ${formatMetricValue(point.item.value, metric)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function PieChart({ data, metric, donut = false }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  let cursor = 0;
  const stops = data.length
    ? data
      .map((item, index) => {
        const size = (Number(item.value || 0) / total) * 100;
        const start = cursor;
        const end = cursor + size;
        cursor = end;
        return `${palette[index % palette.length]} ${start}% ${end}%`;
      })
      .join(", ")
    : "#d9d9d9 0 100%";

  return (
    <div className="dms-generic-chart dms-pie-wrap">
      <div className={`dms-pie ${donut ? "dms-donut-hole" : ""}`} style={{ "--dms-pie-bg": `conic-gradient(${stops})` }} />
      <ChartLegend data={data} metric={metric} />
    </div>
  );
}

function RadarChart({ data, metric }) {
  const maxValue = chartMax(data);
  const centerX = 130;
  const centerY = 118;
  const radius = 82;
  const points = data.slice(0, 8).map((item, index, arr) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, arr.length) - Math.PI / 2;
    const scale = Number(item.value || 0) / maxValue;
    return {
      x: centerX + Math.cos(angle) * radius * scale,
      y: centerY + Math.sin(angle) * radius * scale,
      labelX: centerX + Math.cos(angle) * (radius + 24),
      labelY: centerY + Math.sin(angle) * (radius + 24),
      item,
    };
  });
  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="dms-generic-chart">
      <svg className="dms-chart-svg" viewBox="0 0 260 240">
        {[.25, .5, .75, 1].map((scale) => (
          <circle key={scale} cx={centerX} cy={centerY} r={radius * scale} fill="none" stroke="#eef0f3" />
        ))}
        {points.map((point) => (
          <line key={point.item.label} x1={centerX} y1={centerY} x2={point.labelX} y2={point.labelY} stroke="#eef0f3" />
        ))}
        <polygon points={polygon} fill="rgba(22, 119, 255, .18)" stroke="#1677ff" strokeWidth="2" />
        {points.map((point) => (
          <text key={point.item.label} x={point.labelX} y={point.labelY} textAnchor="middle" className="dms-radar-label">
            {String(point.item.label).slice(0, 12)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function FunnelChart({ data, metric }) {
  const maxValue = chartMax(data);
  return (
    <div className="dms-generic-chart dms-funnel-grid">
      {data.map((item, index) => (
        <div className="dms-funnel-item" key={item.label}>
          <div
            className="dms-funnel-bar"
            style={{
              width: `${Math.max(16, (item.value / maxValue) * 100)}%`,
              background: palette[index % palette.length],
            }}
            title={`${item.label}: ${formatMetricValue(item.value, metric)}`}
          />
          <div className="dms-subtitle" style={{ textAlign: "center" }}>
            {item.label} - {formatMetricValue(item.value, metric)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TreemapChart({ data, metric }) {
  const maxValue = chartMax(data);
  return (
    <div className="dms-generic-chart dms-treemap">
      {data.map((item, index) => (
        <div
          className="dms-treemap-cell"
          key={item.label}
          style={{
            gridColumn: `span ${Math.max(1, Math.min(2, Math.round((item.value / maxValue) * 2)))}`,
            background: index % 2 ? "#f0f5ff" : "#e6f4ff",
          }}
        >
          <Text strong ellipsis>{item.label}</Text>
          <Text type="secondary">{formatMetricValue(item.value, metric)}</Text>
        </div>
      ))}
    </div>
  );
}

function ScatterChart({ data, metric }) {
  const maxValue = chartMax(data);
  return (
    <div className="dms-generic-chart dms-scatter">
      {data.map((item, index) => {
        const left = data.length <= 1 ? 50 : (index / (data.length - 1)) * 94 + 2;
        const bottom = Math.max(3, (Number(item.value || 0) / maxValue) * 88);
        return (
          <span
            className="dms-scatter-point"
            key={item.label}
            style={{ left: `${left}%`, bottom: `${bottom}%`, background: palette[index % palette.length] }}
            title={`${item.label}: ${formatMetricValue(item.value, metric)}`}
          />
        );
      })}
    </div>
  );
}

function KpiChart({ data, metric }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  return (
    <div className="dms-generic-chart dms-kpi-chart">
      <div>
        <div className="dms-kpi-value">{formatMetricValue(total, metric)}</div>
        <div className="dms-subtitle">{metricLabel(metric)} across {fmtNumber(data.length)} groups</div>
      </div>
    </div>
  );
}

function GenericChart({ data, config }) {
  if (!data.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No chart data" />;
  }

  if (config.type === "bar") return <BarChart data={data} metric={config.metric} />;
  if (config.type === "line") return <LineAreaChart data={data} metric={config.metric} />;
  if (config.type === "area") return <LineAreaChart data={data} metric={config.metric} area />;
  if (config.type === "pie") return <PieChart data={data} metric={config.metric} />;
  if (config.type === "donut") return <PieChart data={data} metric={config.metric} donut />;
  if (config.type === "stackedBar") return <BarChart data={data} metric={config.metric} stacked />;
  if (config.type === "radar") return <RadarChart data={data} metric={config.metric} />;
  if (config.type === "funnel") return <FunnelChart data={data} metric={config.metric} />;
  if (config.type === "treemap") return <TreemapChart data={data} metric={config.metric} />;
  if (config.type === "scatter") return <ScatterChart data={data} metric={config.metric} />;
  if (config.type === "kpi") return <KpiChart data={data} metric={config.metric} />;
  return <ColumnChart data={data} metric={config.metric} />;
}

function ChartConfigControls({ config, onChange }) {
  const update = (patch) => onChange({ ...config, ...patch });

  return (
    <div className="dms-chart-config">
      <div className="dms-chart-config-row">
        <Select value={config.type} onChange={(value) => update({ type: value })} options={ChartTypeOptions} />
        <Select value={config.dimension} onChange={(value) => update({ dimension: value })} options={DimensionOptions} />
        <Select value={config.metric} onChange={(value) => update({ metric: value })} options={MetricOptions} />
        <Select
          value={config.limit}
          onChange={(value) => update({ limit: value })}
          options={[4, 6, 8, 10, 12].map((value) => ({ value, label: `Top ${value}` }))}
        />
      </div>
    </div>
  );
}

function ChartPanel({ title, config, data, onChange, configurable = true }) {
  return (
    <WidgetFrame
      title={title}
      subtitle={`${optionLabel(ChartTypeOptions, config.type)} by ${optionLabel(DimensionOptions, config.dimension)} / ${metricLabel(config.metric)}`}
      span={6}
    >
      {configurable && <ChartConfigControls config={config} onChange={onChange} />}
      <div className="dms-chart-stage">
        <GenericChart data={data} config={config} />
      </div>
    </WidgetFrame>
  );
}

function WidgetFrame({ title, subtitle, actions, span = 12, children, className = "" }) {
  return (
    <div className={`dms-card dms-widget dms-span-${span} ${className}`}>
      <div className="dms-widget-head">
        <div>
          <div className="dms-widget-title">{title}</div>
          {subtitle && <div className="dms-subtitle">{subtitle}</div>}
        </div>
        {actions && <Space wrap>{actions}</Space>}
      </div>
      <div className="dms-widget-body">{children}</div>
    </div>
  );
}

function DataTable({ records, visibleFields, tableConfig, compact = false, onRowAction }) {
  const config = tableConfig || DEFAULT_CONFIG.tableConfig;
  const totalRevenue = records.reduce((sum, record) => sum + Number(record.value || 0), 0);
  const avgProgress = records.length
    ? records.reduce((sum, record) => sum + Number(record.progress || 0), 0) / records.length
    : 0;

  const columns = [
    config.showSelection && {
      title: "",
      dataIndex: "select",
      width: 44,
      render: () => <Checkbox />,
    },
    visibleFields.code && {
      title: "Case code",
      dataIndex: "code",
      width: 140,
      fixed: "left",
      ellipsis: true,
    },
    visibleFields.name && {
      title: "Case name",
      dataIndex: "name",
      width: 280,
      render: (value, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.code || `Entity ID ${row.id}`}</Text>
        </Space>
      ),
    },
    visibleFields.customer && { title: "Customer", dataIndex: "customer", width: 170, ellipsis: true },
    visibleFields.status && {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (value) => <Tag color={statusColor[value] || "default"}>{value || "-"}</Tag>,
    },
    visibleFields.owner && { title: "Owner", dataIndex: "owner", width: 150, ellipsis: true },
    visibleFields.category && { title: "Category", dataIndex: "category", width: 160, ellipsis: true },
    visibleFields.progress && {
      title: "Progress",
      dataIndex: "progress",
      width: 150,
      render: (value) => <Progress percent={value} size="small" />,
    },
    visibleFields.value && { title: "Revenue", dataIndex: "valueLabel", width: 130, align: "right" },
    visibleFields.createdAt && { title: "Created date", dataIndex: "createdAtLabel", width: 140 },
    visibleFields.deadline && { title: "Deadline", dataIndex: "deadlineLabel", width: 140 },
    {
      title: "Actions",
      dataIndex: "actions",
      width: 100,
      render: (_, row) => <Button type="text" size="small" onClick={() => onRowAction(row)}>More</Button>,
    },
  ].filter(Boolean);

  return (
    <Table
      size={compact ? "small" : config.density}
      rowKey="id"
      columns={columns}
      dataSource={records}
      pagination={compact ? false : { pageSize: config.pageSize || 10, showSizeChanger: false }}
      scroll={{ x: 1180 }}
      summary={
        !compact && config.showSummary
          ? () => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={Math.max(1, columns.length)}>
                <Space wrap size={16}>
                  <Text strong>{fmtNumber(records.length)} cases</Text>
                  <Text type="secondary">Average progress: {Math.round(avgProgress)}%</Text>
                  <Text type="secondary">Revenue: {fmtCompact(totalRevenue)} VND</Text>
                </Space>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )
          : undefined
      }
    />
  );
}

function TableSettingsPopover({
  visibleFields,
  setVisibleFields,
  tableConfig,
  setTableConfig,
  sortBy,
  setSortBy,
  sortDir,
  setSortDir,
  groupBy,
  setGroupBy,
}) {
  const updateTable = (patch) => setTableConfig((prev) => ({ ...prev, ...patch }));
  const toggleField = (key) => setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const content = (
    <div className="dms-settings-menu">
      <div>
        <div className="dms-section-title">Table display</div>
        <div className="dms-control-grid">
          <Select
            value={tableConfig.density}
            onChange={(value) => updateTable({ density: value })}
            options={TableDensityOptions}
          />
          <Select
            value={tableConfig.pageSize}
            onChange={(value) => updateTable({ pageSize: value })}
            options={[8, 10, 20, 50].map((value) => ({ value, label: `${value} rows` }))}
          />
        </div>
      </div>

      <div>
        <div className="dms-section-title">Fields</div>
        <div className="dms-field-checks">
          {FieldDefs.map((field) => (
            <Checkbox key={field.key} checked={!!visibleFields[field.key]} onChange={() => toggleField(field.key)}>
              {field.label}
            </Checkbox>
          ))}
        </div>
      </div>

      <div>
        <div className="dms-section-title">Sort and group</div>
        <div className="dms-control-grid">
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "createdAt", label: "Created date" },
              { value: "value", label: "Revenue" },
              { value: "progress", label: "Progress" },
              { value: "name", label: "Case name" },
            ]}
          />
          <Select
            value={sortDir}
            onChange={setSortDir}
            options={[
              { value: "desc", label: "Descending" },
              { value: "asc", label: "Ascending" },
            ]}
          />
          <Select
            value={groupBy}
            onChange={setGroupBy}
            options={[
              { value: "none", label: "No grouping" },
              { value: "status", label: "Status" },
              { value: "customer", label: "Customer" },
              { value: "category", label: "Internal company" },
              { value: "owner", label: "Case manager" },
            ]}
          />
          <Select
            value={tableConfig.showSummary ? "summary" : "plain"}
            onChange={(value) => updateTable({ showSummary: value === "summary" })}
            options={[
              { value: "summary", label: "Show summary" },
              { value: "plain", label: "Hide summary" },
            ]}
          />
        </div>
      </div>

      <div>
        <div className="dms-section-title">Table actions</div>
        <Space wrap>
          <Checkbox checked={tableConfig.showSelection} onChange={(event) => updateTable({ showSelection: event.target.checked })}>
            Row selection
          </Checkbox>
          <Button
            onClick={() => {
              setVisibleFields(DEFAULT_CONFIG.visibleFields);
              setTableConfig(DEFAULT_CONFIG.tableConfig);
              setSortBy(DEFAULT_CONFIG.sortBy);
              setSortDir(DEFAULT_CONFIG.sortDir);
              setGroupBy(DEFAULT_CONFIG.groupBy);
            }}
          >
            Reset table
          </Button>
        </Space>
      </div>
    </div>
  );

  return (
    <Popover trigger="click" placement="bottomRight" content={content}>
      <Button className="dms-icon-button" aria-label="Table settings">
        <span className="dms-settings-icon"><span /></span>
      </Button>
    </Popover>
  );
}

function ConfigurationPanel({
  tab,
  setTab,
  visibleFields,
  setVisibleFields,
  filters,
  setFilters,
  sortBy,
  sortDir,
  groupBy,
  tableConfig,
  setTableConfig,
  chartA,
  setChartA,
  chartB,
  setChartB,
  activeWidgets,
  setActiveWidgets,
}) {
  const tabItems = [
    { key: "fields", label: "Fields" },
    { key: "table", label: "Table" },
    { key: "charts", label: "Charts" },
    { key: "filters", label: "Filters" },
    { key: "widget", label: "Widget" },
    { key: "view", label: "View" },
  ];

  const toggleField = (key) => {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const updateTable = (patch) => setTableConfig((prev) => ({ ...prev, ...patch }));

  return (
    <aside className="dms-card dms-config">
      <div className="dms-config-head">
        <div>
          <div className="dms-config-title">Configuration</div>
          <div className="dms-subtitle">Default admin view settings</div>
        </div>
        <Button type="text" onClick={() => setTab("view")}>View</Button>
      </div>
      <div className="dms-config-body">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          size="small"
          items={tabItems.map((item) => ({ ...item, children: null }))}
        />

        {tab === "fields" && (
          <div>
            <div className="dms-section-title">Field configuration</div>
            <div className="dms-config-list">
              {FieldDefs.map((field) => (
                <div className="dms-config-item" key={field.key}>
                  <span className="dms-drag">::</span>
                  <div>
                    <Text strong>{field.label}</Text>
                    <div className="dms-subtitle">{field.type}</div>
                  </div>
                  <span
                    className={`dms-switch ${visibleFields[field.key] ? "" : "dms-switch-off"}`}
                    onClick={() => toggleField(field.key)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "filters" && (
          <div>
            <div className="dms-section-title">Advanced filter builder</div>
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              <div className="dms-rule-row">
                <Select value="Search" options={[{ value: "Search" }]} />
                <Select value="contains" options={[{ value: "contains" }]} />
                <Input
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                />
                <Button type="text" onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}>Clear</Button>
              </div>
              <div className="dms-rule-row">
                <Select value="Status" options={[{ value: "Status" }]} />
                <Select value="equals" options={[{ value: "equals" }]} />
                <Select
                  value={filters.status}
                  onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                  options={[
                    { value: "all", label: "Any" },
                    { value: "Active", label: "Active" },
                    { value: "Pending", label: "Pending" },
                    { value: "Completed", label: "Completed" },
                    { value: "Archived", label: "Archived" },
                    { value: "Blocked", label: "Blocked" },
                  ]}
                />
                <Button type="text" onClick={() => setFilters((prev) => ({ ...prev, status: "all" }))}>Reset</Button>
              </div>
              <Button onClick={() => message.info("Condition added to the default admin view")}>Add condition</Button>
            </Space>
          </div>
        )}

        {tab === "table" && (
          <div>
            <div className="dms-section-title">Table behavior</div>
            <Space direction="vertical" style={{ width: "100%" }} size={10}>
              <Select
                value={tableConfig.density}
                onChange={(value) => updateTable({ density: value })}
                options={TableDensityOptions}
              />
              <Select
                value={tableConfig.pageSize}
                onChange={(value) => updateTable({ pageSize: value })}
                options={[8, 10, 20, 50].map((value) => ({ value, label: `${value} rows per page` }))}
              />
              <Checkbox checked={tableConfig.showSelection} onChange={(event) => updateTable({ showSelection: event.target.checked })}>
                Show row selection
              </Checkbox>
              <Checkbox checked={tableConfig.showSummary} onChange={(event) => updateTable({ showSummary: event.target.checked })}>
                Show summary row
              </Checkbox>
            </Space>
          </div>
        )}

        {tab === "charts" && (
          <div>
            <div className="dms-section-title">Comparison chart A</div>
            <ChartConfigControls config={chartA} onChange={setChartA} />
            <Divider />
            <div className="dms-section-title">Comparison chart B</div>
            <ChartConfigControls config={chartB} onChange={setChartB} />
          </div>
        )}

        {tab === "widget" && (
          <div>
            <div className="dms-section-title">Widget settings</div>
            <div className="dms-config-list">
              {[
                ["summary", "Summary cards", "Top metrics"],
                ["chart", "Comparison charts", "Configurable dimension and metric"],
                ["table", "Table widget", "Record list"],
              ].map(([key, title, subtitle]) => (
                <div className="dms-config-item" key={key}>
                  <span className="dms-drag">::</span>
                  <div>
                    <Text strong>{title}</Text>
                    <div className="dms-subtitle">{subtitle}</div>
                  </div>
                  <span
                    className={`dms-switch ${activeWidgets[key] ? "" : "dms-switch-off"}`}
                    onClick={() => setActiveWidgets((prev) => ({ ...prev, [key]: !prev[key] }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "view" && (
          <div>
            <div className="dms-section-title">Default view state</div>
            <div className="dms-config-list">
              <div className="dms-config-item">
                <span className="dms-drag">::</span>
                <div>
                  <Text strong>Default admin view</Text>
                  <div className="dms-subtitle">Single administrator-facing configuration</div>
                </div>
                <Tag color="blue">Current</Tag>
              </div>
              <div className="dms-config-item">
                <span className="dms-drag">::</span>
                <div>
                  <Text strong>Sort</Text>
                  <div className="dms-subtitle">{sortBy} / {sortDir}</div>
                </div>
                <Tag>{sortDir}</Tag>
              </div>
              <div className="dms-config-item">
                <span className="dms-drag">::</span>
                <div>
                  <Text strong>Group by</Text>
                  <div className="dms-subtitle">{groupBy === "none" ? "No grouping" : groupBy}</div>
                </div>
                <Tag>{groupBy}</Tag>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function DashboardManagementSystemBlock() {
  const saved = useMemo(() => loadSavedConfig(), []);
  const [mode, setMode] = useState(saved.mode);
  const [showConfig, setShowConfig] = useState(saved.showConfig);
  const [configTab, setConfigTab] = useState(saved.configTab);
  const [sortBy, setSortBy] = useState(saved.sortBy);
  const [sortDir, setSortDir] = useState(saved.sortDir);
  const [groupBy, setGroupBy] = useState(saved.groupBy);
  const [visibleFields, setVisibleFields] = useState(saved.visibleFields || DEFAULT_CONFIG.visibleFields);
  const [tableConfig, setTableConfig] = useState(saved.tableConfig || DEFAULT_CONFIG.tableConfig);
  const [chartA, setChartA] = useState(saved.chartA || DEFAULT_CONFIG.chartA);
  const [chartB, setChartB] = useState(saved.chartB || DEFAULT_CONFIG.chartB);
  const [activeWidgets, setActiveWidgets] = useState(saved.activeWidgets || DEFAULT_CONFIG.activeWidgets);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    owner: "all",
    category: "all",
    dateRange: "quarter",
  });

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projectServices, setProjectServices] = useState([]);
  const [contractServices, setContractServices] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [companies, setCompanies] = useState([]);

  const reload = useCallback(async () => {
    setLoading(true);
    const [projectRows, taskRows, projectServiceRows, contractServiceRows, lawyerRows, customerRows] =
      await Promise.all([
        fetchProjects(),
        fetchList("tasks:list", { fields: TASK_SAFE_FIELDS }),
        fetchList("projectServices:list", { fields: PROJECT_SERVICE_SAFE_FIELDS }),
        fetchList("contractServices:list", { fields: CONTRACT_SERVICE_SAFE_FIELDS }),
        fetchList("lawyers:list", { fields: LAWYER_SAFE_FIELDS }),
        fetchList("customers:list", { fields: CUSTOMER_SAFE_FIELDS }),
      ]);

    setProjects(projectRows);
    setTasks(taskRows);
    setProjectServices(projectServiceRows);
    setContractServices(contractServiceRows);
    setLawyers(lawyerRows);
    setCustomers(customerRows);
    setCompanies([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const lawyerMap = useMemo(() => {
    const map = {};
    lawyers.forEach((lawyer) => {
      map[String(lawyer.id)] = lawyer.lawyerName || `Owner #${lawyer.id}`;
    });
    return map;
  }, [lawyers]);

  const customerMap = useMemo(() => {
    const map = {};
    customers.forEach((customer) => {
      map[String(customer.id)] = customer.shortName || customer.customerName || `Customer #${customer.id}`;
    });
    return map;
  }, [customers]);

  const companyMap = useMemo(() => {
    const map = {};
    companies.forEach((company) => {
      map[String(company.id)] = company.shortName || company.name || company.companyName || `Category #${company.id}`;
    });
    return map;
  }, [companies]);

  const taskStatsByProject = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      const projectId = String(extractId(task.projectId) || "");
      if (!projectId) return;
      if (!map[projectId]) map[projectId] = { total: 0, done: 0 };
      map[projectId].total += 1;
      if (task.status === "done" || task.status === "cancelled") map[projectId].done += 1;
    });
    return map;
  }, [tasks]);

  const valueByProject = useMemo(() => {
    const projectServiceTotals = {};
    projectServices.forEach((service) => {
      if (isDeletedServiceRecord(service)) return;
      const projectId = String(extractId(service.projectId) || "");
      if (!projectId) return;
      projectServiceTotals[projectId] = (projectServiceTotals[projectId] || 0) + serviceRowTotal(service);
    });

    const contractServiceTotals = {};
    const contractServiceTotalsByProject = {};
    contractServices.forEach((service) => {
      if (isDeletedServiceRecord(service)) return;
      const projectId = String(extractId(service.projectId) || "");
      if (projectId) {
        contractServiceTotalsByProject[projectId] = (contractServiceTotalsByProject[projectId] || 0) + serviceRowTotal(service);
      }
      const contractId = String(extractId(service.contractId) || "");
      if (!contractId) return;
      contractServiceTotals[contractId] = (contractServiceTotals[contractId] || 0) + serviceRowTotal(service);
    });

    const map = {};
    projects.forEach((project) => {
      const projectId = String(project.id);
      if (contractServiceTotalsByProject[projectId] > 0) {
        map[projectId] = contractServiceTotalsByProject[projectId];
        return;
      }
      const contractId = String(extractId(project.contractId) || "");
      if (contractId && contractServiceTotals[contractId] > 0) {
        map[projectId] = contractServiceTotals[contractId];
        return;
      }
      if (projectServiceTotals[projectId] > 0) {
        map[projectId] = projectServiceTotals[projectId];
        return;
      }
      map[projectId] = 0;
    });
    return map;
  }, [projects, projectServices, contractServices]);

  const records = useMemo(() => {
    return projects.map((project) => {
      const projectId = String(project.id);
      const taskStats = taskStatsByProject[projectId] || { total: 0, done: 0 };
      const managerId = extractId(project.projectManagerId);
      const assigneeIds = Array.isArray(project.assignees)
        ? project.assignees.map(extractId).filter(Boolean)
        : [];
      const owner =
        assigneeIds.map((id) => lawyerMap[String(id)]).filter(Boolean).join(", ") ||
        lawyerMap[String(managerId)] ||
        "Unassigned";
      const status = normalizeStatus(project.status);
      const customer = customerMap[String(extractId(project.customerId))] || "No customer";
      const internalCompanyId = extractId(project.internalCompanyId);
      const category =
        companyMap[String(internalCompanyId)] ||
        (internalCompanyId ? `Company #${internalCompanyId}` : "") ||
        "No internal company";
      const value = valueByProject[projectId] || 0;
      const progress = taskStats.total ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

      return {
        id: project.id,
        code: project.caseCode || `Record #${project.id}`,
        name: project.projectName || project.caseCode || `Record #${project.id}`,
        customer,
        status,
        owner,
        category,
        progress,
        value,
        valueLabel: fmtCompact(value),
        createdAt: projectBaseDate(project),
        createdAtLabel: fmtDate(projectBaseDate(project)),
        deadline: project.deadline,
        deadlineLabel: fmtDate(project.deadline),
        isOverdue:
          project.deadline &&
          status !== "Completed" &&
          status !== "Archived" &&
          new Date(project.deadline) < new Date(),
      };
    });
  }, [projects, taskStatsByProject, lawyerMap, companyMap, customerMap, valueByProject]);

  const ownerOptions = useMemo(() => {
    const values = Array.from(new Set(records.map((record) => record.owner).filter(Boolean))).sort();
    return [{ value: "all", label: "Owner: Any" }, ...values.map((value) => ({ value, label: value }))];
  }, [records]);

  const categoryOptions = useMemo(() => {
    const values = Array.from(new Set(records.map((record) => record.category).filter(Boolean))).sort();
    return [{ value: "all", label: "Category: Any" }, ...values.map((value) => ({ value, label: value }))];
  }, [records]);

  const filteredRecords = useMemo(() => {
    const now = new Date();
    const start =
      filters.dateRange === "month"
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : filters.dateRange === "quarter"
          ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          : null;

    const search = String(filters.search || "").trim().toLowerCase();
    return records
      .filter((record) => {
        if (search) {
          const haystack = `${record.name} ${record.code} ${record.status} ${record.owner} ${record.category}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        if (filters.status !== "all" && record.status !== filters.status) return false;
        if (filters.owner !== "all" && record.owner !== filters.owner) return false;
        if (filters.category !== "all" && record.category !== filters.category) return false;
        if (start) {
          const date = new Date(record.createdAt);
          if (Number.isNaN(date.getTime()) || date < start) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortBy === "name") return String(a.name).localeCompare(String(b.name), "vi") * dir;
        if (sortBy === "value") return ((a.value || 0) - (b.value || 0)) * dir;
        if (sortBy === "progress") return ((a.progress || 0) - (b.progress || 0)) * dir;
        return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
      });
  }, [records, filters, sortBy, sortDir]);

  const groupedRecords = useMemo(() => {
    if (groupBy === "none") return { "All records": filteredRecords };
    return filteredRecords.reduce((acc, record) => {
      const key = record[groupBy] || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(record);
      return acc;
    }, {});
  }, [filteredRecords, groupBy]);

  const metrics = useMemo(() => {
    const totalValue = filteredRecords.reduce((sum, record) => sum + (record.value || 0), 0);
    const active = filteredRecords.filter((record) => record.status === "Active").length;
    const pending = filteredRecords.filter((record) => record.status === "Pending").length;
    const completed = filteredRecords.filter((record) => record.status === "Completed").length;
    const overdue = filteredRecords.filter((record) => record.isOverdue).length;
    const avgProgress = filteredRecords.length
      ? filteredRecords.reduce((sum, record) => sum + Number(record.progress || 0), 0) / filteredRecords.length
      : 0;
    return {
      total: filteredRecords.length,
      active,
      pending,
      completed,
      overdue,
      totalValue,
      avgProgress,
      average: filteredRecords.length ? totalValue / filteredRecords.length : 0,
    };
  }, [filteredRecords]);

  const chartDataA = useMemo(() => buildChartData(filteredRecords, chartA), [filteredRecords, chartA]);
  const chartDataB = useMemo(() => buildChartData(filteredRecords, chartB), [filteredRecords, chartB]);

  const saveDefaultView = () => {
    const config = {
      mode,
      configTab,
      sortBy,
      sortDir,
      groupBy,
      visibleFields,
      tableConfig,
      chartA,
      chartB,
      activeWidgets,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    message.success("Default admin view saved");
  };

  const resetDefaultView = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setMode(DEFAULT_CONFIG.mode);
    setShowConfig(DEFAULT_CONFIG.showConfig);
    setConfigTab(DEFAULT_CONFIG.configTab);
    setSortBy(DEFAULT_CONFIG.sortBy);
    setSortDir(DEFAULT_CONFIG.sortDir);
    setGroupBy(DEFAULT_CONFIG.groupBy);
    setVisibleFields(DEFAULT_CONFIG.visibleFields);
    setTableConfig(DEFAULT_CONFIG.tableConfig);
    setChartA(DEFAULT_CONFIG.chartA);
    setChartB(DEFAULT_CONFIG.chartB);
    setActiveWidgets(DEFAULT_CONFIG.activeWidgets);
    message.success("Default view reset");
  };

  const cycleSort = () => {
    const sequence = [
      ["createdAt", "desc"],
      ["value", "desc"],
      ["progress", "desc"],
      ["name", "asc"],
    ];
    const currentIndex = sequence.findIndex(([field, dir]) => field === sortBy && dir === sortDir);
    const next = sequence[(currentIndex + 1) % sequence.length];
    setSortBy(next[0]);
    setSortDir(next[1]);
    setConfigTab("view");
  };

  const cycleGroup = () => {
    const sequence = ["none", "status", "owner", "category"];
    const next = sequence[(sequence.indexOf(groupBy) + 1) % sequence.length];
    setGroupBy(next);
    setConfigTab("view");
  };

  const clearFilters = () => {
    setFilters({ search: "", status: "all", owner: "all", category: "all", dateRange: "all" });
  };

  const openConfig = (tab) => {
    setShowConfig(true);
    setConfigTab(tab);
  };

  const handleModeChange = (value) => {
    setMode(value);
    if (value === "charts") openConfig("charts");
    if (value === "table") openConfig("table");
  };

  const openRecordDetail = (record) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  };

  const copyRecordCode = async () => {
    if (!selectedRecord?.code) return;
    try {
      await navigator.clipboard.writeText(selectedRecord.code);
      message.success("Record code copied");
    } catch {
      message.warning("Cannot copy record code in this browser context");
    }
  };

  const content = useMemo(() => {
    const table = (
      <DataTable
        records={filteredRecords}
        visibleFields={visibleFields}
        tableConfig={tableConfig}
        onRowAction={openRecordDetail}
      />
    );

    if (mode === "table") {
      return (
        <WidgetFrame
          title="Table view"
          subtitle={`Sorted by ${sortBy} (${sortDir}), grouped by ${groupBy}`}
          actions={(
            <TableSettingsPopover
              visibleFields={visibleFields}
              setVisibleFields={setVisibleFields}
              tableConfig={tableConfig}
              setTableConfig={setTableConfig}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortDir={sortDir}
              setSortDir={setSortDir}
              groupBy={groupBy}
              setGroupBy={setGroupBy}
            />
          )}
          span={12}
        >
          <div className="dms-table-actions">
            <div>
              <Text strong>{fmtNumber(filteredRecords.length)} customer matters</Text>
              <div className="dms-subtitle">Customer cases, task progress and contract revenue in one configurable table.</div>
            </div>
            <Space wrap>
              <Tag color="blue">{optionLabel(TableDensityOptions, tableConfig.density)}</Tag>
              <Tag>{tableConfig.pageSize} rows/page</Tag>
            </Space>
          </div>
          {groupBy === "none" ? table : (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              {Object.entries(groupedRecords).map(([group, rows]) => (
                <Card key={group} size="small" title={`${group} (${rows.length})`}>
                  <DataTable
                    records={rows}
                    visibleFields={visibleFields}
                    tableConfig={tableConfig}
                    compact
                    onRowAction={openRecordDetail}
                  />
                </Card>
              ))}
            </Space>
          )}
        </WidgetFrame>
      );
    }

    if (mode === "charts") {
      return (
        <div className="dms-chart-layout">
          <ChartPanel title="Comparison chart A" config={chartA} data={chartDataA} onChange={setChartA} />
          <ChartPanel title="Comparison chart B" config={chartB} data={chartDataB} onChange={setChartB} />
        </div>
      );
    }

    return (
      <div className="dms-widget-grid">
        {activeWidgets.chart && (
          <>
            <ChartPanel title="Customer matter progress" config={chartA} data={chartDataA} onChange={setChartA} configurable={false} />
            <ChartPanel title="Revenue source comparison" config={chartB} data={chartDataB} onChange={setChartB} configurable={false} />
          </>
        )}
        {activeWidgets.table && (
          <WidgetFrame
            title="Table preview"
            subtitle="Configurable fields, sorting and grouping"
            actions={<><Button onClick={() => handleModeChange("table")}>Open table</Button><Button onClick={() => openConfig("fields")}>Manage fields</Button></>}
            span={12}
          >
            <DataTable
              records={filteredRecords.slice(0, 6)}
              visibleFields={visibleFields}
              tableConfig={tableConfig}
              compact
              onRowAction={openRecordDetail}
            />
          </WidgetFrame>
        )}
      </div>
    );
  }, [
    mode,
    filteredRecords,
    visibleFields,
    sortBy,
    sortDir,
    groupBy,
    groupedRecords,
    tableConfig,
    chartA,
    chartB,
    chartDataA,
    chartDataB,
    activeWidgets,
  ]);

  return (
    <div className="dms-root">
      <style>{styles}</style>
      <div className="dms-shell">
        <section className="dms-card dms-header">
          <div className="dms-header-row">
            <div>
              <div className="dms-breadcrumb">Dashboards / Default Admin View</div>
              <div className="dms-title-line">
                <Title level={4}>Dashboard Management System</Title>
                <Tag color="blue">Default view</Tag>
              </div>
              <div className="dms-header-subtitle">
                Administrator-facing dashboard configured from core collections.
              </div>
            </div>
            <Space wrap>
              <Button onClick={resetDefaultView}>Reset</Button>
              <Button onClick={() => setShowConfig((value) => !value)}>{showConfig ? "Hide config" : "Show config"}</Button>
              <Button onClick={reload} loading={loading}>Refresh data</Button>
              <Button type="primary" onClick={saveDefaultView}>Save default view</Button>
            </Space>
          </div>
        </section>

        <section className="dms-card dms-toolbar">
          <div className="dms-toolbar-row">
            <Segmented value={mode} onChange={handleModeChange} options={ModeOptions} />
            <Space wrap>
              <Button onClick={() => openConfig("filters")}>Filter</Button>
              <Button onClick={cycleSort}>Sort: {sortBy}/{sortDir}</Button>
              <Button onClick={cycleGroup}>Group: {groupBy}</Button>
              <Button onClick={() => openConfig("fields")}>Fields</Button>
              <Button onClick={() => { handleModeChange("table"); openConfig("table"); }}>Table settings</Button>
              <Button onClick={() => { handleModeChange("charts"); openConfig("charts"); }}>Chart builder</Button>
              <Button onClick={reload} loading={loading}>Refresh</Button>
            </Space>
          </div>
          <div className="dms-filter-grid">
            <Input
              placeholder="Search records..."
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
            <Select
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              options={[
                { value: "all", label: "Status: Any" },
                { value: "Active", label: "Active" },
                { value: "Pending", label: "Pending" },
                { value: "Completed", label: "Completed" },
                { value: "Archived", label: "Archived" },
                { value: "Blocked", label: "Blocked" },
              ]}
            />
            <Select
              showSearch
              value={filters.owner}
              onChange={(value) => setFilters((prev) => ({ ...prev, owner: value }))}
              options={ownerOptions}
            />
            <Select
              showSearch
              value={filters.category}
              onChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
              options={categoryOptions}
            />
            <Select
              value={filters.dateRange}
              onChange={(value) => setFilters((prev) => ({ ...prev, dateRange: value }))}
              options={[
                { value: "quarter", label: "Date: This quarter" },
                { value: "month", label: "This month" },
                { value: "all", label: "All dates" },
              ]}
            />
          </div>
          <div className="dms-chip-row">
            {filters.status !== "all" && <span className="dms-chip dms-chip-active">Status: {filters.status}</span>}
            {filters.owner !== "all" && <span className="dms-chip">Owner: {filters.owner}</span>}
            {filters.category !== "all" && <span className="dms-chip">Category: {filters.category}</span>}
            {filters.dateRange !== "all" && <span className="dms-chip">Date: {filters.dateRange}</span>}
            {filters.search && <span className="dms-chip">Search: {filters.search}</span>}
            <Button type="link" size="small" onClick={clearFilters}>Clear filters</Button>
          </div>
        </section>

        {loading ? (
          <div className="dms-card" style={{ padding: 80, textAlign: "center" }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {activeWidgets.summary && (
              <section className="dms-summary-grid">
                <MetricCard label="Customer matters" value={fmtNumber(metrics.total)} trend={`${fmtNumber(records.length)} loaded`} note="after current filters" />
                <MetricCard label="Work progress" value={`${Math.round(metrics.avgProgress)}%`} trend={`${fmtNumber(metrics.completed)} completed`} note="from task status" />
                <MetricCard label="Needs attention" value={fmtNumber(metrics.pending)} note={`${metrics.overdue} overdue`} status={{ color: metrics.overdue ? "warning" : "success", label: metrics.overdue ? "Review" : "On track" }} />
                <MetricCard label="Contract revenue" value={fmtCompact(metrics.totalValue)} trend="Live" note="from case/contract services" />
              </section>
            )}

            <section className={`dms-workspace ${showConfig ? "" : "dms-workspace-full"}`}>
              <div className="dms-canvas">{content}</div>
              {showConfig && (
                <ConfigurationPanel
                  tab={configTab}
                  setTab={setConfigTab}
                  visibleFields={visibleFields}
                  setVisibleFields={setVisibleFields}
                  filters={filters}
                  setFilters={setFilters}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  groupBy={groupBy}
                  tableConfig={tableConfig}
                  setTableConfig={setTableConfig}
                  chartA={chartA}
                  setChartA={setChartA}
                  chartB={chartB}
                  setChartB={setChartB}
                  activeWidgets={activeWidgets}
                  setActiveWidgets={setActiveWidgets}
                />
              )}
            </section>
          </>
        )}
      </div>
      <Drawer
        title={selectedRecord?.name || "Record detail"}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={520}
        extra={(
          <Space>
            <Button onClick={copyRecordCode} disabled={!selectedRecord?.code}>Copy code</Button>
            <Button
              type="primary"
              onClick={() => {
                setMode("table");
                setDetailOpen(false);
              }}
            >
              Open table
            </Button>
          </Space>
        )}
      >
        {selectedRecord ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Record code">{selectedRecord.code || "-"}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColor[selectedRecord.status] || "default"}>{selectedRecord.status || "-"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Owner">{selectedRecord.owner || "-"}</Descriptions.Item>
              <Descriptions.Item label="Category">{selectedRecord.category || "-"}</Descriptions.Item>
              <Descriptions.Item label="Progress">
                <Progress percent={selectedRecord.progress || 0} size="small" />
              </Descriptions.Item>
              <Descriptions.Item label="Value">{fmtNumber(selectedRecord.value)} VND</Descriptions.Item>
              <Descriptions.Item label="Created date">{selectedRecord.createdAtLabel || "-"}</Descriptions.Item>
              <Descriptions.Item label="Deadline">{fmtDate(selectedRecord.deadline)}</Descriptions.Item>
            </Descriptions>
            <Text type="secondary">
              This quick view is powered by the same filtered core data as the dashboard.
            </Text>
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No record selected" />
        )}
      </Drawer>
    </div>
  );
}

ctx.render(<DashboardManagementSystemBlock />);
