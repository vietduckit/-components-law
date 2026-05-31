// NocoBase JS Block / RunJS snippet: render one button that opens a configured view.
// Edit OPEN_VIEW_CONFIG only, then paste/run this file content in your JS block.

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
      message?.warning?.("Please configure OPEN_VIEW_CONFIG.viewUid first.");
      return;
    }

    if (typeof ctx.openView !== "function") {
      message?.error?.("ctx.openView is not available in this runtime.");
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
      message?.error?.("Cannot open configured view.");
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
