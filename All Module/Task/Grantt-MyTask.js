// ═══════════════════════════════════════════════════════════════════
// GANTT VIEW — JS Block độc lập, phân quyền theo role
//
// • root / admin  → xem toàn bộ task của mọi luật sư
//                   nhóm theo: Project → Luật sư → Task
//                   có dropdown lọc từng luật sư
// • lawyer / khác → chỉ xem task được phân công cho mình
//                   nhóm theo: Project → Task
//
// Paste toàn bộ file vào 1 JS block mới, không cần block cũ.
// ═══════════════════════════════════════════════════════════════════

const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef, memo } = React;
const { Spin, Typography, message } = ctx.antd;
const { Text } = Typography;

// ─── Tokens ───────────────────────────────────────────────────────
const G_FONT =
  "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const G_STATUS = {
  toDo: {
    label: "Chưa làm",
    color: "#595959",
    bg: "#f5f5f5",
    border: "#d9d9d9",
    bar: "#B4B2A9",
  },
  inProgress: {
    label: "Đang xử lý",
    color: "#1890ff",
    bg: "#e6f4ff",
    border: "#91caff",
    bar: "#378ADD",
  },
  blocked: {
    label: "Bị chặn",
    color: "#722ed1",
    bg: "#f9f0ff",
    border: "#d3adf7",
    bar: "#7F77DD",
  },
  pending: {
    label: "Chờ duyệt",
    color: "#d46b08",
    bg: "#fff7e6",
    border: "#ffd591",
    bar: "#EF9F27",
  },
  approval: {
    label: "Đã phê duyệt",
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
    bar: "#52c41a",
  },
  done: {
    label: "Hoàn thành",
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
    bar: "#639922",
  },
  cancelled: {
    label: "Đã huỷ",
    color: "#cf1322",
    bg: "#fff1f0",
    border: "#ffa39e",
    bar: "#E24B4A",
  },
};

const G_PRIORITY = {
  high: { label: "Cao", color: "#cf1322", bg: "#fff1f0", icon: "↑↑" },
  medium: { label: "Trung", color: "#d46b08", bg: "#fff7e6", icon: "↑" },
  low: { label: "Thấp", color: "#389e0d", bg: "#f6ffed", icon: "↓" },
};

const G_LAWYER_COLORS = [
  "#531dab",
  "#096dd9",
  "#08979c",
  "#237804",
  "#d46b08",
  "#9e1068",
  "#a8071a",
  "#003a8c",
  "#006d75",
  "#874d00",
  "#135200",
  "#002c8c",
];

const G_ZOOM = {
  week: { dayW: 52, label: "Tuần" },
  month: { dayW: 28, label: "Tháng" },
  quarter: { dayW: 14, label: "Quý" },
};

const G_LEFT_W = 300;
const G_ROW_H = 40;
const G_GRP_H = 38;
const G_LAW_H = 36;
const G_HDR_H = 42;

const MONTH_FULL = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
const MONTH_SHORT = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];

const LAWYER_TYPE_LABEL = {
  partner: "Luật sư đối tác",
  lawyer: "Luật sư",
  associate: "Luật sư cộng sự",
  suppliant: "Trợ lý pháp lý",
};

const PROJECT_PALETTE = [
  "#1890ff",
  "#531dab",
  "#08979c",
  "#237804",
  "#d46b08",
  "#9e1068",
  "#a8071a",
  "#003a8c",
];

// ─── Phân quyền ───────────────────────────────────────────────────
// NocoDB/NocoBase trả roles dưới nhiều dạng — cover cả 3:
//   object: { root:true }  |  array: ['admin']  |  string: 'root'
const gIsAdmin = (user) => {
  if (!user) return false;
  const r = user.roles;
  if (!r) return false;
  const ADMIN_ROLES = ["root", "admin", "owner", "super"];
  if (typeof r === "object" && !Array.isArray(r))
    return ADMIN_ROLES.some((k) => r[k]);
  if (Array.isArray(r))
    return r.some((x) => ADMIN_ROLES.includes(String(x).toLowerCase()));
  return ADMIN_ROLES.includes(String(r).toLowerCase());
};

// ─── Utilities ────────────────────────────────────────────────────
const gFmt = (iso, mode) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const dd = String(d.getDate()).padStart(2, "0"),
    mm = String(d.getMonth() + 1).padStart(2, "0"),
    yy = d.getFullYear(),
    hh = String(d.getHours()).padStart(2, "0"),
    mi = String(d.getMinutes()).padStart(2, "0");
  if (mode === "full") return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  if (mode === "date") return `${dd}/${mm}/${yy}`;
  return `${dd}/${mm}`;
};
const gIsOD = (iso, st) =>
  iso && !["done", "cancelled"].includes(st) && new Date(iso) < new Date();
const gIsToday = (iso) => {
  if (!iso) return false;
  const d = new Date(iso),
    n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
};
const gFmtH = (h) => {
  if (!h && h !== 0) return "—";
  const hr = Math.floor(h),
    mn = Math.round((h - hr) * 60);
  if (hr === 0) return `${mn}p`;
  if (mn === 0) return `${hr}g`;
  return `${hr}g ${mn}p`;
};
const gSod = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const gDayX = (iso, start, dw) => {
  if (!iso) return null;
  return Math.round((gSod(new Date(iso)) - gSod(start)) / 86400000) * dw;
};
const gGetDays = (s, e) => {
  const days = [],
    d = new Date(gSod(s)),
    end = gSod(e);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
};
const gMonths = (days, dw) => {
  const out = [];
  let cur = -1,
    cnt = 0;
  days.forEach((d) => {
    const m = d.getMonth();
    if (m !== cur) {
      if (cur !== -1)
        out.push({
          label: MONTH_FULL[cur],
          short: MONTH_SHORT[cur],
          w: cnt * dw,
        });
      cur = m;
      cnt = 1;
    } else cnt++;
  });
  if (cur !== -1)
    out.push({ label: MONTH_FULL[cur], short: MONTH_SHORT[cur], w: cnt * dw });
  return out;
};

// ─── API ──────────────────────────────────────────────────────────
async function gFetchAll(url, fields, filter) {
  try {
    const p = { pageSize: 500, page: 1 };
    if (fields) p.fields = fields;
    if (filter) p.filter = JSON.stringify(filter);
    const r = await ctx.api.request({ url, params: p });
    return r?.data?.data || [];
  } catch {
    return [];
  }
}
async function gGetUser() {
  try {
    const r = await ctx.api.request({ url: "auth:check", method: "GET" });
    return r?.data?.data || r?.data || null;
  } catch {
    return null;
  }
}

// ─── Shared UI ────────────────────────────────────────────────────
const GAv = ({ name, color, size = 20 }) =>
  React.createElement(
    "div",
    {
      title: name,
      style: {
        width: size,
        height: size,
        borderRadius: "50%",
        background: color || "#8c8c8c",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        color: "#fff",
        fontWeight: 700,
        flexShrink: 0,
      },
    },
    (name || "?").charAt(0).toUpperCase(),
  );

const GSBadge = ({ status }) => {
  const c = G_STATUS[status] || G_STATUS.toDo;
  return React.createElement(
    "span",
    {
      style: {
        fontSize: 10,
        fontFamily: G_FONT,
        fontWeight: 600,
        padding: "1px 7px",
        borderRadius: 3,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
        flexShrink: 0,
      },
    },
    c.label,
  );
};

const GStatCard = ({ icon, label, value, color, bg }) =>
  React.createElement(
    "div",
    {
      style: {
        background: bg || "#f5f5f5",
        borderRadius: 8,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        border: `1px solid ${color}33`,
        flexShrink: 0,
      },
    },
    React.createElement("span", { style: { fontSize: 18 } }, icon),
    React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        {
          style: {
            fontSize: 18,
            fontFamily: G_FONT,
            fontWeight: 700,
            color,
            lineHeight: 1,
          },
        },
        value,
      ),
      React.createElement(
        "div",
        {
          style: {
            fontSize: 11,
            fontFamily: G_FONT,
            color: "#8c8c8c",
            marginTop: 2,
          },
        },
        label,
      ),
    ),
  );

// ─── Tooltip ──────────────────────────────────────────────────────
const GTooltip = ({ data, x, y }) => {
  if (!data) return null;
  const st = G_STATUS[data.status] || G_STATUS.toDo,
    pr = data.priority ? G_PRIORITY[data.priority] : null,
    od = gIsOD(data.end, data.status);
  return React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        left: x + 14,
        top: y - 10,
        zIndex: 99999,
        background: "#1f1f1f",
        color: "#fff",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
        fontFamily: G_FONT,
        pointerEvents: "none",
        maxWidth: 260,
        boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
        lineHeight: 1.7,
        border: "1px solid rgba(255,255,255,0.08)",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          fontWeight: 700,
          fontSize: 13,
          color: "#fff",
          marginBottom: 6,
          lineHeight: 1.4,
        },
      },
      data.name,
    ),
    React.createElement(
      "div",
      { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 } },
      React.createElement(
        "span",
        {
          style: {
            fontSize: 10,
            background: st.bg,
            color: st.color,
            border: `1px solid ${st.border}`,
            padding: "1px 7px",
            borderRadius: 3,
          },
        },
        st.label,
      ),
      pr &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 10,
              background: pr.bg,
              color: pr.color,
              padding: "1px 7px",
              borderRadius: 3,
            },
          },
          `${pr.icon} ${pr.label}`,
        ),
      od &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 10,
              background: "#fff1f0",
              color: "#cf1322",
              border: "1px solid #ffa39e",
              padding: "1px 7px",
              borderRadius: 3,
            },
          },
          "⚠ Quá hạn",
        ),
    ),
    data.start &&
      React.createElement(
        "div",
        { style: { fontSize: 11, color: "#bfbfbf" } },
        `📅 ${gFmt(data.start, "date")} → ${gFmt(data.end, "date")}`,
      ),
    data.estimatedDuration > 0 &&
      React.createElement(
        "div",
        { style: { fontSize: 11, color: "#bfbfbf" } },
        `⏱ ${gFmtH(data.estimatedDuration)}`,
      ),
    data.lawyer &&
      React.createElement(
        "div",
        { style: { fontSize: 11, color: "#91caff", marginTop: 2 } },
        `👤 ${data.lawyer}`,
      ),
  );
};

// ─── Bar ──────────────────────────────────────────────────────────
const GBar = memo(({ row, isSub, startDate, dayW, onHover, onClick }) => {
  const start = isSub ? row.date : row.startDate,
    end = isSub ? row.deadline : row.dueDate;
  const st = G_STATUS[row.status] || G_STATUS.toDo,
    od = gIsOD(end, row.status);
  const x1 = gDayX(start, startDate, dayW),
    x2 = gDayX(end, startDate, dayW);
  if (x1 === null && x2 === null) return null;
  const left = x1 !== null ? x1 : Math.max(0, x2 - dayW * 2),
    right = x2 !== null ? x2 + dayW : left + dayW * 2;
  const w = Math.max(right - left, isSub ? dayW * 0.8 : dayW);
  const barH = isSub ? 10 : 16,
    topOff = (G_ROW_H - barH) / 2;
  const prog =
    row.status === "done" ? 100 : row.status === "inProgress" ? 55 : 0;
  return React.createElement(
    "div",
    {
      onClick: (e) => {
        e.stopPropagation();
        onClick(row);
      },
      onMouseEnter: (e) =>
        onHover({
          data: {
            name: isSub ? row.subTaskName : row.title,
            status: row.status,
            priority: row.priority,
            start,
            end,
            estimatedDuration: row.estimatedDuration,
            lawyer: row._lawyerName,
          },
          x: e.clientX,
          y: e.clientY,
        }),
      onMouseLeave: () => onHover(null),
      onMouseMove: (e) =>
        onHover((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : null)),
      style: {
        position: "absolute",
        left,
        top: topOff,
        width: w,
        height: barH,
        borderRadius: isSub ? 3 : 4,
        background: st.bar,
        cursor: "pointer",
        outline: od ? "2px solid #E24B4A" : "none",
        outlineOffset: 1,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      },
    },
    prog > 0 &&
      React.createElement("div", {
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: `${prog}%`,
          background: "rgba(255,255,255,0.28)",
          pointerEvents: "none",
        },
      }),
    !isSub &&
      w > 44 &&
      prog > 0 &&
      React.createElement(
        "span",
        {
          style: {
            position: "relative",
            zIndex: 1,
            fontSize: 9,
            color: "#fff",
            paddingLeft: 5,
            fontWeight: 700,
            pointerEvents: "none",
          },
        },
        `${prog}%`,
      ),
  );
});

// ─── Left cell ────────────────────────────────────────────────────
const GLeftCell = memo(
  ({ row, depth, isExpanded, hasChildren, onToggle, onClick }) => {
    const isSub = row._type === "subtask",
      name = isSub ? row.subTaskName : row.title;
    const dl = isSub ? row.deadline : row.dueDate,
      od = gIsOD(dl, row.status);
    const pr = row.priority ? G_PRIORITY[row.priority] : null;
    const [hov, setHov] = useState(false);
    return React.createElement(
      "div",
      {
        onClick: () => (hasChildren ? onToggle() : onClick(row)),
        onMouseEnter: () => setHov(true),
        onMouseLeave: () => setHov(false),
        style: {
          height: G_ROW_H,
          display: "flex",
          alignItems: "center",
          padding: `0 8px 0 ${12 + depth * 18}px`,
          gap: 6,
          borderBottom: "1px solid #f0f0f0",
          background: hov ? "#f0f7ff" : "#fff",
          cursor: "pointer",
          transition: "background .1s",
        },
      },
      hasChildren
        ? React.createElement(
            "span",
            {
              style: {
                fontSize: 9,
                color: "#8c8c8c",
                flexShrink: 0,
                display: "inline-block",
                transition: "transform .15s",
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              },
            },
            "▶",
          )
        : React.createElement("div", { style: { width: 9, flexShrink: 0 } }),
      pr
        ? React.createElement("div", {
            title: pr.label,
            style: {
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: pr.color,
              flexShrink: 0,
            },
          })
        : React.createElement("div", { style: { width: 6, flexShrink: 0 } }),
      React.createElement(
        "span",
        {
          style: {
            fontSize: isSub ? 11 : 12,
            fontFamily: G_FONT,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color:
              row.status === "done" ? "#bfbfbf" : od ? "#cf1322" : "#1a1a1a",
            textDecoration: row.status === "done" ? "line-through" : "none",
            fontWeight: isSub ? 400 : 500,
          },
        },
        name,
      ),
      dl &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 10,
              fontFamily: G_FONT,
              flexShrink: 0,
              color: od ? "#cf1322" : gIsToday(dl) ? "#d46b08" : "#bfbfbf",
              fontWeight: od || gIsToday(dl) ? 600 : 400,
              whiteSpace: "nowrap",
            },
          },
          gFmt(dl, "date"),
        ),
      row._lawyerName &&
        React.createElement(GAv, {
          name: row._lawyerName,
          color: row._lawColor,
          size: 18,
        }),
    );
  },
);

// ─── Right cell ───────────────────────────────────────────────────
const GRightCell = memo(
  ({ row, isSub, startDate, dayW, todayX, gridLines, onHover, onClick }) =>
    React.createElement(
      "div",
      {
        style: {
          height: G_ROW_H,
          position: "relative",
          borderBottom: "1px solid #f0f0f0",
          background: "#fff",
        },
      },
      gridLines,
      React.createElement("div", {
        style: {
          position: "absolute",
          left: todayX,
          top: 0,
          width: 1.5,
          height: "100%",
          background: "rgba(227,75,74,0.22)",
          pointerEvents: "none",
        },
      }),
      React.createElement(GBar, {
        row,
        isSub,
        startDate,
        dayW,
        onHover,
        onClick,
      }),
    ),
);

// ─── Detail modal ─────────────────────────────────────────────────
const GDetailModal = ({ item, onClose }) => {
  if (!item) return null;
  const isSub = item._type === "subtask",
    name = isSub ? item.subTaskName : item.title;
  const start = isSub ? item.date : item.startDate,
    end = isSub ? item.deadline : item.dueDate;
  const od = gIsOD(end, item.status),
    pr = item.priority ? G_PRIORITY[item.priority] : null;
  const Row = ({ label, children }) =>
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "flex-start",
          padding: "8px 0",
          borderBottom: "1px solid #f5f5f5",
          gap: 12,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: 120,
            flexShrink: 0,
            fontSize: 11,
            fontFamily: G_FONT,
            color: "#8c8c8c",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            paddingTop: 2,
          },
        },
        label,
      ),
      React.createElement(
        "div",
        {
          style: {
            flex: 1,
            fontSize: 13,
            fontFamily: G_FONT,
            color: "#1a1a1a",
          },
        },
        children,
      ),
    );
  return React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 99990,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      onClick: onClose,
    },
    React.createElement("div", {
      style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" },
    }),
    React.createElement(
      "div",
      {
        onClick: (e) => e.stopPropagation(),
        style: {
          position: "relative",
          background: "#fff",
          borderRadius: 10,
          padding: "20px 24px",
          width: 480,
          maxWidth: "90vw",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 12px 48px rgba(0,0,0,0.25)",
          zIndex: 1,
          fontFamily: G_FONT,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: "1px solid #f0f0f0",
          },
        },
        React.createElement(
          "div",
          { style: { flex: 1 } },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
                flexWrap: "wrap",
              },
            },
            React.createElement(GSBadge, { status: item.status }),
            isSub &&
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 10,
                    padding: "1px 7px",
                    borderRadius: 3,
                    background: "#f9f0ff",
                    color: "#531dab",
                    border: "1px solid #d3adf7",
                  },
                },
                "↳ CV phụ",
              ),
            od &&
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 10,
                    padding: "1px 7px",
                    borderRadius: 3,
                    background: "#fff1f0",
                    color: "#cf1322",
                    border: "1px solid #ffa39e",
                    fontWeight: 600,
                  },
                },
                "⚠ Quá hạn",
              ),
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: 16,
                fontWeight: 700,
                color: "#1a1a1a",
                lineHeight: 1.4,
              },
            },
            name,
          ),
        ),
        React.createElement(
          "div",
          {
            onClick: onClose,
            style: {
              fontSize: 18,
              color: "#8c8c8c",
              cursor: "pointer",
              lineHeight: 1,
              padding: "0 4px",
            },
          },
          "×",
        ),
      ),
      pr &&
        React.createElement(
          Row,
          { label: "⚡ Ưu tiên" },
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                background: pr.bg,
                color: pr.color,
                padding: "2px 9px",
                borderRadius: 4,
              },
            },
            `${pr.icon} ${pr.label}`,
          ),
        ),
      item._lawyerName &&
        React.createElement(
          Row,
          { label: "👤 Luật sư" },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 6 } },
            React.createElement(GAv, {
              name: item._lawyerName,
              color: item._lawColor,
              size: 20,
            }),
            item._lawyerName,
          ),
        ),
      React.createElement(
        Row,
        { label: "📅 Bắt đầu" },
        start
          ? gFmt(start, "full")
          : React.createElement("span", { style: { color: "#bfbfbf" } }, "—"),
      ),
      React.createElement(
        Row,
        { label: "🏁 Deadline" },
        React.createElement(
          "span",
          {
            style: {
              color: od ? "#cf1322" : "#1a1a1a",
              fontWeight: od ? 600 : 400,
            },
          },
          end ? gFmt(end, "full") : "—",
        ),
      ),
      item.closedDate &&
        React.createElement(
          Row,
          { label: "✅ Hoàn thành" },
          React.createElement(
            "span",
            { style: { color: "#389e0d" } },
            gFmt(item.closedDate, "full"),
          ),
        ),
      item.estimatedDuration > 0 &&
        React.createElement(
          Row,
          { label: "⏱ Dự kiến" },
          gFmtH(item.estimatedDuration),
        ),
      (item._caseCode || item._projectName) &&
        React.createElement(
          Row,
          { label: "📁 Vụ việc" },
          [item._caseCode, item._projectName].filter(Boolean).join(" — "),
        ),
      item._serviceName &&
        React.createElement(Row, { label: "🔧 Dịch vụ" }, item._serviceName),
      item.description &&
        React.createElement(
          Row,
          { label: "📝 Mô tả" },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                color: "#595959",
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
              },
            },
            item.description,
          ),
        ),
      item.nextStepDescription &&
        React.createElement(
          Row,
          { label: "👣 Next step" },
          React.createElement(
            "div",
            { style: { fontSize: 12, color: "#096dd9", lineHeight: 1.7 } },
            item.nextStepDescription,
          ),
        ),
      React.createElement(
        "div",
        {
          style: {
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid #f0f0f0",
            fontSize: 11,
            color: "#bfbfbf",
            textAlign: "center",
          },
        },
        "Mở block Task Manager để chỉnh sửa chi tiết",
      ),
    ),
  );
};

// ─── Gantt chart ──────────────────────────────────────────────────
const GanttChart = ({
  grouped,
  startDate,
  allDays,
  dayW,
  totalW,
  onOpen,
  isAdminMode,
}) => {
  const [collapsed, setCollapsed] = useState({});
  const [tooltip, setTooltip] = useState(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const headerRef = useRef(null);

  const today = gSod(new Date());
  const todayX = (gDayX(today, startDate, dayW) || 0) + dayW / 2;
  const months = useMemo(() => gMonths(allDays, dayW), [allDays, dayW]);

  const tog = (key) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));
  const setTip = useCallback(
    (v) => setTooltip(typeof v === "function" ? v(tooltip) : v),
    [tooltip],
  );

  const onRightScroll = (e) => {
    if (headerRef.current)
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    if (leftRef.current) leftRef.current.scrollTop = e.currentTarget.scrollTop;
  };
  const onLeftScroll = (e) => {
    if (rightRef.current)
      rightRef.current.scrollTop = e.currentTarget.scrollTop;
  };

  const gridLines = useMemo(
    () =>
      allDays.map((d, i) => {
        const wk = d.getDay() === 0 || d.getDay() === 6;
        return wk
          ? React.createElement("div", {
              key: i,
              style: {
                position: "absolute",
                left: i * dayW,
                top: 0,
                width: dayW,
                height: "100%",
                background: "rgba(0,0,0,0.022)",
                pointerEvents: "none",
              },
            })
          : React.createElement("div", {
              key: i,
              style: {
                position: "absolute",
                left: (i + 1) * dayW - 0.5,
                top: 0,
                width: 0.5,
                height: "100%",
                background: "#f0f0f0",
                pointerEvents: "none",
              },
            });
      }),
    [allDays, dayW],
  );

  const mkGroupRow = (key, label, color, badge, depth = 0) => {
    const c = !!collapsed[key];
    const pl = 12 + depth * 14;
    return [
      React.createElement(
        "div",
        {
          key: `gl_${key}`,
          onClick: () => tog(key),
          style: {
            height: G_GRP_H,
            display: "flex",
            alignItems: "center",
            padding: `0 8px 0 ${pl}px`,
            gap: 8,
            background: depth > 0 ? "#fafbff" : "#f5f7fb",
            borderBottom: "1px solid #e4e8ef",
            borderLeft: `3px solid ${color}`,
            cursor: "pointer",
          },
          onMouseEnter: (e) =>
            (e.currentTarget.style.background =
              depth > 0 ? "#f0f5ff" : "#eaf2ff"),
          onMouseLeave: (e) =>
            (e.currentTarget.style.background =
              depth > 0 ? "#fafbff" : "#f5f7fb"),
        },
        React.createElement(
          "span",
          {
            style: {
              fontSize: 9,
              color,
              display: "inline-block",
              transition: "transform .15s",
              transform: c ? "rotate(-90deg)" : "rotate(0deg)",
            },
          },
          "▼",
        ),
        badge &&
          React.createElement(GAv, {
            name: badge.name,
            color: badge.color,
            size: 22,
          }),
        React.createElement(
          "span",
          {
            style: {
              fontSize: depth > 0 ? 12 : 12,
              fontFamily: G_FONT,
              fontWeight: 700,
              color: "#1a1a1a",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
          label,
        ),
        badge &&
          React.createElement(
            "span",
            {
              style: {
                fontSize: 10,
                fontFamily: G_FONT,
                color,
                background: `${color}18`,
                borderRadius: 10,
                padding: "1px 7px",
                flexShrink: 0,
              },
            },
            badge.typeLabel,
          ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 10,
              fontFamily: G_FONT,
              background: "#e6f4ff",
              color: "#096dd9",
              borderRadius: 10,
              padding: "1px 7px",
              flexShrink: 0,
            },
          },
          badge?.count !== undefined ? `${badge.count} task` : undefined,
        ),
      ),
      React.createElement(
        "div",
        {
          key: `gr_${key}`,
          style: {
            height: G_GRP_H,
            position: "relative",
            background: depth > 0 ? "#fafbff" : "#f5f7fb",
            borderBottom: "1px solid #e4e8ef",
          },
        },
        gridLines,
        React.createElement("div", {
          style: {
            position: "absolute",
            left: todayX,
            top: 0,
            width: 1.5,
            height: "100%",
            background: "rgba(227,75,74,0.4)",
            pointerEvents: "none",
          },
        }),
      ),
      c, // isCollapsed — caller checks this
    ];
  };

  const leftCells = [],
    rightCells = [];

  grouped.forEach(([pk, pg]) => {
    const [gl, gr, grpC] = mkGroupRow(pk, pg.label, pg.color, undefined);
    leftCells.push(gl);
    rightCells.push(gr);
    if (grpC) return;

    if (isAdminMode) {
      // Project → Lawyer → Task → Sub
      pg.lawyers.forEach(({ lawyer, tasks }) => {
        const lwKey = `lw_${lawyer.id}_${pk}`;
        const [ll, lr, lawC] = mkGroupRow(
          lwKey,
          lawyer.lawyerName,
          lawyer._color,
          {
            name: lawyer.lawyerName,
            color: lawyer._color,
            typeLabel:
              LAWYER_TYPE_LABEL[lawyer.lawyerType] ||
              lawyer.lawyerType ||
              "Luật sư",
            count: tasks.length,
          },
          1,
        );
        leftCells.push(ll);
        rightCells.push(lr);
        if (lawC) return;

        tasks.forEach((t) => {
          const hasSubs = t._subs.length > 0,
            tC = !!collapsed[`t_${t.id}`];
          leftCells.push(
            React.createElement(GLeftCell, {
              key: `tl_${t.id}`,
              row: t,
              depth: 2,
              isExpanded: !tC,
              hasChildren: hasSubs,
              onToggle: () => tog(`t_${t.id}`),
              onClick: onOpen,
            }),
          );
          rightCells.push(
            React.createElement(GRightCell, {
              key: `tr_${t.id}`,
              row: t,
              isSub: false,
              startDate,
              dayW,
              todayX,
              gridLines,
              onHover: setTip,
              onClick: onOpen,
            }),
          );
          if (!tC)
            t._subs.forEach((s) => {
              leftCells.push(
                React.createElement(GLeftCell, {
                  key: `sl_${s.id}`,
                  row: s,
                  depth: 3,
                  isExpanded: false,
                  hasChildren: false,
                  onToggle: null,
                  onClick: onOpen,
                }),
              );
              rightCells.push(
                React.createElement(GRightCell, {
                  key: `sr_${s.id}`,
                  row: s,
                  isSub: true,
                  startDate,
                  dayW,
                  todayX,
                  gridLines,
                  onHover: setTip,
                  onClick: onOpen,
                }),
              );
            });
        });
      });
    } else {
      // Project → Task → Sub
      pg.tasks.forEach((t) => {
        const hasSubs = t._subs.length > 0,
          tC = !!collapsed[`t_${t.id}`];
        leftCells.push(
          React.createElement(GLeftCell, {
            key: `tl_${t.id}`,
            row: t,
            depth: 1,
            isExpanded: !tC,
            hasChildren: hasSubs,
            onToggle: () => tog(`t_${t.id}`),
            onClick: onOpen,
          }),
        );
        rightCells.push(
          React.createElement(GRightCell, {
            key: `tr_${t.id}`,
            row: t,
            isSub: false,
            startDate,
            dayW,
            todayX,
            gridLines,
            onHover: setTip,
            onClick: onOpen,
          }),
        );
        if (!tC)
          t._subs.forEach((s) => {
            leftCells.push(
              React.createElement(GLeftCell, {
                key: `sl_${s.id}`,
                row: s,
                depth: 2,
                isExpanded: false,
                hasChildren: false,
                onToggle: null,
                onClick: onOpen,
              }),
            );
            rightCells.push(
              React.createElement(GRightCell, {
                key: `sr_${s.id}`,
                row: s,
                isSub: true,
                startDate,
                dayW,
                todayX,
                gridLines,
                onHover: setTip,
                onClick: onOpen,
              }),
            );
          });
      });
    }
  });

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      },
    },
    // header
    React.createElement(
      "div",
      { style: { display: "flex", flexShrink: 0 } },
      React.createElement(
        "div",
        {
          style: {
            width: G_LEFT_W,
            flexShrink: 0,
            height: G_HDR_H,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            background: "#fafafa",
            borderBottom: "1px solid #e8e8e8",
            borderRight: "1px solid #e8e8e8",
            fontSize: 11,
            fontFamily: G_FONT,
            fontWeight: 700,
            color: "#8c8c8c",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          },
        },
        "Công việc",
      ),
      React.createElement(
        "div",
        {
          style: {
            flex: 1,
            overflow: "hidden",
            height: G_HDR_H,
            background: "#fafafa",
            borderBottom: "1px solid #e8e8e8",
          },
        },
        React.createElement(
          "div",
          { ref: headerRef, style: { overflowX: "hidden", height: "100%" } },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                width: totalW,
                height: 20,
                borderBottom: "0.5px solid #ebebeb",
              },
            },
            months.map((m, i) =>
              React.createElement(
                "div",
                {
                  key: i,
                  style: {
                    width: m.w,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 8px",
                    fontSize: 11,
                    fontFamily: G_FONT,
                    fontWeight: 600,
                    color: "#595959",
                    borderRight: "0.5px solid #e8e8e8",
                    overflow: "hidden",
                  },
                },
                m.w > 50 ? m.label : m.short,
              ),
            ),
          ),
          React.createElement(
            "div",
            { style: { display: "flex", width: totalW, height: 22 } },
            allDays.map((d, i) => {
              const wk = d.getDay() === 0 || d.getDay() === 6,
                td = d.toDateString() === today.toDateString();
              return React.createElement(
                "div",
                {
                  key: i,
                  style: {
                    width: dayW,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontFamily: G_FONT,
                    background: td ? "#ff4d4f" : wk ? "#f5f5f5" : "transparent",
                    color: td ? "#fff" : wk ? "#bfbfbf" : "#8c8c8c",
                    fontWeight: td ? 700 : 400,
                    borderRight: "0.5px solid #f0f0f0",
                  },
                },
                dayW >= 20
                  ? d.getDate()
                  : d.getDate() % 5 === 0
                    ? d.getDate()
                    : "",
              );
            }),
          ),
        ),
      ),
    ),
    // body
    React.createElement(
      "div",
      { style: { flex: 1, display: "flex", overflow: "hidden" } },
      React.createElement(
        "div",
        {
          ref: leftRef,
          onScroll: onLeftScroll,
          style: {
            width: G_LEFT_W,
            flexShrink: 0,
            overflowY: "auto",
            overflowX: "hidden",
            borderRight: "1px solid #e8e8e8",
          },
        },
        ...leftCells,
      ),
      React.createElement(
        "div",
        {
          ref: rightRef,
          onScroll: onRightScroll,
          style: { flex: 1, overflowY: "auto", overflowX: "auto" },
        },
        React.createElement(
          "div",
          { style: { width: totalW, position: "relative" } },
          React.createElement("div", {
            style: {
              position: "absolute",
              left: todayX,
              top: 0,
              width: 1.5,
              height: "100%",
              background: "rgba(227,75,74,0.1)",
              zIndex: 4,
              pointerEvents: "none",
            },
          }),
          ...rightCells,
        ),
      ),
    ),
    tooltip &&
      React.createElement(GTooltip, {
        data: tooltip.data,
        x: tooltip.x,
        y: tooltip.y,
      }),
  );
};

// ─── Main ─────────────────────────────────────────────────────────
const GanttView = () => {
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState("month");
  const [detail, setDetail] = useState(null);
  const [stFilter, setStFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [lawyerFilter, setLawyerFilter] = useState("all");

  const [allTasks, setAllTasks] = useState([]);
  const [allSubs, setAllSubs] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myLawyer, setMyLawyer] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const scrollRef = useRef(null);

  // ── load ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const user = await gGetUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setCurrentUser(user);

    const admin = gIsAdmin(user);
    setIsAdmin(admin);

    const lawyersRaw = await gFetchAll(
      "lawyers:list",
      "id,lawyerName,unitPrice,lawyerType,userId",
    );
    const coloredLawyers = lawyersRaw.map((l, i) => ({
      ...l,
      _color: G_LAWYER_COLORS[i % G_LAWYER_COLORS.length],
    }));
    setLawyers(coloredLawyers);

    const lwColorMap = {};
    coloredLawyers.forEach((l) => {
      lwColorMap[String(l.id)] = { name: l.lawyerName, color: l._color };
    });

    const resolveUid = (l) =>
      typeof l.userId === "object" ? l.userId?.id : l.userId;

    // admin: lấy hết; lawyer: lấy của mình
    let me = null;
    if (!admin) {
      me = coloredLawyers.find(
        (l) => String(resolveUid(l)) === String(user.id),
      );
      setMyLawyer(me || null);
      if (!me) {
        setLoading(false);
        return;
      }
    }

    const taskFilter = admin ? undefined : { lawyerId: { $eq: me.id } };
    const subFilter = admin ? undefined : { lawyerId: { $eq: me.id } };

    const [tasks, subs] = await Promise.all([
      gFetchAll(
        "tasks:list",
        "id,title,status,priority,startDate,dueDate,closedDate,lawyerId,projectId,serviceId,description,estimatedDuration,nextStepDescription,isRequiredApproval",
        taskFilter,
      ),
      gFetchAll(
        "subTasks:list",
        "id,subTaskName,status,priority,date,deadline,closedDate,lawyerId,taskId,description,estimatedDuration",
        subFilter,
      ),
    ]);

    const projectIds = [
      ...new Set(tasks.map((t) => t.projectId).filter(Boolean)),
    ];
    const serviceIds = [
      ...new Set(tasks.map((t) => t.serviceId).filter(Boolean)),
    ];
    const [projs, svcs] = await Promise.all([
      projectIds.length
        ? gFetchAll("projects:list", "id,caseCode,projectName", {
            id: { $in: projectIds },
          })
        : Promise.resolve([]),
      serviceIds.length
        ? gFetchAll("services:list", "id,serviceName", {
            id: { $in: serviceIds },
          })
        : Promise.resolve([]),
    ]);
    const codeMap = {},
      projNameMap = {},
      svcMap = {};
    projs.forEach((p) => {
      codeMap[p.id] = p.caseCode || null;
      projNameMap[p.id] = p.projectName || null;
    });
    svcs.forEach((s) => {
      svcMap[s.id] = s.serviceName || null;
    });

    const taskMap = {};
    tasks.forEach((t) => {
      taskMap[t.id] = t;
    });

    setAllTasks(
      tasks.map((t) => {
        const lw = lwColorMap[String(t.lawyerId)];
        return {
          ...t,
          _type: "task",
          _lawyerName: lw?.name || null,
          _lawColor: lw?.color || "#8c8c8c",
          _caseCode: codeMap[t.projectId] || null,
          _projectName: projNameMap[t.projectId] || null,
          _serviceName: svcMap[t.serviceId] || null,
          _od: gIsOD(t.dueDate, t.status),
          _tod: gIsToday(t.dueDate),
        };
      }),
    );

    setAllSubs(
      subs.map((s) => {
        const parent = taskMap[s.taskId] || {};
        const lw = lwColorMap[String(s.lawyerId)];
        return {
          ...s,
          _type: "subtask",
          _lawyerName: lw?.name || null,
          _lawColor: lw?.color || "#8c8c8c",
          _caseCode: codeMap[parent.projectId] || null,
          _projectName: projNameMap[parent.projectId] || null,
          _serviceName: svcMap[parent.serviceId] || null,
          projectId: parent.projectId,
          serviceId: parent.serviceId,
          _od: gIsOD(s.deadline, s.status),
          _tod: gIsToday(s.deadline),
        };
      }),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, []);

  // ── filters ───────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let t = allTasks;
    if (isAdmin && lawyerFilter !== "all")
      t = t.filter((x) => String(x.lawyerId) === lawyerFilter);
    if (stFilter === "active")
      t = t.filter((x) => !["done", "cancelled"].includes(x.status));
    if (stFilter === "done") t = t.filter((x) => x.status === "done");
    if (search.trim())
      t = t.filter((x) =>
        (x.title || "").toLowerCase().includes(search.toLowerCase()),
      );
    return t;
  }, [allTasks, stFilter, search, isAdmin, lawyerFilter]);

  const filteredSubs = useMemo(() => {
    let s = allSubs;
    if (isAdmin && lawyerFilter !== "all")
      s = s.filter((x) => String(x.lawyerId) === lawyerFilter);
    if (stFilter === "active")
      s = s.filter((x) => !["done", "cancelled"].includes(x.status));
    if (stFilter === "done") s = s.filter((x) => x.status === "done");
    if (search.trim())
      s = s.filter((x) =>
        (x.subTaskName || "").toLowerCase().includes(search.toLowerCase()),
      );
    return s;
  }, [allSubs, stFilter, search, isAdmin, lawyerFilter]);

  // ── date range ────────────────────────────────────────────────
  const { startDate, endDate } = useMemo(() => {
    const dates = [];
    [...filteredTasks, ...filteredSubs].forEach((r) => {
      const s = r.startDate || r.date,
        e = r.dueDate || r.deadline;
      if (s) dates.push(new Date(s));
      if (e) dates.push(new Date(e));
    });
    if (!dates.length) {
      const n = new Date();
      return {
        startDate: new Date(n.getFullYear(), n.getMonth(), 1),
        endDate: new Date(n.getFullYear(), n.getMonth() + 2, 0),
      };
    }
    const min = new Date(Math.min(...dates)),
      max = new Date(Math.max(...dates));
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 14);
    return { startDate: gSod(min), endDate: gSod(max) };
  }, [filteredTasks, filteredSubs]);

  const dayW = G_ZOOM[zoom].dayW;
  const allDays = useMemo(
    () => gGetDays(startDate, endDate),
    [startDate, endDate],
  );
  const totalW = allDays.length * dayW;

  // ── group ─────────────────────────────────────────────────────
  const TYPE_ORDER = ["partner", "lawyer", "associate", "suppliant"];
  const grouped = useMemo(() => {
    const map = {};
    let pIdx = 0;
    filteredTasks.forEach((t) => {
      const pk = String(t.projectId || "__none__");
      if (!map[pk])
        map[pk] = {
          label:
            [t._caseCode, t._projectName].filter(Boolean).join(" — ") ||
            "Chưa gắn dự án",
          color: PROJECT_PALETTE[pIdx++ % PROJECT_PALETTE.length],
          tasks: [],
          lawyers: {},
          totalTasks: 0,
        };
      const subs = filteredSubs.filter(
        (s) => String(s.taskId) === String(t.id),
      );
      map[pk].totalTasks++;
      if (isAdmin) {
        const lk = String(t.lawyerId || "__none__");
        if (!map[pk].lawyers[lk]) {
          const lw = lawyers.find((l) => String(l.id) === lk) || {
            id: lk,
            lawyerName: "Chưa phân công",
            lawyerType: "",
            _color: "#8c8c8c",
          };
          map[pk].lawyers[lk] = { lawyer: lw, tasks: [] };
        }
        map[pk].lawyers[lk].tasks.push({ ...t, _subs: subs });
      } else {
        map[pk].tasks.push({ ...t, _subs: subs });
      }
    });
    if (isAdmin) {
      Object.values(map).forEach((pg) => {
        pg.lawyers = Object.values(pg.lawyers).sort((a, b) => {
          const ia = TYPE_ORDER.indexOf(a.lawyer.lawyerType),
            ib = TYPE_ORDER.indexOf(b.lawyer.lawyerType);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
      });
    }
    return Object.entries(map);
  }, [filteredTasks, filteredSubs, isAdmin, lawyers]);

  // ── jump today ────────────────────────────────────────────────
  const jumpToday = () => {
    if (scrollRef.current)
      scrollRef.current.scrollLeft = Math.max(
        0,
        (gDayX(gSod(new Date()), startDate, dayW) || 0) - 160,
      );
  };
  useEffect(() => {
    setTimeout(jumpToday, 100);
  }, [zoom, startDate, dayW]);

  // ── stats (tính trên toàn bộ, không bị filter) ───────────────
  const allRows = [...allTasks, ...allSubs];
  const nTotal = allRows.length,
    nDone = allRows.filter((r) => r.status === "done").length;
  const nOD = allRows.filter((r) => r._od).length,
    nTod = allRows.filter((r) => r._tod && !r._od).length;
  const nPend = allRows.filter((r) => r.status === "pending").length;
  const pct = nTotal ? Math.round((nDone / nTotal) * 100) : 0;

  const fBtnS = (active) => ({
    fontSize: 12,
    fontFamily: G_FONT,
    padding: "4px 12px",
    borderRadius: 6,
    cursor: "pointer",
    background: active ? "#1890ff" : "#fff",
    color: active ? "#fff" : "#595959",
    border: `1px solid ${active ? "#1890ff" : "#e8e8e8"}`,
    fontWeight: active ? 600 : 400,
    transition: "all .15s",
  });

  if (loading)
    return React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
        },
      },
      React.createElement(Spin, { size: "large" }),
    );

  if (!isAdmin && !myLawyer)
    return React.createElement(
      "div",
      { style: { textAlign: "center", padding: 80, fontFamily: G_FONT } },
      React.createElement(
        "div",
        { style: { fontSize: 40, marginBottom: 12 } },
        "👤",
      ),
      React.createElement(
        "div",
        { style: { fontSize: 14, color: "#bfbfbf" } },
        "Không tìm thấy hồ sơ luật sư liên kết với tài khoản này",
      ),
    );

  const whoLabel = isAdmin
    ? currentUser?.nickname || currentUser?.username || "Admin"
    : myLawyer?.lawyerName || "—";
  const whoRole = isAdmin
    ? "Quản trị viên"
    : LAWYER_TYPE_LABEL[myLawyer?.lawyerType] || "Luật sư";
  const whoColor = isAdmin
    ? "#cf1322"
    : myLawyer
      ? G_LAWYER_COLORS[0]
      : "#8c8c8c";
  const whoBg = isAdmin ? "#fff1f0" : "#e6f4ff";

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: G_FONT,
        background: "#f5f6f8",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      },
    },

    // ── Toolbar ──────────────────────────────────────────────────
    React.createElement(
      "div",
      {
        style: {
          background: "#fff",
          borderBottom: "1px solid #e8e8e8",
          padding: "14px 24px",
          flexShrink: 0,
        },
      },

      // row 1: identity + stats
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 14,
            flexWrap: "wrap",
          },
        },
        React.createElement(GAv, { name: whoLabel, color: whoColor, size: 42 }),
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            {
              style: {
                fontSize: 16,
                fontWeight: 700,
                color: "#1a1a1a",
                fontFamily: G_FONT,
              },
            },
            whoLabel,
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
              },
            },
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  padding: "2px 9px",
                  borderRadius: 10,
                  background: whoBg,
                  color: whoColor,
                  fontWeight: 600,
                },
              },
              whoRole,
            ),
            isAdmin &&
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 11,
                    padding: "2px 9px",
                    borderRadius: 10,
                    background: "#fff1f0",
                    color: "#cf1322",
                    border: "1px solid #ffa39e",
                    fontWeight: 700,
                  },
                },
                "🔑 Toàn quyền xem",
              ),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 8,
              marginLeft: "auto",
              flexWrap: "wrap",
            },
          },
          React.createElement(GStatCard, {
            icon: "📋",
            label: "Tổng công việc",
            value: `${nTotal}`,
            color: "#1890ff",
            bg: "#e6f4ff",
          }),
          React.createElement(GStatCard, {
            icon: "✅",
            label: `Hoàn thành (${pct}%)`,
            value: `${nDone}`,
            color: "#389e0d",
            bg: "#f6ffed",
          }),
          nPend > 0 &&
            React.createElement(GStatCard, {
              icon: "⏳",
              label: "Chờ duyệt",
              value: `${nPend}`,
              color: "#d46b08",
              bg: "#fff7e6",
            }),
          nOD > 0 &&
            React.createElement(GStatCard, {
              icon: "⚠",
              label: "Quá hạn",
              value: `${nOD}`,
              color: "#cf1322",
              bg: "#fff1f0",
            }),
          nTod > 0 &&
            React.createElement(GStatCard, {
              icon: "📅",
              label: "Hôm nay",
              value: `${nTod}`,
              color: "#d46b08",
              bg: "#fff7e6",
            }),
        ),
      ),

      // row 2: controls
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          },
        },

        React.createElement("input", {
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "🔍 Tìm công việc...",
          style: {
            padding: "5px 12px",
            borderRadius: 6,
            border: "1px solid #e8e8e8",
            fontSize: 12,
            fontFamily: G_FONT,
            outline: "none",
            minWidth: 200,
          },
          onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
          onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
        }),

        React.createElement(
          "div",
          { style: { display: "flex", gap: 4 } },
          [
            ["active", "Đang làm"],
            ["all", "Tất cả"],
            ["done", "Hoàn thành"],
          ].map(([k, l]) =>
            React.createElement(
              "div",
              {
                key: k,
                onClick: () => setStFilter(k),
                style: fBtnS(stFilter === k),
              },
              l,
            ),
          ),
        ),

        // dropdown lọc luật sư — chỉ admin
        isAdmin &&
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 6 } },
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: G_FONT,
                  color: "#8c8c8c",
                  flexShrink: 0,
                },
              },
              "Luật sư:",
            ),
            React.createElement(
              "select",
              {
                value: lawyerFilter,
                onChange: (e) => setLawyerFilter(e.target.value),
                style: {
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid #e8e8e8",
                  fontSize: 12,
                  fontFamily: G_FONT,
                  outline: "none",
                  cursor: "pointer",
                  background: "#fff",
                  color: "#262626",
                  minWidth: 170,
                },
              },
              React.createElement(
                "option",
                { value: "all" },
                "— Tất cả luật sư —",
              ),
              lawyers.map((l) =>
                React.createElement(
                  "option",
                  { key: l.id, value: String(l.id) },
                  l.lawyerName,
                ),
              ),
            ),
          ),

        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 2,
              background: "#f5f5f5",
              padding: 3,
              borderRadius: 6,
              marginLeft: "auto",
            },
          },
          Object.entries(G_ZOOM).map(([k, v]) =>
            React.createElement(
              "div",
              {
                key: k,
                onClick: () => setZoom(k),
                style: {
                  padding: "3px 10px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: G_FONT,
                  background: zoom === k ? "#fff" : "transparent",
                  boxShadow: zoom === k ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  color: zoom === k ? "#1890ff" : "#8c8c8c",
                  fontWeight: zoom === k ? 700 : 400,
                },
              },
              v.label,
            ),
          ),
        ),
        React.createElement(
          "div",
          {
            onClick: jumpToday,
            style: {
              fontSize: 12,
              fontFamily: G_FONT,
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid #ff4d4f",
              color: "#ff4d4f",
              background: "#fff1f0",
              cursor: "pointer",
            },
          },
          "📍 Hôm nay",
        ),
        React.createElement(
          "div",
          {
            onClick: load,
            style: {
              fontSize: 12,
              fontFamily: G_FONT,
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid #e8e8e8",
              color: "#595959",
              background: "#fff",
              cursor: "pointer",
            },
          },
          "↻ Tải lại",
        ),
      ),
    ),

    // ── Legend ───────────────────────────────────────────────────
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "7px 24px",
          background: "#fff",
          borderBottom: "1px solid #f0f0f0",
          flexWrap: "wrap",
        },
      },
      isAdmin &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              fontFamily: G_FONT,
              color: "#8c8c8c",
              marginRight: 4,
              flexShrink: 0,
            },
          },
          "Nhóm: Project → Luật sư → Task",
        ),
      !isAdmin &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              fontFamily: G_FONT,
              color: "#8c8c8c",
              marginRight: 4,
              flexShrink: 0,
            },
          },
          "Nhóm: Project → Task",
        ),
      React.createElement(
        "div",
        {
          style: {
            marginLeft: "auto",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          },
        },
        Object.entries(G_STATUS).map(([k, v]) =>
          React.createElement(
            "div",
            {
              key: k,
              style: {
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontFamily: G_FONT,
                color: "#595959",
              },
            },
            React.createElement("div", {
              style: {
                width: 12,
                height: 8,
                borderRadius: 3,
                background: v.bar,
                flexShrink: 0,
              },
            }),
            v.label,
          ),
        ),
      ),
    ),

    // ── Chart area ────────────────────────────────────────────────
    React.createElement(
      "div",
      {
        ref: scrollRef,
        style: {
          flex: 1,
          padding: "12px 24px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      },
      grouped.length === 0
        ? React.createElement(
            "div",
            {
              style: {
                textAlign: "center",
                padding: "80px 0",
                fontFamily: G_FONT,
              },
            },
            React.createElement(
              "div",
              { style: { fontSize: 40, marginBottom: 12 } },
              "📊",
            ),
            React.createElement(
              "div",
              { style: { fontSize: 14, color: "#bfbfbf" } },
              search || stFilter !== "all"
                ? "Không tìm thấy kết quả phù hợp"
                : "Chưa có công việc nào",
            ),
          )
        : React.createElement(
            "div",
            {
              style: {
                flex: 1,
                border: "1px solid #e8e8e8",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              },
            },
            React.createElement(GanttChart, {
              grouped,
              startDate,
              allDays,
              dayW,
              totalW,
              onOpen: (item) => setDetail(item),
              isAdminMode: isAdmin,
            }),
          ),
    ),

    detail &&
      React.createElement(GDetailModal, {
        item: detail,
        onClose: () => setDetail(null),
      }),
  );
};

ctx.render(React.createElement(GanttView, null));
