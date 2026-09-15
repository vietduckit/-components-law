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
const LAWYER_RESOURCES = ["lawyers", "Lawyer", "lawyer"];
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

const lawyerLabel = (record) =>
  firstPresent(record, ["lawyerName", "nickname", "name"]) || (record?.id ? `Lawyer #${record.id}` : "-");

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

// Wrapped in a single <span> (not a Fragment) so the [text, "*"] pair stays
// on one line even when the parent label uses display:grid — a Fragment's
// children get flattened into the grid as SEPARATE items, each landing on
// its own row, which is what threw required fields' input off-alignment
// with their non-required row-mates.
const fieldLabel = (text, required = false) =>
  required
    ? React.createElement(
        "span",
        null,
        text,
        React.createElement("span", { style: { color: "#ff4d4f", marginLeft: 2 } }, "*"),
      )
    : text;

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
  return `${Math.round(n).toLocaleString("vi-VN")} VND`;
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

const retainerDurationSuffix = (retainerPeriod, durationValue) => {
  const singular = parseNum(durationValue) === 1;
  if (retainerPeriod === "day") return singular ? "day" : "days";
  if (retainerPeriod === "week") return singular ? "week" : "weeks";
  if (retainerPeriod === "month") return singular ? "month" : "months";
  if (retainerPeriod === "quarter") return singular ? "quarter" : "quarters";
  if (retainerPeriod === "year") return singular ? "year" : "years";
  return singular ? "cycle" : "cycles";
};

// Replaces the old resolveRetainerNextPaymentDate pattern (which always
// recomputed "startDate + 1 unit" and had no way to know how many cycles
// had actually been auto-billed). Once a plan exists, its own
// nextBillingDate *is* the live, correct next-payment date — this reads
// it directly instead of approximating it a second time.
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
        ? `Every ${plan.retainerUnit} · ${totalCycles} ${retainerDurationSuffix(plan.retainerUnit, totalCycles)} total`
        : `Every ${plan.retainerUnit} · open-ended`,
    };
  }
  // Plan exists but automation hasn't initialized nextBillingDate yet
  // (e.g. open-ended plan, or not yet saved) — best-effort preview only.
  return {
    nextPaymentDate: calcRetainerNextPaymentDate(plan.startDate, 1, plan.retainerUnit),
    cyclesBilled,
    totalCycles,
    displayText: totalCycles
      ? `Every ${plan.retainerUnit} · ${totalCycles} ${retainerDurationSuffix(plan.retainerUnit, totalCycles)} total`
      : `Every ${plan.retainerUnit} · open-ended`,
  };
};

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

const isInactiveStatus = (status) => NON_ACTIVE_STATUSES.includes(normalizeStatus(status));
const isActualPaidStatus = (status) => ACTUAL_PAYMENT_STATUSES.includes(normalizeStatus(status));

const modeLabel = (mode) => {
  const labels = {
    multiple_payments: "Multiple payments",
    one_time: "One time",
    monthly: "Monthly",
    quarterly: "Quarterly",
    milestone: "By milestone",
    manual: "Manual",
    recurring: "Recurring",
  };
  return labels[String(mode || "").trim()] || mode || "";
};

const statusMeta = (status) => {
  const key = String(status || "planned").toLowerCase().trim();
  const map = {
    planned: { label: "Planned", bg: C.neutralBg, color: C.neutralText },
    partial: { label: "Partial", bg: C.warningBg, color: C.warningText },
    pending: { label: "Pending", bg: C.warningBg, color: C.warningText },
    due: { label: "Due", bg: C.warningBg, color: C.warningText },
    overdue: { label: "Overdue", bg: C.dangerBg, color: C.dangerText },
    received: { label: "Received", bg: C.successBg, color: C.successText },
    paid: { label: "Paid", bg: C.successBg, color: C.successText },
    completed: { label: "Completed", bg: C.successBg, color: C.successText },
    cancelled: { label: "Cancelled", bg: C.neutralBg, color: C.neutralText },
    canceled: { label: "Cancelled", bg: C.neutralBg, color: C.neutralText },
  };
  return map[key] || { label: status || "Planned", bg: C.neutralBg, color: C.neutralText };
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
      `Installment ${index + 1}`,
    content: row?.content || row?.description || row?.note || row?.timingNote || "",
    paymentDate: row?.paymentDate || row?.dueDate || row?.date || row?.timing || "",
    amount,
    cumulativeTotal,
    percentage,
    status: row?.status || "planned",
  };
};

const normalizeSchedule = (record) => {
  // By-case contracts (billingCycle "one_time"/"multiple_payments" with no
  // manually-entered schedule) legitimately have paymentSchedule = null —
  // that used to make this function bail out to null entirely, which hid
  // the whole "Create payment request" section for every by-case contract.
  // Falling through with an empty object here lets the rest of this
  // function — and buildRequestableItems's own fallback below — derive a
  // single full-amount request line from the contract's own totalAmount/
  // fixedAmount instead, the same way it already does for retainer
  // contracts with no explicit schedule.
  const raw = safeJsonParse(record?.paymentSchedule) || {};

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
  const baseAmount = parseNum(
    schedule?.baseAmount ?? schedule?.totalAmount ?? record?.totalAmount ?? record?.fixedAmount,
  );

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
    parseNum(record?.totalAmount) ||
    parseNum(record?.fixedAmount);

  // Prefer the live contractBillingPlans record when present (via
  // record.billingPlans, appended by fetchContract) — this is the single
  // source of truth the retainer-billing automation reads and writes
  // directly, so reading it here means this display can never disagree
  // with the automation's actual state. Falls back to the legacy
  // paymentSchedule.retainerRule JSON only for contracts that predate
  // this collection and haven't been backfilled into it yet.
  const activePlan = record?.billingPlans?.find((p) => p.status === "active") || null;
  const planDisplay = activePlan ? resolveActiveBillingPlanDisplay(activePlan) : null;
  const retainerRule = activePlan
    ? {
        enabled: true,
        unit: activePlan.retainerUnit,
        interval: 1,
        nextPaymentDate: planDisplay?.nextPaymentDate || "",
        displayText: planDisplay?.displayText || "",
      }
    : schedule?.retainerRule
      ? {
          ...schedule.retainerRule,
          nextPaymentDate: calcRetainerNextPaymentDate(
            schedule.firstPaymentDate || record?.paymentDate,
            1,
            schedule.retainerRule.unit || record?.retainerRepeatUnit,
          ),
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
    billingPlan: activePlan,
    installments,
  };
};

const hasRenderableSchedule = (schedule) =>
  !!(
    schedule &&
    (schedule.installments.length ||
      schedule.retainerRule?.enabled ||
      schedule.mode === "recurring" ||
      // By-case contracts with no explicit schedule but a real contract
      // value still have something payable — buildRequestableItems falls
      // back to one single full-amount line for exactly this case.
      parseNum(schedule.totalAmount) > 0)
  );

const fetchContract = async (contractId) => {
  if (!contractId) return null;
  const res = await ctx.api.request({
    url: "contracts:get",
    params: { filterByTk: contractId, appends: ["billingPlans"] },
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

const listPaymentRequestsByContract = async (contractId) => {
  if (!contractId) return [];
  try {
    const res = await apiRequestAny(PAYMENT_REQUEST_RESOURCES, "list", {
      params: {
        pageSize: 1000,
        filter: JSON.stringify({ contractId: { $eq: contractId } }),
      },
    });
    return unwrapApiList(res);
  } catch (error) {
    console.warn("[ContractPaymentScheduleDetailBlock] fetch payment requests failed", error);
    return [];
  }
};

// Auto-created by the By Case automation (pgsql/by_case_payment_request_automation.sql)
// — surfaces the pipeline status of each installment's Payment Request,
// distinct from the payment-derived "Trạng thái" column (which reflects
// actual money received, not the request's own approval/processing state).
const PR_STATUS_META = {
  draft: { label: "Draft", bg: "#f5f5f5", color: "rgba(0, 0, 0, 0.45)" },
  pending: { label: "Pending", bg: "#f5f5f5", color: "rgba(0, 0, 0, 0.45)" },
  submitted: { label: "Submitted", bg: "#e6f4ff", color: "#1677ff" },
  active: { label: "Ready", bg: "#e6f4ff", color: "#1677ff" },
  checking: { label: "Checking", bg: "#fffbe6", color: "#d48806" },
  approved: { label: "Approved", bg: "#e6fffb", color: "#08979c" },
  converted: { label: "Converted", bg: "#f6ffed", color: "#389e0d" },
  rejected: { label: "Rejected", bg: "#fff2f0", color: "#cf1322" },
  cancelled: { label: "Cancelled", bg: "#f5f5f5", color: "rgba(0, 0, 0, 0.45)" },
};

// "Requested" = any Payment Request that has moved past "pending" (still
// waiting on its trigger condition/due date) — i.e. it's actually in
// accounting's pipeline, not just scheduled.
const REQUESTED_PR_STATUSES = ["submitted", "active", "checking", "approved", "converted"];

const PRStatusBadge = ({ status }) => {
  if (!status) return null;
  const meta = PR_STATUS_META[status] || { label: status, bg: "#f5f5f5", color: "rgba(0, 0, 0, 0.45)" };
  return React.createElement(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        minHeight: 22,
        padding: "2px 8px",
        borderRadius: 999,
        background: meta.bg,
        color: meta.color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      },
    },
    meta.label,
  );
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

// Auto-created Payment Requests are matched to a schedule row by
// installmentNo (what the By Case automation writes on both sides), not
// scheduleItemId — a Payment Request has no scheduleItemId of its own,
// only its paymentRequestItems rows do.
const summarizePaymentRequestsByInstallment = (paymentRequests = []) => {
  const map = new Map();
  paymentRequests.forEach((pr) => {
    const key = String(pr?.installmentNo ?? "");
    if (!key || key === "null" || key === "undefined") return;
    // An installment could in principle have more than one PR over its
    // lifetime (e.g. a rejected one re-created by hand) — keep the most
    // recently created, so the badge reflects the live one, not a stale
    // rejected/cancelled leftover.
    const current = map.get(key);
    if (!current || new Date(pr?.createdAt) >= new Date(current?.createdAt)) {
      map.set(key, pr);
    }
  });
  return map;
};

const applyPaymentSummary = (schedule, payments = [], paymentRequests = []) => {
  if (!schedule) return schedule;
  const summary = summarizePaymentsByInstallment(payments);
  const prSummary = summarizePaymentRequestsByInstallment(paymentRequests);
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
      const linkedPaymentRequest = prSummary.get(String(row.installmentNo ?? "")) || null;
      return {
        ...row,
        paidAmount,
        remainingAmount,
        paymentRecords: itemSummary?.records || [],
        status: computedStatus,
        linkedPaymentRequest,
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

// Total already received directly against the CONTRACT (not tied to any
// scheduleItemId) — needed for the by-case fallback line below, since a
// by-case contract with no installments array has nowhere else for
// applyPaymentSummary's per-installment paidAmount matching to apply.
const paidContractTotal = (payments = []) =>
  (payments || []).reduce((sum, payment) => {
    if (isInactiveStatus(payment?.paymentStatus) || !isActualPaidStatus(payment?.paymentStatus)) return sum;
    return sum + parseNum(payment?.amount);
  }, 0);

const buildRequestableItems = (record, schedule, payments = []) => {
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
  } else if (!rows.length && parseNum(schedule.totalAmount) > 0) {
    // By-case contract (billingCycle one_time/multiple_payments) with no
    // manually-entered installment schedule — the whole contract value is
    // one payable line, minus whatever's already been paid against it
    // directly (a by-case contract with no schedule has no scheduleItemId
    // for individual payments to attach to, so applyPaymentSummary's
    // per-installment matching never applies here).
    const total = parseNum(schedule.totalAmount);
    const remaining = Math.max(total - paidContractTotal(payments), 0);
    if (remaining > MONEY_TOLERANCE) {
      rows.push({
        key: "contract_balance",
        lineType: "contract_balance",
        scheduleItemId: "contract_balance",
        installmentNo: null,
        lineLabel: "Full contract amount",
        description: "One-time payment for the full contract value",
        plannedPaymentDate: schedule.firstPaymentDate || record?.paymentDate || "",
        requestedAmount: remaining,
        paidAmountSnapshot: paidContractTotal(payments),
        remainingAmountSnapshot: remaining,
        sourceSnapshot: {
          firstPaymentDate: schedule.firstPaymentDate || record?.paymentDate || "",
          totalAmount: total,
          paidAmount: paidContractTotal(payments),
          remainingAmount: remaining,
        },
      });
    }
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
  const relationKeys = ["contracts", "customers", "internalCompany", "requestedBy", "assignedLawyer", "reviewedBy", "createdPayment", "createdInvoice"];
  const scalarKeys = ["contractId", "customerId", "internalCompanyId", "requestedById", "assignedLawyerId", "reviewedById", "createdPaymentId", "createdInvoiceId"];
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
        title: "Installment",
        dataIndex: "label",
        width: 130,
        render: (value, row) =>
          React.createElement(
            "span",
            { style: { fontWeight: 600, color: C.text } },
            value || `Installment ${row.installmentNo}`,
          ),
      },
      {
        title: "Content",
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
        title: "Payment %",
        dataIndex: "percentage",
        width: 120,
        align: "right",
        render: (value) =>
          value !== null && value !== undefined && value !== "" ? `${parseNum(value)}%` : "—",
      },
      {
        title: "Payment date",
        dataIndex: "paymentDate",
        width: 150,
        render: formatDate,
      },
      {
        title: "Planned",
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
        title: "Received",
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
        title: "Remaining",
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
        title: "Status",
        dataIndex: "status",
        width: 130,
        render: (value) => React.createElement(StatusBadge, { status: value }),
      },
      {
        title: "Auto PR",
        dataIndex: "linkedPaymentRequest",
        width: 120,
        render: (pr) =>
          pr
            ? React.createElement(PRStatusBadge, { status: pr.status })
            : React.createElement("span", { style: { color: C.muted, fontSize: 12 } }, "—"),
      },
    ];

    return React.createElement(AntTable, {
      rowKey: "id",
      size: "middle",
      pagination: false,
      columns: columnsConfig,
      dataSource: schedule.installments,
      scroll: { x: 1360 },
    });
  }

  const columns = "minmax(110px, 0.75fr) minmax(220px, 1.5fr) minmax(100px, 0.55fr) minmax(140px, 0.85fr) minmax(140px, 0.85fr) minmax(140px, 0.85fr) minmax(140px, 0.85fr) minmax(110px, 0.6fr) minmax(120px, 0.7fr)";
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
      { style: { minWidth: 1360 } },
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: columns } },
        React.createElement("div", { style: headerStyle }, "Installment"),
        React.createElement("div", { style: headerStyle }, "Content"),
        React.createElement("div", { style: { ...headerStyle, textAlign: "right" } }, "Payment %"),
        React.createElement("div", { style: headerStyle }, "Payment date"),
        React.createElement("div", { style: { ...headerStyle, textAlign: "right" } }, "Planned"),
        React.createElement("div", { style: { ...headerStyle, textAlign: "right" } }, "Received"),
        React.createElement("div", { style: { ...headerStyle, textAlign: "right" } }, "Remaining"),
        React.createElement("div", { style: headerStyle }, "Status"),
        React.createElement("div", { style: headerStyle }, "Auto PR"),
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
            row.label || `Installment ${row.installmentNo}`,
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
          React.createElement(
            "div",
            { style: cellStyle },
            row.linkedPaymentRequest
              ? React.createElement(PRStatusBadge, { status: row.linkedPaymentRequest.status })
              : React.createElement("span", { style: { color: C.muted, fontSize: 12 } }, "—"),
          ),
        ),
      ),
    ),
  );
};

const RetainerRule = ({ plan }) => {
  if (!plan) return null;
  const display = resolveActiveBillingPlanDisplay(plan);
  if (!display) return null;
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
    React.createElement("strong", { style: { color: C.text } }, "Retainer rule: "),
    display.displayText,
    display.nextPaymentDate
      ? React.createElement(
          "div",
          { style: { marginTop: 6 } },
          React.createElement("strong", { style: { color: C.text } }, "Next payment: "),
          formatDate(display.nextPaymentDate),
        )
      : null,
    plan.retainerCyclesBilled
      ? React.createElement(
          "div",
          { style: { marginTop: 6 } },
          React.createElement("strong", { style: { color: C.text } }, "Cycles billed: "),
          `${plan.retainerCyclesBilled}${plan.retainerTotalCycles ? ` / ${plan.retainerTotalCycles}` : ""}`,
        )
      : null,
  );
};

const PaymentScheduleDetailBlock = () => {
  const [record, setRecord] = useState(contextRecord);
  const [payments, setPayments] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lawyers, setLawyers] = useState([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestForm, setRequestForm] = useState({
    title: "",
    requestType: "create_payment",
    priority: "normal",
    assignedLawyerId: "",
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
    setPaymentRequests([]);
    setError("");

    if (!recordId) {
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    Promise.all([
      // Also re-fetch (for billingPlans) even when contextRecord already
      // has enough to render — contextRecord comes from the parent
      // block's own query, which has no reason to append billingPlans,
      // so relying on it here would silently show stale/absent retainer
      // state for every contract whose page didn't happen to fetch it.
      hasRenderableSchedule(localSchedule) && contextRecord?.billingPlans
        ? Promise.resolve(contextRecord)
        : fetchContract(recordId),
      listPaymentsByContract(recordId).catch((err) => {
        console.error("[ContractPaymentScheduleDetailBlock] fetch payments failed", err);
        if (mounted) setError("Could not load actual payment data.");
        return [];
      }),
      listPaymentRequestsByContract(recordId).catch((err) => {
        console.error("[ContractPaymentScheduleDetailBlock] fetch payment requests failed", err);
        return [];
      }),
    ])
      .then(([fresh, paymentRows, paymentRequestRows]) => {
        if (!mounted) return;
        setRecord(fresh || contextRecord);
        setPayments(paymentRows || []);
        setPaymentRequests(paymentRequestRows || []);
      })
      .catch((err) => {
        console.error("[ContractPaymentScheduleDetailBlock] fetch contract failed", err);
        if (mounted) {
          setRecord(contextRecord);
          setError("Could not load the contract's payment schedule.");
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
    () => applyPaymentSummary(normalizeSchedule(record || {}), payments, paymentRequests),
    [record, payments, paymentRequests],
  );
  const requestableItems = useMemo(
    () => buildRequestableItems(record || {}, schedule, payments),
    [record, schedule, payments],
  );

  const loadLawyers = async () => {
    if (lawyers.length) return lawyers;
    const rows = await listAny(LAWYER_RESOURCES, { pageSize: 500 }).catch(() => []);
    setLawyers(rows || []);
    return rows || [];
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
    await loadLawyers();
    setRequestForm((prev) => ({
      ...prev,
      title: buildDefaultPaymentRequestTitle(record || {}, prev.requestType),
      selectedItemKeys: rows.map((item) => item.key),
      // Default to 7 days from today every time the modal opens fresh —
      // not just on the component's first mount, since requestForm is
      // reused across open/close cycles without unmounting.
      dueDate: prev.dueDate || addDays(toDateInput(new Date()), 7),
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
    if (!requestForm.assignedLawyerId) {
      message?.warning?.("Please select an assignee to process this request.");
      return;
    }
    if (!requestForm.dueDate) {
      message?.warning?.("Please select a due date.");
      return;
    }

    const currentUser = getCurrentUser();
    const currentUserId = extractId(currentUser);
    const assignedLawyerId = extractId(requestForm.assignedLawyerId);
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
      assignedLawyerId,
      assignedLawyer: assignedLawyerId || undefined,
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
    ? `${schedule.installments.length} installments`
    : schedule.retainerRule?.enabled || schedule.mode === "recurring"
      ? "Recurring schedule"
      : "One-time payment";
  // By-case contracts with no installment schedule have nothing for
  // per-installment paidAmount/remainingAmount to sum from — fall back to
  // the contract-level total (mirrors buildRequestableItems's own
  // contract_balance fallback line above).
  const totalPaid = schedule.installments.length
    ? schedule.installments.reduce((sum, row) => sum + parseNum(row.paidAmount), 0)
    : paidContractTotal(payments);
  const totalRemaining = schedule.installments.length
    ? schedule.installments.reduce((sum, row) => sum + parseNum(row.remainingAmount), 0)
    : Math.max(parseNum(schedule.totalAmount) - paidContractTotal(payments), 0);
  // "Requested" = sum of every auto-created Payment Request that has moved
  // past "pending" (i.e. actually in accounting's pipeline, not just
  // scheduled/waiting) — distinct from "Received", which is real money.
  const totalRequested = paymentRequests
    .filter((pr) => REQUESTED_PR_STATUSES.includes(String(pr?.status || "")))
    .reduce((sum, pr) => sum + parseNum(pr?.requestedAmount), 0);
  const selectedRequestItems = requestableItems.filter((item) => (requestForm.selectedItemKeys || []).includes(item.key));
  const requestTotal = selectedRequestItems.reduce((sum, item) => sum + parseNum(item.requestedAmount), 0);
  const lawyerOptions = lawyers.map((lawyer) => ({
    value: extractId(lawyer),
    label: lawyerLabel(lawyer),
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
              fieldLabel("Title", true),
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
              fieldLabel("Assignee", true),
              AntSelect
                ? React.createElement(AntSelect, {
                    showSearch: true,
                    allowClear: true,
                    value: requestForm.assignedLawyerId || undefined,
                    placeholder: "Select lawyer",
                    optionFilterProp: "label",
                    onChange: (value) => setRequestField("assignedLawyerId", value || ""),
                    options: lawyerOptions,
                  })
                : React.createElement("input", {
                    value: requestForm.assignedLawyerId,
                    onChange: (event) => setRequestField("assignedLawyerId", event.target.value),
                  }),
            ),
            React.createElement(
              "label",
              { style: { display: "grid", gap: 6, fontSize: 13, color: C.text } },
              fieldLabel("Due date", true),
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
      // Informational content (schedule summary + stat pills) on the left,
      // the primary action button isolated at the top-right corner — was
      // previously crammed into the same right-aligned group as the pills,
      // making it look sandwiched between them instead of a standalone
      // action in the standard top-right position.
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
        React.createElement(
          "div",
          { style: { fontSize: 13, color: C.sub } },
          compact([countText, modeLabel(schedule.mode)]).join(" · "),
        ),
        React.createElement(SummaryPill, { label: "First payment date", value: formatDate(schedule.firstPaymentDate) }),
        React.createElement(SummaryPill, { label: "Requested", value: formatMoney(totalRequested) }),
        React.createElement(SummaryPill, { label: "Received", value: formatMoney(totalPaid) }),
        React.createElement(SummaryPill, { label: "Remaining", value: formatMoney(totalRemaining) }),
      ),
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
    React.createElement(RetainerRule, { plan: schedule.billingPlan }),
    requestModal,
  );
};

ctx.render(React.createElement(PaymentScheduleDetailBlock));
