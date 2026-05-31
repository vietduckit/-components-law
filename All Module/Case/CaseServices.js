const { useState, useEffect, useMemo } = ctx.React;
const { Table, Button, Modal, Form, Select, Input, InputNumber, message, Popconfirm, Tag, Tooltip, Spin } = ctx.antd;
const { React } = ctx;

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const C = {
  primary: "#1a3a5c",
  danger: "#e11d48",
  border: "#e5e7eb",
  text: "#1f2937",
  textSub: "#6b7280",
  bg: "#ffffff",
  bgSection: "#f8fafc",
};

const QUOTATION_POPUP_UID = "v44ehxkcghx";
const CONTRACT_POPUP_UID = "41125dcba6c";
const DETAIL_VIEW_ROUTES = {
  contract: `${window.location.origin}/admin/q85oddwnh62/view/nrk0suipqs8/filterbytk/132`,
  quotation: `${window.location.origin}/admin/rtjfpnq7aa6/view/mc4u7fov934/filterbytk/365244513058816`,
};
const QUOTE_LOCKED_STATUSES = ["sent", "order", "ordered", "won", "done", "cancelled", "approved", "accepted"];
const CONTRACT_ACTIVE_STATUSES = ["execution", "active", "signed"];
const TERMINAL_SERVICE_STATUSES = ["completed", "cancelled"];
const CASE_DOCUMENT_SCOPE = "case_document";
const AUTO_CREATE_SERVICE_FOLDERS = false;
const AUTO_CREATE_QUOTE_CONTRACT_FOLDERS = false;
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

const parseNum = (value) => {
  const n = parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fmtVND = (value) => `${parseNum(value).toLocaleString("vi-VN")} VND`;
const isPackagePricing = (recordOrMode) => {
  const mode = typeof recordOrMode === "object" ? recordOrMode?.pricingMode : recordOrMode;
  return String(mode || "").toLowerCase() === PRICING_MODE_PACKAGE;
};
const inferVatRate = (subTotal, vatAmount, fallback = 0) => {
  const sub = parseNum(subTotal);
  return sub ? Math.round((parseNum(vatAmount) * 10000) / sub) / 100 : parseNum(fallback);
};
const calcPackageTotals = (record = {}) => {
  const subTotal = parseNum(record.packageSubTotal ?? record.subTotal);
  const totalAmount = parseNum(record.packageTotalAmount ?? record.totalAmount ?? record.grandTotal);
  const vatAmount =
    parseNum(record.packageVatAmount ?? record.vatAmount) ||
    (totalAmount && subTotal ? Math.max(totalAmount - subTotal, 0) : 0);
  const vatRate = parseNum(record.packageVatRate ?? record.vatRate) || inferVatRate(subTotal, vatAmount, 0);
  return {
    subTotal,
    vatRate,
    vatAmount: vatAmount || Math.round((subTotal * vatRate) / 100),
    totalAmount: totalAmount || subTotal + (vatAmount || Math.round((subTotal * vatRate) / 100)),
  };
};
const COMMERCIAL_STATUS = {
  pending_quote: {
    color: "#1677ff",
    bg: "#e6f4ff",
    border: "#91caff",
    label: "Chưa có báo giá",
    description: "Dịch vụ đã được thêm vào case nhưng chưa có báo giá. Đội phụ trách vẫn có thể bắt đầu xử lý công việc.",
  },
  quote_draft: {
    color: "#0891b2",
    bg: "#ecfeff",
    border: "#67e8f9",
    label: "Báo giá đang soạn",
    description: "Báo giá đã được tạo nhưng chưa gửi hoặc chưa vào bước phê duyệt.",
  },
  quote_pending_approval: {
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#c4b5fd",
    label: "Báo giá chờ duyệt",
    description: "Báo giá đang chờ người có thẩm quyền duyệt trước khi gửi khách hàng.",
  },
  quote_sent: {
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#93c5fd",
    label: "Báo giá đã gửi",
    description: "Báo giá đã gửi cho khách hàng hoặc đã sẵn sàng chờ phản hồi.",
  },
  ordered: {
    color: "#d46b08",
    bg: "#fff7e6",
    border: "#ffd591",
    label: "Khách đồng ý báo giá",
    description: "Khách hàng đã đồng ý báo giá. Có thể tạo hợp đồng hoặc phụ lục hợp đồng.",
  },
  contracted: {
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#c4b5fd",
    label: "Đã có hợp đồng",
    description: "Dịch vụ đã có hợp đồng/phụ lục, đang chờ ký hoặc chưa chuyển sang trạng thái hiệu lực.",
  },
  contract_pending_signature: {
    color: "#be185d",
    bg: "#fdf2f8",
    border: "#f9a8d4",
    label: "Chờ ký hợp đồng",
    description: "Hợp đồng/phụ lục đã gửi hoặc đang ở bước ký.",
  },
  active: {
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
    label: "Hợp đồng hiệu lực",
    description: "Hợp đồng đã ký hoặc đang được thực hiện. Dịch vụ vẫn tiếp tục được theo dõi trong case như bình thường.",
  },
  completed: {
    color: "#595959",
    bg: "#f5f5f5",
    border: "#d9d9d9",
    label: "Hoàn tất",
    description: "Dịch vụ đã hoàn tất.",
  },
  cancelled: {
    color: "#cf1322",
    bg: "#fff1f0",
    border: "#ffa39e",
    label: "Đã hủy",
    description: "Dịch vụ hoặc báo giá liên quan đã bị hủy.",
  },
};

const SERVICE_ACTION_ICONS = {
  compare: [
    "M3 7h11",
    "M10 3l4 4-4 4",
    "M21 17H10",
    "M14 13l-4 4 4 4",
  ],
  quote: [
    "M6 2h12a2 2 0 0 1 2 2v18l-3-2-3 2-3-2-3 2-3-2-3 2V4a2 2 0 0 1 2-2Z",
    "M8 8h8",
    "M8 12h8",
    "M8 16h5",
  ],
  contract: [
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z",
    "M14 2v6h6",
    "M8 13h8",
    "M8 17h4",
    "M15 19l2 2 4-4",
  ],
  detail: [
    "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z",
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  ],
  signed: [
    "M20 6 9 17l-5-5",
    "M21 12a9 9 0 1 1-2.64-6.36",
  ],
  delete: [
    "M3 6h18",
    "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
    "M10 11v6",
    "M14 11v6",
  ],
};

const quoteStatusToServiceStatus = (status) => {
  const st = String(status || "").toLowerCase().trim();
  if (["cancelled", "canceled", "rejected", "lost"].includes(st)) return "cancelled";
  if (["order", "ordered", "accepted", "approved_by_customer", "won", "done"].includes(st)) return "ordered";
  if (["sent", "approved"].includes(st)) return "quote_sent";
  if (["pending_approval", "pending", "approval", "submitted", "review"].includes(st)) return "quote_pending_approval";
  return "quote_draft";
};

const contractStatusToServiceStatus = (status) => {
  const st = String(status || "").toLowerCase().trim();
  if (["cancelled", "canceled", "terminated", "rejected"].includes(st)) return "cancelled";
  if (["completed", "closed", "done"].includes(st)) return "completed";
  if (CONTRACT_ACTIVE_STATUSES.includes(st)) return "active";
  if (["sent", "pending_signature", "waiting_signature", "signature"].includes(st)) return "contract_pending_signature";
  return "contracted";
};

const SvgActionIcon = ({ name, color = "currentColor", size = 15 }) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
}, (SERVICE_ACTION_ICONS[name] || []).map((d, index) =>
  React.createElement("path", { key: `${name}-${index}`, d })
));

const ActionIconButton = ({ title, icon, onClick, disabled = false, danger = false, primary = false, color, tooltip = true, ...eventProps }) => {
  const actionColor = danger ? C.danger : (color || C.primary);
  const iconColor = primary ? "#fff" : actionColor;
  const { style: eventStyle, onClick: eventOnClick, ...restEventProps } = eventProps;
  const button = React.createElement(Button, {
    ...restEventProps,
    size: "small",
    shape: "circle",
    type: "default",
    icon: React.createElement(SvgActionIcon, { name: icon, color: iconColor }),
    onClick: onClick || eventOnClick,
    disabled,
    title,
    "aria-label": title,
    style: {
      width: 30,
      height: 30,
      minWidth: 30,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: primary ? actionColor : "#fff",
      borderColor: primary ? actionColor : (danger ? "#fecdd3" : "#d9d9d9"),
      color: iconColor,
      ...(eventStyle || {}),
    }
  });

  if (!tooltip) return button;

  return React.createElement(Tooltip, { title },
    React.createElement("span", { style: { display: "inline-flex" } }, button)
  );
};

// --- Editable Cell Component ---
const EditableCell = ({ value, onSave, isTextArea = false, isNumber = false, suffix = "", disabled = false }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? (isNumber ? 0 : ""));

  useEffect(() => { setVal(value ?? (isNumber ? 0 : "")); }, [value]);

  const isPercent = suffix === "%";

  if (editing && !disabled) {
    if (isTextArea) {
      return React.createElement(Input.TextArea, {
        autoFocus: true,
        value: val,
        onChange: (e) => setVal(e.target.value),
        onBlur: () => {
          setEditing(false);
          if (val !== (value || "")) onSave(val);
        },
        autoSize: { minRows: 1, maxRows: 4 }
      });
    }
    if (isNumber) {
      return React.createElement(InputNumber, {
        autoFocus: true,
        value: val,
        onChange: (v) => setVal(v),
        onBlur: () => {
          setEditing(false);
          if (val !== (value || 0)) onSave(val);
        },
        onPressEnter: () => {
          setEditing(false);
          if (val !== (value || 0)) onSave(val);
        },
        style: { width: "100%", minWidth: isPercent ? 80 : 120 },
        formatter: (v) => isPercent ? `${v}%` : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ',
        parser: (v) => isPercent ? v.replace('%', '') : v.replace(/\./g, '').replace(' đ', '').replace(/\s/g, ''),
      });
    }
    return React.createElement(Input, {
      autoFocus: true,
      value: val,
      onChange: (e) => setVal(e.target.value),
      onBlur: () => {
        setEditing(false);
        if (val !== (value || "")) onSave(val);
      },
      onPressEnter: () => {
        setEditing(false);
        if (val !== (value || "")) onSave(val);
      }
    });
  }

  const displayVal = isNumber 
    ? (val !== undefined && val !== null ? (isPercent ? `${val}%` : Number(val).toLocaleString("vi-VN") + " đ") : (isPercent ? "0%" : "0 đ")) 
    : val;

  return React.createElement("div", {
    style: { 
      cursor: disabled ? "not-allowed" : "text", 
      minHeight: 24, 
      display: "flex", 
      alignItems: "center",
      padding: "4px 8px",
      borderRadius: 4,
      transition: "background 0.2s",
      whiteSpace: isTextArea ? "pre-wrap" : "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      color: isNumber ? (isPercent ? "inherit" : "#b8860b") : "inherit",
      fontWeight: isNumber ? 500 : "normal"
    },
    onClick: () => { if (!disabled) setEditing(true); },
    onMouseEnter: (e) => { if (!disabled) e.currentTarget.style.background = "#f3f4f6"; },
    onMouseLeave: (e) => { if (!disabled) e.currentTarget.style.background = "transparent"; },
    title: disabled ? "Locked (Ordered)" : "Click to edit"
  }, displayVal || React.createElement("span", { style: { color: "#9ca3af", fontStyle: "italic" } }, "—"));
};

const CaseServices = () => {
  const currentId = ctx.record?.id;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [caseInfo, setCaseInfo] = useState(null);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  
  // Modals
  const [addModal, setAddModal] = useState(false);
  const [compareModal, setCompareModal] = useState({ open: false, data: null });
  const [guideModal, setGuideModal] = useState(false);
  
  const [form] = Form.useForm();
  const extractId = (val) => {
    const id = val && typeof val === 'object' ? val.id : val;
    return id ? parseInt(id) : null;
  };

  const compareFields = [
    { key: "serviceName", label: "Service Name", type: "text" },
    { key: "serviceType", label: "Service Type", type: "text" },
    { key: "description", label: "Description", type: "text" },
    { key: "basePrice", label: "Base Price", type: "money" },
    { key: "vat", label: "VAT (%)", type: "number" },
  ];

  const formatCompareValue = (value, type) => {
    if (type === "money") return `${Number(value) || 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " VND";
    const text = String(value ?? "").trim();
    return text || "-";
  };

  const normalizeCompareValue = (value, type) => {
    if (type === "money") return String(Number(value) || 0);
    return String(value ?? "")
      .normalize("NFC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const getCatalogService = (record) => {
    const serviceId = extractId(record?.serviceId) || extractId(record?.services);
    if (!serviceId) return record?.services || null;
    return serviceCatalog.find(s => String(s.id) === String(serviceId)) || record?.services || null;
  };

  const getCatalogValue = (catalog, field) => {
    if (!catalog) return "";
    if (field === "serviceName") return catalog.serviceName || catalog.name || "";
    if (field === "serviceType") return catalog.serviceType || catalog.type || "";
    if (field === "description") return catalog.description || "";
    if (field === "basePrice") return catalog.basePrice ?? catalog.unitPrice ?? catalog.price ?? 0;
    return catalog[field];
  };

  const getQuotedValue = (record, field) => {
    if (!record) return "";
    if (field === "serviceName") return record._quotedServiceName || record.serviceName || record.services?.serviceName || record.name || "";
    if (field === "serviceType") return record._quotedServiceType || record.serviceType || record.services?.serviceType || record.type || "";
    if (field === "description") return record._quotedDescription || record.description || "";
    if (field === "basePrice") return record._quotedBasePrice ?? record.basePrice ?? 0;
    return record[field];
  };

  const hasAmountValue = (value) => value !== undefined && value !== null && value !== "";

  const getRowBillingMode = (record) =>
    String(record?.billingMode || "").trim();

  const getRowPricingMode = (record) =>
    String(record?.pricingMode || "").toLowerCase().trim();

  const isPackageServiceRow = (record) =>
    getRowBillingMode(record) === BILLING_PACKAGE_INCLUDED ||
    getRowPricingMode(record) === PRICING_MODE_PACKAGE;

  const isScopeOnlyServiceRow = (record) =>
    getRowBillingMode(record) === BILLING_SCOPE ||
    getRowPricingMode(record) === PRICING_MODE_SCOPE;

  const isMoneyEditableServiceRow = (record) =>
    !isPackageServiceRow(record) && !isScopeOnlyServiceRow(record);

  const getRowSubTotal = (record) => {
    if (isPackageServiceRow(record) || isScopeOnlyServiceRow(record)) return 0;
    const directSubTotal = record?.subTotal ?? record?._quotedSubTotal;
    if (hasAmountValue(directSubTotal)) return Number(directSubTotal) || 0;
    const quantity = Number(record?.quantity ?? record?._quotedQuantity ?? 1) || 1;
    const basePrice = Number(record?.basePrice ?? record?._quotedBasePrice ?? 0) || 0;
    return basePrice * quantity;
  };

  const getRowVatAmount = (record) => {
    if (isPackageServiceRow(record) || isScopeOnlyServiceRow(record)) return 0;
    const directVatAmount = record?.vatAmount ?? record?._quotedVatAmount;
    if (hasAmountValue(directVatAmount)) return Number(directVatAmount) || 0;

    const subTotal = getRowSubTotal(record);
    const vat = Number(record?.vat ?? record?._quotedVat ?? 0) || 0;

    return subTotal * vat / 100;
  };

  const getRowTotalAmount = (record) => {
    if (isPackageServiceRow(record) || isScopeOnlyServiceRow(record)) return 0;
    const directTotal = record?.totalAmount ?? record?._quotedTotalAmount;
    if (hasAmountValue(directTotal)) return Number(directTotal) || 0;
    return getRowSubTotal(record) + getRowVatAmount(record);
  };

  const getComparisonRows = (record) => {
    const catalog = getCatalogService(record);
    return compareFields.map(field => {
      const original = getCatalogValue(catalog, field.key);
      const quoted = getQuotedValue(record, field.key);
      return {
        key: field.key,
        field: field.label,
        type: field.type,
        original,
        quoted,
        catalogMissing: !catalog,
        changed: !!catalog && normalizeCompareValue(original, field.type) !== normalizeCompareValue(quoted, field.type),
      };
    });
  };

  const getQuoteSourceLabel = (record) => {
    if (!record?._quotationId && !record?._isMainQuote) return "Chưa có báo giá";
    const mainQuoteTitle = caseInfo?._mainQuote?.title || "Main Quotation";
    if (record?._isMainQuote) return mainQuoteTitle;
    if (record?._qCode) return `Sub-Quotation #${record._qCode}`;
    return record?._qTitle || `Sub-Quotation #${record?._quotationId || "..."}`;
  };

  const getRouteInput = () => {
    const inputArgs = ctx.view?.inputArgs || {};
    return {
      ...(inputArgs || {}),
      ...(inputArgs.params || {}),
      ...(ctx.action?.params || {}),
      ...(ctx.modal?.params || {}),
      ...(ctx.view?.params || {}),
      ...(ctx.popup?.params || {}),
      ...(ctx.params || {}),
    };
  };

  const getDetailRouteTemplate = (kind) => {
    const routeInput = getRouteInput();
    const keyPrefix = kind === "contract" ? "contract" : "quotation";
    return (
      routeInput[`${keyPrefix}DetailUrl`] ||
      routeInput[`${keyPrefix}DetailRoute`] ||
      routeInput[`${keyPrefix}ViewUrl`] ||
      routeInput[`${keyPrefix}ViewRoute`] ||
      DETAIL_VIEW_ROUTES[kind] ||
      ""
    );
  };

  const parseDetailRouteTemplate = (routeTemplate) => {
    const raw = String(routeTemplate || "").trim();
    if (!raw) return null;

    const normalized = /^https?:\/\//i.test(raw) || raw.startsWith("/")
      ? raw
      : `/${raw}`;

    let url;
    try {
      url = new URL(normalized, window.location.origin);
    } catch (error) {
      console.warn("[CaseServices] Invalid detail route template", routeTemplate, error);
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    const findLastSegment = (name) => {
      for (let index = segments.length - 1; index >= 0; index -= 1) {
        if (String(segments[index]).toLowerCase() === name) return index;
      }
      return -1;
    };
    const findSegmentAfter = (name, fromIndex) => {
      for (let index = Math.max(0, fromIndex); index < segments.length; index += 1) {
        if (String(segments[index]).toLowerCase() === name) return index;
      }
      return -1;
    };

    const adminIndex = findLastSegment("admin");
    const viewIndex = findLastSegment("view");
    const filterIndexAfterView = viewIndex >= 0 ? findSegmentAfter("filterbytk", viewIndex + 2) : -1;
    const filterIndex = filterIndexAfterView >= 0 ? filterIndexAfterView : findLastSegment("filterbytk");

    return {
      origin: url.origin,
      adminSegment: adminIndex >= 0 ? segments[adminIndex] : "admin",
      adminAppId: adminIndex >= 0 ? segments[adminIndex + 1] : null,
      viewSegment: viewIndex >= 0 ? segments[viewIndex] : "view",
      viewUid: viewIndex >= 0 ? segments[viewIndex + 1] : null,
      filterSegment: filterIndex >= 0 ? segments[filterIndex] : "filterbytk",
      sampleRecordId: filterIndex >= 0 ? segments[filterIndex + 1] : null,
      filterIndex,
      segments,
    };
  };

  const buildDetailRoute = (kind, recordId) => {
    const parsed = parseDetailRouteTemplate(getDetailRouteTemplate(kind));
    if (!parsed) return null;

    const safeRecordId = String(recordId);
    const nextSegments = [...parsed.segments];
    if (parsed.filterIndex >= 0) {
      nextSegments[parsed.filterIndex] = parsed.filterSegment || "filterbytk";
      if (nextSegments[parsed.filterIndex + 1]) {
        nextSegments[parsed.filterIndex + 1] = safeRecordId;
      } else {
        nextSegments.splice(parsed.filterIndex + 1, 0, safeRecordId);
      }
    } else {
      nextSegments.push("filterbytk", safeRecordId);
    }

    const pathname = `/${nextSegments.join("/")}`;
    return {
      ...parsed,
      recordId: safeRecordId,
      pathname,
      url: `${parsed.origin}${pathname}`,
      uid: parsed.viewUid,
    };
  };

  const getRowQuotationId = (record) =>
    extractId(record?._quotationId) ||
    extractId(record?.quotationId) ||
    extractId(record?.quotations);

  const getRowContractId = (record) =>
    extractId(record?._contractId) ||
    extractId(record?.contractId) ||
    extractId(record?.contracts) ||
    extractId(record?._contractService?.contractId) ||
    extractId(record?._contractService?.contracts);

  const openRecordDetail = async (kind, recordId, title) => {
    const safeRecordId = extractId(recordId);
    if (!safeRecordId) {
      message.warning(kind === "contract" ? "Không tìm thấy hợp đồng liên quan." : "Không tìm thấy báo giá liên quan.");
      return;
    }

    const detailRoute = buildDetailRoute(kind, safeRecordId);
    if (!detailRoute?.uid) {
      message.warning(kind === "contract" ? "Chưa cấu hình view chi tiết hợp đồng." : "Chưa cấu hình view chi tiết báo giá.");
      return;
    }

    const collectionName = kind === "contract" ? "contracts" : "quotations";
    const popupTitle = ctx.t ? ctx.t(title) : title;
    const openViewOptions = {
      mode: "dialog",
      title: popupTitle,
      size: "large",
      navigation: false,
      filterByTk: safeRecordId,
      sourceId: safeRecordId,
      collectionName,
      pathname: detailRoute.pathname,
      linkedUrl: detailRoute.url,
      params: {
        filterByTk: safeRecordId,
        id: safeRecordId,
        collectionName,
        pathname: detailRoute.pathname,
        linkedUrl: detailRoute.url,
      },
    };

    try {
      if (typeof ctx.openView === "function") {
        await ctx.openView(detailRoute.uid, openViewOptions);
        return;
      }

      window.open(detailRoute.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("[CaseServices] Could not open record detail", error);
      window.open(detailRoute.url, "_blank", "noopener,noreferrer");
    }
  };

  const openManualPopup = async (uid, title, params = {}) => {
    if (typeof ctx.openView !== "function") {
      message.error("Không tìm thấy ctx.openView để mở popup.");
      return;
    }

    const popupTitle = ctx.t ? ctx.t(title) : title;
    const projectServiceId = extractId(params.projectServiceId);
    const projectId = extractId(params.projectId) || extractId(params.caseId) || extractId(currentId);
    const topLevelContext = projectServiceId
      ? {
          filterByTk: projectId,
          sourceId: projectServiceId,
          collectionName: "projects",
          projectServiceId,
          quotationId: extractId(params.quotationId),
          quotationServiceId: extractId(params.quotationServiceId),
          projectId,
          caseId: projectId,
        }
      : {};
    console.log("[CaseServices] Opening NocoBase popup", uid, popupTitle, params);
    await new Promise((resolve) => setTimeout(resolve, 180));
    await ctx.openView(uid, {
      mode: "dialog",
      title: popupTitle,
      size: "large",
      navigation: false,
      ...topLevelContext,
      params,
    });
  };

  const getContractPopupParams = (record) => {
    const parentContractId = extractId(caseInfo?.contractId);
    const isMainContract = !parentContractId;
    const quotationId = extractId(record?._quotationId) || extractId(record?.quotationId);
    const quotationServiceId = extractId(record?._qServiceId) || extractId(record?.quotationServiceId);
    const basePrice = Number(record?._quotedBasePrice ?? record?.basePrice) || 0;
    const quantity = Number(record?._quotedQuantity ?? record?.quantity ?? 1) || 1;
    const vat = Number(record?._quotedVat ?? record?.vat ?? 0) || 0;
    const subTotal = Number(record?._quotedSubTotal ?? record?.subTotal ?? basePrice * quantity) || 0;
    const vatAmount = Number(record?._quotedVatAmount ?? record?.vatAmount ?? (subTotal * vat / 100)) || 0;
    const totalAmount = Number(record?._quotedTotalAmount ?? record?.totalAmount ?? (subTotal + vatAmount)) || 0;
    return {
      contractMode: isMainContract ? "main" : "appendix",
      contractKind: isMainContract ? "main" : "appendix",
      codePrefix: isMainContract ? "CT" : "PL",
      isMainContract,
      quotationId,
      quotationServiceId,
      projectId: parseInt(currentId, 10),
      caseId: parseInt(currentId, 10),
      parentId: parentContractId,
      projectServiceId: extractId(record?.id),
      serviceId: extractId(record?.serviceId) || extractId(record?.services),
      serviceName: record?._quotedServiceName || record?.serviceName || record?.services?.serviceName || record?.name || null,
      serviceType: record?._quotedServiceType || record?.serviceType || record?.services?.serviceType || record?.type || null,
      description: record?._quotedDescription || record?.description || record?.services?.description || null,
      basePrice,
      quantity,
      vat,
      subTotal,
      vatAmount,
      totalAmount,
      customerId: extractId(caseInfo?.customerId) || extractId(caseInfo?.customer) || extractId(caseInfo?.customers),
      internalCompanyId: extractId(caseInfo?.internalCompanyId) || extractId(caseInfo?.internalCompany),
      lawyerId: extractId(caseInfo?.lawyerId) || extractId(caseInfo?.lawyer),
    };
  };

  const getQuotationPopupParams = (record = {}) => {
    const serviceId = extractId(record?.serviceId) || extractId(record?.services);
    const projectServiceId = extractId(record?.id);
    const parentQuotationId = extractId(caseInfo?.quotationId);
    const quotationKind = parentQuotationId ? "supplement" : "main";
    return {
      quotationMode: quotationKind === "supplement" ? "sub" : "main",
      quotationKind,
      parentId: parentQuotationId,
      parentQuotationId,
      mainQuotationId: parentQuotationId,
      projectId: parseInt(currentId, 10),
      caseId: parseInt(currentId, 10),
      projectServiceId,
      serviceId,
      serviceName: record?.serviceName || record?.services?.serviceName || record?.name || null,
      serviceType: record?.serviceType || record?.services?.serviceType || record?.type || null,
      description: record?.description || record?.services?.description || null,
      basePrice: Number(record?.basePrice) || 0,
      customerId: extractId(caseInfo?.customerId) || extractId(caseInfo?.customer) || extractId(caseInfo?.customers),
      internalCompanyId: extractId(caseInfo?.internalCompanyId) || extractId(caseInfo?.internalCompany),
      lawyerId: extractId(caseInfo?.lawyerId) || extractId(caseInfo?.lawyer),
    };
  };

  // Sync total amounts for both Sub-Quotation and Sub-Contract
  const syncQuoteAndContractTotals = async (quotationId, subTotalDiff, totalAmountDiff = subTotalDiff) => {
    if (!quotationId || (subTotalDiff === 0 && totalAmountDiff === 0)) return;
    
    // 1. Sync Quotation
    const qRes = await ctx.api.request({
      url: "quotations:get",
      params: { filterByTk: quotationId }
    });
    const currentQ = qRes?.data?.data || qRes?.data || {};
    const newQSubTotal = Math.max(0, (Number(currentQ.subTotal) || 0) + subTotalDiff);
    const newQTotal = Math.max(0, (Number(currentQ.totalAmount) || 0) + totalAmountDiff);
    
    await ctx.api.request({
      url: "quotations:update",
      method: "POST",
      params: { filterByTk: quotationId },
      data: { 
        subTotal: newQSubTotal, 
        totalAmount: newQTotal,
        customerId: extractId(currentQ.customerId),
        internalCompanyId: extractId(currentQ.internalCompanyId)
      }
    });

    // 2. Sync Contract
    try {
      const cRes = await ctx.api.request({
        url: "contracts:list",
        params: {
          filter: JSON.stringify({ quotationId: { $eq: parseInt(quotationId) } }),
          pageSize: 1
        }
      });
      const contract = cRes?.data?.data?.[0];
      if (contract) {
        const newCSubTotal = Math.max(0, (Number(contract.subTotal) || 0) + subTotalDiff);
        const newCTotal = Math.max(0, (Number(contract.totalAmount) || 0) + totalAmountDiff);
        
        await ctx.api.request({
          url: "contracts:update",
          method: "POST",
          params: { filterByTk: contract.id },
          data: { 
            subTotal: newCSubTotal, 
            totalAmount: newCTotal,
            customerId: extractId(contract.customerId) || extractId(currentQ.customerId),
            internalCompanyId: extractId(contract.internalCompanyId) || extractId(currentQ.internalCompanyId)
          }
        });
      }
    } catch (e) {
      console.error("Error syncing contract totals", e);
    }
  };

  const loadData = async () => {
    if (!currentId) return;
    setLoading(true);
    try {
      const [svcRes, caseRes] = await Promise.all([
        ctx.api.request({
          url: "projectServices:list",
          params: {
            filter: JSON.stringify({ projectId: { $eq: parseInt(currentId) } }),
            pageSize: 500,
            sort: ["createdAt"],
            appends: ["services"],
          },
        }),
        ctx.api.request({
          url: "projects:get",
          params: { filterByTk: currentId },
        })
      ]);

      const info = caseRes?.data?.data || caseRes?.data || {};
      setCaseInfo(info);

      let qSvcsMap = {};
      let allContracts = [];
      let allContractServices = [];
      try {
        const contractsRes = await ctx.api.request({
          url: "contracts:list",
          params: {
            filter: JSON.stringify({ cases: { id: { $eq: parseInt(currentId) } } }),
            pageSize: 500
          }
        });
        allContracts = contractsRes?.data?.data || [];
      } catch (e) {
        console.error("Error fetching contracts", e);
      }
      try {
        const contractServicesRes = await ctx.api.request({
          url: "contractServices:list",
          params: {
            filter: JSON.stringify({ projectId: { $eq: parseInt(currentId) } }),
            pageSize: 1000,
            sort: ["-createdAt"],
            appends: ["contracts", "projectServices", "quotationServices"],
          }
        });
        allContractServices = contractServicesRes?.data?.data || [];
      } catch (e) {
        console.error("Error fetching contract services", e);
      }
      const mainContractId = extractId(info.contractId) || extractId(info.contract);
      if (mainContractId) {
        info._mainContract =
          allContracts.find(c => String(extractId(c.id)) === String(mainContractId)) ||
          allContractServices.find(cs => String(extractId(cs.contractId) || extractId(cs.contracts)) === String(mainContractId))?.contracts ||
          null;
        if (!info._mainContract) {
          try {
            const contractRes = await ctx.api.request({
              url: "contracts:get",
              params: { filterByTk: mainContractId },
            });
            info._mainContract = contractRes?.data?.data || contractRes?.data || null;
          } catch (e) {
            console.warn("Could not fetch main contract for service pricing mode", e);
          }
        }
      }

      if (info.quotationId) {
        // 1. Fetch main quotation
        const mainQuoteRes = await ctx.api.request({
          url: "quotations:get",
          params: { filterByTk: info.quotationId }
        });
        const mainQuote = mainQuoteRes?.data?.data || mainQuoteRes?.data || {};
        info._mainQuote = mainQuote;

        // 2. Fetch sub-quotations
        const subQuotesRes = await ctx.api.request({
          url: "quotations:list",
          params: {
            filter: JSON.stringify({ parentId: { $eq: extractId(info.quotationId) } }),
            pageSize: 100
          }
        });
        const subQuotes = subQuotesRes?.data?.data || [];
        info._subQuotes = subQuotes;

        const mainQuoteId = extractId(info.quotationId);
        const allQuoteIds = [mainQuoteId, ...subQuotes.map(q => q.id)].filter(Boolean);

        // 3. Fetch all quotationServices for main and sub
        const qSvcsRes = await ctx.api.request({
          url: "quotationServices:list",
          params: { 
            filter: JSON.stringify({ quotationId: { $in: allQuoteIds } }), 
            pageSize: 500 
          }
        });
        const qSvcArr = qSvcsRes?.data?.data || [];
        // Build map: quotationServiceId -> enriched record
        // Also build by (quotationId, serviceId) for matching
        qSvcArr.forEach(qs => {
           const qId = extractId(qs.quotationId) || qs.quotationId;
           const sId = extractId(qs.serviceId) || qs.serviceId || qs.serviceName || "";
           const key = `${qId}_${sId}`;
           qSvcsMap[key] = {
             ...qs,
             _isMainQuote: qId === extractId(info.quotationId),
             _quotationId: qId
           };
           // Also index by id for direct lookup
           qSvcsMap[`id_${qs.id}`] = qSvcsMap[key];
        });
      }

      const pServices = svcRes?.data?.data || [];
      const enrichedServices = [];

      for (const ps of pServices) {
         // Primary: match by quotationServiceId stored on projectService (most reliable)
         const psQSvcId = extractId(ps.quotationServiceId) || ps.quotationServiceId;
         let qSvc = psQSvcId ? qSvcsMap[`id_${psQSvcId}`] : null;

         // Secondary: match by (quotationId, serviceId/serviceName)
         if (!qSvc) {
           const psQId = extractId(ps.quotationId) || ps.quotationId;
           const psSId = extractId(ps.serviceId) || ps.serviceId || ps.serviceName || "";
           if (psQId && psSId) {
             const key = `${psQId}_${psSId}`;
             qSvc = qSvcsMap[key];
           }
         }

         // Tertiary: if still not found, search only by serviceId within the SAME quotation scope
         if (!qSvc) {
           const psSId = extractId(ps.serviceId);
           if (psSId) {
             qSvc = Object.values(qSvcsMap).find(qs =>
               qs.id && // skip index aliases
               extractId(qs.serviceId) === psSId
             );
           }
         }
         
         let qStatus = null;
         let qTitle = null;
         let qCode = null;
         const storedStatus = String(ps.status || "").toLowerCase().trim();
         let effectiveStatus = TERMINAL_SERVICE_STATUSES.includes(storedStatus) ? storedStatus : "pending_quote";
         let contractIdToSave = null;
         const psContractId = extractId(ps.contractId) || extractId(ps.contract);
         const projectServiceContractLine = allContractServices.find(cs => {
           const linkedServiceId = extractId(cs.projectServiceId) || extractId(cs.projectServices);
           return linkedServiceId && String(linkedServiceId) === String(ps.id);
         });
         const contractLineContractId =
           extractId(projectServiceContractLine?.contractId) ||
           extractId(projectServiceContractLine?.contracts);
         const projectServiceContractFromLine =
           projectServiceContractLine?.contracts && typeof projectServiceContractLine.contracts === "object"
             ? projectServiceContractLine.contracts
             : allContracts.find(c => String(c.id) === String(contractLineContractId));
         const projectServiceContract = projectServiceContractFromLine || allContracts.find(c => {
           const linkedServiceId = extractId(c.projectServiceId) || extractId(c.projectService) || extractId(c.projectServices);
           return (psContractId && String(c.id) === String(psContractId)) ||
             (linkedServiceId && String(linkedServiceId) === String(ps.id));
         });
         
         if (qSvc && !qSvc._isMainQuote) {
            const sq = (info._subQuotes || []).find(q => q.id === qSvc.quotationId);
            if (sq) {
                qStatus = String(sq.status || "").toLowerCase().trim();
                qTitle = sq.title;
                qCode = sq.quotationNumber || sq.quotationCode || sq.code;
                const quoteServiceStatus = qStatus === "new" && sq.isRequiredApproval
                  ? "quote_pending_approval"
                  : quoteStatusToServiceStatus(qStatus);
                
                if (qStatus === "cancelled") {
                    effectiveStatus = "cancelled";
                } else if (!TERMINAL_SERVICE_STATUSES.includes(storedStatus)) {
                    effectiveStatus = quoteServiceStatus;
                    // Fetch contract trực tiếp cho quotation này
                    const contractRes = await ctx.api.request({
                      url: "contracts:list",
                      params: {
                        filter: JSON.stringify({ quotationId: { $eq: sq.id } }),
                        pageSize: 1
                      }
                    });
                    const linkedContract = contractRes?.data?.data?.[0];

                    if (!linkedContract) {
                        effectiveStatus = quoteServiceStatus;
                    } else {
                        contractIdToSave = linkedContract.id;
                        const cStatus = String(linkedContract.status || "").toLowerCase().trim();
                        effectiveStatus = contractStatusToServiceStatus(cStatus);
                    }
                }
            } else if (!TERMINAL_SERVICE_STATUSES.includes(storedStatus)) {
                effectiveStatus = "quote_draft";
            }
         } else if (qSvc && qSvc._isMainQuote) {
            // Fetch contract trực tiếp cho main quotation
            const contractRes = await ctx.api.request({
              url: "contracts:list",
              params: {
                filter: JSON.stringify({ quotationId: { $eq: extractId(info.quotationId) } }),
                pageSize: 1
              }
            });
            const mainContract = contractRes?.data?.data?.[0];

            if (mainContract) {
                contractIdToSave = mainContract.id;
                const mcStatus = String(mainContract.status || "").toLowerCase().trim();
                effectiveStatus = contractStatusToServiceStatus(mcStatus);
            } else if (!TERMINAL_SERVICE_STATUSES.includes(storedStatus)) {
                const mqStatus = String(info._mainQuote?.status || "").toLowerCase().trim();
                effectiveStatus = mqStatus === "new" && info._mainQuote?.isRequiredApproval
                  ? "quote_pending_approval"
                  : quoteStatusToServiceStatus(mqStatus); 
            }
         } else if ((extractId(ps.quotationId) || psQSvcId) && !TERMINAL_SERVICE_STATUSES.includes(storedStatus)) {
            effectiveStatus = ["quote_draft", "quote_pending_approval", "quote_sent", "ordered"].includes(storedStatus)
              ? storedStatus
              : "quote_draft";
         }

         if (projectServiceContract && !contractIdToSave) {
            contractIdToSave = projectServiceContract.id || contractLineContractId;
            if (!TERMINAL_SERVICE_STATUSES.includes(storedStatus)) {
              const pcStatus = String(projectServiceContract.status || projectServiceContractLine?.lineStatus || "").toLowerCase().trim();
              effectiveStatus = projectServiceContract.status
                ? contractStatusToServiceStatus(pcStatus)
                : (projectServiceContractLine?.lineStatus || "contracted");
            }
         } else if (projectServiceContractLine && !TERMINAL_SERVICE_STATUSES.includes(storedStatus)) {
            contractIdToSave = contractLineContractId;
            effectiveStatus = projectServiceContractLine.lineStatus || "contracted";
         }

         const rowQuotationSource = qSvc?._isMainQuote
           ? info._mainQuote
           : (qSvc ? (info._subQuotes || []).find(q => String(q.id) === String(qSvc._quotationId || qSvc.quotationId)) : null);
         const explicitPricingMode =
           ps.pricingMode ||
           projectServiceContractLine?.pricingMode ||
           qSvc?.pricingMode ||
           "";
         const explicitBillingMode =
           ps.billingMode ||
           projectServiceContractLine?.billingMode ||
           qSvc?.billingMode ||
           "";
         const inferredPackageFromSource =
           !explicitPricingMode &&
           !explicitBillingMode &&
           (
             isPackagePricing(projectServiceContract) ||
             isPackagePricing(rowQuotationSource) ||
             isPackagePricing(info)
           );
         const rowIsPackage =
           explicitBillingMode === BILLING_PACKAGE_INCLUDED ||
           isPackagePricing(explicitPricingMode) ||
           !!parseNum(ps.packageSubTotal ?? projectServiceContractLine?.packageSubTotal ?? qSvc?.packageSubTotal) ||
           !!parseNum(ps.packageTotalAmount ?? projectServiceContractLine?.packageTotalAmount ?? qSvc?.packageTotalAmount) ||
           inferredPackageFromSource;

         enrichedServices.push({
           ...ps,
           status: effectiveStatus,
           _contractId: contractIdToSave || extractId(ps.contractId) || null,
           _contractServiceId: extractId(projectServiceContractLine?.id) || null,
           _contractService: projectServiceContractLine || null,
           pricingMode: explicitPricingMode || (rowIsPackage ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE),
           billingMode: explicitBillingMode || (rowIsPackage ? BILLING_PACKAGE_INCLUDED : BILLING_LINE),
           financialSourceType:
             ps.financialSourceType ||
             projectServiceContractLine?.financialSourceType ||
             qSvc?.financialSourceType ||
             (projectServiceContractLine ? SOURCE_CONTRACT : qSvc ? SOURCE_QUOTATION : SOURCE_MANUAL),
           basePrice: ps.basePrice ?? qSvc?.basePrice ?? 0,
           packageSubTotal:
             ps.packageSubTotal ??
             projectServiceContractLine?.packageSubTotal ??
             qSvc?.packageSubTotal ??
             null,
           packageVatRate:
             ps.packageVatRate ??
             projectServiceContractLine?.packageVatRate ??
             qSvc?.packageVatRate ??
             null,
           packageVatAmount:
             ps.packageVatAmount ??
             projectServiceContractLine?.packageVatAmount ??
             qSvc?.packageVatAmount ??
             null,
           packageTotalAmount:
             ps.packageTotalAmount ??
             projectServiceContractLine?.packageTotalAmount ??
             qSvc?.packageTotalAmount ??
             null,
           _quotedServiceName: qSvc?.serviceName,
           _quotedServiceType: qSvc?.serviceType,
           _quotedDescription: qSvc?.description,
           _quotedBasePrice: qSvc?.basePrice ?? ps.basePrice,
           _quotedQuantity: qSvc?.quantity,
           _quotedVat: qSvc?.vat,
           _quotedSubTotal: qSvc?.subTotal ?? ps.basePrice,
           _quotedVatAmount: qSvc?.vatAmount,
           _quotedTotalAmount: qSvc?.totalAmount ?? ps.basePrice,
           _qServiceId: qSvc?.id || psQSvcId || null,
           _isMainQuote: qSvc?._isMainQuote,
           _quotationId: qSvc?._quotationId || extractId(ps.quotationId) || null,
           _qStatus: qStatus,
           _qTitle: qTitle,
           _qCode: qCode
         });
      }
      // 3d. Ensure service folders exist. Status is calculated for display only.
      if (AUTO_CREATE_SERVICE_FOLDERS) try {
        // Lấy toàn bộ folder của project này một lần duy nhất để kiểm tra cho nhanh
        const allFoldersRes = await ctx.api.request({
          url: "folders:list",
          params: {
            filter: JSON.stringify({ projectId: { $eq: parseInt(currentId) } }),
            pageSize: 1000
          }
        });
        const allFolders = allFoldersRes?.data?.data || [];
        
        // Tìm folder gốc của Vụ việc (là folder có projectId nhưng không phải Báo giá/Hợp đồng)
        const parentCaseFolder = allFolders.find(f => 
          !f.parentId || // Nếu folder root của project
          (!f.quotationId && !f.contractId && !f.projectServiceId && f.parentId)
        ) || allFolders.find(f => f.projectId && !f.quotationId && !f.contractId);

        if (parentCaseFolder) {
          for (const ps of enrichedServices) {
            // Status is derived for display only. Do not write it back while loading rows.
            if (!TERMINAL_SERVICE_STATUSES.includes(String(ps.status || "").toLowerCase().trim())) {
              const sName = ps.serviceName || ps.services?.serviceName || "Dịch vụ mới";
              // Kiểm tra xem folder đã tồn tại chưa (dựa vào projectServiceId hoặc tên trong cùng thư mục cha)
              const hasFolder = allFolders.some(f => 
                (f.projectServiceId && parseInt(f.projectServiceId) === parseInt(ps.id)) ||
                (parseInt(f.parentId) === parseInt(parentCaseFolder.id) && f.name === sName)
              );

              if (!hasFolder) {
                // Tính STT tiếp theo dựa trên những gì đang có trong memory
                const currentChildren = allFolders.filter(f => parseInt(f.parentId) === parseInt(parentCaseFolder.id));
                const maxIdx = currentChildren.reduce((max, f) => Math.max(max, parseInt(f.folderIndex) || 0), 0);
                const nextIdx = maxIdx + 1;

                try {
                  const newFolderRes = await ctx.api.request({
                    url: "folders:create",
                    method: "POST",
                    data: {
                      name: sName,
                      parentId: parseInt(parentCaseFolder.id),
                      projectId: parseInt(currentId),
                      customerId: extractId(info.customerId),
                      moduleScope: CASE_DOCUMENT_SCOPE,
                      projectServiceId: parseInt(ps.id), 
                      folderIndex: nextIdx,
                      createdById: info.createdById ? extractId(info.createdById) : null
                    }
                  });
                  // Cập nhật vào danh sách memory để các vòng lặp sau không tạo trùng và tính đúng STT
                  if (newFolderRes?.data?.data) allFolders.push(newFolderRes.data.data);
                } catch (err) {
                  console.warn("Auto-create folder failed for service:", sName, err);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error in folder synchronization:", e);
      }

      setCaseInfo({ ...info });
      setServices(enrichedServices);

      try {
        const catRes = await ctx.api.request({
          url: "services:list",
          params: {
            pageSize: 500,
          },
        });
        const allSvcs = catRes?.data?.data || [];
        const internalCompanyId = extractId(info.internalCompanyId) || info.internalCompanyId;
        const filteredSvcs = info.internalCompanyId
          ? allSvcs.filter(
            (s) =>
              !s.internalCompanyId ||
              String(extractId(s.internalCompanyId) || s.internalCompanyId) === String(internalCompanyId)
          )
          : allSvcs;
        setServiceCatalog(filteredSvcs);
      } catch (catalogErr) {
        console.warn("Could not fetch service catalog for comparison", catalogErr);
        setServiceCatalog([]);
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentId]);

  const handleServiceChange = (svcId) => {
    const selected = serviceCatalog.find(s => String(s.id) === String(svcId));
    if (selected) {
      const sName = selected.serviceName || selected.name || "";
      const sType = selected.serviceType || selected.type || "";
      
      form.setFieldsValue({
        serviceName: sName,
        serviceType: sType,
        description: selected.description || "",
        basePrice: selected.basePrice || 0,
        vat: selected.vat || 0,
      });
    }
  };

  const handleInlineEdit = async (record, field, newValue) => {
    try {
      // if (record._isMainQuote) {
      //   message.warning("Dịch vụ thuộc Báo giá gốc không thể chỉnh sửa.");
      //   return;
      // }
      if (record._qStatus && QUOTE_LOCKED_STATUSES.includes(record._qStatus)) {
        message.warning(`Không thể chỉnh sửa dịch vụ vì Báo giá bổ sung đang ở trạng thái: ${record._qStatus}`);
        return;
      }

      if (field === "serviceName" && newValue) {
        const checkName = newValue.toLowerCase().trim();
        const isDuplicate = services.some(s => 
          s.id !== record.id && 
          (s.serviceName || s.services?.serviceName || s.name || "").toLowerCase().trim() === checkName
        );
        if (isDuplicate) {
          message.error("Tên dịch vụ này đã tồn tại trong Case!");
          return;
        }
      }

      if (field === "basePrice" || field === "vat") {
        if (!isMoneyEditableServiceRow(record)) {
          message.warning("Dá»‹ch vá»¥ nÃ y Ä‘Æ°á»£c tÃ­nh trong gÃ³i, khÃ´ng chá»‰nh Ä‘Æ°á»£c Ä‘Æ¡n giÃ¡ theo dÃ²ng.");
          return;
        }
        const isVat = field === "vat";
        const newPrice = isVat ? (Number(record.basePrice) || 0) : (Number(newValue) || 0);
        const newVat = isVat ? (Number(newValue) || 0) : (Number(record.vat) || 0);
        const oldPrice = Number(record.basePrice) || 0;
        const oldVat = Number(record.vat) || 0;

        if (!record._qServiceId || !record._quotationId) {
          await ctx.api.request({
            url: "projectServices:update",
            method: "POST",
            params: { filterByTk: record.id },
            data: { [field]: Number(newValue) || 0 }
          });
          message.success("Service updated");
          loadData();
          return;
        }

        const subTotalDiff = newPrice - oldPrice;
        
        const newSubTotal = newPrice;
        const newVatAmount = newSubTotal * newVat / 100;
        const newTotalAmount = newSubTotal + newVatAmount;
        
        const oldSubTotal = Number(record._quotedSubTotal ?? record.basePrice) || 0;
        const oldVatAmount = Number(record._quotedVatAmount ?? record.vatAmount) || (oldSubTotal * oldVat / 100);
        const oldTotalAmount = oldSubTotal + oldVatAmount;
        
        const totalAmountDiff = newTotalAmount - oldTotalAmount;

        // Update quotationService
        await ctx.api.request({
          url: "quotationServices:update",
          method: "POST",
          params: { filterByTk: record._qServiceId },
          data: { basePrice: newPrice, vat: newVat, subTotal: newSubTotal, vatAmount: newVatAmount, totalAmount: newTotalAmount }
        });
        
        // Update projectServices as well to keep in sync
        await ctx.api.request({
          url: "projectServices:update",
          method: "POST",
          params: { filterByTk: record.id },
          data: { basePrice: newPrice, vat: newVat }
        });

        // Update both quotation and contract totals
        await syncQuoteAndContractTotals(record._quotationId, subTotalDiff, totalAmountDiff);
        
        message.success("Updated successfully");
        loadData();
        return;
      }

      // Update projectServices directly
      await ctx.api.request({
        url: "projectServices:update",
        method: "POST",
        params: { filterByTk: record.id },
        data: {
          [field]: newValue
        }
      });

      // Update Quotation Service if applicable
      if (record._qServiceId) {
        await ctx.api.request({
          url: "quotationServices:update",
          method: "POST",
          params: { filterByTk: record._qServiceId },
          data: {
            [field]: newValue
          }
        });
      }
      
      message.success("Updated successfully");
      loadData();
    } catch (err) {
      console.error(err);
      message.error("Failed to update field");
    }
  };

  const handleAddSubmit = async (values) => {
    if (!currentId) return;
    setSubmitting(true);
    try {
      const checkName = (values.serviceName || "").toLowerCase().trim();
      const isDuplicate = services.some(s => 
        (s.serviceName || s.services?.serviceName || s.name || "").toLowerCase().trim() === checkName
      );
      if (isDuplicate) {
        message.error("Dịch vụ này đã tồn tại trong Case. Vui lòng chọn hoặc nhập tên khác!");
        setSubmitting(false);
        return;
      }

      // 1. Create projectServices
      const addAsPackage = servicePricingSummary.isPackageMode;
      const price = addAsPackage ? 0 : Number(values.basePrice) || 0;
      const vat = addAsPackage ? 0 : Number(values.vat) || 0;
      const subTotal = price;
      const vatAmount = Math.round((subTotal * vat) / 100);
      const packageTotals = addAsPackage
        ? servicePricingSummary.packageTotals
        : { subTotal: 0, vatRate: 0, vatAmount: 0, totalAmount: 0 };
      const createData = {
          projectId: parseInt(currentId),
          serviceId: values.serviceId ? parseInt(values.serviceId) : null,
          serviceName: values.serviceName?.trim(),
          serviceType: values.serviceType?.trim(),
          description: values.description?.trim(),
          status: "pending_quote",
          basePrice: price,
          vat,
          subTotal,
          vatAmount,
          totalAmount: subTotal + vatAmount,
          pricingMode: addAsPackage ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
          packageSubTotal: packageTotals.subTotal,
          packageVatRate: packageTotals.vatRate,
          packageVatAmount: packageTotals.vatAmount,
          packageTotalAmount: packageTotals.totalAmount,
          billingMode: addAsPackage ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
          financialSourceType: addAsPackage
            ? (caseInfo?._mainContract ? SOURCE_CONTRACT : caseInfo?._mainQuote ? SOURCE_QUOTATION : SOURCE_MANUAL)
            : SOURCE_MANUAL,
        };
      let psRes;
      try {
        psRes = await ctx.api.request({
          url: "projectServices:create",
          method: "POST",
          data: createData,
        });
      } catch (createError) {
        const fallback = { ...createData };
        delete fallback.pricingMode;
        delete fallback.billingMode;
        delete fallback.financialSourceType;
        console.warn("Retrying projectService create without pricing sync fields:", createError);
        psRes = await ctx.api.request({
          url: "projectServices:create",
          method: "POST",
          data: fallback,
        });
      }
      const psId = psRes?.data?.data?.id || psRes?.data?.id;

      message.success("Dịch vụ đã được lưu. Có thể bổ sung báo giá hoặc hợp đồng sau.");
      setAddModal(false);
      form.resetFields();
      loadData();
      return;

      // 2. Sync with Sub-Quotation if applicable
      const rawQuoteId = caseInfo?.quotationId;
      const quoteId = rawQuoteId && typeof rawQuoteId === 'object' ? rawQuoteId.id : rawQuoteId;
      
      if (quoteId) {
        const price = Number(values.basePrice) || 0;
        const vat = Number(values.vat) || 0;
        const subTotal = price;
        const vatAmount = subTotal * vat / 100;
        const totalAmount = subTotal + vatAmount;

        const subQuotes = caseInfo._subQuotes || [];
        const mainQuote = caseInfo._mainQuote || {};
        
        // Find an existing editable sub-quotation (must have parentId to be a true sub-quotation)
        const draftSubQuote = subQuotes.find(q => {
          const st = String(q.status || "").toLowerCase().trim();
          const hasParent = !!(q.parentId || q.parent_id);
          return hasParent && !QUOTE_LOCKED_STATUSES.includes(st);
        });
        let targetSubQuoteId = null;
        let isNewSubQuote = false;
        if (draftSubQuote) {
          targetSubQuoteId = draftSubQuote.id;
        } else {
          isNewSubQuote = true;
          
          const now = new Date();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const yyyy = now.getFullYear();
          const indexStr = String(subQuotes.length + 1).padStart(2, '0');
          const plCode = `PL${indexStr}${mm}${yyyy}`;
          const titleSuffix = `Báo giá bổ sung ${subQuotes.length + 1}`;

          // Use Nocobase relationship endpoint to create child under parent
          const newQuoteRes = await ctx.api.request({
            url: `quotations/${quoteId}/children:create`,
            method: "POST",
            data: {
              status: "new",
              title: titleSuffix,
              quotationNumber: plCode,
              customerId: extractId(mainQuote.customerId),
              internalCompanyId: extractId(mainQuote.internalCompanyId),
              lawyerId: currentLawyerId || extractId(mainQuote.lawyerId),
              templateId: extractId(mainQuote.templateId),
              leadId: extractId(mainQuote.leadId),
              isRequiredApproval: mainQuote.isRequiredApproval || false,
              approvedById: extractId(mainQuote.approvedById),
              description: mainQuote.description || null,
              snapshotIntroText: mainQuote.snapshotIntroText || null,
              snapshotServicesScopeNote: mainQuote.snapshotServicesScopeNote || null,
              snapshotVatNote: mainQuote.snapshotVatNote || null,
              snapshotClosingText: mainQuote.snapshotClosingText || null,
              snapshotTermsAndConditions: mainQuote.snapshotTermsAndConditions || null,
              snapshotOverview: mainQuote.snapshotOverview || null,
              paymentTerms: mainQuote.paymentTerms || null,
              address: mainQuote.address || null,
              subTotal: subTotal,
              totalAmount: totalAmount,
            }
          });
          targetSubQuoteId = newQuoteRes?.data?.data?.id || newQuoteRes?.data?.id;
        }

        if (targetSubQuoteId) {
          // Link projectService to this sub-quotation
          if (psId) {
            await ctx.api.request({
              url: "projectServices:update",
              method: "POST",
              params: { filterByTk: psId },
              data: { quotationId: parseInt(targetSubQuoteId) }
            });
          }

          const qSvcRes = await ctx.api.request({
            url: "quotationServices:create",
            method: "POST",
            data: {
              quotationId: parseInt(targetSubQuoteId),
              serviceId: values.serviceId ? parseInt(values.serviceId) : null,
              serviceName: values.serviceName?.trim(),
              serviceType: values.serviceType?.trim() || null,
              description: values.description?.trim() || null,
              basePrice: price,
              quantity: 1,
              vat: vat,
              subTotal: subTotal,
              vatAmount: vatAmount,
              totalAmount: totalAmount,
            },
          });
          const qSvcId = qSvcRes?.data?.data?.id || qSvcRes?.data?.id;

          // Save quotationServiceId on projectService for reliable future lookup
          if (psId && qSvcId) {
            await ctx.api.request({
              url: "projectServices:update",
              method: "POST",
              params: { filterByTk: psId },
              data: { quotationServiceId: qSvcId }
            });
          }

          // Update quotation totals if using existing sub-quote
          if (!isNewSubQuote) {
            await syncQuoteAndContractTotals(targetSubQuoteId, subTotal, totalAmount);
          }

          // 3. Tự động tạo Folder cho Báo giá bổ sung (Lồng vào Folder Báo giá gốc)
          if (AUTO_CREATE_QUOTE_CONTRACT_FOLDERS) try {
            const allFoldersRes = await ctx.api.request({
              url: "folders:list",
              params: { filter: JSON.stringify({ projectId: { $eq: parseInt(currentId) } }), pageSize: 1000 }
            });
            const allFolders = allFoldersRes?.data?.data || [];
            
            // Tìm Folder của Báo giá gốc
            const mainQuoteFolder = allFolders.find(f => extractId(f.quotationId) === extractId(quoteId));
            // Nếu không thấy, tìm folder gốc của Case
            const parentFolder = mainQuoteFolder || allFolders.find(f => 
              !f.parentId || (!f.quotationId && !f.contractId && !f.projectServiceId && f.parentId)
            ) || allFolders.find(f => f.projectId && !f.quotationId && !f.contractId);

            if (parentFolder) {
              const folderTitle = `Báo giá bổ sung ${subQuotes.length + 1}`;
              const currentChildren = allFolders.filter(f => extractId(f.parentId) === extractId(parentFolder.id));
              const maxIdx = currentChildren.reduce((max, f) => Math.max(max, parseInt(f.folderIndex) || 0), 0);
              
              await ctx.api.request({
                url: "folders:create",
                method: "POST",
                data: {
                  name: folderTitle,
                  parentId: extractId(parentFolder.id),
                  projectId: parseInt(currentId),
                  customerId: extractId(mainQuote.customerId),
                  moduleScope: CASE_DOCUMENT_SCOPE,
                  quotationId: parseInt(targetSubQuoteId),
                  folderIndex: maxIdx + 1,
                  createdById: user?.id || null
                }
              });
            }
          } catch (folderErr) {
            console.warn("Could not auto-create sub-quotation folder:", folderErr);
          }
        }
      }
      message.success("Service added successfully");
      setAddModal(false);
      form.resetFields();
      loadData();
    } catch (err) {
      console.error(err);
      message.error("Error: " + (err.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    setLoading(true);
    try {
      if (record._isMainQuote) {
        message.warning("Dịch vụ thuộc Báo giá gốc không thể xoá.");
        setLoading(false);
        return;
      }
      if (record._qStatus && QUOTE_LOCKED_STATUSES.includes(record._qStatus)) {
        message.warning(`Không thể xoá dịch vụ vì Báo giá bổ sung đang ở trạng thái: ${record._qStatus}`);
        setLoading(false);
        return;
      }

      // 1. Find and delete quotationService if applicable
      if (record._qServiceId && record._quotationId) {
        const targetQsRes = await ctx.api.request({
          url: "quotationServices:get",
          params: { filterByTk: record._qServiceId }
        });
        const targetQs = targetQsRes?.data?.data || targetQsRes?.data;
        
        if (targetQs) {
          const priceToSubtract = Number(targetQs.subTotal) || 0;
          
          await ctx.api.request({
            url: "quotationServices:destroy",
            method: "POST",
            params: { filterByTk: record._qServiceId }
          });

          // Update both quotation and contract totals
          await syncQuoteAndContractTotals(record._quotationId, -priceToSubtract);
        }
      }

      // 2. Delete projectService
      await ctx.api.request({
        url: "projectServices:destroy",
        method: "POST",
        params: { filterByTk: record.id }
      });

      message.success("Service deleted");
      loadData();
    } catch (err) {
      console.error(err);
      message.error("Error deleting service: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubContract = async (record) => {
    try {
      await openManualPopup(
        CONTRACT_POPUP_UID,
        record?._isMainQuote ? "Create Contract" : "Create Sub-Contract",
        getContractPopupParams(record)
      );
      return;

      const qId = record._quotationId;
      if (!qId) {
        message.error("Không tìm thấy Quotation ID liên quan.");
        return;
      }
      
      const isMain = record._isMainQuote;
      let parentContractId = null;
      let contractTitle = "";
      
      const thisQuotRes = await ctx.api.request({ url: "quotations:get", params: { filterByTk: qId } });
      const thisQuot = thisQuotRes?.data?.data || thisQuotRes?.data || {};

      setLoading(true);

      // --- Lấy thông tin Luật sư hiện tại bằng cách query trực tiếp ---
      let currentLawyerId = null;
      try {
        const authRes = await ctx.api.request({ url: "auth:check", method: "GET" });
        const user = authRes?.data?.data || authRes?.data || null;
        if (user?.id) {
          const lRes = await ctx.api.request({
            url: "lawyers:list",
            params: {
              filter: JSON.stringify({
                userId: user.id
              }),
              pageSize: 1
            }
          });
          const lawyer = lRes?.data?.data?.[0];
          if (lawyer) currentLawyerId = lawyer.id;
        }
      } catch (err) {
        console.warn("Could not fetch current lawyer via filter", err);
      }
      // ---------------------------------------
      // ---------------------------------------

      if (isMain) {
        contractTitle = `Contract for ${caseInfo.projectName || "Case"}`;
      } else {
        const contractId = caseInfo.contractId && typeof caseInfo.contractId === 'object' ? caseInfo.contractId.id : caseInfo.contractId;
        if (!contractId) {
          message.error("Vụ việc này chưa có hợp đồng gốc để tạo phụ lục.");
          setLoading(false);
          return;
        }
        parentContractId = contractId;
        const mainContractRes = await ctx.api.request({ 
          url: "contracts:get", 
          params: { 
            filterByTk: contractId,
            appends: ["cases", "internalCompany", "customers"]
          } 
        });
        const mainContract = mainContractRes?.data?.data || mainContractRes?.data || {};
        const contractCode = mainContract.contractCode || mainContract.contractNumber || mainContract.code || contractId;
        contractTitle = `Sub-Contract of #${contractCode}`;

        // Lấy danh sách ID của các cases đã liên kết với hợp đồng chính để clone
        const existingCaseIds = (mainContract.cases || []).map(c => extractId(c)).filter(Boolean);
        if (existingCaseIds.length === 0) existingCaseIds.push(parseInt(currentId));
        
        // Đếm số lượng phụ lục của Hợp đồng chính này để tính Index chính xác
        let subContractIndex = 1;
        try {
          const scListRes = await ctx.api.request({
            url: "contracts:list",
            params: {
              filter: JSON.stringify({ parentId: { $eq: parseInt(parentContractId) } }),
              pageSize: 1
            }
          });
          subContractIndex = (scListRes?.data?.meta?.count || 0) + 1;
        } catch (e) {
          console.warn("Could not fetch sub-contracts count", e);
        }

        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const indexStr = String(subContractIndex).padStart(2, '0');
        const plCode = `PL${indexStr}${mm}${yyyy}`;

        const createData = {
          // Chỉ lấy các trường dữ liệu cần thiết từ mainContract
          customerId: extractId(mainContract.customerId),
          internalCompany: extractId(mainContract.internalCompany),
          lawyerId: currentLawyerId || extractId(mainContract.lawyerId),
          templateId: extractId(mainContract.templateId) || extractId(mainContract.template),
          paymentTerms: mainContract.paymentTerms,
          contractType: mainContract.contractType,
          currency: mainContract.currency,
          
          // Thông tin mới của Phụ lục
          contractCode: plCode,
          contractNumber: plCode,
          code: plCode,
          quotations: parseInt(qId),
          issuedDate: new Date().toISOString(),
          title: contractTitle,
          contractName: contractTitle,
          status: 'draft',
          subTotal,
          vatAmount,
          totalAmount,
        };

        const newContractRes = await ctx.api.request({
          url: `contracts/${parentContractId}/children:create`,
          method: "POST",
          data: createData
        });
        const newContractId = newContractRes?.data?.data?.id || newContractRes?.data?.id;

        if (newContractId && qId) {
          await ctx.api.request({
            url: "quotations:update",
            method: "POST",
            params: { filterByTk: qId },
            data: { contractId: newContractId }
          });

          // --- Tự động tạo Folder cho Phụ lục (Lồng vào Folder Hợp đồng gốc) ---
          if (AUTO_CREATE_QUOTE_CONTRACT_FOLDERS) try {
            const allFoldersRes = await ctx.api.request({
              url: "folders:list",
              params: { filter: JSON.stringify({ projectId: { $eq: parseInt(currentId) } }), pageSize: 1000 }
            });
            const allFolders = allFoldersRes?.data?.data || [];
            
            // Tìm Folder của Hợp đồng gốc
            const mainContractFolder = allFolders.find(f => extractId(f.contractId) === extractId(parentContractId));
            // Nếu không thấy, tìm folder gốc của Case
            const parentFolder = mainContractFolder || allFolders.find(f => 
              !f.parentId || (!f.quotationId && !f.contractId && !f.projectServiceId && f.parentId)
            ) || allFolders.find(f => f.projectId && !f.quotationId && !f.contractId);

            if (parentFolder) {
              const currentChildren = allFolders.filter(f => extractId(f.parentId) === extractId(parentFolder.id));
              const maxIdx = currentChildren.reduce((max, f) => Math.max(max, parseInt(f.folderIndex) || 0), 0);
              
              await ctx.api.request({
                url: "folders:create",
                method: "POST",
                data: {
                  name: contractTitle,
                  parentId: extractId(parentFolder.id),
                  projectId: parseInt(currentId),
                  customerId: extractId(mainContract.customerId),
                  moduleScope: CASE_DOCUMENT_SCOPE,
                  contractId: parseInt(newContractId),
                  folderIndex: maxIdx + 1,
                  createdById: user?.id || null
                }
              });
            }
          } catch (folderErr) {
            console.warn("Could not auto-create sub-contract folder:", folderErr);
          }
        }
        
        // Contract creation no longer forces the service status here.

        message.success("📝 Đã tạo Phụ lục hợp đồng thành công!");
        loadData();
        setLoading(false);
        return; // Kết thúc sớm vì đã xử lý xong logic Sub-Contract
      }

      // Logic cho Hợp đồng chính (chỉ chạy nếu isMain = true)
      const createData = {
        quotations: parseInt(qId),
        cases: [parseInt(currentId)],
        customerId: extractId(thisQuot.customerId),
        internalCompany: extractId(thisQuot.internalCompanyId),
        lawyerId: currentLawyerId || extractId(thisQuot.lawyerId),
        issuedDate: new Date().toISOString(),
        title: contractTitle,
        contractName: contractTitle,
        status: 'draft',
        subTotal,
        vatAmount,
        totalAmount,
      };

      const newContractRes = await ctx.api.request({
        url: "contracts:create",
        method: "POST",
        data: createData
      });
      
      const newContractId = newContractRes?.data?.data?.id || newContractRes?.data?.id;

      if (newContractId && qId) {
        // Explicitly link the quotation (main or sub) to this newly created contract
        await ctx.api.request({
          url: "quotations:update",
          method: "POST",
          params: { filterByTk: qId },
          data: { contractId: newContractId }
        });
      }

      if (isMain && newContractId) {
        // 1. Update Project link
        await ctx.api.request({
          url: "projects:update",
          method: "POST",
          params: { filterByTk: currentId },
          data: { contractId: newContractId }
        });
        setCaseInfo(prev => ({ ...prev, contractId: newContractId }));

        // 2. Tự động tạo Folder cho Hợp đồng chính
        if (AUTO_CREATE_QUOTE_CONTRACT_FOLDERS) try {
          // Lấy thông tin đầy đủ của Hợp đồng vừa tạo để có Code
          const fullContractRes = await ctx.api.request({
            url: "contracts:get",
            params: { filterByTk: newContractId }
          });
          const fullContract = fullContractRes?.data?.data || fullContractRes?.data;
          const cCode = fullContract?.contractCode || fullContract?.contractNumber || fullContract?.code || "";
          const folderName = `Hợp đồng ${cCode}`.trim();

          // Tìm Folder gốc của Case
          const allFoldersRes = await ctx.api.request({
            url: "folders:list",
            params: { filter: JSON.stringify({ projectId: { $eq: parseInt(currentId) } }), pageSize: 500 }
          });
          const allFolders = allFoldersRes?.data?.data || [];
          const parentCaseFolder = allFolders.find(f => 
            !f.parentId || (!f.quotationId && !f.contractId && !f.projectServiceId && f.parentId)
          ) || allFolders.find(f => f.projectId && !f.quotationId && !f.contractId);

          if (parentCaseFolder) {
            const currentChildren = allFolders.filter(f => parseInt(f.parentId) === parseInt(parentCaseFolder.id));
            const maxIdx = currentChildren.reduce((max, f) => Math.max(max, parseInt(f.folderIndex) || 0), 0);
            
            await ctx.api.request({
              url: "folders:create",
              method: "POST",
              data: {
                name: folderName,
                parentId: parseInt(parentCaseFolder.id),
                projectId: parseInt(currentId),
                customerId: extractId(thisQuot.customerId),
                moduleScope: CASE_DOCUMENT_SCOPE,
                contractId: parseInt(newContractId),
                folderIndex: maxIdx + 1,
                createdById: user?.id || null
              }
            });
          }
        } catch (folderErr) {
          console.warn("Could not auto-create main contract folder:", folderErr);
        }
      }

      // Contract creation no longer forces the service status here.

      message.success(isMain ? "📝 Đã tạo Hợp đồng gốc thành công!" : "📝 Đã tạo Phụ lục hợp đồng thành công!");
      loadData();
    } catch (err) {
      console.error(err);
      message.error("Lỗi tạo hợp đồng: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const servicePricingSummary = useMemo(() => {
    const packageRows = services.filter(isPackageServiceRow);
    const billableRows = services.filter(isMoneyEditableServiceRow);
    const scopeRows = services.filter(isScopeOnlyServiceRow);
    const packageRowSource = packageRows.find(
      (record) => parseNum(record.packageSubTotal) || parseNum(record.packageTotalAmount),
    );
    const packageSource = [packageRowSource, caseInfo, caseInfo?._mainContract, caseInfo?._mainQuote]
      .filter(Boolean)
      .find((record) => isPackagePricing(record));
    const isPackageMode = !!packageRows.length || !!packageSource;
    const packageTotals = packageSource
      ? calcPackageTotals(packageSource)
      : { subTotal: 0, vatRate: 0, vatAmount: 0, totalAmount: 0 };
    const lineTotals = billableRows.reduce(
      (sum, row) => ({
        subTotal: sum.subTotal + getRowSubTotal(row),
        vatAmount: sum.vatAmount + getRowVatAmount(row),
        totalAmount: sum.totalAmount + getRowTotalAmount(row),
      }),
      { subTotal: 0, vatAmount: 0, totalAmount: 0 },
    );

    return {
      isPackageMode,
      packageIncludedCount: packageRows.length,
      billableCount: billableRows.length,
      scopeOnlyCount: scopeRows.length,
      packageTotals,
      lineTotals,
      sourceLabel: packageRowSource?.financialSourceType === SOURCE_CONTRACT
        ? "Contract package"
        : packageRowSource?.financialSourceType === SOURCE_QUOTATION
        ? "Quotation package"
        : packageRowSource
        ? "Case package"
        : isPackagePricing(caseInfo)
        ? "Case package"
        : isPackagePricing(caseInfo?._mainContract)
        ? "Contract package"
        : isPackagePricing(caseInfo?._mainQuote)
          ? "Quotation package"
          : "Case package",
    };
  }, [services, caseInfo]);

  const renderPricingSummary = () => {
    const summary = servicePricingSummary;
    const modeLabel = summary.isPackageMode ? "Package pricing" : "Line pricing";
    const modeColor = summary.isPackageMode ? "#1a3a5c" : "#0f766e";
    return React.createElement("div", {
      style: {
        marginBottom: 12,
        padding: "12px 14px",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: C.bgSection,
        display: "grid",
        gridTemplateColumns: summary.isPackageMode ? "minmax(180px, 0.8fr) minmax(0, 1.6fr)" : "minmax(180px, 0.8fr) minmax(0, 1fr)",
        gap: 14,
        alignItems: "center",
      }
    },
      React.createElement("div", null,
        React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", marginBottom: 6 } }, "Pricing mode"),
        React.createElement(Tag, {
          color: summary.isPackageMode ? "blue" : "green",
          style: { margin: 0, borderRadius: 12, padding: "2px 10px", fontWeight: 700, color: modeColor }
        }, modeLabel),
        summary.isPackageMode && React.createElement("div", { style: { marginTop: 6, fontSize: 12, color: C.textSub } },
          `${summary.packageIncludedCount} included in package`,
          summary.billableCount ? `, ${summary.billableCount} billed separately` : "",
          summary.scopeOnlyCount ? `, ${summary.scopeOnlyCount} scope only` : ""
        )
      ),
      summary.isPackageMode
        ? React.createElement("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: 10,
          }
        },
          [
            ["Package subtotal", fmtVND(summary.packageTotals.subTotal)],
            ["VAT %", `${summary.packageTotals.vatRate || 0}%`],
            ["VAT amount", fmtVND(summary.packageTotals.vatAmount)],
            ["Package total", fmtVND(summary.packageTotals.totalAmount)],
          ].map(([label, value]) => React.createElement("div", {
            key: label,
            style: {
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              background: "#fff",
              padding: "8px 10px",
              textAlign: label === "VAT %" ? "center" : "right",
            }
          },
            React.createElement("div", { style: { fontSize: 11, color: C.textSub, marginBottom: 4, textAlign: "left" } }, label),
            React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: label === "Package total" ? "#15803d" : C.text } }, value)
          ))
        )
        : React.createElement("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 10,
          }
        },
          [
            ["Subtotal", fmtVND(summary.lineTotals.subTotal)],
            ["VAT amount", fmtVND(summary.lineTotals.vatAmount)],
            ["Total", fmtVND(summary.lineTotals.totalAmount)],
          ].map(([label, value]) => React.createElement("div", {
            key: label,
            style: {
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              background: "#fff",
              padding: "8px 10px",
              textAlign: "right",
            }
          },
            React.createElement("div", { style: { fontSize: 11, color: C.textSub, marginBottom: 4, textAlign: "left" } }, label),
            React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: label === "Total" ? "#15803d" : C.text } }, value)
          ))
        )
    );
  };

  if (!currentId) {
    return React.createElement("div", { style: { padding: 16 } }, "Case information not found.");
  }

  const columns = [
    {
      title: "No.",
      key: "index",
      width: 50,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Service Type",
      dataIndex: "serviceType",
      key: "serviceType",
      width: 150,
      render: (text, record) => {
        const isMain = record._isMainQuote;
        const isLocked = isMain || (record._qStatus && QUOTE_LOCKED_STATUSES.includes(record._qStatus));
        return React.createElement(EditableCell, {
          value: text,
          onSave: (val) => handleInlineEdit(record, "serviceType", val),
          disabled: isLocked
        });
      },
    },
    {
      title: "Service Name",
      dataIndex: "serviceName",
      key: "serviceName",
      width: 250,
      render: (text, record) => {
        const val = text || record.services?.serviceName || record.name;
        const mainQuoteTitle = caseInfo?._mainQuote?.title || "Báo giá gốc";
        const subtext = record._isMainQuote 
          ? mainQuoteTitle 
          : (record._qCode 
              ? `Báo giá bổ sung #${record._qCode}` 
              : (record._qTitle || `Báo giá bổ sung #${record._quotationId || "..."}`));

        return React.createElement("div", { style: { display: "flex", flexDirection: "column" } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
            React.createElement("div", { style: { flex: 1, minWidth: 0 } }, 
              (() => {
                const isMain = record._isMainQuote;
                const isLocked = isMain || (record._qStatus && QUOTE_LOCKED_STATUSES.includes(record._qStatus));
                return React.createElement(EditableCell, {
                  value: val,
                  onSave: (v) => handleInlineEdit(record, "serviceName", v),
                  disabled: isLocked
                });
              })()
            ),
            record._isMainQuote ? 
              React.createElement(Tooltip, { title: "Dịch vụ thuộc Báo giá gốc (Read-only)" },
                React.createElement(Tag, { color: "blue", style: { margin: 0, fontSize: 10, lineHeight: "16px" } }, "Main")
              ) : 
              (record._quotationId ? 
                React.createElement(Tooltip, { title: "Dịch vụ phát sinh (Sub-Quotation)" },
                  React.createElement(Tag, { color: "green", style: { margin: 0, fontSize: 10, lineHeight: "16px" } }, "Sub")
                ) : null
              )
          ),
          (record._quotationId || record._isMainQuote) && React.createElement("div", { 
            style: { 
              fontSize: 11, 
              color: C.textSub, 
              marginTop: 2, 
              paddingLeft: 8,
              display: "flex",
              alignItems: "center",
              gap: 4
            } 
          }, 
            React.createElement("span", { style: { opacity: 0.6 } }, "↳"), 
            subtext
          )
        );
      }
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      width: 300,
      render: (text, record) => {
        const isMain = record._isMainQuote;
        const isLocked = isMain || (record._qStatus && QUOTE_LOCKED_STATUSES.includes(record._qStatus));
        return React.createElement(EditableCell, {
          value: text,
          onSave: (val) => handleInlineEdit(record, "description", val),
          isTextArea: true,
          disabled: isLocked
        });
      },
    },
    {
      title: "Base Price",
      dataIndex: "basePrice",
      key: "basePrice",
      width: 140,
      render: (text, record) => {
        const isMain = record._isMainQuote;
        const isLocked = isMain || (record._qStatus && QUOTE_LOCKED_STATUSES.includes(record._qStatus));
        const packageRow = isPackageServiceRow(record);
        const scopeOnly = isScopeOnlyServiceRow(record);
        if (packageRow || scopeOnly) {
          return React.createElement("span", {
            style: {
              display: "inline-block",
              padding: "4px 8px",
              borderRadius: 10,
              background: packageRow ? "#e6f4ff" : "#f5f5f5",
              color: packageRow ? C.primary : C.textSub,
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }
          }, packageRow ? "Included in package" : "Scope only");
        }
        return React.createElement(EditableCell, {
          value: text,
          isNumber: true,
          onSave: (val) => handleInlineEdit(record, "basePrice", val),
          disabled: isLocked || !isMoneyEditableServiceRow(record)
        });
      },
    },
    {
      title: "VAT (%)",
      dataIndex: "vat",
      key: "vat",
      width: 100,
      render: (text, record) => {
        const isMain = record._isMainQuote;
        const isLocked = isMain || (record._qStatus && QUOTE_LOCKED_STATUSES.includes(record._qStatus));
        if (!isMoneyEditableServiceRow(record)) {
          return React.createElement("span", { style: { color: C.textSub, fontSize: 12 } }, "0%");
        }
        return React.createElement(EditableCell, {
          value: text,
          isNumber: true,
          suffix: "%",
          onSave: (val) => handleInlineEdit(record, "vat", val),
          disabled: isLocked
        });
      },
    },
    {
      title: "VAT Amount",
      dataIndex: "vatAmount",
      key: "vatAmount",
      width: 140,
      align: "right",
      render: (_, record) => {
        if (!isMoneyEditableServiceRow(record)) {
          return React.createElement("span", { style: { color: C.textSub } }, "—");
        }
        const amount = getRowVatAmount(record);
        return React.createElement("span", {
          style: {
            display: "inline-block",
            padding: "4px 8px",
            fontWeight: 600,
            color: "#92400e",
            whiteSpace: "nowrap",
          }
        }, `${amount.toLocaleString("vi-VN")} VND`);
      },
    },
    {
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 150,
      align: "right",
      render: (_, record) => {
        if (!isMoneyEditableServiceRow(record)) {
          return React.createElement("span", { style: { color: C.textSub } }, "—");
        }
        return React.createElement("span", {
          style: {
            display: "inline-block",
            padding: "4px 8px",
            fontWeight: 700,
            color: "#096dd9",
            whiteSpace: "nowrap",
          }
        }, fmtVND(getRowTotalAmount(record)));
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 170,
      align: "center",
      render: (status) => {
        const commercialCfg = COMMERCIAL_STATUS[status || "pending_quote"] || { color: "#8c8c8c", bg: "#fafafa", border: "#d9d9d9", label: status || "—", description: "Trạng thái chưa được cấu hình." };
        return React.createElement(Tooltip, { title: commercialCfg.description },
          React.createElement("span", {
          style: {
            display: "inline-block",
            fontSize: 11.5,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 10,
            border: `1px solid ${commercialCfg.border}`,
            background: commercialCfg.bg,
            color: commercialCfg.color,
            whiteSpace: "nowrap",
          }
          }, commercialCfg.label)
        );
      }
    },
    {
      title: "Action",
      key: "action",
      width: 190,
      align: "center",
      render: (_, record) => {
        const isMain = record._isMainQuote;
        const isLocked = isMain || (record._qStatus && QUOTE_LOCKED_STATUSES.includes(record._qStatus));
        const svcStatus = record.status || "pending_quote";
        const quotationDetailId = getRowQuotationId(record);
        const contractDetailId = getRowContractId(record);
        
        return React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" } },
          React.createElement(ActionIconButton, {
            title: "So sánh dữ liệu",
            icon: "compare",
            onClick: () => setCompareModal({ open: true, data: record }),
            color: "#475569",
          }),

          quotationDetailId && React.createElement(ActionIconButton, {
            title: "Xem chi tiết báo giá",
            icon: "detail",
            onClick: () => openRecordDetail("quotation", quotationDetailId, "Chi tiết báo giá"),
            color: "#0891b2",
          }),

          contractDetailId && React.createElement(ActionIconButton, {
            title: "Xem chi tiết hợp đồng",
            icon: "detail",
            onClick: () => openRecordDetail("contract", contractDetailId, "Chi tiết hợp đồng"),
            color: "#7c3aed",
          }),

          svcStatus === "pending_quote" && React.createElement(ActionIconButton, {
            title: "Tạo báo giá",
            icon: "quote",
            onClick: () => openManualPopup(
              QUOTATION_POPUP_UID,
              caseInfo?.quotationId ? "Create Sub-Quotation" : "Create Quotation",
              getQuotationPopupParams(record)
            ),
            primary: true,
            color: "#1677ff",
          }),
          
          // Nút Tạo Contract — chỉ hiển thị khi status = "ordered"
          !contractDetailId && !["contracted", "contract_pending_signature", "active", "completed", "cancelled"].includes(svcStatus) && React.createElement(ActionIconButton, {
            title: isMain ? "Tạo hợp đồng" : "Tạo phụ lục",
            icon: "contract",
            onClick: () => openManualPopup(
              CONTRACT_POPUP_UID,
              record?._isMainQuote ? "Create Contract" : "Create Sub-Contract",
              getContractPopupParams(record)
            ),
            primary: true,
            color: "#d46b08",
          }),

          React.createElement(Popconfirm, {
            title: isLocked ? "Cannot Delete" : "Delete this service?",
            description: isMain 
              ? "Services belonging to the Main Quotation cannot be deleted." 
              : (isLocked ? `Cannot delete because Quotation status is: ${record._qStatus}` : "The service will be removed from its Sub-Quotation."),
            onConfirm: () => {
              if (!isLocked) handleDelete(record);
            },
            showCancel: !isLocked,
            okText: isLocked ? "OK" : "Delete",
            cancelText: "Cancel",
            okButtonProps: { danger: !isLocked }
          }, React.createElement(ActionIconButton, {
            title: isLocked ? "Không thể xoá" : "Xoá dịch vụ",
            icon: "delete",
            danger: true,
            disabled: isLocked,
            tooltip: false,
          }))
        )
      }
    }
  ];

  const renderCompareCell = (value, type) => React.createElement("div", {
    style: {
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      maxHeight: type === "text" ? 120 : "none",
      overflow: "auto",
      color: C.text,
    }
  }, formatCompareValue(value, type));

  const renderCompareStatus = (row) => {
    if (row.catalogMissing) return React.createElement(Tag, { color: "default" }, "No catalog");
    return row.changed
      ? React.createElement(Tag, { color: "red" }, "Changed")
      : React.createElement(Tag, { color: "green" }, "Same");
  };

  const renderCompareDetail = (record) => {
    const catalog = getCatalogService(record);
    const rows = getComparisonRows(record);
    const changedRows = rows.filter(r => r.changed);

    return React.createElement("div", null,
      React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 16,
          padding: "12px 14px",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          background: C.bgSection,
        }
      },
        React.createElement("div", { style: { minWidth: 0 } },
          React.createElement("div", { style: { fontSize: 13, color: C.textSub, marginBottom: 4 } }, getQuoteSourceLabel(record)),
          React.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: C.text, wordBreak: "break-word" } },
            formatCompareValue(getQuotedValue(record, "serviceName"), "text")
          )
        ),
        React.createElement("div", { style: { textAlign: "right", whiteSpace: "nowrap" } },
          catalog
            ? React.createElement(Tag, { color: changedRows.length ? "red" : "green", style: { marginRight: 0 } },
                changedRows.length ? `${changedRows.length} changed` : "No change"
              )
            : React.createElement(Tag, { color: "default", style: { marginRight: 0 } }, "No catalog service")
        )
      ),

      !catalog && React.createElement("div", {
        style: {
          marginBottom: 12,
          padding: "8px 12px",
          border: "1px solid #fde68a",
          borderRadius: 6,
          background: "#fffbeb",
          color: "#92400e",
          fontSize: 13,
        }
      }, "This service is not linked to a catalog service, so there is no original version to compare."),

      React.createElement(Table, {
        dataSource: rows,
        rowKey: "key",
        pagination: false,
        size: "small",
        bordered: true,
        columns: [
          { title: "Field", dataIndex: "field", width: 150 },
          {
            title: "Original Service",
            dataIndex: "original",
            render: (value, row) => renderCompareCell(value, row.type),
          },
          {
            title: "Quotation Snapshot",
            dataIndex: "quoted",
            render: (value, row) => renderCompareCell(value, row.type),
          },
          {
            title: "Review",
            width: 110,
            align: "center",
            render: (_, row) => renderCompareStatus(row),
          },
        ],
      })
    );
  };

  const renderCompareList = () => {
    const rows = services.map((record, index) => {
      const catalog = getCatalogService(record);
      const diffRows = getComparisonRows(record).filter(r => r.changed);
      return {
        key: record.id,
        no: index + 1,
        record,
        catalogMissing: !catalog,
        serviceName: getQuotedValue(record, "serviceName"),
        originalName: catalog ? getCatalogValue(catalog, "serviceName") : "",
        source: getQuoteSourceLabel(record),
        changedCount: diffRows.length,
        changedLabels: diffRows.map(r => r.field).join(", "),
      };
    });

    return React.createElement("div", null,
      React.createElement("div", {
        style: {
          marginBottom: 12,
          padding: "8px 12px",
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          background: C.bgSection,
          color: C.textSub,
          fontSize: 13,
        }
      }, "Review the current quotation snapshot against the original service catalog values."),

      React.createElement(Table, {
        dataSource: rows,
        rowKey: "key",
        pagination: false,
        size: "small",
        bordered: true,
        scroll: { x: "max-content", y: 420 },
        columns: [
          { title: "No.", dataIndex: "no", width: 60, align: "center" },
          {
            title: "Quotation Service",
            dataIndex: "serviceName",
            width: 240,
            render: (value, row) => React.createElement("div", null,
              React.createElement("div", { style: { fontWeight: 600, color: C.text, wordBreak: "break-word" } }, formatCompareValue(value, "text")),
              React.createElement("div", { style: { fontSize: 12, color: C.textSub, marginTop: 2 } }, row.source)
            ),
          },
          {
            title: "Original Service",
            dataIndex: "originalName",
            width: 220,
            render: (value, row) => row.catalogMissing
              ? React.createElement(Tag, { color: "default" }, "No catalog")
              : React.createElement("span", { style: { wordBreak: "break-word" } }, formatCompareValue(value, "text")),
          },
          {
            title: "Changes",
            width: 220,
            render: (_, row) => row.catalogMissing
              ? React.createElement(Tag, { color: "default" }, "No catalog link")
              : (row.changedCount
                  ? React.createElement("div", null,
                      React.createElement(Tag, { color: "red" }, `${row.changedCount} changed`),
                      React.createElement("div", { style: { fontSize: 12, color: C.textSub, marginTop: 4, wordBreak: "break-word" } }, row.changedLabels)
                    )
                  : React.createElement(Tag, { color: "green" }, "No change")),
          },
          {
            title: "Action",
            width: 100,
            align: "center",
            render: (_, row) => React.createElement(Button, {
              size: "small",
              onClick: () => setCompareModal({ open: true, data: row.record }),
            }, "View"),
          },
        ],
      })
    );
  };

  const renderGuideContent = () => {
    const statusRows = ["pending_quote", "quote_draft", "quote_pending_approval", "quote_sent", "ordered", "contracted", "contract_pending_signature", "active", "completed", "cancelled"].map((key) => ({
      key,
      value: key,
      ...COMMERCIAL_STATUS[key],
    }));
    const actionRows = [
      {
        key: "pending_quote",
        status: COMMERCIAL_STATUS.pending_quote.label,
        when: "Dịch vụ mới được thêm vào case, chưa cần có báo giá hoặc hợp đồng ngay.",
        action: "Tiếp tục xử lý công việc nội bộ. Khi cần gửi phí cho khách hàng thì bấm Tạo báo giá.",
      },
      {
        key: "ordered",
        status: COMMERCIAL_STATUS.ordered.label,
        when: "Khách hàng đã đồng ý báo giá nhưng chưa có hợp đồng.",
        action: "Kiểm tra báo giá. Nếu khách hàng đồng ý thì tạo hợp đồng hoặc phụ lục.",
      },
      {
        key: "contracted",
        status: COMMERCIAL_STATUS.contracted.label,
        when: "Dịch vụ đã có hợp đồng hoặc phụ lục nhưng chưa được đánh dấu hiệu lực.",
        action: "Theo dõi việc ký kết. Khi hợp đồng đã ký hoặc bắt đầu thực hiện thì bấm Đã ký.",
      },
      {
        key: "active",
        status: COMMERCIAL_STATUS.active.label,
        when: "Hợp đồng đã ký hoặc đang được thực hiện.",
        action: "Tiếp tục theo dõi công việc và tài liệu như bình thường.",
      },
      {
        key: "completed",
        status: COMMERCIAL_STATUS.completed.label,
        when: "Dịch vụ đã hoàn tất.",
        action: "Kiểm tra hồ sơ cuối cùng và đóng các việc còn lại nếu có.",
      },
      {
        key: "cancelled",
        status: COMMERCIAL_STATUS.cancelled.label,
        when: "Dịch vụ hoặc báo giá liên quan đã bị hủy.",
        action: "Không tiếp tục xử lý dịch vụ này trừ khi quản lý mở lại hoặc tạo dịch vụ mới.",
      },
    ];
    const flowRows = [
      {
        key: "add",
        step: "1. Thêm dịch vụ",
        detail: "Người dùng thêm dịch vụ vào case để đội vận hành có thể bắt đầu theo dõi công việc ngay.",
      },
      {
        key: "tasks",
        step: "2. Chuẩn bị công việc",
        detail: "Các công việc cần làm của dịch vụ được chuẩn bị ngay, kể cả khi case chưa có báo giá hoặc hợp đồng.",
      },
      {
        key: "quote",
        step: "3. Bổ sung báo giá",
        detail: "Khi đã cần gửi phí cho khách hàng, người dùng bấm Tạo báo giá trên đúng dòng dịch vụ.",
      },
      {
        key: "contract",
        step: "4. Bổ sung hợp đồng",
        detail: "Sau khi báo giá được chấp nhận, người dùng tạo hợp đồng hoặc phụ lục cho dịch vụ đó.",
      },
      {
        key: "active",
        step: "5. Hợp đồng hiệu lực",
        detail: "Khi hợp đồng đã ký hoặc bắt đầu thực hiện, trạng thái chuyển sang Hợp đồng hiệu lực để mọi người dễ theo dõi.",
      },
    ];

    return React.createElement("div", { style: { color: C.text } },
      React.createElement("div", {
        style: {
          marginBottom: 14,
          padding: "10px 12px",
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          background: C.bgSection,
          fontSize: 13,
          color: C.textSub,
          lineHeight: 1.55,
        }
      }, "Khu vực này giúp người dùng theo dõi các dịch vụ trong case từ lúc mới phát sinh cho tới khi có báo giá, hợp đồng và hoàn tất. Dịch vụ có thể được thêm trước để đội phụ trách bắt đầu xử lý; báo giá và hợp đồng có thể bổ sung sau khi thông tin đã rõ hơn."),

      React.createElement("div", { style: { marginBottom: 18 } },
        React.createElement("div", { style: { fontWeight: 700, marginBottom: 8 } }, "Người dùng cần hiểu gì về trạng thái dịch vụ"),
        React.createElement(Table, {
          dataSource: statusRows,
          rowKey: "key",
          pagination: false,
          size: "small",
          bordered: true,
          columns: [
            {
              title: "Trạng thái",
              dataIndex: "label",
              width: 160,
              render: (_, row) => React.createElement("span", {
                style: {
                  display: "inline-block",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 10,
                  border: `1px solid ${row.border}`,
                  background: row.bg,
                  color: row.color,
                  whiteSpace: "nowrap",
                }
              }, row.label),
            },
            {
              title: "Ý nghĩa với người dùng",
              dataIndex: "description",
              render: (text) => React.createElement("span", { style: { lineHeight: 1.5 } }, text),
            },
          ],
        })
      ),

      React.createElement("div", { style: { marginBottom: 18 } },
        React.createElement("div", { style: { fontWeight: 700, marginBottom: 8 } }, "Khi nào cần thao tác"),
        React.createElement(Table, {
          dataSource: actionRows,
          rowKey: "key",
          pagination: false,
          size: "small",
          bordered: true,
          columns: [
            {
              title: "Trạng thái",
              dataIndex: "status",
              width: 160,
            },
            {
              title: "Khi nào xuất hiện",
              dataIndex: "when",
              width: 300,
            },
            {
              title: "Người dùng nên làm gì",
              dataIndex: "action",
            },
          ],
        })
      ),

      React.createElement("div", null,
        React.createElement("div", { style: { fontWeight: 700, marginBottom: 8 } }, "Luồng nghiệp vụ"),
        React.createElement(Table, {
          dataSource: flowRows,
          rowKey: "key",
          pagination: false,
          size: "small",
          bordered: true,
          columns: [
            { title: "Bước", dataIndex: "step", width: 190 },
            { title: "Mô tả", dataIndex: "detail" },
          ],
        })
      )
    );
  };

  return React.createElement("div", { style: { fontFamily: FONT } },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } },
      React.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: C.text } }, 
        "Service List",
        services.length > 0 && React.createElement(Tag, { style: { marginLeft: 8, borderRadius: 10 } }, services.length)
      ),
      React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" } },
        React.createElement(Button, {
          onClick: () => loadData(),
          loading: loading,
          style: { borderRadius: 6 }
        }, "Refresh"),
        React.createElement(Button, {
          onClick: () => setCompareModal({ open: true, data: null }),
          disabled: services.length === 0,
          style: { borderRadius: 6 }
        }, "Review Changes"),
        React.createElement(Button, {
          onClick: () => setGuideModal(true),
          style: { borderRadius: 6 }
        }, "Tài liệu hướng dẫn"),
        React.createElement(Button, {
          type: "primary",
          onClick: () => setAddModal(true),
          style: { background: C.primary, borderRadius: 6 }
        }, "+ Add Service")
      )
    ),

    renderPricingSummary(),

    React.createElement(Table, {
      dataSource: services,
      columns: columns,
      rowKey: "id",
      pagination: false,
      loading: loading,
      size: "middle",
      bordered: true,
      scroll: { x: "max-content" },
      style: {
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden"
      }
    }),

    // GUIDE MODAL
    React.createElement(Modal, {
      title: "Tài liệu hướng dẫn",
      open: guideModal,
      onCancel: () => setGuideModal(false),
      footer: React.createElement(Button, {
        type: "primary",
        onClick: () => setGuideModal(false),
        style: { background: C.primary }
      }, "Đã hiểu"),
      width: 980,
      bodyStyle: { paddingTop: 16, maxHeight: 620, overflowY: "auto" }
    }, guideModal && renderGuideContent()),

    // COMPARE MODAL
    React.createElement(Modal, {
      title: compareModal.data ? "Compare Original Service" : "Review Service Changes",
      open: compareModal.open,
      onCancel: () => setCompareModal({ open: false, data: null }),
      footer: React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
        compareModal.data && React.createElement(Button, {
          onClick: () => setCompareModal({ open: true, data: null })
        }, "Back to list"),
        React.createElement(Button, {
          type: "primary",
          onClick: () => setCompareModal({ open: false, data: null }),
          style: { background: C.primary }
        }, "Close")
      ),
      width: compareModal.data ? 900 : 1000,
      bodyStyle: { paddingTop: 16 }
    }, compareModal.open && (
      compareModal.data ? renderCompareDetail(compareModal.data) : renderCompareList()
    )),

    // ADD MODAL
    React.createElement(Modal, {
      title: "Thêm dịch vụ vào vụ việc",
      open: addModal,
      onCancel: () => {
        setAddModal(false);
        form.resetFields();
      },
      onOk: () => form.submit(),
      confirmLoading: submitting,
      okText: "Lưu dịch vụ",
      cancelText: "Huỷ",
      width: 650,
      okButtonProps: { style: { background: C.primary } }
    }, 
      React.createElement("div", { style: { marginBottom: 16, padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 13, color: "#1e40af", lineHeight: 1.55 } },
        React.createElement("div", { style: { fontWeight: 600, marginBottom: 4 } }, "📌 Hai cách thêm dịch vụ:"),
        React.createElement("ul", { style: { margin: 0, paddingLeft: 18 } },
          React.createElement("li", null, React.createElement("b", null, "Từ danh mục chuẩn: "), "Chọn dịch vụ bên dưới — hệ thống sẽ tự động điền thông tin và tạo công việc mẫu theo template."),
          React.createElement("li", null, React.createElement("b", null, "Thủ công (chưa chuẩn hoá): "), "Bỏ qua bước chọn danh mục, nhập tên dịch vụ trực tiếp. Công việc sẽ được tạo thủ công bởi người phụ trách.")
        )
      ),
      React.createElement(Form, {
        form: form,
        layout: "vertical",
        onFinish: handleAddSubmit
      }, 
        React.createElement(Form.Item, {
          name: "serviceId",
          label: "Chọn từ danh mục dịch vụ (không bắt buộc — bỏ qua nếu tạo thủ công)"
        }, 
          React.createElement(Select, {
            placeholder: "Chọn dịch vụ từ danh mục...",
            allowClear: true,
            onChange: handleServiceChange,
            showSearch: true,
            optionFilterProp: "children"
          }, serviceCatalog.map(s => {
            const catName = (s.serviceName || s.name || "").toLowerCase().trim();
            const isDuplicate = services.some(es => 
              (String(es.serviceId) === String(s.id) && es.serviceId) || 
              (es.serviceName || es.services?.serviceName || es.name || "").toLowerCase().trim() === catName
            );
            return React.createElement(Select.Option, { 
              key: s.id, 
              value: String(s.id),
              disabled: isDuplicate
            }, (s.serviceName || s.name || `Dịch vụ #${s.id}`) + (isDuplicate ? " (Đã có trong vụ việc)" : ""));
          }))
        ),
        
        React.createElement("div", { style: { display: "flex", gap: 16 } },
          React.createElement(Form.Item, {
            name: "serviceType",
            label: "Loại dịch vụ",
            style: { flex: 1 }
          }, React.createElement(Input, { placeholder: "Ví dụ: Tư vấn pháp lý" })),
          
          React.createElement(Form.Item, {
            name: "basePrice",
            label: "Phí dịch vụ (VND)",
            style: { flex: 1 },
            rules: []
          }, React.createElement(InputNumber, {
            style: { width: "100%" },
            formatter: value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ',
            parser: value => value.replace(/\./g, '').replace(' đ', '').replace(/\s/g, ''),
            min: 0,
            placeholder: "0"
          })),

          React.createElement(Form.Item, {
            name: "vat",
            label: "VAT (%)",
            style: { width: 100 },
          }, React.createElement(InputNumber, {
            style: { width: "100%" },
            min: 0,
            max: 100,
            placeholder: "0"
          }))
        ),
        
        React.createElement(Form.Item, {
          name: "serviceName",
          label: "Tên dịch vụ *",
          rules: [{ required: true, message: "Vui lòng nhập tên dịch vụ" }]
        }, React.createElement(Input, { placeholder: "Nhập tên dịch vụ (có thể tùy chỉnh khác với danh mục)" })),
        
        React.createElement(Form.Item, {
          name: "description",
          label: "Mô tả chi tiết"
        }, React.createElement(Input.TextArea, { rows: 4, placeholder: "Nhập mô tả dịch vụ..." }))
      )
    )
  );
};

ctx.render(React.createElement(CaseServices));
