const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const { Spin, Typography, message, Modal, Table, Tag, Button, Tooltip, Card, Space, Segmented, theme } = ctx.antd;
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

const QUOTATION_ID = ctx.record?.id;
const QUOTATION_STATUS = ctx.record?.status; // e.g. 'draft', 'sent', 'order'
const PRICING_MODE_LINE = 'line';
const PRICING_MODE_PACKAGE = 'package';
const BILLING_LINE = 'lineBillable';
const BILLING_PACKAGE_INCLUDED = 'packageIncluded';
const SOURCE_QUOTATION = 'quotation';
const SOURCE_CONTRACT = 'contract';
// PROJECT_ID được fetch động trong handleSave vì ctx.record.projects chưa eager-load

const parseNum = v => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
const extractId = val => {
  const id = val && typeof val === 'object' ? val.id : val;
  return id ? parseInt(id) : null;
};
const fmtPrice = n => { const num = parseNum(n); return num === 0 ? '' : num.toLocaleString('vi-VN'); };

// ==================== MULTI-CURRENCY HELPERS (mirrors CaseCreateForm.js) ====================
const DEFAULT_CURRENCY_CODE = "VND";
const CURRENCY_RESOURCE_CANDIDATES = ["currencies:list", "currency:list", "Currency:list"];
const EXCHANGE_RATE_RESOURCE_CANDIDATES = ["exchangeRates:list", "exchangeRate:list", "ExchangeRates:list"];
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
const getExchangeRateCurrencyId = (rate, side) => extractCurrencyId(rate?.[`${side}CurrencyId`] || rate?.[`${side}Currency`]);
const getExchangeRateCurrencyCode = (rate, side) => extractCurrencyCode(rate?.[`${side}Currency`] || rate?.[`${side}CurrencyCode`]);
const isUsableExchangeRateStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return true;
  return !["inactive", "disabled", "archived", "cancelled", "canceled", "draft"].includes(value);
};
const exchangeRateMatchesCurrency = (rate, side, currency) => {
  const rateCurrencyId = getExchangeRateCurrencyId(rate, side);
  const currencyId = extractCurrencyId(currency);
  if (rateCurrencyId && currencyId) return rateCurrencyId === currencyId;
  const rateCurrencyCode = getExchangeRateCurrencyCode(rate, side);
  const currencyCode = extractCurrencyCode(currency);
  return !!rateCurrencyCode && !!currencyCode && rateCurrencyCode === currencyCode;
};
const pickExchangeRate = (rates = [], fromCurrency, toCurrency, pricingDate) => {
  const cutoff = parseDateMillis(pricingDate) || Date.now();
  return (rates || [])
    .map((rate) => {
      const effectiveMs = parseDateMillis(rate?.effectiveDate);
      return { record: rate, rate: parseNum(rate?.rate), effectiveMs: effectiveMs || 0 };
    })
    .filter((item) =>
      item.rate > 0 &&
      isUsableExchangeRateStatus(item.record?.status) &&
      (!item.effectiveMs || item.effectiveMs <= cutoff) &&
      exchangeRateMatchesCurrency(item.record, "from", fromCurrency) &&
      exchangeRateMatchesCurrency(item.record, "to", toCurrency),
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
  const pageSize = Math.max(100, fromIds.length * 5);
  const filterProfiles = [
    { fromCurrencyId: { $in: fromIds }, toCurrencyId: { $eq: toId } },
    { fromCurrency: { id: { $in: fromIds } }, toCurrency: { id: { $eq: toId } } },
    { fromCurrencyId: { $eq: toId }, toCurrencyId: { $in: fromIds } },
    { fromCurrency: { id: { $eq: toId } }, toCurrency: { id: { $in: fromIds } } },
  ];
  for (const url of EXCHANGE_RATE_RESOURCE_CANDIDATES) {
    const collected = [];
    for (const filter of filterProfiles) {
      try {
        const r = await ctx.api.request({
          url,
          params: {
            pageSize, page: 1,
            appends: ["fromCurrency", "toCurrency"],
            sort: ["-effectiveDate", "-createdAt"],
            filter: JSON.stringify(filter),
          },
        });
        const rows = r?.data?.data || [];
        rows.forEach((row) => {
          if (!collected.some((item) => String(item.id) === String(row.id))) collected.push(row);
        });
      } catch { }
    }
    if (collected.length) return collected;
  }
  return [];
}
const buildConvertedTotals = ({ groups = [], targetCurrency = null, exchangeRates = [], pricingDate } = {}) => {
  const target = targetCurrency || defaultCurrencyObject();
  const missing = [];
  const breakdown = (groups || []).map((group) => {
    const matched = isSameCurrency(group.currency, target)
      ? { rate: 1, direction: "same" }
      : pickConversionRate(exchangeRates, group.currency, target, pricingDate);
    if (!matched?.rate) {
      missing.push(group);
      return {
        ...group,
        rate: null,
        canConvert: false,
        convertedSubTotal: 0,
        convertedVatAmount: 0,
        convertedTotalAmount: 0,
      };
    }
    return {
      ...group,
      rate: matched.rate,
      canConvert: true,
      convertedSubTotal: roundMoneyForCurrency(group.subTotal * matched.rate, target),
      convertedVatAmount: roundMoneyForCurrency(group.vatAmount * matched.rate, target),
      convertedTotalAmount: roundMoneyForCurrency(group.totalAmount * matched.rate, target),
    };
  });
  const converted = breakdown.reduce(
    (sum, group) => group.canConvert
      ? {
        subTotal: roundMoneyForCurrency(sum.subTotal + group.convertedSubTotal, target),
        vatAmount: roundMoneyForCurrency(sum.vatAmount + group.convertedVatAmount, target),
        totalAmount: roundMoneyForCurrency(sum.totalAmount + group.convertedTotalAmount, target),
      }
      : sum,
    { subTotal: 0, vatAmount: 0, totalAmount: 0 },
  );
  return {
    breakdown,
    missing,
    converted: {
      ...converted,
      currency: target,
      canConvert: missing.length === 0,
    },
  };
};

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
      vatAmount = (subTotal * packageVatRate) / 100;
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
        // Group lines by their own currency, then convert non-base groups into
        // the contract's currency before summing (rows can carry a different
        // currencyId than the contract when copied from a multi-currency service).
        const currs = await fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES);
        const contractCurrency = currencyFromRecord(contract, currs);
        const contractCurrencyId = extractCurrencyId(contractCurrency);
        const byCurrency = {};
        lines.forEach((line) => {
          const amount = getContractLineAmounts(line);
          const lineCurrency = currencyFromRecord(line, currs, contractCurrency);
          const key = extractCurrencyId(lineCurrency) || getCurrencyCode(lineCurrency);
          if (!byCurrency[key]) byCurrency[key] = { currency: lineCurrency, subTotal: 0, vatAmount: 0, totalAmount: 0 };
          byCurrency[key].subTotal += amount.subTotal;
          byCurrency[key].vatAmount += amount.vatAmount;
          byCurrency[key].totalAmount += amount.totalAmount;
        });
        const groups = Object.values(byCurrency);
        const nonBaseGroups = groups.filter((g) => !isSameCurrency(g.currency, contractCurrency));
        const exchangeRates = nonBaseGroups.length
          ? await fetchExchangeRatesForConversion(
            nonBaseGroups.map((g) => extractCurrencyId(g.currency)).filter(Boolean),
            contractCurrencyId,
          )
          : [];
        let canConvert = true;
        for (const group of groups) {
          if (isSameCurrency(group.currency, contractCurrency)) {
            subTotal += group.subTotal;
            vatAmount += group.vatAmount;
            totalAmount += group.totalAmount;
            continue;
          }
          const matched = pickConversionRate(exchangeRates, group.currency, contractCurrency, contract?.signedAt || contract?.date);
          if (!matched?.rate) {
            canConvert = false;
            console.warn(`[syncContractHeaderFromServices] Missing exchange rate ${getCurrencyCode(group.currency)} -> ${getCurrencyCode(contractCurrency)}; skipping totals sync`);
            break;
          }
          subTotal += group.subTotal * matched.rate;
          vatAmount += group.vatAmount * matched.rate;
          totalAmount += group.totalAmount * matched.rate;
        }
        if (!canConvert) {
          await ctx.api.request({
            url: "contracts:update",
            method: "POST",
            params: { filterByTk: safeContractId },
            data: {
              ...(extractId(contract.customerId) ? { customerId: extractId(contract.customerId) } : {}),
              ...(extractId(contract.internalCompanyId) ? { internalCompanyId: extractId(contract.internalCompanyId) } : {}),
            },
          });
          return;
        }
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

const buildServicePricingPayload = ({ pricingMode, basePrice, quantity = 1, vat, packageSubTotal, packageVatRate, currency = null, packageCurrency = null }) => {
  if (isPackagePricing(pricingMode)) {
    const totals = calcPackageTotals(packageSubTotal, packageVatRate, packageCurrency || currency);
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
  const line = calcLine(basePrice, qty, vat, currency);
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
      params: {
        pageSize: 100, page: 1,
        filter: JSON.stringify({ quotationId: { $eq: parseInt(QUOTATION_ID) } }),
        appends: ['currency'],
      },
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

  return React.createElement("div", {
    style: {
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
    title: disabled ? "Báo giá đã khoá" : "Click để chỉnh sửa"
  }, displayVal || React.createElement("span", { style: { color: C.muted, fontStyle: "italic" } }, "—"));
};

// ==================== MAIN BLOCK ====================
const QuotationServicesBlock = () => {
  const token = useNocoToken();
  const [rows, setRows] = useState([]);
  const lineModeBackupRef = useRef({});
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
  const [newSvcCurrencyId, setNewSvcCurrencyId] = useState('');
  const ui = useMemo(() => createNocoStyles(token), [token]);

  // ── Multi-currency state ──
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const quotationCurrency = useMemo(
    () => currencyFromRecord(quotation, currencies),
    [quotation, currencies],
  );
  const getRowCurrency = useCallback(
    (row) => currencyFromRecord(row, currencies, quotationCurrency),
    [currencies, quotationCurrency],
  );
  // Per-row currency picker (merged into the Subtotal column) — code only,
  // no "CODE - Name" label, since the column is compact.
  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: String(c.id), label: getCurrencyCode(c) })),
    [currencies],
  );
  const newServiceCurrency = useMemo(
    () => resolveCurrency(newSvcCurrencyId, currencies) || quotationCurrency,
    [newSvcCurrencyId, currencies, quotationCurrency],
  );
  // Display currency: lets the user view converted totals in any loaded
  // currency, independent of the quotation's own base currency (mirrors
  // CaseServices.js's displayCurrencyId/currencyOptions pattern).
  const [displayCurrencyId, setDisplayCurrencyId] = useState(null);
  const displayCurrency = useMemo(
    () => resolveCurrency(displayCurrencyId, currencies) || quotationCurrency,
    [displayCurrencyId, currencies, quotationCurrency],
  );
  const selectedDisplayCurrencyValue = getCurrencySelectValue(displayCurrency);
  const displayCurrencyOptions = useMemo(() => {
    const options = currencies.map((currency) => ({
      value: getCurrencySelectValue(currency),
      label: currencySelectLabel(currency),
    }));
    if (selectedDisplayCurrencyValue && !options.some((option) => option.value === selectedDisplayCurrencyValue)) {
      options.unshift({ value: selectedDisplayCurrencyValue, label: currencySelectLabel(displayCurrency) });
    }
    return options;
  }, [currencies, displayCurrency, selectedDisplayCurrencyValue]);

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
      (row && row._currencyId) || getCurrencySelectValue(quotationCurrency),
    );
    setShowSvcModal(true);
  };

  const handleSelectCatalogService = (svc) => {
    setRows(prev => prev.map(r => {
      if (r.id !== activeRowId) return r;
      const price = svc.basePrice ?? svc.unitPrice ?? svc.price ?? 0;
      const vat = svc.vat ?? svc.vatRate ?? 0;
      const svcCurrencyId = getRecordCurrencyId(svc);
      const nextCurrencyId = svcCurrencyId || extractCurrencyId(r._currencyId) || extractCurrencyId(quotationCurrency);
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
    const nextCurrencyId = extractCurrencyId(newSvcCurrencyId) || extractCurrencyId(quotationCurrency);
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
        currencyId: nextCurrencyId || null,
        _currencyId: nextCurrencyId ? String(nextCurrencyId) : '',
        _isCustom: true,
      };
    }));
    setDirty(true);
    setShowSvcModal(false);
  };

  const reload = useCallback(async () => {
    if (!QUOTATION_ID) { setLoading(false); return; }
    setLoading(true);
    const [svcs, opts, quote, currs] = await Promise.all([
      fetchQSvcs(),
      fetchSvcOptions(),
      fetchQuotation(),
      fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
    ]);
    const svcMap = {};
    opts.forEach(o => { svcMap[o.id] = o; });
    const packageLine = svcs.find((item) => !isDeletedServiceLine(item) && (isPackagePricing(item) || parseNum(item?.packageSubTotal) || parseNum(item?.packageTotalAmount)));
    const packageSource = packageLine || quote || {};
    setQuotation(quote);
    setCurrencies(currs);
    const resolvedQuotationCurrencyId = extractCurrencyId(currencyFromRecord(quote, currs));
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
    setRows(svcs.map(s => {
      const rowCurrencyId = getRecordCurrencyId(s) || resolvedQuotationCurrencyId;
      return {
        ...s,
        _basePrice: s.basePrice || 0,
        _quantity: s.quantity || 1,
        _vat: s.vat || 0,
        _svcName: svcMap[s.serviceId]?.serviceName || s.serviceName || '',
        _serviceType: s.serviceType || svcMap[s.serviceId]?.serviceType || s.serviceType || '',
        _description: s.description || svcMap[s.serviceId]?.description || s.description || '',
        currencyId: rowCurrencyId || null,
        _currencyId: rowCurrencyId ? String(rowCurrencyId) : '',
        _isNew: false,
        _deleted: false,
        _isCustom: !s.serviceId,
      };
    }));

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

  const activeRows = useMemo(() => rows.filter(r => !r._deleted && !isDeletedServiceLine(r)), [rows]);

  // Set serviceId đang được dùng — để disable trong select của các dòng khác
  const usedServiceIds = useMemo(
    () => new Set(rows.map(r => r.serviceId).filter(Boolean)),
    [rows]
  );

  const isPackageMode = pricingMode === PRICING_MODE_PACKAGE;

  const lineTotalsByCurrency = useMemo(() => {
    if (isPackageMode) return [];
    const byCurrency = {};
    activeRows.forEach((r) => {
      const rowCurrency = getRowCurrency(r);
      const c = calcLine(r._basePrice, 1, r._vat, rowCurrency);
      const key = extractCurrencyId(rowCurrency) || getCurrencyCode(rowCurrency);
      if (!byCurrency[key]) byCurrency[key] = { currency: rowCurrency, subTotal: 0, vatAmount: 0, totalAmount: 0 };
      byCurrency[key].subTotal += c.subTotal;
      byCurrency[key].vatAmount += c.vatAmount;
      byCurrency[key].totalAmount += c.totalAmount;
    });
    return Object.values(byCurrency);
  }, [activeRows, isPackageMode, getRowCurrency]);
  const hasMixedLineCurrencies = !isPackageMode && lineTotalsByCurrency.length > 1;

  const packageTotals = useMemo(
    () => calcPackageTotals(packageSubTotal, packageVatRate, quotationCurrency),
    [packageSubTotal, packageVatRate, quotationCurrency],
  );
  const lineTotals = lineTotalsByCurrency[0] || { subTotal: 0, vatAmount: 0, totalAmount: 0 };
  const totals = isPackageMode ? packageTotals : lineTotals;
  const totalsCurrency = isPackageMode ? quotationCurrency : (lineTotalsByCurrency[0]?.currency || quotationCurrency);

  // Summary groups feeding the display-currency conversion: package mode
  // collapses to a single group (its own totals, in quotationCurrency);
  // line mode reuses the per-currency line groups.
  const summarySourceGroups = useMemo(() => {
    if (isPackageMode) {
      return [{
        currency: quotationCurrency,
        subTotal: packageTotals.subTotal,
        vatAmount: packageTotals.vatAmount,
        totalAmount: packageTotals.totalAmount,
        lineCount: activeRows.length || (packageTotals.subTotal ? 1 : 0),
      }];
    }
    return lineTotalsByCurrency;
  }, [isPackageMode, quotationCurrency, packageTotals, lineTotalsByCurrency, activeRows.length]);

  const targetCurrencyId = extractCurrencyId(displayCurrency);
  const targetCurrencyCode = getCurrencyCode(displayCurrency);
  const exchangeSourceCurrencyIds = useMemo(
    () => summarySourceGroups
      .filter((group) => !isSameCurrency(group.currency, displayCurrency))
      .map((group) => extractCurrencyId(group.currency))
      .filter(Boolean),
    [summarySourceGroups, displayCurrency],
  );
  const exchangeSourceCurrencyKey = useMemo(
    () => exchangeSourceCurrencyIds.slice().sort((a, b) => a - b).join(','),
    [exchangeSourceCurrencyIds],
  );
  useEffect(() => {
    let alive = true;
    if (!targetCurrencyId || !exchangeSourceCurrencyIds.length) {
      setExchangeRates([]);
      setExchangeRatesLoading(false);
      return () => { alive = false; };
    }
    setExchangeRatesLoading(true);
    fetchExchangeRatesForConversion(exchangeSourceCurrencyIds, targetCurrencyId)
      .then((rows) => { if (alive) setExchangeRates(rows || []); })
      .catch(() => { if (alive) setExchangeRates([]); })
      .finally(() => { if (alive) setExchangeRatesLoading(false); });
    return () => { alive = false; };
  }, [targetCurrencyId, exchangeSourceCurrencyKey]);

  const convertedTotals = useMemo(() => buildConvertedTotals({
    groups: summarySourceGroups,
    targetCurrency: displayCurrency,
    exchangeRates,
    pricingDate: quotation?.date,
  }), [summarySourceGroups, displayCurrency, exchangeRates, quotation]);
  const exchangeBreakdown = convertedTotals.breakdown;
  const convertedSummary = convertedTotals.converted.canConvert
    ? convertedTotals.converted
    : { canConvert: false, missing: convertedTotals.missing };

  // Base-currency (quotationCurrency) conversion — kept independent of the
  // user-selectable displayCurrency above. This is the ONLY conversion that
  // may ever be persisted into quotations.subTotal/vatAmount/totalAmount (or
  // cascaded into a linked project/sub-contract): those fields are defined
  // to be in quotationCurrency regardless of what the user currently has the
  // "Display currency" dropdown set to, so handleSave must never use
  // convertedSummary (which tracks displayCurrency) for the save payload.
  const baseCurrencyId = extractCurrencyId(quotationCurrency);
  const baseExchangeSourceCurrencyIds = useMemo(
    () => summarySourceGroups
      .filter((group) => !isSameCurrency(group.currency, quotationCurrency))
      .map((group) => extractCurrencyId(group.currency))
      .filter(Boolean),
    [summarySourceGroups, quotationCurrency],
  );
  const baseExchangeSourceCurrencyKey = useMemo(
    () => baseExchangeSourceCurrencyIds.slice().sort((a, b) => a - b).join(','),
    [baseExchangeSourceCurrencyIds],
  );
  const [baseExchangeRates, setBaseExchangeRates] = useState([]);
  useEffect(() => {
    let alive = true;
    if (!baseCurrencyId || !baseExchangeSourceCurrencyIds.length) {
      setBaseExchangeRates([]);
      return () => { alive = false; };
    }
    fetchExchangeRatesForConversion(baseExchangeSourceCurrencyIds, baseCurrencyId)
      .then((rows) => { if (alive) setBaseExchangeRates(rows || []); })
      .catch(() => { if (alive) setBaseExchangeRates([]); });
    return () => { alive = false; };
  }, [baseCurrencyId, baseExchangeSourceCurrencyKey]);
  const baseConvertedTotals = useMemo(() => buildConvertedTotals({
    groups: summarySourceGroups,
    targetCurrency: quotationCurrency,
    exchangeRates: baseExchangeRates,
    pricingDate: quotation?.date,
  }), [summarySourceGroups, quotationCurrency, baseExchangeRates, quotation]);
  const baseConvertedSummary = baseConvertedTotals.converted.canConvert
    ? baseConvertedTotals.converted
    : { canConvert: false, missing: baseConvertedTotals.missing };

  const handlePricingModeChange = (mode) => {
    const nextMode = mode === PRICING_MODE_PACKAGE ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE;
    if (nextMode === pricingMode) return;
    if (nextMode === PRICING_MODE_PACKAGE) {
      setPackageSubTotal((prev) => prev || lineTotals.subTotal || parseNum(quotation?.subTotal));
      setPackageVatRate((prev) => prev || inferVatRate(lineTotals.subTotal || quotation?.subTotal, lineTotals.vatAmount || quotation?.vatAmount, 0));
      setRows(prev => {
        const backup = {};
        prev.forEach(r => { backup[r.id] = { _basePrice: r._basePrice, _vat: r._vat }; });
        lineModeBackupRef.current = backup;
        return prev.map(r => ({ ...r, _basePrice: 0, _vat: 0 }));
      });
    } else {
      setRows(prev => prev.map(r => {
        const backup = lineModeBackupRef.current[r.id];
        return backup ? { ...r, _basePrice: backup._basePrice, _vat: backup._vat } : r;
      }));
    }
    setPricingMode(nextMode);
    setDirty(true);
  };

  const updatePackageField = (setter) => (value) => {
    setter(value || 0);
    setDirty(true);
  };
  const updatePackageVatAmount = (value) => {
    setPackageVatRate(inferVatRate(packageSubTotal, parseNum(value), 0));
    setDirty(true);
  };
  const updatePackageTotalAmount = (value) => {
    const nextVatAmount = Math.max(parseNum(value) - parseNum(packageSubTotal), 0);
    setPackageVatRate(inferVatRate(packageSubTotal, nextVatAmount, 0));
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

  // ── Lock guard: block all edits when quotation is confirmed ──
  const isLocked = QUOTATION_STATUS === 'order';

  const compareFields = [
    { key: "serviceName", label: "Tên dịch vụ", type: "text" },
    { key: "serviceType", label: "Loại dịch vụ", type: "text" },
    { key: "description", label: "Mô tả", type: "text" },
    { key: "basePrice", label: "Đơn giá", type: "money" },
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
    // whatever currency this quotation line currently uses — don't reuse
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
            title: showCurrencyHint ? `Dịch vụ trong Báo giá · ${getCurrencyCode(recordCurrency)}` : "Dịch vụ trong Báo giá",
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
    const defaultCurrencyId = extractCurrencyId(quotationCurrency);
    setRows(prev => [...prev, {
      id: newId, serviceId: null,
      _basePrice: 0, _quantity: 1, _vat: isPackageMode ? 0 : 10,
      _svcName: '', _serviceType: '', _description: '', _isNew: true, _deleted: false,
      currencyId: defaultCurrencyId || null,
      _currencyId: defaultCurrencyId ? String(defaultCurrencyId) : '',
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
            params: {
              filter: JSON.stringify({ projectId: { $eq: parseInt(PROJECT_ID) } }),
              pageSize: 500,
              appends: ['quotationServices', 'contractServices'],
            }
          });
          existingPS = psAllRes?.data?.data || [];
        } catch (e) { message.warning('Không thể tải danh sách projectServices: ' + (e?.message || '')); }
      } else {
        console.warn('[QS→PS] PROJECT_ID vẫn null sau khi fetch — cascade bị bỏ qua!');
      }

      // Fetch bản gốc quotationServices từ DB để lấy originalServiceId khi user đổi dịch vụ
      let originalQSvcs = [];
      try {
        const origRes = await ctx.api.request({
          url: 'quotationServices:list',
          params: { pageSize: 200, filter: JSON.stringify({ quotationId: { $eq: parseInt(QUOTATION_ID) } }) }
        });
        originalQSvcs = origRes?.data?.data || [];
      } catch (e) { console.warn('[QS] Không fetch được originalQSvcs:', e); }

      const savedQuotationServiceRows = [];
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
          packageCurrency: quotationCurrency,
        });
        const rowCurrencyId = extractCurrencyId(getRowCurrency(r));
        const payload = {
          serviceId: r.serviceId || null,
          ServiceId: r.serviceId || null,
          services: r.serviceId || null,
          quotationId: parseInt(QUOTATION_ID),
          serviceName: r._svcName || null,
          serviceType: r._serviceType || null,
          description: r._description || null,
          currencyId: rowCurrencyId || null,
          currency: rowCurrencyId || null,
          ...pricingPayload,
        };
        // Lấy originalServiceId từ DB (trước khi user đổi) để match PS chính xác hơn
        const originalQSvc = !r._isNew ? originalQSvcs.find(qs => String(qs.id) === String(r.id)) : null;
        const originalServiceId = originalQSvc ? (extractId(originalQSvc.serviceId) || extractId(originalQSvc.ServiceId) || extractId(originalQSvc.services)) : null;

        // Find corresponding projectService — 4-tier priority
        // Ưu tiên 1: match bằng quotationServiceId đã lưu trên projectService (chính xác nhất)
        const rowQSvcId = !r._isNew ? r.id : null;
        let matchedPS = rowQSvcId
          ? existingPS.find(ps => {
            const psQSvcId = extractId(ps.quotationServiceId) || extractId(ps.quotationServices);
            return psQSvcId && String(psQSvcId) === String(rowQSvcId);
          })
          : null;

        // Ưu tiên 2: match bằng serviceId mới + cùng quotationId (tránh nhầm quotation khác)
        if (!matchedPS && r.serviceId) {
          matchedPS = existingPS.find(ps => {
            const psId = typeof ps.serviceId === 'object' ? ps.serviceId?.id : ps.serviceId;
            const psQId = extractId(ps.quotationId) || extractId(ps.quotations);
            return psId && String(psId) === String(r.serviceId)
              && psQId && String(psQId) === String(QUOTATION_ID);
          });
        }

        // Ưu tiên 2.5: match bằng originalServiceId (serviceId CŨ trước khi user đổi)
        // Quan trọng khi user đổi từ dịch vụ 1 → dịch vụ 2, PS vẫn đang lưu serviceId cũ
        if (!matchedPS && originalServiceId && originalServiceId !== r.serviceId) {
          matchedPS = existingPS.find(ps => {
            const psId = typeof ps.serviceId === 'object' ? ps.serviceId?.id : ps.serviceId;
            return psId && String(psId) === String(originalServiceId);
          });
        }

        // Ưu tiên 3: fallback — match bằng serviceId bất kỳ hoặc tên
        if (!matchedPS) {
          matchedPS = existingPS.find(ps => {
            const psId = typeof ps.serviceId === 'object' ? ps.serviceId?.id : ps.serviceId;
            if (r.serviceId && psId) return String(psId) === String(r.serviceId);
            const psName = ps.serviceName || '';
            const rName = r._svcName || '';
            return !r.serviceId && !psId && normalizeLookupText(psName) === normalizeLookupText(rName);
          });
        }

        let linkedProjectServiceId = matchedPS?.id || null;

        if (r._deleted && !r._isNew) {
          await ctx.api.request({
            url: 'quotationServices:update',
            method: 'POST',
            params: { filterByTk: r.id },
            data: { status: 'deleted' },
          });
          // Cascade: delete corresponding projectService
          if (PROJECT_ID && matchedPS) {
            try {
              await requestProjectService({
                action: 'update',
                params: { filterByTk: matchedPS.id },
                data: { status: 'deleted' },
              });
            } catch (e) { message.warning('Khong the soft-delete projectService #' + matchedPS.id + ': ' + (e?.message || '')); }
          }
          let linkedContractServiceId = extractId(r.contractServiceId) || extractId(r.contractServices);
          if (!linkedContractServiceId && matchedPS) {
            linkedContractServiceId = extractId(matchedPS.contractServiceId) || extractId(matchedPS.contractServices);
          }
          if (!linkedContractServiceId) {
            try {
              const csRes = await ctx.api.request({
                url: 'contractServices:list',
                params: {
                  filter: JSON.stringify({ quotationServiceId: { $eq: r.id } }),
                  pageSize: 1,
                },
              });
              const csItem = csRes?.data?.data?.[0];
              if (csItem) linkedContractServiceId = csItem.id;
            } catch (e) {
              console.warn('[QS->CS] Could not list contractServices for soft-delete:', e);
            }
          }
          if (linkedContractServiceId) {
            try {
              await ctx.api.request({
                url: 'contractServices:update',
                method: 'POST',
                params: { filterByTk: linkedContractServiceId },
                data: { status: 'deleted', lineStatus: 'deleted' },
              });
              const csGetRes = await ctx.api.request({
                url: 'contractServices:get',
                params: { filterByTk: linkedContractServiceId },
              });
              const csRec = csGetRes?.data?.data || csGetRes?.data || {};
              const targetContractId = extractId(csRec.contractId) || extractId(csRec.contracts);
              if (targetContractId) {
                await syncContractHeaderFromServices(targetContractId);
              }
            } catch (e) {
              console.warn('[QS->CS] Could not soft-delete contractService #' + linkedContractServiceId + ': ' + (e?.message || ''));
            }
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
                    ServiceId: r.serviceId || null,
                    services: r.serviceId || null,
                    serviceName: r._svcName || null,
                    serviceType: r._serviceType || null,
                    description: r._description || null,
                    pricingMode: isPackageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
                    billingMode: isPackageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
                    financialSourceType: SOURCE_QUOTATION,
                    quotationServiceId: createdQSvcId || undefined,
                    quotationServices: createdQSvcId || undefined,
                    currencyId: rowCurrencyId || null,
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
                    serviceId: r.serviceId || null,
                    ServiceId: r.serviceId || null,
                    services: r.serviceId || null,
                    serviceName: r._svcName || null,
                    serviceType: r._serviceType || null,
                    description: r._description || null,
                    pricingMode: isPackageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
                    billingMode: isPackageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
                    financialSourceType: SOURCE_QUOTATION,
                    quotationServiceId: createdQSvcId || undefined,
                    quotationServices: createdQSvcId || undefined,
                    currencyId: rowCurrencyId || null,
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
                  ServiceId: r.serviceId || null,
                  services: r.serviceId || null,
                  serviceName: r._svcName || null,
                  serviceType: r._serviceType || null,
                  description: r._description || null,
                  pricingMode: isPackageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
                  billingMode: isPackageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
                  financialSourceType: SOURCE_QUOTATION,
                  quotationServiceId: r.id,
                  quotationServices: r.id,
                  currencyId: rowCurrencyId || null,
                  ...pricingPayload,
                }
              });
            } catch (e) { message.warning('Không thể update projectService #' + matchedPS.id + ': ' + (e?.message || '')); }
          }

          // Cascade: update contractService if found
          let linkedContractServiceId = extractId(r.contractServiceId) || extractId(r.contractServices);
          if (!linkedContractServiceId && matchedPS) {
            linkedContractServiceId = extractId(matchedPS.contractServiceId) || extractId(matchedPS.contractServices);
          }
          if (!linkedContractServiceId) {
            try {
              const csRes = await ctx.api.request({
                url: 'contractServices:list',
                params: {
                  filter: JSON.stringify({ quotationServiceId: { $eq: r.id } }),
                  pageSize: 1,
                }
              });
              const csItem = csRes?.data?.data?.[0];
              if (csItem) {
                linkedContractServiceId = csItem.id;
              }
            } catch (e) {
              console.warn('[QS→CS] Không thể list contractServices:', e);
            }
          }

          if (linkedContractServiceId) {
            try {
              await ctx.api.request({
                url: 'contractServices:update',
                method: 'POST',
                params: { filterByTk: linkedContractServiceId },
                data: {
                  serviceId: r.serviceId || null,
                  ServiceId: r.serviceId || null,
                  services: r.serviceId || null,
                  serviceName: r._svcName || null,
                  serviceType: r._serviceType || null,
                  description: r._description || null,
                  // Bảo tồn link quotation — không để bị ghi null
                  quotationServiceId: r.id,
                  quotationServices: r.id,
                  // Bảo tồn link projectService nếu có
                  ...(linkedProjectServiceId ? {
                    projectServiceId: linkedProjectServiceId,
                    projectServices: linkedProjectServiceId,
                  } : {}),
                  currencyId: rowCurrencyId || null,
                  currency: rowCurrencyId || null,
                  ...pricingPayload,
                }
              });
              // Sau khi update contractService, cũng update lại projectService để giữ link contract
              if (matchedPS && linkedContractServiceId) {
                try {
                  await requestProjectService({
                    action: 'update',
                    params: { filterByTk: matchedPS.id },
                    data: {
                      contractServiceId: linkedContractServiceId,
                      contractServices: linkedContractServiceId,
                      quotationServiceId: r.id,
                      quotationServices: r.id,
                    }
                  });
                } catch (psErr) {
                  console.warn('[QS→PS] Không thể update link contract trên projectService:', psErr);
                }
              }
              // We must also sync the totals for this contract!
              const csGetRes = await ctx.api.request({
                url: 'contractServices:get',
                params: { filterByTk: linkedContractServiceId },
              });
              const csRec = csGetRes?.data?.data || csGetRes?.data || {};
              const targetContractId = extractId(csRec.contractId) || extractId(csRec.contracts);
              if (targetContractId) {
                await syncContractHeaderFromServices(targetContractId);
              }
            } catch (e) {
              console.warn('[QS→CS] Không thể update contractService #' + linkedContractServiceId + ': ' + (e?.message || ''));
            }
          }

          savedQuotationServiceRows.push({ ...payload, id: r.id, projectServiceId: linkedProjectServiceId });
        }
      }

      // Step 2: Update quotation totals
      // When rows span multiple currencies, use the already-converted (into the
      // quotation's own currency) grand total rather than just the first
      // group's raw numbers — otherwise other-currency rows would silently
      // drop out of the quotation's own subTotal/vatAmount/totalAmount.
      // Must use baseConvertedSummary (targets quotationCurrency), never
      // convertedSummary (targets whatever displayCurrency the user happens
      // to have the dropdown set to) — the latter would silently persist
      // amounts in the wrong currency, and that corruption would then
      // cascade into the linked project and any auto-created sub-contract.
      const canConvertMixedTotals = !hasMixedLineCurrencies || !!baseConvertedSummary?.canConvert;
      if (hasMixedLineCurrencies && !canConvertMixedTotals) {
        message.warning('Thiếu tỷ giá quy đổi giữa các loại tiền tệ dịch vụ — tổng báo giá chưa được cập nhật.');
      }
      const effectiveTotals = isPackageMode
        ? packageTotals
        : (hasMixedLineCurrencies ? (canConvertMixedTotals ? baseConvertedSummary : null) : lineTotals);

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
          ...(effectiveTotals ? { subTotal: effectiveTotals.subTotal, vatAmount: effectiveTotals.vatAmount, totalAmount: effectiveTotals.totalAmount } : {}),
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
          // subTotal/vatAmount/totalAmount/fixedAmount are intentionally NOT set here:
          // effectiveTotals is computed in the quotation's own currency, which can differ
          // from the linked contract's currency. Writing it directly would silently corrupt
          // the contract's totals when currencies differ. syncContractHeaderFromServices(),
          // called after the contractServices reconciliation loop below, recomputes these
          // fields from the persisted lines in the contract's own currency instead.
          await ctx.api.request({
            url: 'contracts:update', method: 'POST', params: { filterByTk: linkedContract.id },
            data: {
              pricingMode,
              packageSubTotal: isPackageMode ? totals.subTotal : null,
              packageVatRate: isPackageMode ? parseNum(packageVatRate) : null,
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
              services: qLine.serviceId || null,
              serviceName: qLine.serviceName || null,
              serviceType: qLine.serviceType || null,
              description: qLine.description || null,
              currencyId: qLine.currencyId || null,
              currency: qLine.currencyId || null,
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
                  ServiceId: qLine.serviceId || null,
                  services: qLine.serviceId || null,
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
                    currency: resolveCurrency(qLine.currencyId, currencies) || quotationCurrency,
                    packageCurrency: quotationCurrency,
                  }),
                },
              });
            }
          }
          await syncContractHeaderFromServices(linkedContract.id);
        }
      } catch (e) { message.warning('Không thể sync hợp đồng: ' + (e?.message || '')); }

      // Step 4: Sync projects (case) totalAmount
      if (PROJECT_ID) {
        try {
          const isRetainer = linkedContract && String(linkedContract.contractType).toLowerCase() === 'retainer';
          let finalProjectAmount = effectiveTotals ? effectiveTotals.totalAmount : null;
          if (isRetainer) {
            const monthly = parseNum(linkedContract.monthlyFee);
            const duration = parseNum(linkedContract.retainerDuration);
            const vatRate = parseNum(linkedContract.packageVatRate ?? linkedContract.vatRate ?? 0);
            const sub = monthly * duration;
            finalProjectAmount = sub + (sub * vatRate / 100);
          }
          if (finalProjectAmount !== null) {
            await ctx.api.request({
              url: 'projects:update', method: 'POST',
              params: { filterByTk: PROJECT_ID },
              data: { totalAmount: finalProjectAmount }
            });
          }
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
                  ...(effectiveTotals ? { subTotal: effectiveTotals.subTotal, vatAmount: effectiveTotals.vatAmount, totalAmount: effectiveTotals.totalAmount } : {}),
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

  const th = (extra = {}) => ({ padding: '9px 12px', fontSize: 11.5, fontFamily: FONT, fontWeight: 600, color: C.textSub, background: C.bgSection, borderBottom: `2px solid ${C.border}`, whiteSpace: 'nowrap', textAlign: 'left', ...extra });
  const td = (extra = {}) => ({ padding: '8px 10px', fontSize: 13, fontFamily: FONT, color: C.text, borderBottom: '1px solid #f3f4f6', verticalAlign: 'top', ...extra });

  // Single-currency totals (package mode, or line mode with only one line
  // currency) don't go through the per-group breakdown UI, so without this
  // they'd silently keep showing the natural-currency amount even after the
  // user picks a different display currency — the "Quy đổi sang X" label
  // above the table would then be lying about what the numbers show.
  const needsSingleGroupConversionHint = !hasMixedLineCurrencies && !isSameCurrency(totalsCurrency, displayCurrency);
  const renderSingleGroupConversionHint = (field) => {
    if (!needsSingleGroupConversionHint) return null;
    if (exchangeRatesLoading) return React.createElement(Text, { type: 'secondary', style: { fontSize: 11 } }, 'Đang tra tỷ giá...');
    if (convertedSummary?.canConvert) {
      return React.createElement(Text, { style: { fontSize: 11, color: token.colorTextSecondary } }, `≈ ${formatMoney(convertedSummary[field], displayCurrency)}`);
    }
    return React.createElement(Text, { style: { fontSize: 11, color: token.colorWarning } }, 'Thiếu tỷ giá quy đổi');
  };

  // Mixed-currency totals already list each currency group separately, but
  // that alone never gives a single combined number — show the same "≈
  // converted" line used for the Total-amount cell in the Subtotal/VAT-amount
  // cells too, so every summary cell has one readable combined figure
  // (mirrors CaseServices.js's needsConversionHint, which shows this
  // regardless of which currency is currently selected).
  const renderMixedConversionHint = (field) => {
    if (exchangeRatesLoading) return React.createElement(Text, { type: 'secondary', style: { fontSize: 11 } }, 'Đang tra tỷ giá...');
    if (convertedSummary?.canConvert) {
      return React.createElement(Text, { style: { fontSize: 11, color: token.colorTextSecondary } }, `≈ ${formatMoney(convertedSummary[field], displayCurrency)}`);
    }
    return React.createElement(Text, { style: { fontSize: 11, color: token.colorWarning } }, 'Thiếu tỷ giá quy đổi');
  };

  if (!QUOTATION_ID) return React.createElement('div', { style: { padding: 20, color: C.danger, fontFamily: FONT } }, 'Quotation ID was not found in the URL.');
  if (loading) return React.createElement('div', { style: { textAlign: 'center', padding: 48 } }, React.createElement(Spin, { size: 'large' }));

  const serviceTableColumns = [
    {
      title: '#',
      key: 'index',
      width: 56,
      align: 'center',
      render: (_, __, index) => index + 1,
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
      }),
    },
    {
      title: 'Price',
      key: 'basePrice',
      width: 220,
      align: 'right',
      render: (_, r) => isPackageMode
        ? React.createElement(Text, { type: 'secondary' }, 'Included')
        : React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 4, width: '100%' } },
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement(EditableCell, {
              value: r._basePrice,
              onSave: val => updateRow(r.id, '_basePrice', val),
              disabled: isLocked,
              isMoney: true,
              currency: getRowCurrency(r),
              hideCurrencyCode: true,
            })
          ),
          React.createElement(Select, {
            value: r._currencyId || (extractCurrencyId(getRowCurrency(r)) ? String(extractCurrencyId(getRowCurrency(r))) : undefined),
            disabled: isLocked || !currencyOptions.length,
            size: 'small',
            style: { width: 76, flexShrink: 0 },
            onChange: (v) => updateRow(r.id, '_currencyId', v),
            options: currencyOptions,
            placeholder: 'Currency',
          })
        ),
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
      render: (_, r) => isPackageMode
        ? React.createElement(Text, { type: 'secondary' }, '—')
        : React.createElement(Text, { style: { color: token.colorWarning, whiteSpace: 'nowrap' } }, formatMoney(calcLine(r._basePrice, 1, r._vat, getRowCurrency(r)).vatAmount, getRowCurrency(r))),
    },
    {
      title: 'Total amount',
      key: 'total',
      width: 160,
      align: 'right',
      render: (_, r) => isPackageMode
        ? React.createElement(Text, { type: 'secondary' }, '—')
        : React.createElement(Text, { strong: true, style: { color: token.colorInfo, whiteSpace: 'nowrap' } }, formatMoney(calcLine(r._basePrice, 1, r._vat, getRowCurrency(r)).totalAmount, getRowCurrency(r))),
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
  ].filter(Boolean);

  return React.createElement(Card, {
    size: 'small',
    title: React.createElement(Space, { size: 8, wrap: true },
      React.createElement(Text, { strong: true }, 'Quotation services'),
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
        onClick: addRow,
      }, 'Add service'),
      React.createElement(Button, {
        size: 'small',
        onClick: reload,
        loading,
      }, 'Refresh')
    ),
    bodyStyle: { padding: 0 },
    style: { width: '100%' },
  },

    React.createElement('div', { style: { ...ui.section, display: 'grid', gridTemplateColumns: isPackageMode ? 'minmax(220px, 330px) minmax(0, 1fr)' : 'minmax(0, 330px)', gap: token.marginSM, alignItems: 'start' } },
      React.createElement('div', null,
        React.createElement(Text, { type: 'secondary', style: { display: 'block', marginBottom: token.marginXS } }, 'Pricing mode'),
        React.createElement(Space, { size: 8 },
          React.createElement(Segmented, {
            options: [
              { label: 'Line pricing', value: PRICING_MODE_LINE },
              { label: 'Package pricing', value: PRICING_MODE_PACKAGE },
            ],
            value: pricingMode,
            onChange: handlePricingModeChange,
            disabled: isLocked,
          }),
          isPackageMode && React.createElement(Tag, { color: 'blue' }, `Currency: ${getCurrencyCode(quotationCurrency)}`),
        )
      ),
    ),

    // Display currency — view all totals converted into a chosen currency,
    // independent of the quotation's own base currency.
    React.createElement('div', {
      style: { ...ui.section, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: 34, paddingTop: 6, paddingBottom: 6, gap: 12 },
    },
      React.createElement(Text, { type: 'secondary', style: { fontSize: 12, whiteSpace: 'nowrap' } }, 'Display currency'),
      React.createElement(Select, {
        value: selectedDisplayCurrencyValue,
        onChange: (val) => setDisplayCurrencyId(val),
        options: displayCurrencyOptions,
        style: { width: 150 },
        size: 'small',
      }),
      exchangeRatesLoading
        ? React.createElement(Spin, { size: 'small' })
        : React.createElement(Text, {
          type: convertedTotals.missing.length ? 'warning' : 'secondary',
          style: { fontSize: 12, whiteSpace: 'nowrap' },
        }, convertedTotals.missing.length
          ? `Thiếu tỷ giá: ${formatMissingRatePairs(convertedTotals.missing, displayCurrency)}`
          : `Quy đổi sang ${targetCurrencyCode} theo tỷ giá hiện hành`),
    ),

    // Table
    React.createElement(Table, {
      dataSource: activeRows,
      columns: serviceTableColumns,
      rowKey: 'id',
      pagination: false,
      size: 'small',
      bordered: true,
      scroll: { x: 'max-content' },
      summary: () => (activeRows.length > 0)
        ? React.createElement(Table.Summary.Row, null,
          React.createElement(Table.Summary.Cell, { index: 0, colSpan: 3, align: 'right' },
            React.createElement(Text, { strong: true }, isPackageMode ? 'Package total' : 'Total')
          ),
          React.createElement(Table.Summary.Cell, { index: 3, align: 'right' },
            React.createElement(Space, { direction: 'vertical', size: 0 },
              React.createElement(Text, { type: 'secondary' }, isPackageMode ? 'Package subtotal' : 'Subtotal'),
              isPackageMode
                ? React.createElement(MoneyDraftInput, { value: packageSubTotal, disabled: isLocked, onChange: updatePackageField(setPackageSubTotal), style: { width: 150 }, placeholder: '0', currency: quotationCurrency })
                : hasMixedLineCurrencies
                  ? React.createElement(Space, { direction: 'vertical', size: 0 },
                    ...lineTotalsByCurrency.map((g) => React.createElement(Text, { key: getCurrencyCode(g.currency), strong: true, style: { fontFamily: token.fontFamilyCode, display: 'block' } }, formatMoney(g.subTotal, g.currency))),
                    renderMixedConversionHint('subTotal')
                  )
                  : React.createElement(Text, { strong: true, style: { fontFamily: token.fontFamilyCode } }, formatMoney(totals.subTotal, totalsCurrency)),
              renderSingleGroupConversionHint('subTotal')
            )
          ),
          React.createElement(Table.Summary.Cell, { index: 4, align: 'right' },
            isPackageMode
              ? React.createElement(Space, { direction: 'vertical', size: 0 },
                React.createElement(Text, { type: 'secondary' }, 'VAT rate'),
                React.createElement(InputNumber, { value: packageVatRate, min: 0, max: 100, step: 0.1, disabled: isLocked, onChange: updatePackageField(setPackageVatRate), style: { width: 96, textAlign: 'right' } })
              )
              : null
          ),
          React.createElement(Table.Summary.Cell, { index: 5, align: 'right' },
            React.createElement(Space, { direction: 'vertical', size: 0 },
              React.createElement(Text, { type: 'secondary' }, isPackageMode ? 'Package VAT amount' : 'VAT amount'),
              isPackageMode
                ? React.createElement(MoneyDraftInput, { value: packageTotals.vatAmount, disabled: isLocked, onChange: updatePackageVatAmount, style: { width: 150 }, placeholder: '0', currency: quotationCurrency })
                : hasMixedLineCurrencies
                  ? React.createElement(Space, { direction: 'vertical', size: 0 },
                    ...lineTotalsByCurrency.map((g) => React.createElement(Text, { key: getCurrencyCode(g.currency), strong: true, style: { color: token.colorWarning, fontFamily: token.fontFamilyCode, display: 'block' } }, formatMoney(g.vatAmount, g.currency))),
                    renderMixedConversionHint('vatAmount')
                  )
                  : React.createElement(Text, { strong: true, style: { color: token.colorWarning, fontFamily: token.fontFamilyCode } }, formatMoney(totals.vatAmount, totalsCurrency)),
              renderSingleGroupConversionHint('vatAmount')
            )
          ),
          React.createElement(Table.Summary.Cell, { index: 6, align: 'right' },
            React.createElement(Space, { direction: 'vertical', size: 0 },
              React.createElement(Text, { type: 'secondary' }, isPackageMode ? 'Package total' : 'Total amount'),
              isPackageMode
                ? React.createElement(MoneyDraftInput, { value: packageTotals.totalAmount, disabled: isLocked, onChange: updatePackageTotalAmount, style: { width: 150 }, placeholder: '0', currency: quotationCurrency })
                : hasMixedLineCurrencies
                  ? React.createElement(Space, { direction: 'vertical', size: 0, style: { alignItems: 'flex-end' } },
                    ...lineTotalsByCurrency.map((g) => React.createElement(Text, { key: getCurrencyCode(g.currency), strong: true, style: { color: token.colorSuccess, fontFamily: token.fontFamilyCode, display: 'block' } }, formatMoney(g.totalAmount, g.currency))),
                    renderMixedConversionHint('totalAmount'),
                    React.createElement(Button, { type: 'link', size: 'small', style: { padding: 0, height: 'auto' }, onClick: () => setBreakdownOpen(true) }, 'Xem chi tiết')
                  )
                  : React.createElement(Text, { strong: true, style: { color: token.colorSuccess, fontFamily: token.fontFamilyCode } }, formatMoney(totals.totalAmount, totalsCurrency)),
              renderSingleGroupConversionHint('totalAmount')
            )
          ),
          React.createElement(Table.Summary.Cell, { index: 7 })
        )
        : null,
      locale: {
        emptyText: isLocked ? 'No services' : 'No services - click Add service',
      },
    }),

    (dirty && !isLocked) && React.createElement('div', { style: { ...ui.section, display: 'flex', justifyContent: 'flex-end' } },
      React.createElement(Space, { size: 8 },
        React.createElement(Button, { onClick: reload }, 'Cancel changes'),
        React.createElement(Button, {
          type: 'primary',
          loading: saving,
          onClick: saving ? undefined : handleSave,
        }, 'Save & Update quotation')
      )
    ),

    // CURRENCY BREAKDOWN MODAL
    React.createElement(Modal, {
      title: 'Chi tiết quy đổi tiền tệ',
      open: breakdownOpen,
      onCancel: () => setBreakdownOpen(false),
      footer: null,
      width: 800,
    },
      React.createElement('div', { style: { fontFamily: FONT } },
        React.createElement('div', { style: { marginBottom: 12, color: C.textSub, fontSize: 12.5 } },
          `Quy đổi tất cả dòng dịch vụ sang: ${targetCurrencyCode}.`,
        ),
        React.createElement(Table, {
          dataSource: exchangeBreakdown,
          rowKey: (r) => getCurrencyCode(r.currency),
          pagination: false,
          size: 'small',
          bordered: true,
          columns: [
            { title: 'Tiền tệ', key: 'currencyCode', width: 100, render: (_, r) => getCurrencyCode(r.currency) },
            { title: 'Tổng gốc', align: 'right', render: (_, r) => formatMoney(r.totalAmount, r.currency) },
            { title: `Tỷ giá quy đổi sang ${targetCurrencyCode}`, align: 'right', render: (_, r) => (r.canConvert ? formatExchangeRate(r.rate) : React.createElement(Text, { type: 'warning' }, 'Thiếu tỷ giá')) },
            { title: `Tổng quy đổi (${targetCurrencyCode})`, align: 'right', render: (_, r) => (r.canConvert ? formatMoney(r.convertedTotalAmount, displayCurrency) : '—') },
          ],
        }),
        convertedSummary?.canConvert && React.createElement('div', {
          style: { marginTop: 12, padding: '10px 12px', borderRadius: 7, background: '#f6ffed', border: '1px solid #b7eb8f', display: 'flex', justifyContent: 'space-between' },
        },
          React.createElement(Text, { strong: true }, `Tổng quy đổi (${targetCurrencyCode})`),
          React.createElement(Text, { strong: true, style: { color: C.successText, fontFamily: FONT_MONO } }, formatMoney(convertedSummary.totalAmount, displayCurrency)),
        ),
      ),
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
                    const catalogCurrency = currencyFromRecord(o, currencies, quotationCurrency);
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
    )
  );
};

ctx.render(React.createElement(QuotationServicesBlock, null));
