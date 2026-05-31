const { React } = ctx;
const { useState, useCallback, useEffect } = React;
const { Steps, Tag, Space, message, Modal, Input } = ctx.antd;

const ALL_STAGES = [
  {
    key: "new",
    label: "New Quotation",
    description: "Báo giá mới",
    requireApproval: false,
  },
  {
    key: "pending",
    label: "Pending",
    description: "Đang chờ xem xét",
    requireApproval: true,
  },
  {
    key: "approval",
    label: "Approved",
    description: "Đã xét duyệt",
    requireApproval: true,
  },
  {
    key: "rejected",
    label: "Rejected",
    description: "Đã từ chối",
    requireApproval: true,
  },
  {
    key: "sent",
    label: "Quotation Sent",
    description: "Đã gửi báo giá",
    requireApproval: false,
  },
  {
    key: "order",
    label: "Order",
    description: "Đơn hàng",
    requireApproval: false,
  },
  {
    key: "cancelled",
    label: "Cancelled",
    description: "Đã huỷ",
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
          `Đã cập nhật: ${ALL_STAGES.find((s) => s.key === newStatus)?.label}`,
        );
        if (ctx.refresh) ctx.refresh();
      } catch {
        message.error("Cập nhật thất bại");
      }
    },
    [recordId],
  );

  const handleStepClick = useCallback(
    (targetKey) => {
      if (!canTransition(targetKey)) return;
      if (!recordId) {
        message.warning("Không tìm thấy record ID");
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
      setRejectError("Vui lòng nhập lý do từ chối");
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
        lockedReason = "Cần được xét duyệt (Approved) trước";
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
              Hiện tại
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
          {localStatus === "order" && "🎉 Đã chốt đơn hàng!"}
          {localStatus === "cancelled" && "❌ Báo giá đã bị huỷ"}
          {localStatus === "rejected" &&
            `🚫 Báo giá bị từ chối với lý do${record.rejectionReason ? `: ${record.rejectionReason}` : ""}`}
        </div>
      )}

      {/* Modal từ chối */}
      <Modal
        title="Từ chối báo giá"
        open={rejectModalOpen}
        onOk={handleConfirmReject}
        onCancel={() => {
          setRejectModalOpen(false);
          setRejectError("");
        }}
        okText="Xác nhận từ chối"
        cancelText="Huỷ"
        okButtonProps={{ danger: true, loading: pendingReject }}
        destroyOnClose
      >
        <p style={{ marginBottom: 8, fontSize: 13, color: "#595959" }}>
          Vui lòng nhập lý do từ chối để tiếp tục.
        </p>
        <Input.TextArea
          rows={4}
          placeholder="Nhập lý do từ chối..."
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
