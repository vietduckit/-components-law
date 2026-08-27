const { React } = ctx;
const { useState, useEffect, useCallback, useMemo } = React;
const { Spin, Typography, message, Modal, Table, Tag, Button, Tooltip, Card, Space, Segmented, theme, Popconfirm, Empty } = ctx.antd;
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
  softSection: {
    padding: `${token.paddingSM}px ${token.padding}px`,
    borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorSplit || token.colorBorderSecondary}`,
    background: token.colorFillAlter,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  readonlyValue: {
    display: "block",
    minHeight: token.controlHeight,
    padding: `${token.paddingXXS}px ${token.paddingSM}px`,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorder}`,
    borderRadius: token.borderRadiusSM,
    background: token.colorFillQuaternary,
    textAlign: "right",
    boxSizing: "border-box",
    lineHeight: `${token.controlHeight - token.paddingXXS * 2 - 2}px`,
  },
});

const CONTRACT_ID = ctx.record?.id;
const CONTRACT_STATUS = ctx.record?.status; // e.g. 'draft', 'sent', 'signed', 'active', 'completed'
const PRICING_MODE_LINE = 'line';
const PRICING_MODE_PACKAGE = 'package';
const BILLING_LINE = 'lineBillable';
const BILLING_PACKAGE_INCLUDED = 'packageIncluded';
const SOURCE_CONTRACT = 'contract';

const parseNum = v => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
const extractId = val => {
  const id = val && typeof val === 'object' ? val.id : val;
  return id ? parseInt(id) : null;
};
const fmtPrice = n => { const num = parseNum(n); return num === 0 ? '' : num.toLocaleString('vi-VN'); };

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
const neutralCurrencyObject = () => ({ code: "", decimalPlaces: 2, locale: "en-US" });
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
const findDefaultCurrency = (currencies = []) =>
  currencies.find((currency) => currency?.isBaseCurrency || getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE) ||
  currencies[0] || defaultCurrencyObject();
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
const formatMissingRatePairs = (groups = [], targetCurrency = null) => {
  const targetCode = getCurrencyCode(targetCurrency || defaultCurrencyObject());
  return (groups || []).map((group) => `${getCurrencyCode(group.currency)} -> ${targetCode}`).join(", ");
};
const formatMoneyAmount = (value, currency = null) => {
  if (!value && value !== 0) return "—";
  const info = currency || defaultCurrencyObject();
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const decimals = getCurrencyDecimals(info);
  return n.toLocaleString(getCurrencyLocale(info), { minimumFractionDigits: 0, maximumFractionDigits: decimals });
};
const formatMoney = (value, currency = null) => {
  if (!value && value !== 0) return "—";
  const info = currency || defaultCurrencyObject();
  return `${formatMoneyAmount(value, info)} ${getCurrencyCode(info)}`;
};
// Exchange rates can be much smaller than any money amount (e.g. an inverse
// rate under 0.001) — formatting them via formatMoneyAmount's 2-decimal
// money precision would round them to "0.00"; use enough precision to stay
// meaningful instead, trimming trailing zeros.
const formatExchangeRate = (rate) => {
  const n = Number(rate);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 });
};
const formatMoneyDraft = (value, currency = null) => {
  if (value === undefined || value === null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const info = currency || neutralCurrencyObject();
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: getCurrencyDecimals(info) });
};
const parseMoneyDraft = (value, currency = null) => {
  const decimals = getCurrencyDecimals(currency || neutralCurrencyObject());
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  if (decimals <= 0) {
    const whole = raw.replace(/[^\d-]/g, "");
    const n = Number(whole);
    return Number.isFinite(n) ? n : 0;
  }
  const normalized = raw.replace(/,/g, "").replace(/[^\d.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};
const parseDateMillis = (value) => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};
// exchangeRates real schema (confirmed via Nocobase "Configure fields"):
// fromCurrencyId, toCurrencyId (bigint scalars), rate (double), effectiveDate,
// status. Both directions can have their own row (e.g. USD->VND and VND->USD),
// so match by the (fromCurrencyId, toCurrencyId) pair rather than a single side.
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
        rate: parseNum(rate?.rate),
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
const isSameCurrency = (left, right) => {
  const leftId = extractCurrencyId(left);
  const rightId = extractCurrencyId(right);
  if (leftId && rightId) return leftId === rightId;
  const leftCode = extractCurrencyCode(left) || getCurrencyCode(left || {});
  const rightCode = extractCurrencyCode(right) || getCurrencyCode(right || {});
  return !!leftCode && !!rightCode && leftCode === rightCode;
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
const calcLine = (basePrice, quantity, vat, currency = null) => {
  const subTotal = parseNum(basePrice) * parseNum(quantity);
  const vatAmount = roundMoneyForCurrency(subTotal * parseNum(vat) / 100, currency);
  const totalAmount = subTotal + vatAmount;
  return { subTotal, vatAmount, totalAmount };
};
const calcPackageTotals = (subTotal, vatRate, currency = null) => {
  const sub = parseNum(subTotal);
  const vatAmount = roundMoneyForCurrency(sub * parseNum(vatRate) / 100, currency);
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
const isDeletedServiceLine = (record = {}) =>
  String(record?.status || record?.lineStatus || "").toLowerCase().trim() === "deleted";

const getContractLineAmounts = (line = {}) => {
  const isPackageLine =
    isPackagePricing(line) ||
    parseNum(line.packageSubTotal) ||
    parseNum(line.packageTotalAmount);

  if (isPackageLine) {
    const subTotal = parseNum(line.packageSubTotal ?? line.subTotal);
    const totalAmount = parseNum(line.packageTotalAmount ?? line.totalAmount);
    const vatAmount =
      parseNum(line.packageVatAmount ?? line.vatAmount) ||
      (totalAmount && subTotal ? Math.max(totalAmount - subTotal, 0) : 0);
    return {
      subTotal,
      vatAmount,
      totalAmount: totalAmount || subTotal + vatAmount,
      packageVatRate: parseNum(line.packageVatRate ?? line.vat),
      isPackageLine,
    };
  }

  const quantity = parseNum(line.quantity) || 1;
  const subTotal = parseNum(line.subTotal ?? (parseNum(line.basePrice) * quantity));
  const vatAmount = parseNum(line.vatAmount ?? Math.round((subTotal * parseNum(line.vat)) / 100));
  return {
    subTotal,
    vatAmount,
    totalAmount: parseNum(line.totalAmount ?? (subTotal + vatAmount)),
    packageVatRate: 0,
    isPackageLine,
  };
};

const syncContractHeaderFromServices = async (contractId) => {
  const safeContractId = extractId(contractId);
  if (!safeContractId) return;

  try {
    const [contractRes, linesRes] = await Promise.all([
      ctx.api.request({
        url: "contracts:get",
        params: { filterByTk: safeContractId, appends: ['cases'] },
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
      subTotal = parseNum(contract.monthlyFee) * parseNum(contract.retainerDuration);
      packageVatRate = parseNum(contract.packageVatRate ?? contract.vatRate);
      vatAmount = Math.round((subTotal * packageVatRate) / 100);
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
        const totals = lines.reduce((sum, line) => {
          const amount = getContractLineAmounts(line);
          return {
            subTotal: sum.subTotal + amount.subTotal,
            vatAmount: sum.vatAmount + amount.vatAmount,
            totalAmount: sum.totalAmount + amount.totalAmount,
          };
        }, { subTotal: 0, vatAmount: 0, totalAmount: 0 });
        subTotal = totals.subTotal;
        vatAmount = totals.vatAmount;
        totalAmount = totals.totalAmount;
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

    const projectId =
      extractId(contract.projectId) ||
      extractId(contract.caseId) ||
      (contract.cases && (typeof contract.cases[0] === 'object' ? contract.cases[0].id : contract.cases[0]));
      
    if (projectId) {
      try {
        await ctx.api.request({
          url: "projects:update",
          method: "POST",
          params: { filterByTk: parseInt(projectId) },
          data: { totalAmount },
        });
      } catch (projectErr) {
        console.warn("[syncContractHeaderFromServices] Could not sync project totalAmount", projectErr);
      }
    }
  } catch (e) {
    console.error("[syncContractHeaderFromServices] failed", e);
  }
};

const syncQuotationHeaderFromServices = async (quotationId) => {
  const safeQuotationId = extractId(quotationId);
  if (!safeQuotationId) return;

  try {
    const [qRes, linesRes] = await Promise.all([
      ctx.api.request({
        url: 'quotations:get',
        params: { filterByTk: safeQuotationId },
      }),
      ctx.api.request({
        url: 'quotationServices:list',
        params: {
          filter: JSON.stringify({ quotationId: { $eq: safeQuotationId } }),
          pageSize: 1000,
        },
      }),
    ]);

    const quotation = qRes?.data?.data || qRes?.data || {};
    const lines = (linesRes?.data?.data || []).filter((line) => !isDeletedServiceLine(line));
    const isPackage = lines.length > 0 && (isPackagePricing(quotation) || lines.some(line => isPackagePricing(line) || parseNum(line.packageSubTotal)));

    let subTotal = 0;
    let vatAmount = 0;
    let totalAmount = 0;
    let canWriteTotals = true;

    if (isPackage) {
      const packageLine = lines.find(line => isPackagePricing(line) || parseNum(line.packageSubTotal)) || quotation;
      subTotal = parseNum(packageLine.packageSubTotal ?? quotation.packageSubTotal);
      const vatRate = parseNum(packageLine.packageVatRate ?? quotation.packageVatRate ?? 0);
      vatAmount = Math.round((subTotal * vatRate) / 100);
      totalAmount = subTotal + vatAmount;
    } else {
      // Group lines by their own currency, then convert non-base groups into the
      // quotation's currency before summing (rows can carry a different
      // currencyId than the quotation when copied from a multi-currency service).
      const currs = await fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES);
      const quotationCurrency = currencyFromRecord(quotation, currs);
      const quotationCurrencyId = extractCurrencyId(quotationCurrency);
      const byCurrency = {};
      lines.forEach(line => {
        const linePrice = parseNum(line.basePrice ?? line.price ?? 0);
        const lineQty = parseNum(line.quantity ?? 1) || 1;
        const lineVat = parseNum(line.vat ?? 0);
        const lineSubTotal = linePrice * lineQty;
        const lineVatAmount = Math.round((lineSubTotal * lineVat) / 100);
        const lineCurrency = currencyFromRecord(line, currs, quotationCurrency);
        const key = extractCurrencyId(lineCurrency) || getCurrencyCode(lineCurrency);
        if (!byCurrency[key]) byCurrency[key] = { currency: lineCurrency, subTotal: 0, vatAmount: 0, totalAmount: 0 };
        byCurrency[key].subTotal += lineSubTotal;
        byCurrency[key].vatAmount += lineVatAmount;
        byCurrency[key].totalAmount += lineSubTotal + lineVatAmount;
      });
      const groups = Object.values(byCurrency);
      const nonBaseGroups = groups.filter((g) => !isSameCurrency(g.currency, quotationCurrency));
      const exchangeRates = nonBaseGroups.length
        ? await fetchExchangeRatesForConversion(
          nonBaseGroups.map((g) => extractCurrencyId(g.currency)).filter(Boolean),
          quotationCurrencyId,
        )
        : [];
      for (const group of groups) {
        if (isSameCurrency(group.currency, quotationCurrency)) {
          subTotal += group.subTotal;
          vatAmount += group.vatAmount;
          totalAmount += group.totalAmount;
          continue;
        }
        const matched = pickConversionRate(exchangeRates, group.currency, quotationCurrency, quotation?.date);
        if (!matched?.rate) {
          canWriteTotals = false;
          console.warn(`[syncQuotationHeaderFromServices] Missing exchange rate ${getCurrencyCode(group.currency)} -> ${getCurrencyCode(quotationCurrency)}; skipping totals sync`);
          break;
        }
        subTotal += group.subTotal * matched.rate;
        vatAmount += group.vatAmount * matched.rate;
        totalAmount += group.totalAmount * matched.rate;
      }
    }

    await ctx.api.request({
      url: 'quotations:update',
      method: 'POST',
      params: { filterByTk: safeQuotationId },
      data: {
        pricingMode: isPackage ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
        ...(canWriteTotals ? { subTotal, vatAmount, totalAmount } : {}),
        customerId: extractId(quotation.customerId),
        internalCompanyId: extractId(quotation.internalCompanyId),
      },
    });
  } catch (e) {
    console.error('Error in syncQuotationHeaderFromServices:', e);
  }
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
    // Package mode is priced directly in VND — there is no per-line catalog
    // service to derive a "native" currency from, so no conversion needed.
    const totals = calcPackageTotals(packageSubTotal, packageVatRate, targetVnd);
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
  // native = the row's totals rounded at ITS OWN currency's precision, before
  // any VND conversion — this preserves FR-2.1's per-currency rounding step.
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
  const totalAmount = convertible ? subTotal + vatAmount : null;
  return {
    pricingMode: PRICING_MODE_LINE,
    basePrice: parseNum(basePrice),
    quantity: qty,
    vat: parseNum(vat),
    subTotal,
    vatAmount,
    totalAmount,
    exchangeRateToBase,
    packageSubTotal: 0,
    packageVatRate: 0,
    packageVatAmount: 0,
    packageTotalAmount: 0,
    _convertible: convertible,
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

const contractStatusToProjectServiceStatus = (status) => {
  const st = String(status || "").toLowerCase().trim();
  if (st === "deleted") return "deleted";
  if (["cancelled", "canceled", "terminated", "rejected"].includes(st)) return "cancelled";
  if (["completed", "closed", "done"].includes(st)) return "completed";
  if (["execution", "active", "signed"].includes(st)) return "active";
  if (["sent", "pending_signature", "waiting_signature", "signature"].includes(st)) return "contract_pending_signature";
  return "contracted";
};

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

const sameId = (a, b) => {
  const left = extractId(a);
  const right = extractId(b);
  return !!left && !!right && String(left) === String(right);
};

const findUnique = (items, predicate) => {
  const matches = items.filter(predicate);
  return matches.length === 1 ? matches[0] : null;
};

const extractFirstId = (value) => {
  if (Array.isArray(value)) return extractId(value[0]);
  return extractId(value);
};

const buildProjectServiceSyncPayload = ({ row, serviceId, pricingPayload, pricingMode, status, quotationServiceId, contractServiceId, currencyId }) => ({
  serviceId: serviceId || null,
  ServiceId: serviceId || null,
  services: serviceId || null,
  serviceName: row._svcName || null,
  serviceType: row._serviceType || null,
  description: row._description || null,
  pricingMode: isPackagePricing(pricingMode) ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
  billingMode: isPackagePricing(pricingMode) ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
  financialSourceType: SOURCE_CONTRACT,
  basePrice: pricingPayload.basePrice ?? 0,
  quantity: pricingPayload.quantity ?? 1,
  vat: pricingPayload.vat ?? 0,
  subTotal: pricingPayload.subTotal ?? 0,
  vatAmount: pricingPayload.vatAmount ?? 0,
  totalAmount: pricingPayload.totalAmount ?? 0,
  packageSubTotal: pricingPayload.packageSubTotal ?? 0,
  packageVatRate: pricingPayload.packageVatRate ?? 0,
  packageVatAmount: pricingPayload.packageVatAmount ?? 0,
  packageTotalAmount: pricingPayload.packageTotalAmount ?? 0,
  status: contractStatusToProjectServiceStatus(status),
  ...(currencyId ? { currencyId } : {}),
  // Giữ nguyên các link relation — không để NocoBase ghi null
  ...(quotationServiceId ? { quotationServiceId, quotationServices: quotationServiceId } : {}),
  ...(contractServiceId ? { contractServiceId, contractServices: contractServiceId } : {}),
});

const resolveProjectServiceForContractLine = (row, projectServices, resolvedServiceId) => {
  const rowProjectServiceId = extractId(row.projectServiceId) || extractFirstId(row.projectServices);
  const rowContractServiceId = extractId(row.id);
  const rowQuotationServiceId = extractId(row.quotationServiceId) || extractFirstId(row.quotationServices);
  const rowServiceId = resolvedServiceId || extractId(row.serviceId) || extractId(row.ServiceId) || extractFirstId(row.services);
  const rowName = normalizeLookupText(row._svcName || row.serviceName || (Array.isArray(row.services) ? row.services[0]?.serviceName : row.services?.serviceName));
  const contractId = extractId(CONTRACT_ID);

  const directMatch = projectServices.find(ps => {
    const psProjectServiceId = extractId(ps.id);
    const psContractServiceId = extractId(ps.contractServiceId) || extractFirstId(ps.contractServices);
    const psQuotationServiceId = extractId(ps.quotationServiceId) || extractFirstId(ps.quotationServices);
    return (
      (rowProjectServiceId && sameId(psProjectServiceId, rowProjectServiceId)) ||
      (rowContractServiceId && psContractServiceId && sameId(psContractServiceId, rowContractServiceId)) ||
      (rowQuotationServiceId && psQuotationServiceId && sameId(psQuotationServiceId, rowQuotationServiceId))
    );
  });
  if (directMatch) return directMatch;

  const sameContract = (ps) => sameId(ps.contractId || extractFirstId(ps.contracts), contractId);
  const sameService = (ps) => rowServiceId && sameId(extractId(ps.serviceId) || extractFirstId(ps.services), rowServiceId);
  const sameName = (ps) => {
    if (!rowName) return false;
    const psName = normalizeLookupText(ps.serviceName || (Array.isArray(ps.services) ? ps.services[0]?.serviceName : ps.services?.serviceName) || ps.name);
    return !!psName && psName === rowName;
  };

  return projectServices.find(ps => sameContract(ps) && sameService(ps)) ||
    projectServices.find(ps => sameContract(ps) && sameName(ps)) ||
    findUnique(projectServices, ps => !sameId(ps.contractId || extractFirstId(ps.contracts), contractId) && sameService(ps)) ||
    findUnique(projectServices, ps => !sameId(ps.contractId || extractFirstId(ps.contracts), contractId) && sameName(ps));
};

async function fetchContract() {
  if (!CONTRACT_ID) return ctx.record || {};
  try {
    const res = await ctx.api.request({
      url: 'contracts:get',
      params: { filterByTk: CONTRACT_ID, appends: ['cases'] },
    });
    return res?.data?.data || res?.data || ctx.record || {};
  } catch {
    return ctx.record || {};
  }
}

async function fetchCSvcs() {
  try {
    const res = await ctx.api.request({
      url: 'contractServices:list',
      params: {
        pageSize: 100,
        page: 1,
        filter: JSON.stringify({ contractId: { $eq: parseInt(CONTRACT_ID) } }),
        appends: ['projectServices', 'quotationServices', 'currency'],
      },
    });
    return res?.data?.data || [];
  } catch { return []; }
}

async function fetchComboCatalog() {
  try {
    const res = await ctx.api.request({
      url: 'serviceCombos:list',
      params: {
        filter: JSON.stringify({ isActive: { $eq: true } }),
        appends: ['serviceComboItems.services'],
        pageSize: 100,
      },
    });
    const list = res?.data?.data || [];
    return list.filter((c) => (c.serviceComboItems || []).length > 0);
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

// Currency-aware money draft formatting: VND (0 decimals) keeps the
// dot-thousands-only behavior; currencies with decimalPlaces > 0 (per
// getCurrencyDecimals) get a decimal separator too, following whatever real
// grouping convention getCurrencyLocale's locale string uses (derived via
// Intl.NumberFormat rather than a hardcoded vi-VN-vs-everything-else guess,
// since other locales — e.g. "de-DE" — also use "," as the decimal mark) so
// the edit draft matches the read-only formatMoney/formatMoneyAmount output.
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

const MoneyDraftInput = ({ value, onChange, disabled = false, style = {}, placeholder = "0", autoFocus = false, currency = null }) => {
  const [draft, setDraft] = useState(() => formatMoneyEditValue(value, currency));

  useEffect(() => {
    setDraft(formatMoneyEditValue(value, currency));
  }, [value, currency]);

  const handleChange = (event) => {
    const draftValue = buildMoneyDraft(event?.target?.value, currency);
    setDraft(draftValue);
    onChange?.(parseMoneyEditValue(draftValue, currency));
  };

  const normalizeDraft = () => {
    setDraft(formatMoneyEditValue(parseMoneyEditValue(draft, currency), currency));
  };

  return React.createElement(Input, {
    autoFocus,
    value: draft,
    disabled,
    inputMode: "decimal",
    onChange: handleChange,
    onBlur: normalizeDraft,
    onPressEnter: normalizeDraft,
    style: { width: "100%", textAlign: "right", ...style },
    placeholder,
  });
};

const EditableCell = ({ value, onSave, isTextArea = false, isNumber = false, isMoney = false, disabled = false, options = null, placeholder = "", customLabel = null, currency = null, hideCurrencyCode = false }) => {
  const [editing, setEditing] = useState(false);
  const numericCell = isNumber || isMoney;
  const [val, setVal] = useState(value ?? (numericCell ? 0 : ""));
  const [moneyDraft, setMoneyDraft] = useState(() => formatMoneyEditValue(value, currency));

  useEffect(() => { setVal(value ?? (numericCell ? 0 : "")); }, [value, numericCell]);
  useEffect(() => {
    if (!editing) setMoneyDraft(formatMoneyEditValue(value, currency));
  }, [value, editing, currency]);

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
        style: { width: "100%", minWidth: 150, borderRadius: DS.radius.sm },
        showSearch: true,
        optionFilterProp: "children"
      },
        React.createElement(Select.Option, { value: "" }, "-- Chọn --"),
        ...options.map(o => React.createElement(Select.Option, {
          key: o.value,
          value: o.value,
          disabled: o.disabled,
          style: { color: o.disabled ? C.muted : C.text }
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
        autoSize: { minRows: 2, maxRows: 8 },
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
        placeholder,
        style: { width: "100%", minWidth: 90, borderRadius: DS.radius.sm, textAlign: "right" },
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
        style: { width: "100%", minWidth: 90, borderRadius: DS.radius.sm },
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
      },
      style: { borderRadius: DS.radius.sm }
    });
  }

  let displayVal = val;
  if (isMoney) {
    displayVal = hideCurrencyCode ? formatMoneyAmount(val || 0, currency) : formatMoney(val || 0, currency);
  } else if (isNumber) {
    displayVal = val ? Number(val).toLocaleString("vi-VN") : "0";
  } else if (options) {
    const selectedOpt = options.find(o => String(o.value) === String(val));
    displayVal = selectedOpt ? selectedOpt.label : (customLabel || "—");
  }

  const viewCell = React.createElement("div", {
    style: isTextArea ? {
      cursor: disabled ? "not-allowed" : "pointer",
      minHeight: 28,
      padding: "6px 8px",
      borderRadius: DS.radius.xs,
      transition: "background 0.2s, border-color 0.2s",
      whiteSpace: "normal",
      wordBreak: "break-word",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
      textOverflow: "ellipsis",
      lineHeight: 1.5,
      border: "1px dashed transparent",
    } : {
      cursor: disabled ? "not-allowed" : "pointer",
      minHeight: 28,
      display: "flex",
      alignItems: "center",
      justifyContent: numericCell ? "flex-end" : "flex-start",
      padding: "6px 8px",
      borderRadius: DS.radius.xs,
      transition: "background 0.2s, border-color 0.2s",
      whiteSpace: numericCell ? "nowrap" : "pre-wrap",
      wordBreak: numericCell ? "normal" : "break-word",
      color: numericCell ? C.warning : "inherit",
      fontWeight: numericCell ? 500 : "normal",
      lineHeight: 1.5,
      border: "1px dashed transparent"
    },
    onClick: () => { if (!disabled) setEditing(true); },
    onMouseEnter: (e) => { if (!disabled) { e.currentTarget.style.background = C.primarySoft; e.currentTarget.style.borderColor = C.borderStrong; } },
    onMouseLeave: (e) => { if (!disabled) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } },
    title: disabled ? "Hợp đồng đã khoá" : "Click để chỉnh sửa"
  }, displayVal || React.createElement("span", { style: { color: C.muted, fontStyle: "italic" } }, "—"));

  return (isTextArea && val)
    ? React.createElement(Tooltip, { title: val, placement: "topLeft", overlayStyle: { maxWidth: 360 } }, viewCell)
    : viewCell;
};

// ==================== MAIN BLOCK ====================
const ContractServicesBlock = () => {
  const token = useNocoToken();
  const [rows, setRows] = useState([]);
  const [svcOpts, setSvcOpts] = useState([]);
  const [comboCatalog, setComboCatalog] = useState([]);
  const [contract, setContract] = useState(ctx.record || {});
  const [pricingMode, setPricingMode] = useState(isPackagePricing(ctx.record) ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE);
  const [packageSubTotal, setPackageSubTotal] = useState(parseNum(ctx.record?.packageSubTotal ?? ctx.record?.subTotal));
  const [packageVatRate, setPackageVatRate] = useState(
    ctx.record?.packageVatRate ?? inferVatRate(ctx.record?.subTotal, ctx.record?.vatAmount, 0),
  );
  const [psServiceIds, setPsServiceIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [compareModal, setCompareModal] = useState({ open: false, data: null });

  // Service selection modal states
  const [showSvcModal, setShowSvcModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboSubTab, setComboSubTab] = useState('select');
  const [comboSearch, setComboSearch] = useState('');
  const [adhocComboName, setAdhocComboName] = useState('');
  const [adhocServiceIds, setAdhocServiceIds] = useState([]);
  const [applyingCombo, setApplyingCombo] = useState(false);

  const openComboModal = () => {
    if (isLocked) { message.warning('🔒 Hợp đồng đã được ký hoặc đang thực hiện — không thể thêm dịch vụ'); return; }
    setComboSubTab('select');
    setComboSearch('');
    setAdhocComboName('');
    setAdhocServiceIds([]);
    setShowComboModal(true);
  };

  const convertComboSubTotalToVnd = async (subTotal, comboRecord) => {
    const amt = parseNum(subTotal);
    if (!amt) return 0;
    const comboCurrency = currencyFromRecord(comboRecord, currencies, vndCurrency);
    const comboCurrencyId = extractCurrencyId(comboCurrency);
    const vndCurrencyId = extractCurrencyId(vndCurrency);
    if (!comboCurrencyId || !vndCurrencyId || comboCurrencyId === vndCurrencyId) return amt;
    const freshRates = await fetchExchangeRatesForConversion([comboCurrencyId], vndCurrencyId);
    const mergedRates = [...exchangeRates, ...freshRates];
    const pricing = buildServicePricingPayload({
      pricingMode: PRICING_MODE_LINE,
      basePrice: amt,
      quantity: 1,
      vat: 0,
      currency: comboCurrency,
      vndCurrency,
      exchangeRatesToVnd: mergedRates,
      pricingDate,
    });
    if (!pricing._convertible) {
      message.error(`Thiếu tỷ giá quy đổi sang VND cho gói dịch vụ (${getCurrencyCode(comboCurrency)}).`);
      return null;
    }
    return pricing.subTotal;
  };

  // Local-only: pushes rows into `rows` and bumps `packageSubTotal` state,
  // exactly like addRow already does for a single service — nothing hits
  // the API until the existing "Save & Update contract" button.
  const applyComboFromCatalog = async (combo) => {
    const items = combo.serviceComboItems || [];
    if (!items.length) { message.warning('This package has no services.'); return; }
    setApplyingCombo(true);
    try {
      const comboIdVal = extractId(combo.id);
      const comboSubTotalVnd = await convertComboSubTotalToVnd(combo.packageSubTotal, combo);
      if (comboSubTotalVnd === null) return;

      const newRows = [];
      items.forEach((item) => {
        const svc = item.services || {};
        // Same currency-resolution order as handleSelectCatalogService: the
        // service's own currency first, falling back to the contract's —
        // never hardcoded to VND, so a combo item priced in a foreign
        // currency keeps that currency on its row.
        const nextCurrencyId = getRecordCurrencyId(svc) || extractCurrencyId(contractCurrency);
        const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
        for (let i = 0; i < unitCount; i++) {
          newRows.push({
            id: Date.now() + Math.random(),
            serviceId: svc.id || null,
            _basePrice: 0, _quantity: 1, _vat: 0,
            _svcName: svc.serviceName || '', _serviceType: svc.serviceType || '', _description: svc.description || '',
            currencyId: nextCurrencyId || null, _currencyId: nextCurrencyId ? String(nextCurrencyId) : '',
            _isNew: true, _deleted: false, _isCustom: !svc.id,
            comboId: comboIdVal, serviceCombo: comboIdVal, comboName: combo.comboName || 'Package',
          });
        }
      });

      setRows(prev => {
        const base = isPackageMode ? prev : prev.map(r => ({ ...r, _basePrice: 0, _vat: 0 }));
        return [...base, ...newRows];
      });
      if (!isPackageMode) setPricingMode(PRICING_MODE_PACKAGE);
      setPackageSubTotal(prev => parseNum(prev) + comboSubTotalVnd);
      setDirty(true);
      message.success(`Applied package "${combo.comboName}". Click "Save & Update contract" to persist.`);
      setShowComboModal(false);
    } catch (err) {
      console.error(err);
      message.error('Error applying package: ' + (err.message || ''));
    } finally {
      setApplyingCombo(false);
    }
  };

  // Ad-hoc combos contribute 0 to packageSubTotal — the user adjusts it by
  // hand afterward via the totals panel.
  const applyAdhocCombo = () => {
    const name = adhocComboName.trim();
    if (!name) { message.warning('Please enter a package name.'); return; }
    if (!adhocServiceIds.length) { message.warning('Please select at least one service.'); return; }
    const newRows = adhocServiceIds.map((svcId) => {
      const svc = svcOpts.find((o) => String(o.id) === String(svcId));
      const nextCurrencyId = getRecordCurrencyId(svc || {}) || extractCurrencyId(contractCurrency);
      return {
        id: Date.now() + Math.random(),
        serviceId: svc?.id || null,
        _basePrice: 0, _quantity: 1, _vat: 0,
        _svcName: svc?.serviceName || svc?.name || '', _serviceType: svc?.serviceType || '', _description: svc?.description || '',
        currencyId: nextCurrencyId || null, _currencyId: nextCurrencyId ? String(nextCurrencyId) : '',
        _isNew: true, _deleted: false, _isCustom: !svc?.id,
        comboId: null, serviceCombo: null, comboName: name,
      };
    });
    setRows(prev => {
      const base = isPackageMode ? prev : prev.map(r => ({ ...r, _basePrice: 0, _vat: 0 }));
      return [...base, ...newRows];
    });
    if (!isPackageMode) setPricingMode(PRICING_MODE_PACKAGE);
    setDirty(true);
    message.success(`Created package "${name}". Click "Save & Update contract" to persist.`);
    setShowComboModal(false);
  };
  const [activeRowId, setActiveRowId] = useState(null);
  const [modalView, setModalView] = useState('select'); // 'select' | 'create'
  const [svcSearch, setSvcSearch] = useState('');

  // Custom service form states
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcType, setNewSvcType] = useState('');
  const [newUnitPrice, setNewUnitPrice] = useState(0);
  const [newDescription, setNewDescription] = useState('');
  const [newSvcCurrencyId, setNewSvcCurrencyId] = useState('');
  const ui = useMemo(() => createNocoStyles(token), [token]);

  // ── Multi-currency state ──
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false);
  const contractCurrency = useMemo(
    () => currencyFromRecord(contract, currencies),
    [contract, currencies],
  );
  const getRowCurrency = useCallback(
    (row) => currencyFromRecord(row, currencies, contractCurrency),
    [currencies, contractCurrency],
  );
  // Per-row currency picker (merged into the Subtotal column) — code only,
  // no "CODE - Name" label, since the column is compact.
  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: String(c.id), label: getCurrencyCode(c) })),
    [currencies],
  );
  const newServiceCurrency = useMemo(
    () => resolveCurrency(newSvcCurrencyId, currencies) || contractCurrency,
    [newSvcCurrencyId, currencies, contractCurrency],
  );
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
    setNewSvcCurrencyId(
      (row && row._currencyId) || getCurrencySelectValue(contractCurrency),
    );
    setShowSvcModal(true);
  };

  const handleSelectCatalogService = (svc) => {
    setRows(prev => prev.map(r => {
      if (r.id !== activeRowId) return r;
      const price = svc.basePrice ?? svc.unitPrice ?? svc.price ?? 0;
      const vat = svc.vat ?? svc.vatRate ?? 0;
      const svcCurrencyId = getRecordCurrencyId(svc);
      const nextCurrencyId = svcCurrencyId || extractCurrencyId(r._currencyId) || extractCurrencyId(contractCurrency);
      return {
        ...r,
        serviceId: svc.id,
        _svcName: svc.serviceName || svc.name || '',
        _serviceType: svc.serviceType || svc.type || '',
        _description: svc.description || '',
        _basePrice: isPackageMode ? 0 : price,
        _vat: isPackageMode ? 0 : vat,
        currencyId: nextCurrencyId || null,
        _currencyId: nextCurrencyId ? String(nextCurrencyId) : '',
        _isCustom: false,
      };
    }));
    setDirty(true);
    setShowSvcModal(false);
  };

  const handleCreateCustomService = () => {
    if (!newSvcName.trim()) { message.warning('Vui lòng nhập tên dịch vụ'); return; }
    const nextCurrencyId = extractCurrencyId(newSvcCurrencyId) || extractCurrencyId(contractCurrency);
    setRows(prev => prev.map(r => {
      if (r.id !== activeRowId) return r;
      return {
        ...r,
        serviceId: null,
        _svcName: newSvcName.trim(),
        _serviceType: newSvcType.trim() || '',
        _description: newDescription.trim() || '',
        _basePrice: isPackageMode ? 0 : parseNum(newUnitPrice),
        _vat: isPackageMode ? 0 : 8,
        currencyId: nextCurrencyId || null,
        _currencyId: nextCurrencyId ? String(nextCurrencyId) : '',
        _isCustom: true,
      };
    }));
    setDirty(true);
    setShowSvcModal(false);
  };

  const reload = useCallback(async () => {
    if (!CONTRACT_ID) { setLoading(false); return; }
    setLoading(true);
    const [svcs, opts, currentContract, currs, comboList] = await Promise.all([
      fetchCSvcs(),
      fetchSvcOptions(),
      fetchContract(),
      fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
      fetchComboCatalog(),
    ]);
    setComboCatalog(comboList);
    const svcMap = {};
    opts.forEach(o => { svcMap[o.id] = o; });
    const packageLine = svcs.find((item) => !isDeletedServiceLine(item) && (isPackagePricing(item) || parseNum(item?.packageSubTotal) || parseNum(item?.packageTotalAmount)));
    const packageSource = packageLine || currentContract || {};
    setContract(currentContract);
    setCurrencies(currs);
    const resolvedContractCurrencyId = extractCurrencyId(currencyFromRecord(currentContract, currs));
    setPricingMode(isPackagePricing(currentContract) || !!packageLine ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE);
    setPackageSubTotal(parseNum(packageSource?.packageSubTotal ?? currentContract?.packageSubTotal ?? currentContract?.subTotal));
    setPackageVatRate(
      packageSource?.packageVatRate ?? currentContract?.packageVatRate ?? inferVatRate(
        packageSource?.packageSubTotal ?? currentContract?.subTotal,
        packageSource?.packageVatAmount ?? currentContract?.vatAmount,
        0,
      ),
    );
    setSvcOpts(opts);
    setRows(svcs.map(s => {
      const sid = extractId(s.serviceId) || extractId(s.ServiceId) || extractId(s.services);
      const rowCurrencyId = getRecordCurrencyId(s) || resolvedContractCurrencyId;
      return {
        ...s,
        serviceId: sid || s.serviceId,
        _basePrice: s.basePrice || 0,
        _quantity: s.quantity || 1,
        _vat: s.vat || 0,
        _svcName: svcMap[sid]?.serviceName || s.serviceName || '',
        _serviceType: s.serviceType || svcMap[sid]?.serviceType || s.serviceType || '',
        _description: s.description || svcMap[sid]?.description || s.description || '',
        currencyId: rowCurrencyId || null,
        _currencyId: rowCurrencyId ? String(rowCurrencyId) : '',
        _isNew: false,
        _deleted: false,
        _isCustom: !sid,
      };
    }));

    // Fetch projectServices to know which services are already in CaseServices
    try {
      let projectId = null;
      const casesRel = currentContract?.cases || [];
      if (casesRel.length > 0) {
        projectId = typeof casesRel[0] === 'object' ? casesRel[0].id : casesRel[0];
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
    } catch (e) { console.warn('[CS] Không fetch được projectServices:', e); }

    setDirty(false);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, []);

  const activeRows = useMemo(() => rows.filter(r => !r._deleted && !isDeletedServiceLine(r)), [rows]);

  // Set serviceId đang được dùng — để disable trong select của các dòng khác
  const usedServiceIds = useMemo(
    () => new Set(rows.map(r => r.serviceId).filter(Boolean)),
    [rows]
  );

  const isPackageMode = pricingMode === PRICING_MODE_PACKAGE;

  // VND is the only currency contracts.subTotal/vatAmount/totalAmount (and
  // every service line's own subTotal/vatAmount/totalAmount) are ever
  // denominated in — there is no more "Display currency"/"Record currency"
  // distinction. Each line keeps its own native currency (getRowCurrency)
  // purely for the basePrice input; everything downstream of that is VND.
  const vndCurrency = useMemo(() => findDefaultCurrency(currencies), [currencies]);
  const vndCurrencyId = extractCurrencyId(vndCurrency);
  const pricingDate = contract?.signedAt || contract?.date;

  const lineCurrencyIdsNeedingRate = useMemo(() => {
    const ids = new Set();
    activeRows.forEach((r) => {
      const c = getRowCurrency(r);
      if (!isSameCurrency(c, vndCurrency)) {
        const id = extractCurrencyId(c);
        if (id) ids.add(id);
      }
    });
    return Array.from(ids);
  }, [activeRows, getRowCurrency, vndCurrency]);
  const lineCurrencyIdsKey = lineCurrencyIdsNeedingRate.slice().sort((a, b) => a - b).join(',');

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

  // VAT amount / Package total are never directly editable â€” always derived
  // from Package subtotal + VAT rate.
  const packageTotals = useMemo(
    () => calcPackageTotals(packageSubTotal, packageVatRate, vndCurrency),
    [packageSubTotal, packageVatRate, vndCurrency],
  );

  const lineTotalsVnd = useMemo(() => {
    if (isPackageMode) return { subTotal: 0, vatAmount: 0, totalAmount: 0, missingRows: [] };
    const missingRows = [];
    const sums = activeRows.reduce((acc, r) => {
      const pricing = buildServicePricingPayload({
        pricingMode: PRICING_MODE_LINE,
        basePrice: r._basePrice,
        quantity: 1,
        vat: r._vat,
        currency: getRowCurrency(r),
        vndCurrency,
        exchangeRatesToVnd: exchangeRates,
        pricingDate,
      });
      if (!pricing._convertible) {
        missingRows.push(r);
        return acc;
      }
      return {
        subTotal: acc.subTotal + pricing.subTotal,
        vatAmount: acc.vatAmount + pricing.vatAmount,
        totalAmount: acc.totalAmount + pricing.totalAmount,
      };
    }, { subTotal: 0, vatAmount: 0, totalAmount: 0 });
    return { ...sums, missingRows };
  }, [activeRows, isPackageMode, getRowCurrency, vndCurrency, exchangeRates, pricingDate]);

  const totals = isPackageMode ? packageTotals : lineTotalsVnd;

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
      if (field === '_currencyId') {
        upd.currencyId = extractCurrencyId(value) || null;
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

  // Lock status check
  const isLocked = ['signed', 'active', 'completed', 'terminated'].includes(String(CONTRACT_STATUS || contract?.status || '').toLowerCase().trim());

  const compareFields = [
    { key: "serviceName", label: "Tên dịch vụ", type: "text" },
    { key: "serviceType", label: "Loại dịch vụ", type: "text" },
    { key: "description", label: "Mô tả", type: "text" },
    { key: "basePrice", label: "Đơn giá", type: "money" },
    { key: "vat", label: "VAT (%)", type: "number" },
  ];

  const formatCompareValue = (value, type, currency = null) => {
    if (type === "money") return formatMoney(Number(value) || 0, currency);
    return String(value ?? "").trim() || "-";
  };

  const getCatalogService = (record) => {
    // Ưu tiên match bằng serviceId (chính xác nhất, không thể nhầm)
    const recordServiceId = extractId(record.serviceId) || extractId(record.ServiceId) || extractId(record.services);
    if (recordServiceId) {
      const byId = svcOpts.find(s => String(s.id) === String(recordServiceId));
      if (byId) return byId;
    }
    // Fallback: match bằng tên (cho custom services không có serviceId)
    const recordName = normalizeLookupText(record._svcName || record.serviceName);
    if (!recordName) return null;
    return svcOpts.find(s => normalizeLookupText(s.serviceName || s.name) === recordName);
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
    if (field === "vat") return record._vat ?? record.vat ?? 0;
    return record[field];
  };

  const getComparisonRows = (record) => {
    const catalog = getCatalogService(record);
    return compareFields.map(field => {
      const original = getCatalogValue(catalog, field.key);
      const quoted = getQuotedValue(record, field.key);
      const normOrig = normalizeLookupText(formatCompareValue(original, field.type));
      const normQuoted = normalizeLookupText(formatCompareValue(quoted, field.type));
      return {
        key: field.key,
        field: field.label,
        type: field.type,
        original,
        quoted,
        catalogMissing: !catalog,
        changed: !!catalog && normOrig !== normQuoted,
      };
    });
  };

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
    // whatever currency this contract line currently uses — don't reuse
    // recordCurrency for the catalog column or the price label lies.
    const catalogCurrency = currencyFromRecord(catalog, currencies, recordCurrency);
    const showCurrencyHint = !!catalog && !isSameCurrency(catalogCurrency, recordCurrency);
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
          React.createElement("div", { style: { fontSize: 13, color: C.textSub, marginBottom: 4 } }, "Dịch vụ Hợp đồng"),
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
            title: showCurrencyHint ? `Dịch vụ gốc (Catalog) · ${getCurrencyCode(catalogCurrency)}` : "Dịch vụ gốc (Catalog)",
            dataIndex: "original",
            render: (value, row) => renderCompareCell(value, row.type, catalogCurrency),
          },
          {
            title: showCurrencyHint ? `Dịch vụ trong Hợp đồng · ${getCurrencyCode(recordCurrency)}` : "Dịch vụ trong Hợp đồng",
            dataIndex: "quoted",
            render: (value, row) => renderCompareCell(value, row.type, recordCurrency),
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
          borderRadius: DS.radius.sm,
          background: C.bgSection,
          color: C.textSub,
          fontSize: 13,
        }
      }, "So sánh dữ liệu dịch vụ hiện tại trong Hợp đồng với danh mục dịch vụ gốc."),

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
            title: "Dịch vụ Hợp đồng",
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

  // comboTarget (set via a combo section's own "+ Add service" button) tags
  // the new row into that combo instead of landing as an untagged row.
  const addRow = (comboTarget = null) => {
    if (isLocked) { message.warning('🔒 Hợp đồng đã được ký hoặc đang thực hiện — không thể thêm dịch vụ'); return; }
    const newId = Date.now();
    const defaultCurrencyId = extractCurrencyId(contractCurrency);
    setRows(prev => [...prev, {
      id: newId,
      serviceId: null,
      _basePrice: 0,
      _quantity: 1,
      _vat: isPackageMode ? 0 : 8,
      _svcName: '',
      _serviceType: '',
      _description: '',
      currencyId: defaultCurrencyId || null,
      _currencyId: defaultCurrencyId ? String(defaultCurrencyId) : '',
      _isNew: true,
      _deleted: false,
      _isCustom: false,
      comboId: comboTarget?.comboId || null,
      serviceCombo: comboTarget?.comboId || null,
      comboName: comboTarget?.comboName || null,
    }]);
    setDirty(true);
    openServiceModal(newId);
  };

  const deleteRow = id => {
    if (isLocked) { message.warning('🔒 Hợp đồng đã được ký hoặc đang thực hiện — không thể xoá dịch vụ'); return; }
    setRows(prev => prev.map(r => r.id === id ? { ...r, _deleted: true } : r));
    setDirty(true);
  };

  // Bulk-removes every active row tagged with a given comboId â€” the combo
  // section header's "Remove combo" action. A row already saved to the
  // server is soft-marked `_deleted` (persisted on the next Save, same as a
  // single-row delete); a row only added locally (`_isNew`, never saved) is
  // simply dropped from state instead of round-tripping through delete.
  const removeCombo = (groupKey) => {
    if (isLocked) { message.warning('🔒 Hợp đồng đã được ký hoặc đang thực hiện — không thể xoá dịch vụ'); return; }
    setRows(prev => prev
      .map((r) => {
        if (getComboGroupKey(r) !== groupKey) return r;
        return r._isNew ? null : { ...r, _deleted: true };
      })
      .filter(Boolean));
    setDirty(true);
  };

  const handleSave = async () => {
    const invalid = activeRows.find(r => !r._svcName?.trim() || (!isPackageMode && parseNum(r._basePrice) <= 0));
    if (invalid) { message.warning(isPackageMode ? 'Vui lòng nhập đầy đủ tên dịch vụ' : 'Vui lòng điền đầy đủ tên dịch vụ và đơn giá'); return; }
    if (isPackageMode && parseNum(packageSubTotal) <= 0) { message.warning('Vui lòng nhập giá trị gói dịch vụ hợp đồng'); return; }
    if (!isPackageMode && lineTotalsVnd.missingRows.length) {
      const names = lineTotalsVnd.missingRows
        .map((r) => `"${r._svcName || 'Dịch vụ chưa đặt tên'}" (${getCurrencyCode(getRowCurrency(r))})`)
        .join(', ');
      message.error(`Thiếu tỷ giá quy đổi sang VND cho: ${names} — không thể lưu.`);
      return;
    }
    setSaving(true);
    try {
      let projectId = null;
      let existingPS = [];
      try {
        projectId =
          extractFirstId(contract?.cases) ||
          extractId(contract?.caseId) ||
          extractId(contract?.projectId) ||
          extractId(contract?.projects) ||
          extractFirstId(rows.map(row => extractId(row.projectId) || extractId(row.projects) || extractId(row.projectServices?.projectId)).filter(Boolean));

        // Fallback: query trực tiếp nếu vẫn không có projectId
        if (!projectId && CONTRACT_ID) {
          try {
            const contractFetchRes = await ctx.api.request({
              url: 'contracts:get',
              params: { filterByTk: CONTRACT_ID, appends: ['cases'] },
            });
            const freshContract = contractFetchRes?.data?.data || contractFetchRes?.data || {};
            projectId =
              extractFirstId(freshContract?.cases) ||
              extractId(freshContract?.caseId) ||
              extractId(freshContract?.projectId) ||
              null;
          } catch (fetchErr) {
            console.warn('[CS→PS] Không fetch được contract.cases:', fetchErr);
          }
        }
      } catch (e) { console.warn('[CS→PS] Không fetch được project:', e); }

      if (projectId) {
        try {
          const psAllRes = await ctx.api.request({
            url: 'projectServices:list',
            params: {
              filter: JSON.stringify({ projectId: { $eq: parseInt(projectId) } }),
              pageSize: 500,
              appends: ['quotationServices', 'contractServices'],
            }
          });
          existingPS = psAllRes?.data?.data || [];
        } catch (e) { message.warning('Không thể tải danh sách projectServices: ' + (e?.message || '')); }
      }

      // Fetch bản gốc contractServices từ DB để lấy originalServiceId khi user đổi dịch vụ
      let originalCSvcs = [];
      try {
        const origCSRes = await ctx.api.request({
          url: 'contractServices:list',
          params: { pageSize: 200, filter: JSON.stringify({ contractId: { $eq: parseInt(CONTRACT_ID) } }) }
        });
        originalCSvcs = origCSRes?.data?.data || [];
      } catch (e) { console.warn('[CS] Không fetch được originalCSvcs:', e); }

      for (const r of rows) {
        if (isDeletedServiceLine(r) && !r._deleted) continue;
        const pricingPayload = buildServicePricingPayload({
          pricingMode,
          basePrice: r._basePrice,
          quantity: 1,
          vat: r._vat,
          packageSubTotal,
          packageVatRate,
          currency: getRowCurrency(r),
          vndCurrency,
          exchangeRatesToVnd: exchangeRates,
          pricingDate,
        });

        // Cố gắng tìm catalog service khớp theo tên để lưu serviceId nếu khớp
        const catalogMatch = getCatalogService(r);
        const serviceId = extractId(r.serviceId) || extractId(r.ServiceId) || extractId(r.services) || (catalogMatch ? catalogMatch.id : null);

        // Lấy originalServiceId từ DB (trước khi user đổi)
        const originalCSvc = !r._isNew ? originalCSvcs.find(cs => String(cs.id) === String(r.id)) : null;
        const originalServiceId = originalCSvc
          ? (extractId(originalCSvc.serviceId) || extractId(originalCSvc.ServiceId) || extractId(originalCSvc.services))
          : null;
        // Truyền originalServiceId nếu user đã đổi serviceId (để resolveProjectServiceForContractLine tìm PS bằng serviceId cũ)
        const resolveServiceId = serviceId || originalServiceId;

        const rowProjectServiceId = extractId(r.projectServiceId) || extractId(r.projectServices);
        const rowQuotationServiceId = extractId(r.quotationServiceId) || extractId(r.quotationServices);
        const matchedPS = resolveProjectServiceForContractLine(r, existingPS, resolveServiceId);
        const linkedProjectServiceId = extractId(matchedPS?.id) || rowProjectServiceId || null;
        // Lấy quotationServiceId từ row hoặc từ matchedPS (nếu row không có)
        const linkedQuotationServiceId =
          rowQuotationServiceId ||
          extractId(matchedPS?.quotationServiceId) ||
          extractId(matchedPS?.quotationServices) ||
          null;
        const rowProjectId =
          projectId ||
          extractId(r.projectId) ||
          extractId(r.projects) ||
          extractId(r.projectServices?.projectId) ||
          extractId(matchedPS?.projectId) ||
          extractId(matchedPS?.projects);
        const rowCurrencyId = extractCurrencyId(getRowCurrency(r));
        const projectServicePayload = buildProjectServiceSyncPayload({
          row: r,
          serviceId,
          pricingPayload,
          pricingMode,
          status: CONTRACT_STATUS || contract?.status,
          quotationServiceId: linkedQuotationServiceId,
          contractServiceId: !r._isNew ? r.id : null,
          currencyId: rowCurrencyId,
        });

        const payload = {
          contractId: parseInt(CONTRACT_ID),
          contracts: parseInt(CONTRACT_ID),
          serviceId: serviceId || null,
          ServiceId: serviceId || null,
          serviceName: r._svcName || null,
          serviceType: r._serviceType || null,
          description: r._description || null,
          currencyId: rowCurrencyId || null,
          currency: rowCurrencyId || null,
          comboId: extractId(r.comboId) || extractId(r.serviceCombo) || null,
          serviceCombo: extractId(r.comboId) || extractId(r.serviceCombo) || null,
          comboName: r.comboName || null,
          ...pricingPayload,
          ...(linkedQuotationServiceId ? {
            quotationServiceId: linkedQuotationServiceId,
            quotationServices: linkedQuotationServiceId,
          } : {}),
          ...(rowProjectId ? { projectId: rowProjectId } : {}),
        };

        if (r._deleted && !r._isNew) {
          await ctx.api.request({
            url: 'contractServices:update',
            method: 'POST',
            params: { filterByTk: r.id },
            data: { status: 'deleted', lineStatus: 'deleted' },
          });
          // Cascade: delete corresponding projectService
          if (linkedProjectServiceId) {
            try {
              await requestProjectService({
                action: 'update',
                params: { filterByTk: linkedProjectServiceId },
                data: { status: 'deleted' },
              });
            } catch (e) { message.warning('Khong the soft-delete projectService #' + linkedProjectServiceId + ': ' + (e?.message || '')); }
          }
          if (linkedQuotationServiceId) {
            try {
              await ctx.api.request({
                url: 'quotationServices:update',
                method: 'POST',
                params: { filterByTk: linkedQuotationServiceId },
                data: { status: 'deleted' },
              });
              const qSvcRes = await ctx.api.request({
                url: 'quotationServices:get',
                params: { filterByTk: linkedQuotationServiceId },
              });
              const qSvcRecord = qSvcRes?.data?.data || qSvcRes?.data || {};
              const targetQuotationId = extractId(qSvcRecord.quotationId) || extractId(qSvcRecord.quotations);
              if (targetQuotationId) {
                await syncQuotationHeaderFromServices(targetQuotationId);
              }
            } catch (e) {
              console.warn('[CS->QS] Could not soft-delete quotationService #' + linkedQuotationServiceId + ': ' + (e?.message || ''));
            }
          }
        } else if (!r._deleted && r._isNew) {
          let projectServiceId = linkedProjectServiceId;

          // Cascade: create projectService if not exists
          if (projectId && (serviceId || r._svcName)) {
            if (matchedPS) {
              projectServiceId = matchedPS.id;
              try {
                await requestProjectService({
                  action: 'update',
                  params: { filterByTk: matchedPS.id },
                  data: {
                    ...projectServicePayload,
                  }
                });
              } catch (e) { message.warning('Không thể update projectService trùng: ' + (e?.message || '')); }
            } else {
              try {
                const newPS = await requestProjectService({
                  action: 'create',
                  data: {
                    projectId: parseInt(projectId),
                    ...projectServicePayload,
                  }
                });
                projectServiceId = newPS?.data?.data?.id || newPS?.data?.id || null;
                if (newPS?.data?.data) existingPS.push(newPS.data.data);
              } catch (e) { message.warning('Không thể tạo projectService: ' + (e?.message || '')); }
            }
          }

          const csCreateRes = await ctx.api.request({
            url: 'contractServices:create',
            method: 'POST',
            data: {
              ...payload,
              projectServiceId,
              projectServices: projectServiceId,
            }
          });
          const createdContractServiceId = csCreateRes?.data?.data?.id || csCreateRes?.data?.id || null;
          if (projectServiceId && createdContractServiceId) {
            await requestProjectService({
              action: 'update',
              params: { filterByTk: projectServiceId },
              data: {
                ...projectServicePayload,
                contractServiceId: createdContractServiceId,
                contractServices: createdContractServiceId,
              },
            });
          }
          if (linkedQuotationServiceId) {
            try {
              await ctx.api.request({
                url: 'quotationServices:update',
                method: 'POST',
                params: { filterByTk: linkedQuotationServiceId },
                data: {
                  serviceId: serviceId || null,
                  ServiceId: serviceId || null,
                  services: serviceId || null,
                  serviceName: r._svcName || null,
                  serviceType: r._serviceType || null,
                  description: r._description || null,
                  currencyId: rowCurrencyId || null,
                  currency: rowCurrencyId || null,
                  ...pricingPayload,
                },
              });
              const qSvcRes = await ctx.api.request({
                url: 'quotationServices:get',
                params: { filterByTk: linkedQuotationServiceId },
              });
              const qSvcRecord = qSvcRes?.data?.data || qSvcRes?.data || {};
              const targetQuotationId = extractId(qSvcRecord.quotationId) || extractId(qSvcRecord.quotations);
              if (targetQuotationId) {
                await syncQuotationHeaderFromServices(targetQuotationId);
              }
            } catch (e) {
              console.warn('[CS->QS] Could not sync quotationService #' + linkedQuotationServiceId + ': ' + (e?.message || ''));
            }
          }
        } else if (!r._deleted && !r._isNew) {
          await ctx.api.request({
            url: 'contractServices:update',
            method: 'POST',
            params: { filterByTk: r.id },
            data: {
              ...payload,
              ...(linkedProjectServiceId ? {
                projectServiceId: linkedProjectServiceId,
                projectServices: linkedProjectServiceId,
              } : {}),
            }
          });

          // Cascade: update projectService if found
          if (linkedProjectServiceId) {
            try {
              await requestProjectService({
                action: 'update',
                params: { filterByTk: linkedProjectServiceId },
                data: {
                  ...projectServicePayload,
                }
              });
            } catch (e) { message.warning('Không thể update projectService #' + linkedProjectServiceId + ': ' + (e?.message || '')); }
          }

          // Cascade: update quotationService if found
          const targetQuotationServiceId = linkedQuotationServiceId;
          if (targetQuotationServiceId) {
            try {
              await ctx.api.request({
                url: 'quotationServices:update',
                method: 'POST',
                params: { filterByTk: targetQuotationServiceId },
                data: {
                  serviceId: serviceId || null,
                  ServiceId: serviceId || null,
                  services: serviceId || null,
                  serviceName: r._svcName || null,
                  serviceType: r._serviceType || null,
                  description: r._description || null,
                  currencyId: rowCurrencyId || null,
                  currency: rowCurrencyId || null,
                  ...pricingPayload,
                }
              });
              // Fetch to find target quotation ID to sync totals
              const qSvcRes = await ctx.api.request({
                url: 'quotationServices:get',
                params: { filterByTk: targetQuotationServiceId },
              });
              const qSvcRecord = qSvcRes?.data?.data || qSvcRes?.data || {};
              const targetQuotationId = extractId(qSvcRecord.quotationId) || extractId(qSvcRecord.quotations);
              if (targetQuotationId) {
                await syncQuotationHeaderFromServices(targetQuotationId);
              }
            } catch (e) {
              console.warn('[CS->QS] Could not update quotationService #' + targetQuotationServiceId + ': ' + (e?.message || ''));
            }
          }
        }
      }

      // Step 2: Update contract totals — `totals` (packageTotals or
      // lineTotalsVnd) is always VND and always fully resolved here, since
      // the pre-flight check earlier in this function already blocked Save
      // if any row's currency couldn't be converted to VND.
      const isRetainer = String(contract?.contractType).toLowerCase() === 'retainer';
      let finalSubTotal = totals.subTotal;
      let finalVatAmount = totals.vatAmount;
      let finalTotalAmount = totals.totalAmount;
      let finalFixedAmount = undefined;

      if (isRetainer) {
        const monthly = parseNum(contract?.monthlyFee);
        const duration = parseNum(contract?.retainerDuration);
        const vatRate = parseNum(contract?.packageVatRate ?? packageVatRate ?? 0);
        finalSubTotal = monthly * duration;
        finalVatAmount = roundMoneyForCurrency((finalSubTotal * vatRate) / 100, vndCurrency);
        finalTotalAmount = finalSubTotal + finalVatAmount;
      } else {
        finalFixedAmount = finalTotalAmount; // Đồng bộ fixedAmount với totalAmount (có VAT) theo feedback
      }

      await ctx.api.request({
        url: 'contracts:update',
        method: 'POST',
        params: { filterByTk: CONTRACT_ID },
        data: {
          pricingMode,
          packageVatRate: isPackageMode ? parseNum(packageVatRate) : null,
          subTotal: finalSubTotal,
          vatAmount: finalVatAmount,
          totalAmount: finalTotalAmount,
          ...(finalFixedAmount !== undefined ? { fixedAmount: finalFixedAmount } : {}),
          customerId: extractId(contract.customerId) || extractId(ctx.record?.customerId),
          internalCompanyId: extractId(contract.internalCompanyId) || extractId(ctx.record?.internalCompanyId)
        },
      });

      // Step 3: Sync project totalAmount if linked
      if (projectId) {
        try {
          await ctx.api.request({
            url: 'projects:update', method: 'POST',
            params: { filterByTk: projectId },
            data: { totalAmount: finalTotalAmount }
          });
        } catch (e) { message.warning('Không thể đồng bộ hồ sơ: ' + (e?.message || '')); }
      }

      message.success('✅ Đã lưu và đồng bộ dịch vụ hợp đồng → dịch vụ hồ sơ');
      setDirty(false);
      reload();
    } catch (e) { message.error('Lỗi: ' + (e?.message || 'Thử lại')); }
    setSaving(false);
  };

  const th = (extra = {}) => ({ padding: '9px 12px', fontSize: 11.5, fontFamily: FONT, fontWeight: 600, color: C.textSub, background: C.bgSection, borderBottom: `2px solid ${C.border}`, whiteSpace: 'nowrap', textAlign: 'left', ...extra });
  const td = (extra = {}) => ({ padding: '8px 10px', fontSize: 13, fontFamily: FONT, color: C.text, borderBottom: '1px solid #f3f4f6', verticalAlign: 'top', ...extra });

  // Single-currency totals (package mode, or line mode with only one line
  // currency) don't go through the per-group breakdown UI, so without this
  // they'd silently keep showing the natural-currency amount even after the
  // user picks a different display currency — the "Quy đổi sang X" label
  // above the table would then be lying about what the numbers show.
  if (!CONTRACT_ID) return React.createElement('div', { style: { padding: 20, color: C.danger, fontFamily: FONT } }, 'Contract ID was not found in the URL.');
  if (loading) return React.createElement('div', { style: { textAlign: 'center', padding: 48 } }, React.createElement(Spin, { size: 'large' }));

  // Package mode is a single toggle for the whole contract (not per-row), so
  // when active these 4 columns are "Included"/"—" for every row â€” drop them
  // entirely to compact the table instead of leaving 4 dead columns.
  const PRICE_COLUMN_KEYS = ['basePrice', 'vat', 'vatAmount', 'total'];

  const serviceTableColumns = [
    {
      title: '#',
      key: 'index',
      width: 56,
      align: 'center',
      render: (_, r) => r._displayIndex,
    },
    {
      title: 'Service & Type',
      key: 'service',
      width: 300,
      render: (_, r) => React.createElement(Button, {
        block: true,
        type: 'dashed',
        disabled: isLocked,
        onClick: () => openServiceModal(r.id),
        style: { height: 'auto', padding: token.paddingXS, whiteSpace: 'normal', textAlign: 'left' },
      },
        (!r.serviceId && !r._svcName)
          ? React.createElement(Text, { type: 'secondary', italic: true }, 'Select service')
          : React.createElement(Space, { direction: 'vertical', size: 2, style: { width: '100%' } },
            React.createElement(Text, { strong: true, style: { whiteSpace: 'normal' } }, r._svcName),
            r._serviceType && React.createElement(Tag, { color: 'blue', style: { marginInlineEnd: 0 } }, r._serviceType)
          )
      ),
    },
    {
      title: 'Description',
      dataIndex: '_description',
      key: 'description',
      width: 300,
      render: (_, r) => React.createElement(EditableCell, {
        value: r._description,
        onSave: val => updateRow(r.id, '_description', val),
        disabled: isLocked,
        isTextArea: true,
        placeholder: 'Service description...',
      }),
    },
    {
      title: 'Price',
      key: 'basePrice',
      width: 220,
      align: 'right',
      render: (_, r) => {
        if (isPackageMode) return React.createElement(Text, { type: 'secondary' }, 'Included');
        const rowCurrency = getRowCurrency(r);
        const pricing = buildServicePricingPayload({
          pricingMode: PRICING_MODE_LINE,
          basePrice: r._basePrice,
          quantity: 1,
          vat: r._vat,
          currency: rowCurrency,
          vndCurrency,
          exchangeRatesToVnd: exchangeRates,
          pricingDate,
        });
        return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, width: '100%' } },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 4, width: '100%' } },
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement(EditableCell, {
                value: r._basePrice,
                onSave: val => updateRow(r.id, '_basePrice', val),
                disabled: isLocked,
                isMoney: true,
                currency: rowCurrency,
                hideCurrencyCode: true,
              })
            ),
            React.createElement(Select, {
              value: r._currencyId || (extractCurrencyId(rowCurrency) ? String(extractCurrencyId(rowCurrency)) : undefined),
              disabled: isLocked || !currencyOptions.length,
              size: 'small',
              style: { width: 76, flexShrink: 0 },
              onChange: (v) => updateRow(r.id, '_currencyId', v),
              options: currencyOptions,
              placeholder: 'Currency',
            })
          ),
          !isSameCurrency(rowCurrency, vndCurrency) && React.createElement(Text, {
            type: pricing._convertible ? 'secondary' : 'danger',
            style: { fontSize: 11 },
          }, pricing._convertible ? `≈ ${formatMoney(pricing.subTotal, vndCurrency)}` : 'Thiếu tỷ giá quy đổi'),
        );
      },
    },
    {
      title: 'VAT (%)',
      key: 'vat',
      width: 110,
      align: 'right',
      render: (_, r) => isPackageMode
        ? React.createElement(Text, { type: 'secondary' }, '—')
        : React.createElement(EditableCell, {
          value: r._vat,
          onSave: val => updateRow(r.id, '_vat', val),
          disabled: isLocked,
          isNumber: true,
        }),
    },
    {
      title: 'VAT amount',
      key: 'vatAmount',
      width: 150,
      align: 'right',
      render: (_, r) => {
        if (isPackageMode) return React.createElement(Text, { type: 'secondary' }, '—');
        const pricing = buildServicePricingPayload({
          pricingMode: PRICING_MODE_LINE, basePrice: r._basePrice, quantity: 1, vat: r._vat,
          currency: getRowCurrency(r), vndCurrency, exchangeRatesToVnd: exchangeRates, pricingDate,
        });
        return React.createElement(Text, { style: { color: token.colorWarning, whiteSpace: 'nowrap' } },
          pricing._convertible ? formatMoney(pricing.vatAmount, vndCurrency) : '—');
      },
    },
    {
      title: 'Total amount',
      key: 'total',
      width: 160,
      align: 'right',
      render: (_, r) => {
        if (isPackageMode) return React.createElement(Text, { type: 'secondary' }, '—');
        const pricing = buildServicePricingPayload({
          pricingMode: PRICING_MODE_LINE, basePrice: r._basePrice, quantity: 1, vat: r._vat,
          currency: getRowCurrency(r), vndCurrency, exchangeRatesToVnd: exchangeRates, pricingDate,
        });
        return React.createElement(Text, { strong: true, style: { color: token.colorInfo, whiteSpace: 'nowrap' } },
          pricing._convertible ? formatMoney(pricing.totalAmount, vndCurrency) : '—');
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      align: 'center',
      render: (_, r) => React.createElement(Space, { size: 4 },
        React.createElement(Button, {
          size: 'small',
          type: 'link',
          onClick: () => setCompareModal({ open: true, data: r }),
        }, 'Review'),
        !isLocked && React.createElement(Button, {
          size: 'small',
          type: 'link',
          danger: true,
          onClick: () => deleteRow(r.id),
        }, 'Delete')
      ),
    },
  ].filter(Boolean).filter((col) => !(isPackageMode && PRICE_COLUMN_KEYS.includes(col.key)));

  // Groups active rows sharing a comboId into contiguous sections (a
  // combo's rows aren't guaranteed to be adjacent once services are added to
  // it after creation), inserting a synthetic combo-header pseudo-row before
  // each group. Rows without a comboId keep their original position.
  // Real catalog combos group by comboId. Ad-hoc combos never get a real
  // comboId (matches *CreateForm.js's own behavior), so they fall back to
  // grouping by comboName. Two independently-applied ad-hoc combos sharing
  // the exact same name will visually merge into one section — an accepted,
  // documented limitation (see spec).
  const getComboGroupKey = (row) => {
    const comboIdVal = extractId(row.comboId) || extractId(row.serviceCombo);
    if (comboIdVal) return `id:${comboIdVal}`;
    const name = String(row.comboName || '').trim();
    return name ? `name:${name}` : null;
  };

  const comboGroups = new Map();
  for (const row of activeRows) {
    const key = getComboGroupKey(row);
    if (!key) continue;
    if (!comboGroups.has(key)) comboGroups.set(key, []);
    comboGroups.get(key).push(row);
  }
  const emittedCombos = new Set();
  const groupedActiveRows = [];
  let displaySeq = 0;
  for (const row of activeRows) {
    const key = getComboGroupKey(row);
    if (!key) {
      displaySeq += 1;
      groupedActiveRows.push({ ...row, _displayIndex: displaySeq });
      continue;
    }
    if (emittedCombos.has(key)) continue;
    emittedCombos.add(key);
    const groupRows = comboGroups.get(key);
    groupedActiveRows.push({
      id: `combo-header-${key}`,
      _isComboHeader: true,
      _groupKey: key,
      comboId: extractId(row.comboId) || extractId(row.serviceCombo) || null,
      comboName: row.comboName || 'Package',
      _comboCount: groupRows.length,
    });
    for (const r of groupRows) {
      displaySeq += 1;
      groupedActiveRows.push({ ...r, _displayIndex: displaySeq });
    }
  }

  const renderComboHeaderBar = (record) => React.createElement('div', {
    style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 20, flexWrap: 'wrap', padding: '6px 4px' },
  },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      React.createElement(Tag, { color: 'blue', style: { fontWeight: 700, letterSpacing: 0.3 } }, 'PACKAGE'),
      React.createElement(Text, { strong: true }, record.comboName || 'Package'),
      React.createElement(Text, { type: 'secondary', style: { fontSize: 12.5 } },
        `${record._comboCount} service${record._comboCount === 1 ? '' : 's'}`)
    ),
    !isLocked && React.createElement(Space, { size: 8 },
      React.createElement(Button, {
        size: 'small',
        onClick: () => addRow({ comboId: record.comboId, comboName: record.comboName }),
      }, '+ Add service'),
      React.createElement(Popconfirm, {
        title: 'Remove this package?',
        description: 'All services in this package section will be removed.',
        okText: 'Remove',
        okType: 'danger',
        cancelText: 'Cancel',
        onConfirm: () => removeCombo(record._groupKey),
      },
        React.createElement(Button, { size: 'small', danger: true }, 'Remove package')
      )
    )
  );

  const columnsWithComboHeader = serviceTableColumns.map((col, idx) => ({
    ...col,
    onCell: (record) => {
      if (record._isComboHeader) {
        return idx === 0 ? { colSpan: serviceTableColumns.length } : { colSpan: 0 };
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

  // Stacked label/value rows with a dashed divider and a bold Total row â€”
  // lives outside the Table (not Table.Summary) so it isn't constrained by
  // <td> layout. Package subtotal/VAT rate stay editable (writing to local
  // state only â€” the existing "Cancel changes / Save" bar below persists
  // everything together); VAT amount/Package total are derived, read-only.
  const renderTotalsPanel = () => {
    if (activeRows.length === 0) return null;
    const rowStyle = (withBorder = true) => ({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
      padding: '10px 0',
      borderBottom: withBorder ? `1px dashed ${C.border}` : 'none',
    });
    const labelStyle = { fontSize: 13.5, color: C.textSub };
    const totalLabelStyle = { fontSize: 15, fontWeight: 700, color: C.text };
    const valueStyle = (color = C.text) => ({ fontSize: 14, fontWeight: 600, color, fontFamily: token.fontFamilyCode });
    const totalValueStyle = (color) => ({ fontSize: 18, fontWeight: 700, color, fontFamily: token.fontFamilyCode });

    return React.createElement('div', {
      style: { ...DS.card, marginTop: 16, padding: '0 20px', maxWidth: 480, marginLeft: 'auto' },
    },
      isPackageMode
        ? [
          React.createElement('div', { key: 'subtotal', style: rowStyle(true) },
            React.createElement(Text, { style: labelStyle }, 'Package subtotal (excl. VAT):'),
            React.createElement(MoneyDraftInput, { value: packageSubTotal, disabled: isLocked, onChange: updatePackageField(setPackageSubTotal), style: { width: 170 }, placeholder: '0', currency: vndCurrency })
          ),
          React.createElement('div', { key: 'vatrate', style: rowStyle(true) },
            React.createElement(Text, { style: labelStyle }, 'VAT rate:'),
            React.createElement(InputNumber, {
              value: packageVatRate, min: 0, max: 100, step: 0.1, disabled: isLocked,
              onChange: updatePackageField(setPackageVatRate),
              style: { width: 90, textAlign: 'right', fontWeight: 600 },
              formatter: (v) => `${v}%`, parser: (v) => String(v || '').replace('%', ''),
            })
          ),
          React.createElement('div', { key: 'vatamount', style: rowStyle(true) },
            React.createElement(Text, { style: labelStyle }, 'Package VAT amount:'),
            React.createElement(Text, { style: valueStyle(token.colorWarning) }, formatMoney(packageTotals.vatAmount, vndCurrency))
          ),
          React.createElement('div', { key: 'total', style: rowStyle(false) },
            React.createElement(Text, { style: totalLabelStyle }, 'Package total:'),
            React.createElement(Text, { style: totalValueStyle(token.colorSuccess) }, formatMoney(packageTotals.totalAmount, vndCurrency))
          ),
        ]
        : [
          React.createElement('div', { key: 'subtotal', style: rowStyle(true) },
            React.createElement(Text, { style: labelStyle }, 'Subtotal (excl. VAT):'),
            React.createElement(Text, { style: valueStyle() }, formatMoney(lineTotalsVnd.subTotal, vndCurrency))
          ),
          React.createElement('div', { key: 'vat', style: rowStyle(true) },
            React.createElement(Text, { style: labelStyle }, 'Total VAT:'),
            React.createElement(Text, { style: valueStyle(token.colorWarning) }, formatMoney(lineTotalsVnd.vatAmount, vndCurrency))
          ),
          React.createElement('div', { key: 'total', style: rowStyle(false) },
            React.createElement(Text, { style: totalLabelStyle }, 'Total:'),
            React.createElement(Text, { style: totalValueStyle(token.colorSuccess) }, formatMoney(lineTotalsVnd.totalAmount, vndCurrency))
          ),
        ]
    );
  };

  return React.createElement(Card, {
    size: 'small',
    title: React.createElement(Space, { size: 8, wrap: true },
      React.createElement(Text, { strong: true }, 'Contract services'),
      React.createElement(Text, { type: 'secondary' }, `${activeRows.length} services`),
      isLocked
        ? React.createElement(Tag, null, 'Locked')
        : dirty && React.createElement(Tag, { color: 'warning' }, 'Unsaved')
    ),
    extra: React.createElement(Space, { size: 8, wrap: true },
      React.createElement(Button, {
        size: 'small',
        onClick: () => setCompareModal({ open: true, data: null }),
        disabled: activeRows.length === 0,
      }, 'Review Changes'),
      !isLocked && React.createElement(Button, {
        size: 'small',
        type: 'primary',
        onClick: () => addRow(),
      }, 'New service'),
      !isLocked && React.createElement(Button, {
        size: 'small',
        onClick: openComboModal,
      }, 'Apply Package'),
      React.createElement(Button, {
        size: 'small',
        onClick: reload,
        loading,
      }, 'Refresh')
    ),
    bodyStyle: { padding: 0 },
    style: { width: '100%' },
  },

    // Table
    React.createElement(Table, {
      dataSource: groupedActiveRows,
      columns: columnsWithComboHeader,
      rowKey: 'id',
      pagination: false,
      size: 'small',
      bordered: true,
      scroll: { x: 'max-content' },
      locale: {
        emptyText: isLocked ? 'No services' : 'No services - click New service',
      },
    }),

    renderTotalsPanel(),

    (dirty && !isLocked) && React.createElement('div', { style: { ...ui.section, display: 'flex', justifyContent: 'flex-end' } },
      React.createElement(Space, { size: 8 },
        React.createElement(Button, { onClick: reload }, 'Cancel changes'),
        React.createElement(Button, {
          type: 'primary',
          loading: saving,
          onClick: saving ? undefined : handleSave,
        }, 'Save & Update contract')
      )
    ),

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
          style: DS.primaryButton
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
            React.createElement('span', { style: { fontSize: 18, fontWeight: 700, color: C.text, fontFamily: FONT } }, 'Select Service'),
            React.createElement('span', {
              onClick: () => setShowSvcModal(false),
              style: { cursor: 'pointer', color: C.textSub, fontSize: 15, fontFamily: FONT, fontWeight: 500 }
            }, 'Close')
          ),
          // Search Bar & Create New Button
          React.createElement('div', { style: { display: 'flex', gap: 10, marginBottom: 16 } },
            React.createElement(Input, {
              placeholder: 'Search service name...',
              value: svcSearch,
              onChange: e => setSvcSearch(e.target.value),
              style: { flex: 1, borderRadius: DS.radius.sm, height: 38 }
            }),
            React.createElement(Button, {
              type: 'primary',
              onClick: () => setModalView('create'),
              style: { background: C.success, borderColor: C.success, height: 38, borderRadius: DS.radius.sm, fontWeight: 600 }
            }, 'Create new')
          ),
          // Services Table List
          React.createElement('div', { style: { maxHeight: 380, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: DS.radius.md, marginBottom: 16 } },
            React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontFamily: FONT } },
              React.createElement('thead', null,
                React.createElement('tr', null,
                  React.createElement('th', { style: th({ width: 40, textAlign: 'center' }) }, '#'),
                  React.createElement('th', { style: th({ textAlign: 'left' }) }, 'Service Name'),
                  React.createElement('th', { style: th({ width: 150, textAlign: 'left' }) }, 'Type'),
                  React.createElement('th', { style: th({ width: 140, textAlign: 'right' }) }, 'Unit Price'),
                  React.createElement('th', { style: th({ width: 90, textAlign: 'center' }) }, ''))),
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
                    const catalogCurrency = currencyFromRecord(o, currencies, contractCurrency);
                    return React.createElement('tr', { key: o.id, style: { borderBottom: `1px solid ${C.border}` } },
                      React.createElement('td', { style: td({ textAlign: 'center', color: C.textSub }) }, idx + 1),
                      React.createElement('td', { style: td({ textAlign: 'left' }) },
                        React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
                          React.createElement('span', { style: { fontWeight: 600, color: C.text, fontSize: 14 } }, o.serviceName),
                          o.description && React.createElement('span', { style: { fontSize: 12, color: C.muted, marginTop: 2, wordBreak: 'break-word' } }, o.description)
                        )
                      ),
                      React.createElement('td', { style: td({ textAlign: 'left' }) },
                        o.serviceType && React.createElement(Tag, { color: 'blue', style: { fontSize: 11 } }, o.serviceType)
                      ),
                      React.createElement('td', { style: td({ textAlign: 'right', fontWeight: 500 }) }, formatMoney(price, catalogCurrency)),
                      React.createElement('td', { style: td({ textAlign: 'center' }) },
                        React.createElement(Button, {
                          size: 'small',
                          type: 'primary',
                          disabled: isDisabled,
                          onClick: () => handleSelectCatalogService(o),
                          style: { background: isDisabled ? C.border : C.primary, borderColor: isDisabled ? C.border : C.primary, borderRadius: DS.radius.xs, fontSize: 12, fontWeight: 600 }
                        }, isUsedElsewhere ? 'Selected' : isInCase ? 'In Case' : 'Select')
                      )
                    );
                  })
              )
            )
          ),
          // Footer Close Button
          React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, paddingTop: 14 } },
            React.createElement(Button, {
              onClick: () => setShowSvcModal(false),
              style: { ...DS.secondaryButton, width: 100 }
            }, 'Close')
          )
        )
        : React.createElement('div', null,
          // Header
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } },
            React.createElement('span', {
              onClick: () => setModalView('select'),
              style: { cursor: 'pointer', color: C.info, fontSize: 14, fontFamily: FONT, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }
            }, '← Back'),
            React.createElement('span', { style: { fontSize: 18, fontWeight: 700, color: C.text, fontFamily: FONT } }, 'Create New Service'),
            React.createElement('span', {
              onClick: () => setShowSvcModal(false),
              style: { cursor: 'pointer', color: C.textSub, fontSize: 15, fontFamily: FONT, fontWeight: 500 }
            }, 'Close')
          ),
          // Form body
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24, fontFamily: FONT } },
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, 'Service Name *'),
              React.createElement(Input, {
                placeholder: 'e.g., Labor contract consulting...',
                value: newSvcName,
                onChange: e => setNewSvcName(e.target.value),
                style: { borderRadius: DS.radius.sm, height: 38 }
              })
            ),
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, 'Service Type optional'),
              React.createElement(Input, {
                placeholder: 'e.g., Consulting, Legal...',
                value: newSvcType,
                onChange: e => setNewSvcType(e.target.value),
                style: { borderRadius: DS.radius.sm, height: 38 }
              })
            ),
            React.createElement('div', { style: { display: 'flex', gap: 12 } },
              React.createElement('div', { style: { width: 130, flexShrink: 0 } },
                React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, 'Currency'),
                React.createElement(Select, {
                  value: newSvcCurrencyId || undefined,
                  onChange: setNewSvcCurrencyId,
                  disabled: !currencies.length,
                  style: { width: '100%' },
                  options: currencyOptions,
                })
              ),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, `Unit Price (${getCurrencyCode(newServiceCurrency)}) *`),
                React.createElement(MoneyDraftInput, {
                  value: newUnitPrice,
                  onChange: setNewUnitPrice,
                  style: { width: '100%', borderRadius: DS.radius.sm, height: 38 },
                  placeholder: '0',
                  currency: newServiceCurrency,
                })
              ),
            ),
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, 'Description optional'),
              React.createElement(Input.TextArea, {
                placeholder: 'Scope of work, notes...',
                value: newDescription,
                onChange: e => setNewDescription(e.target.value),
                autoSize: { minRows: 3, maxRows: 6 },
                style: { borderRadius: DS.radius.sm }
              })
            )
          ),
          // Footer
          React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 14 } },
            React.createElement(Button, {
              onClick: () => setModalView('select'),
              style: { ...DS.secondaryButton, width: 100 }
            }, 'Cancel'),
            React.createElement(Button, {
              type: 'primary',
              onClick: handleCreateCustomService,
              style: { ...DS.primaryButton, width: 140 }
            }, 'Save & Select')
          )
        )
    ),

    // APPLY COMBO MODAL
    React.createElement(Modal, {
      title: 'Apply Package',
      open: showComboModal,
      onCancel: () => setShowComboModal(false),
      footer: null,
      width: 700,
    },
      React.createElement(Segmented, {
        value: comboSubTab,
        onChange: (v) => setComboSubTab(v),
        options: [
          { label: 'Select Package', value: 'select' },
          { label: 'New Package', value: 'adhoc' },
        ],
        style: { marginBottom: 16 },
      }),
      comboSubTab === 'select'
        ? React.createElement(React.Fragment, null,
          React.createElement(Input, {
            placeholder: 'Search package name...',
            value: comboSearch,
            onChange: (e) => setComboSearch(e.target.value),
            style: { marginBottom: 12, borderRadius: DS.radius.sm },
            allowClear: true,
          }),
          React.createElement('div', { style: { maxHeight: 380, overflowY: 'auto' } },
            comboCatalog.length === 0
              ? React.createElement(Empty, { description: 'No packages available' })
              : comboCatalog
                .filter((c) => normalizeLookupText(c.comboName || '').includes(normalizeLookupText(comboSearch)))
                .map((c) => React.createElement('div', {
                  key: c.id,
                  style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: DS.radius.sm, marginBottom: 8,
                  },
                },
                  React.createElement('div', null,
                    React.createElement('div', { style: { fontWeight: 600 } }, c.comboName || `Package #${c.id}`),
                    React.createElement('div', { style: { fontSize: 12, color: C.textSub } },
                      `${(c.serviceComboItems || []).length} service(s) · ${formatMoney(c.packageSubTotal, currencyFromRecord(c, currencies, vndCurrency))}`)
                  ),
                  React.createElement(Button, {
                    size: 'small', type: 'primary', loading: applyingCombo,
                    onClick: () => applyComboFromCatalog(c),
                  }, 'Apply')
                ))
          )
        )
        : React.createElement(React.Fragment, null,
          React.createElement('div', { style: { marginBottom: 12 } },
            React.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Package Name'),
            React.createElement(Input, {
              value: adhocComboName,
              onChange: (e) => setAdhocComboName(e.target.value),
              placeholder: 'E.g. Business incorporation consulting package...',
              style: { borderRadius: DS.radius.sm },
            })
          ),
          React.createElement('div', { style: { marginBottom: 16 } },
            React.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Services in this package'),
            React.createElement(Select, {
              mode: 'multiple',
              value: adhocServiceIds,
              onChange: (v) => setAdhocServiceIds(v),
              showSearch: true,
              optionFilterProp: 'children',
              style: { width: '100%' },
              placeholder: 'Select services to bundle...',
            }, svcOpts.map((s) => React.createElement(Select.Option, {
              key: s.id, value: s.id,
            }, s.serviceName || s.name || `Service #${s.id}`)))
          ),
          React.createElement(Button, {
            type: 'primary', onClick: applyAdhocCombo, style: DS.primaryButton,
          }, 'Submit')
        )
    )
  );
};

ctx.render(React.createElement(ContractServicesBlock, null));
