// ============================================================
// CASE DASHBOARD - NocoBase JS Block
// Phase 1: configurable dashboard views for non-dev users.
// Data sources: projects, tasks, projectServices, contractServices,
// lawyers, customers, internalCompany.
// ============================================================
// ---- ui language (pure; tested by scripts/tests/i18n-blocks.test.js) ----
// Labels follow the language NocoBase's UI runs in (ctx.i18n.language: the
// user's appLang, else the system default; changing it reloads the page):
// Vietnamese for "vi-*", English otherwise. The English text is the key, so a
// label missing from VI shows in English; {name} placeholders are filled from
// vars. Stored data is not translated. Tool: scripts/i18n/ui-strings.js.
const pickLang = (locale) => (/^vi\b/i.test(String(locale || "").trim()) ? "vi" : "en");
const makeTr = (lang, dict) => (text, vars) => {
  const template = (lang === "vi" && dict[text]) || text;
  return vars
    ? template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
    : template;
};
const VI = {
  "To do": "Chưa thực hiện",
  "In progress": "Đang xử lý",
  "Done": "Hoàn thành",
  "Cancelled": "Đã hủy",
  "Cao": "High",
  "Medium": "Trung bình",
  "Low": "Thấp",
  "Last 7 days": "7 ngày qua",
  "Last 30 days": "30 ngày qua",
  "This quarter": "Quý này",
  "This year": "Năm nay",
  "All": "Tất cả",
  "Custom": "Tùy chọn",
  "Time": "Thời gian",
  "Internal company": "Công ty nội bộ",
  "Customer": "Khách hàng",
  "Lawyer in charge": "Luật sư phụ trách",
  "Status": "Trạng thái",
  "Priority": "Ưu tiên",
  "Overview": "Tổng quan",
  "Table": "Bảng",
  "Charts": "Biểu đồ",
  "KPI": "KPI",
  "Kanban": "Kanban",
  "Calendar": "Lịch",
  "Total cases": "Tổng hồ sơ",
  "Past deadline": "Quá hạn deadline",
  "Completed in period": "Hoàn thành trong kỳ",
  "Total case value": "Tổng giá trị hồ sơ",
  "Status distribution": "Phân bố trạng thái",
  "New vs completed cases": "Hồ sơ mới vs hoàn thành",
  "Workload by lawyer": "Workload theo luật sư",
  "Value by month": "Giá trị theo tháng",
  "Service type mix": "Cơ cấu loại dịch vụ",
  "By priority": "Theo mức ưu tiên",
  "Upcoming deadlines": "Deadline sắp tới",
  "List": "Danh sách",
  "Case list table": "Bảng danh sách hồ sơ",
  "Case code": "Mã hồ sơ",
  "Matter name": "Tên vụ việc",
  "Assignees": "Phụ trách",
  "Task progress": "Tiến độ task",
  "Deadline": "Hạn",
  "Value": "Giá trị",
  "Created at": "Ngày tạo",
  "Default view for case management, status and value.": "View mặc định cho quản lý hồ sơ, trạng thái và giá trị.",
  "Operations": "Vận hành",
  "Track deadlines, workload and progress.": "Theo dõi deadline, workload và tiến độ xử lý.",
  "Finance": "Tài chính",
  "Focus on case value and service mix.": "Tập trung vào giá trị hồ sơ và cơ cấu dịch vụ.",
  "Track cases by customer.": "View theo dõi hồ sơ theo khách hàng.",
  "Could not load the chart library": "Không tải được thư viện biểu đồ",
  "No change from the previous period": "Không đổi so với kỳ trước",
  "Up": "Tăng",
  "Down": "Giảm",
  "vs the previous period": "so với kỳ trước",
  "Custom view": "View tùy chỉnh",
  "New custom view created": "Đã tạo view tùy chỉnh mới",
  "View settings saved": "Đã lưu cấu hình view",
  "View duplicated": "Đã nhân bản view",
  "Default settings restored": "Đã khôi phục cấu hình mặc định",
  "Custom view deleted": "Đã xóa view tùy chỉnh",
  "Cty #{0}": "Company #{0}",
  "New cases": "Hồ sơ mới",
  "Overdue": "Quá hạn",
  "Value (million ₫)": "Giá trị (triệu ₫)",
  "Other": "Khác",
  "Unassigned": "Chưa phân công",
  "No tasks yet": "Chưa có task",
  "Period: {0}": "Thời gian: {0}",
  "Company: {0}": "Công ty: {0}",
  "Customer: {0}": "Khách hàng: {0}",
  "Lawyer: {0}": "Luật sư: {0}",
  "Status: {0}": "Trạng thái: {0}",
  "Priority: {0}": "Ưu tiên: {0}",
  "Case status distribution": "Phân bố trạng thái hồ sơ",
  "New vs completed cases (12 months)": "Hồ sơ mới vs hoàn thành (12 tháng)",
  "No assignment data yet": "Chưa có dữ liệu phân công",
  "Case value by month": "Giá trị hồ sơ theo tháng",
  "Mix by service type": "Cơ cấu theo loại dịch vụ",
  "No services yet": "Chưa có dịch vụ",
  "Open cases by priority": "Hồ sơ đang mở theo ưu tiên",
  "No upcoming deadlines": "Không có deadline sắp tới",
  "{0} days late": "Trễ {0} ngày",
  "{0} days left": "Còn {0} ngày",
  "Case list": "Danh sách hồ sơ",
  "cases": "hồ sơ",
  "No content for this view yet": "Chưa có nội dung cho view này",
  "Table View": "Dạng bảng",
  "Configure fields": "Cấu hình trường",
  "No chart widget enabled": "Chưa bật chart widget nào",
  "No KPI widget enabled": "Chưa bật KPI widget nào",
  "No records": "Không có record",
  "Untitled": "Chưa đặt tên",
  "Calendar View": "Dạng lịch",
  "Month": "Tháng",
  "Week": "Tuần",
  "Day": "Ngày",
  "No dates match the current filters": "Không có mốc thời gian phù hợp với filter hiện tại",
  "No widget enabled for this view": "Chưa bật widget nào cho view này",
  "Dashboard / Case Management": "Dashboard / Quản lý hồ sơ",
  "Case Dashboard": "Dashboard hồ sơ",
  "Unsaved changes": "Thay đổi chưa lưu",
  "Switch view modes, refine filters, and save workspace presets.": "Đổi chế độ xem, tinh chỉnh bộ lọc và lưu cấu hình làm việc.",
  "Refresh": "Làm mới",
  "Configure": "Cấu hình",
  "Save view": "Lưu view",
  "Fields & filters": "Trường & bộ lọc",
  "to": "đến",
  "KH #{0}": "Customer #{0}",
  "Clear all": "Xóa tất cả",
  "Configure view": "Cấu hình view",
  "Duplicate": "Nhân bản",
  "Delete view": "Xóa view",
  "Default": "Mặc định",
  "Save": "Lưu",
  "View name": "Tên view",
  "A default view is saved as a custom copy when you click Save view.": "View mặc định sẽ được lưu thành một bản custom khi bấm Lưu view.",
  "Default mode": "Chế độ mặc định",
  "Widgets": "Widget",
  "1/3 row": "1/3 dòng",
  "1/2 row": "1/2 dòng",
  "2/3 row": "2/3 dòng",
  "Full row": "Full dòng",
  "Filters": "Bộ lọc",
  "Table columns": "Cột bảng",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React, antd } = ctx;
const { useState, useEffect, useMemo, useRef, useCallback } = React;
const {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Input,
  Button,
  Drawer,
  Switch,
  Empty,
  Spin,
  Space,
  Typography,
  Divider,
  message,
  Tabs,
  Checkbox,
  Table,
  Tag,
  Segmented,
  Progress,
} = antd;
const { Text, Title } = Typography;

const UI = {
  page: "#f6f7f9",
  surface: "#ffffff",
  border: "#e5e7eb",
  softBorder: "#eef0f3",
  text: "#1f2937",
  muted: "#6b7280",
  quiet: "#9ca3af",
  primary: "#1677ff",
  radius: 8,
  shadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

// ============================================================
// CONFIG
// ============================================================
const STATUS_CFG = {
  toDo: { label: tr("To do"), color: "default", chart: "#d9d9d9" },
  inProgress: { label: tr("In progress"), color: "processing", chart: "#1677ff" },
  done: { label: tr("Done"), color: "success", chart: "#52c41a" },
  cancelled: { label: tr("Cancelled"), color: "default", chart: "#bfbfbf" },
};
const STATUS_KEYS = ["toDo", "inProgress", "done", "cancelled"];

const PRIORITY_CFG = {
  high: { label: tr("Cao"), color: "red", chart: "#ff4d4f" },
  medium: { label: tr("Medium"), color: "gold", chart: "#faad14" },
  low: { label: tr("Low"), color: "green", chart: "#52c41a" },
};

const CHART_PALETTE = [
  "#1677ff",
  "#13c2c2",
  "#722ed1",
  "#faad14",
  "#52c41a",
  "#eb2f96",
  "#a0d911",
  "#bfbfbf",
];

const RANGE_OPTIONS = [
  { label: tr("Last 7 days"), value: "7d" },
  { label: tr("Last 30 days"), value: "30d" },
  { label: tr("This quarter"), value: "quarter" },
  { label: tr("This year"), value: "year" },
  { label: tr("All"), value: "all" },
  { label: tr("Custom"), value: "custom" },
];

const FILTER_DEFS = [
  { key: "range", label: tr("Time") },
  { key: "company", label: tr("Internal company") },
  { key: "customer", label: tr("Customer") },
  { key: "lawyer", label: tr("Lawyer in charge") },
  { key: "status", label: tr("Status") },
  { key: "priority", label: tr("Priority") },
];

const VIEW_MODE_OPTIONS = [
  { label: tr("Overview"), value: "dashboard" },
  { label: tr("Table"), value: "table" },
  { label: tr("Charts"), value: "chart" },
  { label: tr("KPI"), value: "kpi" },
  { label: tr("Kanban"), value: "kanban" },
  { label: tr("Calendar"), value: "calendar" },
];

const WIDGET_DEFS = [
  { key: "kpi_total", label: tr("Total cases"), group: "KPI", span: 4 },
  { key: "kpi_active", label: tr("In progress"), group: "KPI", span: 4 },
  { key: "kpi_overdue", label: tr("Past deadline"), group: "KPI", span: 4 },
  { key: "kpi_done", label: tr("Completed in period"), group: "KPI", span: 4 },
  { key: "kpi_value", label: tr("Total case value"), group: "KPI", span: 4 },
  { key: "chart_status", label: tr("Status distribution"), group: tr("Charts"), span: 4 },
  { key: "chart_monthly", label: tr("New vs completed cases"), group: tr("Charts"), span: 8 },
  { key: "chart_lawyer", label: tr("Workload by lawyer"), group: tr("Charts"), span: 6 },
  { key: "chart_revenue", label: tr("Value by month"), group: tr("Charts"), span: 6 },
  { key: "chart_service", label: tr("Service type mix"), group: tr("Charts"), span: 4 },
  { key: "chart_priority", label: tr("By priority"), group: tr("Charts"), span: 4 },
  { key: "widget_deadline", label: tr("Upcoming deadlines"), group: tr("List"), span: 4 },
  { key: "widget_table", label: tr("Case list table"), group: tr("Table"), span: 12 },
];

const WIDGET_MAP = WIDGET_DEFS.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

const COLUMN_DEFS = [
  { key: "caseCode", label: tr("Case code") },
  { key: "projectName", label: tr("Matter name") },
  { key: "customer", label: tr("Customer") },
  { key: "status", label: tr("Status") },
  { key: "priority", label: tr("Priority") },
  { key: "assignees", label: tr("Assignees") },
  { key: "taskProgress", label: tr("Task progress") },
  { key: "deadline", label: tr("Deadline") },
  { key: "value", label: tr("Value") },
  { key: "internalCompany", label: tr("Internal company") },
  { key: "createdAt", label: tr("Created at") },
];

const DEFAULT_COLUMNS = [
  "caseCode",
  "projectName",
  "customer",
  "status",
  "priority",
  "assignees",
  "taskProgress",
  "deadline",
  "value",
];

const DEFAULT_FILTERS = {
  range: "quarter",
  customFrom: "",
  customTo: "",
  companyId: null,
  customerId: null,
  lawyerId: null,
  status: null,
  priority: null,
};

const DEFAULT_VISIBLE_FILTERS = FILTER_DEFS.reduce(
  (acc, item) => ({ ...acc, [item.key]: true }),
  {},
);

const VIEW_STORAGE_KEY = "law_case_dashboard_views_v3";
const ACTIVE_VIEW_STORAGE_KEY = "law_case_dashboard_active_view_v3";

const widgetDefaults = (visibleKeys) =>
  WIDGET_DEFS.reduce((acc, item) => {
    acc[item.key] = !visibleKeys || visibleKeys.includes(item.key);
    return acc;
  }, {});

const spanDefaults = (overrides = {}) =>
  WIDGET_DEFS.reduce((acc, item) => {
    acc[item.key] = overrides[item.key] || item.span;
    return acc;
  }, {});

const normalizeOrder = (order = []) => {
  const seen = new Set();
  const next = [];
  [...order, ...WIDGET_DEFS.map((w) => w.key)].forEach((key) => {
    if (WIDGET_MAP[key] && !seen.has(key)) {
      seen.add(key);
      next.push(key);
    }
  });
  return next;
};

const normalizeColumns = (cols = DEFAULT_COLUMNS) => {
  const valid = new Set(COLUMN_DEFS.map((c) => c.key));
  const next = cols.filter((key) => valid.has(key));
  return next.length ? next : DEFAULT_COLUMNS;
};

const makeView = ({
  id,
  name,
  description,
  system = false,
  viewMode = "dashboard",
  visibleWidgets,
  order,
  spans,
  columns,
  filters,
  visibleFilters,
}) => ({
  id,
  name,
  description: description || "",
  system,
  viewMode,
  widgets: widgetDefaults(visibleWidgets),
  layout: {
    order: normalizeOrder(order || visibleWidgets || WIDGET_DEFS.map((w) => w.key)),
    spans: spanDefaults(spans),
  },
  columns: normalizeColumns(columns),
  filters: { ...DEFAULT_FILTERS, ...(filters || {}) },
  visibleFilters: { ...DEFAULT_VISIBLE_FILTERS, ...(visibleFilters || {}) },
});

const BUILT_IN_VIEWS = [
  makeView({
    id: "overview",
    name: tr("Overview"),
    description: tr("Default view for case management, status and value."),
    system: true,
    visibleWidgets: [
      "kpi_total",
      "kpi_active",
      "kpi_overdue",
      "kpi_done",
      "kpi_value",
      "chart_status",
      "chart_monthly",
      "chart_lawyer",
      "chart_revenue",
      "widget_deadline",
      "widget_table",
    ],
  }),
  makeView({
    id: "operations",
    name: tr("Operations"),
    description: tr("Track deadlines, workload and progress."),
    system: true,
    viewMode: "kanban",
    visibleWidgets: [
      "kpi_active",
      "kpi_overdue",
      "chart_lawyer",
      "chart_priority",
      "widget_deadline",
      "widget_table",
    ],
    order: [
      "kpi_active",
      "kpi_overdue",
      "chart_lawyer",
      "chart_priority",
      "widget_deadline",
      "widget_table",
    ],
    columns: [
      "caseCode",
      "projectName",
      "status",
      "priority",
      "assignees",
      "taskProgress",
      "deadline",
    ],
    filters: { range: "all" },
  }),
  makeView({
    id: "finance",
    name: tr("Finance"),
    description: tr("Focus on case value and service mix."),
    system: true,
    viewMode: "chart",
    visibleWidgets: [
      "kpi_total",
      "kpi_value",
      "chart_revenue",
      "chart_service",
      "widget_table",
    ],
    order: ["kpi_total", "kpi_value", "chart_revenue", "chart_service", "widget_table"],
    columns: [
      "caseCode",
      "projectName",
      "customer",
      "value",
      "internalCompany",
      "createdAt",
    ],
    visibleFilters: { lawyer: false, priority: false },
  }),
  makeView({
    id: "client",
    name: tr("Customer"),
    description: tr("Track cases by customer."),
    system: true,
    viewMode: "table",
    visibleWidgets: [
      "kpi_total",
      "kpi_active",
      "kpi_done",
      "chart_status",
      "widget_deadline",
      "widget_table",
    ],
    order: [
      "kpi_total",
      "kpi_active",
      "kpi_done",
      "chart_status",
      "widget_deadline",
      "widget_table",
    ],
    columns: [
      "caseCode",
      "projectName",
      "customer",
      "status",
      "deadline",
      "assignees",
    ],
    visibleFilters: { company: false, priority: false },
  }),
];

const normalizeView = (view) => {
  const fallback = BUILT_IN_VIEWS[0];
  const widgets = widgetDefaults();
  Object.keys(widgets).forEach((key) => {
    widgets[key] = view?.widgets?.[key] !== undefined ? !!view.widgets[key] : widgets[key];
  });
  return {
    ...fallback,
    ...(view || {}),
    viewMode: view?.viewMode || fallback.viewMode || "dashboard",
    widgets,
    layout: {
      order: normalizeOrder(view?.layout?.order || view?.order),
      spans: spanDefaults(view?.layout?.spans || view?.spans || {}),
    },
    columns: normalizeColumns(view?.columns),
    filters: { ...DEFAULT_FILTERS, ...(view?.filters || {}) },
    visibleFilters: { ...DEFAULT_VISIBLE_FILTERS, ...(view?.visibleFilters || {}) },
  };
};

const defaultViews = () => BUILT_IN_VIEWS.map(normalizeView);

const loadViews = () => {
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (!raw) return defaultViews();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultViews();
    const custom = parsed.filter((v) => v && !BUILT_IN_VIEWS.some((b) => b.id === v.id));
    const builtIns = BUILT_IN_VIEWS.map((base) =>
      normalizeView({
        ...base,
        ...(parsed.find((v) => v.id === base.id) || {}),
        system: true,
      }),
    );
    return [...builtIns, ...custom.map(normalizeView)];
  } catch {
    return defaultViews();
  }
};

const saveViews = (views) => {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(views));
  } catch {}
};

const saveActiveViewId = (id) => {
  try {
    window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, id);
  } catch {}
};

// ============================================================
// UTILS — dùng chung qua shared-lib/law-shared.js (ctx.importAsync),
// xem shared-lib/README.md. Chỉ giữ lại local những helper đặc thù
// của CaseDashboard (isOverdue, projectBaseDate) không dùng ở block khác.
// ============================================================
const SHARED_LIB_URL = "https://law.dev.samset.net/storage/uploads/law-shared-qqsf4i.js"; // TODO: thay bằng URL sau khi upload lên Nocobase file-manager
const Shared = await ctx.importAsync(SHARED_LIB_URL);
const {
  extractId,
  fmtCompactVND,
  fmtDate,
  parseNum,
  isPackagePricing,
  isDeletedServiceRecord,
  serviceRowTotal,
  parseDateInput,
  rangeToDates,
  prevRangeDates,
  monthKey,
  last12Months,
  clampSpan,
  colProps,
  moveInArray,
} = Shared;

const isOverdue = (p) =>
  p.deadline &&
  p.status !== "done" &&
  p.status !== "cancelled" &&
  new Date(p.deadline) < new Date();

const projectBaseDate = (p) => p.date || p.createdAt;

// ============================================================
// API
// ============================================================
async function fetchList(url, params = {}) {
  try {
    const res = await ctx.api.request({
      url,
      params: { pageSize: 2000, page: 1, ...params },
    });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}

const PROJECT_FIELDS =
  "id,caseCode,projectName,status,priority,date,deadline,createdAt,updatedAt," +
  "customerId,internalCompanyId,projectManagerId,contractId,pricingMode,packageTotalAmount";

const PROJECT_SERVICE_FIELDS =
  "id,projectId,serviceName,pricingMode,basePrice,subTotal,vatAmount,totalAmount,status,lineStatus";

const CONTRACT_SERVICE_FIELDS =
  "id,contractId,pricingMode,basePrice,subTotal,vatAmount,totalAmount,status,lineStatus";

async function fetchProjects() {
  const withAppends = await fetchList("projects:list", {
    fields: PROJECT_FIELDS,
    appends: ["assignees"],
    sort: ["-createdAt"],
  });
  if (withAppends.length > 0) return withAppends;
  return fetchList("projects:list", {
    fields: PROJECT_FIELDS,
    sort: ["-createdAt"],
  });
}

// ============================================================
// CHART.JS
// ============================================================
let _chartLoadPromise = null;
const loadChartJs = () => {
  if (_chartLoadPromise) return _chartLoadPromise;
  _chartLoadPromise = ctx
    .requireAsync("https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js")
    .then((lib) => {
      const C = typeof lib === "function" ? lib : lib?.Chart || lib?.default || lib;
      if (!C) throw new Error("Chart.js constructor not found");
      try {
        C.defaults.font.size = 12;
        C.defaults.color = "rgba(0,0,0,0.45)";
      } catch {}
      return C;
    });
  return _chartLoadPromise;
};
loadChartJs().catch(() => {});

const ChartCanvas = ({ type, data, options, height = 240 }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let destroyed = false;
    loadChartJs()
      .then((ChartJS) => {
        if (destroyed || !canvasRef.current) return;
        if (chartRef.current) {
          chartRef.current.data = data;
          chartRef.current.options = options || {};
          chartRef.current.update();
          return;
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
      })
      .catch(() => setError(true));
    return () => {
      destroyed = true;
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

  if (error)
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={tr("Could not load the chart library")}
      />
    );

  return (
    <div style={{ position: "relative", height, width: "100%" }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

const TrendText = ({ current, previous }) => {
  if (previous === null || previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0)
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {tr("No change from the previous period")}
      </Text>
    );
  const pct =
    previous > 0
      ? `${Math.abs(Math.round((diff / previous) * 100))}%`
      : Math.abs(diff);
  return (
    <Text type={diff > 0 ? "success" : "danger"} style={{ fontSize: 12 }}>
      {diff > 0 ? tr("Up") : tr("Down")} {pct} {tr("vs the previous period")}
    </Text>
  );
};

// ============================================================
// MAIN
// ============================================================
const CaseDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projectServices, setProjectServices] = useState([]);
  const [contractServices, setContractServices] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [companies, setCompanies] = useState([]);

  const initialViews = useMemo(() => loadViews(), []);
  const [views, setViews] = useState(initialViews);
  const [activeViewId, setActiveViewId] = useState(() => {
    try {
      const stored = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
      if (stored && initialViews.some((v) => v.id === stored)) return stored;
    } catch {}
    return initialViews[0]?.id || "overview";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewNameDraft, setViewNameDraft] = useState("");

  const activeView = useMemo(
    () => views.find((v) => v.id === activeViewId) || views[0] || BUILT_IN_VIEWS[0],
    [views, activeViewId],
  );

  const [filters, setFilters] = useState(activeView.filters);
  const [visibleFilters, setVisibleFilters] = useState(activeView.visibleFilters);
  const [widgets, setWidgets] = useState(activeView.widgets);
  const [layout, setLayout] = useState(activeView.layout);
  const [columns, setColumns] = useState(activeView.columns);
  const [viewMode, setViewMode] = useState(activeView.viewMode || "dashboard");
  const [calendarMode, setCalendarMode] = useState("list");

  useEffect(() => {
    const next = normalizeView(activeView);
    setFilters(next.filters);
    setVisibleFilters(next.visibleFilters);
    setWidgets(next.widgets);
    setLayout(next.layout);
    setColumns(next.columns);
    setViewMode(next.viewMode || "dashboard");
    setViewNameDraft(next.name);
  }, [activeViewId]);

  const reload = useCallback(async () => {
    setLoading(true);
    const [proj, taskRows, psRows, csRows, lawyerRows, custRows, compRows] =
      await Promise.all([
        fetchProjects(),
        fetchList("tasks:list", { fields: "id,status,projectId" }),
        fetchList("projectServices:list", { fields: PROJECT_SERVICE_FIELDS }),
        fetchList("contractServices:list", { fields: CONTRACT_SERVICE_FIELDS }),
        fetchList("lawyers:list", { fields: "id,lawyerName" }),
        fetchList("customers:list", { fields: "id,customerName,shortName" }),
        fetchList("internalCompany:list"),
      ]);
    setProjects(proj);
    setTasks(taskRows);
    setProjectServices(psRows);
    setContractServices(csRows);
    setLawyers(lawyerRows);
    setCustomers(custRows);
    setCompanies(compRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const persistViews = (nextViews, nextActiveId = activeViewId) => {
    const normalized = nextViews.map(normalizeView);
    setViews(normalized);
    saveViews(normalized);
    setActiveViewId(nextActiveId);
    saveActiveViewId(nextActiveId);
  };

  const snapshotView = (base = activeView) =>
    normalizeView({
      ...base,
      name: viewNameDraft.trim() || base.name,
      filters,
      visibleFilters,
      viewMode,
      widgets,
      layout: {
        order: normalizeOrder(layout.order),
        spans: spanDefaults(layout.spans),
      },
      columns: normalizeColumns(columns),
    });

  const saveCurrentView = () => {
    const current = snapshotView(activeView);
    if (activeView.system) {
      const id = `custom_${Date.now()}`;
      const customView = normalizeView({
        ...current,
        id,
        system: false,
        name: `${current.name} - Custom`,
        description: tr("Custom view"),
      });
      persistViews([...views, customView], id);
      message.success(tr("New custom view created"));
      return;
    }
    const nextViews = views.map((v) => (v.id === activeViewId ? current : v));
    persistViews(nextViews, activeViewId);
    message.success(tr("View settings saved"));
  };

  const duplicateView = () => {
    const id = `custom_${Date.now()}`;
    const customView = normalizeView({
      ...snapshotView(activeView),
      id,
      system: false,
      name: `${viewNameDraft || activeView.name} - Copy`,
      description: tr("Custom view"),
    });
    persistViews([...views, customView], id);
    message.success(tr("View duplicated"));
  };

  const resetCurrentView = () => {
    const base = BUILT_IN_VIEWS.find((v) => v.id === activeViewId) || BUILT_IN_VIEWS[0];
    const resetView = normalizeView(base);
    const nextViews = views.map((v) => (v.id === activeViewId ? resetView : v));
    setFilters(resetView.filters);
    setVisibleFilters(resetView.visibleFilters);
    setWidgets(resetView.widgets);
    setLayout(resetView.layout);
    setColumns(resetView.columns);
    setViewMode(resetView.viewMode || "dashboard");
    setViewNameDraft(resetView.name);
    persistViews(nextViews, resetView.id);
    message.success(tr("Default settings restored"));
  };

  const deleteCurrentView = () => {
    if (activeView.system) return;
    const nextViews = views.filter((v) => v.id !== activeViewId);
    persistViews(nextViews, "overview");
    message.success(tr("Custom view deleted"));
  };

  const selectView = (id) => {
    setActiveViewId(id);
    saveActiveViewId(id);
  };

  const setWidgetVisible = (key, checked) => {
    setWidgets((prev) => ({ ...prev, [key]: checked }));
  };

  const setWidgetSpan = (key, span) => {
    setLayout((prev) => ({
      ...prev,
      spans: { ...prev.spans, [key]: clampSpan(span) },
    }));
  };

  const moveWidget = (key, dir) => {
    setLayout((prev) => ({
      ...prev,
      order: moveInArray(normalizeOrder(prev.order), key, dir),
    }));
  };

  const lawyerMap = useMemo(() => {
    const m = {};
    lawyers.forEach((l) => {
      m[String(l.id)] = l.lawyerName || `LS #${l.id}`;
    });
    return m;
  }, [lawyers]);

  const customerMap = useMemo(() => {
    const m = {};
    customers.forEach((c) => {
      m[String(c.id)] = c.shortName || c.customerName || c.name || `KH #${c.id}`;
    });
    return m;
  }, [customers]);

  const companyMap = useMemo(() => {
    const m = {};
    companies.forEach((c) => {
      m[String(c.id)] = c.shortName || c.name || c.companyName || tr("Cty #{0}", { 0: c.id });
    });
    return m;
  }, [companies]);

  const projectAssigneeIds = useCallback((p) => {
    const ids = Array.isArray(p.assignees)
      ? p.assignees.map(extractId).filter(Boolean)
      : [];
    const managerId = extractId(p.projectManagerId);
    return ids.length ? ids : managerId ? [managerId] : [];
  }, []);

  const valueByProject = useMemo(() => {
    const psByProject = {};
    projectServices.forEach((ps) => {
      if (isDeletedServiceRecord(ps)) return;
      const pid = String(extractId(ps.projectId) || "");
      if (!pid) return;
      psByProject[pid] = (psByProject[pid] || 0) + serviceRowTotal(ps);
    });

    const csByContract = {};
    contractServices.forEach((cs) => {
      if (isDeletedServiceRecord(cs)) return;
      const cid = String(extractId(cs.contractId) || "");
      if (!cid) return;
      csByContract[cid] = (csByContract[cid] || 0) + serviceRowTotal(cs);
    });

    const m = {};
    projects.forEach((p) => {
      const pid = String(p.id);
      const pkgTotal = parseNum(p.packageTotalAmount);
      if (isPackagePricing(p) && pkgTotal > 0) {
        m[pid] = pkgTotal;
        return;
      }
      const psSum = psByProject[pid] || 0;
      if (psSum > 0) {
        m[pid] = psSum;
        return;
      }
      const cid = String(extractId(p.contractId) || "");
      if (cid && csByContract[cid] > 0) {
        m[pid] = csByContract[cid];
        return;
      }
      m[pid] = pkgTotal;
    });
    return m;
  }, [projects, projectServices, contractServices]);

  const taskStatsByProject = useMemo(() => {
    const m = {};
    tasks.forEach((t) => {
      const pid = String(extractId(t.projectId) || "");
      if (!pid) return;
      if (!m[pid]) m[pid] = { total: 0, done: 0 };
      m[pid].total += 1;
      if (t.status === "done" || t.status === "cancelled") m[pid].done += 1;
    });
    return m;
  }, [tasks]);

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => rangeToDates(filters.range, filters.customFrom, filters.customTo),
    [filters.range, filters.customFrom, filters.customTo],
  );

  const inRange = useCallback((p, start, end) => {
    if (!start) return true;
    const d = new Date(projectBaseDate(p));
    if (isNaN(d.getTime())) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  }, []);

  const filteredProjects = useMemo(
    () =>
      projects.filter((p) => {
        if (filters.companyId && extractId(p.internalCompanyId) !== filters.companyId)
          return false;
        if (filters.customerId && extractId(p.customerId) !== filters.customerId)
          return false;
        if (filters.lawyerId && !projectAssigneeIds(p).includes(filters.lawyerId))
          return false;
        if (filters.status && p.status !== filters.status) return false;
        if (filters.priority && (p.priority || "medium") !== filters.priority)
          return false;
        return inRange(p, rangeStart, rangeEnd);
      }),
    [projects, filters, projectAssigneeIds, inRange, rangeStart, rangeEnd],
  );

  const prevProjects = useMemo(() => {
    const { start, end } = prevRangeDates(filters.range, filters.customFrom, filters.customTo);
    if (!start) return null;
    return projects.filter((p) => {
      if (filters.companyId && extractId(p.internalCompanyId) !== filters.companyId)
        return false;
      if (filters.customerId && extractId(p.customerId) !== filters.customerId)
        return false;
      if (filters.lawyerId && !projectAssigneeIds(p).includes(filters.lawyerId))
        return false;
      if (filters.status && p.status !== filters.status) return false;
      if (filters.priority && (p.priority || "medium") !== filters.priority)
        return false;
      return inRange(p, start, end);
    });
  }, [projects, filters, projectAssigneeIds, inRange]);

  const kpi = useMemo(
    () => ({
      total: filteredProjects.length,
      prevTotal: prevProjects ? prevProjects.length : null,
      active: filteredProjects.filter((p) => p.status === "inProgress").length,
      overdue: filteredProjects.filter(isOverdue).length,
      done: filteredProjects.filter((p) => p.status === "done").length,
      prevDone: prevProjects ? prevProjects.filter((p) => p.status === "done").length : null,
      totalValue: filteredProjects.reduce(
        (s, p) => s + (valueByProject[String(p.id)] || 0),
        0,
      ),
    }),
    [filteredProjects, prevProjects, valueByProject],
  );

  const statusChart = useMemo(
    () => ({
      labels: STATUS_KEYS.map((k) => STATUS_CFG[k].label),
      datasets: [
        {
          data: STATUS_KEYS.map(
            (k) => filteredProjects.filter((p) => p.status === k).length,
          ),
          backgroundColor: STATUS_KEYS.map((k) => STATUS_CFG[k].chart),
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    }),
    [filteredProjects],
  );

  const months = useMemo(() => last12Months(), []);
  const monthlyChart = useMemo(() => {
    const newByMonth = {};
    const doneByMonth = {};
    filteredProjects.forEach((p) => {
      const d = new Date(projectBaseDate(p));
      if (!isNaN(d.getTime())) {
        const k = monthKey(d);
        newByMonth[k] = (newByMonth[k] || 0) + 1;
      }
      if (p.status === "done" && p.updatedAt) {
        const dd = new Date(p.updatedAt);
        if (!isNaN(dd.getTime())) {
          const k = monthKey(dd);
          doneByMonth[k] = (doneByMonth[k] || 0) + 1;
        }
      }
    });
    return {
      labels: months.map((m) => m.label),
      datasets: [
        {
          label: tr("New cases"),
          data: months.map((m) => newByMonth[m.key] || 0),
          backgroundColor: "#1677ff",
        },
        {
          label: tr("Done"),
          data: months.map((m) => doneByMonth[m.key] || 0),
          backgroundColor: "#52c41a",
        },
      ],
    };
  }, [filteredProjects, months]);

  const lawyerChart = useMemo(() => {
    const open = {};
    const overdue = {};
    filteredProjects.forEach((p) => {
      if (p.status === "done" || p.status === "cancelled") return;
      const od = isOverdue(p);
      projectAssigneeIds(p).forEach((lid) => {
        const key = String(lid);
        if (od) overdue[key] = (overdue[key] || 0) + 1;
        else open[key] = (open[key] || 0) + 1;
      });
    });
    const ids = Array.from(new Set([...Object.keys(open), ...Object.keys(overdue)]))
      .sort(
        (a, b) =>
          (open[b] || 0) + (overdue[b] || 0) - ((open[a] || 0) + (overdue[a] || 0)),
      )
      .slice(0, 8);
    return {
      labels: ids.map((id) => lawyerMap[id] || `LS #${id}`),
      datasets: [
        {
          label: tr("In progress"),
          data: ids.map((id) => open[id] || 0),
          backgroundColor: "#1677ff",
        },
        {
          label: tr("Overdue"),
          data: ids.map((id) => overdue[id] || 0),
          backgroundColor: "#ff4d4f",
        },
      ],
    };
  }, [filteredProjects, lawyerMap, projectAssigneeIds]);

  const revenueChart = useMemo(() => {
    const byMonth = {};
    filteredProjects.forEach((p) => {
      const amount = valueByProject[String(p.id)] || 0;
      if (!amount) return;
      const d = new Date(projectBaseDate(p));
      if (isNaN(d.getTime())) return;
      const k = monthKey(d);
      byMonth[k] = (byMonth[k] || 0) + amount;
    });
    return {
      labels: months.map((m) => m.label),
      datasets: [
        {
          label: tr("Value (million ₫)"),
          data: months.map((m) => Math.round((byMonth[m.key] || 0) / 1e6)),
          borderColor: "#1677ff",
          backgroundColor: "rgba(22,119,255,0.08)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    };
  }, [filteredProjects, months, valueByProject]);

  const serviceChart = useMemo(() => {
    const scopedIds = new Set(filteredProjects.map((p) => String(p.id)));
    const counts = {};
    projectServices.forEach((ps) => {
      const pid = String(extractId(ps.projectId) || "");
      if (!scopedIds.has(pid) || isDeletedServiceRecord(ps)) return;
      const name = ps.serviceName || tr("Other");
      counts[name] = (counts[name] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 7);
    const rest = entries.slice(7).reduce((s, [, v]) => s + v, 0);
    if (rest > 0) top.push([tr("Other"), rest]);
    return {
      labels: top.map(([name]) => name),
      datasets: [
        {
          data: top.map(([, v]) => v),
          backgroundColor: top.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    };
  }, [filteredProjects, projectServices]);

  const priorityChart = useMemo(() => {
    const open = filteredProjects.filter(
      (p) => p.status !== "done" && p.status !== "cancelled",
    );
    const keys = ["high", "medium", "low"];
    return {
      labels: keys.map((k) => PRIORITY_CFG[k].label),
      datasets: [
        {
          data: keys.map((k) => open.filter((p) => (p.priority || "medium") === k).length),
          backgroundColor: keys.map((k) => PRIORITY_CFG[k].chart),
          barThickness: 40,
        },
      ],
    };
  }, [filteredProjects]);

  const doughnutOpts = useMemo(
    () => ({
      cutout: "60%",
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
    }),
    [],
  );
  const pieOpts = useMemo(
    () => ({
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
    }),
    [],
  );
  const barOpts = useMemo(
    () => ({
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { grid: { display: false } },
      },
    }),
    [],
  );
  const hBarOpts = useMemo(
    () => ({
      indexAxis: "y",
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
      scales: {
        x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
        y: { stacked: true, grid: { display: false } },
      },
    }),
    [],
  );
  const lineOpts = useMemo(
    () => ({
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: (v) => `${v}tr` } },
        x: { grid: { display: false } },
      },
    }),
    [],
  );
  const simpleBarOpts = useMemo(
    () => ({
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { grid: { display: false } },
      },
    }),
    [],
  );

  const upcomingDeadlines = useMemo(
    () =>
      filteredProjects
        .filter((p) => p.deadline && p.status !== "done" && p.status !== "cancelled")
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 6),
    [filteredProjects],
  );

  const tableRows = useMemo(
    () =>
      filteredProjects.map((p) => ({
        ...p,
        key: p.id,
        customerName: customerMap[String(extractId(p.customerId))] || "-",
        companyName: companyMap[String(extractId(p.internalCompanyId))] || "-",
        assigneeNames:
          projectAssigneeIds(p)
            .map((id) => lawyerMap[String(id)])
            .filter(Boolean)
            .join(", ") || tr("Unassigned"),
        valueAmount: valueByProject[String(p.id)] || 0,
        taskStats: taskStatsByProject[String(p.id)] || { total: 0, done: 0 },
      })),
    [
      filteredProjects,
      customerMap,
      companyMap,
      lawyerMap,
      projectAssigneeIds,
      valueByProject,
      taskStatsByProject,
    ],
  );

  const tableColumnMap = useMemo(
    () => ({
      caseCode: {
        title: tr("Case code"),
        dataIndex: "caseCode",
        width: 140,
        render: (val) => <Text strong>{val || "-"}</Text>,
      },
      projectName: {
        title: tr("Matter name"),
        dataIndex: "projectName",
        ellipsis: true,
        render: (val) => val || "-",
      },
      customer: {
        title: tr("Customer"),
        dataIndex: "customerName",
        ellipsis: true,
      },
      status: {
        title: tr("Status"),
        dataIndex: "status",
        width: 140,
        render: (val) => (
          <Tag color={STATUS_CFG[val]?.color || "default"}>
            {STATUS_CFG[val]?.label || val || "-"}
          </Tag>
        ),
      },
      priority: {
        title: tr("Priority"),
        dataIndex: "priority",
        width: 120,
        render: (val) => {
          const key = val || "medium";
          return <Tag color={PRIORITY_CFG[key]?.color}>{PRIORITY_CFG[key]?.label || key}</Tag>;
        },
      },
      assignees: {
        title: tr("Assignees"),
        dataIndex: "assigneeNames",
        ellipsis: true,
      },
      taskProgress: {
        title: tr("Task progress"),
        dataIndex: "taskStats",
        width: 130,
        render: (stats) => {
          if (!stats?.total) return <Text type="secondary">{tr("No tasks yet")}</Text>;
          const pct = Math.round((stats.done / stats.total) * 100);
          return (
            <Space size={6}>
              <Text>{pct}%</Text>
              <Text type="secondary">
                {stats.done}/{stats.total}
              </Text>
            </Space>
          );
        },
      },
      deadline: {
        title: tr("Deadline"),
        dataIndex: "deadline",
        width: 130,
        render: (val, row) => (
          <Text type={isOverdue(row) ? "danger" : undefined}>{fmtDate(val)}</Text>
        ),
      },
      value: {
        title: tr("Value"),
        dataIndex: "valueAmount",
        width: 140,
        align: "right",
        render: (val) => <Text strong>{fmtCompactVND(val)}</Text>,
      },
      internalCompany: {
        title: tr("Internal company"),
        dataIndex: "companyName",
        ellipsis: true,
      },
      createdAt: {
        title: tr("Created at"),
        dataIndex: "createdAt",
        width: 120,
        render: fmtDate,
      },
    }),
    [],
  );

  const visibleTableColumns = useMemo(
    () => normalizeColumns(columns).map((key) => tableColumnMap[key]).filter(Boolean),
    [columns, tableColumnMap],
  );

  const visibleWidgetKeys = useMemo(
    () => normalizeOrder(layout.order).filter((key) => widgets[key]),
    [layout.order, widgets],
  );

  const activeFilterChips = useMemo(() => {
    const chips = [];
    const rangeLabel = RANGE_OPTIONS.find((o) => o.value === filters.range)?.label;
    if (filters.range && filters.range !== "all") {
      chips.push({ key: "range", label: tr("Period: {0}", { 0: rangeLabel || filters.range }) });
    }
    if (filters.companyId) {
      chips.push({
        key: "companyId",
        label: tr("Company: {0}", { 0: companyMap[String(filters.companyId)] || filters.companyId }),
      });
    }
    if (filters.customerId) {
      chips.push({
        key: "customerId",
        label: tr("Customer: {0}", { 0: customerMap[String(filters.customerId)] || filters.customerId }),
      });
    }
    if (filters.lawyerId) {
      chips.push({
        key: "lawyerId",
        label: tr("Lawyer: {0}", { 0: lawyerMap[String(filters.lawyerId)] || filters.lawyerId }),
      });
    }
    if (filters.status) {
      chips.push({ key: "status", label: tr("Status: {0}", { 0: STATUS_CFG[filters.status]?.label || filters.status }) });
    }
    if (filters.priority) {
      chips.push({ key: "priority", label: tr("Priority: {0}", { 0: PRIORITY_CFG[filters.priority]?.label || filters.priority }) });
    }
    return chips;
  }, [filters, companyMap, customerMap, lawyerMap]);

  const clearFilter = (key) => {
    if (key === "range") {
      setFilters((prev) => ({ ...prev, range: "all", customFrom: "", customTo: "" }));
      return;
    }
    setFilters((prev) => ({ ...prev, [key]: null }));
  };

  const clearAllFilters = () => {
    setFilters((prev) => ({
      ...prev,
      range: "all",
      customFrom: "",
      customTo: "",
      companyId: null,
      customerId: null,
      lawyerId: null,
      status: null,
      priority: null,
    }));
  };

  const savedComparable = useMemo(
    () =>
      JSON.stringify({
        name: activeView.name,
        viewMode: activeView.viewMode || "dashboard",
        visibleFilters: activeView.visibleFilters,
        widgets: activeView.widgets,
        layout: activeView.layout,
        columns: activeView.columns,
      }),
    [activeView],
  );

  const currentComparable = useMemo(
    () =>
      JSON.stringify({
        name: viewNameDraft.trim() || activeView.name,
        viewMode,
        visibleFilters,
        widgets,
        layout,
        columns: normalizeColumns(columns),
      }),
    [activeView.name, viewNameDraft, viewMode, visibleFilters, widgets, layout, columns],
  );

  const hasUnsavedChanges = savedComparable !== currentComparable;

  const renderWidget = (key) => {
    switch (key) {
      case "kpi_total":
        return (
          <Card size="small">
            <Statistic title={tr("Total cases")} value={kpi.total} />
            <TrendText current={kpi.total} previous={kpi.prevTotal} />
          </Card>
        );
      case "kpi_active":
        return (
          <Card size="small">
            <Statistic title={tr("In progress")} value={kpi.active} valueStyle={{ color: "#1677ff" }} />
          </Card>
        );
      case "kpi_overdue":
        return (
          <Card size="small">
            <Statistic
              title={tr("Past deadline")}
              value={kpi.overdue}
              valueStyle={{ color: kpi.overdue > 0 ? "#ff4d4f" : undefined }}
            />
          </Card>
        );
      case "kpi_done":
        return (
          <Card size="small">
            <Statistic title={tr("Done")} value={kpi.done} valueStyle={{ color: "#52c41a" }} />
            <TrendText current={kpi.done} previous={kpi.prevDone} />
          </Card>
        );
      case "kpi_value":
        return (
          <Card size="small">
            <Statistic title={tr("Total case value")} value={fmtCompactVND(kpi.totalValue)} />
          </Card>
        );
      case "chart_status":
        return (
          <Card size="small" title={tr("Case status distribution")}>
            <ChartCanvas type="doughnut" data={statusChart} options={doughnutOpts} />
          </Card>
        );
      case "chart_monthly":
        return (
          <Card size="small" title={tr("New vs completed cases (12 months)")}>
            <ChartCanvas type="bar" data={monthlyChart} options={barOpts} />
          </Card>
        );
      case "chart_lawyer":
        return (
          <Card size="small" title={tr("Workload by lawyer")}>
            {lawyerChart.labels.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr("No assignment data yet")} />
            ) : (
              <ChartCanvas type="bar" data={lawyerChart} options={hBarOpts} />
            )}
          </Card>
        );
      case "chart_revenue":
        return (
          <Card size="small" title={tr("Case value by month")}>
            <ChartCanvas type="line" data={revenueChart} options={lineOpts} />
          </Card>
        );
      case "chart_service":
        return (
          <Card size="small" title={tr("Mix by service type")}>
            {serviceChart.labels.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr("No services yet")} />
            ) : (
              <ChartCanvas type="pie" data={serviceChart} options={pieOpts} />
            )}
          </Card>
        );
      case "chart_priority":
        return (
          <Card size="small" title={tr("Open cases by priority")}>
            <ChartCanvas type="bar" data={priorityChart} options={simpleBarOpts} />
          </Card>
        );
      case "widget_deadline":
        return (
          <Card size="small" title={tr("Upcoming deadlines")} bodyStyle={{ paddingTop: 4 }}>
            {upcomingDeadlines.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr("No upcoming deadlines")} />
            ) : (
              upcomingDeadlines.map((p, i) => {
                const days = Math.ceil((new Date(p.deadline) - new Date()) / 86400000);
                const assigneeNames =
                  projectAssigneeIds(p)
                    .map((id) => lawyerMap[String(id)])
                    .filter(Boolean)
                    .join(", ") || tr("Unassigned");
                const customerName = customerMap[String(extractId(p.customerId))] || "";
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 0",
                      borderBottom:
                        i < upcomingDeadlines.length - 1
                          ? "1px solid rgba(5,5,5,0.06)"
                          : "none",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 13, display: "block" }} ellipsis>
                        {p.caseCode ? `${p.caseCode} · ` : ""}
                        {p.projectName}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {[customerName, assigneeNames].filter(Boolean).join(" · ")}
                      </Text>
                    </div>
                    <Text
                      type={days <= 5 ? "danger" : days <= 10 ? "warning" : "secondary"}
                      style={{ fontSize: 12, whiteSpace: "nowrap" }}
                    >
                      {days < 0 ? tr("{0} days late", { 0: Math.abs(days) }) : tr("{0} days left", { 0: days })}
                    </Text>
                  </div>
                );
              })
            )}
          </Card>
        );
      case "widget_table":
        return (
          <Card
            size="small"
            title={tr("Case list")}
            extra={<Text type="secondary">{tableRows.length} {tr("cases")}</Text>}
          >
            <Table
              size="small"
              rowKey="id"
              dataSource={tableRows}
              columns={visibleTableColumns}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              scroll={{ x: "max-content" }}
            />
          </Card>
        );
      default:
        return null;
    }
  };

  const renderWidgetGrid = (keys, emptyText = tr("No content for this view yet")) => {
    const normalizedKeys = keys.filter((key) => widgets[key] !== false);
    if (normalizedKeys.length === 0) {
      return (
        <Card style={{ borderRadius: UI.radius }}>
          <Empty description={emptyText} />
        </Card>
      );
    }
    return (
      <Row gutter={[16, 16]}>
        {normalizedKeys.map((key) => (
          <Col key={key} {...colProps(layout.spans?.[key] || WIDGET_MAP[key]?.span)}>
            {renderWidget(key)}
          </Col>
        ))}
      </Row>
    );
  };

  const renderTableMode = () => (
    <Card
      size="small"
      title={tr("Table View")}
      extra={
        <Space>
          <Text type="secondary">{tableRows.length} records</Text>
          <Button size="small" onClick={() => setDrawerOpen(true)}>
            {tr("Configure fields")}
          </Button>
        </Space>
      }
      style={{ borderRadius: UI.radius }}
    >
      <Table
        size="small"
        rowKey="id"
        dataSource={tableRows}
        columns={visibleTableColumns}
        pagination={{ pageSize: 12, showSizeChanger: true }}
        scroll={{ x: "max-content" }}
      />
    </Card>
  );

  const renderChartMode = () =>
    renderWidgetGrid(
      [
        "chart_status",
        "chart_monthly",
        "chart_lawyer",
        "chart_revenue",
        "chart_service",
        "chart_priority",
      ],
      tr("No chart widget enabled"),
    );

  const renderKpiMode = () =>
    renderWidgetGrid(
      ["kpi_total", "kpi_active", "kpi_overdue", "kpi_done", "kpi_value"],
      tr("No KPI widget enabled"),
    );

  const renderKanbanMode = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(240px, 1fr))",
        gap: 12,
        overflowX: "auto",
        paddingBottom: 4,
      }}
    >
      {STATUS_KEYS.map((statusKey) => {
        const rows = tableRows.filter((p) => (p.status || "toDo") === statusKey);
        return (
          <Card
            key={statusKey}
            size="small"
            title={
              <Space>
                <Tag color={STATUS_CFG[statusKey]?.color}>{STATUS_CFG[statusKey]?.label}</Tag>
                <Text type="secondary">{rows.length}</Text>
              </Space>
            }
            style={{ borderRadius: UI.radius, minWidth: 240 }}
            bodyStyle={{ padding: 10, background: "#fafafa" }}
          >
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              {rows.length === 0 && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr("No records")} />
              )}
              {rows.slice(0, 12).map((row) => {
                const pct = row.taskStats?.total
                  ? Math.round((row.taskStats.done / row.taskStats.total) * 100)
                  : 0;
                return (
                  <Card key={row.id} size="small" bodyStyle={{ padding: 10 }}>
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      <Text strong ellipsis>
                        {row.caseCode ? `${row.caseCode} · ` : ""}
                        {row.projectName || tr("Untitled")}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                        {row.customerName} · {row.assigneeNames}
                      </Text>
                      <Progress percent={pct} size="small" showInfo={false} />
                      <Space style={{ justifyContent: "space-between", width: "100%" }}>
                        <Tag color={PRIORITY_CFG[row.priority || "medium"]?.color}>
                          {PRIORITY_CFG[row.priority || "medium"]?.label}
                        </Tag>
                        <Text type={isOverdue(row) ? "danger" : "secondary"} style={{ fontSize: 12 }}>
                          {fmtDate(row.deadline)}
                        </Text>
                      </Space>
                    </Space>
                  </Card>
                );
              })}
            </Space>
          </Card>
        );
      })}
    </div>
  );

  const renderCalendarMode = () => {
    const calendarRows = tableRows
      .filter((row) => row.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 30);
    return (
      <Card
        size="small"
        title={tr("Calendar View")}
        extra={
          <Segmented
            size="small"
            value={calendarMode}
            onChange={setCalendarMode}
            options={[
              { label: tr("Month"), value: "month" },
              { label: tr("Week"), value: "week" },
              { label: tr("Day"), value: "day" },
              { label: tr("List"), value: "list" },
            ]}
          />
        }
        style={{ borderRadius: UI.radius }}
      >
        {calendarRows.length === 0 ? (
          <Empty description={tr("No dates match the current filters")} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {calendarRows.map((row) => {
              const date = new Date(row.deadline);
              return (
                <div
                  key={row.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px 1fr",
                    gap: 12,
                    padding: 12,
                    border: `1px solid ${UI.softBorder}`,
                    borderRadius: UI.radius,
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      border: `1px solid ${isOverdue(row) ? "#ffa39e" : UI.border}`,
                      borderRadius: UI.radius,
                      textAlign: "center",
                      padding: "6px 0",
                      background: isOverdue(row) ? "#fff1f0" : "#fafafa",
                    }}
                  >
                    <Text strong style={{ display: "block", fontSize: 18, lineHeight: "20px" }}>
                      {isNaN(date.getTime()) ? "-" : date.getDate()}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {isNaN(date.getTime()) ? "" : `T${date.getMonth() + 1}`}
                    </Text>
                  </div>
                  <Space direction="vertical" size={4} style={{ minWidth: 0 }}>
                    <Text strong ellipsis>
                      {row.projectName || tr("Untitled")}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      {row.customerName} · {row.assigneeNames}
                    </Text>
                    <Space>
                      <Tag color={STATUS_CFG[row.status]?.color}>{STATUS_CFG[row.status]?.label || "-"}</Tag>
                      <Tag color={PRIORITY_CFG[row.priority || "medium"]?.color}>
                        {PRIORITY_CFG[row.priority || "medium"]?.label}
                      </Tag>
                    </Space>
                  </Space>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  };

  const renderMainContent = () => {
    if (viewMode === "table") return renderTableMode();
    if (viewMode === "chart") return renderChartMode();
    if (viewMode === "kpi") return renderKpiMode();
    if (viewMode === "kanban") return renderKanbanMode();
    if (viewMode === "calendar") return renderCalendarMode();
    return renderWidgetGrid(visibleWidgetKeys, tr("No widget enabled for this view"));
  };

  if (loading)
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );

  return (
    <div style={{ padding: 16, background: UI.page, minHeight: "100%" }}>
      <Card
        size="small"
        style={{
          marginBottom: 12,
          borderRadius: UI.radius,
          borderColor: UI.border,
          boxShadow: UI.shadow,
        }}
        bodyStyle={{ padding: 16 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tr("Dashboard / Case Management")}
            </Text>
            <Space align="center" wrap>
              <Title level={4} style={{ margin: 0, color: UI.text }}>
                {tr("Case Dashboard")}
              </Title>
              {hasUnsavedChanges && <Tag color="gold">{tr("Unsaved changes")}</Tag>}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tr("Switch view modes, refine filters, and save workspace presets.")}
            </Text>
          </Space>
          <Space wrap>
            <Select
              style={{ minWidth: 230 }}
              value={activeViewId}
              onChange={selectView}
              options={views.map((v) => ({
                value: v.id,
                label: `${v.name}${v.system ? " (default)" : ""}`,
              }))}
            />
            <Button onClick={reload}>{tr("Refresh")}</Button>
            <Button onClick={() => setDrawerOpen(true)}>{tr("Configure")}</Button>
            <Button type="primary" onClick={saveCurrentView}>
              {tr("Save view")}
            </Button>
          </Space>
        </div>

        <Divider style={{ margin: "14px 0" }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <Segmented value={viewMode} onChange={setViewMode} options={VIEW_MODE_OPTIONS} />
          <Space size={8} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tableRows.length} records
            </Text>
            <Button size="small" onClick={() => setDrawerOpen(true)}>
              {tr("Fields & filters")}
            </Button>
          </Space>
        </div>

        <Space wrap size={8}>
          {visibleFilters.range !== false && (
            <Select
              size="small"
              style={{ minWidth: 140 }}
              value={filters.range}
              onChange={(v) => updateFilter("range", v)}
              options={RANGE_OPTIONS}
            />
          )}
          {visibleFilters.range !== false && filters.range === "custom" && (
            <Space size={4}>
              <Input
                size="small"
                type="date"
                value={filters.customFrom}
                onChange={(e) => updateFilter("customFrom", e.target.value)}
                style={{ width: 145 }}
              />
              <Text type="secondary">{tr("to")}</Text>
              <Input
                size="small"
                type="date"
                value={filters.customTo}
                onChange={(e) => updateFilter("customTo", e.target.value)}
                style={{ width: 145 }}
              />
            </Space>
          )}
          {visibleFilters.company !== false && (
            <Select
              size="small"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={tr("Internal company")}
              style={{ minWidth: 170 }}
              value={filters.companyId}
              onChange={(v) => updateFilter("companyId", v || null)}
              options={companies.map((c) => ({
                value: extractId(c.id),
                label: c.shortName || c.name || c.companyName || tr("Cty #{0}", { 0: c.id }),
              }))}
            />
          )}
          {visibleFilters.customer !== false && (
            <Select
              size="small"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={tr("Customer")}
              style={{ minWidth: 170 }}
              value={filters.customerId}
              onChange={(v) => updateFilter("customerId", v || null)}
              options={customers.map((c) => ({
                value: extractId(c.id),
                label: c.shortName || c.customerName || tr("KH #{0}", { 0: c.id }),
              }))}
            />
          )}
          {visibleFilters.lawyer !== false && (
            <Select
              size="small"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={tr("Lawyer in charge")}
              style={{ minWidth: 170 }}
              value={filters.lawyerId}
              onChange={(v) => updateFilter("lawyerId", v || null)}
              options={lawyers.map((l) => ({
                value: extractId(l.id),
                label: l.lawyerName,
              }))}
            />
          )}
          {visibleFilters.status !== false && (
            <Select
              size="small"
              allowClear
              placeholder={tr("Status")}
              style={{ minWidth: 150 }}
              value={filters.status}
              onChange={(v) => updateFilter("status", v || null)}
              options={STATUS_KEYS.map((k) => ({
                value: k,
                label: STATUS_CFG[k].label,
              }))}
            />
          )}
          {visibleFilters.priority !== false && (
            <Select
              size="small"
              allowClear
              placeholder={tr("Priority")}
              style={{ minWidth: 140 }}
              value={filters.priority}
              onChange={(v) => updateFilter("priority", v || null)}
              options={Object.entries(PRIORITY_CFG).map(([k, v]) => ({
                value: k,
                label: v.label,
              }))}
            />
          )}
        </Space>

        {activeFilterChips.length > 0 && (
          <>
            <Divider style={{ margin: "10px 0" }} />
            <Space wrap size={6}>
              {activeFilterChips.map((chip) => (
                <Tag key={chip.key} closable onClose={() => clearFilter(chip.key)}>
                  {chip.label}
                </Tag>
              ))}
              <Button type="link" size="small" onClick={clearAllFilters}>
                {tr("Clear all")}
              </Button>
            </Space>
          </>
        )}
      </Card>

      {renderMainContent()}

      <Drawer
        title={tr("Configure view")}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
        extra={
          <Space>
            <Button size="small" onClick={duplicateView}>
              {tr("Duplicate")}
            </Button>
            {!activeView.system && (
              <Button danger size="small" onClick={deleteCurrentView}>
                {tr("Delete view")}
              </Button>
            )}
            {activeView.system && (
              <Button size="small" onClick={resetCurrentView}>
                {tr("Default")}
              </Button>
            )}
            <Button type="primary" size="small" onClick={saveCurrentView}>
              {tr("Save")}
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <div>
            <Text strong>{tr("View name")}</Text>
            <Input
              value={viewNameDraft}
              onChange={(e) => setViewNameDraft(e.target.value)}
              disabled={activeView.system}
              style={{ marginTop: 6 }}
            />
            {activeView.system && (
              <Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
                {tr("A default view is saved as a custom copy when you click Save view.")}
              </Text>
            )}
          </div>

          <div>
            <Text strong>{tr("Default mode")}</Text>
            <Segmented
              style={{ marginTop: 8 }}
              value={viewMode}
              onChange={setViewMode}
              options={VIEW_MODE_OPTIONS}
            />
          </div>

          <Tabs
            size="small"
            items={[
              {
                key: "widgets",
                label: tr("Widgets"),
                children: (
                  <Space direction="vertical" style={{ width: "100%" }} size={8}>
                    {normalizeOrder(layout.order).map((key) => {
                      const def = WIDGET_MAP[key];
                      if (!def) return null;
                      return (
                        <Card key={key} size="small" bodyStyle={{ padding: 10 }}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr auto",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <Space direction="vertical" size={0}>
                              <Text strong>{def.label}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {def.group}
                              </Text>
                            </Space>
                            <Switch
                              size="small"
                              checked={widgets[key] !== false}
                              onChange={(v) => setWidgetVisible(key, v)}
                            />
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            <Space>
                              <Button size="small" onClick={() => moveWidget(key, -1)}>
                                {tr("Up")}
                              </Button>
                              <Button size="small" onClick={() => moveWidget(key, 1)}>
                                {tr("Down")}
                              </Button>
                            </Space>
                            <Select
                              size="small"
                              style={{ width: 120 }}
                              value={layout.spans?.[key] || def.span}
                              onChange={(v) => setWidgetSpan(key, v)}
                              options={[
                                { value: 4, label: tr("1/3 row") },
                                { value: 6, label: tr("1/2 row") },
                                { value: 8, label: tr("2/3 row") },
                                { value: 12, label: tr("Full row") },
                              ]}
                            />
                          </div>
                        </Card>
                      );
                    })}
                  </Space>
                ),
              },
              {
                key: "filters",
                label: tr("Filters"),
                children: (
                  <Space direction="vertical" style={{ width: "100%" }} size={8}>
                    {FILTER_DEFS.map((f) => (
                      <div
                        key={f.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: "1px solid #f0f0f0",
                        }}
                      >
                        <Text>{f.label}</Text>
                        <Switch
                          size="small"
                          checked={visibleFilters[f.key] !== false}
                          onChange={(v) =>
                            setVisibleFilters((prev) => ({ ...prev, [f.key]: v }))
                          }
                        />
                      </div>
                    ))}
                  </Space>
                ),
              },
              {
                key: "columns",
                label: tr("Table columns"),
                children: (
                  <Checkbox.Group
                    value={columns}
                    onChange={(vals) => setColumns(normalizeColumns(vals))}
                    style={{ width: "100%" }}
                  >
                    <Space direction="vertical" style={{ width: "100%" }} size={8}>
                      {COLUMN_DEFS.map((c) => (
                        <Checkbox key={c.key} value={c.key}>
                          {c.label}
                        </Checkbox>
                      ))}
                    </Space>
                  </Checkbox.Group>
                ),
              },
            ]}
          />
        </Space>
      </Drawer>
    </div>
  );
};

ctx.render(<CaseDashboard />);
