  const { React } = ctx;
  const { useState, useEffect, useCallback, useRef } = React;
  const { Spin, message, Modal, Steps, Tag, Space, Input } = ctx.antd;

  // ==================== CONFIGURATION ====================
  const TEMPLATE_COLLECTION_NAME = "template";
  const TEMPLATE_FILE_FIELD = "fileAttachment";
  const SERVICE_TASK_RELATION = "templateId";
  const TASK_NAME_FIELD = "templateName";
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
  // "New Contract" / "New Case" popups — only offered once the quotation has
  // reached Order (see isOrderStatus in QuotationDocxGenerator below). Leave
  // these as "" and fill in the real view UIDs once configured in Nocobase —
  // clicking with an empty UID just shows a "Chưa cấu hình Popup UID" warning
  // instead of erroring (same guard as ContractDocxGenerator.js's POPUP_UID_CASE).
  const POPUP_UID_CONTRACT = "41125dcba6c";
  const POPUP_UID_CASE = "eqy8o1tcc1v";
  // ==========================================================

  const RECORD_ID = ctx.record?.id;

  // ==================== HELPER: CURRENCY CONVERSION ====================
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
    const match = String(value).trim().toUpperCase().match(/\b[A-Z]{3}\b/);
    return match ? match[0] : "";
  };
  const getCurrencyCode = (currency) =>
    String(
      currency?.code || currency?.currencyCode || currency?.name || DEFAULT_CURRENCY_CODE,
    ).toUpperCase();
  const getRecordCurrencyId = (record) =>
    extractCurrencyId(
      record?.currencyId || record?.currency || record?.currencies,
    );
  const findDefaultCurrency = (currencies = []) =>
    currencies.find(
      (c) => c?.isBaseCurrency || getCurrencyCode(c) === DEFAULT_CURRENCY_CODE,
    ) || null;

  async function fetchAllFromCandidates(urls = [], params = {}) {
    for (const url of urls) {
      try {
        const res = await ctx.api.request({
          url,
          params: { pageSize: 500, page: 1, ...params },
        });
        const rows = res?.data?.data || [];
        if (Array.isArray(rows) && rows.length) return rows;
      } catch {}
    }
    return [];
  }

  const isUsableExchangeRateStatus = (status) => {
    const value = String(status || "").trim().toLowerCase();
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
  const rateSideCurrencyId = (rate, side) =>
    extractCurrencyId(rate?.[`${side}CurrencyId`] || rate?.[`${side}Currency`]);
  const rateSideCurrencyCode = (rate, side) =>
    extractCurrencyCode(rate?.[`${side}Currency`] || rate?.[`${side}CurrencyCode`]);
  const rateMatchesSide = (rate, side, currencyId, currencyCode) => {
    const rId = rateSideCurrencyId(rate, side);
    if (rId && currencyId) return rId === currencyId;
    const rCode = rateSideCurrencyCode(rate, side);
    return !!rCode && !!currencyCode && rCode === currencyCode;
  };
  // Finds the most recent usable exchange rate converting fromCurrency ->
  // toCurrency, trying the inverse pair (1/rate) if no direct rate exists.
  function findConversionRate(
    rates,
    fromCurrencyId,
    fromCurrencyCode,
    toCurrencyId,
    toCurrencyCode,
  ) {
    const usable = (rates || []).filter(
      (r) => isUsableExchangeRateStatus(r.status) && parseFloat(r.rate) > 0,
    );
    const direct = usable
      .filter(
        (r) =>
          rateMatchesSide(r, "from", fromCurrencyId, fromCurrencyCode) &&
          rateMatchesSide(r, "to", toCurrencyId, toCurrencyCode),
      )
      .sort(
        (a, b) => new Date(b.effectiveDate || 0) - new Date(a.effectiveDate || 0),
      )[0];
    if (direct) return parseFloat(direct.rate);
    const inverse = usable
      .filter(
        (r) =>
          rateMatchesSide(r, "from", toCurrencyId, toCurrencyCode) &&
          rateMatchesSide(r, "to", fromCurrencyId, fromCurrencyCode),
      )
      .sort(
        (a, b) => new Date(b.effectiveDate || 0) - new Date(a.effectiveDate || 0),
      )[0];
    if (inverse && parseFloat(inverse.rate) > 0) return 1 / parseFloat(inverse.rate);
    return null;
  }

  // ==================== FETCH DATA ====================
  async function fetchQuotation(id) {
    try {
      const res = await ctx.api.request({
        url: `quotations:get`,
        params: {
          filterByTk: id,
          appends: ["lead", "customers", "internalCompany"],
        },
      });
      return res?.data?.data || res?.data || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async function fetchServices(quotationId) {
    try {
      const res = await ctx.api.request({
        url: "quotationServices:list",
        params: {
          pageSize: 100,
          page: 1,
          filter: JSON.stringify({ quotationId: { $eq: parseInt(quotationId) } }),
        },
      });
      return res?.data?.data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async function fetchCurrencies() {
    return fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES);
  }

  async function fetchExchangeRates() {
    return fetchAllFromCandidates(EXCHANGE_RATE_RESOURCE_CANDIDATES, {
      appends: ["fromCurrency", "toCurrency"],
    });
  }

  async function fetchServiceDetails(serviceIds) {
    if (!serviceIds.length) return {};
    try {
      const res = await ctx.api.request({
        url: "services:list",
        params: {
          pageSize: 500,
          page: 1,
          filter: JSON.stringify({ id: { $in: serviceIds } }),
          appends: [SERVICE_TASK_RELATION],
        },
      });
      const map = {};
      (res?.data?.data || []).forEach((s) => {
        map[s.id] = s;
      });
      return map;
    } catch {
      return {};
    }
  }

  // Helper to get the next fileIndex for a folder or record (synchronized with folders)
  async function getNextFileIndex(folderId, collectionName, recordId) {
    try {
      const docFilter = folderId
        ? { folderId: { $eq: folderId } }
        : { collectionName: { $eq: collectionName }, recordId: { $eq: parseInt(recordId) } };
      
      const folderFilter = folderId
        ? { parentId: { $eq: folderId } }
        : { quotationId: { $eq: parseInt(recordId) } }; // In Quotation mode, root folders have quotationId

      const [dRes, fRes] = await Promise.all([
        ctx.api.request({
          url: "documents:list",
          params: {
            pageSize: 1,
            filter: JSON.stringify(docFilter),
            sort: ["-fileIndex"],
          },
        }),
        ctx.api.request({
          url: "folders:list",
          params: {
            pageSize: 1,
            filter: JSON.stringify(folderFilter),
            sort: ["-folderIndex"],
          },
        }),
      ]);

      const lastDoc = dRes?.data?.data?.[0]?.fileIndex || 0;
      const lastFolder = fRes?.data?.data?.[0]?.folderIndex || 0;

      return Math.max(lastDoc, lastFolder) + 1;
    } catch (e) {
      console.warn("Failed to get next fileIndex:", e);
      return 1;
    }
  }

  // Same de-dup convention used across the Document module (Library.js,
  // CaseDocument.js, TaskDetailView.js): on a case-insensitive title
  // collision, append " (1)", " (2)", ... — never silently overwrite.
  const getUniqueFileName = (fileName, existingNames) => {
    const raw = String(fileName || "").trim();
    if (!raw) return raw;
    const taken = new Set(
      Array.from(existingNames || [], (n) => String(n || "").trim().toLowerCase()),
    );
    if (!taken.has(raw.toLowerCase())) return raw;
    const dotIndex = raw.lastIndexOf(".");
    const base = dotIndex > 0 ? raw.slice(0, dotIndex) : raw;
    const ext = dotIndex > 0 ? raw.slice(dotIndex) : "";
    let counter = 1;
    let candidate = `${base} (${counter})${ext}`;
    while (taken.has(candidate.toLowerCase())) {
      counter += 1;
      candidate = `${base} (${counter})${ext}`;
    }
    return candidate;
  };

  // Titles already used by this quotation's saved documents — same
  // folderId-first / collectionName+recordId-fallback scoping as
  // getNextFileIndex above, so "duplicate" means the same thing in both
  // places.
  async function fetchExistingDocumentTitles(folderId, collectionName, recordId) {
    try {
      const docFilter = folderId
        ? { $and: [{ folderId: { $eq: folderId } }, { isDeleted: { $ne: true } }] }
        : {
            $and: [
              { collectionName: { $eq: collectionName } },
              { recordId: { $eq: parseInt(recordId) } },
              { isDeleted: { $ne: true } },
            ],
          };
      const res = await ctx.api.request({
        url: "documents:list",
        params: {
          pageSize: 500,
          page: 1,
          filter: JSON.stringify(docFilter),
          fields: "id,title",
        },
      });
      return (res?.data?.data || []).map((d) => d.title).filter(Boolean);
    } catch (e) {
      console.warn("Failed to fetch existing document titles:", e);
      return [];
    }
  }

  // ==================== STAGE FLOW (quotation status stepper) ====================
  const ALL_STAGES = [
    { key: "new", label: "New Quotation", requireApproval: false },
    { key: "pending", label: "Pending", requireApproval: true },
    { key: "approval", label: "Approved", requireApproval: true },
    { key: "rejected", label: "Rejected", requireApproval: true },
    { key: "sent", label: "Quotation Sent", requireApproval: false },
    { key: "order", label: "Order", requireApproval: false },
    { key: "cancelled", label: "Cancelled", requireApproval: false },
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

  // Merged into this file (was its own standalone block) so the status
  // stepper and the DOCX-generator toolbar share ONE `data` state instead of
  // two independent fetches — `record`/`onUpdated` are props from
  // QuotationDocxGenerator (its already-fetched `data` + its `loadData`)
  // rather than read from ctx.record/URL parsing directly. This is what
  // makes the "+ New Contract"/"+ New Case" buttons' isOrderStatus gate
  // react instantly the moment a stage transition here succeeds, with no
  // dependency on ctx.refresh (not confirmed available in this block
  // context — mirrors the ctx.on fix already applied in
  // ContractDocxGenerator.js).
  const QuotationStageFlow = ({ record, onUpdated }) => {
    const recordId = record?.id;

    const [localStatus, setLocalStatus] = useState(record?.status || "new");
    const [isRequiredApproval, setIsRequiredApproval] = useState(
      !!record?.isRequiredApproval,
    );
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [rejectError, setRejectError] = useState("");
    const [pendingReject, setPendingReject] = useState(false);

    const syncStatusToForm = useCallback((nextValues) => {
      if (!nextValues?.status) return;

      if (ctx.form?.setFieldsValue) {
        ctx.form.setFieldsValue(nextValues);
      }

      if (ctx.model) {
        ctx.model.__quotationStatusValue = nextValues.status;
        ctx.model.__quotationStatusPatch = nextValues;
      }
    }, []);

    // Stay in sync with the parent's `data` — it's the authoritative,
    // freshly-fetched quotation record now (re-fetched via onUpdated after
    // every successful transition below), so this bar never goes stale the
    // way relying on a one-time ctx.record snapshot would.
    useEffect(() => {
      const nextStatus = record?.status || "new";
      setLocalStatus(nextStatus);
      syncStatusToForm({ status: nextStatus });
    }, [record?.status, syncStatusToForm]);

    useEffect(() => {
      setIsRequiredApproval(!!record?.isRequiredApproval);
    }, [record?.isRequiredApproval]);

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
            url: "quotations:update",
            method: "POST",
            params: { filterByTk: recordId },
            data: payload,
          });

          setLocalStatus(newStatus);
          syncStatusToForm(payload);
          message.success(
            `Đã cập nhật: ${ALL_STAGES.find((s) => s.key === newStatus)?.label}`,
          );
          // Refetch the shared quotation record instead of the previous
          // ctx.refresh() call — that API isn't confirmed available in this
          // block context, and this also keeps the DOCX-generator half's
          // `data` (and isOrderStatus) in sync in the same round trip.
          if (onUpdated) await onUpdated();
        } catch {
          message.error("Cập nhật thất bại");
        }
      },
      [recordId, syncStatusToForm, onUpdated],
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
      <div style={{ padding: "12px 16px 4px" }}>
        <Steps
          size="small"
          current={displayIndex}
          status={overallStepsStatus}
          items={stepsItems}
        />

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
              {rejectError}
            </div>
          )}
        </Modal>
      </div>
    );
  };

  // ==================== MAIN COMPONENT ====================
  const QuotationDocxGenerator = () => {
    const [data, setData] = useState(null);
    const [services, setServices] = useState([]);
    const [svcDetails, setSvcDetails] = useState({});
    const [currencies, setCurrencies] = useState([]);
    const [exchangeRates, setExchangeRates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Track separate loading states
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    // Preview States
    const [previewBlob, setPreviewBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewFileName, setPreviewFileName] = useState("");
    const [previewAttId, setPreviewAttId] = useState(null);

    // Version-note confirm — shown only when Save to Documents detects the
    // generated title already exists (see handleSaveDoc). Bridges the
    // async save flow to a user decision via a Promise: promptVersionNote()
    // opens the modal and suspends until the user confirms (resolves with
    // their trimmed note) or cancels (resolves with null, aborting the save).
    const [versionNoteModalOpen, setVersionNoteModalOpen] = useState(false);
    const [versionNoteValue, setVersionNoteValue] = useState("");
    const [versionNoteError, setVersionNoteError] = useState("");
    const versionNoteResolverRef = useRef(null);

    const promptVersionNote = () =>
      new Promise((resolve) => {
        versionNoteResolverRef.current = resolve;
        setVersionNoteValue("");
        setVersionNoteError("");
        setVersionNoteModalOpen(true);
      });

    const handleConfirmVersionNote = () => {
      const trimmed = versionNoteValue.trim();
      if (!trimmed) {
        setVersionNoteError("Vui lòng nhập tóm tắt nội dung điều chỉnh");
        return;
      }
      setVersionNoteModalOpen(false);
      versionNoteResolverRef.current?.(trimmed);
      versionNoteResolverRef.current = null;
    };

    const handleCancelVersionNote = () => {
      setVersionNoteModalOpen(false);
      versionNoteResolverRef.current?.(null);
      versionNoteResolverRef.current = null;
    };

    // 1. Load Data
    const loadData = useCallback(async () => {
      if (!RECORD_ID) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [q, svcs, currs, rates] = await Promise.all([
          fetchQuotation(RECORD_ID),
          fetchServices(RECORD_ID),
          fetchCurrencies(),
          fetchExchangeRates(),
        ]);
        setData(q);
        setServices(svcs);
        setCurrencies(currs);
        setExchangeRates(rates);

        if (svcs.length) {
          const ids = [...new Set(svcs.map((s) => s.serviceId).filter(Boolean))];
          const details = await fetchServiceDetails(ids);
          setSvcDetails(details);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      loadData();
    }, [loadData]);

    // 2. Shared Error Handling
    const showErrorModal = (error) => {
      console.error("Error details (Raw):", error);

      let errorMsg = error.message || "Unknown error";
      let errorDetails = "";

      if (error.properties && error.properties.errors) {
        errorDetails = error.properties.errors
          .map((e) => {
            return e.properties
              ? e.properties.explanation || e.message
              : e.message;
          })
          .join("\n\n");
      } else {
        try {
          const rawObj = Object.getOwnPropertyNames(error).reduce((acc, key) => {
            acc[key] = error[key];
            return acc;
          }, {});
          errorDetails = JSON.stringify(rawObj, null, 2);
        } catch (e) {}
      }

      Modal.error({
        title: "Document Generation Error Analysis",
        content: React.createElement(
          "div",
          {
            style: {
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "500px",
              overflowY: "auto",
              fontSize: "13px",
            },
          },
          React.createElement("strong", { style: { color: "red" } }, errorMsg),
          React.createElement("br"),
          React.createElement("br"),
          errorDetails,
        ),
        width: 700,
      });
    };

    // 3. Core Logic: Generate Blob
    const buildDocxBlob = async () => {
      if (!data) throw new Error("Quotation data is missing.");

      // Load External Libs
      const PizZipModule = await ctx.importAsync("https://esm.sh/pizzip@3.1.4");
      const PizZip = PizZipModule.default || PizZipModule;

      const DocxModule = await ctx.importAsync(
        "https://esm.sh/docxtemplater@3.37.11",
      );
      const Docxtemplater = DocxModule.default || DocxModule;

      if (!PizZip || !Docxtemplater) {
        throw new Error("Failed to load document processing libraries.");
      }

      // Map Variables
      const isPackageMode =
        String(data.pricingMode || "").toLowerCase() === "package";
      let subTotal = 0,
        vatAmount = 0,
        totalAmount = 0;

      // Every amount in the generated document is denominated in VND (the
      // template hardcodes "Phí dịch vụ (VND)"), so a line service quoted in
      // another currency (USD, SGD, ...) must be converted before it's summed
      // into the document totals.
      const vndCurrency = findDefaultCurrency(currencies);
      const vndCurrencyId = extractCurrencyId(vndCurrency);
      const missingRateNames = [];

      const mappedServices = services.map((s, index) => {
        const detail = svcDetails[s.serviceId] || {};
        const name = s.serviceName || detail.serviceName || (s.serviceId ? `Service #${s.serviceId}` : "Dịch vụ tự nhập");
        const serviceDescription = s.description || detail.description || "";
        const qty = Number(s.quantity) || 1;
        const price = Number(s.basePrice) || 0;
        const vatPct = Number(s.vat) || 0;
        const sLineRaw = price * qty;
        const vLineRaw = (sLineRaw * vatPct) / 100;

        const lineCurrencyId = getRecordCurrencyId(s);
        const lineCurrencyCode = extractCurrencyCode(s.currency || s.currencies);
        let priceConverted = price;
        let sLine = sLineRaw;
        let vLine = vLineRaw;
        if (
          !isPackageMode &&
          lineCurrencyId &&
          vndCurrencyId &&
          lineCurrencyId !== vndCurrencyId
        ) {
          const rate = findConversionRate(
            exchangeRates,
            lineCurrencyId,
            lineCurrencyCode,
            vndCurrencyId,
            DEFAULT_CURRENCY_CODE,
          );
          if (rate) {
            priceConverted = price * rate;
            sLine = sLineRaw * rate;
            vLine = vLineRaw * rate;
          } else {
            missingRateNames.push(name);
          }
        }

        const estimatedDays =
          s.workingDays ||
          detail.workingDays ||
          s.estimatedDays ||
          detail.estimatedDays ||
          "...";

        const rawTasks =
          detail[SERVICE_TASK_RELATION] || s[SERVICE_TASK_RELATION];
        const tasksArray = rawTasks
          ? Array.isArray(rawTasks)
            ? rawTasks
            : [rawTasks]
          : [];

        let tasksText = "";
        let tasksData = [];
        if (tasksArray.length > 0) {
          tasksText = tasksArray
            .map((t) => {
              const tName = t[TASK_NAME_FIELD] || t.title || t.name || "Task";
              const tDesc = (
                t.description ||
                t.taskDescription ||
                t.note ||
                ""
              ).trim();
              return tDesc ? `- ${tName}\n  Mô tả: ${tDesc}` : `- ${tName}`;
            })
            .join("\n");

          tasksData = tasksArray.map((t) => ({
            name: t[TASK_NAME_FIELD] || t.title || t.name || "Task",
            description: t.description || t.taskDescription || t.note || "",
          }));
        } else {
          tasksText = "- (No specific tasks configured)";
        }

        if (!isPackageMode) {
          subTotal += sLine;
          vatAmount += vLine;
          totalAmount += sLine + vLine;
        }

        return {
          stt: index + 1,
          service_name: name,
          serviceName: name,
          description: serviceDescription,
          tasks_list: tasksText,
          tasksList: tasksText,
          tasks: tasksData,
          estimated_days: estimatedDays,
          estimatedDays: estimatedDays,
          quantity: qty,
          price: isPackageMode ? "Đã bao gồm trong gói" : Math.round(priceConverted).toLocaleString("en-US"),
          total: isPackageMode ? "" : Math.round(sLine).toLocaleString("en-US"),
        };
      });

      if (isPackageMode) {
        subTotal = Number(data.subTotal) || 0;
        vatAmount = Number(data.vatAmount) || 0;
        totalAmount = Number(data.totalAmount) || 0;

        const quotationCurrencyId = getRecordCurrencyId(data);
        const quotationCurrencyCode = extractCurrencyCode(
          data.currency || data.currencies,
        );
        if (
          quotationCurrencyId &&
          vndCurrencyId &&
          quotationCurrencyId !== vndCurrencyId
        ) {
          const rate = findConversionRate(
            exchangeRates,
            quotationCurrencyId,
            quotationCurrencyCode,
            vndCurrencyId,
            DEFAULT_CURRENCY_CODE,
          );
          if (rate) {
            subTotal *= rate;
            vatAmount *= rate;
            totalAmount *= rate;
          } else {
            missingRateNames.push("Tổng giá trị gói dịch vụ");
          }
        }
      }

      subTotal = Math.round(subTotal);
      vatAmount = Math.round(vatAmount);
      totalAmount = Math.round(totalAmount);

      if (missingRateNames.length) {
        message.warning(
          `Thiếu tỷ giá quy đổi sang VND cho: ${missingRateNames.join(", ")} — số tiền được giữ nguyên theo tiền tệ gốc trong file.`,
        );
      }

      const currentDate = new Date();
      const dd = String(currentDate.getDate()).padStart(2, "0");
      const mm = String(currentDate.getMonth() + 1).padStart(2, "0");
      const yyyy = currentDate.getFullYear();

      const targetCustomer = data.customers || data.lead || {};
      const actualCustomer = Array.isArray(targetCustomer)
        ? targetCustomer[0]
        : targetCustomer;

      // Lấy tên ngắn gọn (Ưu tiên nhập thủ công, không tách ký tự)
      const finalShortName =
        actualCustomer.shortName ||
        actualCustomer.fullName ||
        actualCustomer.customerName ||
        actualCustomer.companyName ||
        "Customer";

      // Tạo document_title để bơm vào Word
      const sttPart = data.quotationNumber || String(data.id);
      const documentTitle = `${sttPart} / Proposal / CBI - ${finalShortName}`;

      const company = data.internalCompany || {};
      let cName = company.shortName;
      if (cName === "undefined") cName = null;

      if (!cName && company.name) {
        const cNameParts = company.name.trim().split(/\s+/);
        cName = cNameParts.pop();
      }
      const finalShortCompanyName = cName || "Law Firm";

      const templateData = {
        document_title: documentTitle,
        customer_name:
          actualCustomer.fullName ||
          actualCustomer.customerName ||
          actualCustomer.companyName ||
          "Customer",
        customer_short_name: finalShortName,
        company_name: company.shortName || finalShortCompanyName,
        short_name_company: finalShortCompanyName,
        quotation_number: sttPart,
        date: currentDate.toLocaleDateString("en-GB"),
        date_day: dd,
        date_month: mm,
        date_year: yyyy,
        overview:
          data.serviceDescription ||
          data.description ||
          data.snapshotOverview ||
          "No overview information available",
        services: mappedServices,
        sub_total: subTotal.toLocaleString("en-US") + " VND",
        vat_amount: vatAmount.toLocaleString("en-US") + " VND",
        grand_total: subTotal.toLocaleString("en-US") + " VND",
        total_with_vat: totalAmount.toLocaleString("en-US") + " VND",
        is_line_pricing: !isPackageMode,
        isLinePricing: !isPackageMode,
        is_package_pricing: isPackageMode,
        isPackagePricing: isPackageMode,
      };

      // Fetch Template Blob
      if (!data.templateId) {
        throw new Error(
          "No template assigned to this quotation. Please update the quotation record first.",
        );
      }

      const tmplRes = await ctx.api.request({
        url: `${TEMPLATE_COLLECTION_NAME}:get`,
        params: {
          filterByTk: data.templateId,
          appends: [TEMPLATE_FILE_FIELD],
        },
      });

      const selectedTmpl = tmplRes?.data?.data;
      if (!selectedTmpl) {
        throw new Error("Assigned template could not be found in the database!");
      }

      const attachmentObj = selectedTmpl[TEMPLATE_FILE_FIELD];
      const templateUrl = Array.isArray(attachmentObj)
        ? attachmentObj[0]?.url
        : attachmentObj?.url;

      if (!templateUrl)
        throw new Error(
          `Template has no attached file ('${TEMPLATE_FILE_FIELD}')!`,
        );

      const response = await ctx.api.request({
        url: templateUrl,
        method: "GET",
        responseType: "arraybuffer",
        baseURL: "/",
      });
      const arrayBuffer = response.data;

      // Render DOCX
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{{", end: "}}" },
      });

      doc.render(templateData);

      const generatedBlob = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const fileName = `Proposal_${templateData.quotation_number}_${Date.now()}.docx`;

      return { generatedBlob, fileName };
    };

    // 4. Action: Preview (via MS Office Online Plugin Logic)
    const handlePreview = async () => {
      setGenerating(true);
      try {
        const { generatedBlob, fileName } = await buildDocxBlob();

        // Upload temporary file to attachments so we get a public URL for MS Office Preview
        const formData = new window.FormData();
        formData.append("file", generatedBlob, fileName);
        const uploadRes = await ctx.api.request({
          url: "attachments:create",
          method: "POST",
          data: formData,
          headers: { "Content-Type": "multipart/form-data" },
        });

        let attUrl = uploadRes?.data?.data?.url;
        if (!attUrl)
          throw new Error("Failed to upload temporary file for preview.");

        // Ensure URL is absolute for Microsoft Viewer to parse
        let fullUrl = attUrl;
        if (fullUrl.startsWith("/")) {
          fullUrl = window.location.origin + fullUrl;
        }

        // Save state to trigger Modal
        setPreviewBlob(generatedBlob);
        setPreviewUrl(fullUrl);
        setPreviewFileName(fileName);
        setPreviewAttId(uploadRes?.data?.data?.id); // Keep ID so if they save, we just link it
      } catch (error) {
        showErrorModal(error);
      } finally {
        setGenerating(false);
      }
    };

    // "+ New Contract" / "+ New Case" — open their configured popup views.
    // Both UIDs are left blank in POPUP_UID_CONTRACT/POPUP_UID_CASE above;
    // fill them in once the corresponding Nocobase views are set up.
    const handleNewContract = async () => {
      if (!POPUP_UID_CONTRACT) {
        message.warning("Chưa cấu hình Popup UID");
        return;
      }
      await ctx.openView(POPUP_UID_CONTRACT, {
        mode: "dialog",
        size: "large",
        navigation: false,
      });
    };

    const handleNewCase = async () => {
      if (!POPUP_UID_CASE) {
        message.warning("Chưa cấu hình Popup UID");
        return;
      }
      await ctx.openView(POPUP_UID_CASE, {
        mode: "dialog",
        size: "large",
        navigation: false,
      });
    };

    // 5. Action: Save to Documents
    const handleSaveDoc = async () => {
      setSaving(true);
      try {
        let attId = previewAttId;
        let fileName = previewFileName;

        // If we haven't previewed/uploaded yet, do it now
        if (!attId) {
          const { generatedBlob, fileName: genName } = await buildDocxBlob();
          fileName = genName;
          const formData = new window.FormData();
          formData.append("file", generatedBlob, fileName);

          const uploadRes = await ctx.api.request({
            url: "attachments:create",
            method: "POST",
            data: formData,
            headers: { "Content-Type": "multipart/form-data" },
          });

          attId = uploadRes?.data?.data?.id;
          if (!attId) throw new Error("Failed to upload the generated file.");
        }

        // Fetch Folder ID, User & Save to Documents
        let targetFolderId = null;
        try {
          const folderRes = await ctx.api.request({
            url: "folders:list",
            params: {
              filter: JSON.stringify({
                quotationId: { $eq: parseInt(RECORD_ID) },
              }),
              pageSize: 1,
            },
          });
          targetFolderId = folderRes?.data?.data?.[0]?.id || null;
        } catch (fErr) {
          console.warn("Could not find quotation folder:", fErr);
        }

        let currentUser = null;
        try {
          const authRes = await ctx.api.request({
            url: "auth:check",
            method: "GET",
          });
          currentUser = authRes?.data?.data || authRes?.data;
        } catch (e) {
          console.warn("Failed to retrieve Current User", e);
        }

        // Fetch Fresh Data with Appends to ensure we have Lead/Customer info
        let freshData = data;
        try {
          const freshRes = await ctx.api.request({
            url: `quotations:get`,
            params: {
              filterByTk: RECORD_ID,
              appends: ["lead", "customers", "internalCompany"],
            },
          });
          freshData = freshRes?.data?.data || freshRes?.data || data;
        } catch (e) {
          console.warn("Failed to fetch fresh quotation data for title:", e);
        }

        // Tổng hợp tiêu đề theo cấu trúc: STT + Month + Year / Loại VB / CBI - Tên KH
        const sttPart = freshData.quotationNumber || String(RECORD_ID);
        const docTypePart = "Proposal";
        const internalCo = "CBI";
        // Xác định đối tượng khách hàng (Dùng 'customers' theo đúng schema bạn gửi)
        const rawCustomer = freshData.customers || freshData.lead || {};
        const targetCustomer = Array.isArray(rawCustomer)
          ? rawCustomer[0]
          : rawCustomer;

        console.log("Debug: Fresh targetCustomer for Title:", targetCustomer);

        const customerShortName =
          targetCustomer?.shortName ||
          targetCustomer?.fullName ||
          targetCustomer?.customerName ||
          targetCustomer?.companyName ||
          targetCustomer?.contactName ||
          "Customer";

        const rawDocumentTitle = `${sttPart} / ${docTypePart} / ${internalCo} - ${customerShortName}`;
        // Re-running "Save to Documents" on the same quotation regenerates
        // the exact same title every time — without this check, that would
        // silently create an indistinguishable duplicate document instead
        // of a new version.
        const existingTitles = await fetchExistingDocumentTitles(
          targetFolderId,
          "Quotation",
          RECORD_ID,
        );
        const isDuplicateTitle = existingTitles.some(
          (t) => String(t).trim().toLowerCase() === rawDocumentTitle.trim().toLowerCase(),
        );

        // A duplicate title means this quotation already has a saved
        // document under the exact same name — ask the user to describe
        // what changed before silently minting a new version, so the
        // version history stays meaningful instead of just "(1)", "(2)"...
        let versionChangeNote = "";
        if (isDuplicateTitle) {
          const enteredNote = await promptVersionNote();
          if (enteredNote === null) {
            setSaving(false);
            return;
          }
          versionChangeNote = enteredNote;
        }

        const documentTitle = getUniqueFileName(rawDocumentTitle, existingTitles);
        const nextFileIndex = await getNextFileIndex(targetFolderId, "Quotation", RECORD_ID);
        const autoNote = `Auto-generated from Template by ${currentUser?.nickname || currentUser?.username || "System"} at ${new Date().toLocaleTimeString("en-GB")} on ${new Date().toLocaleDateString("en-GB")}`;

        await ctx.api.request({
          url: "quotations/" + RECORD_ID + "/documents:create",
          method: "POST",
          data: {
            collectionName: "Quotation",
            recordId: parseInt(RECORD_ID),
            documentType: docTypePart,
            folderId: targetFolderId,
            title: documentTitle,
            fileIndex: nextFileIndex,
            note: autoNote,
            // "Tóm tắt nội dung" (documents.description) — what the user
            // entered in the version-note prompt above when this save
            // collided with an existing title. Empty on a first-time save.
            description: versionChangeNote || undefined,
            fileAttachment: { id: attId },
            createdById: currentUser?.id,
            updatedById: currentUser?.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });

        message.success("Document generated and saved successfully!");

        // Close preview if open
        setPreviewUrl(null);
        setPreviewAttId(null);
        setPreviewBlob(null);
      } catch (error) {
        showErrorModal(error);
      } finally {
        setSaving(false);
      }
    };

    const resetPreview = () => {
      setPreviewUrl(null);
      setPreviewAttId(null);
      setPreviewBlob(null);
    };

    // ── Render UI ──
    const btnStyle = {
      cursor: "pointer",
      fontSize: 13,
      padding: "8px 20px",
      borderRadius: 6,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontWeight: 600,
      background: "#fff",
      border: "1px solid #1a3a5c",
      color: "#1a3a5c",
      transition: "all 0.15s",
    };

    if (!RECORD_ID)
      return React.createElement(
        "div",
        { style: { padding: 16 } },
        "Record ID not found.",
      );
    if (loading)
      return React.createElement(
        "div",
        { style: { padding: 16, textAlign: "center" } },
        React.createElement(Spin),
      );
    if (!data)
      return React.createElement(
        "div",
        { style: { padding: 16 } },
        "Failed to load data.",
      );

    // "+ New Contract"/"+ New Case" only make sense once the quotation has
    // actually been confirmed as an Order — offering them earlier (draft/
    // pending/sent/etc.) would let a Contract/Case get created against a
    // quotation that might still change.
    const isOrderStatus = String(data?.status || "").trim().toLowerCase() === "order";
    // Preview/Save both call buildDocxBlob(), which throws immediately if
    // data.templateId is missing — hide the buttons instead of letting the
    // user hit that error modal on click.
    const hasTemplate = !!data?.templateId;

    const btnPreview = Object.assign({}, btnStyle, {
      opacity: generating ? 0.7 : 1,
      cursor: generating ? "not-allowed" : "pointer",
    });

    const btnSave = Object.assign({}, btnStyle, {
      background: saving ? "#8c8c8c" : "#1a3a5c",
      color: "#fff",
      border: "none",
      opacity: saving ? 0.7 : 1,
      cursor: saving ? "not-allowed" : "pointer",
    });

    return React.createElement(
      "div",
      null,
      // ==================== STAGE FLOW — full-width status stepper on top ====================
      React.createElement(
        "div",
        { style: { borderBottom: "1px solid #f0f0f0" } },
        React.createElement(QuotationStageFlow, { record: data, onUpdated: loadData }),
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "16px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          },
        },
        hasTemplate &&
          React.createElement(
            "button",
            {
              onClick: handlePreview,
              disabled: generating || saving,
              style: btnPreview,
            },
            generating ? "Generating..." : "Preview Quotation",
          ),
        hasTemplate &&
          React.createElement(
            "button",
            {
              onClick: handleSaveDoc,
              disabled: generating || saving,
              style: btnSave,
            },
            saving ? "Saving..." : "Save to Documents",
          ),
        isOrderStatus &&
          React.createElement(
            "button",
            {
              onClick: handleNewContract,
              disabled: generating || saving,
              style: btnStyle,
            },
            "+ New Contract",
          ),
        
        // React.createElement(
        //   "button",
        //   {
        //     onClick: loadData,
        //     disabled: generating || saving,
        //     style: btnStyle,
        //   },
        //   "Refresh",
        // ),
      ),

      // ==================== MODAL PREVIEW ====================
      React.createElement(
        Modal,
        {
          title: "Preview Quotation Document (Microsoft Office Online)",
          open: !!previewUrl,
          onCancel: resetPreview,
          width: "85%",
          centered: true,
          footer: [
            React.createElement(
              "button",
              {
                key: "close",
                onClick: resetPreview,
                style: Object.assign({}, btnStyle, { marginRight: 8 }),
              },
              "Close",
            ),
            React.createElement(
              "button",
              {
                key: "download",
                onClick: () => {
                  const url = URL.createObjectURL(previewBlob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "Preview_" + previewFileName;
                  a.click();
                  URL.revokeObjectURL(url);
                },
                style: Object.assign({}, btnStyle, {
                  background: "#e6f7ff",
                  color: "#096dd9",
                  borderColor: "#91d5ff",
                  marginRight: 8,
                }),
              },
              "Download DOCX",
            ),
            React.createElement(
              "button",
              {
                key: "save",
                onClick: handleSaveDoc,
                disabled: saving,
                style: btnSave,
              },
              saving ? "Saving..." : "Save to System",
            ),
          ],
          bodyStyle: { padding: 0, height: "70vh" },
        },
        previewUrl
          ? React.createElement("iframe", {
              src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`,
              width: "100%",
              height: "100%",
              frameBorder: "0",
            })
          : null,
      ),

      // ==================== MODAL: VERSION CHANGE NOTE ====================
      React.createElement(
        Modal,
        {
          title: "Tài liệu đã tồn tại — nhập tóm tắt điều chỉnh",
          open: versionNoteModalOpen,
          onOk: handleConfirmVersionNote,
          onCancel: handleCancelVersionNote,
          okText: "Xác nhận lưu phiên bản mới",
          cancelText: "Huỷ",
          destroyOnClose: true,
        },
        React.createElement(
          "p",
          { style: { marginBottom: 8, fontSize: 13, color: "#595959" } },
          "Tài liệu này đã tồn tại trong hệ thống. Vui lòng nhập tóm tắt nội dung điều chỉnh để lưu thành phiên bản mới.",
        ),
        React.createElement(Input.TextArea, {
          rows: 4,
          placeholder: "Ví dụ: Cập nhật lại phí dịch vụ mục 2, sửa thông tin khách hàng...",
          value: versionNoteValue,
          onChange: (e) => {
            setVersionNoteValue(e.target.value);
            setVersionNoteError("");
          },
          status: versionNoteError ? "error" : "",
        }),
        versionNoteError &&
          React.createElement(
            "div",
            { style: { color: "#ff4d4f", fontSize: 12, marginTop: 4 } },
            versionNoteError,
          ),
      ),
    );
  };

  ctx.render(React.createElement(QuotationDocxGenerator));
