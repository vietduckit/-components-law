// NocoBase JS Block / RunJS snippet: render one button that opens a configured view.
// Edit OPEN_VIEW_CONFIG only, then paste/run this file content in your JS block.

// ---- ui language (pure; tested by scripts/tests/i18n-blocks.test.js) ----
// Labels follow the language NocoBase's UI runs in (ctx.i18n.language: the
// user's appLang, else the system default; changing it reloads the page):
// Vietnamese for "vi-*", English otherwise. The English text is the key, so a
// label missing from VI shows in English; {name} placeholders are filled from
// vars. Stored data is not translated. Tool: scripts/i18n/ui-strings.js.
const pickLang = (locale) => (/^vi\b/i.test(String(locale || "").trim()) ? "vi" : "en");
const makeTr = (lang, dict) => (text, vars) => {
  const template = (lang === "vi" && dict[text]) || text;
  return vars
    ? template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
    : template;
};
const VI = {
  "Please configure OPEN_VIEW_CONFIG.viewUid first.": "Vui lòng cấu hình OPEN_VIEW_CONFIG.viewUid trước.",
  "ctx.openView is not available in this runtime.": "ctx.openView không khả dụng trong môi trường này.",
  "Cannot open configured view.": "Không thể mở view đã cấu hình.",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const React = ctx.React;
const { Button } = ctx.antd;
const message = ctx.message || ctx.antd?.message;

const OPEN_VIEW_CONFIG = {
  viewUid: "", // Required. Example: "41125dcba6c"
  buttonText: "Open view",
  buttonType: "primary",
  buttonSize: "middle",
  danger: false,
  disabled: false,

  mode: "dialog",
  size: "large",
  title: "Popup",
  navigation: false,

  dataSourceKey: "main",
  collectionName: "", // Optional. Example: "contracts"

  // Optional params you want to send to the opened view.
  params: {
    // customerId: "",
    // sourceCollectionName: "",
    // sourceRecordId: "",
  },

  // Auto-pass runtime context into inputArgs/params.
  passCurrentRecord: true,
  passSelectedRows: true,
};

const extractId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (Array.isArray(value)) return extractId(value[0]);
  if (typeof value === "object") {
    return (
      extractId(value.id) ||
      extractId(value._id) ||
      extractId(value.value) ||
      extractId(value.targetKey) ||
      extractId(value.key)
    );
  }
  return null;
};

const getCurrentRecord = () =>
  ctx.record ||
  ctx.popup?.record ||
  ctx.view?.record ||
  {};

const getSelectedRows = () => {
  try {
    return ctx.resource?.getSelectedRows?.() || [];
  } catch {
    return [];
  }
};

function OpenViewButton() {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    const viewUid = String(OPEN_VIEW_CONFIG.viewUid || "").trim();
    if (!viewUid) {
      message?.warning?.(tr("Please configure OPEN_VIEW_CONFIG.viewUid first."));
      return;
    }

    if (typeof ctx.openView !== "function") {
      message?.error?.(tr("ctx.openView is not available in this runtime."));
      return;
    }

    const currentRecord = getCurrentRecord();
    const selectedRows = getSelectedRows();
    const currentRecordId = extractId(currentRecord?.id);
    const firstSelectedId = extractId(selectedRows[0]?.id);
    const sourceRecordId = currentRecordId || firstSelectedId;

    const autoParams = {
      ...(OPEN_VIEW_CONFIG.collectionName ? { collectionName: OPEN_VIEW_CONFIG.collectionName } : {}),
      ...(OPEN_VIEW_CONFIG.dataSourceKey ? { dataSourceKey: OPEN_VIEW_CONFIG.dataSourceKey } : {}),
      ...(sourceRecordId ? { sourceRecordId, filterByTk: sourceRecordId, id: sourceRecordId } : {}),
      ...(OPEN_VIEW_CONFIG.passCurrentRecord ? { sourceRecord: currentRecord } : {}),
      ...(OPEN_VIEW_CONFIG.passSelectedRows ? { selectedRows, selectedRowIds: selectedRows.map((row) => extractId(row?.id)).filter(Boolean) } : {}),
      ...(OPEN_VIEW_CONFIG.params || {}),
    };

    const defineProperties = {};
    Object.keys(autoParams).forEach((key) => {
      defineProperties[key] = {
        value: autoParams[key],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    });

    const openOptions = {
      mode: OPEN_VIEW_CONFIG.mode,
      size: OPEN_VIEW_CONFIG.size,
      title: OPEN_VIEW_CONFIG.title,
      navigation: OPEN_VIEW_CONFIG.navigation,
      dataSourceKey: OPEN_VIEW_CONFIG.dataSourceKey,
      collectionName: OPEN_VIEW_CONFIG.collectionName,
      filterByTk: autoParams.filterByTk,
      sourceId: autoParams.sourceRecordId,
      inputArgs: autoParams,
      params: autoParams,
      defineProperties,
    };

    try {
      setLoading(true);
      const result = ctx.openView(viewUid, openOptions);
      if (result?.then) await result;
    } catch (error) {
      console.warn("[OpenViewButton] ctx.openView failed", error);
      message?.error?.(tr("Cannot open configured view."));
    } finally {
      setLoading(false);
    }
  };

  return React.createElement(
    Button,
    {
      type: OPEN_VIEW_CONFIG.buttonType,
      size: OPEN_VIEW_CONFIG.buttonSize,
      danger: OPEN_VIEW_CONFIG.danger,
      disabled: OPEN_VIEW_CONFIG.disabled,
      loading,
      onClick: handleClick,
    },
    OPEN_VIEW_CONFIG.buttonText,
  );
}

ctx.render(React.createElement(OpenViewButton));
