const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const {
  Spin,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card: AntCard,
  Space,
  Rate,
  Segmented,
} = ctx.antd;

const FONT = "inherit";
const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
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
const DEFAULT_CURRENCY_CODE = "VND";
const CURRENCY_RESOURCE_CANDIDATES = ["currencies:list", "currency:list", "Currency:list"];
const EXCHANGE_RATE_RESOURCE_CANDIDATES = ["exchangeRates:list", "exchangeRate:list", "ExchangeRates:list"];
const PROJECT_TEMPLATE_FIELDS =
  "id,templateFileId,serviceId,templateId,templateName,description,sortOrder,previousTaskId";

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
      value.code ||
        value.currencyCode ||
        value.isoCode ||
        value.title ||
        value.label ||
        value.name,
    );
  const match = String(value).trim().toUpperCase().match(/\b[A-Z]{3}\b/);
  return match ? match[0] : "";
};
const getRecordCurrencyId = (record) =>
  extractCurrencyId(
    record?.currencyId ||
      record?.currency ||
      record?.currencies ||
      record?.defaultCurrencyId ||
      record?.defaultCurrency,
  );
const getRecordCurrencyCode = (record) =>
  extractCurrencyCode(
    record?.currencyCode ||
      record?.currency ||
      record?.currencies ||
      record?.defaultCurrencyCode ||
      record?.defaultCurrency,
  );
const getCurrencyCode = (currency) =>
  String(
    currency?.code ||
      currency?.currencyCode ||
      currency?.name ||
      DEFAULT_CURRENCY_CODE,
  ).toUpperCase();
const getCurrencyDecimals = (currency) => {
  const explicit = Number(currency?.decimalPlaces ?? currency?.precision);
  if (Number.isFinite(explicit)) return Math.max(0, explicit);
  return getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE ? 0 : 2;
};
const getCurrencyLocale = (currency) =>
  currency?.locale || (getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE ? "vi-VN" : "en-US");
const defaultCurrencyObject = () => ({
  code: DEFAULT_CURRENCY_CODE,
  symbol: "VND",
  decimalPlaces: 0,
  locale: "vi-VN",
});
const neutralCurrencyObject = () => ({
  code: "",
  decimalPlaces: 2,
  locale: "en-US",
});
const findCurrencyById = (currencies = [], id) => {
  const safeId = extractCurrencyId(id);
  if (!safeId) return null;
  return currencies.find((currency) => extractCurrencyId(currency?.id) === safeId) || null;
};
const findCurrencyByCode = (currencies = [], code) => {
  const safeCode = extractCurrencyCode(code);
  if (!safeCode) return null;
  return (
    currencies.find((currency) => extractCurrencyCode(currency) === safeCode) ||
    null
  );
};
const currencyObjectFromCode = (code) => {
  const safeCode = extractCurrencyCode(code);
  return safeCode ? { code: safeCode, currencyCode: safeCode, decimalPlaces: safeCode === DEFAULT_CURRENCY_CODE ? 0 : 2 } : null;
};
const findDefaultCurrency = (currencies = []) =>
  currencies.find((currency) => currency?.isBaseCurrency || getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE) ||
  currencies[0] ||
  defaultCurrencyObject();
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
  defaultCurrencyObject();
const currencyFromRecordOptional = (record, currencies = [], fallback = null) =>
  resolveCurrency(record?.currency || record?.currencies || record?.currencyId, currencies) ||
  resolveCurrency(getRecordCurrencyId(record), currencies) ||
  resolveCurrency(getRecordCurrencyCode(record), currencies) ||
  resolveCurrency(fallback, currencies);
const currencySelectLabel = (currency) => {
  const code = getCurrencyCode(currency);
  return code;
};
const formatMoneyAmount = (value, currency = null) => {
  if (!value && value !== 0) return "-";
  const info = currency || defaultCurrencyObject();
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const decimals = getCurrencyDecimals(info);
  return n.toLocaleString(getCurrencyLocale(info), {
    minimumFractionDigits: decimals > 0 ? 0 : 0,
    maximumFractionDigits: decimals,
  });
};
const formatMoney = (value, currency = null) => {
  if (!value && value !== 0) return "-";
  const info = currency || defaultCurrencyObject();
  return `${formatMoneyAmount(value, info)} ${getCurrencyCode(info)}`;
};
const fmtVND = (n) => formatMoney(n, defaultCurrencyObject());
const formatMoneyDraft = (value, currency = null) => {
  if (value === undefined || value === null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const info = currency || neutralCurrencyObject();
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: getCurrencyDecimals(info),
  });
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
const getExchangeRateCurrencyId = (rate, side) =>
  extractCurrencyId(rate?.[`${side}CurrencyId`] || rate?.[`${side}Currency`]);
const getExchangeRateCurrencyCode = (rate, side) =>
  extractCurrencyCode(rate?.[`${side}Currency`] || rate?.[`${side}CurrencyCode`]);
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
      return {
        record: rate,
        rate: parseNum(rate?.rate),
        effectiveMs: effectiveMs || 0,
      };
    })
    .filter(
      (item) =>
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
    return {
      ...inverse,
      direction: "inverse",
      originalRate: inverse.rate,
      rate: 1 / inverse.rate,
    };
  }
  return null;
};
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
const isSameCurrency = (left, right) => {
  const leftId = extractCurrencyId(left);
  const rightId = extractCurrencyId(right);
  if (leftId && rightId) return leftId === rightId;
  const leftCode = extractCurrencyCode(left) || getCurrencyCode(left || {});
  const rightCode = extractCurrencyCode(right) || getCurrencyCode(right || {});
  return !!leftCode && !!rightCode && leftCode === rightCode;
};
const getFinancialRowBillingMode = (row, { packageMode, activeFinancialSourceType } = {}) =>
  row?.billingMode ||
  billingModeForContext({
    fromQuotation: !!row?._fromQuotation,
    packageMode: !!packageMode,
    hasFinancialSource: activeFinancialSourceType && activeFinancialSourceType !== SOURCE_NONE,
  });
const buildServiceFinancialSummary = ({
  rows = [],
  currencies = [],
  baseCurrency = null,
  exchangeRates = [],
  pricingDate,
  packageMode = false,
  activeFinancialSourceType = SOURCE_MANUAL,
  includeBillingModes = [BILLING_LINE, BILLING_SEPARATE],
} = {}) => {
  const targetCurrency = baseCurrency || findDefaultCurrency(currencies);
  const includeSet = new Set(includeBillingModes);
  const byCurrency = {};
  const lineItems = [];

  (rows || []).forEach((row) => {
    if (!row?.serviceName?.trim() || packageMode) return;
    const billingMode = getFinancialRowBillingMode(row, {
      packageMode,
      activeFinancialSourceType,
    });
    if (!includeSet.has(billingMode)) return;

    const price = Number(row.basePrice) || 0;
    const vatPct = Number(row.vat) || 0;
    const amounts = calcLineAmounts(price, vatPct);
    const rowCurrency = currencyFromRecord(row, currencies, targetCurrency);
    const key =
      extractCurrencyId(row.currencyId) ||
      extractCurrencyId(rowCurrency) ||
      getCurrencyCode(rowCurrency);

    if (!byCurrency[key]) {
      byCurrency[key] = {
        currency: rowCurrency,
        subTotal: 0,
        vatAmount: 0,
        totalAmount: 0,
        lineCount: 0,
      };
    }
    byCurrency[key].subTotal += amounts.subTotal;
    byCurrency[key].vatAmount += amounts.vatAmount;
    byCurrency[key].totalAmount += amounts.totalAmount;
    byCurrency[key].lineCount += 1;
    lineItems.push({
      row,
      billingMode,
      currency: rowCurrency,
      ...amounts,
    });
  });

  const groups = Object.values(byCurrency);
  const missing = [];
  const converted = groups.reduce(
    (acc, group) => {
      const sameCurrency = isSameCurrency(group.currency, targetCurrency);
      const matched = sameCurrency
        ? { rate: 1, direction: "base", record: null }
        : pickConversionRate(exchangeRates, group.currency, targetCurrency, pricingDate);
      if (!matched?.rate) {
        missing.push(group);
        return acc;
      }
      const convertedSubTotal = Math.round(group.subTotal * matched.rate);
      const convertedVatAmount = Math.round(group.vatAmount * matched.rate);
      return {
        subTotal: acc.subTotal + convertedSubTotal,
        vatAmount: acc.vatAmount + convertedVatAmount,
        totalAmount: acc.totalAmount + convertedSubTotal + convertedVatAmount,
      };
    },
    { subTotal: 0, vatAmount: 0, totalAmount: 0 },
  );

  return {
    groups,
    lineItems,
    missing,
    converted: {
      ...converted,
      canConvert: missing.length === 0,
      currency: targetCurrency,
    },
  };
};
const getConversionSourceCurrencyIds = (groups = [], baseCurrency = null) =>
  Array.from(
    new Set(
      (groups || [])
        .filter((group) => !isSameCurrency(group.currency, baseCurrency))
        .map((group) => extractCurrencyId(group.currency))
        .filter(Boolean),
    ),
  );
const formatMissingRatePairs = (groups = [], baseCurrency = null) => {
  const baseCode = getCurrencyCode(baseCurrency || defaultCurrencyObject());
  return (groups || [])
    .map((group) => `${getCurrencyCode(group.currency)} -> ${baseCode}`)
    .join(", ");
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

async function fetchAll(url, params = {}) {
  try {
    const r = await ctx.api.request({
      url,
      params: { pageSize: 500, page: 1, ...params },
    });
    return r?.data?.data || [];
  } catch {
    return [];
  }
}

async function fetchCompanyServices() {
  const appendProfiles = [
    ["services", "currencies"],
    ["service", "currencies"],
    ["services", "currency"],
    ["service", "currency"],
    ["currencies"],
    ["currency"],
    ["services"],
    ["service"],
    [],
  ];
  for (const appends of appendProfiles) {
    const rows = await fetchAll(
      "companyServices:list",
      appends.length ? { appends } : {},
    );
    if (Array.isArray(rows) && rows.length) return rows;
  }
  return [];
}

async function fetchAllFromCandidates(urls = []) {
  for (const url of urls) {
    try {
      const rows = await fetchAll(url);
      if (Array.isArray(rows) && rows.length) return rows;
    } catch { }
  }
  return [];
}

// Companies whose cases follow the auto-numbered PREFIX + STT(3) + MM + YYYY
// caseCode convention. Each company has its own code prefix.
const CASE_CODE_PREFIX_BY_SHORT_NAME = {
  CBI: "C",
  VLIC: "V",
};

function caseCodeDateParts(dateValue) {
  const d = dateValue ? new Date(dateValue) : new Date();
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  return {
    mm: String(safeDate.getMonth() + 1).padStart(2, "0"),
    yyyy: safeDate.getFullYear(),
  };
}

// STT is scoped per internal company: CBI and VLIC each keep their own
// independent running sequence, so both companies can safely reuse
// 001, 002, ... within the same month without colliding with each other.
async function generateCaseCode({ internalCompanyId, shortName, dateValue }) {
  const normalizedShortName = String(shortName || "").trim().toUpperCase();
  const prefix = CASE_CODE_PREFIX_BY_SHORT_NAME[normalizedShortName];
  if (!internalCompanyId || !prefix) {
    return null;
  }

  const { mm, yyyy } = caseCodeDateParts(dateValue);
  const suffix = `${mm}${yyyy}`;
  const pattern = new RegExp(`^${prefix}(\\d{3})${suffix}$`, "i");

  const rows = await fetchAll("projects:list", {
    pageSize: 1000,
    sort: ["-createdAt"],
    filter: JSON.stringify({
      internalCompanyId: { $eq: parseInt(internalCompanyId, 10) },
    }),
  });

  const maxIndex = (rows || []).reduce((max, item) => {
    const code = String(item?.caseCode || "");
    const match = code.match(pattern);
    return match ? Math.max(max, parseInt(match[1], 10) || 0) : max;
  }, 0);

  return `${prefix}${String(maxIndex + 1).padStart(3, "0")}${suffix}`;
}

async function fetchExchangeRatesForConversion(fromCurrencyIds = [], toCurrencyId) {
  const toId = extractCurrencyId(toCurrencyId);
  const fromIds = Array.from(
    new Set(
      (fromCurrencyIds || [])
        .map((id) => extractCurrencyId(id))
        .filter((id) => id && id !== toId),
    ),
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
            pageSize,
            page: 1,
            appends: ["fromCurrency", "toCurrency"],
            sort: ["-effectiveDate", "-createdAt"],
            filter: JSON.stringify(filter),
          },
        });
        const rows = r?.data?.data || [];
        if (Array.isArray(rows) && rows.length) {
          rows.forEach((row) => {
            if (!collected.some((item) => String(item.id) === String(row.id))) collected.push(row);
          });
        }
      } catch { }
    }
    if (collected.length) return collected;
  }

  if (fromIds.length > 25) return [];

  const collected = [];
  for (const url of EXCHANGE_RATE_RESOURCE_CANDIDATES) {
    for (const fromId of fromIds) {
      for (const filter of [
        { fromCurrencyId: { $eq: fromId }, toCurrencyId: { $eq: toId } },
        { fromCurrencyId: { $eq: toId }, toCurrencyId: { $eq: fromId } },
      ]) {
        try {
          const r = await ctx.api.request({
            url,
            params: {
              pageSize: 20,
              page: 1,
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
    }
    if (collected.length) return collected;
  }
  return collected;
}

// ── Fetch quotationServices by quotationId ──
async function fetchProjectTemplates() {
  const candidates = ["projectTemplates:list", "taskTemplates:list", "taskTemplate:list"];
  for (const url of candidates) {
    try {
      const r = await ctx.api.request({
        url,
        params: {
          pageSize: 500,
          page: 1,
          fields: PROJECT_TEMPLATE_FIELDS,
        },
      });
      const rows = r?.data?.data || [];
      if (Array.isArray(rows)) return rows;
    } catch { }
  }
  return [];
}

const runtimeCompact = (items = []) =>
  items
    .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
    .filter(Boolean);

const runtimeExtractId = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return runtimeExtractId(value[0]);
  if (typeof value === "object") return runtimeExtractId(value.id || value.value || value.key);
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};
const getInternalCompanyId = (record) =>
  runtimeExtractId(
    record?.internalCompanyId ||
    record?.internalCompany ||
    record?.companyId ||
    record?.company ||
    record?.service?.internalCompanyId ||
    record?.service?.internalCompany ||
    record?.services?.internalCompanyId ||
    record?.services?.internalCompany,
  );
const isSameInternalCompany = (record, internalCompanyId) => {
  const recordCompanyId = getInternalCompanyId(record);
  const selectedCompanyId = runtimeExtractId(internalCompanyId);
  return !!recordCompanyId && !!selectedCompanyId && recordCompanyId === selectedCompanyId;
};

const SYSTEM_USER_ID = 1;
const DEFAULT_REFRESH_BLOCK_UID = "28507lshptk";
const QUICK_CREATE_CREATED_EVENT = "law:quick-create:created";
const QUICK_CREATE_BRIDGE_KEY = "__lawQuickCreateBridge";
const CONTRACT_DATA_BLOCK_UID = "7be57facee6";
const QUOTATION_DATA_BLOCK_UID = "sowlvtiiqkv";
// Additional data blocks to refresh after a case is created: the case list
// block sitting behind this create popup, plus the Contract/Quotation list
// blocks — a new case can auto-link or auto-create records there too, and
// those blocks otherwise go stale until the user clicks their own Refresh.
const ADDITIONAL_REFRESH_BLOCK_UIDS = ["kzutpyp7eno", CONTRACT_DATA_BLOCK_UID, QUOTATION_DATA_BLOCK_UID];
const QUICK_CREATE_COLLECTION_BY_VIEW = {
  customerCreate: "customers",
  contractCreate: "contracts",
  quotationCreate: "quotations",
};
const QUICK_CREATE_REFRESH_BLOCK_UID_BY_VIEW = {
  contractCreate: CONTRACT_DATA_BLOCK_UID,
  quotationCreate: QUOTATION_DATA_BLOCK_UID,
};
const mergeRecordById = (items = [], record) => {
  const id = runtimeExtractId(record?.id || record);
  if (!id || !record || typeof record !== "object") return items || [];
  const found = (items || []).some((item) => String(runtimeExtractId(item?.id || item)) === String(id));
  if (found) {
    return (items || []).map((item) =>
      String(runtimeExtractId(item?.id || item)) === String(id)
        ? { ...item, ...record, id }
        : item,
    );
  }
  return [{ ...record, id }, ...(items || [])];
};

const getQuickCreateBridge = () => {
  const scope = ctx.engine || ctx.app || (typeof window !== "undefined" ? window : null);
  if (!scope) return null;
  if (!scope[QUICK_CREATE_BRIDGE_KEY]) {
    const listeners = new Set();
    const recent = [];
    scope[QUICK_CREATE_BRIDGE_KEY] = {
      emit(detail) {
        const payload = { ...(detail || {}), emittedAt: Date.now() };
        recent.unshift(payload);
        if (recent.length > 20) recent.pop();
        listeners.forEach((listener) => {
          try {
            listener(payload);
          } catch (error) {
            console.warn("[CaseCreateForm] quick-create bridge listener failed", error);
          }
        });
      },
      subscribe(listener, options = {}) {
        if (typeof listener !== "function") return () => {};
        listeners.add(listener);
        if (options.replay) {
          recent.forEach((detail) => {
            try {
              listener(detail);
            } catch (error) {
              console.warn("[CaseCreateForm] quick-create bridge replay failed", error);
            }
          });
        }
        return () => listeners.delete(listener);
      },
    };
  }
  return scope[QUICK_CREATE_BRIDGE_KEY];
};

const isSystemUserId = (value) => runtimeExtractId(value) === SYSTEM_USER_ID;
const filterSelectableLawyers = (items = []) =>
  (items || []).filter((item) => {
    const linkedUserId =
      runtimeExtractId(item?.userId) ||
      runtimeExtractId(item?.user) ||
      runtimeExtractId(item?.users) ||
      runtimeExtractId(item?.accountId) ||
      runtimeExtractId(item?.account);
    return linkedUserId ? !isSystemUserId(linkedUserId) : !isSystemUserId(item?.id);
  });
const getLawyerLinkedUserId = (item) =>
  runtimeExtractId(item?.userId) ||
  runtimeExtractId(item?.user) ||
  runtimeExtractId(item?.users) ||
  runtimeExtractId(item?.accountId) ||
  runtimeExtractId(item?.account);

const getRuntimeInput = () => {
  try {
    const inputArgs = ctx.view?.inputArgs || ctx.inputArgs || {};
    return {
      ...(inputArgs || {}),
      ...(inputArgs.params || {}),
      ...(ctx.action?.params || {}),
      ...(ctx.modal?.params || {}),
      ...(ctx.view?.params || {}),
      ...(ctx.popup?.params || {}),
      ...(ctx.params || {}),
    };
  } catch {
    return {};
  }
};

const getBlockModelByUid = (uid) => {
  if (!uid) return null;
  const engine = ctx.engine || ctx.app;
  try {
    return (
      ctx.getModel?.(uid, true) ||
      ctx.getModel?.(uid) ||
      engine?.getModel?.(uid) ||
      (ctx.app && ctx.app !== engine ? ctx.app?.getModel?.(uid) : null) ||
      null
    );
  } catch (error) {
    console.warn("[CaseCreateForm] get model failed", uid, error);
    return null;
  }
};

const refreshBlockModel = async (blockModel) => {
  if (!blockModel) return false;
  try {
    const resource = blockModel.resource;
    if (resource && typeof resource.refresh === "function") {
      await resource.refresh();
      return true;
    }
    if (typeof blockModel.refresh === "function") {
      await blockModel.refresh();
      return true;
    }
  } catch (error) {
    console.warn("[CaseCreateForm] refresh failed", error);
  }
  return false;
};

// ctx.getModel(uid)/engine.getModel(uid) do not actually resolve blocks by a
// foreign UID in this NocoBase runtime (verified against ContractCreateForm.js:
// even a UID copied straight from the block's own "Copy UID" menu returns
// nothing) — there is no documented cross-block "get model by uid" API (see
// nocobase-docs/runjs-ctx-api.md). The one thing that reliably updates the
// list is a real click on its own "Refresh" button, so simulate that via
// the DOM instead of guessing at model APIs.
const REFRESH_BUTTON_TEXT_VARIANTS = ["refresh", "làm mới", "tải lại", "reload"];
const clickVisibleRefreshButtons = () => {
  try {
    const candidates = Array.from(document.querySelectorAll("button, [role='button']"));
    const matches = candidates.filter((el) => {
      const text = (el.textContent || "").trim().toLowerCase();
      return REFRESH_BUTTON_TEXT_VARIANTS.includes(text);
    });
    matches.forEach((el) => {
      try {
        el.click();
      } catch (error) {
        console.warn("[CaseCreateForm][refresh-debug] click failed on refresh button", error);
      }
    });
    return matches.length > 0;
  } catch (error) {
    console.warn("[CaseCreateForm][refresh-debug] clickVisibleRefreshButtons failed", error);
    return false;
  }
};

const refreshNocoBaseDataBlocks = async () => {
  const input = getRuntimeInput();
  const uidCandidates = Array.from(
    new Set(
      runtimeCompact([
        input.targetBlockUid,
        input.sourceBlockUid,
        input.blockUid,
        input.dataBlockUid,
        DEFAULT_REFRESH_BLOCK_UID,
        ...ADDITIONAL_REFRESH_BLOCK_UIDS,
      ]),
    ),
  );

  let refreshedAny = false;
  for (const uid of uidCandidates) {
    const refreshed = await refreshBlockModel(getBlockModelByUid(uid));
    refreshedAny = refreshedAny || refreshed;
  }

  if (!refreshedAny) {
    refreshedAny = await refreshBlockModel(ctx.blockModel || ctx.model);
  }

  const clickedRefreshButton = clickVisibleRefreshButtons();
  refreshedAny = refreshedAny || clickedRefreshButton;

  return refreshedAny;
};

const closePopupAfterSubmit = async () => {
  await refreshNocoBaseDataBlocks();
  return closeCurrentPopup();
};

const closeCurrentPopup = () => {
  const calls = [
    [ctx.view, "close", []],
    [ctx, "onClose", []],
    [ctx, "close", []],
    [ctx.popup, "onClose", []],
    [ctx.popup, "close", []],
    [ctx.popup, "closeModal", []],
    [ctx.modal, "onClose", []],
    [ctx.modal, "close", []],
    [ctx.drawer, "onClose", []],
    [ctx.drawer, "close", []],
    [ctx.action, "onClose", []],
    [ctx.action, "close", []],
    [ctx.popup, "setVisible", [false]],
    [ctx.modal, "setVisible", [false]],
    [ctx.modal, "setOpen", [false]],
    [ctx.drawer, "setOpen", [false]],
  ];

  for (const [target, method, args] of calls) {
    if (target && typeof target[method] === "function") {
      try {
        target[method](...(args || []));
        return true;
      } catch (error) {
        console.warn("[CaseCreateForm] close popup failed", error);
      }
    }
  }
  return false;
};

const showDiscardConfirm = (onOk) => {
  if (showDiscardConfirm._open) return;
  const run = async () => {
    try {
      await onOk?.();
    } catch (error) {
      console.warn("[CaseCreateForm] discard close failed", error);
    } finally {
      showDiscardConfirm._open = false;
    }
  };

  if (Modal?.confirm) {
    showDiscardConfirm._open = true;
    Modal.confirm({
      title: "Discard changes?",
      content: "Your unsaved input will be lost.",
      okText: "Discard",
      cancelText: "Continue editing",
      okButtonProps: { danger: true },
      maskClosable: false,
      onCancel: () => {
        showDiscardConfirm._open = false;
      },
      onOk: run,
    });
    return;
  }
  run();
};

const configureGuardedModalClose = (requestClose) => {
  if (typeof requestClose !== "function") return;
  const restoreFns = [];
  const props = {
    maskClosable: true,
    keyboard: false,
    onCancel: requestClose,
    onClose: requestClose,
  };
  [
    [ctx.view, "setProps"],
    [ctx.view, "setOptions"],
    [ctx.popup, "setProps"],
    [ctx.popup, "setOptions"],
    [ctx.modal, "setProps"],
    [ctx.modal, "setOptions"],
    [ctx.drawer, "setProps"],
    [ctx.drawer, "setOptions"],
    [ctx.action, "setProps"],
  ].forEach(([target, method]) => {
    if (target && typeof target[method] === "function") {
      try {
        target[method](props);
      } catch (error) {
        console.warn("[CaseCreateForm] configure modal close failed", error);
      }
    }
  });

  const patchMethod = (target, method) => {
    if (!target || typeof target[method] !== "function") return;
    const original = target[method];
    const patchedClose = function patchedClose(...args) {
      const isSetter = method === "setVisible" || method === "setOpen";
      if (isSetter && args[0] !== false) return original.apply(this, args);
      requestClose(() => original.apply(this, args));
      return undefined;
    };
    try {
      target[method] = patchedClose;
    } catch (error) {
      console.warn("[CaseCreateForm] patch close failed", error);
      return;
    }
    restoreFns.push(() => {
      if (target[method] !== patchedClose) return;
      try {
        target[method] = original;
      } catch {}
    });
  };

  [ctx.view, ctx.popup, ctx.modal, ctx.drawer, ctx.action, ctx].forEach(
    (target) => {
      ["onClose", "close", "closeModal", "setVisible", "setOpen"].forEach(
        (method) => patchMethod(target, method),
      );
    },
  );

  return () => {
    restoreFns.forEach((restore) => {
      try {
        restore();
      } catch {}
    });
  };
};

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
    const rowCurrencyId =
      getRecordCurrencyId(s) ||
      getRecordCurrencyId(s.service) ||
      getRecordCurrencyId(quotation);
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
      currencyId: rowCurrencyId ? String(rowCurrencyId) : null,
      _sourceCurrencyId: rowCurrencyId ? String(rowCurrencyId) : null,
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
    const rowCurrencyId =
      getRecordCurrencyId(s) ||
      getRecordCurrencyId(serviceRecord) ||
      getRecordCurrencyId(contract);
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
      currencyId: rowCurrencyId ? String(rowCurrencyId) : null,
      _sourceCurrencyId: rowCurrencyId ? String(rowCurrencyId) : null,
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
  border: "#d9d9d9",
  borderFocus: "#1677ff",
  text: "rgba(0, 0, 0, 0.88)",
  textSub: "rgba(0, 0, 0, 0.45)",
  textLabel: "rgba(0, 0, 0, 0.88)",
  primary: "#1677ff",
  danger: "#ff4d4f",
  success: "#52c41a",
  warning: "#faad14",
  bgCard: "#ffffff",
  bgSection: "#fafafa",
  bgHighlight: "#fafafa",
  borderHighlight: "#d9d9d9",
};

const inp = (ex = {}) => ({
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "4px 11px",
  minHeight: 32,
  fontSize: 14,
  fontFamily: FONT,
  outline: "none",
  color: C.text,
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
  transition: "all 0.2s",
  lineHeight: "22px",
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
  if (Rate) {
    const priorityToStars = { low: 1, medium: 2, high: 3 };
    const starsToPriority = { 1: "low", 2: "medium", 3: "high" };
    const currentStars = priorityToStars[value] || 0;
    const currentOpt = PRIORITY_OPTIONS.find((p) => p.value === value);
    return React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 12, minHeight: 32 } },
      React.createElement(Rate, {
        count: 3,
        allowClear: false,
        value: currentStars,
        onChange: (stars) => onChange(starsToPriority[stars] || "medium"),
        style: { fontSize: 18 },
      }),
      React.createElement(
        "span",
        { style: { color: C.textSub, fontSize: 13 } },
        currentOpt?.label || "Not set",
      ),
    );
  }
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
}) => {
  if (Input) {
    return React.createElement(Input, {
      type: "datetime-local",
      value: toDateTimeLocalValue(value),
      min: minValue ? toDateTimeLocalValue(minValue) : undefined,
      onChange: (e) => onChange(fromDateTimeLocalValue(e.target.value)),
      placeholder,
      style: { width: "100%" },
    });
  }
  return React.createElement(
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
};

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
  if (Input?.TextArea) {
    return React.createElement(Input.TextArea, {
      value: value || "",
      onChange: (e) => onChange(e.target.value),
      placeholder,
      autoSize: { minRows, maxRows: 8 },
    });
  }
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

const PriceInput = ({ value, onChange, currency, disabled = false }) => {
  const fmt = (v) => formatMoneyDraft(v, currency);
  const raw = (s) => parseMoneyDraft(s, currency);
  const [draft, setDraft] = useState(() => fmt(value));

  useEffect(() => {
    setDraft(fmt(value));
  }, [value, currency]);

  const handleChange = (inputValue) => {
    setDraft(inputValue);
    onChange(raw(inputValue));
  };

  const normalizeDraft = () => {
    setDraft(fmt(raw(draft)));
  };

  if (Input) {
    return React.createElement(Input, {
      value: draft,
      placeholder: "0",
      inputMode: getCurrencyDecimals(currency || neutralCurrencyObject()) > 0 ? "decimal" : "numeric",
      onChange: (e) => handleChange(e.target.value),
      onBlur: normalizeDraft,
      disabled,
      style: { width: "100%" },
      addonAfter: currency ? getCurrencyCode(currency) : "Currency",
    });
  }

  return React.createElement("input", {
    type: "text",
    value: draft,
    placeholder: "0",
    inputMode: getCurrencyDecimals(currency || neutralCurrencyObject()) > 0 ? "decimal" : "numeric",
    disabled,
    onChange: (e) => handleChange(e.target.value),
    style: { ...inp(), textAlign: "right" },
    onFocus,
    onBlur: (e) => {
      normalizeDraft();
      onBlur(e);
    },
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

// Renders a "+" suffix icon inside the same bordered select box, right next
// to the clear/chevron icon, instead of a separate button floating outside it.
const renderInlineAddNew = (onAddNew, disabled, title = "Add new") =>
  onAddNew &&
  React.createElement(
    React.Fragment,
    null,
    React.createElement("span", {
      style: {
        width: 1,
        alignSelf: "stretch",
        margin: "2px 0",
        background: C.border,
        flexShrink: 0,
      },
    }),
    React.createElement(
      "span",
      {
        onClick: (e) => {
          e.stopPropagation();
          if (!disabled) onAddNew();
        },
        title,
        style: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: disabled ? "#d1d5db" : C.primary,
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1,
          flexShrink: 0,
          padding: "0 2px",
        },
      },
      "+",
    ),
  );

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

  const dropdownNode = React.createElement(
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
      renderInlineAddNew(onAddNew, disabled),
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

  return dropdownNode;
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

  const dropdownNode = React.createElement(
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
      renderInlineAddNew(onAddNew, disabled),
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

  return dropdownNode;
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

const normalizeTaskText = (value) => String(value || "").trim();
const normalizeTaskLookup = (value) => normalizeTaskText(value).toLowerCase();
const extractAllIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(runtimeExtractId).filter(Boolean).map(String);
  }
  const id = runtimeExtractId(value);
  return id ? [String(id)] : [];
};
const uniqueTaskTemplates = (items = []) => {
  const seen = new Set();
  return (items || []).filter((item, index) => {
    const key =
      runtimeExtractId(item?.id) ||
      item?._id ||
      `${getTaskTemplateTitle(item)}::${getTaskTemplateDescription(item)}::${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const getTaskTemplateRawTitle = (item) =>
  normalizeTaskText(
    item?.templateName ||
    item?.title ||
    item?.taskTitle ||
    item?.taskName ||
    item?.name ||
    item?.subject,
  );
const getTaskTemplateTitle = (item) =>
  getTaskTemplateRawTitle(item) || "Untitled task";
const getTaskTemplateDescription = (item) =>
  normalizeTaskText(
    item?.description ||
    item?.content ||
    item?.note ||
    item?.notes ||
    item?.taskDescription ||
    item?.scope,
  );
const getTaskTemplateSortOrder = (item, fallback = 0) => {
  const order = parseInt(item?.sortOrder ?? item?.order ?? item?.sequence, 10);
  return Number.isFinite(order) ? order : fallback;
};
const sortTaskTemplates = (items = []) =>
  uniqueTaskTemplates(items).sort((a, b) => {
    const aOrder = getTaskTemplateSortOrder(a, 9999);
    const bOrder = getTaskTemplateSortOrder(b, 9999);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return getTaskTemplateTitle(a).localeCompare(getTaskTemplateTitle(b));
  });
const getTaskTemplateServiceIds = (item) =>
  [
    item?.serviceId,
    item?.ServiceId,
    item?.service,
    item?.services,
    item?.companyServiceId,
    item?.companyService,
    item?.companyServices,
    item?.projectServiceId,
    item?.projectService,
    item?.projectServices,
  ].flatMap(extractAllIds);
const getServiceLookupIds = (service) =>
  [
    service?.id,
    service?.serviceId,
    service?.ServiceId,
    service?.service,
    service?.services,
    service?._companyServiceId,
    service?.companyServiceId,
    service?.companyService,
    service?.companyServices,
  ].flatMap(extractAllIds);
const getTemplateServiceName = (item) =>
  normalizeTaskLookup(
    item?.serviceName ||
    item?.service?.serviceName ||
    item?.services?.serviceName ||
    item?.companyService?.serviceName ||
    item?.companyServices?.serviceName,
  );
const getServiceLookupName = (service) =>
  normalizeTaskLookup(
    service?.serviceName ||
    service?.service?.serviceName ||
    service?.services?.serviceName ||
    service?.name,
  );
const getServiceTaskTemplates = (taskTemplates = [], service = {}) => {
  const serviceIds = new Set(getServiceLookupIds(service));
  const serviceName = getServiceLookupName(service);
  return sortTaskTemplates(
    (taskTemplates || []).filter((item) => {
      const templateIds = getTaskTemplateServiceIds(item);
      if (templateIds.some((id) => serviceIds.has(String(id)))) return true;
      const templateServiceName = getTemplateServiceName(item);
      return !!templateServiceName && !!serviceName && templateServiceName === serviceName;
    }),
  );
};
const createCustomTaskDraft = () => ({
  _id: Date.now() + Math.random(),
  title: "",
  description: "",
});
const normalizeCustomTaskTemplates = (tasks = []) =>
  (tasks || [])
    .map((task) => ({
      _id: task?._id || Date.now() + Math.random(),
      title: normalizeTaskText(task?.title || task?.templateName || task?.taskName || task?.name),
      description: normalizeTaskText(task?.description || task?.note),
      _customDraft: true,
    }))
    .filter((task) => task.title || task.description)
    .map((task) => ({
      ...task,
      title: task.title || "Custom task",
    }));
const getRowTaskTemplates = (taskTemplates = [], row = {}) => {
  const customTasks = normalizeCustomTaskTemplates(row?._customTaskTemplates || row?.taskTemplates);
  if (customTasks.length) return customTasks;
  if (row?._templateTasks?.length) return sortTaskTemplates(row._templateTasks);
  return getServiceTaskTemplates(taskTemplates, row);
};
const TaskTemplatePreview = ({
  tasks,
  compact = false,
  max = 4,
  emptyText = "No sample tasks configured",
}) => {
  const visible = sortTaskTemplates(tasks || []).slice(0, max);
  const remaining = Math.max((tasks || []).length - visible.length, 0);
  if (!visible.length) {
    return React.createElement(
      "div",
      {
        style: {
          border: `1px dashed ${C.border}`,
          background: C.bgSection,
          borderRadius: 8,
          padding: compact ? "7px 9px" : "11px 12px",
          color: C.textSub,
          fontSize: compact ? 11.5 : 12.5,
          fontFamily: FONT,
        },
      },
      emptyText,
    );
  }
  return React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gap: compact ? 5 : 8,
        fontFamily: FONT,
      },
    },
    visible.map((task, index) => {
      const title = getTaskTemplateTitle(task);
      const description = getTaskTemplateDescription(task);
      return React.createElement(
        "div",
        {
          key: task?._id || task?.id || `${title}-${index}`,
          style: {
            border: `1px solid ${C.border}`,
            background: "#fff",
            borderRadius: 6,
            padding: compact ? "6px 8px" : "8px 10px",
            display: "grid",
            gridTemplateColumns: compact ? "18px minmax(0, 1fr)" : "22px minmax(0, 1fr)",
            gap: compact ? 6 : 8,
            alignItems: "start",
          },
        },
        React.createElement(
          "span",
          {
            style: {
              width: compact ? 18 : 22,
              height: compact ? 18 : 22,
              borderRadius: 999,
              background: C.bgSection,
              color: C.textSub,
              fontSize: compact ? 10.5 : 11.5,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              lineHeight: 1,
            },
          },
          index + 1,
        ),
        React.createElement(
          "div",
          { style: { minWidth: 0 } },
          React.createElement(
            "div",
            {
              title,
              style: {
                color: C.text,
                fontSize: compact ? 12.5 : 13,
                fontWeight: 500,
                lineHeight: compact ? "17px" : "19px",
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              },
            },
            title,
          ),
          !compact &&
          description &&
          React.createElement(
            "div",
            {
              title: description,
              style: {
                color: C.textSub,
                fontSize: 12,
                lineHeight: "18px",
                marginTop: 3,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              },
            },
            description,
          ),
        ),
      );
    }),
    remaining > 0 &&
    React.createElement(
      "div",
      {
        style: {
          color: C.textSub,
          fontSize: compact ? 11 : 12,
          paddingLeft: compact ? 24 : 30,
        },
      },
      `+${remaining} more tasks`,
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
  taskTemplates,
  currency,
  currencies = [],
}) => {
  const [tab, setTab] = useState("list");
  const [search, setSearch] = useState("");
  const [newSvc, setNewSvc] = useState({
    name: "",
    serviceType: "",
    description: "",
    basePrice: 0,
    currencyId: extractCurrencyId(currency) ? String(extractCurrencyId(currency)) : "",
    taskTemplates: [],
  });
  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const selectedNewSvcCurrency =
    findCurrencyById(currencies, newSvc.currencyId) ||
    (extractCurrencyId(currency) ? currency : null);

  useEffect(() => {
    const defaultCurrencyId = extractCurrencyId(currency);
    if (!defaultCurrencyId) return;
    setNewSvc((prev) =>
      prev.currencyId ? prev : { ...prev, currencyId: String(defaultCurrencyId) },
    );
  }, [currency]);

  const filtered = useMemo(() => {
    let list = internalCompanyId
      ? svcOpts.filter(
        (s) =>
          isSameInternalCompany(s, internalCompanyId) || !getInternalCompanyId(s),
      )
      : svcOpts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.serviceName || "").toLowerCase().includes(q) ||
          (s.serviceType || "").toLowerCase().includes(q) ||
          (s.currencyCode || extractCurrencyCode(s.currency) || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [svcOpts, search, internalCompanyId]);

  const validate = () => {
    const e = {};
    if (!newSvc.name.trim()) e.name = "Please enter a service name";
    if (currencies.length && !extractCurrencyId(newSvc.currencyId))
      e.currencyId = "Please select a currency";
    setErrors(e);
    return !Object.keys(e).length;
  };
  const addCustomTask = () => {
    setNewSvc((prev) => ({
      ...prev,
      taskTemplates: [...(prev.taskTemplates || []), createCustomTaskDraft()],
    }));
  };
  const updateCustomTask = (taskId, field, value) => {
    setNewSvc((prev) => ({
      ...prev,
      taskTemplates: (prev.taskTemplates || []).map((task) =>
        task._id === taskId ? { ...task, [field]: value } : task,
      ),
    }));
  };
  const removeCustomTask = (taskId) => {
    setNewSvc((prev) => ({
      ...prev,
      taskTemplates: (prev.taskTemplates || []).filter((task) => task._id !== taskId),
    }));
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
        currencyId: extractCurrencyId(newSvc.currencyId) || extractCurrencyId(currency),
        currency: selectedNewSvcCurrency,
        taskTemplates: normalizeCustomTaskTemplates(newSvc.taskTemplates),
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
  const renderCustomTaskEditor = () =>
    React.createElement(
      "div",
      {
        style: {
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          background: "#fff",
          padding: 12,
          marginTop: 8,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 12,
          },
        },
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            {
              style: {
                fontSize: 14,
                fontWeight: 600,
                color: C.text,
                fontFamily: FONT,
              },
            },
            "Sample tasks for custom service",
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                color: C.textSub,
                marginTop: 3,
                lineHeight: "18px",
                fontFamily: FONT,
              },
            },
            "Use this for non-standard services that do not have predefined task templates.",
          ),
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: addCustomTask,
            style: {
              border: `1px dashed ${C.primary}`,
              background: "#fff",
              color: C.primary,
              borderRadius: 6,
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 500,
              fontFamily: FONT,
              whiteSpace: "nowrap",
            },
          },
          "+ Add task",
        ),
      ),
      (newSvc.taskTemplates || []).length === 0
        ? React.createElement(
          "div",
          {
            style: {
              border: `1px dashed ${C.border}`,
              background: C.bgSection,
              borderRadius: 6,
              padding: "12px 14px",
              color: C.textSub,
              fontSize: 12.5,
              fontFamily: FONT,
            },
          },
          "No custom sample tasks yet.",
        )
        : React.createElement(
          "div",
          { style: { display: "grid", gap: 10 } },
          (newSvc.taskTemplates || []).map((task, index) =>
            React.createElement(
              "div",
              {
                key: task._id,
                style: {
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  background: "#fff",
                  padding: 10,
                  display: "grid",
                  gridTemplateColumns: "28px minmax(0, 1fr) 34px",
                  gap: 8,
                  alignItems: "start",
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: C.bgSection,
                    color: C.textSub,
                    fontSize: 11.5,
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 4,
                  },
                },
                index + 1,
              ),
              React.createElement(
                "div",
                {
                  style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 8,
                    minWidth: 0,
                    alignItems: "start",
                  },
                },
                React.createElement(
                  "label",
                  { style: { display: "grid", gap: 4, fontSize: 12, color: C.textSub } },
                  "Task name",
                  React.createElement("input", {
                    value: task.title || "",
                    onChange: (e) => updateCustomTask(task._id, "title", e.target.value),
                    placeholder: "Task template name",
                    style: inp({ fontSize: 13, padding: "6px 9px" }),
                    onFocus,
                    onBlur,
                  }),
                ),
                React.createElement(
                  "label",
                  {
                    style: {
                      display: "grid",
                      gap: 4,
                      fontSize: 12,
                      color: C.textSub,
                    },
                  },
                  "Description",
                  React.createElement("textarea", {
                    value: task.description || "",
                    onChange: (e) => updateCustomTask(task._id, "description", e.target.value),
                    placeholder: "Task description or expected output...",
                    rows: 2,
                    style: {
                      ...inp({
                        minHeight: 52,
                        resize: "vertical",
                        fontSize: 12.5,
                        lineHeight: "18px",
                      }),
                    },
                    onFocus,
                    onBlur,
                  }),
                ),
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => removeCustomTask(task._id),
                  title: "Remove task",
                  style: {
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    background: "#fff",
                    color: C.danger,
                    cursor: "pointer",
                    fontSize: 16,
                    lineHeight: 1,
                  },
                },
                "x",
              ),
            ),
          ),
        ),
    );

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
          maxWidth: 1240,
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
              placeholder: "Search service, type, currency...",
              style: inp({ paddingLeft: 36 }),
              onFocus,
              onBlur,
            }),
          ),
        ),
        React.createElement(
          "div",
          { style: { overflow: "auto", flex: 1 } },
          React.createElement(
            "table",
            { style: { width: "100%", minWidth: 980, borderCollapse: "collapse" } },
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
                  { style: thS({ minWidth: 250 }) },
                  "Service",
                ),
                React.createElement(
                  "th",
                  { style: thS({ minWidth: 180 }) },
                  "Description",
                ),
                React.createElement(
                  "th",
                  { style: thS({ minWidth: 240 }) },
                  "Task Templates",
                ),
                React.createElement(
                  "th",
                  { style: thS({ width: 180, textAlign: "right" }) },
                  "Unit Price",
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
                  const sampleTasks = getServiceTaskTemplates(taskTemplates, s);
                  const fallbackCurrency = extractCurrencyId(currency) ? currency : null;
                  const serviceCurrency = currencyFromRecordOptional(s, currencies, fallbackCurrency);
                  const currencySourceLabel =
                    s.currencySource === "companyService"
                      ? "Company service currency"
                      : s.currencySource === "service"
                        ? "Service default currency"
                        : serviceCurrency
                          ? "Case currency"
                          : "No currency";
                  const currencyChipTone =
                    s.currencySource === "companyService"
                      ? { bg: "#ecfdf5", border: "#bbf7d0", color: "#047857" }
                      : s.currencySource === "service"
                        ? { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" }
                        : { bg: "#f8fafc", border: C.border, color: C.textSub };
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
                            ...s,
                            currencyId: getRecordCurrencyId(s) || extractCurrencyId(serviceCurrency),
                            currency: serviceCurrency,
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
                          paddingTop: 13,
                        }),
                      },
                      i + 1,
                    ),
                    React.createElement(
                      "td",
                      { style: tdS({ paddingTop: 12 }) },
                      React.createElement(
                        "div",
                        {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: 5,
                            minWidth: 0,
                          },
                        },
                        React.createElement(
                          "span",
                          {
                            style: {
                              fontWeight: 700,
                              color: C.text,
                              lineHeight: "20px",
                              overflowWrap: "anywhere",
                            },
                          },
                          s.serviceName || `Service #${s.id}`,
                        ),
                        s.serviceType &&
                        React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 11,
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              padding: "2px 8px",
                              borderRadius: 10,
                              lineHeight: "16px",
                            },
                          },
                          s.serviceType,
                        ),
                      ),
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
                      { style: tdS({ paddingTop: 10, minWidth: 240 }) },
                      React.createElement(TaskTemplatePreview, {
                        tasks: sampleTasks,
                        compact: true,
                        max: 2,
                        emptyText: "No sample tasks",
                      }),
                    ),
                    React.createElement(
                      "td",
                      {
                        style: tdS({
                          textAlign: "right",
                          paddingTop: 12,
                        }),
                      },
                      s.basePrice
                        ? React.createElement(
                          "div",
                          {
                            style: {
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              gap: 8,
                              whiteSpace: "nowrap",
                            },
                          },
                          React.createElement(
                            "span",
                            {
                              style: {
                                fontFamily: FONT_MONO,
                                fontWeight: 700,
                                color: C.text,
                              },
                            },
                            serviceCurrency
                              ? formatMoneyAmount(s.basePrice, serviceCurrency)
                              : formatMoneyDraft(s.basePrice, neutralCurrencyObject()),
                          ),
                          React.createElement(
                            "span",
                            {
                              title: serviceCurrency
                                ? `${currencySelectLabel(serviceCurrency)} · ${currencySourceLabel}`
                                : currencySourceLabel,
                              style: {
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 50,
                                padding: "3px 7px",
                                borderRadius: 5,
                                background: currencyChipTone.bg,
                                border: `1px solid ${currencyChipTone.border}`,
                                color: currencyChipTone.color,
                                fontSize: 11.5,
                                fontWeight: 700,
                                fontFamily: FONT,
                              },
                            },
                            serviceCurrency ? getCurrencyCode(serviceCurrency) : "—",
                          ),
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
              key: "currencyId",
              label: "Currency",
              req: !!currencies.length,
              type: "currency",
            },
            {
              key: "basePrice",
              label: "Unit Price",
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
                : f.type === "currency"
                  ? Select
                    ? React.createElement(Select, {
                      showSearch: true,
                      allowClear: false,
                      value: newSvc.currencyId || undefined,
                      placeholder: currencies.length ? "Select currency" : "No currencies configured",
                      optionFilterProp: "label",
                      style: { width: "100%" },
                      onChange: (value) =>
                        setNewSvc({ ...newSvc, currencyId: value || "" }),
                      options: currencies.map((item) => ({
                        value: String(item.id),
                        label: currencySelectLabel(item),
                      })),
                      disabled: !currencies.length,
                    })
                    : React.createElement(
                      "select",
                      {
                        value: newSvc.currencyId || "",
                        onChange: (e) =>
                          setNewSvc({ ...newSvc, currencyId: e.target.value || "" }),
                        style: inp(),
                        disabled: !currencies.length,
                      },
                      React.createElement("option", { value: "" }, "Select currency"),
                      ...currencies.map((item) =>
                        React.createElement(
                          "option",
                          { key: item.id, value: item.id },
                          currencySelectLabel(item),
                        ),
                      ),
                    )
                : f.type === "price"
                  ? React.createElement(PriceInput, {
                    value: newSvc.basePrice,
                    onChange: (v) => setNewSvc({ ...newSvc, basePrice: v }),
                    currency: selectedNewSvcCurrency,
                    disabled: currencies.length && !selectedNewSvcCurrency,
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
          renderCustomTaskEditor(),
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
  onCurrencyChange,
  taskTemplates,
  currency,
  currencies = [],
  pricingDate,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingRows, setEditingRows] = useState({});
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false);
  const selectedIds = useMemo(
    () => rows.map((r) => r.serviceId).filter(Boolean).map(String),
    [rows],
  );
  const currencyOptions = useMemo(
    () =>
      currencies.map((item) => ({
        value: String(item.id),
        label: currencySelectLabel(item),
      })),
    [currencies],
  );
  const getRowCurrency = useCallback(
    (row) => currencyFromRecord(row, currencies, currency),
    [currencies, currency],
  );
  const serviceTaskPreviewRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        _sampleTasks: getRowTaskTemplates(taskTemplates, row),
      })),
    [rows, taskTemplates],
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
          const rowCurrency = getRowCurrency(row);
          const key =
            extractCurrencyId(row.currencyId) ||
            extractCurrencyId(rowCurrency) ||
            getCurrencyCode(rowCurrency);
          if (!acc.byCurrency[key]) {
            acc.byCurrency[key] = {
              currency: rowCurrency,
              subTotal: 0,
              vatAmount: 0,
              totalAmount: 0,
            };
          }
          acc.byCurrency[key].subTotal += amounts.subTotal;
          acc.byCurrency[key].vatAmount += amounts.vatAmount;
          acc.byCurrency[key].totalAmount += amounts.totalAmount;
          return {
            subTotal: acc.subTotal + amounts.subTotal,
            vatAmount: acc.vatAmount + amounts.vatAmount,
            totalAmount: acc.totalAmount + amounts.totalAmount,
            byCurrency: acc.byCurrency,
          };
        },
        { subTotal: 0, vatAmount: 0, totalAmount: 0, byCurrency: {} },
      ),
    [getRowCurrency, hasFinancialSource, packageMode, rows],
  );
  const lineTotalsByCurrency = useMemo(
    () => Object.values(lineTotals.byCurrency || {}),
    [lineTotals],
  );
  const hasMixedLineCurrencies = !packageMode && lineTotalsByCurrency.length > 1;
  const displayTotals = packageMode
    ? {
      subTotal: packageSummary?.subTotal || 0,
      vatAmount: packageSummary?.vatAmount || 0,
      totalAmount: packageSummary?.totalAmount || 0,
    }
    : lineTotals;
  const totalsCurrency =
    !packageMode && lineTotalsByCurrency[0]?.currency
      ? lineTotalsByCurrency[0].currency
      : currency;
  const baseCurrency = currency || findDefaultCurrency(currencies);
  const baseCurrencyId = extractCurrencyId(baseCurrency);
  const baseCurrencyCode = getCurrencyCode(baseCurrency);
  const sortedLineTotalsByCurrency = useMemo(
    () =>
      [...lineTotalsByCurrency].sort((a, b) =>
        getCurrencyCode(a.currency).localeCompare(getCurrencyCode(b.currency)),
      ),
    [lineTotalsByCurrency],
  );
  const needsCaseCurrencyConversion = useMemo(
    () =>
      !packageMode &&
      sortedLineTotalsByCurrency.some((group) => {
        const groupCurrency = group.currency || baseCurrency;
        const groupCurrencyId = extractCurrencyId(groupCurrency);
        const groupCurrencyCode = getCurrencyCode(groupCurrency);
        return !(
          (groupCurrencyId && baseCurrencyId && groupCurrencyId === baseCurrencyId) ||
          groupCurrencyCode === baseCurrencyCode
        );
      }),
    [baseCurrency, baseCurrencyCode, baseCurrencyId, packageMode, sortedLineTotalsByCurrency],
  );
  const shouldRenderCurrencySummary =
    !packageMode && sortedLineTotalsByCurrency.length > 0 && (hasMixedLineCurrencies || needsCaseCurrencyConversion);
  const exchangeSourceCurrencyIds = useMemo(
    () =>
      sortedLineTotalsByCurrency
        .map((group) => extractCurrencyId(group.currency))
        .filter((id) => id && id !== baseCurrencyId),
    [baseCurrencyId, sortedLineTotalsByCurrency],
  );
  const exchangeSourceCurrencyKey = useMemo(
    () => exchangeSourceCurrencyIds.slice().sort((a, b) => a - b).join(","),
    [exchangeSourceCurrencyIds],
  );
  useEffect(() => {
    let alive = true;
    if (packageMode || !baseCurrencyId || !exchangeSourceCurrencyIds.length) {
      setExchangeRates([]);
      setExchangeRatesLoading(false);
      return () => {
        alive = false;
      };
    }
    setExchangeRatesLoading(true);
    fetchExchangeRatesForConversion(exchangeSourceCurrencyIds, baseCurrencyId)
      .then((rows) => {
        if (alive) setExchangeRates(rows || []);
      })
      .catch(() => {
        if (alive) setExchangeRates([]);
      })
      .finally(() => {
        if (alive) setExchangeRatesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [baseCurrencyId, exchangeSourceCurrencyKey, packageMode]);
  const exchangeBreakdown = useMemo(
    () =>
      sortedLineTotalsByCurrency.map((group) => {
        const groupCurrency = group.currency || baseCurrency;
        const groupCurrencyId = extractCurrencyId(groupCurrency);
        const groupCurrencyCode = getCurrencyCode(groupCurrency);
        const sameBase =
          (groupCurrencyId && baseCurrencyId && groupCurrencyId === baseCurrencyId) ||
          groupCurrencyCode === baseCurrencyCode;
        const matched = sameBase
          ? null
          : pickConversionRate(exchangeRates, groupCurrency, baseCurrency, pricingDate);
        const rateValue = sameBase ? 1 : matched?.rate || 0;
        const canConvert = sameBase || rateValue > 0;
        const convertedSubTotal = canConvert ? Math.round(group.subTotal * rateValue) : null;
        const convertedVatAmount = canConvert ? Math.round(group.vatAmount * rateValue) : null;
        return {
          currency: groupCurrency,
          currencyCode: groupCurrencyCode,
          subTotal: group.subTotal,
          vatAmount: group.vatAmount,
          totalAmount: group.totalAmount,
          rate: canConvert ? rateValue : null,
          rateRecord: matched?.record || null,
          rateDirection: matched?.direction || "base",
          status: sameBase ? "base" : canConvert ? "converted" : "missing",
          convertedSubTotal,
          convertedVatAmount,
          convertedTotalAmount: canConvert ? convertedSubTotal + convertedVatAmount : null,
        };
      }),
    [
      baseCurrency,
      baseCurrencyCode,
      baseCurrencyId,
      exchangeRates,
      pricingDate,
      sortedLineTotalsByCurrency,
    ],
  );
  const convertedSummary = useMemo(() => {
    if (packageMode || !exchangeBreakdown.length) return null;
    const missing = exchangeBreakdown.filter((item) => item.status === "missing");
    if (missing.length) {
      return {
        canConvert: false,
        missing,
      };
    }
    return exchangeBreakdown.reduce(
      (acc, item) => ({
        canConvert: true,
        subTotal: acc.subTotal + parseNum(item.convertedSubTotal),
        vatAmount: acc.vatAmount + parseNum(item.convertedVatAmount),
        totalAmount: acc.totalAmount + parseNum(item.convertedTotalAmount),
        missing: [],
      }),
      { canConvert: true, subTotal: 0, vatAmount: 0, totalAmount: 0, missing: [] },
    );
  }, [exchangeBreakdown, packageMode]);
  const conversionByCurrencyKey = useMemo(
    () =>
      exchangeBreakdown.reduce((acc, item) => {
        const idKey = extractCurrencyId(item.currency);
        const codeKey = getCurrencyCode(item.currency);
        if (idKey) acc[String(idKey)] = item;
        if (codeKey) acc[codeKey] = item;
        return acc;
      }, {}),
    [exchangeBreakdown],
  );
  const getConversionInfoForCurrency = (rowCurrency) =>
    conversionByCurrencyKey[String(extractCurrencyId(rowCurrency))] ||
    conversionByCurrencyKey[getCurrencyCode(rowCurrency)] ||
    null;
  const convertAmountsToBaseCurrency = (amounts, rowCurrency) => {
    const sameCurrency =
      (extractCurrencyId(rowCurrency) && baseCurrencyId && extractCurrencyId(rowCurrency) === baseCurrencyId) ||
      getCurrencyCode(rowCurrency) === baseCurrencyCode;
    if (sameCurrency) {
      return {
        canConvert: true,
        sameCurrency: true,
        status: "base",
        rate: 1,
        subTotal: amounts.subTotal,
        vatAmount: amounts.vatAmount,
        totalAmount: amounts.totalAmount,
      };
    }
    const info = getConversionInfoForCurrency(rowCurrency);
    if (!info || info.status === "missing" || !info.rate) {
      return {
        canConvert: false,
        sameCurrency: false,
        status: "missing",
        rate: null,
        subTotal: null,
        vatAmount: null,
        totalAmount: null,
      };
    }
    return {
      canConvert: true,
      sameCurrency: false,
      status: info.status,
      rate: info.rate,
      rateRecord: info.rateRecord,
      subTotal: amounts.subTotal * info.rate,
      vatAmount: amounts.vatAmount * info.rate,
      totalAmount: amounts.totalAmount * info.rate,
    };
  };
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
  const taskFieldForRow = (row) => (row?.serviceId ? "_templateTasks" : "_customTaskTemplates");
  const editableTasksForRow = (row) =>
    getRowTaskTemplates(taskTemplates, row).map((task, index) => ({
      ...task,
      _id: task?._id || task?.id || `${row?._id || "row"}-${index}`,
      templateName: getTaskTemplateRawTitle(task),
      title: getTaskTemplateRawTitle(task),
      description: getTaskTemplateDescription(task),
      sortOrder: getTaskTemplateSortOrder(task, index + 1),
    }));
  const setEditableTasksForRow = (row, tasks) => {
    onUpdate(
      row._id,
      taskFieldForRow(row),
      tasks.map((task, index) => ({
        ...task,
        templateName: normalizeTaskText(task.templateName || task.title),
        title: normalizeTaskText(task.title || task.templateName),
        description: normalizeTaskText(task.description),
        sortOrder: getTaskTemplateSortOrder(task, index + 1),
        _customDraft: !row.serviceId || task._customDraft,
      })),
    );
  };
  const updateEditableTask = (row, taskIndex, field, value) => {
    const tasks = editableTasksForRow(row);
    const next = tasks.map((task, index) => {
      if (index !== taskIndex) return task;
      if (field === "title") {
        return { ...task, title: value, templateName: value };
      }
      return { ...task, [field]: value };
    });
    setEditableTasksForRow(row, next);
  };
  const addEditableTask = (row) => {
    const tasks = editableTasksForRow(row);
    setEditableTasksForRow(row, [
      ...tasks,
      {
        _id: Date.now() + Math.random(),
        title: "",
        templateName: "",
        description: "",
        sortOrder: tasks.length + 1,
        _customDraft: !row.serviceId,
      },
    ]);
  };
  const removeEditableTask = (row, taskIndex) => {
    const tasks = editableTasksForRow(row).filter((_, index) => index !== taskIndex);
    setEditableTasksForRow(row, tasks);
  };
  const renderEditableTaskOverview = () =>
    serviceTaskPreviewRows.length > 0 &&
    React.createElement(
      "div",
      {
        style: {
          borderTop: `1px solid ${C.border}`,
          background: "#fff",
          padding: "14px 16px 16px",
          display: "grid",
          gap: 12,
          fontFamily: FONT,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          },
        },
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { style: { fontSize: 14, fontWeight: 600, color: C.text } },
            "Sample Task Overview",
          ),
          React.createElement(
            "div",
            { style: { fontSize: 12, color: C.textSub, marginTop: 2 } },
            "Review and edit task names or descriptions before creating the case.",
          ),
        ),
        React.createElement(
          "span",
          { style: { color: C.textSub, fontSize: 12 } },
          `${serviceTaskPreviewRows.reduce((sum, row) => sum + editableTasksForRow(row).length, 0)} tasks`,
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "grid", gap: 12 } },
        serviceTaskPreviewRows.map((row) => {
          const tasks = editableTasksForRow(row);
          return React.createElement(
            "div",
            {
              key: row._id,
              style: {
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                background: "#fff",
                overflow: "hidden",
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  padding: "10px 12px",
                  background: C.bgSection,
                  borderBottom: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                },
              },
              React.createElement(
                "div",
                { style: { minWidth: 0 } },
                React.createElement(
                  "div",
                  {
                    title: row.serviceName || "",
                    style: {
                      color: C.text,
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: "18px",
                      overflowWrap: "anywhere",
                    },
                  },
                  row.serviceName || "Custom service",
                ),
                React.createElement(
                  "div",
                  { style: { color: C.textSub, fontSize: 12, marginTop: 2 } },
                  `${tasks.length} tasks`,
                ),
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => addEditableTask(row),
                  style: {
                    border: `1px dashed ${C.primary}`,
                    background: "#fff",
                    color: C.primary,
                    borderRadius: 6,
                    padding: "5px 10px",
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontWeight: 500,
                    fontFamily: FONT,
                  },
                },
                "+ Add task",
              ),
            ),
            tasks.length === 0
              ? React.createElement(
                "div",
                {
                  style: {
                    padding: "16px 12px",
                    color: C.textSub,
                    fontSize: 13,
                    background: "#fff",
                  },
                },
                "No sample tasks. Add a task if this service needs work items.",
              )
              : React.createElement(
                "div",
                { style: { overflowX: "auto" } },
                React.createElement(
                  "table",
                  {
                    style: {
                      width: "100%",
                      minWidth: 760,
                      borderCollapse: "collapse",
                    },
                  },
                  React.createElement(
                    "thead",
                    null,
                    React.createElement(
                      "tr",
                      null,
                      React.createElement("th", { style: th({ width: 48, textAlign: "center" }) }, "#"),
                      React.createElement("th", { style: th({ minWidth: 240 }) }, "Task name"),
                      React.createElement("th", { style: th({ minWidth: 340 }) }, "Description"),
                      React.createElement("th", { style: th({ width: 64, textAlign: "center" }) }, ""),
                    ),
                  ),
                  React.createElement(
                    "tbody",
                    null,
                    tasks.map((task, taskIndex) =>
                      React.createElement(
                        "tr",
                        { key: task._id || taskIndex },
                        React.createElement(
                          "td",
                          { style: td({ textAlign: "center", color: C.textSub, fontSize: 12 }) },
                          taskIndex + 1,
                        ),
                        React.createElement(
                          "td",
                          { style: td({ verticalAlign: "top" }) },
                          React.createElement("input", {
                            value: task.title || task.templateName || "",
                            onChange: (event) =>
                              updateEditableTask(row, taskIndex, "title", event.target.value),
                            placeholder: "Task name",
                            style: inp({ fontSize: 13, padding: "6px 9px" }),
                            onFocus,
                            onBlur,
                          }),
                        ),
                        React.createElement(
                          "td",
                          { style: td({ verticalAlign: "top" }) },
                          React.createElement("textarea", {
                            value: task.description || "",
                            onChange: (event) =>
                              updateEditableTask(row, taskIndex, "description", event.target.value),
                            placeholder: "Task description...",
                            rows: 2,
                            style: {
                              ...inp({
                                minHeight: 48,
                                resize: "vertical",
                                fontSize: 13,
                                lineHeight: "18px",
                              }),
                            },
                            onFocus,
                            onBlur,
                          }),
                        ),
                        React.createElement(
                          "td",
                          { style: td({ textAlign: "center", verticalAlign: "top" }) },
                          React.createElement(
                            "button",
                            {
                              type: "button",
                              title: "Remove task",
                              onClick: () => removeEditableTask(row, taskIndex),
                              style: iconButtonStyle(C.danger),
                            },
                            React.createElement(TrashIcon),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          );
        }),
      ),
    );

  const formatRateValue = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  const renderViewBreakdownButton = () =>
    React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setBreakdownOpen(true),
        style: {
          border: `1px solid ${C.border}`,
          background: "#fff",
          color: C.primary,
          borderRadius: 6,
          padding: "5px 10px",
          cursor: "pointer",
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: FONT,
          whiteSpace: "nowrap",
        },
      },
      "View breakdown",
    );

  const renderCompactCurrencyRow = (group) =>
    React.createElement(
      "div",
      {
        key: getCurrencyCode(group.currency),
        style: {
          display: "grid",
          gridTemplateColumns: "72px minmax(0, 1fr)",
          alignItems: "baseline",
          gap: 12,
          padding: "5px 0",
          borderBottom: `1px dashed ${C.border}`,
        },
      },
      React.createElement(
        "span",
        {
          style: {
            color: C.textSub,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: FONT,
          },
        },
        getCurrencyCode(group.currency),
      ),
      React.createElement(
        "span",
        {
          title: formatMoney(group.totalAmount, group.currency),
          style: {
            color: C.text,
            fontSize: 13.5,
            fontWeight: 700,
            fontFamily: FONT_MONO,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "right",
          },
        },
        formatMoney(group.totalAmount, group.currency),
      ),
    );

  const renderMixedTotalsSummary = () => {
    const visibleGroups = sortedLineTotalsByCurrency.slice(0, 3);
    const hiddenCount = Math.max(sortedLineTotalsByCurrency.length - visibleGroups.length, 0);
    const currencyCount = sortedLineTotalsByCurrency.length;
    const currencyWord = currencyCount === 1 ? "currency" : "currencies";
    const missing = convertedSummary?.missing || [];
    const missingLabel = missing
      .slice(0, 3)
      .map((item) => `${item.currencyCode} -> ${baseCurrencyCode}`)
      .join(", ");

    return React.createElement(
      "div",
      {
        style: {
          width: "min(100%, 520px)",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          background: "#fff",
          padding: "12px 14px",
          boxSizing: "border-box",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          },
        },
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { style: { fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT } },
            "Totals",
          ),
          React.createElement(
            "div",
            { style: { fontSize: 12, color: C.textSub, marginTop: 2, fontFamily: FONT } },
            `${currencyCount} ${currencyWord} used`,
          ),
        ),
        renderViewBreakdownButton(),
      ),
      React.createElement(
        "div",
        null,
        visibleGroups.map(renderCompactCurrencyRow),
        hiddenCount > 0 &&
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => setBreakdownOpen(true),
              style: {
                border: "none",
                background: "transparent",
                padding: "6px 0 0",
                color: C.primary,
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: FONT,
              },
            },
            `+${hiddenCount} more currencies`,
          ),
      ),
      React.createElement(
        "div",
        {
          style: {
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${C.border}`,
            display: "grid",
            gap: 5,
          },
        },
        exchangeRatesLoading
          ? React.createElement(
            "div",
            { style: { color: C.textSub, fontSize: 12.5, fontFamily: FONT } },
            "Checking exchange rates...",
          )
          : convertedSummary?.canConvert
            ? React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 14,
                  alignItems: "baseline",
                },
              },
              React.createElement(
                "span",
                { style: { color: C.textSub, fontSize: 12.5, fontFamily: FONT } },
                `Converted total in ${baseCurrencyCode}`,
              ),
              React.createElement(
                "span",
                {
                  style: {
                    color: C.success,
                    fontSize: 16,
                    fontWeight: 800,
                    fontFamily: FONT_MONO,
                    whiteSpace: "nowrap",
                  },
                },
                formatMoney(convertedSummary.totalAmount, baseCurrency),
              ),
            )
            : React.createElement(
              "div",
              { style: { color: C.warning, fontSize: 12.5, fontFamily: FONT, lineHeight: "18px" } },
              missing.length
                ? `Missing rates: ${missingLabel}${missing.length > 3 ? ` +${missing.length - 3} more` : ""}`
                : "Conversion not available",
            ),
      ),
    );
  };

  const renderSingleTotalsSummary = () =>
    React.createElement(
      "div",
      { style: { minWidth: 300 } },
      [
        [
          packageMode ? "Package Subtotal" : "Subtotal (excl. VAT)",
          formatMoney(displayTotals.subTotal, totalsCurrency),
          C.textSub,
          false,
        ],
        ["Total VAT", formatMoney(displayTotals.vatAmount, totalsCurrency), C.warning, false],
        [
          packageMode ? "Package Total" : "Total",
          formatMoney(displayTotals.totalAmount, totalsCurrency),
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
    );

  const renderExchangeBreakdownModal = () =>
    Modal &&
    React.createElement(
      Modal,
      {
        title: "Currency breakdown",
        open: breakdownOpen,
        visible: breakdownOpen,
        onCancel: () => setBreakdownOpen(false),
        footer: null,
        width: 900,
        destroyOnClose: true,
      },
      React.createElement(
        "div",
        { style: { fontFamily: FONT } },
        React.createElement(
          "div",
          {
            style: {
              marginBottom: 12,
              color: C.textSub,
              fontSize: 12.5,
              lineHeight: "18px",
            },
          },
          `Base currency: ${baseCurrencyCode}. Only currencies used in this case are listed here.`,
        ),
        React.createElement(
          "div",
          { style: { overflowX: "auto" } },
          React.createElement(
            "table",
            {
              style: {
                width: "100%",
                minWidth: 760,
                borderCollapse: "collapse",
              },
            },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                ["Currency", "Original total", `Rate to ${baseCurrencyCode}`, "Converted total", "Effective date", "Source"].map((label) =>
                  React.createElement(
                    "th",
                    {
                      key: label,
                      style: th({
                        textAlign:
                          label === "Original total" || label === "Converted total" || label.startsWith("Rate")
                            ? "right"
                            : "left",
                      }),
                    },
                    label,
                  ),
                ),
              ),
            ),
            React.createElement(
              "tbody",
              null,
              exchangeBreakdown.map((item) => {
                const isMissing = item.status === "missing";
                const source =
                  item.status === "base"
                    ? "Base currency"
                    : `${item.rateRecord?.source || item.rateRecord?.status || "Manual"}${item.rateDirection === "inverse" ? " (inverse)" : ""}`;
                return React.createElement(
                  "tr",
                  { key: item.currencyCode },
                  React.createElement(
                    "td",
                    { style: td({ fontWeight: 700, color: C.text }) },
                    item.currencyCode,
                  ),
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "right", fontFamily: FONT_MONO, fontWeight: 700 }) },
                    formatMoney(item.totalAmount, item.currency),
                  ),
                  React.createElement(
                    "td",
                    {
                      style: td({
                        textAlign: "right",
                        fontFamily: FONT_MONO,
                        color: isMissing ? C.warning : C.text,
                        fontWeight: 700,
                      }),
                    },
                    isMissing ? "Missing" : formatRateValue(item.rate),
                  ),
                  React.createElement(
                    "td",
                    {
                      style: td({
                        textAlign: "right",
                        fontFamily: FONT_MONO,
                        color: isMissing ? C.textSub : C.success,
                        fontWeight: 800,
                      }),
                    },
                    isMissing ? "-" : formatMoney(item.convertedTotalAmount, baseCurrency),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ color: C.textSub, fontSize: 12.5 }) },
                    item.rateRecord?.effectiveDate
                      ? fmtDateTime(item.rateRecord.effectiveDate).split(",")[0]
                      : item.status === "base"
                        ? "-"
                        : "No rate",
                  ),
                  React.createElement(
                    "td",
                    { style: td({ color: C.textSub, fontSize: 12.5 }) },
                    source,
                  ),
                );
              }),
            ),
          ),
        ),
        convertedSummary?.canConvert &&
          React.createElement(
            "div",
            {
              style: {
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 7,
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
              },
            },
            React.createElement(
              "span",
              { style: { fontWeight: 700, color: C.text } },
              `Converted total in ${baseCurrencyCode}`,
            ),
            React.createElement(
              "span",
              { style: { fontWeight: 800, color: C.success, fontFamily: FONT_MONO } },
              formatMoney(convertedSummary.totalAmount, baseCurrency),
            ),
          ),
      ),
    );

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
      taskTemplates,
      currency,
      currencies,
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
              color: C.textSub,
              fontWeight: 500,
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
              color: C.textSub,
              fontWeight: 500,
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
              color: C.textSub,
              fontWeight: 500,
            },
          },
          `${packageIncludedCount} included in package`,
        ),
      ),
      Button
        ? React.createElement(
          Button,
          {
            type: "dashed",
            icon: PlusIcon,
            onClick: () => setPickerOpen(true),
          },
          "Add service",
        )
        : React.createElement(
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
          React.createElement(React.Fragment, null, PlusIcon, "Add row"),
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
          gridTemplateColumns: "minmax(220px, 330px) minmax(0, 1fr)",
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
          React.Fragment,
          null,
          Segmented
            ? React.createElement(Segmented, {
              block: true,
              value: pricingMode,
              onChange: (value) => onPricingModeChange?.(value),
              options: [
                { value: PRICING_MODE_LINE, label: "Line pricing" },
                { value: PRICING_MODE_PACKAGE, label: "Package pricing" },
              ],
              style: { width: "100%", maxWidth: 330 },
            })
            : React.createElement(
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
      ),
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 10, minWidth: 0 } },
        React.createElement(
          "div",
          { style: { display: "flex", justifyContent: "flex-end" } },
          React.createElement(
            "div",
            { style: { width: 130, minWidth: 0 } },
            React.createElement(
              "div",
              { style: { fontSize: 11.5, color: C.textSub, marginBottom: 3, fontFamily: FONT, textAlign: "right" } },
              "Currency",
            ),
            Select
              ? React.createElement(Select, {
                showSearch: true,
                allowClear: false,
                value: currency ? String(extractCurrencyId(currency)) : undefined,
                placeholder: currencies.length ? "Select currency" : "No currencies configured",
                optionFilterProp: "label",
                style: { width: "100%" },
                onChange: (value) => onCurrencyChange?.(value || null),
                options: currencyOptions,
                disabled: !currencies.length,
              })
              : React.createElement(
                "select",
                {
                  value: currency ? String(extractCurrencyId(currency)) : "",
                  onChange: (e) => onCurrencyChange?.(e.target.value || null),
                  style: inp({ cursor: "pointer" }),
                  disabled: !currencies.length,
                },
                React.createElement("option", { value: "" }, "Select currency"),
                ...currencies.map((item) =>
                  React.createElement(
                    "option",
                    { key: item.id, value: item.id },
                    currencySelectLabel(item),
                  ),
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
          packageMode &&
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
              currency,
            }),
          ),
        packageMode &&
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            React.createElement(
              "div",
              { style: { fontSize: 11.5, color: C.textSub, marginBottom: 3, fontFamily: FONT } },
              "VAT %",
            ),
            InputNumber
              ? React.createElement(InputNumber, {
                min: 0,
                max: 100,
                step: 0.1,
                value: packageSummary?.vatRate || 0,
                onChange: (value) =>
                  onPackageChange?.("packageVatRate", parseFloat(value) || 0),
                addonAfter: "%",
                style: { width: "100%" },
              })
              : React.createElement("input", {
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
        packageMode &&
          [
            ["VAT Amount", formatMoney(packageSummary?.vatAmount || 0, currency)],
            ["Package Total", formatMoney(packageSummary?.totalAmount || 0, currency)],
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
            minWidth: packageMode ? 820 : 930,
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
              { style: th({ width: 180, textAlign: "right" }) },
              "Unit Price",
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
              const rowSampleTasks = getRowTaskTemplates(taskTemplates, r);
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
              const rowCurrency = getRowCurrency(r);
              const lineAmount =
                !packageMode && moneyEditable
                  ? calcLineAmounts(r.basePrice, r.vat)
                  : null;
              const convertedLineAmount = lineAmount
                ? convertAmountsToBaseCurrency(lineAmount, rowCurrency)
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
                      React.createElement(
                        "span",
                        {
                          style: {
                            alignSelf: "flex-start",
                            fontSize: 10.5,
                            background: rowSampleTasks.length ? "#f0fdf4" : C.bgSection,
                            color: rowSampleTasks.length ? C.success : C.textSub,
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 600,
                            lineHeight: "15px",
                          },
                        },
                        `${rowSampleTasks.length} sample tasks`,
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
                  { style: { ...td(), paddingTop: 10, textAlign: "right" } },
                  isRowEdit && moneyEditable && !packageMode
                    ? React.createElement(
                      "div",
                      { style: { display: "grid", gap: 6 } },
                      React.createElement(PriceInput, {
                        value: r.basePrice || 0,
                        onChange: (v) => onUpdate(r._id, "basePrice", v),
                        currency: rowCurrency,
                      }),
                      currencies.length
                        ? Select
                          ? React.createElement(Select, {
                            showSearch: true,
                            allowClear: false,
                            value:
                              r.currencyId ||
                              (extractCurrencyId(rowCurrency)
                                ? String(extractCurrencyId(rowCurrency))
                                : undefined),
                            placeholder: "Currency",
                            optionFilterProp: "label",
                            style: { width: "100%" },
                            onChange: (value) => onUpdate(r._id, "currencyId", value || null),
                            options: currencyOptions,
                          })
                          : React.createElement(
                            "select",
                            {
                              value:
                                r.currencyId ||
                                (extractCurrencyId(rowCurrency)
                                  ? String(extractCurrencyId(rowCurrency))
                                  : ""),
                              onChange: (e) =>
                                onUpdate(r._id, "currencyId", e.target.value || null),
                              style: inp({ fontSize: 12.5, padding: "6px 8px" }),
                            },
                            React.createElement("option", { value: "" }, "Currency"),
                            ...currencies.map((item) =>
                              React.createElement(
                                "option",
                                { key: item.id, value: item.id },
                                currencySelectLabel(item),
                              ),
                            ),
                          )
                        : null,
                    )
                    : React.createElement(
                      "div",
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
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 2,
                        },
                      },
                      React.createElement(
                        "span",
                        null,
                        moneyEditable && !packageMode
                          ? formatMoney(r.basePrice || 0, rowCurrency)
                          : packageMode || rowBillingMode === BILLING_PACKAGE_INCLUDED
                            ? "Included in package"
                            : "Scope only",
                      ),
                      moneyEditable &&
                        !packageMode &&
                        r._sourceCurrencyId &&
                        r.currencyId &&
                        String(r._sourceCurrencyId) !== String(r.currencyId) &&
                        React.createElement(
                          "span",
                          {
                            title: "Snapshot currency edited",
                            style: {
                              color: C.textSub,
                              fontSize: 10.5,
                              fontWeight: 600,
                              fontFamily: FONT,
                            },
                          },
                          "Edited currency",
                        ),
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
                      color: convertedLineAmount?.canConvert ? "#1d4ed8" : C.warning,
                      fontWeight: 700,
                      fontSize: 13.5,
                      fontFamily: FONT_MONO,
                    },
                  },
                  lineAmount
                    ? React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 2,
                        },
                      },
                      React.createElement(
                        "span",
                        null,
                        convertedLineAmount?.canConvert
                          ? formatMoney(convertedLineAmount.totalAmount, baseCurrency)
                          : formatMoney(lineAmount.totalAmount, rowCurrency),
                      ),
                      convertedLineAmount?.canConvert &&
                        !convertedLineAmount.sameCurrency &&
                        React.createElement(
                          "span",
                          {
                            style: {
                              color: C.textSub,
                              fontSize: 10.5,
                              fontWeight: 600,
                              fontFamily: FONT,
                            },
                          },
                          `Original: ${formatMoney(lineAmount.totalAmount, rowCurrency)}`,
                        ),
                      convertedLineAmount &&
                        !convertedLineAmount.canConvert &&
                        !convertedLineAmount.sameCurrency &&
                        React.createElement(
                          "span",
                          {
                            style: {
                              color: C.warning,
                              fontSize: 10.5,
                              fontWeight: 700,
                              fontFamily: FONT,
                            },
                          },
                          `Missing rate to ${baseCurrencyCode}`,
                        ),
                    )
                    : "-",
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
      shouldRenderCurrencySummary ? renderMixedTotalsSummary() : renderSingleTotalsSummary(),
    ),
    renderExchangeBreakdownModal(),
    renderEditableTaskOverview(),
  );
};

const Card = ({ children, style = {} }) =>
  AntCard
    ? React.createElement(
      AntCard,
      {
        size: "small",
        bodyStyle: { padding: 0 },
        style: {
          marginBottom: 16,
          overflow: "visible",
          ...style,
        },
      },
      children,
    )
    : React.createElement(
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
        padding: "12px 16px",
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
          fontWeight: 600,
          fontSize: 14,
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
  Form?.Item
    ? React.createElement(
      Form.Item,
      {
        label: React.createElement(
          "span",
          null,
          label,
          hint
            ? React.createElement(
              "span",
              { style: { color: C.textSub, fontSize: 12, marginLeft: 6, fontStyle: "normal" } },
              hint,
            )
            : null,
        ),
        required,
        colon: false,
        layout: "vertical",
        style: { marginBottom: mb, width: "100%" },
      },
      React.createElement("div", { style: { width: "100%" } }, children),
    )
    : React.createElement(
    "div",
    { style: { marginBottom: mb, width: "100%" } },
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
        gridTemplateColumns:
          cols <= 1
            ? "1fr"
            : `repeat(auto-fit, minmax(${cols >= 3 ? 240 : 280}px, 1fr))`,
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
    managerId: null,
    lawyerIds: [],
    description: "",
    contractId: null,
    quotationId: null,
    currencyId: null,
    caseCode: "",
    pricingMode: PRICING_MODE_LINE,
    financialSourceType: SOURCE_MANUAL,
    packageSubTotal: 0,
    packageVatRate: 0,
    packageVatAmount: 0,
    packageTotalAmount: 0,
  });

  const [rows, setRows] = useState([]);
  const [internalCompanies, setInternalCompanies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [svcOpts, setSvcOpts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");
  const [caseCodePreview, setCaseCodePreview] = useState(null);
  const lastAutoCaseCodeRef = useRef("");
  const caseCodeRequestRef = useRef(0);
  // Snapshot rows ban đầu từ quotation để so sánh khi submit
  const initialRowsRef = useRef([]);
  const isDirtyRef = useRef(false);
  const submittingRef = useRef(false);
  const setSubmittingState = useCallback((value) => {
    submittingRef.current = value;
    setSubmitting(value);
  }, []);
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
  }, []);
  const forceClose = useCallback((nativeClose) => {
    isDirtyRef.current = false;
    if (typeof nativeClose === "function") {
      nativeClose();
      return;
    }
    if (!closeCurrentPopup()) {
      message.warning("Cannot close this popup from the current runtime.");
    }
  }, []);
  const requestClose = useCallback((nativeClose) => {
    if (submittingRef.current) return;
    if (!isDirtyRef.current) {
      forceClose(nativeClose);
      return;
    }
    showDiscardConfirm(() => {
      forceClose(nativeClose);
    });
  }, [forceClose]);
  const selectedCurrency = useMemo(
    () => findCurrencyById(currencies, form.currencyId) || findDefaultCurrency(currencies),
    [currencies, form.currencyId],
  );
  const defaultCurrencyId = useMemo(
    () => extractCurrencyId(findDefaultCurrency(currencies)?.id),
    [currencies],
  );
  const currencyOptions = useMemo(
    () =>
      currencies.map((currency) => ({
        value: String(currency.id),
        label: currencySelectLabel(currency),
      })),
    [currencies],
  );
  const currencyStateFromRecord = useCallback(
    (record, fallbackId = null) => {
      const currencyId = getRecordCurrencyId(record) || fallbackId || defaultCurrencyId;
      return currencyId ? { currencyId: String(currencyId) } : {};
    },
    [defaultCurrencyId],
  );

  useEffect(() => {
    return configureGuardedModalClose(requestClose);
  }, [requestClose]);

  useEffect(() => {
    Promise.all([
      fetchAll("internalCompany:list"),
      fetchAll("customers:list"),
      fetchAll("lawyers:list", { appends: ["user"] }),
      fetchAll("contracts:list"),
      fetchAll("quotations:list"),
      fetchCompanyServices(),
      fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
      fetchProjectTemplates(),
      fetchAll("projects:list"),
      getCurrentUser(),
    ])
      .then(([comps, custs, laws, conts, quots, svcs, currs, taskTpls, projs, user]) => {
        const selectableLawyers = filterSelectableLawyers(laws);
        const normalizedCurrencies = Array.isArray(currs) ? currs : [];
        const initialCurrencyId = extractCurrencyId(findDefaultCurrency(normalizedCurrencies)?.id);
        setInternalCompanies(comps);
        setCustomers(custs);
        setLawyers(selectableLawyers);
        setContracts(conts);
        setQuotations(quots);
        setProjects(projs || []);
        setCurrencies(normalizedCurrencies);
        setTaskTemplates(taskTpls || []);

        setSvcOpts(
          svcs.map((s) => {
            const serviceRecord = Array.isArray(s.service)
              ? s.service[0]
              : Array.isArray(s.services)
                ? s.services[0]
                : s.service || s.services || {};
            const companyServiceCurrency = currencyFromRecordOptional(s, normalizedCurrencies, null);
            const serviceCurrency = currencyFromRecordOptional(serviceRecord, normalizedCurrencies, null);
            const resolvedCurrency = companyServiceCurrency || serviceCurrency || null;
            const resolvedCurrencyId = extractCurrencyId(resolvedCurrency) || getRecordCurrencyId(s) || getRecordCurrencyId(serviceRecord);
            return {
              id: s.serviceId || serviceRecord.id || s.id,
              companyServiceId: s.id,
              serviceId: s.serviceId || serviceRecord.id || null,
              internalCompanyId: getInternalCompanyId(s),
              serviceName: serviceRecord.serviceName || s.serviceName || "",
              serviceType: serviceRecord.serviceType || s.serviceType || "",
              description: serviceRecord.description || s.description || "",
              basePrice: s.price ?? s.basePrice ?? serviceRecord.basePrice ?? 0,
              currencyId: resolvedCurrencyId,
              currency: resolvedCurrency,
              currencyCode: extractCurrencyCode(resolvedCurrency),
              currencySource: companyServiceCurrency
                ? "companyService"
                : serviceCurrency
                  ? "service"
                  : null,
            };
          }),
        );

        setCurrentUser(user);
        if (user?.id && !isSystemUserId(user.id)) {
          setForm((p) => ({ ...p, projectManagerId: String(user.id) }));
          // managerId (lawyers FK) is now the source of truth for Manager;
          // projectManagerId (users FK) is kept in sync for backward compat
          // until existing data/code fully migrates to managerId.
          const ownLawyer = selectableLawyers.find(
            (l) => String(getLawyerLinkedUserId(l) || "") === String(user.id),
          );
          if (ownLawyer)
            setForm((p) => ({ ...p, managerId: String(ownLawyer.id) }));
        }
        if (initialCurrencyId)
          setForm((p) => ({ ...p, currencyId: p.currencyId || String(initialCurrencyId) }));

        const popupParams = getRuntimeInput();
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
              ...currencyStateFromRecord(foundContract || foundQuot, p.currencyId),
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
                ...currencyStateFromRecord(cc || cq, p.currencyId),
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

  const setF = useCallback((k, v) => {
    markDirty();
    setForm((p) => ({ ...p, [k]: v }));
  }, [markDirty]);

  // Manager is a direct lawyers-FK select now, so it must not also be
  // selectable/shown as a Member.
  const membersLawyers = useMemo(
    () =>
      form.managerId
        ? lawyers.filter((l) => String(l.id) !== String(form.managerId))
        : lawyers,
    [lawyers, form.managerId],
  );

  // If the lawyer just picked as Manager was already selected as a Member,
  // drop it from Members so the same person isn't listed twice on the case.
  useEffect(() => {
    if (!form.managerId) return;
    setForm((p) => {
      if (!p.lawyerIds?.includes(p.managerId)) return p;
      return {
        ...p,
        lawyerIds: p.lawyerIds.filter((id) => id !== p.managerId),
      };
    });
  }, [form.managerId]);

  const applyFinancialSource = useCallback((record, sourceType) => {
    setForm((p) => ({
      ...p,
      ...financialStateFromRecord(record, sourceType),
      ...currencyStateFromRecord(record, p.currencyId),
    }));
  }, [currencyStateFromRecord]);

  const refreshCustomers = useCallback(async () => {
    const list = await fetchAll("customers:list");
    setCustomers(list);
    return list;
  }, []);

  const refreshContracts = useCallback(async () => {
    const list = await fetchAll("contracts:list");
    setContracts(list);
    return list;
  }, []);

  const refreshQuotations = useCallback(async () => {
    const list = await fetchAll("quotations:list");
    setQuotations(list);
    return list;
  }, []);

  const openCreatePopup = useCallback(
    async (viewKey, refreshFn, params = {}, options = {}) => {
      const { beforeIds, onCreated } = options;
      const beforeIdSet = beforeIds ? new Set(beforeIds.map(String)) : null;
      const targetRefreshBlockUid = QUICK_CREATE_REFRESH_BLOCK_UID_BY_VIEW[viewKey];
      const expectedCollection = QUICK_CREATE_COLLECTION_BY_VIEW[viewKey];
      const quickCreateRequestId =
        params.quickCreateRequestId ||
        `${viewKey}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const sourceInput = getRuntimeInput();
      const popupParams = {
        ...params,
        quickCreateRequestId,
        quickCreateViewKey: viewKey,
        quickCreateSource: "CaseCreateForm",
        quickCreateTargetCollection: expectedCollection,
        sourceBlockUid: params.sourceBlockUid || sourceInput.blockUid || sourceInput.dataBlockUid,
        targetBlockUid: params.targetBlockUid || targetRefreshBlockUid,
        dataBlockUid: params.dataBlockUid || targetRefreshBlockUid,
        refreshBlockUids: runtimeCompact([
          params.refreshBlockUid,
          ...(Array.isArray(params.refreshBlockUids) ? params.refreshBlockUids : []),
          targetRefreshBlockUid,
        ]),
      };
      let selectedCreatedId = null;
      const cleanupFns = [];
      let cleanupQuickCreateListener = () => {
        cleanupFns.splice(0).forEach((cleanup) => {
          try {
            cleanup();
          } catch {}
        });
      };
      const selectCreated = (id, record, updated = []) => {
        if (!id || selectedCreatedId || !onCreated) return;
        selectedCreatedId = String(id);
        cleanupQuickCreateListener();
        onCreated(String(id), record, updated);
      };
      const isExpectedCreatedDetail = (detail = {}) => {
        if (detail.quickCreateRequestId) {
          return detail.quickCreateRequestId === quickCreateRequestId;
        }
        return detail.collection === expectedCollection;
      };
      const runRefreshAndSelect = async (forcedId = null, forcedRecord = null) => {
        try {
          const updated = refreshFn ? await refreshFn() : [];
          if (selectedCreatedId) return;
          if (forcedId) {
            const created =
              (Array.isArray(updated)
                ? updated.find((item) => String(item.id) === String(forcedId))
                : null) ||
              forcedRecord ||
              null;
            selectCreated(forcedId, created, updated);
            return;
          }
          if (beforeIdSet && onCreated && Array.isArray(updated)) {
            const createdCandidates = updated.filter((item) => !beforeIdSet.has(String(item.id)));
            // If more than one record is new (e.g. another user created something
            // concurrently), prefer the most recently created one.
            const created = createdCandidates.length > 1
              ? createdCandidates.reduce((latest, item) =>
                  new Date(item.createdAt || 0) > new Date(latest.createdAt || 0) ? item : latest,
                )
              : createdCandidates[0];
            if (created) selectCreated(created.id, created, updated);
          }
        } catch (error) {
          console.warn("[CaseCreateForm] quick-create refresh failed", error);
          if (forcedId) selectCreated(forcedId, forcedRecord, []);
        }
      };

      if (
        onCreated &&
        expectedCollection &&
        typeof window !== "undefined" &&
        typeof window.addEventListener === "function"
      ) {
        const handleQuickCreateCreated = (event) => {
          const detail = event?.detail || {};
          if (!isExpectedCreatedDetail(detail)) return;
          const createdId = runtimeExtractId(detail.id || detail.record?.id);
          if (!createdId) return;
          runRefreshAndSelect(String(createdId), detail.record || null);
        };
        window.addEventListener(QUICK_CREATE_CREATED_EVENT, handleQuickCreateCreated);
        cleanupFns.push(() =>
          window.removeEventListener(QUICK_CREATE_CREATED_EVENT, handleQuickCreateCreated),
        );
      }

      const quickCreateBridge = getQuickCreateBridge();
      if (onCreated && expectedCollection && quickCreateBridge?.subscribe) {
        cleanupFns.push(
          quickCreateBridge.subscribe((detail = {}) => {
            if (!isExpectedCreatedDetail(detail)) return;
            const createdId = runtimeExtractId(detail.id || detail.record?.id);
            if (!createdId) return;
            runRefreshAndSelect(String(createdId), detail.record || null);
          }),
        );
      }

      const opened = await openPopupViewByUid(viewKey, popupParams);
      if (opened && refreshFn) {
        setTimeout(runRefreshAndSelect, 1200);
        setTimeout(runRefreshAndSelect, 3500);
        setTimeout(runRefreshAndSelect, 7000);
        setTimeout(cleanupQuickCreateListener, 10000);
      } else {
        cleanupQuickCreateListener();
      }
    },
    [],
  );

  // ── Helper: load services from quotationId and set rows ──
  const loadServicesFromQuotation = useCallback(
    async (quotationId, showToast = true, quotationOverride = null) => {
      if (!quotationId) return 0;
      setLoadingServices(true);
      try {
        const selectedQuotation = quotationOverride || quotations.find(
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
            currencyId: getRecordCurrencyId(s) ? String(getRecordCurrencyId(s)) : null,
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
    async (contractId, showToast = true, contractOverride = null) => {
      if (!contractId) return 0;
      setLoadingServices(true);
      try {
        const selectedContract = contractOverride || contracts.find(
          (c) => String(c.id) === String(contractId),
        );
        applyFinancialSource(selectedContract, SOURCE_CONTRACT);
        const csvcs = await fetchContractServices(contractId);
        if (csvcs.length > 0) {
          const mapped = mapContractServicesToRows(csvcs, selectedContract);
          initialRowsRef.current = csvcs.map((s) => {
            const serviceRecord = s.service || s.services || {};
            const rowCurrencyId =
              getRecordCurrencyId(s) ||
              getRecordCurrencyId(serviceRecord) ||
              getRecordCurrencyId(selectedContract);
            return {
              _contractServiceId: s.id,
              serviceId: s.serviceId
                ? String(s.serviceId)
                : serviceRecord.id
                  ? String(serviceRecord.id)
                  : null,
              basePrice: isPackagePricing(selectedContract) ? 0 : s.price ?? s.basePrice ?? 0,
              vat: isPackagePricing(selectedContract) ? 0 : s.vat ?? 0,
              currencyId: rowCurrencyId ? String(rowCurrencyId) : null,
            };
          });
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
    async (customerId, customerOverride = null) => {
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
        customerOverride ||
          customers.find((c) => String(c.id) === String(customerId)) ||
          null,
      );

      const cc = contracts.find(
        (c) =>
          (!form.internalCompanyId || isSameInternalCompany(c, form.internalCompanyId)) &&
          (String(c.customerId) === String(customerId) ||
            String(c.customer?.id) === String(customerId)),
      );
      const usedQIds = new Set(
        projects.filter((p) => p.quotationId).map((p) => String(p.quotationId)),
      );
      const availableQuots = quotations.filter(
        (q) =>
          (!form.internalCompanyId || isSameInternalCompany(q, form.internalCompanyId)) &&
          !usedQIds.has(String(q.id)),
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
        ...currencyStateFromRecord(cc || cq, p.currencyId),
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
    [contracts, customers, currencyStateFromRecord, form.internalCompanyId, projects, quotations, loadServicesFromQuotation, loadServicesFromContract],
  );

  // ── Manual quotation selection: load services ──
  const handleQuotationChange = useCallback(
    async (quotationId, quotationOverride = null) => {
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

      await loadServicesFromQuotation(quotationId, true, quotationOverride);
    },
    [applyFinancialSource, contracts, form.contractId, loadServicesFromQuotation, loadServicesFromContract, setF],
  );

  const handleContractChange = useCallback(
    async (contractId, contractOverride = null) => {
      const selectedContract = contractOverride || contracts.find(
        (c) => String(c.id) === String(contractId),
      );
      setForm((p) => ({
        ...p,
        ...financialStateFromRecord(
          selectedContract,
          selectedContract ? SOURCE_CONTRACT : (p.quotationId ? SOURCE_QUOTATION : SOURCE_NONE),
        ),
        ...currencyStateFromRecord(selectedContract, p.currencyId),
        contractId,
      }));
      if (selectedContract) {
        await loadServicesFromContract(contractId, true, selectedContract);
        return;
      }
      if (form.quotationId) {
        await loadServicesFromQuotation(form.quotationId, true);
      } else {
        setRows([]);
      }
    },
    [contracts, currencyStateFromRecord, form.quotationId, loadServicesFromContract, loadServicesFromQuotation],
  );

  const addRowFromService = useCallback(
    async (svc, isCreate = false) => {
      markDirty();
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
      const serviceCurrencyId = getRecordCurrencyId(svc);
      const rowCurrencyId = serviceCurrencyId || form.currencyId || null;
      const addToPackageTotal = (amount) => {
        const lineAmount = parseNum(amount);
        if (!packageMode || !lineAmount) return;
        setForm((p) => {
          const subTotal = parseNum(p.packageSubTotal) + lineAmount;
          const vatRate = (p.packageVatRate === undefined || p.packageVatRate === null || p.packageVatRate === "")
            ? 8
            : parseNum(p.packageVatRate);
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
        const customTaskTemplates = normalizeCustomTaskTemplates(svc.taskTemplates);
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
            currencyId: rowCurrencyId ? String(rowCurrencyId) : null,
            _sourceCurrencyId: serviceCurrencyId ? String(serviceCurrencyId) : null,
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
            _customTaskTemplates: customTaskTemplates,
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
            currencyId: rowCurrencyId ? String(rowCurrencyId) : null,
            _sourceCurrencyId: serviceCurrencyId ? String(serviceCurrencyId) : null,
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
            _templateTasks: getServiceTaskTemplates(taskTemplates, svc),
          },
        ]);
        addToPackageTotal(svc.basePrice);
      }
    },
    [form.currencyId, form.financialSourceType, form.pricingMode, markDirty, rows, taskTemplates],
  );

  const deleteRow = (id) => {
    markDirty();
    const row = rows.find((r) => r._id === id);
    const packageBasePrice = parseNum(row?._packageBasePrice);
    if (isPackagePricing(form.pricingMode) && packageBasePrice) {
      setForm((p) => {
        const subTotal = Math.max(parseNum(p.packageSubTotal) - packageBasePrice, 0);
        const vatRate = (p.packageVatRate === undefined || p.packageVatRate === null || p.packageVatRate === "")
          ? 8
          : parseNum(p.packageVatRate);
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
  const updateRow = (id, field, value) => {
    markDirty();
    setRows((p) => p.map((r) => (r._id !== id ? r : { ...r, [field]: value })));
  };

  const handlePackageSummaryChange = useCallback((field, value) => {
    markDirty();
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
  }, [markDirty]);

  // ── SUBMIT ────────────────────────────────────────────────────
  const handleServicePricingModeChange = useCallback(
    async (mode) => {
      const nextMode = isPackagePricing(mode) ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE;
      if (nextMode === form.pricingMode) return;

      if (nextMode === PRICING_MODE_PACKAGE) {
        // Rows can each carry their own currency in Line mode (multi-currency
        // services) — naively summing raw basePrice across rows silently added
        // together numbers from different currencies as if they were the same
        // one (e.g. 18,000,000 VND + 2,000 USD → "18,002,000"). Convert every
        // row into the Case's own currency first, same as the rest of the
        // financial summary logic (buildServiceFinancialSummary), before
        // collapsing them into the single Package subtotal.
        let subTotal = parseNum(form.packageSubTotal);
        const preliminarySummary = buildServiceFinancialSummary({
          rows,
          currencies,
          baseCurrency: selectedCurrency,
          pricingDate: form.date,
          packageMode: false,
          activeFinancialSourceType: form.financialSourceType,
        });
        if (preliminarySummary.groups.length) {
          const rateCurrencyIds = getConversionSourceCurrencyIds(preliminarySummary.groups, selectedCurrency);
          const exchangeRates = rateCurrencyIds.length
            ? await fetchExchangeRatesForConversion(rateCurrencyIds, extractCurrencyId(selectedCurrency))
            : [];
          const financialSummary = buildServiceFinancialSummary({
            rows,
            currencies,
            baseCurrency: selectedCurrency,
            exchangeRates,
            pricingDate: form.date,
            packageMode: false,
            activeFinancialSourceType: form.financialSourceType,
          });
          if (!financialSummary.converted.canConvert) {
            message.warning(
              `Không thể chuyển sang Package pricing: thiếu tỷ giá quy đổi (${formatMissingRatePairs(financialSummary.missing, selectedCurrency)}).`,
            );
            return;
          }
          subTotal = financialSummary.converted.subTotal || subTotal;
        }
        const vatRate = (form.packageVatRate === undefined || form.packageVatRate === null || form.packageVatRate === "")
          ? 8
          : parseNum(form.packageVatRate);
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
          vat: (row.vat === undefined || row.vat === null || row.vat === "") ? 8 : row.vat,
        })),
      );
    },
    [form.packageSubTotal, form.packageVatRate, form.pricingMode, form.financialSourceType, form.date, rows, currencies, selectedCurrency],
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
    if (currencies.length && !form.currencyId) {
      message.warning("Please select a Case Currency");
      return;
    }

    setSubmittingState(true);
    try {
      let activeQuotationId = form.quotationId
        ? parseInt(form.quotationId)
        : null;

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
      let quotationFinancialSummary = null;
      let contractFinancialSummary = null;
      if (activeQuotationId && activeFinancialSourceType === SOURCE_QUOTATION && !activePackageMode) {
        setSubmitStep("Checking quotation exchange rates...");
        const preliminaryQuotationSummary = buildServiceFinancialSummary({
          rows,
          currencies,
          baseCurrency: selectedCurrency,
          pricingDate: form.date,
          packageMode: activePackageMode,
          activeFinancialSourceType,
          includeBillingModes: [BILLING_LINE],
        });
        const rateCurrencyIds = getConversionSourceCurrencyIds(
          preliminaryQuotationSummary.groups,
          selectedCurrency,
        );
        const quotationExchangeRates = rateCurrencyIds.length
          ? await fetchExchangeRatesForConversion(
            rateCurrencyIds,
            extractCurrencyId(selectedCurrency),
          )
          : [];
        quotationFinancialSummary = buildServiceFinancialSummary({
          rows,
          currencies,
          baseCurrency: selectedCurrency,
          exchangeRates: quotationExchangeRates,
          pricingDate: form.date,
          packageMode: activePackageMode,
          activeFinancialSourceType,
          includeBillingModes: [BILLING_LINE],
        });
        if (!quotationFinancialSummary.converted.canConvert) {
          throw new Error(
            `Missing exchange rate for quotation total: ${formatMissingRatePairs(
              quotationFinancialSummary.missing,
              selectedCurrency,
            )}`,
          );
        }
      }
      if (selectedContract && activeFinancialSourceType === SOURCE_CONTRACT && !activePackageMode) {
        setSubmitStep("Checking contract exchange rates...");
        const preliminaryContractSummary = buildServiceFinancialSummary({
          rows,
          currencies,
          baseCurrency: selectedCurrency,
          pricingDate: form.date,
          packageMode: activePackageMode,
          activeFinancialSourceType,
          includeBillingModes: [BILLING_LINE],
        });
        const rateCurrencyIds = getConversionSourceCurrencyIds(
          preliminaryContractSummary.groups,
          selectedCurrency,
        );
        const contractExchangeRates = rateCurrencyIds.length
          ? await fetchExchangeRatesForConversion(
            rateCurrencyIds,
            extractCurrencyId(selectedCurrency),
          )
          : [];
        contractFinancialSummary = buildServiceFinancialSummary({
          rows,
          currencies,
          baseCurrency: selectedCurrency,
          exchangeRates: contractExchangeRates,
          pricingDate: form.date,
          packageMode: activePackageMode,
          activeFinancialSourceType,
          includeBillingModes: [BILLING_LINE],
        });
        if (!contractFinancialSummary.converted.canConvert) {
          throw new Error(
            `Missing exchange rate for contract total: ${formatMissingRatePairs(
              contractFinancialSummary.missing,
              selectedCurrency,
            )}`,
          );
        }
      }
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
        const rawPackageVatAmount = row.packageVatAmount ?? form.packageVatAmount;
        const vatAmount =
          (rawPackageVatAmount === undefined || rawPackageVatAmount === null || rawPackageVatAmount === "")
            ? Math.round((subTotal * vatRate) / 100)
            : parseNum(rawPackageVatAmount);
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
          try {
            return await ctx.api.request({
              url: "projects:create",
              method: "POST",
              data: fallback,
            });
          } catch (fallbackError) {
            const minimal = { ...fallback };
            delete minimal.currencyId;
            delete minimal.currency;
            delete minimal.currencies;
            console.warn("Retrying project create without currency fields:", fallbackError);
            message.warning("Không thể lưu currency của hồ sơ do lỗi hệ thống — vui lòng kiểm tra lại sau khi tạo.");
            return ctx.api.request({
              url: "projects:create",
              method: "POST",
              data: minimal,
            });
          }
        }
      };

      // 2. Create Case (Project)
      setSubmitStep("Creating Case...");
      // managerId (lawyers FK) is the source of truth for who picked the
      // Manager on this form. projectManagerId (users FK) is derived from it
      // and kept in sync only for backward compat with code/reports that
      // still read the old field — do not let the two drift independently.
      const selectedManagerLawyer = form.managerId
        ? (lawyers || []).find((l) => String(l.id) === String(form.managerId))
        : null;
      const derivedProjectManagerUserId = selectedManagerLawyer
        ? getLawyerLinkedUserId(selectedManagerLawyer)
        : null;
      const projRes = await createProject({
          internalCompanyId: parseInt(form.internalCompanyId),
          customerId: parseInt(form.customerId),
          projectName: form.projectName.trim(),
          date: form.date || null,
          deadline: form.deadline || null,
          priority: form.priority,
          // manager (belongsTo relation) + managerId (scalar FK) are set
          // together to the same lawyers.id — same pair Library.js's
          // legalReference/legalStudy creation writes for their own
          // Manager field. projectManagerId (users FK) is kept below only
          // for backward compat with old code/reports that still read it.
          manager: form.managerId ? parseInt(form.managerId) : null,
          managerId: form.managerId ? parseInt(form.managerId) : null,
          projectManagerId: derivedProjectManagerUserId
            ? parseInt(derivedProjectManagerUserId)
            : null,
          description: form.description || null,
          contractId: form.contractId ? parseInt(form.contractId) : null,
          quotationId: activeQuotationId,
          // The "Currency" field on the Cases collection is a belongsTo
          // association named "currencies" (see Cases > Configure fields),
          // not a plain "currencyId" scalar — Nocobase silently drops
          // unknown payload keys, so sending "currencyId" here left the
          // Case's Currency permanently unset. "currencyId" is kept too in
          // case a legacy raw column with that name also exists somewhere.
          currencies: form.currencyId ? parseInt(form.currencyId) : null,
          currencyId: form.currencyId ? parseInt(form.currencyId) : null,
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
          delete fallback.contractId;
          delete fallback.contractServiceId;
          delete fallback.quotationId;
          delete fallback.quotationServiceId;
          delete fallback.quantity;
          delete fallback.subTotal;
          delete fallback.vatAmount;
          delete fallback.totalAmount;
          console.warn(
            "Retrying projectService without relation/amount sync fields:",
            error,
          );
          try {
            return await ctx.api.request({
              url: "projectServices:create",
              method: "POST",
              data: fallback,
            });
          } catch (fallbackError) {
            const minimal = { ...fallback };
            delete minimal.currencyId;
            delete minimal.currency;
            delete minimal.pricingMode;
            delete minimal.billingMode;
            delete minimal.financialSourceType;
            delete minimal.packageSubTotal;
            delete minimal.packageVatRate;
            delete minimal.packageVatAmount;
            delete minimal.packageTotalAmount;
            console.warn(
              "Retrying projectService without pricing package fields:",
              fallbackError,
            );
            message.warning(`Không thể lưu currency cho dịch vụ "${data?.serviceName || ""}" do lỗi hệ thống — vui lòng kiểm tra lại sau khi tạo.`);
            return ctx.api.request({
              url: "projectServices:create",
              method: "POST",
              data: minimal,
            });
          }
        }
      };
      const cleanPayload = (payload = {}) => {
        const next = { ...(payload || {}) };
        Object.keys(next).forEach((key) => {
          if (next[key] === undefined) delete next[key];
        });
        return next;
      };
      const stripContractServiceFallbackFields = (payload = {}, minimal = false) => {
        const next = cleanPayload(payload);
        [
          "currencyId",
          "currency",
          "contracts",
          "services",
          "projectServices",
          "billingMode",
          "financialSourceType",
        ].forEach((key) => delete next[key]);
        if (minimal) {
          [
            "serviceType",
            "serviceId",
            "ServiceId",
            "pricingMode",
            "packageSubTotal",
            "packageVatRate",
            "packageVatAmount",
            "packageTotalAmount",
          ].forEach((key) => delete next[key]);
        }
        return next;
      };
      const requestContractService = async ({ action, id, data }) => {
        const isUpdate = action === "update";
        const request = (payload) => {
          const options = {
            url: isUpdate ? "contractServices:update" : "contractServices:create",
            method: "POST",
            data: cleanPayload(payload),
          };
          if (isUpdate) options.params = { filterByTk: parseInt(id) };
          return ctx.api.request(options);
        };

        try {
          return await request(data);
        } catch (error) {
          try {
            return await request(stripContractServiceFallbackFields(data));
          } catch (fallbackError) {
            try {
              return await request(stripContractServiceFallbackFields(data, true));
            } catch (minimalError) {
              console.warn(
                `Could not ${action} contractService:`,
                minimalError || fallbackError || error,
              );
              return null;
            }
          }
        }
      };
      const updateContractHeaderSafely = async (contractId, data) => {
        const safeContractId = parseInt(contractId);
        if (!safeContractId) return;
        try {
          await ctx.api.request({
            url: "contracts:update",
            method: "POST",
            params: { filterByTk: safeContractId },
            data: cleanPayload(data),
          });
        } catch (error) {
          const fallback = cleanPayload(data);
          delete fallback.currencyId;
          delete fallback.currency;
          try {
            console.warn("Retrying contract total update without currencyId:", error);
            message.warning("Không thể đồng bộ currency của hợp đồng liên kết do lỗi hệ thống — vui lòng kiểm tra lại sau khi tạo.");
            await ctx.api.request({
              url: "contracts:update",
              method: "POST",
              params: { filterByTk: safeContractId },
              data: fallback,
            });
          } catch (fallbackError) {
            console.warn("Could not update contract total:", fallbackError);
          }
        }
      };
      const createCustomDraftTasksForService = async (row, createdProjectServiceId) => {
        const customTasks = normalizeCustomTaskTemplates(row?._customTaskTemplates);
        if (row?.serviceId || !createdProjectServiceId || !customTasks.length) return;
        setSubmitStep(`Creating tasks for ${row.serviceName || "custom service"}...`);
        for (let taskIndex = 0; taskIndex < customTasks.length; taskIndex += 1) {
          const task = customTasks[taskIndex];
          try {
            const payload = {
              title: task.title,
              status: "toDo",
              projectId,
              serviceId: createdProjectServiceId,
            };
            if (task.description) payload.description = task.description;
            await ctx.api.request({
              url: "tasks:create",
              method: "POST",
              data: payload,
            });
          } catch (error) {
            console.warn("Could not create custom service task:", error);
          }
        }
      };

      // For catalog services, tasks are auto-cloned from projectTemplates by a DB
      // trigger (see pgsql/AutoCreateTaskFromTemplate.sql) when projectServices is
      // created. If the user edited/added/removed sample tasks in the "Sample Task
      // Overview" before submit, that trigger still clones the *original* template
      // text — so we diff the edited list against the pristine template list here
      // and patch the trigger-created tasks to match what the user actually saved.
      const syncCatalogServiceTasks = async (row, createdProjectServiceId) => {
        if (!row?.serviceId || !projectId || !Array.isArray(row?._templateTasks))
          return;

        const originalTasks = getServiceTaskTemplates(taskTemplates, row);
        const originalById = new Map(
          originalTasks.map((task) => [String(task.id), task]),
        );
        const finalIds = new Set();
        const toUpdate = [];
        const toCreate = [];

        row._templateTasks.forEach((task) => {
          const key = String(task?._id ?? task?.id ?? "");
          const original = key && originalById.has(key) ? originalById.get(key) : null;
          const title = normalizeTaskText(getTaskTemplateRawTitle(task)) || "Untitled task";
          const description = normalizeTaskText(getTaskTemplateDescription(task));
          if (original) {
            finalIds.add(key);
            const originalTitle =
              normalizeTaskText(getTaskTemplateRawTitle(original)) || "Untitled task";
            const originalDescription = normalizeTaskText(
              getTaskTemplateDescription(original),
            );
            if (title !== originalTitle || description !== originalDescription) {
              toUpdate.push({ matchTitle: originalTitle, title, description });
            }
          } else {
            toCreate.push({ title, description });
          }
        });

        const toRemoveTitles = originalTasks
          .filter((task) => !finalIds.has(String(task.id)))
          .map((task) => normalizeTaskText(getTaskTemplateRawTitle(task)) || "Untitled task");

        if (!toUpdate.length && !toCreate.length && !toRemoveTitles.length) return;

        let autoCreatedTasks = [];
        try {
          const taskRes = await ctx.api.request({
            url: "tasks:list",
            params: {
              pageSize: 200,
              page: 1,
              fields: "id,title,description",
              filter: JSON.stringify({
                projectId: { $eq: projectId },
                serviceId: { $eq: parseInt(row.serviceId) },
              }),
            },
          });
          autoCreatedTasks = taskRes?.data?.data || [];
        } catch (error) {
          console.warn("Could not fetch auto-created template tasks for sync:", error);
          return;
        }

        const consumed = new Set();
        const findByTitle = (title) =>
          autoCreatedTasks.find(
            (task) =>
              !consumed.has(task.id) &&
              normalizeTaskLookup(task.title) === normalizeTaskLookup(title),
          );

        for (const upd of toUpdate) {
          const match = findByTitle(upd.matchTitle);
          if (!match) continue;
          consumed.add(match.id);
          try {
            await ctx.api.request({
              url: "tasks:update",
              method: "POST",
              params: { filterByTk: match.id },
              data: { title: upd.title, description: upd.description || null },
            });
          } catch (error) {
            console.warn("Could not sync edited template task:", error);
          }
        }

        for (const title of toRemoveTitles) {
          const match = findByTitle(title);
          if (!match) continue;
          consumed.add(match.id);
          try {
            await ctx.api.request({
              url: "tasks:destroy",
              method: "POST",
              params: { filterByTk: match.id },
            });
          } catch (error) {
            console.warn("Could not remove deselected template task:", error);
          }
        }

        for (const created of toCreate) {
          try {
            await ctx.api.request({
              url: "tasks:create",
              method: "POST",
              data: {
                title: created.title,
                description: created.description || null,
                status: "toDo",
                projectId,
                serviceId: parseInt(row.serviceId),
              },
            });
          } catch (error) {
            console.warn("Could not create added template task:", error);
          }
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
          const rowCurrencyId = extractCurrencyId(r.currencyId) || extractCurrencyId(form.currencyId);

          if (r._fromQuotation && qSvcId) {
            // Update existing
            const snap = initialSnap.find(
              (s) => String(s.serviceId) === String(r.serviceId),
            );
            if (
              activePackageMode ||
              !snap ||
              price !== Number(snap.basePrice) ||
              vatPct !== Number(snap.vat) ||
              String(rowCurrencyId || "") !== String(snap.currencyId || "")
            ) {
              try {
                await ctx.api.request({
                  url: "quotationServices:update",
                  method: "POST",
                  params: { filterByTk: qSvcId },
                  data: {
                    caseId: projectId,
                    pricingMode: rowPricingMode,
                    basePrice: price,
                    quantity: 1,
                    vat: vatPct,
                    subTotal: amounts.subTotal,
                    vatAmount,
                    totalAmount,
                    currencyId: rowCurrencyId || null,
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
                  caseId: projectId,
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
                  currencyId: rowCurrencyId || null,
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
            const psCreateRes = await createProjectService({
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
              currencyId: rowCurrencyId || null,
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
            const rawCreatedProjectServiceId =
              psCreateRes?.data?.data?.id || psCreateRes?.data?.id;
            const createdProjectServiceId = rawCreatedProjectServiceId
              ? parseInt(rawCreatedProjectServiceId)
              : null;
            await createCustomDraftTasksForService(r, createdProjectServiceId);
            await syncCatalogServiceTasks(r, createdProjectServiceId);
            if (createdProjectServiceId && r._contractServiceId) {
              await ctx.api
                .request({
                  url: "contractServices:update",
                  method: "POST",
                  params: { filterByTk: parseInt(r._contractServiceId) },
                  data: {
                    projectId,
                    projectServiceId: createdProjectServiceId,
                    projectServices: createdProjectServiceId,
                  },
                })
                .catch((error) => {
                  console.warn("Could not link contractService to projectService:", error);
                });
            }
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
            const quotationTotals =
              quotationFinancialSummary?.converted ||
              buildServiceFinancialSummary({
                rows,
                currencies,
                baseCurrency: selectedCurrency,
                pricingDate: form.date,
                packageMode: activePackageMode,
                activeFinancialSourceType,
                includeBillingModes: [BILLING_LINE],
              }).converted;
            const quotationUpdateData = {
              subTotal: quotationTotals.subTotal,
              vatAmount: quotationTotals.vatAmount,
              totalAmount: quotationTotals.totalAmount,
              currencyId: form.currencyId ? parseInt(form.currencyId) : null,
              customerId: cq.customerId
                ? parseInt(cq.customerId)
                : cq.customer?.id
                  ? parseInt(cq.customer.id)
                  : null,
              internalCompanyId: cq.internalCompanyId
                ? parseInt(cq.internalCompanyId)
                : null,
            };
            try {
              await ctx.api.request({
                url: "quotations:update",
                method: "POST",
                params: { filterByTk: cq.id },
                data: quotationUpdateData,
              });
            } catch (error) {
              const fallbackQuotationUpdateData = { ...quotationUpdateData };
              delete fallbackQuotationUpdateData.currencyId;
              console.warn("Retrying quotation total update without currencyId:", error);
              await ctx.api.request({
                url: "quotations:update",
                method: "POST",
                params: { filterByTk: cq.id },
                data: fallbackQuotationUpdateData,
              });
            }
          }
        }
      } else {
        // No quotation active (e.g. rows.length === 0 but user creates case anyway)
        const initialSnap = initialRowsRef.current || [];
        if (activeFinancialSourceType === SOURCE_CONTRACT && !activePackageMode) {
          for (const snap of initialSnap) {
            const stillExists = rows.some(
              (r) =>
                (snap._contractServiceId &&
                  String(r._contractServiceId) === String(snap._contractServiceId)) ||
                (snap.serviceId && String(r.serviceId) === String(snap.serviceId)),
            );
            if (!stillExists && snap._contractServiceId) {
              await requestContractService({
                action: "update",
                id: snap._contractServiceId,
                data: { status: "deleted", lineStatus: "deleted" },
              });
            }
          }
        }
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
          const rowCurrencyId = extractCurrencyId(r.currencyId) || extractCurrencyId(form.currencyId);
          let contractSvcId = r._contractServiceId ? parseInt(r._contractServiceId) : null;
          const shouldSyncContractService =
            activeFinancialSourceType === SOURCE_CONTRACT &&
            form.contractId &&
            ((!activePackageMode && rowBillingMode === BILLING_LINE) ||
              rowBillingMode === BILLING_PACKAGE_INCLUDED);
          if (shouldSyncContractService) {
            const serviceId = r.serviceId ? parseInt(r.serviceId) : null;
            const contractServicePayload = {
              contractId: parseInt(form.contractId),
              contracts: parseInt(form.contractId),
              projectId,
              serviceId,
              ServiceId: serviceId,
              services: serviceId || undefined,
              serviceName: r.serviceName.trim(),
              serviceType: r.serviceType?.trim() || null,
              description: r.description?.trim() || null,
              quantity: 1,
              currencyId: rowCurrencyId || null,
              basePrice: price,
              vat: vatPct,
              subTotal: amounts.subTotal,
              vatAmount: amounts.vatAmount,
              totalAmount: amounts.totalAmount,
              pricingMode: rowPricingMode,
              ...rowPackageFields,
              billingMode: rowBillingMode,
              financialSourceType: rowFinancialSourceType,
              lineStatus: deriveStatus({ ...r, billingMode: rowBillingMode }),
            };
            setSubmitStep(`Syncing contract service ${i + 1}/${rows.length}...`);
            if (contractSvcId) {
              await requestContractService({
                action: "update",
                id: contractSvcId,
                data: contractServicePayload,
              });
            } else {
              const contractSvcRes = await requestContractService({
                action: "create",
                data: contractServicePayload,
              });
              const rawContractSvcId =
                contractSvcRes?.data?.data?.id ||
                contractSvcRes?.data?.id ||
                contractSvcRes?.id;
              contractSvcId = rawContractSvcId ? parseInt(rawContractSvcId) : null;
            }
          }
          setSubmitStep(`Saving service ${i + 1}/${rows.length}...`);
          try {
            const psCreateRes = await createProjectService({
              projectId,
              contractId: form.contractId ? parseInt(form.contractId) : null,
              contractServiceId:
                rowFinancialSourceType === SOURCE_CONTRACT && contractSvcId
                  ? parseInt(contractSvcId)
                  : null,
              serviceId: r.serviceId ? parseInt(r.serviceId) : null,
              serviceName: r.serviceName.trim(),
              serviceType: r.serviceType?.trim() || null,
              description: r.description?.trim() || null,
              quantity: 1,
              currencyId: rowCurrencyId || null,
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
            const rawCreatedProjectServiceId =
              psCreateRes?.data?.data?.id || psCreateRes?.data?.id;
            const createdProjectServiceId = rawCreatedProjectServiceId
              ? parseInt(rawCreatedProjectServiceId)
              : null;
            await createCustomDraftTasksForService(r, createdProjectServiceId);
            await syncCatalogServiceTasks(r, createdProjectServiceId);
            if (createdProjectServiceId && contractSvcId) {
              await requestContractService({
                action: "update",
                id: contractSvcId,
                data: {
                  projectId,
                  projectServiceId: createdProjectServiceId,
                  projectServices: createdProjectServiceId,
                },
              });
            }
          } catch (e) {
            console.warn("Could not create projectService:", e);
          }
        }
        if (activeFinancialSourceType === SOURCE_CONTRACT && form.contractId && !activePackageMode) {
          setSubmitStep("Updating contract total...");
          const currentContract =
            selectedContract ||
            contracts.find((c) => String(c.id) === String(form.contractId));
          const contractTotals =
            contractFinancialSummary?.converted ||
            buildServiceFinancialSummary({
              rows,
              currencies,
              baseCurrency: selectedCurrency,
              pricingDate: form.date,
              packageMode: activePackageMode,
              activeFinancialSourceType,
              includeBillingModes: [BILLING_LINE],
            }).converted;
          const isRetainer = String(currentContract?.contractType || "").toLowerCase() === "retainer";
          await updateContractHeaderSafely(form.contractId, {
            subTotal: contractTotals.subTotal,
            vatAmount: contractTotals.vatAmount,
            totalAmount: contractTotals.totalAmount,
            currencyId: form.currencyId ? parseInt(form.currencyId) : null,
            ...(!isRetainer ? { fixedAmount: contractTotals.totalAmount } : {}),
            customerId: currentContract?.customerId
              ? parseInt(currentContract.customerId)
              : currentContract?.customer?.id
                ? parseInt(currentContract.customer.id)
                : form.customerId
                  ? parseInt(form.customerId)
                  : null,
            internalCompanyId: currentContract?.internalCompanyId
              ? parseInt(currentContract.internalCompanyId)
              : form.internalCompanyId
                ? parseInt(form.internalCompanyId)
                : null,
          });
        }
      }

      // Sync the Case's own totalAmount from all money-bearing service rows,
      // regardless of pricing mode. Package mode has a single authoritative
      // number already entered by the user (form.packageTotalAmount, in the
      // Case's own currency — no per-row conversion needed); Line mode has to
      // be summed from `rows` (which can carry mixed per-row currencies) and
      // converted into the Case's own currency.
      setSubmitStep("Updating case total...");
      try {
        let caseTotalAmount = null;
        if (activePackageMode) {
          caseTotalAmount = Number(form.packageTotalAmount) || 0;
        } else {
          const casePreliminarySummary = buildServiceFinancialSummary({
            rows,
            currencies,
            baseCurrency: selectedCurrency,
            pricingDate: form.date,
            packageMode: activePackageMode,
            activeFinancialSourceType,
          });
          const caseRateCurrencyIds = getConversionSourceCurrencyIds(
            casePreliminarySummary.groups,
            selectedCurrency,
          );
          const caseExchangeRates = caseRateCurrencyIds.length
            ? await fetchExchangeRatesForConversion(caseRateCurrencyIds, extractCurrencyId(selectedCurrency))
            : [];
          const caseFinancialSummary = buildServiceFinancialSummary({
            rows,
            currencies,
            baseCurrency: selectedCurrency,
            exchangeRates: caseExchangeRates,
            pricingDate: form.date,
            packageMode: activePackageMode,
            activeFinancialSourceType,
          });
          if (caseFinancialSummary.converted.canConvert) {
            caseTotalAmount = caseFinancialSummary.converted.totalAmount;
          } else {
            console.warn(
              "[CaseCreateForm] Could not sync case totalAmount — missing exchange rate:",
              formatMissingRatePairs(caseFinancialSummary.missing, selectedCurrency),
            );
          }
        }
        if (caseTotalAmount !== null) {
          await ctx.api.request({
            url: "projects:update",
            method: "POST",
            params: { filterByTk: projectId },
            data: { totalAmount: caseTotalAmount },
          });
        }
      } catch (caseTotalError) {
        console.warn("[CaseCreateForm] Could not sync case totalAmount:", caseTotalError);
      }

      const getNumericId = (value) => {
        if (!value) return null;
        if (typeof value === "object") {
          return getNumericId(value.id || value.value || value.key);
        }
        const parsed = parseInt(value);
        return Number.isFinite(parsed) ? parsed : null;
      };

      const assignDefaultFolderPermissions = async (folderIds = []) => {
        const safeFolderIds = Array.from(
          new Set(folderIds.map(getNumericId).filter(Boolean)),
        );
        if (!safeFolderIds.length) return;

        // managerId is already a lawyers.id (direct select), no more
        // user->lawyer lookup needed here.
        const managerLawyerId = getNumericId(form.managerId);
        const memberLawyerIds = Array.from(
          new Set((form.lawyerIds || []).map(getNumericId).filter(Boolean)),
        ).filter((lawyerId) => lawyerId !== managerLawyerId);

        if (!managerLawyerId && !memberLawyerIds.length) return;

        const permissionPromises = [];
        safeFolderIds.forEach((folderId) => {
          if (managerLawyerId) {
            permissionPromises.push(
              ctx.api
                .request({
                  url: "folderManagers:create",
                  method: "POST",
                  data: { folderId, lawyerId: managerLawyerId, role: "manager" },
                })
                .catch((error) => {
                  console.warn("Could not create folder manager:", error);
                }),
            );
          }

          memberLawyerIds.forEach((lawyerId) => {
            permissionPromises.push(
              ctx.api
                .request({
                  url: "folderMembers:create",
                  method: "POST",
                  data: { folderId, lawyerId, role: "viewer" },
                })
                .catch((error) => {
                  console.warn("Could not create folder member:", error);
                }),
            );
          });
        });

        await Promise.all(permissionPromises);
      };

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
          // 🌟 folderTemplateKey: định danh ổn định cho từng folder mẫu,
          // dùng để lọc/tìm lại đúng folder (vd "legal_study") mà không phụ
          // thuộc vào tên hiển thị (name có thể bị user đổi sau này).
          const defaultChildren = [
            { name: "Legal Study", key: "legal_study" },
            { name: "LSC & Related", key: "lsc_related" },
            { name: "Legal docs", key: "legal_docs" },
            { name: "Legal dossiers", key: "legal_dossiers" },
            { name: "Report and Result", key: "report_result" },
          ];

          // 2. Case only creates the fixed template folders.
          const allChildren = defaultChildren;

          const childPromises = allChildren.map((child) => {
            const data = {
              name: child.name,
              type: "cases",
              folderTemplateKey: child.key,
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

          const childResults = await Promise.all(childPromises);
          const childFolderIds = childResults
            .map((result) => result?.data?.data?.id || result?.data?.id)
            .map(getNumericId)
            .filter(Boolean);

          setSubmitStep("Assigning folder permissions...");
          await assignDefaultFolderPermissions([pFolderId, ...childFolderIds]);
        }
      } catch (err) {
        console.warn("Could not create folder structure:", err);
      }

      message.success("Case created successfully!");
      isDirtyRef.current = false;
      setSubmittingState(false);
      setSubmitStep("");
      await closePopupAfterSubmit();
      return;
    } catch (e) {
      console.error("Submit error:", e);
      message.error("Error: " + (e?.message || "Please try again"));
    }

    setSubmittingState(false);
    setSubmitStep("");
  };

  const filteredSvcOpts = useMemo(
    () =>
      form.internalCompanyId
        ? svcOpts.filter(
          (s) =>
            isSameInternalCompany(s, form.internalCompanyId),
        )
        : [],
    [svcOpts, form.internalCompanyId],
  );

  const handleInternalCompanyChange = useCallback((value) => {
    const nextInternalCompanyId = value || null;
    const currentInternalCompanyId = form.internalCompanyId || null;
    if (String(nextInternalCompanyId || "") === String(currentInternalCompanyId || "")) return;
    markDirty();
    initialRowsRef.current = [];
    setRows([]);
    setForm((p) => ({
      ...p,
      internalCompanyId: nextInternalCompanyId,
      contractId: null,
      quotationId: null,
      ...financialStateFromRecord(null, SOURCE_NONE),
    }));
  }, [form.internalCompanyId, markDirty]);

  // Preview/auto-fill caseCode as "C" + STT(3) + MM + YYYY for companies whose
  // shortName is CBI or VLIC. STT is counted independently per company so the
  // two companies never collide on the same code. Never overwrites a caseCode
  // the user has already typed by hand.
  useEffect(() => {
    const requestId = ++caseCodeRequestRef.current;
    const selectedCompany = internalCompanies.find(
      (c) => String(c.id) === String(form.internalCompanyId || ""),
    );
    const shortName = selectedCompany?.shortName || "";
    const eligible =
      !!form.internalCompanyId &&
      !!CASE_CODE_PREFIX_BY_SHORT_NAME[String(shortName).trim().toUpperCase()];

    if (!eligible) {
      setCaseCodePreview(null);
      if (lastAutoCaseCodeRef.current && form.caseCode === lastAutoCaseCodeRef.current) {
        lastAutoCaseCodeRef.current = "";
        setF("caseCode", "");
      }
      return;
    }

    generateCaseCode({
      internalCompanyId: form.internalCompanyId,
      shortName,
      dateValue: form.date,
    }).then((code) => {
      if (requestId !== caseCodeRequestRef.current || !code) return;
      setCaseCodePreview({ shortName: shortName.trim().toUpperCase(), code });
      if (!form.caseCode || form.caseCode === lastAutoCaseCodeRef.current) {
        lastAutoCaseCodeRef.current = code;
        setF("caseCode", code);
      }
    });
  }, [form.internalCompanyId, form.date, internalCompanies]);

  if (loading)
    return React.createElement(
      "div",
      { style: { textAlign: "center", padding: 80 } },
      React.createElement(Spin, { size: "large" }),
    );

  const selStyle = { ...inp(), cursor: "pointer" };
  const CUSTOMER_SOURCE_LABELS = {
    googleAds: "Google Ads",
    facebookAds: "Facebook Ads",
    zalo: "Zalo",
    referral: "Referral",
    website: "Website",
    hotline: "Hotline",
    partner: "Partner",
    lawyer: "Lawyer",
    staff: "Staff",
  };
  const formatCustomerSource = (source) => {
    const raw = String(source || "").trim();
    if (!raw) return "Not set";
    return CUSTOMER_SOURCE_LABELS[raw] ||
      raw
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
  };
  const getCustomerSourceSub = (c) => `Source: ${formatCustomerSource(c?.source)}`;
  const getCustomerName = (c) =>
    c.customerName || c.name || c.fullName || `Customer #${c.id}`;
  const getCustomerSub = (c) =>
    [c.phone || c.phoneNumber, c.email].filter(Boolean).join(" · ");
  const getLawyerName = (l) =>
    l.user?.nickname ||
    l.lawyerName ||
    l.name ||
    [l.firstName, l.lastName].filter(Boolean).join(" ") ||
    l.user?.username ||
    l.user?.email ||
    `#${l.id}`;
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
      ? formatMoney(q.totalAmount, currencyFromRecord(q, currencies, selectedCurrency))
      : "";
    const mode = isPackagePricing(q) ? "Package pricing" : "Line pricing";
    return [mode, n, t].filter(Boolean).join(" · ");
  };

  const customerContracts = contracts.filter(
    (c) =>
      (!form.internalCompanyId || isSameInternalCompany(c, form.internalCompanyId)) &&
      (!form.customerId ||
        String(c.customerId) === String(form.customerId) ||
        String(c.customer?.id) === String(form.customerId)),
  );

  const usedQuotationIds = new Set(
    projects.filter((p) => p.quotationId).map((p) => String(p.quotationId)),
  );

  const customerQuotations = quotations.filter(
    (q) =>
      (!form.internalCompanyId || isSameInternalCompany(q, form.internalCompanyId)) &&
      (!form.customerId ||
        String(q.customerId) === String(form.customerId) ||
        String(q.customer?.id) === String(form.customerId)) &&
      !usedQuotationIds.has(String(q.id)),
  );

  const renderRelatedToSection = () =>
    React.createElement(
      "section",
      {
        style: {
          marginBottom: 16,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            position: "relative",
            opacity: form.internalCompanyId ? 1 : 0.55,
            pointerEvents: form.internalCompanyId ? "auto" : "none",
          },
        },
        React.createElement(
          Field,
          {
            label: "Customer",
            required: true,
            hint: currentCustomer ? getCustomerSourceSub(currentCustomer) : undefined,
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
            getItemSub: (customer) =>
              [getCustomerSourceSub(customer), getCustomerSub(customer)].filter(Boolean).join(" - "),
            currentItem: currentCustomer,
            disabled: !form.internalCompanyId,
            onAddNew: () =>
              openCreatePopup(
                "customerCreate",
                refreshCustomers,
                { internalCompanyId: form.internalCompanyId },
                {
                  beforeIds: customers.map((c) => c.id),
                  onCreated: (id, record) => {
                    if (record) setCustomers((prev) => mergeRecordById(prev, record));
                    handleCustomerChange(id, record);
                  },
                },
              ),
          }),
        ),
        form.customerId &&
        React.createElement(
          "div",
          {
            style: {
              padding: "0 0 12px",
              background: "transparent",
              border: "none",
              borderRadius: 0,
              marginBottom: 16,
              fontSize: 13,
              color: C.textSub,
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
                openCreatePopup(
                  "contractCreate",
                  refreshContracts,
                  {
                    customerId: form.customerId,
                    internalCompanyId: form.internalCompanyId,
                    lawyerId: form.lawyerIds?.[0] || form.managerId,
                    quotationId: form.quotationId,
                    projectId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                    caseId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                  },
                  {
                    beforeIds: contracts.map((c) => c.id),
                    onCreated: (id, record) => {
                      if (record) setContracts((prev) => mergeRecordById(prev, record));
                      handleContractChange(id, record);
                    },
                  },
                ),
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
                openCreatePopup(
                  "quotationCreate",
                  refreshQuotations,
                  {
                    customerId: form.customerId,
                    internalCompanyId: form.internalCompanyId,
                    lawyerId: form.lawyerIds?.[0] || form.managerId,
                    projectId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                    caseId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                  },
                  {
                    beforeIds: quotations.map((q) => q.id),
                    onCreated: (id, record) => {
                      if (record) setQuotations((prev) => mergeRecordById(prev, record));
                      handleQuotationChange(id, record);
                    },
                  },
                ),
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
      onChange: markDirty,
      onInput: markDirty,
    },

    React.createElement(
      Card,
      null,
      React.createElement(CardHeader, { title: "Case Information" }),
      React.createElement(
        "div",
        { style: { padding: "18px 20px" } },

        React.createElement(
          Field,
          { label: "Internal Company", required: true, mb: 16 },
          Select
            ? React.createElement(Select, {
              showSearch: true,
              allowClear: true,
              value: form.internalCompanyId ? String(form.internalCompanyId) : undefined,
              placeholder: "Select company",
              optionFilterProp: "label",
              style: { width: "100%" },
              onChange: handleInternalCompanyChange,
              options: internalCompanies.map((c) => ({
                value: String(c.id),
                label: c.companyName || c.name || `Company #${c.id}`,
              })),
            })
            : React.createElement(
              "select",
              {
                value: form.internalCompanyId || "",
                onChange: (e) => {
                  handleInternalCompanyChange(e.target.value || null);
                },
                style: selStyle,
              },
              React.createElement("option", { value: "" }, "Select company"),
              ...internalCompanies.map((c) =>
                React.createElement(
                  "option",
                  { key: c.id, value: c.id },
                  c.companyName || c.name || `Company #${c.id}`,
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
            {
              label: "Case Code",
              hint: caseCodePreview
                ? `Auto (${caseCodePreview.shortName}): next is ${caseCodePreview.code} — editable`
                : "optional",
            },
            Input
              ? React.createElement(Input, {
                value: form.caseCode,
                onChange: (e) => setF("caseCode", e.target.value),
                placeholder: "E.g. CBI-2025-001",
              })
              : React.createElement("input", {
                value: form.caseCode,
                onChange: (e) => setF("caseCode", e.target.value),
                placeholder: "E.g. CBI-2025-001",
                style: inp(),
                onFocus,
                onBlur,
              }),
          ),
          React.createElement(
            Field,
            { label: "Case Name", required: true },
            Input
              ? React.createElement(Input, {
                value: form.projectName,
                onChange: (e) => setF("projectName", e.target.value),
                placeholder: "E.g. Real estate purchase contract consultation...",
              })
              : React.createElement("input", {
                value: form.projectName,
                onChange: (e) => setF("projectName", e.target.value),
                placeholder: "E.g. Real estate purchase contract consultation...",
                style: { ...inp(), fontSize: 14, fontWeight: 500 },
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
          "Team Members",
        ),
        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 16 },
          React.createElement(
            Field,
            { label: "Manager", hint: "optional" },
            Select
              ? React.createElement(Select, {
                showSearch: true,
                allowClear: true,
                value: form.managerId ? String(form.managerId) : undefined,
                placeholder: "Select manager",
                optionFilterProp: "label",
                style: { width: "100%" },
                onChange: (value) => setF("managerId", value || null),
                options: lawyers.map((lawyer) => ({
                  value: String(lawyer.id),
                  label: getLawyerName(lawyer),
                })),
              })
              : React.createElement(PersonDropdown, {
                items: lawyers,
                value: form.managerId,
                onChange: (v) => setF("managerId", v),
                placeholder: "— Select manager —",
                getItemName: getLawyerName,
              }),
          ),
          React.createElement(
            Field,
            { label: "Members", hint: "optional — multiple" },
            Select
              ? React.createElement(Select, {
                mode: "multiple",
                showSearch: true,
                allowClear: true,
                value: (form.lawyerIds || []).map((id) => String(id)),
                placeholder: "Select lawyers",
                optionFilterProp: "label",
                style: { width: "100%" },
                onChange: (value) => setF("lawyerIds", value || []),
                options: membersLawyers.map((lawyer) => ({
                  value: String(lawyer.id),
                  label: getLawyerName(lawyer),
                })),
              })
              : React.createElement(MultiPersonDropdown, {
                items: membersLawyers,
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

    // Loading overlay for services
    React.createElement(
      Card,
      null,
      loadingServices &&
      React.createElement(
        "div",
        {
          style: {
            padding: "12px 16px",
            background: C.bgSection,
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: C.textSub,
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
        currency: selectedCurrency,
        currencies,
        pricingDate: form.date,
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
        onCurrencyChange: (value) => setF("currencyId", value || null),
        taskTemplates,
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
      Space
        ? React.createElement(
          Space,
          null,
          React.createElement(Button, { onClick: requestClose }, "Cancel"),
          React.createElement(
            Button,
            {
              type: "primary",
              loading: submitting,
              onClick: submitting ? undefined : handleSubmit,
            },
            "Submit",
          ),
        )
        : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            {
              onClick: requestClose,
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
                transition: "all 0.15s",
                fontFamily: FONT,
              },
            },
            submitting ? "Processing..." : "Submit",
          ),
        ),
    ),
  );
};

ctx.render(React.createElement(ProjectCreateForm, null));
