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
  } = ctx.antd;
  const { Sider, Content } = Layout;
  const { Title, Text } = Typography;
const { Dragger } = Upload;

const FONT = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const GRID_COL_PROPS = { xs: 24, sm: 12, md: 8, lg: 6, xl: 4, xxl: 4 };
const CUSTOMER_COL_PROPS = { xs: 24, sm: 12, md: 8, lg: 6, xl: 6, xxl: 4 };

  // ============================================================
  // ⚙️  DASHBOARD CONFIG — Chỉnh tại đây để tái sử dụng cho module khác
  // ============================================================
  const DASHBOARD_CONFIG = {
    // ── Collection chính (document / folder sẽ lưu relation về đây) ──────────
    collection: "customers",           // tên collection chính (vd: "customers", "contracts")

    // ── Scope lọc folder & document ──────────────────────────────────────────
    moduleScope: "case_document",         // scope chính ghi vào DB
    moduleScopes: ["case_document", "case_documents", "customer"],  // danh sách scope được chấp nhận (filter $in)

    // ── API endpoints để fetch danh sách "parent" (Legal Reference / Customer…) ──
    parentListCandidates: [                    // thử lần lượt đến khi thành công
      "customers:list",
      "customer:list",
    ],
    parentCreateCandidates: [
      "customers:create",
      "customer:create",
    ],

    // ── Tên field relation trong document/folder trỏ về "parent" ─────────────
    // Thứ tự: field chính → các alias fallback (dùng khi thử tạo record)
    relationFieldCandidates: [
      "customerId",       // field chính (array/object)
      "customers",        // belongsTo relation field
      "customer",         // singular fallback
    ],

    // ── Hàm lấy ID của parent từ 1 record folder/document ───────────────────
    getParentIdFromRecord: (record) =>
      extractId(record?.customerId) ||
      extractRelationId(record?.customers) ||
      extractRelationId(record?.customer),

    // ── Hàm lấy ID của parent từ 1 record sidebar (Legal Reference / Customer) ─
    getParentListId: (record) =>
      extractId(record?.customerId) ||
      extractRelationId(record?.customers) ||
      extractRelationId(record?.customer) ||
      extractId(record?.customerRecord) ||
      extractId(record?.id),

    // ── Nhãn hiển thị trong UI ────────────────────────────────────────────────
    label: {
      sidebar: "Khách hàng",          // tiêu đề sidebar
      sidebarItem: "Khách hàng",      // tên 1 item trong sidebar
      createButton: "Tạo khách hàng mới",
      searchPlaceholder: "Tìm khách hàng...",
    },
  };

  // Shorthand constants (để không phải đổi code bên dưới)
  const INTERNAL_TEMPLATE_COLLECTION = DASHBOARD_CONFIG.collection;
  const INTERNAL_TEMPLATE_MODULE_SCOPE = DASHBOARD_CONFIG.moduleScope;
  const INTERNAL_TEMPLATE_MODULE_SCOPES = DASHBOARD_CONFIG.moduleScopes;
  const FILE_TYPE_SVG = {
    // ── Documents ──────────────────────────────────────────
    pdf: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fee2e2" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#fca5a5" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#ef4444" />
        <text x="24" y="34" textAnchor="middle" fill="#dc2626" fontSize="10" fontWeight="800" fontFamily="Arial,sans-serif">PDF</text>
      </svg>
    ),
    doc: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#dbeafe" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#bfdbfe" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#3b82f6" />
        <path d="M16 24h16M16 28h16M16 32h10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
        <text x="24" y="20" textAnchor="middle" fill="#1d4ed8" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">WORD</text>
      </svg>
    ),
    docx: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#dbeafe" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#bfdbfe" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#3b82f6" />
        <path d="M16 24h16M16 28h16M16 32h10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
        <text x="24" y="20" textAnchor="middle" fill="#1d4ed8" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">WORD</text>
      </svg>
    ),
    xls: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#d1fae5" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#a7f3d0" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#10b981" />
        <path d="M16 22h16v14H16z" stroke="#059669" strokeWidth="1.5" />
        <path d="M16 26h16M16 30h16M24 22v14" stroke="#059669" strokeWidth="1.5" />
        <text x="24" y="20" textAnchor="middle" fill="#065f46" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">EXCEL</text>
      </svg>
    ),
    xlsx: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#d1fae5" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#a7f3d0" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#10b981" />
        <path d="M16 22h16v14H16z" stroke="#059669" strokeWidth="1.5" />
        <path d="M16 26h16M16 30h16M24 22v14" stroke="#059669" strokeWidth="1.5" />
        <text x="24" y="20" textAnchor="middle" fill="#065f46" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">EXCEL</text>
      </svg>
    ),
    ppt: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#ffedd5" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#fed7aa" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#f97316" />
        <rect x="15" y="21" width="18" height="12" rx="1" stroke="#ea580c" strokeWidth="1.5" />
        <path d="M22 33v4M18 37h8" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
        <text x="24" y="20" textAnchor="middle" fill="#c2410c" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">PPT</text>
      </svg>
    ),
    pptx: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#ffedd5" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#fed7aa" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#f97316" />
        <rect x="15" y="21" width="18" height="12" rx="1" stroke="#ea580c" strokeWidth="1.5" />
        <path d="M22 33v4M18 37h8" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
        <text x="24" y="20" textAnchor="middle" fill="#c2410c" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">PPT</text>
      </svg>
    ),
    odt: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#dbeafe" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#bfdbfe" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#3b82f6" />
        <path d="M16 24h16M16 28h16M16 32h10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    // ── Images ─────────────────────────────────────────────
    png: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#f0fdf4" />
        <rect x="8" y="12" width="32" height="24" rx="3" fill="#bbf7d0" stroke="#4ade80" strokeWidth="1.5" />
        <circle cx="17" cy="20" r="3" fill="#fbbf24" />
        <path d="M8 30l8-7 6 6 5-4 11 9" fill="#4ade80" opacity=".7" />
        <text x="24" y="44" textAnchor="middle" fill="#15803d" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">PNG</text>
      </svg>
    ),
    jpg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#f0fdf4" />
        <rect x="8" y="12" width="32" height="24" rx="3" fill="#bbf7d0" stroke="#4ade80" strokeWidth="1.5" />
        <circle cx="17" cy="20" r="3" fill="#fbbf24" />
        <path d="M8 30l8-7 6 6 5-4 11 9" fill="#4ade80" opacity=".7" />
        <text x="24" y="44" textAnchor="middle" fill="#15803d" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">JPG</text>
      </svg>
    ),
    jpeg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#f0fdf4" />
        <rect x="8" y="12" width="32" height="24" rx="3" fill="#bbf7d0" stroke="#4ade80" strokeWidth="1.5" />
        <circle cx="17" cy="20" r="3" fill="#fbbf24" />
        <path d="M8 30l8-7 6 6 5-4 11 9" fill="#4ade80" opacity=".7" />
        <text x="24" y="44" textAnchor="middle" fill="#15803d" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">JPEG</text>
      </svg>
    ),
    gif: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fef9c3" />
        <rect x="8" y="12" width="32" height="24" rx="3" fill="#fef08a" stroke="#facc15" strokeWidth="1.5" />
        <path d="M18 24c0-3.3 2.7-6 6-6 1.7 0 3.2.7 4.2 1.8" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
        <path d="M30 28c0 3.3-2.7 6-6 6-1.7 0-3.2-.7-4.2-1.8" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
        <text x="24" y="44" textAnchor="middle" fill="#a16207" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">GIF</text>
      </svg>
    ),
    webp: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#f0fdf4" />
        <rect x="8" y="12" width="32" height="24" rx="3" fill="#bbf7d0" stroke="#4ade80" strokeWidth="1.5" />
        <circle cx="17" cy="20" r="3" fill="#fbbf24" />
        <path d="M8 30l8-7 6 6 5-4 11 9" fill="#4ade80" opacity=".7" />
        <text x="24" y="44" textAnchor="middle" fill="#15803d" fontSize="6" fontWeight="800" fontFamily="Arial,sans-serif">WEBP</text>
      </svg>
    ),
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fef9c3" />
        <circle cx="24" cy="24" r="10" stroke="#eab308" strokeWidth="2" />
        <path d="M18 24c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" />
        <text x="24" y="44" textAnchor="middle" fill="#a16207" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">SVG</text>
      </svg>
    ),
    // ── Video ───────────────────────────────────────────────
    mp4: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#ede9fe" />
        <rect x="6" y="13" width="36" height="22" rx="3" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1.5" />
        <polygon points="20,18 20,30 32,24" fill="#7c3aed" />
        <text x="24" y="44" textAnchor="middle" fill="#6d28d9" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">MP4</text>
      </svg>
    ),
    webm: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#ede9fe" />
        <rect x="6" y="13" width="36" height="22" rx="3" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1.5" />
        <polygon points="20,18 20,30 32,24" fill="#7c3aed" />
        <text x="24" y="44" textAnchor="middle" fill="#6d28d9" fontSize="6" fontWeight="800" fontFamily="Arial,sans-serif">WEBM</text>
      </svg>
    ),
    mov: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#ede9fe" />
        <rect x="6" y="13" width="36" height="22" rx="3" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1.5" />
        <polygon points="20,18 20,30 32,24" fill="#7c3aed" />
        <text x="24" y="44" textAnchor="middle" fill="#6d28d9" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">MOV</text>
      </svg>
    ),
    mkv: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#ede9fe" />
        <rect x="6" y="13" width="36" height="22" rx="3" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1.5" />
        <polygon points="20,18 20,30 32,24" fill="#7c3aed" />
        <text x="24" y="44" textAnchor="middle" fill="#6d28d9" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">MKV</text>
      </svg>
    ),
    // ── Audio ───────────────────────────────────────────────
    mp3: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fce7f3" />
        <circle cx="24" cy="26" r="7" fill="#fbcfe8" stroke="#ec4899" strokeWidth="1.5" />
        <circle cx="24" cy="26" r="2.5" fill="#ec4899" />
        <path d="M24 19V13l8-2v6" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="24" y="44" textAnchor="middle" fill="#be185d" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">MP3</text>
      </svg>
    ),
    wav: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fce7f3" />
        <path d="M8 24 Q12 16 16 24 Q20 32 24 24 Q28 16 32 24 Q36 32 40 24" stroke="#ec4899" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="24" y="44" textAnchor="middle" fill="#be185d" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">WAV</text>
      </svg>
    ),
    aac: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fce7f3" />
        <path d="M8 24 Q12 16 16 24 Q20 32 24 24 Q28 16 32 24 Q36 32 40 24" stroke="#ec4899" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="24" y="44" textAnchor="middle" fill="#be185d" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">AAC</text>
      </svg>
    ),
    m4a: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fce7f3" />
        <path d="M8 24 Q12 16 16 24 Q20 32 24 24 Q28 16 32 24 Q36 32 40 24" stroke="#ec4899" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="24" y="44" textAnchor="middle" fill="#be185d" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">M4A</text>
      </svg>
    ),
    flac: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fce7f3" />
        <path d="M8 24 Q12 16 16 24 Q20 32 24 24 Q28 16 32 24 Q36 32 40 24" stroke="#ec4899" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="24" y="44" textAnchor="middle" fill="#be185d" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">FLAC</text>
      </svg>
    ),
    // ── Text / Code ─────────────────────────────────────────
    txt: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#f9fafb" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#f3f4f6" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#9ca3af" />
        <path d="M16 22h16M16 26h16M16 30h12" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
        <text x="24" y="42" textAnchor="middle" fill="#374151" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">TXT</text>
      </svg>
    ),
    csv: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#ecfdf5" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#d1fae5" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#10b981" />
        <path d="M14 22h20v14H14z" stroke="#059669" strokeWidth="1.2" />
        <path d="M14 26h20M14 30h20M22 22v14" stroke="#059669" strokeWidth="1.2" />
        <text x="24" y="42" textAnchor="middle" fill="#065f46" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">CSV</text>
      </svg>
    ),
    json: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fefce8" />
        <path d="M18 14c-2 0-4 1-4 4v3c0 2-1 3-3 3 2 0 3 1 3 3v3c0 3 2 4 4 4" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" />
        <path d="M30 14c2 0 4 1 4 4v3c0 2 1 3 3 3-2 0-3 1-3 3v3c0 3-2 4-4 4" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" />
        <text x="24" y="44" textAnchor="middle" fill="#a16207" fontSize="6" fontWeight="800" fontFamily="Arial,sans-serif">JSON</text>
      </svg>
    ),
    xml: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fff7ed" />
        <path d="M16 20l-6 4 6 4M32 20l6 4-6 4M27 16l-6 16" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="24" y="44" textAnchor="middle" fill="#c2410c" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">XML</text>
      </svg>
    ),
    html: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fff7ed" />
        <path d="M16 20l-6 4 6 4M32 20l6 4-6 4M27 16l-6 16" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="24" y="44" textAnchor="middle" fill="#c2410c" fontSize="6" fontWeight="800" fontFamily="Arial,sans-serif">HTML</text>
      </svg>
    ),
    md: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#f8fafc" />
        <path d="M8 14h32v20H8z" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M13 29v-10l4 5 4-5v10M25 29v-10M25 29h6" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <text x="24" y="44" textAnchor="middle" fill="#334155" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">MD</text>
      </svg>
    ),
    // ── Code ────────────────────────────────────────────────
    js: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#fefce8" />
        <rect x="6" y="6" width="36" height="36" rx="4" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
        <text x="24" y="30" textAnchor="middle" fill="#713f12" fontSize="16" fontWeight="900" fontFamily="Arial,sans-serif">JS</text>
      </svg>
    ),
    ts: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#dbeafe" />
        <rect x="6" y="6" width="36" height="36" rx="4" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5" />
        <text x="24" y="30" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="900" fontFamily="Arial,sans-serif">TS</text>
      </svg>
    ),
    py: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#dbeafe" />
        <path d="M24 8c-7 0-10 3-10 7v4h10v2H10s-6 0-6 10 4 10 8 10h4v-5s0-5 8-5h8s8 1 8-8V18c0-7-6-10-16-10z" fill="#3b82f6" />
        <path d="M24 40c7 0 10-3 10-7v-4H24v-2h14s6 0 6-10-4-10-8-10h-4v5s0 5-8 5H16s-8-1-8 8v6c0 7 6 10 16 10z" fill="#fbbf24" />
        <circle cx="19" cy="14" r="2" fill="#fff" />
        <circle cx="29" cy="34" r="2" fill="#1d4ed8" />
      </svg>
    ),
    sql: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#ede9fe" />
        <ellipse cx="24" cy="16" rx="14" ry="5" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1.5" />
        <path d="M10 16v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8" stroke="#7c3aed" strokeWidth="1.5" />
        <path d="M10 24v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8" stroke="#7c3aed" strokeWidth="1.5" />
      </svg>
    ),
    // ── Archive ─────────────────────────────────────────────
    zip: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#f3f4f6" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#e5e7eb" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#9ca3af" />
        <path d="M22 10v4M26 10v4M22 14v4M26 14v4M22 18v4M26 18v4M22 22v2a2 2 0 0 0 4 0v-2" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
        <text x="24" y="42" textAnchor="middle" fill="#374151" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">ZIP</text>
      </svg>
    ),
    rar: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#f3f4f6" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#e5e7eb" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#9ca3af" />
        <path d="M22 10v4M26 10v4M22 14v4M26 14v4M22 18v4M26 18v4M22 22v2a2 2 0 0 0 4 0v-2" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
        <text x="24" y="42" textAnchor="middle" fill="#374151" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">RAR</text>
      </svg>
    ),
    // ── Default ─────────────────────────────────────────────
    default: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
        <rect width="48" height="48" rx="8" fill="#f3f4f6" />
        <path d="M12 8h18l8 8v26a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#e5e7eb" />
        <path d="M30 8l8 8h-6a2 2 0 0 1-2-2V8z" fill="#9ca3af" />
        <path d="M16 22h16M16 26h16M16 30h10" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  };

  const getFileSvgIcon = (ext) => {
    const key = String(ext || "").replace(".", "").toLowerCase();
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
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );

  const ChevronRight = (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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

  const ALLOWED_DOCUMENT_TYPE_VALUES = new Set(DEFAULT_DOCUMENT_TYPE_OPTIONS.map((option) => option.value));

  const extractId = (val) => (typeof val === "object" && val !== null ? val.id : val);
  const extractRelationId = (val) => (Array.isArray(val) ? extractId(val[0]) : extractId(val));
  const normalizeKey = (val) => String(val || "").trim().toLowerCase();
  const getCompanyName = (company) => company?.shortName || company?.name || company?.legalName || "Company";
  const getDocTitle = (doc) => doc?.name || doc?.title || doc?.templateName || getAttachment(doc)?.filename || "Untitled";
  const getDocCode = (doc) => doc?.documentCode || doc?.templateCode || "";
  const getDocDate = (doc) => doc?.updatedAt || doc?.createdAt;
  const getAttachment = (doc) => (Array.isArray(doc?.fileAttachment) ? doc.fileAttachment[0] : doc?.fileAttachment);
  const getInternalTemplateRelationId = (record) =>
    // Lấy ID parent từ record theo DASHBOARD_CONFIG.getParentIdFromRecord
    DASHBOARD_CONFIG.getParentIdFromRecord(record);
  const getCurrentUserId = () => extractId(ctx?.currentUser) || extractId(ctx?.user) || extractId(ctx?.state?.currentUser) || null;

  const getCurrentUser = () => {
    try {
      return ctx.currentUser || ctx.app?.currentUser || ctx.store?.getState()?.currentUser || null;
    } catch {
      return null;
    }
  };

  const getLinkedCustomerId = (record) =>
    extractId(record?.customerId) ||
    extractRelationId(record?.customers) ||
    extractRelationId(record?.customer) ||
    extractId(record?.customerRecord);

  const getUrlFilterId = () => {
    try {
      const href = String(window?.location?.href || "");
      const pathMatch = href.match(/filterbytk\/([^/?#]+)/i);
      if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
      const queryMatch = href.match(/[?&]filterByTk=([^&#]+)/i);
      if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]);
    } catch { }
    return null;
  };

  const getInitialCustomerContext = () => {
    const record =
      ctx?.record ||
      ctx?.popup?.record ||
      ctx?.data?.record ||
      ctx?.form?.values ||
      ctx?.action?.record ||
      null;
    const customerId =
      getLinkedCustomerId(record) ||
      extractId(record?.id) ||
      extractId(ctx?.recordId) ||
      extractId(ctx?.filterByTk) ||
      extractId(ctx?.params?.filterByTk) ||
      getUrlFilterId();
    return {
      customerId: customerId ? String(customerId) : null,
      record: record && extractId(record) ? record : null,
    };
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
    (extractId(record?.uploadedById) ? `User #${extractId(record.uploadedById)}` : "") ||
    (extractId(record?.createdById) ? `User #${extractId(record.createdById)}` : "—");

  const getDeletedUserName = (record) =>
    getUserDisplayName(record?.updatedBy) ||
    getUserDisplayName(record?.deletedBy) ||
    (extractId(record?.updatedById) ? `User #${extractId(record.updatedById)}` : "") ||
    (extractId(record?.deletedById) ? `User #${extractId(record.deletedById)}` : "—");

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

  const getFolderPermissions = (folder, user, allFolders, currentLawyerId) => {
    if (isAdminUser(user))
      return { isManager: true, isMember: true, canEdit: true };
    if (!folder) return { isManager: true, isMember: true, canEdit: true };
    if (!user) return { isManager: false, isMember: false, canEdit: false };

    const uid = extractId(user.id);
    const lwId = extractId(currentLawyerId);

    // Owner check (Nocobase user ID)
    if (extractId(folder.createdById) === uid) {
      return { isManager: true, isMember: true, canEdit: true };
    }

    const managers = getFolderManagerRows(folder);
    const members = getFolderMemberRows(folder);

    // Check explicit permissions using Lawyer ID
    if (lwId) {
      const isExplicitManager = managers.some(
        (m) => getPermissionLawyerId(m) === lwId,
      );
      if (isExplicitManager)
        return { isManager: true, isMember: true, canEdit: true };

      const explicitMember = members.find(
        (m) => getPermissionLawyerId(m) === lwId,
      );
      if (explicitMember) {
        const role = getPermissionRole(explicitMember);
        const canEdit = role === "editor";
        return { isManager: false, isMember: true, canEdit };
      }
    }

    // Inherit from parent
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

  const getVisibleFolderIds = (allFolders, currentUser, currentLawyerId) => {
    const accessible = new Set();
    const uid = extractId(currentUser?.id);
    const lwId = extractId(currentLawyerId);

    if (isAdminUser(currentUser)) {
      allFolders.forEach((f) => accessible.add(extractId(f.id)));
      return { accessible };
    }

    if (!uid) return { accessible };

    // 1. Find folders with direct access
    allFolders.forEach((f) => {
      const fId = extractId(f.id);
      // Owner check
      if (extractId(f.createdById) === uid) {
        accessible.add(fId);
        return;
      }
      // Manager/Member check via currentLawyerId
      if (lwId) {
        const managers = getFolderManagerRows(f);
        const members = getFolderMemberRows(f);
        if (
          managers.some((m) => getPermissionLawyerId(m) === lwId) ||
          members.some((m) => getPermissionLawyerId(m) === lwId)
        ) {
          accessible.add(fId);
          return;
        }
      }
    });

    // 2. Cascade down: include all descendants of accessible folders
    const getDescendantIdsRecursive = (pId, list) => {
      let ids = [];
      list.forEach((f) => {
        if (extractId(f.parentId) === pId) {
          const id = extractId(f.id);
          ids.push(id);
          ids = ids.concat(getDescendantIdsRecursive(id, list));
        }
      });
      return ids;
    };

    const directIds = Array.from(accessible);
    directIds.forEach((pId) => {
      const descIds = getDescendantIdsRecursive(pId, allFolders);
      descIds.forEach((id) => accessible.add(id));
    });

    return { accessible };
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

  const getFullUrl = (url) => (!url ? null : String(url).startsWith("http") ? url : `${window.location.origin}${url}`);
  const getRecordFileUrl = (record) => {
    const attachment = getAttachment(record);
    return getFullUrl(attachment?.url || attachment?.preview || record?.googleDriveUrl);
  };
  const getFileExtension = (record) => {
    const attachment = getAttachment(record);
    let ext = attachment?.extname || "";
    const rawName = attachment?.title || attachment?.filename || getDocTitle(record) || "";
    if (!ext && rawName.includes(".")) ext = rawName.split(".").pop();
    if (!ext) return "";
    return String(ext).startsWith(".") ? String(ext).toLowerCase() : `.${String(ext).toLowerCase()}`;
  };

  const getPreviewUrl = (record) => {
    const fullUrl = getRecordFileUrl(record);
    if (!fullUrl) return null;
    const ext = getFileExtension(record);
    const isOffice = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt"].includes(ext);
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
    const [primary, primaryId, singular, singularId] = DASHBOARD_CONFIG.relationFieldCandidates;
    const variants = [
      { [primary]: id },
      { [primary]: [{ id }] },
    ];
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
      decorateDocumentTypeOption(option)
    );
  };

  const FALLBACK_DOCUMENT_TYPES = [];

  const buildScopePayload = (internalCompanyId) => ({
    moduleScope: INTERNAL_TEMPLATE_MODULE_SCOPE,
    ...(internalCompanyId ? { internalCompanyId: extractId(internalCompanyId) } : {}),
  });

  const getFolderParentId = (folder) => extractId(folder?.parentId);
  const normalizeParentId = (parentId) => (parentId === "root" || !parentId ? null : extractId(parentId));

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
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm}`;
  };

  const sortByCreatedAt = (a, b) => {
    const at = new Date(a?.createdAt || 0).getTime() || 0;
    const bt = new Date(b?.createdAt || 0).getTime() || 0;
    if (at !== bt) return at - bt;
    return String(a?.name || a?.title || "").localeCompare(String(b?.name || b?.title || ""), "vi");
  };

  // ============================================================
  // §2 DATA FETCHING
  // ============================================================
  const fetchAllList = async (url, params = {}) => {
    let all = [];
    let page = 1;
    const pageSize = 200;
    while (true) {
      const res = await ctx.api.request({ url, params: { ...params, page, pageSize } });
      const data = res?.data?.data || [];
      all = all.concat(data);
      const meta = res?.data?.meta || {};
      if (!meta.count || all.length >= meta.count || data.length < pageSize) break;
      page++;
    }
    return all;
  };

  // Các URL candidates cho parent list/create được lấy từ DASHBOARD_CONFIG
  const CUSTOMER_RESOURCE_CANDIDATES = DASHBOARD_CONFIG.parentListCandidates;

const getCustomerDisplayName = (record) => {
  if (!record) return "";
  const code =
    record.customerCode ||
    record.code;
  const title =
    record.customerName ||
    record.name ||
      record.legalName ||
      record.shortName ||
      (record.id ? `Customer ${record.id}` : "Customer");
    return code && String(code) !== String(title) ? `${code} - ${title}` : title;
  };

  const getDocumentCustomerId = (doc) =>
    getRecordCustomerId(doc);

  const getRecordCustomerId = (record) =>
    extractId(record?.customerId) ||
    extractRelationId(record?.customers) ||
    extractRelationId(record?.customer) ||
    extractId(record?.customerRecord);

  const buildCustomerFilterCandidates = (customerId) => {
    const id = extractId(customerId);
    if (!id) {
      return [{
        moduleScope: { $in: DASHBOARD_CONFIG.moduleScopes }
      }];
    }
    return [
      { customerId: { $eq: id } },
      { customers: { id: { $eq: id } } },
      { customer: { id: { $eq: id } } },
    ];
  };

  const fetchListByCustomerCandidates = async (url, baseParams, customerId) => {
    const filters = buildCustomerFilterCandidates(customerId);
    let lastError = null;
    for (const filter of filters) {
      try {
        const rows = await fetchAllList(url, {
          ...baseParams,
          filter: JSON.stringify(filter),
        });
        if (rows.length || !customerId) return rows;
      } catch (e) {
        lastError = e;
      }
    }
    if (lastError) throw lastError;
    return [];
  };

  const fetchCustomerRecords = async (internalCompanyId = null, customerId = null) => {
    let lastError = null;
    for (const url of DASHBOARD_CONFIG.parentListCandidates) {
      try {
        let items;
        const params = {
          sort: ["-createdAt"],
          appends: ["internalCompany", "cases", "createdBy"],
        };
        if (customerId) {
          params.filter = JSON.stringify({ id: { $eq: customerId } });
        }
        items = await fetchAllList(url, params);
        return items.filter((item) =>
          matchesInternalCompany(item, internalCompanyId),
        );
      } catch (e) {
        lastError = e;
      }
    }
    console.warn("Failed to fetch customer parent records:", lastError);
    return [];
  };

  const createCustomerRecord = async (payload) => {
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
    throw lastError || new Error("Failed to create customer record");
  };

  const fetchFoldersForInternalTemplates = async (customerId = null) => {
    const params = {
      sort: ["createdAt"],
      appends: ["createdBy", "updatedBy", "customers", "folderManager", "folderManagers", "folderMember", "folderMembers"],
    };
    try {
      return await fetchListByCustomerCandidates("folders:list", params, customerId);
    } catch (e) {
      // Fallback without permission appends
      const fallbackParams = {
        sort: ["createdAt"],
        appends: ["createdBy", "updatedBy"],
      };
      return fetchListByCustomerCandidates("folders:list", fallbackParams, customerId).catch(() => []);
    }
  };

  const fetchDocumentsForInternalTemplates = async (customerId = null) => {
    const params = {
      sort: ["fileIndex", "-createdAt"],
      appends: ["fileAttachment", "internalCompany", "createdBy", "updatedBy", "customers"],
    };
    try {
      return await fetchListByCustomerCandidates("documents:list", params, customerId);
    } catch (e) {
      const { appends, ...fallbackParams } = params;
      return fetchListByCustomerCandidates("documents:list", {
        ...fallbackParams,
        appends: ["fileAttachment", "internalCompany", "createdBy", "updatedBy"],
      }, customerId).catch(() => []);
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

  const createDocumentRecord = async (payload) => requestCreateWithInternalTemplateRelation("documents:create", payload);

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
    if (!attachment?.id) throw new Error("Upload file thất bại");
    return attachment;
  };

  const createFolderRecord = async (payload) => {
    try {
      return await requestCreateWithInternalTemplateRelation("folders:create", payload);
    } catch (e) {
      if (!Object.prototype.hasOwnProperty.call(payload || {}, "documentType")) throw e;
      const { documentType, ...fallbackPayload } = payload;
      return requestCreateWithInternalTemplateRelation("folders:create", fallbackPayload);
    }
  };

  // ============================================================
  // §3 MAIN COMPONENT
  // ============================================================
  const PreviewModal = ({ doc, onClose }) => {
    if (!doc) return null;
    const attachment = getAttachment(doc);
    const fileUrl = attachment ? (attachment.url || attachment.preview) : (doc.googleDriveUrl || "");

    let fileExt = "";
    if (attachment) {
      fileExt = attachment.extname
        ? attachment.extname.startsWith(".")
          ? attachment.extname.toLowerCase()
          : "." + attachment.extname.toLowerCase()
        : "";
    }

    const rawName = attachment?.title || attachment?.filename || doc?.name || doc?.title || "File";
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
    const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"].includes(fileExt);
    const isVideo = [".mp4", ".webm", ".ogg", ".mov", ".mkv"].includes(fileExt);
    const isAudio = [".mp3", ".wav", ".ogg", ".aac", ".flac", ".m4a"].includes(fileExt);
    const isText = [".txt", ".csv", ".json", ".xml", ".md", ".log", ".yaml", ".yml", ".ini", ".env", ".js", ".ts", ".jsx", ".tsx", ".css", ".html", ".htm", ".py", ".java", ".c", ".cpp", ".h", ".sh", ".sql"].includes(fileExt);
    const isOffice = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt"].includes(fileExt);
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
            transformResponse: [data => data],
          });
          return res?.data || "";
        }
      };

      doFetch()
        .then((text) => { setTextContent(text); setTextLoading(false); })
        .catch(() => { setTextError(true); setTextLoading(false); });
    }, [fullUrl, isText]);

    // Syntax highlight color helper (very lightweight, no lib needed)
    const getMonoBackground = () => "#1e1e1e";

    const modalWidth = (isPdf || isHtml || isOffice || isExternalPreview || isVideo || isText) ? "85%" : 760;

    return (
      <Modal
        title={<div style={{ fontFamily: FONT, paddingRight: 28, wordBreak: "break-word" }}>{finalFileName}</div>}
        open={!!doc}
        onCancel={onClose}
        destroyOnClose
        centered
        width={modalWidth}
        bodyStyle={{ padding: 0, height: "78vh", background: "#f5f5f5", position: "relative", overflow: "hidden" }}
        footer={[
          fullUrl && (
            <Button key="download" type="primary" icon={DOWNLOAD_ICON} onClick={() => window.open(fullUrl, "_blank")}>
              Tải về
            </Button>
          ),
          <Button key="close" onClick={onClose}>Đóng</Button>,
        ].filter(Boolean)}
      >
        {/* Spinner nền */}
        {!isText && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 0 }}>
            <Spin tip="Đang tải bản xem trước..." />
          </div>
        )}

        {/* ── PDF / HTML / Google Drive ── */}
        {(isPdf || isHtml || isExternalPreview) && fullUrl && (
          <iframe
            src={fullUrl}
            title={finalFileName}
            style={{ width: "100%", height: "100%", border: "none", position: "relative", zIndex: 1, background: "#fff" }}
          />
        )}

        {/* ── IMAGE ── */}
        {isImage && fullUrl && (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
            <img src={fullUrl} alt={finalFileName} style={{ maxWidth: "100%", maxHeight: "100%", padding: 24, display: "block", objectFit: "contain" }} />
          </div>
        )}

        {/* ── OFFICE ── */}
        {isOffice && officeViewerUrl && (
          <iframe
            src={officeViewerUrl}
            title={finalFileName}
            style={{ width: "100%", height: "100%", border: "none", position: "relative", zIndex: 1, background: "#fff" }}
          />
        )}

        {/* ── VIDEO ── */}
        {isVideo && fullUrl && (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", position: "relative", zIndex: 1 }}>
            <video
              controls
              autoPlay={false}
              preload="none"
              style={{ maxWidth: "100%", maxHeight: "100%", outline: "none" }}
              src={fullUrl}
            >
              <source src={fullUrl} type={
                fileExt === ".mp4" ? "video/mp4" :
                  fileExt === ".webm" ? "video/webm" :
                    fileExt === ".ogg" ? "video/ogg" :
                      fileExt === ".mov" ? "video/quicktime" : "video/mp4"
              } />
              Trình duyệt của bạn không hỗ trợ phát video.
            </video>
          </div>
        )}

        {/* ── AUDIO ── */}
        {isAudio && fullUrl && (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", position: "relative", zIndex: 1, gap: 24 }}>
            <div style={{ fontSize: 64 }}>🎵</div>
            <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 16, color: "#111827", maxWidth: 400, textAlign: "center", wordBreak: "break-word" }}>
              {finalFileName}
            </div>
            <audio
              controls
              autoPlay={false}
              preload="none"
              style={{ width: "min(480px, 90%)", outline: "none" }}
              src={fullUrl}
            >
              <source src={fullUrl} type={
                fileExt === ".mp3" ? "audio/mpeg" :
                  fileExt === ".wav" ? "audio/wav" :
                    fileExt === ".ogg" ? "audio/ogg" :
                      fileExt === ".aac" ? "audio/aac" :
                        fileExt === ".flac" ? "audio/flac" :
                          fileExt === ".m4a" ? "audio/mp4" : "audio/mpeg"
              } />
              Trình duyệt của bạn không hỗ trợ phát audio.
            </audio>
          </div>
        )}

        {/* ── TEXT / CODE ── */}
        {isText && (
          <div style={{ width: "100%", height: "100%", position: "relative", zIndex: 1, display: "flex", flexDirection: "column" }}>
            {/* Toolbar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 16px", background: "#2d2d2d", borderBottom: "1px solid #444",
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#ccc" }}>
                {fileExt.replace(".", "").toUpperCase()} · {finalFileName}
              </span>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#888" }}>
                {textContent != null ? `${textContent.split("\n").length} dòng · ${textContent.length} ký tự` : ""}
              </span>
            </div>
            {/* Content */}
            <div style={{ flex: 1, overflow: "auto", background: getMonoBackground() }}>
              {textLoading && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#ccc" }}>
                  <Spin tip="Đang tải nội dung..." />
                </div>
              )}
              {textError && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
                  <Empty description={<span style={{ color: "#aaa" }}>Không thể tải nội dung file</span>} />
                  <Button icon={DOWNLOAD_ICON} onClick={() => window.open(fullUrl, "_blank")} style={{ borderColor: "#555", color: "#ccc", background: "transparent" }}>
                    Tải xuống để xem
                  </Button>
                </div>
              )}
              {textContent != null && !textLoading && (
                <pre style={{
                  margin: 0,
                  padding: "16px 20px",
                  fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "#d4d4d4",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  counterReset: "line",
                }}>
                  {textContent.split("\n").map((line, i) => (
                    <div key={i} style={{ display: "flex", gap: 0 }}>
                      <span style={{
                        userSelect: "none",
                        minWidth: 42,
                        paddingRight: 16,
                        textAlign: "right",
                        color: "#555",
                        fontSize: 12,
                        lineHeight: 1.7,
                        flexShrink: 0,
                      }}>
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
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", position: "relative", zIndex: 1 }}>
            <Empty description="Tài liệu chưa có file hoặc URL để xem trước" />
          </div>
        )}

        {/* ── UNSUPPORTED FORMAT ── */}
        {fullUrl && !isPdf && !isHtml && !isImage && !isOffice && !isExternalPreview && !isVideo && !isAudio && !isText && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", position: "relative", zIndex: 1, gap: 12 }}>
            <div style={{ fontSize: 48 }}>📎</div>
            <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 15, color: "#374151" }}>
              Không thể xem trước định dạng <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>{fileExt || "này"}</code>
            </div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>Tải xuống để mở bằng ứng dụng phù hợp</div>
            <Button type="primary" icon={DOWNLOAD_ICON} style={{ marginTop: 8 }} onClick={() => window.open(fullUrl, "_blank")}>
              Tải xuống để xem
            </Button>
          </div>
        )}
      </Modal>
    );
  };

  // ============================================================
  // Folder Permissions Modal
  // ============================================================
  const FolderPermissionsModal = ({ open, folder, onClose, onSuccess }) => {
    const [saving, setSaving] = useState(false);
    const [availableLawyers, setAvailableLawyers] = useState([]);
    const [shares, setShares] = useState([]);

    useEffect(() => {
      if (!open) {
        setShares([]);
        return;
      }
      if (!folder) return;

      const folderId = extractId(folder.id || folder);
      Promise.all([
        ctx.api.request({ url: "lawyers:list", params: { pageSize: 1000 } }).catch(() => ({ data: { data: [] } })),
        ctx.api.request({
          url: `folders/${folderId}/folderManager:list`,
          params: { pageSize: 1000 },
        }).catch(() => ({ data: { data: [] } })),
        ctx.api.request({
          url: "folderMembers:list",
          params: { pageSize: 1000, filter: JSON.stringify({ folderId: { $eq: folderId } }) },
        }).catch(() => ({ data: { data: [] } })),
      ]).then(([lwRes, mgRes, mbRes]) => {
        setAvailableLawyers(lwRes?.data?.data || []);
        const initialShares = [];
        const managerRows = mgRes?.data?.data || [];
        const memberRows = mbRes?.data?.data || [];
        managerRows.forEach((row) => {
          const lawyerId = getPermissionLawyerId(row);
          if (!lawyerId) return;
          initialShares.push({ id: String(lawyerId), role: "manager", lawyerData: getRelationLawyerRecord(row) });
        });
        memberRows.forEach((row) => {
          const lawyerId = getPermissionLawyerId(row);
          if (!lawyerId) return;
          initialShares.push({ id: String(lawyerId), role: getPermissionRole(row), lawyerData: getRelationLawyerRecord(row) });
        });
        setShares(initialShares);
      });
    }, [open, folder]);

    const handleSave = async () => {
      setSaving(true);
      try {
        const folderId = extractId(folder.id);
        const managers = shares.filter((s) => s.role === "manager");
        const members = shares.filter((s) => s.role !== "manager");

        await Promise.all([
          ctx.api.request({
            url: "folderManagers:destroy",
            method: "POST",
            params: { filter: JSON.stringify({ folderId: { $eq: folderId } }) },
          }).catch(() => { }),
          ctx.api.request({
            url: "folderMembers:destroy",
            method: "POST",
            params: { filter: JSON.stringify({ folderId: { $eq: folderId } }) },
          }).catch(() => { }),
        ]);

        const createPromises = [];
        managers.forEach((s) => {
          createPromises.push(
            ctx.api.request({ url: "folderManagers:create", method: "POST", data: { folderId, lawyerId: Number(s.id), role: "manager" } }),
          );
        });
        members.forEach((s) => {
          createPromises.push(
            ctx.api.request({ url: "folderMembers:create", method: "POST", data: { folderId, lawyerId: Number(s.id), role: s.role } }),
          );
        });

        await Promise.all(createPromises);
        message.success("Cập nhật phân quyền thành công");
        onSuccess();
      } catch (e) {
        message.error("Có lỗi xảy ra khi cập nhật phân quyền");
      }
      setSaving(false);
    };

    const handleAddLawyer = (lawyerId) => {
      if (!lawyerId) return;
      const safeLawyerId = String(extractId(lawyerId));
      if (!safeLawyerId || shares.some((s) => String(s.id) === safeLawyerId)) return;
      setShares([...shares, { id: safeLawyerId, role: "viewer" }]);
    };

    const handleChangeRole = (lawyerId, newRole) => {
      setShares(shares.map((s) => String(s.id) === String(lawyerId) ? { ...s, role: newRole } : s));
    };

    const handleRemoveShare = (lawyerId) => {
      setShares(shares.filter((s) => String(s.id) !== String(lawyerId)));
    };

    const lawyerOptions = availableLawyers
      .filter((l) => !shares.some((s) => String(s.id) === String(extractId(l.id))))
      .map((l) => ({ value: String(extractId(l.id)), label: getLawyerDisplayName(l) }));

    return (
      <Modal
        open={open}
        onCancel={onClose}
        title={<span style={{ fontFamily: FONT }}>Phân quyền thư mục: {folder?.name || ""}</span>}
        width={520}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={onClose} style={{ fontFamily: FONT }}>Hủy</Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSave} style={{ fontFamily: FONT }}>Lưu</Button>,
        ]}
      >
        <div style={{ marginBottom: 16, fontFamily: FONT }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Thêm người</div>
          <Select
            showSearch
            style={{ width: "100%" }}
            placeholder="Tìm và thêm người..."
            options={lawyerOptions}
            value={null}
            onChange={handleAddLawyer}
            filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
          />
        </div>
        <div style={{ fontFamily: FONT }}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>Những người có quyền truy cập</div>
          {shares.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa chia sẻ cho ai" />
          ) : (
            shares.map((s) => {
              const lw = availableLawyers.find((l) => String(extractId(l.id)) === String(s.id)) || s.lawyerData || {};
              const displayName = getLawyerDisplayName(lw.id ? lw : (s.lawyerData || s));
              const initials = displayName.charAt(0).toUpperCase();
              return (
                <div
                  key={s.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1890ff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 16 }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, lineHeight: 1.2 }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                        {s.role === "manager" ? "Quản lý" : s.role === "editor" ? "Người chỉnh sửa" : "Người xem"}
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
                        { value: "viewer", label: "Người xem" },
                        { value: "editor", label: "Người chỉnh sửa" },
                        { value: "manager", label: "Quản lý" },
                      ]}
                    />
                    <Button type="text" danger onClick={() => handleRemoveShare(s.id)} style={{ padding: "4px 8px" }}>✕</Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    );
  };

  const InternalTemplates = () => {
    const initialCustomerContext = useMemo(() => getInitialCustomerContext(), []);
    const isCustomerDetailMode = useMemo(() => {
      const colName = String(ctx.view?.collectionName || ctx.collectionName || ctx.collection?.name || "").toLowerCase();
      const record = initialCustomerContext.record || ctx.record || {};
      return (
        colName === "customers" ||
        colName === "customer" ||
        record?.customerCode !== undefined ||
        record?.customerName !== undefined ||
        record?.legalName !== undefined ||
        (!!initialCustomerContext.customerId && colName.includes("customer"))
      );
    }, [initialCustomerContext]);

    const getDbStorageType = useCallback((space) => space === "customer" ? "customer" : space, []);

    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [folders, setFolders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedExt, setSelectedExt] = useState(null);
    const [activeCompanyId, setActiveCompanyId] = useState(null);
    const [activeCustomerId, setActiveCustomerId] = useState(() => isCustomerDetailMode ? initialCustomerContext.customerId : null);
    const [activeSpace, setActiveSpace] = useState(isCustomerDetailMode ? "customer" : "company_shared"); // 'customer' | 'company_shared' | 'personal'
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

    const filteredCustomers = useMemo(() => {
      return customers.filter((record) =>
        matchesInternalCompany(record, activeCompanyId)
      );
    }, [customers, activeCompanyId]);

    const activeCustomer = useMemo(() => {
      if (!activeCustomerId) return null;
      return (
        customers.find((r) => String(extractId(r)) === String(activeCustomerId)) ||
        (isCustomerDetailMode && String(extractId(initialCustomerContext.record)) === String(activeCustomerId)
          ? initialCustomerContext.record
          : null)
      );
    }, [customers, activeCustomerId, isCustomerDetailMode, initialCustomerContext.record]);

    // Keep ref in sync with state (allows reading current value in effects without adding to deps)
    useEffect(() => {
      activeCustomerIdRef.current = activeCustomerId;
    }, [activeCustomerId]);

    const usedProjectIds = useMemo(() => {
      const ids = new Set();
      customers.forEach((ref) => {
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
    }, [customers]);

    const activeLinkedIds = useMemo(() => {
      const sourceRecord = linkCaseRecord || activeCustomer;
      if (!sourceRecord) return new Set();
      return new Set((sourceRecord.cases || []).map(item => String(extractId(item))));
    }, [activeCustomer, linkCaseRecord]);

    const activeCustomerIdValue = activeCustomerId || initialCustomerContext.customerId;
    const isCustomerRoot = activeSpace === "customer" && !activeCustomerIdValue;



    const [viewMode, setViewMode] = useState("grid");
    const [sortMode, setSortMode] = useState("manual");

    const [isFolderOpen, setIsFolderOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
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
    const activeCustomerIdRef = useRef(null);
    const [lawyers, setLawyers] = useState([]);
    const [permissionFolder, setPermissionFolder] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityPage, setActivityPage] = useState(1);
    const [activitySearchQuery, setActivitySearchQuery] = useState("");
    const [activityActionFilter, setActivityActionFilter] = useState("all");

    const folderInputRef = useRef(null);
    const [folderForm] = Form.useForm();
    const [uploadForm] = Form.useForm();
    const [uploadFileList, setUploadFileList] = useState([]);
    const [renameRecord, setRenameRecord] = useState(null);
    const [renameForm] = Form.useForm();

    // Context Menu State
    const [contextMenuState, setContextMenuState] = useState({ open: false, x: 0, y: 0, record: null });
    const closeContextMenu = () => setContextMenuState((prev) => ({ ...prev, open: false }));

    const [spacesExpanded, setSpacesExpanded] = useState(true);
    const [libraryExpanded, setLibraryExpanded] = useState(true);
    const [workspaceExpanded, setWorkspaceExpanded] = useState(true);

    const [showAllCompanies, setShowAllCompanies] = useState(false);
    const [showAllCustomers, setShowAllCustomers] = useState(false);
    const [showAllPersonalFolders, setShowAllPersonalFolders] = useState(false);

    const activeCompany = useMemo(
      () => companies.find((c) => String(extractId(c)) === String(activeCompanyId)) || null,
      [companies, activeCompanyId],
    );
    // Lấy danh sách các định dạng file có trong dữ liệu hiện tại để hiển thị tùy chọn lọc
    const fileExtOptions = useMemo(() => {
      const exts = new Set();
      documents.forEach(rec => {
        const ext = getFileExtension(rec);
        if (ext) exts.add(ext.toUpperCase().replace('.', ''));
      });
      return [
        { value: "all", label: "Tất cả" },
        ...Array.from(exts).map(ext => ({ value: ext.toLowerCase(), label: ext }))
      ];
    }, [documents]);
    const documentTypes = useMemo(() => {
      return DEFAULT_DOCUMENT_TYPE_OPTIONS.map(decorateDocumentTypeOption);
    }, []);

    const getRecordDocumentType = useCallback(
      (record) => {
        return String(record?.documentType || "");
      },
      [],
    );

    const loadData = useCallback(async () => {
      setLoading(true);
      try {
        // 1. Resolve current user (auth:check is most reliable)
        let resolvedUser = null;
        try {
          const authRes = await ctx.api.request({ url: "auth:check" });
          resolvedUser = authRes?.data?.data || authRes?.data || null;
        } catch { }
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
                params: { pageSize: 1000, fields: "id,lawyerName,email,userId,createdById" },
              });
              lawyer = (allLwRes?.data?.data || []).find((item) => {
                const linkedId = extractId(item.userId) || extractId(item.user);
                return linkedId === userId || extractId(item.createdById) === userId;
              });
            }
            resolvedLawyerId = lawyer ? extractId(lawyer.id) : null;
          } catch (e) {
            console.warn("loadData: could not resolve lawyerId", e);
          }
        }

        const customerIdParam = isCustomerDetailMode ? (activeCustomerId || initialCustomerContext.customerId) : null;
        const [fetchedCompanies, fetchedFolders, fetchedDocs, fetchedCustomers, fetchedProjects] = await Promise.all([
          fetchAllList("internalCompany:list", { sort: ["createdAt"] }).catch(() => []),
          fetchFoldersForInternalTemplates(customerIdParam),
          fetchDocumentsForInternalTemplates(customerIdParam),
          fetchCustomerRecords(null, customerIdParam),
          fetchAllList("projects:list", { fields: ["id", "caseCode", "projectName", "description"], sort: ["-createdAt"] }).catch(() => []),
        ]);

        setCompanies(fetchedCompanies);
        const isAllowedScope = (record) => {
          if (isCustomerDetailMode) return true;
          const scope = normalizeKey(record?.moduleScope);
          return !scope || DASHBOARD_CONFIG.moduleScopes.includes(scope);
        };
        setFolders(fetchedFolders.filter(isAllowedScope));
        setDocuments(fetchedDocs.filter(isAllowedScope));
        setCustomers(
          fetchedCustomers.length
            ? fetchedCustomers
            : (customerIdParam && initialCustomerContext.record ? [initialCustomerContext.record] : [])
        );
        setProjects(fetchedProjects);
        setActiveCompanyId((prev) => prev || (fetchedCompanies[0] ? String(extractId(fetchedCompanies[0])) : null));
        if (customerIdParam && !activeCustomerId) {
          setActiveCustomerId(String(customerIdParam));
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
        message.error("Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }, [activeCustomerId, initialCustomerContext.customerId, initialCustomerContext.record, isCustomerDetailMode]);

    const fetchActivityLogs = useCallback(async () => {
      setActivityLoading(true);
      try {
        const res = await ctx.api.request({
          url: "activity_log:list",
          params: {
            pageSize: 500,
            sort: ["-changedAt"],
            filter: JSON.stringify({
              collectionName: { $in: ["Document", "Folder"] }
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
            .map((f) => String(extractId(f.id)))
        );
        const companyDocIds = new Set(
          documents
            .filter((d) => matchesInternalCompany(d, activeCompanyId))
            .map((d) => String(extractId(d.id)))
        );

        const filtered = raw
          .filter((log) => !["fileIndex", "folderIndex", "deletedAt"].includes(log.fieldName))
          .map((log) => ({
            ...log,
            resolvedTitle: titleMap[log.recordId] || null,
          }))
          .filter((log) => {
            const rId = String(log.recordId);
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
    }, [folders, documents, activeCompanyId]);

    const resolveActivityActionInfo = useCallback((log) => {
      const { action, fieldName: field, newValue: newV } = log;

      if (action === "uploaded") {
        return {
          key: "uploaded",
          label: "Tải lên",
          color: "#0C447C",
          bg: "#E6F1FB",
          border: "#B5D4F4",
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )
        };
      }

      if (action === "previewed") {
        return {
          key: "previewed",
          label: "Xem trước",
          color: "#0C447C",
          bg: "#E6F1FB",
          border: "#B5D4F4",
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )
        };
      }

      if (action === "downloaded") {
        return {
          key: "downloaded",
          label: "Tải về",
          color: "#0C447C",
          bg: "#E6F1FB",
          border: "#B5D4F4",
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )
        };
      }

      if (action === "shared_file") {
        return {
          key: "shared_file",
          label: "Chia sẻ tài liệu",
          color: "#0891B2",
          bg: "#ECFEFF",
          border: "#A5F3FC",
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          )
        };
      }

      if (action === "unshared_file") {
        return {
          key: "unshared_file",
          label: "Hủy chia sẻ",
          color: "#9CA3AF",
          bg: "#F9FAFB",
          border: "#E5E7EB",
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          )
        };
      }

      if (action === "permission_updated") {
        return {
          key: "permission_updated",
          label: "Cập nhật phân quyền",
          color: "#B45309",
          bg: "#FFFBEB",
          border: "#FEF3C7",
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          )
        };
      }

      if (action === "created") {
        return {
          key: "created",
          label: "Tạo mới",
          color: "#0369A1",
          bg: "#F0F9FF",
          border: "#BAE6FD",
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )
        };
      }

      if (action === "moved") {
        return {
          key: "moved",
          label: "Di chuyển",
          color: "#B45309",
          bg: "#FFFBEB",
          border: "#FEF3C7",
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 9 2 12 5 15" />
              <polyline points="9 5 12 2 15 5" />
              <polyline points="15 19 12 22 9 19" />
              <polyline points="19 9 22 12 19 15" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="12" y1="2" x2="12" y2="22" />
            </svg>
          )
        };
      }

      if (action === "updated") {
        if (field === "isDeleted") {
          if (newV === true || newV === "true" || newV === 1) {
            return {
              key: "trash_deleted",
              label: "Xóa vào Thùng rác",
              color: "#B91C1C",
              bg: "#FEF2F2",
              border: "#FEE2E2",
              icon: (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              )
            };
          } else {
            return {
              key: "restored",
              label: "Khôi phục",
              color: "#15803D",
              bg: "#F0FDF4",
              border: "#DCFCE7",
              icon: (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              )
            };
          }
        }
        if (field === "folderId" || field === "parentId") {
          return {
            key: "moved",
            label: "Di chuyển",
            color: "#B45309",
            bg: "#FFFBEB",
            border: "#FEF3C7",
            icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="5 9 2 12 5 15" />
                <polyline points="9 5 12 2 15 5" />
                <polyline points="15 19 12 22 9 19" />
                <polyline points="19 9 22 12 19 15" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="12" y1="2" x2="12" y2="22" />
              </svg>
            )
          };
        }
        return {
          key: "updated",
          label: "Cập nhật",
          color: "#4D7C0F",
          bg: "#F7FEE7",
          border: "#ECFCCB",
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          )
        };
      }

      if (action === "deleted") {
        return {
          key: "deleted",
          label: "Xóa",
          color: "#451A03",
          bg: "#FFF7ED",
          border: "#FFEDD5",
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          )
        };
      }

      return {
        key: action,
        label: action,
        color: "#374151",
        bg: "#F3F4F6",
        border: "#E5E7EB",
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )
      };
    }, []);

    const resolveActivityDesc = useCallback((log, foldersList, docsList) => {
      const { action, fieldName: field, oldValue: oldV, newValue: newV, collectionName } = log;
      const isFolder = collectionName === "Folder";
      const entityName = isFolder ? "thư mục" : "tài liệu";

      const FIELD_LABELS = {
        internalTemplateId: "loại tài liệu",
        internalTemplate: "loại tài liệu",
        internalTemplates: "loại tài liệu",
        internalTemplatesId: "loại tài liệu",
        legalReferenceId: "khách hàng liên kết",
        legalReference: "khách hàng liên kết",
        customerId: "khách hàng liên kết",
        customer: "khách hàng liên kết",
        customers: "khách hàng liên kết",
        folderId: "thư mục",
        folder: "thư mục",
        parentId: "thư mục cha",
        internalCompanyId: "công ty nội bộ",
        internalCompany: "công ty nội bộ",
        name: "tên gọi",
        title: "tiêu đề",
        description: "mô tả",
        googleDriveUrl: "liên kết Google Drive",
        fileAttachment: "tập tin thô",
        fileIndex: "vị trí sắp xếp",
        documentType: "phân loại tài liệu",
        storageType: "không gian lưu trữ",
        status: "trạng thái",
        isDeleted: "trạng thái xóa",
        updatedAt: "thời gian cập nhật",
        createdAt: "thời gian tạo",
        documentCode: "mã tài liệu",
        openingDate: "ngày mở",
        senderName: "người gửi",
        recipientName: "người nhận",
        language: "ngôn ngữ",
        docFormat: "định dạng tài liệu",
        signedAt: "ngày ký",
        effectiveAt: "ngày có hiệu lực",
        note: "ghi chú",
        deteledAt: "ngày xoá",
      };

      const ACTION_LABELS = {
        uploaded: "tải lên",
        created: "tạo mới",
        updated: "cập nhật",
        moved: "di chuyển",
        deleted: "xóa",
        previewed: "xem trước",
        downloaded: "tải về",
        shared_file: "chia sẻ tài liệu",
        unshared_file: "hủy chia sẻ tài liệu",
        permission_updated: "cập nhật phân quyền",
      };

      if (action === "previewed") {
        return `Đã xem trước ${entityName}`;
      }

      if (action === "downloaded") {
        return `Đã tải về ${entityName}`;
      }

      if (action === "shared_file") {
        const sharedWith = newV || "";
        return sharedWith ? `Đã chia sẻ ${entityName} với ${sharedWith}` : `Đã chia sẻ ${entityName}`;
      }

      if (action === "unshared_file") {
        return `Đã hủy chia sẻ ${entityName}`;
      }

      if (action === "permission_updated") {
        return `Đã cập nhật phân quyền ${entityName}`;
      }

      if (action === "uploaded" || action === "created") {
        return isFolder ? "Đã tạo thư mục mới" : "Đã tải lên tài liệu mới";
      }

      if (action === "deleted") {
        return `Đã xóa ${entityName}`;
      }

      if (action === "moved") {
        const getFolderName = (id) => {
          if (!id || id === "root" || id === "0" || id === 0) return "Thư mục gốc";
          const f = foldersList.find(item => String(extractId(item.id)) === String(id));
          return f ? f.name : `Thư mục #${id}`;
        };
        if (oldV || newV) {
          const oldFolder = getFolderName(oldV);
          const newFolder = getFolderName(newV);
          return `Đã di chuyển ${entityName} từ "${oldFolder}" sang "${newFolder}"`;
        }
        return `Đã di chuyển ${entityName}`;
      }

      if (action === "updated") {
        if (field === "isDeleted") {
          if (newV === true || newV === "true" || newV === 1) {
            return `Đã di chuyển ${entityName} vào Thùng rác`;
          } else {
            return `Đã khôi phục ${entityName} từ Thùng rác`;
          }
        }
        if (field === "name" || field === "title") {
          if (oldV && newV) {
            return `Đã đổi tên ${entityName}: "${oldV}" → "${newV}"`;
          }
          return `Đã đổi tên ${entityName} thành "${newV}"`;
        }
        if (field === "folderId" || field === "parentId") {
          const getFolderName = (id) => {
            if (!id || id === "root" || id === "0" || id === 0) return "Thư mục gốc";
            const f = foldersList.find(item => String(extractId(item.id)) === String(id));
            return f ? f.name : `Thư mục #${id}`;
          };
          const oldFolder = getFolderName(oldV);
          const newFolder = getFolderName(newV);
          return `Đã di chuyển từ "${oldFolder}" sang "${newFolder}"`;
        }

        const fieldLabel = FIELD_LABELS[field] || field;
        return `Cập nhật ${fieldLabel} của ${entityName}`;
      }

      const actionLabel = ACTION_LABELS[action] || action;
      return `Thao tác [${actionLabel}] trên ${entityName}`;
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
          const userName = (log.changedByName || "Hệ thống").toLowerCase();
          const name = (log.resolvedTitle || log.recordTitle || log.newValue || log.oldValue || "").toLowerCase();
          const desc = resolveActivityDesc(log, folders, documents).toLowerCase();

          return userName.includes(q) || name.includes(q) || desc.includes(q);
        }

        return true;
      });
    }, [activityLogs, activityActionFilter, activitySearchQuery, folders, documents, resolveActivityActionInfo, resolveActivityDesc]);



    useEffect(() => {
      loadData();
    }, [loadData]);

    useEffect(() => {
      if (activeSpace === "recent") {
        fetchActivityLogs();
      }
    }, [activeSpace, activeCompanyId, fetchActivityLogs]);

    useEffect(() => {
      if (activeSpace === "customer") {
        if (isCustomerDetailMode) {
          const detailCustomerId = initialCustomerContext.customerId;
          if (detailCustomerId && String(activeCustomerIdRef.current || "") !== String(detailCustomerId)) {
            setActiveCustomerId(String(detailCustomerId));
          }
          return;
        }
        // Only reset if the currently selected customer is no longer in the filtered list
        const currentRefId = activeCustomerIdRef.current;
        if (currentRefId && !filteredCustomers.some((r) => String(extractId(r)) === String(currentRefId))) {
          setActiveCustomerId(null);
        }
        // Do NOT auto-select: let user explicitly choose a customer via sidebar or list click
      } else {
        if (!isCustomerDetailMode) {
          setActiveCustomerId(null);
        }
      }
    }, [activeCompanyId, filteredCustomers, activeSpace, isCustomerDetailMode, initialCustomerContext.customerId]);

    useEffect(() => {
      setSelectedRowKeys([]);
    }, [activeSpace, activeCompanyId, activeCustomerId, selectedFolderId]);

    const companyFolders = useMemo(
      () => folders.filter((folder) => matchesInternalCompany(folder, activeCompanyId)),
      [folders, activeCompanyId],
    );

    const companyDocs = useMemo(
      () => documents.filter((doc) => matchesInternalCompany(doc, activeCompanyId)),
      [documents, activeCompanyId],
    );

    const customerScopeFolders = useMemo(() => {
      if (!activeCustomerIdValue) return [];
      return folders.filter(
        (folder) =>
          String(getRecordCustomerId(folder) || "") === String(activeCustomerIdValue) &&
          folder.storageType !== "personal",
      );
    }, [folders, activeCustomerIdValue]);

    const customerScopeDocs = useMemo(() => {
      if (!activeCustomerIdValue) return [];
      return documents.filter(
        (doc) =>
          String(getRecordCustomerId(doc) || "") === String(activeCustomerIdValue) &&
          doc.storageType !== "personal",
      );
    }, [documents, activeCustomerIdValue]);

    const quickScopeFolders = useMemo(
      () =>
        isCustomerDetailMode && activeCustomerIdValue
          ? customerScopeFolders
          : companyFolders,
      [isCustomerDetailMode, activeCustomerIdValue, customerScopeFolders, companyFolders],
    );

    const quickScopeDocs = useMemo(
      () =>
        isCustomerDetailMode && activeCustomerIdValue
          ? customerScopeDocs
          : companyDocs,
      [isCustomerDetailMode, activeCustomerIdValue, customerScopeDocs, companyDocs],
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

      const activeDocs = companyDocs.filter((doc) => !doc.isDeleted);

      if (activeSpace === "company_shared") {
        return activeDocs.filter((doc) => {
          const isShared = doc.storageType === "company_shared" || (!doc.storageType && !getRecordDocumentType(doc) && !getInternalTemplateRelationId(doc) && !getRecordCustomerId(doc));
          return isShared && doc.storageType !== getDbStorageType("customer");
        });
      }
      if (activeSpace === "personal") {
        return documents.filter((doc) => {
          if (doc.isDeleted) return false;
          const isPersonal = doc.storageType === "personal";
          const isCreatedByMe = extractId(doc.createdById) === currentLawyerId || extractId(doc.uploadedById) === currentLawyerId;
          return isPersonal && isCreatedByMe;
        });
      }
      if (activeSpace === "customer") {
        const customerId = activeCustomerId || initialCustomerContext.customerId;
        const customerDocs = isCustomerDetailMode ? customerScopeDocs.filter((doc) => !doc.isDeleted) : activeDocs;
        return customerDocs.filter((doc) => {
          if (doc.storageType === "personal") return false;
          if (!customerId) return isCustomerDetailMode;
          if (isCustomerDetailMode) {
            return String(getRecordCustomerId(doc)) === String(customerId);
          }
          return String(getRecordCustomerId(doc)) === String(activeCustomerId);
        });
      }
      return activeDocs;
    }, [companyDocs, documents, activeSpace, activeCustomerId, currentLawyerId, isCustomerDetailMode, initialCustomerContext.customerId, quickScopeDocs, customerScopeDocs]);

    const visibleFolders = useMemo(() => {
      if (activeSpace === "trash") {
        return quickScopeFolders.filter((f) => f.isDeleted === true);
      }
      if (activeSpace === "recent") {
        return [];
      }

      const activeFolders = companyFolders.filter((f) => !f.isDeleted);

      if (activeSpace === "company_shared") {
        return activeFolders.filter((f) => {
          const isShared = f.storageType === "company_shared" || (!f.storageType && !getRecordDocumentType(f) && !getInternalTemplateRelationId(f) && !getRecordCustomerId(f));
          return isShared && f.storageType !== getDbStorageType("customer");
        });
      }
      if (activeSpace === "personal") {
        return folders.filter((f) => f.storageType === "personal" && !f.isDeleted);
      }
      if (activeSpace === "customer") {
        const customerId = activeCustomerId || initialCustomerContext.customerId;
        const customerFolders = isCustomerDetailMode ? customerScopeFolders.filter((f) => !f.isDeleted) : activeFolders;
        return customerFolders.filter((f) => {
          if (f.storageType === "personal") return false;
          if (!customerId) return isCustomerDetailMode;
          if (isCustomerDetailMode) {
            return String(getRecordCustomerId(f)) === String(customerId);
          }
          return String(getRecordCustomerId(f)) === String(activeCustomerId);
        });
      }
      return activeFolders;
    }, [companyFolders, folders, activeSpace, activeCustomerId, isCustomerDetailMode, initialCustomerContext.customerId, quickScopeFolders, customerScopeFolders]);


    // Permission-filtered: hide folders the current user has no access to
    const permissionFilteredFolders = useMemo(() => {
      const currentUser = currentUserState;
      if (!currentUser) return visibleFolders; // not yet loaded → show all (will re-filter after loadData)
      if (isAdminUser(currentUser)) return visibleFolders;
      const { accessible } = getVisibleFolderIds(visibleFolders, currentUser, currentLawyerId);
      return visibleFolders.filter((f) => accessible.has(extractId(f.id)));
    }, [visibleFolders, currentUserState, currentLawyerId]);

    // Permission-filtered docs: only show docs whose folder is accessible (or root-level docs)
    const permissionFilteredDocs = useMemo(() => {
      const currentUser = currentUserState;
      if (!currentUser) return visibleDocs;
      if (isAdminUser(currentUser)) return visibleDocs;
      const accessibleFolderIds = new Set(permissionFilteredFolders.map((f) => String(extractId(f.id))));
      return visibleDocs.filter((doc) => {
        const fId = String(extractId(doc.folderId) || "");
        // Root-level docs (no folder) are visible to all company members
        if (!fId) return true;
        return accessibleFolderIds.has(fId);
      });
    }, [visibleDocs, permissionFilteredFolders, currentUserState]);

    // Current folder permissions for the selected folder
    const currentFolderPerms = useMemo(() => {
      const currentUser = currentUserState;
      if (!currentUser) return { isManager: true, isMember: true, canEdit: true };
      if (selectedFolderId === "root") {
        if (activeSpace === "personal") {
          return { isManager: true, isMember: true, canEdit: true };
        }
        // At root: admin can do anything; others can view but can't create unless they're manager of some folder
        return isAdminUser(currentUser)
          ? { isManager: true, isMember: true, canEdit: true }
          : { isManager: isAdminUser(currentUser), isMember: true, canEdit: isAdminUser(currentUser) };
      }
      const folder = visibleFolders.find((f) => String(extractId(f.id)) === String(selectedFolderId));
      return getFolderPermissions(folder || null, currentUser, visibleFolders, currentLawyerId);
    }, [selectedFolderId, visibleFolders, currentUserState, currentLawyerId, activeSpace]);

    const folderMap = useMemo(() => {
      const map = new Map();
      permissionFilteredFolders.forEach((folder) => map.set(String(extractId(folder)), folder));
      return map;
    }, [permissionFilteredFolders]);

    const activeCustomerRootFolder = useMemo(() => {
      if (activeSpace !== "customer" || !activeCustomerIdValue) return null;
      const customerRecord = activeCustomer || initialCustomerContext.record || {};
      const customerNames = [
        customerRecord.customerName,
        customerRecord.name,
        customerRecord.legalName,
        getCustomerDisplayName(customerRecord),
      ].map(normalizeKey).filter(Boolean);
      if (customerNames.length === 0) return null;

      const customerFolders = permissionFilteredFolders.filter(
        (folder) => String(getRecordCustomerId(folder) || "") === String(activeCustomerIdValue),
      );
      const customerDocs = permissionFilteredDocs.filter(
        (doc) => String(getRecordCustomerId(doc) || "") === String(activeCustomerIdValue),
      );

      return customerFolders.find((folder) => {
        const folderId = String(extractId(folder));
        const parentId = getFolderParentId(folder);
        const isTopLevel = !parentId || parentId === "root" || !folderMap.has(String(parentId));
        if (!isTopLevel || !customerNames.includes(normalizeKey(folder.name))) return false;

        const hasChildFolder = customerFolders.some(
          (child) => String(getFolderParentId(child) || "") === folderId,
        );
        const hasChildDoc = customerDocs.some(
          (doc) => String(extractId(doc.folderId) || "") === folderId,
        );
        return hasChildFolder || hasChildDoc;
      }) || null;
    }, [activeSpace, activeCustomerIdValue, activeCustomer, initialCustomerContext.record, permissionFilteredFolders, permissionFilteredDocs, folderMap]);

    const activeCustomerRootFolderId = useMemo(
      () => extractId(activeCustomerRootFolder),
      [activeCustomerRootFolder],
    );

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
      if (activeSpace === "personal") {
        rootName = "My Workspace";
      } else if (activeSpace === "company_shared") {
        rootName = activeCompany ? getCompanyName(activeCompany) : "Thư mục chung";
      } else if (activeSpace === "customer") {
        const items = [
          ...(isCustomerDetailMode ? [] : [{ id: "customer_root", name: "Customer" }]),
          { id: "root", name: "Customer" },
        ];
        const selectedIsCustomerRoot =
          activeCustomerRootFolderId && String(selectedFolderId) === String(activeCustomerRootFolderId);
        if (selectedFolderId === "root" || selectedIsCustomerRoot) return items;
        const path = [];
        let current = folderMap.get(String(selectedFolderId));
        while (current) {
          const currentId = String(extractId(current));
          if (!activeCustomerRootFolderId || currentId !== String(activeCustomerRootFolderId)) {
            path.unshift({ id: currentId, name: current.name || "Folder" });
          }
          current = folderMap.get(String(getFolderParentId(current)));
        }
        return items.concat(path);
      } else if (activeSpace === "recent") {
        rootName = "Lịch sử hoạt động";
      } else if (activeSpace === "trash") {
        rootName = "Thùng rác";
      }

      const items = [{ id: "root", name: rootName }];
      if (selectedFolderId === "root") return items;
      const path = [];
      let current = folderMap.get(String(selectedFolderId));
      while (current) {
        path.unshift({ id: String(extractId(current)), name: current.name || "Folder" });
        current = folderMap.get(String(getFolderParentId(current)));
      }
      return items.concat(path);
    }, [folderMap, selectedFolderId, activeSpace, activeCompany, isCustomerDetailMode, activeCustomerRootFolderId]);

    const handleBreadcrumbClick = useCallback((item) => {
      if (item.id === "customer_root") {
        setActiveSpace("customer");
        setActiveCustomerId(null);
        setSelectedFolderId("root");
        return;
      }
      setSelectedFolderId(item.id);
    }, []);

    const sortDocs = useCallback(
      (items) => {
        const list = [...items];
        if (sortMode === "newest") return list.sort((a, b) => new Date(getDocDate(b) || 0) - new Date(getDocDate(a) || 0));
        if (sortMode === "oldest") return list.sort((a, b) => new Date(getDocDate(a) || 0) - new Date(getDocDate(b) || 0));
        if (sortMode === "name") return list.sort((a, b) => getDocTitle(a).localeCompare(getDocTitle(b), "vi"));
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
      const logicalRootFolderId =
        activeSpace === "customer" && activeCustomerRootFolderId ? String(activeCustomerRootFolderId) : null;
      const currentFolderKey =
        selectedFolderId === "root" || (logicalRootFolderId && String(selectedFolderId) === logicalRootFolderId)
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
          rows = rows.filter(r => {
            if (r._type === "folder") {
              return (r.name || "").toLowerCase().includes(q);
            } else {
              const title = getDocTitle(r);
              return `${title} ${r.description || ""} ${getDocCode(r)} ${getRecordDocumentType(r) || r.documentType || ""}`.toLowerCase().includes(q);
            }
          });
        }
        return rows.sort((a, b) => new Date(b.deletedAt || b.updatedAt || 0) - new Date(a.deletedAt || a.updatedAt || 0));
      }

      if (activeSpace === "customer" && !activeCustomerIdValue) {
        let rows = filteredCustomers;
        if (isSearching) {
          rows = rows.filter(r =>
            `${r.customerCode || ""} ${r.customerName || ""} ${r.name || ""} ${r.description || ""}`.toLowerCase().includes(q)
          );
        }
        return rows.map(r => ({
          ...r,
          _type: "customer_record",
          _key: `ref_${extractId(r)}`,
        }));
      }

      let folderRows = [];
      let docRows = [];

      if (isSearching) {
        const allowedFolderIds = currentFolderKey === "root"
          ? (logicalRootFolderId ? new Set(getDescendantIds(logicalRootFolderId)) : null)
          : new Set(getDescendantIds(selectedFolderId));
        folderRows = permissionFilteredFolders.filter((folder) => {
          const folderId = String(extractId(folder));
          if (logicalRootFolderId && folderId === logicalRootFolderId) return false;
          if (allowedFolderIds && !allowedFolderIds.has(folderId)) return false;
          return String(folder.name || "").toLowerCase().includes(q);
        });
        docRows = permissionFilteredDocs.filter((doc) => {
          const folderId = String(extractId(doc.folderId) || "");
          if (allowedFolderIds && !allowedFolderIds.has(folderId)) return false;
          const text = `${getDocTitle(doc)} ${doc.description || ""} ${getDocCode(doc)} ${getRecordDocumentType(doc) || doc.documentType || ""}`.toLowerCase();
          return text.includes(q);
        });
      } else {
        folderRows = permissionFilteredFolders.filter((folder) => {
          const parentId = getFolderParentId(folder);
          if (currentFolderKey === "root") {
            if (logicalRootFolderId) return String(parentId || "") === logicalRootFolderId;
            return !parentId || !folderMap.has(String(parentId));
          }
          return String(parentId || "") === currentFolderKey;
        });
        docRows = permissionFilteredDocs.filter((doc) => {
          const folderId = extractId(doc.folderId);
          if (currentFolderKey === "root") {
            if (logicalRootFolderId) return String(folderId || "") === logicalRootFolderId;
            return !folderId || !folderMap.has(String(folderId));
          }
          return String(folderId || "") === currentFolderKey;
        });
      }

      if (selectedExt && selectedExt !== "all") {
        docRows = docRows.filter((doc) => {
          const ext = getFileExtension(doc).replace('.', '').toLowerCase();
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
    }, [query, selectedFolderId, activeSpace, permissionFilteredFolders, permissionFilteredDocs, folderMap, getDescendantIds, sortDocs, getRecordDocumentType, selectedExt, activeCustomerIdValue, filteredCustomers, activeCustomerRootFolderId]);

    const companySharedCounts = useMemo(() => {
      const fCount = folders.filter((f) => {
        return !f.isDeleted && matchesInternalCompany(f, activeCompanyId) && (f.storageType === "company_shared" || (!f.storageType && !getRecordDocumentType(f) && !getInternalTemplateRelationId(f) && !getRecordCustomerId(f)));
      }).length;

      const dCount = documents.filter((doc) => {
        return !doc.isDeleted && matchesInternalCompany(doc, activeCompanyId) && (doc.storageType === "company_shared" || (!doc.storageType && !getRecordDocumentType(doc) && !getInternalTemplateRelationId(doc) && !getRecordCustomerId(doc)));
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
        const { accessible } = getVisibleFolderIds(folders, currentUser, currentLawyerId);
        return accessible.has(extractId(f.id));
      }).length;

      const dCount = documents.filter((doc) => {
        if (doc.isDeleted) return false;
        const isPersonal = doc.storageType === "personal";
        const isCreatedByMe = extractId(doc.createdById) === currentLawyerId || extractId(doc.uploadedById) === currentLawyerId;
        return isPersonal && isCreatedByMe;
      }).length;

      return { folders: fCount, files: dCount };
    }, [folders, documents, currentUserState, currentLawyerId]);

    const personalRootFolders = useMemo(() => {
      return folders.filter((f) => {
        if (f.isDeleted) return false;
        if (f.storageType !== "personal") return false;
        const pId = getFolderParentId(f);
        if (pId && pId !== "root") return false;
        const currentUser = currentUserState;
        if (!currentUser) return true;
        if (isAdminUser(currentUser)) return true;
        const { accessible } = getVisibleFolderIds(folders, currentUser, currentLawyerId);
        return accessible.has(extractId(f.id));
      });
    }, [folders, currentUserState, currentLawyerId]);

    const companyRootFolders = useMemo(() => {
      return folders.filter((f) => {
        if (f.isDeleted) return false;
        if (!matchesInternalCompany(f, activeCompanyId)) return false;
        const isShared = f.storageType === "company_shared" || (!f.storageType && !getRecordDocumentType(f) && !getInternalTemplateRelationId(f) && !getRecordCustomerId(f));
        if (!isShared) return false;
        const pId = getFolderParentId(f);
        if (pId && pId !== "root") return false;
        const currentUser = currentUserState;
        if (!currentUser) return true;
        if (isAdminUser(currentUser)) return true;
        const { accessible } = getVisibleFolderIds(folders, currentUser, currentLawyerId);
        return accessible.has(extractId(f.id));
      });
    }, [folders, activeCompanyId, currentUserState, currentLawyerId]);

    const customerRootFolders = useMemo(() => {
      const customerId = activeCustomerId || initialCustomerContext.customerId;
      const logicalRootFolderId = activeCustomerRootFolderId ? String(activeCustomerRootFolderId) : null;
      return folders.filter((f) => {
        if (f.isDeleted) return false;
        if (!customerId) return false;
        if (String(getRecordCustomerId(f)) !== String(customerId)) return false;
        const pId = getFolderParentId(f);
        const isRootChild = logicalRootFolderId
          ? String(pId || "") === logicalRootFolderId
          : !pId || pId === "root";
        if (!isRootChild) return false;
        const currentUser = currentUserState;
        if (!currentUser) return true;
        if (isAdminUser(currentUser)) return true;
        const { accessible } = getVisibleFolderIds(folders, currentUser, currentLawyerId);
        return accessible.has(extractId(f.id));
      });
    }, [folders, activeCustomerId, initialCustomerContext.customerId, currentUserState, currentLawyerId, activeCustomerRootFolderId]);

    const treeData = useMemo(() => {
      const build = (parentId) =>
        permissionFilteredFolders
          .filter((folder) => {
            const pId = getFolderParentId(folder);
            return parentId === "root" ? !pId || !folderMap.has(String(pId)) : String(pId || "") === String(parentId);
          })
          .sort(sortByCreatedAt)
          .map((folder) => ({
            title: folder.name || "Folder",
            value: String(extractId(folder)),
            key: String(extractId(folder)),
            children: build(extractId(folder)),
          }));

      let dynamicRootTitle = "Home";
      if (activeSpace === "personal") {
        dynamicRootTitle = "My Workspace";
      } else if (activeSpace === "company_shared") {
        dynamicRootTitle = activeCompany ? getCompanyName(activeCompany) : "Thư mục chung";
      } else if (activeSpace === "customer") {
        dynamicRootTitle = "Customer";
      }

      const buildRootId =
        activeSpace === "customer" && activeCustomerRootFolderId ? String(activeCustomerRootFolderId) : "root";
      return [{ title: dynamicRootTitle, value: "root", key: "root", children: build(buildRootId) }];
    }, [permissionFilteredFolders, folderMap, activeSpace, activeCompany, activeCustomerRootFolderId]);

    const moveTreeData = useMemo(() => {
      if (!moveRecord || moveRecord._type !== "folder") return treeData;
      const excluded = new Set(getDescendantIds(extractId(moveRecord)));
      excluded.add(String(extractId(moveRecord)));
      const filterNodes = (nodes) =>
        nodes
          .filter((node) => !excluded.has(String(node.value)))
          .map((node) => ({ ...node, children: filterNodes(node.children || []) }));
      return filterNodes(treeData);
    }, [moveRecord, treeData, getDescendantIds]);

    const requireCompany = () => {
      if (activeCompanyId) return true;
      message.warning("Vui lòng chọn công ty nội bộ trước");
      return false;
    };

    const getNextFileIndex = useCallback(
      async (folderId) => {
        const parentId = normalizeParentId(folderId);
        try {
          const filter = {
            moduleScope: { $in: DASHBOARD_CONFIG.moduleScopes },
            internalCompanyId: { $eq: extractId(activeCompanyId) },
            ...(parentId ? { folderId: { $eq: parentId } } : {}),
          };
          const res = await ctx.api.request({
            url: "documents:list",
            params: { pageSize: 2000, filter: JSON.stringify(filter), sort: ["-fileIndex", "-createdAt"] },
          });
          const sameFolderDocs = (res?.data?.data || []).filter((doc) => String(extractId(doc.folderId) || "") === String(parentId || ""));
          const maxIndex = sameFolderDocs.reduce((max, doc) => Math.max(max, Number(doc.fileIndex) || 0), 0);
          return maxIndex + 1;
        } catch (e) {
          return 1;
        }
      },
      [activeCompanyId],
    );

    const reindexFolderFiles = useCallback(
      async (folderId) => {
        const parentId = normalizeParentId(folderId);
        const items = documents
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
          items.map((doc, index) =>
            Number(doc.fileIndex) === index + 1
              ? null
              : ctx.api.request({
                url: `documents:update?filterByTk=${extractId(doc)}`,
                method: "POST",
                data: { fileIndex: index + 1 },
              }),
          ).filter(Boolean),
        );
      },
      [documents, activeCompanyId],
    );

    const handleCreateCustomer = async (values) => {
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
        const title = values.title?.trim();
        const payload = {
          customerName: title,
          name: title,
          title,
          description: values.description?.trim() || "",
          internalCompanyId: extractId(activeCompanyId),
          cases: mergedCaseIds,
          ...(values.sourceCaseId ? { sourceCaseId: Number(values.sourceCaseId) } : {}),
          ...(userId ? { createdById: userId, updatedById: userId } : {}),
        };
        await createCustomerRecord(payload);
        message.success("Tạo khách hàng liên kết thành công!");
        setIsCreateTemplateOpen(false);
        createTemplateForm.resetFields();
        loadData();
      } catch (e) {
        console.error(e);
        message.error("Tạo khách hàng liên kết thất bại");
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
          `customers:update?filterByTk=${rId}`,
          `customer:update?filterByTk=${rId}`
        ];
        let success = false;
        let lastError = null;
        for (const url of candidates) {
          try {
            await ctx.api.request({
              url,
              method: "POST",
              data: { customerName: newTitle, name: newTitle },
            });
            success = true;
            break;
          } catch (e) {
            lastError = e;
          }
        }
        if (!success) {
          throw lastError || new Error("Failed to update customer title");
        }
        message.success("Cập nhật khách hàng thành công!");
        setEditTemplateRecord(null);
        editTemplateForm.resetFields();
        loadData();
      } catch (e) {
        message.error("Cập nhật thất bại");
      } finally {
        setEditTemplateLoading(false);
      }
    };

    const openCustomerDetail = useCallback((recordOrId) => {
      const refId = String(extractId(recordOrId) || "");
      if (!refId) return;
      setActiveSpace("customer");
      setActiveCustomerId(refId);
      setSelectedFolderId("root");
    }, []);

    const openLinkCaseModal = useCallback((record) => {
      if (!record) return;
      const linkedIds = (record.cases || []).map(item => String(extractId(item)));
      setLinkCaseRecord(record);
      linkCaseForm.resetFields();
      linkCaseForm.setFieldsValue({ caseIds: linkedIds });
      setIsLinkCaseOpen(true);
    }, [linkCaseForm]);

    const handleLinkCaseSubmit = async (values) => {
      setLinkCaseLoading(true);
      try {
        const targetCustomerId = String(extractId(linkCaseRecord) || activeCustomerIdValue || "");
        if (!targetCustomerId) {
          message.warning("Vui lòng chọn khách hàng cần liên kết");
          return;
        }
        const payload = {
          cases: (values.caseIds || []).map(caseId => Number(caseId))
        };
        const candidates = [
          `customers:update?filterByTk=${targetCustomerId}`,
          `customer:update?filterByTk=${targetCustomerId}`
        ];
        let success = false;
        let lastError = null;
        for (const url of candidates) {
          try {
            await ctx.api.request({
              url,
              method: "POST",
              data: payload
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
        message.success("Cập nhật liên kết case thành công");
        setIsLinkCaseOpen(false);
        setLinkCaseRecord(null);
        linkCaseForm.resetFields();
        loadData();
      } catch (e) {
        console.error("Lỗi liên kết case:", e);
        message.error("Lỗi liên kết case");
      } finally {
        setLinkCaseLoading(false);
      }
    };

    const handleCreateFolder = async (values) => {
      if (activeSpace !== "personal" && !isCustomerDetailMode && !requireCompany()) return;
      setFolderLoading(true);
      try {
        const targetFolderId =
          activeSpace === "customer" && selectedFolderId === "root" && activeCustomerRootFolderId
            ? activeCustomerRootFolderId
            : selectedFolderId;
        const parentId = normalizeParentId(targetFolderId);
        const userId = getCurrentUserId();
        const nowIso = new Date().toISOString();
        const payload = {
          name: values.name.trim(),
          description: values.description?.trim() || "",
          type: "custom",
          createdAt: nowIso,
          updatedAt: nowIso,
          storageType: getDbStorageType(activeSpace),
          ...(parentId ? { parentId } : {}),
          ...(userId ? { createdById: userId, updatedById: userId } : {}),
        };

        if (activeSpace === "company_shared") {
          payload.internalCompanyId = extractId(activeCompanyId);
          payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
        } else if (activeSpace === "personal") {
          if (activeCompanyId) {
            payload.internalCompanyId = extractId(activeCompanyId);
          }
          payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
          if (isCustomerDetailMode) {
            payload.customerId = extractId(activeCustomerIdValue);
            payload.moduleScope = "case_document";
          }
        } else if (activeSpace === "customer") {
          payload.customerId = extractId(activeCustomerIdValue);
          payload.moduleScope = "case_document";
          if (activeCompanyId) {
            payload.internalCompanyId = extractId(activeCompanyId);
          }
        }

        await createFolderRecord(payload);
        message.success("Tạo thư mục thành công!");
        setIsFolderOpen(false);
        folderForm.resetFields();
        loadData();
      } catch (e) {
        message.error("Tạo thư mục thất bại");
      } finally {
        setFolderLoading(false);
      }
    };

    const handleUploadSubmit = async () => {
      if (activeSpace !== "personal" && !isCustomerDetailMode && !requireCompany()) return;
      try {
        await uploadForm.validateFields();
      } catch {
        return;
      }
      const values = uploadForm.getFieldsValue();
      const hasFile = uploadFileList.length > 0;
      const hasUrl = !!values.googleDriveUrl?.trim();
      if (!hasFile && !hasUrl) {
        message.error("Vui lòng chọn file hoặc nhập Google Drive URL");
        return;
      }

      setUploadLoading(true);
      try {
        const uploadTargetFolderId =
          activeSpace === "customer" && selectedFolderId === "root" && activeCustomerRootFolderId
            ? activeCustomerRootFolderId
            : selectedFolderId;
        const folderId = normalizeParentId(uploadTargetFolderId);
        const attachment = hasFile ? await uploadAttachment(uploadFileList[0].originFileObj) : null;
        const title = hasFile ? uploadFileList[0].name : "Google Drive Link";
        const userId = getCurrentUserId();
        const nowIso = new Date().toISOString();
        const payload = {
          name: title,
          title,
          documentCode: "",
          description: values.description?.trim() || "",
          googleDriveUrl: values.googleDriveUrl?.trim() || "",
          fileIndex: await getNextFileIndex(folderId),
          createdAt: nowIso,
          updatedAt: nowIso,
          uploadedAt: nowIso,
          uploaded_at: nowIso,
          storageType: getDbStorageType(activeSpace),
          ...(folderId ? { folderId } : {}),
          ...(attachment ? { fileAttachment: [{ id: attachment.id }] } : {}),
          ...(userId ? { uploadedById: userId, createdById: userId, updatedById: userId } : {}),
        };

        if (activeSpace === "company_shared") {
          payload.internalCompanyId = extractId(activeCompanyId);
          payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
        } else if (activeSpace === "personal") {
          if (activeCompanyId) {
            payload.internalCompanyId = extractId(activeCompanyId);
          }
          payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
          if (isCustomerDetailMode) {
            payload.customerId = extractId(activeCustomerIdValue);
            payload.moduleScope = "case_document";
          }
        } else if (activeSpace === "customer") {
          payload.customerId = extractId(activeCustomerIdValue);
          payload.moduleScope = "case_document";
          if (activeCompanyId) {
            payload.internalCompanyId = extractId(activeCompanyId);
          }
        }

        await createDocumentRecord(payload);
        message.success("Upload thành công!");
        setIsUploadOpen(false);
        setUploadFileList([]);
        uploadForm.resetFields();
        loadData();
      } catch (e) {
        message.error("Upload thất bại");
      } finally {
        setUploadLoading(false);
      }
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
      if (activeSpace !== "personal" && !isCustomerDetailMode && !requireCompany()) return;
      setBulkUploading(true);
      setBulkProgress("Đang phân tích cấu trúc thư mục...");
      setBulkPercent(5);
      try {
        const effectiveBulkTargetId =
          activeSpace === "customer" && bulkTargetId === "root" && activeCustomerRootFolderId
            ? activeCustomerRootFolderId
            : bulkTargetId;
        const rootParentId = normalizeParentId(effectiveBulkTargetId);
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

        const sortedPaths = Array.from(folderPaths).sort((a, b) => a.split("/").length - b.split("/").length);
        const userId = getCurrentUserId();
        setBulkProgress(`Đang tạo ${sortedPaths.length} thư mục...`);

        const nowIso = new Date().toISOString();
        for (let folderIndex = 0; folderIndex < sortedPaths.length; folderIndex++) {
          const path = sortedPaths[folderIndex];
          setBulkPercent(5 + Math.round(((folderIndex + 1) / Math.max(sortedPaths.length, 1)) * 25));
          const parts = path.split("/");
          const folderName = parts.pop();
          const parentPath = parts.join("/");
          const parentId = folderIdMap[parentPath] || null;

          const folderPayload = {
            name: folderName,
            type: "custom",
            createdAt: nowIso,
            updatedAt: nowIso,
            storageType: getDbStorageType(activeSpace),
            ...(parentId ? { parentId } : {}),
            ...(userId ? { createdById: userId, updatedById: userId } : {}),
          };

          if (activeSpace === "company_shared") {
            folderPayload.internalCompanyId = extractId(activeCompanyId);
            folderPayload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
          } else if (activeSpace === "personal") {
            if (activeCompanyId) {
              folderPayload.internalCompanyId = extractId(activeCompanyId);
            }
            folderPayload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
            if (isCustomerDetailMode) {
              folderPayload.customerId = extractId(activeCustomerIdValue);
              folderPayload.moduleScope = "case_document";
            }
          } else if (activeSpace === "customer") {
            folderPayload.customerId = extractId(activeCustomerIdValue);
            folderPayload.moduleScope = "case_document";
            if (activeCompanyId) {
              folderPayload.internalCompanyId = extractId(activeCompanyId);
            }
          } else {
            Object.assign(folderPayload, {
              ...buildScopePayload(activeCompanyId),
            });
          }

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
          setBulkProgress(`Đang tải file ${index + 1}/${pendingFolderFiles.length}...`);
          setBulkPercent(30 + Math.round(((index + 1) / Math.max(pendingFolderFiles.length, 1)) * 65));
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
            storageType: getDbStorageType(activeSpace),
            ...(targetFolderId ? { folderId: targetFolderId } : {}),
            ...(userId ? { uploadedById: userId, createdById: userId, updatedById: userId } : {}),
          };

          if (activeSpace === "company_shared") {
            filePayload.internalCompanyId = extractId(activeCompanyId);
            filePayload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
          } else if (activeSpace === "personal") {
            if (activeCompanyId) {
              filePayload.internalCompanyId = extractId(activeCompanyId);
            }
            filePayload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
            if (isCustomerDetailMode) {
              filePayload.customerId = extractId(activeCustomerIdValue);
              filePayload.moduleScope = "case_document";
            }
          } else if (activeSpace === "customer") {
            filePayload.customerId = extractId(activeCustomerIdValue);
            filePayload.moduleScope = "case_document";
            if (activeCompanyId) {
              filePayload.internalCompanyId = extractId(activeCompanyId);
            }
          } else {
            Object.assign(filePayload, {
              ...buildScopePayload(activeCompanyId),
            });
          }

          await createDocumentRecord(filePayload);
        }

        message.success("Upload thư mục hoàn tất!");
        setBulkPercent(100);
        setBulkConfirmOpen(false);
        setPendingFolderFiles([]);
        loadData();
      } catch (e) {
        message.error("Upload thư mục thất bại");
      } finally {
        setBulkUploading(false);
        setBulkProgress("");
        setBulkPercent(0);
      }
    };

    const handleMoveRecord = async (record, targetFolderId) => {
      if (!record) return;
      const effectiveTargetFolderId =
        activeSpace === "customer" && targetFolderId === "root" && activeCustomerRootFolderId
          ? activeCustomerRootFolderId
          : targetFolderId;
      const targetId = normalizeParentId(effectiveTargetFolderId);
      try {
        if (record._type === "folder") {
          const folderId = String(extractId(record));
          if (targetId && String(targetId) === folderId) {
            message.warning("Không thể di chuyển thư mục vào chính nó");
            return;
          }
          if (targetId && getDescendantIds(folderId).includes(String(targetId))) {
            message.warning("Không thể di chuyển thư mục vào thư mục con của nó");
            return;
          }
          await ctx.api.request({
            url: `folders:update?filterByTk=${extractId(record)}`,
            method: "POST",
            data: { parentId: targetId },
          });
          message.success("Đã di chuyển thư mục");
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
          await Promise.all([reindexFolderFiles(oldFolderId), reindexFolderFiles(targetId)]);
          message.success("Đã di chuyển tài liệu");
        }
        setMoveRecord(null);
        loadData();
      } catch (e) {
        message.error("Di chuyển thất bại");
      }
    };

    const handleBulkRestore = async () => {
      if (selectedRowKeys.length === 0) return;
      Modal.confirm({
        title: `Khôi phục ${selectedRowKeys.length} mục đã chọn?`,
        content: "Các thư mục và tài liệu sẽ được đưa trở lại không gian ban đầu.",
        okText: "Khôi phục",
        cancelText: "Hủy",
        onOk: async () => {
          try {
            await Promise.all(selectedRowKeys.map(async (key) => {
              const isFolder = key.startsWith("folder_");
              const rId = Number(key.replace("folder_", "").replace("file_", ""));
              const url = isFolder ? `folders:update?filterByTk=${rId}` : `documents:update?filterByTk=${rId}`;
              await ctx.api.request({
                url,
                method: "POST",
                data: { isDeleted: false, deletedAt: null },
              });
            }));
            message.success(`Đã khôi phục ${selectedRowKeys.length} mục thành công!`);
            setSelectedRowKeys([]);
            loadData();
          } catch (e) {
            message.error("Khôi phục thất bại");
          }
        }
      });
    };

    const handleBulkPermanentDelete = async () => {
      if (selectedRowKeys.length === 0) return;
      Modal.confirm({
        title: `Xóa ${selectedRowKeys.length} mục đã chọn?`,
        content: "Hành động này không thể hoàn tác. Các tệp và thư mục sẽ bị xóa khỏi hệ thống.",
        okText: "Xóa",
        okType: "danger",
        cancelText: "Hủy",
        onOk: async () => {
          try {
            await Promise.all(selectedRowKeys.map(async (key) => {
              const isFolder = key.startsWith("folder_");
              const rId = Number(key.replace("folder_", "").replace("file_", ""));
              const url = isFolder ? `folders:destroy?filterByTk=${rId}` : `documents:destroy?filterByTk=${rId}`;
              await ctx.api.request({
                url,
                method: "POST",
              });
            }));
            message.success(`Đã xóa ${selectedRowKeys.length} mục thành công!`);
            setSelectedRowKeys([]);
            loadData();
          } catch (e) {
            message.error("Xóa thất bại");
          }
        }
      });
    };

    const handleBulkDelete = async () => {
      if (selectedRowKeys.length === 0) return;
      Modal.confirm({
        title: `Xóa ${selectedRowKeys.length} mục đã chọn?`,
        content: "Các mục bị xóa sẽ được chuyển vào Thùng rác.",
        okText: "Xóa",
        okType: "danger",
        cancelText: "Hủy",
        onOk: async () => {
          try {
            const nowIso = new Date().toISOString();
            await Promise.all(selectedRowKeys.map(async (key) => {
              const isFolder = key.startsWith("folder_");
              const rId = Number(key.replace("folder_", "").replace("file_", ""));
              const url = isFolder ? `folders:update?filterByTk=${rId}` : `documents:update?filterByTk=${rId}`;
              await ctx.api.request({
                url,
                method: "POST",
                data: { isDeleted: true, deletedAt: nowIso },
              });
            }));
            message.success(`Đã di chuyển ${selectedRowKeys.length} mục vào Thùng rác!`);
            setSelectedRowKeys([]);
            loadData();
          } catch (e) {
            message.error("Xóa thất bại");
          }
        }
      });
    };

    const handleBulkMove = () => {
      if (selectedRowKeys.length === 0) return;
      setBulkMoveTargetId("root");
      setIsBulkMoveOpen(true);
    };

    const handleBulkMoveSubmit = async () => {
      try {
        const effectiveBulkMoveTargetId =
          activeSpace === "customer" && bulkMoveTargetId === "root" && activeCustomerRootFolderId
            ? activeCustomerRootFolderId
            : bulkMoveTargetId;
        const targetId = normalizeParentId(effectiveBulkMoveTargetId);
        await Promise.all(selectedRowKeys.map(async (key) => {
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
            const doc = documents.find(d => String(extractId(d)) === String(rId));
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
        }));
        if (targetId) {
          await reindexFolderFiles(targetId);
        }
        message.success(`Đã di chuyển ${selectedRowKeys.length} mục thành công!`);
        setIsBulkMoveOpen(false);
        setSelectedRowKeys([]);
        loadData();
      } catch (e) {
        message.error("Di chuyển thất bại");
      }
    };

    const reorderFileAroundTarget = async (sourceId, targetRecord, position) => {
      if (!targetRecord || targetRecord._type !== "file") return false;
      const sourceDoc = documents.find((doc) => String(extractId(doc)) === String(sourceId));
      if (!sourceDoc) return false;
      const targetFolderId = normalizeParentId(targetRecord.folderId);
      const oldFolderId = normalizeParentId(sourceDoc.folderId);
      const siblings = documents
        .filter(
          (doc) =>
            matchesInternalCompany(doc, activeCompanyId) &&
            String(extractId(doc.folderId) || "") === String(targetFolderId || ""),
        )
        .sort((a, b) => {
          const ai = Number(a.fileIndex) || 0;
          const bi = Number(b.fileIndex) || 0;
          if (ai !== bi) return ai - bi;
          return sortByCreatedAt(a, b);
        })
        .filter((doc) => String(extractId(doc)) !== String(sourceId));
      const targetIndex = siblings.findIndex((doc) => String(extractId(doc)) === String(extractId(targetRecord)));
      const insertIndex = position === "top" ? targetIndex : targetIndex + 1;
      siblings.splice(Math.max(0, insertIndex), 0, { ...sourceDoc, folderId: targetFolderId });
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
              String(extractId(doc.folderId) || "") === String(oldFolderId || "") &&
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
      message.success("Đã sắp xếp tài liệu");
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
      if (!payload || String(payload.id) === String(extractId(targetRecord))) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const position = y < rect.height * 0.25 ? "top" : y > rect.height * 0.75 ? "bottom" : "inside";

      if (position === "inside" && targetRecord._type === "folder") {
        const source = payload.type === "folder"
          ? folders.find((folder) => String(extractId(folder)) === String(payload.id))
          : documents.find((doc) => String(extractId(doc)) === String(payload.id));
        if (source) await handleMoveRecord({ ...source, _type: payload.type }, extractId(targetRecord));
        return;
      }

      if (payload.type === "file" && (position === "top" || position === "bottom")) {
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
      const source = payload.type === "folder"
        ? folders.find((folder) => String(extractId(folder)) === String(payload.id))
        : documents.find((doc) => String(extractId(doc)) === String(payload.id));
      if (!source) return;
      await handleMoveRecord({ ...source, _type: payload.type }, selectedFolderId);
    };

    const getTypeConfig = useCallback(
      (value) =>
        documentTypes.find((type) => type.id === String(value || "")) ||
        decorateDocumentTypeOption({ value: value || "document", label: value || "Document" }),
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
        <span style={{ display: "inline-flex", alignItems: "center" }}>{type.svgIcon}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{type.label}</span>
      </Tag>
    );

    const startEditTitle = (record) => {
      setEditingTitleId(String(extractId(record)));
      if (record._type === "folder") {
        setEditingTitleValue(record.name || "Folder");
      } else {
        const attachment = getAttachment(record);
        setEditingTitleValue(attachment?.title || attachment?.filename || getDocTitle(record));
      }
    };

    const cancelEditTitle = () => {
      setEditingTitleId(null);
      setEditingTitleValue("");
    };

    const handleSaveFileTitle = async (record) => {
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
          message.success("Đã cập nhật tên thư mục");
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
              .catch(() => { });
          }
          message.success("Đã cập nhật tên tài liệu và file");
        }
        cancelEditTitle();
        loadData();
      } catch (e) {
        message.error(record._type === "folder" ? "Cập nhật tên thư mục thất bại" : "Cập nhật tên tài liệu thất bại");
      }
    };

    const showDeleteConfirm = (folder) => {
      const fId = extractId(folder);
      const folderIdsToDelete = getDescendantIds(fId);
      // Include the folder itself
      folderIdsToDelete.push(String(fId));
      const filesCount = documents.filter((d) => folderIdsToDelete.includes(String(extractId(d.folderId) || ""))).length;
      const subFoldersCount = folderIdsToDelete.length - 1;

      let contentElements = [];
      if (subFoldersCount > 0) contentElements.push(`- ${subFoldersCount} thư mục con`);
      if (filesCount > 0) contentElements.push(`- ${filesCount} tệp tin`);

      Modal.confirm({
        title: `Xác nhận xóa thư mục "${folder.name}"?`,
        icon: React.createElement("span", { style: { color: "#faad14", marginRight: 16 } }, WarningIcon),
        content: (
          <div style={{ fontFamily: FONT, marginTop: 8 }}>
            <p>Bạn sắp xóa thư mục này. Các dữ liệu sau cũng sẽ bị xóa theo:</p>
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
              <p style={{ color: "#8c8c8c", fontStyle: "italic" }}>(Thư mục đang trống)</p>
            )}
            <p>Bạn có chắc chắn muốn xóa?</p>
          </div>
        ),
        okText: "Xóa",
        okType: "danger",
        cancelText: "Hủy",
        onOk: async () => {
          try {
            if (folderIdsToDelete.length > 0) {
              await ctx.api.request({
                url: "documents:update",
                method: "POST",
                params: { filter: JSON.stringify({ folderId: { $in: folderIdsToDelete.map(id => Number(id)) } }) },
                data: { isDeleted: true, deletedAt: new Date().toISOString() }
              }).catch(() => { });
              await ctx.api.request({
                url: "folders:update",
                method: "POST",
                params: { filter: JSON.stringify({ id: { $in: folderIdsToDelete.map(id => Number(id)) } }) },
                data: { isDeleted: true, deletedAt: new Date().toISOString() }
              }).catch(() => { });
            }
            message.success("Đã xóa thư mục và dữ liệu bên trong");
            if (selectedFolderId !== "root" && folderIdsToDelete.includes(String(selectedFolderId))) {
              setSelectedFolderId("root");
            }
            loadData();
          } catch (e) {
            message.error("Xóa thất bại");
          }
        },
      });
    };

    const handleDeleteFile = (record) => {
      Modal.confirm({
        title: "Xóa file này?",
        icon: React.createElement("span", { style: { color: "#faad14", marginRight: 16 } }, WarningIcon),
        content: "Hành động này sẽ xóa file khỏi hệ thống.",
        okText: "Xóa",
        okType: "danger",
        cancelText: "Hủy",
        onOk: async () => {
          try {
            await ctx.api.request({
              url: `documents:update?filterByTk=${extractId(record)}`,
              method: "POST",
              data: { isDeleted: true, deletedAt: new Date().toISOString() }
            });
            message.success("Đã xóa file");
            loadData();
          } catch {
            message.error("Xóa thất bại");
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
            data: { isDeleted: false, deletedAt: null }
          });
        } else {
          await ctx.api.request({
            url: `documents:update?filterByTk=${extractId(record)}`,
            method: "POST",
            data: { isDeleted: false, deletedAt: null }
          });
        }
        message.success("Đã khôi phục thành công");
        loadData();
      } catch (e) {
        message.error("Khôi phục thất bại");
      }
    };

    const handlePermanentDelete = (record) => {
      Modal.confirm({
        title: record._type === "folder" ? "Xóa thư mục này?" : "Xóa file này?",
        icon: React.createElement("span", { style: { color: "#ff4d4f", marginRight: 16 } }, WarningIcon),
        content: "Cảnh báo: Hành động này không thể hoàn tác, dữ liệu sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.",
        okText: "Xóa",
        okType: "danger",
        cancelText: "Hủy",
        onOk: async () => {
          try {
            if (record._type === "folder") {
              await ctx.api.request({
                url: `folders:destroy?filterByTk=${extractId(record)}`,
                method: "POST"
              });
            } else {
              await ctx.api.request({
                url: `documents:destroy?filterByTk=${extractId(record)}`,
                method: "POST"
              });
            }
            message.success("Đã xóa");
            loadData();
          } catch {
            message.error("Xóa thất bại");
          }
        },
      });
    };

    const handleCreateFolderFromSidebar = (spaceType, companyId = null) => {
      if (spaceType === "company_shared") {
        const targetCompanyId = companyId || activeCompanyId;
        if (!targetCompanyId) {
          message.warning("Vui lòng chọn công ty nội bộ trước");
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
      const isCustomerRecord = !!(templateRecord.customerCode || templateRecord._type === "customer_record" || activeSpace === "customer");
      Modal.confirm({
        title: isCustomerRecord ? `Xác nhận xóa Khách hàng "${templateRecord.customerName || templateRecord.name || getCustomerDisplayName(templateRecord)}"?` : `Xác nhận xóa loại tài liệu "${templateRecord.title || templateRecord.name}"?`,
        icon: React.createElement("span", { style: { color: "#faad14", marginRight: 16 } }, WarningIcon),
        content: isCustomerRecord ? "Bạn có chắc chắn muốn xóa khách hàng này? Các tài liệu và thư mục thuộc khách hàng này vẫn sẽ được lưu trữ trong Thùng rác hoặc không còn liên kết." : "Bạn có chắc chắn muốn xóa mục phân loại tài liệu này? Các tài liệu thuộc phân loại này vẫn được lưu trữ nhưng sẽ không còn liên kết.",
        okText: "Xóa",
        okType: "danger",
        cancelText: "Hủy",
        onOk: async () => {
          try {
            if (isCustomerRecord) {
              const candidates = [
                `customers:destroy?filterByTk=${extractId(templateRecord)}`,
                `customer:destroy?filterByTk=${extractId(templateRecord)}`
              ];
              let success = false;
              let lastError = null;
              for (const url of candidates) {
                try {
                  await ctx.api.request({ url, method: "POST" });
                  success = true;
                  break;
                } catch (e) { lastError = e; }
              }
              if (!success) throw lastError || new Error("Failed to delete");
            } else {
              await ctx.api.request({
                url: `${INTERNAL_TEMPLATE_COLLECTION}:destroy?filterByTk=${extractId(templateRecord)}`,
                method: "POST",
              });
            }
            message.success(isCustomerRecord ? "Đã xóa khách hàng" : "Đã xóa loại tài liệu");
            if (isCustomerRecord && activeCustomerId === String(extractId(templateRecord))) {
              setActiveCustomerId(null);
            }
            loadData();
          } catch (e) {
            message.error("Xóa thất bại");
          }
        },
      });
    };

    const handleRenameSubmit = async () => {
      try {
        const values = await renameForm.validateFields();
        const newName = values.name.trim();
        const rType = renameRecord._type;
        const rId = extractId(renameRecord);

        const isCustomerRecord = !!(renameRecord.customerCode || renameRecord._type === "customer_record");

        if (isCustomerRecord) {
          const candidates = [
            `customers:update?filterByTk=${rId}`,
            `customer:update?filterByTk=${rId}`
          ];
          let success = false;
          let lastError = null;
          for (const url of candidates) {
            try {
              await ctx.api.request({
                url,
                method: "POST",
                data: { customerName: newName, name: newName },
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
          message.success("Đã đổi tên khách hàng");
        } else if (rType === "template" || rType === "document_type") {
          await ctx.api.request({
            url: `${INTERNAL_TEMPLATE_COLLECTION}:update?filterByTk=${rId}`,
            method: "POST",
            data: { title: newName },
          });
          message.success("Đã đổi tên loại tài liệu");
        } else {
          if (rType === "folder") {
            await ctx.api.request({
              url: `folders:update?filterByTk=${rId}`,
              method: "POST",
              data: { name: newName },
            });
            message.success("Đã đổi tên thư mục");
          } else {
            await ctx.api.request({
              url: `documents:update?filterByTk=${rId}`,
              method: "POST",
              data: { title: newName },
            });
            const attachment = getAttachment(renameRecord);
            if (attachment?.id) {
              await ctx.api.request({
                url: `attachments:update?filterByTk=${attachment.id}`,
                method: "POST",
                data: { title: newName },
              }).catch(() => { });
            }
            message.success("Đã đổi tên tài liệu");
          }
        }
        setRenameRecord(null);
        renameForm.resetFields();
        loadData();
      } catch (e) {
        message.error("Đổi tên thất bại");
      }
    };

    const openRecordFile = (record) => {
      const fileUrl = getRecordFileUrl(record);
      if (!fileUrl) {
        message.warning("Tài liệu chưa có file hoặc URL");
        return;
      }
      window.open(fileUrl, "_blank");
    };

    const previewRecordFile = (record) => {
      if (!getRecordFileUrl(record)) {
        message.warning("Tài liệu chưa có file hoặc URL để xem trước");
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ color: "#8c6d1f", display: "inline-flex" }}>{TYPE_ICONS.folder}</span>
              <Text strong style={{ fontFamily: FONT, fontSize: 13, color: "#111827" }}>{record.name || "Folder"}</Text>
            </div>
          );
        }
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
              <Button size="small" type="primary" icon={CHECK_ICON} onClick={() => handleSaveFileTitle(record)} />
              <Button size="small" icon={CLOSE_ICON} onClick={cancelEditTitle} />
            </div>
          );
        }
        const folderFileCount = permissionFilteredDocs.filter(
          (d) => String(extractId(d.folderId) || "") === String(extractId(record))
        ).length;
        const folderSubFolderCount = permissionFilteredFolders.filter(
          (f) => String(getFolderParentId(f) || "") === String(extractId(record))
        ).length;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
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
              <span style={{ color: "#2563eb", display: "inline-flex" }}>{TYPE_ICONS.folder}</span>
              {record.name || "Folder"}
            </button>
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 8 }}>
              ({folderSubFolderCount} Thư mục - {folderFileCount} file)
            </span>
          </div>
        );
      }

      // File
      const attachment = getAttachment(record);
      const hasPrefix = !!(isAllFiles && record._displayFileIndex);
      const displayName = attachment?.title || attachment?.filename || record.googleDriveUrl || record.description || "Chưa có file đính kèm";
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
            <Button size="small" type="primary" icon={CHECK_ICON} onClick={() => handleSaveFileTitle(record)} />
            <Button size="small" icon={CLOSE_ICON} onClick={cancelEditTitle} />
          </div>
        );
      }

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {hasFile ? (
            <Tooltip title="Nhấn để xem trước" placement="topLeft">
              <span
                onClick={(e) => { e.stopPropagation(); previewRecordFile(record); }}
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
                onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.textDecorationColor = "#2563eb"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#111827"; e.currentTarget.style.textDecorationColor = "#d1d5db"; }}
              >
                {hasPrefix && <span style={{ color: "#10b981", marginRight: 6, fontWeight: 700 }}>{record._displayFileIndex}.</span>}
                {displayName}
              </span>
            </Tooltip>
          ) : (
            <Text strong style={{ color: "#6b7280", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
              {hasPrefix && <span style={{ color: "#10b981", marginRight: 6, fontWeight: 700 }}>{record._displayFileIndex}.</span>}
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
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18 }}>
          {icon}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", paddingTop: 1 }}>{label}</span>
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
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, color: color || "inherit" }}>
          {icon}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", color: color || "inherit" }}>{label}</span>
      </span>
    );

    // Helper: compute per-row write/manage permissions
    const getRecordPerms = useCallback((record) => {
      const currentUser = currentUserState;
      if (!currentUser) return { canWrite: true, isManager: true };
      if (isAdminUser(currentUser)) return { canWrite: true, isManager: true };
      if (record._type === "folder") {
        const perms = getFolderPermissions(record, currentUser, visibleFolders, currentLawyerId);
        return { canWrite: perms.canEdit || perms.isManager, isManager: perms.isManager };
      }
      // For files: check parent folder permissions
      const parentFolder = visibleFolders.find((f) => String(extractId(f.id)) === String(extractId(record.folderId) || ""));
      const canWrite = canManageFile(record, parentFolder || null, currentUser, visibleFolders, currentLawyerId);
      return { canWrite, isManager: false };
    }, [currentUserState, currentLawyerId, visibleFolders]);

    const renderContextMenuItems = useCallback((record) => {
      if (!record) return [];
      const items = [];
      const isFolder = record._type === "folder";
      const isTemplate = record._type === "template" || record._type === "document_type";
      const isCustomerRecord = record._type === "customer_record";

      if (isCustomerRecord) {
        items.push({
          key: "open_detail",
          label: renderContextMenuItemLabel(EYE_ICON, "Mở chi tiết"),
          onClick: () => {
            closeContextMenu();
            openCustomerDetail(record);
          },
        });
        items.push({
          key: "link_case",
          label: renderContextMenuItemLabel(LINK_CASE_ICON, "Liên kết Case"),
          onClick: () => {
            closeContextMenu();
            openLinkCaseModal(record);
          },
        });
        items.push({
          key: "rename",
          label: renderContextMenuItemLabel(EDIT_ICON, "Đổi tên"),
          onClick: () => {
            closeContextMenu();
            setRenameRecord(record);
            renameForm.setFieldsValue({ name: record.title || record.name || "" });
          },
        });
        items.push({
          key: "delete",
          label: renderContextMenuItemLabel(DELETE_ICON, "Xóa", "#cf1322"),
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
          label: renderContextMenuItemLabel(EDIT_ICON, "Đổi tên"),
          onClick: () => {
            closeContextMenu();
            setRenameRecord(record);
            renameForm.setFieldsValue({ name: record.title || record.name || "" });
          }
        });
        items.push({
          key: "delete",
          label: renderContextMenuItemLabel(DELETE_ICON, "Xóa", "#cf1322"),
          onClick: () => {
            closeContextMenu();
            handleDeleteTemplate(record);
          }
        });
        return items;
      }

      if (activeSpace === "trash") {
        items.push({
          key: "restore",
          label: renderContextMenuItemLabel(RESTORE_ICON, "Khôi phục"),
          onClick: () => { closeContextMenu(); handleRestoreRecord(record); },
        });
        items.push({
          key: "permanent_delete",
          label: renderContextMenuItemLabel(DELETE_ICON, "Xóa", "#cf1322"),
          onClick: () => { closeContextMenu(); handlePermanentDelete(record); },
        });
        return items;
      }

      const { canWrite, isManager } = getRecordPerms(record);

      if (!isFolder) {
        items.push({
          key: "preview",
          label: renderContextMenuItemLabel(EYE_ICON, "Xem trước"),
          onClick: () => { closeContextMenu(); previewRecordFile(record); },
        });
        items.push({
          key: "download",
          label: renderContextMenuItemLabel(DOWNLOAD_ICON, "Tải về"),
          onClick: () => { closeContextMenu(); openRecordFile(record); },
        });
      }

      if (canWrite) {
        items.push({
          key: "rename",
          label: renderContextMenuItemLabel(EDIT_ICON, "Đổi tên"),
          onClick: () => {
            closeContextMenu();
            setRenameRecord(record);
            renameForm.setFieldsValue({ name: record.name || record.title || "" });
          },
        });
        items.push({
          key: "move",
          label: renderContextMenuItemLabel(MOVE_ICON, "Di chuyển"),
          onClick: () => { closeContextMenu(); setMoveRecord(record); setMoveTargetId("root"); },
        });
      }

      if (isFolder && (isManager || isAdminUser(currentUserState))) {
        items.push({
          key: "permission",
          label: renderContextMenuItemLabel(LOCK_ICON, "Phân quyền"),
          onClick: () => { closeContextMenu(); setPermissionFolder(record); },
        });
      }

      const canDelete = isFolder ? (isManager || isAdminUser(currentUserState)) : canWrite;
      if (canDelete) {
        items.push({
          key: "delete",
          label: renderContextMenuItemLabel(DELETE_ICON, "Xóa", "#cf1322"),
          onClick: () => {
            closeContextMenu();
            if (isFolder) showDeleteConfirm(record);
            else handleDeleteFile(record);
          },
        });
      }

      return items;
    }, [getRecordPerms, currentUserState, activeSpace, openCustomerDetail, openLinkCaseModal]);

    const getRecordPathString = useCallback((record) => {
      if (!record) return "—";
      const pathItems = [];

      let parentFolderId = record.folderId;
      if (record._type === "folder") {
        parentFolderId = getFolderParentId(record);
      }

      let currentId = parentFolderId;
      while (currentId && currentId !== "root" && folderMap.has(String(currentId))) {
        const folder = folderMap.get(String(currentId));
        if (!activeCustomerRootFolderId || String(currentId) !== String(activeCustomerRootFolderId)) {
          pathItems.unshift(folder.name || "Folder");
        }
        currentId = getFolderParentId(folder);
      }

      let rootName = "Home";
      const storage = record.storageType || (parentFolderId && folderMap.get(String(parentFolderId))?.storageType);

      if (storage === "personal") {
        rootName = "Workspace cá nhân";
      } else if (storage === "company_shared") {
        rootName = activeCompany ? getCompanyName(activeCompany) : "Thư mục chung";
      } else if (getRecordCustomerId(record)) {
        rootName = "Customer";
      } else {
        const typeId = getRecordDocumentType(record) || (parentFolderId && getRecordDocumentType(folderMap.get(String(parentFolderId))));
        if (typeId) {
          const type = documentTypes.find(t => t.id === String(typeId));
          rootName = type ? `Thư viện / ${type.label}` : "Thư viện";
        } else {
          rootName = "Thư mục chung";
        }
      }

      pathItems.unshift(rootName);
      return pathItems.join(" / ");
    }, [folderMap, activeCompany, documentTypes, getRecordDocumentType, activeCustomerRootFolderId]);

    const tableColumns = useMemo(
      () => {
        const hasFolders = tableData.some((r) => r._type === "folder");
        const hasFiles = tableData.some((r) => r._type === "file");
        const isAllFolders = tableData.length > 0 && hasFolders && !hasFiles;
        const isAllFiles = tableData.length > 0 && hasFiles && !hasFolders;
        const currentUser = currentUserState;

        // Shared action cell renderer for folder rows
        const renderFolderActions = (record) => {
          if (activeSpace === "trash") {
            return (
              <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}>
                <Tooltip title="Khôi phục">
                  <Button
                    size="small"
                    icon={RESTORE_ICON}
                    onClick={(event) => { event.stopPropagation(); handleRestoreRecord(record); }}
                    style={{ color: "#3B6D11", borderColor: "#c3e6cb", background: "#e2f0d9" }}
                  />
                </Tooltip>
                <Tooltip title="Xóa">
                  <Button
                    size="small"
                    danger
                    icon={DELETE_ICON}
                    onClick={(event) => { event.stopPropagation(); handlePermanentDelete(record); }}
                  />
                </Tooltip>
              </div>
            );
          }
          const { canWrite, isManager } = getRecordPerms(record);
          const showEdit = canWrite;
          const showMove = canWrite;
          const showLock = isManager || isAdminUser(currentUser);
          if (showLock) {
            return (
              <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}>
                <Tooltip title="Phân quyền">
                  <Button
                    size="small"
                    icon={LOCK_ICON}
                    onClick={(event) => { event.stopPropagation(); setPermissionFolder(record); }}
                  />
                </Tooltip>
                <Tooltip title="Xóa">
                  <Button
                    size="small"
                    danger
                    icon={DELETE_ICON}
                    onClick={(event) => { event.stopPropagation(); showDeleteConfirm(record); }}
                  />
                </Tooltip>
              </div>
            );
          }
          if (showEdit || showMove) {
            return (
              <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}>
                <Tooltip title="Sửa tên">
                  <Button
                    size="small"
                    icon={EDIT_ICON}
                    onClick={(event) => { event.stopPropagation(); startEditTitle(record); }}
                  />
                </Tooltip>
                <Tooltip title="Di chuyển">
                  <Button
                    size="small"
                    icon={MOVE_ICON}
                    onClick={(event) => { event.stopPropagation(); setMoveRecord(record); setMoveTargetId("root"); }}
                  />
                </Tooltip>
              </div>
            );
          }
          return null;
        };

        // Shared action cell renderer for file rows
        const renderFileActions = (record) => {
          if (activeSpace === "trash") {
            return (
              <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}>
                <Tooltip title="Khôi phục">
                  <Button
                    size="small"
                    icon={RESTORE_ICON}
                    onClick={(event) => { event.stopPropagation(); handleRestoreRecord(record); }}
                    style={{ color: "#3B6D11", borderColor: "#c3e6cb", background: "#e2f0d9" }}
                  />
                </Tooltip>
                <Tooltip title="Xóa">
                  <Button
                    size="small"
                    danger
                    icon={DELETE_ICON}
                    onClick={(event) => { event.stopPropagation(); handlePermanentDelete(record); }}
                  />
                </Tooltip>
              </div>
            );
          }
          return (
            <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}>
              <Tooltip title="Xem trước">
                <Button
                  size="small"
                  icon={EYE_ICON}
                  onClick={(event) => { event.stopPropagation(); previewRecordFile(record); }}
                />
              </Tooltip>
              <Tooltip title="Tải về">
                <Button
                  size="small"
                  icon={DOWNLOAD_ICON}
                  onClick={(event) => { event.stopPropagation(); openRecordFile(record); }}
                />
              </Tooltip>
            </div>
          );
        };

        if (activeSpace === "customer" && !activeCustomerIdValue) {
          return [
            {
              title: "STT",
              key: "stt",
              width: 60,
              align: "center",
              render: (_, __, index) => index + 1,
            },
            {
              title: "Mã khách hàng",
              key: "customerCode",
              width: 150,
              sorter: (a, b) => (a.customerCode || "").localeCompare(b.customerCode || "", "vi"),
              render: (_, record) => <Text style={{ fontWeight: 600, color: "#111827" }}>{record.customerCode || record.code || "—"}</Text>,
            },
            {
              title: "Tên khách hàng",
              key: "customerName",
              minWidth: 250,
              sorter: (a, b) => (a.customerName || a.name || "").localeCompare(b.customerName || b.name || "", "vi"),
              render: (_, record) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCustomerDetail(record);
                  }}
                  style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer", fontFamily: FONT, fontWeight: 700, color: "#185FA5", textAlign: "left" }}
                >
                  {record.title || "—"}
                </button>
              ),
            },
            {
              title: "Case Summary",
              key: "description",
              minWidth: 200,
              render: (_, record) => <Text type="secondary">{record.description || "—"}</Text>,
            },
            {
              title: "Cases liên kết",
              key: "linkedCases",
              minWidth: 200,
              render: (_, record) => (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                  {(record.cases || []).length === 0 ? (
                    <span style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>Chưa liên kết</span>
                  ) : (() => {
                    const list = record.cases || [];
                    const visibleCount = 2;
                    const visibleItems = list.slice(0, visibleCount);
                    const extraItems = list.slice(visibleCount);
                    const getDisplayName = (project) => {
                      return project.projectName ? `${project.caseCode ? `${project.caseCode} - ` : ""}${project.projectName}` : `Case #${extractId(project)}`;
                    };
                    return (
                      <React.Fragment>
                        {visibleItems.map((project, idx) => (
                          <Tag key={idx} color="default" style={{ borderRadius: 4, margin: 0, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getDisplayName(project)}>
                            {getDisplayName(project)}
                          </Tag>
                        ))}
                        {extraItems.length > 0 && (
                          <Tooltip
                            title={
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 250, overflowY: "auto" }}>
                                {extraItems.map((project, idx) => (
                                  <div key={idx}>{getDisplayName(project)}</div>
                                ))}
                              </div>
                            }
                          >
                            <Tag color="default" style={{ borderRadius: 4, margin: 0, cursor: "pointer", fontWeight: 600 }}>
                              +{extraItems.length} khác
                            </Tag>
                          </Tooltip>
                        )}
                      </React.Fragment>
                    );
                  })()}
                </div>
              ),
            },
            {
              title: "Thao tác",
              key: "actions",
              width: 100,
              align: "right",
              render: (_, record) => (
                <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="Liên kết Case">
                    <Button
                      size="small"
                      icon={LINK_CASE_ICON}
                      onClick={(e) => {
                        e.stopPropagation();
                        openLinkCaseModal(record);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Xóa">
                    <Button
                      size="small"
                      danger
                      icon={DELETE_ICON}
                      onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(record); }}
                    />
                  </Tooltip>
                </div>
              ),
            }
          ];
        }

        if (isAllFolders) {
          if (activeSpace === "trash") {
            return [
              {
                title: "Tên folder",
                key: "name",
                minWidth: 250,
                render: (_, record) => renderNameCell(record, false),
                sorter: (a, b) => (a.name || "").localeCompare(b.name || "", "vi"),
              },
              {
                title: "Mô tả",
                key: "description",
                minWidth: 200,
                render: (_, record) => <Text type="secondary">{record.description || "—"}</Text>,
              },
              {
                title: "Size",
                key: "size",
                width: 100,
                sorter: (a, b) => getFolderSize(extractId(a)) - getFolderSize(extractId(b)),
                render: (_, record) => <Text type="secondary">{formatBytes(getFolderSize(extractId(record)))}</Text>,
              },
              {
                title: "Người upload",
                key: "createdBy",
                width: 180,
                render: (_, record) => <Text type="secondary">{getUploadUserName(record)}</Text>,
              },
              {
                title: "Ngày upload",
                key: "createdAt",
                width: 150,
                sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
                render: (_, record) => <Text type="secondary">{formatDate(getValidDate(record))}</Text>,
              },
              {
                title: "Người xoá",
                key: "deletedBy",
                width: 180,
                render: (_, record) => <Text type="secondary">{getDeletedUserName(record)}</Text>,
              },
              {
                title: "Ngày xoá",
                key: "deletedAt",
                width: 160,
                sorter: (a, b) => new Date(a.deletedAt || a.updatedAt || 0) - new Date(b.deletedAt || b.updatedAt || 0),
                render: (_, record) => <Text type="secondary">{formatDateTime(record.deletedAt || record.updatedAt || record.deleted_at)}</Text>,
              },
              {
                title: "Thao tác",
                key: "actions",
                width: 120,
                align: "right",
                render: (_, record) => renderFolderActions(record),
              }
            ];
          }

          return [
            {
              title: "Tên folder",
              key: "name",
              minWidth: 250,
              render: (_, record) => renderNameCell(record, false),
              sorter: (a, b) => (a.name || "").localeCompare(b.name || "", "vi"),
            },
            {
              title: "Mô tả",
              key: "description",
              minWidth: 200,
              render: (_, record) => <Text type="secondary">{record.description || "—"}</Text>,
            },
            {
              title: "Size",
              key: "size",
              width: 100,
              sorter: (a, b) => getFolderSize(extractId(a)) - getFolderSize(extractId(b)),
              render: (_, record) => <Text type="secondary">{formatBytes(getFolderSize(extractId(record)))}</Text>,
            },
            {
              title: "Ngày tạo",
              key: "createdAt",
              width: 150,
              sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
              render: (_, record) => <Text type="secondary">{formatDate(getValidDate(record))}</Text>,
            },
            {
              title: "Người tạo",
              key: "createdBy",
              width: 180,
              render: (_, record) => <Text type="secondary">{getUploadUserName(record)}</Text>,
            },
            {
              title: "Thao tác",
              key: "actions",
              width: 120,
              align: "right",
              render: (_, record) => renderFolderActions(record),
            }
          ];
        }

        if (isAllFiles) {
          if (activeSpace === "trash") {
            return [
              {
                title: "Tên file",
                key: "name",
                minWidth: 250,
                render: (_, record) => renderNameCell(record, true),
                sorter: (a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || "", "vi"),
              },
              {
                title: "Mô tả",
                key: "description",
                minWidth: 200,
                render: (_, record) => <Text type="secondary">{record.description || "—"}</Text>,
              },
              {
                title: "Size",
                key: "size",
                width: 100,
                sorter: (a, b) => (getAttachment(a)?.size || 0) - (getAttachment(b)?.size || 0),
                render: (_, record) => <Text type="secondary">{formatBytes(getAttachment(record)?.size)}</Text>,
              },
              {
                title: "Người upload",
                key: "uploadedBy",
                width: 180,
                render: (_, record) => <Text type="secondary">{getUploadUserName(record)}</Text>,
              },
              {
                title: "Ngày upload",
                key: "uploadedAt",
                width: 160,
                sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
                render: (_, record) => <Text type="secondary">{formatDateTime(getValidDate(record))}</Text>,
              },
              {
                title: "Người xoá",
                key: "deletedBy",
                width: 180,
                render: (_, record) => <Text type="secondary">{getDeletedUserName(record)}</Text>,
              },
              {
                title: "Ngày xoá",
                key: "deletedAt",
                width: 160,
                sorter: (a, b) => new Date(a.deletedAt || a.updatedAt || 0) - new Date(b.deletedAt || b.updatedAt || 0),
                render: (_, record) => <Text type="secondary">{formatDateTime(record.deletedAt || record.updatedAt || record.deleted_at)}</Text>,
              },
              {
                title: "Thao tác",
                key: "actions",
                width: 120,
                align: "right",
                render: (_, record) => renderFileActions(record),
              }
            ];
          }

          return [
            {
              title: "Tên file",
              key: "name",
              minWidth: 250,
              render: (_, record) => renderNameCell(record, true),
              sorter: (a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || "", "vi"),
            },
            {
              title: "Mô tả",
              key: "description",
              minWidth: 200,
              render: (_, record) => <Text type="secondary">{record.description || "—"}</Text>,
            },
            {
              title: "Size",
              key: "size",
              width: 100,
              sorter: (a, b) => (getAttachment(a)?.size || 0) - (getAttachment(b)?.size || 0),
              render: (_, record) => <Text type="secondary">{formatBytes(getAttachment(record)?.size)}</Text>,
            },
            {
              title: "Ngày upload",
              key: "uploadedAt",
              width: 160,
              sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
              render: (_, record) => <Text type="secondary">{formatDateTime(getValidDate(record))}</Text>,
            },
            {
              title: "Người upload",
              key: "uploadedBy",
              width: 180,
              render: (_, record) => <Text type="secondary">{getUploadUserName(record)}</Text>,
            },
            {
              title: "Thao tác",
              key: "actions",
              width: 120,
              align: "right",
              render: (_, record) => renderFileActions(record),
            }
          ];
        }

        // Default mixed columns
        if (activeSpace === "trash") {
          return [
            {
              title: "Tên",
              key: "name",
              minWidth: 250,
              render: (_, record) => renderNameCell(record, true),
              sorter: (a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || "", "vi"),
            },
            {
              title: "Mô tả",
              key: "description",
              minWidth: 200,
              render: (_, record) => <Text type="secondary">{record.description || "—"}</Text>,
            },
            {
              title: "Size",
              key: "size",
              width: 100,
              sorter: (a, b) => {
                const sizeA = a._type === "folder" ? getFolderSize(extractId(a)) : (getAttachment(a)?.size || 0);
                const sizeB = b._type === "folder" ? getFolderSize(extractId(b)) : (getAttachment(b)?.size || 0);
                return sizeA - sizeB;
              },
              render: (_, record) => {
                const size = record._type === "folder" ? getFolderSize(extractId(record)) : (getAttachment(record)?.size || 0);
                return <Text type="secondary">{formatBytes(size)}</Text>;
              },
            },
            {
              title: "Ngày tạo",
              key: "createdAt",
              width: 120,
              sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
              render: (_, record) => (record._type === "folder" ? <Text type="secondary">{formatDate(getValidDate(record))}</Text> : <Text type="secondary">—</Text>),
            },
            {
              title: "Người upload",
              key: "uploadedBy",
              width: 150,
              render: (_, record) => (record._type === "file" ? <Text type="secondary">{getUploadUserName(record)}</Text> : <Text type="secondary">—</Text>),
            },
            {
              title: "Ngày upload",
              key: "uploadedAt",
              width: 150,
              sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
              render: (_, record) => (record._type === "file" ? <Text type="secondary">{formatDateTime(getValidDate(record))}</Text> : <Text type="secondary">—</Text>),
            },
            {
              title: "Người xoá",
              key: "deletedBy",
              width: 150,
              render: (_, record) => <Text type="secondary">{getDeletedUserName(record)}</Text>,
            },
            {
              title: "Ngày xoá",
              key: "deletedAt",
              width: 150,
              sorter: (a, b) => new Date(a.deletedAt || a.updatedAt || 0) - new Date(b.deletedAt || b.updatedAt || 0),
              render: (_, record) => <Text type="secondary">{formatDateTime(record.deletedAt || record.updatedAt || record.deleted_at)}</Text>,
            },
            {
              title: "Thao tác",
              key: "actions",
              width: 120,
              align: "right",
              render: (_, record) => (record._type === "folder" ? renderFolderActions(record) : renderFileActions(record)),
            }
          ];
        }

        return [
          {
            title: "Tên",
            key: "name",
            minWidth: 250,
            render: (_, record) => renderNameCell(record, true),
            sorter: (a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || "", "vi"),
          },
          {
            title: "Mô tả",
            key: "description",
            minWidth: 200,
            render: (_, record) => <Text type="secondary">{record.description || "—"}</Text>,
          },
          {
            title: "Size",
            key: "size",
            width: 100,
            sorter: (a, b) => {
              const sizeA = a._type === "folder" ? getFolderSize(extractId(a)) : (getAttachment(a)?.size || 0);
              const sizeB = b._type === "folder" ? getFolderSize(extractId(b)) : (getAttachment(b)?.size || 0);
              return sizeA - sizeB;
            },
            render: (_, record) => {
              const size = record._type === "folder" ? getFolderSize(extractId(record)) : (getAttachment(record)?.size || 0);
              return <Text type="secondary">{formatBytes(size)}</Text>;
            },
          },
          {
            title: "Ngày tạo",
            key: "createdAt",
            width: 120,
            sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
            render: (_, record) => (record._type === "folder" ? <Text type="secondary">{formatDate(getValidDate(record))}</Text> : <Text type="secondary">—</Text>),
          },
          {
            title: "Ngày upload",
            key: "uploadedAt",
            width: 150,
            sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
            render: (_, record) => (record._type === "file" ? <Text type="secondary">{formatDateTime(getValidDate(record))}</Text> : <Text type="secondary">—</Text>),
          },
          {
            title: "Người upload",
            key: "uploadedBy",
            width: 150,
            render: (_, record) => (record._type === "file" ? <Text type="secondary">{getUploadUserName(record)}</Text> : <Text type="secondary">—</Text>),
          },
          {
            title: "Thao tác",
            key: "actions",
            width: 120,
            align: "right",
            render: (_, record) => (record._type === "folder" ? renderFolderActions(record) : renderFileActions(record)),
          }
        ];
      },
      [tableData, documentTypes, getTypeConfig, getRecordDocumentType, editingTitleId, editingTitleValue, currentUserState, currentLawyerId, visibleFolders, getRecordPathString, activeSpace, activeCustomerIdValue, getFolderSize, openCustomerDetail, openLinkCaseModal],
    );

    const rowDragProps = (record) => ({
      draggable: record._type !== "customer_record",
      onDragStart: (event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/json", JSON.stringify({ type: record._type, id: extractId(record) }));
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
        if (record._type === "customer_record") {
          openCustomerDetail(record);
        }
      }
    });

    const handleNewActionClick = ({ key }) => {
      if (!requireCompany()) return;
      if (key === "folder") {
        folderForm.resetFields();
        setIsFolderOpen(true);
        return;
      }
      if (key === "upload") {
        uploadForm.resetFields();
        uploadForm.setFieldsValue({ documentType: activeTypeId });
        setUploadFileList([]);
        setIsUploadOpen(true);
        return;
      }
      if (key === "upload_folder") {
        folderInputRef.current?.click();
      }
    };

    const newMenu = {
      items: [
        { key: "folder", label: renderNewMenuLabel(TYPE_ICONS.folder, "Tạo thư mục") },
        { key: "upload", label: renderNewMenuLabel(TYPE_ICONS.upload, "Upload") },
        { key: "upload_folder", label: renderNewMenuLabel(TYPE_ICONS.folder, "Upload thư mục") },
      ],
      onClick: handleNewActionClick,
    };

    const activityColumns = useMemo(() => [
      {
        title: "Loại hoạt động",
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
        }
      },
      {
        title: "Người thực hiện",
        dataIndex: "changedByName",
        key: "changedByName",
        width: 200,
        render: (name) => {
          const displayName = name || "Hệ thống";
          const initials = displayName
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
          const [bg, fg] = palettes[(displayName.charCodeAt(0) || 0) % palettes.length];
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
              <span style={{ fontSize: 13, color: "#1F2937", fontWeight: 500 }}>{displayName}</span>
            </div>
          );
        }
      },
      {
        title: "Tài liệu",
        key: "file",
        width: 280,
        render: (text, log) => {
          const isFolder = log.collectionName === "Folder";
          const name = log.resolvedTitle || log.recordTitle || log.newValue || log.oldValue || "—";
          const docRecord = !isFolder ? documents.find(d => String(extractId(d.id)) === String(log.recordId)) : null;

          let icon = isFolder ? TYPE_ICONS.folder : TYPE_ICONS.default;
          if (!isFolder && docRecord) {
            const ext = getFileExtension(docRecord);
            icon = getFileSvgIcon(ext);
          }

          const canPreview = docRecord && getRecordFileUrl(docRecord);

          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ flexShrink: 0, display: "inline-flex" }}>{icon}</span>
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
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                >
                  {name}
                </span>
              ) : (
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{name}</span>
              )}
            </div>
          );
        }
      },
      {
        title: "Mô tả thay đổi",
        key: "desc",
        render: (text, log) => {
          const desc = resolveActivityDesc(log, folders, documents);
          return (
            <div style={{ fontSize: 13, color: "#4B5563" }}>{desc}</div>
          );
        }
      },
      {
        title: "Thời gian",
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
          return <span style={{ fontSize: 13, color: "#4B5563" }}>{formatted}</span>;
        }
      }
    ], [documents, folders, resolveActivityActionInfo, resolveActivityDesc, previewRecordFile]);

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
          menu={{ items: contextMenuState.record ? renderContextMenuItems(contextMenuState.record) : [] }}
          open={contextMenuState.open}
          onOpenChange={(v) => { if (!v) closeContextMenu(); }}
          trigger={["contextMenu"]}
        >
          <div style={{ position: "fixed", left: contextMenuState.x, top: contextMenuState.y, width: 1, height: 1, zIndex: 9999, pointerEvents: "none" }} />
        </Dropdown>

        <Layout style={{ background: "#fff", minHeight: "720px", fontFamily: FONT, borderRadius: 8, border: "0.5px solid #e5e7eb", overflow: "hidden", minWidth: 0 }}>
          {!sidebarCollapsed && (
            <Sider width={240} style={{ background: "#FFFFFF", borderRight: "0.5px solid #E5E7EB", padding: "16px 12px", overflowY: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>

                {/* Workspace header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 2px 16px 2px", borderBottom: "0.5px solid #E5E7EB", marginBottom: 16 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: "#185FA5",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                      <line x1="9" y1="22" x2="9" y2="16" />
                      <line x1="15" y1="22" x2="15" y2="16" />
                      <line x1="9" y1="16" x2="15" y2="16" />
                      <path d="M8 6h2" />
                      <path d="M14 6h2" />
                      <path d="M8 10h2" />
                      <path d="M14 10h2" />
                    </svg>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Customer Workspace
                    </span>
                    <span style={{ fontSize: 11, color: "#6B7280" }}>Customer</span>
                  </div>
                  <Tooltip title="Đóng sidebar">
                    <Button type="text" icon={SIDEBAR_ICON} onClick={() => setSidebarCollapsed(true)}
                      style={{ width: 22, height: 22, minWidth: 22, padding: 0, color: "#9CA3AF" }} />
                  </Tooltip>
                </div>

                {/* ══ SEARCH BOX ══ */}
                <div style={{ marginBottom: 16 }}>
                  <Input
                    placeholder="Tìm kiếm tài liệu..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    allowClear
                    prefix={<span style={{ color: "#9CA3AF", marginRight: 4, display: "flex" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>}
                    style={{ borderRadius: 8, background: "#F9FAFB", border: "1px solid #E5E7EB" }}
                  />
                </div>

                {isCustomerDetailMode ? (
                  // ── REDESIGNED SIDEBAR FOR CUSTOMER DETAIL MODE ──
                  <React.Fragment>
                    {/* ══ SECTION 2: MY WORKSPACE ══ */}
                    <div style={{ order: 2, borderTop: "0.5px solid #E5E7EB", paddingTop: 12, marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 6px 2px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span
                            onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
                            style={{ color: "#9CA3AF", display: "inline-flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}
                          >
                            {workspaceExpanded ? ChevronDown : ChevronRight}
                          </span>
                          <span
                            onClick={() => {
                              setActiveSpace("personal");
                              setSelectedFolderId("root");
                            }}
                            style={{ fontSize: 10, fontWeight: 600, color: activeSpace === "personal" ? "#185FA5" : "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT, cursor: "pointer", userSelect: "none" }}
                          >
                            My Workspace
                          </span>
                        </div>
                        <button type="button"
                          onClick={() => handleCreateFolderFromSidebar("personal")}
                          style={{ fontSize: 11, color: "#185FA5", fontWeight: 500, border: "none", background: "transparent", cursor: "pointer", padding: "0 2px", fontFamily: FONT }}
                        >+ Tạo</button>
                      </div>
                      {workspaceExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 12 }}>
                            {personalRootFolders.length === 0 ? (
                              <Text style={{ fontSize: 12, color: "#9CA3AF", padding: "4px 10px", display: "block", fontStyle: "italic" }}>Chưa có thư mục</Text>
                            ) : (
                              (showAllPersonalFolders ? personalRootFolders : personalRootFolders.slice(0, 5)).map((folder) => {
                                const fid = String(extractId(folder.id));
                                const isFolderActive = activeSpace === "personal" && selectedFolderId === fid;
                                return (
                                  <button
                                    key={fid}
                                    type="button"
                                    onClick={() => {
                                      setActiveSpace("personal");
                                      setSelectedFolderId(fid);
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setContextMenuState({
                                        open: true,
                                        x: e.clientX,
                                        y: e.clientY,
                                        record: { ...folder, _type: "folder" }
                                      });
                                    }}
                                    style={{
                                      width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                                      border: "0", borderRadius: 8, cursor: "pointer",
                                      background: isFolderActive ? "#E6F1FB" : "transparent",
                                      color: isFolderActive ? "#185FA5" : "#6B7280",
                                      fontWeight: isFolderActive ? 600 : 400, fontFamily: FONT, fontSize: 12,
                                      transition: "background 0.15s", minWidth: 0, textAlign: "left"
                                    }}
                                    onMouseEnter={(e) => { if (!isFolderActive) e.currentTarget.style.background = "#F3F4F6"; }}
                                    onMouseLeave={(e) => { if (!isFolderActive) e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                                      {React.cloneElement(TYPE_ICONS.folder, { size: 13 })}
                                    </span>
                                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {folder.name}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                            {personalRootFolders.length > 5 && (
                              <button
                                type="button"
                                onClick={() => setShowAllPersonalFolders(!showAllPersonalFolders)}
                                style={{
                                  fontSize: 11, color: "#185FA5", background: "transparent", border: "none", cursor: "pointer",
                                  padding: "6px 10px", textAlign: "left", fontWeight: 500, fontFamily: FONT
                                }}
                              >
                                {showAllPersonalFolders ? "Thu gọn" : `Xem thêm (${personalRootFolders.length - 5})`}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ══ SECTION 1: CUSTOMER (Shared folders) ══ */}
                    <div style={{ order: 1, marginTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 6px 2px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span
                            onClick={() => setLibraryExpanded(!libraryExpanded)}
                            style={{ color: "#9CA3AF", display: "inline-flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}
                          >
                            {libraryExpanded ? ChevronDown : ChevronRight}
                          </span>
                          <span
                            onClick={() => {
                              setActiveSpace("customer");
                              setSelectedFolderId("root");
                            }}
                            style={{ fontSize: 10, fontWeight: 600, color: activeSpace === "customer" ? "#185FA5" : "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT, cursor: "pointer", userSelect: "none" }}
                          >
                            Customer
                          </span>
                        </div>
                        <button type="button"
                          onClick={() => handleCreateFolderFromSidebar("customer")}
                          style={{ fontSize: 11, color: "#185FA5", fontWeight: 500, border: "none", background: "transparent", cursor: "pointer", padding: "0 2px", fontFamily: FONT }}
                        >+ Tạo</button>
                      </div>
                      {libraryExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 12 }}>
                            {customerRootFolders.length === 0 ? (
                              <Text style={{ fontSize: 12, color: "#9CA3AF", padding: "4px 10px", display: "block", fontStyle: "italic" }}>Chưa có thư mục</Text>
                            ) : (
                              customerRootFolders.map((folder) => {
                                const fid = String(extractId(folder.id));
                                const isFolderActive = activeSpace === "customer" && selectedFolderId === fid;
                                return (
                                  <button
                                    key={fid}
                                    type="button"
                                    onClick={() => {
                                      setActiveSpace("customer");
                                      setSelectedFolderId(fid);
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setContextMenuState({
                                        open: true,
                                        x: e.clientX,
                                        y: e.clientY,
                                        record: { ...folder, _type: "folder" }
                                      });
                                    }}
                                    style={{
                                      width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                                      border: "0", borderRadius: 8, cursor: "pointer",
                                      background: isFolderActive ? "#E6F1FB" : "transparent",
                                      color: isFolderActive ? "#185FA5" : "#6B7280",
                                      fontWeight: isFolderActive ? 600 : 400, fontFamily: FONT, fontSize: 12,
                                      transition: "background 0.15s", minWidth: 0, textAlign: "left"
                                    }}
                                    onMouseEnter={(e) => { if (!isFolderActive) e.currentTarget.style.background = "#F3F4F6"; }}
                                    onMouseLeave={(e) => { if (!isFolderActive) e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                                      {React.cloneElement(TYPE_ICONS.folder, { size: 13 })}
                                    </span>
                                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {folder.name}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ══ SECTION 3: NHANH (Activity logs & Trash) ══ */}
                    <div style={{ order: 3, borderTop: "0.5px solid #E5E7EB", paddingTop: 12, marginTop: 12 }}>
                      <div style={{ padding: "0 2px 6px 2px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT }}>Nhanh</span>
                      </div>

                      {/* Lịch sử hoạt động */}
                      {(() => {
                        const isActive = activeSpace === "recent";
                        return (
                          <button type="button" onClick={() => { setActiveSpace("recent"); setSelectedFolderId("root"); }}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                              border: "0", borderRadius: 8, cursor: "pointer",
                              borderLeft: isActive ? "2px solid #185FA5" : "2px solid transparent",
                              background: isActive ? "#E6F1FB" : "transparent",
                              color: isActive ? "#185FA5" : "#6B7280",
                              fontFamily: FONT, minWidth: 0, transition: "background 0.15s", textAlign: "left", marginBottom: 2
                            }}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#F3F4F6"; }}
                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#185FA5" : "#6B7280"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Lịch sử hoạt động</span>
                          </button>
                        );
                      })()}

                      {/* Thùng rác */}
                      {(() => {
                        const isActive = activeSpace === "trash";
                        const trashCount = quickTrashCount;
                        return (
                          <button type="button" onClick={() => { setActiveSpace("trash"); setSelectedFolderId("root"); }}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                              border: "0", borderRadius: 8, cursor: "pointer",
                              borderLeft: isActive ? "2px solid #185FA5" : "2px solid transparent",
                              background: isActive ? "#E6F1FB" : "transparent",
                              color: isActive ? "#185FA5" : "#6B7280",
                              fontFamily: FONT, minWidth: 0, transition: "background 0.15s", textAlign: "left"
                            }}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#F3F4F6"; }}
                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#185FA5" : "#6B7280"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Thùng rác</span>
                            {trashCount > 0 && (
                              <span style={{
                                fontSize: 11,
                                background: isActive ? "#FFFFFF" : "#F3F4F6",
                                color: isActive ? "#185FA5" : "#6B7280",
                                padding: "1px 6px", borderRadius: 99, flexShrink: 0
                              }}>
                                {trashCount}
                              </span>
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  </React.Fragment>
                ) : (
                  // ── STANDARD SIDEBAR FOR STANDALONE MODE ──
                  <React.Fragment>
                    {/* ══ SECTION 1: KHÔNG GIAN (Spaces) ══ */}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 6px 2px" }}>
                        <div
                          onClick={() => {
                            setActiveSpace("company_shared");
                            setActiveCompanyId(null);
                            setSelectedFolderId("root");
                          }}
                          style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", userSelect: "none" }}
                        >
                          <span
                            onClick={(e) => { e.stopPropagation(); setSpacesExpanded(!spacesExpanded); }}
                            style={{ color: "#9CA3AF", display: "inline-flex", alignItems: "center" }}
                          >
                            {spacesExpanded ? ChevronDown : ChevronRight}
                          </span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: activeSpace === "company_shared" && !activeCompanyId ? "#185FA5" : "#9CA3AF",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            fontFamily: FONT
                          }}>Workspace</span>
                        </div>
                        <button type="button"
                          onClick={() => handleCreateFolderFromSidebar("company_shared")}
                          style={{ fontSize: 11, color: "#185FA5", fontWeight: 500, border: "none", background: "transparent", cursor: "pointer", padding: "0 2px", fontFamily: FONT }}
                        >+ Tạo</button>
                      </div>
                      {spacesExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {companies.length === 0 ? (
                            <Text style={{ fontSize: 12, color: "#9CA3AF", padding: "4px 10px", display: "block" }}>Chưa có</Text>
                          ) : (
                            (showAllCompanies ? companies : companies.slice(0, 5)).map((company) => {
                              const cid = String(extractId(company));
                              const isActive = cid === String(activeCompanyId) && activeSpace === "company_shared";
                              const compDocsCount = documents.filter(doc => matchesInternalCompany(doc, cid) && !doc.isDeleted).length;
                              const compFoldersCount = folders.filter(f => matchesInternalCompany(f, cid) && !f.isDeleted).length;
                              const totalCount = compDocsCount + compFoldersCount;
                              return (
                                <div key={cid} style={{ display: "flex", flexDirection: "column" }}>
                                  <button type="button" onClick={() => { setActiveCompanyId(cid); setActiveSpace("company_shared"); setSelectedFolderId("root"); }}
                                    style={{
                                      width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                                      border: "0", borderRadius: 8, cursor: "pointer",
                                      borderLeft: isActive ? "2px solid #185FA5" : "2px solid transparent",
                                      background: isActive ? "#E6F1FB" : "transparent",
                                      color: isActive ? "#185FA5" : "#6B7280",
                                      fontWeight: isActive ? 600 : 400, fontFamily: FONT, fontSize: 13,
                                      transition: "background 0.15s", minWidth: 0, textAlign: "left"
                                    }}
                                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#F3F4F6"; }}
                                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#185FA5" : "#6B7280"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                                      <line x1="9" y1="22" x2="9" y2="16" />
                                      <line x1="15" y1="22" x2="15" y2="16" />
                                      <line x1="9" y1="16" x2="15" y2="16" />
                                    </svg>
                                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {getCompanyName(company)}
                                    </span>
                                    {totalCount > 0 && (
                                      <span style={{
                                        fontSize: 11,
                                        background: isActive ? "#FFFFFF" : "#F3F4F6",
                                        color: isActive ? "#185FA5" : "#6B7280",
                                        padding: "1px 6px", borderRadius: 99, flexShrink: 0
                                      }}>
                                        {totalCount}
                                      </span>
                                    )}
                                  </button>

                                  {/* Render root folders of this company when active */}
                                  {isActive && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 12, marginTop: 2 }}>
                                      {companyRootFolders.map((folder) => {
                                        const fid = String(extractId(folder.id));
                                        const isFolderActive = selectedFolderId === fid;
                                        return (
                                          <button
                                            key={fid}
                                            type="button"
                                            onClick={() => {
                                              setActiveSpace("company_shared");
                                              setSelectedFolderId(fid);
                                            }}
                                            onContextMenu={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setContextMenuState({
                                                open: true,
                                                x: e.clientX,
                                                y: e.clientY,
                                                record: { ...folder, _type: "folder" }
                                              });
                                            }}
                                            style={{
                                              width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                                              border: "0", borderRadius: 8, cursor: "pointer",
                                              background: isFolderActive ? "#E6F1FB" : "transparent",
                                              color: isFolderActive ? "#185FA5" : "#6B7280",
                                              fontWeight: isFolderActive ? 600 : 400, fontFamily: FONT, fontSize: 12,
                                              transition: "background 0.15s", minWidth: 0, textAlign: "left"
                                            }}
                                            onMouseEnter={(e) => { if (!isFolderActive) e.currentTarget.style.background = "#F3F4F6"; }}
                                            onMouseLeave={(e) => { if (!isFolderActive) e.currentTarget.style.background = "transparent"; }}
                                          >
                                            <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                                              {React.cloneElement(TYPE_ICONS.folder, { size: 13 })}
                                            </span>
                                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                              {folder.name}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                          {companies.length > 5 && (
                            <button
                              type="button"
                              onClick={() => setShowAllCompanies(!showAllCompanies)}
                              style={{
                                fontSize: 11, color: "#185FA5", background: "transparent", border: "none", cursor: "pointer",
                                padding: "6px 10px", textAlign: "left", fontWeight: 500, fontFamily: FONT
                              }}
                            >
                              {showAllCompanies ? "Thu gọn" : `Xem thêm (${companies.length - 5})`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ══ SECTION 2: THƯ VIỆN (Customer / Khách hàng) ══ */}
                    <div style={{ borderTop: "0.5px solid #E5E7EB", paddingTop: 12, marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 6px 2px" }}>
                        <div
                          onClick={() => {
                            setActiveSpace("customer");
                            setActiveCustomerId(null);
                            setSelectedFolderId("root");
                          }}
                          style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", userSelect: "none" }}
                        >
                          <span
                            onClick={(e) => { e.stopPropagation(); setLibraryExpanded(!libraryExpanded); }}
                            style={{ color: "#9CA3AF", display: "inline-flex", alignItems: "center" }}
                          >
                            {libraryExpanded ? ChevronDown : ChevronRight}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: activeSpace === "customer" && !activeCustomerId ? "#185FA5" : "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT }}>Khách hàng</span>
                        </div>
                        <button type="button"
                          onClick={() => { if (!requireCompany()) return; createTemplateForm.resetFields(); setIsCreateTemplateOpen(true); }}
                          style={{ fontSize: 11, color: "#185FA5", fontWeight: 500, border: "none", background: "transparent", cursor: "pointer", padding: "0 2px", fontFamily: FONT }}
                        >+ Tạo</button>
                      </div>
                      {libraryExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {filteredCustomers.length === 0 ? (
                            <div style={{ padding: "4px 10px" }}>
                              <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Chưa có khách hàng</Text>
                            </div>
                          ) : (
                            (showAllCustomers ? filteredCustomers : filteredCustomers.slice(0, 5)).map((ref) => {
                              const refId = String(extractId(ref));
                              const isActive = activeSpace === "customer" && refId === activeCustomerId;
                              const filesCount = documents.filter(doc => String(getRecordCustomerId(doc)) === refId && !doc.isDeleted).length;
                              const foldersCount = folders.filter(f => String(getRecordCustomerId(f)) === refId && !f.isDeleted).length;
                              const totalRefCount = filesCount + foldersCount;
                              return (
                                <div key={refId} style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                                  <button type="button"
                                    onClick={() => openCustomerDetail(refId)}
                                    style={{
                                      flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                                      border: "0", borderRadius: 8, cursor: "pointer",
                                      borderLeft: isActive ? "2px solid #185FA5" : "2px solid transparent",
                                      background: isActive ? "#E6F1FB" : "transparent",
                                      color: isActive ? "#185FA5" : "#6B7280",
                                      fontFamily: FONT, minWidth: 0, transition: "background 0.15s", textAlign: "left"
                                    }}
                                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#F3F4F6"; }}
                                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setContextMenuState({
                                        open: true,
                                        x: e.clientX,
                                        y: e.clientY,
                                        record: { ...ref, _type: "customer_record" }
                                      });
                                    }}
                                  >
                                    <span style={{ width: 15, height: 15, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: isActive ? "#185FA5" : "#6B7280" }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V3.5A2.5 2.5 0 0 1 6.5 1H20v21H6.5" />
                                      </svg>
                                    </span>
                                    <Tooltip title={ref.customerName || ref.name || getCustomerDisplayName(ref)} placement="right" mouseEnterDelay={0.5}>
                                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ref.customerName || ref.name || getCustomerDisplayName(ref)}</span>
                                    </Tooltip>
                                    {totalRefCount > 0 && (
                                      <span style={{
                                        fontSize: 11,
                                        background: isActive ? "#FFFFFF" : "#F3F4F6",
                                        color: isActive ? "#185FA5" : "#6B7280",
                                        padding: "1px 6px", borderRadius: 99, flexShrink: 0
                                      }}>
                                        {totalRefCount}
                                      </span>
                                    )}
                                  </button>

                                  {/* Render root folders of this customer when active */}
                                  {isActive && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 12, marginTop: 2 }}>
                                      {customerRootFolders.map((folder) => {
                                        const fid = String(extractId(folder.id));
                                        const isFolderActive = selectedFolderId === fid;
                                        return (
                                          <button
                                            key={fid}
                                            type="button"
                                            onClick={() => {
                                              setActiveSpace("customer");
                                              setActiveCustomerId(refId);
                                              setSelectedFolderId(fid);
                                            }}
                                            onContextMenu={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setContextMenuState({
                                                open: true,
                                                x: e.clientX,
                                                y: e.clientY,
                                                record: { ...folder, _type: "folder" }
                                              });
                                            }}
                                            style={{
                                              width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                                              border: "0", borderRadius: 8, cursor: "pointer",
                                              background: isFolderActive ? "#E6F1FB" : "transparent",
                                              color: isFolderActive ? "#185FA5" : "#6B7280",
                                              fontWeight: isFolderActive ? 600 : 400, fontFamily: FONT, fontSize: 12,
                                              transition: "background 0.15s", minWidth: 0, textAlign: "left"
                                            }}
                                            onMouseEnter={(e) => { if (!isFolderActive) e.currentTarget.style.background = "#F3F4F6"; }}
                                            onMouseLeave={(e) => { if (!isFolderActive) e.currentTarget.style.background = "transparent"; }}
                                          >
                                            <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                                              {React.cloneElement(TYPE_ICONS.folder, { size: 13 })}
                                            </span>
                                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                              {folder.name}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                          {filteredCustomers.length > 5 && (
                            <button
                              type="button"
                              onClick={() => setShowAllCustomers(!showAllCustomers)}
                              style={{
                                fontSize: 11, color: "#185FA5", background: "transparent", border: "none", cursor: "pointer",
                                padding: "6px 10px", textAlign: "left", fontWeight: 500, fontFamily: FONT
                              }}
                            >
                              {showAllCustomers ? "Thu gọn" : `Xem thêm (${filteredCustomers.length - 5})`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ══ SECTION 3: MY WORKSPACE (Personal) ══ */}
                    <div style={{ borderTop: "0.5px solid #E5E7EB", paddingTop: 12, marginTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 6px 2px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span
                            onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
                            style={{ color: "#9CA3AF", display: "inline-flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}
                          >
                            {workspaceExpanded ? ChevronDown : ChevronRight}
                          </span>
                          <span
                            onClick={() => {
                              setActiveSpace("personal");
                              setActiveCustomerId(null);
                              setSelectedFolderId("root");
                            }}
                            style={{ fontSize: 10, fontWeight: 600, color: activeSpace === "personal" ? "#185FA5" : "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT, cursor: "pointer", userSelect: "none" }}
                          >
                            My Workspace
                          </span>
                        </div>
                        <button type="button"
                          onClick={() => handleCreateFolderFromSidebar("personal")}
                          style={{ fontSize: 11, color: "#185FA5", fontWeight: 500, border: "none", background: "transparent", cursor: "pointer", padding: "0 2px", fontFamily: FONT }}
                        >+ Tạo</button>
                      </div>
                      {workspaceExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {/* Render root folders of My Workspace (indented) */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 12 }}>
                            {personalRootFolders.length === 0 ? (
                              <Text style={{ fontSize: 12, color: "#9CA3AF", padding: "4px 10px", display: "block", fontStyle: "italic" }}>Chưa có thư mục</Text>
                            ) : (
                              (showAllPersonalFolders ? personalRootFolders : personalRootFolders.slice(0, 5)).map((folder) => {
                                const fid = String(extractId(folder.id));
                                const isFolderActive = activeSpace === "personal" && selectedFolderId === fid;
                                return (
                                  <button
                                    key={fid}
                                    type="button"
                                    onClick={() => {
                                      setActiveSpace("personal");
                                      setActiveCustomerId(null);
                                      setSelectedFolderId(fid);
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setContextMenuState({
                                        open: true,
                                        x: e.clientX,
                                        y: e.clientY,
                                        record: { ...folder, _type: "folder" }
                                      });
                                    }}
                                    style={{
                                      width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                                      border: "0", borderRadius: 8, cursor: "pointer",
                                      background: isFolderActive ? "#E6F1FB" : "transparent",
                                      color: isFolderActive ? "#185FA5" : "#6B7280",
                                      fontWeight: isFolderActive ? 600 : 400, fontFamily: FONT, fontSize: 12,
                                      transition: "background 0.15s", minWidth: 0, textAlign: "left"
                                    }}
                                    onMouseEnter={(e) => { if (!isFolderActive) e.currentTarget.style.background = "#F3F4F6"; }}
                                    onMouseLeave={(e) => { if (!isFolderActive) e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                                      {React.cloneElement(TYPE_ICONS.folder, { size: 13 })}
                                    </span>
                                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {folder.name}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                            {personalRootFolders.length > 5 && (
                              <button
                                type="button"
                                onClick={() => setShowAllPersonalFolders(!showAllPersonalFolders)}
                                style={{
                                  fontSize: 11, color: "#185FA5", background: "transparent", border: "none", cursor: "pointer",
                                  padding: "6px 10px", textAlign: "left", fontWeight: 500, fontFamily: FONT
                                }}
                              >
                                {showAllPersonalFolders ? "Thu gọn" : `Xem thêm (${personalRootFolders.length - 5})`}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ══ SECTION 4: NHANH (Quick/Recent/Trash) ══ */}
                    <div style={{ borderTop: "0.5px solid #E5E7EB", paddingTop: 12, marginTop: 12 }}>
                      <div style={{ padding: "0 2px 6px 2px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT }}>Nhanh</span>
                      </div>

                      {/* ① Lịch sử hoạt động */}
                      {(() => {
                        const isActive = activeSpace === "recent";
                        return (
                          <button type="button" onClick={() => { setActiveSpace("recent"); setActiveCustomerId(null); setSelectedFolderId("root"); }}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                              border: "0", borderRadius: 8, cursor: "pointer",
                              borderLeft: isActive ? "2px solid #185FA5" : "2px solid transparent",
                              background: isActive ? "#E6F1FB" : "transparent",
                              color: isActive ? "#185FA5" : "#6B7280",
                              fontFamily: FONT, minWidth: 0, transition: "background 0.15s", textAlign: "left", marginBottom: 2
                            }}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#F3F4F6"; }}
                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#185FA5" : "#6B7280"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Lịch sử hoạt động</span>
                          </button>
                        );
                      })()}

                      {/* ② Thùng rác */}
                      {(() => {
                        const isActive = activeSpace === "trash";
                        const trashCount = quickTrashCount;
                        return (
                          <button type="button" onClick={() => { setActiveSpace("trash"); setActiveCustomerId(null); setSelectedFolderId("root"); }}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                              border: "0", borderRadius: 8, cursor: "pointer",
                              borderLeft: isActive ? "2px solid #185FA5" : "2px solid transparent",
                              background: isActive ? "#E6F1FB" : "transparent",
                              color: isActive ? "#185FA5" : "#6B7280",
                              fontFamily: FONT, minWidth: 0, transition: "background 0.15s", textAlign: "left"
                            }}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#F3F4F6"; }}
                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#185FA5" : "#6B7280"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Thùng rác</span>
                            {trashCount > 0 && (
                              <span style={{
                                fontSize: 11,
                                background: isActive ? "#FFFFFF" : "#F3F4F6",
                                color: isActive ? "#185FA5" : "#6B7280",
                                padding: "1px 6px", borderRadius: 99, flexShrink: 0
                              }}>
                                {trashCount}
                              </span>
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  </React.Fragment>
                )}

              </div>
            </Sider>
          )}

          <Layout style={{ background: "#fff", minWidth: 0 }}>
            {/* ── TOPBAR ── */}
            <div style={{ padding: "10px 20px", borderBottom: "0.5px solid #E5E7EB", display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap", background: "#FFFFFF", minWidth: 0, overflowX: "auto" }}>
              {sidebarCollapsed && (
                <Tooltip title="Mở sidebar">
                  <Button icon={SIDEBAR_ICON} onClick={() => setSidebarCollapsed(false)} aria-label="Mở sidebar"
                    style={{ width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "0.5px solid #E5E7EB", flex: "0 0 auto" }} />
                </Tooltip>
              )}

              <div style={{ flex: "1 1 auto", minWidth: 8 }} />

              {/* Filters */}
              {activeSpace === "recent" ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "0 0 auto", minWidth: "max-content", flexWrap: "nowrap" }}>
                  <Input.Search
                    placeholder="Tìm kiếm hoạt động..."
                    value={activitySearchQuery}
                    onChange={(e) => {
                      setActivitySearchQuery(e.target.value);
                      setActivityPage(1);
                    }}
                    style={{ width: 260, borderRadius: 8 }}
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
                      { value: "all", label: "Tất cả hoạt động" },
                      { value: "uploaded", label: "Tải lên tài liệu" },
                      { value: "previewed", label: "Xem trước" },
                      { value: "downloaded", label: "Tải về" },
                      { value: "shared_file", label: "Chia sẻ tài liệu" },
                      { value: "unshared_file", label: "Hủy chia sẻ" },
                      { value: "permission_updated", label: "Cập nhật phân quyền" },
                      { value: "created", label: "Tạo mới thư mục" },
                      { value: "updated", label: "Cập nhật khác" },
                      { value: "moved", label: "Di chuyển" },
                      { value: "trash_deleted", label: "Xóa vào Thùng rác" },
                      { value: "restored", label: "Khôi phục" },
                      { value: "deleted", label: "Xóa vĩnh viễn" },
                    ]}
                  />
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "0 0 auto", minWidth: "max-content", flexWrap: "nowrap" }}>
                  <Input.Search placeholder="Tìm kiếm..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 260, borderRadius: 8 }} allowClear />
                  <Select value={sortMode} onChange={setSortMode} style={{ width: 140, borderRadius: 8 }}
                    options={[
                      { value: "manual", label: <span style={{ display: "inline-flex", alignItems: "center", paddingTop: 1 }}>STT</span> },
                      { value: "newest", label: <span style={{ display: "inline-flex", alignItems: "center", paddingTop: 1 }}>Mới nhất</span> },
                      { value: "oldest", label: <span style={{ display: "inline-flex", alignItems: "center", paddingTop: 1 }}>Cũ nhất</span> },
                      { value: "name", label: <span style={{ display: "inline-flex", alignItems: "center", paddingTop: 1 }}>Tên A-Z</span> },
                    ]}
                  />
                  <Select allowClear placeholder="Định dạng" style={{ width: 140, borderRadius: 8 }} value={selectedExt} onChange={setSelectedExt} options={fileExtOptions} />
                  <div style={{ display: "inline-flex", gap: 3, padding: 3, border: "0.5px solid #E5E7EB", borderRadius: 8, background: "#FAFAFA" }}>
                    <Tooltip title="Lưới">
                      <Button aria-label="Lưới" icon={GRID_ICON} onClick={() => setViewMode("grid")}
                        style={{ width: 32, height: 28, borderRadius: 6, border: "none", background: viewMode === "grid" ? "#185FA5" : "transparent", color: viewMode === "grid" ? "#fff" : "#6B7280" }} />
                    </Tooltip>
                    <Tooltip title="Bảng">
                      <Button aria-label="Bảng" icon={TABLE_ICON} onClick={() => setViewMode("table")}
                        style={{ width: 32, height: 28, borderRadius: 6, border: "none", background: viewMode === "table" ? "#185FA5" : "transparent", color: viewMode === "table" ? "#fff" : "#6B7280" }} />
                    </Tooltip>
                  </div>
                </div>
              )}

              <div style={{ width: 1, height: 20, background: "#E5E7EB", flexShrink: 0 }} />

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "0 0 auto", flexWrap: "nowrap" }}>
                {activeSpace === "recent" ? (
                  <Button icon={REFRESH_ICON} onClick={fetchActivityLogs} loading={activityLoading}
                    style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#185FA5", fontWeight: 500, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    Refresh
                  </Button>
                ) : (
                  <React.Fragment>
                    {activeSpace !== "trash" && (currentFolderPerms.canEdit || currentFolderPerms.isManager || isCustomerRoot) && (
                      <Dropdown menu={isCustomerRoot ? {
                        items: [{ key: "create_customer", label: renderNewMenuLabel(TYPE_ICONS.folder, "Tạo khách hàng") }],
                        onClick: () => { if (requireCompany()) { createTemplateForm.resetFields(); setIsCreateTemplateOpen(true); } }
                      } : newMenu} trigger={["click"]}>
                        <Button type="primary" icon={PLUS_ICON}
                          style={{ background: "#185FA5", borderColor: "#185FA5", borderRadius: 8, fontWeight: 600 }}>
                          New
                        </Button>
                      </Dropdown>
                    )}
                    <Button icon={REFRESH_ICON} onClick={loadData} loading={loading}
                      style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#185FA5", fontWeight: 500, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      Refresh
                    </Button>
                  </React.Fragment>
                )}
              </div>
            </div>

            <Content
              style={{ padding: 20, overflowY: "auto", overflowX: "hidden", background: "#F9FAFB", minWidth: 0 }}
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
                      showTotal: (total, range) => `${range[0]}–${range[1]} / ${total} hoạt động`,
                    }}
                    locale={{
                      emptyText: (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="Không tìm thấy lịch sử hoạt động nào"
                          style={{ padding: "40px 0" }}
                        />
                      )
                    }}
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                      overflow: "hidden"
                    }}
                  />
                </div>
              ) : (
                <React.Fragment>
                  {/* ── BREADCRUMB ── */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
                    {breadcrumbs.map((item, index) => {
                      const isCurrent = index === breadcrumbs.length - 1;
                      return (
                        <React.Fragment key={item.id}>
                          {index > 0 && <span style={{ color: "#9CA3AF", fontSize: 13, userSelect: "none" }}>›</span>}
                          <button type="button" onClick={() => handleBreadcrumbClick(item)}
                            style={{
                              border: 0, background: "transparent", borderRadius: 6,
                              padding: "3px 6px", cursor: "pointer", fontFamily: FONT,
                              fontSize: 13,
                              fontWeight: isCurrent ? 600 : 400,
                              color: isCurrent ? "#111827" : "#6B7280",
                              textDecoration: "none",
                              transition: "color 0.15s",
                            }}
                            onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.textDecoration = "underline"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                          >{item.name}</button>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {selectedRowKeys.length > 0 && !isCustomerRoot && (
                    <div style={{
                      background: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      padding: "10px 16px",
                      marginBottom: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                      fontFamily: FONT,
                    }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span style={{ fontWeight: 500, color: "#374151", fontSize: 13 }}>
                          Đã chọn <strong style={{ color: "#111827", fontWeight: 600 }}>{selectedRowKeys.length}</strong> mục
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <Button
                          size="small"
                          type="text"
                          onClick={() => setSelectedRowKeys([])}
                          style={{ borderRadius: 6, fontSize: 12, color: "#6B7280", fontFamily: FONT, padding: "4px 8px" }}
                        >
                          Bỏ chọn
                        </Button>
                        <div style={{ width: 1, height: 16, background: "#E5E7EB" }} />
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
                              Khôi phục
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
                              Xóa
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
                              Di chuyển
                            </Button>
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
                              Xóa
                            </Button>
                          </React.Fragment>
                        )}
                      </div>
                    </div>
                  )}

                  {viewMode === "grid" ? (
                    <React.Fragment>
                      {tableData.length === 0 ? (
                        <div style={{ padding: "80px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            <line x1="12" y1="11" x2="12" y2="17" /><polyline points="9 14 12 17 15 14" />
                          </svg>
                          <div style={{ fontSize: 15, fontWeight: 500, color: "#6B7280", fontFamily: FONT }}>
                            {isCustomerRoot ? "Chưa có khách hàng nào" :
                              (activeSpace === "trash" ? "Thùng rác trống" :
                                (query ? "Không tìm thấy kết quả" : "Thư mục trống"))}
                          </div>
                          <div style={{ fontSize: 13, color: "#9CA3AF", fontFamily: FONT }}>
                            {isCustomerRoot ? "Nhấn + Tạo khách hàng bên dưới để bắt đầu" :
                              (activeSpace === "trash" ? "Không có file hay thư mục nào bị xóa" :
                                (query ? "Thử tìm với từ khóa khác" : "Nhấn + New để tạo thư mục hoặc tải lên tài liệu đầu tiên"))}
                          </div>
                          {isCustomerRoot ? (
                            <button type="button" onClick={() => { createTemplateForm.resetFields(); setIsCreateTemplateOpen(true); }}
                              style={{ padding: "8px 18px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
                              + Tạo khách hàng
                            </button>
                          ) : (activeSpace !== "trash" && !query) && (
                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                              <button type="button" onClick={() => setIsUploadOpen(true)}
                                style={{ padding: "8px 18px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                + Thêm tài liệu
                              </button>
                              <button type="button" onClick={() => { folderForm.resetFields(); setIsFolderOpen(true); }}
                                style={{ padding: "8px 18px", background: "transparent", color: "#185FA5", border: "1px solid #185FA5", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                + Thêm thư mục
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <React.Fragment>
                          {/* ── Section: Khách hàng ── */}
                          {tableData.some(r => r._type === "customer_record") && (
                            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                              {tableData.filter(r => r._type === "customer_record").map((record) => {
                                const refId = String(extractId(record));
                                const filesCount = documents.filter(doc => String(getRecordCustomerId(doc)) === refId && !doc.isDeleted).length;
                                const foldersCount = folders.filter(f => String(getRecordCustomerId(f)) === refId && !f.isDeleted).length;
                                return (
                                  <Col {...CUSTOMER_COL_PROPS} key={record._key}>
                                    <Card
                                      hoverable
                                      onClick={() => openCustomerDetail(record)}
                                      onContextMenu={(e) => {
                                        e.preventDefault(); e.stopPropagation();
                                        setContextMenuState({
                                          open: true,
                                          x: e.clientX,
                                          y: e.clientY,
                                          record: { ...record, _type: "customer_record" }
                                        });
                                      }}
                                      style={{
                                        borderRadius: 12, border: "0.5px solid #E5E7EB", cursor: "pointer", height: "100%",
                                        borderLeft: "3px solid #185FA5", background: "#FFFFFF"
                                      }}
                                      bodyStyle={{ padding: "16px", display: "flex", flexDirection: "column", gap: 8, height: "100%" }}
                                    >
                                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", whiteSpace: "normal", wordBreak: "normal", overflowWrap: "anywhere", lineHeight: 1.45 }}>
                                        {record.customerName || record.name || getCustomerDisplayName(record)}
                                      </div>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4, fontSize: 12, color: "#6B7280" }}>
                                        <div>
                                          <span style={{ color: "#9CA3AF" }}>Mã KH: </span>
                                          <strong>{record.customerCode || record.code || extractId(record)}</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: "#9CA3AF" }}>Case liên kết: </span>
                                          <span>{(record.cases || []).length}</span>
                                        </div>
                                      </div>
                                      <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "0.5px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>Tài nguyên:</span>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: "#185FA5" }}>
                                          {foldersCount} Thư mục · {filesCount} file
                                        </span>
                                      </div>
                                    </Card>
                                  </Col>
                                );
                              })}
                            </Row>
                          )}

                          {/* ── Section: Thư mục ── */}
                          {tableData.some(r => r._type === "folder") && (
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", marginBottom: 10, fontFamily: FONT }}>Thư mục</div>
                          )}
                          <Row gutter={[10, 10]} style={{ marginBottom: tableData.some(r => r._type === "file") && tableData.some(r => r._type === "folder") ? 20 : 0 }}>
                            {tableData.filter(r => r._type === "folder").map((record) => {
                              const folderFileCount = permissionFilteredDocs.filter(
                                (d) => String(extractId(d.folderId) || "") === String(extractId(record))
                              ).length;
                              const folderSubFolderCount = permissionFilteredFolders.filter(
                                (f) => String(getFolderParentId(f) || "") === String(extractId(record))
                              ).length;
                              const folderIsEditing = editingTitleId === String(extractId(record));
                              const isEmpty = folderFileCount === 0 && folderSubFolderCount === 0;
                              return (
                                <Col {...GRID_COL_PROPS} key={record._key}>
                                  <div style={{ position: "relative", height: "100%" }}>
                                    <Checkbox
                                      checked={selectedRowKeys.includes(record._key)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setSelectedRowKeys(prev => checked ? [...prev, record._key] : prev.filter(k => k !== record._key));
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}
                                    />
                                    <Card
                                      hoverable
                                      draggable={activeSpace !== "trash"}
                                      onDragStart={(event) => { if (activeSpace !== "trash") rowDragProps(record).onDragStart(event); }}
                                      onDragOver={(event) => { if (activeSpace !== "trash") rowDragProps(record).onDragOver(event); }}
                                      onDrop={(event) => { if (activeSpace !== "trash") rowDragProps(record).onDrop(event); }}
                                      onClick={() => { if (!folderIsEditing && activeSpace !== "trash") setSelectedFolderId(String(extractId(record))); }}
                                      onContextMenu={(e) => {
                                        e.preventDefault(); e.stopPropagation();
                                        const items = renderContextMenuItems(record);
                                        if (items.length > 0) setContextMenuState({ open: true, x: e.clientX, y: e.clientY, record });
                                      }}
                                      style={{
                                        borderRadius: 12, border: "0.5px solid #E5E7EB", cursor: "pointer", height: "100%",
                                        borderLeft: !isEmpty ? "2px solid #185FA5" : "0.5px solid #E5E7EB",
                                      }}
                                      bodyStyle={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8, height: "100%" }}
                                    >
                                      {/* Icon */}
                                      <div style={{
                                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                                        background: isEmpty ? "#F3F4F6" : "#E6F1FB",
                                        color: isEmpty ? "#9CA3AF" : "#185FA5",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                      }}>
                                        {TYPE_ICONS.folder}
                                      </div>

                                      {/* Name */}
                                      {folderIsEditing ? (
                                        <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                                          <Input size="small" value={editingTitleValue} autoFocus onChange={(e) => setEditingTitleValue(e.target.value)} onPressEnter={() => handleSaveFileTitle(record)} style={{ flex: 1 }} />
                                          <Button size="small" type="primary" icon={CHECK_ICON} onClick={(e) => { e.stopPropagation(); handleSaveFileTitle(record); }} />
                                          <Button size="small" icon={CLOSE_ICON} onClick={(e) => { e.stopPropagation(); cancelEditTitle(); }} />
                                        </div>
                                      ) : (
                                        <Tooltip title={record.name || "Folder"} placement="top">
                                          <div style={{ fontWeight: 600, fontSize: 12, color: "#111827", whiteSpace: "normal", lineHeight: "1.45", wordBreak: "normal", overflowWrap: "anywhere" }}>
                                            {record.name || "Folder"}
                                          </div>
                                        </Tooltip>
                                      )}

                                      {/* Empty state or count + meta */}
                                      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                                        {activeSpace === "trash" ? (
                                          <React.Fragment>
                                            <span style={{ fontSize: 10, color: "#6B7280", fontFamily: FONT, whiteSpace: "normal", overflowWrap: "anywhere" }} title={getRecordPathString(record)}>
                                              Nguồn: {getRecordPathString(record)}
                                            </span>
                                            <span style={{ fontSize: 10, color: "#6B7280", fontFamily: FONT, whiteSpace: "normal", overflowWrap: "anywhere" }} title={getDeletedUserName(record)}>
                                              Người xoá: {getDeletedUserName(record)}
                                            </span>
                                            <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: FONT }}>
                                              Ngày xoá: {formatDate(record.deletedAt || record.updatedAt || record.deleted_at)}
                                            </span>
                                          </React.Fragment>
                                        ) : (
                                          <React.Fragment>
                                            {isEmpty ? (
                                              <div onClick={(e) => e.stopPropagation()}>
                                                <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: FONT }}>Chưa có tài liệu</div>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setIsUploadOpen(true); }}
                                                  style={{ fontSize: 11, color: "#185FA5", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: FONT }}>
                                                  + Tải lên file đầu tiên
                                                </button>
                                              </div>
                                            ) : (
                                              <span style={{ fontSize: 11, fontWeight: 600, color: "#185FA5" }}>
                                                {folderSubFolderCount} Thư mục · {folderFileCount} file
                                              </span>
                                            )}
                                            <div style={{ display: "flex", flexDirection: "column", marginTop: 2 }}>
                                              <span style={{ fontSize: 10, color: "#6B7280", fontFamily: FONT }}>
                                                Ngày tạo: {formatDate(record.createdAt || record.updatedAt)}
                                              </span>
                                              <span style={{ fontSize: 10, color: "#6B7280", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getUploadUserName(record)}>
                                                Người tạo: {getUploadUserName(record)}
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

                          {/* ── Section: Tài liệu ── */}
                          {tableData.some(r => r._type === "file") && (
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", marginBottom: 10, fontFamily: FONT }}>Tài liệu</div>
                          )}
                          <Row gutter={[10, 10]}>
                            {tableData.filter(r => r._type === "file").map((record) => {
                              const fileIsEditing = editingTitleId === String(extractId(record));
                              const cardFileName = (() => { const att = getAttachment(record); return att?.title || att?.filename || record.googleDriveUrl || "Chưa có file đính kèm"; })();
                              const cardHasFile = !!getRecordFileUrl(record);
                              const ext = getFileExtension(record);

                              const EXT_BADGE = {
                                ".pdf": { bg: "#FCEBEB", color: "#A32D2D", label: "PDF" },
                                ".doc": { bg: "#E6F1FB", color: "#185FA5", label: "DOC" },
                                ".docx": { bg: "#E6F1FB", color: "#185FA5", label: "DOCX" },
                                ".xls": { bg: "#EAF3DE", color: "#3B6D11", label: "XLS" },
                                ".xlsx": { bg: "#EAF3DE", color: "#3B6D11", label: "XLSX" },
                                ".ppt": { bg: "#FAEEDA", color: "#854F0B", label: "PPT" },
                                ".pptx": { bg: "#FAEEDA", color: "#854F0B", label: "PPTX" },
                                ".png": { bg: "#F0FDF4", color: "#3B6D11", label: "PNG" },
                                ".jpg": { bg: "#F0FDF4", color: "#3B6D11", label: "JPG" },
                                ".jpeg": { bg: "#F0FDF4", color: "#3B6D11", label: "JPEG" },
                                ".gif": { bg: "#F0FDF4", color: "#3B6D11", label: "GIF" },
                                ".webp": { bg: "#F0FDF4", color: "#3B6D11", label: "WEBP" },
                                ".svg": { bg: "#F0FDF4", color: "#3B6D11", label: "SVG" },
                                ".mp4": { bg: "#F3F4F6", color: "#6B7280", label: "MP4" },
                                ".zip": { bg: "#F3F4F6", color: "#6B7280", label: "ZIP" },
                                ".rar": { bg: "#F3F4F6", color: "#6B7280", label: "RAR" },
                                ".txt": { bg: "#F3F4F6", color: "#6B7280", label: "TXT" },
                                ".csv": { bg: "#EAF3DE", color: "#3B6D11", label: "CSV" },
                              };
                              const extInfo = EXT_BADGE[ext] || { bg: "#F3F4F6", color: "#6B7280", label: (ext || "FILE").replace(".", "").toUpperCase() };

                              return (
                                <Col {...GRID_COL_PROPS} key={record._key}>
                                  <div style={{ position: "relative", height: "100%" }}>
                                    <Checkbox
                                      checked={selectedRowKeys.includes(record._key)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setSelectedRowKeys(prev => checked ? [...prev, record._key] : prev.filter(k => k !== record._key));
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}
                                    />
                                    <div
                                      draggable={activeSpace !== "trash"}
                                      onDragStart={(event) => { if (activeSpace !== "trash") rowDragProps(record).onDragStart(event); }}
                                      onDragOver={(event) => { if (activeSpace !== "trash") rowDragProps(record).onDragOver(event); }}
                                      onDrop={(event) => { if (activeSpace !== "trash") rowDragProps(record).onDrop(event); }}
                                      onContextMenu={(e) => {
                                        e.preventDefault(); e.stopPropagation();
                                        const items = renderContextMenuItems(record);
                                        if (items.length > 0) setContextMenuState({ open: true, x: e.clientX, y: e.clientY, record });
                                      }}
                                      style={{ position: "relative", borderRadius: 12, border: "0.5px solid #E5E7EB", background: "#fff", cursor: "pointer", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "box-shadow 0.15s, border-color 0.15s", display: "flex", flexDirection: "column", minHeight: 190, height: "100%" }}
                                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "#D1D5DB"; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#E5E7EB"; }}
                                      onClick={() => { if (cardHasFile && !fileIsEditing) previewRecordFile(record); }}
                                    >
                                      {/* Thumbnail */}
                                      <div style={{ flex: 1, background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", borderBottom: "0.5px solid #F0F0F0" }}>
                                        {getFileSvgIcon(ext)}
                                        {/* Extension badge */}
                                        <span style={{ position: "absolute", bottom: 6, right: 8, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: extInfo.color, background: extInfo.bg, borderRadius: 4, padding: "2px 5px", textTransform: "uppercase" }}>
                                          {extInfo.label}
                                        </span>
                                      </div>

                                      {/* Info */}
                                      <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                                        {fileIsEditing ? (
                                          <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                                            <Input size="small" value={editingTitleValue} autoFocus onChange={(e) => setEditingTitleValue(e.target.value)} onPressEnter={() => handleSaveFileTitle(record)} style={{ flex: 1, fontSize: 10 }} />
                                            <Button size="small" type="primary" icon={CHECK_ICON} onClick={(e) => { e.stopPropagation(); handleSaveFileTitle(record); }} />
                                            <Button size="small" icon={CLOSE_ICON} onClick={(e) => { e.stopPropagation(); cancelEditTitle(); }} />
                                          </div>
                                        ) : (
                                          <Tooltip title={cardFileName} placement="top">
                                            <div style={{ fontWeight: 600, fontSize: 11, color: cardHasFile ? "#111827" : "#6B7280", whiteSpace: "normal", wordBreak: "normal", overflowWrap: "anywhere", lineHeight: "16px" }}>
                                              {cardFileName}
                                            </div>
                                          </Tooltip>
                                        )}
                                        {activeSpace === "trash" ? (
                                          <div style={{ fontSize: 10, color: "#6B7280", lineHeight: "14px" }}>
                                            <div style={{ whiteSpace: "normal", overflowWrap: "anywhere" }} title={getRecordPathString(record)}>Nguồn: {getRecordPathString(record)}</div>
                                            <div style={{ whiteSpace: "normal", overflowWrap: "anywhere" }} title={getDeletedUserName(record)}>Người xoá: {getDeletedUserName(record)}</div>
                                            <div style={{ whiteSpace: "normal", overflowWrap: "anywhere", color: "#9CA3AF" }}>Ngày xoá: {formatDate(record.deletedAt || record.updatedAt || record.deleted_at)}</div>
                                          </div>
                                        ) : (
                                          <div style={{ fontSize: 10, color: "#6B7280", lineHeight: "14px" }}>
                                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Ngày tạo: {formatDate(record.uploadedAt || record.createdAt || getDocDate(record))}</div>
                                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getUploadUserName(record)}>Người tạo: {getUploadUserName(record)}</div>
                                          </div>
                                        )}
                                      </div>
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
                      rowSelection={isCustomerRoot ? undefined : {
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                      }}
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
                              {query ? "Không tìm thấy kết quả" : (activeSpace === "trash" ? "Thùng rác trống" : "Thư mục trống")}
                            </div>
                          </div>
                        )
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
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Tạo thư mục</span>}
          open={isFolderOpen}
          onCancel={() => { setIsFolderOpen(false); folderForm.resetFields(); }}
          footer={null}
          destroyOnClose
        >
          <Text type="secondary">Vị trí: {breadcrumbs.map((item) => item.name).join(" / ")}</Text>
          <Form form={folderForm} layout="vertical" onFinish={handleCreateFolder} style={{ marginTop: 16 }}>
            <Form.Item name="name" label="Tên thư mục" rules={[{ required: true, message: "Vui lòng nhập tên thư mục" }]}>
              <Input placeholder="Nhập tên thư mục..." />
            </Form.Item>
            <Form.Item name="description" label="Mô tả">
              <Input.TextArea rows={3} placeholder="Mô tả ngắn..." />
            </Form.Item>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button onClick={() => setIsFolderOpen(false)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={folderLoading} style={{ borderRadius: 8, background: "#111827", borderColor: "#111827" }}>Tạo thư mục</Button>
            </div>
          </Form>
        </Modal>

        <Modal
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Upload tài liệu</span>}
          open={isUploadOpen}
          onCancel={() => { setIsUploadOpen(false); uploadForm.resetFields(); setUploadFileList([]); }}
          width={760}
          footer={[
            <Button key="cancel" onClick={() => setIsUploadOpen(false)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Hủy</Button>,
            <Button key="submit" type="primary" loading={uploadLoading} onClick={handleUploadSubmit} style={{ borderRadius: 8, background: "#111827", borderColor: "#111827" }}>Upload</Button>,
          ]}
          destroyOnClose
        >
          <Form form={uploadForm} layout="vertical" initialValues={{ documentType: activeTypeId }}>
            <div style={{ display: "grid", gridTemplateColumns: activeSpace === "document_type" ? "1fr 1fr" : "1fr", gap: 12 }}>
              {activeSpace === "document_type" && (
                <Form.Item name="documentType" label="Loại tài liệu" rules={[{ required: true, message: "Vui lòng chọn loại tài liệu" }]}>
                  <Select optionLabelProp="label">
                    {documentTypes.map((type) => (
                      <Select.Option key={type.id} value={type.id} label={type.label}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, paddingTop: 1 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", color: type.color }}>{type.svgIcon}</span>
                          <span>{type.label}</span>
                        </div>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
              <Form.Item name="googleDriveUrl" label="Google Drive URL" style={{ width: "100%" }}>
                <Input placeholder="Dán URL nếu không upload file" />
              </Form.Item>
            </div>
            <Form.Item name="description" label="Mô tả">
              <Input.TextArea rows={2} placeholder="Mô tả ngắn..." />
            </Form.Item>
            <Form.Item label="File đính kèm">
              <Dragger
                fileList={uploadFileList}
                beforeUpload={() => false}
                onChange={({ fileList }) => setUploadFileList(fileList.slice(-1))}
                maxCount={1}
              >
                <p style={{ fontSize: 22, margin: "4px 0", color: "#6b7280" }}>{TYPE_ICONS.upload}</p>
                <p style={{ margin: 0 }}>Kéo thả hoặc click để chọn file</p>
              </Dragger>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Upload thư mục</span>}
          open={bulkConfirmOpen}
          onCancel={() => { if (bulkUploading) return; setBulkConfirmOpen(false); setPendingFolderFiles([]); }}
          footer={[
            <Button key="cancel" disabled={bulkUploading} onClick={() => setBulkConfirmOpen(false)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Hủy</Button>,
            <Button key="submit" type="primary" loading={bulkUploading} onClick={executeFolderUpload} style={{ borderRadius: 8, background: "#111827", borderColor: "#111827" }}>Xác nhận Upload</Button>,
          ]}
        >
          <Text>Đã chọn {pendingFolderFiles.length} file từ thư mục bên ngoài.</Text>
          <div style={{ marginTop: 16 }}>
            <Text strong>Upload vào:</Text>
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
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Di chuyển</span>}
          open={!!moveRecord}
          onCancel={() => setMoveRecord(null)}
          footer={[
            <Button key="cancel" onClick={() => setMoveRecord(null)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Hủy</Button>,
            <Button key="submit" type="primary" onClick={() => handleMoveRecord(moveRecord, moveTargetId)} style={{ borderRadius: 8, background: "#111827", borderColor: "#111827" }}>Di chuyển</Button>,
          ]}
        >
          <Text>Chọn thư mục đích cho <b>{moveRecord?._type === "folder" ? moveRecord?.name : getDocTitle(moveRecord)}</b></Text>
          <TreeSelect
            value={moveTargetId}
            onChange={setMoveTargetId}
            treeData={moveTreeData}
            style={{ width: "100%", marginTop: 14 }}
            treeDefaultExpandAll
          />
        </Modal>

        <Modal
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Tạo khách hàng</span>}
          open={isCreateTemplateOpen}
          onCancel={() => { setIsCreateTemplateOpen(false); createTemplateForm.resetFields(); }}
          footer={null}
          destroyOnClose
        >
          <Form form={createTemplateForm} layout="vertical" onFinish={handleCreateCustomer}>
            <Form.Item
              name="title"
              label="Tên khách hàng"
              rules={[{ required: true, message: "Vui lòng nhập tên khách hàng" }]}
            >
              <Input placeholder="Nhập tên khách hàng..." />
            </Form.Item>
            <Form.Item name="description" label="Ghi chú">
              <Input.TextArea rows={3} placeholder="Ghi chú ngắn..." />
            </Form.Item>
            <Form.Item
              name="sourceCaseId"
              label="Case nguồn / Case gốc"
              extra="Chọn case/dự án nguồn liên quan đến khách hàng này."
            >
              <Select
                placeholder="Chọn case nguồn..."
                allowClear
                optionFilterProp="label"
                style={{ width: "100%" }}
                onChange={(value) => {
                  if (value) {
                    const selectedProj = projects.find(p => String(extractId(p)) === String(value));
                    if (selectedProj) {
                      const code = selectedProj.caseCode ? selectedProj.caseCode.trim() : "";
                      const name = selectedProj.projectName ? selectedProj.projectName.trim() : "";
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
                        description: selectedProj.description || ""
                      });
                    }
                  } else {
                    createTemplateForm.setFieldsValue({ title: "", description: "" });
                  }
                }}
              >
                {projects.filter(p => !usedProjectIds.has(String(extractId(p)))).map((proj) => {
                  const pid = String(extractId(proj));
                  const label = proj.projectName ? `${proj.caseCode ? `[${proj.caseCode}] ` : ""}${proj.projectName}` : `Case #${pid}`;
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
              label="Các case liên kết hiện tại"
              extra="Chọn các case đang chạy trong hệ thống để liên kết với khách hàng này."
            >
              <Select
                mode="multiple"
                placeholder="Chọn case liên kết..."
                allowClear
                optionFilterProp="label"
                style={{ width: "100%" }}
              >
                {projects.filter(p => !usedProjectIds.has(String(extractId(p)))).map((proj) => {
                  const pid = String(extractId(proj));
                  const label = proj.projectName ? `${proj.caseCode ? `[${proj.caseCode}] ` : ""}${proj.projectName}` : `Case #${pid}`;
                  return (
                    <Select.Option key={pid} value={pid} label={label}>
                      {label}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button onClick={() => setIsCreateTemplateOpen(false)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={createTemplateLoading} style={{ borderRadius: 8, background: "#185FA5", borderColor: "#185FA5" }}>Tạo</Button>
            </div>
          </Form>
        </Modal>

        <Modal
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Chỉnh sửa mục tài liệu</span>}
          open={!!editTemplateRecord}
          onCancel={() => { setEditTemplateRecord(null); editTemplateForm.resetFields(); }}
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
              label="Tiêu đề"
              rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
            >
              <Input placeholder="Nhập tiêu đề..." />
            </Form.Item>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button onClick={() => setEditTemplateRecord(null)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={editTemplateLoading} style={{ borderRadius: 8, background: "#111827", borderColor: "#111827" }}>Lưu</Button>
            </div>
          </Form>
        </Modal>

        <Modal
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Đổi tên</span>}
          open={!!renameRecord}
          onCancel={() => { setRenameRecord(null); renameForm.resetFields(); }}
          onOk={handleRenameSubmit}
          okText="Lưu"
          cancelText="Hủy"
          destroyOnClose
        >
          <Form form={renameForm} layout="vertical">
            <Form.Item name="name" label="Tên mới" rules={[{ required: true, message: "Vui lòng nhập tên" }]}>
              <Input placeholder="Nhập tên mới..." />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Liên kết Case Tham Chiếu</span>}
          open={isLinkCaseOpen}
          onCancel={() => { setIsLinkCaseOpen(false); setLinkCaseRecord(null); linkCaseForm.resetFields(); }}
          footer={[
            <Button key="cancel" onClick={() => { setIsLinkCaseOpen(false); setLinkCaseRecord(null); linkCaseForm.resetFields(); }} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Hủy</Button>,
            <Button key="submit" type="primary" loading={linkCaseLoading} onClick={() => linkCaseForm.submit()} style={{ borderRadius: 8, background: "#185FA5", borderColor: "#185FA5" }}>Lưu liên kết</Button>,
          ]}
          destroyOnClose
        >
          <Form form={linkCaseForm} layout="vertical" onFinish={handleLinkCaseSubmit}>
            <Form.Item
              name="caseIds"
              label="Chọn các Case/Dự án đang chạy liên kết"
              extra="Danh sách được lấy từ các dự án hiện có trong hệ thống."
            >
              <Select
                mode="multiple"
                placeholder="Chọn case..."
                allowClear
                optionFilterProp="label"
                style={{ width: "100%" }}
              >
                {projects.filter(p => !usedProjectIds.has(String(extractId(p))) || activeLinkedIds.has(String(extractId(p)))).map((proj) => {
                  const pid = String(extractId(proj));
                  const label = proj.projectName ? `${proj.caseCode ? `[${proj.caseCode}] ` : ""}${proj.projectName}` : `Case #${pid}`;
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
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Di chuyển nhiều mục</span>}
          open={isBulkMoveOpen}
          onCancel={() => setIsBulkMoveOpen(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsBulkMoveOpen(false)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Hủy</Button>,
            <Button key="submit" type="primary" onClick={handleBulkMoveSubmit} style={{ borderRadius: 8, background: "#185FA5", borderColor: "#185FA5" }}>Di chuyển</Button>,
          ]}
        >
          <Text>Chọn thư mục đích cho <b>{selectedRowKeys.length} mục đã chọn</b></Text>
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
        />

        <FolderPermissionsModal
          open={!!permissionFolder}
          folder={permissionFolder}
          onClose={() => setPermissionFolder(null)}
          onSuccess={() => {
            setPermissionFolder(null);
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
