const { React } = ctx;
const { useState, useEffect, useCallback, useMemo } = React;
const { Spin, Typography, message, Modal, Table, Tag, Button, Tooltip } = ctx.antd;
const { Text } = Typography;

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

const QUOTATION_ID = ctx.record?.id;
const QUOTATION_STATUS = ctx.record?.status; // e.g. 'draft', 'sent', 'order'
const PRICING_MODE_LINE = 'line';
const PRICING_MODE_PACKAGE = 'package';
const BILLING_LINE = 'lineBillable';
const BILLING_PACKAGE_INCLUDED = 'packageIncluded';
const SOURCE_QUOTATION = 'quotation';
const SOURCE_CONTRACT = 'contract';
// PROJECT_ID được fetch động trong handleSave vì ctx.record.projects chưa eager-load

const fmtVND = n => (!n && n !== 0) ? '—' : Number(n).toLocaleString('vi-VN') + ' ₫';
const parseNum = v => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
const extractId = val => {
  const id = val && typeof val === 'object' ? val.id : val;
  return id ? parseInt(id) : null;
};
const fmtPrice = n => { const num = parseNum(n); return num === 0 ? '' : num.toLocaleString('vi-VN'); };

const calcLine = (basePrice, quantity, vat) => {
  const subTotal = parseNum(basePrice) * parseNum(quantity);
  const vatAmount = subTotal * parseNum(vat) / 100;
  const totalAmount = subTotal + vatAmount;
  return { subTotal, vatAmount, totalAmount };
};
const calcPackageTotals = (subTotal, vatRate) => {
  const sub = parseNum(subTotal);
  const vatAmount = sub * parseNum(vatRate) / 100;
  return { subTotal: sub, vatAmount, totalAmount: sub + vatAmount };
};
const isPackagePricing = (recordOrMode) => {
  const mode = typeof recordOrMode === 'object' ? recordOrMode?.pricingMode : recordOrMode;
  return String(mode || '').toLowerCase() === PRICING_MODE_PACKAGE;
};
const inferVatRate = (subTotal, vatAmount, fallback = 0) => {
  const sub = parseNum(subTotal);
  return sub ? Math.round((parseNum(vatAmount) * 10000) / sub) / 100 : parseNum(fallback);
};
const buildServicePricingPayload = ({ pricingMode, basePrice, quantity = 1, vat, packageSubTotal, packageVatRate }) => {
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

const normalizeLookupText = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const stripProjectServiceSyncFields = (data = {}) => {
  const fallback = { ...data };
  delete fallback.pricingMode;
  delete fallback.billingMode;
  delete fallback.financialSourceType;
  delete fallback.contractId;
  delete fallback.contracts;
  delete fallback.contractServiceId;
  delete fallback.contractServices;
  delete fallback.quotationId;
  delete fallback.quotations;
  delete fallback.quotationServiceId;
  delete fallback.quotationServices;
  delete fallback.quantity;
  delete fallback.subTotal;
  delete fallback.vatAmount;
  delete fallback.totalAmount;
  return fallback;
};
const requestProjectService = async ({ action, params, data }) => {
  try {
    return await ctx.api.request({
      url: `projectServices:${action}`,
      method: 'POST',
      params,
      data,
    });
  } catch (error) {
    return ctx.api.request({
      url: `projectServices:${action}`,
      method: 'POST',
      params,
      data: stripProjectServiceSyncFields(data),
    });
  }
};

async function fetchQuotation() {
  if (!QUOTATION_ID) return ctx.record || {};
  try {
    const res = await ctx.api.request({
      url: 'quotations:get',
      params: { filterByTk: QUOTATION_ID },
    });
    return res?.data?.data || res?.data || ctx.record || {};
  } catch {
    return ctx.record || {};
  }
}

async function fetchQSvcs() {
  try {
    const res = await ctx.api.request({
      url: 'quotationServices:list',
      params: { pageSize: 100, page: 1, filter: JSON.stringify({ quotationId: { $eq: parseInt(QUOTATION_ID) } }) },
    });
    return res?.data?.data || [];
  } catch { return []; }
}

async function fetchSvcOptions() {
  try {
    const res = await ctx.api.request({ url: 'services:list', params: { pageSize: 500, page: 1 } });
    return res?.data?.data || [];
  } catch { return []; }
}

// ==================== EDITABLE CELL COMPONENT ====================
const { Input, InputNumber, Select } = ctx.antd;

const EditableCell = ({ value, onSave, isTextArea = false, isNumber = false, disabled = false, options = null, placeholder = "", customLabel = null }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? (isNumber ? 0 : ""));

  useEffect(() => { setVal(value ?? (isNumber ? 0 : "")); }, [value]);

  if (editing && !disabled) {
    if (options) {
      return React.createElement(Select, {
        autoFocus: true,
        value: val ? String(val) : "",
        onChange: (v) => {
          setVal(v);
          setEditing(false);
          if (v !== value) onSave(v);
        },
        onBlur: () => setEditing(false),
        style: { width: "100%", minWidth: 150 },
        showSearch: true,
        optionFilterProp: "children"
      },
        React.createElement(Select.Option, { value: "" }, "-- Chọn --"),
        ...options.map(o => React.createElement(Select.Option, {
          key: o.value,
          value: o.value,
          disabled: o.disabled,
          style: { color: o.disabled ? '#bfbfbf' : '#262626' }
        }, o.label))
      );
    }
    if (isTextArea) {
      return React.createElement(Input.TextArea, {
        autoFocus: true,
        value: val,
        onChange: (e) => setVal(e.target.value),
        onBlur: () => {
          setEditing(false);
          if (val !== (value || "")) onSave(val);
        },
        placeholder: placeholder,
        autoSize: { minRows: 2, maxRows: 8 }
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
        style: { width: "100%", minWidth: 90 },
        formatter: (v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
        parser: (v) => v.replace(/\./g, '').replace(/\s/g, ''),
      });
    }
    return React.createElement(Input, {
      autoFocus: true,
      value: val,
      onChange: (e) => setVal(e.target.value),
      placeholder: placeholder,
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

  let displayVal = val;
  if (isNumber) {
    displayVal = val ? Number(val).toLocaleString("vi-VN") : "0";
  } else if (options) {
    const selectedOpt = options.find(o => String(o.value) === String(val));
    displayVal = selectedOpt ? selectedOpt.label : (customLabel || "—");
  }

  return React.createElement("div", {
    style: {
      cursor: disabled ? "not-allowed" : "pointer",
      minHeight: 28,
      display: "flex",
      alignItems: "center",
      justifyContent: isNumber ? "flex-end" : "flex-start",
      padding: "6px 8px",
      borderRadius: 4,
      transition: "background 0.2s, border-color 0.2s",
      whiteSpace: isNumber ? "nowrap" : "pre-wrap",
      wordBreak: isNumber ? "normal" : "break-word",
      color: isNumber ? "#b8860b" : "inherit",
      fontWeight: isNumber ? 500 : "normal",
      lineHeight: 1.5,
      border: "1px dashed transparent"
    },
    onClick: () => { if (!disabled) setEditing(true); },
    onMouseEnter: (e) => { if (!disabled) { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.borderColor = "#d1d5db"; } },
    onMouseLeave: (e) => { if (!disabled) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } },
    title: disabled ? "Báo giá đã khoá" : "Click để chỉnh sửa"
  }, displayVal || React.createElement("span", { style: { color: "#9ca3af", fontStyle: "italic" } }, "—"));
};

// ==================== MAIN BLOCK ====================
const QuotationServicesBlock = () => {
  const [rows, setRows] = useState([]);
  const [svcOpts, setSvcOpts] = useState([]);
  const [quotation, setQuotation] = useState(ctx.record || {});
  const [pricingMode, setPricingMode] = useState(isPackagePricing(ctx.record) ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE);
  const [packageSubTotal, setPackageSubTotal] = useState(parseNum(ctx.record?.packageSubTotal ?? ctx.record?.subTotal));
  const [packageVatRate, setPackageVatRate] = useState(
    ctx.record?.packageVatRate ?? inferVatRate(ctx.record?.subTotal, ctx.record?.vatAmount, 0),
  );
  const [psServiceIds, setPsServiceIds] = useState(new Set()); // serviceIds đã có trong CaseServices
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [compareModal, setCompareModal] = useState({ open: false, data: null });

  // Service selection modal states
  const [showSvcModal, setShowSvcModal] = useState(false);
  const [activeRowId, setActiveRowId] = useState(null);
  const [modalView, setModalView] = useState('select'); // 'select' | 'create'
  const [svcSearch, setSvcSearch] = useState('');

  // Custom service form states
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcType, setNewSvcType] = useState('');
  const [newUnitPrice, setNewUnitPrice] = useState(0);
  const [newDescription, setNewDescription] = useState('');

  const openServiceModal = (rowId) => {
    const row = rows.find(r => r.id === rowId);
    setActiveRowId(rowId);
    setModalView('select');
    setSvcSearch('');
    // Clear custom form
    setNewSvcName('');
    setNewSvcType('');
    setNewUnitPrice(0);
    setNewDescription('');
    setShowSvcModal(true);
  };

  const handleSelectCatalogService = (svc) => {
    setRows(prev => prev.map(r => {
      if (r.id !== activeRowId) return r;
      const price = svc.basePrice ?? svc.unitPrice ?? svc.price ?? 0;
      const vat = svc.vat ?? svc.vatRate ?? 0;
      return {
        ...r,
        serviceId: svc.id,
        _svcName: svc.serviceName || svc.name || '',
        _serviceType: svc.serviceType || svc.type || '',
        _description: svc.description || '',
        _basePrice: isPackageMode ? 0 : price,
        _vat: isPackageMode ? 0 : vat,
        _isCustom: false,
      };
    }));
    setDirty(true);
    setShowSvcModal(false);
  };

  const handleCreateCustomService = () => {
    if (!newSvcName.trim()) { message.warning('Vui lòng nhập tên dịch vụ'); return; }
    setRows(prev => prev.map(r => {
      if (r.id !== activeRowId) return r;
      return {
        ...r,
        serviceId: null,
        _svcName: newSvcName.trim(),
        _serviceType: newSvcType.trim() || '',
        _description: newDescription.trim() || '',
        _basePrice: isPackageMode ? 0 : parseNum(newUnitPrice),
        _vat: isPackageMode ? 0 : 10, // Mặc định VAT 10% cho dịch vụ mới tự tạo
        _isCustom: true,
      };
    }));
    setDirty(true);
    setShowSvcModal(false);
  };

  const reload = useCallback(async () => {
    if (!QUOTATION_ID) { setLoading(false); return; }
    setLoading(true);
    const [svcs, opts, quote] = await Promise.all([fetchQSvcs(), fetchSvcOptions(), fetchQuotation()]);
    const svcMap = {};
    opts.forEach(o => { svcMap[o.id] = o; });
    const packageLine = svcs.find((item) => isPackagePricing(item) || parseNum(item?.packageSubTotal) || parseNum(item?.packageTotalAmount));
    const packageSource = packageLine || quote || {};
    setQuotation(quote);
    setPricingMode(isPackagePricing(quote) || !!packageLine ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE);
    setPackageSubTotal(parseNum(packageSource?.packageSubTotal ?? quote?.packageSubTotal ?? quote?.subTotal));
    setPackageVatRate(
      packageSource?.packageVatRate ?? quote?.packageVatRate ?? inferVatRate(
        packageSource?.packageSubTotal ?? quote?.subTotal,
        packageSource?.packageVatAmount ?? quote?.vatAmount,
        0,
      ),
    );
    setSvcOpts(opts);
    setRows(svcs.map(s => ({
      ...s,
      _basePrice: s.basePrice || 0,
      _quantity: s.quantity || 1,
      _vat: s.vat || 0,
      _svcName: svcMap[s.serviceId]?.serviceName || s.serviceName || '',
      _serviceType: s.serviceType || svcMap[s.serviceId]?.serviceType || s.serviceType || '',
      _description: s.description || svcMap[s.serviceId]?.description || s.description || '',
      _isNew: false,
      _deleted: false,
      _isCustom: !s.serviceId,
    })));

    // Fetch projectServices to know which services are already in CaseServices
    try {
      let projectId = null;
      const projectsRel = ctx.record?.projects || [];
      if (projectsRel.length > 0) {
        projectId = typeof projectsRel[0] === 'object' ? projectsRel[0].id : projectsRel[0];
      }
      if (!projectId) {
        const mainQuoteId = ctx.record?.parentId || QUOTATION_ID;
        const projRes = await ctx.api.request({
          url: 'projects:list',
          params: { filter: JSON.stringify({ quotationId: { $eq: parseInt(mainQuoteId) } }), pageSize: 1 }
        });
        projectId = projRes?.data?.data?.[0]?.id || null;
      }
      if (projectId) {
        const psRes = await ctx.api.request({
          url: 'projectServices:list',
          params: { filter: JSON.stringify({ projectId: { $eq: parseInt(projectId) } }), pageSize: 500 }
        });
        const psArr = psRes?.data?.data || [];
        const ids = new Set(psArr.map(ps => {
          const sid = typeof ps.serviceId === 'object' ? ps.serviceId?.id : ps.serviceId;
          return String(sid);
        }).filter(Boolean));
        setPsServiceIds(ids);
      }
    } catch (e) { console.warn('[QS] Không fetch được projectServices:', e); }

    setDirty(false);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, []);

  const activeRows = useMemo(() => rows.filter(r => !r._deleted), [rows]);

  // Set serviceId đang được dùng — để disable trong select của các dòng khác
  const usedServiceIds = useMemo(
    () => new Set(activeRows.map(r => r.serviceId).filter(Boolean)),
    [activeRows]
  );

  const lineTotals = useMemo(() => {
    return activeRows.reduce((acc, r) => {
      const c = calcLine(r._basePrice, 1, r._vat);
      return {
        subTotal: acc.subTotal + c.subTotal,
        vatAmount: acc.vatAmount + c.vatAmount,
        totalAmount: acc.totalAmount + c.totalAmount,
      };
    }, { subTotal: 0, vatAmount: 0, totalAmount: 0 });
  }, [activeRows]);
  const packageTotals = useMemo(
    () => calcPackageTotals(packageSubTotal, packageVatRate),
    [packageSubTotal, packageVatRate],
  );
  const isPackageMode = pricingMode === PRICING_MODE_PACKAGE;
  const totals = isPackageMode ? packageTotals : lineTotals;

  const handlePricingModeChange = (mode) => {
    const nextMode = mode === PRICING_MODE_PACKAGE ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE;
    if (nextMode === pricingMode) return;
    if (nextMode === PRICING_MODE_PACKAGE) {
      setPackageSubTotal((prev) => prev || lineTotals.subTotal || parseNum(quotation?.subTotal));
      setPackageVatRate((prev) => prev || inferVatRate(lineTotals.subTotal || quotation?.subTotal, lineTotals.vatAmount || quotation?.vatAmount, 0));
      setRows(prev => prev.map(r => ({ ...r, _basePrice: 0, _vat: 0 })));
    }
    setPricingMode(nextMode);
    setDirty(true);
  };

  const updatePackageField = (setter) => (value) => {
    setter(value || 0);
    setDirty(true);
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const upd = { ...r, [field]: value };
      if (field === '_serviceId') {
        const opt = svcOpts.find(o => o.id === parseInt(value));
        const price = opt?.basePrice ?? opt?.unitPrice ?? opt?.price ?? 0;
        const vat = opt?.vat ?? opt?.vatRate ?? 0;
        upd.serviceId = parseInt(value) || null;
        upd._svcName = opt?.serviceName || '';
        upd._serviceType = opt?.serviceType || '';
        upd._description = opt?.description || '';
        upd._basePrice = isPackageMode ? 0 : price;
        upd._vat = isPackageMode ? 0 : vat;
        upd._isCustom = false;
      }
      return upd;
    }));
    setDirty(true);
  };

  const toggleCustom = (id, isCustom) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        _isCustom: isCustom,
        serviceId: isCustom ? null : r.serviceId,
        _svcName: isCustom ? (r._svcName || '') : '',
        _serviceType: isCustom ? (r._serviceType || '') : '',
        _basePrice: isCustom ? r._basePrice : 0,
        _vat: isCustom ? r._vat : 0,
      };
    }));
    setDirty(true);
  };

  // ── Lock guard: block all edits when quotation is confirmed ──
  const isLocked = QUOTATION_STATUS === 'order';

  const compareFields = [
    { key: "serviceName", label: "Tên dịch vụ", type: "text" },
    { key: "serviceType", label: "Loại dịch vụ", type: "text" },
    { key: "description", label: "Mô tả", type: "text" },
    { key: "basePrice", label: "Đơn giá", type: "money" },
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
    return svcOpts.find(s => String(s.id) === String(record.serviceId));
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
    if (field === "serviceName") return record._svcName || record.serviceName || "";
    if (field === "serviceType") return record._serviceType || record.serviceType || "";
    if (field === "description") return record._description || record.description || "";
    if (field === "basePrice") return record._basePrice ?? record.basePrice ?? 0;
    return record[field];
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
          React.createElement("div", { style: { fontSize: 13, color: C.textSub, marginBottom: 4 } }, "Dịch vụ Báo giá"),
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
      }, "Dịch vụ này không liên kết với danh mục dịch vụ gốc, không có dữ liệu để so sánh."),

      React.createElement(Table, {
        dataSource: rows,
        rowKey: "key",
        pagination: false,
        size: "small",
        bordered: true,
        columns: [
          { title: "Trường dữ liệu", dataIndex: "field", width: 150 },
          {
            title: "Dịch vụ gốc (Catalog)",
            dataIndex: "original",
            render: (value, row) => renderCompareCell(value, row.type),
          },
          {
            title: "Dịch vụ trong Báo giá",
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
    const tableRows = activeRows.map((record, index) => {
      const catalog = getCatalogService(record);
      const diffRows = getComparisonRows(record).filter(r => r.changed);
      return {
        key: record.id,
        no: index + 1,
        record,
        catalogMissing: !catalog,
        serviceName: getQuotedValue(record, "serviceName"),
        originalName: catalog ? getCatalogValue(catalog, "serviceName") : "",
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
      }, "So sánh dữ liệu dịch vụ hiện tại trong Báo giá với danh mục dịch vụ gốc."),

      React.createElement(Table, {
        dataSource: tableRows,
        rowKey: "key",
        pagination: false,
        size: "small",
        bordered: true,
        scroll: { x: "max-content", y: 420 },
        columns: [
          { title: "No.", dataIndex: "no", width: 60, align: "center" },
          {
            title: "Dịch vụ Báo giá",
            dataIndex: "serviceName",
            width: 240,
            render: (value, row) => React.createElement("div", { style: { fontWeight: 600, color: C.text, wordBreak: "break-word" } }, formatCompareValue(value, "text")),
          },
          {
            title: "Dịch vụ gốc",
            dataIndex: "originalName",
            width: 220,
            render: (value, row) => row.catalogMissing
              ? React.createElement(Tag, { color: "default" }, "No catalog")
              : React.createElement("span", { style: { wordBreak: "break-word" } }, formatCompareValue(value, "text")),
          },
          {
            title: "Thay đổi",
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

  const addRow = () => {
    if (isLocked) { message.warning('🔒 Báo giá đã được đặt hàng — không thể thêm dịch vụ mới'); return; }
    const newId = Date.now();
    setRows(prev => [...prev, {
      id: newId, serviceId: null,
      _basePrice: 0, _quantity: 1, _vat: isPackageMode ? 0 : 10,
      _svcName: '', _serviceType: '', _description: '', _isNew: true, _deleted: false,
      _isCustom: false,
    }]);
    setDirty(true);
    openServiceModal(newId);
  };

  const deleteRow = id => {
    if (isLocked) { message.warning('🔒 Báo giá đã được đặt hàng — không thể xoá dịch vụ'); return; }
    setRows(prev => prev.map(r => r.id === id ? { ...r, _deleted: true } : r));
    setDirty(true);
  };

  const handleSave = async () => {
    const invalid = activeRows.find(r => (!r.serviceId && !r._svcName?.trim()) || (!isPackageMode && parseNum(r._basePrice) <= 0));
    if (invalid) { message.warning(isPackageMode ? 'Vui lòng chọn đầy đủ dịch vụ trong gói' : 'Vui lòng điền đầy đủ dịch vụ và đơn giá'); return; }
    if (isPackageMode && parseNum(packageSubTotal) <= 0) { message.warning('Vui lòng nhập giá trị gói dịch vụ'); return; }
    setSaving(true);
    try {
      let PROJECT_ID = null;
      let existingPS = [];
      try {
        // 1. Ưu tiên lấy từ relation trực tiếp (nếu có eager load)
        const projectsRel = ctx.record?.projects || [];
        if (projectsRel.length > 0) {
          PROJECT_ID = typeof projectsRel[0] === 'object' ? projectsRel[0].id : projectsRel[0];
        }

        // 2. Fallback: Query từ project chứa main quotation (để hỗ trợ cả Sub-Quotation)
        if (!PROJECT_ID) {
          // Sub-quotation có parentId trỏ về quotation gốc
          const mainQuoteId = ctx.record?.parentId || ctx.record?.parent_id || ctx.record?.parentQuotationId || QUOTATION_ID;
          if (mainQuoteId) {
            const projRes = await ctx.api.request({
              url: 'projects:list',
              params: { filter: JSON.stringify({ quotationId: { $eq: parseInt(mainQuoteId) } }), pageSize: 1 }
            });
            PROJECT_ID = projRes?.data?.data?.[0]?.id || null;
          }
        }
      } catch (e) { console.warn('[QS→PS] Không fetch được project:', e); }

      if (PROJECT_ID) {
        try {
          const psAllRes = await ctx.api.request({
            url: 'projectServices:list',
            params: { filter: JSON.stringify({ projectId: { $eq: parseInt(PROJECT_ID) } }), pageSize: 500 }
          });
          existingPS = psAllRes?.data?.data || [];
        } catch (e) { message.warning('Không thể tải danh sách projectServices: ' + (e?.message || '')); }
      } else {
        console.warn('[QS→PS] PROJECT_ID vẫn null sau khi fetch — cascade bị bỏ qua!');
      }

      const savedQuotationServiceRows = [];
      for (const r of rows) {
        const pricingPayload = buildServicePricingPayload({
          pricingMode,
          basePrice: r._basePrice,
          quantity: 1,
          vat: r._vat,
          packageSubTotal,
          packageVatRate,
        });
        const payload = {
          serviceId: r.serviceId, quotationId: parseInt(QUOTATION_ID),
          serviceName: r._svcName || null,
          serviceType: r._serviceType || null,
          description: r._description || null,
          ...pricingPayload,
        };
        // Find corresponding projectService by JS
        const matchedPS = existingPS.find(ps => {
          const psId = typeof ps.serviceId === 'object' ? ps.serviceId?.id : ps.serviceId;
          if (r.serviceId && psId) {
            return String(psId) === String(r.serviceId);
          }
          const psName = ps.serviceName || '';
          const rName = r._svcName || '';
          return !r.serviceId && !psId && normalizeLookupText(psName) === normalizeLookupText(rName);
        });

        let linkedProjectServiceId = matchedPS?.id || null;

        if (r._deleted && !r._isNew) {
          await ctx.api.request({ url: 'quotationServices:destroy', method: 'POST', params: { filterByTk: r.id } });
          // Cascade: delete corresponding projectService
          if (PROJECT_ID && matchedPS && !isPackageMode) {
            try {
              await ctx.api.request({ url: 'projectServices:destroy', method: 'POST', params: { filterByTk: matchedPS.id } });
            } catch (e) { message.warning('Không thể xoá projectService #' + matchedPS.id + ': ' + (e?.message || '')); }
          }
        } else if (!r._deleted && r._isNew) {
          const createdQSvcRes = await ctx.api.request({ url: 'quotationServices:create', method: 'POST', data: payload });
          const createdQSvcId = createdQSvcRes?.data?.data?.id || createdQSvcRes?.data?.id || null;
          // Cascade: create projectService if not exists, update if it already exists from main quotation
          if (PROJECT_ID && (r.serviceId || r._svcName)) {
            // Search by serviceId across ALL projectServices (including from main quotation)
            const duplicatePS = existingPS.find(ps => {
              const psId = typeof ps.serviceId === 'object' ? ps.serviceId?.id : ps.serviceId;
              if (r.serviceId && psId) {
                return String(psId) === String(r.serviceId);
              }
              const psName = ps.serviceName || '';
              const rName = r._svcName || '';
              return !r.serviceId && !psId && normalizeLookupText(psName) === normalizeLookupText(rName);
            });
            if (duplicatePS) {
              linkedProjectServiceId = duplicatePS.id;
              // Service already exists in CaseServices → only update price, don't create new
              try {
                await requestProjectService({
                  action: 'update',
                  params: { filterByTk: duplicatePS.id },
                  data: {
                    serviceId: r.serviceId || null,
                    serviceName: r._svcName || null,
                    serviceType: r._serviceType || null,
                    description: r._description || null,
                    pricingMode: isPackageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
                    billingMode: isPackageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
                    financialSourceType: SOURCE_QUOTATION,
                    quotationServiceId: createdQSvcId || undefined,
                    ...pricingPayload,
                  }
                });
              } catch (e) { message.warning('Không thể update projectService trùng: ' + (e?.message || '')); }
            } else if (!matchedPS) {
              try {
                const newPS = await requestProjectService({
                  action: 'create',
                  data: {
                    projectId: parseInt(PROJECT_ID),
                    serviceId: r.serviceId,
                    serviceName: r._svcName || null,
                    serviceType: r._serviceType || null,
                    description: r._description || null,
                    pricingMode: isPackageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
                    billingMode: isPackageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
                    financialSourceType: SOURCE_QUOTATION,
                    quotationServiceId: createdQSvcId || undefined,
                    ...pricingPayload,
                  }
                });
                linkedProjectServiceId = newPS?.data?.data?.id || newPS?.data?.id || null;
                if (newPS?.data?.data) existingPS.push(newPS.data.data);
              } catch (e) { message.warning('Không thể tạo projectService: ' + (e?.message || '')); }
            }
          }
          savedQuotationServiceRows.push({ ...payload, id: createdQSvcId, projectServiceId: linkedProjectServiceId });
        } else if (!r._deleted && !r._isNew) {
          await ctx.api.request({ url: 'quotationServices:update', method: 'POST', params: { filterByTk: r.id }, data: payload });
          // Cascade: update projectService if found
          if (PROJECT_ID && matchedPS) {
            try {
              await requestProjectService({
                action: 'update',
                params: { filterByTk: matchedPS.id },
                data: {
                  serviceId: r.serviceId || null,
                  serviceName: r._svcName || null,
                  serviceType: r._serviceType || null,
                  description: r._description || null,
                  pricingMode: isPackageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
                  billingMode: isPackageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
                  financialSourceType: SOURCE_QUOTATION,
                  quotationServiceId: r.id,
                  ...pricingPayload,
                }
              });
            } catch (e) { message.warning('Không thể update projectService #' + matchedPS.id + ': ' + (e?.message || '')); }
          }
          savedQuotationServiceRows.push({ ...payload, id: r.id, projectServiceId: linkedProjectServiceId });
        }
      }

      // Step 2: Update quotation totals
      const qRes = await ctx.api.request({
        url: 'quotations:get',
        params: { filterByTk: QUOTATION_ID }
      });
      const currentQ = qRes?.data?.data || qRes?.data || {};

      await ctx.api.request({
        url: 'quotations:update', method: 'POST',
        params: { filterByTk: QUOTATION_ID },
        data: {
          pricingMode,
          packageSubTotal: isPackageMode ? totals.subTotal : null,
          packageVatRate: isPackageMode ? parseNum(packageVatRate) : null,
          subTotal: totals.subTotal,
          vatAmount: totals.vatAmount,
          totalAmount: totals.totalAmount,
          customerId: extractId(currentQ.customerId),
          internalCompanyId: extractId(currentQ.internalCompanyId)
        },
      });

      // Step 3: Sync contract linked to this quotation
      let linkedContract = null;
      try {
        const cRes = await ctx.api.request({
          url: 'contracts:list',
          params: { filter: JSON.stringify({ quotationId: { $eq: parseInt(QUOTATION_ID) } }), pageSize: 1 }
        });
        linkedContract = cRes?.data?.data?.[0];
        if (linkedContract) {
          const isRetainer = String(linkedContract.contractType).toLowerCase() === 'retainer';
          let finalSubTotal = totals.subTotal;
          let finalVatAmount = totals.vatAmount;
          let finalTotalAmount = totals.totalAmount;
          let finalFixedAmount = undefined;

          if (isRetainer) {
            const monthly = parseNum(linkedContract.monthlyFee);
            const duration = parseNum(linkedContract.retainerDuration);
            const vatRate = parseNum(linkedContract.packageVatRate ?? linkedContract.vatRate ?? 0);
            finalSubTotal = monthly * duration;
            finalVatAmount = (finalSubTotal * vatRate) / 100;
            finalTotalAmount = finalSubTotal + finalVatAmount;
          } else {
            // byCase
            finalFixedAmount = totals.totalAmount; // Đồng bộ fixedAmount với totalAmount (có VAT) theo feedback
          }

          await ctx.api.request({
            url: 'contracts:update', method: 'POST', params: { filterByTk: linkedContract.id },
            data: {
              pricingMode,
              packageSubTotal: isPackageMode ? totals.subTotal : null,
              packageVatRate: isPackageMode ? parseNum(packageVatRate) : null,
              subTotal: finalSubTotal,
              vatAmount: finalVatAmount,
              totalAmount: finalTotalAmount,
              ...(finalFixedAmount !== undefined ? { fixedAmount: finalFixedAmount } : {}),
              customerId: extractId(linkedContract.customerId) || extractId(ctx.record?.customerId),
              internalCompanyId: extractId(linkedContract.internalCompanyId) || extractId(ctx.record?.internalCompanyId)
            }
          });

          const csRes = await ctx.api.request({
            url: 'contractServices:list',
            params: {
              filter: JSON.stringify({ contractId: { $eq: parseInt(linkedContract.id) } }),
              pageSize: 1000,
            },
          });
          const existingContractServices = csRes?.data?.data || [];
          for (const qLine of savedQuotationServiceRows.filter((item) => item.id)) {
            const matchedCS = existingContractServices.find((cs) => {
              const csQSvcId = extractId(cs.quotationServiceId) || extractId(cs.quotationServices);
              if (csQSvcId && String(csQSvcId) === String(qLine.id)) return true;
              const csProjectServiceId = extractId(cs.projectServiceId) || extractId(cs.projectServices);
              if (qLine.projectServiceId && csProjectServiceId && String(csProjectServiceId) === String(qLine.projectServiceId)) return true;
              const csServiceId = extractId(cs.serviceId) || extractId(cs.ServiceId) || extractId(cs.services);
              if (qLine.serviceId && csServiceId && String(csServiceId) === String(qLine.serviceId)) return true;
              return normalizeLookupText(cs.serviceName) === normalizeLookupText(qLine.serviceName);
            });
            const contractServicePayload = {
              contractId: parseInt(linkedContract.id),
              contracts: parseInt(linkedContract.id),
              quotationServiceId: parseInt(qLine.id),
              quotationServices: parseInt(qLine.id),
              projectServiceId: qLine.projectServiceId || extractId(matchedCS?.projectServiceId) || null,
              projectServices: qLine.projectServiceId || extractId(matchedCS?.projectServices) || undefined,
              projectId: PROJECT_ID ? parseInt(PROJECT_ID) : extractId(matchedCS?.projectId),
              serviceId: qLine.serviceId || null,
              ServiceId: qLine.serviceId || null,
              serviceName: qLine.serviceName || null,
              serviceType: qLine.serviceType || null,
              description: qLine.description || null,
              pricingMode: isPackageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
              billingMode: isPackageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
              financialSourceType: SOURCE_CONTRACT,
              basePrice: qLine.basePrice,
              quantity: qLine.quantity,
              vat: qLine.vat,
              subTotal: qLine.subTotal,
              vatAmount: qLine.vatAmount,
              totalAmount: qLine.totalAmount,
              packageSubTotal: qLine.packageSubTotal,
              packageVatRate: qLine.packageVatRate,
              packageVatAmount: qLine.packageVatAmount,
              packageTotalAmount: qLine.packageTotalAmount,
            };
            const csWriteRes = await ctx.api.request({
              url: matchedCS ? 'contractServices:update' : 'contractServices:create',
              method: 'POST',
              params: matchedCS ? { filterByTk: matchedCS.id } : undefined,
              data: contractServicePayload,
            });
            const syncedContractServiceId = matchedCS?.id || csWriteRes?.data?.data?.id || csWriteRes?.data?.id || null;
            if (qLine.projectServiceId && syncedContractServiceId) {
              await requestProjectService({
                action: 'update',
                params: { filterByTk: qLine.projectServiceId },
                data: {
                  contractId: parseInt(linkedContract.id),
                  contractServiceId: syncedContractServiceId,
                  financialSourceType: SOURCE_CONTRACT,
                  pricingMode: isPackageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
                  billingMode: isPackageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
                  serviceId: qLine.serviceId || null,
                  serviceName: qLine.serviceName || null,
                  serviceType: qLine.serviceType || null,
                  description: qLine.description || null,
                  ...buildServicePricingPayload({
                    pricingMode,
                    basePrice: qLine.basePrice,
                    quantity: qLine.quantity,
                    vat: qLine.vat,
                    packageSubTotal: qLine.packageSubTotal,
                    packageVatRate: qLine.packageVatRate,
                  }),
                },
              });
            }
          }
        }
      } catch (e) { message.warning('Không thể sync hợp đồng: ' + (e?.message || '')); }

      // Step 4: Sync projects (case) totalAmount
      if (PROJECT_ID) {
        try {
          const isRetainer = linkedContract && String(linkedContract.contractType).toLowerCase() === 'retainer';
          let finalProjectAmount = totals.totalAmount;
          if (isRetainer) {
            const monthly = parseNum(linkedContract.monthlyFee);
            const duration = parseNum(linkedContract.retainerDuration);
            const vatRate = parseNum(linkedContract.packageVatRate ?? linkedContract.vatRate ?? 0);
            const sub = monthly * duration;
            finalProjectAmount = sub + (sub * vatRate / 100);
          }
          await ctx.api.request({
            url: 'projects:update', method: 'POST',
            params: { filterByTk: PROJECT_ID },
            data: { totalAmount: finalProjectAmount }
          });
        } catch (e) { message.warning('Không thể sync hồ sơ: ' + (e?.message || '')); }
      }

      // Step 5: Lifecycle cascade — if quotation is in "order" status
      if (QUOTATION_STATUS === 'order' && PROJECT_ID && existingPS.length > 0) {
        try {
          // 5a. Update status: pending_quote → ordered
          for (const ps of existingPS) {
            const psStatus = ps.status || 'pending_quote';
            if (psStatus === 'pending_quote') {
              await ctx.api.request({
                url: 'projectServices:update', method: 'POST',
                params: { filterByTk: ps.id },
                data: { status: 'ordered' },
              });
            }
          }

          // 5b. Create sub-contract if Case has main contract and no sub-contract for this quotation yet
          // Fetch project info to get contractId
          const projRes = await ctx.api.request({ url: 'projects:get', params: { filterByTk: PROJECT_ID } });
          const proj = projRes?.data?.data || projRes?.data || {};
          const contractId = proj.contractId && typeof proj.contractId === 'object' ? proj.contractId.id : proj.contractId;

          if (contractId) {
            // Check if sub-contract already exists
            const existContractRes = await ctx.api.request({
              url: 'contracts:list',
              params: { filter: JSON.stringify({ quotationId: { $eq: parseInt(QUOTATION_ID) } }), pageSize: 1 }
            });
            const alreadyHasContract = (existContractRes?.data?.data || []).length > 0;

            if (!alreadyHasContract) {
              // Fetch main contract info
              const mainContractRes = await ctx.api.request({ url: 'contracts:get', params: { filterByTk: contractId } });
              const mainContract = mainContractRes?.data?.data || mainContractRes?.data || {};
              const contractCode = mainContract.code || mainContract.contractCode || mainContract.contractNumber || contractId;

              // Fetch quotation (this sub-quotation) for info
              const thisQuotRes = await ctx.api.request({ url: 'quotations:get', params: { filterByTk: QUOTATION_ID } });
              const thisQuot = thisQuotRes?.data?.data || thisQuotRes?.data || {};

              const subContractTitle = `Sub-Contract of #${contractCode}`;
              await ctx.api.request({
                url: 'contracts:create', method: 'POST',
                data: {
                  parentId: parseInt(contractId),
                  parent_id: parseInt(contractId),
                  parent: parseInt(contractId),
                  parentContract: parseInt(contractId),
                  parentContractId: parseInt(contractId),
                  quotationId: parseInt(QUOTATION_ID),
                  cases: [parseInt(PROJECT_ID)],
                  customerId: extractId(thisQuot.customerId) || extractId(mainContract.customerId),
                  internalCompanyId: extractId(thisQuot.internalCompanyId) || extractId(mainContract.internalCompanyId),
                  lawyerId: extractId(mainContract.lawyerId),
                  issuedDate: new Date().toISOString(),
                  title: subContractTitle,
                  contractName: subContractTitle,
                  status: 'draft',
                  subTotal: totals.subTotal,
                  vatAmount: totals.vatAmount,
                  totalAmount: totals.totalAmount,
                },
              });

              // Update status → "contracted"
              for (const ps of existingPS) {
                await ctx.api.request({
                  url: 'projectServices:update', method: 'POST',
                  params: { filterByTk: ps.id },
                  data: { status: 'contracted' },
                });
              }
              message.success('📝 Đã tạo Phụ lục hợp đồng tự động');
            }
          }
        } catch (e) { message.warning('Lifecycle cascade: ' + (e?.message || '')); }
      }

      message.success('✅ Đã lưu và đồng bộ báo giá → dịch vụ hồ sơ → hợp đồng');
      setDirty(false);
      reload();
    } catch (e) { message.error('Lỗi: ' + (e?.message || 'Thử lại')); }
    setSaving(false);
  };

  const th = (extra = {}) => ({ padding: '10px 12px', fontSize: 11, fontFamily: FONT, fontWeight: 700, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.5, background: '#fafafa', borderBottom: '2px solid #f0f0f0', whiteSpace: 'nowrap', textAlign: 'left', ...extra });
  const td = (extra = {}) => ({ padding: '9px 12px', fontSize: 13, fontFamily: FONT, color: '#262626', borderBottom: '1px solid #f5f5f5', verticalAlign: 'middle', ...extra });
  const inp = (extra = {}) => ({ border: '1px solid #e8e8e8', borderRadius: 4, padding: '5px 8px', fontSize: 13, fontFamily: FONT, outline: 'none', background: '#fff', color: '#262626', boxSizing: 'border-box', width: '100%', ...extra });
  const fb = e => e.currentTarget.style.borderColor = '#1890ff';
  const bb = e => e.currentTarget.style.borderColor = '#e8e8e8';

  if (!QUOTATION_ID) return React.createElement('div', { style: { padding: 20, color: '#ff4d4f', fontFamily: FONT } }, '⚠️ Không tìm thấy Quotation ID trong URL');
  if (loading) return React.createElement('div', { style: { textAlign: 'center', padding: 48 } }, React.createElement(Spin, { size: 'large' }));

  return React.createElement('div', { style: { fontFamily: FONT, background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', overflow: 'hidden' } },

    // Header
    React.createElement('div', { style: { padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
        React.createElement(Text, { strong: true, style: { fontSize: 14, fontFamily: FONT, color: '#1a1a1a' } }, '💼 Dịch vụ báo giá'),
        isLocked
          ? React.createElement('span', { style: { fontSize: 14, lineHeight: 1 } }, '🔒')
          : dirty && React.createElement('span', { style: { fontSize: 11, fontFamily: FONT, color: '#d46b08', background: '#fff7e6', border: '1px solid #ffd591', padding: '2px 8px', borderRadius: 10 } }, '● Chưa lưu')),
      React.createElement('div', { style: { display: 'flex', gap: 8 } },
        React.createElement(Button, {
          onClick: () => setCompareModal({ open: true, data: null }),
          disabled: activeRows.length === 0,
          style: { borderRadius: 6, fontSize: 12 }
        }, "Review Changes"),
        !isLocked && React.createElement('div', { onClick: addRow, style: { padding: '6px 14px', borderRadius: 6, border: '1px dashed #1890ff', color: '#1890ff', cursor: 'pointer', fontSize: 12, fontFamily: FONT, fontWeight: 600 } }, '＋ Thêm dịch vụ'),
        React.createElement('div', { onClick: reload, style: { padding: '6px 12px', borderRadius: 6, border: '1px solid #e8e8e8', color: '#8c8c8c', cursor: 'pointer', fontSize: 12, fontFamily: FONT } }, '↻'))),

    React.createElement('div', { style: { padding: '14px 16px', borderBottom: '1px solid #f0f0f0', background: '#fff', display: 'grid', gridTemplateColumns: isPackageMode ? 'minmax(220px,0.8fr) minmax(520px,1.5fr)' : 'minmax(220px,1fr)', gap: 14, alignItems: 'start' } },
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 11, fontFamily: FONT, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 } }, 'Pricing mode'),
        React.createElement('div', { style: { display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 7, overflow: 'hidden' } },
          [
            [PRICING_MODE_LINE, 'Line pricing'],
            [PRICING_MODE_PACKAGE, 'Package pricing'],
          ].map(([mode, label]) => React.createElement('button', {
            key: mode,
            type: 'button',
            disabled: isLocked,
            onClick: () => handlePricingModeChange(mode),
            style: { border: 'none', borderRight: mode === PRICING_MODE_LINE ? '1px solid #e5e7eb' : 'none', background: pricingMode === mode ? C.primary : '#fff', color: pricingMode === mode ? '#fff' : C.text, padding: '8px 14px', fontSize: 12, fontFamily: FONT, fontWeight: 700, cursor: isLocked ? 'not-allowed' : 'pointer' }
          }, label))
        )
      ),
      isPackageMode && React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 100px minmax(150px,0.8fr) minmax(150px,0.8fr)', gap: 10, alignItems: 'end' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 11, fontFamily: FONT, fontWeight: 700, color: C.textSub, marginBottom: 6 } }, 'Package subtotal'),
          React.createElement(InputNumber, { value: packageSubTotal, min: 0, disabled: isLocked, onChange: updatePackageField(setPackageSubTotal), style: { width: '100%' }, formatter: v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'), parser: v => String(v || '').replace(/\./g, '').replace(/\s/g, '') })
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 11, fontFamily: FONT, fontWeight: 700, color: C.textSub, marginBottom: 6 } }, 'VAT %'),
          React.createElement(InputNumber, { value: packageVatRate, min: 0, max: 100, step: 0.1, disabled: isLocked, onChange: updatePackageField(setPackageVatRate), style: { width: '100%' } })
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 11, fontFamily: FONT, fontWeight: 700, color: C.textSub, marginBottom: 6 } }, 'VAT amount'),
          React.createElement('div', { style: { border: '1px solid #e5e7eb', borderRadius: 4, padding: '6px 8px', background: C.bgSection, textAlign: 'right', fontFamily: FONT, fontWeight: 700 } }, fmtVND(packageTotals.vatAmount))
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 11, fontFamily: FONT, fontWeight: 700, color: C.textSub, marginBottom: 6 } }, 'Package total'),
          React.createElement('div', { style: { border: '1px solid #bbf7d0', borderRadius: 4, padding: '6px 8px', background: '#ecfdf5', color: '#16a34a', textAlign: 'right', fontFamily: FONT, fontWeight: 800 } }, fmtVND(packageTotals.totalAmount))
        )
      )
    ),

    // Table
    React.createElement('div', { style: { overflowX: 'auto' } },
      React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 720 } },
        React.createElement('thead', null,
          React.createElement('tr', null,
            React.createElement('th', { style: th({ width: 36, textAlign: 'center' }) }, '#'),
            React.createElement('th', { style: th({ minWidth: 250 }) }, 'Dịch vụ & Loại'),
            React.createElement('th', { style: th({ minWidth: 250 }) }, 'Mô tả'),
            React.createElement('th', { style: th({ width: 150, textAlign: 'right' }) }, 'Đơn giá (₫)'),
            React.createElement('th', { style: th({ width: 80, textAlign: 'right' }) }, 'VAT (%)'),
            React.createElement('th', { style: th({ width: 140, textAlign: 'right', color: '#096dd9' }) }, 'Thành tiền'),
            React.createElement('th', { style: th({ width: 90, textAlign: 'center' }) }, 'Action'))),
        React.createElement('tbody', null,
          activeRows.length === 0
            ? React.createElement('tr', null,
              React.createElement('td', { colSpan: 7, style: td({ textAlign: 'center', color: '#bfbfbf', padding: '36px 0' }) },
                '📭 Chưa có dịch vụ nào — nhấn "＋ Thêm dịch vụ"'))
            : activeRows.map((r, i) => {
              const line = isPackageMode ? calcLine(0, 1, 0) : calcLine(r._basePrice, 1, r._vat);
              return React.createElement('tr', { key: r.id, style: { background: i % 2 === 0 ? '#fff' : '#fafafe' } },

                // STT
                React.createElement('td', { style: td({ textAlign: 'center', color: '#8c8c8c', fontSize: 12, fontWeight: 600 }) }, i + 1),

                // Dịch vụ
                React.createElement('td', { style: td() },
                  React.createElement('div', {
                    onClick: () => { if (!isLocked) openServiceModal(r.id); },
                    style: {
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      border: '1px dashed #d9d9d9',
                      borderRadius: 6,
                      padding: '8px 12px',
                      background: '#fafafa',
                      minHeight: 46,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    },
                    onMouseEnter: e => { if (!isLocked) { e.currentTarget.style.borderColor = '#1890ff'; e.currentTarget.style.background = '#e6f7ff'; } },
                    onMouseLeave: e => { if (!isLocked) { e.currentTarget.style.borderColor = '#d9d9d9'; e.currentTarget.style.background = '#fafafa'; } },
                  },
                    (!r.serviceId && !r._svcName)
                      ? React.createElement('div', { style: { color: '#8c8c8c', textAlign: 'center', fontSize: 13, fontStyle: 'italic' } }, '— Select service —')
                      : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                        React.createElement('span', { style: { fontWeight: 600, color: C.text, fontSize: 13, wordBreak: 'break-word' } }, r._svcName),
                        r._serviceType && React.createElement('div', { style: { display: 'flex' } },
                          React.createElement(Tag, { color: 'blue', style: { margin: 0, fontSize: 11 } }, r._serviceType)
                        )
                      )
                  )
                ),

                // Mô tả
                React.createElement('td', { style: td() },
                  React.createElement(EditableCell, {
                    value: r._description,
                    onSave: val => updateRow(r.id, '_description', val),
                    disabled: isLocked,
                    isTextArea: true
                  })
                ),


                // Đơn giá — format xx.000.000
                React.createElement('td', { style: td({ textAlign: 'right' }) },
                  isPackageMode
                    ? React.createElement('span', { style: { color: C.primary, fontWeight: 700, fontSize: 12 } }, 'Included in package')
                    : React.createElement(EditableCell, {
                      value: r._basePrice,
                      onSave: val => updateRow(r.id, '_basePrice', val),
                      disabled: isLocked,
                      isNumber: true
                    })
                ),

                // VAT
                React.createElement('td', { style: td({ textAlign: 'right' }) },
                  isPackageMode
                    ? React.createElement('span', { style: { color: C.textSub, fontSize: 12 } }, '0%')
                    : React.createElement(EditableCell, {
                      value: r._vat,
                      onSave: val => updateRow(r.id, '_vat', val),
                      disabled: isLocked,
                      isNumber: true
                    })
                ),

                // Computed readonly
                React.createElement('td', { style: td({ textAlign: 'right', fontWeight: 700, color: '#096dd9', fontSize: 14, whiteSpace: 'nowrap' }) }, isPackageMode ? '—' : fmtVND(line.totalAmount)),

                // Action — Review và Xoá
                React.createElement('td', { style: td({ textAlign: 'center', padding: '0 8px' }) },
                  React.createElement('div', { style: { display: 'flex', gap: 4, justifyContent: 'center' } },
                    React.createElement(Button, {
                      size: "small",
                      type: "link",
                      onClick: () => setCompareModal({ open: true, data: r }),
                      style: { padding: "0 4px" }
                    }, "Review"),
                    !isLocked && React.createElement('div', {
                      onClick: () => deleteRow(r.id),
                      style: { cursor: 'pointer', color: '#cf1322', fontSize: 16, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
                      onMouseEnter: e => e.currentTarget.style.background = '#fff1f0',
                      onMouseLeave: e => e.currentTarget.style.background = 'transparent',
                      title: "Xoá"
                    }, '🗑')
                  )
                )
              );
            })))),

    // Totals
    activeRows.length > 0 && React.createElement('div', { style: { borderTop: '2px solid #f0f0f0', padding: '16px 20px', background: '#fafafa', display: 'flex', justifyContent: 'flex-end' } },
      React.createElement('div', { style: { minWidth: 320 } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #f0f0f0' } },
          React.createElement(Text, { style: { fontSize: 13, fontFamily: FONT, color: '#595959' } }, 'Tạm tính (chưa VAT):'),
          React.createElement(Text, { style: { fontSize: 13, fontFamily: FONT, fontWeight: 600 } }, fmtVND(totals.subTotal))),
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' } },
          React.createElement(Text, { style: { fontSize: 13, fontFamily: FONT, color: '#d46b08' } }, 'Tổng tiền VAT:'),
          React.createElement(Text, { style: { fontSize: 13, fontFamily: FONT, fontWeight: 600, color: '#d46b08' } }, fmtVND(totals.vatAmount))),
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '10px 0 0' } },
          React.createElement(Text, { strong: true, style: { fontSize: 15, fontFamily: FONT, color: '#1a1a1a' } }, 'Tổng cộng:'),
          React.createElement(Text, { strong: true, style: { fontSize: 20, fontFamily: FONT, color: '#389e0d' } }, fmtVND(totals.totalAmount))))),

    // Footer — chỉ hiện khi dirty VÀ không bị lock
    React.createElement('div', {
      style: {
        overflow: 'hidden',
        maxHeight: (dirty && !isLocked) ? 64 : 0,
        opacity: (dirty && !isLocked) ? 1 : 0,
        transition: 'max-height 0.25s ease, opacity 0.2s ease',
      },
    },
      React.createElement('div', { style: { padding: '12px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8 } },
        React.createElement('div', {
          onClick: reload,
          style: { padding: '7px 18px', borderRadius: 6, border: '1px solid #e8e8e8', cursor: 'pointer', fontSize: 13, fontFamily: FONT, color: '#595959' },
        }, 'Huỷ thay đổi'),
        React.createElement('div', {
          onClick: saving ? null : handleSave,
          style: {
            padding: '7px 28px', borderRadius: 6, fontSize: 13, fontFamily: FONT, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            background: saving ? '#f5f5f5' : '#1890ff',
            color: saving ? '#bfbfbf' : '#fff',
            border: `1.5px solid ${saving ? '#e8e8e8' : '#1890ff'}`,
            boxShadow: saving ? 'none' : '0 2px 8px rgba(24,144,255,0.25)',
            transition: 'all 0.15s',
          },
        }, saving ? '⏳ Đang lưu...' : '💾 Lưu & Cập nhật báo giá'))),

    // COMPARE MODAL
    React.createElement(Modal, {
      title: compareModal.data ? "So sánh Dịch vụ gốc" : "Review Service Changes",
      open: compareModal.open,
      onCancel: () => setCompareModal({ open: false, data: null }),
      footer: React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
        compareModal.data && React.createElement(Button, {
          onClick: () => setCompareModal({ open: true, data: null })
        }, "Quay lại danh sách"),
        React.createElement(Button, {
          type: "primary",
          onClick: () => setCompareModal({ open: false, data: null }),
          style: { background: C.primary }
        }, "Đóng")
      ),
      width: compareModal.data ? 900 : 1000,
      bodyStyle: { paddingTop: 16 }
    }, compareModal.open && (
      compareModal.data ? renderCompareDetail(compareModal.data) : renderCompareList()
    )),

    // SELECT SERVICE MODAL
    React.createElement(Modal, {
      title: null,
      open: showSvcModal,
      onCancel: () => setShowSvcModal(false),
      footer: null,
      width: 800,
      bodyStyle: { padding: '24px 24px 16px' }
    },
      modalView === 'select'
        ? React.createElement('div', null,
            // Header
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } },
              React.createElement('span', { style: { fontSize: 18, fontWeight: 700, color: '#1f2937', fontFamily: FONT } }, 'Select Service'),
              React.createElement('span', {
                onClick: () => setShowSvcModal(false),
                style: { cursor: 'pointer', color: '#9ca3af', fontSize: 15, fontFamily: FONT, fontWeight: 500 }
              }, 'Close')
            ),
            // Search Bar & Create New Button
            React.createElement('div', { style: { display: 'flex', gap: 10, marginBottom: 16 } },
              React.createElement(Input, {
                placeholder: 'Search service name...',
                value: svcSearch,
                onChange: e => setSvcSearch(e.target.value),
                style: { flex: 1, borderRadius: 6, height: 38 }
              }),
              React.createElement(Button, {
                type: 'primary',
                onClick: () => setModalView('create'),
                style: { background: '#10b981', borderColor: '#10b981', height: 38, borderRadius: 6, fontWeight: 600 }
              }, 'Create new')
            ),
            // Services Table List
            React.createElement('div', { style: { maxHeight: 380, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 } },
              React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontFamily: FONT } },
                React.createElement('thead', null,
                  React.createElement('tr', null,
                    React.createElement('th', { style: { padding: '10px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280', fontWeight: 600, width: 40, textAlign: 'center' } }, '#'),
                    React.createElement('th', { style: { padding: '10px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280', fontWeight: 600, textAlign: 'left' } }, 'Service Name'),
                    React.createElement('th', { style: { padding: '10px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280', fontWeight: 600, width: 150, textAlign: 'left' } }, 'Type'),
                    React.createElement('th', { style: { padding: '10px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280', fontWeight: 600, width: 140, textAlign: 'right' } }, 'Unit Price (₫)'),
                    React.createElement('th', { style: { padding: '10px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280', fontWeight: 600, width: 90, textAlign: 'center' } }, ''))),
                React.createElement('tbody', null,
                  svcOpts
                    .filter(o => {
                      const name = o.serviceName || o.name || '';
                      return normalizeLookupText(name).includes(normalizeLookupText(svcSearch));
                    })
                    .map((o, idx) => {
                      const isUsedElsewhere = usedServiceIds.has(o.id) && String(o.id) !== String(rows.find(r => r.id === activeRowId)?.serviceId);
                      const isInCase = psServiceIds.has(String(o.id)) && String(o.id) !== String(rows.find(r => r.id === activeRowId)?.serviceId);
                      const isDisabled = isUsedElsewhere || isInCase;
                      const price = o.basePrice ?? o.unitPrice ?? o.price ?? 0;
                      return React.createElement('tr', { key: o.id, style: { borderBottom: '1px solid #f3f4f6' } },
                        React.createElement('td', { style: { padding: '12px', fontSize: 13, color: '#6b7280', textAlign: 'center' } }, idx + 1),
                        React.createElement('td', { style: { padding: '12px', textAlign: 'left' } },
                          React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
                            React.createElement('span', { style: { fontWeight: 600, color: '#1f2937', fontSize: 14 } }, o.serviceName),
                            o.description && React.createElement('span', { style: { fontSize: 12, color: '#9ca3af', marginTop: 2, wordBreak: 'break-word' } }, o.description)
                          )
                        ),
                        React.createElement('td', { style: { padding: '12px', textAlign: 'left' } },
                          o.serviceType && React.createElement(Tag, { color: 'blue', style: { fontSize: 11 } }, o.serviceType)
                        ),
                        React.createElement('td', { style: { padding: '12px', textAlign: 'right', fontSize: 13, fontWeight: 500 } }, fmtVND(price)),
                        React.createElement('td', { style: { padding: '12px', textAlign: 'center' } },
                          React.createElement(Button, {
                            size: 'small',
                            type: 'primary',
                            disabled: isDisabled,
                            onClick: () => handleSelectCatalogService(o),
                            style: { background: isDisabled ? '#e5e7eb' : '#1a3a5c', borderColor: isDisabled ? '#e5e7eb' : '#1a3a5c', borderRadius: 4, fontSize: 12, fontWeight: 600 }
                          }, isUsedElsewhere ? 'Selected' : isInCase ? 'In Case' : 'Select')
                        )
                      );
                    })
                )
              )
            ),
            // Footer Close Button
            React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: 14 } },
              React.createElement(Button, {
                onClick: () => setShowSvcModal(false),
                style: { borderRadius: 6, width: 100 }
              }, 'Close')
            )
          )
        : React.createElement('div', null,
            // Header
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } },
              React.createElement('span', {
                onClick: () => setModalView('select'),
                style: { cursor: 'pointer', color: '#1890ff', fontSize: 14, fontFamily: FONT, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }
              }, '← Back'),
              React.createElement('span', { style: { fontSize: 18, fontWeight: 700, color: '#1f2937', fontFamily: FONT } }, 'Create New Service'),
              React.createElement('span', {
                onClick: () => setShowSvcModal(false),
                style: { cursor: 'pointer', color: '#9ca3af', fontSize: 15, fontFamily: FONT, fontWeight: 500 }
              }, 'Close')
            ),
            // Form body
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24, fontFamily: FONT } },
              React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 } }, 'Service Name *'),
                React.createElement(Input, {
                  placeholder: 'e.g., Labor contract consulting...',
                  value: newSvcName,
                  onChange: e => setNewSvcName(e.target.value),
                  style: { borderRadius: 6, height: 38 }
                })
              ),
              React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 } }, 'Service Type optional'),
                React.createElement(Input, {
                  placeholder: 'e.g., Consulting, Legal...',
                  value: newSvcType,
                  onChange: e => setNewSvcType(e.target.value),
                  style: { borderRadius: 6, height: 38 }
                })
              ),
              React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 } }, 'Unit Price (₫) *'),
                React.createElement(InputNumber, {
                  value: newUnitPrice,
                  onChange: v => setNewUnitPrice(v || 0),
                  min: 0,
                  style: { width: '100%', borderRadius: 6, height: 38 },
                  formatter: v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
                  parser: v => v.replace(/\./g, '').replace(/\s/g, ''),
                  placeholder: '0'
                })
              ),
              React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 } }, 'Description optional'),
                React.createElement(Input.TextArea, {
                  placeholder: 'Scope of work, notes...',
                  value: newDescription,
                  onChange: e => setNewDescription(e.target.value),
                  autoSize: { minRows: 3, maxRows: 6 },
                  style: { borderRadius: 6 }
                })
              )
            ),
            // Footer
            React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #e5e7eb', paddingTop: 14 } },
              React.createElement(Button, {
                onClick: () => setModalView('select'),
                style: { borderRadius: 6, width: 100 }
              }, 'Cancel'),
              React.createElement(Button, {
                type: 'primary',
                onClick: handleCreateCustomService,
                style: { background: '#1a3a5c', borderColor: '#1a3a5c', borderRadius: 6, width: 140, fontWeight: 600 }
              }, 'Save & Select')
            )
          )
    )
  );
};

ctx.render(React.createElement(QuotationServicesBlock, null));
