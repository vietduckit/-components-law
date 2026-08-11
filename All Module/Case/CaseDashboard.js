// ============================================================
// CASE DASHBOARD - NocoBase JS Block
// Phase 1: configurable dashboard views for non-dev users.
// Data sources: projects, tasks, projectServices, contractServices,
// lawyers, customers, internalCompany.
// ============================================================
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
  toDo: { label: "Chưa thực hiện", color: "default", chart: "#d9d9d9" },
  inProgress: { label: "Đang xử lý", color: "processing", chart: "#1677ff" },
  done: { label: "Hoàn thành", color: "success", chart: "#52c41a" },
  cancelled: { label: "Đã hủy", color: "default", chart: "#bfbfbf" },
};
const STATUS_KEYS = ["toDo", "inProgress", "done", "cancelled"];

const PRIORITY_CFG = {
  high: { label: "Cao", color: "red", chart: "#ff4d4f" },
  medium: { label: "Trung bình", color: "gold", chart: "#faad14" },
  low: { label: "Thấp", color: "green", chart: "#52c41a" },
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
  { label: "7 ngày qua", value: "7d" },
  { label: "30 ngày qua", value: "30d" },
  { label: "Quý này", value: "quarter" },
  { label: "Năm nay", value: "year" },
  { label: "Tất cả", value: "all" },
  { label: "Tùy chọn", value: "custom" },
];

const FILTER_DEFS = [
  { key: "range", label: "Thời gian" },
  { key: "company", label: "Công ty nội bộ" },
  { key: "customer", label: "Khách hàng" },
  { key: "lawyer", label: "Luật sư phụ trách" },
  { key: "status", label: "Trạng thái" },
  { key: "priority", label: "Ưu tiên" },
];

const VIEW_MODE_OPTIONS = [
  { label: "Overview", value: "dashboard" },
  { label: "Table", value: "table" },
  { label: "Charts", value: "chart" },
  { label: "KPI", value: "kpi" },
  { label: "Kanban", value: "kanban" },
  { label: "Calendar", value: "calendar" },
];

const WIDGET_DEFS = [
  { key: "kpi_total", label: "Tổng hồ sơ", group: "KPI", span: 4 },
  { key: "kpi_active", label: "Đang xử lý", group: "KPI", span: 4 },
  { key: "kpi_overdue", label: "Quá hạn deadline", group: "KPI", span: 4 },
  { key: "kpi_done", label: "Hoàn thành trong kỳ", group: "KPI", span: 4 },
  { key: "kpi_value", label: "Tổng giá trị hồ sơ", group: "KPI", span: 4 },
  { key: "chart_status", label: "Phân bố trạng thái", group: "Biểu đồ", span: 4 },
  { key: "chart_monthly", label: "Hồ sơ mới vs hoàn thành", group: "Biểu đồ", span: 8 },
  { key: "chart_lawyer", label: "Workload theo luật sư", group: "Biểu đồ", span: 6 },
  { key: "chart_revenue", label: "Giá trị theo tháng", group: "Biểu đồ", span: 6 },
  { key: "chart_service", label: "Cơ cấu loại dịch vụ", group: "Biểu đồ", span: 4 },
  { key: "chart_priority", label: "Theo mức ưu tiên", group: "Biểu đồ", span: 4 },
  { key: "widget_deadline", label: "Deadline sắp tới", group: "Danh sách", span: 4 },
  { key: "widget_table", label: "Bảng danh sách hồ sơ", group: "Bảng", span: 12 },
];

const WIDGET_MAP = WIDGET_DEFS.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

const COLUMN_DEFS = [
  { key: "caseCode", label: "Mã hồ sơ" },
  { key: "projectName", label: "Tên vụ việc" },
  { key: "customer", label: "Khách hàng" },
  { key: "status", label: "Trạng thái" },
  { key: "priority", label: "Ưu tiên" },
  { key: "assignees", label: "Phụ trách" },
  { key: "taskProgress", label: "Tiến độ task" },
  { key: "deadline", label: "Deadline" },
  { key: "value", label: "Giá trị" },
  { key: "internalCompany", label: "Công ty nội bộ" },
  { key: "createdAt", label: "Ngày tạo" },
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
    name: "Tổng quan",
    description: "View mặc định cho quản lý hồ sơ, trạng thái và giá trị.",
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
    name: "Vận hành",
    description: "Theo dõi deadline, workload và tiến độ xử lý.",
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
    name: "Tài chính",
    description: "Tập trung vào giá trị hồ sơ và cơ cấu dịch vụ.",
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
    name: "Khách hàng",
    description: "View theo dõi hồ sơ theo khách hàng.",
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
// UTILS
// ============================================================
const extractId = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (Array.isArray(val)) return val.length > 0 ? extractId(val[0]) : null;
  if (typeof val === "object") return val.id ? parseInt(val.id, 10) : null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

const fmtCompactVND = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e9)
    return (v / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + " tỷ ₫";
  if (v >= 1e6)
    return (v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tr ₫";
  return v.toLocaleString("vi-VN") + " ₫";
};

const fmtDate = (val) => {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN");
};

const isOverdue = (p) =>
  p.deadline &&
  p.status !== "done" &&
  p.status !== "cancelled" &&
  new Date(p.deadline) < new Date();

const parseNum = (v) =>
  parseFloat(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;

const isPackagePricing = (p) =>
  String(p?.pricingMode || "")
    .toLowerCase()
    .trim() === "package";

const isDeletedServiceRecord = (r) =>
  !!r?.isDeleted ||
  String(r?.status || r?.lineStatus || "")
    .toLowerCase()
    .trim() === "deleted";

const serviceRowTotal = (r) => {
  const total = parseNum(r?.totalAmount);
  if (total) return total;
  const sub =
    parseNum(r?.subTotal) ||
    parseNum(r?.basePrice) * (parseNum(r?.quantity) || 1);
  return sub + parseNum(r?.vatAmount);
};

const projectBaseDate = (p) => p.date || p.createdAt;

const parseDateInput = (val, endOfDay = false) => {
  if (!val) return null;
  const d = new Date(`${val}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return isNaN(d.getTime()) ? null : d;
};

const rangeToDates = (range, customFrom, customTo) => {
  const now = new Date();
  let start = null;
  let end = now;
  if (range === "7d") start = new Date(now.getTime() - 7 * 86400000);
  else if (range === "30d") start = new Date(now.getTime() - 30 * 86400000);
  else if (range === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
  } else if (range === "year") start = new Date(now.getFullYear(), 0, 1);
  else if (range === "custom") {
    start = parseDateInput(customFrom);
    end = parseDateInput(customTo, true) || now;
  }
  return { start, end };
};

const prevRangeDates = (range, customFrom, customTo) => {
  const { start, end } = rangeToDates(range, customFrom, customTo);
  if (!start) return { start: null, end: null };
  const len = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - len), end: start };
};

const monthKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const last12Months = () => {
  const out = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: monthKey(d),
      label: `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`,
    });
  }
  return out;
};

const clampSpan = (span) => [4, 6, 8, 12].includes(span) ? span : 4;
const colProps = (span) => ({
  xs: 24,
  md: span >= 12 ? 24 : 12,
  xl: clampSpan(span) * 2,
});

const moveInArray = (arr, key, dir) => {
  const idx = arr.indexOf(key);
  const target = idx + dir;
  if (idx < 0 || target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  const tmp = next[idx];
  next[idx] = next[target];
  next[target] = tmp;
  return next;
};

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
        description="Không tải được thư viện biểu đồ"
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
        Không đổi so với kỳ trước
      </Text>
    );
  const pct =
    previous > 0
      ? `${Math.abs(Math.round((diff / previous) * 100))}%`
      : Math.abs(diff);
  return (
    <Text type={diff > 0 ? "success" : "danger"} style={{ fontSize: 12 }}>
      {diff > 0 ? "Tăng" : "Giảm"} {pct} so với kỳ trước
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
        description: "View tùy chỉnh",
      });
      persistViews([...views, customView], id);
      message.success("Đã tạo view tùy chỉnh mới");
      return;
    }
    const nextViews = views.map((v) => (v.id === activeViewId ? current : v));
    persistViews(nextViews, activeViewId);
    message.success("Đã lưu cấu hình view");
  };

  const duplicateView = () => {
    const id = `custom_${Date.now()}`;
    const customView = normalizeView({
      ...snapshotView(activeView),
      id,
      system: false,
      name: `${viewNameDraft || activeView.name} - Copy`,
      description: "View tùy chỉnh",
    });
    persistViews([...views, customView], id);
    message.success("Đã nhân bản view");
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
    message.success("Đã khôi phục cấu hình mặc định");
  };

  const deleteCurrentView = () => {
    if (activeView.system) return;
    const nextViews = views.filter((v) => v.id !== activeViewId);
    persistViews(nextViews, "overview");
    message.success("Đã xóa view tùy chỉnh");
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
      m[String(c.id)] = c.shortName || c.name || c.companyName || `Cty #${c.id}`;
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
          label: "Hồ sơ mới",
          data: months.map((m) => newByMonth[m.key] || 0),
          backgroundColor: "#1677ff",
        },
        {
          label: "Hoàn thành",
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
          label: "Đang xử lý",
          data: ids.map((id) => open[id] || 0),
          backgroundColor: "#1677ff",
        },
        {
          label: "Quá hạn",
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
          label: "Giá trị (triệu ₫)",
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
      const name = ps.serviceName || "Khác";
      counts[name] = (counts[name] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 7);
    const rest = entries.slice(7).reduce((s, [, v]) => s + v, 0);
    if (rest > 0) top.push(["Khác", rest]);
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
            .join(", ") || "Chưa phân công",
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
        title: "Mã hồ sơ",
        dataIndex: "caseCode",
        width: 140,
        render: (val) => <Text strong>{val || "-"}</Text>,
      },
      projectName: {
        title: "Tên vụ việc",
        dataIndex: "projectName",
        ellipsis: true,
        render: (val) => val || "-",
      },
      customer: {
        title: "Khách hàng",
        dataIndex: "customerName",
        ellipsis: true,
      },
      status: {
        title: "Trạng thái",
        dataIndex: "status",
        width: 140,
        render: (val) => (
          <Tag color={STATUS_CFG[val]?.color || "default"}>
            {STATUS_CFG[val]?.label || val || "-"}
          </Tag>
        ),
      },
      priority: {
        title: "Ưu tiên",
        dataIndex: "priority",
        width: 120,
        render: (val) => {
          const key = val || "medium";
          return <Tag color={PRIORITY_CFG[key]?.color}>{PRIORITY_CFG[key]?.label || key}</Tag>;
        },
      },
      assignees: {
        title: "Phụ trách",
        dataIndex: "assigneeNames",
        ellipsis: true,
      },
      taskProgress: {
        title: "Tiến độ task",
        dataIndex: "taskStats",
        width: 130,
        render: (stats) => {
          if (!stats?.total) return <Text type="secondary">Chưa có task</Text>;
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
        title: "Deadline",
        dataIndex: "deadline",
        width: 130,
        render: (val, row) => (
          <Text type={isOverdue(row) ? "danger" : undefined}>{fmtDate(val)}</Text>
        ),
      },
      value: {
        title: "Giá trị",
        dataIndex: "valueAmount",
        width: 140,
        align: "right",
        render: (val) => <Text strong>{fmtCompactVND(val)}</Text>,
      },
      internalCompany: {
        title: "Công ty nội bộ",
        dataIndex: "companyName",
        ellipsis: true,
      },
      createdAt: {
        title: "Ngày tạo",
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
      chips.push({ key: "range", label: `Thời gian: ${rangeLabel || filters.range}` });
    }
    if (filters.companyId) {
      chips.push({
        key: "companyId",
        label: `Công ty: ${companyMap[String(filters.companyId)] || filters.companyId}`,
      });
    }
    if (filters.customerId) {
      chips.push({
        key: "customerId",
        label: `Khách hàng: ${customerMap[String(filters.customerId)] || filters.customerId}`,
      });
    }
    if (filters.lawyerId) {
      chips.push({
        key: "lawyerId",
        label: `Luật sư: ${lawyerMap[String(filters.lawyerId)] || filters.lawyerId}`,
      });
    }
    if (filters.status) {
      chips.push({ key: "status", label: `Trạng thái: ${STATUS_CFG[filters.status]?.label || filters.status}` });
    }
    if (filters.priority) {
      chips.push({ key: "priority", label: `Ưu tiên: ${PRIORITY_CFG[filters.priority]?.label || filters.priority}` });
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
            <Statistic title="Tổng hồ sơ" value={kpi.total} />
            <TrendText current={kpi.total} previous={kpi.prevTotal} />
          </Card>
        );
      case "kpi_active":
        return (
          <Card size="small">
            <Statistic title="Đang xử lý" value={kpi.active} valueStyle={{ color: "#1677ff" }} />
          </Card>
        );
      case "kpi_overdue":
        return (
          <Card size="small">
            <Statistic
              title="Quá hạn deadline"
              value={kpi.overdue}
              valueStyle={{ color: kpi.overdue > 0 ? "#ff4d4f" : undefined }}
            />
          </Card>
        );
      case "kpi_done":
        return (
          <Card size="small">
            <Statistic title="Hoàn thành" value={kpi.done} valueStyle={{ color: "#52c41a" }} />
            <TrendText current={kpi.done} previous={kpi.prevDone} />
          </Card>
        );
      case "kpi_value":
        return (
          <Card size="small">
            <Statistic title="Tổng giá trị hồ sơ" value={fmtCompactVND(kpi.totalValue)} />
          </Card>
        );
      case "chart_status":
        return (
          <Card size="small" title="Phân bố trạng thái hồ sơ">
            <ChartCanvas type="doughnut" data={statusChart} options={doughnutOpts} />
          </Card>
        );
      case "chart_monthly":
        return (
          <Card size="small" title="Hồ sơ mới vs hoàn thành (12 tháng)">
            <ChartCanvas type="bar" data={monthlyChart} options={barOpts} />
          </Card>
        );
      case "chart_lawyer":
        return (
          <Card size="small" title="Khối lượng công việc theo luật sư">
            {lawyerChart.labels.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu phân công" />
            ) : (
              <ChartCanvas type="bar" data={lawyerChart} options={hBarOpts} />
            )}
          </Card>
        );
      case "chart_revenue":
        return (
          <Card size="small" title="Giá trị hồ sơ theo tháng">
            <ChartCanvas type="line" data={revenueChart} options={lineOpts} />
          </Card>
        );
      case "chart_service":
        return (
          <Card size="small" title="Cơ cấu theo loại dịch vụ">
            {serviceChart.labels.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dịch vụ" />
            ) : (
              <ChartCanvas type="pie" data={serviceChart} options={pieOpts} />
            )}
          </Card>
        );
      case "chart_priority":
        return (
          <Card size="small" title="Hồ sơ đang mở theo ưu tiên">
            <ChartCanvas type="bar" data={priorityChart} options={simpleBarOpts} />
          </Card>
        );
      case "widget_deadline":
        return (
          <Card size="small" title="Deadline sắp tới" bodyStyle={{ paddingTop: 4 }}>
            {upcomingDeadlines.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có deadline sắp tới" />
            ) : (
              upcomingDeadlines.map((p, i) => {
                const days = Math.ceil((new Date(p.deadline) - new Date()) / 86400000);
                const assigneeNames =
                  projectAssigneeIds(p)
                    .map((id) => lawyerMap[String(id)])
                    .filter(Boolean)
                    .join(", ") || "Chưa phân công";
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
                      {days < 0 ? `Trễ ${Math.abs(days)} ngày` : `Còn ${days} ngày`}
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
            title="Danh sách hồ sơ"
            extra={<Text type="secondary">{tableRows.length} hồ sơ</Text>}
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

  const renderWidgetGrid = (keys, emptyText = "Chưa có nội dung cho view này") => {
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
      title="Table View"
      extra={
        <Space>
          <Text type="secondary">{tableRows.length} records</Text>
          <Button size="small" onClick={() => setDrawerOpen(true)}>
            Configure fields
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
      "Chưa bật chart widget nào",
    );

  const renderKpiMode = () =>
    renderWidgetGrid(
      ["kpi_total", "kpi_active", "kpi_overdue", "kpi_done", "kpi_value"],
      "Chưa bật KPI widget nào",
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
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có record" />
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
                        {row.projectName || "Untitled"}
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
        title="Calendar View"
        extra={
          <Segmented
            size="small"
            value={calendarMode}
            onChange={setCalendarMode}
            options={[
              { label: "Month", value: "month" },
              { label: "Week", value: "week" },
              { label: "Day", value: "day" },
              { label: "List", value: "list" },
            ]}
          />
        }
        style={{ borderRadius: UI.radius }}
      >
        {calendarRows.length === 0 ? (
          <Empty description="Không có mốc thời gian phù hợp với filter hiện tại" />
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
                      {row.projectName || "Untitled"}
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
    return renderWidgetGrid(visibleWidgetKeys, "Chưa bật widget nào cho view này");
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
              Dashboard / Case Management
            </Text>
            <Space align="center" wrap>
              <Title level={4} style={{ margin: 0, color: UI.text }}>
                Case Dashboard
              </Title>
              {hasUnsavedChanges && <Tag color="gold">Unsaved changes</Tag>}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Switch view modes, refine filters, and save workspace presets.
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
            <Button onClick={reload}>Refresh</Button>
            <Button onClick={() => setDrawerOpen(true)}>Configure</Button>
            <Button type="primary" onClick={saveCurrentView}>
              Save view
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
              Fields & filters
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
              <Text type="secondary">đến</Text>
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
              placeholder="Công ty nội bộ"
              style={{ minWidth: 170 }}
              value={filters.companyId}
              onChange={(v) => updateFilter("companyId", v || null)}
              options={companies.map((c) => ({
                value: extractId(c.id),
                label: c.shortName || c.name || c.companyName || `Cty #${c.id}`,
              }))}
            />
          )}
          {visibleFilters.customer !== false && (
            <Select
              size="small"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Khách hàng"
              style={{ minWidth: 170 }}
              value={filters.customerId}
              onChange={(v) => updateFilter("customerId", v || null)}
              options={customers.map((c) => ({
                value: extractId(c.id),
                label: c.shortName || c.customerName || `KH #${c.id}`,
              }))}
            />
          )}
          {visibleFilters.lawyer !== false && (
            <Select
              size="small"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Luật sư phụ trách"
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
              placeholder="Trạng thái"
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
              placeholder="Ưu tiên"
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
                Clear all
              </Button>
            </Space>
          </>
        )}
      </Card>

      {renderMainContent()}

      <Drawer
        title="Configure view"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
        extra={
          <Space>
            <Button size="small" onClick={duplicateView}>
              Duplicate
            </Button>
            {!activeView.system && (
              <Button danger size="small" onClick={deleteCurrentView}>
                Xóa view
              </Button>
            )}
            {activeView.system && (
              <Button size="small" onClick={resetCurrentView}>
                Mặc định
              </Button>
            )}
            <Button type="primary" size="small" onClick={saveCurrentView}>
              Save
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <div>
            <Text strong>Tên view</Text>
            <Input
              value={viewNameDraft}
              onChange={(e) => setViewNameDraft(e.target.value)}
              disabled={activeView.system}
              style={{ marginTop: 6 }}
            />
            {activeView.system && (
              <Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
                View mặc định sẽ được lưu thành một bản custom khi bấm Lưu view.
              </Text>
            )}
          </div>

          <div>
            <Text strong>Default mode</Text>
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
                label: "Widgets",
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
                                Lên
                              </Button>
                              <Button size="small" onClick={() => moveWidget(key, 1)}>
                                Xuống
                              </Button>
                            </Space>
                            <Select
                              size="small"
                              style={{ width: 120 }}
                              value={layout.spans?.[key] || def.span}
                              onChange={(v) => setWidgetSpan(key, v)}
                              options={[
                                { value: 4, label: "1/3 dòng" },
                                { value: 6, label: "1/2 dòng" },
                                { value: 8, label: "2/3 dòng" },
                                { value: 12, label: "Full dòng" },
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
                label: "Filters",
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
                label: "Table columns",
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
