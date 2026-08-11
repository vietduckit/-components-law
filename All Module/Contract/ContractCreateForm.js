const { React } = ctx;
const { useCallback, useEffect, useMemo, useRef, useState } = React;
const {
  Spin,
  message,
  Tooltip,
  Modal,
  Form: AntForm,
  Input: AntInput,
  Select: AntSelect,
  Button: AntButton,
} = ctx.antd;

const FONT = "inherit";
const CASE_DOCUMENT_SCOPE = "case_document";
const AUTO_CREATE_CONTRACT_FOLDERS = false;
const DEFAULT_CURRENCY_CODE = "VND";
const CURRENCY_RESOURCE_CANDIDATES = [
  "currencies:list",
  "currency:list",
  "Currency:list",
];
const EXCHANGE_RATE_RESOURCE_CANDIDATES = [
  "exchangeRates:list",
  "exchangeRate:list",
  "ExchangeRates:list",
];

const C = {
  primary: "#1677ff",
  border: "#d9d9d9",
  borderFocus: "#1677ff",
  text: "rgba(0, 0, 0, 0.88)",
  sub: "rgba(0, 0, 0, 0.45)",
  label: "rgba(0, 0, 0, 0.88)",
  bg: "#ffffff",
  bgSoft: "#fafafa",
  danger: "#ff4d4f",
  approvalBg: "#f5f5f5",
  approvalBorder: "#d9d9d9",
  approvalText: "rgba(0, 0, 0, 0.65)",
  approvalBadgeBg: "#f5f5f5",
};

// Current page context from the NocoBase record JSON.
const PROJECT_RECORD_CONFIG = {
  record: ctx.record || null,
};

const CONTRACT_TYPES = [
  { value: "byCase", label: "By case" },
  { value: "retainer", label: "Retainer" },
];

const FEE_MODELS = [
  { value: "fixed", label: "Fixed amount" },
  { value: "hourly", label: "Hourly" },
  { value: "monthlyRetainer", label: "Monthly retainer" },
  { value: "successFee", label: "Success fee" },
  { value: "hybrid", label: "Hybrid" },
];

const FEE_MODEL_BY_TYPE = {
  byCase: ["fixed", "hourly", "successFee", "hybrid"],
  retainer: ["monthlyRetainer", "fixed", "hourly", "hybrid"],
};

const BILLING_CYCLES = [
  { value: "one_time", label: "One time" },
  { value: "multiple_payments", label: "Multiple payments" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "milestone", label: "Milestone" },
  { value: "manual", label: "Manual" },
];

const RETAINER_REPEAT_ANCHORS = [
  { value: "day", label: "ngày" },
  { value: "month", label: "tháng" },
  { value: "year", label: "năm" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent for signature" },
  { value: "signed", label: "Signed" },
  { value: "negotiation", label: "Negotiation" },
  { value: "pending", label: "Pending" },
  { value: "approval", label: "Approval" },
  { value: "execution", label: "Execution" },
  { value: "completed", label: "Completed" },
  { value: "terminated", label: "Terminated" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
  { value: "expired", label: "Expired" },
];

const todayInput = () => new Date().toISOString().slice(0, 10);

const extractId = (value) => {
  const id = value && typeof value === "object" ? value.id : value;
  return id ? parseInt(id, 10) : null;
};

const extractFirstId = (value) => {
  if (Array.isArray(value)) return extractId(value[0]);
  return extractId(value);
};

const parseNum = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const extractCurrencyId = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return extractCurrencyId(value[0]);
  if (typeof value === "object")
    return extractCurrencyId(value.id || value.value || value.key);
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
  const match = String(value)
    .trim()
    .toUpperCase()
    .match(/\b[A-Z]{3}\b/);
  return match ? match[0] : "";
};
const getRecordCurrencyId = (record) =>
  extractCurrencyId(
    record?.currencyId ||
      record?.currency ||
      record?.currencies ||
      record?.Currencies ||
      record?.defaultCurrencyId ||
      record?.defaultCurrency,
  );
const getRecordCurrencyCode = (record) =>
  extractCurrencyCode(
    record?.currencyCode ||
      record?.currency ||
      record?.currencies ||
      record?.Currencies ||
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
  currency?.locale ||
  (getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE ? "vi-VN" : "en-US");
const defaultCurrencyObject = () => ({
  code: DEFAULT_CURRENCY_CODE,
  currencyCode: DEFAULT_CURRENCY_CODE,
  decimalPlaces: 0,
  locale: "vi-VN",
});
const findCurrencyById = (currencies = [], id) => {
  const safeId = extractCurrencyId(id);
  if (!safeId) return null;
  return (
    currencies.find((currency) => extractCurrencyId(currency?.id) === safeId) ||
    null
  );
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
  return safeCode
    ? {
        code: safeCode,
        currencyCode: safeCode,
        decimalPlaces: safeCode === DEFAULT_CURRENCY_CODE ? 0 : 2,
      }
    : null;
};
const resolveCurrency = (value, currencies = []) => {
  const source = Array.isArray(value) ? value[0] : value;
  return (
    findCurrencyById(currencies, source) ||
    findCurrencyByCode(currencies, source) ||
    (typeof source === "object" && extractCurrencyCode(source)
      ? source
      : null) ||
    currencyObjectFromCode(source)
  );
};
const findDefaultCurrency = (currencies = []) =>
  currencies.find(
    (currency) =>
      currency?.isBaseCurrency ||
      getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE,
  ) ||
  currencies[0] ||
  defaultCurrencyObject();
const currencyFromRecordOptional = (record, currencies = [], fallback = null) =>
  resolveCurrency(
    record?.currency ||
      record?.currencies ||
      record?.Currencies ||
      record?.currencyId,
    currencies,
  ) ||
  resolveCurrency(getRecordCurrencyId(record), currencies) ||
  resolveCurrency(getRecordCurrencyCode(record), currencies) ||
  resolveCurrency(fallback, currencies);
const currencyFromRecord = (record, currencies = [], fallback = null) =>
  currencyFromRecordOptional(record, currencies, fallback) ||
  fallback ||
  defaultCurrencyObject();
const currencySelectLabel = (currency) => {
  const code = getCurrencyCode(currency);
  return code;
};
const formatMoneyAmountByCurrency = (value, currency = null) => {
  if (!value && value !== 0) return "";
  const info = currency || defaultCurrencyObject();
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString(getCurrencyLocale(info), {
    minimumFractionDigits: 0,
    maximumFractionDigits: getCurrencyDecimals(info),
  });
};
const formatMoneyByCurrency = (value, currency = null) => {
  const info = currency || defaultCurrencyObject();
  const amount = formatMoneyAmountByCurrency(value, info);
  return amount ? `${amount} ${getCurrencyCode(info)}` : "";
};
const isSameCurrency = (a, b) => {
  const aId = extractCurrencyId(a);
  const bId = extractCurrencyId(b);
  if (aId && bId) return aId === bId;
  const aCode = extractCurrencyCode(a);
  const bCode = extractCurrencyCode(b);
  return !!aCode && !!bCode && aCode === bCode;
};
const parseDateMillis = (value) => {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
};
const getExchangeRateCurrencyId = (rate, side) =>
  extractCurrencyId(rate?.[`${side}CurrencyId`] || rate?.[`${side}Currency`]);
const getExchangeRateCurrencyCode = (rate, side) =>
  extractCurrencyCode(
    rate?.[`${side}Currency`] || rate?.[`${side}CurrencyCode`],
  );
const isUsableExchangeRateStatus = (status) => {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  if (!value) return true;
  return ![
    "inactive",
    "disabled",
    "archived",
    "cancelled",
    "canceled",
    "draft",
  ].includes(value);
};
const exchangeRateMatchesCurrency = (rate, side, currency) => {
  const rateCurrencyId = getExchangeRateCurrencyId(rate, side);
  const currencyId = extractCurrencyId(currency);
  if (rateCurrencyId && currencyId) return rateCurrencyId === currencyId;
  const rateCurrencyCode = getExchangeRateCurrencyCode(rate, side);
  const currencyCode = extractCurrencyCode(currency);
  return (
    !!rateCurrencyCode && !!currencyCode && rateCurrencyCode === currencyCode
  );
};
const pickExchangeRate = (
  rates = [],
  fromCurrency,
  toCurrency,
  pricingDate,
) => {
  const cutoff = parseDateMillis(pricingDate) || Date.now();
  return (
    (rates || [])
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
      .sort((a, b) => b.effectiveMs - a.effectiveMs)[0] || null
  );
};
const pickConversionRate = (
  rates = [],
  fromCurrency,
  toCurrency,
  pricingDate,
) => {
  const direct = pickExchangeRate(rates, fromCurrency, toCurrency, pricingDate);
  if (direct) return { ...direct, direction: "direct" };
  const inverse = pickExchangeRate(
    rates,
    toCurrency,
    fromCurrency,
    pricingDate,
  );
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
const buildContractFinancialSummary = ({
  rows = [],
  currencies = [],
  baseCurrency = null,
  exchangeRates = [],
  pricingDate,
  packageMode = false,
  packageTotals = null,
} = {}) => {
  const targetCurrency = baseCurrency || findDefaultCurrency(currencies);
  if (packageMode) {
    const amounts = resolveServiceAmounts(packageTotals || {});
    return {
      groups: [],
      missing: [],
      converted: { ...amounts, canConvert: true, currency: targetCurrency },
    };
  }
  const byCurrency = {};
  (rows || []).forEach((row) => {
    if (!row) return;
    const amounts = resolveServiceAmounts(row);
    if (!amounts.subTotal && !amounts.vatAmount && !amounts.totalAmount) return;
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
  });
  const groups = Object.values(byCurrency);
  const missing = [];
  const converted = groups.reduce(
    (acc, group) => {
      const matched = isSameCurrency(group.currency, targetCurrency)
        ? { rate: 1 }
        : pickConversionRate(
            exchangeRates,
            group.currency,
            targetCurrency,
            pricingDate,
          );
      if (!matched?.rate) {
        missing.push(group);
        return acc;
      }
      return {
        subTotal: acc.subTotal + group.subTotal * matched.rate,
        vatAmount: acc.vatAmount + group.vatAmount * matched.rate,
        totalAmount: acc.totalAmount + group.totalAmount * matched.rate,
      };
    },
    { subTotal: 0, vatAmount: 0, totalAmount: 0 },
  );
  return {
    groups,
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

const nullableNum = (value) =>
  value === undefined || value === null || value === ""
    ? null
    : parseNum(value);

const formatMoneyNumber = (value) => {
  const raw = String(value ?? "").replace(/[^\d]/g, "");
  if (!raw) return "";
  return Number(raw).toLocaleString("vi-VN");
};

const moneyRaw = (value) => String(value ?? "").replace(/[^\d]/g, "");
const hasInputValue = (value) =>
  value !== undefined && value !== null && value !== "";

const compact = (items) =>
  items
    .map((item) =>
      item === undefined || item === null ? "" : String(item).trim(),
    )
    .filter(Boolean);

const SYSTEM_USER_ID = 1;
const QUICK_CREATE_CREATED_EVENT = "law:quick-create:created";
const QUICK_CREATE_BRIDGE_KEY = "__lawQuickCreateBridge";
const CONTRACT_REFRESH_BLOCK_UID = "7be57facee6";
const QUOTATION_REFRESH_BLOCK_UID = "sowlvtiiqkv";
// The Contract module's own list block — confirmed via NocoBase View Settings.
const DEFAULT_REFRESH_BLOCK_UID = CONTRACT_REFRESH_BLOCK_UID;
const ADDITIONAL_REFRESH_BLOCK_UIDS = [
  CONTRACT_REFRESH_BLOCK_UID,
  QUOTATION_REFRESH_BLOCK_UID,
];
const POPUP_VIEW_UIDS = {
  customerCreate: "onjascp1npq",
  quotationCreate: "v44ehxkcghx",
  templateCreate: "c17e97e4828",
};
const QUICK_CREATE_COLLECTION_BY_VIEW = {
  customerCreate: "customers",
  quotationCreate: "quotations",
  templateCreate: "template",
};
const QUICK_CREATE_REFRESH_BLOCK_UID_BY_VIEW = {
  quotationCreate: QUOTATION_REFRESH_BLOCK_UID,
};
const isSystemUserId = (value) => extractId(value) === SYSTEM_USER_ID;
const filterSelectableLawyers = (items = []) =>
  (items || []).filter((item) => {
    const linkedUserId =
      extractId(item?.userId) ||
      extractId(item?.user) ||
      extractId(item?.users) ||
      extractId(item?.accountId) ||
      extractId(item?.account);
    return linkedUserId
      ? !isSystemUserId(linkedUserId)
      : !isSystemUserId(item?.id);
  });

const getQuickCreateBridge = () => {
  const scope =
    ctx.engine || ctx.app || (typeof window !== "undefined" ? window : null);
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
            console.warn(
              "[ContractCreateForm] quick-create bridge listener failed",
              error,
            );
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
              console.warn(
                "[ContractCreateForm] quick-create bridge replay failed",
                error,
              );
            }
          });
        }
        return () => listeners.delete(listener);
      },
    };
  }
  return scope[QUICK_CREATE_BRIDGE_KEY];
};

// `getPopupParams()` (defined below) merges the exact same raw ctx sources plus
// derived fields, so this just delegates to it as the single source of truth.
const getRuntimeInput = () => {
  try {
    return getPopupParams();
  } catch {
    return {};
  }
};

const getBlockModelByUid = (uid) => {
  if (!uid) return null;
  const engine = ctx.engine || ctx.app;
  try {
    let foundVia = "NOT FOUND";
    let model = ctx.getModel?.(uid, true);
    if (model) foundVia = "ctx.getModel(uid,true)";
    if (!model) {
      model = ctx.getModel?.(uid);
      if (model) foundVia = "ctx.getModel(uid)";
    }
    if (!model) {
      model = engine?.getModel?.(uid);
      if (model) foundVia = "engine.getModel(uid)";
    }
    if (!model && ctx.app && ctx.app !== engine) {
      model = ctx.app?.getModel?.(uid);
      if (model) foundVia = "ctx.app.getModel(uid)";
    }
    console.log("[ContractCreateForm][refresh-debug] getBlockModelByUid", {
      uid,
      foundVia,
      hasEngine: !!engine,
      hasCtxGetModel: typeof ctx.getModel === "function",
      resolvedHasResource: !!(model && model.resource),
      resolvedHasRefreshFn: !!(model && typeof model.refresh === "function"),
    });
    return model || null;
  } catch (error) {
    console.warn("[ContractCreateForm] get model failed", uid, error);
    return null;
  }
};

const refreshBlockModel = async (blockModel, uidForLog) => {
  if (!blockModel) return false;
  try {
    const resource = blockModel.resource;
    if (resource && typeof resource.refresh === "function") {
      await resource.refresh();
      console.log(
        "[ContractCreateForm][refresh-debug] refreshed via resource.refresh()",
        uidForLog,
      );
      return true;
    }
    if (typeof blockModel.refresh === "function") {
      await blockModel.refresh();
      console.log(
        "[ContractCreateForm][refresh-debug] refreshed via blockModel.refresh()",
        uidForLog,
      );
      return true;
    }
    console.warn(
      "[ContractCreateForm][refresh-debug] model found but has no resource.refresh/refresh function",
      uidForLog,
      blockModel,
    );
  } catch (error) {
    console.warn("[ContractCreateForm] refresh failed", uidForLog, error);
  }
  return false;
};

// ctx.getModel(uid)/engine.getModel(uid) do not actually resolve blocks by a
// foreign UID in this NocoBase runtime (verified: even a UID copied straight
// from the block's own "Copy UID" menu returns nothing) — there is no
// documented cross-block "get model by uid" API (see
// nocobase-docs/runjs-ctx-api.md). The one thing that reliably updates the
// list is a real click on its own "Refresh" button, so simulate that via
// the DOM instead of guessing at model APIs.
const REFRESH_BUTTON_TEXT_VARIANTS = [
  "refresh",
  "làm mới",
  "tải lại",
  "reload",
];
const clickVisibleRefreshButtons = () => {
  try {
    const candidates = Array.from(
      document.querySelectorAll("button, [role='button']"),
    );
    const matches = candidates.filter((el) => {
      const text = (el.textContent || "").trim().toLowerCase();
      return REFRESH_BUTTON_TEXT_VARIANTS.includes(text);
    });
    matches.forEach((el) => {
      try {
        el.click();
      } catch (error) {
        console.warn(
          "[ContractCreateForm][refresh-debug] click failed on refresh button",
          error,
        );
      }
    });
    console.log(
      "[ContractCreateForm][refresh-debug] clickVisibleRefreshButtons matched",
      matches.length,
      "button(s)",
    );
    return matches.length > 0;
  } catch (error) {
    console.warn(
      "[ContractCreateForm][refresh-debug] clickVisibleRefreshButtons failed",
      error,
    );
    return false;
  }
};

// Mirrors CaseCreateForm.js's refreshNocoBaseDataBlocks: try each candidate
// block UID via ctx.getModel first (explicit runtime params, then the
// hardcoded DEFAULT_REFRESH_BLOCK_UID/ADDITIONAL_REFRESH_BLOCK_UIDS), fall
// back to the current block/model, and finally simulate a real click on any
// visible "Refresh" button as the mechanism actually proven to work.
const refreshNocoBaseDataBlocks = async () => {
  const input = getRuntimeInput();
  const inputRefreshBlockUids = Array.isArray(input.refreshBlockUids)
    ? input.refreshBlockUids
    : [input.refreshBlockUid, input.refreshBlockUids];
  const uidCandidates = Array.from(
    new Set(
      compact([
        input.targetBlockUid,
        input.sourceBlockUid,
        input.blockUid,
        input.dataBlockUid,
        ...inputRefreshBlockUids,
        DEFAULT_REFRESH_BLOCK_UID,
        ...ADDITIONAL_REFRESH_BLOCK_UIDS,
      ]),
    ),
  );
  console.log(
    "[ContractCreateForm][refresh-debug] uidCandidates",
    uidCandidates,
  );

  let refreshedAny = false;
  for (const uid of uidCandidates) {
    const refreshed = await refreshBlockModel(getBlockModelByUid(uid), uid);
    refreshedAny = refreshedAny || refreshed;
  }

  if (!refreshedAny) {
    console.warn(
      "[ContractCreateForm][refresh-debug] no candidate UID resolved to a refreshable model, falling back to ctx.blockModel/ctx.model",
    );
    refreshedAny = await refreshBlockModel(
      ctx.blockModel || ctx.model,
      "ctx.blockModel||ctx.model",
    );
  }

  const clickedRefreshButton = clickVisibleRefreshButtons();
  refreshedAny = refreshedAny || clickedRefreshButton;

  console.log(
    "[ContractCreateForm][refresh-debug] refreshNocoBaseDataBlocks result:",
    refreshedAny,
  );
  return refreshedAny;
};

const emitQuickCreateCreated = (collection, record) => {
  const id = extractId(record);
  if (!id) return;
  const input = getRuntimeInput();
  const detail = {
    collection,
    id: String(id),
    record,
    quickCreateRequestId: input.quickCreateRequestId || null,
    quickCreateViewKey: input.quickCreateViewKey || null,
    quickCreateSource: input.quickCreateSource || null,
    quickCreateTargetCollection:
      input.quickCreateTargetCollection || collection,
    sourceBlockUid: input.sourceBlockUid || null,
    targetBlockUid: input.targetBlockUid || CONTRACT_REFRESH_BLOCK_UID,
    dataBlockUid: input.dataBlockUid || CONTRACT_REFRESH_BLOCK_UID,
    refreshBlockUids: compact([
      input.refreshBlockUid,
      ...(Array.isArray(input.refreshBlockUids) ? input.refreshBlockUids : []),
      input.targetBlockUid,
      input.dataBlockUid,
      CONTRACT_REFRESH_BLOCK_UID,
    ]),
    createdAt: Date.now(),
  };
  try {
    getQuickCreateBridge()?.emit(detail);
  } catch {}
  try {
    window.dispatchEvent(
      new CustomEvent(QUICK_CREATE_CREATED_EVENT, { detail }),
    );
  } catch {}
  try {
    if (window.parent && window.parent !== window) {
      window.parent.dispatchEvent(
        new CustomEvent(QUICK_CREATE_CREATED_EVENT, { detail }),
      );
    }
  } catch {}
  try {
    ctx.emit?.(QUICK_CREATE_CREATED_EVENT, detail);
  } catch {}
  try {
    ctx.eventBus?.emit?.(QUICK_CREATE_CREATED_EVENT, detail);
  } catch {}
  try {
    ctx.view?.emit?.(QUICK_CREATE_CREATED_EVENT, detail);
  } catch {}
};

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
      params,
      defineProperties,
      ...params,
    });
    if (result?.then) await result;
    return true;
  } catch (error) {
    console.warn("[ContractCreateForm] ctx.openView failed", error);
    message.error("Cannot open configured popup view.");
    return false;
  }
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
        console.warn("[ContractCreateForm] close popup failed", error);
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
      console.warn("[ContractCreateForm] discard close failed", error);
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
        console.warn(
          "[ContractCreateForm] configure modal close failed",
          error,
        );
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
      console.warn("[ContractCreateForm] patch close failed", error);
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

const toIso = (dateValue) => {
  if (!dateValue) return null;
  const d = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const toIsoDateTime = (dateValue) => {
  if (!dateValue) return null;
  const value = String(dateValue);
  const d = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const labelOf = (item, fields, fallbackPrefix) => {
  for (const field of fields) {
    if (item?.[field]) return String(item[field]);
  }
  return `${fallbackPrefix} #${item?.id || ""}`.trim();
};

const firstPresent = (item, fields) => {
  for (const field of fields) {
    const value = item?.[field];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const quotationCustomerId = (quotation) =>
  extractId(quotation?.customerId) ||
  extractId(quotation?.customer) ||
  extractId(quotation?.customers);

const quotationInternalCompanyId = (quotation) =>
  extractId(quotation?.internalCompanyId) ||
  extractId(quotation?.internalCompany);

const quotationLawyerId = (quotation) =>
  extractId(quotation?.lawyerId) || extractId(quotation?.lawyer);

const isPackagePricing = (record) =>
  String(record?.pricingMode || "").toLowerCase() === "package";

const hasPackageMoney = (record) =>
  !!(
    record &&
    (parseNum(record.packageSubTotal) ||
      parseNum(record.packageTotalAmount) ||
      parseNum(record.packageVatAmount))
  );

const isPackageSource = (record) =>
  isPackagePricing(record) || hasPackageMoney(record);

const customerOverview = (customer) => {
  if (!customer) return "";
  return compact([
    firstPresent(customer, ["email", "customerEmail"]),
    firstPresent(customer, ["phone", "phoneNumber", "mobile"]),
    firstPresent(customer, ["companyName", "shortName"]),
    firstPresent(customer, ["taxCode"])
      ? `MST ${firstPresent(customer, ["taxCode"])}`
      : "",
  ])
    .slice(0, 2)
    .join(" · ");
};

const quotationOverview = (quotation, customers = []) => {
  const customerId = quotationCustomerId(quotation);
  const customer = customers.find(
    (item) => String(item.id) === String(customerId),
  );
  const customerName = customer
    ? labelOf(
        customer,
        ["customerName", "name", "fullName", "shortName"],
        "Customer",
      )
    : firstPresent(quotation, ["customerName"]);
  const amount = formatMoneyByCurrency(
    firstPresent(quotation, ["totalAmount", "grandTotal"]),
    currencyFromRecord(quotation, currencies),
  );
  return compact([customerName, amount ? `Total ${amount}` : ""]).join(" · ");
};

const customerLabel = (customer) =>
  compact([
    firstPresent(customer, [
      "customerName",
      "contactName",
      "clientName",
      "fullName",
      "name",
      "companyName",
      "shortName",
      "displayName",
    ]),
    firstPresent(customer, [
      "customerCode",
      "contactCode",
      "clientCode",
      "code",
    ])
      ? `(${firstPresent(customer, ["customerCode", "contactCode", "clientCode", "code"])})`
      : "",
  ]).join(" ") || (customer?.id ? `Customer #${customer.id}` : "Customer");

const relatedRecord = (value) => {
  if (Array.isArray(value)) {
    return value.find((item) => item && typeof item === "object") || null;
  }
  return value && typeof value === "object" ? value : null;
};

const relatedCustomerId = (record) =>
  extractId(record?.customerId) ||
  extractId(record?.customer) ||
  extractFirstId(record?.customers) ||
  extractId(record?.clientId) ||
  extractId(record?.client) ||
  extractFirstId(record?.clients);

const relatedCustomerName = (record, customers = []) => {
  const direct =
    relatedRecord(record?.customers) ||
    relatedRecord(record?.customer) ||
    relatedRecord(record?.clients) ||
    relatedRecord(record?.client);
  if (direct) return customerLabel(direct);

  const embeddedName = firstPresent(record, [
    "customerName",
    "clientName",
    "contactName",
    "customerFullName",
    "customerCompanyName",
  ]);
  if (embeddedName) return embeddedName;

  const customerId = relatedCustomerId(record);
  const lookup = customers.find(
    (item) => String(extractId(item?.id)) === String(customerId),
  );
  return lookup ? customerLabel(lookup) : "";
};

const companyLabel = (company) =>
  compact([
    firstPresent(company, ["name", "companyName", "displayName"]),
    firstPresent(company, ["shortName"])
      ? `(${firstPresent(company, ["shortName"])})`
      : "",
  ]).join(" ") || (company?.id ? `Company #${company.id}` : "Company");

const lawyerTypeLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const key = raw
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
  const labels = {
    lawyer: "Luật sư",
    suppliant: "Trợ lý pháp lý",
    partner: "Đối tác",
    managing_partner: "Đối tác điều hành",
    senior_partner: "Đối tác cấp cao",
    associate: "Luật sư cộng sự",
    senior_associate: "Luật sư cộng sự cấp cao",
    junior_associate: "Luật sư cộng sự",
    counsel: "Luật sư tư vấn",
    of_counsel: "Luật sư cố vấn",
    consultant: "Chuyên gia tư vấn",
    paralegal: "Trợ lý luật sư",
    legal_assistant: "Trợ lý pháp lý",
    trainee: "Luật sư tập sự",
    intern: "Thực tập sinh",
    collaborator: "Cộng tác viên",
    external: "Bên ngoài",
  };
  return labels[key] || raw;
};

const lawyerLabel = (lawyer) =>
  compact([
    firstPresent(lawyer, [
      "lawyerName",
      "fullName",
      "nickname",
      "username",
      "name",
      "displayName",
    ]),
    firstPresent(lawyer, ["lawyerType"])
      ? `(${lawyerTypeLabel(firstPresent(lawyer, ["lawyerType"]))})`
      : "",
  ]).join(" ") || (lawyer?.id ? `Lawyer #${lawyer.id}` : "Lawyer");

const quotationLabel = (quotation) =>
  firstPresent(quotation, [
    "quotationNumber",
    "quotationCode",
    "code",
    "title",
    "name",
  ]) || (quotation?.id ? `Quotation #${quotation.id}` : "Quotation");

const caseLabel = (project) => {
  const code = firstPresent(project, ["caseCode", "code"]);
  const name = firstPresent(project, [
    "projectName",
    "caseName",
    "title",
    "name",
  ]);
  return (
    compact([code, name]).join(" - ") ||
    (project?.id ? `Case #${project.id}` : "Case")
  );
};

const contractLabel = (contract) => {
  const code = firstPresent(contract, [
    "contractCode",
    "contractNumber",
    "code",
  ]);
  const name = firstPresent(contract, ["contractName", "name", "title"]);
  return (
    compact([code, name]).join(" - ") ||
    (contract?.id ? `Contract #${contract.id}` : "Contract")
  );
};

const relationRecord = (value, id) => {
  if (Array.isArray(value)) {
    return (
      value.find((item) => String(extractId(item)) === String(id)) ||
      value[0] ||
      null
    );
  }
  return value && typeof value === "object" ? value : null;
};

const CONTRACTED_SERVICE_STATUSES = [
  "contracted",
  "contract_pending_signature",
  "active",
  "completed",
  "cancelled",
  "canceled",
];

const SERVICE_STATUS_LABELS = {
  pending_quote: "Chưa có báo giá",
  quote_draft: "Báo giá nháp",
  quote_pending_approval: "Báo giá chờ duyệt",
  quote_sent: "Đã gửi báo giá",
  ordered: "Đã chốt dịch vụ",
  contracted: "Đã có hợp đồng",
  contract_pending_signature: "Chờ ký hợp đồng",
  active: "Đang thực hiện",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};

const serviceStatusLabel = (status) => {
  const key = String(status || "")
    .toLowerCase()
    .trim();
  return SERVICE_STATUS_LABELS[key] || status || "Chưa xác định";
};

const numberOrNull = (value) => {
  const parsed = nullableNum(value);
  return parsed === null || parsed === undefined ? null : parsed;
};

const firstNumber = (...values) => {
  for (const value of values) {
    const parsed = numberOrNull(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const firstNonZeroNumber = (...values) => {
  for (const value of values) {
    const parsed = numberOrNull(value);
    if (parsed !== null && parsed !== 0) return parsed;
  }
  return 0;
};

const roundAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const resolveServiceAmounts = (...sources) => {
  const items = sources.filter(Boolean);
  const values = (field) => items.map((item) => item?.[field]);
  const quantity = firstNonZeroNumber(...values("quantity"), 1) || 1;
  let vat = firstNumber(...values("vat")) ?? 0;
  let basePrice = firstNonZeroNumber(...values("basePrice"));
  let subTotal = firstNonZeroNumber(...values("subTotal"));
  const totalFromSource = firstNonZeroNumber(...values("totalAmount"));
  const vatAmountFromSource = firstNonZeroNumber(...values("vatAmount"));

  if (!subTotal && totalFromSource && vatAmountFromSource) {
    subTotal = totalFromSource - vatAmountFromSource;
  }
  if (!subTotal && totalFromSource && vat > -100) {
    subTotal = totalFromSource / (1 + vat / 100);
  }
  if (!subTotal && basePrice) {
    subTotal = basePrice * quantity;
  }
  if (!basePrice && subTotal) {
    basePrice = subTotal / quantity;
  }
  if ((!vat || vat === 0) && vatAmountFromSource && subTotal) {
    vat = Math.round((vatAmountFromSource * 10000) / subTotal) / 100;
  }

  const calculatedVatAmount = (subTotal * vat) / 100;
  const vatAmount = firstNonZeroNumber(
    vatAmountFromSource,
    calculatedVatAmount,
  );
  const totalAmount = firstNonZeroNumber(
    totalFromSource,
    subTotal + vatAmount,
    subTotal,
  );

  return {
    quantity,
    basePrice: roundAmount(basePrice),
    vat,
    subTotal: roundAmount(subTotal),
    vatAmount: roundAmount(vatAmount),
    totalAmount: roundAmount(totalAmount),
  };
};

const resolvePackageAmounts = (...sources) => {
  const items = sources.filter(Boolean);
  const values = (field) => items.map((item) => item?.[field]);
  const subTotal = firstNonZeroNumber(
    ...values("packageSubTotal"),
    ...values("subTotal"),
    ...values("fixedAmount"),
  );
  const explicitVatAmount = firstNonZeroNumber(
    ...values("packageVatAmount"),
    ...values("vatAmount"),
  );
  const explicitTotalAmount = firstNonZeroNumber(
    ...values("packageTotalAmount"),
    ...values("totalAmount"),
    ...values("grandTotal"),
    ...values("fixedAmount"),
  );
  const vatRate =
    firstNumber(...values("packageVatRate"), ...values("vatRate")) ??
    (subTotal && explicitVatAmount
      ? Math.round((explicitVatAmount * 10000) / subTotal) / 100
      : 0);
  const vatAmount =
    explicitVatAmount || roundAmount((subTotal * (vatRate || 0)) / 100);
  const totalAmount = explicitTotalAmount || roundAmount(subTotal + vatAmount);
  return {
    subTotal: roundAmount(subTotal),
    vatRate: vatRate || 0,
    vatAmount: roundAmount(vatAmount),
    totalAmount: roundAmount(totalAmount),
  };
};

const packagePricingPayload = (...sources) => {
  const amounts = resolvePackageAmounts(...sources);
  const currencyId = sources.map(getRecordCurrencyId).find(Boolean) || null;
  return {
    pricingMode: "package",
    billingMode: "packageIncluded",
    financialSourceType: "contract",
    quantity: 1,
    currencyId,
    basePrice: 0,
    vat: 0,
    subTotal: 0,
    vatAmount: 0,
    totalAmount: 0,
    packageSubTotal: amounts.subTotal,
    packageVatRate: amounts.vatRate,
    packageVatAmount: amounts.vatAmount,
    packageTotalAmount: amounts.totalAmount,
  };
};

const projectServicePricingPayload = (line) => {
  if (isPackagePricing(line)) {
    return packagePricingPayload(line);
  }
  const amounts = resolveServiceAmounts(line);
  return {
    pricingMode: "line",
    billingMode: "lineBillable",
    financialSourceType: "contract",
    quantity: amounts.quantity,
    currencyId: getRecordCurrencyId(line) || null,
    basePrice: amounts.basePrice,
    vat: amounts.vat,
    subTotal: amounts.subTotal,
    vatAmount: amounts.vatAmount,
    totalAmount: amounts.totalAmount,
    packageSubTotal: 0,
    packageVatRate: 0,
    packageVatAmount: 0,
    packageTotalAmount: 0,
  };
};

const stripContractServicePayload = (payload = {}) => {
  const next = { ...payload };
  delete next.serviceId;
  delete next.services;
  delete next.serviceType;
  delete next.billingMode;
  delete next.financialSourceType;
  return next;
};

const stripProjectServiceSyncFields = (payload = {}) => {
  const next = { ...payload };
  delete next.contractId;
  delete next.contracts;
  delete next.contractServiceId;
  delete next.contractServices;
  delete next.quotationId;
  delete next.quotations;
  delete next.quotationServiceId;
  delete next.quotationServices;
  delete next.quantity;
  delete next.subTotal;
  delete next.vatAmount;
  delete next.totalAmount;
  return next;
};

const syncQuotationHeaderFromServices = async (quotationId) => {
  const safeQuotationId = extractId(quotationId);
  if (!safeQuotationId) return;

  try {
    const [qRes, linesRes] = await Promise.all([
      ctx.api.request({
        url: "quotations:get",
        params: {
          filterByTk: safeQuotationId,
        },
      }),
      ctx.api.request({
        url: "quotationServices:list",
        params: {
          filter: JSON.stringify({ quotationId: { $eq: safeQuotationId } }),
          pageSize: 1000,
        },
      }),
    ]);

    const quotation = qRes?.data?.data || qRes?.data || {};
    const lines = linesRes?.data?.data || [];
    const isPackage =
      isPackagePricing(quotation) ||
      lines.some(
        (line) => isPackagePricing(line) || parseNum(line.packageSubTotal),
      );
    const currencies = await fetchAllFromCandidates(
      CURRENCY_RESOURCE_CANDIDATES,
    );
    const targetCurrency = currencyFromRecord(
      quotation,
      currencies,
      findDefaultCurrency(currencies),
    );
    const pricingDate =
      quotation?.issuedDate ||
      quotation?.quotationDate ||
      quotation?.createdAt ||
      new Date().toISOString();
    const summaryRows = isPackage
      ? (() => {
          const packageLine =
            lines.find(
              (line) =>
                isPackagePricing(line) || parseNum(line.packageSubTotal),
            ) || quotation;
          const packageAmounts = resolvePackageAmounts(packageLine, quotation);
          return [
            {
              ...packageLine,
              currencyId:
                getRecordCurrencyId(packageLine) ||
                getRecordCurrencyId(quotation),
              subTotal: packageAmounts.subTotal,
              vatAmount: packageAmounts.vatAmount,
              totalAmount: packageAmounts.totalAmount,
            },
          ];
        })()
      : lines;

    const preliminarySummary = buildContractFinancialSummary({
      rows: summaryRows,
      currencies,
      baseCurrency: targetCurrency,
      pricingDate,
    });
    const rateCurrencyIds = getConversionSourceCurrencyIds(
      preliminarySummary.groups,
      targetCurrency,
    );
    const exchangeRates = rateCurrencyIds.length
      ? await fetchExchangeRatesForConversion(
          rateCurrencyIds,
          extractCurrencyId(targetCurrency),
        )
      : [];
    const financialSummary = buildContractFinancialSummary({
      rows: summaryRows,
      currencies,
      baseCurrency: targetCurrency,
      exchangeRates,
      pricingDate,
    });

    if (!financialSummary.converted.canConvert) {
      console.warn(
        "[ContractCreateForm] Could not sync quotation header because exchange rate is missing:",
        formatMissingRatePairs(financialSummary.missing, targetCurrency),
      );
      return;
    }

    const { subTotal, vatAmount, totalAmount } = financialSummary.converted;

    await ctx.api.request({
      url: "quotations:update",
      method: "POST",
      params: { filterByTk: safeQuotationId },
      data: {
        pricingMode: isPackage ? "package" : "line",
        subTotal,
        vatAmount,
        totalAmount,
        currencyId: extractCurrencyId(targetCurrency) || null,
        customerId: extractId(quotation.customerId),
        internalCompanyId: extractId(quotation.internalCompanyId),
      },
    });
  } catch (e) {
    console.error("Error in syncQuotationHeaderFromServices:", e);
  }
};

const normalizeServiceLine = ({
  projectService,
  quotationService,
  quotation,
  contractService,
  project,
}) => {
  const projectServiceId = extractId(projectService?.id);
  if (!projectServiceId) return null;
  const contractId = firstId(
    projectService?.contractId,
    projectService?.contracts,
    contractService?.contractId,
    contractService?.contracts,
  );
  const status = String(
    projectService?.status || contractService?.lineStatus || "",
  )
    .toLowerCase()
    .trim();
  const locked = !!contractId || CONTRACTED_SERVICE_STATUSES.includes(status);
  const amountSources = locked
    ? [contractService, projectService, quotationService]
    : [quotationService, projectService];
  const amounts = resolveServiceAmounts(...amountSources);
  const pricingSource =
    [
      contractService,
      projectService,
      quotationService,
      quotation,
      project,
    ].find(isPackageSource) ||
    [
      contractService,
      projectService,
      quotationService,
      quotation,
      project,
    ].find((item) => item?.pricingMode) ||
    null;
  const packageAmounts = isPackageSource(pricingSource)
    ? resolvePackageAmounts(
        pricingSource,
        quotation,
        contractService,
        quotationService,
        projectService,
        project,
      )
    : { subTotal: 0, vatRate: 0, vatAmount: 0, totalAmount: 0 };
  const projectServiceBasePrice = numberOrNull(projectService?.basePrice);
  const serviceId = firstId(
    locked ? contractService?.serviceId : null,
    locked ? contractService?.service : null,
    quotationService?.serviceId,
    quotationService?.service,
    projectService?.serviceId,
    projectService?.services,
    contractService?.serviceId,
    contractService?.service,
  );
  const serviceName =
    (locked ? contractService?.serviceName : "") ||
    quotationService?.serviceName ||
    projectService?.serviceName ||
    contractService?.serviceName ||
    projectService?.services?.serviceName ||
    projectService?.name ||
    (serviceId ? `Service #${serviceId}` : "Dịch vụ");

  return {
    id: String(projectServiceId),
    projectServiceId,
    quotationServiceId:
      extractId(quotationService?.id) ||
      firstId(
        contractService?.quotationServiceId,
        contractService?.quotationServices,
        projectService?.quotationServiceId,
        projectService?.quotationServices,
      ),
    quotationId: firstId(
      quotationService?.quotationId,
      quotationService?.quotations,
      contractService?.quotationId,
      contractService?.quotations,
      projectService?.quotationId,
      projectService?.quotations,
    ),
    quotationCode: quotation ? quotationLabel(quotation) : "",
    projectId: firstId(
      projectService?.projectId,
      projectService?.project,
      projectService?.projects,
      contractService?.projectId,
      contractService?.project,
      contractService?.projects,
    ),
    serviceId,
    serviceName,
    description:
      (locked ? contractService?.description : "") ||
      quotationService?.description ||
      projectService?.description ||
      contractService?.description ||
      projectService?.services?.description ||
      "",
    quantity: amounts.quantity,
    currencyId:
      getRecordCurrencyId(contractService) ||
      getRecordCurrencyId(quotationService) ||
      getRecordCurrencyId(projectService) ||
      getRecordCurrencyId(quotation) ||
      getRecordCurrencyId(project) ||
      null,
    basePrice: projectServiceBasePrice ?? amounts.basePrice,
    vat: amounts.vat,
    subTotal: amounts.subTotal,
    vatAmount: amounts.vatAmount,
    totalAmount: amounts.totalAmount,
    pricingMode: isPackageSource(pricingSource) ? "package" : "line",
    packageSubTotal: packageAmounts.subTotal,
    packageVatRate: packageAmounts.vatRate,
    packageVatAmount: packageAmounts.vatAmount,
    packageTotalAmount: packageAmounts.totalAmount,
    status,
    contractId,
    contractServiceId: extractId(contractService?.id),
    locked,
  };
};

const sumServiceLines = (lines) =>
  lines.reduce(
    (sum, line) => ({
      subTotal: sum.subTotal + safeNumber(line?.subTotal),
      vatAmount: sum.vatAmount + safeNumber(line?.vatAmount),
      totalAmount: sum.totalAmount + safeNumber(line?.totalAmount),
    }),
    { subTotal: 0, vatAmount: 0, totalAmount: 0 },
  );

const serviceCatalogName = (service) =>
  firstPresent(service, ["serviceName", "name", "title", "displayName"]) ||
  (service?.id ? `Service #${service.id}` : "Service");

const serviceCatalogDescription = (service) =>
  firstPresent(service, ["description", "serviceDescription", "scopeNote"]);

const serviceCatalogPrice = (service) =>
  firstPresent(service, ["basePrice", "price", "unitPrice", "defaultPrice"]);

const serviceCatalogCurrency = (service, currencies = [], fallback = null) =>
  currencyFromRecord(service, currencies, fallback);

const serviceCatalogType = (service) =>
  firstPresent(service, ["serviceType", "type", "category"]);

const serviceOptionServiceId = (item) =>
  firstId(item?.serviceId, item?.service, item?.services) ||
  extractId(item?.id);

const serviceOptionCompanyId = (item) =>
  firstId(
    item?.internalCompanyId,
    item?.internalCompany,
    item?.companyId,
    item?.company,
  );

const enrichCompanyServiceOptions = (
  companyServices = [],
  services = [],
  currencies = [],
) => {
  const serviceMap = {};
  services.forEach((service) => {
    const id = extractId(service?.id);
    if (id) serviceMap[String(id)] = service;
  });
  return companyServices.map((item) => {
    const serviceId = serviceOptionServiceId(item);
    const service =
      item.service || item.services || serviceMap[String(serviceId)] || null;
    const next = service && !item.service ? { ...item, service } : item;
    const currency =
      currencyFromRecordOptional(next, currencies, null) ||
      currencyFromRecordOptional(service, currencies, null);
    return {
      ...next,
      currency,
      currencyId:
        extractCurrencyId(currency) ||
        getRecordCurrencyId(next) ||
        getRecordCurrencyId(service),
    };
  });
};

const newManualServiceRow = () => ({
  id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  serviceId: "",
  serviceName: "",
  serviceType: "",
  description: "",
  quantity: "1",
  currencyId: "",
  basePrice: "",
  vat: "8",
});

const newPaymentScheduleRow = (index = 1) => ({
  id: `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  installment: `Đợt ${index}`,
  content: "",
  percentage: "",
  paymentDate: "",
  amount: "",
});

const calcInstallmentAmount = (percentage, baseAmount) => {
  const percent = parseNum(percentage);
  const base = parseNum(baseAmount);
  if (percent <= 0 || base <= 0) return 0;
  return roundAmount((base * percent) / 100);
};

const paymentScheduleRowAmount = (row, baseAmount) =>
  calcInstallmentAmount(row?.percentage, baseAmount) || parseNum(row?.amount);

const cleanPaymentScheduleRows = (rows = [], baseAmount = 0) => {
  const cleaned = rows
    .map((row, index) => {
      const id = String(row?.id || `pay-${index + 1}`).trim();
      const defaultInstallment = `Đợt ${index + 1}`;
      const installment = String(row?.installment || "").trim();
      const content = String(row?.content || "").trim();
      const percentage = String(row?.percentage ?? "").trim();
      const paymentDate = String(row?.paymentDate || row?.timing || "").trim();
      const amount = paymentScheduleRowAmount(row, baseAmount);
      const hasCustomInstallment =
        !!installment && installment !== defaultInstallment;
      return {
        id,
        installmentNo: index + 1,
        installment: installment || defaultInstallment,
        content,
        percentage,
        paymentDate,
        amount,
        hasData: !!(
          hasCustomInstallment ||
          content ||
          percentage ||
          paymentDate ||
          amount > 0
        ),
      };
    })
    .filter((row) => row.hasData)
    .map(({ hasData, ...row }) => row);

  const roundedBase = roundAmount(baseAmount);
  if (cleaned.length > 1 && roundedBase > 0) {
    const sumAmounts = cleaned.reduce((sum, row) => sum + row.amount, 0);
    const diff = roundedBase - sumAmounts;
    if (diff !== 0) {
      const lastIndex = cleaned.length - 1;
      cleaned[lastIndex] = {
        ...cleaned[lastIndex],
        amount: cleaned[lastIndex].amount + diff,
      };
    }
  }

  return cleaned;
};

const buildPaymentSchedulePayload = ({ form, isRetainer, currency = null }) => {
  const baseAmount = parseNum(form?.totalAmount);
  const cleanRows = cleanPaymentScheduleRows(form?.paymentSchedule, baseAmount);
  const totalAmount =
    baseAmount || cleanRows.reduce((sum, row) => sum + row.amount, 0);
  const enabledRetainerRule = !!isRetainer;
  const unit = form.retainerRepeatUnit || "month";
  const interval = parseNum(form.retainerDuration) || 1;
  const anchorType = unit;
  const anchorValue = 1;
  const firstPaymentDate = enabledRetainerRule
    ? form.paymentDate || null
    : cleanRows[0]?.paymentDate || null;
  const nextPaymentDate = enabledRetainerRule
    ? calcRetainerNextPaymentDate(firstPaymentDate, form.retainerDuration, unit)
    : null;
  const hasScheduleData =
    cleanRows.length ||
    enabledRetainerRule ||
    form.billingCycle === "multiple_payments" ||
    firstPaymentDate;

  if (!hasScheduleData) {
    return null;
  }

  return {
    version: 1,
    mode: enabledRetainerRule
      ? "recurring"
      : form.billingCycle === "multiple_payments"
        ? "multiple_payments"
        : form.billingCycle || "one_time",
    currencyId:
      getRecordCurrencyId(form) || extractCurrencyId(currency) || null,
    currency:
      getRecordCurrencyCode(form) ||
      getCurrencyCode(currency || defaultCurrencyObject()),
    baseAmount,
    firstPaymentDate,
    totalAmount: totalAmount || nullableNum(form.totalAmount),
    retainerRule: {
      enabled: enabledRetainerRule,
      anchorType,
      anchorValue,
      interval,
      unit,
      nextPaymentDate,
      displayText: enabledRetainerRule
        ? `Every ${interval} ${retainerDurationSuffix(unit, interval)}`
        : "",
    },
    installments: cleanRows.map((row, index) => {
      const cumulativeTotal = cleanRows
        .slice(0, index + 1)
        .reduce((sum, item) => sum + item.amount, 0);
      return {
        id: row.id,
        installmentNo: row.installmentNo,
        sortOrder: index + 1,
        label: row.installment,
        installmentLabel: row.installment,
        content: row.content,
        timingType: row.paymentDate ? "fixed_date" : "",
        dueDate: toIsoDateTime(row.paymentDate),
        paymentDate: row.paymentDate,
        timingNote: "",
        percentage: row.percentage ? parseNum(row.percentage) : null,
        amount: row.amount,
        cumulativeTotal,
        status: "planned",
      };
    }),
  };
};

const manualServiceLineAmounts = (row, packageMode = false) =>
  packageMode
    ? {
        quantity: 1,
        basePrice: 0,
        vat: 0,
        subTotal: 0,
        vatAmount: 0,
        totalAmount: 0,
      }
    : resolveServiceAmounts({
        quantity: firstNonZeroNumber(row?.quantity, 1) || 1,
        basePrice: row?.basePrice,
        vat: row?.vat,
      });

const manualServiceRowsTotals = (rows = []) =>
  rows.reduce(
    (sum, row) => {
      const amounts = manualServiceLineAmounts(row, false);
      return {
        subTotal: sum.subTotal + amounts.subTotal,
        vatAmount: sum.vatAmount + amounts.vatAmount,
        totalAmount: sum.totalAmount + amounts.totalAmount,
      };
    },
    { subTotal: 0, vatAmount: 0, totalAmount: 0 },
  );

const fetchQuotationDetail = async (quotationId) => {
  if (!quotationId) return null;
  try {
    const res = await ctx.api.request({
      url: "quotations:get",
      params: { filterByTk: quotationId },
    });
    return unwrapRecord(res);
  } catch (error) {
    console.warn(
      "[ContractCreateForm] Could not fetch quotation detail",
      error,
    );
    return null;
  }
};

const unwrapRecord = (res) => {
  const payload = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.data)) return payload.data[0] || null;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload || null;
};

const fetchRecord = async (url, id, params = {}, options = {}) => {
  if (!id) return null;
  try {
    const res = await ctx.api.request({
      url,
      params: { filterByTk: id, ...params },
    });
    const record = unwrapRecord(res);
    if (record) return record;

    const collection = String(url || "").split(":")[0];
    if (!collection) return null;
    const listRes = await ctx.api.request({
      url: `${collection}:list`,
      params: {
        filter: JSON.stringify({ id: { $eq: id } }),
        pageSize: 1,
        ...params,
      },
    });
    return unwrapRecord(listRes);
  } catch (error) {
    if (!options.quiet) {
      console.warn(`[ContractCreateForm] Could not fetch ${url} #${id}`, error);
    }
    return null;
  }
};

const fetchAnyRecord = async (urls, id) => {
  for (const url of urls) {
    const record = await fetchRecord(url, id);
    if (record) return record;
  }
  return null;
};

const createdAtTime = (item) => {
  const time = new Date(item?.createdAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const newestFirst = (items) =>
  [...items].sort((a, b) => createdAtTime(b) - createdAtTime(a));

const toDateInput = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const addMonthsClamped = (dateValue, monthCount) => {
  if (!dateValue || !monthCount) return "";
  const source = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(source.getTime())) return "";

  const y = source.getFullYear();
  const m = source.getMonth();
  const d = source.getDate();
  const targetFirst = new Date(y, m + monthCount, 1);
  const lastDay = new Date(
    targetFirst.getFullYear(),
    targetFirst.getMonth() + 1,
    0,
  ).getDate();
  targetFirst.setDate(Math.min(d, lastDay));
  return toDateInput(targetFirst);
};

const calcRetainerNextPaymentDate = (
  paymentDate,
  retainerDuration,
  repeatUnit,
) => {
  const duration = parseNum(retainerDuration);
  if (!paymentDate || duration <= 0) return "";
  if (repeatUnit === "day") return addDays(paymentDate, duration);
  if (repeatUnit === "month") return addMonthsClamped(paymentDate, duration);
  if (repeatUnit === "year")
    return addMonthsClamped(paymentDate, duration * 12);
  return "";
};

const calcRetainerEndDate = (paymentDate, retainerDuration, repeatUnit) =>
  calcRetainerNextPaymentDate(paymentDate, retainerDuration, repeatUnit);

const addDays = (dateValue, days) => {
  if (!dateValue && days !== 0) return "";
  const source = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(source.getTime())) return "";
  source.setDate(source.getDate() + days);
  return toDateInput(source);
};

const normalizeFeeModel = (feeModel) => feeModel || "";

const allowedFeeModels = (contractType) =>
  FEE_MODEL_BY_TYPE[contractType] || FEE_MODEL_BY_TYPE.byCase;

const defaultFeeModel = (contractType) =>
  contractType === "retainer" ? "monthlyRetainer" : "fixed";

const feeModelForType = (contractType, currentFeeModel) => {
  const normalized = normalizeFeeModel(currentFeeModel);
  const allowed = allowedFeeModels(contractType);
  return allowed.includes(normalized)
    ? normalized
    : defaultFeeModel(contractType);
};

const getFeeVisibility = (form) => {
  const isRetainerType = form.contractType === "retainer";
  const model = normalizeFeeModel(form.feeModel);
  const usesHourly = model === "hourly" || model === "hybrid";
  const usesFixedAmount =
    isRetainerType && ["monthlyRetainer", "fixed", "hybrid"].includes(model);

  return {
    fixedAmount: usesFixedAmount,
    monthlyFee: false,
    hourlyRate: usesHourly,
    estimatedHours: usesHourly,
    successFee: !isRetainerType && ["successFee", "hybrid"].includes(model),
    retainerDuration: false,
    includedHours: false,
    overageHourlyRate: false,
  };
};

const calcByCaseTotal = (form) => {
  const model = normalizeFeeModel(form.feeModel);
  const fixed = parseNum(form.fixedAmount);
  const hourly = parseNum(form.hourlyRate);
  const hours = parseNum(form.estimatedHours);
  const success = parseNum(form.successFee);

  if (model === "fixed") return fixed > 0 ? String(fixed) : "";
  if (model === "hourly")
    return hourly > 0 && hours > 0 ? String(hourly * hours) : "";
  if (model === "successFee") return success > 0 ? String(success) : "";
  if (model === "hybrid") {
    const hourlyTotal = hourly > 0 && hours > 0 ? hourly * hours : 0;
    const total = fixed + hourlyTotal + success;
    return total > 0 ? String(total) : "";
  }

  return "";
};

const calcRetainerTotalByModel = (form) => {
  const visible = getFeeVisibility(form);
  const duration = parseNum(form.retainerDuration);
  const fixed = parseNum(form.fixedAmount);
  const hourly = parseNum(form.hourlyRate);
  const hours = parseNum(form.estimatedHours);
  let total = 0;

  if (visible.fixedAmount && fixed > 0) {
    total += fixed;
  }

  if (visible.hourlyRate && hourly > 0 && hours > 0) {
    total += hourly * hours * (duration > 0 ? duration : 1);
  }

  return total > 0 ? String(total) : "";
};

const calcTotalByFeeModel = (form) =>
  form.contractType === "retainer"
    ? calcRetainerTotalByModel(form)
    : calcByCaseTotal(form);

const calcPaymentTermEndDate = (form) => {
  if (form.contractType === "retainer") {
    return calcRetainerEndDate(
      form.paymentDate,
      form.retainerDuration,
      form.retainerRepeatUnit,
    );
  }

  return "";
};

const TOTAL_DRIVER_FIELDS = [
  "contractType",
  "feeModel",
  "fixedAmount",
  "retainerDuration",
  "hourlyRate",
  "estimatedHours",
  "successFee",
];

const DATE_DRIVER_FIELDS = [
  "contractType",
  "billingCycle",
  "paymentDate",
  "signedDate",
  "retainerDuration",
  "retainerRepeatInterval",
  "retainerRepeatUnit",
];

const deriveForm = (prev, patch) => {
  const next = { ...prev, ...patch };
  const patchKeys = Object.keys(patch);

  if (patchKeys.some((key) => TOTAL_DRIVER_FIELDS.includes(key))) {
    next.totalAmount = calcTotalByFeeModel(next);
  }

  if (patchKeys.some((key) => DATE_DRIVER_FIELDS.includes(key))) {
    const calculatedEndDate = calcPaymentTermEndDate(next);
    if (calculatedEndDate) next.endDate = calculatedEndDate;
  }

  return next;
};

const retainerDurationSuffix = (retainerPeriod, durationValue) => {
  const singular = parseNum(durationValue) === 1;
  if (retainerPeriod === "day") return singular ? "day" : "days";
  if (retainerPeriod === "week") return singular ? "week" : "weeks";
  if (retainerPeriod === "month") return singular ? "month" : "months";
  if (retainerPeriod === "quarter") return singular ? "quarter" : "quarters";
  if (retainerPeriod === "year") return singular ? "year" : "years";
  if (retainerPeriod === "monthly") return singular ? "month" : "months";
  if (retainerPeriod === "quarterly") return singular ? "quarter" : "quarters";
  if (retainerPeriod === "yearly") return singular ? "year" : "years";
  return singular ? "cycle" : "cycles";
};

const getViewInputArgs = () => ctx.view?.inputArgs || {};

const getUrlFilterByTk = () => {
  try {
    const match = window.location.pathname.match(/\/filterbytk\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

const getUrlPathname = () => {
  try {
    return String(window.location.pathname || "");
  } catch {
    return "";
  }
};

const recordHasProp = (record, key) =>
  !!record &&
  typeof record === "object" &&
  Object.prototype.hasOwnProperty.call(record, key);

const recordHasAnyProp = (record, keys) =>
  keys.some((key) => recordHasProp(record, key));

const isQuotationCollection = (name) => {
  const value = String(name || "").toLowerCase();
  return value.includes("quotation") || value.includes("quote");
};

const looksLikeQuotationRecord = (record = {}, collectionName = "") => {
  if (!record || typeof record !== "object") return false;
  const name =
    collectionName ||
    record.collectionName ||
    record.__collectionName ||
    record.collection?.name ||
    "";
  if (isQuotationCollection(name)) return true;
  if (
    recordHasAnyProp(record, [
      "contractCode",
      "contractName",
      "contractType",
      "caseCode",
      "caseName",
      "projectName",
      "projectManagerId",
      "projectStatus",
      "leadType",
      "customerType",
    ]) ||
    Array.isArray(record.assignees)
  ) {
    return false;
  }
  return (
    recordHasAnyProp(record, [
      "quotationNumber",
      "quotationCode",
      "quoteNumber",
      "quoteCode",
      "quotationName",
    ]) ||
    (recordHasProp(record, "pricingMode") &&
      recordHasAnyProp(record, [
        "subTotal",
        "totalAmount",
        "grandTotal",
        "packageSubTotal",
      ]))
  );
};

const getRuntimeContextRecords = (
  inputArgs = getViewInputArgs(),
  params = inputArgs.params || {},
) =>
  [
    ctx.record,
    ctx.popup?.record,
    ctx.view?.record,
    ctx.modal?.record,
    inputArgs.record,
    inputArgs.sourceRecord,
    inputArgs.parentItem,
    inputArgs.currentRecord,
    params.record,
    params.sourceRecord,
    params.parentItem,
    params.currentRecord,
  ]
    .map((record) => unwrapContextRecord(record))
    .filter((record) => record && typeof record === "object");

const unwrapContextRecord = (record) => {
  if (!record || typeof record !== "object") return record;
  const data = record.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return record;

  const keys = Object.keys(record);
  const wrapperLike =
    keys.length <= 4 &&
    keys.every((key) => ["data", "meta", "status", "success"].includes(key));
  return wrapperLike || !extractId(record.id)
    ? unwrapContextRecord(data)
    : record;
};

const inferQuotationIdFromRecords = (records = [], collectionName = "") => {
  for (const record of records) {
    if (looksLikeQuotationRecord(record, collectionName)) {
      const id =
        extractId(record.id) ||
        extractId(record.quotationId) ||
        extractFirstId(record.quotations);
      if (id) return id;
    }
  }
  return null;
};

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
  const runtimeRecords = getRuntimeContextRecords(inputArgs, params);
  const runtimeCollectionName =
    inputArgs.collectionName ||
    params.collectionName ||
    ctx.collection?.name ||
    "";
  const runtimeQuotationId = inferQuotationIdFromRecords(
    runtimeRecords,
    runtimeCollectionName,
  );
  const sourceQuotationId =
    inputArgs.sourceQuotationId ||
    params.sourceQuotationId ||
    ctx.action?.params?.sourceQuotationId ||
    ctx.modal?.params?.sourceQuotationId ||
    ctx.view?.params?.sourceQuotationId ||
    ctx.popup?.params?.sourceQuotationId ||
    ctx.params?.sourceQuotationId ||
    (isQuotationCollection(sourceCollectionName) ? sourceRecordId : null) ||
    runtimeQuotationId;
  const sourceName = String(sourceCollectionName || "").toLowerCase();
  const sourceCustomerId =
    inputArgs.sourceCustomerId ||
    params.sourceCustomerId ||
    ctx.action?.params?.sourceCustomerId ||
    ctx.modal?.params?.sourceCustomerId ||
    ctx.view?.params?.sourceCustomerId ||
    ctx.popup?.params?.sourceCustomerId ||
    ctx.params?.sourceCustomerId ||
    (sourceName.includes("customer") || sourceName.includes("contact")
      ? sourceRecordId
      : null);
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
    (sourceName.includes("project") || sourceName.includes("case")
      ? sourceRecordId
      : null);
  return {
    ...(inputArgs || {}),
    ...(params || {}),
    ...(ctx.action?.params || {}),
    ...(ctx.modal?.params || {}),
    ...(ctx.view?.params || {}),
    ...(ctx.popup?.params || {}),
    ...(ctx.params || {}),
    customerId:
      ctx.view?.customerId ||
      inputArgs?.customerId ||
      inputArgs?.params?.customerId ||
      sourceCustomerId ||
      ctx.popup?.params?.customerId ||
      ctx.params?.customerId,
    internalCompanyId:
      ctx.view?.internalCompanyId ||
      inputArgs?.internalCompanyId ||
      inputArgs?.params?.internalCompanyId ||
      ctx.popup?.params?.internalCompanyId ||
      ctx.params?.internalCompanyId,
    lawyerId:
      ctx.view?.lawyerId ||
      inputArgs?.lawyerId ||
      inputArgs?.params?.lawyerId ||
      ctx.popup?.params?.lawyerId ||
      ctx.params?.lawyerId,
    quotationId:
      ctx.view?.quotationId ||
      inputArgs?.quotationId ||
      inputArgs?.params?.quotationId ||
      sourceQuotationId ||
      ctx.popup?.params?.quotationId ||
      ctx.params?.quotationId,
    sourceQuotationId,
    sourceCustomerId,
    sourceProjectId,
    sourceCollectionName,
    sourceRecordId,
    projectId:
      ctx.view?.projectId ||
      inputArgs?.projectId ||
      inputArgs?.params?.projectId ||
      sourceProjectId ||
      ctx.popup?.params?.projectId ||
      ctx.params?.projectId,
    caseId:
      ctx.view?.caseId ||
      inputArgs?.caseId ||
      inputArgs?.params?.caseId ||
      sourceProjectId ||
      ctx.popup?.params?.caseId ||
      ctx.params?.caseId,
  };
};

const safeJsonStringify = (obj) => {
  try {
    if (obj === null || typeof obj !== "object") return String(obj);
    const clean = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (
          val === null ||
          typeof val === "string" ||
          typeof val === "number" ||
          typeof val === "boolean"
        ) {
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

const debugContractContext = (step, payload) => {
  console.log(
    `[ContractCreateForm][context:${step}]`,
    safeJsonStringify(payload),
  );
};

const firstId = (...values) => {
  for (const value of values) {
    const id = Array.isArray(value) ? extractFirstId(value) : extractId(value);
    if (id) return id;
  }
  return null;
};

const getConfiguredProjectRecord = () => PROJECT_RECORD_CONFIG.record || {};

const hasOwn = (record, key) =>
  !!record &&
  typeof record === "object" &&
  Object.prototype.hasOwnProperty.call(record, key);

const getContextRecordKind = (record = {}, collectionName = "") => {
  const name = String(collectionName || "").toLowerCase();
  if (name.includes("customer")) return "customer";
  if (name.includes("lead")) return "lead";
  if (isQuotationCollection(name)) return "quotation";
  if (name.includes("project")) return "";
  if (
    record?.caseCode ||
    record?.caseName ||
    record?.projectName ||
    record?.projectManagerId ||
    record?.projectStatus ||
    record?.quotationId ||
    record?.contractId ||
    Array.isArray(record?.assignees)
  ) {
    return "";
  }
  if (hasOwn(record, "customerType")) return "customer";
  if (hasOwn(record, "leadType")) return "lead";
  if (looksLikeQuotationRecord(record, collectionName)) {
    return "quotation";
  }
  if (
    hasOwn(record, "customerName") ||
    hasOwn(record, "companyLegalName") ||
    hasOwn(record, "contactName")
  ) {
    return "customer";
  }
  return "";
};

const recordInternalCompanyId = (record) =>
  firstId(
    record?.internalCompanyId,
    record?.internalCompany,
    record?.internalCompanies,
  );

const recordLawyerId = (record) =>
  firstId(
    record?.lawyerId,
    record?.lawyer,
    record?.lawyers,
    record?.assignedLawyerId,
    record?.assignedLawyer,
  );

const getConfiguredProjectId = () => {
  const record = getConfiguredProjectRecord();
  return isProjectRecord(record) ? extractId(record?.id) : null;
};

const isProjectRecord = (record = {}, collectionName = "") => {
  if (!record || typeof record !== "object") return false;
  if (getContextRecordKind(record, collectionName)) return false;
  if (isProjectCollection(collectionName)) return true;
  return !!(
    record.caseCode ||
    record.caseName ||
    record.projectName ||
    record.projectManagerId ||
    record.projectStatus ||
    record.quotationId ||
    record.contractId ||
    Array.isArray(record.assignees)
  );
};

const isProjectServiceCollection = (name) =>
  String(name || "")
    .toLowerCase()
    .includes("projectservices");

const isProjectCollection = (name) =>
  String(name || "")
    .toLowerCase()
    .includes("projects");

const contractStatusToProjectServiceStatus = (status) => {
  const st = String(status || "")
    .toLowerCase()
    .trim();
  if (["cancelled", "canceled", "terminated", "rejected"].includes(st))
    return "cancelled";
  if (["completed", "closed", "done"].includes(st)) return "completed";
  if (["execution", "active", "signed"].includes(st)) return "active";
  if (
    ["sent", "pending_signature", "waiting_signature", "signature"].includes(st)
  )
    return "contract_pending_signature";
  return "contracted";
};

const safeNumber = (...values) => {
  for (const value of values) {
    const parsed = nullableNum(value);
    if (parsed !== null && parsed !== undefined && parsed !== 0) return parsed;
  }
  return 0;
};

const codeDateParts = (dateValue) => {
  const d = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  return {
    mm: String(safeDate.getMonth() + 1).padStart(2, "0"),
    yyyy: safeDate.getFullYear(),
  };
};

const generateContractCode = async ({ prefix, issuedDate, parentId }) => {
  const { mm, yyyy } = codeDateParts(issuedDate);
  const suffix = `${mm}${yyyy}`;
  const filter =
    prefix === "PL" && parentId
      ? { parentId: { $eq: parseInt(parentId, 10) } }
      : {};

  const res = await ctx.api.request({
    url: "contracts:list",
    params: {
      page: 1,
      pageSize: 1000,
      sort: ["-createdAt"],
      ...(Object.keys(filter).length ? { filter: JSON.stringify(filter) } : {}),
    },
  });

  const pattern = new RegExp(`^${prefix}(\\d{2})${suffix}$`, "i");
  const items = res?.data?.data || [];
  const maxIndex = items.reduce((max, item) => {
    const code = String(
      item?.contractCode || item?.contractNumber || item?.code || "",
    );
    const match = code.match(pattern);
    return match ? Math.max(max, parseInt(match[1], 10) || 0) : max;
  }, 0);

  return `${prefix}${String(maxIndex + 1).padStart(2, "0")}${suffix}`;
};

async function fetchAll(url, params = {}) {
  try {
    const res = await ctx.api.request({
      url,
      params: { pageSize: 500, page: 1, sort: ["-createdAt"], ...params },
    });
    return newestFirst(res?.data?.data || []);
  } catch (error) {
    // Some lookup/reference collections (e.g. currencies) have no createdAt
    // field, so the sorted request above can fail outright. Retry once
    // without the sort before giving up on this url.
    try {
      const res = await ctx.api.request({
        url,
        params: { pageSize: 500, page: 1, ...params },
      });
      return res?.data?.data || [];
    } catch (fallbackError) {
      console.warn(
        `[ContractCreateForm] Could not fetch ${url}`,
        fallbackError,
      );
      return [];
    }
  }
}
async function fetchAllFromCandidates(urls = []) {
  for (const url of urls) {
    const rows = await fetchAll(url);
    if (Array.isArray(rows) && rows.length) return rows;
  }
  return [];
}
async function fetchExchangeRatesForConversion(
  fromCurrencyIds = [],
  toCurrencyId,
) {
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
    {
      fromCurrency: { id: { $in: fromIds } },
      toCurrency: { id: { $eq: toId } },
    },
    { fromCurrencyId: { $eq: toId }, toCurrencyId: { $in: fromIds } },
    {
      fromCurrency: { id: { $eq: toId } },
      toCurrency: { id: { $in: fromIds } },
    },
  ];

  for (const url of EXCHANGE_RATE_RESOURCE_CANDIDATES) {
    const collected = [];
    for (const filter of filterProfiles) {
      try {
        const res = await ctx.api.request({
          url,
          params: {
            pageSize,
            page: 1,
            appends: ["fromCurrency", "toCurrency"],
            sort: ["-effectiveDate", "-createdAt"],
            filter: JSON.stringify(filter),
          },
        });
        const rows = res?.data?.data || [];
        rows.forEach((row) => {
          if (!collected.some((item) => String(item.id) === String(row.id)))
            collected.push(row);
        });
      } catch {}
    }
    if (collected.length) return collected;
  }
  return [];
}

const hasRecordId = (items, id) =>
  !!id && items.some((item) => String(extractId(item?.id)) === String(id));

const mergeRecordById = (items, record) => {
  const id = extractId(record?.id);
  if (!id) return items;
  const index = items.findIndex(
    (item) => String(extractId(item?.id)) === String(id),
  );
  if (index === -1) return [record, ...items];
  const next = items.slice();
  next[index] = { ...next[index], ...record };
  return next;
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "9px 11px",
  fontSize: 13,
  lineHeight: "20px",
  color: C.text,
  background: C.bg,
  outline: "none",
  fontFamily: FONT,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: C.label,
};

const mutedStyle = {
  fontSize: 12,
  color: C.sub,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  columnGap: 16,
  rowGap: 18,
  alignItems: "start",
};

const FIELD_HELP = {
  "Contract type":
    "Chọn byCase cho hợp đồng theo vụ việc, retainer cho hợp đồng dịch vụ định kỳ.",
  Status: "Trạng thái xử lý nội bộ của hợp đồng.",
  "Contract code":
    "Có thể nhập tay hoặc để trống để hệ thống tự tạo CT/PL theo ngữ cảnh.",
  "Contract name":
    "Tên dùng để nhận diện hợp đồng trong danh sách và tìm kiếm.",
  "Parent contract": "Chọn hợp đồng gốc nếu đây là phụ lục hoặc hợp đồng con.",
  Customer:
    "Khách hàng của hợp đồng. Khi chọn customer, danh sách quotation sẽ được lọc theo customer này.",
  "Internal company": "Pháp nhân/công ty nội bộ đứng tên cung cấp dịch vụ.",
  Lawyer: "Luật sư phụ trách chính nếu đã xác định.",
  Template: "Mẫu hợp đồng dùng cho soạn thảo hoặc in ấn.",
  Quotation:
    "Báo giá liên quan. Khi chọn quotation, form chỉ tự lấy các liên kết chính như customer, company và lawyer; giá trị tiền trong hợp đồng vẫn theo form này.",
  Case: "Case hoặc hồ sơ mà hợp đồng này phục vụ.",
  "Signed date": "Ngày ký hợp đồng và là mốc ngày chính của hợp đồng.",
  "First payment":
    "Ngày thanh toán đầu tiên hoặc ngày bắt đầu theo dõi nghĩa vụ thanh toán.",
  "End date":
    "Ngày kết thúc hoặc hạn theo dõi chính. Với retainer, field này tự tính theo first payment, retainer duration và retainer repeat khi có đủ dữ liệu.",
  "Fee model":
    "Cách tính phí chính: trọn gói, theo giờ, retainer, success fee hoặc kết hợp.",
  "Billing cycle":
    "Chu kỳ phát sinh phí hoặc khoản thanh toán. Chọn thanh toán nhiều lần khi cần nhập bảng đợt thanh toán.",
  "Retainer duration":
    "Số ngày/tháng/năm dùng để tính kỳ thanh toán kế tiếp. Bỏ trống nếu retainer không có thời hạn cố định.",
  "Fixed amount": "Phí trọn gói hoặc giá trị cố định của hợp đồng.",
  "Hourly rate":
    "Đơn giá theo giờ để tham chiếu hoặc tính phần việc theo thời gian.",
  "Estimated hours":
    "Số giờ dự kiến dùng để tính tổng tiền khi fee model là hourly hoặc hybrid.",
  "Success fee": "Phí thành công khi đạt điều kiện/kết quả đã thỏa thuận.",
  "Retainer repeat":
    "Đơn vị chu kỳ retainer: ngày, tháng hoặc năm. Hệ thống dùng cùng đơn vị này để tính next payment từ first payment và retainer duration.",
  "Next payment":
    "Ngày thanh toán kế tiếp được tự động tính từ First payment, Retainer duration và Retainer repeat.",
  Subtotal: "Giá trị trước VAT.",
  "VAT amount": "Số tiền VAT.",
  "Total amount":
    "Tổng giá trị hợp đồng. Form có thể tự tính theo fee model nhưng người dùng vẫn có thể chỉnh tay.",
  "Scope note":
    "Phạm vi công việc, phần bao gồm/loại trừ và điều kiện phát sinh.",
  Description: "Ghi chú nội bộ hoặc mô tả bổ sung.",
};

const focus = (e) => {
  e.currentTarget.style.borderColor = C.borderFocus;
};

const blur = (e) => {
  e.currentTarget.style.borderColor = C.border;
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
        color: C.sub,
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

const AddNewIconButton = ({ onClick, title = "Add new" }) =>
  React.createElement(
    "button",
    {
      type: "button",
      title,
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation(); // chặn Select nhận mousedown, tránh nó tự toggle/remount trước khi click bắn ra
      },
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      },
      style: {
        width: 20,
        height: 20,
        background: "#fff",
        border:'none',
        color: C.primary,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1,
        padding: 0,
        flexShrink: 0,
        pointerEvents: "auto", // <-- quan trọng: ghi đè pointer-events:none mà .ant-select-arrow áp lên
      },
    },
    "+",
  );

const Field = ({ label, required, children, hint, tooltip }) =>
  AntForm
    ? React.createElement(
        AntForm.Item,
        {
          label,
          required: !!required,
          tooltip: tooltip || FIELD_HELP[label],
          help: hint || undefined,
          colon: false,
          labelCol: { span: 24 },
          wrapperCol: { span: 24 },
          style: { marginBottom: 0, minWidth: 0 },
        },
        children,
      )
    : React.createElement(
        "label",
        { style: fieldStyle },
        React.createElement(
          "span",
          {
            style: {
              ...labelStyle,
              display: "inline-flex",
              alignItems: "center",
              minHeight: 18,
            },
          },
          label,
          required &&
            React.createElement(
              "span",
              { style: { color: C.danger, marginLeft: 3 } },
              "*",
            ),
          React.createElement(HelpMark, { text: tooltip || FIELD_HELP[label] }),
        ),
        children,
        hint && React.createElement("span", { style: mutedStyle }, hint),
      );

const Section = ({ title, children }) =>
  React.createElement(
    "section",
    {
      style: {
        borderTop: `1px solid ${C.border}`,
        paddingTop: 18,
        marginTop: 18,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          fontSize: 14,
          fontWeight: 700,
          color: C.text,
          marginBottom: 12,
        },
      },
      title,
    ),
    children,
  );

const TextInput = ({ value, onChange, placeholder, type = "text" }) =>
  AntInput
    ? React.createElement(AntInput, {
        type,
        value: value ?? "",
        placeholder,
        onChange: (e) => onChange(e.target.value),
        style: { width: "100%" },
      })
    : React.createElement("input", {
        type,
        value: value ?? "",
        placeholder,
        onChange: (e) => onChange(e.target.value),
        onFocus: focus,
        onBlur: blur,
        style: inputStyle,
      });

const MoneyInput = ({
  value,
  onChange,
  placeholder = "0",
  currency = null,
}) => {
  const code = getCurrencyCode(currency || defaultCurrencyObject());
  return AntInput
    ? React.createElement(AntInput, {
        value: formatMoneyNumber(value),
        placeholder,
        inputMode: "numeric",
        addonAfter: code,
        onChange: (e) => onChange(moneyRaw(e.target.value)),
        style: { width: "100%" },
      })
    : React.createElement(
        "div",
        { style: { position: "relative", width: "100%" } },
        React.createElement("input", {
          type: "text",
          inputMode: "numeric",
          value: formatMoneyNumber(value),
          placeholder,
          onChange: (e) => onChange(moneyRaw(e.target.value)),
          onFocus: focus,
          onBlur: blur,
          style: {
            ...inputStyle,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
            paddingRight: hasInputValue(value)
              ? Math.max(40, code.length * 8 + 22)
              : 11,
          },
        }),
        hasInputValue(value) &&
          React.createElement(
            "span",
            {
              style: {
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 11,
                color: C.sub,
                pointerEvents: "auto",
              },
            },
            code,
          ),
      );
};

const SuffixInput = ({ value, onChange, placeholder = "0", suffix }) => {
  if (AntInput) {
    return React.createElement(AntInput, {
      value: value ?? "",
      placeholder,
      inputMode: "numeric",
      addonAfter: suffix || undefined,
      onChange: (e) => onChange(e.target.value),
      style: { width: "100%" },
    });
  }

  const suffixPad = suffix ? Math.max(58, String(suffix).length * 8 + 22) : 11;

  return React.createElement(
    "div",
    { style: { position: "relative", width: "100%" } },
    React.createElement("input", {
      type: "text",
      inputMode: "numeric",
      value: value ?? "",
      placeholder,
      onChange: (e) => onChange(e.target.value),
      onFocus: focus,
      onBlur: blur,
      style: {
        ...inputStyle,
        textAlign: "center",
        fontVariantNumeric: "tabular-nums",
        paddingRight: suffixPad,
      },
    }),
    suffix &&
      React.createElement(
        "span",
        {
          style: {
            position: "absolute",
            right: 11,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 11,
            color: C.sub,
            pointerEvents: "auto",
          },
        },
        suffix,
      ),
  );
};

const PercentInput = ({ value, onChange, placeholder = "0" }) =>
  AntInput
    ? React.createElement(AntInput, {
        value: value ?? "",
        placeholder,
        inputMode: "numeric",
        addonAfter: "%",
        onChange: (e) => onChange(moneyRaw(e.target.value)),
        style: { width: "100%" },
      })
    : React.createElement(
        "div",
        {
          style: {
            ...inputStyle,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 11px",
            minHeight: 40,
          },
        },
        React.createElement("input", {
          type: "text",
          inputMode: "numeric",
          value: value ?? "",
          placeholder,
          onChange: (e) => onChange(moneyRaw(e.target.value)),
          onFocus: (e) => {
            e.currentTarget.parentElement.style.borderColor = C.borderFocus;
          },
          onBlur: (e) => {
            e.currentTarget.parentElement.style.borderColor = C.border;
          },
          style: {
            width: "100%",
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            color: C.text,
            textAlign: "right",
            fontSize: 14,
            fontFamily: FONT,
            fontVariantNumeric: "tabular-nums",
          },
        }),
        React.createElement(
          "span",
          {
            style: {
              color: C.sub,
              fontSize: 12,
              fontWeight: 700,
              flex: "0 0 auto",
            },
          },
          "%",
        ),
      );

const TextArea = ({ value, onChange, placeholder, rows = 3 }) =>
  AntInput?.TextArea
    ? React.createElement(AntInput.TextArea, {
        value: value ?? "",
        placeholder,
        rows,
        onChange: (e) => onChange(e.target.value),
        style: { width: "100%" },
      })
    : React.createElement("textarea", {
        value: value ?? "",
        placeholder,
        rows,
        onChange: (e) => onChange(e.target.value),
        onFocus: focus,
        onBlur: blur,
        style: {
          ...inputStyle,
          resize: "vertical",
          minHeight: rows * 24 + 18,
        },
      });

const SelectInput = ({ value, onChange, options, placeholder }) =>
  AntSelect
    ? React.createElement(AntSelect, {
        value: value || undefined,
        placeholder: placeholder || "Select",
        allowClear: true,
        showSearch: true,
        optionFilterProp: "label",
        onChange: (next) => onChange(next || ""),
        style: { width: "100%" },
        options: options.map((option) => ({
          value: option.value,
          label: option.label,
        })),
      })
    : React.createElement(
        "select",
        {
          value: value ?? "",
          onChange: (e) => onChange(e.target.value),
          onFocus: focus,
          onBlur: blur,
          style: inputStyle,
        },
        React.createElement("option", { value: "" }, placeholder || "Select"),
        options.map((option) =>
          React.createElement(
            "option",
            { key: option.value, value: option.value },
            option.label,
          ),
        ),
      );

const normalizeSearch = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const SearchSelect = ({
  value,
  onChange,
  options,
  placeholder,
  emptyText = "No matching records",
  onAddNew,
  addNewLabel = "Add new",
}) => {
  if (AntSelect) {
    return React.createElement(AntSelect, {
      value: value || undefined,
      placeholder,
      allowClear: true,
      showSearch: true,
      optionFilterProp: "searchText",
      optionLabelProp: "titleText",
      notFoundContent: emptyText,
      onChange: (next) => onChange(next || ""),
      style: { width: "100%" },
      options: options.map((option) => ({
        value: option.value,
        titleText: option.label,
        searchText: compact([option.label, option.subLabel, option.value]).join(
          " ",
        ),
        label: React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", minWidth: 0 } },
          React.createElement(
            "span",
            {
              style: {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            option.label,
          ),
          option.subLabel &&
            React.createElement(
              "span",
              {
                style: {
                  color: C.sub,
                  fontSize: 12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              option.subLabel,
            ),
        ),
      })),
      filterOption: (input, option) =>
        normalizeSearch(option?.searchText).includes(normalizeSearch(input)),
      suffixIcon: onAddNew
        ? React.createElement(
            "span",
            { style: { pointerEvents: "auto" } },
            React.createElement(AddNewIconButton, {
              onClick: onAddNew,
              title: addNewLabel,
            }),
          )
        : undefined,
    });
  }

  const selected = options.find(
    (option) => String(option.value) === String(value),
  );
  const [query, setQuery] = useState(selected?.label || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selected?.label || "");
  }, [value, selected?.label]);

  const filteredOptions = useMemo(() => {
    const q = normalizeSearch(query).trim();
    const source = q
      ? options.filter(
          (option) =>
            normalizeSearch(option.label).includes(q) ||
            normalizeSearch(option.subLabel).includes(q) ||
            normalizeSearch(option.value).includes(q),
        )
      : options;

    return source.slice(0, 40);
  }, [options, query]);

  return React.createElement(
    "div",
    { style: { position: "relative", width: "100%" } },
    React.createElement("input", {
      type: "text",
      value: query,
      placeholder,
      onChange: (e) => {
        setQuery(e.target.value);
        setOpen(true);
      },
      onFocus: (e) => {
        focus(e);
        setOpen(true);
      },
      onBlur: (e) => {
        blur(e);
        setTimeout(() => setOpen(false), 120);
      },
      style: {
        ...inputStyle,
        paddingRight: selected ? 60 : 11,
      },
    }),
    selected &&
      React.createElement(
        "button",
        {
          type: "button",
          onMouseDown: (e) => e.preventDefault(),
          onClick: () => {
            onChange("");
            setQuery("");
            setOpen(false);
          },
          style: {
            position: "absolute",
            right: 7,
            top: 6,
            border: "none",
            background: "transparent",
            color: C.sub,
            fontSize: 12,
            fontWeight: 600,
            lineHeight: "24px",
            padding: "0 4px",
            cursor: "pointer",
            fontFamily: FONT,
          },
        },
        "Clear",
      ),
    open &&
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 20,
            maxHeight: 220,
            overflowY: "auto",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            background: C.bg,
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
          },
        },
        filteredOptions.length
          ? filteredOptions.map((option) =>
              React.createElement(
                "div",
                {
                  key: option.value,
                  onMouseDown: (e) => {
                    e.preventDefault();
                    onChange(option.value);
                    setQuery(option.label);
                    setOpen(false);
                  },
                  style: {
                    padding: "9px 11px",
                    cursor: "pointer",
                    background:
                      String(option.value) === String(value) ? "#eef4fb" : C.bg,
                  },
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 13,
                      lineHeight: "18px",
                      color: C.text,
                      fontWeight: 600,
                    },
                  },
                  option.label,
                ),
                option.subLabel &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        marginTop: 2,
                        fontSize: 12,
                        lineHeight: "17px",
                        color: C.sub,
                      },
                    },
                    option.subLabel,
                  ),
              ),
            )
          : React.createElement(
              "div",
              {
                style: {
                  padding: "9px 11px",
                  fontSize: 13,
                  color: C.sub,
                },
              },
              emptyText,
            ),
        onAddNew &&
          React.createElement(
            "div",
            {
              style: {
                borderTop: `1px solid ${C.border}`,
                padding: 8,
                display: "flex",
                justifyContent: "flex-end",
              },
            },
            React.createElement(
              "button",
              {
                type: "button",
                onMouseDown: (event) => {
                  event.preventDefault();
                  onAddNew();
                  setOpen(false);
                },
                style: {
                  border: `1px dashed ${C.primary}`,
                  borderRadius: 5,
                  background: "#fff",
                  color: C.primary,
                  cursor: "pointer",
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: "20px",
                  padding: "2px 9px",
                },
              },
              addNewLabel,
            ),
          ),
      ),
  );
};

const TutorialPanel = ({ contractType }) => {
  const isRetainer = contractType === "retainer";
  const typeRows = isRetainer
    ? [
        ["Retainer repeat", "Đơn vị chu kỳ retainer: ngày, tháng hoặc năm."],
        [
          "Retainer duration",
          "Số ngày/tháng/năm dùng để tính next payment từ first payment. Bỏ trống nếu hợp đồng không có thời hạn cố định.",
        ],
        [
          "Next payment",
          "Ngày thanh toán kế tiếp được hệ thống tự tính, không cần nhập tay.",
        ],
        [
          "Fixed amount",
          "Giá trị cố định hoặc giá trị chính của hợp đồng retainer nếu có.",
        ],
        [
          "Hourly rate",
          "Đơn giá theo giờ dùng để tham chiếu hoặc tính phần việc ngoài phạm vi.",
        ],
        [
          "Estimated hours",
          "Số giờ dự kiến dùng khi retainer tính theo hourly hoặc hybrid. Field này dùng để ước tính total amount, không thay thế bảng chấm công thực tế.",
        ],
      ]
    : [
        [
          "Fixed amount",
          "Phí trọn gói của một vụ việc cụ thể. Đây thường là giá trị chính của hợp đồng by case.",
        ],
        [
          "Hourly rate",
          "Đơn giá theo giờ nếu vụ việc có phần tính theo thời gian thực hiện.",
        ],
        [
          "Estimated hours",
          "Số giờ dự kiến dùng để tính tổng tiền khi fee model là hourly hoặc hybrid.",
        ],
        [
          "Success fee",
          "Phí thành công phát sinh khi đạt điều kiện hoặc kết quả đã thỏa thuận.",
        ],
        [
          "Payment schedule",
          "Bảng đợt thanh toán dùng khi billing cycle là thanh toán nhiều lần.",
        ],
      ];

  const byCaseFlowRows = [
    [
      "1. Liên kết dữ liệu",
      "Chọn customer, quotation và case nếu đã có. Quotation chỉ dùng để tham chiếu và gán thông tin liên quan; các giá trị tiền trong hợp đồng vẫn do người dùng nhập thủ công theo nội dung hợp đồng đã chốt.",
    ],
    [
      "2. Chọn fee model",
      "Fixed dùng cho phí trọn gói; hourly dùng khi tính theo giờ; success fee dùng khi có phí thành công; hybrid dùng khi hợp đồng kết hợp nhiều cách tính như fixed + success fee hoặc fixed + hourly.",
    ],
    [
      "3. Chọn billing cycle",
      "One time phù hợp khi thu một lần; thanh toán nhiều lần dùng khi cần nhập bảng đợt thanh toán; milestone/manual dùng khi lịch chưa chuẩn hóa.",
    ],
    [
      "4. Nhập lịch thanh toán",
      "Với billing cycle thanh toán nhiều lần, nhập từng đợt gồm nội dung, thời điểm, số tiền và tổng lũy kế.",
    ],
    [
      "5. Tự tính total amount",
      "Fixed: total = fixed amount. Hourly: total = hourly rate x estimated hours. Success: total = success fee. Hybrid: total = fixed amount + hourly rate x estimated hours + success fee. Người dùng vẫn có thể sửa lại total amount sau khi form tự tính.",
    ],
    [
      "6. Theo dõi thực hiện",
      "Signed date là ngày ký hợp đồng, first payment là mốc thanh toán đầu tiên, end date là ngày theo dõi cuối cùng nếu cần.",
    ],
    [
      "7. Manual và milestone",
      "Manual nghĩa là lịch thanh toán chưa chuẩn hóa nên không thể tự sinh ngày. Milestone nghĩa là thanh toán theo từng giai đoạn; muốn nhập chi tiết nên dùng billing cycle thanh toán nhiều lần.",
    ],
  ];

  const groups = [
    {
      title: "Thông tin hợp đồng",
      rows: [
        [
          "Contract type",
          "Phân loại hợp đồng. By case dùng cho một vụ việc cụ thể, retainer dùng cho hợp đồng dịch vụ định kỳ.",
        ],
        [
          "Status",
          "Trạng thái xử lý nội bộ của hợp đồng, ví dụ draft, review, sent hoặc signed.",
        ],
        [
          "Contract code",
          "Mã hợp đồng. Nếu để trống, hệ thống tự tạo CT cho hợp đồng chính hoặc PL cho phụ lục/sub-contract theo tháng năm của signed date.",
        ],
        [
          "Contract name",
          "Tên hợp đồng để nhận diện trong danh sách và khi tìm kiếm.",
        ],
        [
          "Parent contract",
          "Dùng khi hợp đồng này là phụ lục, hợp đồng con hoặc liên quan trực tiếp tới một hợp đồng chính.",
        ],
      ],
    },
    {
      title: "Đối tượng liên quan",
      rows: [
        ["Customer", "Khách hàng hoặc bên nhận dịch vụ trong hợp đồng."],
        [
          "Internal company",
          "Pháp nhân hoặc công ty nội bộ đứng tên cung cấp dịch vụ.",
        ],
        ["Lawyer", "Luật sư phụ trách chính nếu hợp đồng cần gán người xử lý."],
        ["Template", "Mẫu hợp đồng dùng để soạn thảo hoặc in ấn nếu có."],
        [
          "Quotation",
          "Báo giá liên quan tới hợp đồng. Field này giúp đối chiếu giá trị đã báo với hợp đồng thực tế.",
        ],
        ["Case", "Case hoặc hồ sơ mà hợp đồng này phục vụ."],
      ],
    },
    {
      title: "Mốc thời gian",
      rows: [
        [
          "Signed date",
          "Ngày ký hợp đồng, đồng thời là mốc ngày chính để xác định hiệu lực nghiệp vụ nếu không có ngày riêng khác.",
        ],
        [
          "First payment",
          "Ngày thanh toán đầu tiên hoặc ngày dùng để theo dõi nghĩa vụ thanh toán.",
        ],
        [
          "End date",
          "Với retainer, ngày này có thể tự tính theo first payment, retainer duration và retainer repeat. Với manual/milestone, người dùng nhập tay.",
        ],
      ],
    },
    {
      title: isRetainer ? "Điều khoản retainer" : "Điều khoản by case",
      rows: typeRows,
    },
    ...(!isRetainer
      ? [
          {
            title: "Logic hoạt động byCase",
            rows: byCaseFlowRows,
          },
        ]
      : []),
    {
      title: "Giá trị và ghi chú",
      rows: [
        [
          "Fee model",
          "Cách tính phí chính của hợp đồng như trọn gói, theo giờ, retainer tháng, success fee hoặc kết hợp.",
        ],
        [
          "Billing cycle",
          isRetainer
            ? "Chu kỳ phát sinh phí retainer hoặc lịch thanh toán nhiều lần."
            : "Cách phát sinh khoản thanh toán của by case, ví dụ một lần, thanh toán nhiều lần, milestone hoặc nhập thủ công.",
        ],
        ["Subtotal", "Giá trị trước VAT."],
        ["VAT amount", "Số tiền thuế VAT nếu có."],
        [
          "Total amount",
          "Tổng giá trị hợp đồng. Form tự tính theo fee model để hỗ trợ nhập liệu, nhưng người dùng vẫn có thể chỉnh lại theo nội dung hợp đồng thực tế.",
        ],
        [
          "Scope note",
          "Phạm vi công việc, phần bao gồm, phần loại trừ và điều kiện xử lý phát sinh.",
        ],
        [
          "Description",
          "Ghi chú nội bộ hoặc mô tả bổ sung cho người quản trị.",
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
        background: C.bgSoft,
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
      "Giải thích field hợp đồng",
    ),
    React.createElement(
      "div",
      {
        style: {
          fontSize: 12.5,
          color: C.sub,
          lineHeight: "19px",
          marginBottom: 14,
        },
      },
      "Phần này giải thích ý nghĩa từng field để người dùng nhập thủ công đúng ngữ cảnh. Field nào chưa có thông tin chắc chắn có thể để trống và cập nhật sau.",
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
                    color: C.label,
                    marginBottom: 2,
                  },
                },
                name,
              ),
              React.createElement(
                "div",
                { style: { fontSize: 12.5, color: C.sub, lineHeight: "19px" } },
                desc,
              ),
            ),
          ),
        ),
      ),
    ),
  );
};

const ApprovalSection = ({
  isRequired,
  approvedById,
  lawyerOptions,
  onToggle,
  onSelectApprover,
}) => {
  return React.createElement(
    "div",
    { style: { marginTop: 16 } },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: isRequired ? C.approvalBg : C.bgSoft,
          border: `1px solid ${isRequired ? C.approvalBorder : C.border}`,
          borderRadius: isRequired ? "8px 8px 0 0" : 8,
          cursor: "pointer",
          transition: "all 0.18s",
          userSelect: "none",
        },
        onClick: onToggle,
      },
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
          "Require approval before execution",
          React.createElement(HelpMark, {
            text: "Bật nếu hợp đồng cần người có thẩm quyền review trước khi thực hiện.",
          }),
        ),
        React.createElement(
          "div",
          { style: { fontSize: 11.5, color: C.sub, marginTop: 1 } },
          "Contract will need approval from authorized personnel",
        ),
      ),
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
            React.createElement(HelpMark, {
              text: "Người được chỉ định xét duyệt hợp đồng khi bật yêu cầu approval.",
            }),
          ),
          React.createElement(
            "span",
            { style: { fontSize: 11, color: "#9ca3af", fontStyle: "italic" } },
            "— optional",
          ),
        ),
        React.createElement(SearchSelect, {
          options: lawyerOptions,
          value: approvedById,
          onChange: onSelectApprover,
          placeholder: "Search and select approver",
        }),
      ),
  );
};
const makeIcon = (paths, props = {}) => {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: props.size || 16,
      height: props.size || 16,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props,
    },
    ...paths,
  );
};

const EditIcon = makeIcon(
  [
    React.createElement("path", {
      d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
      key: "1",
    }),
    React.createElement("path", {
      d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
      key: "2",
    }),
  ],
  { size: 14 },
);

const CheckIcon = makeIcon(
  [React.createElement("polyline", { points: "20 6 9 17 4 12", key: "1" })],
  { size: 14 },
);

const XIcon = makeIcon(
  [
    React.createElement("line", {
      x1: "18",
      y1: "6",
      x2: "6",
      y2: "18",
      key: "1",
    }),
    React.createElement("line", {
      x1: "6",
      y1: "6",
      x2: "18",
      y2: "18",
      key: "2",
    }),
  ],
  { size: 14 },
);

const PlusIcon = makeIcon(
  [
    React.createElement("line", {
      x1: "12",
      y1: "5",
      x2: "12",
      y2: "19",
      key: "1",
    }),
    React.createElement("line", {
      x1: "5",
      y1: "12",
      x2: "19",
      y2: "12",
      key: "2",
    }),
  ],
  { size: 14 },
);

const TrashIcon = makeIcon(
  [
    React.createElement("polyline", { points: "3 6 5 6 21 6", key: "1" }),
    React.createElement("path", {
      d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
      key: "2",
    }),
    React.createElement("path", { d: "M10 11v6", key: "3" }),
    React.createElement("path", { d: "M14 11v6", key: "4" }),
    React.createElement("path", { d: "M9 6V4h6v2", key: "5" }),
  ],
  { size: 14 },
);

const SearchIcon = makeIcon(
  [
    React.createElement("circle", { cx: "11", cy: "11", r: "8", key: "1" }),
    React.createElement("path", { d: "m21 21-4.35-4.35", key: "2" }),
  ],
  { size: 14 },
);

const TagIcon = makeIcon(
  [
    React.createElement("path", {
      d: "M20.59 13.41 12 22l-10-10V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z",
      key: "1",
    }),
    React.createElement("circle", { cx: "7", cy: "7", r: "1.5", key: "2" }),
  ],
  { size: 14 },
);

const ChevronDownIcon = makeIcon(
  [React.createElement("polyline", { points: "6 9 12 15 18 9", key: "1" })],
  { size: 14 },
);

const ServiceLinesSection = ({
  lines,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
  onLineUpdate,
  currencies = [],
  selectedCurrency = null,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingId, setSavingId] = useState(null);

  const handleEdit = (line) => {
    setEditingId(line.projectServiceId);
    setEditForm({
      serviceName: line.serviceName || "",
      description: line.description || "",
      totalAmount: line.totalAmount || 0,
      vat: line.vat || 0,
      quantity: line.quantity || 1,
      currencyId: getRecordCurrencyId(line) || "",
    });
  };

  const handleSave = async (line) => {
    setSavingId(line.projectServiceId);
    try {
      const amounts = resolveServiceAmounts({
        quantity: firstNonZeroNumber(editForm.quantity, line.quantity, 1) || 1,
        vat: editForm.vat,
        totalAmount: editForm.totalAmount,
      });
      const payload = {
        serviceName: editForm.serviceName,
        description: editForm.description,
        ...projectServicePricingPayload(amounts),
        currencyId:
          getRecordCurrencyId(editForm) || getRecordCurrencyId(line) || null,
      };
      try {
        await ctx.api.request({
          url: `projectServices:update?filterByTk=${line.projectServiceId}`,
          method: "POST",
          data: payload,
        });
      } catch (error) {
        await ctx.api.request({
          url: `projectServices:update?filterByTk=${line.projectServiceId}`,
          method: "POST",
          data: stripProjectServiceSyncFields(payload),
        });
      }
      if (line.contractServiceId) {
        try {
          const contractServicePayload = stripContractServicePayload(payload);
          await ctx.api.request({
            url: "contractServices:update",
            method: "POST",
            params: { filterByTk: line.contractServiceId },
            data: contractServicePayload,
          });
        } catch (error) {
          const fallbackPayload = stripContractServicePayload(payload);
          delete fallbackPayload.serviceName;
          await ctx.api.request({
            url: "contractServices:update",
            method: "POST",
            params: { filterByTk: line.contractServiceId },
            data: fallbackPayload,
          });
        }
      }
      message.success("Đã cập nhật dịch vụ");
      onLineUpdate(line.projectServiceId, payload);
      setEditingId(null);
    } catch (e) {
      message.error("Lỗi cập nhật dịch vụ");
    }
    setSavingId(null);
  };

  if (!lines.length) return null;
  const selectableCount = lines.filter((line) => !line.locked).length;
  const selectedTotals = sumServiceLines(
    lines.filter((line) => selectedIds.includes(String(line.projectServiceId))),
  );
  const defaultCurrency = selectedCurrency || findDefaultCurrency(currencies);
  const serviceTableColumns =
    "36px minmax(260px, 2fr) minmax(130px, 0.8fr) minmax(125px, 0.8fr) minmax(90px, 0.5fr) minmax(125px, 0.8fr) minmax(135px, 0.85fr) 58px";
  const serviceTableMinWidth = 1050;
  const serviceHeaderStyle = (extra = {}) => ({
    padding: "8px 12px",
    background: "#f9fafb",
    color: C.sub,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    minWidth: 0,
    boxSizing: "border-box",
    ...extra,
  });
  const serviceCellStyle = (extra = {}) => ({
    padding: "11px 12px",
    minWidth: 0,
    boxSizing: "border-box",
    ...extra,
  });

  return React.createElement(
    Section,
    { title: "Services" },
    React.createElement(
      "div",
      {
        style: {
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          overflow: "hidden",
          background: "#fff",
          maxWidth: "100%",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "10px 12px",
            background: C.bgSoft,
            borderBottom: `1px solid ${C.border}`,
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 12, color: C.sub } },
          `${selectedIds.length}/${selectableCount} services selected`,
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            },
          },
          React.createElement(
            "span",
            { style: { fontSize: 12, fontWeight: 700, color: C.text } },
            formatMoneyByCurrency(selectedTotals.totalAmount, defaultCurrency),
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: onSelectAll,
              style: {
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                background: "#fff",
                padding: "5px 9px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: FONT,
                cursor: "pointer",
              },
            },
            "Select all",
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: onClear,
              style: {
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                background: "#fff",
                color: C.sub,
                padding: "5px 9px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: FONT,
                cursor: "pointer",
              },
            },
            "Clear",
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          role: "table",
          style: {
            overflowX: "auto",
            overflowY: "hidden",
            maxWidth: "100%",
            background: "#fff",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              minWidth: serviceTableMinWidth,
              width: "100%",
              display: "flex",
              flexDirection: "column",
            },
          },
          React.createElement(
            "div",
            {
              role: "row",
              style: {
                display: "grid",
                gridTemplateColumns: serviceTableColumns,
                width: "100%",
                alignItems: "center",
                background: "#f9fafb",
                borderBottom: `1px solid ${C.border}`,
                boxSizing: "border-box",
              },
            },
            React.createElement(
              "div",
              {
                role: "columnheader",
                style: serviceHeaderStyle({ textAlign: "center" }),
              },
              "",
            ),
            React.createElement(
              "div",
              {
                role: "columnheader",
                style: serviceHeaderStyle({ textAlign: "center" }),
              },
              "Service",
            ),
            React.createElement(
              "div",
              {
                role: "columnheader",
                style: serviceHeaderStyle({ textAlign: "center" }),
              },
              "Status",
            ),
            React.createElement(
              "div",
              {
                role: "columnheader",
                style: serviceHeaderStyle({ textAlign: "center" }),
              },
              "Base price",
            ),
            React.createElement(
              "div",
              {
                role: "columnheader",
                style: serviceHeaderStyle({ textAlign: "center" }),
              },
              "VAT",
            ),
            React.createElement(
              "div",
              {
                role: "columnheader",
                style: serviceHeaderStyle({ textAlign: "center" }),
              },
              "VAT amount",
            ),
            React.createElement(
              "div",
              {
                role: "columnheader",
                style: serviceHeaderStyle({ textAlign: "center" }),
              },
              "Total",
            ),
            React.createElement(
              "div",
              {
                role: "columnheader",
                style: serviceHeaderStyle({ textAlign: "center" }),
              },
              "",
            ),
          ),
          lines.map((line) => {
            const checked = selectedIds.includes(String(line.projectServiceId));
            const isEditing = editingId === line.projectServiceId;
            const isSaving = savingId === line.projectServiceId;
            const lineCurrency = currencyFromRecord(
              line,
              currencies,
              defaultCurrency,
            );
            const editAmounts = isEditing
              ? resolveServiceAmounts({
                  quantity:
                    firstNonZeroNumber(editForm.quantity, line.quantity, 1) ||
                    1,
                  vat: editForm.vat,
                  totalAmount: editForm.totalAmount,
                })
              : null;

            const statusLabel = line.locked
              ? "Đã có hợp đồng"
              : serviceStatusLabel(line.status);
            const statusColor = line.locked
              ? C.danger
              : line.status === "active"
                ? "#52c41a"
                : line.status === "ordered"
                  ? "#1890ff"
                  : C.sub;
            const statusBg = line.locked
              ? "#fff1f0"
              : line.status === "active"
                ? "#f6ffed"
                : line.status === "ordered"
                  ? "#e6f7ff"
                  : "#f5f5f5";

            return React.createElement(
              "div",
              {
                key: line.id,
                role: "row",
                style: {
                  display: "grid",
                  gridTemplateColumns: serviceTableColumns,
                  width: "100%",
                  gap: 0,
                  alignItems: "center",
                  borderBottom: `1px solid ${C.border}`,
                  boxSizing: "border-box",
                  opacity: line.locked && !isEditing ? 0.55 : 1,
                  background: isEditing ? "#fafafa" : "#fff",
                  transition: "background 0.2s",
                },
              },
              React.createElement(
                "div",
                {
                  role: "cell",
                  style: serviceCellStyle({ textAlign: "center" }),
                },
                React.createElement("input", {
                  type: "checkbox",
                  checked,
                  disabled: line.locked || isEditing,
                  onChange: () => onToggle(line),
                  style: {
                    width: 16,
                    height: 16,
                    cursor:
                      line.locked || isEditing ? "not-allowed" : "pointer",
                  },
                }),
              ),
              React.createElement(
                "div",
                { role: "cell", style: serviceCellStyle() },
                isEditing
                  ? React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        },
                      },
                      React.createElement(TextInput, {
                        value: editForm.serviceName,
                        onChange: (val) =>
                          setEditForm({ ...editForm, serviceName: val }),
                        placeholder: "Tên dịch vụ",
                      }),
                      React.createElement(TextArea, {
                        value: editForm.description,
                        onChange: (val) =>
                          setEditForm({ ...editForm, description: val }),
                        placeholder: "Mô tả",
                        rows: 2,
                      }),
                    )
                  : React.createElement(
                      React.Fragment,
                      null,
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 13,
                            fontWeight: 700,
                            color: C.text,
                            wordBreak: "break-word",
                          },
                        },
                        line.serviceName,
                      ),
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 11.5,
                            color: C.sub,
                            marginTop: 2,
                            wordBreak: "break-word",
                          },
                        },
                        line.description || "No description",
                      ),
                    ),
              ),
              React.createElement(
                "div",
                {
                  role: "cell",
                  style: serviceCellStyle({ fontSize: 12, fontWeight: 600 }),
                },
                React.createElement(
                  "span",
                  {
                    style: {
                      background: statusBg,
                      color: statusColor,
                      padding: "2px 8px",
                      borderRadius: 4,
                      border: `1px solid ${statusColor}40`,
                    },
                  },
                  statusLabel,
                ),
              ),
              React.createElement(
                "div",
                {
                  role: "cell",
                  style: serviceCellStyle({ textAlign: "center" }),
                },
                React.createElement(
                  "span",
                  {
                    title: "Base price",
                    style: {
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.text,
                      fontVariantNumeric: "tabular-nums",
                    },
                  },
                  formatMoneyByCurrency(
                    isEditing ? editAmounts.basePrice : line.basePrice,
                    lineCurrency,
                  ),
                ),
              ),
              React.createElement(
                "div",
                {
                  role: "cell",
                  style: serviceCellStyle({
                    fontSize: 12,
                    color: C.text,
                    textAlign: "center",
                  }),
                },
                isEditing
                  ? React.createElement(SuffixInput, {
                      value: editForm.vat,
                      onChange: (val) =>
                        setEditForm({ ...editForm, vat: moneyRaw(val) }),
                      suffix: "% VAT",
                      placeholder: "0",
                    })
                  : React.createElement(
                      "span",
                      {
                        style: {
                          background: "#f5f5f5",
                          color: C.sub,
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: "1px solid #d9d9d9",
                        },
                      },
                      `${line.vat || 0}%`,
                    ),
              ),
              React.createElement(
                "div",
                {
                  role: "cell",
                  style: serviceCellStyle({ textAlign: "center" }),
                },
                React.createElement(
                  "span",
                  {
                    title: "VAT amount",
                    style: {
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.text,
                      fontVariantNumeric: "tabular-nums",
                    },
                  },
                  formatMoneyByCurrency(
                    isEditing ? editAmounts.vatAmount : line.vatAmount,
                    lineCurrency,
                  ),
                ),
              ),
              React.createElement(
                "div",
                {
                  role: "cell",
                  style: serviceCellStyle({ textAlign: "center" }),
                },
                isEditing
                  ? React.createElement(MoneyInput, {
                      value: editForm.totalAmount,
                      onChange: (val) =>
                        setEditForm({ ...editForm, totalAmount: val }),
                      currency: lineCurrency,
                    })
                  : React.createElement(
                      "span",
                      {
                        style: {
                          fontSize: 12,
                          fontWeight: 700,
                          color: C.text,
                          fontVariantNumeric: "tabular-nums",
                        },
                      },
                      formatMoneyByCurrency(line.totalAmount, lineCurrency),
                    ),
              ),
              React.createElement(
                "div",
                {
                  role: "cell",
                  style: serviceCellStyle({
                    display: "flex",
                    gap: 6,
                    justifyContent: "flex-end",
                  }),
                },
                isEditing
                  ? React.createElement(
                      React.Fragment,
                      null,
                      React.createElement(
                        "button",
                        {
                          onClick: () => setEditingId(null),
                          disabled: isSaving,
                          style: {
                            border: "1px solid #d9d9d9",
                            background: "#fff",
                            cursor: "pointer",
                            padding: "4px 6px",
                            borderRadius: 4,
                            color: C.sub,
                          },
                        },
                        XIcon,
                      ),
                      React.createElement(
                        "button",
                        {
                          onClick: () => handleSave(line),
                          disabled: isSaving,
                          style: {
                            border: "1px solid #1890ff",
                            background: "#1890ff",
                            cursor: "pointer",
                            padding: "4px 6px",
                            borderRadius: 4,
                            color: "#fff",
                          },
                        },
                        isSaving
                          ? React.createElement(Spin, { size: "small" })
                          : CheckIcon,
                      ),
                    )
                  : React.createElement(
                      "button",
                      {
                        onClick: () => handleEdit(line),
                        title: "Sửa dịch vụ",
                        style: {
                          border: "1px solid #d9d9d9",
                          background: "#fff",
                          cursor: "pointer",
                          padding: "4px 6px",
                          borderRadius: 4,
                          color: C.text,
                        },
                      },
                      EditIcon,
                    ),
              ),
            );
          }),
        ),
      ),
    ),
  );
};

const ManualContractServicesSection = ({
  rows,
  services,
  pricingMode,
  packageVatRate,
  packageTotals,
  currencies = [],
  currencyOptions = [],
  selectedCurrency = null,
  readOnlyServices = false,
  showAddRow = true,
  allowDelete = true,
  onPricingModeChange,
  onPackageSubTotalChange,
  onPackageVatRateChange,
  onAddRow,
  onDeleteRow,
  onUpdateRow,
  onSelectService,
  onCreateManualService,
  onCurrencyChange,
}) => {
  const [pickerRowId, setPickerRowId] = useState(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState({
    serviceName: "",
    serviceType: "",
    currencyId: "",
    basePrice: "",
    description: "",
  });
  const [createError, setCreateError] = useState("");
  const packageMode = pricingMode === "package";
  const actionColumn = allowDelete ? " 52px" : "";
  const columns = `minmax(260px, 1.2fr) minmax(300px, 1.45fr) minmax(190px, 0.85fr) 98px minmax(165px, 0.75fr)${actionColumn}`;
  const selectedServiceIds = rows
    .map((row) => String(row.serviceId || ""))
    .filter(Boolean);
  const currentRow = rows.find((row) => row.id === pickerRowId) || null;
  const defaultCurrency = selectedCurrency || findDefaultCurrency(currencies);
  const defaultCurrencyId =
    extractCurrencyId(defaultCurrency) ||
    extractCurrencyId(currencyOptions[0]?.value);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [exchangeRates, setExchangeRates] = useState([]);
  const preliminarySummary = useMemo(
    () =>
      buildContractFinancialSummary({
        rows,
        currencies,
        baseCurrency: defaultCurrency,
        packageMode,
        packageTotals,
      }),
    [rows, currencies, defaultCurrency, packageMode, packageTotals],
  );
  const rateCurrencyIds = useMemo(
    () =>
      getConversionSourceCurrencyIds(
        preliminarySummary.groups,
        defaultCurrency,
      ),
    [preliminarySummary.groups, defaultCurrency],
  );
  const rateCurrencyKey = rateCurrencyIds
    .slice()
    .sort((a, b) => a - b)
    .join(",");
  useEffect(() => {
    let alive = true;
    if (packageMode || !rateCurrencyIds.length) {
      setExchangeRates([]);
      return () => {
        alive = false;
      };
    }
    fetchExchangeRatesForConversion(
      rateCurrencyIds,
      extractCurrencyId(defaultCurrency),
    )
      .then((r) => {
        if (alive) setExchangeRates(r || []);
      })
      .catch(() => {
        if (alive) setExchangeRates([]);
      });
    return () => {
      alive = false;
    };
  }, [packageMode, rateCurrencyKey, defaultCurrencyId]);
  const financialSummary = useMemo(
    () =>
      buildContractFinancialSummary({
        rows,
        currencies,
        baseCurrency: defaultCurrency,
        exchangeRates,
        packageMode,
        packageTotals,
      }),
    [
      rows,
      currencies,
      defaultCurrency,
      exchangeRates,
      packageMode,
      packageTotals,
    ],
  );
  const hasMixedCurrencies = !packageMode && financialSummary.groups.length > 1;
  const needsConversion =
    !packageMode &&
    financialSummary.groups.some(
      (group) => !isSameCurrency(group.currency, defaultCurrency),
    );
  const canShowTotals = packageMode || financialSummary.converted.canConvert;
  const getRowConversion = (rowCurrency, amounts) => {
    if (isSameCurrency(rowCurrency, defaultCurrency)) {
      return { sameCurrency: true, canConvert: true, ...amounts };
    }
    const matched = pickConversionRate(
      exchangeRates,
      rowCurrency,
      defaultCurrency,
    );
    if (!matched?.rate) return { sameCurrency: false, canConvert: false };
    return {
      sameCurrency: false,
      canConvert: true,
      rate: matched.rate,
      subTotal: amounts.subTotal * matched.rate,
      vatAmount: amounts.vatAmount * matched.rate,
      totalAmount: amounts.totalAmount * matched.rate,
    };
  };
  const filteredServices = useMemo(() => {
    const q = normalizeSearch(search).trim();
    return services
      .filter((service) => {
        if (!q) return true;
        return (
          normalizeSearch(serviceCatalogName(service)).includes(q) ||
          normalizeSearch(serviceCatalogType(service)).includes(q) ||
          normalizeSearch(serviceCatalogDescription(service)).includes(q)
        );
      })
      .slice(0, 80);
  }, [services, search]);
  const headerStyle = {
    padding: "11px 14px",
    background: "#fbfcfd",
    color: C.sub,
    fontSize: 12,
    fontWeight: 600,
    borderBottom: `1px solid ${C.border}`,
  };
  const cellStyle = {
    padding: "12px 14px",
    minWidth: 0,
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    minHeight: packageMode ? 76 : 84,
    boxSizing: "border-box",
  };
  const summaryGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    alignItems: "end",
    width: "min(100%, 720px)",
  };
  const summaryValueStyle = () => ({
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  });
  const summaryVatControlStyle = {
    display: "grid",
    gridTemplateColumns: packageMode ? "minmax(0, 1fr) 82px" : "1fr",
    gap: 8,
    alignItems: "stretch",
  };
  const summaryLabelStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: 0,
  };
  const summaryAmountStyle = (
    color = C.text,
    large = false,
    bg = "#fff",
    border = C.border,
  ) => ({
    minHeight: 32,
    border: `1px solid ${border}`,
    borderRadius: 6,
    background: bg,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 11px",
    boxSizing: "border-box",
    fontSize: large ? 15 : 14,
    fontWeight: large ? 700 : 600,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  });
  const serviceNameKey = (value) =>
    normalizeSearch(value).replace(/\s+/g, " ").trim();
  const normalizedNewServiceName = serviceNameKey(newService.serviceName);
  const duplicateCatalogService =
    normalizedNewServiceName &&
    services.find(
      (service) =>
        serviceNameKey(serviceCatalogName(service)) ===
        normalizedNewServiceName,
    );
  const duplicateManualRow =
    normalizedNewServiceName &&
    rows.find(
      (row) =>
        row.id !== pickerRowId &&
        serviceNameKey(row.serviceName) === normalizedNewServiceName,
    );
  const duplicateNewService = duplicateCatalogService || duplicateManualRow;

  const resetCreateForm = () => {
    setNewService({
      serviceName: "",
      serviceType: "",
      currencyId: defaultCurrencyId ? String(defaultCurrencyId) : "",
      basePrice: "",
      description: "",
    });
    setCreateError("");
    setShowAdd(false);
  };

  const openPicker = (rowId) => {
    setPickerRowId(rowId);
    setSearch("");
    resetCreateForm();
  };

  const closePicker = () => {
    setPickerRowId(null);
    setSearch("");
    resetCreateForm();
  };

  const selectService = (service) => {
    if (!currentRow || !service) return;
    const serviceId = String(serviceOptionServiceId(service));
    const isUsed = rows.some(
      (row) => row.id !== currentRow.id && String(row.serviceId) === serviceId,
    );
    if (isUsed) {
      message.warning("This service is already selected in another row.");
      return;
    }
    onSelectService(currentRow.id, serviceId, service);
    closePicker();
  };

  const handleCreateService = async () => {
    if (!newService.serviceName.trim()) {
      setCreateError("Please enter service name.");
      return;
    }
    if (parseNum(newService.basePrice) <= 0) {
      setCreateError("Please enter unit price greater than 0.");
      return;
    }
    if (currencyOptions.length && !extractCurrencyId(newService.currencyId)) {
      setCreateError("Please select currency.");
      return;
    }
    if (duplicateNewService) {
      setCreateError(
        duplicateCatalogService
          ? "This service already exists in the catalog. Please select it instead."
          : "This service is already added in another row.",
      );
      return;
    }
    if (!currentRow) return;
    const created = onCreateManualService?.(currentRow.id, newService);
    if (created) {
      closePicker();
    }
  };

  const renderSelectedServiceButton = (row) => {
    const typeLabel = row.serviceType || "";
    if (readOnlyServices) {
      return React.createElement(
        "div",
        {
          style: {
            width: "100%",
            minHeight: 54,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            background: C.bgSoft,
            padding: "8px 11px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            textAlign: "left",
            fontFamily: FONT,
            boxSizing: "border-box",
          },
        },
        React.createElement(
          "span",
          { style: { color: C.primary, flexShrink: 0 } },
          TagIcon,
        ),
        React.createElement(
          "span",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "span",
            {
              style: {
                display: "block",
                color: C.text,
                fontSize: 14,
                fontWeight: 700,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              },
            },
            row.serviceName || "Service",
          ),
          typeLabel &&
            React.createElement(
              "span",
              {
                style: {
                  display: "block",
                  marginTop: 2,
                  color: C.sub,
                  fontSize: 12,
                  lineHeight: "16px",
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                },
              },
              typeLabel,
            ),
        ),
      );
    }
    return React.createElement(
      "button",
      {
        type: "button",
        onClick: () => openPicker(row.id),
        style: {
          width: "100%",
          minHeight: 54,
          border: `1px solid ${C.border}`,
          borderRadius: 7,
          background: "#fff",
          padding: "8px 11px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: FONT,
        },
      },
      React.createElement(
        "span",
        {
          style: { color: row.serviceName ? C.primary : C.sub, flexShrink: 0 },
        },
        row.serviceName ? TagIcon : SearchIcon,
      ),
      React.createElement(
        "span",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "span",
          {
            style: {
              display: "block",
              color: row.serviceName ? C.text : C.sub,
              fontSize: 14,
              fontWeight: row.serviceName ? 600 : 500,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            },
          },
          row.serviceName || "Select service",
        ),
        typeLabel &&
          React.createElement(
            "span",
            {
              style: {
                display: "block",
                marginTop: 2,
                color: C.sub,
                fontSize: 12,
                lineHeight: "16px",
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              },
            },
            typeLabel,
          ),
      ),
      React.createElement(
        "span",
        { style: { color: C.sub, flexShrink: 0 } },
        ChevronDownIcon,
      ),
    );
  };

  const modalThStyle = (extra = {}) => ({
    padding: "10px 14px",
    fontSize: 12.5,
    fontWeight: 600,
    color: C.sub,
    background: C.bgSoft,
    borderBottom: `1px solid ${C.border}`,
    textAlign: "left",
    fontFamily: FONT,
    ...extra,
  });
  const modalTdStyle = (extra = {}) => ({
    padding: "14px 14px",
    fontSize: 13.5,
    borderBottom: `1px solid #f3f4f6`,
    verticalAlign: "middle",
    fontFamily: FONT,
    ...extra,
  });
  const modalButtonStyle = {
    border: "none",
    borderRadius: 6,
    background: C.primary,
    color: "#fff",
    padding: "7px 15px",
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: FONT,
    cursor: "pointer",
  };

  const pickerModal =
    pickerRowId &&
    React.createElement(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.42)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1200,
          padding: 18,
          boxSizing: "border-box",
        },
        onClick: closePicker,
      },
      React.createElement(
        "div",
        {
          style: {
            background: "#fff",
            borderRadius: 12,
            width: "100%",
            maxWidth: showAdd ? 704 : 944,
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 18px 54px rgba(15,23,42,0.22)",
            overflow: "hidden",
          },
          onClick: (e) => e.stopPropagation(),
        },
        React.createElement(
          "div",
          {
            style: {
              padding: "18px 26px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
              },
            },
            showAdd &&
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setShowAdd(false);
                    setCreateError("");
                  },
                  style: {
                    border: "none",
                    borderRadius: 6,
                    background: C.bgSoft,
                    color: C.primary,
                    padding: "6px 10px",
                    fontSize: 13,
                    fontFamily: FONT,
                    cursor: "pointer",
                  },
                },
                "< Back",
              ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 18,
                  fontWeight: 500,
                  color: C.text,
                  fontFamily: FONT,
                },
              },
              showAdd ? "Create New Service" : "Select Service",
            ),
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: closePicker,
              style: {
                border: "none",
                background: "transparent",
                color: C.sub,
                fontSize: 18,
                fontFamily: FONT,
                cursor: "pointer",
                padding: 0,
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
                    padding: "16px 26px",
                    borderBottom: `1px solid #f3f4f6`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexShrink: 0,
                  },
                },
                React.createElement("input", {
                  autoFocus: true,
                  value: search,
                  onChange: (e) => setSearch(e.target.value),
                  placeholder: "Search service name...",
                  onFocus: focus,
                  onBlur: blur,
                  style: { ...inputStyle, flex: 1, minWidth: 0, height: 44 },
                }),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setShowAdd(true);
                      setCreateError("");
                    },
                    style: {
                      border: "none",
                      borderRadius: 7,
                      background: C.primary,
                      color: "#fff",
                      padding: "0 20px",
                      height: 44,
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: FONT,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    },
                  },
                  "Create new",
                ),
              ),
              React.createElement(
                "div",
                { style: { overflowY: "auto", flex: 1, minHeight: 220 } },
                React.createElement(
                  "table",
                  {
                    style: {
                      width: "100%",
                      borderCollapse: "collapse",
                      tableLayout: "fixed",
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
                        {
                          style: modalThStyle({
                            width: 42,
                            textAlign: "center",
                          }),
                        },
                        "#",
                      ),
                      React.createElement(
                        "th",
                        { style: modalThStyle() },
                        "Service Name",
                      ),
                      React.createElement(
                        "th",
                        { style: modalThStyle({ width: 180 }) },
                        "Type",
                      ),
                      React.createElement(
                        "th",
                        {
                          style: modalThStyle({
                            width: 170,
                            textAlign: "right",
                          }),
                        },
                        "Unit Price",
                      ),
                      React.createElement(
                        "th",
                        {
                          style: modalThStyle({
                            width: 104,
                            textAlign: "center",
                          }),
                        },
                        "",
                      ),
                    ),
                  ),
                  React.createElement(
                    "tbody",
                    null,
                    filteredServices.length
                      ? filteredServices.map((service, index) => {
                          const serviceId = String(
                            serviceOptionServiceId(service),
                          );
                          const serviceName = serviceCatalogName(service);
                          const serviceType = serviceCatalogType(service);
                          const description =
                            serviceCatalogDescription(service);
                          const price = serviceCatalogPrice(service);
                          const serviceCurrency = serviceCatalogCurrency(
                            service,
                            currencies,
                            defaultCurrency,
                          );
                          const isUsed =
                            selectedServiceIds.includes(serviceId) &&
                            String(currentRow?.serviceId || "") !== serviceId;
                          const isCurrent =
                            String(currentRow?.serviceId || "") === serviceId;
                          return React.createElement(
                            "tr",
                            {
                              key: serviceId || index,
                              onClick: () => !isUsed && selectService(service),
                              style: {
                                background: isCurrent
                                  ? "#eef4fb"
                                  : index % 2 === 0
                                    ? "#fff"
                                    : "#fafafa",
                                cursor: isUsed ? "not-allowed" : "pointer",
                                opacity: isUsed ? 0.5 : 1,
                              },
                            },
                            React.createElement(
                              "td",
                              {
                                style: modalTdStyle({
                                  textAlign: "center",
                                  color: C.sub,
                                  fontSize: 12,
                                }),
                              },
                              index + 1,
                            ),
                            React.createElement(
                              "td",
                              {
                                style: modalTdStyle({
                                  fontWeight: 700,
                                  color: C.text,
                                }),
                              },
                              React.createElement(
                                "div",
                                { style: { lineHeight: "19px" } },
                                serviceName,
                              ),
                              description &&
                                React.createElement(
                                  "div",
                                  {
                                    style: {
                                      marginTop: 4,
                                      color: C.sub,
                                      fontSize: 12,
                                      fontWeight: 500,
                                      lineHeight: "18px",
                                    },
                                  },
                                  description,
                                ),
                            ),
                            React.createElement(
                              "td",
                              { style: modalTdStyle() },
                              serviceType
                                ? React.createElement(
                                    "span",
                                    {
                                      style: {
                                        display: "inline-block",
                                        maxWidth: "100%",
                                        borderRadius: 10,
                                        background: C.bgSoft,
                                        color: C.text,
                                        padding: "3px 8px",
                                        fontSize: 11.5,
                                        lineHeight: "16px",
                                        overflowWrap: "anywhere",
                                      },
                                    },
                                    serviceType,
                                  )
                                : React.createElement(
                                    "span",
                                    { style: { color: "#cbd5e1" } },
                                    "-",
                                  ),
                            ),
                            React.createElement(
                              "td",
                              {
                                style: modalTdStyle({
                                  textAlign: "right",
                                  fontVariantNumeric: "tabular-nums",
                                  color: C.text,
                                }),
                              },
                              formatMoneyByCurrency(price, serviceCurrency),
                            ),
                            React.createElement(
                              "td",
                              { style: modalTdStyle({ textAlign: "center" }) },
                              isCurrent
                                ? React.createElement(
                                    "span",
                                    {
                                      title: "Selected",
                                      style: {
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 28,
                                        height: 28,
                                        borderRadius: "50%",
                                        background: C.bgSoft,
                                        border: "1px solid #bbf7d0",
                                        color: "#15803d",
                                      },
                                    },
                                    CheckIcon,
                                  )
                                : isUsed
                                  ? React.createElement(
                                      "span",
                                      {
                                        style: {
                                          color: C.sub,
                                          fontSize: 12,
                                          fontWeight: 700,
                                        },
                                      },
                                      "Used",
                                    )
                                  : React.createElement(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: (e) => {
                                          e.stopPropagation();
                                          selectService(service);
                                        },
                                        style: modalButtonStyle,
                                      },
                                      "Select",
                                    ),
                            ),
                          );
                        })
                      : React.createElement(
                          "tr",
                          null,
                          React.createElement(
                            "td",
                            {
                              colSpan: 5,
                              style: modalTdStyle({
                                textAlign: "center",
                                color: C.sub,
                                padding: "42px 12px",
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
                                "button",
                                {
                                  type: "button",
                                  onClick: () => setShowAdd(true),
                                  style: {
                                    border: "none",
                                    background: "transparent",
                                    color: C.primary,
                                    cursor: "pointer",
                                    fontSize: 12,
                                    textDecoration: "underline",
                                    fontFamily: FONT,
                                  },
                                },
                                "Create now",
                              ),
                            ),
                          ),
                        ),
                  ),
                ),
              ),
              React.createElement(
                "div",
                {
                  style: {
                    padding: "14px 26px",
                    borderTop: `1px solid ${C.border}`,
                    display: "flex",
                    justifyContent: "flex-end",
                    flexShrink: 0,
                    background: "#fff",
                  },
                },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: closePicker,
                    style: {
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      background: "#fff",
                      color: C.sub,
                      padding: "8px 22px",
                      fontSize: 13,
                      fontFamily: FONT,
                      cursor: "pointer",
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
                {
                  style: {
                    overflowY: "auto",
                    flex: 1,
                    padding: "24px 32px 18px",
                  },
                },
                React.createElement(
                  "div",
                  { style: { display: "grid", gap: 16 } },
                  React.createElement(
                    Field,
                    { label: "Service Name", required: true },
                    React.createElement(TextInput, {
                      value: newService.serviceName,
                      onChange: (value) => {
                        setNewService((prev) => ({
                          ...prev,
                          serviceName: value,
                        }));
                        setCreateError("");
                      },
                      placeholder: "e.g., Labor contract consulting...",
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Service Type", hint: "optional" },
                    React.createElement(TextInput, {
                      value: newService.serviceType,
                      onChange: (value) =>
                        setNewService((prev) => ({
                          ...prev,
                          serviceType: value,
                        })),
                      placeholder: "e.g., Consulting, Legal...",
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Currency", required: !!currencyOptions.length },
                    React.createElement(
                      "select",
                      {
                        value:
                          newService.currencyId ||
                          (defaultCurrencyId ? String(defaultCurrencyId) : ""),
                        onChange: (e) => {
                          setNewService((prev) => ({
                            ...prev,
                            currencyId: e.target.value,
                          }));
                          setCreateError("");
                        },
                        style: { ...inputStyle, height: 38 },
                      },
                      currencyOptions.length
                        ? currencyOptions.map((option) =>
                            React.createElement(
                              "option",
                              { key: option.value, value: option.value },
                              option.label,
                            ),
                          )
                        : React.createElement(
                            "option",
                            { value: "" },
                            getCurrencyCode(defaultCurrency),
                          ),
                    ),
                  ),
                  React.createElement(
                    Field,
                    { label: "Unit Price", required: true },
                    React.createElement(MoneyInput, {
                      value: newService.basePrice,
                      onChange: (value) => {
                        setNewService((prev) => ({
                          ...prev,
                          basePrice: value,
                        }));
                        setCreateError("");
                      },
                      currency:
                        resolveCurrency(newService.currencyId, currencies) ||
                        defaultCurrency,
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Description", hint: "optional" },
                    React.createElement(TextArea, {
                      value: newService.description,
                      onChange: (value) =>
                        setNewService((prev) => ({
                          ...prev,
                          description: value,
                        })),
                      placeholder: "Scope of work, notes...",
                      rows: 4,
                    }),
                  ),
                  duplicateNewService &&
                    React.createElement(
                      "div",
                      {
                        style: {
                          color: "#92400e",
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: 6,
                          padding: "9px 11px",
                          fontSize: 12,
                        },
                      },
                      duplicateCatalogService
                        ? "This service already exists in the catalog. Select it from the list to avoid duplicates."
                        : "This service is already added in another row.",
                    ),
                  createError &&
                    React.createElement(
                      "div",
                      {
                        style: {
                          color: C.danger,
                          fontSize: 12,
                          fontWeight: 700,
                        },
                      },
                      createError,
                    ),
                ),
              ),
              React.createElement(
                "div",
                {
                  style: {
                    padding: "16px 32px",
                    borderTop: `1px solid #f3f4f6`,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 12,
                    background: C.bgSoft,
                    flexShrink: 0,
                  },
                },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setShowAdd(false);
                      setCreateError("");
                    },
                    style: {
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      background: "#fff",
                      color: C.text,
                      padding: "9px 24px",
                      fontSize: 13,
                      fontFamily: FONT,
                      cursor: "pointer",
                    },
                  },
                  "Cancel",
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: handleCreateService,
                    disabled: !!duplicateNewService,
                    style: {
                      border: "none",
                      borderRadius: 6,
                      background: duplicateNewService ? "#9ca3af" : C.primary,
                      color: "#fff",
                      padding: "9px 28px",
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: FONT,
                      cursor: duplicateNewService ? "not-allowed" : "pointer",
                    },
                  },
                  "Save & Select",
                ),
              ),
            ),
      ),
    );

  return React.createElement(
    Section,
    { title: "Services" },
    pickerModal,
    React.createElement(
      "div",
      {
        style: {
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "10px 12px",
            background: "linear-gradient(180deg, #fbfdff 0%, #f5f8fc 100%)",
            borderBottom: `1px solid ${C.border}`,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            },
          },
          [
            ["line", "Line pricing"],
            ["package", "Package pricing"],
          ].map(([mode, label]) =>
            AntButton
              ? React.createElement(
                  AntButton,
                  {
                    key: mode,
                    type: pricingMode === mode ? "primary" : "default",
                    onClick: () => onPricingModeChange(mode),
                  },
                  label,
                )
              : React.createElement(
                  "button",
                  {
                    key: mode,
                    type: "button",
                    onClick: () => onPricingModeChange(mode),
                    style: {
                      border: `1px solid ${pricingMode === mode ? C.primary : C.border}`,
                      background: pricingMode === mode ? C.primary : "#fff",
                      color: pricingMode === mode ? "#fff" : C.text,
                      borderRadius: 6,
                      padding: "8px 13px",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: FONT,
                      cursor: "pointer",
                    },
                  },
                  label,
                ),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            },
          },
          React.createElement(
            "div",
            { style: { width: 130, minWidth: 0 } },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 11.5,
                  color: C.sub,
                  marginBottom: 3,
                  fontFamily: FONT,
                  textAlign: "right",
                },
              },
              "Currency",
            ),
            React.createElement(SelectInput, {
              value: selectedCurrency
                ? String(extractCurrencyId(selectedCurrency))
                : "",
              onChange: (value) => onCurrencyChange?.(value || null),
              options: currencyOptions,
              placeholder: currencyOptions.length
                ? "Currency"
                : "No currencies",
            }),
          ),
          showAddRow &&
            (AntButton
              ? React.createElement(
                  AntButton,
                  { type: "dashed", onClick: onAddRow },
                  PlusIcon,
                  " Add service",
                )
              : React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: onAddRow,
                    style: {
                      border: `1px dashed ${C.primary}`,
                      background: "#fff",
                      color: C.primary,
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: FONT,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    },
                  },
                  PlusIcon,
                  "Add row",
                )),
        ),
      ),
      React.createElement(
        "div",
        { style: { overflowX: "auto" } },
        React.createElement(
          "div",
          { style: { minWidth: 1015 } },
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: columns } },
            React.createElement("div", { style: headerStyle }, "Service"),
            React.createElement("div", { style: headerStyle }, "Description"),
            React.createElement(
              "div",
              { style: { ...headerStyle, textAlign: "center" } },
              "Base price",
            ),
            React.createElement(
              "div",
              { style: { ...headerStyle, textAlign: "center" } },
              "VAT",
            ),
            React.createElement(
              "div",
              {
                style: {
                  ...headerStyle,
                  textAlign: "center",
                  color: "#1d4ed8",
                  background: "#eef4ff",
                },
              },
              "Total",
            ),
            allowDelete &&
              React.createElement("div", { style: headerStyle }, ""),
          ),
          rows.length
            ? rows.map((row, rowIndex) => {
                const amounts = manualServiceLineAmounts(row, packageMode);
                const rowCurrency = currencyFromRecord(
                  row,
                  currencies,
                  selectedCurrency || defaultCurrency,
                );
                const rowConversion = !packageMode
                  ? getRowConversion(rowCurrency, amounts)
                  : null;
                return React.createElement(
                  "div",
                  {
                    key: row.id,
                    style: {
                      display: "grid",
                      gridTemplateColumns: columns,
                      alignItems: "stretch",
                      background: rowIndex % 2 === 0 ? "#fff" : "#fafafa",
                      transition: "background 0.12s",
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.background = "#e6f4ff";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.background =
                        rowIndex % 2 === 0 ? "#fff" : "#fafafa";
                    },
                  },
                  React.createElement(
                    "div",
                    { style: cellStyle },
                    renderSelectedServiceButton(row),
                  ),
                  React.createElement(
                    "div",
                    { style: cellStyle },
                    React.createElement(TextArea, {
                      value: row.description || "",
                      onChange: (value) =>
                        onUpdateRow(row.id, "description", value),
                      placeholder: "Service scope or note",
                      rows: 2,
                    }),
                  ),
                  React.createElement(
                    "div",
                    { style: cellStyle },
                    packageMode
                      ? React.createElement(
                          "span",
                          {
                            style: {
                              color: C.primary,
                              fontWeight: 700,
                              fontSize: 13,
                            },
                          },
                          "Included in package",
                        )
                      : React.createElement(
                          "div",
                          { style: { display: "grid", gap: 8, width: "100%" } },
                          React.createElement(MoneyInput, {
                            value: row.basePrice,
                            onChange: (value) =>
                              onUpdateRow(row.id, "basePrice", value),
                            currency: rowCurrency,
                          }),
                          currencyOptions.length > 0 &&
                            React.createElement(
                              "select",
                              {
                                value:
                                  (extractCurrencyId(row.currencyId) &&
                                    String(
                                      extractCurrencyId(row.currencyId),
                                    )) ||
                                  (extractCurrencyId(rowCurrency)
                                    ? String(extractCurrencyId(rowCurrency))
                                    : ""),
                                onChange: (event) =>
                                  onUpdateRow(
                                    row.id,
                                    "currencyId",
                                    event.target.value,
                                  ),
                                style: {
                                  ...inputStyle,
                                  height: 34,
                                  padding: "0 8px",
                                  fontWeight: 700,
                                  width: "100%",
                                },
                                title: "Line currency",
                              },
                              currencyOptions.map((option) =>
                                React.createElement(
                                  "option",
                                  { key: option.value, value: option.value },
                                  getCurrencyCode(
                                    resolveCurrency(option.value, currencies) ||
                                      option.label,
                                  ),
                                ),
                              ),
                            ),
                        ),
                  ),
                  React.createElement(
                    "div",
                    { style: cellStyle },
                    packageMode
                      ? React.createElement(
                          "span",
                          { style: { color: C.sub, fontSize: 13 } },
                          "0%",
                        )
                      : React.createElement(PercentInput, {
                          value: row.vat,
                          onChange: (value) =>
                            onUpdateRow(row.id, "vat", value),
                        }),
                  ),
                  React.createElement(
                    "div",
                    {
                      style: {
                        ...cellStyle,
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#1d4ed8",
                        background: "#f5f9ff",
                        gap: 2,
                      },
                    },
                    packageMode
                      ? React.createElement(
                          "span",
                          {
                            style: {
                              color: C.sub,
                              fontWeight: 500,
                              fontSize: 13,
                            },
                          },
                          "—",
                        )
                      : rowConversion?.canConvert
                        ? React.createElement(
                            React.Fragment,
                            null,
                            React.createElement(
                              "span",
                              null,
                              formatMoneyByCurrency(
                                rowConversion.sameCurrency
                                  ? amounts.totalAmount
                                  : rowConversion.totalAmount,
                                defaultCurrency,
                              ),
                            ),
                            !rowConversion.sameCurrency &&
                              React.createElement(
                                "span",
                                {
                                  style: {
                                    color: C.sub,
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                  },
                                },
                                `Gốc: ${formatMoneyByCurrency(amounts.totalAmount, rowCurrency)}`,
                              ),
                          )
                        : React.createElement(
                            React.Fragment,
                            null,
                            React.createElement(
                              "span",
                              null,
                              formatMoneyByCurrency(
                                amounts.totalAmount,
                                rowCurrency,
                              ),
                            ),
                            React.createElement(
                              "span",
                              {
                                style: {
                                  color: "#d48806",
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                },
                              },
                              `Thiếu tỷ giá → ${getCurrencyCode(defaultCurrency)}`,
                            ),
                          ),
                  ),
                  allowDelete &&
                    React.createElement(
                      "div",
                      { style: { ...cellStyle, textAlign: "center" } },
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: () => onDeleteRow(row.id),
                          style: {
                            border: `1px solid ${C.border}`,
                            background: "#fff",
                            color: C.danger,
                            borderRadius: 6,
                            width: 30,
                            height: 30,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontWeight: 800,
                          },
                        },
                        TrashIcon,
                      ),
                    ),
                );
              })
            : React.createElement(
                "div",
                {
                  style: {
                    padding: "30px 12px",
                    textAlign: "center",
                    color: C.sub,
                    fontSize: 13,
                    borderTop: `1px solid ${C.border}`,
                  },
                },
                'No services added. Click "Add row" to add contract services.',
              ),
          React.createElement(
            "div",
            {
              style: {
                borderTop: `2px solid ${C.border}`,
                padding: "14px 18px",
                background: C.bgSoft,
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  marginRight: "auto",
                  minWidth: 180,
                  paddingTop: 3,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                },
              },
              !packageMode &&
                (hasMixedCurrencies || needsConversion) &&
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => setBreakdownOpen(true),
                    style: {
                      border: `1px solid ${C.borderFocus}`,
                      background: "#eef4ff",
                      color: C.primary,
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: FONT,
                      cursor: "pointer",
                      alignSelf: "flex-start",
                    },
                  },
                  `Xem quy đổi tiền tệ (${financialSummary.groups.length} loại)`,
                ),
              !packageMode &&
                !canShowTotals &&
                React.createElement(
                  "div",
                  {
                    style: {
                      color: "#d48806",
                      background: "#fffbe6",
                      border: "1px solid #ffe58f",
                      borderRadius: 6,
                      padding: "8px 11px",
                      fontSize: 12,
                      fontFamily: FONT,
                      maxWidth: 320,
                    },
                  },
                  `Thiếu tỷ giá quy đổi (${formatMissingRatePairs(financialSummary.missing, defaultCurrency)}) — tổng hợp đồng chưa được cập nhật chính xác.`,
                ),
            ),
            React.createElement(
              "div",
              { style: summaryGridStyle },
              React.createElement(
                "div",
                { style: summaryValueStyle() },
                React.createElement(
                  "div",
                  { style: summaryLabelStyle },
                  "Subtotal",
                ),
                packageMode
                  ? React.createElement(MoneyInput, {
                      value: packageTotals.subTotal,
                      onChange: onPackageSubTotalChange,
                      currency: defaultCurrency,
                    })
                  : React.createElement(
                      "div",
                      { style: summaryAmountStyle(C.text) },
                      canShowTotals
                        ? formatMoneyByCurrency(
                            financialSummary.converted.subTotal,
                            defaultCurrency,
                          )
                        : "—",
                    ),
              ),
              React.createElement(
                "div",
                { style: summaryValueStyle() },
                React.createElement(
                  "div",
                  { style: summaryLabelStyle },
                  "VAT amount",
                ),
                React.createElement(
                  "div",
                  { style: summaryVatControlStyle },
                  React.createElement(
                    "div",
                    {
                      style: summaryAmountStyle(
                        "#d48806",
                        false,
                        "#fffbe6",
                        "#ffe58f",
                      ),
                    },
                    canShowTotals
                      ? formatMoneyByCurrency(
                          financialSummary.converted.vatAmount,
                          defaultCurrency,
                        )
                      : "—",
                  ),
                  packageMode &&
                    React.createElement(SuffixInput, {
                      value: packageVatRate,
                      onChange: onPackageVatRateChange,
                      suffix: "%",
                    }),
                ),
              ),
              React.createElement(
                "div",
                { style: summaryValueStyle() },
                React.createElement(
                  "div",
                  { style: summaryLabelStyle },
                  "Total amount",
                ),
                React.createElement(
                  "div",
                  {
                    style: summaryAmountStyle(
                      "#1d4ed8",
                      true,
                      "#eef4ff",
                      "#91caff",
                    ),
                  },
                  canShowTotals
                    ? formatMoneyByCurrency(
                        financialSummary.converted.totalAmount,
                        defaultCurrency,
                      )
                    : "—",
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    React.createElement(
      Modal,
      {
        title: "Quy đổi tiền tệ dịch vụ",
        open: breakdownOpen,
        onCancel: () => setBreakdownOpen(false),
        footer: React.createElement(
          AntButton,
          {
            type: "primary",
            onClick: () => setBreakdownOpen(false),
          },
          "Đóng",
        ),
        width: 720,
      },
      breakdownOpen &&
        React.createElement(
          "table",
          { style: { width: "100%", borderCollapse: "collapse" } },
          React.createElement(
            "thead",
            null,
            React.createElement(
              "tr",
              null,
              React.createElement("th", { style: modalThStyle() }, "Tiền tệ"),
              React.createElement(
                "th",
                { style: modalThStyle({ textAlign: "center" }) },
                "Số dòng",
              ),
              React.createElement(
                "th",
                { style: modalThStyle({ textAlign: "right" }) },
                "Tổng gốc",
              ),
              React.createElement(
                "th",
                { style: modalThStyle({ textAlign: "center" }) },
                "Tỷ giá",
              ),
              React.createElement(
                "th",
                { style: modalThStyle({ textAlign: "right" }) },
                "Quy đổi",
              ),
            ),
          ),
          React.createElement(
            "tbody",
            null,
            financialSummary.groups.map((group, idx) => {
              const sameBase = isSameCurrency(group.currency, defaultCurrency);
              const matched = sameBase
                ? { rate: 1 }
                : pickConversionRate(
                    exchangeRates,
                    group.currency,
                    defaultCurrency,
                  );
              const rate = matched?.rate || null;
              return React.createElement(
                "tr",
                { key: idx },
                React.createElement(
                  "td",
                  { style: modalTdStyle({ fontWeight: 700 }) },
                  getCurrencyCode(group.currency),
                ),
                React.createElement(
                  "td",
                  { style: modalTdStyle({ textAlign: "center" }) },
                  group.lineCount,
                ),
                React.createElement(
                  "td",
                  { style: modalTdStyle({ textAlign: "right" }) },
                  formatMoneyByCurrency(group.totalAmount, group.currency),
                ),
                React.createElement(
                  "td",
                  { style: modalTdStyle({ textAlign: "center" }) },
                  rate
                    ? rate.toLocaleString("en-US", { maximumFractionDigits: 6 })
                    : React.createElement(
                        "span",
                        { style: { color: C.danger } },
                        "Thiếu",
                      ),
                ),
                React.createElement(
                  "td",
                  {
                    style: modalTdStyle({
                      textAlign: "right",
                      fontWeight: 700,
                      color: rate ? "#1d4ed8" : C.danger,
                    }),
                  },
                  rate
                    ? formatMoneyByCurrency(
                        group.totalAmount * rate,
                        defaultCurrency,
                      )
                    : "—",
                ),
              );
            }),
          ),
        ),
    ),
  );
};

const PaymentScheduleSection = ({
  rows,
  baseAmount,
  currency = null,
  onAddRow,
  onDeleteRow,
  onUpdateRow,
}) => {
  const columns =
    "minmax(130px, 0.7fr) minmax(260px, 1.4fr) minmax(110px, 0.55fr) minmax(220px, 1.05fr) minmax(150px, 0.75fr) 52px";
  const headerStyle = {
    padding: "11px 14px",
    background: "#fbfcfd",
    color: C.sub,
    fontSize: 12,
    fontWeight: 700,
    borderBottom: `1px solid ${C.border}`,
  };
  const cellStyle = {
    padding: "12px 14px",
    minWidth: 0,
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    minHeight: 76,
    boxSizing: "border-box",
  };
  const iconButtonStyle = (disabled = false) => ({
    border: `1px solid ${C.border}`,
    background: "#fff",
    color: disabled ? "#cbd5e1" : C.danger,
    borderRadius: 6,
    width: 30,
    height: 30,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "default" : "pointer",
    fontWeight: 800,
  });
  return React.createElement(
    Section,
    { title: "Payment schedule" },
    React.createElement(
      "div",
      {
        style: {
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          overflow: "hidden",
          background: "#fff",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "10px 12px",
            background: C.bgSoft,
            borderBottom: `1px solid ${C.border}`,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            },
          },
          React.createElement(
            "span",
            { style: { fontSize: 13, color: C.sub } },
            `${rows.length} đợt`,
          ),
        ),
        AntButton
          ? React.createElement(
              AntButton,
              { type: "dashed", onClick: onAddRow },
              PlusIcon,
              " Add row",
            )
          : React.createElement(
              "button",
              {
                type: "button",
                onClick: onAddRow,
                style: {
                  border: `1px dashed ${C.primary}`,
                  background: "#fff",
                  color: C.primary,
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONT,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                },
              },
              PlusIcon,
              "Add row",
            ),
      ),
      React.createElement(
        "div",
        { style: { overflowX: "auto" } },
        React.createElement(
          "div",
          { style: { minWidth: 980 } },
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: columns } },
            React.createElement(
              "div",
              { style: headerStyle },
              "Đợt thanh toán",
            ),
            React.createElement("div", { style: headerStyle }, "Nội dung"),
            React.createElement(
              "div",
              { style: { ...headerStyle, textAlign: "center" } },
              "% thanh toán",
            ),
            React.createElement(
              "div",
              { style: headerStyle },
              "Ngày thanh toán",
            ),
            React.createElement(
              "div",
              { style: { ...headerStyle, textAlign: "center" } },
              "Số tiền",
            ),
            React.createElement("div", { style: headerStyle }, ""),
          ),
          rows.map((row, index) => {
            const disableDelete = rows.length <= 1;
            const amount = paymentScheduleRowAmount(row, baseAmount);
            return React.createElement(
              "div",
              {
                key: row.id,
                style: {
                  display: "grid",
                  gridTemplateColumns: columns,
                  alignItems: "stretch",
                },
              },
              React.createElement(
                "div",
                { style: cellStyle },
                React.createElement(TextInput, {
                  value: row.installment,
                  onChange: (value) =>
                    onUpdateRow(row.id, "installment", value),
                  placeholder: `Đợt ${index + 1}`,
                }),
              ),
              React.createElement(
                "div",
                { style: cellStyle },
                React.createElement(TextArea, {
                  value: row.content,
                  onChange: (value) => onUpdateRow(row.id, "content", value),
                  placeholder: "Ví dụ: 50% khi ký hợp đồng",
                  rows: 2,
                }),
              ),
              React.createElement(
                "div",
                { style: cellStyle },
                React.createElement(PercentInput, {
                  value: row.percentage,
                  onChange: (value) => onUpdateRow(row.id, "percentage", value),
                }),
              ),
              React.createElement(
                "div",
                { style: cellStyle },
                React.createElement(TextInput, {
                  type: "datetime-local",
                  value: row.paymentDate || "",
                  onChange: (value) =>
                    onUpdateRow(row.id, "paymentDate", value),
                }),
              ),
              React.createElement(
                "div",
                {
                  style: {
                    ...cellStyle,
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    color: C.text,
                    fontVariantNumeric: "tabular-nums",
                  },
                },
                formatMoneyByCurrency(
                  amount,
                  currency || defaultCurrencyObject(),
                ),
              ),
              React.createElement(
                "div",
                { style: { ...cellStyle, justifyContent: "center" } },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    disabled: disableDelete,
                    onClick: () => !disableDelete && onDeleteRow(row.id),
                    style: iconButtonStyle(disableDelete),
                  },
                  TrashIcon,
                ),
              ),
            );
          }),
        ),
      ),
    ),
  );
};

const RetainerScheduleSection = ({ form, onUpdate }) => {
  const nextPaymentDate = calcRetainerNextPaymentDate(
    form.paymentDate,
    form.retainerDuration,
    form.retainerRepeatUnit,
  );

  const readOnlyDateStyle = {
    ...inputStyle,
    minHeight: 40,
    display: "flex",
    alignItems: "center",
    background: C.bgSoft,
    color: nextPaymentDate ? C.text : C.sub,
    fontWeight: nextPaymentDate ? 700 : 400,
  };

  return React.createElement(
    Section,
    { title: "Retainer schedule" },
    React.createElement(
      "div",
      { style: gridStyle },
      React.createElement(
        Field,
        { label: "First payment" },
        React.createElement(TextInput, {
          type: "date",
          value: form.paymentDate,
          onChange: (value) => onUpdate("paymentDate", value),
        }),
      ),
      React.createElement(
        Field,
        {
          label: "Retainer duration",
          hint: "Leave blank for open-ended retainer",
        },
        React.createElement(SuffixInput, {
          value: form.retainerDuration,
          onChange: (value) => onUpdate("retainerDuration", moneyRaw(value)),
          placeholder: "Number of billing cycles",
          suffix: retainerDurationSuffix(
            form.retainerRepeatUnit,
            form.retainerDuration,
          ),
        }),
      ),
      React.createElement(
        Field,
        { label: "Retainer repeat" },
        React.createElement(SelectInput, {
          value: form.retainerRepeatUnit,
          onChange: (value) => onUpdate("retainerRepeatUnit", value),
          options: RETAINER_REPEAT_ANCHORS,
        }),
      ),
      React.createElement(
        Field,
        { label: "Next payment" },
        React.createElement(
          "div",
          { style: readOnlyDateStyle },
          nextPaymentDate || "Auto calculated after first payment and duration",
        ),
      ),
      React.createElement(
        Field,
        { label: "End date" },
        React.createElement(TextInput, {
          type: "date",
          value: form.endDate,
          onChange: (value) => onUpdate("endDate", value),
        }),
      ),
    ),
  );
};

const ContractCreateForm = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parentContracts, setParentContracts] = useState([]);
  const [companyServiceOptions, setCompanyServiceOptions] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [serviceLines, setServiceLines] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [manualServiceRows, setManualServiceRows] = useState([]);

  const [form, setForm] = useState({
    contractType: "byCase",
    status: "draft",
    feeModel: "fixed",
    billingCycle: "one_time",
    signedDate: todayInput(),
    endDate: "",
    paymentDate: "",
    paymentSchedule: [newPaymentScheduleRow(1)],
    retainerRepeatAnchorType: "month",
    retainerRepeatAnchorValue: "1",
    retainerRepeatInterval: "1",
    retainerRepeatUnit: "month",
    contractCode: "",
    contractName: "",
    customerId: "",
    internalCompanyId: "",
    lawyerId: "",
    templateId: "",
    quotationId: "",
    currencyId: "",
    pricingMode: "line",
    projectId: "",
    parentId: "",
    projectServiceId: "",
    quotationServiceId: "",
    contractKind: "main",
    monthlyFee: "",
    fixedAmount: "",
    hourlyRate: "",
    estimatedHours: "",
    successFee: "",
    retainerPeriod: "",
    retainerDuration: "",
    includedHours: "",
    overageHourlyRate: "",
    subTotal: "",
    vatAmount: "",
    totalAmount: "",
    scopeNote: "",
    description: "",
    isRequiredApproval: false,
    approvedById: "",
    packageVatRate: "8",
  });
  const isDirtyRef = useRef(false);
  const savingRef = useRef(false);
  const setSavingState = useCallback((value) => {
    savingRef.current = value;
    setSaving(value);
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
    closeCurrentPopup();
  }, []);
  const requestClose = useCallback(
    (nativeClose) => {
      if (savingRef.current) return;
      if (!isDirtyRef.current) {
        forceClose(nativeClose);
        return;
      }
      showDiscardConfirm(() => {
        forceClose(nativeClose);
      });
    },
    [forceClose],
  );

  useEffect(() => {
    return configureGuardedModalClose(requestClose);
  }, [requestClose]);

  const loadCaseServiceLines = async ({
    projectId,
    preselectedProjectServiceId,
    preselectedProjectServiceIds,
    knownProjectService,
    knownQuotationService,
    knownQuotation,
    knownProject,
    quotationId,
    knownQuotations = [],
  }) => {
    if (!projectId && !preselectedProjectServiceId) {
      setServiceLines([]);
      setSelectedServiceIds([]);
      return { lines: [], selectedIds: [] };
    }

    let projectServices = [];
    if (projectId) {
      try {
        const psRes = await ctx.api.request({
          url: "projectServices:list",
          params: {
            filter: JSON.stringify({
              projectId: { $eq: parseInt(projectId, 10) },
            }),
            pageSize: 500,
            sort: ["createdAt"],
            appends: ["services"],
          },
        });
        projectServices = psRes?.data?.data || [];
      } catch (error) {
        console.warn(
          "[ContractCreateForm] Could not load case services",
          error,
        );
      }
    }

    if (
      knownProjectService &&
      !projectServices.some(
        (item) => String(item.id) === String(knownProjectService.id),
      )
    ) {
      projectServices = [knownProjectService, ...projectServices];
    }
    if (!projectServices.length && preselectedProjectServiceId) {
      const fallbackProjectService = await fetchRecord(
        "projectServices:get",
        preselectedProjectServiceId,
        {
          appends: ["services"],
        },
      );
      if (fallbackProjectService) projectServices = [fallbackProjectService];
    }

    const quoteIds = Array.from(
      new Set(
        [
          quotationId,
          extractId(knownQuotation?.id),
          ...projectServices.map((item) =>
            firstId(item.quotationId, item.quotations),
          ),
          firstId(
            knownQuotationService?.quotationId,
            knownQuotationService?.quotations,
          ),
        ].filter(Boolean),
      ),
    );

    const quoteMap = {};
    if (knownQuotation?.id)
      quoteMap[String(knownQuotation.id)] = knownQuotation;
    knownQuotations.forEach((item) => {
      if (quoteIds.includes(extractId(item.id)))
        quoteMap[String(item.id)] = item;
    });
    await Promise.all(
      quoteIds.map(async (id) => {
        if (quoteMap[String(id)]) return;
        const detail = await fetchQuotationDetail(id);
        if (detail) quoteMap[String(id)] = detail;
      }),
    );

    let quotationServices = [];
    if (quoteIds.length) {
      try {
        const qsRes = await ctx.api.request({
          url: "quotationServices:list",
          params: {
            filter: JSON.stringify(
              quoteIds.length === 1
                ? { quotationId: { $eq: quoteIds[0] } }
                : { quotationId: { $in: quoteIds } },
            ),
            pageSize: 1000,
          },
        });
        quotationServices = qsRes?.data?.data || [];
      } catch (error) {
        console.warn(
          "[ContractCreateForm] Could not load quotation service lines",
          error,
        );
      }
    }
    if (
      knownQuotationService &&
      !quotationServices.some(
        (item) => String(item.id) === String(knownQuotationService.id),
      )
    ) {
      quotationServices = [knownQuotationService, ...quotationServices];
    }

    let contractServices = [];
    if (projectId) {
      try {
        const csRes = await ctx.api.request({
          url: "contractServices:list",
          params: {
            filter: JSON.stringify({
              projectId: { $eq: parseInt(projectId, 10) },
            }),
            pageSize: 1000,
            appends: ["contracts"],
          },
        });
        contractServices = csRes?.data?.data || [];
      } catch (error) {
        console.warn(
          "[ContractCreateForm] Could not load existing contract services",
          error,
        );
      }
    }

    const qSvcById = {};
    const qSvcByQuoteService = {};
    const qSvcByQuoteName = {};
    quotationServices.forEach((line) => {
      const lineId = extractId(line.id);
      const qId = firstId(line.quotationId, line.quotations);
      const serviceId = firstId(line.serviceId, line.service);
      const serviceName = String(line.serviceName || "")
        .toLowerCase()
        .trim();
      if (lineId) qSvcById[String(lineId)] = line;
      if (qId && serviceId) qSvcByQuoteService[`${qId}:${serviceId}`] = line;
      if (qId && serviceName) qSvcByQuoteName[`${qId}:${serviceName}`] = line;
    });

    const contractByProjectService = {};
    contractServices.forEach((line) => {
      const psId = firstId(line.projectServiceId, line.projectServices);
      if (psId && !contractByProjectService[String(psId)])
        contractByProjectService[String(psId)] = line;
    });
    let projectRecord =
      knownProject ||
      projects.find(
        (item) => String(extractId(item?.id)) === String(projectId),
      ) ||
      null;
    if (projectId && !projectRecord) {
      projectRecord = await fetchRecord("projects:get", projectId);
    }

    const lines = projectServices
      .map((projectService) => {
        const qSvcId = firstId(
          projectService.quotationServiceId,
          projectService.quotationServices,
        );
        const qId = firstId(
          projectService.quotationId,
          projectService.quotations,
          quotationId,
          knownQuotationService?.quotationId,
          knownQuotationService?.quotations,
          knownQuotation?.id,
        );
        const serviceId = firstId(
          projectService.serviceId,
          projectService.services,
        );
        const serviceName = String(
          projectService.serviceName ||
            projectService.services?.serviceName ||
            projectService.name ||
            "",
        )
          .toLowerCase()
          .trim();
        const quotationService =
          (qSvcId && qSvcById[String(qSvcId)]) ||
          (qId && serviceId && qSvcByQuoteService[`${qId}:${serviceId}`]) ||
          (qId && serviceName && qSvcByQuoteName[`${qId}:${serviceName}`]) ||
          null;
        return normalizeServiceLine({
          projectService,
          quotationService,
          quotation:
            quoteMap[
              String(
                firstId(
                  quotationService?.quotationId,
                  quotationService?.quotations,
                  qId,
                ),
              )
            ],
          contractService: contractByProjectService[String(projectService.id)],
          project: projectRecord,
        });
      })
      .filter(Boolean);

    const selectable = lines.filter((line) => !line.locked);
    const rawPreselected =
      preselectedProjectServiceIds || preselectedProjectServiceId;
    const preselectedIds = [];
    if (rawPreselected) {
      if (Array.isArray(rawPreselected)) {
        preselectedIds.push(...rawPreselected.map(String));
      } else {
        const idStr = String(rawPreselected);
        if (idStr.includes(",")) {
          preselectedIds.push(
            ...idStr
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          );
        } else {
          preselectedIds.push(idStr);
        }
      }
    }
    const sourcePackageMode =
      isPackageSource(knownQuotation) || selectable.some(isPackageSource);
    const selectedIds =
      sourcePackageMode && selectable.length
        ? selectable.map((line) => String(line.projectServiceId))
        : preselectedIds.length &&
            preselectedIds.some((id) =>
              selectable.some((line) => String(line.projectServiceId) === id),
            )
          ? preselectedIds.filter((id) =>
              selectable.some((line) => String(line.projectServiceId) === id),
            )
          : selectable.map((line) => String(line.projectServiceId));

    setServiceLines(lines);
    setSelectedServiceIds(selectedIds);
    return { lines, selectedIds };
  };

  useEffect(() => {
    Promise.all([
      fetchAll("customers:list"),
      fetchAll("internalCompany:list"),
      fetchAll("lawyers:list"),
      fetchAll("template:list"),
      fetchAll("quotations:list"),
      fetchAll("projects:list", { appends: ["customers"] }),
      fetchAll("contracts:list", { appends: ["customers"] }),
      fetchAll("companyServices:list", {
        appends: ["service", "services"],
      }),
      fetchAll("services:list"),
      fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
    ]).then(
      async ([
        custs,
        comps,
        laws,
        tmps,
        quots,
        projs,
        conts,
        coSvcs,
        svcCatalog,
        currs,
      ]) => {
        const selectableLawyers = filterSelectableLawyers(laws);
        const normalizedCurrencies = Array.isArray(currs) ? currs : [];
        const defaultCurrencyId = extractCurrencyId(
          findDefaultCurrency(normalizedCurrencies)?.id,
        );
        setCustomers(custs);
        setCompanies(comps);
        setLawyers(selectableLawyers);
        setTemplates(tmps);
        setQuotations(quots);
        setProjects(projs);
        setParentContracts(conts);
        setCompanyServiceOptions(
          enrichCompanyServiceOptions(coSvcs, svcCatalog, normalizedCurrencies),
        );
        setCurrencies(normalizedCurrencies);
        if (defaultCurrencyId) {
          setForm((prev) => ({
            ...prev,
            currencyId: prev.currencyId || String(defaultCurrencyId),
          }));
        }

        const popupParams = getPopupParams();
        const popupRecord = unwrapContextRecord(
          popupParams.record ||
            popupParams.sourceRecord ||
            popupParams.parentItem ||
            popupParams.currentRecord ||
            null,
        );
        console.log(
          "[ContractCreateForm] popupParams:",
          safeJsonStringify(popupParams),
        );
        console.log("[ContractCreateForm] ctx exists:", !!ctx);
        const inputArgs = getViewInputArgs();
        const collectionName = String(
          inputArgs.collectionName ||
            popupParams.collectionName ||
            popupParams.sourceCollectionName ||
            ctx.collection?.name ||
            "",
        );
        const urlPathname = getUrlPathname();
        const urlFilterByTk = firstId(getUrlFilterByTk());
        let urlQuotationRecord = null;
        let urlProjectRecord = null;
        const directRecord = unwrapContextRecord(
          ctx.record || ctx.popup?.record || popupRecord || null,
        );
        const directRecordKind = getContextRecordKind(
          directRecord || {},
          collectionName,
        );
        const directRecordIsProject = isProjectRecord(
          directRecord || {},
          collectionName,
        );
        let routeLooksLikeQuotation =
          isQuotationCollection(collectionName) ||
          isQuotationCollection(popupParams.sourceCollectionName) ||
          isQuotationCollection(urlPathname) ||
          !!popupParams.sourceQuotationId ||
          !!popupParams.quotationId ||
          directRecordKind === "quotation";
        const shouldUseUrlContext =
          !directRecord && !popupRecord && urlFilterByTk;
        if (urlFilterByTk && routeLooksLikeQuotation) {
          urlQuotationRecord = await fetchRecord(
            "quotations:get",
            urlFilterByTk,
            {},
            { quiet: true },
          );
        }
        if (
          urlFilterByTk &&
          !urlQuotationRecord &&
          !directRecordIsProject &&
          !isProjectCollection(collectionName) &&
          !isProjectServiceCollection(collectionName) &&
          !popupParams.sourceProjectId &&
          !popupParams.projectId &&
          !popupParams.caseId &&
          !popupParams.sourceCustomerId &&
          !popupParams.customerId &&
          directRecordKind !== "customer"
        ) {
          const probedQuotation = await fetchRecord(
            "quotations:get",
            urlFilterByTk,
            {},
            { quiet: true },
          );
          if (
            extractId(probedQuotation?.id) &&
            looksLikeQuotationRecord(probedQuotation, "quotations")
          ) {
            urlQuotationRecord = probedQuotation;
            routeLooksLikeQuotation = true;
          }
        }
        if (
          shouldUseUrlContext &&
          !urlQuotationRecord &&
          !popupParams.sourceProjectId &&
          !popupParams.projectId &&
          !popupParams.caseId
        ) {
          urlProjectRecord = await fetchRecord(
            "projects:get",
            urlFilterByTk,
            {},
            { quiet: true },
          );
        }
        if (
          shouldUseUrlContext &&
          !urlQuotationRecord &&
          !urlProjectRecord &&
          !popupParams.sourceQuotationId &&
          !popupParams.sourceCustomerId &&
          !popupParams.quotationId
        ) {
          urlQuotationRecord = await fetchRecord(
            "quotations:get",
            urlFilterByTk,
          );
        }
        const directRecordId = extractId(directRecord?.id);
        const directRecordIsSameQuotation =
          urlQuotationRecord &&
          directRecordId &&
          String(directRecordId) === String(urlFilterByTk) &&
          looksLikeQuotationRecord(directRecord, collectionName);
        const mergedUrlQuotationRecord =
          urlQuotationRecord &&
          routeLooksLikeQuotation &&
          (!directRecordId || String(directRecordId) === String(urlFilterByTk))
            ? directRecordIsSameQuotation
              ? { ...urlQuotationRecord, ...directRecord }
              : urlQuotationRecord
            : null;
        const record =
          mergedUrlQuotationRecord ||
          directRecord ||
          urlProjectRecord ||
          urlQuotationRecord ||
          {};
        const contextRecordId = extractId(record?.id);
        const inputFilterId = firstId(
          inputArgs.filterByTk,
          popupParams.filterByTk,
        );
        const urlFilterIsQuotation =
          !!extractId(urlQuotationRecord?.id) &&
          (String(extractId(urlQuotationRecord?.id)) ===
            String(urlFilterByTk || "") ||
            String(extractId(urlQuotationRecord?.id)) ===
              String(inputFilterId || ""));
        const customerLookupFilterId = firstId(
          urlFilterIsQuotation ? null : inputFilterId,
          popupParams.sourceCustomerId,
          popupParams.customerId,
          inputArgs.customerId,
          inputArgs.params?.customerId,
          urlFilterIsQuotation ? null : urlFilterByTk,
        );
        const inputSourceId = firstId(inputArgs.sourceId, popupParams.sourceId);
        const rawContextRecordKind = getContextRecordKind(
          record,
          collectionName,
        );
        const recordIsProject = isProjectRecord(record, collectionName);
        const recordProjectId = recordIsProject ? firstId(record.id) : null;
        let recordCustomerMatch =
          contextRecordId && !recordIsProject
            ? custs.find(
                (customer) =>
                  String(extractId(customer?.id)) === String(contextRecordId),
              )
            : null;
        let filterCustomerMatch =
          customerLookupFilterId &&
          !recordIsProject &&
          !isProjectCollection(collectionName) &&
          !isProjectServiceCollection(collectionName)
            ? custs.find(
                (customer) =>
                  String(extractId(customer?.id)) ===
                  String(customerLookupFilterId),
              )
            : null;
        if (
          !rawContextRecordKind &&
          !recordIsProject &&
          contextRecordId &&
          !recordCustomerMatch
        ) {
          recordCustomerMatch = await fetchAnyRecord(
            ["customers:get", "contacts:get", "contact:get"],
            contextRecordId,
          );
        }
        if (
          !rawContextRecordKind &&
          !recordIsProject &&
          customerLookupFilterId &&
          String(customerLookupFilterId) !== String(contextRecordId || "") &&
          !filterCustomerMatch &&
          !isProjectCollection(collectionName) &&
          !isProjectServiceCollection(collectionName)
        ) {
          filterCustomerMatch = await fetchAnyRecord(
            ["customers:get", "contacts:get", "contact:get"],
            customerLookupFilterId,
          );
        }
        const matchedCustomerId =
          !rawContextRecordKind && !recordIsProject
            ? firstId(recordCustomerMatch?.id, filterCustomerMatch?.id)
            : null;
        const matchedCustomerDetail = matchedCustomerId
          ? await fetchAnyRecord(
              ["customers:get", "contacts:get", "contact:get"],
              matchedCustomerId,
            )
          : null;
        const fetchedContextCustomer =
          rawContextRecordKind === "customer" && contextRecordId
            ? await fetchAnyRecord(
                ["customers:get", "contacts:get", "contact:get"],
                contextRecordId,
              )
            : null;
        const matchedContextCustomer =
          recordCustomerMatch || filterCustomerMatch || matchedCustomerDetail
            ? {
                ...(recordCustomerMatch || filterCustomerMatch || {}),
                ...(matchedCustomerDetail || {}),
              }
            : null;
        const contextCustomerRecord =
          rawContextRecordKind === "customer"
            ? { ...record, ...(fetchedContextCustomer || {}) }
            : matchedContextCustomer;
        const contextRecordKind =
          rawContextRecordKind || (contextCustomerRecord ? "customer" : "");
        const contextQuotationId =
          contextRecordKind === "quotation"
            ? firstId(contextRecordId, inputFilterId)
            : null;
        const contextCustomerId =
          contextRecordKind === "customer"
            ? firstId(
                contextCustomerRecord?.id,
                contextRecordId,
                customerLookupFilterId,
              )
            : null;
        const contextCompanyId =
          contextRecordKind === "customer"
            ? recordInternalCompanyId(contextCustomerRecord || record)
            : null;
        const contextLawyerId =
          contextRecordKind === "customer"
            ? recordLawyerId(contextCustomerRecord || record)
            : null;
        debugContractContext("raw", {
          collectionName,
          recordId: contextRecordId,
          recordKeys: Object.keys(record || {})
            .slice(0, 30)
            .join(","),
          rawContextRecordKind,
          inferredContextRecordKind: contextRecordKind,
          contextQuotationId,
          inputFilterId,
          customerLookupFilterId,
          inputSourceId,
          urlPathname,
          urlFilterByTk,
          urlFilterIsQuotation,
          routeLooksLikeQuotation,
          mergedUrlQuotationRecordId: extractId(mergedUrlQuotationRecord?.id),
          urlProjectRecordId: extractId(urlProjectRecord?.id),
          urlQuotationRecordId: extractId(urlQuotationRecord?.id),
          sourceProjectId: extractId(popupParams.sourceProjectId),
          sourceCustomerId: extractId(popupParams.sourceCustomerId),
          matchedCustomerByRecordId: extractId(recordCustomerMatch?.id),
          matchedCustomerByFilterByTk: extractId(filterCustomerMatch?.id),
          matchedCustomerDetailId: extractId(matchedCustomerDetail?.id),
          fetchedContextCustomerId: extractId(fetchedContextCustomer?.id),
        });
        const filterAsProjectId =
          isProjectCollection(collectionName) ||
          recordIsProject ||
          (!contextRecordKind && !isProjectServiceCollection(collectionName))
            ? firstId(
                inputFilterId,
                urlProjectRecord?.id,
                popupParams.sourceProjectId,
              )
            : null;
        const filterAsProjectServiceId = isProjectServiceCollection(
          collectionName,
        )
          ? inputFilterId
          : null;
        const contextSeed = {
          quotationId: firstId(
            contextQuotationId,
            popupParams.sourceQuotationId,
            popupParams.quotationId,
            urlQuotationRecord?.id,
            record.quotationId,
            record.quotations,
            popupParams.quotations,
            inputArgs.quotationId,
            inputArgs.params?.quotationId,
          ),
          projectId: firstId(
            record.projectId,
            record.project,
            record.cases,
            recordProjectId,
            popupParams.projectId,
            popupParams.caseId,
            inputArgs.projectId,
            inputArgs.caseId,
            inputArgs.params?.projectId,
            inputArgs.params?.caseId,
            filterAsProjectId,
          ),
          parentId: firstId(
            contextRecordKind === "quotation" ? null : record.parentId,
            contextRecordKind === "quotation" ? null : record.parent,
            popupParams.parentId,
            popupParams.parentContractId,
            inputArgs.parentId,
            inputArgs.parentContractId,
            inputArgs.params?.parentId,
          ),
          projectServiceId: firstId(
            record.projectServiceId,
            record.projectServices,
            popupParams.projectServiceId,
            inputArgs.projectServiceId,
            inputArgs.params?.projectServiceId,
            inputSourceId,
            filterAsProjectServiceId,
          ),
          quotationServiceId: firstId(
            record.quotationServiceId,
            record.quotationServices,
            popupParams.quotationServiceId,
            inputArgs.quotationServiceId,
            inputArgs.params?.quotationServiceId,
          ),
          serviceId: firstId(
            record.serviceId,
            record.services,
            popupParams.serviceId,
            inputArgs.serviceId,
            inputArgs.params?.serviceId,
          ),
          customerId: firstId(
            contextCustomerId,
            record.customerId,
            record.customers,
            popupParams.customerId,
            inputArgs.customerId,
            inputArgs.params?.customerId,
          ),
          internalCompanyId: firstId(
            contextCompanyId,
            record.internalCompanyId,
            record.internalCompany,
            popupParams.internalCompanyId,
            inputArgs.internalCompanyId,
            inputArgs.params?.internalCompanyId,
          ),
          lawyerId: firstId(
            contextLawyerId,
            record.lawyerId,
            popupParams.lawyerId,
            inputArgs.lawyerId,
            inputArgs.params?.lawyerId,
          ),
        };
        debugContractContext("seed", contextSeed);
        let currentQuotationId = contextSeed.quotationId;
        let popupQuotation = currentQuotationId
          ? await fetchQuotationDetail(currentQuotationId)
          : null;
        let initialProjectId = contextSeed.projectId;
        const currentParentId = contextSeed.parentId;
        const currentProjectServiceId = contextSeed.projectServiceId;
        let currentQuotationServiceId = contextSeed.quotationServiceId;
        const popupContractMode = String(
          popupParams.contractKind ||
            popupParams.contractMode ||
            popupParams.mode ||
            "",
        ).toLowerCase();
        const currentContractKind =
          popupContractMode === "appendix" ||
          popupContractMode === "sub" ||
          popupContractMode === "sub-contract" ||
          popupParams.isMainContract === false ||
          popupParams.isMainContract === "false" ||
          currentParentId
            ? "appendix"
            : "main";
        let popupProjectService = null;
        if (currentProjectServiceId) {
          popupProjectService = await fetchRecord(
            "projectServices:get",
            currentProjectServiceId,
            {
              appends: ["services"],
            },
          );
        }
        let popupQuotationService = null;
        currentQuotationServiceId =
          currentQuotationServiceId ||
          firstId(
            popupProjectService?.quotationServiceId,
            popupProjectService?.quotationServices,
          );
        if (currentQuotationServiceId) {
          popupQuotationService = await fetchRecord(
            "quotationServices:get",
            currentQuotationServiceId,
            {
            },
          );
        }
        currentQuotationId =
          currentQuotationId ||
          firstId(
            popupProjectService?.quotationId,
            popupProjectService?.quotations,
            popupQuotationService?.quotationId,
            popupQuotationService?.quotations,
          );
        if (!popupQuotation && currentQuotationId) {
          popupQuotation = await fetchQuotationDetail(currentQuotationId);
        }
        initialProjectId =
          initialProjectId ||
          firstId(
            popupProjectService?.projectId,
            popupProjectService?.project,
            popupProjectService?.projects,
            popupQuotation?.projectId,
            popupQuotation?.project,
            popupQuotation?.cases,
          );
        if (!popupQuotationService && currentQuotationId) {
          try {
            const qsRes = await ctx.api.request({
              url: "quotationServices:list",
              params: {
                filter: JSON.stringify({
                  quotationId: { $eq: parseInt(currentQuotationId, 10) },
                }),
                pageSize: 500,
              },
            });
            const qLines = qsRes?.data?.data || [];
            const serviceIdForMatch =
              extractId(popupProjectService?.serviceId) ||
              extractId(popupProjectService?.services) ||
              contextSeed.serviceId;
            popupQuotationService =
              qLines.find(
                (line) => String(line.id) === String(currentQuotationServiceId),
              ) ||
              qLines.find(
                (line) =>
                  String(
                    firstId(line.projectServiceId, line.projectServices),
                  ) === String(currentProjectServiceId),
              ) ||
              qLines.find((line) => {
                const lineServiceId =
                  extractId(line.serviceId) || extractId(line.service);
                return (
                  lineServiceId &&
                  String(lineServiceId) === String(serviceIdForMatch)
                );
              }) ||
              (qLines.length === 1 ? qLines[0] : null);
          } catch (error) {
            console.warn(
              "[ContractCreateForm] Could not preload quotation service",
              error,
            );
          }
        }

        const resolvedQuotationServiceId =
          extractId(popupQuotationService?.id) || currentQuotationServiceId;
        const resolvedProjectId =
          initialProjectId ||
          firstId(
            popupProjectService?.projectId,
            popupProjectService?.project,
            popupProjectService?.projects,
            popupQuotationService?.projectId,
            popupQuotationService?.project,
            popupQuotationService?.cases,
          );
        const popupProject =
          recordIsProject &&
          String(recordProjectId) === String(resolvedProjectId)
            ? record
            : resolvedProjectId
              ? await fetchRecord("projects:get", resolvedProjectId)
              : null;
        const quotationParentId = firstId(
          popupQuotation?.parentId,
          popupQuotation?.parent,
          popupQuotation?.parentQuotation,
        );
        const resolvedParentId =
          currentParentId ||
          firstId(
            popupProject?.contractId,
            popupProject?.contract,
            popupProject?.contracts,
          );
        const resolvedContractKind =
          currentContractKind === "appendix" ||
          resolvedParentId ||
          quotationParentId
            ? "appendix"
            : "main";

        const resolvedCustomerId =
          contextSeed.customerId ||
          firstId(
            popupProject?.customerId,
            popupProject?.customer,
            popupProject?.customers,
          ) ||
          quotationCustomerId(popupQuotation);
        const resolvedCompanyId =
          contextSeed.internalCompanyId ||
          firstId(
            popupProject?.internalCompanyId,
            popupProject?.internalCompany,
          ) ||
          quotationInternalCompanyId(popupQuotation);
        const resolvedLawyerId =
          contextSeed.lawyerId ||
          firstId(popupProject?.lawyerId, popupProject?.lawyer) ||
          firstId(popupProject?.assignees) ||
          quotationLawyerId(popupQuotation);

        console.log(
          "[ContractCreateForm] resolved preloaded fields:",
          JSON.stringify({
            resolvedCustomerId,
            resolvedCompanyId,
            resolvedLawyerId,
          }),
        );
        const projectCustomerRecord =
          relationRecord(popupProject?.customer, resolvedCustomerId) ||
          relationRecord(popupProject?.customers, resolvedCustomerId);
        const projectCompanyRecord =
          relationRecord(popupProject?.internalCompany, resolvedCompanyId) ||
          relationRecord(popupProject?.internalCompanies, resolvedCompanyId);
        const projectLawyerRecord =
          relationRecord(popupProject?.lawyer, resolvedLawyerId) ||
          relationRecord(popupProject?.lawyers, resolvedLawyerId) ||
          relationRecord(popupProject?.assignees, resolvedLawyerId) ||
          relationRecord(popupProject?.projectManager, resolvedLawyerId);
        const resolvedContextCustomerRecord =
          contextRecordKind === "customer" && resolvedCustomerId
            ? contextCustomerRecord || record
            : null;
        const contextCompanyRecord =
          relationRecord(record?.internalCompany, resolvedCompanyId) ||
          relationRecord(record?.internalCompanies, resolvedCompanyId);
        const contextLawyerRecord =
          relationRecord(record?.lawyer, resolvedLawyerId) ||
          relationRecord(record?.lawyers, resolvedLawyerId) ||
          relationRecord(record?.assignedLawyer, resolvedLawyerId);
        const serviceName =
          popupQuotationService?.serviceName ||
          popupProjectService?.serviceName ||
          popupProjectService?.services?.serviceName ||
          popupProjectService?.name ||
          popupParams.serviceName ||
          "";
        const serviceDescription =
          popupQuotationService?.description ||
          popupProjectService?.description ||
          popupProjectService?.services?.description ||
          popupParams.description ||
          "";
        const serviceAmounts = resolveServiceAmounts(
          popupQuotationService,
          popupProjectService,
          popupParams,
        );
        const serviceSubTotal = serviceAmounts.subTotal;
        const serviceVatAmount = serviceAmounts.vatAmount;
        const serviceTotalAmount = serviceAmounts.totalAmount;
        const serviceLineResult = await loadCaseServiceLines({
          projectId: resolvedProjectId,
          preselectedProjectServiceId: currentProjectServiceId,
          preselectedProjectServiceIds:
            popupParams.projectServiceIds || popupParams.projectServiceId,
          knownProjectService: popupProjectService,
          knownQuotationService: popupQuotationService,
          knownQuotation: popupQuotation,
          knownProject: popupProject,
          quotationId: currentQuotationId,
          knownQuotations: quots,
        });
        const selectedServiceLines = serviceLineResult.lines.filter((line) =>
          serviceLineResult.selectedIds.includes(String(line.projectServiceId)),
        );
        const selectedTotals = sumServiceLines(selectedServiceLines);
        const quotationAmounts = resolveServiceAmounts({
          subTotal: popupQuotation?.subTotal,
          vatAmount: popupQuotation?.vatAmount,
          totalAmount:
            popupQuotation?.totalAmount || popupQuotation?.grandTotal,
        });
        const hasDirectServiceAmount = !!(
          serviceSubTotal ||
          serviceVatAmount ||
          serviceTotalAmount
        );
        const selectedPackageSource =
          selectedServiceLines.find(isPackageSource) ||
          popupQuotationService ||
          popupProjectService ||
          popupQuotation;
        const quotationPackageMode =
          isPackageSource(popupQuotation) ||
          selectedServiceLines.some(isPackageSource) ||
          isPackageSource(popupQuotationService) ||
          isPackageSource(popupProjectService);
        const quotationPackageAmounts = quotationPackageMode
          ? resolvePackageAmounts(
              selectedPackageSource,
              popupQuotation,
              popupQuotationService,
              popupProjectService,
            )
          : null;
        const effectiveSubTotal = quotationPackageMode
          ? quotationPackageAmounts.subTotal
          : selectedServiceLines.length
            ? selectedTotals.subTotal
            : hasDirectServiceAmount
              ? serviceSubTotal
              : quotationAmounts.subTotal;
        const effectiveVatAmount = quotationPackageMode
          ? quotationPackageAmounts.vatAmount
          : selectedServiceLines.length
            ? selectedTotals.vatAmount
            : hasDirectServiceAmount
              ? serviceVatAmount
              : quotationAmounts.vatAmount;
        const effectiveTotalAmount = quotationPackageMode
          ? quotationPackageAmounts.totalAmount
          : selectedServiceLines.length
            ? selectedTotals.totalAmount
            : hasDirectServiceAmount
              ? serviceTotalAmount
              : quotationAmounts.totalAmount;
        // The quotation's own header currency is the authoritative "main
        // currency" for the contract form — a specific service/project line
        // can carry a stale currencyId (e.g. left over from before the
        // quotation's currency was changed), so it must not take priority
        // over the quotation header when both are present.
        const contextCurrencyId =
          getRecordCurrencyId(popupQuotation) ||
          getRecordCurrencyId(popupQuotationService) ||
          getRecordCurrencyId(popupProjectService) ||
          getRecordCurrencyId(popupProject) ||
          getRecordCurrencyId(selectedServiceLines[0]);
        const [
          resolvedCustomerRecord,
          resolvedCompanyRecord,
          resolvedLawyerRecord,
        ] = await Promise.all([
          resolvedCustomerId &&
          !resolvedContextCustomerRecord &&
          !projectCustomerRecord &&
          !hasRecordId(custs, resolvedCustomerId)
            ? fetchAnyRecord(
                ["customers:get", "contacts:get", "contact:get"],
                resolvedCustomerId,
              )
            : Promise.resolve(null),
          resolvedCompanyId &&
          !contextCompanyRecord &&
          !projectCompanyRecord &&
          !hasRecordId(comps, resolvedCompanyId)
            ? fetchAnyRecord(
                ["internalCompany:get", "internalCompanies:get"],
                resolvedCompanyId,
              )
            : Promise.resolve(null),
          resolvedLawyerId &&
          !contextLawyerRecord &&
          !projectLawyerRecord &&
          !hasRecordId(selectableLawyers, resolvedLawyerId)
            ? fetchAnyRecord(
                ["lawyers:get", "employees:get", "users:get"],
                resolvedLawyerId,
              )
            : Promise.resolve(null),
        ]);
        const fallbackQuotationOption =
          popupQuotation ||
          (currentQuotationId
            ? {
                id: currentQuotationId,
                quotationCode: `Quotation #${currentQuotationId}`,
              }
            : null);
        const fallbackProjectOption =
          popupProject ||
          (resolvedProjectId
            ? { id: resolvedProjectId, caseCode: `Case #${resolvedProjectId}` }
            : null);
        const fallbackCustomerOption =
          resolvedContextCustomerRecord ||
          projectCustomerRecord ||
          resolvedCustomerRecord ||
          (resolvedCustomerId ? { id: resolvedCustomerId } : null);
        const fallbackCompanyOption =
          contextCompanyRecord ||
          projectCompanyRecord ||
          resolvedCompanyRecord ||
          (resolvedCompanyId ? { id: resolvedCompanyId } : null);
        const fallbackLawyerOption =
          contextLawyerRecord ||
          projectLawyerRecord ||
          resolvedLawyerRecord ||
          (resolvedLawyerId ? { id: resolvedLawyerId } : null);
        const safeFallbackLawyerOption =
          filterSelectableLawyers([fallbackLawyerOption]).filter(Boolean)[0] ||
          null;
        const contractTitlePrefix =
          resolvedContractKind === "appendix" ? "Phụ lục" : "Hợp đồng";
        const defaultContractName = serviceName
          ? `${contractTitlePrefix} - ${serviceName}`
          : popupQuotation
            ? `${contractTitlePrefix} - ${quotationLabel(popupQuotation)}`
            : "";

        debugContractContext("resolved", {
          resolvedCustomerId,
          resolvedCompanyId,
          resolvedLawyerId,
          resolvedProjectId,
          currentQuotationId,
          currentProjectServiceId,
          resolvedQuotationServiceId,
          resolvedParentId,
          resolvedContractKind,
          fallbackCustomerOptionId: extractId(fallbackCustomerOption?.id),
          fallbackCompanyOptionId: extractId(fallbackCompanyOption?.id),
          fallbackLawyerOptionId: extractId(safeFallbackLawyerOption?.id),
        });

        setQuotations((prev) => mergeRecordById(prev, fallbackQuotationOption));
        setProjects((prev) => mergeRecordById(prev, fallbackProjectOption));
        setCustomers((prev) => mergeRecordById(prev, fallbackCustomerOption));
        setCompanies((prev) => mergeRecordById(prev, fallbackCompanyOption));
        setLawyers((prev) => mergeRecordById(prev, safeFallbackLawyerOption));

        debugContractContext("setForm", {
          customerId: resolvedCustomerId ? String(resolvedCustomerId) : "",
          internalCompanyId: resolvedCompanyId ? String(resolvedCompanyId) : "",
          lawyerId: resolvedLawyerId ? String(resolvedLawyerId) : "",
          projectId: resolvedProjectId ? String(resolvedProjectId) : "",
          quotationId: currentQuotationId ? String(currentQuotationId) : "",
          parentId: resolvedParentId ? String(resolvedParentId) : "",
        });

        setForm((prev) => ({
          ...prev,
          customerId: resolvedCustomerId
            ? String(resolvedCustomerId)
            : prev.customerId,
          internalCompanyId: resolvedCompanyId
            ? String(resolvedCompanyId)
            : prev.internalCompanyId,
          lawyerId: resolvedLawyerId ? String(resolvedLawyerId) : prev.lawyerId,
          quotationId: currentQuotationId
            ? String(currentQuotationId)
            : prev.quotationId,
          currencyId: contextCurrencyId
            ? String(contextCurrencyId)
            : prev.currencyId,
          pricingMode: quotationPackageMode ? "package" : "line",
          packageVatRate: quotationPackageMode
            ? String(
                quotationPackageAmounts?.vatRate !== undefined &&
                  quotationPackageAmounts?.vatRate !== null &&
                  quotationPackageAmounts?.vatRate !== ""
                  ? quotationPackageAmounts.vatRate
                  : prev.packageVatRate !== undefined &&
                      prev.packageVatRate !== null &&
                      prev.packageVatRate !== ""
                    ? prev.packageVatRate
                    : "8",
              )
            : prev.packageVatRate,
          projectId: resolvedProjectId
            ? String(resolvedProjectId)
            : prev.projectId,
          parentId: resolvedParentId ? String(resolvedParentId) : prev.parentId,
          projectServiceId: currentProjectServiceId
            ? String(currentProjectServiceId)
            : prev.projectServiceId,
          quotationServiceId: resolvedQuotationServiceId
            ? String(resolvedQuotationServiceId)
            : prev.quotationServiceId,
          contractKind: resolvedContractKind,
          contractName: defaultContractName || prev.contractName,
          fixedAmount: effectiveTotalAmount
            ? String(effectiveTotalAmount)
            : prev.fixedAmount,
          subTotal: effectiveSubTotal
            ? String(effectiveSubTotal)
            : prev.subTotal,
          vatAmount:
            effectiveSubTotal || effectiveTotalAmount
              ? String(effectiveVatAmount)
              : prev.vatAmount,
          totalAmount: effectiveTotalAmount
            ? String(effectiveTotalAmount)
            : prev.totalAmount,
          scopeNote: serviceDescription || prev.scopeNote,
        }));

        setLoading(false);
      },
    );
  }, []);

  const setF = (key, value) => {
    markDirty();
    setForm((prev) => deriveForm(prev, { [key]: value }));
  };

  const refreshCustomers = useCallback(async () => {
    const list = await fetchAll("customers:list");
    setCustomers(list);
    return list;
  }, []);

  const refreshQuotations = useCallback(async () => {
    const list = await fetchAll("quotations:list");
    setQuotations(list);
    return list;
  }, []);

  const refreshTemplates = useCallback(async () => {
    const list = await fetchAll("template:list");
    setTemplates(list);
    return list;
  }, []);

  const openCreatePopup = useCallback(
    async (viewKey, refreshFn, params = {}, options = {}) => {
      const { beforeIds, onCreated } = options;
      const beforeIdSet = beforeIds ? new Set(beforeIds.map(String)) : null;
      const expectedCollection = QUICK_CREATE_COLLECTION_BY_VIEW[viewKey];
      const targetRefreshBlockUid =
        QUICK_CREATE_REFRESH_BLOCK_UID_BY_VIEW[viewKey];
      const quickCreateRequestId =
        params.quickCreateRequestId ||
        `${viewKey}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const sourceInput = getRuntimeInput();
      const popupParams = {
        ...params,
        quickCreateRequestId,
        quickCreateViewKey: viewKey,
        quickCreateSource: "ContractCreateForm",
        quickCreateTargetCollection: expectedCollection,
        sourceBlockUid:
          params.sourceBlockUid ||
          sourceInput.blockUid ||
          sourceInput.dataBlockUid,
        targetBlockUid: params.targetBlockUid || targetRefreshBlockUid,
        dataBlockUid: params.dataBlockUid || targetRefreshBlockUid,
        refreshBlockUids: compact([
          params.refreshBlockUid,
          ...(Array.isArray(params.refreshBlockUids)
            ? params.refreshBlockUids
            : []),
          targetRefreshBlockUid,
          CONTRACT_REFRESH_BLOCK_UID,
        ]),
      };
      let selectedCreatedId = null;
      const cleanupFns = [];
      const cleanupQuickCreateListener = () => {
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
      const runRefreshAndSelect = async (
        forcedId = null,
        forcedRecord = null,
      ) => {
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
            const createdCandidates = updated.filter(
              (item) => !beforeIdSet.has(String(item.id)),
            );
            // If more than one record is new (e.g. another user created something
            // concurrently), prefer the most recently created one.
            const created =
              createdCandidates.length > 1
                ? createdCandidates.reduce((latest, item) =>
                    new Date(item.createdAt || 0) >
                    new Date(latest.createdAt || 0)
                      ? item
                      : latest,
                  )
                : createdCandidates[0];
            if (created) selectCreated(created.id, created, updated);
          }
        } catch (error) {
          console.warn(
            "[ContractCreateForm] quick-create refresh failed",
            error,
          );
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
          const createdId = extractId(detail.id || detail.record?.id);
          if (!createdId) return;
          runRefreshAndSelect(String(createdId), detail.record || null);
        };
        window.addEventListener(
          QUICK_CREATE_CREATED_EVENT,
          handleQuickCreateCreated,
        );
        cleanupFns.push(() =>
          window.removeEventListener(
            QUICK_CREATE_CREATED_EVENT,
            handleQuickCreateCreated,
          ),
        );
      }

      const quickCreateBridge = getQuickCreateBridge();
      if (onCreated && expectedCollection && quickCreateBridge?.subscribe) {
        cleanupFns.push(
          quickCreateBridge.subscribe((detail = {}) => {
            if (!isExpectedCreatedDetail(detail)) return;
            const createdId = extractId(detail.id || detail.record?.id);
            if (!createdId) return;
            runRefreshAndSelect(String(createdId), detail.record || null);
          }),
        );
      }

      const opened = await openPopupViewByUid(viewKey, popupParams);
      if (opened && refreshFn) {
        [1200, 3500, 7000, 15000, 30000, 60000].forEach((delay) => {
          setTimeout(runRefreshAndSelect, delay);
        });
        setTimeout(cleanupQuickCreateListener, 65000);
      } else {
        cleanupQuickCreateListener();
      }
    },
    [],
  );

  useEffect(() => {
    debugContractContext("form-state", {
      customerId: form.customerId,
      internalCompanyId: form.internalCompanyId,
      lawyerId: form.lawyerId,
      projectId: form.projectId,
      quotationId: form.quotationId,
      parentId: form.parentId,
    });
  }, [
    form.customerId,
    form.internalCompanyId,
    form.lawyerId,
    form.projectId,
    form.quotationId,
    form.parentId,
  ]);

  const toggleApproval = () => {
    setForm((p) => ({
      ...p,
      isRequiredApproval: !p.isRequiredApproval,
      approvedById: !p.isRequiredApproval ? p.approvedById : "",
    }));
  };

  const selectedQuotation = useMemo(
    () => quotations.find((q) => String(q.id) === String(form.quotationId)),
    [quotations, form.quotationId],
  );
  const selectedCurrency = useMemo(
    () =>
      findCurrencyById(currencies, form.currencyId) ||
      findDefaultCurrency(currencies),
    [currencies, form.currencyId],
  );
  const currencyOptions = useMemo(
    () =>
      currencies.map((currency) => ({
        value: String(currency.id),
        label: currencySelectLabel(currency),
      })),
    [currencies],
  );

  const selectedContractServiceLines = useMemo(
    () =>
      serviceLines.filter((line) =>
        selectedServiceIds.includes(String(line.projectServiceId)),
      ),
    [serviceLines, selectedServiceIds],
  );

  const filteredServiceOptions = useMemo(
    () =>
      form.internalCompanyId
        ? companyServiceOptions.filter(
            (item) =>
              String(serviceOptionCompanyId(item)) ===
              String(form.internalCompanyId),
          )
        : [],
    [companyServiceOptions, form.internalCompanyId],
  );

  const applyServiceSelection = (nextIds, lines = serviceLines) => {
    const uniqueIds = Array.from(
      new Set(nextIds.map((id) => String(id)).filter(Boolean)),
    );
    setSelectedServiceIds(uniqueIds);
    const selectedLines = lines.filter((line) =>
      uniqueIds.includes(String(line.projectServiceId)),
    );
    const totals = sumServiceLines(selectedLines);
    const packageSource =
      selectedLines.find(isPackageSource) || selectedQuotation;
    const packageMode =
      selectedLines.some(isPackageSource) || isPackageSource(selectedQuotation);
    const packageAmounts = packageMode
      ? resolvePackageAmounts(packageSource, selectedQuotation)
      : null;
    const firstLine = selectedLines[0] || null;
    const firstCurrencyId =
      getRecordCurrencyId(firstLine) || getRecordCurrencyId(selectedQuotation);
    setForm((prev) => ({
      ...prev,
      projectServiceId: firstLine
        ? String(firstLine.projectServiceId)
        : prev.projectServiceId,
      quotationServiceId: firstLine?.quotationServiceId
        ? String(firstLine.quotationServiceId)
        : prev.quotationServiceId,
      quotationId: firstLine?.quotationId
        ? String(firstLine.quotationId)
        : prev.quotationId,
      currencyId: firstCurrencyId ? String(firstCurrencyId) : prev.currencyId,
      pricingMode: packageMode ? "package" : "line",
      packageVatRate: packageMode
        ? String(
            packageAmounts.vatRate !== undefined &&
              packageAmounts.vatRate !== null &&
              packageAmounts.vatRate !== ""
              ? packageAmounts.vatRate
              : prev.packageVatRate !== undefined &&
                  prev.packageVatRate !== null &&
                  prev.packageVatRate !== ""
                ? prev.packageVatRate
                : "8",
          )
        : prev.packageVatRate,
      fixedAmount: selectedLines.length
        ? String(packageMode ? packageAmounts.totalAmount : totals.totalAmount)
        : prev.fixedAmount,
      subTotal: selectedLines.length
        ? String(packageMode ? packageAmounts.subTotal : totals.subTotal)
        : prev.subTotal,
      vatAmount: selectedLines.length
        ? String(packageMode ? packageAmounts.vatAmount : totals.vatAmount)
        : prev.vatAmount,
      totalAmount: selectedLines.length
        ? String(packageMode ? packageAmounts.totalAmount : totals.totalAmount)
        : prev.totalAmount,
    }));
  };

  const toggleServiceSelection = (line) => {
    if (!line || line.locked) return;
    const id = String(line.projectServiceId);
    const nextIds = selectedServiceIds.includes(id)
      ? selectedServiceIds.filter((item) => item !== id)
      : [...selectedServiceIds, id];
    applyServiceSelection(nextIds);
  };

  const selectAllAvailableServices = () => {
    applyServiceSelection(
      serviceLines
        .filter((line) => !line.locked)
        .map((line) => line.projectServiceId),
    );
  };

  const clearServiceSelection = () => {
    applyServiceSelection([]);
  };

  const selectedCaseServiceLines = selectedContractServiceLines.length
    ? selectedContractServiceLines
    : serviceLines.filter((line) => !line.locked);

  const caseServiceEditorRows = useMemo(
    () =>
      selectedCaseServiceLines.map((line) => ({
        ...line,
        id: String(line.projectServiceId),
        serviceId: line.serviceId ? String(line.serviceId) : "",
        serviceName: line.serviceName || "",
        serviceType: line.serviceType || "",
        description: line.description || "",
        currencyId: getRecordCurrencyId(line)
          ? String(getRecordCurrencyId(line))
          : "",
        basePrice: line.basePrice ? String(line.basePrice) : "",
        vat:
          line.vat !== undefined && line.vat !== null ? String(line.vat) : "0",
      })),
    [selectedCaseServiceLines],
  );

  const updateCaseServiceLineRow = (rowId, field, value) => {
    let nextLines = [];
    setServiceLines((prev) => {
      nextLines = prev.map((line) => {
        if (String(line.projectServiceId) !== String(rowId)) return line;
        const next = { ...line, [field]: value };
        if (field === "basePrice" || field === "vat") {
          const basePrice =
            field === "basePrice" ? parseNum(value) : parseNum(line.basePrice);
          const vat = field === "vat" ? parseNum(value) : parseNum(line.vat);
          const amounts = resolveServiceAmounts({
            basePrice,
            quantity: line.quantity || 1,
            vat,
          });
          return {
            ...next,
            basePrice: amounts.basePrice,
            vat: amounts.vat,
            subTotal: amounts.subTotal,
            vatAmount: amounts.vatAmount,
            totalAmount: amounts.totalAmount,
          };
        }
        return next;
      });
      return nextLines;
    });
    setTimeout(() => applyServiceSelection(selectedServiceIds, nextLines), 0);
  };

  const removeCaseServiceLineRow = (rowId) => {
    applyServiceSelection(
      selectedServiceIds.filter((id) => String(id) !== String(rowId)),
    );
  };

  const applyQuotationToForm = async (
    quotationId,
    quotationOverride = null,
  ) => {
    if (!quotationId) {
      setF("quotationId", "");
      return;
    }

    const listRecord =
      quotationOverride ||
      quotations.find((q) => String(q.id) === String(quotationId)) ||
      {};
    const detailRecord = await fetchQuotationDetail(quotationId);
    const quotation = { ...listRecord, ...(detailRecord || {}) };
    const customerId = quotationCustomerId(quotation);
    const internalCompanyId = quotationInternalCompanyId(quotation);
    const lawyerId = quotationLawyerId(quotation);
    const quotationParentId =
      extractId(quotation.parentId) ||
      extractId(quotation.parent) ||
      extractId(quotation.parentQuotation);
    const popupParams = getPopupParams();
    const targetProjectServiceId =
      form.projectServiceId ||
      (popupParams.projectServiceId
        ? String(popupParams.projectServiceId)
        : "");
    const targetQuotationServiceId =
      form.quotationServiceId ||
      (popupParams.quotationServiceId
        ? String(popupParams.quotationServiceId)
        : "");
    const targetServiceId = popupParams.serviceId
      ? String(popupParams.serviceId)
      : "";

    let projectService = null;
    let targetLine = null;
    try {
      if (targetProjectServiceId) {
        const psRes = await ctx.api.request({
          url: "projectServices:get",
          params: {
            filterByTk: targetProjectServiceId,
            appends: ["services"],
          },
        });
        projectService = unwrapRecord(psRes);
      }
      const qsRes = await ctx.api.request({
        url: "quotationServices:list",
        params: {
          filter: JSON.stringify({
            quotationId: { $eq: parseInt(quotationId, 10) },
          }),
          pageSize: 500,
        },
      });
      const qLines = qsRes?.data?.data || [];
      targetLine =
        qLines.find(
          (line) => String(line.id) === String(targetQuotationServiceId),
        ) ||
        qLines.find((line) => {
          const qServiceId =
            extractId(line.serviceId) || extractId(line.service);
          const psServiceId =
            extractId(projectService?.serviceId) ||
            extractId(projectService?.services);
          return (
            qServiceId &&
            (String(qServiceId) === String(psServiceId) ||
              String(qServiceId) === String(targetServiceId))
          );
        }) ||
        (qLines.length === 1 ? qLines[0] : null) ||
        null;
    } catch (error) {
      console.warn(
        "[ContractCreateForm] Could not load quotation service context",
        error,
      );
    }

    const targetProjectId =
      extractId(projectService?.projectId) ||
      extractId(projectService?.project) ||
      extractId(projectService?.projects) ||
      extractId(quotation.projectId) ||
      extractId(quotation.project) ||
      extractFirstId(quotation.cases) ||
      extractId(popupParams.projectId) ||
      extractId(popupParams.caseId);
    const amountSource = targetLine || quotation;
    const lineAmounts = resolveServiceAmounts(
      targetLine,
      projectService,
      popupParams,
    );
    const quotationAmounts = resolveServiceAmounts({
      basePrice: firstPresent(amountSource, ["basePrice"]),
      quantity: firstPresent(amountSource, ["quantity"]),
      vat: firstPresent(amountSource, ["vat"]),
      subTotal: firstPresent(amountSource, ["subTotal"]),
      vatAmount: firstPresent(amountSource, ["vatAmount"]),
      totalAmount: firstPresent(amountSource, ["totalAmount", "grandTotal"]),
    });
    const packageMode =
      isPackageSource(targetLine) ||
      isPackageSource(projectService) ||
      isPackageSource(quotation);
    const packageAmounts = packageMode
      ? resolvePackageAmounts(targetLine, projectService, quotation)
      : null;
    const amountPatch =
      targetLine && !packageMode
        ? {
            fixedAmount: lineAmounts.totalAmount
              ? String(lineAmounts.totalAmount)
              : "",
            subTotal: lineAmounts.subTotal ? String(lineAmounts.subTotal) : "",
            vatAmount:
              lineAmounts.subTotal || lineAmounts.totalAmount
                ? String(lineAmounts.vatAmount)
                : "",
            totalAmount: lineAmounts.totalAmount
              ? String(lineAmounts.totalAmount)
              : "",
            scopeNote:
              targetLine.description || projectService?.description || "",
          }
        : {
            fixedAmount: (
              packageMode
                ? packageAmounts.totalAmount
                : quotationAmounts.totalAmount
            )
              ? String(
                  packageMode
                    ? packageAmounts.totalAmount
                    : quotationAmounts.totalAmount,
                )
              : "",
            subTotal: (
              packageMode ? packageAmounts.subTotal : quotationAmounts.subTotal
            )
              ? String(
                  packageMode
                    ? packageAmounts.subTotal
                    : quotationAmounts.subTotal,
                )
              : "",
            vatAmount: (
              packageMode
                ? packageAmounts.subTotal || packageAmounts.totalAmount
                : quotationAmounts.subTotal || quotationAmounts.totalAmount
            )
              ? String(
                  packageMode
                    ? packageAmounts.vatAmount
                    : quotationAmounts.vatAmount,
                )
              : "",
            totalAmount: (
              packageMode
                ? packageAmounts.totalAmount
                : quotationAmounts.totalAmount
            )
              ? String(
                  packageMode
                    ? packageAmounts.totalAmount
                    : quotationAmounts.totalAmount,
                )
              : "",
            scopeNote:
              targetLine?.description || projectService?.description || "",
          };
    // Same reasoning as the mount-effect contextCurrencyId above: the
    // quotation header's own currency is the source of truth for the
    // contract's main currency — a matched service line can carry a stale
    // currencyId, so it must not override the quotation header.
    const contextCurrencyId =
      getRecordCurrencyId(quotation) ||
      getRecordCurrencyId(targetLine) ||
      getRecordCurrencyId(projectService);

    const isInitialOrSameQuotation =
      !form.quotationId || String(quotationId) === String(form.quotationId);
    const preselectedIds = isInitialOrSameQuotation
      ? selectedServiceIds.length
        ? selectedServiceIds
        : popupParams.projectServiceIds || popupParams.projectServiceId
      : null;

    if (targetProjectId) {
      await loadCaseServiceLines({
        projectId: targetProjectId,
        preselectedProjectServiceId: targetProjectServiceId || null,
        preselectedProjectServiceIds: preselectedIds,
        knownProjectService: projectService,
        knownQuotation: quotation,
        knownProject: projects.find(
          (item) => String(extractId(item?.id)) === String(targetProjectId),
        ),
        quotationId,
        knownQuotations: [quotation],
      });
    }

    setForm((prev) =>
      deriveForm(prev, {
        quotationId: String(quotationId),
        pricingMode: packageMode ? "package" : "line",
        packageVatRate: packageMode
          ? String(
              packageAmounts.vatRate !== undefined &&
                packageAmounts.vatRate !== null &&
                packageAmounts.vatRate !== ""
                ? packageAmounts.vatRate
                : prev.packageVatRate !== undefined &&
                    prev.packageVatRate !== null &&
                    prev.packageVatRate !== ""
                  ? prev.packageVatRate
                  : "8",
            )
          : prev.packageVatRate,
        customerId: customerId ? String(customerId) : prev.customerId,
        internalCompanyId: internalCompanyId
          ? String(internalCompanyId)
          : prev.internalCompanyId,
        lawyerId: lawyerId ? String(lawyerId) : prev.lawyerId,
        currencyId: contextCurrencyId
          ? String(contextCurrencyId)
          : prev.currencyId,
        projectId: targetProjectId ? String(targetProjectId) : prev.projectId,
        projectServiceId: targetProjectServiceId || prev.projectServiceId,
        quotationServiceId:
          targetQuotationServiceId ||
          (extractId(targetLine?.id)
            ? String(extractId(targetLine.id))
            : prev.quotationServiceId),
        contractKind: quotationParentId ? "appendix" : prev.contractKind,
        contractName:
          prev.contractName ||
          (targetLine?.serviceName
            ? `Hợp đồng - ${targetLine.serviceName}`
            : prev.contractName),
        ...amountPatch,
      }),
    );
  };

  const handleCustomerChange = (customerId) => {
    setForm((prev) => {
      const currentQuotation = quotations.find(
        (q) => String(q.id) === String(prev.quotationId),
      );
      const currentQuotationCustomerId = quotationCustomerId(currentQuotation);
      const keepQuotation =
        !customerId ||
        !prev.quotationId ||
        !currentQuotationCustomerId ||
        String(currentQuotationCustomerId) === String(customerId);

      return {
        ...prev,
        customerId,
        quotationId: keepQuotation ? prev.quotationId : "",
      };
    });
  };

  const handleProjectChange = async (projectId) => {
    setForm((prev) => ({
      ...prev,
      projectId,
      projectServiceId: "",
      quotationServiceId: "",
    }));
    const result = await loadCaseServiceLines({
      projectId: projectId ? parseInt(projectId, 10) : null,
      preselectedProjectServiceId: null,
      knownProject: projects.find(
        (item) => String(extractId(item?.id)) === String(projectId),
      ),
      knownQuotations: quotations,
    });
    applyServiceSelection(result.selectedIds, result.lines);
  };

  const isRetainer = form.contractType === "retainer";
  const isAppendixContract = useMemo(() => {
    const popupParams = getPopupParams();
    const popupMode = String(
      popupParams.contractMode || popupParams.mode || "",
    ).toLowerCase();
    const popupIsMain = popupParams.isMainContract;
    const quotationParentId =
      extractId(selectedQuotation?.parentId) ||
      extractId(selectedQuotation?.parent) ||
      extractId(selectedQuotation?.parentQuotation);

    return (
      popupMode === "appendix" ||
      popupMode === "sub" ||
      popupMode === "sub-contract" ||
      popupIsMain === false ||
      popupIsMain === "false" ||
      !!form.parentId ||
      !!quotationParentId
    );
  }, [form.parentId, selectedQuotation?.id, selectedQuotation?.parentId]);
  const requestedCodePrefix = String(
    getPopupParams().codePrefix || "",
  ).toUpperCase();
  const autoCodePrefix =
    isAppendixContract || requestedCodePrefix === "PL" ? "PL" : "CT";
  const visibleFeeFields = getFeeVisibility(form);
  const setRetainerField = (key, value) => {
    markDirty();
    setForm((prev) => {
      const patch = { [key]: value };
      if (key === "retainerDuration") {
        patch.retainerRepeatInterval = value || "1";
      }
      if (key === "retainerRepeatUnit") {
        patch.retainerRepeatAnchorType = value;
        patch.retainerRepeatAnchorValue = "1";
        patch.retainerRepeatInterval = prev.retainerDuration || "1";
      }
      return deriveForm(prev, patch);
    });
  };
  const paymentScheduleRows =
    form.paymentSchedule && form.paymentSchedule.length
      ? form.paymentSchedule
      : [newPaymentScheduleRow(1)];
  const isMultiplePayments = form.billingCycle === "multiple_payments";
  const showPaymentSchedule = !isRetainer && isMultiplePayments;
  const showGenericPaymentDates = !isRetainer && !isMultiplePayments;
  const paymentBaseAmount = parseNum(form.totalAmount);

  const handlePaymentDateChange = (value) => setF("paymentDate", value);
  const syncPaymentScheduleRows = (rows) => {
    setForm((prev) => {
      return deriveForm(prev, { paymentSchedule: rows });
    });
  };

  const addPaymentScheduleRow = () => {
    setForm((prev) => {
      const currentRows =
        prev.paymentSchedule && prev.paymentSchedule.length
          ? prev.paymentSchedule
          : [newPaymentScheduleRow(1)];
      return {
        ...prev,
        paymentSchedule: [
          ...currentRows,
          newPaymentScheduleRow(currentRows.length + 1),
        ],
      };
    });
  };

  const deletePaymentScheduleRow = (rowId) => {
    const nextRows = paymentScheduleRows.filter((row) => row.id !== rowId);
    syncPaymentScheduleRows(
      nextRows.length ? nextRows : [newPaymentScheduleRow(1)],
    );
  };

  const updatePaymentScheduleRow = (rowId, field, value) => {
    const nextRows = paymentScheduleRows.map((row) =>
      row.id === rowId
        ? {
            ...row,
            [field]:
              field === "amount" || field === "percentage"
                ? moneyRaw(value)
                : value,
            ...(field === "percentage"
              ? {
                  amount: String(
                    calcInstallmentAmount(value, paymentBaseAmount) || "",
                  ),
                }
              : {}),
          }
        : row,
    );
    syncPaymentScheduleRows(nextRows);
  };

  const handleContractTypeChange = (value) => {
    setForm((prev) => {
      const nextFeeModel = feeModelForType(value, prev.feeModel);
      const nextBillingCycle =
        value === "retainer"
          ? prev.billingCycle === "one_time"
            ? "multiple_payments"
            : prev.billingCycle
          : prev.billingCycle === "monthly"
            ? "one_time"
            : prev.billingCycle;

      return deriveForm(prev, {
        contractType: value,
        feeModel: nextFeeModel,
        billingCycle: nextBillingCycle,
        retainerRepeatAnchorType:
          value === "retainer"
            ? prev.retainerRepeatUnit || "month"
            : prev.retainerRepeatAnchorType,
        retainerRepeatAnchorValue:
          value === "retainer"
            ? prev.retainerRepeatAnchorValue || "1"
            : prev.retainerRepeatAnchorValue,
        retainerRepeatInterval:
          value === "retainer"
            ? prev.retainerDuration || "1"
            : prev.retainerRepeatInterval,
        retainerRepeatUnit:
          value === "retainer"
            ? prev.retainerRepeatUnit || "month"
            : prev.retainerRepeatUnit,
        fixedAmount: prev.fixedAmount,
        successFee: value === "retainer" ? "" : prev.successFee,
        monthlyFee: "",
        retainerDuration: value === "retainer" ? prev.retainerDuration : "",
        includedHours: "",
        overageHourlyRate: "",
      });
    });
  };

  useEffect(() => {
    if (!selectedQuotation) return;
    applyQuotationToForm(selectedQuotation.id);
  }, [selectedQuotation?.id, form.contractType]);

  const customerOptions = customers.map((item) => ({
    value: String(item.id),
    label: customerLabel(item),
    subLabel: customerOverview(item),
  }));

  const companyOptions = companies.map((item) => ({
    value: String(item.id),
    label: companyLabel(item),
  }));

  const lawyerOptions = lawyers.map((item) => ({
    value: String(item.id),
    label: lawyerLabel(item),
  }));

  const templateOptions = templates.map((item) => ({
    value: String(item.id),
    label: labelOf(item, ["name", "templateName", "title"], "Template"),
  }));

  const filteredQuotations = useMemo(
    () =>
      form.customerId
        ? quotations.filter(
            (item) =>
              String(item.id) === String(form.quotationId) ||
              String(quotationCustomerId(item)) === String(form.customerId),
          )
        : quotations,
    [quotations, form.customerId, form.quotationId],
  );

  const quotationOptions = filteredQuotations.map((item) => ({
    value: String(item.id),
    label: quotationLabel(item),
    subLabel: quotationOverview(item, customers),
  }));

  const projectOptions = projects.map((item) => ({
    value: String(item.id),
    label: caseLabel(item),
    subLabel: relatedCustomerName(item, customers)
      ? `Customer: ${relatedCustomerName(item, customers)}`
      : "",
  }));

  const manualRowsTotals = useMemo(
    () => manualServiceRowsTotals(manualServiceRows),
    [manualServiceRows],
  );

  const packageTotals = useMemo(() => {
    const subTotal = parseNum(form.subTotal || form.fixedAmount);
    const vatRate = parseNum(form.packageVatRate);
    const vatAmount = roundAmount((subTotal * vatRate) / 100);
    return {
      subTotal: roundAmount(subTotal),
      vatAmount,
      totalAmount: roundAmount(subTotal) + vatAmount,
    };
  }, [form.subTotal, form.fixedAmount, form.packageVatRate]);

  const syncManualLineTotals = (rows) => {
    const totals = manualServiceRowsTotals(rows);
    setForm((prev) => ({
      ...prev,
      pricingMode: "line",
      fixedAmount: totals.totalAmount ? String(totals.totalAmount) : "",
      subTotal: totals.subTotal ? String(totals.subTotal) : "",
      vatAmount: totals.vatAmount ? String(totals.vatAmount) : "",
      totalAmount: totals.totalAmount ? String(totals.totalAmount) : "",
    }));
  };

  const syncPackageTotals = (subTotalValue, vatRateValue) => {
    const subTotal = parseNum(subTotalValue);
    const vatRate = parseNum(vatRateValue);
    const vatAmount = roundAmount((subTotal * vatRate) / 100);
    const totalAmount = roundAmount(subTotal + vatAmount);
    setForm((prev) => ({
      ...prev,
      pricingMode: "package",
      packageVatRate: String(vatRateValue ?? ""),
      fixedAmount: totalAmount ? String(totalAmount) : "",
      subTotal: subTotal ? String(subTotal) : "",
      vatAmount: vatAmount ? String(vatAmount) : "",
      totalAmount: totalAmount ? String(totalAmount) : "",
    }));
  };

  const handleManualPricingModeChange = (mode) => {
    const nextMode = mode === "package" ? "package" : "line";
    const activeRows = serviceLines.length
      ? selectedCaseServiceLines
      : manualServiceRows;
    const activeTotals = serviceLines.length
      ? sumServiceLines(activeRows)
      : manualRowsTotals;
    if (nextMode === "package") {
      const packageSource = activeRows.find(isPackageSource);
      const sourcePackage = packageSource
        ? resolvePackageAmounts(packageSource)
        : null;
      const sourceSubTotal =
        sourcePackage?.subTotal ||
        activeTotals.subTotal ||
        parseNum(form.subTotal);
      const sourceVatRate =
        sourcePackage?.vatRate !== undefined &&
        sourcePackage?.vatRate !== null &&
        sourcePackage?.vatRate !== ""
          ? sourcePackage.vatRate
          : form.packageVatRate !== undefined &&
              form.packageVatRate !== null &&
              form.packageVatRate !== ""
            ? form.packageVatRate
            : "8";
      syncPackageTotals(
        sourceSubTotal ? String(sourceSubTotal) : "",
        sourceVatRate,
      );
      return;
    }
    if (serviceLines.length) {
      setForm((prev) => ({
        ...prev,
        pricingMode: "line",
        fixedAmount: activeTotals.totalAmount
          ? String(activeTotals.totalAmount)
          : "",
        subTotal: activeTotals.subTotal ? String(activeTotals.subTotal) : "",
        vatAmount: activeTotals.vatAmount ? String(activeTotals.vatAmount) : "",
        totalAmount: activeTotals.totalAmount
          ? String(activeTotals.totalAmount)
          : "",
      }));
      return;
    }
    syncManualLineTotals(manualServiceRows);
  };

  const addManualServiceRow = () => {
    setManualServiceRows((prev) => [
      ...prev,
      {
        ...newManualServiceRow(),
        currencyId: extractCurrencyId(selectedCurrency)
          ? String(extractCurrencyId(selectedCurrency))
          : "",
      },
    ]);
  };

  const deleteManualServiceRow = (rowId) => {
    setManualServiceRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
  };

  const updateManualServiceRow = (rowId, field, value) => {
    setManualServiceRows((prev) => {
      const next = prev.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row,
      );
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
  };

  const selectManualService = (rowId, serviceId, serviceOverride = null) => {
    const service =
      serviceOverride ||
      filteredServiceOptions.find(
        (item) => String(serviceOptionServiceId(item)) === String(serviceId),
      );
    if (serviceId && !service) {
      message.warning("Selected service was not found in catalog.");
      return;
    }
    if (
      serviceId &&
      manualServiceRows.some(
        (row) =>
          row.id !== rowId && String(row.serviceId) === String(serviceId),
      )
    ) {
      message.warning("This service is already selected in another row.");
      return;
    }
    setManualServiceRows((prev) => {
      const next = prev.map((row) => {
        if (row.id !== rowId) return row;
        if (!serviceId) {
          return {
            ...row,
            serviceId: "",
            serviceName: "",
            serviceType: "",
            description: "",
            currencyId: extractCurrencyId(selectedCurrency)
              ? String(extractCurrencyId(selectedCurrency))
              : "",
            basePrice: "",
          };
        }
        const serviceCurrency = currencyFromRecord(
          service,
          currencies,
          selectedCurrency,
        );
        const serviceCurrencyId =
          extractCurrencyId(serviceCurrency) ||
          getRecordCurrencyId(service) ||
          extractCurrencyId(selectedCurrency);
        if (
          !extractCurrencyId(serviceCurrency) &&
          !getRecordCurrencyId(service)
        ) {
          console.warn(
            "[ContractCreateForm] Could not resolve a real currencyId for this service (falling back to contract currency). Raw service fields:",
            {
              serviceId: extractId(service?.id),
              serviceKeys: Object.keys(service || {}),
              currency: service?.currency,
              currencies: service?.currencies,
              currencyId: service?.currencyId,
              currencyCode: service?.currencyCode,
              defaultCurrencyId: service?.defaultCurrencyId,
              defaultCurrency: service?.defaultCurrency,
              basePrice: service?.basePrice,
              price: service?.price,
              unitPrice: service?.unitPrice,
              resolvedServiceCurrency: serviceCurrency,
              availableCurrencies: (currencies || []).map((c) => ({
                id: c?.id,
                code: getCurrencyCode(c),
              })),
            },
          );
        }
        return {
          ...row,
          serviceId: String(serviceId),
          serviceName: serviceCatalogName(service),
          serviceType: serviceCatalogType(service),
          description: row.description || serviceCatalogDescription(service),
          currencyId: serviceCurrencyId
            ? String(serviceCurrencyId)
            : row.currencyId,
          basePrice:
            form.pricingMode === "package"
              ? ""
              : String(serviceCatalogPrice(service) || ""),
          vat: form.pricingMode === "package" ? "0" : row.vat || "8",
        };
      });
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
  };

  const createManualContractServiceDraft = (rowId, data) => {
    const serviceName = String(data?.serviceName || "").trim();
    if (!serviceName) {
      message.warning("Please enter service name.");
      return null;
    }
    const existsInCatalog = filteredServiceOptions.find(
      (item) =>
        normalizeSearch(serviceCatalogName(item)) ===
        normalizeSearch(serviceName),
    );
    if (existsInCatalog) {
      message.warning(
        "This service already exists in the catalog. Please select it instead.",
      );
      return null;
    }
    const existsInRows = manualServiceRows.find(
      (row) =>
        row.id !== rowId &&
        normalizeSearch(row.serviceName) === normalizeSearch(serviceName),
    );
    if (existsInRows) {
      message.warning("This service is already added in another row.");
      return null;
    }
    if (parseNum(data?.basePrice) <= 0) {
      message.warning("Please enter unit price greater than 0.");
      return null;
    }
    if (currencyOptions.length && !extractCurrencyId(data?.currencyId)) {
      message.warning("Please select service currency.");
      return null;
    }

    const draft = {
      serviceName,
      serviceType: String(data?.serviceType || "").trim() || null,
      currencyId:
        getRecordCurrencyId(data) ||
        extractCurrencyId(selectedCurrency) ||
        null,
      basePrice: String(parseNum(data?.basePrice) || ""),
      description: String(data?.description || "").trim(),
    };

    setManualServiceRows((prev) => {
      const next = prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          serviceId: "",
          serviceName: draft.serviceName,
          serviceType: draft.serviceType || "",
          description: draft.description,
          currencyId: draft.currencyId
            ? String(draft.currencyId)
            : row.currencyId,
          basePrice: draft.basePrice,
          quantity: row.quantity || "1",
          vat: row.vat || "8",
        };
      });
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
    message.success("Service row added.");
    return draft;
  };

  const parentContractOptions = parentContracts
    .filter((item) => String(item.id) !== String(ctx.record?.id || ""))
    .map((item) => ({
      value: String(item.id),
      label: contractLabel(item),
      subLabel: relatedCustomerName(item, customers)
        ? `Customer: ${relatedCustomerName(item, customers)}`
        : "",
    }));

  const buildContractServicePayload = async ({
    contractId,
    projectServiceId,
    quotationServiceId,
    projectId,
    serviceLine,
    submitCurrencyId,
  }) => {
    if (!contractId || !projectServiceId) return null;

    const popupParams = getPopupParams();
    const projectService = await fetchRecord(
      "projectServices:get",
      projectServiceId,
      {
        appends: ["services"],
      },
    );

    let quotationService = null;
    const directQuotationServiceId =
      quotationServiceId ||
      extractId(serviceLine?.quotationServiceId) ||
      (form.quotationServiceId ? parseInt(form.quotationServiceId, 10) : null);
    if (directQuotationServiceId) {
      quotationService = await fetchRecord(
        "quotationServices:get",
        directQuotationServiceId,
        {
        },
      );
    } else if (form.quotationId) {
      try {
        const serviceIdForMatch =
          extractId(projectService?.serviceId) ||
          extractId(projectService?.services) ||
          extractId(popupParams.serviceId);
        const qsRes = await ctx.api.request({
          url: "quotationServices:list",
          params: {
            filter: JSON.stringify({
              quotationId: { $eq: parseInt(form.quotationId, 10) },
            }),
            pageSize: 500,
          },
        });
        quotationService =
          (qsRes?.data?.data || []).find((line) => {
            const lineServiceId =
              extractId(line.serviceId) || extractId(line.service);
            return (
              lineServiceId &&
              String(lineServiceId) === String(serviceIdForMatch)
            );
          }) || null;
      } catch (error) {
        console.warn(
          "[ContractCreateForm] Could not find quotation service for contract line",
          error,
        );
      }
    }

    const serviceId =
      extractId(quotationService?.serviceId) ||
      extractId(quotationService?.service) ||
      extractId(projectService?.serviceId) ||
      extractId(projectService?.services) ||
      extractId(popupParams.serviceId) ||
      extractId(serviceLine?.serviceId);
    const serviceName =
      serviceLine?.serviceName ||
      quotationService?.serviceName ||
      projectService?.serviceName ||
      projectService?.services?.serviceName ||
      popupParams.serviceName ||
      form.contractName;
    const description =
      serviceLine?.description ||
      quotationService?.description ||
      form.scopeNote ||
      projectService?.description ||
      projectService?.services?.description ||
      popupParams.description ||
      null;
    const packageMode = form.pricingMode === "package";
    const pricingPayload = packageMode
      ? packagePricingPayload(
          {
            packageSubTotal: form.subTotal || form.fixedAmount,
            packageVatRate: form.packageVatRate,
            packageVatAmount: form.vatAmount,
            packageTotalAmount: form.totalAmount || form.fixedAmount,
          },
          quotationService,
          serviceLine,
          projectService,
          popupParams,
        )
      : projectServicePricingPayload(
          resolveServiceAmounts(
            serviceLine,
            quotationService,
            projectService,
            popupParams,
            {
              basePrice: form.subTotal || form.fixedAmount,
              subTotal: form.subTotal,
              vatAmount: form.vatAmount,
              totalAmount: form.totalAmount || form.fixedAmount,
            },
          ),
        );

    const resolvedLineCurrencyId =
      getRecordCurrencyId(serviceLine) ||
      getRecordCurrencyId(quotationService) ||
      getRecordCurrencyId(projectService) ||
      getRecordCurrencyId(popupParams) ||
      submitCurrencyId ||
      getRecordCurrencyId(form) ||
      null;

    const payload = {
      contractId,
      contracts: contractId,
      projectServiceId,
      projectServices: projectServiceId,
      quotationServiceId:
        extractId(quotationService?.id) || directQuotationServiceId || null,
      quotationServices:
        extractId(quotationService?.id) ||
        directQuotationServiceId ||
        undefined,
      serviceId: serviceId || null,
      ServiceId: serviceId || null,
      projectId:
        projectId ||
        extractId(serviceLine?.projectId) ||
        extractId(popupParams.projectId) ||
        extractId(popupParams.caseId) ||
        null,
      serviceName: serviceName || null,
      description,
      // pricingPayload (line mode) is built from an amounts-only object with
      // no currency info, so its own currencyId is always null — it MUST be
      // spread before the real currencyId/currency assignment below, or it
      // silently wipes the correctly resolved value back to null.
      ...pricingPayload,
      currencyId: resolvedLineCurrencyId,
      currency: resolvedLineCurrencyId,
      lineStatus: contractStatusToProjectServiceStatus(form.status),
    };
    return payload;
  };

  const buildManualContractServicePayload = ({
    contractId,
    row,
    projectId,
    submitCurrencyId,
  }) => {
    if (!contractId || !row) return null;
    const packageMode = form.pricingMode === "package";
    const pricingPayload = packageMode
      ? packagePricingPayload({
          packageSubTotal: form.subTotal || form.fixedAmount,
          packageVatRate: form.packageVatRate,
          packageVatAmount: form.vatAmount,
          packageTotalAmount: form.totalAmount || form.fixedAmount,
        })
      : projectServicePricingPayload(manualServiceLineAmounts(row, false));
    return {
      contractId,
      contracts: contractId,
      serviceId: row.serviceId ? parseInt(row.serviceId, 10) : null,
      ServiceId: row.serviceId ? parseInt(row.serviceId, 10) : null,
      services: row.serviceId ? parseInt(row.serviceId, 10) : undefined,
      projectId: projectId || null,
      serviceName: row.serviceName || null,
      serviceType: row.serviceType || null,
      description: row.description || null,
      // pricingPayload's own currencyId is always null here (see the
      // matching comment in buildContractServicePayload above) — spread it
      // before the real currencyId/currency assignment so it isn't clobbered.
      ...pricingPayload,
      currencyId:
        getRecordCurrencyId(row) ||
        submitCurrencyId ||
        getRecordCurrencyId(form) ||
        null,
      currency:
        getRecordCurrencyId(row) ||
        submitCurrencyId ||
        getRecordCurrencyId(form) ||
        null,
      lineStatus: packageMode
        ? "included_in_package"
        : contractStatusToProjectServiceStatus(form.status),
    };
  };

  const createContractServiceLine = async (payload) => {
    if (!payload) return null;
    const cleanPayload = stripContractServicePayload(payload);
    try {
      const res = await ctx.api.request({
        url: "contractServices:create",
        method: "POST",
        data: cleanPayload,
      });
      return res?.data?.data || res?.data || null;
    } catch (error) {
      const fallbackPayload = { ...cleanPayload };
      delete fallbackPayload.contracts;
      delete fallbackPayload.projectServices;
      delete fallbackPayload.quotationServices;
      delete fallbackPayload.services;
      try {
        const res = await ctx.api.request({
          url: "contractServices:create",
          method: "POST",
          data: fallbackPayload,
        });
        return res?.data?.data || res?.data || null;
      } catch (fallbackError) {
        const minimalPayload = { ...fallbackPayload };
        delete minimalPayload.serviceType;
        delete minimalPayload.serviceId;
        delete minimalPayload.ServiceId;
        const res = await ctx.api.request({
          url: "contractServices:create",
          method: "POST",
          data: minimalPayload,
        });
        return res?.data?.data || res?.data || null;
      }
    }
  };

  const updateProjectServiceLineSafely = async (projectServiceId, payload) => {
    try {
      return await ctx.api.request({
        url: "projectServices:update",
        method: "POST",
        params: { filterByTk: projectServiceId },
        data: payload,
      });
    } catch (error) {
      const fallbackPayload = stripProjectServiceSyncFields(payload);
      try {
        return await ctx.api.request({
          url: "projectServices:update",
          method: "POST",
          params: { filterByTk: projectServiceId },
          data: fallbackPayload,
        });
      } catch (fallbackError) {
        const minimalPayload = { ...fallbackPayload };
        delete minimalPayload.pricingMode;
        delete minimalPayload.billingMode;
        delete minimalPayload.financialSourceType;
        delete minimalPayload.packageSubTotal;
        delete minimalPayload.packageVatRate;
        delete minimalPayload.packageVatAmount;
        delete minimalPayload.packageTotalAmount;
        return ctx.api.request({
          url: "projectServices:update",
          method: "POST",
          params: { filterByTk: projectServiceId },
          data: minimalPayload,
        });
      }
    }
  };

  const isContractFolder = (folder, contractId) =>
    String(firstId(folder?.contractId, folder?.contract, folder?.contracts)) ===
    String(contractId);

  const isCaseFolderCandidate = (folder, projectId, projectFolderIds) => {
    const folderProjectId = firstId(
      folder?.projectId,
      folder?.project,
      folder?.projects,
    );
    if (String(folderProjectId) !== String(projectId)) return false;

    const linkedRecordId = firstId(
      folder?.contractId,
      folder?.contract,
      folder?.contracts,
      folder?.quotationId,
      folder?.quotation,
      folder?.quotations,
      folder?.projectServiceId,
      folder?.projectService,
      folder?.projectServices,
      folder?.taskId,
      folder?.task,
      folder?.tasks,
    );
    if (linkedRecordId) return false;

    const parentId = firstId(folder?.parentId, folder?.parent);
    return !parentId || !projectFolderIds.has(String(parentId));
  };

  const ensureMainContractFolder = async ({
    contractId,
    projectId,
    customerId,
    contractCode,
    contractName,
  }) => {
    if (!contractId || !projectId) return null;
    if (!AUTO_CREATE_CONTRACT_FOLDERS) return null;

    try {
      const foldersRes = await ctx.api.request({
        url: "folders:list",
        params: {
          filter: JSON.stringify({
            projectId: { $eq: parseInt(projectId, 10) },
          }),
          pageSize: 1000,
          sort: ["folderIndex", "createdAt"],
        },
      });
      const allFolders = foldersRes?.data?.data || [];
      const existingContractFolder = allFolders.find((folder) =>
        isContractFolder(folder, contractId),
      );
      if (existingContractFolder) return existingContractFolder;

      const projectFolderIds = new Set(
        allFolders
          .map((folder) => extractId(folder?.id))
          .filter(Boolean)
          .map(String),
      );
      const parentCaseFolder =
        allFolders.find((folder) =>
          isCaseFolderCandidate(folder, projectId, projectFolderIds),
        ) ||
        allFolders.find(
          (folder) =>
            String(
              firstId(folder?.projectId, folder?.project, folder?.projects),
            ) === String(projectId),
        );

      if (!parentCaseFolder) {
        console.warn(
          "[ContractCreateForm] Could not find case folder for contract folder",
          {
            projectId,
            contractId,
            projectRecord: getConfiguredProjectRecord(),
          },
        );
        return null;
      }

      const parentId = extractId(parentCaseFolder.id);
      const childFolders = allFolders.filter(
        (folder) =>
          String(firstId(folder?.parentId, folder?.parent)) ===
          String(parentId),
      );
      const maxFolderIndex = childFolders.reduce(
        (max, folder) => Math.max(max, parseInt(folder.folderIndex, 10) || 0),
        0,
      );
      const projectRecord = getConfiguredProjectRecord();
      const creatorId = firstId(
        projectRecord?.createdById,
        projectRecord?.createdBy,
        projectRecord?.updatedById,
        projectRecord?.updatedBy,
      );
      const folderName = compact([
        "Hợp đồng",
        contractCode || contractName || contractId,
      ]).join(" ");

      const folderPayload = {
        name: folderName,
        parentId,
        projectId: parseInt(projectId, 10),
        customerId: customerId
          ? parseInt(customerId, 10)
          : firstId(parentCaseFolder.customerId, parentCaseFolder.customer),
        moduleScope: CASE_DOCUMENT_SCOPE,
        contractId: parseInt(contractId, 10),
        createdById: creatorId || undefined,
        updatedById: creatorId || undefined,
        folderIndex: maxFolderIndex + 1,
      };
      Object.keys(folderPayload).forEach((key) => {
        if (folderPayload[key] === undefined || folderPayload[key] === null)
          delete folderPayload[key];
      });

      const createRes = await ctx.api.request({
        url: "folders:create",
        method: "POST",
        data: folderPayload,
      });

      return createRes?.data?.data || createRes?.data || null;
    } catch (error) {
      console.warn(
        "[ContractCreateForm] Could not create main contract folder",
        error,
      );
      return null;
    }
  };

  const validate = () => {
    if (!form.contractName.trim()) return "Please enter the contract name.";
    if (!form.customerId) return "Please select a customer.";
    if (!form.internalCompanyId) return "Please select an internal company.";
    if (currencyOptions.length && !extractCurrencyId(form.currencyId))
      return "Please select contract currency.";
    if (!form.contractType) return "Please select the contract type.";
    const activePaymentRows = cleanPaymentScheduleRows(
      form.paymentSchedule,
      paymentBaseAmount,
    );
    if (form.billingCycle === "multiple_payments") {
      if (!paymentBaseAmount)
        return "Please enter service pricing before adding payment installments.";
      if (!isRetainer && !activePaymentRows.length)
        return "Please add at least one payment installment.";
      if (
        activePaymentRows.some(
          (row) => !row.paymentDate || parseNum(row.amount) <= 0,
        )
      ) {
        return "Please enter payment date and payment percentage for every payment installment.";
      }
      if (activePaymentRows.length > 1) {
        const percentageSum = activePaymentRows.reduce(
          (sum, row) => sum + parseNum(row.percentage),
          0,
        );
        if (Math.abs(percentageSum - 100) > 0.01) {
          return "Payment installment percentages must add up to 100%.";
        }
      }
    }
    if (
      isRetainer &&
      !["day", "month", "year"].includes(form.retainerRepeatUnit)
    ) {
      return "Please select a valid retainer repeat unit.";
    }
    if (serviceLines.length && !selectedContractServiceLines.length) {
      return "Please select at least one service for this contract.";
    }
    if (!serviceLines.length && manualServiceRows.length) {
      if (manualServiceRows.some((row) => !row.serviceName && !row.serviceId)) {
        return "Please select a service for every contract service row.";
      }
      const selectedManualServiceIds = manualServiceRows
        .map((row) => String(row.serviceId || ""))
        .filter(Boolean);
      if (
        new Set(selectedManualServiceIds).size !==
        selectedManualServiceIds.length
      ) {
        return "Duplicate services are not allowed in contract service rows.";
      }
      const manualServiceNames = manualServiceRows
        .map((row) =>
          normalizeSearch(row.serviceName).replace(/\s+/g, " ").trim(),
        )
        .filter(Boolean);
      if (new Set(manualServiceNames).size !== manualServiceNames.length) {
        return "Duplicate service names are not allowed in contract service rows.";
      }
      const manualNameMatchesCatalog = manualServiceRows.some((row) => {
        if (row.serviceId || !row.serviceName) return false;
        const name = normalizeSearch(row.serviceName)
          .replace(/\s+/g, " ")
          .trim();
        return filteredServiceOptions.some(
          (service) =>
            normalizeSearch(serviceCatalogName(service))
              .replace(/\s+/g, " ")
              .trim() === name,
        );
      });
      if (manualNameMatchesCatalog) {
        return "A manually created service already exists in the catalog. Please select the existing service instead.";
      }
      if (
        form.pricingMode !== "package" &&
        manualServiceRows.some((row) => parseNum(row.basePrice) <= 0)
      ) {
        return "Please enter base price for every line-priced service.";
      }
      if (
        form.pricingMode !== "package" &&
        currencyOptions.length &&
        manualServiceRows.some((row) => !extractCurrencyId(row.currencyId))
      ) {
        return "Please select currency for every service row.";
      }
      if (
        form.pricingMode === "package" &&
        parseNum(form.subTotal || form.fixedAmount) <= 0
      ) {
        return "Please enter package subtotal.";
      }
    }
    if (
      (form.contractKind === "appendix" || isAppendixContract) &&
      !form.parentId
    ) {
      return "Please select the main contract before creating an appendix.";
    }
    return "";
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      message.warning(error);
      return;
    }

    setSavingState(true);
    try {
      const name = form.contractName.trim();
      const quotationId = form.quotationId
        ? parseInt(form.quotationId, 10)
        : null;
      const currentProjectId = getConfiguredProjectId();
      const projectId =
        currentProjectId ||
        (form.projectId ? parseInt(form.projectId, 10) : null);
      const parentId = form.parentId ? parseInt(form.parentId, 10) : null;
      const projectServiceId = form.projectServiceId
        ? parseInt(form.projectServiceId, 10)
        : null;
      const serviceLinesForSubmit = selectedContractServiceLines.length
        ? selectedContractServiceLines
        : projectServiceId
          ? [
              {
                projectServiceId,
                quotationServiceId: form.quotationServiceId
                  ? parseInt(form.quotationServiceId, 10)
                  : null,
                projectId,
              },
            ]
          : [];
      const formPackagePricingSource =
        form.pricingMode === "package"
          ? {
              pricingMode: "package",
              packageSubTotal: form.subTotal || form.fixedAmount,
              packageVatRate: form.packageVatRate,
              packageVatAmount: form.vatAmount,
              packageTotalAmount: form.totalAmount || form.fixedAmount,
            }
          : null;
      const manualServiceRowsForSubmit = serviceLines.length
        ? []
        : manualServiceRows.filter((row) => row.serviceName || row.serviceId);
      const contractKind =
        form.contractKind || (parentId ? "appendix" : "main");
      const finalContractCode =
        form.contractCode.trim() ||
        (await generateContractCode({
          prefix: autoCodePrefix,
          issuedDate: form.signedDate,
          parentId,
        }));
      const submitCurrency =
        findCurrencyById(currencies, form.currencyId) ||
        selectedCurrency ||
        findDefaultCurrency(currencies);
      const submitCurrencyId =
        extractCurrencyId(submitCurrency) || extractCurrencyId(form.currencyId);
      const pricingRowsForSummary =
        form.pricingMode === "package"
          ? [
              {
                currencyId: submitCurrencyId,
                subTotal: form.subTotal || form.fixedAmount,
                vatAmount: form.vatAmount,
                totalAmount: form.totalAmount || form.fixedAmount,
              },
            ]
          : serviceLines.length
            ? serviceLinesForSubmit
            : manualServiceRowsForSubmit.map((row) => ({
                ...row,
                ...manualServiceLineAmounts(row, false),
              }));
      const preliminarySummary = buildContractFinancialSummary({
        rows: pricingRowsForSummary,
        currencies,
        baseCurrency: submitCurrency,
        pricingDate: form.signedDate || new Date().toISOString(),
      });
      const rateCurrencyIds = getConversionSourceCurrencyIds(
        preliminarySummary.groups,
        submitCurrency,
      );
      const exchangeRates = rateCurrencyIds.length
        ? await fetchExchangeRatesForConversion(
            rateCurrencyIds,
            submitCurrencyId,
          )
        : [];
      const financialSummary = buildContractFinancialSummary({
        rows: pricingRowsForSummary,
        currencies,
        baseCurrency: submitCurrency,
        exchangeRates,
        pricingDate: form.signedDate || new Date().toISOString(),
      });
      if (!financialSummary.converted.canConvert) {
        message.warning(
          `Missing exchange rate: ${formatMissingRatePairs(financialSummary.missing, submitCurrency)}`,
        );
        return;
      }
      const headerTotals = financialSummary.converted;
      const paymentSchedulePayload = buildPaymentSchedulePayload({
        form: {
          ...form,
          currencyId: submitCurrencyId || form.currencyId,
          currencyCode: getCurrencyCode(submitCurrency),
          totalAmount: headerTotals.totalAmount,
        },
        isRetainer,
        currency: submitCurrency,
      });
      const resolvedPaymentDate = isMultiplePayments
        ? paymentSchedulePayload?.firstPaymentDate
        : form.paymentDate;

      const payload = {
        status: form.status || "draft",
        contractKind,
        contractType: form.contractType || null,
        feeModel: form.feeModel || null,
        billingCycle: form.billingCycle || null,
        contractCode: finalContractCode,
        contractNumber: finalContractCode,
        code: finalContractCode,
        contractName: name,
        customerId: parseInt(form.customerId, 10),
        internalCompanyId: parseInt(form.internalCompanyId, 10),
        lawyerId: form.lawyerId ? parseInt(form.lawyerId, 10) : null,
        templateId: form.templateId ? parseInt(form.templateId, 10) : null,
        quotationId,
        quotations: quotationId || undefined,
        currencyId: submitCurrencyId || null,
        pricingMode: form.pricingMode,
        packageVatRate:
          form.pricingMode === "package" ? parseNum(form.packageVatRate) : null,
        cases:
          projectId && contractKind !== "appendix" ? [projectId] : undefined,
        parentId,
        parent: parentId || undefined,
        issuedDate: toIso(form.signedDate),
        signedAt: toIso(form.signedDate),
        endDate: isRetainer
          ? toIso(form.endDate)
          : isMultiplePayments
            ? null
            : toIso(form.endDate),
        paymentDate: toIsoDateTime(resolvedPaymentDate),
        monthlyFee: null,
        fixedAmount:
          headerTotals.totalAmount || parseNum(form.fixedAmount) || null,
        hourlyRate: visibleFeeFields.hourlyRate
          ? parseNum(form.hourlyRate) || null
          : null,
        estimatedHours: visibleFeeFields.estimatedHours
          ? nullableNum(form.estimatedHours)
          : null,
        successFee: visibleFeeFields.successFee
          ? parseNum(form.successFee) || null
          : null,
        retainerPeriod: null,
        retainerDuration: isRetainer
          ? nullableNum(form.retainerDuration)
          : null,
        includedHours: null,
        overageHourlyRate: null,
        subTotal: headerTotals.subTotal,
        vatAmount: headerTotals.vatAmount,
        totalAmount: headerTotals.totalAmount,
        paymentSchedule: paymentSchedulePayload,
        scopeNote: form.scopeNote.trim() || null,
        description: form.description.trim() || null,
        isRequiredApproval: form.isRequiredApproval,
        approvedById:
          form.isRequiredApproval && form.approvedById
            ? parseInt(form.approvedById, 10)
            : null,
        approvedAt: form.isRequiredApproval ? new Date().toISOString() : null,
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
      });

      const contractRes = await ctx.api.request({
        url: "contracts:create",
        method: "POST",
        data: payload,
      });
      const contractId = contractRes?.data?.data?.id || contractRes?.data?.id;
      if (!contractId)
        throw new Error("Could not retrieve contract id after creation");
      const createdContract = contractRes?.data?.data ||
        contractRes?.data || {
          ...payload,
          id: contractId,
        };
      const contractServiceLines = [];

      if (contractId && serviceLinesForSubmit.length) {
        for (const line of serviceLinesForSubmit) {
          const lineProjectServiceId = extractId(line.projectServiceId);
          if (!lineProjectServiceId) continue;
          const contractServicePayload = await buildContractServicePayload({
            contractId,
            projectServiceId: lineProjectServiceId,
            quotationServiceId: extractId(line.quotationServiceId),
            projectId,
            serviceLine: line,
            submitCurrencyId,
          });
          const createdLine = await createContractServiceLine(
            contractServicePayload,
          );
          if (createdLine) contractServiceLines.push(createdLine);

          const contractServiceServiceId =
            extractId(contractServicePayload?.serviceId) || null;
          const projectServiceUpdatePayload = {
            ...projectServicePricingPayload(
              formPackagePricingSource || contractServicePayload || line,
            ),
            serviceName:
              line.serviceName || contractServicePayload?.serviceName,
            serviceType:
              line.serviceType || contractServicePayload?.serviceType || null,
            description:
              line.description || contractServicePayload?.description,
            // Đồng bộ serviceId — quan trọng để giữ link trong CaseServices
            ...(contractServiceServiceId
              ? {
                  serviceId: contractServiceServiceId,
                  ServiceId: contractServiceServiceId,
                  services: contractServiceServiceId,
                }
              : {}),
            contractId,
            contracts: contractId,
            contractServiceId: extractId(createdLine?.id) || undefined,
            contractServices: extractId(createdLine?.id) || undefined,
            status: contractStatusToProjectServiceStatus(form.status),
            quotationServiceId:
              contractServicePayload?.quotationServiceId || undefined,
            quotationServices:
              contractServicePayload?.quotationServiceId || undefined,
            // projectServices' currency field is the belongsTo association
            // "currencies" (plural), not "currency" — keep both the scalar
            // and the relation in sync with the resolved line currency.
            currencyId: contractServicePayload?.currencyId || null,
            currencies: contractServicePayload?.currencyId || null,
          };
          Object.keys(projectServiceUpdatePayload).forEach((key) => {
            if (projectServiceUpdatePayload[key] === undefined)
              delete projectServiceUpdatePayload[key];
          });

          await updateProjectServiceLineSafely(
            lineProjectServiceId,
            projectServiceUpdatePayload,
          );

          const targetQuotationServiceId =
            extractId(contractServicePayload?.quotationServiceId) ||
            extractId(line.quotationServiceId);
          if (targetQuotationServiceId) {
            try {
              const quotationServicePayload = {
                serviceId: contractServiceServiceId || null,
                ServiceId: contractServiceServiceId || null,
                services: contractServiceServiceId || null,
                serviceName:
                  line.serviceName ||
                  contractServicePayload?.serviceName ||
                  null,
                serviceType:
                  line.serviceType ||
                  contractServicePayload?.serviceType ||
                  null,
                description:
                  line.description ||
                  contractServicePayload?.description ||
                  null,
                currencyId: contractServicePayload?.currencyId || null,
                currency: contractServicePayload?.currencyId || null,
                basePrice: contractServicePayload?.basePrice,
                quantity: contractServicePayload?.quantity,
                vat: contractServicePayload?.vat,
                subTotal: contractServicePayload?.subTotal,
                vatAmount: contractServicePayload?.vatAmount,
                totalAmount: contractServicePayload?.totalAmount,
                pricingMode: contractServicePayload?.pricingMode,
                packageSubTotal: contractServicePayload?.packageSubTotal,
                packageVatRate: contractServicePayload?.packageVatRate,
                packageVatAmount: contractServicePayload?.packageVatAmount,
                packageTotalAmount: contractServicePayload?.packageTotalAmount,
              };
              Object.keys(quotationServicePayload).forEach((key) => {
                if (quotationServicePayload[key] === undefined)
                  delete quotationServicePayload[key];
              });
              await ctx.api.request({
                url: `quotationServices:update?filterByTk=${targetQuotationServiceId}`,
                method: "POST",
                data: quotationServicePayload,
              });
              const targetQuotationId =
                extractId(line.quotationId) || extractId(form.quotationId);
              if (targetQuotationId) {
                await syncQuotationHeaderFromServices(targetQuotationId);
              }
            } catch (error) {
              console.warn(
                "[ContractCreateForm] Could not sync quotationService in handleSubmit:",
                error,
              );
            }
          }
        }
      }

      if (contractId && manualServiceRowsForSubmit.length) {
        for (const row of manualServiceRowsForSubmit) {
          const contractServicePayload = buildManualContractServicePayload({
            contractId,
            row,
            projectId,
            submitCurrencyId,
          });
          const createdLine = await createContractServiceLine(
            contractServicePayload,
          );
          if (createdLine) contractServiceLines.push(createdLine);
        }
      }

      if (contractId && projectId && contractKind === "main") {
        await ctx.api
          .request({
            url: "projects:update",
            method: "POST",
            params: { filterByTk: projectId },
            data: { contractId },
          })
          .catch((error) =>
            console.warn(
              "[ContractCreateForm] Could not link main contract to project",
              error,
            ),
          );
      }

      if (contractId && currentProjectId && contractKind === "main") {
        await ensureMainContractFolder({
          contractId,
          projectId: currentProjectId,
          customerId: payload.customerId,
          contractCode: finalContractCode,
          contractName: name,
        });
      }

      message.success("Contract created successfully.");
      emitQuickCreateCreated("contracts", createdContract);
      isDirtyRef.current = false;
      setSavingState(false);
      await closePopupAfterSubmit();
      setForm((prev) => ({
        ...prev,
        contractCode: "",
        contractName: "",
        parentId: "",
        projectServiceId: "",
        quotationServiceId: "",
        contractKind: "main",
        quotationId: "",
        projectId: "",
        paymentDate: "",
        paymentSchedule: [newPaymentScheduleRow(1)],
        retainerRepeatAnchorType: "month",
        retainerRepeatAnchorValue: "1",
        retainerRepeatInterval: "1",
        retainerRepeatUnit: "month",
        monthlyFee: "",
        fixedAmount: "",
        hourlyRate: "",
        estimatedHours: "",
        successFee: "",
        retainerDuration: "",
        includedHours: "",
        overageHourlyRate: "",
        subTotal: "",
        vatAmount: "",
        totalAmount: "",
        scopeNote: "",
        description: "",
        isRequiredApproval: false,
        approvedById: "",
        packageVatRate: "8",
      }));
      setSelectedServiceIds([]);
      setManualServiceRows([]);
      setServiceLines((prev) =>
        prev.map((line) =>
          serviceLinesForSubmit.some(
            (selectedLine) =>
              String(extractId(selectedLine.projectServiceId)) ===
              String(line.projectServiceId),
          )
            ? {
                ...line,
                contractId,
                locked: true,
                status: contractStatusToProjectServiceStatus(form.status),
              }
            : line,
        ),
      );
    } catch (err) {
      console.error(err);
      message.error(
        `Could not create contract${err?.message ? `: ${err.message}` : ""}`,
      );
    } finally {
      setSavingState(false);
    }
  };

  if (loading) {
    return React.createElement(
      "div",
      { style: { padding: 32, textAlign: "center" } },
      React.createElement(Spin, null),
    );
  }

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: FONT,
        color: C.text,
        background: C.bg,
        padding: 20,
        width: "100%",
        boxSizing: "border-box",
      },
      onChange: markDirty,
      onInput: markDirty,
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginBottom: 12,
        },
      },
      AntButton
        ? React.createElement(
            AntButton,
            { onClick: () => setGuideOpen(true) },
            "Hướng dẫn",
          )
        : React.createElement(
            "button",
            {
              type: "button",
              onClick: () => setGuideOpen(true),
              style: {
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                background: "#ffffff",
                color: C.text,
                padding: "8px 13px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: FONT,
                cursor: "pointer",
              },
            },
            "Hướng dẫn",
          ),
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          alignItems: "start",
          width: "100%",
        },
      },
      React.createElement(
        "div",
        { style: { minWidth: 0 } },
        React.createElement(
          Section,
          { title: "Internal company" },
          React.createElement(
            "div",
            { style: gridStyle },
            React.createElement(
              Field,
              { label: "Internal company", required: true },
              React.createElement(SearchSelect, {
                value: form.internalCompanyId,
                onChange: (v) => setF("internalCompanyId", v),
                options: companyOptions,
                placeholder: "Select company",
              }),
            ),
          ),
        ),
        !form.internalCompanyId
          ? React.createElement(
              "div",
              {
                style: {
                  marginTop: 18,
                  padding: "28px 20px",
                  textAlign: "center",
                  color: C.sub,
                  background: C.bgSoft,
                  border: `1px dashed ${C.border}`,
                  borderRadius: 8,
                  fontSize: 13,
                },
              },
              "Vui lòng chọn Internal company ở trên để tiếp tục nhập thông tin hợp đồng.",
            )
          : React.createElement(
              React.Fragment,
              null,
              React.createElement(
                Section,
                { title: "Contract information" },
                React.createElement(
                  "div",
                  { style: gridStyle },
                  React.createElement(
                    Field,
                    { label: "Contract type", required: true },
                    React.createElement(SelectInput, {
                      value: form.contractType,
                      onChange: handleContractTypeChange,
                      options: CONTRACT_TYPES,
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Status" },
                    React.createElement(SelectInput, {
                      value: form.status,
                      onChange: (v) => setF("status", v),
                      options: STATUS_OPTIONS,
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Contract code" },
                    React.createElement(TextInput, {
                      value: form.contractCode,
                      onChange: (v) => setF("contractCode", v),
                      placeholder: `Leave blank to auto-generate ${autoCodePrefix}`,
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Contract name", required: true },
                    React.createElement(TextInput, {
                      value: form.contractName,
                      onChange: (v) => setF("contractName", v),
                      placeholder: "Contract name",
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Parent contract" },
                    React.createElement(SearchSelect, {
                      value: form.parentId,
                      onChange: (v) => setF("parentId", v),
                      options: parentContractOptions,
                      placeholder: "No parent",
                    }),
                  ),
                ),
                React.createElement(
                  "div",
                  { style: { marginTop: 16 } },
                  React.createElement(ApprovalSection, {
                    isRequired: form.isRequiredApproval,
                    approvedById: form.approvedById,
                    lawyerOptions: lawyerOptions,
                    onToggle: toggleApproval,
                    onSelectApprover: (v) =>
                      setForm((p) => ({ ...p, approvedById: v })),
                  }),
                ),
              ),

              React.createElement(
                Section,
                { title: "Related" },
                React.createElement(
                  "div",
                  { style: gridStyle },
                  React.createElement(
                    Field,
                    { label: "Customer", required: true },
                    React.createElement(SearchSelect, {
                      value: form.customerId,
                      onChange: handleCustomerChange,
                      options: customerOptions,
                      placeholder: "Select customer",
                      addNewLabel: "Add new customer",
                      onAddNew: () =>
                        openCreatePopup(
                          "customerCreate",
                          refreshCustomers,
                          {
                            internalCompanyId: form.internalCompanyId,
                            lawyerId: form.lawyerId,
                          },
                          {
                            beforeIds: customers.map((customer) => customer.id),
                            onCreated: (id, record) => {
                              if (record)
                                setCustomers((prev) =>
                                  mergeRecordById(prev, record),
                                );
                              handleCustomerChange(id);
                            },
                          },
                        ),
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Lawyer" },
                    React.createElement(SearchSelect, {
                      value: form.lawyerId,
                      onChange: (v) => setF("lawyerId", v),
                      options: lawyerOptions,
                      placeholder: "Select lawyer",
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Template" },
                    React.createElement(SearchSelect, {
                      value: form.templateId,
                      onChange: (v) => setF("templateId", v),
                      options: templateOptions,
                      placeholder: "Select template",
                      addNewLabel: "Add new template",
                      onAddNew: () =>
                        openCreatePopup(
                          "templateCreate",
                          refreshTemplates,
                          { internalCompanyId: form.internalCompanyId },
                          {
                            beforeIds: templates.map((template) => template.id),
                            onCreated: (id, record) => {
                              if (record)
                                setTemplates((prev) =>
                                  mergeRecordById(prev, record),
                                );
                              setF("templateId", id);
                            },
                          },
                        ),
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Quotation" },
                    React.createElement(SearchSelect, {
                      value: form.quotationId,
                      onChange: (v) => {
                        if (v) {
                          applyQuotationToForm(v);
                        } else {
                          setForm((prev) => ({
                            ...prev,
                            quotationId: "",
                          }));
                        }
                      },
                      options: quotationOptions,
                      placeholder: form.customerId
                        ? "Search customer quotation"
                        : "Search quotation",
                      addNewLabel: "Add new quotation",
                      onAddNew: () =>
                        openCreatePopup(
                          "quotationCreate",
                          refreshQuotations,
                          {
                            customerId: form.customerId,
                            internalCompanyId: form.internalCompanyId,
                            lawyerId: form.lawyerId,
                            projectId: form.projectId,
                            caseId: form.projectId,
                          },
                          {
                            beforeIds: quotations.map(
                              (quotation) => quotation.id,
                            ),
                            onCreated: (id, record) => {
                              if (record)
                                setQuotations((prev) =>
                                  mergeRecordById(prev, record),
                                );
                              applyQuotationToForm(id, record);
                            },
                          },
                        ),
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Case" },
                    React.createElement(SearchSelect, {
                      value: form.projectId,
                      onChange: handleProjectChange,
                      options: projectOptions,
                      placeholder: "No case",
                    }),
                  ),
                ),
              ),

              React.createElement(ManualContractServicesSection, {
                rows: serviceLines.length
                  ? caseServiceEditorRows
                  : manualServiceRows,
                services: filteredServiceOptions,
                pricingMode: form.pricingMode,
                packageVatRate: form.packageVatRate,
                packageTotals,
                currencies: currencies,
                currencyOptions: currencyOptions,
                selectedCurrency: selectedCurrency,
                readOnlyServices: !!serviceLines.length,
                showAddRow: !serviceLines.length,
                allowDelete:
                  !serviceLines.length || selectedServiceIds.length > 1,
                onPricingModeChange: handleManualPricingModeChange,
                onPackageSubTotalChange: (value) =>
                  syncPackageTotals(value, form.packageVatRate),
                onPackageVatRateChange: (value) =>
                  syncPackageTotals(form.subTotal || form.fixedAmount, value),
                onAddRow: serviceLines.length ? undefined : addManualServiceRow,
                onDeleteRow: serviceLines.length
                  ? removeCaseServiceLineRow
                  : deleteManualServiceRow,
                onUpdateRow: serviceLines.length
                  ? updateCaseServiceLineRow
                  : updateManualServiceRow,
                onSelectService: serviceLines.length
                  ? undefined
                  : selectManualService,
                onCreateManualService: serviceLines.length
                  ? undefined
                  : createManualContractServiceDraft,
                onCurrencyChange: (value) => setF("currencyId", value || null),
              }),

              React.createElement(
                Section,
                { title: "Commercial Terms" },
                React.createElement(
                  "div",
                  { style: gridStyle },
                  React.createElement(
                    Field,
                    { label: "Fee model" },
                    React.createElement(SelectInput, {
                      value: form.feeModel,
                      onChange: (v) => setF("feeModel", v),
                      options: FEE_MODELS.filter((option) =>
                        allowedFeeModels(form.contractType).includes(
                          option.value,
                        ),
                      ),
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Billing cycle" },
                    React.createElement(SelectInput, {
                      value: form.billingCycle,
                      onChange: (v) => setF("billingCycle", v),
                      options: BILLING_CYCLES,
                    }),
                  ),
                  visibleFeeFields.retainerDuration &&
                    React.createElement(
                      Field,
                      {
                        label: "Retainer duration",
                        hint: "Leave blank for open-ended retainer",
                      },
                      React.createElement(SuffixInput, {
                        value: form.retainerDuration,
                        onChange: (v) =>
                          setRetainerField("retainerDuration", moneyRaw(v)),
                        placeholder: "Number of billing cycles",
                        suffix: retainerDurationSuffix(
                          form.retainerRepeatUnit,
                          form.retainerDuration,
                        ),
                      }),
                    ),
                  visibleFeeFields.fixedAmount &&
                    React.createElement(
                      Field,
                      { label: "Fixed amount" },
                      React.createElement(MoneyInput, {
                        value: form.fixedAmount,
                        onChange: (v) => setF("fixedAmount", v),
                        currency: selectedCurrency,
                      }),
                    ),
                  visibleFeeFields.hourlyRate &&
                    React.createElement(
                      Field,
                      { label: "Hourly rate" },
                      React.createElement(MoneyInput, {
                        value: form.hourlyRate,
                        onChange: (v) => setF("hourlyRate", v),
                        currency: selectedCurrency,
                      }),
                    ),
                  visibleFeeFields.estimatedHours &&
                    React.createElement(
                      Field,
                      { label: "Estimated hours" },
                      React.createElement(SuffixInput, {
                        value: form.estimatedHours,
                        onChange: (v) => setF("estimatedHours", moneyRaw(v)),
                        placeholder: "0",
                        suffix: "hours",
                      }),
                    ),
                  visibleFeeFields.successFee &&
                    React.createElement(
                      Field,
                      { label: "Success fee" },
                      React.createElement(MoneyInput, {
                        value: form.successFee,
                        onChange: (v) => setF("successFee", v),
                        currency: selectedCurrency,
                      }),
                    ),
                ),
              ),

              React.createElement(
                Section,
                { title: "Contract Date" },
                React.createElement(
                  "div",
                  { style: gridStyle },
                  React.createElement(
                    Field,
                    { label: "Signed date" },
                    React.createElement(TextInput, {
                      type: "date",
                      value: form.signedDate,
                      onChange: (v) => setF("signedDate", v),
                    }),
                  ),
                  showGenericPaymentDates &&
                    React.createElement(
                      Field,
                      { label: "First payment" },
                      React.createElement(TextInput, {
                        type: "date",
                        value: form.paymentDate,
                        onChange: handlePaymentDateChange,
                      }),
                    ),
                  showGenericPaymentDates &&
                    React.createElement(
                      Field,
                      { label: "End date" },
                      React.createElement(TextInput, {
                        type: "date",
                        value: form.endDate,
                        onChange: (v) => setF("endDate", v),
                      }),
                    ),
                ),
              ),

              isRetainer &&
                React.createElement(RetainerScheduleSection, {
                  form,
                  onUpdate: setRetainerField,
                }),

              showPaymentSchedule &&
                React.createElement(PaymentScheduleSection, {
                  rows: paymentScheduleRows,
                  baseAmount: paymentBaseAmount,
                  currency: selectedCurrency,
                  onAddRow: addPaymentScheduleRow,
                  onDeleteRow: deletePaymentScheduleRow,
                  onUpdateRow: updatePaymentScheduleRow,
                }),

              React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: `1px solid ${C.border}`,
                  },
                },
                AntButton
                  ? React.createElement(
                      AntButton,
                      {
                        type: "primary",
                        loading: saving,
                        onClick: handleSubmit,
                      },
                      "Submit",
                    )
                  : React.createElement(
                      "button",
                      {
                        type: "button",
                        disabled: saving,
                        onClick: handleSubmit,
                        style: {
                          border: "none",
                          borderRadius: 6,
                          background: saving ? "#9ca3af" : C.primary,
                          color: "#ffffff",
                          padding: "9px 16px",
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: FONT,
                          cursor: saving ? "default" : "pointer",
                          minWidth: 128,
                        },
                      },
                      saving ? "Saving..." : "Submit",
                    ),
              ),
            ),
      ),
    ),
    React.createElement(
      Modal,
      {
        title: "Giải thích trường dữ liệu",
        open: guideOpen,
        onCancel: () => setGuideOpen(false),
        footer: null,
        width: 980,
        destroyOnClose: false,
      },
      React.createElement(TutorialPanel, { contractType: form.contractType }),
    ),
  );
};

ctx.render(React.createElement(ContractCreateForm));
