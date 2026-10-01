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
  "Every {0} · {1} {2} total": "Mỗi {0} · tổng {1} {2}",
  "Every {0} · open-ended": "Mỗi {0} · không thời hạn",
  "Customer #{0}": "Khách hàng #{0}",
  "Contract #{0}": "Hợp đồng #{0}",
  "User #{0}": "Người dùng #{0}",
  "Installment {0}": "Đợt thanh toán {0}",
  "Unpaid": "Chưa thanh toán",
  "Partial": "Thanh toán một phần",
  "Paid": "Đã thanh toán",
  "Unknown": "Không xác định",
  "Received": "Đã nhận",
  "Completed": "Đã hoàn tất",
  "Pending": "Đang chờ",
  "Planned": "Dự kiến",
  "Voided": "Đã hủy",
  "No payment id found.": "Không tìm thấy ID thanh toán.",
  "Service #{0}": "Dịch vụ #{0}",
  "Could not load payment contract context.": "Không thể tải thông tin hợp đồng của thanh toán.",
  "Could not update accounting owner.": "Không thể cập nhật người phụ trách kế toán.",
  "Accounting owner updated.": "Đã cập nhật người phụ trách kế toán.",
  "Payment data is not available.": "Không có dữ liệu thanh toán.",
  "Select owner": "Chọn người phụ trách",
  "Accounting owner": "Người phụ trách kế toán",
  "Payment #{0}": "Thanh toán #{0}",
  "Payment date": "Ngày thanh toán",
  "Payment method": "Phương thức thanh toán",
  "Payment reference": "Tham chiếu thanh toán",
  "Invoice": "Hóa đơn",
  "Financial summary": "Tóm tắt tài chính",
  "This payment": "Khoản thanh toán này",
  "Unassigned installment": "Chưa gắn đợt thanh toán",
  "Retainer recurring payment": "Thanh toán định kỳ Retainer",
  "Direct contract payment": "Thanh toán trực tiếp theo hợp đồng",
  "Contract & customer": "Hợp đồng & khách hàng",
  "Contract": "Hợp đồng",
  "Customer": "Khách hàng",
  "Allocation": "Phân bổ",
  "Contract collected": "Đã thu theo hợp đồng",
  "Contract value {0}": "Giá trị hợp đồng {0}",
  "Balance due": "Còn phải thu",
  "Next payment": "Thanh toán tiếp theo",
  "Collection progress": "Tiến độ thu",
  "Installment progress": "Tiến độ các đợt",
  "Fully paid installments": "Đợt đã thanh toán đủ",
  "Installments with receipts": "Đợt đã có khoản thu",
  "Partial installments": "Đợt thanh toán một phần",
  "Installment": "Đợt thanh toán",
  "Due date": "Hạn",
  "Remaining": "Còn lại",
  "Status": "Trạng thái",
  "day": "ngày",
  "days": "ngày",
  "week": "tuần",
  "weeks": "tuần",
  "month": "tháng",
  "months": "tháng",
  "quarter": "quý",
  "quarters": "quý",
  "year": "năm",
  "years": "năm",
  "cycle": "kỳ",
  "cycles": "kỳ",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React } = ctx;
const { useEffect, useMemo, useState } = React;
const {
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} = ctx.antd;

const PAYMENT_RESOURCES = ["payments", "Payment", "payment"];
const INVOICE_RESOURCES = ["invoices", "Invoice", "invoice"];
const CONTRACT_RESOURCES = ["contracts", "Contract", "contract"];
const USER_RESOURCES = ["users"];
const ACCOUNTING_USER_FIELD = "users";

const MONEY_TOLERANCE = 0;
// 2026-09-28: a payment is Received or Cancelled (spec
// docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §6).
const ACTUAL_PAYMENT_STATUSES = ["received"];
const NON_ACTIVE_STATUSES = ["cancelled", "canceled", "void"];

const contextRecord =
  ctx.record ||
  ctx.popup?.record ||
  ctx.state?.record ||
  ctx.data?.record ||
  ctx.recordData ||
  null;

const extractId = (value) => {
  if (Array.isArray(value)) return extractId(value[0]);
  const raw = value && typeof value === "object" ? value.id || value._id : value;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const recordIdFromUrl = () => {
  const parts = String(window.location.pathname || "").split("/");
  const index = parts.indexOf("filterbytk");
  return index >= 0 ? extractId(parts[index + 1]) : null;
};

const RECORD_ID = extractId(contextRecord?.id) || extractId(ctx.recordId) || recordIdFromUrl();

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

const unwrapRecord = (res) => res?.data?.data || res?.data || null;

const unwrapList = (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const safeJsonParse = (value) => {
  if (!value) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("[PaymentContractDetailBlock] Invalid paymentSchedule JSON", error);
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
  const key = normalizeModeKey(unit);
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

const retainerDurationSuffix = (retainerPeriod, durationValue) => {
  const singular = parseNum(durationValue) === 1;
  if (retainerPeriod === "day") return singular ? tr("day") : tr("days");
  if (retainerPeriod === "week") return singular ? tr("week") : tr("weeks");
  if (retainerPeriod === "month") return singular ? tr("month") : tr("months");
  if (retainerPeriod === "quarter") return singular ? tr("quarter") : tr("quarters");
  if (retainerPeriod === "year") return singular ? tr("year") : tr("years");
  return singular ? tr("cycle") : tr("cycles");
};

// Replaces recomputing "startDate + 1 unit" blind to actual progress —
// once a plan exists, its own nextBillingDate is the live, correct
// answer, written by the retainer-billing automation directly.
const resolveActiveBillingPlanDisplay = (plan) => {
  if (!plan) return null;
  const totalCycles = plan.retainerTotalCycles ?? null;
  const cyclesBilled = plan.retainerCyclesBilled ?? 0;
  if (plan.nextBillingDate) {
    return {
      nextPaymentDate: normalizeDateInput(plan.nextBillingDate),
      cyclesBilled,
      totalCycles,
      displayText: totalCycles
        ? tr("Every {0} · {1} {2} total", { 0: retainerDurationSuffix(plan.retainerUnit, 1), 1: totalCycles, 2: retainerDurationSuffix(plan.retainerUnit, totalCycles) })
        : tr("Every {0} · open-ended", { 0: retainerDurationSuffix(plan.retainerUnit, 1) }),
    };
  }
  return {
    nextPaymentDate: calcRetainerNextPaymentDate(plan.startDate, 1, plan.retainerUnit),
    cyclesBilled,
    totalCycles,
    displayText: totalCycles
      ? tr("Every {0} · {1} {2} total", { 0: retainerDurationSuffix(plan.retainerUnit, 1), 1: totalCycles, 2: retainerDurationSuffix(plan.retainerUnit, totalCycles) })
      : tr("Every {0} · open-ended", { 0: retainerDurationSuffix(plan.retainerUnit, 1) }),
  };
};

// Prefers the live contractBillingPlans record (via contract.billingPlans)
// when present — the single source of truth the retainer-billing
// automation reads and writes directly. Falls back to the legacy
// paymentSchedule.retainerRule JSON for contracts not yet backfilled.
const resolveRetainerNextPaymentDate = (contract, schedule) => {
  const activePlan = contract?.billingPlans?.find((p) => p.status === "active") || null;
  if (activePlan) {
    return resolveActiveBillingPlanDisplay(activePlan)?.nextPaymentDate || "";
  }
  const rule = schedule?.retainerRule || null;
  const storedDate = normalizeDateInput(rule?.nextPaymentDate);
  if (storedDate) return storedDate;
  return calcRetainerNextPaymentDate(
    schedule?.firstPaymentDate || contract?.paymentDate,
    rule?.interval || contract?.retainerDuration,
    rule?.unit || contract?.retainerRepeatUnit || contract?.retainerPeriod,
  );
};

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();
const isActualPaidStatus = (status) => ACTUAL_PAYMENT_STATUSES.includes(normalizeStatus(status));
const isInactiveStatus = (status) => NON_ACTIVE_STATUSES.includes(normalizeStatus(status));

const formatMoney = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  const n = parseNum(value);
  return `${Math.round(n).toLocaleString("vi-VN")} VND`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("vi-VN");
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("vi-VN")} ${date.toLocaleTimeString("vi-VN", { hour12: false })}`;
};

const normalizeModeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const customerLabel = (record) =>
  compact([
    firstPresent(record, ["customerName", "name", "fullName", "displayName", "companyName"]),
    firstPresent(record, ["customerCode", "code"]) ? `(${firstPresent(record, ["customerCode", "code"])})` : "",
  ]).join(" ") || (record?.id ? tr("Customer #{0}", { 0: record.id }) : "-");

const contractLabel = (record) =>
  compact([
    firstPresent(record, ["contractCode", "contractNumber", "code"]),
    firstPresent(record, ["contractName", "name", "title"]),
  ]).join(" - ") || (record?.id ? tr("Contract #{0}", { 0: record.id }) : "-");

const userLabel = (record) =>
  compact([
    firstPresent(record, ["nickname", "displayName", "name", "username", "email"]),
    firstPresent(record, ["email"]) &&
    firstPresent(record, ["email"]) !== firstPresent(record, ["nickname", "displayName", "name", "username", "email"])
      ? `(${firstPresent(record, ["email"])})`
      : "",
  ]).join(" ") || (record?.id ? tr("User #{0}", { 0: record.id }) : "-");

const resolveAccountingId = (record) =>
  extractId(record?.[ACCOUNTING_USER_FIELD]);

// ---- retainer contract value (pure; tested by scripts/tests/retainer-per-period.test.js) ----
// JS twin of contract_retainer_value (pgsql/contract_payment_status_workflow.sql,
// 2026-09-30): a retainer's totalAmount is the fee of EVERY period, so the
// contract is worth fee × the plan's periods (open-ended: the periods billed
// so far, at least 1). The active plan wins, else the newest. 0 = not a
// retainer, or no plan yet.
const retainerContractValue = (contract) => {
  if (String(contract?.contractType || "") !== "retainer") return 0;
  const plans = (contract?.billingPlans || [])
    .filter((p) => String(p?.planType || "") === "retainer")
    .sort((a, b) => (b.status === "active") - (a.status === "active") || parseNum(b.id) - parseNum(a.id));
  const plan = plans[0];
  if (!plan) return 0;
  const periods = parseNum(plan.retainerTotalCycles) || Math.max(parseNum(plan.retainerCyclesBilled), 1);
  return Math.round(parseNum(plan.totalAmount)) * periods;
};
// ---- end retainer contract value ----
const contractTotalAmount = (contract) => {
  const retainerValue = retainerContractValue(contract);
  if (retainerValue > MONEY_TOLERANCE) return retainerValue;

  const directTotal = parseNum(firstPresent(contract, [
    "totalAmount",
    "packageTotalAmount",
    "grandTotal",
    "contractValue",
    "amount",
    "fixedAmount",
  ]));
  if (directTotal > MONEY_TOLERANCE) return directTotal;

  const subTotal = parseNum(firstPresent(contract, ["subTotal", "packageSubTotal"]));
  const vatAmount = parseNum(firstPresent(contract, ["vatAmount", "packageVatAmount"]));
  if (subTotal > MONEY_TOLERANCE || vatAmount > MONEY_TOLERANCE) return subTotal + vatAmount;

  const activePlan = contract?.billingPlans?.find((p) => p.status === "active") || contract?.billingPlans?.[0] || null;
  const planTotal = parseNum(activePlan?.totalAmount);
  if (planTotal > MONEY_TOLERANCE) return planTotal;

  return 0;
};

// ---- percent remainder helpers (pure; tested by scripts/tests/money-rounding.test.js) ----
// Legacy schedules that store only percentages get each amount rounded on
// its own, so 30/30/40 of 10,000,001 showed 10,000,000. When every amount is
// derived from a percentage and they add up to 100%, the last installment
// takes the remainder (cumulative totals follow). Stored amounts are never
// changed.
const absorbPercentRemainder = (installments, baseAmount) => {
  const base = Math.round(Number(baseAmount) || 0);
  if (!Array.isArray(installments) || installments.length < 2 || base <= 0) return installments;
  if (!installments.every((row) => row.amountFromPercent)) return installments;
  const percentSum = installments.reduce((sum, row) => sum + (Number(row.percentage) || 0), 0);
  if (Math.abs(percentSum - 100) > 0.01) return installments;
  const lastIndex = installments.length - 1;
  const others = installments.reduce(
    (sum, row, index) => (index === lastIndex ? sum : sum + (Number(row.amount) || 0)),
    0,
  );
  let running = 0;
  return installments.map((row, index) => {
    const amount = index === lastIndex ? base - others : row.amount;
    running += Number(amount) || 0;
    return row.cumulativeTotal === undefined ? { ...row, amount } : { ...row, amount, cumulativeTotal: running };
  });
};
// ---- end percent remainder helpers ----

const normalizeSchedule = (contract) => {
  const raw = safeJsonParse(contract?.paymentSchedule);
  if (!raw) {
    return {
      mode: normalizeModeKey(contract?.billingCycle),
      firstPaymentDate: contract?.paymentDate || "",
      retainerRule: null,
      installments: [],
    };
  }

  const schedule = Array.isArray(raw)
    ? { mode: contract?.billingCycle || "multiple_payments", firstPaymentDate: raw[0]?.paymentDate || raw[0]?.dueDate || contract?.paymentDate || "", installments: raw }
    : raw;
  const baseAmount = parseNum(schedule.baseAmount ?? schedule.totalAmount ?? contract?.totalAmount);

  const normalizedInstallments = (Array.isArray(schedule.installments) ? schedule.installments : [])
    .map((item, index) => {
      const scheduleItemId = item.scheduleItemId || item.id || `payment-${index + 1}`;
      const percentage = item.percentage ?? null;
      const storedAmount = parseNum(item.amount ?? item.plannedAmount ?? item.totalAmount);
      const amount =
        storedAmount || (percentage ? Math.round((baseAmount * parseNum(percentage)) / 100) : 0);
      return {
        ...item,
        id: scheduleItemId,
        scheduleItemId,
        installmentNo: item.installmentNo || item.sortOrder || index + 1,
        sortOrder: item.sortOrder || index + 1,
        label: item.label || item.installmentLabel || item.installment || tr("Installment {0}", { 0: index + 1 }),
        content: item.content || item.description || item.note || item.timingNote || "",
        paymentDate: item.paymentDate || item.dueDate || item.date || "",
        percentage,
        amount,
        amountFromPercent: !storedAmount && amount > 0,
      };
    })
    .filter((item) => item.label || item.paymentDate || item.amount > 0);
  const installments = absorbPercentRemainder(normalizedInstallments, baseAmount);

  return {
    mode: normalizeModeKey(schedule.mode || contract?.billingCycle),
    firstPaymentDate: schedule.firstPaymentDate || contract?.paymentDate || "",
    retainerRule: schedule.retainerRule || null,
    installments,
  };
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

const getAny = async (resources, id, params = {}) => {
  if (!id) return null;
  const res = await apiRequestAny(resources, "get", {
    params: { filterByTk: id, ...params },
  });
  return unwrapRecord(res);
};

const listAny = async (resources, params = {}) => {
  const res = await apiRequestAny(resources, "list", { params });
  return unwrapList(res);
};

const updateAny = async (resources, id, data) => {
  const res = await apiRequestAny(resources, "update", {
    method: "POST",
    params: { filterByTk: id },
    data,
  });
  return unwrapRecord(res);
};

const resolvePaymentContractId = (payment, invoice) =>
  extractId(payment?.contractId) ||
  extractId(payment?.contracts) ||
  extractId(payment?.contract) ||
  extractId(invoice?.contractId) ||
  extractId(invoice?.contracts) ||
  extractId(invoice?.contract);

const resolvePaymentInvoiceId = (payment) =>
  extractId(payment?.invoiceId) ||
  extractId(payment?.invoices) ||
  extractId(payment?.invoice);

const listPaymentsByContract = async (contractId) => {
  if (!contractId) return [];
  return listAny(PAYMENT_RESOURCES, {
    pageSize: 1000,
    filter: JSON.stringify({
      $or: [
        { contractId: { $eq: contractId } },
        { contracts: { id: { $eq: contractId } } },
      ],
    }),
  }).catch(() =>
    listAny(PAYMENT_RESOURCES, {
      pageSize: 1000,
      filter: JSON.stringify({ contractId: { $eq: contractId } }),
    }),
  );
};

const summarizeActualPayments = (payments = []) =>
  payments.reduce((sum, payment) => {
    if (isInactiveStatus(payment?.paymentStatus) || !isActualPaidStatus(payment?.paymentStatus)) return sum;
    return sum + parseNum(payment?.amount);
  }, 0);

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

const buildInstallmentRows = (schedule, payments) => {
  const summary = summarizePaymentsByInstallment(payments);
  return schedule.installments.map((item) => {
    const paidAmount = parseNum(summary.get(String(item.scheduleItemId))?.paidAmount);
    const remainingAmount = Math.max(parseNum(item.amount) - paidAmount, 0);
    const computedStatus =
      paidAmount <= MONEY_TOLERANCE
        ? "planned"
        : remainingAmount <= MONEY_TOLERANCE
          ? "paid"
          : "partial";
    return {
      ...item,
      paidAmount,
      remainingAmount,
      computedStatus,
    };
  });
};

const CONTRACT_PAYMENT_STATUS_META = {
  unpaid: { color: "default", label: tr("Unpaid") },
  partial: { color: "warning", label: tr("Partial") },
  paid: { color: "success", label: tr("Paid") },
};

const contractPaymentStatusMeta = (status) =>
  CONTRACT_PAYMENT_STATUS_META[String(status || "").toLowerCase()] || { color: "default", label: tr("Unknown") };

const statusTag = (status) => {
  const key = normalizeStatus(status);
  const labelMap = {
    paid: tr("Received"),
    received: tr("Received"),
    completed: tr("Completed"),
    partial: tr("Partial"),
    pending: tr("Pending"),
    planned: tr("Planned"),
    cancelled: tr("Voided"),
    canceled: tr("Voided"),
    void: tr("Voided"),
  };
  return React.createElement(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        minHeight: 24,
        padding: "2px 8px",
        border: "1px solid #d9d9d9",
        borderRadius: 4,
        color: "rgba(0,0,0,0.72)",
        background: "#fff",
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
      },
    },
    labelMap[key] || status || "-",
  );
};

// Sized to its own content (flex: 0 1 auto), not stretched to an equal
// share of the row — a short value like "-" stays short instead of being
// forced into a wide column with dead space around it. `minWidth` only
// keeps very short content from looking cramped; it never forces growth.
// Outside a flex container (e.g. the full-width Allocation slot) the flex
// property is simply ignored, so this stays safe to reuse anywhere.
const InfoLine = ({ label, value, minWidth = 110 }) =>
  React.createElement(
    "div",
    { style: { flex: "0 1 auto", minWidth } },
    React.createElement("div", { style: { color: "rgba(0,0,0,0.45)", fontSize: 12, marginBottom: 4 } }, label),
    React.createElement("div", { style: { fontWeight: 500, wordBreak: "break-word" } }, value || "-"),
  );

// The internal-system field-list pattern: a row of label/value pairs that
// each take only the width their own content needs, wrapping to the next
// line when they run out of room. Use for read-only field groups (this
// file's "meta" and "Contract & customer" rows); keep CSS Grid with equal
// columns only for genuinely uniform tiles like the Financial summary
// metric cards, where equal width is itself part of the KPI-row look.
const FieldRow = ({ children }) =>
  React.createElement(
    "div",
    { style: { display: "flex", flexWrap: "wrap", columnGap: 32, rowGap: 12 } },
    children,
  );

const MetricBox = ({ label, value, sub, valueColor }) =>
  React.createElement(
    "div",
    {
      style: {
        border: "1px solid #e5e5e5",
        background: "#fff",
        borderRadius: 6,
        padding: "12px 14px",
        minWidth: 0,
      },
    },
    React.createElement("div", { style: { color: "rgba(0,0,0,0.45)", fontSize: 12, marginBottom: 5 } }, label),
    React.createElement(
      "div",
      {
        style: {
          color: valueColor || "rgba(0,0,0,0.88)",
          fontSize: 15,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          wordBreak: "break-word",
        },
      },
      value || "-",
    ),
    sub
      ? React.createElement("div", { style: { marginTop: 4, color: "rgba(0,0,0,0.45)", fontSize: 12 } }, sub)
      : null,
  );

// A section boundary encodes grouping, not decoration — the border-top is
// what tells the eye "new group starts here" without adding a heavier
// divider component. First section on the page should skip the border
// (nothing above it to separate from).
const Section = ({ title, first, children }) =>
  React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gap: 10,
        borderTop: first ? "none" : "1px solid #f0f0f0",
        paddingTop: first ? 0 : 14,
      },
    },
    title
      ? React.createElement(
          "div",
          { style: { fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.72)" } },
          title,
        )
      : null,
    children,
  );

const PaymentContractDetailBlock = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(contextRecord || null);
  const [invoice, setInvoice] = useState(null);
  const [contract, setContract] = useState(null);
  const [contractPayments, setContractPayments] = useState([]);
  const [accountingUsers, setAccountingUsers] = useState([]);
  const [savingAccounting, setSavingAccounting] = useState(false);
  // §6h — which contractServices this payment's own Payment Request is
  // tagged to, so "Allocation" shows the service(s), not just the
  // installment label.
  const [allocationServiceNames, setAllocationServiceNames] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!RECORD_ID) {
        setError(tr("No payment id found."));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const freshPayment =
          (await getAny(PAYMENT_RESOURCES, RECORD_ID, {
            appends: ["contracts", "invoices", "customers", "internalCompany", ACCOUNTING_USER_FIELD],
          }).catch(() =>
            getAny(PAYMENT_RESOURCES, RECORD_ID, {
              appends: ["contracts", "invoices", "customers", "internalCompany"],
            }).catch(() => null),
          )) ||
          contextRecord ||
          null;

        const invoiceId = resolvePaymentInvoiceId(freshPayment);
        const directInvoice = relationRecord(freshPayment?.invoices) || relationRecord(freshPayment?.invoice);
        const freshInvoice =
          directInvoice ||
          (invoiceId
            ? await getAny(INVOICE_RESOURCES, invoiceId, { appends: ["contracts", "customers", "internalCompany"] }).catch(() => null)
            : null);

        const contractId = resolvePaymentContractId(freshPayment, freshInvoice);
        const directContract =
          relationRecord(freshPayment?.contracts) ||
          relationRecord(freshPayment?.contract) ||
          relationRecord(freshInvoice?.contracts) ||
          relationRecord(freshInvoice?.contract);
        const freshContract =
          (contractId
            ? await getAny(CONTRACT_RESOURCES, contractId, { appends: ["customers", "billingPlans"] }).catch(() => null)
            : null) ||
          directContract ||
          null;

        const [payments, users] = await Promise.all([
          freshContract?.id
            ? listPaymentsByContract(extractId(freshContract.id)).catch(() => [])
            : Promise.resolve([]),
          listAny(USER_RESOURCES, { pageSize: 500 }).catch(() => []),
        ]);

        if (!mounted) return;
        setPayment(freshPayment);
        setInvoice(freshInvoice);
        setContract(freshContract);
        setContractPayments(payments || []);
        setAccountingUsers((users || []).filter((user) => extractId(user?.id) !== 1));

        const requestId = extractId(freshPayment?.paymentRequestId) || extractId(freshPayment?.paymentRequest);
        if (requestId) {
          listAny(["paymentRequestServices"], {
            filter: JSON.stringify({ paymentRequestId: { $eq: requestId } }),
            fields: ["id", "contractServiceId"],
          })
            .then((tagRows) => {
              const csIds = compact((tagRows || []).map((row) => extractId(row.contractServiceId)));
              if (!csIds.length || !mounted) return;
              return listAny(["contractServices"], {
                filter: JSON.stringify({ id: { $in: csIds } }),
                fields: ["id", "serviceName"],
              }).then((serviceRows) => {
                if (!mounted) return;
                setAllocationServiceNames((serviceRows || []).map((row) => row.serviceName || tr("Service #{0}", { 0: extractId(row.id) })));
              });
            })
            .catch(() => {
              if (mounted) setAllocationServiceNames([]);
            });
        }
      } catch (loadError) {
        console.error("[PaymentContractDetailBlock] load failed", loadError);
        if (mounted) setError(loadError?.message || tr("Could not load payment contract context."));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAccountingChange = async (value) => {
    const userId = extractId(value);
    setSavingAccounting(true);
    let updated = null;

    try {
      updated = await updateAny(PAYMENT_RESOURCES, RECORD_ID, { [ACCOUNTING_USER_FIELD]: userId || null });
    } catch (error) {
      console.error("[PaymentContractDetailBlock] accounting update failed", error);
      message.error(tr("Could not update accounting owner."));
      setSavingAccounting(false);
      return;
    }

    const selectedUser = accountingUsers.find((user) => String(extractId(user)) === String(userId)) || null;
    setPayment((prev) => ({
      ...(prev || {}),
      ...(updated || {}),
      [ACCOUNTING_USER_FIELD]: selectedUser,
    }));
    message.success(tr("Accounting owner updated."));
    setSavingAccounting(false);
  };

  const model = useMemo(() => {
    const schedule = normalizeSchedule(contract || {});
    const isInstallmentContract = schedule.mode === "multiple_payments" && schedule.installments.length > 0;
    const isRetainerContract =
      schedule.retainerRule?.enabled ||
      schedule.mode === "recurring" ||
      normalizeModeKey(contract?.contractType) === "retainer";
    const retainerNextPaymentDate = isRetainerContract
      ? resolveRetainerNextPaymentDate(contract || {}, schedule)
      : "";
    const installmentRows = buildInstallmentRows(schedule, contractPayments);
    const completedInstallments = installmentRows.filter(
      (row) => parseNum(row.amount) > MONEY_TOLERANCE && row.remainingAmount <= MONEY_TOLERANCE,
    ).length;
    const touchedInstallments = installmentRows.filter((row) => row.paidAmount > MONEY_TOLERANCE).length;
    const partialInstallments = installmentRows.filter(
      (row) => row.paidAmount > MONEY_TOLERANCE && row.remainingAmount > MONEY_TOLERANCE,
    ).length;
    const currentScheduleItemId = String(
      payment?.scheduleItemId || payment?.installmentId || payment?.paymentScheduleId || "",
    );
    const currentInstallment = currentScheduleItemId
      ? installmentRows.find((row) => String(row.scheduleItemId) === currentScheduleItemId) || null
      : null;
    const totalAmount = contractTotalAmount(contract || {});
    const paidAmount = summarizeActualPayments(contractPayments);
    const remainingAmount = totalAmount > MONEY_TOLERANCE ? Math.max(totalAmount - paidAmount, 0) : 0;
    // When the contract has explicit installments, the sum of their own
    // remainingAmount IS the ground truth — it's exactly what the table
    // below shows, so it can never drift from it. contracts.outStandingAmount
    // (DB, contract-total-based, kept in sync by trg_payment_recompute_contract)
    // is only used when there's no installment breakdown to sum instead;
    // the client recompute above is the last-resort fallback for
    // pre-trigger contracts.
    const installmentBasedOutstanding = isInstallmentContract
      ? installmentRows.reduce((sum, row) => sum + row.remainingAmount, 0)
      : null;
    const dbOutstanding = contract?.outStandingAmount;
    const outstandingAmount = installmentBasedOutstanding !== null
      ? installmentBasedOutstanding
      : dbOutstanding !== undefined && dbOutstanding !== null
        ? parseNum(dbOutstanding)
        : remainingAmount;
    const paymentStatusMeta = contractPaymentStatusMeta(contract?.paymentStatus);
    const recognizedPaymentAmount =
      !isInactiveStatus(payment?.paymentStatus) && isActualPaidStatus(payment?.paymentStatus)
        ? parseNum(payment?.amount)
        : 0;
    const coveragePercent = totalAmount > MONEY_TOLERANCE
      ? Math.min(100, Math.round(((totalAmount - outstandingAmount) * 10000) / totalAmount) / 100)
      : 0;
    const customer =
      relationRecord(contract?.customers) ||
      relationRecord(contract?.customer) ||
      relationRecord(payment?.customers) ||
      relationRecord(payment?.customer);

    return {
      schedule,
      isInstallmentContract,
      isRetainerContract,
      retainerNextPaymentDate,
      installmentRows,
      completedInstallments,
      touchedInstallments,
      partialInstallments,
      currentInstallment,
      totalAmount,
      paidAmount,
      remainingAmount,
      outstandingAmount,
      paymentStatusMeta,
      recognizedPaymentAmount,
      coveragePercent,
      customer,
    };
  }, [payment, contract, contractPayments]);

  if (loading) {
    return React.createElement(
      "div",
      { style: { padding: 24, textAlign: "center" } },
      React.createElement(Spin, null),
    );
  }

  if (error) {
    return React.createElement("div", { style: { padding: 12, color: "#8c5a00" } }, error);
  }

  if (!payment) {
    return React.createElement("div", { style: { padding: 12, color: "#8c5a00" } }, tr("Payment data is not available."));
  }

  const accountingOptions = accountingUsers.map((user) => ({
    value: extractId(user),
    label: userLabel(user),
  }));
  const accountingSelect = React.createElement(Select, {
    showSearch: true,
    allowClear: true,
    loading: savingAccounting,
    disabled: savingAccounting,
    value: resolveAccountingId(payment) || undefined,
    placeholder: tr("Select owner"),
    optionFilterProp: "label",
    style: { width: "100%" },
    options: accountingOptions,
    onChange: handleAccountingChange,
    "aria-label": tr("Accounting owner"),
  });

  // The one hero fact on this record — identity + status. The amount
  // lives in "Financial summary" below (as "This payment"); showing it
  // again here was a duplicate, not a second hero fact.
  const heroRow = React.createElement(
    "div",
    { key: "hero", style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 } },
    React.createElement(
      Space,
      { size: 8, wrap: true, align: "center" },
      React.createElement(
        "span",
        { style: { fontSize: 16, fontWeight: 600, color: "rgba(0,0,0,0.88)" } },
        firstPresent(payment, ["paymentNumber", "paymentCode"]) || tr("Payment #{0}", { 0: extractId(payment) }),
      ),
      statusTag(payment.paymentStatus),
    ),
  );

  const accountingSection = React.createElement(
    Section,
    { title: tr("Accounting owner") },
    React.createElement(
      "div",
      { style: { background: "#fafafa", border: "1px solid #eee", borderRadius: 6, padding: 10, maxWidth: 360 } },
      accountingSelect,
    ),
  );

  if (!contract) {
    return React.createElement(
      "div",
      {
        style: {
          border: "1px solid #e5e5e5",
          borderRadius: 6,
          background: "#fff",
          padding: 14,
          display: "grid",
          gap: 14,
        },
      },
      React.createElement(
        Section,
        { first: true },
        heroRow,
        React.createElement(
          FieldRow,
          { key: "meta" },
          React.createElement(InfoLine, { label: tr("Payment date"), value: formatDateTime(payment.paymentDate), minWidth: 150 }),
          React.createElement(InfoLine, { label: tr("Payment method"), value: payment.paymentMethod || "-", minWidth: 90 }),
          React.createElement(InfoLine, { label: tr("Payment reference"), value: payment.paymentRefer || "-", minWidth: 110 }),
          React.createElement(InfoLine, {
            label: tr("Invoice"),
            value: invoice
              ? firstPresent(invoice, ["invoiceNumber", "invoiceCode", "code"]) || `Invoice #${extractId(invoice)}`
              : "-",
            minWidth: 130,
          }),
        ),
      ),
      accountingSection,
      React.createElement(
        Section,
        { title: tr("Financial summary") },
        React.createElement(MetricBox, {
          label: tr("This payment"),
          value: isActualPaidStatus(payment.paymentStatus) && !isInactiveStatus(payment.paymentStatus)
            ? formatMoney(payment.amount)
            : "0 VND",
        }),
      ),
    );
  }

  const paymentPlanValue = model.currentInstallment
    ? model.currentInstallment.label
    : model.isInstallmentContract
      ? tr("Unassigned installment")
      : model.isRetainerContract
        ? tr("Retainer recurring payment")
        : tr("Direct contract payment");

  return React.createElement(
    "div",
    {
      style: {
        border: "1px solid #e5e5e5",
        borderRadius: 6,
        background: "#fff",
        padding: 14,
        display: "grid",
        gap: 14,
      },
    },
    React.createElement(
      Section,
      { first: true },
      heroRow,
      React.createElement(
        FieldRow,
        { key: "meta" },
        React.createElement(InfoLine, { label: tr("Payment date"), value: formatDateTime(payment.paymentDate), minWidth: 150 }),
        React.createElement(InfoLine, { label: tr("Payment method"), value: payment.paymentMethod || "-", minWidth: 90 }),
        React.createElement(InfoLine, { label: tr("Payment reference"), value: payment.paymentRefer || "-", minWidth: 110 }),
      ),
    ),
    React.createElement(
      Section,
      { title: tr("Contract & customer") },
      React.createElement(
        FieldRow,
        { key: "cc" },
        React.createElement(InfoLine, {
          label: tr("Contract"),
          minWidth: 200,
          value: React.createElement(
            Space,
            { size: 6, wrap: true },
            contractLabel(contract),
            React.createElement(Tag, { color: model.paymentStatusMeta.color }, model.paymentStatusMeta.label),
          ),
        }),
        React.createElement(InfoLine, { label: tr("Customer"), value: customerLabel(model.customer), minWidth: 150 }),
      ),
      React.createElement(InfoLine, {
        key: "alloc",
        label: tr("Allocation"),
        value: React.createElement(
          "div",
          { style: { maxWidth: "100%" } },
          paymentPlanValue,
          allocationServiceNames.length
            ? React.createElement(
                Space,
                { size: 4, wrap: true, style: { marginTop: 4, display: "flex", maxWidth: "100%" } },
                allocationServiceNames.map((name) =>
                  React.createElement(
                    Tag,
                    { key: name, style: { whiteSpace: "normal", wordBreak: "break-word", maxWidth: "100%" } },
                    name,
                  ),
                ),
              )
            : null,
        ),
      }),
    ),
    accountingSection,
    React.createElement(
      Section,
      { title: tr("Financial summary") },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 10,
          },
        },
        React.createElement(MetricBox, {
          label: tr("This payment"),
          value: formatMoney(model.recognizedPaymentAmount),
        }),
        React.createElement(MetricBox, {
          label: tr("Contract collected"),
          value: formatMoney(model.paidAmount),
          sub: model.totalAmount ? tr("Contract value {0}", { 0: formatMoney(model.totalAmount) }) : "",
        }),
        React.createElement(MetricBox, {
          label: tr("Balance due"),
          value: model.totalAmount ? formatMoney(model.outstandingAmount) : "-",
          valueColor: model.totalAmount
            ? (model.outstandingAmount > MONEY_TOLERANCE ? "#d46b08" : "#237804")
            : undefined,
        }),
        model.isRetainerContract
          ? React.createElement(MetricBox, {
              label: tr("Next payment"),
              value: formatDate(model.retainerNextPaymentDate),
            })
          : null,
        React.createElement(MetricBox, {
          label: tr("Collection progress"),
          value: model.totalAmount ? `${model.coveragePercent}%` : "-",
        }),
      ),
    ),
    model.isInstallmentContract
      ? React.createElement(
          Section,
          { title: tr("Installment progress") },
            React.createElement(
              "div",
              {
                key: "stats",
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 10,
                },
              },
              React.createElement(MetricBox, {
                label: tr("Fully paid installments"),
                value: `${model.completedInstallments}/${model.installmentRows.length}`,
              }),
              React.createElement(MetricBox, {
                label: tr("Installments with receipts"),
                value: String(model.touchedInstallments),
              }),
              React.createElement(MetricBox, {
                label: tr("Partial installments"),
                value: String(model.partialInstallments),
              }),
            ),
            React.createElement(Table, {
              key: "table",
              style: { marginTop: 12 },
              rowKey: "scheduleItemId",
              size: "small",
              pagination: false,
              dataSource: model.installmentRows,
              scroll: { x: 720 },
              columns: [
                {
                  title: tr("Installment"),
                  dataIndex: "label",
                  width: 160,
                  render: (value, row) =>
                    React.createElement(
                      "span",
                      { style: { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" } },
                      React.createElement("span", { style: { fontWeight: 500 } }, value || tr("Installment {0}", { 0: row.installmentNo })),
                      model.currentInstallment && String(row.scheduleItemId) === String(model.currentInstallment.scheduleItemId)
                        ? React.createElement(
                            "span",
                            { style: { color: "rgba(0,0,0,0.45)", fontSize: 12, fontWeight: 500 } },
                            "current",
                          )
                        : null,
                    ),
                },
                { title: tr("Due date"), dataIndex: "paymentDate", width: 100, render: formatDate },
                { title: tr("Planned"), dataIndex: "amount", width: 120, align: "right", render: formatMoney },
                { title: tr("Received"), dataIndex: "paidAmount", width: 120, align: "right", render: formatMoney },
                { title: tr("Remaining"), dataIndex: "remainingAmount", width: 120, align: "right", render: formatMoney },
                {
                  title: tr("Status"),
                  dataIndex: "computedStatus",
                  width: 100,
                  render: statusTag,
                },
              ],
            }),
          )
        : null,
  );
};

ctx.render(React.createElement(PaymentContractDetailBlock));
