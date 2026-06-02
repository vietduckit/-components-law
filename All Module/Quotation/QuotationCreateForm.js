const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const { Spin, message, Tooltip, Modal } = ctx.antd;
const { origin, pathname } = window.location;

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";
const VAT_DEFAULT = 8;
const PRICING_MODE_LINE = "line";
const PRICING_MODE_PACKAGE = "package";

// Configure these popup view UIDs after creating the corresponding NocoBase views.
const POPUP_VIEW_UIDS = {
  leadCreate: "3xktqcqx9g5",
  customerCreate: "onjascp1npq",
  quotationTemplateCreate: "c17e97e4828",
};

const REDIRECT_URL = `${origin}${pathname}`;

const fmtVND = (n) =>
  !n && n !== 0 ? "—" : Number(n).toLocaleString("vi-VN") + " ₫";
const parseNum = (v) => {
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? 0 : n;
};
const calcLine = (basePrice, quantity, vat) => {
  const sub = parseNum(basePrice) * parseNum(quantity);
  const vatA = (sub * parseNum(vat)) / 100;
  return { subTotal: sub, vatAmount: vatA, totalAmount: sub + vatA };
};
const calcPackageTotals = (subTotal, vatRate) => {
  const sub = parseNum(subTotal);
  const vatA = (sub * parseNum(vatRate)) / 100;
  return { subTotal: sub, vatAmount: vatA, totalAmount: sub + vatA };
};
const buildServicePricingPayload = ({
  pricingMode,
  basePrice,
  quantity = 1,
  vat,
  packageSubTotal,
  packageVatRate,
}) => {
  if (isPackagePricing(pricingMode)) {
    const totals = calcPackageTotals(packageSubTotal, packageVatRate);
    return {
      pricingMode: PRICING_MODE_PACKAGE,
      basePrice: 0,
      quantity: 1,
      vat: 0,
      subTotal: 0,
      vatAmount: 0,
      totalAmount: 0,
      packageSubTotal: totals.subTotal,
      packageVatRate: parseNum(packageVatRate),
      packageVatAmount: totals.vatAmount,
      packageTotalAmount: totals.totalAmount,
    };
  }
  const qty = parseNum(quantity) || 1;
  const line = calcLine(basePrice, qty, vat);
  return {
    pricingMode: PRICING_MODE_LINE,
    basePrice: parseNum(basePrice),
    quantity: qty,
    vat: parseNum(vat),
    ...line,
    packageSubTotal: 0,
    packageVatRate: 0,
    packageVatAmount: 0,
    packageTotalAmount: 0,
  };
};
const calcRowsTotals = (items = []) =>
  items.reduce(
    (a, l) => ({
      subTotal: a.subTotal + parseNum(l.subTotal),
      vatAmount: a.vatAmount + parseNum(l.vatAmount),
      totalAmount: a.totalAmount + parseNum(l.totalAmount),
    }),
    { subTotal: 0, vatAmount: 0, totalAmount: 0 },
  );
const isPackagePricing = (mode) =>
  String(mode || "").toLowerCase() === PRICING_MODE_PACKAGE;
const todayISO = () => new Date().toISOString().slice(0, 10);
const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join("");
};
const avatarBg = (name) => {
  const colors = [
    "#2563eb",
    "#7c3aed",
    "#059669",
    "#dc2626",
    "#d97706",
    "#0891b2",
    "#be185d",
    "#0369a1",
  ];
  let h = 0;
  for (let i = 0; i < (name || "").length; i++)
    h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[h];
};

async function fetchAll(url, extra = {}) {
  try {
    const res = await ctx.api.request({
      url,
      params: { pageSize: 500, page: 1, ...extra },
    });
    return res?.data?.data || [];
  } catch (error) {
    if (extra?.appends) {
      try {
        const res = await ctx.api.request({
          url,
          params: { pageSize: 500, page: 1 },
        });
        return res?.data?.data || [];
      } catch { }
    }
    return [];
  }
}
async function getCurrentUser() {
  try {
    const r = await ctx.api.request({ url: "auth:check", method: "GET" });
    return r?.data?.data || r?.data || null;
  } catch {
    return null;
  }
}

const getViewInputArgs = () => ctx.view?.inputArgs || {};

const getPopupParams = () => {
  const inputArgs = getViewInputArgs();
  const params = inputArgs.params || {};
  const sourceCollectionName =
    inputArgs.sourceCollectionName ||
    params.sourceCollectionName ||
    ctx.action?.params?.sourceCollectionName ||
    ctx.modal?.params?.sourceCollectionName ||
    ctx.view?.params?.sourceCollectionName ||
    ctx.popup?.params?.sourceCollectionName ||
    ctx.params?.sourceCollectionName;
  const sourceRecordId =
    inputArgs.sourceRecordId ||
    params.sourceRecordId ||
    inputArgs.sourceId ||
    params.sourceId ||
    ctx.action?.params?.sourceRecordId || 
    ctx.modal?.params?.sourceRecordId ||
    ctx.view?.params?.sourceRecordId ||
    ctx.popup?.params?.sourceRecordId ||
    ctx.params?.sourceRecordId;
  const sourceName = String(sourceCollectionName || "").toLowerCase();
  const sourceProjectId =
    inputArgs.sourceProjectId ||
    params.sourceProjectId ||
    inputArgs.sourceCaseId ||
    params.sourceCaseId ||
    ctx.action?.params?.sourceProjectId ||
    ctx.action?.params?.sourceCaseId ||
    ctx.modal?.params?.sourceProjectId ||
    ctx.modal?.params?.sourceCaseId ||
    ctx.view?.params?.sourceProjectId ||
    ctx.view?.params?.sourceCaseId ||
    ctx.popup?.params?.sourceProjectId ||
    ctx.popup?.params?.sourceCaseId ||
    ctx.params?.sourceProjectId ||
    ctx.params?.sourceCaseId ||
    (sourceName.includes("project") || sourceName.includes("case") ? sourceRecordId : null);
  return {
    ...(inputArgs || {}),
    ...(params || {}),
    ...(ctx.action?.params || {}),
    ...(ctx.modal?.params || {}),
    ...(ctx.view?.params || {}),
    ...(ctx.popup?.params || {}),
    ...(ctx.params || {}),
    customerId: ctx.view?.customerId || inputArgs?.customerId || inputArgs?.params?.customerId || ctx.popup?.params?.customerId || ctx.params?.customerId,
    internalCompanyId: ctx.view?.internalCompanyId || inputArgs?.internalCompanyId || inputArgs?.params?.internalCompanyId || ctx.popup?.params?.internalCompanyId || ctx.params?.internalCompanyId,
    lawyerId: ctx.view?.lawyerId || inputArgs?.lawyerId || inputArgs?.params?.lawyerId || ctx.popup?.params?.lawyerId || ctx.params?.lawyerId,
    sourceProjectId,
    sourceCollectionName,
    sourceRecordId,
    projectId: ctx.view?.projectId || inputArgs?.projectId || inputArgs?.params?.projectId || sourceProjectId || ctx.popup?.params?.projectId || ctx.params?.projectId,
    caseId: ctx.view?.caseId || inputArgs?.caseId || inputArgs?.params?.caseId || sourceProjectId || ctx.popup?.params?.caseId || ctx.params?.caseId,
  };
};

const safeJsonStringify = (obj) => {
  try {
    if (obj === null || typeof obj !== "object") return String(obj);
    const clean = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val === null || typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          clean[key] = val;
        } else if (typeof val === "object") {
          if (Array.isArray(val)) {
            clean[key] = `Array(${val.length})`;
          } else {
            clean[key] = `Object(${Object.keys(val).join(", ")})`;
          }
        }
      }
    }
    return JSON.stringify(clean);
  } catch (e) {
    return "[Serialization Error: " + e.message + "]";
  }
};

const debugQuotationContext = (step, payload) => {
  console.log(`[QuotationCreateForm][context:${step}]`, safeJsonStringify(payload));
};

const openPopupViewByUid = async (viewKey) => {
  const uid = POPUP_VIEW_UIDS[viewKey];
  if (!uid) {
    message.warning(`Please configure POPUP_VIEW_UIDS.${viewKey} first.`);
    return false;
  }

  if (!ctx.openView) {
    message.error("ctx.openView is not available in this runtime.");
    return false;
  }

  try {
    const result = ctx.openView(uid);
    if (result?.then) await result;
    return true;
  } catch (error) {
    console.warn("[QuotationCreateForm] ctx.openView failed", error);
    message.error("Cannot open configured popup view.");
    return false;
  }
};

const extractId = (value) => {
  const id = value && typeof value === "object" ? value.id : value;
  return id ? parseInt(id, 10) : null;
};

const firstId = (...values) => {
  for (const value of values) {
    const id = Array.isArray(value) ? extractId(value[0]) : extractId(value);
    if (id) return id;
  }
  return null;
};

const hasOwn = (record, key) =>
  !!record && typeof record === "object" && Object.prototype.hasOwnProperty.call(record, key);

const getContextRecordKind = (record) => {
  if (hasOwn(record, "leadType")) return "lead";
  if (hasOwn(record, "customerType")) return "customer";
  if (hasOwn(record, "contractCode") || hasOwn(record, "contractName") || hasOwn(record, "contractType")) return "contract";
  return "";
};

const isProjectRecord = (record = {}) => {
  if (!record || typeof record !== "object") return false;
  if (getContextRecordKind(record)) return false;
  return !!(
    record.caseCode ||
    record.caseName ||
    record.projectName ||
    record.projectManagerId ||
    record.projectStatus ||
    Array.isArray(record.assignees)
  );
};

const recordInternalCompanyId = (record) =>
  firstId(record?.internalCompanyId, record?.internalCompany, record?.internalCompanies);

const recordLawyerId = (record) =>
  firstId(record?.lawyerId, record?.lawyer, record?.lawyers, record?.assignedLawyerId, record?.assignedLawyer, record?.projectManagerId, record?.projectManager, record?.assignees);

const recordCustomerId = (record) =>
  firstId(record?.customerId, record?.customer, record?.customers);

const recordLeadId = (record) =>
  firstId(record?.leadId, record?.lead, record?.leads);

const mergeRecordById = (items, record) => {
  const id = extractId(record?.id);
  if (!id) return items;
  return items.some((item) => String(extractId(item?.id)) === String(id))
    ? items
    : [record, ...items];
};

const normalizeIdentityText = (value) =>
  normalizeLookupText(value).replace(/\s+/g, " ");

const currentUserLawyerId = (lawyers = [], user = null) => {
  if (!user) return null;
  const userId = extractId(user?.id);
  const userEmail = normalizeIdentityText(user?.email || user?.username);
  const userName = normalizeIdentityText(
    user?.nickname ||
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" "),
  );

  const byUserRelation = lawyers.find((lawyer) => {
    const relatedUserId = firstId(
      lawyer?.userId,
      lawyer?.user,
      lawyer?.users,
      lawyer?.accountId,
      lawyer?.account,
    );
    return userId && relatedUserId && String(relatedUserId) === String(userId);
  });
  if (byUserRelation) return extractId(byUserRelation?.id);

  const byEmail = lawyers.find((lawyer) => {
    const lawyerEmail = normalizeIdentityText(
      lawyer?.email ||
      lawyer?.workEmail ||
      lawyer?.user?.email ||
      lawyer?.users?.email,
    );
    return userEmail && lawyerEmail && lawyerEmail === userEmail;
  });
  if (byEmail) return extractId(byEmail?.id);

  const byName = lawyers.find((lawyer) => {
    const lawyerName = normalizeIdentityText(
      lawyer?.lawyerName ||
      lawyer?.name ||
      [lawyer?.firstName, lawyer?.lastName].filter(Boolean).join(" "),
    );
    return userName && lawyerName && lawyerName === userName;
  });
  return byName ? extractId(byName?.id) : null;
};

const normalizeLookupText = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const serviceOptionServiceId = (item) =>
  firstId(item?.serviceId, item?.service, item?.services);

const serviceOptionCompanyId = (item) =>
  firstId(item?.internalCompanyId, item?.internalCompany, item?.companyId, item?.company);

const serviceOptionName = (item) =>
  item?.service?.serviceName ||
  item?.services?.serviceName ||
  item?.serviceName ||
  item?.name ||
  "";

const serviceOptionDescription = (item) =>
  item?.service?.description ||
  item?.services?.description ||
  item?.description ||
  "";

const serviceOptionType = (item) =>
  item?.service?.serviceType ||
  item?.services?.serviceType ||
  item?.serviceType ||
  "";

const serviceOptionPrice = (item) =>
  item?.price ?? item?.basePrice ?? item?.service?.basePrice ?? item?.services?.basePrice ?? 0;

const enrichCompanyServices = (companyServices = [], services = []) => {
  const serviceMap = {};
  services.forEach((service) => {
    const id = extractId(service?.id);
    if (id) serviceMap[String(id)] = service;
  });
  return companyServices.map((item) => {
    const serviceId = serviceOptionServiceId(item);
    const service = item.service || item.services || serviceMap[String(serviceId)] || null;
    return service && !item.service ? { ...item, service } : item;
  });
};

const fetchRecord = async (url, id, params = {}, options = {}) => {
  if (!id) return null;
  try {
    const res = await ctx.api.request({
      url,
      params: { filterByTk: id, ...params },
    });
    return res?.data?.data || res?.data || null;
  } catch (error) {
    if (!options.quiet) {
      console.warn(`[QuotationCreateForm] Could not fetch ${url} #${id}`, error);
    }
    return null;
  }
};

const firstPresent = (item, fields) => {
  for (const field of fields) {
    const value = item?.[field];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const projectLabel = (project) => {
  const code = firstPresent(project, ["caseCode", "projectCode", "code"]);
  const name = firstPresent(project, ["projectName", "caseName", "title", "name"]);
  return [code, name].filter(Boolean).join(" - ") || (project?.id ? `Case #${project.id}` : "Case");
};

const quoteStatusToServiceStatus = (status) => {
  const st = String(status || "").toLowerCase().trim();
  if (["cancelled", "canceled", "rejected", "lost"].includes(st)) return "cancelled";
  if (["order", "ordered", "accepted", "approved_by_customer", "won", "done"].includes(st)) return "ordered";
  if (["sent", "approved"].includes(st)) return "quote_sent";
  if (["pending_approval", "pending", "approval", "submitted", "review"].includes(st)) return "quote_pending_approval";
  return "quote_draft";
};

const PAYMENT_TERMS = [
  { value: "immediate", label: "Immediate" },
  { value: "15days", label: "Net 15 days" },
  { value: "30days", label: "Net 30 days" },
  { value: "45days", label: "Net 45 days" },
  { value: "endFollowingMonth", label: "End of following month" },
  { value: "balance", label: "Balance payment" },
];

const C = {
  border: "#e5e7eb",
  borderFocus: "#1a3a5c",
  borderPre: "#f59e0b",
  bgPre: "#fffbeb",
  text: "#1f2937",
  textSub: "#6b7280",
  textLabel: "#374151",
  primary: "#1a3a5c",
  danger: "#dc2626",
  success: "#16a34a",
  warning: "#d97706",
  bgCard: "#ffffff",
  bgSection: "#f8fafc",
  bgHighlight: "#f0f9ff",
  borderHighlight: "#bae6fd",
  // Approval palette
  approvalBg: "#fdf4ff",
  approvalBorder: "#e9d5ff",
  approvalText: "#7c3aed",
  approvalBadgeBg: "#f3e8ff",
};

const inp = (ex = {}) => ({
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  fontFamily: FONT,
  outline: "none",
  color: C.text,
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
  lineHeight: "20px",
  ...ex,
});
const inpPre = (ex = {}) => ({
  ...inp(),
  borderColor: C.borderPre,
  background: C.bgPre,
  ...ex,
});
const onFocus = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.borderFocus;
};
const onBlur = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.border;
};
const onFocusP = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.borderPre;
};
const onBlurP = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.borderPre;
};

// ==================== AUTO-RESIZE TEXTAREA ====================
const AutoTextarea = ({
  value,
  onChange,
  placeholder,
  minRows = 3,
  prefilled = false,
}) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [value]);
  return React.createElement("textarea", {
    ref,
    value: value || "",
    onChange: (e) => onChange(e.target.value),
    placeholder,
    rows: minRows,
    style: {
      ...(prefilled ? inpPre() : inp()),
      resize: "none",
      overflow: "hidden",
      lineHeight: "22px",
      minHeight: minRows * 22 + 18,
    },
    onFocus: prefilled ? onFocusP : onFocus,
    onBlur: prefilled ? onBlurP : onBlur,
  });
};

// ==================== DATE PICKER ====================
const DatePicker = ({ value, onChange, minDate }) => {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(() => {
    if (value) {
      const d = new Date(value);
      return { y: d.getFullYear(), m: d.getMonth() };
    }
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minD = minDate ? new Date(minDate) : today;
  minD.setHours(0, 0, 0, 0);
  const selected = value ? new Date(value) : null;
  if (selected) selected.setHours(0, 0, 0, 0);
  const MONTHS_VI = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const DAYS_VI = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDay = new Date(display.y, display.m, 1).getDay();
  const daysInMon = new Date(display.y, display.m + 1, 0).getDate();
  const prevMonth = () =>
    setDisplay((p) =>
      p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 },
    );
  const nextMonth = () =>
    setDisplay((p) =>
      p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 },
    );
  const selectDay = (day) => {
    onChange(new Date(display.y, display.m, day).toISOString());
    setOpen(false);
  };
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMon; d++) cells.push(d);
  const displayStr = selected ? fmtDate(selected.toISOString()) : "";
  return React.createElement(
    "div",
    { style: { position: "relative", zIndex: open ? 1000 : 1 } },
    open &&
    React.createElement("div", {
      onClick: () => setOpen(false),
      style: { position: "fixed", inset: 0, zIndex: 998 },
    }),
    React.createElement(
      "div",
      {
        onClick: () => setOpen((o) => !o),
        style: {
          ...inp(),
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
          borderColor: open ? C.borderFocus : C.border,
        },
      },
      React.createElement(
        "span",
        { style: { color: displayStr ? C.text : C.textSub, fontSize: 13.5 } },
        displayStr || "Select date",
      ),
      React.createElement(
        "span",
        { style: { fontSize: 14, color: C.textSub, marginLeft: 8 } },
        "📅",
      ),
    ),
    open &&
    React.createElement(
      "div",
      {
        onClick: (e) => e.stopPropagation(),
        style: {
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 999,
          background: "#fff",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          boxShadow: "0 12px 36px rgba(0,0,0,0.15)",
          padding: "14px 14px 10px",
          width: 300,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          },
        },
        React.createElement(
          "button",
          {
            onClick: prevMonth,
            style: {
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 16,
              color: C.textSub,
              padding: "2px 8px",
            },
          },
          "‹",
        ),
        React.createElement(
          "span",
          {
            style: {
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 13.5,
              color: C.text,
            },
          },
          `${MONTHS_VI[display.m]} ${display.y}`,
        ),
        React.createElement(
          "button",
          {
            onClick: nextMonth,
            style: {
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 16,
              color: C.textSub,
              padding: "2px 8px",
            },
          },
          "›",
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 2,
            marginBottom: 4,
          },
        },
        ...DAYS_VI.map((d) =>
          React.createElement(
            "div",
            {
              key: d,
              style: {
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: C.textSub,
                padding: "2px 0",
                fontFamily: FONT,
              },
            },
            d,
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 2,
          },
        },
        ...cells.map((day, i) => {
          if (!day) return React.createElement("div", { key: `e${i}` });
          const thisDate = new Date(display.y, display.m, day);
          thisDate.setHours(0, 0, 0, 0);
          const isDisabled = thisDate < minD;
          const isSelected =
            selected && thisDate.getTime() === selected.getTime();
          const isToday = thisDate.getTime() === today.getTime();
          return React.createElement(
            "div",
            {
              key: day,
              onClick: () => !isDisabled && selectDay(day),
              style: {
                textAlign: "center",
                padding: "6px 0",
                borderRadius: 6,
                fontSize: 13.5,
                fontFamily: FONT,
                cursor: isDisabled ? "not-allowed" : "pointer",
                fontWeight: isToday ? 600 : 400,
                color: isDisabled
                  ? "#d1d5db"
                  : isSelected
                    ? "#fff"
                    : isToday
                      ? C.primary
                      : C.text,
                background: isSelected
                  ? C.primary
                  : isToday && !isSelected
                    ? C.bgHighlight
                    : "transparent",
              },
            },
            day,
          );
        }),
      ),
      value &&
      React.createElement(
        "div",
        {
          onClick: () => {
            onChange("");
            setOpen(false);
          },
          style: {
            marginTop: 10,
            textAlign: "center",
            fontSize: 12,
            color: C.danger,
            cursor: "pointer",
            padding: "4px 0",
          },
        },
        "Clear selected date",
      ),
    ),
  );
};

// ==================== PRICE INPUT ====================
const PriceInput = ({ value, onChange, prefilled }) => {
  const fmt = (v) =>
    !v && v !== 0
      ? ""
      : v
        .toString()
        .replace(/[^\d]/g, "")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const raw = (s) => parseInt(String(s).replace(/\./g, ""), 10) || 0;
  return React.createElement("input", {
    type: "text",
    value: fmt(value),
    placeholder: "0",
    onChange: (e) => onChange(raw(e.target.value)),
    style: { ...(prefilled ? inpPre() : inp()), textAlign: "right" },
    onFocus: prefilled ? onFocusP : onFocus,
    onBlur: prefilled ? onBlurP : onBlur,
  });
};

// ==================== UI PRIMITIVES ====================
const Card = ({ children, style = {} }) =>
  React.createElement(
    "section",
    {
      style: {
        background: C.bgCard,
        borderTop: `1px solid ${C.border}`,
        paddingTop: 18,
        marginTop: 18,
        ...style,
      },
    },
    children,
  );

const CardHeader = ({ title, right }) =>
  React.createElement(
    "div",
    {
      style: {
        padding: "0 0 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      },
    },
    React.createElement(
      "span",
      {
        style: {
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 14,
          color: C.text,
        },
      },
      title,
    ),
    right || null,
  );

const Grid = ({ cols = 2, gap = 16, mb = 16, children }) =>
  React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap,
        marginBottom: mb,
      },
    },
    children,
  );

const FIELD_HELP = {
  "Internal Issuing Company":
    "Pháp nhân nội bộ đứng tên phát hành báo giá. Danh sách dịch vụ sẽ được lọc theo công ty này.",
  "Related Lead":
    "Lead liên quan nếu báo giá được tạo từ cơ hội bán hàng/chưa chuyển thành khách hàng.",
  "Related Customer":
    "Khách hàng liên quan nếu đã có hồ sơ khách hàng chính thức.",
  "Assigned Lawyer":
    "Luật sư phụ trách chính cho báo giá hoặc dịch vụ sau này.",
  "Require approval before sending":
    "Bật nếu báo giá cần người có thẩm quyền review trước khi gửi khách hàng.",
  Approver: "Người được chỉ định xét duyệt báo giá khi bật yêu cầu approval.",
  "Payment Terms":
    "Điều khoản thanh toán dự kiến, ví dụ thanh toán ngay, net 15, net 30 hoặc phần còn lại.",
  "Quotation Template":
    "File mẫu dùng cho tính năng generate báo giá. Form không còn nhập nội dung mẫu ở bước này.",
  "Valid Until": "Ngày hết hiệu lực của báo giá.",
  Address: "Địa chỉ liên hệ hoặc địa chỉ xuất hiện trên báo giá nếu cần.",
  "Short Description": "Ghi chú hoặc mô tả ngắn cho báo giá.",
  "Service List": "Danh sách dịch vụ sẽ được đưa vào báo giá.",
  "Service Name": "Dịch vụ được chọn từ danh sách dịch vụ của công ty nội bộ.",
  Description:
    "Mô tả phạm vi công việc của từng dòng dịch vụ. Có thể chỉnh lại theo nội dung báo giá cụ thể.",
  "Unit Price": "Đơn giá chưa VAT của dòng dịch vụ.",
  "VAT %": "Thuế VAT áp dụng cho dòng dịch vụ.",
  Subtotal: "Giá trị trước VAT.",
  "VAT Amount": "Số tiền VAT của dòng dịch vụ.",
  Total: "Tổng tiền sau VAT.",
};

const HelpMark = ({ text }) => {
  if (!text) return null;
  const mark = React.createElement(
    "span",
    {
      title: text,
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 15,
        height: 15,
        borderRadius: "50%",
        border: `1px solid ${C.border}`,
        color: C.textSub,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: "14px",
        marginLeft: 6,
        cursor: "help",
        flex: "0 0 auto",
      },
    },
    "?",
  );
  return Tooltip ? React.createElement(Tooltip, { title: text }, mark) : mark;
};

const Field = ({ label, required, hint, children, mb = 0, tooltip }) =>
  React.createElement(
    "div",
    { style: { marginBottom: mb, minWidth: 0, maxWidth: "100%" } },
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", marginBottom: 5 } },
      React.createElement(
        "span",
        {
          style: {
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 600,
            color: C.textLabel,
          },
        },
        label,
      ),
      required &&
      React.createElement(
        "span",
        { style: { color: C.danger, marginLeft: 3, fontSize: 12 } },
        "*",
      ),
      React.createElement(HelpMark, { text: tooltip || FIELD_HELP[label] }),
      hint &&
      React.createElement(
        "span",
        {
          style: {
            fontSize: 11,
            color: "#9ca3af",
            fontStyle: "italic",
            marginLeft: 6,
          },
        },
        hint,
      ),
    ),
    children,
  );

// ==================== AVATAR ====================
const Avatar = ({ name, size = 32 }) =>
  React.createElement(
    "div",
    {
      style: {
        width: size,
        height: size,
        borderRadius: "50%",
        background: avatarBg(name),
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.floor(size * 0.34),
        fontWeight: 700,
        fontFamily: FONT,
        flexShrink: 0,
        letterSpacing: 0.5,
        userSelect: "none",
      },
    },
    getInitials(name),
  );

const SelectedCheckIcon = () =>
  React.createElement(
    "span",
    {
      title: "Selected",
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: "#ecfdf5",
        border: `1px solid ${C.success}33`,
        color: C.success,
        flexShrink: 0,
      },
    },
    React.createElement(
      "svg",
      {
        width: 13,
        height: 13,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2.5,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
      },
      React.createElement("path", { d: "M20 6 9 17l-5-5" }),
    ),
  );

// ==================== LEAD SEARCHABLE DROPDOWN ====================
const LeadDropdown = ({ leads, value, onChange, currentLead, onAddNew }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const sortedLeads = useMemo(
    () =>
      [...leads].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      ),
    [leads],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedLeads;
    const q = search.toLowerCase();
    return sortedLeads.filter((l) => {
      const name = (
        l.companyName ||
        l.customerName ||
        l.fullName ||
        l.name ||
        ""
      ).toLowerCase();
      const phone = (l.phone || l.phoneNumber || "").toLowerCase();
      const email = (l.email || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [sortedLeads, search]);

  const selected = useMemo(
    () => leads.find((l) => String(l.id) === String(value)),
    [leads, value],
  );
  const getLeadName = (l) => {
    if (l.leadType === "company")
      return (
        l.companyName ||
        l.customerName ||
        l.fullName ||
        l.name ||
        `Lead #${l.id}`
      );
    return (
      l.fullName || l.customerName || l.name || l.companyName || `Lead #${l.id}`
    );
  };
  const selectedName = selected ? getLeadName(selected) : "";
  const isCurrentLead = (l) =>
    currentLead && String(l.id) === String(currentLead.id);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return React.createElement(
    "div",
    { ref, style: { position: "relative", zIndex: open ? 1000 : 1 } },
    open &&
    React.createElement("div", {
      onClick: () => setOpen(false),
      style: { position: "fixed", inset: 0, zIndex: 998 },
    }),

    React.createElement(
      "div",
      {
        onClick: () => setOpen((o) => !o),
        style: {
          ...inp(),
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          userSelect: "none",
          borderColor: open ? C.borderFocus : C.border,
          minHeight: 38,
          padding: "7px 11px",
        },
      },
      selected
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement(Avatar, { name: selectedName, size: 22 }),
          React.createElement(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                },
              },
              selectedName,
            ),
          ),

          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                onChange(null);
              },
              style: {
                fontSize: 13,
                color: C.textSub,
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 4,
                flexShrink: 0,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
              },
              title: "Clear selection",
            },
            React.createElement(
              "svg",
              {
                width: 14,
                height: 14,
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 2.5,
                strokeLinecap: "round",
              },
              React.createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
              React.createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 }),
            ),
          ),
        )
        : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "span",
            { style: { color: C.textSub, fontSize: 13, flex: 1 } },
            "— Search or select lead —",
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                color: C.textSub,
                transform: open ? "rotate(180deg)" : "none",
                display: "inline-block",
                transition: "transform 0.15s",
              },
            },
            "▾",
          ),
        ),
    ),

    open &&
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          zIndex: 999,
          background: "#fff",
          borderRadius: 6,
          border: `1px solid ${C.border}`,
          boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: { padding: 8, borderBottom: `1px solid #f3f4f6` },
        },
        React.createElement(
          "div",
          { style: { position: "relative" } },
          React.createElement(
            "span",
            {
              style: {
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: C.textSub,
                pointerEvents: "none",
              },
            },
            // "Search",
          ),
          React.createElement("input", {
            autoFocus: true,
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "Search by name, phone, email...",
            style: {
              ...inp({ paddingLeft: 11, paddingTop: 7, paddingBottom: 7 }),
            },
            onFocus,
            onBlur,
          }),
        ),
      ),

      React.createElement(
        "div",
        { style: { maxHeight: 220, overflowY: "auto" } },
        filtered.length === 0
          ? React.createElement(
            "div",
            {
              style: {
                padding: "32px 0",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              },
            },
            "No results found",
          )
          : filtered.map((l, i) => {
            const lName = getLeadName(l);
            const isSelected = String(l.id) === String(value);
            const isCurrent = isCurrentLead(l);
            return React.createElement(
              "div",
              {
                key: l.id,
                onClick: () => {
                  onChange(String(l.id));
                  setOpen(false);
                },
                style: {
                  padding: "8px 11px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  background: isSelected
                    ? C.bgHighlight
                    : isCurrent
                      ? "#f0fdf4"
                      : i % 2 === 0
                        ? "#fff"
                        : "#fafafa",
                  borderBottom: `1px solid #f3f4f6`,
                },
              },
              React.createElement(Avatar, { name: lName, size: 22 }),
              React.createElement(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    },
                  },
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 500,
                        color: C.text,
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                      },
                    },
                    lName,
                  ),
                ),
              ),
              isSelected && React.createElement(SelectedCheckIcon),
            );
          }),
      ),

      React.createElement(
        "div",
        {
          style: {
            padding: "7px 14px",
            background: C.bgSection,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 11.5, color: C.textSub } },
          search
            ? `${filtered.length} results`
            : `${filtered.length} leads — newest first`,
        ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 12 } },
          onAddNew &&
          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                setOpen(false);
                onAddNew();
              },
              style: {
                border: `1px dashed ${C.primary}`,
                borderRadius: 5,
                background: "#fff",
                color: C.primary,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: "18px",
                padding: "2px 8px",
              },
            },
            "Add new",
          ),
          value &&
          React.createElement(
            "span",
            {
              onClick: () => onChange(null),
              style: { fontSize: 11.5, color: C.danger, cursor: "pointer" },
            },
            "Clear",
          ),
        ),
      ),
    ),
  );
};

// ==================== CUSTOMER SEARCHABLE DROPDOWN ====================
const CustomerDropdown = ({ customers, value, onChange, currentCustomer, onAddNew }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const sortedCustomers = useMemo(
    () =>
      [...customers].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      ),
    [customers],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedCustomers;
    const q = search.toLowerCase();
    return sortedCustomers.filter((c) => {
      const name = (
        c.companyLegalName ||
        c.companyName ||
        c.customerName ||
        c.fullName ||
        c.name ||
        ""
      ).toLowerCase();
      const phone = (c.phone || c.phoneNumber || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [sortedCustomers, search]);

  const selected = useMemo(
    () => customers.find((c) => String(c.id) === String(value)),
    [customers, value],
  );
  const getCustomerName = (c) => {
    if (c.customerType === "company")
      return (
        c.companyLegalName ||
        c.companyName ||
        c.customerName ||
        c.fullName ||
        c.name ||
        `Khách hàng #${c.id}`
      );
    return (
      c.fullName ||
      c.customerName ||
      c.name ||
      c.companyLegalName ||
      c.companyName ||
      `Khách hàng #${c.id}`
    );
  };
  const selectedName = selected ? getCustomerName(selected) : "";
  const isCurrentCustomer = (c) =>
    currentCustomer && String(c.id) === String(currentCustomer.id);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return React.createElement(
    "div",
    { ref, style: { position: "relative", zIndex: open ? 1000 : 1 } },
    open &&
    React.createElement("div", {
      onClick: () => setOpen(false),
      style: { position: "fixed", inset: 0, zIndex: 998 },
    }),

    React.createElement(
      "div",
      {
        onClick: () => setOpen((o) => !o),
        style: {
          ...inp(),
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          userSelect: "none",
          borderColor: open ? C.borderFocus : C.border,
          minHeight: 38,
          padding: "7px 11px",
        },
      },
      selected
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement(Avatar, { name: selectedName, size: 22 }),
          React.createElement(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                },
              },
              selectedName,
            ),
          ),

          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                onChange(null);
              },
              style: {
                fontSize: 13,
                color: C.textSub,
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 4,
                flexShrink: 0,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
              },
              title: "Clear selection",
            },
            React.createElement(
              "svg",
              {
                width: 14,
                height: 14,
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 2.5,
                strokeLinecap: "round",
              },
              React.createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
              React.createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 }),
            ),
          ),
        )
        : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "span",
            { style: { color: C.textSub, fontSize: 13, flex: 1 } },
            "— Search or select customer —",
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                color: C.textSub,
                transform: open ? "rotate(180deg)" : "none",
                display: "inline-block",
                transition: "transform 0.15s",
              },
            },
            "▾",
          ),
        ),
    ),

    open &&
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          zIndex: 999,
          background: "#fff",
          borderRadius: 6,
          border: `1px solid ${C.border}`,
          boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: { padding: 8, borderBottom: `1px solid #f3f4f6` },
        },
        React.createElement(
          "div",
          { style: { position: "relative" } },
          React.createElement(
            "span",
            {
              style: {
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: C.textSub,
                pointerEvents: "none",
              },
            },
            // "Search",
          ),
          React.createElement("input", {
            autoFocus: true,
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "Search by name, phone, email...",
            style: {
              ...inp({ paddingLeft: 11, paddingTop: 7, paddingBottom: 7 }),
            },
          }),
        ),
      ),

      React.createElement(
        "div",
        { style: { maxHeight: 220, overflowY: "auto" } },
        filtered.length === 0
          ? React.createElement(
            "div",
            {
              style: {
                padding: "32px 0",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              },
            },
            "No results found",
          )
          : filtered.map((c, i) => {
            const cName = getCustomerName(c);
            const isSelected = String(c.id) === String(value);
            const isCurrent = isCurrentCustomer(c);
            return React.createElement(
              "div",
              {
                key: c.id,
                onClick: () => {
                  onChange(String(c.id));
                  setOpen(false);
                },
                style: {
                  padding: "8px 11px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  background: isSelected
                    ? C.bgHighlight
                    : isCurrent
                      ? "#f0fdf4"
                      : i % 2 === 0
                        ? "#fff"
                        : "#fafafa",
                  borderBottom: `1px solid #f3f4f6`,
                },
              },
              React.createElement(Avatar, { name: cName, size: 22 }),
              React.createElement(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    },
                  },
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 500,
                        color: C.text,
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                      },
                    },
                    cName,
                  ),
                  isCurrent &&
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 10,
                        background: "#dcfce7",
                        color: "#16a34a",
                        border: "1px solid #bbf7d0",
                        borderRadius: 4,
                        padding: "1px 6px",
                        fontWeight: 600,
                        flexShrink: 0,
                      },
                    },
                    "Current",
                  ),
                ),
              ),
              isSelected && React.createElement(SelectedCheckIcon),
            );
          }),
      ),

      React.createElement(
        "div",
        {
          style: {
            padding: "7px 14px",
            background: C.bgSection,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 11.5, color: C.textSub } },
          search
            ? `${filtered.length} results`
            : `${filtered.length} customers — newest first`,
        ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 12 } },
          onAddNew &&
          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                setOpen(false);
                onAddNew();
              },
              style: {
                border: `1px dashed ${C.primary}`,
                borderRadius: 5,
                background: "#fff",
                color: C.primary,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: "18px",
                padding: "2px 8px",
              },
            },
            "Add new",
          ),
          value &&
          React.createElement(
            "span",
            {
              onClick: () => onChange(null),
              style: { fontSize: 11.5, color: C.danger, cursor: "pointer" },
            },
            "Clear",
          ),
        ),
      ),
    ),
  );
};

// ==================== LAWYER PICKER (GROUPED BY TYPE) ====================
const LawyerPicker = ({ lawyers = [], value, onChange, accentColor }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const getLawyerName = (l) =>
    l.lawyerName ||
    l.name ||
    [l.firstName, l.lastName].filter(Boolean).join(" ") ||
    l.email ||
    `Lawyer #${l.id}`;

  const GROUP_CONFIG = [
    { key: "partner", label: "Partner", color: "#7c3aed", bg: "#f3e8ff" },
    { key: "lawyer", label: "Lawyer", color: "#2563eb", bg: "#eff6ff" },
    { key: "associate", label: "Associate", color: "#059669", bg: "#d1fae5" },
    { key: "sales", label: "Sales", color: "#d97706", bg: "#fef3c7" },
    { key: "suppliant", label: "Suppliant", color: "#4b5563", bg: "#f3f4f6" },
  ];

  const filtered = useMemo(() => {
    let list = lawyers.filter((l) => {
      const type = String(l.lawyerType || "")
        .toLowerCase()
        .trim();
      return GROUP_CONFIG.some((g) => g.key === type);
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          getLawyerName(l).toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [lawyers, search]);

  const grouped = useMemo(() => {
    const g = {
      partner: [],
      lawyer: [],
      associate: [],
      sales: [],
      suppliant: [],
    };
    filtered.forEach((l) => {
      const type = String(l.lawyerType || "")
        .toLowerCase()
        .trim();
      if (g[type]) g[type].push(l);
    });
    return g;
  }, [filtered]);

  const selected = useMemo(
    () => lawyers.find((l) => String(l.id) === String(value)),
    [lawyers, value],
  );
  const selectedName = selected ? getLawyerName(selected) : "";
  const selectedType = selected
    ? String(selected.lawyerType || "")
      .toLowerCase()
      .trim()
    : "";
  const selectedConf = GROUP_CONFIG.find((g) => g.key === selectedType);
  const focusColor = accentColor || C.borderFocus;

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return React.createElement(
    "div",
    { ref, style: { position: "relative", zIndex: open ? 1000 : 1 } },
    open &&
    React.createElement("div", {
      onClick: () => setOpen(false),
      style: { position: "fixed", inset: 0, zIndex: 998 },
    }),

    React.createElement(
      "div",
      {
        onClick: () => setOpen((o) => !o),
        style: {
          ...inp(),
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          userSelect: "none",
          borderColor: open ? focusColor : C.border,
          minHeight: 38,
          padding: "7px 11px",
        },
      },
      selected
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement(Avatar, { name: selectedName, size: 22 }),
          React.createElement(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            React.createElement(
              "div",
              { style: { fontSize: 13, fontWeight: 600, color: C.text } },
              selectedName,
            ),
            selectedConf &&
            React.createElement(
              "div",
              { style: { fontSize: 11, color: selectedConf.color } },
              selectedConf.label,
            ),
          ),
          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                onChange(null);
              },
              style: {
                fontSize: 13,
                color: C.textSub,
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 4,
                flexShrink: 0,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
              },
              title: "Clear selection",
            },
            React.createElement(
              "svg",
              {
                width: 14,
                height: 14,
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 2.5,
                strokeLinecap: "round",
              },
              React.createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
              React.createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 }),
            ),
          ),
        )
        : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            {
              style: {
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: `2px dashed #d1d5db`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d1d5db",
                fontSize: 16,
                flexShrink: 0,
              },
            },
            "+",
          ),
          React.createElement(
            "span",
            { style: { color: C.textSub, fontSize: 13, flex: 1 } },
            "— Select lawyer —",
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                color: C.textSub,
                transform: open ? "rotate(180deg)" : "none",
                display: "inline-block",
                transition: "transform 0.15s",
              },
            },
            "▾",
          ),
        ),
    ),

    open &&
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          zIndex: 999,
          background: "#fff",
          borderRadius: 6,
          border: `1px solid ${C.border}`,
          boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: { padding: 8, borderBottom: `1px solid #f3f4f6` },
        },
        React.createElement(
          "div",
          { style: { position: "relative" } },
          React.createElement(
            "span",
            {
              style: {
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: C.textSub,
                pointerEvents: "none",
              },
            },
            // "Search",
          ),
          React.createElement("input", {
            autoFocus: true,
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "Search by name, email...",
            style: {
              ...inp({ paddingLeft: 11, paddingTop: 7, paddingBottom: 7 }),
            },
            onFocus,
            onBlur,
          }),
        ),
      ),

      React.createElement(
        "div",
        { style: { maxHeight: 220, overflowY: "auto" } },
        filtered.length === 0
          ? React.createElement(
            "div",
            {
              style: {
                padding: "32px 0",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              },
            },
            "No results found",
          )
          : GROUP_CONFIG.map((group) => {
            const items = grouped[group.key];
            if (!items || items.length === 0) return null;
            return React.createElement(
              React.Fragment,
              { key: group.key },
              React.createElement(
                "div",
                {
                  style: {
                    padding: "6px 14px",
                    background: "#f9fafb",
                    borderBottom: "1px solid #f3f4f6",
                    borderTop: "1px solid #f3f4f6",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: group.color,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  },
                },
                group.label,
              ),
              items.map((u) => {
                const uName = getLawyerName(u);
                const isSelected = String(u.id) === String(value);
                return React.createElement(
                  "div",
                  {
                    key: u.id,
                    onClick: () => {
                      onChange(String(u.id));
                      setOpen(false);
                    },
                    style: {
                      padding: "8px 11px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      background: isSelected ? C.bgHighlight : "#fff",
                      borderBottom: "1px solid #f3f4f6",
                    },
                  },
                  React.createElement(Avatar, { name: uName, size: 22 }),
                  React.createElement(
                    "div",
                    { style: { flex: 1 } },
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 13,
                          fontWeight: isSelected ? 600 : 500,
                          color: C.text,
                        },
                      },
                      uName,
                    ),
                  ),
                  isSelected && React.createElement(SelectedCheckIcon),
                );
              }),
            );
          }),
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "7px 14px",
            background: C.bgSection,
            borderTop: `1px solid ${C.border}`,
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 11.5, color: C.textSub } },
          `${filtered.length} users`,
        ),
      ),
    ),
  );
};

// ==================== APPROVAL SECTION ====================
// Hiển thị inline bên dưới luật sư phụ trách, trong cùng Card thông tin báo giá
const ApprovalSection = ({
  isRequired,
  approvedById,
  lawyers,
  onToggle,
  onSelectApprover,
}) => {
  return React.createElement(
    "div",
    { style: { marginTop: 16 } },

    // ── Checkbox row ──
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: isRequired ? C.approvalBg : C.bgSection,
          border: `1px solid ${isRequired ? C.approvalBorder : C.border}`,
          borderRadius: isRequired ? "8px 8px 0 0" : 8,
          cursor: "pointer",
          transition: "all 0.18s",
          userSelect: "none",
        },
        onClick: onToggle,
      },
      // Custom checkbox
      React.createElement(
        "div",
        {
          style: {
            width: 18,
            height: 18,
            borderRadius: 4,
            flexShrink: 0,
            border: `2px solid ${isRequired ? C.approvalText : "#d1d5db"}`,
            background: isRequired ? C.approvalText : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          },
        },
        isRequired &&
        React.createElement(
          "span",
          {
            style: {
              color: "#fff",
              fontSize: 11,
              fontWeight: 900,
              lineHeight: 1,
            },
          },
          "",
        ),
      ),

      React.createElement(
        "div",
        { style: { flex: 1 } },
        React.createElement(
          "div",
          {
            style: {
              display: "inline-flex",
              alignItems: "center",
              fontSize: 13.5,
              fontWeight: 600,
              color: isRequired ? C.approvalText : C.text,
            },
          },
          "Require approval before sending",
          React.createElement(HelpMark, {
            text: FIELD_HELP["Require approval before sending"],
          }),
        ),
        React.createElement(
          "div",
          { style: { fontSize: 11.5, color: C.textSub, marginTop: 1 } },
          "Quotation will need approval from authorized personnel",
        ),
      ),

      // Status badge
      React.createElement(
        "span",
        {
          style: {
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 10,
            flexShrink: 0,
            background: isRequired ? C.approvalBadgeBg : "#f3f4f6",
            color: isRequired ? C.approvalText : "#9ca3af",
            border: `1px solid ${isRequired ? C.approvalBorder : "#e5e7eb"}`,
          },
        },
        isRequired ? "Pending Approval" : "Not Required",
      ),
    ),

    // ── Expanded: chọn người xét duyệt ──
    isRequired &&
    React.createElement(
      "div",
      {
        style: {
          padding: "14px 14px",
          background: C.approvalBg,
          border: `1px solid ${C.approvalBorder}`,
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          },
        },
        React.createElement(
          "span",
          {
            style: { fontSize: 11.5, fontWeight: 700, color: C.approvalText },
          },
          "Approver",
          React.createElement(HelpMark, { text: FIELD_HELP.Approver }),
        ),
        React.createElement(
          "span",
          { style: { fontSize: 11, color: "#9ca3af", fontStyle: "italic" } },
          "— optional",
        ),
      ),
      React.createElement(LawyerPicker, {
        lawyers,
        value: approvedById,
        onChange: onSelectApprover,
        accentColor: C.approvalText,
      }),
    ),
  );
};

// ==================== SERVICE PICKER MODAL ====================
const ServicePickerModal = ({
  svcOpts,
  selectedIds,
  onSelect,
  onClose,
  companyId,
  onAddNewService,
}) => {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newSvc, setNewSvc] = useState({
    name: "",
    price: 0,
    description: "",
    serviceType: "",
  });
  const [errors, setErrors] = useState({});

  const filtered = useMemo(() => {
    if (!companyId) return [];
    return svcOpts.filter((s) => {
      const match = String(serviceOptionCompanyId(s)) === String(companyId);
      const name = normalizeLookupText(serviceOptionName(s));
      return match && name.includes(normalizeLookupText(search));
    });
  }, [svcOpts, search, companyId]);

  const thS = (ex = {}) => ({
    padding: "9px 14px",
    fontSize: 11.5,
    fontWeight: 600,
    color: C.textSub,
    background: C.bgSection,
    borderBottom: `2px solid ${C.border}`,
    textAlign: "left",
    whiteSpace: "normal",
    fontFamily: FONT,
    ...ex,
  });
  const tdS = (ex = {}) => ({
    padding: "9px 14px",
    fontSize: 13,
    borderBottom: `1px solid #f3f4f6`,
    verticalAlign: "middle",
    fontFamily: FONT,
    ...ex,
  });

  const validate = () => {
    const e = {};
    if (!newSvc.name.trim()) e.name = "Please enter service name";
    if (!newSvc.price || newSvc.price <= 0)
      e.price = "Unit price must be greater than 0";
    setErrors(e);
    return !Object.keys(e).length;
  };

  return React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      },
      onClick: onClose,
    },
    React.createElement(
      "div",
      {
        style: {
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: showAdd ? 520 : 700,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        },
        onClick: (e) => e.stopPropagation(),
      },
      React.createElement(
        "div",
        {
          style: {
            padding: "15px 20px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 10 } },
          showAdd &&
          React.createElement(
            "span",
            {
              onClick: () => {
                setShowAdd(false);
                setErrors({});
              },
              style: {
                cursor: "pointer",
                color: C.primary,
                fontSize: 13,
                padding: "3px 10px",
                borderRadius: 4,
                background: C.bgHighlight,
                fontFamily: FONT,
              },
            },
            "← Back",
          ),
          React.createElement(
            "span",
            {
              style: {
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 15,
                color: C.text,
              },
            },
            showAdd ? "Create New Service" : "Select Service",
          ),
        ),
        React.createElement(
          "span",
          {
            onClick: onClose,
            style: {
              cursor: "pointer",
              fontSize: 18,
              color: C.textSub,
              lineHeight: 1,
            },
          },
          "Close",
        ),
      ),

      !showAdd
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            {
              style: {
                padding: "12px 20px",
                borderBottom: `1px solid #f3f4f6`,
                display: "flex",
                gap: 10,
                flexShrink: 0,
              },
            },
            React.createElement("input", {
              autoFocus: true,
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: "Search service name...",
              style: { ...inp(), flex: 1 },
              onFocus,
              onBlur,
            }),
            React.createElement(
              "div",
              {
                onClick: () => setShowAdd(true),
                style: {
                  padding: "8px 16px",
                  background: "#16a34a",
                  color: "#fff",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  whiteSpace: "normal",
                  fontFamily: FONT,
                },
              },
              "Create new",
            ),
          ),
          React.createElement(
            "div",
            { style: { overflowY: "auto", flex: 1 } },
            React.createElement(
              "table",
              { style: { width: "100%", borderCollapse: "collapse" } },
              React.createElement(
                "thead",
                null,
                React.createElement(
                  "tr",
                  null,
                  React.createElement(
                    "th",
                    { style: thS({ width: 36, textAlign: "center" }) },
                    "#",
                  ),
                  React.createElement("th", { style: thS() }, "Service Name"),
                  React.createElement(
                    "th",
                    { style: thS({ width: 130 }) },
                    "Type",
                  ),
                  React.createElement(
                    "th",
                    { style: thS({ width: 160, textAlign: "right" }) },
                    "Unit Price (₫)",
                  ),
                  React.createElement(
                    "th",
                    { style: thS({ width: 80, textAlign: "center" }) },
                    "",
                  ),
                ),
              ),
              React.createElement(
                "tbody",
                null,
                filtered.length === 0
                  ? React.createElement(
                    "tr",
                    null,
                    React.createElement(
                      "td",
                      {
                        colSpan: 5,
                        style: tdS({
                          textAlign: "center",
                          color: "#9ca3af",
                          padding: "40px 0",
                        }),
                      },
                      React.createElement(
                        "div",
                        {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                          },
                        },
                        React.createElement(
                          "div",
                          null,
                          "No services found",
                        ),
                        React.createElement(
                          "span",
                          {
                            onClick: () => setShowAdd(true),
                            style: {
                              color: C.primary,
                              cursor: "pointer",
                              fontSize: 12,
                              textDecoration: "underline",
                            },
                          },
                          "Create now",
                        ),
                      ),
                    ),
                  )
                  : filtered.map((s, i) => {
                    const svcId = serviceOptionServiceId(s);
                    const isUsed = selectedIds.includes(String(svcId));
                    const svcName = serviceOptionName(s) || `Service #${svcId || s.id}`;
                    const price = serviceOptionPrice(s);
                    const svcType = serviceOptionType(s);
                    const description = serviceOptionDescription(s);
                    return React.createElement(
                      "tr",
                      {
                        key: s.id,
                        style: {
                          background: isUsed
                            ? "#f9fafb"
                            : i % 2 === 0
                              ? "#fff"
                              : "#fafafa",
                          cursor: isUsed ? "not-allowed" : "pointer",
                          opacity: isUsed ? 0.5 : 1,
                        },
                        onClick: () => {
                          if (!isUsed)
                            onSelect({
                              id: svcId,
                              serviceName: svcName,
                              basePrice: price,
                              description,
                              serviceType: svcType,
                              catalogService: s.service || s.services || null,
                              catalogServiceId: svcId,
                              catalogBasePrice: price,
                            });
                        },
                      },
                      React.createElement(
                        "td",
                        {
                          style: tdS({
                            textAlign: "center",
                            color: C.textSub,
                            fontSize: 12,
                          }),
                        },
                        i + 1,
                      ),
                      React.createElement(
                        "td",
                        { style: tdS({ fontWeight: 500 }) },
                        React.createElement("div", null, svcName),
                        description &&
                        React.createElement(
                          "div",
                          {
                            style: {
                              fontSize: 11.5,
                              color: C.textSub,
                              marginTop: 2,
                              whiteSpace: "normal",
                              lineHeight: "17px",
                            },
                          },
                          description,
                        ),
                      ),
                      React.createElement(
                        "td",
                        { style: tdS() },
                        svcType
                          ? React.createElement(
                            "span",
                            {
                              style: {
                                fontSize: 11,
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                padding: "2px 8px",
                                borderRadius: 10,
                              },
                            },
                            svcType,
                          )
                          : React.createElement(
                            "span",
                            { style: { color: "#d1d5db" } },
                            "—",
                          ),
                      ),
                      React.createElement(
                        "td",
                        { style: tdS({ textAlign: "right" }) },
                        fmtVND(price),
                      ),
                      React.createElement(
                        "td",
                        { style: tdS({ textAlign: "center" }) },
                        isUsed
                          ? React.createElement(
                            "span",
                            {
                              title: "Selected",
                              style: {
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                background: "#ecfdf5",
                                border: `1px solid ${C.success}33`,
                                color: C.success,
                              },
                            },
                            React.createElement(
                              "svg",
                              {
                                width: 15,
                                height: 15,
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: 2.4,
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                "aria-hidden": "true",
                              },
                              React.createElement("path", { d: "M20 6 9 17l-5-5" }),
                            ),
                          )
                          : React.createElement(
                            "div",
                            {
                              style: {
                                display: "inline-block",
                                padding: "3px 12px",
                                borderRadius: 4,
                                background: C.primary,
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: FONT,
                              },
                            },
                            "Select",
                          ),
                      ),
                    );
                  }),
              ),
            ),
          ),
          React.createElement(
            "div",
            {
              style: {
                padding: "12px 20px",
                borderTop: `1px solid ${C.border}`,
                textAlign: "right",
                flexShrink: 0,
              },
            },
            React.createElement(
              "div",
              {
                onClick: onClose,
                style: {
                  display: "inline-block",
                  padding: "7px 20px",
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  cursor: "pointer",
                  fontSize: 13,
                  color: C.textSub,
                  fontFamily: FONT,
                },
              },
              "Close",
            ),
          ),
        )
        : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            { style: { overflowY: "auto", flex: 1, padding: "20px 24px" } },
            [
              {
                key: "name",
                label: "Service Name",
                req: true,
                type: "input",
                placeholder: "e.g., Labor contract consulting...",
              },
              {
                key: "serviceType",
                label: "Service Type",
                req: false,
                type: "input",
                placeholder: "e.g., Consulting, Legal...",
                hint: "optional",
              },
              {
                key: "price",
                label: "Unit Price (₫)",
                req: true,
                type: "price",
              },
              {
                key: "description",
                label: "Description",
                req: false,
                type: "textarea",
                placeholder: "Scope of work, notes...",
                hint: "optional",
              },
            ].map((f) =>
              React.createElement(
                "div",
                { key: f.key, style: { marginBottom: 16 } },
                React.createElement(
                  Field,
                  { label: f.label, required: f.req, hint: f.hint },
                  f.type === "price"
                    ? React.createElement(PriceInput, {
                      value: newSvc.price,
                      onChange: (v) => {
                        setNewSvc({ ...newSvc, price: v });
                        setErrors((p) => ({ ...p, price: "" }));
                      },
                    })
                    : f.type === "textarea"
                      ? React.createElement(AutoTextarea, {
                        value: newSvc[f.key],
                        onChange: (v) =>
                          setNewSvc({ ...newSvc, [f.key]: v }),
                        placeholder: f.placeholder,
                        minRows: 3,
                      })
                      : React.createElement("input", {
                        value: newSvc[f.key],
                        onChange: (e) => {
                          setNewSvc({ ...newSvc, [f.key]: e.target.value });
                          setErrors((p) => ({ ...p, [f.key]: "" }));
                        },
                        placeholder: f.placeholder,
                        style: {
                          ...inp(),
                          ...(errors[f.key]
                            ? { borderColor: C.danger }
                            : {}),
                        },
                        onFocus,
                        onBlur,
                      }),
                  errors[f.key] &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        color: C.danger,
                        fontSize: 11.5,
                        marginTop: 4,
                      },
                    },
                    errors[f.key],
                  ),
                ),
              ),
            ),
          ),
          React.createElement(
            "div",
            {
              style: {
                padding: "14px 24px",
                borderTop: `1px solid #f3f4f6`,
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                background: C.bgSection,
                flexShrink: 0,
              },
            },
            React.createElement(
              "button",
              {
                onClick: () => {
                  setShowAdd(false);
                  setErrors({});
                },
                style: {
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: FONT,
                  color: C.text,
                },
              },
              "Cancel",
            ),
            React.createElement(
              "button",
              {
                onClick: () => {
                  if (validate()) {
                    onAddNewService(newSvc);
                    setShowAdd(false);
                  }
                },
                style: {
                  padding: "8px 24px",
                  borderRadius: 6,
                  background: C.primary,
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: FONT,
                },
              },
              "Save & Select",
            ),
          ),
        ),
    ),
  );
};

// ==================== SERVICES TABLE ====================
const ServicesTable = ({
  rows,
  svcOpts,
  onUpdate,
  onAdd,
  onDelete,
  companyId,
  onAddNewService,
  pricingMode,
  packageSubTotal,
  packageVatRate,
  packageTotals,
  onPricingModeChange,
  onPackageChange,
}) => {
  const [pickerRowId, setPickerRowId] = useState(null);
  const [compareModal, setCompareModal] = useState({ open: false, data: null });
  const packageMode = isPackagePricing(pricingMode);

  // ── Review Changes helpers ──
  const compareFields = [
    { key: "serviceName", label: "Service Name", type: "text" },
    { key: "description", label: "Description", type: "text" },
    { key: "basePrice", label: "Unit Price", type: "money" },
  ];
  const fmtCmpVal = (v, type) => {
    if (type === "money") return `${Number(v) || 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
    const t = String(v ?? "").trim(); return t || "—";
  };
  const normCmp = (v, type) => {
    if (type === "money") return String(Number(v) || 0);
    return String(v ?? "").normalize("NFC").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  };
  const getCatalog = (row) => {
    const rowServiceId = firstId(row.serviceId, row.service, row.services, row.catalogServiceId, row.catalogService);
    const rowName = normalizeLookupText(row.serviceName);
    const direct = rowServiceId
      ? svcOpts.find((s) => String(serviceOptionServiceId(s)) === String(rowServiceId))
      : null;
    if (direct) {
      const fallbackService = row.catalogService || row.originalService || null;
      return fallbackService && !serviceOptionName(direct)
        ? { ...direct, service: fallbackService }
        : direct;
    }

    const byName = rowName
      ? svcOpts.find((s) => {
        const sameCompany =
          !companyId || !serviceOptionCompanyId(s) || String(serviceOptionCompanyId(s)) === String(companyId);
        return sameCompany && normalizeLookupText(serviceOptionName(s)) === rowName;
      })
      : null;
    if (byName) return byName;

    if (row.catalogService || row.originalService) {
      return {
        serviceId: firstId(row.catalogServiceId, row.catalogService, row.originalService, row.serviceId),
        service: row.catalogService || row.originalService,
        serviceName: row.catalogServiceName || row.originalServiceName || row.serviceName,
        description: row.catalogDescription ?? row.originalDescription ?? "",
        price: row.catalogBasePrice ?? row.originalBasePrice ?? row.basePrice,
      };
    }
    return null;
  };
  const getCatalogVal = (cat, key) => {
    if (!cat) return "";
    if (key === "serviceName") return serviceOptionName(cat);
    if (key === "description") return serviceOptionDescription(cat);
    if (key === "basePrice") return serviceOptionPrice(cat);
    return "";
  };
  const getRowVal = (row, key) => {
    if (key === "serviceName") return row.serviceName || "";
    if (key === "description") return row.description || "";
    if (key === "basePrice") return row.basePrice ?? 0;
    return "";
  };
  const getCmpRows = (row) => {
    const cat = getCatalog(row);
    return compareFields.map((f) => {
      const original = getCatalogVal(cat, f.key);
      const quoted = getRowVal(row, f.key);
      return {
        key: f.key, field: f.label, type: f.type, original, quoted,
        catalogMissing: !cat,
        changed: !!cat && normCmp(original, f.type) !== normCmp(quoted, f.type),
      };
    });
  };

  const renderCmpList = () => {
    const { Table: AntTable, Tag } = ctx.antd;
    const tableRows = rows.map((row, idx) => {
      const cat = getCatalog(row);
      const diffRows = getCmpRows(row).filter((r) => r.changed);
      return {
        key: row._id,
        no: idx + 1,
        row,
        catalogMissing: !cat,
        serviceName: row.serviceName || "— not selected —",
        originalName: cat ? getCatalogVal(cat, "serviceName") : "",
        changedCount: diffRows.length,
        changedLabels: diffRows.map((r) => r.field).join(", "),
      };
    });
    return React.createElement("div", null,
      React.createElement("div", { style: { marginBottom: 12, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.bgSection, color: C.textSub, fontSize: 13, fontFamily: FONT } },
        "So sánh giá trị dịch vụ hiện tại trong form với dữ liệu gốc từ Company Service catalog."),
      React.createElement(AntTable, {
        dataSource: tableRows, rowKey: "key", pagination: false, size: "small", bordered: true, scroll: { x: "max-content" },
        columns: [
          { title: "No.", dataIndex: "no", width: 54, align: "center" },
          {
            title: "Service in Quotation", dataIndex: "serviceName", width: 230,
            render: (v) => React.createElement("div", { style: { fontWeight: 600, color: C.text, wordBreak: "break-word", fontFamily: FONT } }, v)
          },
          {
            title: "Catalog Service", dataIndex: "originalName", width: 220,
            render: (v, row) => row.catalogMissing
              ? React.createElement(ctx.antd.Tag, { color: "default" }, "No catalog")
              : React.createElement("span", { style: { wordBreak: "break-word", fontFamily: FONT } }, fmtCmpVal(v, "text"))
          },
          {
            title: "Changes", width: 220,
            render: (_, row) => row.catalogMissing
              ? React.createElement(ctx.antd.Tag, { color: "default" }, "No catalog link")
              : row.changedCount
                ? React.createElement("div", null,
                  React.createElement(ctx.antd.Tag, { color: "red" }, `${row.changedCount} changed`),
                  React.createElement("div", { style: { fontSize: 12, color: C.textSub, marginTop: 4, wordBreak: "break-word", fontFamily: FONT } }, row.changedLabels))
                : React.createElement(ctx.antd.Tag, { color: "green" }, "No change")
          },
          {
            title: "Detail", width: 90, align: "center",
            render: (_, row) => React.createElement(ctx.antd.Button, { size: "small", onClick: () => setCompareModal({ open: true, data: row.row }) }, "View")
          },
        ],
      })
    );
  };

  const renderCmpDetail = (row) => {
    const { Table: AntTable, Tag } = ctx.antd;
    const cat = getCatalog(row);
    const cmpRows = getCmpRows(row);
    const changedRows = cmpRows.filter((r) => r.changed);
    return React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16, padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.bgSection } },
        React.createElement("div", { style: { minWidth: 0 } },
          React.createElement("div", { style: { fontSize: 12, color: C.textSub, marginBottom: 4, fontFamily: FONT } }, "Service in Quotation"),
          React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: C.text, wordBreak: "break-word", fontFamily: FONT } }, row.serviceName || "— not selected —")),
        cat
          ? React.createElement(ctx.antd.Tag, { color: changedRows.length ? "red" : "green", style: { marginRight: 0 } },
            changedRows.length ? `${changedRows.length} field(s) changed` : "No change")
          : React.createElement(ctx.antd.Tag, { color: "default", style: { marginRight: 0 } }, "No catalog service")),
      !cat && React.createElement("div", { style: { marginBottom: 12, padding: "8px 12px", border: "1px solid #fde68a", borderRadius: 6, background: "#fffbeb", color: "#92400e", fontSize: 13, fontFamily: FONT } },
        "This service is not linked to a catalog service — no comparison data available."),
      React.createElement(AntTable, {
        dataSource: cmpRows, rowKey: "key", pagination: false, size: "small", bordered: true,
        rowClassName: (r) => r.changed ? "" : "",
        columns: [
          { title: "Field", dataIndex: "field", width: 140 },
          {
            title: "Catalog (Original)", dataIndex: "original",
            render: (v, r) => React.createElement("div", { style: { whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: FONT } }, fmtCmpVal(v, r.type))
          },
          {
            title: "Current in Form", dataIndex: "quoted",
            render: (v, r) => React.createElement("div", { style: { whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: FONT } }, fmtCmpVal(v, r.type))
          },
          {
            title: "Status", width: 110, align: "center",
            render: (_, r) => r.catalogMissing
              ? React.createElement(ctx.antd.Tag, { color: "default" }, "No catalog")
              : r.changed ? React.createElement(ctx.antd.Tag, { color: "red" }, "Changed") : React.createElement(ctx.antd.Tag, { color: "green" }, "Same")
          },
        ],
      })
    );
  };

  const th = (ex = {}) => ({
    padding: "9px 12px",
    fontSize: 11.5,
    fontWeight: 600,
    color: C.textSub,
    background: C.bgSection,
    borderBottom: `2px solid ${C.border}`,
    whiteSpace: "normal",
    textAlign: "left",
    fontFamily: FONT,
    ...ex,
  });
  const td = (ex = {}) => ({
    padding: "8px 10px",
    fontSize: 13,
    borderBottom: `1px solid #f3f4f6`,
    verticalAlign: "middle",
    fontFamily: FONT,
    ...ex,
  });
  const selectedIds = useMemo(
    () => rows.map((r) => firstId(r.serviceId, r.service, r.services, r.catalogServiceId)).filter(Boolean).map(String),
    [rows],
  );
  const totals = useMemo(
    () =>
      rows.reduce(
        (a, r) => {
          const c = calcLine(r.basePrice, 1, r.vat);
          return {
            subTotal: a.subTotal + c.subTotal,
            vatAmount: a.vatAmount + c.vatAmount,
            totalAmount: a.totalAmount + c.totalAmount,
          };
        },
        { subTotal: 0, vatAmount: 0, totalAmount: 0 },
      ),
    [rows],
  );
  const displayTotals = packageMode ? packageTotals : totals;
  const thLabel = (label, helpKey = label) =>
    React.createElement(
      "span",
      { style: { display: "inline-flex", alignItems: "center" } },
      label,
      React.createElement(HelpMark, { text: FIELD_HELP[helpKey] }),
    );

  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        opacity: companyId ? 1 : 0.5,
        pointerEvents: companyId ? "auto" : "none",
      },
    },
    !companyId &&
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          zIndex: 10,
          background: "rgba(255,255,255,0.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            background: "#fefce8",
            border: `1px solid #fde68a`,
            padding: "10px 20px",
            borderRadius: 8,
            color: C.warning,
            fontWeight: 600,
            fontSize: 14,
            fontFamily: FONT,
          },
        },
        "Please select Internal Company first",
      ),
    ),

    pickerRowId !== null &&
    React.createElement(ServicePickerModal, {
      svcOpts,
      selectedIds,
      companyId,
      onSelect: (svc) => {
        onUpdate(pickerRowId, "__service__", {
          serviceId: svc.id,
          basePrice: packageMode ? 0 : svc.basePrice,
          serviceName: svc.serviceName,
          description: svc.description,
          serviceType: svc.serviceType || "",
          catalogService: svc.catalogService || null,
          catalogServiceId: svc.catalogServiceId || svc.id,
          catalogBasePrice: svc.catalogBasePrice ?? svc.basePrice,
          vat: packageMode ? 0 : undefined,
        });
        setPickerRowId(null);
      },
      onClose: () => setPickerRowId(null),
      onAddNewService: (data) => {
        onAddNewService(data).then((s) => {
          onUpdate(pickerRowId, "__service__", {
            serviceId: s.id,
            basePrice: packageMode ? 0 : s.basePrice,
            serviceName: s.serviceName,
            description: s.description,
            serviceType: s.serviceType || "",
            catalogService: s.catalogService || null,
            catalogServiceId: s.catalogServiceId || s.id,
            catalogBasePrice: s.catalogBasePrice ?? s.basePrice,
            vat: packageMode ? 0 : undefined,
          });
          setPickerRowId(null);
        });
      },
    }),

    React.createElement(
      "div",
      {
        style: {
          padding: "12px 16px",
          background: C.bgSection,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        React.createElement(
          "span",
          {
            style: {
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 13,
              color: C.text,
            },
          },
          "Service List",
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              color: C.textSub,
              background: "#e5e7eb",
              padding: "2px 8px",
              borderRadius: 10,
              fontFamily: FONT,
            },
          },
          `${rows.length} services`,
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, alignItems: "center" } },
        React.createElement(
          "div",
          {
            onClick: rows.length > 0 ? () => setCompareModal({ open: true, data: null }) : undefined,
            style: {
              padding: "5px 14px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              color: rows.length > 0 ? C.primary : C.textSub,
              cursor: rows.length > 0 ? "pointer" : "not-allowed",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: FONT,
              opacity: rows.length > 0 ? 1 : 0.5,
            },
          },
          "Review Changes",
        ),
        React.createElement(
          "div",
          {
            onClick: onAdd,
            style: {
              padding: "5px 14px",
              borderRadius: 6,
              border: `1px dashed ${C.primary}`,
              color: C.primary,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: FONT,
            },
          },
          "Add row",
        ),
      ),
    ),

    React.createElement(
      "div",
      {
        style: {
          padding: "14px 16px",
          borderBottom: `1px solid ${C.border}`,
          background: "#fff",
          display: "grid",
          gridTemplateColumns: packageMode
            ? "minmax(190px, 280px) minmax(0, 1fr)"
            : "minmax(0, 1fr)",
          gap: 14,
          alignItems: "start",
          width: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        { style: { minWidth: 0 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 11.5,
              fontWeight: 700,
              color: C.textSub,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              fontFamily: FONT,
            },
          },
          "Pricing Mode",
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              overflow: "hidden",
              maxWidth: 330,
              width: "100%",
              minWidth: 0,
            },
          },
          [
            [PRICING_MODE_LINE, "Line pricing"],
            [PRICING_MODE_PACKAGE, "Package pricing"],
          ].map(([mode, label]) =>
            React.createElement(
              "button",
              {
                key: mode,
                type: "button",
                onClick: () => onPricingModeChange(mode),
                style: {
                  border: "none",
                  borderRight: mode === PRICING_MODE_LINE ? `1px solid ${C.border}` : "none",
                  background: pricingMode === mode ? C.primary : "#fff",
                  color: pricingMode === mode ? "#fff" : C.text,
                  padding: "8px 14px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: FONT,
                  flex: "1 1 0",
                  whiteSpace: "nowrap",
                },
              },
              label,
            ),
          ),
        ),
      ),
      packageMode &&
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
            alignItems: "end",
            minWidth: 0,
            width: "100%",
          },
        },
        React.createElement(
          Field,
          { label: "Package Subtotal", required: true },
          React.createElement(PriceInput, {
            value: packageSubTotal,
            onChange: (v) => onPackageChange("packageSubTotal", v),
          }),
        ),
        React.createElement(
          Field,
          { label: "VAT %" },
          React.createElement("input", {
            type: "number",
            min: 0,
            max: 100,
            step: 0.1,
            value: packageVatRate,
            onChange: (e) =>
              onPackageChange("packageVatRate", parseFloat(e.target.value) || 0),
            style: inp({ textAlign: "right" }),
            onFocus,
            onBlur,
          }),
        ),
        React.createElement(
          Field,
          { label: "VAT Amount" },
          React.createElement(
            "div",
            {
              style: {
                ...inp({ background: C.bgSection }),
                textAlign: "right",
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              },
              title: fmtVND(packageTotals.vatAmount),
            },
            fmtVND(packageTotals.vatAmount),
          ),
        ),
        React.createElement(
          Field,
          { label: "Package Total" },
          React.createElement(
            "div",
            {
              style: {
                ...inp({ background: "#ecfdf5", color: C.success }),
                textAlign: "right",
                fontWeight: 800,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              },
              title: fmtVND(packageTotals.totalAmount),
            },
            fmtVND(packageTotals.totalAmount),
          ),
        ),
      ),
    ),

    React.createElement(
      "div",
      { style: { overflowX: "auto" } },
      React.createElement(
        "table",
        {
          style: { width: "100%", borderCollapse: "collapse", minWidth: packageMode ? 700 : 930 },
        },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement(
              "th",
              { style: th({ width: 36, textAlign: "center" }) },
              "#",
            ),
            React.createElement(
              "th",
              { style: th({ minWidth: 280 }) },
              thLabel("Service Name & Type", "Service Name"),
            ),
            React.createElement(
              "th",
              { style: th({ minWidth: 320 }) },
              thLabel("Description"),
            ),
            React.createElement(
              "th",
              { style: th({ width: 250, textAlign: "right" }) },
              thLabel("Unit Price (₫)", "Unit Price"),
            ),
            React.createElement(
              "th",
              { style: th({ width: 88, textAlign: "center" }) },
              thLabel("VAT %"),
            ),
            React.createElement(
              "th",
              {
                style: th({ width: 180, textAlign: "right", color: "#1d4ed8" }),
              },
              thLabel("Total"),
            ),
            React.createElement("th", { style: th({ width: 44 }) }, ""),
          ),
        ),
        React.createElement(
          "tbody",
          null,
          rows.length === 0
            ? React.createElement(
              "tr",
              null,
              React.createElement(
                "td",
                {
                  colSpan: 7,
                  style: td({
                    textAlign: "center",
                    color: "#9ca3af",
                    padding: "32px 0",
                  }),
                },
                'No services added - click "Add row"',
              ),
            )
            : rows.map((r, i) => {
              const line = packageMode
                ? calcLine(0, 1, 0)
                : calcLine(r.basePrice, 1, r.vat);
              return React.createElement(
                "tr",
                {
                  key: r._id,
                  style: { background: i % 2 === 0 ? "#fff" : "#fafafa" },
                },
                React.createElement(
                  "td",
                  {
                    style: td({
                      textAlign: "center",
                      color: C.textSub,
                      fontSize: 12,
                      fontWeight: 600,
                    }),
                  },
                  i + 1,
                ),
                React.createElement(
                  "td",
                  { style: td() },
                  React.createElement(
                    "div",
                    {
                      onClick: () => setPickerRowId(r._id),
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        border: `1px solid ${C.border}`,
                        borderRadius: 5,
                        padding: "5px 10px",
                        cursor: "pointer",
                        background: "#fff",
                        minHeight: 32,
                        fontSize: 13.5,
                        color: r.serviceId ? C.text : C.textSub,
                        lineHeight: "19px",
                      },
                    },
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          flex: 1,
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          style: {
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          },
                        },
                        r.serviceName || "— Select service —",
                      ),
                      r.serviceType &&
                      React.createElement(
                        "span",
                        {
                          style: {
                            alignSelf: "flex-start",
                            fontSize: 10,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 500,
                            lineHeight: "14px",
                            marginTop: 2,
                          },
                        },
                        r.serviceType,
                      ),
                    ),
                    React.createElement(
                      "span",
                      {
                        style: {
                          fontSize: 11,
                          color: C.primary,
                          marginLeft: 6,
                          flexShrink: 0,
                        },
                      },
                      "Select",
                    ),
                  ),
                ),
                React.createElement(
                  "td",
                  { style: td() },
                  React.createElement(AutoTextarea, {
                    value: r.description || "",
                    onChange: (v) => onUpdate(r._id, "description", v),
                    placeholder: "Service scope or row note...",
                    minRows: 2,
                  }),
                ),
                React.createElement(
                  "td",
                  { style: td({ textAlign: "right" }) },
                  packageMode
                    ? React.createElement("span", { style: { color: C.primary, fontWeight: 700, fontSize: 12.5 } }, "Included in package")
                    : React.createElement(PriceInput, {
                      value: r.basePrice,
                      onChange: (v) => onUpdate(r._id, "basePrice", v),
                    }),
                ),
                React.createElement(
                  "td",
                  { style: td({ textAlign: "center" }) },
                  packageMode
                    ? React.createElement("span", { style: { color: C.textSub, fontSize: 12.5 } }, "0%")
                    : React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          justifyContent: "center",
                        },
                      },
                      React.createElement("input", {
                        type: "number",
                        min: 0,
                        max: 100,
                        step: 1,
                        value: r.vat,
                        onChange: (e) =>
                          onUpdate(
                            r._id,
                            "vat",
                            parseFloat(e.target.value) || 0,
                          ),
                        style: {
                          border: `1px solid ${C.border}`,
                          borderRadius: 5,
                          padding: "5px 4px",
                          fontSize: 13.5,
                          outline: "none",
                          textAlign: "right",
                          width: 46,
                          fontFamily: FONT,
                        },
                      }),
                      React.createElement(
                        "span",
                        { style: { fontSize: 12, color: C.textSub } },
                        "%",
                      ),
                    ),
                ),
                React.createElement(
                  "td",
                  {
                    style: td({
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#1d4ed8",
                      fontSize: 14,
                    }),
                  },
                  packageMode ? "—" : fmtVND(line.totalAmount),
                ),
                React.createElement(
                  "td",
                  { style: td({ textAlign: "center", padding: "0 6px" }) },
                  React.createElement(
                    "div",
                    {
                      onClick: () => onDelete(r._id),
                      title: "Delete row",
                      style: {
                        cursor: "pointer",
                        color: C.danger,
                        width: 30,
                        height: 30,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 6,
                        margin: "0 auto",
                        transition: "background 0.15s",
                      },
                      onMouseEnter: (e) => {
                        e.currentTarget.style.background = "#fef2f2";
                      },
                      onMouseLeave: (e) => {
                        e.currentTarget.style.background = "transparent";
                      },
                    },
                    React.createElement(
                      "svg",
                      {
                        width: 15,
                        height: 15,
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 2,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                      },
                      React.createElement("polyline", {
                        points: "3 6 5 6 21 6",
                      }),
                      React.createElement("path", {
                        d: "M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
                      }),
                      React.createElement("path", { d: "M10 11v6" }),
                      React.createElement("path", { d: "M14 11v6" }),
                      React.createElement("path", { d: "M9 6V4h6v2" }),
                    ),
                  ),
                ),
              );
            }),
        ),
      ),
    ),

    rows.length > 0 &&
    React.createElement(
      "div",
      {
        style: {
          borderTop: `2px solid ${C.border}`,
          padding: "14px 20px",
          background: C.bgSection,
          display: "flex",
          justifyContent: "flex-end",
        },
      },
      React.createElement(
        "div",
        { style: { minWidth: 300 } },
        [
          [packageMode ? "Package Subtotal" : "Subtotal (excl. VAT)", fmtVND(displayTotals.subTotal), C.textSub, false],
          ["Total VAT", fmtVND(displayTotals.vatAmount), C.warning, false],
          [packageMode ? "Package Total" : "Total", fmtVND(displayTotals.totalAmount), C.success, true],
        ].map(([label, val, color, bold], i) =>
          React.createElement(
            "div",
            {
              key: i,
              style: {
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                borderBottom: i < 2 ? `1px dashed ${C.border}` : "none",
              },
            },
            React.createElement(
              "span",
              {
                style: {
                  fontSize: bold ? 14 : 13,
                  color: bold ? C.text : C.textSub,
                  fontWeight: bold ? 700 : 400,
                  fontFamily: FONT,
                },
              },
              label + ":",
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: bold ? 18 : 13.5,
                  color,
                  fontWeight: bold ? 700 : 600,
                  fontFamily: FONT_MONO,
                },
              },
              val,
            ),
          ),
        ),
      ),
    ),

    React.createElement(Modal, {
      title: compareModal.data ? "Review Service Changes" : "Review All Service Changes",
      open: compareModal.open,
      onCancel: () => setCompareModal({ open: false, data: null }),
      footer: React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
        compareModal.data &&
        React.createElement(ctx.antd.Button, {
          onClick: () => setCompareModal({ open: true, data: null }),
        }, "← Back to list"),
        React.createElement(ctx.antd.Button, {
          type: "primary",
          onClick: () => setCompareModal({ open: false, data: null }),
          style: { background: C.primary },
        }, "Close"),
      ),
      width: 900,
    }, compareModal.open && (
      compareModal.data ? renderCmpDetail(compareModal.data) : renderCmpList()
    )),
  );
};

const QuotationTutorialPanel = () => {
  const groups = [
    {
      title: "Thông tin liên quan",
      rows: [
        [
          "Internal Issuing Company",
          "Công ty/pháp nhân nội bộ phát hành báo giá. Sau khi chọn, form sẽ lọc dịch vụ và template theo công ty này.",
        ],
        [
          "Related Lead",
          "Dùng khi báo giá xuất phát từ lead hoặc cơ hội bán hàng chưa chuyển thành khách hàng chính thức.",
        ],
        [
          "Related Customer",
          "Dùng khi báo giá lập trực tiếp cho khách hàng đã có trong hệ thống.",
        ],
        [
          "Assigned Lawyer",
          "Luật sư phụ trách nội dung chuyên môn hoặc follow-up báo giá.",
        ],
      ],
    },
    {
      title: "Điều khoản báo giá",
      rows: [
        [
          "Payment Terms",
          "Điều khoản thanh toán dự kiến. Field này được lưu trên báo giá để hợp đồng hoặc invoice có thể tham chiếu sau.",
        ],
        [
          "Quotation Template",
          "File mẫu dùng để generate báo giá. Vì nội dung được tạo theo template nên form này không còn cần nhập nội dung mẫu.",
        ],
        [
          "Valid Until",
          "Ngày hết hiệu lực của báo giá. Có thể bỏ trống nếu báo giá chưa chốt thời hạn.",
        ],
        [
          "Address",
          "Địa chỉ liên hệ hoặc địa chỉ xuất hiện trên báo giá nếu mẫu in cần dùng.",
        ],
      ],
    },
    {
      title: "Dịch vụ",
      rows: [
        [
          "Service Name",
          "Chọn dịch vụ gốc từ danh sách dịch vụ của công ty. Đơn giá mặc định được lấy từ company service.",
        ],
        [
          "Description",
          "Mô tả phạm vi công việc cho từng dòng. Người dùng có thể chỉnh lại để phù hợp báo giá cụ thể.",
        ],
        ["Qty", "Số lượng dịch vụ hoặc số đơn vị tính phí."],
        ["Unit Price", "Đơn giá chưa VAT của dòng dịch vụ."],
        ["VAT %", "Phần trăm VAT áp dụng cho dòng dịch vụ."],
      ],
    },
    {
      title: "Tổng tiền",
      rows: [
        ["Subtotal", "Tổng tiền trước VAT, tự tính từ đơn giá và số lượng."],
        ["VAT Amount", "Số tiền VAT, tự tính theo VAT %."],
        [
          "Total",
          "Tổng tiền sau VAT. Giá trị này được lưu vào quotation và các quotation service.",
        ],
      ],
    },
  ];

  return React.createElement(
    "div",
    {
      style: {
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: C.bgSection,
        padding: 16,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          fontSize: 14,
          fontWeight: 700,
          color: C.text,
          marginBottom: 8,
        },
      },
      "Hướng dẫn tạo báo giá",
    ),
    React.createElement(
      "div",
      {
        style: {
          fontSize: 12.5,
          color: C.textSub,
          lineHeight: "19px",
          marginBottom: 14,
        },
      },
      "Phần này giải thích ý nghĩa các field trong form. Báo giá hiện chỉ lưu dữ liệu cấu trúc và template; nội dung chi tiết sẽ được generate theo file mẫu.",
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          columnGap: 18,
          rowGap: 12,
          alignItems: "start",
        },
      },
      groups.map((group) =>
        React.createElement(
          "div",
          {
            key: group.title,
            style: {
              borderTop: `1px solid ${C.border}`,
              paddingTop: 12,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12.5,
                fontWeight: 700,
                color: C.text,
                marginBottom: 7,
              },
            },
            group.title,
          ),
          group.rows.map(([name, desc]) =>
            React.createElement(
              "div",
              { key: name, style: { marginTop: 8 } },
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: C.textLabel,
                    marginBottom: 2,
                  },
                },
                name,
              ),
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 12.5,
                    color: C.textSub,
                    lineHeight: "19px",
                  },
                },
                desc,
              ),
            ),
          ),
        ),
      ),
    ),
  );
};

// ==================== MAIN FORM ====================
const QuotationCreateForm = () => {
  const [form, setForm] = useState({
    internalCompanyId: null,
    leadId: null,
    customerId: null,
    userId: null,
    lawyerId: null,
    assignedLawyerId: null,
    projectId: null,
    parentId: null,
    projectServiceId: null,
    quotationKind: "main",
    paymentTerms: "",
    validUntil: "",
    address: "",
    templateId: null,
    description: "",
    serviceDescription: "",
    pricingMode: PRICING_MODE_LINE,
    packageSubTotal: 0,
    packageVatRate: VAT_DEFAULT,
    isRequiredApproval: false,
    approvedById: null,
  });

  const [rows, setRows] = useState([]);
  const [internalCompanies, setInternalCompanies] = useState([]);
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [svcOpts, setSvcOpts] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentLead, setCurrentLead] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [popupContext, setPopupContext] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchAll("internalCompany:list"),
      fetchAll("companyServices:list", { appends: ["service"] }),
      fetchAll("services:list"),
      fetchAll("lead:list"),
      fetchAll("customers:list"),
      fetchAll("projects:list", { appends: ["customers", "customer", "internalCompany", "lawyer", "assignees"] }),
      fetchAll("template:list"),
      fetchAll("lawyers:list"),
      getCurrentUser(),
    ]).then(async ([comps, coSvcs, serviceCatalog, lds, custs, projs, tmps, laws, user]) => {
      setInternalCompanies(comps);
      setSvcOpts(enrichCompanyServices(coSvcs, serviceCatalog));
      setLeads(lds);
      setCustomers(custs);
      setProjects(projs);
      setTemplates(tmps);
      setLawyers(laws);
      setCurrentUser(user);
      const currentLawyerId = currentUserLawyerId(laws, user);
      if (user?.id || currentLawyerId) {
        setForm((p) => ({
          ...p,
          userId: user?.id ? String(user.id) : p.userId,
          lawyerId: currentLawyerId ? p.lawyerId || String(currentLawyerId) : p.lawyerId,
          assignedLawyerId: currentLawyerId
            ? p.assignedLawyerId || String(currentLawyerId)
            : p.assignedLawyerId,
        }));
      }

      const popupParams = getPopupParams();
      console.log("[QuotationCreateForm] popupParams received:", safeJsonStringify(popupParams));

      const match = window.location.pathname.match(/\/filterbytk\/(\d+)/i);
      const urlFilterByTk = match ? match[1] : ctx?.filterByTk || null;
      const hasCtxRecord =
        !!ctx.record &&
        typeof ctx.record === "object" &&
        Object.keys(ctx.record).length > 0;
      const hasPopupRecord =
        !!ctx.popup?.record &&
        typeof ctx.popup.record === "object" &&
        Object.keys(ctx.popup.record).length > 0;
      let urlContractRecord = null;
      let urlProjectRecord = null;
      if (!hasCtxRecord && !hasPopupRecord && urlFilterByTk) {
        if (!popupParams.sourceProjectId && !popupParams.projectId && !popupParams.caseId) {
          urlProjectRecord = await fetchRecord("projects:get", urlFilterByTk, {}, { quiet: true });
        }
        if (!urlProjectRecord) {
          urlContractRecord = await fetchRecord("contracts:get", urlFilterByTk);
        }
      }

      const contextRecord = hasCtxRecord
        ? ctx.record
        : (hasPopupRecord ? ctx.popup.record : (urlContractRecord || {}));
      const contextRecordKind = getContextRecordKind(contextRecord);
      const contextRecordId = extractId(contextRecord?.id);
      const contextProjectId = isProjectRecord(contextRecord) ? contextRecordId : null;
      const directCustomerId = recordCustomerId(contextRecord);
      const directLeadId = recordLeadId(contextRecord);
      const contextCompanyId = recordInternalCompanyId(contextRecord);
      const contextCustomerId = firstId(
        directCustomerId,
        contextRecordKind === "customer" ? contextRecordId : null,
      );
      const contextLeadId = contextCustomerId
        ? null
        : firstId(
            directLeadId,
            contextRecordKind === "lead" ? contextRecordId : null,
          );
      const hasContextParty = !!(contextLeadId || contextCustomerId);
      const popupProjectId =
        extractId(popupParams.projectId) ||
        extractId(popupParams.caseId) ||
        extractId(popupParams.sourceProjectId) ||
        contextProjectId ||
        extractId(urlProjectRecord?.id);
      debugQuotationContext("raw", {
        urlFilterByTk,
        urlContractRecordId: extractId(urlContractRecord?.id),
        urlProjectRecordId: extractId(urlProjectRecord?.id),
        recordId: contextRecordId,
        recordKeys: Object.keys(contextRecord || {}).slice(0, 30).join(","),
        contextRecordKind,
        directCustomerId,
        directLeadId,
        contextCustomerId,
        contextLeadId,
        contextCompanyId,
        contextProjectId,
        popupProjectId,
      });

      const popupProjectServiceId = extractId(popupParams.projectServiceId);
      const rawPsIds = popupParams.projectServiceId || popupParams.projectServiceIds;
      const popupProjectServiceIds = [];
      if (rawPsIds) {
        if (Array.isArray(rawPsIds)) {
          popupProjectServiceIds.push(...rawPsIds.map(id => parseInt(id, 10)).filter(Boolean));
        } else {
          const str = String(rawPsIds);
          if (str.includes(",")) {
            popupProjectServiceIds.push(...str.split(",").map(s => parseInt(s.trim(), 10)).filter(Boolean));
          } else {
            const parsed = parseInt(str, 10);
            if (parsed) popupProjectServiceIds.push(parsed);
          }
        }
      }
      const popupParentQuotationId =
        extractId(popupParams.parentQuotationId) ||
        extractId(popupParams.mainQuotationId) ||
        extractId(popupParams.parentId);
      const popupQuotationMode = String(popupParams.quotationKind || popupParams.quotationMode || "").toLowerCase();
      const popupQuotationKind =
        popupQuotationMode === "supplement" ||
          popupQuotationMode === "sub" ||
          popupQuotationMode === "sub-quotation" ||
          popupParentQuotationId
          ? "supplement"
          : "main";

      let popupProject = null;
      let popupProjectService = null;
      let popupProjectServices = [];
      let popupParentQuotation = null;

      if (popupProjectId) {
        if (contextProjectId && String(contextProjectId) === String(popupProjectId)) {
          popupProject = contextRecord;
        } else if (urlProjectRecord && String(extractId(urlProjectRecord?.id)) === String(popupProjectId)) {
          popupProject = urlProjectRecord;
        } else {
          popupProject = await fetchRecord("projects:get", popupProjectId);
        }
      }
      if (popupProjectServiceIds.length > 0) {
        try {
          const psRes = await ctx.api.request({
            url: "projectServices:list",
            params: {
              filter: JSON.stringify({ id: { $in: popupProjectServiceIds } }),
              appends: ["services"],
              pageSize: 1000,
            },
          });
          popupProjectServices = psRes?.data?.data || [];
          if (popupProjectServices.length > 0) {
            popupProjectService = popupProjectServices[0];
          }
        } catch (e) {
          console.warn("[QuotationCreateForm] Could not fetch projectServices:", e);
        }
      } else if (popupProjectServiceId) {
        popupProjectService = await fetchRecord("projectServices:get", popupProjectServiceId, {
          appends: ["services"],
        });
      }
      if (popupParentQuotationId) {
        popupParentQuotation = await fetchRecord("quotations:get", popupParentQuotationId);
      }
      if (popupProject) {
        setProjects((prev) => mergeRecordById(prev, popupProject));
      }

      if (
        popupProjectId ||
        popupProjectServiceId ||
        popupProjectServiceIds.length > 0 ||
        popupParentQuotationId ||
        popupParams.customerId ||
        popupParams.internalCompanyId ||
        popupParams.lawyerId
      ) {
        const resolvedCustomerId =
          firstId(
            popupParams.customerId,
            popupProject?.customerId,
            popupProject?.customer,
            popupProject?.customers,
            popupParentQuotation?.customerId,
            popupParentQuotation?.customer,
            popupParentQuotation?.customers,
          );
        const resolvedCompanyId =
          firstId(
            popupParams.internalCompanyId,
            popupProject?.internalCompanyId,
            popupProject?.internalCompany,
            popupProject?.internalCompanies,
            popupParentQuotation?.internalCompanyId,
            popupParentQuotation?.internalCompany,
            popupParentQuotation?.internalCompanies,
          );
        const resolvedLawyerId =
          firstId(
            popupParams.lawyerId,
            popupProject?.lawyerId,
            popupProject?.lawyer,
            popupProject?.lawyers,
            popupProject?.assignedLawyerId,
            popupProject?.assignedLawyer,
            popupProject?.projectManagerId,
            popupProject?.projectManager,
            popupProject?.assignees,
            popupParentQuotation?.lawyerId,
            popupParentQuotation?.lawyer,
            popupParentQuotation?.lawyers,
          );

        console.log("[QuotationCreateForm] resolved preloaded fields:", JSON.stringify({
          resolvedCustomerId,
          resolvedCompanyId,
          resolvedLawyerId,
        }));

        if (resolvedCustomerId) {
          const foundCustomer = custs.find((c) => String(c.id) === String(resolvedCustomerId));
          if (foundCustomer) {
            console.log("[QuotationCreateForm] Preloaded customer found in cache:", foundCustomer);
            setCurrentCustomer(foundCustomer);
          } else {
            console.log("[QuotationCreateForm] Preloaded customer not in cache, fetching asynchronously...");
            const fetchedCust = await fetchRecord("customers:get", resolvedCustomerId);
            if (fetchedCust) {
              console.log("[QuotationCreateForm] Fetched preloaded customer:", fetchedCust);
              setCurrentCustomer(fetchedCust);
              setCustomers((prev) => mergeRecordById(prev, fetchedCust));
            }
          }
        }

        setPopupContext({
          project: popupProject,
          projectService: popupProjectService,
          parentQuotation: popupParentQuotation,
          params: popupParams,
        });

        const parentPackageMode = isPackagePricing(popupParentQuotation?.pricingMode);
        const parentPackageSubTotal = parentPackageMode
          ? parseNum(popupParentQuotation?.packageSubTotal ?? popupParentQuotation?.subTotal)
          : 0;
        const parentPackageVatRate =
          popupParentQuotation?.packageVatRate ??
          (parentPackageMode && popupParentQuotation?.subTotal
            ? (parseNum(popupParentQuotation?.vatAmount) * 100) / parseNum(popupParentQuotation?.subTotal)
            : null);

        setForm((p) => ({
          ...p,
          projectId: popupProjectId ? String(popupProjectId) : p.projectId,
          parentId: popupParentQuotationId ? String(popupParentQuotationId) : p.parentId,
          projectServiceId: popupProjectServiceIds.length > 0 ? String(popupProjectServiceIds[0]) : (popupProjectServiceId ? String(popupProjectServiceId) : p.projectServiceId),
          quotationKind: popupQuotationKind,
          customerId: resolvedCustomerId ? String(resolvedCustomerId) : p.customerId,
          internalCompanyId: resolvedCompanyId ? String(resolvedCompanyId) : p.internalCompanyId,
          lawyerId: resolvedLawyerId ? String(resolvedLawyerId) : p.lawyerId,
          assignedLawyerId: resolvedLawyerId ? String(resolvedLawyerId) : p.assignedLawyerId,
          paymentTerms: popupParentQuotation?.paymentTerms || p.paymentTerms,
          validUntil: popupParentQuotation?.validUntil || p.validUntil,
          address: popupParentQuotation?.address || p.address,
          description: popupParentQuotation?.description || p.description,
          serviceDescription: popupParentQuotation?.serviceDescription || p.serviceDescription,
          pricingMode: popupParentQuotation?.pricingMode || p.pricingMode,
          packageSubTotal: parentPackageMode ? parentPackageSubTotal : p.packageSubTotal,
          packageVatRate: parentPackageVatRate ?? p.packageVatRate,
        }));

        const serviceId =
          extractId(popupProjectService?.serviceId) ||
          extractId(popupProjectService?.services) ||
          extractId(popupParams.serviceId);
        const serviceName =
          popupProjectService?.serviceName ||
          popupProjectService?.services?.serviceName ||
          popupProjectService?.name ||
          popupParams.serviceName ||
          "";
        if (popupProjectServices.length > 0) {
          const preloadedRows = popupProjectServices.map((ps, idx) => {
            const svcId = extractId(ps?.serviceId) || extractId(ps?.services);
            const svcName = ps?.serviceName || ps?.services?.serviceName || ps?.name || "";
            return {
              _id: Date.now() + idx,
              projectServiceId: extractId(ps.id),
              serviceId: svcId || null,
              serviceName: svcName,
              description: ps?.description || ps?.services?.description || "",
              quantity: 1,
              basePrice: Number(ps?.basePrice) || 0,
              vat: VAT_DEFAULT,
              catalogService: ps?.services || null,
              catalogServiceId: svcId || null,
              catalogBasePrice: ps?.services?.basePrice ?? null,
            };
          });
          setRows(preloadedRows);
        } else if (popupProjectServiceId && serviceName) {
          setRows([{
            _id: Date.now(),
            projectServiceId: popupProjectServiceId,
            serviceId: serviceId || null,
            serviceName,
            description: popupProjectService?.description || popupProjectService?.services?.description || popupParams.description || "",
            quantity: 1,
            basePrice: Number(popupProjectService?.basePrice ?? popupParams.basePrice) || 0,
            vat: VAT_DEFAULT,
            catalogService: popupProjectService?.services || null,
            catalogServiceId: serviceId || null,
            catalogBasePrice: popupProjectService?.services?.basePrice ?? null,
          }]);
        }
      }

      if (hasContextParty && !popupProjectId && !popupProjectServiceId && popupProjectServiceIds.length === 0) {
        if (contextLeadId) {
          debugQuotationContext("apply-lead", {
            contextLeadId,
            contextCompanyId,
          });
          const foundLead =
            lds.find((l) => String(l.id) === String(contextLeadId)) ||
            (contextRecordKind === "lead" ? contextRecord : null);
          if (foundLead) {
            setCurrentLead(foundLead);
            setLeads((prev) => mergeRecordById(prev, foundLead));
          }
          setForm((p) => ({
            ...p,
            leadId: String(contextLeadId),
            customerId: null,
            internalCompanyId: contextCompanyId ? String(contextCompanyId) : p.internalCompanyId,
          }));
        }
        if (contextCustomerId) {
          debugQuotationContext("apply-customer", {
            contextCustomerId,
            contextCompanyId,
            source: urlContractRecord ? "url-contract" : contextRecordKind || "record",
          });
          let foundCustomer =
            custs.find((c) => String(c.id) === String(contextCustomerId)) ||
            (contextRecordKind === "customer" ? contextRecord : null);
          if (!foundCustomer) {
            foundCustomer = await fetchRecord("customers:get", contextCustomerId);
          }
          if (foundCustomer) {
            setCurrentCustomer(foundCustomer);
            setCustomers((prev) => mergeRecordById(prev, foundCustomer));
          }
          setForm((p) => ({
            ...p,
            leadId: null,
            customerId: String(contextCustomerId),
            internalCompanyId: contextCompanyId
              ? String(contextCompanyId)
              : (recordInternalCompanyId(foundCustomer) ? String(recordInternalCompanyId(foundCustomer)) : p.internalCompanyId),
          }));
        }
      }

      const preferredCustomerId = firstId(
        ctx?.params?.customerId,
        ctx?.record?.customerId,
        ctx?.record?.customer,
        ctx?.record?.customers,
      );
      const preferredLeadId = preferredCustomerId
        ? null
        : firstId(
            ctx?.params?.leadId,
            ctx?.record?.leadId,
            ctx?.record?.lead,
            ctx?.record?.leads,
          );
      const urlId =
        preferredCustomerId ||
        preferredLeadId ||
        (match ? match[1] : ctx?.filterByTk || null);

      if (urlId && !hasContextParty && !popupProjectId && !popupProjectServiceId && popupProjectServiceIds.length === 0) {
        let foundCust =
          preferredCustomerId
            ? custs.find((c) => String(c.id) === String(preferredCustomerId))
            : null;
        if (preferredCustomerId && !foundCust) {
          foundCust = await fetchRecord("customers:get", preferredCustomerId);
        }
        if (foundCust) {
          setCurrentCustomer(foundCust);
          const companyId = recordInternalCompanyId(foundCust);
          setCustomers((prev) => mergeRecordById(prev, foundCust));
          setForm((p) => ({
            ...p,
            leadId: null,
            customerId: String(foundCust.id),
            internalCompanyId: companyId ? String(companyId) : p.internalCompanyId,
          }));
        } else if (preferredLeadId) {
          const foundLead = lds.find((l) => String(l.id) === String(preferredLeadId));
          if (foundLead) {
            setCurrentLead(foundLead);
            const companyId = recordInternalCompanyId(foundLead);
            setForm((p) => ({
              ...p,
              leadId: String(foundLead.id),
              customerId: null,
              internalCompanyId: companyId ? String(companyId) : p.internalCompanyId,
            }));
          }
        } else {
          const foundLead = lds.find((l) => String(l.id) === String(urlId));
          if (foundLead) {
            setCurrentLead(foundLead);
            const companyId = recordInternalCompanyId(foundLead);
            setForm((p) => ({
              ...p,
              leadId: String(foundLead.id),
              customerId: null,
              internalCompanyId: companyId ? String(companyId) : p.internalCompanyId,
            }));
          } else {
            const fallbackCust = custs.find((c) => String(c.id) === String(urlId));
            if (fallbackCust) {
              setCurrentCustomer(fallbackCust);
              const companyId = recordInternalCompanyId(fallbackCust);
              setForm((p) => ({
                ...p,
                leadId: null,
                customerId: String(fallbackCust.id),
                internalCompanyId: companyId ? String(companyId) : p.internalCompanyId,
              }));
            }
          }
        }
      }
      setLoading(false);
    });
  }, []);

  const setF = useCallback((k, v) => setForm((p) => ({ ...p, [k]: v })), []);

  // Toggle approval — reset approvedById khi tắt
  const toggleApproval = useCallback(() => {
    setForm((p) => ({
      ...p,
      isRequiredApproval: !p.isRequiredApproval,
      approvedById: !p.isRequiredApproval ? p.approvedById : null, // giữ nếu bật, clear nếu tắt
    }));
  }, []);

  const handleSelectTemplate = async (templateId) => {
    setF("templateId", templateId || null);
  };

  const filteredTemplates = useMemo(
    () =>
      form.internalCompanyId
        ? templates.filter(
          (t) =>
            !t.internalCompanyId ||
            String(t.internalCompanyId) === String(form.internalCompanyId),
        )
        : templates,
    [templates, form.internalCompanyId],
  );

  const projectOptions = useMemo(
    () =>
      [...projects].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      ),
    [projects],
  );

  const packageTotals = useMemo(
    () => calcPackageTotals(form.packageSubTotal, form.packageVatRate),
    [form.packageSubTotal, form.packageVatRate],
  );

  const handlePricingModeChange = (mode) => {
    const nextMode = isPackagePricing(mode) ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE;
    if (nextMode === form.pricingMode) return;
    if (nextMode === PRICING_MODE_PACKAGE) {
      const currentLineTotals = rows
        .map((r) => ({
          ...r,
          ...calcLine(r.basePrice, 1, r.vat),
        }))
        .reduce(
          (a, l) => ({
            subTotal: a.subTotal + l.subTotal,
            vatAmount: a.vatAmount + l.vatAmount,
            totalAmount: a.totalAmount + l.totalAmount,
          }),
          { subTotal: 0, vatAmount: 0, totalAmount: 0 },
        );
      setForm((p) => ({
        ...p,
        pricingMode: PRICING_MODE_PACKAGE,
        packageSubTotal: p.packageSubTotal || currentLineTotals.subTotal,
        packageVatRate: p.packageVatRate ?? VAT_DEFAULT,
      }));
      setRows((p) => p.map((r) => ({ ...r, basePrice: 0, vat: 0 })));
      return;
    }
    setForm((p) => ({ ...p, pricingMode: PRICING_MODE_LINE }));
  };

  const setPackageField = (key, value) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleProjectChange = async (projectId) => {
    const nextProjectId = extractId(projectId);
    if (!nextProjectId) {
      setForm((p) => ({ ...p, projectId: null }));
      return;
    }

    let project =
      projects.find((item) => String(extractId(item?.id)) === String(nextProjectId)) ||
      null;
    if (!project) {
      project = await fetchRecord("projects:get", nextProjectId, {
        appends: ["customers", "customer", "internalCompany", "lawyer", "assignees"],
      });
    }
    if (project) {
      setProjects((prev) => mergeRecordById(prev, project));
    }

    const customerId = recordCustomerId(project);
    const companyId = recordInternalCompanyId(project);
    const lawyerId = recordLawyerId(project);

    if (customerId) {
      let foundCustomer = customers.find((item) => String(extractId(item?.id)) === String(customerId));
      if (!foundCustomer) {
        foundCustomer = await fetchRecord("customers:get", customerId);
      }
      if (foundCustomer) {
        setCurrentCustomer(foundCustomer);
        setCustomers((prev) => mergeRecordById(prev, foundCustomer));
      }
    }

    setForm((p) => ({
      ...p,
      projectId: String(nextProjectId),
      leadId: customerId ? null : p.leadId,
      customerId: customerId ? String(customerId) : p.customerId,
      internalCompanyId: companyId ? String(companyId) : p.internalCompanyId,
      lawyerId: lawyerId ? String(lawyerId) : p.lawyerId,
      assignedLawyerId: lawyerId ? String(lawyerId) : p.assignedLawyerId,
    }));
  };

  const refreshLeads = useCallback(async () => {
    setLeads(await fetchAll("lead:list"));
  }, []);

  const refreshCustomers = useCallback(async () => {
    setCustomers(await fetchAll("customers:list"));
  }, []);

  const refreshTemplates = useCallback(async () => {
    setTemplates(await fetchAll("template:list"));
  }, []);

  const openCreatePopup = useCallback(
    async (viewKey, refreshFn) => {
      const opened = await openPopupViewByUid(viewKey);
      if (opened && refreshFn) {
        setTimeout(refreshFn, 1200);
        setTimeout(refreshFn, 3500);
      }
    },
    [],
  );

  const addRow = () =>
    setRows((p) => [
      ...p,
      {
        _id: Date.now(),
        projectServiceId: null,
        serviceId: null,
        serviceName: "",
        description: "",
        quantity: 1,
        basePrice: 0,
        vat: isPackagePricing(form.pricingMode) ? 0 : VAT_DEFAULT,
      },
    ]);
  const deleteRow = (id) => setRows((p) => p.filter((r) => r._id !== id));
  const updateRow = (id, field, value) =>
    setRows((p) =>
      p.map((r) => {
        if (r._id !== id) return r;
        if (field === "__service__")
          return {
            ...r,
            projectServiceId: r.projectServiceId || value.projectServiceId || null,
            serviceId: value.serviceId,
            basePrice: value.basePrice,
            vat: value.vat ?? r.vat,
            serviceName: value.serviceName,
            serviceType: value.serviceType || "",
            description: value.description || "",
            catalogService: value.catalogService || r.catalogService || null,
            catalogServiceId: value.catalogServiceId || value.serviceId || r.catalogServiceId || null,
            catalogBasePrice: value.catalogBasePrice ?? value.basePrice ?? r.catalogBasePrice ?? null,
          };
        return { ...r, [field]: value };
      }),
    );

  const handleAddNewService = async (data) => {
    return {
      id: null,
      serviceName: data.name,
      serviceType: data.serviceType || null,
      basePrice: data.price,
      description: data.description || "",
      catalogServiceId: null,
      catalogBasePrice: null,
      catalogService: null,
    };
  };

  const handleSubmit = async () => {
    if (!form.internalCompanyId) {
      message.warning("Please select Internal Issuing Company");
      return;
    }
    if (!form.leadId && !form.customerId) {
      message.warning("Please select Related Lead or Customer");
      return;
    }
    if (!form.paymentTerms) {
      message.warning("Please select payment terms");
      return;
    }
    if (form.quotationKind === "supplement" && !form.parentId) {
      message.warning("Please select or pass the main quotation before creating a supplementary quotation.");
      return;
    }
    if (rows.length === 0) {
      message.warning("Please add at least 1 service");
      return;
    }
    const packageMode = isPackagePricing(form.pricingMode);
    if (rows.find((r) => !r.serviceId && !r.projectServiceId && !r.serviceName?.trim())) {
      message.warning("Please select service information");
      return;
    }
    if (!packageMode && rows.find((r) => parseNum(r.basePrice) <= 0)) {
      message.warning("Please fill in all service information");
      return;
    }
    if (packageMode && parseNum(form.packageSubTotal) <= 0) {
      message.warning("Please enter package subtotal");
      return;
    }

    // Nếu yêu cầu xét duyệt nhưng chưa chọn người duyệt → cảnh báo (không block, vì approvedById là optional)
    if (form.isRequiredApproval && !form.approvedById) {
      message.info(
        "Note: You have not selected an approver. Quotation will be created with pending status.",
      );
    }

    setSubmitting(true);
    try {
      setSubmitStep("Creating quotation...");
      const lines = rows.map((r) => ({
        ...r,
        ...buildServicePricingPayload({
          pricingMode: form.pricingMode,
          basePrice: r.basePrice,
          quantity: 1,
          vat: r.vat,
          packageSubTotal: form.packageSubTotal,
          packageVatRate: form.packageVatRate,
        }),
      }));

      for (const line of lines) {
        if (line.projectServiceId && line.serviceId) {
          try {
            await ctx.api.request({
              url: "projectServices:update",
              method: "POST",
              params: { filterByTk: line.projectServiceId },
              data: { serviceId: parseInt(line.serviceId, 10) },
            });
          } catch (error) {
            console.warn("[QuotationCreateForm] Could not backfill serviceId on projectService", error);
          }
        }
      }

      const lineTotals = calcRowsTotals(lines);
      const totals = packageMode
        ? calcPackageTotals(form.packageSubTotal, form.packageVatRate)
        : lineTotals;

      // ── approvedAt: ghi nhận datetime lúc tạo nếu isRequiredApproval = true ──
      const approvedAt = form.isRequiredApproval
        ? new Date().toISOString()
        : null;
      const projectId = form.projectId ? parseInt(form.projectId, 10) : null;
      const parentId = form.parentId ? parseInt(form.parentId, 10) : null;
      const quotationKind = form.quotationKind || (parentId ? "supplement" : "main");
      const quotationTitle =
        quotationKind === "supplement"
          ? `Báo giá bổ sung${popupContext?.projectService?.serviceName ? ` - ${popupContext.projectService.serviceName}` : ""}`
          : "Báo giá";
      const quotationStatus = "new";
      const projectServiceStatus = form.isRequiredApproval
        ? "quote_pending_approval"
        : quoteStatusToServiceStatus(quotationStatus);

      const qRes = await ctx.api.request({
        url: "quotations:create",
        method: "POST",
        data: {
          quotationKind,
          parentId,
          title: quotationTitle,
          internalCompanyId: parseInt(form.internalCompanyId),
          leadId: form.leadId ? parseInt(form.leadId) : null,
          customerId: form.customerId ? parseInt(form.customerId) : null,
          projectId,
          userId: form.userId ? parseInt(form.userId) : null,
          lawyerId: form.assignedLawyerId || form.lawyerId
            ? parseInt(form.assignedLawyerId || form.lawyerId)
            : null,
          templateId: form.templateId ? parseInt(form.templateId) : null,
          paymentTerms: form.paymentTerms,
          validUntil: form.validUntil || null,
          address: form.address || null,
          description: form.description || null,
          serviceDescription: form.serviceDescription || null,
          status: quotationStatus,
          pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
          packageSubTotal: packageMode ? totals.subTotal : null,
          packageVatRate: packageMode ? parseNum(form.packageVatRate) : null,
          subTotal: totals.subTotal,
          vatAmount: totals.vatAmount,
          totalAmount: totals.totalAmount,
          // ── Approval fields ──
          isRequiredApproval: form.isRequiredApproval,
          approvedById:
            form.isRequiredApproval && form.approvedById
              ? parseInt(form.approvedById)
              : null,
          approvedAt: approvedAt,
          createdById: currentUser?.id || null,
          updatedById: currentUser?.id || null,
        },
      });

      const quotationId = qRes?.data?.data?.id || qRes?.data?.id;
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        setSubmitStep(`Saving service ${i + 1}/${lines.length}...`);
        const svcMeta = svcOpts.find(
          (s) =>
            String(serviceOptionServiceId(s)) ===
            String(l.serviceId),
        );
        const serviceType = l.serviceType || serviceOptionType(svcMeta) || null;
        const description =
          l.description ||
          serviceOptionDescription(svcMeta) ||
          null;
        const qsRes = await ctx.api.request({
          url: "quotationServices:create",
          method: "POST",
          data: {
            quotationId,
            serviceId: l.serviceId,
            serviceName: l.serviceName || null,
            serviceType: serviceType,
            description: description,
            basePrice: l.basePrice,
            quantity: l.quantity,
            vat: l.vat,
            subTotal: l.subTotal,
            vatAmount: l.vatAmount,
            totalAmount: l.totalAmount,
            pricingMode: l.pricingMode,
            packageSubTotal: l.packageSubTotal,
            packageVatRate: l.packageVatRate,
            packageVatAmount: l.packageVatAmount,
            packageTotalAmount: l.packageTotalAmount,
          },
        });
        const quotationServiceId = qsRes?.data?.data?.id || qsRes?.data?.id;
        const targetProjectServiceId = l.projectServiceId || (lines.length === 1 ? form.projectServiceId : null);
        if (targetProjectServiceId) {
          await ctx.api.request({
            url: "projectServices:update",
            method: "POST",
            params: { filterByTk: targetProjectServiceId },
            data: {
              quotationId,
              quotationServiceId,
              serviceId: l.serviceId ? parseInt(l.serviceId, 10) : null,
              serviceName: l.serviceName || null,
              serviceType: serviceType || null,
              description: description || null,
              basePrice: l.basePrice,
              quantity: l.quantity,
              vat: l.vat,
              subTotal: l.subTotal,
              vatAmount: l.vatAmount,
              totalAmount: l.totalAmount,
              pricingMode: l.pricingMode,
              packageSubTotal: l.packageSubTotal,
              packageVatRate: l.packageVatRate,
              packageVatAmount: l.packageVatAmount,
              packageTotalAmount: l.packageTotalAmount,
              status: projectServiceStatus,
            },
          });
        }
      }

      if (projectId && quotationKind === "main") {
        await ctx.api.request({
          url: "projects:update",
          method: "POST",
          params: { filterByTk: projectId },
          data: { quotationId },
        }).catch((error) => console.warn("[QuotationCreateForm] Could not link main quotation to project", error));
      }

      message.success("Quotation created successfully!");
      setTimeout(() => {
        if (ctx.view?.close) {
          ctx.view.close();
        } else {
          window.location.href = REDIRECT_URL;
        }
      }, 1200);
    } catch (e) {
      message.error("Error: " + (e?.message || "Please try again"));
    }
    setSubmitting(false);
    setSubmitStep("");
  };

  if (loading)
    return React.createElement(
      "div",
      { style: { textAlign: "center", padding: 80 } },
      React.createElement(Spin, { size: "large" }),
    );

  const selStyle = { ...inp(), cursor: "pointer" };

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: FONT,
        color: C.text,
        background: C.bgCard,
        width: "100%",
        padding: 20,
        boxSizing: "border-box",
      },
    },

    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
        },
      },
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setGuideOpen(true),
          style: {
            padding: "8px 14px",
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: C.bgCard,
            color: C.text,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT,
          },
        },
        "Hướng dẫn",
      ),
    ),

    React.createElement(
      Card,
      null,
      React.createElement(CardHeader, { title: "Quotation Information" }),
      React.createElement(
        "div",
        { style: { padding: 0 } },

        // Công ty
        React.createElement(
          "div",
          {
            style: {
              marginBottom: 18,
            },
          },
          React.createElement(
            Field,
            { label: "Internal Issuing Company", required: true },
            React.createElement(
              "select",
              {
                value: form.internalCompanyId || "",
                onChange: (e) => {
                  setF("internalCompanyId", e.target.value || null);
                  setRows([]);
                  setF("templateId", null);
                },
                style: {
                  ...selStyle,
                  fontWeight: 500,
                  fontSize: 13,
                },
              },
              React.createElement(
                "option",
                { value: "" },
                "— Select company —",
              ),
              ...internalCompanies.map((c) =>
                React.createElement(
                  "option",
                  { key: c.id, value: c.id },
                  c.companyName || c.name || `Company #${c.id}`,
                ),
              ),
            ),
          ),
        ),

        // Lead + Customer + Luật sư phụ trách (3 cột)
        React.createElement(
          "div",
          { style: { marginBottom: 18 } },
          React.createElement(
            Field,
            { label: "Related Case", hint: "optional" },
            React.createElement(
              "select",
              {
                value: form.projectId || "",
                onChange: (e) => handleProjectChange(e.target.value || null),
                style: {
                  ...selStyle,
                  fontWeight: 500,
                  fontSize: 13,
                },
              },
              React.createElement("option", { value: "" }, "-- Select case --"),
              ...projectOptions.map((project) =>
                React.createElement(
                  "option",
                  { key: project.id, value: project.id },
                  projectLabel(project),
                ),
              ),
            ),
          ),
        ),

        React.createElement(
          Grid,
          { cols: 3, gap: 16, mb: 16 },
          React.createElement(
            Field,
            {
              label: "Related Lead",
              hint: !form.customerId ? "1 of 2 required" : "optional",
            },
            React.createElement(LeadDropdown, {
              leads,
              value: form.leadId,
              onChange: (v) => {
                setF("leadId", v);
                if (v) setF("customerId", null);
              },
              currentLead,
              onAddNew: () => openCreatePopup("leadCreate", refreshLeads),
            }),
          ),
          React.createElement(
            Field,
            {
              label: "Related Customer",
              hint: !form.leadId ? "1 of 2 required" : "optional",
            },
            React.createElement(CustomerDropdown, {
              customers,
              value: form.customerId,
              onChange: (v) => {
                setF("customerId", v);
                if (v) setF("leadId", null);
              },
              currentCustomer,
              onAddNew: () => openCreatePopup("customerCreate", refreshCustomers),
            }),
          ),
          React.createElement(
            Field,
            { label: "Assigned Lawyer", hint: "optional" },
            React.createElement(LawyerPicker, {
              lawyers,
              value: form.assignedLawyerId,
              onChange: (v) => setF("assignedLawyerId", v),
            }),
          ),
        ),

        // ── APPROVAL SECTION ──
        // Nằm dưới 2 cột trên, trước Điều khoản & Template
        React.createElement(
          "div",
          { style: { marginBottom: 16 } },
          React.createElement(ApprovalSection, {
            isRequired: form.isRequiredApproval,
            approvedById: form.approvedById,
            lawyers,
            onToggle: toggleApproval,
            onSelectApprover: (v) => setF("approvedById", v),
          }),
        ),

        // Điều khoản + Template
        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 16 },
          React.createElement(
            Field,
            { label: "Payment Terms", required: true },
            React.createElement(
              "select",
              {
                value: form.paymentTerms,
                onChange: (e) => setF("paymentTerms", e.target.value),
                style: selStyle,
              },
              React.createElement("option", { value: "" }, "— Select terms —"),
              ...PAYMENT_TERMS.map((p) =>
                React.createElement(
                  "option",
                  { key: p.value, value: p.value },
                  p.label,
                ),
              ),
            ),
          ),
          React.createElement(
            Field,
            {
              label: "Quotation Template",
              hint: !form.internalCompanyId
                ? "select company first"
                : undefined,
            },
            React.createElement(
              "div",
              { style: { position: "relative", minWidth: 0 } },
              React.createElement(
                "select",
                {
                  value: form.templateId || "",
                  onChange: (e) => handleSelectTemplate(e.target.value || null),
                  style: {
                    ...selStyle,
                    opacity: !form.internalCompanyId ? 0.45 : 1,
                    cursor: !form.internalCompanyId ? "not-allowed" : "pointer",
                    background: !form.internalCompanyId ? "#f3f4f6" : "#fff",
                    minWidth: 0,
                    paddingRight: 82,
                  },
                  disabled: !form.internalCompanyId,
                },
                React.createElement(
                  "option",
                  { value: "" },
                  !form.internalCompanyId
                    ? "— Select company first —"
                    : "— Select template —",
                ),
                ...filteredTemplates.map((t) =>
                  React.createElement(
                    "option",
                    { key: t.id, value: t.id },
                    t.templateName || t.name,
                  ),
                ),
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openCreatePopup("quotationTemplateCreate", refreshTemplates);
                  },
                  style: {
                    border: `1px dashed ${C.primary}`,
                    borderRadius: 5,
                    background: "#fff",
                    color: C.primary,
                    cursor: "pointer",
                    fontFamily: FONT,
                    fontSize: 11,
                    fontWeight: 700,
                    height: 24,
                    lineHeight: "22px",
                    padding: "0 8px",
                    position: "absolute",
                    right: 7,
                    top: "50%",
                    transform: "translateY(-50%)",
                    whiteSpace: "nowrap",
                  },
                },
                "+ Add",
              ),
            ),
          ),
        ),

        // Ngày + Địa chỉ
        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 16 },
          React.createElement(
            Field,
            { label: "Valid Until" },
            React.createElement(DatePicker, {
              value: form.validUntil,
              onChange: (v) => setF("validUntil", v),
              minDate: todayISO(),
            }),
          ),
          React.createElement(
            Field,
            { label: "Address", hint: "optional" },
            React.createElement("input", {
              value: form.address || "",
              onChange: (e) => setF("address", e.target.value),
              placeholder: "Địa chỉ liên hệ...",
              style: inp(),
              onFocus,
              onBlur,
            }),
          ),
        ),



        React.createElement(
          Field,
          { label: "Short Description", hint: "optional" },
          React.createElement(AutoTextarea, {
            value: form.description,
            onChange: (v) => setF("description", v),
            placeholder: "Quotation description...",
            minRows: 2,
          }),
        ),
      ),
    ),

    React.createElement(
      Card,
      null,
      React.createElement(ServicesTable, {
        rows,
        svcOpts,
        companyId: form.internalCompanyId,
        onUpdate: updateRow,
        onAdd: addRow,
        onDelete: deleteRow,
        onAddNewService: handleAddNewService,
        pricingMode: form.pricingMode,
        packageSubTotal: form.packageSubTotal,
        packageVatRate: form.packageVatRate,
        packageTotals,
        onPricingModeChange: handlePricingModeChange,
        onPackageChange: setPackageField,
      }),
    ),


    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12,
          marginTop: 8,
          paddingBottom: 36,
        },
      },
      submitting &&
      React.createElement(
        "span",
        { style: { fontSize: 12, color: C.textSub, fontFamily: FONT } },
        submitStep,
      ),
      React.createElement(
        "div",
        {
          onClick: () => window.history.back(),
          style: {
            padding: "10px 24px",
            borderRadius: 7,
            border: `1px solid ${C.border}`,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            background: "#fff",
            fontFamily: FONT,
            color: C.text,
          },
        },
        "Cancel",
      ),
      React.createElement(
        "div",
        {
          onClick: submitting ? null : handleSubmit,
          style: {
            padding: "10px 36px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            background: submitting ? "#f3f4f6" : C.primary,
            color: submitting ? "#9ca3af" : "#fff",
            fontFamily: FONT,
          },
        },
        submitting ? "Processing..." : "Create Quotation",
      ),
    ),

    guideOpen &&
    React.createElement(
      Modal,
      {
        title: null,
        open: guideOpen,
        onCancel: () => setGuideOpen(false),
        footer: null,
        width: 920,
      },
      React.createElement(QuotationTutorialPanel, null),
    ),
  );
};

ctx.render(React.createElement(QuotationCreateForm, null));
