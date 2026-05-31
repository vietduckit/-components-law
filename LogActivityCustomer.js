// ==================== CONFIG ====================
const COLLECTION_NAME = "Customer";
const RECORD_ID = ctx.record?.id;

const { useState, useEffect, useMemo, useRef } = ctx.React;
const { Spin, Empty, Input, Select, DatePicker } = ctx.antd;
const { RangePicker } = DatePicker;
const { React } = ctx;

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ─────────────────────────────────────────────────────────────────
// SOURCE & ACTION CONFIG
// ─────────────────────────────────────────────────────────────────

const SOURCE_CFG = {
  Customer: {
    label: "Khách hàng",
    icon: "👤",
    color: "#0958d9",
    bg: "#e6f4ff",
    border: "#91caff",
  },
  Note: {
    label: "Ghi chú",
    icon: "📝",
    color: "#434343",
    bg: "#fafafa",
    border: "#d9d9d9",
  },
  Document: {
    label: "Tài liệu",
    icon: "📎",
    color: "#9e1068",
    bg: "#fff0f6",
    border: "#ffadd2",
  },
  Quotation: {
    label: "Báo giá",
    icon: "💼",
    color: "#3f6600",
    bg: "#f6ffed",
    border: "#b7eb8f",
  },
  Contract: {
    label: "Hợp đồng",
    icon: "📜",
    color: "#003eb3",
    bg: "#f0f5ff",
    border: "#adc6ff",
  },
  Project: {
    label: "Case",
    icon: "📁",
    color: "#531dab",
    bg: "#f9f0ff",
    border: "#d3adf7",
  },
  Invoice: {
    label: "Hoá đơn",
    icon: "🧾",
    color: "#874d00",
    bg: "#fffbe6",
    border: "#ffd591",
  },
  Payment: {
    label: "Thanh toán",
    icon: "💰",
    color: "#a8071a",
    bg: "#fff1f0",
    border: "#ffa39e",
  },
};

const ACTION_CFG = {
  created: {
    label: "Tạo mới",
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
    icon: "✨",
  },
  updated: {
    label: "Cập nhật",
    color: "#d46b08",
    bg: "#fff7e6",
    border: "#ffd591",
    icon: "✏️",
  },
  deleted: {
    label: "Xoá",
    color: "#cf1322",
    bg: "#fff1f0",
    border: "#ffa39e",
    icon: "🗑",
  },
  commented: {
    label: "Bình luận",
    color: "#096dd9",
    bg: "#e6f4ff",
    border: "#91caff",
    icon: "💬",
  },
  uploaded: {
    label: "Tải lên",
    color: "#531dab",
    bg: "#f9f0ff",
    border: "#d3adf7",
    icon: "📎",
  },
};

// ─────────────────────────────────────────────────────────────────
// FIELD MAP
// ─────────────────────────────────────────────────────────────────

const FIELD_MAP = {
  status: "Trạng thái",
  source: "Nguồn",
  companyLegalName: "Tên pháp lý",
  phone: "Số điện thoại",
  email: "Email",
  address: "Địa chỉ",
  note: "Ghi chú",
  description: "Mô tả",
  lawyerId: "Luật sư",
  title: "Tiêu đề",
  needs: "Nhu cầu",
  expectedRevenue: "Doanh thu dự kiến",
  priority: "Mức độ ưu tiên",
  body: "Nội dung",
  documentCode: "Mã tài liệu",
  documentType: "Loại tài liệu",
  taxCode: "Mã số thuế",
  companyName: "Tên công ty",
  corporateRepresentative: "Người đại diện",
  salesId: "Sale",
  customerId: "Khách hàng",
  internalCompanyId: "Công ty",
  templateId: "Mẫu",
  leadId: "Lead",
  serviceId: "Dịch vụ",
  projectManagerId: "Quản lý",
  googleDriveUrl: "Google Drive",
  customerType: "Loại khách hàng",
  city: "Thành phố",
  birthday: "Ngày sinh",
  gender: "Giới tính",
  job: "Nghề nghiệp",
  IdentityNumber: "CMND/CCCD",
  customerIdIssuedDate: "Ngày cấp",
  customerIdIssuedPlace: "Nơi cấp",
  totalAmount: "Tổng tiền",
  quotationNumber: "Số báo giá",
  contractCode: "Mã hợp đồng",
  paymentTerms: "Điều khoản TT",
  invoicingStatus: "Trạng thái HĐ",
  signedDate: "Ngày ký",
  amount: "Số tiền",
  invoiceNumber: "Số hoá đơn",
  paymentDate: "Ngày thanh toán",
  dueDate: "Ngày đến hạn",
  projectName: "Tên case",
  caseCode: "Mã case",
  collectionName: "Liên kết với",
};

const SKIP_FIELDS = new Set([
  "collectionName",
  "recordId",
  "linkedTo",
  "snapshotIntroText",
  "snapshotClosingText",
  "snapshotTermsAndConditions",
  "snapshotServicesScopeNote",
  "snapshotVatNote",
  "snapshotOverview",
]);

const CURRENCY_FIELDS = new Set([
  "totalAmount",
  "value",
  "amount",
  "expectedRevenue",
]);

// ─────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDay = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Hôm nay";
  if (sameDay(d, yesterday)) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getDayKey = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 30) return `${days} ngày trước`;
  return fmtDate(iso).split(",")[0];
};

const fmtField = (f) => {
  if (!f) return "";
  if (FIELD_MAP[f]) return FIELD_MAP[f];
  return f
    .replace(/Id$/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
};

const getTs = (log) => log.changedAt || log.createdAt || "";

const COLLECTION_LABEL = {
  Customer: "Khách hàng",
  Note: "Ghi chú",
  Document: "Tài liệu",
  Quotation: "Báo giá",
  Contract: "Hợp đồng",
  Project: "Case",
  Invoice: "Hoá đơn",
  Payment: "Thanh toán",
};

const cleanVal = (v, fieldName) => {
  if (!v || v === "null" || v === "undefined") return null;
  const s = v.replace(/<[^>]+>/g, "").trim();
  if (!s) return null;
  if (fieldName === "collectionName") {
    const cfg = SOURCE_CFG[s];
    return cfg ? `${cfg.icon} ${cfg.label}` : COLLECTION_LABEL[s] || s;
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) return fmtDate(s);
  const STATUS = {
    toDo: "Chưa thực hiện",
    inProgress: "Đang xử lý",
    done: "Hoàn thành",
    cancelled: "Đã huỷ",
    draft: "Nháp",
    sent: "Đã gửi",
    approved: "Đã duyệt",
    rejected: "Từ chối",
    paid: "Đã thanh toán",
    signed: "Đã ký",
    active: "Hiệu lực",
    new: "Mới",
    contacted: "Đã liên hệ",
    qualified: "Tiềm năng",
    lost: "Thua",
    prospect: "Tiềm năng",
    company: "Công ty",
    individual: "Cá nhân",
  };
  if (STATUS[s]) return STATUS[s];
  const PRIO = { high: "Cao", medium: "Trung bình", low: "Bình thường" };
  if (PRIO[s]) return PRIO[s];
  if (/^\d+(\.\d+)?$/.test(s)) return s;
  const isEnum = /^[a-z][a-zA-Z0-9_]*$/.test(s) && s.length < 40;
  if (isEnum)
    return s
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
  return s[0].toUpperCase() + s.slice(1);
};

// ─────────────────────────────────────────────────────────────────
// FK RESOLVER
// ─────────────────────────────────────────────────────────────────

const FK_SOURCES = [
  {
    url: "users:list",
    fields: "id,nickname,username",
    forFields: [
      "userId",
      "projectManagerId",
      "assigneeId",
      "uploadedById",
      "createdById",
      "updatedById",
    ],
    labelFn: (r) => r.nickname || r.username || "User " + r.id,
  },
  {
    url: "lawyers:list",
    fields: "id,lawyerName",
    forFields: ["lawyerId"],
    labelFn: (r) => r.lawyerName || "Lawyer " + r.id,
  },
  {
    url: "sales:list",
    fields: "id,fullName",
    forFields: ["salesId", "salespersonId", "salepersonId"],
    labelFn: (r) => r.fullName || "Sales " + r.id,
  },
  {
    url: "internalCompany:list",
    fields: "id,name",
    forFields: ["internalCompanyId"],
    labelFn: (r) => r.name || "Company " + r.id,
  },
  {
    url: "services:list",
    fields: "id,serviceName",
    forFields: ["serviceId"],
    labelFn: (r) => r.serviceName || "Service " + r.id,
  },
  {
    url: "lead:list",
    fields: "id,fullName,leadType,companyName,corporateRepresentative",
    forFields: ["leadId"],
    labelFn: (r) =>
      r.leadType === "company"
        ? r.companyName || r.corporateRepresentative || "Lead " + r.id
        : r.fullName || "Lead " + r.id,
  },
  {
    url: "customers:list",
    fields: "id,customerName,companyLegalName,customerType",
    forFields: ["customerId"],
    labelFn: (r) =>
      r.customerType === "company"
        ? r.companyLegalName || r.customerName || "Customer " + r.id
        : r.customerName || "Customer " + r.id,
  },
  {
    url: "quotations:list",
    fields: "id,quotationNumber",
    forFields: ["quotationId"],
    labelFn: (r) => r.quotationNumber || "Báo giá #" + r.id,
  },
  {
    url: "contracts:list",
    fields: "id,contractCode,contractName",
    forFields: ["contractId"],
    labelFn: (r) => r.contractCode || r.contractName || "Hợp đồng #" + r.id,
  },
  {
    url: "projects:list",
    fields: "id,projectName,caseCode",
    forFields: ["projectId"],
    labelFn: (r) => r.projectName || r.caseCode || "Case #" + r.id,
  },
];

async function fetchFKMap() {
  const fkMap = {};
  await Promise.all(
    FK_SOURCES.map(async (src) => {
      try {
        const res = await ctx.api.request({
          url: src.url,
          params: { pageSize: 500, page: 1, fields: src.fields },
        });
        const idToLabel = {};
        (res?.data?.data || []).forEach((r) => {
          idToLabel[String(r.id)] = src.labelFn(r);
        });
        src.forFields.forEach((f) => {
          fkMap[f] = idToLabel;
        });
      } catch {
        src.forFields.forEach((f) => {
          fkMap[f] = fkMap[f] || {};
        });
      }
    }),
  );
  return fkMap;
}

// ─────────────────────────────────────────────────────────────────
// FETCH HELPERS
// ─────────────────────────────────────────────────────────────────

async function fetchAll(url, params = {}) {
  try {
    const res = await ctx.api.request({
      url,
      params: { pageSize: 500, page: 1, ...params },
    });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}

async function fetchActivityLogs(collectionName, recordIds) {
  if (!recordIds?.length) return [];
  try {
    const filter =
      recordIds.length === 1
        ? {
            $and: [
              { collectionName: { $eq: collectionName } },
              { recordId: { $eq: parseInt(recordIds[0]) } },
            ],
          }
        : {
            $and: [
              { collectionName: { $eq: collectionName } },
              { recordId: { $in: recordIds.map(Number) } },
            ],
          };
    const res = await ctx.api.request({
      url: "activity_log:list",
      params: {
        pageSize: 500,
        sort: ["-changedAt"],
        filter: JSON.stringify(filter),
      },
    });
    return (res?.data?.data || []).map((l) => ({
      ...l,
      _source: collectionName,
    }));
  } catch {
    return [];
  }
}

async function fetchPolymorphicIds(apiUrl, fields, parentPairs) {
  const validPairs = parentPairs.filter((p) => p.recordId != null);
  if (!validPairs.length) return [];
  const grouped = {};
  validPairs.forEach(({ collectionName, recordId }) => {
    if (!grouped[collectionName]) grouped[collectionName] = [];
    grouped[collectionName].push(parseInt(recordId));
  });
  const conditions = Object.entries(grouped).map(([col, ids]) => ({
    $and: [
      { collectionName: { $eq: col } },
      ids.length === 1
        ? { recordId: { $eq: ids[0] } }
        : { recordId: { $in: ids } },
    ],
  }));
  const filter = conditions.length === 1 ? conditions[0] : { $or: conditions };
  const rows = await fetchAll(apiUrl, {
    fields,
    filter: JSON.stringify(filter),
  });
  const seen = new Set();
  return rows.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────

async function fetchAllLogs(customerId) {
  const safe = async (url, params) => {
    try {
      return await fetchAll(url, params);
    } catch {
      return [];
    }
  };

  // Step 1: fkMap + customer info + direct logs in parallel
  const [fkMap, custRes, customerLogs] = await Promise.all([
    fetchFKMap(),
    ctx.api
      .request({ url: "customers:get", params: { filterByTk: customerId } })
      .then((r) => r?.data?.data ?? r?.data ?? {})
      .catch(() => ({})),
    fetchActivityLogs("Customer", [customerId]),
  ]);

  const custRecord = custRes || {};
  const customerLabel =
    custRecord.customerType === "company"
      ? custRecord.companyLegalName ||
        custRecord.corporateRepresentative ||
        custRecord.customerName ||
        "Customer"
      : custRecord.customerName || "Customer";

  // Step 2: fetch all related entities by customerId in parallel
  const byCustomer = (url, fields) =>
    safe(url, {
      fields,
      filter: JSON.stringify({ customerId: { $eq: parseInt(customerId) } }),
    });

  const [quotations, contracts, projects, invoices, payments] =
    await Promise.all([
      byCustomer("quotations:list", "id,quotationNumber"),
      byCustomer("contracts:list", "id,contractCode,contractName"),
      byCustomer("projects:list", "id,projectName,caseCode"),
      byCustomer("invoices:list", "id,invoiceNumber"),
      byCustomer("payments:list", "id,amount,paymentDate"),
    ]);

  const quotationIds = quotations.map((q) => q.id);
  const contractIds = contracts.map((c) => c.id);
  const projectIds = projects.map((p) => p.id);
  const invoiceIds = invoices.map((i) => i.id);
  const paymentIds = payments.map((p) => p.id);

  // Step 3: Polymorphic notes + documents covering all parent entities
  const parentPairs = [
    { collectionName: "Customer", recordId: customerId },
    ...quotationIds.map((id) => ({
      collectionName: "Quotation",
      recordId: id,
    })),
    ...contractIds.map((id) => ({ collectionName: "Contract", recordId: id })),
    ...projectIds.map((id) => ({ collectionName: "Project", recordId: id })),
    ...invoiceIds.map((id) => ({ collectionName: "Invoice", recordId: id })),
    ...paymentIds.map((id) => ({ collectionName: "Payment", recordId: id })),
  ];

  const [notes, documents] = await Promise.all([
    fetchPolymorphicIds(
      "notes:list",
      "id,title,body,collectionName,recordId",
      parentPairs,
    ),
    fetchPolymorphicIds(
      "documents:list",
      "id,documentCode,title,collectionName,recordId",
      parentPairs,
    ),
  ]);

  const noteIds = notes.map((n) => n.id);
  const documentIds = documents.map((d) => d.id);

  // Step 4: activity_log for all groups in parallel
  const SKIP = new Set([
    "collectionName",
    "recordId",
    "linkedTo",
    "snapshotIntroText",
    "snapshotClosingText",
    "snapshotTermsAndConditions",
    "snapshotServicesScopeNote",
    "snapshotVatNote",
    "snapshotOverview",
  ]);

  const filterSkip = (ls) => ls.filter((l) => !SKIP.has(l.fieldName));

  const [
    quotationLogs,
    contractLogs,
    projectLogs,
    invoiceLogs,
    paymentLogs,
    noteLogs,
    documentLogs,
  ] = await Promise.all([
    quotationIds.length
      ? fetchActivityLogs("Quotation", quotationIds).then(filterSkip)
      : [],
    contractIds.length
      ? fetchActivityLogs("Contract", contractIds).then(filterSkip)
      : [],
    projectIds.length
      ? fetchActivityLogs("Project", projectIds).then(filterSkip)
      : [],
    invoiceIds.length
      ? fetchActivityLogs("Invoice", invoiceIds).then(filterSkip)
      : [],
    paymentIds.length
      ? fetchActivityLogs("Payment", paymentIds).then(filterSkip)
      : [],
    noteIds.length ? fetchActivityLogs("Note", noteIds).then(filterSkip) : [],
    documentIds.length
      ? fetchActivityLogs("Document", documentIds).then(filterSkip)
      : [],
  ]);

  // Step 5: Build label maps + parent maps
  const recordLabelMap = {};
  const parentLabelMap = {};

  recordLabelMap[`Customer_${customerId}`] = customerLabel;
  quotations.forEach((q) => {
    recordLabelMap[`Quotation_${q.id}`] = q.quotationNumber || `#${q.id}`;
  });
  contracts.forEach((c) => {
    recordLabelMap[`Contract_${c.id}`] =
      c.contractCode || c.contractName || `#${c.id}`;
  });
  projects.forEach((p) => {
    recordLabelMap[`Project_${p.id}`] =
      p.projectName || p.caseCode || `#${p.id}`;
  });
  invoices.forEach((i) => {
    recordLabelMap[`Invoice_${i.id}`] = i.invoiceNumber || `#${i.id}`;
  });
  payments.forEach((p) => {
    const label = p.amount
      ? Number(p.amount).toLocaleString("vi-VN") + " ₫"
      : `#${p.id}`;
    recordLabelMap[`Payment_${p.id}`] = label;
  });

  const buildParentInfo = (colName, recordId) => {
    const cfg = SOURCE_CFG[colName] || null;
    const colLabel = cfg ? cfg.label : colName;
    if (colName === "Customer") return { colLabel, code: customerLabel };
    if (colName === "Quotation") {
      const q = quotations.find((q) => q.id === recordId);
      return { colLabel, code: q?.quotationNumber || `#${recordId}` };
    }
    if (colName === "Contract") {
      const c = contracts.find((c) => c.id === recordId);
      return {
        colLabel,
        code: c?.contractCode || c?.contractName || `#${recordId}`,
      };
    }
    if (colName === "Project") {
      const p = projects.find((p) => p.id === recordId);
      return {
        colLabel,
        code: p?.projectName || p?.caseCode || `#${recordId}`,
      };
    }
    if (colName === "Invoice") {
      const i = invoices.find((i) => i.id === recordId);
      return { colLabel, code: i?.invoiceNumber || `#${recordId}` };
    }
    if (colName === "Payment") {
      const p = payments.find((p) => p.id === recordId);
      return {
        colLabel,
        code: p?.amount
          ? Number(p.amount).toLocaleString("vi-VN") + " ₫"
          : `#${recordId}`,
      };
    }
    return { colLabel, code: `#${recordId}` };
  };

  notes.forEach((n) => {
    const key = `Note_${n.id}`;
    recordLabelMap[key] = n.title || (n.body || "").slice(0, 40) || `#${n.id}`;
    parentLabelMap[key] = buildParentInfo(n.collectionName, n.recordId);
  });
  documents.forEach((d) => {
    const key = `Document_${d.id}`;
    recordLabelMap[key] = d.documentCode || d.title || `#${d.id}`;
    parentLabelMap[key] = buildParentInfo(d.collectionName, d.recordId);
  });

  // Step 6: Merge, dedup, sort
  const seenLogs = new Set();
  const all = [
    ...customerLogs,
    ...quotationLogs,
    ...contractLogs,
    ...projectLogs,
    ...invoiceLogs,
    ...paymentLogs,
    ...noteLogs,
    ...documentLogs,
  ]
    .filter((l) => {
      const key = `${l._source}_${l.id}`;
      if (seenLogs.has(key)) return false;
      seenLogs.add(key);
      return true;
    })
    .filter((l) => !SKIP_FIELDS.has(l.fieldName))
    .map((l) => {
      const key = `${l._source}_${l.recordId}`;
      return {
        ...l,
        _recordLabel: recordLabelMap[key] || null,
        _parentInfo: parentLabelMap[key] || null,
      };
    })
    .sort((a, b) => new Date(getTs(b)) - new Date(getTs(a)));

  return { logs: all, fkMap, customerLabel };
}

// ─────────────────────────────────────────────────────────────────
// TABLE LAYOUT — 6-col CSS Grid (same as contract v2)
// ─────────────────────────────────────────────────────────────────

const COL_W = {
  collection: 130,
  record: 160,
  relation: 180,
  field: 150,
  value: "auto",
  who: 160,
};
const GRID_TPL = `${COL_W.collection}px ${COL_W.record}px ${COL_W.relation}px ${COL_W.field}px 1fr ${COL_W.who}px`;

const TableHeader = () =>
  React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: GRID_TPL,
        gap: 0,
        background: "#fafafa",
        borderRadius: "8px 8px 0 0",
        border: "1px solid #f0f0f0",
        borderBottom: "2px solid #e8e8e8",
        position: "sticky",
        top: 0,
        zIndex: 10,
      },
    },
    [
      "Collection",
      "Record / Tiêu đề",
      "Liên kết",
      "Field",
      "Giá trị cũ → Giá trị mới",
      "Người · Thời gian",
    ].map((h, i) =>
      React.createElement(
        "div",
        {
          key: h,
          style: {
            padding: "9px 12px",
            fontSize: 11.5,
            fontFamily: FONT,
            fontWeight: 700,
            color: "#8c8c8c",
            letterSpacing: "0.4px",
            textTransform: "uppercase",
            borderRight: i < 5 ? "1px solid #f0f0f0" : "none",
          },
        },
        h,
      ),
    ),
  );

// ─────────────────────────────────────────────────────────────────
// LOG ROW
// ─────────────────────────────────────────────────────────────────

const LogRow = ({ log, fkMap, isEven }) => {
  const [expanded, setExpanded] = useState(false);

  const src = SOURCE_CFG[log._source] || {
    label: log._source,
    icon: "📄",
    color: "#595959",
    bg: "#fafafa",
    border: "#d9d9d9",
  };
  const act = ACTION_CFG[log.action] || {
    label: log.action,
    icon: "•",
    color: "#595959",
    bg: "#fafafa",
    border: "#d9d9d9",
  };

  const resolve = (v, field) => {
    const c = cleanVal(v, field);
    if (!c) return null;
    const lookup = fkMap[field];
    if (lookup && lookup[c]) return lookup[c];
    if (
      /^\d+(\.\d+)?$/.test(c) &&
      (Number(c) > 100000 || CURRENCY_FIELDS.has(field))
    )
      return Number(c).toLocaleString("vi-VN") + " ₫";
    return c;
  };

  const oldVal = resolve(log.oldValue, log.fieldName);
  const newVal = resolve(log.newValue, log.fieldName);
  const who = log.changedByName || "Hệ thống";
  const field = fmtField(log.fieldName || "");
  const isCmt = log.action === "commented";
  const isUp = log.action === "uploaded";
  const MAX = 60;
  const truncate = (s) => (s && s.length > MAX ? s.slice(0, MAX) + "…" : s);
  const needsExpand =
    (oldVal && oldVal.length > MAX) || (newVal && newVal.length > MAX);
  const rowBg = isEven ? "#ffffff" : "#fafafa";

  return React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: GRID_TPL,
        gap: 0,
        background: rowBg,
        borderBottom: "1px solid #f0f0f0",
        cursor: needsExpand ? "pointer" : "default",
        transition: "background 0.12s",
      },
      onClick: needsExpand ? () => setExpanded((p) => !p) : undefined,
      onMouseEnter: (e) => {
        e.currentTarget.style.background = "#f0f7ff";
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.background = rowBg;
      },
    },

    // Col 1: Collection + Action
    React.createElement(
      "div",
      {
        style: {
          padding: "10px 12px",
          borderRight: "1px solid #f0f0f0",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          justifyContent: "center",
        },
      },
      React.createElement(
        "span",
        {
          style: {
            fontSize: 11,
            background: src.bg,
            color: src.color,
            border: `1px solid ${src.border}`,
            borderRadius: 4,
            padding: "2px 6px",
            fontWeight: 600,
            fontFamily: FONT,
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          },
        },
        src.icon,
        " ",
        src.label,
      ),
      React.createElement(
        "span",
        {
          style: {
            fontSize: 10.5,
            color: act.color,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            paddingLeft: 2,
          },
        },
        act.icon,
        " ",
        act.label,
      ),
    ),

    // Col 2: Record label
    React.createElement(
      "div",
      {
        style: {
          padding: "10px 12px",
          borderRight: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
        },
      },
      log._recordLabel
        ? React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                fontWeight: 600,
                color: "#262626",
                wordBreak: "break-word",
                lineHeight: 1.4,
              },
            },
            log._recordLabel,
          )
        : React.createElement(
            "span",
            { style: { color: "#d9d9d9", fontSize: 12 } },
            "—",
          ),
    ),

    // Col 3: Parent relation (Notes & Documents)
    React.createElement(
      "div",
      {
        style: {
          padding: "10px 12px",
          borderRight: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
        },
      },
      log._parentInfo
        ? React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 2 } },
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 10.5,
                  fontFamily: FONT,
                  fontWeight: 700,
                  color: "#8c8c8c",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                },
              },
              log._parentInfo.colLabel,
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#595959",
                  wordBreak: "break-word",
                  lineHeight: 1.4,
                },
              },
              log._parentInfo.code,
            ),
          )
        : React.createElement(
            "span",
            { style: { color: "#d9d9d9", fontSize: 12 } },
            "—",
          ),
    ),

    // Col 4: Field name
    React.createElement(
      "div",
      {
        style: {
          padding: "10px 12px",
          borderRight: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
        },
      },
      field
        ? React.createElement(
            "span",
            {
              style: {
                fontSize: 12.5,
                fontFamily: FONT,
                fontWeight: 600,
                color: "#262626",
                wordBreak: "break-word",
                lineHeight: 1.4,
              },
            },
            field,
          )
        : React.createElement(
            "span",
            { style: { color: "#d9d9d9", fontSize: 12 } },
            "—",
          ),
    ),

    // Col 5: Old → New value
    React.createElement(
      "div",
      {
        style: {
          padding: "10px 12px",
          borderRight: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
        },
      },
      isCmt
        ? React.createElement(
            "div",
            {
              style: {
                padding: "5px 10px",
                background: "#e6f4ff",
                borderRadius: 5,
                borderLeft: "3px solid #1890ff",
                fontSize: 12,
                fontFamily: FONT,
                color: "#262626",
                lineHeight: 1.5,
                width: "100%",
              },
            },
            log.newValue,
          )
        : isUp
          ? React.createElement(
              "div",
              { style: { fontSize: 12, fontFamily: FONT, color: "#531dab" } },
              `📎 ${log.newValue || ""}`,
            )
          : React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                },
              },
              oldVal &&
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 12,
                      fontFamily: FONT,
                      color: "#cf1322",
                      background: "#fff1f0",
                      border: "1px solid #ffa39e",
                      padding: "2px 8px",
                      borderRadius: 4,
                      textDecoration: "line-through",
                      maxWidth: 200,
                      wordBreak: "break-word",
                    },
                  },
                  expanded ? oldVal : truncate(oldVal),
                ),
              oldVal &&
                newVal &&
                React.createElement(
                  "span",
                  { style: { color: "#bfbfbf", fontSize: 14, flexShrink: 0 } },
                  "→",
                ),
              newVal &&
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 12,
                      fontFamily: FONT,
                      color: "#389e0d",
                      background: "#f6ffed",
                      border: "1px solid #b7eb8f",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontWeight: 600,
                      maxWidth: 200,
                      wordBreak: "break-word",
                    },
                  },
                  expanded ? newVal : truncate(newVal),
                ),
              needsExpand &&
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 10.5,
                      color: "#1890ff",
                      cursor: "pointer",
                      flexShrink: 0,
                    },
                  },
                  expanded ? "▲ thu gọn" : "▼ xem thêm",
                ),
              !oldVal &&
                !newVal &&
                React.createElement(
                  "span",
                  { style: { color: "#d9d9d9", fontSize: 12 } },
                  "—",
                ),
            ),
    ),

    // Col 6: Who + Time
    React.createElement(
      "div",
      {
        style: {
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          justifyContent: "center",
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 6 } },
        React.createElement(
          "div",
          {
            style: {
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#e6f4ff",
              border: "1px solid #91caff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "#0958d9",
              flexShrink: 0,
            },
          },
          who.slice(0, 2).toUpperCase(),
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12.5,
              fontFamily: FONT,
              fontWeight: 600,
              color: "#262626",
            },
          },
          who,
        ),
      ),
      React.createElement(
        "span",
        {
          style: {
            fontSize: 11.5,
            fontFamily: FONT,
            color: "#8c8c8c",
            paddingLeft: 30,
          },
        },
        timeAgo(getTs(log)),
      ),
      React.createElement(
        "span",
        {
          style: {
            fontSize: 11,
            fontFamily: FONT,
            color: "#bfbfbf",
            paddingLeft: 30,
          },
        },
        fmtDate(getTs(log)),
      ),
    ),
  );
};

// ─────────────────────────────────────────────────────────────────
// GROUPING VIEWS
// ─────────────────────────────────────────────────────────────────

const DayGroup = ({ dayKey, logs, fkMap }) =>
  React.createElement(
    "div",
    { style: { marginBottom: 20 } },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "0 0 8px",
          position: "sticky",
          top: 0,
          zIndex: 11,
          background: "white",
          paddingBottom: 4,
        },
      },
      React.createElement("div", {
        style: { flex: 1, height: 1, background: "#f0f0f0" },
      }),
      React.createElement(
        "span",
        {
          style: {
            fontSize: 12,
            fontFamily: FONT,
            fontWeight: 700,
            color: "#8c8c8c",
            background: "#fafafa",
            border: "1px solid #f0f0f0",
            padding: "3px 14px",
            borderRadius: 20,
            whiteSpace: "nowrap",
          },
        },
        `${formatDay(dayKey + "T00:00:00")}  ·  ${logs.length} hoạt động`,
      ),
      React.createElement("div", {
        style: { flex: 1, height: 1, background: "#f0f0f0" },
      }),
    ),
    React.createElement(
      "div",
      {
        style: {
          borderRadius: 8,
          border: "1px solid #f0f0f0",
          overflow: "hidden",
        },
      },
      React.createElement(TableHeader),
      ...logs.map((l, i) =>
        React.createElement(LogRow, {
          key: `${l._source}_${l.id}_${i}`,
          log: l,
          fkMap,
          isEven: i % 2 === 0,
        }),
      ),
    ),
  );

const CollectionGroup = ({ src, logs, fkMap }) => {
  const cfg = SOURCE_CFG[src] || {
    label: src,
    icon: "📄",
    color: "#595959",
    bg: "#fafafa",
    border: "#d9d9d9",
  };
  return React.createElement(
    "div",
    { style: { marginBottom: 20 } },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          padding: "6px 12px",
          borderRadius: 8,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
        },
      },
      React.createElement("span", { style: { fontSize: 14 } }, cfg.icon),
      React.createElement(
        "span",
        {
          style: {
            fontSize: 13,
            fontFamily: FONT,
            fontWeight: 700,
            color: cfg.color,
          },
        },
        cfg.label,
      ),
      React.createElement(
        "span",
        {
          style: {
            fontSize: 12,
            fontFamily: FONT,
            color: "#8c8c8c",
            marginLeft: "auto",
            background: "white",
            padding: "1px 8px",
            borderRadius: 10,
            border: `1px solid ${cfg.border}`,
          },
        },
        `${logs.length} hoạt động`,
      ),
    ),
    React.createElement(
      "div",
      {
        style: {
          borderRadius: 8,
          border: "1px solid #f0f0f0",
          overflow: "hidden",
        },
      },
      React.createElement(TableHeader),
      ...logs.map((l, i) =>
        React.createElement(LogRow, {
          key: `${l._source}_${l.id}_${i}`,
          log: l,
          fkMap,
          isEven: i % 2 === 0,
        }),
      ),
    ),
  );
};

const FlatTable = ({ logs, fkMap }) =>
  React.createElement(
    "div",
    {
      style: {
        borderRadius: 8,
        border: "1px solid #f0f0f0",
        overflow: "hidden",
      },
    },
    React.createElement(TableHeader),
    ...logs.map((l, i) =>
      React.createElement(LogRow, {
        key: `${l._source}_${l.id}_${i}`,
        log: l,
        fkMap,
        isEven: i % 2 === 0,
      }),
    ),
  );

const GroupedLogs = ({ logs, groupBy, fkMap }) => {
  if (groupBy === "day") {
    const groups = {},
      order = [];
    logs.forEach((l) => {
      const key = getDayKey(getTs(l));
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(l);
    });
    return React.createElement(
      "div",
      null,
      ...order.map((dayKey) =>
        React.createElement(DayGroup, {
          key: dayKey,
          dayKey,
          logs: groups[dayKey],
          fkMap,
        }),
      ),
    );
  }
  if (groupBy === "collection") {
    const groups = {},
      order = [];
    logs.forEach((l) => {
      if (!groups[l._source]) {
        groups[l._source] = [];
        order.push(l._source);
      }
      groups[l._source].push(l);
    });
    order.sort((a, b) => groups[b].length - groups[a].length);
    return React.createElement(
      "div",
      null,
      ...order.map((src) =>
        React.createElement(CollectionGroup, {
          key: src,
          src,
          logs: groups[src],
          fkMap,
        }),
      ),
    );
  }
  return React.createElement(FlatTable, { logs, fkMap });
};

// ─────────────────────────────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────────────────────────────

const StatsBar = ({ logs }) => {
  const counts = useMemo(() => {
    const c = {};
    logs.forEach((l) => {
      c[l._source] = (c[l._source] || 0) + 1;
    });
    return c;
  }, [logs]);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return React.createElement(
    "div",
    { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 } },
    entries.map(([src, cnt]) => {
      const cfg = SOURCE_CFG[src] || {
        label: src,
        icon: "📄",
        color: "#595959",
        bg: "#fafafa",
        border: "#d9d9d9",
      };
      return React.createElement(
        "div",
        {
          key: src,
          style: {
            fontSize: 12,
            fontFamily: FONT,
            padding: "3px 10px",
            borderRadius: 10,
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}`,
            fontWeight: 600,
            whiteSpace: "nowrap",
          },
        },
        `${cfg.icon} ${cfg.label}: ${cnt}`,
      );
    }),
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [fkMap, setFKMap] = useState({});
  const [customerLabel, setCustomerLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [srcFilter, setSrcFilter] = useState("all");
  const [actFilter, setActFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);
  const [groupBy, setGroupBy] = useState("day");

  const fetching = useRef(false);
  const hasLoaded = useRef(false);

  const load = async (force = false) => {
    if (!RECORD_ID || fetching.current) return;
    if (hasLoaded.current && !force) return;
    fetching.current = true;
    setLoading(true);
    try {
      const {
        logs: all,
        fkMap: fm,
        customerLabel: label,
      } = await fetchAllLogs(RECORD_ID);
      setLogs(all);
      setFKMap(fm);
      setCustomerLabel(label);
      hasLoaded.current = true;
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    fetching.current = false;
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        if (srcFilter !== "all" && l._source !== srcFilter) return false;
        if (actFilter !== "all" && l.action !== actFilter) return false;
        if (dateRange?.[0] && dateRange?.[1]) {
          const d = new Date(getTs(l));
          const s = dateRange[0].startOf("day").toDate();
          const e = dateRange[1].endOf("day").toDate();
          if (d < s || d > e) return false;
        }
        if (keyword.trim()) {
          const kw = keyword.toLowerCase();
          return [
            l.fieldName,
            l.oldValue,
            l.newValue,
            l.changedByName,
            l._recordLabel,
            l._parentInfo?.code,
            l._source,
          ].some((v) => (v || "").toLowerCase().includes(kw));
        }
        return true;
      }),
    [logs, srcFilter, actFilter, dateRange, keyword],
  );

  if (!RECORD_ID)
    return React.createElement(
      "div",
      { style: { padding: 16, fontFamily: FONT, color: "#8c8c8c" } },
      "Không tìm thấy record ID",
    );

  const srcOptions = [
    { value: "all", label: "Tất cả nguồn" },
    ...Object.entries(SOURCE_CFG).map(([k, v]) => ({
      value: k,
      label: `${v.icon} ${v.label}`,
    })),
  ];

  return React.createElement(
    "div",
    { style: { padding: "16px 20px", fontFamily: FONT } },

    // Header
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        React.createElement(
          "span",
          {
            style: {
              fontSize: 14,
              fontWeight: 700,
              color: "#1a1a1a",
              fontFamily: FONT,
            },
          },
          "Activity Log",
        ),
        customerLabel &&
          React.createElement(
            "span",
            { style: { fontSize: 12, color: "#8c8c8c", fontFamily: FONT } },
            `· ${customerLabel}`,
          ),
        !loading &&
          React.createElement(
            "span",
            { style: { fontSize: 11, color: "#8c8c8c", fontFamily: FONT } },
            `· ${filtered.length}${filtered.length !== logs.length ? `/${logs.length}` : ""} hoạt động`,
          ),
      ),
      React.createElement(
        "button",
        {
          onClick: () => load(true),
          disabled: loading,
          style: {
            border: "1px solid #e8e8e8",
            background: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 12,
            padding: "4px 12px",
            borderRadius: 6,
            color: "#595959",
            fontFamily: FONT,
          },
          onMouseEnter: (e) => {
            if (!loading) e.currentTarget.style.background = "#f5f5f5";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = "#fff";
          },
        },
        loading ? "⟳ Đang tải..." : "🔄 Làm mới",
      ),
    ),

    // Stats
    !loading && React.createElement(StatsBar, { logs }),

    // Filters
    React.createElement(
      "div",
      {
        style: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
      },
      React.createElement(Input, {
        placeholder: "🔎 Tìm theo field, giá trị, người dùng...",
        value: keyword,
        onChange: (e) => setKeyword(e.target.value),
        allowClear: true,
        size: "small",
        style: { flex: "1 1 180px", fontFamily: FONT },
      }),
      React.createElement(Select, {
        value: srcFilter,
        onChange: setSrcFilter,
        size: "small",
        style: { width: 148 },
        options: srcOptions,
      }),
      React.createElement(Select, {
        value: actFilter,
        onChange: setActFilter,
        size: "small",
        style: { width: 130 },
        options: [
          { value: "all", label: "Tất cả hành động" },
          { value: "created", label: "✨ Tạo mới" },
          { value: "updated", label: "✏️ Cập nhật" },
          { value: "deleted", label: "🗑 Xoá" },
          { value: "commented", label: "💬 Bình luận" },
          { value: "uploaded", label: "📎 Tải lên" },
        ],
      }),
      React.createElement(Select, {
        value: groupBy,
        onChange: setGroupBy,
        size: "small",
        style: { width: 148 },
        options: [
          { value: "day", label: "📅 Theo ngày" },
          { value: "collection", label: "📂 Theo collection" },
          { value: "none", label: "⏱ Không nhóm" },
        ],
      }),
      React.createElement(RangePicker, {
        size: "small",
        onChange: setDateRange,
        format: "DD/MM/YYYY",
        placeholder: ["Từ ngày", "Đến ngày"],
        style: { flex: "1 1 200px" },
        allowClear: true,
      }),
    ),

    // Content
    loading
      ? React.createElement(
          "div",
          { style: { textAlign: "center", padding: 48 } },
          React.createElement(Spin),
        )
      : filtered.length === 0
        ? React.createElement(Empty, {
            description: "Không có hoạt động nào",
            image: Empty.PRESENTED_IMAGE_SIMPLE,
            style: { padding: "32px 0" },
          })
        : React.createElement(GroupedLogs, { logs: filtered, groupBy, fkMap }),
  );
};

ctx.render(React.createElement(ActivityLog, null));
