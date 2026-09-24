const { React } = ctx;
const { useState, useEffect, useRef } = React;
const {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Table,
  message,
} = ctx.antd;

const INVOICE_RESOURCES = ["invoices"];
const PAYMENT_REQUEST_RESOURCES = ["paymentRequests"];
const PAYMENT_RESOURCES = ["payments"];
const CONTRACT_RESOURCES = ["contracts"];
const LAWYER_RESOURCES = ["lawyers"];
const INTERNAL_COMPANY_RESOURCES = ["internalCompany"];

const MODE = { paymentRequest: "paymentRequest", payments: "payments" };

const MONEY_TOLERANCE = 0;

// Deep-link support: this block seeds directly from a Payment Request when
// opened from that record's own context (e.g. a "Create invoice" action on
// a Payment Request's detail page) — same multi-source fallback chain as
// PaymentCreateBlock.js's seedPaymentRequestId.
const contextRecord =
  ctx.record || ctx.popup?.record || ctx.state?.record || ctx.data?.record || ctx.recordData || null;

const getUrlParam = (name) => {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return params.get(name);
  } catch {
    return null;
  }
};

const extractId = (value) => {
  if (Array.isArray(value)) return extractId(value[0]);
  const raw = value && typeof value === "object" ? value.id || value._id : value;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const seedPaymentRequestId =
  extractId(ctx.view?.inputArgs?.paymentRequestId) ||
  extractId(ctx.popup?.params?.paymentRequestId) ||
  extractId(ctx.params?.paymentRequestId) ||
  extractId(contextRecord?.paymentRequestId) ||
  extractId(contextRecord?.paymentRequest) ||
  extractId(getUrlParam("paymentRequestId"));

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

// Never throws on a malformed datetime-local value — falls back to the raw
// string instead of letting `new Date(...).toISOString()` throw a
// RangeError inside handleSubmit's try block (which would otherwise surface
// as the unhelpful "Invalid time value" message).
const toIsoDateTime = (value) => {
  if (!value) return null;
  const raw = String(value);
  const date = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? raw : date.toISOString();
};

const unwrapRecord = (res) => res?.data?.data || res?.data || null;

const unwrapList = (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const apiRequestAny = async (resources, action, options = {}) => {
  let lastError = null;
  for (const resource of resources) {
    try {
      return await ctx.api.request({ url: `${resource}:${action}`, ...options });
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
  const res = await apiRequestAny(resources, "get", { params: { filterByTk: id, ...params } });
  return unwrapRecord(res);
};

const updateAny = async (resources, id, data) => {
  const res = await apiRequestAny(resources, "update", { method: "POST", params: { filterByTk: id }, data });
  return unwrapRecord(res);
};

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

// Field priority verified against Lead/LeadFormContextTest.js's proven
// internalCompanyLabel() — this collection's real name field is
// "shortName", not "name" (which InvoiceCreateBlock originally guessed).
const companyLabel = (record) =>
  compact([firstPresent(record, ["shortName", "name", "legalName", "companyCode"])]).join(" ") ||
  (record?.id ? `Company #${record.id}` : "-");

// Field priority verified against Contract/ContractCreateForm.js's proven
// lawyerLabel() — the lawyers collection's real name field is "lawyerName",
// which the original guess here ("fullName" first) never matched, hence
// every option falling through to the "Lawyer #<id>" placeholder.
const lawyerLabel = (record) =>
  compact([firstPresent(record, ["lawyerName", "fullName", "nickname", "username", "name", "displayName"])]).join(" ") ||
  (record?.id ? `Lawyer #${record.id}` : "-");

const capitalizeFirst = (value) => {
  const s = String(value || "");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
};

// A NocoBase belongsTo relation comes back as either a single object or a
// 1-item array depending on the endpoint — normalize once here instead of
// at every call site.
const relationRecord = (value) => {
  if (Array.isArray(value)) return value.find((item) => item && typeof item === "object") || null;
  return value && typeof value === "object" ? value : null;
};

const resolveCustomerId = (record) =>
  extractId(record?.customerId) || extractId(record?.customers) || extractId(record?.customer);

const resolveCompanyId = (record) =>
  extractId(record?.internalCompanyId) || extractId(record?.internalCompany);

const InfoLine = ({ label, value, minWidth = 110 }) =>
  React.createElement(
    "div",
    { style: { flex: "0 1 auto", minWidth } },
    React.createElement("div", { style: { color: "rgba(0,0,0,0.45)", fontSize: 12, marginBottom: 4 } }, label),
    React.createElement("div", { style: { fontWeight: 500, wordBreak: "break-word" } }, value || "-"),
  );

const FieldRow = ({ children }) =>
  React.createElement(
    "div",
    { style: { display: "flex", flexWrap: "wrap", columnGap: 32, rowGap: 12 } },
    children,
  );

// Uniform input-field grid (for actual form controls, unlike FieldRow which
// is for content-sized read-only display). A fixed 4-column grid needs real
// media-query breakpoints to stay responsive — inline style objects can't
// express those — so this follows the same <style>+className pattern already
// used by Case/CaseMatterDashboardBlock.js in this codebase.
const FIELD_GRID_STYLE = `
  .invoice-field-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }
  @media (max-width: 900px) {
    .invoice-field-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 520px) {
    .invoice-field-grid { grid-template-columns: 1fr; }
  }
`;

const FieldGrid = ({ children }) =>
  React.createElement("div", { className: "invoice-field-grid" }, children);

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
      ? React.createElement("div", { style: { fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.72)" } }, title)
      : null,
    children,
  );

const InvoiceCreateBlock = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState(MODE.paymentRequest);
  const [contracts, setContracts] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [internalCompanies, setInternalCompanies] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractPaymentRequests, setContractPaymentRequests] = useState([]);
  const [activePaymentRequest, setActivePaymentRequest] = useState(null);
  const [contractPayments, setContractPayments] = useState([]);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  // Bumped on every loadContractContext/mode change call — an in-flight
  // load whose token no longer matches the current one discards its
  // result instead of overwriting newer state with stale data.
  const loadRequestIdRef = useRef(0);

  const [form, setForm] = useState({
    contractId: "",
    customerId: "",
    internalCompanyId: "",
    paymentRequestId: "",
    invoiceName: "",
    invoiceType: "advance",
    status: "draft",
    issuedDate: nowDateTimeInput(),
    deadline: "",
    totalAmount: null,
    description: "",
    assignees: "",
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      listAny(CONTRACT_RESOURCES, { pageSize: 500, sort: ["-createdAt"] }).catch(() => []),
      listAny(LAWYER_RESOURCES, { pageSize: 500 }).catch(() => []),
      listAny(INTERNAL_COMPANY_RESOURCES, { pageSize: 500 }).catch(() => []),
    ]).then(([contractRows, lawyerRows, companyRows]) => {
      if (!mounted) return;
      setContracts(contractRows || []);
      setLawyers(lawyerRows || []);
      setInternalCompanies(companyRows || []);
    });
    return () => { mounted = false; };
  }, []);

  const setF = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const emptyFormForMode = () => ({
    contractId: "",
    customerId: "",
    internalCompanyId: "",
    paymentRequestId: "",
    invoiceName: "",
    invoiceType: "advance",
    status: "draft",
    issuedDate: nowDateTimeInput(),
    deadline: "",
    totalAmount: null,
    description: "",
    assignees: "",
  });

  // Shared by handleModeChange and the post-submit success path — clears
  // every piece of per-contract/per-selection state in one place so the
  // two call sites can't drift out of sync again (they already did once,
  // see §Task 7 Review Focus #4 in the plan).
  const resetSelectionState = () => {
    setForm(emptyFormForMode());
    setSelectedContract(null);
    setContractPaymentRequests([]);
    setActivePaymentRequest(null);
    setContractPayments([]);
    setSelectedPaymentIds([]);
  };

  // Only the mode-specific selection (which table, which rows) — unlike
  // resetSelectionState this deliberately leaves contractId/selectedContract/
  // customerId/internalCompanyId untouched, so switching Mode with a contract
  // already picked re-renders the data below instead of losing the contract.
  const clearModeSelection = () => {
    setContractPaymentRequests([]);
    setActivePaymentRequest(null);
    setContractPayments([]);
    setSelectedPaymentIds([]);
  };

  // Fetches the mode-specific table (Payment Requests or uninvoiced
  // Payments) for an already-known contract — shared by loadContractContext
  // (new contract picked) and handleModeChange (same contract, mode
  // switched) so the two can't drift out of sync.
  const loadModeSpecificData = async (contractId, requestMode, requestId) => {
    setLoading(true);
    try {
      if (requestMode === MODE.paymentRequest) {
        const paymentRequests = await listAny(PAYMENT_REQUEST_RESOURCES, {
          pageSize: 500,
          filter: JSON.stringify({ contractId: { $eq: contractId } }),
          fields: ["id", "title", "requestedAmount", "status"],
        }).catch(() => []);
        const prIds = compact((paymentRequests || []).map((pr) => extractId(pr.id)));
        const alreadyInvoiced = prIds.length
          ? await listAny(INVOICE_RESOURCES, {
              pageSize: 500,
              filter: JSON.stringify({ paymentRequestId: { $in: prIds } }),
              fields: ["id", "paymentRequestId"],
            }).catch(() => [])
          : [];
        if (loadRequestIdRef.current !== requestId) return; // a newer load/mode-change has since started
        // Not routed through compact() — compact() stringifies for display
        // purposes, which would put "3" (string) in the Set while
        // extractId(pr.id) below returns 3 (number); Set.has() uses strict
        // equality, so that mismatch would silently defeat every exclusion.
        const invoicedPrIds = new Set(
          (alreadyInvoiced || [])
            .map((inv) => extractId(inv.paymentRequestId))
            .filter((id) => id !== null && id !== undefined),
        );
        const availablePaymentRequests = (paymentRequests || []).filter((pr) => {
          const status = String(pr.status || "").toLowerCase();
          if (status.includes("cancel") || status.includes("reject")) return false;
          return !invoicedPrIds.has(extractId(pr.id));
        });
        setContractPaymentRequests(availablePaymentRequests);
      } else {
        const payments = await listAny(PAYMENT_RESOURCES, {
          pageSize: 500,
          filter: JSON.stringify({
            contractId: { $eq: contractId },
            invoiceId: { $is: null },
          }),
          fields: ["id", "paymentNumber", "amount", "paymentStatus", "paymentDate"],
        }).catch(() => []);
        if (loadRequestIdRef.current !== requestId) return;
        setContractPayments(payments || []);
      }
    } catch (error) {
      console.error("[InvoiceCreateBlock] load mode data failed", error);
      if (loadRequestIdRef.current === requestId) message.error("Could not load data for this contract.");
    } finally {
      if (loadRequestIdRef.current === requestId) setLoading(false);
    }
  };

  const handleModeChange = (value) => {
    const requestId = ++loadRequestIdRef.current; // invalidate any in-flight load from the old mode
    setMode(value);
    clearModeSelection();
    // The previous mode's derived amount (from a Payment Request or a set of
    // selected Payments) no longer applies to the new mode; same for a stale
    // paymentRequestId sitting in state while now in "From Payment(s)".
    setForm((prev) => ({ ...prev, totalAmount: null, paymentRequestId: "" }));
    const contractId = extractId(form.contractId);
    if (contractId) loadModeSpecificData(contractId, value, requestId);
  };

  const loadContractContext = async (contractId) => {
    const requestId = ++loadRequestIdRef.current;
    const requestMode = mode;
    const safeId = extractId(contractId);
    setForm((prev) => ({ ...prev, contractId: safeId || "", totalAmount: null }));
    setSelectedContract(null);
    clearModeSelection();
    if (!safeId) return;
    try {
      const contract = await getAny(CONTRACT_RESOURCES, safeId, { appends: ["customers", "internalCompany"] });
      if (loadRequestIdRef.current !== requestId) return; // a newer load/mode-change has since started
      setSelectedContract(contract || null);
      setForm((prev) => ({
        ...prev,
        contractId: safeId,
        customerId: resolveCustomerId(contract) || "",
        internalCompanyId: resolveCompanyId(contract) || "",
      }));
    } catch (error) {
      console.error("[InvoiceCreateBlock] load contract failed", error);
      if (loadRequestIdRef.current === requestId) message.error("Could not load contract.");
      return;
    }
    await loadModeSpecificData(safeId, requestMode, requestId);
  };

  // Deep-link entry point: loads one specific Payment Request directly,
  // bypassing the contract picker + table — mirrors PaymentCreateBlock.js's
  // direct-open-from-Payment-Request flow (see spec §4 mode 1).
  const loadSeededPaymentRequest = async (requestId) => {
    const safeRequestId = extractId(requestId);
    if (!safeRequestId) return;
    loadRequestIdRef.current += 1;
    setLoading(true);
    try {
      const request = await getAny(PAYMENT_REQUEST_RESOURCES, safeRequestId, { appends: ["contracts"] });
      if (!request) throw new Error("Payment request not found.");
      const contractId = extractId(request?.contractId) || extractId(relationRecord(request?.contracts));
      if (!contractId) throw new Error("This payment request has no linked contract.");
      const contract = await getAny(CONTRACT_RESOURCES, contractId, { appends: ["customers", "internalCompany"] });
      setSelectedContract(contract || null);
      const requestedAmount = parseNum(request?.requestedAmount);
      setActivePaymentRequest({
        id: safeRequestId,
        title: firstPresent(request || {}, ["title"]) || `Payment request #${safeRequestId}`,
        requestedAmount,
      });
      setForm((prev) => ({
        ...prev,
        contractId,
        customerId: resolveCustomerId(contract) || "",
        internalCompanyId: resolveCompanyId(contract) || "",
        paymentRequestId: safeRequestId,
        totalAmount: requestedAmount > MONEY_TOLERANCE ? requestedAmount : prev.totalAmount,
      }));
    } catch (error) {
      console.error("[InvoiceCreateBlock] load seeded payment request failed", error);
      message.error(error?.message || "Could not load payment request.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seedPaymentRequestId) {
      loadSeededPaymentRequest(seedPaymentRequestId);
    }
  }, []);

  const sumSelectedPayments = (payments, selectedIds) =>
    (payments || [])
      .filter((p) => selectedIds.includes(extractId(p.id)))
      .reduce((sum, p) => sum + parseNum(p.amount), 0);

  const handlePaymentSelectionChange = (selectedRowKeys) => {
    const ids = selectedRowKeys.map((key) => extractId(key)).filter(Boolean);
    setSelectedPaymentIds(ids);
    const total = sumSelectedPayments(contractPayments, ids);
    setF("totalAmount", total > MONEY_TOLERANCE ? total : null);
  };

  const handleTotalAmountChange = (value) => {
    setF("totalAmount", parseNum(value));
  };

  const validate = () => {
    if (!form.contractId) return "Please select a contract.";
    if (mode === MODE.paymentRequest && !activePaymentRequest) return "Please select a payment request.";
    if (mode === MODE.payments && !selectedPaymentIds.length) return "Please select at least one payment.";
    if (!form.invoiceName.trim()) return "Please enter an invoice name.";
    if (!form.issuedDate) return "Please enter the issued date.";
    const amount = parseNum(form.totalAmount);
    if (amount <= 0) return "Please enter a total amount.";
    return "";
  };

  // Writes both the raw FK column and the association name for every
  // relation — NocoBase silently drops an unknown key on :create instead
  // of erroring, which is exactly how payments.paymentRequestId went
  // unnoticed for weeks (spec §2 / §6z of the 2026-09-17 unified-payment
  // spec). Field names below are verified via DiagnoseInvoiceSchema.js's
  // live fields:list dump, not assumed: customers→customerId,
  // contracts→contractId, internalCompany→internalCompanyId,
  // paymentRequest→paymentRequestId (registered in Task 1), and —
  // importantly — assignees→lawyerId (the raw column is "lawyerId", NOT
  // "assignees"; writing only "assignees" would have silently dropped).
  const buildInvoicePayload = () => {
    const contractId = extractId(form.contractId) || null;
    const customerId = extractId(form.customerId) || null;
    const internalCompanyId = extractId(form.internalCompanyId) || null;
    const paymentRequestId = mode === MODE.paymentRequest ? extractId(form.paymentRequestId) || null : null;
    const lawyerId = extractId(form.assignees) || null;

    const payload = {
      invoiceName: form.invoiceName.trim(),
      invoiceType: form.invoiceType,
      status: form.status,
      issuedDate: toIsoDateTime(form.issuedDate),
      deadline: form.deadline ? toIsoDateTime(form.deadline) : null,
      totalAmount: parseNum(form.totalAmount),
      description: form.description.trim() || null,
    };
    if (contractId) {
      payload.contractId = contractId;
      payload.contracts = contractId;
    }
    if (customerId) {
      payload.customerId = customerId;
      payload.customers = customerId;
    }
    if (internalCompanyId) {
      payload.internalCompanyId = internalCompanyId;
      payload.internalCompany = internalCompanyId;
    }
    if (paymentRequestId) {
      payload.paymentRequestId = paymentRequestId;
      payload.paymentRequest = paymentRequestId;
    }
    if (lawyerId) {
      payload.lawyerId = lawyerId;
      payload.assignees = lawyerId;
    }
    return payload;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      message.warning(error);
      return;
    }
    setSaving(true);
    try {
      const payload = buildInvoicePayload();
      const created = unwrapRecord(await apiRequestAny(INVOICE_RESOURCES, "create", { method: "POST", data: payload }));
      const invoiceId = extractId(created);
      if (!invoiceId) throw new Error("Invoice was created but its id could not be read back.");

      if (mode === MODE.payments && selectedPaymentIds.length) {
        const failedIds = [];
        for (const paymentId of selectedPaymentIds) {
          try {
            await updateAny(PAYMENT_RESOURCES, paymentId, { invoiceId });
          } catch (linkError) {
            console.error("[InvoiceCreateBlock] failed to link payment", paymentId, linkError);
            failedIds.push(paymentId);
          }
        }
        if (failedIds.length) {
          const failedLabels = failedIds.map((id) => {
            const row = contractPayments.find((p) => extractId(p.id) === id);
            return row?.paymentNumber || `#${id}`;
          });
          message.warning(
            `Invoice created, but ${failedIds.length} payment(s) could not be linked (${failedLabels.join(", ")}). Link them manually.`,
            8,
          );
        } else {
          message.success("Invoice created and payments linked successfully.");
        }
      } else {
        message.success("Invoice created successfully.");
      }
      // Prevent a duplicate invoice on re-submit (double-click, or the user
      // trying again once the toast fades) — the form and every selection
      // are cleared the moment the invoice is known to exist, regardless
      // of whether the payments:update loop above fully succeeded.
      resetSelectionState();
    } catch (submitError) {
      console.error("[InvoiceCreateBlock] submit failed", submitError);
      message.error(submitError?.message || "Could not create invoice.");
    } finally {
      setSaving(false);
    }
  };

  const handleContractPaymentRequestSelect = (request) => {
    const requestId = extractId(request?.id);
    const requestedAmount = parseNum(request?.requestedAmount);
    setActivePaymentRequest({
      id: requestId,
      title: firstPresent(request || {}, ["title"]) || (requestId ? `Payment request #${requestId}` : "Payment request"),
      requestedAmount,
    });
    setForm((prev) => ({
      ...prev,
      paymentRequestId: requestId || "",
      totalAmount: requestedAmount > MONEY_TOLERANCE ? requestedAmount : prev.totalAmount,
    }));
  };

  return React.createElement(
    "div",
    { style: { width: "100%" } },
    React.createElement("style", null, FIELD_GRID_STYLE),
    React.createElement(
      Card,
      { size: "small", title: "Create invoice" },
      React.createElement(
        Form,
        { layout: "vertical" },
        React.createElement(
        Space,
        { direction: "vertical", size: 16, style: { width: "100%" } },
        React.createElement(
          FieldGrid,
          null,
          React.createElement(
            Form.Item,
            { label: "Mode", required: true, style: { marginBottom: 0 } },
            React.createElement(Select, {
              value: mode,
              onChange: handleModeChange,
              options: [
                { label: "From Payment Request", value: MODE.paymentRequest },
                { label: "From Payment(s)", value: MODE.payments },
              ],
            }),
          ),
          React.createElement(
            Form.Item,
            { label: "Contract", required: true, style: { marginBottom: 0 } },
            React.createElement(Select, {
              showSearch: true,
              allowClear: true,
              value: form.contractId || undefined,
              placeholder: "Select contract",
              optionFilterProp: "label",
              onChange: loadContractContext,
              options: contracts.map((item) => ({ value: extractId(item), label: contractLabel(item) })),
            }),
          ),
          React.createElement(
            Form.Item,
            { label: "Internal company", style: { marginBottom: 0 } },
            React.createElement(Select, {
              showSearch: true,
              allowClear: true,
              value: form.internalCompanyId || undefined,
              placeholder: "Select internal company",
              optionFilterProp: "label",
              onChange: (value) => setF("internalCompanyId", value || ""),
              options: internalCompanies.map((item) => ({ value: extractId(item), label: companyLabel(item) })),
            }),
          ),
        ),
        selectedContract &&
        React.createElement(
          FieldRow,
          null,
          React.createElement(InfoLine, { label: "Contract", value: contractLabel(selectedContract), minWidth: 200 }),
          React.createElement(InfoLine, { label: "Customer", value: customerLabel(relationRecord(selectedContract.customers)), minWidth: 160 }),
        ),
        mode === MODE.paymentRequest &&
        React.createElement(
          React.Fragment,
          null,
          form.contractId &&
          React.createElement(
            Section,
            { title: "Payment requests" },
            activePaymentRequest
              ? React.createElement(
                  FieldRow,
                  null,
                  React.createElement(InfoLine, { label: "Selected request", value: activePaymentRequest.title, minWidth: 220 }),
                  React.createElement(InfoLine, { label: "Requested amount", value: formatMoney(activePaymentRequest.requestedAmount) }),
                )
              : null,
            React.createElement(Table, {
              rowKey: "id",
              size: "small",
              pagination: false,
              loading,
              dataSource: contractPaymentRequests,
              locale: { emptyText: "No payment requests for this contract." },
              rowSelection: {
                type: "radio",
                selectedRowKeys: activePaymentRequest?.id ? [activePaymentRequest.id] : [],
                onSelect: handleContractPaymentRequestSelect,
              },
              onRow: (row) => ({ onClick: () => handleContractPaymentRequestSelect(row) }),
              columns: [
                { title: "Payment request", dataIndex: "title", render: (value, row) => value || `Payment request #${extractId(row.id)}` },
                { title: "Requested", dataIndex: "requestedAmount", width: 140, align: "right", render: formatMoney },
                { title: "Status", dataIndex: "status", width: 100 },
              ],
            }),
          ),
        ),
        mode === MODE.payments &&
        React.createElement(
          React.Fragment,
          null,
          form.contractId &&
          React.createElement(
            Section,
            { title: "Payments to invoice" },
            selectedPaymentIds.length
              ? React.createElement(InfoLine, {
                  label: `${selectedPaymentIds.length} payment(s) selected`,
                  value: formatMoney(sumSelectedPayments(contractPayments, selectedPaymentIds)),
                })
              : null,
            React.createElement(Table, {
              rowKey: "id",
              size: "small",
              pagination: false,
              loading,
              dataSource: contractPayments,
              locale: { emptyText: "No uninvoiced payments for this contract." },
              rowSelection: {
                type: "checkbox",
                selectedRowKeys: selectedPaymentIds,
                onChange: handlePaymentSelectionChange,
              },
              columns: [
                { title: "Payment", dataIndex: "paymentNumber", render: (value, row) => value || `Payment #${extractId(row.id)}` },
                { title: "Date", dataIndex: "paymentDate", width: 110, render: formatDate },
                { title: "Status", dataIndex: "paymentStatus", width: 100 },
                { title: "Amount", dataIndex: "amount", width: 140, align: "right", render: formatMoney },
              ],
            }),
          ),
        ),
        React.createElement(
          Section,
          { title: "Invoice details" },
          React.createElement(
            FieldGrid,
            null,
            React.createElement(
              Form.Item,
              { label: "Invoice name", required: true, style: { marginBottom: 0 } },
              React.createElement(Input, { value: form.invoiceName, onChange: (e) => setF("invoiceName", e.target.value) }),
            ),
            React.createElement(
              Form.Item,
              { label: "Status", required: true, style: { marginBottom: 0 } },
              React.createElement(Select, {
                value: form.status,
                onChange: (value) => setF("status", value),
                options: ["draft", "pending", "partial", "paid", "overdue", "cancelled"].map((value) => ({ value, label: capitalizeFirst(value) })),
              }),
            ),
            React.createElement(
              Form.Item,
              { label: "Issued date", required: true, style: { marginBottom: 0 } },
              React.createElement(Input, { type: "datetime-local", value: form.issuedDate, onChange: (e) => setF("issuedDate", e.target.value) }),
            ),
            React.createElement(
              Form.Item,
              { label: "Deadline", style: { marginBottom: 0 } },
              React.createElement(Input, { type: "datetime-local", value: form.deadline, onChange: (e) => setF("deadline", e.target.value) }),
            ),
            React.createElement(
              Form.Item,
              { label: "Assignee", style: { marginBottom: 0 } },
              React.createElement(Select, {
                showSearch: true,
                allowClear: true,
                value: form.assignees || undefined,
                placeholder: "Select lawyer",
                optionFilterProp: "label",
                onChange: (value) => setF("assignees", value || ""),
                options: lawyers.map((item) => ({ value: extractId(item), label: lawyerLabel(item) })),
              }),
            ),
            React.createElement(
              Form.Item,
              { label: "Total amount", required: true, style: { marginBottom: 0 } },
              React.createElement(Input, { value: form.totalAmount ?? "", inputMode: "numeric", addonAfter: "VND", onChange: (e) => handleTotalAmountChange(e.target.value) }),
            ),
            React.createElement(
              Form.Item,
              { label: "Description", style: { marginBottom: 0, gridColumn: "1 / -1" } },
              React.createElement(Input.TextArea, { rows: 3, value: form.description, onChange: (e) => setF("description", e.target.value) }),
            ),
          ),
        ),
        React.createElement(
          "div",
          { style: { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 12 } },
          React.createElement(Button, { type: "primary", loading: saving, onClick: handleSubmit }, "Submit"),
        ),
        ),
      ),
    ),
  );
};

ctx.render(React.createElement(InvoiceCreateBlock));
