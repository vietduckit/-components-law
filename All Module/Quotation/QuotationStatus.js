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
  "New Quotation": "Báo giá mới",
  "New quotation": "Báo giá mới",
  "Pending": "Chờ gửi",
  "Waiting for review": "Đang chờ xem xét",
  "Approved": "Đã duyệt",
  "Reviewed": "Đã xét duyệt",
  "Rejected": "Bị từ chối",
  "Quotation Sent": "Đã gửi báo giá",
  "Quotation sent": "Đã gửi báo giá",
  "Order": "Đơn hàng",
  "Order placed": "Đơn hàng",
  "Cancelled": "Đã hủy",
  "Updated: {0}": "Đã cập nhật: {0}",
  "Update failed": "Cập nhật thất bại",
  "Record ID not found": "Không tìm thấy record ID",
  "Please enter a rejection reason": "Vui lòng nhập lý do từ chối",
  "Must be reviewed (Approved) first": "Cần được xét duyệt (Approved) trước",
  "Current": "Hiện tại",
  "🎉 Order closed!": "🎉 Đã chốt đơn hàng!",
  "❌ Quotation cancelled": "❌ Báo giá đã bị huỷ",
  "🚫 Quotation rejected with reason{0}": "🚫 Báo giá bị từ chối với lý do{0}",
  "Reject quotation": "Từ chối báo giá",
  "Confirm rejection": "Xác nhận từ chối",
  "Cancel": "Huỷ",
  "Enter a rejection reason to continue.": "Vui lòng nhập lý do từ chối để tiếp tục.",
  "Enter a rejection reason...": "Nhập lý do từ chối...",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React } = ctx;
const { useState, useCallback, useEffect } = React;
const { Steps, Tag, Space, message, Modal, Input } = ctx.antd;

const ALL_STAGES = [
  {
    key: "new",
    label: tr("New Quotation"),
    description: tr("New quotation"),
    requireApproval: false,
  },
  {
    key: "pending",
    label: tr("Pending"),
    description: tr("Waiting for review"),
    requireApproval: true,
  },
  {
    key: "approval",
    label: tr("Approved"),
    description: tr("Reviewed"),
    requireApproval: true,
  },
  {
    key: "rejected",
    label: tr("Rejected"),
    description: tr("Rejected"),
    requireApproval: true,
  },
  {
    key: "sent",
    label: tr("Quotation Sent"),
    description: tr("Quotation sent"),
    requireApproval: false,
  },
  {
    key: "order",
    label: tr("Order"),
    description: tr("Order placed"),
    requireApproval: false,
  },
  {
    key: "cancelled",
    label: tr("Cancelled"),
    description: tr("Cancelled"),
    requireApproval: false,
  },
];

const STAGE_COLORS = {
  new: "purple",
  pending: "gold",
  approval: "green",
  rejected: "red",
  sent: "blue",
  order: "green",
  cancelled: "red",
};



// Các status bị block cho đến khi được approval (khi isRequiredApproval = true)
const BLOCKED_UNTIL_APPROVAL = ["sent", "order"];

const ProjectStageFlow = () => {
  const record = ctx.record || ctx.popup?.record || {};
  const recordId = record.id;

  const [localStatus, setLocalStatus] = useState(record.status || "new");
  const [isRequiredApproval, setIsRequiredApproval] = useState(
    !!record.isRequiredApproval,
  );
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [pendingReject, setPendingReject] = useState(false);

  // Lấy lại record mới nhất (phòng trường hợp isRequiredApproval thay đổi)
  useEffect(() => {
    if (record.isRequiredApproval !== undefined) {
      setIsRequiredApproval(!!record.isRequiredApproval);
    }
  }, [record.isRequiredApproval]);

  // Lọc stages theo isRequiredApproval
  const visibleStages = ALL_STAGES.filter((s) =>
    isRequiredApproval ? true : !s.requireApproval,
  );

  const getStageIndex = (status) => {
    const idx = visibleStages.findIndex((s) => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  const displayIndex = getStageIndex(localStatus);
  const isTerminal =
    localStatus === "order" ||
    localStatus === "cancelled" ||
    localStatus === "rejected";

  const isApproved =
    localStatus === "approval" || ["sent", "order"].includes(localStatus);

  // Kiểm tra xem có thể click vào step không
  const canTransition = useCallback(
    (targetKey) => {
      // Không cho click lại chính status hiện tại
      if (targetKey === localStatus) return false;

      // Block các trạng thái bị khoá nếu requireApproval mà chưa được duyệt
      if (
        isRequiredApproval &&
        !isApproved &&
        BLOCKED_UNTIL_APPROVAL.includes(targetKey)
      ) {
        return false;
      }

      // Cho phép linh hoạt chuyển tiến, lùi, và mở lại (reopen) thoải mái
      return true;
    },
    [isRequiredApproval, isApproved, localStatus],
  );

  const updateStatus = useCallback(
    async (newStatus, extraData = {}) => {
      try {
        const now = new Date().toISOString();
        const payload = { status: newStatus, ...extraData };

        // Ghi nhận acceptedAt khi chuyển sang sent
        if (newStatus === "sent") payload.acceptedAt = now;

        await ctx.api.request({
          url: `quotations:update?filterByTk=${recordId}`,
          method: "POST",
          data: payload,
        });

        setLocalStatus(newStatus);
        message.success(
          tr("Updated: {0}", { 0: ALL_STAGES.find((s) => s.key === newStatus)?.label }),
        );
        if (ctx.refresh) ctx.refresh();
      } catch {
        message.error(tr("Update failed"));
      }
    },
    [recordId],
  );

  const handleStepClick = useCallback(
    (targetKey) => {
      if (!canTransition(targetKey)) return;
      if (!recordId) {
        message.warning(tr("Record ID not found"));
        return;
      }

      if (targetKey === "rejected") {
        setRejectionReason("");
        setRejectError("");
        setRejectModalOpen(true);
        return;
      }

      updateStatus(targetKey);
    },
    [canTransition, recordId, updateStatus],
  );

  const handleConfirmReject = useCallback(async () => {
    if (!rejectionReason.trim()) {
      setRejectError(tr("Please enter a rejection reason"));
      return;
    }
    setPendingReject(true);
    await updateStatus("rejected", { rejectionReason: rejectionReason.trim() });
    setPendingReject(false);
    setRejectModalOpen(false);
    setRejectionReason("");
  }, [rejectionReason, updateStatus]);

  const stepsItems = visibleStages.map((stage, index) => {
    const isCurrentStage = stage.key === localStatus;
    const canClick = canTransition(stage.key);

    // Tính stepStatus cho Ant Design Steps
    let stepStatus = "wait";
    if (localStatus === "cancelled") {
      stepStatus =
        stage.key === "cancelled"
          ? "error"
          : index < visibleStages.length - 1
            ? "finish"
            : "wait";
    } else if (localStatus === "rejected") {
      stepStatus =
        stage.key === "rejected"
          ? "error"
          : index < displayIndex
            ? "finish"
            : "wait";
    } else {
      if (index < displayIndex) stepStatus = "finish";
      if (index === displayIndex) stepStatus = "process";
    }

    // Xác định tooltip/title khi bị khoá
    let lockedReason = "";
    if (!canClick && !isCurrentStage) {
      if (
        isRequiredApproval &&
        !isApproved &&
        BLOCKED_UNTIL_APPROVAL.includes(stage.key)
      ) {
        lockedReason = tr("Must be reviewed (Approved) first");
      }
    }

    return {
      title: (
        <Space size={4}>
          <span
            style={{
              fontWeight: isCurrentStage ? 600 : 400,
              color: lockedReason ? "#bfbfbf" : undefined,
            }}
            title={lockedReason || undefined}
          >
            {stage.label}
          </span>
          {isCurrentStage && (
            <Tag
              color={STAGE_COLORS[localStatus]}
              style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}
            >
              {tr("Current")}
            </Tag>
          )}
          {lockedReason && (
            <Tag
              color="default"
              style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}
            >
              🔒
            </Tag>
          )}
        </Space>
      ),
      description: (
        <span
          style={{ fontSize: 11, color: lockedReason ? "#bfbfbf" : "#8c8c8c" }}
        >
          {lockedReason || stage.description}
        </span>
      ),
      status: stepStatus,
      onClick: canClick ? () => handleStepClick(stage.key) : undefined,
      style: canClick ? { cursor: "pointer" } : { cursor: "default" },
    };
  });

  const overallStepsStatus =
    localStatus === "cancelled"
      ? "error"
      : localStatus === "rejected"
        ? "error"
        : localStatus === "order"
          ? "finish"
          : "process";

  return (
    <div style={{ padding: "12px 16px" }}>
      <Steps
        size="small"
        current={displayIndex}
        status={overallStepsStatus}
        items={stepsItems}
      />

      {/* Terminal states */}
      {isTerminal && (
        <div
          style={{
            marginTop: 12,
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            background:
              localStatus === "order"
                ? "#f6ffed"
                : localStatus === "rejected"
                  ? "#fff2f0"
                  : "#fff2f0",
            border: `1px solid ${
              localStatus === "order"
                ? "#b7eb8f"
                : localStatus === "rejected"
                  ? "#ffccc7"
                  : "#ffccc7"
            }`,
            color: localStatus === "order" ? "#52c41a" : "#ff4d4f",
          }}
        >
          {localStatus === "order" && tr("🎉 Order closed!")}
          {localStatus === "cancelled" && tr("❌ Quotation cancelled")}
          {localStatus === "rejected" &&
            tr("🚫 Quotation rejected with reason{0}", { 0: record.rejectionReason ? `: ${record.rejectionReason}` : "" })}
        </div>
      )}

      {/* Modal từ chối */}
      <Modal
        title={tr("Reject quotation")}
        open={rejectModalOpen}
        onOk={handleConfirmReject}
        onCancel={() => {
          setRejectModalOpen(false);
          setRejectError("");
        }}
        okText={tr("Confirm rejection")}
        cancelText={tr("Cancel")}
        okButtonProps={{ danger: true, loading: pendingReject }}
        destroyOnClose
      >
        <p style={{ marginBottom: 8, fontSize: 13, color: "#595959" }}>
          {tr("Enter a rejection reason to continue.")}
        </p>
        <Input.TextArea
          rows={4}
          placeholder={tr("Enter a rejection reason...")}
          value={rejectionReason}
          onChange={(e) => {
            setRejectionReason(e.target.value);
            setRejectError("");
          }}
          status={rejectError ? "error" : ""}
        />
        {rejectError && (
          <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>
            ⚠ {rejectError}
          </div>
        )}
      </Modal>
    </div>
  );
};

ctx.render(<ProjectStageFlow />);
