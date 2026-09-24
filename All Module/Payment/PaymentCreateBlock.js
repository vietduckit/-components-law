  const { React } = ctx;
  const { useCallback, useEffect, useMemo, useRef, useState } = React;
  const {
    Button,
    Card,
    Divider,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
    message,
  } = ctx.antd;

  const PAYMENT_RESOURCES = ["payments"];
  const INVOICE_RESOURCES = ["invoices"];
  const CONTRACT_RESOURCES = ["contracts"];
  const CUSTOMER_RESOURCES = ["customers"];
  const COMPANY_RESOURCES = ["internalCompany"];
  const USER_RESOURCES = ["users"];
  const PAYMENT_REQUEST_RESOURCES = ["paymentRequests", "PaymentRequests", "payment_requests"];
  const PAYMENT_REQUEST_ITEM_RESOURCES = ["paymentRequestItems", "PaymentRequestItems", "payment_request_items"];

  const SOURCE_TYPES = {
    invoice: "invoice_payment",
    contract: "contract_schedule",
    manual: "manual",
  };

  const MONEY_TOLERANCE = 0;
  const FINAL_STATUSES = ["received", "paid", "completed"];
  const ACTUAL_PAYMENT_STATUSES = ["received", "paid", "completed", "partial"];
  const NON_ACTIVE_STATUSES = ["cancelled", "canceled", "void"];

  const contextRecord =
    ctx.record ||
    ctx.popup?.record ||
    ctx.state?.record ||
    ctx.data?.record ||
    ctx.recordData ||
    null;

  const parseNum = (value) => {
    const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const parseMoneyInput = (value) => {
    const cleaned = String(value ?? "")
      .replace(/[.,\s]/g, "")
      .replace(/[^\d-]/g, "");
    if (!cleaned || cleaned === "-") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  const formatMoneyInput = (value) => {
    const cleaned = String(value ?? "").replace(/[^\d]/g, "");
    if (!cleaned) return "";
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const extractId = (value) => {
    if (Array.isArray(value)) return extractId(value[0]);
    const raw = value && typeof value === "object" ? value.id || value._id : value;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const firstPresent = (record, fields = []) => {
    for (const field of fields) {
      const value = record?.[field];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  };

  const compact = (items) =>
    items
      .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
      .filter(Boolean);

  const unwrapList = (res) => {
    const data = res?.data?.data ?? res?.data ?? [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const unwrapRecord = (res) => res?.data?.data || res?.data || null;

  const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

  const isFinalStatus = (status) => FINAL_STATUSES.includes(normalizeStatus(status));
  const isActualPaidStatus = (status) => ACTUAL_PAYMENT_STATUSES.includes(normalizeStatus(status));
  const isInactiveStatus = (status) => NON_ACTIVE_STATUSES.includes(normalizeStatus(status));

  const deriveActualPaymentStatus = (amount, remainingBefore) => {
    const received = parseNum(amount);
    const remaining = parseNum(remainingBefore);
    if (remaining > MONEY_TOLERANCE && received + MONEY_TOLERANCE < remaining) return "Partial";
    return "Received";
  };

  const toIsoDateTime = (value) => {
    if (!value) return null;
    const raw = String(value);
    const date = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
    return Number.isNaN(date.getTime()) ? raw : date.toISOString();
  };

  const formatMoney = (value) => {
    const n = parseNum(value);
    return `${Math.round(n).toLocaleString("vi-VN")} VND`;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("vi-VN");
  };

  const safeJsonParse = (value) => {
    if (!value) return null;
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("[PaymentCreateBlock] Invalid JSON", error);
      return null;
    }
  };

  const getUrlParam = (name) => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return params.get(name);
    } catch {
      return null;
    }
  };

  const seedPaymentRequestItemId =
    extractId(ctx.view?.inputArgs?.paymentRequestItemId) ||
    extractId(ctx.popup?.params?.paymentRequestItemId) ||
    extractId(ctx.params?.paymentRequestItemId) ||
    extractId(contextRecord?.paymentRequestItemId) ||
    extractId(contextRecord?.paymentRequestItem) ||
    extractId(getUrlParam("paymentRequestItemId"));

  const seedPaymentRequestId =
    extractId(ctx.view?.inputArgs?.paymentRequestId) ||
    extractId(ctx.popup?.params?.paymentRequestId) ||
    extractId(ctx.params?.paymentRequestId) ||
    extractId(contextRecord?.paymentRequestId) ||
    extractId(contextRecord?.paymentRequest) ||
    extractId(getUrlParam("paymentRequestId"));

  const stripPaymentRequestFields = (payload) => {
    const next = { ...(payload || {}) };
    [
      "paymentRequestId",
      "paymentRequest",
      "paymentRequestItemId",
      "paymentRequestItem",
    ].forEach((key) => delete next[key]);
    return next;
  };

  const toDateInput = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // "YYYY-MM-DDTHH:mm" — matches <input type="datetime-local">'s value format.
  const nowDateTimeInput = () => {
    const date = new Date();
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${toDateInput(date)}T${hh}:${min}`;
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

  const resolvePaymentSchedule = (contract) => {
    const raw = safeJsonParse(contract?.paymentSchedule);
    if (!raw) return null;
    return Array.isArray(raw) ? { installments: raw } : raw;
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
          ? `Every ${plan.retainerUnit} · ${totalCycles} ${retainerDurationSuffix(plan.retainerUnit, totalCycles)} total`
          : `Every ${plan.retainerUnit} · open-ended`,
      };
    }
    return {
      nextPaymentDate: calcRetainerNextPaymentDate(plan.startDate, 1, plan.retainerUnit),
      cyclesBilled,
      totalCycles,
      displayText: totalCycles
        ? `Every ${plan.retainerUnit} · ${totalCycles} ${retainerDurationSuffix(plan.retainerUnit, totalCycles)} total`
        : `Every ${plan.retainerUnit} · open-ended`,
    };
  };

  // Prefers the live contractBillingPlans record (via contract.billingPlans)
  // when present — the single source of truth the retainer-billing
  // automation reads and writes directly. Falls back to the legacy
  // paymentSchedule.retainerRule JSON for contracts not yet backfilled.
  const resolveRetainerNextPaymentDate = (contract) => {
    const activePlan = contract?.billingPlans?.find((p) => p.status === "active") || null;
    if (activePlan) {
      return resolveActiveBillingPlanDisplay(activePlan)?.nextPaymentDate || "";
    }
    const schedule = resolvePaymentSchedule(contract);
    const rule = schedule?.retainerRule || null;
    const storedDate = normalizeDateInput(rule?.nextPaymentDate);
    if (storedDate) return storedDate;
    return calcRetainerNextPaymentDate(
      schedule?.firstPaymentDate || contract?.paymentDate,
      rule?.interval || contract?.retainerDuration,
      rule?.unit || contract?.retainerRepeatUnit || contract?.retainerPeriod,
    );
  };

  const isRetainerPaymentContract = (contract) => {
    const schedule = resolvePaymentSchedule(contract);
    return !!(
      schedule?.retainerRule?.enabled ||
      normalizeModeKey(schedule?.mode || contract?.billingCycle) === "recurring" ||
      normalizeModeKey(contract?.contractType) === "retainer"
    );
  };

  const relationRecord = (value) => {
    if (Array.isArray(value)) return value.find((item) => item && typeof item === "object") || null;
    return value && typeof value === "object" ? value : null;
  };

  const customerLabel = (record) =>
    compact([
      firstPresent(record, ["customerName", "name", "fullName", "displayName", "companyName"]),
      firstPresent(record, ["customerCode", "code"]) ? `(${firstPresent(record, ["customerCode", "code"])})` : "",
    ]).join(" ") || (record?.id ? `Customer #${record.id}` : "Customer");

  const companyLabel = (record) =>
    compact([
      firstPresent(record, ["name", "companyName", "shortName", "displayName"]),
    ]).join(" ") || (record?.id ? `Company #${record.id}` : "Company");

  const userLabel = (record) =>
    compact([
      firstPresent(record, ["nickname", "displayName", "username", "email"]),
      firstPresent(record, ["email"]) &&
      firstPresent(record, ["email"]) !== firstPresent(record, ["nickname", "displayName", "username", "email"])
        ? `(${firstPresent(record, ["email"])})`
        : "",
    ]).join(" ") || (record?.id ? `User #${record.id}` : "User");

  const invoiceLabel = (record) =>
    compact([
      firstPresent(record, ["invoiceNumber", "invoiceCode", "paymentNumber", "code"]),
      firstPresent(record, ["invoiceName", "name", "title"]),
      parseNum(firstPresent(record, ["remainingAmount", "balanceAmount", "totalAmount", "amount"]))
        ? formatMoney(firstPresent(record, ["remainingAmount", "balanceAmount", "totalAmount", "amount"]))
        : "",
    ]).join(" - ") || (record?.id ? `Invoice #${record.id}` : "Invoice");

  const invoiceRemainingAmount = (record) =>
    parseNum(firstPresent(record, ["remainingAmount", "balanceAmount", "unpaidAmount", "outstandingAmount", "amountDue"])) ||
    parseNum(firstPresent(record, ["totalAmount", "amount"]));

  const contractLabel = (record) =>
    compact([
      firstPresent(record, ["contractCode", "contractNumber", "code"]),
      firstPresent(record, ["contractName", "name", "title"]),
      relationRecord(record?.customers) ? customerLabel(relationRecord(record.customers)) : "",
    ]).join(" - ") || (record?.id ? `Contract #${record.id}` : "Contract");

  const normalizeSourceKeyPart = (value) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_.:-]/g, "")
      .slice(0, 80);

  const baseScheduleSourceKey = (contractId, scheduleItemId) =>
    `contract:${contractId}:installment:${scheduleItemId}`;

  const actualScheduleSourceKey = (contractId, scheduleItemId, reference) =>
    `${baseScheduleSourceKey(contractId, scheduleItemId)}:actual:${normalizeSourceKeyPart(reference) || Date.now()}`;

  const contractDirectSourceKey = (contractId, reference) =>
    `contract:${contractId}:direct:${normalizeSourceKeyPart(reference) || Date.now()}`;

  const basePaymentRequestSourceKey = (requestId) => `paymentRequest:${requestId}`;

  const actualPaymentRequestSourceKey = (requestId, reference) =>
    `${basePaymentRequestSourceKey(requestId)}:actual:${normalizeSourceKeyPart(reference) || Date.now()}`;

  const invoiceSourceKey = (invoiceId, reference) =>
    `invoice:${invoiceId}:payment:${normalizeSourceKeyPart(reference) || Date.now()}`;

  const manualSourceKey = (reference) =>
    `manual:${normalizeSourceKeyPart(reference) || Date.now()}`;

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

  const updateAny = async (resources, id, data) => {
    const res = await apiRequestAny(resources, "update", {
      method: "POST",
      params: { filterByTk: id },
      data,
    });
    return unwrapRecord(res);
  };

  const updateWithPayloadFallback = async (resources, id, payloadVariants = []) => {
    let lastError = null;
    for (const payload of payloadVariants) {
      try {
        return await updateAny(resources, id, payload);
      } catch (error) {
        lastError = error;
        console.warn("[PaymentCreateBlock] update fallback failed", error);
      }
    }
    throw lastError || new Error("Update failed.");
  };

  const savePaymentWithRequestFallback = async ({ updateExistingId, payload }) => {
    try {
      return updateExistingId
        ? await updateAny(PAYMENT_RESOURCES, updateExistingId, payload)
        : await createAny(PAYMENT_RESOURCES, payload);
    } catch (error) {
      if (!payload?.paymentRequestId && !payload?.paymentRequestItemId) throw error;
      console.warn("[PaymentCreateBlock] retry payment save without request relation fields", error);
      const fallbackPayload = stripPaymentRequestFields(payload);
      return updateExistingId
        ? await updateAny(PAYMENT_RESOURCES, updateExistingId, fallbackPayload)
        : await createAny(PAYMENT_RESOURCES, fallbackPayload);
    }
  };

  const syncPaymentRequestItemAfterPayment = async ({ payment, form }) => {
    const requestItemId = extractId(form.paymentRequestItemId);
    if (!requestItemId) return;
    const paymentId = extractId(payment);
    const payload = {
      lineStatus: "converted_to_payment",
      paymentId,
      payments: paymentId || undefined,
    };
    await updateWithPayloadFallback(PAYMENT_REQUEST_ITEM_RESOURCES, requestItemId, [
      payload,
      stripPaymentRequestFields(payload),
      { lineStatus: "converted_to_payment", paymentId },
      { lineStatus: "converted_to_payment" },
    ]).catch((error) => {
      console.warn("[PaymentCreateBlock] could not sync payment request item", error);
    });
  };

  const closeCurrentModal = () => {
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
          target[method](...args);
          return true;
        } catch (error) {
          console.warn("[PaymentCreateBlock] close modal failed", error);
        }
      }
    }

    const doc = ctx.document || (typeof document !== "undefined" ? document : null);
    const closeButtons = doc?.querySelectorAll?.(".ant-modal .ant-modal-close");
    const closeButton = closeButtons?.length ? closeButtons[closeButtons.length - 1] : null;
    if (closeButton && typeof closeButton.click === "function") {
      closeButton.click();
      return true;
    }

    return false;
  };

  const showDiscardConfirm = (onOk) => {
    if (showDiscardConfirm._open) return;
    const run = async () => {
      try {
        await onOk?.();
      } catch (error) {
        console.warn("[PaymentCreateBlock] discard close failed", error);
      } finally {
        showDiscardConfirm._open = false;
      }
    };

    if (Modal?.confirm) {
      showDiscardConfirm._open = true;
      Modal.confirm({
        title: "Discard unsaved payment?",
        content: "Changes in this payment form will be lost if you close it.",
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

    if (window.confirm("Discard unsaved payment?\nChanges in this payment form will be lost if you close it.")) {
      run();
    }
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
        console.warn("[PaymentCreateBlock] configure modal close failed", error);
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
        console.warn("[PaymentCreateBlock] patch close failed", error);
        return;
      }
      restoreFns.push(() => {
        if (target[method] !== patchedClose) return;
        try {
          target[method] = original;
        } catch {}
      });
    };

    [ctx.view, ctx.popup, ctx.modal, ctx.drawer, ctx.action, ctx].forEach(
      (target) => {
        ["onClose", "close", "closeModal", "setVisible", "setOpen"].forEach(
          (method) => patchMethod(target, method),
        );
      },
    );

    return () => {
      restoreFns.forEach((restore) => {
        try {
          restore();
        } catch {}
      });
    };
  };

  const findPaymentBySourceKey = async (sourceKey) => {
    if (!sourceKey) return null;
    const rows = await listAny(PAYMENT_RESOURCES, {
      pageSize: 1,
      filter: JSON.stringify({ sourceKey: { $eq: sourceKey } }),
    });
    return rows[0] || null;
  };

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

  const normalizeModeKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  const contractTotalAmount = (contract) => {
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

  const resolveCustomerId = (record) =>
    extractId(record?.customerId) ||
    extractId(record?.customers) ||
    extractId(record?.customer) ||
    extractId(record?.clientId) ||
    extractId(record?.clients);

  const resolveCompanyId = (record) =>
    extractId(record?.internalCompanyId) ||
    extractId(record?.internalCompany) ||
    extractId(record?.companyId) ||
    extractId(record?.companies);

  const resolveContractId = (record) =>
    extractId(record?.contractId) ||
    extractId(record?.contracts) ||
    extractId(record?.contract);

  const buildCommonPaymentPayload = ({ form, context }) => {
    const payload = {
      paymentSourceType: form.mode,
      paymentMethod: form.paymentMethod || null,
      paymentRefer: form.paymentRefer?.trim() || null,
      paymentStatus: form.paymentStatus || "Received",
      paymentDate: toIsoDateTime(form.paymentDate),
      amount: parseNum(form.amount),
      internalNote: form.internalNote?.trim() || null,
    };

    if (context.invoiceId) {
      payload.invoiceId = context.invoiceId;
      payload.invoices = context.invoiceId;
    }
    if (context.contractId) {
      payload.contractId = context.contractId;
      payload.contracts = context.contractId;
    }
    if (context.customerId) {
      payload.customerId = context.customerId;
      payload.customers = context.customerId;
    }
    if (context.internalCompanyId) {
      payload.internalCompanyId = context.internalCompanyId;
      payload.internalCompany = context.internalCompanyId;
    }
    if (context.lawyerId) {
      payload.lawyerId = context.lawyerId;
      payload.assignees = context.lawyerId;
    }
    if (form.accountingUserId) {
      payload.users = form.accountingUserId;
    }
    if (form.paymentRequestId) {
      payload.paymentRequestId = form.paymentRequestId;
      payload.paymentRequest = form.paymentRequestId;
    }
    if (form.paymentRequestItemId) {
      payload.paymentRequestItemId = form.paymentRequestItemId;
      payload.paymentRequestItem = form.paymentRequestItemId;
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === "") delete payload[key];
    });
    return payload;
  };

  const isActualPaymentFilled = (record) => {
    if (!record || isInactiveStatus(record.paymentStatus)) return false;
    if (isActualPaidStatus(record.paymentStatus)) return parseNum(record.amount) > 0;
    return !!(parseNum(record.amount) > 0 && (record.paymentDate || record.paymentRefer || record.paymentMethod));
  };

  const CONTRACT_PAYMENT_STATUS_META = {
    unpaid: { color: "default", label: "Unpaid" },
    partial: { color: "warning", label: "Partial" },
    paid: { color: "success", label: "Paid" },
  };

  const contractPaymentStatusMeta = (status) =>
    CONTRACT_PAYMENT_STATUS_META[String(status || "").toLowerCase()] || { color: "default", label: "Unknown" };

  const ContractSummaryItem = ({ label, value, strong }) =>
    React.createElement(
      "div",
      { style: { padding: "8px 0", borderTop: "1px solid rgba(0,0,0,0.06)" } },
      React.createElement(Typography.Text, { type: "secondary" }, label),
      React.createElement(
        "div",
        { style: { marginTop: 4, fontWeight: strong ? 700 : 600, fontVariantNumeric: "tabular-nums" } },
        value,
      ),
    );

  const PaymentCreateBlock = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState(SOURCE_TYPES.invoice);
    const [invoices, setInvoices] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [accountingUsers, setAccountingUsers] = useState([]);
    const [selectedContract, setSelectedContract] = useState(null);
    const [contractPayments, setContractPayments] = useState([]);
    // Real paymentRequests rows for the picked contract (By Case's
    // installments and By Service's per-service requests both live here —
    // see docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md
    // §6y). Replaces contract.paymentSchedule JSON as the "which
    // installment/service" picker source entirely.
    const [contractPaymentRequests, setContractPaymentRequests] = useState([]);
    const [requestContextLoaded, setRequestContextLoaded] = useState(false);
    // §6h — names of the contractServices this specific Payment Request is
    // tagged to (paymentRequestServices junction), so the person recording
    // the payment can see which service(s)/installment it belongs to.
    const [requestServiceNames, setRequestServiceNames] = useState([]);
    // Set whenever this block is opened against one specific, already-known
    // Payment Request (By Case/By Service/Retainer all create paymentRequests
    // rows — this is the one thing every contract type has in common).
    // Replaces matching against contract.paymentSchedule's JSON installment
    // ids, which live in a completely different id space than the real
    // contractPaymentSchedules/paymentRequestItems rows and can never match —
    // see docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md §6x.
    const [activePaymentRequest, setActivePaymentRequest] = useState(null);
    const isDirtyRef = useRef(false);
    const [form, setForm] = useState({
      invoiceId: "",
      contractId: "",
      customerId: "",
      internalCompanyId: "",
      accountingUserId: "",
      paymentMethod: "Cash",
      paymentStatus: "Received",
      paymentDate: nowDateTimeInput(),
      amount: null,
      paymentRefer: "",
      internalNote: "",
      paymentRequestId: seedPaymentRequestId || "",
      paymentRequestItemId: seedPaymentRequestItemId || "",
    });
    const [amountDraft, setAmountDraft] = useState("");

    useEffect(() => {
      setAmountDraft(formatMoneyInput(form.amount));
    }, [form.amount]);

    const markDirty = useCallback(() => {
      isDirtyRef.current = true;
    }, []);

    const forceClose = useCallback((nativeClose) => {
      isDirtyRef.current = false;
      if (typeof nativeClose === "function") {
        nativeClose();
        return;
      }
      closeCurrentModal();
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

    const setF = (key, value) => {
      markDirty();
      setForm((prev) => ({ ...prev, [key]: value }));
    };

    const emptyFormForMode = () => ({
      invoiceId: "",
      contractId: "",
      customerId: "",
      internalCompanyId: "",
      accountingUserId: "",
      lawyerId: "",
      paymentMethod: "",
      paymentStatus: "",
      paymentDate: nowDateTimeInput(),
      amount: null,
      paymentRefer: "",
      internalNote: "",
      paymentRequestId: "",
      paymentRequestItemId: "",
    });

    const handleModeChange = (value) => {
      markDirty();
      setMode(value);
      setForm(emptyFormForMode());
      setAmountDraft("");
      setSelectedContract(null);
      setContractPayments([]);
      setContractPaymentRequests([]);
      setRequestServiceNames([]);
      setActivePaymentRequest(null);
    };

    useEffect(() => {
      let mounted = true;
      Promise.all([
        listAny(INVOICE_RESOURCES, { pageSize: 500, sort: ["-createdAt"] }).catch(() => []),
        listAny(CONTRACT_RESOURCES, { pageSize: 500, sort: ["-createdAt"], appends: ["customers", "billingPlans"] }).catch(() => []),
        listAny(CUSTOMER_RESOURCES, { pageSize: 500, sort: ["createdAt"] }).catch(() => []),
        listAny(COMPANY_RESOURCES, { pageSize: 500, sort: ["createdAt"] }).catch(() => []),
        listAny(USER_RESOURCES, { pageSize: 500 }).catch(() => []),
      ])
        .then(([invoiceRows, contractRows, customerRows, companyRows, userRows]) => {
          if (!mounted) return;
          setInvoices(invoiceRows);
          setContracts(contractRows);
          setCustomers(customerRows);
          setCompanies(companyRows);
          setAccountingUsers((userRows || []).filter((item) => extractId(item) !== 1));
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
      return () => {
        mounted = false;
      };
    }, []);

    const selectedInvoice = useMemo(
      () => invoices.find((item) => String(extractId(item)) === String(form.invoiceId)) || null,
      [invoices, form.invoiceId],
    );

    const selectedCustomer = useMemo(
      () => customers.find((item) => String(extractId(item)) === String(form.customerId)) || null,
      [customers, form.customerId],
    );

    const selectedCompany = useMemo(
      () => companies.find((item) => String(extractId(item)) === String(form.internalCompanyId)) || null,
      [companies, form.internalCompanyId],
    );

    // contractPaymentRequests (real paymentRequests rows, §6y) replaces
    // contract.paymentSchedule JSON as the "which installment/service"
    // picker source — see docs/superpowers/specs/2026-09-17-unified-
    // contract-payment-data-model-design.md §6x for why the JSON blob's ids
    // can never reliably match real payments.
    const paymentRequestPaidAmount = (request, payments = contractPayments) =>
      summarizeActualPayments(
        (payments || []).filter((p) => extractId(p?.paymentRequestId) === extractId(request?.id)),
      );
    const paymentRequestRemainingAmount = (request, payments = contractPayments) =>
      Math.max(parseNum(request?.requestedAmount) - paymentRequestPaidAmount(request, payments), 0);
    const isPaymentRequestFullyPaid = (request, payments = contractPayments) =>
      paymentRequestRemainingAmount(request, payments) <= MONEY_TOLERANCE;

    const contractTypeKey = normalizeModeKey(selectedContract?.contractType);
    // Only By Case (installments) and By Service (per-service requests)
    // get a picker — Retainer's Payment Requests are periodic billing
    // cycles, not a static list to choose from, and stay on the
    // whole-contract grid below.
    // Stays true even once a row is picked (activePaymentRequest set) — the
    // table stays visible so ticking a different row is how you change the
    // pick, no separate "Change" control needed. Naturally false for the
    // direct-open-from-one-Payment-Request flow, which never populates
    // contractPaymentRequests.
    const showPaymentRequestPicker =
      mode === SOURCE_TYPES.contract &&
      (contractTypeKey === "bycase" || contractTypeKey === "byservice") &&
      contractPaymentRequests.length > 0;
    const selectedContractTotalAmount = contractTotalAmount(selectedContract || {});
    const contractPaidAmount = summarizeActualPayments(contractPayments);
    const contractRemainingAmount = selectedContractTotalAmount > MONEY_TOLERANCE
      ? Math.max(selectedContractTotalAmount - contractPaidAmount, 0)
      : 0;
    // When the contract has pickable Payment Requests and none is active
    // yet, the sum of their own remaining amounts IS the ground truth for
    // "contract outstanding" — it's exactly what the picker table below
    // shows, computed from the real paymentRequestId every payment already
    // carries (no JSON-blob id matching involved). contracts.outStandingAmount
    // (DB) is used whenever there's no such breakdown (Retainer, or a
    // legacy contract with zero paymentRequests); client recompute is the
    // last-resort fallback for pre-trigger contracts.
    const requestBasedOutstanding = showPaymentRequestPicker
      ? contractPaymentRequests.reduce((sum, r) => sum + paymentRequestRemainingAmount(r), 0)
      : null;
    const dbOutstanding = selectedContract?.outStandingAmount;
    const contractOutstandingAmount = requestBasedOutstanding !== null
      ? requestBasedOutstanding
      : dbOutstanding !== undefined && dbOutstanding !== null
        ? parseNum(dbOutstanding)
        : contractRemainingAmount;
    const isSelectedRetainerPayment = isRetainerPaymentContract(selectedContract || {});
    const selectedRetainerNextPaymentDate = resolveRetainerNextPaymentDate(selectedContract || {});

    const loadContractContext = async (contractId) => {
      markDirty();
      const safeId = extractId(contractId);
      setF("contractId", safeId || "");
      setSelectedContract(null);
      setContractPayments([]);
      setContractPaymentRequests([]);
      setRequestServiceNames([]);
      setActivePaymentRequest(null);
      if (!safeId) return;
      setLoading(true);
      try {
        const [contract, payments, paymentRequests] = await Promise.all([
          getAny(CONTRACT_RESOURCES, safeId, { appends: ["customers", "billingPlans"] }),
          listPaymentsByContract(safeId),
          listAny(["paymentRequests"], {
            pageSize: 500,
            filter: JSON.stringify({ contractId: { $eq: safeId } }),
            fields: ["id", "title", "requestedAmount", "status", "dueDate", "contractPaymentScheduleId"],
          }).catch(() => []),
        ]);
        setSelectedContract(contract || null);
        setContractPayments(payments || []);
        setContractPaymentRequests(paymentRequests || []);
        const customerId = resolveCustomerId(contract);
        const companyId = resolveCompanyId(contract);
        const lawyerId = extractId(contract?.lawyerId) || extractId(contract?.lawyer) || extractId(contract?.assignees);
        const contractTypeKey = normalizeModeKey(contract?.contractType);
        const hasPickableRequests =
          (contractTypeKey === "bycase" || contractTypeKey === "byservice") && (paymentRequests || []).length > 0;
        const isRetainerPayment = isRetainerPaymentContract(contract || {});
        const retainerNextPaymentDate = resolveRetainerNextPaymentDate(contract || {});
        const totalAmount = contractTotalAmount(contract || {});
        const paidAmount = summarizeActualPayments(payments || []);
        const remainingAmount = totalAmount > MONEY_TOLERANCE
          ? Math.max(totalAmount - paidAmount, 0)
          : 0;
        setForm((prev) => ({
          ...prev,
          contractId: safeId,
          customerId: customerId || prev.customerId || "",
          internalCompanyId: companyId || prev.internalCompanyId || "",
          lawyerId: lawyerId || prev.lawyerId || "",
          amount: !hasPickableRequests && remainingAmount > MONEY_TOLERANCE ? remainingAmount : null,
          paymentDate: prev.paymentDate || (!hasPickableRequests && isRetainerPayment ? retainerNextPaymentDate : ""),
          paymentStatus: !hasPickableRequests
            ? (remainingAmount > MONEY_TOLERANCE ? deriveActualPaymentStatus(remainingAmount, remainingAmount) : "Received")
            : "",
        }));
      } catch (error) {
        console.error("[PaymentCreateBlock] load contract failed", error);
        message.error("Could not load contract payment information.");
      } finally {
        setLoading(false);
      }
    };

    // §6h — shared by both entry points below and by the manual picker's
    // row-select handler: looks up which contractServices a Payment Request
    // is tagged to, by name.
    const fetchAndSetRequestServiceNames = (requestId) => {
      setRequestServiceNames([]);
      if (!requestId) return;
      listAny(["paymentRequestServices"], {
        filter: JSON.stringify({ paymentRequestId: { $eq: requestId } }),
        fields: ["id", "contractServiceId"],
      })
        .then((tagRows) => {
          const csIds = compact((tagRows || []).map((row) => extractId(row.contractServiceId)));
          if (!csIds.length) return;
          return listAny(["contractServices"], {
            filter: JSON.stringify({ id: { $in: csIds } }),
            fields: ["id", "serviceName"],
          }).then((serviceRows) => {
            setRequestServiceNames((serviceRows || []).map((row) => row.serviceName || `Service #${extractId(row.id)}`));
          });
        })
        .catch(() => setRequestServiceNames([]));
    };

    // Shared core for both entry points below. `request` (a paymentRequests
    // row) is the one thing every contract type always has — By Case/By
    // Service also get a matching paymentRequestItems row (`item`), Retainer
    // never does (its Payment Requests are created by a Workflow that only
    // inserts into paymentRequests). This specific request's own remaining
    // balance is the authoritative "how much is left to pay", computed
    // straight from payments already recorded against this paymentRequestId.
    const finishLoadingPaymentRequest = async (request, item) => {
      const requestId = extractId(request?.id);
      const contractId =
        resolveContractId(item || {}) ||
        resolveContractId(request || {}) ||
        extractId(request?.contractId);
      if (!contractId) throw new Error("No contract linked to this payment request.");

      const [contract, payments] = await Promise.all([
        getAny(CONTRACT_RESOURCES, contractId, { appends: ["customers", "internalCompany", "billingPlans"] }),
        listPaymentsByContract(contractId).catch(() => []),
      ]);

      const requestedAmount = parseNum(
        firstPresent(item || {}, ["approvedAmount", "requestedAmount", "remainingAmountSnapshot"]) ||
        firstPresent(request || {}, ["requestedAmount"]),
      );
      const requestPaidAmount = summarizeActualPayments(
        (payments || []).filter((p) => requestId && extractId(p?.paymentRequestId) === requestId),
      );
      const requestRemainingAmount = Math.max(requestedAmount - requestPaidAmount, 0);
      // paymentRequests.contractPaymentScheduleId is the REAL contractPaymentSchedules
      // row id (By Case only) — unlike contract.paymentSchedule's JSON item
      // ids, this is safe to write onto the payment's own scheduleItemId for
      // downstream per-installment reporting.
      const scheduleItemId = extractId(request?.contractPaymentScheduleId)
        ? String(extractId(request.contractPaymentScheduleId))
        : "";
      const plannedDate = item?.plannedPaymentDate || item?.dueDate || request?.dueDate || "";
      const customerId =
        resolveCustomerId(item || {}) ||
        resolveCustomerId(request || {}) ||
        resolveCustomerId(contract || {});
      const companyId =
        resolveCompanyId(item || {}) ||
        resolveCompanyId(request || {}) ||
        resolveCompanyId(contract || {});
      const lawyerId = extractId(contract?.lawyerId) || extractId(contract?.lawyer) || extractId(contract?.assignees);

      fetchAndSetRequestServiceNames(requestId);

      setMode(SOURCE_TYPES.contract);
      setSelectedContract(contract || null);
      setContractPayments(payments || []);
      setContractPaymentRequests([]);
      setActivePaymentRequest({
        id: requestId,
        title: firstPresent(request || {}, ["title"]) || (requestId ? `Payment request #${requestId}` : "Payment request"),
        requestedAmount,
        paidAmount: requestPaidAmount,
        remainingAmount: requestRemainingAmount,
        scheduleItemId,
      });
      setForm((prev) => ({
        ...prev,
        mode: SOURCE_TYPES.contract,
        contractId,
        customerId: customerId || prev.customerId || "",
        internalCompanyId: companyId || prev.internalCompanyId || "",
        lawyerId: lawyerId || prev.lawyerId || "",
        amount: requestRemainingAmount > MONEY_TOLERANCE ? requestRemainingAmount : prev.amount,
        paymentDate: plannedDate || prev.paymentDate || "",
        paymentStatus: requestRemainingAmount > MONEY_TOLERANCE
          ? deriveActualPaymentStatus(requestRemainingAmount, requestRemainingAmount)
          : "Received",
        paymentRequestId: requestId || prev.paymentRequestId || "",
        paymentRequestItemId: extractId(item?.id) || prev.paymentRequestItemId || "",
        internalNote:
          prev.internalNote ||
          compact([
            requestId ? `Payment request #${requestId}` : "",
            firstPresent(item || request || {}, ["lineLabel", "description", "title"]),
          ]).join(" - "),
      }));
      setRequestContextLoaded(true);
    };

    const loadPaymentRequestContext = async (requestItemId) => {
      const safeItemId = extractId(requestItemId);
      if (!safeItemId) return;
      setLoading(true);
      try {
        const item = await getAny(PAYMENT_REQUEST_ITEM_RESOURCES, safeItemId, {
          appends: ["paymentRequest", "contracts"],
        });
        const requestId =
          extractId(item?.paymentRequestId) ||
          extractId(item?.paymentRequest) ||
          seedPaymentRequestId;
        const request = requestId
          ? await getAny(PAYMENT_REQUEST_RESOURCES, requestId, { appends: ["contracts", "customers", "internalCompany"] }).catch(() => null)
          : null;
        await finishLoadingPaymentRequest(request, item);
      } catch (error) {
        console.error("[PaymentCreateBlock] load payment request context failed", error);
        message.error(error?.message || "Could not load payment request context.");
        setRequestContextLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    // Entry point for opening this block directly from a Payment Request's
    // own detail page (no paymentRequestItemId available) — the only path
    // that works for Retainer, whose Payment Requests never get a
    // paymentRequestItems row.
    const loadPaymentRequestContextByRequestId = async (requestId) => {
      const safeRequestId = extractId(requestId);
      if (!safeRequestId) return;
      setLoading(true);
      try {
        const request = await getAny(PAYMENT_REQUEST_RESOURCES, safeRequestId, {
          appends: ["contracts", "customers", "internalCompany"],
        });
        if (!request) throw new Error("Payment request not found.");
        await finishLoadingPaymentRequest(request, null);
      } catch (error) {
        console.error("[PaymentCreateBlock] load payment request (by id) context failed", error);
        message.error(error?.message || "Could not load payment request context.");
        setRequestContextLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      if (requestContextLoaded) return;
      if (seedPaymentRequestItemId) {
        loadPaymentRequestContext(seedPaymentRequestItemId);
        return;
      }
      if (seedPaymentRequestId) {
        loadPaymentRequestContextByRequestId(seedPaymentRequestId);
      }
    }, [requestContextLoaded]);

    const handleInvoiceChange = (invoiceId) => {
      markDirty();
      const safeId = extractId(invoiceId);
      const invoice = invoices.find((item) => String(extractId(item)) === String(safeId));
      const amount = invoiceRemainingAmount(invoice);
      setForm((prev) => ({
        ...prev,
        invoiceId: safeId || "",
        contractId: resolveContractId(invoice) || prev.contractId || "",
        customerId: resolveCustomerId(invoice) || prev.customerId || "",
        internalCompanyId: resolveCompanyId(invoice) || prev.internalCompanyId || "",
        amount: amount || prev.amount,
        paymentStatus: amount ? deriveActualPaymentStatus(amount, amount) : prev.paymentStatus,
      }));
    };

    // Manual "By contract" picker's row-select — reuses the exact same
    // activePaymentRequest mechanism the direct-open-from-Payment-Request
    // flow uses, so validation/submit/display all behave identically
    // regardless of how the user got here.
    const handleContractPaymentRequestSelect = (request) => {
      const remaining = paymentRequestRemainingAmount(request);
      if (remaining <= MONEY_TOLERANCE) {
        message.info("This payment request has already been fully paid.");
        return;
      }
      markDirty();
      const requestId = extractId(request?.id);
      const paid = paymentRequestPaidAmount(request);
      fetchAndSetRequestServiceNames(requestId);
      setActivePaymentRequest({
        id: requestId,
        title: firstPresent(request || {}, ["title"]) || (requestId ? `Payment request #${requestId}` : "Payment request"),
        requestedAmount: parseNum(request?.requestedAmount),
        paidAmount: paid,
        remainingAmount: remaining,
        scheduleItemId: extractId(request?.contractPaymentScheduleId)
          ? String(extractId(request.contractPaymentScheduleId))
          : "",
      });
      setForm((prev) => ({
        ...prev,
        amount: remaining > MONEY_TOLERANCE ? remaining : null,
        paymentDate: prev.paymentDate || request?.dueDate || "",
        paymentStatus: remaining > MONEY_TOLERANCE ? deriveActualPaymentStatus(remaining, remaining) : "Received",
        paymentRequestId: requestId || prev.paymentRequestId || "",
        internalNote: prev.internalNote || firstPresent(request || {}, ["title"]) || "",
      }));
    };

    // Unticking the active row's checkbox in the picker table — the table
    // itself is the "change selection" control now, so this just clears
    // back to "nothing picked yet" rather than needing a separate button.
    const handleClearPaymentRequestSelection = () => {
      markDirty();
      setActivePaymentRequest(null);
      setRequestServiceNames([]);
      setForm((prev) => ({ ...prev, amount: null, paymentRequestId: "", paymentRequestItemId: "" }));
    };

    const handleAmountChange = (value) => {
      markDirty();
      setAmountDraft(formatMoneyInput(value));
      const amount = parseMoneyInput(value);
      setForm((prev) => {
        let paymentStatus = prev.paymentStatus;
        if (amount <= 0 && mode !== SOURCE_TYPES.manual) {
          paymentStatus = "";
        } else if (mode === SOURCE_TYPES.contract) {
          if (activePaymentRequest) {
            paymentStatus = activePaymentRequest.remainingAmount > MONEY_TOLERANCE
              ? deriveActualPaymentStatus(amount, activePaymentRequest.remainingAmount)
              : "Received";
          } else if (contractOutstandingAmount > MONEY_TOLERANCE) {
            paymentStatus = deriveActualPaymentStatus(amount, contractOutstandingAmount);
          } else {
            paymentStatus = "Received";
          }
        } else if (mode === SOURCE_TYPES.invoice) {
          const invoiceRemaining = invoiceRemainingAmount(selectedInvoice);
          if (invoiceRemaining > MONEY_TOLERANCE) {
            paymentStatus = deriveActualPaymentStatus(amount, invoiceRemaining);
          }
        }
        return { ...prev, amount: amount === null ? null : amount, paymentStatus };
      });
    };

    const validate = () => {
      if (mode === SOURCE_TYPES.invoice && !form.invoiceId) return "Please select an invoice.";
      if (mode === SOURCE_TYPES.contract && !form.contractId) return "Please select a contract.";
      if (mode === SOURCE_TYPES.contract && showPaymentRequestPicker && !activePaymentRequest) {
        return "Please select a payment request to pay.";
      }
      if (mode === SOURCE_TYPES.manual && !form.customerId) return "Please select a customer for manual payment.";
      if (!form.internalCompanyId) return "Please select internal company.";
      if (!form.paymentMethod) return "Please select payment method.";
      if (mode === SOURCE_TYPES.manual && !form.paymentStatus) return "Please select payment status.";
      const amount = parseNum(form.amount);
      if (amount <= 0) return "Please enter received amount.";
      if (!form.paymentDate) return "Please enter payment date.";
      if (mode === SOURCE_TYPES.invoice) {
        const invoiceRemaining = invoiceRemainingAmount(selectedInvoice);
        if (invoiceRemaining > MONEY_TOLERANCE && amount > invoiceRemaining + MONEY_TOLERANCE) {
          return "Received amount cannot exceed invoice remaining amount.";
        }
      }
      if (mode === SOURCE_TYPES.contract) {
        if (activePaymentRequest) {
          if (activePaymentRequest.remainingAmount <= MONEY_TOLERANCE) {
            return "This payment request has already been fully paid.";
          }
          if (amount > activePaymentRequest.remainingAmount + MONEY_TOLERANCE) {
            return "Received amount cannot exceed the payment request's remaining amount.";
          }
        } else if (selectedContractTotalAmount > MONEY_TOLERANCE) {
          if (contractOutstandingAmount <= MONEY_TOLERANCE) return "This contract has already been fully paid.";
          if (amount > contractOutstandingAmount + MONEY_TOLERANCE) {
            return "Received amount cannot exceed contract remaining amount.";
          }
        }
      }
      return "";
    };

    const buildPaymentPayload = async () => {
      if (mode === SOURCE_TYPES.invoice) {
        const invoiceId = extractId(form.invoiceId);
        const remaining = invoiceRemainingAmount(selectedInvoice);
        const paymentStatus = remaining > MONEY_TOLERANCE
          ? deriveActualPaymentStatus(form.amount, remaining)
          : form.paymentStatus || "Received";
        const context = {
          invoiceId,
          contractId: resolveContractId(selectedInvoice) || extractId(form.contractId),
          customerId: resolveCustomerId(selectedInvoice) || extractId(form.customerId),
          internalCompanyId: resolveCompanyId(selectedInvoice) || extractId(form.internalCompanyId),
        };
        return {
          payload: {
            ...buildCommonPaymentPayload({ form: { ...form, mode, paymentStatus }, context }),
            sourceKey: invoiceSourceKey(invoiceId, form.paymentRefer),
          },
          updateExistingId: null,
        };
      }

      if (mode === SOURCE_TYPES.manual) {
        const context = {
          customerId: extractId(form.customerId),
          internalCompanyId: extractId(form.internalCompanyId),
        };
        return {
          payload: {
            ...buildCommonPaymentPayload({ form: { ...form, mode }, context }),
            sourceKey: manualSourceKey(form.paymentRefer),
          },
          updateExistingId: null,
        };
      }

      const contractId = extractId(form.contractId);
      const amount = parseNum(form.amount);
      const latestPayments = await listPaymentsByContract(contractId);
      const contract = selectedContract || {};
      const context = {
        contractId,
        customerId: resolveCustomerId(contract) || extractId(form.customerId),
        internalCompanyId: resolveCompanyId(contract) || extractId(form.internalCompanyId),
        lawyerId: extractId(contract.lawyerId) || extractId(contract.lawyer) || extractId(contract.assignees),
      };

      if (activePaymentRequest?.id) {
        const requestId = activePaymentRequest.id;
        const latestRequestPaid = summarizeActualPayments(
          latestPayments.filter((p) => extractId(p?.paymentRequestId) === requestId),
        );
        const remainingBefore = Math.max(activePaymentRequest.requestedAmount - latestRequestPaid, 0);
        if (remainingBefore <= MONEY_TOLERANCE) {
          throw new Error("This payment request has already been fully paid.");
        }
        if (amount > remainingBefore + MONEY_TOLERANCE) {
          throw new Error("Received amount cannot exceed the payment request's remaining amount.");
        }
        const paymentStatus = deriveActualPaymentStatus(amount, remainingBefore);
        const baseKey = basePaymentRequestSourceKey(requestId);
        const existingBase = await findPaymentBySourceKey(baseKey);
        const hasBaseActual = existingBase && isActualPaymentFilled(existingBase);
        const sourceKey = hasBaseActual
          ? actualPaymentRequestSourceKey(requestId, form.paymentRefer)
          : baseKey;
        const existingActual = hasBaseActual ? await findPaymentBySourceKey(sourceKey) : null;

        if (existingActual) {
          throw new Error("A payment with the same reference already exists for this payment request.");
        }

        return {
          payload: {
            ...buildCommonPaymentPayload({ form: { ...form, mode: SOURCE_TYPES.contract, paymentStatus }, context }),
            sourceKey,
            scheduleItemId: activePaymentRequest.scheduleItemId || null,
            plannedAmount: activePaymentRequest.requestedAmount || null,
          },
          updateExistingId: existingBase && !hasBaseActual && !isFinalStatus(existingBase.paymentStatus)
            ? extractId(existingBase)
            : null,
        };
      }

      // Reached for Retainer, or a legacy By Case/By Service contract with
      // no paymentRequests yet — everything else goes through the
      // activePaymentRequest branch above (validate() blocks submission
      // before this point whenever showPaymentRequestPicker is true and
      // nothing has been picked).
      const totalAmount = contractTotalAmount(contract);
      const paidAmount = summarizeActualPayments(latestPayments);
      const remainingBefore = totalAmount > MONEY_TOLERANCE
        ? Math.max(totalAmount - paidAmount, 0)
        : 0;
      if (totalAmount > MONEY_TOLERANCE) {
        if (remainingBefore <= MONEY_TOLERANCE) {
          throw new Error("This contract has already been fully paid.");
        }
        if (amount > remainingBefore + MONEY_TOLERANCE) {
          throw new Error("Received amount cannot exceed contract remaining amount.");
        }
      }
      const paymentStatus = remainingBefore > MONEY_TOLERANCE
        ? deriveActualPaymentStatus(amount, remainingBefore)
        : form.paymentStatus || "Received";
      const sourceKey = contractDirectSourceKey(contractId, form.paymentRefer);
      const existingDirect = await findPaymentBySourceKey(sourceKey);

      if (existingDirect) {
        throw new Error("A payment with the same reference already exists for this contract.");
      }

      return {
        payload: {
          ...buildCommonPaymentPayload({ form: { ...form, mode: SOURCE_TYPES.contract, paymentStatus }, context }),
          sourceKey,
        },
        updateExistingId: null,
      };
    };

    const handleSubmit = async () => {
      const error = validate();
      if (error) {
        message.warning(error);
        return;
      }
      setSaving(true);
      try {
        const { payload, updateExistingId } = await buildPaymentPayload();
        const savedPayment = await savePaymentWithRequestFallback({ updateExistingId, payload });
        await syncPaymentRequestItemAfterPayment({ payment: savedPayment || { id: updateExistingId }, form });
        message.success("Payment saved successfully.");
        isDirtyRef.current = false;
        setForm((prev) => ({
          ...prev,
          amount: null,
          paymentRefer: "",
          internalNote: "",
        }));
        if (mode === SOURCE_TYPES.contract && form.contractId) {
          const payments = await listPaymentsByContract(form.contractId);
          setContractPayments(payments || []);
          if (activePaymentRequest?.id && isPaymentRequestFullyPaid(activePaymentRequest, payments || [])) {
            setActivePaymentRequest(null);
          }
        }
        setTimeout(closeCurrentModal, 250);
      } catch (error) {
        console.error("[PaymentCreateBlock] submit failed", error);
        message.error(error?.message || "Could not save payment.");
      } finally {
        setSaving(false);
      }
    };

    if (loading && !invoices.length && !contracts.length) {
      return React.createElement(
        "div",
        { style: { padding: 48, textAlign: "center" } },
        React.createElement(Spin, null),
      );
    }

    const activePaymentRequestSummary = activePaymentRequest
      ? React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            columnGap: 24,
            marginTop: showPaymentRequestPicker ? 16 : 0,
          },
        },
        React.createElement(ContractSummaryItem, {
          label: "This request",
          value: activePaymentRequest.title,
        }),
        React.createElement(ContractSummaryItem, {
          label: "Requested",
          value: formatMoney(activePaymentRequest.requestedAmount),
        }),
        React.createElement(ContractSummaryItem, {
          label: "Already received",
          value: formatMoney(activePaymentRequest.paidAmount),
        }),
        React.createElement(ContractSummaryItem, {
          label: "Remaining on this request",
          value: formatMoney(activePaymentRequest.remainingAmount),
          strong: true,
        }),
      )
      : null;

    return React.createElement(
      "div",
      { style: { width: "100%" }, onChange: markDirty, onInput: markDirty },
      React.createElement(
        Card,
        { size: "small", title: "Create payment" },
        React.createElement(
          Space,
          { direction: "vertical", size: 16, style: { width: "100%" } },
          React.createElement(
            Form,
            { layout: "vertical" },
            React.createElement(
              "div",
              { style: { display: "flex", flexWrap: "wrap", gap: 16 } },
              React.createElement(
                Form.Item,
                { label: "Mode", required: true, style: { flex: "0 1 200px", minWidth: 160, marginBottom: 0 } },
                React.createElement(Select, {
                  value: mode,
                  onChange: handleModeChange,
                  options: [
                    { label: "By invoice", value: SOURCE_TYPES.invoice },
                    { label: "By contract", value: SOURCE_TYPES.contract },
                    { label: "Manual", value: SOURCE_TYPES.manual },
                  ],
                }),
              ),
              mode === SOURCE_TYPES.invoice &&
              React.createElement(
                Form.Item,
                { label: "Invoice", required: true, style: { flex: "1 1 280px", minWidth: 220, marginBottom: 0 } },
                React.createElement(Select, {
                  showSearch: true,
                  allowClear: true,
                  value: form.invoiceId || undefined,
                  placeholder: "Select invoice",
                  optionFilterProp: "label",
                  onChange: handleInvoiceChange,
                  options: invoices.map((item) => ({
                    value: extractId(item),
                    label: invoiceLabel(item),
                  })),
                }),
              ),
              mode === SOURCE_TYPES.contract &&
              React.createElement(
                Form.Item,
                { label: "Contract", required: true, style: { flex: "1 1 280px", minWidth: 220, marginBottom: 0 } },
                React.createElement(Select, {
                  showSearch: true,
                  allowClear: true,
                  value: form.contractId || undefined,
                  placeholder: "Select contract",
                  optionFilterProp: "label",
                  onChange: loadContractContext,
                  options: contracts.map((item) => ({
                    value: extractId(item),
                    label: contractLabel(item),
                  })),
                }),
              ),
              mode === SOURCE_TYPES.manual &&
              React.createElement(
                Form.Item,
                { label: "Customer", required: true, style: { flex: "1 1 280px", minWidth: 220, marginBottom: 0 } },
                React.createElement(Select, {
                  showSearch: true,
                  allowClear: true,
                  value: form.customerId || undefined,
                  placeholder: "Select customer",
                  optionFilterProp: "label",
                  onChange: (value) => setF("customerId", value || ""),
                  options: customers.map((item) => ({
                    value: extractId(item),
                    label: customerLabel(item),
                  })),
                }),
              ),
            ),
            React.createElement(
              "div",
              {
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16,
                  marginTop: 16,
                },
              },
              mode !== SOURCE_TYPES.manual &&
              React.createElement(
                Form.Item,
                { label: "Customer" },
                React.createElement(Input, {
                  value: selectedCustomer ? customerLabel(selectedCustomer) : form.customerId || "",
                  disabled: true,
                }),
              ),
              React.createElement(
                Form.Item,
                { label: "Internal company", required: true },
                React.createElement(Select, {
                  showSearch: true,
                  allowClear: true,
                  value: form.internalCompanyId || undefined,
                  placeholder: "Select company",
                  optionFilterProp: "label",
                  onChange: (value) => setF("internalCompanyId", value || ""),
                  options: companies.map((item) => ({
                    value: extractId(item),
                    label: companyLabel(item),
                  })),
                }),
              ),
              React.createElement(
                Form.Item,
                { label: "Accounting" },
                React.createElement(Select, {
                  showSearch: true,
                  allowClear: true,
                  value: form.accountingUserId || undefined,
                  placeholder: "Select accounting user",
                  optionFilterProp: "label",
                  onChange: (value) => setF("accountingUserId", value || ""),
                  options: accountingUsers.map((item) => ({
                    value: extractId(item),
                    label: userLabel(item),
                  })),
                }),
              ),
            ),
            mode === SOURCE_TYPES.contract &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(
                Divider,
                { orientation: "left" },
                showPaymentRequestPicker ? "Payment requests" : activePaymentRequest ? "Payment request" : "Contract payment",
              ),
              !form.contractId
                ? React.createElement(
                  Typography.Text,
                  { type: "secondary" },
                  "Select a contract to load payment information.",
                )
                : React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 12,
                      },
                    },
                    React.createElement(
                      Tag,
                      { color: contractPaymentStatusMeta(selectedContract?.paymentStatus).color },
                      contractPaymentStatusMeta(selectedContract?.paymentStatus).label,
                    ),
                    showPaymentRequestPicker || activePaymentRequest
                      ? React.createElement(
                        Typography.Text,
                        { type: "secondary" },
                        `Contract outstanding: ${formatMoney(contractOutstandingAmount)}`,
                      )
                      : null,
                    requestServiceNames.length
                      ? React.createElement(
                        Space,
                        { size: 4, wrap: true },
                        React.createElement(Typography.Text, { type: "secondary" }, "Service(s):"),
                        requestServiceNames.map((name) => React.createElement(Tag, { key: name }, name)),
                      )
                      : null,
                  ),
                  showPaymentRequestPicker
                  ? React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(Table, {
                  rowKey: "id",
                  size: "small",
                  pagination: false,
                  dataSource: contractPaymentRequests,
                  scroll: { x: 750 },
                  rowSelection: {
                    type: "checkbox",
                    selectedRowKeys: activePaymentRequest?.id ? [activePaymentRequest.id] : [],
                    onChange: (selectedRowKeys, selectedRows) => {
                      const currentId = activePaymentRequest?.id;
                      const newId = selectedRowKeys.find((key) => String(key) !== String(currentId));
                      if (newId === undefined) {
                        handleClearPaymentRequestSelection();
                        return;
                      }
                      const row = selectedRows.find((r) => String(extractId(r.id)) === String(newId));
                      if (row) handleContractPaymentRequestSelect(row);
                    },
                    getCheckboxProps: (row) => ({
                      disabled: isPaymentRequestFullyPaid(row),
                    }),
                  },
                  onRow: (row) => ({
                    style: isPaymentRequestFullyPaid(row) ? { opacity: 0.58 } : {},
                    onClick: () => {
                      if (!isPaymentRequestFullyPaid(row)) handleContractPaymentRequestSelect(row);
                    },
                  }),
                  columns: [
                    {
                      title: "Payment request",
                      dataIndex: "title",
                      width: 200,
                      render: (value, row) => value || `Payment request #${extractId(row.id)}`,
                    },
                    {
                      title: "Due date",
                      dataIndex: "dueDate",
                      width: 100,
                      render: formatDate,
                    },
                    {
                      title: "Requested",
                      dataIndex: "requestedAmount",
                      width: 120,
                      align: "right",
                      render: formatMoney,
                    },
                    {
                    title: "Received",
                    width: 120,
                    align: "right",
                    render: (_, row) => formatMoney(paymentRequestPaidAmount(row)),
                  },
                  {
                    title: "Remaining",
                    width: 120,
                    align: "right",
                    render: (_, row) => formatMoney(paymentRequestRemainingAmount(row)),
                  },
                  {
                    title: "Status",
                    width: 90,
                    render: (_, row) => {
                      const paid = paymentRequestPaidAmount(row);
                      const remaining = paymentRequestRemainingAmount(row);
                      const color = remaining <= 0 ? "success" : paid > 0 ? "warning" : "default";
                      const label = remaining <= 0 ? "Received" : paid > 0 ? "Partial" : "Planned";
                      return React.createElement(Tag, { color }, label);
                      },
                    },
                  ],
                }),
                    activePaymentRequestSummary,
                  )
                : activePaymentRequest
                ? activePaymentRequestSummary
                : React.createElement(
                  "div",
                  {
                    style: {
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      columnGap: 24,
                    },
                  },
                  React.createElement(ContractSummaryItem, {
                    label: "Contract value",
                    value: selectedContractTotalAmount > MONEY_TOLERANCE ? formatMoney(selectedContractTotalAmount) : "-",
                  }),
                  React.createElement(ContractSummaryItem, {
                    label: "Received",
                    value: formatMoney(contractPaidAmount),
                  }),
                  React.createElement(ContractSummaryItem, {
                    label: "Remaining",
                    value: selectedContractTotalAmount > MONEY_TOLERANCE ? formatMoney(contractOutstandingAmount) : "-",
                    strong: true,
                  }),
                  isSelectedRetainerPayment
                    ? React.createElement(ContractSummaryItem, {
                        label: "Next payment",
                        value: formatDate(selectedRetainerNextPaymentDate),
                      })
                    : null,
                ),
              ),
            ),
            React.createElement(Divider, { orientation: "left" }, "Actual payment"),
            React.createElement(
              "div",
              {
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                },
              },
              React.createElement(
                Form.Item,
                { label: "Payment method", required: true },
                React.createElement(Select, {
                  value: form.paymentMethod || undefined,
                  onChange: (value) => setF("paymentMethod", value || ""),
                  options: ["Cash", "Bank transfer", "Credit card", "Other"].map((value) => ({ value, label: value })),
                }),
              ),
              React.createElement(
                Form.Item,
                { label: "Payment status", required: true },
                React.createElement(Select, {
                  value: form.paymentStatus || undefined,
                  onChange: (value) => setF("paymentStatus", value || ""),
                  disabled: mode !== SOURCE_TYPES.manual,
                  options: ["Received", "Pending", "Partial", "Planned", "Cancelled"].map((value) => ({ value, label: value })),
                }),
              ),
              React.createElement(
                Form.Item,
                { label: "Payment date", required: true },
                React.createElement(Input, {
                  type: "datetime-local",
                  value: form.paymentDate || "",
                  onChange: (event) => setF("paymentDate", event.target.value),
                }),
              ),
              React.createElement(
                Form.Item,
                { label: "Amount", required: true },
                React.createElement(Input, {
                  value: amountDraft,
                  inputMode: "numeric",
                  style: { width: "100%" },
                  placeholder: "0",
                  onChange: (event) => handleAmountChange(event.target.value),
                  addonAfter: "VND",
                }),
              ),
            ),
            React.createElement(
              Form.Item,
              { label: "Payment reference" },
              React.createElement(Input, {
                value: form.paymentRefer || "",
                placeholder: "Bank transaction code, receipt code, note...",
                onChange: (event) => setF("paymentRefer", event.target.value),
              }),
            ),
            React.createElement(
              "div",
              { style: { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: 12 } },
              React.createElement(
                Space,
                { wrap: true },
                React.createElement(Button, {
                  onClick: () => requestClose(),
                }, "Cancel"),
                React.createElement(Button, {
                  type: "primary",
                  loading: saving,
                  onClick: handleSubmit,
                }, "Submit"),
              ),
            ),
          ),
        ),
      ),
    );
  };

  ctx.render(React.createElement(PaymentCreateBlock));
