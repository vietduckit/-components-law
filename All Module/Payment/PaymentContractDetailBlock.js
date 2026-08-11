const { React } = ctx;
const { useEffect, useMemo, useState } = React;
const {
  Select,
  Spin,
  Table,
  message,
} = ctx.antd;

const PAYMENT_RESOURCES = ["payments", "Payment", "payment"];
const INVOICE_RESOURCES = ["invoices", "Invoice", "invoice"];
const CONTRACT_RESOURCES = ["contracts", "Contract", "contract"];
const USER_RESOURCES = ["users"];
const ACCOUNTING_USER_FIELD = "users";

const MONEY_TOLERANCE = 0;
const ACTUAL_PAYMENT_STATUSES = ["received", "paid", "completed", "partial"];
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

const resolveRetainerNextPaymentDate = (contract, schedule) => {
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

const normalizeModeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const customerLabel = (record) =>
  compact([
    firstPresent(record, ["customerName", "name", "fullName", "displayName", "companyName"]),
    firstPresent(record, ["customerCode", "code"]) ? `(${firstPresent(record, ["customerCode", "code"])})` : "",
  ]).join(" ") || (record?.id ? `Customer #${record.id}` : "-");

const contractLabel = (record) =>
  compact([
    firstPresent(record, ["contractCode", "contractNumber", "code"]),
    firstPresent(record, ["contractName", "name", "title"]),
  ]).join(" - ") || (record?.id ? `Contract #${record.id}` : "-");

const userLabel = (record) =>
  compact([
    firstPresent(record, ["nickname", "displayName", "name", "username", "email"]),
    firstPresent(record, ["email"]) &&
    firstPresent(record, ["email"]) !== firstPresent(record, ["nickname", "displayName", "name", "username", "email"])
      ? `(${firstPresent(record, ["email"])})`
      : "",
  ]).join(" ") || (record?.id ? `User #${record.id}` : "-");

const resolveAccountingId = (record) =>
  extractId(record?.[ACCOUNTING_USER_FIELD]);

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

  const monthlyFee = parseNum(contract?.monthlyFee);
  const duration = parseNum(contract?.retainerDuration);
  if (monthlyFee > MONEY_TOLERANCE && duration > MONEY_TOLERANCE) return monthlyFee * duration;

  return 0;
};

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

  const installments = (Array.isArray(schedule.installments) ? schedule.installments : [])
    .map((item, index) => {
      const scheduleItemId = item.scheduleItemId || item.id || `payment-${index + 1}`;
      const percentage = item.percentage ?? null;
      const amount =
        parseNum(item.amount ?? item.plannedAmount ?? item.totalAmount) ||
        (percentage ? Math.round((baseAmount * parseNum(percentage)) / 100) : 0);
      return {
        ...item,
        id: scheduleItemId,
        scheduleItemId,
        installmentNo: item.installmentNo || item.sortOrder || index + 1,
        sortOrder: item.sortOrder || index + 1,
        label: item.label || item.installmentLabel || item.installment || `Installment ${index + 1}`,
        content: item.content || item.description || item.note || item.timingNote || "",
        paymentDate: item.paymentDate || item.dueDate || item.date || "",
        percentage,
        amount,
      };
    })
    .filter((item) => item.label || item.paymentDate || item.amount > 0);

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

const statusTag = (status) => {
  const key = normalizeStatus(status);
  const labelMap = {
    paid: "Received",
    received: "Received",
    completed: "Completed",
    partial: "Partial",
    pending: "Pending",
    planned: "Planned",
    cancelled: "Voided",
    canceled: "Voided",
    void: "Voided",
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

const InfoLine = ({ label, value }) =>
  React.createElement(
    "div",
    { style: { minWidth: 0 } },
    React.createElement("div", { style: { color: "rgba(0,0,0,0.45)", fontSize: 12, marginBottom: 4 } }, label),
    React.createElement("div", { style: { fontWeight: 500, wordBreak: "break-word" } }, value || "-"),
  );

const MetricBox = ({ label, value, sub }) =>
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
          color: "rgba(0,0,0,0.88)",
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

const PaymentContractDetailBlock = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(contextRecord || null);
  const [invoice, setInvoice] = useState(null);
  const [contract, setContract] = useState(null);
  const [contractPayments, setContractPayments] = useState([]);
  const [accountingUsers, setAccountingUsers] = useState([]);
  const [savingAccounting, setSavingAccounting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!RECORD_ID) {
        setError("No payment id found.");
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
            ? await getAny(CONTRACT_RESOURCES, contractId, { appends: ["customers"] }).catch(() => null)
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
      } catch (loadError) {
        console.error("[PaymentContractDetailBlock] load failed", loadError);
        if (mounted) setError(loadError?.message || "Could not load payment contract context.");
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
      message.error("Could not update accounting owner.");
      setSavingAccounting(false);
      return;
    }

    const selectedUser = accountingUsers.find((user) => String(extractId(user)) === String(userId)) || null;
    setPayment((prev) => ({
      ...(prev || {}),
      ...(updated || {}),
      [ACCOUNTING_USER_FIELD]: selectedUser,
    }));
    message.success("Accounting owner updated.");
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
    const recognizedPaymentAmount =
      !isInactiveStatus(payment?.paymentStatus) && isActualPaidStatus(payment?.paymentStatus)
        ? parseNum(payment?.amount)
        : 0;
    const coveragePercent = totalAmount > MONEY_TOLERANCE
      ? Math.min(100, Math.round((paidAmount * 10000) / totalAmount) / 100)
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
    return React.createElement("div", { style: { padding: 12, color: "#8c5a00" } }, "Payment data is not available.");
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
    placeholder: "Select owner",
    optionFilterProp: "label",
    style: { width: "100%" },
    options: accountingOptions,
    onChange: handleAccountingChange,
  });

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
          gap: 12,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "minmax(180px, 1fr) minmax(220px, 1fr)",
            gap: 12,
          },
        },
        React.createElement(InfoLine, {
          label: "Invoice",
          value: invoice
            ? firstPresent(invoice, ["invoiceNumber", "invoiceCode", "code"]) || `Invoice #${extractId(invoice)}`
            : "-",
        }),
        React.createElement("div", null, React.createElement("div", {
          style: { color: "rgba(0,0,0,0.45)", fontSize: 12, marginBottom: 4 },
        }, "Accounting owner"), accountingSelect),
      ),
      React.createElement(MetricBox, {
        label: "This payment",
        value: isActualPaidStatus(payment.paymentStatus) && !isInactiveStatus(payment.paymentStatus)
          ? formatMoney(payment.amount)
          : "0 VND",
      }),
    );
  }

  const paymentPlanValue = model.currentInstallment
    ? model.currentInstallment.label
    : model.isInstallmentContract
      ? "Unassigned installment"
      : model.isRetainerContract
        ? "Retainer recurring payment"
        : "Direct contract payment";

  return React.createElement(
    "div",
    {
      style: {
        border: "1px solid #e5e5e5",
        borderRadius: 6,
        background: "#fff",
        padding: 14,
        display: "grid",
        gap: 12,
      },
    },
    React.createElement(
      "div",
      { style: { display: "grid", gap: 12 } },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          },
        },
        React.createElement(InfoLine, { label: "Contract", value: contractLabel(contract) }),
        React.createElement(InfoLine, { label: "Customer", value: customerLabel(model.customer) }),
        React.createElement(InfoLine, { label: "Allocation", value: paymentPlanValue }),
        React.createElement("div", null, React.createElement("div", {
          style: { color: "rgba(0,0,0,0.45)", fontSize: 12, marginBottom: 4 },
        }, "Accounting owner"), accountingSelect),
      ),
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
          label: "This payment",
          value: formatMoney(model.recognizedPaymentAmount),
        }),
        React.createElement(MetricBox, {
          label: "Contract collected",
          value: formatMoney(model.paidAmount),
          sub: model.totalAmount ? `Contract value ${formatMoney(model.totalAmount)}` : "",
        }),
        React.createElement(MetricBox, {
          label: "Balance due",
          value: model.totalAmount ? formatMoney(model.remainingAmount) : "-",
        }),
        model.isRetainerContract
          ? React.createElement(MetricBox, {
              label: "Next payment",
              value: formatDate(model.retainerNextPaymentDate),
            })
          : null,
        React.createElement(MetricBox, {
          label: "Collection progress",
          value: model.totalAmount ? `${model.coveragePercent}%` : "-",
        }),
      ),
      model.isInstallmentContract
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "div",
              {
                style: {
                  paddingTop: 2,
                  color: "rgba(0,0,0,0.72)",
                  fontSize: 13,
                  fontWeight: 500,
                },
              },
              "Installment progress",
            ),
            React.createElement(
              "div",
              {
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 10,
                },
              },
              React.createElement(MetricBox, {
                label: "Fully paid installments",
                value: `${model.completedInstallments}/${model.installmentRows.length}`,
              }),
              React.createElement(MetricBox, {
                label: "Installments with receipts",
                value: String(model.touchedInstallments),
              }),
              React.createElement(MetricBox, {
                label: "Partial installments",
                value: String(model.partialInstallments),
              }),
            ),
            React.createElement(Table, {
              style: { marginTop: 12 },
              rowKey: "scheduleItemId",
              size: "small",
              pagination: false,
              dataSource: model.installmentRows,
              scroll: { x: 900 },
              columns: [
                {
                  title: "Installment",
                  dataIndex: "label",
                  width: 180,
                  render: (value, row) =>
                    React.createElement(
                      "span",
                      { style: { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" } },
                      React.createElement("span", { style: { fontWeight: 500 } }, value || `Installment ${row.installmentNo}`),
                      model.currentInstallment && String(row.scheduleItemId) === String(model.currentInstallment.scheduleItemId)
                        ? React.createElement(
                            "span",
                            { style: { color: "rgba(0,0,0,0.45)", fontSize: 12, fontWeight: 500 } },
                            "current",
                          )
                        : null,
                    ),
                },
                { title: "Due date", dataIndex: "paymentDate", width: 120, render: formatDate },
                { title: "Planned", dataIndex: "amount", width: 140, align: "right", render: formatMoney },
                { title: "Received", dataIndex: "paidAmount", width: 140, align: "right", render: formatMoney },
                { title: "Remaining", dataIndex: "remainingAmount", width: 140, align: "right", render: formatMoney },
                {
                  title: "Status",
                  dataIndex: "computedStatus",
                  width: 110,
                  render: statusTag,
                },
              ],
            }),
          )
        : null,
    ),
  );
};

ctx.render(React.createElement(PaymentContractDetailBlock));
