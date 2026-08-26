    const { useState, useEffect, useMemo } = ctx.React;
    const { Table, Button, Modal, Form, Select, Input, InputNumber, message, Popconfirm, Tag, Tooltip, Spin, Card, Space, Typography, Descriptions, theme } = ctx.antd;
    const { React } = ctx;
    const { Text } = Typography;

    const FONT = "inherit";
    const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    const C = {
      border: "#d9d9d9",
      borderFocus: "#1677ff",
      borderStrong: "#d9d9d9",
      text: "rgba(0, 0, 0, 0.88)",
      textSub: "rgba(0, 0, 0, 0.45)",
      textLabel: "rgba(0, 0, 0, 0.88)",
      muted: "rgba(0, 0, 0, 0.25)",
      primary: "#1677ff",
      primaryHover: "#4096ff",
      primarySoft: "#e6f4ff",
      info: "#1677ff",
      success: "#52c41a",
      successText: "#389e0d",
      warning: "#faad14",
      warningText: "#d48806",
      danger: "#ff4d4f",
      dangerText: "#cf1322",
      bg: "#ffffff",
      bgCard: "#ffffff",
      bgSection: "#fafafa",
      bgSubtle: "#fafafa",
      bgHighlight: "#fafafa",
      borderHighlight: "#d9d9d9",
    };
    const DS = {
      radius: { xs: 4, sm: 6, md: 8, pill: 999 },
      shadow: { panel: "none" },
      card: {
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "visible",
        width: "100%",
        boxSizing: "border-box",
      },
      header: {
        padding: "12px 16px",
        borderBottom: `1px solid ${C.border}`,
        background: C.bgSection,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      },
      section: {
        padding: "14px 16px",
        borderBottom: `1px solid ${C.border}`,
        background: C.bg,
      },
      label: {
        fontSize: 11.5,
        fontWeight: 700,
        color: C.textSub,
        textTransform: "uppercase",
        letterSpacing: 0,
      },
      primaryButton: {
        background: C.primary,
        borderColor: C.primary,
        borderRadius: 6,
        fontWeight: 600,
      },
      secondaryButton: {
        borderColor: C.borderStrong,
        borderRadius: 6,
        color: C.text,
      },
      infoBox: {
        padding: "10px 14px",
        background: C.primarySoft,
        border: "1px solid #91caff",
        borderRadius: 6,
        color: "#0958d9",
        fontSize: 13,
        lineHeight: 1.55,
      },
    };
    const FALLBACK_TOKEN = {
      colorPrimary: C.primary,
      colorInfo: C.info,
      colorSuccess: C.success,
      colorWarning: C.warning,
      colorError: C.danger,
      colorText: C.text,
      colorTextSecondary: C.textSub,
      colorTextTertiary: C.muted,
      colorBgContainer: C.bg,
      colorFillAlter: C.bgSection,
      colorFillQuaternary: C.bgSubtle,
      colorBorder: C.border,
      colorBorderSecondary: C.border,
      colorSplit: C.border,
      borderRadius: 6,
      borderRadiusSM: 4,
      controlHeight: 32,
      paddingXXS: 4,
      paddingXS: 8,
      paddingSM: 12,
      padding: 16,
      paddingLG: 24,
      marginXS: 8,
      marginSM: 12,
      margin: 16,
      fontSize: 14,
      fontSizeSM: 12,
      fontFamily: "inherit",
      fontFamilyCode: FONT_MONO,
      lineWidth: 1,
      lineType: "solid",
    };
    const useNocoToken = () => {
      const result = theme && typeof theme.useToken === "function" ? theme.useToken() : null;
      return result?.token || FALLBACK_TOKEN;
    };
    const createNocoStyles = (token = FALLBACK_TOKEN) => ({
      section: {
        padding: `${token.paddingSM}px ${token.padding}px`,
        borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorSplit || token.colorBorderSecondary}`,
        background: token.colorBgContainer,
      },
    });

    const QUOTATION_POPUP_UID = "v44ehxkcghx";
    const CONTRACT_POPUP_UID = "41125dcba6c";
    const DETAIL_VIEW_ROUTES = {
      contract: `${window.location.origin}/admin/xosxz5frfxb/view/869cc2fcc6b/filterbytk/140`,
      quotation: `${window.location.origin}/admin/rbb1k7y0c66/view/kt1n5ljd4rc/filterbytk/367584843202560`,
    };
    const QUOTE_LOCKED_STATUSES = ["sent", "order", "ordered", "won", "done", "cancelled", "approved", "accepted"];
    const CONTRACT_ACTIVE_STATUSES = ["execution", "active", "signed"];
    const TERMINAL_SERVICE_STATUSES = ["completed", "cancelled", "deleted"];
    const CASE_DOCUMENT_SCOPE = "case_document";
    const AUTO_CREATE_QUOTE_CONTRACT_FOLDERS = false;
    const ENFORCE_SERVICE_EDIT_LOCKS = false;
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

    // ==================== MULTI-CURRENCY HELPERS (mirrors CaseCreateForm.js) ====================
    const DEFAULT_CURRENCY_CODE = "VND";
    const CURRENCY_RESOURCE_CANDIDATES = ["currencies:list", "currency:list", "Currency:list"];
    const extractCurrencyId = (value) => {
      if (!value) return null;
      if (Array.isArray(value)) return extractCurrencyId(value[0]);
      if (typeof value === "object") return extractCurrencyId(value.id || value.value || value.key);
      const parsed = parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const extractCurrencyCode = (value) => {
      if (!value) return "";
      if (Array.isArray(value)) return extractCurrencyCode(value[0]);
      if (typeof value === "object")
        return extractCurrencyCode(
          value.code || value.currencyCode || value.isoCode || value.title || value.label || value.name,
        );
      const match = String(value).trim().toUpperCase().match(/\b[A-Z]{3}\b/);
      return match ? match[0] : "";
    };
    const getRecordCurrencyId = (record) =>
      extractCurrencyId(
        record?.currencyId || record?.currency || record?.currencies ||
        record?.defaultCurrencyId || record?.defaultCurrency,
      );
    const getRecordCurrencyCode = (record) =>
      extractCurrencyCode(
        record?.currencyCode || record?.currency || record?.currencies ||
        record?.defaultCurrencyCode || record?.defaultCurrency,
      );
    const getCurrencyCode = (currency) =>
      String(currency?.code || currency?.currencyCode || currency?.name || DEFAULT_CURRENCY_CODE).toUpperCase();
    const getCurrencyDecimals = (currency) => {
      const explicit = Number(currency?.decimalPlaces ?? currency?.precision);
      if (Number.isFinite(explicit)) return Math.max(0, explicit);
      return getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE ? 0 : 2;
    };
    const getCurrencyLocale = (currency) =>
      currency?.locale || (getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE ? "vi-VN" : "en-US");
    const defaultCurrencyObject = () => ({ code: DEFAULT_CURRENCY_CODE, symbol: "VND", decimalPlaces: 0, locale: "vi-VN" });
    const findCurrencyById = (currencies = [], id) => {
      const safeId = extractCurrencyId(id);
      if (!safeId) return null;
      return currencies.find((currency) => extractCurrencyId(currency?.id) === safeId) || null;
    };
    const findCurrencyByCode = (currencies = [], code) => {
      const safeCode = extractCurrencyCode(code);
      if (!safeCode) return null;
      return currencies.find((currency) => extractCurrencyCode(currency) === safeCode) || null;
    };
    const currencyObjectFromCode = (code) => {
      const safeCode = extractCurrencyCode(code);
      return safeCode ? { code: safeCode, currencyCode: safeCode, decimalPlaces: safeCode === DEFAULT_CURRENCY_CODE ? 0 : 2 } : null;
    };
    const resolveCurrency = (value, currencies = []) => {
      const source = Array.isArray(value) ? value[0] : value;
      return (
        findCurrencyById(currencies, source) ||
        findCurrencyByCode(currencies, source) ||
        (typeof source === "object" && extractCurrencyCode(source) ? source : null) ||
        currencyObjectFromCode(source)
      );
    };
    const currencyFromRecord = (record, currencies = [], fallback = null) =>
      resolveCurrency(record?.currency || record?.currencies || record?.currencyId, currencies) ||
      resolveCurrency(getRecordCurrencyId(record), currencies) ||
      resolveCurrency(getRecordCurrencyCode(record), currencies) ||
      fallback ||
      currencies.find((c) => getCurrencyCode(c) === DEFAULT_CURRENCY_CODE) ||
      defaultCurrencyObject();
    const isSameCurrency = (left, right) => {
      const leftId = extractCurrencyId(left);
      const rightId = extractCurrencyId(right);
      if (leftId && rightId) return leftId === rightId;
      const leftCode = extractCurrencyCode(left) || getCurrencyCode(left || {});
      const rightCode = extractCurrencyCode(right) || getCurrencyCode(right || {});
      return !!leftCode && !!rightCode && leftCode === rightCode;
    };
    const formatMoneyAmount = (value, currency = null) => {
      if (!value && value !== 0) return "â€”";
      const info = currency || defaultCurrencyObject();
      const n = Number(value);
      if (!Number.isFinite(n)) return "â€”";
      const decimals = getCurrencyDecimals(info);
      return n.toLocaleString(getCurrencyLocale(info), { minimumFractionDigits: 0, maximumFractionDigits: decimals });
    };
    const formatMoney = (value, currency = null) => {
      if (!value && value !== 0) return "â€”";
      const info = currency || defaultCurrencyObject();
      return `${formatMoneyAmount(value, info)} ${getCurrencyCode(info)}`;
    };
    async function fetchAllFromCandidates(urls = []) {
      for (const url of urls) {
        try {
          const res = await ctx.api.request({ url, params: { pageSize: 500, page: 1 } });
          const rows = res?.data?.data || [];
          if (Array.isArray(rows) && rows.length) return rows;
        } catch { }
      }
      return [];
    }
    const parseDateMillis = (value) => {
      if (!value) return null;
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : null;
    };
    // exchangeRates real schema (confirmed via Nocobase "Configure fields"):
    // fromCurrencyId, toCurrencyId (bigint scalars), rate (double), effectiveDate,
    // status. Both directions can have their own row (e.g. USD->VND and VND->USD),
    // so match by the (fromCurrencyId, toCurrencyId) pair rather than a single side.
    const getExchangeRateValue = (rate) => parseNum(rate?.rate);
    const isUsableExchangeRateStatus = (status) => {
      const value = String(status || "").trim().toLowerCase();
      if (!value) return true;
      return !["inactive", "disabled", "archived", "cancelled", "canceled", "draft"].includes(value);
    };
    const pickExchangeRate = (rates = [], fromCurrency, toCurrency, pricingDate) => {
      const fromId = extractCurrencyId(fromCurrency);
      const toId = extractCurrencyId(toCurrency);
      const cutoff = parseDateMillis(pricingDate) || Date.now();
      return (rates || [])
        .map((rate) => {
          const effectiveMs = parseDateMillis(rate?.effectiveDate);
          return {
            record: rate,
            rate: getExchangeRateValue(rate),
            effectiveMs: effectiveMs || 0,
            rateFromId: extractCurrencyId(rate?.fromCurrencyId ?? rate?.fromCurrency),
            rateToId: extractCurrencyId(rate?.toCurrencyId ?? rate?.toCurrency),
          };
        })
        .filter((item) =>
          item.rate > 0 &&
          isUsableExchangeRateStatus(item.record?.status) &&
          (!item.effectiveMs || item.effectiveMs <= cutoff) &&
          item.rateFromId === fromId &&
          item.rateToId === toId,
        )
        .sort((a, b) => b.effectiveMs - a.effectiveMs)[0] || null;
    };
    const pickConversionRate = (rates = [], fromCurrency, toCurrency, pricingDate) => {
      const direct = pickExchangeRate(rates, fromCurrency, toCurrency, pricingDate);
      if (direct) return { ...direct, direction: "direct" };
      const inverse = pickExchangeRate(rates, toCurrency, fromCurrency, pricingDate);
      if (inverse?.rate > 0) {
        return { ...inverse, direction: "inverse", originalRate: inverse.rate, rate: 1 / inverse.rate };
      }
      return null;
    };
    async function fetchExchangeRatesForConversion(fromCurrencyIds = [], toCurrencyId) {
      const toId = extractCurrencyId(toCurrencyId);
      const fromIds = Array.from(
        new Set((fromCurrencyIds || []).map((id) => extractCurrencyId(id)).filter((id) => id && id !== toId)),
      );
      if (!toId || !fromIds.length) return [];
      try {
        const r = await ctx.api.request({
          url: "exchangeRates:list",
          params: {
            pageSize: Math.max(100, fromIds.length * 5),
            page: 1,
            sort: ["-effectiveDate", "-createdAt"],
            filter: JSON.stringify({
              $or: [
                { fromCurrencyId: { $in: fromIds }, toCurrencyId: { $eq: toId } },
                { fromCurrencyId: { $eq: toId }, toCurrencyId: { $in: fromIds } },
              ],
            }),
          },
        });
        return r?.data?.data || [];
      } catch {
        return [];
      }
    }
    const findDefaultCurrency = (currencies = []) =>
      currencies.find((currency) => currency?.isBaseCurrency || getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE) ||
      currencies[0] || defaultCurrencyObject();
    const currencySelectLabel = (currency) => {
      const code = getCurrencyCode(currency);
      const name = currency?.currencyName || currency?.name || "";
      return name && name !== code ? `${code} - ${name}` : code;
    };
    const getCurrencySelectValue = (currency) => {
      const id = extractCurrencyId(currency);
      return id ? String(id) : getCurrencyCode(currency);
    };
    const roundMoneyForCurrency = (value, currency = null) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return 0;
      const decimals = getCurrencyDecimals(currency || defaultCurrencyObject());
      const factor = Math.pow(10, decimals);
      return Math.round(n * factor) / factor;
    };
    const isPackagePricing = (recordOrMode) => {
      const mode = typeof recordOrMode === "object" ? recordOrMode?.pricingMode : recordOrMode;
      return String(mode || "").toLowerCase() === PRICING_MODE_PACKAGE;
    };
    const inferVatRate = (subTotal, vatAmount, fallback = 0) => {
      const sub = parseNum(subTotal);
      return sub ? Math.round((parseNum(vatAmount) * 10000) / sub) / 100 : parseNum(fallback);
    };
    const calcPackageTotals = (record = {}, currency = null) => {
      const moneyCurrency = currency || defaultCurrencyObject();
      const subTotal = parseNum(record.packageSubTotal ?? record.subTotal);
      const totalAmount = parseNum(record.packageTotalAmount ?? record.totalAmount ?? record.grandTotal);
      const vatAmount =
        parseNum(record.packageVatAmount ?? record.vatAmount) ||
        (totalAmount && subTotal ? Math.max(totalAmount - subTotal, 0) : 0);
      const vatRate = parseNum(record.packageVatRate ?? record.vatRate) || inferVatRate(subTotal, vatAmount, 0);
      const fallbackVatAmount = roundMoneyForCurrency((subTotal * vatRate) / 100, moneyCurrency);
      return {
        subTotal,
        vatRate,
        vatAmount: vatAmount || fallbackVatAmount,
        totalAmount: totalAmount || subTotal + (vatAmount || fallbackVatAmount),
      };
    };
    const calcLine = (basePrice, quantity, vat, currency = null) => {
      const subTotal = parseNum(basePrice) * (parseNum(quantity) || 1);
      const vatAmount = roundMoneyForCurrency((subTotal * parseNum(vat)) / 100, currency);
      return { subTotal, vatAmount, totalAmount: subTotal + vatAmount };
    };
    const buildServicePricingPayload = ({
      pricingMode,
      basePrice,
      quantity = 1,
      vat,
      packageSubTotal,
      packageVatRate,
      currency = null,
      vndCurrency = null,
      exchangeRatesToVnd = [],
      pricingDate = null,
    }) => {
      const targetVnd = vndCurrency || defaultCurrencyObject();
      if (isPackagePricing(pricingMode)) {
        const totals = calcPackageTotals({ packageSubTotal, packageVatRate }, targetVnd);
        return {
          pricingMode: PRICING_MODE_PACKAGE,
          basePrice: 0,
          quantity: 1,
          vat: 0,
          subTotal: 0,
          vatAmount: 0,
          totalAmount: 0,
          exchangeRateToBase: 1,
          packageSubTotal: totals.subTotal,
          packageVatRate: parseNum(packageVatRate),
          packageVatAmount: totals.vatAmount,
          packageTotalAmount: totals.totalAmount,
          _convertible: true,
        };
      }
      const qty = parseNum(quantity) || 1;
      const native = calcLine(basePrice, qty, vat, currency);
      let exchangeRateToBase = 1;
      let convertible = true;
      if (!isSameCurrency(currency, targetVnd)) {
        const matched = pickConversionRate(exchangeRatesToVnd, currency, targetVnd, pricingDate);
        if (matched?.rate) {
          exchangeRateToBase = matched.rate;
        } else {
          convertible = false;
        }
      }
      const subTotal = convertible ? roundMoneyForCurrency(native.subTotal * exchangeRateToBase, targetVnd) : null;
      const vatAmount = convertible ? roundMoneyForCurrency(native.vatAmount * exchangeRateToBase, targetVnd) : null;
      return {
        pricingMode: PRICING_MODE_LINE,
        basePrice: parseNum(basePrice),
        quantity: qty,
        vat: parseNum(vat),
        subTotal,
        vatAmount,
        totalAmount: convertible ? subTotal + vatAmount : null,
        exchangeRateToBase,
        packageSubTotal: 0,
        packageVatRate: 0,
        packageVatAmount: 0,
        packageTotalAmount: 0,
        _convertible: convertible,
      };
    };
    const isDeletedServiceLine = (record = {}) =>
      String(record?.status || record?.lineStatus || "").toLowerCase().trim() === "deleted";
    const isServiceEditLocked = (record = {}) =>
      ENFORCE_SERVICE_EDIT_LOCKS &&
      (
        !!record._isMainQuote ||
        (record._qStatus && QUOTE_LOCKED_STATUSES.includes(record._qStatus))
      );
    const COMMERCIAL_STATUS = {
      pending_quote: {
        color: "#1677ff",
        bg: "#e6f4ff",
        border: "#91caff",
        label: "No quotation yet",
        description: "The service has been added to the case but has no quotation yet. The team can still start working on it.",
      },
      quote_draft: {
        color: "#0891b2",
        bg: "#ecfeff",
        border: "#67e8f9",
        label: "Quotation in draft",
        description: "The quotation has been created but not yet sent or submitted for approval.",
      },
      quote_pending_approval: {
        color: "#7c3aed",
        bg: "#f5f3ff",
        border: "#c4b5fd",
        label: "Quotation pending approval",
        description: "The quotation is waiting for an authorized approver before it can be sent to the customer.",
      },
      quote_sent: {
        color: "#2563eb",
        bg: "#eff6ff",
        border: "#93c5fd",
        label: "Quotation sent",
        description: "The quotation has been sent to the customer or is ready and awaiting a response.",
      },
      ordered: {
        color: "#d46b08",
        bg: "#fff7e6",
        border: "#ffd591",
        label: "Customer accepted quotation",
        description: "The customer has accepted the quotation. A contract or contract appendix can now be created.",
      },
      contracted: {
        color: "#7c3aed",
        bg: "#f5f3ff",
        border: "#c4b5fd",
        label: "Contract exists",
        description: "The service already has a contract/appendix, pending signature or not yet marked as active.",
      },
      contract_pending_signature: {
        color: "#be185d",
        bg: "#fdf2f8",
        border: "#f9a8d4",
        label: "Awaiting contract signature",
        description: "The contract/appendix has been sent or is at the signing step.",
      },
      active: {
        color: "#389e0d",
        bg: "#f6ffed",
        border: "#b7eb8f",
        label: "Contract active",
        description: "The contract has been signed or is being executed. The service continues to be tracked in the case as usual.",
      },
      quote_and_contract: {
        color: "#1d39c4",
        bg: "#f0f5ff",
        border: "#adc6ff",
        label: "Has quotation and contract",
        description: "The service has both a related quotation and contract.",
      },
      completed: {
        color: "#595959",
        bg: "#f5f5f5",
        border: "#d9d9d9",
        label: "Completed",
        description: "The service has been completed.",
      },
      cancelled: {
        color: "#cf1322",
        bg: "#fff1f0",
        border: "#ffa39e",
        label: "Cancelled",
        description: "The service or its related quotation has been cancelled.",
      },
      deleted: {
        color: "#8c8c8c",
        bg: "#f5f5f5",
        border: "#d9d9d9",
        label: "Deleted",
        description: "Service has been removed from active work.",
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
      restore: [
        "M3 12a9 9 0 1 0 3-6.7",
        "M3 4v6h6",
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
          background: primary ? actionColor : C.bg,
          borderColor: primary ? actionColor : (danger ? "#fecdd3" : C.borderStrong),
          borderRadius: DS.radius.pill,
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
    // Currency-aware money draft formatting: VND (0 decimals) keeps the
    // dot-thousands-only behavior; currencies with decimalPlaces > 0 (per
    // getCurrencyDecimals) get a decimal separator too, following whatever real
    // grouping convention getCurrencyLocale's locale string uses (derived via
    // Intl.NumberFormat rather than a hardcoded vi-VN-vs-everything-else guess,
    // since other locales â€” e.g. "de-DE" â€” also use "," as the decimal mark) so
    // the edit draft matches the read-only formatMoney/formatMoneyAmount output.
    // (mirrors ContractServices.js / QuotationServices.js)
    const getLocaleSeparators = (locale) => {
      try {
        const parts = new Intl.NumberFormat(locale).formatToParts(1234.5);
        const decimal = parts.find((p) => p.type === "decimal")?.value || ".";
        const group = parts.find((p) => p.type === "group")?.value || ",";
        return { decimal, group };
      } catch {
        return { decimal: ".", group: "," };
      }
    };

    const formatMoneyEditValue = (value, currency = null) => {
      if (value === undefined || value === null || value === "") return "";
      const n = Number(value);
      if (!Number.isFinite(n)) return "";
      const info = currency || defaultCurrencyObject();
      const decimals = getCurrencyDecimals(info);
      return n.toLocaleString(getCurrencyLocale(info), { minimumFractionDigits: 0, maximumFractionDigits: decimals });
    };

    const parseMoneyEditValue = (value, currency = null) => {
      const info = currency || defaultCurrencyObject();
      const decimals = getCurrencyDecimals(info);
      const raw = String(value ?? "").trim();
      if (!raw) return 0;
      if (decimals <= 0) {
        const n = Number(raw.replace(/[^\d-]/g, ""));
        return Number.isFinite(n) ? n : 0;
      }
      const { decimal: decimalChar, group: thousandChar } = getLocaleSeparators(getCurrencyLocale(info));
      const normalized = raw.split(thousandChar).join("").replace(decimalChar, ".").replace(/[^\d.-]/g, "");
      const n = Number(normalized);
      return Number.isFinite(n) ? n : 0;
    };

    // Builds the formatted draft string from raw keystrokes (sanitizes + regroups
    // on every change), so typing stays currency/decimal-aware.
    const buildMoneyDraft = (inputValue, currency = null) => {
      const info = currency || defaultCurrencyObject();
      const decimals = getCurrencyDecimals(info);
      if (decimals <= 0) {
        const cleaned = String(inputValue ?? "").replace(/[^\d]/g, "");
        return cleaned ? cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
      }
      const { decimal: decimalChar, group: thousandChar } = getLocaleSeparators(getCurrencyLocale(info));
      const allowedPattern = new RegExp(`[^0-9${decimalChar === "." ? "\\." : decimalChar}]`, "g");
      const raw = String(inputValue ?? "").replace(allowedPattern, "");
      const splitIndex = raw.indexOf(decimalChar);
      const intPart = (splitIndex === -1 ? raw : raw.slice(0, splitIndex)).replace(/[^\d]/g, "");
      const decPart = splitIndex === -1 ? undefined : raw.slice(splitIndex + 1).replace(/[^\d]/g, "").slice(0, decimals);
      const groupedInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandChar) : "";
      return decPart !== undefined ? `${groupedInt}${decimalChar}${decPart}` : groupedInt;
    };

    const EditableCell = ({ value, onSave, isTextArea = false, isNumber = false, isMoney = false, suffix = "", disabled = false, currency = null }) => {
      const [editing, setEditing] = useState(false);
      const numericCell = isNumber || isMoney;
      const [val, setVal] = useState(value ?? (numericCell ? 0 : ""));
      const [moneyDraft, setMoneyDraft] = useState(() => formatMoneyEditValue(value, currency));

      useEffect(() => {
        if (!editing) setMoneyDraft(formatMoneyEditValue(value, currency));
      }, [value, editing, currency]);

      useEffect(() => { setVal(value ?? (numericCell ? 0 : "")); }, [value, numericCell]);

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
            autoSize: { minRows: 1, maxRows: 4 },
            style: { borderRadius: DS.radius.sm }
          });
        }
        if (isMoney) {
          const commitMoney = () => {
            const next = parseMoneyEditValue(moneyDraft, currency);
            setVal(next);
            setMoneyDraft(formatMoneyEditValue(next, currency));
            setEditing(false);
            if (next !== parseMoneyEditValue(value, currency)) onSave(next);
          };
          const handleMoneyChange = (inputValue) => {
            const draftValue = buildMoneyDraft(inputValue, currency);
            setMoneyDraft(draftValue);
            setVal(parseMoneyEditValue(draftValue, currency));
          };
          return React.createElement(Input, {
            autoFocus: true,
            value: moneyDraft,
            inputMode: "decimal",
            onChange: (e) => handleMoneyChange(e.target.value),
            onBlur: commitMoney,
            onPressEnter: commitMoney,
            style: { width: "100%", minWidth: 120, borderRadius: DS.radius.sm, textAlign: "right" },
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
            style: { width: "100%", minWidth: isPercent ? 80 : 120, borderRadius: DS.radius.sm },
            formatter: isPercent ? (v) => `${v}%` : undefined,
            parser: isPercent ? (v) => v.replace('%', '') : undefined,
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
          },
          style: { borderRadius: DS.radius.sm }
        });
      }

      const displayVal = isMoney
        ? formatMoney(val || 0, currency)
        : isNumber
          ? (isPercent ? `${val ?? 0}%` : (val ? Number(val).toLocaleString("vi-VN") : "0"))
          : val;

      const viewCell = React.createElement("div", {
        style: isTextArea ? {
          cursor: disabled ? "not-allowed" : "text",
          minHeight: 24,
          padding: "4px 8px",
          borderRadius: DS.radius.xs,
          transition: "background 0.2s, border-color 0.2s",
          whiteSpace: "normal",
          wordBreak: "break-word",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          border: "1px dashed transparent"
        } : {
          cursor: disabled ? "not-allowed" : "text",
          minHeight: 24,
          display: "flex",
          alignItems: "center",
          padding: "4px 8px",
          borderRadius: DS.radius.xs,
          transition: "background 0.2s, border-color 0.2s",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          color: numericCell ? (isPercent ? "inherit" : C.warning) : "inherit",
          fontWeight: numericCell ? 500 : "normal",
          border: "1px dashed transparent"
        },
        onClick: () => { if (!disabled) setEditing(true); },
        onMouseEnter: (e) => { if (!disabled) { e.currentTarget.style.background = C.primarySoft; e.currentTarget.style.borderColor = C.borderStrong; } },
        onMouseLeave: (e) => { if (!disabled) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } },
        title: disabled ? "Locked (Ordered)" : "Click to edit"
      }, displayVal || React.createElement("span", { style: { color: C.muted, fontStyle: "italic" } }, "â€”"));

      return (isTextArea && val)
        ? React.createElement(Tooltip, { title: val, placement: "topLeft", overlayStyle: { maxWidth: 360 } }, viewCell)
        : viewCell;
    };

    // Currency-aware money input for the "Add service" form (mirrors EditableCell's
    // isMoney draft handling so decimals/grouping follow the chosen currency
    // instead of being hardcoded to VND).
    const AddServiceMoneyInput = ({ value, onChange, currency = null }) => {
      const [draft, setDraft] = useState(() => formatMoneyEditValue(value, currency));
      useEffect(() => {
        setDraft(formatMoneyEditValue(value, currency));
      }, [value, currency]);
      return React.createElement(Input, {
        value: draft,
        inputMode: "decimal",
        onChange: (e) => {
          const next = buildMoneyDraft(e.target.value, currency);
          setDraft(next);
          onChange?.(parseMoneyEditValue(next, currency));
        },
        onBlur: () => setDraft(formatMoneyEditValue(value, currency)),
        style: { width: "100%", borderRadius: DS.radius.sm, textAlign: "right" },
        addonAfter: getCurrencyCode(currency || defaultCurrencyObject()),
      });
    };

    const CaseServices = () => {
      const token = useNocoToken();
      const ui = useMemo(() => createNocoStyles(token), [token]);
      const currentId = ctx.record?.id;
      const [loading, setLoading] = useState(true);
      const [submitting, setSubmitting] = useState(false);
      const [services, setServices] = useState([]);
      const [caseInfo, setCaseInfo] = useState(null);
      const [serviceCatalog, setServiceCatalog] = useState([]);
      const [currencies, setCurrencies] = useState([]);
      const [exchangeRates, setExchangeRates] = useState([]);
      const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false);
      const caseCurrency = useMemo(() => currencyFromRecord(caseInfo, currencies), [caseInfo, currencies]);
      const vndCurrency = useMemo(() => findDefaultCurrency(currencies), [currencies]);
      const vndCurrencyId = extractCurrencyId(vndCurrency);
      const casePricingDate = caseInfo?.date || caseInfo?.createdAt;
      const currencyOptions = useMemo(
        () => currencies.map((currency) => ({
          value: getCurrencySelectValue(currency),
          label: currencySelectLabel(currency),
        })),
        [currencies],
      );
      const getRowCurrency = (row) => currencyFromRecord({
        ...row,
        currencyId: row?.currencyId ?? row?._contractCurrencyId ?? row?._quotedCurrencyId,
        currency: row?.currency ?? row?._contractCurrency ?? row?._quotedCurrency,
      }, currencies, caseCurrency);

      // Modals
      const [addModal, setAddModal] = useState(false);
      // When set (via a combo section's own "+ Add service" button), the
      // service created by the Add Service modal is tagged into that combo's
      // section (comboId/serviceCombo/comboName) instead of landing as an
      // untagged row. Cleared whenever the modal closes.
      const [comboAddTarget, setComboAddTarget] = useState(null);
      // Local, unsaved edits to the case's package subtotal/VAT/total footer.
      // null = no pending edit (inputs show the live server values). Set by
      // typing in any of the 4 footer fields; only written to the server when
      // the user clicks "Save".
      const [packageDraft, setPackageDraft] = useState(null);
      const [compareModal, setCompareModal] = useState({ open: false, data: null });
      const [guideModal, setGuideModal] = useState(false);
      const [serviceSelectModal, setServiceSelectModal] = useState({
        open: false,
        triggerRecord: null, // the service row whose button was originally clicked
        selectedIds: [],     // ids of the selected projectServices
        pendingContractId: null, // newly detected contractId after the popup closes
      });
      const [serviceSelectSubmitting, setServiceSelectSubmitting] = useState(false);
      const [selectionAmountsPreview, setSelectionAmountsPreview] = useState({ subTotal: 0, vatAmount: 0, totalAmount: 0, currency: null });

      const [form] = Form.useForm();
      const extractId = (val) => {
        const id = val && typeof val === 'object' ? val.id : val;
        return id ? parseInt(id) : null;
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
      const stripContractServicePayload = (data = {}) => {
        const payload = { ...data };
        delete payload.serviceId;
        delete payload.services;
        delete payload.serviceType;
        delete payload.billingMode;
        delete payload.financialSourceType;
        return payload;
      };
      const updateProjectServiceSafely = async (projectServiceId, data) => {
        try {
          return await ctx.api.request({
            url: "projectServices:update",
            method: "POST",
            params: { filterByTk: parseInt(projectServiceId) },
            data,
          });
        } catch (error) {
          return ctx.api.request({
            url: "projectServices:update",
            method: "POST",
            params: { filterByTk: parseInt(projectServiceId) },
            data: stripProjectServiceSyncFields(data),
          });
        }
      };

      const compareFields = [
        { key: "serviceName", label: "Service Name", type: "text" },
        { key: "serviceType", label: "Service Type", type: "text" },
        { key: "description", label: "Description", type: "text" },
        { key: "basePrice", label: "Base Price", type: "money" },
        { key: "vat", label: "VAT (%)", type: "number" },
      ];

      const formatCompareValue = (value, type, currency = null) => {
        if (type === "money") return formatMoney(Number(value) || 0, currency);
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

      const lineCurrencyIdsNeedingRate = useMemo(() => {
        const ids = new Set();
        services.filter(isMoneyEditableServiceRow).forEach((row) => {
          const currency = getRowCurrency(row);
          if (!isSameCurrency(currency, vndCurrency)) {
            const id = extractCurrencyId(currency);
            if (id) ids.add(id);
          }
        });
        return Array.from(ids);
      }, [services, currencies, caseCurrency, vndCurrency]);
      const lineCurrencyIdsKey = lineCurrencyIdsNeedingRate.slice().sort((a, b) => a - b).join(",");

      useEffect(() => {
        let alive = true;
        if (!vndCurrencyId || !lineCurrencyIdsNeedingRate.length) {
          setExchangeRates([]);
          setExchangeRatesLoading(false);
          return () => { alive = false; };
        }
        setExchangeRatesLoading(true);
        fetchExchangeRatesForConversion(lineCurrencyIdsNeedingRate, vndCurrencyId)
          .then((rows) => { if (alive) setExchangeRates(rows || []); })
          .catch(() => { if (alive) setExchangeRates([]); })
          .finally(() => { if (alive) setExchangeRatesLoading(false); });
        return () => { alive = false; };
      }, [vndCurrencyId, lineCurrencyIdsKey]);

      const buildLinePricingForRecord = (record = {}, overrides = {}, rates = exchangeRates) => {
        const row = { ...record, ...overrides };
        return buildServicePricingPayload({
          pricingMode: PRICING_MODE_LINE,
          basePrice: row.basePrice ?? row._quotedBasePrice ?? 0,
          quantity: row.quantity ?? row._quotedQuantity ?? 1,
          vat: row.vat ?? row._quotedVat ?? 0,
          currency: getRowCurrency(row),
          vndCurrency,
          exchangeRatesToVnd: rates,
          pricingDate: casePricingDate,
        });
      };

      const getPersistedVndPricing = (record = {}, fallback = {}) => {
        const subTotal = Number(record?.subTotal ?? record?._quotedSubTotal);
        const vatAmount = Number(record?.vatAmount ?? record?._quotedVatAmount);
        const totalAmount = Number(record?.totalAmount ?? record?._quotedTotalAmount);
        if (!Number.isFinite(subTotal) || !Number.isFinite(vatAmount) || !Number.isFinite(totalAmount)) return null;
        return {
          ...fallback,
          subTotal,
          vatAmount,
          totalAmount,
          exchangeRateToBase: parseNum(record?.exchangeRateToBase ?? record?._contractExchangeRateToBase ?? record?._quotedExchangeRateToBase) || fallback.exchangeRateToBase || 1,
          _convertible: true,
          _usedPersistedTotals: true,
        };
      };

      const getRowPricing = (record = {}, rates = exchangeRates) => {
        if (!isMoneyEditableServiceRow(record)) {
          return { subTotal: 0, vatAmount: 0, totalAmount: 0, exchangeRateToBase: 1, _convertible: true };
        }
        const rowCurrency = getRowCurrency(record);
        const frozenRate = parseNum(record?.exchangeRateToBase ?? record?._contractExchangeRateToBase ?? record?._quotedExchangeRateToBase);
        if (!isSameCurrency(rowCurrency, vndCurrency) && frozenRate > 0) {
          const native = calcLine(
            record.basePrice ?? record._quotedBasePrice ?? 0,
            record.quantity ?? record._quotedQuantity ?? 1,
            record.vat ?? record._quotedVat ?? 0,
            rowCurrency,
          );
          const subTotal = roundMoneyForCurrency(native.subTotal * frozenRate, vndCurrency);
          const vatAmount = roundMoneyForCurrency(native.vatAmount * frozenRate, vndCurrency);
          return {
            pricingMode: PRICING_MODE_LINE,
            basePrice: parseNum(record.basePrice ?? record._quotedBasePrice),
            quantity: parseNum(record.quantity ?? record._quotedQuantity ?? 1) || 1,
            vat: parseNum(record.vat ?? record._quotedVat),
            subTotal,
            vatAmount,
            totalAmount: subTotal + vatAmount,
            exchangeRateToBase: frozenRate,
            packageSubTotal: 0,
            packageVatRate: 0,
            packageVatAmount: 0,
            packageTotalAmount: 0,
            _convertible: true,
            _usedFrozenRate: true,
          };
        }
        const pricing = buildLinePricingForRecord(record, {}, rates);
        if (pricing._convertible) return pricing;
        return getPersistedVndPricing(record, pricing) || pricing;
      };

      const mergeExchangeRates = (left = [], right = []) => {
        const seen = new Set();
        return [...left, ...right].filter((row) => {
          const key = row?.id ? `id:${row.id}` : JSON.stringify(row);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      const fetchRatesForCurrencies = async (currencyList = []) => {
        const ids = Array.from(new Set(
          (currencyList || [])
            .filter((currency) => currency && !isSameCurrency(currency, vndCurrency))
            .map((currency) => extractCurrencyId(currency))
            .filter(Boolean),
        ));
        if (!vndCurrencyId || !ids.length) return [];
        return fetchExchangeRatesForConversion(ids, vndCurrencyId);
      };

      const getWritableLinePricing = async (record = {}, overrides = {}) => {
        const row = { ...record, ...overrides };
        if (!isMoneyEditableServiceRow(row)) {
          return {
            pricing: { subTotal: 0, vatAmount: 0, totalAmount: 0, exchangeRateToBase: 1, _convertible: true },
            rowCurrency: getRowCurrency(row),
            rowCurrencyId: extractCurrencyId(getRowCurrency(row)),
          };
        }
        const rowCurrency = getRowCurrency(row);
        const freshRates = await fetchRatesForCurrencies([rowCurrency]);
        const rates = mergeExchangeRates(exchangeRates, freshRates);
        const pricing = buildLinePricingForRecord(row, {}, rates);
        if (!pricing._convertible) {
          const name = row.serviceName || row._quotedServiceName || row.services?.serviceName || row.name || "Unnamed service";
          throw new Error(`Thiếu tỷ giá quy đổi sang VND cho "${name}" (${getCurrencyCode(rowCurrency)})`);
        }
        return { pricing, rowCurrency, rowCurrencyId: extractCurrencyId(rowCurrency) };
      };

      const getRowSubTotal = (record) => {
        if (isPackageServiceRow(record) || isScopeOnlyServiceRow(record)) return 0;
        return Number(getRowPricing(record).subTotal) || 0;
      };

      const getRowVatAmount = (record, currency = null) => {
        if (isPackageServiceRow(record) || isScopeOnlyServiceRow(record)) return 0;
        return Number(getRowPricing(record).vatAmount) || 0;
      };

      const getRowTotalAmount = (record, currency = null) => {
        if (isPackageServiceRow(record) || isScopeOnlyServiceRow(record)) return 0;
        return Number(getRowPricing(record).totalAmount) || 0;
      };
      const getSelectionAmounts = async (records = []) => {
        const billableRows = records.filter(isMoneyEditableServiceRow);
        const packageRows = records.filter(isPackageServiceRow);
        const rates = mergeExchangeRates(exchangeRates, await fetchRatesForCurrencies(billableRows.map(getRowCurrency)));
        const missingRows = [];
        const lineSum = billableRows.reduce(
          (acc, row) => {
            const pricing = getRowPricing(row, rates);
            if (!pricing._convertible) {
              missingRows.push(row);
              return acc;
            }
            return {
              subTotal: acc.subTotal + pricing.subTotal,
              vatAmount: acc.vatAmount + pricing.vatAmount,
            };
          },
          { subTotal: 0, vatAmount: 0 },
        );
        if (missingRows.length) {
          const names = missingRows
            .map((row) => `"${row.serviceName || row._quotedServiceName || row.services?.serviceName || row.name || "Unnamed service"}" (${getCurrencyCode(getRowCurrency(row))})`)
            .join(", ");
          throw new Error(`Thiếu tỷ giá quy đổi sang VND cho: ${names}`);
        }
        const packageSum = packageRows.reduce((acc, row) => {
          const totals = calcPackageTotals(row, vndCurrency);
          return {
            subTotal: acc.subTotal + totals.subTotal,
            vatAmount: acc.vatAmount + totals.vatAmount,
          };
        }, { subTotal: 0, vatAmount: 0 });
        const subTotal = lineSum.subTotal + packageSum.subTotal;
        const vatAmount = lineSum.vatAmount + packageSum.vatAmount;
        return { subTotal, vatAmount, totalAmount: subTotal + vatAmount, currency: vndCurrency };
      };

      useEffect(() => {
        let alive = true;
        if (!serviceSelectModal.open || !serviceSelectModal.selectedIds.length) {
          setSelectionAmountsPreview({ subTotal: 0, vatAmount: 0, totalAmount: 0, currency: vndCurrency });
          return () => { alive = false; };
        }
        const sel = services.filter((s) => serviceSelectModal.selectedIds.includes(s.id));
        getSelectionAmounts(sel).then((amounts) => {
          if (alive) setSelectionAmountsPreview(amounts);
        }).catch(() => {
          if (alive) setSelectionAmountsPreview({ subTotal: 0, vatAmount: 0, totalAmount: 0, currency: vndCurrency });
        });
        return () => { alive = false; };
      }, [serviceSelectModal.open, serviceSelectModal.selectedIds, services, vndCurrency, exchangeRates, currencies, caseCurrency]);

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
        if (!record?._quotationId && !record?._isMainQuote) return "No quotation yet";
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
        const prefix1 = kind === "contract" ? "contract" : "quotation";
        const prefix2 = kind === "contract" ? "Contract" : "Quotation";

        const suffixList = [
          "DetailUrl", "DetailRoute", "ViewUrl", "ViewRoute",
          "DetailView", "DetailUid", "ViewUid", "PopupUid", "Uid"
        ];

        for (const suffix of suffixList) {
          if (routeInput[`${prefix1}${suffix}`]) return routeInput[`${prefix1}${suffix}`];
          if (routeInput[`${prefix2}${suffix}`]) return routeInput[`${prefix2}${suffix}`];
        }

        // Check lowercase versions just in case
        for (const suffix of suffixList) {
          const lowerKey = `${prefix1}${suffix.toLowerCase()}`;
          if (routeInput[lowerKey]) return routeInput[lowerKey];
          const lowerKey2 = `${prefix2.toLowerCase()}${suffix.toLowerCase()}`;
          if (routeInput[lowerKey2]) return routeInput[lowerKey2];
        }

        return DETAIL_VIEW_ROUTES[kind] || "";
      };

      const parseDetailRouteTemplate = (routeTemplate) => {
        const raw = String(routeTemplate || "").trim();
        if (!raw) return null;

        // Check if it's a simple UID (no slashes)
        if (!raw.includes("/")) {
          return {
            isSimpleUid: true,
            viewUid: raw,
            origin: window.location.origin,
          };
        }

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
        const template = getDetailRouteTemplate(kind);
        const parsed = parseDetailRouteTemplate(template);
        if (!parsed) return null;

        const safeRecordId = String(recordId);

        if (parsed.isSimpleUid) {
          const defaultTemplate = DETAIL_VIEW_ROUTES[kind] || "";
          const defaultParsed = parseDetailRouteTemplate(defaultTemplate);
          if (defaultParsed) {
            defaultParsed.viewUid = parsed.viewUid;
            const viewIndex = defaultParsed.segments.indexOf("view");
            if (viewIndex >= 0 && viewIndex + 1 < defaultParsed.segments.length) {
              defaultParsed.segments[viewIndex + 1] = parsed.viewUid;
            }

            const nextSegments = [...defaultParsed.segments];
            if (defaultParsed.filterIndex >= 0) {
              nextSegments[defaultParsed.filterIndex] = defaultParsed.filterSegment || "filterbytk";
              if (nextSegments[defaultParsed.filterIndex + 1]) {
                nextSegments[defaultParsed.filterIndex + 1] = safeRecordId;
              } else {
                nextSegments.splice(defaultParsed.filterIndex + 1, 0, safeRecordId);
              }
            } else {
              nextSegments.push("filterbytk", safeRecordId);
            }
            const pathname = `/${nextSegments.join("/")}`;
            return {
              ...defaultParsed,
              recordId: safeRecordId,
              pathname,
              url: `${defaultParsed.origin}${pathname}`,
              uid: parsed.viewUid,
            };
          }

          return {
            recordId: safeRecordId,
            pathname: "",
            url: "",
            uid: parsed.viewUid,
          };
        }

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
          message.warning(kind === "contract" ? "Related contract not found." : "Related quotation not found.");
          return;
        }

        const detailRoute = buildDetailRoute(kind, safeRecordId);
        if (!detailRoute || (!detailRoute.uid && !detailRoute.url)) {
          message.warning(kind === "contract" ? "The contract detail view is not configured yet." : "The quotation detail view is not configured yet.");
          return;
        }

        const collectionName = kind === "contract" ? "contracts" : "quotations";
        const popupTitle = ctx.t ? ctx.t(title) : title;

        // If we have a uid, try ctx.openView first
        if (detailRoute.uid && typeof ctx.openView === "function") {
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
            await ctx.openView(detailRoute.uid, openViewOptions);
            return;
          } catch (error) {
            console.error("[CaseServices] Could not open record detail via ctx.openView", error);
          }
        }

        // Fallback to window.open if no uid, or if ctx.openView failed / is not available
        if (detailRoute.url) {
          window.open(detailRoute.url, "_blank", "noopener,noreferrer");
        } else {
          message.warning(kind === "contract" ? "The contract detail view is not configured yet." : "The quotation detail view is not configured yet.");
        }
      };

      const openManualPopup = async (uid, title, params = {}) => {
        if (typeof ctx.openView !== "function") {
          message.error("ctx.openView is not available to open the popup.");
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
            projectServiceIds: params.projectServiceIds || params.projectServiceId || String(projectServiceId),
            preselectedProjectServiceIds: params.projectServiceIds || params.projectServiceId || String(projectServiceId),
            selectedProjectServiceIds: params.selectedProjectServiceIds,
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
        const packageMode =
          isPackageServiceRow(record) ||
          parseNum(record?.packageSubTotal) ||
          parseNum(record?.packageTotalAmount);
        const packageTotals = packageMode ? calcPackageTotals(record, vndCurrency) : null;
        const basePrice = packageMode ? 0 : (Number(record?._quotedBasePrice ?? record?.basePrice) || 0);
        const quantity = packageMode ? 1 : (Number(record?._quotedQuantity ?? record?.quantity ?? 1) || 1);
        const vat = packageMode ? 0 : (Number(record?._quotedVat ?? record?.vat ?? 0) || 0);
        const linePricing = packageMode ? null : getRowPricing({ ...record, basePrice, quantity, vat });
        const subTotal = packageMode ? packageTotals.subTotal : linePricing.subTotal;
        const vatAmount = packageMode ? packageTotals.vatAmount : linePricing.vatAmount;
        const totalAmount = packageMode ? packageTotals.totalAmount : linePricing.totalAmount;
        const rowCurrencyId = packageMode ? null : extractCurrencyId(getRowCurrency(record));
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
          exchangeRateToBase: packageMode ? 1 : linePricing.exchangeRateToBase,
          currencyId: rowCurrencyId || null,
          pricingMode: packageMode ? PRICING_MODE_PACKAGE : (record?.pricingMode || PRICING_MODE_LINE),
          billingMode: packageMode ? BILLING_PACKAGE_INCLUDED : (record?.billingMode || BILLING_LINE),
          financialSourceType: record?.financialSourceType || (quotationId ? SOURCE_QUOTATION : SOURCE_MANUAL),
          packageSubTotal: packageMode ? packageTotals.subTotal : null,
          packageVatRate: packageMode ? packageTotals.vatRate : null,
          packageVatAmount: packageMode ? packageTotals.vatAmount : null,
          packageTotalAmount: packageMode ? packageTotals.totalAmount : null,
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
        const pricing = getRowPricing(record);
        const rowCurrencyId = extractCurrencyId(getRowCurrency(record));
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
          quantity: Number(record?.quantity) || 1,
          vat: Number(record?.vat) || 0,
          subTotal: pricing.subTotal,
          vatAmount: pricing.vatAmount,
          totalAmount: pricing.totalAmount,
          exchangeRateToBase: pricing.exchangeRateToBase,
          currencyId: rowCurrencyId || null,
          customerId: extractId(caseInfo?.customerId) || extractId(caseInfo?.customer) || extractId(caseInfo?.customers),
          internalCompanyId: extractId(caseInfo?.internalCompanyId) || extractId(caseInfo?.internalCompany),
          lawyerId: extractId(caseInfo?.lawyerId) || extractId(caseInfo?.lawyer),
        };
      };


      const getContractLineAmounts = (line = {}, currs = currencies, fallbackCurrency = vndCurrency) => {
        const isPackageLine =
          isPackagePricing(line) ||
          parseNum(line.packageSubTotal) ||
          parseNum(line.packageTotalAmount);

        if (isPackageLine) {
          const totals = calcPackageTotals(line, fallbackCurrency);
          return {
            subTotal: totals.subTotal,
            vatAmount: totals.vatAmount,
            totalAmount: totals.totalAmount,
            packageVatRate: totals.vatRate || parseNum(line.packageVatRate ?? line.vat),
            isPackageLine,
          };
        }

        const quantity = parseNum(line.quantity) || 1;
        const subTotal = parseNum(line.subTotal ?? (parseNum(line.basePrice) * quantity));
        const lineCurrency = currencyFromRecord(line, currs, fallbackCurrency);
        const vatAmount = parseNum(
          line.vatAmount ?? roundMoneyForCurrency((subTotal * parseNum(line.vat)) / 100, lineCurrency),
        );
        return {
          subTotal,
          vatAmount,
          totalAmount: parseNum(line.totalAmount ?? (subTotal + vatAmount)),
          packageVatRate: 0,
          isPackageLine,
        };
      };

      const syncQuotationHeaderFromServices = async (quotationId) => {
        const safeQuotationId = extractId(quotationId);
        if (!safeQuotationId) return;

        try {
          const [quotationRes, linesRes] = await Promise.all([
            ctx.api.request({
              url: "quotations:get",
              params: { filterByTk: safeQuotationId },
            }),
            ctx.api.request({
              url: "quotationServices:list",
              params: {
                filter: JSON.stringify({ quotationId: { $eq: safeQuotationId } }),
                pageSize: 1000,
              },
            }),
          ]);

          const quotation = quotationRes?.data?.data || quotationRes?.data || {};
          const lines = (linesRes?.data?.data || []).filter((line) => !isDeletedServiceLine(line));
          const packageLine = lines.find((line) =>
            isPackagePricing(line) ||
            parseNum(line.packageSubTotal) ||
            parseNum(line.packageTotalAmount)
          );

          let subTotal = 0;
          let vatAmount = 0;
          let totalAmount = 0;

          if (packageLine || (isPackagePricing(quotation) && lines.length > 0)) {
            const totals = getContractLineAmounts(packageLine || lines[0]);
            subTotal = totals.subTotal;
            vatAmount = totals.vatAmount;
            totalAmount = totals.totalAmount;
          } else {
            subTotal = lines.reduce((sum, line) => sum + (parseNum(line.subTotal) || 0), 0);
            vatAmount = lines.reduce((sum, line) => sum + (parseNum(line.vatAmount) || 0), 0);
            totalAmount = subTotal + vatAmount;
          }

          await ctx.api.request({
            url: "quotations:update",
            method: "POST",
            params: { filterByTk: safeQuotationId },
            data: {
              subTotal,
              vatAmount,
              totalAmount,
              ...(extractId(quotation.customerId) ? { customerId: extractId(quotation.customerId) } : {}),
              ...(extractId(quotation.internalCompanyId) ? { internalCompanyId: extractId(quotation.internalCompanyId) } : {}),
            },
          });
        } catch (e) {
          console.error("[CaseServices] syncQuotationHeaderFromServices failed", e);
        }
      };

      const syncContractHeaderFromServices = async (contractId) => {
        const safeContractId = extractId(contractId);
        if (!safeContractId) return;

        try {
          const [contractRes, linesRes] = await Promise.all([
            ctx.api.request({
              url: "contracts:get",
              params: { filterByTk: safeContractId },
            }),
            ctx.api.request({
              url: "contractServices:list",
              params: {
                filter: JSON.stringify({ contractId: { $eq: safeContractId } }),
                pageSize: 1000,
              },
            }),
          ]);

          const contract = contractRes?.data?.data || contractRes?.data || {};
          const lines = (linesRes?.data?.data || []).filter((line) => !isDeletedServiceLine(line));
          const isRetainer = String(contract.contractType || "").toLowerCase() === "retainer";

          let subTotal = 0;
          let vatAmount = 0;
          let totalAmount = 0;
          let packageVatRate = parseNum(contract.packageVatRate ?? contract.vatRate);

          if (isRetainer) {
            // Retainer billing has no service line currency to inherit from,
            // so monthlyFee x retainerDuration is treated as VND.
            subTotal = parseNum(contract.monthlyFee) * parseNum(contract.retainerDuration);
            packageVatRate = parseNum(contract.packageVatRate ?? contract.vatRate);
            vatAmount = roundMoneyForCurrency((subTotal * packageVatRate) / 100, vndCurrency);
            totalAmount = subTotal + vatAmount;
          } else {
            const packageLine = lines.find((line) =>
              isPackagePricing(line) ||
              parseNum(line.packageSubTotal) ||
              parseNum(line.packageTotalAmount)
            );

            if (packageLine || (isPackagePricing(contract) && lines.length > 0)) {
              const packageAmounts = getContractLineAmounts(packageLine || contract);
              subTotal = packageAmounts.subTotal;
              vatAmount = packageAmounts.vatAmount;
              totalAmount = packageAmounts.totalAmount;
              packageVatRate = packageAmounts.packageVatRate || packageVatRate;
            } else {
              subTotal = lines.reduce((sum, line) => sum + (parseNum(line.subTotal) || 0), 0);
              vatAmount = lines.reduce((sum, line) => sum + (parseNum(line.vatAmount) || 0), 0);
              totalAmount = subTotal + vatAmount;
            }
          }

          await ctx.api.request({
            url: "contracts:update",
            method: "POST",
            params: { filterByTk: safeContractId },
            data: {
              subTotal,
              vatAmount,
              totalAmount,
              ...(!isRetainer ? { fixedAmount: totalAmount } : {}),
              ...(packageVatRate ? { packageVatRate } : {}),
              ...(extractId(contract.customerId) ? { customerId: extractId(contract.customerId) } : {}),
              ...(extractId(contract.internalCompanyId) ? { internalCompanyId: extractId(contract.internalCompanyId) } : {}),
            },
          });

          if (currentId) {
            try {
              await ctx.api.request({
                url: "projects:update",
                method: "POST",
                params: { filterByTk: parseInt(currentId) },
                data: { totalAmount },
              });
            } catch (projectErr) {
              console.warn("[CaseServices] Could not sync project totalAmount", projectErr);
            }
          }
        } catch (e) {
          console.error("[CaseServices] syncContractHeaderFromServices failed", e);
        }
      };

      // Recomputes the Case's own totalAmount from ALL of its live projectServices
      // rows â€” quotation-linked, contract-linked, or fully standalone â€” and
      // persists it directly to `projects.totalAmount`. syncContractHeaderFromServices
      // above also pushes to `projects`, but only as a side effect that never runs
      // for rows without a linked contract (quotation-only or manual rows), so the
      // Case's own total silently went stale for those. Mirrors the
      // recompute-from-scratch pattern of syncQuotationHeaderFromServices /
      // syncContractHeaderFromServices â€” refetches everything fresh rather than
      // trusting local `services` state, so it's safe to call right after any
      // mutation regardless of React state batching.
      const syncCaseTotalAmount = async (projectId) => {
        const safeProjectId = extractId(projectId);
        if (!safeProjectId) return;

        try {
          const [linesRes, currs] = await Promise.all([
            ctx.api.request({
              url: "projectServices:list",
              params: {
                filter: JSON.stringify({ projectId: { $eq: safeProjectId } }),
                pageSize: 1000,
                appends: ["currencies"],
              },
            }),
            fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
          ]);

          const lines = (linesRes?.data?.data || []).filter((line) => !isDeletedServiceLine(line));
          const vnd = findDefaultCurrency(currs);
          const billableRows = lines.filter(isMoneyEditableServiceRow);
          const packageRows = lines.filter(isPackageServiceRow);
          const lineSum = billableRows.reduce(
            (acc, row) => ({
              subTotal: acc.subTotal + getRowSubTotal(row),
              vatAmount: acc.vatAmount + getRowVatAmount(row, vnd),
            }),
            { subTotal: 0, vatAmount: 0 },
          );
          // The whole case has ONE combined package total, broadcast
          // (duplicated) onto every package-priced row regardless of which
          // combo it belongs to â€” so it must be counted once for the whole
          // case, not once per row, or the total gets inflated by the row
          // count.
          const packageSum = packageRows.length
            ? (() => {
              const totals = calcPackageTotals(packageRows[0], vnd);
              return { subTotal: totals.subTotal, vatAmount: totals.vatAmount };
            })()
            : { subTotal: 0, vatAmount: 0 };
          const totalAmount =
            lineSum.subTotal +
            lineSum.vatAmount +
            packageSum.subTotal +
            packageSum.vatAmount;

          await ctx.api.request({
            url: "projects:update",
            method: "POST",
            params: { filterByTk: safeProjectId },
            data: { totalAmount },
          });
        } catch (e) {
          console.error("[CaseServices] syncCaseTotalAmount failed", e);
        }
      };

      // â”€â”€ Triple sync: updates projectService + quotationService + contractService together â”€â”€
      // Called whenever any source changes basePrice/vat/description/serviceName/serviceType
      const syncAllThree = async (record, field, newValue) => {
        const numericFields = ["basePrice", "vat", "subTotal", "vatAmount", "totalAmount"];
        const isNumeric = numericFields.includes(field);

        // --- Recompute the financial fields when it's a price field ---
        let pricePayload = {};

        if (field === "basePrice" || field === "vat") {
          const quantity = Number(record.quantity ?? record._quotedQuantity ?? 1) || 1;
          const newPrice = field === "basePrice" ? (Number(newValue) || 0) : (Number(record.basePrice) || 0);
          const newVat = field === "vat" ? (Number(newValue) || 0) : (Number(record.vat) || 0);
          const { pricing, rowCurrencyId } = await getWritableLinePricing(record, {
            basePrice: newPrice,
            quantity,
            vat: newVat,
          });

          pricePayload = {
            ...pricing,
            basePrice: newPrice,
            quantity,
            vat: newVat,
            currencyId: rowCurrencyId || null,
            currency: rowCurrencyId || null,
          };
        } else {
          pricePayload = { [field]: newValue };
        }

        // 1. Update projectServices
        await updateProjectServiceSafely(record.id, pricePayload);

        // 2. Update quotationServices (if any)
        // Wrapped in its own try/catch: if this step fails, steps 3 and 4 must
        // still run so contractServices + the contract/quotation totals don't
        // drift out of sync with projectServices (already updated in step 1).
        if (record._qServiceId) {
          try {
            await ctx.api.request({
              url: "quotationServices:update",
              method: "POST",
              params: { filterByTk: record._qServiceId },
              data: pricePayload,
            });
          } catch (e) {
            console.warn("[CaseServices] syncAllThree: could not update quotationServices:", e);
          }
        }

        // 3. Update contractServices (if any)
        const contractHeaderId = getRowContractId(record);
        if (record._contractServiceId) {
          try {
            await ctx.api.request({
              url: "contractServices:update",
              method: "POST",
              params: { filterByTk: record._contractServiceId },
              data: pricePayload,
            });
          } catch (e) {
            console.warn("[CaseServices] syncAllThree: could not update contractServices:", e);
          }
        }

        // 4. Sync the quotation + contract header totals (if this was a price change)
        // Always recompute from scratch (syncQuotationHeaderFromServices/syncContractHeaderFromServices)
        // rather than accumulating a diff â€” diff-based totals drift easily if step 2/3 above partially fails.
        if ((field === "basePrice" || field === "vat") && record._quotationId) {
          await syncQuotationHeaderFromServices(record._quotationId);
          if (contractHeaderId) {
            await syncContractHeaderFromServices(contractHeaderId);
          }
        }

        if ((field === "basePrice" || field === "vat") && contractHeaderId) {
          await syncContractHeaderFromServices(contractHeaderId);
        }

        // Always resync the Case's own totalAmount on a price change, regardless
        // of whether this row happens to also be linked to a quotation/contract â€”
        // steps 2-4 above only cover linked rows.
        if (field === "basePrice" || field === "vat") {
          await syncCaseTotalAmount(currentId);
        }
      };

      // â”€â”€ Create a new contractService record for a single projectService â”€â”€
      const buildProjectServiceContractPatch = (psRecord, contractLine, contractId, contractServiceId) => {
        const source = contractLine || psRecord || {};
        const packageMode =
          isPackageServiceRow(source) ||
          isPackageServiceRow(psRecord) ||
          isPackagePricing(source) ||
          parseNum(source.packageSubTotal) ||
          parseNum(source.packageTotalAmount);
        const status = contractStatusToServiceStatus(source.lineStatus || source.status);
        if (packageMode) {
          const packageTotals = calcPackageTotals(source, vndCurrency);
          return {
            contractId: parseInt(contractId, 10),
            contractServiceId: contractServiceId ? parseInt(contractServiceId, 10) : undefined,
            status,
            pricingMode: PRICING_MODE_PACKAGE,
            billingMode: BILLING_PACKAGE_INCLUDED,
            financialSourceType: SOURCE_CONTRACT,
            basePrice: 0,
            vat: 0,
            subTotal: packageTotals.subTotal,
            vatAmount: packageTotals.vatAmount,
            totalAmount: packageTotals.totalAmount,
            exchangeRateToBase: 1,
            packageSubTotal: packageTotals.subTotal,
            packageVatRate: packageTotals.vatRate,
            packageVatAmount: packageTotals.vatAmount,
            packageTotalAmount: packageTotals.totalAmount,
          };
        }

        const lineCurrencyId = extractCurrencyId(source.currencyId) || extractCurrencyId(psRecord?.currencyId) || null;
        const basePrice = Number(source.basePrice ?? psRecord?.basePrice) || 0;
        const quantity = Number(source.quantity ?? psRecord?.quantity ?? 1) || 1;
        const vat = Number(source.vat ?? psRecord?.vat) || 0;
        const pricing = getRowPricing({
          ...psRecord,
          ...source,
          basePrice,
          quantity,
          vat,
          currencyId: lineCurrencyId || extractCurrencyId(source.currencyId) || extractCurrencyId(psRecord?.currencyId) || null,
        });
        return {
          contractId: parseInt(contractId, 10),
          contractServiceId: contractServiceId ? parseInt(contractServiceId, 10) : undefined,
          status,
          pricingMode: PRICING_MODE_LINE,
          billingMode: BILLING_LINE,
          financialSourceType: SOURCE_CONTRACT,
          basePrice,
          quantity,
          vat,
          subTotal: pricing.subTotal,
          vatAmount: pricing.vatAmount,
          totalAmount: pricing.totalAmount,
          exchangeRateToBase: pricing.exchangeRateToBase,
          packageSubTotal: 0,
          packageVatRate: 0,
          packageVatAmount: 0,
          packageTotalAmount: 0,
          ...(lineCurrencyId ? { currencyId: lineCurrencyId } : {}),
        };
      };

      const syncProjectServiceFromContractLine = async (psRecord, contractLine, contractId) => {
        if (!psRecord?.id || !contractLine) return;
        const contractServiceId = extractId(contractLine.id);
        await updateProjectServiceSafely(
          psRecord.id,
          buildProjectServiceContractPatch(psRecord, contractLine, contractId, contractServiceId),
        );
      };

      const createContractServiceSafely = async (payload) => {
        const cleanPayload = stripContractServicePayload(payload);
        try {
          return await ctx.api.request({
            url: "contractServices:create",
            method: "POST",
            data: cleanPayload,
          });
        } catch (error) {
          const fallbackPayload = { ...cleanPayload };
          delete fallbackPayload.contracts;
          delete fallbackPayload.projectServices;
          delete fallbackPayload.quotationServices;
          try {
            return await ctx.api.request({
              url: "contractServices:create",
              method: "POST",
              data: fallbackPayload,
            });
          } catch (fallbackError) {
            const minimalPayload = { ...fallbackPayload };
            delete minimalPayload.ServiceId;
            return ctx.api.request({
              url: "contractServices:create",
              method: "POST",
              data: minimalPayload,
            });
          }
        }
      };

      const createContractServiceRecord = async (psRecord, contractId, quotationServiceId) => {
        try {
          const packageMode =
            isPackageServiceRow(psRecord) ||
            parseNum(psRecord.packageSubTotal) ||
            parseNum(psRecord.packageTotalAmount);
          const packageTotals = packageMode ? calcPackageTotals(psRecord, vndCurrency) : null;
          const basePrice = packageMode ? 0 : (Number(psRecord._quotedBasePrice ?? psRecord.basePrice) || 0);
          const quantity = packageMode ? 1 : (Number(psRecord._quotedQuantity ?? psRecord.quantity ?? 1) || 1);
          const vat = packageMode ? 0 : (Number(psRecord._quotedVat ?? psRecord.vat ?? 0) || 0);
          const lineCurrency = currencyFromRecord(psRecord, currencies, caseCurrency);
          const linePricing = packageMode
            ? { subTotal: 0, vatAmount: 0, totalAmount: 0, exchangeRateToBase: 1 }
            : (await getWritableLinePricing(psRecord, { basePrice, quantity, vat })).pricing;
          const subTotal = packageMode ? 0 : linePricing.subTotal;
          const vatAmount = packageMode ? 0 : linePricing.vatAmount;
          const totalAmount = packageMode ? 0 : linePricing.totalAmount;

          // Package mode is priced as a single block on the contract's main
          // currency, so per-line currencyId is only carried over for line mode
          // (mirrors buildProjectServiceContractPatch's lineCurrencyId).
          const lineCurrencyId = packageMode ? null : (extractCurrencyId(lineCurrency) || null);

          const payload = {
            projectId: parseInt(currentId),
            contractId: parseInt(contractId),
            contracts: parseInt(contractId),
            projectServiceId: parseInt(psRecord.id),
            projectServices: parseInt(psRecord.id),
            quotationServiceId: quotationServiceId ? parseInt(quotationServiceId) : null,
            quotationServices: quotationServiceId ? parseInt(quotationServiceId) : undefined,
            serviceId: extractId(psRecord.serviceId) || extractId(psRecord.services) || null,
            ServiceId: extractId(psRecord.serviceId) || extractId(psRecord.services) || null,
            serviceName: psRecord._quotedServiceName || psRecord.serviceName || psRecord.services?.serviceName || null,
            serviceType: psRecord._quotedServiceType || psRecord.serviceType || psRecord.services?.serviceType || null,
            description: psRecord._quotedDescription || psRecord.description || null,
            basePrice,
            quantity,
            vat,
            subTotal,
            vatAmount,
            totalAmount,
            exchangeRateToBase: linePricing.exchangeRateToBase,
            pricingMode: packageMode ? PRICING_MODE_PACKAGE : (psRecord.pricingMode || PRICING_MODE_LINE),
            billingMode: packageMode ? BILLING_PACKAGE_INCLUDED : (psRecord.billingMode || BILLING_LINE),
            financialSourceType: SOURCE_CONTRACT,
            lineStatus: packageMode ? "included_in_package" : "active",
            packageSubTotal: packageMode ? packageTotals.subTotal : null,
            packageVatRate: packageMode ? packageTotals.vatRate : null,
            packageVatAmount: packageMode ? packageTotals.vatAmount : null,
            packageTotalAmount: packageMode ? packageTotals.totalAmount : null,
            ...(lineCurrencyId ? { currencyId: lineCurrencyId, currency: lineCurrencyId } : {}),
          };

          const createdRes = await createContractServiceSafely(payload);
          const createdLine = createdRes?.data?.data || createdRes?.data || {};
          const contractServiceId = extractId(createdLine?.id);

          if (contractServiceId) {
            await updateProjectServiceSafely(psRecord.id, {
              ...buildProjectServiceContractPatch(
                psRecord,
                { ...payload, ...createdLine, id: contractServiceId },
                contractId,
                contractServiceId,
              ),
            });
          }
        } catch (err) {
          console.error("[CaseServices] createContractServiceRecord failed", err);
          throw err;
        }
      };

      const loadData = async () => {
        if (!currentId) return;
        setLoading(true);
        try {
          const [svcRes, caseRes, currs] = await Promise.all([
            ctx.api.request({
              url: "projectServices:list",
              params: {
                filter: JSON.stringify({ projectId: { $eq: parseInt(currentId) } }),
                pageSize: 500,
                sort: ["createdAt"],
                appends: ["services", "currencies"],
              },
            }),
            ctx.api.request({
              url: "projects:get",
              params: { filterByTk: currentId },
            }),
            fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
          ]);

          const info = caseRes?.data?.data || caseRes?.data || {};
          setCaseInfo(info);
          setCurrencies(currs);

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
                appends: ["contracts", "projectServices", "quotationServices", "currency"],
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
                pageSize: 500,
                appends: ["currency"],
              }
            });
            const qSvcArr = qSvcsRes?.data?.data || [];
            // Build map: quotationServiceId -> enriched record
            // Also build by (quotationId, serviceId) for matching
            qSvcArr.forEach(qs => {
              const qId = extractId(qs.quotationId) || qs.quotationId;
              const sId = extractId(qs.serviceId) || qs.serviceId || qs.serviceName || "";
              const sName = normalizeLookupText(qs.serviceName || qs.services?.serviceName || qs.name);
              const entry = {
                ...qs,
                _isMainQuote: qId === extractId(info.quotationId),
                _quotationId: qId
              };
              const key = `${qId}_${sId}`;
              qSvcsMap[key] = entry;
              if (qId && sName) qSvcsMap[`${qId}_name_${sName}`] = entry;
              // Also index by id for direct lookup
              qSvcsMap[`id_${qs.id}`] = entry;
            });
          }

          const pServices = svcRes?.data?.data || [];
          const enrichedServices = [];

          for (const ps of pServices) {
            // Primary: match by quotationServiceId stored on projectService (most reliable)
            const psQSvcId = extractId(ps.quotationServiceId) || extractId(ps.quotationServices) || ps.quotationServiceId;
            let qSvc = psQSvcId ? qSvcsMap[`id_${psQSvcId}`] : null;

            // Secondary: match by (quotationId, serviceId/serviceName)
            if (!qSvc) {
              const psQId = extractId(ps.quotationId) || extractId(ps.quotations) || extractId(info.quotationId) || ps.quotationId;
              const psSId = extractId(ps.serviceId) || ps.serviceId || ps.serviceName || "";
              const psNameForMatch = normalizeLookupText(ps.serviceName || ps.services?.serviceName || ps.name);
              if (psQId && psSId) {
                const key = `${psQId}_${psSId}`;
                qSvc = qSvcsMap[key];
              }
              if (!qSvc && psQId && psNameForMatch) {
                qSvc = qSvcsMap[`${psQId}_name_${psNameForMatch}`];
              }
            }

            // Tertiary: if still not found, search by serviceId/name within the quotation scope.
            if (!qSvc) {
              const psSId = extractId(ps.serviceId);
              const psNameForMatch = normalizeLookupText(ps.serviceName || ps.services?.serviceName || ps.name);
              if (psSId || psNameForMatch) {
                qSvc = Object.values(qSvcsMap).find(qs =>
                  qs.id && // skip index aliases
                  (
                    (psSId && extractId(qs.serviceId) === psSId) ||
                    (psNameForMatch && normalizeLookupText(qs.serviceName || qs.services?.serviceName || qs.name) === psNameForMatch)
                  )
                );
              }
            }

            let qStatus = null;
            let qTitle = null;
            let qCode = null;
            const storedStatus = String(ps.status || "").toLowerCase().trim();
            let effectiveStatus = TERMINAL_SERVICE_STATUSES.includes(storedStatus) ? storedStatus : "pending_quote";
            let contractIdToSave = null;
            const psContractId = extractId(ps.contractId) || extractId(ps.contract) || extractId(ps.contracts);
            const psContractServiceId = extractId(ps.contractServiceId) || extractId(ps.contractServices);
            const psServiceId = extractId(ps.serviceId) || extractId(ps.services);
            const psName = normalizeLookupText(ps.serviceName || ps.services?.serviceName || ps.name);
            const projectServiceContractLine = allContractServices.find(cs => {
              const linkedServiceId = extractId(cs.projectServiceId) || extractId(cs.projectServices);
              if (linkedServiceId && String(linkedServiceId) === String(ps.id)) return true;
              if (psContractServiceId && String(extractId(cs.id)) === String(psContractServiceId)) return true;

              const csQSvcId = extractId(cs.quotationServiceId) || extractId(cs.quotationServices);
              if (psQSvcId && csQSvcId && String(csQSvcId) === String(psQSvcId)) return true;

              const csContractId = extractId(cs.contractId) || extractId(cs.contracts);
              const sameContract = psContractId && csContractId && String(psContractId) === String(csContractId);
              if (!sameContract) return false;

              const csServiceId = extractId(cs.serviceId) || extractId(cs.ServiceId) || extractId(cs.services);
              if (psServiceId && csServiceId && String(psServiceId) === String(csServiceId)) return true;

              const csName = normalizeLookupText(cs.serviceName || cs.services?.serviceName || cs.name);
              return !!psName && !!csName && psName === csName;
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

                if (!TERMINAL_SERVICE_STATUSES.includes(storedStatus)) {
                  if (qStatus === "cancelled") {
                    effectiveStatus = "cancelled";
                  } else {
                    effectiveStatus = quoteServiceStatus;
                  }

                  // Fetch the contract directly linked to this quotation
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
              // Fetch the contract directly linked to the main quotation
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
                if (!TERMINAL_SERVICE_STATUSES.includes(storedStatus)) {
                  const mcStatus = String(mainContract.status || "").toLowerCase().trim();
                  effectiveStatus = contractStatusToServiceStatus(mcStatus);
                }
              } else if (!TERMINAL_SERVICE_STATUSES.includes(storedStatus)) {
                const mqStatus = String(info._mainQuote?.status || "").toLowerCase().trim();
                effectiveStatus = mqStatus === "new" && info._mainQuote?.isRequiredApproval
                  ? "quote_pending_approval"
                  : quoteStatusToServiceStatus(mqStatus);
              }
            } else if ((extractId(ps.quotationId) || extractId(ps.quotations) || psQSvcId) && !TERMINAL_SERVICE_STATUSES.includes(storedStatus)) {
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

            if (qSvc && projectServiceContractLine && !TERMINAL_SERVICE_STATUSES.includes(storedStatus)) {
              effectiveStatus = "quote_and_contract";
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
              _contractId: contractIdToSave || contractLineContractId || psContractId || null,
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
              quantity: ps.quantity ?? projectServiceContractLine?.quantity ?? qSvc?.quantity ?? 1,
              vat: ps.vat ?? projectServiceContractLine?.vat ?? qSvc?.vat ?? 0,
              currencyId:
                ps.currencyId ??
                projectServiceContractLine?.currencyId ??
                qSvc?.currencyId ??
                null,
              currency:
                ps.currency ??
                projectServiceContractLine?.currency ??
                qSvc?.currency ??
                null,
              exchangeRateToBase:
                ps.exchangeRateToBase ??
                projectServiceContractLine?.exchangeRateToBase ??
                qSvc?.exchangeRateToBase ??
                null,
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
              // The quotation line's own currency can differ from ps.currencyId
              // (the projectService row) â€” keep it separately so quoted amounts
              // are never displayed under the wrong currency's code.
              _quotedCurrencyId: qSvc ? (getRecordCurrencyId(qSvc) || null) : null,
              _quotedCurrency: qSvc?.currency || null,
              _quotedExchangeRateToBase: qSvc?.exchangeRateToBase ?? null,
              _contractCurrencyId: projectServiceContractLine ? (getRecordCurrencyId(projectServiceContractLine) || null) : null,
              _contractCurrency: projectServiceContractLine?.currency || null,
              _contractExchangeRateToBase: projectServiceContractLine?.exchangeRateToBase ?? null,
              _qServiceId: qSvc?.id || psQSvcId || null,
              _isMainQuote: qSvc?._isMainQuote,
              _quotationId: qSvc?._quotationId || extractId(ps.quotationId) || extractId(ps.quotations) || null,
              _qStatus: qStatus,
              _qTitle: qTitle,
              _qCode: qCode
            });
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

      const openAddModal = (comboTarget = null) => {
        form.setFieldsValue({ currencyId: getCurrencySelectValue(caseCurrency) });
        setComboAddTarget(comboTarget);
        setAddModal(true);
      };

      const closeAddModal = () => {
        setAddModal(false);
        setComboAddTarget(null);
        form.resetFields();
      };

      const handleServiceChange = (svcId) => {
        const selected = serviceCatalog.find(s => String(s.id) === String(svcId));
        if (selected) {
          const svcCurrency = currencyFromRecord(selected, currencies, caseCurrency);
          form.setFieldsValue({
            serviceName: selected.serviceName || selected.name || "",
            serviceType: selected.serviceType || selected.type || "",
            description: selected.description || "",
            basePrice: selected.basePrice || 0,
            vat: selected.vat || 0,
            currencyId: getCurrencySelectValue(svcCurrency),
          });
        }
      };

      const handleInlineEdit = async (record, field, newValue) => {
        try {
          if (isServiceEditLocked(record)) {
            message.warning(
              record._isMainQuote
                ? "Cannot edit a service that belongs to the original quotation."
                : `Cannot edit this service because the supplemental quotation is in status: ${record._qStatus}`,
            );
            return;
          }

          if (field === "serviceName" && newValue) {
            const checkName = newValue.toLowerCase().trim();
            const isDuplicate = services.some(s =>
              s.id !== record.id &&
              (s.serviceName || s.services?.serviceName || s.name || "").toLowerCase().trim() === checkName
            );
            if (isDuplicate) {
              message.error("This service name already exists in the case!");
              return;
            }
          }

          if ((field === "basePrice" || field === "vat") && !isMoneyEditableServiceRow(record)) {
            message.warning("This service is included in the package; its per-line price cannot be edited.");
            return;
          }

          // Sync all 3 sources at once
          await syncAllThree(record, field, newValue);

          message.success("Updated and synced successfully");
          loadData();
        } catch (err) {
          console.error(err);
          message.error(err?.message || "Failed to update field");
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
            message.error("This service already exists in the case. Please choose or enter a different name!");
            setSubmitting(false);
            return;
          }

          // 1. Create projectServices
          const addAsPackage = servicePricingSummary.isPackageMode;
          const price = addAsPackage ? 0 : Number(values.basePrice) || 0;
          const vat = addAsPackage ? 0 : Number(values.vat) || 0;
          const selectedCatalogService = values.serviceId
            ? serviceCatalog.find((s) => String(s.id) === String(values.serviceId))
            : null;
          const explicitCurrency = values.currencyId ? resolveCurrency(values.currencyId, currencies) : null;
          const newRowCurrency = explicitCurrency || currencyFromRecord(selectedCatalogService, currencies, caseCurrency);
          const newRowCurrencyId = extractCurrencyId(
            newRowCurrency
          );
          const linePricing = addAsPackage
            ? { subTotal: 0, vatAmount: 0, totalAmount: 0, exchangeRateToBase: 1 }
            : (await getWritableLinePricing({
              serviceName: values.serviceName?.trim(),
              serviceType: values.serviceType?.trim(),
              description: values.description?.trim(),
              basePrice: price,
              quantity: 1,
              vat,
              currencyId: newRowCurrencyId || null,
              currency: newRowCurrencyId || null,
              pricingMode: PRICING_MODE_LINE,
              billingMode: BILLING_LINE,
            })).pricing;
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
            currencyId: newRowCurrencyId || null,
            currency: newRowCurrencyId || null,
            subTotal: linePricing.subTotal,
            vatAmount: linePricing.vatAmount,
            totalAmount: linePricing.totalAmount,
            exchangeRateToBase: linePricing.exchangeRateToBase,
            pricingMode: addAsPackage ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
            packageSubTotal: packageTotals.subTotal,
            packageVatRate: packageTotals.vatRate,
            packageVatAmount: packageTotals.vatAmount,
            packageTotalAmount: packageTotals.totalAmount,
            billingMode: addAsPackage ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
            financialSourceType: addAsPackage
              ? (caseInfo?._mainContract ? SOURCE_CONTRACT : caseInfo?._mainQuote ? SOURCE_QUOTATION : SOURCE_MANUAL)
              : SOURCE_MANUAL,
            comboId: comboAddTarget?.comboId || null,
            serviceCombo: comboAddTarget?.comboId || null,
            comboName: comboAddTarget?.comboName || null,
          };
          let psRes;
          try {
            psRes = await ctx.api.request({
              url: "projectServices:create",
              method: "POST",
              data: createData,
            });
          } catch (createError) {
            const fallback = stripProjectServiceSyncFields(createData);
            console.warn("Retrying projectService create without relation/amount sync fields:", createError);
            try {
              psRes = await ctx.api.request({
                url: "projectServices:create",
                method: "POST",
                data: fallback,
              });
            } catch (fallbackError) {
              const minimal = { ...fallback };
              delete minimal.pricingMode;
              delete minimal.billingMode;
              delete minimal.financialSourceType;
              delete minimal.packageSubTotal;
              delete minimal.packageVatRate;
              delete minimal.packageVatAmount;
              delete minimal.packageTotalAmount;
              console.warn("Retrying projectService create without pricing package fields:", fallbackError);
              psRes = await ctx.api.request({
                url: "projectServices:create",
                method: "POST",
                data: minimal,
              });
            }
          }
          const psId = psRes?.data?.data?.id || psRes?.data?.id;

          // Give this service its own upload folder — mirrors what
          // CaseCreateForm.js does per service at case-creation time, so task
          // uploads (TaskDetailView.js's resolveServiceUploadFolderId) land in
          // a dedicated folder instead of scattering into the case root,
          // regardless of whether the service was added at case creation or
          // later here. Never blocks the service creation itself on failure.
          if (psId) {
            try {
              const serviceCatalogId = values.serviceId ? parseInt(values.serviceId) : null;
              // A catalog service already added to this case (another row
              // with the same serviceId) already has a folder — reuse it
              // instead of creating a duplicate, mirroring CaseCreateForm.js's
              // dedupe-by-key (custom services have no serviceId, so they
              // always get their own folder).
              const existingSameServiceRow = serviceCatalogId
                ? services.find(
                    (s) => extractId(s.serviceId) === serviceCatalogId && extractId(s.folderId),
                  )
                : null;
              const reuseFolderId = existingSameServiceRow
                ? extractId(existingSameServiceRow.folderId)
                : null;

              if (reuseFolderId) {
                await ctx.api.request({
                  url: "projectServices:update",
                  method: "POST",
                  params: { filterByTk: psId },
                  data: { folderId: reuseFolderId },
                });
              } else {
                // The case root folder is the first "cases"-type folder ever
                // created for this project (see CaseCreateForm.js's pFolderRes)
                // — every other case folder (default templates, other service
                // folders) is created after it and nests under it.
                const caseRootRes = await ctx.api.request({
                  url: "folders:list",
                  params: {
                    filter: JSON.stringify({
                      projectId: { $eq: parseInt(currentId) },
                      type: { $eq: "cases" },
                    }),
                    sort: ["createdAt"],
                    pageSize: 1,
                  },
                });
                const caseRootFolderId = extractId(caseRootRes?.data?.data?.[0]?.id);

                if (caseRootFolderId) {
                  const newFolderRes = await ctx.api.request({
                    url: "folders:create",
                    method: "POST",
                    data: {
                      name: values.serviceName?.trim() || "New service",
                      type: "cases",
                      parentId: caseRootFolderId,
                      projectId: parseInt(currentId),
                      customerId:
                        extractId(caseInfo?.customerId) ||
                        extractId(caseInfo?.customer) ||
                        extractId(caseInfo?.customers) ||
                        null,
                      internalCompanyId:
                        extractId(caseInfo?.internalCompanyId) ||
                        extractId(caseInfo?.internalCompany) ||
                        null,
                      moduleScope: CASE_DOCUMENT_SCOPE,
                    },
                  });
                  const newFolderId = extractId(
                    newFolderRes?.data?.data?.id || newFolderRes?.data?.id,
                  );
                  if (newFolderId) {
                    await ctx.api.request({
                      url: "projectServices:update",
                      method: "POST",
                      params: { filterByTk: psId },
                      data: { folderId: newFolderId },
                    });
                  }
                }
              }
            } catch (folderErr) {
              console.warn("Could not create service folder:", folderErr);
            }
          }

          await syncCaseTotalAmount(currentId);

          message.success("Service saved. You can add a quotation or contract for it later.");
          closeAddModal();
          loadData();
        } catch (err) {
          console.error(err);
          message.error("Error: " + (err.message || ""));
        } finally {
          setSubmitting(false);
        }
      };

      const resolveRestoredServiceStatus = async (record) => {
        const contractId = getRowContractId(record);
        if (contractId) {
          try {
            const contractRes = await ctx.api.request({
              url: "contracts:get",
              params: { filterByTk: contractId },
            });
            const contract = contractRes?.data?.data || contractRes?.data;
            if (contract) return contractStatusToServiceStatus(contract.status);
          } catch (error) {
            console.warn("[CaseServices] Could not resolve contract status for restore", error);
          }
        }

        const quotationId = getRowQuotationId(record);
        if (quotationId) {
          try {
            const quotationRes = await ctx.api.request({
              url: "quotations:get",
              params: { filterByTk: quotationId },
            });
            const quotation = quotationRes?.data?.data || quotationRes?.data;
            if (quotation) {
              const quoteStatus = String(quotation.status || "").toLowerCase().trim();
              return quoteStatus === "new" && quotation.isRequiredApproval
                ? "quote_pending_approval"
                : quoteStatusToServiceStatus(quoteStatus);
            }
          } catch (error) {
            console.warn("[CaseServices] Could not resolve quotation status for restore", error);
          }
        }

        return "pending_quote";
      };

      const handleRestore = async (record) => {
        if (!isDeletedServiceLine(record)) return;

        setLoading(true);
        const syncWarnings = [];
        try {
          const restoredStatus = await resolveRestoredServiceStatus(record);
          const quotationId = getRowQuotationId(record);
          const contractId = getRowContractId(record);

          if (record._qServiceId && quotationId) {
            try {
              const targetQsRes = await ctx.api.request({
                url: "quotationServices:get",
                params: { filterByTk: record._qServiceId },
              });
              const targetQs = targetQsRes?.data?.data || targetQsRes?.data;

              if (targetQs && isDeletedServiceLine(targetQs)) {
                await ctx.api.request({
                  url: "quotationServices:update",
                  method: "POST",
                  params: { filterByTk: record._qServiceId },
                  data: { status: null },
                });
                await syncQuotationHeaderFromServices(quotationId);
              }
            } catch (quotationError) {
              console.warn("[CaseServices] Could not restore quotationService", quotationError);
              syncWarnings.push("quotation service");
            }
          }

          if (record._contractServiceId) {
            try {
              await ctx.api.request({
                url: "contractServices:update",
                method: "POST",
                params: { filterByTk: record._contractServiceId },
                data: {
                  status: null,
                  lineStatus: isPackageServiceRow(record) ? "included_in_package" : "active",
                },
              });
            } catch (contractLineError) {
              console.warn("[CaseServices] Could not restore contractService", contractLineError);
              syncWarnings.push("contract service");
            }
          }

          if (contractId) {
            try {
              await syncContractHeaderFromServices(contractId);
            } catch (contractError) {
              console.warn("[CaseServices] Could not sync contract totals after restore", contractError);
              syncWarnings.push("contract total");
            }
          }

          // projectServices is the primary status TaskManagement uses to reopen tasks.
          await ctx.api.request({
            url: "projectServices:update",
            method: "POST",
            params: { filterByTk: record.id },
            data: { status: restoredStatus },
          });

          await syncCaseTotalAmount(currentId);

          if (syncWarnings.length > 0) {
            message.warning(
              `Service and tasks restored. Could not sync: ${syncWarnings.join(", ")}.`,
            );
          } else {
            message.success("Service restored and its tasks reopened.");
          }
          await loadData();
        } catch (error) {
          console.error(error);
          message.error("Could not restore service: " + (error.message || ""));
        } finally {
          setLoading(false);
        }
      };

      // Soft-deletes a single service row and syncs its linked contract/
      // quotation lines — the shared core of handleDelete (one row) and
      // handleRemoveCombo (every row of a combo section at once). Does NOT
      // call syncCaseTotalAmount, show a message, or reload — callers own
      // those so a bulk caller can batch them into one pass instead of N.
      const softDeleteOneService = async (record, syncWarnings) => {
        // projectServices is the status source TaskManagement uses to lock all of the service's tasks.
        // Write this status first so a failure syncing the commercial data doesn't undo the lock.
        await ctx.api.request({
          url: "projectServices:update",
          method: "POST",
          params: { filterByTk: record.id },
          data: { status: "deleted" },
        });

        // Sync the contractService if any. This is a secondary step; it does not roll back projectService.
        if (record._contractServiceId) {
          try {
            await ctx.api.request({
              url: "contractServices:update",
              method: "POST",
              params: { filterByTk: record._contractServiceId },
              data: { status: "deleted", lineStatus: "deleted" },
            });
          } catch (csErr) {
            console.warn("[CaseServices] Could not soft-delete contractService", csErr);
            syncWarnings.push("contract service");
          }
        }

        // Sync the quotationService and its totals if any.
        if (record._qServiceId && record._quotationId) {
          try {
            const targetQsRes = await ctx.api.request({
              url: "quotationServices:get",
              params: { filterByTk: record._qServiceId }
            });
            const targetQs = targetQsRes?.data?.data || targetQsRes?.data;

            if (targetQs && !isDeletedServiceLine(targetQs)) {
              await ctx.api.request({
                url: "quotationServices:update",
                method: "POST",
                params: { filterByTk: record._qServiceId },
                data: { status: "deleted" },
              });
              await syncQuotationHeaderFromServices(record._quotationId);
            }
          } catch (qsErr) {
            console.warn("[CaseServices] Could not soft-delete quotationService", qsErr);
            syncWarnings.push("quotation service");
          }
        }

        // Recompute the contract header from the lines that are not deleted.
        if (record._contractId) {
          try {
            await syncContractHeaderFromServices(record._contractId);
          } catch (contractErr) {
            console.warn("[CaseServices] Could not sync contract totals after delete", contractErr);
            syncWarnings.push("contract total");
          }
        }
      };

      const handleDelete = async (record) => {
        if (isDeletedServiceLine(record)) {
          message.info("This service is already marked as deleted.");
          return;
        }

        setLoading(true);
        const syncWarnings = [];
        try {
          await softDeleteOneService(record, syncWarnings);
          await syncCaseTotalAmount(currentId);

          if (syncWarnings.length > 0) {
            message.warning(
              `Service deleted and its tasks locked. Could not sync: ${syncWarnings.join(", ")}.`,
            );
          } else {
            message.success("Service deleted, related data synced, and its tasks locked.");
          }
          await loadData();
        } catch (err) {
          console.error(err);
          message.error("Could not mark the service as deleted: " + (err.message || ""));
        } finally {
          setLoading(false);
        }
      };

      // Bulk-removes every (non-deleted) row tagged with a given comboId — the
      // combo section header's "Remove combo" action. Reuses
      // softDeleteOneService per row but batches syncCaseTotalAmount/
      // message/loadData into a single pass instead of one per row.
      const handleRemoveCombo = async (groupKey) => {
        const groupRows = services.filter(
          (row) => !isDeletedServiceLine(row) && getComboGroupKey(row) === groupKey,
        );
        if (!groupRows.length) return;

        setLoading(true);
        const syncWarnings = [];
        try {
          for (const row of groupRows) {
            await softDeleteOneService(row, syncWarnings);
          }
          await syncCaseTotalAmount(currentId);

          if (syncWarnings.length > 0) {
            message.warning(
              `Combo removed (${groupRows.length} service(s)) and its tasks locked. Could not sync: ${syncWarnings.join(", ")}.`,
            );
          } else {
            message.success(`Combo removed (${groupRows.length} service(s)), related data synced, and its tasks locked.`);
          }
          await loadData();
        } catch (err) {
          console.error(err);
          message.error("Could not remove the combo: " + (err.message || ""));
        } finally {
          setLoading(false);
        }
      };

      // â”€â”€ Open the service-select modal for a contract â”€â”€
      const openContractWithServiceSelect = (record) => {
        setServiceSelectModal({
          open: true,
          mode: "contract",
          triggerRecord: record,
          selectedIds: [record.id], // pre-select the service that was clicked
          pendingContractId: null,
        });
      };

      // â”€â”€ Open the service-select modal for a quotation â”€â”€
      const openQuotationWithServiceSelect = (record) => {
        setServiceSelectModal({
          open: true,
          mode: "quotation",
          triggerRecord: record,
          selectedIds: [record.id], // pre-select the service that was clicked
          pendingContractId: null,
        });
      };

      // â”€â”€ Handles the user clicking "Continue" in ServiceSelectModal (Quotation) â”€â”€
      const handleQuotationServiceSelectConfirm = async () => {
        const { triggerRecord, selectedIds } = serviceSelectModal;
        if (!selectedIds || selectedIds.length === 0) {
          message.warning("Please select at least 1 service.");
          return;
        }
        setServiceSelectSubmitting(true);
        try {
          const selectedRecords = services.filter(s => selectedIds.includes(s.id));

          const aggregateAmounts = await getSelectionAmounts(selectedRecords);
          const aggregateSubTotal = aggregateAmounts.subTotal;
          const aggregateVatAmount = aggregateAmounts.vatAmount;
          const aggregateTotalAmount = aggregateAmounts.totalAmount;

          const baseParams = getQuotationPopupParams(triggerRecord);
          const mergedParams = {
            ...baseParams,
            subTotal: aggregateSubTotal,
            vatAmount: aggregateVatAmount,
            totalAmount: aggregateTotalAmount,
            projectServiceIds: selectedIds.join(","),
            projectServiceId: selectedIds.join(","),
            selectedServiceCount: selectedIds.length,
          };

          const popupTitle = caseInfo?.quotationId ? "Create Sub-Quotation" : "Create Quotation";

          setServiceSelectModal(prev => ({ ...prev, open: false }));

          await openManualPopup(QUOTATION_POPUP_UID, popupTitle, mergedParams);

          await syncCaseTotalAmount(currentId);
          await loadData();
          message.success(`âœ… Quotation created and linked to ${selectedRecords.length} services`);
        } catch (err) {
          console.error(err);
          message.error("Error processing quotation: " + (err.message || ""));
        } finally {
          setServiceSelectSubmitting(false);
        }
      };

      // â”€â”€ Handles the user clicking "Continue" in ServiceSelectModal (Contract) â”€â”€
      const handleContractServiceSelectConfirm = async () => {
        const { triggerRecord, selectedIds } = serviceSelectModal;
        if (!selectedIds || selectedIds.length === 0) {
          message.warning("Please select at least 1 service.");
          return;
        }
        setServiceSelectSubmitting(true);
        try {
          // Get the records matching selectedIds
          const selectedRecords = services.filter(s => selectedIds.includes(s.id));

          // Aggregate the amount from all selected services
          const aggregateAmounts = await getSelectionAmounts(selectedRecords);
          const aggregateSubTotal = aggregateAmounts.subTotal;
          const aggregateVatAmount = aggregateAmounts.vatAmount;
          const aggregateTotalAmount = aggregateAmounts.totalAmount;

          // Build params from triggerRecord (carries case/customer/lawyer context...)
          // but override the totals with the aggregate
          const baseParams = getContractPopupParams(triggerRecord);
          const mergedParams = {
            ...baseParams,
            subTotal: aggregateSubTotal,
            vatAmount: aggregateVatAmount,
            totalAmount: aggregateTotalAmount,
            // Also pass the list of serviceIds so the popup can display them
            selectedProjectServiceIds: selectedIds,
            projectServiceIds: selectedIds.join(","),
            projectServiceId: selectedIds.join(","),
            selectedServiceCount: selectedIds.length,
          };

          const popupTitle = triggerRecord?._isMainQuote ? "Create Contract" : "Create Sub-Contract";

          // Remember caseInfo.contractId before opening the popup, to detect a new contractId afterwards
          const contractIdBefore = extractId(caseInfo?.contractId);

          // Close the service-select modal first
          setServiceSelectModal(prev => ({ ...prev, open: false }));

          // Open the NocoBase contract-creation popup
          await openManualPopup(CONTRACT_POPUP_UID, popupTitle, mergedParams);

          // After the popup closes: reload data to detect the new contractId
          await loadData();

          // Detect the new contractId (needs a re-fetch since loadData updates state asynchronously)
          try {
            const freshCaseRes = await ctx.api.request({
              url: "projects:get",
              params: { filterByTk: currentId },
            });
            const freshCase = freshCaseRes?.data?.data || freshCaseRes?.data || {};
            const contractIdAfter = extractId(freshCase.contractId);

            if (contractIdAfter && contractIdAfter !== contractIdBefore) {
              // Create a contractService for each selected service
              for (const ps of selectedRecords) {
                // Check whether the contractService already exists (avoid duplicates)
                const existingCSRes = await ctx.api.request({
                  url: "contractServices:list",
                  params: {
                    filter: JSON.stringify({
                      projectServiceId: { $eq: parseInt(ps.id) },
                      contractId: { $eq: parseInt(contractIdAfter) },
                    }),
                    pageSize: 1,
                  },
                });
                const existingCS = existingCSRes?.data?.data?.[0];
                if (!existingCS) {
                  await createContractServiceRecord(ps, contractIdAfter, ps._qServiceId || null);
                } else {
                  await syncProjectServiceFromContractLine(ps, existingCS, contractIdAfter);
                }
              }
              await syncContractHeaderFromServices(contractIdAfter);
              message.success(`âœ… Contract created and linked to ${selectedRecords.length} services`);
            } else {
              // contractId unchanged â€” could be an appendix, or the popup was cancelled
              // Capture knownContractIds BEFORE loadData() to avoid a race condition
              const knownContractIds = new Set(services.map(s => s._contractId).filter(Boolean).map(String));

              // Try to detect via the most recent contractServices â€” a large enough pageSize to not miss any
              const recentCSRes = await ctx.api.request({
                url: "contractServices:list",
                params: {
                  filter: JSON.stringify({ projectId: { $eq: parseInt(currentId) } }),
                  sort: ["-createdAt"],
                  pageSize: Math.max(50, selectedIds.length * 10),
                },
              });
              const recentCS = recentCSRes?.data?.data || [];
              // Find the newly created contract within recentCS (not yet present in the current services)
              const newContractCandidate = recentCS.find(cs => {
                const cid = String(extractId(cs.contractId) || extractId(cs.contracts) || "");
                return cid && !knownContractIds.has(cid);
              });
              const newContractId = newContractCandidate
                ? (extractId(newContractCandidate.contractId) || extractId(newContractCandidate.contracts))
                : null;

              if (newContractId) {
                for (const ps of selectedRecords) {
                  // Look in recentCS first; fall back to a DB query to avoid duplicates
                  let existingCS = recentCS.find(cs => {
                    const csPS = extractId(cs.projectServiceId) || extractId(cs.projectServices);
                    const csCT = extractId(cs.contractId) || extractId(cs.contracts);
                    return String(csPS) === String(ps.id) && String(csCT) === String(newContractId);
                  });
                  if (!existingCS) {
                    // Double-check the DB to make sure it's not a duplicate (recentCS may be paginated)
                    try {
                      const checkCSRes = await ctx.api.request({
                        url: "contractServices:list",
                        params: {
                          filter: JSON.stringify({
                            projectServiceId: { $eq: parseInt(ps.id) },
                            contractId: { $eq: parseInt(newContractId) },
                          }),
                          pageSize: 1,
                        },
                      });
                      existingCS = checkCSRes?.data?.data?.[0];
                    } catch (_) { }
                  }
                  if (!existingCS) {
                    await createContractServiceRecord(ps, newContractId, ps._qServiceId || null);
                  } else {
                    await syncProjectServiceFromContractLine(ps, existingCS, newContractId);
                  }
                }
                await syncContractHeaderFromServices(newContractId);
                message.success(`âœ… Linked ${selectedRecords.length} services into the contract/appendix`);
              }
            }
          } catch (detectErr) {
            console.warn("[CaseServices] Could not detect new contractId to create contractServices", detectErr);
          }

          await syncCaseTotalAmount(currentId);

          // One final reload to reflect the newly created contractServices
          loadData();
        } catch (err) {
          console.error(err);
          message.error("Error processing contract: " + (err.message || ""));
        } finally {
          setServiceSelectSubmitting(false);
        }
      };

      const handleCreateSubContract = async (record) => {
        try {
          await openManualPopup(
            CONTRACT_POPUP_UID,
            record?._isMainQuote ? "Create Contract" : "Create Sub-Contract",
            getContractPopupParams(record)
          );
        } catch (err) {
          console.error("[handleCreateSubContract]", err);
          message.error("Cannot open the contract creation form.");
        }
      };

      const servicePricingSummary = useMemo(() => {
        const packageRows = services.filter(isPackageServiceRow);
        const billableRows = services.filter(isMoneyEditableServiceRow);
        const scopeRows = services.filter(isScopeOnlyServiceRow);

        // The whole case has ONE combined package total, shared by every
        // package-priced row regardless of which combo it belongs to â€” combos
        // are an organizational grouping of services, not separate price
        // groups. So every package row broadcasts the SAME
        // packageSubTotal/vatRate/vatAmount/totalAmount, and editing that one
        // total must patch every package row in the case at once, or rows
        // drift out of sync with each other (the "only one row updates" bug).
        const packageRowSource = packageRows.find(
          (record) => parseNum(record.packageSubTotal) || parseNum(record.packageTotalAmount),
        );
        const packageSource = [packageRowSource, caseInfo, caseInfo?._mainContract, caseInfo?._mainQuote]
          .filter(Boolean)
          .find((record) => isPackagePricing(record));
        const isPackageMode = !!packageRows.length || !!packageSource;
        const packageTotals = packageSource
          ? calcPackageTotals(packageSource, vndCurrency)
          : { subTotal: 0, vatRate: 0, vatAmount: 0, totalAmount: 0 };
        const lineTotals = billableRows.reduce(
          (sum, row) => ({
            subTotal: sum.subTotal + getRowSubTotal(row),
            vatAmount: sum.vatAmount + getRowVatAmount(row, vndCurrency),
            totalAmount: sum.totalAmount + getRowTotalAmount(row, vndCurrency),
          }),
          { subTotal: 0, vatAmount: 0, totalAmount: 0 },
        );

        return {
          isPackageMode,
          packageIncludedCount: packageRows.length,
          billableCount: billableRows.length,
          scopeOnlyCount: scopeRows.length,
          packageRecord: packageRowSource || packageRows[0] || null,
          // Every package row in the case, so editing the one case-level
          // package total patches all of them together.
          allPackageRows: packageRows,
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
      }, [services, caseInfo, vndCurrency, exchangeRates, currencies, caseCurrency]);

      const renderAmount = (value, color = token.colorText) =>
        React.createElement(Text, {
          strong: true,
          style: { color, fontFamily: token.fontFamilyCode, whiteSpace: "nowrap" },
        }, formatMoney(value, vndCurrency));

      // Package VAT amount / Package total are never directly editable â€” they
      // are always derived from subtotal + VAT rate, so this only accepts
      // edits to those two fields.
      const buildPackageSummaryPatch = (field, value, current = servicePricingSummary.packageTotals) => {
        const nextSubTotal = field === "packageSubTotal" ? parseNum(value) : current.subTotal;
        const nextVatRate = field === "packageVatRate" ? parseNum(value) : current.vatRate;
        const nextVatAmount = roundMoneyForCurrency((nextSubTotal * nextVatRate) / 100, vndCurrency);
        const nextTotalAmount = nextSubTotal + nextVatAmount;
        return {
          pricingMode: PRICING_MODE_PACKAGE,
          billingMode: BILLING_PACKAGE_INCLUDED,
          basePrice: 0,
          vat: 0,
          subTotal: nextSubTotal,
          vatAmount: nextVatAmount,
          totalAmount: nextTotalAmount,
          packageSubTotal: nextSubTotal,
          packageVatRate: nextVatRate,
          packageVatAmount: nextVatAmount,
          packageTotalAmount: nextTotalAmount,
        };
      };

      // Applies one package-total field edit to every row of a package group at
      // once â€” a combo's rows all broadcast the SAME packageSubTotal/.../
      // packageTotalAmount, so editing must patch every row in the group, not
      // just one, or the group's rows drift out of sync with each other (the
      // "only the last row updates" bug).
      const applyPackageSummaryPatch = async (groupRows, patch) => {
        if (!groupRows.length) {
          message.warning("No package service line is available to update.");
          return;
        }
        setLoading(true);
        try {
          for (const row of groupRows) {
            await updateProjectServiceSafely(row.id, patch);
            if (row._qServiceId) {
              try {
                await ctx.api.request({
                  url: "quotationServices:update",
                  method: "POST",
                  params: { filterByTk: row._qServiceId },
                  data: patch,
                });
              } catch (e) {
                console.warn("[CaseServices] applyPackageSummaryPatch: could not update quotationServices:", e);
              }
            }
            if (row._contractServiceId) {
              try {
                await ctx.api.request({
                  url: "contractServices:update",
                  method: "POST",
                  params: { filterByTk: row._contractServiceId },
                  data: patch,
                });
              } catch (e) {
                console.warn("[CaseServices] applyPackageSummaryPatch: could not update contractServices:", e);
              }
            }
          }
          const quotationIds = new Set(groupRows.map((r) => r._quotationId).filter(Boolean));
          for (const qid of quotationIds) await syncQuotationHeaderFromServices(qid);
          const contractIds = new Set(groupRows.map((r) => getRowContractId(r)).filter(Boolean));
          for (const cid of contractIds) await syncContractHeaderFromServices(cid);
          await syncCaseTotalAmount(currentId);
          message.success("Package totals updated.");
          await loadData();
        } catch (err) {
          console.error(err);
          message.error("Failed to update package totals.");
        } finally {
          setLoading(false);
        }
      };

      // The footer's package-total inputs edit a local DRAFT only (no API
      // calls while typing) so deleting/retyping a digit mid-edit never
      // fires a save on an incomplete value â€” committing happens only on
      // "Save". packageTotalsView is what the inputs actually display:
      // the draft while one is pending, otherwise the live server values.
      const packageTotalsView = packageDraft || servicePricingSummary.packageTotals;

      const updatePackageDraftField = (field, value) => {
        const current = packageDraft || servicePricingSummary.packageTotals;
        const patch = buildPackageSummaryPatch(field, value, current);
        setPackageDraft({
          subTotal: patch.packageSubTotal,
          vatRate: patch.packageVatRate,
          vatAmount: patch.packageVatAmount,
          totalAmount: patch.packageTotalAmount,
        });
      };

      const handleCancelPackageDraft = () => setPackageDraft(null);

      const handleSavePackageSummary = async () => {
        if (!packageDraft) return;
        const patch = {
          pricingMode: PRICING_MODE_PACKAGE,
          billingMode: BILLING_PACKAGE_INCLUDED,
          basePrice: 0,
          vat: 0,
          subTotal: packageDraft.subTotal,
          vatAmount: packageDraft.vatAmount,
          totalAmount: packageDraft.totalAmount,
          packageSubTotal: packageDraft.subTotal,
          packageVatRate: packageDraft.vatRate,
          packageVatAmount: packageDraft.vatAmount,
          packageTotalAmount: packageDraft.totalAmount,
        };
        await applyPackageSummaryPatch(servicePricingSummary.allPackageRows, patch);
        setPackageDraft(null);
      };

      if (!currentId) {
        return React.createElement("div", { style: { padding: 16 } }, "Case information not found.");
      }

      const columns = [
        {
          title: "#",
          key: "index",
          width: 50,
          align: "center",
          render: (_, record) => record._displayIndex,
        },
        {
          title: "Service Type",
          dataIndex: "serviceType",
          key: "serviceType",
          width: 150,
          render: (text, record) => {
            return React.createElement(EditableCell, {
              value: text,
              onSave: (val) => handleInlineEdit(record, "serviceType", val),
              disabled: isServiceEditLocked(record)
            });
          },
        },
        {
          title: "Service",
          dataIndex: "serviceName",
          key: "serviceName",
          width: 250,
          render: (text, record) => {
            const val = text || record.services?.serviceName || record.name;
            const mainQuoteTitle = caseInfo?._mainQuote?.title || "Original quotation";
            const subtext = record._isMainQuote
              ? mainQuoteTitle
              : (record._qCode
                ? `Supplemental quotation #${record._qCode}`
                : (record._qTitle || `Supplemental quotation #${record._quotationId || "..."}`));

            return React.createElement("div", { style: { display: "flex", flexDirection: "column" } },
              React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
                React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                  (() => {
                    return React.createElement(EditableCell, {
                      value: val,
                      onSave: (v) => handleInlineEdit(record, "serviceName", v),
                      disabled: isServiceEditLocked(record)
                    });
                  })()
                ),
                record._isMainQuote ?
                  React.createElement(Tooltip, { title: "Service belongs to the original quotation" },
                    React.createElement(Tag, { color: "blue", style: { margin: 0, fontSize: 10, lineHeight: "16px" } }, "Main")
                  ) :
                  (record._quotationId ?
                    React.createElement(Tooltip, { title: "Additional service (Sub-Quotation)" },
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
                React.createElement("span", { style: { opacity: 0.6 } }, "â†³"),
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
            return React.createElement(EditableCell, {
              value: text,
              onSave: (val) => handleInlineEdit(record, "description", val),
              isTextArea: true,
              disabled: isServiceEditLocked(record)
            });
          },
        },
        {
          title: "Subtotal",
          dataIndex: "basePrice",
          key: "basePrice",
          width: 140,
          render: (text, record) => {
            // A combo's price lives once in the case-wide package footer, not
            // per service, so per-row pricing cells are pure noise here.
            if (isPackageServiceRow(record)) return null;
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
            const rowCurrency = getRowCurrency(record);
            const pricing = getRowPricing(record);
            return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2, alignItems: "stretch" } },
              React.createElement(EditableCell, {
                value: text,
                isMoney: true,
                currency: rowCurrency,
                onSave: (val) => handleInlineEdit(record, "basePrice", val),
                disabled: isServiceEditLocked(record) || !isMoneyEditableServiceRow(record)
              }),
              !isSameCurrency(rowCurrency, vndCurrency) && React.createElement(Text, {
                type: pricing._convertible ? "secondary" : "danger",
                style: { fontSize: 11, textAlign: "right" },
              }, pricing._convertible ? `≈ ${formatMoney(pricing.subTotal, vndCurrency)}` : "Thiếu tỷ giá quy đổi")
            );
          },
        },
        {
          title: "VAT (%)",
          dataIndex: "vat",
          key: "vat",
          width: 100,
          render: (text, record) => {
            if (isPackageServiceRow(record)) return null;
            if (!isMoneyEditableServiceRow(record)) {
              return React.createElement("span", { style: { color: C.textSub, fontSize: 12 } }, "0%");
            }
            return React.createElement(EditableCell, {
              value: text,
              isNumber: true,
              suffix: "%",
              onSave: (val) => handleInlineEdit(record, "vat", val),
              disabled: isServiceEditLocked(record)
            });
          },
        },
        {
          title: "VAT amount",
          dataIndex: "vatAmount",
          key: "vatAmount",
          width: 140,
          align: "right",
          render: (_, record) => {
            if (isPackageServiceRow(record)) return null;
            if (!isMoneyEditableServiceRow(record)) {
              return React.createElement("span", { style: { color: C.textSub } }, "â€”");
            }
            const pricing = getRowPricing(record);
            return React.createElement("span", {
              style: {
                display: "inline-block",
                padding: "4px 8px",
                fontWeight: 600,
                color: pricing._convertible ? "#92400e" : C.danger,
                whiteSpace: "nowrap",
              }
            }, pricing._convertible ? formatMoney(pricing.vatAmount, vndCurrency) : "Thiếu tỷ giá");
          },
        },
        {
          title: "Total amount",
          dataIndex: "totalAmount",
          key: "totalAmount",
          width: 150,
          align: "right",
          render: (_, record) => {
            if (isPackageServiceRow(record)) return null;
            if (!isMoneyEditableServiceRow(record)) {
              return React.createElement("span", { style: { color: C.textSub } }, "â€”");
            }
            const pricing = getRowPricing(record);
            return React.createElement("span", {
              style: {
                display: "inline-block",
                padding: "4px 8px",
                fontWeight: 700,
                color: pricing._convertible ? "#096dd9" : C.danger,
                whiteSpace: "nowrap",
              }
            }, pricing._convertible ? formatMoney(pricing.totalAmount, vndCurrency) : "Thiếu tỷ giá");
          },
        },
        {
          title: "Status",
          dataIndex: "status",
          key: "status",
          width: 170,
          align: "center",
          render: (status) => {
            const commercialCfg = COMMERCIAL_STATUS[status || "pending_quote"] || { color: "#8c8c8c", bg: "#fafafa", border: "#d9d9d9", label: status || "â€”", description: "This status has not been configured." };
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
            const svcStatus = record.status || "pending_quote";
            const isDeleted = isDeletedServiceLine(record);
            const quotationDetailId = getRowQuotationId(record);
            const contractDetailId = getRowContractId(record);

            return React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" } },
              React.createElement(ActionIconButton, {
                title: "Compare data",
                icon: "compare",
                onClick: () => setCompareModal({ open: true, data: record }),
                color: "#475569",
              }),

              quotationDetailId && React.createElement(ActionIconButton, {
                title: "View quotation detail",
                icon: "detail",
                onClick: () => openRecordDetail("quotation", quotationDetailId, "Quotation detail"),
                color: "#0891b2",
              }),

              contractDetailId && React.createElement(ActionIconButton, {
                title: "View contract detail",
                icon: "detail",
                onClick: () => openRecordDetail("contract", contractDetailId, "Contract detail"),
                color: "#7c3aed",
              }),

              svcStatus === "pending_quote" && React.createElement(ActionIconButton, {
                title: caseInfo?.quotationId ? "Create supplemental quotation (select services)" : "Create quotation (select services)",
                icon: "quote",
                onClick: () => openQuotationWithServiceSelect(record),
                primary: true,
                color: "#1677ff",
              }),

              // Create Contract button â€” opens the service-select modal first
              !contractDetailId && !["contracted", "contract_pending_signature", "active", "completed", "cancelled", "deleted"].includes(svcStatus) && React.createElement(ActionIconButton, {
                title: isMain ? "Create contract (select services)" : "Create appendix (select services)",
                icon: "contract",
                onClick: () => openContractWithServiceSelect(record),
                primary: true,
                color: "#d46b08",
              }),

              isDeleted
                ? React.createElement(Popconfirm, {
                  title: "Restore this service?",
                  description: "The service will become active again and its tasks will be unlocked.",
                  onConfirm: () => handleRestore(record),
                  okText: "Restore",
                  cancelText: "Cancel",
                  okButtonProps: { style: { background: "#16a34a", borderColor: "#16a34a" } },
                }, React.createElement(ActionIconButton, {
                  title: "Restore service",
                  icon: "restore",
                  color: "#16a34a",
                  tooltip: false,
                }))
                : React.createElement(Popconfirm, {
                  title: "Delete this service?",
                  description: "The service will be marked as Deleted. Its tasks will switch to read-only mode and can no longer be worked on.",
                  onConfirm: () => handleDelete(record),
                  okText: "Delete",
                  cancelText: "Cancel",
                  okButtonProps: { danger: true },
                }, React.createElement(ActionIconButton, {
                  title: "Delete service",
                  icon: "delete",
                  danger: true,
                  tooltip: false,
                }))
            )
          }
        }
      ];

      // Groups `services` rows sharing a comboId into contiguous sections (a
      // combo's rows can land anywhere in createdAt order once services are
      // added to it after creation), inserting a synthetic combo-header
      // pseudo-row before each group. Rows without a comboId pass through
      // untouched and keep their original relative position.
      // Real catalog combos group by comboId (a numeric FK). Ad-hoc combos
      // never get a real comboId (matches *CreateForm.js's own behavior â€”
      // its _comboCatalogId stays null for ad-hoc combos too), so they fall
      // back to grouping by comboName. Two independently-applied ad-hoc
      // combos that happen to share the exact same name will visually merge
      // into one section â€” an accepted, documented limitation (see spec).
      const getComboGroupKey = (row) => {
        const comboIdVal = extractId(row.comboId) || extractId(row.serviceCombo);
        if (comboIdVal) return `id:${comboIdVal}`;
        const name = String(row.comboName || "").trim();
        return name ? `name:${name}` : null;
      };

      const comboGroups = new Map();
      for (const row of services) {
        const key = getComboGroupKey(row);
        if (!key) continue;
        if (!comboGroups.has(key)) comboGroups.set(key, []);
        comboGroups.get(key).push(row);
      }
      const emittedCombos = new Set();
      const displayRows = [];
      let displaySeq = 0;
      for (const row of services) {
        const key = getComboGroupKey(row);
        if (!key) {
          displaySeq += 1;
          displayRows.push({ ...row, _displayIndex: displaySeq });
          continue;
        }
        if (emittedCombos.has(key)) continue;
        emittedCombos.add(key);
        const groupRows = comboGroups.get(key);
        const activeCount = groupRows.filter((r) => !isDeletedServiceLine(r)).length;
        displayRows.push({
          id: `combo-header-${key}`,
          _isComboHeader: true,
          _groupKey: key,
          comboId: extractId(row.comboId) || extractId(row.serviceCombo) || null,
          comboName: row.comboName || "Combo",
          _comboCount: activeCount,
        });
        for (const r of groupRows) {
          displaySeq += 1;
          displayRows.push({ ...r, _displayIndex: displaySeq });
        }
      }

      const renderComboHeaderBar = (record) => React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 20,
          flexWrap: "wrap",
          padding: "6px 4px",
        },
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
          React.createElement(Tag, { color: "blue", style: { fontWeight: 700, letterSpacing: 0.3 } }, "COMBO"),
          React.createElement(Text, { strong: true }, record.comboName || "Combo"),
          React.createElement(Text, { type: "secondary", style: { fontSize: 12.5 } },
            `${record._comboCount} service${record._comboCount === 1 ? "" : "s"}`)
        ),
        React.createElement(Space, { size: 8 },
          React.createElement(Button, {
            size: "small",
            onClick: () => openAddModal({ comboId: record.comboId, comboName: record.comboName }),
            style: DS.secondaryButton,
          }, "+ Add service"),
          React.createElement(Popconfirm, {
            title: "Remove this combo?",
            description: "All services in this combo section will be deleted and their tasks locked.",
            okText: "Remove",
            okType: "danger",
            cancelText: "Cancel",
            onConfirm: () => handleRemoveCombo(record._groupKey),
          },
            React.createElement(Button, { size: "small", danger: true }, "Remove combo")
          )
        )
      );

      // Every package-priced row (combo-tagged or a lone standalone package
      // service) shares the SAME case-wide package total, so these 4 pricing
      // columns are merged into a single blank cell for it â€” not just
      // emptied one-by-one, or the row still shows 4 separate bordered cells
      // with nothing in them.
      const PRICE_COLUMN_KEYS = ["basePrice", "vat", "vatAmount", "totalAmount"];
      // When nothing in the case is actually line-priced (pure package/scope
      // case â€” the common case once combos are used), these 4 columns would
      // be blank for every single row, so drop them entirely to compact the
      // table instead of leaving 4 empty columns. A case that still mixes in
      // a real line-priced service keeps the columns so that row stays
      // editable.
      const hasLinePricedRows = services.some(isMoneyEditableServiceRow);
      const visibleColumns = (servicePricingSummary.isPackageMode && !hasLinePricedRows)
        ? columns.filter((col) => !PRICE_COLUMN_KEYS.includes(col.key))
        : columns;

      const columnsWithComboHeader = visibleColumns.map((col, idx) => ({
        ...col,
        onCell: (record) => {
          if (record._isComboHeader) {
            return idx === 0 ? { colSpan: visibleColumns.length } : { colSpan: 0 };
          }
          if (isPackageServiceRow(record) && PRICE_COLUMN_KEYS.includes(col.key)) {
            return col.key === PRICE_COLUMN_KEYS[0] ? { colSpan: PRICE_COLUMN_KEYS.length } : { colSpan: 0 };
          }
          return col.onCell ? col.onCell(record) : {};
        },
        render: (text, record, index) => {
          if (record._isComboHeader) {
            return idx === 0 ? renderComboHeaderBar(record) : null;
          }
          return col.render ? col.render(text, record, index) : text;
        },
      }));

      const renderCompareCell = (value, type, currency = null) => React.createElement("div", {
        style: {
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: type === "text" ? 120 : "none",
          overflow: "auto",
          color: C.text,
        }
      }, formatCompareValue(value, type, currency));

      const renderCompareStatus = (row) => {
        if (row.catalogMissing) return React.createElement(Tag, { color: "default" }, "No catalog");
        return row.changed
          ? React.createElement(Tag, { color: "red" }, "Changed")
          : React.createElement(Tag, { color: "green" }, "Same");
      };

      const renderCompareDetail = (record) => {
        const catalog = getCatalogService(record);
        const recordCurrency = getRowCurrency(record);
        // Catalog services can carry their own currencyId, independent of
        // whatever currency this case line currently uses â€” don't reuse
        // recordCurrency for the catalog column or the price label lies.
        const catalogCurrency = currencyFromRecord(catalog, currencies, recordCurrency);
        // The linked quotation line's own currency (captured at enrichment time
        // as _quotedCurrencyId) can also differ from the row's current
        // currencyId â€” use it for the "quoted" column so _quotedBasePrice etc.
        // are never displayed under the wrong currency's code.
        const quotedCurrency = resolveCurrency(record._quotedCurrencyId, currencies) || recordCurrency;
        const showCurrencyHint = !!catalog && !isSameCurrency(catalogCurrency, quotedCurrency);
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
              borderRadius: DS.radius.sm,
              background: "#fffbeb",
              color: C.warning,
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
                title: showCurrencyHint ? `Original Service Â· ${getCurrencyCode(catalogCurrency)}` : "Original Service",
                dataIndex: "original",
                render: (value, row) => renderCompareCell(value, row.type, catalogCurrency),
              },
              {
                title: showCurrencyHint ? `Quotation Snapshot Â· ${getCurrencyCode(quotedCurrency)}` : "Quotation Snapshot",
                dataIndex: "quoted",
                render: (value, row) => renderCompareCell(value, row.type, quotedCurrency),
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
              borderRadius: DS.radius.sm,
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
        const statusRows = ["pending_quote", "quote_draft", "quote_pending_approval", "quote_sent", "ordered", "contracted", "contract_pending_signature", "active", "quote_and_contract", "completed", "cancelled", "deleted"].map((key) => ({
          key,
          value: key,
          ...COMMERCIAL_STATUS[key],
        }));
        const actionRows = [
          {
            key: "pending_quote",
            status: COMMERCIAL_STATUS.pending_quote.label,
            when: "A new service was added to the case; it doesn't need a quotation or contract right away.",
            action: "Continue internal work. When you need to send a fee to the customer, click Create quotation.",
          },
          {
            key: "ordered",
            status: COMMERCIAL_STATUS.ordered.label,
            when: "The customer has accepted the quotation but there's no contract yet.",
            action: "Check the quotation. If the customer agrees, create a contract or appendix.",
          },
          {
            key: "contracted",
            status: COMMERCIAL_STATUS.contracted.label,
            when: "The service already has a contract or appendix but it hasn't been marked active yet.",
            action: "Track the signing process. Once the contract is signed or execution starts, mark it Signed.",
          },
          {
            key: "active",
            status: COMMERCIAL_STATUS.active.label,
            when: "The contract has been signed or is being executed.",
            action: "Keep tracking the work and documents as usual.",
          },
          {
            key: "quote_and_contract",
            status: COMMERCIAL_STATUS.quote_and_contract.label,
            when: "The service already has both a related quotation and a contract.",
            action: "Data is synced automatically between the Case, Quotation, and Contract.",
          },
          {
            key: "completed",
            status: COMMERCIAL_STATUS.completed.label,
            when: "The service has been completed.",
            action: "Check the final file and close out any remaining work.",
          },
          {
            key: "cancelled",
            status: COMMERCIAL_STATUS.cancelled.label,
            when: "The service or its related quotation has been cancelled.",
            action: "Do not continue working on this service unless a manager reopens it or a new service is created.",
          },
        ];
        const flowRows = [
          {
            key: "add",
            step: "1. Add service",
            detail: "The user adds a service to the case so the operations team can start tracking the work right away.",
          },
          {
            key: "tasks",
            step: "2. Prepare work items",
            detail: "The service's tasks are prepared right away, even before the case has a quotation or contract.",
          },
          {
            key: "quote",
            step: "3. Add a quotation",
            detail: "Once a fee needs to be sent to the customer, the user clicks Create quotation on that service's row.",
          },
          {
            key: "contract",
            step: "4. Add a contract",
            detail: "After the quotation is accepted, the user creates a contract or appendix for that service.",
          },
          {
            key: "active",
            step: "5. Contract active",
            detail: "Once the contract is signed or execution starts, the status moves to Contract active so everyone can track it easily.",
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
          }, "This area helps you track the case's services from the moment they arise through to having a quotation, a contract, and being completed. Services can be added first so the team can start working right away; a quotation and contract can be added later once the details are clearer."),

          React.createElement("div", { style: { marginBottom: 18 } },
            React.createElement("div", { style: { fontWeight: 700, marginBottom: 8 } }, "What you need to know about service status"),
            React.createElement(Table, {
              dataSource: statusRows,
              rowKey: "key",
              pagination: false,
              size: "small",
              bordered: true,
              columns: [
                {
                  title: "Status",
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
                  title: "What it means for you",
                  dataIndex: "description",
                  render: (text) => React.createElement("span", { style: { lineHeight: 1.5 } }, text),
                },
              ],
            })
          ),

          React.createElement("div", { style: { marginBottom: 18 } },
            React.createElement("div", { style: { fontWeight: 700, marginBottom: 8 } }, "When you need to take action"),
            React.createElement(Table, {
              dataSource: actionRows,
              rowKey: "key",
              pagination: false,
              size: "small",
              bordered: true,
              columns: [
                {
                  title: "Status",
                  dataIndex: "status",
                  width: 160,
                },
                {
                  title: "When it appears",
                  dataIndex: "when",
                  width: 300,
                },
                {
                  title: "What you should do",
                  dataIndex: "action",
                },
              ],
            })
          ),

          React.createElement("div", null,
            React.createElement("div", { style: { fontWeight: 700, marginBottom: 8 } }, "Business flow"),
            React.createElement(Table, {
              dataSource: flowRows,
              rowKey: "key",
              pagination: false,
              size: "small",
              bordered: true,
              columns: [
                { title: "Step", dataIndex: "step", width: 190 },
                { title: "Description", dataIndex: "detail" },
              ],
            })
          )
        );
      };

      // Stacked label/value rows with a dashed divider between them and a
      // bold Total row at the bottom â€” same visual language as the
      // CreateForm totals blocks. Package subtotal/VAT rate stay editable
      // inline; VAT amount/Package total are derived, read-only text.
      const servicesSummaryPanel = () => {
        if (services.length === 0) return null;
        const rowStyle = (withBorder = true) => ({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          padding: "10px 0",
          borderBottom: withBorder ? `1px dashed ${C.border}` : "none",
        });
        const labelStyle = { fontSize: 13.5, color: C.textSub };
        const totalLabelStyle = { fontSize: 15, fontWeight: 700, color: C.text };
        const valueStyle = (color = C.text) => ({ fontSize: 14, fontWeight: 600, color, fontFamily: token.fontFamilyCode });
        const totalValueStyle = (color) => ({ fontSize: 18, fontWeight: 700, color, fontFamily: token.fontFamilyCode });
        const moneyInputProps = {
          min: 0,
          style: { width: 170, textAlign: "right", fontWeight: 600 },
          addonAfter: getCurrencyCode(vndCurrency),
          formatter: (v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, "."),
          parser: (v) => String(v || "").replace(/\./g, "").replace(/\s/g, ""),
        };

        return React.createElement("div", {
          style: {
            ...DS.card,
            marginTop: 16,
            padding: "0 20px",
            maxWidth: 480,
            marginLeft: "auto",
          },
        },
          servicePricingSummary.isPackageMode
            ? [
              React.createElement("div", { key: "subtotal", style: rowStyle(true) },
                React.createElement(Text, { style: labelStyle }, "Package subtotal (excl. VAT):"),
                React.createElement(InputNumber, { ...moneyInputProps, value: packageTotalsView.subTotal, onChange: (v) => updatePackageDraftField("packageSubTotal", v) })
              ),
              React.createElement("div", { key: "vatrate", style: rowStyle(true) },
                React.createElement(Text, { style: labelStyle }, "VAT rate:"),
                React.createElement(InputNumber, {
                  value: packageTotalsView.vatRate, min: 0, max: 100, step: 0.1,
                  onChange: (v) => updatePackageDraftField("packageVatRate", v),
                  style: { width: 90, textAlign: "right", fontWeight: 600 },
                  formatter: (v) => `${v}%`, parser: (v) => String(v || "").replace("%", ""),
                })
              ),
              React.createElement("div", { key: "vatamount", style: rowStyle(true) },
                React.createElement(Text, { style: labelStyle }, "Package VAT amount:"),
                React.createElement(Text, { style: valueStyle(token.colorWarning || C.warningText) }, formatMoney(packageTotalsView.vatAmount, vndCurrency))
              ),
              React.createElement("div", { key: "total", style: rowStyle(false) },
                React.createElement(Text, { style: totalLabelStyle }, "Package total:"),
                React.createElement(Text, { style: totalValueStyle(token.colorSuccess || C.successText) }, formatMoney(packageTotalsView.totalAmount, vndCurrency))
              ),
              // Always mounted (space reserved via `visibility`, never
              // `display: none`) so it appearing/disappearing never changes
              // the panel's height â€” otherwise the page reflows on the
              // first keystroke and the inputs above visibly jump.
              React.createElement("div", {
                key: "actions",
                style: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, padding: "10px 0", visibility: packageDraft ? "visible" : "hidden" },
              },
                React.createElement(Text, { type: "warning", style: { fontSize: 12 } }, "Unsaved changes"),
                React.createElement(Button, { size: "small", disabled: !packageDraft, onClick: handleCancelPackageDraft }, "Cancel"),
                React.createElement(Button, { size: "small", type: "primary", disabled: !packageDraft, loading: loading, onClick: handleSavePackageSummary }, "Save")
              ),
            ]
            : [
              React.createElement("div", { key: "subtotal", style: rowStyle(true) },
                React.createElement(Text, { style: labelStyle }, "Subtotal (excl. VAT):"),
                React.createElement(Text, { style: valueStyle() }, formatMoney(servicePricingSummary.lineTotals.subTotal, vndCurrency))
              ),
              React.createElement("div", { key: "vat", style: rowStyle(true) },
                React.createElement(Text, { style: labelStyle }, "Total VAT:"),
                React.createElement(Text, { style: valueStyle(token.colorWarning || C.warningText) }, formatMoney(servicePricingSummary.lineTotals.vatAmount, vndCurrency))
              ),
              React.createElement("div", { key: "total", style: rowStyle(false) },
                React.createElement(Text, { style: totalLabelStyle }, "Total:"),
                React.createElement(Text, { style: totalValueStyle(token.colorSuccess || C.successText) }, formatMoney(servicePricingSummary.lineTotals.totalAmount, vndCurrency))
              ),
            ]
        );
      };

      return React.createElement(Card, {
        size: "small",
        title: React.createElement(Space, { size: 8, wrap: true },
          React.createElement(Text, { strong: true }, "Services"),
          services.length > 0 && React.createElement(Text, { type: "secondary" }, `${services.length} services`)
        ),
        extra: React.createElement(Space, { size: 8, wrap: true },
          React.createElement(Button, {
            size: "small",
            onClick: () => loadData(),
            loading: loading,
          }, "Refresh"),
          React.createElement(Button, {
            size: "small",
            onClick: () => setCompareModal({ open: true, data: null }),
            disabled: services.length === 0,
          }, "Review Changes"),
          React.createElement(Button, {
            size: "small",
            onClick: () => setGuideModal(true),
          }, "Guide"),
          React.createElement(Button, {
            size: "small",
            type: "primary",
            onClick: () => openAddModal(),
          }, "Add Service")
        ),
        bodyStyle: { padding: 0 },
        style: { width: "100%" },
      },
        React.createElement("div", { style: { display: "none" } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 } },
            React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap" } }, "Service List"),
            services.length > 0 && React.createElement("span", { style: { fontSize: 12, color: C.textSub, whiteSpace: "nowrap" } }, `${services.length} services`)
          ),
          React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" } },
            React.createElement(Button, {
              size: "small",
              onClick: () => loadData(),
              loading: loading,
              style: DS.secondaryButton
            }, "Refresh"),
            React.createElement(Button, {
              size: "small",
              onClick: () => setCompareModal({ open: true, data: null }),
              disabled: services.length === 0,
              style: DS.secondaryButton
            }, "Review Changes"),
            React.createElement(Button, {
              size: "small",
              onClick: () => setGuideModal(true),
              style: DS.secondaryButton
            }, "Guide"),
            React.createElement(Button, {
              size: "small",
              type: "primary",
              onClick: () => openAddModal(),
              style: DS.primaryButton
            }, "+ Add Service")
          )
        ),

        React.createElement("div", { style: { width: "100%", overflowX: "auto" } },
          React.createElement(Table, {
            dataSource: displayRows,
            columns: columnsWithComboHeader,
            rowKey: "id",
            pagination: false,
            loading: loading,
            size: "middle",
            bordered: false,
            scroll: { x: "max-content" },
            style: {
              width: "100%"
            }
          })
        ),

        // TOTALS PANEL â€” stacked label/value rows with a dashed divider and a
        // bold Total row, matching the CreateForm totals block design. Lives
        // outside the Table (not a Table.Summary row) so it isn't constrained
        // by <td> layout at all.
        servicesSummaryPanel(),

        // SERVICE SELECT MODAL â€” select services before creating a contract/appendix or quotation
        React.createElement(Modal, {
          title: React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
            React.createElement("span", { style: { fontSize: 16, fontWeight: 700, color: C.primary } },
              serviceSelectModal.mode === "quotation"
                ? (caseInfo?.quotationId ? "ðŸ—‚ Select services for the supplemental quotation" : "ðŸ—‚ Select services for the original quotation")
                : (serviceSelectModal.triggerRecord?._isMainQuote ? "ðŸ—‚ Select services for the contract" : "ðŸ—‚ Select services for the appendix")
            ),
            React.createElement(Tag, { color: "blue", style: { marginLeft: 4 } }, `${serviceSelectModal.selectedIds.length} selected`)
          ),
          open: serviceSelectModal.open,
          onCancel: () => setServiceSelectModal(prev => ({ ...prev, open: false })),
          footer: React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } },
            (() => {
              if (!serviceSelectModal.selectedIds.length) {
                return React.createElement("div", { style: { fontSize: 13, color: C.textSub } }, "No service selected yet");
              }
              return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 } },
                React.createElement("span", { style: { fontSize: 12, color: C.textSub } }, `${serviceSelectModal.selectedIds.length} services selected`),
                React.createElement(Text, {
                  strong: true,
                  style: { fontFamily: FONT_MONO, fontSize: 13, color: C.text, whiteSpace: "nowrap" },
                }, formatMoney(selectionAmountsPreview.totalAmount, selectionAmountsPreview.currency || vndCurrency)),
              );
            })(),
            React.createElement("div", { style: { display: "flex", gap: 8 } },
              React.createElement(Button, {
                onClick: () => setServiceSelectModal(prev => ({ ...prev, open: false })),
                style: DS.secondaryButton
              }, "Cancel"),
              React.createElement(Button, {
                type: "primary",
                loading: serviceSelectSubmitting,
                disabled: serviceSelectModal.selectedIds.length === 0,
                onClick: serviceSelectModal.mode === "quotation" ? handleQuotationServiceSelectConfirm : handleContractServiceSelectConfirm,
                style: DS.primaryButton
              }, "Continue â†’")
            )
          ),
          width: 860,
          bodyStyle: { paddingTop: 8, maxHeight: 540, overflowY: "auto" }
        }, serviceSelectModal.open && React.createElement("div", null,
          React.createElement("div", {
            style: {
              ...DS.infoBox,
              marginBottom: 12,
            }
          },
            serviceSelectModal.mode === "quotation"
              ? "Select one or more services to include in this quotation. The system will automatically total the amounts and create the links after saving."
              : "Select one or more services to include in this contract/appendix. The system will automatically total the amounts and create the contractServices links after saving."
          ),
          React.createElement(Table, {
            dataSource: services,
            rowKey: "id",
            pagination: false,
            size: "small",
            bordered: true,
            scroll: { y: 380 },
            rowSelection: {
              type: "checkbox",
              selectedRowKeys: serviceSelectModal.selectedIds,
              onChange: (selectedRowKeys) => {
                setServiceSelectModal(prev => ({ ...prev, selectedIds: selectedRowKeys }));
              },
              getCheckboxProps: (record) => {
                if (serviceSelectModal.mode === "quotation") {
                  return {
                    disabled: !!record._quotationId,
                    title: record._quotationId ? "This service is already in another quotation" : "",
                  };
                } else {
                  return {
                    disabled: !!record._contractServiceId && record._contractId !== null,
                    title: record._contractServiceId ? "This service is already in another contract" : "",
                  };
                }
              },
            },
            columns: [
              {
                title: "#",
                key: "no",
                width: 44,
                align: "center",
                render: (_, __, idx) => idx + 1,
              },
              {
                title: "Type",
                dataIndex: "serviceType",
                key: "serviceType",
                width: 120,
                render: (text) => React.createElement("span", { style: { color: C.textSub, fontSize: 12 } }, text || "â€”"),
              },
              {
                title: "Service name",
                dataIndex: "serviceName",
                key: "serviceName",
                render: (text, record) => {
                  const val = text || record.services?.serviceName || record.name || "â€”";
                  const hasCS = serviceSelectModal.mode === "quotation" ? !!record._quotationId : !!record._contractServiceId;
                  const warningText = serviceSelectModal.mode === "quotation" ? "âš  Already in a quotation" : "âš  Already in a contract";
                  return React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: 600, color: hasCS ? C.textSub : C.text } }, val),
                    hasCS && React.createElement("div", { style: { fontSize: 11, color: "#d97706", marginTop: 2 } },
                      warningText
                    )
                  );
                },
              },
              {
                title: "Unit price",
                key: "basePrice",
                width: 130,
                align: "right",
                render: (_, record) => {
                  if (isPackageServiceRow(record)) return React.createElement("span", { style: { color: C.textSub, fontSize: 12 } }, "Package");
                  if (isScopeOnlyServiceRow(record)) return React.createElement("span", { style: { color: C.textSub, fontSize: 12 } }, "Scope only");
                  return React.createElement("span", { style: { fontWeight: 500 } }, formatMoney(record._quotedBasePrice ?? record.basePrice ?? 0, getRowCurrency(record)));
                },
              },
              {
                title: "VAT",
                key: "vat",
                width: 70,
                align: "center",
                render: (_, record) => React.createElement("span", null, isMoneyEditableServiceRow(record) ? `${record._quotedVat ?? record.vat ?? 0}%` : "â€”"),
              },
              {
                title: "Total",
                key: "totalAmount",
                width: 140,
                align: "right",
                render: (_, record) => {
                  const total = getRowTotalAmount(record, vndCurrency);
                  return React.createElement("span", {
                    style: { fontWeight: 700, color: total > 0 ? "#096dd9" : C.textSub }
                  }, total > 0 ? formatMoney(total, vndCurrency) : "â€”");
                },
              },
              {
                title: "Status",
                key: "status",
                width: 130,
                align: "center",
                render: (_, record) => {
                  const cfg = COMMERCIAL_STATUS[record.status || "pending_quote"] || {};
                  return React.createElement("span", {
                    style: {
                      display: "inline-block",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: DS.radius.pill,
                      border: `1px solid ${cfg.border || C.border}`,
                      background: cfg.bg || C.bgSection,
                      color: cfg.color || C.textSub,
                      whiteSpace: "nowrap",
                    }
                  }, cfg.label || record.status || "â€”");
                },
              },
            ],
          })
        )),

        // GUIDE MODAL
        React.createElement(Modal, {
          title: "Guide",
          open: guideModal,
          onCancel: () => setGuideModal(false),
          footer: React.createElement(Button, {
            type: "primary",
            onClick: () => setGuideModal(false),
            style: DS.primaryButton
          }, "Got it"),
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
              style: DS.primaryButton
            }, "Close")
          ),
          width: compareModal.data ? 900 : 1000,
          bodyStyle: { paddingTop: 16 }
        }, compareModal.open && (
          compareModal.data ? renderCompareDetail(compareModal.data) : renderCompareList()
        )),

        // ADD MODAL
        React.createElement(Modal, {
          title: comboAddTarget
            ? `Add service to combo: ${comboAddTarget.comboName || "Combo"}`
            : "Add service to case",
          open: addModal,
          onCancel: closeAddModal,
          onOk: () => form.submit(),
          confirmLoading: submitting,
          okText: "Save service",
          cancelText: "Cancel",
          width: 650,
          okButtonProps: { style: DS.primaryButton },
          cancelButtonProps: { style: DS.secondaryButton }
        },
          React.createElement("div", { style: { ...DS.infoBox, marginBottom: 16 } },
            React.createElement("div", { style: { fontWeight: 600, marginBottom: 4 } }, "ðŸ“Œ Two ways to add a service:"),
            React.createElement("ul", { style: { margin: 0, paddingLeft: 18 } },
              React.createElement("li", null, React.createElement("b", null, "From the standard catalog: "), "Pick a service below â€” the system will auto-fill its info and create sample tasks from the template."),
              React.createElement("li", null, React.createElement("b", null, "Manual (not yet standardized): "), "Skip the catalog step and type the service name directly. Its tasks will be created manually by whoever is assigned.")
            )
          ),
          React.createElement(Form, {
            form: form,
            layout: "vertical",
            onFinish: handleAddSubmit
          },
            React.createElement(Form.Item, {
              name: "serviceId",
              label: "Choose from the service catalog (optional â€” skip if creating manually)"
            },
              React.createElement(Select, {
                placeholder: "Choose a service from the catalog...",
                allowClear: true,
                onChange: handleServiceChange,
                showSearch: true,
                optionFilterProp: "children",
                style: { borderRadius: DS.radius.sm }
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
                }, (s.serviceName || s.name || `Service #${s.id}`) + (isDuplicate ? " (Already in this case)" : ""));
              }))
            ),

            React.createElement("div", { style: { display: "flex", gap: 16 } },
              React.createElement(Form.Item, {
                name: "serviceType",
                label: "Service type",
                style: { flex: 1 }
              }, React.createElement(Input, { placeholder: "E.g. Legal consultation", style: { borderRadius: DS.radius.sm } })),

              React.createElement(Form.Item, {
                name: "currencyId",
                label: "Currency",
                style: { width: 130 },
                rules: currencies.length ? [{ required: true, message: "Select a currency" }] : [],
              }, React.createElement(Select, {
                placeholder: currencies.length ? "Select currency" : "Not configured",
                disabled: !currencies.length,
                style: { borderRadius: DS.radius.sm },
              }, currencyOptions.map((opt) =>
                React.createElement(Select.Option, { key: opt.value, value: opt.value }, opt.label)
              ))),

              React.createElement(Form.Item, {
                name: "vat",
                label: "VAT (%)",
                style: { width: 90 },
              }, React.createElement(InputNumber, {
                style: { width: "100%", borderRadius: DS.radius.sm },
                min: 0,
                max: 100,
                placeholder: "0"
              }))
            ),

            React.createElement(Form.Item, {
              noStyle: true,
              shouldUpdate: (prev, cur) => prev.currencyId !== cur.currencyId,
            }, () => {
              const priceCurrency = resolveCurrency(form.getFieldValue("currencyId"), currencies) || caseCurrency;
              return React.createElement(Form.Item, {
                name: "basePrice",
                label: `Service fee (${getCurrencyCode(priceCurrency)})`,
                rules: []
              }, React.createElement(AddServiceMoneyInput, { currency: priceCurrency }));
            }),

            React.createElement(Form.Item, {
              name: "serviceName",
              label: "Service name *",
              rules: [{ required: true, message: "Please enter a service name" }]
            }, React.createElement(Input, { placeholder: "Enter the service name (can differ from the catalog)", style: { borderRadius: DS.radius.sm } })),

            React.createElement(Form.Item, {
              name: "description",
              label: "Detailed description"
            }, React.createElement(Input.TextArea, { rows: 4, placeholder: "Enter the service description...", style: { borderRadius: DS.radius.sm } }))
          )
        )
      );
    };

    ctx.render(React.createElement(CaseServices));
