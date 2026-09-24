const { React } = ctx;
const { useState, useEffect, useCallback } = React;
const { message, Steps, Tag, Space } = ctx.antd;

// ==================== CONFIGURATION ====================
const RECORD_ID = ctx.record?.id;
// "Create new ..." popups — fill in POPUP_UID_INVOICE/POPUP_UID_PAYMENT once
// those views exist in Nocobase. Clicking a blank UID just shows a "Chưa
// cấu hình Popup UID" warning instead of erroring (same guard as
// ContractDocxGenerator.js/QuotationDocxGenerator.js's POPUP_UID_CASE).
const POPUP_UID_QUOTATION = "v44ehxkcghx";
const POPUP_UID_CONTRACT = "41125dcba6c";
const POPUP_UID_CASE = "lqj7vemag75";
const POPUP_UID_INVOICE = "";
const POPUP_UID_PAYMENT = "";
// ==========================================================

// ==================== STAGE FLOW (customer relationship stepper) ====================
const STAGES = [
  { key: "prospect", label: "Prospect" },
  { key: "active", label: "Active" },
  { key: "dormant", label: "Dormant" },
];

const STAGE_COLORS = {
  prospect: "blue",
  active: "green",
  dormant: "default",
};

function getStageIndex(status) {
  const idx = STAGES.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

// Merged into this file (was its own standalone block) so the status
// stepper and the "Create new ..." toolbar share ONE `data` state instead
// of two independent fetches — `record`/`onUpdated` are props from
// CustomerOverviewBlock (its own fetched `data` + its `loadData`) rather
// than read from ctx.record/ctx.popup directly. Also drops the previous
// ctx.refresh() call in favor of onUpdated (a real refetch) — ctx.refresh
// isn't confirmed available in this block context, mirroring the same fix
// already applied to ContractDocxGenerator.js/QuotationDocxGenerator.js.
const CustomerStageFlow = ({ record, onUpdated }) => {
  const recordId = record?.id;
  const [localStatus, setLocalStatus] = useState(record?.status || "prospect");

  useEffect(() => {
    setLocalStatus(record?.status || "prospect");
  }, [record?.status]);

  const displayIndex = getStageIndex(localStatus);

  const updateStatus = useCallback(
    async (newStatus) => {
      try {
        await ctx.api.request({
          url: `customers:update?filterByTk=${recordId}`,
          method: "POST",
          data: { status: newStatus },
        });
        setLocalStatus(newStatus);
        message.success(
          `Đã cập nhật: ${STAGES.find((s) => s.key === newStatus)?.label}`,
        );
        if (onUpdated) await onUpdated();
      } catch {
        message.error("Cập nhật thất bại");
      }
    },
    [recordId, onUpdated],
  );

  const handleStepClick = useCallback(
    async (stepIndex) => {
      if (!recordId) {
        message.warning("Không tìm thấy record ID");
        return;
      }
      // Cho phép click tự do giữa các stage (kể cả lùi)
      await updateStatus(STAGES[stepIndex].key);
    },
    [recordId, updateStatus],
  );

  const stepsItems = STAGES.map((stage, index) => {
    let stepStatus = "wait";
    if (index < displayIndex) stepStatus = "finish";
    if (index === displayIndex) stepStatus = "process";

    const isCurrentStage = stage.key === localStatus;

    return {
      title: (
        <Space size={4}>
          <span style={{ fontWeight: isCurrentStage ? 600 : 400 }}>
            {stage.label}
          </span>
          {isCurrentStage && (
            <Tag
              color={STAGE_COLORS[localStatus]}
              style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}
            >
              Hiện tại
            </Tag>
          )}
        </Space>
      ),
      status: stepStatus,
      onClick: () => handleStepClick(index),
      style: { cursor: "pointer" },
    };
  });

  return (
    <div style={{ padding: "12px 16px 4px" }}>
      <Steps
        size="small"
        current={displayIndex}
        status="process"
        items={stepsItems}
      />
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const CustomerOverviewBlock = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!RECORD_ID) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await ctx.api.request({
        url: "customers:get",
        params: { filterByTk: RECORD_ID },
      });
      setData(res?.data?.data || res?.data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const btnBase = {
    cursor: "pointer",
    fontSize: 12,
    padding: "6px 18px",
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'IBM Plex Sans', Arial, sans-serif",
    fontWeight: 600,
    transition: "all 0.15s",
    border: "1px solid #1a3a5c",
  };
  const btnOutline = { ...btnBase, color: "#1a3a5c", background: "#fff" };

  const handleClick = async (type) => {
    let targetUid = null;

    switch (type) {
      case "quotation":
        targetUid = POPUP_UID_QUOTATION;
        break;
      case "contract":
        targetUid = POPUP_UID_CONTRACT;
        break;
      case "case":
        targetUid = POPUP_UID_CASE;
        break;
      case "invoice":
        targetUid = POPUP_UID_INVOICE;
        break;
      case "payment":
        targetUid = POPUP_UID_PAYMENT;
        break;
      default:
        return;
    }

    if (!targetUid) {
      message.warning(`Chưa cấu hình Popup UID cho ${type}`);
      return;
    }

    await ctx.openView(targetUid, {
      mode: "dialog",
      size: "large",
      navigation: false,
    });
  };

  if (!RECORD_ID)
    return React.createElement(
      "div",
      { style: { padding: 16, color: "#ff4d4f", fontSize: 13 } },
      "Không tìm thấy Record ID",
    );

  const actionButton = (type, label) =>
    React.createElement(
      "div",
      {
        key: type,
        onClick: () => handleClick(type),
        style: btnOutline,
        onMouseEnter: (e) => {
          e.currentTarget.style.background = "#eff6ff";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = "#fff";
        },
      },
      label,
    );

  return React.createElement(
    "div",
    null,
    // ==================== STAGE FLOW — full-width status stepper on top ====================
    React.createElement(
      "div",
      { style: { borderBottom: "1px solid #f0f0f0" } },
      React.createElement(CustomerStageFlow, { record: data, onUpdated: loadData }),
    ),
    // ==================== TOOLBAR — quick-create shortcuts ====================
    React.createElement(
      "div",
      {
        style: {
          padding: "12px 16px",
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          flexWrap: "wrap",
        },
      },
      actionButton("quotation", "Create new quotation"),
      actionButton("contract", "Create new contract"),
      actionButton("case", "Create new case"),
      actionButton("invoice", "Create new invoice"),
      actionButton("payment", "Create new payment"),
    ),
  );
};

ctx.render(React.createElement(CustomerOverviewBlock));
