const { React } = ctx;
const { useEffect, useMemo, useState } = React;
const {
  Alert: AntAlert,
  Button: AntButton,
  Checkbox: AntCheckbox,
  Input: AntInput,
  Modal: AntModal,
  Select: AntSelect,
  Spin,
  Table: AntTable,
  Tag: AntTag,
  message,
} = ctx.antd;

const FONT = "inherit";
const C = {
  primary: "#1677ff",
  border: "#d9d9d9",
  text: "rgba(0, 0, 0, 0.88)",
  sub: "rgba(0, 0, 0, 0.45)",
  muted: "rgba(0, 0, 0, 0.25)",
  bg: "#ffffff",
  bgSoft: "#fafafa",
  successBg: "#f6ffed",
  successText: "#389e0d",
  warningBg: "#fffbe6",
  warningText: "#d48806",
  dangerBg: "#fff2f0",
  dangerText: "#cf1322",
  neutralBg: "#f5f5f5",
  neutralText: "rgba(0, 0, 0, 0.65)",
};

const contextRecord =
  ctx.record ||
  ctx.popup?.record ||
  ctx.state?.record ||
  ctx.data?.record ||
  ctx.recordData ||
  null;

const PAYMENT_RESOURCES = ["payments", "Payment", "payment"];
const PAYMENT_REQUEST_RESOURCES = ["paymentRequests", "PaymentRequests", "payment_requests"];
const PAYMENT_REQUEST_ITEM_RESOURCES = ["paymentRequestItems", "PaymentRequestItems", "payment_request_items"];
const USER_RESOURCES = ["users"];
const MONEY_TOLERANCE = 0;
const ACTUAL_PAYMENT_STATUSES = ["received", "paid", "completed", "partial"];
const NON_ACTIVE_STATUSES = ["cancelled", "canceled", "void"];
const REQUEST_TYPE_LABELS = {
  create_payment: "Create payment",
  create_invoice: "Create invoice",
  create_invoice_and_payment: "Create invoice and payment",
  check_payment: "Check payment",
};

const extractId = (value) => {
  if (Array.isArray(value)) return extractId(value[0]);
  const raw = value && typeof value === "object" ? value.id || value._id : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const unwrapApiRecord = (res) => res?.data?.data || res?.data || null;

const unwrapApiList = (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const parseNum = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const compact = (items) =>
  items
    .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
    .filter(Boolean);

const firstPresent = (record, fields = []) => {
  for (const field of fields) {
    const value = record?.[field];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const relationRecord = (value) => {
  if (Array.isArray(value)) return value.find((item) => item && typeof item === "object") || null;
  return value && typeof value === "object" ? value : null;
};

const getCurrentUser = () =>
  ctx.currentUser ||
  ctx.state?.currentUser ||
  ctx.app?.currentUser ||
  ctx.store?.getState?.()?.currentUser ||
  null;

const userLabel = (record) =>
  compact([
    firstPresent(record, ["nickname", "displayName", "name", "username", "email"]),
    firstPresent(record, ["email"]) &&
    firstPresent(record, ["email"]) !== firstPresent(record, ["nickname", "displayName", "name", "username", "email"])
      ? `(${firstPresent(record, ["email"])})`
      : "",
  ]).join(" ") || (record?.id ? `User #${record.id}` : "-");

const customerLabel = (record) =>
  compact([
    firstPresent(record, ["shortName", "customerName", "companyName", "name", "fullName", "displayName"]),
    firstPresent(record, ["customerCode", "code"]) ? `(${firstPresent(record, ["customerCode", "code"])})` : "",
  ]).join(" ") || (record?.id ? `Customer #${record.id}` : "");

const contractLabel = (record) =>
  compact([
    firstPresent(record, ["contractCode", "contractNumber", "code"]),
    firstPresent(record, ["contractName", "name", "title"]),
  ]).join(" - ") || (record?.id ? `Contract #${record.id}` : "");

const buildDefaultPaymentRequestTitle = (record, requestType) =>
  compact([
    REQUEST_TYPE_LABELS[requestType] || "Payment request",
    contractLabel(record),
    "Payment schedule",
  ]).join(" - ");

const removeKeys = (record, keys = []) => {
  const next = { ...(record || {}) };
  keys.forEach((key) => delete next[key]);
  return next;
};

const cleanPayload = (record) => {
  const next = { ...(record || {}) };
  Object.keys(next).forEach((key) => {
    if (next[key] === undefined || next[key] === "") delete next[key];
  });
  return next;
};

const getRuntimeInput = () => {
  try {
    const inputArgs = ctx.view?.inputArgs || ctx.inputArgs || {};
    return {
      ...(inputArgs || {}),
      ...(inputArgs.params || {}),
      ...(ctx.action?.params || {}),
      ...(ctx.modal?.params || {}),
      ...(ctx.view?.params || {}),
      ...(ctx.popup?.params || {}),
      ...(ctx.params || {}),
    };
  } catch {
    return {};
  }
};

const refreshNocoBaseDataBlocks = async () => {
  const input = getRuntimeInput();
  const uidCandidates = compact([
    input.targetBlockUid,
    input.sourceBlockUid,
    input.blockUid,
    input.dataBlockUid,
  ]);
  const engine = ctx.engine || ctx.app;
  let blockModel = null;

  for (const uid of uidCandidates) {
    try {
      blockModel =
        ctx.getModel?.(uid, true) ||
        ctx.getModel?.(uid) ||
        engine?.getModel?.(uid) ||
        (ctx.app && ctx.app !== engine ? ctx.app?.getModel?.(uid) : null);
      if (blockModel) break;
    } catch (error) {
      console.warn("[ContractPaymentScheduleDetailBlock] get model failed", error);
    }
  }

  blockModel = blockModel || ctx.blockModel || ctx.model;
  const resource = blockModel?.resource || ctx.resource;
  try {
    if (resource && typeof resource.refresh === "function") {
      await resource.refresh();
      return true;
    }
    if (blockModel && typeof blockModel.refresh === "function") {
      await blockModel.refresh();
      return true;
    }
    if (typeof ctx.refresh === "function") {
      await ctx.refresh();
      return true;
    }
  } catch (error) {
    console.warn("[ContractPaymentScheduleDetailBlock] refresh failed", error);
  }
  return false;
};

const formatMoney = (value) => {
  const n = parseNum(value);
  if (!n && (value === undefined || value === null || value === "")) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")} VNĐ`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const normalized =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00`
      : value;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const safeJsonParse = (value) => {
  if (!value || typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("[ContractPaymentScheduleDetailBlock] Invalid paymentSchedule JSON", error);
    return null;
  }
};

const toDateInput = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const normalizeDateInput = (value) => {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : toDateInput(date);
};

const addDays = (dateValue, days) => {
  if (!dateValue && days !== 0) return "";
  const source = new Date(`${normalizeDateInput(dateValue)}T00:00:00`);
  if (Number.isNaN(source.getTime())) return "";
  source.setDate(source.getDate() + days);
  return toDateInput(source);
};

const addMonthsClamped = (dateValue, monthCount) => {
  if (!dateValue || !monthCount) return "";
  const source = new Date(`${normalizeDateInput(dateValue)}T00:00:00`);
  if (Number.isNaN(source.getTime())) return "";
  const y = source.getFullYear();
  const m = source.getMonth();
  const d = source.getDate();
  const targetFirst = new Date(y, m + monthCount, 1);
  const lastDay = new Date(targetFirst.getFullYear(), targetFirst.getMonth() + 1, 0).getDate();
  targetFirst.setDate(Math.min(d, lastDay));
  return toDateInput(targetFirst);
};

const normalizeRetainerUnit = (unit) => {
  const key = String(unit || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (key === "daily") return "day";
  if (key === "weekly") return "week";
  if (key === "monthly") return "month";
  if (key === "quarterly") return "quarter";
  if (key === "yearly" || key === "annual") return "year";
  return key || "month";
};

const calcRetainerNextPaymentDate = (paymentDate, retainerDuration, repeatUnit) => {
  const duration = parseNum(retainerDuration);
  const unit = normalizeRetainerUnit(repeatUnit);
  if (!paymentDate || duration <= 0) return "";
  if (unit === "day") return addDays(paymentDate, duration);
  if (unit === "week") return addDays(paymentDate, duration * 7);
  if (unit === "month") return addMonthsClamped(paymentDate, duration);
  if (unit === "quarter") return addMonthsClamped(paymentDate, duration * 3);
  if (unit === "year") return addMonthsClamped(paymentDate, duration * 12);
  return "";
};

const resolveRetainerNextPaymentDate = (record, schedule, rule) => {
  const storedDate = normalizeDateInput(rule?.nextPaymentDate);
  if (storedDate) return storedDate;
  return calcRetainerNextPaymentDate(
    schedule?.firstPaymentDate || record?.paymentDate,
    rule?.interval || record?.retainerDuration,
    rule?.unit || record?.retainerRepeatUnit || record?.retainerPeriod,
  );
};

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

const isInactiveStatus = (status) => NON_ACTIVE_STATUSES.includes(normalizeStatus(status));
const isActualPaidStatus = (status) => ACTUAL_PAYMENT_STATUSES.includes(normalizeStatus(status));

const modeLabel = (mode) => {
  const labels = {
    multiple_payments: "Thanh toán nhiều đợt",
    one_time: "Thanh toán một lần",
    monthly: "Hàng tháng",
    quarterly: "Hàng quý",
    milestone: "Theo milestone",
    manual: "Nhập thủ công",
    recurring: "Lặp định kỳ",
  };
  return labels[String(mode || "").trim()] || mode || "";
};

const statusMeta = (status) => {
  const key = String(status || "planned").toLowerCase().trim();
  const map = {
    planned: { label: "Dự kiến", bg: C.neutralBg, color: C.neutralText },
    partial: { label: "Thanh toán một phần", bg: C.warningBg, color: C.warningText },
    pending: { label: "Đang chờ", bg: C.warningBg, color: C.warningText },
    due: { label: "Đến hạn", bg: C.warningBg, color: C.warningText },
    overdue: { label: "Quá hạn", bg: C.dangerBg, color: C.dangerText },
    received: { label: "Đã nhận", bg: C.successBg, color: C.successText },
    paid: { label: "Đã thanh toán", bg: C.successBg, color: C.successText },
    completed: { label: "Hoàn tất", bg: C.successBg, color: C.successText },
    cancelled: { label: "Đã hủy", bg: C.neutralBg, color: C.neutralText },
    canceled: { label: "Đã hủy", bg: C.neutralBg, color: C.neutralText },
  };
  return map[key] || { label: status || "Dự kiến", bg: C.neutralBg, color: C.neutralText };
};

const installmentAmountFromPercent = (percentage, baseAmount) => {
  const percent = parseNum(percentage);
  const base = parseNum(baseAmount);
  if (percent <= 0 || base <= 0) return 0;
  return Math.round(base * percent / 100);
};

const normalizeInstallment = (row, index, runningTotal, baseAmount) => {
  const percentage = row?.percentage ?? null;
  const amount =
    parseNum(row?.amount ?? row?.totalAmount ?? row?.paymentAmount) ||
    installmentAmountFromPercent(percentage, baseAmount);
  const cumulativeTotal = parseNum(row?.cumulativeTotal) || runningTotal + amount;
  return {
    id: row?.id || `payment-${index + 1}`,
    scheduleItemId: row?.scheduleItemId || row?.id || `payment-${index + 1}`,
    installmentNo: row?.installmentNo || row?.sortOrder || index + 1,
    label:
      row?.label ||
      row?.installmentLabel ||
      row?.installment ||
      row?.name ||
      `Đợt ${index + 1}`,
    content: row?.content || row?.description || row?.note || row?.timingNote || "",
    paymentDate: row?.paymentDate || row?.dueDate || row?.date || row?.timing || "",
    amount,
    cumulativeTotal,
    percentage,
    status: row?.status || "planned",
  };
};

const normalizeSchedule = (record) => {
  const raw = safeJsonParse(record?.paymentSchedule);
  if (!raw) return null;

  const schedule = Array.isArray(raw)
    ? {
        version: 0,
        mode: record?.billingCycle || "multiple_payments",
        currency: "VND",
        firstPaymentDate: raw[0]?.paymentDate || raw[0]?.dueDate || record?.paymentDate || null,
        totalAmount: record?.totalAmount || raw.reduce((sum, row) => sum + parseNum(row?.amount), 0),
        retainerRule: null,
        installments: raw,
      }
    : raw;

  const sourceRows = Array.isArray(schedule?.installments)
    ? schedule.installments
    : Array.isArray(schedule?.rows)
      ? schedule.rows
      : [];
  const baseAmount = parseNum(schedule?.baseAmount ?? schedule?.totalAmount ?? record?.totalAmount);

  let runningTotal = 0;
  const installments = sourceRows
    .map((row, index) => {
      const normalized = normalizeInstallment(row, index, runningTotal, baseAmount);
      runningTotal = normalized.cumulativeTotal;
      return normalized;
    })
    .filter((row) => row.content || row.paymentDate || row.amount > 0 || row.label);

  const totalAmount =
    baseAmount ||
    parseNum(schedule?.totalAmount) ||
    installments.reduce((sum, row) => sum + row.amount, 0) ||
    parseNum(record?.totalAmount);

  const retainerRule = schedule?.retainerRule
    ? {
        ...schedule.retainerRule,
        nextPaymentDate: resolveRetainerNextPaymentDate(record, schedule, schedule.retainerRule),
      }
    : null;

  return {
    version: schedule?.version || 1,
    mode: schedule?.mode || record?.billingCycle || "",
    currency: schedule?.currency || "VND",
    firstPaymentDate: schedule?.firstPaymentDate || record?.paymentDate || "",
    totalAmount,
    baseAmount,
    retainerRule,
    installments,
  };
};

const hasRenderableSchedule = (schedule) =>
  !!(
    schedule &&
    (schedule.installments.length ||
      schedule.retainerRule?.enabled ||
      schedule.mode === "recurring")
  );

const fetchContract = async (contractId) => {
  if (!contractId) return null;
  const res = await ctx.api.request({
    url: "contracts:get",
    params: { filterByTk: contractId },
  });
  return unwrapApiRecord(res);
};

const apiRequestAny = async (resources, action, options = {}) => {
  let lastError = null;
  for (const resource of resources) {
    try {
      return await ctx.api.request({
        url: `${resource}:${action}`,
        ...options,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`No resource available for action ${action}`);
};

const listAny = async (resources, params = {}) => {
  const res = await apiRequestAny(resources, "list", { params });
  return unwrapApiList(res);
};

const createAny = async (resources, data) => {
  const res = await apiRequestAny(resources, "create", {
    method: "POST",
    data,
  });
  return unwrapApiRecord(res);
};

const createWithPayloadFallback = async (resources, payloadVariants = []) => {
  let lastError = null;
  for (const payload of payloadVariants) {
    try {
      return await createAny(resources, cleanPayload(payload));
    } catch (error) {
      lastError = error;
      console.warn("[ContractPaymentScheduleDetailBlock] create fallback failed", error);
    }
  }
  throw lastError || new Error("Create request failed.");
};

const listPaymentsByContract = async (contractId) => {
  if (!contractId) return [];
  const params = {
    pageSize: 1000,
    filter: JSON.stringify({
      $or: [
        { contractId: { $eq: contractId } },
        { contracts: { id: { $eq: contractId } } },
      ],
    }),
  };
  try {
    const res = await apiRequestAny(PAYMENT_RESOURCES, "list", { params });
    return unwrapApiList(res);
  } catch (error) {
    const res = await apiRequestAny(PAYMENT_RESOURCES, "list", {
      params: {
        pageSize: 1000,
        filter: JSON.stringify({ contractId: { $eq: contractId } }),
      },
    });
    return unwrapApiList(res);
  }
};

const summarizePaymentsByInstallment = (payments = []) => {
  const map = new Map();
  payments.forEach((payment) => {
    if (isInactiveStatus(payment?.paymentStatus) || !isActualPaidStatus(payment?.paymentStatus)) return;
    const key = String(payment?.scheduleItemId || payment?.installmentId || payment?.paymentScheduleId || "");
    if (!key) return;
    const current = map.get(key) || { paidAmount: 0, records: [] };
    current.paidAmount += parseNum(payment?.amount);
    current.records.push(payment);
    map.set(key, current);
  });
  return map;
};

const applyPaymentSummary = (schedule, payments = []) => {
  if (!schedule) return schedule;
  const summary = summarizePaymentsByInstallment(payments);
  return {
    ...schedule,
    installments: schedule.installments.map((row) => {
      const itemSummary = summary.get(String(row.scheduleItemId)) || summary.get(String(row.id));
      const paidAmount = parseNum(itemSummary?.paidAmount);
      const remainingAmount = Math.max(parseNum(row.amount) - paidAmount, 0);
      const computedStatus =
        paidAmount <= MONEY_TOLERANCE
          ? row.status || "planned"
          : remainingAmount <= MONEY_TOLERANCE
            ? "received"
            : "partial";
      return {
        ...row,
        paidAmount,
        remainingAmount,
        paymentRecords: itemSummary?.records || [],
        status: computedStatus,
      };
    }),
  };
};

const resolveContractId = (record) =>
  extractId(record?.id) ||
  extractId(record?.contractId) ||
  extractId(record?.contracts) ||
  extractId(record?.contract);

const resolveCustomerId = (record) =>
  extractId(record?.customerId) ||
  extractId(record?.customers) ||
  extractId(record?.customer);

const resolveInternalCompanyId = (record) =>
  extractId(record?.internalCompanyId) ||
  extractId(record?.internalCompany) ||
  extractId(record?.companyId) ||
  extractId(record?.companies);

const buildRequestableItems = (record, schedule) => {
  if (!schedule) return [];
  const rows = (schedule.installments || [])
    .filter((row) => parseNum(row.remainingAmount ?? row.amount) > MONEY_TOLERANCE)
    .map((row) => ({
      key: String(row.scheduleItemId || row.id || `payment-${row.installmentNo || ""}`),
      lineType: "schedule_installment",
      scheduleItemId: row.scheduleItemId || row.id || "",
      installmentNo: row.installmentNo || null,
      lineLabel: row.label || `Installment ${row.installmentNo || ""}`.trim(),
      description: row.content || "",
      plannedPaymentDate: row.paymentDate || "",
      requestedAmount: parseNum(row.remainingAmount ?? row.amount),
      paidAmountSnapshot: parseNum(row.paidAmount),
      remainingAmountSnapshot: parseNum(row.remainingAmount ?? row.amount),
      sourceSnapshot: {
        scheduleItemId: row.scheduleItemId || row.id || "",
        installmentNo: row.installmentNo || null,
        label: row.label || "",
        content: row.content || "",
        plannedPaymentDate: row.paymentDate || "",
        amount: parseNum(row.amount),
        paidAmount: parseNum(row.paidAmount),
        remainingAmount: parseNum(row.remainingAmount ?? row.amount),
        percentage: row.percentage ?? null,
        status: row.status || "",
      },
    }));

  const nextPaymentDate = normalizeDateInput(schedule.retainerRule?.nextPaymentDate);
  if (!rows.length && (schedule.retainerRule?.enabled || schedule.mode === "recurring")) {
    const amount =
      parseNum(schedule.totalAmount) ||
      parseNum(schedule.baseAmount) ||
      parseNum(record?.totalAmount) ||
      parseNum(record?.fixedAmount);
    rows.push({
      key: "retainer_next",
      lineType: "retainer_next",
      scheduleItemId: "retainer_next",
      installmentNo: null,
      lineLabel: "Retainer next payment",
      description: schedule.retainerRule?.displayText || "Recurring retainer payment",
      plannedPaymentDate: nextPaymentDate || schedule.firstPaymentDate || record?.paymentDate || "",
      requestedAmount: amount,
      paidAmountSnapshot: 0,
      remainingAmountSnapshot: amount,
      sourceSnapshot: {
        retainerRule: schedule.retainerRule || null,
        firstPaymentDate: schedule.firstPaymentDate || record?.paymentDate || "",
        nextPaymentDate,
        totalAmount: amount,
      },
    });
  }

  return rows;
};

const buildRequestSnapshot = (record, schedule, items) => {
  const customer = relationRecord(record?.customers) || relationRecord(record?.customer);
  const company = relationRecord(record?.internalCompany) || relationRecord(record?.companies);
  return {
    contractId: resolveContractId(record),
    contractCode: firstPresent(record, ["contractCode", "contractNumber", "code"]),
    contractName: firstPresent(record, ["contractName", "name", "title"]),
    contractLabel: contractLabel(record),
    customerId: resolveCustomerId(record),
    customerName: customerLabel(customer) || firstPresent(record, ["customerName"]),
    internalCompanyId: resolveInternalCompanyId(record),
    internalCompanyName: firstPresent(company, ["shortName", "companyName", "name"]),
    mode: schedule?.mode || "",
    firstPaymentDate: schedule?.firstPaymentDate || "",
    totalAmount: parseNum(schedule?.totalAmount || record?.totalAmount),
    requestedItems: items.map((item) => item.sourceSnapshot),
  };
};

const paymentRequestPayloadVariants = (payload) => {
  const relationKeys = ["contracts", "customers", "internalCompany", "requestedBy", "assignedTo", "reviewedBy", "createdPayment", "createdInvoice"];
  const scalarKeys = ["contractId", "customerId", "internalCompanyId", "requestedById", "assignedToId", "reviewedById", "createdPaymentId", "createdInvoiceId"];
  return [
    payload,
    removeKeys(payload, relationKeys),
    removeKeys(payload, scalarKeys),
    removeKeys(payload, [...relationKeys, ...scalarKeys]),
  ];
};

const paymentRequestItemPayloadVariants = (payload) => {
  const relationKeys = ["paymentRequest", "contracts", "invoices", "payments"];
  const scalarKeys = ["paymentRequestId", "contractId", "invoiceId", "paymentId"];
  return [
    payload,
    removeKeys(payload, relationKeys),
    removeKeys(payload, scalarKeys),
    removeKeys(payload, [...relationKeys, ...scalarKeys]),
  ];
};

const SummaryPill = ({ label, value }) => {
  if (!value) return null;
  return React.createElement(
    "div",
    {
      style: {
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "8px 10px",
        background: "#fff",
        minWidth: 140,
      },
    },
    React.createElement("div", { style: { fontSize: 11, color: C.sub, marginBottom: 3 } }, label),
    React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: C.text } }, value),
  );
};

const StatusBadge = ({ status }) => {
  const meta = statusMeta(status);
  const tagColorByStatus = {
    partial: "warning",
    pending: "warning",
    due: "warning",
    overdue: "error",
    received: "success",
    paid: "success",
    completed: "success",
  };
  const tagColor = tagColorByStatus[String(status || "").toLowerCase().trim()] || "default";
  if (AntTag) {
    return React.createElement(
      AntTag,
      { color: tagColor, style: { marginInlineEnd: 0, whiteSpace: "nowrap" } },
      meta.label,
    );
  }
  return React.createElement(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        minHeight: 24,
        padding: "3px 9px",
        borderRadius: 999,
        background: meta.bg,
        color: meta.color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      },
    },
    meta.label,
  );
};

const PaymentScheduleTable = ({ schedule }) => {
  if (AntTable) {
    const columnsConfig = [
      {
        title: "Đợt",
        dataIndex: "label",
        width: 130,
        render: (value, row) =>
          React.createElement(
            "span",
            { style: { fontWeight: 600, color: C.text } },
            value || `Đợt ${row.installmentNo}`,
          ),
      },
      {
        title: "Nội dung",
        dataIndex: "content",
        ellipsis: true,
        render: (value) =>
          React.createElement(
            "span",
            { style: { color: value ? C.text : C.muted } },
            value || "—",
          ),
      },
      {
        title: "% Thanh toán",
        dataIndex: "percentage",
        width: 120,
        align: "right",
        render: (value) =>
          value !== null && value !== undefined && value !== "" ? `${parseNum(value)}%` : "—",
      },
      {
        title: "Ngày thanh toán",
        dataIndex: "paymentDate",
        width: 150,
        render: formatDate,
      },
      {
        title: "Kế hoạch",
        dataIndex: "amount",
        width: 160,
        align: "right",
        render: (value) =>
          React.createElement(
            "span",
            { style: { fontWeight: 600, fontVariantNumeric: "tabular-nums" } },
            formatMoney(value),
          ),
      },
      {
        title: "Đã nhận",
        dataIndex: "paidAmount",
        width: 160,
        align: "right",
        render: (value) =>
          React.createElement(
            "span",
            { style: { fontWeight: 600, fontVariantNumeric: "tabular-nums" } },
            formatMoney(value),
          ),
      },
      {
        title: "Còn lại",
        dataIndex: "remainingAmount",
        width: 160,
        align: "right",
        render: (value) =>
          React.createElement(
            "span",
            { style: { fontWeight: 600, fontVariantNumeric: "tabular-nums" } },
            formatMoney(value),
          ),
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 130,
        render: (value) => React.createElement(StatusBadge, { status: value }),
      },
    ];

    return React.createElement(AntTable, {
      rowKey: "id",
      size: "middle",
      pagination: false,
      columns: columnsConfig,
      dataSource: schedule.installments,
      scroll: { x: 1240 },
    });
  }

  const columns = "minmax(110px, 0.75fr) minmax(220px, 1.5fr) minmax(100px, 0.55fr) minmax(140px, 0.85fr) minmax(140px, 0.85fr) minmax(140px, 0.85fr) minmax(140px, 0.85fr) minmax(120px, 0.7fr)";
  const headerStyle = {
    padding: "11px 12px",
    background: "#fbfcfd",
    color: C.sub,
    fontSize: 12,
    fontWeight: 800,
    borderBottom: `1px solid ${C.border}`,
  };
  const cellStyle = {
    padding: "12px",
    minWidth: 0,
    borderBottom: `1px solid ${C.border}`,
    color: C.text,
    fontSize: 13,
    lineHeight: 1.45,
    display: "flex",
    alignItems: "center",
  };

  return React.createElement(
    "div",
    { style: { overflowX: "auto" } },
    React.createElement(
      "div",
      { style: { minWidth: 1240 } },
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: columns } },
        React.createElement("div", { style: headerStyle }, "Đợt"),
        React.createElement("div", { style: headerStyle }, "Nội dung"),
        React.createElement("div", { style: { ...headerStyle, textAlign: "right" } }, "% Thanh toán"),
        React.createElement("div", { style: headerStyle }, "Ngày thanh toán"),
        React.createElement("div", { style: { ...headerStyle, textAlign: "right" } }, "Kế hoạch"),
        React.createElement("div", { style: { ...headerStyle, textAlign: "right" } }, "Đã nhận"),
        React.createElement("div", { style: { ...headerStyle, textAlign: "right" } }, "Còn lại"),
        React.createElement("div", { style: headerStyle }, "Trạng thái"),
      ),
      schedule.installments.map((row) =>
        React.createElement(
          "div",
          {
            key: row.id,
            style: {
              display: "grid",
              gridTemplateColumns: columns,
              background: "#fff",
            },
          },
          React.createElement(
            "div",
            { style: { ...cellStyle, fontWeight: 800 } },
            row.label || `Đợt ${row.installmentNo}`,
          ),
          React.createElement(
            "div",
            { style: { ...cellStyle, color: row.content ? C.text : C.muted } },
            row.content || "—",
          ),
          React.createElement(
            "div",
            { style: { ...cellStyle, justifyContent: "flex-end", fontWeight: 800 } },
            row.percentage !== null && row.percentage !== undefined && row.percentage !== ""
              ? `${parseNum(row.percentage)}%`
              : "—",
          ),
          React.createElement("div", { style: cellStyle }, formatDate(row.paymentDate)),
          React.createElement(
            "div",
            { style: { ...cellStyle, justifyContent: "flex-end", fontWeight: 800 } },
            formatMoney(row.amount),
          ),
          React.createElement(
            "div",
            { style: { ...cellStyle, justifyContent: "flex-end", fontWeight: 800 } },
            formatMoney(row.paidAmount),
          ),
          React.createElement(
            "div",
            { style: { ...cellStyle, justifyContent: "flex-end", fontWeight: 800 } },
            formatMoney(row.remainingAmount),
          ),
          React.createElement("div", { style: cellStyle }, React.createElement(StatusBadge, { status: row.status })),
        ),
      ),
    ),
  );
};

const RetainerRule = ({ rule }) => {
  if (!rule?.enabled) return null;
  const text =
    rule.displayText ||
    compact([
      rule.anchorType ? `Mốc: ${rule.anchorType}` : "",
      rule.anchorValue ? `giá trị ${rule.anchorValue}` : "",
      rule.interval && rule.unit ? `lặp mỗi ${rule.interval} ${rule.unit}` : "",
    ]).join(" · ");
  const nextPaymentDate = normalizeDateInput(rule.nextPaymentDate);
  if (!text && !nextPaymentDate) return null;
  return React.createElement(
    "div",
    {
      style: {
        margin: "12px 16px 16px",
        padding: "10px 12px",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        background: C.bgSoft,
        color: C.sub,
        fontSize: 13,
      },
    },
    React.createElement("strong", { style: { color: C.text } }, "Quy tắc retainer: "),
    text,
    nextPaymentDate
      ? React.createElement(
          "div",
          { style: { marginTop: 6 } },
          React.createElement("strong", { style: { color: C.text } }, "Next payment: "),
          formatDate(nextPaymentDate),
        )
      : null,
  );
};

const PaymentScheduleDetailBlock = () => {
  const [record, setRecord] = useState(contextRecord);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestForm, setRequestForm] = useState({
    title: "",
    requestType: "create_payment",
    priority: "normal",
    assignedToId: "",
    dueDate: "",
    requestNote: "",
    selectedItemKeys: [],
  });

  const recordId =
    extractId(contextRecord?.contractId) ||
    extractId(contextRecord?.contracts) ||
    extractId(contextRecord?.id) ||
    extractId(ctx.recordId);

  useEffect(() => {
    let mounted = true;
    const localSchedule = normalizeSchedule(contextRecord || {});
    setRecord(contextRecord);
    setPayments([]);
    setError("");

    if (!recordId) {
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    Promise.all([
      hasRenderableSchedule(localSchedule) ? Promise.resolve(contextRecord) : fetchContract(recordId),
      listPaymentsByContract(recordId).catch((err) => {
        console.error("[ContractPaymentScheduleDetailBlock] fetch payments failed", err);
        if (mounted) setError("Không tải được dữ liệu thanh toán thực tế.");
        return [];
      }),
    ])
      .then(([fresh, paymentRows]) => {
        if (!mounted) return;
        setRecord(fresh || contextRecord);
        setPayments(paymentRows || []);
      })
      .catch((err) => {
        console.error("[ContractPaymentScheduleDetailBlock] fetch contract failed", err);
        if (mounted) {
          setRecord(contextRecord);
          setError("Không tải được lịch thanh toán của hợp đồng.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [recordId]);

  const schedule = useMemo(
    () => applyPaymentSummary(normalizeSchedule(record || {}), payments),
    [record, payments],
  );
  const requestableItems = useMemo(
    () => buildRequestableItems(record || {}, schedule),
    [record, schedule],
  );

  const loadUsers = async () => {
    if (users.length) return users;
    const rows = await listAny(USER_RESOURCES, { pageSize: 500 }).catch(() => []);
    const filtered = (rows || []).filter((user) => extractId(user) !== 1);
    setUsers(filtered);
    return filtered;
  };

  const setRequestField = (key, value) => {
    setRequestForm((prev) => ({ ...prev, [key]: value }));
  };

  const openPaymentRequestModal = async () => {
    const rows = requestableItems;
    if (!rows.length) {
      message?.warning?.("No payable schedule item is available for request.");
      return;
    }
    await loadUsers();
    setRequestForm((prev) => ({
      ...prev,
      title: buildDefaultPaymentRequestTitle(record || {}, prev.requestType),
      selectedItemKeys: rows.map((item) => item.key),
    }));
    setRequestOpen(true);
  };

  const toggleRequestItem = (key, checked) => {
    setRequestForm((prev) => {
      const current = new Set(prev.selectedItemKeys || []);
      if (checked) current.add(key);
      else current.delete(key);
      return { ...prev, selectedItemKeys: Array.from(current) };
    });
  };

  const submitPaymentRequest = async () => {
    const selectedItems = requestableItems.filter((item) => (requestForm.selectedItemKeys || []).includes(item.key));
    if (!selectedItems.length) {
      message?.warning?.("Please select at least one payment request line.");
      return;
    }
    if (!String(requestForm.title || "").trim()) {
      message?.warning?.("Please enter a payment request title.");
      return;
    }
    if (!requestForm.assignedToId) {
      message?.warning?.("Please select an assignee to process this request.");
      return;
    }

    const currentUser = getCurrentUser();
    const currentUserId = extractId(currentUser);
    const assignedToId = extractId(requestForm.assignedToId);
    const contractId = resolveContractId(record || {});
    const customerId = resolveCustomerId(record || {});
    const internalCompanyId = resolveInternalCompanyId(record || {});
    const requestedAmount = selectedItems.reduce((sum, item) => sum + parseNum(item.requestedAmount), 0);
    const sourceSnapshot = buildRequestSnapshot(record || {}, schedule, selectedItems);

    const requestPayload = {
      title: String(requestForm.title || "").trim(),
      requestType: requestForm.requestType,
      status: "submitted",
      priority: requestForm.priority,
      contractId,
      contracts: contractId || undefined,
      customerId,
      customers: customerId || undefined,
      internalCompanyId,
      internalCompany: internalCompanyId || undefined,
      requestedById: currentUserId,
      requestedBy: currentUserId || undefined,
      assignedToId,
      assignedTo: assignedToId || undefined,
      dueDate: requestForm.dueDate || null,
      requestedAmount,
      approvedAmount: null,
      currency: "VND",
      requestNote: requestForm.requestNote || null,
      sourceSnapshot,
    };

    setRequestSaving(true);
    try {
      const createdRequest = await createWithPayloadFallback(
        PAYMENT_REQUEST_RESOURCES,
        paymentRequestPayloadVariants(requestPayload),
      );
      const requestId = extractId(createdRequest);
      if (!requestId) throw new Error("Payment request was created but no id was returned.");

      for (const item of selectedItems) {
        const itemPayload = {
          paymentRequestId: requestId,
          paymentRequest: requestId,
          contractId,
          contracts: contractId || undefined,
          lineType: item.lineType,
          lineStatus: "pending",
          scheduleItemId: item.scheduleItemId || null,
          installmentNo: item.installmentNo,
          lineLabel: item.lineLabel,
          description: item.description || null,
          plannedPaymentDate: item.plannedPaymentDate || null,
          requestedAmount: parseNum(item.requestedAmount),
          approvedAmount: null,
          paidAmountSnapshot: parseNum(item.paidAmountSnapshot),
          remainingAmountSnapshot: parseNum(item.remainingAmountSnapshot),
          sourceSnapshot: {
            ...item.sourceSnapshot,
            paymentRequestId: requestId,
            contractSnapshot: sourceSnapshot,
          },
        };
        await createWithPayloadFallback(
          PAYMENT_REQUEST_ITEM_RESOURCES,
          paymentRequestItemPayloadVariants(itemPayload),
        );
      }

      message?.success?.("Payment request created.");
      await refreshNocoBaseDataBlocks();
      setRequestOpen(false);
    } catch (submitError) {
      console.error("[ContractPaymentScheduleDetailBlock] create payment request failed", submitError);
      message?.error?.(submitError?.message || "Could not create payment request.");
    } finally {
      setRequestSaving(false);
    }
  };

  if (loading) {
    return React.createElement(
      "div",
      { style: { padding: 16, textAlign: "center" } },
      React.createElement(Spin, null),
    );
  }

  if (!hasRenderableSchedule(schedule)) {
    return null;
  }

  const countText = schedule.installments.length
    ? `${schedule.installments.length} đợt`
    : "Lịch định kỳ";
  const totalPaid = schedule.installments.reduce((sum, row) => sum + parseNum(row.paidAmount), 0);
  const totalRemaining = schedule.installments.reduce((sum, row) => sum + parseNum(row.remainingAmount), 0);
  const selectedRequestItems = requestableItems.filter((item) => (requestForm.selectedItemKeys || []).includes(item.key));
  const requestTotal = selectedRequestItems.reduce((sum, item) => sum + parseNum(item.requestedAmount), 0);
  const userOptions = users.map((user) => ({
    value: extractId(user),
    label: userLabel(user),
  }));
  const requestModal = AntModal
    ? React.createElement(
        AntModal,
        {
          title: "Create payment request",
          open: requestOpen,
          visible: requestOpen,
          onCancel: () => setRequestOpen(false),
          onOk: submitPaymentRequest,
          okText: "Create request",
          cancelText: "Cancel",
          confirmLoading: requestSaving,
          width: 760,
          destroyOnClose: true,
        },
        React.createElement(
          "div",
          { style: { display: "grid", gap: 16 } },
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              },
            },
            React.createElement(
              "label",
              { style: { display: "grid", gap: 6, fontSize: 13, color: C.text, gridColumn: "1 / -1" } },
              "Title",
              AntInput
                ? React.createElement(AntInput, {
                    value: requestForm.title,
                    placeholder: "Enter payment request title",
                    onChange: (event) => setRequestField("title", event.target.value),
                  })
                : React.createElement("input", {
                    value: requestForm.title,
                    onChange: (event) => setRequestField("title", event.target.value),
                  }),
            ),
            React.createElement(
              "label",
              { style: { display: "grid", gap: 6, fontSize: 13, color: C.text } },
              "Request type",
              AntSelect
                ? React.createElement(AntSelect, {
                    value: requestForm.requestType,
                    onChange: (value) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        requestType: value,
                        title: prev.title || buildDefaultPaymentRequestTitle(record || {}, value),
                      })),
                    options: [
                      { value: "create_payment", label: REQUEST_TYPE_LABELS.create_payment },
                      { value: "create_invoice", label: REQUEST_TYPE_LABELS.create_invoice },
                      { value: "create_invoice_and_payment", label: REQUEST_TYPE_LABELS.create_invoice_and_payment },
                      { value: "check_payment", label: REQUEST_TYPE_LABELS.check_payment },
                    ],
                  })
                : React.createElement("input", {
                    value: requestForm.requestType,
                    onChange: (event) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        requestType: event.target.value,
                        title: prev.title || buildDefaultPaymentRequestTitle(record || {}, event.target.value),
                      })),
                  }),
            ),
            React.createElement(
              "label",
              { style: { display: "grid", gap: 6, fontSize: 13, color: C.text } },
              "Priority",
              AntSelect
                ? React.createElement(AntSelect, {
                    value: requestForm.priority,
                    onChange: (value) => setRequestField("priority", value),
                    options: [
                      { value: "low", label: "Low" },
                      { value: "normal", label: "Normal" },
                      { value: "high", label: "High" },
                      { value: "urgent", label: "Urgent" },
                    ],
                  })
                : React.createElement("input", {
                    value: requestForm.priority,
                    onChange: (event) => setRequestField("priority", event.target.value),
                  }),
            ),
            React.createElement(
              "label",
              { style: { display: "grid", gap: 6, fontSize: 13, color: C.text } },
              "Assignee",
              AntSelect
                ? React.createElement(AntSelect, {
                    showSearch: true,
                    allowClear: true,
                    value: requestForm.assignedToId || undefined,
                    placeholder: "Select user",
                    optionFilterProp: "label",
                    onChange: (value) => setRequestField("assignedToId", value || ""),
                    options: userOptions,
                  })
                : React.createElement("input", {
                    value: requestForm.assignedToId,
                    onChange: (event) => setRequestField("assignedToId", event.target.value),
                  }),
            ),
            React.createElement(
              "label",
              { style: { display: "grid", gap: 6, fontSize: 13, color: C.text } },
              "Due date",
              AntInput
                ? React.createElement(AntInput, {
                    type: "date",
                    value: requestForm.dueDate,
                    onChange: (event) => setRequestField("dueDate", event.target.value),
                  })
                : React.createElement("input", {
                    type: "date",
                    value: requestForm.dueDate,
                    onChange: (event) => setRequestField("dueDate", event.target.value),
                  }),
            ),
          ),
          React.createElement(
            "div",
            {
              style: {
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                overflow: "hidden",
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  background: C.bgSoft,
                  borderBottom: `1px solid ${C.border}`,
                  fontWeight: 700,
                },
              },
              React.createElement("span", null, "Request lines"),
              React.createElement("span", { style: { fontVariantNumeric: "tabular-nums" } }, formatMoney(requestTotal)),
            ),
            React.createElement(
              "div",
              { style: { display: "grid", maxHeight: 260, overflowY: "auto" } },
              requestableItems.map((item) =>
                React.createElement(
                  "label",
                  {
                    key: item.key,
                    style: {
                      display: "grid",
                      gridTemplateColumns: "auto minmax(0, 1fr) auto",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 12px",
                      borderBottom: `1px solid ${C.border}`,
                      cursor: "pointer",
                    },
                  },
                  AntCheckbox
                    ? React.createElement(AntCheckbox, {
                        checked: (requestForm.selectedItemKeys || []).includes(item.key),
                        onChange: (event) => toggleRequestItem(item.key, event.target.checked),
                      })
                    : React.createElement("input", {
                        type: "checkbox",
                        checked: (requestForm.selectedItemKeys || []).includes(item.key),
                        onChange: (event) => toggleRequestItem(item.key, event.target.checked),
                      }),
                  React.createElement(
                    "span",
                    { style: { minWidth: 0 } },
                    React.createElement("span", { style: { display: "block", fontWeight: 700 } }, item.lineLabel),
                    React.createElement(
                      "span",
                      { style: { display: "block", color: C.sub, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } },
                      compact([item.description, formatDate(item.plannedPaymentDate)]).join(" · "),
                    ),
                  ),
                  React.createElement(
                    "strong",
                    { style: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } },
                    formatMoney(item.requestedAmount),
                  ),
                ),
              ),
            ),
          ),
          React.createElement(
            "label",
            { style: { display: "grid", gap: 6, fontSize: 13, color: C.text } },
            "Note",
            AntInput?.TextArea
              ? React.createElement(AntInput.TextArea, {
                  rows: 3,
                  value: requestForm.requestNote,
                  onChange: (event) => setRequestField("requestNote", event.target.value),
                  placeholder: "Add payment request note...",
                })
              : React.createElement("textarea", {
                  rows: 3,
                  value: requestForm.requestNote,
                  onChange: (event) => setRequestField("requestNote", event.target.value),
                }),
          ),
        ),
      )
    : null;

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: FONT,
        color: C.text,
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 16px",
          background: C.bgSoft,
          borderBottom: `1px solid ${C.border}`,
          flexWrap: "wrap",
        },
      },
      React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          { style: { fontSize: 13, color: C.sub, marginTop: 4 } },
          // compact([countText, modeLabel(schedule.mode)]).join(" · "),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" } },
        AntButton
          ? React.createElement(
              AntButton,
              {
                type: "primary",
                onClick: openPaymentRequestModal,
                disabled: !requestableItems.length || requestSaving,
              },
              "Create payment request",
            )
          : React.createElement(
              "button",
              {
                type: "button",
                onClick: openPaymentRequestModal,
                disabled: !requestableItems.length || requestSaving,
              },
              "Create payment request",
            ),
        React.createElement(SummaryPill, { label: "Ngày thanh toán đầu tiên", value: formatDate(schedule.firstPaymentDate) }),
        React.createElement(SummaryPill, { label: "Đã nhận", value: formatMoney(totalPaid) }),
        React.createElement(SummaryPill, { label: "Còn lại", value: formatMoney(totalRemaining) }),
      ),
    ),
    error
      ? AntAlert
        ? React.createElement(AntAlert, {
            type: "warning",
            message: error,
            showIcon: true,
            style: { margin: 16 },
          })
        : React.createElement(
            "div",
            {
              style: {
                padding: "10px 14px",
                borderBottom: `1px solid ${C.border}`,
                background: C.warningBg,
                color: C.warningText,
                fontSize: 13,
              },
            },
            error,
          )
      : null,
    schedule.installments.length
      ? React.createElement(PaymentScheduleTable, { schedule })
      : null,
    React.createElement(RetainerRule, { rule: schedule.retainerRule }),
    requestModal,
  );
};

ctx.render(React.createElement(PaymentScheduleDetailBlock));
