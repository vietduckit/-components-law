/**
 * ══════════════════════════════════════════════════════════════════
 *  KANBAN VIEW — Standalone Component
 *  Add this as a separate JS block.
 *
 *  Props (passed from parent via ctx or rendered directly):
 *    tasks          : array of task objects (shape same as MyTaskTab)
 *    subs           : array of subtask objects
 *    onOpen(item, type) : callback when a card is clicked
 *    onStatusChange(item, type, newStatus) : callback on drag-drop
 *
 *  To render standalone (all data fetched internally):
 *    ctx.render(React.createElement(KanbanBoard, null))
 *
 *  To use as child component from another block, export KanbanView
 *  and KanbanCard via window globals (see bottom of file).
 * ══════════════════════════════════════════════════════════════════
 */

const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const {
  Spin,
  Typography,
  Modal,
  message,
  Select,
  Input,
  Upload,
  Form,
  Button,
  Empty,
  Tooltip,
} = ctx.antd;
const { Text } = Typography;

const FONT = "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ── Status config ──────────────────────────────────────────────────
const STATUS_CFG = {
  toDo: {
    label: "To Do",
    color: "#595959",
    bg: "#f5f5f5",
    border: "#d9d9d9",
  },
  inProgress: {
    label: "In Progress",
    color: "#1890ff",
    bg: "#e6f4ff",
    border: "#91caff",
  },
  blocked: {
    label: "Blocked",
    color: "#722ed1",
    bg: "#f9f0ff",
    border: "#d3adf7",
  },
  pending: {
    label: "Pending",
    color: "#d46b08",
    bg: "#fff7e6",
    border: "#ffd591",
  },
  approval: {
    label: "Approved",
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
  },
  done: {
    label: "Done",
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
  },
  cancelled: {
    label: "Cancelled",
    color: "#cf1322",
    bg: "#fff1f0",
    border: "#ffa39e",
  },
};

const PRIORITY_CFG = {
  high: { label: "High", color: "#cf1322", bg: "#fff1f0", icon: "↑↑" },
  medium: { label: "Medium", color: "#d46b08", bg: "#fff7e6", icon: "↑" },
  low: { label: "Low", color: "#389e0d", bg: "#f6ffed", icon: "↓" },
};

const LAWYER_COLORS = [
  "#531dab",
  "#096dd9",
  "#08979c",
  "#237804",
  "#d46b08",
  "#9e1068",
  "#a8071a",
  "#003a8c",
];

const LAWYER_TYPE_CFG = {
  partner: { label: "Partner", color: "#531dab", bg: "#f9f0ff" },
  lawyer: { label: "Lawyer", color: "#096dd9", bg: "#e6f4ff" },
  associate: { label: "Associate", color: "#08979c", bg: "#e6fffb" },
  suppliant: { label: "Legal Assistant", color: "#d46b08", bg: "#fff7e6" },
};

// ── Utilities ──────────────────────────────────────────────────────
const fmt = (iso, mode) => {
  if (!iso) return null;
  const d = new Date(iso);
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yy = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  if (mode === "full") return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  if (mode === "date") return `${dd}/${mm}/${yy}`;
  return `${dd}/${mm}`;
};

const isOD = (iso, st) =>
  iso && st !== "done" && st !== "cancelled" && new Date(iso) < new Date();

const isToday = (iso) => {
  if (!iso) return false;
  const d = new Date(iso),
    n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
};

const fmtHours = (h) => {
  if (!h && h !== 0) return "—";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

const toLocalDT = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ── API helpers (only what Kanban needs) ───────────────────────────
async function apiReq(url, method, data) {
  return ctx.api.request({ url, method: method || "POST", data });
}

async function fetchAll(url, fields, filter) {
  try {
    const params = { pageSize: 500, page: 1 };
    if (fields) params.fields = fields;
    if (filter) params.filter = JSON.stringify(filter);
    const res = await ctx.api.request({ url, params });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}

async function getCurrentUser() {
  try {
    const r = await ctx.api.request({ url: "auth:check", method: "GET" });
    return r?.data?.data || r?.data || null;
  } catch {
    return null;
  }
}
const extractId = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (Array.isArray(val)) return val.length > 0 ? extractId(val[0]) : null;
  if (typeof val === "object") return val.id ? parseInt(val.id, 10) : null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

const userName = (u) =>
  u?.nickname ||
  `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
  u?.username ||
  u?.email ||
  null;

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return fmt(iso, "date");
};

const getFullUrl = (url) =>
  !url
    ? null
    : url.startsWith("http")
      ? url
      : `${window.location.origin}${url}`;

async function fetchNotes(col, id) {
  try {
    const res = await ctx.api.request({
      url: "notes:list",
      params: {
        pageSize: 100,
        page: 1,
        sort: ["-createdAt"],
        filter: JSON.stringify({
          $and: [{ collectionName: { $eq: col } }, { recordId: { $eq: id } }],
        }),
        appends: ["createdBy"],
      },
    });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}

async function fetchFiles(col, id) {
  try {
    const res = await ctx.api.request({
      url: "documents:list",
      params: {
        pageSize: 100,
        page: 1,
        sort: ["-createdAt"],
        filter: JSON.stringify({
          $and: [
            { collectionName: { $eq: col } },
            { recordId: { $eq: parseInt(id) } },
          ],
        }),
        appends: ["fileAttachment", "createdBy"],
      },
    });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}

async function logAct(col, id, action, field, oldV, newV, who) {
  try {
    await apiReq("activity_log:create", "POST", {
      collectionName: col,
      recordId: id,
      action,
      fieldName: field,
      oldValue: oldV ? String(oldV) : null,
      newValue: newV ? String(newV) : null,
      changedByName: who || "System",
      changedAt: new Date().toISOString(),
    });
  } catch {}
}

const renderTextWithMentions = (text, lawyers) => {
  if (!text) return null;
  const escapedNames = lawyers
    .map((l) => l.lawyerName)
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escapedNames.length === 0) return React.createElement("span", null, text);
  const pattern = new RegExp(`(@(?:${escapedNames.join("|")}))`, "g");
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    if (
      part.startsWith("@") &&
      lawyers.some((l) => part === `@${l.lawyerName}`)
    ) {
      return React.createElement(
        "span",
        {
          key: i,
          style: {
            color: "#096dd9",
            background: "#e6f4ff",
            borderRadius: 3,
            padding: "0 4px",
            fontWeight: 600,
            fontSize: 13,
          },
        },
        part,
      );
    }
    return React.createElement("span", { key: i }, part);
  });
};

const MentionInput = ({
  value,
  onChange,
  onAssign,
  assignedIds = [],
  onAssignMultiple,
  lawyers,
  placeholder,
  onSubmit,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  const currentAssignedIds = Array.isArray(assignedIds)
    ? assignedIds
    : assignedIds
      ? [assignedIds]
      : [];
  const filteredLawyers = useMemo(() => {
    if (mentionQuery === "") return lawyers;
    return lawyers.filter((l) =>
      (l.lawyerName || "").toLowerCase().includes(mentionQuery.toLowerCase()),
    );
  }, [lawyers, mentionQuery]);

  useEffect(() => {
    setActiveIdx(0);
  }, [filteredLawyers.length]);

  const getLawyerColor = useCallback(
    (l) => {
      const idx = lawyers.findIndex((x) => x.id === l.id);
      return LAWYER_COLORS[Math.max(0, idx) % LAWYER_COLORS.length];
    },
    [lawyers],
  );

  const calcDropdownPos = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const rect = ta.getBoundingClientRect();
    const lines = value.slice(0, mentionStart).split("\n").length;
    const lineH = 22;
    const topOffset = Math.min(lines * lineH, rect.height - 10);
    setDropdownPos({
      top: rect.top + topOffset + lineH,
      left: Math.min(rect.left + 12, rect.right - 248),
    });
  }, [value, mentionStart]);

  const handleChange = useCallback(
    (e) => {
      const text = e.target.value;
      const cursor = e.target.selectionStart;
      onChange(text);
      if (onAssignMultiple && currentAssignedIds.length > 0) {
        const stillAssignedIds = currentAssignedIds.filter((id) => {
          const lawyer = lawyers.find((l) => l.id === id);
          return lawyer && text.includes(`@${lawyer.lawyerName}`);
        });
        if (stillAssignedIds.length !== currentAssignedIds.length)
          onAssignMultiple(stillAssignedIds);
      }
      const textBeforeCursor = text.slice(0, cursor);
      const atIdx = textBeforeCursor.lastIndexOf("@");
      if (atIdx !== -1) {
        const afterAt = textBeforeCursor.slice(atIdx + 1);
        if (!afterAt.includes(" ") || afterAt.split(" ").length <= 3) {
          const noNewline = !afterAt.includes("\n");
          if (noNewline) {
            setMentionStart(atIdx);
            setMentionQuery(afterAt);
            setShowDropdown(true);
            setTimeout(calcDropdownPos, 0);
            return;
          }
        }
      }
      setShowDropdown(false);
      setMentionStart(-1);
      setMentionQuery("");
    },
    [onChange, currentAssignedIds, lawyers, onAssignMultiple, calcDropdownPos],
  );

  const selectLawyer = useCallback(
    (lawyer) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursorPos = ta.selectionStart;
      const before = value.slice(0, mentionStart);
      const after = value.slice(cursorPos);
      const mention = `@${lawyer.lawyerName} `;
      const newText = before + mention + after;
      onChange(newText);
      const newIds = currentAssignedIds.includes(lawyer.id)
        ? currentAssignedIds
        : [...currentAssignedIds, lawyer.id];
      if (onAssignMultiple) onAssignMultiple(newIds);
      setShowDropdown(false);
      setMentionStart(-1);
      setMentionQuery("");
      setTimeout(() => {
        if (ta) {
          const pos = before.length + mention.length;
          ta.focus();
          ta.setSelectionRange(pos, pos);
        }
      }, 0);
    },
    [value, mentionStart, onChange, onAssignMultiple, currentAssignedIds],
  );

  const removeAssigned = useCallback(
    (id) => {
      const newIds = currentAssignedIds.filter((x) => x !== id);
      if (onAssignMultiple) onAssignMultiple(newIds);
      const lawyer = lawyers.find((l) => l.id === id);
      if (lawyer) {
        const newText = value.replace(
          new RegExp(
            `@${lawyer.lawyerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s?`,
            "g",
          ),
          "",
        );
        onChange(newText);
      }
    },
    [currentAssignedIds, onAssignMultiple, lawyers, value, onChange],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (onSubmit) onSubmit();
        return;
      }
      if (!showDropdown || filteredLawyers.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filteredLawyers.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectLawyer(filteredLawyers[activeIdx]);
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    },
    [showDropdown, filteredLawyers, activeIdx, selectLawyer, onSubmit],
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => setShowDropdown(false), 120);
  }, []);
  const assignedLawyers = currentAssignedIds
    .map((id) => lawyers.find((l) => l.id === id))
    .filter(Boolean);
  const typeCfgOf = (l) =>
    LAWYER_TYPE_CFG[l.lawyerType] || {
      label: l.lawyerType || "",
      color: "#8c8c8c",
    };

  return React.createElement(
    "div",
    { ref: containerRef, style: { position: "relative" } },
    React.createElement("textarea", {
      ref: textareaRef,
      value,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      placeholder,
      rows: 1,
      style: {
        width: "100%",
        border: "1px solid #e8e8e8",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 13,
        fontFamily: FONT,
        outline: "none",
        resize: "vertical",
        boxSizing: "border-box",
        lineHeight: 1.5,
        color: "#262626",
        background: "#fff",
        minHeight: 38,
        transition: "border-color 0.15s",
      },
      onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
    }),
    assignedLawyers.length === 0 &&
      React.createElement(
        "div",
        {
          style: {
            marginTop: 4,
            fontSize: 11,
            fontFamily: FONT,
            color: "#bfbfbf",
            display: "flex",
            alignItems: "center",
            gap: 4,
          },
        },
        React.createElement(
          "span",
          {
            style: {
              background: "#f5f5f5",
              border: "1px solid #e8e8e8",
              borderRadius: 4,
              padding: "0 5px",
              fontSize: 11,
              fontFamily: "monospace",
              color: "#8c8c8c",
            },
          },
          "@",
        ),
        "tag lawyer (Ctrl + Enter to send)",
      ),
    assignedLawyers.length > 0 &&
      React.createElement(
        "div",
        { style: { marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 } },
        ...assignedLawyers.map((lawyer) =>
          React.createElement(
            "div",
            {
              key: lawyer.id,
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#e6f4ff",
                border: "1px solid #91caff",
                borderRadius: 12,
                padding: "2px 8px 2px 6px",
              },
            },
            React.createElement(Av, {
              name: lawyer.lawyerName,
              color: getLawyerColor(lawyer),
              size: 16,
            }),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  fontWeight: 600,
                  color: "#096dd9",
                },
              },
              lawyer.lawyerName,
            ),
            React.createElement(
              "span",
              {
                onMouseDown: (e) => {
                  e.preventDefault();
                  removeAssigned(lawyer.id);
                },
                style: {
                  fontSize: 14,
                  color: "#91caff",
                  cursor: "pointer",
                  lineHeight: 1,
                  marginLeft: 2,
                  fontWeight: 700,
                  userSelect: "none",
                },
                onMouseEnter: (e) => (e.currentTarget.style.color = "#cf1322"),
                onMouseLeave: (e) => (e.currentTarget.style.color = "#91caff"),
              },
              "×",
            ),
          ),
        ),
      ),
    showDropdown &&
      React.createElement(
        "div",
        {
          style: {
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 99999,
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
            width: 248,
            maxHeight: 240,
            overflowY: "auto",
            padding: "4px 0",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              padding: "5px 12px 4px",
              fontSize: 11,
              fontFamily: FONT,
              color: "#8c8c8c",
              borderBottom: "1px solid #f5f5f5",
              marginBottom: 2,
              display: "flex",
              alignItems: "center",
              gap: 6,
            },
          },
          React.createElement(
            "span",
            {
              style: {
                background: "#e6f4ff",
                color: "#1890ff",
                borderRadius: 4,
                padding: "0 5px",
                fontSize: 11,
                fontFamily: "monospace",
                fontWeight: 700,
              },
            },
            `@${mentionQuery}`,
          ),
          filteredLawyers.length > 0
            ? React.createElement(
                "span",
                null,
                `${filteredLawyers.length} lawyers`,
              )
            : React.createElement(
                "span",
                { style: { color: "#ff4d4f" } },
                "Not found",
              ),
        ),
        filteredLawyers.length === 0
          ? React.createElement(
              "div",
              {
                style: {
                  padding: "10px 12px",
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#bfbfbf",
                  textAlign: "center",
                },
              },
              "No results",
            )
          : filteredLawyers.map((l, idx) => {
              const lColor = getLawyerColor(l);
              const isActive = idx === activeIdx;
              const tCfg = typeCfgOf(l);
              const isAlreadyMentioned = currentAssignedIds.includes(l.id);
              return React.createElement(
                "div",
                {
                  key: l.id,
                  onMouseDown: (e) => {
                    e.preventDefault();
                    selectLawyer(l);
                  },
                  onMouseEnter: () => setActiveIdx(idx),
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 12px",
                    cursor: "pointer",
                    background: isActive ? "#e6f4ff" : "transparent",
                    borderLeft: `3px solid ${isActive ? "#1890ff" : "transparent"}`,
                  },
                },
                React.createElement(Av, {
                  name: l.lawyerName,
                  color: lColor,
                  size: 24,
                }),
                React.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 13,
                        fontFamily: FONT,
                        fontWeight: 600,
                        color: isActive ? "#096dd9" : "#262626",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    },
                    l.lawyerName,
                  ),
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 11,
                        fontFamily: FONT,
                        color: tCfg.color,
                        marginTop: 1,
                      },
                    },
                    tCfg.label,
                  ),
                ),
                isAlreadyMentioned &&
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 10,
                        color: "#52c41a",
                        background: "#f6ffed",
                        border: "1px solid #b7eb8f",
                        borderRadius: 8,
                        padding: "1px 6px",
                        flexShrink: 0,
                      },
                    },
                    "✓",
                  ),
                isActive &&
                  !isAlreadyMentioned &&
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 11,
                        color: "#91caff",
                        flexShrink: 0,
                        fontFamily: FONT,
                      },
                    },
                    "↵",
                  ),
              );
            }),
      ),
  );
};

const PreviewModal = ({ doc, onClose }) => {
  if (!doc) return null;
  const attachment = Array.isArray(doc.fileAttachment)
    ? doc.fileAttachment[0]
    : doc.fileAttachment;
  const fileUrl = attachment?.url || attachment?.preview;
  const fullUrl = getFullUrl(fileUrl);
  const rawName =
    doc.title || attachment?.title || attachment?.filename || "File";
  const extFromAtt = attachment?.extname
    ? attachment.extname.startsWith(".")
      ? attachment.extname.toLowerCase()
      : "." + attachment.extname.toLowerCase()
    : "";
  const extFromName = rawName.includes(".")
    ? "." + rawName.split(".").pop().toLowerCase()
    : "";
  const fileExt = extFromAtt || extFromName || "";
  const baseName = rawName.toLowerCase().endsWith(fileExt)
    ? rawName.slice(0, rawName.length - fileExt.length)
    : rawName;
  const displayName = (baseName || "File") + fileExt;
  const isPdf = fileExt === ".pdf";
  const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(fileExt);
  const isOffice = [
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".odt",
  ].includes(fileExt);

  const officeViewerUrl =
    isOffice && fullUrl
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
      : null;
  return React.createElement(
    Modal,
    {
      open: !!doc,
      onCancel: onClose,
      centered: true,
      width: isPdf || isOffice ? "88%" : "auto",
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        displayName,
      ),
      bodyStyle: { padding: 0 },
      footer: [
        fullUrl &&
          React.createElement(
            Button,
            {
              key: "dl",
              onClick: () => window.open(fullUrl, "_blank"),
            },
            "⬇️ Download",
          ),
        React.createElement(Button, { key: "cl", onClick: onClose }, "Close"),
      ].filter(Boolean),
    },
    isPdf &&
      fullUrl &&
      React.createElement("iframe", {
        src: fullUrl,
        style: {
          width: "100%",
          height: "80vh",
          border: "none",
          display: "block",
        },
        title: displayName,
      }),
    isImage &&
      fullUrl &&
      React.createElement("img", {
        src: fullUrl,
        alt: displayName,
        style: {
          maxWidth: "100%",
          maxHeight: "80vh",
          display: "block",
          margin: "0 auto",
          padding: 16,
        },
      }),
    isOffice &&
      officeViewerUrl &&
      React.createElement(
        "div",
        { style: { padding: 0 } },
        React.createElement("iframe", {
          src: officeViewerUrl,
          style: {
            width: "100%",
            height: "80vh",
            border: "none",
            display: "block",
          },
          title: displayName,
          frameBorder: "0",
        }),
      ),
    !isPdf &&
      !isImage &&
      !isOffice &&
      React.createElement(
        "div",
        {
          style: { padding: 32, textAlign: "center" },
        },
        React.createElement(Empty, {
          description: "Cannot preview this format — please download to open",
        }),
      ),
  );
};

const FileUploadModal = ({
  open,
  onClose,
  onSuccess,
  onAddPending,
  collectionName,
  recordId,
  currentUser,
  editDoc = null,
  projectFolderId,
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!editDoc;

  useEffect(() => {
    if (!open) return;
    if (isEdit && editDoc) {
      form.setFieldsValue({
        documentType: editDoc.documentType || "",
        documentCode: editDoc.documentCode || "",
        title: editDoc.title || "",
        openingDate: editDoc.openingDate
          ? editDoc.openingDate.slice(0, 10)
          : "",
        signedAt: editDoc.signedAt ? editDoc.signedAt.slice(0, 10) : "",
        effectiveAt: editDoc.effectiveAt
          ? editDoc.effectiveAt.slice(0, 10)
          : "",
        senderName: editDoc.senderName || "",
        recipientName: editDoc.recipientName || "",
        language: editDoc.language || "",
        docFormat: editDoc.docFormat || "",
        description: editDoc.description || "",
        googleDriveUrl: editDoc.googleDriveUrl || "",
        note: editDoc.note || "",
      });
      setFileList([]);
    } else {
      form.resetFields();
      setFileList([]);
    }
  }, [open, editDoc]);

  const handleClose = () => {
    form.resetFields();
    setFileList([]);
    onClose();
  };

  const uploadFile = async () => {
    const file = fileList[0].originFileObj;
    const formData = new window.FormData();
    formData.append("file", file, file.name);
    const uploadRes = await ctx.api.request({
      url: "attachments:create",
      method: "POST",
      params: { attachmentField: "documents.fileAttachment" },
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
    const att = uploadRes?.data?.data;
    if (!att?.id) throw new Error("Upload failed");
    return [{ id: att.id }];
  };

  const toISO = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const values = form.getFieldsValue();
    const hasFile = fileList.length > 0;
    const hasDrive = !!values.googleDriveUrl?.trim();

    if (!isEdit && !hasFile && !hasDrive) {
      message.error("Please select a file or enter a Drive URL");
      return;
    }

    if (onAddPending) {
      onAddPending({
        file: hasFile ? fileList[0].originFileObj : null,
        fileName: hasFile ? fileList[0].name : "Google Drive Link",
        metadata: values,
      });
      handleClose();
      return;
    }

    setUploading(true);
    try {
      const attIds = hasFile ? await uploadFile() : null;
      const now = new Date().toISOString();
      const payload = {
        documentType: values.documentType?.trim() || "",
        documentCode: values.documentCode?.trim() || "",
        title: values.title?.trim() || "",
        openingDate: toISO(values.openingDate),
        signedAt: toISO(values.signedAt),
        effectiveAt: toISO(values.effectiveAt),
        senderName: values.senderName?.trim() || "",
        recipientName: values.recipientName?.trim() || "",
        language: values.language?.trim() || "",
        docFormat: values.docFormat?.trim() || "",
        googleDriveUrl: values.googleDriveUrl?.trim() || "",
        description: values.description?.trim() || "",
        note: values.note?.trim() || "",
        updatedById: extractId(currentUser?.id) || null,
        updatedAt: now,
        folderId: projectFolderId ? parseInt(projectFolderId) : null,
        ...(attIds && { fileAttachment: attIds }),
      };

      if (isEdit) {
        await ctx.api.request({
          url: "documents:update",
          method: "POST",
          params: { filterByTk: editDoc.id },
          data: payload,
        });
        message.success("✅ Updated successfully!");
      } else {
        await apiReq("documents:create", "POST", {
          ...payload,
          collectionName,
          recordId: parseInt(recordId),
          createdById: currentUser?.id || null,
          createdAt: now,
        });
        message.success("✅ Upload successful!");
      }
      handleClose();
      if (onSuccess) onSuccess();
    } catch (e) {
      message.error("Error: " + (e?.message || "Try again"));
    }
    setUploading(false);
  };

  const inpStyle = { fontSize: 12, fontFamily: FONT };
  const DOC_TYPE_SUGGESTIONS = [
    "Contract",
    "Minutes",
    "Decision",
    "Proposal",
    "Report",
    "Evidence / Profile",
    "Official Dispatch",
    "Application",
    "Appendix",
    "Working Minutes",
    "Template",
    "Other",
  ];
  const divider = (label) =>
    React.createElement(
      "div",
      {
        style: {
          fontSize: 12,
          color: "#8c8c8c",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          margin: "12px 0 8px",
          paddingBottom: 4,
          borderBottom: "1px solid #f0f0f0",
          fontFamily: FONT,
        },
      },
      label,
    );

  return React.createElement(
    Modal,
    {
      open,
      onCancel: handleClose,
      width: 1100,
      centered: true,
      title: React.createElement(
        Text,
        { strong: true, style: { fontFamily: FONT, fontSize: 14 } },
        isEdit ? "✏️ Update Document" : "📎 Attach Document",
      ),
      footer: [
        React.createElement(
          Button,
          {
            key: "c",
            onClick: handleClose,
            disabled: uploading,
            style: { fontFamily: FONT },
          },
          "Cancel",
        ),
        React.createElement(
          Button,
          {
            key: "s",
            type: "primary",
            onClick: handleSubmit,
            loading: uploading,
            style: { fontFamily: FONT },
          },
          uploading
            ? isEdit
              ? "Updating..."
              : "Processing..."
            : isEdit
              ? "Update"
              : onAddPending
                ? "Confirm Attachment"
                : "Upload",
        ),
      ],
    },
    currentUser &&
      React.createElement(
        "div",
        {
          style: {
            background: "#f6ffed",
            border: "1px solid #b7eb8f",
            borderRadius: 6,
            padding: "6px 12px",
            marginBottom: 12,
            fontSize: 12,
            color: "#595959",
            fontFamily: FONT,
          },
        },
        `👤 ${isEdit ? "Updated" : "Attached"} by: `,
        React.createElement(
          "strong",
          null,
          userName(currentUser) || currentUser.email,
        ),
      ),
    React.createElement(
      Form,
      { form, layout: "vertical", size: "small", style: { fontFamily: FONT } },
      divider("Identification"),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          {
            name: "documentType",
            label: "Document Type",
            rules: [{ required: true, message: "Please enter document type" }],
          },
          React.createElement(
            "div",
            null,
            React.createElement(Input, {
              allowClear: true,
              maxLength: 150,
              placeholder: "e.g. Contract, Minutes...",
              list: "doc-type-list",
              style: inpStyle,
            }),
            React.createElement(
              "datalist",
              { id: "doc-type-list" },
              ...DOC_TYPE_SUGGESTIONS.map((s) =>
                React.createElement("option", { key: s, value: s }),
              ),
            ),
          ),
        ),
        React.createElement(
          Form.Item,
          { name: "title", label: "Document Title" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Enter full title (defaults to filename if empty)",
            style: inpStyle,
          }),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          { name: "documentCode", label: "Document Code" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "e.g. 123/2024/HD",
            style: inpStyle,
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "openingDate", label: "Issued Date" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%", ...inpStyle },
          }),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          { name: "signedAt", label: "Signed Date" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%", ...inpStyle },
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "effectiveAt", label: "Effective Date" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%", ...inpStyle },
          }),
        ),
      ),
      divider("Related Parties"),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          { name: "senderName", label: "Sender" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Name of sender person/org",
            style: inpStyle,
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "recipientName", label: "Recipient" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Name of recipient person/org",
            style: inpStyle,
          }),
        ),
      ),
      React.createElement(
        Form.Item,
        { name: "description", label: "Summary" },
        React.createElement(Input.TextArea, {
          rows: 3,
          allowClear: true,
          placeholder: "Brief description of content...",
        }),
      ),
      divider("Attachments"),
      React.createElement(
        Form.Item,
        { label: isEdit ? "Replace with new file (optional)" : "Choose file" },
        React.createElement(
          Upload.Dragger,
          {
            fileList,
            beforeUpload: () => false,
            onChange: ({ fileList: fl }) => setFileList(fl.slice(-1)),
            maxCount: 1,
            style: { padding: "6px 0" },
          },
          React.createElement(
            "p",
            { style: { fontSize: 20, margin: "0 0 4px" } },
            "📁",
          ),
          React.createElement(
            "p",
            {
              style: {
                fontSize: 12,
                color: "#595959",
                margin: 0,
                fontFamily: FONT,
              },
            },
            "Drag and drop or ",
            React.createElement(
              "span",
              { style: { color: "#1890ff" } },
              "click to choose",
            ),
          ),
        ),
      ),
      React.createElement(
        Form.Item,
        { name: "googleDriveUrl", label: "Google Drive URL (optional)" },
        React.createElement(Input, {
          placeholder: "https://docs.google.com/...",
          allowClear: true,
          style: inpStyle,
        }),
      ),
      divider("Notes"),
      React.createElement(
        Form.Item,
        { name: "note", label: "Notes" },
        React.createElement(Input.TextArea, {
          rows: 2,
          allowClear: true,
          placeholder: "Enter notes...",
          style: inpStyle,
        }),
      ),
    ),
  );
};

const UnifiedNoteThread = ({
  collectionName,
  recordId,
  currentUser,
  lawyers,
  canEdit = true,
  projectFolderId,
}) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [assignedIds, setAssignedIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 10;
  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchNotes(collectionName, recordId),
      fetchFiles(collectionName, recordId),
    ]).then(([notes, files]) => {
      const WINDOW_MS = 5000;
      const usedFileIds = new Set();
      const noteItems = notes.map((n) => {
        const noteTime = new Date(n.createdAt).getTime();
        const attachedFiles = files.filter((f) => {
          if (usedFileIds.has(f.id)) return false;
          if (n.batchId && f.batchId && n.batchId === f.batchId) return true;
          return (
            Math.abs(new Date(f.createdAt).getTime() - noteTime) <= WINDOW_MS
          );
        });
        attachedFiles.forEach((f) => usedFileIds.add(f.id));
        return {
          _kind: "item",
          _time: new Date(n.createdAt),
          note: n,
          files: attachedFiles,
        };
      });
      const remainingFiles = files.filter((f) => !usedFileIds.has(f.id));
      const fileOnlyItems = [];
      const processedIds = new Set();
      remainingFiles.forEach((f) => {
        if (processedIds.has(f.id)) return;
        const fTime = new Date(f.createdAt).getTime();
        const batch = remainingFiles.filter((f2) => {
          if (processedIds.has(f2.id) && f2.id !== f.id) return false;
          if (f.batchId && f2.batchId && f.batchId === f2.batchId) return true;
          return (
            Math.abs(new Date(f2.createdAt).getTime() - fTime) <= WINDOW_MS
          );
        });
        batch.forEach((f2) => processedIds.add(f2.id));
        fileOnlyItems.push({
          _kind: "item",
          _time: new Date(f.createdAt),
          note: null,
          files: batch,
        });
      });
      setFeed(
        [...noteItems, ...fileOnlyItems].sort((a, b) => b._time - a._time),
      );
      setLoading(false);
    });
  }, [collectionName, recordId]);
  useEffect(() => {
    reload();
  }, [recordId, collectionName]);
  const authorName = (n) =>
    n.createdBy?.nickname ||
    n.createdBy?.username ||
    n.createdBy?.email ||
    (n.createdById ? `User #${n.createdById}` : "Ẩn danh");
  const handleSend = async () => {
    const hasText = body.trim().length > 0;
    const hasFiles = pendingDocs.length > 0;
    if (!hasText && !hasFiles && assignedIds.length === 0) return;
    setSending(true);
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      if (hasText || assignedIds.length > 0) {
        await apiReq("notes:create", "POST", {
          collectionName,
          recordId,
          title: "Comment",
          body: body.trim() || null,
          assignees: assignedIds,
          ...(hasFiles ? { batchId } : {}),
        });
      }
      if (hasFiles) {
        const toISO = (val) => {
          if (!val) return null;
          const d = new Date(val);
          return isNaN(d.getTime()) ? null : d.toISOString();
        };
        for (const pDoc of pendingDocs) {
          let attIds = null;
          if (pDoc.file) {
            const fd = new window.FormData();
            fd.append("file", pDoc.file, pDoc.fileName);
            const uploadRes = await ctx.api.request({
              url: "attachments:create",
              method: "POST",
              params: { attachmentField: "documents.fileAttachment" },
              data: fd,
              headers: { "Content-Type": "multipart/form-data" },
            });
            if (uploadRes?.data?.data?.id)
              attIds = [{ id: uploadRes.data.data.id }];
          }
          const payload = {
            documentType: pDoc.metadata.documentType?.trim() || "",
            documentCode: pDoc.metadata.documentCode?.trim() || "",
            title: pDoc.metadata.title?.trim() || pDoc.fileName,
            openingDate: toISO(pDoc.metadata.openingDate),
            signedAt: toISO(pDoc.metadata.signedAt),
            effectiveAt: toISO(pDoc.metadata.effectiveAt),
            senderName: pDoc.metadata.senderName?.trim() || "",
            recipientName: pDoc.metadata.recipientName?.trim() || "",
            language: pDoc.metadata.language?.trim() || "",
            docFormat: pDoc.metadata.docFormat?.trim() || "",
            googleDriveUrl: pDoc.metadata.googleDriveUrl?.trim() || "",
            note: pDoc.metadata.note?.trim() || "",
            updatedById: currentUser?.id || null,
            updatedAt: new Date().toISOString(),
            collectionName,
            recordId: parseInt(recordId),
            folderId: projectFolderId ? parseInt(projectFolderId) : null,
            createdById: currentUser?.id || null,
            createdAt: new Date().toISOString(),
            batchId,
            ...(attIds && { fileAttachment: attIds }),
          };
          await apiReq("documents:create", "POST", payload);
        }
      }
      setBody("");
      setAssignedIds([]);
      setPendingDocs([]);
      reload();
      message.success("Comment posted");
    } catch (e) {
      message.error("Error: " + (e?.message || "Try again"));
    }
    setSending(false);
  };

  const handleSaveEdit = async (noteId) => {
    const newBody = editBody.trim();
    if (!newBody) return;
    const currentNoteItem = feed.find(
      (item) => item.note && item.note.id === noteId,
    );
    const oldBody = currentNoteItem?.note?.body || "";
    if (oldBody === newBody) {
      setEditingNoteId(null);
      setEditBody("");
      return;
    }
    try {
      await apiReq(`notes:update?filterByTk=${noteId}`, "POST", {
        body: newBody,
      });
      await logAct(
        collectionName,
        recordId,
        "updated",
        "Comment",
        oldBody,
        newBody,
        currentUser
          ? currentUser.nickname || currentUser.username || currentUser.email
          : "System",
      );
      setFeed((prev) =>
        prev.map((item) => {
          if (item.note && item.note.id === noteId)
            return { ...item, note: { ...item.note, body: newBody } };
          return item;
        }),
      );
      setEditingNoteId(null);
      setEditBody("");
      message.success("Comment updated");
    } catch (e) {
      message.error("Update failed");
    }
  };

  const renderFileRow = (f) => {
    const att = Array.isArray(f.fileAttachment)
      ? f.fileAttachment[0]
      : f.fileAttachment;
    let originalName = att?.filename || "File";
    let ext = att?.extname
      ? att.extname.startsWith(".")
        ? att.extname.toLowerCase()
        : "." + att.extname.toLowerCase()
      : "";
    if (ext && originalName.toLowerCase().endsWith(ext))
      originalName = originalName.slice(0, -ext.length);
    const finalFileName = originalName + ext;
    const customTitle =
      f.title && f.title !== originalName && f.title !== finalFileName
        ? f.title
        : null;
    const fullUrl = getFullUrl(att?.url || att?.preview);

    return React.createElement(
      "div",
      {
        key: f.id,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginTop: 8,
          background: "#fff",
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid #e8e8e8",
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        React.createElement(
          "span",
          {
            onClick: fullUrl ? () => setPreviewDoc(f) : undefined,
            style: {
              fontSize: 13,
              fontFamily: FONT,
              color: "#096dd9",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: fullUrl ? "pointer" : "default",
              textDecoration: fullUrl ? "underline" : "none",
              textUnderlineOffset: 3,
              fontWeight: 600,
            },
          },
          finalFileName,
        ),
        fullUrl &&
          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                window.open(fullUrl, "_blank");
              },
              style: {
                fontSize: 12,
                fontWeight: 600,
                color: "#531dab",
                cursor: "pointer",
                flexShrink: 0,
                padding: "2px 8px",
                background: "#f9f0ff",
                borderRadius: 4,
                border: "1px solid #d3adf7",
              },
            },
            "Download",
          ),
      ),
      customTitle &&
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              color: "#262626",
              fontFamily: FONT,
              marginTop: 2,
            },
          },
          React.createElement(
            "span",
            { style: { fontWeight: 600, color: "#8c8c8c", marginRight: 4 } },
            "Document Title:",
          ),
          customTitle,
        ),
      f.note &&
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              color: "#262626",
              fontFamily: FONT,
              marginTop: 4,
              padding: "6px 10px",
              background: "#fafafa",
              borderRadius: 4,
              border: "1px solid #f0f0f0",
            },
          },
          React.createElement(
            "span",
            { style: { fontWeight: 700, color: "#8c8c8c", marginRight: 6 } },
            "Notes:",
          ),
          f.note,
        ),
    );
  };

  const renderItem = (item, key) => {
    const { note, files } = item;
    const firstFile = files[0];
    const creatorName = note
      ? authorName(note)
      : firstFile?.createdBy
        ? userName(firstFile.createdBy) || firstFile.createdBy?.email
        : "System";
    const time = note?.createdAt || firstFile?.createdAt;
    const hasBody = !!note?.body;
    const hasFiles = files.length > 0;
    const isMyComment =
      note && currentUser && note.createdById === currentUser.id;
    const isEditing = note && editingNoteId === note.id;

    return React.createElement(
      "div",
      {
        key,
        style: {
          display: "flex",
          gap: 12,
          padding: "16px 20px",
          borderBottom: "1px solid #f0f0f0",
          background: "#fff",
        },
      },
      React.createElement(Av, {
        name: creatorName,
        color: "#1890ff",
        size: 30,
      }),
      React.createElement(
        "div",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 6,
              flexWrap: "wrap",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: 13,
                fontFamily: FONT,
                fontWeight: 700,
                color: "#1a1a1a",
              },
            },
            creatorName,
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                fontFamily: FONT,
                color: "#bfbfbf",
                marginLeft: "auto",
              },
            },
            timeAgo(time),
          ),
        ),
        isEditing
          ? React.createElement(
              "div",
              { style: { marginTop: 4 } },
              React.createElement("textarea", {
                value: editBody,
                onChange: (e) => setEditBody(e.target.value),
                onKeyDown: (e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleSaveEdit(note.id);
                  }
                },
                placeholder: "Enter content... (Ctrl + Enter to save)",
                style: {
                  width: "100%",
                  border: "1px solid #1890ff",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontSize: 13,
                  fontFamily: FONT,
                  outline: "none",
                  resize: "vertical",
                  minHeight: 60,
                  boxSizing: "border-box",
                },
                autoFocus: true,
              }),
              React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    marginTop: 8,
                  },
                },
                React.createElement(
                  "span",
                  {
                    onClick: () => setEditingNoteId(null),
                    style: {
                      fontSize: 12,
                      padding: "4px 12px",
                      cursor: "pointer",
                      color: "#595959",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                    },
                  },
                  "Cancel",
                ),
                React.createElement(
                  "span",
                  {
                    onClick: () => handleSaveEdit(note.id),
                    style: {
                      fontSize: 12,
                      padding: "4px 16px",
                      cursor: "pointer",
                      color: "#fff",
                      background: "#1890ff",
                      borderRadius: 4,
                      fontWeight: 600,
                    },
                  },
                  "Save",
                ),
              ),
            )
          : (hasBody || hasFiles) &&
              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 13,
                      fontFamily: FONT,
                      color: "#262626",
                      lineHeight: 1.7,
                      background: "#f8f9fa",
                      borderRadius: 8,
                      padding: "12px 14px",
                      borderLeft: "3px solid #1890ff",
                    },
                  },
                  hasBody &&
                    React.createElement(
                      "div",
                      {
                        style: {
                          whiteSpace: "pre-wrap",
                          marginBottom: hasFiles ? 8 : 0,
                        },
                      },
                      ...React.Children.toArray(
                        renderTextWithMentions(note.body, lawyers),
                      ),
                    ),
                  ...files.map((f) => renderFileRow(f)),
                ),
                canEdit &&
                  isMyComment &&
                  !isEditing &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 6,
                        paddingLeft: 4,
                      },
                    },
                    React.createElement(
                      "span",
                      {
                        onClick: () => {
                          setEditingNoteId(note.id);
                          setEditBody(note.body || "");
                        },
                        style: {
                          fontSize: 12,
                          fontFamily: FONT,
                          color: "#595959",
                          cursor: "pointer",
                          textDecoration: "underline",
                          textUnderlineOffset: "2px",
                        },
                        onMouseEnter: (e) =>
                          (e.currentTarget.style.color = "#1890ff"),
                        onMouseLeave: (e) =>
                          (e.currentTarget.style.color = "#595959"),
                      },
                      "Edit",
                    ),
                  ),
              ),
      ),
    );
  };

  const renderPendingChips = () => {
    if (pendingDocs.length === 0) return null;
    return React.createElement(
      "div",
      {
        style: {
          display: "flex",
          gap: 6,
          flexDirection: "column",
          marginTop: 12,
        },
      },
      ...pendingDocs.map((doc, i) => {
        const name = doc.metadata.title || doc.fileName || "Document";
        return React.createElement(
          "div",
          {
            key: i,
            style: {
              display: "flex",
              flexDirection: "column",
              background: "#f0f0f0",
              border: "1px solid #d9d9d9",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 12,
              fontFamily: FONT,
            },
          },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 6 } },
            React.createElement(
              "span",
              {
                style: {
                  color: "#262626",
                  fontWeight: 600,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              name,
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  color: "#fa8c16",
                  background: "#fff7e6",
                  padding: "1px 6px",
                  borderRadius: 10,
                  border: "1px solid #ffd591",
                  fontWeight: 600,
                },
              },
              "Pending",
            ),
            React.createElement(
              "span",
              {
                onClick: () =>
                  setPendingDocs((p) => p.filter((_, j) => j !== i)),
                style: {
                  color: "#cf1322",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 16,
                  lineHeight: 1,
                  marginLeft: 4,
                },
              },
              "×",
            ),
          ),
          doc.metadata.note &&
            React.createElement(
              "div",
              {
                style: {
                  marginTop: 6,
                  color: "#262626",
                  padding: "6px 10px",
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: 4,
                },
              },
              React.createElement(
                "span",
                {
                  style: { fontWeight: 700, color: "#8c8c8c", marginRight: 6 },
                },
                "Notes:",
              ),
              doc.metadata.note,
            ),
        );
      }),
    );
  };

  const canSend =
    (body.trim().length > 0 || pendingDocs.length > 0) && !sending;
  const visibleFeed = showAll ? feed : feed.slice(0, INITIAL_COUNT);
  const hasMore = feed.length > INITIAL_COUNT;

  return React.createElement(
    "div",
    { style: { height: "100%", overflowY: "auto", background: "#fff" } },
    canEdit &&
      React.createElement(
        "div",
        {
          style: {
            padding: "16px 20px",
            borderBottom: "4px solid #f0f0f0",
            background: "#fff",
          },
        },
        React.createElement(MentionInput, {
          value: body,
          onChange: setBody,
          onAssignMultiple: (ids) => setAssignedIds(ids),
          assignedIds,
          lawyers,
          placeholder: "Write a comment... (Ctrl + Enter to send)",
          onSubmit: canSend ? handleSend : undefined,
        }),
        renderPendingChips(),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap",
            },
          },
          React.createElement(
            "div",
            {
              onClick: () => setShowUploadModal(true),
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontFamily: FONT,
                padding: "5px 12px",
                borderRadius: 6,
                cursor: "pointer",
                userSelect: "none",
                fontWeight: 600,
                border: "1px solid #e8e8e8",
                background: "#fff",
                color: "#595959",
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.background = "#f5f5f5";
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.background = "#fff";
              },
            },
            "Attach Document",
          ),
          React.createElement(
            "div",
            {
              onClick: canSend ? handleSend : undefined,
              style: {
                marginLeft: "auto",
                padding: "6px 18px",
                borderRadius: 6,
                fontSize: 13,
                fontFamily: FONT,
                fontWeight: 700,
                background: !canSend ? "#f0f0f0" : "#1890ff",
                color: !canSend ? "#bfbfbf" : "#fff",
                cursor: !canSend ? "not-allowed" : "pointer",
                border: "none",
              },
            },
            sending ? "Sending..." : "Comment",
          ),
        ),
      ),
    React.createElement(
      "div",
      { style: { paddingBottom: 24 } },
      loading
        ? React.createElement(
            "div",
            { style: { textAlign: "center", padding: "24px 0" } },
            React.createElement(Spin, { size: "small" }),
          )
        : feed.length === 0
          ? React.createElement(
              "div",
              {
                style: {
                  textAlign: "center",
                  padding: "32px 0",
                  fontSize: 13,
                  fontFamily: FONT,
                  color: "#bfbfbf",
                },
              },
              "No comments or documents yet",
            )
          : React.createElement(
              "div",
              null,
              ...visibleFeed.map((item, i) => renderItem(item, `item-${i}`)),
              hasMore &&
                React.createElement(
                  "div",
                  {
                    onClick: () => setShowAll((v) => !v),
                    style: {
                      margin: "16px",
                      textAlign: "center",
                      fontSize: 12,
                      fontFamily: FONT,
                      color: "#1890ff",
                      cursor: "pointer",
                      padding: "7px 0",
                      border: "1px dashed #91caff",
                      borderRadius: 6,
                      background: "#f0f8ff",
                    },
                    onMouseEnter: (e) =>
                      (e.currentTarget.style.background = "#d6ecff"),
                    onMouseLeave: (e) =>
                      (e.currentTarget.style.background = "#f0f8ff"),
                  },
                  showAll
                    ? `▲ Collapse (showing ${INITIAL_COUNT} of ${feed.length})`
                    : `▼ View more (${feed.length - INITIAL_COUNT} more)`,
                ),
            ),
    ),
    previewDoc &&
      React.createElement(PreviewModal, {
        doc: previewDoc,
        onClose: () => setPreviewDoc(null),
      }),
    React.createElement(FileUploadModal, {
      open: showUploadModal,
      onClose: () => setShowUploadModal(false),
      onAddPending: (newDocData) =>
        setPendingDocs((prev) => [...prev, newDocData]),
      collectionName,
      recordId,
      currentUser,
    }),
  );
};
// ── Shared micro-components ────────────────────────────────────────
const Av = ({ name, color, size = 20 }) =>
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

const SBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.toDo;
  return React.createElement(
    "span",
    {
      style: {
        fontSize: 11,
        fontFamily: FONT,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 3,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
      },
    },
    c.label,
  );
};

// ── Status change button (circle) ──────────────────────────────────
const SBtn = ({ status, size = 15, onChange }) => {
  const [open, setOpen] = useState(false);
  const c = STATUS_CFG[status] || STATUS_CFG.toDo;
  return React.createElement(
    "div",
    { style: { position: "relative", flexShrink: 0 } },
    React.createElement(
      "div",
      {
        onClick: (e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        },
        title: c.label,
        style: {
          width: size,
          height: size,
          borderRadius: "50%",
          border: `2px solid ${c.color}`,
          background:
            status === "done"
              ? c.color
              : status === "inProgress"
                ? `${c.color}25`
                : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
      },
      status === "done" &&
        React.createElement(
          "span",
          { style: { color: "#fff", fontSize: size * 0.6, lineHeight: 1 } },
          "✓",
        ),
      status === "cancelled" &&
        React.createElement(
          "span",
          { style: { color: c.color, fontSize: size * 0.6, lineHeight: 1 } },
          "×",
        ),
    ),
    open &&
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            top: size + 4,
            left: 0,
            zIndex: 9999,
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            padding: "4px 0",
            minWidth: 160,
          },
          onMouseLeave: () => setOpen(false),
        },
        ...Object.entries(STATUS_CFG).map(([k, v]) =>
          React.createElement(
            "div",
            {
              key: k,
              onClick: (e) => {
                e.stopPropagation();
                onChange && onChange(k);
                setOpen(false);
              },
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: FONT,
              },
              onMouseEnter: (e) =>
                (e.currentTarget.style.background = "#f5f5f5"),
              onMouseLeave: (e) =>
                (e.currentTarget.style.background = "transparent"),
            },
            React.createElement("div", {
              style: {
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: v.color,
                flexShrink: 0,
              },
            }),
            React.createElement(
              "span",
              { style: { color: "#262626" } },
              v.label,
            ),
          ),
        ),
      ),
  );
};

// ══════════════════════════════════════════════════════════════════
//  KanbanCard
// ══════════════════════════════════════════════════════════════════
const KanbanCard = ({ item, type, onOpen, dragging }) => {
  const cfg = STATUS_CFG[item.status] || STATUS_CFG.toDo;
  const pr = item.priority ? PRIORITY_CFG[item.priority] : null;
  const dl = type === "subtask" ? item.deadline : item.dueDate;
  const sd = type === "subtask" ? item.date : item.startDate;
  const isOd = isOD(dl, item.status);
  const isDone = item.status === "done";
  const isSub = type === "subtask";
  const name = isSub ? item.subTaskName : item.title;

  return React.createElement(
    "div",
    {
      onClick: () => onOpen(item, type),
      style: {
        background: "#fff",
        borderRadius: 10,
        border: `1px solid ${isOd ? "#ffa39e" : "#f0f0f0"}`,
        borderLeft: `4px solid ${cfg.color}`,
        padding: "12px 13px",
        cursor: "pointer",
        boxShadow: dragging
          ? "0 8px 24px rgba(0,0,0,0.18)"
          : "0 1px 4px rgba(0,0,0,0.06)",
        transform: dragging ? "rotate(2deg)" : "none",
        transition: "box-shadow 0.15s, transform 0.15s",
        userSelect: "none",
      },
      onMouseEnter: (e) => {
        if (!dragging)
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.12)";
      },
      onMouseLeave: (e) => {
        if (!dragging)
          e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
      },
    },

    // ── Title row ──
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          marginBottom: 8,
        },
      },
      isSub &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 8,
              background: "#f9f0ff",
              color: "#531dab",
              fontWeight: 600,
              flexShrink: 0,
              marginTop: 2,
            },
          },
          "↳ Sub",
        ),
      React.createElement(
        Text,
        {
          style: {
            fontSize: 13,
            fontFamily: FONT,
            fontWeight: 600,
            flex: 1,
            lineHeight: 1.4,
            color: isDone ? "#bfbfbf" : isOd ? "#cf1322" : "#1a1a1a",
            textDecoration: isDone ? "line-through" : "none",
          },
        },
        name,
      ),
    ),

    // ── Priority ──
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 8,
        },
      },
      item.priority &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              fontFamily: FONT,
              padding: "2px 7px",
              borderRadius: 3,
              background: pr.bg,
              color: pr.color,
              fontWeight: 600,
            },
          },
          `${pr.icon} ${pr.label}`,
        ),
      isOd &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 10,
              fontFamily: FONT,
              fontWeight: 600,
              padding: "1px 7px",
              borderRadius: 8,
              background: "#fff1f0",
              color: "#cf1322",
              border: "1px solid #ffa39e",
            },
          },
          "⚠ Overdue",
        ),
    ),

    // ── Assignee ──
    item._assigneeName &&
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 8,
          },
        },
        React.createElement(Av, {
          name: item._assigneeName,
          color: LAWYER_COLORS[0],
          size: 16,
        }),
        React.createElement(
          "span",
          { style: { fontSize: 11, fontFamily: FONT, color: "#595959" } },
          item._assigneeName,
        ),
      ),

    // ── Dates ──
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 3,
          fontSize: 11,
          fontFamily: FONT,
        },
      },
      sd &&
        React.createElement(
          "span",
          { style: { color: "#8c8c8c" } },
          `📅 Start: ${fmt(sd, "full") || "—"}`,
        ),
      dl &&
        React.createElement(
          "span",
          {
            style: {
              color: isOd ? "#cf1322" : "#8c8c8c",
              fontWeight: isOd ? 600 : 400,
            },
          },
          `🏁 Deadline: ${fmt(dl, "full") || "—"}`,
        ),
    ),
  );
};

// ══════════════════════════════════════════════════════════════════
//  KanbanView  (used as child component)
//  Props: tasks, subs, onOpen, onStatusChange
// ══════════════════════════════════════════════════════════════════
const KanbanView = ({ tasks, subs, onOpen, onStatusChange }) => {
  const [dragOver, setDragOver] = useState(null);

  const columns = useMemo(() => {
    const cols = {};
    Object.keys(STATUS_CFG).forEach((k) => {
      cols[k] = [];
    });
    tasks.forEach((t) => {
      if (cols[t.status]) cols[t.status].push({ item: t, type: "task" });
    });
    subs.forEach((s) => {
      if (cols[s.status]) cols[s.status].push({ item: s, type: "subtask" });
    });
    return cols;
  }, [tasks, subs]);

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        gap: 10,
        height: "calc(100vh - 220px)",
        overflowX: "auto",
        overflowY: "hidden",
        padding: "0 0 8px",
      },
    },
    ...Object.entries(STATUS_CFG).map(([key, cfg]) =>
      React.createElement(
        "div",
        {
          key,
          style: {
            flex: "1 1 0",
            minWidth: 260,
            maxWidth: 340,
            display: "flex",
            flexDirection: "column",
            borderRadius: 10,
            border: `2px solid ${dragOver === key ? cfg.color : "#e8e8e8"}`,
            background: dragOver === key ? cfg.bg : "#f7f8fa",
            overflow: "hidden",
            transition: "border-color 0.15s, background 0.15s",
          },
          onDragOver: (e) => {
            e.preventDefault();
            setDragOver(key);
          },
          onDragLeave: (e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null);
          },
          onDrop: (e) => {
            e.preventDefault();
            setDragOver(null);
            try {
              const data = JSON.parse(e.dataTransfer.getData("text/plain"));
              const allItems = [
                ...tasks.map((t) => ({ item: t, type: "task" })),
                ...subs.map((s) => ({ item: s, type: "subtask" })),
              ];
              const found = allItems.find(
                (x) => x.item.id === data.id && x.type === data.type,
              );
              if (found && found.item.status !== key)
                onStatusChange(found.item, found.type, key);
            } catch {}
          },
        },

        // ── Column header ──
        React.createElement(
          "div",
          {
            style: {
              padding: "10px 14px",
              background: cfg.bg,
              borderBottom: `1px solid ${cfg.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            },
          },
          React.createElement("div", {
            style: {
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: cfg.color,
              flexShrink: 0,
            },
          }),
          React.createElement(
            Text,
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                fontWeight: 700,
                color: cfg.color,
                flex: 1,
              },
            },
            cfg.label,
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                fontFamily: FONT,
                background: cfg.color,
                color: "#fff",
                borderRadius: 10,
                padding: "1px 8px",
                fontWeight: 700,
              },
            },
            columns[key]?.length || 0,
          ),
        ),

        // ── Cards ──
        React.createElement(
          "div",
          {
            style: {
              flex: 1,
              overflowY: "auto",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            },
          },
          columns[key]?.length === 0
            ? React.createElement(
                "div",
                {
                  style: {
                    textAlign: "center",
                    padding: "32px 0",
                    color: "#d9d9d9",
                    fontSize: 12,
                    fontFamily: FONT,
                    border: "1.5px dashed #e8e8e8",
                    borderRadius: 8,
                  },
                },
                "Drop here",
              )
            : columns[key].map(({ item, type }) =>
                React.createElement(
                  "div",
                  {
                    key: `${type}_${item.id}`,
                    draggable: true,
                    onDragStart: (e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({ id: item.id, type }),
                      );
                      e.currentTarget.style.opacity = "0.4";
                    },
                    onDragEnd: (e) => {
                      e.currentTarget.style.opacity = "1";
                    },
                    style: { cursor: "grab" },
                  },
                  React.createElement(KanbanCard, { item, type, onOpen }),
                ),
              ),
        ),
      ),
    ),
  );
};

// ══════════════════════════════════════════════════════════════════
//  KanbanBoard  — standalone self-contained component
//  Fetches its own data. Renders with full toolbar + filters.
// ══════════════════════════════════════════════════════════════════
const KanbanBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myLawyer, setMyLawyer] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [stFilter, setStFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null); // { item, type }
  const [lawyers, setLawyers] = useState([]);

  // ── Load data ──
  const reload = useCallback(async () => {
    setLoading(true);
    const user = await getCurrentUser();
    setCurrentUser(user);
    if (!user) {
      setLoading(false);
      return;
    }

    const lawyers = await fetchAll(
      "lawyers:list",
      "id,lawyerName,unitPrice,lawyerType,userId",
    );
    setLawyers(lawyers);
    const resolveUid = (l) => {
      if (l.userId == null) return null;
      if (typeof l.userId === "object") return l.userId?.id;
      return l.userId;
    };
    const me = lawyers.find((l) => String(resolveUid(l)) === String(user.id));

    const roles = user.roles || [];
    const roleNames = roles
      .map((r) => (typeof r === "string" ? r : r?.name || ""))
      .map((s) => s.toLowerCase());
    const isAdmin = roleNames.some((r) =>
      ["admin", "root", "super admin", "superadmin"].includes(r),
    );
    setIsAdminView(isAdmin);

    const lawyerNameById = {};
    lawyers.forEach((l) => {
      lawyerNameById[String(l.id)] = l.lawyerName;
    });

    const effectiveLawyer =
      me ||
      (isAdmin
        ? {
            id: -1,
            lawyerName: user.nickname || user.username || "Admin",
            lawyerType: "partner",
            unitPrice: 0,
          }
        : null);
    setMyLawyer(effectiveLawyer || null);
    if (!effectiveLawyer) {
      setLoading(false);
      return;
    }

    const taskFilter =
      isAdmin && !me ? {} : { lawyerId: { $eq: effectiveLawyer.id } };
    const subFilter =
      isAdmin && !me ? {} : { lawyerId: { $eq: effectiveLawyer.id } };

    const [rawTasks, rawSubs] = await Promise.all([
      fetchAll(
        "tasks:list",
        "id,title,status,priority,startDate,dueDate,closedDate,lawyerId,projectId,description,estimatedDuration,isRequiredApproval",
        Object.keys(taskFilter).length > 0 ? taskFilter : undefined,
      ),
      fetchAll(
        "subTasks:list",
        "id,subTaskName,status,priority,date,deadline,closedDate,lawyerId,taskId,description,estimatedDuration,isRequiredApproval",
        Object.keys(subFilter).length > 0 ? subFilter : undefined,
      ),
    ]);

    // Resolve project caseCode
    const projectIds = [
      ...new Set(rawTasks.map((t) => t.projectId).filter(Boolean)),
    ];
    let caseCodeMap = {};
    if (projectIds.length > 0) {
      const projs = await fetchAll("projects:list", "id,caseCode", {
        id: { $in: projectIds },
      });
      projs.forEach((p) => {
        caseCodeMap[p.id] = p.caseCode || null;
      });
    }

    const taskTitleMap = {};
    rawTasks.forEach((t) => {
      taskTitleMap[t.id] = t.title;
    });

    setTasks(
      rawTasks.map((t) => ({
        ...t,
        _type: "task",
        _od: isOD(t.dueDate, t.status),
        _today: isToday(t.dueDate),
        _caseCode: caseCodeMap[t.projectId] || null,
        _assigneeName: lawyerNameById[String(t.lawyerId)] || null,
      })),
    );

    setSubs(
      rawSubs.map((s) => {
        const parentTask =
          rawTasks.find(
            (t) => t.id === s.taskId || String(t.id) === String(s.taskId),
          ) || {};
        return {
          ...s,
          _type: "subtask",
          _od: isOD(s.deadline, s.status),
          _today: isToday(s.deadline),
          _parentTitle: taskTitleMap[s.taskId] || null,
          _caseCode: caseCodeMap[parentTask.projectId] || null,
          _assigneeName: lawyerNameById[String(s.lawyerId)] || null,
          projectId: parentTask.projectId,
        };
      }),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, []);

  // ── Status change handler ──
  const handleStatusChange = useCallback(async (item, type, newStatus) => {
    const url =
      type === "subtask"
        ? `subTasks:update?filterByTk=${item.id}`
        : `tasks:update?filterByTk=${item.id}`;
    const data =
      newStatus === "done"
        ? { status: newStatus, closedDate: new Date().toISOString() }
        : { status: newStatus, closedDate: null };
    try {
      await apiReq(url, "POST", data);
      if (type === "task")
        setTasks((p) =>
          p.map((t) => (t.id === item.id ? { ...t, ...data } : t)),
        );
      else
        setSubs((p) =>
          p.map((s) => (s.id === item.id ? { ...s, ...data } : s)),
        );
      message.success(`→ ${STATUS_CFG[newStatus]?.label}`);
    } catch {
      message.error("Update failed");
    }
  }, []);

  // ── Filter ──
  const fTasks = useMemo(
    () =>
      tasks
        .filter((t) => stFilter === "all" || t.status === stFilter)
        .filter(
          (t) =>
            !search.trim() ||
            (t.title || "").toLowerCase().includes(search.toLowerCase()),
        ),
    [tasks, stFilter, search],
  );

  const fSubs = useMemo(
    () =>
      subs
        .filter((s) => stFilter === "all" || s.status === stFilter)
        .filter(
          (s) =>
            !search.trim() ||
            (s.subTaskName || "").toLowerCase().includes(search.toLowerCase()),
        ),
    [subs, stFilter, search],
  );

  // ── Stats ──
  const tDone =
    tasks.filter((t) => t.status === "done").length +
    subs.filter((s) => s.status === "done").length;
  const total = tasks.length + subs.length;
  const pct = total > 0 ? Math.round((tDone / total) * 100) : 0;
  const overdue = [...tasks, ...subs].filter((i) => i._od).length;
  const todayDue = [...tasks, ...subs].filter((i) => i._today).length;

  const LAWYER_TYPE_CFG_LOCAL = {
    partner: { label: "Partner", color: "#531dab", bg: "#f9f0ff" },
    lawyer: { label: "Lawyer", color: "#096dd9", bg: "#e6f4ff" },
    associate: { label: "Associate", color: "#08979c", bg: "#e6fffb" },
    suppliant: { label: "Legal Assistant", color: "#d46b08", bg: "#fff7e6" },
  };
  const lt = myLawyer
    ? LAWYER_TYPE_CFG_LOCAL[myLawyer.lawyerType] || {
        label: myLawyer.lawyerType || "Admin",
        color: "#531dab",
        bg: "#f9f0ff",
      }
    : { label: "Unidentified", color: "#8c8c8c", bg: "#f5f5f5" };

  const bS = (active) => ({
    fontSize: 12,
    padding: "5px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: FONT,
    userSelect: "none",
    fontWeight: active ? 600 : 400,
    background: active ? "#1890ff" : "#fff",
    color: active ? "#fff" : "#595959",
    border: `1px solid ${active ? "#1890ff" : "#e8e8e8"}`,
    transition: "all 0.15s",
  });

  return (
    React.createElement(
      "div",
      {
        style: {
          fontFamily: FONT,
          background: "#f5f5f5",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        },
      },

      // ── Toolbar ──
      React.createElement(
        "div",
        {
          style: {
            background: "#fff",
            borderBottom: "1px solid #e8e8e8",
            padding: "16px 24px",
            flexShrink: 0,
          },
        },

        // ── Top row: identity + reload ──
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            },
          },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 12 } },
            React.createElement(Av, {
              name: myLawyer?.lawyerName || "—",
              color: lt.color,
              size: 40,
            }),
            React.createElement(
              "div",
              null,
              React.createElement(
                Text,
                {
                  strong: true,
                  style: {
                    fontSize: 18,
                    fontFamily: FONT,
                    color: "#1a1a1a",
                    display: "block",
                  },
                },
                loading
                  ? "..."
                  : myLawyer?.lawyerName || "No linked lawyer profile",
              ),
              React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 4,
                  },
                },
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 12,
                      fontFamily: FONT,
                      padding: "2px 10px",
                      borderRadius: 10,
                      background: lt.bg,
                      color: lt.color,
                      fontWeight: 600,
                    },
                  },
                  lt.label,
                ),
                isAdminView &&
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 11,
                        fontFamily: FONT,
                        padding: "2px 10px",
                        borderRadius: 10,
                        background: "#f9f0ff",
                        color: "#531dab",
                        fontWeight: 700,
                        border: "1px solid #d3adf7",
                      },
                    },
                    "👑 Admin View",
                  ),
              ),
            ),
          ),
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 8 } },
            React.createElement(
              "div",
              {
                onClick: reload,
                style: {
                  padding: "6px 14px",
                  borderRadius: 4,
                  border: "1px solid #e8e8e8",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#595959",
                },
              },
              "↻ Refresh",
            ),
            React.createElement(
              "div",
              {
                style: {
                  padding: "4px 12px",
                  borderRadius: 6,
                  background: "#e6f4ff",
                  color: "#096dd9",
                  fontSize: 12,
                  fontFamily: FONT,
                  fontWeight: 700,
                  border: "1px solid #91caff",
                },
              },
              "🗂 Kanban",
            ),
          ),
        ),

        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 14,
            },
          },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 8 } },
            React.createElement(
              "div",
              {
                style: {
                  width: 140,
                  height: 6,
                  borderRadius: 3,
                  background: "#e0e0e0",
                  overflow: "hidden",
                },
              },
              React.createElement("div", {
                style: {
                  width: `${pct}%`,
                  height: "100%",
                  background: pct === 100 ? "#389e0d" : "#1890ff",
                  borderRadius: 3,
                  transition: "width 0.4s",
                },
              }),
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: pct === 100 ? "#389e0d" : "#8c8c8c",
                },
              },
              loading ? "Loading..." : `${tDone}/${total} completed (${pct}%)`,
            ),
          ),
          todayDue > 0 &&
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#d46b08",
                  background: "#fff7e6",
                  padding: "2px 10px",
                  borderRadius: 8,
                  border: "1px solid #ffd591",
                },
              },
              `📅 ${todayDue} due today`,
            ),
          overdue > 0 &&
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#cf1322",
                  background: "#fff1f0",
                  padding: "2px 10px",
                  borderRadius: 8,
                  border: "1px solid #ffa39e",
                },
              },
              `⚠ ${overdue} overdue`,
            ),
        ),

        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            },
          },
          React.createElement("input", {
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "🔍 Search tasks...",
            style: {
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #e8e8e8",
              fontSize: 12,
              fontFamily: FONT,
              outline: "none",
              minWidth: 220,
            },
            onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
            onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
          }),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
            [
              ["all", "All"],
              ["toDo", "To Do"],
              ["inProgress", "In Progress"],
              ["blocked", "Blocked"],
              ["pending", "Pending"],
              ["done", "Done"],
              ["cancelled", "Cancelled"],
            ].map(([k, label]) =>
              React.createElement(
                "div",
                {
                  key: k,
                  onClick: () => setStFilter(k),
                  style: bS(stFilter === k),
                },
                label,
              ),
            ),
          ),
        ),
      ),

      // ── Kanban board body ──
      React.createElement(
        "div",
        { style: { flex: 1, padding: "16px 24px", overflowY: "hidden" } },
        loading
          ? React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "calc(100vh - 280px)",
                },
              },
              React.createElement(Spin, { size: "large" }),
              React.createElement(
                "div",
                {
                  style: {
                    marginTop: 16,
                    fontSize: 13,
                    fontFamily: FONT,
                    color: "#8c8c8c",
                  },
                },
                "Loading tasks...",
              ),
            )
          : React.createElement(KanbanView, {
              tasks: fTasks,
              subs: fSubs,
              onOpen: (item, type) => setDetail({ item, type }),
              onStatusChange: handleStatusChange,
            }),
      ),

      // ── Simple detail side-panel (status-only, opens in modal) ──
      // ── 2-Column Detail Modal (TaskManagement-like layout) ──
      detail &&
        React.createElement(
          Modal,
          {
            open: true,
            onCancel: () => setDetail(null),
            footer: null,
            width: 1200,
            centered: true,
            bodyStyle: {
              padding: 0,
              height: "70vh",
              display: "flex",
              flexDirection: "column",
            },
            style: { fontFamily: FONT, top: 40 },
            title: React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 10 } },
              React.createElement(SBtn, {
                status: detail.item.status,
                size: 16,
                onChange: async (newSt) => {
                  await handleStatusChange(detail.item, detail.type, newSt);
                  setDetail((d) =>
                    d ? { ...d, item: { ...d.item, status: newSt } } : null,
                  );
                },
              }),
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 16,
                    fontWeight: 600,
                    fontFamily: FONT,
                    color: "#1a1a1a",
                    lineHeight: 1.4,
                  },
                },
                detail.type === "subtask"
                  ? detail.item.subTaskName
                  : detail.item.title,
              ),
              React.createElement(SBadge, { status: detail.item.status }),
            ),
          },
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "4fr 6fr",
                flex: 1,
                overflow: "hidden",
                borderTop: "1px solid #e8e8e8",
              },
            },

            // ── LEFT COLUMN (40%) — Task Details ──
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  borderRight: "1px solid #e8e8e8",
                  overflowY: "auto",
                  padding: "20px 24px",
                  background: "#fafafa",
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#262626",
                    marginBottom: 12,
                  },
                },
                "Information",
              ),

              // Status & Priority Grid
              React.createElement(
                "div",
                {
                  style: {
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 16,
                  },
                },
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 11,
                        color: "#8c8c8c",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      },
                    },
                    "Status",
                  ),
                  React.createElement(Select, {
                    value: detail.item.status,
                    onChange: async (val) => {
                      await handleStatusChange(detail.item, detail.type, val);
                      setDetail((d) =>
                        d ? { ...d, item: { ...d.item, status: val } } : null,
                      );
                    },
                    style: { width: "100%", fontFamily: FONT },
                    options: Object.entries(STATUS_CFG).map(([k, v]) => ({
                      label: React.createElement(
                        "div",
                        {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          },
                        },
                        React.createElement("div", {
                          style: {
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: v.color,
                          },
                        }),
                        v.label,
                      ),
                      value: k,
                    })),
                  }),
                ),
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 11,
                        color: "#8c8c8c",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      },
                    },
                    "Priority",
                  ),
                  React.createElement(Select, {
                    value: detail.item.priority || "medium",
                    onChange: async (val) => {
                      const url =
                        detail.type === "subtask"
                          ? `subTasks:update?filterByTk=${detail.item.id}`
                          : `tasks:update?filterByTk=${detail.item.id}`;
                      await apiReq(url, "POST", { priority: val });
                      setDetail((d) =>
                        d ? { ...d, item: { ...d.item, priority: val } } : null,
                      );
                      if (detail.type === "task")
                        setTasks((p) =>
                          p.map((t) =>
                            t.id === detail.item.id
                              ? { ...t, priority: val }
                              : t,
                          ),
                        );
                      else
                        setSubs((p) =>
                          p.map((s) =>
                            s.id === detail.item.id
                              ? { ...s, priority: val }
                              : s,
                          ),
                        );
                      message.success("Priority updated");
                    },
                    style: { width: "100%", fontFamily: FONT },
                    options: Object.entries(PRIORITY_CFG).map(([k, v]) => ({
                      label: `${v.icon} ${v.label}`,
                      value: k,
                    })),
                  }),
                ),
              ),

              // Estimated & Assignee Grid
              React.createElement(
                "div",
                {
                  style: {
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 16,
                  },
                },
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 11,
                        color: "#8c8c8c",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      },
                    },
                    "Estimate",
                  ),
                  React.createElement(
                    "div",
                    {
                      style: { display: "flex", alignItems: "center", gap: 8 },
                    },
                    React.createElement("input", {
                      type: "number",
                      step: "0.5",
                      defaultValue: detail.item.estimatedDuration || 0,
                      style: {
                        padding: "5px 10px",
                        borderRadius: 4,
                        border: "1px solid #d9d9d9",
                        width: "100%",
                        outline: "none",
                        fontSize: 12,
                      },
                      onBlur: async (e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const url =
                          detail.type === "subtask"
                            ? `subTasks:update?filterByTk=${detail.item.id}`
                            : `tasks:update?filterByTk=${detail.item.id}`;
                        await apiReq(url, "POST", { estimatedDuration: val });
                        setDetail((d) =>
                          d
                            ? {
                                ...d,
                                item: { ...d.item, estimatedDuration: val },
                              }
                            : null,
                        );
                        if (detail.type === "task")
                          setTasks((p) =>
                            p.map((t) =>
                              t.id === detail.item.id
                                ? { ...t, estimatedDuration: val }
                                : t,
                            ),
                          );
                        else
                          setSubs((p) =>
                            p.map((s) =>
                              s.id === detail.item.id
                                ? { ...s, estimatedDuration: val }
                                : s,
                            ),
                          );
                      },
                    }),
                    React.createElement(
                      "span",
                      { style: { color: "#8c8c8c", fontSize: 12 } },
                      "hrs",
                    ),
                  ),
                ),
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 11,
                        color: "#8c8c8c",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      },
                    },
                    "Assignee",
                  ),
                  React.createElement(
                    "div",
                    {
                      style: {
                        padding: "6px 10px",
                        border: "1px solid #d9d9d9",
                        borderRadius: 4,
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        minHeight: 32,
                      },
                    },
                    React.createElement(Av, {
                      name: detail.item._assigneeName || "?",
                      color: LAWYER_COLORS[0],
                      size: 20,
                    }),
                    React.createElement(
                      "span",
                      { style: { fontSize: 12, color: "#262626" } },
                      detail.item._assigneeName || "Unassigned",
                    ),
                  ),
                ),
              ),

              // Execution Time
              React.createElement(
                "div",
                { style: { marginBottom: 16 } },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 11,
                      color: "#8c8c8c",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      marginBottom: 4,
                    },
                  },
                  "Execution Time",
                ),
                React.createElement(
                  "div",
                  { style: { display: "flex", alignItems: "center", gap: 8 } },
                  React.createElement("input", {
                    type: "datetime-local",
                    defaultValue:
                      detail.type === "subtask"
                        ? detail.item.date
                          ? toLocalDT(detail.item.date)
                          : ""
                        : detail.item.startDate
                          ? toLocalDT(detail.item.startDate)
                          : "",
                    style: {
                      padding: "5px 10px",
                      borderRadius: 4,
                      border: "1px solid #d9d9d9",
                      fontSize: 12,
                      flex: 1,
                      outline: "none",
                    },
                    onChange: async (e) => {
                      const iso = e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null;
                      const field =
                        detail.type === "subtask" ? "date" : "startDate";
                      const url =
                        detail.type === "subtask"
                          ? `subTasks:update?filterByTk=${detail.item.id}`
                          : `tasks:update?filterByTk=${detail.item.id}`;
                      await apiReq(url, "POST", { [field]: iso });
                      setDetail((d) =>
                        d ? { ...d, item: { ...d.item, [field]: iso } } : null,
                      );
                      if (detail.type === "task")
                        setTasks((p) =>
                          p.map((t) =>
                            t.id === detail.item.id
                              ? { ...t, [field]: iso }
                              : t,
                          ),
                        );
                      else
                        setSubs((p) =>
                          p.map((s) =>
                            s.id === detail.item.id
                              ? { ...s, [field]: iso }
                              : s,
                          ),
                        );
                    },
                  }),
                  React.createElement(
                    "span",
                    { style: { color: "#bfbfbf" } },
                    "→",
                  ),
                  React.createElement("input", {
                    type: "datetime-local",
                    defaultValue:
                      detail.type === "subtask"
                        ? detail.item.deadline
                          ? toLocalDT(detail.item.deadline)
                          : ""
                        : detail.item.dueDate
                          ? toLocalDT(detail.item.dueDate)
                          : "",
                    style: {
                      padding: "5px 10px",
                      borderRadius: 4,
                      border: "1px solid #d9d9d9",
                      fontSize: 12,
                      flex: 1,
                      outline: "none",
                    },
                    onChange: async (e) => {
                      const iso = e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null;
                      const field =
                        detail.type === "subtask" ? "deadline" : "dueDate";
                      const url =
                        detail.type === "subtask"
                          ? `subTasks:update?filterByTk=${detail.item.id}`
                          : `tasks:update?filterByTk=${detail.item.id}`;
                      await apiReq(url, "POST", { [field]: iso });
                      setDetail((d) =>
                        d ? { ...d, item: { ...d.item, [field]: iso } } : null,
                      );
                      if (detail.type === "task")
                        setTasks((p) =>
                          p.map((t) =>
                            t.id === detail.item.id
                              ? { ...t, [field]: iso }
                              : t,
                          ),
                        );
                      else
                        setSubs((p) =>
                          p.map((s) =>
                            s.id === detail.item.id
                              ? { ...s, [field]: iso }
                              : s,
                          ),
                        );
                    },
                  }),
                ),
              ),

              // Task Description
              React.createElement(
                "div",
                { style: { marginTop: 16 } },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 11,
                      color: "#8c8c8c",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      marginBottom: 4,
                    },
                  },
                  "Description",
                ),
                React.createElement(Input.TextArea, {
                  defaultValue: detail.item.description || "",
                  autoSize: { minRows: 3, maxRows: 8 },
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#595959",
                    lineHeight: 1.7,
                    padding: 12,
                    borderRadius: 6,
                  },
                  placeholder: "Describe the task content...",
                  onBlur: async (e) => {
                    const val = e.target.value;
                    const url =
                      detail.type === "subtask"
                        ? `subTasks:update?filterByTk=${detail.item.id}`
                        : `tasks:update?filterByTk=${detail.item.id}`;
                    await apiReq(url, "POST", { description: val });
                    setDetail((d) =>
                      d
                        ? { ...d, item: { ...d.item, description: val } }
                        : null,
                    );
                    if (detail.type === "task")
                      setTasks((p) =>
                        p.map((t) =>
                          t.id === detail.item.id
                            ? { ...t, description: val }
                            : t,
                        ),
                      );
                    else
                      setSubs((p) =>
                        p.map((s) =>
                          s.id === detail.item.id
                            ? { ...s, description: val }
                            : s,
                        ),
                      );
                    message.success("Description updated");
                  },
                }),
              ),
            ),

            // ── RIGHT COLUMN (60%) — Comments & Documents ──
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  padding: "20px 24px",
                  background: "#fff",
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#262626",
                    marginBottom: 12,
                  },
                },
                "Comments & Documents",
              ),
              React.createElement(
                "div",
                {
                  style: {
                    flex: 1,
                    overflow: "hidden",
                    border: "1px solid #e8e8e8",
                    borderRadius: 6,
                  },
                },
                React.createElement(UnifiedNoteThread, {
                  collectionName:
                    detail.type === "subtask" ? "SubTask" : "Task",
                  recordId: extractId(detail.item.id),
                  currentUser: currentUser,
                  lawyers: lawyers,
                  canEdit: true,
                  projectFolderId: null,
                }),
              ),
            ),
          ),
        ),
    ),
    React.createElement(
      "style",
      null,
      `
      .kanban-scroll::-webkit-scrollbar { height: 6px; }
      .kanban-scroll::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 3px; }
    `,
    )
  );
};

// ── Expose globals so other blocks can reuse ──────────────────────
window.__KanbanCard = KanbanCard;
window.__KanbanView = KanbanView;

// ── Render standalone ─────────────────────────────────────────────
ctx.render(React.createElement(KanbanBoard, null));
