// ============================================================
// SUPERSEDED as a standalone page block (2026-09-15) — this file's own
// content is unchanged and still the single source of truth for Contract
// Services logic, but it is no longer placed on the page directly. It is
// now wrapped verbatim (byte-identical, not rewritten) inside
// ContractDetailView.js's `ContractServicesModule` IIFE, which merges it
// with Basic Info and Payment Schedule into one unified Details-tab
// render. Keep editing THIS file for any Contract Services change — the
// merged file's copy is a mechanical wrap, not a fork, so a fix here only
// needs re-running the same head/cat wrap (see ContractDetailView.js's
// header comment) to reach the merged page, not a second edit.
// ============================================================
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
        appends: ['serviceComboItems.services', 'serviceComboItems.currency'],
        // Explicit allowlist — omitting `fields` was silently dropping
        // serviceComboItems.price/vat/currencyId from the response (the
        // per-line snapshot fields), even though appends resolved the
        // services/currency relations fine. Matches CaseCreateForm.js's
        // own serviceCombos:list call, which needed the same fix.
        fields: [
          'id', 'comboName', 'comboCode', 'serviceComboType',
          'packageSubTotal', 'packageVatRate', 'currencyId',
          'serviceComboItems.id', 'serviceComboItems.serviceId',
          'serviceComboItems.serviceName', 'serviceComboItems.serviceType',
          'serviceComboItems.quantity', 'serviceComboItems.price',
          'serviceComboItems.vat', 'serviceComboItems.currencyId',
          'serviceComboItems.services', 'serviceComboItems.currency',
        ],
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
        React.createElement(Select.Option, { value: "" }, "-- Select --"),
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
    title: disabled ? "Contract is locked" : "Click to edit"
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

  // Unified picker modal — one entry point ("+ Add service") for both
  // adding a single catalog/custom service and creating/applying a combo,
  // with a top-level Individual/Combo toggle (pickerMode) mirroring
  // ContractCreateForm.js's picker. pickerShowModeToggle is only true for
  // a brand-new, context-free row (the plain toolbar button) — adding a
  // service INTO an already-applied combo, or changing an existing row's
  // service, always opens straight into individual mode with the toggle
  // hidden, since switching mode wouldn't make sense there.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState('individual'); // 'individual' | 'combo'
  const [pickerShowModeToggle, setPickerShowModeToggle] = useState(false);
  // "Save to catalog?" — appears once after Save, only if the batch
  // created at least one custom-named (non-catalog) row.
  const [catalogPromptRows, setCatalogPromptRows] = useState([]);
  const [showCatalogPrompt, setShowCatalogPrompt] = useState(false);
  const [catalogPromptChecked, setCatalogPromptChecked] = useState({});
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [comboSubTab, setComboSubTab] = useState('select');
  const [comboSearch, setComboSearch] = useState('');
  const [adhocComboName, setAdhocComboName] = useState('');
  const [adhocComboType, setAdhocComboType] = useState('');
  // Checked -> this ad-hoc combo also becomes a serviceCombos catalog entry
  // once resolved (see pendingComboCatalogSaves below). Independent of the
  // existing per-row "Save to catalog?" prompt, which already offers every
  // custom service in the combo the same chance as any other typed row.
  const [comboSaveToCatalog, setComboSaveToCatalog] = useState(false);
  // Combos awaiting a serviceCombos/serviceComboItems write once their
  // member rows' real serviceIds are known - which only happens after the
  // "Save to catalog?" prompt (for any custom items) resolves, since that's
  // the only place a brand-new service actually gets a services.id. See
  // resolvePendingComboCatalogSaves, called from finishSaveFlow.
  const [pendingComboCatalogSaves, setPendingComboCatalogSaves] = useState([]);
  // Mixed catalog-picked + typed-custom items for the ad-hoc combo builder -
  // {_id, source: 'catalog'|'custom', serviceId, serviceName, serviceType,
  // description}. Replaces the old adhocServiceIds (catalog-only multi-
  // select) so a combo can bundle a brand-new service too, same as the
  // individual Add Service flow's own Create New Service tab.
  const [comboItems, setComboItems] = useState([]);
  const [comboItemPick, setComboItemPick] = useState(undefined);
  const [applyingCombo, setApplyingCombo] = useState(false);
  // The combo's own negotiated price (may be lower/higher than the sum of
  // its items — a lawyer discount/markup) and the currency it's in. Folded
  // into the contract's packageSubTotal on apply, same as an existing
  // catalog combo's packageSubTotal already is (applyComboFromCatalog).
  const [comboCurrencyId, setComboCurrencyId] = useState('');
  const [comboFinalPrice, setComboFinalPrice] = useState(0);
  // Exchange rates fetched specifically for whatever currencies the combo
  // builder's own items/final price are currently in — separate from the
  // table-level `exchangeRates` (which only covers currencies already used
  // by saved rows), so a brand-new item's currency still converts live.
  const [comboRatesVnd, setComboRatesVnd] = useState([]);

  // Resets the combo builder's own fields — called when the unified
  // picker's top-level toggle switches into combo mode, same reset
  // openComboModal used to do before it had its own dedicated modal.
  // Defaults to VND (not the contract's own currency) so every item's
  // price converts into one common, always-summable total by default.
  const resetComboBuilder = () => {
    setComboSubTab('select');
    setComboSearch('');
    setAdhocComboName('');
    setAdhocComboType('');
    setComboSaveToCatalog(false);
    setComboItems([]);
    setComboItemPick(undefined);
    setComboCurrencyId(getCurrencySelectValue(vndCurrency));
    setComboFinalPrice(0);
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
      message.error(`Missing exchange rate to VND for the service package (${getCurrencyCode(comboCurrency)}).`);
      return null;
    }
    return pricing.subTotal;
  };

  // Local-only: pushes rows into `rows` and bumps `packageSubTotal` state,
  // exactly like addRow already does for a single service — nothing hits
  // the API until the existing "Save & Update contract" button.
  const applyComboFromCatalog = async (combo) => {
    const items = combo.serviceComboItems || [];
    if (!items.length) { message.warning('This combo has no services.'); return; }
    setApplyingCombo(true);
    try {
      const comboIdVal = extractId(combo.id);
      const comboSubTotalVnd = await convertComboSubTotalToVnd(combo.packageSubTotal, combo);
      if (comboSubTotalVnd === null) return;

      // Transitioning from line pricing to package pricing (this
      // contract's very first combo) used to zero every existing row's
      // price without folding it anywhere — "mixing" is still not allowed,
      // but a service that already had a real typed price shouldn't just
      // vanish from the total when the contract switches modes.
      let existingLineContributionVnd = 0;
      if (!isPackageMode && rows.length) {
        const foldNeededIds = Array.from(new Set(
          rows.map((r) => extractCurrencyId(getRowCurrency(r))).filter((id) => id && id !== vndCurrencyId),
        ));
        const foldRates = foldNeededIds.length ? await fetchExchangeRatesForConversion(foldNeededIds, vndCurrencyId) : [];
        const mergedFoldRates = [...exchangeRates, ...foldRates];
        rows.forEach((r) => {
          const pricing = buildServicePricingPayload({
            pricingMode: PRICING_MODE_LINE,
            basePrice: r._basePrice,
            quantity: 1,
            vat: r._vat,
            currency: getRowCurrency(r),
            vndCurrency,
            exchangeRatesToVnd: mergedFoldRates,
            pricingDate,
          });
          if (pricing._convertible) existingLineContributionVnd += pricing.subTotal;
        });
      }

      // Combos never merge into one blended pool — this combo's own amount
      // (its converted total, plus any pre-existing line rows folded in on
      // the very first combo applied) is stamped on its own rows'
      // packageSubTotal, and the contract's shared packageSubTotal state is
      // simply the running sum across every combo's own amount (see
      // updateComboGroupAmount, which edits one combo's amount without
      // touching any other combo's rows).
      const comboOwnAmount = existingLineContributionVnd + comboSubTotalVnd;
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
            comboId: comboIdVal, serviceCombo: comboIdVal, comboName: combo.comboName || 'Combo',
            packageSubTotal: comboOwnAmount,
          });
        }
      });

      setRows(prev => {
        const base = isPackageMode ? prev : prev.map(r => ({ ...r, _basePrice: 0, _vat: 0 }));
        return [...base, ...newRows];
      });
      if (!isPackageMode) setPricingMode(PRICING_MODE_PACKAGE);
      setPackageSubTotal(prev => parseNum(prev) + comboOwnAmount);
      setDirty(true);
      message.success(`Applied combo "${combo.comboName}". Click "Save & Update contract" to persist.`);
      setPickerOpen(false);
    } catch (err) {
      console.error(err);
      message.error('Error applying combo: ' + (err.message || ''));
    } finally {
      setApplyingCombo(false);
    }
  };

  const addComboCatalogItem = (svc) => {
    setComboItems((prev) => [
      ...prev,
      {
        _id: Date.now() + Math.random(),
        source: 'catalog',
        serviceId: svc.id,
        serviceName: svc.serviceName || svc.name || '',
        serviceType: svc.serviceType || '',
        description: svc.description || '',
        basePrice: parseNum(svc.basePrice ?? svc.unitPrice ?? svc.price ?? 0),
        currencyId: getRecordCurrencyId(svc) || extractCurrencyId(contractCurrency) || null,
      },
    ]);
    setComboItemPick(undefined);
  };
  const addComboCustomItem = () => {
    setComboItems((prev) => [
      ...prev,
      { _id: Date.now() + Math.random(), source: 'custom', serviceId: null, serviceName: '', serviceType: '', description: '', basePrice: 0, currencyId: comboCurrencyId || extractCurrencyId(contractCurrency) || null },
    ]);
  };
  const updateComboItem = (itemId, field, value) => {
    setComboItems((prev) => prev.map((it) => (it._id === itemId ? { ...it, [field]: value } : it)));
  };
  const removeComboItem = (itemId) => {
    setComboItems((prev) => prev.filter((it) => it._id !== itemId));
  };

  // The combo's own final price (comboFinalPrice, in comboCurrency) is
  // converted to VND and folded into packageSubTotal — same as an existing
  // catalog combo's packageSubTotal already is (applyComboFromCatalog).
  // Individual rows still land at _basePrice: 0 either way — package mode
  // never prices a line item on its own, only the aggregate subtotal.
  const applyAdhocCombo = async () => {
    const name = adhocComboName.trim();
    if (!name) { message.warning('Please enter a combo name.'); return; }
    if (!comboItems.length) { message.warning('Please add at least one service.'); return; }
    const emptyNameItem = comboItems.find((it) => !String(it.serviceName || '').trim());
    if (emptyNameItem) { message.warning('One or more services are missing a name.'); return; }
    setApplyingCombo(true);
    try {
      const comboFinalPriceVnd = await convertComboSubTotalToVnd(comboFinalPrice, { currencyId: comboCurrencyId });
      if (comboFinalPriceVnd === null) return;

      // See applyComboFromCatalog's own comment: fold any pre-existing line
      // rows' VND value into packageSubTotal on this same line->package
      // transition, instead of silently zeroing them out.
      let existingLineContributionVnd = 0;
      if (!isPackageMode && rows.length) {
        const foldNeededIds = Array.from(new Set(
          rows.map((r) => extractCurrencyId(getRowCurrency(r))).filter((id) => id && id !== vndCurrencyId),
        ));
        const foldRates = foldNeededIds.length ? await fetchExchangeRatesForConversion(foldNeededIds, vndCurrencyId) : [];
        const mergedFoldRates = [...exchangeRates, ...foldRates];
        rows.forEach((r) => {
          const pricing = buildServicePricingPayload({
            pricingMode: PRICING_MODE_LINE,
            basePrice: r._basePrice,
            quantity: 1,
            vat: r._vat,
            currency: getRowCurrency(r),
            vndCurrency,
            exchangeRatesToVnd: mergedFoldRates,
            pricingDate,
          });
          if (pricing._convertible) existingLineContributionVnd += pricing.subTotal;
        });
      }

      // See applyComboFromCatalog's matching comment: no merge into one
      // pool — this combo's own amount is stamped on its own rows.
      const comboOwnAmount = existingLineContributionVnd + comboFinalPriceVnd;
      const newRows = comboItems.map((item) => {
        const svc = item.serviceId ? svcOpts.find((o) => String(o.id) === String(item.serviceId)) : null;
        const nextCurrencyId = getRecordCurrencyId(svc || {}) || item.currencyId || extractCurrencyId(contractCurrency);
        return {
          id: Date.now() + Math.random(),
          serviceId: item.serviceId || null,
          _basePrice: 0, _quantity: 1, _vat: 0,
          _svcName: item.serviceName, _serviceType: item.serviceType || '', _description: item.description || '',
          currencyId: nextCurrencyId || null, _currencyId: nextCurrencyId ? String(nextCurrencyId) : '',
          _isNew: true, _deleted: false, _isCustom: !item.serviceId,
          comboId: null, serviceCombo: null, comboName: name,
          packageSubTotal: comboOwnAmount,
          // The row itself stays $0/included (package pricing), but a
          // custom item's own typed price/currency still needs to reach
          // the "Save to catalog?" prompt (handleSaveSelectedToCatalog)
          // later — _basePrice/_currencyId alone would show up as $0 there.
          _catalogBasePrice: parseNum(item.basePrice) || 0,
          _catalogCurrencyId: nextCurrencyId ? String(nextCurrencyId) : '',
        };
      });
      setRows(prev => {
        const base = isPackageMode ? prev : prev.map(r => ({ ...r, _basePrice: 0, _vat: 0 }));
        return [...base, ...newRows];
      });
      if (!isPackageMode) setPricingMode(PRICING_MODE_PACKAGE);
      setPackageSubTotal(prev => parseNum(prev) + comboOwnAmount);
      setDirty(true);
      if (comboSaveToCatalog) {
        setPendingComboCatalogSaves((prev) => [
          ...prev,
          {
            comboName: name,
            comboType: adhocComboType.trim() || null,
            currencyId: extractCurrencyId(comboCurrency) || null,
            packageSubTotal: parseNum(comboFinalPrice),
            // Captured now, from comboItems directly, rather than re-derived
            // later from rows/catalogPromptRows - avoids depending on those
            // rows still existing/matching by the time this combo actually
            // gets resolved (which happens after the separate "Save to
            // catalog?" prompt, a whole user interaction later).
            members: comboItems.map((it) => ({
              serviceId: it.serviceId || null,
              serviceName: it.serviceName,
              serviceType: it.serviceType || '',
              basePrice: parseNum(it.basePrice) || 0,
              currencyId: extractCurrencyId(it.currencyId) || null,
            })),
          },
        ]);
      }
      message.success(`Created combo "${name}". Click "Save & Update contract" to persist.`);
      setPickerOpen(false);
      setComboItems([]);
      setAdhocComboName('');
      setAdhocComboType('');
      setComboSaveToCatalog(false);
      setComboFinalPrice(0);
    } catch (err) {
      console.error(err);
      message.error('Error creating combo: ' + (err.message || ''));
    } finally {
      setApplyingCombo(false);
    }
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
  const comboCurrency = useMemo(
    () => resolveCurrency(comboCurrencyId, currencies) || contractCurrency,
    [comboCurrencyId, currencies, contractCurrency],
  );
  const openServiceModal = (rowId, allowModeSwitch = false) => {
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
    setPickerMode('individual');
    setPickerShowModeToggle(allowModeSwitch);
    setPickerOpen(true);
  };

  // The unified picker's top-level Individual/Combo toggle. Combo mode
  // creates its own rows directly (applyComboFromCatalog/applyAdhocCombo),
  // so the still-blank placeholder row addRow() created for individual
  // mode gets dropped when switching away from it; switching back needs a
  // target row to fill, so one is (re)created via addRow().
  const handlePickerModeChange = (value) => {
    if (value === pickerMode) return;
    if (value === 'combo') {
      if (activeRowId) {
        setRows(prev => prev.filter(r => r.id !== activeRowId));
        setActiveRowId(null);
      }
      resetComboBuilder();
      setPickerMode('combo');
    } else if (!activeRowId) {
      addRow();
    } else {
      setPickerMode('individual');
    }
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
    setPickerOpen(false);
  };

  const handleCreateCustomService = () => {
    if (!newSvcName.trim()) { message.warning('Please enter the service name'); return; }
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
    setPickerOpen(false);
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

  // Keeps comboRatesVnd stocked with whatever currencies the combo builder's
  // own items/final price are currently in — a lightweight, combo-scoped
  // companion to the table-level exchangeRates effect below, so the live
  // "Giá lẻ" preview can convert every item to VND synchronously instead of
  // only counting items that happen to match the chosen currency.
  // Also covers every catalog combo's own currency + each of its
  // serviceComboItems' own currency (a combo's items can each be priced in
  // a different currency than the combo itself — see
  // getComboHeaderPriceComparison/getComboLineIndividualPrice, both of
  // which convert every item to VND before summing/comparing).
  const comboCurrencyIdsNeedingRate = comboItems
    .map((it) => extractCurrencyId(it.currencyId))
    .concat([extractCurrencyId(comboCurrencyId)])
    .concat(
      comboCatalog.flatMap((c) => [
        extractCurrencyId(c.currencyId),
        ...(c.serviceComboItems || []).map((it) => extractCurrencyId(it.currencyId)),
      ]),
    )
    .filter((id) => id && id !== vndCurrencyId);
  const comboCurrencyIdsKey = Array.from(new Set(comboCurrencyIdsNeedingRate)).sort((a, b) => a - b).join(',');

  useEffect(() => {
    let alive = true;
    if (!vndCurrencyId || !comboCurrencyIdsKey) {
      setComboRatesVnd([]);
      return () => { alive = false; };
    }
    const ids = comboCurrencyIdsKey.split(',').map((id) => parseInt(id, 10));
    fetchExchangeRatesForConversion(ids, vndCurrencyId)
      .then((rows) => { if (alive) setComboRatesVnd(rows || []); })
      .catch(() => { if (alive) setComboRatesVnd([]); });
    return () => { alive = false; };
  }, [vndCurrencyId, comboCurrencyIdsKey]);

  // Synchronous VND conversion for the combo builder's live preview, using
  // whatever rates are already cached (exchangeRates + comboRatesVnd) — no
  // network round-trip on every keystroke. ok:false means no cached rate
  // yet (shown as excluded from the running total, not silently as 0).
  const convertComboAmountToVndSync = (amount, currencyId) => {
    const amt = parseNum(amount);
    if (!amt) return { value: 0, ok: true };
    const cur = resolveCurrency(currencyId, currencies) || vndCurrency;
    const curId = extractCurrencyId(cur);
    if (!curId || curId === vndCurrencyId) return { value: amt, ok: true };
    const pricing = buildServicePricingPayload({
      pricingMode: PRICING_MODE_LINE,
      basePrice: amt,
      quantity: 1,
      vat: 0,
      currency: cur,
      vndCurrency,
      exchangeRatesToVnd: [...exchangeRates, ...comboRatesVnd],
      pricingDate,
    });
    return { value: pricing._convertible ? pricing.subTotal : 0, ok: pricing._convertible };
  };

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

  // VAT amount / Package total are never directly editable — always derived
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
    { key: "serviceName", label: "Service name", type: "text" },
    { key: "serviceType", label: "Service type", type: "text" },
    { key: "description", label: "Description", type: "text" },
    { key: "basePrice", label: "Unit price", type: "money" },
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
          React.createElement("div", { style: { fontSize: 13, color: C.textSub, marginBottom: 4 } }, "Contract Service"),
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
      }, "This service is not linked to the original catalog service — no data to compare."),

      React.createElement(Table, {
        dataSource: rows,
        rowKey: "key",
        pagination: false,
        size: "small",
        bordered: true,
        columns: [
          { title: "Field", dataIndex: "field", width: 150 },
          {
            title: showCurrencyHint ? `Original Service (Catalog) · ${getCurrencyCode(catalogCurrency)}` : "Original Service (Catalog)",
            dataIndex: "original",
            render: (value, row) => renderCompareCell(value, row.type, catalogCurrency),
          },
          {
            title: showCurrencyHint ? `Service in Contract · ${getCurrencyCode(recordCurrency)}` : "Service in Contract",
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
      }, "Comparing the current service data in the Contract against the original catalog."),

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
            title: "Contract Service",
            dataIndex: "serviceName",
            width: 240,
            render: (value, row) => React.createElement("div", { style: { fontWeight: 600, color: C.text, wordBreak: "break-word" } }, formatCompareValue(value, "text")),
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

  // comboTarget (set via a combo section's own "+ Add service" button) tags
  // the new row into that combo instead of landing as an untagged row.
  const addRow = (comboTarget = null) => {
    if (isLocked) { message.warning('🔒 Contract is signed or in progress — cannot add service'); return; }
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
    openServiceModal(newId, !comboTarget);
  };

  const deleteRow = id => {
    if (isLocked) { message.warning('🔒 Contract is signed or in progress — cannot delete service'); return; }
    setRows(prev => prev.map(r => r.id === id ? { ...r, _deleted: true } : r));
    setDirty(true);
  };

  // Bulk-removes every active row tagged with a given comboId — the combo
  // section header's "Remove combo" action. A row already saved to the
  // server is soft-marked `_deleted` (persisted on the next Save, same as a
  // single-row delete); a row only added locally (`_isNew`, never saved) is
  // simply dropped from state instead of round-tripping through delete.
  const removeCombo = (groupKey) => {
    if (isLocked) { message.warning('🔒 Contract is signed or in progress — cannot delete service'); return; }
    const groupRows = rows.filter((r) => getComboGroupKey(r) === groupKey && !r._deleted);
    const groupAmount = groupRows.length ? parseNum(groupRows[0].packageSubTotal) : 0;
    setRows(prev => prev
      .map((r) => {
        if (getComboGroupKey(r) !== groupKey) return r;
        return r._isNew ? null : { ...r, _deleted: true };
      })
      .filter(Boolean));
    if (groupAmount) {
      setPackageSubTotal((prev) => Math.max(parseNum(prev) - groupAmount, 0));
    }
    setDirty(true);
  };

  // Combos never merge into one blended pool — each combo group keeps its
  // own independently-editable amount (stamped on its own rows'
  // packageSubTotal). Editing one group's amount here only touches that
  // group's own rows, then adjusts the shared packageSubTotal by the delta;
  // it never rewrites another combo's amount.
  const updateComboGroupAmount = (groupKey, nextAmount) => {
    const amount = Math.max(0, parseNum(nextAmount));
    const groupRows = rows.filter((r) => getComboGroupKey(r) === groupKey && !r._deleted);
    const oldAmount = groupRows.length ? parseNum(groupRows[0].packageSubTotal) : 0;
    setRows((prev) => prev.map((r) =>
      getComboGroupKey(r) === groupKey ? { ...r, packageSubTotal: amount } : r,
    ));
    setPackageSubTotal((prev) => Math.max(parseNum(prev) - oldAmount + amount, 0));
    setDirty(true);
  };

  const finishSaveFlow = async (savedServiceIdByName) => {
    message.success('Saved and synced contract services → case services');
    setDirty(false);
    await resolvePendingComboCatalogSaves(savedServiceIdByName || new Map());
    reload();
  };

  const openCatalogPrompt = (rowsToPrompt) => {
    const enriched = rowsToPrompt.map((r) => ({
      ...r,
      _alreadyInCatalog: svcOpts.some(
        (s) => normalizeLookupText(s.serviceName || s.name) === normalizeLookupText(r._svcName),
      ),
    }));
    setCatalogPromptRows(enriched);
    setCatalogPromptChecked(
      Object.fromEntries(enriched.filter((r) => !r._alreadyInCatalog).map((r) => [r.id, false])),
    );
    setShowCatalogPrompt(true);
  };

  const toggleCatalogPromptRow = (id) => {
    setCatalogPromptChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Resolves pendingComboCatalogSaves against whichever services actually
  // have a real serviceId by now: catalog-picked members already did
  // (captured at apply-time in applyAdhocCombo); custom members resolve via
  // savedServiceIdByName, built from whichever custom rows the "Save to
  // catalog?" prompt just saved. A custom member that was neither picked
  // from catalog nor just saved has no serviceId to link, so it's left out
  // of the combo definition (warned about below), not the whole combo
  // skipped.
  const resolvePendingComboCatalogSaves = async (savedServiceIdByName) => {
    if (!pendingComboCatalogSaves.length) return;
    for (const comboEntry of pendingComboCatalogSaves) {
      const resolved = comboEntry.members
        .map((m) => ({
          serviceId: m.serviceId || savedServiceIdByName.get(normalizeLookupText(m.serviceName)) || null,
          serviceName: m.serviceName,
          serviceType: m.serviceType,
          basePrice: m.basePrice || 0,
          currencyId: m.currencyId || null,
        }))
        .filter((it) => it.serviceId);
      const skippedCount = comboEntry.members.length - resolved.length;
      if (!resolved.length) {
        console.warn(`Skipped saving combo "${comboEntry.comboName}" to the catalog — no service in it has a real catalog link.`);
        message.warning(`Combo "${comboEntry.comboName}" was not saved to the catalog — its services could not be linked (a name may already be in use, or saving one of them failed).`);
        continue;
      }
      const byServiceId = new Map();
      for (const it of resolved) {
        const key = String(it.serviceId);
        if (!byServiceId.has(key)) byServiceId.set(key, { ...it, quantity: 1 });
        else byServiceId.get(key).quantity += 1;
      }
      try {
        const comboRes = await ctx.api.request({
          url: 'serviceCombos:create',
          method: 'POST',
          data: {
            comboName: comboEntry.comboName,
            serviceComboType: comboEntry.comboType || null,
            packageSubTotal: comboEntry.packageSubTotal || 0,
            packageVatRate: 0,
            packageVatAmount: 0,
            totalAmount: comboEntry.packageSubTotal || 0,
            currencyId: comboEntry.currencyId || null,
            isActive: true,
          },
        });
        const newComboId = comboRes?.data?.data?.id;
        if (newComboId) {
          await Promise.all(
            Array.from(byServiceId.values()).map((it) =>
              ctx.api.request({
                url: 'serviceComboItems:create',
                method: 'POST',
                data: { comboId: newComboId, serviceId: it.serviceId, serviceName: it.serviceName, serviceType: it.serviceType || null, quantity: it.quantity, basePrice: it.basePrice || 0, currencyId: it.currencyId || null },
              }).catch((itemErr) => console.warn('Could not add service to new catalog combo:', itemErr)),
            ),
          );
          message.success(
            skippedCount > 0
              ? `Combo "${comboEntry.comboName}" saved to the catalog — ${skippedCount} custom service(s) without a catalog link were left out.`
              : `Combo "${comboEntry.comboName}" saved to the catalog.`,
          );
        }
      } catch (comboErr) {
        console.warn(`Could not save combo "${comboEntry.comboName}" to the catalog:`, comboErr);
        message.warning(`Could not save combo "${comboEntry.comboName}" to the catalog.`);
      }
    }
    setPendingComboCatalogSaves([]);
  };

  // Creates the catalog definition first (services:create), then links it to
  // the current company with this row's price (companyServices:create) —
  // BR-DATA-02: every service picker in this codebase reads companyServices,
  // not services directly, so skipping this link would leave the new
  // service invisible elsewhere until someone adds it by hand.
  const handleSaveSelectedToCatalog = async () => {
    const rowsToSave = catalogPromptRows.filter((r) => catalogPromptChecked[r.id]);
    const internalCompanyId = extractId(contract?.internalCompanyId);
    const savedServiceIdByName = new Map();
    setCatalogSaving(true);
    for (const r of rowsToSave) {
      // A combo's own custom item stays $0/included on its row (package
      // pricing), so applyAdhocCombo stashes what the lawyer actually typed
      // in _catalogBasePrice/_catalogCurrencyId — prefer those when present.
      const catalogBasePrice = r._catalogBasePrice != null ? r._catalogBasePrice : (r._basePrice || 0);
      const catalogCurrencyId = extractCurrencyId(r._catalogCurrencyId || r._currencyId) || null;
      try {
        const svcRes = await ctx.api.request({
          url: 'services:create',
          method: 'POST',
          data: {
            serviceName: r._svcName,
            serviceType: r._serviceType || null,
            description: r._description || null,
            basePrice: catalogBasePrice,
            currencyId: catalogCurrencyId,
          },
        });
        const newServiceId = svcRes?.data?.data?.id;
        if (newServiceId) savedServiceIdByName.set(normalizeLookupText(r._svcName), newServiceId);
        if (newServiceId && internalCompanyId) {
          try {
            await ctx.api.request({
              url: 'companyServices:create',
              method: 'POST',
              data: {
                internalCompanyId,
                serviceId: newServiceId,
                serviceName: r._svcName,
                serviceType: r._serviceType || null,
                description: r._description || null,
                price: catalogBasePrice,
                vat: r._vat || 0,
                currencyId: catalogCurrencyId,
              },
            });
          } catch (linkErr) {
            console.warn('Could not link new service to company catalog:', linkErr);
            message.warning(`"${r._svcName}" was saved to the catalog but a company-specific price could not be assigned — please add it manually in companyServices.`);
          }
        }
      } catch (err) {
        console.error(err);
        message.warning(`Could not save "${r._svcName}" to the catalog: ` + (err?.message || ''));
      }
    }
    setCatalogSaving(false);
    setShowCatalogPrompt(false);
    finishSaveFlow(savedServiceIdByName);
  };

  const handleSkipCatalogPrompt = () => {
    setShowCatalogPrompt(false);
    finishSaveFlow();
  };

  const handleSave = async () => {
    const invalid = activeRows.find(r => !r._svcName?.trim() || (!isPackageMode && parseNum(r._basePrice) <= 0));
    if (invalid) { message.warning(isPackageMode ? 'Please enter all service names' : 'Please fill in all service names and unit prices'); return; }
    if (isPackageMode && parseNum(packageSubTotal) <= 0) { message.warning('Please enter the contract service package value'); return; }
    if (!isPackageMode && lineTotalsVnd.missingRows.length) {
      const names = lineTotalsVnd.missingRows
        .map((r) => `"${r._svcName || 'Unnamed service'}" (${getCurrencyCode(getRowCurrency(r))})`)
        .join(', ');
      message.error(`Missing exchange rate to VND for: ${names} — cannot save.`);
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
        } catch (e) { message.warning('Could not load the projectServices list: ' + (e?.message || '')); }
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

      const createdCustomRows = [];
      for (const r of rows) {
        if (isDeletedServiceLine(r) && !r._deleted) continue;
        // Combo rows carry their own combo group's independently-tracked
        // amount (stamped by applyComboFromCatalog/applyAdhocCombo/
        // updateComboGroupAmount) — persist THAT, not the contract-wide
        // blended packageSubTotal, so each combo's own DB rows reflect only
        // its own share instead of every combo's total. A package-mode row
        // with no combo of its own falls back to the shared header total.
        const pricingPayload = buildServicePricingPayload({
          pricingMode,
          basePrice: r._basePrice,
          quantity: 1,
          vat: r._vat,
          packageSubTotal: r.packageSubTotal ?? packageSubTotal,
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
          // Read the linked quotationService's quotationId BEFORE destroying
          // it — needed afterward to resync that quotation's header, and
          // the record won't be fetchable once destroyed.
          let targetQuotationId = null;
          if (linkedQuotationServiceId) {
            try {
              const qSvcRes = await ctx.api.request({
                url: 'quotationServices:get',
                params: { filterByTk: linkedQuotationServiceId },
              });
              const qSvcRecord = qSvcRes?.data?.data || qSvcRes?.data || {};
              targetQuotationId = extractId(qSvcRecord.quotationId) || extractId(qSvcRecord.quotations);
            } catch (e) {
              console.warn('[CS->QS] Could not read quotationService #' + linkedQuotationServiceId + ' before destroy: ' + (e?.message || ''));
            }
          }

          await ctx.api.request({
            url: 'contractServices:destroy',
            method: 'POST',
            params: { filterByTk: r.id },
          });
          // Cascade: destroy corresponding projectService
          if (linkedProjectServiceId) {
            try {
              await requestProjectService({
                action: 'destroy',
                params: { filterByTk: linkedProjectServiceId },
              });
            } catch (e) { message.warning('Could not delete projectService #' + linkedProjectServiceId + ': ' + (e?.message || '')); }
          }
          if (linkedQuotationServiceId) {
            try {
              await ctx.api.request({
                url: 'quotationServices:destroy',
                method: 'POST',
                params: { filterByTk: linkedQuotationServiceId },
              });
              if (targetQuotationId) {
                await syncQuotationHeaderFromServices(targetQuotationId);
              }
            } catch (e) {
              console.warn('[CS->QS] Could not destroy quotationService #' + linkedQuotationServiceId + ': ' + (e?.message || ''));
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
              } catch (e) { message.warning('Could not update duplicate projectService: ' + (e?.message || '')); }
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
              } catch (e) { message.warning('Could not create projectService: ' + (e?.message || '')); }
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
          if (createdContractServiceId && r._isCustom) createdCustomRows.push({ ...r, id: createdContractServiceId });
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
            } catch (e) { message.warning('Could not update projectService #' + linkedProjectServiceId + ': ' + (e?.message || '')); }
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
        } catch (e) { message.warning('Could not sync the case: ' + (e?.message || '')); }
      }

      const customRowsAwaitingCatalogDecision = createdCustomRows.filter((r) => r._svcName?.trim());
      if (customRowsAwaitingCatalogDecision.length > 0) {
        openCatalogPrompt(customRowsAwaitingCatalogDecision);
      } else {
        await finishSaveFlow();
      }
    } catch (e) { message.error('Error: ' + (e?.message || 'Try again')); }
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

  // A package row's own basePrice is always 0 (the real price lives in the
  // package footer, not per line) — this looks up what that one line would
  // cost standalone, from the combo catalog snapshot. Price/VAT/VAT
  // amount/Total stay visible for package rows too (see serviceTableColumns
  // below) instead of being dropped, so the standalone value stays visible
  // right in the table instead of a small caption under the service name.
  const getComboLineIndividualPrice = (record) => {
    const comboIdVal = extractId(record?.comboId) || extractId(record?.serviceCombo);
    if (!comboIdVal) return null;
    const catalogCombo = comboCatalog.find((c) => extractId(c.id) === comboIdVal);
    if (!catalogCombo) return null;
    const svcIdVal = extractId(record?.serviceId);
    // Match on the direct serviceComboItems.serviceId FK first — the
    // nested "services" relation frequently fails to resolve, and matching
    // on it.services?.id alone let two items with an unresolved relation
    // collide (both compare as undefined), silently pairing this row with
    // the WRONG item's price.
    const item = (catalogCombo.serviceComboItems || []).find(
      (it) => extractId(it.serviceId || it.services) === svcIdVal || extractId(it.services?.id) === svcIdVal,
    );
    if (!item) return null;
    const svc = item.services || {};
    const rawPrice = parseNum(item.price ?? svc.basePrice ?? svc.unitPrice ?? svc.price ?? 0);
    // Each item can be snapshotted in its own currency (item.currencyId),
    // independent of the combo's own currency — convert to VND so every
    // item, whatever currency it's in, compares on the same footing.
    const itemCurrencyId =
      extractCurrencyId(item.currencyId) ||
      extractCurrencyId(currencyFromRecord(catalogCombo, currencies, vndCurrency));
    const converted = convertComboAmountToVndSync(rawPrice, itemCurrencyId);
    return {
      price: converted.value,
      vat: parseNum(item.vat),
      currency: vndCurrency,
    };
  };

  const serviceTableColumns = [
    {
      title: '#',
      key: 'index',
      width: 36,
      align: 'center',
      render: (_, r) => r._displayIndex,
    },
    {
      title: 'Service & Type',
      key: 'service',
      width: 190,
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
            r._serviceType && React.createElement(Tag, { color: 'blue', style: { marginInlineEnd: 0 } }, r._serviceType),
          )
      ),
    },
    {
      title: 'Description',
      dataIndex: '_description',
      key: 'description',
      width: 180,
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
      width: 180,
      align: 'right',
      render: (_, r) => {
        if (isPackageMode) {
          const individual = getComboLineIndividualPrice(r);
          if (!individual) return React.createElement(Text, { type: 'secondary' }, '—');
          return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 } },
            React.createElement(Text, { strong: true }, formatMoney(individual.price, individual.currency)),
            React.createElement(Text, { type: 'secondary', style: { fontSize: 10.5 } }, 'Included in combo'),
          );
        }
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
          }, pricing._convertible ? `≈ ${formatMoney(pricing.subTotal, vndCurrency)}` : 'Missing exchange rate'),
        );
      },
    },
    {
      title: 'VAT (%)',
      key: 'vat',
      width: 60,
      align: 'right',
      render: (_, r) => {
        if (isPackageMode) {
          const individual = getComboLineIndividualPrice(r);
          return React.createElement(Text, { type: 'secondary' }, individual ? `${parseNum(individual.vat)}%` : '—');
        }
        return React.createElement(EditableCell, {
          value: r._vat,
          onSave: val => updateRow(r.id, '_vat', val),
          disabled: isLocked,
          isNumber: true,
        });
      },
    },
    {
      title: 'VAT amount',
      key: 'vatAmount',
      width: 110,
      align: 'right',
      render: (_, r) => {
        if (isPackageMode) {
          const individual = getComboLineIndividualPrice(r);
          if (!individual) return React.createElement(Text, { type: 'secondary' }, '—');
          const vatAmount = Math.round((parseNum(individual.price) * parseNum(individual.vat)) / 100);
          return React.createElement(Text, { type: 'secondary', style: { wordBreak: 'break-word' } },
            formatMoney(vatAmount, individual.currency));
        }
        const pricing = buildServicePricingPayload({
          pricingMode: PRICING_MODE_LINE, basePrice: r._basePrice, quantity: 1, vat: r._vat,
          currency: getRowCurrency(r), vndCurrency, exchangeRatesToVnd: exchangeRates, pricingDate,
        });
        return React.createElement(Text, { style: { color: token.colorWarning, wordBreak: 'break-word' } },
          pricing._convertible ? formatMoney(pricing.vatAmount, vndCurrency) : '—');
      },
    },
    {
      title: 'Total amount',
      key: 'total',
      width: 120,
      align: 'right',
      render: (_, r) => {
        if (isPackageMode) {
          const individual = getComboLineIndividualPrice(r);
          if (!individual) return React.createElement(Text, { type: 'secondary' }, '—');
          const vatAmount = Math.round((parseNum(individual.price) * parseNum(individual.vat)) / 100);
          const total = parseNum(individual.price) + vatAmount;
          return React.createElement(Text, { strong: true, style: { color: token.colorTextSecondary, wordBreak: 'break-word' } },
            formatMoney(total, individual.currency));
        }
        const pricing = buildServicePricingPayload({
          pricingMode: PRICING_MODE_LINE, basePrice: r._basePrice, quantity: 1, vat: r._vat,
          currency: getRowCurrency(r), vndCurrency, exchangeRatesToVnd: exchangeRates, pricingDate,
        });
        return React.createElement(Text, { strong: true, style: { color: token.colorInfo, wordBreak: 'break-word' } },
          pricing._convertible ? formatMoney(pricing.totalAmount, vndCurrency) : '—');
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      align: 'center',
      render: (_, r) => React.createElement(Space, { direction: 'vertical', size: 0, style: { lineHeight: 1 } },
        React.createElement(Button, {
          size: 'small',
          type: 'link',
          style: { padding: 0, height: 20 },
          onClick: () => setCompareModal({ open: true, data: r }),
        }, 'Review'),
        !isLocked && React.createElement(Button, {
          size: 'small',
          type: 'link',
          danger: true,
          style: { padding: 0, height: 20 },
          onClick: () => deleteRow(r.id),
        }, 'Delete')
      ),
    },
  ].filter(Boolean);

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
      comboName: row.comboName || 'Combo',
      _comboCount: groupRows.length,
      _groupAmount: parseNum(groupRows[0]?.packageSubTotal) || 0,
    });
    for (const r of groupRows) {
      displaySeq += 1;
      groupedActiveRows.push({ ...r, _displayIndex: displaySeq });
    }
  }

  // Reference-only comparison against the combo's catalog definition — the
  // same figures the "Apply Combo" picker shows before applying, resurfaced
  // here so they stay visible once the combo is on the contract. Doesn't
  // affect the contract's own packageSubTotal actually charged.
  const getComboHeaderPriceComparison = (record) => {
    const comboIdVal = extractId(record?.comboId);
    if (!comboIdVal) return null;
    const catalogCombo = comboCatalog.find((c) => extractId(c.id) === comboIdVal);
    if (!catalogCombo) return null;
    const comboCurrencyIdFallback = extractCurrencyId(currencyFromRecord(catalogCombo, currencies, vndCurrency));
    // Each item can be snapshotted in its own currency (item.currencyId),
    // independent of the combo's own currency — convert every item to VND
    // before summing, so a combo mixing currencies still totals correctly.
    const individualTotal = (catalogCombo.serviceComboItems || []).reduce((sum, item) => {
      const svc = item.services || {};
      const price = parseNum(item.price ?? svc.basePrice ?? svc.unitPrice ?? svc.price ?? 0);
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemCurrencyId = extractCurrencyId(item.currencyId) || comboCurrencyIdFallback;
      const converted = convertComboAmountToVndSync(price * qty, itemCurrencyId);
      return sum + converted.value;
    }, 0);
    const packagePrice = convertComboAmountToVndSync(
      parseNum(catalogCombo.packageSubTotal),
      comboCurrencyIdFallback,
    ).value;
    const savings = individualTotal - packagePrice;
    const savingsPct = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;
    return {
      individualTotal,
      packagePrice,
      savings,
      savingsPct,
      currency: vndCurrency,
    };
  };

  const renderComboHeaderBar = (record) => {
    const priceComparison = getComboHeaderPriceComparison(record);
    return React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 8, padding: '6px 4px' },
    },
      // Top row: what this combo is.
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
        React.createElement(Tag, { color: 'blue', style: { fontWeight: 700, letterSpacing: 0.3 } }, 'COMBO'),
        React.createElement(Text, { strong: true }, record.comboName || 'Combo'),
        React.createElement(Text, { type: 'secondary', style: { fontSize: 12.5 } },
          `${record._comboCount} service${record._comboCount === 1 ? '' : 's'}`),
      ),
      // Bottom row: pricing on the left, actions pinned to the right — kept
      // apart so the money and the destructive/mutating actions never end
      // up crowded into the same cluster.
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
            React.createElement(Text, { style: { fontSize: 12, color: C.textSub } }, 'Package price:'),
            React.createElement(MoneyDraftInput, {
              value: record._groupAmount,
              disabled: isLocked,
              onChange: (v) => updateComboGroupAmount(record._groupKey, v),
              style: { width: 140 },
              currency: vndCurrency,
            }),
          ),
          priceComparison && React.createElement(Text, { style: { fontSize: 12, color: C.textSub } },
            `Individual price: ${formatMoney(priceComparison.individualTotal, priceComparison.currency)}`),
          priceComparison && priceComparison.savings > 0 && React.createElement(Text, { style: { fontSize: 12, color: C.success, fontWeight: 600 } },
            `Save ${formatMoney(priceComparison.savings, priceComparison.currency)} (${priceComparison.savingsPct}%)`)
        ),
        !isLocked && React.createElement(Space, { size: 8 },
          React.createElement(Button, {
            size: 'small',
            onClick: () => addRow({ comboId: record.comboId, comboName: record.comboName }),
          }, '+ Add service'),
          React.createElement(Popconfirm, {
            title: 'Remove this combo?',
            description: 'All services in this combo section will be removed.',
            okText: 'Remove',
            okType: 'danger',
            cancelText: 'Cancel',
            onConfirm: () => removeCombo(record._groupKey),
          },
            React.createElement(Button, { size: 'small', danger: true }, 'Remove combo')
          )
        )
      )
    );
  };

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

  // Stacked label/value rows with a dashed divider and a bold Total row —
  // lives outside the Table (not Table.Summary) so it isn't constrained by
  // <td> layout. Package subtotal/VAT rate stay editable (writing to local
  // state only — the existing "Cancel changes / Save" bar below persists
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
            React.createElement(Text, { style: labelStyle }, 'Combo subtotal (excl. VAT):'),
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
            React.createElement(Text, { style: labelStyle }, 'Combo VAT amount:'),
            React.createElement(Text, { style: valueStyle(token.colorWarning) }, formatMoney(packageTotals.vatAmount, vndCurrency))
          ),
          React.createElement('div', { key: 'total', style: rowStyle(false) },
            React.createElement(Text, { style: totalLabelStyle }, 'Combo total:'),
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
      }, '+ Add service'),
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
      // No scroll.x on purpose — column widths above were shrunk and money
      // cells switched from whiteSpace:nowrap to wordBreak:'break-word' so
      // the table wraps instead of forcing horizontal scroll.
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
      style: { maxWidth: 'calc(100vw - 24px)' },
      bodyStyle: { paddingTop: 16, maxWidth: '100%', overflowX: 'auto' }
    }, compareModal.open && (
      compareModal.data ? renderCompareDetail(compareModal.data) : renderCompareList()
    )),

    // UNIFIED PICKER MODAL — one entry point for both adding a single
    // service (catalog or custom) and applying/creating a combo, with a
    // top-level Individual/Combo toggle (hidden when there's no meaningful
    // choice — see pickerShowModeToggle).
    React.createElement(Modal, {
      title: null,
      open: pickerOpen,
      onCancel: () => setPickerOpen(false),
      footer: null,
      width: pickerMode === 'combo' ? 960 : 800,
      style: { maxWidth: 'calc(100vw - 24px)' },
      bodyStyle: { padding: '24px 24px 16px', maxHeight: '80vh', overflowY: 'auto' }
    },
      pickerShowModeToggle &&
        React.createElement(Segmented, {
          block: true,
          value: pickerMode,
          onChange: handlePickerModeChange,
          options: [
            { label: 'Line pricing', value: 'individual' },
            { label: 'Combo pricing', value: 'combo' },
          ],
          style: { marginBottom: 16 },
        }),
      pickerMode !== 'individual' ? null : modalView === 'select'
        ? React.createElement('div', null,
          // Header
          React.createElement('div', { style: { marginBottom: 20 } },
            React.createElement('span', { style: { fontSize: 18, fontWeight: 700, color: C.text, fontFamily: FONT } }, 'Select Service'),
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
          React.createElement('div', { style: { maxHeight: 380, overflowY: 'auto', overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: DS.radius.md, marginBottom: 16 } },
            React.createElement('table', { style: { width: '100%', minWidth: 560, borderCollapse: 'collapse', fontFamily: FONT } },
              React.createElement('thead', null,
                React.createElement('tr', null,
                  React.createElement('th', { style: th({ width: 40, textAlign: 'center' }) }, '#'),
                  React.createElement('th', { style: th({ textAlign: 'left' }) }, 'Service Name'),
                  React.createElement('th', { style: th({ width: 150, textAlign: 'left' }) }, 'Type'),
                  React.createElement('th', { style: th({ width: 140, textAlign: 'right' }) }, 'Unit Price'),
                  React.createElement('th', { style: th({ width: 80, textAlign: 'center' }) }, 'Currency'),
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
                      React.createElement('td', { style: td({ textAlign: 'center', fontFamily: FONT_MONO, fontSize: 11.5, color: C.textSub }) }, getCurrencyCode(catalogCurrency)),
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
          )
        )
        : React.createElement('div', null,
          // Header
          React.createElement('div', { style: { marginBottom: 20 } },
            React.createElement('span', {
              onClick: () => setModalView('select'),
              style: { cursor: 'pointer', color: C.info, fontSize: 14, fontFamily: FONT, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }
            }, '← Back'),
            React.createElement('span', { style: { fontSize: 18, fontWeight: 700, color: C.text, fontFamily: FONT, marginLeft: 12 } }, 'Create New Service'),
          ),
          // Form body
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24, fontFamily: FONT } },
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12 } },
              React.createElement('div', { style: { flex: '2 1 200px', minWidth: 0 } },
                React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, 'Service Name *'),
                React.createElement(Input, {
                  placeholder: 'e.g., Labor contract consulting...',
                  value: newSvcName,
                  onChange: e => setNewSvcName(e.target.value),
                  style: { borderRadius: DS.radius.sm, height: 38 }
                })
              ),
              React.createElement('div', { style: { flex: '1 1 160px', minWidth: 0 } },
                React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, 'Service Type optional'),
                React.createElement(Input, {
                  placeholder: 'e.g., Consulting, Legal...',
                  value: newSvcType,
                  onChange: e => setNewSvcType(e.target.value),
                  style: { borderRadius: DS.radius.sm, height: 38 }
                })
              ),
            ),
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 } }, `Unit Price (${getCurrencyCode(newServiceCurrency)}) *`),
              React.createElement('div', { style: { display: 'flex', gap: 8 } },
                React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                  React.createElement(MoneyDraftInput, {
                    value: newUnitPrice,
                    onChange: setNewUnitPrice,
                    style: { width: '100%', borderRadius: DS.radius.sm, height: 38 },
                    placeholder: '0',
                    currency: newServiceCurrency,
                  })
                ),
                React.createElement('div', { style: { width: 130, flexShrink: 0 } },
                  React.createElement(Select, {
                    value: newSvcCurrencyId || undefined,
                    onChange: setNewSvcCurrencyId,
                    disabled: !currencies.length,
                    style: { width: '100%' },
                    options: currencyOptions,
                  })
                ),
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
      ,
      // COMBO TAB — same content as before (Segmented select/adhoc, catalog
      // list, applyComboFromCatalog, renderAdhocComboTab), now a mode
      // inside the unified picker instead of its own modal.
      pickerMode === 'combo' && React.createElement(React.Fragment, null,
      React.createElement(Segmented, {
        value: comboSubTab,
        onChange: (v) => setComboSubTab(v),
        options: [
          { label: 'Select Combo', value: 'select' },
          { label: 'New Combo', value: 'adhoc' },
        ],
        style: { marginBottom: 16 },
      }),
      comboSubTab === 'select'
        ? React.createElement(React.Fragment, null,
          React.createElement(Input, {
            placeholder: 'Search combo name...',
            value: comboSearch,
            onChange: (e) => setComboSearch(e.target.value),
            style: { marginBottom: 12, borderRadius: DS.radius.sm },
            allowClear: true,
          }),
          React.createElement('div', { style: { maxHeight: 380, overflowY: 'auto' } },
            comboCatalog.length === 0
              ? React.createElement(Empty, { description: 'No combos available' })
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
                    React.createElement('div', { style: { fontWeight: 600 } }, c.comboName || `Combo #${c.id}`),
                    React.createElement('div', { style: { fontSize: 12, color: C.textSub } },
                      `${(c.serviceComboItems || []).length} service(s)`),
                    (() => {
                      // Illustrative only — sums each service's own standalone
                      // basePrice × quantity so the user can see, at a glance,
                      // how much cheaper the package is vs. buying the lines
                      // separately. Does not touch packageSubTotal/totalAmount.
                      const comboCurrencyIdFallback = extractCurrencyId(currencyFromRecord(c, currencies, vndCurrency));
                      // Each item can be snapshotted in its own currency
                      // (item.currencyId), independent of the combo's own
                      // currency — convert every item (and the combo's own
                      // packageSubTotal) to VND so a combo mixing currencies
                      // still compares correctly.
                      const individualTotal = (c.serviceComboItems || []).reduce((sum, item) => {
                        const svc = item.services || {};
                        // serviceComboItems.price is a snapshot taken when the
                        // line was added to the combo — prefer it over the live
                        // services join so historical combos keep their original
                        // per-line price even if the catalog price changes later.
                        const price = parseNum(item.price ?? svc.basePrice ?? svc.unitPrice ?? svc.price ?? 0);
                        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
                        const itemCurrencyId = extractCurrencyId(item.currencyId) || comboCurrencyIdFallback;
                        const converted = convertComboAmountToVndSync(price * qty, itemCurrencyId);
                        return sum + converted.value;
                      }, 0);
                      const packagePrice = convertComboAmountToVndSync(
                        parseNum(c.packageSubTotal),
                        comboCurrencyIdFallback,
                      ).value;
                      const comboCur = vndCurrency;
                      const savings = individualTotal - packagePrice;
                      const savingsPct = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;
                      return React.createElement('div', { style: { fontSize: 12, marginTop: 2 } },
                        React.createElement('span', {
                          style: {
                            color: C.textSub,
                            textDecoration: savings !== 0 ? 'line-through' : 'none',
                          },
                        }, `Individual price: ${formatMoney(individualTotal, comboCur)}`),
                        React.createElement('span', { style: { margin: '0 6px', color: C.textSub } }, '·'),
                        React.createElement('span', { style: { fontWeight: 600 } }, `Package price: ${formatMoney(packagePrice, comboCur)}`),
                        savings > 0 && React.createElement('span', { style: { marginLeft: 6, color: C.success, fontWeight: 600 } },
                          `Save ${formatMoney(savings, comboCur)} (${savingsPct}%)`)
                      );
                    })()
                  ),
                  React.createElement(Button, {
                    size: 'small', type: 'primary', loading: applyingCombo,
                    onClick: () => applyComboFromCatalog(c),
                  }, 'Apply')
                ))
          )
        )
        : React.createElement(React.Fragment, null,
          React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 } },
            React.createElement('div', { style: { flex: '2 1 220px', minWidth: 0 } },
              React.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Combo Name'),
              React.createElement(Input, {
                value: adhocComboName,
                onChange: (e) => setAdhocComboName(e.target.value),
                placeholder: 'E.g. Business incorporation consulting combo...',
                style: { borderRadius: DS.radius.sm },
              })
            ),
            React.createElement('div', { style: { flex: '1 1 160px', minWidth: 0 } },
              React.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Combo Type (optional)'),
              React.createElement(Input, {
                value: adhocComboType,
                onChange: (e) => setAdhocComboType(e.target.value),
                placeholder: 'E.g. Business, Education...',
                style: { borderRadius: DS.radius.sm },
              })
            ),
          ),
          React.createElement('div', { style: { marginBottom: 12 } },
            React.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Combo final price'),
            React.createElement('div', { style: { display: 'flex', gap: 8 } },
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement(MoneyDraftInput, {
                  value: comboFinalPrice,
                  onChange: setComboFinalPrice,
                  style: { width: '100%' },
                  placeholder: '0',
                  currency: comboCurrency,
                }),
              ),
              React.createElement('div', { style: { width: 130, flexShrink: 0 } },
                React.createElement(Select, {
                  value: comboCurrencyId || undefined,
                  onChange: setComboCurrencyId,
                  disabled: !currencies.length,
                  style: { width: '100%' },
                  options: currencyOptions,
                }),
              ),
            ),
          ),
          React.createElement('div', { style: { marginBottom: 12 } },
            React.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Services in this combo'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
              React.createElement(Select, {
                value: comboItemPick,
                onChange: (v) => {
                  const svc = svcOpts.find((o) => String(o.id) === String(v));
                  if (svc) addComboCatalogItem(svc);
                },
                showSearch: true,
                optionFilterProp: 'children',
                style: { flex: '1 1 200px', minWidth: 0 },
                placeholder: 'Add from catalog...',
              }, svcOpts
                .filter((s) => !comboItems.some((it) => it.source === 'catalog' && String(it.serviceId) === String(s.id)))
                .map((s) => React.createElement(Select.Option, {
                  key: s.id, value: s.id,
                }, s.serviceName || s.name || `Service #${s.id}`))),
              React.createElement(Button, { onClick: addComboCustomItem }, '+ Add custom service'),
            ),
          ),
          comboItems.length > 0 &&
            React.createElement('div', { style: { overflowX: 'auto', marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: DS.radius.sm } },
            React.createElement('table', { style: { width: '100%', minWidth: 720, borderCollapse: 'collapse', tableLayout: 'fixed' } },
              React.createElement('thead', null,
                React.createElement('tr', null,
                  React.createElement('th', { style: th({ width: 28, textAlign: 'center' }) }, '#'),
                  React.createElement('th', { style: th({ width: '28%' }) }, 'Service name'),
                  React.createElement('th', { style: th({ width: 100 }) }, 'Type'),
                  React.createElement('th', { style: th({ width: 210 }) }, 'Unit Price'),
                  React.createElement('th', { style: th() }, 'Description'),
                  React.createElement('th', { style: th({ width: 36 }) }, ''),
                )
              ),
              React.createElement('tbody', null,
                comboItems.map((item, idx) =>
                  React.createElement('tr', { key: item._id, style: { background: item.source === 'custom' ? '#fffbe6' : '#fff' } },
                    React.createElement('td', { style: td({ textAlign: 'center', color: C.textSub, fontFamily: FONT_MONO, fontSize: 11.5 }) }, idx + 1),
                    React.createElement('td', { style: td() },
                      item.source === 'catalog'
                        ? React.createElement('span', { style: { fontWeight: 600, color: C.text } }, item.serviceName)
                        : React.createElement(Input, {
                          size: 'small',
                          value: item.serviceName,
                          onChange: (e) => updateComboItem(item._id, 'serviceName', e.target.value),
                          placeholder: 'New service name...',
                        }),
                    ),
                    React.createElement('td', { style: td() },
                      item.source === 'catalog'
                        ? React.createElement('span', { style: { color: C.textSub, fontSize: 12.5 } }, item.serviceType || '—')
                        : React.createElement(Input, {
                          size: 'small',
                          value: item.serviceType,
                          onChange: (e) => updateComboItem(item._id, 'serviceType', e.target.value),
                          placeholder: 'Type (optional)...',
                        }),
                    ),
                    React.createElement('td', { style: td() },
                      item.source === 'catalog'
                        ? React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 } },
                          React.createElement('span', { style: { color: C.text, fontSize: 12.5, fontFamily: FONT_MONO } }, formatMoney(item.basePrice || 0, resolveCurrency(item.currencyId, currencies) || contractCurrency)),
                          React.createElement('span', { style: { color: C.textSub, fontSize: 11.5, fontFamily: FONT_MONO } }, getCurrencyCode(resolveCurrency(item.currencyId, currencies) || contractCurrency)),
                        )
                        : React.createElement('div', { style: { display: 'flex', gap: 6 } },
                          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                            React.createElement(MoneyDraftInput, {
                              value: item.basePrice || 0,
                              onChange: (v) => updateComboItem(item._id, 'basePrice', v),
                              style: { width: '100%' },
                              placeholder: '0',
                              currency: resolveCurrency(item.currencyId, currencies) || contractCurrency,
                            }),
                          ),
                          React.createElement('div', { style: { width: 80, flexShrink: 0 } },
                            React.createElement(Select, {
                              size: 'small',
                              value: item.currencyId ? String(item.currencyId) : undefined,
                              onChange: (v) => updateComboItem(item._id, 'currencyId', v),
                              disabled: !currencies.length,
                              style: { width: '100%' },
                              options: currencyOptions,
                            }),
                          ),
                        ),
                    ),
                    React.createElement('td', { style: td() },
                      item.source === 'catalog'
                        ? React.createElement('span', { style: { color: C.textSub, fontSize: 12.5 } }, item.description || '—')
                        : React.createElement(Input, {
                          size: 'small',
                          value: item.description,
                          onChange: (e) => updateComboItem(item._id, 'description', e.target.value),
                          placeholder: 'Description (optional)...',
                        }),
                    ),
                    React.createElement('td', { style: td({ textAlign: 'center' }) },
                      React.createElement(Button, { type: 'text', danger: true, size: 'small', onClick: () => removeComboItem(item._id) }, '×'),
                    ),
                  )
                )
              ),
            )),
          comboItems.length > 0 &&
            (() => {
              const conversions = comboItems.map((it) => convertComboAmountToVndSync(it.basePrice, it.currencyId));
              const originalTotalVnd = conversions.reduce((sum, c) => sum + c.value, 0);
              const pendingRateCount = conversions.filter((c) => !c.ok).length;
              const finalPriceVnd = convertComboAmountToVndSync(comboFinalPrice, comboCurrencyId).value;
              const delta = finalPriceVnd - originalTotalVnd;
              return React.createElement(
                'div',
                { style: { marginBottom: 12, fontSize: 11.5, color: C.textSub, display: 'flex', flexWrap: 'wrap', gap: 6 } },
                React.createElement('span', null, `Individual price (converted to VND): ${formatMoney(originalTotalVnd, vndCurrency)}`),
                pendingRateCount > 0 &&
                  React.createElement('span', null, `(loading exchange rate for ${pendingRateCount} services...)`),
                delta < 0 &&
                  React.createElement('span', { style: { color: '#52c41a', fontWeight: 600 } }, `Decrease ${formatMoney(-delta, vndCurrency)}`),
                delta > 0 &&
                  React.createElement('span', { style: { color: '#faad14', fontWeight: 600 } }, `Increase ${formatMoney(delta, vndCurrency)}`),
              );
            })(),
          React.createElement(
            'label',
            {
              style: {
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px',
                borderRadius: DS.radius.sm, background: '#e6f4ff', border: '1px solid #91caff',
                cursor: 'pointer', fontSize: 12.5, color: C.text, marginBottom: 12,
              },
            },
            React.createElement('input', {
              type: 'checkbox',
              checked: comboSaveToCatalog,
              onChange: (e) => setComboSaveToCatalog(e.target.checked),
              style: { marginTop: 2, cursor: 'pointer' },
            }),
            React.createElement(
              'span',
              null,
              'Also save this combo to the shared catalog (created only after you finish saving this contract). Custom services in it already get their own "Save to catalog?" chance after Save — this just adds the combo itself as a reusable catalog entry.',
            ),
          ),
          React.createElement(Button, {
            type: 'primary', loading: applyingCombo, onClick: applyAdhocCombo, style: DS.primaryButton,
          }, 'Submit')
        )
      )
    ),

    // SAVE TO CATALOG? — appears once after Save, only if this session
    // created at least one custom-named (non-catalog) row.
    React.createElement(Modal, {
      title: 'Save to catalog?',
      open: showCatalogPrompt,
      onCancel: handleSkipCatalogPrompt,
      maskClosable: false,
      footer: React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
        React.createElement(Button, { onClick: handleSkipCatalogPrompt }, 'Skip'),
        React.createElement(Button, {
          type: 'primary',
          loading: catalogSaving,
          onClick: handleSaveSelectedToCatalog,
        }, 'Save selected'),
      ),
      width: 640,
      style: { maxWidth: 'calc(100vw - 24px)' },
      bodyStyle: { maxHeight: '70vh', overflowY: 'auto' },
    },
      React.createElement('div', { style: { marginBottom: 12, color: C.textSub, fontSize: 13 } },
        "These services were typed manually and aren't in the standardized services catalog yet. Check any you'd like to add, so future contracts can pick them from the catalog instead of retyping them.",
      ),
      React.createElement('div', { style: { display: 'grid', gap: 8 } },
        catalogPromptRows.map((r) => React.createElement('div', {
          key: r.id,
          style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: DS.radius.sm, background: r._alreadyInCatalog ? C.bgSection : '#fff' },
        },
          r._alreadyInCatalog
            ? React.createElement('div', { style: { width: 16 } })
            : React.createElement('input', {
              type: 'checkbox',
              checked: !!catalogPromptChecked[r.id],
              onChange: () => toggleCatalogPromptRow(r.id),
              style: { marginTop: 3 },
            }),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 600, color: C.text } }, r._svcName),
            React.createElement('div', { style: { fontSize: 12, color: C.textSub } },
              [r._serviceType, formatMoney(r._basePrice || 0, getRowCurrency(r))].filter(Boolean).join(' · '),
            ),
          ),
          r._alreadyInCatalog && React.createElement(Tag, { color: 'default' }, 'Already in the catalog'),
        )),
      ),
    )
  );
};

ctx.render(React.createElement(ContractServicesBlock, null));
