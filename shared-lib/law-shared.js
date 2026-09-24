// ============================================================
// law-shared.js — Thư viện tiện ích dùng chung cho JS Block (Nocobase)
// ============================================================
// KHÔNG phụ thuộc React/antd — chỉ pure function, an toàn dùng ở
// mọi loại block (JS Block, JS Field/Column/Action, PDF/Docx generator...).
//
// Cách dùng trong 1 JS Block:
//   const Shared = await ctx.importAsync(SHARED_LIB_URL);
//   const { fmtVND, parseNum } = Shared;
//
// SHARED_LIB_URL = URL tĩnh sau khi upload file này lên Nocobase
// file-manager/storage (xem shared-lib/README.md).
//
// QUY TẮC KHI SỬA FILE NÀY:
// 1. Đây là code dùng chung cho nhiều block đang chạy production —
//    KHÔNG đổi hành vi mặc định của hàm đã có, chỉ thêm option mới.
// 2. Mỗi hàm phải nhận option để tái tạo đúng biến thể đã tồn tại
//    trong các file cũ (ví dụ symbol "₫" vs "VNĐ", fallback "-" vs "—").
// 3. Tăng VERSION mỗi khi đổi public API, và cân nhắc đặt tên file
//    vật lý có version (law-shared-v1.js, v2...) khi thay đổi có thể
//    phá vỡ block cũ, để block cũ không tự động ăn code mới chưa test.
// ============================================================

export const VERSION = '1.0.0';

// ------------------------------------------------------------
// Number / id parsing
// ------------------------------------------------------------

/** Chuỗi có định dạng (vd "1.234.567 ₫") -> number. Trả 0 nếu không parse được. */
export function parseNum(v) {
  const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

/** Lấy id từ value có thể là number | string | {id} | [{id}, ...]. */
export function extractId(val) {
  if (val === null || val === undefined || val === '') return null;
  if (Array.isArray(val)) return val.length > 0 ? extractId(val[0]) : null;
  if (typeof val === 'object') return val.id ? parseInt(val.id, 10) : null;
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

// ------------------------------------------------------------
// Currency
// ------------------------------------------------------------

/**
 * Format số tiền VND đầy đủ.
 * Mặc định tái tạo đúng CaseDashboard.js/TaskDetailView.js/MyTask.js: symbol "₫", fallback "—".
 * Truyền { symbol: 'VNĐ' } để tái tạo đúng QuotationPDFBlock.js/ContractPDFBlock.js.
 */
export function fmtVND(n, { symbol = '₫', empty = '—' } = {}) {
  if (n === null || n === undefined || n === '') return empty;
  const num = Number(n);
  if (Number.isNaN(num)) return empty;
  return `${num.toLocaleString('vi-VN')} ${symbol}`;
}

/** Format rút gọn: 1.2 tỷ ₫ / 3.4 tr ₫ / 12.000 ₫ (dùng cho KPI card). */
export function fmtCompactVND(n, { symbol = '₫' } = {}) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ ${symbol}`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr ${symbol}`;
  return `${v.toLocaleString('vi-VN')} ${symbol}`;
}

// ------------------------------------------------------------
// Date
// ------------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');

/** dd/mm/yyyy. Mặc định fallback "-" (theo CaseDashboard.js). Truyền { empty: '' } để tái tạo QuotationCreateForm.js. */
export function fmtDate(val, { empty = '-' } = {}) {
  if (!val) return empty;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return empty;
  return d.toLocaleDateString('vi-VN');
}

/** dd/mm/yyyy, HH:mm (theo CaseCreateForm.js::fmtDateTime). */
export function fmtDateTime(val, { empty = '' } = {}) {
  if (!val) return empty;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return empty;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DD" (input type=date) -> Date, cuối ngày nếu endOfDay=true. null nếu rỗng/invalid. */
export function parseDateInput(val, endOfDay = false) {
  if (!val) return null;
  const d = new Date(`${val}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ------------------------------------------------------------
// Date range helpers (dashboard time-filter: 7d/30d/quarter/year/custom)
// ------------------------------------------------------------

export function rangeToDates(range, customFrom, customTo) {
  const now = new Date();
  let start = null;
  let end = now;
  if (range === '7d') start = new Date(now.getTime() - 7 * 86400000);
  else if (range === '30d') start = new Date(now.getTime() - 30 * 86400000);
  else if (range === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
  } else if (range === 'year') start = new Date(now.getFullYear(), 0, 1);
  else if (range === 'custom') {
    start = parseDateInput(customFrom);
    end = parseDateInput(customTo, true) || now;
  }
  return { start, end };
}

/** Khoảng thời gian liền trước (cùng độ dài) — dùng để tính % so với kỳ trước. */
export function prevRangeDates(range, customFrom, customTo) {
  const { start, end } = rangeToDates(range, customFrom, customTo);
  if (!start) return { start: null, end: null };
  const len = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - len), end: start };
}

export function monthKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** 12 tháng gần nhất: [{ key: "2025-09", label: "T9/25" }, ...]. */
export function last12Months() {
  const out = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: monthKey(d), label: `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}` });
  }
  return out;
}

// ------------------------------------------------------------
// Avatar (tên người -> chữ viết tắt + màu nền ổn định)
// ------------------------------------------------------------

export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#be185d'];

/** Màu nền avatar ổn định theo tên (hash đơn giản, giống bản trong CaseCreateForm.js/QuotationCreateForm.js). */
export function avatarBg(name) {
  const s = String(name || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

// ------------------------------------------------------------
// Financial / service-row helpers (Case/Contract/Quotation services)
// ------------------------------------------------------------

export function isPackagePricing(record) {
  return String(record?.pricingMode || '').toLowerCase().trim() === 'package';
}

export function isDeletedServiceRecord(r) {
  return !!r?.isDeleted || String(r?.status || r?.lineStatus || '').toLowerCase().trim() === 'deleted';
}

/** Tổng tiền 1 dòng dịch vụ: ưu tiên totalAmount, fallback subTotal||basePrice*qty + vat. */
export function serviceRowTotal(r) {
  const total = parseNum(r?.totalAmount);
  if (total) return total;
  const sub = parseNum(r?.subTotal) || parseNum(r?.basePrice) * (parseNum(r?.quantity) || 1);
  return sub + parseNum(r?.vatAmount);
}

// ------------------------------------------------------------
// Dashboard grid layout helpers
// ------------------------------------------------------------

export function clampSpan(span) {
  return [4, 6, 8, 12].includes(span) ? span : 4;
}

export function colProps(span) {
  const s = clampSpan(span);
  return { xs: 24, md: span >= 12 ? 24 : 12, xl: s * 2 };
}

export function moveInArray(arr, key, dir) {
  const idx = arr.indexOf(key);
  const target = idx + dir;
  if (idx < 0 || target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  const tmp = next[idx];
  next[idx] = next[target];
  next[target] = tmp;
  return next;
}

// ------------------------------------------------------------
// CDN lib loader — cache singleton theo URL trong suốt vòng đời module
// (ES module là singleton theo URL trong trình duyệt, nên cache này
// tự nhiên dùng chung giữa mọi block gọi cùng URL, không chỉ trong 1 block).
// ------------------------------------------------------------

const _libLoadCache = new Map();

/**
 * Tạo 1 loader "load 1 lần, dùng lại nhiều lần" cho thư viện UMD tải qua ctx.requireAsync.
 * Ví dụ: const loadChartJs = makeCdnLoader(ctx, 'chart.js@4.4.1/dist/chart.umd.min.js',
 *   { pick: (lib) => (typeof lib === 'function' ? lib : lib?.Chart || lib?.default || lib) });
 * await loadChartJs();
 */
export function makeCdnLoader(ctx, url, { pick } = {}) {
  return function loadLib() {
    if (_libLoadCache.has(url)) return _libLoadCache.get(url);
    const p = ctx.requireAsync(url).then((lib) => (pick ? pick(lib) : lib));
    _libLoadCache.set(url, p);
    return p;
  };
}
