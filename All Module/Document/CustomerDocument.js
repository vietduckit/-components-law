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

    // ── Name field relation trong document/folder trỏ về "parent" ─────────────
    // Thứ tự: field chính → các alias fallback (dùng khi thử tạo record)
    relationFieldCandidates: [
      "customerId",       // field chính (array/object)
      "customers",        // belongsTo relation field
      "customer",         // singular fallback
    ],

    // ── Hàm lấy ID of parent từ 1 record folder/document ───────────────────
    getParentIdFromRecord: (record) =>
      extractId(record?.customerId) ||
      extractRelationId(record?.customers) ||
      extractRelationId(record?.customer),

    // ── Hàm lấy ID of parent từ 1 record sidebar (Legal Reference / Customer) ─
    getParentListId: (record) =>
      extractId(record?.customerId) ||
      extractRelationId(record?.customers) ||
      extractRelationId(record?.customer) ||
      extractId(record?.customerRecord) ||
      extractId(record?.id),

    // ── Nhãn hiển thị trong UI ────────────────────────────────────────────────
    label: {
      sidebar: "Customers",          // title sidebar
      sidebarItem: "Customers",      // tên 1 item trong sidebar
      createButton: "Create new customer",
      searchPlaceholder: "Search customers...",
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

  // Root-only permission model — ported from Library.js (see
  // nocobase-docs/library-js-architecture-reference.md §3). Every folder
  // tree has exactly one root (the topmost ancestor via parentId — no Case
  // boundary needed here, unlike Library.js, since CustomerDocument.js's
  // trees are scoped by customerId only). Only the ROOT folder's own
  // folderManager/folderMembers rows are ever consulted — subfolders no
  // longer carry their own grants, so granting/revoking access at the root
  // immediately applies to (or removes access from) the entire subtree.
  // The old per-subfolder "check own rows, else inherit from parent" model
  // let a subfolder carry an independent grant that bypassed the root's
  // permissions entirely — that was the actual bug this fixes.
  const roleToPerms = (role) => ({
    role,
    canView: role !== null,
    canCreate: ["admin", "owner", "manager", "editor", "viewer"].includes(role),
    canRename: ["admin", "owner", "manager", "editor"].includes(role),
    canMove: ["admin", "owner", "manager", "editor"].includes(role),
    canDelete: ["admin", "owner", "manager", "editor"].includes(role),
    canShare: ["admin", "owner", "manager", "editor"].includes(role),
    canManagePermissions: ["admin", "owner", "manager"].includes(role),
    // Legacy field names — every existing call site in this file destructures
    // isManager/isMember/canEdit, so keep them so nothing else needs to change.
    isManager: ["admin", "owner", "manager"].includes(role),
    isMember: role !== null,
    canEdit: ["admin", "owner", "manager", "editor"].includes(role),
  });

  // 3-tier capability set for folder Members (viewer/editor/contributed) —
  // matches Library.js's MEMBER_ROLE_CAPABILITIES byte-for-byte. Members
  // only ever get these tiers, never "manager" (a Member row with
  // role: "manager" shouldn't occur — Managers live in folderManagers).
  const MEMBER_ROLE_CAPABILITIES = {
    viewer: { canCreate: true, canRename: false, canMove: false, canDelete: false, canShare: false, canEdit: false },
    editor: { canCreate: true, canRename: true, canMove: false, canDelete: false, canShare: true, canEdit: true },
    contributed: { canCreate: true, canRename: true, canMove: true, canDelete: true, canShare: true, canEdit: true },
  };
  const getMemberRoleTierPerms = (role) => {
    const capabilities = MEMBER_ROLE_CAPABILITIES[role];
    if (!capabilities) return roleToPerms(null);
    return { role, canView: true, canManagePermissions: false, isManager: false, isMember: true, ...capabilities };
  };

  const resolveFolderTreeRoot = (folder, allFolders) => {
    if (!folder) return null;
    const folderById = new Map((allFolders || []).map((f) => [String(extractId(f.id)), f]));
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
      current = parent;
    }
    return current;
  };

  // Whether `folder` is itself the root of its tree — gates the
  // "Permissions" action so it only ever appears at the root, never on a
  // subfolder (matches Library.js: subfolder folderManager/folderMembers
  // rows are never read, so editing them there would silently do nothing).
  const isFolderTreeRoot = (folder) => {
    if (!folder) return false;
    const parentId = extractId(folder.parentId);
    return !parentId || parentId === "root";
  };

  // Level-2 grants (Customer trees only) — a folder directly under a
  // Customer root may carry its own folderManagers/folderMembers rows,
  // checked BEFORE falling back to the Customer root. Non-customer trees
  // (Company Shared, Personal) are intentionally left untouched — strictly
  // root-only. Ported from Library.js's resolvePermissionFolder (there
  // scoped to Case trees via getFolderCaseProjectId; here scoped to
  // Customer trees via getRecordCustomerId, since this file has no Case
  // boundary of its own).
  const resolvePermissionFolder = (folder, allFolders) => {
    if (!folder) return null;
    const root = resolveFolderTreeRoot(folder, allFolders) || folder;
    const rootId = String(extractId(root));
    if (String(extractId(folder)) === rootId) return root;
    if (!getRecordCustomerId(root)) return root;

    const folderById = new Map((allFolders || []).map((f) => [String(extractId(f.id)), f]));
    let current = folder;
    let level2 = null;
    const visited = new Set();
    while (current) {
      const parentId = String(extractId(current.parentId) || "");
      if (parentId === rootId) {
        level2 = current;
        break;
      }
      if (!parentId || parentId === "root" || visited.has(parentId)) break;
      visited.add(parentId);
      const parent = folderById.get(parentId);
      if (!parent) break;
      current = parent;
    }

    if (level2) {
      const hasOwnGrant =
        getFolderManagerRows(level2).length > 0 || getFolderMemberRows(level2).length > 0;
      if (hasOwnGrant) return level2;
    }

    return root;
  };

  // Gates the "Permissions" UI action. True for a Customer tree's absolute
  // root OR any of its direct (level-2) children; matches
  // resolvePermissionFolder's scoping. Non-customer trees keep the old
  // root-only gating (isFolderTreeRoot).
  const isPermissionBearingFolder = (folder, allFolders) => {
    if (!folder) return false;
    if (isFolderTreeRoot(folder)) return true;
    const root = resolveFolderTreeRoot(folder, allFolders) || folder;
    if (!getRecordCustomerId(root)) return false;
    const parentId = String(extractId(folder.parentId) || "");
    return parentId !== "" && parentId === String(extractId(root));
  };

  const getFolderPermissions = (folder, user, allFolders, currentLawyerId) => {
    if (isAdminUser(user)) return roleToPerms("admin");
    if (!folder) return roleToPerms("admin");
    if (!user) return roleToPerms(null);

    const uid = extractId(user.id);
    const lwId = extractId(currentLawyerId);
    const root = resolvePermissionFolder(folder, allFolders) || folder;

    // Owner check (Nocobase user ID) — the ROOT folder's creator, not the
    // specific subfolder's.
    if (uid && String(extractId(root.createdById)) === String(uid)) {
      return roleToPerms("owner");
    }

    if (lwId) {
      const managers = getFolderManagerRows(root);
      const isExplicitManager = managers.some(
        (m) => String(getPermissionLawyerId(m)) === String(lwId),
      );
      if (isExplicitManager) return roleToPerms("manager");

      const members = getFolderMemberRows(root);
      const explicitMember = members.find(
        (m) => String(getPermissionLawyerId(m)) === String(lwId),
      );
      if (explicitMember) {
        return getMemberRoleTierPerms(getPermissionRole(explicitMember, "viewer"));
      }
    }

    return roleToPerms(null);
  };

  // File permissions = its parent folder's permissions (root-only model —
  // a document never carries its own grant, only the folder it's in does).
  const getFilePermissions = (file, folder, user, allFolders, currentLawyerId) =>
    folder ? getFolderPermissions(folder, user, allFolders, currentLawyerId) : roleToPerms(null);

  // Back-compat boolean wrapper — every existing call site just needs a
  // yes/no. Keeps the "uploader can always manage their own file" bypass
  // that predates this permission-model sync (not part of Library.js's
  // model, which has no such bypass — kept intentionally so an existing
  // Viewer's own uploads don't regress from editable to read-only).
  const canManageFile = (file, folder, user, allFolders, currentLawyerId) => {
    if (!user) return false;
    const perms = getFilePermissions(file, folder, user, allFolders, currentLawyerId);
    if (perms.isManager || perms.canEdit) return true;
    if (extractId(file.createdById) === extractId(user.id)) return true;
    return false;
  };

  // Root-only visibility: a folder is visible to a user iff the ROOT of its
  // tree grants them access (owner of the root, or an explicit manager/
  // member row on the root). Replaces the old "direct grant + cascade to
  // descendants" approach, which let a subfolder's own (bogus, unread-
  // elsewhere) grant rows make it independently visible.
  const getVisibleFolderIds = (allFolders, currentUser, currentLawyerId) => {
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
      const root = resolvePermissionFolder(folder, allFolders) || folder;
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

    const entitled = new Set();
    allFolders.forEach((f) => {
      if (hasRootGrant(resolveRoot(f))) entitled.add(extractId(f.id));
    });

    return { accessible: entitled, entitled };
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
    // Delete tất cả các field relation khỏi payload (dựa trên DASHBOARD_CONFIG)
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
    // customerId is a flat scalar FK column on documents/folders (confirmed
    // in pgsql/log_activity_documents.sql's f."customerId" and
    // JsField/Search/Filter/CaseSearchFilter.js's parseInt(form.customerId)
    // note) — there is no "customer"/"customers" association to filter on,
    // so nested { customers: { id: { $eq } } } candidates 500 with a
    // Sequelize "Invalid value" cast error instead of just finding no rows.
    return [
      { customerId: { $eq: id } },
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
    if (!attachment?.id) throw new Error("Upload failed");
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

  // Same de-dup convention used across the Document module (Library.js,
  // CaseDocument.js, TaskDetailView.js): on a case-insensitive name
  // collision, append " (1)", " (2)", ... — never silently overwrite.
  const getUniqueFileName = (fileName, existingNames) => {
    const raw = String(fileName || "").trim();
    if (!raw) return raw;
    const taken = new Set(
      Array.from(existingNames || [], (n) => String(n || "").trim().toLowerCase()),
    );
    if (!taken.has(raw.toLowerCase())) return raw;
    const dotIndex = raw.lastIndexOf(".");
    const base = dotIndex > 0 ? raw.slice(0, dotIndex) : raw;
    const ext = dotIndex > 0 ? raw.slice(dotIndex) : "";
    let counter = 1;
    let candidate = `${base} (${counter})${ext}`;
    while (taken.has(candidate.toLowerCase())) {
      counter += 1;
      candidate = `${base} (${counter})${ext}`;
    }
    return candidate;
  };

  // Folder counterpart — no extension handling, same suffix convention.
  const getUniqueFolderName = (name, existingNames) => {
    const raw = String(name || "").trim();
    if (!raw) return raw;
    const taken = new Set(
      Array.from(existingNames || [], (n) => String(n || "").trim().toLowerCase()),
    );
    if (!taken.has(raw.toLowerCase())) return raw;
    let counter = 1;
    let candidate = `${raw} (${counter})`;
    while (taken.has(candidate.toLowerCase())) {
      counter += 1;
      candidate = `${raw} (${counter})`;
    }
    return candidate;
  };

  // External OS drag-drop helpers (ported from Library.js §5.4) — reading
  // real files/folders dropped from Explorer/Finder via the HTML5
  // DataTransferItem API, with a fallback for browsers that don't expose
  // getAsEntry/webkitGetAsEntry (treats every dropped item as a flat file).
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
        writable: true,
        configurable: true,
      });
    } catch {
      try {
        file._dropRelativePath = String(relativePath || file.name).replace(/^\/+/, "");
      } catch {}
    }
    return file;
  };

  const readDirectoryEntries = async (directoryEntry) => {
    const reader = directoryEntry.createReader();
    const entries = [];
    while (true) {
      const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      entries.push(...batch);
    }
    return entries;
  };

  const readDroppedEntry = async (entry, parentPath, files, folderPaths) => {
    const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
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

    return { files, folderPaths: Array.from(folderPaths), hasDirectories: folderPaths.size > 0 };
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
              Download
            </Button>
          ),
          <Button key="close" onClick={onClose}>Close</Button>,
        ].filter(Boolean)}
      >
        {/* Spinner nền */}
        {!isText && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 0 }}>
            <Spin tip="Loading preview..." />
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
              Your browser does not support video playback.
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
              Your browser does not support audio playback.
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
                {textContent != null ? `${textContent.split("\n").length} lines · ${textContent.length} characters` : ""}
              </span>
            </div>
            {/* Content */}
            <div style={{ flex: 1, overflow: "auto", background: getMonoBackground() }}>
              {textLoading && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#ccc" }}>
                  <Spin tip="Loading content..." />
                </div>
              )}
              {textError && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
                  <Empty description={<span style={{ color: "#aaa" }}>Unable to load file content</span>} />
                  <Button icon={DOWNLOAD_ICON} onClick={() => window.open(fullUrl, "_blank")} style={{ borderColor: "#555", color: "#ccc", background: "transparent" }}>
                    Download to view
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
            <Empty description="This document has no file or URL to preview" />
          </div>
        )}

        {/* ── UNSUPPORTED FORMAT ── */}
        {fullUrl && !isPdf && !isHtml && !isImage && !isOffice && !isExternalPreview && !isVideo && !isAudio && !isText && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", position: "relative", zIndex: 1, gap: 12 }}>
            <div style={{ fontSize: 48 }}>📎</div>
            <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 15, color: "#374151" }}>
              Cannot preview format <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>{fileExt || "this"}</code>
            </div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>Download to open with a suitable application</div>
            <Button type="primary" icon={DOWNLOAD_ICON} style={{ marginTop: 8 }} onClick={() => window.open(fullUrl, "_blank")}>
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
  // Single Manager (folderManagers, one row) + role-tiered Members
  // (folderMembers: viewer/editor/contributed) — ported from Library.js's
  // PermissionManagerModal/loadFolderPermissions/saveFolderPermissions,
  // replacing the old "multiple managers mixed into one flat list" shape.
  // Opened for the tree ROOT or any of its direct (level-2) children —
  // see isPermissionBearingFolder — and always reads/writes directly on
  // whichever folder was passed in (`folder.id`), never resolved further,
  // since the trigger button itself is already scoped to grant-bearing
  // folders only.
  const FolderPermissionsModal = ({ open, folder, onClose, onSuccess }) => {
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
        const managerRow = (mgRes?.data?.data || [])[0];
        const memberRows = mbRes?.data?.data || [];
        setManagerId(managerRow ? String(getPermissionLawyerId(managerRow)) : null);
        setShares(
          memberRows
            .map((row) => ({
              id: String(getPermissionLawyerId(row)),
              role: getPermissionRole(row, "viewer"),
              lawyerData: getRelationLawyerRecord(row),
            }))
            .filter((s) => s.id && s.id !== "undefined"),
        );
        setPendingLawyerIds([]);
      });
    }, [open, folder]);

    const handleSave = async () => {
      setSaving(true);
      try {
        const folderId = extractId(folder.id);

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
        if (managerId) {
          createPromises.push(
            ctx.api.request({ url: "folderManagers:create", method: "POST", data: { folderId, lawyerId: Number(managerId), role: "manager" } }),
          );
        }
        shares.forEach((s) => {
          createPromises.push(
            ctx.api.request({ url: "folderMembers:create", method: "POST", data: { folderId, lawyerId: Number(s.id), role: s.role } }),
          );
        });

        await Promise.all(createPromises);
        message.success("Permissions updated successfully");
        onSuccess();
      } catch (e) {
        message.error("An error occurred while updating permissions");
      }
      setSaving(false);
    };

    const handleAddLawyers = (selectedIds = pendingLawyerIds) => {
      const ids = Array.isArray(selectedIds) ? selectedIds : [selectedIds].filter(Boolean);
      if (!ids.length) return;
      const existingIds = new Set(shares.map((s) => String(s.id)));
      const nextShares = [...shares];
      ids.forEach((lawyerId) => {
        const safeLawyerId = String(extractId(lawyerId));
        if (!safeLawyerId || safeLawyerId === String(managerId) || existingIds.has(safeLawyerId)) return;
        existingIds.add(safeLawyerId);
        const lawyerData = availableLawyers.find((l) => String(extractId(l.id)) === safeLawyerId) || {};
        nextShares.push({ id: safeLawyerId, role: "viewer", lawyerData });
      });
      setShares(nextShares);
      setPendingLawyerIds([]);
    };

    const handleChangeRole = (lawyerId, newRole) => {
      setShares(shares.map((s) => String(s.id) === String(lawyerId) ? { ...s, role: newRole } : s));
    };

    const handleRemoveShare = (lawyerId) => {
      setShares(shares.filter((s) => String(s.id) !== String(lawyerId)));
    };

    const lawyerOptions = availableLawyers.map((l) => ({ value: String(extractId(l.id)), label: getLawyerDisplayName(l) }));

    return (
      <Modal
        open={open}
        onCancel={onClose}
        title={<span style={{ fontFamily: FONT }}>Folder permissions: {folder?.name || ""}</span>}
        width={520}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={onClose} style={{ fontFamily: FONT }}>Cancel</Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSave} style={{ fontFamily: FONT }}>Save</Button>,
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
              if (val) setShares((prev) => prev.filter((s) => String(s.id) !== String(val)));
            }}
            filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
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
            options={lawyerOptions.filter((o) => o.value !== managerId && !shares.some((s) => String(s.id) === o.value))}
            value={pendingLawyerIds}
            onChange={handleAddLawyers}
            filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
          />
        </div>
        <div style={{ fontFamily: FONT }}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>Members</div>
          {shares.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No members added yet" />
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
                        {s.role === "editor" ? "Editor" : s.role === "contributed" ? "Contributed" : "Viewer"}
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
                        { value: "viewer", label: "Viewer" },
                        { value: "editor", label: "Editor" },
                        { value: "contributed", label: "Contributed" },
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

  // Metadata modal for the native multi-file picker upload flow — ported
  // from Library.js's DocumentUploadFieldsModal. Replaces the old single-
  // file Modal+Form+Dragger (and its create-time Google Drive URL field,
  // deliberately dropped to match Library.js — old records with a
  // googleDriveUrl still preview/display fine, only the create path lost
  // the field). "Group into a new folder" only appears when ≥ 2 files are
  // picked at once.
  const DocumentUploadFieldsModal = ({ open, files = [], onClose, onSubmit, defaultDocumentType = "" }) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [uploadMode, setUploadMode] = useState("separate");

    useEffect(() => {
      if (open) {
        form.resetFields();
        setUploadMode("separate");
        if (files.length === 1) {
          const rawName = files[0].name;
          const dotIndex = rawName.lastIndexOf(".");
          const nameWithoutExt = dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
          form.setFieldsValue({ title: nameWithoutExt, documentType: defaultDocumentType });
        } else {
          form.setFieldsValue({ documentType: defaultDocumentType });
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
            📎 Document information {files.length > 1 ? `(${files.length} file)` : ""}
          </span>
        }
        footer={[
          <Button key="cancel" onClick={onClose} disabled={submitting} style={{ fontFamily: FONT }}>Cancel</Button>,
          <Button key="ok" type="primary" loading={submitting} onClick={handleOk} style={{ fontFamily: FONT }}>Upload</Button>,
        ]}
      >
        <Form form={form} layout="vertical" style={{ fontFamily: FONT }}>
          <div style={{ fontFamily: FONT, marginBottom: 12, fontSize: 12, color: "#6B7280" }}>
            Selected files: <b>{fileNames || "—"}</b>
            {files.length > 1 && (
              <div style={{ marginTop: 4 }}>
                The information below will apply to all {files.length} files (document name will default to the file name if left blank).
              </div>
            )}
          </div>
          {files.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <Radio.Group value={uploadMode} onChange={(e) => setUploadMode(e.target.value)} style={{ fontFamily: FONT }}>
                <Radio value="separate">Upload as separate files</Radio>
                <Radio value="grouped">Group into a new folder</Radio>
              </Radio.Group>
              {uploadMode === "grouped" && (
                <Form.Item
                  name="groupFolderName"
                  label="Folder name"
                  style={{ marginTop: 8, marginBottom: 0 }}
                  rules={[{ required: true, message: "Please enter a folder name" }]}
                >
                  <Input allowClear placeholder="Enter new folder name..." style={{ fontFamily: FONT }} />
                </Form.Item>
              )}
            </div>
          )}
          {uploadMode !== "grouped" && (
            <React.Fragment>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="documentType" label="Document type">
                    <Input allowClear placeholder="e.g. Contract, Meeting minutes..." style={inpStyle} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="title" label="Document name">
                    <Input allowClear placeholder="Leave blank to use the file name" style={inpStyle} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="documentCode" label="Reference No.">
                    <Input allowClear placeholder="vd: 123/2024/CT" style={inpStyle} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="openingDate" label="Issue date">
                    <Input type="date" style={dateStyle} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="signedAt" label="Signed date">
                    <Input type="date" style={dateStyle} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="effectiveAt" label="Effective date">
                    <Input type="date" style={dateStyle} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="senderName" label="Sender">
                    <Input allowClear placeholder="Sender's name/organization" style={inpStyle} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="recipientName" label="Recipient">
                    <Input allowClear placeholder="Recipient's name/organization" style={inpStyle} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} allowClear placeholder="Summarize the main content..." />
              </Form.Item>
            </React.Fragment>
          )}
        </Form>
      </Modal>
    );
  };

  // Formats any stored date value into the "YYYY-MM-DD" shape a native
  // <input type="date"> needs for its `value` — display formatting still
  // goes through formatDate().
  const toDateInputValue = (value) => (value ? String(value).slice(0, 10) : "");

  // Generic click-to-edit cell for the Table view — ported from Library.js.
  // Used by the Description column and buildDocMetaColumns() so those 8
  // metadata fields don't each need their own open/save/cancel state
  // machine. Each instance owns its own edit state via useState (not a
  // shared editingCell state).
  const InlineEditCell = ({ value, type = "text", canEdit, onSave, placeholder = "—" }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);

    const displayValue = type === "date" ? (value ? formatDate(value) : placeholder) : (value || placeholder);

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
          style={{ cursor: "pointer", display: "inline-block", minHeight: 20, borderBottom: "1px dashed transparent" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = "#D1D5DB"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = "transparent"; }}
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
          onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
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
        onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
        onClick={(e) => e.stopPropagation()}
      />
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



    const [viewMode, setViewMode] = useState("table");
    const [sortMode, setSortMode] = useState("manual");

    const [isFolderOpen, setIsFolderOpen] = useState(false);
    // Upload flow (ported from Library.js — native multi-file picker +
    // DocumentUploadFieldsModal, replacing the old single-file
    // Modal+Form+Dragger). uploadFieldsTarget holds the picked files +
    // destination folder while the metadata modal is open; the modal's
    // `open` prop is simply `!!uploadFieldsTarget`.
    const [uploadFieldsTarget, setUploadFieldsTarget] = useState(null);
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
    const [externalDropActive, setExternalDropActive] = useState(false);
    const [externalUploadInProgress, setExternalUploadInProgress] = useState(false);

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
    const fileInputRef = useRef(null);
    const [folderForm] = Form.useForm();
    const [renameRecord, setRenameRecord] = useState(null);
    const [renameForm] = Form.useForm();

    // Context Menu State
    const [contextMenuState, setContextMenuState] = useState({ open: false, x: 0, y: 0, record: null });
    const closeContextMenu = () => setContextMenuState((prev) => ({ ...prev, open: false }));

    const [spacesExpanded, setSpacesExpanded] = useState(true);
    const [libraryExpanded, setLibraryExpanded] = useState(true);

    const [showAllCompanies, setShowAllCompanies] = useState(false);
    const [showAllCustomers, setShowAllCustomers] = useState(false);

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
        { value: "all", label: "All" },
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
        message.error("Failed to load data");
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
          label: "Uploaded",
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
          label: "Previewed",
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
          label: "Downloaded",
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
          label: "Shared document",
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
          label: "Unshared",
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
          label: "Permissions updated",
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
          label: "Created",
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
          label: "Moved",
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
              label: "Moved to Trash",
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
              label: "Restored",
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
            label: "Moved",
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
          label: "Updated",
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
          label: "Deleted",
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
        status: "status",
        isDeleted: "deletion status",
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
        deleted: "deleted",
        previewed: "previewed",
        downloaded: "downloaded",
        shared_file: "shared document",
        unshared_file: "unshared document",
        permission_updated: "permissions updated",
      };

      if (action === "previewed") {
        return `Previewed ${entityName}`;
      }

      if (action === "downloaded") {
        return `Downloaded ${entityName}`;
      }

      if (action === "shared_file") {
        const sharedWith = newV || "";
        return sharedWith ? `Shared ${entityName} with ${sharedWith}` : `Shared ${entityName}`;
      }

      if (action === "unshared_file") {
        return `Unshared ${entityName}`;
      }

      if (action === "permission_updated") {
        return `Updated permissions on ${entityName}`;
      }

      if (action === "uploaded" || action === "created") {
        return isFolder ? "Created a new folder" : "Uploaded a new document";
      }

      if (action === "deleted") {
        return `Deleted ${entityName}`;
      }

      if (action === "moved") {
        const getFolderName = (id) => {
          if (!id || id === "root" || id === "0" || id === 0) return "Root folder";
          const f = foldersList.find(item => String(extractId(item.id)) === String(id));
          return f ? f.name : `Folder #${id}`;
        };
        if (oldV || newV) {
          const oldFolder = getFolderName(oldV);
          const newFolder = getFolderName(newV);
          return `Moved ${entityName} from "${oldFolder}" to "${newFolder}"`;
        }
        return `Moved ${entityName}`;
      }

      if (action === "updated") {
        if (field === "isDeleted") {
          if (newV === true || newV === "true" || newV === 1) {
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
            if (!id || id === "root" || id === "0" || id === 0) return "Root folder";
            const f = foldersList.find(item => String(extractId(item.id)) === String(id));
            return f ? f.name : `Folder #${id}`;
          };
          const oldFolder = getFolderName(oldV);
          const newFolder = getFolderName(newV);
          return `Moved from "${oldFolder}" to "${newFolder}"`;
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

        if (activitySearchQuery.trim()) {
          const q = activitySearchQuery.toLowerCase();
          const userName = (log.changedByName || "System").toLowerCase();
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

    // Trash is filtered by "who deleted it" (deletedById if present, else
    // the updatedById stamped at delete time), NOT by folder permission
    // like every other view — a Manager doesn't see items a Member of the
    // same folder deleted. Admin sees everything. Matches Library.js §5.8.
    const canViewTrashRecord = useCallback((record) => {
      if (isAdminUser(currentUserState)) return true;
      const deleterId = extractId(record.deletedById) || extractId(record.updatedById);
      if (!deleterId) return false;
      const uid = extractId(currentUserState?.id);
      const lwId = extractId(currentLawyerId);
      return (uid && String(deleterId) === String(uid)) || (lwId && String(deleterId) === String(lwId));
    }, [currentUserState, currentLawyerId]);

    const quickTrashCount = useMemo(
      () =>
        quickScopeFolders.filter((f) => f.isDeleted === true && canViewTrashRecord(f)).length +
        quickScopeDocs.filter((d) => d.isDeleted === true && canViewTrashRecord(d)).length,
      [quickScopeFolders, quickScopeDocs, canViewTrashRecord],
    );

    const visibleDocs = useMemo(() => {
      if (activeSpace === "trash") {
        return quickScopeDocs.filter((doc) => doc.isDeleted === true && canViewTrashRecord(doc));
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
    }, [companyDocs, documents, activeSpace, activeCustomerId, currentLawyerId, isCustomerDetailMode, initialCustomerContext.customerId, quickScopeDocs, customerScopeDocs, canViewTrashRecord]);

    const visibleFolders = useMemo(() => {
      if (activeSpace === "trash") {
        return quickScopeFolders.filter((f) => f.isDeleted === true && canViewTrashRecord(f));
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
    }, [companyFolders, folders, activeSpace, activeCustomerId, isCustomerDetailMode, initialCustomerContext.customerId, quickScopeFolders, customerScopeFolders, canViewTrashRecord]);


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

    // Root of the active customer's own folder tree — resolved purely by
    // structural boundary (customerId field + parentId not found within
    // this customer's own fetched folder scope), same pattern
    // ProjectDocument.js's activeCaseRootFolder uses. No name-matching, no
    // "must already have children" requirement — both of those caused real
    // bugs (a folder could keep matching by name after being renamed away
    // from the customer's own name; a freshly-created empty root folder
    // like "Lead hôn nhân" wouldn't be recognized at all until it had a
    // child). If a customer somehow has more than one boundary-qualifying
    // folder, the earliest-created one is treated as THE root for
    // auto-expand/breadcrumb purposes — the others still show up as normal
    // rows, nothing is hidden.
    const activeCustomerRootFolder = useMemo(() => {
      if (activeSpace !== "customer" || !activeCustomerIdValue) return null;

      const customerFolders = permissionFilteredFolders.filter(
        (folder) => String(getRecordCustomerId(folder) || "") === String(activeCustomerIdValue),
      );
      const customerFolderIdSet = new Set(
        customerFolders.map((folder) => String(extractId(folder))),
      );
      const rootCandidates = customerFolders.filter((folder) => {
        if (folder.isDeleted) return false;
        const parentId = getFolderParentId(folder);
        return (
          !parentId ||
          parentId === "root" ||
          !customerFolderIdSet.has(String(parentId))
        );
      });
      if (!rootCandidates.length) return null;
      return [...rootCandidates].sort(sortByCreatedAt)[0];
    }, [activeSpace, activeCustomerIdValue, permissionFilteredFolders]);

    const activeCustomerRootFolderId = useMemo(
      () => extractId(activeCustomerRootFolder),
      [activeCustomerRootFolder],
    );

    // Readonly "Manager: ... / Member: ..." summary shown below the
    // breadcrumb — ported from Library.js, adapted to resolve through
    // resolvePermissionFolder rather than the pure tree root: a level-2
    // folder (direct child of the Customer root) can carry its own
    // manager/member grant (see resolvePermissionFolder above), and the
    // label should reflect whoever actually controls what's being browsed,
    // not always the absolute root — which would otherwise show empty (or
    // a stale/unrelated owner list) for a level-2 folder that was granted
    // access directly, a real case in this file's existing data.
    //
    // In "customer" space, `selectedFolderId` is the literal sentinel
    // "root" (not the actual root folder's id) whenever the user is AT the
    // customer's document root — same convention `handleCreateFolder`/
    // `handleFileInputTrigger`/etc. already resolve via
    // `activeCustomerRootFolderId`.
    const currentRootFolderPermissionSummary = useMemo(() => {
      if (["personal", "trash", "recent"].includes(activeSpace)) return null;
      const effectiveFolderId =
        activeSpace === "customer" && selectedFolderId === "root" && activeCustomerRootFolderId
          ? activeCustomerRootFolderId
          : selectedFolderId;
      if (effectiveFolderId === "root") return null;
      const folder = visibleFolders.find((f) => String(extractId(f)) === String(effectiveFolderId));
      if (!folder) return null;
      const grantFolder = resolvePermissionFolder(folder, visibleFolders) || folder;
      const managerNames = getFolderManagerRows(grantFolder)
        .map((row) => getLawyerDisplayName(getRelationLawyerRecord(row)))
        .filter(Boolean);
      const memberNames = getFolderMemberRows(grantFolder)
        .map((row) => getLawyerDisplayName(getRelationLawyerRecord(row)))
        .filter(Boolean);
      return { managerNames, memberNames };
    }, [selectedFolderId, activeSpace, visibleFolders, activeCustomerRootFolderId]);

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
        rootName = activeCompany ? getCompanyName(activeCompany) : "Shared folder";
      } else if (activeSpace === "customer") {
        // In customer-detail mode the "Documents" tab already establishes
        // the context, so the leading "Customer" crumb is pure clutter —
        // start the breadcrumb empty (auto-expand's virtual root keeps it
        // that way at "root") and let it fill in only once the user is
        // actually inside a real subfolder.
        const items = isCustomerDetailMode
          ? []
          : [
              { id: "customer_root", name: "Customer" },
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
        rootName = "Activity log";
      } else if (activeSpace === "trash") {
        rootName = "Trash";
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

    // Sidebar list of the active customer's own top-level folder(s) —
    // always the literal boundary-of-scope folders (never collapsed into
    // "children of the root"), so whichever folder activeCustomerRootFolder
    // picks for auto-expand still shows up here as a clickable entry.
    const customerRootFolders = useMemo(() => {
      const customerId = activeCustomerId || initialCustomerContext.customerId;
      if (!customerId) return [];
      const customerFolders = folders.filter(
        (f) => !f.isDeleted && String(getRecordCustomerId(f)) === String(customerId),
      );
      // A folder whose parentId points outside this customer's own folder
      // set (e.g. a stale reference left over from before the customerId
      // filter fix, or a parent that now lives in a different scope — such
      // as the shared "Customers" category root folder, which carries no
      // customerId of its own) is treated as root here too — same boundary
      // check activeCustomerRootFolder/tableData use.
      const customerFolderIds = new Set(customerFolders.map((f) => String(extractId(f.id))));
      return customerFolders.filter((f) => {
        const pId = getFolderParentId(f);
        const isRootChild = !pId || pId === "root" || !customerFolderIds.has(String(pId));
        if (!isRootChild) return false;
        const currentUser = currentUserState;
        if (!currentUser) return true;
        if (isAdminUser(currentUser)) return true;
        const { accessible } = getVisibleFolderIds(folders, currentUser, currentLawyerId);
        return accessible.has(extractId(f.id));
      });
    }, [folders, activeCustomerId, initialCustomerContext.customerId, currentUserState, currentLawyerId]);

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
        dynamicRootTitle = activeCompany ? getCompanyName(activeCompany) : "Shared folder";
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
      message.warning("Please select an internal company first");
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
        message.success("Linked customer created successfully!");
        setIsCreateTemplateOpen(false);
        createTemplateForm.resetFields();
        loadData();
      } catch (e) {
        console.error(e);
        message.error("Failed to create linked customer");
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
        message.success("Customer updated successfully!");
        setEditTemplateRecord(null);
        editTemplateForm.resetFields();
        loadData();
      } catch (e) {
        message.error("Update failed");
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
          message.warning("Please select a customer to link");
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
        message.success("Case link updated successfully");
        setIsLinkCaseOpen(false);
        setLinkCaseRecord(null);
        linkCaseForm.resetFields();
        loadData();
      } catch (e) {
        console.error("Case linking error:", e);
        message.error("Case linking error");
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
        const siblingFolderNames = visibleFolders
          .filter((f) => !f.isDeleted && String(getFolderParentId(f) || "") === String(parentId || ""))
          .map((f) => f.name)
          .filter(Boolean);
        const payload = {
          name: getUniqueFolderName(values.name.trim(), siblingFolderNames),
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

    // Upload flow (ported from Library.js §5.2): native multi-file picker
    // → handleFileInputTrigger checks permission on the target folder and
    // opens DocumentUploadFieldsModal → handleConfirmUploadFields creates
    // the "grouped" folder first if chosen, then calls uploadFilesToTarget
    // — the single function every upload source in this file funnels
    // through, so file-name dedup only has to live in one place.
    const handleFileInputTrigger = (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = null;
      if (!files.length) return;
      const targetFolderId =
        activeSpace === "customer" && selectedFolderId === "root" && activeCustomerRootFolderId
          ? activeCustomerRootFolderId
          : selectedFolderId;
      const folderRecord = visibleFolders.find((f) => String(extractId(f.id)) === String(targetFolderId));
      const perms = getFolderPermissions(folderRecord || null, currentUserState, visibleFolders, currentLawyerId);
      if (!perms.canCreate) {
        message.warning("You don't have permission to upload documents to this folder");
        return;
      }
      setUploadFieldsTarget({ files, folderId: targetFolderId });
    };

    const uploadFilesToTarget = async (selectedFiles, options = {}) => {
      const filesToUpload = Array.from(selectedFiles || []).filter(Boolean);
      if (!filesToUpload.length) return true;
      if (activeSpace !== "personal" && !isCustomerDetailMode && !requireCompany()) return false;

      const targetFolderId = normalizeParentId(options.folderId);
      setUploadLoading(true);
      try {
        const userId = getCurrentUserId();
        let nextIndex = await getNextFileIndex(targetFolderId);

        const metadata = options.metadata || null;
        const applyTitleOverride = metadata?.title && filesToUpload.length === 1;

        // Auto-version filenames that collide with a file already sitting
        // in this same target folder, instead of silently creating a
        // second document that reads as an indistinguishable duplicate.
        const targetFolderKey = String(targetFolderId || "");
        const usedNames = new Set(
          documents
            .filter((doc) => !doc.isDeleted && String(extractId(doc.folderId) || "") === targetFolderKey)
            .map((doc) => doc.name || getAttachment(doc)?.filename || doc.title)
            .filter(Boolean)
            .map((n) => String(n).trim().toLowerCase()),
        );

        for (let index = 0; index < filesToUpload.length; index++) {
          const file = filesToUpload[index];
          const uniqueName = getUniqueFileName(file.name, usedNames);
          usedNames.add(uniqueName.toLowerCase());
          const attachment = await uploadAttachment(file, uniqueName);
          const nowIso = new Date().toISOString();
          const payload = {
            name: uniqueName,
            title: applyTitleOverride ? metadata.title : uniqueName,
            documentCode: metadata?.documentCode || "",
            fileIndex: nextIndex,
            fileAttachment: [{ id: attachment.id }],
            createdAt: nowIso,
            updatedAt: nowIso,
            uploadedAt: nowIso,
            uploaded_at: nowIso,
            storageType: getDbStorageType(activeSpace),
            ...(targetFolderId ? { folderId: targetFolderId } : {}),
            ...(userId ? { uploadedById: userId, createdById: userId, updatedById: userId } : {}),
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
          nextIndex += 1;
        }

        message.success(`Uploaded ${filesToUpload.length} file(s) successfully!`);
        loadData();
        return true;
      } catch (e) {
        message.error("Upload failed");
        return false;
      } finally {
        setUploadLoading(false);
      }
    };

    const handleConfirmUploadFields = async (metadata) => {
      const target = uploadFieldsTarget;
      if (!target) return;

      let targetFolderId = target.folderId;

      if (metadata.uploadMode === "grouped") {
        const parentId = normalizeParentId(targetFolderId);
        const userId = getCurrentUserId();
        const nowIso = new Date().toISOString();
        const groupSiblingFolderNames = visibleFolders
          .filter((f) => !f.isDeleted && String(getFolderParentId(f) || "") === String(parentId || ""))
          .map((f) => f.name)
          .filter(Boolean);
        const folderPayload = {
          name: getUniqueFolderName(metadata.groupFolderName.trim(), groupSiblingFolderNames),
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
        }

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

      const ok = await uploadFilesToTarget(target.files, { folderId: targetFolderId, metadata });
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
      if (activeSpace !== "personal" && !isCustomerDetailMode && !requireCompany()) return;
      setBulkUploading(true);
      setBulkProgress("Analyzing folder structure...");
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
          const relativePath = getUploadRelativePath(file);
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
        setBulkProgress(`Creating ${sortedPaths.length} folder(s)...`);

        // Per-parent sibling-name dedup — mirrors the file-loop's usedNames
        // below. Only the batch's own root parent needs seeding from real
        // data; freshly-created subfolders within this same batch have no
        // pre-existing siblings, so their set starts empty and grows only
        // from within the batch.
        const usedFolderNamesByParent = {};
        const getFolderSiblingNameSet = (parentKey) => {
          if (!usedFolderNamesByParent[parentKey]) {
            const existingNames =
              parentKey === String(rootParentId || "")
                ? visibleFolders
                    .filter((f) => !f.isDeleted && String(getFolderParentId(f) || "") === parentKey)
                    .map((f) => f.name)
                    .filter(Boolean)
                : [];
            usedFolderNamesByParent[parentKey] = new Set(
              existingNames.map((n) => String(n).trim().toLowerCase()),
            );
          }
          return usedFolderNamesByParent[parentKey];
        };

        const nowIso = new Date().toISOString();
        for (let folderIndex = 0; folderIndex < sortedPaths.length; folderIndex++) {
          const path = sortedPaths[folderIndex];
          setBulkPercent(5 + Math.round(((folderIndex + 1) / Math.max(sortedPaths.length, 1)) * 25));
          const parts = path.split("/");
          const rawFolderName = parts.pop();
          const parentPath = parts.join("/");
          const parentId = folderIdMap[parentPath] || null;
          const folderParentKey = String(parentId || "");
          const folderSiblingNames = getFolderSiblingNameSet(folderParentKey);
          const folderName = getUniqueFolderName(rawFolderName, folderSiblingNames);
          folderSiblingNames.add(folderName.toLowerCase());

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

        // Same per-parent sibling-name tracking as the folder loop above,
        // but for file names — mirrors uploadFilesToTarget's dedup so bulk
        // "Upload Folder" files also get version-suffixed on collision.
        const usedFileNamesByParent = {};
        const getFileSiblingNameSet = (parentKey) => {
          if (!usedFileNamesByParent[parentKey]) {
            const existingNames = documents
              .filter((d) => !d.isDeleted && String(extractId(d.folderId) || "") === parentKey)
              .map((d) => d.name || getAttachment(d)?.filename || d.title)
              .filter(Boolean);
            usedFileNamesByParent[parentKey] = new Set(
              existingNames.map((n) => String(n).trim().toLowerCase()),
            );
          }
          return usedFileNamesByParent[parentKey];
        };

        for (let index = 0; index < pendingFolderFiles.length; index++) {
          const file = pendingFolderFiles[index];
          setBulkProgress(`Uploading file ${index + 1}/${pendingFolderFiles.length}...`);
          setBulkPercent(30 + Math.round(((index + 1) / Math.max(pendingFolderFiles.length, 1)) * 65));
          const relativePath = getUploadRelativePath(file);
          const parts = relativePath.split("/");
          const rawFileName = parts.pop();
          const parentPath = parts.join("/");
          const targetFolderId = folderIdMap[parentPath] || rootParentId;
          const fileParentKey = String(targetFolderId || "");
          const fileSiblingNames = getFileSiblingNameSet(fileParentKey);
          const fileName = getUniqueFileName(rawFileName, fileSiblingNames);
          fileSiblingNames.add(fileName.toLowerCase());
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
      const effectiveTargetFolderId =
        activeSpace === "customer" && targetFolderId === "root" && activeCustomerRootFolderId
          ? activeCustomerRootFolderId
          : targetFolderId;
      const targetId = normalizeParentId(effectiveTargetFolderId);
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
          await Promise.all([reindexFolderFiles(oldFolderId), reindexFolderFiles(targetId)]);
          message.success("Document moved");
        }
        setMoveRecord(null);
        loadData();
      } catch (e) {
        message.error("Move failed");
      }
    };

    // Defense in depth for bulk actions (Library.js §5.9) — the checkbox
    // column doesn't re-verify permission per row, so re-check every
    // selected key right before executing instead of trusting the
    // selection state wasn't stale or bypassed. requireAdminOutsidePersonal
    // mirrors the single-item Move-to-Trash guard; requireAbsoluteAdmin
    // mirrors the single-item hard-delete guard.
    const getBulkRecordsWithPermission = (keys, { requireAdminOutsidePersonal = false, requireAbsoluteAdmin = false } = {}) => {
      const resolved = keys
        .map((key) => {
          const isFolder = key.startsWith("folder_");
          const rId = key.replace("folder_", "").replace("file_", "");
          const record = isFolder
            ? folders.find((f) => String(extractId(f.id)) === String(rId))
            : documents.find((d) => String(extractId(d.id)) === String(rId));
          return record ? { key, isFolder, record } : null;
        })
        .filter(Boolean);

      const allowed = resolved.filter(({ isFolder, record }) => {
        if (requireAbsoluteAdmin) return isAdminUser(currentUserState);
        if (requireAdminOutsidePersonal && !isAdminUser(currentUserState) && activeSpace !== "personal") {
          return false;
        }
        const perms = getRecordPerms({ ...record, _type: isFolder ? "folder" : "file" });
        return perms.canWrite || perms.isManager;
      });

      if (allowed.length < keys.length) {
        message.warning(`Skipped ${keys.length - allowed.length} item(s) you don't have permission to act on`);
      }
      return allowed.map((item) => item.key);
    };

    const handleBulkRestore = async () => {
      if (selectedRowKeys.length === 0) return;
      Modal.confirm({
        title: `Restore ${selectedRowKeys.length} selected item(s)?`,
        content: "Folders and documents will be restored to their original space.",
        okText: "Restore",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            const keys = getBulkRecordsWithPermission(selectedRowKeys);
            await Promise.all(keys.map(async (key) => {
              const isFolder = key.startsWith("folder_");
              const rId = Number(key.replace("folder_", "").replace("file_", ""));
              const url = isFolder ? `folders:update?filterByTk=${rId}` : `documents:update?filterByTk=${rId}`;
              await ctx.api.request({
                url,
                method: "POST",
                data: { isDeleted: false, deletedAt: null },
              });
            }));
            message.success(`Restored ${keys.length} item(s) successfully!`);
            setSelectedRowKeys([]);
            loadData();
          } catch (e) {
            message.error("Restore failed");
          }
        }
      });
    };

    const handleBulkPermanentDelete = async () => {
      if (selectedRowKeys.length === 0) return;
      Modal.confirm({
        title: `Delete ${selectedRowKeys.length} selected item(s)?`,
        content: "This action cannot be undone. Files and folders will be permanently deleted from the system.",
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            // Hard delete is admin-only, absolute — same as the single-item
            // guard in handlePermanentDelete.
            if (!isAdminUser(currentUserState)) {
              message.warning("Only administrators can permanently delete");
              return;
            }
            const keys = getBulkRecordsWithPermission(selectedRowKeys, { requireAbsoluteAdmin: true });
            await Promise.all(keys.map(async (key) => {
              const isFolder = key.startsWith("folder_");
              const rId = Number(key.replace("folder_", "").replace("file_", ""));
              const url = isFolder ? `folders:destroy?filterByTk=${rId}` : `documents:destroy?filterByTk=${rId}`;
              await ctx.api.request({
                url,
                method: "POST",
              });
            }));
            message.success(`Deleted ${keys.length} item(s) successfully!`);
            setSelectedRowKeys([]);
            loadData();
          } catch (e) {
            message.error("Delete failed");
          }
        }
      });
    };

    const handleBulkDelete = async () => {
      if (selectedRowKeys.length === 0) return;
      Modal.confirm({
        title: `Delete ${selectedRowKeys.length} selected item(s)?`,
        content: "Deleted items will be moved to Trash.",
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            // Moving to Trash is admin-only outside the Personal space —
            // same as the single-item guard in showDeleteConfirm/handleDeleteFile.
            if (!isAdminUser(currentUserState) && activeSpace !== "personal") {
              message.warning("Only administrators can delete in this space");
              return;
            }
            const keys = getBulkRecordsWithPermission(selectedRowKeys, { requireAdminOutsidePersonal: true });
            const nowIso = new Date().toISOString();
            const deleterId = getCurrentUserId();
            await Promise.all(keys.map(async (key) => {
              const isFolder = key.startsWith("folder_");
              const rId = Number(key.replace("folder_", "").replace("file_", ""));
              const url = isFolder ? `folders:update?filterByTk=${rId}` : `documents:update?filterByTk=${rId}`;
              await ctx.api.request({
                url,
                method: "POST",
                data: { isDeleted: true, deletedAt: nowIso, ...(deleterId ? { updatedById: deleterId } : {}) },
              });
            }));
            message.success(`Moved ${keys.length} item(s) to Trash!`);
            setSelectedRowKeys([]);
            loadData();
          } catch (e) {
            message.error("Delete failed");
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
        const keys = getBulkRecordsWithPermission(selectedRowKeys);
        await Promise.all(keys.map(async (key) => {
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
        message.success(`Moved ${keys.length} item(s) successfully!`);
        setIsBulkMoveOpen(false);
        setSelectedRowKeys([]);
        loadData();
      } catch (e) {
        message.error("Move failed");
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
      message.success("Document reordered");
      loadData();
      return true;
    };

    // External OS file/folder drag-drop (ported from Library.js §5.4) —
    // dropping real files/folders from Explorer/Finder, distinct from the
    // internal record-to-record drag already handled below.
    const canUploadDroppedItems = (targetFolderId) => {
      if (activeSpace === "trash" || activeSpace === "recent") return false;
      const folderRecord = visibleFolders.find((f) => String(extractId(f.id)) === String(targetFolderId));
      const perms = getFolderPermissions(folderRecord || null, currentUserState, visibleFolders, currentLawyerId);
      return perms.canCreate;
    };

    const uploadDroppedItems = async (dataTransfer, targetFolderId) => {
      setExternalDropActive(false);
      if (!canUploadDroppedItems(targetFolderId)) {
        message.warning("You don't have permission to upload documents to this folder");
        return false;
      }

      let droppedItems;
      try {
        droppedItems = await readDroppedFiles(dataTransfer);
      } catch (error) {
        message.error("Unable to read the dropped file(s) or folder(s)");
        return false;
      }

      const { files, folderPaths, hasDirectories } = droppedItems;
      if (!files.length && !folderPaths.length) {
        message.warning("No valid files or folders found");
        return false;
      }

      setExternalUploadInProgress(true);
      try {
        if (hasDirectories) {
          // No standalone "upload this file[] as a folder tree" function
          // exists in this file (unlike Library.js's
          // uploadFolderFilesToTarget) — route through the existing
          // confirm-then-upload bulk flow instead (executeFolderUpload),
          // which already has folder/file dedup and a progress bar.
          setPendingFolderFiles(files);
          setBulkTargetId(targetFolderId);
          setBulkConfirmOpen(true);
          return true;
        }
        return await uploadFilesToTarget(files, { folderId: targetFolderId });
      } finally {
        setExternalUploadInProgress(false);
      }
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
      if (event.clientX > rect.left && event.clientX < rect.right && event.clientY > rect.top && event.clientY < rect.bottom) {
        return;
      }
      setExternalDropActive(false);
    };

    const handleDropOnRecord = async (event, targetRecord) => {
      event.preventDefault();
      event.stopPropagation();
      if (hasExternalFiles(event.dataTransfer)) {
        const targetFolderId = targetRecord._type === "folder" ? extractId(targetRecord) : selectedFolderId;
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
      if (hasExternalFiles(event.dataTransfer)) {
        await uploadDroppedItems(event.dataTransfer, selectedFolderId);
        return;
      }
      setExternalDropActive(false);
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
              .catch(() => { });
          }
          message.success("Document and file name updated");
        }
        cancelEditTitle();
        loadData();
      } catch (e) {
        message.error(record._type === "folder" ? "Failed to update folder name" : "Failed to update document name");
      }
    };

    // Saves a single metadata field via inline edit (InlineEditCell /
    // buildDocMetaColumns below) — ported from Library.js. Must throw on
    // failure so InlineEditCell knows to stay in edit mode.
    const saveRecordField = async (record, field, value) => {
      try {
        const isFolder = record._type === "folder";
        const userId = getCurrentUserId();
        await ctx.api.request({
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
        message.error("Update failed");
        throw e;
      }
    };

    const showDeleteConfirm = (folder) => {
      // Root folder can never be moved to Trash (Library.js §7 rule #2) —
      // applies to every kind of root (Customer, Personal, Company Shared).
      if (isFolderTreeRoot(folder)) {
        message.warning("Cannot delete the root folder");
        return;
      }
      // Defense in depth — the Move-to-Trash trigger is already hidden for
      // non-admins outside the Personal space (see canDelete/showFolderDelete
      // above), matching Library.js's admin-outside-Personal rule (§6).
      if (!isAdminUser(currentUserState) && activeSpace !== "personal") {
        message.warning("Only administrators can delete folders in this space");
        return;
      }
      const fId = extractId(folder);
      const folderIdsToDelete = getDescendantIds(fId);
      // Include the folder itself
      folderIdsToDelete.push(String(fId));
      const filesCount = documents.filter((d) => folderIdsToDelete.includes(String(extractId(d.folderId) || ""))).length;
      const subFoldersCount = folderIdsToDelete.length - 1;

      let contentElements = [];
      if (subFoldersCount > 0) contentElements.push(`- ${subFoldersCount} subfolder`);
      if (filesCount > 0) contentElements.push(`- ${filesCount} file`);

      Modal.confirm({
        title: `Confirm delete folder "${folder.name}"?`,
        icon: React.createElement("span", { style: { color: "#faad14", marginRight: 16 } }, WarningIcon),
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
              <p style={{ color: "#8c8c8c", fontStyle: "italic" }}>(Folder is empty)</p>
            )}
            <p>Are you sure you want to delete?</p>
          </div>
        ),
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            // Stamp updatedById with the deleter — canViewTrashRecord below
            // filters Trash by "who deleted it", not by folder permission,
            // so this needs to reflect the actual deleter, not whoever last
            // edited the record before deletion.
            const deleterId = getCurrentUserId();
            const deletePayload = {
              isDeleted: true,
              deletedAt: new Date().toISOString(),
              ...(deleterId ? { updatedById: deleterId } : {}),
            };
            if (folderIdsToDelete.length > 0) {
              await ctx.api.request({
                url: "documents:update",
                method: "POST",
                params: { filter: JSON.stringify({ folderId: { $in: folderIdsToDelete.map(id => Number(id)) } }) },
                data: deletePayload
              }).catch(() => { });
              await ctx.api.request({
                url: "folders:update",
                method: "POST",
                params: { filter: JSON.stringify({ id: { $in: folderIdsToDelete.map(id => Number(id)) } }) },
                data: deletePayload
              }).catch(() => { });
            }
            message.success("Folder and its contents deleted");
            if (selectedFolderId !== "root" && folderIdsToDelete.includes(String(selectedFolderId))) {
              setSelectedFolderId("root");
            }
            // Deleting a folder from the middle of a manually-sorted parent
            // leaves a gap in fileIndex — reindex so sort order stays dense.
            await reindexFolderFiles(getFolderParentId(folder));
            loadData();
          } catch (e) {
            message.error("Delete failed");
          }
        },
      });
    };

    const handleDeleteFile = (record) => {
      // Defense in depth — the Move-to-Trash trigger is already hidden for
      // non-admins outside the Personal space.
      if (!isAdminUser(currentUserState) && activeSpace !== "personal") {
        message.warning("Only administrators can delete documents in this space");
        return;
      }
      Modal.confirm({
        title: "Delete this file?",
        icon: React.createElement("span", { style: { color: "#faad14", marginRight: 16 } }, WarningIcon),
        content: "This action will delete the file from the system.",
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            const deleterId = getCurrentUserId();
            await ctx.api.request({
              url: `documents:update?filterByTk=${extractId(record)}`,
              method: "POST",
              data: {
                isDeleted: true,
                deletedAt: new Date().toISOString(),
                ...(deleterId ? { updatedById: deleterId } : {}),
              }
            });
            message.success("File deleted");
            await reindexFolderFiles(normalizeParentId(record.folderId));
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
            data: { isDeleted: false, deletedAt: null }
          });
        } else {
          await ctx.api.request({
            url: `documents:update?filterByTk=${extractId(record)}`,
            method: "POST",
            data: { isDeleted: false, deletedAt: null }
          });
        }
        message.success("Restored successfully");
        loadData();
      } catch (e) {
        message.error("Restore failed");
      }
    };

    const handlePermanentDelete = (record) => {
      // Hard delete is admin-only, absolute — no exception, matching
      // Library.js §7 rule #4. Defense in depth: the trigger is already
      // hidden for non-admins (context menu + row action buttons above).
      if (!isAdminUser(currentUserState)) {
        message.warning("Only administrators can permanently delete");
        return;
      }
      Modal.confirm({
        title: record._type === "folder" ? "Delete this folder?" : "Delete this file?",
        icon: React.createElement("span", { style: { color: "#ff4d4f", marginRight: 16 } }, WarningIcon),
        content: "Warning: This action cannot be undone — the data will be permanently deleted from the database.",
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
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
            message.success("Deleted");
            loadData();
          } catch {
            message.error("Delete failed");
          }
        },
      });
    };

    const handleCreateFolderFromSidebar = (spaceType, companyId = null) => {
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
      const isCustomerRecord = !!(templateRecord.customerCode || templateRecord._type === "customer_record" || activeSpace === "customer");
      Modal.confirm({
        title: isCustomerRecord ? `Confirm delete Customer "${templateRecord.customerName || templateRecord.name || getCustomerDisplayName(templateRecord)}"?` : `Confirm delete document type "${templateRecord.title || templateRecord.name}"?`,
        icon: React.createElement("span", { style: { color: "#faad14", marginRight: 16 } }, WarningIcon),
        content: isCustomerRecord ? "Are you sure you want to delete this customer? Documents and folders belonging to this customer will remain in Trash or become unlinked." : "Are you sure you want to delete this document type? Documents in this category will remain but become unlinked.",
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
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
            message.success(isCustomerRecord ? "Customer deleted" : "Document type deleted");
            if (isCustomerRecord && activeCustomerId === String(extractId(templateRecord))) {
              setActiveCustomerId(null);
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
          message.success("Customer renamed");
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
              await ctx.api.request({
                url: `attachments:update?filterByTk=${attachment.id}`,
                method: "POST",
                data: { title: newName },
              }).catch(() => { });
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
              ({folderSubFolderCount} Folder - {folderFileCount} file)
            </span>
          </div>
        );
      }

      // File
      const attachment = getAttachment(record);
      const hasPrefix = !!(isAllFiles && record._displayFileIndex);
      const displayName = attachment?.title || attachment?.filename || record.googleDriveUrl || record.description || "No attached file";
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
            <Tooltip title="Click to preview" placement="topLeft">
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

    // Helper: compute per-row permissions. Returns the FULL roleToPerms
    // shape (canRename/canMove/canDelete/canManagePermissions/canShare/...)
    // plus a back-compat `canWrite` field, so existing call sites that only
    // ever destructured {canWrite, isManager} keep working unchanged while
    // newer call sites (buildDocMetaColumns' inline-edit gating, the
    // "Permissions" action gating) can read the finer-grained fields — those
    // were silently always-false before this widened, since the old narrow
    // shape never carried them.
    const getRecordPerms = useCallback((record) => {
      const currentUser = currentUserState;
      if (!currentUser) return { ...roleToPerms("admin"), canWrite: true };
      if (isAdminUser(currentUser)) return { ...roleToPerms("admin"), canWrite: true };
      if (record._type === "folder") {
        const perms = getFolderPermissions(record, currentUser, visibleFolders, currentLawyerId);
        return { ...perms, canWrite: perms.canEdit || perms.isManager };
      }
      // For files: check parent folder permissions, preserving the
      // "uploader can manage their own file" bypass canManageFile applies.
      const parentFolder = visibleFolders.find((f) => String(extractId(f.id)) === String(extractId(record.folderId) || ""));
      const perms = getFilePermissions(record, parentFolder || null, currentUser, visibleFolders, currentLawyerId);
      const isOwnUpload = extractId(record.createdById) === extractId(currentUser.id);
      return {
        ...perms,
        canWrite: perms.canEdit || perms.isManager || isOwnUpload,
        canRename: perms.canRename || isOwnUpload,
        canMove: perms.canMove || isOwnUpload,
      };
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
          label: renderContextMenuItemLabel(EYE_ICON, "Open detail"),
          onClick: () => {
            closeContextMenu();
            openCustomerDetail(record);
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
            renameForm.setFieldsValue({ name: record.title || record.name || "" });
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
            renameForm.setFieldsValue({ name: record.title || record.name || "" });
          }
        });
        items.push({
          key: "delete",
          label: renderContextMenuItemLabel(DELETE_ICON, "Delete", "#cf1322"),
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
          label: renderContextMenuItemLabel(RESTORE_ICON, "Restore"),
          onClick: () => { closeContextMenu(); handleRestoreRecord(record); },
        });
        // Hard delete (permanently destroying the record) is admin-only —
        // absolute, no exception for Personal space or folder owner/manager.
        if (isAdminUser(currentUserState)) {
          items.push({
            key: "permanent_delete",
            label: renderContextMenuItemLabel(DELETE_ICON, "Permanently delete", "#cf1322"),
            onClick: () => { closeContextMenu(); handlePermanentDelete(record); },
          });
        }
        return items;
      }

      const { canWrite, isManager, canManagePermissions } = getRecordPerms(record);

      if (!isFolder) {
        items.push({
          key: "preview",
          label: renderContextMenuItemLabel(EYE_ICON, "Preview"),
          onClick: () => { closeContextMenu(); previewRecordFile(record); },
        });
        items.push({
          key: "download",
          label: renderContextMenuItemLabel(DOWNLOAD_ICON, "Download"),
          onClick: () => { closeContextMenu(); openRecordFile(record); },
        });
      }

      if (canWrite) {
        items.push({
          key: "rename",
          label: renderContextMenuItemLabel(EDIT_ICON, "Rename"),
          onClick: () => {
            closeContextMenu();
            setRenameRecord(record);
            renameForm.setFieldsValue({ name: record.name || record.title || "" });
          },
        });
        items.push({
          key: "move",
          label: renderContextMenuItemLabel(MOVE_ICON, "Move"),
          onClick: () => { closeContextMenu(); setMoveRecord(record); setMoveTargetId("root"); },
        });
      }

      if (
        isFolder &&
        (isManager || canManagePermissions || isAdminUser(currentUserState)) &&
        isPermissionBearingFolder(record, visibleFolders)
      ) {
        items.push({
          key: "permission",
          label: renderContextMenuItemLabel(LOCK_ICON, "Permissions"),
          onClick: () => { closeContextMenu(); setPermissionFolder(record); },
        });
      }

      // Moving to Trash is admin-only outside the Personal space — a
      // folder Manager can still rename/move/manage content, but only an
      // admin (or the owner, within their own Personal space) can move
      // things to Trash. Matches Library.js's showDeleteConfirm/
      // handleDeleteFile guard exactly (see §6 of the reference doc).
      const canDelete =
        (isFolder ? (isManager || isAdminUser(currentUserState)) : canWrite) &&
        (isAdminUser(currentUserState) || activeSpace === "personal");
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
    }, [getRecordPerms, currentUserState, activeSpace, visibleFolders, openCustomerDetail, openLinkCaseModal]);

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
        rootName = "Personal workspace";
      } else if (storage === "company_shared") {
        rootName = activeCompany ? getCompanyName(activeCompany) : "Shared folder";
      } else if (getRecordCustomerId(record)) {
        rootName = "Customer";
      } else {
        const typeId = getRecordDocumentType(record) || (parentFolderId && getRecordDocumentType(folderMap.get(String(parentFolderId))));
        if (typeId) {
          const type = documentTypes.find(t => t.id === String(typeId));
          rootName = type ? `Library / ${type.label}` : "Library";
        } else {
          rootName = "Shared folder";
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

        // 7 of the 8 inline-editable metadata columns (Description is wired
        // separately below since every branch already has its own column
        // for it) — ported from Library.js's buildDocMetaColumns(). Only
        // meaningful on files; folders render "—". Spread into the
        // non-trash branches only, right after Description and before Size.
        const buildDocMetaColumns = () => [
          {
            title: "Document type",
            key: "documentType",
            width: 140,
            render: (_, record) =>
              record._type === "file" ? (
                <InlineEditCell value={record.documentType} canEdit={getRecordPerms(record).canRename} onSave={(v) => saveRecordField(record, "documentType", v)} />
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: "Reference No.",
            key: "documentCode",
            width: 140,
            render: (_, record) =>
              record._type === "file" ? (
                <InlineEditCell value={record.documentCode} canEdit={getRecordPerms(record).canRename} onSave={(v) => saveRecordField(record, "documentCode", v)} />
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: "Issue date",
            key: "openingDate",
            width: 120,
            sorter: (a, b) => new Date(a.openingDate || 0) - new Date(b.openingDate || 0),
            render: (_, record) =>
              record._type === "file" ? (
                <InlineEditCell type="date" value={record.openingDate} canEdit={getRecordPerms(record).canRename} onSave={(v) => saveRecordField(record, "openingDate", v)} />
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: "Signed date",
            key: "signedAt",
            width: 120,
            sorter: (a, b) => new Date(a.signedAt || 0) - new Date(b.signedAt || 0),
            render: (_, record) =>
              record._type === "file" ? (
                <InlineEditCell type="date" value={record.signedAt} canEdit={getRecordPerms(record).canRename} onSave={(v) => saveRecordField(record, "signedAt", v)} />
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: "Effective date",
            key: "effectiveAt",
            width: 130,
            sorter: (a, b) => new Date(a.effectiveAt || 0) - new Date(b.effectiveAt || 0),
            render: (_, record) =>
              record._type === "file" ? (
                <InlineEditCell type="date" value={record.effectiveAt} canEdit={getRecordPerms(record).canRename} onSave={(v) => saveRecordField(record, "effectiveAt", v)} />
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
                <InlineEditCell value={record.senderName} canEdit={getRecordPerms(record).canRename} onSave={(v) => saveRecordField(record, "senderName", v)} />
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
                <InlineEditCell value={record.recipientName} canEdit={getRecordPerms(record).canRename} onSave={(v) => saveRecordField(record, "recipientName", v)} />
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
        ];

        // Shared action cell renderer for folder rows
        const renderFolderActions = (record) => {
          if (activeSpace === "trash") {
            return (
              <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}>
                <Tooltip title="Restore">
                  <Button
                    size="small"
                    icon={RESTORE_ICON}
                    onClick={(event) => { event.stopPropagation(); handleRestoreRecord(record); }}
                    style={{ color: "#3B6D11", borderColor: "#c3e6cb", background: "#e2f0d9" }}
                  />
                </Tooltip>
                {isAdminUser(currentUser) && (
                  <Tooltip title="Permanently delete">
                    <Button
                      size="small"
                      danger
                      icon={DELETE_ICON}
                      onClick={(event) => { event.stopPropagation(); handlePermanentDelete(record); }}
                    />
                  </Tooltip>
                )}
              </div>
            );
          }
          const { canWrite, isManager, canManagePermissions } = getRecordPerms(record);
          const showEdit = canWrite;
          const showMove = canWrite;
          const isRoot = isFolderTreeRoot(record);
          // isPermissionBearingFolder also admits a level-2 folder (direct
          // child of the Customer root) that's eligible to carry its own
          // grant — see resolvePermissionFolder above.
          const showLock =
            (isManager || canManagePermissions || isAdminUser(currentUser)) &&
            isPermissionBearingFolder(record, visibleFolders);
          // Moving to Trash is admin-only outside the Personal space —
          // matches Library.js's showDeleteConfirm guard (§6 of the
          // reference doc). Kept root-only (unlike showLock above) so a
          // level-2 folder's inline Delete button doesn't newly appear
          // here — it stays reachable only via the right-click menu, same
          // as before this level-2 permission sync.
          const showFolderDelete = isRoot && showLock && (isAdminUser(currentUser) || activeSpace === "personal");
          if (isRoot) {
            // Root folder keeps its original lock-only inline row (no
            // inline Edit/Move — those stay reachable via right-click).
            if (showLock) {
              return (
                <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}>
                  <Tooltip title="Permissions">
                    <Button
                      size="small"
                      icon={LOCK_ICON}
                      onClick={(event) => { event.stopPropagation(); setPermissionFolder(record); }}
                    />
                  </Tooltip>
                  {showFolderDelete && (
                    <Tooltip title="Delete">
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
            }
            return null;
          }
          if (showEdit || showMove || showLock) {
            return (
              <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}>
                {(showEdit || showMove) && (
                  <React.Fragment>
                    <Tooltip title="Rename">
                      <Button
                        size="small"
                        icon={EDIT_ICON}
                        onClick={(event) => { event.stopPropagation(); startEditTitle(record); }}
                      />
                    </Tooltip>
                    <Tooltip title="Move">
                      <Button
                        size="small"
                        icon={MOVE_ICON}
                        onClick={(event) => { event.stopPropagation(); setMoveRecord(record); setMoveTargetId("root"); }}
                      />
                    </Tooltip>
                  </React.Fragment>
                )}
                {showLock && (
                  <Tooltip title="Permissions">
                    <Button
                      size="small"
                      icon={LOCK_ICON}
                      onClick={(event) => { event.stopPropagation(); setPermissionFolder(record); }}
                    />
                  </Tooltip>
                )}
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
                <Tooltip title="Restore">
                  <Button
                    size="small"
                    icon={RESTORE_ICON}
                    onClick={(event) => { event.stopPropagation(); handleRestoreRecord(record); }}
                    style={{ color: "#3B6D11", borderColor: "#c3e6cb", background: "#e2f0d9" }}
                  />
                </Tooltip>
                {isAdminUser(currentUser) && (
                  <Tooltip title="Permanently delete">
                    <Button
                      size="small"
                      danger
                      icon={DELETE_ICON}
                      onClick={(event) => { event.stopPropagation(); handlePermanentDelete(record); }}
                    />
                  </Tooltip>
                )}
              </div>
            );
          }
          return (
            <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }}>
              <Tooltip title="Preview">
                <Button
                  size="small"
                  icon={EYE_ICON}
                  onClick={(event) => { event.stopPropagation(); previewRecordFile(record); }}
                />
              </Tooltip>
              <Tooltip title="Download">
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
              title: "Customer code",
              key: "customerCode",
              width: 150,
              sorter: (a, b) => (a.customerCode || "").localeCompare(b.customerCode || "", "vi"),
              render: (_, record) => <Text style={{ fontWeight: 600, color: "#111827" }}>{record.customerCode || record.code || "—"}</Text>,
            },
            {
              title: "Customer name",
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
              title: "Linked cases",
              key: "linkedCases",
              minWidth: 200,
              render: (_, record) => (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                  {(record.cases || []).length === 0 ? (
                    <span style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>Not linked</span>
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
                              +{extraItems.length} more
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
              title: "Actions",
              key: "actions",
              width: 100,
              align: "right",
              render: (_, record) => (
                <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 6 }} onClick={(e) => e.stopPropagation()}>
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
                title: "Folder name",
                key: "name",
                minWidth: 250,
                render: (_, record) => renderNameCell(record, false),
                sorter: (a, b) => (a.name || "").localeCompare(b.name || "", "vi"),
              },
              {
                title: "Description",
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
                title: "Uploaded by",
                key: "createdBy",
                width: 180,
                render: (_, record) => <Text type="secondary">{getUploadUserName(record)}</Text>,
              },
              {
                title: "Upload date",
                key: "createdAt",
                width: 150,
                sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
                render: (_, record) => <Text type="secondary">{formatDate(getValidDate(record))}</Text>,
              },
              {
                title: "Deleted by",
                key: "deletedBy",
                width: 180,
                render: (_, record) => <Text type="secondary">{getDeletedUserName(record)}</Text>,
              },
              {
                title: "Deleted date",
                key: "deletedAt",
                width: 160,
                sorter: (a, b) => new Date(a.deletedAt || a.updatedAt || 0) - new Date(b.deletedAt || b.updatedAt || 0),
                render: (_, record) => <Text type="secondary">{formatDateTime(record.deletedAt || record.updatedAt || record.deleted_at)}</Text>,
              },
              {
                title: "Actions",
                key: "actions",
                width: 120,
                align: "right",
                render: (_, record) => renderFolderActions(record),
              }
            ];
          }

          return [
            {
              title: "Folder name",
              key: "name",
              minWidth: 250,
              render: (_, record) => renderNameCell(record, false),
              sorter: (a, b) => (a.name || "").localeCompare(b.name || "", "vi"),
            },
            {
              title: "Description",
              key: "description",
              minWidth: 200,
              render: (_, record) => <InlineEditCell type="textarea" value={record.description} canEdit={getRecordPerms(record).canRename} onSave={(v) => saveRecordField(record, "description", v)} />,
            },
            ...buildDocMetaColumns(),
            {
              title: "Size",
              key: "size",
              width: 100,
              sorter: (a, b) => getFolderSize(extractId(a)) - getFolderSize(extractId(b)),
              render: (_, record) => <Text type="secondary">{formatBytes(getFolderSize(extractId(record)))}</Text>,
            },
            {
              title: "Created date",
              key: "createdAt",
              width: 150,
              sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
              render: (_, record) => <Text type="secondary">{formatDate(getValidDate(record))}</Text>,
            },
            {
              title: "Created by",
              key: "createdBy",
              width: 180,
              render: (_, record) => <Text type="secondary">{getUploadUserName(record)}</Text>,
            },
            {
              title: "Actions",
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
                title: "File name",
                key: "name",
                minWidth: 250,
                render: (_, record) => renderNameCell(record, true),
                sorter: (a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || "", "vi"),
              },
              {
                title: "Description",
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
                title: "Uploaded by",
                key: "uploadedBy",
                width: 180,
                render: (_, record) => <Text type="secondary">{getUploadUserName(record)}</Text>,
              },
              {
                title: "Upload date",
                key: "uploadedAt",
                width: 160,
                sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
                render: (_, record) => <Text type="secondary">{formatDateTime(getValidDate(record))}</Text>,
              },
              {
                title: "Deleted by",
                key: "deletedBy",
                width: 180,
                render: (_, record) => <Text type="secondary">{getDeletedUserName(record)}</Text>,
              },
              {
                title: "Deleted date",
                key: "deletedAt",
                width: 160,
                sorter: (a, b) => new Date(a.deletedAt || a.updatedAt || 0) - new Date(b.deletedAt || b.updatedAt || 0),
                render: (_, record) => <Text type="secondary">{formatDateTime(record.deletedAt || record.updatedAt || record.deleted_at)}</Text>,
              },
              {
                title: "Actions",
                key: "actions",
                width: 120,
                align: "right",
                render: (_, record) => renderFileActions(record),
              }
            ];
          }

          return [
            {
              title: "File name",
              key: "name",
              minWidth: 250,
              render: (_, record) => renderNameCell(record, true),
              sorter: (a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || "", "vi"),
            },
            {
              title: "Description",
              key: "description",
              minWidth: 200,
              render: (_, record) => <InlineEditCell type="textarea" value={record.description} canEdit={getRecordPerms(record).canRename} onSave={(v) => saveRecordField(record, "description", v)} />,
            },
            ...buildDocMetaColumns(),
            {
              title: "Size",
              key: "size",
              width: 100,
              sorter: (a, b) => (getAttachment(a)?.size || 0) - (getAttachment(b)?.size || 0),
              render: (_, record) => <Text type="secondary">{formatBytes(getAttachment(record)?.size)}</Text>,
            },
            {
              title: "Upload date",
              key: "uploadedAt",
              width: 160,
              sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
              render: (_, record) => <Text type="secondary">{formatDateTime(getValidDate(record))}</Text>,
            },
            {
              title: "Uploaded by",
              key: "uploadedBy",
              width: 180,
              render: (_, record) => <Text type="secondary">{getUploadUserName(record)}</Text>,
            },
            {
              title: "Actions",
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
              title: "Name",
              key: "name",
              minWidth: 250,
              render: (_, record) => renderNameCell(record, true),
              sorter: (a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || "", "vi"),
            },
            {
              title: "Description",
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
              title: "Created date",
              key: "createdAt",
              width: 120,
              sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
              render: (_, record) => (record._type === "folder" ? <Text type="secondary">{formatDate(getValidDate(record))}</Text> : <Text type="secondary">—</Text>),
            },
            {
              title: "Uploaded by",
              key: "uploadedBy",
              width: 150,
              render: (_, record) => (record._type === "file" ? <Text type="secondary">{getUploadUserName(record)}</Text> : <Text type="secondary">—</Text>),
            },
            {
              title: "Upload date",
              key: "uploadedAt",
              width: 150,
              sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
              render: (_, record) => (record._type === "file" ? <Text type="secondary">{formatDateTime(getValidDate(record))}</Text> : <Text type="secondary">—</Text>),
            },
            {
              title: "Deleted by",
              key: "deletedBy",
              width: 150,
              render: (_, record) => <Text type="secondary">{getDeletedUserName(record)}</Text>,
            },
            {
              title: "Deleted date",
              key: "deletedAt",
              width: 150,
              sorter: (a, b) => new Date(a.deletedAt || a.updatedAt || 0) - new Date(b.deletedAt || b.updatedAt || 0),
              render: (_, record) => <Text type="secondary">{formatDateTime(record.deletedAt || record.updatedAt || record.deleted_at)}</Text>,
            },
            {
              title: "Actions",
              key: "actions",
              width: 120,
              align: "right",
              render: (_, record) => (record._type === "folder" ? renderFolderActions(record) : renderFileActions(record)),
            }
          ];
        }

        return [
          {
            title: "Name",
            key: "name",
            minWidth: 250,
            render: (_, record) => renderNameCell(record, true),
            sorter: (a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || "", "vi"),
          },
          {
            title: "Description",
            key: "description",
            minWidth: 200,
            render: (_, record) => <InlineEditCell type="textarea" value={record.description} canEdit={getRecordPerms(record).canRename} onSave={(v) => saveRecordField(record, "description", v)} />,
          },
          ...buildDocMetaColumns(),
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
            title: "Created date",
            key: "createdAt",
            width: 120,
            sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
            render: (_, record) => (record._type === "folder" ? <Text type="secondary">{formatDate(getValidDate(record))}</Text> : <Text type="secondary">—</Text>),
          },
          {
            title: "Upload date",
            key: "uploadedAt",
            width: 150,
            sorter: (a, b) => new Date(getValidDate(a) || 0) - new Date(getValidDate(b) || 0),
            render: (_, record) => (record._type === "file" ? <Text type="secondary">{formatDateTime(getValidDate(record))}</Text> : <Text type="secondary">—</Text>),
          },
          {
            title: "Uploaded by",
            key: "uploadedBy",
            width: 150,
            render: (_, record) => (record._type === "file" ? <Text type="secondary">{getUploadUserName(record)}</Text> : <Text type="secondary">—</Text>),
          },
          {
            title: "Actions",
            key: "actions",
            width: 120,
            align: "right",
            render: (_, record) => (record._type === "folder" ? renderFolderActions(record) : renderFileActions(record)),
          }
        ];
      },
      [tableData, documentTypes, getTypeConfig, getRecordDocumentType, editingTitleId, editingTitleValue, currentUserState, currentLawyerId, visibleFolders, getRecordPathString, activeSpace, activeCustomerIdValue, getFolderSize, openCustomerDetail, openLinkCaseModal, saveRecordField, getRecordPerms],
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
        fileInputRef.current?.click();
        return;
      }
      if (key === "upload_folder") {
        folderInputRef.current?.click();
      }
    };

    const newMenu = {
      items: [
        { key: "folder", label: renderNewMenuLabel(TYPE_ICONS.folder, "Create folder") },
        { key: "upload", label: renderNewMenuLabel(TYPE_ICONS.upload, "Upload") },
        { key: "upload_folder", label: renderNewMenuLabel(TYPE_ICONS.folder, "Upload folder") },
      ],
      onClick: handleNewActionClick,
    };

    const activityColumns = useMemo(() => [
      {
        title: "Activity type",
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
        title: "Performed by",
        dataIndex: "changedByName",
        key: "changedByName",
        width: 200,
        render: (name) => {
          const displayName = name || "System";
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
        title: "Documents",
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
        title: "Change description",
        key: "desc",
        render: (text, log) => {
          const desc = resolveActivityDesc(log, folders, documents);
          return (
            <div style={{ fontSize: 13, color: "#4B5563" }}>{desc}</div>
          );
        }
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

                {/* Sidebar toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "4px 2px 16px 2px", borderBottom: "0.5px solid #E5E7EB", marginBottom: 16 }}>
                  <Tooltip title="Collapse sidebar">
                    <Button type="text" icon={SIDEBAR_ICON} onClick={() => setSidebarCollapsed(true)}
                      style={{ width: 22, height: 22, minWidth: 22, padding: 0, color: "#9CA3AF" }} />
                  </Tooltip>
                </div>

                {/* ══ SEARCH BOX ══ */}
                <div style={{ marginBottom: 16 }}>
                  <Input
                    placeholder="Search documents..."
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
                        >+ Create</button>
                      </div>
                      {libraryExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 12 }}>
                            {customerRootFolders.length === 0 ? (
                              <Text style={{ fontSize: 12, color: "#9CA3AF", padding: "4px 10px", display: "block", fontStyle: "italic" }}>No folders yet</Text>
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

                      {/* Activity log */}
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
                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Activity log</span>
                          </button>
                        );
                      })()}

                      {/* Trash */}
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
                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Trash</span>
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
                        >+ Create</button>
                      </div>
                      {spacesExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {companies.length === 0 ? (
                            <Text style={{ fontSize: 12, color: "#9CA3AF", padding: "4px 10px", display: "block" }}>None yet</Text>
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
                              {showAllCompanies ? "Collapse" : `Show more (${companies.length - 5})`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ══ SECTION 2: THƯ VIỆN (Customer / Customers) ══ */}
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
                          <span style={{ fontSize: 10, fontWeight: 600, color: activeSpace === "customer" && !activeCustomerId ? "#185FA5" : "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT }}>Customers</span>
                        </div>
                        <button type="button"
                          onClick={() => { if (!requireCompany()) return; createTemplateForm.resetFields(); setIsCreateTemplateOpen(true); }}
                          style={{ fontSize: 11, color: "#185FA5", fontWeight: 500, border: "none", background: "transparent", cursor: "pointer", padding: "0 2px", fontFamily: FONT }}
                        >+ Create</button>
                      </div>
                      {libraryExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {filteredCustomers.length === 0 ? (
                            <div style={{ padding: "4px 10px" }}>
                              <Text style={{ fontSize: 11, color: "#9CA3AF" }}>No customers yet</Text>
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
                              {showAllCustomers ? "Collapse" : `Show more (${filteredCustomers.length - 5})`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ══ SECTION 4: NHANH (Quick/Recent/Trash) ══ */}
                    <div style={{ borderTop: "0.5px solid #E5E7EB", paddingTop: 12, marginTop: 12 }}>
                      <div style={{ padding: "0 2px 6px 2px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT }}>Nhanh</span>
                      </div>

                      {/* ① Activity log */}
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
                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Activity log</span>
                          </button>
                        );
                      })()}

                      {/* ② Trash */}
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
                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Trash</span>
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
                <Tooltip title="Expand sidebar">
                  <Button icon={SIDEBAR_ICON} onClick={() => setSidebarCollapsed(false)} aria-label="Expand sidebar"
                    style={{ width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "0.5px solid #E5E7EB", flex: "0 0 auto" }} />
                </Tooltip>
              )}

              <div style={{ flex: "1 1 auto", minWidth: 8 }} />

              {/* Filters */}
              {activeSpace === "recent" ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "0 0 auto", minWidth: "max-content", flexWrap: "nowrap" }}>
                  <Input.Search
                    placeholder="Search activity..."
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
                      { value: "all", label: "All activity" },
                      { value: "uploaded", label: "Uploaded document" },
                      { value: "previewed", label: "Previewed" },
                      { value: "downloaded", label: "Downloaded" },
                      { value: "shared_file", label: "Shared document" },
                      { value: "unshared_file", label: "Unshared" },
                      { value: "permission_updated", label: "Permissions updated" },
                      { value: "created", label: "Created folder" },
                      { value: "updated", label: "Other update" },
                      { value: "moved", label: "Moved" },
                      { value: "trash_deleted", label: "Moved to Trash" },
                      { value: "restored", label: "Restored" },
                      { value: "deleted", label: "Permanently delete" },
                    ]}
                  />
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "0 0 auto", minWidth: "max-content", flexWrap: "nowrap" }}>
                  <Input.Search placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 260, borderRadius: 8 }} allowClear />
                  <Select value={sortMode} onChange={setSortMode} style={{ width: 140, borderRadius: 8 }}
                    options={[
                      { value: "manual", label: <span style={{ display: "inline-flex", alignItems: "center", paddingTop: 1 }}>STT</span> },
                      { value: "newest", label: <span style={{ display: "inline-flex", alignItems: "center", paddingTop: 1 }}>Newest</span> },
                      { value: "oldest", label: <span style={{ display: "inline-flex", alignItems: "center", paddingTop: 1 }}>Oldest</span> },
                      { value: "name", label: <span style={{ display: "inline-flex", alignItems: "center", paddingTop: 1 }}>Name A-Z</span> },
                    ]}
                  />
                  <Select allowClear placeholder="Format" style={{ width: 140, borderRadius: 8 }} value={selectedExt} onChange={setSelectedExt} options={fileExtOptions} />
                  <div style={{ display: "inline-flex", gap: 3, padding: 3, border: "0.5px solid #E5E7EB", borderRadius: 8, background: "#FAFAFA" }}>
                    <Tooltip title="Grid">
                      <Button aria-label="Grid" icon={GRID_ICON} onClick={() => setViewMode("grid")}
                        style={{ width: 32, height: 28, borderRadius: 6, border: "none", background: viewMode === "grid" ? "#185FA5" : "transparent", color: viewMode === "grid" ? "#fff" : "#6B7280" }} />
                    </Tooltip>
                    <Tooltip title="Table">
                      <Button aria-label="Table" icon={TABLE_ICON} onClick={() => setViewMode("table")}
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
                        items: [{ key: "create_customer", label: renderNewMenuLabel(TYPE_ICONS.folder, "Create customer") }],
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
              style={{ padding: 20, overflowY: "auto", overflowX: "hidden", background: "#F9FAFB", minWidth: 0, position: "relative" }}
              onDragEnter={handleContentDragEnter}
              onDragOver={handleContentDragOver}
              onDragLeave={handleContentDragLeave}
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

              {(externalDropActive || externalUploadInProgress) && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 20,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: "rgba(24, 95, 165, 0.06)",
                    border: "2px dashed #185FA5",
                    borderRadius: 8,
                    pointerEvents: externalUploadInProgress ? "auto" : "none",
                    fontFamily: FONT,
                  }}
                >
                  <div style={{ fontSize: 32 }}>{TYPE_ICONS.upload}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#185FA5" }}>
                    {externalUploadInProgress ? "Uploading..." : "Drop files or folders here to upload"}
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
                    tableLayout="auto"
                    scroll={{ x: 1120 }}
                    pagination={{
                      current: activityPage,
                      pageSize: 20,
                      onChange: (page) => setActivityPage(page),
                      showSizeChanger: false,
                      total: filteredActivityLogs.length,
                      showTotal: (total, range) => `${range[0]}–${range[1]} / ${total} activities`,
                    }}
                    locale={{
                      emptyText: (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="No activity history found"
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
                          Selected <strong style={{ color: "#111827", fontWeight: 600 }}>{selectedRowKeys.length}</strong> item(s)
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <Button
                          size="small"
                          type="text"
                          onClick={() => setSelectedRowKeys([])}
                          style={{ borderRadius: 6, fontSize: 12, color: "#6B7280", fontFamily: FONT, padding: "4px 8px" }}
                        >
                          Deselect
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
                            {isCustomerRoot ? "No customers yet" :
                              (activeSpace === "trash" ? "Trash is empty" :
                                (query ? "No results found" : "Folder is empty"))}
                          </div>
                          <div style={{ fontSize: 13, color: "#9CA3AF", fontFamily: FONT }}>
                            {isCustomerRoot ? "Click + Create customer below to get started" :
                              (activeSpace === "trash" ? "No deleted files or folders" :
                                (query ? "Try a different search term" : "Click + New to create a folder or upload your first document"))}
                          </div>
                          {isCustomerRoot ? (
                            <button type="button" onClick={() => { createTemplateForm.resetFields(); setIsCreateTemplateOpen(true); }}
                              style={{ padding: "8px 18px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
                              + Create customer
                            </button>
                          ) : (activeSpace !== "trash" && !query) && (
                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                              <button type="button" onClick={() => fileInputRef.current?.click()}
                                style={{ padding: "8px 18px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                + Add document
                              </button>
                              <button type="button" onClick={() => { folderForm.resetFields(); setIsFolderOpen(true); }}
                                style={{ padding: "8px 18px", background: "transparent", color: "#185FA5", border: "1px solid #185FA5", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                + Add folder
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <React.Fragment>
                          {/* ── Section: Customers ── */}
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
                                          <span style={{ color: "#9CA3AF" }}>Customer code: </span>
                                          <strong>{record.customerCode || record.code || extractId(record)}</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: "#9CA3AF" }}>Linked case: </span>
                                          <span>{(record.cases || []).length}</span>
                                        </div>
                                      </div>
                                      <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "0.5px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>Resources:</span>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: "#185FA5" }}>
                                          {foldersCount} Folder · {filesCount} file
                                        </span>
                                      </div>
                                    </Card>
                                  </Col>
                                );
                              })}
                            </Row>
                          )}

                          {/* ── Section: Folder ── */}
                          {tableData.some(r => r._type === "folder") && (
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", marginBottom: 10, fontFamily: FONT }}>Folder</div>
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
                                              Source: {getRecordPathString(record)}
                                            </span>
                                            <span style={{ fontSize: 10, color: "#6B7280", fontFamily: FONT, whiteSpace: "normal", overflowWrap: "anywhere" }} title={getDeletedUserName(record)}>
                                              Deleted by: {getDeletedUserName(record)}
                                            </span>
                                            <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: FONT }}>
                                              Deleted date: {formatDate(record.deletedAt || record.updatedAt || record.deleted_at)}
                                            </span>
                                          </React.Fragment>
                                        ) : (
                                          <React.Fragment>
                                            {isEmpty ? (
                                              <div onClick={(e) => e.stopPropagation()}>
                                                <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: FONT }}>No documents yet</div>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                                  style={{ fontSize: 11, color: "#185FA5", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: FONT }}>
                                                  + Upload your first file
                                                </button>
                                              </div>
                                            ) : (
                                              <span style={{ fontSize: 11, fontWeight: 600, color: "#185FA5" }}>
                                                {folderSubFolderCount} Folder · {folderFileCount} file
                                              </span>
                                            )}
                                            <div style={{ display: "flex", flexDirection: "column", marginTop: 2 }}>
                                              <span style={{ fontSize: 10, color: "#6B7280", fontFamily: FONT }}>
                                                Created date: {formatDate(record.createdAt || record.updatedAt)}
                                              </span>
                                              <span style={{ fontSize: 10, color: "#6B7280", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getUploadUserName(record)}>
                                                Created by: {getUploadUserName(record)}
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
                          {tableData.some(r => r._type === "file") && (
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", marginBottom: 10, fontFamily: FONT }}>Documents</div>
                          )}
                          <Row gutter={[10, 10]}>
                            {tableData.filter(r => r._type === "file").map((record) => {
                              const fileIsEditing = editingTitleId === String(extractId(record));
                              const cardFileName = (() => { const att = getAttachment(record); return att?.title || att?.filename || record.googleDriveUrl || "No attached file"; })();
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
                                            <div style={{ whiteSpace: "normal", overflowWrap: "anywhere" }} title={getRecordPathString(record)}>Source: {getRecordPathString(record)}</div>
                                            <div style={{ whiteSpace: "normal", overflowWrap: "anywhere" }} title={getDeletedUserName(record)}>Deleted by: {getDeletedUserName(record)}</div>
                                            <div style={{ whiteSpace: "normal", overflowWrap: "anywhere", color: "#9CA3AF" }}>Deleted date: {formatDate(record.deletedAt || record.updatedAt || record.deleted_at)}</div>
                                          </div>
                                        ) : (
                                          <div style={{ fontSize: 10, color: "#6B7280", lineHeight: "14px" }}>
                                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Created date: {formatDate(record.uploadedAt || record.createdAt || getDocDate(record))}</div>
                                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getUploadUserName(record)}>Created by: {getUploadUserName(record)}</div>
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
                              {query ? "No results found" : (activeSpace === "trash" ? "Trash is empty" : "Folder is empty")}
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
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Create folder</span>}
          open={isFolderOpen}
          onCancel={() => { setIsFolderOpen(false); folderForm.resetFields(); }}
          footer={null}
          destroyOnClose
        >
          <Text type="secondary">Location: {breadcrumbs.map((item) => item.name).join(" / ")}</Text>
          <Form form={folderForm} layout="vertical" onFinish={handleCreateFolder} style={{ marginTop: 16 }}>
            <Form.Item name="name" label="Folder name" rules={[{ required: true, message: "Please enter a folder name" }]}>
              <Input placeholder="Enter folder name..." />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} placeholder="Short description..." />
            </Form.Item>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button onClick={() => setIsFolderOpen(false)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={folderLoading} style={{ borderRadius: 8, background: "#111827", borderColor: "#111827" }}>Create folder</Button>
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
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Upload folder</span>}
          open={bulkConfirmOpen}
          onCancel={() => { if (bulkUploading) return; setBulkConfirmOpen(false); setPendingFolderFiles([]); }}
          footer={[
            <Button key="cancel" disabled={bulkUploading} onClick={() => setBulkConfirmOpen(false)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Cancel</Button>,
            <Button key="submit" type="primary" loading={bulkUploading} onClick={executeFolderUpload} style={{ borderRadius: 8, background: "#111827", borderColor: "#111827" }}>Confirm upload</Button>,
          ]}
        >
          <Text>Selected {pendingFolderFiles.length} file(s) from an external folder.</Text>
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
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Move</span>}
          open={!!moveRecord}
          onCancel={() => setMoveRecord(null)}
          footer={[
            <Button key="cancel" onClick={() => setMoveRecord(null)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Cancel</Button>,
            <Button key="submit" type="primary" onClick={() => handleMoveRecord(moveRecord, moveTargetId)} style={{ borderRadius: 8, background: "#111827", borderColor: "#111827" }}>Move</Button>,
          ]}
        >
          <Text>Select destination folder for <b>{moveRecord?._type === "folder" ? moveRecord?.name : getDocTitle(moveRecord)}</b></Text>
          <TreeSelect
            value={moveTargetId}
            onChange={setMoveTargetId}
            treeData={moveTreeData}
            style={{ width: "100%", marginTop: 14 }}
            treeDefaultExpandAll
          />
        </Modal>

        <Modal
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Create customer</span>}
          open={isCreateTemplateOpen}
          onCancel={() => { setIsCreateTemplateOpen(false); createTemplateForm.resetFields(); }}
          footer={null}
          destroyOnClose
        >
          <Form form={createTemplateForm} layout="vertical" onFinish={handleCreateCustomer}>
            <Form.Item
              name="title"
              label="Customer name"
              rules={[{ required: true, message: "Please enter a customer name" }]}
            >
              <Input placeholder="Enter customer name..." />
            </Form.Item>
            <Form.Item name="description" label="Note">
              <Input.TextArea rows={3} placeholder="Short note..." />
            </Form.Item>
            <Form.Item
              name="sourceCaseId"
              label="Source case / Root case"
              extra="Select the source case/project related to this customer."
            >
              <Select
                placeholder="Select source case..."
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
              label="Currently linked cases"
              extra="Select active cases in the system to link with this customer."
            >
              <Select
                mode="multiple"
                placeholder="Select linked cases..."
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
              <Button onClick={() => setIsCreateTemplateOpen(false)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createTemplateLoading} style={{ borderRadius: 8, background: "#185FA5", borderColor: "#185FA5" }}>Create</Button>
            </div>
          </Form>
        </Modal>

        <Modal
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Edit document type</span>}
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
              label="Title"
              rules={[{ required: true, message: "Please enter a title" }]}
            >
              <Input placeholder="Enter title..." />
            </Form.Item>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button onClick={() => setEditTemplateRecord(null)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={editTemplateLoading} style={{ borderRadius: 8, background: "#111827", borderColor: "#111827" }}>Save</Button>
            </div>
          </Form>
        </Modal>

        <Modal
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Rename</span>}
          open={!!renameRecord}
          onCancel={() => { setRenameRecord(null); renameForm.resetFields(); }}
          onOk={handleRenameSubmit}
          okText="Save"
          cancelText="Cancel"
          destroyOnClose
        >
          <Form form={renameForm} layout="vertical">
            <Form.Item name="name" label="New name" rules={[{ required: true, message: "Please enter a name" }]}>
              <Input placeholder="Enter new name..." />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Link Reference Case</span>}
          open={isLinkCaseOpen}
          onCancel={() => { setIsLinkCaseOpen(false); setLinkCaseRecord(null); linkCaseForm.resetFields(); }}
          footer={[
            <Button key="cancel" onClick={() => { setIsLinkCaseOpen(false); setLinkCaseRecord(null); linkCaseForm.resetFields(); }} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Cancel</Button>,
            <Button key="submit" type="primary" loading={linkCaseLoading} onClick={() => linkCaseForm.submit()} style={{ borderRadius: 8, background: "#185FA5", borderColor: "#185FA5" }}>Save link</Button>,
          ]}
          destroyOnClose
        >
          <Form form={linkCaseForm} layout="vertical" onFinish={handleLinkCaseSubmit}>
            <Form.Item
              name="caseIds"
              label="Select active Cases/Projects to link"
              extra="The list is drawn from existing projects in the system."
            >
              <Select
                mode="multiple"
                placeholder="Select case..."
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
          title={<span style={{ fontSize: 15, fontWeight: 600, color: "#111827", fontFamily: FONT }}>Move multiple items</span>}
          open={isBulkMoveOpen}
          onCancel={() => setIsBulkMoveOpen(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsBulkMoveOpen(false)} style={{ borderRadius: 8, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Cancel</Button>,
            <Button key="submit" type="primary" onClick={handleBulkMoveSubmit} style={{ borderRadius: 8, background: "#185FA5", borderColor: "#185FA5" }}>Move</Button>,
          ]}
        >
          <Text>Select destination folder for <b>{selectedRowKeys.length} selected item(s)</b></Text>
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
