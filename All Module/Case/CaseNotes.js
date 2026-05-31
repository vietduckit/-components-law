// ============================================================
// §1 CONFIG & UTILS
// ============================================================
const COLLECTION_NAME = "Project";
const RECORD_ID = ctx.record?.id;

const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const {
  Input,
  Button,
  Spin,
  Empty,
  Typography,
  Space,
  message,
  Tabs,
  Badge,
  Modal,
  Upload,
  Form,
  Divider,
  Tag,
  Avatar,
} = ctx.antd;
const { Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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
  partner: { label: "Luật sư đối tác", color: "#531dab", bg: "#f9f0ff" },
  lawyer: { label: "Luật sư", color: "#096dd9", bg: "#e6f4ff" },
  associate: { label: "Luật sư cộng sự", color: "#08979c", bg: "#e6fffb" },
  suppliant: { label: "Trợ lý pháp lý", color: "#d46b08", bg: "#fff7e6" },
};
const DOC_TYPE_SUGGESTIONS = [
  "Hợp đồng",
  "Biên bản",
  "Quyết định",
  "Tờ trình",
  "Báo cáo",
  "Chứng cứ / Hồ sơ",
  "Công văn",
  "Đơn từ",
  "Phụ lục",
  "Biên bản làm việc",
  "File mẫu",
  "Khác",
];
const FILE_EXT_ICON = {
  ".pdf": { icon: "📄", color: "#ff4d4f", bg: "#fff2f0" },
  ".doc": { icon: "📝", color: "#1890ff", bg: "#e6f7ff" },
  ".docx": { icon: "📝", color: "#1890ff", bg: "#e6f7ff" },
  ".xls": { icon: "📊", color: "#52c41a", bg: "#f6ffed" },
  ".xlsx": { icon: "📊", color: "#52c41a", bg: "#f6ffed" },
  ".png": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
  ".jpg": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
  ".jpeg": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
  ".gif": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
  ".webp": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
};

const extractId = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (Array.isArray(val)) return val.length > 0 ? extractId(val[0]) : null;
  if (typeof val === "object") return val.id ? parseInt(val.id, 10) : null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

const isAdminUser = (user) => {
  if (!user) return false;
  const role = user?.roles?.[0]?.name || user?.role || user?.systemRole || "";
  return (
    role === "admin" ||
    role === "root" ||
    user?.isAdmin === true ||
    user?.isSuperAdmin === true
  );
};

const getFolderPermissions = (folder, user, allFolders, currentLawyerId) => {
  if (isAdminUser(user))
    return { isManager: true, isMember: true, canEdit: true };
  if (!folder) return { isManager: true, isMember: true, canEdit: true };
  if (!user) return { isManager: false, isMember: false, canEdit: false };

  const uid = extractId(user.id);
  const lwId = extractId(currentLawyerId);

  if (extractId(folder.createdById) === uid) {
    return { isManager: true, isMember: true, canEdit: true };
  }

  const managers = folder.folderManager || folder.folderManagers || [];
  const members = folder.folderMember || folder.folderMembers || [];

  if (lwId) {
    const isExplicitManager = managers.some((m) => extractId(m.id) === lwId);
    if (isExplicitManager)
      return { isManager: true, isMember: true, canEdit: true };

    const explicitMember = members.find((m) => extractId(m.id) === lwId);
    if (explicitMember) {
      const role =
        explicitMember.folderMembers?.role || explicitMember.role || "viewer";
      const canEdit = role === "editor";
      return { isManager: false, isMember: true, canEdit };
    }
  }

  const pId = extractId(folder.parentId);
  if (!pId || pId === "root")
    return { isManager: false, isMember: false, canEdit: false };

  const parentFolder = allFolders.find(
    (f) => String(extractId(f.id)) === String(pId),
  );
  if (!parentFolder)
    return { isManager: false, isMember: false, canEdit: false };

  return getFolderPermissions(parentFolder, user, allFolders, currentLawyerId);
};

const getVisibleFolderIds = (allFolders, currentUser, currentLawyerId) => {
  const accessible = new Set();
  const uid = extractId(currentUser?.id);
  const lwId = extractId(currentLawyerId);

  if (isAdminUser(currentUser)) {
    allFolders.forEach((f) => accessible.add(extractId(f.id)));
    return { accessible, navOnly: new Set() };
  }

  if (!uid) return { accessible, navOnly: new Set() };

  allFolders.forEach((f) => {
    const fId = extractId(f.id);
    if (extractId(f.createdById) === uid) {
      accessible.add(fId);
      return;
    }
    const perms = getFolderPermissions(f, currentUser, allFolders, lwId);
    if (perms.isManager || perms.isMember || perms.canEdit) {
      accessible.add(fId);
    }
  });

  return { accessible, navOnly: new Set() };
};

const hasAssigneeValue = (assignees) => {
  if (!assignees) return false;
  if (typeof assignees === "string") return assignees.trim().length > 0;
  if (Array.isArray(assignees)) return assignees.length > 0;
  return true;
};

const getCommentText = (html, removeMentions = false) => {
  if (!html) return "";
  let text = String(html);
  if (removeMentions) {
    text = text.replace(
      /<span\b[^>]*(?:mention-tag|data-id)[^>]*>[\s\S]*?<\/span>/gi,
      " ",
    );
  }
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const getCommentLayoutType = ({ body, assignees, files }) => {
  const hasText = !!body;
  const hasMentions = hasAssigneeValue(assignees);
  const hasFiles = (files || []).length > 0;

  if (hasText && (hasMentions || hasFiles)) return "commentGroup";
  if (hasText) return "commentOnly";
  if (hasFiles && hasMentions) return "commentGroup";
  if (hasFiles) return "fileOnly";
  if (hasMentions) return "mentionOnly";
  return "empty";
};

const getLayoutBadge = (layoutType, files) => {
  const fileCount = (files || []).length;
  if (layoutType === "commentGroup") {
    return fileCount > 0 ? `Bình luận + ${fileCount} tệp` : "Bình luận + nhắc tên";
  }
  if (layoutType === "commentOnly") return "Bình luận";
  if (layoutType === "fileOnly")
    return fileCount > 1 ? `${fileCount} tệp` : "Tệp đính kèm";
  if (layoutType === "mentionOnly") return "Nhắc tên";
  return null;
};


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

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return fmt(iso, "date");
};

const userName = (u) =>
  u?.nickname ||
  `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
  u?.username ||
  u?.email ||
  null;
const getFullUrl = (url) =>
  !url
    ? null
    : url.startsWith("http")
      ? url
      : `${window.location.origin}${url}`;
const getExtInfo = (ext = "") =>
  FILE_EXT_ICON[ext.toLowerCase()] || {
    icon: "📎",
    color: "#8c8c8c",
    bg: "#fafafa",
  };

const getFileIcon = (ext) => {
  const e = (ext || "").toLowerCase();
  let url = "https://img.icons8.com/color/48/000000/file.png";
  if (e === ".pdf") url = "https://img.icons8.com/color/48/000000/pdf.png";
  else if ([".doc", ".docx"].includes(e))
    url = "https://img.icons8.com/color/48/000000/microsoft-word-2019.png";
  else if ([".xls", ".xlsx"].includes(e))
    url = "https://img.icons8.com/color/48/000000/microsoft-excel-2019.png";
  else if ([".ppt", ".pptx"].includes(e))
    url =
      "https://img.icons8.com/color/48/000000/microsoft-powerpoint-2019.png";
  else if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(e))
    url = "https://img.icons8.com/color/48/000000/image.png";

  return React.createElement("img", {
    src: url,
    style: { width: 22, height: 22, flexShrink: 0, objectFit: "contain" },
    alt: "icon",
  });
};

async function apiReq(url, method, data) {
  return ctx.api.request({ url, method: method || "POST", data });
}

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
        fontWeight: 500,
        flexShrink: 0,
      },
    },
    (name || "?").charAt(0).toUpperCase(),
  );

// ============================================================
// §2 MENTION HELPERS & COMPONENT (QUILL RICHTEXT)
// ============================================================
let _quillLoadPromise = null;
const QUILL_FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];
const QUILL_SIZE_LABEL_CSS = QUILL_FONT_SIZES.map(
  (size) => `
    .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="${size}"]::before,
    .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="${size}"]::before { content: "${size}"; }
  `,
).join("");
const loadQuillAsync = () => {
  if (_quillLoadPromise) return _quillLoadPromise;
  _quillLoadPromise = ctx
    .requireAsync(
      "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css",
    )
    .then(() =>
      ctx.requireAsync(
        "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.min.js",
      ),
    )
    .then((QuillLib) => {
      const Q =
        QuillLib && typeof QuillLib === "function"
          ? QuillLib
          : (QuillLib && QuillLib.default) ||
            (QuillLib && QuillLib.Quill) ||
            QuillLib;
      if (!Q) throw new Error("Quill constructor not found in UMD export");
      try {
        const SizeStyle = Q.import("attributors/style/size");
        SizeStyle.whitelist = QUILL_FONT_SIZES;
        Q.register(SizeStyle, true);
      } catch {}
      return Q;
    });
  return _quillLoadPromise;
};
loadQuillAsync().catch(() => {});

const QUILL_CUSTOM_CSS = `
    .ql-container.ql-snow { border: none !important; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; border-radius: 0 0 8px 8px !important; }
    .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f0f0f0 !important; padding: 6px 8px !important; background: #f8f8f8 !important; border-radius: 8px 8px 0 0 !important; flex-wrap: wrap !important; }
    .ql-editor { min-height: 110px; max-height: 380px; overflow-y: auto; font-size: 14px; line-height: 1.7; padding: 12px 16px; font-family: Inter, sans-serif; }
    .ql-editor.ql-blank::before { color: #bfbfbf; font-style: normal; }
    .ql-editor blockquote { border-left: 3px solid #1890ff; padding-left: 10px; color: #595959; margin: 6px 0; }
    .ql-editor pre { background: #f6f8fa; border-radius: 6px; padding: 10px 14px; font-size: 12.5px; color: #333; }
    .ql-snow .ql-stroke { stroke: #555 !important; }
    .ql-snow .ql-fill { fill: #555 !important; }
    .ql-snow.ql-toolbar button:hover .ql-stroke, .ql-snow .ql-toolbar button:hover .ql-stroke { stroke: #1890ff !important; }
    .ql-snow.ql-toolbar button.ql-active .ql-stroke { stroke: #1890ff !important; }
    .ql-snow.ql-toolbar button.ql-active .ql-fill { fill: #1890ff !important; }
    .ql-snow .ql-picker.ql-size { width: 68px !important; }
    .ql-snow .ql-picker.ql-size .ql-picker-label::before { content: "14px"; }
    ${QUILL_SIZE_LABEL_CSS}
    .wysiwyg-content.ql-editor { padding: 0 !important; min-height: auto !important; max-height: none !important; overflow-y: visible !important; border: none !important; }
  `;

const QuillEditor = ({
  value,
  onChange,
  placeholder,
  onSubmit,
  onUploadClick,
}) => {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const onUploadClickRef = useRef(onUploadClick);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    onUploadClickRef.current = onUploadClick;
  }, [onUploadClick]);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    let destroyed = false;
    const cleanupFns = [];
    loadQuillAsync()
      .then((Quill) => {
        if (destroyed || !containerRef.current) return;
        if (quillRef.current) {
          setReady(true);
          return;
        }

        const q = new Quill(containerRef.current, {
          theme: "snow",
          placeholder: placeholder || "Viết bình luận...",
          modules: {
            toolbar: {
              container: [
                [{ size: QUILL_FONT_SIZES }],
                ["bold", "italic", "underline", "strike"],
                [{ align: [] }],
                [{ indent: "-1" }, { indent: "+1" }],
                ["blockquote", "code-block"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["link", "upload"],
                ["clean"],
              ],
              handlers: {
                upload: function () {
                  if (onUploadClickRef.current) onUploadClickRef.current();
                },
                size: function (value) {
                  const range = this.quill.getSelection(true);
                  if (!range) return;
                  this.quill.focus();
                  if (range.length === 0) {
                    this.quill.format("size", value || false, "user");
                    return;
                  }
                  this.quill.formatText(
                    range.index,
                    range.length,
                    "size",
                    value || false,
                    "user",
                  );
                  this.quill.setSelection(range.index, range.length, "silent");
                },
              },
            },
          },
        });

        const uploadBtn =
          containerRef.current.parentElement.querySelector(".ql-upload");
        if (uploadBtn) {
          uploadBtn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>';
          uploadBtn.title = "Đính kèm tài liệu";
        }

        if (value) {
          q.clipboard.dangerouslyPasteHTML(value);
          q.setSelection(q.getLength(), 0);
        }

        q.on("text-change", () => {
          const editorEl =
            containerRef.current &&
            containerRef.current.querySelector(".ql-editor");
          if (!editorEl) return;
          const html = editorEl.innerHTML;
          const empty = html === "<p><br></p>" || html === "";
          onChange(empty ? "" : html);
        });

        const handleSubmitShortcut = (e) => {
          if (!((e.ctrlKey || e.metaKey) && e.key === "Enter")) return;
          if (e.isComposing) return;
          if (!onSubmitRef.current) return;
          e.preventDefault();
          onSubmitRef.current();
        };
        q.root.addEventListener("keydown", handleSubmitShortcut, true);
        cleanupFns.push(() =>
          q.root.removeEventListener("keydown", handleSubmitShortcut, true),
        );

        quillRef.current = q;
        setReady(true);
      })
      .catch((e) => {
        console.error("Quill load error:", e);
        setError("Không thể tải editor. Vui lòng kiểm tra kết nối mạng.");
      });

    return () => {
      destroyed = true;
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (!quillRef.current || !containerRef.current) return;
    const editorEl = containerRef.current.querySelector(".ql-editor");
    if (!editorEl) return;
    if (!value && editorEl.innerHTML && editorEl.innerHTML !== "<p><br></p>") {
      quillRef.current.setText("");
    }
  }, [value]);

  return React.createElement(
    "div",
    {
      style: {
        border: "1px solid #d9d9d9",
        borderRadius: 8,
        background: "#fff",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      },
    },
    React.createElement("style", null, QUILL_CUSTOM_CSS),
    error
      ? React.createElement(
          "div",
          {
            style: {
              padding: "12px 16px",
              color: "#ff4d4f",
              fontSize: 13,
              fontFamily: FONT,
            },
          },
          error,
        )
      : !ready
        ? React.createElement(
            "div",
            {
              style: {
                padding: "12px 16px",
                color: "#bfbfbf",
                fontSize: 13,
                fontFamily: FONT,
              },
            },
            "Đang tải editor...",
          )
        : null,
    React.createElement("div", { ref: containerRef }),
  );
};

const MentionPicker = ({ lawyers, assignedIds, onAssignMultiple }) => {
  const { Tag } = ctx.antd;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 240,
    maxHeight: 280,
    ready: false,
  });

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setSearch("");
    setDropdownPos((p) => ({ ...p, ready: false }));
  }, []);

  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const gap = 6;
    const width = 360;
    const maxHeight = 360;
    const left = Math.max(8, rect.left);
    const top = rect.bottom + gap;

    setDropdownPos({ top, left, width, maxHeight, ready: true });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? lawyers.filter((l) => l.lawyerName.toLowerCase().includes(q))
      : lawyers;
  }, [lawyers, search]);

  const toggle = (lawyer) => {
    const lId = extractId(lawyer.id);
    const already = assignedIds.includes(lId);
    const next = already
      ? assignedIds.filter((id) => id !== lId)
      : [...assignedIds, lId];
    onAssignMultiple(next);
  };

  const removeTag = (id) =>
    onAssignMultiple(assignedIds.filter((i) => i !== id));

  const dropdownLayer =
    open &&
    React.createElement(
      React.Fragment,
      null,
      React.createElement("div", {
        onMouseDown: closeDropdown,
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 2147483646,
          background: "transparent",
        },
      }),
      React.createElement(
        "div",
        {
          ref: dropdownRef,
          style: {
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 2147483647,
            width: dropdownPos.width,
            maxHeight: dropdownPos.maxHeight,
            visibility: dropdownPos.ready ? "visible" : "hidden",
            background: "#fff",
            border: "1px solid #e0e0e0",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
            overflowY: "auto",
            padding: "6px 0",
          },
        },
      React.createElement(
        "div",
        { style: { padding: "6px 10px", borderBottom: "1px solid #f0f0f0" } },
        React.createElement("input", {
          autoFocus: true,
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "Tìm tên luật sư...",
          style: {
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 12,
            fontFamily: FONT,
            outline: "none",
          },
        }),
      ),
      filtered.length === 0
        ? React.createElement(
            "div",
            {
              style: {
                padding: "12px",
                textAlign: "center",
                color: "#bfbfbf",
                fontSize: 12,
                fontFamily: FONT,
              },
            },
            "Không tìm thấy",
          )
        : filtered.map((l) => {
            const lId = extractId(l.id);
            const selected = assignedIds.includes(lId);
            return React.createElement(
              "div",
              {
                key: l.id,
                onMouseDown: (e) => {
                  e.preventDefault();
                  toggle(l);
                },
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  cursor: "pointer",
                  background: selected ? "#e6f4ff" : "transparent",
                  borderLeft: selected
                    ? "3px solid #1890ff"
                    : "3px solid transparent",
                },
              },
              React.createElement(Av, { name: l.lawyerName, size: 28 }),
              React.createElement(
                "div",
                { style: { flex: 1 } },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 13,
                      fontWeight: selected ? 700 : 400,
                      color: selected ? "#096dd9" : "#262626",
                      fontFamily: FONT,
                    },
                  },
                  l.lawyerName,
                ),
                l.lawyerType &&
                  React.createElement(
                    "div",
                    { style: { fontSize: 11, color: "#8c8c8c" } },
                    l.lawyerType,
                  ),
              ),
              selected &&
                React.createElement(
                  "span",
                  { style: { fontSize: 16, color: "#1890ff", fontWeight: 700 } },
                  "✓",
                ),
            );
          }),
      ),
    );
  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
      },
    },
    React.createElement(
      "div",
      { style: { position: "relative", zIndex: open ? 10000 : "auto" } },
      React.createElement(
        "button",
        {
          ref: buttonRef,
          type: "button",
          onClick: () => {
            if (open) {
              closeDropdown();
              return;
            }
            updateDropdownPosition();
            setOpen(true);
            setSearch("");
          },
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontFamily: FONT,
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: 20,
            border: open ? "1px solid #1890ff" : "1px solid #d9d9d9",
            background: open ? "#e6f4ff" : "#fff",
            color: open ? "#096dd9" : "#595959",
            cursor: "pointer",
            userSelect: "none",
            transition: "all 0.15s",
          },
        },
        React.createElement("span", { style: { fontSize: 14, fontWeight: 700 } }, "@"),
        "Nhắc đến ai",
      ),
    ),
    dropdownLayer,
    assignedIds.map((id) => {
      const lawyer = lawyers.find((l) => extractId(l.id) === id);
      if (!lawyer) return null;
      return React.createElement(
        Tag,
        {
          key: id,
          closable: true,
          onClose: () => removeTag(id),
          style: {
            borderRadius: 16,
            background: "#e6f4ff",
            color: "#096dd9",
            border: "1px solid #91caff",
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 10px 2px 6px",
          },
        },
        React.createElement(Av, { name: lawyer.lawyerName, size: 16 }),
        lawyer.lawyerName,
      );
    }),
  );
};

const CommentComposer = ({
  value,
  onChange,
  onAssignMultiple,
  assignedIds,
  lawyers,
  placeholder,
  onSubmit,
  onUploadClick,
}) => {
  return React.createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 0 } },
    React.createElement(QuillEditor, {
      value,
      onChange,
      placeholder,
      onSubmit,
      onUploadClick,
    }),
    React.createElement(MentionPicker, {
      lawyers,
      assignedIds,
      onAssignMultiple,
    }),
  );
};

const renderRichText = (text, lawyers) => {
  if (!text) return null;
  const isHtml = /<[a-z][\s\S]*>/i.test(text);

  if (isHtml) {
    return React.createElement("div", {
      dangerouslySetInnerHTML: { __html: text },
      className: "wysiwyg-content ql-editor",
      style: { whiteSpace: "pre-wrap", wordBreak: "break-word" },
    });
  }

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

// ============================================================
// §3 MODALS (PREVIEW & FILE UPLOAD)
// ============================================================
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
            { key: "dl", onClick: () => window.open(fullUrl, "_blank") },
            "⬇️ Tải về",
          ),
        React.createElement(Button, { key: "cl", onClick: onClose }, "Đóng"),
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
        { style: { padding: 32, textAlign: "center" } },
        React.createElement(Empty, {
          description:
            "Không thể xem trước định dạng này — vui lòng tải về để mở",
        }),
      ),
  );
};

const FileUploadModal = ({
  open,
  onClose,
  onAddPending,
  collectionName,
  recordId,
  currentUser,
  currentLawyerId = null,
  lawyers = [],
  editDoc = null,
  projectFolderId,
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!editDoc;

  const [activeTab, setActiveTab] = useState("local");
  const [treeData, setTreeData] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedLibDoc, setSelectedLibDoc] = useState(null);
  const { TreeSelect } = ctx.antd;

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
      setActiveTab("local");
      setSelectedLibDoc(null);
    }
  }, [open, editDoc]);

  useEffect(() => {
    if (
      open &&
      activeTab === "library" &&
      treeData.length === 0 &&
      !libraryLoading
    ) {
      const fetchLibraryData = async () => {
        setLibraryLoading(true);
        try {
          const [fRes, dRes] = await Promise.all([
            ctx.api.request({
              url: "folders:list",
              params: {
                pageSize: 1000,
                page: 1,
                appends: ["folderMember", "folderManager"],
              },
            }),
            ctx.api.request({
              url: "documents:list",
              params: {
                pageSize: 1000,
                page: 1,
                filter: JSON.stringify({ isDeleted: { $ne: true } }),
                fields:
                  "id,title,documentCode,folderId,fileAttachment,createdById,isDeleted",
                appends: ["fileAttachment", "createdBy"],
              },
            }),
          ]);
          const allF = fRes?.data?.data || [];
          const allD = dRes?.data?.data || [];

          const { accessible } = getVisibleFolderIds(
            allF,
            currentUser,
            currentLawyerId,
          );

          const allowedF = allF.filter((f) => accessible.has(extractId(f.id)));

          const generateTree = () => {
            const currentUid = extractId(currentUser?.id);
            const nodeMap = {};
            allowedF.forEach((f) => {
              nodeMap[extractId(f.id)] = {
                title: `📁 ${f.name}`,
                value: `folder_${f.id}`,
                key: `folder_${f.id}`,
                selectable: false,
                children: [],
              };
            });

            allD.forEach((d) => {
              if (
                !d.fileAttachment ||
                (Array.isArray(d.fileAttachment) &&
                  d.fileAttachment.length === 0)
              )
                return;
              const fId = extractId(d.folderId);
              if (!fId || !nodeMap[fId]) return;

              if (extractId(d.createdById) !== currentUid) return;

              const fileId = extractId(d.id);
              const att = Array.isArray(d.fileAttachment)
                ? d.fileAttachment[0]
                : d.fileAttachment;
              nodeMap[fId].children.push({
                title: `📄 ${d.title || d.documentCode || "Untitled"} (${att.title || att.filename})`,
                value: `doc_${fileId}`,
                key: `doc_${fileId}`,
                isLeaf: true,
                docData: d,
                attData: att,
              });
            });

            const rootNodes = [];
            allowedF.forEach((f) => {
              const pId = extractId(f.parentId);
              if (pId && nodeMap[pId]) {
                nodeMap[pId].children.push(nodeMap[extractId(f.id)]);
              } else {
                rootNodes.push(nodeMap[extractId(f.id)]);
              }
            });

            const pruneEmpty = (nodes) => {
              return nodes.filter((n) => {
                if (n.isLeaf) return true;
                n.children = pruneEmpty(n.children || []);
                return n.children.length > 0;
              });
            };

            return pruneEmpty(rootNodes);
          };

          setTreeData(generateTree());
        } catch (e) {
          console.error(e);
        }
        setLibraryLoading(false);
      };
      fetchLibraryData();
    }
  }, [
    activeTab,
    open,
    treeData.length,
    libraryLoading,
    currentUser,
    currentLawyerId,
  ]);

  const findTreeDoc = (nodes, val) => {
    for (const node of nodes || []) {
      if (node.value === val && node.docData) return node;
      const found = findTreeDoc(node.children, val);
      if (found) return found;
    }
    return null;
  };

  const handleTreeSelect = (val) => {
    if (!val) {
      setSelectedLibDoc(null);
      return;
    }
    const found = findTreeDoc(treeData, val);
    if (found && found.docData) {
      setSelectedLibDoc(found);
      const currentTitle = form.getFieldValue("title");
      if (!currentTitle) {
        form.setFieldsValue({
          title: found.docData.title || found.attData.filename,
        });
      }
    } else {
      setSelectedLibDoc(null);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setFileList([]);
    setSelectedLibDoc(null);
    setTreeData([]);
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
    });
    const att = uploadRes?.data?.data;
    if (!att?.id) throw new Error("Upload thất bại");
    return [{ id: att.id }];
  };

  const cloneLibraryFile = async (attData) => {
    if (!attData?.id) throw new Error("Không tìm thấy attachment gốc");
    return [{ id: attData.id }];
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
    const hasLocalFile = fileList.length > 0;
    const hasLibFile = !!selectedLibDoc;
    const hasFile = activeTab === "local" ? hasLocalFile : hasLibFile;
    const hasDrive = !!values.googleDriveUrl?.trim();

    if (!isEdit && !hasFile && !hasDrive) {
      message.error("Vui lòng chọn file hoặc nhập Drive URL");
      return;
    }

    if (onAddPending) {
      setUploading(true);
      try {
        let attIds = null;
        let fileName = "Google Drive Link";
        if (activeTab === "local" && hasLocalFile) {
          attIds = await uploadFile();
          fileName = fileList[0].name;
        } else if (activeTab === "library" && hasLibFile) {
          attIds = await cloneLibraryFile(selectedLibDoc.attData);
          const attData = selectedLibDoc.attData;
          const ext = attData.extname
            ? attData.extname.startsWith(".")
              ? attData.extname
              : `.${attData.extname}`
            : "";
          fileName = attData.filename || `cloned_file${ext}`;
          if (ext && !fileName.toLowerCase().endsWith(ext.toLowerCase()))
            fileName += ext;
        }
        onAddPending({ attIds, fileName, metadata: values });
        handleClose();
      } catch (e) {
        message.error(`Lỗi upload: ${e.message}`);
      } finally {
        setUploading(false);
      }
      return;
    }
  };

  const inpStyle = { fontSize: 13, fontFamily: FONT };
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
        { strong: true, style: { fontFamily: FONT, fontSize: 15 } },
        isEdit ? "✏️ Cập nhật tài liệu" : "📎 Đính kèm tài liệu vào bình luận",
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
          "Huỷ",
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
              ? "Đang cập nhật..."
              : "Đang xử lý..."
            : isEdit
              ? "Cập nhật"
              : onAddPending
                ? "Xác nhận đính kèm"
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
        `👤 ${isEdit ? "Cập nhật" : "Đính kèm"} bởi: `,
        React.createElement(
          "strong",
          null,
          userName(currentUser) || currentUser.email,
        ),
      ),
    React.createElement(
      Form,
      { form, layout: "vertical", size: "small", style: { fontFamily: FONT } },
      divider("Định danh"),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          {
            name: "documentType",
            label: "Loại văn bản",
            rules: [{ required: true, message: "Vui lòng nhập loại văn bản" }],
          },
          React.createElement(
            "div",
            null,
            React.createElement(Input, {
              allowClear: true,
              maxLength: 150,
              placeholder: "VD: Hợp đồng, Biên bản...",
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
          { name: "title", label: "Tên tài liệu" },
          React.createElement(Input, {
            allowClear: true,
            placeholder:
              "Nhập tên đầy đủ của tài liệu (Sẽ lấy tên file nếu bỏ trống)",
            style: inpStyle,
          }),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          { name: "documentCode", label: "Số hiệu" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "VD: 123/2024/HĐ",
            style: inpStyle,
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "openingDate", label: "Ngày ban hành" },
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
          { name: "signedAt", label: "Ngày ký" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%", ...inpStyle },
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "effectiveAt", label: "Ngày hiệu lực" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%", ...inpStyle },
          }),
        ),
      ),
      divider("Bên liên quan"),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          { name: "senderName", label: "Người gửi" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Tên cá nhân / tổ chức gửi",
            style: inpStyle,
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "recipientName", label: "Người nhận" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Tên cá nhân / tổ chức nhận",
            style: inpStyle,
          }),
        ),
      ),
      React.createElement(
        Form.Item,
        { name: "description", label: "Tóm tắt nội dung" },
        React.createElement(Input.TextArea, {
          rows: 3,
          allowClear: true,
          placeholder: "Mô tả ngắn gọn nội dung chính...",
        }),
      ),
      divider("File đính kèm"),
      React.createElement(ctx.antd.Tabs, {
        activeKey: activeTab,
        onChange: setActiveTab,
        items: [
          {
            key: "local",
            label: "Upload từ máy tính",
            children: React.createElement(
              Form.Item,
              {
                label: isEdit ? "Thay file mới (tuỳ chọn)" : "Chọn file",
                style: { marginBottom: 0 },
              },
              React.createElement(
                Dragger,
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
                  "Kéo thả hoặc ",
                  React.createElement(
                    "span",
                    { style: { color: "#1890ff" } },
                    "click để chọn",
                  ),
                ),
              ),
            ),
          },
          {
            key: "library",
            label: "Chọn từ Thư viện",
            children: React.createElement(
              "div",
              { style: { padding: "8px 0" } },
              libraryLoading
                ? React.createElement(
                    "div",
                    { style: { textAlign: "center", padding: 20 } },
                    React.createElement(ctx.antd.Spin, { size: "small" }),
                    React.createElement(
                      "div",
                      {
                        style: { marginTop: 8, fontSize: 12, color: "#8c8c8c" },
                      },
                      "Đang tải thư viện...",
                    ),
                  )
                : React.createElement(
                    "div",
                    null,
                    React.createElement(TreeSelect, {
                      style: { width: "100%" },
                      treeData,
                      placeholder: "Tìm kiếm và chọn file từ thư viện...",
                      treeDefaultExpandAll: true,
                      allowClear: true,
                      showSearch: true,
                      treeNodeFilterProp: "title",
                      onChange: handleTreeSelect,
                      value: selectedLibDoc ? selectedLibDoc.value : undefined,
                      dropdownStyle: { maxHeight: 400, overflow: "auto" },
                    }),
                  ),
            ),
          },
        ],
      }),
      React.createElement(
        Form.Item,
        { name: "googleDriveUrl", label: "Google Drive URL (tuỳ chọn)" },
        React.createElement(Input, {
          placeholder: "https://docs.google.com/...",
          allowClear: true,
          style: inpStyle,
        }),
      ),
      divider("Ghi chú (tuỳ chọn)"),
      React.createElement(
        Form.Item,
        { name: "note", label: "Ghi chú" },
        React.createElement(Input.TextArea, {
          rows: 2,
          allowClear: true,
          placeholder: "Nhập ghi chú cho tài liệu này (nếu có)...",
          style: inpStyle,
        }),
      ),
    ),
  );
};

// ============================================================
// §4 UNIFIED NOTE THREAD (LÕI XỬ LÝ)
// ============================================================
const UnifiedNoteThread = ({
  collectionName,
  recordId,
  currentUser,
  lawyers,
  projectFolderId,
  canEdit = true,
}) => {
  const currentLawyerId = useMemo(() => {
    const currentUserId = extractId(currentUser?.id);
    const found = lawyers?.find((l) => {
      const lawyerUserId = extractId(l.userId) || extractId(l.user);
      return currentUserId && lawyerUserId === currentUserId;
    });
    return found?.id || null;
  }, [currentUser, lawyers]);
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
  const [editAssignedIds, setEditAssignedIds] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [editingFileId, setEditingFileId] = useState(null);
  const [editFileTitle, setEditFileTitle] = useState("");
  const [expandedPreviews, setExpandedPreviews] = useState({});
  const INITIAL_COUNT = 15;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const resNotes = await ctx.api.request({
        url: "notes:list",
        params: {
          pageSize: 100,
          sort: ["-createdAt"],
          filter: JSON.stringify({
            $and: [
              { collectionName: { $eq: collectionName } },
              { recordId: { $eq: parseInt(recordId) } },
              { isDeleted: { $ne: true } },
            ],
          }),
          fields:
            "id,title,body,batchId,linkedUrl,collectionName,recordId,createdAt,updatedAt,createdById,replyText,parentId,isDeleted,assignedLawyerId",
          appends: ["createdBy", "updatedBy", "assignees", "parent"],
        },
      });
      const resFiles = await ctx.api.request({
        url: "documents:list",
        params: {
          pageSize: 100,
          sort: ["-createdAt"],
          filter: JSON.stringify({
            $and: [
              { collectionName: { $eq: collectionName } },
              { recordId: { $eq: parseInt(recordId) } },
              { isDeleted: { $ne: true } },
            ],
          }),
          fields:
            "id,title,documentCode,documentType,batchId,collectionName,recordId,googleDriveUrl,note,description,openingDate,signedAt,effectiveAt,senderName,recipientName,language,docFormat,folderId,fileAttachment,createdAt,updatedAt,createdById,isDeleted",
          appends: ["fileAttachment", "createdBy", "updatedBy"],
        },
      });

      const notes = resNotes?.data?.data || [];
      const files = resFiles?.data?.data || [];
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
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [collectionName, recordId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const renderAssigneeTags = (assignees) => {
    if (!assignees) return null;
    const color = "processing";
    const style = { margin: "2px", fontSize: 11, borderRadius: 4 };

    if (typeof assignees === "string") {
      return assignees
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n, i) =>
          React.createElement(
            Tag,
            { key: i, color, style },
            n.startsWith("@") ? n : "@" + n,
          ),
        );
    }
    if (Array.isArray(assignees)) {
      return assignees
        .map((item) => {
          const id = typeof item === "object" && item !== null ? item.id : item;
          if (typeof id === "string" && !extractId(id)) {
            const name = id.trim();
            if (!name) return null;
            return React.createElement(
              Tag,
              { key: name, color, style },
              name.startsWith("@") ? name : "@" + name,
            );
          }
          const u = lawyers?.find((l) => extractId(l.id) === extractId(id));
          if (!u) return null;
          return React.createElement(
            Tag,
            { key: id, color, style },
            "@" + (u.nickname || u.username || u.lawyerName || u.email),
          );
        })
        .filter(Boolean);
    }
    return null;
  };

  const authorName = (n) =>
    n.createdBy?.nickname ||
    n.createdBy?.username ||
    n.createdBy?.email ||
    (n.createdById ? `User #${n.createdById}` : "Ẩn danh");

  const warnMentionOnly = () => {
    message.warning("Vui lòng nhập nội dung bình luận trước khi nhắc tên.");
  };

  const handleSend = async () => {
    const hasText = getCommentText(body, true).length > 0;
    const hasFiles = pendingDocs.length > 0;
    const assigneeIds = assignedIds.map(extractId).filter(Boolean);
    if (assigneeIds.length > 0 && !hasText) {
      warnMentionOnly();
      return;
    }
    if (!hasText && !hasFiles) return;
    setSending(true);
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      const currentTime = new Date().toISOString();
      const linkedUrl = window.location.origin + window.location.pathname;
      const replySourceText = replyingTo?.note?.body
        ? getCommentText(replyingTo.note.body)
        : "";
      await apiReq("notes:create", "POST", {
          collectionName,
          recordId,
          title: "Bình luận",
          body: hasText ? body.trim() : null,
          linkedUrl,
          assignees: assigneeIds,
          assignedLawyerId: assigneeIds[0] || null,
          parentId: replyingTo
            ? replyingTo.note?.id || replyingTo.files?.[0]?.id
            : null,
          replyText: replySourceText
            ? replySourceText.substring(0, 150) +
              (replySourceText.length > 150 ? "..." : "")
            : replyingTo
              ? "Tài liệu đính kèm"
              : null,
          batchId,
          createdAt: currentTime,
      });
      if (hasFiles) {
        const toISO = (val) => {
          if (!val) return null;
          const d = new Date(val);
          return isNaN(d.getTime()) ? null : d.toISOString();
        };
        for (const pDoc of pendingDocs) {
          let attIds = pDoc.attIds || null;
          if (!attIds && pDoc.file) {
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
            description: pDoc.metadata.description?.trim() || "",
            note: pDoc.metadata.note?.trim() || "",
            updatedById: extractId(currentUser?.id) || null,
            updatedAt: new Date().toISOString(),
            collectionName,
            recordId: parseInt(recordId),
            folderId: projectFolderId ? parseInt(projectFolderId) : null,
            createdById: extractId(currentUser?.id) || null,
            createdAt: new Date().toISOString(),
            batchId,
            ...(attIds && { fileAttachment: attIds }),
          };
          await apiReq("documents:create", "POST", payload);
        }
      }
      setBody("");
      setAssignedIds([]);
      setReplyingTo(null);
      setPendingDocs([]);
      await reload();
      message.success("Đã đăng bình luận");
    } catch (e) {
      message.error("Lỗi đăng tải");
    }
    setSending(false);
  };

  const handleSaveEdit = async (noteId) => {
    const newBody = editBody.trim();
    if (!getCommentText(newBody, true)) return;
    const currentNoteItem = feed.find(
      (item) => item.note && item.note.id === noteId,
    );
    const oldBody = currentNoteItem?.note?.body || "";
    const oldAssignees = (currentNoteItem?.note?.assignees || [])
      .map((a) => (typeof a === "object" ? extractId(a.id) : extractId(a)))
      .filter(Boolean);
    const nextAssignees = editAssignedIds.map(extractId).filter(Boolean);
    const bodyChanged = oldBody !== newBody;
    const assigneesChanged =
      JSON.stringify([...oldAssignees].sort()) !==
      JSON.stringify([...nextAssignees].sort());
    if (!bodyChanged && !assigneesChanged) {
      setEditingNoteId(null);
      setEditBody("");
      setEditAssignedIds([]);
      return;
    }
    try {
      const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await apiReq(`notes:update?filterByTk=${noteId}`, "POST", {
        body: newBody,
        assignees: nextAssignees,
        assignedLawyerId: nextAssignees[0] || null,
        batchId: actionBatchId,
      });
      setFeed((prev) =>
        prev.map((item) => {
          if (item.note && item.note.id === noteId)
            return { ...item, note: { ...item.note, body: newBody, assignees: nextAssignees } };
          return item;
        }),
      );
      setEditingNoteId(null);
      setEditBody("");
      setEditAssignedIds([]);
      message.success("Đã cập nhật bình luận");
    } catch (e) {
      message.error("Lỗi cập nhật");
    }
  };

  const handleDeleteNote = (item) => {
    const { note, files } = item;
    Modal.confirm({
      title: "Xác nhận xóa",
      content: note
        ? "Bạn có chắc chắn muốn xóa bình luận này và các tệp đính kèm không?"
        : "Bạn có chắc chắn muốn xóa các tệp này không?",
      okText: "Xóa",
      cancelText: "Hủy",
      okType: "danger",
      onOk: async () => {
        try {
          const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          if (note) {
            await apiReq(`notes:update?filterByTk=${note.id}`, "POST", {
              isDeleted: true,
              batchId: actionBatchId,
            });
          }
          if (files && files.length > 0) {
            for (const f of files) {
              await apiReq(`documents:update?filterByTk=${f.id}`, "POST", {
                isDeleted: true,
              });
            }
          }
          const deletedTargetId = extractId(note?.id) || extractId(files?.[0]?.id);
          const replyingTargetId =
            extractId(replyingTo?.note?.id) ||
            extractId(replyingTo?.files?.[0]?.id);
          if (deletedTargetId && deletedTargetId === replyingTargetId) {
            setReplyingTo(null);
          }
          setFeed((prev) => prev.filter((i) => i !== item));
          message.success("Đã xóa thành công");
        } catch (e) {
          message.error("Lỗi khi xóa");
        }
      },
    });
  };

  const handleSaveFileTitle = async (f) => {
    const newTitle = editFileTitle.trim();
    if (!newTitle) return;
    try {
      const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await apiReq(`documents:update?filterByTk=${f.id}`, "POST", {
        title: newTitle,
        batchId: actionBatchId,
        updatedById: extractId(currentUser?.id) || null,
        updatedAt: new Date().toISOString(),
      });
      setFeed((prev) =>
        prev.map((item) => ({
          ...item,
          files: item.files.map((file) =>
            extractId(file.id) === extractId(f.id)
              ? { ...file, title: newTitle }
              : file,
          ),
        })),
      );
      message.success("Đã cập nhật tên tài liệu");
    } catch (e) {
      message.error("Lỗi cập nhật tên tài liệu");
    }
    setEditingFileId(null);
    setEditFileTitle("");
  };

  const renderFileRow = (f) => {
    const att = Array.isArray(f.fileAttachment)
      ? f.fileAttachment[0]
      : f.fileAttachment;
    const ext = att?.extname
      ? att.extname.startsWith(".")
        ? att.extname.toLowerCase()
        : "." + att.extname.toLowerCase()
      : "";
    const rawFilename = att?.filename || "File";
    const displayTitle = f.title || att?.title || rawFilename;
    const fullUrl = getFullUrl(att?.url || att?.preview);
    const isPdf = ext === ".pdf";
    const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(
      ext,
    );
    const isOffice = [
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
    ].includes(ext);
    const canIframe = isPdf || isImage || isOffice;
    const isExpanded = !!expandedPreviews[f.id];
    const isEditingThisFile = editingFileId === f.id;
    const isMine =
      currentUser && extractId(f.createdById) === extractId(currentUser.id);
    const canRenameFile = canEdit && isMine;

    return React.createElement(
      "div",
      {
        key: f.id,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 0,
          marginTop: 8,
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #e8e8e8",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
          },
        },
        getFileIcon(ext),
        isEditingThisFile
          ? React.createElement("input", {
              autoFocus: true,
              value: editFileTitle,
              onChange: (e) => setEditFileTitle(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter") handleSaveFileTitle(f);
                if (e.key === "Escape") {
                  setEditingFileId(null);
                  setEditFileTitle("");
                }
              },
              style: {
                flex: 1,
                fontSize: 13,
                fontFamily: FONT,
                border: "1px solid #1890ff",
                borderRadius: 4,
                padding: "3px 8px",
                outline: "none",
              },
            })
          : React.createElement(
              "span",
              {
                onClick: fullUrl ? () => setPreviewDoc(f) : undefined,
                title: `File gốc: ${rawFilename}`,
                style: {
                  fontSize: 13,
                  fontFamily: FONT,
                  fontWeight: 600,
                  color: fullUrl ? "#096dd9" : "#595959",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: fullUrl ? "pointer" : "default",
                  textDecoration: fullUrl ? "underline" : "none",
                  textUnderlineOffset: 3,
                },
              },
              displayTitle,
            ),
        isEditingThisFile
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                "span",
                {
                  onClick: () => handleSaveFileTitle(f),
                  style: {
                    fontSize: 12,
                    padding: "2px 10px",
                    cursor: "pointer",
                    color: "#fff",
                    background: "#1890ff",
                    borderRadius: 4,
                    fontWeight: 600,
                    flexShrink: 0,
                  },
                },
                "Lưu",
              ),
              React.createElement(
                "span",
                {
                  onClick: () => {
                    setEditingFileId(null);
                    setEditFileTitle("");
                  },
                  style: {
                    fontSize: 12,
                    padding: "2px 8px",
                    cursor: "pointer",
                    color: "#595959",
                    border: "1px solid #d9d9d9",
                    borderRadius: 4,
                    flexShrink: 0,
                  },
                },
                "Hủy",
              ),
            )
          : React.createElement(
              React.Fragment,
              null,
              canIframe &&
                React.createElement(
                  "span",
                  {
                    onClick: () =>
                      setExpandedPreviews((prev) => ({
                        ...prev,
                        [f.id]: !prev[f.id],
                      })),
                    title: isExpanded ? "Ẩn preview" : "Xem preview",
                    style: {
                      fontSize: 12,
                      padding: "2px 8px",
                      cursor: "pointer",
                      color: "#595959",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                      flexShrink: 0,
                      fontWeight: 500,
                    },
                  },
                  isExpanded ? "▲ Thu nhỏ" : "▼ Preview",
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
                  "Tải về",
                ),
              canRenameFile &&
                React.createElement(
                  "span",
                  {
                    onClick: () => {
                      setEditingFileId(f.id);
                      setEditFileTitle(displayTitle);
                    },
                    title: "Đổi tên tài liệu",
                    style: {
                      fontSize: 12,
                      padding: "2px 8px",
                      cursor: "pointer",
                      color: "#8c8c8c",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                      flexShrink: 0,
                    },
                  },
                  "✏️",
                ),
            ),
      ),
      (f.description || f.note) &&
        React.createElement(
          "div",
          {
            style: {
              padding: "0 12px 8px 42px",
              fontSize: 12,
              fontFamily: FONT,
              color: "#595959",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            },
          },
          f.description &&
            React.createElement(
              "div",
              null,
              React.createElement(
                "span",
                { style: { fontWeight: 600, color: "#8c8c8c", marginRight: 4 } },
                "Tóm tắt:",
              ),
              f.description,
            ),
          f.note &&
            React.createElement(
              "div",
              {
                style: {
                  padding: "6px 10px",
                  background: "#fafafa",
                  borderRadius: 4,
                  border: "1px dashed #d9d9d9",
                },
              },
              React.createElement(
                "span",
                { style: { fontWeight: 700, color: "#8c8c8c", marginRight: 6 } },
                "Nội dung ghi chú:",
              ),
              f.note,
            ),
        ),
      isExpanded &&
        fullUrl &&
        React.createElement(
          "div",
          { style: { borderTop: "1px solid #f0f0f0", background: "#f8f9fa" } },
          isPdf
            ? React.createElement("iframe", {
                src: fullUrl,
                style: {
                  width: "100%",
                  height: 420,
                  border: "none",
                  display: "block",
                },
                title: displayTitle,
              })
            : isImage
              ? React.createElement("img", {
                  src: fullUrl,
                  alt: displayTitle,
                  style: {
                    width: "100%",
                    maxHeight: 400,
                    objectFit: "contain",
                    display: "block",
                    background: "#fff",
                  },
                })
              : isOffice
                ? React.createElement("iframe", {
                    src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`,
                    style: {
                      width: "100%",
                      height: 600,
                      border: "none",
                      display: "block",
                    },
                    title: displayTitle,
                  })
                : null,
        ),
    );
  };

  const renderItem = (item, key, isChild = false) => {
    const { note, files } = item;
    const firstFile = files[0];
    const creatorName = note
      ? authorName(note)
      : firstFile?.createdBy
        ? userName(firstFile.createdBy) || firstFile.createdBy?.email
        : "Hệ thống";
    const time = note?.createdAt || firstFile?.createdAt;
    const hasBody = !!note?.body;
    const hasFiles = files.length > 0;
    const hasAssignees = hasAssigneeValue(note?.assignees);
    const isMyItem = note
      ? currentUser &&
        extractId(note.createdById) === extractId(currentUser.id)
      : firstFile &&
        currentUser &&
        extractId(firstFile.createdById) === extractId(currentUser.id);
    const isEditing = note && editingNoteId === note.id;
    const replies =
      note && replyMap[extractId(note.id)] ? replyMap[extractId(note.id)] : [];
    const hasReplies = replies.length > 0;
    const isExpanded = expandedThreads[note?.id];
    const itemTargetId = extractId(note?.id) || extractId(files[0]?.id);
    const replyingTargetId =
      extractId(replyingTo?.note?.id) || extractId(replyingTo?.files?.[0]?.id);
    const isReplyingToThis = !!(
      replyingTo &&
      replyingTargetId &&
      itemTargetId === replyingTargetId
    );

    const layoutType = getCommentLayoutType({ body: note?.body, assignees: note?.assignees, files });
    const badge = getLayoutBadge(layoutType, files);
    const isOnlyLayout = layoutType === "commentOnly" || layoutType === "fileOnly" || layoutType === "mentionOnly";

    return React.createElement(
      "div",
      {
        key,
        style: {
          margin: isChild ? "8px 0 8px 36px" : "12px 0",
          position: "relative",
          zIndex: isReplyingToThis || isEditing ? 50 : 1,
          background: "#fff",
          borderRadius: isOnlyLayout ? 8 : 10,
          border: isChild
            ? "1px solid #d6e4ff"
            : layoutType === "fileOnly"
              ? "1px solid #d3adf7"
              : "1px solid #f0f0f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          overflow: isReplyingToThis || isEditing ? "visible" : "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: layoutType === "fileOnly" ? "#f9f0ff" : "#fafafa",
            borderBottom: layoutType === "fileOnly" ? "1px solid #d3adf7" : "1px solid #f0f0f0",
          },
        },
        React.createElement(Av, { name: creatorName, color: layoutType === "fileOnly" ? "#722ed1" : "#1890ff", size: 24 }),
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", flex: 1 } },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 6 } },
            React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#262626", fontFamily: FONT } }, creatorName),
            React.createElement("span", { style: { fontSize: 12, color: "#8c8c8c", fontFamily: FONT } }, layoutType === "fileOnly" ? "đã tải lên tệp" : "đã bình luận"),
            badge && React.createElement("span", { style: { fontSize: 11, fontFamily: FONT, background: "#e6f4ff", color: "#096dd9", padding: "1px 6px", borderRadius: 4, border: "1px solid #91caff" } }, badge),
            isEditing && React.createElement("span", { style: { fontSize: 11, fontFamily: FONT, color: "#fa8c16", background: "#fff7e6", padding: "1px 6px", borderRadius: 4, border: "1px solid #ffd591" } }, "Đang sửa")
          ),
          React.createElement("div", { style: { fontSize: 11, color: "#bfbfbf", marginTop: 2, fontFamily: FONT } }, timeAgo(time))
        ),
      ),
      isEditing ? React.createElement(
        "div",
        { style: { padding: "12px 14px" } },
        React.createElement(CommentComposer, {
          value: editBody,
          onChange: setEditBody,
          onAssignMultiple: setEditAssignedIds,
          assignedIds: editAssignedIds,
          lawyers,
          onSubmit: () => handleSaveEdit(note.id),
        }),
        React.createElement(
          "div",
          { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 } },
          React.createElement("span", { onClick: () => { setEditingNoteId(null); setEditBody(""); setEditAssignedIds([]); }, style: { fontSize: 13, padding: "5px 14px", cursor: "pointer", color: "#595959", border: "1px solid #d9d9d9", borderRadius: 6 } }, "Hủy"),
          React.createElement("span", { onClick: () => handleSaveEdit(note.id), style: { fontSize: 13, padding: "5px 18px", cursor: "pointer", color: "#fff", background: "#1890ff", borderRadius: 6, fontWeight: 600 } }, "Lưu cập nhật")
        )
      ) : React.createElement(
        "div",
        { style: { padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 } },
        !isChild && note?.replyText && React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: "#595959",
              background: "#fff",
              border: "1px solid #e8e8e8",
              borderLeft: "3px solid #bfbfbf",
              borderRadius: 4,
              padding: "6px 10px",
              whiteSpace: "pre-wrap",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            },
          },
          React.createElement(
            "b",
            { style: { color: "#8c8c8c", marginRight: 4 } },
            "Trích dẫn:",
          ),
          " ",
          note.replyText,
        ),
        hasBody && React.createElement(
          "div",
          {
            style: {
              background: isOnlyLayout ? "#fff" : "#e6fffb",
              border: isOnlyLayout ? "1px solid #e8e8e8" : "1px solid #87e8de",
              borderLeft: "3px solid #13c2c2",
              borderRadius: isOnlyLayout ? 6 : 8,
              padding: isOnlyLayout ? "9px 12px" : "10px 14px",
              fontSize: 13,
              fontFamily: FONT,
              lineHeight: 1.6,
            },
          },
          React.createElement(
            "div",
            { style: { whiteSpace: "pre-wrap" } },
            ...React.Children.toArray(renderRichText(note.body, lawyers)),
          )
        ),
        hasAssignees && React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { style: { fontSize: 12, fontWeight: 600, color: "#8c8c8c", marginBottom: 4, fontFamily: FONT } },
            "Đã nhắc đến ai:"
          ),
          React.createElement(
            "div",
            { style: { display: "flex", flexWrap: "wrap", alignItems: "center", background: "#fafafa", padding: "6px 10px", borderRadius: 8, border: "1px solid #f0f0f0", gap: 4 } },
            renderAssigneeTags(note?.assignees)
          )
        ),
        hasFiles &&
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 8 } },
            ...files.map(renderFileRow),
          ),
        (note || files.length > 0) &&
          (canEdit || isMyItem) &&
          !isEditing &&
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 2,
                paddingLeft: 4,
              },
            },
            React.createElement(
              "span",
              {
                onClick: () => setReplyingTo(item),
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#52c41a",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                },
                onMouseEnter: (e) =>
                  (e.currentTarget.style.color = "#389e0d"),
                onMouseLeave: (e) =>
                  (e.currentTarget.style.color = "#52c41a"),
              },
              "Phản hồi",
            ),
            isMyItem &&
              note &&
              React.createElement(
                "span",
                {
                  onClick: () => {
                    setEditingNoteId(note.id);
                    setEditBody(note.body || "");
                    setEditAssignedIds(
                      (note.assignees || [])
                        .map((a) =>
                          typeof a === "object"
                            ? extractId(a.id)
                            : extractId(a),
                        )
                        .filter(Boolean),
                    );
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
                "Chỉnh sửa",
              ),
            isMyItem &&
              React.createElement(
                "span",
                {
                  onClick: () => handleDeleteNote(item),
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#ff4d4f",
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  },
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.color = "#cf1322"),
                  onMouseLeave: (e) =>
                    (e.currentTarget.style.color = "#ff4d4f"),
                },
                "Xóa",
              ),
          )
      )
      ,
      isReplyingToThis ? renderComposerBlock(true) : null,
      hasReplies &&
        React.createElement(
          "div",
          {
            style: {
              marginLeft: 36,
              padding: "0 14px 12px 0",
              marginTop: -4,
            },
          },
          React.createElement(
            "div",
            {
              onClick: () =>
                setExpandedThreads((p) => ({
                  ...p,
                  [note.id]: !p[note.id],
                })),
              style: {
                fontSize: 12,
                color: "#1890ff",
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                background: "#f0f8ff",
                borderRadius: 4,
                border: "1px dashed #91caff",
                userSelect: "none",
              },
            },
            isExpanded
              ? "▲ Thu gọn phản hồi"
              : `▼ Xem ${replies.length} phản hồi`,
          ),
          isExpanded &&
            React.createElement(
              "div",
              { style: { marginTop: 8 } },
              ...replies.map((child, idx) =>
                renderItem(child, `${key}-child-${idx}`, true),
              ),
            ),
        )
    );
  };

  const renderTaskLikeItem = (item, key, isChild = false) => {
    const { note, files } = item;
    const firstFile = files[0];
    const creatorName = note
      ? authorName(note)
      : firstFile?.createdBy
        ? userName(firstFile.createdBy) || firstFile.createdBy?.email
        : "Hệ thống";
    const time = note?.createdAt || firstFile?.createdAt;
    const hasBody = !!note?.body;
    const hasFiles = files.length > 0;
    const hasAssignees = hasAssigneeValue(note?.assignees);
    const isMyItem = note
      ? currentUser &&
        extractId(note.createdById) === extractId(currentUser.id)
      : firstFile &&
        currentUser &&
        extractId(firstFile.createdById) === extractId(currentUser.id);
    const isEditing = note && editingNoteId === note.id;
    const noteId = extractId(note?.id);
    const replies = noteId && replyMap[noteId] ? replyMap[noteId] : [];
    const hasReplies = replies.length > 0;
    const isExpanded = expandedThreads[noteId];
    const itemTargetId = extractId(note?.id) || extractId(files[0]?.id);
    const replyingTargetId =
      extractId(replyingTo?.note?.id) || extractId(replyingTo?.files?.[0]?.id);
    const isReplyingToThis = !!(
      replyingTo &&
      replyingTargetId &&
      itemTargetId === replyingTargetId
    );

    return React.createElement(
      "div",
      { key },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: 12,
            padding: isChild ? "14px 20px 14px 20px" : "16px 20px",
            borderBottom: isChild ? "none" : "1px solid #f0f0f0",
            borderLeft: isChild ? "2px solid #e6f4ff" : "none",
            marginLeft: 0,
            background: isChild ? "#fafafa" : "#fff",
            borderTop: isChild ? "1px dashed #f0f0f0" : "none",
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
                { style: { marginTop: 10 } },
                React.createElement(CommentComposer, {
                  value: editBody,
                  onChange: setEditBody,
                  onAssignMultiple: setEditAssignedIds,
                  assignedIds: editAssignedIds,
                  lawyers,
                  onSubmit: () => handleSaveEdit(note.id),
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
                      onClick: () => {
                        setEditingNoteId(null);
                        setEditBody("");
                        setEditAssignedIds([]);
                      },
                      style: {
                        fontSize: 12,
                        padding: "4px 12px",
                        cursor: "pointer",
                        color: "#595959",
                        border: "1px solid #d9d9d9",
                        borderRadius: 4,
                        fontFamily: FONT,
                      },
                    },
                    "Hủy",
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
                        fontFamily: FONT,
                      },
                    },
                    "Lưu thay đổi",
                  ),
                ),
              )
            : (hasBody || hasFiles || hasAssignees) &&
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
                    !isChild &&
                      note?.replyText &&
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            fontFamily: FONT,
                            color: "#595959",
                            background: "#fff",
                            border: "1px solid #e8e8e8",
                            borderLeft: "3px solid #bfbfbf",
                            borderRadius: 4,
                            padding: "6px 10px",
                            marginBottom: 8,
                            whiteSpace: "pre-wrap",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          },
                        },
                        React.createElement(
                          "b",
                          { style: { color: "#8c8c8c", marginRight: 4 } },
                          "Trích dẫn:",
                        ),
                        " ",
                        note.replyText,
                      ),
                    hasBody &&
                      React.createElement(
                        "div",
                        {
                          style: {
                            marginBottom:
                              hasFiles || hasAssignees ? 8 : 0,
                          },
                        },
                        renderRichText(note.body, lawyers),
                      ),
                    hasAssignees &&
                      React.createElement(
                        "div",
                        {
                          style: {
                            marginTop: hasBody ? 8 : 0,
                            marginBottom: hasFiles ? 8 : 0,
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            alignItems: "center",
                          },
                        },
                        React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 12,
                              color: "#8c8c8c",
                              fontFamily: FONT,
                            },
                          },
                          "Đã nhắc đến:",
                        ),
                        renderAssigneeTags(note?.assignees),
                      ),
                    ...files.map((f) => renderFileRow(f)),
                  ),
                  (note || files.length > 0) &&
                    (canEdit || isMyItem) &&
                    !isEditing &&
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          marginTop: 6,
                          paddingLeft: 4,
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          onClick: () => setReplyingTo(item),
                          style: {
                            fontSize: 12,
                            fontFamily: FONT,
                            color: "#52c41a",
                            cursor: "pointer",
                            textDecoration: "underline",
                            textUnderlineOffset: "2px",
                          },
                          onMouseEnter: (e) =>
                            (e.currentTarget.style.color = "#389e0d"),
                          onMouseLeave: (e) =>
                            (e.currentTarget.style.color = "#52c41a"),
                        },
                        "Phản hồi",
                      ),
                      isMyItem &&
                        note &&
                        React.createElement(
                          "span",
                          {
                            onClick: () => {
                              setEditingNoteId(note.id);
                              setEditBody(note.body || "");
                              setEditAssignedIds(
                                (note.assignees || [])
                                  .map((a) =>
                                    typeof a === "object"
                                      ? extractId(a.id)
                                      : extractId(a),
                                  )
                                  .filter(Boolean),
                              );
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
                          "Chỉnh sửa",
                        ),
                      isMyItem &&
                        React.createElement(
                          "span",
                          {
                            onClick: () => handleDeleteNote(item),
                            style: {
                              fontSize: 12,
                              fontFamily: FONT,
                              color: "#ff4d4f",
                              cursor: "pointer",
                              textDecoration: "underline",
                              textUnderlineOffset: "2px",
                            },
                            onMouseEnter: (e) =>
                              (e.currentTarget.style.color = "#cf1322"),
                            onMouseLeave: (e) =>
                              (e.currentTarget.style.color = "#ff4d4f"),
                          },
                          "Xóa",
                        ),
                    ),
                ),
          isReplyingToThis && canEdit ? renderComposerBlock(true) : null,
        ),
      ),
      hasReplies &&
        React.createElement(
          "div",
          {
            style: { marginLeft: 44, padding: "0 20px 16px 0", marginTop: -8 },
          },
          React.createElement(
            "div",
            {
              onClick: () =>
                setExpandedThreads((p) => ({ ...p, [noteId]: !p[noteId] })),
              style: {
                fontSize: 12,
                color: "#1890ff",
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                background: "#f0f8ff",
                borderRadius: 4,
                border: "1px dashed #91caff",
                userSelect: "none",
              },
            },
            isExpanded
              ? "▲ Thu gọn phản hồi"
              : `▼ Xem ${replies.length} phản hồi`,
            !isExpanded &&
              Avatar &&
              React.createElement(
                Avatar.Group,
                { size: "small", maxCount: 3 },
                replies.map((r, i) =>
                  React.createElement(Av, {
                    key: i,
                    name: r.note ? authorName(r.note) : "Ẩn danh",
                    size: 16,
                  }),
                ),
              ),
          ),
          isExpanded &&
            React.createElement(
              "div",
              { style: { marginTop: 8 } },
              ...replies.map((child, idx) =>
                renderTaskLikeItem(child, `${key}-child-${idx}`, true),
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
        const name = doc.metadata.title || doc.fileName || "Tài liệu";
        return React.createElement(
          "div",
          {
            key: i,
            style: {
              display: "flex",
              flexDirection: "column",
              background: "#fafafa",
              border: "1px dashed #d9d9d9",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 13,
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
                  padding: "1px 8px",
                  borderRadius: 10,
                  border: "1px solid #ffd591",
                  fontWeight: 600,
                },
              },
              "Chờ gửi",
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
                  fontSize: 18,
                  lineHeight: 1,
                  marginLeft: 6,
                },
              },
              "×",
            ),
          ),
          doc.metadata.description &&
            React.createElement(
              "div",
              { style: { marginTop: 6, color: "#595959", fontSize: 12 } },
              React.createElement(
                "span",
                { style: { fontWeight: 600, color: "#8c8c8c" } },
                "Tóm tắt:",
              ),
              ` ${doc.metadata.description}`,
            ),
        );
      }),
    );
  };

  const hasCommentText = getCommentText(body, true).length > 0;
  const isMentionOnly = assignedIds.length > 0 && !hasCommentText;
  const canSend =
    (hasCommentText || pendingDocs.length > 0) && !isMentionOnly && !sending;
  const visibleFeed = showAll ? feed : feed.slice(0, INITIAL_COUNT);
  const hasMore = feed.length > INITIAL_COUNT;

  const rootItems = [];
  const replyMap = {};
  visibleFeed.forEach((item) => {
    const pId = extractId(item.note?.parentId);
    if (pId && visibleFeed.some((p) => extractId(p.note?.id) === pId)) {
      if (!replyMap[pId]) replyMap[pId] = [];
      replyMap[pId].push(item);
    } else {
      rootItems.push(item);
    }
  });

  Object.keys(replyMap).forEach((k) => {
    replyMap[k].sort((a, b) => a._time - b._time);
  });

  const renderComposerBlock = (isInline = false) =>
    React.createElement(
      "div",
      {
        style: {
          padding: isInline ? "12px 14px 14px 14px" : "0 0 24px 0",
          borderBottom: isInline ? "none" : "2px solid #f0f0f0",
          marginBottom: isInline ? 0 : 16,
          background: "#fff",
        },
      },
      replyingTo &&
        React.createElement(
          "div",
          {
            style: {
              padding: "8px 12px",
              background: "#f5f5f5",
              borderLeft: "3px solid #1890ff",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderRadius: "0 4px 4px 0",
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
                  fontWeight: 700,
                  color: "#8c8c8c",
                  fontFamily: FONT,
                },
              },
              "Đang trả lời ",
              replyingTo.note ? authorName(replyingTo.note) : "Tài liệu",
            ),
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  color: "#595959",
                  fontFamily: FONT,
                  marginTop: 4,
                  whiteSpace: "pre-wrap",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                },
              },
              replyingTo.note?.body
                ? getCommentText(replyingTo.note.body)
                : "Tài liệu đính kèm",
            ),
          ),
          React.createElement(
            "div",
            {
              onClick: () => setReplyingTo(null),
              style: {
                cursor: "pointer",
                color: "#bfbfbf",
                fontSize: 16,
                lineHeight: 1,
                padding: "0 4px",
              },
            },
            "×",
          ),
        ),
      React.createElement(CommentComposer, {
        value: body,
        onChange: setBody,
        onAssignMultiple: (ids) => setAssignedIds(ids),
        assignedIds,
        lawyers,
        placeholder: "Viết bình luận, ghi chú nội bộ... (Có thể tag @Luật sư)",
        onSubmit: canSend
          ? handleSend
          : isMentionOnly
            ? warnMentionOnly
            : undefined,
        onUploadClick: () => setShowUploadModal(true),
      }),
      renderPendingChips(),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 12,
            flexWrap: "wrap",
          },
        },
        React.createElement(
          "div",
          {
            onClick: canSend
              ? handleSend
              : isMentionOnly
                ? warnMentionOnly
                : undefined,
            style: {
              marginLeft: "auto",
              padding: isInline ? "6px 18px" : "8px 24px",
              borderRadius: 6,
              fontSize: isInline ? 13 : 14,
              fontFamily: FONT,
              fontWeight: 700,
              background: !canSend ? "#f0f0f0" : "#1890ff",
              color: !canSend ? "#bfbfbf" : "#fff",
              cursor: !canSend ? "not-allowed" : "pointer",
              border: "none",
              transition: "all 0.2s",
            },
          },
          sending ? "Đang gửi..." : isInline ? "Phản hồi" : "Đăng bình luận",
        ),
      ),
    );

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#fff",
      },
    },
    !replyingTo && canEdit ? renderComposerBlock(false) : null,
    React.createElement(
      "div",
      { style: { paddingBottom: 24 } },
      loading
        ? React.createElement(
            "div",
            { style: { textAlign: "center", padding: "40px 0" } },
            React.createElement(Spin, { size: "large" }),
          )
        : feed.length === 0
          ? React.createElement(
              "div",
              {
                style: {
                  textAlign: "center",
                  padding: "60px 0",
                  fontSize: 14,
                  fontFamily: FONT,
                  color: "#bfbfbf",
                },
              },
              "Vụ việc này chưa có bình luận hay tài liệu nội bộ nào.",
            )
          : React.createElement(
              "div",
              null,
              ...rootItems.map((item, i) =>
                renderTaskLikeItem(item, `item-${i}`),
              ),
              hasMore &&
                React.createElement(
                  "div",
                  {
                    onClick: () => setShowAll((v) => !v),
                    style: {
                      margin: "24px 0",
                      textAlign: "center",
                      fontSize: 13,
                      fontFamily: FONT,
                      color: "#1890ff",
                      cursor: "pointer",
                      padding: "10px 0",
                      border: "1px dashed #91caff",
                      borderRadius: 8,
                      background: "#f0f8ff",
                      transition: "all 0.2s",
                    },
                    onMouseEnter: (e) =>
                      (e.currentTarget.style.background = "#d6ecff"),
                    onMouseLeave: (e) =>
                      (e.currentTarget.style.background = "#f0f8ff"),
                  },
                  showAll
                    ? `▲ Thu gọn (đang hiện ${feed.length})`
                    : `▼ Xem tất cả ${feed.length} bình luận & tài liệu`,
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
      currentLawyerId,
      lawyers,
      projectFolderId,
    }),
  );
};

// ============================================================
// §5 MAIN WRAPPER (ECOSYSTEM BOOTSTRAPPER)
// ============================================================
const ProjectNotesEcosystem = () => {
  const [lawyers, setLawyers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [projectFolderId, setProjectFolderId] = useState(null);
  const [notesCanEdit, setNotesCanEdit] = useState(true);
  const [loadingContext, setLoadingContext] = useState(true);

  useEffect(() => {
    if (!RECORD_ID) return;
    const init = async () => {
      setLoadingContext(true);
      try {
        const userRes = await ctx.api.request({ url: "auth:check" });
        const user = userRes?.data?.data || userRes?.data || null;
        setCurrentUser(user);

        const lawRes = await ctx.api.request({
          url: "lawyers:list",
          params: { pageSize: 500, fields: "id,lawyerName,lawyerType,userId" },
        });
        const lawyerList = lawRes?.data?.data || [];
        setLawyers(lawyerList);
        const currentLawyer = lawyerList.find((l) => {
          const lawyerUserId = extractId(l.userId) || extractId(l.user);
          return extractId(user?.id) && lawyerUserId === extractId(user?.id);
        });

        // Tìm folder gốc của Project để hứng file
        const folderRes = await ctx.api.request({
          url: "folders:list",
          params: {
            appends: ["folderMember", "folderManager"],
            filter: JSON.stringify({
              projectId: { $eq: parseInt(RECORD_ID) },
            }),
          },
        });
        const folders = folderRes?.data?.data || [];
        if (folders.length > 0) {
          const rootFolder =
            folders.find((f) => f.type === "cases") || folders[0];
          setProjectFolderId(rootFolder.id);
          const perms = getFolderPermissions(
            rootFolder,
            user,
            folders,
            extractId(currentLawyer?.id),
          );
          setNotesCanEdit(
            isAdminUser(user) || perms.isManager || perms.isMember || perms.canEdit,
          );
        } else {
          setNotesCanEdit(true);
        }
      } catch (e) {
        console.error("Error booting context", e);
      }
      setLoadingContext(false);
    };
    init();
  }, []);

  if (!RECORD_ID)
    return React.createElement(
      Text,
      {
        type: "secondary",
        style: { padding: 16, display: "block", fontFamily: FONT },
      },
      "Không tìm thấy thông tin vụ việc hiện tại.",
    );

  if (loadingContext)
    return React.createElement(
      "div",
      { style: { padding: 40, textAlign: "center" } },
      React.createElement(Spin),
    );

  const tabItems = [
    {
      key: "notes",
      label: React.createElement(
        "span",
        { style: { fontSize: 14, fontWeight: 600, fontFamily: FONT } },
        "💬 Bàn luận & Hồ sơ nội bộ",
      ),
      // 🌟 PATCH 1: Đã thay đổi maxWidth: 900 thành width: '100%'
      children: React.createElement(
        "div",
        { style: { width: "100%", margin: "0 auto", paddingTop: 10 } },
        React.createElement(UnifiedNoteThread, {
          collectionName: COLLECTION_NAME,
          recordId: RECORD_ID,
          currentUser,
          lawyers,
          projectFolderId,
          canEdit: notesCanEdit,
        }),
      ),
    },
  ];

  return React.createElement(
    "div",
    {
      style: {
        padding: "10px 24px",
        fontFamily: FONT,
        background: "#fff",
        minHeight: "80vh",
      },
    },
    React.createElement(Tabs, {
      defaultActiveKey: "notes",
      size: "middle",
      items: tabItems,
      tabBarStyle: { marginBottom: 24, borderBottom: "2px solid #f0f0f0" },
    }),
  );
};

ctx.render(React.createElement(ProjectNotesEcosystem, null));
