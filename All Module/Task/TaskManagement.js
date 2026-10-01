// ============================================================
// §1 CONFIG — không import, không side-effect
// ============================================================
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
  "Not Start": "Chưa bắt đầu",
  "In Progress": "Đang làm",
  "Blocked": "Bị chặn",
  "Pending approval": "Chờ duyệt",
  "Approved": "Đã duyệt",
  "Done": "Hoàn thành",
  "Cancelled": "Đã hủy",
  "Scheduled": "Đã lên lịch",
  "Ongoing": "Đang diễn ra",
  "In Court": "Tại tòa",
  "Completed": "Đã hoàn tất",
  "High": "Cao",
  "Medium": "Trung bình",
  "Low": "Thấp",
  "Partner": "Luật sư đối tác",
  "Lawyer": "Luật sư",
  "Associate": "Luật sư cộng sự",
  "Legal Assistant": "Trợ lý pháp lý",
  "Refresh": "Làm mới",
  "Approval required": "Cần duyệt",
  "Select payment installment": "Chọn đợt thanh toán",
  "No Payment Request matches this task's service": "Không có yêu cầu thanh toán nào khớp dịch vụ của công việc này",
  "Due: {0}": "Hạn: {0}",
  "Clear": "Bỏ chọn",
  "This service isn't part of any Payment Request item of the contract, so it isn't billed.": "Dịch vụ này không thuộc mục yêu cầu thanh toán nào của hợp đồng nên không được thu tiền.",
  "Not billed": "Không thu tiền",
  "Installment {0}": "Đợt thanh toán {0}",
  "Select Payment Request...": "Chọn yêu cầu thanh toán...",
  "Select payment...": "Chọn thanh toán...",
  "Select installment...": "Chọn đợt thanh toán...",
  "Retainer billing is fully automatic, on its own schedule — no task drives it.": "Retainer thu tiền hoàn toàn tự động theo lịch riêng — không công việc nào kích hoạt.",
  "Not applicable — auto on schedule": "Không áp dụng — tự động theo lịch",
  "This task's completion counts toward its service's payment trigger": "Hoàn thành công việc này được tính vào điều kiện thu tiền của dịch vụ",
  "Task has no linked service — ticking this has no effect yet": "Công việc chưa gắn dịch vụ — tích chọn lúc này chưa có tác dụng",
  "🔒 Only managers or the assignee can change the status": "🔒 Chỉ quản lý hoặc người phụ trách mới đổi được trạng thái",
  "No edit permission": "Không có quyền chỉnh sửa",
  "Task is blocked by a previous task": "Công việc đang bị chặn bởi công việc trước",
  "No.": "STT",
  "Title": "Tiêu đề",
  "Status": "Trạng thái",
  "Trigger Payment": "Kích hoạt thanh toán",
  "Updated": "Cập nhật",
  "Assignee": "Người phụ trách",
  "Description": "Mô tả",
  "Start": "Bắt đầu",
  "Deadline": "Hạn",
  "Pending Issue": "Vấn đề tồn đọng",
  "Next Step": "Bước tiếp theo",
  "Select assignee": "Chọn người phụ trách",
  "{0} ₫/hr": "{0} ₫/giờ",
  "Search lawyer...": "Tìm luật sư...",
  "Unassign": "Bỏ phân công",
  "Other": "Khác",
  "Assign lawyer": "Phân công luật sư",
  "No service assigned": "Chưa gắn dịch vụ",
  "Service #{0}": "Dịch vụ #{0}",
  "Service #": "Dịch vụ #",
  "Search tasks by name...": "Tìm công việc theo tên...",
  "No tasks found": "Không tìm thấy công việc nào",
  "Select a prerequisite task...": "Chọn công việc tiên quyết...",
  "File": "Tệp",
  "⬇️ Download": "⬇️ Tải về",
  "Close": "Đóng",
  "Cannot preview this file type — please download to open": "Không thể xem trước loại tệp này — vui lòng tải về để mở",
  "N/A": "N/A",
  "Assignee: {0}": "Người phụ trách: {0}",
  "Not assigned": "Chưa phân công",
  "Status: {0}": "Trạng thái: {0}",
  "Placed at the top of the list, above \"{0}\".": "Đặt ở đầu danh sách, trên \"{0}\".",
  "Placed between \"{0}\" and \"{1}\".": "Đặt giữa \"{0}\" và \"{1}\".",
  "Placed at the bottom of the list, below \"{0}\".": "Đặt ở cuối danh sách, dưới \"{0}\".",
  "✅ Template overridden": "✅ Đã ghi đè mẫu",
  "Failed to override template": "Ghi đè mẫu thất bại",
  "✅ Saved to template": "✅ Đã lưu vào mẫu",
  "Failed to save to template": "Lưu vào mẫu thất bại",
  "Override this template?": "Ghi đè mẫu này?",
  "Save as new template?": "Lưu thành mẫu mới?",
  "Replacing \"{0}\". Edit the fields below if needed before confirming.": "Đang thay thế \"{0}\". Sửa các trường bên dưới nếu cần trước khi xác nhận.",
  "Template title": "Tiêu đề mẫu",
  "Description (optional)": "Mô tả (tùy chọn)",
  "Priority": "Ưu tiên",
  "This cannot be undone.": "Không thể hoàn tác.",
  "Back": "Quay lại",
  "Saving...": "Đang lưu...",
  "Override": "Ghi đè",
  "Confirm": "Xác nhận",
  "Save to template?": "Lưu vào mẫu?",
  "Standardized service": "Dịch vụ chuẩn hóa",
  "-- Select a catalog service --": "-- Chọn dịch vụ trong danh mục --",
  "Existing templates — override one, or insert above/below it": "Mẫu hiện có — ghi đè một mẫu, hoặc chèn trên/dưới nó",
  "No existing templates yet for this service — nothing to override or insert relative to.": "Dịch vụ này chưa có mẫu nào — không có gì để ghi đè hay chèn cạnh.",
  "↑ Above": "↑ Phía trên",
  "↓ Below": "↓ Phía dưới",
  "This service has been deleted; a new task cannot be created.": "Dịch vụ này đã bị xóa; không thể tạo công việc mới.",
  "✅ Task created": "✅ Đã tạo công việc",
  "Creation failed": "Tạo thất bại",
  "New task will start as \"Waiting\"": "Công việc mới sẽ bắt đầu ở trạng thái \"Chờ\"",
  "Submit": "Gửi",
  "Cancel": "Hủy",
  "New task": "Công việc mới",
  "Please enter a task name": "Vui lòng nhập tên công việc",
  "Enter title...": "Nhập tiêu đề...",
  "Service": "Dịch vụ",
  "Please select a service": "Vui lòng chọn dịch vụ",
  "No services in this case yet": "Hồ sơ này chưa có dịch vụ nào",
  "-- Select service --": "-- Chọn dịch vụ --",
  "Start date": "Ngày bắt đầu",
  "Description...": "Mô tả...",
  "Next step after completion...": "Bước tiếp theo sau khi hoàn thành...",
  "Estimated duration": "Thời lượng dự kiến",
  "e.g., 4": "VD: 4",
  "Pending Issue (optional)": "Vấn đề tồn đọng (tùy chọn)",
  "On": "Bật",
  "Off": "Tắt",
  "Approver": "Người duyệt",
  "Required because approval is enabled for this task.": "Bắt buộc vì công việc này bật duyệt.",
  "Select approver": "Chọn người duyệt",
  "✅ Subtask created": "✅ Đã tạo công việc con",
  "New subtask": "Công việc con mới",
  "Please enter a subtask name": "Vui lòng nhập tên công việc con",
  "Detailed Description": "Mô tả chi tiết",
  "Describe the subtask in detail...": "Mô tả chi tiết công việc con...",
  "Required because approval is enabled for this subtask.": "Bắt buộc vì công việc con này bật duyệt.",
  "📎 {0} documents": "📎 {0} tài liệu",
  "Click to preview": "Bấm để xem trước",
  "This format doesn't support preview": "Định dạng này không hỗ trợ xem trước",
  "Download": "Tải về",
  "Task ID not found for this action.": "Không tìm thấy ID công việc cho thao tác này.",
  "The insert task action has not been configured.": "Thao tác chèn công việc chưa được cấu hình.",
  "The save as template action has not been configured.": "Thao tác lưu thành mẫu chưa được cấu hình.",
  "The delete task action has not been configured.": "Thao tác xóa công việc chưa được cấu hình.",
  "Insert task above": "Chèn công việc phía trên",
  "Insert task below": "Chèn công việc phía dưới",
  "Create subtask": "Tạo công việc con",
  "Save as template": "Lưu thành mẫu",
  "Delete task": "Xóa công việc",
  "Service is locked": "Dịch vụ đã bị khóa",
  "Delete subtask": "Xóa công việc con",
  "Meeting": "Cuộc họp",
  "Unassigned host": "Chưa có người chủ trì",
  "Start Time": "Giờ bắt đầu",
  "End Time": "Giờ kết thúc",
  "Not part of any Payment Request item — not billed": "Không thuộc mục yêu cầu thanh toán nào — không thu tiền",
  "Payment Request: {0} · {1}": "Yêu cầu thanh toán: {0} · {1}",
  "Payment Request: {0} · no trigger task yet": "Yêu cầu thanh toán: {0} · chưa có công việc kích hoạt",
  "Payment Request: {0}": "Yêu cầu thanh toán: {0}",
  "Payment Request: share of the package, computed when created": "Yêu cầu thanh toán: phần chia của gói, tính khi tạo",
  "No tasks to save as template": "Không có công việc nào để lưu thành mẫu",
  "This group is not linked to a case service": "Nhóm này chưa gắn với dịch vụ của hồ sơ",
  "This service has been deleted and locked. The task list cannot be opened.": "Dịch vụ này đã bị xóa và khóa. Không thể mở danh sách công việc.",
  "Expand task list": "Mở rộng danh sách công việc",
  "Collapse task list": "Thu gọn danh sách công việc",
  "{0}/{1} done": "{0}/{1} hoàn thành",
  "Service actions": "Thao tác dịch vụ",
  "New Task": "Công việc mới",
  "New Meeting": "Cuộc họp mới",
  "Override existing template": "Ghi đè mẫu hiện có",
  "✅ Saved \"{0}\" as a new standardized service": "✅ Đã lưu \"{0}\" thành dịch vụ chuẩn hóa mới",
  "Failed to save as template": "Lưu thành mẫu thất bại",
  "Save": "Lưu",
  "New service name": "Tên dịch vụ mới",
  "Enter a name for the new standardized service": "Nhập tên cho dịch vụ chuẩn hóa mới",
  "This name already exists in the catalog. Rename it, or use \"Override\" instead if you want to update that service.": "Tên này đã có trong danh mục. Đổi tên, hoặc dùng \"Ghi đè\" nếu muốn cập nhật dịch vụ đó.",
  "{0} task{1} will be copied into this template.": "Sẽ sao chép {0} công việc vào mẫu này.",
  "✅ \"{0}\" templates updated": "✅ Đã cập nhật mẫu của \"{0}\"",
  "Select the standardized service to override": "Chọn dịch vụ chuẩn hóa cần ghi đè",
  "Next": "Tiếp",
  "Service name": "Tên dịch vụ",
  "This will rename \"{0}\" to \"{1}\" and update its task templates to match the {2} task{3} currently in this case. Existing templates not present here will be removed. This cannot be undone.": "Thao tác sẽ đổi tên \"{0}\" thành \"{1}\" và cập nhật mẫu công việc theo {2} công việc đang có trong hồ sơ này. Các mẫu không có ở đây sẽ bị xóa. Không thể hoàn tác.",
  "This will update \"{0}\"'s task templates to match the {1} task{2} currently in this case. Existing templates not present here will be removed. This cannot be undone.": "Thao tác sẽ cập nhật mẫu công việc của \"{0}\" theo {1} công việc đang có trong hồ sơ này. Các mẫu không có ở đây sẽ bị xóa. Không thể hoàn tác.",
  "Overriding...": "Đang ghi đè...",
  "Confirm override": "Xác nhận ghi đè",
  "Error loading data, please refresh!": "Lỗi tải dữ liệu, vui lòng làm mới!",
  "🔓 \"{0}\" has been unblocked": "🔓 Đã bỏ chặn \"{0}\"",
  "This service has been deleted; the task cannot be updated.": "Dịch vụ này đã bị xóa; không thể cập nhật công việc.",
  "You are not the assignee and do not have permission to change the status.": "Bạn không phải người phụ trách và không có quyền đổi trạng thái.",
  "⛓ Task is waiting for \"{0}\" to complete first": "⛓ Công việc đang chờ \"{0}\" hoàn thành trước",
  "📋 Task requires approval — moved to \"Pending approval\"": "📋 Công việc cần duyệt — đã chuyển sang \"Chờ duyệt\"",
  "Backend error: your account has not been granted permission (Role) to edit data!": "Lỗi máy chủ: tài khoản của bạn chưa được cấp quyền (Role) chỉnh sửa dữ liệu!",
  "You are not the assignee and do not have permission to change this task.": "Bạn không phải người phụ trách và không có quyền thay đổi công việc này.",
  "You do not have permission to assign an assignee.": "Bạn không có quyền phân công người phụ trách.",
  "Assignment removed": "Đã bỏ phân công",
  "Failed": "Thất bại",
  "Missing record id.": "Thiếu ID bản ghi.",
  "Delete request failed.": "Yêu cầu xóa thất bại.",
  "Task ID not found for deletion.": "Không tìm thấy ID công việc để xóa.",
  "This service has been deleted; the task cannot be deleted.": "Dịch vụ này đã bị xóa; không thể xóa công việc.",
  "Confirm deletion of {0}": "Xác nhận xóa {0}",
  "Are you sure you want to delete ": "Bạn có chắc chắn muốn xóa ",
  "? This action cannot be undone.": "? Thao tác này không thể hoàn tác.",
  "Delete permanently": "Xóa vĩnh viễn",
  "✅ Deleted successfully": "✅ Đã xóa thành công",
  "Delete failed, please try again": "Xóa thất bại, vui lòng thử lại",
  "Failed to save the new order.": "Lưu thứ tự mới thất bại.",
  "This service has been deleted; a subtask cannot be created.": "Dịch vụ này đã bị xóa; không thể tạo công việc con.",
  "This service has been deleted and locked; task details cannot be opened.": "Dịch vụ này đã bị xóa và khóa; không thể mở chi tiết công việc.",
  "Task detail": "Chi tiết công việc",
  "Meeting detail": "Chi tiết cuộc họp",
  "Create meeting": "Tạo cuộc họp",
  "⚠️ Project ID not found": "⚠️ Không tìm thấy ID hồ sơ",
  "📋 Tasks": "📋 Công việc",
  "⏸ {0} waiting": "⏸ {0} đang chờ",
  "⚠ {0} overdue": "⚠ {0} quá hạn",
  "＋ New Task": "＋ Công việc mới",
  "＋ New Meeting": "＋ Cuộc họp mới",
  "📭 No tasks yet": "📭 Chưa có công việc nào",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const {
  Spin,
  Typography,
  Select,
  message,
  Modal,
  Input,
  Button,
  Tooltip,
  Empty,
  Form,
  DatePicker,
  InputNumber,
  Segmented,
  Switch,
} = ctx.antd;
const { Text } = Typography;

const PROJECT_ID = ctx.record?.id;
const FONT =
  "Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const COL = {
  stt: 38,
  toggle: 24,
  status: 130,
  updatedAt: 125,
  desc: 190,
  nextStep: 155,
  start: 88,
  deadline: 88,
  assign: 150,
  approval: 28,
  menu: 32,
  pendingIssue: 148,
};
const originURL = window.location.origin;
// 🌟 CONFIG URL DEEP-LINK CHO BÌNH LUẬN (Gán cứng các UID Route để dễ bảo trì)
const DEEP_LINK_CONFIG = {
  // 1. Host và đường dẫn Admin
  ORIGIN: originURL,
  ADMIN_PATH: "admin/aoy5h2zeeq3",

  // 2. UID của View và Tab chính (Nơi chứa danh sách Task)
  MAIN_VIEW: "view/dq2npsytcgh",
  MAIN_TAB: "tab/1tj9l1v5l8t",

  // 3. UID của View Task Detail (Giao diện Modal/Drawer hiện tại)
  TASK_VIEW: "view/a5c9c251a6a",

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
};

const STATUS_CFG = {
  toDo: {
    label: tr("Not Start"),
    color: "#595959",
    bg: "#f5f5f5",
    border: "#d9d9d9",
  },
  inProgress: {
    label: tr("In Progress"),
    color: "#1890ff",
    bg: "#e6f4ff",
    border: "#91caff",
  },
  blocked: {
    label: tr("Blocked"),
    color: "#722ed1",
    bg: "#f9f0ff",
    border: "#d3adf7",
  },
  pending: {
    label: tr("Pending approval"),
    color: "#d46b08",
    bg: "#fff7e6",
    border: "#ffd591",
  },
  approval: {
    label: tr("Approved"),
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
  },
  done: {
    label: tr("Done"),
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
  },
  cancelled: {
    label: tr("Cancelled"),
    color: "#cf1322",
    bg: "#fff1f0",
    border: "#ffa39e",
  },
};

// Meetings use their own status set (meetings.status), not tasks.status.
const MEETING_DETAIL_POPUP_UID = "d3b88171bf7";
const MEETING_STATUS_CFG = {
  scheduled: {
    label: tr("Scheduled"),
    color: "#1890ff",
    bg: "#e6f4ff",
    border: "#91caff",
  },
  ongoing: {
    label: tr("Ongoing"),
    color: "#d46b08",
    bg: "#fff7e6",
    border: "#ffd591",
  },
  inCourt: {
    label: tr("In Court"),
    color: "#c41d7f",
    bg: "#fff0f6",
    border: "#ffadd2",
  },
  completed: {
    label: tr("Completed"),
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
  },
  cancelled: {
    label: tr("Cancelled"),
    color: "#8c8c8c",
    bg: "#fafafa",
    border: "#d9d9d9",
  },
  canceled: {
    label: tr("Cancelled"),
    color: "#8c8c8c",
    bg: "#fafafa",
    border: "#d9d9d9",
  },
};

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
  high: { label: tr("High"), color: "#cf1322", bg: "#fff1f0", icon: "↑↑" },
  medium: { label: tr("Medium"), color: "#d46b08", bg: "#fff7e6", icon: "↑" },
  low: { label: tr("Low"), color: "#389e0d", bg: "#f6ffed", icon: "↓" },
};

// Design tokens cho các modal form (AddTaskModal/AddSubtaskModal) — theo
// convention Nocobase Form (antd Modal + Form.Item), màu primary khớp
// STATUS_CFG.inProgress / nút "＋ New Task" đã dùng trong chính file này.
const TASK_DS = {
  primaryButton: {
    background: "#1890ff",
    borderColor: "#1890ff",
    borderRadius: 6,
    fontWeight: 600,
  },
  secondaryButton: {
    borderColor: "#e8e8e8",
    borderRadius: 6,
  },
  // Bold/dark label pattern matching NocoBase's own native form rendering
  // ("Service Name :" style) — used instead of the smaller grey pseudo-
  // labels the earliest modals in this file used, for visual consistency
  // across every custom modal.
  fieldLabel: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#262626",
  },
  infoBox: {
    padding: "10px 14px",
    background: "#e6f4ff",
    border: "1px solid #91caff",
    borderRadius: 6,
    color: "#0958d9",
    fontSize: 12,
    fontFamily: FONT,
  },
  successBox: {
    padding: "10px 14px",
    background: "#f6ffed",
    border: "1px solid #b7eb8f",
    borderRadius: 6,
    color: "#389e0d",
    fontSize: 12,
    fontFamily: FONT,
  },
  waitingBox: {
    padding: "10px 14px",
    background: "#f9f0ff",
    border: "1px solid #d3adf7",
    borderRadius: 6,
    color: "#531dab",
    fontSize: 12,
    fontFamily: FONT,
  },
  warnBox: {
    padding: "10px 14px",
    background: "#fffbe6",
    border: "1px solid #ffe58f",
    borderRadius: 6,
    color: "#d46b08",
    fontSize: 12,
    fontFamily: FONT,
  },
  approverBox: {
    padding: "10px 14px",
    background: "#fffbe6",
    border: "1px solid #ffd591",
    borderRadius: 6,
  },
};

// Bold-label-with-optional-required-marker, matching NocoBase's own
// native form fields ("* Service Name :") — the shared building block
// every custom modal's field labels should use.
const renderFieldLabel = (text, required = false) =>
  React.createElement(
    "div",
    { style: TASK_DS.fieldLabel },
    required && React.createElement("span", { style: { color: "#ff4d4f" } }, "* "),
    text,
  );

// Shared responsive breakpoint — anything using this hook (modals, forms)
// collapses from a 2-column desktop layout to a single mobile column below
// this width, matching NocoBase's own mobile app viewport.
//
// The RunJS sandbox blocks direct reads of window.innerWidth/matchMedia
// (only a small allowlist on window/document is exposed), so width is
// polled off document.body.clientWidth instead — the only viewport-width
// signal reachable through the sandbox's allowed document.querySelector.
const MOBILE_BREAKPOINT = 640;
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      try {
        const width = document.querySelector("body")?.clientWidth;
        if (typeof width === "number") {
          setIsMobile((prev) => {
            const next = width <= MOBILE_BREAKPOINT;
            return prev === next ? prev : next;
          });
        }
      } catch {
        // sandbox may block access in some contexts — keep last known value
      }
    };
    check();
    const id = setInterval(check, 400);
    return () => clearInterval(id);
  }, []);
  return isMobile;
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
  partner: { label: tr("Partner"), color: "#531dab", bg: "#f9f0ff" },
  lawyer: { label: tr("Lawyer"), color: "#096dd9", bg: "#e6f4ff" },
  associate: { label: tr("Associate"), color: "#08979c", bg: "#e6fffb" },
  suppliant: { label: tr("Legal Assistant"), color: "#d46b08", bg: "#fff7e6" },
};

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
      width: options.size || 15,
      height: options.size || 15,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: options.strokeWidth || 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { display: "block", flexShrink: 0 },
      "aria-hidden": "true",
    },
    ...children,
  );

const renderServiceLockIcon = (size = 15) =>
  makeSvgIcon(
    [
      React.createElement("rect", {
        key: "body",
        x: 5,
        y: 10,
        width: 14,
        height: 10,
        rx: 2,
      }),
      React.createElement("path", {
        key: "shackle",
        d: "M8 10V7a4 4 0 0 1 8 0v3",
      }),
    ],
    { size },
  );

const renderServiceSettingsIcon = (size = 15) =>
  makeSvgIcon(
    [
      React.createElement("circle", { key: "hub", cx: 12, cy: 12, r: 3 }),
      React.createElement("path", {
        key: "cog",
        d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z",
      }),
    ],
    { size },
  );

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
const getTaskRecordId = (task = {}) =>
  extractId(task.id) || extractId(task.taskId) || extractId(task._id);
const getSubTaskRecordId = (subTask = {}) =>
  extractId(subTask.id) ||
  extractId(subTask.subTaskId) ||
  extractId(subTask._id);
const isDeletedServiceRecord = (record = {}) =>
  String(record?.status || record?.lineStatus || "")
    .toLowerCase()
    .trim() === "deleted";
const getProjectServiceTaskKey = (ps = {}) => {
  const serviceId =
    extractId(ps.serviceId) ||
    extractId(ps.ServiceId) ||
    extractId(ps.services);
  return String(serviceId || extractId(ps.id) || "");
};
const isTaskServiceDeleted = (item = {}) => !!item?._serviceDeleted;

// Reused as-is from ContractCreateForm.js:3248-3252/5595-5596 (this project's
// established name-collision-check pattern) — duplicated locally per this
// project's single-file JS Block convention, not imported from a shared lib.
const normalizeSearch = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const serviceNameKey = (value) =>
  normalizeSearch(value).replace(/\s+/g, " ").trim();

// Same taskIndex-based ordering ServiceSection already uses to interleave
// tasks/meetings for display (see the .sort(...) inside ServiceSection's
// render) — reused so "Save as template"/"Override" capture sortOrder in
// the same order the lawyer actually sees on screen.
const sortTasksByDisplayOrder = (list) =>
  list.slice().sort((a, b) => {
    const ai = Number.isFinite(Number(a.taskIndex))
      ? Number(a.taskIndex)
      : Infinity;
    const bi = Number.isFinite(Number(b.taskIndex))
      ? Number(b.taskIndex)
      : Infinity;
    if (ai !== bi) return ai - bi;
    return String(a.id).localeCompare(String(b.id));
  });

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getPathSegmentId = (segmentName) => {
  const segments = (window.location?.pathname || "").split("/");
  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === segmentName && segments[i + 1]) {
      return extractId(segments[i + 1]);
    }
  }
  return null;
};

const getDeepLinkCaseId = (fallbackCaseId) =>
  extractId(fallbackCaseId) ||
  getPathSegmentId(DEEP_LINK_CONFIG.KW_SOURCE) ||
  extractId(PROJECT_ID) ||
  extractId(ctx.record?.id) ||
  getPathSegmentId(DEEP_LINK_CONFIG.KW_FILTER);

const getCurrentPathUrl = () =>
  [window.location.origin, window.location.pathname].join("");

const buildTaskLinkedUrl = (item, type = "task", fallbackCaseId = null) => {
  const source = item && typeof item === "object" ? item : { id: item };
  const taskId =
    type === "subTask" ? extractId(source.taskId) : extractId(source.id);
  const caseId = getDeepLinkCaseId(
    fallbackCaseId || source.caseId || source.projectId,
  );

  if (taskId && caseId) return DEEP_LINK_CONFIG.buildUrl(taskId, caseId);
  return getCurrentPathUrl();
};

const withTaskLinkedUrl = (
  payload,
  item,
  type = "task",
  fallbackCaseId = null,
) => ({
  ...payload,
  linkedUrl: buildTaskLinkedUrl(item, type, fallbackCaseId),
});

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

// Meeting Start/End Time: meetingDate carries the date, timeValue ("HH:mm")
// overrides the hour/minute so the same helper works for both.
const combineDateTime = (dateValue, timeValue) => {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return null;
  const match = String(timeValue || "").match(/(\d{1,2}):(\d{2})/);
  if (match) d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d;
};

// DatePicker (antd Form) trả về dayjs — convert an toàn sang ISO string cho payload
const dateValueToISO = (v) => {
  if (!v) return null;
  const d = typeof v?.toDate === "function" ? v.toDate() : new Date(v);
  return d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : null;
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
  const officeIframeHeight = scalePreviewLength(
    shellHeight,
    officeScaleRatio,
    42,
  );
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

const getExtInfo = (ext) =>
  FILE_EXT_ICON[(ext || "").toLowerCase()] || {
    icon: "📎",
    color: "#8c8c8c",
    bg: "#fafafa",
  };

async function apiReq(url, method, data) {
  return ctx.api.request({ url, method: method || "POST", data });
}
async function fetchAll(url, fields, filter, sort) {
  try {
    const params = { pageSize: 500, page: 1 };
    if (fields) params.fields = fields;
    if (filter) params.filter = JSON.stringify(filter);
    if (sort) params.sort = sort;
    const res = await ctx.api.request({ url, params });
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
let documentFieldSetPromise = null;

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
  // Runtime JS blocks should not require Data sources metadata permission.
  // Keep a local field set aligned with the configured documents collection.
  return DOCUMENT_KNOWN_FIELD_SET;
}

async function getDocumentFieldSet() {
  if (!documentFieldSetPromise) {
    documentFieldSetPromise = fetchDocumentFieldSet();
  }
  return documentFieldSetPromise;
}

async function withDocumentSchemaSafeParams(params = {}, options = {}) {
  const fieldSet = await getDocumentFieldSet();
  if (!fieldSet) return { ...(params || {}) };

  const next = { ...(params || {}) };
  const requestedFields =
    options.fields !== undefined ? options.fields : next.fields;
  const safeFields = compactDocumentFields(requestedFields).filter((field) =>
    fieldSet.has(field),
  );
  if (safeFields.length) {
    next.fields = safeFields.join(",");
  } else {
    delete next.fields;
  }

  if (next.filter) {
    const parsedFilter = parseDocumentFilter(next.filter);
    const safeFilter = sanitizeDocumentFilterByFields(parsedFilter, fieldSet);
    if (!safeFilter || isEmptyPlainObject(safeFilter)) {
      if (options.allowEmptyFilter) {
        delete next.filter;
      } else {
        return null;
      }
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
  const idSet = new Set(
    (taskIds || []).map((id) => String(extractId(id))).filter(Boolean),
  );
  return (files || []).filter((file) => {
    const taskId = getDocumentTaskId(file);
    if (!taskId || !idSet.has(String(taskId))) return false;
    if (moduleScope && file.moduleScope && file.moduleScope !== moduleScope)
      return false;
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
      if (
        files.length ||
        filter === filterAttempts[filterAttempts.length - 1]
      ) {
        return files;
      }
    } catch {}
  }
  return [];
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
      createdAt: now, // 🌟 Đồng bộ createdAt
      batchId: batchId || null,
      dataId: dataId || null,
    });
  } catch {}
}

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
    roleNames.filter(Boolean).map((role) => String(role).trim().toLowerCase()),
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
      (member) => String(getPermissionLawyerId(member) || "") === String(lwId),
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

const resolveStatus = (newStatus, item) => {
  if (newStatus === "done" && item?.isRequiredApproval) return "pending";
  if (newStatus === "approval") return "done";
  return newStatus;
};

// ============================================================
// §5 ATOMS
// ============================================================

const ReloadButton = ({ onReload, loading, text = tr("Refresh"), style = {} }) => {
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
      title: tr("Approval required"),
    },
    React.createElement("span", { style: { fontSize: 12 } }, "🔐"),
  );
};

// By Case installment picker (2026-09-22, §6n) — a small popup listing each
// candidate installment with its full title, amount, due date and tagged
// service names (resolved from paymentRequestServiceIdsByPrId +
// serviceNameByContractServiceId), so a lawyer can read everything needed to
// pick the right one instead of a narrow Select truncating titles. Clicking
// a row selects it and closes the modal immediately — no separate "confirm"
// step, since a picker with only a handful of options doesn't need one.
const InstallmentPickerModal = ({ open, options, value, onSelect, onClear, onClose }) =>
  React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      title: tr("Select payment installment"),
      footer: null,
      width: 480,
    },
    !options.length &&
      React.createElement(Empty, {
        description: tr("No Payment Request matches this task's service"),
      }),
    options.map((opt) =>
      React.createElement(
        "div",
        {
          key: opt.id,
          onClick: () => onSelect(opt.id),
          style: {
            padding: "10px 12px",
            marginBottom: 8,
            border: `1px solid ${String(opt.id) === String(value) ? "#1677ff" : "#e5e7eb"}`,
            borderRadius: 8,
            cursor: "pointer",
            background: String(opt.id) === String(value) ? "#eef4ff" : "#fff",
          },
        },
        React.createElement(
          "div",
          { style: { fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#1f2937" } },
          opt.title,
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 12, fontSize: 12, color: "#595959", flexWrap: "wrap" } },
          opt.requestedAmount != null &&
            React.createElement(
              "span",
              null,
              `${Number(opt.requestedAmount).toLocaleString("vi-VN")} ₫`,
            ),
          opt.dueDate && React.createElement("span", null, tr("Due: {0}", { 0: fmt(opt.dueDate, "date") })),
          opt.status && React.createElement("span", { style: { textTransform: "capitalize" } }, opt.status),
        ),
        opt.serviceNames.length > 0 &&
          React.createElement(
            "div",
            { style: { marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" } },
            opt.serviceNames.map((name, i) =>
              React.createElement(
                "span",
                {
                  key: i,
                  style: {
                    fontSize: 11,
                    padding: "1px 8px",
                    borderRadius: 10,
                    background: "#f0f0f0",
                    color: "#595959",
                  },
                },
                name,
              ),
            ),
          ),
      ),
    ),
    value &&
      React.createElement(
        "div",
        { style: { textAlign: "right", marginTop: 4 } },
        React.createElement(Button, { size: "small", onClick: onClear }, tr("Clear")),
      ),
  );

// By Service only — inline editable equivalent of TaskDetailView.js's own
// "Task này là điều kiện thanh toán cho dịch vụ" checkbox, surfaced here so
// a lawyer can tick several tasks in a row without opening each one. See
// docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md.
// Replaces the "Updated date" column — same column slot/width
// (COL.updatedAt), repurposed rather than added as an extra column, so
// ColHeader and TaskRow never drift out of sync on column count.
//
// Mirrors TaskDetailView.js's own unified control (2026-09-21) so both
// screens behave identically for the same task, instead of this table
// always showing a plain isPaymentTrigger checkbox regardless of contract
// type — which did nothing for a By Case task (its automation never reads
// isPaymentTrigger, only linkedPaymentRequestId) and gave no way to pick
// an installment without leaving the table for Task Detail.
//
// contractType is shared by every row in one case's table (one case has
// exactly one contract), so this can safely pick ONE rendering mode for
// the whole column rather than branching per row:
//   - byCase: a compact button opening InstallmentPickerModal (2026-09-22,
//     §6n — replaces an inline Select whose dropdown truncated every
//     installment's title to the narrow table cell's width), writing
//     linkedPaymentRequestId directly (no separate reveal step needed
//     here — the table already has one row per task, so there's no
//     "checkbox first, then select" progressive disclosure to do).
//   - anything else (byService / retainer / no contract yet): the
//     isPaymentTrigger checkbox, unchanged. Not gated on contractType or
//     on having a linked service — the SQL trigger itself already no-ops
//     safely until a By Service contract is linked (see the
//     projects.contractId catch-up trigger for tasks marked done before
//     that happens).
// See docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md.
// ---- by-case one-time contract check (pure; tested by scripts/tests/task-trigger-visibility.test.js) ----
// By Case + One time (billingCycle not "multiple_payments") bills through a
// single payment that waits for the Case to be Done — or, once tasks are
// linked to it, for ALL of them (by_case_one_time_sync_trigger_mode,
// 2026-09-29). Its tasks get the installment picker, offering that payment.
const isByCaseOneTimeContract = (contract) =>
  contract?.contractType === "byCase" &&
  String(contract?.billingCycle || "one_time") !== "multiple_payments";
// Requests loaded for the picker; a One time payment with no task linked yet
// is still "on_case_done".
const LINKABLE_TRIGGER_TYPES = ["on_task_done", "on_case_done"];
const linkableTriggerRequests = (prs, contract) => {
  const oneTime = isByCaseOneTimeContract(contract);
  return (prs || []).filter(
    (pr) => pr?.triggerType === "on_task_done" || (oneTime && pr?.triggerType === "on_case_done"),
  );
};
// ---- end by-case one-time contract check ----

// ---- item payment request lookup (pure; tested by scripts/tests/service-payment-badge.test.js) ----
// By Service + Combo pricing (2026-09-25): each combo / standalone service is
// billed by ONE pending Payment Request tagged (paymentRequestServices) with
// the item's contractServices. Returns that request for a Case service, or
// null when the service isn't in any such item (plain By Service →
// isPaymentTrigger checkbox, per-service request).
const itemPaymentRequestFor = (projectServiceId, maps = {}) => {
  if (projectServiceId === null || projectServiceId === undefined) return null;
  const csId = (maps.contractServiceIdByProjectServiceId || {})[projectServiceId];
  if (csId === null || csId === undefined) return null;
  const prIdEntry = Object.entries(maps.paymentRequestServiceIdsByPrId || {}).find(([, ids]) =>
    (ids || []).some((id) => String(id) === String(csId)),
  );
  if (!prIdEntry) return null;
  return (
    (maps.linkablePaymentRequests || []).find((pr) => String(pr?.id?.id ?? pr?.id) === String(prIdEntry[0])) ||
    null
  );
};
// ---- end item payment request lookup ----

// contractType value used for such a case (only TriggerCell reads
// contractType in this file).
const CONTRACT_MODE_BY_CASE_ONE_TIME = "byCase:oneTime";

const TriggerCell = ({
  task,
  contractType,
  hasContract,
  linkablePaymentRequests,
  contractServiceIdByProjectServiceId,
  paymentRequestServiceIdsByPrId,
  serviceNameByContractServiceId,
  onUpdateField,
  disabled,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const cellStyle = {
    flex: `0 1 ${COL.updatedAt}px`,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  // No contract linked to the case yet → no payment control at all. The slot
  // falls back to its original "Updated" date (same as subtask/meeting rows
  // in this column), so the column stays aligned without exposing finance.
  if (!hasContract) {
    return React.createElement(
      "div",
      {
        style: {
          ...cellStyle,
          fontSize: 12,
          fontFamily: FONT,
          color: task.updatedAt ? "#8c8c8c" : "#d9d9d9",
        },
      },
      task.updatedAt ? fmt(task.updatedAt, "full") : "—",
    );
  }

  // By Service + Combo pricing: a task whose service belongs to a billing
  // item (combo / standalone service) links to that item's Payment Request —
  // same picker and AND activation as a By Case installment.
  const coveredByItem =
    contractType === "byService" &&
    !!itemPaymentRequestFor(extractId(task.projectServiceId), {
      contractServiceIdByProjectServiceId,
      paymentRequestServiceIdsByPrId,
      linkablePaymentRequests,
    });
  // Requests + their tags not loaded yet: don't guess picker vs checkbox.
  if (contractType === "byService" && linkablePaymentRequests === null) {
    return React.createElement(
      "div",
      { style: { ...cellStyle, fontSize: 12, color: "#d9d9d9", fontFamily: FONT } },
      "…",
    );
  }
  // Combo pricing contract billed per item, but this service belongs to no
  // item (e.g. added to the Case later): no request can ever be created for
  // it, so no control that would do nothing.
  const itemBilling =
    contractType === "byService" && Object.keys(paymentRequestServiceIdsByPrId || {}).length > 0;
  if (itemBilling && !coveredByItem) {
    return React.createElement(
      "div",
      {
        style: { ...cellStyle, fontSize: 11.5, color: "#8c8c8c", fontFamily: FONT, textAlign: "center" },
        title: tr("This service isn't part of any Payment Request item of the contract, so it isn't billed."),
      },
      tr("Not billed"),
    );
  }

  const oneTime = contractType === CONTRACT_MODE_BY_CASE_ONE_TIME;
  if (contractType === "byCase" || oneTime || coveredByItem) {
    // §6h — same "always keep the already-linked option, else filter by the
    // row's own service (via the paymentRequestServices junction
    // collection, not a JSON field)" logic as TaskDetailView.js's Select.
    // The "untagged = visible to everyone" fallback was removed (2026-09-21,
    // §6m) — Service is now required when authoring the schedule, so an
    // untagged PR is stale pre-requirement data, not a valid "applies to
    // everyone" state.
    const taskContractServiceId =
      (contractServiceIdByProjectServiceId || {})[extractId(task.projectServiceId)];
    // 2026-09-22 (§6n) — the inline Select's own dropdown was pinned to this
    // narrow table cell's width, truncating every option's title (e.g.
    // "Đợt 1 - CT1..."). Replaced with a compact trigger button that opens
    // InstallmentPickerModal, a full-width popup listing each candidate
    // installment's full title, amount, due date and tagged service names —
    // exactly what's needed to tell apart 2 installments that share a
    // tagged service (see the earlier discussion on multi-service tags).
    const options = (linkablePaymentRequests || [])
      .filter((pr) => {
        if (extractId(pr.id) === extractId(task.linkedPaymentRequestId)) return true;
        // One time: its single payment is tagged with no service — any task
        if (oneTime) return true;
        const taggedServiceIds = (paymentRequestServiceIdsByPrId || {})[extractId(pr.id)];
        if (!taggedServiceIds || !taggedServiceIds.length) return false;
        return (
          taskContractServiceId != null &&
          taggedServiceIds.some((id) => String(id) === String(taskContractServiceId))
        );
      })
      .map((pr) => ({
        id: extractId(pr.id),
        title: pr.title || tr("Installment {0}", { 0: pr.installmentNo || "" }),
        requestedAmount: pr.requestedAmount,
        status: pr.status,
        dueDate: pr.dueDate,
        serviceNames: ((paymentRequestServiceIdsByPrId || {})[extractId(pr.id)] || [])
          .map((csId) => (serviceNameByContractServiceId || {})[csId])
          .filter(Boolean),
      }));
    const selectedId = extractId(task.linkedPaymentRequestId);
    const selected = options.find((o) => String(o.id) === String(selectedId));
    return React.createElement(
      "div",
      { style: { ...cellStyle, padding: "0 4px" } },
      React.createElement(
        "button",
        {
          type: "button",
          disabled,
          onClick: () => !disabled && setModalOpen(true),
          title: selected ? selected.title : tr("Select payment installment"),
          style: {
            width: "100%",
            textAlign: "left",
            padding: "3px 8px",
            fontSize: 12,
            fontFamily: FONT,
            border: `1px solid ${selected ? "#1677ff" : "#d9d9d9"}`,
            borderRadius: 4,
            background: "#fff",
            color: selected ? "#1677ff" : "#8c8c8c",
            cursor: disabled ? "default" : "pointer",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        selected
          ? selected.title
          : coveredByItem
            ? tr("Select Payment Request...")
            : oneTime
              ? tr("Select payment...")
              : tr("Select installment..."),
      ),
      modalOpen &&
        React.createElement(InstallmentPickerModal, {
          open: modalOpen,
          options,
          value: selectedId,
          onSelect: (id) => {
            onUpdateField(task.id, "linkedPaymentRequestId", id);
            setModalOpen(false);
          },
          onClear: () => {
            onUpdateField(task.id, "linkedPaymentRequestId", null);
            setModalOpen(false);
          },
          onClose: () => setModalOpen(false),
        }),
    );
  }

  // Retainer billing runs entirely off contractBillingPlans + its own
  // scheduled workflow (CreateContractBillingPlansWorkflow.js) — no SQL
  // trigger anywhere reads a task's isPaymentTrigger for this contract
  // type, so the checkbox below (meant for By Service) would tick but do
  // nothing. Showing it anyway (2026-09-22 finding) let a lawyer believe
  // ticking it mattered for Retainer tasks when it never did. Replaced
  // with plain informational text for this one contract type.
  if (contractType === "retainer") {
    return React.createElement(
      "div",
      {
        style: { ...cellStyle, fontSize: 11, color: "#bfbfbf", textAlign: "center", lineHeight: 1.3 },
        title: tr("Retainer billing is fully automatic, on its own schedule — no task drives it."),
      },
      tr("Not applicable — auto on schedule"),
    );
  }

  const hasService = !!extractId(task.projectServiceId);
  return React.createElement(
    "div",
    {
      style: cellStyle,
      title: hasService
        ? tr("This task's completion counts toward its service's payment trigger")
        : tr("Task has no linked service — ticking this has no effect yet"),
    },
    React.createElement("input", {
      type: "checkbox",
      checked: !!task.isPaymentTrigger,
      disabled,
      onChange: (e) => onUpdateField(task.id, "isPaymentTrigger", e.target.checked),
    }),
  );
};

const StatusBtn = ({
  status,
  onChange,
  isRequiredApproval = false,
  isBlocked = false,
  readOnly = false,
}) => {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[status] || STATUS_CFG.toDo;
  const allowedKeys = getStatusKeys(isRequiredApproval);
  const statusAnchorRef = useRef(null);
  const statusMenuRef = useRef(null);
  const menuUp = useDropdownFlip(open, statusAnchorRef, statusMenuRef);
  return React.createElement(
    "div",
    { ref: statusAnchorRef, style: { position: "relative", flexShrink: 0 } },
    React.createElement(
      "span",
      {
        onClick: (e) => {
          e.stopPropagation();
          // 🌟 NẾU BỊ CHẶN QUYỀN SẼ BÁO LỖI NGAY TẠI ĐÂY
          if (readOnly) {
            message.warning(
              tr("🔒 Only managers or the assignee can change the status"),
            );
            return;
          }
          setOpen((v) => !v);
        },
        title: readOnly
          ? tr("No edit permission")
          : isBlocked
            ? tr("Task is blocked by a previous task")
            : cfg.label,
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          fontFamily: FONT,
          fontWeight: 500,
          padding: "2px 8px",
          borderRadius: 3,
          background: cfg.bg,
          color: cfg.color,
          border: `1px solid ${cfg.border}`,
          whiteSpace: "nowrap",
          cursor: readOnly ? "not-allowed" : "pointer",
          opacity: readOnly ? 0.7 : 1,
        },
      },
      cfg.label,
      !readOnly &&
        React.createElement(
          "span",
          { style: { fontSize: 12, lineHeight: 1, opacity: 0.6 } },
          "▾",
        ),
    ),
    open &&
      !readOnly &&
      React.createElement(
        "div",
        {
          ref: statusMenuRef,
          style: {
            position: "absolute",
            ...(menuUp ? { bottom: "100%", marginBottom: 4 } : { top: "100%", marginTop: 4 }),
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

// hasContract — see TriggerCell: without a contract the column is "Updated".
const ColHeader = ({ hasContract = false } = {}) =>
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
        width: "100%",
        color: "#8c8c8c",
        textTransform: "uppercase",
        letterSpacing: 0.5,
      },
    },
    React.createElement("div", { style: { width: COL.menu, flexShrink: 0 } }),
    React.createElement(
      "div",
      { style: { width: COL.stt, flexShrink: 0, textAlign: "center" } },
      tr("No."),
    ),
    React.createElement("div", { style: { width: COL.toggle, flexShrink: 0 } }),
    React.createElement(
      "div",
      { style: { flex: 1, padding: "0 10px", minWidth: 200 } },
      tr("Title"),
    ),
    React.createElement(
      "div",
      { style: { flex: `0 1 ${COL.status}px`, minWidth: 0, padding: "0 8px" } },
      tr("Status"),
    ),
    React.createElement(
      "div",
      {
        style: {
          flex: `0 1 ${COL.updatedAt}px`,
          minWidth: 0,
          textAlign: "center",
        },
      },
      hasContract ? tr("Trigger Payment") : tr("Updated"),
    ),
    React.createElement(
      "div",
      {
        style: { flex: `0 1 ${COL.assign}px`, minWidth: 0, textAlign: "center" },
      },
      tr("Assignee"),
    ),
    React.createElement(
      "div",
      { style: { flex: `0 1 ${COL.desc}px`, minWidth: 0, padding: "0 8px" } },
      tr("Description"),
    ),
    React.createElement(
      "div",
      {
        style: { flex: `0 1 ${COL.start}px`, minWidth: 0, textAlign: "center" },
      },
      tr("Start"),
    ),
    React.createElement(
      "div",
      {
        style: {
          flex: `0 1 ${COL.deadline}px`,
          minWidth: 0,
          textAlign: "center",
        },
      },
      tr("Deadline"),
    ),
    React.createElement(
      "div",
      {
        style: { flex: `0 1 ${COL.pendingIssue}px`, minWidth: 0, padding: "0 8px" },
      },
      tr("Pending Issue"),
    ),
    React.createElement(
      "div",
      {
        style: { flex: `0 1 ${COL.nextStep}px`, minWidth: 0, padding: "0 8px" },
      },
      tr("Next Step"),
    ),
    React.createElement("div", {
      style: { width: COL.approval, flexShrink: 0 },
    }),
  );
// ============================================================
// §6 PICKERS
// ============================================================

// ---- dropdown placement helpers (pure; tested by scripts/tests/task-dropdown-placement.test.js) ----
// Row dropdowns near the last task rows hung below the table and stretched
// it (2026-09-25). Open upward when the room below is too small for the
// menu and there is more room above.
const shouldOpenUp = ({ anchorTop, anchorBottom, limitTop, limitBottom, height }) => {
  const below = limitBottom - anchorBottom;
  const above = anchorTop - limitTop;
  return below < height && above > below;
};
// ---- end dropdown placement helpers ----

// RunJS sandbox (JS item): window.innerHeight / getComputedStyle and
// document.documentElement / document.body are blocked — only
// document.querySelector & co. are allowed. The viewport height comes from
// the <html> element, and a scroll container is recognised by its inline
// overflow style (how this block styles its lists) or an antd scroll body.
const viewportHeight = () => document.querySelector("html")?.clientHeight || 0;
const isScrollContainer = (el) => {
  const style = el.style || {};
  if (/auto|scroll/.test(`${style.overflow || ""} ${style.overflowY || ""} ${style.overflowX || ""}`)) return true;
  return typeof el.matches === "function" && el.matches(".ant-modal-body, .ant-drawer-body, .ant-table-body");
};

// Room is measured inside the nearest scrolling ancestor (the task list)
// and the viewport, whichever is tighter.
const dropdownOpensUp = (anchorEl, height) => {
  if (!anchorEl || typeof anchorEl.getBoundingClientRect !== "function") return false;
  const rect = anchorEl.getBoundingClientRect();
  let limitTop = 0;
  let limitBottom = viewportHeight() || rect.bottom + height;
  for (let el = anchorEl.parentElement; el && el.tagName !== "BODY"; el = el.parentElement) {
    if (isScrollContainer(el)) {
      const bounds = el.getBoundingClientRect();
      limitTop = Math.max(limitTop, bounds.top);
      limitBottom = Math.min(limitBottom, bounds.bottom);
      break;
    }
  }
  return shouldOpenUp({ anchorTop: rect.top, anchorBottom: rect.bottom, limitTop, limitBottom, height });
};

// Flips an absolutely positioned menu upward before it paints, using the
// rendered menu's real height.
const useFlipLayoutEffect = React.useLayoutEffect || useEffect;
const useDropdownFlip = (open, anchorRef, menuRef) => {
  const [up, setUp] = useState(false);
  useFlipLayoutEffect(() => {
    if (!open) {
      setUp(false);
      return;
    }
    setUp(dropdownOpensUp(anchorRef.current, menuRef.current?.offsetHeight || 0));
  }, [open]);
  return up;
};

const PortalDropdown = ({
  anchorRef,
  open,
  onClose,
  width,
  align = "right",
  children,
}) => {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const viewport = viewportHeight() || rect.bottom + 344;
    const openUp = shouldOpenUp({
      anchorTop: rect.top,
      anchorBottom: rect.bottom,
      limitTop: 0,
      limitBottom: viewport,
      height: 344,
    });
    // Up: pinned by its bottom edge, so a short list sits right above the
    // anchor instead of floating 344px up.
    setPos({
      top: openUp ? "auto" : rect.bottom + 4,
      bottom: openUp ? viewport - rect.top + 4 : "auto",
      left: align === "left" ? rect.left : rect.right - width,
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
          bottom: pos.bottom,
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
  bordered = false,
  placeholder = tr("Select assignee"),
  // Hourly rate under each name is financial info — shown only when the
  // caller confirms the case has a contract (hidden by default).
  showRate = false,
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
        showRate &&
        l.unitPrice > 0 &&
          React.createElement(
            "div",
            { style: { fontSize: 12, fontFamily: FONT, color: "#8c8c8c" } },
            tr("{0} ₫/hr", { 0: Number(l.unitPrice).toLocaleString("vi-VN") }),
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
        placeholder: tr("Search lawyer..."),
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
          React.createElement("span", null, tr("Unassign")),
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
            tr("Other"),
          ),
          ...others.map(renderLawyerRow),
        ),
    ),
  );

  if (bordered) {
    return React.createElement(
      "div",
      { style: { position: "relative", width: "100%" } },
      React.createElement(
        "div",
        {
          ref: triggerRef,
          onClick: (e) => {
            e.stopPropagation();
            if (!readOnly) setOpen((v) => !v);
          },
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            height: 32,
            padding: "0 11px",
            border: `1px solid ${open ? "#1890ff" : "#d9d9d9"}`,
            borderRadius: 6,
            background: readOnly ? "#f5f5f5" : "#fff",
            cursor: readOnly ? "not-allowed" : "pointer",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          },
        },
        cur
          ? React.createElement(Av, { name: cur.lawyerName, color, size: 20 })
          : null,
        React.createElement(
          "span",
          {
            style: {
              flex: 1,
              fontSize: 13,
              fontFamily: FONT,
              color: cur ? "#262626" : "#bfbfbf",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
          cur ? cur.lawyerName : placeholder,
        ),
        !readOnly &&
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                color: "#bfbfbf",
                lineHeight: 1,
                flexShrink: 0,
              },
            },
            "▾",
          ),
      ),
      React.createElement(
        PortalDropdown,
        {
          anchorRef: triggerRef,
          open,
          onClose: handleClose,
          width: 280,
          align: "left",
        },
        dropdownContent,
      ),
    );
  }

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
                title: tr("Assign lawyer"),
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
  const [anchorRight, setAnchorRight] = useState(false);
  const wrapperRef = useRef(null);
  const pickerMenuRef = useRef(null);
  const DROPDOWN_WIDTH = 460;
  const menuUp = useDropdownFlip(open, wrapperRef, pickerMenuRef);

  // The trigger can sit in a narrow grid column (e.g. sharing a row with
  // Estimated duration) — measure against the modal's own bounds each time
  // it opens and flip the anchor so the fixed-width panel never bleeds past
  // the modal edge (which was forcing the page to auto-scroll horizontally).
  useEffect(() => {
    if (!open) return;
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const boundsEl = el.closest(".ant-modal-content") || el.closest(".ant-modal-body");
    const bounds = boundsEl
      ? boundsEl.getBoundingClientRect()
      : { right: document.querySelector("body")?.clientWidth || rect.right };
    setAnchorRight(rect.left + DROPDOWN_WIDTH > bounds.right - 16);
  }, [open]);

  const cur = useMemo(
    () => allTasks.find((t) => t.id === value),
    [allTasks, value],
  );
  // Key thống nhất: ps.serviceId (catalog) hoặc ps.id (custom service)
  const serviceMap = useMemo(() => {
    const m = { __none__: tr("No service assigned") };
    services.forEach((ps) => {
      const key = ps.serviceId ? String(ps.serviceId) : String(ps.id);
      m[key] = ps.serviceName || tr("Service #{0}", { 0: ps.id });
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

    const serviceKeys = services
      .map((ps) => (ps.serviceId ? String(ps.serviceId) : String(ps.id)))
      .filter((k) => map[k]);
    const noneKey = map["__none__"] ? ["__none__"] : [];
    return [...serviceKeys, ...noneKey].map((k) => ({
      key: k,
      label: serviceMap[k] || tr("Service #") + k,
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
        ref: pickerMenuRef,
        style: {
          position: "absolute",
          ...(menuUp ? { bottom: "100%", marginBottom: 4 } : { top: "100%", marginTop: 4 }),
          left: anchorRight ? "auto" : 0,
          right: anchorRight ? 0 : "auto",
          zIndex: 9999,
          background: "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          width: `min(${DROPDOWN_WIDTH}px, calc(100vw - 32px))`,
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
          placeholder: tr("Search tasks by name..."),
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
              tr("No tasks found"),
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
    { ref: wrapperRef, style: { position: "relative" } },
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
            tr("Select a prerequisite task..."),
          ),
    ),
    renderDropdown(),
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
    doc.title || attachment?.title || attachment?.filename || tr("File");
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
  const displayName = (baseName || tr("File")) + fileExt;
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
            tr("⬇️ Download"),
          ),
        React.createElement(Button, { key: "cl", onClick: onClose }, tr("Close")),
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
            tr("Cannot preview this file type — please download to open"),
        }),
      ),
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
          flex: `0 1 ${COL.pendingIssue}px`,
          minWidth: 0,
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
          flex: `0 1 ${COL.pendingIssue}px`,
          minWidth: 0,
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
    label: tr("N/A"),
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
      tr("Assignee: {0}", { 0: lawyerName || tr("Not assigned") }),
    ),
    React.createElement("div", null, tr("Status: {0}", { 0: statusInfo.label })),
  );
  return React.createElement(
    "div",
    {
      style: {
        flex: `0 1 ${COL.pendingIssue}px`,
        minWidth: 0,
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

// Triggered from a single task's own "⋮" menu ("Save as template") — an
// optional, per-task action, not automatic after creation (an earlier
// automatic-popup-on-every-create version was deliberately replaced with
// this). Lets the user pick ANY catalog service to save it into as a new
// task template, not limited to the task's own linked service: works even
// for a task on a "custom"/non-catalog service or with no service at all,
// since the target is chosen here, not inferred.
const SaveTaskToTemplateModal = ({
  open,
  taskValues,
  defaultServiceId,
  serviceCatalog,
  onClose,
  onSaved,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState(defaultServiceId);
  const [existingTemplates, setExistingTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  // { type: "override"|"insertAbove"|"insertBelow", template } | null — set
  // by clicking a row action; while set, the modal shows a preview step
  // instead of the list, and the actual write only fires from that step's
  // own Confirm button.
  const [pendingAction, setPendingAction] = useState(null);
  // Editable draft of what will actually be written — starts as a copy of
  // the source task's own title/description/priority, but the preview
  // step lets the user tweak it before submitting, independent of which
  // action (Override/Above/Below) or which existing row they picked.
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPriority, setDraftPriority] = useState("medium");

  useEffect(() => {
    if (open) {
      setSelectedServiceId(defaultServiceId);
      setPendingAction(null);
      setDraftTitle(taskValues?.title || "");
      setDraftDescription(taskValues?.description || "");
      setDraftPriority(taskValues?.priority || "medium");
    }
  }, [open, defaultServiceId, taskValues]);

  // Re-fetches the target service's current template list whenever the
  // selection changes, so Override/Insert above/Insert below always act on
  // fresh sortOrder positions.
  useEffect(() => {
    setPendingAction(null);
    if (!selectedServiceId) {
      setExistingTemplates([]);
      return;
    }
    let cancelled = false;
    setLoadingTemplates(true);
    fetchAll(
      "projectTemplates:list",
      "id,templateName,description,priority,sortOrder",
      { serviceId: { $eq: Number(selectedServiceId) } },
      ["sortOrder"],
    )
      .then((rows) => {
        if (!cancelled) setExistingTemplates(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedServiceId]);

  const sortedTemplates = useMemo(
    () =>
      existingTemplates.slice().sort((a, b) => {
        const ai = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : Infinity;
        const bi = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : Infinity;
        return ai - bi;
      }),
    [existingTemplates],
  );

  // Human-readable predicted position for the preview step — insertAbove/
  // insertBelow don't overwrite anything, so what the user needs to
  // confirm is WHERE the new row will land, not a before/after diff.
  const describePosition = (action) => {
    const refIndex = sortedTemplates.findIndex((t) => t.id === action.template.id);
    if (action.type === "insertAbove") {
      return refIndex <= 0
        ? tr("Placed at the top of the list, above \"{0}\".", { 0: action.template.templateName })
        : tr("Placed between \"{0}\" and \"{1}\".", { 0: sortedTemplates[refIndex - 1].templateName, 1: action.template.templateName });
    }
    return refIndex === -1 || refIndex >= sortedTemplates.length - 1
      ? tr("Placed at the bottom of the list, below \"{0}\".", { 0: action.template.templateName })
      : tr("Placed between \"{0}\" and \"{1}\".", { 0: action.template.templateName, 1: sortedTemplates[refIndex + 1].templateName });
  };

  // Replaces one existing template's content in place (same id, same
  // sortOrder) — destructive on a shared catalog resource.
  const executeOverride = async (template) => {
    setSaving(true);
    try {
      await apiReq(`projectTemplates:update?filterByTk=${template.id}`, "POST", {
        templateName: draftTitle.trim(),
        description: draftDescription || null,
        priority: draftPriority || null,
      });
      message.success(tr("✅ Template overridden"));
      onSaved();
    } catch (e) {
      console.error(e);
      message.error(tr("Failed to override template"));
    }
    setSaving(false);
  };

  // Same position-aware insert as "Insert task above/below" (sequential
  // 0-based sortOrder, only reindexing rows that actually shift), applied
  // to projectTemplates instead of tasks/meetings.
  const executeInsertAt = async (position, referenceTemplate) => {
    setSaving(true);
    try {
      const targetServiceId = Number(selectedServiceId);
      const refIndex = sortedTemplates.findIndex((t) => t.id === referenceTemplate.id);
      const insertAt = refIndex === -1 ? sortedTemplates.length : position === "above" ? refIndex : refIndex + 1;

      const withPlaceholder = sortedTemplates.slice();
      withPlaceholder.splice(insertAt, 0, { __placeholder: true });
      const reindexOps = [];
      let newSortOrder = insertAt;
      withPlaceholder.forEach((item, i) => {
        if (item.__placeholder) {
          newSortOrder = i;
          return;
        }
        if (Number(item.sortOrder) !== i) {
          reindexOps.push(
            apiReq(`projectTemplates:update?filterByTk=${item.id}`, "POST", {
              sortOrder: i,
            }),
          );
        }
      });

      await Promise.all([
        apiReq("projectTemplates:create", "POST", {
          templateName: draftTitle.trim(),
          description: draftDescription || null,
          priority: draftPriority || null,
          sortOrder: newSortOrder,
          serviceId: targetServiceId,
        }),
        ...reindexOps,
      ]);
      message.success(tr("✅ Saved to template"));
      onSaved();
    } catch (e) {
      console.error(e);
      message.error(tr("Failed to save to template"));
    }
    setSaving(false);
  };

  const handleConfirmPendingAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "override") executeOverride(pendingAction.template);
    else if (pendingAction.type === "insertAbove") executeInsertAt("above", pendingAction.template);
    else if (pendingAction.type === "insertBelow") executeInsertAt("below", pendingAction.template);
  };

  const PRIORITY_LABELS = { high: tr("High"), medium: tr("Medium"), low: tr("Low") };
  const fmtField = (value) => (value === null || value === undefined || value === "" ? "—" : String(value));
  const fmtPriority = (value) => PRIORITY_LABELS[value] || fmtField(value);

  const priorityOptions = Object.entries(PRIORITY_CFG).map(([k, v]) => ({
    value: k,
    label: v.label,
  }));

  // Renders one editable field: label, then (for Override only) the old
  // value struck through for context, then the real input bound to the
  // draft state — same draft feeds whichever action ends up confirmed.
  const renderEditableField = (label, oldValue, input) =>
    React.createElement(
      "div",
      { style: { marginBottom: 10 } },
      renderFieldLabel(label),
      oldValue !== undefined &&
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              color: "#cf1322",
              textDecoration: "line-through",
              marginBottom: 4,
              wordBreak: "break-word",
            },
          },
          fmtField(oldValue),
        ),
      input,
    );

  const renderPreviewStep = () => {
    const isOverride = pendingAction.type === "override";
    return React.createElement(
      "div",
      { style: { fontFamily: FONT } },
      React.createElement(
        "div",
        { style: { fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#262626" } },
        isOverride ? tr("Override this template?") : tr("Save as new template?"),
      ),
      isOverride &&
        React.createElement(
          "div",
          { style: { fontSize: 12, color: "#8c8c8c", marginBottom: 12 } },
          tr("Replacing \"{0}\". Edit the fields below if needed before confirming.", { 0: pendingAction.template.templateName }),
        ),
      renderEditableField(
        tr("Title"),
        isOverride ? pendingAction.template.templateName : undefined,
        React.createElement(Input, {
          value: draftTitle,
          onChange: (e) => setDraftTitle(e.target.value),
          placeholder: tr("Template title"),
        }),
      ),
      renderEditableField(
        tr("Description"),
        isOverride ? pendingAction.template.description : undefined,
        React.createElement(Input.TextArea, {
          value: draftDescription,
          onChange: (e) => setDraftDescription(e.target.value),
          rows: 3,
          placeholder: tr("Description (optional)"),
        }),
      ),
      renderEditableField(
        tr("Priority"),
        isOverride ? fmtPriority(pendingAction.template.priority) : undefined,
        React.createElement(Select, {
          value: draftPriority,
          onChange: setDraftPriority,
          style: { width: 200 },
          options: priorityOptions,
        }),
      ),
      React.createElement(
        "div",
        { style: { marginTop: 10, fontSize: 12, color: isOverride ? "#cf1322" : "#595959" } },
        isOverride ? tr("This cannot be undone.") : describePosition(pendingAction),
      ),
      React.createElement(
        "div",
        { style: { marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 } },
        React.createElement(
          Button,
          {
            style: TASK_DS.secondaryButton,
            disabled: saving,
            onClick: () => setPendingAction(null),
          },
          tr("Back"),
        ),
        React.createElement(
          Button,
          {
            danger: isOverride,
            type: "primary",
            loading: saving,
            disabled: !draftTitle.trim(),
            onClick: handleConfirmPendingAction,
          },
          saving ? tr("Saving...") : isOverride ? tr("Override") : tr("Confirm"),
        ),
      ),
    );
  };

  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      footer: null,
      width: 900,
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        tr("Save to template?"),
      ),
    },
    pendingAction
      ? renderPreviewStep()
      : React.createElement(
      "div",
      { style: { fontFamily: FONT } },
      renderFieldLabel(tr("Standardized service"), true),
      React.createElement(Select, {
        value: selectedServiceId,
        onChange: setSelectedServiceId,
        showSearch: true,
        optionFilterProp: "label",
        style: { width: "100%" },
        placeholder: tr("-- Select a catalog service --"),
        options: serviceCatalog.map((s) => ({
          value: s.id,
          label: s.serviceName,
        })),
      }),
      selectedServiceId &&
        React.createElement(
          "div",
          { style: { marginTop: 16 } },
          renderFieldLabel(tr("Existing templates — override one, or insert above/below it")),
          loadingTemplates
            ? React.createElement(Spin, { size: "small" })
            : sortedTemplates.length === 0
              ? React.createElement(
                  "div",
                  { style: { fontSize: 12, color: "#bfbfbf", padding: "8px 0" } },
                  tr("No existing templates yet for this service — nothing to override or insert relative to."),
                )
              : React.createElement(
                  "div",
                  {
                    style: {
                      maxHeight: 220,
                      overflowY: "auto",
                      border: "1px solid #f0f0f0",
                      borderRadius: 6,
                    },
                  },
                  ...sortedTemplates.map((t) =>
                    React.createElement(
                      "div",
                      {
                        key: t.id,
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 10px",
                          borderBottom: "1px solid #f5f5f5",
                          fontSize: 12,
                          fontFamily: FONT,
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          style: {
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          },
                        },
                        t.templateName,
                      ),
                      React.createElement(
                        Button,
                        {
                          size: "small",
                          disabled: saving,
                          style: { flexShrink: 0 },
                          onClick: () => setPendingAction({ type: "override", template: t }),
                        },
                        tr("Override"),
                      ),
                      React.createElement(
                        Button,
                        {
                          size: "small",
                          disabled: saving,
                          style: { flexShrink: 0 },
                          onClick: () => setPendingAction({ type: "insertAbove", template: t }),
                        },
                        tr("↑ Above"),
                      ),
                      React.createElement(
                        Button,
                        {
                          size: "small",
                          disabled: saving,
                          style: { flexShrink: 0 },
                          onClick: () => setPendingAction({ type: "insertBelow", template: t }),
                        },
                        tr("↓ Below"),
                      ),
                    ),
                  ),
                ),
          React.createElement(
            "div",
            {
              style: {
                marginTop: 12,
                display: "flex",
                justifyContent: "flex-end",
              },
            },
            React.createElement(
              Button,
              { style: TASK_DS.secondaryButton, onClick: onClose },
              tr("Close"),
            ),
          ),
        ),
      !selectedServiceId &&
        React.createElement(
          "div",
          {
            style: {
              marginTop: 20,
              display: "flex",
              justifyContent: "flex-end",
            },
          },
          React.createElement(
            Button,
            { style: TASK_DS.secondaryButton, onClick: onClose },
            tr("Close"),
          ),
        ),
    ),
  );
};

// ── Add Task Modal ─────────────────────────────────────────
const AddTaskModal = ({
  open,
  initialServiceId = null,
  insertPlan = null,
  projectId,
  lawyers,
  services,
  allTasksInProject,
  onSave,
  onClose,
  currentUser,
  hasContract = false,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();

  // Opened from a specific ServiceSection's "⋮" menu — pre-fill (not lock)
  // the Service field with that group's key. Runs on every open since
  // handleClose() below resets the form back to its bare initialValues.
  useEffect(() => {
    if (open && initialServiceId) {
      form.setFieldValue("serviceId", initialServiceId);
    }
  }, [open, initialServiceId]);

  // Default Start date = today, Deadline = today + 2 days. Runs on every
  // open since handleClose() resets the form back to its bare initialValues.
  useEffect(() => {
    if (open) {
      const start = ctx.dayjs();
      form.setFieldsValue({ startDate: start, dueDate: start.add(2, "day") });
    }
  }, [open]);

  const watchedServiceId = Form.useWatch("serviceId", form);
  const watchedPreviousTaskId = Form.useWatch("previousTaskId", form);
  const watchedIsRequiredApproval = Form.useWatch("isRequiredApproval", form);

  useEffect(() => {
    const prevId = form.getFieldValue("previousTaskId");
    if (!prevId) return;
    const prevTaskRecord = allTasksInProject.find(
      (t) => extractId(t.id) === extractId(prevId),
    );
    if (
      prevTaskRecord &&
      watchedServiceId &&
      String(prevTaskRecord.serviceId) !== String(watchedServiceId)
    ) {
      form.setFieldValue("previousTaskId", null);
    }
  }, [watchedServiceId]);

  const tasksForDependency = useMemo(() => {
    if (!watchedServiceId) return allTasksInProject;
    return allTasksInProject.filter(
      (t) => String(t.serviceId) === String(watchedServiceId),
    );
  }, [allTasksInProject, watchedServiceId]);

  const prevTask = useMemo(
    () =>
      allTasksInProject.find(
        (t) => extractId(t.id) === extractId(watchedPreviousTaskId),
      ),
    [allTasksInProject, watchedPreviousTaskId],
  );

  const handleClose = () => {
    onClose();
    form.resetFields();
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const selectedService = services.find(
      (ps) => getProjectServiceTaskKey(ps) === String(values.serviceId || ""),
    );
    if (selectedService && isDeletedServiceRecord(selectedService)) {
      message.warning(
        tr("This service has been deleted; a new task cannot be created."),
      );
      return;
    }
    setSaving(true);
    try {
      let finalStatus = "toDo";
      if (values.previousTaskId) {
        const prev = allTasksInProject.find(
          (t) => extractId(t.id) === extractId(values.previousTaskId),
        );
        if (prev && prev.status !== "done") finalStatus = "blocked";
      }
      const payload = {
        title: values.title.trim(),
        status: finalStatus,
        priority: values.priority,
        projectId,
        isRequiredApproval: !!values.isRequiredApproval,
      };
      if (values.lawyerId) payload.lawyerId = values.lawyerId;
      if (values.serviceId) payload.serviceId = Number(values.serviceId);
      if (values.approvedById) payload.approvedById = values.approvedById;
      if (values.startDate)
        payload.startDate = dateValueToISO(values.startDate);
      if (values.dueDate) payload.dueDate = dateValueToISO(values.dueDate);
      if (values.description) payload.description = values.description;
      if (values.estimatedDuration)
        payload.estimatedDuration = parseFloat(values.estimatedDuration);
      if (values.previousTaskId) payload.previousTaskId = values.previousTaskId;
      if (values.nextStepDescription)
        payload.nextStepDescription = values.nextStepDescription;
      if (insertPlan) payload.taskIndex = insertPlan.newTaskIndex;

      const requests = [apiReq("tasks:create", "POST", payload)];
      if (insertPlan) {
        insertPlan.reindexOps.forEach(({ type, id, newIndex }) => {
          requests.push(
            apiReq(
              `${type === "meeting" ? "meetings" : "tasks"}:update?filterByTk=${id}`,
              "POST",
              { taskIndex: newIndex },
            ),
          );
        });
      }
      await Promise.all(requests);

      message.success(tr("✅ Task created"));
      onSave();
      handleClose();
    } catch {
      message.error(tr("Creation failed"));
    }
    setSaving(false);
  };

  const priorityOptions = useMemo(
    () =>
      Object.entries(PRIORITY_CFG).map(([k, v]) => ({
        value: k,
        label: v.label,
      })),
    [],
  );

  const prevTaskInfo = prevTask
    ? React.createElement(
        "div",
        {
          style: {
            ...(prevTask.status === "done"
              ? TASK_DS.successBox
              : TASK_DS.waitingBox),
            marginTop: 6,
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
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: prevTask.status === "done" ? "#389e0d" : "#722ed1",
              fontWeight: 600,
            },
          },
          prevTask.status === "done"
            ? tr("Done")
            : tr("New task will start as \"Waiting\""),
        ),
      )
    : null;

  const fieldStyle = { marginBottom: 14 };
  const fullFieldStyle = { ...fieldStyle, gridColumn: "1 / -1" };

  return React.createElement(
    Modal,
    {
      open,
      onCancel: handleClose,
      onOk: handleSave,
      confirmLoading: saving,
      okText: saving ? tr("Saving...") : tr("Submit"),
      cancelText: tr("Cancel"),
      width: isMobile ? "94vw" : 900,
      okButtonProps: { style: TASK_DS.primaryButton },
      cancelButtonProps: { style: TASK_DS.secondaryButton },
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        tr("New task"),
      ),
    },
    React.createElement(
      Form,
      {
        form,
        layout: "vertical",
        requiredMark: false,
        initialValues: { priority: "medium", isRequiredApproval: false },
        style: {
          maxHeight: isMobile ? "80vh" : "72vh",
          overflowY: "auto",
          paddingRight: isMobile ? 0 : 4,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: "0 16px",
          },
        },
        React.createElement(
          Form.Item,
          {
            name: "title",
            label: renderFieldLabel(tr("Title"), true),
            rules: [{ required: true, message: tr("Please enter a task name") }],
            style: fullFieldStyle,
          },
          React.createElement(Input, { placeholder: tr("Enter title...") }),
        ),
        React.createElement(
          Form.Item,
          { name: "lawyerId", label: tr("Assignee"), style: fieldStyle },
          React.createElement(LawyerPicker, {
            lawyers,
            size: 20,
            bordered: true,
            showRate: hasContract,
            placeholder: tr("Select assignee"),
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "serviceId",
            label: renderFieldLabel(tr("Service"), true),
            rules: [{ required: true, message: tr("Please select a service") }],
            style: fieldStyle,
            extra:
              services.length === 0
                ? React.createElement(
                    "span",
                    { style: { color: "#d46b08" } },
                    tr("No services in this case yet"),
                  )
                : undefined,
          },
          React.createElement(Select, {
            placeholder: tr("-- Select service --"),
            allowClear: true,
            disabled: services.length === 0,
            // Hiển thị TẤT CẢ projectServices (cả catalog và custom)
            // Catalog service: value = ps.serviceId
            // Custom service: value = ps.id (projectService id, dùng làm key thống nhất)
            options: services.map((ps) => {
              const disabled = isDeletedServiceRecord(ps);
              const serviceLabel = ps.serviceName || tr("Service #{0}", { 0: ps.id });
              return {
                value: getProjectServiceTaskKey(ps),
                label: `${serviceLabel}${disabled ? " (Locked)" : ""}`,
                disabled,
              };
            }),
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "startDate", label: tr("Start date"), style: fieldStyle },
          React.createElement(DatePicker, {
            style: { width: "100%" },
            format: "DD/MM/YYYY",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "dueDate", label: tr("Deadline"), style: fieldStyle },
          React.createElement(DatePicker, {
            style: { width: "100%" },
            format: "DD/MM/YYYY",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "description", label: tr("Description"), style: fullFieldStyle },
          React.createElement(Input.TextArea, {
            rows: 3,
            placeholder: tr("Description..."),
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "nextStepDescription",
            label: tr("Next Step"),
            style: fullFieldStyle,
          },
          React.createElement(Input.TextArea, {
            rows: 2,
            placeholder: tr("Next step after completion..."),
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "estimatedDuration",
            label: tr("Estimated duration"),
            style: fieldStyle,
          },
          React.createElement(InputNumber, {
            style: { width: "100%" },
            min: 0,
            placeholder: tr("e.g., 4"),
            addonAfter: "hours",
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "previousTaskId",
            label: tr("Pending Issue (optional)"),
            style: fieldStyle,
            extra: prevTaskInfo,
          },
          React.createElement(TaskPicker, {
            allTasks: tasksForDependency,
            currentTaskId: null,
            services,
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "priority", label: tr("Priority"), style: fieldStyle },
          React.createElement(Segmented, { options: priorityOptions }),
        ),
        React.createElement(
          "div",
          { style: fullFieldStyle },
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns:
                  !isMobile && watchedIsRequiredApproval
                    ? "repeat(2, minmax(0, 1fr))"
                    : "1fr",
                gap: "0 16px",
                padding: 12,
                border: "1px solid #f0f0f0",
                borderRadius: 6,
                background: "#fafafa",
              },
            },
            React.createElement(
              Form.Item,
              {
                name: "isRequiredApproval",
                label: tr("Approval required"),
                valuePropName: "checked",
                style: { marginBottom: 0 },
              },
              React.createElement(Switch, {
                checkedChildren: tr("On"),
                unCheckedChildren: tr("Off"),
                onChange: (checked) => {
                  if (!checked) form.setFieldValue("approvedById", null);
                },
              }),
            ),
            watchedIsRequiredApproval &&
              React.createElement(
                Form.Item,
                {
                  name: "approvedById",
                  label: tr("Approver"),
                  style: { marginBottom: 0, marginTop: isMobile ? 14 : 0 },
                  extra: tr("Required because approval is enabled for this task."),
                },
                React.createElement(LawyerPicker, {
                  lawyers,
                  size: 20,
                  bordered: true,
                  showRate: hasContract,
                  placeholder: tr("Select approver"),
                }),
              ),
          ),
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
  hasContract = false,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const watchedIsRequiredApproval = Form.useWatch("isRequiredApproval", form);
  const isMobile = useIsMobile();

  // Default Start date = today, Deadline = today + 2 days. Runs on every
  // open since handleClose() below resets the form back to its bare initialValues.
  useEffect(() => {
    if (open) {
      const start = ctx.dayjs();
      form.setFieldsValue({ startDate: start, deadline: start.add(2, "day") });
    }
  }, [open]);

  const handleClose = () => {
    onClose();
    form.resetFields();
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const payload = withTaskLinkedUrl(
        {
          subTaskName: values.title.trim(),
          status: "toDo",
          priority: values.priority,
          taskId: parentTaskId,
          isRequiredApproval: !!values.isRequiredApproval,
        },
        { taskId: parentTaskId },
        "subTask",
      );
      if (values.lawyerId) payload.lawyerId = values.lawyerId;
      if (values.approvedById) payload.approvedById = values.approvedById;
      if (values.startDate)
        payload.startDate = dateValueToISO(values.startDate);
      if (values.deadline) payload.deadline = dateValueToISO(values.deadline);
      if (values.description) payload.description = values.description;
      if (values.estimatedDuration)
        payload.estimatedDuration = parseFloat(values.estimatedDuration);
      if (values.nextStepDescription)
        payload.nextStepDescription = values.nextStepDescription;
      await apiReq("subTasks:create", "POST", payload);
      message.success(tr("✅ Subtask created"));
      onSave();
      handleClose();
    } catch {
      message.error(tr("Creation failed"));
    }
    setSaving(false);
  };

  const priorityOptions = useMemo(
    () =>
      Object.entries(PRIORITY_CFG).map(([k, v]) => ({
        value: k,
        label: v.label,
      })),
    [],
  );

  const fieldStyle = { marginBottom: 14 };
  const fullFieldStyle = { ...fieldStyle, gridColumn: "1 / -1" };

  return React.createElement(
    Modal,
    {
      open,
      onCancel: handleClose,
      onOk: handleSave,
      confirmLoading: saving,
      okText: saving ? tr("Saving...") : tr("Submit"),
      cancelText: tr("Cancel"),
      width: isMobile ? "94vw" : 640,
      okButtonProps: { style: TASK_DS.primaryButton },
      cancelButtonProps: { style: TASK_DS.secondaryButton },
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        tr("New subtask"),
      ),
    },
    React.createElement(
      Form,
      {
        form,
        layout: "vertical",
        requiredMark: false,
        initialValues: { priority: "medium", isRequiredApproval: false },
        style: {
          maxHeight: isMobile ? "80vh" : "72vh",
          overflowY: "auto",
          paddingRight: isMobile ? 0 : 4,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: "0 16px",
          },
        },
        React.createElement(
          Form.Item,
          {
            name: "title",
            label: renderFieldLabel(tr("Title"), true),
            rules: [{ required: true, message: tr("Please enter a subtask name") }],
            style: fullFieldStyle,
          },
          React.createElement(Input, { placeholder: tr("Enter title...") }),
        ),
        React.createElement(
          Form.Item,
          { name: "lawyerId", label: tr("Assignee"), style: fieldStyle },
          React.createElement(LawyerPicker, {
            lawyers,
            size: 20,
            bordered: true,
            showRate: hasContract,
            placeholder: tr("Select assignee"),
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "description",
            label: tr("Detailed Description"),
            style: fullFieldStyle,
          },
          React.createElement(Input.TextArea, {
            rows: 3,
            placeholder: tr("Describe the subtask in detail..."),
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "nextStepDescription",
            label: tr("Next Step"),
            style: fullFieldStyle,
          },
          React.createElement(Input.TextArea, {
            rows: 2,
            placeholder: tr("Next step after completion..."),
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "estimatedDuration",
            label: tr("Estimated duration"),
            style: fieldStyle,
          },
          React.createElement(InputNumber, {
            style: { width: "100%" },
            min: 0,
            placeholder: tr("e.g., 4"),
            addonAfter: "hours",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "startDate", label: tr("Start date"), style: fieldStyle },
          React.createElement(DatePicker, {
            style: { width: "100%" },
            format: "DD/MM/YYYY",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "deadline", label: tr("Deadline"), style: fieldStyle },
          React.createElement(DatePicker, {
            style: { width: "100%" },
            format: "DD/MM/YYYY",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "priority", label: tr("Priority"), style: fieldStyle },
          React.createElement(Segmented, { options: priorityOptions }),
        ),
        React.createElement(
          "div",
          { style: fullFieldStyle },
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns:
                  !isMobile && watchedIsRequiredApproval
                    ? "repeat(2, minmax(0, 1fr))"
                    : "1fr",
                gap: "0 16px",
                padding: 12,
                border: "1px solid #f0f0f0",
                borderRadius: 6,
                background: "#fafafa",
              },
            },
            React.createElement(
              Form.Item,
              {
                name: "isRequiredApproval",
                label: tr("Approval required"),
                valuePropName: "checked",
                style: { marginBottom: 0 },
              },
              React.createElement(Switch, {
                checkedChildren: tr("On"),
                unCheckedChildren: tr("Off"),
                onChange: (checked) => {
                  if (!checked) form.setFieldValue("approvedById", null);
                },
              }),
            ),
            watchedIsRequiredApproval &&
              React.createElement(
                Form.Item,
                {
                  name: "approvedById",
                  label: tr("Approver"),
                  style: { marginBottom: 0, marginTop: isMobile ? 14 : 0 },
                  extra:
                    tr("Required because approval is enabled for this subtask."),
                },
                React.createElement(LawyerPicker, {
                  lawyers,
                  size: 20,
                  bordered: true,
                  showRate: hasContract,
                  placeholder: tr("Select approver"),
                }),
              ),
          ),
        ),
      ),
    ),
  );
};

// ── Task File Preview Popup (inline trong row) ──────────────
const TaskFilePreviewPopup = ({ files, onClose, anchorRect }) => {
  const [previewDoc, setPreviewDoc] = useState(null);
  if (previewDoc) {
    return React.createElement(PreviewModal, {
      doc: previewDoc,
      onClose: () => setPreviewDoc(null),
    });
  }

  return React.createElement(
    React.Fragment,
    null,
    React.createElement("div", {
      style: { position: "fixed", inset: 0, zIndex: 9990 },
      onClick: onClose,
    }),
    React.createElement(
      "div",
      {
        style: {
          position: "fixed",
          // 🌟 FIX LỖI: Đã gỡ bỏ window.innerHeight, thay bằng giới hạn an toàn 450
          top: anchorRect ? Math.min(anchorRect.bottom + 6, 450) : 200,
          left: anchorRect ? Math.max(anchorRect.right - 280, 10) : 200,
          zIndex: 9991,
          background: "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: 8,
          boxShadow: "0 8px 28px rgba(0,0,0,0.16)",
          minWidth: 280,
          maxWidth: 360,
          maxHeight: 320,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
        onClick: (e) => e.stopPropagation(),
      },
      // Header
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 14px",
            borderBottom: "1px solid #f0f0f0",
            background: "#fafafa",
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
              fontSize: 12,
              fontFamily: FONT,
              fontWeight: 700,
              color: "#096dd9",
            },
          },
          tr("📎 {0} documents", { 0: files.length }),
        ),
        React.createElement(
          "span",
          {
            onClick: onClose,
            style: {
              fontSize: 16,
              color: "#bfbfbf",
              cursor: "pointer",
              lineHeight: 1,
              padding: "0 2px",
            },
          },
          "×",
        ),
      ),
      // File list
      React.createElement(
        "div",
        { style: { overflowY: "auto", flex: 1, padding: "6px 0" } },
        ...files.map((f) => {
          const att = Array.isArray(f.fileAttachment)
            ? f.fileAttachment[0]
            : f.fileAttachment;
          const fileExt = att?.extname || "";
          const extInfo = getExtInfo(fileExt);
          const fullUrl = getFullUrl(att?.url || att?.preview);
          const name = f.title || att?.title || att?.filename || "(Untitled)";

          // 🌟 Mở rộng danh sách Preview cho cả file Office
          const canPreview = [
            ".pdf",
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".webp",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx",
            ".ppt",
            ".pptx",
            ".odt",
          ].includes(fileExt.toLowerCase());

          return React.createElement(
            "div",
            {
              key: f.id,
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                borderBottom: "1px solid #f8f8f8",
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.background = "#f9f0ff";
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.background = "transparent";
              },
            },
            React.createElement(
              "span",
              { style: { fontSize: 15, flexShrink: 0 } },
              extInfo.icon,
            ),

            // 🌟 LOGIC CLICK PREVIEW & TEXT XANH
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: canPreview ? "#1890ff" : "#595959",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: canPreview ? 600 : 500,
                  cursor: canPreview ? "pointer" : "default",
                  textDecoration: canPreview ? "underline" : "none",
                  textUnderlineOffset: "2px",
                },
                title: canPreview
                  ? tr("Click to preview")
                  : tr("This format doesn't support preview"),
                onClick: canPreview
                  ? (e) => {
                      e.stopPropagation();
                      setPreviewDoc(f);
                    }
                  : undefined,
              },
              name + fileExt,
            ),

            // 🌟 Nút Tải Về
            React.createElement(
              "div",
              { style: { display: "flex", gap: 4, flexShrink: 0 } },
              fullUrl &&
                React.createElement(
                  "span",
                  {
                    title: tr("Download"),
                    onClick: (e) => {
                      e.stopPropagation();
                      window.open(fullUrl, "_blank");
                    },
                    style: {
                      fontSize: 12,
                      padding: "2px 6px",
                      borderRadius: 3,
                      border: "1px solid #91caff",
                      color: "#096dd9",
                      cursor: "pointer",
                      background: "#fff",
                    },
                    onMouseEnter: (e) =>
                      (e.currentTarget.style.background = "#e6f4ff"),
                    onMouseLeave: (e) =>
                      (e.currentTarget.style.background = "#fff"),
                  },
                  "⬇️",
                ),
            ),
          );
        }),
      ),
    ),
  );
};

// ── Task Row ───────────────────────────────────────────────
const TaskRow = ({
  task,
  stt,
  lawyers,
  onStatus,
  onOpen,
  onAssign,
  contractType,
  hasContract,
  linkablePaymentRequests,
  contractServiceIdByProjectServiceId,
  paymentRequestServiceIdsByPrId,
  serviceNameByContractServiceId,
  onUpdateField,
  expanded,
  onToggle,
  isManager = false,
  onOpenAddSubModal,
  allTasksInProject,
  tasksInService,
  isAssigneeOnly = false,
  myLawyerId = null,
  onDeleteTask,
  onReorderTask,
  onInsertTask,
  onSaveTaskAsTemplate,
  groupServiceKey,
}) => {
  const [hov, setHov] = useState(false);
  const [dragOverPos, setDragOverPos] = useState(null); // "before" | "after" | null
  const [showMenu, setShowMenu] = useState(false);
  const rowMenuAnchorRef = useRef(null);
  const rowMenuRef = useRef(null);
  const rowMenuUp = useDropdownFlip(showMenu, rowMenuAnchorRef, rowMenuRef);
  // Closing on the trigger+dropdown wrapper's mouseleave right away is too
  // sensitive: the gap between the 22px trigger and the dropdown (top: 28)
  // isn't covered by any element from this widget, so a slower mouse path
  // can register as "left the wrapper" for an instant, closing the menu
  // before the user reaches an item. A short delay (cancelled by
  // mouseenter if the pointer comes back within it) is the standard
  // hover-menu fix — tolerates that dead zone instead of requiring
  // pixel-perfect movement.
  const menuCloseTimerRef = useRef(null);
  const scheduleMenuClose = () => {
    if (menuCloseTimerRef.current) clearTimeout(menuCloseTimerRef.current);
    menuCloseTimerRef.current = setTimeout(() => setShowMenu(false), 350);
  };
  const cancelMenuClose = () => {
    if (menuCloseTimerRef.current) {
      clearTimeout(menuCloseTimerRef.current);
      menuCloseTimerRef.current = null;
    }
  };
  useEffect(
    () => () => {
      if (menuCloseTimerRef.current) clearTimeout(menuCloseTimerRef.current);
    },
    [],
  );
  const hasSubs = task._subs?.length > 0;
  const done = task._subs?.filter((s) => s.status === "done").length || 0;
  const total = task._subs?.length || 0;
  const isBlocked = task.status === "blocked";
  const serviceDeleted = isTaskServiceDeleted(task);
  const taskRecordId = getTaskRecordId(task);

  // 🌟 FIX QUYỀN TRÊN TABLE ROW (Quét cả trường lawyer)
  const taskLawyerId = extractId(task.lawyerId) || extractId(task.lawyer);
  const isAssignedToThis = myLawyerId && taskLawyerId === extractId(myLawyerId);
  const canEdit = !serviceDeleted && (isManager || isAssignedToThis);
  const menuActive = hov || showMenu;
  const handleTaskMenuAction = (event, action) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!taskRecordId) {
      setShowMenu(false);
      message.error(tr("Task ID not found for this action."));
      return;
    }

    if (action === "addSubTask") {
      onToggle(taskRecordId, true);
      onOpenAddSubModal(taskRecordId);
      setShowMenu(false);
      return;
    }

    if (action === "insertAbove" || action === "insertBelow") {
      if (typeof onInsertTask !== "function") {
        message.error(tr("The insert task action has not been configured."));
        setShowMenu(false);
        return;
      }
      onInsertTask(action === "insertAbove" ? "above" : "below", task);
      setShowMenu(false);
      return;
    }

    if (action === "saveAsTemplate") {
      if (typeof onSaveTaskAsTemplate !== "function") {
        message.error(tr("The save as template action has not been configured."));
        setShowMenu(false);
        return;
      }
      onSaveTaskAsTemplate(task);
      setShowMenu(false);
      return;
    }

    if (action === "deleteTask") {
      if (typeof onDeleteTask !== "function") {
        console.error("[TaskManagement] onDeleteTask handler is missing", {
          taskRecordId,
          task,
        });
        message.error(tr("The delete task action has not been configured."));
        setShowMenu(false);
        return;
      }
      onDeleteTask(taskRecordId, "task", task.title);
      setShowMenu(false);
    }
  };

  const canDrag = !serviceDeleted && typeof onReorderTask === "function";
  const handleRowDragStart = (e) => {
    if (!canDrag) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "task", id: extractId(task.id) }),
    );
  };
  const handleRowDragOver = (e) => {
    if (!canDrag) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
    setDragOverPos(pos);
    e.dataTransfer.dropEffect = "move";
  };
  const handleRowDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverPos(null);
  };
  const handleRowDrop = (e) => {
    if (!canDrag) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = dragOverPos;
    setDragOverPos(null);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (!payload || (payload.type !== "task" && payload.type !== "meeting")) return;
    onReorderTask(
      payload.type,
      payload.id,
      "task",
      extractId(task.id),
      groupServiceKey,
      pos || "before",
    );
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      {
        id: `task-row-${taskRecordId}`,
        "data-task-id": taskRecordId,
        "data-record-type": "task",
        style: {
          display: "flex",
          alignItems: "center",
          minHeight: 44,
          background: dragOverPos
            ? "#e6f4ff"
            : serviceDeleted
              ? "#fafafa"
              : isBlocked
                ? "#fdf6ff"
                : hov
                  ? "#f0f7ff"
                  : "#fff",
          transition: "background 0.1s",
          borderLeft: serviceDeleted
            ? "3px solid #bfbfbf"
            : isBlocked
              ? "3px solid #722ed1"
              : "3px solid transparent",
          borderTop:
            dragOverPos === "before"
              ? "2px dashed #1677ff"
              : "2px solid transparent",
          borderBottom: dragOverPos === "after" ? "2px dashed #1677ff" : "none",
          outline: dragOverPos ? "2px dashed #1677ff" : "none",
          outlineOffset: dragOverPos ? -2 : undefined,
          width: "100%",
          cursor: canDrag ? "grab" : undefined,
        },
        draggable: canDrag,
        onDragStart: handleRowDragStart,
        onDragOver: handleRowDragOver,
        onDragLeave: handleRowDragLeave,
        onDrop: handleRowDrop,
        onMouseEnter: () => setHov(true),
        onMouseLeave: () => setHov(false),
      },
      // Context menu
      React.createElement(
        "div",
        {
          ref: rowMenuAnchorRef,
          style: {
            width: COL.menu,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          },
          onMouseEnter: cancelMenuClose,
          onMouseLeave: scheduleMenuClose,
        },
        canEdit
          ? React.createElement(
              "div",
              {
                onMouseDown: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                },
                onClick: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu((v) => !v);
                },
                style: {
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: menuActive ? "#e6f4ff" : "transparent",
                  border: menuActive
                    ? "1px solid #91caff"
                    : "1px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 12,
                  color: menuActive ? "#096dd9" : "#8c8c8c",
                  fontWeight: 700,
                  transition: "all 0.15s",
                  userSelect: "none",
                },
              },
              "⋮",
            )
          : React.createElement(
              "span",
              { style: { fontSize: 12, color: "#d9d9d9" } },
              "",
            ),

        showMenu &&
          canEdit &&
          React.createElement(
            "div",
            {
              ref: rowMenuRef,
              style: {
                position: "absolute",
                left: 0,
                ...(rowMenuUp ? { bottom: 28 } : { top: 28 }),
                zIndex: 9999,
                background: "#fff",
                border: "1px solid #e8e8e8",
                borderRadius: 6,
                boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
                minWidth: 180,
                padding: "4px 0",
              },
              onMouseDown: (e) => {
                e.preventDefault();
                e.stopPropagation();
              },
              onClick: (e) => e.stopPropagation(),
            },
            canEdit &&
              React.createElement(
                "div",
                {
                  onClick: (e) => handleTaskMenuAction(e, "insertAbove"),
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#262626",
                  },
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.background = "#f5f5f5"),
                  onMouseLeave: (e) =>
                    (e.currentTarget.style.background = "transparent"),
                },
                React.createElement("span", null, "⬆️"),
                tr("Insert task above"),
              ),
            canEdit &&
              React.createElement(
                "div",
                {
                  onClick: (e) => handleTaskMenuAction(e, "insertBelow"),
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#262626",
                  },
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.background = "#f5f5f5"),
                  onMouseLeave: (e) =>
                    (e.currentTarget.style.background = "transparent"),
                },
                React.createElement("span", null, "⬇️"),
                tr("Insert task below"),
              ),
            canEdit &&
              React.createElement(
                "div",
                {
                  onClick: (e) => handleTaskMenuAction(e, "addSubTask"),
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#262626",
                  },
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.background = "#f5f5f5"),
                  onMouseLeave: (e) =>
                    (e.currentTarget.style.background = "transparent"),
                },
                React.createElement("span", null, "➕"),
                tr("Create subtask"),
              ),
            canEdit &&
              React.createElement(
                "div",
                {
                  onClick: (e) => handleTaskMenuAction(e, "saveAsTemplate"),
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#262626",
                  },
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.background = "#f5f5f5"),
                  onMouseLeave: (e) =>
                    (e.currentTarget.style.background = "transparent"),
                },
                React.createElement("span", null, "📋"),
                tr("Save as template"),
              ),
            canEdit &&
              React.createElement(
                "div",
                {
                  onClick: (e) => handleTaskMenuAction(e, "deleteTask"),
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#cf1322",
                  },
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.background = "#fff1f0"),
                  onMouseLeave: (e) =>
                    (e.currentTarget.style.background = "transparent"),
                },
                React.createElement("span", null, "🗑️"),
                tr("Delete task"),
              ),
          ),
      ),
      // STT
      React.createElement(
        "div",
        {
          style: {
            width: COL.stt,
            flexShrink: 0,
            textAlign: "center",
            fontSize: 12,
            fontFamily: FONT,
            color: "black",
            fontWeight: 500,
          },
        },
        stt,
      ),
      // Toggle
      React.createElement(
        "div",
        {
          onClick: serviceDeleted ? undefined : () => onToggle(task.id),
          style: {
            width: COL.toggle,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: !serviceDeleted && hasSubs ? "pointer" : "default",
            flexShrink: 0,
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 700,
          },
          onMouseEnter: (e) => {
            if (!serviceDeleted && hasSubs)
              e.currentTarget.style.background = "#e6f4ff";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = "transparent";
          },
        },
        hasSubs ? (expanded ? "▾" : "▸") : " ",
      ),
      // Title
      React.createElement(
        "div",
        {
          "data-task-id": taskRecordId,
          "data-action": "open-task-detail",
          onClick: serviceDeleted
            ? undefined
            : () => onOpen(task, "task", tasksInService),
          title: serviceDeleted ? tr("Service is locked") : undefined,
          style: {
            flex: 1,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: FONT,
            cursor: serviceDeleted ? "not-allowed" : "pointer",
            color: task._od
              ? "#cf1322"
              : STATUS_CFG[task.status]?.color || "#262626",
            minWidth: 200,
            wordBreak: "break-word",
            whiteSpace: "normal",
            lineHeight: 1.55,
          },
        },
        task.title,
        hasSubs &&
          React.createElement(
            "span",
            {
              style: {
                display: "inline-block",
                marginLeft: 6,
                fontSize: 11,
                fontFamily: FONT,
                color: "#8c8c8c",
                background: "#f0f0f0",
                borderRadius: 8,
                padding: "1px 6px",
                fontWeight: 400,
                verticalAlign: "middle",
                whiteSpace: "nowrap",
              },
            },
            `${done}/${total}`,
          ),
      ),
      // Trạng thái
      React.createElement(
        "div",
        {
          style: {
            flex: `0 1 ${COL.status}px`,
            minWidth: 0,
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
          },
        },
        React.createElement(StatusBtn, {
          status: task.status,
          onChange: canEdit ? (s) => onStatus(task.id, s, "task") : null,
          isRequiredApproval: task.isRequiredApproval,
          isBlocked,
          readOnly: !canEdit,
        }),
      ),
      // Trigger Payment (replaces Updated At — see TriggerCell's own comment)
      React.createElement(TriggerCell, {
        task,
        contractType,
        hasContract,
        linkablePaymentRequests,
        contractServiceIdByProjectServiceId,
        paymentRequestServiceIdsByPrId,
        serviceNameByContractServiceId,
        onUpdateField,
        disabled: !canEdit,
      }),
      // Lawyer picker
      React.createElement(
        "div",
        {
          style: {
            flex: `0 1 ${COL.assign}px`,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        },
        React.createElement(LawyerPicker, {
          lawyers,
          value: task.lawyerId,
          size: 22,
          readOnly: serviceDeleted || !isManager || isAssigneeOnly,
          showRate: hasContract,
          onChange: (id, n, c) => onAssign(task.id, id, n, c, "task"),
        }),
      ),
      // Description
      React.createElement(
        "div",
        {
          style: {
            flex: `0 1 ${COL.desc}px`,
            minWidth: 0,
            padding: "4px 8px",
            display: "flex",
            alignItems: "flex-start",
          },
        },
        task.description
          ? React.createElement(
              Tooltip,
              { title: task.description, placement: "topLeft" },
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#595959",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.5,
                    cursor: "pointer",
                  },
                },
                task.description,
              ),
            )
          : React.createElement(
              "span",
              { style: { fontSize: 12, fontFamily: FONT, color: "#d9d9d9" } },
              "—",
            ),
      ),
      // Start date
      React.createElement(
        "div",
        {
          style: {
            flex: `0 1 ${COL.start}px`,
            minWidth: 0,
            textAlign: "center",
            fontSize: 12,
            fontFamily: FONT,
            color: "#8c8c8c",
          },
        },
        fmt(task.startDate, "date") || "—",
      ),
      // Deadline
      React.createElement(
        "div",
        {
          style: {
            flex: `0 1 ${COL.deadline}px`,
            minWidth: 0,
            textAlign: "center",
            fontSize: 12,
            fontFamily: FONT,
            color: task._od ? "#cf1322" : task._today ? "#d46b08" : "#8c8c8c",
            fontWeight: task._today ? 700 : 400,
          },
        },
        fmt(task.dueDate, "date") || "—",
      ),
      // Pending Issue
      React.createElement(PendingIssueCell, {
        task,
        allTasksInProject,
        lawyers,
      }),
      // Next Step
      React.createElement(
        "div",
        {
          style: {
            flex: `0 1 ${COL.nextStep}px`,
            minWidth: 0,
            padding: "4px 8px",
            display: "flex",
            alignItems: "flex-start",
          },
        },
        task.nextStepDescription
          ? React.createElement(
              Tooltip,
              { title: task.nextStepDescription, placement: "topLeft" },
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#096dd9",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.5,
                    cursor: "pointer",
                    fontWeight: 500,
                  },
                },
                `→ ${task.nextStepDescription}`,
              ),
            )
          : React.createElement(
              "span",
              { style: { fontSize: 12, fontFamily: FONT, color: "#d9d9d9" } },
              "—",
            ),
      ),
      React.createElement(ApprovalIcon, {
        isRequiredApproval: task.isRequiredApproval,
      }),
    ),
    // SubTask rows
    expanded &&
      React.createElement(
        "div",
        {
          style: { background: "#fafcff" },
        },
        ...(task._subs || []).map((s, index) => {
          // 🌟 SỬA ĐOẠN NÀY
          const subTaskRecordId = getSubTaskRecordId(s);
          const subLawyerId = extractId(s.lawyerId) || extractId(s.lawyer);
          const canEditSub =
            !serviceDeleted &&
            (isManager ||
              (myLawyerId && subLawyerId === extractId(myLawyerId)));
          const isSubBlocked = s.status === "blocked";
          const i = index + 1;
          return React.createElement(
            "div",
            {
              key: s.id,
              id: `subtask-row-${subTaskRecordId}`,
              "data-task-id": taskRecordId, // id task cha
              "data-subtask-id": subTaskRecordId, // id subtask
              "data-record-type": "subTask",
              style: {
                display: "flex",
                alignItems: "center",
                minHeight: 38,
                borderBottom: "1px solid #f0f0f0",
                background: isSubBlocked ? "#fdf6ff" : "#fafcff",
                borderLeft: "3px solid transparent",
              },
            },
            // 14. Cột Menu
            React.createElement(
              "div",
              {
                style: {
                  width: COL.menu,
                  flexShrink: 0,
                  display: "flex",
                  justifyContent: "center",
                },
              },
              isManager && !serviceDeleted
                ? React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 14,
                        color: "#cf1322",
                        cursor: "pointer",
                      },
                      title: tr("Delete subtask"),
                      onClick: (e) => {
                        e.stopPropagation();
                        onDeleteTask(subTaskRecordId, "subTask", s.subTaskName);
                      },
                    },
                    "🗑️",
                  )
                : React.createElement(
                    "span",
                    { style: { fontSize: 12, color: "#d9d9d9" } },
                    "—",
                  ),
            ),
            // 1. Cột STT (Để trống hoặc hiển thị ký hiệu con)
            React.createElement("div", {
              style: { width: COL.stt, flexShrink: 0 },
            }),
            // 2. Cột Toggle (Hiển thị đường dẫn góc L)
            React.createElement(
              "div",
              {
                style: {
                  width: COL.toggle,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
              },
              React.createElement(
                "span",
                { style: { color: "#d9d9d9", fontSize: 10 } },
                "└─",
              ),
            ),
            // 3. Cột Title (Dùng flex: 1 để khớp với task chính)
            React.createElement(
              "div",
              {
                onClick: serviceDeleted
                  ? undefined
                  : () => onOpen(s, "subTask"),
                title: serviceDeleted ? tr("Service is locked") : undefined,
                style: {
                  flex: 1,
                  padding: "0 10px",
                  fontSize: 12,
                  fontFamily: FONT,
                  color: s._od
                    ? "#cf1322"
                    : STATUS_CFG[s.status]?.color || "#595959",
                  cursor: serviceDeleted ? "not-allowed" : "pointer",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              s.subTaskName,
            ),
            // 4. Cột Trạng thái
            React.createElement(
              "div",
              {
                style: {
                  flex: `0 1 ${COL.status}px`,
                  minWidth: 0,
                  padding: "0 8px",
                  display: "flex",
                  alignItems: "center",
                },
              },
              React.createElement(StatusBtn, {
                status: s.status,
                onChange: canEditSub
                  ? (st) => onStatus(s.id, st, "subTask")
                  : null,
                isRequiredApproval: s.isRequiredApproval,
                isBlocked: isSubBlocked,
                readOnly: !canEditSub,
              }),
            ),
            // 5. Cột UpdatedAt
            React.createElement(
              "div",
              {
                style: {
                  flex: `0 1 ${COL.updatedAt}px`,
                  minWidth: 0,
                  textAlign: "center",
                  fontSize: 12,
                  fontFamily: FONT,
                  color: s.updatedAt ? "#8c8c8c" : "#d9d9d9",
                },
              },
              s.updatedAt ? fmt(s.updatedAt, "full") : "—",
            ),
            // 6. Cột Lawyer Picker
            React.createElement(
              "div",
              {
                style: {
                  flex: `0 1 ${COL.assign}px`,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
              },
              React.createElement(LawyerPicker, {
                lawyers,
                value: s.lawyerId,
                size: 20,
                readOnly: serviceDeleted || !isManager || isAssigneeOnly,
                showRate: hasContract,
                onChange: (id, n, c) => onAssign(s.id, id, n, c, "subTask"),
              }),
            ),
            // 7. Cột Description
            React.createElement(
              "div",
              {
                style: { flex: `0 1 ${COL.desc}px`, minWidth: 0, padding: "4px 8px" },
              },
              s.description
                ? React.createElement(
                    Tooltip,
                    { title: s.description, placement: "topLeft" },
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 12,
                          fontFamily: FONT,
                          color: "#8c8c8c",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          lineHeight: 1.5,
                        },
                      },
                      s.description,
                    ),
                  )
                : React.createElement(
                    "span",
                    { style: { fontSize: 12, color: "#d9d9d9" } },
                    "—",
                  ),
            ),
            // 8. Cột Start Date
            React.createElement(
              "div",
              {
                style: {
                  flex: `0 1 ${COL.start}px`,
                  minWidth: 0,
                  textAlign: "center",
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#8c8c8c",
                },
              },
              fmt(s.date, "date") || "—",
            ),
            // 9. Cột Deadline
            React.createElement(
              "div",
              {
                style: {
                  flex: `0 1 ${COL.deadline}px`,
                  minWidth: 0,
                  textAlign: "center",
                  fontSize: 12,
                  fontFamily: FONT,
                  color: s._od ? "#cf1322" : "#8c8c8c",
                },
              },
              fmt(s.deadline, "date") || "—",
            ),
            // 10. Cột Pending Issue (Subtask thường không có dependency phức tạp)
            React.createElement("div", {
              style: { flex: `0 1 ${COL.pendingIssue}px`, minWidth: 0 },
            }),
            // 11. Cột Next Step
            React.createElement("div", {
              style: { flex: `0 1 ${COL.nextStep}px`, minWidth: 0 },
            }),
            // 13. Cột Approval Icon
            React.createElement(ApprovalIcon, {
              isRequiredApproval: s.isRequiredApproval,
            }),
          );
        }),
      ),
  );
};
// ── Meeting Row (matches TaskRow's columns; drag-reorderable alongside tasks) ──
const MeetingRow = ({ meeting, stt, onOpen, onReorderTask, groupServiceKey }) => {
  const [hov, setHov] = useState(false);
  const [dragOverPos, setDragOverPos] = useState(null); // "before" | "after" | null
  const statusCfg =
    MEETING_STATUS_CFG[meeting.status] || MEETING_STATUS_CFG.scheduled;

  const canDrag = typeof onReorderTask === "function";
  const handleRowDragStart = (e) => {
    if (!canDrag) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "meeting", id: extractId(meeting.id) }),
    );
  };
  const handleRowDragOver = (e) => {
    if (!canDrag) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
    setDragOverPos(pos);
    e.dataTransfer.dropEffect = "move";
  };
  const handleRowDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverPos(null);
  };
  const handleRowDrop = (e) => {
    if (!canDrag) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = dragOverPos;
    setDragOverPos(null);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (!payload || (payload.type !== "task" && payload.type !== "meeting")) return;
    onReorderTask(
      payload.type,
      payload.id,
      "meeting",
      extractId(meeting.id),
      groupServiceKey,
      pos || "before",
    );
  };

  return React.createElement(
    "div",
    {
      onClick: () => onOpen(meeting),
      onMouseEnter: () => setHov(true),
      onMouseLeave: () => setHov(false),
      draggable: canDrag,
      onDragStart: handleRowDragStart,
      onDragOver: handleRowDragOver,
      onDragLeave: handleRowDragLeave,
      onDrop: handleRowDrop,
      style: {
        display: "flex",
        alignItems: "center",
        minHeight: 44,
        background: dragOverPos ? "#e6f4ff" : hov ? "#f0f7ff" : "#fff",
        transition: "background 0.1s",
        borderLeft: "3px solid transparent",
        borderTop:
          dragOverPos === "before"
            ? "2px dashed #1677ff"
            : "2px solid transparent",
        borderBottom: dragOverPos === "after" ? "2px dashed #1677ff" : "none",
        outline: dragOverPos ? "2px dashed #1677ff" : "none",
        outlineOffset: dragOverPos ? -2 : undefined,
        width: "100%",
        cursor: canDrag ? "grab" : "pointer",
      },
    },
    React.createElement("div", { style: { width: COL.menu, flexShrink: 0 } }),
    React.createElement(
      "div",
      {
        style: {
          width: COL.stt,
          flexShrink: 0,
          textAlign: "center",
          fontSize: 12,
          color: "#8c8c8c",
        },
      },
      stt,
    ),
    React.createElement("div", { style: { width: COL.toggle, flexShrink: 0 } }),
    React.createElement(
      "div",
      {
        style: {
          flex: 1,
          padding: "0 10px",
          minWidth: 120,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontFamily: FONT,
          color: "#262626",
          fontWeight: 500,
        },
      },
      React.createElement("span", { title: tr("Meeting") }, "📅"),
      React.createElement(
        "span",
        {
          style: {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        meeting.title || tr("Meeting"),
      ),
    ),
    React.createElement(
      "div",
      { style: { flex: `0 1 ${COL.status}px`, minWidth: 0, padding: "0 8px" } },
      React.createElement(
        "span",
        {
          style: {
            fontSize: 12,
            fontFamily: FONT,
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: 3,
            background: statusCfg.bg,
            color: statusCfg.color,
            border: `1px solid ${statusCfg.border}`,
            whiteSpace: "nowrap",
          },
        },
        statusCfg.label,
      ),
    ),
    React.createElement(
      "div",
      {
        style: {
          flex: `0 1 ${COL.updatedAt}px`,
          minWidth: 0,
          textAlign: "center",
          fontSize: 12,
          color: "#8c8c8c",
        },
      },
      fmt(meeting.updatedAt, "date") || "-",
    ),
    React.createElement(
      "div",
      {
        style: {
          flex: `0 1 ${COL.assign}px`,
          minWidth: 0,
          textAlign: "center",
          fontSize: 12,
          color: "#262626",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
      },
      meeting._hostName || tr("Unassigned host"),
    ),
    React.createElement(
      "div",
      {
        style: {
          flex: `0 1 ${COL.desc}px`,
          minWidth: 0,
          padding: "0 8px",
          fontSize: 12,
          color: "#595959",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
        title: stripHtml(meeting.description),
      },
      stripHtml(meeting.description) || "-",
    ),
    React.createElement(
      "div",
      {
        style: {
          flex: `0 1 ${COL.start}px`,
          minWidth: 0,
          textAlign: "center",
          fontSize: 12,
          color: "#262626",
        },
        title: tr("Start Time"),
      },
      fmt(combineDateTime(meeting.meetingDate, meeting.startTime), "date") || "-",
    ),
    React.createElement(
      "div",
      {
        style: {
          flex: `0 1 ${COL.deadline}px`,
          minWidth: 0,
          textAlign: "center",
          fontSize: 12,
          color: "#262626",
        },
        title: tr("End Time"),
      },
      fmt(combineDateTime(meeting.meetingDate, meeting.endTime), "date") || "-",
    ),
    React.createElement("div", {
      style: { flex: `0 1 ${COL.pendingIssue}px`, minWidth: 0 },
    }),
    React.createElement(
      "div",
      {
        style: {
          flex: `0 1 ${COL.nextStep}px`,
          minWidth: 0,
          padding: "0 8px",
          fontSize: 12,
          color: "#595959",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
        title: meeting.location || "",
      },
      meeting.location || "-",
    ),
    React.createElement("div", { style: { width: COL.approval, flexShrink: 0 } }),
  );
};

// ── Service Section ────────────────────────────────────────
// ---- service payment badge (pure; tested by scripts/tests/service-payment-badge.test.js) ----
// By Service: what this service's Payment Request is / will be, shown in its
// section header so the amount can be checked before ticking triggers and
// marking tasks Done. info = { allocated, lineTotal, pricingMode, request }:
// allocated = projectServices.paymentAllocatedAmount (locked in the Contract
// form for Combo pricing), request = the Payment Request already created.
// See docs/superpowers/specs/2026-09-25-by-service-package-allocation-ui-design.md.
const servicePaymentBadge = (info, formatAmount) => {
  if (!info) return null;
  if (info.notBilled) {
    return { text: tr("Not part of any Payment Request item — not billed"), tone: "warn" };
  }
  if (info.request) {
    return {
      text: tr("Payment Request: {0} · {1}", { 0: formatAmount(Number(info.request.requestedAmount) || 0), 1: info.request.status || "created" }),
      tone: "created",
    };
  }
  const planned = Number(info.allocated) > 0 ? Number(info.allocated) : Number(info.lineTotal) > 0 ? Number(info.lineTotal) : 0;
  // No trigger task → the SQL never creates this service's request.
  if (planned > 0 && info.hasTrigger === false) {
    return { text: tr("Payment Request: {0} · no trigger task yet", { 0: formatAmount(planned) }), tone: "warn" };
  }
  if (planned > 0) return { text: tr("Payment Request: {0}", { 0: formatAmount(planned) }), tone: "planned" };
  if (info.pricingMode === "package") {
    return { text: tr("Payment Request: share of the package, computed when created"), tone: "warn" };
  }
  return null;
};
// ---- end service payment badge ----

const ServiceSection = ({
  serviceId,
  serviceName,
  tasks,
  meetings = [],
  lawyers,
  expanded,
  onToggle,
  onStatus,
  onOpen,
  onOpenMeeting,
  onAssign,
  contractType,
  hasContract,
  linkablePaymentRequests,
  contractServiceIdByProjectServiceId,
  paymentRequestServiceIdsByPrId,
  serviceNameByContractServiceId,
  onUpdateField,
  isManager,
  onOpenAddSubModal,
  colorCfg,
  allTasksInProject,
  isAssigneeOnly = false,
  myLawyerId = null,
  onDeleteTask,
  serviceDeleted = false,
  onReorderTask,
  onInsertTask,
  onSaveTaskAsTemplate,
  groupServiceKey,
  ps = null,
  serviceCatalog = [],
  onOpenTemplateAction,
  onCreateTask,
  onCreateMeeting,
  paymentInfo = null,
}) => {
  const [collapsed, setCollapsed] = useState(serviceDeleted);
  const paymentBadge = servicePaymentBadge(
    (() => {
      // Combo pricing: this service is billed by its item's request (combo /
      // standalone service), already created pending on contract submit.
      const itemPr =
        contractType === "byService"
          ? itemPaymentRequestFor(extractId(ps?.id), {
              contractServiceIdByProjectServiceId,
              paymentRequestServiceIdsByPrId,
              linkablePaymentRequests,
            })
          : null;
      if (itemPr) return { ...(paymentInfo || {}), request: itemPr };
      if (contractType === "byService" && linkablePaymentRequests === null) return null; // still loading
      // Contract billed per item but this service is in none → not billed.
      if (contractType === "byService" && Object.keys(paymentRequestServiceIdsByPrId || {}).length > 0) {
        return { notBilled: true };
      }
      return paymentInfo && { ...paymentInfo, hasTrigger: tasks.some((task) => !!task.isPaymentTrigger) };
    })(),
    (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`,
  );
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const serviceMenuAnchorRef = useRef(null);
  const serviceMenuRef = useRef(null);
  const serviceMenuUp = useDropdownFlip(actionMenuOpen, serviceMenuAnchorRef, serviceMenuRef);
  const doneCnt = tasks.filter((t) => t.status === "done").length;
  const totalCnt = tasks.length;
  const isCollapsed = serviceDeleted || collapsed;
  const hasNoTasks = tasks.length === 0;
  // ps is null for the "__none__" bucket (tasks with no serviceId) and for
  // orphaned/stale keys (ListView's extraKeys — a task's serviceId that no
  // longer matches any current projectServices row). Neither "Save as
  // template" nor "Override" has a well-defined case-service to read
  // from/represent in that state, so both stay disabled there, same as the
  // existing zero-tasks rule.
  const actionsDisabled = hasNoTasks || !ps;
  const actionDisabledReason = hasNoTasks
    ? tr("No tasks to save as template")
    : !ps
      ? tr("This group is not linked to a case service")
      : "";
  // New Task/New Meeting don't need any existing tasks (that's how you'd add
  // the first one), only a real linked case-service to attach to.
  const creationDisabled = !ps;
  const creationDisabledReason = !ps
    ? tr("This group is not linked to a case service")
    : "";

  useEffect(() => {
    if (serviceDeleted) setCollapsed(true);
  }, [serviceDeleted]);

  const toggleService = () => {
    if (!serviceDeleted) setCollapsed((value) => !value);
  };

  return React.createElement(
    "div",
    {
      style: {
        marginBottom: 12,
        borderRadius: 8,
        border: `1px solid ${colorCfg.border}`,
        background: "#fff",
      },
    },
    React.createElement(
      "div",
      {
        onClick: toggleService,
        onKeyDown: serviceDeleted
          ? undefined
          : (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleService();
              }
            },
        role: serviceDeleted ? undefined : "button",
        tabIndex: serviceDeleted ? -1 : 0,
        "aria-expanded": serviceDeleted ? false : !isCollapsed,
        title: serviceDeleted
          ? tr("This service has been deleted and locked. The task list cannot be opened.")
          : isCollapsed
            ? tr("Expand task list")
            : tr("Collapse task list"),
        style: {
          display: "flex",
          width: "100%",
          alignItems: "center",
          padding: "10px 14px",
          background: colorCfg.bg,
          cursor: serviceDeleted ? "not-allowed" : "pointer",
          borderRadius: isCollapsed ? 8 : "8px 8px 0 0",
          color: serviceDeleted ? "#8c8c8c" : colorCfg.text,
          userSelect: "none",
        },
      },
      React.createElement(
        "span",
        {
          style: {
            marginRight: 8,
            width: 16,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transform:
              serviceDeleted || !isCollapsed ? "none" : "rotate(-90deg)",
            transition: "transform 0.2s",
            color: serviceDeleted ? "#8c8c8c" : colorCfg.text,
          },
        },
        serviceDeleted ? renderServiceLockIcon(15) : "▾",
      ),
      React.createElement(
        "b",
        {
          style: {
            fontSize: 12,
            color: serviceDeleted ? "#595959" : "inherit",
          },
        },
        serviceName,
      ),
      // Flex order 1 is the settings-menu trigger below (kept in its
      // original DOM position — CSS order alone moves it next to the
      // title). This spacer (order 2) is what pushes the done-count/
      // meeting-badge (order 3/4) to the row's far right, same as before.
      React.createElement("div", { style: { flex: 1, order: 2 } }),
      paymentBadge &&
        React.createElement(
          "span",
          {
            title: paymentBadge.text,
            style: {
              fontSize: 11.5,
              fontWeight: 600,
              order: 3,
              marginRight: 10,
              padding: "1px 8px",
              borderRadius: 10,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              // Full text stays in the title tooltip on narrow screens.
              maxWidth: "min(320px, 45vw)",
              minWidth: 0,
              ...(paymentBadge.tone === "created"
                ? { color: "#389e0d", background: "#f6ffed", border: "1px solid #b7eb8f" }
                : paymentBadge.tone === "warn"
                  ? { color: "#ad6800", background: "#fffbe6", border: "1px solid #ffe58f" }
                  : { color: "#0958d9", background: "#e6f4ff", border: "1px solid #91caff" }),
            },
          },
          paymentBadge.text,
        ),
      React.createElement(
        "span",
        { style: { fontSize: 12, order: 3 } },
        tr("{0}/{1} done", { 0: doneCnt, 1: totalCnt }),
      ),
      meetings.length > 0 &&
        React.createElement(
          "span",
          { style: { fontSize: 12, marginLeft: 10, order: 4 } },
          `📅 ${meetings.length}`,
        ),
      !serviceDeleted &&
        React.createElement(
          "div",
          {
            ref: serviceMenuAnchorRef,
            style: { position: "relative", marginLeft: 8, order: 1 },
            onClick: (e) => e.stopPropagation(),
          },
          React.createElement(
            "div",
            {
              onMouseDown: (e) => {
                e.preventDefault();
                e.stopPropagation();
              },
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                setActionMenuOpen((v) => !v);
              },
              title: tr("Service actions"),
              style: {
                width: 22,
                height: 22,
                borderRadius: 4,
                background: actionMenuOpen ? "#e6f4ff" : "transparent",
                border: actionMenuOpen
                  ? "1px solid #91caff"
                  : "1px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: actionMenuOpen ? "#096dd9" : colorCfg.text,
                userSelect: "none",
              },
            },
            renderServiceSettingsIcon(14),
          ),
          actionMenuOpen &&
            React.createElement(
              "div",
              {
                ref: serviceMenuRef,
                style: {
                  position: "absolute",
                  left: 0,
                  ...(serviceMenuUp ? { bottom: 28 } : { top: 28 }),
                  zIndex: 9999,
                  background: "#fff",
                  border: "1px solid #e8e8e8",
                  borderRadius: 6,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
                  minWidth: 220,
                  padding: "4px 0",
                },
                onMouseDown: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                },
                onClick: (e) => e.stopPropagation(),
              },
              React.createElement(
                Tooltip,
                { title: creationDisabledReason },
                React.createElement(
                  "div",
                  {
                    onClick: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (creationDisabled) return;
                      setActionMenuOpen(false);
                      onCreateTask(serviceId);
                    },
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      cursor: creationDisabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontFamily: FONT,
                      color: creationDisabled ? "#bfbfbf" : "#262626",
                    },
                    onMouseEnter: (e) => {
                      if (!creationDisabled)
                        e.currentTarget.style.background = "#f5f5f5";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.background = "transparent";
                    },
                  },
                  React.createElement("span", null, "➕"),
                  tr("New Task"),
                ),
              ),
              React.createElement(
                Tooltip,
                { title: creationDisabledReason },
                React.createElement(
                  "div",
                  {
                    onClick: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (creationDisabled) return;
                      setActionMenuOpen(false);
                      onCreateMeeting();
                    },
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      cursor: creationDisabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontFamily: FONT,
                      color: creationDisabled ? "#bfbfbf" : "#262626",
                    },
                    onMouseEnter: (e) => {
                      if (!creationDisabled)
                        e.currentTarget.style.background = "#f5f5f5";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.background = "transparent";
                    },
                  },
                  React.createElement("span", null, "📅"),
                  tr("New Meeting"),
                ),
              ),
              React.createElement("div", {
                style: {
                  height: 1,
                  background: "#f0f0f0",
                  margin: "4px 0",
                },
              }),
              React.createElement(
                Tooltip,
                { title: actionDisabledReason },
                React.createElement(
                  "div",
                  {
                    onClick: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (actionsDisabled) return;
                      setActionMenuOpen(false);
                      onOpenTemplateAction({
                        mode: "save",
                        serviceName,
                        tasks,
                        ps,
                      });
                    },
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      cursor: actionsDisabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontFamily: FONT,
                      color: actionsDisabled ? "#bfbfbf" : "#262626",
                    },
                    onMouseEnter: (e) => {
                      if (!actionsDisabled)
                        e.currentTarget.style.background = "#f5f5f5";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.background = "transparent";
                    },
                  },
                  React.createElement("span", null, "📋"),
                  tr("Save as template"),
                ),
              ),
              React.createElement(
                Tooltip,
                { title: actionDisabledReason },
                React.createElement(
                  "div",
                  {
                    onClick: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (actionsDisabled) return;
                      setActionMenuOpen(false);
                      onOpenTemplateAction({
                        mode: "override",
                        serviceName,
                        tasks,
                        ps,
                      });
                    },
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      cursor: actionsDisabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontFamily: FONT,
                      color: actionsDisabled ? "#bfbfbf" : "#262626",
                    },
                    onMouseEnter: (e) => {
                      if (!actionsDisabled)
                        e.currentTarget.style.background = "#f5f5f5";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.background = "transparent";
                    },
                  },
                  React.createElement("span", null, "🔁"),
                  tr("Override existing template"),
                ),
              ),
            ),
        ),
    ),
    !isCollapsed &&
      React.createElement(
        "div",
        null,
        React.createElement(ColHeader, { hasContract }),
        // Tasks and meetings share one taskIndex sequence within a service
        // group, so they render interleaved (not tasks-then-meetings) and
        // can be dragged into any position relative to each other.
        ...[...tasks, ...meetings]
          .slice()
          .sort((a, b) => {
            // Missing taskIndex (e.g. a meeting created before this reorder
            // feature, or a task inserted without one) sorts to the end,
            // matching the server's NULLS LAST fetch order — not to the top.
            const ai = Number.isFinite(Number(a.taskIndex)) ? Number(a.taskIndex) : Infinity;
            const bi = Number.isFinite(Number(b.taskIndex)) ? Number(b.taskIndex) : Infinity;
            if (ai !== bi) return ai - bi;
            return String(a.id).localeCompare(String(b.id));
          })
          .map((item, index) =>
            item._type === "meeting"
              ? React.createElement(MeetingRow, {
                  key: `meeting-${item.id}`,
                  meeting: item,
                  stt: index + 1,
                  onOpen: onOpenMeeting,
                  onReorderTask,
                  groupServiceKey,
                })
              : React.createElement(TaskRow, {
                  key: item.id,
                  task: item,
                  stt: index + 1,
                  lawyers,
                  expanded: !!expanded[item.id],
                  onToggle,
                  onStatus,
                  onOpen,
                  onAssign,
                  contractType,
                  hasContract,
                  linkablePaymentRequests,
                  contractServiceIdByProjectServiceId,
                  paymentRequestServiceIdsByPrId,
                  serviceNameByContractServiceId,
                  onUpdateField,
                  isManager,
                  onOpenAddSubModal,
                  allTasksInProject,
                  tasksInService: tasks,
                  isAssigneeOnly,
                  myLawyerId,
                  onDeleteTask,
                  onReorderTask,
                  onInsertTask,
                  onSaveTaskAsTemplate,
                  groupServiceKey,
                }),
          ),
      ),
  );
};
// ============================================================
// §9 VIEW MODES — ListView (default; KanbanView / GanttView peuvent être ajoutées ici)
// ============================================================
const ListView = ({
  tasks,
  meetings = [],
  services,
  serviceCatalog,
  lawyers,
  expanded,
  toggleExpand,
  handleStatus,
  handleOpen,
  handleOpenMeeting,
  handleAssign,
  contractType,
  hasContract,
  linkablePaymentRequests,
  contractServiceIdByProjectServiceId,
  paymentRequestServiceIdsByPrId,
  serviceNameByContractServiceId,
  handleUpdateTaskField,
  isManager,
  handleOpenAddSubModal,
  isAssigneeOnly,
  myLawyerId,
  showAddTask,
  setShowAddTask,
  onDeleteTask,
  onReorderTask,
  onInsertTask,
  onSaveTaskAsTemplate,
  onOpenTemplateAction,
  onCreateTask,
  onCreateMeeting,
  servicePaymentInfoByPsId = {},
}) => {
  // services = projectServices của case này
  // Key quy ước: nếu ps.serviceId có (catalog service) → dùng ps.serviceId
  //           nếu ps.serviceId = null (custom service) → dùng ps.id (projectService id)
  // task.serviceId sẽ lưu đúng key này khi tạo công việc
  const serviceMap = {};
  const serviceDeletedMap = {};
  const psByKeyMap = {};
  services.forEach((ps) => {
    const key = getProjectServiceTaskKey(ps);
    const deleted = isDeletedServiceRecord(ps);
    serviceMap[key] = ps.serviceName || tr("Service #{0}", { 0: ps.id });
    serviceDeletedMap[key] = deleted;
    psByKeyMap[key] = ps;
  });
  const grouped = {};
  tasks.forEach((t) => {
    const svcId = extractId(t.serviceId);
    const key = svcId ? String(svcId) : "__none__";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });
  // A meeting's service key (_svcKey) is resolved at load time (reload()):
  // meetings.serviceId directly, falling back to the linked task's
  // serviceId for older meetings — see the meetings enrichment step.
  const meetingsGrouped = {};
  meetings.forEach((m) => {
    const key = m._svcKey || "__none__";
    if (!meetingsGrouped[key]) meetingsGrouped[key] = [];
    meetingsGrouped[key].push(m);
  });
  // Thứ tự hiển thị: tất cả projectServices (kể cả custom) rồi mới đến __none__
  const serviceOrder = services.map((ps) => getProjectServiceTaskKey(ps));
  // Nhóm có task + nhóm chưa có task nào (hiển thị rỗng để user tạo task mới)
  const allServiceKeys = serviceOrder; // Luôn hiển thị tất cả dịch vụ
  const extraKeys = Array.from(
    new Set([...Object.keys(grouped), ...Object.keys(meetingsGrouped)]),
  ).filter((k) => !serviceOrder.includes(k) && k !== "__none__");
  const orderedKeys = [
    ...allServiceKeys,
    ...extraKeys,
    ...(grouped["__none__"] || meetingsGrouped["__none__"] ? ["__none__"] : []),
  ];

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width: "100%",
      },
    },
    ...orderedKeys.map((key) => {
      const colorCfg =
        key === "__none__"
          ? {
              bg: "#fafafa",
              border: "#e8e8e8",
              text: "#8c8c8c",
              dot: "#bfbfbf",
            }
          : serviceDeletedMap[key]
            ? {
                bg: "#fafafa",
                border: "#d9d9d9",
                text: "#8c8c8c",
                dot: "#bfbfbf",
              }
            : SERVICE_COLORS[orderedKeys.indexOf(key) % SERVICE_COLORS.length];
      const svcName =
        key === "__none__"
          ? tr("No service assigned")
          : serviceMap[key] || tr("Service #{0}", { 0: key });
      return React.createElement(ServiceSection, {
        key,
        serviceId: key,
        serviceName: svcName,
        tasks: grouped[key] || [],
        meetings: meetingsGrouped[key] || [],
        lawyers,
        expanded,
        onToggle: toggleExpand,
        onStatus: handleStatus,
        onOpen: handleOpen,
        onOpenMeeting: handleOpenMeeting,
        onAssign: handleAssign,
        contractType,
        hasContract,
        linkablePaymentRequests,
        contractServiceIdByProjectServiceId,
        paymentRequestServiceIdsByPrId,
        serviceNameByContractServiceId,
        onUpdateField: handleUpdateTaskField,
        isManager,
        onOpenAddSubModal: handleOpenAddSubModal,
        colorCfg,
        allTasksInProject: tasks,
        isAssigneeOnly,
        myLawyerId,
        serviceDeleted: !!serviceDeletedMap[key],
        onDeleteTask,
        onReorderTask,
        onInsertTask,
        onSaveTaskAsTemplate,
        groupServiceKey: key,
        ps: psByKeyMap[key] || null,
        paymentInfo: servicePaymentInfoByPsId?.[String(extractId(psByKeyMap[key]?.id) || "")] || null,
        serviceCatalog,
        onOpenTemplateAction,
        onCreateTask,
        onCreateMeeting,
      });
    }),
  );
};

// ============================================================
// §9b TEMPLATE ACTION MODALS — Save as template / Override
// ============================================================
const SaveAsTemplateModal = ({
  open,
  serviceName,
  tasks,
  ps,
  serviceCatalog,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(serviceName || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(serviceName || "");
  }, [open, serviceName]);

  const trimmedName = name.trim();
  const normalizedName = serviceNameKey(trimmedName);
  const duplicate =
    normalizedName &&
    serviceCatalog.find(
      (svc) => serviceNameKey(svc.serviceName) === normalizedName,
    );

  const handleSave = async () => {
    if (!trimmedName || duplicate) return;
    setSaving(true);
    try {
      const createdService = await apiReq("services:create", "POST", {
        serviceName: trimmedName,
        serviceType: ps?.serviceType || null,
        description: ps?.description || null,
        basePrice: ps?.basePrice ?? null,
      });
      const newServiceId = createdService?.data?.data?.id;
      if (!newServiceId) throw new Error("services:create returned no id");
      const sortedTasks = sortTasksByDisplayOrder(tasks);
      await Promise.all(
        sortedTasks.map((t, index) =>
          apiReq("projectTemplates:create", "POST", {
            templateName: t.title,
            description: t.description || null,
            priority: t.priority || null,
            sortOrder: index,
            serviceId: newServiceId,
          }),
        ),
      );
      message.success(tr("✅ Saved \"{0}\" as a new standardized service", { 0: trimmedName }));
      onSaved();
    } catch (e) {
      console.error(e);
      message.error(tr("Failed to save as template"));
    }
    setSaving(false);
  };

  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      onOk: handleSave,
      confirmLoading: saving,
      okText: saving ? tr("Saving...") : tr("Save"),
      cancelText: tr("Cancel"),
      okButtonProps: {
        style: TASK_DS.primaryButton,
        disabled: !trimmedName || !!duplicate,
      },
      cancelButtonProps: { style: TASK_DS.secondaryButton },
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        tr("Save as template"),
      ),
    },
    React.createElement(
      "div",
      { style: { fontFamily: FONT } },
      renderFieldLabel(tr("New service name"), true),
      React.createElement(Input, {
        value: name,
        onChange: (e) => setName(e.target.value),
        placeholder: tr("Enter a name for the new standardized service"),
      }),
      duplicate &&
        React.createElement(
          "div",
          { style: { marginTop: 6, fontSize: 12, color: "#cf1322" } },
          tr("This name already exists in the catalog. Rename it, or use \"Override\" instead if you want to update that service."),
        ),
      React.createElement(
        "div",
        { style: { marginTop: 12, fontSize: 12, color: "#8c8c8c" } },
        tr("{0} task{1} will be copied into this template.", { 0: tasks.length, 1: tasks.length === 1 ? "" : "s" }),
      ),
    ),
  );
};

const OverrideTemplateModal = ({
  open,
  tasks,
  serviceName,
  serviceCatalog,
  onClose,
  onOverridden,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [renameTo, setRenameTo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedServiceId(null);
      setConfirming(false);
      setRenameTo("");
    }
  }, [open]);

  const selectedService = serviceCatalog.find(
    (s) => extractId(s.id) === extractId(selectedServiceId),
  );

  const sortedTasks = useMemo(() => sortTasksByDisplayOrder(tasks), [tasks]);

  const trimmedRename = renameTo.trim();
  const willRename =
    !!trimmedRename && trimmedRename !== (selectedService?.serviceName || "");

  const handleConfirm = async () => {
    if (!selectedServiceId) return;
    setSaving(true);
    try {
      const targetServiceId = Number(selectedServiceId);
      // Sorted ASC by sortOrder, matching the DB trigger's own
      // "ORDER BY pt.sortOrder ASC NULLS LAST" (pgsql/AutoCreateTaskFromTemplate.sql)
      // so "position i" means the same thing on both sides of the reconcile.
      const existingTemplates = await fetchAll(
        "projectTemplates:list",
        "id,sortOrder",
        { serviceId: { $eq: targetServiceId } },
        ["sortOrder"],
      );
      const pairCount = Math.min(sortedTasks.length, existingTemplates.length);

      const ops = [];
      // Optional catalog-service rename, requested explicitly by the user
      // on top of the original design (which deliberately left serviceName
      // untouched) — only fires when the field actually differs from the
      // service's current name, never sends an empty/blank name.
      if (trimmedRename && trimmedRename !== (selectedService?.serviceName || "")) {
        ops.push(
          apiReq(`services:update?filterByTk=${targetServiceId}`, "POST", {
            serviceName: trimmedRename,
          }),
        );
      }
      // Matched positions: update in place (same id) so
      // documents.sourceProjectTemplateId in OTHER cases stays valid.
      for (let i = 0; i < pairCount; i++) {
        ops.push(
          apiReq(
            `projectTemplates:update?filterByTk=${existingTemplates[i].id}`,
            "POST",
            {
              templateName: sortedTasks[i].title,
              description: sortedTasks[i].description || null,
              priority: sortedTasks[i].priority || null,
              sortOrder: i,
            },
          ),
        );
      }
      // Surplus real tasks beyond the existing template count: create.
      for (let i = pairCount; i < sortedTasks.length; i++) {
        ops.push(
          apiReq("projectTemplates:create", "POST", {
            templateName: sortedTasks[i].title,
            description: sortedTasks[i].description || null,
            priority: sortedTasks[i].priority || null,
            sortOrder: i,
            serviceId: targetServiceId,
          }),
        );
      }
      // Surplus old templates beyond the current task count: delete.
      for (let i = pairCount; i < existingTemplates.length; i++) {
        ops.push(
          ctx.api.request({
            url: "projectTemplates:destroy",
            method: "POST",
            params: { filterByTk: existingTemplates[i].id },
          }),
        );
      }
      await Promise.all(ops);
      message.success(
        tr("✅ \"{0}\" templates updated", { 0: selectedService?.serviceName || "" }),
      );
      onOverridden();
    } catch (e) {
      console.error(e);
      message.error(tr("Failed to override template"));
    }
    setSaving(false);
  };

  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      footer: null,
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        tr("Override existing template"),
      ),
    },
    !confirming
      ? React.createElement(
          "div",
          { style: { fontFamily: FONT } },
          renderFieldLabel(tr("Select the standardized service to override"), true),
          React.createElement(Select, {
            value: selectedServiceId,
            onChange: setSelectedServiceId,
            showSearch: true,
            optionFilterProp: "label",
            style: { width: "100%" },
            placeholder: tr("-- Select a catalog service --"),
            options: serviceCatalog.map((s) => ({
              value: s.id,
              label: s.serviceName,
            })),
          }),
          React.createElement(
            "div",
            {
              style: {
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              },
            },
            React.createElement(
              Button,
              { style: TASK_DS.secondaryButton, onClick: onClose },
              tr("Cancel"),
            ),
            React.createElement(
              Button,
              {
                style: TASK_DS.primaryButton,
                disabled: !selectedServiceId,
                onClick: () => {
                  // Pre-fill with the case's own service-group name, not
                  // the catalog's current name — editable from there.
                  setRenameTo(serviceName || selectedService?.serviceName || "");
                  setConfirming(true);
                },
              },
              tr("Next"),
            ),
          ),
        )
      : React.createElement(
          "div",
          { style: { fontFamily: FONT } },
          renderFieldLabel(tr("Service name")),
          React.createElement(Input, {
            value: renameTo,
            onChange: (e) => setRenameTo(e.target.value),
            placeholder: tr("Service name"),
            style: { marginBottom: 12 },
          }),
          React.createElement(
            "div",
            { style: { fontSize: 13, color: "#262626", lineHeight: 1.6 } },
            willRename
              ? tr("This will rename \"{0}\" to \"{1}\" and update its task templates to match the {2} task{3} currently in this case. Existing templates not present here will be removed. This cannot be undone.", { 0: selectedService?.serviceName || "", 1: trimmedRename, 2: sortedTasks.length, 3: sortedTasks.length === 1 ? "" : "s" })
              : tr("This will update \"{0}\"'s task templates to match the {1} task{2} currently in this case. Existing templates not present here will be removed. This cannot be undone.", { 0: selectedService?.serviceName || "", 1: sortedTasks.length, 2: sortedTasks.length === 1 ? "" : "s" }),
          ),
          React.createElement(
            "div",
            {
              style: {
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              },
            },
            React.createElement(
              Button,
              {
                style: TASK_DS.secondaryButton,
                disabled: saving,
                onClick: () => setConfirming(false),
              },
              tr("Back"),
            ),
            React.createElement(
              Button,
              {
                danger: true,
                type: "primary",
                loading: saving,
                onClick: handleConfirm,
              },
              saving ? tr("Overriding...") : tr("Confirm override"),
            ),
          ),
        ),
  );
};

// ============================================================
// §10 MAIN — ProjectTasksTab + ctx.render()
// ============================================================
const ProjectTasksTab = () => {
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [templateAction, setTemplateAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [projectManagerId, setProjectManagerId] = useState(null);
  // contractType/linkablePaymentRequests — feed TriggerCell's rendering mode
  // (byCase Select vs. isPaymentTrigger checkbox). Mirrors TaskDetailView.js's
  // own projects:get → contracts:list / paymentRequests:list chain (2026-09-21)
  // so both screens resolve the same case's contract the same way. See
  // docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md.
  const [contractType, setContractType] = useState("");
  // Case has a contract linked — gates every financial control/figure in
  // this table (Trigger Payment column, lawyer hourly rates). Starts false
  // so nothing financial flashes on screen before the case has loaded.
  const [hasContract, setHasContract] = useState(false);
  // By Service: { [projectServiceId]: { allocated, lineTotal, pricingMode,
  // request } } for the service-header Payment Request badge.
  const [servicePaymentInfoByPsId, setServicePaymentInfoByPsId] = useState({});
  // Latest loader (set by reload for By Service cases) so a status change can
  // refresh the badges — the SQL trigger creates the request in the same
  // update — plus a sequence number so an older load can't overwrite a newer one.
  const servicePaymentReloadRef = useRef(null);
  const servicePaymentLoadSeqRef = useRef(0);
  // null = not loaded yet (see the paymentRequests/paymentRequestServices load).
  const [linkablePaymentRequests, setLinkablePaymentRequests] = useState(null);
  // projectServiceId -> contractServiceId — narrows TriggerCell's byCase
  // Select to installments tagged for the row's own service (§6h). Mirrors
  // TaskDetailView.js's own reverse-link fetch.
  const [contractServiceIdByProjectServiceId, setContractServiceIdByProjectServiceId] = useState({});
  // contractServiceId -> serviceName, for labeling an installment's tags by
  // name in InstallmentPickerModal (2026-09-22, §6n) instead of a raw id.
  const [serviceNameByContractServiceId, setServiceNameByContractServiceId] = useState({});
  // paymentRequestId -> [contractServiceId, ...], from the
  // "paymentRequestServices" junction collection (§6h — 2 explicit junction
  // collections, not a JSON field). A PR with no entry here is untagged —
  // visible to every task.
  const [paymentRequestServiceIdsByPrId, setPaymentRequestServiceIdsByPrId] = useState({});
  const [expanded, setExpanded] = useState({});
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskServiceId, setAddTaskServiceId] = useState(null);
  // { newTaskIndex, reindexOps: [{type, id, newIndex}] } | null — computed
  // up front from current tasks/meetings state at the moment "Insert
  // above/below" is clicked (see handleInsertTask), then consumed once by
  // AddTaskModal's handleSave so the new task lands at the exact clicked
  // position instead of the default end-of-list.
  const [insertPlan, setInsertPlan] = useState(null);
  // { taskValues, defaultServiceId } | null — set from a single task's own
  // "⋮" menu ("Save as template"), drives SaveTaskToTemplateModal below.
  const [saveTaskToTemplateContext, setSaveTaskToTemplateContext] = useState(null);
  const [showAddSub, setShowAddSub] = useState(false);
  const [addSubForTaskId, setAddSubForTaskId] = useState(null);

  const toggleExpand = (id, force) =>
    setExpanded((prev) => ({
      ...prev,
      [id]: force !== undefined ? force : !prev[id],
    }));

  // ── Data loading ──────────────────────────────────────────
  const reload = useCallback(async () => {
    if (!PROJECT_ID) {
      setLoading(false);
      return;
    }

    const safeProjectId =
      typeof PROJECT_ID === "object"
        ? parseInt(PROJECT_ID?.id)
        : parseInt(PROJECT_ID);
    if (isNaN(safeProjectId)) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [
        allTasks,
        allSubs,
        allLawyers,
        allServices,
        allMeetings,
        user,
        allServiceCatalog,
      ] = await Promise.all([
          fetchAll(
            "tasks:list",
            // linkedPaymentRequestId was missing here (2026-09-22 bug fix) —
            // TaskDetailView.js's own tasks fetch already included it, but
            // this one never did, so a By Case task's selected installment
            // (written fine via tasks:update, shown fine via the optimistic
            // local update right after selecting) silently reverted to
            // "unselected" on every full page reload, since task.linkedPaymentRequestId
            // came back undefined for every row.
            "id,title,status,updatedAt,priority,startDate,dueDate,closedDate,lawyerId,projectId,serviceId,description,estimatedDuration,workRate,isRequiredApproval,rejectionReason,approvedById,approvedAt,acceptedAt,previousTaskId,blockedReason,nextStepDescription,linkedUrl,taskIndex,isPaymentTrigger,projectServiceId,linkedPaymentRequestId",
            { projectId: { $eq: safeProjectId } },
            ["taskIndex", "id"],
          ),
          fetchAll(
            "subTasks:list",
            "id,subTaskName,status,priority,date,deadline,closedDate,lawyerId,taskId,description,hourlyRate,estimatedDuration,isRequiredApproval,rejectionReason,approvedById,updatedAt,linkedUrl",
          ),
          fetchAll("lawyers:list", "id,lawyerName,unitPrice,lawyerType,userId"),
          fetchAll(
            "projectServices:list",
            "id,serviceId,serviceName,serviceType,description,basePrice,status",
            {
              projectId: { $eq: safeProjectId },
            },
          ),
          fetchAll(
            "meetings:list",
            "id,title,meetingDate,startTime,endTime,status,type,location,description,hostId,hostLawyerId,taskId,serviceId,taskIndex,updatedAt",
            { caseId: { $eq: safeProjectId } },
            ["taskIndex", "id"],
          ),
          getCurrentUser(),
          fetchAll(
            "services:list",
            "id,serviceName,serviceType,description,basePrice",
          ),
        ]);

      // By Service: per-service Payment Request amount (locked amount, else
      // line total) and the request already created, for the service header
      // badge (servicePaymentBadge). fetchAll swallows errors, so an empty
      // result with paymentAllocatedAmount (field not registered yet) retries
      // without it.
      const loadServicePaymentInfo = async (contractIdForRequests = null) => {
        const seq = ++servicePaymentLoadSeqRef.current;
        // Combo pricing items' requests live in linkablePaymentRequests —
        // refresh them too, so an item activated by the last Done trigger
        // task shows as active without reloading the page.
        if (contractIdForRequests) {
          const prs = await fetchAll("paymentRequests:list", "id,title,installmentNo,requestedAmount,status,dueDate", {
            $and: [{ contractId: { $eq: contractIdForRequests } }, { triggerType: { $eq: "on_task_done" } }],
          });
          if (seq === servicePaymentLoadSeqRef.current) setLinkablePaymentRequests(prs || []);
        }
        const psFilter = { projectId: { $eq: safeProjectId } };
        let psRows = await fetchAll(
          "projectServices:list",
          ["id", "totalAmount", "pricingMode", "paymentAllocatedAmount"].join(","),
          psFilter,
        );
        if (!psRows.length) {
          psRows = await fetchAll("projectServices:list", "id,totalAmount,pricingMode", psFilter);
        }
        const psIds = psRows.map((row) => extractId(row.id)).filter(Boolean);
        const prRows = psIds.length
          ? await fetchAll("paymentRequests:list", "id,status,requestedAmount,projectServiceId", {
              projectServiceId: { $in: psIds },
            })
          : [];
        const info = {};
        psRows.forEach((row) => {
          const psId = String(extractId(row.id) || "");
          if (!psId) return;
          info[psId] = {
            allocated: row.paymentAllocatedAmount ?? null,
            lineTotal: row.totalAmount ?? null,
            pricingMode: row.pricingMode || "",
            request: prRows.find((pr) => String(extractId(pr.projectServiceId)) === psId) || null,
          };
        });
        if (seq !== servicePaymentLoadSeqRef.current) return;
        setServicePaymentInfoByPsId(info);
      };

      try {
        const projRes = await ctx.api.request({
          url: "projects:get",
          params: { filterByTk: safeProjectId, fields: "id,projectManagerId,contractId" },
        });
        const projData = projRes?.data?.data || projRes?.data || {};
        setProjectManagerId(projData?.projectManagerId || null);

        const linkedContractId = extractId(projData?.contractId);
        setHasContract(!!linkedContractId);
        if (linkedContractId) {
          const contractRowsPromise = fetchAll("contracts:list", "id,contractType,billingCycle", {
            id: { $eq: linkedContractId },
          });
          contractRowsPromise
            .then((rows) => {
              setContractType(
                isByCaseOneTimeContract(rows?.[0])
                  ? CONTRACT_MODE_BY_CASE_ONE_TIME
                  : rows?.[0]?.contractType || "",
              );
              if (rows?.[0]?.contractType === "byService") {
                servicePaymentReloadRef.current = () => loadServicePaymentInfo(linkedContractId);
                loadServicePaymentInfo();
              } else {
                servicePaymentReloadRef.current = null;
                setServicePaymentInfoByPsId({});
              }
            })
            .catch(() => setContractType(""));
          // No status filter — see TaskDetailView.js's own fetch (2026-09-21)
          // for why an already-active request must stay selectable.
          Promise.all([
            fetchAll(
              "paymentRequests:list",
              "id,title,installmentNo,requestedAmount,status,dueDate,triggerType",
              {
                $and: [
                  { contractId: { $eq: linkedContractId } },
                  { triggerType: { $in: LINKABLE_TRIGGER_TYPES } },
                ],
              },
            ),
            contractRowsPromise.catch(() => []),
          ])
            .then(([rows, contractRows]) => {
              const prs = linkableTriggerRequests(rows, contractRows?.[0]);
              const prIds = prs.map((pr) => extractId(pr.id)).filter(Boolean);
              // linkablePaymentRequests is published only together with its
              // tags map: it starts null ("not loaded"), and TriggerCell waits
              // for it before choosing between the item picker and the
              // per-service checkbox (Combo pricing, 2026-09-25).
              if (!prIds.length) {
                setPaymentRequestServiceIdsByPrId({});
                setLinkablePaymentRequests(prs);
                return;
              }
              // §6h — junction collection (not a JSON field).
              fetchAll("paymentRequestServices:list", "id,paymentRequestId,contractServiceId", {
                paymentRequestId: { $in: prIds },
              })
                .then((tagRows) => {
                  const map = {};
                  (tagRows || []).forEach((row) => {
                    const prId = extractId(row.paymentRequestId);
                    const csId = extractId(row.contractServiceId);
                    if (!prId || !csId) return;
                    if (!map[prId]) map[prId] = [];
                    map[prId].push(csId);
                  });
                  setPaymentRequestServiceIdsByPrId(map);
                  setLinkablePaymentRequests(prs);
                })
                .catch(() => {
                  setPaymentRequestServiceIdsByPrId({});
                  setLinkablePaymentRequests(prs);
                });
            })
            .catch(() => {
              setLinkablePaymentRequests([]);
              setPaymentRequestServiceIdsByPrId({});
            });
          // §6h — reverse-link so a service-tagged installment can be
          // matched against a row's own projectServiceId. serviceName also
          // fetched here (2026-09-22, §6n) to label each installment's tags
          // by name in InstallmentPickerModal instead of a raw id.
          fetchAll("contractServices:list", "id,projectServiceId,serviceName", {
            contractId: { $eq: linkedContractId },
          })
            .then((rows) => {
              const map = {};
              const nameMap = {};
              (rows || []).forEach((row) => {
                const psId = extractId(row.projectServiceId);
                const csId = extractId(row.id);
                if (psId) map[psId] = csId;
                if (csId) nameMap[csId] = row.serviceName || tr("Service #{0}", { 0: csId });
              });
              setContractServiceIdByProjectServiceId(map);
              setServiceNameByContractServiceId(nameMap);
            })
            .catch(() => {
              setContractServiceIdByProjectServiceId({});
              setServiceNameByContractServiceId({});
            });
        } else {
          setContractType("");
          setLinkablePaymentRequests([]);
          setPaymentRequestServiceIdsByPrId({});
          setContractServiceIdByProjectServiceId({});
          setServiceNameByContractServiceId({});
          servicePaymentReloadRef.current = null;
          setServicePaymentInfoByPsId({});
        }
      } catch {
        setHasContract(false);
      }

      const lMap = {};
      allLawyers.forEach((l, i) => {
        lMap[l.id] = {
          name: l.lawyerName,
          color: LAWYER_COLORS[i % LAWYER_COLORS.length],
        };
      });

      const serviceDeletedLookup = {};
      allServices.forEach((ps) => {
        serviceDeletedLookup[getProjectServiceTaskKey(ps)] =
          isDeletedServiceRecord(ps);
      });
      const getTaskServiceDeleted = (taskLike) => {
        const svcId = extractId(taskLike?.serviceId);
        return !!svcId && !!serviceDeletedLookup[String(svcId)];
      };

      const enriched = allTasks.map((t) => ({
        ...t,
        _type: "task",
        _serviceDeleted: getTaskServiceDeleted(t),
        _ln: lMap[t.lawyerId]?.name || null,
        _lc: lMap[t.lawyerId]?.color || "#8c8c8c",
        _od: isOD(t.dueDate, t.status),
        _today: isToday(t.dueDate || t.startDate),
        _subs: allSubs
          .filter((s) => s.taskId === t.id)
          .map((s) => ({
            ...s,
            _type: "subTask",
            _serviceDeleted: getTaskServiceDeleted(t),
            _ln: lMap[s.lawyerId]?.name || null,
            _lc: lMap[s.lawyerId]?.color || "#8c8c8c",
            _od: isOD(s.deadline, s.status),
          })),
      }));

      setTasks(enriched);
      // Auto-expand every task that has subtasks — only fills in ids not
      // already present in `expanded`, so a user's own manual collapse
      // survives later reloads (status change, delete, etc. all call
      // reload() again).
      setExpanded((prev) => {
        let changed = false;
        const next = { ...prev };
        enriched.forEach((t) => {
          const tid = getTaskRecordId(t);
          if (tid != null && t._subs?.length > 0 && !(tid in next)) {
            next[tid] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      const taskServiceById = {};
      allTasks.forEach((t) => {
        taskServiceById[extractId(t.id)] = extractId(t.serviceId);
      });
      const lawyerByUserId = {};
      allLawyers.forEach((l) => {
        const uid = extractId(l.userId);
        if (uid) lawyerByUserId[uid] = l;
      });
      const enrichedMeetings = allMeetings.map((m) => {
        // Prefer the meeting's own serviceId (set directly on the create
        // form's Case Service field). Fall back to the linked task's
        // serviceId for older meetings created before that field existed.
        const linkedTaskId = extractId(m.taskId);
        const svcId =
          extractId(m.serviceId) ||
          (linkedTaskId ? taskServiceById[linkedTaskId] : null);
        // Prefer hostLawyerId (works even when the host lawyer has no linked
        // user account — most lawyers don't, see CLAUDE.md §10). Fall back
        // to the userId-based lookup for older meetings created before that
        // column existed.
        const hostName =
          lMap[extractId(m.hostLawyerId)]?.name ||
          lawyerByUserId[extractId(m.hostId)]?.lawyerName ||
          null;
        return {
          ...m,
          _type: "meeting",
          _svcKey: svcId ? String(svcId) : null,
          _hostName: hostName,
        };
      });

      setLawyers(allLawyers);
      setServices(allServices);
      setServiceCatalog(allServiceCatalog);
      setMeetings(enrichedMeetings);
      setCurrentUser(user);
    } catch (error) {
      message.error(tr("Error loading data, please refresh!"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, []);

  // ── Permission ────────────────────────────────────────────
  const isAdmin = isAdminUser(currentUser);
  // 🌟 PATCH: Đối chiếu chính xác cả trường hợp NocoBase trả về Object
  const myLawyer = useMemo(() => {
    const currentUserId = extractId(currentUser?.id);

    const found = lawyers.find((l) => {
      // Quét cả l.userId (khóa ngoại) và l.user (trường liên kết object)
      const lawyerUserId = extractId(l.userId) || extractId(l.user);
      return currentUserId && lawyerUserId === currentUserId;
    });
    return found;
  }, [lawyers, currentUser]);

  // 🌟 PATCH 2: Bọc extractId cho projectManagerId
  const isManager =
    isAdmin ||
    (currentUser &&
      projectManagerId &&
      extractId(currentUser.id) === extractId(projectManagerId));
  const isAssigneeOnly = !!myLawyer && !isManager;
  const myLawyerId = myLawyer?.id || null;
  const assignableLawyers = lawyers.filter((l) =>
    ["associate", "suppliant", "lawyer", "partner"].includes(l.lawyerType),
  );

  // 🌟 HÀM KIỂM TRA QUYỀN EDIT CHO TỪNG TASK CỤ THỂ
  const checkCanEditTask = useCallback(
    (targetItem) => {
      if (!isAssigneeOnly) return true; // Manager/Admin thì được edit hết
      if (!targetItem) return false;

      const taskLawyerId = extractId(targetItem.lawyerId);
      const currentMyLawyerId = extractId(myLawyerId);

      const isAllowed = currentMyLawyerId && taskLawyerId === currentMyLawyerId;
      if (!isAllowed) {
        console.log("🛑 BLOCKED ON FRONTEND - ID mismatch:", {
          taskLawyerId,
          currentMyLawyerId,
        });
      }
      return isAllowed;
    },
    [isAssigneeOnly, myLawyerId],
  );

  // ── Auto-unblock downstream tasks ────────────────────────
  const autoUnblockNextTasks = useCallback(
    async (doneTaskId, allCurrentTasks, changedByName) => {
      const nextTasks = allCurrentTasks.filter(
        (t) =>
          !isTaskServiceDeleted(t) &&
          extractId(t.previousTaskId) === extractId(doneTaskId) &&
          t.status === "blocked",
      );
      if (nextTasks.length === 0) return;
      await Promise.all(
        nextTasks.map(async (t) => {
          try {
            await apiReq(`tasks:update?filterByTk=${extractId(t.id)}`, "POST", {
              status: "toDo",
            });
            await logActivity(
              "Task",
              extractId(t.id),
              "updated",
              "status",
              "Waiting",
              "Not started",
              "System (auto-unblock)",
            );
            message.success(tr("🔓 \"{0}\" has been unblocked", { 0: t.title }));
          } catch {}
        }),
      );
      setTasks((prev) =>
        prev.map((t) =>
          nextTasks.find((n) => extractId(n.id) === extractId(t.id))
            ? { ...t, status: "toDo" }
            : t,
        ),
      );
    },
    [],
  );

  // ── handleStatus ──────────────────────────────────────────
  const handleStatus = useCallback(
    async (id, newStatus, type) => {
      let targetItem = null;
      if (type === "task") {
        targetItem = tasks.find((t) => extractId(t.id) === extractId(id));
      } else {
        for (const t of tasks) {
          const sub = t._subs?.find((s) => extractId(s.id) === extractId(id));
          if (sub) {
            targetItem = sub;
            break;
          }
        }
      }

      if (isTaskServiceDeleted(targetItem)) {
        message.warning(
          tr("This service has been deleted; the task cannot be updated."),
        );
        return;
      }

      if (!checkCanEditTask(targetItem)) {
        message.warning(
          tr("You are not the assignee and do not have permission to change the status."),
        );
        return;
      }

      if (type === "task" && targetItem?.previousTaskId) {
        const prevTask = tasks.find(
          (t) => extractId(t.id) === extractId(targetItem.previousTaskId),
        );
        if (
          prevTask &&
          prevTask.status !== "done" &&
          prevTask.status !== "cancelled"
        ) {
          if (!["cancelled", "blocked"].includes(newStatus)) {
            message.warning(
              tr("⛓ Task is waiting for \"{0}\" to complete first", { 0: prevTask.title }),
            );
            return;
          }
        }
      }

      const resolvedSt = resolveStatus(newStatus, targetItem);
      if (resolvedSt === "pending" && newStatus === "done")
        message.info(tr("📋 Task requires approval — moved to \"Pending approval\""));

      const url =
        type === "subTask"
          ? `subTasks:update?filterByTk=${extractId(id)}`
          : `tasks:update?filterByTk=${extractId(id)}`;
      const data =
        resolvedSt === "done"
          ? { status: resolvedSt, closedDate: new Date().toISOString() }
          : { status: resolvedSt, closedDate: null };

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => {
          if (type === "task" && extractId(t.id) === extractId(id))
            return { ...t, ...data, _od: isOD(t.dueDate, resolvedSt) };
          return {
            ...t,
            _subs: t._subs.map((s) =>
              extractId(s.id) === extractId(id) && type === "subTask"
                ? { ...s, ...data }
                : s,
            ),
          };
        }),
      );

      try {
        await apiReq(url, "POST", data);
        await logActivity(
          type === "subTask" ? "SubTask" : "Task",
          extractId(id),
          "updated",
          "status",
          null,
          // the log keeps the English label, whatever the UI language
          Object.keys(VI).find((key) => VI[key] === STATUS_CFG[resolvedSt]?.label) || STATUS_CFG[resolvedSt]?.label,
          currentUser?.nickname || currentUser?.username || "Super Admin",
        );
        if (resolvedSt === "done" && type === "task")
          await autoUnblockNextTasks(
            id,
            tasks,
            currentUser?.nickname || currentUser?.username,
          );
        // By Service: this change may have just created the service's
        // Payment Request (SQL trigger, same update) — refresh the badges.
        if (type === "task") servicePaymentReloadRef.current?.();
      } catch (e) {
        console.error("🛑 BACKEND API ERROR (NocoBase):", e);
        message.error(
          tr("Backend error: your account has not been granted permission (Role) to edit data!"),
        );
        reload();
      }
    },
    [reload, currentUser, tasks, autoUnblockNextTasks, checkCanEditTask],
  );

  // ── handleUpdateTaskField — backs TriggerCell's two write paths from one
  // handler: isPaymentTrigger (By Service — marks this task as one of the
  // possibly-several tasks that must ALL be done before
  // by_service_task_group_done_creates_payment_request creates that
  // service's Payment Request) and linkedPaymentRequestId (By Case — picks
  // which installment this task's completion activates). Both are a single
  // field on `tasks`, optimistically applied, so one generic
  // permission-check/optimistic-update/error-handling body covers both
  // instead of duplicating it per field. See
  // docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md.
  const handleUpdateTaskField = useCallback(
    async (id, field, value) => {
      const targetItem = tasks.find((t) => extractId(t.id) === extractId(id));
      if (!checkCanEditTask(targetItem)) {
        message.warning(
          tr("You are not the assignee and do not have permission to change this task."),
        );
        return;
      }
      const url = `tasks:update?filterByTk=${extractId(id)}`;
      const data = { [field]: value };

      setTasks((prev) =>
        prev.map((t) =>
          extractId(t.id) === extractId(id) ? { ...t, [field]: value } : t,
        ),
      );

      try {
        await apiReq(url, "POST", data);
        // Linking/unlinking a request (or flagging a trigger) can activate a
        // Payment Request in the same update — refresh the service badges.
        if (field === "linkedPaymentRequestId" || field === "isPaymentTrigger") {
          servicePaymentReloadRef.current?.();
        }
      } catch (e) {
        console.error("🛑 BACKEND API ERROR (NocoBase):", e);
        message.error(
          tr("Backend error: your account has not been granted permission (Role) to edit data!"),
        );
        reload();
      }
    },
    [reload, tasks, checkCanEditTask],
  );

  // ── handleAssign ──────────────────────────────────────────
  const handleAssign = useCallback(
    async (id, lawyerId, lawyerName, lawyerColor, type) => {
      if (!isManager) {
        message.warning(tr("You do not have permission to assign an assignee."));
        return;
      }
      const url =
        type === "subTask"
          ? `subTasks:update?filterByTk=${extractId(id)}`
          : `tasks:update?filterByTk=${extractId(id)}`;
      const targetItem =
        type === "subTask"
          ? tasks
              .flatMap((t) => t._subs || [])
              .find((s) => extractId(s.id) === extractId(id))
          : tasks.find((t) => extractId(t.id) === extractId(id));
      if (isTaskServiceDeleted(targetItem)) {
        message.warning(
          tr("This service has been deleted; the task cannot be updated."),
        );
        return;
      }
      const payload = withTaskLinkedUrl(
        { lawyerId: extractId(lawyerId) },
        targetItem || { id },
        type,
      );
      setTasks((prev) =>
        prev.map((t) => {
          if (type === "task" && extractId(t.id) === extractId(id))
            return {
              ...t,
              ...payload,
              _ln: lawyerName,
              _lc: lawyerColor || "#8c8c8c",
            };
          return {
            ...t,
            _subs: t._subs.map((s) =>
              extractId(s.id) === extractId(id) && type === "subTask"
                ? {
                    ...s,
                    ...payload,
                    _ln: lawyerName,
                    _lc: lawyerColor || "#8c8c8c",
                  }
                : s,
            ),
          };
        }),
      );
      try {
        await apiReq(url, "POST", payload);
        message.success(lawyerName ? `✅ ${lawyerName}` : tr("Assignment removed"));
      } catch {
        message.error(tr("Failed"));
        reload();
      }
    },
    [reload, isManager, tasks],
  );

  const destroyTaskRecord = useCallback(async (recordId, recordType) => {
    const safeId = extractId(recordId);
    if (!safeId) throw new Error(tr("Missing record id."));

    const resource = recordType === "subTask" ? "subTasks" : "tasks";
    console.info("[TaskManagement] destroy request", {
      resource,
      filterByTk: safeId,
      recordType,
    });
    const hardDeleteAttempts = [
      () =>
        ctx.api.request({
          url: `${resource}:destroy`,
          method: "POST",
          params: { filterByTk: safeId },
        }),
      () =>
        ctx.api.request({
          url: `${resource}:destroy?filterByTk=${encodeURIComponent(safeId)}`,
          method: "POST",
        }),
      () =>
        ctx.api.request({
          url: `${resource}:destroy`,
          method: "DELETE",
          params: { filterByTk: safeId },
        }),
    ];

    let lastError = null;
    for (const attempt of hardDeleteAttempts) {
      try {
        await attempt();
        return "destroy";
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(tr("Delete request failed."));
  }, []);

  const removeDeletedTaskFromState = useCallback((recordId, recordType) => {
    const safeId = extractId(recordId);
    if (!safeId) return;

    setTasks((prev) =>
      recordType === "task"
        ? prev.filter((task) => getTaskRecordId(task) !== safeId)
        : prev.map((task) => ({
            ...task,
            _subs: (task._subs || []).filter(
              (subTask) => getSubTaskRecordId(subTask) !== safeId,
            ),
          })),
    );
  }, []);

  // ── handleDeleteTask ──────────────────────────
  const handleDeleteTask = useCallback(
    (id, type, taskName) => {
      const safeId = extractId(id);
      const targetItem =
        type === "subTask"
          ? tasks
              .flatMap((t) => t._subs || [])
              .find((s) => getSubTaskRecordId(s) === safeId)
          : tasks.find((t) => getTaskRecordId(t) === safeId);
      console.info("[TaskManagement] delete click", {
        rawId: id,
        safeId,
        type,
        taskName,
        found: !!targetItem,
        recordId:
          type === "subTask"
            ? getSubTaskRecordId(targetItem)
            : getTaskRecordId(targetItem),
      });
      if (!safeId) {
        message.error(tr("Task ID not found for deletion."));
        return;
      }
      if (isTaskServiceDeleted(targetItem)) {
        message.warning(
          tr("This service has been deleted; the task cannot be deleted."),
        );
        return;
      }
      Modal.confirm({
        title: tr("Confirm deletion of {0}", { 0: type === "task" ? "task" : "subtask" }),
        content: React.createElement(
          "div",
          { style: { fontFamily: FONT } },
          tr("Are you sure you want to delete "),
          React.createElement("b", null, taskName),
          tr("? This action cannot be undone."),
        ),
        okText: tr("Delete permanently"),
        okType: "danger",
        cancelText: tr("Cancel"),
        onOk: async () => {
          try {
            const childSubTaskIds =
              type === "task"
                ? (targetItem?._subs || [])
                    .map((subTask) => getSubTaskRecordId(subTask))
                    .filter(Boolean)
                : [];

            for (const subTaskId of childSubTaskIds) {
              try {
                await destroyTaskRecord(subTaskId, "subTask");
              } catch (childError) {
                console.warn(
                  "[TaskManagement] delete child subtask failed",
                  childError,
                );
              }
            }
            await destroyTaskRecord(safeId, type);

            message.success(tr("✅ Deleted successfully"));
            removeDeletedTaskFromState(safeId, type);
            reload();
          } catch (e) {
            console.error("[TaskManagement] delete task failed", e);
            message.error(tr("Delete failed, please try again"));
          }
        },
      });
    },
    [destroyTaskRecord, reload, removeDeletedTaskFromState, tasks],
  );

  // ── handleReorderTask ──────────────────────────────
  // Tasks and meetings share one taskIndex sequence per (case, service)
  // group, so either kind can be dragged before/after the other. draggedType
  // / targetType are "task" | "meeting"; ids are resolved against the
  // matching collection.
  const handleReorderTask = useCallback(
    async (draggedType, draggedItemId, targetType, targetItemId, targetServiceKey, dropPosition) => {
      const draggedId = extractId(draggedItemId);
      const targetId = extractId(targetItemId);
      if (!draggedId) return;
      if (draggedType === targetType && draggedId === targetId) return;

      const sourceList = draggedType === "meeting" ? meetings : tasks;
      const draggedItem = sourceList.find((item) => extractId(item.id) === draggedId);
      if (!draggedItem) return;

      const groupKeyOf = (item) =>
        item.serviceId ? String(extractId(item.serviceId)) : "__none__";
      const keyOf = (item) => `${item._type}:${extractId(item.id)}`;
      // tasks and meetings are each fetched pre-sorted by taskIndex, but
      // concatenating the two arrays does NOT interleave them in taskIndex
      // order (e.g. task indexes [1,3,5] + meeting indexes [2,4,6] would
      // concatenate as [1,3,5,2,4,6]) — must re-sort the combined group by
      // taskIndex before finding the drop position / reindexing, or the
      // "sequential 1-based" reindex below silently scrambles indexes for
      // items that weren't even part of this drag.
      const taskIndexOf = (item) =>
        Number.isFinite(Number(item.taskIndex)) ? Number(item.taskIndex) : Infinity;
      const byTaskIndex = (a, b) => {
        const diff = taskIndexOf(a) - taskIndexOf(b);
        return diff !== 0 ? diff : String(a.id).localeCompare(String(b.id));
      };
      const sourceServiceKey = groupKeyOf(draggedItem);
      const isCrossService = sourceServiceKey !== targetServiceKey;
      const draggedKey = keyOf(draggedItem);

      // Build the target group's current combined order (tasks + meetings,
      // excluding the dragged item if it was already in this group),
      // backfilling any missing taskIndex by current display order (already
      // taskIndex-sorted from the fetch layer) before inserting the dragged
      // item at the drop position.
      const targetGroupItems = [...tasks, ...meetings]
        .filter((item) => groupKeyOf(item) === targetServiceKey && keyOf(item) !== draggedKey)
        .sort(byTaskIndex);

      const targetIndex = targetGroupItems.findIndex(
        (item) => item._type === targetType && extractId(item.id) === targetId,
      );
      const insertAt =
        targetIndex === -1
          ? targetGroupItems.length
          : dropPosition === "before"
            ? targetIndex
            : targetIndex + 1;
      targetGroupItems.splice(insertAt, 0, draggedItem);

      // Reindex the target group sequentially (1-based).
      const targetUpdates = targetGroupItems
        .map((item, i) => ({ item, newIndex: i + 1 }))
        .filter(({ item, newIndex }) => Number(item.taskIndex) !== newIndex);

      // If moving across services, also reindex the source group (with the
      // dragged item removed) so it stays sequential.
      let sourceUpdates = [];
      if (isCrossService) {
        const sourceGroupItems = [...tasks, ...meetings]
          .filter((item) => groupKeyOf(item) === sourceServiceKey && keyOf(item) !== draggedKey)
          .sort(byTaskIndex);
        sourceUpdates = sourceGroupItems
          .map((item, i) => ({ item, newIndex: i + 1 }))
          .filter(({ item, newIndex }) => Number(item.taskIndex) !== newIndex);
      }

      const newServiceIdForDragged = isCrossService
        ? targetServiceKey === "__none__"
          ? null
          : Number(targetServiceKey)
        : draggedItem.serviceId;

      // Optimistic UI update, split per collection.
      const updatesByKey = new Map();
      targetUpdates.forEach(({ item, newIndex }) => updatesByKey.set(keyOf(item), newIndex));
      sourceUpdates.forEach(({ item, newIndex }) => updatesByKey.set(keyOf(item), newIndex));

      setTasks((prev) =>
        prev.map((t) => {
          const k = `task:${extractId(t.id)}`;
          if (draggedType === "task" && k === draggedKey) {
            return {
              ...t,
              serviceId: newServiceIdForDragged,
              taskIndex: updatesByKey.has(k) ? updatesByKey.get(k) : t.taskIndex,
            };
          }
          if (updatesByKey.has(k)) return { ...t, taskIndex: updatesByKey.get(k) };
          return t;
        }),
      );
      setMeetings((prev) =>
        prev.map((m) => {
          const k = `meeting:${extractId(m.id)}`;
          if (draggedType === "meeting" && k === draggedKey) {
            return {
              ...m,
              serviceId: newServiceIdForDragged,
              _svcKey: newServiceIdForDragged ? String(newServiceIdForDragged) : null,
              taskIndex: updatesByKey.has(k) ? updatesByKey.get(k) : m.taskIndex,
            };
          }
          if (updatesByKey.has(k)) return { ...m, taskIndex: updatesByKey.get(k) };
          return m;
        }),
      );

      // Persist. Fire the dragged item's own update (taskIndex + possibly
      // serviceId) plus every other task/meeting whose taskIndex changed.
      const resourceOf = (type) => (type === "meeting" ? "meetings" : "tasks");
      const draggedNewIndex = updatesByKey.has(draggedKey)
        ? updatesByKey.get(draggedKey)
        : draggedItem.taskIndex;
      const draggedPayload = { taskIndex: draggedNewIndex };
      if (isCrossService) draggedPayload.serviceId = newServiceIdForDragged;

      const requests = [
        apiReq(`${resourceOf(draggedType)}:update?filterByTk=${draggedId}`, "POST", draggedPayload),
        ...targetUpdates
          .filter(({ item }) => keyOf(item) !== draggedKey)
          .map(({ item, newIndex }) =>
            apiReq(`${resourceOf(item._type)}:update?filterByTk=${extractId(item.id)}`, "POST", {
              taskIndex: newIndex,
            }),
          ),
        ...sourceUpdates
          .filter(({ item }) => keyOf(item) !== draggedKey)
          .map(({ item, newIndex }) =>
            apiReq(`${resourceOf(item._type)}:update?filterByTk=${extractId(item.id)}`, "POST", {
              taskIndex: newIndex,
            }),
          ),
      ];

      try {
        await Promise.all(requests);
      } catch (e) {
        console.error("[TaskManagement] reorder persist failed", e);
        message.error(tr("Failed to save the new order."));
      } finally {
        // Resync with the server regardless of outcome: on success this
        // picks up the sorted order via the fetch/sort change; on failure
        // it discards the optimistic update above and restores the
        // last-persisted order.
        reload();
      }
    },
    [tasks, meetings, reload],
  );

  // ── handleOpenAddSubModal ─────────────────────────────────
  const handleOpenAddSubModal = useCallback(
    (taskId) => {
      const targetTask = tasks.find(
        (t) => extractId(t.id) === extractId(taskId),
      );
      if (isTaskServiceDeleted(targetTask)) {
        message.warning(
          tr("This service has been deleted; a subtask cannot be created."),
        );
        return;
      }
      setAddSubForTaskId(taskId);
      setShowAddSub(true);
    },
    [tasks],
  );

  // ── handleOpen (mở Task Detail popup từ row) ─────────────
  // Mở view Task Detail (TaskDetailView.js) qua ctx.openView theo uid cố định.
  // Pathname phải build lại từ gốc (/admin/{appId}/...), không kế thừa path
  // của Case cha — nếu không NocoBase sẽ lấy nhầm filterByTk từ ngữ cảnh Case
  // (bug "Task not found" đã fix bằng cách này, tham khảo AllTaskBlock.js).
  const buildTaskDetailRoute = (popupUid, taskId) => {
    const safeTaskId = extractId(taskId);
    if (!safeTaskId) return null;
    const pathname = window.location?.pathname || "";
    const segments = pathname.split("/").filter(Boolean);
    const adminIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === "admin",
    );
    const appId = adminIndex >= 0 ? segments[adminIndex + 1] : "";
    const baseSegments = appId ? ["admin", appId] : ["admin"];
    const nextPathname = `/${baseSegments.join("/")}/view/${popupUid}/filterbytk/${encodeURIComponent(String(safeTaskId))}`;
    return {
      recordId: safeTaskId,
      pathname: nextPathname,
      url: `${window.location.origin}${nextPathname}`,
    };
  };

  const handleOpen = useCallback((item, type) => {
    if (isTaskServiceDeleted(item)) {
      message.warning(
        tr("This service has been deleted and locked; task details cannot be opened."),
      );
      return;
    }
    const popupUid = "32b72ed2a6a";
    const taskId =
      type === "subTask" ? extractId(item.taskId) : extractId(item.id);
    const subTaskId = type === "subTask" ? extractId(item.id) : null;
    if (!taskId) return;

    const detailRoute = buildTaskDetailRoute(popupUid, taskId);
    if (!detailRoute) return;

    const collectionName = subTaskId ? "subTasks" : "tasks";
    const recordType = subTaskId ? "subTask" : "task";
    const sharedIdKeys = {
      filterByTk: detailRoute.recordId,
      filterbytk: detailRoute.recordId,
      id: detailRoute.recordId,
      recordId: detailRoute.recordId,
      taskId: detailRoute.recordId,
      sourceRecordId: detailRoute.recordId,
      sourceTaskId: detailRoute.recordId,
      parentTaskId: detailRoute.recordId,
      subTaskId,
      sourceSubTaskId: subTaskId,
      selectedSubTaskId: subTaskId,
      recordType,
      collectionName,
      pathname: detailRoute.pathname,
      linkedUrl: detailRoute.url,
    };
    const defineProperties = {};
    Object.keys(sharedIdKeys).forEach((key) => {
      defineProperties[key] = {
        value: sharedIdKeys[key],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    });

    ctx.openView(popupUid, {
      mode: "dialog",
      size: "large",
      title: ctx.t ? ctx.t(tr("Task detail")) : tr("Task detail"),
      navigation: false,
      ...sharedIdKeys,
      inputArgs: sharedIdKeys,
      params: sharedIdKeys,
      defineProperties,
    });
  }, []);

  const handleOpenMeeting = useCallback((meeting) => {
    const meetingId = extractId(meeting?.id);
    if (!meetingId) return;
    const detailRoute = buildTaskDetailRoute(
      MEETING_DETAIL_POPUP_UID,
      meetingId,
    );
    if (!detailRoute) return;
    const sharedIdKeys = {
      filterByTk: detailRoute.recordId,
      filterbytk: detailRoute.recordId,
      id: detailRoute.recordId,
      recordId: detailRoute.recordId,
      meetingId: detailRoute.recordId,
      sourceRecordId: detailRoute.recordId,
      recordType: "meeting",
      collectionName: "meetings",
      pathname: detailRoute.pathname,
      linkedUrl: detailRoute.url,
    };
    const defineProperties = {};
    Object.keys(sharedIdKeys).forEach((key) => {
      defineProperties[key] = {
        value: sharedIdKeys[key],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    });
    ctx.openView(MEETING_DETAIL_POPUP_UID, {
      mode: "dialog",
      size: "large",
      title: meeting?.title || tr("Meeting detail"),
      navigation: false,
      ...sharedIdKeys,
      inputArgs: sharedIdKeys,
      params: sharedIdKeys,
      defineProperties,
    });
  }, []);

  // ── handleCreateMeeting (mở popup tạo meeting mới, gắn sẵn Case hiện tại) ──
  // UID cố định theo view "Create meeting" (MeetingCreateForm.js) — cùng UID
  // MEETING_CREATE_FORM_UID mà MeetingPage.js/MyMeetingPage.js đang dùng.
  // Base path lấy động từ URL hiện tại (giống buildTaskDetailRoute ở trên),
  // không hardcode appId, để tránh lệch app khi block này được nhúng ở nơi khác.
  const handleCreateMeeting = useCallback(() => {
    const meetingCreateFormUid = "1778f9b1d48";
    const pathname = window.location?.pathname || "";
    const segments = pathname.split("/").filter(Boolean);
    const adminIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === "admin",
    );
    const appId = adminIndex >= 0 ? segments[adminIndex + 1] : "";
    const baseSegments = appId ? ["admin", appId] : ["admin"];
    const nextPathname = `/${baseSegments.join("/")}/view/${meetingCreateFormUid}`;
    const caseId = extractId(PROJECT_ID);

    const params = {
      initialCaseId: caseId,
      caseId,
      collectionName: "meetings",
      recordType: "meeting",
      pathname: nextPathname,
      linkedUrl: `${window.location.origin}${nextPathname}`,
    };
    const defineProperties = {};
    Object.keys(params).forEach((key) => {
      defineProperties[key] = {
        value: params[key],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    });

    ctx.openView(meetingCreateFormUid, {
      mode: "dialog",
      size: "large",
      title: ctx.t ? ctx.t(tr("Create meeting")) : tr("Create meeting"),
      navigation: false,
      ...params,
      inputArgs: params,
      params,
      defineProperties,
    });
  }, []);

  // Opened from a specific ServiceSection's "⋮" menu — pre-fills (but
  // doesn't lock) AddTaskModal's Service field with that group's key, per
  // getProjectServiceTaskKey's own value shape (same key ServiceSection's
  // own serviceId/groupServiceKey prop already carries).
  const handleCreateTaskForService = useCallback((serviceIdKey) => {
    setAddTaskServiceId(serviceIdKey);
    setInsertPlan(null);
    setShowAddTask(true);
  }, []);

  // Opened from a task's own "⋮" menu ("Insert task above/below"). Computes
  // the exact position up front from CURRENT tasks/meetings state (same
  // group-key/sort/sequential-reindex convention as handleReorderTask's
  // drag-and-drop, just building a plan for a not-yet-created item instead
  // of moving an existing one — so there's no dependency on the new task
  // already being in state, which a "create, then call handleReorderTask"
  // approach would have needed).
  const handleInsertTask = useCallback(
    (position, referenceTask) => {
      const groupKeyOf = (item) =>
        item.serviceId ? String(extractId(item.serviceId)) : "__none__";
      const taskIndexOf = (item) =>
        Number.isFinite(Number(item.taskIndex)) ? Number(item.taskIndex) : Infinity;
      const byTaskIndex = (a, b) => {
        const diff = taskIndexOf(a) - taskIndexOf(b);
        return diff !== 0 ? diff : String(a.id).localeCompare(String(b.id));
      };
      const keyOf = (item) => `${item._type}:${extractId(item.id)}`;

      const targetServiceKey = groupKeyOf(referenceTask);
      const groupItems = [...tasks, ...meetings]
        .filter((item) => groupKeyOf(item) === targetServiceKey)
        .sort(byTaskIndex);
      const refKey = `task:${extractId(referenceTask.id)}`;
      const refIndex = groupItems.findIndex((item) => keyOf(item) === refKey);
      const insertAt =
        refIndex === -1
          ? groupItems.length
          : position === "above"
            ? refIndex
            : refIndex + 1;

      const withPlaceholder = groupItems.slice();
      withPlaceholder.splice(insertAt, 0, { __placeholder: true });
      const reindexOps = [];
      let newTaskIndex = insertAt + 1;
      withPlaceholder.forEach((item, i) => {
        const idx = i + 1;
        if (item.__placeholder) {
          newTaskIndex = idx;
          return;
        }
        if (Number(item.taskIndex) !== idx) {
          reindexOps.push({ type: item._type, id: extractId(item.id), newIndex: idx });
        }
      });

      setInsertPlan({ newTaskIndex, reindexOps });
      setAddTaskServiceId(targetServiceKey === "__none__" ? null : targetServiceKey);
      setShowAddTask(true);
    },
    [tasks, meetings],
  );

  // Opened from a single task's own "⋮" menu ("Save as template") — an
  // optional, per-task action a user can trigger any time, not just right
  // after creating the task.
  const handleSaveTaskAsTemplate = useCallback(
    (task) => {
      const groupKey = task.serviceId ? String(extractId(task.serviceId)) : "__none__";
      const ps = services.find((s) => getProjectServiceTaskKey(s) === groupKey);
      setSaveTaskToTemplateContext({
        taskValues: {
          title: task.title,
          description: task.description,
          priority: task.priority,
        },
        defaultServiceId: ps?.serviceId ? Number(ps.serviceId) : null,
      });
    },
    [services],
  );

  // ── Stats ─────────────────────────────────────────────────
  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = tasks.filter((t) => t._od).length;

  // ── Guard ─────────────────────────────────────────────────
  if (!PROJECT_ID)
    return React.createElement(
      "div",
      { style: { padding: 20, color: "#ff4d4f", fontFamily: FONT } },
      tr("⚠️ Project ID not found"),
    );
  // ── Render ────────────────────────────────────────────────
  return React.createElement(
    "div",
    {
      style: {
        fontFamily: FONT,
        background: "#f5f5f5",
        minHeight: "600px",
        display: "flex",
        flexDirection: "column",
      },
    },

    /* ── Topbar ── */
    React.createElement(
      "div",
      {
        style: {
          background: "#fff",
          borderBottom: "1px solid #e8e8e8",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          flexShrink: 0,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          },
        },
        React.createElement(
          Text,
          {
            strong: true,
            style: { fontSize: 12, fontFamily: FONT, color: "#1a1a1a" },
          },
          tr("📋 Tasks"),
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: "#8c8c8c",
              background: "#f5f5f5",
              borderRadius: 8,
              padding: "2px 8px",
            },
          },
          tr("{0}/{1} done", { 0: done, 1: total }),
        ),
        blocked > 0 &&
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#722ed1",
                background: "#f9f0ff",
                borderRadius: 8,
                padding: "2px 8px",
                border: "1px solid #d3adf7",
              },
            },
            tr("⏸ {0} waiting", { 0: blocked }),
          ),
        overdue > 0 &&
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#cf1322",
                background: "#fff1f0",
                borderRadius: 8,
                padding: "2px 8px",
                border: "1px solid #ffa39e",
              },
            },
            tr("⚠ {0} overdue", { 0: overdue }),
          ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 6 } },
          React.createElement(
            "div",
            {
              style: {
                width: 80,
                height: 5,
                borderRadius: 3,
                background: "#e0e0e0",
                overflow: "hidden",
              },
            },
            React.createElement("div", {
              style: {
                width: `${pct}%`,
                height: "100%",
                background: pct === 100 ? "#389e0d" : "#1890ff",
                borderRadius: 3,
                transition: "width 0.4s",
              },
            }),
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: pct === 100 ? "#389e0d" : "#8c8c8c",
              },
            },
            `${pct}%`,
          ),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, alignItems: "center" } },
        React.createElement(
          "div",
          {
            onClick: () => {
              setAddTaskServiceId(null);
              setInsertPlan(null);
              setShowAddTask(true);
            },
            style: {
              padding: "5px 16px",
              borderRadius: 4,
              background: "#1890ff",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: FONT,
              fontWeight: 600,
            },
          },
          tr("＋ New Task"),
        ),
        React.createElement(
          "div",
          {
            onClick: handleCreateMeeting,
            style: {
              padding: "5px 16px",
              borderRadius: 4,
              background: "#722ed1",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: FONT,
              fontWeight: 600,
            },
          },
          tr("＋ New Meeting"),
        ),
        React.createElement(ReloadButton, {
          onReload: reload,
          loading: loading,
          text: tr("Refresh"),
        }),
      ),
    ),

    /* ── Task list ── */
    React.createElement(
      "div",
      {
        style: {
          flex: 1,
          padding: "12px 16px",
          overflowY: "auto",
          overflowX: "auto",
        },
      },
      loading
        ? React.createElement(
            "div",
            { style: { textAlign: "center", padding: 60 } },
            React.createElement(Spin, { size: "large" }),
          )
        : tasks.length === 0 && services.length === 0
          ? React.createElement(
              "div",
              {
                style: {
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#bfbfbf",
                  fontSize: 12,
                  fontFamily: FONT,
                },
              },
              tr("📭 No tasks yet"),
            )
          : React.createElement(ListView, {
              tasks,
              meetings,
              services,
              serviceCatalog,
              lawyers: assignableLawyers,
              expanded,
              toggleExpand,
              handleStatus,
              handleOpen,
              handleOpenMeeting,
              handleAssign,
              contractType,
              hasContract,
              linkablePaymentRequests,
              contractServiceIdByProjectServiceId,
              paymentRequestServiceIdsByPrId,
              serviceNameByContractServiceId,
              handleUpdateTaskField,
              isManager,
              handleOpenAddSubModal,
              isAssigneeOnly,
              myLawyerId,
              showAddTask,
              setShowAddTask,
              onDeleteTask: handleDeleteTask,
              onReorderTask: handleReorderTask,
              onInsertTask: handleInsertTask,
              onSaveTaskAsTemplate: handleSaveTaskAsTemplate,
              onOpenTemplateAction: setTemplateAction,
              onCreateTask: handleCreateTaskForService,
              onCreateMeeting: handleCreateMeeting,
              servicePaymentInfoByPsId,
            }),
    ),

    /* ── Add Task Modal ── */
    React.createElement(AddTaskModal, {
      open: showAddTask,
      initialServiceId: addTaskServiceId,
      insertPlan,
      projectId: PROJECT_ID ? parseInt(PROJECT_ID) : null,
      lawyers: assignableLawyers,
      services,
      allTasksInProject: tasks,
      currentUser,
      hasContract,
      onSave: reload,
      onClose: () => {
        setShowAddTask(false);
        setAddTaskServiceId(null);
        setInsertPlan(null);
      },
    }),

    /* ── Add SubTask Modal (placeholder) ── */
    showAddSub &&
      addSubForTaskId != null &&
      React.createElement(AddSubtaskModal, {
        key: `submodal-${addSubForTaskId}`,
        open: showAddSub,
        parentTaskId: addSubForTaskId,
        lawyers: assignableLawyers,
        currentUser: currentUser,
        hasContract,
        onSave: () => {
          reload();
        },
        onClose: () => {
          setShowAddSub(false);
          setAddSubForTaskId(null);
        },
      }),

    /* ── Save as Template Modal ── */
    templateAction?.mode === "save" &&
      React.createElement(SaveAsTemplateModal, {
        open: true,
        serviceName: templateAction.serviceName,
        tasks: templateAction.tasks,
        ps: templateAction.ps,
        serviceCatalog,
        onClose: () => setTemplateAction(null),
        onSaved: () => {
          setTemplateAction(null);
          reload();
        },
      }),

    /* ── Override Template Modal ── */
    templateAction?.mode === "override" &&
      React.createElement(OverrideTemplateModal, {
        open: true,
        tasks: templateAction.tasks,
        serviceName: templateAction.serviceName,
        serviceCatalog,
        onClose: () => setTemplateAction(null),
        onOverridden: () => {
          setTemplateAction(null);
          reload();
        },
      }),

    /* ── Save Task As Template Modal (per-task "⋮" menu, optional) ── */
    saveTaskToTemplateContext &&
      React.createElement(SaveTaskToTemplateModal, {
        open: true,
        taskValues: saveTaskToTemplateContext.taskValues,
        defaultServiceId: saveTaskToTemplateContext.defaultServiceId,
        serviceCatalog,
        onClose: () => setSaveTaskToTemplateContext(null),
        onSaved: () => setSaveTaskToTemplateContext(null),
      }),
  );
};

ctx.render(React.createElement(ProjectTasksTab, null));
