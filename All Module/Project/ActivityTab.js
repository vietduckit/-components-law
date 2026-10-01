// ==================== CONFIG ====================
// ---- ui language (pure; tested by scripts/tests/i18n-blocks.test.js) ----
// Labels follow the language NocoBase's UI runs in (ctx.i18n.language: the
// user's appLang, else the system default; changing it reloads the page):
// Vietnamese for "vi-*", English otherwise. The English text is the key, so a
// label missing from VI shows in English; {name} placeholders are filled from
// vars. Stored data is not translated. Tool: scripts/i18n/ui-strings.js.
const pickLang = (locale) => (/^vi\b/i.test(String(locale || "").trim()) ? "vi" : "en");
const makeTr = (lang, dict) => (text, vars) => {
  const template = (lang === "vi" && dict[text]) || text;
  return vars
    ? template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
    : template;
};
const VI = {
  "Project": "Dự án",
  "Task": "Công việc",
  "Note": "Ghi chú",
  "Document": "Tài liệu",
  "Quotation": "Báo giá",
  "Customer": "Khách hàng",
  "Contract": "Hợp đồng",
  "Created": "Tạo mới",
  "Edited": "Chỉnh sửa",
  "Deleted": "Xóa",
  "Shared": "Chia sẻ",
  "Commented": "Bình luận",
  "Moved": "Di chuyển",
  "Renamed": "Đổi tên",
  "Xem": "Viewed",
  "Status": "Trạng thái",
  "Source": "Nguồn",
  "Contract name": "Tên hợp đồng",
  "Contract code": "Mã hợp đồng",
  "Customer name": "Tên khách hàng",
  "Phone": "Số điện thoại",
  "Email": "Email",
  "Address": "Địa chỉ",
  "Description": "Mô tả",
  "Lawyer in charge": "Luật sư phụ trách",
  "Title": "Tiêu đề",
  "Value": "Giá trị",
  "Start date": "Ngày bắt đầu",
  "End date": "Ngày kết thúc",
  "Signed date": "Ngày ký",
  "Content": "Nội dung",
  "Document code": "Mã tài liệu",
  "Document type": "Loại tài liệu",
  "Priority": "Ưu tiên",
  "Total amount": "Tổng tiền",
  "Sales": "Sale",
  "Company": "Công ty",
  "Template": "Mẫu",
  "Case": "Case",
  "Service": "Dịch vụ",
  "Quotation number": "Số báo giá",
  "Quotation status": "Trạng thái báo giá",
  "Amount": "Số tiền",
  "Payment terms": "Điều khoản TT",
  "Linked to": "Liên kết với",
  "Today": "Hôm nay",
  "Yesterday": "Hôm qua",
  "just now": "vừa xong",
  "{0} min ago": "{0} phút trước",
  "{0} hours ago": "{0} giờ trước",
  "{0} days ago": "{0} ngày trước",
  "To do": "Chưa thực hiện",
  "In progress": "Đang xử lý",
  "Done": "Hoàn thành",
  "Cancelled": "Đã huỷ",
  "Draft": "Nháp",
  "Sent": "Đã gửi",
  "Approved": "Đã duyệt",
  "Rejected": "Từ chối",
  "Paid": "Đã thanh toán",
  "Signed": "Đã ký",
  "Active": "Hiệu lực",
  "High": "Cao",
  "Medium": "Trung bình",
  "Normal": "Bình thường",
  "Lawyer": "Luật sư",
  "Member": "Thành viên",
  "User ": "User ",
  "Lawyer ": "Lawyer ",
  "Customer ": "Customer ",
  "Sales ": "Sales ",
  "Company ": "Công ty ",
  "Template ": "Mẫu ",
  "Service ": "Dịch vụ ",
  "Project #": "Dự án #",
  "Activity": "Mô tả hoạt động",
  "Action": "Hành động",
  "Time": "Thời gian",
  "Record": "Bản ghi",
  "Added a note to {0}: \"{1}\"": "Thêm ghi chú mới vào {0}: \"{1}\"",
  "Removed a note from {0}: \"{1}\"": "Xóa ghi chú khỏi {0}: \"{1}\"",
  "Updated a note on {0}: \"{1}\"": "Cập nhật ghi chú trên {0}: \"{1}\"",
  "Commented on {0}: \"{1}\"": "Bình luận trên {0}: \"{1}\"",
  "Uploaded document \"{0}\"": "Tải lên tài liệu \"{0}\"",
  "Created project \"{0}\"": "Tạo mới dự án \"{0}\"",
  "Created {0}: \"{1}\"": "Tạo mới {0}: \"{1}\"",
  "Deleted {0}: \"{1}\"": "Xóa {0}: \"{1}\"",
  "Changed {0} of {1}: from \"{2}\" to \"{3}\"": "Chỉnh sửa {0} của {1}: từ \"{2}\" thành \"{3}\"",
  "Updated {0} of {1} to \"{2}\"": "Cập nhật {0} của {1} thành \"{2}\"",
  "Cleared {0} of {1}": "Xóa {0} của {1}",
  "Changed {0} of {1}": "Chỉnh sửa {0} của {1}",
  "Updated {0}": "Cập nhật {0}",
  "Show less": "Thu gọn",
  "Show more": "Xem thêm",
  "{0} · {1} activities": "{0} · {1} hoạt động",
  "activities": "hoạt động",
  "1–{0} / {1} activities": "1–{0} / {1} hoạt động",
  "0–0 / 0 activities": "0–0 / 0 hoạt động",
  "{0}–{1} / {2} activities": "{0}–{1} / {2} hoạt động",
  "Previous": "Trước",
  "Sau": "Next",
  "All members": "Tất cả thành viên",
  "Record ID not found": "Không tìm thấy record ID",
  "All sources": "Tất cả nguồn",
  "Activity history": "Lịch sử hoạt động",
  "Loading...": "Đang tải...",
  "Refresh": "Làm mới",
  "Search by member or activity...": "Tìm kiếm theo thành viên, mô tả hoạt động...",
  "All actions": "Tất cả hành động",
  "📅 By day": "📅 Theo ngày",
  "📂 Theo collection": "📂 By collection",
  "⏱ No grouping": "⏱ Không nhóm",
  "From": "Từ ngày",
  "To": "Đến ngày",
  "No activity": "Không có hoạt động nào",
  "System": "Hệ thống",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const COLLECTION_NAME = 'projectInternal';
const RECORD_ID = ctx.record?.id;

const React = ctx.React;
const { useState, useEffect, useMemo, useRef } = React;
const { Spin, Empty, Input, Select, DatePicker } = ctx.antd;
const { RangePicker } = DatePicker;

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ─────────────────────────────────────────────────────────────────
// SVG ICONS (Tabler-style Outline Icons)
// ─────────────────────────────────────────────────────────────────
const Icons = {
  Project: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Task: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Contract: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Note: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  ),
  Document: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  ),
  Quotation: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Customer: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Created: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Updated: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  ),
  Deleted: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Commented: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Uploaded: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8c8c8c' }}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Refresh: ({ className }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
};

// ─────────────────────────────────────────────────────────────────
// MAPPINGS
// ─────────────────────────────────────────────────────────────────

const SOURCE_CFG = {
  projectInternal: { label: tr("Project"), icon: <Icons.Project />, color: '#003eb3', bg: '#f0f5ff', border: '#adc6ff' },
  'Project Internal': { label: tr("Project"), icon: <Icons.Project />, color: '#003eb3', bg: '#f0f5ff', border: '#adc6ff' },
  tasks: { label: tr("Task"), icon: <Icons.Task />, color: '#fa8c16', bg: '#fff7e6', border: '#ffd591' },
  Note: { label: tr("Note"), icon: <Icons.Note />, color: '#434343', bg: '#fafafa', border: '#d9d9d9' },
  Document: { label: tr("Document"), icon: <Icons.Document />, color: '#9e1068', bg: '#fff0f6', border: '#ffadd2' },
  Quotation: { label: tr("Quotation"), icon: <Icons.Quotation />, color: '#3f6600', bg: '#f6ffed', border: '#b7eb8f' },
  Customer: { label: tr("Customer"), icon: <Icons.Customer />, color: '#a8071a', bg: '#fff1f0', border: '#ffa39e' },
  Contract: { label: tr("Contract"), icon: <Icons.Contract />, color: '#0958d9', bg: '#e6f4ff', border: '#91caff' },
};

const ACTION_BADGES = {
  create: { label: tr("Created"), className: 'badge-create' },
  edit: { label: tr("Edited"), className: 'badge-edit' },
  delete: { label: tr("Deleted"), className: 'badge-delete' },
  share: { label: tr("Shared"), className: 'badge-share' },
  comment: { label: tr("Commented"), className: 'badge-comment' },
  move: { label: tr("Moved"), className: 'badge-move' },
  rename: { label: tr("Renamed"), className: 'badge-rename' },
  view: { label: tr("Xem"), className: 'badge-view' },
};

const FIELD_MAP = {
  status: tr("Status"), source: tr("Source"), contractName: tr("Contract name"),
  contractCode: tr("Contract code"), customerName: tr("Customer name"),
  phone: tr("Phone"), email: tr("Email"), address: tr("Address"),
  note: tr("Note"), description: tr("Description"), lawyerId: tr("Lawyer in charge"),
  title: tr("Title"), value: tr("Value"), issuedDate: tr("Start date"),
  endDate: tr("End date"), signedAt: tr("Signed date"), body: tr("Content"),
  documentCode: tr("Document code"), documentType: tr("Document type"),
  priority: tr("Priority"), totalAmount: tr("Total amount"),
  customerId: tr("Customer"), salesId: tr("Sales"), internalCompanyId: tr("Company"),
  templateId: tr("Template"), projectId: tr("Case"), serviceId: tr("Service"),
  quotationNumber: tr("Quotation number"), quotationStatus: tr("Quotation status"),
  amount: tr("Amount"), paymentTerms: tr("Payment terms"),
  collectionName: tr("Linked to"),
};

const SKIP_FIELDS = new Set(['collectionName', 'recordId', 'linkedTo']);
const NO_CURRENCY_FIELDS = new Set([
  'IdentityNumber',
  'documentCode', 'contractCode', 'contractNumber', 'quotationNumber',
  'caseCode', 'id', 'recordId', 'taskId', 'subTaskId', 'projectId',
  'customerId', 'lawyerId', 'leadId', 'serviceId', 'templateId',
  'internalCompanyId', 'assigneeId', 'userId', 'createdById', 'updatedById',
]);

const COLLECTION_LABEL = {
  projectInternal: tr("Project"),
  'Project Internal': tr("Project"),
  tasks: tr("Task"),
  Contract: tr("Contract"), Note: tr("Note"), Document: tr("Document"),
  Quotation: tr("Quotation"), Customer: tr("Customer"),
};

// ─────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────

const fmtDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDay = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(d, today)) return tr("Today");
  if (isSameDay(d, yesterday)) return tr("Yesterday");
  
  // Sentence case weekdays
  const rawDay = d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return rawDay.charAt(0).toUpperCase() + rawDay.slice(1);
};

const getDayKey = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const timeAgo = iso => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return tr("just now");
  if (mins < 60) return tr("{0} min ago", { 0: mins });
  if (hours < 24) return tr("{0} hours ago", { 0: hours });
  if (days < 30) return tr("{0} days ago", { 0: days });
  return fmtDate(iso).split(' ')[0];
};

const fmtField = f => {
  if (!f) return '';
  if (FIELD_MAP[f]) return FIELD_MAP[f];
  const formatted = f
    .replace(/Id$/, '').replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ')
    .trim().split(' ').filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return formatted.charAt(0).toLowerCase() + formatted.slice(1); // sentence case
};

const getTs = log => log.changedAt || log.createdAt || '';

const cleanVal = (v, fieldName) => {
  if (!v || v === 'null' || v === 'undefined') return null;
  const s = v.replace(/<[^>]+>/g, '').trim();
  if (!s) return null;
  if (fieldName === 'collectionName') {
    return COLLECTION_LABEL[s] || s;
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) return fmtDate(s);
  const STATUS = {
    toDo: tr("To do"), inProgress: tr("In progress"), done: tr("Done"),
    cancelled: tr("Cancelled"), draft: tr("Draft"), sent: tr("Sent"), approved: tr("Approved"),
    rejected: tr("Rejected"), paid: tr("Paid"), signed: tr("Signed"), active: tr("Active"),
  };
  if (STATUS[s]) return STATUS[s];
  const PRIO = { high: tr("High"), medium: tr("Medium"), low: tr("Normal") };
  if (PRIO[s]) return PRIO[s];
  if (/^\d+(\.\d+)?$/.test(s)) return s; // keep raw for FK lookup
  const isEnum = /^[a-z][a-zA-Z0-9_]*$/.test(s) && s.length < 40;
  if (isEnum) return s.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim()
    .split(' ').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return s[0].toUpperCase() + s.slice(1);
};

const getMemberRole = (who, fkMap) => {
  if (who === 'Hệ thống') return tr("System");
  const isLawyer = Object.values(fkMap.lawyerId || {}).includes(who);
  if (isLawyer) return tr("Lawyer");
  return tr("Member");
};

const getMappedActionType = (log) => {
  if (log.action === 'created') return 'create';
  if (log.action === 'deleted') return 'delete';
  if (log.action === 'commented') return 'comment';
  if (log.action === 'uploaded') return 'share';
  if (log.action === 'updated') {
    if (log.fieldName === 'collectionName') return 'move';
    if (['contractName', 'customerName', 'title', 'documentCode', 'quotationNumber'].includes(log.fieldName)) return 'rename';
    return 'edit';
  }
  return 'view';
};

// ─────────────────────────────────────────────────────────────────
// FK RESOLVER
// ─────────────────────────────────────────────────────────────────

const FK_SOURCES = [
  { url: 'users:list', fields: 'id,nickname,username', forFields: ['userId', 'projectManagerId', 'assigneeId', 'uploadedById', 'createdById', 'updatedById'], labelFn: r => r.nickname || r.username || (tr("User ") + r.id) },
  { url: 'lawyers:list', fields: 'id,lawyerName', forFields: ['lawyerId'], labelFn: r => r.lawyerName || (tr("Lawyer ") + r.id) },
  { url: 'customers:list', fields: 'id,customerName', forFields: ['customerId'], labelFn: r => r.customerName || (tr("Customer ") + r.id) },
  { url: 'sales:list', fields: 'id,fullName', forFields: ['salesId', 'salespersonId', 'salepersonId'], labelFn: r => r.fullName || (tr("Sales ") + r.id) },
  { url: 'internalCompany:list', fields: 'id,name', forFields: ['internalCompanyId'], labelFn: r => r.name || (tr("Company ") + r.id) },
  { url: 'template:list', fields: 'id,templateName', forFields: ['templateId'], labelFn: r => r.templateName || (tr("Template ") + r.id) },
  { url: 'services:list', fields: 'id,serviceName', forFields: ['serviceId'], labelFn: r => r.serviceName || (tr("Service ") + r.id) },
];

async function fetchFKMap() {
  const fkMap = {};
  await Promise.all(FK_SOURCES.map(async src => {
    try {
      const res = await ctx.api.request({ url: src.url, params: { pageSize: 500, page: 1, fields: src.fields } });
      const idToLabel = {};
      (res?.data?.data || []).forEach(r => { idToLabel[String(r.id)] = src.labelFn(r); });
      src.forFields.forEach(f => { fkMap[f] = idToLabel; });
    } catch {
      src.forFields.forEach(f => { fkMap[f] = fkMap[f] || {}; });
    }
  }));
  return fkMap;
}

// ─────────────────────────────────────────────────────────────────
// FETCH HELPERS
// ─────────────────────────────────────────────────────────────────

async function fetchAll(url, params = {}) {
  try {
    const res = await ctx.api.request({ url, params: { pageSize: 500, page: 1, ...params } });
    return res?.data?.data || [];
  } catch { return []; }
}

async function fetchActivityLogs(collectionName, recordIds) {
  if (!recordIds?.length) return [];
  try {
    const filter = recordIds.length === 1
      ? { $and: [{ collectionName: { $eq: collectionName } }, { recordId: { $eq: parseInt(recordIds[0]) } }] }
      : { $and: [{ collectionName: { $eq: collectionName } }, { recordId: { $in: recordIds.map(Number) } }] };
    const res = await ctx.api.request({
      url: 'activity_log:list',
      params: { pageSize: 500, sort: ['-changedAt'], filter: JSON.stringify(filter) },
    });
    return (res?.data?.data || []).map(l => ({ ...l, _source: collectionName }));
  } catch { return []; }
}



// ─────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────

async function fetchAllLogs(projectId) {
  // Fetch fkMap + project info song song
  const [fkMap, projectInfo] = await Promise.all([
    fetchFKMap(),
    (async () => {
      try {
        const r = await ctx.api.request({
          url: 'projectInternal:get',
          params: { filterByTk: projectId, fields: 'id,projectName,projectCode,projectManagerId' },
        });
        return r?.data?.data || r?.data || {};
      } catch { return {}; }
    })(),
  ]);

  const projectTitle = (projectInfo.projectCode && projectInfo.projectName)
    ? `${projectInfo.projectCode} ${projectInfo.projectName}`
    : (projectInfo.projectName || projectInfo.projectCode || (tr("Project #") + projectId));

  // Chỉ fetch activity_log với collectionName = 'Project Internal'
  // Trigger SQL đã mirror notes/documents/tasks vào đây rồi
  const logs = await fetchActivityLogs('Project Internal', [projectId]);

  const all = logs.sort((a, b) => new Date(getTs(b)) - new Date(getTs(a)));

  return { logs: all, fkMap, contractTitle: projectTitle };
}

// ─────────────────────────────────────────────────────────────────
// TABLE LAYOUT
// ─────────────────────────────────────────────────────────────────

const GRID_TPL = "180px 1fr 140px 150px";

const TableHeader = ({ sortKey, sortOrder, onSort }) => {
  const renderSortIndicator = (key) => {
    if (sortKey !== key) return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4, opacity: 0.4 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    );
    return sortOrder === 'asc' ? (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4 }}>
        <polyline points="18 15 12 9 6 15" />
      </svg>
    ) : (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    );
  };

  return (
    <div className="grid-row grid-header">
      <div className="grid-header-cell">{tr("Member")}</div>
      <div className="grid-header-cell">{tr("Activity")}</div>
      <div className="grid-header-cell sortable" onClick={() => onSort('action')}>
        {tr("Action")} {renderSortIndicator('action')}
      </div>
      <div className="grid-header-cell sortable" onClick={() => onSort('timestamp')}>
        {tr("Time")} {renderSortIndicator('timestamp')}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// LOG ROW
// ─────────────────────────────────────────────────────────────────

const LogRow = ({ log, fkMap, isEven }) => {
  const [expanded, setExpanded] = useState(false);

  const resolve = (v, field) => {
    const c = cleanVal(v, field);
    if (!c) return null;
    const lookup = fkMap[field];
    if (lookup && lookup[c]) return lookup[c];
    if (!NO_CURRENCY_FIELDS.has(log.fieldName) && /^\d+(\.\d+)?$/.test(c) && Number(c) > 100000)
      return Number(c).toLocaleString('vi-VN') + ' ₫';
    return c;
  };

  const oldVal = resolve(log.oldValue, log.fieldName);
  const newVal = resolve(log.newValue, log.fieldName);
  const who = log.changedByName || 'Hệ thống';
  const role = getMemberRole(who, fkMap);

  const mappedAction = getMappedActionType(log);
  const badgeInfo = ACTION_BADGES[mappedAction] || { label: log.action, className: 'badge-view' };
  
  const field = fmtField(log.fieldName || '');
  const record = log._recordLabel || tr("Record");
  
  const getActionText = () => {
    const srcLabel = SOURCE_CFG[log._source]?.label || log._source;

    // Special case for relationship notes/comments
    if (log.fieldName === 'notes') {
      const cleanedNote = newVal || oldVal || '';
      if (log.action === 'created') {
        return tr("Added a note to {0}: \"{1}\"", { 0: record, 1: cleanedNote });
      }
      if (log.action === 'deleted') {
        return tr("Removed a note from {0}: \"{1}\"", { 0: record, 1: cleanedNote });
      }
      return tr("Updated a note on {0}: \"{1}\"", { 0: record, 1: cleanedNote });
    }

    if (log.action === 'commented') {
      return tr("Commented on {0}: \"{1}\"", { 0: record, 1: newVal });
    }
    if (log.action === 'uploaded') {
      return tr("Uploaded document \"{0}\"", { 0: newVal || record });
    }
    if (log.action === 'created') {
      if (log._source === 'projectInternal' || log._source === 'Project Internal') {
        return tr("Created project \"{0}\"", { 0: record });
      }
      return tr("Created {0}: \"{1}\"", { 0: srcLabel.toLowerCase(), 1: record });
    }
    if (log.action === 'deleted') {
      return tr("Deleted {0}: \"{1}\"", { 0: srcLabel.toLowerCase(), 1: record });
    }

    if (field) {
      if (oldVal && newVal) {
        return tr("Changed {0} of {1}: from \"{2}\" to \"{3}\"", { 0: field.toLowerCase(), 1: record, 2: oldVal, 3: newVal });
      } else if (newVal) {
        return tr("Updated {0} of {1} to \"{2}\"", { 0: field.toLowerCase(), 1: record, 2: newVal });
      } else if (oldVal) {
        return tr("Cleared {0} of {1}", { 0: field.toLowerCase(), 1: record });
      }
      return tr("Changed {0} of {1}", { 0: field.toLowerCase(), 1: record });
    }
    return tr("Updated {0}", { 0: record });
  };

  const actionText = getActionText();
  const src = SOURCE_CFG[log._source] || { label: log._source, icon: <Icons.Document />, color: '#595959', bg: '#fafafa', border: '#d9d9d9' };

  const MAX_CHAR = 100;
  const isLong = actionText.length > MAX_CHAR;
  const displayedText = expanded ? actionText : (isLong ? actionText.slice(0, MAX_CHAR) + '...' : actionText);

  return (
    <div 
      className="grid-row clickable"
      style={{ background: isEven ? 'var(--bg-row-even)' : 'var(--bg-row-odd)' }}
      onClick={isLong ? () => setExpanded(p => !p) : undefined}
    >
      {/* Col 1: Member */}
      <div className="grid-cell">
        <div className="member-container">
          <div className="member-avatar">
            {who.slice(0, 2).toUpperCase()}
          </div>
          <div className="member-details">
            <span className="member-name">{who}</span>
            <span className="member-role">{role}</span>
          </div>
        </div>
      </div>

      {/* Col 2: Action Description */}
      <div className="grid-cell">
        <div className="desc-container">
          <span className="desc-icon">{src.icon}</span>
          <span className="desc-text">
            {displayedText}
            {isLong && (
              <span style={{ color: '#096dd9', cursor: 'pointer', marginLeft: 4, textDecoration: 'underline', fontSize: '10.5px' }}>
                {expanded ? tr("Show less") : tr("Show more")}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Col 3: Action Badge */}
      <div className="grid-cell">
        <span className={`badge-pill ${badgeInfo.className}`}>
          {badgeInfo.label}
        </span>
      </div>

      {/* Col 4: Timestamp */}
      <div className="grid-cell">
        <div className="time-container">
          <span className="time-absolute">{fmtDate(getTs(log))}</span>
          <span className="time-relative">{timeAgo(getTs(log))}</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// GROUPING VIEWS
// ─────────────────────────────────────────────────────────────────

const DayGroup = ({ dayKey, logs, fkMap }) => (
  <React.Fragment>
    <div className="day-divider">
      {tr("{0} · {1} activities", { 0: formatDay(dayKey + 'T00:00:00'), 1: logs.length })}
    </div>
    {logs.map((l, i) => (
      <LogRow key={`${l._source}_${l.id}_${i}`} log={l} fkMap={fkMap} isEven={i % 2 === 0} />
    ))}
  </React.Fragment>
);

const CollectionGroup = ({ src, logs, fkMap }) => {
  const cfg = SOURCE_CFG[src] || { label: src, icon: <Icons.Document />, color: '#595959', bg: '#fafafa', border: '#d9d9d9' };
  return (
    <React.Fragment>
      <div className="day-divider">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {cfg.icon} <span>{cfg.label} · {logs.length} {tr("activities")}</span>
        </span>
      </div>
      {logs.map((l, i) => (
        <LogRow key={`${l._source}_${l.id}_${i}`} log={l} fkMap={fkMap} isEven={i % 2 === 0} />
      ))}
    </React.Fragment>
  );
};

const FlatTable = ({ logs, fkMap }) => (
  <React.Fragment>
    {logs.map((l, i) => (
      <LogRow key={`${l._source}_${l.id}_${i}`} log={l} fkMap={fkMap} isEven={i % 2 === 0} />
    ))}
  </React.Fragment>
);

const GroupedLogs = ({ logs, groupBy, fkMap }) => {
  if (groupBy === 'day') {
    const groups = {}, order = [];
    logs.forEach(l => {
      const key = getDayKey(getTs(l));
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(l);
    });
    return (
      <React.Fragment>
        {order.map(dayKey => (
          <DayGroup key={dayKey} dayKey={dayKey} logs={groups[dayKey]} fkMap={fkMap} />
        ))}
      </React.Fragment>
    );
  }
  if (groupBy === 'collection') {
    const groups = {}, order = [];
    logs.forEach(l => {
      if (!groups[l._source]) { groups[l._source] = []; order.push(l._source); }
      groups[l._source].push(l);
    });
    order.sort((a, b) => groups[b].length - groups[a].length);
    return (
      <React.Fragment>
        {order.map(src => (
          <CollectionGroup key={src} src={src} logs={groups[src]} fkMap={fkMap} />
        ))}
      </React.Fragment>
    );
  }
  return <FlatTable logs={logs} fkMap={fkMap} />;
};

// ─────────────────────────────────────────────────────────────────
// PAGINATION BAR
// ─────────────────────────────────────────────────────────────────

const PaginationBar = ({ currentPage, pageSize, totalCount, onPageChange }) => {
  const pageCount = Math.ceil(totalCount / pageSize);
  if (pageCount <= 1) return (
    <div className="pagination-bar">
      <span>{totalCount > 0 ? tr("1–{0} / {1} activities", { 0: totalCount, 1: totalCount }) : tr("0–0 / 0 activities")}</span>
    </div>
  );

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  const pages = [];
  for (let i = 1; i <= pageCount; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination-bar">
      <span>{tr("{0}–{1} / {2} activities", { 0: start, 1: end, 2: totalCount })}</span>
      <div className="pagination-buttons">
        <button 
          className="pagination-btn" 
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          {tr("Previous")}
        </button>
        {pages.map(p => (
          <button 
            key={p} 
            className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button 
          className="pagination-btn" 
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(currentPage + 1)}
        >
          {tr("Sau")}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [fkMap, setFKMap] = useState({});
  const [contractTitle, setContractTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [srcFilter, setSrcFilter] = useState('all');
  const [actFilter, setActFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [groupBy, setGroupBy] = useState('day');
  const [sortKey, setSortKey] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fetching = useRef(false);
  const hasLoaded = useRef(false);

  const load = async (force = false) => {
    if (!RECORD_ID || fetching.current) return;
    if (hasLoaded.current && !force) return;
    fetching.current = true;
    setLoading(true);
    try {
      const { logs: all, fkMap: fm, contractTitle: title } = await fetchAllLogs(RECORD_ID);
      setLogs(all);
      setFKMap(fm);
      setContractTitle(title);
      hasLoaded.current = true;
    } catch (e) { console.error(e); }
    setLoading(false);
    fetching.current = false;
  };

  useEffect(() => { load(); }, []);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Dynamically extract all member options from raw logs
  const memberOptions = useMemo(() => {
    const names = new Set();
    logs.forEach(l => {
      const who = l.changedByName || 'Hệ thống';
      names.add(who);
    });
    return [
      { value: 'all', label: tr("All members") },
      ...Array.from(names).map(name => ({ value: name, label: name }))
    ];
  }, [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    if (SKIP_FIELDS.has(l.fieldName)) return false;
    if (srcFilter !== 'all' && l._source !== srcFilter) return false;
    
    // Member filter
    if (memberFilter !== 'all') {
      const who = l.changedByName || 'Hệ thống';
      if (who !== memberFilter) return false;
    }

    // Action filter (mappings to create, edit, delete, etc.)
    if (actFilter !== 'all') {
      const mapped = getMappedActionType(l);
      if (mapped !== actFilter) return false;
    }

    if (dateRange?.[0] && dateRange?.[1]) {
      const d = new Date(getTs(l));
      const s = dateRange[0].startOf('day').toDate();
      const e = dateRange[1].endOf('day').toDate();
      if (d < s || d > e) return false;
    }

    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      const who = l.changedByName || 'Hệ thống';
      const role = getMemberRole(who, fkMap);
      const field = fmtField(l.fieldName || '');
      const record = l._recordLabel || tr("Record");
      
      return [
        field,
        l.oldValue,
        l.newValue,
        who,
        role,
        record,
        l._parentInfo?.code,
        l._source
      ].some(v => (v || '').toLowerCase().includes(kw));
    }
    return true;
  }), [logs, srcFilter, actFilter, memberFilter, dateRange, keyword, fkMap]);

  // Sort logs based on key and order
  const sortedLogs = useMemo(() => {
    const result = [...filtered];
    result.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'timestamp') {
        const timeA = new Date(getTs(a)).getTime();
        const timeB = new Date(getTs(b)).getTime();
        comparison = timeA - timeB;
      } else if (sortKey === 'action') {
        const typeA = getMappedActionType(a);
        const typeB = getMappedActionType(b);
        comparison = typeA.localeCompare(typeB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [filtered, sortKey, sortOrder]);

  const paginatedLogs = useMemo(() => {
    return sortedLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [sortedLogs, currentPage]);

  if (!RECORD_ID) return (
    <div style={{ padding: 16, fontFamily: FONT, color: '#8c8c8c' }}>{tr("Record ID not found")}</div>
  );

  const srcOptions = [
    { value: 'all', label: tr("All sources") },
    ...Object.entries(SOURCE_CFG).map(([k, v]) => ({
      value: k,
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {v.icon} <span>{v.label}</span>
        </span>
      )
    })),
  ];

  return (
    <div className="activity-log-container">
      {/* Dynamic CSS Stylesheet - Clean Flat Minimal Design */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          --border-color: #e0e0e0;
          --border-width: 0.5px;
          --text-primary: #1f1f1f;
          --text-secondary: #5f6368;
          --bg-hover: #fcfcfc;
          --bg-row-even: #ffffff;
          --bg-row-odd: #fafafa;
          --bg-header: #f8f9fa;
          
          /* Flat colored badges with no shadows */
          --badge-create-text: #1b602e;
          --badge-create-bg: #e6f4ea;
          --badge-edit-text: #0c54a3;
          --badge-edit-bg: #e8f0fe;
          --badge-delete-text: #b31412;
          --badge-delete-bg: #fce8e6;
          --badge-share-text: #681da8;
          --badge-share-bg: #f3e8fd;
          --badge-comment-text: #b06000;
          --badge-comment-bg: #fef3d6;
          --badge-move-text: #007a78;
          --badge-move-bg: #e1f5fe;
          --badge-rename-text: #c2185b;
          --badge-rename-bg: #fce4ec;
          --badge-view-text: #5f6368;
          --badge-view-bg: #f1f3f4;
        }
        
        .activity-log-container {
          padding: 16px;
          font-family: var(--font-family);
          color: var(--text-primary);
        }
        
        .title-section {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .toolbar {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .toolbar-row-top {
          width: 100%;
        }
        
        .toolbar-row-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        /* Flattening AntD styles to match flat minimal guidelines */
        .ant-input, .ant-select-selector, .ant-picker {
          border-width: var(--border-width) !important;
          border-color: var(--border-color) !important;
          box-shadow: none !important;
          border-radius: 4px !important;
        }
        .ant-select-focused .ant-select-selector, .ant-input-focused, .ant-picker-focused {
          border-color: var(--text-primary) !important;
        }
        
        .table-container {
          border: var(--border-width) solid var(--border-color);
          border-radius: 4px;
          overflow: hidden;
          background: var(--bg-row-even);
        }
        
        .day-divider {
          padding: 8px 12px;
          background: var(--bg-row-odd);
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          border-bottom: var(--border-width) solid var(--border-color);
          border-top: var(--border-width) solid var(--border-color);
          display: block;
          text-align: left;
        }
        .day-divider:first-of-type {
          border-top: none;
        }
        
        .grid-row {
          display: grid;
          grid-template-columns: ${GRID_TPL};
          gap: 0;
          border-bottom: var(--border-width) solid var(--border-color);
          align-items: center;
          transition: background-color 0.15s ease;
        }
        .grid-row:last-child {
          border-bottom: none;
        }
        .grid-row.clickable {
          cursor: pointer;
        }
        .grid-row.clickable:hover {
          background-color: var(--bg-hover);
        }
        
        .grid-header {
          background: var(--bg-header);
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 11px;
          border-bottom: var(--border-width) solid var(--border-color);
        }
        
        .grid-header-cell {
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          user-select: none;
          text-align: left;
        }
        .grid-header-cell.sortable {
          cursor: pointer;
        }
        .grid-header-cell.sortable:hover {
          color: var(--text-primary);
        }
        
        .grid-cell {
          padding: 12px;
          font-size: 12px;
          display: flex;
          align-items: center;
          overflow: hidden;
          text-align: left;
        }
        
        .member-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .member-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-row-odd);
          border: var(--border-width) solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .member-details {
          display: flex;
          flex-direction: column;
          line-height: 1.3;
        }
        .member-name {
          font-weight: 500;
          color: var(--text-primary);
        }
        .member-role {
          font-size: 10px;
          color: var(--text-secondary);
        }
        
        .desc-container {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.45;
        }
        .desc-icon {
          display: inline-flex;
          align-items: center;
          color: var(--text-secondary);
          margin-top: 2px;
          flex-shrink: 0;
        }
        .desc-text {
          color: var(--text-primary);
        }
        
        .badge-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
        }
        .badge-create { color: var(--badge-create-text); background: var(--badge-create-bg); }
        .badge-edit { color: var(--badge-edit-text); background: var(--badge-edit-bg); }
        .badge-delete { color: var(--badge-delete-text); background: var(--badge-delete-bg); }
        .badge-share { color: var(--badge-share-text); background: var(--badge-share-bg); }
        .badge-comment { color: var(--badge-comment-text); background: var(--badge-comment-bg); }
        .badge-move { color: var(--badge-move-text); background: var(--badge-move-bg); }
        .badge-rename { color: var(--badge-rename-text); background: var(--badge-rename-bg); }
        .badge-view { color: var(--badge-view-text); background: var(--badge-view-bg); }
        
        .time-container {
          display: flex;
          flex-direction: column;
          line-height: 1.3;
        }
        .time-absolute {
          color: var(--text-primary);
        }
        .time-relative {
          font-size: 10.5px;
          color: var(--text-secondary);
        }
        
        .refresh-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: var(--border-width) solid var(--border-color);
          background: transparent;
          cursor: pointer;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }
        .refresh-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          border-color: var(--text-secondary);
        }
        
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-top: var(--border-width) solid var(--border-color);
          background: var(--bg-row-even);
          font-size: 11.5px;
          color: var(--text-secondary);
        }
        
        .pagination-buttons {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .pagination-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: var(--border-width) solid var(--border-color);
          background: transparent;
          color: var(--text-primary);
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10.5px;
          transition: all 0.15s ease;
        }
        .pagination-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          border-color: var(--text-secondary);
        }
        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .pagination-btn.active {
          background: var(--text-primary);
          color: var(--bg-row-even);
          border-color: var(--text-primary);
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spin 1s linear infinite;
        }
      ` }} />

      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="title-section">{tr("Activity history")}</span>
          {contractTitle && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>· {contractTitle}</span>}
          {!loading && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              · {filtered.length}{filtered.length !== logs.length ? `/${logs.length}` : ''} {tr("activities")}
            </span>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="refresh-btn"
        >
          <Icons.Refresh className={loading ? 'spin-anim' : ''} />
          {loading ? tr("Loading...") : tr("Refresh")}
        </button>
      </div>

      {/* Toolbar Filters */}
      <div className="toolbar">
        <div className="toolbar-row-top">
          <Input
            placeholder={tr("Search by member or activity...")}
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setCurrentPage(1); }}
            allowClear
            prefix={<Icons.Search />}
            size="small"
            style={{ width: '100%' }}
          />
        </div>
        <div className="toolbar-row-filters">
          <Select
            value={actFilter}
            onChange={val => { setActFilter(val); setCurrentPage(1); }}
            size="small"
            style={{ width: 148 }}
            options={[
              { value: 'all', label: tr("All actions") },
              { value: 'create', label: tr("Created") },
              { value: 'edit', label: tr("Edited") },
              { value: 'delete', label: tr("Deleted") },
              { value: 'share', label: tr("Shared") },
              { value: 'comment', label: tr("Commented") },
              { value: 'move', label: tr("Moved") },
              { value: 'rename', label: tr("Renamed") },
              { value: 'view', label: tr("Xem") },
            ]}
          />
          <Select
            value={memberFilter}
            onChange={val => { setMemberFilter(val); setCurrentPage(1); }}
            size="small"
            style={{ width: 180 }}
            options={memberOptions}
          />
          <Select
            value={srcFilter}
            onChange={val => { setSrcFilter(val); setCurrentPage(1); }}
            size="small"
            style={{ width: 148 }}
            options={srcOptions}
          />
          <Select
            value={groupBy}
            onChange={val => { setGroupBy(val); setCurrentPage(1); }}
            size="small"
            style={{ width: 148 }}
            options={[
              { value: 'day', label: tr("📅 By day") },
              { value: 'collection', label: tr("📂 Theo collection") },
              { value: 'none', label: tr("⏱ No grouping") },
            ]}
          />
          <RangePicker
            size="small"
            onChange={range => { setDateRange(range); setCurrentPage(1); }}
            format="DD/MM/YYYY"
            placeholder={[tr("From"), tr("To")]}
            style={{ flex: '1 1 200px' }}
            allowClear
          />
        </div>
      </div>

      {/* Grid Container */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : filtered.length === 0 ? (
        <Empty description={tr("No activity")} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '32px 0' }} />
      ) : (
        <div className="table-container">
          <TableHeader sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} />
          <GroupedLogs logs={paginatedLogs} groupBy={groupBy} fkMap={fkMap} />
          <PaginationBar 
            currentPage={currentPage} 
            pageSize={pageSize} 
            totalCount={sortedLogs.length} 
            onPageChange={setCurrentPage} 
          />
        </div>
      )}
    </div>
  );
};

ctx.render(<ActivityLog />);