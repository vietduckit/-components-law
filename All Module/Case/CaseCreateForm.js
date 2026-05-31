const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const { Spin, message, Modal } = ctx.antd;

const FONT = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";
const REDIRECT_URL = window.location.origin + window.location.pathname;
const PRICING_MODE_LINE = "line";
const PRICING_MODE_PACKAGE = "package";
const PRICING_MODE_SCOPE = "scopeOnly";
const BILLING_LINE = "lineBillable";
const BILLING_PACKAGE_INCLUDED = "packageIncluded";
const BILLING_SEPARATE = "billSeparately";
const BILLING_SCOPE = "scopeOnly";
const SOURCE_QUOTATION = "quotation";
const SOURCE_CONTRACT = "contract";
const SOURCE_MANUAL = "manual";
const SOURCE_NONE = "none";
const CASE_DOCUMENT_SCOPE = "case_document";

// Configure these popup view UIDs after creating the corresponding NocoBase views.
const POPUP_VIEW_UIDS = {
  customerCreate: "onjascp1npq",
  contractCreate: "41125dcba6c",
  quotationCreate: "v44ehxkcghx",
};

const pad = (n) => String(n).padStart(2, "0");
const parseNum = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return isNaN(n) ? 0 : n;
};
const fmtVND = (n) =>
  !n && n !== 0 ? "-" : Number(n).toLocaleString("vi-VN") + " VND";
const isPackagePricing = (recordOrMode) => {
  const mode =
    typeof recordOrMode === "object"
      ? recordOrMode?.pricingMode
      : recordOrMode;
  return String(mode || "").toLowerCase() === PRICING_MODE_PACKAGE;
};
const inferVatRate = (subTotal, vatAmount, fallback = 0) => {
  const sub = parseNum(subTotal);
  return sub ? Math.round((parseNum(vatAmount) * 10000) / sub) / 100 : parseNum(fallback);
};
const calcLineAmounts = (basePrice, vat) => {
  const subTotal = parseNum(basePrice);
  const vatAmount = Math.round((subTotal * parseNum(vat)) / 100);
  return { subTotal, vatAmount, totalAmount: subTotal + vatAmount };
};
const financialStateFromRecord = (record, sourceType = SOURCE_NONE) => {
  if (!record) {
    return {
      pricingMode: PRICING_MODE_LINE,
      financialSourceType: sourceType === SOURCE_NONE ? SOURCE_MANUAL : sourceType,
      packageSubTotal: 0,
      packageVatRate: 0,
      packageVatAmount: 0,
      packageTotalAmount: 0,
    };
  }
  const packageMode =
    isPackagePricing(record) ||
    !!parseNum(record.packageSubTotal) ||
    !!parseNum(record.packageTotalAmount);
  const subTotal = parseNum(record.packageSubTotal ?? record.subTotal);
  const rawVatAmount = parseNum(record.packageVatAmount ?? record.vatAmount);
  const rawTotalAmount = parseNum(
    record.packageTotalAmount || record.totalAmount || record.grandTotal || record.fixedAmount,
  );
  const vatRate = packageMode
    ? parseNum(record.packageVatRate ?? record.vatRate) ||
    inferVatRate(
      subTotal,
      rawVatAmount ||
      (rawTotalAmount && subTotal
        ? Math.max(rawTotalAmount - subTotal, 0)
        : 0),
      0,
    )
    : 0;
  const vatAmount = packageMode
    ? rawVatAmount ||
    (rawTotalAmount && subTotal ? Math.max(rawTotalAmount - subTotal, 0) : 0) ||
    Math.round((subTotal * vatRate) / 100)
    : rawVatAmount;
  const totalAmount = rawTotalAmount || subTotal + vatAmount;
  return {
    pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
    financialSourceType: sourceType,
    packageSubTotal: packageMode ? subTotal : 0,
    packageVatRate: vatRate,
    packageVatAmount: packageMode ? vatAmount : 0,
    packageTotalAmount: packageMode ? totalAmount : 0,
  };
};
const billingModeForContext = ({ fromQuotation, packageMode, hasFinancialSource }) => {
  if (packageMode && fromQuotation) return BILLING_PACKAGE_INCLUDED;
  if (packageMode) return BILLING_SEPARATE;
  if (hasFinancialSource) return BILLING_LINE;
  return BILLING_SCOPE;
};
const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const nowISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
  return d.toISOString();
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
  const cols = [
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
    h = (h * 31 + name.charCodeAt(i)) % cols.length;
  return cols[h];
};

async function fetchAll(url) {
  try {
    const r = await ctx.api.request({
      url,
      params: { pageSize: 500, page: 1 },
    });
    return r?.data?.data || [];
  } catch {
    return [];
  }
}

// ── Fetch quotationServices by quotationId ──
async function fetchQuotationServices(quotationId) {
  try {
    const r = await ctx.api.request({
      url: "quotationServices:list",
      params: {
        pageSize: 500,
        page: 1,
        appends: ["services"],
        filter: JSON.stringify({ quotationId: { $eq: parseInt(quotationId) } }),
      },
    });
    return r?.data?.data || [];
  } catch {
    return [];
  }
}

// ── Map quotationServices rows → table rows ──
async function fetchContractServices(contractId) {
  if (!contractId) return [];
  const filters = [
    { contractId: { $eq: parseInt(contractId) } },
    { contracts: { id: { $eq: parseInt(contractId) } } },
  ];
  for (const filter of filters) {
    try {
      const r = await ctx.api.request({
        url: "contractServices:list",
        params: {
          pageSize: 500,
          page: 1,
          appends: ["services"],
          filter: JSON.stringify(filter),
        },
      });
      const rows = r?.data?.data || [];
      if (rows.length) return rows;
    } catch { }
  }
  return [];
}

function mapQuotationServicesToRows(qsvcs, quotation) {
  const parentPackageMode = isPackagePricing(quotation);
  return qsvcs.map((s) => {
    if (qsvcs.indexOf(s) === 0)
      console.log("[quotationService row]", JSON.stringify(s, null, 2));

    const packageMode = parentPackageMode || isPackagePricing(s);
    const packageState = financialStateFromRecord(
      {
        pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
        packageSubTotal: s.packageSubTotal ?? quotation?.packageSubTotal ?? quotation?.subTotal,
        packageVatRate: s.packageVatRate ?? quotation?.packageVatRate ?? quotation?.vatRate,
        packageVatAmount: s.packageVatAmount ?? quotation?.packageVatAmount ?? quotation?.vatAmount,
        packageTotalAmount: s.packageTotalAmount ?? quotation?.packageTotalAmount ?? quotation?.totalAmount ?? quotation?.grandTotal,
      },
      SOURCE_QUOTATION,
    );
    const basePrice = packageMode
      ? 0
      : s.price ?? s.basePrice ?? s.service?.basePrice ?? 0;
    const vat = packageMode ? 0 : s.vat ?? 0;
    return {
      _id: Date.now() + Math.random(),
      _qServiceId: s.id,
      serviceId: s.serviceId
        ? String(s.serviceId)
        : s.service?.id
          ? String(s.service.id)
          : null,
      serviceName: s.serviceName || s.service?.serviceName || s.name || "",
      serviceType: s.serviceType || s.service?.serviceType || s.type || "",
      description: s.description || s.service?.description || s.note || "",
      basePrice,
      vat,
      billingMode: packageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
      financialSourceType: SOURCE_QUOTATION,
      pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
      packageSubTotal: packageState.packageSubTotal,
      packageVatRate: packageState.packageVatRate,
      packageVatAmount: packageState.packageVatAmount,
      packageTotalAmount: packageState.packageTotalAmount,
      subTotal: packageMode ? 0 : parseNum(s.subTotal ?? basePrice),
      vatAmount: packageMode
        ? 0
        : parseNum(s.vatAmount) || Math.round((parseNum(basePrice) * parseNum(vat)) / 100),
      totalAmount: packageMode
        ? 0
        : parseNum(s.totalAmount) ||
        parseNum(s.subTotal ?? basePrice) +
        (parseNum(s.vatAmount) || Math.round((parseNum(basePrice) * parseNum(vat)) / 100)),
      _fromQuotation: true,
    };
  });
}

function mapContractServicesToRows(csvcs, contract) {
  const parentPackageMode = isPackagePricing(contract);
  return csvcs.map((s) => {
    const serviceRecord = s.service || s.services || {};
    const packageMode = parentPackageMode || isPackagePricing(s);
    const packageState = financialStateFromRecord(
      {
        pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
        packageSubTotal: s.packageSubTotal ?? contract?.packageSubTotal ?? contract?.subTotal,
        packageVatRate: s.packageVatRate ?? contract?.packageVatRate ?? contract?.vatRate,
        packageVatAmount: s.packageVatAmount ?? contract?.packageVatAmount ?? contract?.vatAmount,
        packageTotalAmount: s.packageTotalAmount ?? contract?.packageTotalAmount ?? contract?.totalAmount ?? contract?.grandTotal,
      },
      SOURCE_CONTRACT,
    );
    const basePrice = packageMode
      ? 0
      : s.price ?? s.basePrice ?? serviceRecord.basePrice ?? 0;
    const vat = packageMode ? 0 : s.vat ?? 0;
    const subTotal = packageMode ? 0 : parseNum(s.subTotal ?? basePrice);
    const vatAmount = packageMode
      ? 0
      : parseNum(s.vatAmount) || Math.round((parseNum(basePrice) * parseNum(vat)) / 100);
    return {
      _id: Date.now() + Math.random(),
      _contractServiceId: s.id,
      serviceId: s.serviceId
        ? String(s.serviceId)
        : serviceRecord.id
          ? String(serviceRecord.id)
          : null,
      serviceName: s.serviceName || serviceRecord.serviceName || s.name || "",
      serviceType: s.serviceType || serviceRecord.serviceType || s.type || "",
      description: s.description || serviceRecord.description || s.note || "",
      basePrice,
      vat,
      billingMode: packageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
      financialSourceType: SOURCE_CONTRACT,
      pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
      packageSubTotal: packageState.packageSubTotal,
      packageVatRate: packageState.packageVatRate,
      packageVatAmount: packageState.packageVatAmount,
      packageTotalAmount: packageState.packageTotalAmount,
      subTotal,
      vatAmount,
      totalAmount: packageMode ? 0 : parseNum(s.totalAmount) || subTotal + vatAmount,
      _fromContract: true,
    };
  });
}

async function fetchPMUsers() {
  try {
    const r = await ctx.api.request({
      url: "users:list",
      params: { pageSize: 500, page: 1, appends: ["roles"] },
    });
    const all = r?.data?.data || [];
    const filtered = all.filter((u) => {
      const roles = u.roles || [];
      return roles.some((role) => {
        const title = (role.title || role.name || "").toLowerCase();
        return title.includes("lawyers") || title.includes("admin");
      });
    });
    return filtered.length > 0 ? filtered : all;
  } catch {
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

const openPopupViewByUid = async (viewKey, params = {}) => {
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
    const defineProperties = {};
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        defineProperties[key] = {
          value: params[key],
          writable: true,
          enumerable: true,
          configurable: true,
        };
      }
    }

    const result = ctx.openView(uid, {
      navigation: false,
      inputArgs: params,
      params: params,
      defineProperties,
      ...params,
    });
    if (result?.then) await result;
    return true;
  } catch (error) {
    console.warn("[CaseCreateForm] ctx.openView failed", error);
    message.error("Cannot open configured popup view.");
    return false;
  }
};

const PRIORITY_OPTIONS = [
  {
    value: "low",
    label: "Low",
    stars: 1,
    color: "#16a34a",
    bg: "#dcfce7",
    starColor: "#16a34a",
  },
  {
    value: "medium",
    label: "Medium",
    stars: 2,
    color: "#d97706",
    bg: "#fef3c7",
    starColor: "#d97706",
  },
  {
    value: "high",
    label: "High",
    stars: 3,
    color: "#dc2626",
    bg: "#fee2e2",
    starColor: "#dc2626",
  },
];

const LAWYER_TYPE_GROUPS = [
  { key: "partner", label: "Partner", color: "#7c3aed", bg: "#f5f3ff" },
  { key: "lawyer", label: "Lawyer", color: "#2563eb", bg: "#eff6ff" },
  { key: "associate", label: "Associate", color: "#0891b2", bg: "#ecfeff" },
  { key: "suppliant", label: "Suppliant", color: "#d97706", bg: "#fef3c7" },
];

const C = {
  border: "#e5e7eb",
  borderFocus: "#1a3a5c",
  text: "#1f2937",
  textSub: "#6b7280",
  textLabel: "#374151",
  primary: "#1a3a5c",
  danger: "#e11d48",
  success: "#16a34a",
  warning: "#d97706",
  bgCard: "#ffffff",
  bgSection: "#f8fafc",
  bgHighlight: "#f0f9ff",
  borderHighlight: "#bae6fd",
};

const inp = (ex = {}) => ({
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "9px 12px",
  fontSize: 13.5,
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
const onFocus = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.borderFocus;
};
const onBlur = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.border;
};

const makeIcon = (paths, props = {}) =>
  React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: props.size || 15,
      height: props.size || 15,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
      ...props,
    },
    ...paths,
  );

const PlusIcon = makeIcon([
  React.createElement("path", { key: "1", d: "M12 5v14" }),
  React.createElement("path", { key: "2", d: "M5 12h14" }),
]);
const SearchIcon = makeIcon([
  React.createElement("circle", { key: "1", cx: "11", cy: "11", r: "8" }),
  React.createElement("path", { key: "2", d: "m21 21-4.35-4.35" }),
]);
const FileTextIcon = makeIcon([
  React.createElement("path", { key: "1", d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
  React.createElement("path", { key: "2", d: "M14 2v6h6" }),
  React.createElement("path", { key: "3", d: "M16 13H8" }),
  React.createElement("path", { key: "4", d: "M16 17H8" }),
  React.createElement("path", { key: "5", d: "M10 9H8" }),
]);
const CalendarIcon = makeIcon([
  React.createElement("path", { key: "1", d: "M8 2v4" }),
  React.createElement("path", { key: "2", d: "M16 2v4" }),
  React.createElement("rect", { key: "3", x: "3", y: "4", width: "18", height: "18", rx: "2" }),
  React.createElement("path", { key: "4", d: "M3 10h18" }),
]);
const ClipboardIcon = makeIcon([
  React.createElement("rect", { key: "1", x: "8", y: "2", width: "8", height: "4", rx: "1" }),
  React.createElement("path", { key: "2", d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }),
  React.createElement("path", { key: "3", d: "M9 14h6" }),
  React.createElement("path", { key: "4", d: "M9 18h6" }),
]);
const XIcon = makeIcon([
  React.createElement("path", { key: "1", d: "M18 6 6 18" }),
  React.createElement("path", { key: "2", d: "m6 6 12 12" }),
]);
const CheckIcon = makeIcon([
  React.createElement("path", { key: "1", d: "M20 6 9 17l-5-5" }),
]);
const InfoIcon = makeIcon([
  React.createElement("circle", { key: "1", cx: "12", cy: "12", r: "10" }),
  React.createElement("path", { key: "2", d: "M12 16v-4" }),
  React.createElement("path", { key: "3", d: "M12 8h.01" }),
]);
const ChevronDownIcon = makeIcon([
  React.createElement("path", { key: "1", d: "m6 9 6 6 6-6" }),
]);

const StarRating = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(null);
  const priorityToStars = { low: 1, medium: 2, high: 3 };
  const starsToPriority = { 1: "low", 2: "medium", 3: "high" };
  const currentStars = priorityToStars[value] || 0;
  const displayStars = hovered !== null ? hovered : currentStars;
  const getColor = (s) => {
    const opt = PRIORITY_OPTIONS.find((p) => p.stars === s);
    return opt ? opt.starColor : "#d1d5db";
  };
  const starColor = displayStars > 0 ? getColor(displayStars) : "#d1d5db";
  const currentOpt = PRIORITY_OPTIONS.find((p) => p.value === value);
  return React.createElement(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 16 } },
    React.createElement(
      "div",
      { style: { display: "flex", gap: 6 } },
      [1, 2, 3].map((n) =>
        React.createElement(
          "span",
          {
            key: n,
            onMouseEnter: () => setHovered(n),
            onMouseLeave: () => setHovered(null),
            onClick: () => onChange(starsToPriority[n]),
            style: {
              fontSize: 32,
              cursor: "pointer",
              color: n <= displayStars ? starColor : "#e5e7eb",
              transition: "color 0.12s,transform 0.1s",
              transform: n <= displayStars ? "scale(1.12)" : "scale(1)",
              display: "inline-block",
              lineHeight: 1,
              userSelect: "none",
            },
          },
          "★",
        ),
      ),
    ),
    currentOpt &&
    React.createElement(
      "div",
      {
        style: {
          padding: "4px 14px",
          borderRadius: 20,
          background: currentOpt.bg,
          border: `1.5px solid ${currentOpt.color}`,
          color: currentOpt.color,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: FONT,
        },
      },
      currentOpt.label,
    ),
    hovered !== null &&
    hovered !== currentStars &&
    React.createElement(
      "div",
      { style: { fontSize: 12, color: C.textSub, fontStyle: "italic" } },
      PRIORITY_OPTIONS.find((p) => p.stars === hovered)?.label || "",
    ),
  );
};

const DateTimePickerLegacy = ({
  value,
  onChange,
  minValue,
  placeholder = "Select date & time",
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("date");
  const parsed = value ? new Date(value) : null;
  const [display, setDisplay] = useState(() => {
    if (parsed) return { y: parsed.getFullYear(), m: parsed.getMonth() };
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const [selDate, setSelDate] = useState(() =>
    parsed
      ? { y: parsed.getFullYear(), mo: parsed.getMonth(), d: parsed.getDate() }
      : null,
  );
  const [selTime, setSelTime] = useState(() =>
    parsed
      ? { h: parsed.getHours(), mi: parsed.getMinutes() }
      : { h: 9, mi: 0 },
  );

  useEffect(() => {
    if (!value) {
      setSelDate(null);
      setSelTime({ h: 9, mi: 0 });
      return;
    }
    const d = new Date(value);
    setSelDate({ y: d.getFullYear(), mo: d.getMonth(), d: d.getDate() });
    setSelTime({ h: d.getHours(), mi: d.getMinutes() });
    setDisplay({ y: d.getFullYear(), m: d.getMonth() });
  }, [value]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minD = minValue ? new Date(minValue) : null;
  const MONTHS = [
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
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const first = new Date(display.y, display.m, 1).getDay();
  const daysIn = new Date(display.y, display.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const commit = (sd, st) => {
    if (!sd) return;
    onChange(new Date(sd.y, sd.mo, sd.d, st.h, st.mi, 0, 0).toISOString());
  };
  const handleDayClick = (day) => {
    const nd = { y: display.y, mo: display.m, d: day };
    setSelDate(nd);
    commit(nd, selTime);
    setTab("time");
  };
  const handleTimeChange = (field, val) => {
    const nt = { ...selTime, [field]: val };
    setSelTime(nt);
    if (selDate) commit(selDate, nt);
  };
  const handleNow = () => {
    const n = new Date();
    const nd = { y: n.getFullYear(), mo: n.getMonth(), d: n.getDate() };
    const nt = { h: n.getHours(), mi: Math.floor(n.getMinutes() / 5) * 5 };
    setSelDate(nd);
    setSelTime(nt);
    setDisplay({ y: nd.y, m: nd.mo });
    commit(nd, nt);
  };
  const handleClear = () => {
    onChange("");
    setOpen(false);
    setSelDate(null);
    setSelTime({ h: 9, mi: 0 });
  };
  const handleConfirm = () => {
    if (selDate) {
      commit(selDate, selTime);
      setOpen(false);
    }
  };
  const isDisabled = (day) => {
    if (!minD) return false;
    const d = new Date(display.y, display.m, day);
    d.setHours(0, 0, 0, 0);
    const md = new Date(minD);
    md.setHours(0, 0, 0, 0);
    return d < md;
  };
  const isSel = (day) =>
    selDate &&
    selDate.y === display.y &&
    selDate.mo === display.m &&
    selDate.d === day;
  const isToday = (day) => {
    const d = new Date(display.y, display.m, day);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  return React.createElement(
    "div",
    { style: { position: "relative" } },
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
        { style: { color: value ? C.text : C.textSub, fontSize: 13.5 } },
        value ? fmtDateTime(value) : placeholder,
      ),
      React.createElement(
        "span",
        { style: { fontSize: 14, color: C.textSub } },
        "🗓",
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
          zIndex: 9999,
          background: "#fff",
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
          width: 320,
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            borderBottom: `1px solid ${C.border}`,
            background: C.bgSection,
          },
        },
        [
          { key: "date", icon: "📅", label: "Date" },
          { key: "time", icon: "🕐", label: "Time" },
        ].map((t) =>
          React.createElement(
            "div",
            {
              key: t.key,
              onClick: () => setTab(t.key),
              style: {
                flex: 1,
                padding: "10px 0",
                textAlign: "center",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? C.primary : C.textSub,
                borderBottom:
                  tab === t.key
                    ? `2px solid ${C.primary}`
                    : "2px solid transparent",
                fontFamily: FONT,
                userSelect: "none",
              },
            },
            `${t.icon} ${t.label}`,
          ),
        ),
      ),
      tab === "date" &&
      React.createElement(
        "div",
        { style: { padding: "14px 14px 10px" } },
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
              onClick: () =>
                setDisplay((p) =>
                  p.m === 0
                    ? { y: p.y - 1, m: 11 }
                    : { y: p.y, m: p.m - 1 },
                ),
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
              style: { fontFamily: FONT, fontWeight: 600, fontSize: 13.5 },
            },
            `${MONTHS[display.m]} ${display.y}`,
          ),
          React.createElement(
            "button",
            {
              onClick: () =>
                setDisplay((p) =>
                  p.m === 11
                    ? { y: p.y + 1, m: 0 }
                    : { y: p.y, m: p.m + 1 },
                ),
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
              gridTemplateColumns: "repeat(7,1fr)",
              gap: 2,
              marginBottom: 4,
            },
          },
          ...DAYS.map((d) =>
            React.createElement(
              "div",
              {
                key: d,
                style: {
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.textSub,
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
              gridTemplateColumns: "repeat(7,1fr)",
              gap: 2,
            },
          },
          ...cells.map((day, i) => {
            if (!day) return React.createElement("div", { key: `e${i}` });
            const dis = isDisabled(day),
              sel = isSel(day),
              tod = isToday(day);
            return React.createElement(
              "div",
              {
                key: day,
                onClick: () => !dis && handleDayClick(day),
                style: {
                  textAlign: "center",
                  padding: "6px 0",
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontFamily: FONT,
                  cursor: dis ? "not-allowed" : "pointer",
                  fontWeight: tod ? 600 : 400,
                  color: dis
                    ? "#d1d5db"
                    : sel
                      ? "#fff"
                      : tod
                        ? C.primary
                        : C.text,
                  background: sel
                    ? C.primary
                    : tod && !sel
                      ? C.bgHighlight
                      : "transparent",
                },
              },
              day,
            );
          }),
        ),
        React.createElement(
          "div",
          { style: { marginTop: 10, display: "flex", gap: 8 } },
          React.createElement(
            "div",
            {
              onClick: handleNow,
              style: {
                flex: 1,
                padding: "6px 0",
                textAlign: "center",
                background: C.bgHighlight,
                color: C.primary,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: FONT,
              },
            },
            "⚡ Now",
          ),
          selDate &&
          React.createElement(
            "div",
            {
              onClick: () => setTab("time"),
              style: {
                flex: 1,
                padding: "6px 0",
                textAlign: "center",
                background: "#f0fdf4",
                color: C.success,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: FONT,
              },
            },
            "→ Pick Time",
          ),
        ),
      ),
      tab === "time" &&
      React.createElement(
        "div",
        { style: { padding: "14px" } },
        selDate
          ? React.createElement(
            "div",
            {
              style: {
                padding: "8px 12px",
                background: C.bgHighlight,
                borderRadius: 7,
                marginBottom: 12,
                fontSize: 13,
                color: C.primary,
                fontWeight: 600,
                fontFamily: FONT,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              },
            },
            React.createElement(
              "span",
              null,
              `📅 ${pad(selDate.d)}/${pad(selDate.mo + 1)}/${selDate.y}`,
            ),
            React.createElement(
              "span",
              {
                onClick: () => setTab("date"),
                style: {
                  fontSize: 11.5,
                  color: C.textSub,
                  cursor: "pointer",
                  fontWeight: 400,
                },
              },
              "← Change date",
            ),
          )
          : React.createElement(
            "div",
            {
              style: {
                padding: "8px 12px",
                background: "#fefce8",
                borderRadius: 7,
                marginBottom: 12,
                fontSize: 12.5,
                color: C.warning,
                fontFamily: FONT,
              },
            },
            "⚠ Please select a date first",
          ),
        React.createElement(
          "div",
          { style: { textAlign: "center", marginBottom: 14 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 36,
                fontWeight: 700,
                fontFamily: FONT_MONO,
                color: C.text,
                letterSpacing: 2,
              },
            },
            `${pad(selTime.h)}:${pad(selTime.mi)}`,
          ),
          React.createElement(
            "div",
            { style: { fontSize: 11.5, color: C.textSub, marginTop: 2 } },
            "Hour : Minute",
          ),
        ),
        React.createElement(
          "div",
          { style: { marginBottom: 12 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 11.5,
                fontWeight: 600,
                color: C.textLabel,
                marginBottom: 6,
                fontFamily: FONT,
              },
            },
            "Hour",
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(6,1fr)",
                gap: 4,
              },
            },
            HOURS.map((h) =>
              React.createElement(
                "div",
                {
                  key: h,
                  onClick: () => handleTimeChange("h", h),
                  style: {
                    padding: "5px 0",
                    textAlign: "center",
                    borderRadius: 5,
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontFamily: FONT_MONO,
                    fontWeight: selTime.h === h ? 700 : 400,
                    background: selTime.h === h ? C.primary : "#fff",
                    color: selTime.h === h ? "#fff" : C.text,
                    border: `1px solid ${selTime.h === h ? C.primary : C.border}`,
                  },
                },
                pad(h),
              ),
            ),
          ),
        ),
        React.createElement(
          "div",
          { style: { marginBottom: 14 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 11.5,
                fontWeight: 600,
                color: C.textLabel,
                marginBottom: 6,
                fontFamily: FONT,
              },
            },
            "Minute",
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(6,1fr)",
                gap: 4,
              },
            },
            MINUTES.map((mi) =>
              React.createElement(
                "div",
                {
                  key: mi,
                  onClick: () => handleTimeChange("mi", mi),
                  style: {
                    padding: "5px 0",
                    textAlign: "center",
                    borderRadius: 5,
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontFamily: FONT_MONO,
                    fontWeight: selTime.mi === mi ? 700 : 400,
                    background: selTime.mi === mi ? C.primary : "#fff",
                    color: selTime.mi === mi ? "#fff" : C.text,
                    border: `1px solid ${selTime.mi === mi ? C.primary : C.border}`,
                  },
                },
                pad(mi),
              ),
            ),
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 14px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: C.bgSection,
          },
        },
        value
          ? React.createElement(
            "span",
            {
              onClick: handleClear,
              style: {
                fontSize: 12,
                color: C.danger,
                cursor: "pointer",
                fontFamily: FONT,
              },
            },
            "✕ Clear",
          )
          : React.createElement("span", null),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 8 } },
          React.createElement(
            "div",
            {
              onClick: () => setOpen(false),
              style: {
                padding: "6px 14px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                fontSize: 12.5,
                color: C.textSub,
                fontFamily: FONT,
              },
            },
            "Close",
          ),
          selDate &&
          React.createElement(
            "div",
            {
              onClick: handleConfirm,
              style: {
                padding: "6px 16px",
                borderRadius: 6,
                background: C.primary,
                color: "#fff",
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: FONT,
              },
            },
            "Confirm",
          ),
        ),
      ),
    ),
  );
};

const toDateTimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeLocalValue = (value) =>
  value ? new Date(value).toISOString() : "";

const DateTimePicker = ({
  value,
  onChange,
  minValue,
  placeholder = "Select date & time",
}) =>
  React.createElement(
    "div",
    {
      style: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: `1px solid ${C.border}`,
        borderRadius: 7,
        background: "#fff",
        padding: "0 10px",
        minHeight: 42,
        boxSizing: "border-box",
      },
    },
    React.createElement(
      "span",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          color: C.textSub,
          flexShrink: 0,
        },
      },
      CalendarIcon,
    ),
    React.createElement("input", {
      type: "datetime-local",
      value: toDateTimeLocalValue(value),
      min: minValue ? toDateTimeLocalValue(minValue) : undefined,
      onChange: (e) => onChange(fromDateTimeLocalValue(e.target.value)),
      "aria-label": placeholder,
      style: {
        border: "none",
        outline: "none",
        background: "transparent",
        color: value ? C.text : C.textSub,
        fontFamily: FONT,
        fontSize: 13.5,
        lineHeight: "20px",
        width: "100%",
        minWidth: 0,
        padding: "9px 0",
      },
    }),
    value &&
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => onChange(""),
          title: "Clear",
          style: {
            border: "none",
            background: "transparent",
            color: C.textSub,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            padding: 0,
            flexShrink: 0,
          },
        },
        XIcon,
      ),
  );

const ExpandableText = ({ text, limit = 80 }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text)
    return React.createElement(
      "span",
      { style: { color: "#d1d5db", fontSize: 12 } },
      "—",
    );
  const isLong = text.length > limit;
  const shown = expanded || !isLong ? text : text.slice(0, limit) + "…";
  return React.createElement(
    "span",
    { style: { fontSize: 12.5, color: C.textSub, lineHeight: "18px" } },
    shown,
    isLong &&
    React.createElement(
      "span",
      {
        onClick: (e) => {
          e.stopPropagation();
          setExpanded((p) => !p);
        },
        style: {
          color: C.primary,
          cursor: "pointer",
          marginLeft: 4,
          fontWeight: 600,
          fontSize: 12,
          whiteSpace: "nowrap",
        },
      },
      expanded ? " ▲ Collapse" : " ▼ Show more",
    ),
  );
};

const AutoTextarea = ({ value, onChange, placeholder, minRows = 3 }) => {
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
      ...inp(),
      resize: "none",
      overflow: "hidden",
      lineHeight: "22px",
      minHeight: minRows * 22 + 18,
    },
    onFocus,
    onBlur,
  });
};

const PriceInput = ({ value, onChange }) => {
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
    style: { ...inp(), textAlign: "right" },
    onFocus,
    onBlur,
  });
};

const Avatar = ({ name, size = 28 }) =>
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
        userSelect: "none",
      },
    },
    getInitials(name),
  );

const LawyerTypeBadge = ({ type }) => {
  const cfg = LAWYER_TYPE_GROUPS.find(
    (g) => g.key === (type || "").toLowerCase(),
  ) || { color: C.textSub, bg: "#f3f4f6" };
  if (!type) return null;
  return React.createElement(
    "span",
    {
      style: {
        fontSize: 10.5,
        background: cfg.bg,
        color: cfg.color,
        padding: "2px 7px",
        borderRadius: 10,
        fontWeight: 600,
        border: `1px solid ${cfg.color}22`,
        flexShrink: 0,
      },
    },
    type,
  );
};

const PersonDropdown = ({
  items,
  value,
  onChange,
  placeholder,
  getItemName,
  getItemSub,
  currentItem,
  disabled,
  onAddNew,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);
  const filtered = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (l) =>
        getItemName(l).toLowerCase().includes(q) ||
        (getItemSub?.(l) || "").toLowerCase().includes(q),
    );
  }, [items, search]);
  const selected = useMemo(
    () => items.find((l) => String(l.id) === String(value)),
    [items, value],
  );
  const selName = selected ? getItemName(selected) : "";

  return React.createElement(
    "div",
    { style: { position: "relative", zIndex: open ? 400 : "auto" } },
    open &&
    React.createElement("div", {
      onClick: () => setOpen(false),
      style: { position: "fixed", inset: 0, zIndex: 398 },
    }),
    React.createElement(
      "div",
      {
        onClick: () => {
          if (!disabled) setOpen((o) => !o);
        },
        style: {
          ...inp(),
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 9,
          userSelect: "none",
          borderColor: open ? C.borderFocus : C.border,
          background: disabled ? "#f3f4f6" : "#fff",
          minHeight: 40,
          padding: "6px 12px",
        },
      },
      selected
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement(Avatar, { name: selName, size: 26 }),
          React.createElement(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: C.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              },
              selName,
            ),
            getItemSub?.(selected) &&
            React.createElement(
              "div",
              { style: { fontSize: 11.5, color: C.textSub } },
              getItemSub(selected),
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
                color: C.danger,
                fontSize: 13,
                cursor: "pointer",
                padding: "2px 8px",
                borderRadius: 4,
                background: "#fef2f2",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
              },
            },
            XIcon,
          ),
        )
        : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            {
              style: {
                width: 26,
                height: 26,
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
            { style: { color: C.textSub, fontSize: 13.5, flex: 1 } },
            placeholder,
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                color: C.textSub,
                transform: open ? "rotate(180deg)" : "none",
                display: "inline-flex",
                alignItems: "center",
                transition: "transform 0.15s",
              },
            },
            ChevronDownIcon,
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
          zIndex: 9999,
          background: "#fff",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          boxShadow: "0 12px 36px rgba(0,0,0,0.14)",
          overflow: "hidden",
          minWidth: 280,
        },
      },
      React.createElement(
        "div",
        {
          style: { padding: "10px 12px", borderBottom: `1px solid #f3f4f6` },
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
                display: "inline-flex",
                alignItems: "center",
              },
            },
            SearchIcon,
          ),
          React.createElement("input", {
            autoFocus: true,
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "Search...",
            style: inp({ paddingLeft: 32, paddingTop: 7, paddingBottom: 7 }),
            onFocus,
            onBlur,
          }),
        ),
      ),

      React.createElement(
        "div",
        { style: { maxHeight: 260, overflowY: "auto" } },
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
            const lName = getItemName(l),
              lSub = getItemSub?.(l) || "",
              isSel = String(l.id) === String(value);
            return React.createElement(
              "div",
              {
                key: l.id,
                onClick: () => {
                  onChange(String(l.id));
                  setOpen(false);
                },
                style: {
                  padding: "9px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  background: isSel
                    ? C.bgHighlight
                    : i % 2 === 0
                      ? "#fff"
                      : "#fafafa",
                  borderBottom: `1px solid #f3f4f6`,
                },
              },
              React.createElement(Avatar, { name: lName, size: 28 }),
              React.createElement(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 13.5,
                      fontWeight: isSel ? 700 : 500,
                      color: C.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  },
                  lName,
                ),
                lSub &&
                React.createElement(
                  "div",
                  { style: { fontSize: 11.5, color: C.textSub } },
                  lSub,
                ),
              ),
              isSel &&
              React.createElement(
                "span",
                {
                  style: {
                    color: C.primary,
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                  },
                },
                CheckIcon,
              ),
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
          `${filtered.length} results`,
        ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 10 } },
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
            "Deselect",
          ),
        ),
      ),
    ),
  );
};

const RelatedSingleDropdown = ({
  items,
  value,
  onChange,
  placeholder,
  getItemLabel,
  getItemSub,
  disabled,
  onAddNew,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => getItemLabel(i).toLowerCase().includes(q));
  }, [items, search]);
  const selected = useMemo(
    () => items.find((i) => String(i.id) === String(value)),
    [items, value],
  );

  return React.createElement(
    "div",
    { style: { position: "relative", zIndex: open ? 400 : "auto" } },
    open &&
    React.createElement("div", {
      onClick: () => setOpen(false),
      style: { position: "fixed", inset: 0, zIndex: 398 },
    }),
    React.createElement(
      "div",
      {
        onClick: () => {
          if (!disabled) setOpen((o) => !o);
        },
        style: {
          ...inp(),
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          userSelect: "none",
          borderColor: open ? C.borderFocus : C.border,
          background: disabled ? "#f3f4f6" : "#fff",
          minHeight: 40,
          padding: "7px 12px",
        },
      },
      selected
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "span",
            {
              style: {
                flex: 1,
                fontSize: 13.5,
                color: C.text,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            getItemLabel(selected),
          ),
          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                onChange(null);
              },
              style: {
                color: C.danger,
                fontSize: 13,
                cursor: "pointer",
                padding: "2px 8px",
                borderRadius: 4,
                background: "#fef2f2",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
              },
            },
            XIcon,
          ),
        )
        : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "span",
            { style: { color: C.textSub, fontSize: 13.5, flex: 1 } },
            placeholder,
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                color: C.textSub,
                transform: open ? "rotate(180deg)" : "none",
                display: "inline-flex",
                alignItems: "center",
                transition: "transform 0.15s",
              },
            },
            ChevronDownIcon,
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
          zIndex: 9999,
          background: "#fff",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          boxShadow: "0 12px 36px rgba(0,0,0,0.16)",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: { padding: "10px 12px", borderBottom: `1px solid #f3f4f6` },
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
                display: "inline-flex",
                alignItems: "center",
              },
            },
            SearchIcon,
          ),
          React.createElement("input", {
            autoFocus: true,
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "Search...",
            style: inp({ paddingLeft: 32, paddingTop: 7, paddingBottom: 7 }),
            onFocus,
            onBlur,
          }),
        ),
      ),
      React.createElement(
        "div",
        { style: { maxHeight: 240, overflowY: "auto" } },
        filtered.length === 0
          ? React.createElement(
            "div",
            {
              style: {
                padding: "28px 0",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              },
            },
            "No results found",
          )
          : filtered.map((item, i) => {
            const isSel = String(item.id) === String(value),
              sub = getItemSub?.(item) || "";
            return React.createElement(
              "div",
              {
                key: item.id,
                onClick: () => {
                  onChange(String(item.id));
                  setOpen(false);
                },
                style: {
                  padding: "9px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  background: isSel
                    ? C.bgHighlight
                    : i % 2 === 0
                      ? "#fff"
                      : "#fafafa",
                  borderBottom: `1px solid #f3f4f6`,
                },
              },
              React.createElement(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 13.5,
                      fontWeight: isSel ? 600 : 400,
                      color: C.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  },
                  getItemLabel(item),
                ),
                sub &&
                React.createElement(
                  "div",
                  { style: { fontSize: 11.5, color: C.textSub } },
                  sub,
                ),
              ),
              isSel &&
              React.createElement(
                "span",
                {
                  style: {
                    color: C.primary,
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                  },
                },
                CheckIcon,
              ),
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
          `${filtered.length} results`,
        ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 10 } },
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
            "Deselect",
          ),
        ),
      ),
    ),
  );
};

const MultiPersonDropdown = ({
  items,
  value = [],
  onChange,
  placeholder,
  getItemName,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const filtered = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (l) =>
        getItemName(l).toLowerCase().includes(q) ||
        (l.lawyerType || "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const groups = useMemo(() => {
    if (search.trim()) return null;
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
    const buckets = {};
    LAWYER_TYPE_GROUPS.forEach((g) => {
      buckets[g.key] = [];
    });
    buckets["__other__"] = [];
    sorted.forEach((l) => {
      const k = (l.lawyerType || "").toLowerCase().trim();
      if (buckets[k] !== undefined) buckets[k].push(l);
      else buckets["__other__"].push(l);
    });
    const result = LAWYER_TYPE_GROUPS.filter(
      (g) => buckets[g.key].length > 0,
    ).map((g) => ({ ...g, items: buckets[g.key] }));
    if (buckets["__other__"].length > 0)
      result.push({
        key: "__other__",
        label: "Other",
        color: C.textSub,
        bg: "#f3f4f6",
        items: buckets["__other__"],
      });
    return result;
  }, [items, search]);

  const selectedItems = useMemo(
    () => items.filter((l) => value.includes(String(l.id))),
    [items, value],
  );
  const toggle = (id) => {
    const s = String(id);
    onChange(value.includes(s) ? value.filter((v) => v !== s) : [...value, s]);
  };

  const renderItem = (l, i) => {
    const lName = getItemName(l);
    const isSel = value.includes(String(l.id));
    const typeCfg = LAWYER_TYPE_GROUPS.find(
      (g) => g.key === (l.lawyerType || "").toLowerCase(),
    );
    return React.createElement(
      "div",
      {
        key: l.id,
        onClick: () => toggle(l.id),
        style: {
          padding: "9px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          background: isSel ? C.bgHighlight : i % 2 === 0 ? "#fff" : "#fafafa",
          borderBottom: `1px solid #f3f4f6`,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: 17,
            height: 17,
            borderRadius: 4,
            border: `2px solid ${isSel ? C.primary : C.border}`,
            background: isSel ? C.primary : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          },
        },
        isSel &&
        React.createElement(
          "span",
          {
            style: {
              color: "#fff",
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
            },
          },
          CheckIcon,
        ),
      ),
      React.createElement(Avatar, { name: lName, size: 26 }),
      React.createElement(
        "div",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "span",
          {
            style: {
              fontSize: 13.5,
              fontWeight: isSel ? 600 : 400,
              color: C.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            },
          },
          lName,
        ),
      ),
      !groups &&
      typeCfg &&
      React.createElement(LawyerTypeBadge, { type: l.lawyerType }),
    );
  };

  const renderGroupHeader = (g) => {
    const allSel = g.items.every((l) => value.includes(String(l.id)));
    const selCount = g.items.filter((l) => value.includes(String(l.id))).length;
    return React.createElement(
      "div",
      {
        key: `gh-${g.key}`,
        style: {
          padding: "6px 14px 5px",
          background: g.bg,
          borderBottom: `1px solid ${g.color}22`,
          borderTop: `1px solid ${g.color}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 1,
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        React.createElement("div", {
          style: {
            width: 3,
            height: 14,
            borderRadius: 2,
            background: g.color,
            flexShrink: 0,
          },
        }),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              fontWeight: 700,
              color: g.color,
              fontFamily: FONT,
              letterSpacing: 0,
            },
          },
          g.label,
        ),
        React.createElement(
          "span",
          { style: { fontSize: 11, color: g.color, opacity: 0.7 } },
          `${g.items.length} people`,
        ),
        selCount > 0 &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              background: g.color,
              color: "#fff",
              padding: "1px 7px",
              borderRadius: 10,
              fontWeight: 700,
            },
          },
          selCount,
        ),
      ),
      React.createElement(
        "span",
        {
          onClick: (e) => {
            e.stopPropagation();
            const ids = g.items.map((l) => String(l.id));
            onChange(
              allSel
                ? value.filter((v) => !ids.includes(v))
                : [...new Set([...value, ...ids])],
            );
          },
          style: {
            fontSize: 11.5,
            color: allSel ? C.danger : g.color,
            cursor: "pointer",
            fontWeight: 600,
            padding: "2px 10px",
            borderRadius: 4,
            background: "rgba(255,255,255,0.7)",
            border: `1px solid ${allSel ? C.danger : g.color}44`,
          },
        },
        allSel ? "Deselect group" : "+ Select group",
      ),
    );
  };

  return React.createElement(
    "div",
    { style: { position: "relative", zIndex: open ? 400 : "auto" } },
    open &&
    React.createElement("div", {
      onClick: () => setOpen(false),
      style: { position: "fixed", inset: 0, zIndex: 398 },
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
          flexWrap: "wrap",
          gap: 5,
          minHeight: 40,
          padding: "5px 10px",
          borderColor: open ? C.borderFocus : C.border,
        },
      },
      selectedItems.length === 0
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            {
              style: {
                width: 26,
                height: 26,
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
            { style: { color: C.textSub, fontSize: 13.5, flex: 1 } },
            placeholder,
          ),
        )
        : selectedItems.map((item) => {
          const name = getItemName(item);
          const typeCfg = LAWYER_TYPE_GROUPS.find(
            (g) => g.key === (item.lawyerType || "").toLowerCase(),
          );
          return React.createElement(
            "span",
            {
              key: item.id,
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: typeCfg ? typeCfg.bg : C.bgHighlight,
                border: `1px solid ${typeCfg ? typeCfg.color + "44" : C.borderHighlight}`,
                borderRadius: 5,
                padding: "2px 6px 2px 4px",
                fontSize: 12.5,
                color: typeCfg ? typeCfg.color : C.primary,
                fontWeight: 500,
              },
            },
            React.createElement(Avatar, { name, size: 18 }),
            React.createElement("span", null, name),
            React.createElement(
              "span",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  toggle(item.id);
                },
                style: {
                  cursor: "pointer",
                  color: C.danger,
                  fontWeight: 700,
                  fontSize: 13,
                  lineHeight: 1,
                  marginLeft: 1,
                  display: "inline-flex",
                  alignItems: "center",
                },
              },
              XIcon,
            ),
          );
        }),
      React.createElement(
        "span",
        {
          style: {
            marginLeft: "auto",
            fontSize: 11,
            color: C.textSub,
            transform: open ? "rotate(180deg)" : "none",
            display: "inline-flex",
            alignItems: "center",
            transition: "transform 0.15s",
            flexShrink: 0,
          },
        },
        ChevronDownIcon,
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
          zIndex: 9999,
          background: "#fff",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          boxShadow: "0 12px 36px rgba(0,0,0,0.14)",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: { padding: "10px 12px", borderBottom: `1px solid #f3f4f6` },
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
                display: "inline-flex",
                alignItems: "center",
              },
            },
            SearchIcon,
          ),
          React.createElement("input", {
            autoFocus: true,
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "Search by name, lawyer type...",
            style: inp({ paddingLeft: 32, paddingTop: 7, paddingBottom: 7 }),
            onFocus,
            onBlur,
          }),
        ),
      ),
      React.createElement(
        "div",
        { style: { maxHeight: 320, overflowY: "auto" } },
        filtered.length === 0
          ? React.createElement(
            "div",
            {
              style: {
                padding: "28px 0",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              },
            },
            "No results found",
          )
          : groups
            ? groups.map((g, gi) =>
              React.createElement(
                React.Fragment,
                { key: g.key },
                renderGroupHeader(g),
                g.items.map((l, i) => renderItem(l, i)),
              ),
            )
            : filtered.map((l, i) => renderItem(l, i)),
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
          `${value.length} selected · ${items.length} total`,
        ),
        value.length > 0 &&
        React.createElement(
          "span",
          {
            onClick: () => onChange([]),
            style: { fontSize: 11.5, color: C.danger, cursor: "pointer" },
          },
          "Deselect all",
        ),
      ),
    ),
  );
};

const ServicePickerModal = ({
  svcOpts,
  selectedIds,
  onSelect,
  onClose,
  internalCompanyId,
  onCreateAndSelect,
}) => {
  const [tab, setTab] = useState("list");
  const [search, setSearch] = useState("");
  const [newSvc, setNewSvc] = useState({
    name: "",
    serviceType: "",
    description: "",
    basePrice: 0,
  });
  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    let list = internalCompanyId
      ? svcOpts.filter(
        (s) =>
          String(s.internalCompanyId) === String(internalCompanyId) ||
          !s.internalCompanyId,
      )
      : svcOpts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.serviceName || "").toLowerCase().includes(q) ||
          (s.serviceType || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [svcOpts, search, internalCompanyId]);

  const validate = () => {
    const e = {};
    if (!newSvc.name.trim()) e.name = "Please enter a service name";
    setErrors(e);
    return !Object.keys(e).length;
  };
  const handleCreate = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      await onCreateAndSelect({
        serviceName: newSvc.name.trim(),
        serviceType: newSvc.serviceType.trim() || null,
        description: newSvc.description.trim() || null,
        basePrice: newSvc.basePrice || 0,
      });
      onClose();
    } catch { }
    setCreating(false);
  };

  const thS = (ex = {}) => ({
    padding: "9px 14px",
    fontSize: 11.5,
    fontWeight: 600,
    color: C.textSub,
    background: C.bgSection,
    borderBottom: `2px solid ${C.border}`,
    textAlign: "left",
    whiteSpace: "nowrap",
    fontFamily: FONT,
    ...ex,
  });
  const tdS = (ex = {}) => ({
    padding: "9px 14px",
    fontSize: 13.5,
    borderBottom: `1px solid #f3f4f6`,
    verticalAlign: "top",
    fontFamily: FONT,
    ...ex,
  });

  return React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
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
          maxWidth: 880,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
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
          "span",
          {
            style: {
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 15,
              color: C.text,
            },
          },
          tab === "create" ? "Create New Service" : "Select Service",
        ),
        React.createElement(
          "button",
          {
            onClick: onClose,
            type: "button",
            title: "Close",
            style: {
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: C.textSub,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              padding: 0,
            },
          },
          XIcon,
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
            background: C.bgSection,
          },
        },
        ["list", "create"].map((t) =>
          React.createElement(
            "div",
            {
              key: t,
              onClick: () => setTab(t),
              style: {
                padding: "10px 24px",
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: tab === t ? 700 : 400,
                color: tab === t ? C.primary : C.textSub,
                borderBottom:
                  tab === t
                    ? `2px solid ${C.primary}`
                    : "2px solid transparent",
                background: "transparent",
                fontFamily: FONT,
                userSelect: "none",
              },
            },
            t === "list" ? "Select from list" : "Create new service",
          ),
        ),
      ),
      tab === "list" &&
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "div",
          {
            style: {
              padding: "12px 20px",
              borderBottom: `1px solid #f3f4f6`,
              flexShrink: 0,
            },
          },
          React.createElement(
            "div",
            { style: { position: "relative" } },
            React.createElement(
              "span",
              {
                style: {
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 13,
                  color: C.textSub,
                  pointerEvents: "none",
                  display: "inline-flex",
                  alignItems: "center",
                },
              },
              SearchIcon,
            ),
            React.createElement("input", {
              autoFocus: true,
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: "Search service name, type...",
              style: inp({ paddingLeft: 36 }),
              onFocus,
              onBlur,
            }),
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
                React.createElement(
                  "th",
                  { style: thS({ minWidth: 160 }) },
                  "Service Name",
                ),
                React.createElement(
                  "th",
                  { style: thS({ minWidth: 180 }) },
                  "Description",
                ),
                React.createElement(
                  "th",
                  { style: thS({ width: 120 }) },
                  "Service Type",
                ),
                React.createElement(
                  "th",
                  { style: thS({ width: 140, textAlign: "right" }) },
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
                      colSpan: 6,
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
                        "span",
                        { style: { color: C.textSub, display: "inline-flex" } },
                        ClipboardIcon,
                      ),
                      React.createElement("div", null, "No services found"),
                      React.createElement(
                        "span",
                        {
                          onClick: () => setTab("create"),
                          style: {
                            color: C.primary,
                            cursor: "pointer",
                            fontSize: 12,
                            textDecoration: "underline",
                          },
                        },
                        "Create new service",
                      ),
                    ),
                  ),
                )
                : filtered.map((s, i) => {
                  const isUsed = selectedIds.includes(String(s.id));
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
                        if (!isUsed) onSelect(s);
                      },
                    },
                    React.createElement(
                      "td",
                      {
                        style: tdS({
                          textAlign: "center",
                          color: C.textSub,
                          fontSize: 12,
                          paddingTop: 13,
                        }),
                      },
                      i + 1,
                    ),
                    React.createElement(
                      "td",
                      { style: tdS({ fontWeight: 500, paddingTop: 12 }) },
                      s.serviceName || `Service #${s.id}`,
                    ),
                    React.createElement(
                      "td",
                      { style: tdS({ paddingTop: 10 }) },
                      React.createElement(ExpandableText, {
                        text: s.description || "",
                        limit: 80,
                      }),
                    ),
                    React.createElement(
                      "td",
                      { style: tdS({ paddingTop: 12 }) },
                      s.serviceType
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
                          s.serviceType,
                        )
                        : React.createElement(
                          "span",
                          { style: { color: "#d1d5db" } },
                          "—",
                        ),
                    ),
                    React.createElement(
                      "td",
                      {
                        style: tdS({
                          textAlign: "right",
                          paddingTop: 12,
                          fontFamily: FONT_MONO,
                          fontWeight: 500,
                        }),
                      },
                      s.basePrice
                        ? Number(s.basePrice).toLocaleString("vi-VN") + " ₫"
                        : React.createElement(
                          "span",
                          { style: { color: "#d1d5db" } },
                          "—",
                        ),
                    ),
                    React.createElement(
                      "td",
                      {
                        style: tdS({ textAlign: "center", paddingTop: 10 }),
                      },
                      isUsed
                        ? React.createElement(
                          "span",
                          {
                            style: {
                              color: C.success,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            },
                          },
                          CheckIcon,
                        )
                        : React.createElement(
                          "div",
                          {
                            style: {
                              display: "inline-block",
                              padding: "3px 14px",
                              borderRadius: 4,
                              background: C.primary,
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 600,
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
      ),
      tab === "create" &&
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "div",
          { style: { overflowY: "auto", flex: 1, padding: "20px 24px" } },
          !internalCompanyId &&
          React.createElement(
            "div",
            {
              style: {
                padding: "10px 14px",
                background: "#fefce8",
                border: `1px solid #fde68a`,
                borderRadius: 8,
                marginBottom: 18,
                fontSize: 13,
                color: C.warning,
                fontWeight: 500,
              },
            },
            "Please select an Internal Company in the main form before creating a service",
          ),
          [
            {
              key: "name",
              label: "Service Name",
              req: true,
              type: "input",
              placeholder: "E.g. Employment contract consultation...",
            },
            {
              key: "serviceType",
              label: "Service Type",
              req: false,
              type: "input",
              placeholder: "E.g. Consultation, Legal...",
              hint: "optional",
            },
            {
              key: "description",
              label: "Description",
              req: false,
              type: "textarea",
              placeholder: "Scope of work, notes...",
              hint: "optional",
            },
            {
              key: "basePrice",
              label: "Unit Price (₫)",
              req: false,
              type: "price",
              hint: "optional",
            },
          ].map((f) =>
            React.createElement(
              "div",
              { key: f.key, style: { marginBottom: 16 } },
              React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 5,
                  },
                },
                React.createElement(
                  "span",
                  {
                    style: {
                      fontFamily: FONT,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: C.textLabel,
                    },
                  },
                  f.label,
                ),
                f.req &&
                React.createElement(
                  "span",
                  {
                    style: { color: C.danger, marginLeft: 3, fontSize: 12 },
                  },
                  "*",
                ),
                f.hint &&
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
                  f.hint,
                ),
              ),
              f.type === "textarea"
                ? React.createElement(AutoTextarea, {
                  value: newSvc[f.key],
                  onChange: (v) => setNewSvc({ ...newSvc, [f.key]: v }),
                  placeholder: f.placeholder,
                  minRows: 3,
                })
                : f.type === "price"
                  ? React.createElement(PriceInput, {
                    value: newSvc.basePrice,
                    onChange: (v) => setNewSvc({ ...newSvc, basePrice: v }),
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
                      ...(errors[f.key] ? { borderColor: C.danger } : {}),
                    },
                    onFocus,
                    onBlur,
                  }),
              errors[f.key] &&
              React.createElement(
                "div",
                {
                  style: { color: C.danger, fontSize: 11.5, marginTop: 4 },
                },
                errors[f.key],
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
              onClick: () => setTab("list"),
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
            "Back",
          ),
          React.createElement(
            "button",
            {
              onClick: handleCreate,
              disabled: creating || !internalCompanyId,
              style: {
                padding: "8px 24px",
                borderRadius: 6,
                background:
                  !internalCompanyId || creating ? "#f3f4f6" : C.primary,
                color: !internalCompanyId || creating ? "#9ca3af" : "#fff",
                border: "none",
                fontWeight: 600,
                fontSize: 13,
                cursor:
                  !internalCompanyId || creating ? "not-allowed" : "pointer",
                fontFamily: FONT,
              },
            },
            creating ? "Creating..." : "Save & Select",
          ),
        ),
      ),
    ),
  );
};

const ProjectServicesTable = ({
  rows,
  svcOpts,
  onUpdate,
  onDelete,
  onAddFromService,
  internalCompanyId,
  quotationId,
  pricingMode,
  financialSourceType,
  packageSummary,
  onPricingModeChange,
  onPackageChange,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingRows, setEditingRows] = useState({});
  const selectedIds = useMemo(
    () => rows.map((r) => r.serviceId).filter(Boolean).map(String),
    [rows],
  );
  const th = (ex = {}) => ({
    padding: "9px 12px",
    fontSize: 11.5,
    fontWeight: 600,
    color: C.textSub,
    background: C.bgSection,
    borderBottom: `2px solid ${C.border}`,
    textAlign: "left",
    whiteSpace: "nowrap",
    fontFamily: FONT,
    ...ex,
  });
  const td = (ex = {}) => ({
    padding: "8px 10px",
    borderBottom: `1px solid #f3f4f6`,
    verticalAlign: "top",
    fontFamily: FONT,
    ...ex,
  });

  const fromQuotationCount = useMemo(
    () => rows.filter((r) => r._fromQuotation).length,
    [rows],
  );
  const fromContractCount = useMemo(
    () => rows.filter((r) => r._fromContract).length,
    [rows],
  );
  const packageMode = isPackagePricing(pricingMode);
  const packageIncludedCount = useMemo(
    () => rows.filter((r) => r.billingMode === BILLING_PACKAGE_INCLUDED).length,
    [rows],
  );
  const hasFinancialSource = financialSourceType && financialSourceType !== SOURCE_NONE;
  const billingOptions = packageMode
    ? [
      { value: BILLING_PACKAGE_INCLUDED, label: "Included in package" },
      { value: BILLING_SEPARATE, label: "Bill separately" },
      { value: BILLING_SCOPE, label: "Scope only" },
    ]
    : hasFinancialSource
      ? [
        { value: BILLING_LINE, label: "Line billable" },
        { value: BILLING_SCOPE, label: "Scope only" },
      ]
      : [
        { value: BILLING_SCOPE, label: "Scope only" },
        { value: BILLING_SEPARATE, label: "Bill separately" },
      ];
  const isMoneyEditable = (mode) =>
    mode === BILLING_LINE || mode === BILLING_SEPARATE;
  const setBillingMode = (rowId, mode) => {
    onUpdate(rowId, "billingMode", mode);
    if (!isMoneyEditable(mode)) {
      onUpdate(rowId, "basePrice", 0);
      onUpdate(rowId, "vat", 0);
    }
  };
  const toggleRowEdit = (rowId) => {
    setEditingRows((p) => ({ ...p, [rowId]: !p[rowId] }));
  };
  const billingLabelFor = (mode) =>
    (billingOptions.find((opt) => opt.value === mode) || {}).label ||
    mode ||
    "-";
  const readOnlyText = (extra = {}) => ({
    color: C.text,
    fontSize: 13.5,
    lineHeight: "20px",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    ...extra,
  });
  const lineTotals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const rowBillingMode =
            row.billingMode ||
            billingModeForContext({
              fromQuotation: !!row._fromQuotation,
              packageMode,
              hasFinancialSource,
            });
          if (!isMoneyEditable(rowBillingMode) || packageMode) return acc;
          const amounts = calcLineAmounts(row.basePrice, row.vat);
          return {
            subTotal: acc.subTotal + amounts.subTotal,
            vatAmount: acc.vatAmount + amounts.vatAmount,
            totalAmount: acc.totalAmount + amounts.totalAmount,
          };
        },
        { subTotal: 0, vatAmount: 0, totalAmount: 0 },
      ),
    [hasFinancialSource, packageMode, rows],
  );
  const displayTotals = packageMode
    ? {
      subTotal: packageSummary?.subTotal || 0,
      vatAmount: packageSummary?.vatAmount || 0,
      totalAmount: packageSummary?.totalAmount || 0,
    }
    : lineTotals;
  const RowEditIcon = ({ active }) =>
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
        "aria-hidden": true,
      },
      active
        ? React.createElement("path", { d: "M20 6 9 17l-5-5" })
        : [
          React.createElement("path", {
            key: "p1",
            d: "M12 20h9",
          }),
          React.createElement("path", {
            key: "p2",
            d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
          }),
        ],
    );
  const TrashIcon = () =>
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
        "aria-hidden": true,
      },
      React.createElement("path", { d: "M3 6h18" }),
      React.createElement("path", { d: "M8 6V4h8v2" }),
      React.createElement("path", { d: "M19 6l-1 14H6L5 6" }),
      React.createElement("path", { d: "M10 11v6" }),
      React.createElement("path", { d: "M14 11v6" }),
    );
  const iconButtonStyle = (color, active = false) => ({
    width: 28,
    height: 28,
    borderRadius: 6,
    border: active ? `1px solid ${color}` : `1px solid ${C.border}`,
    background: active ? "#eff6ff" : "#fff",
    color,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  });

  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        opacity: internalCompanyId ? 1 : 0.55,
        pointerEvents: internalCompanyId ? "auto" : "none",
      },
    },
    !internalCompanyId &&
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
        "Please select an Internal Company first",
      ),
    ),
    pickerOpen &&
    React.createElement(ServicePickerModal, {
      svcOpts,
      selectedIds,
      internalCompanyId,
      onSelect: (svc) => {
        onAddFromService(svc);
        setPickerOpen(false);
      },
      onClose: () => setPickerOpen(false),
      onCreateAndSelect: async (data) => {
        await onAddFromService(data, true);
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
            },
          },
          `${rows.length} services`,
        ),
        fromQuotationCount > 0 &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11.5,
              color: "#0369a1",
              background: "#e0f2fe",
              border: "1px solid #bae6fd",
              padding: "2px 9px",
              borderRadius: 10,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
            },
          },
          React.createElement(
            React.Fragment,
            null,
            FileTextIcon,
            `${fromQuotationCount} from quotation`,
          ),
        ),
        fromContractCount > 0 &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11.5,
              color: "#1f2937",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              padding: "2px 9px",
              borderRadius: 10,
              fontWeight: 600,
            },
          },
          `${fromContractCount} from contract`,
        ),
        packageMode &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11.5,
              color: "#166534",
              background: "#dcfce7",
              border: "1px solid #bbf7d0",
              padding: "2px 9px",
              borderRadius: 10,
              fontWeight: 700,
            },
          },
          `${packageIncludedCount} included in package`,
        ),
      ),
      React.createElement(
        "div",
        {
          onClick: () => setPickerOpen(true),
          style: {
            padding: "5px 14px",
            borderRadius: 6,
            border: `1px dashed ${C.primary}`,
            background: "#fff",
            color: C.primary,
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: FONT,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          },
        },
        React.createElement(
          React.Fragment,
          null,
          PlusIcon,
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
            ? "minmax(220px, 330px) minmax(0, 1fr)"
            : "minmax(0, 330px)",
          gap: 14,
          alignItems: "start",
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
              letterSpacing: 0,
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
              width: "100%",
              maxWidth: 330,
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
                onClick: () => onPricingModeChange?.(mode),
                style: {
                  border: "none",
                  borderRight: mode === PRICING_MODE_LINE ? `1px solid ${C.border}` : "none",
                  background: pricingMode === mode ? C.primary : "#fff",
                  color: pricingMode === mode ? "#fff" : C.text,
                  padding: "9px 14px",
                  fontSize: 13,
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
              minWidth: 0,
              alignItems: "end",
            },
          },
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            React.createElement(
              "div",
              { style: { fontSize: 11.5, color: C.textSub, marginBottom: 3, fontFamily: FONT } },
              "Package Subtotal",
            ),
            React.createElement(PriceInput, {
              value: packageSummary?.subTotal || 0,
              onChange: (value) => onPackageChange?.("packageSubTotal", value),
            }),
          ),
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            React.createElement(
              "div",
              { style: { fontSize: 11.5, color: C.textSub, marginBottom: 3, fontFamily: FONT } },
              "VAT %",
            ),
            React.createElement("input", {
              type: "number",
              min: 0,
              max: 100,
              step: 0.1,
              value: packageSummary?.vatRate || 0,
              onChange: (e) =>
                onPackageChange?.(
                  "packageVatRate",
                  parseFloat(e.target.value) || 0,
                ),
              style: inp({ textAlign: "right", fontWeight: 700 }),
              onFocus,
              onBlur,
            }),
          ),
          [
            ["VAT Amount", fmtVND(packageSummary?.vatAmount || 0)],
            ["Package Total", fmtVND(packageSummary?.totalAmount || 0)],
          ].map(([label, value]) =>
            React.createElement(
              "div",
              { key: label, style: { minWidth: 0 } },
              React.createElement(
                "div",
                { style: { fontSize: 11.5, color: C.textSub, marginBottom: 3, fontFamily: FONT } },
                label,
              ),
              React.createElement(
                "div",
                {
                  title: value,
                  style: {
                    ...inp({
                      background: label === "Package Total" ? "#ecfdf5" : C.bgSection,
                      color: label === "Package Total" ? C.success : C.text,
                    }),
                    fontWeight: label === "Package Total" ? 800 : 700,
                    textAlign: "right",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  },
                },
                value,
              ),
            ),
          ),
        ),
    ),
    false &&
    packageMode &&
    React.createElement(
      "div",
      {
        style: {
          padding: "10px 16px",
          borderBottom: `1px solid ${C.border}`,
          background: "#f0fdf4",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          alignItems: "center",
          fontFamily: FONT,
        },
      },
      [
        ["Package Subtotal", fmtVND(packageSummary?.subTotal || 0)],
        ["VAT %", `${packageSummary?.vatRate || 0}%`],
        ["VAT Amount", fmtVND(packageSummary?.vatAmount || 0)],
        ["Package Total", fmtVND(packageSummary?.totalAmount || 0)],
      ].map(([label, value]) =>
        React.createElement(
          "div",
          { key: label, style: { minWidth: 0 } },
          React.createElement(
            "div",
            { style: { fontSize: 11, color: C.textSub, marginBottom: 2 } },
            label,
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: 13,
                color: label === "Package Total" ? C.success : C.text,
                fontWeight: 800,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
              title: value,
            },
            value,
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
          style: {
            width: "100%",
            borderCollapse: "collapse",
            minWidth: packageMode ? 760 : 930,
          },
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
              "Service Name & Type",
            ),
            React.createElement(
              "th",
              { style: th({ minWidth: 320 }) },
              "Description",
            ),
            React.createElement(
              "th",
              { style: th({ width: 150, textAlign: "right" }) },
              "Unit Price (₫)",
            ),
            React.createElement(
              "th",
              { style: th({ width: 80, textAlign: "center" }) },
              "VAT (%)",
            ),
            React.createElement(
              "th",
              { style: th({ width: 160, textAlign: "right", color: "#1d4ed8" }) },
              "Total",
            ),
            React.createElement("th", { style: th({ width: 84 }) }, ""),
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
                  style: {
                    ...td(),
                    textAlign: "center",
                    color: "#9ca3af",
                    padding: "36px 0",
                    fontSize: 13,
                  },
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
                    "span",
                    { style: { color: C.textSub } },
                    ClipboardIcon,
                  ),
                  React.createElement(
                    "span",
                    null,
                    'No services yet - click "Add row"',
                  ),
                ),
              ),
            )
            : rows.map((r, i) => {
              const isRowEdit = !!editingRows[r._id];
              const isEditDesc = isRowEdit;
              const isFromQuotation = !!r._fromQuotation;
              const rowBillingMode =
                r.billingMode ||
                billingModeForContext({
                  fromQuotation: isFromQuotation,
                  packageMode,
                  hasFinancialSource,
                });
              const moneyEditable = isMoneyEditable(rowBillingMode);
              const lineAmount =
                !packageMode && moneyEditable
                  ? calcLineAmounts(r.basePrice, r.vat)
                  : null;
              return React.createElement(
                "tr",
                {
                  key: r._id,
                  style: {
                    background: isFromQuotation
                      ? i % 2 === 0
                        ? "#f0f9ff"
                        : "#e8f4fd"
                      : i % 2 === 0
                        ? "#fff"
                        : "#fafafa",
                  },
                },
                React.createElement(
                  "td",
                  {
                    style: {
                      ...td(),
                      textAlign: "center",
                      color: C.textSub,
                      fontSize: 12,
                      fontWeight: 600,
                      paddingTop: 13,
                    },
                  },
                  isFromQuotation
                    ? React.createElement(
                      "span",
                      { title: "From quotation", style: { display: "inline-flex", color: C.primary } },
                      FileTextIcon,
                    )
                    : i + 1,
                ),
                React.createElement(
                  "td",
                  { style: { ...td(), paddingTop: 11 } },
                  isRowEdit
                    ? React.createElement(
                      "div",
                      { style: { display: "grid", gap: 6 } },
                      React.createElement("input", {
                        value: r.serviceName || "",
                        onChange: (e) =>
                          onUpdate(r._id, "serviceName", e.target.value),
                        placeholder: "Service name...",
                        style: inp({ fontSize: 13.5, padding: "6px 9px" }),
                        onFocus,
                        onBlur,
                      }),
                      React.createElement("input", {
                        value: r.serviceType || "",
                        onChange: (e) =>
                          onUpdate(r._id, "serviceType", e.target.value),
                        placeholder: "Service type...",
                        style: inp({ fontSize: 12.5, padding: "5px 9px" }),
                        onFocus,
                        onBlur,
                      }),
                    )
                    : React.createElement(
                      "div",
                        {
                          title: r.serviceName || "",
                        style: {
                          ...readOnlyText({ fontWeight: 600 }),
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
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
                        r.serviceName || "-",
                      ),
                      r.serviceType &&
                      React.createElement(
                        "span",
                        {
                          style: {
                            alignSelf: "flex-start",
                            fontSize: 10.5,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 500,
                            lineHeight: "15px",
                          },
                        },
                        r.serviceType,
                      ),
                    ),
                ),
                React.createElement(
                  "td",
                  { style: { ...td(), paddingTop: 8, minWidth: 320 } },
                  isEditDesc
                    ? React.createElement("textarea", {
                      autoFocus: true,
                      value: r.description || "",
                      onChange: (e) =>
                        onUpdate(r._id, "description", e.target.value),
                      placeholder: "Enter description...",
                      rows: 3,
                      style: {
                        ...inp({
                          fontSize: 12.5,
                          padding: "6px 9px",
                          lineHeight: "18px",
                          resize: "vertical",
                          minHeight: 64,
                        }),
                      },
                      onFocus,
                      onBlur,
                    })
                    : React.createElement(
                      "div",
                      {
                        style: {
                          minHeight: 34,
                          padding: "4px 6px",
                          borderRadius: 5,
                          border: `1px dashed ${C.border}`,
                          background: "#fafafa",
                          lineHeight: "18px",
                        },
                      },
                      r.description
                        ? React.createElement(ExpandableText, {
                          text: r.description,
                          limit: 100,
                        })
                        : React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 12,
                              color: "#d1d5db",
                              fontStyle: "italic",
                            },
                          },
                          "No description",
                        ),
                    ),
                ),
                React.createElement(
                  "td",
                  { style: { ...td(), paddingTop: 11, textAlign: "right" } },
                  isRowEdit && moneyEditable && !packageMode
                    ? React.createElement(PriceInput, {
                      value: r.basePrice || 0,
                      onChange: (v) => onUpdate(r._id, "basePrice", v),
                    })
                    : React.createElement(
                      "span",
                      {
                        style: {
                          color:
                            moneyEditable
                              ? C.text
                              : rowBillingMode === BILLING_PACKAGE_INCLUDED
                                ? C.primary
                                : C.textSub,
                          fontSize: 12.5,
                          fontWeight:
                            moneyEditable ||
                              rowBillingMode === BILLING_PACKAGE_INCLUDED
                              ? 700
                              : 500,
                          lineHeight: "20px",
                        },
                      },
                      moneyEditable && !packageMode
                        ? fmtVND(r.basePrice || 0)
                        : packageMode || rowBillingMode === BILLING_PACKAGE_INCLUDED
                          ? "Included in package"
                          : "Scope only",
                    ),
                ),
                React.createElement(
                  "td",
                  { style: { ...td(), paddingTop: 11, textAlign: "center" } },
                  isRowEdit && moneyEditable && !packageMode
                    ? React.createElement("input", {
                      type: "number",
                      min: 0,
                      max: 100,
                      step: 1,
                      value: r.vat || 0,
                      onChange: (e) =>
                        onUpdate(r._id, "vat", parseFloat(e.target.value) || 0),
                      style: inp({
                        fontSize: 13,
                        padding: "6px 9px",
                        textAlign: "center",
                        width: "100%",
                      }),
                      onFocus,
                      onBlur,
                    })
                    : React.createElement(
                      "span",
                      {
                        style: {
                          color: moneyEditable ? C.text : C.textSub,
                          fontSize: 12.5,
                          fontWeight: moneyEditable ? 700 : 500,
                          lineHeight: "20px",
                        },
                      },
                      moneyEditable && !packageMode ? `${r.vat || 0}%` : "0%",
                    ),
                ),
                React.createElement(
                  "td",
                  {
                    style: {
                      ...td(),
                      paddingTop: 11,
                      textAlign: "right",
                      color: "#1d4ed8",
                      fontWeight: 700,
                      fontSize: 13.5,
                      fontFamily: FONT_MONO,
                    },
                  },
                  lineAmount ? fmtVND(lineAmount.totalAmount) : "—",
                ),
                React.createElement(
                  "td",
                  { style: { ...td(), textAlign: "center", paddingTop: 8 } },
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      },
                    },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        title: isRowEdit ? "Done editing" : "Edit service",
                        onClick: () => toggleRowEdit(r._id),
                        style: iconButtonStyle(C.primary, isRowEdit),
                      },
                      React.createElement(RowEditIcon, { active: isRowEdit }),
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        title: "Delete service",
                        onClick: () => onDelete(r._id),
                        style: iconButtonStyle(C.danger),
                      },
                      React.createElement(TrashIcon),
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
          [
            packageMode ? "Package Subtotal" : "Subtotal (excl. VAT)",
            fmtVND(displayTotals.subTotal),
            C.textSub,
            false,
          ],
          ["Total VAT", fmtVND(displayTotals.vatAmount), C.warning, false],
          [
            packageMode ? "Package Total" : "Total",
            fmtVND(displayTotals.totalAmount),
            C.success,
            true,
          ],
        ].map(([label, val, color, bold], i) =>
          React.createElement(
            "div",
            {
              key: label,
              style: {
                display: "flex",
                justifyContent: "space-between",
                gap: 24,
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
                  whiteSpace: "nowrap",
                },
              },
              val,
            ),
          ),
        ),
      ),
    ),
  );
};

const Card = ({ children, style = {} }) =>
  React.createElement(
    "div",
    {
      style: {
        background: C.bgCard,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        marginBottom: 16,
        overflow: "visible",
        ...style,
      },
    },
    children,
  );
const CardHeader = ({ title, subtitle }) =>
  React.createElement(
    "div",
    {
      style: {
        padding: "13px 20px",
        borderBottom: `1px solid ${C.border}`,
        background: C.bgSection,
        display: "flex",
        alignItems: "baseline",
        gap: 10,
      },
    },
    React.createElement(
      "span",
      {
        style: {
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 13.5,
          color: C.text,
        },
      },
      title,
    ),
    subtitle &&
    React.createElement(
      "span",
      { style: { fontSize: 12, color: C.textSub } },
      subtitle,
    ),
  );
const Field = ({ label, required, hint, children, mb = 0 }) =>
  React.createElement(
    "div",
    { style: { marginBottom: mb } },
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", marginBottom: 5 } },
      React.createElement(
        "span",
        {
          style: {
            fontFamily: FONT,
            fontSize: 11.5,
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
const Grid = ({ cols = 2, gap = 16, mb = 16, children }) =>
  React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: `repeat(${cols},1fr)`,
        gap,
        marginBottom: mb,
      },
    },
    children,
  );

// ─── MAIN FORM ────────────────────────────────────────────────
const ProjectCreateForm = () => {
  const [form, setForm] = useState({
    internalCompanyId: null,
    customerId: null,
    projectName: "",
    date: nowISO(),
    deadline: "",
    priority: "medium",
    projectManagerId: null,
    lawyerIds: [],
    description: "",
    contractId: null,
    quotationId: null,
    caseCode: "",
    pricingMode: PRICING_MODE_LINE,
    financialSourceType: SOURCE_MANUAL,
    packageSubTotal: 0,
    packageVatRate: 0,
    packageVatAmount: 0,
    packageTotalAmount: 0,
  });

  const [users, setUsers] = useState([]);
  const [rows, setRows] = useState([]);
  const [internalCompanies, setInternalCompanies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [svcOpts, setSvcOpts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");
  // Snapshot rows ban đầu từ quotation để so sánh khi submit
  const initialRowsRef = useRef([]);

  useEffect(() => {
    Promise.all([
      fetchAll("internalCompany:list"),
      fetchAll("customers:list"),
      fetchAll("lawyers:list"),
      fetchAll("contracts:list"),
      fetchAll("quotations:list"),
      fetchAll("companyServices:list"),
      fetchAll("projects:list"),
      fetchPMUsers(),
      getCurrentUser(),
    ])
      .then(([comps, custs, laws, conts, quots, svcs, projs, pmUsers, user]) => {
        setInternalCompanies(comps);
        setCustomers(custs);
        setLawyers(laws);
        setContracts(conts);
        setQuotations(quots);
        setProjects(projs || []);
        setUsers(pmUsers);

        setSvcOpts(
          svcs.map((s) => ({
            id: s.serviceId || s.service?.id || s.id,
            internalCompanyId: s.internalCompanyId,
            serviceName: s.service?.serviceName || s.serviceName || "",
            serviceType: s.service?.serviceType || s.serviceType || "",
            description: s.service?.description || s.description || "",
            basePrice: s.price ?? s.basePrice ?? s.service?.basePrice ?? 0,
          })),
        );

        setCurrentUser(user);
        if (user?.id)
          setForm((p) => ({ ...p, projectManagerId: String(user.id) }));

        const inputArgs = ctx?.view?.inputArgs || {};
        const popupParams = {
          ...(inputArgs || {}),
          ...(inputArgs.params || {}),
          ...(ctx?.params || {}),
        };
        const recordCustomerId =
          ctx?.record?.customerId ||
          (ctx?.record?.customerType ? ctx?.record?.id : null);
        const usedQIds = new Set(
          (projs || [])
            .filter((p) => p.quotationId)
            .map((p) => String(p.quotationId)),
        );
        const availableQuots = quots.filter(
          (q) => !usedQIds.has(String(q.id)),
        );
        const match = window.location.pathname.match(/\/filterbytk\/(\d+)/i);
        const urlId = match
          ? match[1]
          : ctx?.filterByTk ||
          popupParams.customerId ||
          recordCustomerId ||
          null;

        if (urlId) {
          const foundContract = conts.find(
            (c) => String(c.id) === String(urlId),
          );
          if (foundContract) {
            const custId =
              foundContract.customerId || foundContract.customer?.id;
            const foundCust = custs.find(
              (c) => String(c.id) === String(custId),
            );
            const foundQuot = availableQuots.find(
              (q) =>
                String(q.customerId) === String(custId) ||
                String(q.customer?.id) === String(custId),
            );

            if (foundCust) setCurrentCustomer(foundCust);

            setForm((p) => ({
              ...p,
              ...financialStateFromRecord(
                foundContract || foundQuot,
                foundContract ? SOURCE_CONTRACT : SOURCE_QUOTATION,
              ),
              internalCompanyId:
                foundContract.internalCompanyId ||
                foundQuot?.internalCompanyId ||
                p.internalCompanyId,
              contractId: String(foundContract.id),
              customerId: foundCust ? String(foundCust.id) : null,
              quotationId: foundQuot ? String(foundQuot.id) : null,
            }));

            if (foundContract) {
              fetchContractServices(foundContract.id)
                .then((csvcs) => {
                  if (csvcs.length > 0)
                    setRows(mapContractServicesToRows(csvcs, foundContract));
                })
                .catch(() => { });
            } else if (foundQuot) {
              fetchQuotationServices(foundQuot.id)
                .then((qsvcs) => {
                  if (qsvcs.length > 0)
                    setRows(mapQuotationServicesToRows(qsvcs, foundQuot));
                })
                .catch(() => { });
            }
          } else {
            const foundCust = custs.find((c) => String(c.id) === String(urlId));
            if (foundCust) {
              setCurrentCustomer(foundCust);
              const cc = conts.find(
                (c) =>
                  String(c.customerId) === String(foundCust.id) ||
                  String(c.customer?.id) === String(foundCust.id),
              );
              const cq = availableQuots.find(
                (q) =>
                  String(q.customerId) === String(foundCust.id) ||
                  String(q.customer?.id) === String(foundCust.id),
              );
              setForm((p) => ({
                ...p,
                ...financialStateFromRecord(
                  cc || cq,
                  cc ? SOURCE_CONTRACT : cq ? SOURCE_QUOTATION : SOURCE_NONE,
                ),
                internalCompanyId:
                  cc?.internalCompanyId ||
                  cq?.internalCompanyId ||
                  p.internalCompanyId,
                customerId: String(foundCust.id),
                contractId: cc ? String(cc.id) : null,
                quotationId: cq ? String(cq.id) : null,
              }));
              if (cc) {
                fetchContractServices(cc.id)
                  .then((csvcs) => {
                    if (csvcs.length > 0)
                      setRows(mapContractServicesToRows(csvcs, cc));
                  })
                  .catch(() => { });
              } else if (cq) {
                fetchQuotationServices(cq.id)
                  .then((qsvcs) => {
                    if (qsvcs.length > 0)
                      setRows(mapQuotationServicesToRows(qsvcs, cq));
                  })
                  .catch(() => { });
              }
            }
          }
        }
        setLoading(false);
      })
      .catch((error) => {
        console.warn("[CaseCreateForm] initial load failed", error);
        message.error("Could not load case form data.");
        setLoading(false);
      });
  }, []);

  const setF = useCallback((k, v) => setForm((p) => ({ ...p, [k]: v })), []);

  const applyFinancialSource = useCallback((record, sourceType) => {
    setForm((p) => ({
      ...p,
      ...financialStateFromRecord(record, sourceType),
    }));
  }, []);

  const refreshCustomers = useCallback(async () => {
    setCustomers(await fetchAll("customers:list"));
  }, []);

  const refreshContracts = useCallback(async () => {
    setContracts(await fetchAll("contracts:list"));
  }, []);

  const refreshQuotations = useCallback(async () => {
    setQuotations(await fetchAll("quotations:list"));
  }, []);

  const openCreatePopup = useCallback(async (viewKey, refreshFn, params = {}) => {
    const opened = await openPopupViewByUid(viewKey, params);
    if (opened && refreshFn) {
      setTimeout(refreshFn, 1200);
      setTimeout(refreshFn, 3500);
    }
  }, []);

  // ── Helper: load services from quotationId and set rows ──
  const loadServicesFromQuotation = useCallback(
    async (quotationId, showToast = true) => {
      if (!quotationId) return 0;
      setLoadingServices(true);
      try {
        const selectedQuotation = quotations.find(
          (q) => String(q.id) === String(quotationId),
        );
        applyFinancialSource(selectedQuotation, SOURCE_QUOTATION);
        const qsvcs = await fetchQuotationServices(quotationId);
        if (qsvcs.length > 0) {
          const mapped = mapQuotationServicesToRows(qsvcs, selectedQuotation);
          // Lưu snapshot ban đầu kèm quotationServiceId để so sánh khi submit
          initialRowsRef.current = qsvcs.map((s) => ({
            _qServiceId: s.id,
            serviceId: s.serviceId ? String(s.serviceId) : null,
            basePrice: isPackagePricing(selectedQuotation) ? 0 : s.price ?? s.basePrice ?? 0,
            vat: isPackagePricing(selectedQuotation) ? 0 : s.vat ?? 0,
          }));
          setRows(mapped);
          if (showToast)
            message.success(`Loaded ${qsvcs.length} services from quotation`);
          return qsvcs.length;
        } else {
          initialRowsRef.current = [];
          setRows([]);
          if (showToast) message.info("This quotation has no services yet");
          return 0;
        }
      } catch {
        initialRowsRef.current = [];
        setRows([]);
        if (showToast) message.error("Could not load services from quotation");
        return 0;
      } finally {
        setLoadingServices(false);
      }
    },
    [applyFinancialSource, quotations],
  );

  // ── Select customer: auto-select contract + quotation + load services ──
  const loadServicesFromContract = useCallback(
    async (contractId, showToast = true) => {
      if (!contractId) return 0;
      setLoadingServices(true);
      try {
        const selectedContract = contracts.find(
          (c) => String(c.id) === String(contractId),
        );
        applyFinancialSource(selectedContract, SOURCE_CONTRACT);
        const csvcs = await fetchContractServices(contractId);
        if (csvcs.length > 0) {
          const mapped = mapContractServicesToRows(csvcs, selectedContract);
          initialRowsRef.current = [];
          setRows(mapped);
          if (showToast)
            message.success(`Loaded ${csvcs.length} services from contract`);
          return csvcs.length;
        }
        initialRowsRef.current = [];
        setRows([]);
        if (showToast) message.info("This contract has no services yet");
        return 0;
      } catch {
        initialRowsRef.current = [];
        setRows([]);
        if (showToast) message.error("Could not load services from contract");
        return 0;
      } finally {
        setLoadingServices(false);
      }
    },
    [applyFinancialSource, contracts],
  );

  const handleCustomerChange = useCallback(
    async (customerId) => {
      if (!customerId) {
        setForm((p) => ({
          ...p,
          customerId: null,
          contractId: null,
          quotationId: null,
          ...financialStateFromRecord(null, SOURCE_NONE),
        }));
        setCurrentCustomer(null);
        setRows([]);
        return;
      }

      setCurrentCustomer(
        customers.find((c) => String(c.id) === String(customerId)) || null,
      );

      const cc = contracts.find(
        (c) =>
          String(c.customerId) === String(customerId) ||
          String(c.customer?.id) === String(customerId),
      );
      const usedQIds = new Set(
        projects.filter((p) => p.quotationId).map((p) => String(p.quotationId)),
      );
      const availableQuots = quotations.filter(
        (q) => !usedQIds.has(String(q.id)),
      );

      const cq = availableQuots.find(
        (q) =>
          String(q.customerId) === String(customerId) ||
          String(q.customer?.id) === String(customerId),
      );

      setForm((p) => ({
        ...p,
        ...financialStateFromRecord(
          cc || cq,
          cc ? SOURCE_CONTRACT : cq ? SOURCE_QUOTATION : SOURCE_NONE,
        ),
        customerId,
        contractId: cc ? String(cc.id) : null,
        quotationId: cq ? String(cq.id) : null,
      }));

      if (cc) {
        const count = await loadServicesFromContract(cc.id, false);
        const parts = [cc && "contract", "quotation"]
          .filter(Boolean)
          .join(" and ");
        if (count > 0) {
          message.success(
            `Auto-selected ${parts} and loaded ${count} services from contract`,
          );
        } else {
          message.info(`Auto-selected ${parts} for this customer`);
        }
      } else if (cq) {
        const count = await loadServicesFromQuotation(cq.id, false);
        if (count > 0) {
          message.success(
            `Auto-selected quotation and loaded ${count} services from quotation`,
          );
        } else {
          message.info("Auto-selected quotation for this customer");
        }
      } else {
        setRows([]);
      }
    },
    [contracts, customers, projects, quotations, loadServicesFromQuotation, loadServicesFromContract],
  );

  // ── Manual quotation selection: load services ──
  const handleQuotationChange = useCallback(
    async (quotationId) => {
      setF("quotationId", quotationId);

      if (!quotationId) {
        const selectedContract = contracts.find(
          (c) => String(c.id) === String(form.contractId),
        );
        applyFinancialSource(
          selectedContract,
          selectedContract ? SOURCE_CONTRACT : SOURCE_NONE,
        );
        if (selectedContract) {
          await loadServicesFromContract(selectedContract.id, true);
        } else {
          setRows([]);
        }
        return;
      }

      const selectedContract = contracts.find(
        (c) => String(c.id) === String(form.contractId),
      );
      if (selectedContract) {
        applyFinancialSource(selectedContract, SOURCE_CONTRACT);
        await loadServicesFromContract(selectedContract.id, true);
        return;
      }

      await loadServicesFromQuotation(quotationId, true);
    },
    [applyFinancialSource, contracts, form.contractId, loadServicesFromQuotation, loadServicesFromContract, setF],
  );

  const handleContractChange = useCallback(
    async (contractId) => {
      const selectedContract = contracts.find(
        (c) => String(c.id) === String(contractId),
      );
      setForm((p) => ({
        ...p,
        ...financialStateFromRecord(
          selectedContract,
          selectedContract ? SOURCE_CONTRACT : (p.quotationId ? SOURCE_QUOTATION : SOURCE_NONE),
        ),
        contractId,
      }));
      if (selectedContract) {
        await loadServicesFromContract(contractId, true);
        return;
      }
      if (form.quotationId) {
        await loadServicesFromQuotation(form.quotationId, true);
      } else {
        setRows([]);
      }
    },
    [contracts, form.quotationId, loadServicesFromContract, loadServicesFromQuotation],
  );

  const addRowFromService = useCallback(
    async (svc, isCreate = false) => {
      const packageMode = isPackagePricing(form.pricingMode);
      const billingMode = packageMode
        ? BILLING_PACKAGE_INCLUDED
        : billingModeForContext({
          fromQuotation: false,
          packageMode,
          hasFinancialSource: form.financialSourceType !== SOURCE_NONE,
        });
      const shouldCarryPrice =
        billingMode === BILLING_LINE || billingMode === BILLING_SEPARATE;
      const addToPackageTotal = (amount) => {
        const lineAmount = parseNum(amount);
        if (!packageMode || !lineAmount) return;
        setForm((p) => {
          const subTotal = parseNum(p.packageSubTotal) + lineAmount;
          const vatRate = parseNum(p.packageVatRate) || 8;
          const vatAmount = Math.round((subTotal * vatRate) / 100);
          return {
            ...p,
            pricingMode: PRICING_MODE_PACKAGE,
            financialSourceType:
              p.financialSourceType === SOURCE_NONE ? SOURCE_MANUAL : p.financialSourceType,
            packageSubTotal: subTotal,
            packageVatRate: vatRate,
            packageVatAmount: vatAmount,
            packageTotalAmount: subTotal + vatAmount,
          };
        });
      };
      if (isCreate) {
        const serviceName = String(svc.serviceName || "").trim();
        const duplicateName = rows.some(
          (row) =>
            String(row.serviceName || "").trim().toLowerCase() ===
            serviceName.toLowerCase(),
        );
        if (duplicateName) {
          message.warning("This service is already added in the case.");
          return;
        }
        setRows((p) => [
          ...p,
          {
            _id: Date.now() + Math.random(),
            serviceId: null,
            serviceName,
            serviceType: svc.serviceType || "",
            description: svc.description || "",
            basePrice: shouldCarryPrice ? svc.basePrice || 0 : 0,
            vat: shouldCarryPrice ? 0 : 0,
            billingMode,
            financialSourceType:
              billingMode === BILLING_SEPARATE
                ? SOURCE_MANUAL
                : billingMode === BILLING_SCOPE
                  ? SOURCE_NONE
                  : form.financialSourceType || SOURCE_NONE,
            pricingMode: form.pricingMode,
            _packageBasePrice: packageMode ? parseNum(svc.basePrice) : 0,
          },
        ]);
        addToPackageTotal(svc.basePrice);
        message.success("Service row added. It will be saved to project services on submit.");
      } else {
        setRows((p) => [
          ...p,
          {
            _id: Date.now(),
            serviceId: String(svc.id),
            serviceName: svc.serviceName || "",
            serviceType: svc.serviceType || "",
            description: svc.description || "",
            basePrice: shouldCarryPrice ? svc.basePrice || 0 : 0,
            vat: 0,
            billingMode,
            financialSourceType:
              billingMode === BILLING_SEPARATE
                ? SOURCE_MANUAL
                : billingMode === BILLING_SCOPE
                  ? SOURCE_NONE
                  : form.financialSourceType || SOURCE_NONE,
            pricingMode: form.pricingMode,
            _packageBasePrice: packageMode ? parseNum(svc.basePrice) : 0,
          },
        ]);
        addToPackageTotal(svc.basePrice);
      }
    },
    [form.financialSourceType, form.pricingMode, rows],
  );

  const deleteRow = (id) => {
    const row = rows.find((r) => r._id === id);
    const packageBasePrice = parseNum(row?._packageBasePrice);
    if (isPackagePricing(form.pricingMode) && packageBasePrice) {
      setForm((p) => {
        const subTotal = Math.max(parseNum(p.packageSubTotal) - packageBasePrice, 0);
        const vatRate = parseNum(p.packageVatRate) || 8;
        const vatAmount = Math.round((subTotal * vatRate) / 100);
        return {
          ...p,
          packageSubTotal: subTotal,
          packageVatRate: vatRate,
          packageVatAmount: vatAmount,
          packageTotalAmount: subTotal + vatAmount,
        };
      });
    }
    setRows((p) => p.filter((r) => r._id !== id));
  };
  const updateRow = (id, field, value) =>
    setRows((p) => p.map((r) => (r._id !== id ? r : { ...r, [field]: value })));

  const handlePackageSummaryChange = useCallback((field, value) => {
    setForm((p) => {
      const nextSubTotal =
        field === "packageSubTotal"
          ? parseNum(value)
          : parseNum(p.packageSubTotal);
      const nextVatRate =
        field === "packageVatRate"
          ? parseNum(value)
          : parseNum(p.packageVatRate);
      const nextVatAmount = Math.round((nextSubTotal * nextVatRate) / 100);
      return {
        ...p,
        pricingMode: PRICING_MODE_PACKAGE,
        financialSourceType:
          p.financialSourceType === SOURCE_NONE ? SOURCE_MANUAL : p.financialSourceType,
        packageSubTotal: nextSubTotal,
        packageVatRate: nextVatRate,
        packageVatAmount: nextVatAmount,
        packageTotalAmount: nextSubTotal + nextVatAmount,
      };
    });
  }, []);

  // ── SUBMIT ────────────────────────────────────────────────────
  const handleServicePricingModeChange = useCallback(
    (mode) => {
      const nextMode = isPackagePricing(mode) ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE;
      if (nextMode === form.pricingMode) return;

      if (nextMode === PRICING_MODE_PACKAGE) {
        const subTotal =
          rows.reduce((sum, row) => sum + parseNum(row.basePrice), 0) ||
          parseNum(form.packageSubTotal);
        const vatRate = parseNum(form.packageVatRate) || 8;
        const vatAmount = Math.round((subTotal * vatRate) / 100);
        setForm((p) => ({
          ...p,
          pricingMode: PRICING_MODE_PACKAGE,
          financialSourceType:
            p.financialSourceType === SOURCE_NONE ? SOURCE_MANUAL : p.financialSourceType,
          packageSubTotal: subTotal,
          packageVatRate: vatRate,
          packageVatAmount: vatAmount,
          packageTotalAmount: subTotal + vatAmount,
        }));
        setRows((p) =>
          p.map((row) => ({
            ...row,
            billingMode: BILLING_PACKAGE_INCLUDED,
            pricingMode: PRICING_MODE_PACKAGE,
            financialSourceType:
              row.financialSourceType === SOURCE_NONE ? SOURCE_MANUAL : row.financialSourceType,
            _packageBasePrice:
              parseNum(row._packageBasePrice) || parseNum(row.basePrice),
            basePrice: 0,
            vat: 0,
          })),
        );
        return;
      }

      setForm((p) => ({
        ...p,
        pricingMode: PRICING_MODE_LINE,
        financialSourceType:
          p.financialSourceType === SOURCE_NONE ? SOURCE_MANUAL : p.financialSourceType,
        packageSubTotal: 0,
        packageVatAmount: 0,
        packageTotalAmount: 0,
      }));
      setRows((p) =>
        p.map((row) => ({
          ...row,
          billingMode: BILLING_LINE,
          pricingMode: PRICING_MODE_LINE,
          financialSourceType:
            row.financialSourceType === SOURCE_NONE ? SOURCE_MANUAL : row.financialSourceType,
          basePrice:
            parseNum(row.basePrice) || parseNum(row._packageBasePrice),
          vat: row.vat || 8,
        })),
      );
    },
    [form.packageSubTotal, form.packageVatRate, form.pricingMode, rows],
  );

  const handleSubmit = async () => {
    if (!form.internalCompanyId) {
      message.warning("Please select an Internal Company");
      return;
    }
    if (!form.customerId) {
      message.warning("Please select a Customer");
      return;
    }
    if (!form.projectName.trim()) {
      message.warning("Please enter a Case name");
      return;
    }
    if (!form.date) {
      message.warning("Please select an open date");
      return;
    }

    setSubmitting(true);
    try {
      let activeQuotationId = form.quotationId
        ? parseInt(form.quotationId)
        : null;
      let isNewAutoQuotation = false;

      // Quotation is no longer auto-created here; services can remain case scope.
      if (false && !activeQuotationId && rows.length > 0) {
        setSubmitStep("Auto-creating new Quotation...");
        const remainSubTotal = rows.reduce(
          (sum, r) => sum + (Number(r.basePrice) || 0),
          0,
        );
        const remainVatAmount = rows.reduce((sum, r) => {
          const price = Number(r.basePrice) || 0;
          const vatPct = Number(r.vat) || 0;
          return sum + Math.round((price * vatPct) / 100);
        }, 0);
        const remainTotal = remainSubTotal + remainVatAmount;

        const currentLawyer = lawyers.find(l => {
          const uid = typeof l.userId === 'object' ? l.userId?.id : l.userId;
          return String(uid) === String(currentUser?.id);
        });
        const currentLawyerId = currentLawyer?.id || null;

        const defaultLawyerId =
          form.lawyerIds?.length > 0
            ? parseInt(form.lawyerIds[0])
            : currentLawyerId;

        const newQuoteRes = await ctx.api.request({
          url: "quotations:create",
          method: "POST",
          data: {
            status: "new",
            title: `Báo giá cho ${form.projectName.trim()}`,
            customerId: parseInt(form.customerId),
            internalCompanyId: parseInt(form.internalCompanyId),
            lawyerId: defaultLawyerId,
            subTotal: remainSubTotal,
            vatAmount: remainVatAmount,
            totalAmount: remainTotal,
            date: new Date().toISOString(),
          },
        });
        const rawQId = newQuoteRes?.data?.data?.id || newQuoteRes?.data?.id;
        activeQuotationId = rawQId ? parseInt(rawQId) : null;
        isNewAutoQuotation = true;
      }

      const selectedQuotation = activeQuotationId
        ? quotations.find((q) => String(q.id) === String(activeQuotationId))
        : null;
      const selectedContract = form.contractId
        ? contracts.find((c) => String(c.id) === String(form.contractId))
        : null;
      const activePackageMode = isPackagePricing(form.pricingMode);
      const activeFinancialSourceType = selectedContract
        ? SOURCE_CONTRACT
        : selectedQuotation
          ? SOURCE_QUOTATION
          : form.financialSourceType || SOURCE_MANUAL;
      const packageFieldsForRow = (row = {}) => {
        if (!activePackageMode) {
          return {
            packageSubTotal: 0,
            packageVatRate: 0,
            packageVatAmount: 0,
            packageTotalAmount: 0,
          };
        }
        const subTotal = parseNum(row.packageSubTotal ?? form.packageSubTotal);
        const vatRate = parseNum(row.packageVatRate ?? form.packageVatRate);
        const vatAmount =
          parseNum(row.packageVatAmount ?? form.packageVatAmount) ||
          Math.round((subTotal * vatRate) / 100);
        const totalAmount =
          parseNum(row.packageTotalAmount ?? form.packageTotalAmount) ||
          subTotal + vatAmount;
        return {
          packageSubTotal: subTotal,
          packageVatRate: vatRate,
          packageVatAmount: vatAmount,
          packageTotalAmount: totalAmount,
        };
      };
      const projectPackageData = activePackageMode
        ? {
            pricingMode: PRICING_MODE_PACKAGE,
            financialSourceType: activeFinancialSourceType,
            packageSubTotal: Number(form.packageSubTotal) || 0,
            packageVatRate: Number(form.packageVatRate) || 0,
            packageVatAmount: Number(form.packageVatAmount) || 0,
            packageTotalAmount: Number(form.packageTotalAmount) || 0,
            subTotal: Number(form.packageSubTotal) || 0,
            vatAmount: Number(form.packageVatAmount) || 0,
            totalAmount: Number(form.packageTotalAmount) || 0,
          }
        : {
            pricingMode: PRICING_MODE_LINE,
            financialSourceType: activeFinancialSourceType,
          };
      const createProject = async (data) => {
        try {
          return await ctx.api.request({
            url: "projects:create",
            method: "POST",
            data,
          });
        } catch (error) {
          const fallback = { ...data };
          delete fallback.pricingMode;
          delete fallback.financialSourceType;
          delete fallback.packageSubTotal;
          delete fallback.packageVatRate;
          delete fallback.packageVatAmount;
          delete fallback.packageTotalAmount;
          delete fallback.subTotal;
          delete fallback.vatAmount;
          delete fallback.totalAmount;
          console.warn("Retrying project create without package pricing fields:", error);
          return ctx.api.request({
            url: "projects:create",
            method: "POST",
            data: fallback,
          });
        }
      };

      // 2. Create Case (Project)
      setSubmitStep("Creating Case...");
      const projRes = await createProject({
          internalCompanyId: parseInt(form.internalCompanyId),
          customerId: parseInt(form.customerId),
          projectName: form.projectName.trim(),
          date: form.date || null,
          deadline: form.deadline || null,
          priority: form.priority,
          projectManagerId: form.projectManagerId
            ? parseInt(form.projectManagerId)
            : null,
          description: form.description || null,
          contractId: form.contractId ? parseInt(form.contractId) : null,
          quotationId: activeQuotationId,
          caseCode: form.caseCode || null,
          status: "toDo",
          createdById: currentUser?.id || null,
          updatedById: currentUser?.id || null,
          assignees: form.lawyerIds.map((id) => ({ id: parseInt(id) })),
          ...projectPackageData,
      });

      const rawProjId = projRes?.data?.data?.id || projRes?.data?.id;
      const projectId = rawProjId ? parseInt(rawProjId) : null;
      const generatedCaseCode =
        projRes?.data?.data?.caseCode ||
        projRes?.data?.caseCode ||
        form.caseCode;
      if (!projectId)
        throw new Error("Could not retrieve projectId after creation");

      // Derive status
      const quotationStatus = String(
        selectedQuotation?.status || "",
      ).toLowerCase();
      const ORDER_STATUSES = [
        "order",
        "ordered",
        "won",
        "done",
        "approved",
        "accepted",
      ];
      const deriveStatus = (row) => {
        const billingMode =
          row.billingMode ||
          billingModeForContext({
            fromQuotation: !!row._fromQuotation,
            packageMode: activePackageMode,
            hasFinancialSource: activeFinancialSourceType !== SOURCE_NONE,
          });
        if (activeFinancialSourceType === SOURCE_CONTRACT) return "ordered";
        if (billingMode === BILLING_SCOPE || billingMode === BILLING_SEPARATE)
          return "pending_quote";
        if (ORDER_STATUSES.includes(quotationStatus)) return "ordered";
        return "pending_quote";
      };
      const createProjectService = async (data) => {
        try {
          return await ctx.api.request({
            url: "projectServices:create",
            method: "POST",
            data,
          });
        } catch (error) {
          const fallback = { ...data };
          delete fallback.pricingMode;
          delete fallback.billingMode;
          delete fallback.financialSourceType;
          delete fallback.contractId;
          delete fallback.contractServiceId;
          console.warn(
            "Retrying projectService without billing sync fields:",
            error,
          );
          return ctx.api.request({
            url: "projectServices:create",
            method: "POST",
            data: fallback,
          });
        }
      };

      // 3. Process services. Contract values win over quotation when both are linked.
      if (activeQuotationId && activeFinancialSourceType === SOURCE_QUOTATION) {
        setSubmitStep("Syncing quotation services...");
        const initialSnap = initialRowsRef.current || [];

        // 3a. Delete removed services (only for existing quotations)
        if (!activePackageMode) {
          for (const snap of initialSnap) {
            const stillExists = rows.some(
              (r) => String(r.serviceId) === String(snap.serviceId),
            );
            if (!stillExists && snap._qServiceId) {
              try {
                await ctx.api.request({
                  url: "quotationServices:destroy",
                  method: "POST",
                  params: { filterByTk: snap._qServiceId },
                });
              } catch (e) {
                console.warn("Could not delete quotationService:", e);
              }
            }
          }
        }

        // 3b. Update existing services or create new ones
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (!r.serviceName?.trim()) continue;

          let qSvcId = r._qServiceId;
          const rowBillingMode =
            r.billingMode ||
            billingModeForContext({
              fromQuotation: !!r._fromQuotation,
              packageMode: activePackageMode,
              hasFinancialSource: activeFinancialSourceType !== SOURCE_NONE,
            });
          const moneyEditable =
            rowBillingMode === BILLING_LINE || rowBillingMode === BILLING_SEPARATE;
          const rowFinancialSourceType =
            rowBillingMode === BILLING_SEPARATE
              ? SOURCE_MANUAL
              : rowBillingMode === BILLING_SCOPE
                ? SOURCE_NONE
                : activeFinancialSourceType;
          const rowPricingMode =
            rowBillingMode === BILLING_PACKAGE_INCLUDED
              ? PRICING_MODE_PACKAGE
              : moneyEditable
                ? PRICING_MODE_LINE
                : PRICING_MODE_SCOPE;
          const price = moneyEditable ? Number(r.basePrice) || 0 : 0;
          const vatPct = moneyEditable ? Number(r.vat) || 0 : 0;
          const amounts = calcLineAmounts(price, vatPct);
          const vatAmount = amounts.vatAmount;
          const totalAmount = amounts.totalAmount;
          const rowPackageFields = packageFieldsForRow(r);

          if (r._fromQuotation && qSvcId) {
            // Update existing
            const snap = initialSnap.find(
              (s) => String(s.serviceId) === String(r.serviceId),
            );
            if (
              activePackageMode ||
              (snap &&
                (price !== Number(snap.basePrice) || vatPct !== Number(snap.vat)))
            ) {
              try {
                await ctx.api.request({
                  url: "quotationServices:update",
                  method: "POST",
                  params: { filterByTk: qSvcId },
                  data: {
                    pricingMode: rowPricingMode,
                    basePrice: price,
                    quantity: 1,
                    vat: vatPct,
                    subTotal: amounts.subTotal,
                    vatAmount,
                    totalAmount,
                    ...rowPackageFields,
                  },
                });
              } catch (e) {
                console.warn("Could not update quotationService:", e);
              }
            }
          } else if (
            (!activePackageMode && rowBillingMode === BILLING_LINE) ||
            rowBillingMode === BILLING_PACKAGE_INCLUDED
          ) {
            // Create new quotationService
            try {
              const qSvcRes = await ctx.api.request({
                url: "quotationServices:create",
                method: "POST",
                data: {
                  quotationId: activeQuotationId,
                  serviceId: r.serviceId ? parseInt(r.serviceId) : null,
                  serviceName: r.serviceName.trim(),
                  serviceType: r.serviceType?.trim() || null,
                  description: r.description?.trim() || null,
                  basePrice: price,
                  quantity: 1,
                  vat: vatPct,
                  subTotal: amounts.subTotal,
                  vatAmount,
                  totalAmount,
                  pricingMode: rowPricingMode,
                  ...rowPackageFields,
                },
              });
              const rawQSvcId = qSvcRes?.data?.data?.id || qSvcRes?.data?.id;
              qSvcId = rawQSvcId ? parseInt(rawQSvcId) : null;
            } catch (e) {
              console.warn("Could not create quotationService:", e);
            }
          }

          // Create projectService and link it
          setSubmitStep(`Saving service ${i + 1}/${rows.length}...`);
          try {
            await createProjectService({
              projectId,
              quotationId:
                rowFinancialSourceType === SOURCE_QUOTATION
                  ? activeQuotationId
                  : null,
              contractId: form.contractId ? parseInt(form.contractId) : null,
              contractServiceId:
                rowFinancialSourceType === SOURCE_CONTRACT && r._contractServiceId
                  ? parseInt(r._contractServiceId)
                  : null,
              quotationServiceId:
                rowFinancialSourceType === SOURCE_QUOTATION ? qSvcId : null,
              serviceId: r.serviceId ? parseInt(r.serviceId) : null,
              serviceName: r.serviceName.trim(),
              serviceType: r.serviceType?.trim() || null,
              description: r.description?.trim() || null,
              quantity: 1,
              basePrice: price,
              vat: vatPct,
              subTotal: amounts.subTotal,
              vatAmount,
              totalAmount,
              pricingMode: rowPricingMode,
              ...rowPackageFields,
              billingMode: rowBillingMode,
              financialSourceType: rowFinancialSourceType,
              status: deriveStatus({ ...r, billingMode: rowBillingMode }),
            });
          } catch (e) {
            console.warn("Could not create projectService:", e);
          }
        }

        // 3c. Update total if not auto-created (since auto-created is already correct)
        if (!activePackageMode) {
          setSubmitStep("Updating quotation total...");
          const cq = quotations.find(
            (q) => String(q.id) === String(activeQuotationId),
          );
          if (cq) {
            const remainSubTotal = rows.reduce(
              (sum, r) => sum + (Number(r.basePrice) || 0),
              0,
            );
            const remainVatAmount = rows.reduce(
              (sum, r) =>
                sum +
                Math.round(
                  ((Number(r.basePrice) || 0) * (Number(r.vat) || 0)) / 100,
                ),
              0,
            );
            const remainTotal = remainSubTotal + remainVatAmount;
            await ctx.api.request({
              url: "quotations:update",
              method: "POST",
              params: { filterByTk: cq.id },
              data: {
                subTotal: remainSubTotal,
                vatAmount: remainVatAmount,
                totalAmount: remainTotal,
                customerId: cq.customerId
                  ? parseInt(cq.customerId)
                  : cq.customer?.id
                    ? parseInt(cq.customer.id)
                    : null,
                internalCompanyId: cq.internalCompanyId
                  ? parseInt(cq.internalCompanyId)
                  : null,
              },
            });
          }
        }
      } else {
        // No quotation active (e.g. rows.length === 0 but user creates case anyway)
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (!r.serviceName?.trim()) continue;
          const rowBillingMode =
            r.billingMode ||
            billingModeForContext({
              fromQuotation: false,
              packageMode: activePackageMode,
              hasFinancialSource: activeFinancialSourceType !== SOURCE_NONE,
            });
          const moneyEditable =
            rowBillingMode === BILLING_LINE || rowBillingMode === BILLING_SEPARATE;
          const rowFinancialSourceType =
            rowBillingMode === BILLING_SEPARATE
              ? SOURCE_MANUAL
              : rowBillingMode === BILLING_SCOPE
                ? SOURCE_NONE
                : activeFinancialSourceType;
          const rowPricingMode =
            rowBillingMode === BILLING_PACKAGE_INCLUDED
              ? PRICING_MODE_PACKAGE
              : moneyEditable
                ? PRICING_MODE_LINE
                : PRICING_MODE_SCOPE;
          const price = moneyEditable ? Number(r.basePrice) || 0 : 0;
          const vatPct = moneyEditable ? Number(r.vat) || 0 : 0;
          const amounts = calcLineAmounts(price, vatPct);
          const rowPackageFields = packageFieldsForRow(r);
          setSubmitStep(`Saving service ${i + 1}/${rows.length}...`);
          try {
            await createProjectService({
              projectId,
              contractId: form.contractId ? parseInt(form.contractId) : null,
              contractServiceId:
                rowFinancialSourceType === SOURCE_CONTRACT && r._contractServiceId
                  ? parseInt(r._contractServiceId)
                  : null,
              serviceId: r.serviceId ? parseInt(r.serviceId) : null,
              serviceName: r.serviceName.trim(),
              serviceType: r.serviceType?.trim() || null,
              description: r.description?.trim() || null,
              quantity: 1,
              basePrice: price,
              vat: vatPct,
              subTotal: amounts.subTotal,
              vatAmount: amounts.vatAmount,
              totalAmount: amounts.totalAmount,
              pricingMode: rowPricingMode,
              ...rowPackageFields,
              billingMode: rowBillingMode,
              financialSourceType: rowFinancialSourceType,
              status: deriveStatus({ ...r, billingMode: rowBillingMode }),
            });
          } catch (e) {
            console.warn("Could not create projectService:", e);
          }
        }
      }

      // 4. Auto-create folder hierarchy
      setSubmitStep("Creating folder structure...");
      try {
        let customerRootFolderId = null;
        if (form.customerId) {
          try {
            // 1. Tìm folder gốc của khách hàng (Nằm ở root, có customerId, KHÔNG có projectId)
            const cRes = await ctx.api.request({
              url: "folders:list",
              params: {
                filter: JSON.stringify({
                  customerId: parseInt(form.customerId),
                  projectId: null,
                  parentId: null,
                }),
                sort: ["createdAt"], // Lấy folder tạo đầu tiên
                pageSize: 1,
              },
            });

            let customerRoot = cRes?.data?.data?.[0];

            // 2. Nếu chưa có folder khách hàng, tạo mới ngay
            if (!customerRoot) {
              const customerName =
                customers.find((c) => String(c.id) === String(form.customerId))
                  ?.customerName || "Khách hàng";
              const newCFol = await ctx.api.request({
                url: "folders:create",
                method: "POST",
                data: {
                  name: customerName,
                  type: "customer",
                  moduleScope: CASE_DOCUMENT_SCOPE,
                  customerId: parseInt(form.customerId),
                  createdById: currentUser?.id || null,
                },
              });
              const rawCFol = newCFol?.data?.data || newCFol?.data;
              customerRoot = rawCFol;
            }

            if (customerRoot) {
              customerRootFolderId = customerRoot.id
                ? parseInt(customerRoot.id)
                : null;
            }
          } catch (e) {
            console.warn("Could not handle customer folder:", e);
          }
        }

        const parentFolderName = generatedCaseCode
          ? `${generatedCaseCode} - ${form.projectName.trim()}`
          : form.projectName.trim();

        const pFolderRes = await ctx.api.request({
          url: "folders:create",
          method: "POST",
          data: {
            name: parentFolderName,
            type: "cases",
            parentId: customerRootFolderId
              ? parseInt(customerRootFolderId)
              : null,
            projectId: projectId ? parseInt(projectId) : null,
            customerId: form.customerId ? parseInt(form.customerId) : null,
            moduleScope: CASE_DOCUMENT_SCOPE,
            createdById: currentUser?.id ? parseInt(currentUser.id) : null,
            updatedById: currentUser?.id ? parseInt(currentUser.id) : null,
          },
        });
        const rawPFolderId = pFolderRes?.data?.data?.id || pFolderRes?.data?.id;
        const pFolderId = rawPFolderId ? parseInt(rawPFolderId) : null;

        if (pFolderId) {
          // ── Chuẩn bị danh sách các folder con ──

          // 1. Các folder mặc định
          // 1. Thư mục mặc định luôn phải có
          const defaultChildren = [
            "Legal Study",
            "LSC & Related",
            "Legal docs",
            "Legal dossiers",
            "Report and Result",
          ];

          // 2. Case only creates the fixed template folders.
          const allChildNames = defaultChildren;

          const childPromises = allChildNames.map((cName, idx) => {
            const data = {
              name: cName,
              type: "cases",
              parentId: pFolderId ? parseInt(pFolderId) : null,
              projectId: projectId ? parseInt(projectId) : null,
              customerId: form.customerId ? parseInt(form.customerId) : null,
              moduleScope: CASE_DOCUMENT_SCOPE,
              createdById: currentUser?.id ? parseInt(currentUser.id) : null,
              updatedById: currentUser?.id ? parseInt(currentUser.id) : null,
            };

            return ctx.api.request({
              url: "folders:create",
              method: "POST",
              data: data,
            });
          });

          await Promise.all(childPromises);
        }
      } catch (err) {
        console.warn("Could not create folder structure:", err);
      }

      message.success("Case created successfully!");
      // setTimeout(() => {
      //   window.location.href = REDIRECT_URL;
      // }, 1200);
    } catch (e) {
      console.error("Submit error:", e);
      message.error("Error: " + (e?.message || "Please try again"));
    }

    setSubmitting(false);
    setSubmitStep("");
  };

  const filteredSvcOpts = useMemo(
    () =>
      form.internalCompanyId
        ? svcOpts.filter(
          (s) =>
            !s.internalCompanyId ||
            String(s.internalCompanyId) === String(form.internalCompanyId),
        )
        : svcOpts,
    [svcOpts, form.internalCompanyId],
  );

  if (loading)
    return React.createElement(
      "div",
      { style: { textAlign: "center", padding: 80 } },
      React.createElement(Spin, { size: "large" }),
    );

  const selStyle = { ...inp(), cursor: "pointer" };
  const getCustomerName = (c) =>
    c.customerName || c.name || c.fullName || `Customer #${c.id}`;
  const getCustomerSub = (c) =>
    [c.phone || c.phoneNumber, c.email].filter(Boolean).join(" · ");
  const getLawyerName = (l) =>
    l.lawyerName ||
    l.name ||
    [l.firstName, l.lastName].filter(Boolean).join(" ") ||
    `#${l.id}`;
  const getUserName = (u) =>
    u.nickname || u.name || u.username || u.email || `User #${u.id}`;
  const getContractLabel = (c) =>
    c.contractName || c.name || c.contractNumber || `Contract #${c.id}`;
  const getCustomerNameFromDoc = (doc) => {
    const cust =
      doc.customer ||
      customers.find((c) => String(c.id) === String(doc.customerId)) ||
      {};
    const type = doc.customerType || cust.customerType;
    if (type === "company") {
      return (
        doc.companyName ||
        cust.companyName ||
        doc.customerName ||
        cust.customerName ||
        cust.name ||
        ""
      );
    }
    return (
      cust.fullName || cust.name || doc.customerName || cust.customerName || ""
    );
  };

  const getContractSub = (c) => getCustomerNameFromDoc(c);

  const getQuotationLabel = (q) =>
    q.quotationName || q.quotationNumber || `Quotation #${q.id}`;

  const getQuotationSub = (q) => {
    const n = getCustomerNameFromDoc(q);
    const t = q.totalAmount
      ? Number(q.totalAmount).toLocaleString("vi-VN") + " ₫"
      : "";
    const mode = isPackagePricing(q) ? "Package pricing" : "Line pricing";
    return [mode, n, t].filter(Boolean).join(" · ");
  };

  const customerContracts = form.customerId
    ? contracts.filter(
      (c) =>
        String(c.customerId) === String(form.customerId) ||
        String(c.customer?.id) === String(form.customerId),
    )
    : contracts;

  const usedQuotationIds = new Set(
    projects.filter((p) => p.quotationId).map((p) => String(p.quotationId)),
  );

  const customerQuotations = form.customerId
    ? quotations.filter(
      (q) =>
        (String(q.customerId) === String(form.customerId) ||
          String(q.customer?.id) === String(form.customerId)) &&
        !usedQuotationIds.has(String(q.id)),
    )
    : quotations.filter((q) => !usedQuotationIds.has(String(q.id)));

  const renderRelatedToSection = () =>
    React.createElement(
      "section",
      {
        style: {
          marginBottom: 18,
          padding: "4px 0 18px",
          borderBottom: `1px solid ${C.border}`,
        },
      },
      React.createElement(CardHeader, {
        title: "Related To",
        subtitle: "customer and documents",
      }),
      React.createElement(
        "div",
        {
          style: {
            position: "relative",
            opacity: form.internalCompanyId ? 1 : 0.55,
            pointerEvents: form.internalCompanyId ? "auto" : "none",
          },
        },
        !form.internalCompanyId &&
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
            "Please select an Internal Company first",
          ),
        ),
        React.createElement(
          Field,
          {
            label: "Customer",
            required: true,
            mb: 16,
          },
          React.createElement(PersonDropdown, {
            items: customers,
            value: form.customerId,
            onChange: handleCustomerChange,
            placeholder: !form.internalCompanyId
              ? "Please select an Internal Company first"
              : "Search or select a customer",
            getItemName: getCustomerName,
            getItemSub: getCustomerSub,
            currentItem: currentCustomer,
            disabled: !form.internalCompanyId,
            onAddNew: () => openCreatePopup("customerCreate", refreshCustomers, { internalCompanyId: form.internalCompanyId }),
          }),
        ),
        form.customerId &&
        React.createElement(
          "div",
          {
            style: {
              padding: "9px 14px",
              background: "#f0f9ff",
              border: `1px solid #bae6fd`,
              borderRadius: 7,
              marginBottom: 14,
              fontSize: 12.5,
              color: "#0369a1",
              display: "flex",
              alignItems: "center",
              gap: 7,
            },
          },
          React.createElement(
            "span",
            null,
            `Showing ${customerContracts.length} contracts and ${customerQuotations.length} quotations for this customer. `,
            React.createElement(
              "span",
              {
                onClick: () => {
                  setForm((p) => ({
                    ...p,
                    contractId: null,
                    quotationId: null,
                    ...financialStateFromRecord(null, SOURCE_NONE),
                  }));
                  setRows([]);
                },
                style: {
                  color: C.danger,
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontWeight: 500,
                },
              },
              "Clear selection",
            ),
          ),
        ),
        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 0 },
          React.createElement(
            Field,
            { label: "Related Contract" },
            React.createElement(RelatedSingleDropdown, {
              items: customerContracts,
              value: form.contractId,
              onChange: handleContractChange,
              placeholder: !form.internalCompanyId ? "" : "Select contract",
              getItemLabel: getContractLabel,
              getItemSub: getContractSub,
              disabled: !form.internalCompanyId,
              onAddNew: () =>
                openCreatePopup("contractCreate", refreshContracts, {
                  customerId: form.customerId,
                  internalCompanyId: form.internalCompanyId,
                  lawyerId: form.lawyerIds?.[0] || form.projectManagerId,
                  quotationId: form.quotationId,
                  projectId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                  caseId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                }),
            }),
          ),
          React.createElement(
            Field,
            {
              label: "Related Quotation",
              hint: !form.internalCompanyId
                ? "please select internal company"
                : form.quotationId
                  ? "↓ changing will reload services"
                  : "select to load services into table",
            },
            React.createElement(RelatedSingleDropdown, {
              items: customerQuotations,
              value: form.quotationId,
              onChange: handleQuotationChange,
              placeholder: !form.internalCompanyId ? "" : "Select quotation",
              getItemLabel: getQuotationLabel,
              getItemSub: getQuotationSub,
              disabled: !form.internalCompanyId,
              onAddNew: () =>
                openCreatePopup("quotationCreate", refreshQuotations, {
                  customerId: form.customerId,
                  internalCompanyId: form.internalCompanyId,
                  lawyerId: form.lawyerIds?.[0] || form.projectManagerId,
                  projectId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                  caseId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                }),
            }),
          ),
        ),
      ),
    );

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: FONT,
        width: "100%",
        padding: "16px 0",
      },
    },

    React.createElement(
      Card,
      null,
      React.createElement(CardHeader, { title: "Case Information" }),
      React.createElement(
        "div",
        { style: { padding: "18px 20px" } },

        React.createElement(
          "div",
          {
            style: {
              marginBottom: 18,
              padding: "14px 16px",
              background: C.bgHighlight,
              borderRadius: 8,
              border: `1px solid ${C.borderHighlight}`,
            },
          },
          React.createElement(
            Field,
            { label: "Internal Company", required: true },
            React.createElement(
              "select",
              {
                value: form.internalCompanyId || "",
                onChange: (e) => {
                  setF("internalCompanyId", e.target.value || null);
                  if (form.contractId) {
                    loadServicesFromContract(form.contractId, false);
                  } else if (form.quotationId) {
                    loadServicesFromQuotation(form.quotationId, false);
                  } else {
                    setRows([]);
                  }
                },
                style: {
                  ...selStyle,
                  fontWeight: 600,
                  fontSize: 14,
                  borderColor: C.borderFocus,
                  borderWidth: 2,
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

        renderRelatedToSection(),

        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 16 },
          React.createElement(
            Field,
            { label: "Case Name", required: true },
            React.createElement("input", {
              value: form.projectName,
              onChange: (e) => setF("projectName", e.target.value),
              placeholder: "E.g. Real estate purchase contract consultation...",
              style: { ...inp(), fontSize: 14, fontWeight: 500 },
              onFocus,
              onBlur,
            }),
          ),
          React.createElement(
            Field,
            { label: "Case Code", hint: "optional" },
            React.createElement("input", {
              value: form.caseCode,
              onChange: (e) => setF("caseCode", e.target.value),
              placeholder: "E.g. CBI-2025-001",
              style: inp(),
              onFocus,
              onBlur,
            }),
          ),
        ),

        React.createElement(
          Grid,
          { cols: 3, gap: 16, mb: 16 },
          React.createElement(
            Field,
            { label: "Open Date & Time", required: true },
            React.createElement(DateTimePicker, {
              value: form.date,
              onChange: (v) => setF("date", v),
              placeholder: "Select open date & time",
            }),
          ),
          React.createElement(
            Field,
            { label: "Deadline", hint: "optional" },
            React.createElement(DateTimePicker, {
              value: form.deadline,
              onChange: (v) => setF("deadline", v),
              placeholder: "Select deadline date & time",
              minValue: form.date || undefined,
            }),
          ),
          React.createElement(
            Field,
            { label: "Priority", required: true },
            React.createElement(StarRating, {
              value: form.priority,
              onChange: (v) => setF("priority", v),
            }),
          ),
        ),

        (form.date || form.deadline) &&
        React.createElement(
          "div",
          {
            style: {
              marginBottom: 16,
              padding: "9px 14px",
              background: "#f8fafc",
              borderRadius: 7,
              border: `1px solid ${C.border}`,
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              fontSize: 12.5,
            },
          },
          form.date &&
          React.createElement(
            "span",
            { style: { color: C.textSub } },
            React.createElement(
              "span",
              { style: { fontWeight: 600, color: C.text } },
              "Open: ",
            ),
            fmtDateTime(form.date),
          ),
          form.deadline &&
          React.createElement(
            "span",
            { style: { color: C.textSub } },
            React.createElement(
              "span",
              { style: { fontWeight: 600, color: C.text } },
              "Deadline: ",
            ),
            fmtDateTime(form.deadline),
          ),
        ),

        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 16 },
          React.createElement(
            Field,
            { label: "Project Manager", hint: "optional" },
            React.createElement(PersonDropdown, {
              items: users,
              value: form.projectManagerId,
              onChange: (v) => setF("projectManagerId", v),
              placeholder: "— Select PM —",
              getItemName: getUserName,
            }),
          ),
          React.createElement(
            Field,
            { label: "Assigned Lawyers", hint: "optional — multiple" },
            React.createElement(MultiPersonDropdown, {
              items: lawyers,
              value: form.lawyerIds,
              onChange: (v) => setF("lawyerIds", v),
              placeholder: "— Select lawyers —",
              getItemName: getLawyerName,
            }),
          ),
        ),

        React.createElement(
          Field,
          { label: "Description", hint: "optional", mb: 0 },
          React.createElement(AutoTextarea, {
            value: form.description,
            onChange: (v) => setF("description", v),
            placeholder:
              "Summarize the content, requirements, scope of work...",
            minRows: 3,
          }),
        ),
      ),
    ),

    false &&
    React.createElement(
      Card,
      null,
      React.createElement(CardHeader, {
        title: "Related To",
        subtitle: "customer and documents",
      }),
      React.createElement(
        "div",
        {
          style: {
            padding: "18px 20px",
            position: "relative",
            opacity: form.internalCompanyId ? 1 : 0.55,
            pointerEvents: form.internalCompanyId ? "auto" : "none",
          },
        },
        !form.internalCompanyId &&
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
            "Please select an Internal Company first",
          ),
        ),
        React.createElement(
          Field,
          {
            label: "Customer",
            required: true,
            mb: 16,
          },
          React.createElement(PersonDropdown, {
            items: customers,
            value: form.customerId,
            onChange: handleCustomerChange,
            placeholder: !form.internalCompanyId
              ? "— Please select an Internal Company first —"
              : "— Search or select a customer —",
            getItemName: getCustomerName,
            getItemSub: getCustomerSub,
            currentItem: currentCustomer,
            disabled: !form.internalCompanyId,
          }),
        ),

        form.customerId &&
        React.createElement(
          "div",
          {
            style: {
              padding: "9px 14px",
              background: "#f0f9ff",
              border: `1px solid #bae6fd`,
              borderRadius: 7,
              marginBottom: 14,
              fontSize: 12.5,
              color: "#0369a1",
              display: "flex",
              alignItems: "center",
              gap: 7,
            },
          },
          React.createElement(
            "span",
            { style: { display: "inline-flex", color: "#0369a1" } },
            InfoIcon,
          ),
          React.createElement(
            "span",
            null,
            `Showing ${customerContracts.length} contracts and ${customerQuotations.length} quotations for this customer. `,
            React.createElement(
              "span",
              {
                onClick: () => {
                  setF("contractId", null);
                  setF("quotationId", null);
                },
                style: {
                  color: C.danger,
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontWeight: 500,
                },
              },
              "Clear selection",
            ),
          ),
        ),
        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 0 },
          React.createElement(
            Field,
            { label: "Related Contract" },
            React.createElement(RelatedSingleDropdown, {
              items: customerContracts,
              value: form.contractId,
              onChange: handleContractChange,
              placeholder: !form.internalCompanyId
                ? "—"
                : "— Select contract —",
              getItemLabel: getContractLabel,
              getItemSub: getContractSub,
              disabled: !form.internalCompanyId,
            }),
          ),
          React.createElement(
            Field,
            {
              label: "Related Quotation",
              hint: !form.internalCompanyId
                ? "please select internal company"
                : form.quotationId
                  ? "↓ changing will reload services"
                  : "select to load services into table",
            },
            React.createElement(RelatedSingleDropdown, {
              items: customerQuotations,
              value: form.quotationId,
              onChange: handleQuotationChange,
              placeholder: !form.internalCompanyId
                ? "—"
                : "— Select quotation —",
              getItemLabel: getQuotationLabel,
              getItemSub: getQuotationSub,
              disabled: !form.internalCompanyId,
            }),
          ),
        ),
      ),
    ),

    // Loading overlay for services
    React.createElement(
      Card,
      null,
      loadingServices &&
      React.createElement(
        "div",
        {
          style: {
            padding: "16px 20px",
            background: "#eff6ff",
            borderBottom: `1px solid #bfdbfe`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: "#1d4ed8",
            fontFamily: FONT,
          },
        },
        React.createElement(Spin, { size: "small" }),
        React.createElement(
          "span",
          null,
          "Loading services...",
        ),
      ),
      React.createElement(ProjectServicesTable, {
        rows,
        svcOpts: filteredSvcOpts,
        internalCompanyId: form.internalCompanyId,
        quotationId: form.quotationId,
        pricingMode: form.pricingMode,
        financialSourceType: form.financialSourceType,
        packageSummary: {
          subTotal: form.packageSubTotal,
          vatRate: form.packageVatRate,
          vatAmount: form.packageVatAmount,
          totalAmount: form.packageTotalAmount,
        },
        onUpdate: updateRow,
        onDelete: deleteRow,
        onAddFromService: addRowFromService,
        onPricingModeChange: handleServicePricingModeChange,
        onPackageChange: handlePackageSummaryChange,
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
            fontSize: 13.5,
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
            fontSize: 13.5,
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            background: submitting ? "#f3f4f6" : C.primary,
            color: submitting ? "#9ca3af" : "#fff",
            boxShadow: submitting ? "none" : "0 2px 10px rgba(37,99,235,0.3)",
            transition: "all 0.15s",
            fontFamily: FONT,
          },
        },
        submitting ? "Processing..." : "Create Case",
      ),
    ),
  );
};

ctx.render(React.createElement(ProjectCreateForm, null));
