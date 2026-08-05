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
  Progress,
  TreeSelect,
  Dropdown,
  Checkbox,
  Radio,
} = ctx.antd;
const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const FONT =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const GRID_COL_PROPS = { xs: 24, sm: 12, md: 8, lg: 6, xl: 4, xxl: 4 };
const REFERENCE_COL_PROPS = { xs: 24, sm: 12, md: 8, lg: 6, xl: 6, xxl: 4 };
const DASHBOARD_CONFIG = {
  // ── Collection chính (document / folder sẽ lưu relation về đây) ──────────
  collection: "projects", // current case collection

  // ── Scope lọc folder & document ──────────────────────────────────────────
  moduleScope: "case_document", // scope chính ghi vào DB
  moduleScopes: ["case_document", "case_documents", "case", "cases"], // danh sách scope được chấp nhận (filter $in)

  // ── API endpoints để fetch danh sách "parent" (Legal Reference / Customer…) ──
  parentListCandidates: [
    // thử lần lượt đến khi thành công
    "projects:list",
  ],
  parentCreateCandidates: [],

  // ── Tên field relation trong document/folder trỏ về "parent" ─────────────
  // Thứ tự: field chính → các alias fallback (dùng khi thử tạo record)
  relationFieldCandidates: [
    "caseId", // scalar FK in documents
    "cases", // belongsTo relation field
    "projectId", // legacy folder FK for case folders
    "project", // legacy relation alias
  ],

  // ── Hàm lấy ID của parent từ 1 record folder/document ───────────────────
  getParentIdFromRecord: (record) =>
    extractId(record?.caseId) ||
    extractRelationId(record?.cases) ||
    extractId(record?.projectId) ||
    extractRelationId(record?.project),

  // ── Hàm lấy ID của parent từ 1 record sidebar (Legal Reference / Customer) ─
  getParentListId: (record) =>
    extractId(record?.caseId) ||
    extractRelationId(record?.cases) ||
    extractId(record?.projectId) ||
    extractRelationId(record?.project) ||
    extractId(record?.id),

  // ── Nhãn hiển thị trong UI ────────────────────────────────────────────────
  label: {
    sidebar: "Cases",
    sidebarItem: "Case",
    createButton: "Create case folder",
    searchPlaceholder: "Search case documents...",
  },
};

// Shorthand constants (để không phải đổi code bên dưới)
const INTERNAL_TEMPLATE_COLLECTION = DASHBOARD_CONFIG.collection;
const INTERNAL_TEMPLATE_MODULE_SCOPE = DASHBOARD_CONFIG.moduleScope;
const INTERNAL_TEMPLATE_MODULE_SCOPES = DASHBOARD_CONFIG.moduleScopes;
const DOCUMENT_SAFE_FIELDS = [
  "id",
  "documentType",
  "collectionName",
  "googleDriveUrl",
  "uploadedById",
  "createdById",
  "updatedById",
  "createdAt",
  "updatedAt",
  "documentCode",
  "title",
  "openingDate",
  "signedAt",
  "effectiveAt",
  "status",
  "senderName",
  "recipientName",
  "language",
  "docFormat",
  "description",
  "note",
  "folderId",
  "fileIndex",
  "batchId",
  "isDeleted",
  "deletedAt",
  "moduleScope",
  "sourceProjectId",
  "sourceTaskId",
  "sourceCollectionName",
  "sourceRecordId",
  "movedToLegalReferenceAt",
  "movedToLegalReferenceById",
  "internalCompanyId",
  "legalReferenceId",
  "internalTemplateId",
  "storageType",
  "customerId",
  "caseId",
  "contractId",
  "quotationId",
  "taskId",
  "subTaskId",
];

const sanitizeDocumentFields = (fields) => {
  const source = Array.isArray(fields)
    ? fields
    : typeof fields === "string"
      ? fields.split(",")
      : DOCUMENT_SAFE_FIELDS;
  return source
    .map((field) => String(field || "").trim())
    .filter((field) => field && field !== "recordId");
};

const withDocumentSafeFields = (params = {}) => ({
  ...params,
  fields: sanitizeDocumentFields(params?.fields),
});

const stripDocumentLegacyPayload = (payload = {}) => {
  const { recordId, ...safePayload } = payload || {};
  return safePayload;
};
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
  doc?.name ||
  doc?.title ||
  doc?.templateName ||
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
const getCurrentUserId = () =>
  extractId(ctx?.currentUser) ||
  extractId(ctx?.user) ||
  extractId(ctx?.state?.currentUser) ||
  null;

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

const getLinkedCaseId = (record) =>
  extractId(record?.caseId) ||
  extractRelationId(record?.cases) ||
  extractId(record?.projectId) ||
  extractRelationId(record?.project);

const getCaseCustomerId = (record) =>
  extractId(record?.customerId) ||
  extractRelationId(record?.customers) ||
  extractRelationId(record?.customer) ||
  extractId(record?.clientId) ||
  extractRelationId(record?.clients);

const getCaseDisplayName = (record) => {
  if (!record) return "Cases";
  const code =
    record.caseCode || record.caseNumber || record.projectCode || record.code;
  const title =
    record.projectName || record.title || record.name || record.description;
  if (code && title && String(code) !== String(title))
    return `${code} - ${title}`;
  return (
    title ||
    code ||
    (extractId(record) ? `Case #${extractId(record)}` : "Cases")
  );
};

const getUrlFilterId = () => {
  try {
    const href = String(window?.location?.href || "");
    const pathMatch = href.match(/filterbytk\/(\d+)/i);
    if (pathMatch?.[1]) return pathMatch[1];
    const queryMatch = href.match(/[?&]filterByTk=(\d+)/i);
    if (queryMatch?.[1]) return queryMatch[1];
  } catch {}
  return null;
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
const LEGAL_STUDY_ACTIVITY_ACTIONS = new Set([
  "linked_legal_study",
  "unlinked_legal_study",
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
  !LEGAL_STUDY_ACTIVITY_ACTIONS.has(log.action) &&
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

const getInitialCaseContext = () => {
  const record =
    ctx?.record ||
    ctx?.popup?.record ||
    ctx?.data?.record ||
    ctx?.form?.values ||
    ctx?.action?.record ||
    null;
  const caseId =
    getLinkedCaseId(record) ||
    extractId(record?.id) ||
    extractId(ctx?.recordId) ||
    extractId(ctx?.filterByTk) ||
    extractId(ctx?.params?.filterByTk) ||
    getUrlFilterId();
  return {
    caseId: caseId ? String(caseId) : null,
    record: record && extractId(record) ? record : null,
  };
};

const matchesCaseFolder = (folder, caseId) => {
  const safeCaseId = extractId(caseId);
  if (!safeCaseId) return false;
  return String(getLinkedCaseId(folder) || "") === String(safeCaseId);
};

const matchesCaseDocument = (doc, caseId, folderIdSet = null) => {
  const safeCaseId = extractId(caseId);
  if (!safeCaseId) return false;
  if (String(getLinkedCaseId(doc) || "") === String(safeCaseId)) return true;
  const folderId = extractId(doc?.folderId);
  return !!(folderId && folderIdSet?.has(String(folderId)));
};
const getUserDisplayName = (user) =>
  user?.nickname ||
  user?.username ||
  user?.name ||
  user?.email ||
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  "";
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

// Display label only — matches Library.js's LEGAL_STUDY_LABEL rename.
// Internal keys (activeSpace "legal_study", storageType "legal_study",
// field names legalStudyId/legalMembers/...) stay unchanged; only the text
// shown to the user changes, so this doesn't touch stored data.
const REFERENCE_LABEL = "Reference";

const ROLE_LABEL = {
  admin:   "Admin",
  owner:   "Owner",
  manager: "Manager",
  editor:  "Editor",
  viewer:  "Viewer",
  shared:  "Shared",
};

// The 5 fixed template folders CaseCreateForm.js auto-creates per case
// (see its defaultChildren list) — never renameable by anyone, including
// admins. Mirrors Library.js's SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS/NAMES +
// isRenameLockedFolder exactly (duplicated per-file — see
// [[nocobase_single_file_constraint]]). Name-based fallback covers cases
// created before folderTemplateKey existed on this schema.
const SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS = new Set([
  "legal_study",
  "lsc_related",
  "legal_docs",
  "legal_dossiers",
  "report_result",
]);
const SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES = new Set([
  "legal study",
  "lsc & related",
  "legal docs",
  "legal dossiers",
  "report and result",
]);
const isRenameLockedFolder = (record) =>
  record?._type === "folder" &&
  Boolean(getLinkedCaseId(record)) &&
  (SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS.has(record?.folderTemplateKey) ||
    SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES.has(
      String(record?.name || "").trim().toLowerCase(),
    ));

// Matches Library.js's roleToPerms exactly — "editor"/"viewer" here are
// mostly a legacy/default fallback shape now (see the 2 direct
// roleToPerms("viewer") call sites below); the real per-Member capability
// tiers (viewer/editor/contributed) live in MEMBER_ROLE_CAPABILITIES /
// getMemberRoleTierPerms further down, which getFolderPermissions routes
// explicit folder Members through.
const roleToPerms = (role) => ({
  role,
  canView:              role !== null,
  canCreate:            ["admin","owner","manager","editor","viewer"].includes(role),
  canRename:            ["admin","owner","manager","editor"].includes(role),
  canMove:              ["admin","owner","manager","editor"].includes(role),
  canDelete:            ["admin","owner","manager","editor"].includes(role),
  canShare:             ["admin","owner","manager","editor"].includes(role),
  canManagePermissions: ["admin","owner","manager"].includes(role),
  isManager: ["admin","owner","manager"].includes(role),
  isMember:  role !== null,
  canEdit:   ["admin","owner","manager","editor"].includes(role),
});

// Standalone Reference (legalStudy collection, linked to this case via the
// "legalStudy" relation — see fetchLinkedRelationRows) permission model —
// matches Library.js's resolveLegalEntityFolderPerms exactly. Unlike case
// folders, a Reference carries its own direct `manager` (belongsTo lawyers,
// single) plus a `members` belongsToMany relation backed by the Legal
// Member table (legalMembers), which DOES carry a per-row role
// (viewer/editor/contributed) — never via folderManager/folderMembers.
const getLegalEntityManagerId = (record) =>
  extractId(record?.managerId) || extractRelationId(record?.manager);

const getEntityMemberRowLawyerId = (row) =>
  extractId(row?.memberId) || extractRelationId(row?.member);

// legalMembers table rows use member/memberId (not lawyer/lawyerId like
// folderManager/folderMembers rows) — getRelationLawyerRecord doesn't know
// that shape, so entity-permission code needs its own accessor.
const getEntityMemberRowLawyerRecord = (row) => {
  if (!row || typeof row !== "object") return {};
  if (row.member && typeof row.member === "object") return row.member;
  if (row.memberId && typeof row.memberId === "object") return row.memberId;
  return row;
};

// Role options offered for a legalMembers row in PermissionManagerModal —
// no "manager" here since Manager is a separate single-value field on the
// legalStudy record itself (see loadEntityPermissions/saveEntityPermissions),
// matching Library.js's ENTITY_MEMBER_ROLE_OPTIONS exactly.
const ENTITY_MEMBER_ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "contributed", label: "Contributed" },
];

// Endpoint candidates for writing the legalStudy record's own manager/
// managerId field (tried in order, first success wins) — matches
// Library.js's ENTITY_PERMISSION_UPDATE_CANDIDATES. Only "legal_study" is
// a permission-editable entity kind in this file (legal_reference/case
// gallery records don't carry a Manager/Members concept).
const ENTITY_PERMISSION_UPDATE_CANDIDATES = {
  legal_study: (id) => [
    `legalStudy:update?filterByTk=${id}`,
    `legalStudies:update?filterByTk=${id}`,
  ],
};

// Capability tiers for the Member role (viewer/editor/contributed) —
// shared by BOTH the Reference's entity-level Members (this file's
// resolveLegalEntityFolderPerms) AND regular folder Members
// (getFolderPermissions' folderMembers branch below), matching Library.js.
// A Reference Member is never promoted to "owner" via createdById — that
// bypass only applies to the folder-tree path.
const MEMBER_ROLE_CAPABILITIES = {
  viewer: {
    canCreate: true,
    canRename: false,
    canMove: false,
    canDelete: false,
    canShare: false,
    canEdit: false,
  },
  editor: {
    canCreate: true,
    canRename: true,
    canMove: false,
    canDelete: false,
    canShare: true,
    canEdit: true,
  },
  contributed: {
    canCreate: true,
    canRename: true,
    canMove: true,
    canDelete: true,
    canShare: true,
    canEdit: true,
  },
};
const getMemberRoleTierPerms = (role) => {
  const capabilities = MEMBER_ROLE_CAPABILITIES[role];
  if (!capabilities) return roleToPerms(null);
  return {
    role,
    canView: true,
    canManagePermissions: false,
    isManager: false,
    isMember: true,
    ...capabilities,
  };
};

// Resolves the effective permission tier for a Reference (legalStudy)
// folder/document, given the current lawyer id and the precomputed lookups
// in entityCtx (see entityPermissionContext below). Returns null when
// entityCtx wasn't supplied or the entity record hasn't loaded yet —
// callers fall back to roleToPerms(null). No owner/createdById bypass —
// access is governed strictly by admin status, Manager, or Legal Member
// role (mirrors Library.js exactly).
const resolveLegalEntityFolderPerms = (entityId, lwId, entityCtx) => {
  if (!entityCtx || !entityId || !lwId) return null;
  const entityRecord = entityCtx.legalStudyById?.get(String(entityId));
  if (!entityRecord) return null;
  const managerId = getLegalEntityManagerId(entityRecord);
  if (managerId && String(managerId) === String(lwId))
    return roleToPerms("manager");
  const roleMap = entityCtx.legalMemberRoleByStudy?.get(String(entityId));
  const role = roleMap?.get(String(lwId));
  if (!role) return roleToPerms(null);
  return getMemberRoleTierPerms(role);
};

// Standalone (case-less) Reference root folders — legalStudyId set, no
// projectId/caseId — can never be deleted, matching Library.js's
// isLegalStudyRootFolder. Root = no parentId, or "root" sentinel.
const isReferenceEntityRootFolder = (folder) =>
  Boolean(folder) &&
  Boolean(extractId(folder.legalStudyId)) &&
  !getLinkedCaseId(folder) &&
  (!getFolderParentId(folder) || getFolderParentId(folder) === "root");

// Root-only permission model (matches Library.js): a folder's own
// folderManagers/folderMembers rows and createdById no longer matter on
// their own — only the ROOT of its tree grants access. Walk up the
// parentId chain within `allFolders` to find that root. `allFolders` MUST
// include the root folder record itself — a root-excluded rendering list
// (e.g. caseReferenceVisibleFolders, which hides that root's own row from
// the tree body) makes this walk stop one level too low and resolve to a
// template child folder instead of the real root.
const resolveFolderTreeRoot = (folder, allFolders) => {
  if (!folder) return null;
  const folderById = new Map(
    (allFolders || []).map((f) => [String(extractId(f.id)), f]),
  );
  // Case-bound folders (getLinkedCaseId set) stop climbing once the parent
  // no longer carries the SAME case's link — the Case root's own parent is
  // the Customer folder above it, which must never be treated as part of
  // this case's tree (matches Library.js's resolveFolderTreeRootFromMap;
  // without this gate a Case root folder's permissions/canDelete would
  // silently resolve against the Customer folder instead of itself).
  const ownCaseId = getLinkedCaseId(folder);
  let current = folder;
  const visited = new Set();
  while (true) {
    const parentId = extractId(current.parentId);
    if (!parentId || parentId === "root") break;
    const parentKey = String(parentId);
    if (visited.has(parentKey)) break;
    visited.add(parentKey);
    const parent = folderById.get(parentKey);
    if (!parent) break;
    if (ownCaseId && !getLinkedCaseId(parent)) break;
    current = parent;
  }
  return current;
};

const lockDeleteIfReferenceEntityRoot = (folder, perms) =>
  isReferenceEntityRootFolder(folder) ? { ...perms, canDelete: false } : perms;

// Permissions is root-folder-only now — never offered on a subfolder
// (its own folderManagers/folderMembers rows are ignored by the
// root-only model above, so editing them there would silently do
// nothing). True when `folder` IS its own tree root.
const isFolderTreeRoot = (folder, allFolders) => {
  if (!folder) return false;
  const root = resolveFolderTreeRoot(folder, allFolders) || folder;
  return String(extractId(root)) === String(extractId(folder));
};

const getFolderPermissions = (folder, user, allFolders, currentLawyerId, entityCtx) => {
  if (isAdminUser(user)) return lockDeleteIfReferenceEntityRoot(folder, roleToPerms("admin"));
  if (!folder) return roleToPerms("admin");
  if (!user) return roleToPerms(null);

  const uid = extractId(user.id);
  const lwId = extractId(currentLawyerId);

  // Reference (legalStudy) bridge — every folder under a standalone
  // Reference carries its own legalStudyId directly (flat tagging, not
  // just on a root folder), so check the folder itself rather than the
  // physical folder tree's root. Checked BEFORE the generic case-folder
  // root check below, since that check's "root" is a physical-folder
  // concept unrelated to the entity.
  const entityStudyId = extractId(folder.legalStudyId);
  if (entityStudyId) {
    return lockDeleteIfReferenceEntityRoot(
      folder,
      resolveLegalEntityFolderPerms(entityStudyId, lwId, entityCtx) || roleToPerms(null),
    );
  }

  const root = resolveFolderTreeRoot(folder, allFolders) || folder;

  if (uid && String(extractId(root.createdById)) === String(uid)) return roleToPerms("owner");

  if (lwId) {
    const managers = getFolderManagerRows(root);
    const members = getFolderMemberRows(root);
    const isExplicitManager = managers.some((m) => String(getPermissionLawyerId(m)) === String(lwId));
    if (isExplicitManager) return roleToPerms("manager");

    const explicitMember = members.find((m) => String(getPermissionLawyerId(m)) === String(lwId));
    if (explicitMember) {
      // Capability tiers (viewer/editor/contributed) — same table used for
      // Reference (legalStudy) Members above, unified with folder Members
      // to match Library.js. "manager" here is legacy data from before
      // Manager became its own slot (folderManagers) — still honored.
      const r = getPermissionRole(explicitMember, "viewer");
      if (r === "manager") return roleToPerms("manager");
      return getMemberRoleTierPerms(r);
    }
  }

  return roleToPerms(null);
};

const canManageFile = (file, folder, user, allFolders, currentLawyerId, entityCtx) => {
  if (!user) return false;
  const { isManager, canEdit } = getFolderPermissions(
    folder,
    user,
    allFolders,
    currentLawyerId,
    entityCtx,
  );
  if (isManager || canEdit) return true;
  if (extractId(file.createdById) === extractId(user.id)) return true;
  return false;
};

const getVisibleFolderIds = (allFolders, currentUser, currentLawyerId, entityCtx) => {
  const uid = extractId(currentUser?.id);
  const lwId = extractId(currentLawyerId);

  if (isAdminUser(currentUser)) {
    const all = new Set(allFolders.map((f) => extractId(f.id)));
    return { accessible: all, entitled: new Set(all) };
  }

  if (!uid) return { accessible: new Set(), entitled: new Set() };

  const rootCache = new Map();
  const resolveRoot = (folder) => {
    const key = String(extractId(folder.id));
    if (rootCache.has(key)) return rootCache.get(key);
    const root = resolveFolderTreeRoot(folder, allFolders) || folder;
    rootCache.set(key, root);
    return root;
  };

  const hasRootGrant = (root) => {
    if (!root) return false;
    if (String(extractId(root.createdById)) === String(uid)) return true;
    if (!lwId) return false;
    const managers = getFolderManagerRows(root);
    const members = getFolderMemberRows(root);
    return (
      managers.some((m) => String(getPermissionLawyerId(m)) === String(lwId)) ||
      members.some((m) => String(getPermissionLawyerId(m)) === String(lwId))
    );
  };

  // Reference bridge — returns null for folders that aren't entity-linked
  // (no legalStudyId), so the caller falls through to the root-based check.
  const hasEntityGrant = (folder) => {
    const studyId = extractId(folder.legalStudyId);
    if (!studyId) return null;
    if (!lwId) return false;
    const perms = resolveLegalEntityFolderPerms(studyId, lwId, entityCtx);
    return !!(perms && perms.canView);
  };

  const accessible = new Set();
  allFolders.forEach((f) => {
    const entityGrant = hasEntityGrant(f);
    if (entityGrant !== null) {
      if (entityGrant) accessible.add(extractId(f.id));
      return;
    }
    if (hasRootGrant(resolveRoot(f))) accessible.add(extractId(f.id));
  });

  return { accessible, entitled: accessible };
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

const getPreviewUrl = (record) => {
  const fullUrl = getRecordFileUrl(record);
  if (!fullUrl) return null;
  const ext = getFileExtension(record);
  const isOffice = [
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".odt",
  ].includes(ext);
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
const normalizeParentId = (parentId) =>
  parentId === "root" || !parentId ? null : extractId(parentId);

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

// ============================================================
// §2 DATA FETCHING
// ============================================================
const fetchAllList = async (url, params = {}) => {
  let all = [];
  let page = 1;
  const pageSize = 200;
  const safeParams =
    url === "documents:list" ? withDocumentSafeFields(params) : params;
  while (true) {
    const res = await ctx.api.request({
      url,
      params: { ...safeParams, page, pageSize },
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
  const code =
    record.referenceCode || record.code || record.referenceNo || record.id;
  const title =
    record.title ||
    record.name ||
    record.description ||
    (record.id ? `Legal Reference ${record.id}` : "Legal Reference");
  return code && String(code) !== String(title) ? `${code} - ${title}` : title;
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

const fetchLinkedRelationRows = async (caseId, relationName, extraAppends = []) => {
  const safeCaseId = extractId(caseId);
  if (!safeCaseId) return [];

  const candidates = [
    `projects/${encodeURIComponent(safeCaseId)}/${relationName}:list`,
    `cases/${encodeURIComponent(safeCaseId)}/${relationName}:list`,
  ];

  for (const url of candidates) {
    try {
      const rows = await fetchAllList(url, { appends: ["createdBy", ...extraAppends] });
      console.log(`[OK] ${url} → ${rows.length} rows`);
      return rows.filter((r) => !r.isDeleted);
    } catch (error) {
      console.warn(
        `[FAIL] ${url} → ${error?.response?.status || error?.message}`,
      );
    }
  }
  return [];
};

// Unfiltered fetch of every Legal Member row (the legalMembers table backs
// both legalReferenceId- and legalStudyId-scoped rows) — matches Library.js's
// fetchAllLegalMemberRows. Filtered down per-entity by entityPermissionContext.
const fetchAllLegalMemberRows = async () => {
  for (const url of ["legalMembers:list", "legalMember:list"]) {
    try {
      return await fetchAllList(url, { pageSize: 1000, appends: ["member"] });
    } catch (e) {
      try {
        return await fetchAllList(url, { pageSize: 1000 });
      } catch (e2) {}
    }
  }
  return [];
};

// Scoped legalMembers fetch for PermissionManagerModal's entity adapter —
// unlike fetchAllLegalMemberRows (unfiltered, used once at load time for
// entityPermissionContext), this re-fetches fresh on every modal open,
// matching Library.js's fetchEntityMemberRows.
const fetchEntityMemberRows = async (fkField, recordId) => {
  if (!fkField || !recordId) return [];
  const filter = JSON.stringify({ [fkField]: { $eq: recordId } });
  for (const url of ["legalMembers:list", "legalMember:list"]) {
    try {
      return await fetchAllList(url, { pageSize: 1000, filter, appends: ["member"] });
    } catch (e) {
      try {
        return await fetchAllList(url, { pageSize: 1000, filter });
      } catch (e2) {}
    }
  }
  return [];
};

const destroyEntityMemberRows = async (fkField, recordId) => {
  for (const url of ["legalMembers:destroy", "legalMember:destroy"]) {
    try {
      await ctx.api.request({
        url,
        method: "POST",
        params: { filter: JSON.stringify({ [fkField]: { $eq: recordId } }) },
      });
      return true;
    } catch {}
  }
  return false;
};

const createEntityMemberRow = async (fkField, recordId, memberId, role) => {
  const payload = { [fkField]: recordId, memberId: Number(memberId), role };
  let lastError = null;
  for (const url of ["legalMembers:create", "legalMember:create"]) {
    try {
      return await ctx.api.request({ url, method: "POST", data: payload });
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("Failed to create legal member row");
};

const fetchFoldersForInternalTemplates = async () => {
  const scopeFilter = JSON.stringify({
    moduleScope: {
      $in: [...DASHBOARD_CONFIG.moduleScopes, "legal_reference", "legal_study"],
    },
  });
  const params = {
    sort: ["createdAt"],
    filter: scopeFilter,
    appends: [
      "createdBy",
      "updatedBy",
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
      appends: ["createdBy", "updatedBy"],
    };
    return fetchAllList("folders:list", fallbackParams).catch(() => []);
  }
};

const fetchDocumentsForInternalTemplates = async () => {
  const scopeFilter = JSON.stringify({
    moduleScope: {
      $in: [...DASHBOARD_CONFIG.moduleScopes, "legal_reference", "legal_study"],
    },
  });
  const params = {
    sort: ["fileIndex", "-createdAt"],
    filter: scopeFilter,
    fields: DOCUMENT_SAFE_FIELDS,
    appends: ["fileAttachment", "createdBy", "updatedBy", "cases"],
  };
  try {
    return await fetchAllList("documents:list", params);
  } catch (e) {
    const { appends, ...fallbackParams } = params;
    return fetchAllList("documents:list", {
      ...fallbackParams,
      appends: ["fileAttachment", "createdBy", "updatedBy"],
    }).catch(() => []);
  }
};

const requestCreateWithInternalTemplateRelation = async (url, payload) => {
  const templateId = getInternalTemplateRelationId(payload);
  if (!templateId) {
    return ctx.api.request({ url, method: "POST", data: payload });
  }

  const basePayload = stripInternalTemplateRelationPayload(payload);
  let lastError = null;
  const variants = buildInternalTemplateRelationVariants(templateId);
  for (let index = 0; index < variants.length; index++) {
    try {
      return await ctx.api.request({
        url,
        method: "POST",
        data: { ...basePayload, ...variants[index] },
      });
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
};

const requestDocumentApi = async ({ params, data, ...options }) =>
  ctx.api.request({
    ...options,
    params: withDocumentSafeFields(params),
    data: stripDocumentLegacyPayload(data),
  });

const createDocumentRecord = async (payload) =>
  requestDocumentApi({
    url: "documents:create",
    method: "POST",
    data: payload,
  });

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
  if (!attachment?.id) throw new Error("Upload failed");
  return attachment;
};

const createFolderRecord = async (payload) => {
  try {
    return await ctx.api.request({
      url: "folders:create",
      method: "POST",
      data: payload,
    });
  } catch (e) {
    if (!Object.prototype.hasOwnProperty.call(payload || {}, "documentType"))
      throw e;
    const { documentType, ...fallbackPayload } = payload;
    return ctx.api.request({
      url: "folders:create",
      method: "POST",
      data: fallbackPayload,
    });
  }
};

// ============================================================
// §3 MAIN COMPONENT
// ============================================================
const PreviewModal = ({ doc, onClose }) => {
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

  const rawName =
    attachment?.title ||
    attachment?.filename ||
    doc?.name ||
    doc?.title ||
    "File";
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
  const isOffice = [
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".odt",
  ].includes(fileExt);
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
            onClick={() => window.open(fullUrl, "_blank")}
          >
            Download
          </Button>
        ),
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ].filter(Boolean)}
    >
      {/* Background spinner */}
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
                      Could not load file content
                    </span>
                  }
                />
                <Button
                  icon={DOWNLOAD_ICON}
                  onClick={() => window.open(fullUrl, "_blank")}
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
              Cannot preview this format{" "}
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
              Download to open with a compatible application
            </div>
            <Button
              type="primary"
              icon={DOWNLOAD_ICON}
              style={{ marginTop: 8 }}
              onClick={() => window.open(fullUrl, "_blank")}
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
// Generic Manager (single) + Members (viewer/editor/contributed) editor —
// reused for every "Permissions" entry point in this file: Case root
// folders (folderManagers/folderMembers tables) and Reference/Legal Study
// entities (legalStudy's own manager field + legalMembers table). The
// caller supplies loadPermissions/savePermissions adapters (see
// loadFolderPermissions/saveFolderPermissions and
// loadEntityPermissions/saveEntityPermissions below); this component owns
// only the shared UI + local editing state. Matches Library.js's
// PermissionManagerModal exactly — Manager is its own Select (not mixed
// into the Members role list), and "Add members" accepts multiple people
// in one go instead of one at a time.
const PermissionManagerModal = ({
  open,
  title,
  loadPermissions,
  savePermissions,
  onClose,
  onSuccess,
}) => {
  const [saving, setSaving] = useState(false);
  const [availableLawyers, setAvailableLawyers] = useState([]);
  const [managerId, setManagerId] = useState(null);
  const [shares, setShares] = useState([]);
  const [pendingLawyerIds, setPendingLawyerIds] = useState([]);

  useEffect(() => {
    if (!open) {
      setManagerId(null);
      setShares([]);
      setPendingLawyerIds([]);
      return;
    }
    Promise.all([
      ctx.api
        .request({ url: "lawyers:list", params: { pageSize: 1000 } })
        .catch(() => ({ data: { data: [] } })),
      loadPermissions(),
    ]).then(([lwRes, perms]) => {
      setAvailableLawyers(lwRes?.data?.data || []);
      setManagerId(perms?.managerId || null);
      setShares(perms?.members || []);
      setPendingLawyerIds([]);
    });
    // Intentionally keyed only on `open` — loadPermissions is a fresh
    // closure per render (see permissionModalConfig), but the target it
    // points at only ever changes together with `open` flipping to true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const lawyerOptions = availableLawyers.map((l) => ({
    value: String(extractId(l.id)),
    label: getLawyerDisplayName(l),
  }));

  const buildAccessSummary = () => {
    const parts = [];
    if (managerId) {
      const mgr = availableLawyers.find(
        (l) => String(extractId(l.id)) === String(managerId),
      );
      parts.push(
        `${mgr ? getLawyerDisplayName(mgr) : `Lawyer #${managerId}`} - Manager`,
      );
    }
    shares.forEach((s) => {
      const lw =
        availableLawyers.find(
          (l) => String(extractId(l.id)) === String(s.id),
        ) ||
        s.lawyerData ||
        {};
      const displayName = getLawyerDisplayName(
        lw.id ? lw : s.lawyerData || s,
        "User",
      );
      const roleLabel =
        ENTITY_MEMBER_ROLE_OPTIONS.find((o) => o.value === s.role)?.label ||
        s.role;
      parts.push(`${displayName} - ${roleLabel}`);
    });
    return parts.length ? parts.join("; ") : "No one has been granted access";
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
      if (
        !safeLawyerId ||
        safeLawyerId === String(managerId) ||
        existingIds.has(safeLawyerId)
      )
        return;
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePermissions(managerId, shares);
      message.success("Permissions updated successfully");
      onSuccess({ accessSummary: buildAccessSummary() });
    } catch (e) {
      console.error("[CaseDocument] update permissions failed", e);
      message.error("An error occurred while updating permissions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={<span style={{ fontFamily: FONT }}>{title}</span>}
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
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Manager</div>
        <Select
          allowClear
          showSearch
          style={{ width: "100%" }}
          placeholder="Select manager..."
          options={lawyerOptions}
          value={managerId}
          onChange={(val) => {
            setManagerId(val || null);
            if (val)
              setShares((prev) =>
                prev.filter((s) => String(s.id) !== String(val)),
              );
          }}
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
        />
      </div>
      <div style={{ marginBottom: 16, fontFamily: FONT }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Add members</div>
        <Select
          mode="multiple"
          showSearch
          allowClear
          style={{ width: "100%" }}
          placeholder="Search and select multiple people..."
          options={lawyerOptions.filter(
            (o) =>
              o.value !== managerId &&
              !shares.some((s) => String(s.id) === o.value),
          )}
          value={pendingLawyerIds}
          onChange={handleAddLawyers}
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
        />
      </div>
      <div style={{ fontFamily: FONT }}>
        <div style={{ marginBottom: 12, fontWeight: 600 }}>Members</div>
        {shares.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No members added yet"
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
                <span style={{ fontWeight: 500 }}>{displayName}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Select
                    value={s.role}
                    onChange={(val) => handleChangeRole(s.id, val)}
                    bordered={false}
                    style={{ width: 150, fontFamily: FONT }}
                    options={ENTITY_MEMBER_ROLE_OPTIONS}
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

// Formats any stored date value into the "YYYY-MM-DD" shape a native
// <input type="date"> needs for its `value` — display formatting still
// goes through formatDate().
const toDateInputValue = (value) => (value ? String(value).slice(0, 10) : "");

// Generic click-to-edit cell for the Table view — used by the Description
// column and buildDocMetaColumns() so those 8 fields don't each need their
// own copy of the open/save/cancel state machine that editingTitleId/
// handleSaveFileTitle already owns for the Name column. Each instance owns
// its own edit state (not a shared editingCell state) since every call
// site already has a fully-formed onSave callback bound to its own
// (record, field) pair. Ported from Library.js — see
// nocobase-docs/document-inline-edit-upload-grouping-pattern.md.
const InlineEditCell = ({
  value,
  type = "text",
  canEdit,
  onSave,
  placeholder = "—",
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const displayValue =
    type === "date"
      ? value
        ? formatDate(value)
        : placeholder
      : value || placeholder;

  if (!canEdit) {
    return <Text type="secondary">{displayValue}</Text>;
  }

  if (!editing) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setDraft(type === "date" ? toDateInputValue(value) : value || "");
          setEditing(true);
        }}
        style={{
          cursor: "pointer",
          display: "inline-block",
          minHeight: 20,
          borderBottom: "1px dashed transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderBottomColor = "#D1D5DB";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderBottomColor = "transparent";
        }}
      >
        <Text type="secondary">{displayValue}</Text>
      </div>
    );
  }

  const commit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(type === "date" ? draft || null : draft);
      setEditing(false);
    } catch (e) {
      // onSave already shows message.error — stay in edit mode so the
      // user can fix the value and retry instead of losing it.
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => setEditing(false);

  if (type === "textarea") {
    return (
      <Input.TextArea
        size="small"
        autoFocus
        autoSize={{ minRows: 1, maxRows: 4 }}
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <Input
      size="small"
      type={type === "date" ? "date" : "text"}
      autoFocus
      value={draft}
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onPressEnter={commit}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancel();
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

// Metadata-only modal shown AFTER file(s) are already picked via the native
// OS file dialog (see handleFileInputTrigger) — no Dragger/file re-selection
// here. Matches Library.js's DocumentUploadFieldsModal exactly: the 2-step
// "pick files → fill metadata" flow, not a single modal with an embedded
// Dragger. No Google Drive URL field — Library never had one in the create
// flow (only reads it for legacy records), and the user chose to drop this
// file-less "link" creation path from CaseDocument.js too rather than keep
// a feature Library doesn't have.
const DocumentUploadFieldsModal = ({ open, files = [], onClose, onSubmit }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  // "grouped" only ever offered when files.length > 1 (see the Radio.Group
  // below) — irrelevant, but harmless, for single-file submits since
  // handleConfirmUploadFields only reads it when grouping.
  const [uploadMode, setUploadMode] = useState("separate");

  useEffect(() => {
    if (open) {
      form.resetFields();
      setUploadMode("separate");
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
        uploadMode,
        groupFolderName: values.groupFolderName?.trim() || "",
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
          Document Information {files.length > 1 ? `(${files.length} files)` : ""}
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
      <Form form={form} layout="vertical" style={{ fontFamily: FONT }}>
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
        {files.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <Radio.Group
              value={uploadMode}
              onChange={(e) => setUploadMode(e.target.value)}
              style={{ fontFamily: FONT }}
            >
              <Radio value="separate">Upload as separate files</Radio>
              <Radio value="grouped">Group into a new folder</Radio>
            </Radio.Group>
            {uploadMode === "grouped" && (
              <Form.Item
                name="groupFolderName"
                label="Folder Name"
                style={{ marginTop: 8, marginBottom: 0 }}
                rules={[
                  { required: true, message: "Please enter a folder name" },
                ]}
              >
                <Input
                  allowClear
                  placeholder="Enter the new folder's name..."
                  style={{ fontFamily: FONT }}
                />
              </Form.Item>
            )}
          </div>
        )}
        {uploadMode !== "grouped" && (
          <React.Fragment>
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
          </React.Fragment>
        )}
      </Form>
    </Modal>
  );
};

const InternalTemplates = () => {
  const initialCaseContext = useMemo(() => getInitialCaseContext(), []);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [legalReferences, setLegalReferences] = useState([]);
  const [caseReferences, setCaseReferences] = useState([]);
  const [legalStudies, setLegalStudies] = useState([]);
  // Legal Member rows (legalMembers table) — Reference (legalStudy) Manager/
  // Member roles, bridged into folder/document permission resolution via
  // entityPermissionContext below. See resolveLegalEntityFolderPerms.
  const [legalMemberRows, setLegalMemberRows] = useState([]);
  const [activeCaseReferenceId, setActiveCaseReferenceId] = useState(null);
  const [activeLegalStudyId, setActiveLegalStudyId] = useState(null);
  const [legalReferenceExpanded, setLegalReferenceExpanded] = useState(true);
  const [caseReferenceExpanded, setCaseReferenceExpanded] = useState(true);
  const [legalStudyExpanded, setLegalStudyExpanded] = useState(true);
  const [selectedExt, setSelectedExt] = useState(null);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [activeLegalReferenceId, setActiveLegalReferenceId] = useState(null);
  const [activeCaseId, setActiveCaseId] = useState(
    () => initialCaseContext.caseId,
  );
  const [activeCaseRecord, setActiveCaseRecord] = useState(
    () => initialCaseContext.record,
  );
  const [activeSpace, setActiveSpace] = useState("cases");
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
  const [editTemplateRecord, setEditTemplateRecord] = useState(null);
  const [editTemplateForm] = Form.useForm();
  const [editTemplateLoading, setEditTemplateLoading] = useState(false);
  const [currentLawyerId, setCurrentLawyerId] = useState(null);
  const [currentUserState, setCurrentUserState] = useState(null);
  const currentUserRef = useRef(null);
  const activeLegalReferenceIdRef = useRef(null);
  const [lawyers, setLawyers] = useState([]);
  // { kind: "folder", folder } | { kind: "legal_study", record } | null —
  // drives PermissionManagerModal via permissionModalConfig below. Matches
  // Library.js's permissionTarget (generic across folder + entity kinds).
  const [permissionTarget, setPermissionTarget] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [activityActionFilter, setActivityActionFilter] = useState("all");

  const folderInputRef = useRef(null);
  const [folderForm] = Form.useForm();
  // Native OS file picker (2-step upload flow, matches Library.js) — files
  // are picked here first, then DocumentUploadFieldsModal collects metadata.
  const fileInputRef = useRef(null);
  const directFileTargetRef = useRef(null);
  const [uploadFieldsTarget, setUploadFieldsTarget] = useState(null);
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

  const [spacesExpanded, setSpacesExpanded] = useState(true);
  const [libraryExpanded, setLibraryExpanded] = useState(true);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);

  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [showAllLegalReferences, setShowAllLegalReferences] = useState(false);
  const [showAllPersonalFolders, setShowAllPersonalFolders] = useState(false);

  const activeCompany = useMemo(
    () =>
      companies.find((c) => String(extractId(c)) === String(activeCompanyId)) ||
      null,
    [companies, activeCompanyId],
  );
  const activeCase = useMemo(
    () =>
      activeCaseRecord ||
      projects.find(
        (item) => String(extractId(item)) === String(activeCaseId),
      ) ||
      null,
    [activeCaseRecord, projects, activeCaseId],
  );
  const activeCaseIdValue = useMemo(
    () => extractId(activeCaseId) || extractId(activeCase),
    [activeCaseId, activeCase],
  );
  const activeCaseCustomerId = useMemo(
    () =>
      getCaseCustomerId(activeCase) ||
      getCaseCustomerId(initialCaseContext.record),
    [activeCase, initialCaseContext.record],
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

      const [fetchedCompanies, fetchedFolders, fetchedDocs, fetchedProjects] =
        await Promise.all([
          Promise.resolve([]),
          fetchFoldersForInternalTemplates(),
          fetchDocumentsForInternalTemplates(),
          fetchAllList("projects:list", {
            fields: [
              "id",
              "caseCode",
              "projectName",
              "description",
              "customerId",
            ],
            sort: ["-createdAt"],
          }).catch(() => []),
        ]);

      setCompanies(fetchedCompanies);
      const isAllowedScope = (record) => {
        const scope = normalizeKey(record?.moduleScope);
        return (
          !scope ||
          [
            ...DASHBOARD_CONFIG.moduleScopes,
            "legal_reference",
            "legal_study",
          ].includes(scope)
        );
      };
      setFolders(fetchedFolders.filter(isAllowedScope));
      setDocuments(fetchedDocs.filter(isAllowedScope));
      setProjects(fetchedProjects);
      setActiveCompanyId(null);
      const nextCaseId = activeCaseId || initialCaseContext.caseId;
      const matchedCase =
        (nextCaseId
          ? fetchedProjects.find(
              (item) => String(extractId(item)) === String(nextCaseId),
            )
          : null) ||
        initialCaseContext.record ||
        null;
      if (nextCaseId && !activeCaseId) setActiveCaseId(String(nextCaseId));
      if (matchedCase) setActiveCaseRecord(matchedCase);

      // Fetch relation rows for current case context
      let fetchedLegalRefs = [];
      let fetchedCaseRefs = [];
      let fetchedLegalStds = [];
      if (nextCaseId) {
        try {
          const [lRefs, cRefs, lStds] = await Promise.all([
            fetchLinkedRelationRows(nextCaseId, "legalReference"),
            fetchLinkedRelationRows(nextCaseId, "caseReferences"),
            // manager/members appended: needed to resolve Reference
            // Manager/Member permissions (resolveLegalEntityFolderPerms).
            fetchLinkedRelationRows(nextCaseId, "legalStudy", ["manager", "members"]),
          ]);
          fetchedLegalRefs = lRefs;
          fetchedCaseRefs = cRefs;
          fetchedLegalStds = lStds;
        } catch (err) {
          console.warn("Error fetching relation rows:", err);
        }
      }
      setLegalReferences(fetchedLegalRefs);
      setCaseReferences(fetchedCaseRefs);
      setLegalStudies(fetchedLegalStds);

      // Legal Member rows — Reference Manager/Member role source of truth,
      // consumed by entityPermissionContext below.
      try {
        setLegalMemberRows(await fetchAllLegalMemberRows());
      } catch (err) {
        console.warn("Error fetching legal member rows:", err);
      }

      // Set current user & lawyer after data is ready
      if (resolvedUser) {
        // Store in refs/state for permission checks
        setCurrentLawyerId(resolvedLawyerId);
        // We track the full user object in a ref so memos can use it
        currentUserRef.current = resolvedUser;
        setCurrentUserState(resolvedUser);
      }
    } catch (e) {
      console.error("loadData error", e);
      message.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [activeCaseId, initialCaseContext.caseId, initialCaseContext.record]);

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

      // Collect IDs of the linked relations for the active case
      const legalRefIds = new Set(
        legalReferences.map((ref) => String(extractId(ref))),
      );
      const caseRefIds = new Set(
        caseReferences.map((ref) => String(extractId(ref))),
      );
      const legalStdIds = new Set(
        legalStudies.map((ref) => String(extractId(ref))),
      );

      // Filter folders belonging to one of the 4 linked spaces
      const scopedFolders = folders.filter((f) => {
        if (f.isDeleted) return false;
        // 1. Current Case
        if (activeCaseIdValue && matchesCaseFolder(f, activeCaseIdValue))
          return true;
        // 2. Legal Reference
        if (
          f.storageType === "legal_reference" &&
          f.legalReferenceId &&
          legalRefIds.has(String(f.legalReferenceId))
        )
          return true;
        // 3. Case Reference
        if (
          f.storageType === "cases" &&
          getLinkedCaseId(f) &&
          caseRefIds.has(String(getLinkedCaseId(f)))
        )
          return true;
        // 4. Legal Study
        if (
          f.storageType === "legal_study" &&
          f.legalStudyId &&
          legalStdIds.has(String(f.legalStudyId))
        )
          return true;
        return false;
      });

      const scopedFolderIds = new Set(
        scopedFolders.map((f) => String(extractId(f.id))),
      );

      // Filter documents belonging to one of the 4 linked spaces
      const scopedDocs = documents.filter((d) => {
        if (d.isDeleted) return false;
        // 1. Current Case
        if (
          activeCaseIdValue &&
          matchesCaseDocument(d, activeCaseIdValue, scopedFolderIds)
        )
          return true;
        // 2. Legal Reference
        if (
          d.storageType === "legal_reference" &&
          d.legalReferenceId &&
          legalRefIds.has(String(d.legalReferenceId))
        )
          return true;
        // 3. Case Reference
        if (
          d.storageType === "cases" &&
          getLinkedCaseId(d) &&
          caseRefIds.has(String(getLinkedCaseId(d)))
        )
          return true;
        // 4. Legal Study
        if (
          d.storageType === "legal_study" &&
          d.legalStudyId &&
          legalStdIds.has(String(d.legalStudyId))
        )
          return true;
        return false;
      });

      const scopedDocIds = new Set(
        scopedDocs.map((d) => String(extractId(d.id))),
      );

      const manualTrashLogs = raw.filter((log) =>
        ["trash_deleted", "restored"].includes(log.action),
      );
      const legalStudyActionLogs = raw.filter((log) =>
        LEGAL_STUDY_ACTIVITY_ACTIONS.has(log.action),
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
      const hasNearbyLegalStudyAction = (log) => {
        const logTime = getActivityTime(log);
        const logBatchId = String(log.batchId || "");
        return legalStudyActionLogs.some((legalStudyLog) => {
          if (!isSameActivityRecord(log, legalStudyLog)) return false;
          if (
            log.id &&
            legalStudyLog.id &&
            String(log.id) === String(legalStudyLog.id)
          )
            return false;
          const legalStudyBatchId = String(legalStudyLog.batchId || "");
          if (
            logBatchId &&
            legalStudyBatchId &&
            logBatchId === legalStudyBatchId
          )
            return true;
          const legalStudyTime = getActivityTime(legalStudyLog);
          if (!logTime || !legalStudyTime) return true;
          return Math.abs(legalStudyTime - logTime) <= 2 * 60 * 1000;
        });
      };

      const filtered = raw
        .filter((log) => {
          if (isSystemActivityLog(log)) return false;
          if (
            hasNearbyLegalStudyAction(log) &&
            (log.action === "moved" ||
              (log.action === "updated" &&
                ["folderId", "parentId"].includes(log.fieldName)))
          ) {
            return false;
          }
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
            activeCaseIdValue &&
            String(extractId(log.dataId)) === String(activeCaseIdValue)
          ) {
            return true;
          }
          if (log.collectionName === "Folder") {
            return scopedFolderIds.has(rId);
          } else if (log.collectionName === "Document") {
            return scopedDocIds.has(rId);
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
  }, [
    folders,
    documents,
    activeCaseIdValue,
    legalReferences,
    caseReferences,
    legalStudies,
  ]);

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
              options.fieldName || (isFolder ? "permissions" : "fileAttachment"),
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
        dataId: extractId(activeCaseIdValue),
      }),
    [activeCaseIdValue, createManualActivityLog],
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
        label: "Moved",
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
        label: "Downloaded",
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

    if (action === "linked_legal_study") {
      return {
        key: "linked_legal_study",
        label: `Added to ${REFERENCE_LABEL}`,
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
            <path d="M12 3v12" />
            <polyline points="7 10 12 15 17 10" />
            <path d="M5 21h14" />
          </svg>
        ),
      };
    }

    if (action === "unlinked_legal_study") {
      return {
        key: "unlinked_legal_study",
        label: `Removed from ${REFERENCE_LABEL}`,
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
            <path d="M12 21V9" />
            <polyline points="7 14 12 9 17 14" />
            <path d="M5 3h14" />
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
        label: "Moved to Trash",
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
        label: "Restored",
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
            label: "Moved to Trash",
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
            label: "Restored",
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
          label: "Moved",
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
        label: "Permanently Deleted",
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
      documentType: "document category",
      storageType: "storage space",
      userId: "shared with",
      users: "shared with",
      documentId: "shared document",
      documents: "shared document",
      status: "status",
      isDeleted: "deletion status",
      deletedAt: "deleted date",
      deleted_at: "deleted date",
      updatedAt: "updated time",
      createdAt: "created time",
      documentCode: "document code",
      openingDate: "opening date",
      senderName: "sender",
      recipientName: "recipient",
      language: "language",
      docFormat: "document format",
      signedAt: "signed date",
      effectiveAt: "effective date",
      note: "note",
      deteledAt: "deleted date",
    };

    const ACTION_LABELS = {
      uploaded: "uploaded",
      created: "created",
      updated: "updated",
      moved: "moved",
      deleted: "permanently deleted",
      trash_deleted: "moved to trash",
      restored: "restored",
      previewed: "previewed",
      downloaded: "downloaded",
      shared_file: "shared document",
      unshared_file: "unshared document",
      permission_updated: "updated permissions",
      linked_legal_study: `added to ${REFERENCE_LABEL}`,
      unlinked_legal_study: `removed from ${REFERENCE_LABEL}`,
    };

    if (action === "linked_legal_study") {
      const parts = String(newV || "").split(" - ");
      const targetLabel = parts.length > 1 ? parts[0].trim() : "";
      return targetLabel
        ? `Added the document to ${REFERENCE_LABEL} at "${targetLabel}"`
        : `Added the document to ${REFERENCE_LABEL}`;
    }

    if (action === "unlinked_legal_study") {
      return `Removed the document from ${REFERENCE_LABEL}`;
    }

    if (action === "previewed") {
      return `Previewed the ${entityName}`;
    }

    if (action === "downloaded") {
      return `Downloaded the ${entityName}`;
    }

    if (action === "shared_file") {
      if (!newV) return "Shared the document with a user";
      return String(newV).includes(";")
        ? `Shared the document with users: ${newV}`
        : `Shared the document with user ${newV}`;
    }

    if (action === "unshared_file") {
      if (!newV) return "Unshared the document from a user";
      return String(newV).includes(";")
        ? `Unshared the document from users: ${newV}`
        : `Unshared the document from user ${newV}`;
    }

    if (action === "permission_updated") {
      return newV
        ? `Updated ${entityName} permissions: ${newV}`
        : `Updated ${entityName} permissions`;
    }

    if (action === "uploaded" || action === "created") {
      return isFolder ? "Created a new folder" : "Uploaded a new document";
    }

    if (action === "deleted") {
      return `Permanently deleted the ${entityName}`;
    }

    if (action === "trash_deleted") {
      return `Moved the ${entityName} to Trash`;
    }

    if (action === "restored") {
      return `Restored the ${entityName} from Trash`;
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
        return `Moved the ${entityName} from "${oldFolder}" to "${newFolder}"`;
      }
      return `Moved the ${entityName}`;
    }

    if (action === "updated") {
      if (field === "isDeleted" || DELETE_TIMESTAMP_FIELDS.has(field)) {
        if (isTrashDeleteActivity(log)) {
          return `Moved the ${entityName} to Trash`;
        } else {
          return `Restored the ${entityName} from Trash`;
        }
      }
      if (field === "name" || field === "title") {
        if (oldV && newV) {
          return `Renamed the ${entityName}: "${oldV}" → "${newV}"`;
        }
        return `Renamed the ${entityName} to "${newV}"`;
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
        return `Moved from "${oldFolder}" to "${newFolder}"`;
      }

      const fieldLabel = FIELD_LABELS[field] || field;
      return `Updated ${fieldLabel} of the ${entityName}`;
    }

    const actionLabel = ACTION_LABELS[action] || action;
    return `[${actionLabel}] action on ${entityName}`;
  }, []);

  const filteredActivityLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      if (activityActionFilter !== "all") {
        const info = resolveActivityActionInfo(log);
        if (info.key !== activityActionFilter) {
          return false;
        }
      }

      if (activitySearchQuery.trim()) {
        const q = activitySearchQuery.toLowerCase();
        const userName = (log.changedByName || "System").toLowerCase();
        // isDeleted chỉ phục vụ việc phân loại action (Xóa vào Thùng rác/Khôi
        // phục) — giá trị "true"/"false" của nó không phải tên để tìm kiếm.
        const isBooleanFlagField = log.fieldName === "isDeleted";
        const name = (
          log.resolvedTitle ||
          log.recordTitle ||
          (!isBooleanFlagField && log.newValue) ||
          (!isBooleanFlagField && log.oldValue) ||
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

  const legalStudyById = useMemo(() => {
    const map = new Map();
    legalStudies.forEach((s) => map.set(String(extractId(s)), s));
    return map;
  }, [legalStudies]);

  // Per-entity lawyerId → role lookups built once from the raw Legal
  // Member rows, consumed by resolveLegalEntityFolderPerms to bridge
  // Reference member roles into folder/document permission resolution
  // (getFolderPermissions/getVisibleFolderIds).
  const legalMemberRoleByStudy = useMemo(() => {
    const map = new Map();
    legalMemberRows.forEach((row) => {
      const studyId = extractId(row?.legalStudyId);
      if (!studyId) return;
      const lawyerId = getEntityMemberRowLawyerId(row);
      if (!lawyerId) return;
      const key = String(studyId);
      if (!map.has(key)) map.set(key, new Map());
      map.get(key).set(String(lawyerId), row.role);
    });
    return map;
  }, [legalMemberRows]);

  // Passed as the 5th arg to getFolderPermissions/getVisibleFolderIds so
  // they can resolve Reference folder access from the entity's manager/
  // Legal Member role instead of folderManager/folderMembers (which stay
  // empty for these folders — see resolveLegalEntityFolderPerms).
  const entityPermissionContext = useMemo(
    () => ({ legalStudyById, legalMemberRoleByStudy }),
    [legalStudyById, legalMemberRoleByStudy],
  );

  const caseFolders = useMemo(
    () =>
      folders.filter((folder) => matchesCaseFolder(folder, activeCaseIdValue)),
    [folders, activeCaseIdValue],
  );

  const caseFolderIdSet = useMemo(
    () =>
      new Set(
        caseFolders.map((folder) => String(extractId(folder))).filter(Boolean),
      ),
    [caseFolders],
  );

  const activeCaseRootFolder = useMemo(() => {
    if (!caseFolders.length || !activeCaseIdValue) return null;
    const rootCandidates = caseFolders.filter((folder) => {
      if (folder.isDeleted) return false;
      const parentId = normalizeParentId(folder?.parentId);
      // A folder counts as "root" if it has no parent, OR its parent isn't
      // itself one of this case's own folders (e.g. a dangling/legacy
      // parentId pointing outside this case's fetched folder scope).
      return !parentId || !caseFolderIdSet.has(String(parentId));
    });
    if (!rootCandidates.length) return null;
    return [...rootCandidates].sort(sortByCreatedAt)[0];
  }, [caseFolders, activeCaseIdValue, caseFolderIdSet]);

  const activeCaseRootFolderId = useMemo(
    () => extractId(activeCaseRootFolder),
    [activeCaseRootFolder],
  );

  const folderById = useMemo(() => {
    const map = new Map();
    folders.forEach((folder) => {
      const id = String(extractId(folder) || "");
      if (id) map.set(id, folder);
    });
    return map;
  }, [folders]);

  const findNearestDeletedAncestor = useCallback(
    (folder) => {
      let current = folder;
      const seen = new Set();
      while (current) {
        const parentId = getFolderParentId(current);
        if (!parentId) return null;
        const parentKey = String(parentId);
        if (seen.has(parentKey)) return null;
        seen.add(parentKey);
        const parent = folderById.get(parentKey);
        if (!parent) return null;
        if (parent.isDeleted) return parent;
        current = parent;
      }
      return null;
    },
    [folderById],
  );

  const orphanRepairAttemptedRef = useRef(new Set());
  const orphanRepairRunningRef = useRef(false);

  // Scans ALL folders (not just the active case's) so folders orphaned by a
  // deletion made in Case Reference / Legal Reference / Legal Study spaces
  // self-heal the same way Cases already does — the repair itself is
  // scope-agnostic (it just walks parentId chains via folderById).
  useEffect(() => {
    if (orphanRepairRunningRef.current) return;
    if (folders.length === 0) return;

    const groups = new Map();
    folders.forEach((folder) => {
      if (folder.isDeleted) return;
      const folderId = extractId(folder);
      const folderKey = String(folderId || "");
      if (!folderId || orphanRepairAttemptedRef.current.has(folderKey)) return;
      const ancestor = findNearestDeletedAncestor(folder);
      if (!ancestor) return;
      const ancestorKey = String(extractId(ancestor));
      if (!groups.has(ancestorKey)) {
        groups.set(ancestorKey, { ancestor, folderIds: [] });
      }
      groups.get(ancestorKey).folderIds.push(folderId);
      // Do NOT mark as "attempted" here — only after the repair request is
      // confirmed to have actually succeeded (see below). Marking eagerly
      // meant a failed/dropped request (network blip, permission error)
      // permanently gave up on that folder for the rest of the session,
      // silently leaving it orphaned with no way to retry short of a full
      // page reload.
    });

    if (groups.size === 0) return;

    orphanRepairRunningRef.current = true;
    const run = async () => {
      let anySucceeded = false;
      try {
        for (const { ancestor, folderIds } of groups.values()) {
          const payload = {
            isDeleted: true,
            deletedAt:
              ancestor.deletedAt || ancestor.updatedAt || new Date().toISOString(),
            ...(extractId(ancestor.updatedById)
              ? { updatedById: extractId(ancestor.updatedById) }
              : {}),
          };
          let folderUpdateOk = true;
          let documentUpdateOk = true;
          await ctx.api
            .request({
              url: "folders:update",
              method: "POST",
              params: {
                filter: JSON.stringify({ id: { $in: folderIds.map(Number) } }),
              },
              data: payload,
            })
            .catch(() => {
              folderUpdateOk = false;
            });
          await requestDocumentApi({
            url: "documents:update",
            method: "POST",
            params: {
              filter: JSON.stringify({
                folderId: { $in: folderIds.map(Number) },
              }),
            },
            data: payload,
          }).catch(() => {
            documentUpdateOk = false;
          });
          if (folderUpdateOk && documentUpdateOk) {
            folderIds.forEach((id) =>
              orphanRepairAttemptedRef.current.add(String(id)),
            );
            anySucceeded = true;
          } else {
            console.warn(
              "[CaseDocument] Orphan repair failed for folder group — will retry on next data load",
              { ancestorId: extractId(ancestor), folderIds },
            );
          }
        }
      } finally {
        orphanRepairRunningRef.current = false;
        if (anySucceeded) loadData();
      }
    };
    run();
  }, [folders, findNearestDeletedAncestor, loadData]);

  const caseReferenceFolders = useMemo(
    () =>
      folders.filter((folder) =>
        matchesCaseFolder(folder, activeCaseReferenceId),
      ),
    [folders, activeCaseReferenceId],
  );

  const caseReferenceFolderIdSet = useMemo(
    () =>
      new Set(
        caseReferenceFolders
          .map((folder) => String(extractId(folder)))
          .filter(Boolean),
      ),
    [caseReferenceFolders],
  );

  const caseReferenceDocs = useMemo(
    () =>
      documents.filter((doc) =>
        matchesCaseDocument(
          doc,
          activeCaseReferenceId,
          caseReferenceFolderIdSet,
        ),
      ),
    [documents, activeCaseReferenceId, caseReferenceFolderIdSet],
  );

  const activeCaseReferenceRecord = useMemo(() => {
    if (!activeCaseReferenceId) return null;
    return (
      caseReferences.find(
        (r) => String(extractId(r)) === String(activeCaseReferenceId),
      ) || null
    );
  }, [caseReferences, activeCaseReferenceId]);

  const activeCaseReferenceRootFolder = useMemo(() => {
    if (!caseReferenceFolders.length || !activeCaseReferenceId) return null;
    const rootCandidates = caseReferenceFolders.filter((folder) => {
      if (folder.isDeleted) return false;
      const parentId = normalizeParentId(folder?.parentId);
      // Same caseFolderIdSet-relative boundary as activeCaseRootFolder: root
      // if parentId is empty OR points outside this case reference's own
      // fetched folder scope (dangling/legacy parentId). No name-matching,
      // no "must already have children" requirement — both of those caused
      // the exact same root/trash desync bugs in the Cases space that were
      // fixed earlier (a deleted folder could still match by name; a
      // freshly-created empty root folder wouldn't be recognized at all).
      return !parentId || !caseReferenceFolderIdSet.has(String(parentId));
    });
    if (!rootCandidates.length) return null;
    return [...rootCandidates].sort(sortByCreatedAt)[0];
  }, [caseReferenceFolders, activeCaseReferenceId, caseReferenceFolderIdSet]);

  const activeCaseReferenceRootFolderId = useMemo(
    () => extractId(activeCaseReferenceRootFolder),
    [activeCaseReferenceRootFolder],
  );

  const caseReferenceVisibleFolders = useMemo(() => {
    if (!activeCaseReferenceRootFolderId) return caseReferenceFolders;
    return caseReferenceFolders.filter(
      (folder) =>
        String(extractId(folder)) !== String(activeCaseReferenceRootFolderId),
    );
  }, [caseReferenceFolders, activeCaseReferenceRootFolderId]);

  const caseVisibleFolders = useMemo(() => {
    if (!activeCaseRootFolderId) return caseFolders;
    return caseFolders.filter(
      (folder) => String(extractId(folder)) !== String(activeCaseRootFolderId),
    );
  }, [caseFolders, activeCaseRootFolderId]);

  const caseDocs = useMemo(
    () =>
      documents.filter((doc) =>
        matchesCaseDocument(doc, activeCaseIdValue, caseFolderIdSet),
      ),
    [documents, activeCaseIdValue, caseFolderIdSet],
  );

  const quickScopeFolders = useMemo(
    () => (activeCaseIdValue ? caseVisibleFolders : companyFolders),
    [activeCaseIdValue, caseVisibleFolders, companyFolders],
  );

  const quickScopeDocs = useMemo(
    () => (activeCaseIdValue ? caseDocs : companyDocs),
    [activeCaseIdValue, caseDocs, companyDocs],
  );

  const quickTrashCount = useMemo(
    () =>
      quickScopeFolders.filter((f) => f.isDeleted === true).length +
      quickScopeDocs.filter((d) => d.isDeleted === true).length,
    [quickScopeFolders, quickScopeDocs],
  );

  const visibleDocs = useMemo(() => {
    if (activeSpace === "trash") {
      return quickScopeDocs.filter((doc) => doc.isDeleted === true);
    }
    if (activeSpace === "recent") {
      return quickScopeDocs.filter((doc) => !doc.isDeleted);
    }
    if (activeSpace === "cases") {
      return caseDocs.filter((doc) => !doc.isDeleted);
    }
    if (activeSpace === "legal_reference") {
      return documents.filter((doc) => {
        if (doc.isDeleted) return false;
        return (
          doc.storageType === "legal_reference" &&
          String(doc.legalReferenceId) === String(activeLegalReferenceId)
        );
      });
    }
    if (activeSpace === "case_reference") {
      return caseReferenceDocs.filter((doc) => !doc.isDeleted);
    }
    if (activeSpace === "legal_study") {
      return documents.filter((doc) => {
        if (doc.isDeleted) return false;
        return (
          doc.storageType === "legal_study" &&
          String(doc.legalStudyId) === String(activeLegalStudyId)
        );
      });
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
    if (activeSpace === "personal") {
      return documents.filter((doc) => {
        if (doc.isDeleted) return false;
        const isPersonal = doc.storageType === "personal";
        const isCreatedByMe =
          extractId(doc.createdById) === currentLawyerId ||
          extractId(doc.uploadedById) === currentLawyerId;
        return isPersonal && isCreatedByMe;
      });
    }
    return activeDocs;
  }, [
    companyDocs,
    documents,
    activeSpace,
    activeLegalReferenceId,
    currentLawyerId,
    caseDocs,
    quickScopeDocs,
    activeCaseReferenceId,
    caseReferenceDocs,
    activeLegalStudyId,
  ]);

  const visibleFolders = useMemo(() => {
    if (activeSpace === "trash") {
      return quickScopeFolders.filter((f) => f.isDeleted === true);
    }
    if (activeSpace === "recent") {
      return [];
    }
    if (activeSpace === "cases") {
      // Root-inclusive: the case's own root folder is now a real tree node
      // (shown alone at the "root" sentinel, its children only surface once
      // navigated into) rather than being pre-flattened away — see tableData.
      return caseFolders.filter((f) => !f.isDeleted);
    }
    if (activeSpace === "legal_reference") {
      return folders.filter((f) => {
        if (f.isDeleted) return false;
        return (
          f.storageType === "legal_reference" &&
          String(f.legalReferenceId) === String(activeLegalReferenceId)
        );
      });
    }
    if (activeSpace === "case_reference") {
      return caseReferenceVisibleFolders.filter((f) => !f.isDeleted);
    }
    if (activeSpace === "legal_study") {
      return folders.filter((f) => {
        if (f.isDeleted) return false;
        return (
          f.storageType === "legal_study" &&
          String(f.legalStudyId) === String(activeLegalStudyId)
        );
      });
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
    if (activeSpace === "personal") {
      return folders.filter(
        (f) => f.storageType === "personal" && !f.isDeleted,
      );
    }
    return activeFolders;
  }, [
    companyFolders,
    folders,
    activeSpace,
    activeLegalReferenceId,
    caseFolders,
    quickScopeFolders,
    activeCaseReferenceId,
    caseReferenceVisibleFolders,
    activeLegalStudyId,
  ]);

  // Same branches as visibleFolders, but using the root-INCLUSIVE folder
  // lists (caseFolders / caseReferenceFolders) for the "cases"/"case_reference"
  // spaces instead of their root-excluded *VisibleFolders siblings.
  // getFolderPermissions/getVisibleFolderIds walk up to the tree root to
  // resolve permissions (root-only model) — handing them a list that's
  // missing the root folder record makes that walk stop one level too low.
  const permissionAllFolders = useMemo(() => {
    if (activeSpace === "trash") {
      return quickScopeFolders.filter((f) => f.isDeleted === true);
    }
    if (activeSpace === "recent") {
      return [];
    }
    if (activeSpace === "cases") {
      return caseFolders.filter((f) => !f.isDeleted);
    }
    if (activeSpace === "legal_reference") {
      return folders.filter((f) => {
        if (f.isDeleted) return false;
        return (
          f.storageType === "legal_reference" &&
          String(f.legalReferenceId) === String(activeLegalReferenceId)
        );
      });
    }
    if (activeSpace === "case_reference") {
      return caseReferenceFolders.filter((f) => !f.isDeleted);
    }
    if (activeSpace === "legal_study") {
      return folders.filter((f) => {
        if (f.isDeleted) return false;
        return (
          f.storageType === "legal_study" &&
          String(f.legalStudyId) === String(activeLegalStudyId)
        );
      });
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
    if (activeSpace === "personal") {
      return folders.filter(
        (f) => f.storageType === "personal" && !f.isDeleted,
      );
    }
    return activeFolders;
  }, [
    companyFolders,
    folders,
    activeSpace,
    activeLegalReferenceId,
    caseFolders,
    quickScopeFolders,
    activeCaseReferenceId,
    caseReferenceFolders,
    activeLegalStudyId,
  ]);

  // Permission-filtered: hide folders the current user has no access to
  const permissionFilteredFolders = useMemo(() => {
    const currentUser = currentUserState;
    if (!currentUser) return visibleFolders; // not yet loaded → show all (will re-filter after loadData)
    if (isAdminUser(currentUser)) return visibleFolders;
    const { accessible } = getVisibleFolderIds(
      permissionAllFolders,
      currentUser,
      currentLawyerId,
      entityPermissionContext,
    );
    return visibleFolders.filter((f) => accessible.has(extractId(f.id)));
  }, [visibleFolders, permissionAllFolders, currentUserState, currentLawyerId, entityPermissionContext]);

  // Permission-filtered docs: only show docs whose folder is accessible (or root-level docs)
  const permissionFilteredDocs = useMemo(() => {
    const currentUser = currentUserState;
    if (!currentUser) return visibleDocs;
    if (isAdminUser(currentUser)) return visibleDocs;
    const uid = String(extractId(currentUser?.id) || "");
    const accessibleFolderIds = new Set(
      permissionFilteredFolders.map((f) => String(extractId(f.id))),
    );
    return visibleDocs.filter((doc) => {
      // Creator/uploader can always see their own document, even when the
      // containing folder (e.g. a shared Case root folder they don't own)
      // isn't in their accessible set — otherwise a user's own upload
      // silently disappears from their own view right after uploading.
      if (
        uid &&
        (String(extractId(doc.createdById) || "") === uid ||
          String(extractId(doc.uploadedById) || "") === uid)
      )
        return true;
      const fId = String(extractId(doc.folderId) || "");
      // Root-level docs (no folder) are visible to all company members
      if (!fId) return true;
      return accessibleFolderIds.has(fId);
    });
  }, [visibleDocs, permissionFilteredFolders, currentUserState]);

  // Current folder permissions for the selected folder
  const currentFolderPerms = useMemo(() => {
    const currentUser = currentUserState;
    if (!currentUser) return roleToPerms("admin");
    if (selectedFolderId === "root") {
      if (activeSpace === "cases") {
        return activeCaseIdValue ? roleToPerms("owner") : roleToPerms("viewer");
      }
      if (activeSpace === "personal") return roleToPerms("owner");
      // Reference (legal_study): resolve straight from the entity's own
      // Manager/Legal Member role instead of falling through to the
      // hardcoded viewer below — the sidebar sets selectedFolderId to the
      // "root" sentinel on click (not the entity's real root folder id),
      // so without this branch a genuine Manager reads as View Only until
      // they navigate into a subfolder.
      if (activeSpace === "legal_study" && activeLegalStudyId) {
        return (
          resolveLegalEntityFolderPerms(
            activeLegalStudyId,
            extractId(currentLawyerId),
            entityPermissionContext,
          ) || roleToPerms(null)
        );
      }
      return isAdminUser(currentUser) ? roleToPerms("admin") : roleToPerms("viewer");
    }
    const folder = visibleFolders.find(
      (f) => String(extractId(f.id)) === String(selectedFolderId),
    );
    return getFolderPermissions(folder || null, currentUser, permissionAllFolders, currentLawyerId, entityPermissionContext);
  }, [
    selectedFolderId,
    visibleFolders,
    permissionAllFolders,
    currentUserState,
    currentLawyerId,
    activeSpace,
    activeCaseIdValue,
    activeLegalStudyId,
    entityPermissionContext,
  ]);

  // "Manager: ... / Member: ..." summary shown below the breadcrumb,
  // matching Library.js's currentRootFolderPermissionSummary — always
  // resolved from the TREE ROOT's own data (never the currently-browsed
  // subfolder's), since permission now lives exclusively at the root.
  const currentRootFolderPermissionSummary = useMemo(() => {
    if (["personal", "trash", "recent"].includes(activeSpace)) return null;

    // Current Case: selectedFolderId sits at the "root" sentinel by
    // default, or at the case's own root folder's real id (now a normal
    // tree node — see visibleFolders' cases branch) once navigated into —
    // resolve straight from the already-known activeCaseRootFolder either
    // way, since it's always the tree root for this space.
    if (activeSpace === "cases") {
      if (!activeCaseRootFolder) return null;
      const managerNames = getFolderManagerRows(activeCaseRootFolder)
        .map((row) => getLawyerDisplayName(row))
        .filter(Boolean);
      const memberNames = getFolderMemberRows(activeCaseRootFolder)
        .map((row) => getLawyerDisplayName(row))
        .filter(Boolean);
      return { managerNames, memberNames };
    }

    // Reference (legal_study): governed by the entity's own manager/
    // members fields (see resolveLegalEntityFolderPerms), never by
    // folderManager/folderMembers (which stay empty for these folders) —
    // its "root" is also a virtual sentinel until a subfolder exists, so
    // resolve straight from the entity record.
    if (activeSpace === "legal_study" && activeLegalStudyId) {
      const study = legalStudyById.get(String(activeLegalStudyId));
      if (!study) return null;
      const managerId = getLegalEntityManagerId(study);
      const managerNames = managerId
        ? [getLawyerDisplayName(getRelationLawyerRecord(study.manager))].filter(Boolean)
        : [];
      // The Legal Member table backs BOTH the Manager row and every
      // regular Member row, so the manager's own row resurfaces inside
      // study.members too — exclude it to avoid double-listing.
      const memberNames = asArray(study.members)
        .filter((m) => String(getPermissionLawyerId(m)) !== String(managerId))
        .map((m) => getLawyerDisplayName(getRelationLawyerRecord(m)))
        .filter(Boolean);
      return { managerNames, memberNames };
    }

    if (selectedFolderId === "root") return null;
    const folder =
      visibleFolders.find((f) => String(extractId(f)) === String(selectedFolderId)) ||
      permissionAllFolders.find((f) => String(extractId(f)) === String(selectedFolderId));
    if (!folder) return null;
    const root = resolveFolderTreeRoot(folder, permissionAllFolders) || folder;

    const managerNames = getFolderManagerRows(root)
      .map((row) => getLawyerDisplayName(row))
      .filter(Boolean);
    const memberNames = getFolderMemberRows(root)
      .map((row) => getLawyerDisplayName(row))
      .filter(Boolean);
    return { managerNames, memberNames };
  }, [
    activeSpace,
    activeCaseRootFolder,
    activeLegalStudyId,
    legalStudyById,
    selectedFolderId,
    visibleFolders,
    permissionAllFolders,
  ]);

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
    let rootName = "Home";
    if (activeSpace === "cases") {
      rootName = "Cases";
    } else if (activeSpace === "personal") {
      rootName = "My Workspace";
    } else if (activeSpace === "company_shared") {
      rootName = activeCompany
        ? getCompanyName(activeCompany)
        : "Shared Folder";
    } else if (activeSpace === "legal_reference") {
      const items = activeLegalReference
        ? [
            { id: "legal_reference_root", name: "Reference" },
            {
              id: "root",
              name: getLegalReferenceDisplayName(activeLegalReference),
            },
          ]
        : [{ id: "root", name: "Reference" }];
      if (selectedFolderId === "root") return items;
      const path = [];
      let current = folderMap.get(String(selectedFolderId));
      while (current) {
        path.unshift({
          id: String(extractId(current)),
          name: current.name || "Folder",
        });
        const parentId = String(getFolderParentId(current));
        // Fall back to the unfiltered folderById map when an intermediate
        // ancestor was excluded from folderMap (ACL-hidden or trashed) —
        // otherwise the breadcrumb chain silently truncates mid-path instead
        // of continuing up to root.
        current = folderMap.get(parentId) || folderById.get(parentId);
      }
      return items.concat(path);
    } else if (activeSpace === "recent") {
      rootName = "Activity History";
    } else if (activeSpace === "trash") {
      rootName = "Trash";
    }

    const items = [{ id: "root", name: rootName }];
    if (selectedFolderId === "root") return items;
    // The case's own root folder is a real tree node now (see
    // visibleFolders' cases branch) — it appears in the path like any other
    // folder instead of being hidden, matching the tree it actually belongs to.
    const path = [];
    let current =
      folderMap.get(String(selectedFolderId)) ||
      folderById.get(String(selectedFolderId));
    // Case-bound folders (Cases / Linked Cases spaces) never climb past
    // the case boundary — the Case's own root folder's real DB parentId
    // points at the Customer folder above it, which must never surface as
    // a clickable crumb here. Without this gate, clicking that crumb lands
    // selectedFolderId on the Customer folder, and the Case root folder
    // then shows as an ordinary sibling card inside it — silently
    // breaking the root-only permission model (resolveFolderTreeRoot
    // applies this exact same gate for permission resolution; the
    // breadcrumb's own separate parent-walk needs it too). ownCaseId is
    // read once from the folder we're starting the walk at.
    const ownCaseId = getLinkedCaseId(current);
    while (current) {
      const currentId = String(extractId(current));
      path.unshift({ id: currentId, name: current.name || "Folder" });
      const parentId = String(getFolderParentId(current));
      // Fall back to the unfiltered folderById map when an intermediate
      // ancestor was excluded from folderMap (ACL-hidden or trashed) —
      // otherwise the breadcrumb chain silently truncates mid-path instead
      // of continuing up to root.
      const parent = folderMap.get(parentId) || folderById.get(parentId);
      if (ownCaseId && parent && !getLinkedCaseId(parent)) break;
      current = parent;
    }
    return items.concat(path);
  }, [
    folderMap,
    folderById,
    selectedFolderId,
    activeSpace,
    activeCompany,
    activeLegalReference,
  ]);

  const handleBreadcrumbClick = useCallback((item) => {
    if (item.id === "legal_reference_root") {
      setActiveSpace("legal_reference");
      setActiveLegalReferenceId(null);
      setSelectedFolderId("root");
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
    // "cases" deliberately has NO logicalRootFolderId — the case's root
    // folder is a real tree node now (see visibleFolders/permissionAllFolders,
    // both root-inclusive), so it must show alone at the "root" sentinel and
    // its children only when navigated into (selectedFolderId === its real
    // id) via the generic parentId branches below, instead of being
    // pre-flattened into the sentinel view like case_reference still is.
    const logicalRootFolderId =
      activeSpace === "case_reference" && activeCaseReferenceRootFolderId
        ? String(activeCaseReferenceRootFolderId)
        : null;
    const currentFolderKey =
      selectedFolderId === "root" ||
      (logicalRootFolderId && String(selectedFolderId) === logicalRootFolderId)
        ? "root"
        : String(selectedFolderId);
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

    if (activeSpace === "case_reference" && !activeCaseReferenceId) {
      let rows = caseReferences;
      if (isSearching) {
        rows = rows.filter((r) =>
          `${r.caseCode || r.projectCode || ""} ${r.projectName || r.title || ""} ${r.description || ""}`
            .toLowerCase()
            .includes(q),
        );
      }
      return rows.map((r) => ({
        ...r,
        _type: "case_reference_record",
        _key: `case_ref_${extractId(r)}`,
      }));
    }

    if (activeSpace === "legal_study" && !activeLegalStudyId) {
      let rows = legalStudies;
      if (isSearching) {
        rows = rows.filter((r) =>
          `${r.title || r.name || ""} ${r.description || ""}`
            .toLowerCase()
            .includes(q),
        );
      }
      return rows.map((r) => ({
        ...r,
        _type: "legal_study_record",
        _key: `study_ref_${extractId(r)}`,
      }));
    }

    let folderRows = [];
    let docRows = [];

    if (isSearching) {
      const allowedFolderIds =
        currentFolderKey === "root"
          ? logicalRootFolderId
            ? new Set(getDescendantIds(logicalRootFolderId))
            : null
          : new Set(getDescendantIds(selectedFolderId));
      folderRows = permissionFilteredFolders.filter((folder) => {
        const folderId = String(extractId(folder));
        if (logicalRootFolderId && folderId === logicalRootFolderId)
          return false;
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
        if (currentFolderKey === "root") {
          if (logicalRootFolderId)
            return String(parentId || "") === logicalRootFolderId;
          return !parentId || !folderMap.has(String(parentId));
        }
        return String(parentId || "") === currentFolderKey;
      });
      docRows = permissionFilteredDocs.filter((doc) => {
        const folderId = extractId(doc.folderId);
        if (currentFolderKey === "root") {
          if (logicalRootFolderId)
            return String(folderId || "") === logicalRootFolderId;
          return !folderId || !folderMap.has(String(folderId));
        }
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
    activeSpace,
    activeCaseReferenceRootFolderId,
    permissionFilteredFolders,
    permissionFilteredDocs,
    folderMap,
    getDescendantIds,
    sortDocs,
    getRecordDocumentType,
    selectedExt,
    filteredLegalReferences,
    activeLegalReferenceId,
    caseReferences,
    activeCaseReferenceId,
    legalStudies,
    activeLegalStudyId,
  ]);

  const companySharedCounts = useMemo(() => {
    const fCount = folders.filter((f) => {
      return (
        !f.isDeleted &&
        matchesInternalCompany(f, activeCompanyId) &&
        (f.storageType === "company_shared" ||
          (!f.storageType &&
            !getRecordDocumentType(f) &&
            !getInternalTemplateRelationId(f) &&
            !getRecordLegalReferenceId(f)))
      );
    }).length;

    const dCount = documents.filter((doc) => {
      return (
        !doc.isDeleted &&
        matchesInternalCompany(doc, activeCompanyId) &&
        (doc.storageType === "company_shared" ||
          (!doc.storageType &&
            !getRecordDocumentType(doc) &&
            !getInternalTemplateRelationId(doc) &&
            !getRecordLegalReferenceId(doc)))
      );
    }).length;

    return { folders: fCount, files: dCount };
  }, [folders, documents, activeCompanyId]);

  const personalCounts = useMemo(() => {
    const fCount = folders.filter((f) => {
      if (f.isDeleted) return false;
      const isPersonal = f.storageType === "personal";
      if (!isPersonal) return false;
      const currentUser = currentUserState;
      if (!currentUser) return true;
      if (isAdminUser(currentUser)) return true;
      const { accessible } = getVisibleFolderIds(
        folders,
        currentUser,
        currentLawyerId,
        entityPermissionContext,
      );
      return accessible.has(extractId(f.id));
    }).length;

    const dCount = documents.filter((doc) => {
      if (doc.isDeleted) return false;
      const isPersonal = doc.storageType === "personal";
      const isCreatedByMe =
        extractId(doc.createdById) === currentLawyerId ||
        extractId(doc.uploadedById) === currentLawyerId;
      return isPersonal && isCreatedByMe;
    }).length;

    return { folders: fCount, files: dCount };
  }, [folders, documents, currentUserState, currentLawyerId, entityPermissionContext]);

  const personalRootFolders = useMemo(() => {
    return folders.filter((f) => {
      if (f.isDeleted) return false;
      if (f.storageType !== "personal") return false;
      const pId = getFolderParentId(f);
      if (pId && pId !== "root") return false;
      const currentUser = currentUserState;
      if (!currentUser) return true;
      if (isAdminUser(currentUser)) return true;
      const { accessible } = getVisibleFolderIds(
        folders,
        currentUser,
        currentLawyerId,
        entityPermissionContext,
      );
      return accessible.has(extractId(f.id));
    });
  }, [folders, currentUserState, currentLawyerId, entityPermissionContext]);

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
        entityPermissionContext,
      );
      return accessible.has(extractId(f.id));
    });
  }, [folders, activeCompanyId, currentUserState, currentLawyerId, entityPermissionContext]);

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
        entityPermissionContext,
      );
      return accessible.has(extractId(f.id));
    });
  }, [folders, activeLegalReferenceId, currentUserState, currentLawyerId, entityPermissionContext]);

  // Sidebar for Linked Cases / Reference no longer drills into subfolders —
  // each entry shows its own root folder directly instead of the entity's
  // name (matching the Current Case entry). Resolved per-entity (not just
  // the active one) since the sidebar lists every linked case/reference.
  const linkedCaseRootFolderById = useMemo(() => {
    const map = new Map();
    const currentUser = currentUserState;
    const isAdmin = isAdminUser(currentUser);
    const accessible =
      currentUser && !isAdmin
        ? getVisibleFolderIds(folders, currentUser, currentLawyerId, entityPermissionContext).accessible
        : null;
    caseReferences.forEach((ref) => {
      const refId = String(extractId(ref));
      const scoped = folders.filter(
        (f) => !f.isDeleted && String(getLinkedCaseId(f)) === refId,
      );
      if (!scoped.length) return;
      const idSet = new Set(scoped.map((f) => String(extractId(f))));
      const rootCandidates = scoped.filter((f) => {
        const parentId = normalizeParentId(f.parentId);
        return !parentId || !idSet.has(String(parentId));
      });
      if (!rootCandidates.length) return;
      const root = [...rootCandidates].sort(sortByCreatedAt)[0];
      if (accessible && !accessible.has(extractId(root.id))) return;
      map.set(refId, root);
    });
    return map;
  }, [folders, caseReferences, currentUserState, currentLawyerId, entityPermissionContext]);

  const legalStudyRootFolderById = useMemo(() => {
    const map = new Map();
    const currentUser = currentUserState;
    const isAdmin = isAdminUser(currentUser);
    const accessible =
      currentUser && !isAdmin
        ? getVisibleFolderIds(folders, currentUser, currentLawyerId, entityPermissionContext).accessible
        : null;
    legalStudies.forEach((ref) => {
      const refId = String(extractId(ref));
      const scoped = folders.filter(
        (f) =>
          !f.isDeleted &&
          f.storageType === "legal_study" &&
          String(f.legalStudyId) === refId,
      );
      if (!scoped.length) return;
      const idSet = new Set(scoped.map((f) => String(extractId(f))));
      const rootCandidates = scoped.filter((f) => {
        const parentId = normalizeParentId(f.parentId);
        return !parentId || !idSet.has(String(parentId));
      });
      if (!rootCandidates.length) return;
      const root = [...rootCandidates].sort(sortByCreatedAt)[0];
      if (accessible && !accessible.has(extractId(root.id))) return;
      map.set(refId, root);
    });
    return map;
  }, [folders, legalStudies, currentUserState, currentLawyerId, entityPermissionContext]);

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
    if (activeSpace === "cases") {
      dynamicRootTitle = "Cases";
    } else if (activeSpace === "personal") {
      dynamicRootTitle = "My Workspace";
    } else if (activeSpace === "company_shared") {
      dynamicRootTitle = activeCompany
        ? getCompanyName(activeCompany)
        : "Shared Folder";
    } else if (activeSpace === "legal_reference") {
      dynamicRootTitle = activeLegalReference
        ? getLegalReferenceDisplayName(activeLegalReference)
        : DASHBOARD_CONFIG.label?.sidebar || "Reference";
    }

    const buildRootId =
      activeSpace === "cases" && activeCaseRootFolderId
        ? String(activeCaseRootFolderId)
        : "root";
    return [
      {
        title: dynamicRootTitle,
        value: "root",
        key: "root",
        children: build(buildRootId),
      },
    ];
  }, [
    permissionFilteredFolders,
    folderMap,
    activeSpace,
    activeCompany,
    activeLegalReference,
    activeCaseRootFolderId,
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

  const getEffectiveFolderId = useCallback(
    (folderId) => {
      const normalized = normalizeParentId(folderId);
      if (activeSpace === "cases" && !normalized) {
        return activeCaseRootFolderId || null;
      }
      if (activeSpace === "case_reference" && !normalized) {
        return activeCaseReferenceRootFolderId || null;
      }
      return normalized;
    },
    [activeSpace, activeCaseRootFolderId, activeCaseReferenceRootFolderId],
  );

  const applyCaseFolderPayload = useCallback(
    (payload) => {
      const caseId = extractId(activeCaseIdValue);
      if (!caseId) return payload;
      payload.type = "cases";
      payload.storageType = "cases";
      payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
      payload.projectId = caseId;
      if (activeCaseCustomerId && !payload.customerId) {
        payload.customerId = extractId(activeCaseCustomerId);
      }
      return payload;
    },
    [activeCaseIdValue, activeCaseCustomerId],
  );

  const applyCaseDocumentPayload = useCallback(
    (payload) => {
      const caseId = extractId(activeCaseIdValue);
      if (!caseId) return payload;
      payload.storageType = "cases";
      payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
      payload.caseId = caseId;
      if (activeCaseCustomerId && !payload.customerId) {
        payload.customerId = extractId(activeCaseCustomerId);
      }
      return payload;
    },
    [activeCaseIdValue, activeCaseCustomerId],
  );

  const applySpaceFolderPayload = useCallback(
    (payload) => {
      if (activeSpace === "cases") {
        return applyCaseFolderPayload(payload);
      }
      if (activeSpace === "case_reference") {
        const caseId = extractId(activeCaseReferenceId);
        payload.type = "cases";
        payload.storageType = "cases";
        payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
        payload.projectId = caseId;
        const custId = extractId(activeCaseReferenceRecord?.customerId);
        if (custId) {
          payload.customerId = custId;
        }
        return payload;
      }
      if (activeSpace === "legal_study") {
        payload.storageType = "legal_study";
        payload.legalStudyId = extractId(activeLegalStudyId);
        payload.moduleScope = "legal_study";
        if (activeCaseIdValue) {
          payload.projectId = extractId(activeCaseIdValue);
        }
        return payload;
      }
      if (activeSpace === "company_shared") {
        payload.internalCompanyId = extractId(activeCompanyId);
        payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
        return payload;
      }
      if (activeSpace === "personal") {
        if (activeCompanyId) {
          payload.internalCompanyId = extractId(activeCompanyId);
        }
        payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
        return payload;
      }
      if (activeSpace === "legal_reference") {
        payload.internalCompanyId = extractId(activeCompanyId);
        payload.legalReferenceId = extractId(activeLegalReferenceId);
        payload.moduleScope = "legal_reference";
        if (activeCaseIdValue) {
          payload.projectId = extractId(activeCaseIdValue);
        }
        return payload;
      }
      return payload;
    },
    [
      activeSpace,
      activeCaseIdValue,
      activeCaseReferenceId,
      activeCaseReferenceRecord,
      activeLegalStudyId,
      activeCompanyId,
      activeLegalReferenceId,
      applyCaseFolderPayload,
    ],
  );

  const applySpaceDocumentPayload = useCallback(
    (payload) => {
      if (activeSpace === "cases") {
        return applyCaseDocumentPayload(payload);
      }
      if (activeSpace === "case_reference") {
        const caseId = extractId(activeCaseReferenceId);
        payload.storageType = "cases";
        payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
        payload.caseId = caseId;
        const custId = extractId(activeCaseReferenceRecord?.customerId);
        if (custId) {
          payload.customerId = custId;
        }
        return payload;
      }
      if (activeSpace === "legal_study") {
        payload.storageType = "legal_study";
        payload.legalStudyId = extractId(activeLegalStudyId);
        payload.moduleScope = "legal_study";
        if (activeCaseIdValue) {
          payload.caseId = extractId(activeCaseIdValue);
        }
        return payload;
      }
      if (activeSpace === "company_shared") {
        payload.internalCompanyId = extractId(activeCompanyId);
        payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
        return payload;
      }
      if (activeSpace === "personal") {
        if (activeCompanyId) {
          payload.internalCompanyId = extractId(activeCompanyId);
        }
        payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
        return payload;
      }
      if (activeSpace === "legal_reference") {
        payload.internalCompanyId = extractId(activeCompanyId);
        payload.legalReferenceId = extractId(activeLegalReferenceId);
        payload.moduleScope = "legal_reference";
        if (activeCaseIdValue) {
          payload.caseId = extractId(activeCaseIdValue);
        }
        return payload;
      }
      return payload;
    },
    [
      activeSpace,
      activeCaseIdValue,
      activeCaseReferenceId,
      activeCaseReferenceRecord,
      activeLegalStudyId,
      activeCompanyId,
      activeLegalReferenceId,
      applyCaseDocumentPayload,
    ],
  );

  const requireCompany = () => {
    if (activeSpace === "cases") {
      if (activeCaseIdValue) return true;
      message.warning("Current case not found");
      return false;
    }
    if (activeSpace === "case_reference") {
      if (activeCaseReferenceId) return true;
      message.warning("Please select a reference case first");
      return false;
    }
    if (activeSpace === "legal_study") {
      if (activeLegalStudyId) return true;
      message.warning("Please select a Reference first");
      return false;
    }
    if (activeSpace === "personal") return true;
    if (activeCompanyId) return true;
    message.warning("Please select an internal company first");
    return false;
  };

  const requireCaseRootFolderForUpload = (targetFolderId) => {
    if (activeSpace !== "cases") return true;
    if (getEffectiveFolderId(targetFolderId)) return true;
    message.warning("Please create the Case folder before uploading documents");
    return false;
  };

  const getNextFileIndex = useCallback(
    async (folderId) => {
      const parentId = normalizeParentId(folderId);
      try {
        const filter = {
          moduleScope: {
            $in: [
              ...DASHBOARD_CONFIG.moduleScopes,
              "legal_reference",
              "legal_study",
            ],
          },
          ...(parentId ? { folderId: { $eq: parentId } } : {}),
        };
        if (activeSpace === "cases" && activeCaseIdValue && !parentId) {
          filter.caseId = { $eq: extractId(activeCaseIdValue) };
        } else if (
          activeSpace === "case_reference" &&
          activeCaseReferenceId &&
          !parentId
        ) {
          filter.caseId = { $eq: extractId(activeCaseReferenceId) };
        } else if (
          activeSpace === "legal_reference" &&
          activeLegalReferenceId &&
          !parentId
        ) {
          filter.legalReferenceId = { $eq: extractId(activeLegalReferenceId) };
        } else if (
          activeSpace === "legal_study" &&
          activeLegalStudyId &&
          !parentId
        ) {
          filter.legalStudyId = { $eq: extractId(activeLegalStudyId) };
        } else if (activeSpace === "personal") {
          filter.storageType = { $eq: "personal" };
        } else if (activeCompanyId) {
          filter.internalCompanyId = { $eq: extractId(activeCompanyId) };
        }
        const res = await ctx.api.request({
          url: "documents:list",
          params: withDocumentSafeFields({
            pageSize: 2000,
            filter: JSON.stringify(filter),
            sort: ["-fileIndex", "-createdAt"],
          }),
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
    [
      activeCompanyId,
      activeSpace,
      activeCaseIdValue,
      activeCaseReferenceId,
      activeLegalReferenceId,
      activeLegalStudyId,
    ],
  );

  const reindexFolderFiles = useCallback(
    async (folderId) => {
      const parentId = normalizeParentId(folderId);
      const sourceDocs = activeSpace === "cases" ? caseDocs : documents;
      const items = sourceDocs
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
              : requestDocumentApi({
                  url: `documents:update?filterByTk=${extractId(doc)}`,
                  method: "POST",
                  data: { fileIndex: index + 1 },
                }),
          )
          .filter(Boolean),
      );
    },
    [documents, activeCompanyId, activeSpace, caseDocs],
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
        internalCompanyId: extractId(activeCompanyId),
        cases: mergedCaseIds,
        ...(values.sourceCaseId
          ? { sourceCaseId: Number(values.sourceCaseId) }
          : {}),
        ...(userId ? { createdById: userId, updatedById: userId } : {}),
      };
      await createLegalReferenceRecord(payload);
      message.success("Reference case created successfully!");
      setIsCreateTemplateOpen(false);
      createTemplateForm.resetFields();
      loadData();
    } catch (e) {
      console.error(e);
      message.error("Failed to create reference case");
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
      message.success("Reference case updated successfully!");
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
        message.warning("Please select a Reference Case to link");
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
      message.success("Case link updated successfully");
      setIsLinkCaseOpen(false);
      setLinkCaseRecord(null);
      linkCaseForm.resetFields();
      loadData();
    } catch (e) {
      console.error("Case link error:", e);
      message.error("Failed to link case");
    } finally {
      setLinkCaseLoading(false);
    }
  };

  const handleCreateFolder = async (values) => {
    if (!currentFolderPerms.canCreate) {
      message.warning("You do not have permission to create a folder at this location");
      return;
    }
    if (activeSpace !== "personal" && !requireCompany()) return;
    setFolderLoading(true);
    try {
      const parentId = getEffectiveFolderId(selectedFolderId);
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

      applySpaceFolderPayload(payload);

      await createFolderRecord(payload);
      message.success("Folder created successfully!");
      setIsFolderOpen(false);
      folderForm.resetFields();
      loadData();
    } catch (e) {
      message.error("Failed to create folder");
    } finally {
      setFolderLoading(false);
    }
  };

  // Ported from Library.js's uploadFilesToTarget: uploads already-picked
  // files (from the native OS file dialog — see handleFileInputTrigger)
  // into targetFolderId, applying the shared metadata fields collected by
  // DocumentUploadFieldsModal to every record. The Document Name field
  // only overrides the record title when uploading exactly 1 file
  // (Library's applyTitleOverride rule), otherwise each record keeps its
  // own file name. No permission re-check here — the caller
  // (handleFileInputTrigger / handleConfirmUploadFields) already checked
  // canCreate on the real target folder before this runs; re-checking
  // after a "grouped" folder was just created would false-block since
  // that folder isn't in `folders` state yet (loadData() hasn't run).
  const uploadFilesToTarget = async (selectedFiles, targetFolderId, metadata) => {
    const filesToUpload = Array.from(selectedFiles || []).filter(Boolean);
    if (!filesToUpload.length) return true;
    try {
      const userId = getCurrentUserId();
      let nextIndex = await getNextFileIndex(targetFolderId);
      const applyTitleOverride = !!metadata?.title && filesToUpload.length === 1;
      const sharedFields = {
        documentType: metadata?.documentType || "",
        documentCode: metadata?.documentCode || "",
        openingDate: metadata?.openingDate || null,
        signedAt: metadata?.signedAt || null,
        effectiveAt: metadata?.effectiveAt || null,
        senderName: metadata?.senderName || "",
        recipientName: metadata?.recipientName || "",
        description: metadata?.description || "",
      };

      for (const file of filesToUpload) {
        const attachment = await uploadAttachment(file, file.name);
        const title = applyTitleOverride ? metadata.title : file.name;
        const nowIso = new Date().toISOString();
        const payload = {
          name: file.name,
          title,
          fileIndex: nextIndex,
          fileAttachment: [{ id: attachment.id }],
          createdAt: nowIso,
          updatedAt: nowIso,
          uploadedAt: nowIso,
          uploaded_at: nowIso,
          storageType: activeSpace,
          ...sharedFields,
          ...(targetFolderId ? { folderId: targetFolderId } : {}),
          ...(userId
            ? { uploadedById: userId, createdById: userId, updatedById: userId }
            : {}),
        };
        applySpaceDocumentPayload(payload);
        await createDocumentRecord(payload);
        nextIndex += 1;
      }

      message.success(`Upload ${filesToUpload.length} file(s) successfully!`);
      loadData();
      return true;
    } catch (e) {
      message.error("Upload failed");
      return false;
    }
  };

  // Fires when the native file dialog (fileInputRef, triggered by
  // handleNewActionClick / the empty-state buttons / a folder card's own
  // "+ Upload file" button) returns a selection. Matches Library.js's
  // handleFileInputTrigger: permission is checked here, against the real
  // target folder, BEFORE the metadata modal even opens.
  const handleFileInputTrigger = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = null;
    if (!files.length) return;
    const targetSelector =
      directFileTargetRef.current === undefined || directFileTargetRef.current === null
        ? selectedFolderId
        : directFileTargetRef.current;
    directFileTargetRef.current = null;
    if (activeSpace !== "personal" && !requireCompany()) return;
    if (!requireCaseRootFolderForUpload(targetSelector)) return;
    if (!currentFolderPerms.canCreate) {
      message.warning("You do not have permission to upload documents to this folder");
      return;
    }
    setUploadFieldsTarget({ files, folderId: getEffectiveFolderId(targetSelector) });
  };

  // Submits DocumentUploadFieldsModal — creates the "grouped" folder first
  // (if chosen) then uploads every file into it, matching Library.js's
  // handleConfirmUploadFields.
  const handleConfirmUploadFields = async (metadata) => {
    const target = uploadFieldsTarget;
    if (!target) return;
    let targetFolderId = target.folderId;

    if (metadata.uploadMode === "grouped") {
      if (!currentFolderPerms.canCreate) {
        message.warning("You do not have permission to create a folder at this location");
        return;
      }
      const userId = getCurrentUserId();
      const nowIso = new Date().toISOString();
      const folderPayload = {
        name: metadata.groupFolderName.trim(),
        type: "custom",
        createdAt: nowIso,
        updatedAt: nowIso,
        storageType: activeSpace,
        ...(targetFolderId ? { parentId: targetFolderId } : {}),
        ...(userId ? { createdById: userId, updatedById: userId } : {}),
      };
      applySpaceFolderPayload(folderPayload);

      let folderRes;
      try {
        folderRes = await createFolderRecord(folderPayload);
      } catch (e) {
        message.error("Failed to create folder");
        return;
      }
      targetFolderId = extractId(folderRes?.data?.data);
      if (!targetFolderId) {
        message.error("Failed to create folder");
        return;
      }
    }

    const ok = await uploadFilesToTarget(target.files, targetFolderId, metadata);
    if (ok) setUploadFieldsTarget(null);
  };

  const handleFolderInputTrigger = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setPendingFolderFiles(files);
    setBulkTargetId(selectedFolderId);
    setBulkConfirmOpen(true);
    event.target.value = null;
  };

  const executeFolderUpload = async () => {
    if (activeSpace !== "personal" && !requireCompany()) return;
    if (!requireCaseRootFolderForUpload(bulkTargetId)) return;
    setBulkUploading(true);
    setBulkProgress("Analyzing folder structure...");
    setBulkPercent(5);
    try {
      const rootParentId = getEffectiveFolderId(bulkTargetId);
      const folderIdMap = { "": rootParentId };
      const folderPaths = new Set();
      pendingFolderFiles.forEach((file) => {
        const relativePath = file.webkitRelativePath || file.name;
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
      setBulkProgress(`Creating ${sortedPaths.length} folders...`);

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

        applySpaceFolderPayload(folderPayload);

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
        const relativePath = file.webkitRelativePath || file.name;
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

        applySpaceDocumentPayload(filePayload);

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
    const targetId = getEffectiveFolderId(targetFolderId);
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
        await requestDocumentApi({
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
    Modal.confirm({
      title: `Restore ${selectedRowKeys.length} selected item(s)?`,
      content:
        "Folders and documents will be restored to their original space.",
      okText: "Restore",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const recordsToRestore = selectedRowKeys
            .map((key) => tableData.find((record) => record._key === key))
            .filter(Boolean);
          await Promise.all(
            selectedRowKeys.map(async (key) => {
              const isFolder = key.startsWith("folder_");
              const rId = Number(
                key.replace("folder_", "").replace("file_", ""),
              );
              const url = isFolder
                ? `folders:update?filterByTk=${rId}`
                : `documents:update?filterByTk=${rId}`;
              const requestOptions = {
                url,
                method: "POST",
                data: { isDeleted: false, deletedAt: null },
              };
              await (isFolder
                ? ctx.api.request(requestOptions)
                : requestDocumentApi(requestOptions));
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
    Modal.confirm({
      title: `Permanently delete ${selectedRowKeys.length} selected item(s)?`,
      content:
        "This action cannot be undone. Files and folders will be permanently removed from the system.",
      okText: "Permanently Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const recordsToDelete = selectedRowKeys
            .map((key) => tableData.find((record) => record._key === key))
            .filter(Boolean);
          await Promise.all(
            selectedRowKeys.map(async (key) => {
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
                dataId: extractId(activeCaseIdValue),
              }),
            ),
          );
          message.success(`Deleted ${selectedRowKeys.length} item(s) successfully!`);
          setSelectedRowKeys([]);
          loadData();
        } catch (e) {
          message.error("Delete failed");
        }
      },
    });
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    // Defense in depth — the bulk bar's "Delete" button is already hidden
    // for non-admins outside Personal (see canBulkMoveToTrashSelected).
    if (activeSpace !== "personal" && !isAdminUser(currentUserState)) {
      message.warning("Only administrators can delete these items.");
      return;
    }
    // A root folder (Case root, Personal root, Company Shared root, ...)
    // can never be deleted, single or in bulk — same rule as the
    // per-record canDelete gate in renderContextMenuItems/row actions.
    const deletableKeys = selectedRowKeys.filter((key) => {
      const record = tableData.find((r) => r._key === key);
      if (!record) return false;
      if (record._type === "folder" && isFolderTreeRoot(record, permissionAllFolders)) {
        return false;
      }
      return true;
    });
    if (deletableKeys.length === 0) {
      message.warning("Root folders can't be deleted.");
      return;
    }
    Modal.confirm({
      title: `Move ${deletableKeys.length} selected item(s) to Trash?`,
      content: "Selected items will be moved to Trash.",
      okText: "Move to Trash",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const nowIso = new Date().toISOString();
          const userId = extractId(currentUserState) || getCurrentUserId();
          const recordsToTrash = deletableKeys
            .map((key) => tableData.find((record) => record._key === key))
            .filter(Boolean);
          await Promise.all(
            deletableKeys.map(async (key) => {
              const isFolder = key.startsWith("folder_");
              const rId = Number(
                key.replace("folder_", "").replace("file_", ""),
              );
              const url = isFolder
                ? `folders:update?filterByTk=${rId}`
                : `documents:update?filterByTk=${rId}`;
              const requestOptions = {
                url,
                method: "POST",
                data: {
                  isDeleted: true,
                  deletedAt: nowIso,
                  ...(userId ? { updatedById: userId } : {}),
                },
              };
              await (isFolder
                ? ctx.api.request(requestOptions)
                : requestDocumentApi(requestOptions));
            }),
          );
          await Promise.all(
            recordsToTrash.map((record) =>
              createTrashActivityLog(record, "trash_deleted"),
            ),
          );
          message.success(
            `Moved ${deletableKeys.length} item(s) to Trash!`,
          );
          setSelectedRowKeys([]);
          loadData();
        } catch (e) {
          message.error("Delete failed");
        }
      },
    });
  };

  const handleBulkMove = () => {
    if (selectedRowKeys.length === 0) return;
    setBulkMoveTargetId("root");
    setIsBulkMoveOpen(true);
  };

  const handleBulkMoveSubmit = async () => {
    try {
      const targetId = getEffectiveFolderId(bulkMoveTargetId);
      await Promise.all(
        selectedRowKeys.map(async (key) => {
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
            await requestDocumentApi({
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
    const targetFolderId = normalizeParentId(targetRecord.folderId);
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
    await requestDocumentApi({
      url: `documents:update?filterByTk=${extractId(sourceDoc)}`,
      method: "POST",
      data: { folderId: targetFolderId },
    });
    await Promise.all(
      siblings.map((doc, index) =>
        requestDocumentApi({
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
          requestDocumentApi({
            url: `documents:update?filterByTk=${extractId(doc)}`,
            method: "POST",
            data: { fileIndex: index + 1 },
          }),
        ),
      );
    }
    message.success("Document reordered");
    loadData();
    return true;
  };

  const handleDropOnRecord = async (event, targetRecord) => {
    event.preventDefault();
    event.stopPropagation();
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

    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const position =
      y < rect.height * 0.25
        ? "top"
        : y > rect.height * 0.75
          ? "bottom"
          : "inside";

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
      const attachment = getAttachment(record);
      setEditingTitleValue(
        attachment?.title || attachment?.filename || getDocTitle(record),
      );
    }
  };

  const cancelEditTitle = () => {
    setEditingTitleId(null);
    setEditingTitleValue("");
  };

  const handleSaveFileTitle = async (record) => {
    if (isRenameLockedFolder(record)) {
      message.error("System template folders cannot be renamed.");
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
        await requestDocumentApi({
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

  // Generic single-field save for InlineEditCell — folders only ever get
  // "description" through this path; files can get any of the 8 fields the
  // Table's Description column / buildDocMetaColumns() offer. Ported from
  // Library.js's saveRecordField.
  const saveRecordField = async (record, field, value) => {
    try {
      const isFolder = record._type === "folder";
      const userId = getCurrentUserId();
      const requestFn = isFolder ? ctx.api.request : requestDocumentApi;
      await requestFn({
        url: isFolder
          ? `folders:update?filterByTk=${extractId(record)}`
          : `documents:update?filterByTk=${extractId(record)}`,
        method: "POST",
        data: {
          [field]: value,
          updatedAt: new Date().toISOString(),
          ...(userId ? { updatedById: userId } : {}),
        },
      });
      loadData();
    } catch (e) {
      message.error("Failed to update");
      throw e;
    }
  };

  const showDeleteConfirm = (folder) => {
    // Defense in depth — the Move-to-Trash trigger (context menu / inline
    // action) is already hidden for locked system folders and for
    // non-admins outside Personal.
    if (isRenameLockedFolder(folder)) {
      message.error("System template folders cannot be deleted.");
      return;
    }
    if (activeSpace !== "personal" && !isAdminUser(currentUserState)) {
      message.warning("Only administrators can delete this item.");
      return;
    }
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
      title: `Confirm delete folder "${folder.name}"?`,
      icon: React.createElement(
        "span",
        { style: { color: "#faad14", marginRight: 16 } },
        WarningIcon,
      ),
      content: (
        <div style={{ fontFamily: FONT, marginTop: 8 }}>
          <p>You are about to delete this folder. The following data will also be deleted:</p>
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
              (This folder is empty)
            </p>
          )}
          <p>Are you sure you want to delete it?</p>
        </div>
      ),
      okText: "Move to Trash",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          if (folderIdsToDelete.length > 0) {
            const nowIso = new Date().toISOString();
            const userId = extractId(currentUserState) || getCurrentUserId();
            const deletePayload = {
              isDeleted: true,
              deletedAt: nowIso,
              ...(userId ? { updatedById: userId } : {}),
            };
            await requestDocumentApi({
              url: "documents:update",
              method: "POST",
              params: {
                filter: JSON.stringify({
                  folderId: { $in: folderIdsToDelete.map((id) => Number(id)) },
                }),
              },
              data: deletePayload,
            }).catch(() => {});
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
          message.success("Folder and its contents moved to Trash");
          if (
            selectedFolderId !== "root" &&
            folderIdsToDelete.includes(String(selectedFolderId))
          ) {
            setSelectedFolderId("root");
          }
          loadData();
        } catch (e) {
          message.error("Delete failed");
        }
      },
    });
  };

  const handleDeleteFile = (record) => {
    // Defense in depth — the Move-to-Trash trigger (context menu) is
    // already hidden for non-admins outside Personal.
    if (activeSpace !== "personal" && !isAdminUser(currentUserState)) {
      message.warning("Only administrators can delete this item.");
      return;
    }
    Modal.confirm({
      title: "Delete this file?",
      icon: React.createElement(
        "span",
        { style: { color: "#faad14", marginRight: 16 } },
        WarningIcon,
      ),
      content: "This file will be moved to Trash.",
      okText: "Move to Trash",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const userId = extractId(currentUserState) || getCurrentUserId();
          await requestDocumentApi({
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
          message.error("Delete failed");
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
        await requestDocumentApi({
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
    Modal.confirm({
      title: record._type === "folder" ? "Delete this folder?" : "Delete this file?",
      icon: React.createElement(
        "span",
        { style: { color: "#ff4d4f", marginRight: 16 } },
        WarningIcon,
      ),
      content:
        "Warning: this action cannot be undone — the data will be permanently removed from the database.",
      okText: "Delete",
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
            dataId: extractId(activeCaseIdValue),
          });
          message.success("Deleted");
          loadData();
        } catch {
          message.error("Delete failed");
        }
      },
    });
  };

  const handleCreateFolderFromSidebar = (spaceType, companyId = null) => {
    if (spaceType === "cases" && !activeCaseIdValue) {
      message.warning("Current case not found");
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
        ? `Confirm delete Reference Case "${templateRecord.title || templateRecord.name}"?`
        : `Confirm delete document type "${templateRecord.title || templateRecord.name}"?`,
      icon: React.createElement(
        "span",
        { style: { color: "#faad14", marginRight: 16 } },
        WarningIcon,
      ),
      content: isLegalRef
        ? "Are you sure you want to delete this Reference Case? Its documents and folders will remain in Trash or become unlinked."
        : "Are you sure you want to delete this document type? Documents under this type will remain but become unlinked.",
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
            isLegalRef ? "Reference Case deleted" : "Document type deleted",
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
        message.error("System template folders cannot be renamed.");
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
        message.success("Reference Case renamed");
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
          await requestDocumentApi({
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

  const openRecordFile = (record) => {
    const fileUrl = getRecordFileUrl(record);
    if (!fileUrl) {
      message.warning("This document has no file or URL");
      return;
    }
    window.open(fileUrl, "_blank");
  };

  const previewRecordFile = (record) => {
    if (!getRecordFileUrl(record)) {
      message.warning("This document has no file or URL to preview");
      return;
    }
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
            ({folderSubFolderCount} folders - {folderFileCount} files)
          </span>
        </div>
      );
    }

    // File
    const attachment = getAttachment(record);
    const hasPrefix = !!(isAllFiles && record._displayFileIndex);
    const displayName =
      attachment?.title ||
      attachment?.filename ||
      record.googleDriveUrl ||
      record.description ||
      "No file attached";
    const hasFile = !!getRecordFileUrl(record);

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

  // Helper: compute per-row write/manage permissions
  const getRecordPerms = useCallback(
    (record) => {
      const currentUser = currentUserState;
      if (!currentUser) return roleToPerms("admin");
      if (isAdminUser(currentUser)) return roleToPerms("admin");
      if (record._type === "folder") {
        return getFolderPermissions(record, currentUser, permissionAllFolders, currentLawyerId, entityPermissionContext);
      }
      const parentFolder = visibleFolders.find(
        (f) => String(extractId(f.id)) === String(extractId(record.folderId) || ""),
      );
      const fp = parentFolder
        ? getFolderPermissions(parentFolder, currentUser, permissionAllFolders, currentLawyerId, entityPermissionContext)
        : roleToPerms(null);
      return fp;
    },
    [currentUserState, currentLawyerId, visibleFolders, permissionAllFolders, entityPermissionContext],
  );

  // Routes a "Permissions" click to the right permissionTarget kind — a
  // Reference (legalStudyId) root folder is governed by its entity's own
  // Manager/Legal Member role, so it must open the entity adapter (its
  // legalStudy record), not the folderManagers/folderMembers adapter that
  // every other root folder uses. Matches Library.js's entityContextMenu
  // "permission" entry point for Legal Study gallery cards.
  const openPermissionsForFolder = (record) => {
    const entityStudyId = extractId(record.legalStudyId);
    if (entityStudyId) {
      const study = legalStudyById.get(String(entityStudyId));
      if (!study) {
        message.warning("Could not find this Reference's data.");
        return;
      }
      setPermissionTarget({ kind: "legal_study", record: study });
      return;
    }
    setPermissionTarget({ kind: "folder", folder: record });
  };

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
          label: renderContextMenuItemLabel(EYE_ICON, "Open Detail"),
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
          label: renderContextMenuItemLabel(DELETE_ICON, "Delete", "#cf1322"),
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
          label: renderContextMenuItemLabel(DELETE_ICON, "Delete", "#cf1322"),
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
          label: renderContextMenuItemLabel(DELETE_ICON, "Delete", "#cf1322"),
          onClick: () => {
            closeContextMenu();
            handlePermanentDelete(record);
          },
        });
        return items;
      }

      const {
        canRename: rawCanRename,
        canMove,
        canDelete: rawCanDelete,
        canManagePermissions: rawCanManagePermissions,
      } = getRecordPerms(record);
      const isLocked = isRenameLockedFolder(record);
      const canRename = rawCanRename && !isLocked;
      // Same lock as rename — the 5 system template folders can never be
      // deleted regardless of role. Move to Trash is also admin-only
      // outside Personal — a Manager/Editor with role-based canDelete can
      // still move/edit, but only an admin can delete a shared
      // record/folder, so an accidental delete by a collaborator can't
      // happen. Personal space keeps role-based canDelete since only the
      // owner themselves ever holds it there.
      // A folder that IS its own tree root (Case root, Personal root,
      // Company Shared root, ...) can never be deleted, including by an
      // admin — only subfolders inside it can. Non-folder records resolve
      // isFolderTreeRoot to false, so this never touches file deletion.
      const canDelete =
        rawCanDelete &&
        !isLocked &&
        !isFolderTreeRoot(record, permissionAllFolders) &&
        (activeSpace === "personal" || isAdminUser(currentUserState));
      // Reference (legalStudyId) folders are governed by the entity's own
      // Manager/Legal Member role — resolveLegalEntityFolderPerms already
      // folds that into rawCanManagePermissions (true only when this user
      // IS that entity's Manager), so no separate legalStudyId exclusion
      // is needed here; openPermissionsForFolder below routes the click to
      // the right adapter. Permissions is root-folder-only — never offered
      // on a subfolder.
      const canManagePermissions =
        rawCanManagePermissions &&
        isFolderTreeRoot(record, permissionAllFolders);

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
            openPermissionsForFolder(record);
          },
        });
      }

      if (canDelete) {
        items.push({
          key: "delete",
          label: renderContextMenuItemLabel(DELETE_ICON, "Delete", "#cf1322"),
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
      permissionAllFolders,
      openLegalReferenceDetail,
      openLinkCaseModal,
      legalStudyById,
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
      while (currentId && currentId !== "root") {
        // Same folderById fallback as breadcrumbs: folderMap is scoped to
        // the active space/company, so an ancestor outside that scope (or
        // hidden by ACL) would otherwise stop the walk early and hide the
        // rest of the source path shown in Trash.
        const folder =
          folderMap.get(String(currentId)) || folderById.get(String(currentId));
        if (!folder) break;
        // The case's root folder is a real tree node now (see visibleFolders'
        // cases branch) — include its name in the path like any other folder.
        pathItems.unshift(folder.name || "Folder");
        currentId = getFolderParentId(folder);
      }

      let rootName = "Home";
      const storage =
        record.storageType ||
        (parentFolderId && folderMap.get(String(parentFolderId))?.storageType);

      if (
        storage === "cases" ||
        matchesCaseDocument(record, activeCaseIdValue, caseFolderIdSet)
      ) {
        rootName = "Cases";
      } else if (storage === "personal") {
        rootName = "My Workspace";
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
    [
      folderMap,
      folderById,
      activeCompany,
      documentTypes,
      getRecordDocumentType,
      activeCaseIdValue,
      caseFolderIdSet,
    ],
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
            <Tooltip title="Delete">
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
      const {
        canRename: rawCanRename,
        canMove,
        canDelete: rawCanDelete,
        canManagePermissions: rawCanManagePermissions,
      } = getRecordPerms(record);
      const isLocked = isRenameLockedFolder(record);
      const canRename = rawCanRename && !isLocked;
      // Same lock as rename + admin-only-outside-Personal + root-folder
      // block as the context menu — see renderContextMenuItems for the
      // full reasoning.
      const canDelete =
        rawCanDelete &&
        !isLocked &&
        !isFolderTreeRoot(record, permissionAllFolders) &&
        (activeSpace === "personal" || isAdminUser(currentUser));
      const canManagePermissions =
        rawCanManagePermissions &&
        isFolderTreeRoot(record, permissionAllFolders);
      if (!canRename && !canMove && !canDelete && !canManagePermissions) return null;
      return (
        <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}>
          {canManagePermissions && (
            <Tooltip title="Permissions">
              <Button
                size="small"
                icon={LOCK_ICON}
                onClick={(event) => { event.stopPropagation(); openPermissionsForFolder(record); }}
              />
            </Tooltip>
          )}
          {canRename && (
            <Tooltip title="Rename">
              <Button
                size="small"
                icon={EDIT_ICON}
                onClick={(event) => { event.stopPropagation(); startEditTitle(record); }}
              />
            </Tooltip>
          )}
          {canMove && (
            <Tooltip title="Move">
              <Button
                size="small"
                icon={MOVE_ICON}
                onClick={(event) => { event.stopPropagation(); setMoveRecord(record); setMoveTargetId("root"); }}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Move to Trash">
              <Button
                size="small"
                danger
                icon={DELETE_ICON}
                onClick={(event) => { event.stopPropagation(); showDeleteConfirm(record); }}
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
            <Tooltip title="Delete">
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
      return (
        <div
          style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}
        >
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
          title: "Reference Name",
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
              <Tooltip title="Delete">
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
            title: "Uploaded At",
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
            title: "Deleted At",
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
            <InlineEditCell
              type="textarea"
              value={record.description}
              canEdit={getRecordPerms(record).canRename}
              onSave={(v) => saveRecordField(record, "description", v)}
            />
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
          title: "Created At",
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

    // Document metadata columns (type, code, dates, sender/recipient) —
    // same 7 fields collected in the Upload File modal. Editable via
    // InlineEditCell for file rows only — folders don't carry these
    // fields, so folder rows always show a static "—". Ported from
    // Library.js's buildDocMetaColumns().
    const buildDocMetaColumns = () => [
      {
        title: "Document Type",
        key: "documentType",
        width: 140,
        render: (_, record) =>
          record._type === "file" ? (
            <InlineEditCell
              value={record.documentType}
              canEdit={getRecordPerms(record).canRename}
              onSave={(v) => saveRecordField(record, "documentType", v)}
            />
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: "Document Code",
        key: "documentCode",
        width: 140,
        render: (_, record) =>
          record._type === "file" ? (
            <InlineEditCell
              value={record.documentCode}
              canEdit={getRecordPerms(record).canRename}
              onSave={(v) => saveRecordField(record, "documentCode", v)}
            />
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: "Opening Date",
        key: "openingDate",
        width: 120,
        sorter: (a, b) =>
          new Date(a.openingDate || 0) - new Date(b.openingDate || 0),
        render: (_, record) =>
          record._type === "file" ? (
            <InlineEditCell
              type="date"
              value={record.openingDate}
              canEdit={getRecordPerms(record).canRename}
              onSave={(v) => saveRecordField(record, "openingDate", v)}
            />
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: "Signed Date",
        key: "signedAt",
        width: 120,
        sorter: (a, b) =>
          new Date(a.signedAt || 0) - new Date(b.signedAt || 0),
        render: (_, record) =>
          record._type === "file" ? (
            <InlineEditCell
              type="date"
              value={record.signedAt}
              canEdit={getRecordPerms(record).canRename}
              onSave={(v) => saveRecordField(record, "signedAt", v)}
            />
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: "Effective Date",
        key: "effectiveAt",
        width: 130,
        sorter: (a, b) =>
          new Date(a.effectiveAt || 0) - new Date(b.effectiveAt || 0),
        render: (_, record) =>
          record._type === "file" ? (
            <InlineEditCell
              type="date"
              value={record.effectiveAt}
              canEdit={getRecordPerms(record).canRename}
              onSave={(v) => saveRecordField(record, "effectiveAt", v)}
            />
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: "Sender",
        key: "senderName",
        width: 150,
        render: (_, record) =>
          record._type === "file" ? (
            <InlineEditCell
              value={record.senderName}
              canEdit={getRecordPerms(record).canRename}
              onSave={(v) => saveRecordField(record, "senderName", v)}
            />
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: "Recipient",
        key: "recipientName",
        width: 150,
        render: (_, record) =>
          record._type === "file" ? (
            <InlineEditCell
              value={record.recipientName}
              canEdit={getRecordPerms(record).canRename}
              onSave={(v) => saveRecordField(record, "recipientName", v)}
            />
          ) : (
            <Text type="secondary">—</Text>
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
            title: "Uploaded At",
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
            title: "Deleted At",
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
            <InlineEditCell
              type="textarea"
              value={record.description}
              canEdit={getRecordPerms(record).canRename}
              onSave={(v) => saveRecordField(record, "description", v)}
            />
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
          title: "Uploaded At",
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
          title: "Created At",
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
          title: "Uploaded At",
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
          title: "Deleted At",
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
          <InlineEditCell
            type="textarea"
            value={record.description}
            canEdit={getRecordPerms(record).canRename}
            onSave={(v) => saveRecordField(record, "description", v)}
          />
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
        title: "Created At",
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
        title: "Uploaded At",
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
    openLegalReferenceDetail,
    openLinkCaseModal,
    saveRecordField,
    legalStudyById,
  ]);

  const rowDragProps = (record) => ({
    draggable: record._type !== "legal_reference_record",
    onDragStart: (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        "application/json",
        JSON.stringify({ type: record._type, id: extractId(record) }),
      );
    },
    onDragOver: (event) => {
      event.preventDefault();
    },
    onDrop: (event) => handleDropOnRecord(event, record),
    onContextMenu: (e) => {
      e.preventDefault();
      e.stopPropagation();
      const items = renderContextMenuItems(record);
      if (items.length > 0) {
        setContextMenuState({ open: true, x: e.clientX, y: e.clientY, record });
      }
    },
    onClick: () => {
      if (record._type === "legal_reference_record") {
        openLegalReferenceDetail(record);
      }
    },
  });

  const handleNewActionClick = ({ key }) => {
    if (!currentFolderPerms.canCreate) {
      message.warning("You only have view access to this folder");
      return;
    }
    if (!requireCompany()) return;
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
      { key: "upload", label: renderNewMenuLabel(TYPE_ICONS.upload, "Upload File") },
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
        width: 320,
        render: (text, log) => {
          const isFolder = log.collectionName === "Folder";
          const docRecord = !isFolder
            ? documents.find(
                (d) => String(extractId(d.id)) === String(log.recordId),
              )
            : null;
          const folderRecord = isFolder
            ? folders.find(
                (f) => String(extractId(f.id)) === String(log.recordId),
              )
            : null;
          // isDeleted chỉ chứa "true"/"false" — không phải tên file/folder,
          // nên không được dùng làm fallback hiển thị tên.
          const isBooleanFlagField = log.fieldName === "isDeleted";
          const name =
            log.resolvedTitle ||
            log.recordTitle ||
            folderRecord?.name ||
            docRecord?.title ||
            (!isBooleanFlagField && log.newValue) ||
            (!isBooleanFlagField && log.oldValue) ||
            (isFolder
              ? `Folder #${log.recordId}`
              : `Document #${log.recordId}`);

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
                minWidth: 240,
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
                    whiteSpace: "normal",
                    wordBreak: "break-word",
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
                  style={{
                    fontSize: 13,
                    color: "#374151",
                    fontWeight: 500,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
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
        width: 420,
        render: (text, log) => {
          const desc = resolveActivityDesc(log, folders, documents);
          return (
            <div
              style={{
                minWidth: 320,
                maxWidth: 560,
                fontSize: 13,
                color: "#4B5563",
                lineHeight: 1.6,
                whiteSpace: "normal",
                wordBreak: "normal",
                overflowWrap: "break-word",
              }}
            >
              {desc}
            </div>
          );
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

  // Load/save adapters consumed by PermissionManagerModal (via
  // permissionModalConfig below) — matches Library.js's
  // loadFolderPermissions/saveFolderPermissions exactly.
  const loadFolderPermissions = async (folder) => {
    const folderId = extractId(folder.id || folder);
    const [mgRes, mbRes] = await Promise.all([
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
    ]);
    const managerRow = (mgRes?.data?.data || [])[0];
    const memberRows = mbRes?.data?.data || [];
    return {
      managerId: managerRow ? String(getPermissionLawyerId(managerRow)) : null,
      members: memberRows
        .map((row) => ({
          id: String(getPermissionLawyerId(row)),
          role: getPermissionRole(row, "viewer"),
          lawyerData: getRelationLawyerRecord(row),
        }))
        .filter((s) => s.id && s.id !== "undefined"),
    };
  };

  // Case-root sync (push Manager/Members back onto the Case record's own
  // managerId/assignees) uses this file's own activeCaseRootFolderId/
  // activeCaseIdValue directly — CaseDocument.js is single-Case-scoped, so
  // it doesn't need Library.js's generic isCaseRootFolder/
  // getFolderCaseProjectId (which scan allFolders to find the Case a
  // folder belongs to, needed there because Library.js's galleries span
  // many Cases at once).
  const saveFolderPermissions = async (folder, managerId, members) => {
    const folderId = extractId(folder.id);
    const isCaseRootFolderTarget =
      !!activeCaseRootFolderId &&
      String(extractId(folder)) === String(activeCaseRootFolderId);

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
    if (managerId) {
      createPromises.push(
        ctx.api.request({
          url: "folderManagers:create",
          method: "POST",
          data: { folderId, lawyerId: Number(managerId), role: "manager" },
        }),
      );
    }
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

    // Editing Manager/Members here only updates the folder permission
    // tables — push it back onto the Case record too (managerId/assignees,
    // the source of truth read elsewhere) so the two stay in sync.
    // CaseCreateForm.js only syncs this once, at case creation, so later
    // edits here had no way to flow back otherwise.
    if (isCaseRootFolderTarget && activeCaseIdValue) {
      try {
        await ctx.api.request({
          url: "projects:update",
          method: "POST",
          params: { filterByTk: parseInt(activeCaseIdValue) },
          data: {
            managerId: managerId ? parseInt(managerId) : null,
            assignees: members.map((m) => ({ id: parseInt(m.id) })),
          },
        });
      } catch (syncError) {
        console.warn(
          "Could not sync case manager/assignees from folder permissions:",
          syncError,
        );
        message.warning(
          "Folder permissions saved, but Manager/Members could not be synced to the Case.",
        );
      }
    }
  };

  const loadEntityPermissions = async (record, fkField) => {
    const recordId = extractId(record);
    const memberRows = await fetchEntityMemberRows(fkField, recordId);
    const recordManagerId = getLegalEntityManagerId(record);
    return {
      managerId: recordManagerId ? String(recordManagerId) : null,
      members: memberRows
        .filter((r) => r.role !== "manager")
        .map((r) => ({
          id: String(getEntityMemberRowLawyerId(r)),
          role: r.role || "viewer",
          lawyerData: getEntityMemberRowLawyerRecord(r),
        }))
        .filter((s) => s.id && s.id !== "undefined"),
    };
  };

  const saveEntityPermissions = async (record, kind, fkField, managerId, members) => {
    const recordId = extractId(record);
    const numericManagerId = managerId ? Number(managerId) : null;
    // Keep the parent record's own single-value "manager" field in sync
    // (still a plain belongsTo column, separate from the role-tracking
    // Legal Member table below).
    const parentPayload = { manager: numericManagerId, managerId: numericManagerId };
    const updateCandidates = ENTITY_PERMISSION_UPDATE_CANDIDATES[kind] || (() => []);
    for (const url of updateCandidates(recordId)) {
      try {
        await ctx.api.request({ url, method: "POST", data: parentPayload });
        break;
      } catch (e) {
        // try next candidate
      }
    }

    // Role-tracking table: destroy + recreate, same pattern as
    // folderManagers/folderMembers. The manager is intentionally NOT
    // written here — this table also backs the `members` belongsToMany
    // association, so a manager row would resurface as a duplicate entry
    // under Members (both in this modal and in the raw Nocobase admin
    // grid). Manager identity lives solely in the parent record's own
    // manager/managerId field, written above.
    await destroyEntityMemberRows(fkField, recordId);
    await Promise.all(
      members.map((s) => createEntityMemberRow(fkField, recordId, s.id, s.role)),
    );
  };

  const permissionModalConfig = useMemo(() => {
    if (!permissionTarget) return null;
    if (permissionTarget.kind === "folder") {
      const folder = permissionTarget.folder;
      return {
        title: `Folder permissions: ${folder?.name || ""}`,
        loadPermissions: () => loadFolderPermissions(folder),
        savePermissions: (managerId, members) =>
          saveFolderPermissions(folder, managerId, members),
      };
    }
    const { record } = permissionTarget;
    const fkField = "legalStudyId";
    return {
      title: `${REFERENCE_LABEL} permissions: ${record?.title || record?.name || ""}`,
      loadPermissions: () => loadEntityPermissions(record, fkField),
      savePermissions: (managerId, members) =>
        saveEntityPermissions(record, "legal_study", fkField, managerId, members),
    };
  }, [permissionTarget, activeCaseRootFolderId, activeCaseIdValue]);

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

      <Layout
        style={{
          background: "#fff",
          minHeight: "720px",
          fontFamily: FONT,
          borderRadius: 8,
          border: "0.5px solid #e5e7eb",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {!sidebarCollapsed && (
          <Sider
            width={240}
            style={{
              background: "#FFFFFF",
              borderRight: "0.5px solid #E5E7EB",
              padding: "16px 12px",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* ══ SIDEBAR CLOSE BUTTON ══ */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 12,
                }}
              >
                <Tooltip title="Close sidebar">
                  <Button
                    type="text"
                    icon={SIDEBAR_ICON}
                    onClick={() => setSidebarCollapsed(true)}
                    style={{
                      width: 28,
                      height: 28,
                      minWidth: 28,
                      padding: 0,
                      color: "#9CA3AF",
                    }}
                  />
                </Tooltip>
              </div>

              {/* ══ SEARCH BOX ══ */}
              <div style={{ marginBottom: 16 }}>
                <Input
                  placeholder="Search file..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  allowClear
                  prefix={
                    <span
                      style={{
                        color: "#9CA3AF",
                        marginRight: 4,
                        display: "flex",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>
                  }
                  style={{
                    borderRadius: 8,
                    background: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                  }}
                />
              </div>

              {/* Current Case */}
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 2px 6px 2px",
                  }}
                >
                  <div
                    onClick={() => {
                      setActiveSpace("cases");
                      setActiveLegalReferenceId(null);
                      // Jump straight into the root folder (not the "root"
                      // sentinel) so New/Upload always creates children of
                      // it, not siblings shown only once navigated in —
                      // matches the folder button below.
                      setSelectedFolderId(
                        activeCaseRootFolderId
                          ? String(activeCaseRootFolderId)
                          : "root",
                      );
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSpacesExpanded(!spacesExpanded);
                      }}
                      style={{
                        color: "#9CA3AF",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      {spacesExpanded ? ChevronDown : ChevronRight}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: activeSpace === "cases" ? "#185FA5" : "#9CA3AF",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontFamily: FONT,
                      }}
                    >
                      Case
                    </span>
                  </div>
                </div>
                {spacesExpanded && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {activeCaseRootFolder ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSpace("cases");
                          setActiveLegalReferenceId(null);
                          setSelectedFolderId(String(extractId(activeCaseRootFolder)));
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const items = renderContextMenuItems({
                            ...activeCaseRootFolder,
                            _type: "folder",
                          });
                          if (items.length > 0) {
                            setContextMenuState({
                              open: true,
                              x: e.clientX,
                              y: e.clientY,
                              record: { ...activeCaseRootFolder, _type: "folder" },
                            });
                          }
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 10px",
                          border: "0",
                          borderRadius: 8,
                          cursor: "pointer",
                          // No more sidebar sub-navigation into this folder's
                          // children (see the removed subfolder list below) —
                          // this is the sole "Current Case" entry point now,
                          // so it stays highlighted for the whole space rather
                          // than only at the bare "root" sentinel.
                          borderLeft:
                            activeSpace === "cases"
                              ? "2px solid #185FA5"
                              : "2px solid transparent",
                          background:
                            activeSpace === "cases" ? "#E6F1FB" : "transparent",
                          color: activeSpace === "cases" ? "#185FA5" : "#6B7280",
                          fontWeight: activeSpace === "cases" ? 600 : 400,
                          fontFamily: FONT,
                          fontSize: 13,
                          transition: "background 0.15s",
                          minWidth: 0,
                          textAlign: "left",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          {React.cloneElement(TYPE_ICONS.folder, { size: 15 })}
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
                          {activeCaseRootFolder.name || "Folder"}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCreateFolderFromSidebar("cases")}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 10px",
                          border: "1px dashed #FEF3C7",
                          borderRadius: 8,
                          cursor: "pointer",
                          background: "#FFFBEB",
                          color: "#B45309",
                          fontWeight: 500,
                          fontFamily: FONT,
                          fontSize: 13,
                          minWidth: 0,
                          textAlign: "left",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          {React.cloneElement(TYPE_ICONS.folder, { size: 15 })}
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
                          No folder yet — click to create
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ══ SECTION 3: CASE REFERENCE ══ */}
              <div
                style={{
                  borderTop: "0.5px solid #E5E7EB",
                  paddingTop: 12,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 2px 6px 2px",
                  }}
                >
                  <div
                    onClick={() => {
                      setActiveSpace("case_reference");
                      setActiveCaseReferenceId(null);
                      setSelectedFolderId("root");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaseReferenceExpanded(!caseReferenceExpanded);
                      }}
                      style={{
                        color: "#9CA3AF",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      {caseReferenceExpanded ? ChevronDown : ChevronRight}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color:
                          activeSpace === "case_reference" &&
                          !activeCaseReferenceId
                            ? "#185FA5"
                            : "#9CA3AF",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontFamily: FONT,
                      }}
                    >
                      Linked Cases
                    </span>
                  </div>
                </div>
                {caseReferenceExpanded && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {caseReferences.length === 0 ? (
                      <div style={{ padding: "4px 10px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            fontStyle: "italic",
                          }}
                        >
                          No linked cases yet
                        </span>
                      </div>
                    ) : (
                      caseReferences.map((ref) => {
                        const refId = String(extractId(ref));
                        const isActive =
                          activeSpace === "case_reference" &&
                          refId === activeCaseReferenceId;
                        const rootFolder = linkedCaseRootFolderById.get(refId);
                        const displayLabel =
                          rootFolder?.name ||
                          ref.projectName ||
                          ref.title ||
                          getCaseDisplayName(ref);
                        return (
                          <button
                            key={refId}
                            type="button"
                            onClick={() => {
                              setActiveSpace("case_reference");
                              setActiveCaseReferenceId(refId);
                              setSelectedFolderId("root");
                            }}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "7px 10px",
                              border: "0",
                              borderRadius: 8,
                              cursor: "pointer",
                              borderLeft: isActive
                                ? "2px solid #185FA5"
                                : "2px solid transparent",
                              background: isActive ? "#E6F1FB" : "transparent",
                              color: isActive ? "#185FA5" : "#6B7280",
                              fontFamily: FONT,
                              minWidth: 0,
                              transition: "background 0.15s",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive)
                                e.currentTarget.style.background = "#F3F4F6";
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive)
                                e.currentTarget.style.background =
                                  "transparent";
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const record = rootFolder
                                ? { ...rootFolder, _type: "folder" }
                                : { ...ref, _type: "case_reference_record" };
                              setContextMenuState({
                                open: true,
                                x: e.clientX,
                                y: e.clientY,
                                record,
                              });
                            }}
                          >
                            <span
                              style={{
                                width: 15,
                                height: 15,
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: isActive ? "#185FA5" : "#6B7280",
                              }}
                            >
                              {React.cloneElement(TYPE_ICONS.folder, {
                                size: 14,
                              })}
                            </span>
                            <Tooltip
                              title={displayLabel}
                              placement="right"
                              mouseEnterDelay={0.5}
                            >
                              <span
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {displayLabel}
                              </span>
                            </Tooltip>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* ══ SECTION 4: LEGAL STUDY ══ */}
              <div
                style={{
                  borderTop: "0.5px solid #E5E7EB",
                  paddingTop: 12,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 2px 6px 2px",
                  }}
                >
                  <div
                    onClick={() => {
                      setActiveSpace("legal_study");
                      setActiveLegalStudyId(null);
                      setSelectedFolderId("root");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setLegalStudyExpanded(!legalStudyExpanded);
                      }}
                      style={{
                        color: "#9CA3AF",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      {legalStudyExpanded ? ChevronDown : ChevronRight}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color:
                          activeSpace === "legal_study" && !activeLegalStudyId
                            ? "#185FA5"
                            : "#9CA3AF",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontFamily: FONT,
                      }}
                    >
                      {REFERENCE_LABEL}
                    </span>
                  </div>
                </div>
                {legalStudyExpanded && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {legalStudies.length === 0 ? (
                      <div style={{ padding: "4px 10px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            fontStyle: "italic",
                          }}
                        >
                          No Reference records yet
                        </span>
                      </div>
                    ) : (
                      legalStudies.map((ref) => {
                        const refId = String(extractId(ref));
                        const isActive =
                          activeSpace === "legal_study" &&
                          refId === activeLegalStudyId;
                        const rootFolder = legalStudyRootFolderById.get(refId);
                        const displayLabel =
                          rootFolder?.name ||
                          ref.title ||
                          ref.name ||
                          ref.projectName ||
                          REFERENCE_LABEL;
                        return (
                          <button
                            key={refId}
                            type="button"
                            onClick={() => {
                              setActiveSpace("legal_study");
                              setActiveLegalStudyId(refId);
                              // Jump straight into this Reference's root
                              // folder (not the "root" sentinel) — same
                              // reasoning as the Case entry above: New/
                              // Upload should always land inside it, not
                              // beside it.
                              setSelectedFolderId(
                                rootFolder ? String(extractId(rootFolder)) : "root",
                              );
                            }}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "7px 10px",
                              border: "0",
                              borderRadius: 8,
                              cursor: "pointer",
                              borderLeft: isActive
                                ? "2px solid #185FA5"
                                : "2px solid transparent",
                              background: isActive ? "#E6F1FB" : "transparent",
                              color: isActive ? "#185FA5" : "#6B7280",
                              fontFamily: FONT,
                              minWidth: 0,
                              transition: "background 0.15s",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive)
                                e.currentTarget.style.background = "#F3F4F6";
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive)
                                e.currentTarget.style.background =
                                  "transparent";
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const record = rootFolder
                                ? { ...rootFolder, _type: "folder" }
                                : { ...ref, _type: "legal_study_record" };
                              setContextMenuState({
                                open: true,
                                x: e.clientX,
                                y: e.clientY,
                                record,
                              });
                            }}
                          >
                            <span
                              style={{
                                width: 15,
                                height: 15,
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: isActive ? "#185FA5" : "#6B7280",
                              }}
                            >
                              {React.cloneElement(TYPE_ICONS.folder, {
                                size: 14,
                              })}
                            </span>
                            <Tooltip
                              title={displayLabel}
                              placement="right"
                              mouseEnterDelay={0.5}
                            >
                              <span
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {displayLabel}
                              </span>
                            </Tooltip>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* ══ SECTION 4: NHANH (Quick/Recent/Trash) ══ */}
              <div
                style={{
                  borderTop: "0.5px solid #E5E7EB",
                  paddingTop: 12,
                  marginTop: 12,
                }}
              >
                <div style={{ padding: "0 2px 6px 2px" }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#9CA3AF",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontFamily: FONT,
                    }}
                  >
                    Nhanh
                  </span>
                </div>

                {/* ① Recent Activity */}
                {(() => {
                  const isActive = activeSpace === "recent";
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSpace("recent");
                        setActiveLegalReferenceId(null);
                        setSelectedFolderId("root");
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        border: "0",
                        borderRadius: 8,
                        cursor: "pointer",
                        borderLeft: isActive
                          ? "2px solid #185FA5"
                          : "2px solid transparent",
                        background: isActive ? "#E6F1FB" : "transparent",
                        color: isActive ? "#185FA5" : "#6B7280",
                        fontFamily: FONT,
                        minWidth: 0,
                        transition: "background 0.15s",
                        textAlign: "left",
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
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isActive ? "#185FA5" : "#6B7280"}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0 }}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Activity History
                      </span>
                    </button>
                  );
                })()}

                {/* ② Trash */}
                {(() => {
                  const isActive = activeSpace === "trash";
                  const trashCount = quickTrashCount;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSpace("trash");
                        setActiveLegalReferenceId(null);
                        setSelectedFolderId("root");
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        border: "0",
                        borderRadius: 8,
                        cursor: "pointer",
                        borderLeft: isActive
                          ? "2px solid #185FA5"
                          : "2px solid transparent",
                        background: isActive ? "#E6F1FB" : "transparent",
                        color: isActive ? "#185FA5" : "#6B7280",
                        fontFamily: FONT,
                        minWidth: 0,
                        transition: "background 0.15s",
                        textAlign: "left",
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
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isActive ? "#185FA5" : "#6B7280"}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0 }}
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Trash
                      </span>
                    </button>
                  );
                })()}
              </div>
            </div>
          </Sider>
        )}

        <Layout style={{ background: "#fff", minWidth: 0 }}>
          {/* ── TOPBAR ── */}
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "0.5px solid #E5E7EB",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "nowrap",
              background: "#FFFFFF",
              minWidth: 0,
              overflowX: "auto",
            }}
          >
            {sidebarCollapsed && (
              <Tooltip title="Open sidebar">
                <Button
                  icon={SIDEBAR_ICON}
                  onClick={() => setSidebarCollapsed(false)}
                  aria-label="Open sidebar"
                  style={{
                    width: 32,
                    height: 32,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    border: "0.5px solid #E5E7EB",
                    flex: "0 0 auto",
                  }}
                />
              </Tooltip>
            )}

            <div style={{ flex: "1 1 auto", minWidth: 8 }} />

            {/* Filters */}
            {activeSpace === "recent" ? (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flex: "0 0 auto",
                  minWidth: "max-content",
                  flexWrap: "nowrap",
                }}
              >
                <Input.Search
                  placeholder="Search activity..."
                  value={activitySearchQuery}
                  onChange={(e) => {
                    setActivitySearchQuery(e.target.value);
                    setActivityPage(1);
                  }}
                  style={{ width: 180, borderRadius: 8 }}
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
                    { value: "all", label: "All Activity" },
                    { value: "uploaded", label: "Uploaded File" },
                    { value: "previewed", label: "Preview" },
                    { value: "downloaded", label: "Download" },
                    { value: "linked_legal_study", label: `Added to ${REFERENCE_LABEL}` },
                    { value: "shared_file", label: "Shared File" },
                    { value: "unshared_file", label: "Unshared" },
                    { value: "permission_updated", label: "Updated Permissions" },
                    { value: "created", label: "Created Folder" },
                    { value: "updated", label: "Other Update" },
                    { value: "moved", label: "Moved" },
                    { value: "trash_deleted", label: "Moved to Trash" },
                    { value: "restored", label: "Restored" },
                    { value: "deleted", label: "Permanently Deleted" },
                  ]}
                />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flex: "0 0 auto",
                  minWidth: "max-content",
                  flexWrap: "nowrap",
                }}
              >
                <Input.Search
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ width: 180, borderRadius: 8 }}
                  allowClear
                />
                <Select
                  value={sortMode}
                  onChange={setSortMode}
                  style={{ width: 120, borderRadius: 8 }}
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
                          STT
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
                flex: "0 0 auto",
                flexWrap: "nowrap",
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
                    (currentFolderPerms.canEdit ||
                      currentFolderPerms.isManager ||
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
                                      "Create Reference Case",
                                    ),
                                  },
                                ],
                                onClick: () => {
                                  if (requireCompany()) {
                                    createTemplateForm.resetFields();
                                    setIsCreateTemplateOpen(true);
                                  }
                                },
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
              overflowX: "hidden",
              background: "#F9FAFB",
              minWidth: 0,
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropToCurrentFolder}
          >
            <input
              ref={folderInputRef}
              type="file"
              multiple
              webkitdirectory="true"
              directory="true"
              style={{ display: "none" }}
              onChange={handleFolderInputTrigger}
            />

            {activeSpace === "recent" ? (
              <div style={{ padding: "8px 4px 24px 4px", fontFamily: FONT }}>
                <Table
                  dataSource={filteredActivityLogs}
                  columns={activityColumns}
                  loading={activityLoading}
                  rowKey={(log) => log.id || log.changedAt}
                  tableLayout="auto"
                  scroll={{ x: 1120 }}
                  pagination={{
                    current: activityPage,
                    pageSize: 20,
                    onChange: (page) => setActivityPage(page),
                    showSizeChanger: false,
                    total: filteredActivityLogs.length,
                    showTotal: (total, range) =>
                      `${range[0]}–${range[1]} of ${total} activities`,
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
                    // The space-level "root" sentinel (index 0, e.g. "Cases")
                    // is disabled once a real root folder is already showing
                    // as the next crumb — the sidebar now navigates straight
                    // into that root folder (see the Case/Reference sidebar
                    // entries), so clicking back to the bare sentinel would
                    // re-expose the "New" menu creating items at the same
                    // level as the root folder instead of inside it. Kept
                    // visible (not removed) so the path still reads
                    // naturally, just non-interactive.
                    const isDisabledRootCrumb =
                      index === 0 &&
                      breadcrumbs.length > 1 &&
                      (activeSpace === "cases" || activeSpace === "legal_study");
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
                          disabled={isDisabledRootCrumb}
                          onClick={() => {
                            if (isDisabledRootCrumb) return;
                            handleBreadcrumbClick(item);
                          }}
                          style={{
                            border: 0,
                            background: "transparent",
                            borderRadius: 6,
                            padding: "3px 6px",
                            cursor: isDisabledRootCrumb ? "default" : "pointer",
                            fontFamily: FONT,
                            fontSize: 13,
                            fontWeight: isCurrent ? 600 : 400,
                            color: isDisabledRootCrumb
                              ? "#C1C7CF"
                              : isCurrent
                                ? "#111827"
                                : "#6B7280",
                            textDecoration: "none",
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrent && !isDisabledRootCrumb)
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
                </div>

                {currentRootFolderPermissionSummary && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                      marginBottom: 16,
                      marginTop: -8,
                      fontFamily: FONT,
                      fontSize: 12,
                      color: "#6B7280",
                    }}
                  >
                    <span>
                      <span style={{ color: "#9CA3AF" }}>Manager: </span>
                      <strong style={{ color: "#374151", fontWeight: 500 }}>
                        {currentRootFolderPermissionSummary.managerNames.length
                          ? currentRootFolderPermissionSummary.managerNames.join(", ")
                          : "—"}
                      </strong>
                    </span>
                    <span>
                      <span style={{ color: "#9CA3AF" }}>Member: </span>
                      <strong style={{ color: "#374151", fontWeight: 500 }}>
                        {currentRootFolderPermissionSummary.memberNames.length
                          ? currentRootFolderPermissionSummary.memberNames.join(", ")
                          : "—"}
                      </strong>
                    </span>
                  </div>
                )}

                {selectedRowKeys.length > 0 && !isLegalReferenceRoot && (
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
                        item(s)
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
                        Clear selection
                      </Button>
                      <div
                        style={{ width: 1, height: 16, background: "#E5E7EB" }}
                      />
                      {activeSpace === "trash" ? (
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
                            Delete
                          </Button>
                        </React.Fragment>
                      ) : (
                        <React.Fragment>
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
                          {(activeSpace === "personal" ||
                            isAdminUser(currentUserState)) && (
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
                              Delete
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
                          {activeSpace === "cases" &&
                          selectedFolderId === "root" &&
                          !activeCaseRootFolderId
                            ? "This case has no root folder yet"
                            : activeSpace === "legal_reference" &&
                              !activeLegalReferenceId
                              ? "No Reference Cases yet"
                              : activeSpace === "trash"
                                ? "Trash is empty"
                                : query
                                  ? "No results found"
                                  : "This folder is empty"}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#9CA3AF",
                            fontFamily: FONT,
                          }}
                        >
                          {activeSpace === "cases" &&
                          selectedFolderId === "root" &&
                          !activeCaseRootFolderId
                            ? "Please create the case's root folder before uploading documents"
                            : activeSpace === "legal_reference" &&
                              !activeLegalReferenceId
                              ? "Click + Create Reference Case below to get started"
                              : activeSpace === "trash"
                                ? "No deleted files or folders"
                                : query
                                  ? "Try a different search term"
                                  : "Click + New to create a folder or upload your first document"}
                        </div>
                        {activeSpace === "legal_reference" &&
                        !activeLegalReferenceId ? (
                          <button
                            type="button"
                            onClick={() => {
                              createTemplateForm.resetFields();
                              setIsCreateTemplateOpen(true);
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
                              marginTop: 4,
                            }}
                          >
                            + Create Reference Case
                          </button>
                        ) : (
                          activeSpace !== "trash" &&
                          !query && (
                            <div
                              style={{ display: "flex", gap: 8, marginTop: 4 }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  directFileTargetRef.current = selectedFolderId;
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
                                + Add Document
                              </button>
                              <button
                                type="button"
                                onClick={() => folderInputRef.current?.click()}
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
                                + Add Folder
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <React.Fragment>
                        {/* ── Section: Reference Cases ── */}
                        {tableData.some(
                          (r) => r._type === "legal_reference_record",
                        ) && (
                          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                            {tableData
                              .filter(
                                (r) => r._type === "legal_reference_record",
                              )
                              .map((record) => {
                                const refId = String(extractId(record));
                                const filesCount = documents.filter(
                                  (doc) =>
                                    String(getRecordLegalReferenceId(doc)) ===
                                      refId && !doc.isDeleted,
                                ).length;
                                const foldersCount = folders.filter(
                                  (f) =>
                                    String(getRecordLegalReferenceId(f)) ===
                                      refId && !f.isDeleted,
                                ).length;
                                return (
                                  <Col
                                    {...REFERENCE_COL_PROPS}
                                    key={record._key}
                                  >
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
                                          whiteSpace: "normal",
                                          wordBreak: "normal",
                                          overflowWrap: "anywhere",
                                          lineHeight: 1.45,
                                        }}
                                      >
                                        {record.title ||
                                          record.name ||
                                          getLegalReferenceDisplayName(record)}
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
                                          <span style={{ color: "#9CA3AF" }}>
                                            Created by:{" "}
                                          </span>
                                          <strong>
                                            {record.createdBy?.nickname ||
                                              record.createdBy?.username ||
                                              "System"}
                                          </strong>
                                        </div>
                                        <div>
                                          <span style={{ color: "#9CA3AF" }}>
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
                                          {foldersCount} Folders · {filesCount}{" "}
                                          file
                                        </span>
                                      </div>
                                    </Card>
                                  </Col>
                                );
                              })}
                          </Row>
                        )}

                        {/* ── Section: Folders ── */}
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
                            Folders
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
                            .map((record) => {
                              const folderFileCount =
                                permissionFilteredDocs.filter(
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
                                folderFileCount === 0 &&
                                folderSubFolderCount === 0;
                              return (
                                <Col {...GRID_COL_PROPS} key={record._key}>
                                  <div style={{ position: "relative", height: "100%" }}>
                                    <Checkbox
                                      checked={selectedRowKeys.includes(
                                        record._key,
                                      )}
                                      onChange={(e) => {
                                        e.stopPropagation();
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
                                    <Card
                                      hoverable
                                      draggable={activeSpace !== "trash"}
                                      onDragStart={(event) => {
                                        if (activeSpace !== "trash")
                                          rowDragProps(record).onDragStart(event);
                                      }}
                                      onDragOver={(event) => {
                                        if (activeSpace !== "trash")
                                          rowDragProps(record).onDragOver(event);
                                      }}
                                      onDrop={(event) => {
                                        if (activeSpace !== "trash")
                                          rowDragProps(record).onDrop(event);
                                      }}
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
                                              whiteSpace: "normal",
                                              wordBreak: "normal",
                                              overflowWrap: "anywhere",
                                              lineHeight: "1.45",
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
                                                whiteSpace: "normal",
                                                overflowWrap: "anywhere",
                                              }}
                                              title={getRecordPathString(record)}
                                            >
                                              Source: {getRecordPathString(record)}
                                            </span>
                                            <span
                                              style={{
                                                fontSize: 10,
                                                color: "#6B7280",
                                                fontFamily: FONT,
                                                whiteSpace: "normal",
                                                overflowWrap: "anywhere",
                                              }}
                                              title={getDeletedUserName(record)}
                                            >
                                              Deleted by: {getDeletedUserName(record)}
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
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <div
                                                  style={{
                                                    fontSize: 11,
                                                    color: "#9CA3AF",
                                                    fontFamily: FONT,
                                                  }}
                                                >
                                                  No documents yet
                                                </div>
                                                {getRecordPerms(record).canCreate && (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const fid = String(extractId(record));
                                                      directFileTargetRef.current = fid;
                                                      setSelectedFolderId(fid);
                                                      setTimeout(
                                                        () => fileInputRef.current?.click(),
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
                                                    + Upload file
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
                                                {folderSubFolderCount} Folders ·{" "}
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
                            })}
                        </Row>

                        {/* ── Section: Documents ── */}
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
                            Documents
                          </div>
                        )}
                        <Row gutter={[10, 10]}>
                          {tableData
                            .filter((r) => r._type === "file")
                            .map((record) => {
                              const fileIsEditing =
                                editingTitleId === String(extractId(record));
                              const attachment = getAttachment(record);
                              const cardFileName =
                                attachment?.title ||
                                attachment?.filename ||
                                record.googleDriveUrl ||
                                "No file attached";
                              const cardHasFile = !!getRecordFileUrl(record);
                              const ext = getFileExtension(record);

                              const EXT_BADGE = {
                                ".pdf":  { bg: "#FCEBEB", color: "#A32D2D", label: "PDF" },
                                ".doc":  { bg: "#E6F1FB", color: "#185FA5", label: "DOC" },
                                ".docx": { bg: "#E6F1FB", color: "#185FA5", label: "DOCX" },
                                ".xls":  { bg: "#EAF3DE", color: "#3B6D11", label: "XLS" },
                                ".xlsx": { bg: "#EAF3DE", color: "#3B6D11", label: "XLSX" },
                                ".ppt":  { bg: "#FAEEDA", color: "#854F0B", label: "PPT" },
                                ".pptx": { bg: "#FAEEDA", color: "#854F0B", label: "PPTX" },
                                ".png":  { bg: "#F0FDF4", color: "#3B6D11", label: "PNG" },
                                ".jpg":  { bg: "#F0FDF4", color: "#3B6D11", label: "JPG" },
                                ".jpeg": { bg: "#F0FDF4", color: "#3B6D11", label: "JPEG" },
                                ".gif":  { bg: "#F0FDF4", color: "#3B6D11", label: "GIF" },
                                ".webp": { bg: "#F0FDF4", color: "#3B6D11", label: "WEBP" },
                                ".svg":  { bg: "#F0FDF4", color: "#3B6D11", label: "SVG" },
                                ".mp4":  { bg: "#F3F4F6", color: "#6B7280", label: "MP4" },
                                ".zip":  { bg: "#F3F4F6", color: "#6B7280", label: "ZIP" },
                                ".rar":  { bg: "#F3F4F6", color: "#6B7280", label: "RAR" },
                                ".txt":  { bg: "#F3F4F6", color: "#6B7280", label: "TXT" },
                                ".csv":  { bg: "#EAF3DE", color: "#3B6D11", label: "CSV" },
                              };
                              const extInfo = EXT_BADGE[ext] || {
                                bg: "#F3F4F6", color: "#6B7280",
                                label: (ext || "FILE").replace(".", "").toUpperCase(),
                              };

                              return (
                                <Col {...GRID_COL_PROPS} key={record._key}>
                                  <div
                                    draggable={activeSpace !== "trash"}
                                    onDragStart={(event) => {
                                      if (activeSpace !== "trash")
                                        rowDragProps(record).onDragStart(event);
                                    }}
                                    onDragOver={(event) => {
                                      if (activeSpace !== "trash")
                                        rowDragProps(record).onDragOver(event);
                                    }}
                                    onDrop={(event) => {
                                      if (activeSpace !== "trash")
                                        rowDragProps(record).onDrop(event);
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
                                    onClick={() => {
                                      if (cardHasFile && !fileIsEditing)
                                        previewRecordFile(record);
                                    }}
                                    style={{
                                      position: "relative",
                                      height: 192,
                                      background: "#FFFFFF",
                                      border: "0.5px solid #E5E7EB",
                                      borderRadius: 12,
                                      cursor: cardHasFile
                                        ? "pointer"
                                        : "default",
                                      display: "flex",
                                      flexDirection: "column",
                                      overflow: "hidden",
                                      boxSizing: "border-box",
                                      transition:
                                        "border-color .15s, box-shadow .15s",
                                    }}
                                    onMouseEnter={(e) => {
                                      if (cardHasFile) {
                                        e.currentTarget.style.boxShadow =
                                          "0 2px 8px rgba(24,95,165,.1)";
                                        e.currentTarget.style.borderColor =
                                          "#B5D4F4";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.boxShadow = "none";
                                      e.currentTarget.style.borderColor =
                                        "#E5E7EB";
                                    }}
                                  >
                                    <Checkbox
                                      checked={selectedRowKeys.includes(
                                        record._key,
                                      )}
                                      onChange={(e) => {
                                        e.stopPropagation();
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
                                        top: 10,
                                        right: 10,
                                        zIndex: 10,
                                      }}
                                    />

                                    <div
                                      style={{
                                        height: 92,
                                        flexShrink: 0,
                                        background: "#F9FAFB",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderBottom: "0.5px solid #F0F0F0",
                                        position: "relative",
                                      }}
                                    >
                                      {getFileSvgIcon(ext)}
                                      <span
                                        style={{
                                          position: "absolute",
                                          bottom: 6,
                                          right: 8,
                                          fontSize: 9,
                                          fontWeight: 700,
                                          letterSpacing: 0.4,
                                          textTransform: "uppercase",
                                          padding: "2px 5px",
                                          borderRadius: 4,
                                          background: extInfo.bg,
                                          color: extInfo.color,
                                        }}
                                      >
                                        {extInfo.label}
                                      </span>
                                    </div>

                                    <div
                                      style={{
                                        padding: "8px 10px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 3,
                                        flex: 1,
                                        overflow: "hidden",
                                        minHeight: 0,
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
                                              setEditingTitleValue(
                                                e.target.value,
                                              )
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
                                              fontSize: 12,
                                              fontWeight: 600,
                                              color: cardHasFile
                                                ? "#111827"
                                                : "#6B7280",
                                              display: "-webkit-box",
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: "vertical",
                                              overflow: "hidden",
                                              wordBreak: "break-word",
                                              overflowWrap: "anywhere",
                                              lineHeight: "16px",
                                              minHeight: 32,
                                              flexShrink: 0,
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
                                            color: "#9CA3AF",
                                            lineHeight: 1.5,
                                            flexShrink: 0,
                                          }}
                                        >
                                          <div
                                            style={{
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                            title={getDeletedUserName(record)}
                                          >
                                            Deleted by:{" "}
                                            {getDeletedUserName(record)}
                                          </div>
                                          <div>
                                            Deleted:{" "}
                                            {formatDate(
                                              record.deletedAt ||
                                                record.updatedAt,
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <React.Fragment>
                                          <div
                                            style={{
                                              fontSize: 10,
                                              color: "#9CA3AF",
                                              lineHeight: 1.5,
                                              flexShrink: 0,
                                            }}
                                          >
                                            <div>
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
                                              {getUploadUserName(record)}
                                            </div>
                                          </div>
                                          {attachment?.size && (
                                            <div
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                color: "#185FA5",
                                                marginTop: "auto",
                                              }}
                                            >
                                              {formatBytes(attachment.size)}
                                            </div>
                                          )}
                                        </React.Fragment>
                                      )}
                                    </div>
                                  </div>
                                </Col>
                              );
                            })}
                        </Row>
                      </React.Fragment>
                    )}
                  </React.Fragment>
                ) : (
                  <Table
                    rowSelection={
                      isLegalReferenceRoot
                        ? undefined
                        : {
                            selectedRowKeys,
                            onChange: setSelectedRowKeys,
                          }
                    }
                    rowKey={(record) => record._key}
                    columns={tableColumns}
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
                                : "This folder is empty"}
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
        footer={null}
        destroyOnClose
      >
        <Text type="secondary">
          Location: {breadcrumbs.map((item) => item.name).join(" / ")}
        </Text>
        <Form
          form={folderForm}
          layout="vertical"
          onFinish={handleCreateFolder}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Folder Name"
            rules={[{ required: true, message: "Please enter a folder name" }]}
          >
            <Input placeholder="Enter folder name..." />
          </Form.Item>
          
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button
              onClick={() => setIsFolderOpen(false)}
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
              loading={folderLoading}
              style={{
                borderRadius: 8,
                background: "#111827",
                borderColor: "#111827",
              }}
            >
              Submit
            </Button>
          </div>
        </Form>
      </Modal>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputTrigger}
      />
      <DocumentUploadFieldsModal
        open={!!uploadFieldsTarget}
        files={uploadFieldsTarget?.files || []}
        onClose={() => setUploadFieldsTarget(null)}
        onSubmit={handleConfirmUploadFields}
      />

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
          Choose the destination folder for{" "}
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
            Create Reference Case
          </span>
        }
        open={isCreateTemplateOpen}
        onCancel={() => {
          setIsCreateTemplateOpen(false);
          createTemplateForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={createTemplateForm}
          layout="vertical"
          onFinish={handleCreateLegalReference}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Please enter a title" }]}
          >
            <Input placeholder="Enter title..." />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Short description..." />
          </Form.Item>
          <Form.Item
            name="sourceCaseId"
            label="Source Case / Origin Case"
            extra="Select the source case/project this reference case is generated from (only unlinked cases are shown)."
          >
            <Select
              placeholder="Select source case..."
              allowClear
              optionFilterProp="label"
              style={{ width: "100%" }}
              onChange={(value) => {
                if (value) {
                  const selectedProj = projects.find(
                    (p) => String(extractId(p)) === String(value),
                  );
                  if (selectedProj) {
                    const code = selectedProj.caseCode
                      ? selectedProj.caseCode.trim()
                      : "";
                    const name = selectedProj.projectName
                      ? selectedProj.projectName.trim()
                      : "";
                    let formattedTitle = "";
                    if (code && name) {
                      formattedTitle = `${code} - ${name}`;
                    } else if (code) {
                      formattedTitle = code;
                    } else {
                      formattedTitle = name;
                    }
                    createTemplateForm.setFieldsValue({
                      title: formattedTitle,
                      description: selectedProj.description || "",
                    });
                  }
                } else {
                  createTemplateForm.setFieldsValue({
                    title: "",
                    description: "",
                  });
                }
              }}
            >
              {projects
                .filter((p) => !usedProjectIds.has(String(extractId(p))))
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
          <Form.Item
            name="caseIds"
            label="Currently Linked Cases"
            extra="Select active cases in the system to link with this reference case (only unlinked cases are shown)."
          >
            <Select
              mode="multiple"
              placeholder="Select cases to link..."
              allowClear
              optionFilterProp="label"
              style={{ width: "100%" }}
            >
              {projects
                .filter((p) => !usedProjectIds.has(String(extractId(p))))
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
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button
              onClick={() => setIsCreateTemplateOpen(false)}
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
            Edit Document Entry
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
            label="New Name"
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
            Link Reference Case
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
            Save Link
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
            label="Select Active Cases/Projects to Link"
            extra="This list is populated from the projects currently in the system."
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
            Move Multiple Items
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
          Choose the destination folder for <b>{selectedRowKeys.length} selected item(s)</b>
        </Text>
        <TreeSelect
          value={bulkMoveTargetId}
          onChange={setBulkMoveTargetId}
          treeData={moveTreeData}
          style={{ width: "100%", marginTop: 14 }}
          treeDefaultExpandAll
        />
      </Modal>

      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      <PermissionManagerModal
        open={!!permissionTarget}
        title={permissionModalConfig?.title || ""}
        loadPermissions={
          permissionModalConfig?.loadPermissions ||
          (() => Promise.resolve({ managerId: null, members: [] }))
        }
        savePermissions={
          permissionModalConfig?.savePermissions || (() => Promise.resolve())
        }
        onClose={() => setPermissionTarget(null)}
        onSuccess={() => {
          setPermissionTarget(null);
          loadData();
        }}
      />
    </React.Fragment>
  );
};

// ============================================================
// §4 RENDER
// ============================================================
ctx.render(React.createElement(InternalTemplates));
