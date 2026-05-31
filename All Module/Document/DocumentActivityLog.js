const { React } = ctx;
const { useState, useEffect } = React;
const { Spin, Empty, Button, Typography, Tag, Avatar } = ctx.antd;
const { Text } = Typography;

// --- SVG ICONS ---
const IconUpload = React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
  React.createElement("polyline", { points: "17 8 12 3 7 8" }),
  React.createElement("line", { x1: 12, y1: 3, x2: 12, y2: 15 })
);

const IconEdit = React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
  React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
);

const IconMove = React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement("polyline", { points: "5 9 2 12 5 15" }),
  React.createElement("polyline", { points: "9 5 12 2 15 5" }),
  React.createElement("polyline", { points: "15 19 12 22 9 19" }),
  React.createElement("polyline", { points: "19 9 22 12 19 15" }),
  React.createElement("line", { x1: 2, y1: 12, x2: 22, y2: 12 }),
  React.createElement("line", { x1: 12, y1: 2, x2: 12, y2: 22 })
);

const IconTrash = React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement("polyline", { points: "3 6 5 6 21 6" }),
  React.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }),
  React.createElement("line", { x1: 10, y1: 11, x2: 10, y2: 17 }),
  React.createElement("line", { x1: 14, y1: 11, x2: 14, y2: 17 })
);

const IconFolder = React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "currentColor", stroke: "none" },
  React.createElement("path", { d: "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" })
);

const IconFile = React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement("path", { d: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" }),
  React.createElement("polyline", { points: "13 2 13 9 20 9" })
);

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const PAGE_SIZE = 20;
const EXCLUDED_FIELDS = ["fileIndex", "folderIndex"];

const ACTION_CONFIG = {
  uploaded: {
    label: "Tải lên",
    color: "#0C447C",
    bg: "#E6F1FB",
    border: "#B5D4F4",
    icon: IconUpload,
  },
  created: {
    label: "Tạo mới",
    color: "#0C447C",
    bg: "#E6F1FB",
    border: "#B5D4F4",
    icon: IconUpload,
  },
  updated: {
    label: "Cập nhật",
    color: "#27500A",
    bg: "#EAF3DE",
    border: "#C0DD97",
    icon: IconEdit,
  },
  moved: {
    label: "Di chuyển",
    color: "#633806",
    bg: "#FAEEDA",
    border: "#FAC775",
    icon: IconMove,
  },
  deleted: {
    label: "Đã xóa",
    color: "#791F1F",
    bg: "#FCEBEB",
    border: "#F7C1C1",
    icon: IconTrash,
  },
};

// Column order: Loại | Người thực hiện | Tài liệu | Mô tả thay đổi | Thời gian
const GRID = "120px 160px 1fr 1fr 150px";

const COLUMNS = [
  { key: "action", label: "Loại" },
  { key: "who", label: "Người thực hiện" },
  { key: "file", label: "Tài liệu" },
  { key: "desc", label: "Mô tả thay đổi" },
  { key: "time", label: "Thời gian" },
];

const AVATAR_PALETTES = [
  ["#EEEDFE", "#3C3489"],
  ["#E1F5EE", "#085041"],
  ["#FAEEDA", "#633806"],
  ["#FAECE7", "#712B13"],
  ["#EAF3DE", "#27500A"],
];

function getAvatarColors(name) {
  const n = name || "";
  return AVATAR_PALETTES[(n.charCodeAt(0) || 0) % AVATAR_PALETTES.length];
}

function getInitials(name) {
  const n = name || "";
  return (
    n
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(-2)
      .join("")
      .toUpperCase() || "?"
  );
}

function AvatarCell({ name }) {
  const [bg, fg] = getAvatarColors(name);
  return React.createElement(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 8 } },
    React.createElement(
      "div",
      {
        style: {
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: bg,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 500,
          color: fg,
        },
      },
      getInitials(name),
    ),
    React.createElement(
      "span",
      {
        style: {
          fontSize: 13,
          color: "#1a1a1a",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
      },
      name || "Hệ thống",
    ),
  );
}

function ActionBadge({ action }) {
  const cfg = ACTION_CONFIG[action] || {
    label: action,
    color: "#444441",
    bg: "#F1EFE8",
    border: "#D3D1C7",
    icon: "🔔",
  };
  return React.createElement(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 99,
        background: cfg.bg,
        border: `0.5px solid ${cfg.border}`,
        fontSize: 12,
        fontWeight: 500,
        color: cfg.color,
        whiteSpace: "nowrap",
      },
    },
    cfg.icon,
    " ",
    cfg.label,
  );
}

function DescCell({ log }) {
  const {
    action,
    fieldName: field,
    oldValue: oldV,
    newValue: newV,
    collectionName,
  } = log;
  let primary = "";
  let secondary = null;

  const isFolder = collectionName === "Folder";
  const entityName = isFolder ? "thư mục" : "tài liệu";

  if (action === "uploaded" || action === "created") {
    primary = isFolder ? "Đã tạo thư mục mới" : "Đã tải lên tài liệu mới";
    if (isFolder && newV) secondary = newV;
  } else if (action === "moved") {
    primary = `Di chuyển ${entityName} sang`;
    secondary = newV || null;
  } else if (action === "deleted") {
    primary = `Đã xóa ${entityName}`;
    secondary = oldV || null;
  } else if (action === "updated") {
    const fieldLabel =
      field === "title" || field === "name" ? "tiêu đề" : field || "nội dung";
    primary = `Cập nhật ${fieldLabel} ${entityName}`;
    if (oldV && newV) secondary = `"${oldV}" → "${newV}"`;
    else if (newV) secondary = newV;
  } else {
    primary = `[${action}] ${entityName}`;
    if (field) secondary = `${field}: ${oldV || ""} → ${newV || ""}`;
  }

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        overflow: "hidden",
      },
    },
    React.createElement(
      "span",
      { style: { fontSize: 13, color: "#1a1a1a" } },
      primary,
    ),
    secondary &&
      React.createElement(
        "span",
        {
          style: {
            fontSize: 12,
            color: "#888",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        secondary,
      ),
  );
}

function FileCell({ log }) {
  const isFolder = log.collectionName === "Folder";
  const name =
    log.resolvedTitle || log.recordTitle || log.newValue || log.oldValue || "—";
  return React.createElement(
    "span",
    {
      style: {
        fontSize: 13,
        color: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        gap: 8,
      },
    },
    React.createElement(
      "span",
      { style: { color: isFolder ? "#faad14" : "#1890ff", flexShrink: 0, display: "flex", alignItems: "center" } },
      isFolder ? IconFolder : IconFile,
    ),
    React.createElement("span", { style: { wordBreak: "break-word" } }, name),
  );
}

function TimeCell({ iso }) {
  if (!iso)
    return React.createElement("span", { style: { color: "#aaa" } }, "—");
  const d = new Date(iso);
  const formatted = d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return React.createElement(
    "span",
    { style: { fontSize: 13, color: "#555", whiteSpace: "nowrap" } },
    formatted,
  );
}

function Pagination({ page, total, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const btn = (label, target, disabled, isActive) =>
    React.createElement(
      "button",
      {
        key: String(label) + String(target),
        onClick: () => !disabled && onChange(target),
        disabled,
        style: {
          minWidth: 32,
          height: 32,
          padding: "0 8px",
          borderRadius: 6,
          border: isActive ? "1px solid #378ADD" : "0.5px solid #d0d0d0",
          background: isActive ? "#E6F1FB" : "transparent",
          color: isActive ? "#0C447C" : disabled ? "#ccc" : "#333",
          fontSize: 13,
          cursor: disabled ? "default" : "pointer",
          fontFamily: FONT,
          fontWeight: isActive ? 500 : 400,
        },
      },
      label,
    );

  // Show: first, prev, current-1, current, current+1, next, last — with ellipsis
  const pageNums = new Set([1, page - 1, page, page + 1, totalPages]);
  const sorted = [...pageNums]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const items = [];
  items.push(btn("‹", page - 1, page === 1, false));
  let prev = null;
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) {
      items.push(
        React.createElement(
          "span",
          {
            key: `ell-${p}`,
            style: {
              padding: "0 4px",
              color: "#aaa",
              fontSize: 13,
              lineHeight: "32px",
            },
          },
          "…",
        ),
      );
    }
    items.push(btn(p, p, false, p === page));
    prev = p;
  }
  items.push(btn("›", page + 1, page === totalPages, false));

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 12,
      },
    },
    React.createElement(
      "span",
      { style: { fontSize: 12, color: "#aaa" } },
      `${start}–${end} / ${total} hoạt động`,
    ),
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 4 } },
      ...items,
    ),
  );
}

const s = {
  wrapper: { fontFamily: FONT, padding: "16px 24px" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: 500, margin: 0, color: "#1a1a1a" },
  subtitle: { fontSize: 12, color: "#888", margin: "3px 0 0" },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    borderRadius: 8,
    border: "0.5px solid #d0d0d0",
    background: "transparent",
    color: "#333",
    fontFamily: FONT,
  },
  tableWrap: {
    border: "0.5px solid #e0e0e0",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
  },
  thead: {
    display: "grid",
    gridTemplateColumns: GRID,
    borderBottom: "0.5px solid #e0e0e0",
    background: "#f7f7f7",
  },
  th: {
    padding: "9px 14px",
    fontSize: 11,
    fontWeight: 500,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  row: (isLast) => ({
    display: "grid",
    gridTemplateColumns: GRID,
    borderBottom: isLast ? "none" : "0.5px solid #f0f0f0",
  }),
  td: {
    padding: "11px 14px",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  },
  lastUpd: {
    fontSize: 11,
    color: "#aaa",
    textAlign: "right",
    margin: "4px 0 0",
  },
};

const DocumentActivityLog = ({ recordId = null, collectionName = null }) => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const filter = {};
      if (collectionName) {
        filter.collectionName = { $eq: collectionName };
      } else {
        filter.collectionName = { $in: ["Document", "Folder"] };
      }
      if (recordId) filter.recordId = { $eq: recordId };

      const res = await ctx.api.request({
        url: "activity_log:list",
        params: {
          pageSize: 1000,
          sort: ["-changedAt"],
          filter: JSON.stringify(filter),
        },
      });

      // Filter out excluded fieldNames client-side
      const raw = res?.data?.data || [];

      // Build recordId -> title map from records that carry the title field
      const titleMap = {};
      for (const log of raw) {
        if (log.fieldName === "title" && log.newValue && log.recordId) {
          titleMap[log.recordId] = log.newValue;
        }
      }

      // Inject resolvedTitle into every log entry
      const filtered = raw
        .filter((log) => !EXCLUDED_FIELDS.includes(log.fieldName))
        .map((log) => ({
          ...log,
          resolvedTitle: titleMap[log.recordId] || null,
        }));

      setLogs(filtered);
      setLastUpdated(new Date());
      setPage(1);
    } catch (e) {
      console.error("Failed to fetch document logs:", e);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [recordId]);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const pageLogs = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fmtDate = (d) =>
    d
      ? d.toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";

  return React.createElement(
    "div",
    { style: s.wrapper },

    // ── Header ──────────────────────────────────────────────
    React.createElement(
      "div",
      { style: s.header },
      React.createElement(
        "div",
        null,
        React.createElement("p", { style: s.title }, "Lịch sử hoạt động"),
        React.createElement(
          "p",
          { style: s.subtitle },
          loading ? "Đang tải..." : `${logs.length} hoạt động`,
        ),
      ),
      React.createElement(
        "button",
        {
          onClick: handleRefresh,
          disabled: refreshing || loading,
          style: { ...s.refreshBtn, opacity: refreshing || loading ? 0.6 : 1 },
        },
        React.createElement(
          "span",
          {
            style: {
              display: "inline-block",
              fontSize: 14,
              transition: "transform 0.7s linear",
              transform: refreshing ? "rotate(360deg)" : "rotate(0deg)",
            },
          },
          "↻",
        ),
        refreshing ? "Đang làm mới..." : "Làm mới",
      ),
    ),

    // ── Loading ──────────────────────────────────────────────
    loading &&
      React.createElement(
        "div",
        { style: { padding: "40px 0", textAlign: "center" } },
        React.createElement(Spin),
      ),

    // ── Empty ────────────────────────────────────────────────
    !loading &&
      logs.length === 0 &&
      React.createElement(Empty, {
        description: "Chưa có lịch sử hoạt động",
        style: { padding: "40px 0" },
      }),

    // ── Table ────────────────────────────────────────────────
    !loading &&
      logs.length > 0 &&
      React.createElement(
        "div",
        { style: s.tableWrap },

        // Head
        React.createElement(
          "div",
          { style: s.thead },
          COLUMNS.map((col) =>
            React.createElement(
              "div",
              { key: col.key, style: s.th },
              col.label,
            ),
          ),
        ),

        // Body
        React.createElement(
          "div",
          null,
          pageLogs.map((log, i) =>
            React.createElement(
              "div",
              { key: log.id, style: s.row(i === pageLogs.length - 1) },
              React.createElement(
                "div",
                { style: s.td },
                React.createElement(ActionBadge, { action: log.action }),
              ),
              React.createElement(
                "div",
                { style: s.td },
                React.createElement(AvatarCell, { name: log.changedByName }),
              ),
              React.createElement(
                "div",
                { style: s.td },
                React.createElement(FileCell, { log }),
              ),
              React.createElement(
                "div",
                { style: s.td },
                React.createElement(DescCell, { log }),
              ),
              React.createElement(
                "div",
                { style: s.td },
                React.createElement(TimeCell, { iso: log.changedAt }),
              ),
            ),
          ),
        ),
      ),

    // ── Pagination ───────────────────────────────────────────
    !loading &&
      logs.length > 0 &&
      React.createElement(Pagination, {
        page,
        total: logs.length,
        totalPages,
        onChange: setPage,
      }),

    // ── Last updated ─────────────────────────────────────────
    !loading &&
      lastUpdated &&
      React.createElement(
        "p",
        { style: s.lastUpd },
        "Cập nhật lúc " + fmtDate(lastUpdated),
      ),
  );
};

window.DocumentActivityLog = DocumentActivityLog;
ctx.render(React.createElement(DocumentActivityLog, null));
