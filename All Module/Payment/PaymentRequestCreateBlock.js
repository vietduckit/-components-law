const { React } = ctx;
const { useCallback, useEffect, useMemo, useRef, useState } = React;
const {
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Modal,
  Select,
  Spin,
  Table,
  Typography,
  message,
} = ctx.antd;

const CONTRACT_RESOURCES = ["contracts", "Contract", "contract"];
const PAYMENT_RESOURCES = ["payments", "Payment", "payment"];
const PAYMENT_REQUEST_RESOURCES = ["paymentRequests", "PaymentRequests", "payment_requests"];
const PAYMENT_REQUEST_ITEM_RESOURCES = ["paymentRequestItems", "PaymentRequestItems", "payment_request_items"];
const USER_RESOURCES = ["users"];

const MONEY_TOLERANCE = 0;
const ACTUAL_PAYMENT_STATUSES = ["received", "paid", "completed", "partial"];
const NON_ACTIVE_STATUSES = ["cancelled", "canceled", "void"];

const CONTRACT_TYPE_LABELS = {
  byCase: "By case",
  retainer: "Retainer",
};

const FEE_MODEL_LABELS = {
  fixed: "Fixed amount",
  hourly: "Hourly",
  monthlyRetainer: "Monthly retainer",
  successFee: "Success fee",
  hybrid: "Hybrid",
};

const BILLING_CYCLE_LABELS = {
  one_time: "One time",
  multiple_payments: "Multiple payments",
  monthly: "Monthly",
  quarterly: "Quarterly",
  milestone: "Milestone",
  manual: "Manual",
  recurring: "Recurring",
};

const PAYMENT_BASIS_LABELS = {
  schedule: "Payment schedule",
  contract_balance: "Contract balance",
  retainer_cycle: "Retainer cycle",
  fixed_fee: "Fixed amount",
  hourly_fee: "Hourly fee",
  success_fee: "Success fee",
  hybrid_fee: "Hybrid fee components",
};

const REQUEST_TYPE_LABELS = {
  create_payment: "Create payment",
  create_invoice: "Create invoice",
  create_invoice_and_payment: "Create invoice and payment",
  check_payment: "Check payment",
};

const LINE_TYPE_LABELS = {
  schedule_installment: "Installment",
  contract_balance: "Balance",
  retainer_cycle: "Retainer",
  fixed_fee: "Fixed",
  hourly_fee: "Hourly",
  success_fee: "Success fee",
};

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
    console.warn("[PaymentRequestCreateBlock] Invalid paymentSchedule JSON", error);
    return null;
  }
};

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();
const isActualPaidStatus = (status) => ACTUAL_PAYMENT_STATUSES.includes(normalizeStatus(status));
const isInactiveStatus = (status) => NON_ACTIVE_STATUSES.includes(normalizeStatus(status));

const formatMoney = (value) => {
  const n = parseNum(value);
  return `${Math.round(n).toLocaleString("vi-VN")} VND`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const normalized =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00`
      : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("vi-VN");
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

const normalizeModeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const normalizeContractType = (value) => {
  const key = normalizeModeKey(value);
  if (key === "bycase" || key === "by_case" || key === "case") return "byCase";
  if (key === "retainer") return "retainer";
  return key || "";
};

const normalizeFeeModel = (value) => {
  const key = normalizeModeKey(value);
  if (key === "monthly_retainer" || key === "monthlyretainer" || key === "retainer") return "monthlyRetainer";
  if (key === "success_fee" || key === "successfee") return "successFee";
  if (key === "fixed_amount" || key === "fixedamount") return "fixed";
  return key || "";
};

const normalizeBillingCycle = (value) => {
  const key = normalizeModeKey(value);
  if (key === "multiplepayments" || key === "multiple_payment") return "multiple_payments";
  if (key === "onetime" || key === "one_time_payment") return "one_time";
  return key || "";
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
  ]).join(" - ") || (record?.id ? `Contract #${record.id}` : "-");

const buildDefaultPaymentRequestTitle = (contract, paymentBasis, requestType) =>
  compact([
    REQUEST_TYPE_LABELS[requestType] || "Payment request",
    contractLabel(contract),
    PAYMENT_BASIS_LABELS[paymentBasis] || paymentBasis,
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
      console.warn("[PaymentRequestCreateBlock] get model failed", error);
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
    console.warn("[PaymentRequestCreateBlock] refresh failed", error);
  }
  return false;
};

const closeCurrentPopup = () => {
  const calls = [
    [ctx.view, "close", []],
    [ctx, "onClose", []],
    [ctx, "close", []],
    [ctx.popup, "onClose", []],
    [ctx.popup, "close", []],
    [ctx.popup, "closeModal", []],
    [ctx.modal, "onClose", []],
    [ctx.modal, "close", []],
    [ctx.drawer, "onClose", []],
    [ctx.drawer, "close", []],
    [ctx.action, "onClose", []],
    [ctx.action, "close", []],
    [ctx.popup, "setVisible", [false]],
    [ctx.modal, "setVisible", [false]],
    [ctx.modal, "setOpen", [false]],
    [ctx.drawer, "setOpen", [false]],
  ];

  for (const [target, method, args] of calls) {
    if (target && typeof target[method] === "function") {
      try {
        target[method](...(args || []));
        return true;
      } catch (error) {
        console.warn("[PaymentRequestCreateBlock] close popup failed", error);
      }
    }
  }
  return false;
};

const closePopupAfterSubmit = async () => {
  await refreshNocoBaseDataBlocks();
  return closeCurrentPopup();
};

const showDiscardConfirm = (onOk) => {
  if (showDiscardConfirm._open) return;
  const run = async () => {
    try {
      await onOk?.();
    } catch (error) {
      console.warn("[PaymentRequestCreateBlock] discard close failed", error);
    } finally {
      showDiscardConfirm._open = false;
    }
  };

  if (Modal?.confirm) {
    showDiscardConfirm._open = true;
    Modal.confirm({
      title: "Discard payment request?",
      content: "Changes in this payment request form will be lost if you close it.",
      okText: "Discard",
      cancelText: "Keep editing",
      okButtonProps: { danger: true },
      maskClosable: false,
      onCancel: () => {
        showDiscardConfirm._open = false;
      },
      onOk: run,
    });
    return;
  }

  run();
};

const configureGuardedModalClose = (requestClose) => {
  if (typeof requestClose !== "function") return;
  const restoreFns = [];
  const props = {
    maskClosable: true,
    keyboard: false,
    onCancel: requestClose,
    onClose: requestClose,
  };

  [
    [ctx.view, "setProps"],
    [ctx.view, "setOptions"],
    [ctx.popup, "setProps"],
    [ctx.popup, "setOptions"],
    [ctx.modal, "setProps"],
    [ctx.modal, "setOptions"],
    [ctx.drawer, "setProps"],
    [ctx.drawer, "setOptions"],
    [ctx.action, "setProps"],
  ].forEach(([target, method]) => {
    if (!target || typeof target[method] !== "function") return;
    try {
      target[method](props);
    } catch (error) {
      console.warn("[PaymentRequestCreateBlock] configure modal close failed", error);
    }
  });

  const patchMethod = (target, method) => {
    if (!target || typeof target[method] !== "function") return;
    const original = target[method];
    const patchedClose = function patchedClose(...args) {
      const isSetter = method === "setVisible" || method === "setOpen";
      if (isSetter && args[0] !== false) return original.apply(this, args);
      requestClose(() => original.apply(this, args));
      return undefined;
    };
    try {
      target[method] = patchedClose;
    } catch (error) {
      console.warn("[PaymentRequestCreateBlock] patch close failed", error);
      return;
    }
    restoreFns.push(() => {
      if (target[method] !== patchedClose) return;
      try {
        target[method] = original;
      } catch {}
    });
  };

  [ctx.view, ctx.popup, ctx.modal, ctx.drawer, ctx.action, ctx].forEach((target) => {
    ["onClose", "close", "closeModal", "setVisible", "setOpen"].forEach((method) => patchMethod(target, method));
  });

  return () => {
    restoreFns.forEach((restore) => {
      try {
        restore();
      } catch {}
    });
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

const listAny = async (resources, params = {}) => {
  const res = await apiRequestAny(resources, "list", { params });
  return unwrapList(res);
};

const getAny = async (resources, id, params = {}) => {
  if (!id) return null;
  const res = await apiRequestAny(resources, "get", {
    params: { filterByTk: id, ...params },
  });
  return unwrapRecord(res);
};

const createAny = async (resources, data) => {
  const res = await apiRequestAny(resources, "create", {
    method: "POST",
    data,
  });
  return unwrapRecord(res);
};

const createWithPayloadFallback = async (resources, payloadVariants = []) => {
  let lastError = null;
  for (const payload of payloadVariants) {
    try {
      return await createAny(resources, cleanPayload(payload));
    } catch (error) {
      lastError = error;
      console.warn("[PaymentRequestCreateBlock] create fallback failed", error);
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
    return await listAny(PAYMENT_RESOURCES, params);
  } catch (error) {
    return listAny(PAYMENT_RESOURCES, {
      pageSize: 1000,
      filter: JSON.stringify({ contractId: { $eq: contractId } }),
    });
  }
};

const installmentAmountFromPercent = (percentage, baseAmount) => {
  const percent = parseNum(percentage);
  const base = parseNum(baseAmount);
  if (percent <= 0 || base <= 0) return 0;
  return Math.round(base * percent / 100);
};

const normalizeSchedule = (contract) => {
  const raw = safeJsonParse(contract?.paymentSchedule);
  if (!raw) return { mode: normalizeModeKey(contract?.billingCycle), firstPaymentDate: contract?.paymentDate || "", retainerRule: null, totalAmount: parseNum(contract?.totalAmount), installments: [] };
  const schedule = Array.isArray(raw)
    ? { mode: contract?.billingCycle || "multiple_payments", firstPaymentDate: raw[0]?.paymentDate || raw[0]?.dueDate || contract?.paymentDate || "", installments: raw }
    : raw;
  const baseAmount = parseNum(schedule.baseAmount ?? schedule.totalAmount ?? contract?.totalAmount);
  let runningTotal = 0;
  const installments = (Array.isArray(schedule.installments) ? schedule.installments : [])
    .map((row, index) => {
      const percentage = row?.percentage ?? null;
      const amount =
        parseNum(row?.amount ?? row?.totalAmount ?? row?.paymentAmount) ||
        installmentAmountFromPercent(percentage, baseAmount);
      const cumulativeTotal = parseNum(row?.cumulativeTotal) || runningTotal + amount;
      runningTotal = cumulativeTotal;
      return {
        id: row?.id || `payment-${index + 1}`,
        scheduleItemId: row?.scheduleItemId || row?.id || `payment-${index + 1}`,
        installmentNo: row?.installmentNo || row?.sortOrder || index + 1,
        label: row?.label || row?.installmentLabel || row?.installment || `Installment ${index + 1}`,
        content: row?.content || row?.description || row?.note || row?.timingNote || "",
        paymentDate: row?.paymentDate || row?.dueDate || row?.date || row?.timing || "",
        amount,
        cumulativeTotal,
        percentage,
        status: row?.status || "planned",
      };
    })
    .filter((row) => row.content || row.paymentDate || row.amount > 0 || row.label);

  const retainerRule = schedule?.retainerRule
    ? {
        ...schedule.retainerRule,
        nextPaymentDate:
          normalizeDateInput(schedule.retainerRule.nextPaymentDate) ||
          calcRetainerNextPaymentDate(
            schedule.firstPaymentDate || contract?.paymentDate,
            schedule.retainerRule.interval || contract?.retainerDuration,
            schedule.retainerRule.unit || contract?.retainerRepeatUnit || contract?.retainerPeriod,
          ),
      }
    : null;

  return {
    mode: normalizeModeKey(schedule.mode || contract?.billingCycle),
    firstPaymentDate: schedule.firstPaymentDate || contract?.paymentDate || "",
    retainerRule,
    totalAmount: parseNum(schedule.totalAmount ?? contract?.totalAmount),
    baseAmount,
    installments,
  };
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
      return {
        ...row,
        paidAmount,
        remainingAmount,
      };
    }),
  };
};

const paidContractTotal = (payments = []) =>
  (payments || []).reduce((sum, payment) => {
    if (isInactiveStatus(payment?.paymentStatus) || !isActualPaidStatus(payment?.paymentStatus)) return sum;
    return sum + parseNum(payment?.amount);
  }, 0);

const contractMoneyInfo = (contract = {}, payments = []) => {
  const feeModel = normalizeFeeModel(contract?.feeModel);
  const directFixedAmount = parseNum(firstPresent(contract, ["fixedAmount", "packageTotalAmount"]));
  const hourlyRate = parseNum(firstPresent(contract, ["hourlyRate", "rate"]));
  const estimatedHours = parseNum(firstPresent(contract, ["estimatedHours", "hours"]));
  const hourlyAmount = hourlyRate > 0 && estimatedHours > 0 ? Math.round(hourlyRate * estimatedHours) : 0;
  const successFee = parseNum(firstPresent(contract, ["successFee"]));
  const subTotal = parseNum(firstPresent(contract, ["subTotal", "packageSubTotal"]));
  const vatAmount = parseNum(firstPresent(contract, ["vatAmount", "packageVatAmount"]));
  const totalAmount =
    parseNum(firstPresent(contract, ["totalAmount", "packageTotalAmount", "grandTotal"])) ||
    directFixedAmount ||
    hourlyAmount + successFee;
  const fixedAmount =
    directFixedAmount ||
    (feeModel === "fixed" || feeModel === "monthlyRetainer" ? totalAmount : 0);
  const paidAmount = paidContractTotal(payments);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  return {
    fixedAmount,
    hourlyRate,
    estimatedHours,
    hourlyAmount,
    successFee,
    subTotal,
    vatAmount,
    totalAmount,
    paidAmount,
    remainingAmount,
  };
};

const contractProfile = (contract = {}, schedule = null) => {
  const contractType = normalizeContractType(contract?.contractType) || (schedule?.retainerRule?.enabled ? "retainer" : "byCase");
  const feeModel = normalizeFeeModel(contract?.feeModel) || (contractType === "retainer" ? "monthlyRetainer" : "fixed");
  const billingCycle = normalizeBillingCycle(schedule?.mode || contract?.billingCycle) || (contractType === "retainer" ? "recurring" : "one_time");
  return { contractType, feeModel, billingCycle };
};

const feeComponentItems = (contract, schedule, payments, basis) => {
  const { fixedAmount, hourlyRate, estimatedHours, hourlyAmount, successFee, paidAmount } = contractMoneyInfo(contract, payments);
  const profile = contractProfile(contract, schedule);
  const paymentDate = schedule?.firstPaymentDate || contract?.paymentDate || "";
  const items = [];

  const pushItem = (key, lineType, label, amount, description) => {
    if (parseNum(amount) <= MONEY_TOLERANCE) return;
    items.push({
      key,
      lineType,
      scheduleItemId: key,
      installmentNo: null,
      lineLabel: label,
      description,
      plannedPaymentDate: paymentDate,
      requestedAmount: parseNum(amount),
      paidAmountSnapshot: basis === "contract_balance" ? paidAmount : 0,
      remainingAmountSnapshot: parseNum(amount),
      sourceSnapshot: {
        paymentBasis: basis,
        contractType: profile.contractType,
        feeModel: profile.feeModel,
        billingCycle: profile.billingCycle,
        fixedAmount,
        hourlyRate,
        estimatedHours,
        hourlyAmount,
        successFee,
      },
    });
  };

  if (basis === "fixed_fee" || basis === "hybrid_fee") {
    pushItem("fixed_fee", "fixed_fee", "Fixed amount", fixedAmount, "Fixed fee from contract.");
  }
  if (basis === "hourly_fee" || basis === "hybrid_fee") {
    pushItem(
      "hourly_fee",
      "hourly_fee",
      "Hourly fee",
      hourlyAmount,
      hourlyRate && estimatedHours
        ? `${formatMoney(hourlyRate)} x ${estimatedHours} hours`
        : "Hourly fee from contract.",
    );
  }
  if (basis === "success_fee" || basis === "hybrid_fee") {
    pushItem("success_fee", "success_fee", "Success fee", successFee, "Success fee from contract.");
  }

  return items;
};

const retainerCycleAmount = (contract = {}, schedule = null) => {
  const fixed = parseNum(firstPresent(contract, ["fixedAmount", "monthlyFee", "packageTotalAmount"]));
  const scheduleAmount = parseNum(schedule?.baseAmount || schedule?.totalAmount);
  const total = parseNum(firstPresent(contract, ["totalAmount", "packageTotalAmount"]));
  return fixed || scheduleAmount || total;
};

const retainerCycleItem = (contract, schedule, payments) => {
  const amount = retainerCycleAmount(contract, schedule);
  if (amount <= MONEY_TOLERANCE) return [];
  const profile = contractProfile(contract, schedule);
  const plannedDate =
    schedule?.retainerRule?.nextPaymentDate ||
    schedule?.firstPaymentDate ||
    contract?.paymentDate ||
    "";
  return [
    {
      key: "retainer_cycle",
      lineType: "retainer_cycle",
      scheduleItemId: "retainer_cycle",
      installmentNo: null,
      lineLabel: "Retainer cycle",
      description: schedule?.retainerRule?.displayText || "Recurring retainer payment.",
      plannedPaymentDate: plannedDate,
      requestedAmount: amount,
      paidAmountSnapshot: paidContractTotal(payments),
      remainingAmountSnapshot: amount,
      sourceSnapshot: {
        paymentBasis: "retainer_cycle",
        contractType: profile.contractType,
        feeModel: profile.feeModel,
        billingCycle: profile.billingCycle,
        retainerRule: schedule?.retainerRule || null,
        firstPaymentDate: schedule?.firstPaymentDate || contract?.paymentDate || "",
        totalAmount: amount,
      },
    },
  ];
};

const contractBalanceItem = (contract, schedule, payments) => {
  const money = contractMoneyInfo(contract, payments);
  if (money.remainingAmount <= MONEY_TOLERANCE) return [];
  const profile = contractProfile(contract, schedule);
  return [
    {
      key: "contract_balance",
      lineType: "contract_balance",
      scheduleItemId: "contract_balance",
      installmentNo: null,
      lineLabel: "Contract balance",
      description: "Remaining amount after existing received payments.",
      plannedPaymentDate: schedule?.firstPaymentDate || contract?.paymentDate || "",
      requestedAmount: money.remainingAmount,
      paidAmountSnapshot: money.paidAmount,
      remainingAmountSnapshot: money.remainingAmount,
      sourceSnapshot: {
        paymentBasis: "contract_balance",
        contractType: profile.contractType,
        feeModel: profile.feeModel,
        billingCycle: profile.billingCycle,
        totalAmount: money.totalAmount,
        paidAmount: money.paidAmount,
        remainingAmount: money.remainingAmount,
        subTotal: money.subTotal,
        vatAmount: money.vatAmount,
      },
    },
  ];
};

const scheduleInstallmentItems = (contract, schedule) =>
  (schedule?.installments || [])
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
        paymentBasis: "schedule",
        scheduleItemId: row.scheduleItemId || row.id || "",
        installmentNo: row.installmentNo || null,
        label: row.label || "",
        content: row.content || "",
        plannedPaymentDate: row.paymentDate || "",
        amount: parseNum(row.amount),
        paidAmount: parseNum(row.paidAmount),
        remainingAmount: parseNum(row.remainingAmount ?? row.amount),
        percentage: row.percentage ?? null,
        contractType: contractProfile(contract, schedule).contractType,
        feeModel: contractProfile(contract, schedule).feeModel,
        billingCycle: contractProfile(contract, schedule).billingCycle,
      },
    }));

const availablePaymentBasisOptions = (contract = {}, schedule = null, payments = []) => {
  if (!contract) return [];
  const profile = contractProfile(contract, schedule);
  const money = contractMoneyInfo(contract, payments);
  const hasScheduleRows = scheduleInstallmentItems(contract, schedule).length > 0;
  const components = feeComponentItems(contract, schedule, payments, "hybrid_fee");
  const options = [];

  if (hasScheduleRows) options.push("schedule");
  if (profile.contractType === "retainer") options.push("retainer_cycle");
  if (money.remainingAmount > MONEY_TOLERANCE) options.push("contract_balance");
  if (money.fixedAmount > MONEY_TOLERANCE) options.push("fixed_fee");
  if (money.hourlyAmount > MONEY_TOLERANCE) options.push("hourly_fee");
  if (money.successFee > MONEY_TOLERANCE) options.push("success_fee");
  if (components.length > 1) options.push("hybrid_fee");

  return Array.from(new Set(options)).map((value) => ({
    value,
    label: PAYMENT_BASIS_LABELS[value] || value,
  }));
};

const recommendedPaymentBasis = (contract = {}, schedule = null, payments = []) => {
  const profile = contractProfile(contract, schedule);
  const money = contractMoneyInfo(contract, payments);
  const options = availablePaymentBasisOptions(contract, schedule, payments).map((item) => item.value);
  if (profile.contractType === "retainer" && options.includes("retainer_cycle")) return "retainer_cycle";
  if (profile.billingCycle === "multiple_payments" && options.includes("schedule")) return "schedule";
  if (money.paidAmount > MONEY_TOLERANCE && options.includes("contract_balance")) return "contract_balance";
  if (profile.feeModel === "hybrid" && options.includes("hybrid_fee")) return "hybrid_fee";
  if (profile.feeModel === "successFee" && options.includes("success_fee")) return "success_fee";
  if (profile.feeModel === "hourly" && options.includes("hourly_fee")) return "hourly_fee";
  if (profile.feeModel === "fixed" && options.includes("fixed_fee")) return "fixed_fee";
  return options[0] || "contract_balance";
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

const buildRequestableItems = (contract, schedule, payments = [], paymentBasis = "") => {
  if (!contract) return [];
  const basis = paymentBasis || recommendedPaymentBasis(contract, schedule, payments);
  if (basis === "schedule") return scheduleInstallmentItems(contract, schedule);
  if (basis === "retainer_cycle") return retainerCycleItem(contract, schedule, payments);
  if (basis === "contract_balance") return contractBalanceItem(contract, schedule, payments);
  if (basis === "fixed_fee" || basis === "hourly_fee" || basis === "success_fee" || basis === "hybrid_fee") {
    return feeComponentItems(contract, schedule, payments, basis);
  }

  const recommended = recommendedPaymentBasis(contract, schedule, payments);
  if (recommended && recommended !== basis) {
    return buildRequestableItems(contract, schedule, payments, recommended);
  }
  return contractBalanceItem(contract, schedule, payments);
};

const buildRequestSnapshot = (contract, schedule, items) => {
  const customer = relationRecord(contract?.customers) || relationRecord(contract?.customer);
  const company = relationRecord(contract?.internalCompany) || relationRecord(contract?.companies);
  const profile = contractProfile(contract, schedule);
  return {
    contractId: resolveContractId(contract),
    contractCode: firstPresent(contract, ["contractCode", "contractNumber", "code"]),
    contractName: firstPresent(contract, ["contractName", "name", "title"]),
    contractLabel: contractLabel(contract),
    customerId: resolveCustomerId(contract),
    customerName: customerLabel(customer) || firstPresent(contract, ["customerName"]),
    internalCompanyId: resolveInternalCompanyId(contract),
    internalCompanyName: firstPresent(company, ["shortName", "companyName", "name"]),
    mode: schedule?.mode || "",
    contractType: profile.contractType,
    feeModel: profile.feeModel,
    billingCycle: profile.billingCycle,
    firstPaymentDate: schedule?.firstPaymentDate || "",
    totalAmount: parseNum(schedule?.totalAmount || contract?.totalAmount),
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

const recordIdFromUrl = () => {
  const path = String(window.location.pathname || "");
  const match = path.match(/\/filterbytk\/([^/?#]+)/i);
  return match ? extractId(decodeURIComponent(match[1])) : null;
};

const seedContractId =
  extractId(contextRecord?.contractId) ||
  extractId(contextRecord?.contracts) ||
  extractId(contextRecord?.id) ||
  extractId(ctx.view?.inputArgs?.contractId) ||
  extractId(ctx.popup?.params?.contractId) ||
  extractId(ctx.params?.contractId) ||
  recordIdFromUrl();

const PaymentRequestCreateBlock = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractPayments, setContractPayments] = useState([]);
  const [form, setForm] = useState({
    contractId: seedContractId || "",
    title: "",
    requestType: "create_payment",
    paymentBasis: "",
    priority: "normal",
    assignedToId: "",
    dueDate: "",
    requestNote: "",
    selectedItemKeys: [],
  });
  const isDirtyRef = useRef(false);

  const schedule = useMemo(
    () => applyPaymentSummary(normalizeSchedule(selectedContract || {}), contractPayments),
    [selectedContract, contractPayments],
  );
  const requestableItems = useMemo(
    () => buildRequestableItems(selectedContract || {}, schedule, contractPayments, form.paymentBasis),
    [selectedContract, schedule, contractPayments, form.paymentBasis],
  );
  const basisOptions = useMemo(
    () => availablePaymentBasisOptions(selectedContract || {}, schedule, contractPayments),
    [selectedContract, schedule, contractPayments],
  );
  const profile = useMemo(
    () => contractProfile(selectedContract || {}, schedule),
    [selectedContract, schedule],
  );
  const moneyInfo = useMemo(
    () => contractMoneyInfo(selectedContract || {}, contractPayments),
    [selectedContract, contractPayments],
  );
  const selectedItems = requestableItems.filter((item) => (form.selectedItemKeys || []).includes(item.key));
  const requestTotal = selectedItems.reduce((sum, item) => sum + parseNum(item.requestedAmount), 0);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
  }, []);

  const forceClose = useCallback((nativeClose) => {
    isDirtyRef.current = false;
    if (typeof nativeClose === "function") {
      nativeClose();
      return;
    }
    closeCurrentPopup();
  }, []);

  const requestClose = useCallback(
    (nativeClose) => {
      if (saving) return;
      if (!isDirtyRef.current) {
        forceClose(nativeClose);
        return;
      }
      showDiscardConfirm(() => {
        forceClose(nativeClose);
      });
    },
    [forceClose, saving],
  );

  useEffect(() => {
    return configureGuardedModalClose(requestClose);
  }, [requestClose]);

  const setF = (key, value, dirty = true) => {
    if (dirty) markDirty();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadContractContext = async (contractId, contractList = contracts, dirty = true) => {
    if (dirty) markDirty();
    const safeId = extractId(contractId);
    if (!safeId) {
      setSelectedContract(null);
      setContractPayments([]);
      setF("contractId", "", false);
      setF("paymentBasis", "", false);
      setF("selectedItemKeys", [], false);
      return;
    }
    setF("contractId", safeId, false);
    setLoading(true);
    try {
      const fromList = (contractList || []).find((item) => String(extractId(item)) === String(safeId));
      const contract = fromList || await getAny(CONTRACT_RESOURCES, safeId, { appends: ["customers", "internalCompany"] });
      const payments = await listPaymentsByContract(safeId).catch(() => []);
      const nextSchedule = applyPaymentSummary(normalizeSchedule(contract || {}), payments || []);
      const nextBasis = recommendedPaymentBasis(contract || {}, nextSchedule, payments || []);
      const nextItems = buildRequestableItems(contract || {}, nextSchedule, payments || [], nextBasis);
      setSelectedContract(contract || null);
      setContractPayments(payments || []);
      setForm((prev) => ({
        ...prev,
        contractId: safeId,
        title: buildDefaultPaymentRequestTitle(contract || {}, nextBasis, prev.requestType),
        paymentBasis: nextBasis,
        selectedItemKeys: nextItems.map((item) => item.key),
      }));
    } catch (error) {
      console.error("[PaymentRequestCreateBlock] load contract failed", error);
      message.error("Could not load contract payment schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      listAny(CONTRACT_RESOURCES, { pageSize: 500, sort: ["-createdAt"], appends: ["customers", "internalCompany"] }).catch(() => []),
      listAny(USER_RESOURCES, { pageSize: 500 }).catch(() => []),
    ])
      .then(async ([contractRows, userRows]) => {
        if (!mounted) return;
        const safeContracts = contractRows || [];
        setContracts(safeContracts);
        setUsers((userRows || []).filter((user) => extractId(user) !== 1));
        if (seedContractId) {
          await loadContractContext(seedContractId, safeContracts, false);
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("[PaymentRequestCreateBlock] initial load failed", error);
        if (mounted) {
          message.error("Could not load payment request form data.");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleItem = (key, checked) => {
    setForm((prev) => {
      const current = new Set(prev.selectedItemKeys || []);
      if (checked) current.add(key);
      else current.delete(key);
      return { ...prev, selectedItemKeys: Array.from(current) };
    });
  };

  const handleBasisChange = (value) => {
    markDirty();
    const nextItems = buildRequestableItems(selectedContract || {}, schedule, contractPayments, value);
    setForm((prev) => ({
      ...prev,
      paymentBasis: value,
      title: prev.title || buildDefaultPaymentRequestTitle(selectedContract || {}, value, prev.requestType),
      selectedItemKeys: nextItems.map((item) => item.key),
    }));
  };

  const submit = async () => {
    if (!selectedContract) {
      message.warning("Please select a contract.");
      return;
    }
    if (!String(form.title || "").trim()) {
      message.warning("Please enter a payment request title.");
      return;
    }
    if (!form.assignedToId) {
      message.warning("Please select an assignee.");
      return;
    }
    if (!selectedItems.length) {
      message.warning("Please select at least one request line.");
      return;
    }

    const currentUser = getCurrentUser();
    const currentUserId = extractId(currentUser);
    const assignedToId = extractId(form.assignedToId);
    const contractId = resolveContractId(selectedContract);
    const customerId = resolveCustomerId(selectedContract);
    const internalCompanyId = resolveInternalCompanyId(selectedContract);
    const sourceSnapshot = {
      ...buildRequestSnapshot(selectedContract, schedule, selectedItems),
      paymentBasis: form.paymentBasis || recommendedPaymentBasis(selectedContract, schedule, contractPayments),
      paymentBasisLabel: PAYMENT_BASIS_LABELS[form.paymentBasis] || form.paymentBasis || "",
    };

    const requestPayload = {
      title: String(form.title || "").trim(),
      requestType: form.requestType,
      status: "submitted",
      priority: form.priority,
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
      dueDate: form.dueDate || null,
      requestedAmount: requestTotal,
      approvedAmount: null,
      currency: "VND",
      requestNote: form.requestNote || null,
      sourceSnapshot,
    };

    setSaving(true);
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

      message.success("Payment request created.");
      isDirtyRef.current = false;
      setForm((prev) => ({
        ...prev,
        title: "",
        requestNote: "",
        selectedItemKeys: [],
      }));
      await closePopupAfterSubmit();
    } catch (error) {
      console.error("[PaymentRequestCreateBlock] submit failed", error);
      message.error(error?.message || "Could not create payment request.");
    } finally {
      setSaving(false);
    }
  };

  const contractOptions = contracts.map((contract) => ({
    value: extractId(contract),
    label: contractLabel(contract),
  }));
  const userOptions = users.map((user) => ({
    value: extractId(user),
    label: userLabel(user),
  }));

  if (loading && !selectedContract) {
    return React.createElement(
      "div",
      { style: { padding: 24, textAlign: "center" } },
      React.createElement(Spin, null),
    );
  }

  const requestLines = Table
    ? React.createElement(Table, {
        rowKey: "key",
        size: "small",
        pagination: false,
        dataSource: requestableItems,
        rowSelection: {
          selectedRowKeys: form.selectedItemKeys || [],
          onChange: (keys) => setF("selectedItemKeys", keys),
        },
        columns: [
          {
            title: "Line",
            dataIndex: "lineLabel",
            render: (value, row) =>
              React.createElement(
                "div",
                null,
                React.createElement("strong", null, value),
                row.description
                  ? React.createElement("div", { style: { color: "rgba(0,0,0,0.45)", fontSize: 12 } }, row.description)
                  : null,
              ),
          },
          {
            title: "Basis",
            dataIndex: "lineType",
            width: 120,
            render: (value) => LINE_TYPE_LABELS[value] || String(value || "").replace(/_/g, " "),
          },
          { title: "Due date", dataIndex: "plannedPaymentDate", width: 130, render: formatDate },
          { title: "Paid", dataIndex: "paidAmountSnapshot", width: 130, align: "right", render: formatMoney },
          { title: "Request amount", dataIndex: "requestedAmount", width: 160, align: "right", render: formatMoney },
        ],
      })
    : React.createElement(
        "div",
        { style: { display: "grid", gap: 8 } },
        requestableItems.map((item) =>
          React.createElement(
            "label",
            { key: item.key, style: { display: "flex", alignItems: "center", gap: 8 } },
            React.createElement(Checkbox, {
              checked: (form.selectedItemKeys || []).includes(item.key),
              onChange: (event) => toggleItem(item.key, event.target.checked),
            }),
            React.createElement("span", { style: { flex: 1 } }, item.lineLabel),
            React.createElement("strong", null, formatMoney(item.requestedAmount)),
          ),
        ),
      );

  return React.createElement(
    Card,
    {
      title: "Create payment request",
      bordered: true,
      style: { width: "100%" },
    },
    React.createElement(
      "div",
      { style: { display: "grid", gap: 16 } },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          },
        },
        React.createElement(
          "label",
          { style: { display: "grid", gap: 6, gridColumn: "1 / -1" } },
          "Title",
          React.createElement(Input, {
            value: form.title,
            placeholder: "Enter payment request title",
            onChange: (event) => setF("title", event.target.value),
          }),
        ),
        React.createElement(
          "label",
          { style: { display: "grid", gap: 6 } },
          "Contract",
          React.createElement(Select, {
            showSearch: true,
            allowClear: true,
            value: form.contractId || undefined,
            placeholder: "Select contract",
            optionFilterProp: "label",
            options: contractOptions,
            onChange: (value) => loadContractContext(value),
          }),
        ),
        React.createElement(
          "label",
          { style: { display: "grid", gap: 6 } },
          "Payment basis",
          React.createElement(Select, {
            value: form.paymentBasis || undefined,
            placeholder: "Auto after selecting contract",
            disabled: !selectedContract || !basisOptions.length,
            options: basisOptions,
            onChange: handleBasisChange,
          }),
        ),
        React.createElement(
          "label",
          { style: { display: "grid", gap: 6 } },
          "Request type",
          React.createElement(Select, {
            value: form.requestType,
            options: [
              { value: "create_payment", label: REQUEST_TYPE_LABELS.create_payment },
              { value: "create_invoice", label: REQUEST_TYPE_LABELS.create_invoice },
              { value: "create_invoice_and_payment", label: REQUEST_TYPE_LABELS.create_invoice_and_payment },
              { value: "check_payment", label: REQUEST_TYPE_LABELS.check_payment },
            ],
            onChange: (value) =>
              {
                markDirty();
                setForm((prev) => ({
                  ...prev,
                  requestType: value,
                  title: prev.title || buildDefaultPaymentRequestTitle(selectedContract || {}, prev.paymentBasis, value),
                }));
              },
          }),
        ),
        React.createElement(
          "label",
          { style: { display: "grid", gap: 6 } },
          "Assignee",
          React.createElement(Select, {
            showSearch: true,
            allowClear: true,
            value: form.assignedToId || undefined,
            placeholder: "Select user",
            optionFilterProp: "label",
            options: userOptions,
            onChange: (value) => setF("assignedToId", value || ""),
          }),
        ),
        React.createElement(
          "label",
          { style: { display: "grid", gap: 6 } },
          "Priority",
          React.createElement(Select, {
            value: form.priority,
            options: [
              { value: "low", label: "Low" },
              { value: "normal", label: "Normal" },
              { value: "high", label: "High" },
              { value: "urgent", label: "Urgent" },
            ],
            onChange: (value) => setF("priority", value),
          }),
        ),
        React.createElement(
          "label",
          { style: { display: "grid", gap: 6 } },
          "Due date",
          React.createElement(Input, {
            type: "date",
            value: form.dueDate,
            onChange: (event) => setF("dueDate", event.target.value),
          }),
        ),
      ),
      selectedContract
        ? React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
                padding: 12,
                border: "1px solid #f0f0f0",
                borderRadius: 6,
                background: "#fafafa",
              },
            },
            React.createElement("div", null, React.createElement(Typography.Text, { type: "secondary" }, "Contract"), React.createElement("div", { style: { fontWeight: 600 } }, contractLabel(selectedContract))),
            React.createElement("div", null, React.createElement(Typography.Text, { type: "secondary" }, "Client"), React.createElement("div", { style: { fontWeight: 600 } }, customerLabel(relationRecord(selectedContract.customers) || relationRecord(selectedContract.customer)) || "-")),
            React.createElement("div", null, React.createElement(Typography.Text, { type: "secondary" }, "Contract type"), React.createElement("div", { style: { fontWeight: 600 } }, CONTRACT_TYPE_LABELS[profile.contractType] || profile.contractType || "-")),
            React.createElement("div", null, React.createElement(Typography.Text, { type: "secondary" }, "Fee model"), React.createElement("div", { style: { fontWeight: 600 } }, FEE_MODEL_LABELS[profile.feeModel] || profile.feeModel || "-")),
            React.createElement("div", null, React.createElement(Typography.Text, { type: "secondary" }, "Billing cycle"), React.createElement("div", { style: { fontWeight: 600 } }, BILLING_CYCLE_LABELS[profile.billingCycle] || profile.billingCycle || "-")),
            React.createElement("div", null, React.createElement(Typography.Text, { type: "secondary" }, "Contract total"), React.createElement("div", { style: { fontWeight: 700 } }, formatMoney(moneyInfo.totalAmount))),
            React.createElement("div", null, React.createElement(Typography.Text, { type: "secondary" }, "Paid"), React.createElement("div", { style: { fontWeight: 600 } }, formatMoney(moneyInfo.paidAmount))),
            React.createElement("div", null, React.createElement(Typography.Text, { type: "secondary" }, "Remaining"), React.createElement("div", { style: { fontWeight: 700 } }, formatMoney(moneyInfo.remainingAmount))),
            React.createElement("div", null, React.createElement(Typography.Text, { type: "secondary" }, "Selected basis"), React.createElement("div", { style: { fontWeight: 700 } }, PAYMENT_BASIS_LABELS[form.paymentBasis] || "-")),
            React.createElement("div", null, React.createElement(Typography.Text, { type: "secondary" }, "Request amount"), React.createElement("div", { style: { fontWeight: 700, color: "#1677ff" } }, formatMoney(requestTotal))),
          )
        : null,
      selectedContract
        ? requestableItems.length
          ? requestLines
          : React.createElement(Empty, { description: "No payable schedule lines" })
        : React.createElement(Empty, { description: "Select a contract to load payment schedule" }),
      React.createElement(
        "label",
        { style: { display: "grid", gap: 6 } },
        "Note",
        React.createElement(Input.TextArea, {
          rows: 3,
          value: form.requestNote,
          placeholder: "Add payment request note...",
          onChange: (event) => setF("requestNote", event.target.value),
        }),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
        React.createElement(
          Button,
          {
            type: "primary",
            loading: saving,
            disabled: !selectedContract || !requestableItems.length,
            onClick: submit,
          },
          "Create request",
        ),
      ),
    ),
  );
};

ctx.render(React.createElement(PaymentRequestCreateBlock));
