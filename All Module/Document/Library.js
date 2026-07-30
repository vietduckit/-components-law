  // ============================================================
  // §1 CONFIG & SETUP
  // ============================================================
  const { React } = ctx;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const {
    Spin,
    Typography,
    Modal,
    Button,
    Input,
    Form,
    message,
    Card,
    Empty,
    Layout,
    Tag,
    Row,
    Col,
    Select,
    Table,
    Tooltip,
    Upload,
    Progress,
    TreeSelect,
    Dropdown,
    Checkbox,
    DatePicker,
  } = ctx.antd;
  const { Sider, Content } = Layout;
  const { Title, Text } = Typography;
  const { Dragger } = Upload;

  const FONT =
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  // ============================================================
  // ⚙️  DASHBOARD CONFIG — Chỉnh tại đây để tái sử dụng cho module khác
  // ============================================================
  const DASHBOARD_CONFIG = {
    // ── Collection chính (document / folder sẽ lưu relation về đây) ──────────
    collection: "internalTemplates", // tên collection chính (vd: "customers", "contracts")

    // ── Scope lọc folder & document ──────────────────────────────────────────
    moduleScope: "internal_templates", // scope chính ghi vào DB
    moduleScopes: [
      "internal_templates",
      "internal_template",
      "legal_reference",
      "legal_study",
      "personal",
      "knowledge",
    ], // danh sách scope được chấp nhận (filter $in)

    // ── API endpoints để fetch danh sách "parent" (Legal Reference / Customer…) ──
    parentListCandidates: [
      // thử lần lượt đến khi thành công
      "legalReference:list",
      "legalReferences:list",
      "LegalReference:list",
    ],
    parentCreateCandidates: [
      "legalReference:create",
      "legalReferences:create",
      "LegalReference:create",
    ],

    // ── Tên field relation trong document/folder trỏ về "parent" ─────────────
    // Thứ tự: field chính → các alias fallback (dùng khi thử tạo record)
    relationFieldCandidates: [
      "internalTemplates", // field chính (array/object)
      "internalTemplatesId", // id variant
      "internalTemplate", // singular
      "internalTemplateId", // singular id
    ],

    // ── Hàm lấy ID của parent từ 1 record folder/document ───────────────────
    getParentIdFromRecord: (record) =>
      extractRelationId(record?.internalTemplates) ||
      extractRelationId(record?.internalTemplatesId) ||
      extractRelationId(record?.internalTemplate) ||
      extractRelationId(record?.internalTemplateId),

    // ── Hàm lấy ID của parent từ 1 record sidebar (Legal Reference / Customer) ─
    getParentListId: (record) =>
      extractId(record?.legalReferenceId) ||
      extractId(record?.legalReference) ||
      extractId(record?.legalReferenceRecord),

    // ── Nhãn hiển thị trong UI ────────────────────────────────────────────────
    label: {
      sidebar: "Reference", // tiêu đề sidebar
      sidebarItem: "Reference", // tên 1 item trong sidebar
      createButton: "Create New Reference",
      searchPlaceholder: "Search reference...",
    },
  };

  // Shorthand constants (để không phải đổi code bên dưới)
  const INTERNAL_TEMPLATE_COLLECTION = DASHBOARD_CONFIG.collection;
  const INTERNAL_TEMPLATE_MODULE_SCOPE = DASHBOARD_CONFIG.moduleScope;
  const INTERNAL_TEMPLATE_MODULE_SCOPES = DASHBOARD_CONFIG.moduleScopes;
  const LEGAL_STUDY_LABEL = "Legal Study";
  // 🌟 Legal Study không còn là collection riêng — đây chỉ là 1 folder mẫu
  // có sẵn trong cây tài liệu của mỗi Case (moduleScope vẫn là
  // CASE_DOCUMENT_SCOPE), nhận diện qua field `folderTemplateKey` trên
  // folders (do CaseCreateForm.js gán khi tạo Case). LEGAL_STUDY_STORAGE_TYPE
  // vẫn giữ lại làm key nội bộ cho activeSpace/sidebar, không phải giá trị
  // ghi xuống DB nữa.
  const LEGAL_STUDY_STORAGE_TYPE = "legal_study";
  const LEGAL_STUDY_FOLDER_TEMPLATE_KEY = "legal_study";
  const SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS = new Set([
    LEGAL_STUDY_FOLDER_TEMPLATE_KEY,
    "lsc_related",
    "legal_docs",
    "legal_dossiers",
    "report_result",
  ]);
  // Name-based fallback: cases created before folderTemplateKey existed on
  // this schema have these 5 folders WITHOUT that field (CaseCreateForm.js
  // only started stamping it once the field was added), so the primary
  // key-based check silently misses them. Match on the exact template
  // names too — these are fixed labels only CaseCreateForm.js assigns, so a
  // name collision with a genuine user-created folder is effectively nil.
  const SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES = new Set([
    "legal study",
    "lsc & related",
    "legal docs",
    "legal dossiers",
    "report and result",
  ]);
  const isRenameLockedFolder = (record) =>
    record?._type === "folder" &&
    (SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS.has(record?.folderTemplateKey) ||
      SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES.has(
        String(record?.name || "").trim().toLowerCase(),
      ));
  const CASE_REFERENCE_CREATE_POPUP_UID = "sc3ohtxeu52";
  const CASE_REFERENCE_CREATE_VIEW_URL =
    "https://law.dev.samset.net/admin/5hu22zyhxgd/view/sc3ohtxeu52";
  const CASE_REFERENCE_DATA_BLOCK_UID = "5cyaa66tjwi";
  // Custom JS blocks like this one aren't resolvable through
  // ctx.getModel(uid)/resource.refresh(), so the reused create-new popups
  // (CaseReferenceCreateBlock.js) also broadcast this window event after a
  // successful create; we just reload everything.
  const LIBRARY_DATA_CHANGED_EVENT = "law-library:data-changed";
  const MY_DOCUMENT_STORAGE_TYPE = "personal";
  const KNOWLEDGE_STORAGE_TYPE = "knowledge";
  const FILE_TYPE_SVG = {
    // ── Documents ──────────────────────────────────────────
    pdf: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fee2e2" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#fca5a5"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#ef4444" />
        <text
          x="24"
          y="34"
          textAnchor="middle"
          fill="#dc2626"
          fontSize="10"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          PDF
        </text>
      </svg>
    ),
    doc: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#dbeafe" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#bfdbfe"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#3b82f6" />
        <path
          d="M16 24h16M16 28h16M16 32h10"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="20"
          textAnchor="middle"
          fill="#1d4ed8"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          WORD
        </text>
      </svg>
    ),
    docx: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#dbeafe" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#bfdbfe"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#3b82f6" />
        <path
          d="M16 24h16M16 28h16M16 32h10"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="20"
          textAnchor="middle"
          fill="#1d4ed8"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          WORD
        </text>
      </svg>
    ),
    xls: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#d1fae5" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#a7f3d0"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#10b981" />
        <path d="M16 22h16v14H16z" stroke="#059669" strokeWidth="1.5" />
        <path
          d="M16 26h16M16 30h16M24 22v14"
          stroke="#059669"
          strokeWidth="1.5"
        />
        <text
          x="24"
          y="20"
          textAnchor="middle"
          fill="#065f46"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          EXCEL
        </text>
      </svg>
    ),
    xlsx: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#d1fae5" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#a7f3d0"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#10b981" />
        <path d="M16 22h16v14H16z" stroke="#059669" strokeWidth="1.5" />
        <path
          d="M16 26h16M16 30h16M24 22v14"
          stroke="#059669"
          strokeWidth="1.5"
        />
        <text
          x="24"
          y="20"
          textAnchor="middle"
          fill="#065f46"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          EXCEL
        </text>
      </svg>
    ),
    ppt: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#ffedd5" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#fed7aa"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#f97316" />
        <rect
          x="15"
          y="21"
          width="18"
          height="12"
          rx="1"
          stroke="#ea580c"
          strokeWidth="1.5"
        />
        <path
          d="M22 33v4M18 37h8"
          stroke="#ea580c"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="20"
          textAnchor="middle"
          fill="#c2410c"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          PPT
        </text>
      </svg>
    ),
    pptx: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#ffedd5" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#fed7aa"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#f97316" />
        <rect
          x="15"
          y="21"
          width="18"
          height="12"
          rx="1"
          stroke="#ea580c"
          strokeWidth="1.5"
        />
        <path
          d="M22 33v4M18 37h8"
          stroke="#ea580c"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="20"
          textAnchor="middle"
          fill="#c2410c"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          PPT
        </text>
      </svg>
    ),
    odt: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#dbeafe" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#bfdbfe"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#3b82f6" />
        <path
          d="M16 24h16M16 28h16M16 32h10"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    // ── Images ─────────────────────────────────────────────
    png: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#f0fdf4" />
        <rect
          x="8"
          y="12"
          width="32"
          height="24"
          rx="3"
          fill="#bbf7d0"
          stroke="#4ade80"
          strokeWidth="1.5"
        />
        <circle cx="17" cy="20" r="3" fill="#fbbf24" />
        <path d="M8 30l8-7 6 6 5-4 11 9" fill="#4ade80" opacity=".7" />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#15803d"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          PNG
        </text>
      </svg>
    ),
    jpg: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#f0fdf4" />
        <rect
          x="8"
          y="12"
          width="32"
          height="24"
          rx="3"
          fill="#bbf7d0"
          stroke="#4ade80"
          strokeWidth="1.5"
        />
        <circle cx="17" cy="20" r="3" fill="#fbbf24" />
        <path d="M8 30l8-7 6 6 5-4 11 9" fill="#4ade80" opacity=".7" />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#15803d"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          JPG
        </text>
      </svg>
    ),
    jpeg: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#f0fdf4" />
        <rect
          x="8"
          y="12"
          width="32"
          height="24"
          rx="3"
          fill="#bbf7d0"
          stroke="#4ade80"
          strokeWidth="1.5"
        />
        <circle cx="17" cy="20" r="3" fill="#fbbf24" />
        <path d="M8 30l8-7 6 6 5-4 11 9" fill="#4ade80" opacity=".7" />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#15803d"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          JPEG
        </text>
      </svg>
    ),
    gif: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fef9c3" />
        <rect
          x="8"
          y="12"
          width="32"
          height="24"
          rx="3"
          fill="#fef08a"
          stroke="#facc15"
          strokeWidth="1.5"
        />
        <path
          d="M18 24c0-3.3 2.7-6 6-6 1.7 0 3.2.7 4.2 1.8"
          stroke="#eab308"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M30 28c0 3.3-2.7 6-6 6-1.7 0-3.2-.7-4.2-1.8"
          stroke="#eab308"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#a16207"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          GIF
        </text>
      </svg>
    ),
    webp: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#f0fdf4" />
        <rect
          x="8"
          y="12"
          width="32"
          height="24"
          rx="3"
          fill="#bbf7d0"
          stroke="#4ade80"
          strokeWidth="1.5"
        />
        <circle cx="17" cy="20" r="3" fill="#fbbf24" />
        <path d="M8 30l8-7 6 6 5-4 11 9" fill="#4ade80" opacity=".7" />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#15803d"
          fontSize="6"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          WEBP
        </text>
      </svg>
    ),
    svg: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fef9c3" />
        <circle cx="24" cy="24" r="10" stroke="#eab308" strokeWidth="2" />
        <path
          d="M18 24c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6"
          stroke="#ca8a04"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#a16207"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          SVG
        </text>
      </svg>
    ),
    // ── Video ───────────────────────────────────────────────
    mp4: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#ede9fe" />
        <rect
          x="6"
          y="13"
          width="36"
          height="22"
          rx="3"
          fill="#ddd6fe"
          stroke="#8b5cf6"
          strokeWidth="1.5"
        />
        <polygon points="20,18 20,30 32,24" fill="#7c3aed" />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#6d28d9"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          MP4
        </text>
      </svg>
    ),
    webm: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#ede9fe" />
        <rect
          x="6"
          y="13"
          width="36"
          height="22"
          rx="3"
          fill="#ddd6fe"
          stroke="#8b5cf6"
          strokeWidth="1.5"
        />
        <polygon points="20,18 20,30 32,24" fill="#7c3aed" />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#6d28d9"
          fontSize="6"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          WEBM
        </text>
      </svg>
    ),
    mov: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#ede9fe" />
        <rect
          x="6"
          y="13"
          width="36"
          height="22"
          rx="3"
          fill="#ddd6fe"
          stroke="#8b5cf6"
          strokeWidth="1.5"
        />
        <polygon points="20,18 20,30 32,24" fill="#7c3aed" />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#6d28d9"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          MOV
        </text>
      </svg>
    ),
    mkv: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#ede9fe" />
        <rect
          x="6"
          y="13"
          width="36"
          height="22"
          rx="3"
          fill="#ddd6fe"
          stroke="#8b5cf6"
          strokeWidth="1.5"
        />
        <polygon points="20,18 20,30 32,24" fill="#7c3aed" />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#6d28d9"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          MKV
        </text>
      </svg>
    ),
    // ── Audio ───────────────────────────────────────────────
    mp3: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fce7f3" />
        <circle
          cx="24"
          cy="26"
          r="7"
          fill="#fbcfe8"
          stroke="#ec4899"
          strokeWidth="1.5"
        />
        <circle cx="24" cy="26" r="2.5" fill="#ec4899" />
        <path
          d="M24 19V13l8-2v6"
          stroke="#ec4899"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#be185d"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          MP3
        </text>
      </svg>
    ),
    wav: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fce7f3" />
        <path
          d="M8 24 Q12 16 16 24 Q20 32 24 24 Q28 16 32 24 Q36 32 40 24"
          stroke="#ec4899"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#be185d"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          WAV
        </text>
      </svg>
    ),
    aac: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fce7f3" />
        <path
          d="M8 24 Q12 16 16 24 Q20 32 24 24 Q28 16 32 24 Q36 32 40 24"
          stroke="#ec4899"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#be185d"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          AAC
        </text>
      </svg>
    ),
    m4a: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fce7f3" />
        <path
          d="M8 24 Q12 16 16 24 Q20 32 24 24 Q28 16 32 24 Q36 32 40 24"
          stroke="#ec4899"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#be185d"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          M4A
        </text>
      </svg>
    ),
    flac: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fce7f3" />
        <path
          d="M8 24 Q12 16 16 24 Q20 32 24 24 Q28 16 32 24 Q36 32 40 24"
          stroke="#ec4899"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#be185d"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          FLAC
        </text>
      </svg>
    ),
    // ── Text / Code ─────────────────────────────────────────
    txt: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#f9fafb" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#f3f4f6"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#9ca3af" />
        <path
          d="M16 22h16M16 26h16M16 30h12"
          stroke="#6b7280"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="42"
          textAnchor="middle"
          fill="#374151"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          TXT
        </text>
      </svg>
    ),
    csv: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#ecfdf5" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#d1fae5"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#10b981" />
        <path d="M14 22h20v14H14z" stroke="#059669" strokeWidth="1.2" />
        <path
          d="M14 26h20M14 30h20M22 22v14"
          stroke="#059669"
          strokeWidth="1.2"
        />
        <text
          x="24"
          y="42"
          textAnchor="middle"
          fill="#065f46"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          CSV
        </text>
      </svg>
    ),
    json: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fefce8" />
        <path
          d="M18 14c-2 0-4 1-4 4v3c0 2-1 3-3 3 2 0 3 1 3 3v3c0 3 2 4 4 4"
          stroke="#ca8a04"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M30 14c2 0 4 1 4 4v3c0 2 1 3 3 3-2 0-3 1-3 3v3c0 3-2 4-4 4"
          stroke="#ca8a04"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#a16207"
          fontSize="6"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          JSON
        </text>
      </svg>
    ),
    xml: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fff7ed" />
        <path
          d="M16 20l-6 4 6 4M32 20l6 4-6 4M27 16l-6 16"
          stroke="#c2410c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#c2410c"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          XML
        </text>
      </svg>
    ),
    html: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fff7ed" />
        <path
          d="M16 20l-6 4 6 4M32 20l6 4-6 4M27 16l-6 16"
          stroke="#ea580c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#c2410c"
          fontSize="6"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          HTML
        </text>
      </svg>
    ),
    md: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#f8fafc" />
        <path
          d="M8 14h32v20H8z"
          rx="2"
          fill="#e2e8f0"
          stroke="#94a3b8"
          strokeWidth="1.2"
        />
        <path
          d="M13 29v-10l4 5 4-5v10M25 29v-10M25 29h6"
          stroke="#475569"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="24"
          y="44"
          textAnchor="middle"
          fill="#334155"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          MD
        </text>
      </svg>
    ),
    // ── Code ────────────────────────────────────────────────
    js: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#fefce8" />
        <rect
          x="6"
          y="6"
          width="36"
          height="36"
          rx="4"
          fill="#fde047"
          stroke="#ca8a04"
          strokeWidth="1.5"
        />
        <text
          x="24"
          y="30"
          textAnchor="middle"
          fill="#713f12"
          fontSize="16"
          fontWeight="900"
          fontFamily="Arial,sans-serif"
        >
          JS
        </text>
      </svg>
    ),
    ts: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#dbeafe" />
        <rect
          x="6"
          y="6"
          width="36"
          height="36"
          rx="4"
          fill="#3b82f6"
          stroke="#1d4ed8"
          strokeWidth="1.5"
        />
        <text
          x="24"
          y="30"
          textAnchor="middle"
          fill="#fff"
          fontSize="16"
          fontWeight="900"
          fontFamily="Arial,sans-serif"
        >
          TS
        </text>
      </svg>
    ),
    py: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#dbeafe" />
        <path
          d="M24 8c-7 0-10 3-10 7v4h10v2H10s-6 0-6 10 4 10 8 10h4v-5s0-5 8-5h8s8 1 8-8V18c0-7-6-10-16-10z"
          fill="#3b82f6"
        />
        <path
          d="M24 40c7 0 10-3 10-7v-4H24v-2h14s6 0 6-10-4-10-8-10h-4v5s0 5-8 5H16s-8-1-8 8v6c0 7 6 10 16 10z"
          fill="#fbbf24"
        />
        <circle cx="19" cy="14" r="2" fill="#fff" />
        <circle cx="29" cy="34" r="2" fill="#1d4ed8" />
      </svg>
    ),
    sql: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#ede9fe" />
        <ellipse
          cx="24"
          cy="16"
          rx="14"
          ry="5"
          fill="#c4b5fd"
          stroke="#7c3aed"
          strokeWidth="1.5"
        />
        <path
          d="M10 16v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8"
          stroke="#7c3aed"
          strokeWidth="1.5"
        />
        <path
          d="M10 24v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8"
          stroke="#7c3aed"
          strokeWidth="1.5"
        />
      </svg>
    ),
    // ── Archive ─────────────────────────────────────────────
    zip: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#f3f4f6" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#e5e7eb"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#9ca3af" />
        <path
          d="M22 10v4M26 10v4M22 14v4M26 14v4M22 18v4M26 18v4M22 22v2a2 2 0 0 0 4 0v-2"
          stroke="#6b7280"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="42"
          textAnchor="middle"
          fill="#374151"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          ZIP
        </text>
      </svg>
    ),
    rar: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#f3f4f6" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#e5e7eb"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#9ca3af" />
        <path
          d="M22 10v4M26 10v4M22 14v4M26 14v4M22 18v4M26 18v4M22 22v2a2 2 0 0 0 4 0v-2"
          stroke="#6b7280"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="42"
          textAnchor="middle"
          fill="#374151"
          fontSize="7"
          fontWeight="800"
          fontFamily="Arial,sans-serif"
        >
          RAR
        </text>
      </svg>
    ),
    // ── Default ─────────────────────────────────────────────
    default: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="44"
        height="44"
      >
        <rect width="48" height="48" rx="8" fill="#f3f4f6" />
        <path
          d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
          fill="#e5e7eb"
        />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#9ca3af" />
        <path
          d="M16 22h16M16 26h16M16 30h10"
          stroke="#6b7280"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  const getFileSvgIcon = (ext) => {
    const key = String(ext || "")
      .replace(".", "")
      .toLowerCase();
    return FILE_TYPE_SVG[key] || FILE_TYPE_SVG.default;
  };

  const IconSvg = ({ children, size = 18 }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );

  const TYPE_ICONS = {
    contract: (
      <IconSvg>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </IconSvg>
    ),
    policy: (
      <IconSvg>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </IconSvg>
    ),
    hr: (
      <IconSvg>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </IconSvg>
    ),
    finance: (
      <IconSvg>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </IconSvg>
    ),
    legal: (
      <IconSvg>
        <path d="M12 3v18" />
        <path d="M3 13a4 4 0 1 0 8 0 4 4 0 1 0-8 0" />
        <path d="M13 13a4 4 0 1 0 8 0 4 4 0 1 0-8 0" />
        <line x1="3" y1="13" x2="7" y2="7" />
        <line x1="11" y1="13" x2="7" y2="7" />
        <line x1="13" y1="13" x2="17" y2="7" />
        <line x1="21" y1="13" x2="17" y2="7" />
      </IconSvg>
    ),
    it: (
      <IconSvg>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </IconSvg>
    ),
    proposal: (
      <IconSvg>
        <path d="M3 11l18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </IconSvg>
    ),
    template: (
      <IconSvg>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
        <path d="M8 15h5" />
      </IconSvg>
    ),
    folder: (
      <IconSvg>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </IconSvg>
    ),
    upload: (
      <IconSvg size={16}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </IconSvg>
    ),
    default: (
      <IconSvg>
        <path d="M6 2h9l5 5v15H6z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </IconSvg>
    ),
  };

  const GRID_ICON = (
    <IconSvg size={16}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </IconSvg>
  );

  const TABLE_ICON = (
    <IconSvg size={16}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M3 15h18" />
      <path d="M9 4v16" />
    </IconSvg>
  );

  const PLUS_ICON = (
    <IconSvg size={16}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconSvg>
  );

  const REFRESH_ICON = (
    <IconSvg size={16}>
      <path d="M23 4v6h-6" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </IconSvg>
  );

  const SIDEBAR_ICON = (
    <IconSvg size={16}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </IconSvg>
  );

  const EYE_ICON = (
    <IconSvg size={16}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </IconSvg>
  );

  const DOWNLOAD_ICON = (
    <IconSvg size={16}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </IconSvg>
  );

  const LINK_CASE_ICON = (
    <IconSvg size={15}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </IconSvg>
  );

  const EDIT_ICON = (
    <IconSvg size={15}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </IconSvg>
  );

  const CHECK_ICON = (
    <IconSvg size={15}>
      <polyline points="20 6 9 17 4 12" />
    </IconSvg>
  );

  const CLOSE_ICON = (
    <IconSvg size={15}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </IconSvg>
  );

  const MOVE_ICON = (
    <IconSvg size={15}>
      <polyline points="5 9 2 12 5 15" />
      <polyline points="9 5 12 2 15 5" />
      <polyline points="15 19 12 22 9 19" />
      <polyline points="19 9 22 12 19 15" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </IconSvg>
  );

  const DELETE_ICON = (
    <IconSvg size={15}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </IconSvg>
  );

  const WarningIcon = (
    <IconSvg size={24}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </IconSvg>
  );

  const RESTORE_ICON = (
    <IconSvg size={15}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </IconSvg>
  );

  const ChevronDown = (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );

  const ChevronRight = (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );

  const TYPE_DECOR = {
    contract: { color: "#111827", background: "#f3f4f6" },
    policy: { color: "#475569", background: "#f1f5f9" },
    hr: { color: "#0f766e", background: "#ccfbf1" },
    finance: { color: "#b45309", background: "#fef3c7" },
    legal: { color: "#7c3aed", background: "#ede9fe" },
    it: { color: "#2563eb", background: "#dbeafe" },
    proposal: { color: "#dc2626", background: "#fee2e2" },
    template: { color: "#0891b2", background: "#cffafe" },
    default: { color: "#374151", background: "#f3f4f6" },
  };

  const DEFAULT_DOCUMENT_TYPE_OPTIONS = [
    { value: "contract", label: "Contract" },
    { value: "policy", label: "Policy" },
    { value: "hr", label: "HR" },
    { value: "finance", label: "Finance" },
    { value: "legal", label: "Legal" },
    { value: "it", label: "IT" },
    { value: "proposal", label: "Proposal" },
    { value: "template", label: "Template" },
  ];

  const ALLOWED_DOCUMENT_TYPE_VALUES = new Set(
    DEFAULT_DOCUMENT_TYPE_OPTIONS.map((option) => option.value),
  );

  const extractId = (val) =>
    typeof val === "object" && val !== null ? val.id : val;
  const extractRelationId = (val) =>
    Array.isArray(val) ? extractId(val[0]) : extractId(val);
  const normalizeKey = (val) =>
    String(val || "")
      .trim()
      .toLowerCase();
  const getCompanyName = (company) =>
    company?.shortName || company?.name || company?.legalName || "Company";
  const getDocTitle = (doc) =>
    doc?.title ||
    doc?.name ||
    doc?.templateName ||
    getAttachment(doc)?.title ||
    getAttachment(doc)?.filename ||
    "Untitled";
  const getDocCode = (doc) => doc?.documentCode || doc?.templateCode || "";
  const getDocDate = (doc) => doc?.updatedAt || doc?.createdAt;
  const getAttachment = (doc) =>
    Array.isArray(doc?.fileAttachment)
      ? doc.fileAttachment[0]
      : doc?.fileAttachment;
  const getInternalTemplateRelationId = (record) =>
    // Lấy ID parent từ record theo DASHBOARD_CONFIG.getParentIdFromRecord
    DASHBOARD_CONFIG.getParentIdFromRecord(record);
  // ctx.currentUser/ctx.user/ctx.state.currentUser are not real ctx properties
  // (auth:check is the only reliable source in this runtime). loadData() keeps
  // this cache in sync with the auth:check-resolved user so getCurrentUserId()
  // works from synchronous event handlers (upload, delete, rename, ...).
  let currentUserCache = null;
  const getCurrentUserId = () => extractId(currentUserCache?.id) || null;

  const getCurrentUser = () => {
    try {
      return (
        ctx.currentUser ||
        ctx.app?.currentUser ||
        ctx.store?.getState()?.currentUser ||
        null
      );
    } catch {
      return null;
    }
  };
  const getUserDisplayName = (user) =>
    user?.nickname ||
    user?.username ||
    user?.name ||
    user?.email ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "";
  const getShareRowUser = (row) =>
    (row?.users && typeof row.users === "object" ? row.users : null) ||
    (row?.user && typeof row.user === "object" ? row.user : null) ||
    (row?.userId && typeof row.userId === "object" ? row.userId : null);
  const getShareRowUserId = (row) =>
    extractId(row?.userId) ||
    extractRelationId(row?.users) ||
    extractRelationId(row?.user);
  const getShareRowDocumentId = (row) =>
    extractId(row?.documentId) ||
    extractRelationId(row?.documents) ||
    extractRelationId(row?.document);
  const getRecordShareRows = (record) => {
    const rows =
      record?._shareRows ||
      record?.documentShares ||
      record?.documentShare ||
      record?.shares ||
      [];
    return Array.isArray(rows) ? rows : [rows].filter(Boolean);
  };
  const getDocumentSharedUserIds = (record) => {
    const ids = [];
    getRecordShareRows(record).forEach((row) => {
      const userId = getShareRowUserId(row);
      if (userId) ids.push(userId);
    });
    return Array.from(new Set(ids.filter(Boolean).map((id) => String(id))));
  };
  const isRecordSharedWithUser = (record, user) => {
    const userId = extractId(user?.id) || getCurrentUserId();
    return !!userId && getDocumentSharedUserIds(record).includes(String(userId));
  };
  const getUploadUserName = (record) =>
    getUserDisplayName(record?.uploadedBy) ||
    getUserDisplayName(record?.createdBy) ||
    (extractId(record?.uploadedById)
      ? `User #${extractId(record.uploadedById)}`
      : "") ||
    (extractId(record?.createdById)
      ? `User #${extractId(record.createdById)}`
      : "—");

  const getDeletedUserName = (record) =>
    getUserDisplayName(record?.updatedBy) ||
    getUserDisplayName(record?.deletedBy) ||
    (extractId(record?.updatedById)
      ? `User #${extractId(record.updatedById)}`
      : "") ||
    (extractId(record?.deletedById)
      ? `User #${extractId(record.deletedById)}`
      : "—");

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes) || bytes === 0) return "--";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isAdminUser = (user) => {
    if (!user) return false;
    const roles = user.roles || [];
    return roles.some((r) => {
      const rName = typeof r === "string" ? r : r.name;
      return ["admin", "root"].includes(rName?.toLowerCase());
    });
  };

  const asArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  const getFolderManagerRows = (folder) =>
    asArray(folder?.folderManager || folder?.folderManagers);

  const getFolderMemberRows = (folder) =>
    asArray(folder?.folderMember || folder?.folderMembers);

  const getRelationLawyerRecord = (row) => {
    if (!row || typeof row !== "object") return {};
    if (row.lawyer && typeof row.lawyer === "object") return row.lawyer;
    if (row.lawyerId && typeof row.lawyerId === "object") return row.lawyerId;
    return row;
  };

  const getPermissionLawyerId = (row) =>
    extractId(row?.lawyerId) ||
    extractId(row?.lawyer) ||
    extractId(row?.id) ||
    extractId(row);

  const getPermissionRole = (row, fallback = "viewer") =>
    row?.folderMembers?.role ||
    row?.folderMember?.role ||
    row?.through?.role ||
    row?.role ||
    fallback;

  const PERMISSION_ROLE_LABELS = {
    viewer: "Viewer",
    editor: "Editor",
    manager: "Manager",
  };

  const getPermissionRoleLabel = (role) =>
    PERMISSION_ROLE_LABELS[role] || role || PERMISSION_ROLE_LABELS.viewer;

  const ROLE_LABEL = {
    admin: "Administrator",
    owner: "Owner",
    manager: "Manager",
    editor: "Editor",
    viewer: "View Only",
    shared: "Shared",
  };

  const roleToPerms = (role) => ({
    role,
    canView: role !== null,
    canCreate: ["admin", "owner", "manager", "editor"].includes(role),
    canRename: ["admin", "owner", "manager", "editor"].includes(role),
    canMove: ["admin", "owner", "manager"].includes(role),
    canDelete: ["admin", "owner", "manager"].includes(role),
    canShare: ["admin", "owner", "manager"].includes(role),
    canManagePermissions: ["admin", "owner", "manager"].includes(role),
    isManager: ["admin", "owner", "manager"].includes(role),
    isMember: role !== null,
    canEdit: ["admin", "owner", "manager", "editor"].includes(role),
  });

  const getLawyerDisplayName = (record, fallback = "Lawyer") => {
    const lawyer = getRelationLawyerRecord(record);
    return (
      lawyer.lawyerName ||
      lawyer.nickname ||
      lawyer.username ||
      lawyer.fullName ||
      lawyer.name ||
      lawyer.email ||
      record?.lawyerName ||
      record?.nickname ||
      record?.username ||
      record?.email ||
      `${fallback} ${getPermissionLawyerId(record) || record?.id || ""}`.trim()
    );
  };

  const getFolderPermissions = (folder, user, allFolders, currentLawyerId) => {
    if (isAdminUser(user)) return roleToPerms("admin");
    if (!folder) return roleToPerms("admin");
    if (!user) return roleToPerms(null);

    const uid = extractId(user.id);
    const lwId = extractId(currentLawyerId);

    // Owner check (Nocobase user ID) — use String comparison to avoid number/string type mismatch
    if (uid && String(extractId(folder.createdById)) === String(uid))
      return roleToPerms("owner");

    const managers = getFolderManagerRows(folder);
    const members = getFolderMemberRows(folder);

    // Check explicit permissions using Lawyer ID
    if (lwId) {
      const isExplicitManager = managers.some(
        (m) => String(getPermissionLawyerId(m)) === String(lwId),
      );
      if (isExplicitManager) return roleToPerms("manager");

      const explicitMember = members.find(
        (m) => String(getPermissionLawyerId(m)) === String(lwId),
      );
      if (explicitMember) {
        const r = getPermissionRole(explicitMember, "viewer");
        if (r === "manager") return roleToPerms("manager");
        if (r === "editor") return roleToPerms("editor");
        return roleToPerms("viewer");
      }
    }

    // Inherit from parent
    const pId = extractId(folder.parentId);
    if (!pId || pId === "root") return roleToPerms(null);

    const parentFolder = allFolders.find(
      (f) => String(extractId(f.id)) === String(pId),
    );
    if (!parentFolder) return roleToPerms(null);

    return getFolderPermissions(parentFolder, user, allFolders, currentLawyerId);
  };

  const canManageFile = (file, folder, user, allFolders, currentLawyerId) => {
    if (!user) return false;
    const { isManager, canEdit } = getFolderPermissions(
      folder,
      user,
      allFolders,
      currentLawyerId,
    );
    if (isManager || canEdit) return true;
    if (extractId(file.createdById) === extractId(user.id)) return true;
    return false;
  };

  const getFilePermissions = (
    file,
    folder,
    user,
    allFolders,
    currentLawyerId,
  ) => {
    const fp = folder
      ? getFolderPermissions(folder, user, allFolders, currentLawyerId)
      : roleToPerms(null);
    if (fp.role === null && isRecordSharedWithUser(file, user)) {
      return { ...roleToPerms(null), role: "shared", canView: true };
    }
    return { ...fp, canView: fp.canView || isRecordSharedWithUser(file, user) };
  };

  const getVisibleFolderIds = (allFolders, currentUser, currentLawyerId) => {
    const directAccess = new Set();
    const uid = extractId(currentUser?.id);
    const lwId = extractId(currentLawyerId);

    if (isAdminUser(currentUser)) {
      allFolders.forEach((f) => directAccess.add(extractId(f.id)));
      return { accessible: directAccess, entitled: new Set(directAccess) };
    }

    if (!uid) return { accessible: new Set(), entitled: new Set() };

    // 1. Find folders with a direct, explicit grant (creator, or explicit
    // manager/member row on that exact folder).
    allFolders.forEach((f) => {
      const fId = extractId(f.id);
      // Owner check — use String comparison to avoid number/string type mismatch
      if (String(extractId(f.createdById)) === String(uid)) {
        directAccess.add(fId);
        return;
      }
      // Manager/Member check via currentLawyerId — use String comparison to avoid number/string type mismatch
      if (lwId) {
        const managers = getFolderManagerRows(f);
        const members = getFolderMemberRows(f);
        if (
          managers.some((m) => String(getPermissionLawyerId(m)) === String(lwId)) ||
          members.some((m) => String(getPermissionLawyerId(m)) === String(lwId))
        ) {
          directAccess.add(fId);
          return;
        }
      }
    });

    const folderById = new Map(allFolders.map((f) => [String(extractId(f.id)), f]));
    const rootIdCache = new Map();
    // 2. Root-gated visibility: a folder is only visible when the user ALSO
    // has a direct grant on the root of its tree — a direct grant on one
    // folder no longer cascades blindly down to every descendant regardless
    // of the descendant's own grant, and losing root-level access now
    // revokes every folder in that tree, even ones with their own
    // still-present explicit grant. "Root" here is the CASE root (the
    // folder with its own projectId whose parent doesn't have one — the
    // same boundary isCaseRootFolder uses), not the Customer root sitting
    // above it: the Customer root has no projectId, is never itself
    // individually granted to a user in practice, and would silently gate
    // out an entire case if treated as "the root" here. Folders with no
    // projectId at all (company_shared, legal_reference, personal,
    // knowledge — spaces with no Customer/Case two-tier structure) fall
    // back to the plain topmost-ancestor walk.
    const resolveRootId = (folder) => {
      const key = String(extractId(folder.id));
      if (rootIdCache.has(key)) return rootIdCache.get(key);

      const ownProjectId = getFolderCaseProjectId(folder);
      let current = folder;
      const visited = new Set();
      if (ownProjectId) {
        while (true) {
          const parentId = extractId(current.parentId);
          if (!parentId || parentId === "root") break;
          const parentKey = String(parentId);
          if (visited.has(parentKey)) break;
          visited.add(parentKey);
          const parent = folderById.get(parentKey);
          if (!parent) break;
          if (!getFolderCaseProjectId(parent)) break;
          current = parent;
        }
      } else {
        while (true) {
          const parentId = extractId(current.parentId);
          if (!parentId || parentId === "root") break;
          const parentKey = String(parentId);
          if (visited.has(parentKey)) break;
          visited.add(parentKey);
          const parent = folderById.get(parentKey);
          if (!parent) break;
          current = parent;
        }
      }
      const rootId = extractId(current.id);
      rootIdCache.set(key, rootId);
      return rootId;
    };

    const gated = new Set();
    allFolders.forEach((f) => {
      const fId = extractId(f.id);
      if (!directAccess.has(fId)) return;
      const rootId = resolveRootId(f);
      if (directAccess.has(rootId)) gated.add(fId);
    });

    // Snapshot taken BEFORE the ancestor cascade below: `entitled` = folders
    // the user is genuinely granted on (own explicit grant AND root access).
    // Document/file visibility must be gated by this narrow set, not by the
    // widened `accessible` set below — an ancestor-only folder is shown
    // purely so the user can click through it, and must not expose the files
    // sitting directly inside it.
    const entitled = new Set(gated);

    // 3. Cascade up: ensure the whole ancestor chain of any gated folder is
    // included too — otherwise a user granted on a deep folder (e.g. one
    // Legal Study child, several levels below the case root) would never
    // see the intermediate folders above it and couldn't navigate down to
    // it. This only widens the visibility set; getFolderPermissions() is
    // untouched, so these ancestor-only folders still resolve to no
    // edit/rename/manage rights unless the user has an explicit or
    // inherited role there too.
    // NOTE: what gets added to `accessible` must be the parent folder's own
    // extractId(parent.id) — the exact same representation used elsewhere
    // in this function (typically a raw number) — never String(parentId).
    // Set.has() is strict equality, so mixing 12 and "12" would make every
    // downstream accessible.has(<numeric id>) lookup miss, turning this
    // whole block into a no-op. String() is used only for folderById's Map
    // keys.
    const accessible = new Set(gated);
    Array.from(gated).forEach((id) => {
      let current = folderById.get(String(id));
      while (current) {
        const parentId = extractId(current.parentId);
        if (!parentId || parentId === "root") break;
        const parent = folderById.get(String(parentId));
        if (!parent) break;
        const parentRawId = extractId(parent.id);
        if (accessible.has(parentRawId)) break;
        accessible.add(parentRawId);
        current = parent;
      }
    });

    return { accessible, entitled };
  };

  const LOCK_ICON = (
    <IconSvg size={16}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </IconSvg>
  );

  const USER_ICON = (
    <IconSvg size={16}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </IconSvg>
  );

  const getFullUrl = (url) =>
    !url
      ? null
      : String(url).startsWith("http")
        ? url
        : `${window.location.origin}${url}`;
  const getRecordFileUrl = (record) => {
    const attachment = getAttachment(record);
    return getFullUrl(
      attachment?.url || attachment?.preview || record?.googleDriveUrl,
    );
  };
  const getFileExtension = (record) => {
    const attachment = getAttachment(record);
    let ext = attachment?.extname || "";
    const rawName =
      attachment?.title || attachment?.filename || getDocTitle(record) || "";
    if (!ext && rawName.includes(".")) ext = rawName.split(".").pop();
    if (!ext) return "";
    return String(ext).startsWith(".")
      ? String(ext).toLowerCase()
      : `.${String(ext).toLowerCase()}`;
  };
  const OFFICE_FILE_EXTENSIONS = new Set([
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".odt",
  ]);
  const isOfficeFileExtension = (extension) =>
    OFFICE_FILE_EXTENSIONS.has(String(extension || "").toLowerCase());
  const getDownloadFileName = (record) => {
    const extension = getFileExtension(record);
    // Tên tài liệu (doc.title) là nguồn chân lý cho tên file hiển thị/tải
    // về — khớp với getDocTitle() dùng ở mọi nơi khác trong UI, để khi đổi
    // tên tài liệu thì tên file tải về/preview cũng đổi theo, không bị kẹt
    // lại theo tên file gốc lúc upload.
    const rawName = getDocTitle(record) || "download";
    const fileName = String(rawName).trim() || "download";
    const completeName =
      extension && !fileName.toLowerCase().endsWith(extension)
        ? `${fileName}${extension}`
        : fileName;
    return completeName.replace(/[\\/:*?"<>|]/g, "_");
  };
  const getUploadRelativePath = (file) =>
    String(file?._dropRelativePath || file?.webkitRelativePath || file?.name || "")
      .replace(/^\/+/, "")
      .replace(/\\/g, "/");
  const hasExternalFiles = (dataTransfer) =>
    Array.from(dataTransfer?.types || []).includes("Files");
  const setDroppedFilePath = (file, relativePath) => {
    if (!file) return file;
    try {
      Object.defineProperty(file, "_dropRelativePath", {
        value: String(relativePath || file.name).replace(/^\/+/, ""),
        configurable: true,
      });
    } catch {
      try {
        file._dropRelativePath = String(relativePath || file.name).replace(
          /^\/+/,
          "",
        );
      } catch {}
    }
    return file;
  };
  const readDirectoryEntries = async (directoryEntry) => {
    const reader = directoryEntry.createReader();
    const entries = [];
    while (true) {
      const batch = await new Promise((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (!batch.length) break;
      entries.push(...batch);
    }
    return entries;
  };
  const readDroppedEntry = async (
    entry,
    parentPath,
    files,
    folderPaths,
  ) => {
    const relativePath = parentPath
      ? `${parentPath}/${entry.name}`
      : entry.name;
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) =>
        entry.file(resolve, reject),
      );
      files.push(setDroppedFilePath(file, relativePath));
      return;
    }
    if (!entry.isDirectory) return;

    folderPaths.add(relativePath);
    const children = await readDirectoryEntries(entry);
    for (const child of children) {
      await readDroppedEntry(child, relativePath, files, folderPaths);
    }
  };
  const readDroppedFiles = async (dataTransfer) => {
    const files = [];
    const folderPaths = new Set();
    const items = Array.from(dataTransfer?.items || []);
    const entries = items
      .map((item) => {
        const getEntry = item.getAsEntry || item.webkitGetAsEntry;
        return typeof getEntry === "function" ? getEntry.call(item) : null;
      })
      .filter(Boolean);

    if (entries.length) {
      for (const entry of entries) {
        await readDroppedEntry(entry, "", files, folderPaths);
      }
    } else {
      Array.from(dataTransfer?.files || []).forEach((file) => {
        const relativePath = getUploadRelativePath(file);
        files.push(setDroppedFilePath(file, relativePath));
        const parts = relativePath.split("/");
        parts.pop();
        let currentPath = "";
        parts.forEach((part) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          if (currentPath) folderPaths.add(currentPath);
        });
      });
    }

    return {
      files,
      folderPaths: Array.from(folderPaths),
      hasDirectories: folderPaths.size > 0,
    };
  };
  const downloadRecordFile = async (record, url = null, fileName = null) => {
    const fullUrl = getFullUrl(url || getRecordFileUrl(record));
    if (!fullUrl) return false;
    window.open(fullUrl, "_blank");
    return true;
  };
  const getPreviewUrl = (record) => {
    const fullUrl = getRecordFileUrl(record);
    if (!fullUrl) return null;
    const ext = getFileExtension(record);
    const isOffice = isOfficeFileExtension(ext);
    const attachment = getAttachment(record);
    const isExternalPreview = !!record.googleDriveUrl && !attachment;

    if (isOffice && !isExternalPreview) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
    }
    return fullUrl;
  };
  const stripInternalTemplateRelationPayload = (payload = {}) => {
    // Xóa tất cả các field relation khỏi payload (dựa trên DASHBOARD_CONFIG)
    const stripped = { ...payload };
    DASHBOARD_CONFIG.relationFieldCandidates.forEach((field) => {
      delete stripped[field];
    });
    return stripped;
  };
  const buildInternalTemplateRelationPayload = (templateRecordOrId) => {
    const templateId = extractId(templateRecordOrId);
    const primaryField = DASHBOARD_CONFIG.relationFieldCandidates[0];
    return templateId ? { [primaryField]: templateId } : {};
  };
  const buildInternalTemplateRelationVariants = (templateId) => {
    const id = extractId(templateId);
    if (!id) return [{}];
    const [primary, primaryId, singular, singularId] =
      DASHBOARD_CONFIG.relationFieldCandidates;
    const variants = [{ [primary]: id }, { [primary]: [{ id }] }];
    if (primaryId) variants.push({ [primaryId]: id });
    if (singular) variants.push({ [singular]: id });
    if (singularId) variants.push({ [singularId]: id });
    return variants;
  };

  const isInternalTemplateScope = (record) => {
    const scope = normalizeKey(record?.moduleScope);
    return !scope || INTERNAL_TEMPLATE_MODULE_SCOPES.includes(scope);
  };

  const matchesInternalCompany = (record, internalCompanyId) => {
    const companyId = extractId(internalCompanyId);
    if (!companyId) return true;
    return (
      String(extractId(record?.internalCompanyId) || "") === String(companyId) ||
      String(extractId(record?.internalCompany) || "") === String(companyId)
    );
  };

  const decorateDocumentTypeOption = (option) => {
    const id = String(option?.value ?? option?.id ?? "").trim();
    const key = normalizeKey(id);
    const decor = TYPE_DECOR[key] || TYPE_DECOR.default;
    return {
      id,
      value: id,
      label: String(option?.label || option?.title || id || "Document"),
      color: option?.color || decor.color,
      background: option?.background || decor.background,
      svgIcon: TYPE_ICONS[key] || TYPE_ICONS.default,
    };
  };

  const buildDocumentTypeOptions = (internalTemplateRecords = []) => {
    const uniqueTypes = new Map();
    internalTemplateRecords.forEach((record) => {
      const typeValue = String(record?.documentType || "").trim();
      if (!typeValue) return;
      const label = record?.title || record?.name || typeValue;
      if (!uniqueTypes.has(typeValue)) {
        uniqueTypes.set(typeValue, {
          value: typeValue,
          label: label,
        });
      }
    });
    return Array.from(uniqueTypes.values()).map((option) =>
      decorateDocumentTypeOption(option),
    );
  };

  const FALLBACK_DOCUMENT_TYPES = [];

  const buildScopePayload = (internalCompanyId) => ({
    moduleScope: INTERNAL_TEMPLATE_MODULE_SCOPE,
    ...(internalCompanyId
      ? { internalCompanyId: extractId(internalCompanyId) }
      : {}),
  });

  const getFolderParentId = (folder) => extractId(folder?.parentId);
  const getProjectCustomerId = (project) =>
    extractId(project?.customerId) ||
    extractRelationId(project?.customer) ||
    extractRelationId(project?.customers);
  const getFolderCaseProjectId = (folder) =>
    extractId(folder?.projectId) ||
    extractRelationId(folder?.project) ||
    extractRelationId(folder?.projects) ||
    extractId(folder?.sourceProjectId) ||
    extractRelationId(folder?.sourceProject) ||
    extractId(folder?.caseId) ||
    extractRelationId(folder?.case) ||
    extractRelationId(folder?.cases);
  // A folder is the root of a Case when it carries its own projectId but
  // its parent doesn't — the parent is then the Customer root (or out of
  // scope), not another folder that already belongs to the same Case. Case
  // template children (Legal Study, ...) also have projectId, but their
  // parent (the case folder itself) has it too, so they're excluded.
  // Fail-closed: a `true` result here drives a write onto the production
  // Case record (projects:update of managerId/assignees), so "folder has a
  // parentId but that parent isn't in the list we were given" must NOT be
  // treated as root — it means the caller passed an out-of-scope folder list
  // and we simply don't know. Only a folder with no parentId at all, or one
  // whose located parent carries no case projectId, counts as a case root.
  const isCaseRootFolder = (folder, allFolders) => {
    const ownProjectId = getFolderCaseProjectId(folder);
    if (!ownProjectId) return false;
    const parentId = getFolderParentId(folder);
    // "root" is this file's no-parent sentinel (cf. normalizeParentId), so it
    // counts as "no parentId at all", not as an unresolvable parent.
    if (!parentId || parentId === "root") return true;
    const parent = allFolders.find(
      (f) => String(extractId(f)) === String(parentId),
    );
    if (!parent) return false;
    return !getFolderCaseProjectId(parent);
  };
  const normalizeParentId = (parentId) =>
    parentId === "root" || !parentId ? null : extractId(parentId);
  // Trả về tập id gồm rootId + toàn bộ folder con cháu của nó, dựa trên một
  // danh sách folder bất kỳ (không phụ thuộc case đang active) — dùng để
  // tính dung lượng/độ sâu của 1 folder Legal Study trong gallery flat.
  const getFolderSubtreeIds = (rootId, allFolders = []) => {
    const ids = new Set([String(rootId)]);
    let added = true;
    while (added) {
      added = false;
      allFolders.forEach((f) => {
        const fid = String(extractId(f));
        if (ids.has(fid)) return;
        const parentId = String(getFolderParentId(f) || "");
        if (parentId && ids.has(parentId)) {
          ids.add(fid);
          added = true;
        }
      });
    }
    return ids;
  };

  const formatDate = (value) => {
    if (!value) return "—";
    let dateVal = value;
    if (value && typeof value === "object") {
      if (typeof value.toDate === "function") {
        dateVal = value.toDate();
      } else if (typeof value.toISOString === "function") {
        dateVal = value.toISOString();
      }
    }
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("vi-VN");
  };

  const getValidDate = (record) => {
    const attachment = getAttachment(record);
    const candidates = [
      record?.uploadedAt,
      record?.uploaded_at,
      record?.createdAt,
      record?.created_at,
      record?.updatedAt,
      record?.updated_at,
      attachment?.createdAt,
      attachment?.created_at,
      attachment?.updatedAt,
      attachment?.updated_at,
    ];
    for (const val of candidates) {
      if (val) {
        let dateVal = val;
        if (typeof val === "object") {
          if (typeof val.toDate === "function") {
            dateVal = val.toDate();
          } else if (typeof val.toISOString === "function") {
            dateVal = val.toISOString();
          }
        }
        const d = new Date(dateVal);
        if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
          return d.toISOString();
        }
      }
    }
    return null;
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    let dateVal = value;
    if (value && typeof value === "object") {
      if (typeof value.toDate === "function") {
        dateVal = value.toDate();
      } else if (typeof value.toISOString === "function") {
        dateVal = value.toISOString();
      }
    }
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return "—";
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${d}/${m}/${y} ${hh}:${mm}`;
  };

  const sortByCreatedAt = (a, b) => {
    const at = new Date(a?.createdAt || 0).getTime() || 0;
    const bt = new Date(b?.createdAt || 0).getTime() || 0;
    if (at !== bt) return at - bt;
    return String(a?.name || a?.title || "").localeCompare(
      String(b?.name || b?.title || ""),
      "vi",
    );
  };

  const DELETE_TIMESTAMP_FIELDS = new Set([
    "deletedAt",
    "deleted_at",
    "deteledAt",
  ]);
  const SYSTEM_ACTIVITY_FIELDS = new Set([
    "id",
    "createdAt",
    "updatedAt",
    "createdById",
    "updatedById",
    "uploadedAt",
    "uploaded_at",
    "uploadedById",
    "fileAttachment",
    "batchId",
    "collectionName",
    "recordId",
    "fileIndex",
    "folderIndex",
    "moduleScope",
    "storageType",
    "originScope",
    "originFolderId",
    "legalStudyLinkedAt",
    "legalStudySource",
    "sourceCollectionName",
    "sourceRecordId",
    "sourceTaskId",
    "sourceSubTaskId",
    "sourceProjectId",
    "sourceFolderId",
    "sourceLegalReferenceId",
  ]);
  const FILE_AUDIT_ACTIVITY_ACTIONS = new Set([
    "uploaded",
    "previewed",
    "downloaded",
  ]);
  const isEmptyActivityValue = (value) =>
    value === null ||
    value === undefined ||
    value === "" ||
    value === "null" ||
    value === "undefined";
  const isTruthyActivityValue = (value) =>
    value === true || value === "true" || value === 1 || value === "1";
  const getActivityTime = (log) =>
    new Date(log?.changedAt || log?.createdAt || 0).getTime();
  const isSameActivityRecord = (a, b) =>
    a?.collectionName === b?.collectionName &&
    String(a?.recordId) === String(b?.recordId);
  const isSystemActivityLog = (log) =>
    !!log &&
    !FILE_AUDIT_ACTIVITY_ACTIONS.has(log.action) &&
    SYSTEM_ACTIVITY_FIELDS.has(log.fieldName);
  const isTrashDeleteActivity = (log) =>
    log?.action === "updated" &&
    ((log.fieldName === "isDeleted" && isTruthyActivityValue(log.newValue)) ||
      (DELETE_TIMESTAMP_FIELDS.has(log.fieldName) &&
        !isEmptyActivityValue(log.newValue)));
  const isTrashRestoreActivity = (log) =>
    log?.action === "updated" &&
    ((log.fieldName === "isDeleted" && !isTruthyActivityValue(log.newValue)) ||
      (DELETE_TIMESTAMP_FIELDS.has(log.fieldName) &&
        isEmptyActivityValue(log.newValue)));
  // ============================================================
  // §2 DATA FETCHING
  // ============================================================
  const fetchAllList = async (url, params = {}) => {
    let all = [];
    let page = 1;
    const pageSize = 200;
    while (true) {
      const res = await ctx.api.request({
        url,
        params: { ...params, page, pageSize },
      });
      const data = res?.data?.data || [];
      all = all.concat(data);
      const meta = res?.data?.meta || {};
      if (!meta.count || all.length >= meta.count || data.length < pageSize)
        break;
      page++;
    }
    return all;
  };

  // Các URL candidates cho parent list/create được lấy từ DASHBOARD_CONFIG
  const LEGAL_REFERENCE_RESOURCE_CANDIDATES =
    DASHBOARD_CONFIG.parentListCandidates;

  const getLegalReferenceDisplayName = (record) => {
    if (!record) return "";
    return (
      record.title ||
      record.name ||
      record.description ||
      (record.id ? `Case Study ${record.id}` : "Case Study")
    );
  };

  const getDocumentLegalReferenceId = (doc) =>
    DASHBOARD_CONFIG.getParentListId(doc);

  const getRecordLegalReferenceId = (record) =>
    DASHBOARD_CONFIG.getParentListId(record);

  const fetchLegalReferenceRecords = async (internalCompanyId = null) => {
    let lastError = null;
    for (const url of DASHBOARD_CONFIG.parentListCandidates) {
      try {
        let items;
        items = await fetchAllList(url, {
          sort: ["-createdAt"],
          appends: ["internalCompany", "cases", "createdBy"],
        });
        return items.filter((item) =>
          matchesInternalCompany(item, internalCompanyId),
        );
      } catch (e) {
        lastError = e;
      }
    }
    console.warn("Failed to fetch parent records:", lastError);
    return [];
  };

  const createLegalReferenceRecord = async (payload) => {
    let lastError = null;
    for (const url of DASHBOARD_CONFIG.parentCreateCandidates) {
      try {
        return await ctx.api.request({
          url,
          method: "POST",
          data: payload,
        });
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error("Failed to create parent record");
  };

  const fetchFoldersForInternalTemplates = async () => {
    const scopeFilter = JSON.stringify({
      moduleScope: { $in: DASHBOARD_CONFIG.moduleScopes },
    });
    const primaryField = DASHBOARD_CONFIG.relationFieldCandidates[0];
    const params = {
      sort: ["createdAt"],
      filter: scopeFilter,
      appends: [
        "createdBy",
        "updatedBy",
        primaryField,
        "folderManager",
        "folderManagers",
        "folderMember",
        "folderMembers",
      ],
    };
    try {
      return await fetchAllList("folders:list", params);
    } catch (e) {
      // Fallback without permission appends
      const fallbackParams = {
        sort: ["createdAt"],
        filter: scopeFilter,
        appends: ["createdBy", "updatedBy", primaryField],
      };
      return fetchAllList("folders:list", fallbackParams).catch(() => []);
    }
  };

  const fetchCustomerCasePermissionFolders = async () => {
    const params = {
      sort: ["createdAt"],
      appends: [
        "createdBy",
        "folderManager",
        "folderManagers",
        "folderMember",
        "folderMembers",
      ],
    };
    try {
      return await fetchAllList("folders:list", params);
    } catch (e) {
      return fetchAllList("folders:list", {
        sort: ["createdAt"],
        appends: ["createdBy"],
      }).catch(() => []);
    }
  };

  const fetchDocumentsForInternalTemplates = async () => {
    const scopeFilter = JSON.stringify({
      moduleScope: { $in: DASHBOARD_CONFIG.moduleScopes },
    });
    const primaryField = DASHBOARD_CONFIG.relationFieldCandidates[0];
    const params = {
      sort: ["fileIndex", "-createdAt"],
      filter: scopeFilter,
      appends: [
        "fileAttachment",
        "internalCompany",
        "createdBy",
        "updatedBy",
        primaryField,
      ],
    };
    try {
      return await fetchAllList("documents:list", params);
    } catch (e) {
      const { appends, ...fallbackParams } = params;
      return fetchAllList("documents:list", {
        ...fallbackParams,
        appends: ["fileAttachment", "internalCompany", "createdBy", "updatedBy"],
      }).catch(() => []);
    }
  };

  const fetchDocumentShareRows = async () => {
    const params = {
      sort: ["-createdAt"],
      appends: ["users", "documents"],
    };
    try {
      return await fetchAllList("documentShares:list", params);
    } catch (e) {
      const { appends, ...fallbackParams } = params;
      return fetchAllList("documentShares:list", fallbackParams).catch(() => []);
    }
  };

  const fetchDocumentShareRowsForFile = async (documentId) => {
    if (!documentId) return { ok: false, rows: [] };
    const baseParams = {
      filter: JSON.stringify({ documentId: { $eq: documentId } }),
    };
    try {
      const rows = await fetchAllList("documentShares:list", {
        ...baseParams,
        appends: ["users"],
      });
      return { ok: true, rows };
    } catch (e) {
      try {
        const rows = await fetchAllList("documentShares:list", baseParams);
        return { ok: true, rows };
      } catch {
        return { ok: false, rows: [] };
      }
    }
  };

  const mergeDocumentShareRows = (docs, shareRows = []) => {
    if (!shareRows.length) return docs;
    const shareMap = new Map();
    shareRows.forEach((row) => {
      const documentId = getShareRowDocumentId(row);
      if (!documentId) return;
      const key = String(documentId);
      if (!shareMap.has(key)) shareMap.set(key, []);
      shareMap.get(key).push(row);
    });
    return docs.map((doc) => ({
      ...doc,
      _shareRows: shareMap.get(String(extractId(doc))) || [],
    }));
  };

  const requestCreateWithInternalTemplateRelation = async (url, payload) => {
    const templateId = getInternalTemplateRelationId(payload);
    if (!templateId) {
      return ctx.api.request({ url, method: "POST", data: payload });
    }

    const basePayload = stripInternalTemplateRelationPayload(payload);
    let lastError = null;
    const templateVariants = buildInternalTemplateRelationVariants(templateId);
    for (let tIndex = 0; tIndex < templateVariants.length; tIndex++) {
      try {
        return await ctx.api.request({
          url,
          method: "POST",
          data: { ...basePayload, ...templateVariants[tIndex] },
        });
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  };

  const createDocumentRecord = async (payload) =>
    requestCreateWithInternalTemplateRelation("documents:create", payload);

  const uploadAttachment = async (file, fileName = null) => {
    const formData = new window.FormData();
    formData.append("file", file, fileName || file.name);
    const uploadRes = await ctx.api.request({
      url: "attachments:create",
      method: "POST",
      params: { attachmentField: "documents.fileAttachment" },
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
    const attachment = uploadRes?.data?.data;
    if (!attachment?.id) throw new Error("File upload failed");
    return attachment;
  };

  const createFolderRecord = async (payload) => {
    try {
      return await requestCreateWithInternalTemplateRelation(
        "folders:create",
        payload,
      );
    } catch (e) {
      if (!Object.prototype.hasOwnProperty.call(payload || {}, "documentType"))
        throw e;
      const { documentType, ...fallbackPayload } = payload;
      return requestCreateWithInternalTemplateRelation(
        "folders:create",
        fallbackPayload,
      );
    }
  };

  // ============================================================
  // §3 MAIN COMPONENT
  // ============================================================
  const PreviewModal = ({ doc, onClose, onDownload }) => {
    if (!doc) return null;
    const attachment = getAttachment(doc);
    const fileUrl = attachment
      ? attachment.url || attachment.preview
      : doc.googleDriveUrl || "";

    let fileExt = "";
    if (attachment) {
      fileExt = attachment.extname
        ? attachment.extname.startsWith(".")
          ? attachment.extname.toLowerCase()
          : "." + attachment.extname.toLowerCase()
        : "";
    }

    // Tên tài liệu (doc.title) là nguồn chân lý cho tên hiển thị ở preview —
    // khớp với getDocTitle() dùng ở bảng/card, để khi đổi tên tài liệu thì
    // tên hiển thị ở preview cũng đổi theo ngay, không bị kẹt theo tên file
    // gốc lúc upload.
    const rawName = getDocTitle(doc) || "File";
    if (!fileExt && rawName.includes(".")) {
      fileExt = "." + rawName.split(".").pop().toLowerCase();
    }

    const originalName = rawName.toLowerCase().endsWith(fileExt)
      ? rawName.slice(0, rawName.length - fileExt.length)
      : rawName;
    const finalFileName = originalName + fileExt;
    const fullUrl = getFullUrl(fileUrl);

    const isPdf = fileExt === ".pdf";
    const isHtml = fileExt === ".html" || fileExt === ".htm";
    const isImage = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".webp",
      ".svg",
      ".bmp",
      ".ico",
    ].includes(fileExt);
    const isVideo = [".mp4", ".webm", ".ogg", ".mov", ".mkv"].includes(fileExt);
    const isAudio = [".mp3", ".wav", ".ogg", ".aac", ".flac", ".m4a"].includes(
      fileExt,
    );
    const isText = [
      ".txt",
      ".csv",
      ".json",
      ".xml",
      ".md",
      ".log",
      ".yaml",
      ".yml",
      ".ini",
      ".env",
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".css",
      ".html",
      ".htm",
      ".py",
      ".java",
      ".c",
      ".cpp",
      ".h",
      ".sh",
      ".sql",
    ].includes(fileExt);
    const isOffice = isOfficeFileExtension(fileExt);
    const isExternalPreview = !!doc.googleDriveUrl && !attachment;

    const officeViewerUrl =
      isOffice && fullUrl && !isExternalPreview
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
        : null;

    // Text file fetch state
    const [textContent, setTextContent] = React.useState(null);
    const [textLoading, setTextLoading] = React.useState(false);
    const [textError, setTextError] = React.useState(false);

    React.useEffect(() => {
      if (!isText || !fullUrl) return;
      setTextLoading(true);
      setTextContent(null);
      setTextError(false);

      const doFetch = async () => {
        if (typeof window !== "undefined" && typeof window.fetch === "function") {
          const res = await window.fetch(fullUrl);
          if (!res.ok) throw new Error("fetch failed");
          return await res.text();
        } else {
          const res = await ctx.api.request({
            url: fullUrl,
            method: "GET",
            transformResponse: [(data) => data],
          });
          return res?.data || "";
        }
      };

      doFetch()
        .then((text) => {
          setTextContent(text);
          setTextLoading(false);
        })
        .catch(() => {
          setTextError(true);
          setTextLoading(false);
        });
    }, [fullUrl, isText]);

    // Syntax highlight color helper (very lightweight, no lib needed)
    const getMonoBackground = () => "#1e1e1e";

    const modalWidth =
      isPdf || isHtml || isOffice || isExternalPreview || isVideo || isText
        ? "85%"
        : 760;

    return (
      <Modal
        title={
          <div
            style={{
              fontFamily: FONT,
              paddingRight: 28,
              wordBreak: "break-word",
            }}
          >
            {finalFileName}
          </div>
        }
        open={!!doc}
        onCancel={onClose}
        destroyOnClose
        centered
        width={modalWidth}
        bodyStyle={{
          padding: 0,
          height: "78vh",
          background: "#f5f5f5",
          position: "relative",
          overflow: "hidden",
        }}
        footer={[
          fullUrl && (
            <Button
              key="download"
              type="primary"
              icon={DOWNLOAD_ICON}
              onClick={() =>
                onDownload
                  ? onDownload(doc, fullUrl)
                  : downloadRecordFile(doc, fullUrl, finalFileName)
              }
            >
              Download
            </Button>
          ),
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
        ].filter(Boolean)}
      >
        {/* Spinner nền */}
        {!isText && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 0,
            }}
          >
            <Spin tip="Loading preview..." />
          </div>
        )}

        {/* ── PDF / HTML / Google Drive ── */}
        {(isPdf || isHtml || isExternalPreview) && fullUrl && (
          <iframe
            src={fullUrl}
            title={finalFileName}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              position: "relative",
              zIndex: 1,
              background: "#fff",
            }}
          />
        )}

        {/* ── IMAGE ── */}
        {isImage && fullUrl && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <img
              src={fullUrl}
              alt={finalFileName}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                padding: 24,
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>
        )}

        {/* ── OFFICE ── */}
        {isOffice && officeViewerUrl && (
          <iframe
            src={officeViewerUrl}
            title={finalFileName}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              position: "relative",
              zIndex: 1,
              background: "#fff",
            }}
          />
        )}

        {/* ── VIDEO ── */}
        {isVideo && fullUrl && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#000",
              position: "relative",
              zIndex: 1,
            }}
          >
            <video
              controls
              autoPlay={false}
              preload="none"
              style={{ maxWidth: "100%", maxHeight: "100%", outline: "none" }}
              src={fullUrl}
            >
              <source
                src={fullUrl}
                type={
                  fileExt === ".mp4"
                    ? "video/mp4"
                    : fileExt === ".webm"
                      ? "video/webm"
                      : fileExt === ".ogg"
                        ? "video/ogg"
                        : fileExt === ".mov"
                          ? "video/quicktime"
                          : "video/mp4"
                }
              />
              Your browser does not support video playback.
            </video>
          </div>
        )}

        {/* ── AUDIO ── */}
        {isAudio && fullUrl && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff",
              position: "relative",
              zIndex: 1,
              gap: 24,
            }}
          >
            <div style={{ fontSize: 64 }}>🎵</div>
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 16,
                color: "#111827",
                maxWidth: 400,
                textAlign: "center",
                wordBreak: "break-word",
              }}
            >
              {finalFileName}
            </div>
            <audio
              controls
              autoPlay={false}
              preload="none"
              style={{ width: "min(480px, 90%)", outline: "none" }}
              src={fullUrl}
            >
              <source
                src={fullUrl}
                type={
                  fileExt === ".mp3"
                    ? "audio/mpeg"
                    : fileExt === ".wav"
                      ? "audio/wav"
                      : fileExt === ".ogg"
                        ? "audio/ogg"
                        : fileExt === ".aac"
                          ? "audio/aac"
                          : fileExt === ".flac"
                            ? "audio/flac"
                            : fileExt === ".m4a"
                              ? "audio/mp4"
                              : "audio/mpeg"
                }
              />
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* ── TEXT / CODE ── */}
        {isText && (
          <div
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px",
                background: "#2d2d2d",
                borderBottom: "1px solid #444",
                flexShrink: 0,
              }}
            >
              <span
                style={{ fontFamily: "monospace", fontSize: 12, color: "#ccc" }}
              >
                {fileExt.replace(".", "").toUpperCase()} · {finalFileName}
              </span>
              <span
                style={{ fontFamily: "monospace", fontSize: 11, color: "#888" }}
              >
                {textContent != null
                  ? `${textContent.split("\n").length} lines · ${textContent.length} characters`
                  : ""}
              </span>
            </div>
            {/* Content */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                background: getMonoBackground(),
              }}
            >
              {textLoading && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "#ccc",
                  }}
                >
                  <Spin tip="Loading content..." />
                </div>
              )}
              {textError && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    gap: 16,
                  }}
                >
                  <Empty
                    description={
                      <span style={{ color: "#aaa" }}>
                        Unable to load file content
                      </span>
                    }
                  />
                  <Button
                    icon={DOWNLOAD_ICON}
                      onClick={() =>
                        onDownload
                          ? onDownload(doc, fullUrl)
                          : downloadRecordFile(doc, fullUrl, finalFileName)
                      }
                    style={{
                      borderColor: "#555",
                      color: "#ccc",
                      background: "transparent",
                    }}
                  >
                    Download to view
                  </Button>
                </div>
              )}
              {textContent != null && !textLoading && (
                <pre
                  style={{
                    margin: 0,
                    padding: "16px 20px",
                    fontFamily:
                      "'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#d4d4d4",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    counterReset: "line",
                  }}
                >
                  {textContent.split("\n").map((line, i) => (
                    <div key={i} style={{ display: "flex", gap: 0 }}>
                      <span
                        style={{
                          userSelect: "none",
                          minWidth: 42,
                          paddingRight: 16,
                          textAlign: "right",
                          color: "#555",
                          fontSize: 12,
                          lineHeight: 1.7,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ flex: 1 }}>{line || " "}</span>
                    </div>
                  ))}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* ── NO URL ── */}
        {!fullUrl && (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff",
              position: "relative",
              zIndex: 1,
            }}
          >
            <Empty description="This document has no file or URL to preview" />
          </div>
        )}

        {/* ── UNSUPPORTED FORMAT ── */}
        {fullUrl &&
          !isPdf &&
          !isHtml &&
          !isImage &&
          !isOffice &&
          !isExternalPreview &&
          !isVideo &&
          !isAudio &&
          !isText && (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "#fff",
                position: "relative",
                zIndex: 1,
                gap: 12,
              }}
            >
              <div style={{ fontSize: 48 }}>📎</div>
              <div
                style={{
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#374151",
                }}
              >
                Cannot preview format{" "}
                <code
                  style={{
                    background: "#f3f4f6",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {fileExt || "this"}
                </code>
              </div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                Download to open with a suitable application
              </div>
              <Button
                type="primary"
                icon={DOWNLOAD_ICON}
                style={{ marginTop: 8 }}
                onClick={() =>
                  onDownload
                    ? onDownload(doc, fullUrl)
                    : downloadRecordFile(doc, fullUrl, finalFileName)
                }
              >
                Download to view
              </Button>
            </div>
          )}
      </Modal>
    );
  };

  // ============================================================
  // Folder Permissions Modal
  // ============================================================
  const FolderPermissionsModal = ({ open, folder, allFolders, onClose, onSuccess }) => {
    const [saving, setSaving] = useState(false);
    const [availableLawyers, setAvailableLawyers] = useState([]);
    const [shares, setShares] = useState([]);
    const [pendingLawyerIds, setPendingLawyerIds] = useState([]);

    useEffect(() => {
      if (!open) {
        setShares([]);
        setPendingLawyerIds([]);
        return;
      }
      if (!folder) return;

      const folderId = extractId(folder.id || folder);
      Promise.all([
        ctx.api
          .request({ url: "lawyers:list", params: { pageSize: 1000 } })
          .catch(() => ({ data: { data: [] } })),
        ctx.api
          .request({
            url: `folders/${folderId}/folderManager:list`,
            params: { pageSize: 1000 },
          })
          .catch(() => ({ data: { data: [] } })),
        ctx.api
          .request({
            url: "folderMembers:list",
            params: {
              pageSize: 1000,
              filter: JSON.stringify({ folderId: { $eq: folderId } }),
            },
          })
          .catch(() => ({ data: { data: [] } })),
      ]).then(([lwRes, mgRes, mbRes]) => {
        setAvailableLawyers(lwRes?.data?.data || []);
        const initialShares = [];
        const managerRows = mgRes?.data?.data || [];
        const memberRows = mbRes?.data?.data || [];
        managerRows.forEach((row) => {
          const lawyerId = getPermissionLawyerId(row);
          if (!lawyerId) return;
          initialShares.push({
            id: String(lawyerId),
            role: "manager",
            lawyerData: getRelationLawyerRecord(row),
          });
        });
        memberRows.forEach((row) => {
          const lawyerId = getPermissionLawyerId(row);
          if (!lawyerId) return;
          initialShares.push({
            id: String(lawyerId),
            role: getPermissionRole(row),
            lawyerData: getRelationLawyerRecord(row),
          });
        });
        setShares(initialShares);
        setPendingLawyerIds([]);
      });
    }, [open, folder]);

    const buildAccessSummary = (shareList = shares) => {
      if (!shareList.length) return "No one has been granted access";
      return shareList
        .map((s) => {
          const lw =
            availableLawyers.find(
              (l) => String(extractId(l.id)) === String(s.id),
            ) ||
            s.lawyerData ||
            s;
          const displayName = getLawyerDisplayName(
            lw.id ? lw : s.lawyerData || s,
            "User",
          );
          return `${displayName} - ${getPermissionRoleLabel(s.role)}`;
        })
        .join("; ");
    };

    const handleSave = async () => {
      const managers = shares.filter((s) => s.role === "manager");
      const members = shares.filter((s) => s.role !== "manager");
      const isRootFolder = isCaseRootFolder(folder, allFolders || []);

      if (isRootFolder && managers.length > 1) {
        message.error(
          "Case chỉ được phép có 1 Manager — vui lòng chỉ giữ lại 1 người.",
        );
        return;
      }

      setSaving(true);
      try {
        const folderId = extractId(folder.id);

        await Promise.all([
          ctx.api
            .request({
              url: "folderManagers:destroy",
              method: "POST",
              params: { filter: JSON.stringify({ folderId: { $eq: folderId } }) },
            })
            .catch(() => {}),
          ctx.api
            .request({
              url: "folderMembers:destroy",
              method: "POST",
              params: { filter: JSON.stringify({ folderId: { $eq: folderId } }) },
            })
            .catch(() => {}),
        ]);

        const createPromises = [];
        managers.forEach((s) => {
          createPromises.push(
            ctx.api.request({
              url: "folderManagers:create",
              method: "POST",
              data: { folderId, lawyerId: Number(s.id), role: "manager" },
            }),
          );
        });
        members.forEach((s) => {
          createPromises.push(
            ctx.api.request({
              url: "folderMembers:create",
              method: "POST",
              data: { folderId, lawyerId: Number(s.id), role: s.role },
            }),
          );
        });

        await Promise.all(createPromises);

        if (isRootFolder) {
          const projectId = getFolderCaseProjectId(folder);
          try {
            await ctx.api.request({
              url: "projects:update",
              method: "POST",
              params: { filterByTk: parseInt(projectId) },
              data: {
                managerId: managers[0] ? parseInt(managers[0].id) : null,
                assignees: members.map((m) => ({ id: parseInt(m.id) })),
              },
            });
          } catch (syncError) {
            console.warn(
              "Could not sync case manager/assignees from folder permissions:",
              syncError,
            );
            message.warning(
              "Đã lưu quyền folder, nhưng không đồng bộ được Manager/Members lên Case.",
            );
          }
        }

        message.success("Permissions updated successfully");
        onSuccess({ accessSummary: buildAccessSummary(shares), shares });
      } catch (e) {
        message.error("An error occurred while updating permissions");
      }
      setSaving(false);
    };

    const handleAddLawyers = (selectedIds = pendingLawyerIds) => {
      const ids = Array.isArray(selectedIds)
        ? selectedIds
        : [selectedIds].filter(Boolean);
      if (!ids.length) return;
      const existingIds = new Set(shares.map((s) => String(s.id)));
      const nextShares = [...shares];
      ids.forEach((lawyerId) => {
        const safeLawyerId = String(extractId(lawyerId));
        if (!safeLawyerId || existingIds.has(safeLawyerId)) return;
        existingIds.add(safeLawyerId);
        const lawyerData =
          availableLawyers.find(
            (l) => String(extractId(l.id)) === safeLawyerId,
          ) || {};
        nextShares.push({ id: safeLawyerId, role: "viewer", lawyerData });
      });
      setShares(nextShares);
      setPendingLawyerIds([]);
    };

    const handleChangeRole = (lawyerId, newRole) => {
      setShares(
        shares.map((s) =>
          String(s.id) === String(lawyerId) ? { ...s, role: newRole } : s,
        ),
      );
    };

    const handleRemoveShare = (lawyerId) => {
      setShares(shares.filter((s) => String(s.id) !== String(lawyerId)));
    };

    const lawyerOptions = availableLawyers
      .filter(
        (l) => !shares.some((s) => String(s.id) === String(extractId(l.id))),
      )
      .map((l) => ({
        value: String(extractId(l.id)),
        label: getLawyerDisplayName(l),
      }));

    return (
      <Modal
        open={open}
        onCancel={onClose}
        title={
          <span style={{ fontFamily: FONT }}>
            Folder permissions: {folder?.name || ""}
          </span>
        }
        width={520}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={onClose} style={{ fontFamily: FONT }}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={saving}
            onClick={handleSave}
            style={{ fontFamily: FONT }}
          >
            Save
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16, fontFamily: FONT }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Add members</div>
          <Select
            mode="multiple"
            showSearch
            allowClear
            style={{ width: "100%" }}
            placeholder="Search and select multiple people..."
            options={lawyerOptions}
            value={pendingLawyerIds}
            onChange={handleAddLawyers}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>
        <div style={{ fontFamily: FONT }}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>
            People with access
          </div>
          {shares.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Not shared with anyone yet"
            />
          ) : (
            shares.map((s) => {
              const lw =
                availableLawyers.find(
                  (l) => String(extractId(l.id)) === String(s.id),
                ) ||
                s.lawyerData ||
                {};
              const displayName = getLawyerDisplayName(
                lw.id ? lw : s.lawyerData || s,
              );
              const initials = displayName.charAt(0).toUpperCase();
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#1890ff",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, lineHeight: 1.2 }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                        {getPermissionRoleLabel(s.role)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Select
                      value={s.role}
                      onChange={(val) => handleChangeRole(s.id, val)}
                      bordered={false}
                      style={{ width: 150, fontFamily: FONT }}
                      options={[
                        {
                          value: "viewer",
                          label: getPermissionRoleLabel("viewer"),
                        },
                        {
                          value: "editor",
                          label: getPermissionRoleLabel("editor"),
                        },
                        {
                          value: "manager",
                          label: getPermissionRoleLabel("manager"),
                        },
                      ]}
                    />
                    <Button
                      type="text"
                      danger
                      onClick={() => handleRemoveShare(s.id)}
                      style={{ padding: "4px 8px" }}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    );
  };

  // ============================================================
  // File Share Modal
  // ============================================================
  const FileShareModal = ({ open, file, onClose, onSuccess }) => {
    const [saving, setSaving] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [shareRows, setShareRows] = useState([]);
    const [shareCollectionReady, setShareCollectionReady] = useState(true);

    useEffect(() => {
      if (!open) {
        setSelectedUserIds([]);
        setShareRows([]);
        setShareCollectionReady(true);
        return;
      }
      const fileId = extractId(file);
      setSelectedUserIds(getDocumentSharedUserIds(file));

      Promise.all([
        ctx.api
          .request({
            url: "users:list",
            params: { pageSize: 1000, sort: ["nickname", "username"] },
          })
          .catch(() => ({ data: { data: [] } })),
        fetchDocumentShareRowsForFile(fileId),
      ]).then(([usersRes, shareRes]) => {
        setAvailableUsers(usersRes?.data?.data || []);
        setShareCollectionReady(shareRes.ok);
        setShareRows(shareRes.rows || []);
        if (shareRes.ok) {
          const ids = (shareRes.rows || [])
            .map((row) => getShareRowUserId(row))
            .filter(Boolean)
            .map((id) => String(id));
          setSelectedUserIds(Array.from(new Set(ids)));
        }
      });
    }, [open, file]);

    const userOptions = availableUsers.map((user) => {
      const userId = extractId(user.id);
      const displayName = getUserDisplayName(user) || `User #${userId}`;
      return {
        value: String(userId),
        label: user.email ? `${displayName} - ${user.email}` : displayName,
        displayName,
      };
    });
    const selectedShareNames = selectedUserIds
      .map((id) => {
        const user = availableUsers.find(
          (item) => String(extractId(item.id)) === String(id),
        );
        return getUserDisplayName(user) || `User #${id}`;
      })
      .join("; ");

    const handleSave = async () => {
      const fileId = extractId(file);
      const nextIds = Array.from(
        new Set(
          (selectedUserIds || [])
            .filter(Boolean)
            .map((id) => String(extractId(id))),
        ),
      );
      if (!fileId) {
        return;
      }

      if (!shareCollectionReady) {
        message.error(
          "The documentShares collection is not ready or access is missing",
        );
        return;
      }

      setSaving(true);
      try {
        const currentUserId = getCurrentUserId();
        const shareBatchId = Number(
          `${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
        );
        const currentIds = new Set(
          shareRows
            .map((row) => getShareRowUserId(row))
            .filter(Boolean)
            .map((id) => String(id)),
        );
        const currentShareRowByUserId = new Map();
        shareRows.forEach((row) => {
          const rowUserId = getShareRowUserId(row);
          if (rowUserId) currentShareRowByUserId.set(String(rowUserId), row);
        });
        const nextIdSet = new Set(nextIds);
        const idsToAdd = nextIds.filter((id) => !currentIds.has(id));
        const idsToRemove = Array.from(currentIds).filter(
          (id) => !nextIdSet.has(id),
        );

        await Promise.all([
          ...idsToAdd.map((userId) =>
            ctx.api.request({
              url: "documentShares:create",
              method: "POST",
              data: {
                documentId: fileId,
                userId,
                batchId: shareBatchId,
                ...(currentUserId
                  ? { createdById: currentUserId, updatedById: currentUserId }
                  : {}),
              },
            }),
          ),
          ...idsToRemove.map((userId) => {
            const shareRow = currentShareRowByUserId.get(String(userId));
            const shareRowId = extractId(shareRow);
            const markActor =
              currentUserId && shareRowId
                ? ctx.api
                    .request({
                      url: `documentShares:update?filterByTk=${shareRowId}`,
                      method: "POST",
                      data: { updatedById: currentUserId, batchId: shareBatchId },
                    })
                    .catch(() => null)
                : Promise.resolve(null);
            return markActor.then(() =>
              ctx.api.request({
                url: "documentShares:destroy",
                method: "POST",
                params: {
                  filter: JSON.stringify({
                    documentId: { $eq: fileId },
                    userId: { $eq: userId },
                  }),
                },
              }),
            );
          }),
        ]);

        message.success(
          nextIds.length
            ? "Document sharing updated"
            : "Document sharing cancelled",
        );
        onSuccess?.({ sharedUserIds: nextIds });
      } catch (e) {
        console.error("Failed to share file", e);
        message.error("An error occurred while updating document sharing");
      } finally {
        setSaving(false);
      }
    };

    return (
      <Modal
        open={open}
        onCancel={onClose}
        title={
          <span style={{ fontFamily: FONT }}>
            Share document: {file ? getDocTitle(file) : ""}
          </span>
        }
        width={480}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={onClose} style={{ fontFamily: FONT }}>
            Cancel
          </Button>,
          <Button
            key="unshare"
            danger
            disabled={!shareCollectionReady || !selectedUserIds.length || saving}
            onClick={() => setSelectedUserIds([])}
            style={{ fontFamily: FONT }}
          >
            Unshare
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={saving}
            disabled={!shareCollectionReady}
            onClick={handleSave}
            style={{ fontFamily: FONT }}
          >
            Save
          </Button>,
        ]}
      >
        <div style={{ fontFamily: FONT }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>
            People who can view this document
          </div>
          <Select
            mode="multiple"
            showSearch
            allowClear
            disabled={!shareCollectionReady}
            style={{ width: "100%" }}
            placeholder="Search and select users..."
            options={userOptions}
            value={selectedUserIds}
            onChange={(ids) =>
              setSelectedUserIds((ids || []).map((id) => String(id)))
            }
            optionFilterProp="label"
          />
          {!shareCollectionReady && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#B91C1C" }}>
              Unable to access the documentShares collection. Please check permissions or sync the collection.
            </div>
          )}
          {selectedShareNames && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#6B7280" }}>
              Currently shared with: {selectedShareNames}
            </div>
          )}
        </div>
      </Modal>
    );
  };

  const DocumentUploadFieldsModal = ({ open, files = [], onClose, onSubmit }) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
      if (open) {
        form.resetFields();
        // Chỉ gán mặc định tên tài liệu = tên file (không kèm đuôi mở rộng)
        // khi upload đúng 1 file — khớp với logic applyTitleOverride trong
        // uploadFilesToTarget (chỉ override title khi upload 1 file duy nhất).
        if (files.length === 1) {
          const rawName = files[0].name;
          const dotIndex = rawName.lastIndexOf(".");
          const nameWithoutExt =
            dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
          form.setFieldsValue({ title: nameWithoutExt });
        }
        setSubmitting(false);
      }
    }, [open, files]);

    const handleOk = async () => {
      let values = {};
      try {
        values = await form.validateFields();
      } catch {
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit({
          title: values.title?.trim() || "",
          documentType: values.documentType?.trim() || "",
          documentCode: values.documentCode?.trim() || "",
          openingDate: values.openingDate || "",
          signedAt: values.signedAt || "",
          effectiveAt: values.effectiveAt || "",
          senderName: values.senderName?.trim() || "",
          recipientName: values.recipientName?.trim() || "",
          description: values.description?.trim() || "",
        });
      } finally {
        setSubmitting(false);
      }
    };

    const fileNames = files.map((f) => f.name).join(", ");
    const inpStyle = { fontFamily: FONT };
    const dateStyle = { width: "100%", fontFamily: FONT };

    return (
      <Modal
        open={open}
        onCancel={submitting ? undefined : onClose}
        maskClosable={!submitting}
        destroyOnClose
        width={640}
        title={
          <span style={{ fontFamily: FONT }}>
            📎 Document Information {files.length > 1 ? `(${files.length} files)` : ""}
          </span>
        }
        footer={[
          <Button
            key="cancel"
            onClick={onClose}
            disabled={submitting}
            style={{ fontFamily: FONT }}
          >
            Cancel
          </Button>,
          <Button
            key="ok"
            type="primary"
            loading={submitting}
            onClick={handleOk}
            style={{ fontFamily: FONT }}
          >
            Upload
          </Button>,
        ]}
      >
        <div
          style={{
            fontFamily: FONT,
            marginBottom: 12,
            fontSize: 12,
            color: "#6B7280",
          }}
        >
          Selected file(s): <b>{fileNames || "—"}</b>
          {files.length > 1 && (
            <div style={{ marginTop: 4 }}>
              The information below will be applied to all {files.length} files
              (the document name will keep each file's own name if left blank).
            </div>
          )}
        </div>
        <Form form={form} layout="vertical" style={{ fontFamily: FONT }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="documentType" label="Document Type">
                <Input
                  allowClear
                  placeholder="e.g. Contract, Meeting Minutes..."
                  style={inpStyle}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="title" label="Document Name">
                <Input
                  allowClear
                  placeholder="Leave blank to use file name"
                  style={inpStyle}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="documentCode" label="Document Code">
                <Input
                  allowClear
                  placeholder="e.g. 123/2024/CT"
                  style={inpStyle}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="openingDate" label="Opening/Issue Date">
                <Input type="date" style={dateStyle} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="signedAt" label="Signed Date">
                <Input type="date" style={dateStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="effectiveAt" label="Effective Date">
                <Input type="date" style={dateStyle} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="senderName" label="Sender">
                <Input
                  allowClear
                  placeholder="Sender name/organization"
                  style={inpStyle}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="recipientName" label="Recipient">
                <Input
                  allowClear
                  placeholder="Recipient name/organization"
                  style={inpStyle}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <Input.TextArea
              rows={3}
              allowClear
              placeholder="Summarize the main content..."
            />
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  const InternalTemplates = () => {
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [folders, setFolders] = useState([]);
    const [legalReferences, setLegalReferences] = useState([]);
    const [selectedExt, setSelectedExt] = useState(null);
    const [activeCompanyId, setActiveCompanyId] = useState(null);
    const [activeLegalReferenceId, setActiveLegalReferenceId] = useState(null);
    const [activeSpace, setActiveSpace] = useState(KNOWLEDGE_STORAGE_TYPE);
    const [projects, setProjects] = useState([]);
    const [isLinkCaseOpen, setIsLinkCaseOpen] = useState(false);
    const [linkCaseRecord, setLinkCaseRecord] = useState(null);
    const [linkCaseLoading, setLinkCaseLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
    const [bulkMoveTargetId, setBulkMoveTargetId] = useState("root");
    const [linkCaseForm] = Form.useForm();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState("root");
    const [query, setQuery] = useState("");

    const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
    const [createTemplateLoading, setCreateTemplateLoading] = useState(false);
    const [createTemplateForm] = Form.useForm();

    const filteredLegalReferences = useMemo(() => {
      return legalReferences.filter((record) =>
        matchesInternalCompany(record, activeCompanyId),
      );
    }, [legalReferences, activeCompanyId]);

    const activeLegalReference = useMemo(() => {
      if (!activeLegalReferenceId) return null;
      return (
        legalReferences.find(
          (r) => String(extractId(r)) === String(activeLegalReferenceId),
        ) || null
      );
    }, [legalReferences, activeLegalReferenceId]);

    // Keep ref in sync with state (allows reading current value in effects without adding to deps)
    useEffect(() => {
      activeLegalReferenceIdRef.current = activeLegalReferenceId;
    }, [activeLegalReferenceId]);

    const usedProjectIds = useMemo(() => {
      const ids = new Set();
      legalReferences.forEach((ref) => {
        if (ref.sourceCaseId) {
          ids.add(String(ref.sourceCaseId));
        }
        if (ref.cases) {
          ref.cases.forEach((proj) => {
            const pid = extractId(proj);
            if (pid) {
              ids.add(String(pid));
            }
          });
        }
      });
      return ids;
    }, [legalReferences]);

    const activeLinkedIds = useMemo(() => {
      const sourceRecord = linkCaseRecord || activeLegalReference;
      if (!sourceRecord) return new Set();
      return new Set(
        (sourceRecord.cases || []).map((item) => String(extractId(item))),
      );
    }, [activeLegalReference, linkCaseRecord]);

    const isLegalReferenceRoot =
      activeSpace === "legal_reference" && !activeLegalReferenceId;

    const [viewMode, setViewMode] = useState("grid");
    const [sortMode, setSortMode] = useState("manual");
    const [galleryViewMode, setGalleryViewMode] = useState("grid");
    const [galleryCompanyFilter, setGalleryCompanyFilter] = useState([]);
    const [users, setUsers] = useState([]);
    const [entityContextMenu, setEntityContextMenu] = useState({
      open: false,
      x: 0,
      y: 0,
      record: null,
      space: null,
    });
    const [selectedEntityKeys, setSelectedEntityKeys] = useState([]);

    const [isFolderOpen, setIsFolderOpen] = useState(false);
    const [moveRecord, setMoveRecord] = useState(null);
    const [moveTargetId, setMoveTargetId] = useState("root");
    const [previewDoc, setPreviewDoc] = useState(null);
    const [editingTitleId, setEditingTitleId] = useState(null);
    const [editingTitleValue, setEditingTitleValue] = useState("");
    const [pendingFolderFiles, setPendingFolderFiles] = useState([]);
    const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
    const [bulkTargetId, setBulkTargetId] = useState("root");
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkProgress, setBulkProgress] = useState("");
    const [bulkPercent, setBulkPercent] = useState(0);

    const [folderLoading, setFolderLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [editTemplateRecord, setEditTemplateRecord] = useState(null);
    const [editTemplateForm] = Form.useForm();
    const [editTemplateLoading, setEditTemplateLoading] = useState(false);
    const [currentLawyerId, setCurrentLawyerId] = useState(null);
    const [currentUserState, setCurrentUserState] = useState(null);
    const currentUserRef = useRef(null);
    const activeLegalReferenceIdRef = useRef(null);
    const refreshCaseFoldersRef = useRef(() => {});
    const [lawyers, setLawyers] = useState([]);
    const [permissionFolder, setPermissionFolder] = useState(null);
    const [uploadFieldsTarget, setUploadFieldsTarget] = useState(null);
    const [shareFileRecord, setShareFileRecord] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityPage, setActivityPage] = useState(1);
    const [activitySearchQuery, setActivitySearchQuery] = useState("");
    const [activityActionFilter, setActivityActionFilter] = useState("all");
    const [activityDateFilter, setActivityDateFilter] = useState(null);
    const [dragState, setDragState] = useState({
      sourceKey: null,
      sourceType: null,
      targetKey: null,
      position: null,
    });
    const [externalDropActive, setExternalDropActive] = useState(false);
    const [externalDropTargetKey, setExternalDropTargetKey] = useState(null);
    const [externalUploadInProgress, setExternalUploadInProgress] =
      useState(false);

    const fileInputRef = useRef(null);
    const directFileTargetRef = useRef(null);
    const folderInputRef = useRef(null);
    const folderNameInputRef = useRef(null);
    const createReferenceFileInputRef = useRef(null);
    const createReferenceFolderInputRef = useRef(null);
    const [folderForm] = Form.useForm();
    const [createReferenceFiles, setCreateReferenceFiles] = useState([]);
    const [createReferenceFolderFiles, setCreateReferenceFolderFiles] = useState(
      [],
    );
    const [renameRecord, setRenameRecord] = useState(null);
    const [renameForm] = Form.useForm();

    // Context Menu State
    const [contextMenuState, setContextMenuState] = useState({
      open: false,
      x: 0,
      y: 0,
      record: null,
    });
    const closeContextMenu = () =>
      setContextMenuState((prev) => ({ ...prev, open: false }));

    const [showCompanyList, setShowCompanyList] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [activeCustomerId, setActiveCustomerId] = useState(null);
    const [activeCaseId, setActiveCaseId] = useState(null);
    const [sidebarSearch, setSidebarSearch] = useState("");
    const [caseFolders, setCaseFolders] = useState([]);
    const [customerCaseFolders, setCustomerCaseFolders] = useState([]);
    const [caseDocs, setCaseDocs] = useState([]);
    const [sharedWithMeDocs, setSharedWithMeDocs] = useState([]);
    const [caseFoldersLoading, setCaseFoldersLoading] = useState(false);

    // True when main view should show entity gallery (not document/folder tree)
    // 🌟 Legal Study gallery là danh sách FLAT các Case có folder
    // folderTemplateKey === "legal_study" (xem legalStudyEntities) — chọn 1
    // card sẽ set đồng thời activeCustomerId + activeCaseId rồi tự khoanh
    // vùng vào đúng folder mẫu "legal_study" của case đó (xem
    // activeLegalStudyFolder bên dưới), nên không cần bước Case gallery
    // trung gian như không gian "customer".
    const isEntityGallery =
      (activeSpace === "customer" && !activeCustomerId) ||
      (activeSpace === "customer" && !!activeCustomerId && !activeCaseId) ||
      (activeSpace === "legal_reference" && !activeLegalReferenceId) ||
      (activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCustomerId);

    useEffect(() => {
      setSelectedEntityKeys([]);
    }, [activeSpace, activeCustomerId, activeLegalReferenceId, activeCaseId]);

    const activeCompany = useMemo(
      () =>
        companies.find((c) => String(extractId(c)) === String(activeCompanyId)) ||
        null,
      [companies, activeCompanyId],
    );
    // Lấy danh sách các định dạng file có trong dữ liệu hiện tại để hiển thị tùy chọn lọc
    const fileExtOptions = useMemo(() => {
      const exts = new Set();
      documents.forEach((rec) => {
        const ext = getFileExtension(rec);
        if (ext) exts.add(ext.toUpperCase().replace(".", ""));
      });
      return [
        { value: "all", label: "All" },
        ...Array.from(exts).map((ext) => ({
          value: ext.toLowerCase(),
          label: ext,
        })),
      ];
    }, [documents]);
    const documentTypes = useMemo(() => {
      return DEFAULT_DOCUMENT_TYPE_OPTIONS.map(decorateDocumentTypeOption);
    }, []);

    const getRecordDocumentType = useCallback((record) => {
      return String(record?.documentType || "");
    }, []);

    const loadData = useCallback(async () => {
      setLoading(true);
      try {
        // 1. Resolve current user (auth:check is most reliable)
        let resolvedUser = null;
        try {
          const authRes = await ctx.api.request({ url: "auth:check" });
          resolvedUser = authRes?.data?.data || authRes?.data || null;
        } catch {}
        if (!resolvedUser) resolvedUser = getCurrentUser();

        // 2. Resolve matching lawyer record for permission checks
        let resolvedLawyerId = null;
        if (resolvedUser) {
          try {
            const userId = extractId(resolvedUser.id);
            const lwRes = await ctx.api.request({
              url: "lawyers:list",
              params: {
                pageSize: 1,
                filter: JSON.stringify({
                  $or: [
                    { userId: { $eq: userId } },
                    { createdById: { $eq: userId } },
                  ],
                }),
              },
            });
            let lawyer = lwRes?.data?.data?.[0];
            if (!lawyer) {
              // Fallback: scan full list
              const allLwRes = await ctx.api.request({
                url: "lawyers:list",
                params: {
                  pageSize: 1000,
                  fields: "id,lawyerName,email,userId,createdById",
                },
              });
              lawyer = (allLwRes?.data?.data || []).find((item) => {
                const linkedId = extractId(item.userId) || extractId(item.user);
                return (
                  linkedId === userId || extractId(item.createdById) === userId
                );
              });
            }
            resolvedLawyerId = lawyer ? extractId(lawyer.id) : null;
          } catch (e) {
            console.warn("loadData: could not resolve lawyerId", e);
          }
        }

        const [
          fetchedCompanies,
          fetchedFolders,
          fetchedDocs,
          fetchedLegalReferences,
          fetchedProjects,
          fetchedDocumentShares,
          fetchedCustomers,
          fetchedCustomerCaseFolders,
        ] = await Promise.all([
          fetchAllList("internalCompany:list", { sort: ["createdAt"] }).catch(
            () => [],
          ),
          fetchFoldersForInternalTemplates(),
          fetchDocumentsForInternalTemplates(),
          fetchLegalReferenceRecords(),
          fetchAllList("projects:list", {
            fields: [
              "id",
              "caseCode",
              "projectName",
              "description",
              "customerId",
              "customer",
            ],
            sort: ["-createdAt"],
          }).catch(() => []),
          fetchDocumentShareRows(),
          fetchAllList("customers:list", {
            sort: ["customerName"],
            appends: ["internalCompany", "createdBy"],
          }).catch(() => []),
          fetchCustomerCasePermissionFolders(),
        ]);

        setCompanies(fetchedCompanies);
        const isAllowedScope = (record) => {
          const scope = normalizeKey(record?.moduleScope);
          return !scope || DASHBOARD_CONFIG.moduleScopes.includes(scope);
        };
        setFolders(fetchedFolders.filter(isAllowedScope));
        setDocuments(
          mergeDocumentShareRows(
            fetchedDocs.filter(isAllowedScope),
            fetchedDocumentShares,
          ),
        );

        // Fetch full document records shared with current user (with fileAttachment for preview/download)
        {
          const currentUserId = resolvedUser
            ? String(extractId(resolvedUser.id) || "")
            : String(getCurrentUserId() || "");
          const userShareRows = currentUserId
            ? fetchedDocumentShares.filter((row) => {
                const uid = getShareRowUserId(row);
                return uid && String(uid) === currentUserId;
              })
            : [];
          if (userShareRows.length > 0) {
            const docIds = [
              ...new Set(
                userShareRows
                  .map((r) => getShareRowDocumentId(r))
                  .filter(Boolean)
                  .map(String),
              ),
            ];
            const sharedFullDocs = await fetchAllList("documents:list", {
              filter: JSON.stringify({ id: { $in: docIds } }),
              appends: ["fileAttachment", "createdBy"],
            }).catch(() => []);
            const sharedDocMap = new Map();
            sharedFullDocs.forEach((doc) => {
              const id = String(extractId(doc));
              const relevantShares = userShareRows.filter(
                (row) => String(getShareRowDocumentId(row)) === id,
              );
              sharedDocMap.set(id, { ...doc, _shareRows: relevantShares });
            });
            setSharedWithMeDocs(
              Array.from(sharedDocMap.values()).filter((d) => !d.isDeleted),
            );
          } else {
            setSharedWithMeDocs([]);
          }
        }

        setLegalReferences(fetchedLegalReferences);
        setProjects(fetchedProjects);
        setCustomers(fetchedCustomers);
        setCustomerCaseFolders(
          fetchedCustomerCaseFolders.filter((folder) => !folder?.isDeleted),
        );
        setActiveCompanyId(
          (prev) =>
            prev ||
            (fetchedCompanies[0] ? String(extractId(fetchedCompanies[0])) : null),
        );

        // Set current user & lawyer after data is ready
        if (resolvedUser) {
          // Store in refs/state for permission checks
          setCurrentLawyerId(resolvedLawyerId);
          // We track the full user object in a ref so memos can use it
          currentUserRef.current = resolvedUser;
          currentUserCache = resolvedUser;
          setCurrentUserState(resolvedUser);
        }

        // Also refresh case-specific data (caseFolders / caseDocs) if a case is active.
        // Uses a ref so we always get the latest refreshCaseFolders without needing it in deps.
        refreshCaseFoldersRef.current();
      } catch (e) {
        console.error("loadData error", e);
        message.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    }, []);

    const refreshCaseFolders = useCallback(() => {
      if (!activeCaseId) return;
      Promise.all([
        fetchAllList("folders:list", {
          filter: JSON.stringify({ projectId: { $eq: String(activeCaseId) } }),
          appends: [
            "createdBy",
            "folderManager",
            "folderMember",
            "folderManagers",
            "folderMembers",
          ],
          sort: ["createdAt"],
        }).catch(() => []),
        fetchAllList("documents:list", {
          filter: JSON.stringify({ caseId: { $eq: String(activeCaseId) } }),
          appends: ["fileAttachment", "createdBy"],
          sort: ["-createdAt"],
        }).catch(() => []),
      ]).then(([flds, docs]) => {
        setCaseFolders(flds.filter((f) => !f.isDeleted));
        setCaseDocs(docs.filter((d) => !d.isDeleted));
      });
    }, [activeCaseId]);

    // Keep ref up-to-date so loadData can call the latest refreshCaseFolders without closure issues
    useEffect(() => {
      refreshCaseFoldersRef.current = refreshCaseFolders;
    }, [refreshCaseFolders]);

    const fetchActivityLogs = useCallback(async () => {
      setActivityLoading(true);
      try {
        const res = await ctx.api.request({
          url: "activity_log:list",
          params: {
            pageSize: 500,
            sort: ["-changedAt"],
            filter: JSON.stringify({
              collectionName: { $in: ["Document", "Folder"] },
            }),
          },
        });

        const raw = res?.data?.data || [];

        const titleMap = {};
        for (const log of raw) {
          if (log.fieldName === "title" && log.newValue && log.recordId) {
            titleMap[log.recordId] = log.newValue;
          }
        }

        const companyFolderIds = new Set(
          folders
            .filter((f) => matchesInternalCompany(f, activeCompanyId))
            .map((f) => String(extractId(f.id))),
        );
        const companyDocIds = new Set(
          documents
            .filter((d) => matchesInternalCompany(d, activeCompanyId))
            .map((d) => String(extractId(d.id))),
        );
        const manualTrashLogs = raw.filter((log) =>
          ["trash_deleted", "restored"].includes(log.action),
        );
        const hasNearbyManualTrashLog = (log, actionName) => {
          const logTime = getActivityTime(log);
          return manualTrashLogs.some((manualLog) => {
            if (manualLog.action !== actionName) return false;
            if (manualLog.collectionName !== log.collectionName) return false;
            if (String(manualLog.recordId) !== String(log.recordId)) return false;
            const manualTime = getActivityTime(manualLog);
            if (!logTime || !manualTime) return true;
            return Math.abs(manualTime - logTime) <= 60 * 1000;
          });
        };
        const filtered = raw
          .filter((log) => {
            if (isSystemActivityLog(log)) return false;
            if (
              isTrashDeleteActivity(log) &&
              hasNearbyManualTrashLog(log, "trash_deleted")
            )
              return false;
            if (
              isTrashRestoreActivity(log) &&
              hasNearbyManualTrashLog(log, "restored")
            )
              return false;
            return true;
          })
          .map((log) => ({
            ...log,
            resolvedTitle: titleMap[log.recordId] || null,
          }))
          .filter((log) => {
            const rId = String(log.recordId);
            if (
              ["deleted", "trash_deleted", "restored"].includes(log.action) &&
              activeCompanyId &&
              String(extractId(log.dataId)) === String(extractId(activeCompanyId))
            ) {
              return true;
            }
            if (log.collectionName === "Folder") {
              return companyFolderIds.has(rId);
            } else if (log.collectionName === "Document") {
              return companyDocIds.has(rId);
            }
            return false;
          });

        setActivityLogs(filtered);
        setActivityPage(1);
      } catch (e) {
        console.error("Failed to fetch activity logs:", e);
      } finally {
        setActivityLoading(false);
      }
    }, [folders, documents, activeCompanyId, currentUserState, currentLawyerId]);

    const createManualActivityLog = useCallback(
      (record, action, options = {}) => {
        const recordId = extractId(record);
        if (!recordId || !action) return Promise.resolve();

        const isFolder =
          options.collectionName === "Folder" || record?._type === "folder";
        const currentUser =
          currentUserState || currentUserRef.current || getCurrentUser();
        const now = new Date().toISOString();
        const title =
          options.title ||
          (isFolder
            ? record?.name || record?.title || "Folder"
            : getDocTitle(record));
        const toNullableString = (value) =>
          value === undefined || value === null || value === ""
            ? null
            : String(value);

        return ctx.api
          .request({
            url: "activity_log:create",
            method: "POST",
            data: {
              collectionName: isFolder ? "Folder" : "Document",
              recordId,
              action,
              fieldName:
                options.fieldName ||
                (isFolder ? "permissions" : "fileAttachment"),
              oldValue: toNullableString(options.oldValue),
              newValue: toNullableString(
                options.newValue !== undefined ? options.newValue : title,
              ),
              changedByName: getUserDisplayName(currentUser) || "System",
              changedAt: now,
              createdAt: now,
              batchId: options.batchId || null,
              dataId: options.dataId || null,
            },
          })
          .then(() => {
            if (activeSpace === "recent") {
              fetchActivityLogs();
            }
          })
          .catch((e) => {
            console.warn("Failed to create manual activity log", e);
          });
      },
      [activeSpace, currentUserState, fetchActivityLogs],
    );

    const createTrashActivityLog = useCallback(
      (record, action) =>
        createManualActivityLog(record, action, {
          fieldName: "deletedAt",
          newValue:
            record?._type === "folder"
              ? record?.name || record?.title || "Folder"
              : getDocTitle(record),
          dataId: extractId(activeCompanyId),
        }),
      [activeCompanyId, createManualActivityLog],
    );

    const resolveActivityActionInfo = useCallback((log) => {
      const { action, fieldName: field, newValue: newV } = log;

      if (action === "uploaded") {
        return {
          key: "uploaded",
          label: "Uploaded",
          color: "#0C447C",
          bg: "#E6F1FB",
          border: "#B5D4F4",
          icon: (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          ),
        };
      }

      if (action === "created") {
        return {
          key: "created",
          label: "Created",
          color: "#0369A1",
          bg: "#F0F9FF",
          border: "#BAE6FD",
          icon: (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          ),
        };
      }

      if (action === "moved") {
        return {
          key: "moved",
          label: "Move",
          color: "#B45309",
          bg: "#FFFBEB",
          border: "#FEF3C7",
          icon: (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="5 9 2 12 5 15" />
              <polyline points="9 5 12 2 15 5" />
              <polyline points="15 19 12 22 9 19" />
              <polyline points="19 9 22 12 19 15" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="12" y1="2" x2="12" y2="22" />
            </svg>
          ),
        };
      }

      if (action === "previewed") {
        return {
          key: "previewed",
          label: "Preview",
          color: "#4338CA",
          bg: "#EEF2FF",
          border: "#C7D2FE",
          icon: (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ),
        };
      }

      if (action === "downloaded") {
        return {
          key: "downloaded",
          label: "Download",
          color: "#075985",
          bg: "#E0F2FE",
          border: "#BAE6FD",
          icon: (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          ),
        };
      }

      if (action === "shared_file") {
        return {
          key: "shared_file",
          label: "Share",
          color: "#6D28D9",
          bg: "#F5F3FF",
          border: "#DDD6FE",
          icon: USER_ICON,
        };
      }

      if (action === "unshared_file") {
        return {
          key: "unshared_file",
          label: "Unshare",
          color: "#991B1B",
          bg: "#FEF2F2",
          border: "#FECACA",
          icon: USER_ICON,
        };
      }

      if (action === "permission_updated") {
        return {
          key: "permission_updated",
          label: "Permissions Updated",
          color: "#7C2D12",
          bg: "#FFF7ED",
          border: "#FED7AA",
          icon: (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ),
        };
      }

      if (action === "trash_deleted") {
        return {
          key: "trash_deleted",
          label: "Move to Trash",
          color: "#B91C1C",
          bg: "#FEF2F2",
          border: "#FEE2E2",
          icon: (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          ),
        };
      }

      if (action === "restored") {
        return {
          key: "restored",
          label: "Restore",
          color: "#15803D",
          bg: "#F0FDF4",
          border: "#DCFCE7",
          icon: (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          ),
        };
      }

      if (action === "updated") {
        if (field === "isDeleted" || DELETE_TIMESTAMP_FIELDS.has(field)) {
          if (isTrashDeleteActivity(log)) {
            return {
              key: "trash_deleted",
              label: "Move to Trash",
              color: "#B91C1C",
              bg: "#FEF2F2",
              border: "#FEE2E2",
              icon: (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              ),
            };
          } else {
            return {
              key: "restored",
              label: "Restore",
              color: "#15803D",
              bg: "#F0FDF4",
              border: "#DCFCE7",
              icon: (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              ),
            };
          }
        }
        if (field === "folderId" || field === "parentId") {
          return {
            key: "moved",
            label: "Move",
            color: "#B45309",
            bg: "#FFFBEB",
            border: "#FEF3C7",
            icon: (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="5 9 2 12 5 15" />
                <polyline points="9 5 12 2 15 5" />
                <polyline points="15 19 12 22 9 19" />
                <polyline points="19 9 22 12 19 15" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="12" y1="2" x2="12" y2="22" />
              </svg>
            ),
          };
        }
        return {
          key: "updated",
          label: "Updated",
          color: "#4D7C0F",
          bg: "#F7FEE7",
          border: "#ECFCCB",
          icon: (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          ),
        };
      }

      if (action === "deleted") {
        return {
          key: "deleted",
          label: "Permanently Delete",
          color: "#451A03",
          bg: "#FFF7ED",
          border: "#FFEDD5",
          icon: (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          ),
        };
      }

      return {
        key: action,
        label: action,
        color: "#374151",
        bg: "#F3F4F6",
        border: "#E5E7EB",
        icon: (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ),
      };
    }, []);

    const resolveActivityDesc = useCallback((log, foldersList, docsList) => {
      const {
        action,
        fieldName: field,
        oldValue: oldV,
        newValue: newV,
        collectionName,
      } = log;
      const isFolder = collectionName === "Folder";
      const entityName = isFolder ? "folder" : "document";

      const FIELD_LABELS = {
        internalTemplateId: "document type",
        internalTemplate: "document type",
        internalTemplates: "document type",
        internalTemplatesId: "document type",
        legalReferenceId: "linked customer",
        legalReference: "linked customer",
        customerId: "linked customer",
        customer: "linked customer",
        customers: "linked customer",
        folderId: "folder",
        folder: "folder",
        parentId: "parent folder",
        internalCompanyId: "internal company",
        internalCompany: "internal company",
        name: "name",
        title: "title",
        description: "description",
        googleDriveUrl: "Google Drive link",
        fileAttachment: "raw file",
        fileIndex: "sort position",
        documentType: "document classification",
        storageType: "storage space",
        userId: "shared recipient",
        users: "shared recipient",
        documentId: "shared document",
        documents: "shared document",
        status: "status",
        isDeleted: "deletion status",
        deletedAt: "deletion date",
        deleted_at: "deletion date",
        updatedAt: "update time",
        createdAt: "creation time",
        documentCode: "document code",
        openingDate: "opening date",
        senderName: "sender",
        recipientName: "recipient",
        language: "language",
        docFormat: "document format",
        signedAt: "signed date",
        effectiveAt: "effective date",
        note: "note",
        deteledAt: "deletion date",
      };

      const ACTION_LABELS = {
        uploaded: "upload",
        created: "create",
        updated: "update",
        moved: "move",
        deleted: "permanently delete",
        trash_deleted: "move to trash",
        restored: "restore",
        previewed: "preview",
        downloaded: "download",
        shared_file: "share document",
        unshared_file: "unshare document",
        permission_updated: "update permissions",
        linked_legal_study: "add to Legal Study",
        unlinked_legal_study: "remove from Legal Study",
      };

      if (action === "linked_legal_study") {
        const parts = String(newV || "").split(" - ");
        const targetLabel = parts.length > 1 ? parts[0].trim() : "";
        return targetLabel
          ? `Added document to Legal Study at "${targetLabel}"`
          : "Added document to Legal Study";
      }

      if (action === "unlinked_legal_study") {
        return "Removed document from Legal Study";
      }

      if (action === "previewed") {
        return `Previewed ${entityName}`;
      }

      if (action === "downloaded") {
        return `Downloaded ${entityName}`;
      }

      if (action === "shared_file") {
        if (!newV) return "Shared document with user";
        return String(newV).includes(";")
          ? `Shared document with users: ${newV}`
          : `Shared document with user named ${newV}`;
      }

      if (action === "unshared_file") {
        if (!newV) return "Unshared document with user";
        return String(newV).includes(";")
          ? `Unshared document with users: ${newV}`
          : `Unshared document with user named ${newV}`;
      }

      if (action === "permission_updated") {
        return newV
          ? `Updated permissions for ${entityName}: ${newV}`
          : `Updated permissions for ${entityName}`;
      }

      if (action === "uploaded" || action === "created") {
        return isFolder ? "Created a new folder" : "Uploaded a new document";
      }

      if (action === "deleted") {
        return `Permanently deleted ${entityName}`;
      }

      if (action === "trash_deleted") {
        return `Moved ${entityName} to Trash`;
      }

      if (action === "restored") {
        return `Restored ${entityName} from Trash`;
      }

      if (action === "moved") {
        const getFolderName = (id) => {
          if (!id || id === "root" || id === "0" || id === 0)
            return "Root folder";
          const f = foldersList.find(
            (item) => String(extractId(item.id)) === String(id),
          );
          return f ? f.name : `Folder #${id}`;
        };
        if (oldV || newV) {
          const oldFolder = getFolderName(oldV);
          const newFolder = getFolderName(newV);
          return `Moved ${entityName} from "${oldFolder}" sang "${newFolder}"`;
        }
        return `Moved ${entityName}`;
      }

      if (action === "updated") {
        if (field === "isDeleted" || DELETE_TIMESTAMP_FIELDS.has(field)) {
          if (isTrashDeleteActivity(log)) {
            return `Moved ${entityName} to Trash`;
          } else {
            return `Restored ${entityName} from Trash`;
          }
        }
        if (field === "name" || field === "title") {
          if (oldV && newV) {
            return `Renamed ${entityName}: "${oldV}" → "${newV}"`;
          }
          return `Renamed ${entityName} to "${newV}"`;
        }
        if (field === "folderId" || field === "parentId") {
          const getFolderName = (id) => {
            if (!id || id === "root" || id === "0" || id === 0)
              return "Root folder";
            const f = foldersList.find(
              (item) => String(extractId(item.id)) === String(id),
            );
            return f ? f.name : `Folder #${id}`;
          };
          const oldFolder = getFolderName(oldV);
          const newFolder = getFolderName(newV);
          return `Moved from "${oldFolder}" sang "${newFolder}"`;
        }

        const fieldLabel = FIELD_LABELS[field] || field;
        return `Updated ${fieldLabel} of ${entityName}`;
      }

      const actionLabel = ACTION_LABELS[action] || action;
      return `Action [${actionLabel}] on ${entityName}`;
    }, []);

    const filteredActivityLogs = useMemo(() => {
      return activityLogs.filter((log) => {
        if (activityActionFilter !== "all") {
          const info = resolveActivityActionInfo(log);
          if (info.key !== activityActionFilter) {
            return false;
          }
        }

        if (activityDateFilter) {
          const activityTime = new Date(getActivityTime(log)).getTime();
          const startOfDay = activityDateFilter.startOf("day").valueOf();
          const endOfDay = activityDateFilter.endOf("day").valueOf();
          if (
            !Number.isFinite(activityTime) ||
            activityTime < startOfDay ||
            activityTime > endOfDay
          ) {
            return false;
          }
        }

        if (activitySearchQuery.trim()) {
          const q = activitySearchQuery.toLowerCase();
          const userName = (log.changedByName || "System").toLowerCase();
          const name = (
            log.resolvedTitle ||
            log.recordTitle ||
            log.newValue ||
            log.oldValue ||
            ""
          ).toLowerCase();
          const desc = resolveActivityDesc(log, folders, documents).toLowerCase();

          return userName.includes(q) || name.includes(q) || desc.includes(q);
        }

        return true;
      });
    }, [
      activityLogs,
      activityActionFilter,
      activityDateFilter,
      activitySearchQuery,
      folders,
      documents,
      resolveActivityActionInfo,
      resolveActivityDesc,
    ]);

    useEffect(() => {
      loadData();
    }, [loadData]);

    useEffect(() => {
      let active = true;
      let timer = null;
      const handleExternalDataChanged = () => {
        if (!active) return;
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          timer = null;
          loadData();
        }, 300);
      };
      window.addEventListener(LIBRARY_DATA_CHANGED_EVENT, handleExternalDataChanged);
      return () => {
        active = false;
        if (timer) window.clearTimeout(timer);
        window.removeEventListener(LIBRARY_DATA_CHANGED_EVENT, handleExternalDataChanged);
      };
    }, [loadData]);

    useEffect(() => {
      if (activeSpace === "recent") {
        fetchActivityLogs();
      }
    }, [activeSpace, activeCompanyId, fetchActivityLogs]);

    useEffect(() => {
      if (activeSpace === "legal_reference") {
        // Only reset if the currently selected reference is no longer in the filtered list
        const currentRefId = activeLegalReferenceIdRef.current;
        if (
          currentRefId &&
          !filteredLegalReferences.some(
            (r) => String(extractId(r)) === String(currentRefId),
          )
        ) {
          setActiveLegalReferenceId(null);
        }
        // Do NOT auto-select: let user explicitly choose a reference via sidebar or list click
      } else {
        setActiveLegalReferenceId(null);
      }
    }, [activeCompanyId, filteredLegalReferences, activeSpace]);

    useEffect(() => {
      setSelectedRowKeys([]);
    }, [activeSpace, activeCompanyId, activeLegalReferenceId, selectedFolderId]);

    // Reset "show more" when search query or active space changes
    // Fetch folders + docs for selected case
    useEffect(() => {
      if (!activeCaseId) {
        setCaseFolders([]);
        setCaseDocs([]);
        return;
      }
      let cancelled = false;
      setCaseFoldersLoading(true);
      Promise.all([
        fetchAllList("folders:list", {
          filter: JSON.stringify({ projectId: { $eq: String(activeCaseId) } }),
          appends: [
            "createdBy",
            "folderManager",
            "folderMember",
            "folderManagers",
            "folderMembers",
          ],
          sort: ["createdAt"],
        }).catch(() => []),
        fetchAllList("documents:list", {
          filter: JSON.stringify({ caseId: { $eq: String(activeCaseId) } }),
          appends: ["fileAttachment", "createdBy"],
          sort: ["-createdAt"],
        }).catch(() => []),
      ])
        .then(([flds, docs]) => {
          if (cancelled) return;
          setCaseFolders(flds.filter((f) => !f.isDeleted));
          setCaseDocs(docs.filter((d) => !d.isDeleted));
        })
        .finally(() => {
          if (!cancelled) setCaseFoldersLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [activeCaseId]);

    // 🌟 Folder mẫu "Legal Study" của case đang chọn (nhận diện qua
    // folderTemplateKey do CaseCreateForm.js gán sẵn khi tạo Case — không
    // còn record legalStudy riêng để tra cứu nữa).
    const activeLegalStudyFolder = useMemo(() => {
      if (!activeCaseId) return null;
      return (
        caseFolders.find(
          (f) => f.folderTemplateKey === LEGAL_STUDY_FOLDER_TEMPLATE_KEY,
        ) || null
      );
    }, [caseFolders, activeCaseId]);

    // Tập id của folder Legal Study + toàn bộ folder con cháu bên trong nó
    // (dùng để khoanh vùng visibleFolders/visibleDocs, không cho lẫn sang
    // các folder mẫu khác của case như "Legal docs", "Report and Result"...).
    const legalStudySubtreeFolderIds = useMemo(() => {
      if (!activeLegalStudyFolder) return new Set();
      const rootId = String(extractId(activeLegalStudyFolder));
      const ids = new Set([rootId]);
      let added = true;
      while (added) {
        added = false;
        caseFolders.forEach((f) => {
          const fid = String(extractId(f));
          if (ids.has(fid)) return;
          const parentId = String(getFolderParentId(f) || "");
          if (parentId && ids.has(parentId)) {
            ids.add(fid);
            added = true;
          }
        });
      }
      return ids;
    }, [caseFolders, activeLegalStudyFolder]);

    // Vào không gian Legal Study + đã chọn Case → tự động khoanh vùng thẳng
    // vào folder "Legal Study" của case đó (bỏ qua bước hiện case-root làm
    // 1 card phải click thêm 1 lần, giống cách "customer" space đang làm).
    useEffect(() => {
      if (activeSpace !== LEGAL_STUDY_STORAGE_TYPE) return;
      if (!activeCaseId || !activeLegalStudyFolder) return;
      const folderId = String(extractId(activeLegalStudyFolder));
      if (selectedFolderId === "root") setSelectedFolderId(folderId);
    }, [activeSpace, activeCaseId, activeLegalStudyFolder, selectedFolderId]);

    const companyFolders = useMemo(
      () =>
        folders.filter((folder) =>
          matchesInternalCompany(folder, activeCompanyId),
        ),
      [folders, activeCompanyId],
    );

    const companyDocs = useMemo(
      () =>
        documents.filter((doc) => matchesInternalCompany(doc, activeCompanyId)),
      [documents, activeCompanyId],
    );

    const isAdmin = useMemo(
      () => isAdminUser(currentUserState),
      [currentUserState],
    );

    const getCustomerDisplayName = (c) =>
      c?.customerName || c?.name || c?.shortName || `Customer ${extractId(c)}`;

    const projectById = useMemo(() => {
      const map = new Map();
      projects.forEach((project) => {
        const id = extractId(project);
        if (id) map.set(String(id), project);
      });
      return map;
    }, [projects]);

    const customerAccessScope = useMemo(() => {
      const unrestricted = { customerIds: null, caseIds: null };
      const currentUser = currentUserState;
      if (!currentUser || isAdminUser(currentUser)) return unrestricted;

      const folderById = new Map();
      customerCaseFolders.forEach((folder) => {
        const id = extractId(folder);
        if (id) folderById.set(String(id), folder);
      });

      const resolveFolderProjectId = (folder) => {
        let current = folder;
        const visited = new Set();
        while (current) {
          const directProjectId = getFolderCaseProjectId(current);
          if (directProjectId) return String(directProjectId);

          const parentId = getFolderParentId(current);
          if (!parentId || parentId === "root") return "";
          const key = String(parentId);
          if (visited.has(key)) return "";
          visited.add(key);
          current = folderById.get(key);
        }
        return "";
      };

      const { accessible } = getVisibleFolderIds(
        customerCaseFolders,
        currentUser,
        currentLawyerId,
      );
      const customerIds = new Set();
      const caseIds = new Set();

      customerCaseFolders.forEach((folder) => {
        const folderId = extractId(folder);
        if (!folderId || !accessible.has(folderId)) return;

        const projectId = resolveFolderProjectId(folder);
        if (!projectId) return;
        const project = projectById.get(String(projectId));
        const customerId = getProjectCustomerId(project);
        if (!customerId) return;

        caseIds.add(String(projectId));
        customerIds.add(String(customerId));
      });

      return { customerIds, caseIds };
    }, [customerCaseFolders, currentLawyerId, currentUserState, projectById]);

    const visibleCustomerProjects = useMemo(() => {
      const allowedCaseIds = customerAccessScope.caseIds;
      return projects.filter((project) => {
        const customerId = getProjectCustomerId(project);
        if (!customerId) return false;
        if (!allowedCaseIds) return true;
        return allowedCaseIds.has(String(extractId(project)));
      });
    }, [projects, customerAccessScope]);

    const canOpenCustomerSpace = useMemo(() => {
      if (!currentUserState || isAdmin) return true;
      return Boolean(
        customerAccessScope.customerIds && customerAccessScope.customerIds.size,
      );
    }, [currentUserState, isAdmin, customerAccessScope]);

    const customerCases = useMemo(() => {
      if (!activeCustomerId) return [];
      return visibleCustomerProjects.filter((p) => {
        const cid = String(getProjectCustomerId(p) || "");
        return cid && cid === String(activeCustomerId);
      });
    }, [visibleCustomerProjects, activeCustomerId]);

    // 🌟 Khi đã chọn Customer, gộp thẳng "chọn Case" + "xem folder gốc của
    // Case" thành 1 màn hình duy nhất: liệt kê TẤT CẢ folder gốc của mọi
    // Case thuộc customer này (mỗi Case có thể có nhiều folder gốc), thay
    // vì bắt người dùng click vào tên Case trước rồi mới thấy folder gốc —
    // giảm 1 bước bấm so với luồng cũ (Customer → tên Case → folder gốc →
    // folder con), còn lại đúng 3 bước (Customer → folder gốc → folder con).
    const customerCaseRootFolders = useMemo(() => {
      if (!activeCustomerId) return [];
      const activeCaseFolders = customerCaseFolders.filter((f) => !f?.isDeleted);
      const folderById = new Map();
      activeCaseFolders.forEach((f) => {
        const id = extractId(f);
        if (id) folderById.set(String(id), f);
      });
      // Dùng cùng phạm vi quyền cấp Case đã tính ở customerAccessScope (chính
      // là thứ quyết định con số "Vụ việc: N" hiển thị trên card Customer).
      const allowedCaseIds = customerAccessScope.caseIds;

      // 🌟 Cây folder thật sự do CaseCreateForm.js dựng lên có 3 tầng:
      //   Customer root (parentId: null, projectId: null, customerId: X)
      //     └─ Case folder (parentId: <customer root>, projectId: Y)  ← đây
      //          ├─ Legal Study (parentId: <case folder>, projectId: Y)
      //          └─ ... các folder mẫu khác (cũng projectId: Y)
      // "Folder gốc của Case" KHÔNG phải folder không có parentId (đó là
      // Customer root — không đại diện Case nào) mà là folder có projectId
      // gán trực tiếp NHƯNG parent của nó lại không có projectId trực tiếp
      // (tức parent chưa gắn với Case cụ thể nào — đúng là Customer root).
      // Dùng getFolderCaseProjectId trực tiếp trên từng folder (không đi
      // ngược lên tổ tiên) để phân biệt đúng tầng "Case folder" với các
      // folder mẫu con bên trong nó (cả hai đều có projectId nhưng khác tầng).
      const items = [];
      activeCaseFolders.forEach((folder) => {
        const ownProjectId = getFolderCaseProjectId(folder);
        if (!ownProjectId) return; // không thuộc Case nào (vd: Customer root)

        const parentId = getFolderParentId(folder);
        const parentFolder = parentId ? folderById.get(String(parentId)) : null;
        const parentOwnProjectId = parentFolder
          ? getFolderCaseProjectId(parentFolder)
          : null;
        // Nếu parent CŨNG có projectId trực tiếp → folder này là con cháu
        // bên trong Case (Legal Study, Legal docs...), không phải root.
        if (parentOwnProjectId) return;

        const projectId = String(ownProjectId);
        if (allowedCaseIds && !allowedCaseIds.has(projectId)) return;
        const project = projectById.get(projectId);
        if (!project) return;
        if (String(getProjectCustomerId(project)) !== String(activeCustomerId))
          return;

        items.push({ folder, project });
      });
      return items;
    }, [
      activeCustomerId,
      customerCaseFolders,
      customerAccessScope,
      projectById,
    ]);

    // Mỗi entry kèm tập id folder con cháu của nó (dùng tính "Dung lượng").
    const customerCaseRootFoldersWithSubtree = useMemo(() => {
      const activeCaseFolders = customerCaseFolders.filter((f) => !f?.isDeleted);
      return customerCaseRootFolders.map((entry) => ({
        ...entry,
        _subtreeIds: getFolderSubtreeIds(extractId(entry.folder), activeCaseFolders),
      }));
    }, [customerCaseRootFolders, customerCaseFolders]);

    const customerCaseRootFolderAllSubtreeIds = useMemo(() => {
      const ids = new Set();
      customerCaseRootFoldersWithSubtree.forEach((entry) =>
        entry._subtreeIds.forEach((id) => ids.add(id)),
      );
      return Array.from(ids);
    }, [customerCaseRootFoldersWithSubtree]);

    const [customerCaseRootFolderDocs, setCustomerCaseRootFolderDocs] = useState(
      [],
    );

    // Fetch 1 lần tất cả document trong subtree của mọi folder gốc (chỉ khi
    // đang đứng ở màn hình gộp này) — dùng tính cột "Dung lượng".
    useEffect(() => {
      if (activeSpace !== "customer" || !activeCustomerId || activeCaseId) return;
      if (!customerCaseRootFolderAllSubtreeIds.length) {
        setCustomerCaseRootFolderDocs([]);
        return;
      }
      let cancelled = false;
      fetchAllList("documents:list", {
        filter: JSON.stringify({
          folderId: {
            $in: customerCaseRootFolderAllSubtreeIds.map(Number).filter(Boolean),
          },
        }),
        appends: ["fileAttachment"],
      })
        .then((docs) => {
          if (!cancelled)
            setCustomerCaseRootFolderDocs(
              (docs || []).filter((d) => !d?.isDeleted),
            );
        })
        .catch(() => {
          if (!cancelled) setCustomerCaseRootFolderDocs([]);
        });
      return () => {
        cancelled = true;
      };
    }, [
      activeSpace,
      activeCustomerId,
      activeCaseId,
      customerCaseRootFolderAllSubtreeIds,
    ]);

    const customerCaseRootFolderSizeById = useMemo(() => {
      const perFolderBytes = {};
      customerCaseRootFolderDocs.forEach((doc) => {
        const fid = String(extractId(doc.folderId) || "");
        if (!fid) return;
        const att = getAttachment(doc);
        const size = att?.size ? parseInt(att.size, 10) || 0 : 0;
        perFolderBytes[fid] = (perFolderBytes[fid] || 0) + size;
      });
      const map = {};
      customerCaseRootFoldersWithSubtree.forEach((entry) => {
        let total = 0;
        entry._subtreeIds.forEach((fid) => {
          total += perFolderBytes[fid] || 0;
        });
        map[String(extractId(entry.folder))] = total;
      });
      return map;
    }, [customerCaseRootFoldersWithSubtree, customerCaseRootFolderDocs]);

    // 🌟 Danh sách flat các Case có folder Legal Study (nhận diện qua
    // folderTemplateKey === "legal_study" do CaseCreateForm.js gán sẵn) —
    // dùng làm gallery cấp cao nhất của không gian Legal Study, bỏ qua bước
    // chọn Customer → Case. Chỉ hiện case nào thực sự có folder này và user
    // có quyền truy cập folder đó.
    const legalStudyEntities = useMemo(() => {
      const currentUser = currentUserState;
      const activeCaseFolders = customerCaseFolders.filter((f) => !f?.isDeleted);
      const { accessible } =
        currentUser && !isAdmin
          ? getVisibleFolderIds(activeCaseFolders, currentUser, currentLawyerId)
          : { accessible: null };

      const items = [];
      activeCaseFolders.forEach((folder) => {
        if (folder.folderTemplateKey !== LEGAL_STUDY_FOLDER_TEMPLATE_KEY) return;
        if (accessible && !accessible.has(extractId(folder.id))) return;

        const projectId = getFolderCaseProjectId(folder);
        if (!projectId) return;
        const project = projectById.get(String(projectId));
        if (!project) return;
        const customerId = getProjectCustomerId(project);
        const customer = customers.find(
          (c) => String(extractId(c)) === String(customerId),
        );

        items.push({ folder, project, customer });
      });
      return items;
    }, [
      customerCaseFolders,
      currentUserState,
      currentLawyerId,
      isAdmin,
      projectById,
      customers,
    ]);

    // Mỗi entry Legal Study kèm tập id folder con cháu của nó (tính trên
    // toàn bộ customerCaseFolders, không phụ thuộc case đang active) — dùng
    // để tính "Dung lượng" tổng hợp cho cột bảng gallery Legal Study.
    const legalStudyEntitiesWithSubtree = useMemo(() => {
      const activeCaseFolders = customerCaseFolders.filter((f) => !f?.isDeleted);
      return legalStudyEntities.map((entry) => ({
        ...entry,
        _subtreeIds: getFolderSubtreeIds(extractId(entry.folder), activeCaseFolders),
      }));
    }, [legalStudyEntities, customerCaseFolders]);

    const legalStudyAllSubtreeIds = useMemo(() => {
      const ids = new Set();
      legalStudyEntitiesWithSubtree.forEach((entry) =>
        entry._subtreeIds.forEach((id) => ids.add(id)),
      );
      return Array.from(ids);
    }, [legalStudyEntitiesWithSubtree]);

    const [legalStudyDocs, setLegalStudyDocs] = useState([]);

    // Fetch 1 lần tất cả document nằm trong subtree của mọi folder Legal
    // Study (chỉ khi đang đứng ở gallery gốc) — dùng tính cột "Dung lượng".
    useEffect(() => {
      if (activeSpace !== LEGAL_STUDY_STORAGE_TYPE || activeCustomerId) return;
      if (!legalStudyAllSubtreeIds.length) {
        setLegalStudyDocs([]);
        return;
      }
      let cancelled = false;
      fetchAllList("documents:list", {
        filter: JSON.stringify({
          folderId: { $in: legalStudyAllSubtreeIds.map(Number).filter(Boolean) },
        }),
        appends: ["fileAttachment"],
      })
        .then((docs) => {
          if (!cancelled) setLegalStudyDocs((docs || []).filter((d) => !d?.isDeleted));
        })
        .catch(() => {
          if (!cancelled) setLegalStudyDocs([]);
        });
      return () => {
        cancelled = true;
      };
    }, [activeSpace, activeCustomerId, legalStudyAllSubtreeIds]);

    const legalStudyFolderSizeById = useMemo(() => {
      const perFolderBytes = {};
      legalStudyDocs.forEach((doc) => {
        const fid = String(extractId(doc.folderId) || "");
        if (!fid) return;
        const att = getAttachment(doc);
        const size = att?.size ? parseInt(att.size, 10) || 0 : 0;
        perFolderBytes[fid] = (perFolderBytes[fid] || 0) + size;
      });
      const map = {};
      legalStudyEntitiesWithSubtree.forEach((entry) => {
        let total = 0;
        entry._subtreeIds.forEach((fid) => {
          total += perFolderBytes[fid] || 0;
        });
        map[String(extractId(entry.folder))] = total;
      });
      return map;
    }, [legalStudyEntitiesWithSubtree, legalStudyDocs]);

    const legalRefStats = useMemo(() => {
      const stats = {};
      filteredLegalReferences.forEach((ref) => {
        const rid = String(extractId(ref));
        stats[rid] = {
          folderCount: folders.filter(
            (f) => !f.isDeleted && String(getRecordLegalReferenceId(f)) === rid,
          ).length,
          docCount: documents.filter(
            (d) => !d.isDeleted && String(getRecordLegalReferenceId(d)) === rid,
          ).length,
        };
      });
      return stats;
    }, [filteredLegalReferences, folders, documents]);

    const customerStats = useMemo(() => {
      const stats = {};
      customers.forEach((c) => {
        const cid = String(extractId(c));
        stats[cid] = {
          caseCount: visibleCustomerProjects.filter(
            (p) =>
              String(getProjectCustomerId(p) || "") === cid,
          ).length,
        };
      });
      return stats;
    }, [customers, visibleCustomerProjects]);

    const canViewTrashRecord = useCallback(
      (record) => {
        if (isAdminUser(currentUserState)) return true;
        const currentUserId =
          extractId(currentUserState?.id) || getCurrentUserId();
        const actorIds = new Set(
          [currentUserId, currentLawyerId]
            .filter(Boolean)
            .map((id) => String(id)),
        );
        if (!actorIds.size) return false;
        const deletedActorIds = [
          extractId(record?.deletedById),
          extractId(record?.deletedBy),
          extractId(record?.updatedById),
          extractId(record?.updatedBy),
        ]
          .filter(Boolean)
          .map((id) => String(id));
        return deletedActorIds.some((id) => actorIds.has(id));
      },
      [currentUserState, currentLawyerId],
    );

    const visibleDocs = useMemo(() => {
      if (activeSpace === "trash") {
        return companyDocs.filter(
          (doc) => doc.isDeleted === true && canViewTrashRecord(doc),
        );
      }
      if (activeSpace === "recent") {
        return companyDocs.filter((doc) => !doc.isDeleted);
      }

      const activeDocs = companyDocs.filter((doc) => !doc.isDeleted);

      if (activeSpace === "company_shared") {
        return activeDocs.filter((doc) => {
          const isShared =
            doc.storageType === "company_shared" ||
            (!doc.storageType &&
              !getRecordDocumentType(doc) &&
              !getInternalTemplateRelationId(doc) &&
              !getRecordLegalReferenceId(doc));
          return isShared && doc.storageType !== "legal_reference";
        });
      }
      if (activeSpace === KNOWLEDGE_STORAGE_TYPE) {
        return activeDocs.filter(
          (doc) => doc.storageType === KNOWLEDGE_STORAGE_TYPE,
        );
      }
      if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
        // 🌟 Legal Study giờ chỉ là 1 nhánh trong cây tài liệu của Case
        // (moduleScope vẫn "case_document") — lấy thẳng từ caseDocs, khoanh
        // vùng vào đúng folder Legal Study + folder con cháu của nó.
        return caseDocs.filter(
          (d) =>
            !d.isDeleted &&
            legalStudySubtreeFolderIds.has(String(extractId(d.folderId) || "")),
        );
      }
      if (activeSpace === "legal_reference") {
        return activeDocs.filter((doc) => {
          return (
            String(getRecordLegalReferenceId(doc)) ===
            String(activeLegalReferenceId)
          );
        });
      }
      if (activeSpace === "customer") {
        return caseDocs.filter((d) => !d.isDeleted);
      }
      if (activeSpace === MY_DOCUMENT_STORAGE_TYPE) {
        const currentUserId = String(
          extractId(currentUserState?.id) || getCurrentUserId() || "",
        );
        if (!currentUserId) return [];
        return documents.filter((doc) => {
          if (doc.isDeleted) return false;
          return (
            doc.storageType === MY_DOCUMENT_STORAGE_TYPE &&
            (String(extractId(doc.createdById) || "") === currentUserId ||
              String(extractId(doc.uploadedById) || "") === currentUserId)
          );
        });
      }
      if (activeSpace === "shared_with_me") {
        // Use sharedWithMeDocs (built from share rows in loadData) to cover docs
        // in any scope (customer/case/personal) that are not in the scope-filtered
        // documents state. Falls back to checking documents state as well.
        const fromShareRows = sharedWithMeDocs.filter((d) => !d.isDeleted);
        const fromDocState = documents.filter((doc) => {
          if (doc.isDeleted) return false;
          return isRecordSharedWithUser(doc, currentUserState);
        });
        // Merge, preferring the richer doc from documents state (has more appends)
        const merged = new Map();
        fromShareRows.forEach((d) => merged.set(String(extractId(d)), d));
        fromDocState.forEach((d) => merged.set(String(extractId(d)), d));
        return Array.from(merged.values());
      }
      return activeDocs;
    }, [
      companyDocs,
      documents,
      activeSpace,
      activeLegalReferenceId,
      legalStudySubtreeFolderIds,
      currentLawyerId,
      currentUserState,
      canViewTrashRecord,
      caseDocs,
      sharedWithMeDocs,
    ]);

    const visibleFolders = useMemo(() => {
      if (activeSpace === "trash") {
        return companyFolders.filter(
          (f) => f.isDeleted === true && canViewTrashRecord(f),
        );
      }
      if (activeSpace === "recent") {
        return [];
      }

      const activeFolders = companyFolders.filter((f) => !f.isDeleted);

      if (activeSpace === "company_shared") {
        return activeFolders.filter((f) => {
          const isShared =
            f.storageType === "company_shared" ||
            (!f.storageType &&
              !getRecordDocumentType(f) &&
              !getInternalTemplateRelationId(f) &&
              !getRecordLegalReferenceId(f));
          return isShared && f.storageType !== "legal_reference";
        });
      }
      if (activeSpace === KNOWLEDGE_STORAGE_TYPE) {
        return activeFolders.filter(
          (f) => f.storageType === KNOWLEDGE_STORAGE_TYPE,
        );
      }
      if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
        return caseFolders.filter(
          (f) =>
            !f.isDeleted &&
            legalStudySubtreeFolderIds.has(String(extractId(f))),
        );
      }
      if (activeSpace === "legal_reference") {
        return activeFolders.filter((f) => {
          return (
            String(getRecordLegalReferenceId(f)) ===
            String(activeLegalReferenceId)
          );
        });
      }
      if (activeSpace === "customer") {
        return caseFolders.filter((f) => !f.isDeleted);
      }
      if (activeSpace === MY_DOCUMENT_STORAGE_TYPE) {
        const currentUserId = String(
          extractId(currentUserState?.id) || getCurrentUserId() || "",
        );
        if (!currentUserId) return [];
        return folders.filter((f) => {
          if (f.isDeleted) return false;
          return (
            f.storageType === MY_DOCUMENT_STORAGE_TYPE &&
            String(extractId(f.createdById) || "") === currentUserId
          );
        });
      }
      if (activeSpace === "shared_with_me") {
        return [];
      }
      return activeFolders;
    }, [
      companyFolders,
      folders,
      activeSpace,
      activeLegalReferenceId,
      legalStudySubtreeFolderIds,
      canViewTrashRecord,
      caseFolders,
      currentUserState,
    ]);

    // Permission-filtered: hide folders the current user has no access to.
    // Computes two things from a single getVisibleFolderIds() pass:
    //  - `folders`: filtered with the widened `accessible` set, which includes
    //    ancestor-only folders so the navigation tree isn't broken.
    //  - `entitledFolderIds`: the pre-ancestor-cascade `entitled` set (direct
    //    grant or descendant of one), stringified for id lookups. Document
    //    visibility is gated by THIS set, never by the folder list above —
    //    otherwise an ancestor-only folder (visible purely so the user can
    //    click through it) would also leak the files placed directly in it.
    //    `null` means "no restriction applies" (trash / user not loaded /
    //    admin), matching the early-returns in permissionFilteredDocs.
    const permissionScopedFolders = useMemo(() => {
      const unrestricted = { folders: visibleFolders, entitledFolderIds: null };
      if (activeSpace === "trash") return unrestricted;
      const currentUser = currentUserState;
      if (!currentUser) return unrestricted; // not yet loaded → show all (will re-filter after loadData)
      if (isAdminUser(currentUser)) return unrestricted;
      const { accessible, entitled } = getVisibleFolderIds(
        visibleFolders,
        currentUser,
        currentLawyerId,
      );
      return {
        folders: visibleFolders.filter((f) => accessible.has(extractId(f.id))),
        entitledFolderIds: new Set(
          Array.from(entitled)
            .filter(Boolean)
            .map((id) => String(id)),
        ),
      };
    }, [visibleFolders, currentUserState, currentLawyerId, activeSpace]);

    const permissionFilteredFolders = permissionScopedFolders.folders;
    const entitledFolderIds = permissionScopedFolders.entitledFolderIds;

    // Permission-filtered docs: only show docs whose folder the user is
    // actually entitled to (or root-level docs)
    const permissionFilteredDocs = useMemo(() => {
      if (activeSpace === "trash") return visibleDocs;
      const currentUser = currentUserState;
      if (!currentUser) return visibleDocs;
      if (isAdminUser(currentUser)) return visibleDocs;
      const accessibleFolderIds = entitledFolderIds || new Set();
      const currentUserId = String(extractId(currentUser.id) || "");
      return visibleDocs.filter((doc) => {
        const fId = String(extractId(doc.folderId) || "");
        if (isRecordSharedWithUser(doc, currentUser)) return true;
        // Owner bypass: a folder's own entitlement can require an explicit
        // grant the uploader doesn't hold on that exact folder (e.g. upload
        // permission there came from inherited/manager rights via
        // getFolderPermissions, not a direct grant row) — without this, the
        // uploader's own file would vanish from their own view right after
        // upload, even though canCreate() already let them upload there.
        if (
          currentUserId &&
          (String(extractId(doc.createdById) || "") === currentUserId ||
            String(extractId(doc.uploadedById) || "") === currentUserId)
        )
          return true;
        // Root-level docs: visible to all company members except in Knowledge space
        // (Knowledge root-level docs require explicit share — admin already passed above)
        if (!fId) return activeSpace !== KNOWLEDGE_STORAGE_TYPE;
        return accessibleFolderIds.has(fId);
      });
    }, [visibleDocs, entitledFolderIds, currentUserState, activeSpace]);

    const getFolderPermsById = useCallback(
      (folderId, space = activeSpace) => {
        const normalizedFolderId = normalizeParentId(folderId);
        const currentUser = currentUserState;
        if (!currentUser) return roleToPerms(null);
        if (!normalizedFolderId) {
          if (space === MY_DOCUMENT_STORAGE_TYPE) return roleToPerms("owner");
          return isAdminUser(currentUser)
            ? roleToPerms("admin")
            : roleToPerms("viewer");
        }
        const folder = visibleFolders.find(
          (item) =>
            String(extractId(item.id)) === String(normalizedFolderId),
        );
        if (!folder) return roleToPerms(null);
        return getFolderPermissions(
          folder,
          currentUser,
          visibleFolders,
          currentLawyerId,
        );
      },
      [activeSpace, currentLawyerId, currentUserState, visibleFolders],
    );

    // Current folder permissions for the selected folder
    const currentFolderPerms = useMemo(
      () => getFolderPermsById(selectedFolderId),
      [getFolderPermsById, selectedFolderId],
    );

    const getRecordPerms = useCallback(
      (record) => {
        const currentUser = currentUserState;
        if (!currentUser) return roleToPerms(null);
        if (isAdminUser(currentUser)) return roleToPerms("admin");
        if (record._type === "folder") {
          return getFolderPermissions(
            record,
            currentUser,
            visibleFolders,
            currentLawyerId,
          );
        }
        const parentFolderId = extractId(record.folderId);
        const parentFolder = visibleFolders.find(
          (folder) =>
            String(extractId(folder.id)) === String(parentFolderId || ""),
        );
        if (parentFolder) {
          return getFilePermissions(
            record,
            parentFolder,
            currentUser,
            visibleFolders,
            currentLawyerId,
          );
        }
        if (
          activeSpace === "trash" &&
          [record.createdById, record.uploadedById]
            .map(extractId)
            .filter(Boolean)
            .some((id) => String(id) === String(extractId(currentUser.id)))
        ) {
          return roleToPerms("owner");
        }
        return getFolderPermsById("root");
      },
      [
        activeSpace,
        currentLawyerId,
        currentUserState,
        getFolderPermsById,
        visibleFolders,
      ],
    );

    const folderMap = useMemo(() => {
      const map = new Map();
      permissionFilteredFolders.forEach((folder) =>
        map.set(String(extractId(folder)), folder),
      );
      return map;
    }, [permissionFilteredFolders]);

    const getDescendantIds = useCallback(
      (folderId) => {
        const id = String(extractId(folderId));
        let ids = [id];
        permissionFilteredFolders
          .filter((folder) => String(getFolderParentId(folder)) === id)
          .forEach((child) => {
            ids = ids.concat(getDescendantIds(extractId(child)));
          });
        return ids;
      },
      [permissionFilteredFolders],
    );

    const getFolderSize = useCallback(
      (folderId) => {
        const descIds = getDescendantIds(folderId);
        const filesInFolder = documents.filter((d) =>
          descIds.includes(String(extractId(d.folderId))),
        );
        let totalSize = 0;
        filesInFolder.forEach((d) => {
          const att = getAttachment(d);
          if (att && att.size) totalSize += parseInt(att.size, 10);
        });
        return totalSize;
      },
      [getDescendantIds, documents],
    );

    const breadcrumbs = useMemo(() => {
      const buildFolderPath = (baseItems) => {
        if (selectedFolderId === "root") return baseItems;
        const path = [];
        let current = folderMap.get(String(selectedFolderId));
        while (current) {
          path.unshift({
            id: String(extractId(current)),
            name: current.name || "Folder",
          });
          current = folderMap.get(String(getFolderParentId(current)));
        }
        return baseItems.concat(path);
      };

      if (activeSpace === "customer") {
        if (!activeCustomerId)
          return [{ id: "customer_gallery", name: "Customer" }];
        const cust = customers.find(
          (c) => String(extractId(c)) === String(activeCustomerId),
        );
        const custName = cust ? getCustomerDisplayName(cust) : "Customer";
        if (!activeCaseId) {
          return [
            { id: "customer_gallery", name: "Customer" },
            { id: "case_gallery", name: custName },
          ];
        }
        // 🌟 selectedFolderId ở đây luôn là ID folder Case thật (không còn
        // sentinel "root" nữa, vì gallery gộp nhảy thẳng vào folder Case) —
        // buildFolderPath tự trả về đúng tên folder Case (vd "C003072026 -
        // Case 1") từ chuỗi cha con thật. Không cần thêm node ảo tên Case
        // (caseRec.projectName) ở đây nữa, tránh lặp 2 cấp cùng đại diện 1
        // Case (vd "Case 1" rồi lại "C003072026 - Case 1").
        return buildFolderPath([
          { id: "customer_gallery", name: "Customer" },
          { id: "case_gallery", name: custName },
        ]);
      }

      if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
        // 🌟 Gallery gốc là danh sách flat các Case có folder Legal Study
        // (xem legalStudyEntities) — không có bước chọn Customer trung
        // gian, nên breadcrumb đi thẳng từ "Legal Study" vào tên Case.
        if (!activeCustomerId || !activeCaseId)
          return [{ id: "legal_study_gallery", name: LEGAL_STUDY_LABEL }];
        // 🌟 selectedFolderId ở đây luôn là ID folder Legal Study thật
        // (không còn sentinel "root" — xem effect tự nhảy vào folder + click
        // card gallery đều set thẳng bằng id thật), nên buildFolderPath tự
        // trả về đúng tên folder Legal Study từ chuỗi cha con thật. Trước
        // đây có node ảo tên Case dùng id "root" — vừa gây lặp tên ("dasdasd"
        // rồi lại "Legal Study"), vừa khiến click vào node đó gọi
        // setSelectedFolderId("root") bị effect tự nhảy folder ghi đè ngay
        // lập tức. Giờ vẫn giữ node mô tả Case/Khách hàng liên quan (đúng
        // format với card gallery: caseCode - shortName - projectName) để
        // biết đang xem Legal Study của Case nào, nhưng gán id "case_info"
        // (không phải "root") và xử lý riêng trong handleBreadcrumbClick
        // thành no-op — chỉ mang tính mô tả, không phải điểm điều hướng.
        const caseRec = projects.find(
          (p) => String(extractId(p)) === String(activeCaseId),
        );
        const customerRec = customers.find(
          (c) => String(extractId(c)) === String(activeCustomerId),
        );
        const caseInfoLabel = caseRec
          ? [
              caseRec.caseCode,
              customerRec?.shortName || (customerRec ? getCustomerDisplayName(customerRec) : ""),
              caseRec.projectName,
            ]
              .filter(Boolean)
              .join(" - ")
          : "";
        const baseItems = [{ id: "legal_study_gallery", name: LEGAL_STUDY_LABEL }];
        if (caseInfoLabel) baseItems.push({ id: "case_info", name: caseInfoLabel });
        return buildFolderPath(baseItems);
      }

      if (activeSpace === "company_shared") {
        const rootName = activeCompany
          ? getCompanyName(activeCompany)
          : "Shared Folder";
        return buildFolderPath([{ id: "root", name: rootName }]);
      }

      if (activeSpace === "legal_reference") {
        const items = activeLegalReference
          ? [
              { id: "legal_reference_root", name: "Home" },
              {
                id: "root",
                name: getLegalReferenceDisplayName(activeLegalReference),
              },
            ]
          : [{ id: "legal_reference_root", name: "Home" }];
        return buildFolderPath(items);
      }

      const rootNameMap = {
        [MY_DOCUMENT_STORAGE_TYPE]: "My Documents",
        [KNOWLEDGE_STORAGE_TYPE]: "Knowledge",
        shared_with_me: "Shared with me",
        recent: "Activity History",
        trash: "Trash",
      };
      const rootName = rootNameMap[activeSpace] || "Home";
      return buildFolderPath([{ id: "root", name: rootName }]);
    }, [
      folderMap,
      selectedFolderId,
      activeSpace,
      activeCompany,
      activeLegalReference,
      activeCustomerId,
      activeCaseId,
      customers,
      projects,
    ]);

    const handleBreadcrumbClick = useCallback((item) => {
      if (item.id === "customer_gallery") {
        setActiveCustomerId(null);
        setActiveCaseId(null);
        setSelectedFolderId("root");
        return;
      }
      if (item.id === "case_gallery") {
        setActiveCaseId(null);
        setSelectedFolderId("root");
        return;
      }
      if (item.id === "legal_reference_root") {
        setActiveLegalReferenceId(null);
        setSelectedFolderId("root");
        return;
      }
      if (item.id === "legal_study_gallery") {
        setActiveCustomerId(null);
        setActiveCaseId(null);
        setSelectedFolderId("root");
        return;
      }
      if (item.id === "case_info") {
        // Node mô tả Case/Khách hàng liên quan — chỉ mang tính thông tin,
        // không phải điểm điều hướng thật (không có "root" của riêng nó).
        return;
      }
      setSelectedFolderId(item.id);
    }, []);

    const sortDocs = useCallback(
      (items) => {
        const list = [...items];
        if (sortMode === "newest")
          return list.sort(
            (a, b) => new Date(getDocDate(b) || 0) - new Date(getDocDate(a) || 0),
          );
        if (sortMode === "oldest")
          return list.sort(
            (a, b) => new Date(getDocDate(a) || 0) - new Date(getDocDate(b) || 0),
          );
        if (sortMode === "name")
          return list.sort((a, b) =>
            getDocTitle(a).localeCompare(getDocTitle(b), "vi"),
          );
        return list.sort((a, b) => {
          const ai = Number(a.fileIndex) || 0;
          const bi = Number(b.fileIndex) || 0;
          if (ai && bi && ai !== bi) return ai - bi;
          if (ai && !bi) return -1;
          if (!ai && bi) return 1;
          return sortByCreatedAt(a, b);
        });
      },
      [sortMode],
    );

    const tableData = useMemo(() => {
      const q = query.trim().toLowerCase();
      const currentFolderKey =
        selectedFolderId === "root" ? "root" : String(selectedFolderId);
      const isSearching = !!q;

      if (activeSpace === "trash") {
        const folderItems = permissionFilteredFolders.map((folder) => ({
          ...folder,
          _type: "folder",
          _key: `folder_${extractId(folder)}`,
        }));
        const docItems = permissionFilteredDocs.map((doc) => ({
          ...doc,
          _type: "file",
          _key: `file_${extractId(doc)}`,
        }));
        let rows = [...folderItems, ...docItems];
        if (isSearching) {
          rows = rows.filter((r) => {
            if (r._type === "folder") {
              return (r.name || "").toLowerCase().includes(q);
            } else {
              const title = getDocTitle(r);
              return `${title} ${r.description || ""} ${getDocCode(r)} ${getRecordDocumentType(r) || r.documentType || ""}`
                .toLowerCase()
                .includes(q);
            }
          });
        }
        return rows.sort(
          (a, b) =>
            new Date(b.deletedAt || b.updatedAt || 0) -
            new Date(a.deletedAt || a.updatedAt || 0),
        );
      }

      if (activeSpace === "legal_reference" && !activeLegalReferenceId) {
        let rows = filteredLegalReferences;
        if (isSearching) {
          rows = rows.filter((r) =>
            `${r.referenceCode || ""} ${r.title || ""} ${r.description || ""}`
              .toLowerCase()
              .includes(q),
          );
        }
        return rows.map((r) => ({
          ...r,
          _type: "legal_reference_record",
          _key: `ref_${extractId(r)}`,
        }));
      }

      let folderRows = [];
      let docRows = [];

      if (isSearching) {
        const allowedFolderIds =
          selectedFolderId === "root"
            ? null
            : new Set(getDescendantIds(selectedFolderId));
        folderRows = permissionFilteredFolders.filter((folder) => {
          const folderId = String(extractId(folder));
          if (allowedFolderIds && !allowedFolderIds.has(folderId)) return false;
          return String(folder.name || "")
            .toLowerCase()
            .includes(q);
        });
        docRows = permissionFilteredDocs.filter((doc) => {
          const folderId = String(extractId(doc.folderId) || "");
          if (allowedFolderIds && !allowedFolderIds.has(folderId)) return false;
          const text =
            `${getDocTitle(doc)} ${doc.description || ""} ${getDocCode(doc)} ${getRecordDocumentType(doc) || doc.documentType || ""}`.toLowerCase();
          return text.includes(q);
        });
      } else {
        folderRows = permissionFilteredFolders.filter((folder) => {
          const parentId = getFolderParentId(folder);
          if (currentFolderKey === "root")
            return !parentId || !folderMap.has(String(parentId));
          return String(parentId || "") === currentFolderKey;
        });
        docRows = permissionFilteredDocs.filter((doc) => {
          const folderId = extractId(doc.folderId);
          if (currentFolderKey === "root")
            return !folderId || !folderMap.has(String(folderId));
          return String(folderId || "") === currentFolderKey;
        });
      }

      if (selectedExt && selectedExt !== "all") {
        docRows = docRows.filter((doc) => {
          const ext = getFileExtension(doc).replace(".", "").toLowerCase();
          return ext === selectedExt;
        });
      }

      const folderItems = [...folderRows].sort(sortByCreatedAt).map((folder) => ({
        ...folder,
        _type: "folder",
        _key: `folder_${extractId(folder)}`,
      }));

      const docItems = sortDocs(docRows).map((doc, index) => ({
        ...doc,
        _type: "file",
        _key: `file_${extractId(doc)}`,
        _displayFileIndex: index + 1,
      }));

      return [...folderItems, ...docItems];
    }, [
      query,
      selectedFolderId,
      permissionFilteredFolders,
      permissionFilteredDocs,
      folderMap,
      getDescendantIds,
      sortDocs,
      getRecordDocumentType,
      selectedExt,
    ]);

    const canBulkSelectRecord = useCallback(
      (record) => {
        if (!record || record._type === "legal_reference_record") return false;
        // System-generated template folders (Legal Study, LSC & Related,
        // Legal docs, Legal dossiers, Report and Result) are not editable
        // or deletable by default — same rule as the individual rename
        // lock (isRenameLockedFolder), extended here to bulk move/delete.
        if (activeSpace !== "trash" && isRenameLockedFolder(record)) return false;
        const permissions = getRecordPerms(record);
        if (activeSpace === "trash") {
          return permissions.canDelete;
        }
        return (
          (currentFolderPerms.canMove && permissions.canMove) ||
          (currentFolderPerms.canDelete && permissions.canDelete)
        );
      },
      [activeSpace, currentFolderPerms, getRecordPerms],
    );

    const bulkSelectableKeys = useMemo(
      () =>
        new Set(
          tableData
            .filter(canBulkSelectRecord)
            .map((record) => String(record._key)),
        ),
      [canBulkSelectRecord, tableData],
    );

    const bulkRowSelection = useMemo(() => {
      if (isLegalReferenceRoot || bulkSelectableKeys.size === 0) return undefined;
      return {
        selectedRowKeys,
        onChange: (keys) =>
          setSelectedRowKeys(
            keys.filter((key) => bulkSelectableKeys.has(String(key))),
          ),
        getCheckboxProps: (record) => ({
          disabled: !canBulkSelectRecord(record),
        }),
      };
    }, [
      bulkSelectableKeys,
      canBulkSelectRecord,
      isLegalReferenceRoot,
      selectedRowKeys,
    ]);

    useEffect(() => {
      setSelectedRowKeys((previousKeys) => {
        const allowedKeys = previousKeys.filter((key) =>
          bulkSelectableKeys.has(String(key)),
        );
        return allowedKeys.length === previousKeys.length
          ? previousKeys
          : allowedKeys;
      });
    }, [bulkSelectableKeys]);

    const getBulkRecordsWithPermission = useCallback(
      (permission, actionLabel) => {
        const hasContextPermission =
          activeSpace === "trash"
            ? permission === "canDelete"
            : Boolean(currentFolderPerms[permission]);
        const records = selectedRowKeys
          .map((key) => tableData.find((record) => record._key === key))
          .filter(Boolean);
        if (
          !hasContextPermission ||
          records.length !== selectedRowKeys.length ||
          records.some((record) => !canBulkSelectRecord(record)) ||
          records.some((record) => !getRecordPerms(record)[permission])
        ) {
          message.warning(
            `You do not have permission to ${actionLabel} one or more selected items`,
          );
          setSelectedRowKeys([]);
          return null;
        }
        return records;
      },
      [
        activeSpace,
        canBulkSelectRecord,
        currentFolderPerms,
        getRecordPerms,
        selectedRowKeys,
        tableData,
      ],
    );

    const selectedBulkRecords = useMemo(
      () =>
        selectedRowKeys
          .map((key) => tableData.find((record) => record._key === key))
          .filter(Boolean),
      [selectedRowKeys, tableData],
    );
    const canBulkMoveSelected =
      selectedBulkRecords.length > 0 &&
      currentFolderPerms.canMove &&
      selectedBulkRecords.every(canBulkSelectRecord) &&
      selectedBulkRecords.every((record) => getRecordPerms(record).canMove);
    const canBulkDeleteSelected =
      selectedBulkRecords.length > 0 &&
      (activeSpace === "trash" || currentFolderPerms.canDelete) &&
      selectedBulkRecords.every(canBulkSelectRecord) &&
      selectedBulkRecords.every((record) => getRecordPerms(record).canDelete);
    const hasAuthorizedBulkSelection =
      selectedBulkRecords.length === selectedRowKeys.length &&
      selectedBulkRecords.length > 0 &&
      selectedBulkRecords.every(canBulkSelectRecord);

    const getDropTargetStyle = useCallback(
      (record) => {
        if (externalDropTargetKey === record._key) {
          return {
            background: "#E6F1FB",
            outline: "2px dashed #185FA5",
            outlineOffset: -2,
          };
        }
        if (!dragState.sourceKey || dragState.targetKey !== record._key) return {};
        if (dragState.position === "inside") {
          return {
            background: "#E6F1FB",
            outline: "2px solid #185FA5",
            outlineOffset: 1,
          };
        }
        return {
          background: "#F0F7FF",
          boxShadow:
            dragState.position === "top"
              ? "inset 0 3px 0 #185FA5"
              : "inset 0 -3px 0 #185FA5",
        };
      },
      [dragState, externalDropTargetKey],
    );

    const companyRootFolders = useMemo(() => {
      return folders.filter((f) => {
        if (f.isDeleted) return false;
        if (!matchesInternalCompany(f, activeCompanyId)) return false;
        const isShared =
          f.storageType === "company_shared" ||
          (!f.storageType &&
            !getRecordDocumentType(f) &&
            !getInternalTemplateRelationId(f) &&
            !getRecordLegalReferenceId(f));
        if (!isShared) return false;
        const pId = getFolderParentId(f);
        if (pId && pId !== "root") return false;
        const currentUser = currentUserState;
        if (!currentUser) return true;
        if (isAdminUser(currentUser)) return true;
        const { accessible } = getVisibleFolderIds(
          folders,
          currentUser,
          currentLawyerId,
        );
        return accessible.has(extractId(f.id));
      });
    }, [folders, activeCompanyId, currentUserState, currentLawyerId]);

    const legalReferenceRootFolders = useMemo(() => {
      return folders.filter((f) => {
        if (f.isDeleted) return false;
        if (
          String(getRecordLegalReferenceId(f)) !== String(activeLegalReferenceId)
        )
          return false;
        const pId = getFolderParentId(f);
        if (pId && pId !== "root") return false;
        const currentUser = currentUserState;
        if (!currentUser) return true;
        if (isAdminUser(currentUser)) return true;
        const { accessible } = getVisibleFolderIds(
          folders,
          currentUser,
          currentLawyerId,
        );
        return accessible.has(extractId(f.id));
      });
    }, [folders, activeLegalReferenceId, currentUserState, currentLawyerId]);

    // Per-record map: refId → root folders (used in sidebar so each item shows its own folders independently)
    const legalReferenceRootFoldersByRecord = useMemo(() => {
      const map = {};
      const currentUser = currentUserState;
      const { accessible } =
        currentUser && !isAdminUser(currentUser)
          ? getVisibleFolderIds(folders, currentUser, currentLawyerId)
          : { accessible: null };
      folders.forEach((f) => {
        if (f.isDeleted) return;
        const refId = String(getRecordLegalReferenceId(f) || "");
        if (!refId) return;
        const pId = getFolderParentId(f);
        if (pId && pId !== "root") return;
        if (accessible && !accessible.has(extractId(f.id))) return;
        if (!map[refId]) map[refId] = [];
        map[refId].push(f);
      });
      return map;
    }, [folders, currentUserState, currentLawyerId]);

    // Sidebar search-filtered lists
    const filteredSidebarCustomers = useMemo(() => {
      let result = customers;
      const allowedCustomerIds = customerAccessScope.customerIds;
      if (allowedCustomerIds) {
        result = result.filter((customer) =>
          allowedCustomerIds.has(String(extractId(customer))),
        );
      }
      if (galleryCompanyFilter.length > 0) {
        result = result.filter((r) => {
          const cid = String(
            extractId(r.internalCompanyId) || extractId(r.internalCompany) || "",
          );
          return galleryCompanyFilter.includes(cid);
        });
      }
      if (sidebarSearch) {
        const q = sidebarSearch.toLowerCase();
        result = result.filter((c) =>
          getCustomerDisplayName(c).toLowerCase().includes(q),
        );
      }
      return result;
    }, [customers, sidebarSearch, galleryCompanyFilter, customerAccessScope]);

    const filteredSidebarCases = useMemo(() => {
      if (!sidebarSearch) return customerCases;
      const q = sidebarSearch.toLowerCase();
      return customerCases.filter((p) =>
        (p.projectName || p.caseCode || p.description || "")
          .toLowerCase()
        .includes(q),
      );
    }, [customerCases, sidebarSearch]);

    useEffect(() => {
      if (activeSpace !== "customer" || canOpenCustomerSpace) return;
      setActiveSpace(KNOWLEDGE_STORAGE_TYPE);
      setActiveCustomerId(null);
      setActiveCaseId(null);
      setSelectedFolderId("root");
    }, [activeSpace, canOpenCustomerSpace]);

    useEffect(() => {
      if (activeSpace !== "customer") return;
      const allowedCustomerIds = customerAccessScope.customerIds;
      const allowedCaseIds = customerAccessScope.caseIds;
      if (
        activeCustomerId &&
        allowedCustomerIds &&
        !allowedCustomerIds.has(String(activeCustomerId))
      ) {
        setActiveCustomerId(null);
        setActiveCaseId(null);
        setSelectedFolderId("root");
        return;
      }
      if (
        activeCaseId &&
        allowedCaseIds &&
        !allowedCaseIds.has(String(activeCaseId))
      ) {
        setActiveCaseId(null);
        setSelectedFolderId("root");
      }
    }, [activeSpace, activeCustomerId, activeCaseId, customerAccessScope]);

    // Module access must be independent from activeSpace; otherwise Shared with me can
    // accidentally toggle sidebar modules while the user switches views.
    const documentModuleAccessScope = useMemo(() => {
      if (isAdmin) return { legalRefIds: null };

      const currentUser = currentUserState;
      const legalRefIds = new Set();
      if (!currentUser) return { legalRefIds };

      const activeFolders = folders.filter((folder) => !folder?.isDeleted);
      const folderById = new Map();
      activeFolders.forEach((folder) => {
        const folderId = extractId(folder);
        if (folderId) folderById.set(String(folderId), folder);
      });
      const resolveFolderLinkedId = (folder, getLinkedId) => {
        let current = folder;
        const visited = new Set();
        while (current) {
          const linkedId = getLinkedId(current);
          if (linkedId) return linkedId;

          const parentId = getFolderParentId(current);
          if (!parentId || parentId === "root") return null;
          const key = String(parentId);
          if (visited.has(key)) return null;
          visited.add(key);
          current = folderById.get(key);
        }
        return null;
      };
      const { accessible, entitled } = getVisibleFolderIds(
        activeFolders,
        currentUser,
        currentLawyerId,
      );
      const accessibleFolderIds = new Set(
        Array.from(accessible).filter(Boolean).map((id) => String(id)),
      );
      // Folder-derived module access may use the widened set (an
      // ancestor-only folder is still navigable), but the document-derived
      // path below must use the narrow `entitled` set so files sitting
      // directly inside an ancestor-only folder don't grant module access.
      const docEntitledFolderIds = new Set(
        Array.from(entitled).filter(Boolean).map((id) => String(id)),
      );
      const currentUserId = String(extractId(currentUser.id) || "");

      const canAccessDocument = (doc) => {
        if (!doc || doc.isDeleted) return false;
        if (isRecordSharedWithUser(doc, currentUser)) return true;

        const folderId = extractId(doc.folderId);
        if (folderId && docEntitledFolderIds.has(String(folderId))) return true;

        return (
          currentUserId &&
          (String(extractId(doc.createdById) || "") === currentUserId ||
            String(extractId(doc.uploadedById) || "") === currentUserId)
        );
      };

      activeFolders.forEach((folder) => {
        const folderId = extractId(folder);
        if (!folderId || !accessibleFolderIds.has(String(folderId))) return;

        const legalRefId = resolveFolderLinkedId(folder, getRecordLegalReferenceId);
        if (legalRefId) legalRefIds.add(String(legalRefId));
      });

      const allDocsMap = new Map();
      [...documents, ...sharedWithMeDocs].forEach((doc) => {
        const docId = extractId(doc);
        if (docId) allDocsMap.set(String(docId), doc);
      });

      allDocsMap.forEach((doc) => {
        if (!canAccessDocument(doc)) return;

        const folderId = extractId(doc.folderId);
        const parentFolder = folderId ? folderById.get(String(folderId)) : null;
        const legalRefId =
          getRecordLegalReferenceId(doc) ||
          resolveFolderLinkedId(parentFolder, getRecordLegalReferenceId);
        if (legalRefId) legalRefIds.add(String(legalRefId));
      });

      return { legalRefIds };
    }, [
      isAdmin,
      currentUserState,
      currentLawyerId,
      folders,
      documents,
      sharedWithMeDocs,
    ]);

    // For non-admin: only show records where the user has accessible folders/files.
    const accessibleLegalRefIds = documentModuleAccessScope.legalRefIds;
    const canOpenLegalReferenceSpace =
      isAdmin || Boolean(accessibleLegalRefIds && accessibleLegalRefIds.size > 0);
    // 🌟 Quyền mở không gian Legal Study phụ thuộc việc user có truy cập
    // được ít nhất 1 Case có folder "legal_study" hay không (xem
    // legalStudyEntities) — không còn dùng chung điều kiện với "customer".
    // Trong lúc dữ liệu (customerCaseFolders) chưa load xong, tạm coi là
    // true để tránh nút "Legal Study" bị ẩn/hiện chớp nháy ở lần render đầu.
    const canOpenLegalStudySpace =
      !currentUserState || isAdmin || legalStudyEntities.length > 0;

    useEffect(() => {
      if (activeSpace === "legal_reference" && !canOpenLegalReferenceSpace) {
        setActiveSpace(KNOWLEDGE_STORAGE_TYPE);
        setActiveLegalReferenceId(null);
        setSelectedFolderId("root");
        return;
      }
      if (
        activeSpace === LEGAL_STUDY_STORAGE_TYPE &&
        !canOpenLegalStudySpace
      ) {
        setActiveSpace(KNOWLEDGE_STORAGE_TYPE);
        setActiveCustomerId(null);
        setActiveCaseId(null);
        setSelectedFolderId("root");
      }
    }, [activeSpace, canOpenLegalReferenceSpace, canOpenLegalStudySpace]);

    useEffect(() => {
      if (
        activeSpace === "legal_reference" &&
        activeLegalReferenceId &&
        accessibleLegalRefIds &&
        !accessibleLegalRefIds.has(String(activeLegalReferenceId))
      ) {
        setActiveLegalReferenceId(null);
        setSelectedFolderId("root");
      }
    }, [activeSpace, activeLegalReferenceId, accessibleLegalRefIds]);

    const filteredSidebarLegalRefs = useMemo(() => {
      let result = legalReferences;
      // Non-admin: filter to only references with accessible folders/docs
      if (!isAdmin && accessibleLegalRefIds !== null) {
        result = result.filter((r) =>
          accessibleLegalRefIds.has(String(extractId(r))),
        );
      }
      if (galleryCompanyFilter.length > 0) {
        result = result.filter((r) => {
          const cid = String(
            extractId(r.internalCompanyId) || extractId(r.internalCompany) || "",
          );
          return galleryCompanyFilter.includes(cid);
        });
      }
      if (sidebarSearch) {
        const q = sidebarSearch.toLowerCase();
        result = result.filter((r) =>
          getLegalReferenceDisplayName(r).toLowerCase().includes(q),
        );
      }
      return result;
    }, [
      legalReferences,
      isAdmin,
      accessibleLegalRefIds,
      sidebarSearch,
      galleryCompanyFilter,
    ]);

    const treeData = useMemo(() => {
      const build = (parentId) =>
        permissionFilteredFolders
          .filter((folder) => {
            const pId = getFolderParentId(folder);
            return parentId === "root"
              ? !pId || !folderMap.has(String(pId))
              : String(pId || "") === String(parentId);
          })
          .sort(sortByCreatedAt)
          .map((folder) => ({
            title: folder.name || "Folder",
            value: String(extractId(folder)),
            key: String(extractId(folder)),
            children: build(extractId(folder)),
          }));

      let dynamicRootTitle = "Home";
      if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
        dynamicRootTitle = LEGAL_STUDY_LABEL;
      } else if (activeSpace === KNOWLEDGE_STORAGE_TYPE) {
        dynamicRootTitle = "Knowledge";
      } else if (activeSpace === "company_shared") {
        dynamicRootTitle = activeCompany
          ? getCompanyName(activeCompany)
          : "Shared Folder";
      } else if (activeSpace === "legal_reference") {
        dynamicRootTitle = activeLegalReference
          ? getLegalReferenceDisplayName(activeLegalReference)
          : DASHBOARD_CONFIG.label?.sidebar || "Reference";
      } else if (activeSpace === MY_DOCUMENT_STORAGE_TYPE) {
        dynamicRootTitle = "My Documents";
      } else if (activeSpace === "shared_with_me") {
        dynamicRootTitle = "Shared with me";
      }

      return [
        {
          title: dynamicRootTitle,
          value: "root",
          key: "root",
          children: build("root"),
        },
      ];
    }, [
      permissionFilteredFolders,
      folderMap,
      activeSpace,
      activeCompany,
      activeLegalReference,
    ]);

    const moveTreeData = useMemo(() => {
      if (!moveRecord || moveRecord._type !== "folder") return treeData;
      const excluded = new Set(getDescendantIds(extractId(moveRecord)));
      excluded.add(String(extractId(moveRecord)));
      const filterNodes = (nodes) =>
        nodes
          .filter((node) => !excluded.has(String(node.value)))
          .map((node) => ({
            ...node,
            children: filterNodes(node.children || []),
          }));
      return filterNodes(treeData);
    }, [moveRecord, treeData, getDescendantIds]);

    const requireCompany = () => {
      if (activeCompanyId) return true;
      message.warning("Please select an internal company first.");
      return false;
    };

    const resetCreateReferenceDraft = () => {
      createTemplateForm.resetFields();
      setCreateReferenceFiles([]);
      setCreateReferenceFolderFiles([]);
    };

    const loadUsersIfNeeded = useCallback(async () => {
      if (users.length > 0) return;
      try {
        const res = await ctx.api.request({
          url: "users:list",
          params: { pageSize: 500, sort: ["nickname", "username"] },
        });
        setUsers(res?.data?.data || []);
      } catch {}
    }, [users.length]);

    const openCreateViewByUid = useCallback(async (uid, fallbackUrl, params = {}) => {
      const normalizedParams = {};
      Object.keys(params || {}).forEach((key) => {
        const value = params[key];
        if (value !== undefined && value !== null && value !== "") {
          normalizedParams[key] = value;
        }
      });

      const defineProperties = {};
      Object.keys(normalizedParams).forEach((key) => {
        defineProperties[key] = {
          value: normalizedParams[key],
          writable: true,
          enumerable: true,
          configurable: true,
        };
      });

      if (typeof ctx.openView === "function") {
        try {
          const result = ctx.openView(uid, {
            navigation: false,
            inputArgs: normalizedParams,
            params: normalizedParams,
            defineProperties,
            ...normalizedParams,
          });
          if (result?.then) await result;
          return true;
        } catch (error) {
          console.warn("[Library] ctx.openView failed", error);
        }
      }

      try {
        let targetUrl = fallbackUrl;
        if (typeof URL !== "undefined" && fallbackUrl) {
          const url = new URL(fallbackUrl);
          Object.keys(normalizedParams).forEach((key) => {
            url.searchParams.set(key, String(normalizedParams[key]));
          });
          targetUrl = url.toString();
        }
        if (targetUrl && typeof window !== "undefined" && typeof window.open === "function") {
          window.open(targetUrl, "_blank", "noopener,noreferrer");
          return true;
        }
      } catch (error) {
        console.warn("[Library] popup fallback failed", error);
      }

      message.error("Cannot open configured popup view.");
      return false;
    }, []);

    const openCreateReferenceModal = async () => {
      if (!requireCompany()) return;
      const dataBlockUid = CASE_REFERENCE_DATA_BLOCK_UID;
      await openCreateViewByUid(CASE_REFERENCE_CREATE_POPUP_UID, CASE_REFERENCE_CREATE_VIEW_URL, {
        activeCompanyId: extractId(activeCompanyId),
        internalCompanyId: extractId(activeCompanyId),
        sourceBlockUid: dataBlockUid,
        targetBlockUid: dataBlockUid,
        dataBlockUid,
      });
    };

    const closeCreateReferenceModal = () => {
      setIsCreateTemplateOpen(false);
      resetCreateReferenceDraft();
    };

    const getNextFileIndex = useCallback(
      async (folderId, options = {}) => {
        const targetSpace = options.storageType || activeSpace;
        const targetCompanyId =
          options.internalCompanyId === undefined
            ? activeCompanyId
            : options.internalCompanyId;
        const targetLegalReferenceId =
          options.legalReferenceId === undefined
            ? activeLegalReferenceId
            : options.legalReferenceId;
        const parentId = normalizeParentId(folderId);
        try {
          const filter = {
            moduleScope: { $in: DASHBOARD_CONFIG.moduleScopes },
            internalCompanyId: { $eq: extractId(targetCompanyId) },
            ...(targetSpace === "legal_reference" && targetLegalReferenceId
              ? { legalReferenceId: { $eq: extractId(targetLegalReferenceId) } }
              : {}),
            ...(parentId ? { folderId: { $eq: parentId } } : {}),
          };
          const res = await ctx.api.request({
            url: "documents:list",
            params: {
              pageSize: 2000,
              filter: JSON.stringify(filter),
              sort: ["-fileIndex", "-createdAt"],
            },
          });
          const sameFolderDocs = (res?.data?.data || []).filter(
            (doc) =>
              String(extractId(doc.folderId) || "") === String(parentId || ""),
          );
          const maxIndex = sameFolderDocs.reduce(
            (max, doc) => Math.max(max, Number(doc.fileIndex) || 0),
            0,
          );
          return maxIndex + 1;
        } catch (e) {
          return 1;
        }
      },
      [activeCompanyId, activeLegalReferenceId, activeSpace],
    );

    const reindexFolderFiles = useCallback(
      async (folderId) => {
        const parentId = normalizeParentId(folderId);
        // Include caseDocs so reindexing works in customer space too
        const allDocs = [...documents, ...caseDocs];
        const items = allDocs
          .filter(
            (doc) =>
              matchesInternalCompany(doc, activeCompanyId) &&
              String(extractId(doc.folderId) || "") === String(parentId || ""),
          )
          .sort((a, b) => {
            const ai = Number(a.fileIndex) || 0;
            const bi = Number(b.fileIndex) || 0;
            if (ai !== bi) return ai - bi;
            return sortByCreatedAt(a, b);
          });
        await Promise.all(
          items
            .map((doc, index) =>
              Number(doc.fileIndex) === index + 1
                ? null
                : ctx.api.request({
                    url: `documents:update?filterByTk=${extractId(doc)}`,
                    method: "POST",
                    data: { fileIndex: index + 1 },
                  }),
            )
            .filter(Boolean),
        );
      },
      [documents, caseDocs, activeCompanyId],
    );

    const buildScopedPayload = useCallback(
      (targetSpace, targetLegalReferenceId = activeLegalReferenceId) => {
        if (targetSpace === "company_shared") {
          return {
            internalCompanyId: extractId(activeCompanyId),
            moduleScope: INTERNAL_TEMPLATE_MODULE_SCOPE,
          };
        }
        if (targetSpace === "legal_reference") {
          return {
            internalCompanyId: extractId(activeCompanyId),
            legalReferenceId: extractId(targetLegalReferenceId),
            moduleScope: "legal_reference",
          };
        }
        // 🌟 Legal Study không còn moduleScope/record riêng — chỉ là 1
        // nhánh trong cây tài liệu của Case, nên payload giống hệt nhánh
        // "customer" (folderId đã tự xác định đúng vị trí rồi).
        if (targetSpace === "customer" || targetSpace === LEGAL_STUDY_STORAGE_TYPE) {
          return {
            ...(activeCaseId
              ? {
                  projectId: extractId(activeCaseId),
                  caseId: extractId(activeCaseId),
                }
              : {}),
            ...(activeCustomerId
              ? { customerId: extractId(activeCustomerId) }
              : {}),
            ...(activeCompanyId
              ? { internalCompanyId: extractId(activeCompanyId) }
              : {}),
          };
        }
        if (targetSpace === MY_DOCUMENT_STORAGE_TYPE) {
          return { moduleScope: MY_DOCUMENT_STORAGE_TYPE };
        }
        if (targetSpace === KNOWLEDGE_STORAGE_TYPE) {
          return {
            internalCompanyId: extractId(activeCompanyId),
            moduleScope: KNOWLEDGE_STORAGE_TYPE,
          };
        }
        return buildScopePayload(activeCompanyId);
      },
      [activeCompanyId, activeLegalReferenceId, activeCaseId, activeCustomerId],
    );

    const uploadFilesToTarget = useCallback(
      async (selectedFiles, options = {}) => {
        const filesToUpload = Array.from(selectedFiles || []).filter(Boolean);
        if (!filesToUpload.length) return true;

        const targetSpace = options.storageType || activeSpace;
        const targetFolderId = normalizeParentId(
          options.folderId === undefined ? selectedFolderId : options.folderId,
        );
        const targetLegalReferenceId =
          options.legalReferenceId === undefined
            ? activeLegalReferenceId
            : options.legalReferenceId;

        if (
          !options.skipPermissionCheck &&
          !getFolderPermsById(targetFolderId, targetSpace).canCreate
        ) {
          message.warning("You do not have permission to upload documents to this folder");
          return false;
        }

        if (targetSpace !== MY_DOCUMENT_STORAGE_TYPE && !activeCompanyId) {
          message.warning("Please select an internal company first");
          return false;
        }

        setUploadLoading(true);
        try {
          const userId = getCurrentUserId();
          let nextIndex = await getNextFileIndex(targetFolderId, {
            storageType: targetSpace,
            legalReferenceId: targetLegalReferenceId,
          });

          const metadata = options.metadata || null;
          const applyTitleOverride = metadata?.title && filesToUpload.length === 1;

          for (let index = 0; index < filesToUpload.length; index++) {
            const file = filesToUpload[index];
            const attachment = await uploadAttachment(file, file.name);
            const nowIso = new Date().toISOString();
            const payload = {
              name: file.name,
              title: applyTitleOverride ? metadata.title : file.name,
              documentCode: metadata?.documentCode || "",
              fileIndex: nextIndex,
              fileAttachment: [{ id: attachment.id }],
              createdAt: nowIso,
              updatedAt: nowIso,
              uploadedAt: nowIso,
              uploaded_at: nowIso,
              storageType: targetSpace,
              ...(targetFolderId ? { folderId: targetFolderId } : {}),
              ...(userId
                ? {
                    uploadedById: userId,
                    createdById: userId,
                    updatedById: userId,
                  }
                : {}),
              ...(metadata
                ? {
                    documentType: metadata.documentType || "",
                    openingDate: metadata.openingDate || null,
                    signedAt: metadata.signedAt || null,
                    effectiveAt: metadata.effectiveAt || null,
                    senderName: metadata.senderName || "",
                    recipientName: metadata.recipientName || "",
                    description: metadata.description || "",
                  }
                : {}),
              ...buildScopedPayload(targetSpace, targetLegalReferenceId),
            };
            await createDocumentRecord(payload);
            nextIndex += 1;
          }

          if (options.successMessage !== false) {
            message.success(
              options.successMessage ||
                `Upload ${filesToUpload.length} file(s) successfully!`,
            );
          }
          if (options.refresh !== false) {
            loadData();
            if (activeSpace === "customer" || activeSpace === LEGAL_STUDY_STORAGE_TYPE)
              refreshCaseFolders();
          }
          return true;
        } catch (e) {
          console.error("Upload files failed:", e);
          if (options.errorMessage !== false) {
            message.error(options.errorMessage || "File upload failed");
          }
          return false;
        } finally {
          setUploadLoading(false);
        }
      },
      [
        activeCompanyId,
        activeLegalReferenceId,
        activeSpace,
        buildScopedPayload,
        getFolderPermsById,
        getNextFileIndex,
        refreshCaseFolders,
        selectedFolderId,
      ],
    );

    const uploadFolderFilesToTarget = useCallback(
      async (selectedFiles, options = {}) => {
        const filesToUpload = Array.from(selectedFiles || []).filter(Boolean);
        const explicitFolderPaths = Array.from(
          options.directoryPaths || [],
        ).filter(Boolean);
        if (!filesToUpload.length && !explicitFolderPaths.length) return true;

        const targetSpace = options.storageType || activeSpace;
        const targetFolderId = normalizeParentId(
          options.folderId === undefined ? bulkTargetId : options.folderId,
        );
        const targetLegalReferenceId =
          options.legalReferenceId === undefined
            ? activeLegalReferenceId
            : options.legalReferenceId;

        if (
          !options.skipPermissionCheck &&
          !getFolderPermsById(targetFolderId, targetSpace).canCreate
        ) {
          message.warning("You do not have permission to upload a folder to this location");
          return false;
        }
        const showProgress = options.showProgress !== false;

        if (targetSpace !== MY_DOCUMENT_STORAGE_TYPE && !activeCompanyId) {
          message.warning("Please select an internal company first");
          return false;
        }

        if (showProgress) {
          setBulkUploading(true);
          setBulkProgress("Analyzing folder structure...");
          setBulkPercent(5);
        }

        try {
          const folderIdMap = { "": targetFolderId };
          const folderPaths = new Set(explicitFolderPaths);
          filesToUpload.forEach((file) => {
            const relativePath = getUploadRelativePath(file);
            const parts = relativePath.split("/");
            parts.pop();
            let currentPath = "";
            parts.forEach((part) => {
              currentPath = currentPath ? `${currentPath}/${part}` : part;
              folderPaths.add(currentPath);
            });
          });

          const sortedPaths = Array.from(folderPaths).sort(
            (a, b) => a.split("/").length - b.split("/").length,
          );
          const userId = getCurrentUserId();
          const nowIso = new Date().toISOString();

          if (showProgress) {
            setBulkProgress(`Creating ${sortedPaths.length} folder(s)...`);
          }

          for (
            let folderIndex = 0;
            folderIndex < sortedPaths.length;
            folderIndex++
          ) {
            const path = sortedPaths[folderIndex];
            if (showProgress) {
              setBulkPercent(
                5 +
                  Math.round(
                    ((folderIndex + 1) / Math.max(sortedPaths.length, 1)) * 25,
                  ),
              );
            }
            const parts = path.split("/");
            const folderName = parts.pop();
            const parentPath = parts.join("/");
            const parentId = folderIdMap[parentPath] || null;

            const folderPayload = {
              name: folderName,
              type: "custom",
              createdAt: nowIso,
              updatedAt: nowIso,
              storageType: targetSpace,
              ...(parentId ? { parentId } : {}),
              ...(userId ? { createdById: userId, updatedById: userId } : {}),
              ...buildScopedPayload(targetSpace, targetLegalReferenceId),
            };

            const res = await createFolderRecord(folderPayload);
            folderIdMap[path] = extractId(res?.data?.data);
          }

          const fileIndexCache = {};
          const nextBulkIndex = async (folderId) => {
            const key = String(folderId || "root");
            if (fileIndexCache[key] === undefined) {
              fileIndexCache[key] = await getNextFileIndex(folderId, {
                storageType: targetSpace,
                legalReferenceId: targetLegalReferenceId,
              });
              return fileIndexCache[key];
            }
            fileIndexCache[key] += 1;
            return fileIndexCache[key];
          };

          for (let index = 0; index < filesToUpload.length; index++) {
            const file = filesToUpload[index];
            if (showProgress) {
              setBulkProgress(
                `Uploading file ${index + 1}/${filesToUpload.length}...`,
              );
              setBulkPercent(
                30 +
                  Math.round(
                    ((index + 1) / Math.max(filesToUpload.length, 1)) * 65,
                  ),
              );
            }
            const relativePath = getUploadRelativePath(file);
            const parts = relativePath.split("/");
            const fileName = parts.pop();
            const parentPath = parts.join("/");
            const resolvedFolderId = folderIdMap[parentPath] || targetFolderId;
            const attachment = await uploadAttachment(file, fileName);
            const fileNowIso = new Date().toISOString();

            const filePayload = {
              name: fileName,
              title: fileName,
              fileIndex: await nextBulkIndex(resolvedFolderId),
              fileAttachment: [{ id: attachment.id }],
              createdAt: fileNowIso,
              updatedAt: fileNowIso,
              uploadedAt: fileNowIso,
              uploaded_at: fileNowIso,
              storageType: targetSpace,
              ...(resolvedFolderId ? { folderId: resolvedFolderId } : {}),
              ...(userId
                ? {
                    uploadedById: userId,
                    createdById: userId,
                    updatedById: userId,
                  }
                : {}),
              ...buildScopedPayload(targetSpace, targetLegalReferenceId),
            };

            await createDocumentRecord(filePayload);
          }

          if (showProgress) {
            setBulkPercent(100);
          }
          if (options.successMessage !== false) {
            message.success(options.successMessage || "Folder upload complete!");
          }
          if (options.refresh !== false) {
            loadData();
            if (activeSpace === "customer" || activeSpace === LEGAL_STUDY_STORAGE_TYPE)
              refreshCaseFolders();
          }
          return true;
        } catch (e) {
          console.error("Upload folder failed:", e);
          if (options.errorMessage !== false) {
            message.error(options.errorMessage || "Folder upload failed");
          }
          return false;
        } finally {
          if (showProgress) {
            setBulkUploading(false);
            setBulkProgress("");
            setBulkPercent(0);
          }
        }
      },
      [
        activeCompanyId,
        activeLegalReferenceId,
        activeSpace,
        buildScopedPayload,
        bulkTargetId,
        getFolderPermsById,
        getNextFileIndex,
        refreshCaseFolders,
      ],
    );

    const handleCreateLegalReference = async (values) => {
      if (!requireCompany()) return;
      setCreateTemplateLoading(true);
      try {
        const userId = getCurrentUserId();
        const mergedCaseIds = [];
        if (values.caseIds && values.caseIds.length > 0) {
          values.caseIds.forEach((caseId) => {
            const numId = Number(caseId);
            if (!mergedCaseIds.includes(numId)) {
              mergedCaseIds.push(numId);
            }
          });
        }
        const payload = {
          title: values.title?.trim(),
          description: values.description?.trim() || "",
          internalCompanyId: extractId(
            values.internalCompanyId || activeCompanyId,
          ),
          cases: mergedCaseIds,
          priority: values.priority || null,
          status: values.status || null,
          ...(userId ? { createdById: userId, updatedById: userId } : {}),
        };
        const createRes = await createLegalReferenceRecord(payload);
        const createdReference = createRes?.data?.data || createRes?.data || null;
        const createdReferenceId = extractId(createdReference);

        let attachmentUploadFailed = false;
        if (
          (createReferenceFiles.length || createReferenceFolderFiles.length) &&
          !createdReferenceId
        ) {
          attachmentUploadFailed = true;
          message.warning(
            "Case Study was created, but its ID could not be detected for document upload.",
          );
        }
        if (createdReferenceId && createReferenceFiles.length) {
          const uploadOk = await uploadFilesToTarget(createReferenceFiles, {
            storageType: "legal_reference",
            legalReferenceId: createdReferenceId,
            folderId: "root",
            skipPermissionCheck: true,
            refresh: false,
            successMessage: false,
            errorMessage: "Upload file for Case Study failed",
          });
          if (!uploadOk) attachmentUploadFailed = true;
        }
        if (createdReferenceId && createReferenceFolderFiles.length) {
          const uploadOk = await uploadFolderFilesToTarget(
            createReferenceFolderFiles,
            {
              storageType: "legal_reference",
              legalReferenceId: createdReferenceId,
              folderId: "root",
              skipPermissionCheck: true,
              refresh: false,
              showProgress: false,
              successMessage: false,
              errorMessage: "Upload folder for Case Study failed",
            },
          );
          if (!uploadOk) attachmentUploadFailed = true;
        }
        if (attachmentUploadFailed) {
          message.warning(
            "Case Study was created, but some documents failed to upload.",
          );
        } else {
          message.success("Case Study created successfully.");
        }
        closeCreateReferenceModal();
        loadData();
      } catch (e) {
        console.error(e);
        message.error("Create Case Study failed.");
      } finally {
        setCreateTemplateLoading(false);
      }
    };

    const handleEditTemplateSubmit = async (values) => {
      if (!editTemplateRecord) return;
      setEditTemplateLoading(true);
      try {
        const newTitle = values.title?.trim();
        const rId = extractId(editTemplateRecord);
        const candidates = [
          `legalReference:update?filterByTk=${rId}`,
          `legalReferences:update?filterByTk=${rId}`,
          `LegalReference:update?filterByTk=${rId}`,
        ];
        let success = false;
        let lastError = null;
        for (const url of candidates) {
          try {
            await ctx.api.request({
              url,
              method: "POST",
              data: { title: newTitle },
            });
            success = true;
            break;
          } catch (e) {
            lastError = e;
          }
        }
        if (!success) {
          throw lastError || new Error("Failed to update case title");
        }
        message.success("Case Study updated successfully!");
        setEditTemplateRecord(null);
        editTemplateForm.resetFields();
        loadData();
      } catch (e) {
        message.error("Update failed");
      } finally {
        setEditTemplateLoading(false);
      }
    };

    const openLegalReferenceDetail = useCallback((recordOrId) => {
      const refId = String(extractId(recordOrId) || "");
      if (!refId) return;
      setActiveSpace("legal_reference");
      setActiveLegalReferenceId(refId);
      setSelectedFolderId("root");
    }, []);

    const openLinkCaseModal = useCallback(
      (record) => {
        if (!record) return;
        const linkedIds = (record.cases || []).map((item) =>
          String(extractId(item)),
        );
        setLinkCaseRecord(record);
        linkCaseForm.resetFields();
        linkCaseForm.setFieldsValue({ caseIds: linkedIds });
        setIsLinkCaseOpen(true);
      },
      [linkCaseForm],
    );

    const handleLinkCaseSubmit = async (values) => {
      setLinkCaseLoading(true);
      try {
        const targetLegalReferenceId = String(
          extractId(linkCaseRecord) || activeLegalReferenceId || "",
        );
        if (!targetLegalReferenceId) {
          message.warning("Please select a Case Study to link");
          return;
        }
        const payload = {
          cases: (values.caseIds || []).map((caseId) => Number(caseId)),
        };
        const candidates = [
          `legalReference:update?filterByTk=${targetLegalReferenceId}`,
          `legalReferences:update?filterByTk=${targetLegalReferenceId}`,
          `LegalReference:update?filterByTk=${targetLegalReferenceId}`,
        ];
        let success = false;
        let lastError = null;
        for (const url of candidates) {
          try {
            await ctx.api.request({
              url,
              method: "POST",
              data: payload,
            });
            success = true;
            break;
          } catch (e) {
            lastError = e;
          }
        }
        if (!success) {
          throw lastError || new Error("Failed to update case links");
        }
        message.success("Case links updated successfully");
        setIsLinkCaseOpen(false);
        setLinkCaseRecord(null);
        linkCaseForm.resetFields();
        loadData();
      } catch (e) {
        console.error("Error linking case:", e);
        message.error("Error linking case");
      } finally {
        setLinkCaseLoading(false);
      }
    };

    const handleCreateFolder = async (values) => {
      if (!getFolderPermsById(selectedFolderId).canCreate) {
        message.warning("You do not have permission to create a folder at this location");
        return;
      }
      if (
        activeSpace !== LEGAL_STUDY_STORAGE_TYPE &&
        activeSpace !== MY_DOCUMENT_STORAGE_TYPE &&
        activeSpace !== "shared_with_me" &&
        !requireCompany()
      )
        return;
      setFolderLoading(true);
      try {
        const parentId = normalizeParentId(selectedFolderId);
        const userId = getCurrentUserId();
        const nowIso = new Date().toISOString();
        const payload = {
          name: values.name.trim(),
          description: values.description?.trim() || "",
          type: "custom",
          createdAt: nowIso,
          updatedAt: nowIso,
          storageType: activeSpace,
          ...(parentId ? { parentId } : {}),
          ...(userId ? { createdById: userId, updatedById: userId } : {}),
        };

        if (activeSpace === "company_shared") {
          payload.internalCompanyId = extractId(activeCompanyId);
          payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
        } else if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
          Object.assign(payload, buildScopedPayload(LEGAL_STUDY_STORAGE_TYPE));
        } else if (activeSpace === "legal_reference") {
          payload.internalCompanyId = extractId(activeCompanyId);
          payload.legalReferenceId = extractId(activeLegalReferenceId);
          payload.moduleScope = "legal_reference";
        } else if (activeSpace === "customer") {
          if (activeCaseId) {
            payload.projectId = extractId(activeCaseId);
            payload.caseId = extractId(activeCaseId);
          }
          if (activeCustomerId) payload.customerId = extractId(activeCustomerId);
          if (activeCompanyId)
            payload.internalCompanyId = extractId(activeCompanyId);
          delete payload.moduleScope; // case folders don't use moduleScope
        } else if (activeSpace === MY_DOCUMENT_STORAGE_TYPE) {
          payload.moduleScope = MY_DOCUMENT_STORAGE_TYPE;
          // no internalCompanyId — personal space is user-scoped, not company-scoped
        } else if (activeSpace === KNOWLEDGE_STORAGE_TYPE) {
          payload.internalCompanyId = extractId(activeCompanyId);
          payload.moduleScope = KNOWLEDGE_STORAGE_TYPE;
        }

        await createFolderRecord(payload);
        message.success("Folder created successfully!");
        setIsFolderOpen(false);
        folderForm.resetFields();
        loadData();
        if (activeSpace === "customer") refreshCaseFolders();
      } catch (e) {
        message.error("Failed to create folder");
      } finally {
        setFolderLoading(false);
      }
    };

    const handleFileInputTrigger = async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = null;
      if (!files.length) return;
      const targetFolderId =
        directFileTargetRef.current === undefined ||
        directFileTargetRef.current === null
          ? selectedFolderId
          : directFileTargetRef.current;
      directFileTargetRef.current = null;
      if (!getFolderPermsById(targetFolderId).canCreate) {
        message.warning("You do not have permission to upload documents to this folder");
        return;
      }
      setUploadFieldsTarget({ files, folderId: targetFolderId });
    };

    const handleConfirmUploadFields = async (metadata) => {
      const target = uploadFieldsTarget;
      if (!target) return;
      const ok = await uploadFilesToTarget(target.files, {
        folderId: target.folderId,
        metadata,
      });
      if (ok) setUploadFieldsTarget(null);
    };

    const handleCreateReferenceFileSelect = (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = null;
      if (!files.length) return;
      setCreateReferenceFiles((prev) => prev.concat(files));
    };

    const handleCreateReferenceFolderSelect = (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = null;
      if (!files.length) return;
      setCreateReferenceFolderFiles((prev) => prev.concat(files));
    };

    const handleFolderInputTrigger = (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = null;
      if (!files.length) return;
      if (!getFolderPermsById(selectedFolderId).canCreate) {
        message.warning("You do not have permission to upload a folder to this location");
        return;
      }
      setPendingFolderFiles(files);
      setBulkTargetId(selectedFolderId);
      setBulkConfirmOpen(true);
    };

    const executeFolderUpload = async () => {
      if (!getFolderPermsById(bulkTargetId).canCreate) {
        message.warning("You do not have permission to upload a folder to the selected location");
        return;
      }
      if (
        activeSpace !== LEGAL_STUDY_STORAGE_TYPE &&
        activeSpace !== MY_DOCUMENT_STORAGE_TYPE &&
        activeSpace !== "shared_with_me" &&
        !requireCompany()
      )
        return;
      setBulkUploading(true);
      setBulkProgress("Analyzing folder structure...");
      setBulkPercent(5);
      try {
        const rootParentId = normalizeParentId(bulkTargetId);
        const folderIdMap = { "": rootParentId };
        const folderPaths = new Set();
        pendingFolderFiles.forEach((file) => {
          const relativePath = getUploadRelativePath(file);
          const parts = relativePath.split("/");
          parts.pop();
          let currentPath = "";
          parts.forEach((part) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            folderPaths.add(currentPath);
          });
        });

        const sortedPaths = Array.from(folderPaths).sort(
          (a, b) => a.split("/").length - b.split("/").length,
        );
        const userId = getCurrentUserId();
        setBulkProgress(`Creating ${sortedPaths.length} folder(s)...`);

        const nowIso = new Date().toISOString();
        for (
          let folderIndex = 0;
          folderIndex < sortedPaths.length;
          folderIndex++
        ) {
          const path = sortedPaths[folderIndex];
          setBulkPercent(
            5 +
              Math.round(
                ((folderIndex + 1) / Math.max(sortedPaths.length, 1)) * 25,
              ),
          );
          const parts = path.split("/");
          const folderName = parts.pop();
          const parentPath = parts.join("/");
          const parentId = folderIdMap[parentPath] || null;

          const folderPayload = {
            name: folderName,
            type: "custom",
            createdAt: nowIso,
            updatedAt: nowIso,
            storageType: activeSpace,
            ...(parentId ? { parentId } : {}),
            ...(userId ? { createdById: userId, updatedById: userId } : {}),
          };

          // buildScopedPayload() covers every space including "customer"
          // (sets projectId/caseId/customerId) — the case-scoped fetch in
          // refreshCaseFolders/loadData filters folders by projectId, so a
          // folder created without it (the old buildScopePayload() fallback
          // used here, which only knows moduleScope + internalCompanyId)
          // would never be returned by that query and would silently never
          // appear, even though the create call itself succeeds.
          Object.assign(folderPayload, buildScopedPayload(activeSpace));

          const res = await createFolderRecord(folderPayload);
          folderIdMap[path] = extractId(res?.data?.data);
        }

        const fileIndexCache = {};
        const nextBulkIndex = async (folderId) => {
          const key = String(folderId || "root");
          if (fileIndexCache[key] === undefined) {
            fileIndexCache[key] = await getNextFileIndex(folderId);
            return fileIndexCache[key];
          }
          fileIndexCache[key] += 1;
          return fileIndexCache[key];
        };

        for (let index = 0; index < pendingFolderFiles.length; index++) {
          const file = pendingFolderFiles[index];
          setBulkProgress(
            `Uploading file ${index + 1}/${pendingFolderFiles.length}...`,
          );
          setBulkPercent(
            30 +
              Math.round(
                ((index + 1) / Math.max(pendingFolderFiles.length, 1)) * 65,
              ),
          );
          const relativePath = getUploadRelativePath(file);
          const parts = relativePath.split("/");
          const fileName = parts.pop();
          const parentPath = parts.join("/");
          const targetFolderId = folderIdMap[parentPath] || rootParentId;
          const attachment = await uploadAttachment(file, fileName);
          const fileNowIso = new Date().toISOString();

          const filePayload = {
            name: fileName,
            title: fileName,
            fileIndex: await nextBulkIndex(targetFolderId),
            fileAttachment: [{ id: attachment.id }],
            createdAt: fileNowIso,
            updatedAt: fileNowIso,
            uploadedAt: fileNowIso,
            uploaded_at: fileNowIso,
            storageType: activeSpace,
            ...(targetFolderId ? { folderId: targetFolderId } : {}),
            ...(userId
              ? { uploadedById: userId, createdById: userId, updatedById: userId }
              : {}),
          };

          // Same fix as folderPayload above — use buildScopedPayload() so
          // files uploaded through this path also get projectId/caseId in
          // "customer" space, matching uploadFilesToTarget/handleCreateFolder.
          Object.assign(filePayload, buildScopedPayload(activeSpace));

          await createDocumentRecord(filePayload);
        }

        message.success("Folder upload complete!");
        setBulkPercent(100);
        setBulkConfirmOpen(false);
        setPendingFolderFiles([]);
        loadData();
      } catch (e) {
        message.error("Folder upload failed");
      } finally {
        setBulkUploading(false);
        setBulkProgress("");
        setBulkPercent(0);
      }
    };

    const handleMoveRecord = async (record, targetFolderId) => {
      if (!record) return;
      const targetId = normalizeParentId(targetFolderId);
      if (!getRecordPerms(record).canMove) {
        message.warning("You do not have permission to move this item");
        return;
      }
      if (!getFolderPermsById(targetId).canCreate) {
        message.warning("You do not have permission to add items to the destination folder");
        return;
      }
      try {
        if (record._type === "folder") {
          const folderId = String(extractId(record));
          if (targetId && String(targetId) === folderId) {
            message.warning("Cannot move a folder into itself");
            return;
          }
          if (targetId && getDescendantIds(folderId).includes(String(targetId))) {
            message.warning("Cannot move a folder into its own subfolder");
            return;
          }
          await ctx.api.request({
            url: `folders:update?filterByTk=${extractId(record)}`,
            method: "POST",
            data: { parentId: targetId },
          });
          message.success("Folder moved");
        } else {
          const oldFolderId = normalizeParentId(record.folderId);
          await ctx.api.request({
            url: `documents:update?filterByTk=${extractId(record)}`,
            method: "POST",
            data: {
              folderId: targetId,
              fileIndex: await getNextFileIndex(targetId),
            },
          });
          await Promise.all([
            reindexFolderFiles(oldFolderId),
            reindexFolderFiles(targetId),
          ]);
          message.success("Document moved");
        }
        setMoveRecord(null);
        loadData();
      } catch (e) {
        message.error("Move failed");
      }
    };

    const handleBulkRestore = async () => {
      if (selectedRowKeys.length === 0) return;
      if (!getBulkRecordsWithPermission("canDelete", "restore")) return;
      Modal.confirm({
        title: `Restore ${selectedRowKeys.length} selected items?`,
        content:
          "Folders and documents will be returned to their original location.",
        okText: "Restore",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            const recordsToRestore = getBulkRecordsWithPermission(
              "canDelete",
              "restore",
            );
            if (!recordsToRestore) return;
            await Promise.all(
              recordsToRestore.map(async (record) => {
                const key = record._key;
                const isFolder = key.startsWith("folder_");
                const rId = Number(
                  key.replace("folder_", "").replace("file_", ""),
                );
                const url = isFolder
                  ? `folders:update?filterByTk=${rId}`
                  : `documents:update?filterByTk=${rId}`;
                await ctx.api.request({
                  url,
                  method: "POST",
                  data: { isDeleted: false, deletedAt: null },
                });
              }),
            );
            await Promise.all(
              recordsToRestore.map((record) =>
                createTrashActivityLog(record, "restored"),
              ),
            );
            message.success(
              `Restored ${selectedRowKeys.length} item(s) successfully!`,
            );
            setSelectedRowKeys([]);
            loadData();
          } catch (e) {
            message.error("Restore failed");
          }
        },
      });
    };

    const handleBulkPermanentDelete = async () => {
      if (selectedRowKeys.length === 0) return;
      if (activeSpace !== "trash") {
        message.warning("Can only permanently delete items in Trash");
        return;
      }
      if (!getBulkRecordsWithPermission("canDelete", "permanently delete")) return;
      Modal.confirm({
        title: `Permanently delete ${selectedRowKeys.length} selected items?`,
        content:
          "This action cannot be undone. The files and folders will be removed from the system.",
        okText: "Permanently Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            const recordsToDelete = getBulkRecordsWithPermission(
              "canDelete",
              "permanently delete",
            );
            if (!recordsToDelete) return;
            await Promise.all(
              recordsToDelete.map(async (record) => {
                const key = record._key;
                const isFolder = key.startsWith("folder_");
                const rId = Number(
                  key.replace("folder_", "").replace("file_", ""),
                );
                const url = isFolder
                  ? `folders:destroy?filterByTk=${rId}`
                  : `documents:destroy?filterByTk=${rId}`;
                await ctx.api.request({
                  url,
                  method: "POST",
                });
              }),
            );
            await Promise.all(
              recordsToDelete.map((record) =>
                createManualActivityLog(record, "deleted", {
                  fieldName: "permanentDelete",
                  newValue:
                    record._type === "folder"
                      ? record.name || record.title || "Folder"
                      : getDocTitle(record),
                  dataId: extractId(activeCompanyId),
                }),
              ),
            );
            message.success(
              `Permanently deleted ${selectedRowKeys.length} item(s) successfully!`,
            );
            setSelectedRowKeys([]);
            loadData();
          } catch (e) {
            message.error("Permanent deletion failed");
          }
        },
      });
    };

    const handleBulkDelete = async () => {
      if (selectedRowKeys.length === 0) return;

      const records = getBulkRecordsWithPermission("canDelete", "delete");
      if (!records) return;

      Modal.confirm({
        title: `Move ${selectedRowKeys.length} selected items to Trash?`,
        icon: React.createElement(
          "span",
          { style: { color: "#faad14", marginRight: 16 } },
          WarningIcon,
        ),
        content:
          "These items will only be moved to Trash and can still be restored.",
        okText: "Move to Trash",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            if (!getBulkRecordsWithPermission("canDelete", "delete")) return;
            const nowIso = new Date().toISOString();
            const userId = getCurrentUserId();
            const deletePayload = {
              isDeleted: true,
              deletedAt: nowIso,
              ...(userId ? { updatedById: userId } : {}),
            };

            await Promise.all(
              records.map(async (record) => {
                const isFolder = record._type === "folder";
                const rId = Number(extractId(record));
                const url = isFolder
                  ? `folders:update?filterByTk=${rId}`
                  : `documents:update?filterByTk=${rId}`;
                await ctx.api.request({
                  url,
                  method: "POST",
                  data: deletePayload,
                });
              }),
            );

            await Promise.all(
              records.map((record) =>
                createTrashActivityLog(record, "trash_deleted"),
              ),
            );

            message.success(`Moved ${records.length} item(s) to Trash!`);
            setSelectedRowKeys([]);
            loadData();
          } catch (e) {
            message.error("Action failed");
          }
        },
      });
    };

    const handleBulkMove = () => {
      if (selectedRowKeys.length === 0) return;
      if (!getBulkRecordsWithPermission("canMove", "move")) return;
      setBulkMoveTargetId("root");
      setIsBulkMoveOpen(true);
    };

    const handleBulkMoveSubmit = async () => {
      try {
        const recordsToMove = getBulkRecordsWithPermission(
          "canMove",
          "move",
        );
        if (!recordsToMove) return;
        const targetId = normalizeParentId(bulkMoveTargetId);
        if (!getFolderPermsById(targetId).canCreate) {
          message.warning("You do not have permission to add items to the destination folder");
          return;
        }
        await Promise.all(
          recordsToMove.map(async (record) => {
            const key = record._key;
            const isFolder = key.startsWith("folder_");
            const rId = Number(key.replace("folder_", "").replace("file_", ""));
            if (isFolder) {
              if (targetId && String(targetId) === String(rId)) {
                return;
              }
              if (targetId && getDescendantIds(rId).includes(String(targetId))) {
                return;
              }
              await ctx.api.request({
                url: `folders:update?filterByTk=${rId}`,
                method: "POST",
                data: { parentId: targetId },
              });
            } else {
              const doc = documents.find(
                (d) => String(extractId(d)) === String(rId),
              );
              const oldFolderId = doc ? normalizeParentId(doc.folderId) : null;
              await ctx.api.request({
                url: `documents:update?filterByTk=${rId}`,
                method: "POST",
                data: {
                  folderId: targetId,
                  fileIndex: await getNextFileIndex(targetId),
                },
              });
              if (oldFolderId) {
                await reindexFolderFiles(oldFolderId);
              }
            }
          }),
        );
        if (targetId) {
          await reindexFolderFiles(targetId);
        }
        message.success(`Moved ${selectedRowKeys.length} item(s) successfully!`);
        setIsBulkMoveOpen(false);
        setSelectedRowKeys([]);
        loadData();
      } catch (e) {
        message.error("Move failed");
      }
    };

    const reorderFileAroundTarget = async (sourceId, targetRecord, position) => {
      if (!targetRecord || targetRecord._type !== "file") return false;
      const sourceDoc = documents.find(
        (doc) => String(extractId(doc)) === String(sourceId),
      );
      if (!sourceDoc) return false;
      if (!getRecordPerms({ ...sourceDoc, _type: "file" }).canMove) {
        message.warning("You do not have permission to reorder this document");
        return false;
      }
      const targetFolderId = normalizeParentId(targetRecord.folderId);
      if (!getFolderPermsById(targetFolderId).canCreate) {
        message.warning("You do not have permission to reorder items in the destination folder");
        return false;
      }
      const oldFolderId = normalizeParentId(sourceDoc.folderId);
      const siblings = documents
        .filter(
          (doc) =>
            matchesInternalCompany(doc, activeCompanyId) &&
            String(extractId(doc.folderId) || "") ===
              String(targetFolderId || ""),
        )
        .sort((a, b) => {
          const ai = Number(a.fileIndex) || 0;
          const bi = Number(b.fileIndex) || 0;
          if (ai !== bi) return ai - bi;
          return sortByCreatedAt(a, b);
        })
        .filter((doc) => String(extractId(doc)) !== String(sourceId));
      const targetIndex = siblings.findIndex(
        (doc) => String(extractId(doc)) === String(extractId(targetRecord)),
      );
      const insertIndex = position === "top" ? targetIndex : targetIndex + 1;
      siblings.splice(Math.max(0, insertIndex), 0, {
        ...sourceDoc,
        folderId: targetFolderId,
      });
      await ctx.api.request({
        url: `documents:update?filterByTk=${extractId(sourceDoc)}`,
        method: "POST",
        data: { folderId: targetFolderId },
      });
      await Promise.all(
        siblings.map((doc, index) =>
          ctx.api.request({
            url: `documents:update?filterByTk=${extractId(doc)}`,
            method: "POST",
            data: { fileIndex: index + 1 },
          }),
        ),
      );
      if (String(oldFolderId || "") !== String(targetFolderId || "")) {
        const oldSiblings = documents
          .filter(
            (doc) =>
              matchesInternalCompany(doc, activeCompanyId) &&
              String(extractId(doc.folderId) || "") ===
                String(oldFolderId || "") &&
              String(extractId(doc)) !== String(sourceId),
          )
          .sort((a, b) => {
            const ai = Number(a.fileIndex) || 0;
            const bi = Number(b.fileIndex) || 0;
            if (ai !== bi) return ai - bi;
            return sortByCreatedAt(a, b);
          });
        await Promise.all(
          oldSiblings.map((doc, index) =>
            ctx.api.request({
              url: `documents:update?filterByTk=${extractId(doc)}`,
              method: "POST",
              data: { fileIndex: index + 1 },
            }),
          ),
        );
      }
      message.success("Document reordered");
      setSortMode("manual");
      loadData();
      return true;
    };

    const getDropPosition = (event, targetRecord) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const y = event.clientY - rect.top;
      if (targetRecord._type === "folder") return "inside";
      return y < rect.height / 2 ? "top" : "bottom";
    };

    const clearDragState = () =>
      setDragState({
        sourceKey: null,
        sourceType: null,
        targetKey: null,
        position: null,
      });

    const clearExternalDropState = () => {
      setExternalDropActive(false);
      setExternalDropTargetKey(null);
    };

    const canUploadDroppedItems = (targetFolderId) =>
      activeSpace !== "trash" &&
      activeSpace !== "recent" &&
      !isEntityGallery &&
      getFolderPermsById(targetFolderId).canCreate;

    const uploadDroppedItems = async (dataTransfer, targetFolderId) => {
      const normalizedTargetId = normalizeParentId(targetFolderId);
      clearExternalDropState();

      if (!canUploadDroppedItems(normalizedTargetId)) {
        message.warning(
          "You do not have permission to upload files or folders to this location",
        );
        return false;
      }

      let droppedItems;
      try {
        droppedItems = await readDroppedFiles(dataTransfer);
      } catch (error) {
        console.error("Read dropped files failed:", error);
        message.error("Unable to read the dropped file or folder");
        return false;
      }

      const { files, folderPaths, hasDirectories } = droppedItems;
      if (!files.length && !folderPaths.length) {
        message.warning("No valid file or folder found");
        return false;
      }

      setExternalUploadInProgress(true);
      try {
        if (hasDirectories) {
          return await uploadFolderFilesToTarget(files, {
            folderId: normalizedTargetId,
            directoryPaths: folderPaths,
            successMessage: `Uploaded ${folderPaths.length} folder(s) and ${files.length} file`,
          });
        }

        return await uploadFilesToTarget(files, {
          folderId: normalizedTargetId,
          successMessage: `Uploaded ${files.length} file`,
        });
      } finally {
        setExternalUploadInProgress(false);
      }
    };

    const handleDropOnRecord = async (event, targetRecord) => {
      event.preventDefault();
      event.stopPropagation();
      if (hasExternalFiles(event.dataTransfer)) {
        const targetFolderId =
          targetRecord._type === "folder"
            ? extractId(targetRecord)
            : selectedFolderId;
        await uploadDroppedItems(event.dataTransfer, targetFolderId);
        return;
      }

      const raw = event.dataTransfer.getData("application/json");
      if (!raw) return;
      let payload = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      if (!payload || String(payload.id) === String(extractId(targetRecord)))
        return;

      const position = getDropPosition(event, targetRecord);
      clearDragState();

      if (position === "inside" && targetRecord._type === "folder") {
        const source =
          payload.type === "folder"
            ? folders.find(
                (folder) => String(extractId(folder)) === String(payload.id),
              )
            : documents.find(
                (doc) => String(extractId(doc)) === String(payload.id),
              );
        if (source)
          await handleMoveRecord(
            { ...source, _type: payload.type },
            extractId(targetRecord),
          );
        return;
      }

      if (
        payload.type === "file" &&
        (position === "top" || position === "bottom")
      ) {
        await reorderFileAroundTarget(payload.id, targetRecord, position);
      }
    };

    const handleDropToCurrentFolder = async (event) => {
      event.preventDefault();
      clearDragState();
      if (hasExternalFiles(event.dataTransfer)) {
        await uploadDroppedItems(event.dataTransfer, selectedFolderId);
        return;
      }
      clearExternalDropState();
      if (activeSpace === "trash") return;
      const raw = event.dataTransfer.getData("application/json");
      if (!raw) return;
      let payload = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      const source =
        payload.type === "folder"
          ? folders.find(
              (folder) => String(extractId(folder)) === String(payload.id),
            )
          : documents.find(
              (doc) => String(extractId(doc)) === String(payload.id),
            );
      if (!source) return;
      await handleMoveRecord(
        { ...source, _type: payload.type },
        selectedFolderId,
      );
    };

    const handleContentDragEnter = (event) => {
      if (!hasExternalFiles(event.dataTransfer)) return;
      event.preventDefault();
      const canUpload = canUploadDroppedItems(selectedFolderId);
      event.dataTransfer.dropEffect = canUpload ? "copy" : "none";
      setExternalDropActive(canUpload);
    };

    const handleContentDragOver = (event) => {
      event.preventDefault();
      if (!hasExternalFiles(event.dataTransfer)) return;
      const canUpload = canUploadDroppedItems(selectedFolderId);
      event.dataTransfer.dropEffect = canUpload ? "copy" : "none";
      setExternalDropActive(canUpload);
    };

    const handleContentDragLeave = (event) => {
      if (!externalDropActive && !hasExternalFiles(event.dataTransfer)) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (
        event.clientX > rect.left &&
        event.clientX < rect.right &&
        event.clientY > rect.top &&
        event.clientY < rect.bottom
      ) {
        return;
      }
      clearExternalDropState();
    };

    const getTypeConfig = useCallback(
      (value) =>
        documentTypes.find((type) => type.id === String(value || "")) ||
        decorateDocumentTypeOption({
          value: value || "document",
          label: value || "Document",
        }),
      [documentTypes],
    );

    const renderTypePill = (type, compact = false) => (
      <Tag
        style={{
          margin: 0,
          borderRadius: 999,
          border: "0.5px solid transparent",
          background: type.background,
          color: type.color,
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          lineHeight: "22px",
          maxWidth: compact ? 150 : "100%",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          {type.svgIcon}
        </span>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {type.label}
        </span>
      </Tag>
    );

    const startEditTitle = (record) => {
      setEditingTitleId(String(extractId(record)));
      if (record._type === "folder") {
        setEditingTitleValue(record.name || "Folder");
      } else {
        setEditingTitleValue(getDocTitle(record));
      }
    };

    const cancelEditTitle = () => {
      setEditingTitleId(null);
      setEditingTitleValue("");
    };

    const handleSaveFileTitle = async (record) => {
      if (isRenameLockedFolder(record)) {
        message.error("Folder mẫu hệ thống không được đổi tên.");
        cancelEditTitle();
        return;
      }
      const safeTitle = editingTitleValue.trim();
      if (!safeTitle) {
        cancelEditTitle();
        return;
      }
      try {
        const userId = getCurrentUserId();
        if (record._type === "folder") {
          await ctx.api.request({
            url: `folders:update?filterByTk=${extractId(record)}`,
            method: "POST",
            data: {
              name: safeTitle,
              updatedAt: new Date().toISOString(),
              ...(userId ? { updatedById: userId } : {}),
            },
          });
          message.success("Folder name updated");
        } else {
          await ctx.api.request({
            url: `documents:update?filterByTk=${extractId(record)}`,
            method: "POST",
            data: {
              title: safeTitle,
              updatedAt: new Date().toISOString(),
              ...(userId ? { updatedById: userId } : {}),
            },
          });
          const attachment = getAttachment(record);
          if (attachment?.id) {
            await ctx.api
              .request({
                url: `attachments:update?filterByTk=${attachment.id}`,
                method: "POST",
                data: { title: safeTitle },
              })
              .catch(() => {});
          }
          message.success("Document and file name updated");
        }
        cancelEditTitle();
        loadData();
      } catch (e) {
        message.error(
          record._type === "folder"
            ? "Failed to update folder name"
            : "Failed to update document name",
        );
      }
    };

    const showDeleteConfirm = (folder) => {
      const fId = extractId(folder);
      const folderIdsToDelete = getDescendantIds(fId);
      // Include the folder itself
      folderIdsToDelete.push(String(fId));
      const filesCount = documents.filter((d) =>
        folderIdsToDelete.includes(String(extractId(d.folderId) || "")),
      ).length;
      const subFoldersCount = folderIdsToDelete.length - 1;

      let contentElements = [];
      if (subFoldersCount > 0)
        contentElements.push(`- ${subFoldersCount} subfolder(s)`);
      if (filesCount > 0) contentElements.push(`- ${filesCount} file(s)`);

      Modal.confirm({
        title: `Move folder "${folder.name}" to Trash?`,
        icon: React.createElement(
          "span",
          { style: { color: "#faad14", marginRight: 16 } },
          WarningIcon,
        ),
        content: (
          <div style={{ fontFamily: FONT, marginTop: 8 }}>
            <p>
              You are about to move this folder to Trash. The following data will also be moved:
            </p>
            {contentElements.length > 0 ? (
              <div
                style={{
                  padding: "8px 12px",
                  background: "#fff1f0",
                  border: "1px solid #ffa39e",
                  borderRadius: 6,
                  color: "#cf1322",
                  fontWeight: 600,
                  marginTop: 8,
                  marginBottom: 12,
                }}
              >
                {contentElements.map((item, idx) => (
                  <div key={idx}>{item}</div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#8c8c8c", fontStyle: "italic" }}>
                (Folder is empty)
              </p>
            )}
            <p>Are you sure you want to move it to Trash?</p>
          </div>
        ),
        okText: "Move to Trash",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            const nowIso = new Date().toISOString();
            const userId = getCurrentUserId();
            const deletePayload = {
              isDeleted: true,
              deletedAt: nowIso,
              ...(userId ? { updatedById: userId } : {}),
            };
            if (folderIdsToDelete.length > 0) {
              await ctx.api
                .request({
                  url: "documents:update",
                  method: "POST",
                  params: {
                    filter: JSON.stringify({
                      folderId: {
                        $in: folderIdsToDelete.map((id) => Number(id)),
                      },
                    }),
                  },
                  data: deletePayload,
                })
                .catch(() => {});
              await ctx.api
                .request({
                  url: "folders:update",
                  method: "POST",
                  params: {
                    filter: JSON.stringify({
                      id: { $in: folderIdsToDelete.map((id) => Number(id)) },
                    }),
                  },
                  data: deletePayload,
                })
                .catch(() => {});
            }
            await createTrashActivityLog(folder, "trash_deleted");
            message.success(
              "Folder and its contents moved to Trash",
            );
            if (
              selectedFolderId !== "root" &&
              folderIdsToDelete.includes(String(selectedFolderId))
            ) {
              setSelectedFolderId("root");
            }
            loadData();
          } catch (e) {
            message.error("Failed to move to Trash");
          }
        },
      });
    };

    const handleDeleteFile = (record) => {
      Modal.confirm({
        title: "Move file to Trash?",
        icon: React.createElement(
          "span",
          { style: { color: "#faad14", marginRight: 16 } },
          WarningIcon,
        ),
        content: "The file will be moved to Trash and can still be restored.",
        okText: "Move to Trash",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            const userId = getCurrentUserId();
            await ctx.api.request({
              url: `documents:update?filterByTk=${extractId(record)}`,
              method: "POST",
              data: {
                isDeleted: true,
                deletedAt: new Date().toISOString(),
                ...(userId ? { updatedById: userId } : {}),
              },
            });
            await createTrashActivityLog(record, "trash_deleted");
            message.success("File moved to Trash");
            loadData();
          } catch {
            message.error("Failed to move to Trash");
          }
        },
      });
    };

    const handleRestoreRecord = async (record) => {
      try {
        if (record._type === "folder") {
          await ctx.api.request({
            url: `folders:update?filterByTk=${extractId(record)}`,
            method: "POST",
            data: { isDeleted: false, deletedAt: null },
          });
        } else {
          await ctx.api.request({
            url: `documents:update?filterByTk=${extractId(record)}`,
            method: "POST",
            data: { isDeleted: false, deletedAt: null },
          });
        }
        await createTrashActivityLog(record, "restored");
        message.success("Restored successfully");
        loadData();
      } catch (e) {
        message.error("Restore failed");
      }
    };

    const handlePermanentDelete = (record) => {
      if (activeSpace !== "trash") {
        message.warning("Can only permanently delete items in Trash");
        return;
      }
      Modal.confirm({
        title:
          record._type === "folder"
            ? "Permanently delete this folder?"
            : "Permanently delete this file?",
        icon: React.createElement(
          "span",
          { style: { color: "#ff4d4f", marginRight: 16 } },
          WarningIcon,
        ),
        content:
          "Warning: This action cannot be undone. The data will be permanently removed from the database.",
        okText: "Permanently Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            if (record._type === "folder") {
              await ctx.api.request({
                url: `folders:destroy?filterByTk=${extractId(record)}`,
                method: "POST",
              });
            } else {
              await ctx.api.request({
                url: `documents:destroy?filterByTk=${extractId(record)}`,
                method: "POST",
              });
            }
            await createManualActivityLog(record, "deleted", {
              fieldName: "permanentDelete",
              newValue:
                record._type === "folder"
                  ? record.name || record.title || "Folder"
                  : getDocTitle(record),
              dataId: extractId(activeCompanyId),
            });
            message.success("Permanently deleted");
            loadData();
          } catch {
            message.error("Permanent deletion failed");
          }
        },
      });
    };

    const handleCreateFolderFromSidebar = (spaceType, companyId = null) => {
      if (spaceType === LEGAL_STUDY_STORAGE_TYPE) {
        setActiveSpace(LEGAL_STUDY_STORAGE_TYPE);
        setActiveLegalReferenceId(null);
        setSelectedFolderId("root");
        folderForm.resetFields();
        setIsFolderOpen(true);
        return;
      }
      if (spaceType === "company_shared") {
        const targetCompanyId = companyId || activeCompanyId;
        if (!targetCompanyId) {
          message.warning("Please select an internal company first");
          return;
        }
        setActiveCompanyId(String(targetCompanyId));
      }
      setActiveSpace(spaceType);
      setSelectedFolderId("root");
      folderForm.resetFields();
      setIsFolderOpen(true);
    };

    const handleDeleteTemplate = async (templateRecord) => {
      const isLegalRef = !!(
        templateRecord.referenceCode ||
        templateRecord._type === "legal_reference_record" ||
        activeSpace === "legal_reference"
      );
      Modal.confirm({
        title: isLegalRef
          ? `Confirm deletion of Case Study "${templateRecord.title || templateRecord.name}"?`
          : `Confirm deletion of document type "${templateRecord.title || templateRecord.name}"?`,
        icon: React.createElement(
          "span",
          { style: { color: "#faad14", marginRight: 16 } },
          WarningIcon,
        ),
        content: isLegalRef
          ? "Are you sure you want to delete this Case Study? Documents and folders belonging to this case will remain in Trash or become unlinked."
          : "Are you sure you want to delete this document type? Documents under this type will remain stored but will no longer be linked.",
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            if (isLegalRef) {
              const candidates = [
                `legalReference:destroy?filterByTk=${extractId(templateRecord)}`,
                `legalReferences:destroy?filterByTk=${extractId(templateRecord)}`,
                `LegalReference:destroy?filterByTk=${extractId(templateRecord)}`,
              ];
              let success = false;
              let lastError = null;
              for (const url of candidates) {
                try {
                  await ctx.api.request({ url, method: "POST" });
                  success = true;
                  break;
                } catch (e) {
                  lastError = e;
                }
              }
              if (!success) throw lastError || new Error("Failed to delete");
            } else {
              await ctx.api.request({
                url: `${INTERNAL_TEMPLATE_COLLECTION}:destroy?filterByTk=${extractId(templateRecord)}`,
                method: "POST",
              });
            }
            message.success(
              isLegalRef ? "Case Study deleted" : "Document type deleted",
            );
            if (
              isLegalRef &&
              activeLegalReferenceId === String(extractId(templateRecord))
            ) {
              setActiveLegalReferenceId(null);
            }
            loadData();
          } catch (e) {
            message.error("Delete failed");
          }
        },
      });
    };

    const handleRenameSubmit = async () => {
      try {
        if (isRenameLockedFolder(renameRecord)) {
          message.error("Folder mẫu hệ thống không được đổi tên.");
          return;
        }
        const values = await renameForm.validateFields();
        const newName = values.name.trim();
        const rType = renameRecord._type;
        const rId = extractId(renameRecord);

        const isLegalRef = !!(
          renameRecord.referenceCode ||
          renameRecord._type === "legal_reference_record"
        );

        if (isLegalRef) {
          const candidates = [
            `legalReference:update?filterByTk=${rId}`,
            `legalReferences:update?filterByTk=${rId}`,
            `LegalReference:update?filterByTk=${rId}`,
          ];
          let success = false;
          let lastError = null;
          for (const url of candidates) {
            try {
              await ctx.api.request({
                url,
                method: "POST",
                data: { title: newName },
              });
              success = true;
              break;
            } catch (e) {
              lastError = e;
            }
          }
          if (!success) {
            throw lastError || new Error("Failed to rename");
          }
          message.success("Case Study renamed");
        } else if (rType === "template" || rType === "document_type") {
          await ctx.api.request({
            url: `${INTERNAL_TEMPLATE_COLLECTION}:update?filterByTk=${rId}`,
            method: "POST",
            data: { title: newName },
          });
          message.success("Document type renamed");
        } else {
          if (rType === "folder") {
            await ctx.api.request({
              url: `folders:update?filterByTk=${rId}`,
              method: "POST",
              data: { name: newName },
            });
            message.success("Folder renamed");
          } else {
            await ctx.api.request({
              url: `documents:update?filterByTk=${rId}`,
              method: "POST",
              data: { title: newName },
            });
            const attachment = getAttachment(renameRecord);
            if (attachment?.id) {
              await ctx.api
                .request({
                  url: `attachments:update?filterByTk=${attachment.id}`,
                  method: "POST",
                  data: { title: newName },
                })
                .catch(() => {});
            }
            message.success("Document renamed");
          }
        }
        setRenameRecord(null);
        renameForm.resetFields();
        loadData();
      } catch (e) {
        message.error("Rename failed");
      }
    };

    const openRecordFile = async (record, explicitUrl = null) => {
      const fullUrl = getFullUrl(explicitUrl || getRecordFileUrl(record));
      if (!fullUrl) {
        message.warning("This document has no file or URL");
        return;
      }
      const downloadStarted = await downloadRecordFile(record, fullUrl);
      if (!downloadStarted) return;

      createManualActivityLog(record, "downloaded", {
        fieldName: "fileAttachment",
        newValue: getDocTitle(record),
      }).catch(() => {});
    };

    const previewRecordFile = (record) => {
      if (!getRecordFileUrl(record)) {
        message.warning("This document has no file or URL to preview");
        return;
      }
      createManualActivityLog(record, "previewed", {
        fieldName: "fileAttachment",
        newValue: getDocTitle(record),
      });
      setPreviewDoc(record);
    };

    const renderNameCell = (record, isAllFiles = false) => {
      const recordId = String(extractId(record));
      const isEditing = editingTitleId === recordId;

      if (record._type === "folder") {
        if (activeSpace === "trash") {
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <span style={{ color: "#8c6d1f", display: "inline-flex" }}>
                {TYPE_ICONS.folder}
              </span>
              <Text
                strong
                style={{ fontFamily: FONT, fontSize: 13, color: "#111827" }}
              >
                {record.name || "Folder"}
              </Text>
            </div>
          );
        }
        if (isEditing) {
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                size="small"
                value={editingTitleValue}
                autoFocus
                onChange={(e) => setEditingTitleValue(e.target.value)}
                onPressEnter={() => handleSaveFileTitle(record)}
                style={{ flex: 1, minWidth: 120 }}
              />
              <Button
                size="small"
                type="primary"
                icon={CHECK_ICON}
                onClick={() => handleSaveFileTitle(record)}
              />
              <Button size="small" icon={CLOSE_ICON} onClick={cancelEditTitle} />
            </div>
          );
        }
        const folderFileCount = permissionFilteredDocs.filter(
          (d) =>
            String(extractId(d.folderId) || "") === String(extractId(record)),
        ).length;
        const folderSubFolderCount = permissionFilteredFolders.filter(
          (f) => String(getFolderParentId(f) || "") === String(extractId(record)),
        ).length;
        return (
          <div
            style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
          >
            <button
              type="button"
              onClick={() => setSelectedFolderId(String(extractId(record)))}
              style={{
                border: 0,
                background: "transparent",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontFamily: FONT,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              <span style={{ color: "#2563eb", display: "inline-flex" }}>
                {TYPE_ICONS.folder}
              </span>
              {record.name || "Folder"}
            </button>
            <span
              style={{
                fontSize: 11,
                color: "#9ca3af",
                fontWeight: 400,
                marginLeft: 8,
              }}
            >
              ({folderSubFolderCount} Folder - {folderFileCount} file)
            </span>
          </div>
        );
      }

      // File
      const hasPrefix = !!(isAllFiles && record._displayFileIndex);
      const displayName =
        getDocTitle(record) ||
        record.googleDriveUrl ||
        record.description ||
        "No file attached";
      const hasFile = !!getRecordFileUrl(record);
      const _fileParentFolder = visibleFolders.find(
        (f) =>
          String(extractId(f.id)) === String(extractId(record.folderId) || ""),
      );
      const _filePerms = getFilePermissions(
        record,
        _fileParentFolder || null,
        currentUserState,
        visibleFolders,
        currentLawyerId,
      );
      const isSharedOnly = _filePerms.role === "shared";

      if (isEditing) {
        return (
          <div
            style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              size="small"
              value={editingTitleValue}
              autoFocus
              onChange={(e) => setEditingTitleValue(e.target.value)}
              onPressEnter={() => handleSaveFileTitle(record)}
              style={{ flex: 1, minWidth: 120 }}
            />
            <Button
              size="small"
              type="primary"
              icon={CHECK_ICON}
              onClick={() => handleSaveFileTitle(record)}
            />
            <Button size="small" icon={CLOSE_ICON} onClick={cancelEditTitle} />
          </div>
        );
      }

      return (
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
        >
          {hasFile ? (
            <Tooltip title="Click to preview" placement="topLeft">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  previewRecordFile(record);
                }}
                style={{
                  fontWeight: 600,
                  color: "#111827",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationColor: "#d1d5db",
                  textUnderlineOffset: 3,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#2563eb";
                  e.currentTarget.style.textDecorationColor = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#111827";
                  e.currentTarget.style.textDecorationColor = "#d1d5db";
                }}
              >
                {hasPrefix && (
                  <span
                    style={{ color: "#10b981", marginRight: 6, fontWeight: 700 }}
                  >
                    {record._displayFileIndex}.
                  </span>
                )}
                {displayName}
              </span>
            </Tooltip>
          ) : (
            <Text
              strong
              style={{
                color: "#6b7280",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {hasPrefix && (
                <span
                  style={{ color: "#10b981", marginRight: 6, fontWeight: 700 }}
                >
                  {record._displayFileIndex}.
                </span>
              )}
              {displayName}
            </Text>
          )}
          {isSharedOnly && (
            <span
              style={{ fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap" }}
            >
              (shared)
            </span>
          )}
        </div>
      );
    };

    const renderNewMenuLabel = (icon, label) => (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          minWidth: 150,
          lineHeight: "22px",
          fontFamily: FONT,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
          }}
        >
          {icon}
        </span>
        <span
          style={{ display: "inline-flex", alignItems: "center", paddingTop: 1 }}
        >
          {label}
        </span>
      </span>
    );

    const renderContextMenuItemLabel = (icon, label, color = null) => (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          lineHeight: "22px",
          fontFamily: FONT,
          color: color || "inherit",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            color: color || "inherit",
          }}
        >
          {icon}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            color: color || "inherit",
          }}
        >
          {label}
        </span>
      </span>
    );

    const renderContextMenuItems = useCallback(
      (record) => {
        if (!record) return [];
        const items = [];
        const isFolder = record._type === "folder";
        const isTemplate =
          record._type === "template" || record._type === "document_type";
        const isLegalReferenceRecord = record._type === "legal_reference_record";

        if (isLegalReferenceRecord) {
          items.push({
            key: "open_detail",
            label: renderContextMenuItemLabel(EYE_ICON, "Open details"),
            onClick: () => {
              closeContextMenu();
              openLegalReferenceDetail(record);
            },
          });
          items.push({
            key: "link_case",
            label: renderContextMenuItemLabel(LINK_CASE_ICON, "Link Case"),
            onClick: () => {
              closeContextMenu();
              openLinkCaseModal(record);
            },
          });
          items.push({
            key: "rename",
            label: renderContextMenuItemLabel(EDIT_ICON, "Rename"),
            onClick: () => {
              closeContextMenu();
              setRenameRecord(record);
              renameForm.setFieldsValue({
                name: record.title || record.name || "",
              });
            },
          });
          items.push({
            key: "delete",
            label: renderContextMenuItemLabel(
              DELETE_ICON,
              "Delete Case Study",
              "#cf1322",
            ),
            onClick: () => {
              closeContextMenu();
              handleDeleteTemplate(record);
            },
          });
          return items;
        }

        if (isTemplate) {
          items.push({
            key: "rename",
            label: renderContextMenuItemLabel(EDIT_ICON, "Rename"),
            onClick: () => {
              closeContextMenu();
              setRenameRecord(record);
              renameForm.setFieldsValue({
                name: record.title || record.name || "",
              });
            },
          });
          items.push({
            key: "delete",
            label: renderContextMenuItemLabel(
              DELETE_ICON,
              "Delete document type",
              "#cf1322",
            ),
            onClick: () => {
              closeContextMenu();
              handleDeleteTemplate(record);
            },
          });
          return items;
        }

        if (activeSpace === "trash") {
          items.push({
            key: "restore",
            label: renderContextMenuItemLabel(RESTORE_ICON, "Restore"),
            onClick: () => {
              closeContextMenu();
              handleRestoreRecord(record);
            },
          });
          items.push({
            key: "permanent_delete",
            label: renderContextMenuItemLabel(
              DELETE_ICON,
              "Permanently Delete",
              "#cf1322",
            ),
            onClick: () => {
              closeContextMenu();
              handlePermanentDelete(record);
            },
          });
          return items;
        }

        const { canRename: rawCanRename, canMove, canDelete, canShare, canManagePermissions } =
          getRecordPerms(record);
        const canRename = rawCanRename && !isRenameLockedFolder(record);

        if (!isFolder) {
          items.push({
            key: "preview",
            label: renderContextMenuItemLabel(EYE_ICON, "Preview"),
            onClick: () => {
              closeContextMenu();
              previewRecordFile(record);
            },
          });
          items.push({
            key: "download",
            label: renderContextMenuItemLabel(DOWNLOAD_ICON, "Download"),
            onClick: () => {
              closeContextMenu();
              openRecordFile(record);
            },
          });
          if (canShare) {
            items.push({
              key: "share",
              label: renderContextMenuItemLabel(USER_ICON, "Share"),
              onClick: () => {
                closeContextMenu();
                setShareFileRecord(record);
              },
            });
          }
        }

        if (canRename) {
          items.push({
            key: "rename",
            label: renderContextMenuItemLabel(EDIT_ICON, "Rename"),
            onClick: () => {
              closeContextMenu();
              setRenameRecord(record);
              renameForm.setFieldsValue({
                name: record.name || record.title || "",
              });
            },
          });
        }

        if (canMove) {
          items.push({
            key: "move",
            label: renderContextMenuItemLabel(MOVE_ICON, "Move"),
            onClick: () => {
              closeContextMenu();
              setMoveRecord(record);
              setMoveTargetId("root");
            },
          });
        }

        if (isFolder && canManagePermissions) {
          items.push({
            key: "permission",
            label: renderContextMenuItemLabel(LOCK_ICON, "Permissions"),
            onClick: () => {
              closeContextMenu();
              setPermissionFolder(record);
            },
          });
        }

        if (canDelete) {
          items.push({
            key: "delete",
            label: renderContextMenuItemLabel(
              DELETE_ICON,
              "Move to Trash",
              "#cf1322",
            ),
            onClick: () => {
              closeContextMenu();
              if (isFolder) showDeleteConfirm(record);
              else handleDeleteFile(record);
            },
          });
        }

        return items;
      },
      [
        getRecordPerms,
        currentUserState,
        activeSpace,
        openLegalReferenceDetail,
        openLinkCaseModal,
      ],
    );

    const getRecordPathString = useCallback(
      (record) => {
        if (!record) return "—";
        const pathItems = [];

        let parentFolderId = record.folderId;
        if (record._type === "folder") {
          parentFolderId = getFolderParentId(record);
        }

        let currentId = parentFolderId;
        while (
          currentId &&
          currentId !== "root" &&
          folderMap.has(String(currentId))
        ) {
          const folder = folderMap.get(String(currentId));
          pathItems.unshift(folder.name || "Folder");
          currentId = getFolderParentId(folder);
        }

        let rootName = "Home";
        const storage =
          record.storageType ||
          (parentFolderId && folderMap.get(String(parentFolderId))?.storageType);

        if (storage === LEGAL_STUDY_STORAGE_TYPE) {
          rootName = LEGAL_STUDY_LABEL;
        } else if (storage === "company_shared") {
          rootName = activeCompany
            ? getCompanyName(activeCompany)
            : "Shared Folder";
        } else {
          const typeId =
            getRecordDocumentType(record) ||
            (parentFolderId &&
              getRecordDocumentType(folderMap.get(String(parentFolderId))));
          if (typeId) {
            const type = documentTypes.find((t) => t.id === String(typeId));
            rootName = type ? `Library / ${type.label}` : "Library";
          } else {
            rootName = "Shared Folder";
          }
        }

        pathItems.unshift(rootName);
        return pathItems.join(" / ");
      },
      [folderMap, activeCompany, documentTypes, getRecordDocumentType],
    );

    const tableColumns = useMemo(() => {
      const hasFolders = tableData.some((r) => r._type === "folder");
      const hasFiles = tableData.some((r) => r._type === "file");
      const isAllFolders = tableData.length > 0 && hasFolders && !hasFiles;
      const isAllFiles = tableData.length > 0 && hasFiles && !hasFolders;
      const currentUser = currentUserState;

      // Shared action cell renderer for folder rows
      const renderFolderActions = (record) => {
        if (activeSpace === "trash") {
          return (
            <div
              style={{
                display: "inline-flex",
                justifyContent: "flex-end",
                gap: 6,
              }}
            >
              <Tooltip title="Restore">
                <Button
                  size="small"
                  icon={RESTORE_ICON}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRestoreRecord(record);
                  }}
                  style={{
                    color: "#3B6D11",
                    borderColor: "#c3e6cb",
                    background: "#e2f0d9",
                  }}
                />
              </Tooltip>
              <Tooltip title="Permanently Delete">
                <Button
                  size="small"
                  danger
                  icon={DELETE_ICON}
                  onClick={(event) => {
                    event.stopPropagation();
                    handlePermanentDelete(record);
                  }}
                />
              </Tooltip>
            </div>
          );
        }
        const { canRename: rawCanRename, canMove, canDelete, canManagePermissions } =
          getRecordPerms(record);
        const canRename = rawCanRename && !isRenameLockedFolder(record);
        if (!canRename && !canMove && !canDelete && !canManagePermissions)
          return null;
        return (
          <div
            style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}
          >
            {canManagePermissions && (
              <Tooltip title="Permissions">
                <Button
                  size="small"
                  icon={LOCK_ICON}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPermissionFolder(record);
                  }}
                />
              </Tooltip>
            )}
            {canRename && (
              <Tooltip title="Rename">
                <Button
                  size="small"
                  icon={EDIT_ICON}
                  onClick={(event) => {
                    event.stopPropagation();
                    startEditTitle(record);
                  }}
                />
              </Tooltip>
            )}
            {canMove && (
              <Tooltip title="Move">
                <Button
                  size="small"
                  icon={MOVE_ICON}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMoveRecord(record);
                    setMoveTargetId("root");
                  }}
                />
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Move to Trash">
                <Button
                  size="small"
                  danger
                  icon={DELETE_ICON}
                  onClick={(event) => {
                    event.stopPropagation();
                    showDeleteConfirm(record);
                  }}
                />
              </Tooltip>
            )}
          </div>
        );
      };

      // Shared action cell renderer for file rows
      const renderFileActions = (record) => {
        if (activeSpace === "trash") {
          return (
            <div
              style={{
                display: "inline-flex",
                justifyContent: "flex-end",
                gap: 6,
              }}
            >
              <Tooltip title="Restore">
                <Button
                  size="small"
                  icon={RESTORE_ICON}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRestoreRecord(record);
                  }}
                  style={{
                    color: "#3B6D11",
                    borderColor: "#c3e6cb",
                    background: "#e2f0d9",
                  }}
                />
              </Tooltip>
              <Tooltip title="Permanently Delete">
                <Button
                  size="small"
                  danger
                  icon={DELETE_ICON}
                  onClick={(event) => {
                    event.stopPropagation();
                    handlePermanentDelete(record);
                  }}
                />
              </Tooltip>
            </div>
          );
        }
        const { canShare } = getRecordPerms(record);
        return (
          <div
            style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}
          >
            <Tooltip title="Preview">
              <Button
                size="small"
                icon={EYE_ICON}
                onClick={(event) => {
                  event.stopPropagation();
                  previewRecordFile(record);
                }}
              />
            </Tooltip>
            <Tooltip title="Download">
              <Button
                size="small"
                icon={DOWNLOAD_ICON}
                onClick={(event) => {
                  event.stopPropagation();
                  openRecordFile(record);
                }}
              />
            </Tooltip>
            {canShare && (
              <Tooltip title="Share">
                <Button
                  size="small"
                  icon={USER_ICON}
                  onClick={(event) => {
                    event.stopPropagation();
                    setShareFileRecord(record);
                  }}
                />
              </Tooltip>
            )}
          </div>
        );
      };

      if (activeSpace === "legal_reference" && !activeLegalReferenceId) {
        return [
          {
            title: "STT",
            key: "stt",
            width: 60,
            align: "center",
            render: (_, __, index) => index + 1,
          },
          {
            title: "Reference Code",
            key: "referenceCode",
            width: 150,
            sorter: (a, b) =>
              (a.referenceCode || "").localeCompare(b.referenceCode || "", "vi"),
            render: (_, record) => (
              <Text style={{ fontWeight: 600, color: "#111827" }}>
                {record.referenceCode || "—"}
              </Text>
            ),
          },
          {
            title: "Case Study Name",
            key: "title",
            minWidth: 250,
            sorter: (a, b) => (a.title || "").localeCompare(b.title || "", "vi"),
            render: (_, record) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openLegalReferenceDetail(record);
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: FONT,
                  fontWeight: 700,
                  color: "#185FA5",
                  textAlign: "left",
                }}
              >
                {record.title || "—"}
              </button>
            ),
          },
          {
            title: "Case Summary",
            key: "description",
            minWidth: 200,
            render: (_, record) => (
              <Text type="secondary">{record.description || "—"}</Text>
            ),
          },
          {
            title: "Linked Cases",
            key: "linkedCases",
            minWidth: 200,
            render: (_, record) => (
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {(record.cases || []).length === 0 ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: "#9CA3AF",
                      fontStyle: "italic",
                    }}
                  >
                    Not linked
                  </span>
                ) : (
                  (() => {
                    const list = record.cases || [];
                    const visibleCount = 2;
                    const visibleItems = list.slice(0, visibleCount);
                    const extraItems = list.slice(visibleCount);
                    const getDisplayName = (project) => {
                      return project.projectName
                        ? `${project.caseCode ? `${project.caseCode} - ` : ""}${project.projectName}`
                        : `Case #${extractId(project)}`;
                    };
                    return (
                      <React.Fragment>
                        {visibleItems.map((project, idx) => (
                          <Tag
                            key={idx}
                            color="default"
                            style={{
                              borderRadius: 4,
                              margin: 0,
                              maxWidth: 150,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={getDisplayName(project)}
                          >
                            {getDisplayName(project)}
                          </Tag>
                        ))}
                        {extraItems.length > 0 && (
                          <Tooltip
                            title={
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 4,
                                  maxHeight: 250,
                                  overflowY: "auto",
                                }}
                              >
                                {extraItems.map((project, idx) => (
                                  <div key={idx}>{getDisplayName(project)}</div>
                                ))}
                              </div>
                            }
                          >
                            <Tag
                              color="default"
                              style={{
                                borderRadius: 4,
                                margin: 0,
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              +{extraItems.length} more
                            </Tag>
                          </Tooltip>
                        )}
                      </React.Fragment>
                    );
                  })()
                )}
              </div>
            ),
          },
          {
            title: "Actions",
            key: "actions",
            width: 100,
            align: "right",
            render: (_, record) => (
              <div
                style={{
                  display: "inline-flex",
                  justifyContent: "flex-end",
                  gap: 6,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip title="Link Case">
                  <Button
                    size="small"
                    icon={LINK_CASE_ICON}
                    onClick={(e) => {
                      e.stopPropagation();
                      openLinkCaseModal(record);
                    }}
                  />
                </Tooltip>
                <Tooltip title="Delete Case Study">
                  <Button
                    size="small"
                    danger
                    icon={DELETE_ICON}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(record);
                    }}
                  />
                </Tooltip>
              </div>
            ),
          },
        ];
      }

      if (isAllFolders) {
        if (activeSpace === "trash") {
          return [
            {
              title: "Folder Name",
              key: "name",
              minWidth: 250,
              render: (_, record) => renderNameCell(record, false),
              sorter: (a, b) => (a.name || "").localeCompare(b.name || "", "vi"),
            },
            {
              title: "Description",
              key: "description",
              minWidth: 200,
              render: (_, record) => (
                <Text type="secondary">{record.description || "—"}</Text>
              ),
            },
            {
              title: "Size",
              key: "size",
              width: 100,
              sorter: (a, b) =>
                getFolderSize(extractId(a)) - getFolderSize(extractId(b)),
              render: (_, record) => (
                <Text type="secondary">
                  {formatBytes(getFolderSize(extractId(record)))}
                </Text>
              ),
            },
            {
              title: "Uploaded By",
              key: "createdBy",
              width: 180,
              render: (_, record) => (
                <Text type="secondary">{getUploadUserName(record)}</Text>
              ),
            },
            {
              title: "Upload Date",
              key: "createdAt",
              width: 150,
              sorter: (a, b) =>
                new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
              render: (_, record) => (
                <Text type="secondary">{formatDate(getValidDate(record))}</Text>
              ),
            },
            {
              title: "Deleted By",
              key: "deletedBy",
              width: 180,
              render: (_, record) => (
                <Text type="secondary">{getDeletedUserName(record)}</Text>
              ),
            },
            {
              title: "Deletion Date",
              key: "deletedAt",
              width: 160,
              sorter: (a, b) =>
                new Date(a.deletedAt || a.updatedAt || 0) -
                new Date(b.deletedAt || b.updatedAt || 0),
              render: (_, record) => (
                <Text type="secondary">
                  {formatDateTime(
                    record.deletedAt || record.updatedAt || record.deleted_at,
                  )}
                </Text>
              ),
            },
            {
              title: "Actions",
              key: "actions",
              width: 120,
              align: "right",
              render: (_, record) => renderFolderActions(record),
            },
          ];
        }

        return [
          {
            title: "Folder Name",
            key: "name",
            minWidth: 250,
            render: (_, record) => renderNameCell(record, false),
            sorter: (a, b) => (a.name || "").localeCompare(b.name || "", "vi"),
          },
          {
            title: "Description",
            key: "description",
            minWidth: 200,
            render: (_, record) => (
              <Text type="secondary">{record.description || "—"}</Text>
            ),
          },
          {
            title: "Size",
            key: "size",
            width: 100,
            sorter: (a, b) =>
              getFolderSize(extractId(a)) - getFolderSize(extractId(b)),
            render: (_, record) => (
              <Text type="secondary">
                {formatBytes(getFolderSize(extractId(record)))}
              </Text>
            ),
          },
          {
            title: "Created Date",
            key: "createdAt",
            width: 150,
            sorter: (a, b) =>
              new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
            render: (_, record) => (
              <Text type="secondary">{formatDate(getValidDate(record))}</Text>
            ),
          },
          {
            title: "Created By",
            key: "createdBy",
            width: 180,
            render: (_, record) => (
              <Text type="secondary">{getUploadUserName(record)}</Text>
            ),
          },
          {
            title: "Actions",
            key: "actions",
            width: 120,
            align: "right",
            render: (_, record) => renderFolderActions(record),
          },
        ];
      }

      // Cột thông tin tài liệu (loại, mã, ngày, các bên liên quan) — cùng bộ
      // field được thu thập ở modal upload (DocumentUploadFieldsModal).
      const buildDocMetaColumns = () => [
        {
          title: "Document Type",
          key: "documentType",
          width: 140,
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" ? record.documentType || "—" : "—"}
            </Text>
          ),
        },
        {
          title: "Document Code",
          key: "documentCode",
          width: 140,
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" ? record.documentCode || "—" : "—"}
            </Text>
          ),
        },
        {
          title: "Opening Date",
          key: "openingDate",
          width: 120,
          sorter: (a, b) =>
            new Date(a.openingDate || 0) - new Date(b.openingDate || 0),
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" && record.openingDate
                ? formatDate(record.openingDate)
                : "—"}
            </Text>
          ),
        },
        {
          title: "Signed Date",
          key: "signedAt",
          width: 120,
          sorter: (a, b) =>
            new Date(a.signedAt || 0) - new Date(b.signedAt || 0),
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" && record.signedAt
                ? formatDate(record.signedAt)
                : "—"}
            </Text>
          ),
        },
        {
          title: "Effective Date",
          key: "effectiveAt",
          width: 130,
          sorter: (a, b) =>
            new Date(a.effectiveAt || 0) - new Date(b.effectiveAt || 0),
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" && record.effectiveAt
                ? formatDate(record.effectiveAt)
                : "—"}
            </Text>
          ),
        },
        {
          title: "Sender",
          key: "senderName",
          width: 150,
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" ? record.senderName || "—" : "—"}
            </Text>
          ),
        },
        {
          title: "Recipient",
          key: "recipientName",
          width: 150,
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" ? record.recipientName || "—" : "—"}
            </Text>
          ),
        },
      ];

      if (isAllFiles) {
        if (activeSpace === "trash") {
          return [
            {
              title: "File Name",
              key: "name",
              minWidth: 250,
              render: (_, record) => renderNameCell(record, true),
              sorter: (a, b) =>
                (a.name || a.title || "").localeCompare(
                  b.name || b.title || "",
                  "vi",
                ),
            },
            {
              title: "Description",
              key: "description",
              minWidth: 200,
              render: (_, record) => (
                <Text type="secondary">{record.description || "—"}</Text>
              ),
            },
            {
              title: "Size",
              key: "size",
              width: 100,
              sorter: (a, b) =>
                (getAttachment(a)?.size || 0) - (getAttachment(b)?.size || 0),
              render: (_, record) => (
                <Text type="secondary">
                  {formatBytes(getAttachment(record)?.size)}
                </Text>
              ),
            },
            {
              title: "Uploaded By",
              key: "uploadedBy",
              width: 180,
              render: (_, record) => (
                <Text type="secondary">{getUploadUserName(record)}</Text>
              ),
            },
            {
              title: "Upload Date",
              key: "uploadedAt",
              width: 160,
              sorter: (a, b) =>
                new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
              render: (_, record) => (
                <Text type="secondary">
                  {formatDateTime(getValidDate(record))}
                </Text>
              ),
            },
            {
              title: "Deleted By",
              key: "deletedBy",
              width: 180,
              render: (_, record) => (
                <Text type="secondary">{getDeletedUserName(record)}</Text>
              ),
            },
            {
              title: "Deletion Date",
              key: "deletedAt",
              width: 160,
              sorter: (a, b) =>
                new Date(a.deletedAt || a.updatedAt || 0) -
                new Date(b.deletedAt || b.updatedAt || 0),
              render: (_, record) => (
                <Text type="secondary">
                  {formatDateTime(
                    record.deletedAt || record.updatedAt || record.deleted_at,
                  )}
                </Text>
              ),
            },
            {
              title: "Actions",
              key: "actions",
              width: 120,
              align: "right",
              render: (_, record) => renderFileActions(record),
            },
          ];
        }

        return [
          {
            title: "File Name",
            key: "name",
            minWidth: 250,
            render: (_, record) => renderNameCell(record, true),
            sorter: (a, b) =>
              (a.name || a.title || "").localeCompare(
                b.name || b.title || "",
                "vi",
              ),
          },
          {
            title: "Description",
            key: "description",
            minWidth: 200,
            render: (_, record) => (
              <Text type="secondary">{record.description || "—"}</Text>
            ),
          },
          ...buildDocMetaColumns(),
          {
            title: "Size",
            key: "size",
            width: 100,
            sorter: (a, b) =>
              (getAttachment(a)?.size || 0) - (getAttachment(b)?.size || 0),
            render: (_, record) => (
              <Text type="secondary">
                {formatBytes(getAttachment(record)?.size)}
              </Text>
            ),
          },
          {
            title: "Upload Date",
            key: "uploadedAt",
            width: 160,
            sorter: (a, b) =>
              new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
            render: (_, record) => (
              <Text type="secondary">{formatDateTime(getValidDate(record))}</Text>
            ),
          },
          {
            title: "Uploaded By",
            key: "uploadedBy",
            width: 180,
            render: (_, record) => (
              <Text type="secondary">{getUploadUserName(record)}</Text>
            ),
          },
          {
            title: "Actions",
            key: "actions",
            width: 120,
            align: "right",
            render: (_, record) => renderFileActions(record),
          },
        ];
      }

      // Default mixed columns
      if (activeSpace === "trash") {
        return [
          {
            title: "Name",
            key: "name",
            minWidth: 250,
            render: (_, record) => renderNameCell(record, true),
            sorter: (a, b) =>
              (a.name || a.title || "").localeCompare(
                b.name || b.title || "",
                "vi",
              ),
          },
          {
            title: "Description",
            key: "description",
            minWidth: 200,
            render: (_, record) => (
              <Text type="secondary">{record.description || "—"}</Text>
            ),
          },
          {
            title: "Size",
            key: "size",
            width: 100,
            sorter: (a, b) => {
              const sizeA =
                a._type === "folder"
                  ? getFolderSize(extractId(a))
                  : getAttachment(a)?.size || 0;
              const sizeB =
                b._type === "folder"
                  ? getFolderSize(extractId(b))
                  : getAttachment(b)?.size || 0;
              return sizeA - sizeB;
            },
            render: (_, record) => {
              const size =
                record._type === "folder"
                  ? getFolderSize(extractId(record))
                  : getAttachment(record)?.size || 0;
              return <Text type="secondary">{formatBytes(size)}</Text>;
            },
          },
          {
            title: "Created Date",
            key: "createdAt",
            width: 120,
            sorter: (a, b) =>
              new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
            render: (_, record) =>
              record._type === "folder" ? (
                <Text type="secondary">{formatDate(getValidDate(record))}</Text>
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: "Uploaded By",
            key: "uploadedBy",
            width: 150,
            render: (_, record) =>
              record._type === "file" ? (
                <Text type="secondary">{getUploadUserName(record)}</Text>
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: "Upload Date",
            key: "uploadedAt",
            width: 150,
            sorter: (a, b) =>
              new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
            render: (_, record) =>
              record._type === "file" ? (
                <Text type="secondary">
                  {formatDateTime(getValidDate(record))}
                </Text>
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: "Deleted By",
            key: "deletedBy",
            width: 150,
            render: (_, record) => (
              <Text type="secondary">{getDeletedUserName(record)}</Text>
            ),
          },
          {
            title: "Deletion Date",
            key: "deletedAt",
            width: 150,
            sorter: (a, b) =>
              new Date(a.deletedAt || a.updatedAt || 0) -
              new Date(b.deletedAt || b.updatedAt || 0),
            render: (_, record) => (
              <Text type="secondary">
                {formatDateTime(
                  record.deletedAt || record.updatedAt || record.deleted_at,
                )}
              </Text>
            ),
          },
          {
            title: "Actions",
            key: "actions",
            width: 120,
            align: "right",
            render: (_, record) =>
              record._type === "folder"
                ? renderFolderActions(record)
                : renderFileActions(record),
          },
        ];
      }

      return [
        {
          title: "Name",
          key: "name",
          minWidth: 250,
          render: (_, record) => renderNameCell(record, true),
          sorter: (a, b) =>
            (a.name || a.title || "").localeCompare(
              b.name || b.title || "",
              "vi",
            ),
        },
        {
          title: "Description",
          key: "description",
          minWidth: 200,
          render: (_, record) => (
            <Text type="secondary">{record.description || "—"}</Text>
          ),
        },
        ...buildDocMetaColumns(),
        {
          title: "Size",
          key: "size",
          width: 100,
          sorter: (a, b) => {
            const sizeA =
              a._type === "folder"
                ? getFolderSize(extractId(a))
                : getAttachment(a)?.size || 0;
            const sizeB =
              b._type === "folder"
                ? getFolderSize(extractId(b))
                : getAttachment(b)?.size || 0;
            return sizeA - sizeB;
          },
          render: (_, record) => {
            const size =
              record._type === "folder"
                ? getFolderSize(extractId(record))
                : getAttachment(record)?.size || 0;
            return <Text type="secondary">{formatBytes(size)}</Text>;
          },
        },
        {
          title: "Created Date",
          key: "createdAt",
          width: 120,
          sorter: (a, b) =>
            new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
          render: (_, record) =>
            record._type === "folder" ? (
              <Text type="secondary">{formatDate(getValidDate(record))}</Text>
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
        {
          title: "Upload Date",
          key: "uploadedAt",
          width: 150,
          sorter: (a, b) =>
            new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
          render: (_, record) =>
            record._type === "file" ? (
              <Text type="secondary">{formatDateTime(getValidDate(record))}</Text>
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
        {
          title: "Uploaded By",
          key: "uploadedBy",
          width: 150,
          render: (_, record) =>
            record._type === "file" ? (
              <Text type="secondary">{getUploadUserName(record)}</Text>
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
        {
          title: "Actions",
          key: "actions",
          width: 120,
          align: "right",
          render: (_, record) =>
            record._type === "folder"
              ? renderFolderActions(record)
              : renderFileActions(record),
        },
      ];
    }, [
      tableData,
      documentTypes,
      getTypeConfig,
      getRecordDocumentType,
      editingTitleId,
      editingTitleValue,
      currentUserState,
      currentLawyerId,
      visibleFolders,
      getRecordPathString,
      activeSpace,
      getFolderSize,
      getRecordPerms,
      openLegalReferenceDetail,
      openLinkCaseModal,
    ]);

    const rowDragProps = (record) => {
      const canDrag =
        activeSpace !== "trash" &&
        record._type !== "legal_reference_record" &&
        getRecordPerms(record).canMove;
      return {
        draggable: canDrag,
        onDragStart: (event) => {
          if (!canDrag) {
            event.preventDefault();
            return;
          }
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(
            "application/json",
            JSON.stringify({ type: record._type, id: extractId(record) }),
          );
          setDragState({
            sourceKey: record._key,
            sourceType: record._type,
            targetKey: null,
            position: null,
          });
        },
        onDragOver: (event) => {
          if (hasExternalFiles(event.dataTransfer)) {
            event.preventDefault();
            event.stopPropagation();
            const targetFolderId =
              record._type === "folder"
                ? extractId(record)
                : selectedFolderId;
            const canDrop = canUploadDroppedItems(targetFolderId);
            event.dataTransfer.dropEffect = canDrop ? "copy" : "none";
            setExternalDropActive(canDrop);
            setExternalDropTargetKey(
              canDrop && record._type === "folder" ? record._key : null,
            );
            return;
          }
          if (!dragState.sourceKey) return;
          event.preventDefault();
          const position = getDropPosition(event, record);
          const destinationFolderId =
            record._type === "folder" ? extractId(record) : record.folderId;
          const canDrop =
            getFolderPermsById(destinationFolderId).canCreate &&
            !(
              dragState.sourceType === "folder" &&
              record._type !== "folder"
            );
          event.dataTransfer.dropEffect = canDrop ? "move" : "none";
          if (!canDrop) return;
          setDragState((previous) =>
            previous.targetKey === record._key &&
            previous.position === position
              ? previous
              : {
                  ...previous,
                  targetKey: record._key,
                  position,
                },
          );
        },
        onDrop: (event) => handleDropOnRecord(event, record),
        onDragEnd: clearDragState,
        onDragLeave: (event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          if (externalDropTargetKey === record._key) {
            setExternalDropTargetKey(null);
          }
          setDragState((previous) =>
            previous.targetKey === record._key
              ? { ...previous, targetKey: null, position: null }
              : previous,
          );
        },
        onContextMenu: (e) => {
          e.preventDefault();
          e.stopPropagation();
          const items = renderContextMenuItems(record);
          if (items.length > 0) {
            setContextMenuState({
              open: true,
              x: e.clientX,
              y: e.clientY,
              record,
            });
          }
        },
        onClick: () => {
          if (record._type === "legal_reference_record") {
            openLegalReferenceDetail(record);
          }
        },
        style: getDropTargetStyle(record),
      };
    };

    const handleNewActionClick = ({ key }) => {
      if (!currentFolderPerms.canCreate) {
        message.warning("You only have view access to this folder");
        return;
      }
      if (
        activeSpace !== LEGAL_STUDY_STORAGE_TYPE &&
        activeSpace !== MY_DOCUMENT_STORAGE_TYPE &&
        activeSpace !== "shared_with_me" &&
        !requireCompany()
      )
        return;
      if (key === "folder") {
        folderForm.resetFields();
        setIsFolderOpen(true);
        return;
      }
      if (key === "upload") {
        directFileTargetRef.current = selectedFolderId;
        fileInputRef.current?.click();
        return;
      }
      if (key === "upload_folder") {
        folderInputRef.current?.click();
      }
    };

    const newMenu = {
      items: [
        {
          key: "folder",
          label: renderNewMenuLabel(TYPE_ICONS.folder, "New Folder"),
        },
        { key: "upload", label: renderNewMenuLabel(TYPE_ICONS.upload, "Upload file") },
        {
          key: "upload_folder",
          label: renderNewMenuLabel(TYPE_ICONS.folder, "Upload Folder"),
        },
      ],
      onClick: handleNewActionClick,
    };

    const activityColumns = useMemo(
      () => [
        {
          title: "Activity Type",
          dataIndex: "action",
          key: "action",
          width: 170,
          render: (text, log) => {
            const info = resolveActivityActionInfo(log);
            return (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 16,
                  background: info.bg,
                  border: `1px solid ${info.border}`,
                  fontSize: 12,
                  fontWeight: 500,
                  color: info.color,
                  whiteSpace: "nowrap",
                }}
              >
                {info.icon}
                {info.label}
              </span>
            );
          },
        },
        {
          title: "Performed By",
          dataIndex: "changedByName",
          key: "changedByName",
          width: 200,
          render: (name) => {
            const displayName = name || "System";
            const initials =
              displayName
                .split(" ")
                .map((w) => w[0])
                .filter(Boolean)
                .slice(-2)
                .join("")
                .toUpperCase() || "?";
            const palettes = [
              ["#EEEDFE", "#3C3489"],
              ["#E1F5EE", "#085041"],
              ["#FAEEDA", "#633806"],
              ["#FAECE7", "#712B13"],
              ["#EAF3DE", "#27500A"],
            ];
            const [bg, fg] =
              palettes[(displayName.charCodeAt(0) || 0) % palettes.length];
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: bg,
                    color: fg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <span style={{ fontSize: 13, color: "#1F2937", fontWeight: 500 }}>
                  {displayName}
                </span>
              </div>
            );
          },
        },
        {
          title: "Document",
          key: "file",
          width: 280,
          render: (text, log) => {
            const isFolder = log.collectionName === "Folder";
            const folderRecord = isFolder
              ? folders.find(
                  (f) => String(extractId(f.id)) === String(log.recordId),
                )
              : null;
            const docRecord = !isFolder
              ? documents.find(
                  (d) => String(extractId(d.id)) === String(log.recordId),
                )
              : null;
            const name =
              log.resolvedTitle ||
              log.recordTitle ||
              folderRecord?.name ||
              (docRecord ? getDocTitle(docRecord) : null) ||
              log.newValue ||
              log.oldValue ||
              "—";

            let icon = isFolder ? TYPE_ICONS.folder : TYPE_ICONS.default;
            if (!isFolder && docRecord) {
              const ext = getFileExtension(docRecord);
              icon = getFileSvgIcon(ext);
            }

            const canPreview = docRecord && getRecordFileUrl(docRecord);

            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span style={{ flexShrink: 0, display: "inline-flex" }}>
                  {icon}
                </span>
                {canPreview ? (
                  <span
                    onClick={() => previewRecordFile(docRecord)}
                    style={{
                      fontSize: 13,
                      color: "#185FA5",
                      fontWeight: 600,
                      cursor: "pointer",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = "underline";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = "none";
                    }}
                  >
                    {name}
                  </span>
                ) : (
                  <span
                    style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}
                  >
                    {name}
                  </span>
                )}
              </div>
            );
          },
        },
        {
          title: "Change Description",
          key: "desc",
          render: (text, log) => {
            const desc = resolveActivityDesc(log, folders, documents);
            return <div style={{ fontSize: 13, color: "#4B5563" }}>{desc}</div>;
          },
        },
        {
          title: "Time",
          dataIndex: "changedAt",
          key: "changedAt",
          width: 160,
          render: (iso) => {
            if (!iso) return <span style={{ color: "#9CA3AF" }}>—</span>;
            const d = new Date(iso);
            const formatted = d.toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <span style={{ fontSize: 13, color: "#4B5563" }}>{formatted}</span>
            );
          },
        },
      ],
      [
        documents,
        folders,
        resolveActivityActionInfo,
        resolveActivityDesc,
        previewRecordFile,
      ],
    );

    if (loading && companies.length === 0 && documents.length === 0) {
      return (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      );
    }

    return (
      <React.Fragment>
        <Dropdown
          menu={{
            items: contextMenuState.record
              ? renderContextMenuItems(contextMenuState.record)
              : [],
          }}
          open={contextMenuState.open}
          onOpenChange={(v) => {
            if (!v) closeContextMenu();
          }}
          trigger={["contextMenu"]}
        >
          <div
            style={{
              position: "fixed",
              left: contextMenuState.x,
              top: contextMenuState.y,
              width: 1,
              height: 1,
              zIndex: 9999,
              pointerEvents: "none",
            }}
          />
        </Dropdown>

        {/* Entity gallery right-click context menu */}
        <Dropdown
          menu={{
            items: entityContextMenu.record
              ? (() => {
                  const rec = entityContextMenu.record;
                  const space = entityContextMenu.space;
                  const recId = String(extractId(rec));
                  const items = [];
                  if (space === "customer" && !activeCustomerId) {
                    items.push({
                      key: "open",
                      label: renderContextMenuItemLabel(EYE_ICON, "Open"),
                      onClick: () => {
                        setEntityContextMenu((p) => ({ ...p, open: false }));
                        setActiveCustomerId(recId);
                        setActiveCaseId(null);
                        setSelectedFolderId("root");
                      },
                    });
                  } else if (space === "customer" && activeCustomerId) {
                    // Cards in this gallery represent the case's ROOT FOLDER
                    // itself (rec: entry.folder — see the "gộp thẳng chọn
                    // Case + xem folder gốc" merge), so recId here is a
                    // folder id, not a project id. Must look entries up by
                    // folder, matching openCustomerCaseRootFolder's own
                    // left-click behavior below.
                    items.push({
                      key: "open",
                      label: renderContextMenuItemLabel(EYE_ICON, "Open"),
                      onClick: () => {
                        setEntityContextMenu((p) => ({ ...p, open: false }));
                        const caseRootEntry = customerCaseRootFolders.find(
                          (item) => String(extractId(item.folder)) === recId,
                        );
                        if (!caseRootEntry) return;
                        setActiveCaseId(String(extractId(caseRootEntry.project)));
                        setSelectedFolderId(String(extractId(caseRootEntry.folder)));
                      },
                    });
                    items.push({ type: "divider" });
                    items.push({
                      key: "permission",
                      label: renderContextMenuItemLabel(LOCK_ICON, "Permissions"),
                      onClick: () => {
                        setEntityContextMenu((p) => ({ ...p, open: false }));
                        const caseRootEntry = customerCaseRootFolders.find(
                          (item) => String(extractId(item.folder)) === recId,
                        );
                        if (!caseRootEntry) {
                          message.warning("Could not find this case's root folder.");
                          return;
                        }
                        setPermissionFolder(caseRootEntry.folder);
                      },
                    });
                  } else if (space === "legal_reference") {
                    items.push({
                      key: "open",
                      label: renderContextMenuItemLabel(EYE_ICON, "Open"),
                      onClick: () => {
                        setEntityContextMenu((p) => ({ ...p, open: false }));
                        setActiveLegalReferenceId(recId);
                        setSelectedFolderId("root");
                      },
                    });
                    items.push({ type: "divider" });
                    items.push({
                      key: "rename",
                      label: renderContextMenuItemLabel(EDIT_ICON, "Rename"),
                      onClick: () => {
                        setEntityContextMenu((p) => ({ ...p, open: false }));
                        setEditTemplateRecord(rec);
                        editTemplateForm.setFieldsValue({
                          title: rec.title || "",
                        });
                      },
                    });
                    items.push({
                      key: "delete",
                      label: renderContextMenuItemLabel(
                        DELETE_ICON,
                        <span style={{ color: "#dc2626" }}>Delete</span>,
                      ),
                      onClick: () => {
                        setEntityContextMenu((p) => ({ ...p, open: false }));
                        Modal.confirm({
                          title: "Delete Case Study?",
                          content: `Delete "${getLegalReferenceDisplayName(rec)}" cannot be undone.`,
                          okText: "Delete",
                          okType: "danger",
                          cancelText: "Cancel",
                          onOk: async () => {
                            try {
                              for (const url of [
                                `legalReference:destroy?filterByTk=${recId}`,
                                `legalReferences:destroy?filterByTk=${recId}`,
                              ]) {
                                try {
                                  await ctx.api.request({ url, method: "POST" });
                                  break;
                                } catch {}
                              }
                              message.success("Case Study deleted");
                              loadData();
                            } catch {
                              message.error("Delete failed");
                            }
                          },
                        });
                      },
                    });
                  }
                  return items;
                })()
              : [],
          }}
          open={entityContextMenu.open}
          onOpenChange={(v) => {
            if (!v) setEntityContextMenu((p) => ({ ...p, open: false }));
          }}
          trigger={["contextMenu"]}
        >
          <div
            style={{
              position: "fixed",
              left: entityContextMenu.x,
              top: entityContextMenu.y,
              width: 1,
              height: 1,
              zIndex: 9999,
              pointerEvents: "none",
            }}
          />
        </Dropdown>

        <Layout
          style={{
            background: "#fff",
            minHeight: "720px",
            fontFamily: FONT,
            borderRadius: 8,
            border: "0.5px solid #e5e7eb",
            overflow: "hidden",
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          {!sidebarCollapsed && (
            <div
              style={{
                width: 260,
                minWidth: 200,
                alignSelf: "flex-start",
                position: "sticky",
                top: 0,
                background: "#FFFFFF",
                borderRight: "0.5px solid #E5E7EB",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {/* ══ HEADER ══ */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  padding: "6px 10px",
                  borderBottom: "0.5px solid #E5E7EB",
                  flexShrink: 0,
                }}
              >
                <Tooltip title="Collapse sidebar">
                  <Button
                    type="text"
                    icon={SIDEBAR_ICON}
                    onClick={() => setSidebarCollapsed(true)}
                    style={{
                      width: 22,
                      height: 22,
                      minWidth: 22,
                      padding: 0,
                      color: "#9CA3AF",
                      flexShrink: 0,
                    }}
                  />
                </Tooltip>
              </div>

              {/* ══ FLAT NAV MENU (scrollable) ══ */}
              <div
                style={{
                  overflowY: "auto",
                  maxHeight: "calc(100vh - 120px)",
                  paddingTop: 4,
                }}
              >
                {/* ── KNOWLEDGE BASE ── */}
                {(() => {
                  const isActive = activeSpace === KNOWLEDGE_STORAGE_TYPE;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSpace(KNOWLEDGE_STORAGE_TYPE);
                        setActiveLegalReferenceId(null);
                        setActiveCustomerId(null);
                        setActiveCaseId(null);
                        setSelectedFolderId("root");
                        setSidebarSearch("");
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "5px 12px",
                        border: "0",
                        borderRadius: 7,
                        cursor: "pointer",
                        background: isActive ? "#E6F1FB" : "transparent",
                        color: isActive ? "#185FA5" : "#374151",
                        fontWeight: isActive ? 600 : 400,
                        fontFamily: FONT,
                        fontSize: 13,
                        textAlign: "left",
                        minWidth: 0,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          e.currentTarget.style.background = "#F3F4F6";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          display: "inline-flex",
                          color: isActive ? "#185FA5" : "#6B7280",
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                      </span>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Knowledge
                      </span>
                    </button>
                  );
                })()}

                {/* ── Divider ── */}
                <div
                  style={{ height: 1, background: "#F3F4F6", margin: "4px 8px" }}
                />

                {/* ── FLAT NAV: Customer, Case Study, Legal Study ── */}
                {[
                  ...(canOpenCustomerSpace
                    ? [
                        {
                          key: "customer",
                          label: "Customer",
                          icon: (
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                          ),
                          isActive: activeSpace === "customer",
                          onClick: () => {
                            setActiveSpace("customer");
                            setActiveCustomerId(null);
                            setActiveCaseId(null);
                            setActiveLegalReferenceId(null);
                            setSelectedFolderId("root");
                            setSidebarSearch("");
                          },
                        },
                      ]
                    : []),
                  ...(canOpenLegalReferenceSpace
                    ? [
                        {
                          key: "legal_reference",
                          label: "Case Study",
                          icon: (
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                              <path d="M7 21h10" />
                              <path d="M12 3v18" />
                              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
                            </svg>
                          ),
                          isActive: activeSpace === "legal_reference",
                          onClick: () => {
                            setActiveSpace("legal_reference");
                            setActiveLegalReferenceId(null);
                            setActiveCustomerId(null);
                            setActiveCaseId(null);
                            setSelectedFolderId("root");
                            setSidebarSearch("");
                          },
                        },
                      ]
                    : []),
                  ...(canOpenLegalStudySpace
                    ? [
                        {
                          key: LEGAL_STUDY_STORAGE_TYPE,
                          label: "Legal Study",
                          icon: (
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                              <path d="M6 12v5c3 3 9 3 12 0v-5" />
                            </svg>
                          ),
                          isActive: activeSpace === LEGAL_STUDY_STORAGE_TYPE,
                          onClick: () => {
                            setActiveSpace(LEGAL_STUDY_STORAGE_TYPE);
                            setActiveLegalReferenceId(null);
                            setActiveCustomerId(null);
                            setActiveCaseId(null);
                            setSelectedFolderId("root");
                            setSidebarSearch("");
                          },
                        },
                      ]
                    : []),
                ].map(({ key, label, icon, isActive, onClick }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={onClick}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 12px",
                      border: "0",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: isActive ? "#E6F1FB" : "transparent",
                      color: isActive ? "#185FA5" : "#374151",
                      fontWeight: isActive ? 600 : 400,
                      fontFamily: FONT,
                      fontSize: 13,
                      textAlign: "left",
                      minWidth: 0,
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "#F3F4F6";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        display: "inline-flex",
                        color: isActive ? "#185FA5" : "#6B7280",
                      }}
                    >
                      {icon}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>
                  </button>
                ))}

                {/* ── Divider ── */}
                <div
                  style={{ borderTop: "0.5px solid #F3F4F6", margin: "2px 0" }}
                />

                {/* ── MY DOCUMENTS + SHARED WITH ME ── */}
                {[
                  {
                    key: MY_DOCUMENT_STORAGE_TYPE,
                    label: "My Documents",
                    icon: (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    ),
                    onClick: () => {
                      setActiveSpace(MY_DOCUMENT_STORAGE_TYPE);
                      setActiveLegalReferenceId(null);
                      setActiveCustomerId(null);
                      setActiveCaseId(null);
                      setSelectedFolderId("root");
                      setSidebarSearch("");
                    },
                  },
                  {
                    key: "shared_with_me",
                    label: "Shared with me",
                    icon: (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    ),
                    onClick: () => {
                      setActiveSpace("shared_with_me");
                      setActiveLegalReferenceId(null);
                      setActiveCustomerId(null);
                      setActiveCaseId(null);
                      setSelectedFolderId("root");
                      setSidebarSearch("");
                    },
                  },
                ].map(({ key, label, icon, onClick }) => {
                  const isActive = activeSpace === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={onClick}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "5px 12px",
                        border: "0",
                        borderRadius: 7,
                        cursor: "pointer",
                        background: isActive ? "#E6F1FB" : "transparent",
                        color: isActive ? "#185FA5" : "#374151",
                        fontWeight: isActive ? 600 : 400,
                        fontFamily: FONT,
                        fontSize: 13,
                        textAlign: "left",
                        minWidth: 0,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          e.currentTarget.style.background = "#F3F4F6";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          display: "inline-flex",
                          color: isActive ? "#185FA5" : "#6B7280",
                        }}
                      >
                        {icon}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}

                {/* ══ SECTION: NHANH (Quick access) ══ */}
                <div
                  style={{
                    borderTop: "0.5px solid #E5E7EB",
                    padding: "6px 10px",
                    marginTop: 4,
                  }}
                >
                  <div style={{ padding: "0 0 4px 0" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#9CA3AF",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Nhanh
                    </span>
                  </div>
                  {[
                    {
                      key: "recent",
                      label: "Activity History",
                      icon: (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      ),
                    },
                    {
                      key: "trash",
                      label: "Trash",
                      icon: (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      ),
                    },
                  ].map(({ key, label, icon }) => {
                    const isActive = activeSpace === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setActiveSpace(key);
                          setActiveLegalReferenceId(null);
                          setSelectedFolderId("root");
                          setActiveCustomerId(null);
                          setActiveCaseId(null);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 8px",
                          border: "0",
                          borderRadius: 7,
                          cursor: "pointer",
                          borderLeft: isActive
                            ? "2px solid #185FA5"
                            : "2px solid transparent",
                          background: isActive ? "#E6F1FB" : "transparent",
                          color: isActive ? "#185FA5" : "#6B7280",
                          fontFamily: FONT,
                          fontSize: 12,
                          textAlign: "left",
                          minWidth: 0,
                          transition: "background 0.12s",
                          marginBottom: 2,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive)
                            e.currentTarget.style.background = "#F3F4F6";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive)
                            e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span style={{ flexShrink: 0, display: "inline-flex" }}>
                          {icon}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <Layout
            style={{
              background: "#fff",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {/* ── TOPBAR ── */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "0.5px solid #E5E7EB",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                background: "#FFFFFF",
              }}
            >
              {/* Left: sidebar toggle + context label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {sidebarCollapsed && (
                  <Tooltip title="Expand sidebar">
                    <Button
                      icon={SIDEBAR_ICON}
                      onClick={() => setSidebarCollapsed(false)}
                      aria-label="Expand sidebar"
                      style={{
                        width: 32,
                        height: 32,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 8,
                        border: "0.5px solid #E5E7EB",
                      }}
                    />
                  </Tooltip>
                )}
              </div>

              {/* Spacer */}
              <div style={{ flex: 1, minWidth: 0 }} />

              {/* Filters */}
              {activeSpace === "recent" ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Input.Search
                    placeholder="Search activity..."
                    value={activitySearchQuery}
                    onChange={(e) => {
                      setActivitySearchQuery(e.target.value);
                      setActivityPage(1);
                    }}
                    style={{ width: 220, borderRadius: 8 }}
                    allowClear
                  />
                  <Select
                    value={activityActionFilter}
                    onChange={(val) => {
                      setActivityActionFilter(val);
                      setActivityPage(1);
                    }}
                    style={{ width: 180, borderRadius: 8 }}
                    options={[
                      { value: "all", label: "All activity" },
                      { value: "uploaded", label: "Document upload" },
                      { value: "previewed", label: "Preview" },
                      { value: "downloaded", label: "Download" },
                      {
                        value: "linked_legal_study",
                        label: "Add to Legal Study",
                      },
                      { value: "shared_file", label: "Share document" },
                      { value: "unshared_file", label: "Unshare" },
                      {
                        value: "permission_updated",
                        label: "Permissions Updated",
                      },
                      { value: "created", label: "Folder creation" },
                      { value: "updated", label: "Other update" },
                      { value: "moved", label: "Move" },
                      { value: "trash_deleted", label: "Move to Trash" },
                      { value: "restored", label: "Restore" },
                      { value: "deleted", label: "Permanently Delete" },
                    ]}
                  />
                  <DatePicker
                    value={activityDateFilter}
                    onChange={(value) => {
                      setActivityDateFilter(value);
                      setActivityPage(1);
                    }}
                    placeholder="Filter by date"
                    allowClear
                    style={{ width: 150, borderRadius: 8 }}
                  />
                </div>
              ) : isEntityGallery ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexShrink: 0,
                    flexWrap: "nowrap",
                  }}
                >
                  <Input.Search
                    placeholder={
                      activeSpace === "customer" && !activeCustomerId
                        ? "Search customers..."
                        : activeSpace === "customer"
                          ? "Search cases..."
                          : activeSpace === "legal_reference"
                            ? "Search case study..."
                            : "Search legal study..."
                    }
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    style={{ width: 200, borderRadius: 8 }}
                    allowClear
                  />
                  {isEntityGallery && companies.length > 0 && (
                    <Select
                      mode="multiple"
                      placeholder="Filter by company..."
                      value={galleryCompanyFilter}
                      onChange={setGalleryCompanyFilter}
                      style={{ minWidth: 160, maxWidth: 240 }}
                      allowClear
                      maxTagCount="responsive"
                      options={companies.map((c) => ({
                        value: String(extractId(c)),
                        label: c.name || c.title || `Company #${extractId(c)}`,
                      }))}
                    />
                  )}
                  <div
                    style={{
                      display: "inline-flex",
                      gap: 3,
                      padding: 3,
                      border: "0.5px solid #E5E7EB",
                      borderRadius: 8,
                      background: "#FAFAFA",
                    }}
                  >
                    <Tooltip title="Grid">
                      <Button
                        aria-label="Grid"
                        icon={GRID_ICON}
                        onClick={() => setGalleryViewMode("grid")}
                        style={{
                          width: 32,
                          height: 28,
                          borderRadius: 6,
                          border: "none",
                          background:
                            galleryViewMode === "grid"
                              ? "#185FA5"
                              : "transparent",
                          color: galleryViewMode === "grid" ? "#fff" : "#6B7280",
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Table">
                      <Button
                        aria-label="Table"
                        icon={TABLE_ICON}
                        onClick={() => setGalleryViewMode("table")}
                        style={{
                          width: 32,
                          height: 28,
                          borderRadius: 6,
                          border: "none",
                          background:
                            galleryViewMode === "table"
                              ? "#185FA5"
                              : "transparent",
                          color: galleryViewMode === "table" ? "#fff" : "#6B7280",
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Input.Search
                    placeholder="Search..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ width: 200, borderRadius: 8 }}
                    allowClear
                  />
                  <Select
                    value={sortMode}
                    onChange={(value) => {
                      setSortMode(value);
                      clearDragState();
                    }}
                    style={{ width: 180, borderRadius: 8 }}
                    options={[
                      {
                        value: "manual",
                        label: (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              paddingTop: 1,
                            }}
                          >
                            Custom order
                          </span>
                        ),
                      },
                      {
                        value: "newest",
                        label: (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              paddingTop: 1,
                            }}
                          >
                            Newest
                          </span>
                        ),
                      },
                      {
                        value: "oldest",
                        label: (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              paddingTop: 1,
                            }}
                          >
                            Oldest
                          </span>
                        ),
                      },
                      {
                        value: "name",
                        label: (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              paddingTop: 1,
                            }}
                          >
                            Name A-Z
                          </span>
                        ),
                      },
                    ]}
                  />
                  <Select
                    allowClear
                    placeholder="Format"
                    style={{ width: 120, borderRadius: 8 }}
                    value={selectedExt}
                    onChange={setSelectedExt}
                    options={fileExtOptions}
                  />
                  <div
                    style={{
                      display: "inline-flex",
                      gap: 3,
                      padding: 3,
                      border: "0.5px solid #E5E7EB",
                      borderRadius: 8,
                      background: "#FAFAFA",
                    }}
                  >
                    <Tooltip title="Grid">
                      <Button
                        aria-label="Grid"
                        icon={GRID_ICON}
                        onClick={() => setViewMode("grid")}
                        style={{
                          width: 32,
                          height: 28,
                          borderRadius: 6,
                          border: "none",
                          background:
                            viewMode === "grid" ? "#185FA5" : "transparent",
                          color: viewMode === "grid" ? "#fff" : "#6B7280",
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Table">
                      <Button
                        aria-label="Table"
                        icon={TABLE_ICON}
                        onClick={() => setViewMode("table")}
                        style={{
                          width: 32,
                          height: 28,
                          borderRadius: 6,
                          border: "none",
                          background:
                            viewMode === "table" ? "#185FA5" : "transparent",
                          color: viewMode === "table" ? "#fff" : "#6B7280",
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
              )}

              <div
                style={{
                  width: 1,
                  height: 20,
                  background: "#E5E7EB",
                  flexShrink: 0,
                }}
              />

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                {activeSpace === "recent" ? (
                  <Button
                    icon={REFRESH_ICON}
                    onClick={fetchActivityLogs}
                    loading={activityLoading}
                    style={{
                      borderRadius: 8,
                      border: "0.5px solid #E5E7EB",
                      color: "#185FA5",
                      fontWeight: 500,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    Refresh
                  </Button>
                ) : (
                  <React.Fragment>
                    {activeSpace !== "trash" &&
                      (currentFolderPerms.canCreate ||
                        (activeSpace === "legal_reference" &&
                          !activeLegalReferenceId)) && (
                        <Dropdown
                          menu={
                            activeSpace === "legal_reference" &&
                            !activeLegalReferenceId
                              ? {
                                  items: [
                                    {
                                      key: "create_reference",
                                      label: renderNewMenuLabel(
                                        TYPE_ICONS.folder,
                                        "New Case Study",
                                      ),
                                    },
                                  ],
                                  onClick: openCreateReferenceModal,
                                }
                              : newMenu
                          }
                          trigger={["click"]}
                        >
                          <Button
                            type="primary"
                            icon={PLUS_ICON}
                            style={{
                              background: "#185FA5",
                              borderColor: "#185FA5",
                              borderRadius: 8,
                              fontWeight: 600,
                            }}
                          >
                            New
                          </Button>
                        </Dropdown>
                      )}
                    <Button
                      icon={REFRESH_ICON}
                      onClick={loadData}
                      loading={loading}
                      style={{
                        borderRadius: 8,
                        border: "0.5px solid #E5E7EB",
                        color: "#185FA5",
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      Refresh
                    </Button>
                  </React.Fragment>
                )}
              </div>
            </div>

            <Content
              style={{
                padding: 20,
                overflowY: "auto",
                background: "#F9FAFB",
                position: "relative",
              }}
              onDragEnter={handleContentDragEnter}
              onDragOver={handleContentDragOver}
              onDragLeave={handleContentDragLeave}
              onDrop={handleDropToCurrentFolder}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={handleFileInputTrigger}
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                webkitdirectory="true"
                directory="true"
                style={{ display: "none" }}
                onChange={handleFolderInputTrigger}
              />
              <input
                ref={createReferenceFileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={handleCreateReferenceFileSelect}
              />
              <input
                ref={createReferenceFolderInputRef}
                type="file"
                multiple
                webkitdirectory="true"
                directory="true"
                style={{ display: "none" }}
                onChange={handleCreateReferenceFolderSelect}
              />

              {(externalDropActive || externalUploadInProgress) && (
                <div
                  style={{
                    position: "absolute",
                    inset: 12,
                    zIndex: 50,
                    pointerEvents: "none",
                    border: "2px dashed #185FA5",
                    borderRadius: 12,
                    background: "rgba(230, 241, 251, 0.92)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: "#185FA5",
                    fontFamily: FONT,
                  }}
                >
                  <div>
                    {externalUploadInProgress && (
                      <Spin size="small" style={{ marginBottom: 12 }} />
                    )}
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {externalUploadInProgress
                        ? "Uploading files and folders..."
                        : "Drop files or folders here to upload"}
                    </div>
                    {externalUploadInProgress && bulkProgress && (
                      <div style={{ marginTop: 8, fontSize: 13 }}>
                        {bulkProgress}
                      </div>
                    )}
                    {externalUploadInProgress && bulkUploading && (
                      <Progress
                        percent={bulkPercent}
                        showInfo={false}
                        size="small"
                        style={{ width: 280, maxWidth: "70vw", marginTop: 10 }}
                      />
                    )}
                  </div>
                </div>
              )}

              {activeSpace === "recent" ? (
                <div style={{ padding: "8px 4px 24px 4px", fontFamily: FONT }}>
                  <Table
                    dataSource={filteredActivityLogs}
                    columns={activityColumns}
                    loading={activityLoading}
                    rowKey={(log) => log.id || log.changedAt}
                    pagination={{
                      current: activityPage,
                      pageSize: 20,
                      onChange: (page) => setActivityPage(page),
                      showSizeChanger: false,
                      total: filteredActivityLogs.length,
                      showTotal: (total, range) =>
                        `${range[0]}–${range[1]} / ${total} activities`,
                    }}
                    locale={{
                      emptyText: (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="No activity history found"
                          style={{ padding: "40px 0" }}
                        />
                      ),
                    }}
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                      overflow: "hidden",
                    }}
                  />
                </div>
              ) : isEntityGallery ? (
                (() => {
                  /* ── ENTITY GALLERY VIEWS ── */

                  const handleBulkDelete = (keys, spaceKey, labelFn) => {
                    if (!keys.length) return;
                    // customer_entity intentionally excluded — Customer
                    // records are not deletable from this UI (see
                    // renderBulkBar, which hides the "Delete selected"
                    // button for this space to match).
                    const collMap = {
                      customer_case: "projects",
                      legal_reference: "legalReference",
                    };
                    const col = collMap[spaceKey];
                    if (!col) return;
                    Modal.confirm({
                      title: `Delete ${keys.length} selected items?`,
                      content: "This action cannot be undone.",
                      okText: `Delete ${keys.length} items`,
                      okType: "danger",
                      cancelText: "Cancel",
                      onOk: async () => {
                        try {
                          await Promise.all(
                            keys.map((k) =>
                              ctx.api
                                .request({
                                  url: `${col}:destroy?filterByTk=${k}`,
                                  method: "POST",
                                })
                                .catch(() => {}),
                            ),
                          );
                          message.success(`Deleted ${keys.length} items`);
                          setSelectedEntityKeys([]);
                          loadData();
                        } catch {
                          message.error("Delete failed");
                        }
                      },
                    });
                  };

                  const renderBulkBar = (spaceKey) =>
                    selectedEntityKeys.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 12px",
                          background: "#EFF6FF",
                          borderRadius: 8,
                          border: "1px solid #BFDBFE",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            color: "#1D4ED8",
                            fontWeight: 500,
                            flex: 1,
                          }}
                        >
                          Selected <b>{selectedEntityKeys.length}</b> items
                        </span>
                        {spaceKey !== "customer_entity" && (
                          <Button
                            size="small"
                            danger
                            onClick={() =>
                              handleBulkDelete(selectedEntityKeys, spaceKey)
                            }
                          >
                            Delete selected
                          </Button>
                        )}
                        <Button
                          size="small"
                          onClick={() => setSelectedEntityKeys([])}
                        >
                          Deselect
                        </Button>
                      </div>
                    ) : null;

                  const entityRowSelection = {
                    selectedRowKeys: selectedEntityKeys,
                    onChange: setSelectedEntityKeys,
                    preserveSelectedRowKeys: false,
                  };

                  const handleEntityCtx = (e, rec, space) => {
                    e.preventDefault();
                    setEntityContextMenu({
                      open: true,
                      x: e.clientX,
                      y: e.clientY,
                      record: rec,
                      space,
                    });
                  };

                  const CARD_STYLE = {
                    borderRadius: 8,
                    border: "0.5px solid #E5E7EB",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s",
                  };

                  const renderEntityCard = ({
                    key,
                    title,
                    sub,
                    footer,
                    borderLeft,
                    onClick,
                    rec,
                    space,
                    selectable = true,
                  }) => {
                    const isSelected = selectable && selectedEntityKeys.includes(key);
                    const toggleSelect = (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setSelectedEntityKeys((prev) =>
                        prev.includes(key)
                          ? prev.filter((k) => k !== key)
                          : [...prev, key],
                      );
                    };
                    return (
                      <Col
                        xs={12}
                        sm={8}
                        md={6}
                        lg={4}
                        xl={3}
                        key={key}
                        style={{ display: "flex" }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            display: "flex",
                          }}
                          onMouseEnter={(e) => {
                            const cb = e.currentTarget.querySelector(".ekc");
                            if (cb) cb.style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              const cb = e.currentTarget.querySelector(".ekc");
                              if (cb) cb.style.opacity = "0";
                            }
                          }}
                        >
                          {selectable && (
                            <div
                              className="ekc"
                              style={{
                                position: "absolute",
                                top: 5,
                                right: 5,
                                zIndex: 3,
                                opacity: isSelected ? 1 : 0,
                                transition: "opacity 0.15s",
                                lineHeight: 1,
                              }}
                              onClick={toggleSelect}
                            >
                              <Checkbox checked={isSelected} onChange={() => {}} />
                            </div>
                          )}
                          <Card
                            hoverable
                            onClick={onClick}
                            onContextMenu={(e) => handleEntityCtx(e, rec, space)}
                            style={{
                              ...CARD_STYLE,
                              borderLeft: borderLeft || "0.5px solid #E5E7EB",
                              width: "100%",
                              ...(isSelected
                                ? {
                                    border: "1.5px solid #185FA5",
                                    boxShadow: "0 0 0 3px #185FA515",
                                  }
                                : {}),
                            }}
                            bodyStyle={{
                              padding: "10px 24px 10px 12px",
                              display: "flex",
                              flexDirection: "column",
                              height: 86,
                              overflow: "hidden",
                            }}
                          >
                            <Tooltip
                              title={title}
                              mouseEnterDelay={0.5}
                              placement="top"
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: 12,
                                  color: "#111827",
                                  lineHeight: 1.4,
                                  overflow: "hidden",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                {title}
                              </div>
                            </Tooltip>
                            {sub && (
                              <Tooltip
                                title={sub}
                                mouseEnterDelay={0.5}
                                placement="bottom"
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#6B7280",
                                    lineHeight: 1.3,
                                    marginTop: 2,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {sub}
                                </div>
                              </Tooltip>
                            )}
                            {footer && (
                              <Tooltip
                                title={footer}
                                mouseEnterDelay={0.5}
                                placement="bottom"
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#6B7280",
                                    marginTop: "auto",
                                    paddingTop: 4,
                                    borderTop: "0.5px solid #F3F4F6",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {footer}
                                </div>
                              </Tooltip>
                            )}
                          </Card>
                        </div>
                      </Col>
                    );
                  };

                  /* ── LEGAL STUDY GALLERY (flat list of Case có folder
                     folderTemplateKey === "legal_study" — xem
                     legalStudyEntitiesWithSubtree) ── */
                  if (activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCustomerId) {
                    const q = sidebarSearch.toLowerCase();
                    let items = legalStudyEntitiesWithSubtree;
                    if (galleryCompanyFilter.length > 0) {
                      items = items.filter((entry) => {
                        const cid = String(
                          extractId(entry.customer?.internalCompanyId) ||
                            extractId(entry.customer?.internalCompany) ||
                            "",
                        );
                        return galleryCompanyFilter.includes(cid);
                      });
                    }
                    if (q) {
                      items = items.filter((entry) => {
                        const caseName = (
                          entry.project?.projectName ||
                          entry.project?.caseCode ||
                          ""
                        ).toLowerCase();
                        const custName = entry.customer
                          ? getCustomerDisplayName(entry.customer).toLowerCase()
                          : "";
                        return caseName.includes(q) || custName.includes(q);
                      });
                    }

                    // caseCode + shortName (khách hàng) + projectName
                    const formatCaseCustomerLabel = (entry) => {
                      const caseCode = entry.project?.caseCode || "";
                      const shortName =
                        entry.customer?.shortName ||
                        (entry.customer ? getCustomerDisplayName(entry.customer) : "");
                      const projectName = entry.project?.projectName || "";
                      return (
                        [caseCode, shortName, projectName].filter(Boolean).join(" - ") ||
                        `Case #${extractId(entry.project)}`
                      );
                    };

                    // 🌟 Nhảy thẳng vào đúng folder Legal Study của case —
                    // set selectedFolderId ngay bằng id thật của folder (thay
                    // vì "root") để không cần đi qua bước hiện case-root rồi
                    // mới tự nhảy vào (tránh flash 1 card "Legal Study" rồi
                    // mới vào nội dung thật của nó).
                    const openLegalStudyEntity = (entry) => {
                      setActiveCustomerId(String(extractId(entry.customer)));
                      setActiveCaseId(String(extractId(entry.project)));
                      setSelectedFolderId(String(extractId(entry.folder)));
                      setSidebarSearch("");
                    };

                    if (galleryViewMode === "table") {
                      return (
                        <Table
                          size="small"
                          dataSource={items}
                          rowKey={(r) => String(extractId(r.folder))}
                          onRow={(r) => ({
                            onClick: () => openLegalStudyEntity(r),
                          })}
                          pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            pageSizeOptions: ["20", "50", "100"],
                            showTotal: (total) => `${total} items`,
                          }}
                          style={{
                            background: "#fff",
                            borderRadius: 10,
                            border: "1px solid #E5E7EB",
                          }}
                          columns={[
                            {
                              title: "STT",
                              width: 52,
                              render: (_, __, i) => i + 1,
                            },
                            {
                              title: "Folder Name",
                              key: "folderName",
                              render: (_, r) => {
                                const name = r.folder?.name || LEGAL_STUDY_LABEL;
                                return (
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "#111827",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <span style={{ color: "#185FA5", display: "inline-flex" }}>
                                      {TYPE_ICONS.folder}
                                    </span>
                                    {name}
                                  </span>
                                );
                              },
                            },
                            {
                              title: "Related Case & Customer",
                              key: "caseCustomer",
                              render: (_, r) => {
                                const label = formatCaseCustomerLabel(r);
                                return (
                                  <Tooltip title={label}>
                                    <span style={{ color: "#374151" }}>{label}</span>
                                  </Tooltip>
                                );
                              },
                            },
                            {
                              title: "Size",
                              key: "size",
                              width: 110,
                              render: (_, r) =>
                                formatBytes(
                                  legalStudyFolderSizeById[String(extractId(r.folder))],
                                ),
                            },
                            {
                              title: "Created Date",
                              key: "createdAt",
                              width: 110,
                              render: (_, r) => formatDate(r.folder?.createdAt),
                            },
                            {
                              title: "Created By",
                              key: "createdBy",
                              width: 160,
                              render: (_, r) => getUploadUserName(r.folder),
                            },
                            {
                              title: "Actions",
                              key: "actions",
                              width: 90,
                              align: "right",
                              render: (_, r) => (
                                <Tooltip title="Open">
                                  <Button
                                    size="small"
                                    icon={EYE_ICON}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openLegalStudyEntity(r);
                                    }}
                                  />
                                </Tooltip>
                              ),
                            },
                          ]}
                        />
                      );
                    }
                    return (
                      <div style={{ fontFamily: FONT }}>
                        {items.length === 0 ? (
                          <Empty
                            description={
                              sidebarSearch
                                ? "No Legal Study found"
                                : "No case has a Legal Study folder yet"
                            }
                            style={{ padding: "80px 0" }}
                          />
                        ) : (
                          <Row gutter={[10, 10]}>
                            {items.map((entry) => {
                              const key = String(extractId(entry.folder));
                              const folderName = entry.folder?.name || LEGAL_STUDY_LABEL;
                              const size = legalStudyFolderSizeById[key];
                              return renderEntityCard({
                                key,
                                rec: entry.folder,
                                space: "legal_study",
                                title: (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "#185FA5",
                                        display: "inline-flex",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {TYPE_ICONS.folder}
                                    </span>
                                    {folderName}
                                  </span>
                                ),
                                sub: formatCaseCustomerLabel(entry),
                                footer: (
                                  <span>
                                    {formatBytes(size)}
                                    {entry.folder?.createdAt
                                      ? ` · ${formatDate(entry.folder.createdAt)}`
                                      : ""}
                                  </span>
                                ),
                                borderLeft: "2px solid #185FA5",
                                onClick: () => openLegalStudyEntity(entry),
                              });
                            })}
                          </Row>
                        )}
                      </div>
                    );
                  }

                  /* ── CUSTOMER GALLERY ── */
                  if (activeSpace === "customer" && !activeCustomerId) {
                    const items = filteredSidebarCustomers;
                    if (galleryViewMode === "table") {
                      return (
                        <div>
                          <Table
                            size="small"
                            dataSource={items}
                            rowKey={(r) => String(extractId(r))}
                            onRow={(r) => ({
                              onClick: () => {
                                setActiveCustomerId(String(extractId(r)));
                                setActiveCaseId(null);
                                setSelectedFolderId("root");
                                setSidebarSearch("");
                              },
                              onContextMenu: (e) =>
                                handleEntityCtx(e, r, "customer"),
                            })}
                            pagination={{
                              pageSize: 20,
                              showSizeChanger: true,
                              pageSizeOptions: ["20", "50", "100"],
                              showTotal: (total) => `${total} items`,
                            }}
                            style={{
                              background: "#fff",
                              borderRadius: 10,
                              border: "1px solid #E5E7EB",
                            }}
                            columns={[
                              {
                                title: "STT",
                                width: 52,
                                render: (_, __, i) => i + 1,
                              },
                              {
                                title: "Customer Name",
                                key: "name",
                                render: (_, r) => {
                                  const name = getCustomerDisplayName(r);
                                  return (
                                    <Tooltip title={name}>
                                      <span
                                        style={{
                                          fontWeight: 500,
                                          cursor: "pointer",
                                        }}
                                      >
                                        {name}
                                      </span>
                                    </Tooltip>
                                  );
                                },
                              },
                              {
                                title: "Related Cases",
                                width: 90,
                                render: (_, r) => {
                                  const st = customerStats[
                                    String(extractId(r))
                                  ] || { caseCount: 0 };
                                  return (
                                    <span
                                      style={{
                                        color: "#185FA5",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {st.caseCount}
                                    </span>
                                  );
                                },
                              },
                              {
                                title: "Created Date",
                                width: 110,
                                dataIndex: "createdAt",
                                defaultSortOrder: "descend",
                                sorter: (a, b) =>
                                  new Date(a.createdAt || 0) -
                                  new Date(b.createdAt || 0),
                                render: (v) => formatDate(v),
                              },
                              {
                                title: "Created By",
                                width: 140,
                                render: (_, r) =>
                                  r.createdBy?.nickname ||
                                  r.createdBy?.email ||
                                  "—",
                              },
                            ]}
                          />
                        </div>
                      );
                    }
                    return (
                      <div style={{ fontFamily: FONT }}>
                        {items.length === 0 ? (
                          <Empty
                            description={
                              sidebarSearch
                                ? "No customer found"
                                : "No customers yet"
                            }
                            style={{ padding: "80px 0" }}
                          />
                        ) : (
                          <Row gutter={[10, 10]}>
                            {items.map((customer) => {
                              const cid = String(extractId(customer));
                              const st = customerStats[cid] || { caseCount: 0 };
                              return renderEntityCard({
                                key: cid,
                                rec: customer,
                                space: "customer",
                                selectable: false,
                                title: getCustomerDisplayName(customer),
                                footer: (
                                  <span>
                                    Cases:{" "}
                                    <span
                                      style={{
                                        color: "#185FA5",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {st.caseCount}
                                    </span>
                                  </span>
                                ),
                                borderLeft:
                                  st.caseCount > 0
                                    ? "2px solid #185FA5"
                                    : "0.5px solid #E5E7EB",
                                onClick: () => {
                                  setActiveCustomerId(cid);
                                  setActiveCaseId(null);
                                  setSelectedFolderId("root");
                                  setSidebarSearch("");
                                },
                              });
                            })}
                          </Row>
                        )}
                      </div>
                    );
                  }

                  /* ── CASE ROOT FOLDER GALLERY (customer selected, no case) ──
                     🌟 Gộp thẳng bước chọn Case + xem folder gốc của Case
                     thành 1 màn hình: liệt kê tất cả folder gốc của mọi Case
                     thuộc customer này. Click 1 folder sẽ set đồng thời
                     activeCaseId (case sở hữu folder) + selectedFolderId
                     (chính folder đó) để nhảy thẳng vào xem folder con, bỏ
                     qua bước hiện tên Case làm màn hình trung gian riêng. */
                  if (
                    activeSpace === "customer" &&
                    activeCustomerId &&
                    !activeCaseId
                  ) {
                    const cust = customers.find(
                      (c) => String(extractId(c)) === String(activeCustomerId),
                    );
                    const q = sidebarSearch.toLowerCase();
                    let items = customerCaseRootFoldersWithSubtree;
                    if (q) {
                      items = items.filter((entry) => {
                        const folderName = (entry.folder?.name || "").toLowerCase();
                        const caseName = (
                          entry.project?.projectName ||
                          entry.project?.caseCode ||
                          ""
                        ).toLowerCase();
                        return folderName.includes(q) || caseName.includes(q);
                      });
                    }
                    const custName = cust ? getCustomerDisplayName(cust) : "";
                    const formatCaseLabel = (entry) => {
                      const caseCode = entry.project?.caseCode || "";
                      const projectName = entry.project?.projectName || "";
                      return (
                        [caseCode, projectName].filter(Boolean).join(" - ") ||
                        `Case #${extractId(entry.project)}`
                      );
                    };
                    const openCustomerCaseRootFolder = (entry) => {
                      setActiveCaseId(String(extractId(entry.project)));
                      setSelectedFolderId(String(extractId(entry.folder)));
                      setSidebarSearch("");
                    };
                    const entityBreadcrumb = (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginBottom: 12,
                          fontSize: 12,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCustomerId(null);
                            setActiveCaseId(null);
                          }}
                          style={{
                            border: 0,
                            background: "transparent",
                            padding: "2px 4px",
                            borderRadius: 4,
                            cursor: "pointer",
                            color: "#185FA5",
                            fontFamily: FONT,
                            fontSize: 12,
                          }}
                        >
                          Customer
                        </button>
                        <span style={{ color: "#9CA3AF" }}>›</span>
                        <span style={{ fontWeight: 600, color: "#111827" }}>
                          {custName}
                        </span>
                      </div>
                    );
                    if (galleryViewMode === "table") {
                      return (
                        <div>
                          {entityBreadcrumb}
                          <Table
                            size="small"
                            dataSource={items}
                            rowKey={(r) => String(extractId(r.folder))}
                            onRow={(r) => ({
                              onClick: () => openCustomerCaseRootFolder(r),
                            })}
                            pagination={{
                              pageSize: 20,
                              showSizeChanger: true,
                              pageSizeOptions: ["20", "50", "100"],
                              showTotal: (total) => `${total} items`,
                            }}
                            style={{
                              background: "#fff",
                              borderRadius: 10,
                              border: "1px solid #E5E7EB",
                            }}
                            columns={[
                              {
                                title: "STT",
                                width: 52,
                                render: (_, __, i) => i + 1,
                              },
                              {
                                title: "Folder Name",
                                key: "folderName",
                                render: (_, r) => {
                                  const name = r.folder?.name || "Folder";
                                  return (
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: "#111827",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                      }}
                                    >
                                      <span
                                        style={{
                                          color: "#185FA5",
                                          display: "inline-flex",
                                        }}
                                      >
                                        {TYPE_ICONS.folder}
                                      </span>
                                      {name}
                                    </span>
                                  );
                                },
                              },
                              {
                                title: "Related Cases",
                                key: "caseLabel",
                                render: (_, r) => {
                                  const label = formatCaseLabel(r);
                                  return (
                                    <Tooltip title={label}>
                                      <span style={{ color: "#374151" }}>
                                        {label}
                                      </span>
                                    </Tooltip>
                                  );
                                },
                              },
                              {
                                title: "Size",
                                key: "size",
                                width: 110,
                                render: (_, r) =>
                                  formatBytes(
                                    customerCaseRootFolderSizeById[
                                      String(extractId(r.folder))
                                    ],
                                  ),
                              },
                              {
                                title: "Created Date",
                                key: "createdAt",
                                width: 110,
                                render: (_, r) => formatDate(r.folder?.createdAt),
                              },
                              {
                                title: "Created By",
                                key: "createdBy",
                                width: 160,
                                render: (_, r) => getUploadUserName(r.folder),
                              },
                              {
                                title: "Actions",
                                key: "actions",
                                width: 90,
                                align: "right",
                                render: (_, r) => (
                                  <Tooltip title="Open">
                                    <Button
                                      size="small"
                                      icon={EYE_ICON}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openCustomerCaseRootFolder(r);
                                      }}
                                    />
                                  </Tooltip>
                                ),
                              },
                            ]}
                          />
                        </div>
                      );
                    }
                    return (
                      <div style={{ fontFamily: FONT }}>
                        {entityBreadcrumb}
                        {items.length === 0 ? (
                          <Empty
                            description={
                              sidebarSearch
                                ? "No folder found"
                                : "No cases or folders yet"
                            }
                            style={{ padding: "80px 0" }}
                          />
                        ) : (
                          <Row gutter={[10, 10]}>
                            {items.map((entry) => {
                              const key = String(extractId(entry.folder));
                              const folderName = entry.folder?.name || "Folder";
                              const size = customerCaseRootFolderSizeById[key];
                              return renderEntityCard({
                                key,
                                rec: entry.folder,
                                space: "customer",
                                title: (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "#185FA5",
                                        display: "inline-flex",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {TYPE_ICONS.folder}
                                    </span>
                                    {folderName}
                                  </span>
                                ),
                                sub: formatCaseLabel(entry),
                                footer: (
                                  <span>
                                    {formatBytes(size)}
                                    {entry.folder?.createdAt
                                      ? ` · ${formatDate(entry.folder.createdAt)}`
                                      : ""}
                                  </span>
                                ),
                                borderLeft: "2px solid #185FA5",
                                onClick: () => openCustomerCaseRootFolder(entry),
                              });
                            })}
                          </Row>
                        )}
                      </div>
                    );
                  }

                  /* ── LEGAL REFERENCE GALLERY ── */
                  if (
                    activeSpace === "legal_reference" &&
                    !activeLegalReferenceId
                  ) {
                    const items = filteredSidebarLegalRefs;
                    if (galleryViewMode === "table") {
                      return (
                        <div>
                          {renderBulkBar("legal_reference")}
                          <Table
                            size="small"
                            rowSelection={{
                              ...entityRowSelection,
                              getCheckboxProps: () => ({
                                onClick: (e) => e.stopPropagation(),
                              }),
                            }}
                            dataSource={items}
                            rowKey={(r) => String(extractId(r))}
                            onRow={(r) => ({
                              onClick: () => {
                                setActiveLegalReferenceId(String(extractId(r)));
                                setSelectedFolderId("root");
                              },
                              onContextMenu: (e) =>
                                handleEntityCtx(e, r, "legal_reference"),
                            })}
                            pagination={{
                              pageSize: 20,
                              showSizeChanger: true,
                              pageSizeOptions: ["20", "50", "100"],
                              showTotal: (total) => `${total} items`,
                            }}
                            style={{
                              background: "#fff",
                              borderRadius: 10,
                              border: "1px solid #E5E7EB",
                            }}
                            columns={[
                              {
                                title: "STT",
                                width: 52,
                                render: (_, __, i) => i + 1,
                              },
                              {
                                title: "Case Study Name",
                                key: "name",
                                render: (_, r) => {
                                  const name = getLegalReferenceDisplayName(r);
                                  return (
                                    <Tooltip title={name}>
                                      <span
                                        style={{
                                          fontWeight: 500,
                                          cursor: "pointer",
                                        }}
                                      >
                                        {name}
                                      </span>
                                    </Tooltip>
                                  );
                                },
                              },
                              {
                                title: "Folder",
                                width: 80,
                                render: (_, r) => {
                                  const st =
                                    legalRefStats[String(extractId(r))] || {};
                                  return (
                                    <span style={{ color: "#185FA5" }}>
                                      {st.folderCount || 0}
                                    </span>
                                  );
                                },
                              },
                              {
                                title: "File",
                                width: 60,
                                render: (_, r) => {
                                  const st =
                                    legalRefStats[String(extractId(r))] || {};
                                  return (
                                    <span style={{ color: "#185FA5" }}>
                                      {st.docCount || 0}
                                    </span>
                                  );
                                },
                              },
                              {
                                title: "Created Date",
                                dataIndex: "createdAt",
                                width: 110,
                                defaultSortOrder: "descend",
                                sorter: (a, b) =>
                                  new Date(a.createdAt || 0) -
                                  new Date(b.createdAt || 0),
                                render: (v) => formatDate(v),
                              },
                              {
                                title: "Created By",
                                width: 140,
                                render: (_, r) =>
                                  r.createdBy?.nickname ||
                                  r.createdBy?.email ||
                                  "—",
                              },
                            ]}
                          />
                        </div>
                      );
                    }
                    return (
                      <div style={{ fontFamily: FONT }}>
                        {items.length > 0 && renderBulkBar("legal_reference")}
                        {items.length === 0 ? (
                          <div style={{ padding: "80px 0", textAlign: "center" }}>
                            <Empty
                              description={
                                sidebarSearch
                                  ? "Not found"
                                  : "No Case Study yet"
                              }
                            />
                            {!sidebarSearch && (
                              <button
                                type="button"
                                onClick={openCreateReferenceModal}
                                style={{
                                  marginTop: 12,
                                  padding: "8px 18px",
                                  background: "#185FA5",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 8,
                                  fontFamily: FONT,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                + Create Case Study
                              </button>
                            )}
                          </div>
                        ) : (
                          <Row gutter={[10, 10]}>
                            {items.map((ref) => {
                              const rid = String(extractId(ref));
                              const st = legalRefStats[rid] || {
                                folderCount: 0,
                                docCount: 0,
                              };
                              const hasContent =
                                st.folderCount > 0 || st.docCount > 0;
                              const creator =
                                ref.createdBy?.nickname ||
                                ref.createdBy?.email ||
                                "—";
                              return renderEntityCard({
                                key: rid,
                                rec: ref,
                                space: "legal_reference",
                                title: getLegalReferenceDisplayName(ref),
                                sub: (
                                  <span>
                                    {creator} · {formatDate(ref.createdAt)}
                                  </span>
                                ),
                                footer: (
                                  <span>
                                    {st.folderCount} folder(s) ·{" "}
                                    <span
                                      style={{
                                        color: "#185FA5",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {st.docCount}
                                    </span>{" "}
                                    file
                                  </span>
                                ),
                                borderLeft: hasContent
                                  ? "2px solid #185FA5"
                                  : "0.5px solid #E5E7EB",
                                onClick: () => {
                                  setActiveLegalReferenceId(rid);
                                  setSelectedFolderId("root");
                                },
                              });
                            })}
                          </Row>
                        )}
                      </div>
                    );
                  }

                  return null;
                })()
              ) : (
                <React.Fragment>
                  {/* ── BREADCRUMB ── */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      flexWrap: "wrap",
                      marginBottom: 16,
                    }}
                  >
                    {breadcrumbs.map((item, index) => {
                      const isCurrent = index === breadcrumbs.length - 1;
                      // Node mô tả Case/Khách hàng liên quan (không phải
                      // điểm điều hướng thật) — hiển thị dạng text thường,
                      // không phải button, để không trông giống link bấm
                      // được (tránh gây hiểu lầm như node ảo cũ trước đây).
                      if (item.id === "case_info") {
                        return (
                          <React.Fragment key={item.id}>
                            {index > 0 && (
                              <span
                                style={{
                                  color: "#9CA3AF",
                                  fontSize: 13,
                                  userSelect: "none",
                                }}
                              >
                                ›
                              </span>
                            )}
                            <span
                              style={{
                                padding: "3px 6px",
                                fontFamily: FONT,
                                fontSize: 13,
                                fontStyle: "italic",
                                color: "#9CA3AF",
                              }}
                            >
                              {item.name}
                            </span>
                          </React.Fragment>
                        );
                      }
                      return (
                        <React.Fragment key={item.id}>
                          {index > 0 && (
                            <span
                              style={{
                                color: "#9CA3AF",
                                fontSize: 13,
                                userSelect: "none",
                              }}
                            >
                              ›
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleBreadcrumbClick(item)}
                            style={{
                              border: 0,
                              background: "transparent",
                              borderRadius: 6,
                              padding: "3px 6px",
                              cursor: "pointer",
                              fontFamily: FONT,
                              fontSize: 13,
                              fontWeight: isCurrent ? 600 : 400,
                              color: isCurrent ? "#111827" : "#6B7280",
                              textDecoration: "none",
                              transition: "color 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isCurrent)
                                e.currentTarget.style.textDecoration =
                                  "underline";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = "none";
                            }}
                          >
                            {item.name}
                          </button>
                        </React.Fragment>
                      );
                    })}
                    {currentFolderPerms.role &&
                      ROLE_LABEL[currentFolderPerms.role] && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            marginLeft: 4,
                          }}
                        >
                          ({ROLE_LABEL[currentFolderPerms.role]})
                        </span>
                      )}
                  </div>

                  {hasAuthorizedBulkSelection && !isLegalReferenceRoot && (
                    <div
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 8,
                        padding: "10px 16px",
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                        fontFamily: FONT,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span
                          style={{
                            fontWeight: 500,
                            color: "#374151",
                            fontSize: 13,
                          }}
                        >
                          Selected{" "}
                          <strong style={{ color: "#111827", fontWeight: 600 }}>
                            {selectedRowKeys.length}
                          </strong>{" "}
                          items
                        </span>
                      </div>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 12 }}
                      >
                        <Button
                          size="small"
                          type="text"
                          onClick={() => setSelectedRowKeys([])}
                          style={{
                            borderRadius: 6,
                            fontSize: 12,
                            color: "#6B7280",
                            fontFamily: FONT,
                            padding: "4px 8px",
                          }}
                        >
                          Deselect
                        </Button>
                        <div
                          style={{ width: 1, height: 16, background: "#E5E7EB" }}
                        />
                        {activeSpace === "trash" ? (
                          canBulkDeleteSelected ? (
                            <React.Fragment>
                            <Button
                              size="small"
                              icon={RESTORE_ICON}
                              onClick={handleBulkRestore}
                              style={{
                                borderRadius: 6,
                                fontSize: 12,
                                background: "#F0FDF4",
                                color: "#166534",
                                borderColor: "#BBF7D0",
                                display: "inline-flex",
                                alignItems: "center",
                                fontFamily: FONT,
                              }}
                            >
                              Restore
                            </Button>
                            <Button
                              size="small"
                              icon={DELETE_ICON}
                              onClick={handleBulkPermanentDelete}
                              style={{
                                borderRadius: 6,
                                fontSize: 12,
                                background: "#FEF2F2",
                                color: "#991B1B",
                                borderColor: "#FEE2E2",
                                display: "inline-flex",
                                alignItems: "center",
                                fontFamily: FONT,
                              }}
                            >
                              Permanently Delete
                            </Button>
                            </React.Fragment>
                          ) : null
                        ) : (
                          <React.Fragment>
                            {canBulkMoveSelected && (
                              <Button
                              size="small"
                              icon={MOVE_ICON}
                              onClick={handleBulkMove}
                              style={{
                                borderRadius: 6,
                                fontSize: 12,
                                background: "#EFF6FF",
                                color: "#1E40AF",
                                borderColor: "#BFDBFE",
                                display: "inline-flex",
                                alignItems: "center",
                                fontFamily: FONT,
                              }}
                            >
                              Move
                              </Button>
                            )}
                            {canBulkDeleteSelected && (
                              <Button
                              size="small"
                              icon={DELETE_ICON}
                              onClick={handleBulkDelete}
                              style={{
                                borderRadius: 6,
                                fontSize: 12,
                                background: "#FEF2F2",
                                color: "#991B1B",
                                borderColor: "#FEE2E2",
                                display: "inline-flex",
                                alignItems: "center",
                                fontFamily: FONT,
                              }}
                            >
                              Move to Trash
                              </Button>
                            )}
                          </React.Fragment>
                        )}
                      </div>
                    </div>
                  )}

                  {viewMode === "grid" ? (
                    <React.Fragment>
                      {tableData.length === 0 ? (
                        <div
                          style={{
                            padding: "80px 0",
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <svg
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#9CA3AF"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            <line x1="12" y1="11" x2="12" y2="17" />
                            <polyline points="9 14 12 17 15 14" />
                          </svg>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 500,
                              color: "#6B7280",
                              fontFamily: FONT,
                            }}
                          >
                            {activeSpace === "legal_reference" &&
                            !activeLegalReferenceId
                              ? "No Case Study yet"
                              : activeSpace === "trash"
                                ? "Trash is empty"
                                : query
                                  ? "No results found"
                                  : "Folder is empty"}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: "#9CA3AF",
                              fontFamily: FONT,
                            }}
                          >
                            {activeSpace === "legal_reference" &&
                            !activeLegalReferenceId
                              ? "Click + Create Case Study below to get started"
                              : activeSpace === "trash"
                                ? "No deleted files or folders"
                                : query
                                  ? "Try a different search term"
                                  : ""}
                          </div>
                          {activeSpace === "legal_reference" &&
                          !activeLegalReferenceId ? (
                            <button
                              type="button"
                              onClick={openCreateReferenceModal}
                              style={{
                                padding: "8px 18px",
                                background: "#185FA5",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                fontFamily: FONT,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                marginTop: 4,
                              }}
                            >
                              + Create Case Study
                            </button>
                          ) : (
                            activeSpace !== "trash" &&
                            !query &&
                            currentFolderPerms.canCreate && (
                              <div
                                style={{ display: "flex", gap: 8, marginTop: 4 }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    directFileTargetRef.current =
                                      selectedFolderId;
                                    fileInputRef.current?.click();
                                  }}
                                  style={{
                                    padding: "8px 18px",
                                    background: "#185FA5",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    fontFamily: FONT,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  + New File
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    folderInputRef.current?.click();
                                  }}
                                  style={{
                                    padding: "8px 18px",
                                    background: "transparent",
                                    color: "#185FA5",
                                    border: "1px solid #185FA5",
                                    borderRadius: 8,
                                    fontFamily: FONT,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  + New Folder
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        (() => {
                          const renderFolderCard = (record) => {
                            const folderFileCount = permissionFilteredDocs.filter(
                              (d) =>
                                String(extractId(d.folderId) || "") ===
                                String(extractId(record)),
                            ).length;
                            const folderSubFolderCount =
                              permissionFilteredFolders.filter(
                                (f) =>
                                  String(getFolderParentId(f) || "") ===
                                  String(extractId(record)),
                              ).length;
                            const folderIsEditing =
                              editingTitleId === String(extractId(record));
                            const isEmpty =
                              folderFileCount === 0 && folderSubFolderCount === 0;

                            return (
                              <Col span={4} key={record._key}>
                                <div
                                  style={{ position: "relative", height: "100%" }}
                                >
                                  {canBulkSelectRecord(record) && (
                                    <Checkbox
                                      checked={selectedRowKeys.includes(
                                        record._key,
                                      )}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setSelectedRowKeys((prev) =>
                                          checked
                                            ? [...prev, record._key]
                                            : prev.filter(
                                                (k) => k !== record._key,
                                              ),
                                        );
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        position: "absolute",
                                        top: 8,
                                        right: 8,
                                        zIndex: 10,
                                      }}
                                    />
                                  )}
                                  <Card
                                    hoverable
                                    draggable={rowDragProps(record).draggable}
                                    onDragStart={(event) =>
                                      rowDragProps(record).onDragStart(event)
                                    }
                                    onDragOver={(event) =>
                                      rowDragProps(record).onDragOver(event)
                                    }
                                    onDrop={(event) =>
                                      rowDragProps(record).onDrop(event)
                                    }
                                    onDragEnd={clearDragState}
                                    onDragLeave={(event) =>
                                      rowDragProps(record).onDragLeave(event)
                                    }
                                    onClick={() => {
                                      if (
                                        !folderIsEditing &&
                                        activeSpace !== "trash"
                                      )
                                        setSelectedFolderId(
                                          String(extractId(record)),
                                        );
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const items =
                                        renderContextMenuItems(record);
                                      if (items.length > 0)
                                        setContextMenuState({
                                          open: true,
                                          x: e.clientX,
                                          y: e.clientY,
                                          record,
                                        });
                                    }}
                                    style={{
                                      borderRadius: 12,
                                      border: "0.5px solid #E5E7EB",
                                      cursor: "pointer",
                                      height: "100%",
                                      borderLeft: !isEmpty
                                        ? "2px solid #185FA5"
                                        : "0.5px solid #E5E7EB",
                                      ...getDropTargetStyle(record),
                                    }}
                                    bodyStyle={{
                                      padding: "12px",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 8,
                                      height: "100%",
                                    }}
                                  >
                                    {/* Icon */}
                                    <div
                                      style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 8,
                                        flexShrink: 0,
                                        background: isEmpty
                                          ? "#F3F4F6"
                                          : "#E6F1FB",
                                        color: isEmpty ? "#9CA3AF" : "#185FA5",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      {TYPE_ICONS.folder}
                                    </div>

                                    {/* Name */}
                                    {folderIsEditing ? (
                                      <div
                                        style={{ display: "flex", gap: 4 }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Input
                                          size="small"
                                          value={editingTitleValue}
                                          autoFocus
                                          onChange={(e) =>
                                            setEditingTitleValue(e.target.value)
                                          }
                                          onPressEnter={() =>
                                            handleSaveFileTitle(record)
                                          }
                                          style={{ flex: 1 }}
                                        />
                                        <Button
                                          size="small"
                                          type="primary"
                                          icon={CHECK_ICON}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveFileTitle(record);
                                          }}
                                        />
                                        <Button
                                          size="small"
                                          icon={CLOSE_ICON}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            cancelEditTitle();
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <Tooltip
                                        title={record.name || "Folder"}
                                        placement="top"
                                      >
                                        <div
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: "#111827",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            lineHeight: "1.4",
                                            wordBreak: "break-word",
                                          }}
                                        >
                                          {record.name || "Folder"}
                                        </div>
                                      </Tooltip>
                                    )}

                                    {/* Empty state or count + meta */}
                                    <div
                                      style={{
                                        marginTop: "auto",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 4,
                                      }}
                                    >
                                      {activeSpace === "trash" ? (
                                        <React.Fragment>
                                          <span
                                            style={{
                                              fontSize: 10,
                                              color: "#6B7280",
                                              fontFamily: FONT,
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                            title={getRecordPathString(record)}
                                          >
                                            Source: {getRecordPathString(record)}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: 10,
                                              color: "#9CA3AF",
                                              fontFamily: FONT,
                                            }}
                                          >
                                            Deleted:{" "}
                                            {formatDate(
                                              record.deletedAt ||
                                                record.updatedAt ||
                                                record.deleted_at,
                                            )}
                                          </span>
                                        </React.Fragment>
                                      ) : (
                                        <React.Fragment>
                                          {isEmpty ? (
                                            <div
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {getRecordPerms(record).canCreate && (
                                                <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const fid = String(
                                                    extractId(record),
                                                  );
                                                  directFileTargetRef.current =
                                                    fid;
                                                  setSelectedFolderId(fid);
                                                  setTimeout(
                                                    () =>
                                                      fileInputRef.current?.click(),
                                                    0,
                                                  );
                                                }}
                                                style={{
                                                  fontSize: 11,
                                                  color: "#185FA5",
                                                  background: "none",
                                                  border: "none",
                                                  padding: 0,
                                                  cursor: "pointer",
                                                  fontFamily: FONT,
                                                }}
                                              >
                                                + Upload first file
                                                </button>
                                              )}
                                            </div>
                                          ) : (
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: "#185FA5",
                                              }}
                                            >
                                              {folderSubFolderCount} Folder(s) ·{" "}
                                              {folderFileCount} file
                                            </span>
                                          )}
                                          <div
                                            style={{
                                              display: "flex",
                                              flexDirection: "column",
                                              marginTop: 2,
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: 10,
                                                color: "#6B7280",
                                                fontFamily: FONT,
                                              }}
                                            >
                                              Created:{" "}
                                              {formatDate(
                                                record.createdAt ||
                                                  record.updatedAt,
                                              )}
                                            </span>
                                            <span
                                              style={{
                                                fontSize: 10,
                                                color: "#6B7280",
                                                fontFamily: FONT,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                              }}
                                              title={getUploadUserName(record)}
                                            >
                                              Created by:{" "}
                                              {getUploadUserName(record)}
                                            </span>
                                          </div>
                                        </React.Fragment>
                                      )}
                                    </div>
                                  </Card>
                                </div>
                              </Col>
                            );
                          };

                          const renderFileCard = (record) => {
                            const fileIsEditing =
                              editingTitleId === String(extractId(record));
                            const cardFileName =
                              getDocTitle(record) ||
                              record.googleDriveUrl ||
                              "No file attached";
                            const cardHasFile = !!getRecordFileUrl(record);
                            const ext = getFileExtension(record);

                            const EXT_BADGE = {
                              ".pdf": {
                                bg: "#FCEBEB",
                                color: "#A32D2D",
                                label: "PDF",
                              },
                              ".doc": {
                                bg: "#E6F1FB",
                                color: "#185FA5",
                                label: "DOC",
                              },
                              ".docx": {
                                bg: "#E6F1FB",
                                color: "#185FA5",
                                label: "DOCX",
                              },
                              ".xls": {
                                bg: "#EAF3DE",
                                color: "#3B6D11",
                                label: "XLS",
                              },
                              ".xlsx": {
                                bg: "#EAF3DE",
                                color: "#3B6D11",
                                label: "XLSX",
                              },
                              ".ppt": {
                                bg: "#FAEEDA",
                                color: "#854F0B",
                                label: "PPT",
                              },
                              ".pptx": {
                                bg: "#FAEEDA",
                                color: "#854F0B",
                                label: "PPTX",
                              },
                              ".png": {
                                bg: "#F0FDF4",
                                color: "#3B6D11",
                                label: "PNG",
                              },
                              ".jpg": {
                                bg: "#F0FDF4",
                                color: "#3B6D11",
                                label: "JPG",
                              },
                              ".jpeg": {
                                bg: "#F0FDF4",
                                color: "#3B6D11",
                                label: "JPEG",
                              },
                              ".gif": {
                                bg: "#F0FDF4",
                                color: "#3B6D11",
                                label: "GIF",
                              },
                              ".webp": {
                                bg: "#F0FDF4",
                                color: "#3B6D11",
                                label: "WEBP",
                              },
                              ".svg": {
                                bg: "#F0FDF4",
                                color: "#3B6D11",
                                label: "SVG",
                              },
                              ".mp4": {
                                bg: "#F3F4F6",
                                color: "#6B7280",
                                label: "MP4",
                              },
                              ".zip": {
                                bg: "#F3F4F6",
                                color: "#6B7280",
                                label: "ZIP",
                              },
                              ".rar": {
                                bg: "#F3F4F6",
                                color: "#6B7280",
                                label: "RAR",
                              },
                              ".txt": {
                                bg: "#F3F4F6",
                                color: "#6B7280",
                                label: "TXT",
                              },
                              ".csv": {
                                bg: "#EAF3DE",
                                color: "#3B6D11",
                                label: "CSV",
                              },
                            };
                            const extInfo = EXT_BADGE[ext] || {
                              bg: "#F3F4F6",
                              color: "#6B7280",
                              label: (ext || "FILE")
                                .replace(".", "")
                                .toUpperCase(),
                            };

                            return (
                              <Col span={4} key={record._key}>
                                <div
                                  style={{ position: "relative", height: "100%" }}
                                >
                                  {canBulkSelectRecord(record) && (
                                    <Checkbox
                                      checked={selectedRowKeys.includes(
                                        record._key,
                                      )}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setSelectedRowKeys((prev) =>
                                          checked
                                            ? [...prev, record._key]
                                            : prev.filter(
                                                (k) => k !== record._key,
                                              ),
                                        );
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        position: "absolute",
                                        top: 8,
                                        right: 8,
                                        zIndex: 10,
                                      }}
                                    />
                                  )}
                                  <div
                                    draggable={rowDragProps(record).draggable}
                                    onDragStart={(event) =>
                                      rowDragProps(record).onDragStart(event)
                                    }
                                    onDragOver={(event) =>
                                      rowDragProps(record).onDragOver(event)
                                    }
                                    onDrop={(event) =>
                                      rowDragProps(record).onDrop(event)
                                    }
                                    onDragEnd={clearDragState}
                                    onDragLeave={(event) =>
                                      rowDragProps(record).onDragLeave(event)
                                    }
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const items =
                                        renderContextMenuItems(record);
                                      if (items.length > 0)
                                        setContextMenuState({
                                          open: true,
                                          x: e.clientX,
                                          y: e.clientY,
                                          record,
                                        });
                                    }}
                                    style={{
                                      position: "relative",
                                      borderRadius: 12,
                                      border: "0.5px solid #E5E7EB",
                                      background: "#fff",
                                      cursor: "pointer",
                                      overflow: "hidden",
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                      transition:
                                        "box-shadow 0.15s, border-color 0.15s",
                                      display: "flex",
                                      flexDirection: "column",
                                      height: 170,
                                      ...getDropTargetStyle(record),
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.boxShadow =
                                        "0 4px 12px rgba(0,0,0,0.08)";
                                      e.currentTarget.style.borderColor =
                                        "#D1D5DB";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.boxShadow =
                                        "0 1px 3px rgba(0,0,0,0.04)";
                                      e.currentTarget.style.borderColor =
                                        "#E5E7EB";
                                    }}
                                    onClick={() => {
                                      if (cardHasFile && !fileIsEditing)
                                        previewRecordFile(record);
                                    }}
                                  >
                                    {/* Thumbnail */}
                                    <div
                                      style={{
                                        flex: 1,
                                        background: "#FAFAFA",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        position: "relative",
                                        overflow: "hidden",
                                        borderBottom: "0.5px solid #F0F0F0",
                                      }}
                                    >
                                      {getFileSvgIcon(ext)}
                                      {/* Extension badge */}
                                      <span
                                        style={{
                                          position: "absolute",
                                          bottom: 6,
                                          right: 8,
                                          fontSize: 9,
                                          fontWeight: 700,
                                          letterSpacing: 0.5,
                                          color: extInfo.color,
                                          background: extInfo.bg,
                                          borderRadius: 4,
                                          padding: "2px 5px",
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        {extInfo.label}
                                      </span>
                                    </div>

                                    {/* Info */}
                                    <div
                                      style={{
                                        padding: "8px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 3,
                                        overflow: "hidden",
                                      }}
                                    >
                                      {fileIsEditing ? (
                                        <div
                                          style={{ display: "flex", gap: 4 }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Input
                                            size="small"
                                            value={editingTitleValue}
                                            autoFocus
                                            onChange={(e) =>
                                              setEditingTitleValue(e.target.value)
                                            }
                                            onPressEnter={() =>
                                              handleSaveFileTitle(record)
                                            }
                                            style={{ flex: 1, fontSize: 10 }}
                                          />
                                          <Button
                                            size="small"
                                            type="primary"
                                            icon={CHECK_ICON}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSaveFileTitle(record);
                                            }}
                                          />
                                          <Button
                                            size="small"
                                            icon={CLOSE_ICON}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              cancelEditTitle();
                                            }}
                                          />
                                        </div>
                                      ) : (
                                        <Tooltip
                                          title={cardFileName}
                                          placement="top"
                                        >
                                          <div
                                            style={{
                                              fontWeight: 600,
                                              fontSize: 11,
                                              color: cardHasFile
                                                ? "#111827"
                                                : "#6B7280",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                              lineHeight: "16px",
                                            }}
                                          >
                                            {cardFileName}
                                          </div>
                                        </Tooltip>
                                      )}
                                      {activeSpace === "trash" ? (
                                        <div
                                          style={{
                                            fontSize: 10,
                                            color: "#6B7280",
                                            lineHeight: "14px",
                                          }}
                                        >
                                          <div
                                            style={{
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                            title={getRecordPathString(record)}
                                          >
                                            Source: {getRecordPathString(record)}
                                          </div>
                                          <div
                                            style={{
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                              color: "#9CA3AF",
                                            }}
                                          >
                                            Deleted:{" "}
                                            {formatDate(
                                              record.deletedAt ||
                                                record.updatedAt ||
                                                record.deleted_at,
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            fontSize: 10,
                                            color: "#6B7280",
                                            lineHeight: "14px",
                                          }}
                                        >
                                          <div
                                            style={{
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            Created:{" "}
                                            {formatDate(
                                              record.uploadedAt ||
                                                record.createdAt ||
                                                getDocDate(record),
                                            )}
                                          </div>
                                          <div
                                            style={{
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                            title={getUploadUserName(record)}
                                          >
                                            Created by: {getUploadUserName(record)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Col>
                            );
                          };

                          return (
                            <React.Fragment>
                              {/* ── Section: Case Tham Chiếu ── */}
                              {tableData.some(
                                (r) => r._type === "legal_reference_record",
                              ) && (
                                <Row
                                  gutter={[12, 12]}
                                  style={{ marginBottom: 20 }}
                                >
                                  {tableData
                                    .filter(
                                      (r) => r._type === "legal_reference_record",
                                    )
                                    .map((record) => {
                                      const refId = String(extractId(record));
                                      const filesCount = documents.filter(
                                        (doc) =>
                                          String(
                                            getRecordLegalReferenceId(doc),
                                          ) === refId && !doc.isDeleted,
                                      ).length;
                                      const foldersCount = folders.filter(
                                        (f) =>
                                          String(getRecordLegalReferenceId(f)) ===
                                            refId && !f.isDeleted,
                                      ).length;
                                      return (
                                        <Col span={6} key={record._key}>
                                          <Card
                                            hoverable
                                            onClick={() =>
                                              openLegalReferenceDetail(record)
                                            }
                                            onContextMenu={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setContextMenuState({
                                                open: true,
                                                x: e.clientX,
                                                y: e.clientY,
                                                record: {
                                                  ...record,
                                                  _type: "legal_reference_record",
                                                },
                                              });
                                            }}
                                            style={{
                                              borderRadius: 12,
                                              border: "0.5px solid #E5E7EB",
                                              cursor: "pointer",
                                              height: "100%",
                                              borderLeft: "3px solid #185FA5",
                                              background: "#FFFFFF",
                                            }}
                                            bodyStyle={{
                                              padding: "16px",
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: 8,
                                              height: "100%",
                                            }}
                                          >
                                            <div
                                              style={{
                                                fontWeight: 600,
                                                fontSize: 14,
                                                color: "#111827",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              {record.title ||
                                                record.name ||
                                                getLegalReferenceDisplayName(
                                                  record,
                                                )}
                                            </div>
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 4,
                                                marginTop: 4,
                                                fontSize: 12,
                                                color: "#6B7280",
                                              }}
                                            >
                                              <div>
                                                <span
                                                  style={{ color: "#9CA3AF" }}
                                                >
                                                  Created by:{" "}
                                                </span>
                                                <strong>
                                                  {record.createdBy?.nickname ||
                                                    record.createdBy?.username ||
                                                    "System"}
                                                </strong>
                                              </div>
                                              <div>
                                                <span
                                                  style={{ color: "#9CA3AF" }}
                                                >
                                                  Created:{" "}
                                                </span>
                                                <span>
                                                  {record.createdAt
                                                    ? new Date(
                                                        record.createdAt,
                                                      ).toLocaleString("vi-VN", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                      })
                                                    : "—"}
                                                </span>
                                              </div>
                                            </div>
                                            <div
                                              style={{
                                                marginTop: "auto",
                                                paddingTop: 8,
                                                borderTop: "0.5px solid #F3F4F6",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontSize: 11,
                                                  color: "#9CA3AF",
                                                }}
                                              >
                                                Resources:
                                              </span>
                                              <span
                                                style={{
                                                  fontSize: 11,
                                                  fontWeight: 600,
                                                  color: "#185FA5",
                                                }}
                                              >
                                                {foldersCount} Folder(s) ·{" "}
                                                {filesCount} file
                                              </span>
                                            </div>
                                          </Card>
                                        </Col>
                                      );
                                    })}
                                </Row>
                              )}

                              {/* ── Section: Thư mục ── */}
                              {tableData.some((r) => r._type === "folder") && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: "#6B7280",
                                    marginBottom: 10,
                                    fontFamily: FONT,
                                  }}
                                >
                                  Folder
                                </div>
                              )}
                              <Row
                                gutter={[10, 10]}
                                style={{
                                  marginBottom:
                                    tableData.some((r) => r._type === "file") &&
                                    tableData.some((r) => r._type === "folder")
                                      ? 20
                                      : 0,
                                }}
                              >
                                {tableData
                                  .filter((r) => r._type === "folder")
                                  .map((record) => renderFolderCard(record))}
                              </Row>

                              {/* ── Section: Tài liệu ── */}
                              {tableData.some((r) => r._type === "file") && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: "#6B7280",
                                    marginBottom: 10,
                                    fontFamily: FONT,
                                  }}
                                >
                                  Document
                                </div>
                              )}
                              <Row gutter={[10, 10]}>
                                {tableData
                                  .filter((r) => r._type === "file")
                                  .map((record) => renderFileCard(record))}
                              </Row>
                            </React.Fragment>
                          );
                        })()
                      )}
                    </React.Fragment>
                  ) : (
                    <Table
                      rowSelection={bulkRowSelection}
                      rowKey={(record) => record._key}
                      columns={tableColumns.filter(
                        (column) => column.key !== "actions",
                      )}
                      dataSource={tableData}
                      size="middle"
                      pagination={{ pageSize: 20, showSizeChanger: true }}
                      scroll={{ x: "max-content" }}
                      onRow={(record) => rowDragProps(record)}
                      locale={{
                        emptyText: (
                          <div style={{ padding: "40px 0", textAlign: "center" }}>
                            <div style={{ fontSize: 14, color: "#9CA3AF" }}>
                              {query
                                ? "No results found"
                                : activeSpace === "trash"
                                  ? "Trash is empty"
                                  : "Folder is empty"}
                            </div>
                          </div>
                        ),
                      }}
                      style={{ fontFamily: FONT }}
                    />
                  )}
                </React.Fragment>
              )}
            </Content>
          </Layout>
        </Layout>

        <Modal
          title={
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#111827",
                fontFamily: FONT,
              }}
            >
              New Folder
            </span>
          }
          open={isFolderOpen}
          onCancel={() => {
            setIsFolderOpen(false);
            folderForm.resetFields();
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setIsFolderOpen(false);
                folderForm.resetFields();
              }}
              style={{
                borderRadius: 8,
                border: "0.5px solid #E5E7EB",
                color: "#6B7280",
              }}
            >
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={folderLoading}
              onClick={() => folderForm.submit()}
              style={{
                borderRadius: 8,
                background: "#111827",
                borderColor: "#111827",
              }}
            >
              Submit
            </Button>,
          ]}
          afterOpenChange={(open) => {
            if (open) {
              setTimeout(() => folderNameInputRef.current?.focus?.(), 0);
            }
          }}
          width={420}
          destroyOnClose
        >
          <Form
            form={folderForm}
            layout="vertical"
            onFinish={handleCreateFolder}
            style={{ marginTop: 12 }}
          >
            <Form.Item
              name="name"
              label="Folder Name"
              rules={[{ required: true, message: "Please enter a folder name" }]}
            >
              <Input ref={folderNameInputRef} placeholder="Enter folder name..." />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#111827",
                fontFamily: FONT,
              }}
            >
              Upload Folder
            </span>
          }
          open={bulkConfirmOpen}
          onCancel={() => {
            if (bulkUploading) return;
            setBulkConfirmOpen(false);
            setPendingFolderFiles([]);
          }}
          footer={[
            <Button
              key="cancel"
              disabled={bulkUploading}
              onClick={() => setBulkConfirmOpen(false)}
              style={{
                borderRadius: 8,
                border: "0.5px solid #E5E7EB",
                color: "#6B7280",
              }}
            >
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={bulkUploading}
              onClick={executeFolderUpload}
              style={{
                borderRadius: 8,
                background: "#111827",
                borderColor: "#111827",
              }}
            >
              Confirm Upload
            </Button>,
          ]}
        >
          <Text>
            Selected {pendingFolderFiles.length} file(s) from an external folder.
          </Text>
          <div style={{ marginTop: 16 }}>
            <Text strong>Upload to:</Text>
            <TreeSelect
              value={bulkTargetId}
              onChange={setBulkTargetId}
              treeData={treeData}
              style={{ width: "100%", marginTop: 8 }}
              treeDefaultExpandAll
            />
          </div>
          {bulkUploading && (
            <div style={{ marginTop: 18 }}>
              <Progress percent={bulkPercent} status="active" showInfo={false} />
              <Text type="secondary">{bulkProgress}</Text>
            </div>
          )}
        </Modal>

        <Modal
          title={
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#111827",
                fontFamily: FONT,
              }}
            >
              Move
            </span>
          }
          open={!!moveRecord}
          onCancel={() => setMoveRecord(null)}
          footer={[
            <Button
              key="cancel"
              onClick={() => setMoveRecord(null)}
              style={{
                borderRadius: 8,
                border: "0.5px solid #E5E7EB",
                color: "#6B7280",
              }}
            >
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              onClick={() => handleMoveRecord(moveRecord, moveTargetId)}
              style={{
                borderRadius: 8,
                background: "#111827",
                borderColor: "#111827",
              }}
            >
              Move
            </Button>,
          ]}
        >
          <Text>
            Select destination folder for{" "}
            <b>
              {moveRecord?._type === "folder"
                ? moveRecord?.name
                : getDocTitle(moveRecord)}
            </b>
          </Text>
          <TreeSelect
            value={moveTargetId}
            onChange={setMoveTargetId}
            treeData={moveTreeData}
            style={{ width: "100%", marginTop: 14 }}
            treeDefaultExpandAll
          />
        </Modal>

        <Modal
          title={
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#111827",
                fontFamily: FONT,
              }}
            >
              Create Case Study
            </span>
          }
          open={isCreateTemplateOpen}
          onCancel={closeCreateReferenceModal}
          footer={null}
          destroyOnClose
          width={680}
        >
          <Form
            form={createTemplateForm}
            layout="vertical"
            onFinish={handleCreateLegalReference}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="title"
                  label="Case Study Name"
                  rules={[{ required: true, message: "Please enter a name" }]}
                >
                  <Input placeholder="Enter case study name..." />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="internalCompanyId"
                  label="Internal Company"
                  rules={[{ required: true, message: "Select a company" }]}
                  initialValue={activeCompanyId}
                >
                  <Select placeholder="Select company..." allowClear>
                    {companies.map((c) => (
                      <Select.Option
                        key={String(extractId(c))}
                        value={String(extractId(c))}
                      >
                        {c.name || c.title || `Company #${extractId(c)}`}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="Case Study Summary">
              <Input.TextArea
                rows={4}
                placeholder="Summarize the case study content..."
              />
            </Form.Item>
            <Form.Item
              name="caseIds"
              label="Linked Cases"
              extra="Link to ongoing cases in the system."
            >
              <Select
                mode="multiple"
                placeholder="Select linked cases..."
                allowClear
                optionFilterProp="label"
              >
                {projects.map((proj) => {
                  const pid = String(extractId(proj));
                  const label = proj.projectName
                    ? `${proj.caseCode ? `[${proj.caseCode}] ` : ""}${proj.projectName}`
                    : `Case #${pid}`;
                  return (
                    <Select.Option key={pid} value={pid} label={label}>
                      {label}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
            <div
              style={{
                border: "1px dashed #D1D5DB",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                background: "#F9FAFB",
              }}
            >
              <Text
                strong
                style={{ display: "block", marginBottom: 10, color: "#374151" }}
              >
                Upload documents (optional)
              </Text>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  type="default"
                  onClick={() => createReferenceFileInputRef.current?.click()}
                  style={{
                    borderRadius: 8,
                    border: "0.5px solid #E5E7EB",
                    color: "#185FA5",
                  }}
                >
                  Choose file
                </Button>
                <Button
                  type="default"
                  onClick={() => createReferenceFolderInputRef.current?.click()}
                  style={{
                    borderRadius: 8,
                    border: "0.5px solid #E5E7EB",
                    color: "#185FA5",
                  }}
                >
                  Choose folder
                </Button>
                {(createReferenceFiles.length > 0 ||
                  createReferenceFolderFiles.length > 0) && (
                  <Button
                    type="text"
                    onClick={() => {
                      setCreateReferenceFiles([]);
                      setCreateReferenceFolderFiles([]);
                    }}
                    style={{ color: "#6B7280" }}
                  >
                    Clear selection
                  </Button>
                )}
              </div>
              {(createReferenceFiles.length > 0 ||
                createReferenceFolderFiles.length > 0) && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {createReferenceFiles.length > 0 && (
                    <Tag color="blue">{createReferenceFiles.length} file</Tag>
                  )}
                  {createReferenceFolderFiles.length > 0 && (
                    <Tag color="green">
                      {createReferenceFolderFiles.length} file trong folder
                    </Tag>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button
                onClick={closeCreateReferenceModal}
                style={{
                  borderRadius: 8,
                  border: "0.5px solid #E5E7EB",
                  color: "#6B7280",
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createTemplateLoading}
                style={{
                  borderRadius: 8,
                  background: "#185FA5",
                  borderColor: "#185FA5",
                }}
              >
                Create
              </Button>
            </div>
          </Form>
        </Modal>

        <Modal
          title={
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#111827",
                fontFamily: FONT,
              }}
            >
              Edit document item
            </span>
          }
          open={!!editTemplateRecord}
          onCancel={() => {
            setEditTemplateRecord(null);
            editTemplateForm.resetFields();
          }}
          footer={null}
          destroyOnClose
        >
          <Form
            form={editTemplateForm}
            layout="vertical"
            onFinish={handleEditTemplateSubmit}
          >
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, message: "Please enter a title" }]}
            >
              <Input placeholder="Enter title..." />
            </Form.Item>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button
                onClick={() => setEditTemplateRecord(null)}
                style={{
                  borderRadius: 8,
                  border: "0.5px solid #E5E7EB",
                  color: "#6B7280",
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={editTemplateLoading}
                style={{
                  borderRadius: 8,
                  background: "#111827",
                  borderColor: "#111827",
                }}
              >
                Save
              </Button>
            </div>
          </Form>
        </Modal>

        <Modal
          title={
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#111827",
                fontFamily: FONT,
              }}
            >
              Rename
            </span>
          }
          open={!!renameRecord}
          onCancel={() => {
            setRenameRecord(null);
            renameForm.resetFields();
          }}
          onOk={handleRenameSubmit}
          okText="Save"
          cancelText="Cancel"
          destroyOnClose
        >
          <Form form={renameForm} layout="vertical">
            <Form.Item
              name="name"
              label="New name"
              rules={[{ required: true, message: "Please enter a name" }]}
            >
              <Input placeholder="Enter new name..." />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#111827",
                fontFamily: FONT,
              }}
            >
              Link Case Study
            </span>
          }
          open={isLinkCaseOpen}
          onCancel={() => {
            setIsLinkCaseOpen(false);
            setLinkCaseRecord(null);
            linkCaseForm.resetFields();
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setIsLinkCaseOpen(false);
                setLinkCaseRecord(null);
                linkCaseForm.resetFields();
              }}
              style={{
                borderRadius: 8,
                border: "0.5px solid #E5E7EB",
                color: "#6B7280",
              }}
            >
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={linkCaseLoading}
              onClick={() => linkCaseForm.submit()}
              style={{
                borderRadius: 8,
                background: "#185FA5",
                borderColor: "#185FA5",
              }}
            >
              Save links
            </Button>,
          ]}
          destroyOnClose
        >
          <Form
            form={linkCaseForm}
            layout="vertical"
            onFinish={handleLinkCaseSubmit}
          >
            <Form.Item
              name="caseIds"
              label="Select ongoing Cases/Projects to link"
              extra="The list is drawn from existing projects in the system."
            >
              <Select
                mode="multiple"
                placeholder="Select case..."
                allowClear
                optionFilterProp="label"
                style={{ width: "100%" }}
              >
                {projects
                  .filter(
                    (p) =>
                      !usedProjectIds.has(String(extractId(p))) ||
                      activeLinkedIds.has(String(extractId(p))),
                  )
                  .map((proj) => {
                    const pid = String(extractId(proj));
                    const label = proj.projectName
                      ? `${proj.caseCode ? `[${proj.caseCode}] ` : ""}${proj.projectName}`
                      : `Case #${pid}`;
                    return (
                      <Select.Option key={pid} value={pid} label={label}>
                        {label}
                      </Select.Option>
                    );
                  })}
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#111827",
                fontFamily: FONT,
              }}
            >
              Move multiple items
            </span>
          }
          open={isBulkMoveOpen}
          onCancel={() => setIsBulkMoveOpen(false)}
          footer={[
            <Button
              key="cancel"
              onClick={() => setIsBulkMoveOpen(false)}
              style={{
                borderRadius: 8,
                border: "0.5px solid #E5E7EB",
                color: "#6B7280",
              }}
            >
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              onClick={handleBulkMoveSubmit}
              style={{
                borderRadius: 8,
                background: "#185FA5",
                borderColor: "#185FA5",
              }}
            >
              Move
            </Button>,
          ]}
        >
          <Text>
            Select destination folder for <b>{selectedRowKeys.length} selected items</b>
          </Text>
          <TreeSelect
            value={bulkMoveTargetId}
            onChange={setBulkMoveTargetId}
            treeData={moveTreeData}
            style={{ width: "100%", marginTop: 14 }}
            treeDefaultExpandAll
          />
        </Modal>

        <PreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={openRecordFile}
        />

        <FileShareModal
          open={!!shareFileRecord}
          file={shareFileRecord}
          onClose={() => setShareFileRecord(null)}
          onSuccess={() => {
            setShareFileRecord(null);
            loadData();
            if (activeSpace === "recent") {
              fetchActivityLogs();
            }
          }}
        />

        <FolderPermissionsModal
          open={!!permissionFolder}
          folder={permissionFolder}
          allFolders={customerCaseFolders}
          onClose={() => setPermissionFolder(null)}
          onSuccess={(permissionResult = {}) => {
            createManualActivityLog(permissionFolder, "permission_updated", {
              collectionName: "Folder",
              fieldName: "permissions",
              newValue:
                permissionResult.accessSummary ||
                "No one has been granted access",
            });
            setPermissionFolder(null);
            loadData();
          }}
        />

        <DocumentUploadFieldsModal
          open={!!uploadFieldsTarget}
          files={uploadFieldsTarget?.files || []}
          onClose={() => setUploadFieldsTarget(null)}
          onSubmit={handleConfirmUploadFields}
        />
      </React.Fragment>
    );
  };

  // ============================================================
  // §4 RENDER
  // ============================================================
  ctx.render(React.createElement(InternalTemplates));
