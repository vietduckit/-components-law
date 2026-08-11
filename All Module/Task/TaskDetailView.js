  // ============================================================
  // §1 CONFIG — không import, không side-effect
  // ============================================================
  const { React } = ctx;
  const { useState, useEffect, useCallback, useMemo, useRef } = React;
  const {
    Spin,
    Typography,
    Select,
    message,
    Modal,
    Tag,
    Upload,
    Form,
    Input,
    Button,
    Table,
    Tooltip,
    Drawer,
    Tabs,
    Descriptions,
    Space,
    Empty,
    Mentions,
    Avatar,
    TreeSelect,
    Dropdown,
  } = ctx.antd;
  const { Text } = Typography;
  const { Dragger } = Upload;

  const PROJECT_ID = ctx.record?.id;
  const TASK_DETAIL_CHANGE_EVENT = "law-task-detail:changed";
  const CASE_DOCUMENT_SCOPE = "case_document";
  const LEGAL_STUDY_MODULE_SCOPE = "legal_study";
  const LEGAL_STUDY_STORAGE_TYPE = "legal_study";
  const LEGAL_STUDY_LABEL = "Legal Study";
  const LEGAL_REFERENCE_MODULE_SCOPE = "legal_reference";
  const LEGAL_REFERENCE_STORAGE_TYPE = "legal_reference";
  const LEGAL_REFERENCE_LABEL = "Legal Reference";
  const MY_DOCUMENT_STORAGE_TYPE = "personal";
  const LIBRARY_DESTINATION = {
    LEGAL_STUDY: "legal_study",
    LEGAL_REFERENCE: "legal_reference",
    CASE_DOCUMENT: "case_document",
    KNOWLEDGE: "knowledge",
  };
  const LIBRARY_DESTINATION_CONFIG = {
    [LIBRARY_DESTINATION.LEGAL_STUDY]: {
      label: LEGAL_STUDY_LABEL,
      moduleScope: LEGAL_STUDY_MODULE_SCOPE,
      storageType: LEGAL_STUDY_STORAGE_TYPE,
      relationField: "legalStudyId",
      listCandidates: [
        "legalStudy:list",
        "legalStudies:list",
        "LegalStudy:list",
      ],
    },
    [LIBRARY_DESTINATION.LEGAL_REFERENCE]: {
      label: LEGAL_REFERENCE_LABEL,
      moduleScope: LEGAL_REFERENCE_MODULE_SCOPE,
      storageType: LEGAL_REFERENCE_STORAGE_TYPE,
      relationField: "legalReferenceId",
      listCandidates: [
        "legalReference:list",
        "legalReferences:list",
        "LegalReference:list",
      ],
    },
    // No "parent record" picker step — the parent is always the current
    // case (sourceContext.caseId). Only the folder-tree picker applies.
    [LIBRARY_DESTINATION.CASE_DOCUMENT]: {
      label: "Document",
      moduleScope: CASE_DOCUMENT_SCOPE,
      storageType: "cases",
      relationField: "folderId",
      listCandidates: [],
    },
    // Company-level Knowledge library (matches Library.js's Knowledge
    // space — storageType/moduleScope "knowledge"). No "parent record"
    // picker either: Knowledge isn't scoped to a single case/company the
    // way Legal Study/Reference are scoped to one record, so the folder
    // tree lists every Knowledge folder directly and internalCompanyId is
    // inherited from whichever folder gets picked (see LibraryMoveModal).
    [LIBRARY_DESTINATION.KNOWLEDGE]: {
      label: "Library",
      moduleScope: "knowledge",
      storageType: "knowledge",
      relationField: "folderId",
      listCandidates: [],
    },
  };
  const LIBRARY_SOURCE = {
    CASE_DOCUMENT: "case_document",
    CASE_REFERENCE: "case_reference",
    LEGAL_REFERENCE: "legal_reference",
    LEGAL_STUDY: "legal_study",
    MY_DOCUMENTS: "my_documents",
  };
  const ACTIVITY_ACTION = {
    LINK_LEGAL_STUDY: "link_legal_study",
    LINK_LEGAL_REFERENCE: "link_legal_ref",
    MOVE_TO_CASE_DOCUMENT: "move_to_case_document",
    MOVE_TO_KNOWLEDGE: "move_to_knowledge",
  };
  const FONT =
    "Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const COL = {
    stt: 38,
    toggle: 24,
    updatedAt: 125,
    desc: 190,
    nextStep: 155,
    start: 88,
    deadline: 88,
    assign: 150,
    approval: 28,
    menu: 32,
    pendingIssue: 148,
    files: 72,
  };

  // 🌟 CONFIG URL DEEP-LINK CHO BÌNH LUẬN (Gán cứng các UID Route để dễ bảo trì)
  const originURL = window.location.origin;

  const DEEP_LINK_CONFIG = {
    // 1. Host và đường dẫn Admin
    ORIGIN: originURL,
    ADMIN_PATH: "admin/aoy5h2zeeq3",

    // 2. UID của View và Tab chính (Nơi chứa danh sách Task)
    MAIN_VIEW: "view/dq2npsytcgh",
    MAIN_TAB: "tab/1tj9l1v5l8t",

    // 3. UID của View Task Detail (Giao diện Modal/Drawer hiện tại)
    TASK_VIEW: "view/a5c9c251a6a",

    // 3b. UID của View Case Detail (Trang chi tiết vụ việc)
    CASE_VIEW: "view/20q5aaq1zkf",

    // 3c. Admin path & UID của View Internal Project Detail (app riêng)
    INTERNAL_PROJECT_ADMIN_PATH: "admin/svsft7j86ku",
    INTERNAL_PROJECT_VIEW: "view/363e970fb7f",

    // 4. Các từ khóa định nghĩa segment
    KW_FILTER: "filterbytk",
    KW_SOURCE: "sourceid",

    // 5. Hàm lắp ghép URL (Hardcoded Structure)
    buildUrl: (taskId, caseId) => {
      const {
        ORIGIN,
        ADMIN_PATH,
        MAIN_VIEW,
        MAIN_TAB,
        TASK_VIEW,
        KW_FILTER,
        KW_SOURCE,
      } = DEEP_LINK_CONFIG;

      // Lắp ghép theo đúng cấu trúc: Origin/Admin/MainView/Tab/CaseFilter/TaskView/TaskFilter/Source
      return [
        ORIGIN,
        ADMIN_PATH,
        MAIN_VIEW,
        MAIN_TAB,
        `${KW_FILTER}/${caseId}`,
        TASK_VIEW,
        `${KW_FILTER}/${taskId}`,
        `${KW_SOURCE}/${caseId}`,
      ].join("/");
    },

    // 6. Hàm lắp ghép URL đi thẳng tới trang chi tiết vụ việc (Case)
    buildCaseUrl: (caseId) => {
      const { ORIGIN, ADMIN_PATH, CASE_VIEW, KW_FILTER } = DEEP_LINK_CONFIG;
      return [ORIGIN, ADMIN_PATH, CASE_VIEW, `${KW_FILTER}/${caseId}`].join("/");
    },

    // 7. Hàm lắp ghép URL đi thẳng tới trang chi tiết dự án nội bộ (Internal Project)
    buildInternalProjectUrl: (projectInternalId) => {
      const { ORIGIN, INTERNAL_PROJECT_ADMIN_PATH, INTERNAL_PROJECT_VIEW, KW_FILTER } =
        DEEP_LINK_CONFIG;
      return [
        ORIGIN,
        INTERNAL_PROJECT_ADMIN_PATH,
        INTERNAL_PROJECT_VIEW,
        `${KW_FILTER}/${projectInternalId}`,
      ].join("/");
    },
  };

  const STATUS_CFG = {
    toDo: {
      label: "Not Start",
      color: "#595959",
      bg: "#f5f5f5",
      border: "#d9d9d9",
    },
    inProgress: {
      label: "In Progress",
      color: "#1890ff",
      bg: "#e6f4ff",
      border: "#91caff",
    },
    blocked: {
      label: "Blocked",
      color: "#722ed1",
      bg: "#f9f0ff",
      border: "#d3adf7",
    },
    pending: {
      label: "Pending approval",
      color: "#d46b08",
      bg: "#fff7e6",
      border: "#ffd591",
    },
    approval: {
      label: "Approved",
      color: "#389e0d",
      bg: "#f6ffed",
      border: "#b7eb8f",
    },
    done: {
      label: "Done",
      color: "#389e0d",
      bg: "#f6ffed",
      border: "#b7eb8f",
    },
    cancelled: {
      label: "Cancelled",
      color: "#cf1322",
      bg: "#fff1f0",
      border: "#ffa39e",
    },
  };

  const FIELD_LABEL = {
    title: "Title",
    status: "Status",
    priority: "Priority",
    lawyerId: "Lawyer",
    dueDate: "Deadline",
    startDate: "Start date",
    closedDate: "Completion date",
    description: "Progress details",
    body: "Note content",
    estimatedDuration: "Estimated duration",
    previousTaskId: "Pending Issue",
    nextStepDescription: "Next Step",
    approvedById: "Approver",
    approvedAt: "Approval assigned date",
    acceptedAt: "Approval date",
    isRequiredApproval: "Approval required",
    notes: "Comments",
    documents: "Documents",
    isDeleted: "Deleted status",
    assignedLawyerId: "Assignee",
  };

  const ACTIVITY_FIELD_LABELS = {
    notes: "Notes",
    body: "Content",
    documents: "Documents",
    title: "Title",
    status: "Status",
    assignedLawyerId: "Assignee",
    assignees: "Assignees",
  };

  const tF = (f) => FIELD_LABEL[f] || f;
  const STATUS_KEYS_WITH_APPROVAL = [
    "toDo",
    "inProgress",
    "blocked",
    "pending",
    "approval",
    "done",
    "cancelled",
  ];
  const STATUS_KEYS_WITHOUT_APPROVAL = [
    "toDo",
    "inProgress",
    "blocked",
    "done",
    "cancelled",
  ];
  const getStatusKeys = (isRequiredApproval) =>
    isRequiredApproval ? STATUS_KEYS_WITH_APPROVAL : STATUS_KEYS_WITHOUT_APPROVAL;
  const PRIORITY_CFG = {
    high: { label: "High", color: "#cf1322", bg: "#fff1f0", icon: "↑↑" },
    medium: { label: "Medium", color: "#d46b08", bg: "#fff7e6", icon: "↑" },
    low: { label: "Low", color: "#389e0d", bg: "#f6ffed", icon: "↓" },
  };

  const LAWYER_COLORS = [
    "#531dab",
    "#096dd9",
    "#08979c",
    "#237804",
    "#d46b08",
    "#9e1068",
    "#a8071a",
    "#003a8c",
  ];
  const LAWYER_TYPE_CFG = {
    partner: { label: "Partner", color: "#531dab", bg: "#f9f0ff" },
    lawyer: { label: "Lawyer", color: "#096dd9", bg: "#e6f4ff" },
    associate: { label: "Associate", color: "#08979c", bg: "#e6fffb" },
    suppliant: { label: "Legal Assistant", color: "#d46b08", bg: "#fff7e6" },
  };

  const DOC_TYPE_SUGGESTIONS = [
    "Contract",
    "Minutes",
    "Decision",
    "Proposal",
    "Report",
    "Evidence / Records",
    "Official Letter",
    "Petition",
    "Appendix",
    "Meeting Minutes",
    "Template File",
    "Other",
  ];

  const FILE_EXT_ICON = {
    ".pdf": { icon: "📄", color: "#ff4d4f", bg: "#fff2f0" },
    ".doc": { icon: "📝", color: "#1890ff", bg: "#e6f7ff" },
    ".docx": { icon: "📝", color: "#1890ff", bg: "#e6f7ff" },
    ".xls": { icon: "📊", color: "#52c41a", bg: "#f6ffed" },
    ".xlsx": { icon: "📊", color: "#52c41a", bg: "#f6ffed" },
    ".png": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
    ".jpg": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
    ".jpeg": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
    ".gif": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
    ".webp": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
  };

  const makeSvgIcon = (children, options = {}) =>
    React.createElement(
      "svg",
      {
        width: options.size || 16,
        height: options.size || 16,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: options.strokeWidth || 1.8,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        style: { display: "block" },
      },
      ...children,
    );

  const TASK_FILE_ACTION_ICONS = {
    more: makeSvgIcon([
      React.createElement("circle", { key: "a", cx: 5, cy: 12, r: 1.4 }),
      React.createElement("circle", { key: "b", cx: 12, cy: 12, r: 1.4 }),
      React.createElement("circle", { key: "c", cx: 19, cy: 12, r: 1.4 }),
    ]),
    preview: makeSvgIcon([
      React.createElement("path", {
        key: "a",
        d: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z",
      }),
      React.createElement("circle", { key: "b", cx: 12, cy: 12, r: 2.6 }),
    ]),
    download: makeSvgIcon([
      React.createElement("path", { key: "a", d: "M12 3v11" }),
      React.createElement("path", { key: "b", d: "m7 10 5 5 5-5" }),
      React.createElement("path", { key: "c", d: "M5 20h14" }),
    ]),
    edit: makeSvgIcon([
      React.createElement("path", {
        key: "a",
        d: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z",
      }),
      React.createElement("path", { key: "b", d: "m14 7 3 3" }),
    ]),
    replace: makeSvgIcon([
      React.createElement("path", { key: "a", d: "M3 12a9 9 0 0 1 15-6.7L21 8" }),
      React.createElement("path", { key: "b", d: "M21 3v5h-5" }),
      React.createElement("path", { key: "c", d: "M21 12a9 9 0 0 1-15 6.7L3 16" }),
      React.createElement("path", { key: "d", d: "M3 21v-5h5" }),
    ]),
    moveLegalStudy: makeSvgIcon([
      React.createElement("path", { key: "a", d: "M4 5h7l2 2h7v12H4z" }),
      React.createElement("path", { key: "b", d: "M9 14h6" }),
      React.createElement("path", { key: "c", d: "m13 11 3 3-3 3" }),
    ]),
    moveLegalReference: makeSvgIcon([
      React.createElement("path", { key: "a", d: "M7 4h8l4 4v12H7z" }),
      React.createElement("path", { key: "b", d: "M15 4v5h5" }),
      React.createElement("path", { key: "c", d: "M4 8v12h3" }),
    ]),
    folder: makeSvgIcon([
      React.createElement("path", {
        key: "a",
        d: "M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
      }),
    ]),
  };

  const SERVICE_COLORS = [
    { bg: "#e6f4ff", border: "#91caff", text: "#096dd9", dot: "#1890ff" },
    { bg: "#f9f0ff", border: "#d3adf7", text: "#531dab", dot: "#722ed1" },
    { bg: "#e6fffb", border: "#87e8de", text: "#006d75", dot: "#13c2c2" },
    { bg: "#fff7e6", border: "#ffd591", text: "#d46b08", dot: "#fa8c16" },
    { bg: "#f6ffed", border: "#b7eb8f", text: "#237804", dot: "#52c41a" },
    { bg: "#fff1f0", border: "#ffa39e", text: "#a8071a", dot: "#f5222d" },
    { bg: "#fcffe6", border: "#eaff8f", text: "#5b8c00", dot: "#a0d911" },
    { bg: "#fff0f6", border: "#ffadd2", text: "#9e1068", dot: "#eb2f96" },
  ];

  // ============================================================
  // §2 UTILS
  // ============================================================
  // 🌟 HÀM EXTRACT ID AN TOÀN TUYỆT ĐỐI (Xử lý cả mảng, object, string)
  const extractId = (val) => {
    if (val === null || val === undefined || val === "") return null;
    if (Array.isArray(val)) return val.length > 0 ? extractId(val[0]) : null;
    if (typeof val === "object") return val.id ? parseInt(val.id, 10) : null;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? null : parsed;
  };

  const isDeletedServiceRecord = (record = {}) =>
    !!record?.isDeleted || String(record?.status || "").toLowerCase().trim() === "deleted";

  const getProjectServiceTaskKey = (ps = {}) => {
    const direct = extractId(ps?.serviceId) || extractId(ps?.service);
    return direct ? String(direct) : String(extractId(ps?.id) || "");
  };

  const isTaskServiceDeleted = (item = {}) => !!item?._serviceDeleted;

  const getPrimaryAttachment = (file) =>
    Array.isArray(file?.fileAttachment) ? file.fileAttachment[0] : file?.fileAttachment;

  const withSyncedDocumentFileTitle = (file, title) => {
    const nextAttachment = Array.isArray(file?.fileAttachment)
      ? file.fileAttachment.map((att, index) =>
          index === 0 ? { ...att, title, filename: title } : att,
        )
      : file?.fileAttachment
        ? { ...file.fileAttachment, title, filename: title }
        : file?.fileAttachment;
    return { ...file, title, name: title, fileAttachment: nextAttachment };
  };

  const getPathnameFromValue = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      return new URL(raw, window.location.origin).pathname;
    } catch (error) {
      return raw.split("?")[0].split("#")[0];
    }
  };

  const getPathSegmentId = (segmentName, pathValue = window.location.pathname) => {
    const segments = getPathnameFromValue(pathValue).split("/");
    const idx = segments.findIndex((part) => part.toLowerCase() === segmentName.toLowerCase());
    return idx >= 0 && segments[idx + 1] ? extractId(segments[idx + 1]) : null;
  };

  const parseTaskDetailRouteIds = (pathValue) => {
    const segments = getPathnameFromValue(pathValue).split("/");
    let taskId = null;
    let caseId = null;
    for (let i = 0; i < segments.length; i += 1) {
      const part = String(segments[i] || "").toLowerCase();
      if (part === DEEP_LINK_CONFIG.KW_FILTER && segments[i + 1]) {
        taskId = extractId(segments[i + 1]) || taskId;
      }
      if (part === DEEP_LINK_CONFIG.KW_SOURCE && segments[i + 1]) {
        caseId = extractId(segments[i + 1]) || caseId;
      }
    }
    return { taskId, caseId };
  };

  const getRouteInput = () => {
    const inputArgs = ctx.view?.inputArgs || ctx.inputArgs || {};
    const nestedInputArgs = inputArgs?.inputArgs || {};
    const nestedParams = inputArgs?.params || {};
    const nestedInputParams = nestedInputArgs?.params || {};
    const base = {
      ...(inputArgs || {}),
      ...(nestedInputArgs || {}),
      ...(nestedInputParams || {}),
      ...(nestedParams || {}),
      ...(ctx.action?.params || {}),
      ...(ctx.modal?.params || {}),
      ...(ctx.view?.params || {}),
      ...(ctx.popup?.params || {}),
      ...(ctx.router?.params || {}),
      ...(ctx.params || {}),
    };
    return {
      ...base,
      filterByTk: ctx.filterByTk || base.filterByTk || base.filterbytk,
      filterbytk: ctx.filterbytk || base.filterbytk || base.filterByTk,
      sourceId: ctx.sourceId || base.sourceId,
      taskId: ctx.taskId || base.taskId,
      parentTaskId: ctx.parentTaskId || base.parentTaskId,
      subTaskId: ctx.subTaskId || base.subTaskId,
      sourceSubTaskId: ctx.sourceSubTaskId || base.sourceSubTaskId,
      selectedSubTaskId: ctx.selectedSubTaskId || base.selectedSubTaskId,
      recordType: ctx.recordType || base.recordType,
      collectionName: ctx.collectionName || base.collectionName,
      id: ctx.id || base.id,
    };
  };

  const getTaskDetailIdsFromContext = () => {
    const routeInput = getRouteInput();

    // 🌟 File này được tái sử dụng nguyên vẹn (copy-paste) cho 1 View Nocobase
    // khác gắn trực tiếp vào collection `subTasks` (filterByTk riêng trên
    // subtask, không qua task cha). Trong trường hợp đó ctx.record CHÍNH LÀ
    // subtask đang xem, không phải task như ở view Task Detail gốc.
    //
    // Nhận diện: ĐÃ THỬ dùng ctx.collection nhưng NocoBase không set giá trị
    // này cho block full-page render (xác nhận qua debug log thực tế — luôn
    // rơi xuống nhánh cũ). ĐÃ THỬ dùng routeInput.recordType/collectionName
    // nhưng tín hiệu này KHÔNG đáng tin cậy để phân biệt 2 tình huống: khi mở
    // subtask từ TaskManagement.js (flow gốc, ctx.record vẫn là TASK CHA),
    // inputArgs cũng truyền recordType: "subTask" — chỉ để hiển thị đúng nội
    // dung, không có nghĩa ctx.record là subtask. Dùng nhầm tín hiệu này sẽ
    // phá luôn flow gốc.
    //
    // Tín hiệu đáng tin cậy duy nhất: field `taskId` CHỈ tồn tại trên record
    // SubTask (Task không có field này — xem cấu hình field 2 collection).
    // Nếu ctx.record.taskId có giá trị thật, chắc chắn ctx.record là subtask.
    const recordOwnTaskFk = extractId(ctx.record?.taskId);

    if (recordOwnTaskFk) {
      const subTaskId =
        extractId(ctx.record?.id) ||
        extractId(routeInput.filterByTk) ||
        extractId(routeInput.filterbytk) ||
        extractId(routeInput.subTaskId) ||
        extractId(routeInput.sourceSubTaskId) ||
        extractId(routeInput.selectedSubTaskId);
      // taskId cha lấy trực tiếp từ field taskId có sẵn trên chính record subtask
      // (không cần gọi thêm API) — chỉ fallback sang route input nếu thiếu.
      const taskId =
        recordOwnTaskFk ||
        extractId(routeInput.taskId) ||
        extractId(routeInput.parentTaskId) ||
        extractId(routeInput.sourceTaskId);
      const caseId =
        extractId(routeInput.caseId) ||
        extractId(routeInput.projectId) ||
        extractId(routeInput.sourceCaseId) ||
        extractId(routeInput.sourceProjectId) ||
        extractId(routeInput.sourceId);
      // caseId không bắt buộc chính xác 100% ở đây — reload() sẽ tự lấy lại
      // projectId đúng từ chính task cha sau khi fetch, các nơi dùng ids.caseId
      // chỉ dùng làm fallback tạm trước khi dữ liệu task cha load xong.
      return { taskId, subTaskId, recordType: "subTask", caseId };
    }

    const pathCandidates = [
      routeInput.pathname,
      routeInput.linkedUrl,
      routeInput.url,
      window.location.pathname,
    ].filter(Boolean);
    const routeIds = pathCandidates.reduce(
      (acc, pathValue) => {
        const parsed = parseTaskDetailRouteIds(pathValue);
        return {
          taskId: acc.taskId || parsed.taskId,
          caseId: acc.caseId || parsed.caseId,
        };
      },
      { taskId: null, caseId: null },
    );

    // 🌟 Block này được đặt trong Task Detail view filterByTk (xem TaskManagement.js
    // handleOpen: ctx.openView(uid, { params: openParams, inputArgs: openParams })
    // với openParams chứa cả filterByTk và filterbytk), nên NocoBase tự resolve
    // ctx.record thành đúng task đang xem — đây là nguồn đáng tin cậy nhất,
    // ưu tiên trước mọi tham số route/inputArgs.
    const recordTaskId = extractId(ctx.record?.id);

    const taskId =
      recordTaskId ||
      extractId(routeInput.taskId) ||
      extractId(routeInput.sourceTaskId) ||
      extractId(routeInput.parentTaskId) ||
      extractId(routeInput.filterByTk) ||
      extractId(routeInput.filterbytk) ||
      extractId(routeInput.recordId) ||
      extractId(routeInput.sourceRecordId) ||
      extractId(routeInput.id) ||
      routeIds.taskId;
    // subTaskId luôn đến từ inputArgs (không phải ctx.record — view chỉ filter
    // theo task cha), nên giữ nguyên nguồn route input.
    const subTaskId =
      extractId(routeInput.subTaskId) ||
      extractId(routeInput.sourceSubTaskId) ||
      extractId(routeInput.selectedSubTaskId);
    const recordType =
      String(routeInput.recordType || routeInput.collectionName || "")
        .toLowerCase()
        .includes("sub")
        ? "subTask"
        : "task";
    const caseId =
      extractId(ctx.record?.projectId) ||
      extractId(ctx.record?.caseId) ||
      extractId(routeInput.caseId) ||
      extractId(routeInput.projectId) ||
      extractId(routeInput.sourceCaseId) ||
      extractId(routeInput.sourceProjectId) ||
      extractId(routeInput.sourceId) ||
      routeIds.caseId;

    // 🌟 DEBUG TẠM THỜI — xoá sau khi xác định xong nguyên nhân "Task not found".
    try {
      console.warn(
        "[DEBUG2 getTaskDetailIdsFromContext] " +
          JSON.stringify(
            {
              ctxRecordId: ctx.record?.id ?? null,
              viewInputArgsFilterByTk: ctx.view?.inputArgs?.filterByTk ?? null,
              viewInputArgsFilterbytk: ctx.view?.inputArgs?.filterbytk ?? null,
              viewInputArgsSubTaskId: ctx.view?.inputArgs?.subTaskId ?? null,
              pathname: window.location.pathname,
              recordTaskId,
              computed: { taskId, subTaskId, recordType, caseId },
            },
            null,
            2,
          ),
      );
    } catch (debugErr) {
      console.warn("[DEBUG2 getTaskDetailIdsFromContext] stringify failed", debugErr);
    }

    return { taskId, subTaskId, recordType, caseId };
  };

  const emitTaskDetailChange = (detail = {}) => {
    const targets = [];
    try {
      if (window?.dispatchEvent) targets.push(window);
      if (window?.parent && window.parent !== window && window.parent.dispatchEvent) {
        targets.push(window.parent);
      }
    } catch {}

    targets.forEach((target) => {
      try {
        const EventCtor = target.CustomEvent || window.CustomEvent || CustomEvent;
        target.dispatchEvent(new EventCtor(TASK_DETAIL_CHANGE_EVENT, { detail }));
      } catch {
        try {
          const event = new Event(TASK_DETAIL_CHANGE_EVENT);
          event.detail = detail;
          target.dispatchEvent(event);
        } catch {}
      }
    });
  };

  const getDeepLinkCaseId = (fallbackCaseId) =>
    extractId(fallbackCaseId) ||
    getPathSegmentId(DEEP_LINK_CONFIG.KW_SOURCE) ||
    getPathSegmentId(DEEP_LINK_CONFIG.KW_FILTER) ||
    extractId(ctx.record?.caseId) ||
    extractId(ctx.record?.projectId);

  const getCurrentPathUrl = () =>
    `${window.location.origin}${window.location.pathname}${window.location.search || ""}`;

  const buildTaskLinkedUrl = (item, type = "task", fallbackCaseId = null) => {
    const taskId =
      type === "subTask"
        ? extractId(item?.taskId) || extractId(item?.task)
        : extractId(item?.id);
    const caseId = getDeepLinkCaseId(
      fallbackCaseId || item?.caseId || item?.projectId,
    );
    if (taskId && caseId) return DEEP_LINK_CONFIG.buildUrl(taskId, caseId);
    return item?.linkedUrl || getCurrentPathUrl();
  };

  const withTaskLinkedUrl = (payload = {}, item = {}, type = "task", fallbackCaseId = null) => {
    if (payload.linkedUrl) return payload;
    const linkedUrl = buildTaskLinkedUrl(item, type, fallbackCaseId);
    return linkedUrl ? { ...payload, linkedUrl } : payload;
  };

  const normalizeLookupText = (val) =>
    String(val || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const resolveServiceUploadFolderId = ({
    item,
    type,
    tasks = [],
    services = [],
    allProjectFolders = [],
    projectFolderId,
    projectId,
  }) => {
    const sourceTask =
      type === "subTask"
        ? tasks.find((task) => extractId(task.id) === extractId(item?.taskId))
        : item;
    const serviceId = extractId(sourceTask?.serviceId) || extractId(item?.serviceId);
    if (!serviceId) return projectFolderId;
    const serviceRecord = services.find(
      (service) =>
        extractId(service.serviceId) === serviceId ||
        extractId(service.service) === serviceId ||
        extractId(service.id) === serviceId,
    );
    const serviceName = serviceRecord?.serviceName || serviceRecord?.name;
    if (!serviceName) return projectFolderId;
    const projectFolderIds = new Set(
      (allProjectFolders || [])
        .filter((folder) => !projectId || extractId(folder.projectId) === extractId(projectId))
        .map((folder) => String(extractId(folder.id))),
    );
    const matched = (allProjectFolders || []).find((folder) => {
      if (folder?.isDeleted) return false;
      if (!projectFolderIds.has(String(extractId(folder.id)))) return false;
      return normalizeLookupText(folder.name || folder.title) === normalizeLookupText(serviceName);
    });
    return extractId(matched?.id) || projectFolderId;
  };
  const fmt = (iso, mode) => {
    if (!iso) return null;
    const d = new Date(iso);
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const yy = d.getFullYear();
    const hh = d.getHours().toString().padStart(2, "0");
    const mi = d.getMinutes().toString().padStart(2, "0");
    if (mode === "full") return `${dd}/${mm}/${yy} ${hh}:${mi}`;
    if (mode === "date") return `${dd}/${mm}/${yy}`;
    return `${dd}/${mm}`;
  };

  const getFileIcon = (ext) => {
    const e = (ext || "").toLowerCase();
    let url = "https://img.icons8.com/color/48/000000/file.png";
    if (e === ".pdf") url = "https://img.icons8.com/color/48/000000/pdf.png";
    else if ([".doc", ".docx"].includes(e))
      url = "https://img.icons8.com/color/48/000000/microsoft-word-2019.png";
    else if ([".xls", ".xlsx"].includes(e))
      url = "https://img.icons8.com/color/48/000000/microsoft-excel-2019.png";
    else if ([".ppt", ".pptx"].includes(e))
      url =
        "https://img.icons8.com/color/48/000000/microsoft-powerpoint-2019.png";
    else if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(e))
      url = "https://img.icons8.com/color/48/000000/image.png";

    return React.createElement("img", {
      src: url,
      style: { width: 22, height: 22, flexShrink: 0, objectFit: "contain" },
      alt: "icon",
    });
  };

  const timeAgo = (iso) => {
    if (!iso) return "";
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return fmt(iso, "date");
  };

  const isOD = (iso, st) =>
    iso && st !== "done" && st !== "cancelled" && new Date(iso) < new Date();
  const isToday = (iso) => {
    if (!iso) return false;
    const d = new Date(iso),
      n = new Date();
    return (
      d.getDate() === n.getDate() &&
      d.getMonth() === n.getMonth() &&
      d.getFullYear() === n.getFullYear()
    );
  };

  const userName = (u) =>
    u?.nickname ||
    `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
    u?.username ||
    u?.email ||
    null;
  const fmtVND = (n) => {
    if (!n && n !== 0) return "—";
    return Number(n).toLocaleString("vi-VN") + " ₫";
  };

  const fmtHours = (h) => {
    if (!h && h !== 0) return "—";
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    if (hrs === 0) return `${mins}p`;
    if (mins === 0) return `${hrs}g`;
    return `${hrs}g ${mins}p`;
  };

  const getFullUrl = (url) =>
    !url
      ? null
      : url.startsWith("http")
        ? url
        : `${window.location.origin}${url}`;

  const addPdfFitHash = (url) => {
    if (!url) return url;
    const joiner = url.includes("#") ? "&" : "#";
    return `${url}${joiner}view=FitH&navpanes=0`;
  };

  const previewFrameShellStyle = (height, options = {}) => ({
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    height,
    boxSizing: "border-box",
    overflowX: "hidden",
    overflowY: "hidden",
    background: options.background || "#f8f9fa",
    display: "flex",
    justifyContent: "center",
    alignItems: "stretch",
    borderTop: options.borderTop || undefined,
  });

  const previewIframeStyle = (height, options = {}) => ({
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    height: options.iframeHeight || height,
    border: "none",
    display: "block",
    background: "#fff",
  });

  const scalePreviewLength = (height, ratio, extraPx = 0) => {
    if (typeof height === "number") return Math.ceil(height * ratio + extraPx);
    const raw = String(height || "").trim();
    if (!raw) return extraPx;
    const match = raw.match(/^(-?\d*\.?\d+)([a-z%]+)$/i);
    if (match) {
      const value = Number(match[1]);
      return `calc(${value * ratio}${match[2]} + ${extraPx}px)`;
    }
    return `calc(${raw} + ${extraPx}px)`;
  };

  const renderTaskFilePreviewFrame = ({
    fullUrl,
    title,
    isPdf,
    isImage,
    isOffice,
    officeViewerUrl,
    height = 640,
    modal = false,
  }) => {
    const shellHeight = height;
    const officeScale = modal ? 0.96 : 0.9;
    const officeScaleRatio = 1 / officeScale;
    const officeIframeHeight = scalePreviewLength(shellHeight, officeScaleRatio, 42);
    const officeIframeWidth = `${officeScaleRatio * 100}%`;
    const shellStyle = previewFrameShellStyle(shellHeight, {
      background: modal ? "#f5f5f5" : "#f8f9fa",
      borderTop: modal ? undefined : "1px solid #f0f0f0",
    });

    if (isPdf && fullUrl) {
      return React.createElement(
        "div",
        { style: shellStyle },
        React.createElement("iframe", {
          src: addPdfFitHash(fullUrl),
          style: previewIframeStyle(shellHeight),
          title,
        }),
      );
    }

    if (isImage && fullUrl) {
      return React.createElement(
        "div",
        { style: { ...shellStyle, padding: modal ? 16 : 10 } },
        React.createElement("img", {
          src: fullUrl,
          alt: title,
          style: {
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            display: "block",
            margin: "0 auto",
            alignSelf: "center",
          },
        }),
      );
    }

    if (isOffice && officeViewerUrl) {
      return React.createElement(
        "div",
        {
          style: {
            ...shellStyle,
            position: "relative",
            padding: 0,
            alignItems: "flex-start",
          },
        },
        React.createElement("iframe", {
          src: officeViewerUrl,
          style: {
            ...previewIframeStyle(shellHeight, {
              iframeHeight: officeIframeHeight,
            }),
            width: officeIframeWidth,
            maxWidth: "none",
            margin: "0 auto",
            flex: "0 0 auto",
            transform: `scale(${officeScale})`,
            transformOrigin: "top center",
          },
          title,
          frameBorder: "0",
        }),
      );
    }

    return null;
  };

  const getCommentText = (html, removeMentions = false) => {
    if (!html) return "";
    if (typeof document !== "undefined") {
      const el = document.createElement("div");
      el.innerHTML = String(html);
      if (removeMentions) {
        el.querySelectorAll(".mention-tag, [data-id]").forEach((node) =>
          node.remove(),
        );
      }
      return (el.textContent || "").replace(/\u00a0/g, " ").trim();
    }

    let text = String(html);
    if (removeMentions) {
      text = text.replace(
        /<span\b[^>]*(?:mention-tag|data-id)[^>]*>[\s\S]*?<\/span>/gi,
        " ",
      );
    }
    return text
      .replace(/<[^>]*>?/gm, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "";
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getExtInfo = (ext) =>
    FILE_EXT_ICON[(ext || "").toLowerCase()] || {
      icon: "📎",
      color: "#8c8c8c",
      bg: "#fafafa",
    };
  const formatActivityValue = (val) => {
    if (!val) return val;
    const statusMap = {
      toDo: "Not started",
      inProgress: "In progress",
      blocked: "Waiting",
      pending: "Pending approval",
      approval: "Approved",
      done: "Done",
      cancelled: "Cancelled",
    };
    if (statusMap[val]) return statusMap[val];
    const priorityMap = { high: "High", medium: "Medium", low: "Low" };
    if (priorityMap[val]) return priorityMap[val];
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return fmt(val, "full");
      } catch {}
    }
    return val;
  };

  const calcWorkRate = (est, actual) => {
    if (!est || !actual || actual <= 0) return null;
    return Math.round((est / actual) * 100);
  };

  const workRateCfg = (rate) => {
    if (rate === null || rate === undefined)
      return { label: "—", color: "#8c8c8c", bg: "#f5f5f5" };
    if (rate >= 120)
      return { label: `${rate}% Excellent`, color: "#389e0d", bg: "#f6ffed" };
    if (rate >= 90)
      return { label: `${rate}% On track`, color: "#096dd9", bg: "#e6f4ff" };
    if (rate >= 70)
      return { label: `${rate}% Slow`, color: "#d46b08", bg: "#fff7e6" };
    return { label: `${rate}% Poor`, color: "#cf1322", bg: "#fff1f0" };
  };

  // ============================================================
  // §3 API
  // ============================================================
  async function apiReq(url, method, data) {
    return ctx.api.request({ url, method: method || "POST", data });
  }
  async function fetchAll(url, fields, filter) {
    try {
      const params = { pageSize: 500, page: 1 };
      if (fields) params.fields = fields;
      if (filter) params.filter = JSON.stringify(filter);
      const safeParams = await withResourceSchemaSafeParams(url, params);
      if (!safeParams) return [];
      const res = await ctx.api.request({ url, params: safeParams });
      return res?.data?.data || [];
    } catch {
      return [];
    }
  }
  async function getCurrentUser() {
    try {
      const r = await ctx.api.request({ url: "auth:check", method: "GET" });
      return r?.data?.data || r?.data || null;
    } catch {
      return null;
    }
  }
  async function fetchActivityLog(collectionName, recordId) {
    try {
      const collectionMap = {
        tasks: "Task",
        task: "Task",
        Task: "Task",
        subTasks: "SubTask",
        subTask: "SubTask",
        SubTask: "SubTask",
        notes: "Note",
        documents: "Document",
      };
      const normalized = collectionMap[collectionName] || collectionName;
      const params = await withResourceSchemaSafeParams("activity_log:list", {
        pageSize: 200,
        page: 1,
        sort: ["-id"],
        filter: JSON.stringify({
          $and: [
            { collectionName: { $eq: normalized } },
            { recordId: { $eq: recordId } },
          ].filter(Boolean),
        }),
      });
      if (!params) return [];
      const res = await ctx.api.request({ url: "activity_log:list", params });
      return res?.data?.data || [];
    } catch {
      return [];
    }
  }
  async function fetchNotes(collectionName, recordId, includeDeleted = false) {
    try {
      const filter = {
        $and: [
          { collectionName: { $eq: collectionName } },
          { recordId: { $eq: recordId } },
        ],
      };
      if (!includeDeleted) {
        filter.$and.push({ isDeleted: { $ne: true } });
      }
      const params = await withResourceSchemaSafeParams("notes:list", {
        pageSize: 100,
        page: 1,
        sort: ["-createdAt"],
        filter: JSON.stringify(filter),
        fields:
          "id,title,body,batchId,linkedUrl,collectionName,recordId,createdAt,updatedAt,createdById,replyText,parentId,isDeleted",
        appends: ["createdBy", "updatedBy", "assignees", "parent"],
      });
      if (!params) return [];
      const res = await ctx.api.request({ url: "notes:list", params });
      return res?.data?.data || [];
    } catch {
      return [];
    }
  }

  async function fetchFiles(collectionName, recordId, includeDeleted = false) {
    try {
      const filter = buildDocumentRecordFilter(collectionName, recordId);
      if (!filter) return [];
      if (!includeDeleted) {
        filter.$and.push({ isDeleted: { $ne: true } });
      }
      return await listDocumentsWithFieldFallback({
        pageSize: 100,
        page: 1,
        sort: ["-createdAt"],
        filter: JSON.stringify(filter),
        appends: ["fileAttachment", "createdBy", "updatedBy"],
      });
    } catch {
      return [];
    }
  }

  const BASE_DOCUMENT_FILE_FIELDS =
    "id,title,documentCode,documentType,batchId,collectionName,sourceCollectionName,sourceTaskId,sourceRecordId,sourceProjectId,recordId,googleDriveUrl,note,createdAt,updatedAt,createdById,updatedById,uploadedById,isDeleted,folderId,caseId,taskId,subTaskId,moduleScope,storageType,legalStudyId,legalReferenceId,internalCompanyId,movedToLegalReferenceAt,movedToLegalReferenceById,fileIndex";
  const LEGAL_STUDY_DOCUMENT_FIELDS =
    "originScope,originFolderId,legalStudyLinkedAt,legalStudySource";
  const DOCUMENT_FILE_FIELDS = `${BASE_DOCUMENT_FILE_FIELDS},${LEGAL_STUDY_DOCUMENT_FIELDS}`;
  const DOCUMENT_FALLBACK_FILE_FIELDS =
    "id,documentType,createdAt,updatedAt,createdById,updatedById";
  const DOCUMENT_KNOWN_SCALAR_FIELDS = [
    BASE_DOCUMENT_FILE_FIELDS,
    LEGAL_STUDY_DOCUMENT_FIELDS,
    "contractId,quotationId,projectInternalId,customerId,legalReferenceId,internalTemplateId,openingDate,signedAt,effectiveAt,status,senderName,recipientName,language,docFormat,description,deletedAt,uploadedById,movedToLegalReferenceById,movedToLegalReferenceAt",
  ].join(",");
  const DOCUMENT_KNOWN_RELATION_FIELDS =
    "fileAttachment,updatedBy,createdBy,folders,activity_log,sourceProject,sourceTask,users,internalCompany,legalReference,internalTemplates,customers,cases,contracts,quotations,tasks,subTasks,projectInternal,documentShares,legalStudy";
  const DOCUMENT_KNOWN_FIELD_SET = makeDocumentFieldSet([
    ...compactDocumentFields(DOCUMENT_KNOWN_SCALAR_FIELDS),
    ...compactDocumentFields(DOCUMENT_KNOWN_RELATION_FIELDS),
  ]);
  const RESOURCE_COLLECTION_ALIASES = {
    task: "tasks",
    tasks: "tasks",
    subTask: "subTasks",
    subTasks: "subTasks",
    lawyers: "lawyers",
    lawyer: "lawyers",
    projectServices: "projectServices",
    folders: "folders",
    projects: "projects",
    notes: "notes",
    activity_log: "activity_log",
  };
  const collectionFieldSetPromises = {};
  let documentFieldSetPromise = null;

  function getResourceCollectionName(resourceUrl) {
    const raw = String(resourceUrl || "").split(":")[0].replace(/^\/+/, "");
    return RESOURCE_COLLECTION_ALIASES[raw] || raw;
  }

  function makeCollectionFieldSet(names = []) {
    const fieldSet = makeDocumentFieldSet(names);
    ["id", "createdAt", "updatedAt", "createdById", "updatedById"].forEach((field) =>
      fieldSet.add(field),
    );
    return fieldSet;
  }

  async function fetchCollectionFieldSet(collectionName) {
    const safeCollectionName = String(collectionName || "").trim();
    if (!safeCollectionName) return null;
    // User-facing JS blocks should not depend on Data sources metadata permissions.
    // NocoBase shows a permission toast for fields:list before this block can catch it.
    return null;
  }

  async function getCollectionFieldSet(collectionName) {
    const safeCollectionName = String(collectionName || "").trim();
    if (!safeCollectionName) return null;
    if (!collectionFieldSetPromises[safeCollectionName]) {
      collectionFieldSetPromises[safeCollectionName] = fetchCollectionFieldSet(safeCollectionName);
    }
    return collectionFieldSetPromises[safeCollectionName];
  }

  async function withResourceSchemaSafeParams(resourceUrl, params = {}, options = {}) {
    const collectionName = options.collectionName || getResourceCollectionName(resourceUrl);
    const fieldSet = await getCollectionFieldSet(collectionName);
    if (!fieldSet) return { ...(params || {}) };

    const next = { ...(params || {}) };
    if (next.fields) {
      const safeFields = compactDocumentFields(next.fields).filter((field) => fieldSet.has(field));
      if (safeFields.length) next.fields = safeFields.join(",");
      else delete next.fields;
    }

    if (next.filter) {
      const parsedFilter = parseDocumentFilter(next.filter);
      const safeFilter = sanitizeDocumentFilterByFields(parsedFilter, fieldSet);
      if (!safeFilter || isEmptyPlainObject(safeFilter)) {
        if (options.allowEmptyFilter) delete next.filter;
        else return null;
      } else {
        next.filter = JSON.stringify(safeFilter);
      }
    }

    const safeSort = sanitizeDocumentSortByFields(next.sort, fieldSet);
    if (safeSort) next.sort = safeSort;
    else delete next.sort;

    const safeAppends = sanitizeDocumentAppendsByFields(next.appends, fieldSet);
    if (safeAppends) next.appends = safeAppends;
    else delete next.appends;

    return next;
  }

  function splitDocumentFields(fields) {
    if (Array.isArray(fields)) return fields;
    if (typeof fields === "string") return fields.split(",");
    return [];
  }

  function compactDocumentFields(fields) {
    return Array.from(
      new Set(
        splitDocumentFields(fields)
          .map((field) => String(field || "").trim())
          .filter(Boolean),
      ),
    );
  }

  function makeDocumentFieldSet(names = []) {
    const fieldSet = new Set(names.filter(Boolean));
    if (fieldSet.has("createdBy")) fieldSet.add("createdById");
    if (fieldSet.has("updatedBy")) fieldSet.add("updatedById");
    if (fieldSet.has("uploadedBy")) fieldSet.add("uploadedById");
    return fieldSet;
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isEmptyPlainObject(value) {
    return isPlainObject(value) && Object.keys(value).length === 0;
  }

  function parseDocumentFilter(filter) {
    if (!filter) return null;
    if (typeof filter !== "string") return filter;
    try {
      return JSON.parse(filter);
    } catch {
      return null;
    }
  }

  function sanitizeDocumentFilterByFields(filter, fieldSet) {
    if (!fieldSet || !filter) return filter;
    if (Array.isArray(filter)) {
      const items = filter
        .map((item) => sanitizeDocumentFilterByFields(item, fieldSet))
        .filter((item) => item && !isEmptyPlainObject(item));
      return items.length ? items : null;
    }
    if (!isPlainObject(filter)) return filter;
    const next = {};
    Object.entries(filter).forEach(([key, value]) => {
      if (key === "$and" || key === "$or") {
        const items = sanitizeDocumentFilterByFields(value, fieldSet);
        if (Array.isArray(items) && items.length) next[key] = items;
        return;
      }
      if (key.startsWith("$")) {
        next[key] = value;
        return;
      }
      if (!fieldSet.has(key)) return;
      next[key] = value;
    });
    return Object.keys(next).length ? next : null;
  }

  function sanitizeDocumentSortByFields(sort, fieldSet) {
    if (!fieldSet || !sort) return sort;
    const items = Array.isArray(sort) ? sort : [sort];
    const safeSort = items.filter((item) => {
      const field = String(item || "").replace(/^[+-]/, "");
      return field && fieldSet.has(field);
    });
    if (!safeSort.length) return undefined;
    return Array.isArray(sort) ? safeSort : safeSort[0];
  }

  function sanitizeDocumentAppendsByFields(appends, fieldSet) {
    if (!fieldSet || !appends) return appends;
    const items = Array.isArray(appends) ? appends : [appends];
    const safeAppends = items.filter((item) => {
      const relationName = String(item || "").split(".")[0];
      return relationName && fieldSet.has(relationName);
    });
    if (!safeAppends.length) return undefined;
    return Array.isArray(appends) ? safeAppends : safeAppends[0];
  }

  async function fetchDocumentFieldSet() {
    // Avoid fields:list here; it requires admin metadata permission in this JS block.
    // Keep a local field set aligned with the configured documents collection.
    return DOCUMENT_KNOWN_FIELD_SET;
  }

  async function getDocumentFieldSet() {
    if (!documentFieldSetPromise) documentFieldSetPromise = fetchDocumentFieldSet();
    return documentFieldSetPromise;
  }

  async function withDocumentSchemaSafeParams(params = {}, options = {}) {
    const fieldSet = await getDocumentFieldSet();
    if (!fieldSet) return { ...(params || {}) };
    const next = { ...(params || {}) };
    const requestedFields = options.fields !== undefined ? options.fields : next.fields;
    const safeFields = compactDocumentFields(requestedFields).filter((field) =>
      fieldSet.has(field),
    );
    if (safeFields.length) next.fields = safeFields.join(",");
    else delete next.fields;

    if (next.filter) {
      const parsedFilter = parseDocumentFilter(next.filter);
      const safeFilter = sanitizeDocumentFilterByFields(parsedFilter, fieldSet);
      if (!safeFilter || isEmptyPlainObject(safeFilter)) {
        if (options.allowEmptyFilter) delete next.filter;
        else return null;
      } else {
        next.filter = JSON.stringify(safeFilter);
      }
    }

    const safeSort = sanitizeDocumentSortByFields(next.sort, fieldSet);
    if (safeSort) next.sort = safeSort;
    else delete next.sort;

    const safeAppends = sanitizeDocumentAppendsByFields(next.appends, fieldSet);
    if (safeAppends) next.appends = safeAppends;
    else delete next.appends;

    return next;
  }

  async function listDocumentsWithFieldFallback(params) {
    const attempts = [
      { ...(params || {}), fields: DOCUMENT_FILE_FIELDS },
      { ...(params || {}), fields: BASE_DOCUMENT_FILE_FIELDS },
      { ...(params || {}), fields: DOCUMENT_FALLBACK_FILE_FIELDS },
      { ...(params || {}) },
    ];

    for (const attemptParams of attempts) {
      const safeParams = await withDocumentSchemaSafeParams(attemptParams);
      if (!safeParams) return [];
      try {
        const res = await ctx.api.request({
          url: "documents:list",
          params: safeParams,
        });
        return res?.data?.data || [];
      } catch {}
    }
    return [];
  }

  function normalizeDocumentCollectionName(collectionName) {
    const raw = String(collectionName || "").trim();
    const lower = raw.toLowerCase();
    if (lower === "tasks" || lower === "task") return "Task";
    if (lower === "subtasks" || lower === "subtask") return "SubTask";
    if (lower === "cases" || lower === "case") return "Case";
    return raw || collectionName;
  }

  function buildDocumentRecordLink(collectionName, recordId, extra = {}) {
    const normalized = normalizeDocumentCollectionName(collectionName);
    const safeRecordId = extractId(recordId);
    const payload = {
      collectionName: normalized,
      moduleScope: CASE_DOCUMENT_SCOPE,
    };
    const safeCaseId = getDeepLinkCaseId(extra.caseId);
    if (safeCaseId) payload.caseId = safeCaseId;
    const safeFolderId = extractId(extra.folderId);
    if (safeFolderId) payload.folderId = safeFolderId;
    if (safeRecordId) {
      payload.recordId = safeRecordId;
      payload.sourceCollectionName = normalized;
      payload.sourceRecordId = safeRecordId;
    }
    if (normalized === "Task" && safeRecordId) {
      payload.taskId = safeRecordId;
      payload.sourceTaskId = safeRecordId;
    }
    if (normalized === "SubTask" && safeRecordId) payload.subTaskId = safeRecordId;
    return payload;
  }

  // Task-upload document creation must never carry a direct caseId — the
  // Document library's root-detection logic (getDirectLibrarySource) treats
  // any record whose own caseId/projectId equals the current case as that
  // case's root container. Stamping caseId on every task-uploaded file made
  // the tree classify them as siblings of the real case root instead of
  // nesting them under it through the real folderId hierarchy.
  function buildTaskUploadDocumentLink(collectionName, recordId, extra = {}) {
    const { caseId: _caseId, ...rest } = buildDocumentRecordLink(collectionName, recordId, extra);
    return rest;
  }

  function buildDocumentRecordFilter(collectionName, recordId) {
    const link = buildDocumentRecordLink(collectionName, recordId);
    const filter = [];
    if (link.collectionName) filter.push({ collectionName: { $eq: link.collectionName } });
    if (link.taskId) {
      filter.push({
        $or: [
          { taskId: { $eq: link.taskId } },
          { sourceTaskId: { $eq: link.taskId } },
          { sourceRecordId: { $eq: link.taskId } },
          { recordId: { $eq: link.taskId } },
        ],
      });
    } else if (link.subTaskId) {
      filter.push({
        $or: [
          { subTaskId: { $eq: link.subTaskId } },
          { sourceRecordId: { $eq: link.subTaskId } },
          { recordId: { $eq: link.subTaskId } },
        ],
      });
    } else return null;
    return { $and: filter };
  }

  function getDocumentTaskId(doc) {
    return (
      extractId(doc?.taskId) ||
      extractId(doc?.task) ||
      extractId(doc?.sourceTaskId) ||
      (normalizeDocumentCollectionName(doc?.collectionName) === "Task"
        ? extractId(doc?.recordId)
        : null) ||
      (normalizeDocumentCollectionName(doc?.sourceCollectionName) === "Task"
        ? extractId(doc?.sourceRecordId)
        : null)
    );
  }

  function filterTaskDocumentsByIds(files, taskIds, moduleScope = null) {
    const idSet = new Set((taskIds || []).map((id) => String(extractId(id))).filter(Boolean));
    return (files || []).filter((file) => {
      const taskId = getDocumentTaskId(file);
      if (!taskId || !idSet.has(String(taskId))) return false;
      if (moduleScope && file.moduleScope && file.moduleScope !== moduleScope) return false;
      return true;
    });
  }

  async function fetchTaskDocumentsByIds(taskIds, extraFilters = []) {
    const safeTaskIds = (taskIds || []).map(extractId).filter(Boolean);
    if (!safeTaskIds.length) return [];
    const baseFilters = [
      { collectionName: { $eq: "Task" } },
      ...extraFilters,
      { isDeleted: { $ne: true } },
    ];
    const filterAttempts = [
      {
        $and: [
          ...baseFilters,
          {
            $or: [
              { taskId: { $in: safeTaskIds } },
              { sourceTaskId: { $in: safeTaskIds } },
              { sourceRecordId: { $in: safeTaskIds } },
              { recordId: { $in: safeTaskIds } },
            ],
          },
        ],
      },
      { $and: [...baseFilters, { taskId: { $in: safeTaskIds } }] },
      { $and: [...baseFilters, { sourceTaskId: { $in: safeTaskIds } }] },
      { $and: [...baseFilters, { sourceRecordId: { $in: safeTaskIds } }] },
      { $and: baseFilters },
    ];

    for (const filter of filterAttempts) {
      try {
        const rows = await listDocumentsWithFieldFallback({
          pageSize: 2000,
          filter: JSON.stringify(filter),
          appends: ["fileAttachment", "createdBy", "updatedBy"],
        });
        const files = filterTaskDocumentsByIds(rows, safeTaskIds);
        if (files.length || filter === filterAttempts[filterAttempts.length - 1]) return files;
      } catch {}
    }
    return [];
  }

  const createTaskUploadBatchId = (prefix = "upl") =>
    `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

  const formatUploadSize = (size) => {
    const bytes = Number(size) || 0;
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getUploadItemFile = (item) => item?.originFileObj || item;

  const getUploadRelativePath = (item) => {
    const file = getUploadItemFile(item);
    return (
      file?.webkitRelativePath ||
      item?.webkitRelativePath ||
      item?.name ||
      file?.name ||
      ""
    );
  };

  const getRelativeFolderPath = (relativePath) => {
    const parts = String(relativePath || "")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
    parts.pop();
    return parts.join("/");
  };

  async function uploadTaskAttachment(file, fileName = null) {
    const formData = new window.FormData();
    formData.append("file", file, fileName || file.name);
    const uploadRes = await ctx.api.request({
      url: "attachments:create",
      method: "POST",
      params: { attachmentField: "documents.fileAttachment" },
      data: formData,
    });
    const attachment = uploadRes?.data?.data;
    if (!attachment?.id) throw new Error("Upload file failed");
    return attachment;
  }

  async function createTaskFolderRecord(payload) {
    const variants = [
      payload,
      (({ moduleScope, ...rest }) => rest)(payload || {}),
      (({ moduleScope, projectId, ...rest }) => rest)(payload || {}),
    ];
    let lastError = null;
    for (const data of variants) {
      try {
        return await ctx.api.request({
          url: "folders:create",
          method: "POST",
          data,
        });
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  }

  async function createTaskUploadFoldersFromEntries(entries, rootFolderId, options = {}) {
    const rootParentId = extractId(rootFolderId) || null;
    const folderIdMap = { "": rootParentId };
    const folderPaths = new Set();
    (entries || []).forEach((entry) => {
      const folderPath = getRelativeFolderPath(entry.relativePath);
      if (!folderPath) return;
      let currentPath = "";
      folderPath.split("/").forEach((part) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        folderPaths.add(currentPath);
      });
    });

    const sortedPaths = Array.from(folderPaths).sort(
      (a, b) => a.split("/").length - b.split("/").length,
    );
    const now = new Date().toISOString();
    const userId = extractId(options.currentUser?.id);
    const caseId = extractId(options.caseId);

    for (const path of sortedPaths) {
      const parts = path.split("/");
      const folderName = parts.pop();
      const parentPath = parts.join("/");
      const parentId = folderIdMap[parentPath] || rootParentId;
      const payload = {
        name: folderName,
        type: "custom",
        storageType: "cases",
        moduleScope: CASE_DOCUMENT_SCOPE,
        createdAt: now,
        updatedAt: now,
        ...(parentId ? { parentId } : {}),
        ...(caseId ? { projectId: caseId } : {}),
        ...(userId ? { createdById: userId, updatedById: userId } : {}),
      };
      const res = await createTaskFolderRecord(payload);
      folderIdMap[path] = extractId(res?.data?.data);
    }

    return folderIdMap;
  }

  function initcap(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async function logActivity(
    collectionName,
    recordId,
    action,
    fieldName,
    oldValue,
    newValue,
    changedByName,
    batchId,
    dataId = null,
    timestamp = null,
  ) {
    try {
      const now = timestamp || new Date().toISOString();
      await apiReq("activity_log:create", "POST", {
        collectionName,
        recordId,
        action,
        fieldName,
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null,
        changedByName: changedByName || "System",
        changedAt: now,
        createdAt: now,
        batchId: batchId || null,
        dataId: dataId || null,
      });
    } catch {}
  }

  async function fetchTaskNoteFolders(files = []) {
    if (!(files || []).some((file) => extractId(file?.folderId))) return [];
    const params = {
      pageSize: 2000,
      page: 1,
      filter: JSON.stringify({
        $and: [
          { storageType: { $eq: "cases" } },
          { isDeleted: { $ne: true } },
        ],
      }),
    };
    try {
      const res = await ctx.api.request({ url: "folders:list", params });
      return res?.data?.data || [];
    } catch {
      return [];
    }
  }

  // Direct lookup by exact id, bypassing the storageType/pageSize-bounded
  // scan in fetchTaskNoteFolders — that scan can miss a folder if the case
  // has more "cases" folders than fit in one page, which showed up as
  // badges falling back to "Folder #<id>" instead of the real name.
  async function fetchFoldersByIds(ids = []) {
    const safeIds = Array.from(new Set((ids || []).map(extractId).filter(Boolean)));
    if (!safeIds.length) return [];
    const params = {
      pageSize: safeIds.length,
      page: 1,
      filter: JSON.stringify({
        $and: [{ id: { $in: safeIds } }, { isDeleted: { $ne: true } }],
      }),
    };
    try {
      const res = await ctx.api.request({ url: "folders:list", params });
      return res?.data?.data || [];
    } catch {
      return [];
    }
  }

  const buildFolderLookup = (folders = []) =>
    (folders || []).reduce((acc, folder) => {
      const id = extractId(folder?.id);
      if (id) acc[String(id)] = folder;
      return acc;
    }, {});

  // Folder name lookup for a set of files — broad scan first (also covers
  // ancestor folders, needed for the badge's breadcrumb tooltip), then a
  // targeted by-id fetch for any file's own folderId the scan missed, so
  // the visible folder name never falls back to a bare "Folder #<id>".
  async function fetchFolderLookupForFiles(files = []) {
    const folders = await fetchTaskNoteFolders(files);
    const lookupSoFar = buildFolderLookup(folders);
    const referencedFolderIds = (files || [])
      .map((file) => extractId(file?.folderId))
      .filter(Boolean);
    const missingFolderIds = referencedFolderIds.filter(
      (id) => !lookupSoFar[String(id)],
    );
    const extraFolders = missingFolderIds.length
      ? await fetchFoldersByIds(missingFolderIds)
      : [];
    return buildFolderLookup([...folders, ...extraFolders]);
  }

  const getFolderPathParts = (folderId, folderLookup = {}) => {
    const parts = [];
    const seen = new Set();
    let currentId = extractId(folderId);
    while (currentId && folderLookup[String(currentId)] && !seen.has(String(currentId))) {
      seen.add(String(currentId));
      const folder = folderLookup[String(currentId)];
      parts.unshift(folder.name || folder.title || `Folder #${currentId}`);
      currentId = extractId(folder.parentId);
    }
    return parts;
  };

  const getFolderIdChain = (folderId, folderLookup = {}) => {
    const chain = [];
    const seen = new Set();
    let currentId = extractId(folderId);
    while (currentId && folderLookup[String(currentId)] && !seen.has(String(currentId))) {
      seen.add(String(currentId));
      chain.unshift(String(currentId));
      currentId = extractId(folderLookup[String(currentId)].parentId);
    }
    return chain;
  };

  const getDescendantFolderRecords = (folderId, folderLookup = {}) => {
    const rootId = String(extractId(folderId) || "");
    if (!rootId) return [];
    const descendants = [];
    const queue = [rootId];
    const visited = new Set();
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) continue;
      visited.add(currentId);
      const current = folderLookup[currentId];
      if (current) descendants.push(current);
      Object.values(folderLookup).forEach((folder) => {
        if (String(extractId(folder?.parentId) || "") === currentId) {
          queue.push(String(extractId(folder?.id)));
        }
      });
    }
    return descendants;
  };

  const parseLegalStudySource = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const isLinkedToLegalStudy = (record) =>
    !!record?.legalStudyLinkedAt ||
    !!extractId(record?.legalStudyId) ||
    record?.moduleScope === LEGAL_STUDY_MODULE_SCOPE ||
    record?.storageType === LEGAL_STUDY_STORAGE_TYPE;

  const isLinkedToLegalReference = (record) =>
    !!record?.movedToLegalReferenceAt ||
    !!extractId(record?.legalReferenceId) ||
    record?.moduleScope === LEGAL_REFERENCE_MODULE_SCOPE ||
    record?.storageType === LEGAL_REFERENCE_STORAGE_TYPE;

  // `originScope`/`originFolderId` are only ever written by LibraryMoveModal's
  // move flow (never on initial document creation), so their presence marks
  // "this file went through an explicit move" regardless of destination.
  // Combined with the current moduleScope it tells us the file was moved
  // into a Document (case) folder specifically, as opposed to Legal
  // Study/Reference (covered by the two checks above).
  const isMovedToCaseDocument = (record) =>
    !!record?.originScope && record?.moduleScope === CASE_DOCUMENT_SCOPE;

  // Same "went through an explicit move" signal as isMovedToCaseDocument,
  // just checked against the Knowledge library's moduleScope instead.
  const isMovedToKnowledge = (record) =>
    !!record?.originScope && record?.moduleScope === LIBRARY_DESTINATION.KNOWLEDGE;

  // Visible label leads with the immediate folder name (what the user
  // actually asked "moved to which folder?"); the full breadcrumb only
  // shows up on hover, since most files sit 1-2 levels deep and the full
  // chain would just repeat the case's own root folder every time.
  const getMovedDestinationBadge = (record, folderLookup = {}) => {
    if (isLinkedToLegalStudy(record)) {
      return {
        icon: TASK_FILE_ACTION_ICONS.moveLegalStudy,
        prefix: "Moved to",
        value: "Legal Study",
        tooltip: "Moved to Legal Study",
        accent: "#9254de",
      };
    }
    if (isLinkedToLegalReference(record)) {
      return {
        icon: TASK_FILE_ACTION_ICONS.moveLegalReference,
        prefix: "Moved to",
        value: "Legal Reference",
        tooltip: "Moved to Legal Reference",
        accent: "#36cfc9",
      };
    }
    if (isMovedToCaseDocument(record)) {
      const folderId = extractId(record?.folderId);
      const folder = folderId ? folderLookup[String(folderId)] : null;
      const folderName =
        folder?.name || folder?.title || (folderId ? `Folder #${folderId}` : "Root");
      const fullPath =
        getFolderPathParts(folderId, folderLookup).join(" / ") || folderName;
      return {
        icon: TASK_FILE_ACTION_ICONS.folder,
        prefix: "Moved to Document:",
        value: folderName,
        tooltip: `Moved to Document / ${fullPath}`,
        accent: "#4096ff",
      };
    }
    if (isMovedToKnowledge(record)) {
      // Knowledge folders sit outside folderLookup's default "cases" scan
      // (see fetchTaskNoteFolders), but fetchFolderLookupForFiles' by-id
      // fallback fetch (fetchFoldersByIds — no storageType filter) already
      // picks them up, so the same folderLookup works here unchanged.
      const folderId = extractId(record?.folderId);
      const folder = folderId ? folderLookup[String(folderId)] : null;
      const folderName =
        folder?.name || folder?.title || (folderId ? `Folder #${folderId}` : "Root");
      const fullPath =
        getFolderPathParts(folderId, folderLookup).join(" / ") || folderName;
      return {
        // Value is a real folder name (same as the Document badge above),
        // not a fixed category placeholder like "Legal Study"/"Legal
        // Reference" — use the folder icon so it reads the same way.
        icon: TASK_FILE_ACTION_ICONS.folder,
        prefix: "Moved to Library:",
        value: folderName,
        tooltip: `Moved to Library / ${fullPath}`,
        accent: "#fa8c16",
      };
    }
    return null;
  };

  // Deliberately low-contrast pill (light grey shell, muted prefix text) so
  // it reads as a passive status hint rather than competing with the file
  // title or the action buttons — only the folder/destination name itself
  // gets a slightly stronger weight since that's the part users need to
  // actually read.
  const renderMovedBadge = (badge, style = {}) => {
    if (!badge) return null;
    return React.createElement(
      "span",
      {
        title: badge.tooltip || `${badge.prefix} ${badge.value}`,
        style: {
          fontSize: 11,
          fontFamily: FONT,
          color: "#8c8c8c",
          background: "#fafafa",
          border: "1px solid #f0f0f0",
          borderRadius: 4,
          padding: "2px 8px",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          maxWidth: "100%",
          overflow: "hidden",
          ...style,
        },
      },
      React.createElement(
        "span",
        {
          style: {
            color: badge.accent,
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
          },
        },
        React.cloneElement(badge.icon, { size: 12, width: 12, height: 12 }),
      ),
      React.createElement("span", { style: { flexShrink: 0 } }, badge.prefix),
      React.createElement(
        "span",
        {
          style: {
            color: "#595959",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        badge.value,
      ),
    );
  };

  const getLegalStudySourceLabel = (record) => {
    const source = parseLegalStudySource(record?.legalStudySource);
    if (!source) return "";
    const taskTitle = source.taskTitle || "";
    const subTaskTitle = source.subTaskTitle || "";
    if (taskTitle && subTaskTitle) return `${taskTitle} / ${subTaskTitle}`;
    return taskTitle || subTaskTitle || "";
  };

  const getLibraryDestinationConfig = (destinationType) =>
    LIBRARY_DESTINATION_CONFIG[destinationType] ||
    LIBRARY_DESTINATION_CONFIG[LIBRARY_DESTINATION.LEGAL_STUDY];

  const getLibraryRecordId = (record, destinationType) => {
    if (destinationType === LIBRARY_DESTINATION.LEGAL_REFERENCE) {
      return (
        extractId(record?.legalReferenceId) ||
        extractId(record?.legalReference) ||
        extractId(record?.legalReferenceRecord) ||
        extractId(record?.id)
      );
    }
    return (
      extractId(record?.legalStudyId) ||
      extractId(record?.legalStudy) ||
      extractId(record?.legalStudies) ||
      extractId(record?.legalStudiesId) ||
      extractId(record?.id)
    );
  };

  const getLibraryRecordDisplayName = (record, destinationType) => {
    if (!record) return "";
    const fallbackLabel = getLibraryDestinationConfig(destinationType).label;
    const code =
      record.studyCode ||
      record.referenceCode ||
      record.code ||
      record.referenceNo ||
      "";
    const title =
      record.title ||
      record.name ||
      record.projectName ||
      record.description ||
      (record.id ? `${fallbackLabel} #${record.id}` : fallbackLabel);
    return code && String(code) !== String(title) ? `${code} - ${title}` : title;
  };

  const getLibraryRecordInternalCompanyId = (record) =>
    extractId(record?.internalCompanyId) ||
    extractId(record?.internalCompany) ||
    extractId(record?.companyId) ||
    extractId(record?.company);

  const getRecordDestinationId = (record, destinationType) =>
    destinationType === LIBRARY_DESTINATION.LEGAL_REFERENCE
      ? extractId(record?.legalReferenceId) ||
        extractId(record?.legalReference) ||
        extractId(record?.legalReferenceRecord)
      : extractId(record?.legalStudyId) ||
        extractId(record?.legalStudy) ||
        extractId(record?.legalStudies) ||
        extractId(record?.legalStudiesId);

  // Plain-text label used for a non-folder grouping node (e.g. the
  // synthetic "Knowledge" category wrapper in LibraryMoveModal) — no icon
  // box, so it reads visibly differently from the real folder rows below it
  // (which get the folder icon via renderLibraryTreeTitle).
  const renderLibraryCategoryTitle = (label) =>
    React.createElement(
      "span",
      { style: { fontWeight: 700, color: "#374151" } },
      label,
    );

  // Real parent-child folder structure only — no synthetic "Home"/root
  // wrapper node. The folder list's actual top-level folders (no in-list
  // parent) become the tree's top-level nodes directly.
  const buildLibraryFolderTree = (folders = []) => {
    const nodeMap = {};
    const roots = [];
    folders.forEach((folder) => {
      const id = extractId(folder.id || folder);
      if (!id) return;
      const folderTitle = folder.name || folder.title || `Folder #${id}`;
      nodeMap[String(id)] = {
        title: renderLibraryTreeTitle(folderTitle),
        searchText: folderTitle,
        value: String(id),
        key: String(id),
        children: [],
      };
    });
    folders.forEach((folder) => {
      const id = String(extractId(folder.id || folder) || "");
      const parentId = String(extractId(folder.parentId) || "");
      if (!id || !nodeMap[id]) return;
      if (parentId && nodeMap[parentId]) nodeMap[parentId].children.push(nodeMap[id]);
      else roots.push(nodeMap[id]);
    });
    return roots;
  };

  async function fetchLibraryDestinationRecords(destinationType) {
    const config = getLibraryDestinationConfig(destinationType);
    let lastError = null;
    for (const url of config.listCandidates) {
      try {
        const res = await ctx.api.request({
          url,
          params: { pageSize: 2000, page: 1, sort: ["-createdAt"] },
        });
        return (res?.data?.data || []).filter((record) => !record?.isDeleted);
      } catch (e) {
        lastError = e;
      }
    }
    console.warn(`Cannot load ${config.label}`, lastError);
    return [];
  }

  async function fetchLibraryDestinationFolders(destinationType, parentRecordId) {
    const config = getLibraryDestinationConfig(destinationType);
    const safeParentId = extractId(parentRecordId);
    if (!safeParentId) return [];
    const params = {
      pageSize: 2000,
      page: 1,
      sort: ["createdAt"],
      filter: JSON.stringify({
        $and: [
          { moduleScope: { $eq: config.moduleScope } },
          { isDeleted: { $ne: true } },
        ],
      }),
    };
    try {
      const res = await ctx.api.request({ url: "folders:list", params });
      return (res?.data?.data || []).filter(
        (folder) =>
          String(getRecordDestinationId(folder, destinationType) || "") ===
          String(safeParentId),
      );
    } catch {
      return [];
    }
  }

  // Real Document folders of the given case (no Legal Study/Reference
  // parent-record step — the case itself is always the parent).
  async function fetchCaseDocumentFolders(caseId) {
    const safeCaseId = extractId(caseId);
    if (!safeCaseId) return [];
    const params = {
      pageSize: 2000,
      page: 1,
      sort: ["createdAt"],
      filter: JSON.stringify({
        $and: [
          { projectId: { $eq: safeCaseId } },
          { isDeleted: { $ne: true } },
        ],
      }),
    };
    try {
      const res = await ctx.api.request({ url: "folders:list", params });
      return res?.data?.data || [];
    } catch {
      return [];
    }
  }

  // Company-level Knowledge folders — unlike fetchLibraryDestinationFolders
  // (scoped to one Legal Study/Reference record) there's no single parent
  // record to filter by; every folder tagged moduleScope "knowledge" is a
  // valid destination regardless of which company it belongs to (the user
  // just picks a folder, no company step — see LIBRARY_DESTINATION.KNOWLEDGE).
  async function fetchKnowledgeFolders() {
    const params = {
      pageSize: 2000,
      page: 1,
      sort: ["createdAt"],
      filter: JSON.stringify({
        $and: [
          { moduleScope: { $eq: "knowledge" } },
          { isDeleted: { $ne: true } },
        ],
      }),
    };
    try {
      const res = await ctx.api.request({ url: "folders:list", params });
      return res?.data?.data || [];
    } catch {
      return [];
    }
  }

  const buildLegalStudySource = (sourceContext = {}) => ({
    type: "task_note",
    collectionName: sourceContext.collectionName || "Task",
    recordId: extractId(sourceContext.recordId) || null,
    taskId: extractId(sourceContext.taskId) || null,
    taskTitle: sourceContext.taskTitle || "",
    subTaskId: extractId(sourceContext.subTaskId) || null,
    subTaskTitle: sourceContext.subTaskTitle || "",
    caseId: extractId(sourceContext.caseId) || null,
    caseCode: sourceContext.caseCode || "",
  });

  async function fetchTimesheets(filter) {
    try {
      const res = await ctx.api.request({
        url: "timesheets:list",
        params: {
          pageSize: 200,
          page: 1,
          sort: ["-workingDay", "-createdAt"],
          filter: JSON.stringify(filter),
        },
      });
      return res?.data?.data || [];
    } catch {
      return [];
    }
  }
  const createTimesheet = (payload) =>
    apiReq("timesheets:create", "POST", payload);
  const updateTimesheet = (id, payload) =>
    ctx.api.request({
      url: "timesheets:update",
      method: "POST",
      params: { filterByTk: id },
      data: payload,
    });
  const deleteTimesheet = (id) =>
    ctx.api.request({
      url: "timesheets:destroy",
      method: "POST",
      params: { filterByTk: id },
    });

  // ============================================================
  // §4 PERMISSION
  // ============================================================
  const asArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  const getUserRoleNames = (user) => {
    const roleNames = asArray(user?.roles)
      .map((role) =>
        typeof role === "string"
          ? role
          : role?.name || role?.title || role?.slug || role?.role,
      )
      .filter(Boolean);
    roleNames.push(user?.role, user?.systemRole);
    return new Set(
      roleNames
        .filter(Boolean)
        .map((role) => String(role).trim().toLowerCase()),
    );
  };

  const isAdminUser = (user) => {
    if (!user) return false;
    const roleNames = getUserRoleNames(user);
    return (
      roleNames.has("admin") ||
      roleNames.has("root") ||
      user?.isAdmin === true ||
      user?.isSuperAdmin === true
    );
  };

  const getFolderManagerRows = (folder) =>
    asArray(folder?.folderManager || folder?.folderManagers);

  const getFolderMemberRows = (folder) =>
    asArray(folder?.folderMember || folder?.folderMembers);

  const getPermissionLawyerId = (row) =>
    extractId(row?.lawyerId) ||
    extractId(row?.lawyer) ||
    extractId(row?.id) ||
    extractId(row);

  const getPermissionRole = (row, fallback = "viewer") =>
    String(
      row?.folderMembers?.role ||
      row?.folderMember?.role ||
      row?.through?.role ||
      row?.role ||
      fallback,
    )
      .trim()
      .toLowerCase();

  const getFolderPermissions = (
    folder,
    user,
    allFolders,
    currentLawyerId,
    visitedFolderIds = new Set(),
  ) => {
    if (isAdminUser(user))
      return { isManager: true, isMember: true, canEdit: true };
    if (!folder) return { isManager: true, isMember: true, canEdit: true };
    if (!user) return { isManager: false, isMember: false, canEdit: false };

    const uid = extractId(user.id);
    const lwId = extractId(currentLawyerId);
    const folderId = extractId(folder.id);
    if (folderId && visitedFolderIds.has(String(folderId))) {
      return { isManager: false, isMember: false, canEdit: false };
    }
    const nextVisitedFolderIds = new Set(visitedFolderIds);
    if (folderId) nextVisitedFolderIds.add(String(folderId));

    // Owner check (Nocobase user ID)
    if (extractId(folder.createdById) === uid) {
      return { isManager: true, isMember: true, canEdit: true };
    }

    const managers = getFolderManagerRows(folder);
    const members = getFolderMemberRows(folder);

    // Check explicit permissions using Lawyer ID
    if (lwId) {
      const isExplicitManager = managers.some(
        (manager) =>
          String(getPermissionLawyerId(manager) || "") === String(lwId),
      );
      if (isExplicitManager)
        return { isManager: true, isMember: true, canEdit: true };

      const explicitMember = members.find(
        (member) =>
          String(getPermissionLawyerId(member) || "") === String(lwId),
      );
      if (explicitMember) {
        const role = getPermissionRole(explicitMember);
        const isManager = role === "manager";
        const canEdit = isManager || role === "editor";
        return { isManager, isMember: true, canEdit };
      }
    }

    // Inherit from parent
    const pId = extractId(folder.parentId);
    if (!pId || pId === "root")
      return { isManager: false, isMember: false, canEdit: false };

    const parentFolder = allFolders.find(
      (f) => String(extractId(f.id)) === String(pId),
    );
    if (!parentFolder)
      return { isManager: false, isMember: false, canEdit: false };

    return getFolderPermissions(
      parentFolder,
      user,
      allFolders,
      currentLawyerId,
      nextVisitedFolderIds,
    );
  };

  const getVisibleFolderIds = (allFolders, currentUser, currentLawyerId) => {
    const accessible = new Set();
    const uid = extractId(currentUser?.id);
    const lwId = extractId(currentLawyerId);

    if (isAdminUser(currentUser)) {
      allFolders.forEach((f) => accessible.add(extractId(f.id)));
      return { accessible, navOnly: new Set() };
    }

    if (!uid) return { accessible, navOnly: new Set() };

    allFolders.forEach((f) => {
      const fId = extractId(f.id);
      if (extractId(f.createdById) === uid) {
        accessible.add(fId);
        return;
      }
      if (lwId) {
        const managers = getFolderManagerRows(f);
        const members = getFolderMemberRows(f);
        if (
          managers.some(
            (manager) =>
              String(getPermissionLawyerId(manager) || "") === String(lwId),
          ) ||
          members.some(
            (member) =>
              String(getPermissionLawyerId(member) || "") === String(lwId),
          )
        ) {
          accessible.add(fId);
          return;
        }
      }
    });

    const getDescendantIdsRecursive = (pId, list, visited = new Set()) => {
      const parentKey = String(pId);
      if (visited.has(parentKey)) return [];
      const nextVisited = new Set(visited);
      nextVisited.add(parentKey);
      let ids = [];
      list.forEach((f) => {
        if (extractId(f.parentId) === pId) {
          const id = extractId(f.id);
          if (!id || nextVisited.has(String(id))) return;
          ids.push(id);
          ids = ids.concat(
            getDescendantIdsRecursive(id, list, nextVisited),
          );
        }
      });
      return ids;
    };

    const directIds = Array.from(accessible);
    directIds.forEach((pId) => {
      const descIds = getDescendantIdsRecursive(pId, allFolders);
      descIds.forEach((id) => accessible.add(id));
    });

    const navOnly = new Set();
    accessible.forEach((fId) => {
      let curr = allFolders.find((f) => extractId(f.id) === fId);
      const seen = new Set();
      while (curr && curr.parentId) {
        const currentId = extractId(curr.id);
        if (currentId && seen.has(String(currentId))) break;
        if (currentId) seen.add(String(currentId));
        const pId = extractId(curr.parentId);
        if (pId && !accessible.has(pId)) {
          navOnly.add(pId);
        }
        curr = allFolders.find((f) => extractId(f.id) === pId);
      }
    });

    return { accessible, navOnly };
  };

  const extractLibraryRelationId = (value) => {
    for (const item of asArray(value)) {
      const id = extractId(item);
      if (id) return id;
    }
    return null;
  };

  const getLibraryRecordCaseId = (record) =>
    extractId(record?.caseId) ||
    extractLibraryRelationId(record?.cases) ||
    extractId(record?.projectId) ||
    extractLibraryRelationId(record?.project);

  const getLibraryRecordLegalReferenceId = (record) =>
    extractId(record?.legalReferenceId) ||
    extractLibraryRelationId(record?.legalReference) ||
    extractLibraryRelationId(record?.legalReferenceRecord) ||
    extractLibraryRelationId(record?.internalTemplates) ||
    extractId(record?.internalTemplatesId) ||
    extractLibraryRelationId(record?.internalTemplate) ||
    extractId(record?.internalTemplateId);

  const getLibraryRecordLegalStudyId = (record) =>
    extractId(record?.legalStudyId) ||
    extractLibraryRelationId(record?.legalStudy) ||
    extractLibraryRelationId(record?.legalStudies) ||
    extractId(record?.legalStudiesId);

  const getLibraryShareRowUserId = (row) =>
    extractId(row?.userId) ||
    extractLibraryRelationId(row?.users) ||
    extractLibraryRelationId(row?.user);

  const getLibraryShareRowDocumentId = (row) =>
    extractId(row?.documentId) ||
    extractLibraryRelationId(row?.documents) ||
    extractLibraryRelationId(row?.document);

  const isLibraryDocumentSharedWithUser = (document, currentUserId) => {
    if (!currentUserId) return false;
    return asArray(document?._shareRows).some(
      (row) =>
        String(getLibraryShareRowUserId(row) || "") === String(currentUserId),
    );
  };

  async function requestLibraryRows(url, paramsVariants = []) {
    for (const params of paramsVariants) {
      try {
        const safeParams =
          url === "documents:list"
            ? await withDocumentSchemaSafeParams(params)
            : params;
        if (!safeParams) continue;
        const response = await ctx.api.request({ url, params: safeParams });
        return response?.data?.data || [];
      } catch {}
    }
    return [];
  }

  async function fetchTaskLibraryData(currentUserId) {
    const activeFilter = JSON.stringify({ isDeleted: { $ne: true } });
    const [folders, baseDocuments, shareRows] = await Promise.all([
      requestLibraryRows("folders:list", [
        {
          pageSize: 2000,
          page: 1,
          sort: ["createdAt"],
          filter: activeFilter,
          appends: [
            "createdBy",
            "folderManager",
            "folderManagers",
            "folderMember",
            "folderMembers",
          ],
        },
        {
          pageSize: 2000,
          page: 1,
          sort: ["createdAt"],
          filter: activeFilter,
          appends: ["createdBy", "folderManager", "folderMember"],
        },
        {
          pageSize: 2000,
          page: 1,
          sort: ["createdAt"],
          filter: activeFilter,
        },
      ]),
      requestLibraryRows("documents:list", [
        {
          pageSize: 2000,
          page: 1,
          sort: ["-createdAt"],
          filter: activeFilter,
          appends: ["fileAttachment", "createdBy"],
        },
        {
          pageSize: 2000,
          page: 1,
          sort: ["-createdAt"],
          filter: activeFilter,
          appends: ["fileAttachment", "createdBy"],
        },
      ]),
      currentUserId
        ? requestLibraryRows("documentShares:list", [
            {
              pageSize: 2000,
              page: 1,
              sort: ["-createdAt"],
              appends: ["users", "documents"],
            },
            {
              pageSize: 2000,
              page: 1,
              sort: ["-createdAt"],
            },
          ])
        : Promise.resolve([]),
    ]);

    const currentUserShareRows = shareRows.filter(
      (row) =>
        String(getLibraryShareRowUserId(row) || "") === String(currentUserId),
    );
    const sharedDocumentIds = Array.from(
      new Set(
        currentUserShareRows
          .map(getLibraryShareRowDocumentId)
          .filter(Boolean)
          .map(String),
      ),
    );
    const baseDocumentIds = new Set(
      baseDocuments.map((document) => String(extractId(document) || "")),
    );
    const missingSharedIds = sharedDocumentIds.filter(
      (id) => !baseDocumentIds.has(id),
    );
    const sharedDocuments = missingSharedIds.length
      ? await requestLibraryRows("documents:list", [
          {
            pageSize: 2000,
            page: 1,
            filter: JSON.stringify({ id: { $in: missingSharedIds } }),
            appends: ["fileAttachment", "createdBy"],
          },
          {
            pageSize: 2000,
            page: 1,
            filter: JSON.stringify({ id: { $in: missingSharedIds } }),
            appends: ["fileAttachment", "createdBy"],
          },
        ])
      : [];

    const shareMap = new Map();
    currentUserShareRows.forEach((row) => {
      const documentId = getLibraryShareRowDocumentId(row);
      if (!documentId) return;
      const key = String(documentId);
      if (!shareMap.has(key)) shareMap.set(key, []);
      shareMap.get(key).push(row);
    });

    const documentMap = new Map();
    [...baseDocuments, ...sharedDocuments].forEach((document) => {
      const documentId = extractId(document);
      if (!documentId) return;
      const key = String(documentId);
      documentMap.set(key, {
        ...document,
        _shareRows: shareMap.get(key) || [],
      });
    });

    return {
      folders: folders.filter((folder) => folder?.isDeleted !== true),
      documents: Array.from(documentMap.values()).filter(
        (document) => document?.isDeleted !== true,
      ),
    };
  }

  async function fetchLibraryRelationRows(caseId, relationName) {
    const safeCaseId = extractId(caseId);
    if (!safeCaseId) return [];
    const candidates = [
      `projects/${encodeURIComponent(safeCaseId)}/${relationName}:list`,
      `cases/${encodeURIComponent(safeCaseId)}/${relationName}:list`,
    ];
    for (const url of candidates) {
      for (const params of [
        { pageSize: 1000, page: 1, appends: ["createdBy"] },
        { pageSize: 1000, page: 1 },
      ]) {
        try {
          const response = await ctx.api.request({ url, params });
          return (response?.data?.data || []).filter(
            (record) => record?.isDeleted !== true,
          );
        } catch {}
      }
    }
    return [];
  }

  const makeLibrarySource = (group, entityId = null) => ({
    group,
    entityId: extractId(entityId),
  });

  const getLibrarySourceKey = (source) =>
    source
      ? `${source.group}:${source.entityId ? String(source.entityId) : "root"}`
      : "";

  const getDirectLibrarySource = (record, context) => {
    const storageType = String(record?.storageType || "").trim().toLowerCase();
    const moduleScope = String(record?.moduleScope || "").trim().toLowerCase();
    const caseRecordId = getLibraryRecordCaseId(record);
    const legalReferenceId = getLibraryRecordLegalReferenceId(record);
    const legalStudyId = getLibraryRecordLegalStudyId(record);
    const isLegalStudyRecord =
      storageType === LEGAL_STUDY_STORAGE_TYPE ||
      moduleScope === LEGAL_STUDY_MODULE_SCOPE;
    const isLegalReferenceRecord =
      storageType === LIBRARY_SOURCE.LEGAL_REFERENCE ||
      moduleScope === LIBRARY_SOURCE.LEGAL_REFERENCE;

    if (
      storageType === MY_DOCUMENT_STORAGE_TYPE ||
      moduleScope === MY_DOCUMENT_STORAGE_TYPE
    ) {
      return makeLibrarySource(LIBRARY_SOURCE.MY_DOCUMENTS);
    }

    if (legalStudyId && context.legalStudyIds.has(String(legalStudyId))) {
      return makeLibrarySource(LIBRARY_SOURCE.LEGAL_STUDY, legalStudyId);
    }

    if (isLegalStudyRecord) {
      const source = parseLegalStudySource(record?.legalStudySource);
      const sourceCaseId =
        extractId(source?.caseId) ||
        extractId(record?.sourceProjectId) ||
        caseRecordId;
      if (
        context.currentCaseId &&
        sourceCaseId &&
        String(sourceCaseId) === String(context.currentCaseId)
      ) {
        return makeLibrarySource(LIBRARY_SOURCE.LEGAL_STUDY);
      }
      return null;
    }

    if (legalReferenceId && context.legalReferenceIds.has(String(legalReferenceId))) {
      return makeLibrarySource(LIBRARY_SOURCE.LEGAL_REFERENCE, legalReferenceId);
    }

    if (isLegalReferenceRecord) return null;

    if (caseRecordId && context.caseReferenceIds.has(String(caseRecordId))) {
      return makeLibrarySource(LIBRARY_SOURCE.CASE_REFERENCE, caseRecordId);
    }

    if (
      caseRecordId &&
      context.currentCaseId &&
      String(caseRecordId) === String(context.currentCaseId)
    ) {
      return makeLibrarySource(
        LIBRARY_SOURCE.CASE_DOCUMENT,
        context.currentCaseId,
      );
    }

    return null;
  };

  const buildLibraryEntityMap = (records = []) => {
    const map = new Map();
    records.forEach((record) => {
      const id = extractId(record);
      if (id) map.set(String(id), record);
    });
    return map;
  };

  const sortLibraryRecords = (records = [], getLabel) =>
    [...records].sort((left, right) =>
      String(getLabel(left) || "").localeCompare(
        String(getLabel(right) || ""),
        "vi",
        { sensitivity: "base" },
      ),
    );

  const getLibraryDocumentAttachment = (document) =>
    Array.isArray(document?.fileAttachment)
      ? document.fileAttachment[0]
      : document?.fileAttachment;

  const getLibraryDocumentTitle = (document, attachment) =>
    document?.title ||
    document?.name ||
    document?.documentCode ||
    attachment?.title ||
    attachment?.filename ||
    `Document #${extractId(document) || ""}`;

  const getLibraryDocumentExtension = (document, attachment) => {
    const explicitExtension = String(attachment?.extname || "").trim();
    if (explicitExtension) {
      return explicitExtension.startsWith(".")
        ? explicitExtension.toLowerCase()
        : `.${explicitExtension.toLowerCase()}`;
    }
    const fileName = String(
      attachment?.filename ||
        attachment?.title ||
        document?.title ||
        document?.name ||
        "",
    );
    const match = fileName.match(/(\.[a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : "";
  };

  const renderLibraryTreeTitle = (label, type = "folder", extension = "") => {
    const fileInfo = getExtInfo(extension);
    const icon =
      type === "file"
        ? React.createElement(
            "span",
            {
              style: {
                width: 22,
                height: 22,
                borderRadius: 5,
                background: fileInfo.bg,
                color: fileInfo.color,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 13,
              },
            },
            fileInfo.icon,
          )
        : React.createElement(
            "span",
            {
              style: {
                width: 22,
                height: 22,
                borderRadius: 5,
                background: "#FFF7E6",
                color: "#D97706",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              },
            },
            TASK_FILE_ACTION_ICONS.folder,
          );

    return React.createElement(
      "span",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          minWidth: 0,
        },
      },
      icon,
      React.createElement(
        "span",
        {
          style: {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        label,
      ),
    );
  };

  const buildDocumentNode = (document) => {
    const attachment = getLibraryDocumentAttachment(document);
    const documentId = extractId(document);
    const title = getLibraryDocumentTitle(document, attachment);
    const extension = getLibraryDocumentExtension(document, attachment);
    return {
      title: renderLibraryTreeTitle(title, "file", extension),
      searchText: title,
      value: `library_doc_${documentId}`,
      key: `library_doc_${documentId}`,
      isLeaf: true,
      docData: document,
      attData: attachment,
    };
  };

  const pruneEmptyFolderNodes = (nodes) =>
    nodes
      .map((node) => ({
        ...node,
        children: pruneEmptyFolderNodes(node.children || []),
      }))
      .filter((node) => node.isLeaf || node.children.length > 0);

  // "Choose from Document" tree for the attach-file modal — shows 3 groups:
  // the current case's own full folder tree, folders/documents belonging to
  // linked (referenced) cases, and Reference material (legal reference +
  // legal study) already linked to the case. My Documents is excluded since
  // it isn't case-scoped. A subfolder doesn't necessarily carry its own
  // caseId/legalReferenceId/legalStudyId, so folder→source is resolved by
  // walking each folder's parentId chain up to the nearest ancestor that
  // does (mirrors CaseDocument.js's resolveFolderTreeRoot).
  const buildTaskLibraryTree = ({
    folders,
    documents,
    currentUser,
    currentLawyerId,
    currentCaseId,
    caseReferences = [],
    legalReferences = [],
    legalStudies = [],
  }) => {
    const userId = extractId(currentUser?.id);
    const isAdmin = isAdminUser(currentUser);
    const safeCaseId = extractId(currentCaseId);

    const caseReferenceMap = buildLibraryEntityMap(caseReferences);
    const legalReferenceMap = buildLibraryEntityMap(legalReferences);
    const legalStudyMap = buildLibraryEntityMap(legalStudies);

    const context = {
      currentCaseId: safeCaseId,
      caseReferenceIds: new Set(caseReferenceMap.keys()),
      legalReferenceIds: new Set(legalReferenceMap.keys()),
      legalStudyIds: new Set(legalStudyMap.keys()),
    };

    const folderMap = new Map();
    folders.forEach((folder) => {
      const id = extractId(folder);
      if (id) folderMap.set(String(id), folder);
    });

    const folderSourceMap = new Map();
    const resolvingFolderIds = new Set();
    const resolveFolderSource = (folder) => {
      const folderId = extractId(folder);
      if (!folderId) return null;
      const key = String(folderId);
      if (folderSourceMap.has(key)) return folderSourceMap.get(key);
      if (resolvingFolderIds.has(key)) return null;
      resolvingFolderIds.add(key);

      let source = getDirectLibrarySource(folder, context);
      if (!source) {
        const parentId = extractId(folder?.parentId);
        const parentFolder = parentId ? folderMap.get(String(parentId)) : null;
        if (parentFolder) source = resolveFolderSource(parentFolder);
      }

      resolvingFolderIds.delete(key);
      folderSourceMap.set(key, source);
      return source;
    };
    folders.forEach(resolveFolderSource);

    const { accessible, navOnly } = getVisibleFolderIds(
      folders,
      currentUser,
      currentLawyerId,
    );
    const accessibleIds = new Set(
      Array.from(accessible).filter(Boolean).map(String),
    );
    const navigationIds = new Set(
      Array.from(navOnly).filter(Boolean).map(String),
    );

    const visibleFolders = folders.filter((folder) => {
      const folderId = extractId(folder);
      const source = folderId ? folderSourceMap.get(String(folderId)) : null;
      if (!source || source.group === LIBRARY_SOURCE.MY_DOCUMENTS) return false;
      return (
        accessibleIds.has(String(folderId)) ||
        navigationIds.has(String(folderId))
      );
    });

    const visibleDocuments = [];
    documents.forEach((document) => {
      const attachment = getLibraryDocumentAttachment(document);
      if (!attachment?.id) return;

      let source = getDirectLibrarySource(document, context);
      const folderId = extractId(document?.folderId);
      if (!source && folderId) {
        source = folderSourceMap.get(String(folderId));
      }
      if (!source || source.group === LIBRARY_SOURCE.MY_DOCUMENTS) return;

      const isShared = isLibraryDocumentSharedWithUser(document, userId);
      const folderAccessible = !folderId || accessibleIds.has(String(folderId));
      const canView = !!userId && (isAdmin || folderAccessible || isShared);
      if (!canView) return;

      visibleDocuments.push({
        ...document,
        _librarySource: source,
        _libraryDirectShare: isShared && !folderAccessible,
      });
    });

    // The folder that carries a given source directly (not inherited via a
    // parentId walk) is that case/entity's own auto-created container
    // folder — its real name (e.g. "C001062026 - Vụ việc mẫu") is a better
    // label than a generic "Current case" placeholder.
    const findBucketRootFolder = (sourceKey) =>
      visibleFolders.find((folder) => {
        const direct = getDirectLibrarySource(folder, context);
        return direct && getLibrarySourceKey(direct) === sourceKey;
      });

    const buildBucketChildren = (sourceKey, options = {}) => {
      const { flattenRoot = true } = options;
      const bucketFolders = visibleFolders.filter((folder) => {
        const folderId = extractId(folder);
        const source = folderId ? folderSourceMap.get(String(folderId)) : null;
        return getLibrarySourceKey(source) === sourceKey;
      });
      const bucketDocuments = visibleDocuments.filter(
        (document) => getLibrarySourceKey(document._librarySource) === sourceKey,
      );

      const nodeMap = new Map();
      const sortedFolders = sortLibraryRecords(
        bucketFolders,
        (folder) => folder?.name || folder?.title || "",
      );
      sortedFolders.forEach((folder) => {
        const folderId = extractId(folder);
        const folderTitle = folder?.name || folder?.title || `Folder #${folderId}`;
        nodeMap.set(String(folderId), {
          title: renderLibraryTreeTitle(folderTitle),
          searchText: folderTitle,
          value: `library_folder_${folderId}`,
          key: `library_folder_${folderId}`,
          selectable: false,
          children: [],
        });
      });

      // The case/entity's own auto-created container folder carries the
      // source directly (getDirectLibrarySource matches it without a
      // parentId walk); everything else inherits the source from it. Only
      // "Current case" flattens it away — its group label already shows
      // that folder's real name, so keeping the node would just duplicate
      // it. Every other category (Linked cases, Reference) skips the
      // flatten and shows this folder as-is, since it's the real routing
      // node a user would click into (mirrors actual parent-child folder
      // structure instead of a synthetic type/entity grouping).
      const bucketRootFolder = flattenRoot ? findBucketRootFolder(sourceKey) : null;
      const bucketRootFolderIds = new Set(
        bucketRootFolder ? [String(extractId(bucketRootFolder))] : [],
      );

      const roots = [];
      sortedFolders.forEach((folder) => {
        const folderId = String(extractId(folder) || "");
        const parentId = String(extractId(folder?.parentId) || "");
        const node = nodeMap.get(folderId);
        if (!node) return;
        if (parentId && nodeMap.has(parentId)) {
          nodeMap.get(parentId).children.push(node);
        } else {
          roots.push(node);
        }
      });

      const rootDocuments = [];
      const directShareDocuments = [];
      sortLibraryRecords(bucketDocuments, (document) =>
        getLibraryDocumentTitle(document, getLibraryDocumentAttachment(document)),
      ).forEach((document) => {
        const folderId = String(extractId(document?.folderId) || "");
        const documentNode = buildDocumentNode(document);
        if (folderId && nodeMap.has(folderId) && !document._libraryDirectShare) {
          nodeMap.get(folderId).children.push(documentNode);
        } else if (document._libraryDirectShare) {
          directShareDocuments.push(documentNode);
        } else {
          rootDocuments.push(documentNode);
        }
      });

      const flattenedRoots = [];
      roots.forEach((node) => {
        const folderId = String(node.key || "").replace("library_folder_", "");
        if (bucketRootFolderIds.has(folderId)) {
          flattenedRoots.push(...(node.children || []));
        } else {
          flattenedRoots.push(node);
        }
      });

      const children = [...rootDocuments, ...pruneEmptyFolderNodes(flattenedRoots)];
      if (directShareDocuments.length > 0) {
        const sharedTitle = "Shared directly";
        children.push({
          title: renderLibraryTreeTitle(sharedTitle),
          searchText: sharedTitle,
          value: `library_shared_${sourceKey}`,
          key: `library_shared_${sourceKey}`,
          selectable: false,
          children: directShareDocuments,
        });
      }
      return children;
    };

    // Collects every entity's own root folder (or its loose root documents,
    // if it has no folder yet) directly — no synthetic per-entity label
    // node. The folder's own real name is what identifies it, so the tree
    // mirrors actual parent-child folder structure instead of routing
    // through a virtual "entity" or "type" node.
    const buildFlatEntityChildren = (group, entityMap) => {
      const nodes = [];
      entityMap.forEach((_record, entityId) => {
        const sourceKey = getLibrarySourceKey(makeLibrarySource(group, entityId));
        nodes.push(...buildBucketChildren(sourceKey, { flattenRoot: false }));
      });
      return sortLibraryRecords(nodes, (node) => node.searchText || "");
    };

    const groups = [];

    if (safeCaseId) {
      const currentCaseSourceKey = getLibrarySourceKey(
        makeLibrarySource(LIBRARY_SOURCE.CASE_DOCUMENT, safeCaseId),
      );
      const currentCaseChildren = buildBucketChildren(currentCaseSourceKey);
      const currentCaseRootFolder = findBucketRootFolder(currentCaseSourceKey);
      const currentCaseLabel =
        currentCaseRootFolder?.name ||
        currentCaseRootFolder?.title ||
        "Current case";
      groups.push({
        title: renderLibraryTreeTitle(currentCaseLabel),
        searchText: currentCaseLabel,
        value: "library_group_current_case",
        key: "library_group_current_case",
        selectable: false,
        children: currentCaseChildren,
      });
    }

    const linkedCaseChildren = buildFlatEntityChildren(
      LIBRARY_SOURCE.CASE_REFERENCE,
      caseReferenceMap,
    );
    if (linkedCaseChildren.length > 0) {
      groups.push({
        title: renderLibraryTreeTitle("Linked cases"),
        searchText: "Linked cases",
        value: "library_group_linked_cases",
        key: "library_group_linked_cases",
        selectable: false,
        children: linkedCaseChildren,
      });
    }

    const legalReferenceChildren = buildFlatEntityChildren(
      LIBRARY_SOURCE.LEGAL_REFERENCE,
      legalReferenceMap,
    );
    const legalStudyRootChildren = buildBucketChildren(
      getLibrarySourceKey(makeLibrarySource(LIBRARY_SOURCE.LEGAL_STUDY, null)),
      { flattenRoot: false },
    );
    const legalStudyEntityChildren = buildFlatEntityChildren(
      LIBRARY_SOURCE.LEGAL_STUDY,
      legalStudyMap,
    );
    const referenceChildren = sortLibraryRecords(
      [...legalReferenceChildren, ...legalStudyRootChildren, ...legalStudyEntityChildren],
      (node) => node.searchText || "",
    );
    if (referenceChildren.length > 0) {
      groups.push({
        title: renderLibraryTreeTitle("Reference"),
        searchText: "Reference",
        value: "library_group_reference",
        key: "library_group_reference",
        selectable: false,
        children: referenceChildren,
      });
    }

    return groups;
  };

  const buildPerm = ({ currentUser, myLawyer, isManager, itemLawyerId }) => {
    const isAdmin = isAdminUser(currentUser);
    const isAssignedToThis = !!(
      myLawyer &&
      itemLawyerId &&
      myLawyer.id === itemLawyerId
    );
    const isAssigneeOnly = !!myLawyer && !isManager;
    return {
      isManager,
      isAssigneeOnly,
      isAssignedToThis,
      canEdit: !isAssigneeOnly || isAssignedToThis,
      canManage: ((isAdmin || isManager) && !isAssigneeOnly) || isAssignedToThis,
      canAccessFilesAndTimesheet: isManager || isAssignedToThis,
    };
  };

  const resolveStatus = (newStatus, item) => {
    if (newStatus === "done" && item?.isRequiredApproval) return "pending";
    if (newStatus === "approval") return "done";
    return newStatus;
  };

  // ============================================================
  // §5 ATOMS
  // ============================================================

  const ReloadButton = ({ onReload, loading, text = "Refresh", style = {} }) => {
    return React.createElement(
      Button,
      {
        size: "medium",
        onClick: onReload,
        loading: loading,
        style: {
          padding: "5px 16px",
          fontFamily: FONT,
          fontSize: 12,
          borderRadius: 4,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          ...style,
        },
      },
      !loading ? `↻ ${text}` : text,
    );
  };

  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CFG[status] || STATUS_CFG.toDo;
    return React.createElement(
      "span",
      {
        style: {
          fontSize: 12,
          fontFamily: FONT,
          fontWeight: 500,
          padding: "2px 8px",
          borderRadius: 3,
          background: cfg.bg,
          color: cfg.color,
          border: `1px solid ${cfg.border}`,
          whiteSpace: "nowrap",
        },
      },
      cfg.label,
    );
  };

  const Av = ({ name, color, size = 20 }) =>
    React.createElement(
      "div",
      {
        title: name,
        style: {
          width: size,
          height: size,
          borderRadius: "50%",
          background: color || "#8c8c8c",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.42,
          color: "#fff",
          fontWeight: 500,
          flexShrink: 0,
        },
      },
      (name || "?").charAt(0).toUpperCase(),
    );

  const ApprovalIcon = ({ isRequiredApproval }) => {
    if (!isRequiredApproval)
      return React.createElement("div", {
        style: { width: COL.approval, flexShrink: 0 },
      });
    return React.createElement(
      "div",
      {
        style: {
          width: COL.approval,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        title: "Approval required",
      },
      React.createElement("span", { style: { fontSize: 12 } }, "🔐"),
    );
  };

  const TruncatedCell = ({
    value,
    maxLen = 30,
    style = {},
    showTooltip = false,
  }) => {
    const [expanded, setExpanded] = useState(false);
    if (!value)
      return React.createElement(
        Text,
        { style: { fontSize: 12, color: "#bfbfbf", fontFamily: FONT } },
        "—",
      );
    const needTruncate = value.length > maxLen;
    const display =
      !expanded && needTruncate ? value.slice(0, maxLen) + "…" : value;
    const textEl = React.createElement(
      "span",
      null,
      React.createElement(
        Text,
        {
          style: {
            fontSize: 12,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            fontFamily: FONT,
            ...style,
          },
        },
        display,
      ),
      needTruncate &&
        React.createElement(
          "span",
          {
            onClick: (e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            },
            style: {
              fontSize: 12,
              color: "#1890ff",
              cursor: "pointer",
              userSelect: "none",
              marginLeft: 4,
            },
          },
          expanded ? "Collapse" : "View more",
        ),
    );
    if (showTooltip && needTruncate)
      return React.createElement(
        Tooltip,
        { title: value, placement: "topLeft" },
        textEl,
      );
    return textEl;
  };

  const StatusBtn = ({
    status,
    size = 15,
    onChange,
    isRequiredApproval = false,
    isBlocked = false,
    readOnly = false,
  }) => {
    const [open, setOpen] = useState(false);
    const cfg = STATUS_CFG[status] || STATUS_CFG.toDo;
    const allowedKeys = getStatusKeys(isRequiredApproval);
    return React.createElement(
      "div",
      { style: { position: "relative", flexShrink: 0 } },
      React.createElement(
        "div",
        {
          onClick: (e) => {
            e.stopPropagation();
            // 🌟 NẾU BỊ CHẶN QUYỀN SẼ BÁO LỖI NGAY TẠI ĐÂY
            if (readOnly) {
              message.warning(
                "🔒 Only managers or the assignee can change the status",
              );
              return;
            }
            setOpen((v) => !v);
          },
          title: readOnly
            ? "No edit permission"
            : isBlocked
              ? "Task is blocked by a previous task"
              : cfg.label,
          style: {
            width: size,
            height: size,
            borderRadius: "50%",
            border: `2px solid ${cfg.color}`,
            background:
              status === "done"
                ? cfg.color
                : status === "inProgress"
                  ? `${cfg.color}25`
                  : status === "blocked"
                    ? `${cfg.color}20`
                    : "transparent",
            cursor: readOnly ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: readOnly ? 0.7 : 1,
          },
        },
        status === "done" &&
          React.createElement(
            "span",
            { style: { color: "#fff", fontSize: size * 0.6, lineHeight: 1 } },
            "✓",
          ),
        status === "cancelled" &&
          React.createElement(
            "span",
            { style: { color: cfg.color, fontSize: size * 0.6, lineHeight: 1 } },
            "×",
          ),
        status === "blocked" &&
          React.createElement(
            "span",
            { style: { color: cfg.color, fontSize: size * 0.55, lineHeight: 1 } },
            "⏸",
          ),
      ),
      open &&
        !readOnly &&
        React.createElement(
          "div",
          {
            style: {
              position: "absolute",
              top: size + 4,
              left: 0,
              zIndex: 9999,
              background: "#fff",
              border: "1px solid #e8e8e8",
              borderRadius: 6,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              padding: "4px 0",
              minWidth: 160,
            },
            onMouseLeave: () => setOpen(false),
          },
          ...allowedKeys.map((k) => {
            const v = STATUS_CFG[k];
            return React.createElement(
              "div",
              {
                key: k,
                onClick: (e) => {
                  e.stopPropagation();
                  onChange && onChange(k);
                  setOpen(false);
                },
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: FONT,
                },
                onMouseEnter: (e) =>
                  (e.currentTarget.style.background = "#f5f5f5"),
                onMouseLeave: (e) =>
                  (e.currentTarget.style.background = "transparent"),
              },
              React.createElement("div", {
                style: {
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: v.color,
                  flexShrink: 0,
                },
              }),
              React.createElement(
                "span",
                { style: { color: "#262626" } },
                v.label,
              ),
            );
          }),
        ),
    );
  };

  const ColHeader = () =>
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          minHeight: 32,
          borderBottom: "1px solid #e8e8e8",
          background: "#fafafa",
          fontSize: 12,
          fontFamily: FONT,
          fontWeight: 700,
          minWidth: 1300,
          color: "#8c8c8c",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
      },
      React.createElement(
        "div",
        { style: { width: COL.stt, flexShrink: 0, textAlign: "center" } },
        "STT",
      ),
      React.createElement("div", { style: { width: COL.toggle, flexShrink: 0 } }),
      React.createElement("div", { style: { width: 22, flexShrink: 0 } }),
      React.createElement(
        "div",
        { style: { flex: 1, padding: "0 10px", minWidth: 120 } },
        "Title",
      ),
      React.createElement(
        "div",
        { style: { width: COL.updatedAt, textAlign: "center", flexShrink: 0 } },
        "Updated date",
      ),
      React.createElement(
        "div",
        { style: { width: COL.assign, textAlign: "center", flexShrink: 0 } },
        "Assignee",
      ),
      React.createElement(
        "div",
        { style: { width: COL.desc, flexShrink: 0, padding: "0 8px" } },
        "Progress Details",
      ),
      React.createElement(
        "div",
        { style: { width: COL.start, textAlign: "center", flexShrink: 0 } },
        "Start",
      ),
      React.createElement(
        "div",
        { style: { width: COL.deadline, textAlign: "center", flexShrink: 0 } },
        "Deadline",
      ),
      React.createElement(
        "div",
        { style: { width: COL.pendingIssue, flexShrink: 0, padding: "0 8px" } },
        "Pending Issue",
      ),
      React.createElement(
        "div",
        { style: { width: COL.nextStep, flexShrink: 0, padding: "0 8px" } },
        "Next Step",
      ),
      React.createElement(
        "div",
        { style: { width: COL.files, textAlign: "center", flexShrink: 0 } },
        "Documents",
      ),
      React.createElement("div", {
        style: { width: COL.approval, flexShrink: 0 },
      }),
      React.createElement("div", {
        style: { width: COL.history, flexShrink: 0 },
      }),
      React.createElement("div", { style: { width: COL.menu, flexShrink: 0 } }),
    );
  // ============================================================
  // §6 PICKERS
  // ============================================================

  const PortalDropdown = ({ anchorRef, open, onClose, width, children }) => {
    const [pos, setPos] = useState({ top: 0, left: 0 });
    useEffect(() => {
      if (!open || !anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const openUp = rect.top > 400;
      setPos({
        top: openUp ? rect.top - 344 : rect.bottom + 4,
        left: rect.right - width,
      });
    }, [open]);
    if (!open) return null;
    return React.createElement(
      React.Fragment,
      null,
      React.createElement("div", {
        style: { position: "fixed", inset: 0, zIndex: 99998 },
        onClick: onClose,
      }),
      React.createElement(
        "div",
        {
          style: {
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 99999,
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 8,
            boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
            width,
            padding: "8px 0",
            maxHeight: 340,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
          },
          onClick: (e) => e.stopPropagation(),
        },
        children,
      ),
    );
  };

  const LawyerPicker = ({
    lawyers,
    value,
    onChange,
    size = 20,
    readOnly = false,
  }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const triggerRef = useRef(null);
    const cur = lawyers.find((l) => l.id === value);
    const color = cur
      ? LAWYER_COLORS[lawyers.indexOf(cur) % LAWYER_COLORS.length]
      : "#8c8c8c";

    const TYPE_ORDER = ["associate", "suppliant", "lawyer", "partner"];
    const filtered = lawyers.filter((l) =>
      (l.lawyerName || "").toLowerCase().includes(q.toLowerCase()),
    );
    const grouped = TYPE_ORDER.map((type) => ({
      type,
      cfg: LAWYER_TYPE_CFG[type] || {
        label: type,
        color: "#8c8c8c",
        bg: "#f5f5f5",
      },
      items: filtered.filter((l) => l.lawyerType === type),
    })).filter((g) => g.items.length > 0);
    const others = filtered.filter((l) => !TYPE_ORDER.includes(l.lawyerType));
    const handleClose = useCallback(() => {
      setOpen(false);
      setQ("");
    }, []);
    const renderLawyerRow = (l) => {
      const lColor = LAWYER_COLORS[lawyers.indexOf(l) % LAWYER_COLORS.length];
      return React.createElement(
        "div",
        {
          key: l.id,
          onClick: (e) => {
            e.stopPropagation();
            onChange && onChange(l.id, l.lawyerName, lColor);
            handleClose();
          },
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            cursor: "pointer",
            fontFamily: FONT,
          },
          onMouseEnter: (e) => (e.currentTarget.style.background = "#f5f5f5"),
          onMouseLeave: (e) => (e.currentTarget.style.background = "transparent"),
        },
        React.createElement(Av, { name: l.lawyerName, color: lColor, size: 26 }),
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#262626",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            l.lawyerName,
          ),
          l.unitPrice > 0 &&
            React.createElement(
              "div",
              { style: { fontSize: 12, fontFamily: FONT, color: "#8c8c8c" } },
              `${Number(l.unitPrice).toLocaleString("vi-VN")} ₫/hr`,
            ),
        ),
      );
    };
    const dropdownContent = React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", height: "100%" } },
      React.createElement(
        "div",
        { style: { padding: "0 10px 8px", flexShrink: 0 } },
        React.createElement("input", {
          autoFocus: true,
          value: q,
          onChange: (e) => setQ(e.target.value),
          placeholder: "Search lawyer...",
          style: {
            width: "100%",
            border: "1px solid #e8e8e8",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: FONT,
          },
        }),
      ),
      React.createElement(
        "div",
        { style: { overflowY: "auto", flex: 1 } },
        cur &&
          React.createElement(
            "div",
            {
              onClick: (e) => {
                e.stopPropagation();
                onChange && onChange(null, null, null);
                handleClose();
              },
              style: {
                padding: "7px 12px",
                fontSize: 12,
                color: "#cf1322",
                cursor: "pointer",
                fontFamily: FONT,
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
                borderBottom: "1px solid #f0f0f0",
              },
              onMouseEnter: (e) => (e.currentTarget.style.background = "#fff1f0"),
              onMouseLeave: (e) =>
                (e.currentTarget.style.background = "transparent"),
            },
            React.createElement("span", null, "×"),
            React.createElement("span", null, "Unassign"),
          ),
        ...grouped.map(({ type, cfg, items }) =>
          React.createElement(
            "div",
            { key: type },
            React.createElement(
              "div",
              {
                style: {
                  padding: "5px 12px 3px",
                  fontSize: 12,
                  fontFamily: FONT,
                  fontWeight: 700,
                  color: cfg.color,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  background: cfg.bg,
                  borderTop: "1px solid #f0f0f0",
                  borderBottom: "1px solid #f0f0f0",
                },
              },
              cfg.label,
            ),
            ...items.map(renderLawyerRow),
          ),
        ),
        others.length > 0 &&
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              {
                style: {
                  padding: "5px 12px 3px",
                  fontSize: 12,
                  fontFamily: FONT,
                  fontWeight: 700,
                  color: "#8c8c8c",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  background: "#f5f5f5",
                  borderTop: "1px solid #f0f0f0",
                },
              },
              "Other",
            ),
            ...others.map(renderLawyerRow),
          ),
      ),
    );

    return React.createElement(
      "div",
      {
        style: {
          position: "relative",
          flexShrink: 0,
          display: "flex",
          justifyContent: "flex-start",
        },
      },
      React.createElement(
        "div",
        {
          ref: triggerRef,
          onClick: (e) => {
            e.stopPropagation();
            if (!readOnly) setOpen((v) => !v);
          },
          style: {
            display: "inline-flex",
            alignItems: "center",
            cursor: readOnly ? "default" : "pointer",
            gap: 6,
          },
        },
        cur
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(Av, { name: cur.lawyerName, color, size }),
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 13,
                    fontFamily: FONT,
                    color: "#262626",
                    fontWeight: 600,
                  },
                },
                cur.lawyerName,
              ),
              !readOnly &&
                React.createElement(
                  "span",
                  { style: { fontSize: 12, color: "#bfbfbf", lineHeight: 1 } },
                  "▾",
                ),
            )
          : readOnly
            ? React.createElement("div", {
                style: {
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  background: "#f0f0f0",
                  border: "1px solid #e8e8e8",
                  flexShrink: 0,
                },
              })
            : React.createElement(
                "div",
                {
                  title: "Assign lawyer",
                  style: {
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    border: "1.5px dashed #bfbfbf",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: size * 0.55,
                    color: "#bfbfbf",
                  },
                },
                "+",
              ),
      ),
      React.createElement(
        PortalDropdown,
        { anchorRef: triggerRef, open, onClose: handleClose, width: 260 },
        dropdownContent,
      ),
    );
  };

  const TaskPicker = ({
    allTasks,
    currentTaskId,
    value,
    onChange,
    readOnly = false,
    services = [],
  }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const cur = useMemo(
      () => allTasks.find((t) => t.id === value),
      [allTasks, value],
    );
    const serviceMap = useMemo(() => {
      const m = { __none__: "No service assigned" };
      services.forEach((s) => {
        m[String(s.id)] = s.serviceName;
      });
      return m;
    }, [services]);

    const filtered = useMemo(
      () =>
        allTasks.filter(
          (t) =>
            t.id !== currentTaskId &&
            (t.title || "").toLowerCase().includes(q.toLowerCase()),
        ),
      [allTasks, currentTaskId, q],
    );

    const grouped = useMemo(() => {
      const map = {};
      filtered.forEach((t) => {
        const key = t.serviceId ? String(t.serviceId) : "__none__";
        if (!map[key]) map[key] = [];
        map[key].push(t);
      });

      const serviceKeys = services.map((s) => String(s.id)).filter((k) => map[k]);
      const noneKey = map["__none__"] ? ["__none__"] : [];
      return [...serviceKeys, ...noneKey].map((k) => ({
        key: k,
        label: serviceMap[k] || "Service #" + k,
        tasks: map[k],
      }));
    }, [filtered, services, serviceMap]);

    const handleClose = useCallback(() => {
      setOpen(false);
      setQ("");
    }, []);
    const CW = {
      status: 90,
      desc: 190,
      start: 82,
      lawyer: 175,
      deadline: 78,
      check: 24,
    };
    if (readOnly) {
      if (!cur)
        return React.createElement(
          "span",
          { style: { fontSize: 12, fontFamily: FONT, color: "#bfbfbf" } },
          "—",
        );
      return React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 6 } },
        React.createElement(StatusBadge, { status: cur.status }),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: "#262626",
              fontWeight: 500,
            },
          },
          cur.title,
        ),
      );
    }
    const renderTaskRow = (t) => {
      const isSelected = t.id === value;
      const st = STATUS_CFG[t.status] || STATUS_CFG.toDo;
      const od =
        t.dueDate &&
        t.status !== "done" &&
        t.status !== "cancelled" &&
        new Date(t.dueDate) < new Date();
      const isDone = t.status === "done";
      const isBlocked = t.status === "blocked";
      return React.createElement(
        "div",
        {
          key: t.id,
          onClick: () => {
            onChange(t.id);
            handleClose();
          },
          style: {
            display: "flex",
            alignItems: "center",
            padding: "7px 12px",
            cursor: "pointer",
            background: isSelected ? "#e6f4ff" : "transparent",
            borderBottom: "1px solid #f5f5f5",
            borderLeft:
              "3px solid " +
              (isBlocked ? "#722ed1" : isSelected ? "#1890ff" : "transparent"),
          },
          onMouseEnter: (e) => {
            if (!isSelected) e.currentTarget.style.background = "#f5f5f5";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = isSelected
              ? "#e6f4ff"
              : "transparent";
          },
        },
        React.createElement(
          "div",
          { style: { width: CW.status, flexShrink: 0 } },
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                fontFamily: FONT,
                fontWeight: 500,
                padding: "2px 6px",
                borderRadius: 3,
                background: st.bg,
                color: st.color,
                border: `1px solid ${st.border}`,
                whiteSpace: "nowrap",
                display: "inline-block",
              },
            },
            st.label,
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              flex: 1,
              paddingLeft: 8,
              paddingRight: 6,
              fontSize: 12,
              fontFamily: FONT,
              color: isDone ? "#bfbfbf" : isBlocked ? "#722ed1" : "#262626",
              textDecoration: isDone ? "line-through" : "none",
              overflow: "hidden",
              overflowWrap: "break-word",
              wordBreak: "break-word",
              whiteSpace: "normal",
              fontWeight: isSelected ? 600 : 500,
            },
          },
          t.title,
        ),
        React.createElement(
          "div",
          {
            style: {
              width: CW.check,
              flexShrink: 0,
              textAlign: "center",
              fontSize: 12,
              color: "#1890ff",
              fontWeight: 700,
            },
          },
          isSelected ? "✓" : "",
        ),
      );
    };

    const renderDropdown = () => {
      if (!open) return null;
      return React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 9999,
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            width: 460,
            marginTop: 4,
            display: "flex",
            flexDirection: "column",
            maxHeight: 440,
          },
        },
        React.createElement(
          "div",
          { style: { padding: "8px 10px 6px", flexShrink: 0 } },
          React.createElement("input", {
            autoFocus: true,
            value: q,
            onChange: (e) => setQ(e.target.value),
            placeholder: "Search tasks by name...",
            style: {
              width: "100%",
              border: "1px solid #e8e8e8",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              outline: "none",
              boxSizing: "border-box",
              fontFamily: FONT,
            },
          }),
        ),
        React.createElement(
          "div",
          { style: { overflowY: "auto", flex: 1 } },
          grouped.length === 0
            ? React.createElement(
                "div",
                {
                  style: {
                    padding: "16px",
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#bfbfbf",
                    textAlign: "center",
                  },
                },
                "No tasks found",
              )
            : grouped.map((g) =>
                React.createElement(
                  "div",
                  { key: g.key },
                  React.createElement(
                    "div",
                    {
                      style: {
                        padding: "10px 12px",
                        fontSize: 12,
                        fontFamily: FONT,
                        fontWeight: 700,
                        color: "#8c8c8c",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        background: "#f5f5f5",
                        borderTop: "1px solid #efefef",
                        borderBottom: "1px solid #efefef",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      },
                    },
                    React.createElement(
                      "span",
                      { style: { fontSize: 11 } },
                      "🗂",
                    ),
                    React.createElement("span", null, g.label),
                    React.createElement(
                      "span",
                      {
                        style: {
                          marginLeft: "auto",
                          background: "#e0e0e0",
                          borderRadius: 8,
                          padding: "0 6px",
                          fontSize: 12,
                        },
                      },
                      String(g.tasks.length),
                    ),
                  ),
                  g.tasks.map(renderTaskRow),
                ),
              ),
        ),
      );
    };

    return React.createElement(
      "div",
      { style: { position: "relative" } },
      open &&
        React.createElement("div", {
          style: { position: "fixed", inset: 0, zIndex: 9998 },
          onClick: handleClose,
        }),
      React.createElement(
        "div",
        {
          onClick: () => setOpen((v) => !v),
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            border: `1px solid ${open ? "#1890ff" : "#e8e8e8"}`,
            borderRadius: 6,
            cursor: "pointer",
            background: "#fff",
            minWidth: 280,
            position: "relative",
            zIndex: 9999,
          },
        },
        cur
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement("div", {
                style: {
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: (STATUS_CFG[cur.status] || STATUS_CFG.toDo).color,
                  flexShrink: 0,
                },
              }),
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 14,
                    fontFamily: FONT,
                    color: "#262626",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                  },
                },
                cur.title,
              ),
              React.createElement(StatusBadge, { status: cur.status }),
              React.createElement(
                "span",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    onChange(null);
                  },
                  style: {
                    fontSize: 14,
                    color: "#cf1322",
                    fontWeight: 700,
                    flexShrink: 0,
                    lineHeight: 1,
                  },
                },
                "×",
              ),
            )
          : React.createElement(
              "span",
              {
                style: {
                  fontSize: 14,
                  fontFamily: FONT,
                  color: "#bfbfbf",
                  flex: 1,
                },
              },
              "Select a prerequisite task...",
            ),
      ),
      renderDropdown(),
    );
  };

  // ============================================================
  // §7 SHARED TABS
  // ============================================================

  const HistoryPanel = ({ collectionName, recordId, canAccess = true }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const collectionMap = {
      tasks: "Task",
      task: "Task",
      Task: "Task",
      subTasks: "SubTask",
      subTask: "SubTask",
      SubTask: "SubTask",
    };
    const normalizedName = collectionMap[collectionName] || collectionName;

    useEffect(() => {
      if (!canAccess) {
        setLoading(false);
        return;
      }
      setLoading(true);
      Promise.all([
        fetchActivityLog(normalizedName, recordId),
        fetchNotes(normalizedName, recordId),
        fetchFiles(normalizedName, recordId),
      ]).then(([logs, notes, files]) => {
        const logItems = logs.map((a) => ({
          _kind: "log",
          _time: new Date(
            a.action === "created" ? a.createdAt : a.changedAt || a.updatedAt,
          ),
          data: a,
        }));
        const noteItems = notes.map((n) => ({
          _kind: "note",
          _time: new Date(n.createdAt),
          data: n,
        }));
        const fileItems = files.map((f) => ({
          _kind: "file",
          _time: new Date(f.createdAt),
          data: f,
        }));
        setItems(
          [...logItems, ...noteItems, ...fileItems].sort(
            (a, b) => b._time - a._time,
          ),
        );
        setLoading(false);
      });
    }, [recordId, normalizedName, canAccess]);

    const authorName = (n) =>
      n.createdBy?.nickname ||
      n.createdBy?.username ||
      n.createdBy?.email ||
      (n.createdById ? `User #${n.createdById}` : "Anonymous");
    if (!canAccess)
      return React.createElement(
        "div",
        {
          style: {
            margin: "0 28px 0 28px",
            padding: "16px",
            background: "#fafafa",
            border: "1px dashed #d9d9d9",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
          },
        },
        React.createElement("span", null, "🔒"),
        React.createElement(
          Text,
          { style: { fontSize: 12, fontFamily: FONT, color: "#8c8c8c" } },
          "You do not have permission to view this task's history.",
        ),
      );

    const renderLog = (a, key) => {
      const isCreate = a.action === "created";
      const timeVal = isCreate ? a.createdAt : a.changedAt || a.updatedAt;
      return React.createElement(
        "div",
        {
          key,
          style: {
            display: "flex",
            gap: 8,
            padding: "6px 0",
            borderBottom: "1px solid #f5f5f5",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              width: 22,
              height: 22,
              borderRadius: "50%",
              flexShrink: 0,
              background: isCreate ? "#f6ffed" : "#fff7e6",
              border: `1px solid ${isCreate ? "#b7eb8f" : "#ffd591"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            },
          },
          isCreate ? "✨" : "✏️",
        ),
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "div",
            {
              style: { display: "flex", justifyContent: "space-between", gap: 4 },
            },
            React.createElement(
              "span",
              { style: { fontSize: 12, fontFamily: FONT, color: "#262626" } },
              React.createElement("b", null, a.changedByName || "System"),
              ` ${isCreate ? "created" : "edited"} [${tF(a.fieldName || "")}]`,
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#bfbfbf",
                  flexShrink: 0,
                },
              },
              timeAgo(timeVal),
            ),
          ),
          (a.oldValue || a.newValue) &&
            !isCreate &&
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 2,
                  flexWrap: "wrap",
                },
              },
              a.oldValue &&
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 12,
                      color: "#cf1322",
                      background: "#fff1f0",
                      padding: "1px 5px",
                      borderRadius: 3,
                      textDecoration: "line-through",
                    },
                  },
                  formatActivityValue(a.oldValue),
                ),
              a.oldValue &&
                a.newValue &&
                React.createElement(
                  "span",
                  { style: { fontSize: 12, color: "#8c8c8c" } },
                  "→",
                ),
              a.newValue &&
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 12,
                      color: "#389e0d",
                      background: "#f6ffed",
                      padding: "1px 5px",
                      borderRadius: 3,
                    },
                  },
                  formatActivityValue(a.newValue),
                ),
            ),
        ),
      );
    };

    const renderNote = (n, key) =>
      React.createElement(
        "div",
        {
          key,
          style: {
            display: "flex",
            gap: 8,
            padding: "6px 0",
            borderBottom: "1px solid #f5f5f5",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              width: 22,
              height: 22,
              borderRadius: "50%",
              flexShrink: 0,
              background: "#e6fffb",
              border: "1px solid #87e8de",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            },
          },
          "📝",
        ),
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "div",
            {
              style: { display: "flex", justifyContent: "space-between", gap: 4 },
            },
            React.createElement(
              "span",
              { style: { fontSize: 12, fontFamily: FONT, color: "#262626" } },
              React.createElement("b", null, authorName(n)),
              " added a note",
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#bfbfbf",
                  flexShrink: 0,
                },
              },
              timeAgo(n.createdAt),
            ),
          ),
          React.createElement(
            "div",
            {
              style: {
                marginTop: 3,
                background: "#e6fffb",
                border: "1px solid #87e8de",
                borderLeft: "2px solid #13c2c2",
                borderRadius: 4,
                padding: "4px 8px",
              },
            },
            n.title &&
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    fontWeight: 600,
                    color: "#006d75",
                  },
                },
                n.title,
              ),
            n.body &&
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#595959",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                  },
                },
                (() => {
                  const plainText = n.body.replace(/<[^>]*>?/gm, "").trim();
                  return plainText.length > 100
                    ? plainText.slice(0, 100) + "…"
                    : plainText;
                })(),
              ),
          ),
        ),
      );

    const renderFile = (f, key) => {
      const att = Array.isArray(f.fileAttachment)
        ? f.fileAttachment[0]
        : f.fileAttachment;
      const fileExt = att?.extname || "";
      const extInfo = getExtInfo(fileExt);
      const fullUrl = getFullUrl(att?.url || att?.preview);
      return React.createElement(
        "div",
        {
          key,
          style: {
            display: "flex",
            gap: 8,
            padding: "6px 0",
            borderBottom: "1px solid #f5f5f5",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              width: 22,
              height: 22,
              borderRadius: "50%",
              flexShrink: 0,
              background: "#f9f0ff",
              border: "1px solid #d3adf7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            },
          },
          "📎",
        ),
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "div",
            {
              style: { display: "flex", justifyContent: "space-between", gap: 4 },
            },
            React.createElement(
              "span",
              { style: { fontSize: 12, fontFamily: FONT, color: "#262626" } },
              React.createElement(
                "b",
                null,
                f.createdBy
                  ? userName(f.createdBy) || f.createdBy?.email
                  : "System",
              ),
              " uploaded a document",
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#bfbfbf",
                  flexShrink: 0,
                },
              },
              timeAgo(f.createdAt),
            ),
          ),
          React.createElement(
            "div",
            {
              style: {
                marginTop: 3,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#f9f0ff",
                border: "1px solid #d3adf7",
                borderLeft: "2px solid #722ed1",
                borderRadius: 4,
                padding: "4px 8px",
              },
            },
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#262626",
                  fontWeight: 500,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              (f.title || att?.title || att?.filename || "(Untitled)") +
                fileExt,
            ),
            fullUrl &&
              React.createElement(
                "span",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    window.open(fullUrl, "_blank");
                  },
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#531dab",
                    cursor: "pointer",
                    flexShrink: 0,
                    padding: "1px 6px",
                    border: "1px solid #d3adf7",
                    borderRadius: 3,
                    background: "#fff",
                  },
                },
                "⬇️",
              ),
          ),
        ),
      );
    };

    return React.createElement(
      "div",
      {
        style: {
          margin: "0 0 0 28px",
          padding: "8px 12px",
          background: "#fafafa",
          borderLeft: "2px solid #e8e8e8",
          borderBottom: "1px solid #f0f0f0",
        },
      },
      loading
        ? React.createElement(
            "div",
            { style: { textAlign: "center", padding: "8px 0" } },
            React.createElement(Spin, { size: "small" }),
          )
        : items.length === 0
          ? React.createElement(
              Text,
              {
                style: {
                  fontSize: 12,
                  color: "#bfbfbf",
                  display: "block",
                  padding: "4px 0",
                  fontFamily: FONT,
                },
              },
              "No activity yet",
            )
          : React.createElement(
              "div",
              null,
              ...items.map((item, i) => {
                const key = `hp-${item._kind}-${i}`;
                if (item._kind === "log") return renderLog(item.data, key);
                if (item._kind === "note") return renderNote(item.data, key);
                if (item._kind === "file") return renderFile(item.data, key);
                return null;
              }),
            ),
    );
  };
  // ======================== HELPER ====================================
  // Helper: parse text và highlight @mention màu xanh
  const renderTextWithMentions = (text, lawyers) => {
    if (!text) return null;
    return React.createElement("div", {
      dangerouslySetInnerHTML: { __html: text },
      style: { whiteSpace: "pre-wrap" },
    });
  };

  // ============================================================
  // §RICHTEXT — QuillEditor (ctx.requireAsync CDN) + MentionPicker + CommentComposer
  // ============================================================

  // ── Async loader: ctx.requireAsync returns the UMD export directly ────
  // Per Nocobase docs, ctx.requireAsync('...js') returns the library object.
  // For Quill UMD: the return value IS the Quill constructor.
  // We must NOT access window.Quill (window.* globals are sandboxed).
  let _quillLoadPromise = null;
  const QUILL_FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];
  const QUILL_SIZE_LABEL_CSS = QUILL_FONT_SIZES.map(
    (size) => `
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="${size}"]::before,
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="${size}"]::before { content: "${size}"; }
    `,
  ).join("");
  const loadQuillAsync = () => {
    if (_quillLoadPromise) return _quillLoadPromise;
    _quillLoadPromise = ctx
      .requireAsync(
        "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css",
      )
      .then(() =>
        ctx.requireAsync(
          "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.min.js",
        ),
      )
      .then((QuillLib) => {
        // Normalize UMD export: could be the class itself, .default, or .Quill
        const Q =
          QuillLib && typeof QuillLib === "function"
            ? QuillLib
            : (QuillLib && QuillLib.default) ||
              (QuillLib && QuillLib.Quill) ||
              QuillLib;
        if (!Q) throw new Error("Quill constructor not found in UMD export");
        try {
          const SizeStyle = Q.import("attributors/style/size");
          SizeStyle.whitelist = QUILL_FONT_SIZES;
          Q.register(SizeStyle, true);
        } catch {}
        return Q;
      });
    return _quillLoadPromise;
  };
  // Kick off loading immediately so Quill is ready when component mounts
  loadQuillAsync().catch(() => {});

  // ── QuillEditor ────────────────────────────────────────────────────
  const QUILL_CUSTOM_CSS = `
      .ql-container.ql-snow { border: none !important; font-family: Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; border-radius: 0 0 8px 8px !important; }
      .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f0f0f0 !important; padding: 6px 8px !important; background: #f8f8f8 !important; border-radius: 8px 8px 0 0 !important; flex-wrap: wrap !important; }
      .ql-editor { min-height: 110px; max-height: 380px; overflow-y: auto; font-size: 14px; line-height: 1.7; padding: 12px 16px; font-family: Montserrat, sans-serif; }
      .ql-editor.ql-blank::before { color: #bfbfbf; font-style: normal; }
      .ql-editor blockquote { border-left: 3px solid #1890ff; padding-left: 10px; color: #595959; margin: 6px 0; }
      .ql-editor pre { background: #f6f8fa; border-radius: 6px; padding: 10px 14px; font-size: 12.5px; color: #333; }
      .ql-snow .ql-stroke { stroke: #555 !important; }
      .ql-snow .ql-fill { fill: #555 !important; }
      .ql-snow.ql-toolbar button:hover .ql-stroke, .ql-snow .ql-toolbar button:hover .ql-stroke { stroke: #1890ff !important; }
      .ql-snow.ql-toolbar button.ql-active .ql-stroke { stroke: #1890ff !important; }
      .ql-snow.ql-toolbar button.ql-active .ql-fill { fill: #1890ff !important; }
      .ql-snow .ql-picker.ql-size { width: 68px !important; }
      .ql-snow .ql-picker.ql-size .ql-picker-label::before { content: "14px"; }
      ${QUILL_SIZE_LABEL_CSS}
      .wysiwyg-content.ql-editor { padding: 0 !important; min-height: auto !important; max-height: none !important; overflow-y: visible !important; border: none !important; }
    `;

  const QuillEditor = ({
    value,
    onChange,
    placeholder,
    onSubmit,
    onUploadClick,
  }) => {
    const containerRef = useRef(null);
    const quillRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(null);
    const onUploadClickRef = useRef(onUploadClick);
    const onSubmitRef = useRef(onSubmit);

    useEffect(() => {
      onUploadClickRef.current = onUploadClick;
    }, [onUploadClick]);
    useEffect(() => {
      onSubmitRef.current = onSubmit;
    }, [onSubmit]);

    // Load Quill via ctx.requireAsync then init
    useEffect(() => {
      let destroyed = false;
      const cleanupFns = [];
      loadQuillAsync()
        .then((Quill) => {
          if (destroyed || !containerRef.current) return;
          if (quillRef.current) {
            setReady(true);
            return;
          } // already mounted

          const q = new Quill(containerRef.current, {
            theme: "snow",
            placeholder: placeholder || "Write a comment...",
            modules: {
              toolbar: {
                container: [
                  [{ size: QUILL_FONT_SIZES }],
                  ["bold", "italic", "underline", "strike"],
                  [{ align: [] }],
                  [{ indent: "-1" }, { indent: "+1" }],
                  ["blockquote", "code-block"],
                  [{ list: "ordered" }, { list: "bullet" }],
                  ["link", "upload"],
                  ["clean"],
                ],
                handlers: {
                  upload: function () {
                    if (onUploadClickRef.current) onUploadClickRef.current();
                  },
                  size: function (value) {
                    const range = this.quill.getSelection(true);
                    if (!range) return;
                    this.quill.focus();
                    if (range.length === 0) {
                      this.quill.format("size", value || false, "user");
                      return;
                    }
                    this.quill.formatText(
                      range.index,
                      range.length,
                      "size",
                      value || false,
                      "user",
                    );
                    this.quill.setSelection(range.index, range.length, "silent");
                  },
                },
              },
            },
          });

          // Inject custom SVG icon for upload button
          const uploadBtn =
            containerRef.current.parentElement.querySelector(".ql-upload");
          if (uploadBtn) {
            uploadBtn.innerHTML =
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>';
            uploadBtn.title = "Attach document";
          }

          // Add Tooltips to Quill toolbar buttons
          const tooltipMap = {
            ".ql-bold": "Bold (Ctrl+B)",
            ".ql-italic": "Italic (Ctrl+I)",
            ".ql-underline": "Underline (Ctrl+U)",
            ".ql-strike": "Strikethrough",
            '.ql-indent[value="-1"]': "Decrease indent",
            '.ql-indent[value="+1"]': "Increase indent",
            ".ql-blockquote": "Blockquote",
            ".ql-code-block": "Code block",
            '.ql-list[value="ordered"]': "Numbered list",
            '.ql-list[value="bullet"]': "Bullet list",
            ".ql-link": "Insert link",
            ".ql-clean": "Clear formatting",
          };
          Object.entries(tooltipMap).forEach(([selector, title]) => {
            const el = containerRef.current.parentElement.querySelector(selector);
            if (el) el.setAttribute("title", title);
          });
          const headerPicker = containerRef.current.parentElement.querySelector(
            ".ql-size .ql-picker-label",
          );
          if (headerPicker) headerPicker.setAttribute("title", "Font size");
          const alignPicker = containerRef.current.parentElement.querySelector(
            ".ql-align .ql-picker-label",
          );
          if (alignPicker) alignPicker.setAttribute("title", "Alignment");

          // Sync initial value
          if (value) {
            q.clipboard.dangerouslyPasteHTML(value);
            q.setSelection(q.getLength(), 0);
          }

          q.on("text-change", () => {
            const editorEl =
              containerRef.current &&
              containerRef.current.querySelector(".ql-editor");
            if (!editorEl) return;
            const html = editorEl.innerHTML;
            const empty = html === "<p><br></p>" || html === "";
            onChange(empty ? "" : html);
          });

          const handleSubmitShortcut = (e) => {
            if (!((e.ctrlKey || e.metaKey) && e.key === "Enter")) return;
            if (e.isComposing) return;
            if (!onSubmitRef.current) return;
            e.preventDefault();
            onSubmitRef.current();
          };
          q.root.addEventListener("keydown", handleSubmitShortcut, true);
          cleanupFns.push(() =>
            q.root.removeEventListener("keydown", handleSubmitShortcut, true),
          );

          quillRef.current = q;
          setReady(true);
        })
        .catch((e) => {
          console.error("Quill load error:", e);
          setError("Could not load editor. Please check your network connection.");
        });

      return () => {
        destroyed = true;
        cleanupFns.forEach((fn) => fn());
      };
    }, []); // intentional — only init once

    // Sync external clear (value reset to "")
    useEffect(() => {
      if (!quillRef.current || !containerRef.current) return;
      const editorEl = containerRef.current.querySelector(".ql-editor");
      if (!editorEl) return;
      if (!value && editorEl.innerHTML && editorEl.innerHTML !== "<p><br></p>") {
        quillRef.current.setText("");
      }
    }, [value]);

    return React.createElement(
      "div",
      {
        style: {
          border: "1px solid #d9d9d9",
          borderRadius: 8,
          background: "#fff",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        },
      },
      // Inject Quill custom CSS via React style element (sandbox-safe)
      React.createElement("style", null, QUILL_CUSTOM_CSS),
      error
        ? React.createElement(
            "div",
            {
              style: {
                padding: "12px 16px",
                color: "#ff4d4f",
                fontSize: 13,
                fontFamily: FONT,
              },
            },
            error,
          )
        : !ready
          ? React.createElement(
              "div",
              {
                style: {
                  padding: "12px 16px",
                  color: "#bfbfbf",
                  fontSize: 13,
                  fontFamily: FONT,
                },
              },
              "Loading editor...",
            )
          : null,
      React.createElement("div", { ref: containerRef }),
    );
  };

  // ── MentionPicker ──────────────────────────────────────────────────
  // Standalone "@ Nhắc đến ai" button + dropdown. No global event listeners.
  // Outside-click detection uses a fullscreen backdrop overlay (sandbox-safe pattern).
  const MentionPicker = ({ lawyers, assignedIds, onAssignMultiple }) => {
    const { Tag } = ctx.antd;
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const pickerRef = React.useRef(null);

    const closeDropdown = () => {
      setOpen(false);
      setSearch("");
    };

    const filtered = useMemo(() => {
      const q = search.toLowerCase();
      return q
        ? lawyers.filter((l) => l.lawyerName.toLowerCase().includes(q))
        : lawyers;
    }, [lawyers, search]);

    const toggle = (lawyer) => {
      const already = assignedIds.includes(lawyer.id);
      const next = already
        ? assignedIds.filter((id) => id !== lawyer.id)
        : [...assignedIds, lawyer.id];
      onAssignMultiple(next);
    };

    const removeTag = (id) =>
      onAssignMultiple(assignedIds.filter((i) => i !== id));

    return React.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          marginTop: 8,
        },
      },

      // ── @ Button ─────────────────────────────────────────────────
      React.createElement(
        "div",
        { ref: pickerRef, style: { position: "relative" } },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => {
              setOpen((v) => !v);
              setSearch("");
            },
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontFamily: FONT,
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: 20,
              border: open ? "1px solid #1890ff" : "1px solid #d9d9d9",
              background: open ? "#e6f4ff" : "#fff",
              color: open ? "#096dd9" : "#595959",
              cursor: "pointer",
              userSelect: "none",
              transition: "all 0.15s",
            },
            onMouseEnter: (e) => {
              if (!open) {
                e.currentTarget.style.borderColor = "#1890ff";
                e.currentTarget.style.color = "#1890ff";
              }
            },
            onMouseLeave: (e) => {
              if (!open) {
                e.currentTarget.style.borderColor = "#d9d9d9";
                e.currentTarget.style.color = "#595959";
              }
            },
          },
          React.createElement(
            "span",
            { style: { fontSize: 14, fontWeight: 700 } },
            "@",
          ),
          "Mention someone",
        ),

        // ── Dropdown ───────────────────────────────────────────────
        open &&
          React.createElement(
            "div",
            {
              style: {
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 9999,
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
                minWidth: 240,
                maxHeight: 280,
                overflowY: "auto",
                padding: "6px 0",
              },
            },
            // Search input
            React.createElement(
              "div",
              {
                style: { padding: "6px 10px", borderBottom: "1px solid #f0f0f0" },
              },
              React.createElement("input", {
                autoFocus: true,
                value: search,
                onChange: (e) => setSearch(e.target.value),
                placeholder: "Search lawyer name...",
                style: {
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #e0e0e0",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 12,
                  fontFamily: FONT,
                  outline: "none",
                },
              }),
            ),
            // List
            filtered.length === 0
              ? React.createElement(
                  "div",
                  {
                    style: {
                      padding: "12px",
                      textAlign: "center",
                      color: "#bfbfbf",
                      fontSize: 12,
                      fontFamily: FONT,
                    },
                  },
                  "Not found",
                )
              : filtered.map((l) => {
                  const selected = assignedIds.includes(l.id);
                  return React.createElement(
                    "div",
                    {
                      key: l.id,
                      onMouseDown: (e) => {
                        e.preventDefault();
                        toggle(l);
                      },
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 14px",
                        cursor: "pointer",
                        background: selected ? "#e6f4ff" : "transparent",
                        borderLeft: selected
                          ? "3px solid #1890ff"
                          : "3px solid transparent",
                        transition: "background 0.1s",
                      },
                      onMouseEnter: (e) => {
                        if (!selected)
                          e.currentTarget.style.background = "#f5f5f5";
                      },
                      onMouseLeave: (e) => {
                        if (!selected)
                          e.currentTarget.style.background = "transparent";
                      },
                    },
                    React.createElement(Av, { name: l.lawyerName, size: 28 }),
                    React.createElement(
                      "div",
                      { style: { flex: 1 } },
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 13,
                            fontWeight: selected ? 700 : 400,
                            color: selected ? "#096dd9" : "#262626",
                            fontFamily: FONT,
                          },
                        },
                        l.lawyerName,
                      ),
                      l.lawyerType &&
                        React.createElement(
                          "div",
                          { style: { fontSize: 11, color: "#8c8c8c" } },
                          l.lawyerType,
                        ),
                    ),
                    selected &&
                      React.createElement(
                        "span",
                        {
                          style: {
                            fontSize: 16,
                            color: "#1890ff",
                            fontWeight: 700,
                          },
                        },
                        "✓",
                      ),
                  );
                }),
          ),
      ),

      // ── Selected Tags ─────────────────────────────────────────────
      assignedIds.map((id) => {
        const lawyer = lawyers.find((l) => l.id === id);
        if (!lawyer) return null;
        return React.createElement(
          Tag,
          {
            key: id,
            closable: true,
            onClose: () => removeTag(id),
            style: {
              borderRadius: 16,
              background: "#e6f4ff",
              color: "#096dd9",
              border: "1px solid #91caff",
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 10px 2px 6px",
            },
          },
          React.createElement(Av, { name: lawyer.lawyerName, size: 16 }),
          lawyer.lawyerName,
        );
      }),
    );
  };

  // ── CommentComposer — wraps QuillEditor + MentionPicker ────────────
  const CommentComposer = ({
    value,
    onChange,
    onAssignMultiple,
    assignedIds,
    lawyers,
    placeholder,
    onSubmit,
    onUploadClick,
  }) => {
    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 0 } },
      React.createElement(QuillEditor, {
        value,
        onChange,
        placeholder,
        onSubmit,
        onUploadClick,
      }),
      React.createElement(MentionPicker, {
        lawyers,
        assignedIds,
        onAssignMultiple,
      }),
    );
  };

  // 🌟 HÀM RENDER VĂN BẢN (HỖ TRỢ MENTION VÀ ĐỊNH DẠNG B/I/U)
  const renderRichText = (text, lawyers) => {
    if (!text) return null;

    // Kiểm tra xem text có phải HTML (WYSIWYG) hay không. Quill luôn bọc nội dung bằng thẻ block (vd <p>, <ol>).
    const isHtml = /<[a-z][\s\S]*>/i.test(text);

    if (isHtml) {
      return React.createElement("div", {
        dangerouslySetInnerHTML: { __html: text },
        className: "wysiwyg-content ql-editor",
        style: { whiteSpace: "pre-wrap", wordBreak: "break-word" },
      });
    }

    // --- Hỗ trợ tương thích ngược cho text Markdown cũ ---
    const escapedNames = lawyers
      .map((l) => l.lawyerName)
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${()|[\]\\]/g, "\\$&"));
    const mentionPattern = new RegExp(`(@(?:${escapedNames.join("|")}))`, "g");

    return text.split("\n").map((line, lineIdx) => {
      const parts = line.split(mentionPattern);
      const renderedLine = parts.map((part, i) => {
        if (
          part.startsWith("@") &&
          lawyers.some((l) => part === `@${l.lawyerName}`)
        ) {
          return React.createElement(
            "span",
            {
              key: `m-${i}`,
              style: {
                color: "#096dd9",
                background: "#e6f4ff",
                borderRadius: 4,
                padding: "0 4px",
                fontWeight: 600,
                fontSize: 13,
                border: "1px solid #91caff",
                margin: "0 2px",
                display: "inline-block",
              },
            },
            part,
          );
        }
        let subParts = [part];
        const boldRegex = /(\*\*(.*?)\*\*)/g;
        let newSubParts = [];
        subParts.forEach((p) => {
          if (typeof p !== "string") {
            newSubParts.push(p);
            return;
          }
          const segments = p.split(boldRegex);
          for (let j = 0; j < segments.length; j++) {
            if (j % 3 === 2) {
              newSubParts.push(
                React.createElement("b", { key: `b-${i}-${j}` }, segments[j]),
              );
              j++;
            } else if (j % 3 === 0) {
              if (segments[j]) newSubParts.push(segments[j]);
            }
          }
        });
        subParts = newSubParts;
        const italicRegex = /(\*(.*?)\*)/g;
        newSubParts = [];
        subParts.forEach((p, idx) => {
          if (typeof p !== "string") {
            newSubParts.push(p);
            return;
          }
          const segments = p.split(italicRegex);
          for (let j = 0; j < segments.length; j++) {
            if (j % 3 === 2) {
              newSubParts.push(
                React.createElement(
                  "i",
                  { key: `i-${i}-${idx}-${j}` },
                  segments[j],
                ),
              );
              j++;
            } else if (j % 3 === 0) {
              if (segments[j]) newSubParts.push(segments[j]);
            }
          }
        });
        subParts = newSubParts;
        return React.createElement(
          React.Fragment,
          { key: `t-${i}` },
          ...subParts,
        );
      });
      return React.createElement(
        "div",
        { key: `l-${lineIdx}`, style: { minHeight: "1.2em", marginBottom: 2 } },
        renderedLine,
      );
    });
  };

  // 🌟 WYSIWYG RICH TEXT EDITOR V6 - CONTENT_EDITABLE + INLINE MENTIONS
  const RichMentionInput = ({
    value,
    onChange,
    onAssignMultiple,
    assignedIds,
    lawyers,
    placeholder,
    onSubmit,
    onUploadClick, // Thêm prop cho nút upload
  }) => {
    const { Tag, Tooltip } = ctx.antd;
    const containerRef = useRef(null);
    const editorRef = useRef(null);
    const dropdownRef = useRef(null);

    const [showDD, setShowDD] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIdx, setActiveIdx] = useState(0);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    // Filter lawyers based on query
    const filtered = useMemo(() => {
      const q = query.toLowerCase();
      const list = q
        ? lawyers.filter((l) => l.lawyerName.toLowerCase().includes(q))
        : lawyers;
      return list.slice(0, 8);
    }, [lawyers, query]);

    // Sync initial value (only if editor is empty to prevent cursor jump)
    useEffect(() => {
      if (
        editorRef.current &&
        value !== editorRef.current.innerHTML &&
        document.activeElement !== editorRef.current
      ) {
        editorRef.current.innerHTML = value || "";
      }
    }, [value]);

    // ── Handle Input Change ──────────────────────────────────
    const handleInput = () => {
      const el = editorRef.current;
      if (!el) return;
      onChange(el.innerHTML);

      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;

      // Only detect @ in text nodes
      if (textNode.nodeType === Node.TEXT_NODE) {
        const textBeforeCaret = textNode.textContent.slice(0, range.startOffset);
        const match = textBeforeCaret.match(/@([^\s@]{0,30})$/);

        if (match) {
          setQuery(match[1]);
          setShowDD(true);
          setActiveIdx(0);

          // Get accurate caret position for dropdown
          const rect = range.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          setDropdownPos({
            top: rect.bottom - containerRect.top + 4,
            left: rect.left - containerRect.left,
          });
        } else {
          setShowDD(false);
        }
      } else {
        setShowDD(false);
      }

      // Auto-sync: remove assigned IDs if their mention tag was deleted
      if (onAssignMultiple && assignedIds.length > 0) {
        const currentHtml = el.innerHTML;
        const keep = assignedIds.filter((id) => {
          const l = lawyers.find((x) => x.id === id);
          return l && currentHtml.includes(`data-id="${id}"`);
        });
        if (keep.length !== assignedIds.length) onAssignMultiple(keep);
      }
    };

    // ── Execute Format Commands ──────────────────────────────
    const executeCommand = (e, cmd, value = null) => {
      e.preventDefault();
      if (editorRef.current) editorRef.current.focus();

      if (cmd === "h1" || cmd === "h2") {
        document.execCommand("formatBlock", false, cmd.toUpperCase());
      } else if (cmd === "quote") {
        document.execCommand("formatBlock", false, "BLOCKQUOTE");
      } else if (cmd === "code") {
        document.execCommand("formatBlock", false, "PRE");
      } else {
        document.execCommand(cmd, false, value);
      }

      handleInput(); // Trigger sync
    };

    // ── Select Mention from Dropdown ──────────────────────────
    const selectLawyer = (lawyer) => {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;

      if (textNode.nodeType === Node.TEXT_NODE) {
        const textBeforeCaret = textNode.textContent.slice(0, range.startOffset);
        const match = textBeforeCaret.match(/@([^\s@]{0,30})$/);

        if (match) {
          // Remove the "@query" text
          range.setStart(textNode, range.startOffset - match[0].length);
          range.deleteContents();

          // Insert Mention Tag
          const mentionNode = document.createElement("span");
          mentionNode.contentEditable = "false";
          mentionNode.className = "mention-tag";
          mentionNode.setAttribute("data-id", lawyer.id);
          mentionNode.style.cssText =
            "color: #096dd9; background: #e6f4ff; border-radius: 4px; padding: 0 4px; font-weight: 600; font-size: 13px; border: 1px solid #91caff; margin: 0 2px; display: inline-block; user-select: all;";
          mentionNode.innerText = `@${lawyer.lawyerName}`;

          const spaceNode = document.createTextNode("\u00A0"); // Non-breaking space

          range.insertNode(spaceNode);
          range.insertNode(mentionNode);

          // Move caret after space
          range.setStartAfter(spaceNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      // Sync IDs
      const newIds = assignedIds.includes(lawyer.id)
        ? assignedIds
        : [...assignedIds, lawyer.id];
      onAssignMultiple(newIds);
      setShowDD(false);
      setQuery("");
      handleInput();
    };

    // ── Keyboard Navigation ──────────────────────────────────
    const handleKeyDown = (e) => {
      if (showDD && filtered.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = Math.min(activeIdx + 1, filtered.length - 1);
          setActiveIdx(next);
          dropdownRef.current?.children[next]?.scrollIntoView({
            block: "nearest",
          });
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = Math.max(activeIdx - 1, 0);
          setActiveIdx(prev);
          dropdownRef.current?.children[prev]?.scrollIntoView({
            block: "nearest",
          });
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          if (filtered[activeIdx]) selectLawyer(filtered[activeIdx]);
          return;
        }
        if (e.key === "Escape") {
          setShowDD(false);
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (onSubmit) onSubmit();
      }
    };

    // ── Remove Assigned Tag Manually ─────────────────────────
    const removeAssigned = (id) => {
      const newIds = assignedIds.filter((i) => i !== id);
      onAssignMultiple(newIds);

      // Remove from DOM
      if (editorRef.current) {
        const elements = editorRef.current.querySelectorAll(
          `span[data-id="${id}"]`,
        );
        elements.forEach((el) => el.remove());
        onChange(editorRef.current.innerHTML);
      }
    };

    // ── Format Buttons ───────────────────────────────────────
    const FMT = [
      {
        key: "bold",
        title: "Bold (Ctrl+B)",
        cmd: "bold",
        el: React.createElement("b", null, "B"),
      },
      {
        key: "italic",
        title: "Italic (Ctrl+I)",
        cmd: "italic",
        el: React.createElement("i", null, "I"),
      },
      {
        key: "underline",
        title: "Underline (Ctrl+U)",
        cmd: "underline",
        el: React.createElement("u", null, "U"),
      },
      {
        key: "strikeThrough",
        title: "Strikethrough",
        cmd: "strikeThrough",
        el: React.createElement("s", null, "S"),
      },
      { key: "sep1" },
      { key: "h1", title: "Large heading", cmd: "h1", el: "H1" },
      { key: "h2", title: "Medium heading", cmd: "h2", el: "H2" },
      { key: "sep2" },
      { key: "quote", title: "Blockquote", cmd: "quote", el: "❝" },
      {
        key: "insertUnorderedList",
        title: "Bullet list",
        cmd: "insertUnorderedList",
        el: "• —",
      },
      {
        key: "insertOrderedList",
        title: "Numbered list",
        cmd: "insertOrderedList",
        el: "1.—",
      },
      {
        key: "insertHorizontalRule",
        title: "Horizontal rule",
        cmd: "insertHorizontalRule",
        el: "─",
      },
    ];

    const Sep = () =>
      React.createElement("div", {
        style: {
          width: 1,
          height: 18,
          background: "#e0e0e0",
          margin: "0 2px",
          flexShrink: 0,
        },
      });

    return React.createElement(
      "div",
      {
        ref: containerRef,
        style: {
          border: "1px solid #d9d9d9",
          borderRadius: 8,
          background: "#fff",
          boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
          position: "relative",
        },
      },
      // Toolbar
      React.createElement(
        "div",
        {
          style: {
            padding: "5px 8px",
            background: "#f8f8f8",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexWrap: "wrap",
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          },
        },
        ...FMT.map((f) => {
          if (f.key.startsWith("sep"))
            return React.createElement(Sep, { key: f.key });
          return React.createElement(
            Tooltip,
            { key: f.key, title: f.title, placement: "top" },
            React.createElement(
              "button",
              {
                type: "button",
                onMouseDown: (e) => executeCommand(e, f.cmd),
                style: {
                  minWidth: 28,
                  height: 26,
                  padding: "0 4px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#333",
                  userSelect: "none",
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "#e8f4ff";
                  e.currentTarget.style.borderColor = "#1890ff";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = "#ddd";
                },
              },
              f.el,
            ),
          );
        }),
        React.createElement(Sep, { key: "sep-upload" }),
        onUploadClick &&
          React.createElement(
            Tooltip,
            { title: "Attach file", placement: "top" },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: onUploadClick,
                style: {
                  minWidth: 28,
                  height: 26,
                  padding: "0 4px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: FONT,
                  color: "#333",
                  userSelect: "none",
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "#e8f4ff";
                  e.currentTarget.style.borderColor = "#1890ff";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = "#ddd";
                },
              },
              "📎",
            ),
          ),
        React.createElement(
          "span",
          {
            style: {
              marginLeft: "auto",
              fontSize: 11,
              color: "#bbb",
              fontFamily: FONT,
            },
          },
          "@ mention · Ctrl+Enter to send",
        ),
      ),
      // ContentEditable Editor
      React.createElement("div", {
        ref: editorRef,
        contentEditable: true,
        onInput: handleInput,
        onKeyDown: handleKeyDown,
        onBlur: () => setTimeout(() => setShowDD(false), 200),
        style: {
          width: "100%",
          minHeight: 100,
          maxHeight: 380,
          padding: "12px 16px",
          fontSize: 14,
          fontFamily: FONT,
          lineHeight: 1.7,
          border: "none",
          outline: "none",
          overflowY: "auto",
          boxSizing: "border-box",
          background: "transparent",
        },
        "data-placeholder": placeholder || "Write a comment... (@ to mention someone)",
      }),
      // Dropdown Mentions
      showDD &&
        filtered.length > 0 &&
        React.createElement(
          "div",
          {
            style: {
              position: "absolute",
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 9999,
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 10,
              boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
              minWidth: 230,
              maxHeight: 240,
              overflowY: "auto",
              padding: "4px 0",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                padding: "5px 12px 6px",
                fontSize: 11,
                color: "#888",
                fontFamily: FONT,
                borderBottom: "1px solid #f0f0f0",
              },
            },
            query ? `Search lawyer: "${query}"` : "Mention a lawyer",
          ),
          React.createElement(
            "div",
            { ref: dropdownRef },
            filtered.map((l, idx) =>
              React.createElement(
                "div",
                {
                  key: l.id,
                  onMouseDown: (e) => {
                    e.preventDefault();
                    selectLawyer(l);
                  },
                  onMouseEnter: () => setActiveIdx(idx),
                  style: {
                    padding: "8px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: idx === activeIdx ? "#e6f4ff" : "transparent",
                    borderLeft:
                      idx === activeIdx
                        ? "3px solid #1890ff"
                        : "3px solid transparent",
                    transition: "background 0.1s",
                  },
                },
                React.createElement(Av, { name: l.lawyerName, size: 28 }),
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 13,
                        fontWeight: idx === activeIdx ? 600 : 400,
                        color: idx === activeIdx ? "#096dd9" : "#262626",
                        fontFamily: FONT,
                      },
                    },
                    l.lawyerName,
                  ),
                  l.lawyerType &&
                    React.createElement(
                      "div",
                      { style: { fontSize: 11, color: "#888" } },
                      l.lawyerType,
                    ),
                ),
              ),
            ),
          ),
        ),
      // Tags List
      assignedIds.length > 0 &&
        React.createElement(
          "div",
          {
            style: {
              padding: "6px 12px 8px",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 6,
              background: "#fafcff",
            },
          },
          React.createElement(
            "span",
            { style: { fontSize: 11, color: "#888", fontFamily: FONT } },
            "Mentioned:",
          ),
          assignedIds.map((id) => {
            const lawyer = lawyers.find((l) => l.id === id);
            if (!lawyer) return null;
            return React.createElement(
              Tag,
              {
                key: id,
                closable: true,
                onClose: () => removeAssigned(id),
                style: {
                  borderRadius: 12,
                  background: "#e6f4ff",
                  color: "#096dd9",
                  border: "1px solid #91caff",
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                },
              },
              React.createElement(Av, { name: lawyer.lawyerName, size: 16 }),
              lawyer.lawyerName,
            );
          }),
        ),
    );
  };
  // ============================================================
  // UnifiedNoteThread
  // ============================================================
  const UnifiedNoteThread = ({
    collectionName,
    recordId,
    currentUser,
    lawyers,
    canEdit = true,
    projectFolderId,
    onFilesUpdate,
    refreshTrigger,
    taskContext = {},
    caseId = null, // 🌟 Bổ sung caseId để tạo deep-link
  }) => {
    // ProjectInternal (Internal Work) tasks have no Case/Reference to move
    // documents into — the file-level move actions swap to a single
    // "Move to Library" action targeting the company-level Knowledge space
    // instead (see LIBRARY_DESTINATION.KNOWLEDGE).
    const isProjectInternalContext = !!taskContext?.projectInternalId;
    const currentLawyerId = useMemo(() => {
      const currentUserId = extractId(currentUser?.id);
      const found = lawyers?.find((l) => {
        const lawyerUserId = extractId(l.userId) || extractId(l.user);
        return currentUserId && lawyerUserId === currentUserId;
      });
      return found?.id || null;
    }, [currentUser, lawyers]);
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [body, setBody] = useState("");
    const [assignedIds, setAssignedIds] = useState([]);
    const [sending, setSending] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [pendingDocs, setPendingDocs] = useState([]);
    const pendingReplaceInputRef = useRef(null);
    const pendingReplaceTargetRef = useRef(null);
    // Chặn gửi trùng: canSend/sending (state) cập nhật không đồng bộ với
    // ref onSubmitRef (Ctrl+Enter trong Quill) hoặc onClick nút Comment,
    // nên dựa riêng state không đủ an toàn — cần 1 ref check ngay đầu
    // handleSend, đồng bộ tuyệt đối, không phụ thuộc chu kỳ render.
    const sendingRef = useRef(false);
    const [replacingPendingIndex, setReplacingPendingIndex] = useState(null);
    const [pendingBatchId, setPendingBatchId] = useState(
      () => `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    );
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editBody, setEditBody] = useState("");
    const [editAssignedIds, setEditAssignedIds] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const [expandedThreads, setExpandedThreads] = useState({});
    const [showAll, setShowAll] = useState(false);
    const [folderLookup, setFolderLookup] = useState({});
    const INITIAL_COUNT = 10;
    const reload = useCallback(() => {
      setLoading(true);
      Promise.all([
        fetchNotes(collectionName, recordId),
        fetchFiles(collectionName, recordId),
      ]).then(async ([notes, files]) => {
        const WINDOW_MS = 5000;
        const usedFileIds = new Set();
        const noteItems = notes.map((n) => {
          const noteTime = new Date(n.createdAt).getTime();
          const attachedFiles = files.filter((f) => {
            if (usedFileIds.has(f.id)) return false;
            if (n.batchId && f.batchId && n.batchId === f.batchId) return true;
            return (
              Math.abs(new Date(f.createdAt).getTime() - noteTime) <= WINDOW_MS
            );
          });
          attachedFiles.forEach((f) => usedFileIds.add(f.id));
          return {
            _kind: "item",
            _time: new Date(n.createdAt),
            note: n,
            files: attachedFiles,
          };
        });
        const remainingFiles = files.filter((f) => !usedFileIds.has(f.id));
        const fileOnlyItems = [];
        const processedIds = new Set();
        remainingFiles.forEach((f) => {
          if (processedIds.has(f.id)) return;
          const fTime = new Date(f.createdAt).getTime();
          const batch = remainingFiles.filter((f2) => {
            if (processedIds.has(f2.id) && f2.id !== f.id) return false;
            if (f.batchId && f2.batchId && f.batchId === f2.batchId) return true;
            return (
              Math.abs(new Date(f2.createdAt).getTime() - fTime) <= WINDOW_MS
            );
          });
          batch.forEach((f2) => processedIds.add(f2.id));
          fileOnlyItems.push({
            _kind: "item",
            _time: new Date(f.createdAt),
            note: null,
            files: batch,
          });
        });
        const allItems = [...noteItems, ...fileOnlyItems].sort(
          (a, b) => b._time - a._time,
        );
        setFeed(allItems);
        if (onFilesUpdate) onFilesUpdate(files);
        setFolderLookup(await fetchFolderLookupForFiles(files));
        setLoading(false);
      });
    }, [collectionName, recordId, onFilesUpdate]);
    useEffect(() => {
      reload();
    }, [reload, refreshTrigger]);
    const authorName = (n) =>
      n.createdBy?.nickname ||
      n.createdBy?.username ||
      n.createdBy?.email ||
      (n.createdById ? `User #${n.createdById}` : "Anonymous");
    const warnMentionOnly = () => {
      message.warning("Please enter a comment before mentioning someone.");
    };
    const handleSend = async () => {
      if (sendingRef.current) return;
      const hasText = getCommentText(body, true).length > 0;
      const hasFiles = pendingDocs.length > 0;
      if (assignedIds.length > 0 && !hasText) {
        warnMentionOnly();
        return;
      }
      if (!hasText && !hasFiles) return;
      sendingRef.current = true;
      setSending(true);
      const batchId = pendingBatchId;
      try {
        // ── BƯỚC 1: Tạo Note với batchId ─────────────────────────
        const currentPath = window.location.origin + window.location.pathname;
        const actualCaseId =
          extractId(caseId) ||
          extractId(taskContext.caseId) ||
          extractId(ctx.record?.id) ||
          getPathSegmentId(DEEP_LINK_CONFIG.KW_SOURCE) ||
          getPathSegmentId(DEEP_LINK_CONFIG.KW_FILTER);
        let linkedUrl = `${currentPath}`;

        // 🌟 TỰ ĐỘNG TẠO DEEP-LINK NẾU LÀ TASK (Hardcore Join)
        if (collectionName === "Task") {
          const { buildUrl } = DEEP_LINK_CONFIG;

          // Lấy caseId từ props hoặc trích xuất từ URL hiện tại
          if (actualCaseId) {
            linkedUrl = buildUrl(recordId, actualCaseId);
          }
        }
        const currentTime = new Date().toISOString(); // 🌟 Thời gian đồng bộ
        const noteRes = await apiReq("notes:create", "POST", {
          collectionName,
          recordId,
          title: "Comment",
          body: hasText ? body.trim() : null,
          linkedUrl,
          assignees: assignedIds,
          assignedLawyerId: assignedIds[0] || null, // 🌟 Thêm field đơn để trigger DB
          parentId: replyingTo
            ? replyingTo.note?.id || replyingTo.files?.[0]?.id
            : null,
          replyText: replyingTo?.note?.body
            ? replyingTo.note.body
                .replace(/<[^>]*>?/gm, "")
                .trim()
                .substring(0, 150) +
              (replyingTo.note.body.length > 150 ? "..." : "")
            : replyingTo
              ? "Attached document"
              : null,
          batchId,
          createdAt: currentTime, // 🌟 Đồng bộ thời gian tạo note
        });

        const noteId = noteRes?.data?.data?.id;
        if (noteId && assignedIds.length > 0) {
          // 🌟 Log thủ công cho M2M assignees (vì trigger không bắt được)
          const names = assignedIds
            .map((id) => {
              const l = lawyers?.find(
                (law) => extractId(law.id) === extractId(id),
              );
              return l?.lawyerName || l?.nickname || `#${id}`;
            })
            .join(", ");

          await logActivity(
            "Note",
            noteId,
            "created",
            "assignees",
            null,
            names,
            currentUser?.nickname || currentUser?.username || "System",
            batchId,
            null,
            currentTime,
          );
          // Mirror cho parent
          await logActivity(
            initcap(collectionName),
            recordId,
            "created",
            "assignees",
            null,
            names,
            currentUser?.nickname || currentUser?.username || "System",
            batchId,
            noteId,
            currentTime,
          );
        }

        // ── BƯỚC 2: Tạo Document records cùng batchId ────────────
        if (hasFiles) {
          const folderIdMap = await createTaskUploadFoldersFromEntries(
            pendingDocs,
            projectFolderId,
            { currentUser },
          );
          const toISO = (val) => {
            if (!val) return null;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d.toISOString();
          };
          for (const pDoc of pendingDocs) {
            const relativeFolderPath = getRelativeFolderPath(pDoc.relativePath);
            const targetFolderId =
              folderIdMap[relativeFolderPath] || extractId(projectFolderId);
            const docTitle =
              pDoc.docTitle || pDoc.metadata.title?.trim() || pDoc.fileName;
            await apiReq("documents:create", "POST", {
              title: docTitle,
              documentType: pDoc.metadata.documentType?.trim() || "",
              documentCode: pDoc.metadata.documentCode?.trim() || "",
              openingDate: toISO(pDoc.metadata.openingDate),
              signedAt: toISO(pDoc.metadata.signedAt),
              effectiveAt: toISO(pDoc.metadata.effectiveAt),
              senderName: pDoc.metadata.senderName?.trim() || "",
              recipientName: pDoc.metadata.recipientName?.trim() || "",
              language: pDoc.metadata.language?.trim() || "",
              docFormat: pDoc.metadata.docFormat?.trim() || "",
              googleDriveUrl: pDoc.metadata.googleDriveUrl?.trim() || "",
              note: pDoc.metadata.note?.trim() || "",
              updatedById: currentUser?.id || null,
              updatedAt: new Date().toISOString(),
              uploadedById: currentUser?.id || null,
              ...buildTaskUploadDocumentLink(collectionName, recordId, {
                folderId: targetFolderId,
              }),
              storageType: "cases",
              createdById: currentUser?.id || null,
              createdAt: new Date().toISOString(),
              batchId,
              ...(pDoc.attIds && { fileAttachment: pDoc.attIds }),
            });
          }
        }

        setBody("");
        setAssignedIds([]);
        setReplyingTo(null);
        setPendingDocs([]);
        setPendingBatchId(
          `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        );
        reload();
        message.success("Comment posted");
      } catch (e) {
        message.error("Error: " + (e?.message || "Please try again"));
      }
      sendingRef.current = false;
      setSending(false);
    };

    const handleSaveEdit = async (noteId) => {
      const newBody = editBody.trim();
      if (!newBody) return;
      const currentNoteItem = feed.find(
        (item) => item.note && item.note.id === noteId,
      );
      const oldBody = currentNoteItem?.note?.body || "";
      const oldAssignees = (currentNoteItem?.note?.assignees || []).map((a) =>
        typeof a === "object" ? a.id : a,
      );
      const bodyChanged = oldBody !== newBody;
      const assigneesChanged =
        JSON.stringify([...oldAssignees].sort()) !==
        JSON.stringify([...editAssignedIds].sort());

      if (!bodyChanged && !assigneesChanged) {
        setEditingNoteId(null);
        setEditBody("");
        setEditAssignedIds([]);
        return;
      }
      try {
        const currentTime = new Date().toISOString();
        const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; // 🌟 Tạo batchId duy nhất cho lần sửa này

        await apiReq(`notes:update?filterByTk=${noteId}`, "POST", {
          body: newBody,
          assignees: editAssignedIds,
          assignedLawyerId: editAssignedIds[0] || null,
          batchId: actionBatchId, // 🌟 Cập nhật batchId của record sang ID mới để trigger dùng
        });

        // 🌟 Log thủ công cho M2M assignees thay đổi (dùng actionBatchId mới)
        const oldNames = oldAssignees
          .map((id) => {
            const l = lawyers?.find((law) => extractId(law.id) === extractId(id));
            return l?.lawyerName || l?.nickname || `#${id}`;
          })
          .join(", ");
        const newNames = editAssignedIds
          .map((id) => {
            const l = lawyers?.find((law) => extractId(law.id) === extractId(id));
            return l?.lawyerName || l?.nickname || `#${id}`;
          })
          .join(", ");

        if (oldNames !== newNames) {
          const userName =
            currentUser?.nickname || currentUser?.username || "System";
          await logActivity(
            "Note",
            noteId,
            "updated",
            "assignees",
            oldNames || null,
            newNames || null,
            userName,
            actionBatchId, // 🌟 Dùng batchId mới
            null,
            currentTime,
          );
          await logActivity(
            initcap(collectionName),
            recordId,
            "updated",
            "assignees",
            oldNames || null,
            newNames || null,
            userName,
            actionBatchId, // 🌟 Dùng batchId mới
            noteId,
            currentTime,
          );
        }
        // 🌟 XÓA BỎ logActivity thủ công, để SQL Trigger tự làm việc cho đồng nhất
        setFeed((prev) =>
          prev.map((item) => {
            if (item.note && item.note.id === noteId)
              return {
                ...item,
                note: { ...item.note, body: newBody, assignees: editAssignedIds },
              };
            return item;
          }),
        );
        setEditingNoteId(null);
        setEditBody("");
        setEditAssignedIds([]);
        message.success("Comment updated");
      } catch (e) {
        message.error("Update failed");
      }
    };

    const handleDeleteNote = (item) => {
      const { note, files } = item;
      Modal.confirm({
        title: "Confirm deletion",
        content: note
          ? "Are you sure you want to delete this comment and its attached files?"
          : "Are you sure you want to delete these files?",
        okText: "Delete",
        cancelText: "Cancel",
        okType: "danger",
        onOk: async () => {
          try {
            const currentTime = new Date().toISOString();
            const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; // 🌟 BatchId riêng cho việc xóa
            const userName =
              currentUser?.nickname || currentUser?.username || "System";

            if (note) {
              await apiReq(`notes:update?filterByTk=${note.id}`, "POST", {
                isDeleted: true,
                batchId: actionBatchId, // 🌟 Cập nhật batchId để trigger bắt đúng
              });

              // 🌟 Log xóa assignees (dùng actionBatchId mới)
              const currentAssignees = note.assignees || [];
              if (currentAssignees.length > 0) {
                const names = currentAssignees
                  .map((a) => {
                    const id = typeof a === "object" ? a.id : a;
                    const l = lawyers?.find(
                      (law) => extractId(law.id) === extractId(id),
                    );
                    return l?.lawyerName || l?.nickname || `#${id}`;
                  })
                  .join(", ");

                await logActivity(
                  "Note",
                  note.id,
                  "deleted",
                  "assignees",
                  names,
                  null,
                  userName,
                  actionBatchId,
                  null,
                  currentTime,
                );
                await logActivity(
                  initcap(collectionName),
                  recordId,
                  "deleted",
                  "assignees",
                  names,
                  null,
                  userName,
                  actionBatchId,
                  note.id,
                  currentTime,
                );
              }
            }
            if (files && files.length > 0) {
              for (const f of files) {
                await apiReq(`documents:update?filterByTk=${f.id}`, "POST", {
                  isDeleted: true,
                  // batchId: deleteBatchId, // ❌ Không thay đổi batchId
                });
              }
            }
            setFeed((prev) => prev.filter((i) => i !== item));
            message.success("Deleted successfully");
          } catch (e) {
            message.error("Delete failed");
          }
        },
      });
    };

    const [editingFileId, setEditingFileId] = useState(null);
    const [editFileTitle, setEditFileTitle] = useState("");
    const [expandedPreviews, setExpandedPreviews] = useState({});
    const [replacingFileDoc, setReplacingFileDoc] = useState(null);
    const [libraryMoveTarget, setLibraryMoveTarget] = useState(null);
    // Bulk-select state, scoped per comment: { [itemKey]: { active, ids: Set<fileId> } }.
    const [bulkSelectState, setBulkSelectState] = useState({});
    const [bulkMoveTarget, setBulkMoveTarget] = useState(null);

    const toggleBulkSelectMode = (itemKey) => {
      setBulkSelectState((prev) => {
        if (prev[itemKey]?.active) {
          const next = { ...prev };
          delete next[itemKey];
          return next;
        }
        return { ...prev, [itemKey]: { active: true, ids: new Set() } };
      });
    };

    const toggleBulkFileSelected = (itemKey, fileId) => {
      setBulkSelectState((prev) => {
        const cur = prev[itemKey] || { active: true, ids: new Set() };
        const ids = new Set(cur.ids);
        if (ids.has(fileId)) ids.delete(fileId);
        else ids.add(fileId);
        return { ...prev, [itemKey]: { active: true, ids } };
      });
    };

    const handleSaveFileTitle = async (f) => {
      const newTitle = editFileTitle.trim();
      if (!newTitle) return;
      try {
        const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const attachment = getPrimaryAttachment(f);
        const oldTitle =
          f.title || f.name || attachment?.title || attachment?.filename || "";

        await apiReq(`documents:update?filterByTk=${f.id}`, "POST", {
          title: newTitle,
          name: newTitle,
          batchId: actionBatchId,
        });
        if (attachment?.id) {
          await apiReq(`attachments:update?filterByTk=${attachment.id}`, "POST", {
            title: newTitle,
          }).catch(() => {});
        }

        // 🌟 Log thủ công vì SQL trigger chặn update title của documents
        const userName =
          currentUser?.nickname || currentUser?.username || "System";
        await logActivity(
          "Document",
          f.id,
          "updated",
          "title",
          oldTitle,
          newTitle,
          userName,
          actionBatchId,
          null,
          new Date().toISOString(),
        );
        // Mirror cho parent (Task)
        await logActivity(
          initcap(collectionName),
          recordId,
          "updated",
          "documents",
          oldTitle,
          newTitle,
          userName,
          actionBatchId,  
          f.id,
          new Date().toISOString(),
        );

        setFeed((prev) =>
          prev.map((item) => ({
            ...item,
            files: item.files.map((file) =>
              file.id === f.id ? withSyncedDocumentFileTitle(file, newTitle) : file,
            ),
          })),
        );
        message.success("Document name updated");
      } catch (e) {
        message.error("Failed to update name");
      }
      setEditingFileId(null);
      setEditFileTitle("");
    };

    const renderFileRow = (f, itemKey) => {
      const bulkState = bulkSelectState[itemKey];
      const bulkSelectActive = !!bulkState?.active;
      const bulkSelected = !!bulkState?.ids?.has(f.id);
      const att = Array.isArray(f.fileAttachment)
        ? f.fileAttachment[0]
        : f.fileAttachment;
      const ext = att?.extname
        ? att.extname.startsWith(".")
          ? att.extname.toLowerCase()
          : "." + att.extname.toLowerCase()
        : "";
      const rawFilename = att?.filename || "File";
      const displayTitle = f.title || f.name || att?.title || rawFilename;
      const fullUrl = getFullUrl(att?.url || att?.preview);
      const isPdf = ext === ".pdf";
      const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(
        ext,
      );
      const isOffice = [
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".odt",
      ].includes(ext);
      const officeViewerUrl =
        isOffice && fullUrl
          ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
          : null;
      const canIframe = isPdf || isImage || isOffice;
      const isExpanded = !!expandedPreviews[f.id];
      const isEditingThisFile = editingFileId === f.id;
      const isMine = currentUser && f.createdById === currentUser.id;
      const linkedLegalStudy = isLinkedToLegalStudy(f);
      const movedBadge = getMovedDestinationBadge(f, folderLookup);
      const fileActionItems = [
        {
          key: "preview",
          icon: TASK_FILE_ACTION_ICONS.preview,
          label: isExpanded ? "Hide preview" : "Preview",
          disabled: !fullUrl,
        },
        {
          key: "download",
          icon: TASK_FILE_ACTION_ICONS.download,
          label: "Download",
          disabled: !fullUrl,
        },
        canEdit && !isProjectInternalContext && !linkedLegalStudy && {
          key: "move_legal_study",
          icon: TASK_FILE_ACTION_ICONS.moveLegalStudy,
          label: "Move to Reference",
        },
        // Replaces the old "Move to Legal Reference" action — moving into
        // the current case's own Document tree is what's actually used;
        // the org-wide Legal Reference library move stays available only
        // via the folder-level action, not per-file. Kept visible even
        // after a prior move so files can be re-moved to a different folder.
        canEdit && !isProjectInternalContext && {
          key: "move_to_document",
          icon: TASK_FILE_ACTION_ICONS.folder,
          label: "Move to Case's Document",
        },
        // ProjectInternal tasks have no Case/Reference — only offer moving
        // up to the company-level Knowledge library instead.
        canEdit && isProjectInternalContext && {
          key: "move_to_library",
          icon: TASK_FILE_ACTION_ICONS.moveLegalReference,
          label: "Move to Library",
        },
        isMine && canEdit && {
          key: "edit",
          icon: TASK_FILE_ACTION_ICONS.edit,
          label: "Rename",
        },
        isMine && canEdit && {
          key: "replace_file",
          icon: TASK_FILE_ACTION_ICONS.replace,
          label: "Replace file",
        },
      ].filter(Boolean);
      const handleFileActionClick = ({ key, domEvent }) => {
        domEvent?.stopPropagation?.();
        if (key === "preview") {
          if (!fullUrl) return;
          if (canIframe) {
            setExpandedPreviews((prev) => ({ ...prev, [f.id]: !prev[f.id] }));
          } else {
            setPreviewDoc(f);
          }
          return;
        }
        if (key === "download") {
          if (fullUrl) window.open(fullUrl, "_blank");
          return;
        }
        if (key === "move_legal_study") {
          setLibraryMoveTarget({
            record: f,
            destinationType: LIBRARY_DESTINATION.LEGAL_STUDY,
          });
          return;
        }
        if (key === "move_to_document") {
          setLibraryMoveTarget({
            record: f,
            destinationType: LIBRARY_DESTINATION.CASE_DOCUMENT,
          });
          return;
        }
        if (key === "move_to_library") {
          setLibraryMoveTarget({
            record: f,
            destinationType: LIBRARY_DESTINATION.KNOWLEDGE,
          });
          return;
        }
        if (key === "edit") {
          setEditingFileId(f.id);
          setEditFileTitle(displayTitle);
          return;
        }
        if (key === "replace_file") {
          setReplacingFileDoc(f);
        }
      };

      return React.createElement(
        "div",
        {
          key: f.id,
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginTop: 8,
            background: "#fff",
            borderRadius: 8,
            border: "1px solid #e8e8e8",
            overflow: "hidden",
          },
        },
        // ── Header row: title + actions ─────────────────────────
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
            },
          },
          // Bulk-select checkbox
          bulkSelectActive &&
            React.createElement("input", {
              type: "checkbox",
              checked: bulkSelected,
              onClick: (e) => e.stopPropagation(),
              onChange: () => toggleBulkFileSelected(itemKey, f.id),
              style: { flexShrink: 0, cursor: "pointer" },
            }),
          // File icon
          getFileIcon(ext),
          // Title or edit input
          isEditingThisFile
            ? React.createElement("input", {
                autoFocus: true,
                value: editFileTitle,
                onChange: (e) => setEditFileTitle(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter") handleSaveFileTitle(f);
                  if (e.key === "Escape") setEditingFileId(null);
                },
                style: {
                  flex: 1,
                  fontSize: 13,
                  fontFamily: FONT,
                  border: "1px solid #1890ff",
                  borderRadius: 4,
                  padding: "3px 8px",
                  outline: "none",
                },
              })
            : React.createElement(
                "span",
                {
                  onClick: bulkSelectActive
                    ? () => toggleBulkFileSelected(itemKey, f.id)
                    : fullUrl
                      ? () => setPreviewDoc(f)
                      : undefined,
                  title: `Original file: ${rawFilename}`,
                  style: {
                    fontSize: 13,
                    fontFamily: FONT,
                    fontWeight: 600,
                    color: "#096dd9",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: bulkSelectActive || fullUrl ? "pointer" : "default",
                    textDecoration: fullUrl ? "underline" : "none",
                    textUnderlineOffset: 3,
                  },
                },
                displayTitle,
              ),
          // Action buttons
          isEditingThisFile
            ? React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  "span",
                  {
                    onClick: () => handleSaveFileTitle(f),
                    style: {
                      fontSize: 12,
                      padding: "2px 10px",
                      cursor: "pointer",
                      color: "#fff",
                      background: "#1890ff",
                      borderRadius: 4,
                      fontWeight: 600,
                      flexShrink: 0,
                    },
                  },
                  "Save",
                ),
                React.createElement(
                  "span",
                  {
                    onClick: () => setEditingFileId(null),
                    style: {
                      fontSize: 12,
                      padding: "2px 8px",
                      cursor: "pointer",
                      color: "#595959",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                      flexShrink: 0,
                    },
                  },
                  "Cancel",
                ),
              )
            : bulkSelectActive
              ? null
              : React.createElement(
                Dropdown,
                {
                  trigger: ["click"],
                  placement: "bottomRight",
                  menu: {
                    items: fileActionItems,
                    onClick: handleFileActionClick,
                  },
                },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    title: "Actions",
                    onClick: (e) => e.stopPropagation(),
                    style: {
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: "1px solid #E5E7EB",
                      background: "#FFFFFF",
                      color: "#4B5563",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      padding: 0,
                    },
                  },
                  TASK_FILE_ACTION_ICONS.more,
                ),
              ),
        ),
        // ── Moved-destination badge ─────────────────────────────────
        movedBadge &&
          React.createElement(
            "div",
            { style: { padding: "0 12px 8px" } },
            renderMovedBadge(movedBadge),
          ),
        // ── Inline iframe preview ─────────────────────────────────
        isExpanded &&
          fullUrl &&
          renderTaskFilePreviewFrame({
            fullUrl,
            title: displayTitle,
            isPdf,
            isImage,
            isOffice,
            officeViewerUrl,
            height: isOffice ? 660 : isPdf ? 620 : 440,
          }),
      );
    };

    const renderBulkSelectBar = (itemKey, files) => {
      if (!canEdit || files.length === 0) return null;
      const state = bulkSelectState[itemKey];
      const active = !!state?.active;
      const selectedCount = state?.ids?.size || 0;
      if (!active) {
        return React.createElement(
          "span",
          {
            onClick: () => toggleBulkSelectMode(itemKey),
            style: {
              display: "inline-block",
              marginTop: 8,
              fontSize: 12,
              fontFamily: FONT,
              color: "#1890ff",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            },
          },
          "Select files",
        );
      }
      const selectedFiles = files.filter((f) => state.ids.has(f.id));
      return React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 8,
            padding: "6px 10px",
            background: "#f0f8ff",
            border: "1px dashed #91caff",
            borderRadius: 6,
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 12, fontFamily: FONT, color: "#262626", fontWeight: 600 } },
          `${selectedCount} selected`,
        ),
        ...(isProjectInternalContext
          ? [
              React.createElement(
                Button,
                {
                  key: "move-library",
                  size: "small",
                  disabled: selectedCount === 0,
                  onClick: () =>
                    setBulkMoveTarget({
                      records: selectedFiles,
                      destinationType: LIBRARY_DESTINATION.KNOWLEDGE,
                      itemKey,
                    }),
                },
                "Move to Library",
              ),
            ]
          : [
              React.createElement(
                Button,
                {
                  key: "move-document",
                  size: "small",
                  disabled: selectedCount === 0,
                  onClick: () =>
                    setBulkMoveTarget({
                      records: selectedFiles,
                      destinationType: LIBRARY_DESTINATION.CASE_DOCUMENT,
                      itemKey,
                    }),
                },
                "Move to Document",
              ),
              React.createElement(
                Button,
                {
                  key: "move-reference",
                  size: "small",
                  disabled: selectedCount === 0,
                  onClick: () =>
                    setBulkMoveTarget({
                      records: selectedFiles,
                      destinationType: LIBRARY_DESTINATION.LEGAL_STUDY,
                      itemKey,
                    }),
                },
                "Move to Reference",
              ),
            ]),
        React.createElement(
          "span",
          {
            onClick: () => toggleBulkSelectMode(itemKey),
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: "#8c8c8c",
              cursor: "pointer",
            },
          },
          "Cancel",
        ),
      );
    };

    const renderItem = (item, key, isChild = false) => {
      const { note, files } = item;
      const firstFile = files[0];
      const creatorName = note
        ? authorName(note)
        : firstFile?.createdBy
          ? userName(firstFile.createdBy) || firstFile.createdBy?.email
          : "System";
      const time = note?.createdAt || firstFile?.createdAt;
      const hasBody = !!note?.body;
      const hasFiles = files.length > 0;
      const isMyItem =
        (note && currentUser && note.createdById === currentUser.id) ||
        (!note &&
          firstFile &&
          currentUser &&
          firstFile.createdById === currentUser.id);
      const isEditing = note && editingNoteId === note.id;

      const replies = note && replyMap[note.id] ? replyMap[note.id] : [];
      const hasReplies = replies.length > 0;
      // Reply threads auto-expand by default — only collapsed once the user
      // explicitly toggles them closed (tracked as `false` in state).
      const isExpanded = expandedThreads[note?.id] !== false;

      const itemTargetId = note?.id || files[0]?.id;
      const replyingTargetId = replyingTo?.note?.id || replyingTo?.files?.[0]?.id;
      const isReplyingToThis = !!(
        replyingTo &&
        replyingTargetId &&
        itemTargetId === replyingTargetId
      );

      return React.createElement(
        "div",
        { key },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 10,
              padding: "14px 16px",
              borderBottom: isChild ? "none" : "1px solid #f0f0f0",
              borderLeft: isChild ? "2px solid #e6f4ff" : "none",
              marginLeft: 0,
              background: isChild ? "#fafafa" : "#fff",
              borderTop: isChild ? "1px dashed #f0f0f0" : "none",
            },
          },
          React.createElement(Av, {
            name: creatorName,
            color: "#1890ff",
            size: 30,
          }),
          React.createElement(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 6,
                  flexWrap: "wrap",
                },
              },
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 13,
                    fontFamily: FONT,
                    fontWeight: 700,
                    color: "#1a1a1a",
                  },
                },
                creatorName,
              ),
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 11,
                    fontFamily: FONT,
                    color: "#bfbfbf",
                    marginLeft: "auto",
                  },
                },
                timeAgo(time),
              ),
            ),
            isEditing
              ? React.createElement(
                  "div",
                  { style: { marginTop: 10 } },
                  React.createElement(CommentComposer, {
                    value: editBody,
                    onChange: setEditBody,
                    onAssignMultiple: setEditAssignedIds,
                    assignedIds: editAssignedIds,
                    lawyers,
                    onSubmit: () => handleSaveEdit(note.id),
                  }),
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 8,
                      },
                    },
                    React.createElement(
                      "span",
                      {
                        onClick: () => {
                          setEditingNoteId(null);
                          setEditBody("");
                          setEditAssignedIds([]);
                        },
                        style: {
                          fontSize: 12,
                          padding: "4px 12px",
                          cursor: "pointer",
                          color: "#595959",
                          border: "1px solid #d9d9d9",
                          borderRadius: 4,
                          fontFamily: FONT,
                        },
                      },
                      "Cancel",
                    ),
                    React.createElement(
                      "span",
                      {
                        onClick: () => handleSaveEdit(note.id),
                        style: {
                          fontSize: 12,
                          padding: "4px 16px",
                          cursor: "pointer",
                          color: "#fff",
                          background: "#1890ff",
                          borderRadius: 4,
                          fontWeight: 600,
                          fontFamily: FONT,
                        },
                      },
                      "Save changes",
                    ),
                  ),
                )
              : (hasBody || hasFiles) &&
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 13,
                          fontFamily: FONT,
                          color: "#262626",
                          lineHeight: 1.7,
                          background: hasFiles && !hasBody ? "transparent" : "#f8f9fa",
                          borderRadius: hasFiles && !hasBody ? 0 : 8,
                          padding: hasFiles && !hasBody ? 0 : "12px 14px",
                          borderLeft: hasFiles && !hasBody ? "none" : "3px solid #1890ff",
                        },
                      },
                      !isChild &&
                        note?.replyText &&
                        React.createElement(
                          "div",
                          {
                            style: {
                              fontSize: 12,
                              fontFamily: FONT,
                              color: "#595959",
                              background: "#fff",
                              border: "1px solid #e8e8e8",
                              borderLeft: "3px solid #bfbfbf",
                              borderRadius: "4px",
                              padding: "6px 10px",
                              marginBottom: 8,
                              whiteSpace: "pre-wrap",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            },
                          },
                          React.createElement(
                            "b",
                            { style: { color: "#8c8c8c", marginRight: 4 } },
                            "Quote:",
                          ),
                          " ",
                          note.replyText,
                        ),
                      hasBody &&
                        React.createElement(
                          "div",
                          {
                            style: {
                              marginBottom: hasFiles ? 8 : 0,
                            },
                          },
                          renderRichText(note.body, lawyers),
                        ),
                      note?.assignees &&
                        note.assignees.length > 0 &&
                        React.createElement(
                          "div",
                          {
                            style: {
                              marginTop: 8,
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              alignItems: "center",
                            },
                          },
                          React.createElement(
                            "span",
                            {
                              style: {
                                fontSize: 12,
                                color: "#8c8c8c",
                                fontFamily: FONT,
                              },
                            },
                            "Mentioned:",
                          ),
                          ...note.assignees.map((assigneeItem) => {
                            const assigneeId =
                              typeof assigneeItem === "object" &&
                              assigneeItem !== null
                                ? assigneeItem.id
                                : assigneeItem;
                            const l = lawyers?.find((lw) => lw.id === assigneeId);
                            if (!l) return null;
                            return React.createElement(
                              "span",
                              {
                                key: l.id,
                                style: {
                                  fontSize: 12,
                                  color: "#096dd9",
                                  background: "#e6f4ff",
                                  border: "1px solid #91caff",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  fontFamily: FONT,
                                  fontWeight: 500,
                                },
                              },
                              "@",
                              l.lawyerName,
                            );
                          }),
                        ),
                      ...files.map((f) => renderFileRow(f, itemTargetId)),
                      renderBulkSelectBar(itemTargetId, files),
                    ),
                    (note || files.length > 0) &&
                      (canEdit || isMyItem) &&
                      !isEditing &&
                      React.createElement(
                        "div",
                        {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            marginTop: 6,
                            paddingLeft: 4,
                          },
                        },
                        React.createElement(
                          "span",
                          {
                            onClick: () => setReplyingTo(item),
                            style: {
                              fontSize: 12,
                              fontFamily: FONT,
                              color: "#52c41a",
                              cursor: "pointer",
                              textDecoration: "underline",
                              textUnderlineOffset: "2px",
                            },
                            onMouseEnter: (e) =>
                              (e.currentTarget.style.color = "#389e0d"),
                            onMouseLeave: (e) =>
                              (e.currentTarget.style.color = "#52c41a"),
                          },
                          "Reply",
                        ),
                        isMyItem &&
                          note &&
                          React.createElement(
                            "span",
                            {
                              onClick: () => {
                                setEditingNoteId(note.id);
                                setEditBody(note.body || "");
                                setEditAssignedIds(
                                  (note.assignees || []).map((a) =>
                                    typeof a === "object" ? a.id : a,
                                  ),
                                );
                              },
                              style: {
                                fontSize: 12,
                                fontFamily: FONT,
                                color: "#595959",
                                cursor: "pointer",
                                textDecoration: "underline",
                                textUnderlineOffset: "2px",
                              },
                              onMouseEnter: (e) =>
                                (e.currentTarget.style.color = "#1890ff"),
                              onMouseLeave: (e) =>
                                (e.currentTarget.style.color = "#595959"),
                            },
                            "Edit",
                          ),
                        isMyItem &&
                          React.createElement(
                            "span",
                            {
                              onClick: () => handleDeleteNote(item),
                              style: {
                                fontSize: 12,
                                fontFamily: FONT,
                                color: "#ff4d4f",
                                cursor: "pointer",
                                textDecoration: "underline",
                                textUnderlineOffset: "2px",
                              },
                              onMouseEnter: (e) =>
                                (e.currentTarget.style.color = "#cf1322"),
                              onMouseLeave: (e) =>
                                (e.currentTarget.style.color = "#ff4d4f"),
                            },
                            "Delete",
                          ),
                      ),
                  ),
            isReplyingToThis ? renderComposerBlock(true) : null,
          ),
        ),
        hasReplies &&
          React.createElement(
            "div",
            {
              style: { marginLeft: 44, padding: "0 20px 16px 0", marginTop: -8 },
            },
            React.createElement(
              "div",
              {
                onClick: () =>
                  setExpandedThreads((p) => ({ ...p, [note.id]: !isExpanded })),
                style: {
                  fontSize: 12,
                  color: "#1890ff",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 12px",
                  background: "#f0f8ff",
                  borderRadius: 4,
                  border: "1px dashed #91caff",
                  userSelect: "none",
                },
              },
              isExpanded
                ? "▲ Collapse replies"
                : `▼ View ${replies.length} replies`,
              !isExpanded &&
                React.createElement(
                  Avatar.Group,
                  { size: "small", maxCount: 3 },
                  replies.map((r, i) =>
                    React.createElement(Av, {
                      key: i,
                      name: r.note ? authorName(r.note) : "Anonymous",
                      size: 16,
                    }),
                  ),
                ),
            ),
            isExpanded &&
              React.createElement(
                "div",
                { style: { marginTop: 8 } },
                ...replies.map((child, idx) =>
                  renderItem(child, `${key}-child-${idx}`, true),
                ),
              ),
          ),
      );
    };

    const triggerReplacePendingFile = (index) => {
      pendingReplaceTargetRef.current = index;
      pendingReplaceInputRef.current?.click();
    };

    const handlePendingReplaceFileChange = async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      const index = pendingReplaceTargetRef.current;
      pendingReplaceTargetRef.current = null;
      if (!file || index == null || !pendingDocs[index]) return;
      setReplacingPendingIndex(index);
      try {
        const attachment = await uploadTaskAttachment(file, file.name);
        setPendingDocs((prev) =>
          prev.map((doc, i) => {
            if (i !== index) return doc;
            const oldRelativePath = String(doc.relativePath || "");
            const pathParts = oldRelativePath.split("/").filter(Boolean);
            pathParts.pop();
            const newRelativePath = pathParts.length
              ? [...pathParts, file.name].join("/")
              : file.name;
            const hadAutoTitle = doc.docTitle === doc.fileName;
            return {
              ...doc,
              attIds: [{ id: attachment.id }],
              fileName: file.name,
              fileSize: file.size || 0,
              relativePath: oldRelativePath ? newRelativePath : doc.relativePath,
              docTitle: hadAutoTitle ? file.name : doc.docTitle,
            };
          }),
        );
        message.success("File replaced");
      } catch (e) {
        message.error("Failed to replace file: " + (e?.message || "Please try again"));
      } finally {
        setReplacingPendingIndex(null);
      }
    };

    const renderPendingChips = () => {
      if (pendingDocs.length === 0) return null;
      return React.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: 6,
            flexDirection: "column",
            marginTop: 12,
          },
        },
        ...pendingDocs.map((doc, i) => {
          const name = doc.metadata.title || doc.fileName || "Document";
          return React.createElement(
            "div",
            {
              key: i,
              style: {
                display: "flex",
                flexDirection: "column",
                background: "#f0f0f0",
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 12,
                fontFamily: FONT,
              },
            },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 6 } },
              React.createElement(
                "span",
                {
                  style: {
                    color: "#262626",
                    fontWeight: 600,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                },
                name,
              ),
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 11,
                    color: "#fa8c16",
                    background: "#fff7e6",
                    padding: "1px 6px",
                    borderRadius: 10,
                    border: "1px solid #ffd591",
                    fontWeight: 600,
                  },
                },
                "Pending",
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  title: "Replace file",
                  disabled: replacingPendingIndex === i,
                  onClick: () => triggerReplacePendingFile(i),
                  style: {
                    border: "none",
                    background: "transparent",
                    color: "#185FA5",
                    cursor: replacingPendingIndex === i ? "wait" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: 0,
                    flexShrink: 0,
                    opacity: replacingPendingIndex === i ? 0.5 : 1,
                  },
                },
                TASK_FILE_ACTION_ICONS.replace,
              ),
              React.createElement(
                "span",
                {
                  onClick: () =>
                    setPendingDocs((p) => p.filter((_, j) => j !== i)),
                  style: {
                    color: "#cf1322",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 16,
                    lineHeight: 1,
                    marginLeft: 4,
                  },
                },
                "×",
              ),
            ),
            doc.metadata.note &&
              React.createElement(
                "div",
                {
                  style: {
                    marginTop: 6,
                    color: "#262626",
                    padding: "6px 10px",
                    background: "rgba(255,255,255,0.7)",
                    borderRadius: 4,
                  },
                },
                React.createElement(
                  "span",
                  {
                    style: { fontWeight: 700, color: "#8c8c8c", marginRight: 6 },
                  },
                  "Note content:",
                ),
                doc.metadata.note,
              ),
          );
        }),
      );
    };

    const renderPendingUploadChips = () => {
      if (pendingDocs.length === 0) return null;
      const shouldRenderGrouped =
        pendingDocs.length > 1 ||
        pendingDocs.some((doc) => doc.uploadKind === "folder");
      if (!shouldRenderGrouped) return renderPendingChips();

      const groups = [];
      const groupMap = {};
      pendingDocs.forEach((doc, index) => {
        const key = doc.uploadGroupId || `single_${index}`;
        if (!groupMap[key]) {
          groupMap[key] = { key, items: [] };
          groups.push(groupMap[key]);
        }
        groupMap[key].items.push({ ...doc, _index: index });
      });

      return React.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: 8,
            flexDirection: "column",
            marginTop: 12,
          },
        },
        ...groups.map((group) => {
          const first = group.items[0] || {};
          const isFolder = first.uploadKind === "folder";
          const folderName =
            String(first.relativePath || "").split("/").filter(Boolean)[0] ||
            "Folder";
          const groupTitle = isFolder
            ? `Folder: ${folderName}`
            : `${group.items.length} attached files`;
          const totalSize = group.items.reduce(
            (sum, item) => sum + (Number(item.fileSize) || 0),
            0,
          );
          return React.createElement(
            "div",
            {
              key: group.key,
              style: {
                background: "#F8FAFC",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                fontFamily: FONT,
              },
            },
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", gap: 8 } },
              React.createElement(
                "span",
                {
                  style: {
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    color: isFolder ? "#185FA5" : "#4B5563",
                    background: isFolder ? "#EFF6FF" : "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  },
                },
                isFolder
                  ? TASK_FILE_ACTION_ICONS.folder
                  : TASK_FILE_ACTION_ICONS.files,
              ),
              React.createElement(
                "span",
                {
                  style: {
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "#111827",
                    fontWeight: 700,
                  },
                },
                groupTitle,
              ),
              totalSize
                ? React.createElement(
                    "span",
                    { style: { color: "#6B7280", fontSize: 11 } },
                    formatUploadSize(totalSize),
                  )
                : null,
              React.createElement(
                "span",
                {
                  style: {
                    color: "#D97706",
                    background: "#FFF7ED",
                    border: "1px solid #FDBA74",
                    borderRadius: 999,
                    padding: "1px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                  },
                },
                "Pending",
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () =>
                    setPendingDocs((prev) =>
                      prev.filter(
                        (_, index) =>
                          !group.items.some((item) => item._index === index),
                      ),
                    ),
                  style: {
                    border: "none",
                    background: "transparent",
                    color: "#DC2626",
                    cursor: "pointer",
                    fontSize: 16,
                    lineHeight: 1,
                    padding: 0,
                  },
                },
                "x",
              ),
            ),
            React.createElement(
              "div",
              {
                style: {
                  marginTop: 6,
                  color: "#4B5563",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                },
              },
              ...group.items.slice(0, 4).map((item) =>
                React.createElement(
                  "div",
                  {
                    key: `${group.key}_${item._index}`,
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    },
                  },
                  React.createElement(
                    "span",
                    {
                      style: {
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    },
                    item.docTitle || item.fileName || "Document",
                  ),
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      title: "Replace file",
                      disabled: replacingPendingIndex === item._index,
                      onClick: () => triggerReplacePendingFile(item._index),
                      style: {
                        border: "none",
                        background: "transparent",
                        color: "#185FA5",
                        cursor:
                          replacingPendingIndex === item._index
                            ? "wait"
                            : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        padding: 0,
                        flexShrink: 0,
                        opacity: replacingPendingIndex === item._index ? 0.5 : 1,
                      },
                    },
                    TASK_FILE_ACTION_ICONS.replace,
                  ),
                ),
              ),
              group.items.length > 4 &&
                React.createElement(
                  "div",
                  { style: { color: "#6B7280" } },
                  `+${group.items.length - 4} more files`,
                ),
            ),
          );
        }),
      );
    };

    const hasCommentText = getCommentText(body, true).length > 0;
    const isMentionOnly = assignedIds.length > 0 && !hasCommentText;
    const canSend =
      (hasCommentText || pendingDocs.length > 0) && !isMentionOnly && !sending;
    const visibleFeed = showAll ? feed : feed.slice(0, INITIAL_COUNT);
    const hasMore = feed.length > INITIAL_COUNT;

    const rootItems = [];
    const replyMap = {};
    visibleFeed.forEach((item) => {
      const pId = item.note?.parentId;
      if (pId && visibleFeed.some((p) => p.note?.id === pId)) {
        if (!replyMap[pId]) replyMap[pId] = [];
        replyMap[pId].push(item);
      } else {
        rootItems.push(item);
      }
    });

    Object.keys(replyMap).forEach((k) => {
      replyMap[k].sort((a, b) => a._time - b._time);
    });

    const renderComposerBlock = (isInline = false) => {
      return React.createElement(
        "div",
        {
          style: {
            padding: isInline ? "12px 0 0 0" : "16px 20px",
            borderBottom: isInline ? "none" : "4px solid #f0f0f0",
            background: "#fff",
            marginTop: isInline ? 8 : 0,
          },
        },
        replyingTo &&
          React.createElement(
            "div",
            {
              style: {
                padding: "8px 12px",
                background: "#f5f5f5",
                borderLeft: "3px solid #1890ff",
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderRadius: "0 4px 4px 0",
              },
            },
            React.createElement(
              "div",
              null,
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8c8c8c",
                    fontFamily: FONT,
                  },
                },
                "Replying to ",
                replyingTo.note ? authorName(replyingTo.note) : "Document",
              ),
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 12,
                    color: "#595959",
                    fontFamily: FONT,
                    marginTop: 4,
                    whiteSpace: "pre-wrap",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  },
                },
                replyingTo.note?.body
                  ? replyingTo.note.body.replace(/<[^>]*>?/gm, "").trim()
                  : "Attached document",
              ),
            ),
            React.createElement(
              "div",
              {
                onClick: () => setReplyingTo(null),
                style: {
                  cursor: "pointer",
                  color: "#bfbfbf",
                  fontSize: 16,
                  lineHeight: 1,
                  padding: "0 4px",
                },
              },
              "×",
            ),
          ),
        React.createElement(CommentComposer, {
          value: body,
          onChange: setBody,
          onAssignMultiple: (ids) => setAssignedIds(ids),
          assignedIds,
          lawyers,
          onSubmit: canSend
            ? handleSend
            : isMentionOnly
              ? warnMentionOnly
              : undefined,
          onUploadClick: () => setShowUploadModal(true),
        }),
        renderPendingUploadChips(),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap",
            },
          },
          React.createElement(
            "div",
            {
              onClick: canSend
                ? handleSend
                : isMentionOnly
                  ? warnMentionOnly
                  : undefined,
              style: {
                marginLeft: "auto",
                padding: "6px 18px",
                borderRadius: 6,
                fontSize: 13,
                fontFamily: FONT,
                fontWeight: 700,
                background: !canSend ? "#f0f0f0" : "#1890ff",
                color: !canSend ? "#bfbfbf" : "#fff",
                cursor: !canSend ? "not-allowed" : "pointer",
                border: "none",
              },
            },
            sending ? "Sending..." : "Comment",
          ),
        ),
      );
    };

    return React.createElement(
      "div",
      {
        style: {
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          background: "#fff",
        },
      },
      !replyingTo ? renderComposerBlock(false) : null,
      React.createElement(
        "div",
        { style: { paddingBottom: 24 } },
        loading
          ? React.createElement(
              "div",
              { style: { textAlign: "center", padding: "24px 0" } },
              React.createElement(Spin, { size: "small" }),
            )
          : feed.length === 0
            ? React.createElement(
                "div",
                {
                  style: {
                    textAlign: "center",
                    padding: "32px 0",
                    fontSize: 13,
                    fontFamily: FONT,
                    color: "#bfbfbf",
                  },
                },
                "No comments or documents yet",
              )
            : React.createElement(
                "div",
                null,
                ...rootItems.map((item, i) => renderItem(item, `item-${i}`)),
                hasMore &&
                  React.createElement(
                    "div",
                    {
                      onClick: () => setShowAll((v) => !v),
                      style: {
                        margin: "16px",
                        textAlign: "center",
                        fontSize: 12,
                        fontFamily: FONT,
                        color: "#1890ff",
                        cursor: "pointer",
                        padding: "7px 0",
                        border: "1px dashed #91caff",
                        borderRadius: 6,
                        background: "#f0f8ff",
                      },
                      onMouseEnter: (e) =>
                        (e.currentTarget.style.background = "#d6ecff"),
                      onMouseLeave: (e) =>
                        (e.currentTarget.style.background = "#f0f8ff"),
                    },
                    showAll
                      ? `▲ Collapse (showing ${INITIAL_COUNT} of ${feed.length})`
                      : `▼ View ${feed.length - INITIAL_COUNT} more comments (${feed.length} total)`,
                  ),
              ),
      ),
      React.createElement("input", {
        key: "pending-replace-input",
        ref: pendingReplaceInputRef,
        type: "file",
        style: { display: "none" },
        onChange: handlePendingReplaceFileChange,
      }),
      previewDoc &&
        React.createElement(PreviewModal, {
          doc: previewDoc,
          onClose: () => setPreviewDoc(null),
        }),
      React.createElement(FileUploadModal, {
        open: showUploadModal,
        onClose: () => setShowUploadModal(false),
        onAddPending: (newDocData) =>
          setPendingDocs((prev) => [
            ...prev,
            ...(Array.isArray(newDocData) ? newDocData : [newDocData]),
          ]),
        collectionName,
        recordId,
        currentUser,
        currentLawyerId,
        lawyers,
        projectFolderId,
        caseId: getDeepLinkCaseId(caseId || taskContext.caseId),
      }),
      replacingFileDoc &&
        React.createElement(FileUploadModal, {
          open: !!replacingFileDoc,
          editDoc: replacingFileDoc,
          onClose: () => setReplacingFileDoc(null),
          onSuccess: () => {
            setReplacingFileDoc(null);
            reload();
          },
          collectionName,
          recordId,
          currentUser,
          currentLawyerId,
          lawyers,
          projectFolderId,
          caseId: getDeepLinkCaseId(caseId || taskContext.caseId),
        }),
      libraryMoveTarget &&
        React.createElement(LibraryMoveModal, {
          open: !!libraryMoveTarget,
          record: libraryMoveTarget.record,
          destinationType: libraryMoveTarget.destinationType,
          sourceContext: {
            collectionName,
            recordId,
            caseId,
            ...taskContext,
          },
          currentUser,
          onClose: () => setLibraryMoveTarget(null),
          onSuccess: () => {
            setLibraryMoveTarget(null);
            reload();
          },
        }),
      bulkMoveTarget &&
        React.createElement(LibraryMoveModal, {
          open: !!bulkMoveTarget,
          records: bulkMoveTarget.records,
          destinationType: bulkMoveTarget.destinationType,
          sourceContext: {
            collectionName,
            recordId,
            caseId,
            ...taskContext,
          },
          currentUser,
          onClose: () => setBulkMoveTarget(null),
          onSuccess: () => {
            setBulkSelectState((prev) => {
              const next = { ...prev };
              delete next[bulkMoveTarget.itemKey];
              return next;
            });
            setBulkMoveTarget(null);
            reload();
          },
        }),
    );
  };

  const PreviewModal = ({ doc, onClose }) => {
    if (!doc) return null;
    const attachment = Array.isArray(doc.fileAttachment)
      ? doc.fileAttachment[0]
      : doc.fileAttachment;
    const fileUrl = attachment?.url || attachment?.preview;
    const fullUrl = getFullUrl(fileUrl);
    const rawName =
      doc.title || attachment?.title || attachment?.filename || "File";
    const extFromAtt = attachment?.extname
      ? attachment.extname.startsWith(".")
        ? attachment.extname.toLowerCase()
        : "." + attachment.extname.toLowerCase()
      : "";
    const extFromName = rawName.includes(".")
      ? "." + rawName.split(".").pop().toLowerCase()
      : "";
    const fileExt = extFromAtt || extFromName || "";
    const baseName = rawName.toLowerCase().endsWith(fileExt)
      ? rawName.slice(0, rawName.length - fileExt.length)
      : rawName;
    const displayName = (baseName || "File") + fileExt;
    const isPdf = fileExt === ".pdf";
    const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(fileExt);
    const isOffice = [
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".odt",
    ].includes(fileExt);

    // Office Viewer URL — file phải có public URL
    const officeViewerUrl =
      isOffice && fullUrl
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
        : null;
    return React.createElement(
      Modal,
      {
        open: !!doc,
        onCancel: onClose,
        centered: true,
        width: isPdf || isOffice ? "96vw" : "auto",
        title: React.createElement(
          "span",
          { style: { fontFamily: FONT } },
          displayName,
        ),
        bodyStyle: {
          padding: 0,
          maxWidth: "100%",
          overflowX: "hidden",
          overflowY: "hidden",
        },
        footer: [
          fullUrl &&
            React.createElement(
              Button,
              {
                key: "dl",
                onClick: () => window.open(fullUrl, "_blank"),
              },
              "⬇️ Download",
            ),
          React.createElement(Button, { key: "cl", onClick: onClose }, "Close"),
        ].filter(Boolean),
      },
      renderTaskFilePreviewFrame({
        fullUrl,
        title: displayName,
        isPdf,
        isImage,
        isOffice,
        officeViewerUrl,
        height: "82vh",
        modal: true,
      }),
      // Fallback
      !isPdf &&
        !isImage &&
        !isOffice &&
        React.createElement(
          "div",
          {
            style: { padding: 32, textAlign: "center" },
          },
          React.createElement(Empty, {
            description:
              "Cannot preview this file format — please download to open",
          }),
        ),
    );
  };

  const LibraryMoveModal = ({
    open,
    record,
    records,
    destinationType,
    sourceContext,
    currentUser,
    onClose,
    onSuccess,
  }) => {
    const config = getLibraryDestinationConfig(destinationType);
    const isCaseDocument = destinationType === LIBRARY_DESTINATION.CASE_DOCUMENT;
    const isKnowledge = destinationType === LIBRARY_DESTINATION.KNOWLEDGE;
    // Accepts either a single `record` (legacy single-file/folder move) or a
    // `records` array (bulk move) — everything below operates on the array.
    const targetRecords = useMemo(
      () => (records && records.length ? records : record ? [record] : []),
      [records, record],
    );
    const isBulk = targetRecords.length > 1;
    const primaryRecord = targetRecords[0] || null;

    const [parentRecords, setParentRecords] = useState([]);
    const [selectedRecordId, setSelectedRecordId] = useState(null);
    const [folderTree, setFolderTree] = useState([]);
    const [folders, setFolders] = useState([]);
    const [targetFolderId, setTargetFolderId] = useState("root");
    const [loading, setLoading] = useState(false);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [saving, setSaving] = useState(false);

    const primaryIsFolder = primaryRecord?._type === "folder";
    const sourceLabel =
      getLegalStudySourceLabel(primaryRecord) ||
      sourceContext?.subTaskTitle ||
      sourceContext?.taskTitle ||
      "";
    const primaryAtt = getPrimaryAttachment(primaryRecord);
    const primaryRecordName =
      primaryRecord?.title ||
      primaryRecord?.name ||
      primaryAtt?.title ||
      primaryAtt?.filename ||
      (primaryIsFolder ? "Folder" : "Document");
    const selectedParentRecord = isCaseDocument || isKnowledge
      ? null
      : parentRecords.find(
          (item) =>
            String(getLibraryRecordId(item, destinationType) || "") ===
            String(selectedRecordId || ""),
        );

    useEffect(() => {
      if (!open) return;
      if (isCaseDocument) {
        // No parent-record picker — the parent is always the current case.
        setParentRecords([]);
        setSelectedRecordId(
          sourceContext?.caseId ? String(extractId(sourceContext.caseId)) : null,
        );
        setTargetFolderId("root");
        setFolders([]);
        setFolderTree([]);
        return;
      }
      if (isKnowledge) {
        // No parent-record picker here either — Knowledge folders aren't
        // scoped to a single record, so there's nothing to pick a parent
        // for. Use a constant sentinel (always truthy) purely to trigger
        // the folder-loading effect below and keep the submit button enabled.
        setParentRecords([]);
        setSelectedRecordId("__knowledge__");
        setTargetFolderId("root");
        setFolders([]);
        setFolderTree([]);
        return;
      }
      let cancelled = false;
      const loadRecords = async () => {
        setLoading(true);
        const rows = await fetchLibraryDestinationRecords(destinationType);
        if (cancelled) return;
        setParentRecords(rows);
        const currentParentId = getRecordDestinationId(primaryRecord, destinationType);
        const hasCurrentParent = rows.some(
          (item) =>
            String(getLibraryRecordId(item, destinationType) || "") ===
            String(currentParentId || ""),
        );
        setSelectedRecordId(
          !isBulk && hasCurrentParent ? String(currentParentId) : null,
        );
        setTargetFolderId("root");
        setFolders([]);
        setFolderTree([]);
        setLoading(false);
      };
      loadRecords();
      return () => {
        cancelled = true;
      };
    }, [
      open,
      primaryRecord?.id,
      destinationType,
      isCaseDocument,
      isKnowledge,
      isBulk,
      sourceContext?.caseId,
    ]);

    useEffect(() => {
      if (!open || !selectedRecordId) {
        setFolders([]);
        setFolderTree([]);
        setTargetFolderId("root");
        return;
      }
      let cancelled = false;
      const loadFolders = async () => {
        setLoadingFolders(true);
        const rows = isCaseDocument
          ? await fetchCaseDocumentFolders(selectedRecordId)
          : isKnowledge
            ? await fetchKnowledgeFolders()
            : await fetchLibraryDestinationFolders(destinationType, selectedRecordId);
        if (cancelled) return;
        setFolders(rows);
        const rawTree = buildLibraryFolderTree(rows);
        // Knowledge has no parent-record picker (see the isKnowledge branch
        // above) offering the usual "you're browsing under X" context, so
        // wrap the real folder tree in a non-selectable "Knowledge" root
        // node — otherwise the destination picker was just a flat-looking
        // folder list with no indication of which space it belongs to.
        setFolderTree(
          isKnowledge
            ? [
                {
                  // Plain category label, not a folder icon — "Knowledge" is
                  // the space/category these folders live under, not a
                  // folder itself. The real folders are rawTree's children.
                  title: renderLibraryCategoryTitle("Knowledge"),
                  searchText: "Knowledge",
                  value: "__knowledge_root__",
                  key: "__knowledge_root__",
                  selectable: false,
                  children: rawTree,
                },
              ]
            : rawTree,
        );
        if (!isBulk) {
          const currentFolderId = extractId(primaryRecord?.folderId);
          const folderBelongsToSelectedRecord = rows.some(
            (folder) => extractId(folder?.id) === currentFolderId,
          );
          setTargetFolderId(folderBelongsToSelectedRecord ? String(currentFolderId) : "root");
        } else {
          setTargetFolderId("root");
        }
        setLoadingFolders(false);
      };
      loadFolders();
      return () => {
        cancelled = true;
      };
    }, [
      open,
      selectedRecordId,
      destinationType,
      isCaseDocument,
      isKnowledge,
      isBulk,
      primaryRecord?.folderId,
    ]);

    const getFolderName = (folderId) => {
      const id = String(extractId(folderId) || "");
      if (!id) {
        return isCaseDocument || isKnowledge
          ? config.label
          : getLibraryRecordDisplayName(selectedParentRecord, destinationType) ||
              config.label;
      }
      const folder = folders.find((item) => String(extractId(item.id)) === id);
      return folder?.name || folder?.title || `${config.label} / Folder #${id}`;
    };

    const handleSubmit = async () => {
      if (targetRecords.length === 0) {
        message.warning("No file selected");
        return;
      }
      const parentRecordId = extractId(selectedRecordId);
      if (isCaseDocument) {
        if (!parentRecordId) {
          message.warning("Cannot determine the current case");
          return;
        }
      } else if (isKnowledge) {
        // No parent record to validate — any Knowledge folder (or its root)
        // is a valid target.
      } else if (!parentRecordId || !selectedParentRecord) {
        message.warning(`Please select a ${config.label} record`);
        return;
      }
      setSaving(true);
      try {
        const now = new Date().toISOString();
        const userId = extractId(currentUser?.id);
        const safeTargetFolderId =
          targetFolderId === "root" ? null : extractId(targetFolderId);
        const batchId = `lib_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .slice(2, 5)}`;
        const changedBy = userName(currentUser) || currentUser?.username || "System";
        const targetLabel = getFolderName(safeTargetFolderId);
        // Knowledge has no single parent record to read a company from —
        // inherit it from whichever destination folder was picked (every
        // existing Knowledge folder already carries its own
        // internalCompanyId). Root-level (no folder picked) stays uncategorized.
        const targetKnowledgeFolder = isKnowledge
          ? folders.find(
              (item) => String(extractId(item.id)) === String(safeTargetFolderId || ""),
            )
          : null;
        const internalCompanyId = isCaseDocument
          ? null
          : isKnowledge
            ? getLibraryRecordInternalCompanyId(targetKnowledgeFolder)
            : getLibraryRecordInternalCompanyId(selectedParentRecord);
        const activityAction = isCaseDocument
          ? ACTIVITY_ACTION.MOVE_TO_CASE_DOCUMENT
          : isKnowledge
            ? ACTIVITY_ACTION.MOVE_TO_KNOWLEDGE
            : destinationType === LIBRARY_DESTINATION.LEGAL_STUDY
              ? ACTIVITY_ACTION.LINK_LEGAL_STUDY
              : ACTIVITY_ACTION.LINK_LEGAL_REFERENCE;

        const updatedRecords = [];
        for (const rec of targetRecords) {
          const recIsFolder = rec?._type === "folder";
          const recId = extractId(rec?.id || rec);
          if (!recId) continue;

          const hasOriginFolder =
            rec?.originFolderId !== undefined &&
            rec?.originFolderId !== null &&
            rec?.originFolderId !== "";
          const oldFolderId = hasOriginFolder
            ? extractId(rec.originFolderId)
            : extractId(rec?.folderId || rec?.parentId);
          const oldScope =
            rec?.originScope ||
            (rec?.moduleScope &&
            ![LEGAL_STUDY_MODULE_SCOPE, LEGAL_REFERENCE_MODULE_SCOPE].includes(rec.moduleScope)
              ? rec.moduleScope
              : CASE_DOCUMENT_SCOPE);
          const sourceSnapshot = isCaseDocument || isKnowledge
            ? null
            : {
                ...(parseLegalStudySource(rec?.legalStudySource) || {}),
                ...buildLegalStudySource(sourceContext),
              };
          const relationPayload = isCaseDocument || isKnowledge
            ? { legalStudyId: null, legalReferenceId: null }
            : {
                legalStudyId:
                  destinationType === LIBRARY_DESTINATION.LEGAL_STUDY ? parentRecordId : null,
                legalReferenceId:
                  destinationType === LIBRARY_DESTINATION.LEGAL_REFERENCE ? parentRecordId : null,
              };
          const commonPayload = {
            moduleScope: config.moduleScope,
            storageType: config.storageType,
            ...relationPayload,
            internalCompanyId: internalCompanyId || null,
            originScope: oldScope,
            originFolderId: oldFolderId || null,
            legalStudyLinkedAt:
              destinationType === LIBRARY_DESTINATION.LEGAL_STUDY
                ? rec?.legalStudyLinkedAt || now
                : null,
            legalStudySource: sourceSnapshot,
            movedToLegalReferenceAt:
              destinationType === LIBRARY_DESTINATION.LEGAL_REFERENCE ? now : null,
            movedToLegalReferenceById:
              destinationType === LIBRARY_DESTINATION.LEGAL_REFERENCE ? userId || null : null,
            updatedAt: now,
            ...(userId ? { updatedById: userId } : {}),
            ...(isCaseDocument ? { caseId: parentRecordId } : {}),
            // Knowledge is company-scoped, not case-scoped — clear any
            // stale caseId a task-attachment file may have carried in.
            ...(isKnowledge ? { caseId: null } : {}),
          };

          let updatedRecord = null;
          if (recIsFolder) {
            const folderCommonPayload = { ...commonPayload };
            delete folderCommonPayload.movedToLegalReferenceAt;
            delete folderCommonPayload.movedToLegalReferenceById;
            const foldersToMove =
              Array.isArray(rec?._foldersToMove) && rec._foldersToMove.length > 0
                ? rec._foldersToMove
                : [rec];
            const filesToMove = Array.isArray(rec?._filesToMove) ? rec._filesToMove : [];
            for (const folder of foldersToMove) {
              const folderId = extractId(folder?.id || folder);
              if (!folderId) continue;
              await apiReq(`folders:update?filterByTk=${folderId}`, "POST", {
                ...folderCommonPayload,
                ...(folderId === recId ? { parentId: safeTargetFolderId } : {}),
              });
            }
            for (const childFile of filesToMove) {
              const childFileId = extractId(childFile?.id || childFile);
              if (!childFileId) continue;
              await apiReq(`documents:update?filterByTk=${childFileId}`, "POST", {
                ...commonPayload,
              });
            }
            updatedRecord = {
              ...rec,
              ...folderCommonPayload,
              parentId: safeTargetFolderId,
            };
          } else {
            const payload = {
              ...commonPayload,
              folderId: safeTargetFolderId,
            };
            await apiReq(`documents:update?filterByTk=${recId}`, "POST", payload);
            updatedRecord = { ...rec, ...payload };
          }
          updatedRecords.push(updatedRecord);

          const recAtt = getPrimaryAttachment(rec);
          const recName =
            rec?.title || rec?.name || recAtt?.title || recAtt?.filename ||
            (recIsFolder ? "Folder" : "Document");
          const recSourceLabel =
            getLegalStudySourceLabel(rec) ||
            sourceContext?.subTaskTitle ||
            sourceContext?.taskTitle ||
            "";
          await logActivity(
            recIsFolder ? "Folder" : "Document",
            recId,
            activityAction,
            config.relationField,
            recSourceLabel || null,
            `${targetLabel} - ${recName}`,
            changedBy,
            batchId,
            null,
            now,
          );
          if (sourceContext?.collectionName && sourceContext?.recordId) {
            await logActivity(
              initcap(sourceContext.collectionName),
              extractId(sourceContext.recordId),
              activityAction,
              recIsFolder ? "folders" : "documents",
              null,
              `${recName} -> ${targetLabel}`,
              changedBy,
              batchId,
              recId,
              now,
            );
          }
        }

        message.success(
          targetRecords.length > 1
            ? `Moved ${targetRecords.length} files to ${config.label}`
            : `Moved to ${config.label}`,
        );
        onSuccess?.(isBulk ? updatedRecords : updatedRecords[0]);
        onClose?.();
      } catch (e) {
        console.error(`Cannot move record(s) to ${config.label}`, e);
        message.error(`Cannot move to ${config.label}`);
      } finally {
        setSaving(false);
      }
    };

    return React.createElement(
      Modal,
      {
        open,
        title: isBulk
          ? `Move ${targetRecords.length} files to ${config.label}`
          : `Move to ${config.label}`,
        onCancel: saving ? undefined : onClose,
        width: 520,
        destroyOnClose: true,
        footer: [
          React.createElement(
            Button,
            { key: "cancel", onClick: onClose, disabled: saving },
            "Cancel",
          ),
          React.createElement(
            Button,
            {
              key: "submit",
              type: "primary",
              loading: saving,
              onClick: handleSubmit,
              disabled: !selectedRecordId || targetRecords.length === 0,
            },
            `Move to ${config.label}`,
          ),
        ],
      },
      React.createElement(
        "div",
        { style: { fontFamily: FONT, display: "flex", flexDirection: "column", gap: 14 } },
        isBulk
          ? React.createElement(
              "div",
              { style: { fontSize: 13, color: "#374151" } },
              React.createElement(
                "div",
                { style: { fontWeight: 700, marginBottom: 4 } },
                `${targetRecords.length} files selected`,
              ),
              React.createElement(
                "div",
                {
                  style: {
                    color: "#6B7280",
                    maxHeight: 90,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  },
                },
                ...targetRecords.map((rec, idx) => {
                  const recAtt = getPrimaryAttachment(rec);
                  const recName =
                    rec?.title || rec?.name || recAtt?.title || recAtt?.filename || "Document";
                  return React.createElement("div", { key: idx }, `• ${recName}`);
                }),
              ),
            )
          : React.createElement(
              "div",
              { style: { fontSize: 13, color: "#374151" } },
              React.createElement(
                "div",
                { style: { fontWeight: 700, marginBottom: 4 } },
                primaryRecordName,
              ),
              sourceLabel &&
                React.createElement("div", { style: { color: "#6B7280" } }, "Source: ", sourceLabel),
            ),
        !isCaseDocument &&
          !isKnowledge &&
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { style: { fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" } },
              `Select ${config.label}`,
            ),
            React.createElement(Select, {
              value: selectedRecordId,
              loading,
              showSearch: true,
              optionFilterProp: "label",
              style: { width: "100%" },
              placeholder: `Select ${config.label} record...`,
              options: parentRecords.map((item) => ({
                value: String(getLibraryRecordId(item, destinationType)),
                label: getLibraryRecordDisplayName(item, destinationType),
              })),
              onChange: (value) => {
                setSelectedRecordId(value || null);
                setTargetFolderId("root");
              },
            }),
          ),
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { style: { fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" } },
            `Destination folder`,
          ),
          React.createElement(TreeSelect, {
            value: targetFolderId === "root" ? undefined : targetFolderId,
            treeData: folderTree,
            loading: loadingFolders,
            disabled: !selectedRecordId,
            allowClear: true,
            treeDefaultExpandAll: true,
            showSearch: true,
            // title is now a rendered icon+label element (folder icon), not
            // a plain string, so the default treeNodeFilterProp: "title"
            // string match no longer works — filter against searchText.
            filterTreeNode: (input, node) => {
              const searchText = node?.searchText || node?.props?.searchText || "";
              return normalizeLookupText(searchText).includes(normalizeLookupText(input));
            },
            style: { width: "100%" },
            dropdownStyle: { maxHeight: 360, overflow: "auto" },
            placeholder: `Root level (no subfolder)`,
            onChange: (value) => setTargetFolderId(value || "root"),
          }),
        ),
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              color: "#6B7280",
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: 6,
              padding: "8px 10px",
            },
          },
          isBulk
            ? "Files remain traceable from Task Notes after this move."
            : `${primaryIsFolder ? "Folder and child documents" : "File"} remains traceable from Task Notes after this move.`,
        ),
      ),
    );
  };

  // The tree titles render an icon + label row (~22px tall); antd's default
  // fixed-height selection tag clips that row in half. Let the tag grow to
  // fit its content instead of a fixed line-height.
  const LIBRARY_TREESELECT_CSS = `
    .task-library-treeselect .ant-select-selector {
      height: auto !important;
      min-height: 40px;
      padding-top: 4px !important;
      padding-bottom: 4px !important;
    }
    .task-library-treeselect .ant-select-selection-overflow {
      align-items: center;
    }
    .task-library-treeselect .ant-select-selection-overflow-item {
      align-self: center;
    }
    .task-library-treeselect .ant-select-selection-item {
      height: auto;
      line-height: 1.5;
      align-items: center;
      padding-top: 2px;
      padding-bottom: 2px;
      margin-top: 2px;
      margin-bottom: 2px;
    }
    .task-library-treeselect .ant-select-selection-item-content {
      display: inline-flex;
      align-items: center;
    }
  `;

  const FileUploadModal = ({
    open,
    onClose,
    onSuccess,
    onAddPending,
    collectionName,
    recordId,
    currentUser,
    currentLawyerId,
    lawyers = [],
    editDoc = null,
    projectFolderId,
    caseId = null,
  }) => {
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);
    const [uploading, setUploading] = useState(false);
    const isEdit = !!editDoc;
    // The comment-attachment flow (onAddPending) doesn't need the full
    // document metadata form — only the file itself and an optional type,
    // since the record's other fields can always be filled in later from the
    // Documents list.
    const isCompact = !!onAddPending;
    // Lưu lại title được auto-fill từ editDoc, để biết người dùng đã tự sửa
    // hay vẫn đang là tên file cũ.
    const initialEditTitleRef = useRef("");

    const [activeTab, setActiveTab] = useState("local");
    const [treeData, setTreeData] = useState([]);
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [libraryExpandedKeys, setLibraryExpandedKeys] = useState([]);
    const [libraryLoaded, setLibraryLoaded] = useState(false);
    const [selectedLibDocs, setSelectedLibDocs] = useState([]);
    const { TreeSelect } = ctx.antd;
    const currentUserId = extractId(currentUser?.id);
    const safeCurrentLawyerId = extractId(currentLawyerId);
    const currentRoleSignature = [
      ...Array.from(getUserRoleNames(currentUser)).sort(),
      currentUser?.isAdmin === true ? "isAdmin" : "",
      currentUser?.isSuperAdmin === true ? "isSuperAdmin" : "",
    ]
      .filter(Boolean)
      .join("|");
    const resolvedLibraryCaseId =
      extractId(caseId) ||
      extractId(PROJECT_ID) ||
      extractId(ctx.record?.projectId) ||
      extractId(ctx.record?.caseId);

    useEffect(() => {
      if (!open) return;
      setTreeData([]);
      setLibraryExpandedKeys([]);
      setLibraryLoaded(false);
      setSelectedLibDocs([]);
      if (isEdit && editDoc) {
        const initialTitle = editDoc.title || editDoc.name || "";
        initialEditTitleRef.current = initialTitle;
        form.setFieldsValue({
          documentType: editDoc.documentType || "",
          documentCode: editDoc.documentCode || "",
          title: initialTitle,
          openingDate: editDoc.openingDate
            ? editDoc.openingDate.slice(0, 10)
            : "",
          signedAt: editDoc.signedAt ? editDoc.signedAt.slice(0, 10) : "",
          effectiveAt: editDoc.effectiveAt
            ? editDoc.effectiveAt.slice(0, 10)
            : "",
          senderName: editDoc.senderName || "",
          recipientName: editDoc.recipientName || "",
          language: editDoc.language || "",
          docFormat: editDoc.docFormat || "",
          description: editDoc.description || "",
          googleDriveUrl: editDoc.googleDriveUrl || "",
          note: editDoc.note || "",
        });
        setFileList([]);
      } else {
        form.resetFields();
        setFileList([]);
        setActiveTab("local");
      }
    }, [open, editDoc]);

    useEffect(() => {
      if (!open) return;
      setTreeData([]);
      setLibraryExpandedKeys([]);
      setSelectedLibDocs([]);
      setLibraryLoaded(false);
    }, [
      open,
      currentUserId,
      safeCurrentLawyerId,
      currentRoleSignature,
      resolvedLibraryCaseId,
    ]);

    useEffect(() => {
      if (open && activeTab === "library" && !libraryLoaded) {
        let cancelled = false;
        const fetchLibraryData = async () => {
          setLibraryLoading(true);
          try {
            const [libraryData, caseReferences, legalReferences, legalStudies] =
              await Promise.all([
                fetchTaskLibraryData(currentUserId),
                fetchLibraryRelationRows(resolvedLibraryCaseId, "caseReferences"),
                fetchLibraryRelationRows(resolvedLibraryCaseId, "legalReference"),
                fetchLibraryRelationRows(resolvedLibraryCaseId, "legalStudy"),
              ]);
            if (cancelled) return;
            setTreeData(
              buildTaskLibraryTree({
                ...libraryData,
                currentUser,
                currentLawyerId: safeCurrentLawyerId,
                currentCaseId: resolvedLibraryCaseId,
                caseReferences,
                legalReferences,
                legalStudies,
              }),
            );
          } catch (e) {
            console.error("Cannot load document library", e);
            if (!cancelled) setTreeData([]);
          } finally {
            if (!cancelled) {
              setLibraryLoaded(true);
              setLibraryLoading(false);
            }
          }
        };
        fetchLibraryData();
        return () => {
          cancelled = true;
        };
      }
    }, [
      activeTab,
      open,
      libraryLoaded,
      currentUserId,
      safeCurrentLawyerId,
      currentRoleSignature,
      resolvedLibraryCaseId,
    ]);

    useEffect(() => {
      return;
      if (
        open &&
        activeTab === "library" &&
        treeData.length === 0 &&
        !libraryLoading
      ) {
        const fetchLibraryData = async () => {
          setLibraryLoading(true);
          try {
            const [fRes, allD] = await Promise.all([
              ctx.api.request({
                url: "folders:list",
                params: {
                  pageSize: 1000,
                  page: 1,
                  appends: ["folderMember", "folderManager"],
                },
              }),
              listDocumentsWithFieldFallback({
                pageSize: 1000,
                page: 1,
                filter: JSON.stringify({ isDeleted: { $ne: true } }),
                fields: "id,title,documentCode,folderId,createdById,isDeleted",
                appends: ["fileAttachment", "createdBy"],
              }),
            ]);
            const allF = fRes?.data?.data || [];

            const { accessible } = getVisibleFolderIds(
              allF,
              currentUser,
              currentLawyerId,
            );

            const allowedF = allF.filter((f) => accessible.has(extractId(f.id)));

            const generateTree = () => {
              const currentUid = extractId(currentUser?.id);
              const nodeMap = {};
              allowedF.forEach((f) => {
                nodeMap[extractId(f.id)] = {
                  title: `📁 ${f.name}`,
                  value: `folder_${f.id}`,
                  key: `folder_${f.id}`,
                  selectable: false,
                  children: [],
                };
              });

              allD.forEach((d) => {
                if (
                  !d.fileAttachment ||
                  (Array.isArray(d.fileAttachment) &&
                    d.fileAttachment.length === 0)
                )
                  return;
                const fId = extractId(d.folderId);
                if (!fId || !nodeMap[fId]) return;

                // 🌟 LOGIC: Chỉ hiện file do chính currentUser upload
                if (extractId(d.createdById) !== currentUid) return;

                const fileId = extractId(d.id);
                const att = Array.isArray(d.fileAttachment)
                  ? d.fileAttachment[0]
                  : d.fileAttachment;
                nodeMap[fId].children.push({
                  title: `📄 ${d.title || d.documentCode || "Untitled"} (${att.title || att.filename})`,
                  value: `doc_${fileId}`,
                  key: `doc_${fileId}`,
                  isLeaf: true,
                  docData: d,
                  attData: att,
                });
              });

              const rootNodes = [];
              allowedF.forEach((f) => {
                const pId = extractId(f.parentId);
                if (pId && nodeMap[pId]) {
                  nodeMap[pId].children.push(nodeMap[extractId(f.id)]);
                } else {
                  rootNodes.push(nodeMap[extractId(f.id)]);
                }
              });

              // Clean up empty folders (optional, but better UX)
              const pruneEmpty = (nodes) => {
                return nodes.filter((n) => {
                  if (n.isLeaf) return true;
                  n.children = pruneEmpty(n.children || []);
                  return n.children.length > 0;
                });
              };

              return pruneEmpty(rootNodes);
            };

            setTreeData(generateTree());
          } catch (e) {
            console.error(e);
          }
          setLibraryLoading(false);
        };
        fetchLibraryData();
      }
    }, [
      activeTab,
      open,
      treeData.length,
      libraryLoading,
      currentUser,
      currentLawyerId,
    ]);

    // 🌟 Effect để re-filter tree khi filter thay đổi mà không cần fetch lại API (nếu đã có data)
    // Tuy nhiên ở đây fetchLibraryData đang nằm trong useEffect và setTreeData trực tiếp.
    // Để tối ưu, ta có thể tách allF/allD ra state riêng. Nhưng hiện tại làm đơn giản trước.

    const findTreeDoc = (nodes, val) => {
      for (const node of nodes || []) {
        if (node.value === val && node.docData) return node;
        const found = findTreeDoc(node.children, val);
        if (found) return found;
      }
      return null;
    };

    const toggleLibraryTreeNode = useCallback((nodeKey) => {
      const key = String(nodeKey || "");
      if (!key) return;
      setLibraryExpandedKeys((currentKeys) =>
        currentKeys.includes(key)
          ? currentKeys.filter((currentKey) => currentKey !== key)
          : [...currentKeys, key],
      );
    }, []);

    const interactiveLibraryTreeData = useMemo(() => {
      const decorateNodes = (nodes = []) =>
        nodes.map((node) => {
          const children = decorateNodes(node.children || []);
          const expandable = !node.isLeaf && children.length > 0;
          if (!expandable) return { ...node, children };

          const toggleNode = (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleLibraryTreeNode(node.key || node.value);
          };

          return {
            ...node,
            children,
            title: React.createElement(
              "span",
              {
                role: "button",
                tabIndex: 0,
                onMouseDown: (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                },
                onClick: toggleNode,
                onKeyDown: (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    toggleNode(event);
                  }
                },
                title: "Click to expand or collapse",
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  width: "100%",
                  cursor: "pointer",
                },
              },
              node.title,
            ),
          };
        });

      return decorateNodes(treeData);
    }, [treeData, toggleLibraryTreeNode]);

    const handleTreeSelect = (vals) => {
      const values = Array.isArray(vals) ? vals : vals ? [vals] : [];
      const found = values
        .map((val) => findTreeDoc(treeData, val))
        .filter((node) => node && node.docData);
      setSelectedLibDocs(found);
      // Auto-fill title only when a single file is selected — with multiple
      // files there's no single title that could apply to all of them.
      if (found.length === 1) {
        const currentTitle = form.getFieldValue("title");
        if (!currentTitle) {
          form.setFieldsValue({
            title:
              found[0].docData.title ||
              found[0].docData.name ||
              found[0].attData.filename,
          });
        }
      }
    };

    const handleClose = () => {
      form.resetFields();
      setFileList([]);
      setSelectedLibDocs([]);
      setTreeData([]);
      setLibraryExpandedKeys([]);
      setLibraryLoaded(false);
      onClose();
    };

    const getSelectedUploadItems = () =>
      (fileList || [])
        .map((item) => ({ item, file: getUploadItemFile(item) }))
        .filter(({ file }) => !!file);

    const uploadSingleFile = async (item) => {
      const file = getUploadItemFile(item);
      const relativePath = activeTab === "folder" ? getUploadRelativePath(item) : "";
      const pathParts = String(relativePath || file?.name || "")
        .split("/")
        .filter(Boolean);
      const fileName = pathParts[pathParts.length - 1] || file?.name || "File";
      const attachment = await uploadTaskAttachment(file, fileName);
      return {
        attIds: [{ id: attachment.id }],
        fileName,
        relativePath,
        fileSize: file?.size || 0,
      };
    };

    const buildUploadEntries = async (values) => {
      const selectedItems = getSelectedUploadItems();
      const uploadGroupId = createTaskUploadBatchId(
        activeTab === "folder" ? "fld" : "mul",
      );
      const isSingle = selectedItems.length === 1;
      const entries = [];
      for (const { item } of selectedItems) {
        const uploaded = await uploadSingleFile(item);
        entries.push({
          ...uploaded,
          uploadKind: activeTab === "folder" ? "folder" : "files",
          uploadGroupId,
          docTitle:
            isSingle && values.title?.trim()
              ? values.title.trim()
              : uploaded.fileName,
          metadata: values,
        });
      }
      return entries;
    };

    const uploadFile = async () => {
      const file = fileList[0].originFileObj;
      const formData = new window.FormData();
      formData.append("file", file, file.name);
      const uploadRes = await ctx.api.request({
        url: "attachments:create",
        method: "POST",
        params: { attachmentField: "documents.fileAttachment" },
        data: formData,
        // headers: { "Content-Type": "multipart/form-data" }, // Để trình duyệt tự set kèm boundary
      });
      const att = uploadRes?.data?.data;
      if (!att?.id) throw new Error("Upload failed");
      return [{ id: att.id }];
    };

    const cloneLibraryFile = async (attData) => {
      // Reference the existing attachment directly — no re-upload needed
      // This avoids FormData restrictions and is equally valid since the
      // document record created is independent from the library document record.
      if (!attData?.id) throw new Error("Original attachment not found");
      return [{ id: attData.id }];
    };

    const toISO = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };

    const handleSubmit = async () => {
      try {
        await form.validateFields();
      } catch {
        return;
      }
      const values = form.getFieldsValue();
      const hasLocalFile = fileList.length > 0;
      const hasLibFile = selectedLibDocs.length > 0;
      const hasFile = activeTab === "local" ? hasLocalFile : hasLibFile;
      const hasDrive = !!values.googleDriveUrl?.trim();

      if (!isEdit && !hasFile && !hasDrive) {
        message.error("Please select a file or enter a Drive URL");
        return;
      }

      if (onAddPending) {
        setUploading(true);
        try {
          let attIds = null;
          let fileName = "Google Drive Link";
          if (activeTab === "local" && hasLocalFile) {
            attIds = await uploadFile();
            fileName = fileList[0].name;
          } else if (activeTab === "library" && hasLibFile) {
            attIds = await cloneLibraryFile(selectedLibDocs[0].attData);
            const attData = selectedLibDocs[0].attData;
            const ext = attData.extname
              ? attData.extname.startsWith(".")
                ? attData.extname
                : `.${attData.extname}`
              : "";
            fileName = attData.filename || `cloned_file${ext}`;
            if (ext && !fileName.toLowerCase().endsWith(ext.toLowerCase()))
              fileName += ext;
          }
          onAddPending({ attIds, fileName, metadata: values });
          handleClose();
        } catch (e) {
          message.error(`Upload error: ${e.message}`);
        } finally {
          setUploading(false);
        }
        return;
      }

      setUploading(true);
      try {
        let attIds = null;
        if (hasFile) {
          if (activeTab === "local") {
            attIds = await uploadFile();
          } else {
            attIds = await cloneLibraryFile(selectedLibDocs[0].attData);
          }
        }
        const now = new Date().toISOString();
        const payload = {
          documentType: values.documentType?.trim() || "",
          documentCode: values.documentCode?.trim() || "",
          title: values.title?.trim() || "",
          openingDate: toISO(values.openingDate),
          signedAt: toISO(values.signedAt),
          effectiveAt: toISO(values.effectiveAt),
          senderName: values.senderName?.trim() || "",
          recipientName: values.recipientName?.trim() || "",
          language: values.language?.trim() || "",
          docFormat: values.docFormat?.trim() || "",
          googleDriveUrl: values.googleDriveUrl?.trim() || "",
          description: values.description?.trim() || "", // 🌟 Bổ sung gửi data tóm tắt
          note: values.note?.trim() || "",
          updatedById: extractId(currentUser?.id) || null,
          updatedAt: now,
          folderId: extractId(projectFolderId),
          ...(attIds && { fileAttachment: attIds }),
        };

        if (isEdit) {
          await ctx.api.request({
            url: "documents:update",
            method: "POST",
            params: { filterByTk: editDoc.id },
            data: payload,
          });
          message.success("✅ Updated successfully!");
        } else {
          await apiReq("documents:create", "POST", {
            ...payload,
            ...buildTaskUploadDocumentLink(collectionName, recordId, {
              folderId: projectFolderId,
            }),
            createdById: currentUser?.id || null,
            createdAt: now,
            batchId: `upd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          });
          message.success("✅ Upload successful!");
        }
        handleClose();
        if (onSuccess) onSuccess();
      } catch (e) {
        message.error("Error: " + (e?.message || "Please try again"));
      }
      setUploading(false);
    };

    const handleSubmitUpload = async () => {
      try {
        await form.validateFields();
      } catch {
        return;
      }
      const values = form.getFieldsValue();
      const hasSelectedUpload = fileList.length > 0;
      const hasLibFile = selectedLibDocs.length > 0;
      const hasUploadFile =
        activeTab === "local" || activeTab === "folder"
          ? hasSelectedUpload
          : hasLibFile;
      const hasDrive = !!values.googleDriveUrl?.trim();

      if (isEdit && activeTab === "folder" && hasSelectedUpload) {
        message.warning("Updating a document only supports replacing 1 file, folder upload is not supported.");
        return;
      }
      if (isEdit && activeTab === "local" && fileList.length > 1) {
        message.warning("Updating a document only supports replacing 1 file.");
        return;
      }
      if (isEdit && activeTab === "library" && selectedLibDocs.length > 1) {
        message.warning("Updating a document only supports replacing 1 file.");
        return;
      }
      if (!isEdit && !hasUploadFile && !hasDrive) {
        message.error("Please select a file or enter a Drive URL");
        return;
      }

      const buildLibraryEntries = async () => {
        const isSingle = selectedLibDocs.length === 1;
        const uploadGroupId = createTaskUploadBatchId("lib");
        const entries = [];
        for (const libDoc of selectedLibDocs) {
          const attIds = await cloneLibraryFile(libDoc.attData);
          const attData = libDoc.attData;
          const ext = attData.extname
            ? attData.extname.startsWith(".")
              ? attData.extname
              : `.${attData.extname}`
            : "";
          let fileName = attData.filename || `cloned_file${ext}`;
          if (ext && !fileName.toLowerCase().endsWith(ext.toLowerCase()))
            fileName += ext;
          const libDocTitle =
            libDoc.docData?.title || libDoc.docData?.name || fileName;
          entries.push({
            attIds,
            fileName,
            docTitle:
              isSingle && values.title?.trim() ? values.title.trim() : libDocTitle,
            metadata: values,
            uploadKind: "library",
            uploadGroupId,
          });
        }
        return entries;
      };

      const buildDriveEntry = () => ({
        attIds: null,
        fileName: "Google Drive Link",
        docTitle: values.title?.trim() || "Google Drive Link",
        metadata: values,
        uploadKind: "drive",
        uploadGroupId: createTaskUploadBatchId("drv"),
      });

      const buildEntries = async () => {
        if ((activeTab === "local" || activeTab === "folder") && hasSelectedUpload) {
          return buildUploadEntries(values);
        }
        if (activeTab === "library" && hasLibFile) return buildLibraryEntries();
        if (hasDrive) return [buildDriveEntry()];
        return [];
      };

      setUploading(true);
      try {
        const uploadEntries = await buildEntries();
        if (onAddPending) {
          onAddPending(uploadEntries);
          handleClose();
          return;
        }

        const now = new Date().toISOString();
        const buildPayload = (entry, targetFolderId) => {
          const docTitle =
            entry?.docTitle || values.title?.trim() || entry?.fileName || "";
          return {
            title: docTitle,
            documentType: values.documentType?.trim() || "",
            documentCode: values.documentCode?.trim() || "",
            openingDate: toISO(values.openingDate),
            signedAt: toISO(values.signedAt),
            effectiveAt: toISO(values.effectiveAt),
            senderName: values.senderName?.trim() || "",
            recipientName: values.recipientName?.trim() || "",
            language: values.language?.trim() || "",
            docFormat: values.docFormat?.trim() || "",
            googleDriveUrl: values.googleDriveUrl?.trim() || "",
            description: values.description?.trim() || "",
            note: values.note?.trim() || "",
            updatedById: extractId(currentUser?.id) || null,
            updatedAt: now,
            uploadedById: extractId(currentUser?.id) || null,
            folderId: extractId(targetFolderId),
            moduleScope: CASE_DOCUMENT_SCOPE,
            storageType: "cases",
            ...(entry?.attIds && { fileAttachment: entry.attIds }),
          };
        };

        if (isEdit) {
          const entry = uploadEntries[0] || null;
          const payload = buildPayload(entry, projectFolderId);
          await ctx.api.request({
            url: "documents:update",
            method: "POST",
            params: { filterByTk: editDoc.id },
            data: payload,
          });
          message.success("Updated successfully!");
        } else {
          const batchId = createTaskUploadBatchId("upd");
          const folderIdMap = await createTaskUploadFoldersFromEntries(
            uploadEntries,
            projectFolderId,
            { currentUser },
          );
          for (const entry of uploadEntries) {
            const relativeFolderPath = getRelativeFolderPath(entry.relativePath);
            const targetFolderId =
              folderIdMap[relativeFolderPath] || extractId(projectFolderId);
            await apiReq("documents:create", "POST", {
              ...buildPayload(entry, targetFolderId),
              ...buildTaskUploadDocumentLink(collectionName, recordId, {
                folderId: targetFolderId,
              }),
              createdById: currentUser?.id || null,
              createdAt: now,
              batchId,
            });
          }
          message.success(
            uploadEntries.length > 1
              ? `Uploaded ${uploadEntries.length} files successfully!`
              : "Upload successful!",
          );
        }
        handleClose();
        if (onSuccess) onSuccess();
      } catch (e) {
        message.error("Error: " + (e?.message || "Please try again"));
      } finally {
        setUploading(false);
      }
    };

    const inpStyle = { fontSize: 12, fontFamily: FONT };
    const documentTypeField = React.createElement(
      Form.Item,
      {
        name: "documentType",
        label: "Document type",
        rules: isCompact
          ? []
          : [{ required: true, message: "Please enter the document type" }],
      },
      React.createElement(
        "div",
        null,
        React.createElement(Input, {
          allowClear: true,
          maxLength: 150,
          placeholder: "e.g.: Contract, Minutes...",
          list: "doc-type-list",
          style: inpStyle,
        }),
        React.createElement(
          "datalist",
          { id: "doc-type-list" },
          ...DOC_TYPE_SUGGESTIONS.map((s) =>
            React.createElement("option", { key: s, value: s }),
          ),
        ),
      ),
    );
    const divider = (label) =>
      React.createElement(
        "div",
        {
          style: {
            fontSize: 12,
            color: "#8c8c8c",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            margin: "12px 0 8px",
            paddingBottom: 4,
            borderBottom: "1px solid #f0f0f0",
            fontFamily: FONT,
          },
        },
        label,
      );

    return React.createElement(
      Modal,
      {
        open,
        onCancel: handleClose,
        width: isCompact ? 680 : 1100,
        centered: true,
        title: React.createElement(
          Text,
          { strong: true, style: { fontFamily: FONT, fontSize: 14 } },
          isEdit ? "✏️ Update document" : "📎 Attach document",
        ),
        footer: [
          React.createElement(
            Button,
            {
              key: "c",
              onClick: handleClose,
              disabled: uploading,
              style: { fontFamily: FONT },
            },
            "Cancel",
          ),
          React.createElement(
            Button,
            {
              key: "s",
              type: "primary",
              onClick: handleSubmitUpload,
              loading: uploading,
              style: { fontFamily: FONT },
            },
            uploading
              ? isEdit
                ? "Updating..."
                : "Processing..."
              : isEdit
                ? "Update"
                : onAddPending
                  ? "Submit"
                  : "Upload",
          ),
        ],
      },
      currentUser &&
        !isCompact &&
        React.createElement(
          "div",
          {
            style: {
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              borderRadius: 6,
              padding: "6px 12px",
              marginBottom: 12,
              fontSize: 12,
              color: "#595959",
              fontFamily: FONT,
            },
          },
          `👤 ${isEdit ? "Updated" : "Attached"} by: `,
          React.createElement(
            "strong",
            null,
            userName(currentUser) || currentUser.email,
          ),
        ),
      React.createElement(
        Form,
        { form, layout: "vertical", size: "small", style: { fontFamily: FONT } },
        !isCompact && divider("Identification"),
        !isCompact &&
          React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
              documentTypeField,
              React.createElement(
                Form.Item,
                { name: "title", label: "Document name" },
                React.createElement(Input, {
                  allowClear: true,
                  placeholder:
                    "Enter the full document name (uses the file name if left blank)",
                  style: inpStyle,
                }),
              ),
            ),
        !isCompact &&
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
            React.createElement(
              Form.Item,
              { name: "documentCode", label: "Reference number" },
              React.createElement(Input, {
                allowClear: true,
                placeholder: "e.g.: 123/2024/HĐ",
                style: inpStyle,
              }),
            ),
            React.createElement(
              Form.Item,
              { name: "openingDate", label: "Issue date" },
              React.createElement(Input, {
                type: "date",
                style: { width: "100%", ...inpStyle },
              }),
            ),
          ),
        !isCompact &&
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
            React.createElement(
              Form.Item,
              { name: "signedAt", label: "Signed date" },
              React.createElement(Input, {
                type: "date",
                style: { width: "100%", ...inpStyle },
              }),
            ),
            React.createElement(
              Form.Item,
              { name: "effectiveAt", label: "Effective date" },
              React.createElement(Input, {
                type: "date",
                style: { width: "100%", ...inpStyle },
              }),
            ),
          ),
        !isCompact && divider("Related parties"),
        !isCompact &&
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
            React.createElement(
              Form.Item,
              { name: "senderName", label: "Sender" },
              React.createElement(Input, {
                allowClear: true,
                placeholder: "Name of sending person / organization",
                style: inpStyle,
              }),
            ),
            React.createElement(
              Form.Item,
              { name: "recipientName", label: "Recipient" },
              React.createElement(Input, {
                allowClear: true,
                placeholder: "Name of receiving person / organization",
                style: inpStyle,
              }),
            ),
          ),

        !isCompact &&
          React.createElement(
            Form.Item,
            { name: "description", label: "Content summary" },
            React.createElement(Input.TextArea, {
              rows: 3,
              allowClear: true,
              placeholder: "Briefly describe the main content...",
            }),
          ),
        divider("Attached file"),
        React.createElement(ctx.antd.Tabs, {
          activeKey: activeTab,
          onChange: (key) => {
            setActiveTab(key);
            setFileList([]);
            setSelectedLibDocs([]);
          },
          items: [
            {
              key: "local",
              label: "Upload from computer",
              children: React.createElement(
                Form.Item,
                {
                  label: isEdit ? "Replace with new file (optional)" : "Choose file",
                  style: { marginBottom: 0 },
                },
                React.createElement(
                  Dragger,
                  {
                    fileList,
                    beforeUpload: () => false,
                    multiple: !isEdit,
                    onChange: ({ fileList: fl }) => {
                      const nextList = isEdit ? fl.slice(-1) : fl;
                      setFileList(nextList);
                      if (isEdit && nextList.length > 0) {
                        const newFile = getUploadItemFile(nextList[0]);
                        const currentTitle = (form.getFieldValue("title") || "").trim();
                        // Chỉ auto-fill nếu title chưa bị người dùng sửa khác tên file cũ
                        if (
                          newFile?.name &&
                          (!currentTitle || currentTitle === initialEditTitleRef.current)
                        ) {
                          form.setFieldsValue({ title: newFile.name });
                        }
                      }
                    },
                    ...(isEdit ? { maxCount: 1 } : {}),
                    style: { padding: "6px 0" },
                  },
                  React.createElement(
                    "p",
                    { style: { fontSize: 20, margin: "0 0 4px" } },
                    "📁",
                  ),
                  React.createElement(
                    "p",
                    {
                      style: {
                        fontSize: 12,
                        color: "#595959",
                        margin: 0,
                        fontFamily: FONT,
                      },
                    },
                    "Drag & drop or ",
                    React.createElement(
                      "span",
                      { style: { color: "#1890ff" } },
                      "click to select",
                    ),
                  ),
                ),
              ),
            },
            !isEdit && {
              key: "folder",
              label: "Upload folder",
              children: React.createElement(
                Form.Item,
                {
                  label: "Choose folder",
                  style: { marginBottom: 0 },
                },
                React.createElement(
                  Dragger,
                  {
                    fileList,
                    beforeUpload: () => false,
                    multiple: true,
                    directory: true,
                    webkitdirectory: "true",
                    onChange: ({ fileList: fl }) => setFileList(fl),
                    style: { padding: "6px 0" },
                  },
                  React.createElement(
                    "p",
                    { style: { margin: "0 0 6px", color: "#185FA5" } },
                    TASK_FILE_ACTION_ICONS.folder,
                  ),
                  React.createElement(
                    "p",
                    {
                      style: {
                        fontSize: 12,
                        color: "#595959",
                        margin: 0,
                        fontFamily: FONT,
                      },
                    },
                    "Choose a folder to preserve the folder structure when rendered in Task Notes",
                  ),
                ),
              ),
            },
            {
              key: "library",
              label: "Choose from Case's Document",
              children: React.createElement(
                "div",
                { style: { padding: "8px 0" } },
                libraryLoading
                  ? React.createElement(
                      "div",
                      { style: { textAlign: "center", padding: 20 } },
                      React.createElement(ctx.antd.Spin, { size: "small" }),
                      React.createElement(
                        "div",
                        {
                          style: { marginTop: 8, fontSize: 12, color: "#8c8c8c" },
                        },
                        "Loading library...",
                      ),
                    )
                  : React.createElement(
                      "div",
                      { className: "task-library-treeselect" },
                      React.createElement("style", null, LIBRARY_TREESELECT_CSS),
                      React.createElement(TreeSelect, {
                        style: { width: "100%" },
                        treeData: interactiveLibraryTreeData,
                        placeholder:
                          "Search and select a file from this case, linked cases, or reference material...",
                        treeDefaultExpandAll: false,
                        treeExpandedKeys: libraryExpandedKeys,
                        onTreeExpand: (expandedKeys) =>
                          setLibraryExpandedKeys(
                            (expandedKeys || []).map((key) => String(key)),
                          ),
                        allowClear: true,
                        showSearch: true,
                        filterTreeNode: (input, node) => {
                          const searchText =
                            node?.searchText || node?.props?.searchText || "";
                          return normalizeLookupText(searchText).includes(
                            normalizeLookupText(input),
                          );
                        },
                        notFoundContent: "No accessible documents found",
                        multiple: !isEdit,
                        onChange: handleTreeSelect,
                        value: !isEdit
                          ? selectedLibDocs.map((doc) => doc.value)
                          : selectedLibDocs[0]?.value,
                        listHeight: 500,
                        dropdownStyle: { maxHeight: 560, minWidth: 460, overflow: "auto" },
                        dropdownMatchSelectWidth: false,
                        popupMatchSelectWidth: false,
                      }),
                    ),
              ),
            },
          ].filter(Boolean),
        }),
        !isCompact &&
          React.createElement(
            Form.Item,
            { name: "googleDriveUrl", label: "Google Drive URL (optional)" },
            React.createElement(Input, {
              placeholder: "https://docs.google.com/...",
              allowClear: true,
              style: inpStyle,
            }),
          ),
        !isCompact && divider("Note"),
        !isCompact &&
          React.createElement(
            Form.Item,
            { name: "note", label: "Note" },
            React.createElement(Input.TextArea, {
              rows: 2,
              allowClear: true,
              placeholder: "Enter a note...",
              style: inpStyle,
            }),
          ),
      ),
    );
  };

  const DocDetailDrawer = ({ doc, onClose, onSuccess, currentUser }) => {
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
      if (!doc) return;
      setEditing(false);
      form.setFieldsValue({
        documentType: doc.documentType || "",
        documentCode: doc.documentCode || "",
        title: doc.title || "",
        openingDate: doc.openingDate ? doc.openingDate.slice(0, 10) : "",
        signedAt: doc.signedAt ? doc.signedAt.slice(0, 10) : "",
        effectiveAt: doc.effectiveAt ? doc.effectiveAt.slice(0, 10) : "",
        senderName: doc.senderName || "",
        recipientName: doc.recipientName || "",
        googleDriveUrl: doc.googleDriveUrl || "",
        note: doc.note || "",
      });
    }, [doc]);

    const toISO = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };
    const handleSave = async () => {
      try {
        await form.validateFields();
      } catch {
        return;
      }
      const values = form.getFieldsValue();
      setSaving(true);
      try {
        await ctx.api.request({
          url: "documents:update",
          method: "POST",
          params: { filterByTk: doc.id },
          data: {
            documentType: values.documentType?.trim() || "",
            documentCode: values.documentCode?.trim() || "",
            title: values.title?.trim() || "",
            openingDate: toISO(values.openingDate),
            signedAt: toISO(values.signedAt),
            effectiveAt: toISO(values.effectiveAt),
            senderName: values.senderName?.trim() || "",
            recipientName: values.recipientName?.trim() || "",
            googleDriveUrl: values.googleDriveUrl?.trim() || "",
            note: values.note?.trim() || "",
            updatedById: currentUser?.id || null,
            updatedAt: new Date().toISOString(),
          },
        });
        message.success("✅ Updated successfully!");
        setEditing(false);
        onSuccess();
      } catch (e) {
        message.error("Error: " + (e?.message || "Please try again"));
      }
      setSaving(false);
    };

    if (!doc) return null;
    const attachment = Array.isArray(doc.fileAttachment)
      ? doc.fileAttachment[0]
      : doc.fileAttachment;
    const fileUrl = attachment?.url || attachment?.preview;
    const fullUrl = getFullUrl(fileUrl);
    const fileExt = attachment?.extname || "";
    const isPdf = fileExt === ".pdf";
    const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(fileExt);

    return React.createElement(
      Drawer,
      {
        open: !!doc,
        onClose,
        width: 460,
        destroyOnClose: false,
        title: React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8 } },
          React.createElement(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: FONT,
                },
              },
              doc.title ||
                attachment?.title ||
                attachment?.filename ||
                "(No name yet)",
            ),
            doc.documentType &&
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 12,
                    color: "#8c8c8c",
                    fontFamily: FONT,
                    marginTop: 2,
                  },
                },
                doc.documentType,
              ),
          ),
        ),
        extra: editing
          ? React.createElement(
              Space,
              null,
              React.createElement(
                Button,
                { size: "small", onClick: () => setEditing(false) },
                "Cancel",
              ),
              React.createElement(
                Button,
                {
                  size: "small",
                  type: "primary",
                  loading: saving,
                  onClick: handleSave,
                },
                "💾 Save",
              ),
            )
          : React.createElement(
              Button,
              {
                size: "small",
                type: "primary",
                ghost: true,
                onClick: () => setEditing(true),
              },
              "✏️ Edit",
            ),
      },
      React.createElement(
        Descriptions,
        {
          column: 1,
          size: "small",
          bordered: true,
          labelStyle: {
            width: 130,
            fontSize: 12,
            color: "#8c8c8c",
            fontFamily: FONT,
          },
          contentStyle: { fontSize: 12, fontFamily: FONT },
        },
        React.createElement(
          Descriptions.Item,
          { label: "Document type" },
          doc.documentType || "—",
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Reference number" },
          React.createElement(
            "span",
            { style: { fontFamily: "monospace", fontSize: 12 } },
            doc.documentCode || "—",
          ),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Issue date" },
          doc.openingDate ? formatDate(doc.openingDate) : "—",
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Signed date" },
          doc.signedAt ? formatDate(doc.signedAt) : "—",
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Effective date" },
          doc.effectiveAt
            ? React.createElement(
                Text,
                { style: { color: "#389e0d", fontWeight: 500 } },
                formatDate(doc.effectiveAt),
              )
            : "—",
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Document name" },
          React.createElement(Text, { strong: true }, doc.title || "(None yet)"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Sender" },
          doc.senderName || "—",
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Recipient" },
          doc.recipientName || "—",
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Google Drive" },
          doc.googleDriveUrl
            ? React.createElement(
                Button,
                {
                  type: "link",
                  size: "small",
                  style: { padding: 0 },
                  onClick: () => window.open(doc.googleDriveUrl, "_blank"),
                },
                "🔗 Open link",
              )
            : "—",
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Note" },
          React.createElement(
            Text,
            { style: { whiteSpace: "pre-wrap", fontSize: 12 } },
            doc.note || "—",
          ),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Created date" },
          doc.createdAt ? fmt(doc.createdAt, "full") : "—",
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Created by" },
          doc.createdBy ? userName(doc.createdBy) || doc.createdBy?.email : "—",
        ),
      ),
      attachment &&
        fullUrl &&
        React.createElement(
          "div",
          {
            style: {
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid #f0f0f0",
            },
          },
          (isPdf || isImage) &&
            React.createElement(
              Button,
              { size: "small", onClick: () => window.open(fullUrl, "_blank") },
              "👁 Preview",
            ),
        ),
    );
  };

  const TimesheetModal = ({
    open,
    onClose,
    onSuccess,
    item,
    type,
    lawyers,
    currentUser,
    projectManagerId,
    editEntry = null,
  }) => {
    const isEdit = !!editEntry;
    const isAdmin = isAdminUser(currentUser);
    const isManager = isAdmin || currentUser?.id === projectManagerId;
    const assignedLawyer = useMemo(
      () => lawyers.find((l) => l.id === item.lawyerId),
      [lawyers, item.lawyerId],
    );
    const hasLawyer = !!assignedLawyer;

    const toLocalDTStr = (d) => {
      if (!d) return "";
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return "";
      const p = (n) => String(n).padStart(2, "0");
      return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
    };
    const nowLocalDTStr = () => toLocalDTStr(new Date());
    const initForm = () => ({
      workingDay: nowLocalDTStr(),
      duration: "",
      hourlyRate: assignedLawyer?.unitPrice || "",
      description: "",
    });
    const [form, setForm] = useState(initForm());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      if (!open) return;
      if (isEdit && editEntry) {
        setForm({
          workingDay:
            toLocalDTStr(editEntry.workingDay || editEntry.startTime) ||
            nowLocalDTStr(),
          duration: editEntry.duration || "",
          hourlyRate: editEntry.hourlyRate || assignedLawyer?.unitPrice || "",
          description: editEntry.description || "",
        });
      } else {
        setForm({ ...initForm(), hourlyRate: assignedLawyer?.unitPrice || "" });
      }
    }, [open, editEntry]);

    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
    const handleSave = async () => {
      if (!hasLawyer) {
        message.warning("Task has not been assigned a lawyer");
        return;
      }
      const finalDuration = parseFloat(form.duration || 0);
      if (!finalDuration || finalDuration <= 0) {
        message.warning("Please enter the number of hours worked");
        return;
      }
      if (finalDuration > 24) {
        message.warning("Hours must not exceed 24 hours");
        return;
      }
      if (!form.workingDay) {
        message.warning("Please select the date/time worked");
        return;
      }
      const startDT = new Date(form.workingDay);
      if (isNaN(startDT.getTime())) {
        message.warning("Invalid date/time");
        return;
      }
      const endDT = new Date(startDT.getTime() + finalDuration * 3600000);
      const workingDayISO = startDT.toISOString(); // ISO full, Nocobase nhận datetime field
      const startTimeISO = startDT.toISOString();
      const endTimeISO = endDT.toISOString();
      const rate = isManager
        ? parseFloat(form.hourlyRate) || 0
        : assignedLawyer?.unitPrice || 0;
      const amount = rate > 0 ? rate * finalDuration : null;
      const estDur = parseFloat(item.estimatedDuration || 0);
      const workRate = estDur > 0 ? calcWorkRate(estDur, finalDuration) : null;

      const payload = {
        lawyerId: extractId(assignedLawyer.id),
        workingDay: workingDayISO,
        startTime: startTimeISO,
        endTime: endTimeISO,
        duration: finalDuration,
        hourlyRate: rate || null,
        amount,
        workRate,
        description: form.description || null,
        billable: true,
        ...(type === "task"
          ? { taskId: extractId(item.id) }
          : { subTaskId: extractId(item.id) }),
        projectId: extractId(PROJECT_ID),
      };

      setSaving(true);
      try {
        if (isEdit) {
          await updateTimesheet(extractId(editEntry.id), payload);
          message.success("✅ Updated");
        } else {
          // 🌟 ĐÃ BỎ status: 'draft', ĐỂ BACKEND TỰ QUYẾT ĐỊNH
          await createTimesheet(payload);

          if (workRate !== null) {
            const updateUrl =
              type === "subTask"
                ? `subTasks:update?filterByTk=${extractId(item.id)}`
                : `tasks:update?filterByTk=${extractId(item.id)}`;
            await apiReq(updateUrl, "POST", { workRate });
          }
          message.success("✅ Timesheet saved");
        }
        onClose();
        onSuccess();
      } catch (err) {
        message.error("Error: " + (err?.message || "Please try again"));
      }
      setSaving(false);
    };

    const inpS = {
      width: "100%",
      border: "1px solid #e8e8e8",
      borderRadius: 6,
      padding: "8px 12px",
      fontSize: 13,
      fontFamily: FONT,
      outline: "none",
      boxSizing: "border-box",
      color: "#262626",
      background: "#fff",
    };
    const lbl = (t) =>
      React.createElement(
        Text,
        {
          style: {
            fontSize: 11,
            color: "#8c8c8c",
            display: "block",
            marginBottom: 5,
            fontFamily: FONT,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          },
        },
        t,
      );
    const fld = (l, child) =>
      React.createElement("div", { style: { marginBottom: 14 } }, lbl(l), child);
    const focusB = (e) => (e.currentTarget.style.borderColor = "#1890ff");
    const blurB = (e) => (e.currentTarget.style.borderColor = "#e8e8e8");
    const dur = parseFloat(form.duration || 0);
    const estDur = parseFloat(item.estimatedDuration || 0);
    const previewWR = estDur > 0 && dur > 0 ? calcWorkRate(estDur, dur) : null;
    const wrPrev = previewWR !== null ? workRateCfg(previewWR) : null;

    const endPreview = (() => {
      if (!form.workingDay || dur <= 0) return null;
      const s = new Date(form.workingDay);
      if (isNaN(s.getTime())) return null;
      return new Date(s.getTime() + dur * 3600000);
    })();

    return React.createElement(
      Modal,
      {
        open,
        onCancel: onClose,
        footer: null,
        width: 480,
        centered: true,
        title: React.createElement(
          Text,
          { strong: true, style: { fontSize: 15, fontFamily: FONT } },
          isEdit ? "✏️ Update work hours" : "⏱ Log work hours",
        ),
      },
      !hasLawyer
        ? React.createElement(
            "div",
            { style: { textAlign: "center", padding: "30px 0" } },
            React.createElement(
              "div",
              { style: { fontSize: 32, marginBottom: 12 } },
              "⚠️",
            ),
            React.createElement(
              Text,
              {
                style: {
                  fontSize: 14,
                  fontFamily: FONT,
                  color: "#cf1322",
                  display: "block",
                },
              },
              "This work has not been assigned a lawyer",
            ),
          )
        : React.createElement(
            "div",
            null,

            /* Luật sư (read-only) */
            fld(
              "👨‍⚖️ Lawyer",
              React.createElement(
                "div",
                {
                  style: {
                    ...inpS,
                    background: "#f5f5f5",
                    color: "#595959",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "not-allowed",
                    borderRadius: 6,
                  },
                },
                React.createElement(Av, {
                  name: assignedLawyer.lawyerName,
                  color:
                    LAWYER_COLORS[
                      lawyers.indexOf(assignedLawyer) % LAWYER_COLORS.length
                    ],
                  size: 22,
                }),
                React.createElement(
                  "span",
                  { style: { fontWeight: 500 } },
                  assignedLawyer.lawyerName,
                ),
              ),
            ),
            /* Ngày giờ thực hiện */
            fld(
              "📅 Date/time worked *",
              React.createElement("input", {
                type: "datetime-local",
                value: form.workingDay,
                onChange: (e) => set("workingDay", e.target.value),
                style: inpS,
                onFocus: focusB,
                onBlur: blurB,
              }),
            ),
            /* Số giờ */
            React.createElement(
              "div",
              { style: { marginBottom: 14 } },
              lbl("⏱ Hours worked *"),
              React.createElement(
                "div",
                { style: { position: "relative" } },
                React.createElement("input", {
                  type: "number",
                  step: "0.5",
                  min: "0.5",
                  max: "24",
                  placeholder: "e.g.: 2",
                  value: form.duration,
                  onChange: (e) => set("duration", e.target.value),
                  style: {
                    ...inpS,
                    fontSize: 13,
                    fontWeight: 700,
                    paddingRight: 50,
                    textAlign: "center",
                    border: dur > 0 ? "2px solid #1890ff" : "1px solid #e8e8e8",
                  },
                  onFocus: focusB,
                  onBlur: blurB,
                  autoFocus: true,
                }),
                React.createElement(
                  "span",
                  {
                    style: {
                      position: "absolute",
                      right: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 13,
                      color: "#8c8c8c",
                      fontFamily: FONT,
                      pointerEvents: "none",
                    },
                  },
                  "hours",
                ),
              ),
              dur > 0 &&
                React.createElement(
                  "div",
                  {
                    style: {
                      marginTop: 8,
                      padding: "10px 14px",
                      background: "#e6f4ff",
                      borderRadius: 8,
                      border: "1px solid #91caff",
                    },
                  },
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: wrPrev ? 6 : 0,
                      },
                    },
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 11,
                            fontFamily: FONT,
                            color: "#8c8c8c",
                            marginBottom: 2,
                          },
                        },
                        "🕐 Expected end time",
                      ),
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 13,
                            fontFamily: FONT,
                            fontWeight: 600,
                            color: "#096dd9",
                          },
                        },
                        endPreview
                          ? endPreview.toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—",
                      ),
                    ),
                    React.createElement(
                      "div",
                      { style: { textAlign: "right" } },
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 11,
                            fontFamily: FONT,
                            color: "#8c8c8c",
                            marginBottom: 2,
                          },
                        },
                        "⏱ Total",
                      ),
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 16,
                            fontFamily: FONT,
                            fontWeight: 700,
                            color: "#096dd9",
                          },
                        },
                        fmtHours(dur),
                      ),
                    ),
                  ),
                  wrPrev &&
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingTop: 6,
                          borderTop: "1px solid #bae0ff",
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          style: {
                            fontSize: 11,
                            fontFamily: FONT,
                            color: "#8c8c8c",
                          },
                        },
                        "⚡ Productivity:",
                      ),
                      React.createElement(
                        "span",
                        {
                          style: {
                            fontSize: 12,
                            fontFamily: FONT,
                            fontWeight: 700,
                            padding: "2px 10px",
                            borderRadius: 10,
                            background: wrPrev.bg,
                            color: wrPrev.color,
                          },
                        },
                        wrPrev.label,
                      ),
                    ),
                ),
            ),
            isManager &&
              fld(
                "💵 Rate / hour (₫)",
                React.createElement("input", {
                  type: "number",
                  placeholder: "Rate/hour",
                  value: form.hourlyRate,
                  onChange: (e) => set("hourlyRate", e.target.value),
                  style: inpS,
                  onFocus: focusB,
                  onBlur: blurB,
                }),
              ),
            /* Mô tả */
            fld(
              "📝 Work description",
              React.createElement("textarea", {
                value: form.description,
                onChange: (e) => set("description", e.target.value),
                placeholder: "Briefly describe the work performed...",
                rows: 3,
                style: { ...inpS, resize: "vertical", lineHeight: 1.6 },
                onFocus: focusB,
                onBlur: blurB,
              }),
            ),
            /* Footer */
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: "1px solid #f0f0f0",
                },
              },
              React.createElement(
                "div",
                {
                  onClick: onClose,
                  style: {
                    padding: "7px 20px",
                    borderRadius: 6,
                    border: "1px solid #e8e8e8",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: FONT,
                    color: "#595959",
                  },
                },
                "Cancel",
              ),
              React.createElement(
                "div",
                {
                  onClick: saving ? null : handleSave,
                  style: {
                    padding: "7px 24px",
                    borderRadius: 6,
                    background: saving ? "#f5f5f5" : "#1890ff",
                    color: saving ? "#bfbfbf" : "#fff",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontFamily: FONT,
                    fontWeight: 700,
                  },
                },
                saving ? "Saving..." : isEdit ? "Update" : "+ Log hours",
              ),
            ),
          ),
    );
  };

  const TimesheetTab = ({
    item,
    type,
    lawyers,
    currentUser,
    projectManagerId,
    isManager = false,
    canAccess = true,
  }) => {
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [deleting, setDeleting] = useState(null);

    if (!canAccess)
      return React.createElement(
        "div",
        { style: { textAlign: "center", padding: "32px 0", color: "#8c8c8c" } },
        React.createElement(
          "div",
          { style: { fontSize: 28, marginBottom: 8 } },
          "🔒",
        ),
        React.createElement(
          Text,
          { style: { fontSize: 12, fontFamily: FONT, color: "#8c8c8c" } },
          "Only the assignee or manager can view this.",
        ),
      );

    const assignedLawyer = useMemo(
      () => lawyers.find((l) => extractId(l.id) === extractId(item.lawyerId)),
      [lawyers, item.lawyerId],
    );
    const hasLawyer = !!assignedLawyer;
    const lawyerMap = useMemo(() => {
      const m = {};
      lawyers.forEach((l, i) => {
        m[extractId(l.id)] = {
          name: l.lawyerName,
          color: LAWYER_COLORS[i % LAWYER_COLORS.length],
        };
      });
      return m;
    }, [lawyers]);

    const reload = useCallback(() => {
      setLoading(true);
      const fk = type === "task" ? "taskId" : "subTaskId";
      fetchTimesheets({ [fk]: { $eq: extractId(item.id) } }).then((d) => {
        setSheets(d);
        setLoading(false);
      });
    }, [item.id, type]);

    useEffect(() => {
      reload();
    }, [item.id]);

    const totalHours = sheets.reduce(
      (s, r) => s + (parseFloat(r.duration) || 0),
      0,
    );
    const totalAmount = sheets.reduce(
      (s, r) => s + (parseFloat(r.amount) || 0),
      0,
    );
    const estDur = parseFloat(item.estimatedDuration || 0);

    const handleDelete = async (id) => {
      setDeleting(id);
      try {
        await deleteTimesheet(extractId(id));
        message.success("Deleted");
        reload();
      } catch {
        message.error("Delete failed");
      }
      setDeleting(null);
    };

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 10 } },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        hasLawyer
          ? React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8 } },
              React.createElement(Av, {
                name: assignedLawyer.lawyerName,
                color: lawyerMap[extractId(assignedLawyer.id)]?.color,
                size: 22,
              }),
              React.createElement(
                "div",
                null,
                React.createElement(
                  Text,
                  {
                    style: {
                      fontSize: 12,
                      fontFamily: FONT,
                      fontWeight: 600,
                      display: "block",
                    },
                  },
                  assignedLawyer.lawyerName,
                ),
                React.createElement(
                  Text,
                  { style: { fontSize: 12, fontFamily: FONT, color: "#8c8c8c" } },
                  `${fmtVND(assignedLawyer.unitPrice || 0)}/hr${estDur > 0 ? `  ·  Estimated: ${fmtHours(estDur)}` : ""}`,
                ),
              ),
            )
          : React.createElement(
              "span",
              { style: { fontSize: 12, fontFamily: FONT, color: "#cf1322" } },
              "⚠ Not assigned",
            ),

        // 🌟 HEADER BUTTONS (Thêm nút Reload ở đây)
        React.createElement(
          "div",
          { style: { display: "flex", gap: 8, alignItems: "center" } },
          React.createElement(ReloadButton, {
            onReload: reload,
            loading,
            size: "small",
            text: "",
          }),
          hasLawyer &&
            React.createElement(
              "div",
              {
                onClick: () => {
                  setEditEntry(null);
                  setModal(true);
                },
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  padding: "5px 12px",
                  borderRadius: 5,
                  background: "#1890ff",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                },
              },
              "＋ Add",
            ),
        ),
      ),

      sheets.length > 0 &&
        React.createElement(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: isManager ? "1fr 1fr 1fr" : "1fr 1fr",
              gap: 8,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                background: "#e6f4ff",
                borderRadius: 6,
                padding: "8px 10px",
                border: "1px solid #91caff",
              },
            },
            React.createElement(
              Text,
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#096dd9",
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 2,
                },
              },
              "⏱ Total hours",
            ),
            React.createElement(
              Text,
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  fontWeight: 700,
                  color: "#096dd9",
                  display: "block",
                },
              },
              fmtHours(totalHours),
            ),
          ),
          React.createElement(
            "div",
            {
              style: {
                background: item.workRate
                  ? workRateCfg(item.workRate).bg
                  : "#f9f0ff",
                borderRadius: 6,
                padding: "8px 10px",
                border: "1px solid #d3adf7",
              },
            },
            React.createElement(
              Text,
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#531dab",
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 2,
                },
              },
              "⚡ Productivity",
            ),
            React.createElement(
              Text,
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  fontWeight: 700,
                  color: item.workRate
                    ? workRateCfg(item.workRate).color
                    : "#8c8c8c",
                  display: "block",
                },
              },
              item.workRate ? workRateCfg(item.workRate).label : "—",
            ),
          ),
          isManager &&
            React.createElement(
              "div",
              {
                style: {
                  background: "#f6ffed",
                  borderRadius: 6,
                  padding: "8px 10px",
                  border: "1px solid #b7eb8f",
                },
              },
              React.createElement(
                Text,
                {
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#389e0d",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: 2,
                  },
                },
                "💰 Amount",
              ),
              React.createElement(
                Text,
                {
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    fontWeight: 700,
                    color: "#389e0d",
                    display: "block",
                  },
                },
                fmtVND(totalAmount),
              ),
            ),
        ),

      loading
        ? React.createElement(
            "div",
            { style: { textAlign: "center", padding: 16 } },
            React.createElement(Spin, { size: "small" }),
          )
        : sheets.length === 0
          ? React.createElement(
              "div",
              {
                style: {
                  textAlign: "center",
                  padding: "16px 0",
                  color: "#bfbfbf",
                  fontSize: 12,
                  fontFamily: FONT,
                  border: "1px dashed #f0f0f0",
                  borderRadius: 6,
                },
              },
              hasLawyer
                ? "No work hour entries yet"
                : "Assign a lawyer first",
            )
          : React.createElement(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: 6 } },
              ...sheets.map((s) => {
                const wr = s.workRate != null ? workRateCfg(s.workRate) : null;
                return React.createElement(
                  "div",
                  {
                    key: s.id,
                    style: {
                      background: "#fff",
                      borderRadius: 6,
                      padding: "10px 12px",
                      border: "1px solid #e8e8e8",
                    },
                  },
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      },
                    },
                    React.createElement(
                      "div",
                      {
                        style: { display: "flex", alignItems: "center", gap: 6 },
                      },
                      React.createElement(
                        Text,
                        {
                          style: {
                            fontSize: 12,
                            fontFamily: FONT,
                            color: "#262626",
                            fontWeight: 600,
                          },
                        },
                        fmt(s.workingDay, "full") || "—",
                      ),
                    ),
                    wr &&
                      React.createElement(
                        "span",
                        {
                          style: {
                            fontSize: 12,
                            fontFamily: FONT,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 8,
                            background: wr.bg,
                            color: wr.color,
                          },
                        },
                        `⚡ ${wr.label}`,
                      ),
                  ),
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        fontSize: 12,
                        fontFamily: FONT,
                        color: "#595959",
                      },
                    },
                    React.createElement(
                      "span",
                      { style: { fontWeight: 700, color: "#096dd9" } },
                      fmtHours(parseFloat(s.duration) || 0),
                    ),
                    isManager &&
                      s.amount > 0 &&
                      React.createElement(
                        "span",
                        { style: { fontWeight: 700, color: "#389e0d" } },
                        `= ${fmtVND(s.amount)}`,
                      ),
                  ),
                  s.description &&
                    React.createElement(
                      Text,
                      {
                        style: {
                          fontSize: 12,
                          fontFamily: FONT,
                          color: "#8c8c8c",
                          display: "block",
                          marginTop: 3,
                        },
                      },
                      s.description,
                    ),

                  // 🌟 NÚT SỬA/XOÁ (Đã bỏ quy trình gửi duyệt vô nghĩa)
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 6,
                        paddingTop: 6,
                        marginTop: 4,
                        borderTop: "1px solid #f5f5f5",
                      },
                    },
                    React.createElement(
                      "div",
                      {
                        onClick: () => {
                          setEditEntry(s);
                          setModal(true);
                        },
                        style: {
                          fontSize: 12,
                          fontFamily: FONT,
                          padding: "3px 10px",
                          borderRadius: 4,
                          border: "1px solid #e8e8e8",
                          color: "#595959",
                          cursor: "pointer",
                          background: "#fafafa",
                        },
                      },
                      "✏️ Edit",
                    ),
                    React.createElement(
                      "div",
                      {
                        onClick: () => handleDelete(s.id),
                        style: {
                          fontSize: 12,
                          fontFamily: FONT,
                          padding: "3px 10px",
                          borderRadius: 4,
                          border: "1px solid #ffa39e",
                          color: "#cf1322",
                          cursor: "pointer",
                          background: "#fff1f0",
                        },
                      },
                      deleting === s.id ? "..." : "🗑 Delete",
                    ),
                  ),
                );
              }),
            ),

      React.createElement(TimesheetModal, {
        open: modal,
        onClose: () => {
          setModal(false);
          setEditEntry(null);
        },
        onSuccess: () => {
          setModal(false);
          setEditEntry(null);
          reload();
        },
        item,
        type,
        lawyers,
        currentUser,
        projectManagerId,
        editEntry,
      }),
    );
  };

  // ============================================================
  // §8 TASK COMPONENTS
  // ============================================================
  const PendingIssueCell = ({ task, allTasksInProject, lawyers }) => {
    if (!task.previousTaskId) {
      return React.createElement(
        "div",
        {
          style: {
            width: COL.pendingIssue,
            flexShrink: 0,
            textAlign: "center",
            color: "#d9d9d9",
            fontSize: 12,
          },
        },
        "—",
      );
    }
    const prevTask = allTasksInProject?.find((t) => t.id === task.previousTaskId);
    if (!prevTask) {
      return React.createElement(
        "div",
        {
          style: {
            width: COL.pendingIssue,
            flexShrink: 0,
            textAlign: "center",
            color: "#d9d9d9",
            fontSize: 12,
          },
        },
        "—",
      );
    }
    const statusInfo = STATUS_CFG[prevTask.status] || {
      color: "#8c8c8c",
      bg: "#f5f5f5",
      border: "#d9d9d9",
      label: "N/A",
    };
    const assignedLawyer = lawyers?.find((l) => l.id === prevTask.lawyerId);
    const lawyerName = assignedLawyer ? assignedLawyer.lawyerName : null;
    const tooltipContent = React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { fontWeight: 700, marginBottom: 4 } },
        prevTask.title,
      ),
      React.createElement(
        "div",
        null,
        `In charge: ${lawyerName || "Not assigned"}`,
      ),
      React.createElement("div", null, `Status: ${statusInfo.label}`),
    );
    return React.createElement(
      "div",
      {
        style: {
          width: COL.pendingIssue,
          flexShrink: 0,
          padding: "3px 8px",
          display: "flex",
          alignItems: "center",
        },
      },
      React.createElement(
        Tooltip,
        { title: tooltipContent, placement: "topLeft" },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 1,
              background: statusInfo.bg,
              border: `1px solid ${statusInfo.border}`,
              borderRadius: 4,
              padding: "3px 6px",
              cursor: "help",
              overflow: "hidden",
              width: "100%",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: statusInfo.color,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 4,
              },
            },
            React.createElement(
              "span",
              null,
              prevTask.status === "done" ? "✅" : "⏳",
            ),
            React.createElement(
              "span",
              {
                style: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              prevTask.title,
            ),
          ),
          lawyerName &&
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: statusInfo.color,
                  opacity: 0.75,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              `👤 ${lawyerName}`,
            ),
        ),
      ),
    );
  };

  const NextStepInlineEditor = ({
    item,
    type,
    onUpdate,
    currentUser,
    readOnly = false,
  }) => {
    const [val, setVal] = useState(item.nextStepDescription || "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      setVal(item.nextStepDescription || "");
    }, [item.id, item.nextStepDescription]);
    const isDirty = val !== (item.nextStepDescription || "");
    const handleSave = async () => {
      if (!isDirty || readOnly) return;
      setSaving(true);
      try {
        const url =
          type === "subTask"
            ? `subTasks:update?filterByTk=${item.id}`
            : `tasks:update?filterByTk=${item.id}`;
        await apiReq(url, "POST", {
          nextStepDescription: val || null,
        });
        onUpdate({ ...item, nextStepDescription: val || null });
        message.success("✅ Next step saved");
      } catch {
        message.error("Save failed");
      }
      setSaving(false);
    };

    if (readOnly) {
      return React.createElement(
        "div",
        {
          style: {
            padding: "8px 10px",
            background: "#fafafa",
            border: "1px solid #f0f0f0",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: FONT,
            color: val ? "#096dd9" : "#bfbfbf",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            minHeight: 40,
          },
        },
        val ? `→ ${val}` : "(No next step yet)",
      );
    }
    return React.createElement(
      "div",
      { style: { position: "relative" } },
      React.createElement("textarea", {
        value: val,
        onChange: (e) => setVal(e.target.value),
        placeholder:
          "e.g.: Draft the LoA per the Detailed outline, send to client for review...",
        rows: 3,
        style: {
          width: "100%",
          border: `1px solid ${isDirty ? "#1890ff" : "#e8e8e8"}`,
          borderRadius: 6,
          padding: "8px 10px",
          paddingBottom: 36,
          fontSize: 12,
          fontFamily: FONT,
          outline: "none",
          boxSizing: "border-box",
          resize: "vertical",
          lineHeight: 1.6,
          color: "#262626",
          background: "#fff",
        },
        onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
      }),
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            bottom: 8,
            right: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          },
        },
        isDirty &&
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#fa8c16",
                background: "#fff7e6",
                border: "1px solid #ffd591",
                borderRadius: 10,
                padding: "1px 8px",
              },
            },
            "Unsaved",
          ),
        React.createElement(
          "div",
          {
            onClick: saving ? null : handleSave,
            style: {
              fontSize: 12,
              fontFamily: FONT,
              padding: "3px 12px",
              borderRadius: 4,
              fontWeight: 600,
              background: saving ? "#f0f0f0" : isDirty ? "#1890ff" : "#f5f5f5",
              color: saving ? "#bfbfbf" : isDirty ? "#fff" : "#bfbfbf",
              cursor: saving ? "not-allowed" : isDirty ? "pointer" : "default",
            },
          },
          saving ? "Saving..." : isDirty ? "💾 Save" : "✓ Saved",
        ),
      ),
    );
  };

  const DescriptionInlineEditor = ({
    item,
    type,
    onUpdate,
    readOnly = false,
  }) => {
    const [val, setVal] = useState(item.description || "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      setVal(item.description || "");
    }, [item.id]);
    const isDirty = val !== (item.description || "");
    const handleSave = async () => {
      if (!isDirty || readOnly) return;
      setSaving(true);
      try {
        const url =
          type === "subTask"
            ? `subTasks:update?filterByTk=${item.id}`
            : `tasks:update?filterByTk=${item.id}`;
        await apiReq(url, "POST", { description: val || null });
        onUpdate({ ...item, description: val || null });
        message.success("✅ Saved");
      } catch {
        message.error("Save failed");
      }
      setSaving(false);
    };

    if (readOnly) {
      return React.createElement(
        "div",
        {
          style: {
            padding: "10px 12px",
            background: "#fafafa",
            border: "1px solid #f0f0f0",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: FONT,
            color: val ? "#262626" : "#bfbfbf",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            minHeight: 64,
          },
        },
        val || "(No content yet)",
      );
    }

    return React.createElement(
      "div",
      { style: { position: "relative" } },
      React.createElement("textarea", {
        value: val,
        onChange: (e) => setVal(e.target.value),
        placeholder: "Enter progress details...",
        rows: 4,
        style: {
          width: "100%",
          border: `1px solid ${isDirty ? "#1890ff" : "#e8e8e8"}`,
          borderRadius: 6,
          padding: "10px 12px",
          paddingBottom: 40,
          fontSize: 12,
          fontFamily: FONT,
          outline: "none",
          resize: "vertical",
          boxSizing: "border-box",
          color: "#262626",
          background: "#fff",
          lineHeight: 1.7,
        },
      }),
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            bottom: 8,
            right: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          },
        },
        isDirty &&
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                fontFamily: FONT,
                color: "#fa8c16",
                background: "#fff7e6",
                border: "1px solid #ffd591",
                borderRadius: 10,
                padding: "1px 8px",
              },
            },
            "Unsaved",
          ),
        React.createElement(
          "div",
          {
            onClick: saving ? null : handleSave,
            style: {
              fontSize: 12,
              fontFamily: FONT,
              padding: "3px 12px",
              borderRadius: 4,
              fontWeight: 600,
              background: saving ? "#f0f0f0" : isDirty ? "#1890ff" : "#f5f5f5",
              color: saving ? "#bfbfbf" : isDirty ? "#fff" : "#bfbfbf",
              cursor: saving ? "not-allowed" : isDirty ? "pointer" : "default",
            },
          },
          saving ? "Saving..." : isDirty ? "💾 Save" : "✓ Saved",
        ),
      ),
    );
  };

  const ActivityTab = ({ collectionName, recordId, lawyers }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const INITIAL_COUNT = 10;

    const collectionMap = {
      tasks: "Task",
      task: "Task",
      Task: "Task",
      subTasks: "SubTask",
      subTask: "SubTask",
      SubTask: "SubTask",
    };
    const normalizedName = collectionMap[collectionName] || collectionName;

    const authorName = (n) =>
      n?.createdBy?.nickname ||
      n?.createdBy?.username ||
      n?.createdBy?.email ||
      (n?.createdById ? `User #${n.createdById}` : "Anonymous");

    const getActivityTime = (a) =>
      new Date(
        a?.action === "created"
          ? a.createdAt || a.changedAt || a.updatedAt
          : a?.changedAt || a?.updatedAt || a?.createdAt,
      );

    const getActivitySortTime = (item) => {
      if (item._kind === "group") return item.latestTime || 0;
      if (item._kind === "taskLog") return item._time?.getTime?.() || 0;
      return item._time?.getTime?.() || 0;
    };

    const activityLogKey = (a) =>
      a?.batchId
        ? [
            "batch",
            a.collectionName || "",
            extractId(a.recordId) || "",
            a.action || "",
            a.fieldName || "",
            a.batchId || "",
            extractId(a.dataId) || "",
            a.oldValue || "",
            a.newValue || "",
          ].join("|")
        : [
            "time",
            a?.collectionName || "",
            extractId(a?.recordId) || "",
            a?.action || "",
            a?.fieldName || "",
            extractId(a?.dataId) || "",
            a?.oldValue || "",
            a?.newValue || "",
            a?.changedAt || a?.updatedAt || a?.createdAt || "",
          ].join("|");

    const activityLogRenderKey = (a) => {
      const field = ["title", "documents"].includes(a?.fieldName)
        ? "documents"
        : ["assignees", "assignedLawyerId"].includes(a?.fieldName)
          ? "assignees"
          : ["body", "notes"].includes(a?.fieldName)
            ? "body"
            : a?.fieldName || "";
      return [
        a?.action || "",
        field,
        a?.batchId || "",
        extractId(a?.dataId) || extractId(a?.recordId) || "",
        a?.oldValue || "",
        a?.newValue || "",
      ].join("|");
    };

    const uniqueActivityLogs = (logs) => {
      const seen = new Set();
      return (logs || []).filter((a) => {
        const key = activityLogKey(a);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const fetchChildActivityLogs = async (childCollectionName, records) => {
      const ids = Array.from(
        new Set((records || []).map((r) => extractId(r.id)).filter(Boolean)),
      );
      if (ids.length === 0) return [];

      const chunks = [];
      for (let i = 0; i < ids.length; i += 50) {
        chunks.push(ids.slice(i, i + 50));
      }

      try {
        const resList = await Promise.all(
          chunks.map((chunk) =>
            ctx.api.request({
              url: "activity_log:list",
              params: {
                pageSize: 500,
                page: 1,
                sort: ["-id"],
                filter: JSON.stringify({
                  $and: [
                    { collectionName: { $eq: childCollectionName } },
                    { recordId: { $in: chunk } },
                  ],
                }),
              },
            }),
          ),
        );
        return resList.flatMap((res) => res?.data?.data || []);
      } catch {
        const nested = await Promise.all(
          ids.map((id) => fetchActivityLog(childCollectionName, id)),
        );
        return nested.flat();
      }
    };

    const hasAssigneeValue = (assignees) => {
      if (!assignees) return false;
      if (typeof assignees === "string") return assignees.trim().length > 0;
      if (Array.isArray(assignees)) return assignees.length > 0;
      return true;
    };

    const getCommentLayoutType = ({ body, assignees, files }) => {
      const hasText = getCommentText(body, true).length > 0;
      const hasMentions = hasAssigneeValue(assignees);
      const hasFiles = (files || []).length > 0;

      if (hasText && (hasMentions || hasFiles)) return "commentGroup";
      if (hasText) return "commentOnly";
      if (hasFiles && hasMentions) return "commentGroup";
      if (hasFiles) return "fileOnly";
      if (hasMentions) return "mentionOnly";
      return "empty";
    };

    const getLayoutActionLabel = (layoutType, action, collection = null) => {
      const isCommentLayout =
        layoutType === "commentGroup" ||
        layoutType === "commentOnly" ||
        layoutType === "mentionOnly" ||
        collection === "Note";

      if (isCommentLayout && action === "updated")
        return "\u0111\u00e3 ch\u1ec9nh s\u1eeda b\u00ecnh lu\u1eadn";
      if (isCommentLayout && action === "deleted")
        return "\u0111\u00e3 x\u00f3a b\u00ecnh lu\u1eadn";

      const layoutLabels = {
        fileOnly: "\u0111\u00e3 t\u1ea3i l\u00ean t\u1ec7p",
        commentGroup: "\u0111\u00e3 b\u00ecnh lu\u1eadn",
        commentOnly: "\u0111\u00e3 b\u00ecnh lu\u1eadn",
        mentionOnly: "\u0111\u00e3 b\u00ecnh lu\u1eadn",
      };
      const actionLabels = {
        created: "\u0111\u00e3 b\u00ecnh lu\u1eadn",
        commented: "\u0111\u00e3 b\u00ecnh lu\u1eadn",
        updated: "\u0111\u00e3 ch\u1ec9nh s\u1eeda",
        deleted: "\u0111\u00e3 x\u00f3a b\u1ecf",
        uploaded: "\u0111\u00e3 t\u1ea3i l\u00ean",
      };
      return (
        layoutLabels[layoutType] ||
        actionLabels[action] ||
        "\u0111\u00e3 th\u1ef1c hi\u1ec7n"
      );
    };

    const getLayoutBadge = (layoutType, files) => {
      const fileCount = (files || []).length;
      if (layoutType === "commentGroup") {
        return fileCount > 0
          ? `B\u00ecnh lu\u1eadn + ${fileCount} t\u1ec7p`
          : "B\u00ecnh lu\u1eadn + nh\u1eafc t\u00ean";
      }
      if (layoutType === "commentOnly") return "B\u00ecnh lu\u1eadn";
      if (layoutType === "fileOnly")
        return fileCount > 1
          ? `${fileCount} t\u1ec7p`
          : "T\u1ec7p \u0111\u00ednh k\u00e8m";
      if (layoutType === "mentionOnly") return "Nh\u1eafc t\u00ean";
      return null;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // reloadData
    // ─────────────────────────────────────────────────────────────────────────
    const reloadData = useCallback(async () => {
      setLoading(true);
      setShowAll(false);

      try {
        const [parentLogsRaw, notes, files] = await Promise.all([
          fetchActivityLog(normalizedName, recordId),
          fetchNotes(normalizedName, recordId, true),
          fetchFiles(normalizedName, recordId, true),
        ]);

        const [noteLogsRaw, documentLogsRaw] = await Promise.all([
          fetchChildActivityLogs("Note", notes),
          fetchChildActivityLogs("Document", files),
        ]);

        const parentLogs = uniqueActivityLogs(parentLogsRaw);
        const childLogs = uniqueActivityLogs([
          ...noteLogsRaw,
          ...documentLogsRaw,
        ]);

        const notesMap = {};
        notes.forEach((n) => (notesMap[extractId(n.id)] = n));

        const noteIdSet = new Set(notes.map((n) => extractId(n.id)));
        const fileIdSet = new Set(files.map((f) => extractId(f.id)));
        const childBatchIds = new Set(
          [...notes, ...files].map((x) => x.batchId).filter(Boolean),
        );
        const NOTE_FIELDS = new Set([
          "body",
          "notes",
          "assignees",
          "assignedLawyerId",
          "isDeleted",
        ]);
        const DOCUMENT_FIELDS = new Set(["documents", "title", "isDeleted"]);
        const CHILD_LOG_FIELDS = new Set([
          "body",
          "notes",
          "assignees",
          "assignedLawyerId",
          "title",
          "documents",
          "isDeleted",
        ]);
        const TASK_LOG_FIELDS = new Set([
          ...Object.keys(FIELD_LABEL),
          ...Object.keys(ACTIVITY_FIELD_LABELS),
          "subTaskName",
          "deadline",
          "date",
          "blockedReason",
          "rejectionReason",
        ]);

        const isChildMirrorLog = (a) => {
          const field = a.fieldName;
          const dataId = extractId(a.dataId);
          if (NOTE_FIELDS.has(field) && noteIdSet.has(dataId)) return true;
          if (DOCUMENT_FIELDS.has(field) && fileIdSet.has(dataId)) return true;
          if (
            a.batchId &&
            childBatchIds.has(a.batchId) &&
            (NOTE_FIELDS.has(field) || DOCUMENT_FIELDS.has(field))
          ) {
            return true;
          }
          return false;
        };

        const commentBodySnapshots = new Set();
        const addCommentBodySnapshot = (value) => {
          const text = getCommentText(value, true);
          if (text) commentBodySnapshots.add(text);
        };
        notes.forEach((n) => addCommentBodySnapshot(n.body));
        childLogs.forEach((l) => {
          if (
            l.collectionName === "Note" &&
            (l.fieldName === "body" || l.fieldName === "notes")
          ) {
            addCommentBodySnapshot(l.oldValue);
            addCommentBodySnapshot(l.newValue);
          }
        });

        const isLegacyParentCommentLog = (a) => {
          if (!["created", "commented", "updated", "deleted"].includes(a.action))
            return false;
          if (a.fieldName === "notes") return true;
          if (a.fieldName !== "body") return false;
          const oldText = getCommentText(a.oldValue, true);
          const newText = getCommentText(a.newValue, true);
          return (
            (oldText && commentBodySnapshots.has(oldText)) ||
            (newText && commentBodySnapshots.has(newText))
          );
        };

        const taskLogItems = parentLogs
          .filter((a) => {
            const cName = a.collectionName;
            const field = a.fieldName;
            if (cName !== "Task" && cName !== "SubTask") return false;
            if (isChildMirrorLog(a)) return false;
            if (isLegacyParentCommentLog(a)) return false;
            return !field || TASK_LOG_FIELDS.has(field);
          })
          .map((a) => ({
            _kind: "taskLog",
            _action: a.action,
            _time: getActivityTime(a),
            data: a,
          }));

        const usedFileIds = new Set();
        const getFilesForNote = (note) => {
          const noteTime = new Date(note.createdAt).getTime();
          const result = files.filter((f) => {
            if (usedFileIds.has(extractId(f.id))) return false;
            return (
              (note.batchId && f.batchId && note.batchId === f.batchId) ||
              Math.abs(new Date(f.createdAt).getTime() - noteTime) <= 5000
            );
          });
          result.forEach((f) => usedFileIds.add(extractId(f.id)));
          return result;
        };

        const unifiedItems = notes
          .map((n) => {
            const noteId = extractId(n.id);
            const attachedFiles = getFilesForNote(n);
            const parentNote = n.parentId
              ? notesMap[extractId(n.parentId)]
              : null;
            const parentAuthor = parentNote ? authorName(parentNote) : null;

            const createBodyLog = childLogs.find(
              (l) =>
                l.collectionName === "Note" &&
                (l.action === "created" || l.action === "commented") &&
                extractId(l.recordId) === noteId &&
                (l.fieldName === "body" || l.fieldName === "notes"),
            );
            const createAssigneesLog = childLogs.find(
              (l) =>
                l.collectionName === "Note" &&
                l.action === "created" &&
                extractId(l.recordId) === noteId &&
                (l.fieldName === "assignees" ||
                  l.fieldName === "assignedLawyerId"),
            );
            const originalBody = createBodyLog ? createBodyLog.newValue : n.body;
            const originalAssignees = createAssigneesLog
              ? createAssigneesLog.newValue
              : n.assignees || [];
            const layoutType = getCommentLayoutType({
              body: originalBody,
              assignees: originalAssignees,
              files: attachedFiles,
            });

            return {
              _kind: "unified",
              _action: "created",
              _time: new Date(n.createdAt),
              note: n,
              files: attachedFiles,
              parentAuthor,
              parentNote,
              originalBody,
              originalAssignees,
              layoutType,
            };
          })
          .filter((it) => it.layoutType !== "empty");

        const logItems = childLogs
          .map((a) => {
            const field = a.fieldName;
            const act = a.action;
            const cName = a.collectionName;
            const recordLogId = extractId(a.recordId);
            const dataId = extractId(a.dataId);

            if (!["Note", "Document"].includes(cName)) return null;
            if (field && !CHILD_LOG_FIELDS.has(field)) return null;

            if ((act === "created" || act === "commented") && cName === "Note") {
              if (noteIdSet.has(recordLogId) || noteIdSet.has(dataId))
                return null;
            }

            if (
              (act === "created" || act === "uploaded") &&
              cName === "Document"
            ) {
              if (fileIdSet.has(recordLogId) || fileIdSet.has(dataId))
                return null;
            }

            if (
              field === "assignedLawyerId" &&
              childLogs.some(
                (l) =>
                  l !== a &&
                  l.collectionName === cName &&
                  extractId(l.recordId) === recordLogId &&
                  l.action === act &&
                  l.batchId &&
                  l.batchId === a.batchId &&
                  l.fieldName === "assignees",
              )
            ) {
              return null;
            }

            const isNoteCommentField =
              cName === "Note" &&
              ["body", "notes", "assignees", "assignedLawyerId"].includes(field);
            const relatedNote =
              cName === "Note"
                ? notesMap[recordLogId] || notesMap[dataId] || null
                : null;
            const relatedParentNote = relatedNote?.parentId
              ? notesMap[extractId(relatedNote.parentId)]
              : null;

            return {
              _kind: "log",
              _action: act,
              _time: getActivityTime(a),
              data: a,
              note: relatedNote,
              parentNote: relatedParentNote,
              parentAuthor: relatedParentNote
                ? authorName(relatedParentNote)
                : null,
              layoutType: isNoteCommentField ? "commentGroup" : undefined,
            };
          })
          .filter(Boolean);

        const orphanFiles = files
          .filter((f) => !usedFileIds.has(extractId(f.id)))
          .map((f) => ({
            _kind: "unified",
            _action: "uploaded",
            _time: new Date(f.createdAt),
            note: null,
            files: [f],
            parentAuthor: null,
            parentNote: null,
            originalBody: null,
            originalAssignees: [],
            layoutType: "fileOnly",
          }));

        const noteDocumentItems = [
          ...unifiedItems,
          ...logItems,
          ...orphanFiles,
        ].sort((a, b) => b._time - a._time);

        const groups = new Map();
        noteDocumentItems.forEach((it) => {
          const act = it._action;
          const cName =
            it._kind === "log"
              ? it.data.collectionName || "unknown"
              : it.note
                ? "Note"
                : "Document";
          let gId;

          if (it._kind === "unified" && it.note) {
            gId = `created_note_${extractId(it.note.id)}`;
          } else if (it._kind === "unified" && !it.note) {
            const bId = it.files?.[0]?.batchId;
            gId = bId
              ? `uploaded_document_batch_${bId}`
              : `uploaded_document_${extractId(it.files?.[0]?.id)}`;
          } else {
            const targetId =
              extractId(it.data.recordId) || extractId(it.data.dataId) || "no_id";
            const bId = it.data.batchId;
            gId = bId
              ? `log_${act}_${cName}_batch_${bId}`
              : `log_${act}_${cName}_${targetId}_${it._time.getTime()}`;
          }

          const time = it._time.getTime();
          if (!groups.has(gId)) {
            groups.set(gId, {
              id: gId,
              action: act,
              collectionName: cName,
              items: [],
              latestTime: 0,
              isDeleted: false,
              _kind: "group",
              layoutType: it.layoutType || "logGroup",
            });
          }

          const g = groups.get(gId);
          if (it.layoutType && g.layoutType === "logGroup") {
            g.layoutType = it.layoutType;
          }
          const isDup = g.items.some((prev) => {
            if (it._kind === "unified" && prev._kind === "unified") {
              const currentId = it.note
                ? `note_${extractId(it.note.id)}`
                : `doc_${extractId(it.files?.[0]?.id)}`;
              const prevId = prev.note
                ? `note_${extractId(prev.note.id)}`
                : `doc_${extractId(prev.files?.[0]?.id)}`;
              return currentId === prevId;
            }
            if (it._kind === "log" && prev._kind === "log") {
              return (
                activityLogKey(prev.data) === activityLogKey(it.data) ||
                activityLogRenderKey(prev.data) === activityLogRenderKey(it.data)
              );
            }
            return false;
          });

          if (!isDup) g.items.push(it);
          if (time > g.latestTime) g.latestTime = time;
          if (it._kind === "log" && it.data.action === "deleted")
            g.isDeleted = true;
        });

        const finalItems = [...Array.from(groups.values()), ...taskLogItems].sort(
          (a, b) => getActivitySortTime(b) - getActivitySortTime(a),
        );

        setItems(finalItems);
      } catch (e) {
        console.error("ActivityTab reload error:", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, [recordId, normalizedName]);

    useEffect(() => {
      reloadData();
    }, [reloadData]);

    // ─────────────────────────────────────────────────────────────────────────
    // renderAssigneeTags
    // ─────────────────────────────────────────────────────────────────────────
    const renderAssigneeTags = (assignees, isOld = false, isDel = false) => {
      if (!assignees) return null;

      const color = isOld ? "error" : isDel ? "default" : "processing";
      const style = {
        margin: "2px",
        fontSize: 11,
        borderRadius: 4,
        textDecoration: isOld || isDel ? "line-through" : "none",
        color: isOld ? "#cf1322" : undefined,
      };

      // String "name1, name2"
      if (typeof assignees === "string") {
        return assignees
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
          .map((n, i) =>
            React.createElement(
              Tag,
              { key: i, color, style },
              n.startsWith("@") ? n : "@" + n,
            ),
          );
      }

      // Array [{id} | id]
      if (Array.isArray(assignees)) {
        return assignees
          .map((item) => {
            const id = typeof item === "object" && item !== null ? item.id : item;
            if (typeof id === "string" && !extractId(id)) {
              const name = id.trim();
              if (!name) return null;
              return React.createElement(
                Tag,
                { key: name, color, style },
                name.startsWith("@") ? name : "@" + name,
              );
            }
            const u = lawyers?.find((l) => extractId(l.id) === extractId(id));
            if (!u) return null;
            return React.createElement(
              Tag,
              { key: id, color, style },
              "@" + (u.nickname || u.username || u.lawyerName || u.email),
            );
          })
          .filter(Boolean);
      }

      return null;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // renderNoteContent — layout ĐỒNG BỘ dùng cho cả unified lẫn log updated
    // Props:
    //   body, oldBody       — nội dung (oldBody chỉ có khi updated)
    //   assignees, oldAssignees
    //   files
    //   parentNote, parentAuthor
    //   isDel, isUpdated
    // ─────────────────────────────────────────────────────────────────────────
    const renderNoteContent = ({
      body,
      oldBody,
      assignees,
      oldAssignees,
      files,
      parentNote,
      parentAuthor,
      isDel = false,
      isUpdated = false,
      layoutType = "commentGroup",
    }) => {
      const hasBody = body || oldBody;
      const hasAssignees =
        hasAssigneeValue(assignees) || hasAssigneeValue(oldAssignees);
      const hasFiles = files?.length > 0;
      const isCommentOnly = layoutType === "commentOnly";
      const isFileOnly = layoutType === "fileOnly";
      const showBodyLabel = hasBody && !isCommentOnly;
      const showFileLabel = hasFiles && !isFileOnly;

      return React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: isCommentOnly || isFileOnly ? 6 : 10,
          },
        },

        // ── Reply context ──────────────────────────────────────────────────
        parentAuthor &&
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                color: "#8c8c8c",
                fontFamily: FONT,
                fontStyle: "italic",
              },
            },
            `replied to ${parentAuthor}:`,
          ),

        // ── Nội dung bình luận ─────────────────────────────────────────────
        hasBody &&
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#8c8c8c",
                  marginBottom: 6,
                  fontFamily: FONT,
                  display: showBodyLabel ? "block" : "none",
                },
              },
              "Comment content:",
            ),
            React.createElement(
              "div",
              {
                style: {
                  background: isDel
                    ? "#fff1f0"
                    : isCommentOnly
                      ? "#fff"
                      : "#e6fffb",
                  border: isDel
                    ? "1px solid #ffa39e"
                    : isCommentOnly
                      ? "1px solid #e8e8e8"
                      : "1px solid #87e8de",
                  borderLeft: `3px solid ${isDel ? "#ff4d4f" : "#13c2c2"}`,
                  borderRadius: isCommentOnly ? 6 : 8,
                  padding: isCommentOnly ? "9px 12px" : "10px 14px",
                  fontSize: 13,
                  fontFamily: FONT,
                  lineHeight: 1.6,
                },
              },

              // Quote parent note
              parentNote &&
                React.createElement(
                  "div",
                  {
                    style: {
                      borderLeft: "2px solid #1890ff",
                      paddingLeft: 8,
                      marginBottom: 8,
                      color: "#8c8c8c",
                      fontSize: 12,
                      fontStyle: "italic",
                    },
                  },
                  renderRichText(parentNote.body, lawyers),
                ),

              // Updated: oldBody gạch đỏ
              isUpdated &&
                oldBody &&
                React.createElement("div", {
                  style: {
                    color: "#ff4d4f",
                    textDecoration: "line-through",
                    marginBottom: 4,
                    opacity: 0.8,
                  },
                  dangerouslySetInnerHTML: {
                    __html:
                      typeof oldBody === "string"
                        ? oldBody
                        : renderRichText(oldBody, lawyers),
                  },
                }),
              isUpdated &&
                oldBody &&
                body &&
                React.createElement(
                  "div",
                  { style: { color: "#8c8c8c", fontSize: 10, margin: "2px 0" } },
                  "↓ changed to ↓",
                ),

              // Nội dung hiện tại
              body
                ? React.createElement("div", {
                    style: {
                      color: isDel ? "#8c8c8c" : "#262626",
                      textDecoration: isDel ? "line-through" : "none",
                    },
                    dangerouslySetInnerHTML: {
                      __html:
                        typeof body === "string"
                          ? body
                          : renderRichText(body, lawyers),
                    },
                  })
                : isDel && oldBody
                  ? React.createElement("div", {
                      style: { color: "#8c8c8c", textDecoration: "line-through" },
                      dangerouslySetInnerHTML: {
                        __html:
                          typeof oldBody === "string"
                            ? oldBody
                            : renderRichText(oldBody, lawyers),
                      },
                    })
                  : React.createElement(
                      "span",
                      { style: { color: "#8c8c8c", fontStyle: "italic" } },
                      "(Note mentions someone)",
                    ),
            ),
          ),

        // ── Đã nhắc đến ai ─────────────────────────────────────────────────
        hasAssignees &&
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#8c8c8c",
                  marginBottom: 4,
                  fontFamily: FONT,
                },
              },
              "Mentioned:",
            ),
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  background: "#fafafa",
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #f0f0f0",
                  gap: 4,
                },
              },
              // Updated: old tags gạch đỏ → mũi tên → new tags
              isUpdated &&
                oldAssignees &&
                React.createElement(
                  React.Fragment,
                  null,
                  renderAssigneeTags(oldAssignees, true, false),
                  assignees?.length > 0 &&
                    React.createElement(
                      "span",
                      {
                        style: {
                          margin: "0 6px",
                          color: "#bfbfbf",
                          fontSize: 12,
                        },
                      },
                      "→",
                    ),
                ),
              // Current / deleted
              renderAssigneeTags(
                isDel && !isUpdated && oldAssignees ? oldAssignees : assignees,
                isDel && !isUpdated,
                isDel,
              ),
            ),
          ),

        // ── Tệp đính kèm ───────────────────────────────────────────────────
        hasFiles &&
          React.createElement(
            "div",
            { style: { marginTop: 4 } },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#8c8c8c",
                  marginBottom: 4,
                  fontFamily: FONT,
                  display: showFileLabel ? "block" : "none",
                },
              },
              "Attached file:",
            ),
            files.map((f) => {
              const att = Array.isArray(f.fileAttachment)
                ? f.fileAttachment[0]
                : f.fileAttachment;
              const rawName =
                f.title || att?.title || att?.filename || "(No name yet)";
              const fExt = att?.extname || "";
              const displayName = rawName
                .toLowerCase()
                .endsWith(fExt.toLowerCase())
                ? rawName
                : rawName + fExt;
              const eInfo = getExtInfo(fExt);
              const fUrl = getFullUrl(att?.url || att?.preview);
              const isFileDeleted = f.isDeleted || isDel;

              return React.createElement(
                "div",
                {
                  key: f.id,
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: isFileDeleted ? "#fff1f0" : "#f9f0ff",
                    border: isFileDeleted
                      ? "1px solid #ffa39e"
                      : "1px solid #d3adf7",
                    borderLeft: `3px solid ${isFileDeleted ? "#ff4d4f" : "#722ed1"}`,
                    borderRadius: 4,
                    padding: "4px 10px",
                    marginBottom: 4,
                    opacity: isFileDeleted ? 0.7 : 1,
                    cursor: fUrl && !isFileDeleted ? "pointer" : "default",
                  },
                  onClick:
                    fUrl && !isFileDeleted
                      ? () => window.open(fUrl, "_blank")
                      : undefined,
                },
                React.createElement(
                  "span",
                  { style: { fontSize: 12 } },
                  eInfo.icon,
                ),
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 11,
                      fontFamily: FONT,
                      fontWeight: 600,
                      color: isFileDeleted ? "#8c8c8c" : "#262626",
                      textDecoration: isFileDeleted ? "line-through" : "none",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  },
                  displayName,
                ),
                fUrl &&
                  !isFileDeleted &&
                  React.createElement(
                    "span",
                    {
                      style: { fontSize: 10, color: "#722ed1", fontWeight: 700 },
                    },
                    "DOWNLOAD",
                  ),
              );
            }),
          ),
      );
    };

    const renderTaskLog = (item, key) => {
      const a = item.data;
      const timeVal =
        a.action === "created"
          ? a.createdAt || a.changedAt || a.updatedAt
          : a.changedAt || a.updatedAt || a.createdAt;
      const fieldLabel = tF(a.fieldName || "data");
      const user = a.changedByName || "System";
      const actionLabel =
        a.action === "created"
          ? `created ${fieldLabel}`
          : a.action === "deleted"
            ? `deleted ${fieldLabel}`
            : `updated ${fieldLabel}`;
      const oldVal = a.oldValue ? formatActivityValue(a.oldValue) : "—";
      const newVal = a.newValue ? formatActivityValue(a.newValue) : "—";
      const showOldValue = a.action !== "created";
      const showArrow = a.action !== "created";

      return React.createElement(
        "div",
        {
          key,
          style: {
            margin: "12px 16px",
            background: "#fff",
            borderRadius: 8,
            border: "1px solid #e8e8e8",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
            overflow: "hidden",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              padding: "10px 14px",
              background: "#fafafa",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              gap: 10,
              alignItems: "center",
            },
          },
          React.createElement(Av, { name: user, size: 24 }),
          React.createElement(
            "div",
            { style: { flex: 1, minWidth: 0, fontFamily: FONT } },
            React.createElement(
              "span",
              { style: { fontSize: 13, fontWeight: 700, color: "#262626" } },
              user,
            ),
            React.createElement(
              "span",
              { style: { fontSize: 13, color: "#595959" } },
              ` ${actionLabel} at `,
            ),
            React.createElement(
              "span",
              { style: { fontSize: 12, color: "#8c8c8c", whiteSpace: "nowrap" } },
              fmt(timeVal, "full") || "—",
            ),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              fontSize: 12,
              fontFamily: FONT,
            },
          },
          React.createElement(
            "span",
            { style: { color: "#8c8c8c", fontWeight: 700 } },
            "Value:",
          ),
          showOldValue &&
            React.createElement(
              "span",
              {
                style: {
                  color: "#cf1322",
                  background: "#fff1f0",
                  padding: "2px 8px",
                  borderRadius: 4,
                  textDecoration: a.oldValue ? "line-through" : "none",
                  maxWidth: "100%",
                  overflowWrap: "anywhere",
                },
              },
              oldVal,
            ),
          showArrow &&
            React.createElement(
              "span",
              { style: { color: "#8c8c8c", fontWeight: 700 } },
              "→",
            ),
          React.createElement(
            "span",
            {
              style: {
                color: a.action === "deleted" ? "#8c8c8c" : "#237804",
                background: a.action === "deleted" ? "#f5f5f5" : "#f6ffed",
                padding: "2px 8px",
                borderRadius: 4,
                maxWidth: "100%",
                overflowWrap: "anywhere",
              },
            },
            newVal,
          ),
        ),
      );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // renderGroup — header card
    // ─────────────────────────────────────────────────────────────────────────
    const getGroupActionSummary = (group) => {
      const { items, action, collectionName, layoutType } = group;
      const logs = items.filter((it) => it._kind === "log").map((it) => it.data);
      const hasBodyLog = logs.some((a) =>
        ["body", "notes"].includes(a.fieldName),
      );
      const hasAssigneeLog = logs.some((a) =>
        ["assignees", "assignedLawyerId"].includes(a.fieldName),
      );
      const firstUnified = items.find((it) => it._kind === "unified");
      const fileCount = items.reduce(
        (sum, it) => sum + (it.files?.length || 0),
        0,
      );

      if (collectionName === "Note" && action === "updated") {
        if (hasBodyLog && hasAssigneeLog)
          return "S\u1eeda n\u1ed9i dung b\u00ecnh lu\u1eadn v\u00e0 c\u1eadp nh\u1eadt ng\u01b0\u1eddi \u0111\u01b0\u1ee3c nh\u1eafc";
        if (hasBodyLog) return "S\u1eeda n\u1ed9i dung b\u00ecnh lu\u1eadn";
        if (hasAssigneeLog)
          return "C\u1eadp nh\u1eadt ng\u01b0\u1eddi \u0111\u01b0\u1ee3c nh\u1eafc trong b\u00ecnh lu\u1eadn";
      }

      if (collectionName === "Note" && action === "deleted")
        return "X\u00f3a b\u00ecnh lu\u1eadn";

      if (firstUnified?.parentAuthor)
        return `Ph\u1ea3n h\u1ed3i b\u00ecnh lu\u1eadn c\u1ee7a ${firstUnified.parentAuthor}`;

      if (layoutType === "fileOnly")
        return fileCount > 1
          ? `T\u1ea3i l\u00ean ${fileCount} t\u1ec7p \u0111\u00ednh k\u00e8m`
          : "T\u1ea3i l\u00ean t\u1ec7p \u0111\u00ednh k\u00e8m";

      if (layoutType === "commentGroup")
        return "T\u1ea1o b\u00ecnh lu\u1eadn k\u00e8m th\u00f4ng tin li\u00ean quan";

      if (layoutType === "commentOnly") return "T\u1ea1o b\u00ecnh lu\u1eadn";

      return null;
    };

    const renderActionSummary = (text) => {
      if (!text) return null;
      return React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontFamily: FONT,
            color: "#595959",
            background: "#fafafa",
            border: "1px solid #f0f0f0",
            borderRadius: 6,
            padding: "6px 10px",
          },
        },
        React.createElement(
          "span",
          { style: { color: "#8c8c8c", fontWeight: 700 } },
          "H\u00e0nh \u0111\u1ed9ng:",
        ),
        React.createElement("span", null, text),
      );
    };

    const renderCompositeNoteLogGroup = (group) => {
      const noteLogs = group.items.filter(
        (it) =>
          it._kind === "log" &&
          it.data.collectionName === "Note" &&
          ["body", "notes", "assignees", "assignedLawyerId"].includes(
            it.data.fieldName,
          ),
      );
      if (noteLogs.length === 0) return null;

      const bodyLog = noteLogs.find((it) =>
        ["body", "notes"].includes(it.data.fieldName),
      );
      const assigneeLog = noteLogs.find((it) =>
        ["assignees", "assignedLawyerId"].includes(it.data.fieldName),
      );
      const source = bodyLog || assigneeLog || noteLogs[0];
      const isDel = group.isDeleted || source.data.action === "deleted";
      const isUpd = noteLogs.some((it) => it.data.action === "updated");
      const relatedNote = source.note;

      return React.createElement(
        "div",
        { key: "note-composite" },
        renderNoteContent({
          body: bodyLog
            ? isUpd
              ? bodyLog.data.newValue
              : isDel
                ? null
                : bodyLog.data.newValue
            : relatedNote?.body,
          oldBody: bodyLog
            ? isUpd
              ? bodyLog.data.oldValue
              : isDel
                ? bodyLog.data.oldValue
                : null
            : null,
          assignees: assigneeLog
            ? isUpd
              ? assigneeLog.data.newValue
              : isDel
                ? null
                : assigneeLog.data.newValue
            : null,
          oldAssignees: assigneeLog
            ? isUpd
              ? assigneeLog.data.oldValue
              : isDel
                ? assigneeLog.data.oldValue
                : null
            : null,
          parentNote: source.parentNote,
          parentAuthor: source.parentAuthor,
          isDel,
          isUpdated: isUpd,
          layoutType: "commentGroup",
        }),
      );
    };

    const renderGroup = (group, key) => {
      const {
        items,
        latestTime,
        action,
        isDeleted,
        layoutType = "logGroup",
      } = group;
      const firstIt = items[0];
      const filesInGroup = items.flatMap((it) => it.files || []);
      const isOnlyLayout =
        layoutType === "commentOnly" || layoutType === "fileOnly";
      const badge = getLayoutBadge(layoutType, filesInGroup);

      // Tên user hiển thị
      const user =
        firstIt._kind === "log"
          ? firstIt.data.changedByName || "System"
          : firstIt.note
            ? authorName(firstIt.note)
            : "System";

      const actionLabel = getLayoutActionLabel(
        layoutType,
        action,
        group.collectionName,
      );
      const actionSummary = getGroupActionSummary(group);
      const compositeNoteLog = renderCompositeNoteLogGroup(group);

      return React.createElement(
        "div",
        {
          key,
          style: {
            margin: "12px 16px",
            background: "#fff",
            borderRadius: isOnlyLayout ? 8 : 10,
            border:
              layoutType === "fileOnly"
                ? "1px solid #d3adf7"
                : "1px solid #f0f0f0",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
            overflow: "hidden",
          },
        },

        // Header
        React.createElement(
          "div",
          {
            style: {
              padding: "10px 16px",
              background: "#fafafa",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              alignItems: "center",
            },
          },
          React.createElement(Av, { name: user, size: 24 }),
          React.createElement(
            "div",
            {
              style: {
                marginLeft: 10,
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexWrap: "wrap",
                flex: 1,
                minWidth: 0,
              },
            },
            React.createElement(
              "span",
              {
                style: {
                  fontWeight: 600,
                  color: "#262626",
                  fontSize: 13,
                  fontFamily: FONT,
                },
              },
              user,
            ),
            React.createElement(
              "span",
              { style: { color: "#8c8c8c", fontSize: 12, fontFamily: FONT } },
              `${actionLabel} l\u00fac ${fmt(latestTime, "full") || "\u2014"}`,
            ),
            badge &&
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 11,
                    color: layoutType === "fileOnly" ? "#531dab" : "#006d75",
                    background: layoutType === "fileOnly" ? "#f9f0ff" : "#e6fffb",
                    border: `1px solid ${
                      layoutType === "fileOnly" ? "#d3adf7" : "#87e8de"
                    }`,
                    borderRadius: 4,
                    padding: "1px 6px",
                    marginLeft: 6,
                    fontFamily: FONT,
                    whiteSpace: "nowrap",
                  },
                },
                badge,
              ),
          ),
        ),

        // Body
        React.createElement(
          "div",
          {
            style: {
              padding: isOnlyLayout ? "10px 14px" : "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: isOnlyLayout ? 8 : 12,
            },
          },
          renderActionSummary(actionSummary),
          compositeNoteLog ||
            items.map((it, idx) => {
              if (it._kind === "log") return renderLogInner(it, idx, isDeleted);
              if (it._kind === "unified")
                return renderUnifiedInner(it, idx, isDeleted);
              return null;
            }),
        ),
      );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // renderLogInner — card updated / deleted
    // ─────────────────────────────────────────────────────────────────────────
    const renderLogInner = (item, idx, isDeletedGroup) => {
      const a = item.data;
      const isDel = isDeletedGroup || a.action === "deleted";
      const isUpd = a.action === "updated";
      const field = a.fieldName;

      // body / notes → dùng renderNoteContent để layout đồng bộ với unified
      if (field === "body" || field === "notes") {
        return React.createElement(
          "div",
          { key: idx, style: { marginTop: idx > 0 ? 12 : 0 } },
          renderNoteContent({
            body: isUpd ? a.newValue : isDel ? null : a.newValue,
            oldBody: isUpd ? a.oldValue : isDel ? a.oldValue : null,
            isDel,
            isUpdated: isUpd,
          }),
        );
      }

      // assignees / assignedLawyerId → dùng renderNoteContent
      if (field === "assignees" || field === "assignedLawyerId") {
        return React.createElement(
          "div",
          { key: idx, style: { marginTop: idx > 0 ? 12 : 0 } },
          renderNoteContent({
            assignees: isUpd ? a.newValue : isDel ? null : a.newValue,
            oldAssignees: isUpd ? a.oldValue : isDel ? a.oldValue : null,
            isDel,
            isUpdated: isUpd,
          }),
        );
      }

      // documents / title
      if (field === "documents" || field === "title") {
        return React.createElement(
          "div",
          { key: idx, style: { marginTop: idx > 0 ? 12 : 0 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontWeight: 600,
                color: "#8c8c8c",
                marginBottom: 4,
                fontFamily: FONT,
              },
            },
            "Attached file:",
          ),
          React.createElement(
            "div",
            {
              style: {
                background: isDel ? "#fff1f0" : "#f9f0ff",
                border: isDel ? "1px solid #ffa39e" : "1px solid #d3adf7",
                borderLeft: `3px solid ${isDel ? "#ff4d4f" : "#722ed1"}`,
                borderRadius: 4,
                padding: "8px 12px",
              },
            },
            isUpd &&
              a.oldValue &&
              React.createElement(
                "div",
                {
                  style: {
                    color: "#ff4d4f",
                    textDecoration: "line-through",
                    fontSize: 12,
                    marginBottom: 4,
                  },
                },
                a.oldValue,
              ),
            isUpd &&
              a.oldValue &&
              a.newValue &&
              React.createElement(
                "div",
                { style: { fontSize: 10, color: "#bfbfbf", margin: "2px 0" } },
                "↓",
              ),
            a.newValue &&
              React.createElement(
                "div",
                {
                  style: {
                    fontWeight: 600,
                    fontSize: 13,
                    color: isDel ? "#8c8c8c" : "#262626",
                    textDecoration: isDel ? "line-through" : "none",
                  },
                },
                a.newValue,
              ),
            isDel &&
              !isUpd &&
              a.oldValue &&
              React.createElement(
                "div",
                {
                  style: {
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#8c8c8c",
                    textDecoration: "line-through",
                  },
                },
                a.oldValue,
              ),
          ),
        );
      }

      // Default: status, priority, v.v.
      const label = (
        ACTIVITY_FIELD_LABELS?.[field] ||
        FIELD_LABEL?.[field] ||
        field ||
        ""
      ).toLowerCase();
      return React.createElement(
        "div",
        {
          key: idx,
          style: {
            borderTop: idx > 0 ? "1px dashed #f0f0f0" : "none",
            paddingTop: idx > 0 ? 12 : 0,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 13,
              color: "#595959",
              marginBottom: 4,
              fontFamily: FONT,
            },
          },
          isUpd ? `updated [${label}]` : `deleted [${label}]`,
        ),
        (a.oldValue || a.newValue) &&
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                background: isDel ? "#fff1f0" : "#fafafa",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #f0f0f0",
                opacity: isDel ? 0.7 : 1,
                marginTop: 4,
              },
            },
            a.oldValue &&
              React.createElement("div", {
                style: {
                  color: "#ff4d4f",
                  textDecoration: "line-through",
                  marginBottom: a.newValue ? 4 : 0,
                },
                dangerouslySetInnerHTML: {
                  __html: formatActivityValue(a.oldValue),
                },
              }),
            a.newValue &&
              React.createElement("div", {
                style: { color: isDel ? "#8c8c8c" : "#262626" },
                dangerouslySetInnerHTML: {
                  __html: formatActivityValue(a.newValue),
                },
              }),
          ),
      );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // renderUnifiedInner — card created/commented
    // ─────────────────────────────────────────────────────────────────────────
    const renderUnifiedInner = (item, idx, isDel) => {
      const {
        note,
        files,
        parentAuthor,
        parentNote,
        originalBody,
        originalAssignees,
        layoutType,
      } = item;

      return React.createElement(
        "div",
        {
          key: idx,
          style: {
            borderTop: idx > 0 ? "1px dashed #f0f0f0" : "none",
            paddingTop: idx > 0 ? 12 : 0,
            opacity: isDel ? 0.6 : 1,
          },
        },
        renderNoteContent({
          body: originalBody || note?.body,
          assignees: originalAssignees || note?.assignees,
          files,
          parentNote,
          parentAuthor,
          isDel,
          isUpdated: false, // unified item luôn là created/commented
          layoutType,
        }),
      );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Main render
    // ─────────────────────────────────────────────────────────────────────────
    const visibleItems = showAll ? items : items.slice(0, INITIAL_COUNT);
    const hasMore = items.length > INITIAL_COUNT;

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", height: "100%" } },

      // Header
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            background: "#fafafa",
            borderBottom: "1px solid #f0f0f0",
          },
        },
        React.createElement(
          Text,
          {
            style: {
              fontSize: 14,
              fontWeight: 700,
              fontFamily: FONT,
              color: "#262626",
            },
          },
          "Activity history",
        ),
        React.createElement(ReloadButton, {
          onReload: reloadData,
          loading,
          size: "small",
        }),
      ),

      // Content
      React.createElement(
        "div",
        { style: { flex: 1, overflowY: "auto" } },
        loading
          ? React.createElement(
              "div",
              { style: { textAlign: "center", padding: 30 } },
              React.createElement(Spin, { size: "large" }),
            )
          : items.length === 0
            ? React.createElement(
                "div",
                {
                  style: {
                    fontSize: 13,
                    color: "#bfbfbf",
                    textAlign: "center",
                    padding: "30px 0",
                    fontFamily: FONT,
                  },
                },
                "No activity yet",
              )
            : React.createElement(
                "div",
                null,
                ...visibleItems.map((item, i) => {
                  if (item._kind === "group")
                    return renderGroup(item, `act-${i}`);
                  if (item._kind === "taskLog")
                    return renderTaskLog(item, `act-task-${i}`);
                  return null;
                }),
                hasMore &&
                  React.createElement(
                    "div",
                    {
                      onClick: () => setShowAll((v) => !v),
                      style: {
                        margin: "16px",
                        textAlign: "center",
                        fontSize: 12,
                        fontFamily: FONT,
                        color: "#1890ff",
                        cursor: "pointer",
                        padding: "8px 0",
                        border: "1px dashed #91caff",
                        borderRadius: 6,
                        background: "#f0f8ff",
                        fontWeight: 600,
                      },
                      onMouseEnter: (e) =>
                        (e.currentTarget.style.background = "#d6ecff"),
                      onMouseLeave: (e) =>
                        (e.currentTarget.style.background = "#f0f8ff"),
                    },
                    showAll
                      ? `▲ Collapse (showing ${INITIAL_COUNT} of ${items.length})`
                      : `▼ View ${items.length - INITIAL_COUNT} more activities (${items.length} total)`,
                  ),
              ),
      ),
    );
  };

  const DetailModal = ({
    item,
    type,
    lawyers,
    allTasksInProject,
    tasksInService,
    services,
    projectManagerId,
    caseInfo,
    internalProjectInfo,
    onClose,
    onUpdate,
    currentUser,
    isManager = false,
    onStatusChange,
    isAssignedToThis = false,
    projectFolderId,
    onOpenAddSubModal,
    standaloneMode = false,
  }) => {
    if (!item) return null;
    const name = type === "subTask" ? item.subTaskName : item.title;
    const collectionName = type === "subTask" ? "SubTask" : "Task";
    const detailCaseId =
      extractId(item.caseId) ||
      extractId(item.projectId) ||
      getPathSegmentId(DEEP_LINK_CONFIG.KW_SOURCE) ||
      extractId(PROJECT_ID);
    const linkedServiceRecord = (services || []).find(
      (ps) => getProjectServiceTaskKey(ps) === String(item?.serviceId || ""),
    );
    // serviceName đôi khi trùng chữ với projectName (dịch vụ được đặt tên
    // giống hệt tên vụ việc) — dedupe trước khi join để tránh hiện 2 lần.
    const linkedCaseLabelParts = [
      caseInfo?.caseCode,
      caseInfo?.customerShortName,
      caseInfo?.projectName,
      linkedServiceRecord?.serviceName,
    ].filter(Boolean);
    const linkedCaseLabel = linkedCaseLabelParts
      .filter((part, idx) => linkedCaseLabelParts.indexOf(part) === idx)
      .join(" - ");
    const linkedCaseUrl = detailCaseId
      ? DEEP_LINK_CONFIG.buildCaseUrl(detailCaseId)
      : null;
    const detailProjectInternalId =
      extractId(item.projectInternalId) || extractId(internalProjectInfo?.id);
    const linkedInternalProjectLabel = [
      internalProjectInfo?.projectCode,
      internalProjectInfo?.projectName || internalProjectInfo?.description,
    ]
      .filter(Boolean)
      .join(" - ");
    const linkedInternalProjectUrl = detailProjectInternalId
      ? DEEP_LINK_CONFIG.buildInternalProjectUrl(detailProjectInternalId)
      : null;
    const st = STATUS_CFG[item.status] || STATUS_CFG.toDo;

    const serviceDeleted = isTaskServiceDeleted(item);
    const canEdit = !serviceDeleted && (isManager || isAssignedToThis);
    const canManage = !serviceDeleted && isManager;
    const canAccessFilesAndTimesheet = !serviceDeleted && (isManager || isAssignedToThis);

    const _pool = tasksInService || allTasksInProject || [];
    const parentTaskForSubtask =
      type === "subTask"
        ? (_pool || []).find(
            (task) => extractId(task.id) === extractId(item?.taskId),
          )
        : null;

    const legalStudyTaskContext = useMemo(() => {
      const recordId = extractId(item.id);
      const sourceTaskId = type === "subTask" ? extractId(item.taskId) : recordId;
      const parentTask =
        type === "subTask"
          ? (_pool || []).find((task) => extractId(task.id) === sourceTaskId)
          : item;
      return {
        collectionName,
        recordId,
        taskId: sourceTaskId,
        taskTitle: parentTask?.title || (type === "task" ? item.title : ""),
        subTaskId: type === "subTask" ? recordId : null,
        subTaskTitle: type === "subTask" ? item.subTaskName || item.title || "" : "",
        caseId: detailCaseId,
        caseCode: item.caseCode || item.project?.caseCode || "",
        projectInternalId: detailProjectInternalId,
      };
    }, [item, type, collectionName, _pool, detailCaseId, detailProjectInternalId]);

    const isLastTask = useMemo(() => {
      if (type !== "task" || !item.serviceId) return false;
      const serviceTasks = _pool.filter(
        (t) => extractId(t.serviceId) === extractId(item.serviceId),
      );
      if (serviceTasks.length === 0) return false;
      const maxId = Math.max(...serviceTasks.map((t) => extractId(t.id)));
      return extractId(item.id) === maxId;
    }, [item, _pool, type]);

    const [editName, setEditName] = useState(false);
    const [nameVal, setNameVal] = useState(name);
    const [estDurVal, setEstDurVal] = useState(item.estimatedDuration || "");
    const [openTimesheet, setOpenTimesheet] = useState(false);
    const [openActivity, setOpenActivity] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [editingFileId, setEditingFileId] = useState(null);
    const [editFileTitle, setEditFileTitle] = useState("");
    const [expandedPreviews, setExpandedPreviews] = useState({});
    const [cmtRefreshTrigger, setCmtRefreshTrigger] = useState(0);
    const [libraryMoveTarget, setLibraryMoveTarget] = useState(null);
    const [detailFolderLookup, setDetailFolderLookup] = useState({});
    const [expandedAttachmentFolders, setExpandedAttachmentFolders] = useState({});

    const handleSaveFileTitle = async (f) => {
      const newTitle = editFileTitle.trim();
      if (!newTitle) return;
      try {
        const now = new Date().toISOString();
        const userId = extractId(currentUser?.id);
        const attachment = getPrimaryAttachment(f);
        await apiReq(`documents:update?filterByTk=${f.id}`, "POST", {
          title: newTitle,
          name: newTitle,
          updatedAt: now,
          ...(userId ? { updatedById: userId } : {}),
        });
        if (attachment?.id) {
          await apiReq(`attachments:update?filterByTk=${attachment.id}`, "POST", {
            title: newTitle,
          }).catch(() => {});
        }
        // Update local item files state to reflect change
        if (onUpdate) {
          const updatedFiles = allFiles.map((file) =>
            file.id === f.id ? withSyncedDocumentFileTitle(file, newTitle) : file,
          );
          onUpdate({ ...item, _files: updatedFiles });
        }
        message.success("Document name updated");
      } catch (e) {
        message.error("Failed to update name");
      }
      setEditingFileId(null);
      setEditFileTitle("");
    };

    const allFiles = item._files || [];
    const attachmentFiles = allFiles.filter((file) => !file.isDeleted);

    useEffect(() => {
      let cancelled = false;
      fetchFolderLookupForFiles(attachmentFiles).then((lookup) => {
        if (!cancelled) setDetailFolderLookup(lookup);
      });
      return () => {
        cancelled = true;
      };
    }, [attachmentFiles.map((file) => `${file.id}:${file.folderId}`).join("|")]);

    const reloadAttachments = useCallback(async () => {
      const fresh = await fetchFiles(collectionName, extractId(item.id));
      setDetailFolderLookup(await fetchFolderLookupForFiles(fresh));
      onUpdate({ ...item, _files: fresh });
    }, [collectionName, item, onUpdate]);

    const attachmentTree = useMemo(() => {
      const rootFolderId = String(extractId(projectFolderId) || "");
      const folderMap = {};
      const looseFiles = [];

      attachmentFiles.forEach((file) => {
        const folderId = String(extractId(file.folderId) || "");
        const chain = getFolderIdChain(folderId, detailFolderLookup);
        let groupFolderId = "";
        if (folderId && chain.length > 0) {
          const rootIndex = rootFolderId ? chain.indexOf(rootFolderId) : -1;
          groupFolderId =
            rootIndex >= 0 ? chain[rootIndex + 1] || "" : chain[0] || folderId;
        }
        if (!groupFolderId || groupFolderId === rootFolderId) {
          looseFiles.push(file);
          return;
        }
        if (!folderMap[groupFolderId]) {
          const folder = detailFolderLookup[groupFolderId] || {};
          const descendantFolders = getDescendantFolderRecords(
            groupFolderId,
            detailFolderLookup,
          );
          folderMap[groupFolderId] = {
            id: groupFolderId,
            name: folder.name || folder.title || `Folder #${groupFolderId}`,
            record: {
              ...folder,
              id: extractId(folder?.id) || extractId(groupFolderId),
              _type: "folder",
              _foldersToMove: descendantFolders.length ? descendantFolders : [folder],
              _filesToMove: [],
            },
            files: [],
          };
        }
        folderMap[groupFolderId].files.push(file);
        folderMap[groupFolderId].record._filesToMove.push(file);
      });

      return {
        folders: Object.values(folderMap).sort((a, b) =>
          String(a.name).localeCompare(String(b.name), "vi"),
        ),
        documents: looseFiles,
      };
    }, [attachmentFiles, detailFolderLookup, projectFolderId]);

    const inpStyle = {
      border: "1px solid #e8e8e8",
      borderRadius: 4,
      padding: "6px 10px",
      fontSize: 12,
      fontFamily: FONT,
      outline: "none",
      color: "#262626",
      background: "#fff",
      width: "100%",
      minWidth: 0,
      height: 32,
      boxSizing: "border-box",
    };
    const inpReadOnly = {
      ...inpStyle,
      background: "#fafafa",
      color: "#8c8c8c",
      cursor: "not-allowed",
    };
    const detailGridStyle = {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      gap: 16,
      marginBottom: 16,
    };
    const detailFieldStyle = { minWidth: 0 };
    const detailSelectStyle = {
      width: "100%",
      minWidth: 0,
      fontFamily: FONT,
    };
    const detailControlShellStyle = (enabled = true, extra = {}) => ({
      width: "100%",
      minWidth: 0,
      height: 32,
      minHeight: 32,
      border: "1px solid #e8e8e8",
      borderRadius: 4,
      padding: "4px 10px",
      background: enabled ? "#fff" : "#fafafa",
      display: "flex",
      alignItems: "center",
      boxSizing: "border-box",
      fontSize: 12,
      fontFamily: FONT,
      color: enabled ? "#262626" : "#8c8c8c",
      ...extra,
    });
    const detailInlineInputStyle = (enabled = true) => ({
      flex: 1,
      minWidth: 0,
      height: "100%",
      border: "none",
      outline: "none",
      padding: 0,
      background: "transparent",
      fontSize: 12,
      fontFamily: FONT,
      color: enabled ? "#262626" : "#8c8c8c",
      cursor: enabled ? "text" : "not-allowed",
    });
    const detailTimeRangeStyle = {
      width: "100%",
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
      alignItems: "center",
      gap: 8,
    };

    const toLocalDT = (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const p = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    };

    const DR = ({ label, children }) =>
      React.createElement(
        "div",
        { style: { marginBottom: 12 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              color: "#8c8c8c",
              fontFamily: FONT,
              fontWeight: 600,
              marginBottom: 4,
            },
          },
          label,
        ),
        React.createElement("div", null, children),
      );

    const handleStatus = async (newSt) => {
      if (!canEdit) return;
      if (type === "task" && item.previousTaskId) {
        const prevTask = _pool.find(
          (t) => extractId(t.id) === extractId(item.previousTaskId),
        );
        if (
          prevTask &&
          prevTask.status !== "done" &&
          prevTask.status !== "cancelled"
        ) {
          if (!["cancelled", "blocked"].includes(newSt)) {
            message.warning(`Must complete "${prevTask.title}" first`);
            return;
          }
        }
      }
      const resolvedSt = resolveStatus(newSt, item);
      const url =
        type === "subTask"
          ? `subTasks:update?filterByTk=${extractId(item.id)}`
          : `tasks:update?filterByTk=${extractId(item.id)}`;
      const data =
        resolvedSt === "done"
          ? { status: resolvedSt, closedDate: new Date().toISOString() }
          : { status: resolvedSt, closedDate: null };

      onUpdate({ ...item, ...data });

      try {
        await apiReq(url, "POST", data);
        await logActivity(
          collectionName,
          extractId(item.id),
          "updated",
          "status",
          st.label,
          STATUS_CFG[resolvedSt]?.label,
          userName(currentUser),
        );
        if (onStatusChange)
          onStatusChange(extractId(item.id), resolvedSt, type, data);
        message.success(`Status: ${STATUS_CFG[resolvedSt]?.label}`);
      } catch (error) {
        message.error(
          "Backend error: Account has not been granted permission to edit this field!",
        );
        onUpdate({ ...item });
      }
    };

    const handleAssign = async (id, n, c) => {
      if (!canManage) return;
      const url =
        type === "subTask"
          ? `subTasks:update?filterByTk=${extractId(item.id)}`
          : `tasks:update?filterByTk=${extractId(item.id)}`;
      await apiReq(url, "POST", { lawyerId: id });
      onUpdate({ ...item, lawyerId: id, _ln: n, _lc: c || "#8c8c8c" });
    };

    const handlePriority = async (newPr) => {
      if (!canEdit) return;
      const url =
        type === "subTask"
          ? `subTasks:update?filterByTk=${extractId(item.id)}`
          : `tasks:update?filterByTk=${extractId(item.id)}`;
      onUpdate({ ...item, priority: newPr });
      try {
        await apiReq(url, "POST", { priority: newPr });
        message.success("Priority updated");
      } catch (e) {
        message.error("Backend error: No permission to update");
        onUpdate({ ...item });
      }
    };

    const saveName = async () => {
      if (!canEdit) {
        setEditName(false);
        return;
      }
      setEditName(false);
      if (!nameVal.trim() || nameVal === name) return;
      const url =
        type === "subTask"
          ? `subTasks:update?filterByTk=${extractId(item.id)}`
          : `tasks:update?filterByTk=${extractId(item.id)}`;
      const field = type === "subTask" ? "subTaskName" : "title";
      onUpdate({ ...item, [field]: nameVal.trim() });
      try {
        await apiReq(url, "POST", { [field]: nameVal.trim() });
        message.success("Task name updated");
      } catch (e) {
        message.error("Backend error: No permission to update");
        onUpdate({ ...item });
        setNameVal(name);
      }
    };

    const saveEstDur = async () => {
      if (!canEdit) return;
      const newVal = parseFloat(estDurVal) || null;
      const oldVal = parseFloat(item.estimatedDuration) || null;
      if (newVal === oldVal) return;
      onUpdate({ ...item, estimatedDuration: newVal });
      try {
        const url =
          type === "subTask"
            ? `subTasks:update?filterByTk=${extractId(item.id)}`
            : `tasks:update?filterByTk=${extractId(item.id)}`;
        await apiReq(url, "POST", { estimatedDuration: newVal });
        message.success("Estimated duration updated");
      } catch (e) {
        message.error("Backend error: No permission to update");
        onUpdate({ ...item });
        setEstDurVal(oldVal || "");
      }
    };

    const modalTitle = React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          paddingRight: 20,
        },
      },
      React.createElement(
        "span",
        { style: { fontSize: 18, marginRight: 4 } },
        type === "subTask" ? "↳" : "📋",
      ),
      canEdit && editName
        ? React.createElement("input", {
            value: nameVal,
            onChange: (e) => setNameVal(e.target.value),
            autoFocus: true,
            onKeyDown: (e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") setEditName(false);
            },
            onBlur: saveName,
            style: {
              fontSize: 16,
              fontWeight: 600,
              fontFamily: FONT,
              border: "none",
              borderBottom: "2px solid #1890ff",
              outline: "none",
              background: "transparent",
              padding: "2px 4px",
              minWidth: 300,
            },
          })
        : React.createElement(
            "span",
            {
              onClick: canEdit ? () => setEditName(true) : undefined,
              style: {
                fontSize: 16,
                fontWeight: 600,
                fontFamily: FONT,
                color: "#1a1a1a",
                cursor: canEdit ? "text" : "default",
              },
            },
            nameVal || name,
          ),
      type === "subTask" &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              color: "#6b7280",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 4,
              padding: "2px 6px",
            },
          },
          `Subtask of: ${
            parentTaskForSubtask?.title ||
            item._parentTaskTitle ||
            `Task #${extractId(item.taskId) || ""}`
          }`,
        ),

      item.isRequiredApproval &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 3,
              background: "#fff7e6",
              color: "#d46b08",
              border: "1px solid #ffd591",
            },
          },
          "Requires approval",
        ),
      item._od &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 3,
              background: "#fff1f0",
              color: "#cf1322",
              border: "1px solid #ffa39e",
            },
          },
          "Overdue",
        ),
    );

    const renderFileList = (
      files,
      emptyMsg = "No attached files yet.",
      hideTime = false,
    ) => {
      if (files.length === 0)
        return React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              color: "#bfbfbf",
              fontStyle: "italic",
              fontFamily: FONT,
            },
          },
          emptyMsg,
        );
      return React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
          },
        },
        ...files.map((f) => {
          const att = getPrimaryAttachment(f);
          let originalName = att?.filename || "File";
          let ext = att?.extname
            ? att.extname.startsWith(".")
              ? att.extname.toLowerCase()
              : "." + att.extname.toLowerCase()
            : "";
          if (ext && originalName.toLowerCase().endsWith(ext))
            originalName = originalName.slice(0, -ext.length);
          const finalFileName = originalName + ext;
          const displayTitle = f.title || f.name || att?.title || finalFileName;
          const isEditingThisFile = editingFileId === f.id;
          const fullUrl = getFullUrl(att?.url || att?.preview);
          const linkedLegalStudy = isLinkedToLegalStudy(f);
          const movedBadge = getMovedDestinationBadge(f, detailFolderLookup);
          const fileActionItems = [
            {
              key: "preview",
              icon: TASK_FILE_ACTION_ICONS.preview,
              label: "Preview",
              disabled: !fullUrl,
            },
            {
              key: "download",
              icon: TASK_FILE_ACTION_ICONS.download,
              label: "Download",
              disabled: !fullUrl,
            },
            canEdit && !detailProjectInternalId && !linkedLegalStudy && {
              key: "move_legal_study",
              icon: TASK_FILE_ACTION_ICONS.moveLegalStudy,
              label: "Move to Reference",
            },
            // Replaces the old "Move to Legal Reference" action — moving
            // into the current case's own Document tree is what's actually
            // used; the org-wide Legal Reference library move stays
            // available only via the folder-level action, not per-file.
            // Kept visible even after a prior move so files can be
            // re-moved to a different folder.
            canEdit && !detailProjectInternalId && {
              key: "move_to_document",
              icon: TASK_FILE_ACTION_ICONS.folder,
              label: "Move to Case's Document",
            },
            // ProjectInternal tasks have no Case/Reference — only offer
            // moving up to the company-level Knowledge library instead.
            canEdit && !!detailProjectInternalId && {
              key: "move_to_library",
              icon: TASK_FILE_ACTION_ICONS.moveLegalReference,
              label: "Move to Library",
            },
            canEdit && {
              key: "edit",
              icon: TASK_FILE_ACTION_ICONS.edit,
              label: "Rename",
            },
          ].filter(Boolean);
          const handleFileActionClick = ({ key, domEvent }) => {
            domEvent?.stopPropagation?.();
            if (key === "preview") {
              if (fullUrl) setPreviewDoc(f);
              return;
            }
            if (key === "download") {
              if (fullUrl) window.open(fullUrl, "_blank");
              return;
            }
            if (key === "move_legal_study") {
              setLibraryMoveTarget({
                record: f,
                destinationType: LIBRARY_DESTINATION.LEGAL_STUDY,
              });
              return;
            }
            if (key === "move_to_document") {
              setLibraryMoveTarget({
                record: f,
                destinationType: LIBRARY_DESTINATION.CASE_DOCUMENT,
              });
              return;
            }
            if (key === "move_to_library") {
              setLibraryMoveTarget({
                record: f,
                destinationType: LIBRARY_DESTINATION.KNOWLEDGE,
              });
              return;
            }
            if (key === "edit") {
              setEditingFileId(f.id);
              setEditFileTitle(displayTitle);
            }
          };
          return React.createElement(
            "div",
            {
              key: f.id,
              onClick: isEditingThisFile
                ? null
                : fullUrl
                  ? () => setPreviewDoc(f)
                  : undefined,
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "10px 12px",
                background: "#fafafa",
                border: "1px solid #e8e8e8",
                borderRadius: 6,
                cursor: fullUrl ? "pointer" : "default",
                transition: "all 0.2s",
              },
              onMouseEnter: (e) =>
                (e.currentTarget.style.borderColor = "#1890ff"),
              onMouseLeave: (e) =>
                (e.currentTarget.style.borderColor = "#e8e8e8"),
            },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8 } },
              getFileIcon(ext),
              React.createElement(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                isEditingThisFile
                  ? React.createElement("input", {
                      autoFocus: true,
                      value: editFileTitle,
                      onChange: (e) => setEditFileTitle(e.target.value),
                      onClick: (e) => e.stopPropagation(),
                      onKeyDown: (e) => {
                        if (e.key === "Enter") handleSaveFileTitle(f);
                        if (e.key === "Escape") setEditingFileId(null);
                      },
                      style: {
                        width: "100%",
                        fontSize: 12,
                        fontFamily: FONT,
                        border: "1px solid #1890ff",
                        borderRadius: 4,
                        padding: "2px 6px",
                        outline: "none",
                      },
                    })
                  : React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#096dd9",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        },
                      },
                      displayTitle,
                    ),
              ),
              !isEditingThisFile &&
                fileActionItems.length > 0 &&
                React.createElement(
                  Dropdown,
                  {
                    trigger: ["click"],
                    placement: "bottomRight",
                    menu: { items: fileActionItems, onClick: handleFileActionClick },
                  },
                  React.createElement(
                    Button,
                    {
                      type: "text",
                      size: "small",
                      onClick: (event) => event.stopPropagation(),
                      style: {
                        width: 26,
                        height: 26,
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6B7280",
                      },
                    },
                    TASK_FILE_ACTION_ICONS.more,
                  ),
                ),
            ),
            movedBadge &&
              React.createElement(
                "div",
                { style: { alignSelf: "flex-start" } },
                renderMovedBadge(movedBadge),
              ),
            f.note &&
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 11,
                    color: "#262626",
                    marginTop: 4,
                    padding: "6px 10px",
                    background: "#fff",
                    borderRadius: 4,
                    border: "1px solid #f0f0f0",
                  },
                },
                React.createElement(
                  "span",
                  {
                    style: { fontWeight: 700, color: "#8c8c8c", marginRight: 6 },
                  },
                  "Note content:",
                ),
                f.note,
              ),
          );
        }),
      );
    };

    const renderScrollableFileList = (files, emptyMsg) =>
      React.createElement(
        "div",
        {
          style: {
            maxHeight: files.length > 5 ? 360 : "none",
            overflowY: files.length > 5 ? "auto" : "visible",
            paddingRight: files.length > 5 ? 4 : 0,
          },
        },
        renderFileList(files, emptyMsg, true),
      );

    const renderAttachmentSection = () => {
      const folderGroups = attachmentTree.folders || [];
      const documentFiles = attachmentTree.documents || [];
      return React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          {
            style: {
              fontSize: 14,
              fontWeight: 600,
              color: "#262626",
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            },
          },
          React.createElement(
            "span",
            null,
            "Attachments ",
            React.createElement(
              "span",
              { style: { color: "#6B7280", fontWeight: 500 } },
              `(${folderGroups.length} folders - ${documentFiles.length} documents)`,
            ),
          ),
          React.createElement(ReloadButton, { onReload: reloadAttachments, size: "small" }),
        ),
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 14 } },
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 8,
                },
              },
              "Folders",
            ),
            folderGroups.length === 0
              ? React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 12,
                      color: "#bfbfbf",
                      fontStyle: "italic",
                      fontFamily: FONT,
                    },
                  },
                  "No folders.",
                )
              : React.createElement(
                  "div",
                  { style: { display: "flex", flexDirection: "column", gap: 8 } },
                  ...folderGroups.map((group) => {
                    const expanded = !!expandedAttachmentFolders[group.id];
                    const linkedLegalStudy = isLinkedToLegalStudy(group.record);
                    const linkedLegalReference = isLinkedToLegalReference(group.record);
                    const folderActionItems = [
                      canEdit && !linkedLegalStudy && {
                        key: "move_legal_study",
                        icon: TASK_FILE_ACTION_ICONS.moveLegalStudy,
                        label: "Move folder to Legal Study",
                      },
                      canEdit && !linkedLegalReference && {
                        key: "move_legal_reference",
                        icon: TASK_FILE_ACTION_ICONS.moveLegalReference,
                        label: "Move folder to Legal Reference",
                      },
                    ].filter(Boolean);
                    return React.createElement(
                      "div",
                      {
                        key: group.id,
                        style: {
                          border: "1px solid #E5E7EB",
                          borderRadius: 8,
                          background: "#FFFFFF",
                          overflow: "hidden",
                        },
                      },
                      React.createElement(
                        "div",
                        {
                          onClick: () =>
                            setExpandedAttachmentFolders((prev) => ({
                              ...prev,
                              [group.id]: !prev[group.id],
                            })),
                          style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            cursor: "pointer",
                            background: "#F8FAFC",
                            borderBottom: expanded ? "1px solid #E5E7EB" : "none",
                            userSelect: "none",
                          },
                        },
                        React.createElement(
                          "span",
                          {
                            style: {
                              width: 14,
                              color: "#6B7280",
                              fontSize: 11,
                              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "transform 0.15s",
                              display: "inline-flex",
                              justifyContent: "center",
                              flexShrink: 0,
                            },
                          },
                          "▶",
                        ),
                        React.createElement(
                          "span",
                          {
                            style: {
                              color: "#185FA5",
                              display: "inline-flex",
                              alignItems: "center",
                              flexShrink: 0,
                            },
                          },
                          TASK_FILE_ACTION_ICONS.folder,
                        ),
                        React.createElement(
                          "span",
                          {
                            title: group.name,
                            style: {
                              flex: 1,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#111827",
                            },
                          },
                          group.name,
                        ),
                        React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 11,
                              color: "#4B5563",
                              background: "#F3F4F6",
                              border: "1px solid #E5E7EB",
                              borderRadius: 999,
                              padding: "1px 7px",
                              flexShrink: 0,
                            },
                          },
                          `${group.files.length} documents`,
                        ),
                        folderActionItems.length > 0 &&
                          React.createElement(
                            Dropdown,
                            {
                              trigger: ["click"],
                              placement: "bottomRight",
                              menu: {
                                items: folderActionItems,
                                onClick: ({ key, domEvent }) => {
                                  domEvent?.stopPropagation?.();
                                  setLibraryMoveTarget({
                                    record: group.record,
                                    destinationType:
                                      key === "move_legal_reference"
                                        ? LIBRARY_DESTINATION.LEGAL_REFERENCE
                                        : LIBRARY_DESTINATION.LEGAL_STUDY,
                                  });
                                },
                              },
                            },
                            React.createElement(
                              Button,
                              {
                                type: "text",
                                size: "small",
                                onClick: (event) => event.stopPropagation(),
                                style: {
                                  width: 26,
                                  height: 26,
                                  padding: 0,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#6B7280",
                                },
                              },
                              TASK_FILE_ACTION_ICONS.more,
                            ),
                          ),
                      ),
                      expanded &&
                        React.createElement(
                          "div",
                          { style: { padding: 8 } },
                          renderScrollableFileList(
                            group.files,
                            "This folder has no documents.",
                          ),
                        ),
                    );
                  }),
                ),
          ),
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 8,
                },
              },
              "Documents",
            ),
            renderScrollableFileList(documentFiles, "No attached documents."),
          ),
        ),
      );
    };
    const headerBar = (txt, extra = null) =>
      React.createElement(
        "div",
        {
          style: {
            padding: "12px 24px",
            borderBottom: "1px solid #f0f0f0",
            background: "#fafafa",
            fontSize: 14,
            fontWeight: 600,
            color: "#262626",
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        txt,
        extra,
      );
    if (standaloneMode) {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              height: "100vh",
              background: "#fff",
              fontFamily: FONT,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                padding: "12px 24px 8px",
                borderBottom: "1px solid #e8e8e8",
                background: "#fff",
                flexShrink: 0,
              },
            },
            modalTitle,
          ),
          // ACTION BAR
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                gap: 10,
                padding: "12px 24px",
                borderBottom: "1px solid #f0f0f0",
                background: "#fff",
                flexShrink: 0,
              },
            },
            canAccessFilesAndTimesheet &&
              React.createElement(
              "div",
              {
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 16px",
                  background: "#e6f4ff",
                  color: "#096dd9",
                  border: "1px solid #91caff",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "0.2s",
                },
                onClick: () => setOpenTimesheet(true),
                onMouseEnter: (e) =>
                  (e.currentTarget.style.background = "#bae0ff"),
                onMouseLeave: (e) =>
                  (e.currentTarget.style.background = "#e6f4ff"),
              },
              "Log Timesheet",
            ),
            isManager &&
              React.createElement(
                "div",
                {
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 16px",
                    background: "#f5f5f5",
                    color: "#595959",
                    border: "1px solid #d9d9d9",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "0.2s",
                  },
                  onClick: () => setOpenActivity(true),
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.background = "#e8e8e8"),
                  onMouseLeave: (e) =>
                    (e.currentTarget.style.background = "#f5f5f5"),
                },
                "Activity history",
              ),
            type === "task" &&
              canEdit &&
              React.createElement(
                "div",
                {
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 16px",
                    background: "#f6ffed",
                    color: "#389e0d",
                    border: "1px solid #b7eb8f",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "0.2s",
                  },
                  onClick: () => onOpenAddSubModal?.(item.id),
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.background = "#d9f7be"),
                  onMouseLeave: (e) =>
                    (e.currentTarget.style.background = "#f6ffed"),
                },
                "＋ Create subtask",
              ),
            isLastTask &&
              canManage &&
              React.createElement(
                "div",
                {
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 16px",
                    background: "#fff7e6",
                    color: "#d46b08",
                    border: "1px solid #ffd591",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "0.2s",
                  },
                  onClick: () => ctx.openView({ uid: "" }),
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.background = "#ffe7ba"),
                  onMouseLeave: (e) =>
                    (e.currentTarget.style.background = "#fff7e6"),
                },
                "💳 Create payment request",
              ),
          ),

          // 🌟 CHIA GRID THEO TỶ LỆ 4 - 6
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "minmax(340px, 3fr) minmax(0, 7fr)",
                flex: 1,
                overflow: "hidden",
                minWidth: 0,
              },
            },
            // ── CỘT TRÁI (Thông tin chung - 4 Phần) ──
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  borderRight: "1px solid #f0f0f0",
                  overflow: "hidden",
                  minWidth: 0,
                },
              },
              headerBar("General information"),
              React.createElement(
                "div",
                { style: { padding: "16px 18px", overflowY: "auto", flex: 1 } },
                React.createElement(
                  "div",
                  {
                    style: {
                      background: "#fafafa",
                      padding: 16,
                      borderRadius: 8,
                      border: "1px solid #f0f0f0",
                      marginBottom: 24,
                    },
                  },

                  // 🌟 Vụ việc liên kết: caseCode - tên KH (shortName) - projectName - serviceName
                  linkedCaseLabel &&
                    React.createElement(
                      "div",
                      {
                        style: {
                          marginBottom: 16,
                          paddingBottom: 12,
                          borderBottom: "1px dashed #e5e7eb",
                        },
                      },
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            color: "#8c8c8c",
                            fontFamily: FONT,
                            fontWeight: 600,
                            marginBottom: 4,
                          },
                        },
                        "Linked case",
                      ),
                      React.createElement(
                        "span",
                        {
                          onClick: linkedCaseUrl
                            ? () => window.open(linkedCaseUrl, "_blank")
                            : undefined,
                          title: linkedCaseUrl ? "View case details" : undefined,
                          style: {
                            fontSize: 13,
                            fontWeight: 600,
                            color: linkedCaseUrl ? "#1890ff" : "#262626",
                            cursor: linkedCaseUrl ? "pointer" : "default",
                          },
                          onMouseEnter: linkedCaseUrl
                            ? (e) => (e.currentTarget.style.textDecoration = "underline")
                            : undefined,
                          onMouseLeave: linkedCaseUrl
                            ? (e) => (e.currentTarget.style.textDecoration = "none")
                            : undefined,
                        },
                        linkedCaseLabel,
                      ),
                    ),

                  // 🌟 Dự án nội bộ liên kết: projectCode - projectName
                  linkedInternalProjectLabel &&
                    React.createElement(
                      "div",
                      {
                        style: {
                          marginBottom: 16,
                          paddingBottom: 12,
                          borderBottom: "1px dashed #e5e7eb",
                        },
                      },
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            color: "#8c8c8c",
                            fontFamily: FONT,
                            fontWeight: 600,
                            marginBottom: 4,
                          },
                        },
                        "Linked internal work",
                      ),
                      React.createElement(
                        "span",
                        {
                          onClick: linkedInternalProjectUrl
                            ? () => window.open(linkedInternalProjectUrl, "_blank")
                            : undefined,
                          title: linkedInternalProjectUrl
                            ? "View internal project"
                            : undefined,
                          style: {
                            fontSize: 13,
                            fontWeight: 600,
                            color: linkedInternalProjectUrl ? "#1890ff" : "#262626",
                            cursor: linkedInternalProjectUrl ? "pointer" : "default",
                          },
                          onMouseEnter: linkedInternalProjectUrl
                            ? (e) => (e.currentTarget.style.textDecoration = "underline")
                            : undefined,
                          onMouseLeave: linkedInternalProjectUrl
                            ? (e) => (e.currentTarget.style.textDecoration = "none")
                            : undefined,
                        },
                        linkedInternalProjectLabel,
                      ),
                    ),

                  // 🌟 SẮP XẾP LẠI THÀNH 2 CỘT TRÁNH BỊ ÉP NHỎ
                  React.createElement(
                    "div",
                    {
                      style: detailGridStyle,
                    },
                    React.createElement(
                      "div",
                      { style: detailFieldStyle },
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            color: "#8c8c8c",
                            fontFamily: FONT,
                            fontWeight: 600,
                            marginBottom: 4,
                          },
                        },
                        "Status",
                      ),
                      React.createElement(Select, {
                        value: item.status,
                        onChange: canEdit ? handleStatus : undefined,
                        disabled: !canEdit,
                        style: detailSelectStyle,
                        options: getStatusKeys(item.isRequiredApproval).map(
                          (k) => ({
                            label: React.createElement(
                              "div",
                              {
                                style: {
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                },
                              },
                              React.createElement("div", {
                                style: {
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  background: STATUS_CFG[k].color,
                                },
                              }),
                              STATUS_CFG[k].label,
                            ),
                            value: k,
                          }),
                        ),
                      }),
                    ),
                    React.createElement(
                      "div",
                      { style: detailFieldStyle },
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            color: "#8c8c8c",
                            fontFamily: FONT,
                            fontWeight: 600,
                            marginBottom: 4,
                          },
                        },
                        "Priority",
                      ),
                      React.createElement(Select, {
                        value: item.priority || "medium",
                        onChange: canEdit ? handlePriority : undefined,
                        disabled: !canEdit,
                        style: detailSelectStyle,
                        options: Object.entries(PRIORITY_CFG).map(([k, v]) => ({
                          label: `${v.label}`,
                          value: k,
                        })),
                      }),
                    ),
                  ),

                  React.createElement(
                    "div",
                    {
                      style: detailGridStyle,
                    },
                    React.createElement(
                      "div",
                      { style: detailFieldStyle },
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            color: "#8c8c8c",
                            fontFamily: FONT,
                            fontWeight: 600,
                            marginBottom: 4,
                          },
                        },
                        "Estimated duration",
                      ),
                      React.createElement(
                        "div",
                        {
                          style: detailControlShellStyle(canEdit),
                        },
                        React.createElement("input", {
                          type: "number",
                          step: "0.5",
                          min: "0",
                          value: estDurVal,
                          onChange: canEdit
                            ? (e) => setEstDurVal(e.target.value)
                            : undefined,
                          readOnly: !canEdit,
                          placeholder: "Number of hours...",
                          style: detailInlineInputStyle(canEdit),
                          onBlur: canEdit ? saveEstDur : undefined,
                        }),
                        React.createElement(
                          "span",
                          {
                            style: {
                              color: "#8c8c8c",
                              fontSize: 12,
                              flexShrink: 0,
                              lineHeight: "20px",
                            },
                          },
                          "hours",
                        ),
                      ),
                    ),
                    React.createElement(
                      "div",
                      { style: detailFieldStyle },
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            color: "#8c8c8c",
                            fontFamily: FONT,
                            fontWeight: 600,
                            marginBottom: 4,
                          },
                        },
                        "Assignee",
                      ),
                      React.createElement(
                        "div",
                        {
                          style: detailControlShellStyle(canManage),
                        },
                        React.createElement(LawyerPicker, {
                          lawyers,
                          value: extractId(item.lawyerId),
                          size: 20,
                          readOnly: !canManage,
                          onChange: handleAssign,
                        }),
                      ),
                    ),
                  ),

                  // Yêu cầu xét duyệt | Người xét duyệt
                  React.createElement(
                    "div",
                    {
                      style: detailGridStyle,
                    },
                    React.createElement(
                      "div",
                      { style: detailFieldStyle },
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            color: "#8c8c8c",
                            fontFamily: FONT,
                            fontWeight: 600,
                            marginBottom: 4,
                          },
                        },
                        "Requires approval",
                      ),
                      React.createElement(
                        "label",
                        {
                          style: detailControlShellStyle(canManage, {
                            gap: 8,
                            cursor: canManage ? "pointer" : "default",
                            color: "#595959",
                            border: "1px solid #f0f0f0",
                            background: item.isRequiredApproval
                              ? "#fff7e6"
                              : "#fafafa",
                          }),
                        },
                        React.createElement("input", {
                          type: "checkbox",
                          checked: !!item.isRequiredApproval,
                          disabled: !canManage,
                          onChange: canManage
                            ? async (e) => {
                                const newVal = e.target.checked;
                                const payload = { isRequiredApproval: newVal };
                                if (!newVal) payload.approvedById = null; // 🌟 TỰ ĐỘNG XÓA NGƯỜI DUYỆT KHI TOGGLE TẮT

                                const url =
                                  type === "subTask"
                                    ? `subTasks:update?filterByTk=${extractId(item.id)}`
                                    : `tasks:update?filterByTk=${extractId(item.id)}`;
                                await apiReq(url, "POST", payload);
                                onUpdate({ ...item, ...payload });
                              }
                            : undefined,
                          style: {
                            width: 14,
                            height: 14,
                            cursor: canManage ? "pointer" : "not-allowed",
                            accentColor: "#d46b08",
                          },
                        }),
                        React.createElement(
                          "span",
                          {
                            style: {
                              color: item.isRequiredApproval
                                ? "#d46b08"
                                : "#8c8c8c",
                              fontWeight: item.isRequiredApproval ? 600 : 400,
                            },
                          },
                          item.isRequiredApproval
                            ? "Requires approval"
                            : "Not required",
                        ),
                      ),
                    ),
                    React.createElement(
                      "div",
                      { style: detailFieldStyle },
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            color: "#8c8c8c",
                            fontFamily: FONT,
                            fontWeight: 600,
                            marginBottom: 4,
                          },
                        },
                        "Approver",
                      ),
                      React.createElement(
                        "div",
                        {
                          style: detailControlShellStyle(
                            canManage && item.isRequiredApproval,
                            {
                            opacity: item.isRequiredApproval ? 1 : 0.45,
                            },
                          ),
                        },
                        React.createElement(LawyerPicker, {
                          lawyers,
                          value: extractId(item.approvedById),
                          size: 20,
                          readOnly: !canManage || !item.isRequiredApproval,
                          onChange:
                            canManage && item.isRequiredApproval
                              ? async (id, n, c) => {
                                  const url =
                                    type === "subTask"
                                      ? `subTasks:update?filterByTk=${extractId(item.id)}`
                                      : `tasks:update?filterByTk=${extractId(item.id)}`;
                                  await apiReq(url, "POST", { approvedById: id });
                                  onUpdate({ ...item, approvedById: id });
                                }
                              : undefined,
                        }),
                        !item.approvedById &&
                          item.isRequiredApproval &&
                          React.createElement(
                            "span",
                            {
                              style: {
                                fontSize: 12,
                                fontFamily: FONT,
                                color: "#bfbfbf",
                                marginLeft: 4,
                              },
                            },
                            "Select...",
                          ),
                      ),
                    ),
                  ),

                  // Thời gian thực hiện (chiếm 1 hàng đầy đủ)
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 12,
                          color: "#8c8c8c",
                          fontFamily: FONT,
                          fontWeight: 600,
                          marginBottom: 4,
                        },
                      },
                      "Time worked",
                    ),
                    React.createElement(
                      "div",
                      {
                        style: detailTimeRangeStyle,
                      },
                      React.createElement("input", {
                        type: "datetime-local",
                        defaultValue: toLocalDT(
                          type === "subTask" ? item.date : item.startDate,
                        ),
                        readOnly: !canEdit,
                        onBlur: canEdit
                          ? async (e) => {
                              const field =
                                type === "subTask" ? "date" : "startDate";
                              const val = e.target.value
                                ? new Date(e.target.value).toISOString()
                                : null;
                              onUpdate({ ...item, [field]: val });
                              const apiUrl =
                                type === "subTask"
                                  ? `subTasks:update?filterByTk=${extractId(item.id)}`
                                  : `tasks:update?filterByTk=${extractId(item.id)}`;
                              try {
                                await apiReq(apiUrl, "POST", { [field]: val });
                                message.success("Time updated");
                              } catch (e) {
                                message.error("Error: Unable to update");
                              }
                            }
                          : undefined,
                    style: {
                      ...(canEdit ? inpStyle : inpReadOnly),
                      width: "100%",
                      minWidth: 0,
                    },
                      }),
                      React.createElement(
                        "span",
                        { style: { color: "#bfbfbf" } },
                        "→",
                      ),
                      React.createElement("input", {
                        type: "datetime-local",
                        defaultValue: toLocalDT(
                          type === "subTask" ? item.deadline : item.dueDate,
                        ),
                        readOnly: !canEdit,
                        onBlur: canEdit
                          ? async (e) => {
                              const field =
                                type === "subTask" ? "deadline" : "dueDate";
                              const val = e.target.value
                                ? new Date(e.target.value).toISOString()
                                : null;
                              onUpdate({ ...item, [field]: val });
                              const apiUrl =
                                type === "subTask"
                                  ? `subTasks:update?filterByTk=${extractId(item.id)}`
                                  : `tasks:update?filterByTk=${extractId(item.id)}`;
                              try {
                                await apiReq(apiUrl, "POST", { [field]: val });
                                message.success("Time updated");
                              } catch (e) {
                                message.error("Error: Unable to update");
                              }
                            }
                          : undefined,
                    style: {
                      ...(canEdit ? inpStyle : inpReadOnly),
                      width: "100%",
                      minWidth: 0,
                    },
                      }),
                    ),
                  ),
                ),

                // NỘI DUNG CHÍNH
                React.createElement(
                  "div",
                  {
                    style: { display: "flex", flexDirection: "column", gap: 24 },
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
                          color: "#262626",
                          marginBottom: 12,
                        },
                      },
                      "Work description",
                    ),
                    React.createElement(DescriptionInlineEditor, {
                      item,
                      type,
                      onUpdate,
                      readOnly: !canEdit,
                    }),
                  ),
                  type === "task" &&
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#262626",
                            marginBottom: 12,
                          },
                        },
                        "Dependent task (Pending Issue)",
                      ),
                      React.createElement(TaskPicker, {
                        allTasks: _pool,
                        currentTaskId: extractId(item.id),
                        value: extractId(item.previousTaskId),
                        services,
                        readOnly: !canManage,
                        onChange: canManage
                          ? async (newPrevId) => {
                              const found = _pool.find(
                                (t) => extractId(t.id) === extractId(newPrevId),
                              );
                              const newStatus = newPrevId
                                ? found?.status !== "done" &&
                                  found?.status !== "cancelled"
                                  ? "blocked"
                                  : item.status
                                : item.status === "blocked"
                                  ? "toDo"
                                  : item.status;
                              const payload = {
                                previousTaskId: newPrevId || null,
                                status: newStatus,
                              };
                              await apiReq(
                                type === "subTask"
                                  ? `subTasks:update?filterByTk=${extractId(item.id)}`
                                  : `tasks:update?filterByTk=${extractId(item.id)}`,
                                "POST",
                                payload,
                              );
                              onUpdate({ ...item, ...payload });
                            }
                          : () => {},
                      }),
                    ),
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#262626",
                          marginBottom: 12,
                        },
                      },
                      "Next step",
                    ),
                    React.createElement(NextStepInlineEditor, {
                      item,
                      type,
                      onUpdate,
                      currentUser,
                      readOnly: !canEdit,
                    }),
                  ),
                  renderAttachmentSection(),
                ),
              ),
            ),
            // ── CỘT PHẢI (Bình luận - 6 Phần) ──
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  background: "#fff",
                  overflow: "hidden",
                  minWidth: 0,
                },
              },
              headerBar(
                "Comments & Reports",
                React.createElement(ReloadButton, {
                  onReload: () => setCmtRefreshTrigger((v) => v + 1),
                  size: "small",
                }),
              ),
              React.createElement(
                "div",
                { style: { flex: 1, overflow: "hidden" } },
                React.createElement(UnifiedNoteThread, {
                  collectionName,
                  recordId: extractId(item.id),
                  currentUser,
                  lawyers,
                  canEdit: !serviceDeleted,
                  projectFolderId,
                  refreshTrigger: cmtRefreshTrigger,
                  caseId: detailCaseId,
                  taskContext: legalStudyTaskContext,
                }),
              ),
            ),
          ),
        ),
        React.createElement(
          Drawer,
          {
            title: "Manage Timesheet",
            placement: "right",
            width: 550,
            onClose: () => setOpenTimesheet(false),
            open: openTimesheet,
            bodyStyle: { padding: "16px", background: "#f5f5f5" },
          },
          React.createElement(TimesheetTab, {
            item,
            type,
            lawyers,
            currentUser,
            projectManagerId,
            isManager: canManage,
            canAccess: canAccessFilesAndTimesheet,
          }),
        ),
        React.createElement(
          Drawer,
          {
            title: "Activity history",
            placement: "right",
            width: 700,
            onClose: () => setOpenActivity(false),
            open: openActivity,
            bodyStyle: { padding: "0" },
          },
          React.createElement(ActivityTab, {
            collectionName,
            recordId: extractId(item.id),
            lawyers: lawyers,
          }),
        ),
        previewDoc &&
          React.createElement(PreviewModal, {
            doc: previewDoc,
            onClose: () => setPreviewDoc(null),
          }),
        libraryMoveTarget &&
          React.createElement(LibraryMoveModal, {
            open: !!libraryMoveTarget,
            record: libraryMoveTarget.record,
            destinationType: libraryMoveTarget.destinationType,
            sourceContext: legalStudyTaskContext,
            currentUser,
            onClose: () => setLibraryMoveTarget(null),
            onSuccess: (updatedFile) => {
              setLibraryMoveTarget(null);
              if (onUpdate && updatedFile?._type !== "folder") {
                const updatedFiles = allFiles.map((file) =>
                  file.id === updatedFile.id ? { ...file, ...updatedFile } : file,
                );
                onUpdate({ ...item, _files: updatedFiles });
              } else {
                reloadAttachments();
              }
              setCmtRefreshTrigger((v) => v + 1);
            },
          }),
      );
    }
  };

  // Standalone mode closes standaloneMode block (noop - structure is inline above)
  // ── Add Task Modal ─────────────────────────────────────────
  const AddTaskModal = ({
    open,
    projectId,
    lawyers,
    services,
    allTasksInProject,
    onSave,
    onClose,
    currentUser,
  }) => {
    const INIT_FORM = {
      title: "",
      lawyerId: null,
      serviceId: null,
      approvedById: null,
      priority: "medium",
      status: "toDo",
      startDate: "",
      dueDate: "",
      estimatedDuration: "",
      description: "",
      isRequiredApproval: false,
      previousTaskId: null,
      nextStepDescription: "",
    };
    const [form, setForm] = useState(INIT_FORM);
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

    useEffect(() => {
      if (form.previousTaskId) {
        const prevTask = allTasksInProject.find(
          (t) => extractId(t.id) === extractId(form.previousTaskId),
        );
        if (
          prevTask &&
          form.serviceId &&
          String(prevTask.serviceId) !== String(form.serviceId)
        ) {
          set("previousTaskId", null);
        }
      }
    }, [form.serviceId]);

    const tasksForDependency = useMemo(() => {
      if (!form.serviceId) return allTasksInProject;
      return allTasksInProject.filter(
        (t) => String(t.serviceId) === String(form.serviceId),
      );
    }, [allTasksInProject, form.serviceId]);

    const handleSave = async () => {
      if (!form.title.trim()) {
        message.warning("Please enter a task name");
        return;
      }
      setSaving(true);
      try {
        let finalStatus = form.status;
        if (form.previousTaskId) {
          const prev = allTasksInProject.find(
            (t) => extractId(t.id) === extractId(form.previousTaskId),
          );
          if (prev && prev.status !== "done") finalStatus = "blocked";
        }
        const payload = {
          title: form.title.trim(),
          status: finalStatus,
          priority: form.priority,
          projectId,
          isRequiredApproval: form.isRequiredApproval,
        };
        if (form.lawyerId) payload.lawyerId = form.lawyerId;
        if (form.serviceId) payload.serviceId = form.serviceId;
        if (form.approvedById) payload.approvedById = form.approvedById;
        if (form.startDate)
          payload.startDate = new Date(form.startDate).toISOString();
        if (form.dueDate) payload.dueDate = new Date(form.dueDate).toISOString();
        if (form.description) payload.description = form.description;
        if (form.estimatedDuration)
          payload.estimatedDuration = parseFloat(form.estimatedDuration);
        if (form.previousTaskId) payload.previousTaskId = form.previousTaskId;
        if (form.nextStepDescription)
          payload.nextStepDescription = form.nextStepDescription;
        await apiReq("tasks:create", "POST", payload);
        message.success("✅ Task created");
        onSave();
        onClose();
        setForm(INIT_FORM);
      } catch {
        message.error("Creation failed");
      }
      setSaving(false);
    };

    const inp = (ph, val, fn, type = "text") =>
      React.createElement("input", {
        type,
        placeholder: ph,
        value: val,
        onChange: (e) => fn(e.target.value),
        style: {
          width: "100%",
          border: "1px solid #e8e8e8",
          borderRadius: 4,
          padding: "7px 10px",
          fontSize: 12,
          fontFamily: FONT,
          outline: "none",
          boxSizing: "border-box",
          color: "#262626",
        },
        onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
        onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
      });

    const sel = (ph, val, fn, opts) =>
      React.createElement(
        "select",
        {
          value: val || "",
          onChange: (e) => fn(e.target.value || null),
          style: {
            width: "100%",
            border: "1px solid #e8e8e8",
            borderRadius: 4,
            padding: "7px 10px",
            fontSize: 12,
            fontFamily: FONT,
            outline: "none",
            boxSizing: "border-box",
            color: val ? "#262626" : "#8c8c8c",
            background: "#fff",
          },
          onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
          onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
        },
        React.createElement("option", { value: "" }, ph),
        ...opts.map((o) =>
          React.createElement(
            "option",
            { key: o.value, value: o.value },
            o.label,
          ),
        ),
      );

    const lbl = (t) =>
      React.createElement(
        Text,
        {
          style: {
            fontSize: 12,
            color: "#8c8c8c",
            display: "block",
            marginBottom: 4,
            fontFamily: FONT,
            fontWeight: 600,
          },
        },
        t,
      );
    const fld = (l, c) =>
      React.createElement("div", { style: { marginBottom: 12 } }, lbl(l), c);
    const prevTask = allTasksInProject.find(
      (t) => extractId(t.id) === extractId(form.previousTaskId),
    );

    return React.createElement(
      Modal,
      {
        open,
        onCancel: onClose,
        footer: null,
        width: 1100,
        title: React.createElement(
          Text,
          { strong: true, style: { fontSize: 15, fontFamily: FONT } },
          "📋 Create new task",
        ),
      },
      React.createElement(
        "div",
        { style: { maxHeight: "75vh", overflowY: "auto", paddingRight: 4 } },
        fld(
          "Task name *",
          inp("Enter task name...", form.title, (v) => set("title", v)),
        ),
        React.createElement(
          "div",
          { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
          fld(
            "👨‍⚖️ Assigned lawyer",
            sel(
              "-- Assign --",
              form.lawyerId,
              (v) => set("lawyerId", v ? Number(v) : null),
              lawyers.map((l) => ({ value: l.id, label: l.lawyerName })),
            ),
          ),
          React.createElement(
            "div",
            { style: { marginBottom: 12 } },
            lbl("🗂 Service"),
            services.length === 0
              ? React.createElement(
                  "div",
                  {
                    style: {
                      border: "1px solid #ffe58f",
                      borderRadius: 4,
                      padding: "7px 10px",
                      fontSize: 12,
                      fontFamily: FONT,
                      color: "#d46b08",
                      background: "#fffbe6",
                    },
                  },
                  "⚠ No service yet",
                )
              : sel(
                  "-- Select service --",
                  form.serviceId,
                  (v) => set("serviceId", v ? Number(v) : null),
                  services.map((s) => ({ value: s.id, label: s.serviceName })),
                ),
          ),
          fld(
            "📅 Start date",
            inp("", form.startDate, (v) => set("startDate", v), "date"),
          ),
          fld(
            "🏁 Deadline",
            inp("", form.dueDate, (v) => set("dueDate", v), "date"),
          ),
          fld(
            "⏱ Estimated duration (hours)",
            inp(
              "e.g.: 4",
              form.estimatedDuration,
              (v) => set("estimatedDuration", v),
              "number",
            ),
          ),
        ),
        React.createElement(
          "div",
          { style: { marginBottom: 12 } },
          lbl("⛓ Pending Issue (optional)"),
          React.createElement(TaskPicker, {
            allTasks: tasksForDependency,
            currentTaskId: null,
            value: form.previousTaskId,
            services,
            onChange: (v) => set("previousTaskId", v),
          }),
          prevTask &&
            React.createElement(
              "div",
              {
                style: {
                  marginTop: 6,
                  padding: "7px 12px",
                  background: prevTask.status === "done" ? "#f6ffed" : "#f9f0ff",
                  border: `1px solid ${prevTask.status === "done" ? "#b7eb8f" : "#d3adf7"}`,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                },
              },
              React.createElement(StatusBadge, { status: prevTask.status }),
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#262626",
                    fontWeight: 500,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                },
                prevTask.title,
              ),
              prevTask.status === "done"
                ? React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 12,
                        fontFamily: FONT,
                        color: "#389e0d",
                        fontWeight: 600,
                      },
                    },
                    "✓ Done",
                  )
                : React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 12,
                        fontFamily: FONT,
                        color: "#722ed1",
                        fontWeight: 600,
                      },
                    },
                    '⏸ New task → "Blocked"',
                  ),
            ),
        ),
        fld(
          "⚡ Priority",
          React.createElement(
            "div",
            { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
            ...Object.entries(PRIORITY_CFG).map(([k, v]) =>
              React.createElement(
                "div",
                {
                  key: k,
                  onClick: () => set("priority", k),
                  style: {
                    fontSize: 12,
                    padding: "5px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontFamily: FONT,
                    background: form.priority === k ? v.bg : "#fafafa",
                    color: form.priority === k ? v.color : "#8c8c8c",
                    border: `1px solid ${form.priority === k ? v.color : "#f0f0f0"}`,
                    fontWeight: form.priority === k ? 600 : 400,
                  },
                },
                `${v.icon} ${v.label}`,
              ),
            ),
          ),
        ),
        fld(
          "🔐 Requires approval",
          React.createElement(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: FONT,
                color: "#595959",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #f0f0f0",
                background: form.isRequiredApproval ? "#fff7e6" : "#fafafa",
              },
            },
            React.createElement("input", {
              type: "checkbox",
              checked: form.isRequiredApproval,
              onChange: (e) => {
                const checked = e.target.checked;
                // 🌟 TỰ ĐỘNG XÓA NGƯỜI DUYỆT NẾU TẮT
                setForm((p) => ({
                  ...p,
                  isRequiredApproval: checked,
                  ...(!checked ? { approvedById: null } : {}),
                }));
              },
              style: {
                width: 15,
                height: 15,
                cursor: "pointer",
                accentColor: "#d46b08",
              },
            }),
            React.createElement(
              "span",
              {
                style: {
                  color: form.isRequiredApproval ? "#d46b08" : "#595959",
                  fontWeight: form.isRequiredApproval ? 600 : 400,
                },
              },
              form.isRequiredApproval
                ? "🔐 On — requires approval"
                : "Requires approval before completion",
            ),
          ),
        ),
        form.isRequiredApproval &&
          fld(
            "👤 Approver",
            React.createElement(
              "div",
              {
                style: {
                  padding: "8px 12px",
                  border: "1px solid #ffd591",
                  borderRadius: 6,
                  background: "#fffbe6",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                },
              },
              React.createElement(
                "span",
                { style: { fontSize: 12, color: "#d46b08", flexShrink: 0 } },
                "🔐",
              ),
              React.createElement(LawyerPicker, {
                lawyers,
                value: form.approvedById,
                size: 22,
                onChange: (id) => set("approvedById", id),
              }),
              !form.approvedById &&
                React.createElement(
                  "span",
                  { style: { fontSize: 12, color: "#bfbfbf", fontFamily: FONT } },
                  "Select an approver...",
                ),
            ),
          ),
        fld(
          "📝 Progress details",
          React.createElement("textarea", {
            value: form.description,
            onChange: (e) => set("description", e.target.value),
            placeholder: "Progress details...",
            rows: 3,
            style: {
              width: "100%",
              border: "1px solid #e8e8e8",
              borderRadius: 4,
              padding: "8px 10px",
              fontSize: 12,
              fontFamily: FONT,
              outline: "none",
              boxSizing: "border-box",
              resize: "vertical",
              color: "#262626",
            },
            onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
            onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
          }),
        ),
        fld(
          "👣 Next Step",
          React.createElement("textarea", {
            value: form.nextStepDescription,
            onChange: (e) => set("nextStepDescription", e.target.value),
            placeholder: "Next step after completion...",
            rows: 2,
            style: {
              width: "100%",
              border: "1px solid #e8e8e8",
              borderRadius: 4,
              padding: "8px 10px",
              fontSize: 12,
              fontFamily: FONT,
              outline: "none",
              boxSizing: "border-box",
              resize: "vertical",
              color: "#262626",
            },
            onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
            onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
          }),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid #f0f0f0",
            },
          },
          React.createElement(
            "div",
            {
              onClick: onClose,
              style: {
                padding: "6px 20px",
                borderRadius: 4,
                border: "1px solid #e8e8e8",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: FONT,
                color: "#595959",
              },
            },
            "Cancel",
          ),
          React.createElement(
            "div",
            {
              onClick: handleSave,
              style: {
                padding: "6px 24px",
                borderRadius: 4,
                background: "#1890ff",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: FONT,
                fontWeight: 600,
              },
            },
            saving ? "Saving..." : "Submit",
          ),
        ),
      ),
    );
  };

  const AddSubtaskModal = ({
    open,
    parentTaskId,
    lawyers,
    onSave,
    onClose,
    currentUser,
  }) => {
    const INIT_FORM = {
      title: "",
      lawyerId: null,
      approvedById: null,
      priority: "medium",
      status: "toDo",
      startDate: "",
      deadline: "",
      estimatedDuration: "",
      description: "",
      isRequiredApproval: false,
      nextStepDescription: "",
    };
    const [form, setForm] = useState(INIT_FORM);
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

    const handleSave = async () => {
      if (!form.title.trim()) {
        message.warning("Please enter a subtask name");
        return;
      }
      setSaving(true);
      try {
        const payload = {
          subTaskName: form.title.trim(),
          status: form.status,
          priority: form.priority,
          taskId: parentTaskId,
          isRequiredApproval: form.isRequiredApproval,
        };
        if (form.lawyerId) payload.lawyerId = form.lawyerId;
        if (form.approvedById) payload.approvedById = form.approvedById;
        if (form.startDate)
          payload.startDate = new Date(form.startDate).toISOString();
        if (form.deadline)
          payload.deadline = new Date(form.deadline).toISOString();
        if (form.description) payload.description = form.description;
        if (form.estimatedDuration)
          payload.estimatedDuration = parseFloat(form.estimatedDuration);
        if (form.nextStepDescription)
          payload.nextStepDescription = form.nextStepDescription;
        await apiReq("subTasks:create", "POST", payload);
        message.success("✅ Subtask created");
        onSave();
        onClose();
        setForm(INIT_FORM);
      } catch {
        message.error("Creation failed");
      }
      setSaving(false);
    };

    const inp = (ph, val, fn, type = "text") =>
      React.createElement("input", {
        type,
        placeholder: ph,
        value: val,
        onChange: (e) => fn(e.target.value),
        style: {
          width: "100%",
          border: "1px solid #e8e8e8",
          borderRadius: 4,
          padding: "7px 10px",
          fontSize: 12,
          fontFamily: FONT,
          outline: "none",
          boxSizing: "border-box",
          color: "#262626",
        },
        onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
        onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
      });

    const sel = (ph, val, fn, opts) =>
      React.createElement(
        "select",
        {
          value: val || "",
          onChange: (e) => fn(e.target.value || null),
          style: {
            width: "100%",
            border: "1px solid #e8e8e8",
            borderRadius: 4,
            padding: "7px 10px",
            fontSize: 12,
            fontFamily: FONT,
            outline: "none",
            boxSizing: "border-box",
            color: val ? "#262626" : "#8c8c8c",
            background: "#fff",
          },
          onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
          onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
        },
        React.createElement("option", { value: "" }, ph),
        ...opts.map((o) =>
          React.createElement(
            "option",
            { key: o.value, value: o.value },
            o.label,
          ),
        ),
      );

    const lbl = (t) =>
      React.createElement(
        Text,
        {
          style: {
            fontSize: 12,
            color: "#8c8c8c",
            display: "block",
            marginBottom: 4,
            fontFamily: FONT,
            fontWeight: 600,
          },
        },
        t,
      );
    const fld = (l, c) =>
      React.createElement("div", { style: { marginBottom: 12 } }, lbl(l), c);
    return React.createElement(
      Modal,
      {
        open,
        onCancel: onClose,
        footer: null,
        width: 800,
        title: React.createElement(
          Text,
          { strong: true, style: { fontSize: 15, fontFamily: FONT } },
          "📋 New subtask",
        ),
      },
      React.createElement(
        "div",
        { style: { maxHeight: "75vh", overflowY: "auto", paddingRight: 4 } },
        fld(
          "Subtask name *",
          inp("Enter task name...", form.title, (v) => set("title", v)),
        ),
        React.createElement(
          "div",
          { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
          fld(
            "👨‍⚖️ Assigned lawyer",
            sel(
              "-- Assign --",
              form.lawyerId,
              (v) => set("lawyerId", v ? Number(v) : null),
              lawyers.map((l) => ({ value: l.id, label: l.lawyerName })),
            ),
          ),
          fld(
            "⏱ Estimated duration (hours)",
            inp(
              "e.g.: 4",
              form.estimatedDuration,
              (v) => set("estimatedDuration", v),
              "number",
            ),
          ),
          fld(
            "📅 Start date",
            inp("", form.startDate, (v) => set("startDate", v), "date"),
          ),
          fld(
            "🏁 Deadline",
            inp("", form.deadline, (v) => set("deadline", v), "date"),
          ),
        ),
        fld(
          "⚡ Priority",
          React.createElement(
            "div",
            { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
            ...Object.entries(PRIORITY_CFG).map(([k, v]) =>
              React.createElement(
                "div",
                {
                  key: k,
                  onClick: () => set("priority", k),
                  style: {
                    fontSize: 12,
                    padding: "5px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontFamily: FONT,
                    background: form.priority === k ? v.bg : "#fafafa",
                    color: form.priority === k ? v.color : "#8c8c8c",
                    border: `1px solid ${form.priority === k ? v.color : "#f0f0f0"}`,
                    fontWeight: form.priority === k ? 600 : 400,
                  },
                },
                `${v.icon} ${v.label}`,
              ),
            ),
          ),
        ),
        fld(
          "🔐 Requires approval",
          React.createElement(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: FONT,
                color: "#595959",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #f0f0f0",
                background: form.isRequiredApproval ? "#fff7e6" : "#fafafa",
              },
            },
            React.createElement("input", {
              type: "checkbox",
              checked: form.isRequiredApproval,
              onChange: (e) => {
                const checked = e.target.checked;
                // 🌟 TỰ ĐỘNG XÓA NGƯỜI DUYỆT NẾU TẮT
                setForm((p) => ({
                  ...p,
                  isRequiredApproval: checked,
                  ...(!checked ? { approvedById: null } : {}),
                }));
              },
              style: {
                width: 15,
                height: 15,
                cursor: "pointer",
                accentColor: "#d46b08",
              },
            }),
            React.createElement(
              "span",
              {
                style: {
                  color: form.isRequiredApproval ? "#d46b08" : "#595959",
                  fontWeight: form.isRequiredApproval ? 600 : 400,
                },
              },
              form.isRequiredApproval
                ? "🔐 On — requires approval"
                : "Requires approval before completion",
            ),
          ),
        ),
        form.isRequiredApproval &&
          fld(
            "👤 Approver",
            React.createElement(
              "div",
              {
                style: {
                  padding: "8px 12px",
                  border: "1px solid #ffd591",
                  borderRadius: 6,
                  background: "#fffbe6",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                },
              },
              React.createElement(
                "span",
                { style: { fontSize: 12, color: "#d46b08", flexShrink: 0 } },
                "🔐",
              ),
              React.createElement(LawyerPicker, {
                lawyers,
                value: form.approvedById,
                size: 22,
                onChange: (id) => set("approvedById", id),
              }),
              !form.approvedById &&
                React.createElement(
                  "span",
                  { style: { fontSize: 12, color: "#bfbfbf", fontFamily: FONT } },
                  "Select an approver...",
                ),
            ),
          ),
        fld(
          "📝 Detailed description",
          React.createElement("textarea", {
            value: form.description,
            onChange: (e) => set("description", e.target.value),
            placeholder: "Detailed description of the subtask...",
            rows: 3,
            style: {
              width: "100%",
              border: "1px solid #e8e8e8",
              borderRadius: 4,
              padding: "8px 10px",
              fontSize: 12,
              fontFamily: FONT,
              outline: "none",
              boxSizing: "border-box",
              resize: "vertical",
              color: "#262626",
            },
            onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
            onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
          }),
        ),
        fld(
          "👣 Next Step",
          React.createElement("textarea", {
            value: form.nextStepDescription,
            onChange: (e) => set("nextStepDescription", e.target.value),
            placeholder: "Next step after completion...",
            rows: 2,
            style: {
              width: "100%",
              border: "1px solid #e8e8e8",
              borderRadius: 4,
              padding: "8px 10px",
              fontSize: 12,
              fontFamily: FONT,
              outline: "none",
              boxSizing: "border-box",
              resize: "vertical",
              color: "#262626",
            },
            onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
            onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
          }),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid #f0f0f0",
            },
          },
          React.createElement(
            "div",
            {
              onClick: onClose,
              style: {
                padding: "6px 20px",
                borderRadius: 4,
                border: "1px solid #e8e8e8",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: FONT,
                color: "#595959",
              },
            },
            "Cancel",
          ),
          React.createElement(
            "div",
            {
              onClick: handleSave,
              style: {
                padding: "6px 24px",
                borderRadius: 4,
                background: "#1890ff",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: FONT,
                fontWeight: 600,
              },
            },
            saving ? "Saving..." : "Submit",
          ),
        ),
      ),
    );
  };
  // ============================================================
  // §TASKDETAILVIEW — Standalone page, wraps DetailModal logic
  // ============================================================
  const TaskDetailView = () => {
    const [loading, setLoading] = useState(true);
    const [task, setTask] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [lawyers, setLawyers] = useState([]);
    const [services, setServices] = useState([]);
    const [projectTasks, setProjectTasks] = useState([]);
    const [projectManagerId, setProjectManagerId] = useState(null);
    const [caseInfo, setCaseInfo] = useState(null);
    const [internalProjectInfo, setInternalProjectInfo] = useState(null);
    const [projectFolderId, setProjectFolderId] = useState(null);
    const [allProjectFolders, setAllProjectFolders] = useState([]);
    const [showAddSub, setShowAddSub] = useState(false);

    const ids = useMemo(() => getTaskDetailIdsFromContext(), []);

    const reload = useCallback(async () => {
      const safeTaskId = extractId(ids.taskId);
      const safeSubTaskId = extractId(ids.subTaskId);
      if (!safeTaskId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const taskFields =
          "id,title,status,updatedAt,priority,startDate,dueDate,closedDate,lawyerId,projectId,projectInternalId,serviceId,description,estimatedDuration,workRate,isRequiredApproval,rejectionReason,approvedById,approvedAt,acceptedAt,previousTaskId,blockedReason,nextStepDescription,linkedUrl";
        const subTaskFields =
          "id,subTaskName,status,priority,date,deadline,closedDate,lawyerId,taskId,description,hourlyRate,estimatedDuration,isRequiredApproval,rejectionReason,approvedById,updatedAt,linkedUrl";
        const [user, lList, taskRows] = await Promise.all([
          getCurrentUser(),
          fetchAll("lawyers:list", "id,lawyerName,lawyerType,unitPrice,userId"),
          fetchAll("tasks:list", taskFields, { id: { $eq: safeTaskId } }),
        ]);
        const tkRes = taskRows?.[0] || null;
        let allServices = [];
        let enrichedTasks = [];

        if (tkRes) {
          const safeProjectInternalId = extractId(tkRes.projectInternalId);
          // Task chỉ có thể thuộc Case HOẶC dự án nội bộ, không phải cả hai.
          // Nếu task đã có projectInternalId, không được fallback sang
          // ids.caseId (ID case đoán từ route/URL, không đáng tin cậy) —
          // nếu không sẽ fetch nhầm caseInfo/sibling tasks/services/folders
          // của 1 case không liên quan, khiến "Linked case" và "Linked
          // internal project" cùng hiện ra dù task chỉ thuộc 1 trong 2.
          const safeProjectId =
            extractId(tkRes.projectId) ||
            (!safeProjectInternalId ? extractId(ids.caseId) : null);
          const folderPromise = safeProjectId
            ? withResourceSchemaSafeParams("folders:list", {
                pageSize: 1000,
                filter: JSON.stringify({ projectId: { $eq: safeProjectId } }),
              })
                .then((safeParams) =>
                  safeParams
                    ? ctx.api.request({ url: "folders:list", params: safeParams })
                    : null,
                )
                .catch(() => null)
            : Promise.resolve(null);
          const [allTasks, allServicesRows, projRes, folderRes, projectInternalRes] =
            await Promise.all([
              safeProjectId
                ? fetchAll("tasks:list", taskFields, { projectId: { $eq: safeProjectId } })
                : Promise.resolve([tkRes]),
              safeProjectId
                ? fetchAll(
                    "projectServices:list",
                    "id,serviceId,serviceName,serviceType,description,basePrice,status",
                    { projectId: { $eq: safeProjectId } },
                  )
                : Promise.resolve([]),
              safeProjectId
                ? withResourceSchemaSafeParams(
                    "projects:get",
                    {
                      filterByTk: safeProjectId,
                      fields: "id,projectManagerId,caseCode,projectName,customerId,customer",
                      appends: ["customer"],
                    },
                    { allowEmptyFilter: true },
                  )
                    .then((safeParams) =>
                      safeParams
                        ? ctx.api.request({ url: "projects:get", params: safeParams })
                        : null,
                    )
                    .catch(() => null)
                : Promise.resolve(null),
              folderPromise,
              safeProjectInternalId
                ? withResourceSchemaSafeParams(
                    "projectInternal:get",
                    {
                      filterByTk: safeProjectInternalId,
                      fields: "id,projectCode,projectName,description",
                    },
                    { allowEmptyFilter: true },
                  )
                    .then((safeParams) =>
                      safeParams
                        ? ctx.api.request({ url: "projectInternal:get", params: safeParams })
                        : null,
                    )
                    .catch(() => null)
                : Promise.resolve(null),
            ]);

          allServices = allServicesRows || [];
          const projData = projRes?.data?.data || projRes?.data || null;
          setProjectManagerId(projData?.projectManagerId || null);
          setCaseInfo(
            safeProjectId
              ? {
                  id: safeProjectId,
                  caseCode: projData?.caseCode || "",
                  projectName: projData?.projectName || "",
                  customerShortName:
                    projData?.customer?.shortName ||
                    projData?.customer?.customerName ||
                    projData?.customer?.name ||
                    "",
                }
              : null,
          );
          const projectInternalData =
            projectInternalRes?.data?.data || projectInternalRes?.data || null;
          setInternalProjectInfo(
            safeProjectInternalId
              ? {
                  id: safeProjectInternalId,
                  projectCode: projectInternalData?.projectCode || "",
                  projectName: projectInternalData?.projectName || "",
                  description: projectInternalData?.description || "",
                }
              : null,
          );

          if (folderRes?.data?.data) {
            setAllProjectFolders(folderRes.data.data);
            const root = folderRes.data.data.find((f) => !f.parentId);
            setProjectFolderId(root ? extractId(root.id) : null);
          } else {
            setAllProjectFolders([]);
            setProjectFolderId(null);
          }

          const taskIds = (allTasks || []).map((t) => extractId(t.id)).filter(Boolean);
          const [allSubs, allTaskFiles] = await Promise.all([
            taskIds.length
              ? fetchAll("subTasks:list", subTaskFields, { taskId: { $in: taskIds } })
              : Promise.resolve([]),
            taskIds.length ? fetchTaskDocumentsByIds(taskIds) : Promise.resolve([]),
          ]);

          const lMap = {};
          lList.forEach((l, i) => {
            lMap[extractId(l.id)] = {
              name: l.lawyerName,
              color: LAWYER_COLORS[i % LAWYER_COLORS.length],
            };
          });

          const fileMap = {};
          taskIds.forEach((id) => {
            fileMap[id] = [];
          });
          allTaskFiles.forEach((file) => {
            const taskId = getDocumentTaskId(file);
            if (taskId && fileMap[taskId]) fileMap[taskId].push(file);
          });

          const serviceDeletedLookup = {};
          allServices.forEach((ps) => {
            serviceDeletedLookup[getProjectServiceTaskKey(ps)] = isDeletedServiceRecord(ps);
          });
          const getTaskServiceDeleted = (taskLike) =>
            !!taskLike?.serviceId && !!serviceDeletedLookup[String(taskLike.serviceId)];

          enrichedTasks = (allTasks || []).map((t) => ({
            ...t,
            _type: "task",
            _serviceDeleted: getTaskServiceDeleted(t),
            _ln: lMap[extractId(t.lawyerId)]?.name || null,
            _lc: lMap[extractId(t.lawyerId)]?.color || "#8c8c8c",
            _od: isOD(t.dueDate, t.status),
            _today: isToday(t.dueDate || t.startDate),
            _files: fileMap[extractId(t.id)] || [],
            _subs: (allSubs || [])
              .filter((s) => extractId(s.taskId) === extractId(t.id))
              .map((s) => ({
                ...s,
                _type: "subTask",
                _parentTaskId: extractId(t.id),
                _parentTaskTitle: t.title || "",
                projectId: extractId(s.projectId) || extractId(t.projectId),
                caseId:
                  extractId(s.caseId) ||
                  extractId(t.caseId) ||
                  extractId(t.projectId),
                projectInternalId:
                  extractId(s.projectInternalId) || extractId(t.projectInternalId),
                serviceId: extractId(s.serviceId) || extractId(t.serviceId),
                _serviceDeleted: getTaskServiceDeleted(t),
                _ln: lMap[extractId(s.lawyerId)]?.name || null,
                _lc: lMap[extractId(s.lawyerId)]?.color || "#8c8c8c",
                _od: isOD(s.deadline, s.status),
              })),
          }));

          if (!enrichedTasks.some((t) => extractId(t.id) === safeTaskId)) {
            const files = await fetchFiles("Task", safeTaskId);
            enrichedTasks = [
              {
                ...tkRes,
                _type: "task",
                _serviceDeleted: getTaskServiceDeleted(tkRes),
                _files: files,
                _subs: [],
                _od: isOD(tkRes.dueDate, tkRes.status),
              },
            ];
          }
        }

        setCurrentUser(user);
        setLawyers(lList);
        setServices(allServices);
        setProjectTasks(enrichedTasks);
        const parentTask =
          enrichedTasks.find((t) => extractId(t.id) === safeTaskId) || tkRes;
        const selectedSubTask = safeSubTaskId
          ? (enrichedTasks || [])
              .flatMap((t) => t._subs || [])
              .find((subTask) => extractId(subTask.id) === safeSubTaskId)
          : null;
        setTask(selectedSubTask || parentTask);
      } catch (e) {
        message.error("Error loading data: " + (e?.message || ""));
      }
      setLoading(false);
    }, [ids.taskId, ids.subTaskId, ids.caseId]);

    useEffect(() => {
      reload();
    }, [reload]);

    if (loading)
      return React.createElement(
        "div",
        { style: { padding: 100, textAlign: "center" } },
        React.createElement(Spin, { size: "large" }),
      );
    if (!task)
      return React.createElement(
        "div",
        {
          style: {
            padding: 100,
            textAlign: "center",
            color: "#ff4d4f",
            fontFamily: FONT,
          },
        },
        "Task not found",
      );

    const isAdmin = isAdminUser(currentUser);
    const myLawyer = lawyers.find(
      (l) =>
        (extractId(l.userId) || extractId(l.user)) === extractId(currentUser?.id),
    );
    const isManager =
      isAdmin ||
      (projectManagerId &&
        extractId(currentUser?.id) === extractId(projectManagerId));
    const isAssignedToThis = myLawyer
      ? extractId(myLawyer.id) === (extractId(task.lawyerId) || extractId(task.lawyer))
      : false;
    const assignableLawyers = lawyers.filter((l) =>
      ["associate", "suppliant", "lawyer", "partner"].includes(l.lawyerType),
    );
    const detailRecordType = task?._type === "subTask" ? "subTask" : "task";
    const detailParentTask =
      detailRecordType === "subTask"
        ? projectTasks.find((t) => extractId(t.id) === extractId(task.taskId))
        : task;
    const detailParentTaskId =
      detailRecordType === "subTask"
        ? extractId(task.taskId)
        : extractId(task.id);

    const handleDetailUpdate = (updated) => {
      setTask((prev) => (prev ? { ...prev, ...updated } : prev));
      setProjectTasks((prev) =>
        prev.map((t) => {
          if (extractId(t.id) === extractId(updated.id)) return { ...t, ...updated };
          return {
            ...t,
            _subs: (t._subs || []).map((s) =>
              extractId(s.id) === extractId(updated.id) ? { ...s, ...updated } : s,
            ),
          };
        }),
      );
      const updatedRecordType =
        String(updated?._type || "").trim() === "subTask" ||
        updated?.subTaskName ||
        updated?.taskId
          ? "subTask"
          : "task";
      emitTaskDetailChange({
        recordId: extractId(updated?.id),
        taskId: extractId(updatedRecordType === "subTask" ? updated?.taskId : updated?.id),
        recordType: updatedRecordType,
        projectId: extractId(updated?.projectId) || extractId(task?.projectId) || extractId(ids.caseId),
        updated,
        changedAt: Date.now(),
      });
    };

    const handleSubtaskSaved = async () => {
      await reload();
      emitTaskDetailChange({
        recordId: detailParentTaskId,
        taskId: detailParentTaskId,
        recordType: "task",
        projectId:
          extractId(detailParentTask?.projectId) ||
          extractId(task?.projectId) ||
          extractId(ids.caseId),
        updated: detailParentTask || task,
        action: "subtask_saved",
        changedAt: Date.now(),
      });
    };

    const resolveUploadFolderId = (detailInfo) =>
      resolveServiceUploadFolderId({
        item: detailInfo?.item,
        type: detailInfo?.type,
        tasks: projectTasks,
        services,
        allProjectFolders,
        projectFolderId,
        projectId: extractId(task?.projectId) || extractId(task?.caseId) || extractId(ids.caseId),
      });

    return React.createElement(
      "div",
      { style: { background: "#f5f5f5", minHeight: "100vh", fontFamily: FONT } },
      React.createElement(DetailModal, {
        item: task,
        type: detailRecordType,
        lawyers: assignableLawyers,
        allTasksInProject: projectTasks,
        tasksInService: projectTasks,
        services,
        projectManagerId,
        caseInfo,
        internalProjectInfo,
        onClose: () => {},
        onUpdate: handleDetailUpdate,
        currentUser,
        isManager,
        onStatusChange: () => {},
        isAssignedToThis,
        projectFolderId: resolveUploadFolderId({ item: task, type: detailRecordType }),
        onOpenAddSubModal:
          detailRecordType === "task" ? () => setShowAddSub(true) : undefined,
        standaloneMode: true,
      }),
      showAddSub &&
        React.createElement(AddSubtaskModal, {
          open: showAddSub,
          parentTaskId: detailParentTaskId,
          lawyers: assignableLawyers,
          onSave: handleSubtaskSaved,
          onClose: () => setShowAddSub(false),
          currentUser,
        }),
    );
  };

  ctx.render(React.createElement(TaskDetailView, null));
